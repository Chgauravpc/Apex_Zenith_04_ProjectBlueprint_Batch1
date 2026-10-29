"""Printable reports (HTML → browser "Save as PDF"): machine playbook, handover, shift summary.

Every piece of know-how in a report carries a footnote to the card it came from, who
gave it and when, so a new employee can always trace advice back to a person.
"""

import logging
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.errors import NotFound
from app.models.erp import Employee, Machine, Maintenance, Material, QCReject
from app.models.guardian import FailurePrecursor, ParamLimit, Warning
from app.models.guide import Procedure, ProcedureStep
from app.models.knowledge import ActionItem, Document, KnowledgeCard
from app.models.map3d import Component
from app.models.ops import Event
from app.services.ask.qa import machine_experts
from app.services.guide.authoring import best_tips
from app.services.transfer import handover

logger = logging.getLogger(__name__)

TEMPLATES = Path(__file__).resolve().parents[2] / "templates"
HISTORY_LIMIT = 10
_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES)),
    autoescape=select_autoescape(["html"]),
    trim_blocks=True,
    lstrip_blocks=True,
)


@dataclass
class Footnote:
    n: int
    card_id: int
    author: str
    verified_by: Optional[str]
    when: date
    source: str


class Footnotes:
    """Numbers sources in the order they are cited; a card cited twice keeps its number."""

    def __init__(self, names: Dict[int, str], docs: Dict[int, Document]) -> None:
        self.names = names
        self.docs = docs
        self.items: List[Footnote] = []
        self._numbers: Dict[int, int] = {}

    def cite(self, card: KnowledgeCard) -> int:
        if card.id in self._numbers:
            return self._numbers[card.id]
        doc = self.docs.get(card.source_doc_id) if card.source_doc_id else None
        source = f"{doc.type} note #{doc.id}" if doc else "seeded know-how"
        self.items.append(
            Footnote(
                n=len(self.items) + 1,
                card_id=card.id,
                author=self.names.get(card.author_id, "unknown"),
                verified_by=self.names.get(card.verified_by_id) if card.verified_by_id else None,
                when=card.created_at.date(),
                source=source,
            )
        )
        self._numbers[card.id] = len(self.items)
        return len(self.items)


def _people(db: Session) -> Dict[int, str]:
    return dict(db.execute(select(Employee.id, Employee.name)).all())


def _docs(db: Session, cards: List[KnowledgeCard]) -> Dict[int, Document]:
    ids = {c.source_doc_id for c in cards if c.source_doc_id}
    if not ids:
        return {}
    return {d.id: d for d in db.execute(select(Document).where(Document.id.in_(ids))).scalars()}


def _playbook_procedures(
    db: Session,
    machine: Machine,
    comps: Dict[int, str],
    tips: Dict[int, Tuple[KnowledgeCard, str]],
    notes: Footnotes,
) -> List[dict]:
    """Approved procedures with every step, its settings, check and the old employee's tip."""
    procedures = list(
        db.execute(
            select(Procedure)
            .filter_by(machine_id=machine.id, status="approved")
            .order_by(Procedure.title)
        ).scalars()
    )
    steps: Dict[int, List[ProcedureStep]] = {p.id: [] for p in procedures}
    if procedures:
        for step in db.execute(
            select(ProcedureStep)
            .where(ProcedureStep.procedure_id.in_(steps))
            .order_by(ProcedureStep.procedure_id, ProcedureStep.step_no)
        ).scalars():
            steps[step.procedure_id].append(step)
    out = []
    for proc in procedures:
        rows, shown = [], set()
        for step in steps[proc.id]:
            tip = tips.get(step.component_id) if step.component_id else None
            if tip and tip[0].id in shown:
                tip = None  # each tip once, at the first step it applies to
            elif tip:
                shown.add(tip[0].id)
            rows.append(
                {
                    "step": step,
                    "component": comps.get(step.component_id),
                    "tip": tip[0] if tip else None,
                    "tip_author": tip[1] if tip else None,
                    "n": notes.cite(tip[0]) if tip else None,
                }
            )
        out.append({"procedure": proc, "steps": rows})
    return out


