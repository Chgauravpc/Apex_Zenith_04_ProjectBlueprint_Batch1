"""Procedures: list, show (with old employees' tips per step), edit drafts, approve versions.

Approving never overwrites: it publishes a NEW approved version and archives the previous
one, so a guided run can always be traced to the exact steps it used.
"""

import logging
from typing import Dict, List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import fts_index, utcnow
from app.errors import NotFound, ValidationFailed
from app.models.erp import ROLE_NEW, Employee, Machine
from app.models.guide import Procedure, ProcedureStep
from app.models.knowledge import KnowledgeCard
from app.models.map3d import Component
from app.schemas.guide import ProcedureOut, ProcedureSummary, ProcedureUpdate, StepOut
from app.services.ask.search import media_url
from app.utils.audit import audit

logger = logging.getLogger(__name__)

TITLE_CHARS = 60


def _short_title(text: str) -> str:
    first = text.split(". ")[0].split(";")[0].strip().rstrip(".")
    return first if len(first) <= TITLE_CHARS else first[: TITLE_CHARS - 1].rstrip() + "…"


def best_tips(db: Session, machine_id: Optional[int]) -> Dict[int, Tuple[KnowledgeCard, str]]:
    """Best verified old-employee card per component of the machine (one query)."""
    if machine_id is None:
        return {}
    rows = db.execute(
        select(KnowledgeCard, Employee.name)
        .join(Employee, Employee.id == KnowledgeCard.author_id)
        .where(
            KnowledgeCard.machine_id == machine_id,
            KnowledgeCard.component_id.is_not(None),
            KnowledgeCard.verified_by_id.is_not(None),
            Employee.role != ROLE_NEW,
        )
        .order_by(KnowledgeCard.score.desc(), KnowledgeCard.id)
    ).all()
    best: Dict[int, Tuple[KnowledgeCard, str]] = {}
    for card, name in rows:
        best.setdefault(card.component_id, (card, name))
    return best


def step_out(
    step: ProcedureStep, comps: Dict[int, str], tips: Dict[int, Tuple[KnowledgeCard, str]]
) -> StepOut:
    lo, hi = step.tolerance_min, step.tolerance_max
    target = (lo + hi) / 2 if lo is not None and hi is not None else lo if hi is None else hi
    tip = tips.get(step.component_id) if step.component_id else None
    return StepOut(
        id=step.id,
        step_no=step.step_no,
        title=_short_title(step.instruction),
        instruction=step.instruction,
        component_id=step.component_id,
        component=comps.get(step.component_id),
        keyframe_url=media_url(step.media_path),
        clip_start=step.clip_start,
        clip_end=step.clip_end,
        param_name=step.check_name,
        param_unit=step.unit,
        target_value=round(target, 4) if target is not None else None,
        tolerance=round((hi - lo) / 2, 4) if lo is not None and hi is not None else None,
        tolerance_min=lo,
        tolerance_max=hi,
        params=step.params or {},
        safety=step.safety,
        critical=step.critical,
        expected_seconds=step.expected_seconds,
        expert_tip=f"{tip[0].title}: {tip[0].action}" if tip else None,
        expert_tip_author=tip[1] if tip else None,
        expert_tip_card_id=tip[0].id if tip else None,
    )


def _summary(db: Session, p: Procedure, steps: int) -> ProcedureSummary:
    names = dict(
        db.execute(
            select(Employee.id, Employee.name).where(
                Employee.id.in_([i for i in (p.author_id, p.approver_id) if i])
            )
        ).all()
    )
    machine = db.get(Machine, p.machine_id) if p.machine_id else None
    return ProcedureSummary(
        id=p.id,
        key=p.key,
        title=p.title,
        machine_id=p.machine_id,
        machine=machine.name if machine else None,
        version=p.version,
        status=p.status,
        steps_count=steps,
        author=names.get(p.author_id),
        approver=names.get(p.approver_id),
        approved_at=p.approved_at,
    )


def list_procedures(
    db: Session, machine_id: Optional[int] = None, status: Optional[str] = None
) -> List[ProcedureSummary]:
    conds = []
    if machine_id is not None:
        conds.append(Procedure.machine_id == machine_id)
    if status:
        conds.append(Procedure.status == status)
    counts = dict(
        db.execute(
            select(ProcedureStep.procedure_id, func.count()).group_by(ProcedureStep.procedure_id)
        ).all()
    )
    rows = db.execute(
        select(Procedure).where(*conds).order_by(Procedure.key, Procedure.version.desc())
    ).scalars()
    return [_summary(db, p, counts.get(p.id, 0)) for p in rows]


