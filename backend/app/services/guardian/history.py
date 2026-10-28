"""Load everything Note Guardian needs about one machine, in a fixed number of queries.

Split from check.py to keep files small (ENGINEERING.md §1). All lists are bounded, so
memory and time do not grow with the size of the factory's history.
"""

import logging
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Set, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import fts_search, utcnow
from app.models.erp import ROLE_OLD, Employee, Machine, Maintenance, Material, QCReject
from app.models.guardian import FailurePrecursor, ParamLimit
from app.models.knowledge import Document, KnowledgeCard, Meeting
from app.models.map3d import Component
from app.models.ops import Anomaly
from app.schemas.guardian import Evidence, Finding, ParamLimitDTO, PrecursorStat
from app.utils import lexicon

logger = logging.getLogger(__name__)

KIND_LABEL = {
    "card": "Know-how card",
    "note": "Operator note",
    "qc_reject": "QC reject",
    "maintenance": "Maintenance",
    "meeting": "Meeting",
    "anomaly": "Sensor anomaly",
    "param_limit": "Approved limit",
}


@dataclass
class Context:
    """History of one machine relevant to one note."""

    machine: Optional[Machine]
    today: date
    component_id: Optional[int] = None
    limits: List[ParamLimitDTO] = field(default_factory=list)
    precursors: Dict[str, PrecursorStat] = field(default_factory=dict)
    maintenance: Dict[int, Maintenance] = field(default_factory=dict)
    due_maintenance: List[Maintenance] = field(default_factory=list)
    anomalies: List[Anomaly] = field(default_factory=list)
    # "card:12" -> (text for the LLM, Evidence for the UI)
    records: Dict[str, Tuple[str, Evidence]] = field(default_factory=dict)
    expert_card: Optional[KnowledgeCard] = None
    expert: Optional[Employee] = None

    def evidence_for(self, kind: str, rid: int) -> Evidence:
        """Evidence for a maintenance or anomaly record already loaded in this context."""
        if kind == "maintenance" and rid in self.maintenance:
            m = self.maintenance[rid]
            return Evidence(
                type=kind, id=rid, kind=m.kind.title(), title=m.description, date=m.done_on
            )
        anomaly = next((a for a in self.anomalies if a.id == rid), None)
        if kind == "anomaly" and anomaly is not None:
            return Evidence(
                type=kind,
                id=rid,
                kind=KIND_LABEL[kind],
                title=f"{anomaly.sensor} {anomaly.value:g}",
                date=anomaly.ts.date(),
                detail=f"z = {anomaly.zscore:+.1f}",
            )
        return Evidence(type=kind, id=rid, kind=KIND_LABEL.get(kind, kind), title=kind)

    def enrich(self, findings: List[Finding]) -> List[Finding]:
        """Fill in dates and descriptions for maintenance evidence cited by the rules."""
        for f in findings:
            f.evidence = [
                self.evidence_for(e.type, e.id) if e.type == "maintenance" else e
                for e in f.evidence
            ]
        return findings


def _machine(db: Session, doc: Document) -> Optional[Machine]:
    if doc.machine_id is not None:
        return db.get(Machine, doc.machine_id)
    names = {m.name: m for m in db.execute(select(Machine)).scalars()}
    found = lexicon.match_machine(doc.text or "", names)
    return names[found] if found else None


def _limits(db: Session, machine_id: int, text: str) -> List[ParamLimitDTO]:
    """Limits for the machine; those for a material named in the note come first."""
    norm = lexicon.normalize(text)
    materials = {
        m.id for m in db.execute(select(Material)).scalars() if lexicon.normalize(m.name) in norm
    }
    rows = db.execute(select(ParamLimit).where(ParamLimit.machine_id == machine_id)).scalars()
    usable = [r for r in rows if r.material_id is None or r.material_id in materials]
    usable.sort(key=lambda r: r.material_id is None)  # material-specific first
    return [
        ParamLimitDTO(
            id=r.id,
            param=r.param,
            min_value=r.min_value,
            max_value=r.max_value,
            unit=r.unit,
            note=r.note,
        )
        for r in usable
    ]


def _maintenance(db: Session, machine_id: int) -> Tuple[Dict[int, Maintenance], List[Maintenance]]:
    rows = list(
        db.execute(
            select(Maintenance)
            .where(Maintenance.machine_id == machine_id)
            .order_by(Maintenance.done_on.desc())
        ).scalars()
    )
    latest: Dict[str, Maintenance] = {}
    for r in rows:  # newest first, so the first per task is the latest one
        if r.kind == "preventive" and r.interval_days:
            latest.setdefault(r.description, r)
    return {r.id: r for r in rows}, list(latest.values())


