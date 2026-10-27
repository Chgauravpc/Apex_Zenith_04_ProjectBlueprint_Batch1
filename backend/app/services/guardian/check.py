"""Note Guardian: check every saved note against the machine's history, instantly.

Flow (ENGINEERING.md §9.2): extract → retrieve → rules → grounded LLM (only when there is
evidence) → keep only citable evidence → save Warning rows + timeline event → notify the
supervisor and the old employee who knows the machine.

Guardian advises and teaches; it never stops a machine itself. No evidence, no warning.
"""

import logging
from datetime import timedelta
from typing import Dict, List, Optional, Set, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import ProviderUnavailable
from app.models.erp import ROLE_SUPERVISOR, Employee
from app.models.guardian import Warning
from app.models.knowledge import Document
from app.models.ops import Event, Notification
from app.prompts import wrap_records
from app.prompts.guardian import GUARDIAN_SYSTEM, GUARDIAN_USER
from app.schemas.guardian import (
    SEVERITY_RANK,
    Evidence,
    Finding,
    GuardianLLMResult,
    GuardianResult,
    NoteIn,
    WarningOut,
)
from app.services import llm
from app.services.capture.voice import check_refs
from app.services.guardian import rules
from app.services.guardian.history import Context, load_context
from app.utils import lexicon
from app.utils.audit import audit

logger = logging.getLogger(__name__)

RETRIEVE_LIMIT = 20  # similar records sent to the LLM (bounded prompt, bounded time)
ANOMALY_LOOKBACK = timedelta(hours=24)
NOTIFY_FROM = "caution"  # caution and stop are escalated to people


def _rule_findings(ctx: Context, symptoms: Set[str], params: Dict[str, float]) -> List[Finding]:
    findings = rules.check_params(params, ctx.limits)
    findings += ctx.enrich(rules.check_precursors(symptoms, ctx.precursors))
    for record in ctx.due_maintenance:
        # Overdue maintenance matters when something is wrong, or when the note is about
        # that same part; otherwise it would be noise on every routine note.
        if not symptoms and record.component_id != ctx.component_id:
            continue
        found = rules.check_maintenance(record.done_on, record.interval_days, ctx.today)
        if found is not None:
            found.evidence = [ctx.evidence_for("maintenance", record.id)]
            findings.append(found)
    if symptoms and ctx.anomalies:
        latest = ctx.anomalies[0]
        findings.append(
            Finding(
                rule="anomaly",
                severity="caution",
                message=f"The machine's {latest.sensor} sensor also showed an unusual reading "
                f"({latest.value:g}, z={latest.zscore:+.1f}) in the last 24 hours.",
                evidence=[ctx.evidence_for("anomaly", a.id) for a in ctx.anomalies[:3]],
            )
        )
    return [f for f in findings if f.evidence]  # never warn without a cited record


def _llm_findings(ctx: Context, text: str, findings: List[Finding]) -> Tuple[List[Finding], bool]:
    """Ask the LLM for risks the rules missed. Returns (findings, reached_llm)."""
    if not ctx.records:
        return [], True  # nothing to ground on: the LLM would have no evidence to cite
    user = GUARDIAN_USER.format(
        machine=ctx.machine.name if ctx.machine else "unknown",
        note=wrap_records([("note", text)]),
        rule_findings="\n".join(f"- {f.message}" for f in findings) or "- none",
        records=wrap_records((rid, txt) for rid, (txt, _) in ctx.records.items()),
    )
    try:
        out = llm.chat_json("guardian", GUARDIAN_SYSTEM, user, GuardianLLMResult)
    except ProviderUnavailable:
        return [], False
    extra = []
    for w in out.warnings:
        cited = [ctx.records[rid][1] for rid in w.evidence_ids if rid in ctx.records]
        if cited:  # drop warnings whose citations do not exist (no invented evidence)
            extra.append(
                Finding(rule="llm", severity=w.severity, message=w.message, evidence=cited)
            )
    return extra, True


