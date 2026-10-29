"""Guided job runs: steps adapted to skill level, values checked live at every step.

Skill views: L0–L1 "full" (every step, video clip, old employee's tip), L2 "condensed"
(every step, no media), L3+ "checklist" (critical steps only). Each recorded value is
checked against the step tolerance and the machine's approved limits (Note Guardian
rules); a stop-level result blocks the next step until the buddy has looked.
"""

import logging
from typing import List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import utcnow
from app.errors import NotFound, ValidationFailed
from app.models.erp import Employee, Part, WorkOrder
from app.models.guardian import ParamLimit
from app.models.guide import GuidedRun, Procedure, ProcedureStep, RunStep
from app.models.ops import Event, Notification
from app.models.transfer import KnowledgeBuddy
from app.schemas.guardian import Evidence, Finding, ParamLimitDTO
from app.schemas.guide import SKILL_LABELS, GuidedRunOut, RunStartIn, RunStepIn, RunStepOut, StepOut
from app.services.guardian import rules
from app.services.guide.authoring import get_procedure
from app.services.guide.skills import skill_level

logger = logging.getLogger(__name__)


def view_for(level: int) -> str:
    return "full" if level <= 1 else "condensed" if level == 2 else "checklist"


def _checklist(steps: List[StepOut]) -> List[StepOut]:
    """Critical steps only; every step when none is marked critical (else nothing to do)."""
    return [s for s in steps if s.critical] or list(steps)


def _visible(steps: List[StepOut], view: str) -> List[StepOut]:
    if view == "checklist":
        return _checklist(steps)
    if view == "condensed":
        return [
            s.model_copy(
                update={
                    "keyframe_url": None,
                    "clip_start": None,
                    "clip_end": None,
                    "expert_tip": None,
                }
            )
            for s in steps
        ]
    return steps


def _procedure_for(db: Session, payload: RunStartIn) -> Tuple[Procedure, Optional[WorkOrder]]:
    order = db.get(WorkOrder, payload.work_order_id) if payload.work_order_id else None
    if payload.work_order_id and order is None:
        raise NotFound(f"work order {payload.work_order_id} not found")
    if payload.procedure_id is not None:
        proc = db.get(Procedure, payload.procedure_id)
        if proc is None or proc.status != "approved":
            raise NotFound(f"approved procedure {payload.procedure_id} not found")
        return proc, order
    if order is None:
        raise ValidationFailed("give a work order or a procedure")
    candidates = list(
        db.execute(
            select(Procedure).filter_by(machine_id=order.machine_id, status="approved")
        ).scalars()
    )
    # Best match: same part and operation, then same operation, then anything on the machine.
    candidates.sort(
        key=lambda p: (
            p.part_id != order.part_id or order.part_id is None,
            p.operation_id != order.operation_id,
            -p.version,
        )
    )
    if not candidates:
        raise NotFound(
            "no approved procedure for this machine yet; ask an old employee to record one"
        )
    return candidates[0], order


def start_run(db: Session, payload: RunStartIn) -> GuidedRunOut:
    """Start a guided job for an employee, from a work order or a chosen procedure."""
    if db.get(Employee, payload.employee_id) is None:
        raise NotFound(f"employee {payload.employee_id} not found")
    proc, order = _procedure_for(db, payload)
    level = skill_level(db, payload.employee_id, proc.operation_id)
    view = view_for(level)
    run = GuidedRun(
        procedure_id=proc.id,
        employee_id=payload.employee_id,
        work_order_id=order.id if order else None,
        skill_level=level,
    )
    db.add(run)
    db.commit()
    full = get_procedure(db, proc.id)
    shown = _visible(full.steps, view)
    return GuidedRunOut(
        run_id=run.id,
        employee_id=run.employee_id,
        skill_level=level,
        skill_label=SKILL_LABELS[level],
        view=view,
        procedure=full.model_copy(update={"steps": shown, "steps_count": len(shown)}),
    )


def _limits(db: Session, proc: Procedure) -> List[ParamLimitDTO]:
    material = (
        db.execute(select(Part.material_id).filter_by(id=proc.part_id)).scalar_one_or_none()
        if proc.part_id
        else None
    )
    rows = [
        r
        for r in db.execute(select(ParamLimit).filter_by(machine_id=proc.machine_id)).scalars()
        if r.material_id in (None, material)
    ]
    rows.sort(key=lambda r: r.material_id is None)  # material-specific first
    return [
        ParamLimitDTO(
            id=r.id,
            param=r.param,
            min_value=r.min_value,
            max_value=r.max_value,
            unit=r.unit,
            note=r.note,
        )
        for r in rows
    ]