def _records(
    db: Session, doc: Document, machine_id: int, symptoms: Set[str], limit: int
) -> Dict[str, Tuple[str, Evidence]]:
    """Similar history via FTS (note words + symptom synonyms), loaded in one query per type."""
    query = " ".join(
        [doc.text or ""] + [w for s in sorted(symptoms) for w in lexicon.SYMPTOMS[s][:3]]
    )
    hits = [
        (t, i)
        for t, i, _ in fts_search(db, query, machine_id=machine_id, limit=limit)
        if not (t == "note" and i == doc.id)
    ]
    ids: Dict[str, List[int]] = {}
    for t, i in hits:
        ids.setdefault(t, []).append(i)
    found: Dict[Tuple[str, int], Tuple[str, Evidence]] = {}

    def add(kind: str, rid: int, text: str, title: str, when: Optional[date]) -> None:
        found[(kind, rid)] = (
            text,
            Evidence(
                type=kind,
                id=rid,
                kind=KIND_LABEL[kind],
                title=title[:120],
                date=when,
                detail=text[:300],
            ),
        )

    def day(value: Optional[datetime]) -> Optional[date]:
        return value.date() if value else None

    for c in _load(db, KnowledgeCard, ids.get("card")):
        add(
            "card",
            c.id,
            " ".join(filter(None, [c.title, c.action, c.why])),
            c.title,
            day(c.created_at),
        )
    for d in _load(db, Document, ids.get("note")):
        add("note", d.id, d.text or "", d.text or "note", day(d.created_at))
    for q in _load(db, QCReject, ids.get("qc_reject")):
        add(
            "qc_reject",
            q.id,
            f"{q.quantity} x {q.defect}. {q.cause or ''}",
            q.defect,
            day(q.created_at),
        )
    for m in _load(db, Maintenance, ids.get("maintenance")):
        add("maintenance", m.id, f"{m.kind}: {m.description}", m.description, m.done_on)
    for g in _load(db, Meeting, ids.get("meeting")):
        add("meeting", g.id, f"{g.title}. {g.summary or ''}", g.title, g.held_on)
    # Keep FTS relevance order.
    return {f"{t}:{i}": found[(t, i)] for t, i in hits if (t, i) in found}


def _load(db: Session, model, ids: Optional[List[int]]) -> List:
    if not ids:
        return []
    return list(db.execute(select(model).where(model.id.in_(ids))).scalars())


def _expert(
    db: Session, machine_id: int, symptoms: Set[str], component_id: Optional[int]
) -> Tuple[Optional[KnowledgeCard], Optional[Employee]]:
    """Best verified card by an old employee for these symptoms on this machine."""
    if not symptoms:
        return None, None
    rows = db.execute(
        select(KnowledgeCard, Employee)
        .join(Employee, Employee.id == KnowledgeCard.author_id)
        .where(
            KnowledgeCard.machine_id == machine_id,
            KnowledgeCard.symptom.in_(symptoms),
            KnowledgeCard.verified_by_id.is_not(None),
            Employee.role == ROLE_OLD,
        )
    ).all()
    if not rows:
        return None, None
    rows.sort(key=lambda r: (r[0].component_id != component_id, -r[0].score, -r[0].id))
    return rows[0][0], rows[0][1]


def load_context(
    db: Session, doc: Document, symptoms: Set[str], limit: int, lookback: timedelta
) -> Context:
    """Everything Guardian needs for this note; ~9 small queries, all bounded."""
    machine = _machine(db, doc)
    ctx = Context(machine=machine, today=date.today())
    if machine is None:
        return ctx
    comps = {
        c.id: [c.mesh_name.replace("_", " "), c.display_name, *(c.aliases or [])]
        for c in db.execute(select(Component).filter_by(machine_id=machine.id)).scalars()
    }
    matched = lexicon.match_components(doc.text or "", comps)
    ctx.component_id = matched[0] if matched else None
    ctx.limits = _limits(db, machine.id, doc.text or "")
    ctx.precursors = {
        p.symptom: PrecursorStat(
            id=p.id,
            symptom=p.symptom,
            failure_kind=p.failure_kind,
            preceded_count=p.preceded_count,
            total_failures=p.total_failures,
            evidence_ids=p.evidence_ids,
        )
        for p in db.execute(select(FailurePrecursor).filter_by(machine_id=machine.id)).scalars()
    }
    ctx.maintenance, ctx.due_maintenance = _maintenance(db, machine.id)
    ctx.anomalies = list(
        db.execute(
            select(Anomaly)
            .where(Anomaly.machine_id == machine.id, Anomaly.ts >= utcnow() - lookback)
            .order_by(Anomaly.ts.desc())
            .limit(5)
        ).scalars()
    )
    ctx.records = _records(db, doc, machine.id, symptoms, limit)
    ctx.expert_card, ctx.expert = _expert(db, machine.id, symptoms, ctx.component_id)
    return ctx