def _notify(db: Session, ctx: Context, warning: Warning) -> None:
    """Escalate to supervisors and the old employees who know this machine."""
    people: Set[int] = set(
        db.execute(select(Employee.id).where(Employee.role == ROLE_SUPERVISOR)).scalars()
    )
    if ctx.expert is not None:
        people.add(ctx.expert.id)
    for pid in people - {warning.employee_id}:
        db.add(
            Notification(
                employee_id=pid,
                kind="guardian_warning",
                ref_type="warning",
                ref_id=warning.id,
                message=f"[{warning.severity}] {warning.message}",
            )
        )


def run_checks(
    db: Session,
    doc: Document,
    extra_params: Optional[Dict[str, float]] = None,
    extra_symptoms: Optional[List[str]] = None,
) -> GuardianResult:
    """Check an already-saved note. Used by POST /guardian/notes and by the capture hook."""
    text = doc.text or ""
    symptoms = lexicon.find_symptoms(text) | {
        s for s in (extra_symptoms or []) if s in lexicon.SYMPTOMS
    }
    params = {**lexicon.find_params(text), **(extra_params or {})}
    ctx = load_context(db, doc, symptoms, RETRIEVE_LIMIT, ANOMALY_LOOKBACK)
    if ctx.machine is None:
        return GuardianResult(
            note_id=doc.id,
            message="Saved. Choose a machine so Guardian can "
            "check this note against its history.",
        )

    findings = _rule_findings(ctx, symptoms, params)
    extra, reached = _llm_findings(ctx, text, findings)
    findings += extra
    findings.sort(key=lambda f: SEVERITY_RANK[f.severity], reverse=True)
    severity = rules.max_severity(findings)

    saved: List[WarningOut] = []
    for f in findings:
        row = Warning(
            note_id=doc.id,
            employee_id=doc.uploader_id,
            machine_id=ctx.machine.id,
            component_id=ctx.component_id,
            severity=f.severity,
            message=f.message,
            evidence=[e.model_dump(mode="json", include={"type", "id"}) for e in f.evidence],
            card_id=ctx.expert_card.id if ctx.expert_card else None,
            mode="live" if reached else "offline",
        )
        db.add(row)
        db.flush()
        saved.append(WarningOut(id=row.id, severity=f.severity, message=f.message, rule=f.rule))
        if SEVERITY_RANK[f.severity] >= SEVERITY_RANK[NOTIFY_FROM]:
            _notify(db, ctx, row)
    if findings:
        db.add(
            Event(
                machine_id=ctx.machine.id,
                kind="warning",
                ref_type="document",
                ref_id=doc.id,
                summary=f"[{severity}] {findings[0].message}",
            )
        )
        audit(
            db,
            "warning.raised",
            actor_id=None,
            target_type="document",
            target_id=doc.id,
            severity=severity,
            count=len(findings),
            mode="live" if reached else "offline",
        )
    db.commit()

    evidence: Dict[Tuple[str, int], Evidence] = {}
    for f in findings:
        for e in f.evidence:
            evidence.setdefault((e.type, e.id), e)
    card = ctx.expert_card
    return GuardianResult(
        note_id=doc.id,
        severity=severity,
        warnings=saved,
        evidence=list(evidence.values()),
        expert_fix=card.action if card and findings else None,
        expert_card_id=card.id if card and findings else None,
        author_name=ctx.expert.name if ctx.expert and findings else None,
        component_id=ctx.component_id,
        machine_id=ctx.machine.id,
        mode="live" if reached else "offline",
        message=(
            f"{len(findings)} warning(s) found." if findings else "No known issues for this note."
        ),
    )


def save_and_check(db: Session, note: NoteIn) -> GuardianResult:
    """Persist a note, run deterministic rules, then grounded LLM reasoning.

    Complexity: rules O(p + s); retrieval bounded by RETRIEVE_LIMIT; ~8 queries total.
    """
    check_refs(db, note.author_id, note.machine_id)
    doc = Document(
        type="text", text=note.text.strip(), uploader_id=note.author_id, machine_id=note.machine_id
    )
    db.add(doc)
    db.commit()  # the note is kept whatever happens in the checks
    return run_checks(db, doc, note.params, note.symptoms)


def note_saved_hook(db: Session, doc: Document) -> Optional[dict]:
    """Capture hook: run Guardian on every typed/voice note (registered in main.create_app)."""
    if not doc.text:
        return None
    return run_checks(db, doc).model_dump(mode="json")