def _tolerance_finding(step: ProcedureStep, value: float) -> Optional[Finding]:
    lo, hi = step.tolerance_min, step.tolerance_max
    if lo is None and hi is None:
        return None
    if (lo is None or value >= lo) and (hi is None or value <= hi):
        return None
    band = (hi - lo) if lo is not None and hi is not None else abs(hi if hi is not None else lo)
    far = (lo is not None and value < lo - band) or (hi is not None and value > hi + band)
    unit = step.unit or ""
    evidence = Evidence(
        type="procedure_step",
        id=step.id,
        kind="Step check",
        title=f"{step.check_name or 'value'} {lo if lo is not None else '–'}–"
        f"{hi if hi is not None else '–'} {unit}".strip(),
    )
    return Finding(
        rule="tolerance",
        severity="stop" if far else "caution",
        message=f"{step.check_name or 'Value'} {value:g} {unit} is outside "
        f"{lo if lo is not None else '–'}–{hi if hi is not None else '–'} "
        f"{unit}. Check before the next step.".replace("  ", " "),
        evidence=[evidence],
    )


def record_step(db: Session, run_id: int, step_in: RunStepIn) -> RunStepOut:
    """Save one step of a run and check its values; tells the UI whether to go on."""
    run = db.get(GuidedRun, run_id)
    if run is None:
        raise NotFound(f"run {run_id} not found")
    if run.status != "running":
        raise ValidationFailed("this run is already finished")
    proc = db.get(Procedure, run.procedure_id)
    steps = list(
        db.execute(
            select(ProcedureStep).filter_by(procedure_id=proc.id).order_by(ProcedureStep.step_no)
        ).scalars()
    )
    step = next((s for s in steps if s.step_no == step_in.step_no), None)
    if step is None:
        raise NotFound(f"step {step_in.step_no} not in this procedure")
    if step.check_name and step_in.value is None:
        raise ValidationFailed(f"measure and enter the {step.check_name} for this step")

    findings: List[Finding] = []
    if step_in.value is not None:
        found = _tolerance_finding(step, step_in.value)
        if found is not None:
            findings.append(found)
    findings += rules.check_params(step_in.values, _limits(db, proc))
    stop = any(f.severity == "stop" for f in findings)
    record = db.execute(
        select(RunStep).filter_by(run_id=run.id, step_id=step.id)
    ).scalar_one_or_none() or RunStep(run_id=run.id, step_id=step.id)
    record.values = {
        **step_in.values,
        **({"value": step_in.value} if step_in.value is not None else {}),
    }
    record.passed = not findings
    record.deviation = (
        "; ".join([f.message for f in findings] + ([step_in.notes] if step_in.notes else []))
        or None
    )
    db.add(record)
    if stop:
        buddy = db.execute(
            select(KnowledgeBuddy.old_employee_id).filter_by(
                new_employee_id=run.employee_id, machine_id=proc.machine_id
            )
        ).scalar_one_or_none()
        if buddy:
            db.add(
                Notification(
                    employee_id=buddy,
                    kind="run_stop",
                    ref_type="guided_run",
                    ref_id=run.id,
                    message=findings[0].message,
                )
            )

    view = view_for(run.skill_level)
    order = [s.step_no for s in (_checklist(steps) if view == "checklist" else steps)]
    db.flush()
    done = set(
        db.execute(
            select(ProcedureStep.step_no)
            .join(RunStep, RunStep.step_id == ProcedureStep.id)
            .where(RunStep.run_id == run.id)
        ).scalars()
    )
    remaining = [n for n in order if n not in done]
    if not remaining:
        run.status, run.finished_at = "done", utcnow()
    if stop or not remaining:
        who = db.get(Employee, run.employee_id)
        name = who.name if who else "operator"
        db.add(
            Event(
                machine_id=proc.machine_id,
                kind="run",
                ref_type="guided_run",
                ref_id=run.id,
                summary=(
                    f"STOP at step {step.step_no} ({name}): {findings[0].message}"
                    if stop
                    else f"{name} finished '{proc.title}'"
                ),
            )
        )
    db.commit()
    later = [n for n in remaining if n > step.step_no]
    return RunStepOut(
        run_id=run.id,
        step_no=step.step_no,
        passed=not findings,
        warnings=findings,
        can_continue=not stop,
        next_step_no=(later or remaining or [None])[0],
        run_status=run.status,
    )