def get_procedure(db: Session, procedure_id: int) -> ProcedureOut:
    proc = db.get(Procedure, procedure_id)
    if proc is None:
        raise NotFound(f"procedure {procedure_id} not found")
    steps = list(
        db.execute(
            select(ProcedureStep).filter_by(procedure_id=proc.id).order_by(ProcedureStep.step_no)
        ).scalars()
    )
    comps = dict(
        db.execute(
            select(Component.id, Component.display_name).filter_by(machine_id=proc.machine_id)
        ).all()
    )
    tips = best_tips(db, proc.machine_id)
    return ProcedureOut(
        **_summary(db, proc, len(steps)).model_dump(),
        steps=[step_out(s, comps, tips) for s in steps],
    )


def _approver(db: Session, employee_id: int) -> Employee:
    person = db.get(Employee, employee_id)
    if person is None:
        raise NotFound(f"employee {employee_id} not found")
    if person.role == ROLE_NEW:
        raise ValidationFailed("an old employee or supervisor must approve procedures")
    return person


def approve_procedure(db: Session, procedure_id: int, approver_id: int) -> Procedure:
    """Publish a new approved version (copy of this one); archive the previous approved one."""
    src = db.get(Procedure, procedure_id)
    if src is None:
        raise NotFound(f"procedure {procedure_id} not found")
    person = _approver(db, approver_id)
    latest = db.execute(select(func.max(Procedure.version)).filter_by(key=src.key)).scalar_one()
    for old in db.execute(select(Procedure).filter_by(key=src.key, status="approved")).scalars():
        old.status = "archived"
    if src.status == "draft":
        src.status = "superseded"
    new = Procedure(
        key=src.key,
        title=src.title,
        machine_id=src.machine_id,
        part_id=src.part_id,
        operation_id=src.operation_id,
        version=latest + 1,
        status="approved",
        author_id=src.author_id,
        approver_id=person.id,
        approved_at=utcnow(),
        source_doc_id=src.source_doc_id,
    )
    db.add(new)
    db.flush()
    steps = list(db.execute(select(ProcedureStep).filter_by(procedure_id=src.id)).scalars())
    for s in steps:
        db.add(
            ProcedureStep(
                procedure_id=new.id,
                step_no=s.step_no,
                instruction=s.instruction,
                media_path=s.media_path,
                clip_start=s.clip_start,
                clip_end=s.clip_end,
                params=s.params,
                check_name=s.check_name,
                tolerance_min=s.tolerance_min,
                tolerance_max=s.tolerance_max,
                unit=s.unit,
                safety=s.safety,
                critical=s.critical,
                expected_seconds=s.expected_seconds,
                component_id=s.component_id,
            )
        )
    fts_index(
        db,
        "procedure",
        new.id,
        new.machine_id,
        " ".join([new.title] + [s.instruction for s in steps]),
    )
    audit(
        db,
        "procedure.approved",
        actor_id=person.id,
        target_type="procedure",
        target_id=new.id,
        version=new.version,
        from_id=src.id,
    )
    db.commit()
    return new


def update_procedure(db: Session, procedure_id: int, change: ProcedureUpdate) -> ProcedureOut:
    """Edit a draft in place, or approve it as a new version."""
    if change.action == "approve":
        return get_procedure(db, approve_procedure(db, procedure_id, change.approver_id).id)
    proc = db.get(Procedure, procedure_id)
    if proc is None:
        raise NotFound(f"procedure {procedure_id} not found")
    _approver(db, change.approver_id)
    if proc.status != "draft":
        raise ValidationFailed("only drafts can be edited; approved versions stay as they are")
    if change.title:
        proc.title = change.title
    steps = {
        s.step_no: s
        for s in db.execute(select(ProcedureStep).filter_by(procedure_id=proc.id)).scalars()
    }
    for edit in change.steps:
        step = steps.get(edit.step_no)
        if step is None:
            raise NotFound(f"step {edit.step_no} not in procedure {proc.id}")
        for field in ("instruction", "safety", "critical"):
            value = getattr(edit, field)
            if value is not None:
                setattr(step, field, value)
    db.commit()
    return get_procedure(db, proc.id)