def render_handbook(db: Session, machine_id: int) -> str:
    """The machine playbook: everything a new employee must follow and know, with sources."""
    machine = db.get(Machine, machine_id)
    if machine is None:
        raise NotFound(f"machine {machine_id} not found")
    comps = list(
        db.execute(
            select(Component).filter_by(machine_id=machine.id).order_by(Component.id)
        ).scalars()
    )
    cards = list(
        db.execute(
            select(KnowledgeCard)
            .where(
                KnowledgeCard.machine_id == machine.id, KnowledgeCard.verified_by_id.is_not(None)
            )
            .order_by(KnowledgeCard.component_id, KnowledgeCard.score.desc(), KnowledgeCard.id)
        ).scalars()
    )
    tips = best_tips(db, machine.id)
    notes = Footnotes(_people(db), _docs(db, cards))  # tips are a subset of these cards
    procedures = _playbook_procedures(
        db, machine, {comp.id: comp.display_name for comp in comps}, tips, notes
    )
    safety = list(
        dict.fromkeys(
            row["step"].safety for p in procedures for row in p["steps"] if row["step"].safety
        )
    )
    open_warnings = list(
        db.execute(
            select(Warning)
            .where(
                Warning.machine_id == machine.id,
                Warning.status == "open",
                Warning.severity.in_(("stop", "caution")),
            )
            .order_by(Warning.created_at.desc())
            .limit(HISTORY_LIMIT)
        ).scalars()
    )
    stop_signs = list(
        db.execute(
            select(FailurePrecursor)
            .where(FailurePrecursor.machine_id == machine.id, FailurePrecursor.preceded_count > 0)
            .order_by(FailurePrecursor.preceded_count.desc(), FailurePrecursor.symptom)
        ).scalars()
    )
    by_comp: Dict[Optional[int], List[dict]] = {}
    for c in cards:
        by_comp.setdefault(c.component_id, []).append({"card": c, "n": notes.cite(c)})
    sections = [
        {"title": comp.display_name, "items": by_comp[comp.id]}
        for comp in comps
        if comp.id in by_comp
    ]
    if None in by_comp:
        sections.append({"title": "General", "items": by_comp[None]})
    materials = dict(db.execute(select(Material.id, Material.name)).all())
    limits = [
        {"limit": lim, "material": materials.get(lim.material_id, "any")}
        for lim in db.execute(
            select(ParamLimit).filter_by(machine_id=machine.id).order_by(ParamLimit.param)
        ).scalars()
    ]
    breakdowns = list(
        db.execute(
            select(Maintenance)
            .where(Maintenance.machine_id == machine.id, Maintenance.kind == "breakdown")
            .order_by(Maintenance.done_on.desc())
            .limit(HISTORY_LIMIT)
        ).scalars()
    )
    rejects = db.execute(
        select(QCReject.defect, func.sum(QCReject.quantity))
        .filter_by(machine_id=machine.id)
        .group_by(QCReject.defect)
        .order_by(func.sum(QCReject.quantity).desc())
    ).all()
    risk = handover.knowledge_risk(db, machine.id)
    return _env.get_template("machine_handbook.html").render(
        machine=machine,
        sections=sections,
        footnotes=notes.items,
        limits=limits,
        breakdowns=breakdowns,
        rejects=rejects,
        procedures=procedures,
        safety=safety,
        open_warnings=open_warnings,
        stop_signs=stop_signs,
        experts=machine_experts(db, machine.id),
        risk=risk[0] if risk else None,
        generated=datetime.now().strftime("%Y-%m-%d %H:%M"),
    )


def render_handover(db: Session, employee_id: int) -> str:
    """Handover progress of a leaving old employee and the know-how they already shared."""
    plan = handover.get_handover_plan(db, employee_id)
    cards = list(
        db.execute(
            select(KnowledgeCard)
            .where(
                KnowledgeCard.author_id == employee_id, KnowledgeCard.verified_by_id.is_not(None)
            )
            .order_by(KnowledgeCard.machine_id, KnowledgeCard.id)
        ).scalars()
    )
    notes = Footnotes(_people(db), _docs(db, cards))
    machines = dict(db.execute(select(Machine.id, Machine.name)).all())
    shared = [
        {"card": c, "machine": machines.get(c.machine_id, "-"), "n": notes.cite(c)} for c in cards
    ]
    risk = [
        cell
        for cell in handover.knowledge_risk(db)
        if cell.component_id is None and cell.name in plan.sole_holder_machines
    ]
    return _env.get_template("handover_report.html").render(
        plan=plan,
        shared=shared,
        footnotes=notes.items,
        risk=risk,
        generated=datetime.now().strftime("%Y-%m-%d %H:%M"),
    )


def render_shift_summary(db: Session, day: date) -> str:
    """What happened on each machine during one day, plus what is still open."""
    start = datetime.combine(day, time.min)
    end = start + timedelta(days=1)
    machines = dict(db.execute(select(Machine.id, Machine.name)).all())
    events = list(
        db.execute(
            select(Event)
            .where(Event.occurred_at >= start, Event.occurred_at < end)
            .order_by(Event.machine_id, Event.occurred_at)
        ).scalars()
    )
    per_machine: Dict[str, List[Event]] = {}
    for e in events:
        per_machine.setdefault(machines.get(e.machine_id, "?"), []).append(e)
    open_warnings = list(
        db.execute(
            select(Warning)
            .where(Warning.status == "open", Warning.created_at < end)
            .order_by(Warning.created_at.desc())
            .limit(HISTORY_LIMIT)
        ).scalars()
    )
    due = list(
        db.execute(
            select(ActionItem).where(
                ActionItem.status.in_(("open", "needs_review")),
                ActionItem.due_on.is_not(None),
                ActionItem.due_on <= day,
            )
        ).scalars()
    )
    return _env.get_template("shift_summary.html").render(
        day=day,
        per_machine=per_machine,
        open_warnings=open_warnings,
        machines=machines,
        due=due,
        generated=datetime.now().strftime("%Y-%m-%d %H:%M"),
    )
