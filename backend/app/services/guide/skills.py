"""Skill levels per operator per operation (0 not trained … 4 can teach).

Promotion needs both: enough clean guided runs since the last level change (no failed
check, no stop warning) AND a sign-off by an old employee or supervisor. The system
never promotes anyone on its own.
"""

import logging
from typing import List, Optional

from sqlalchemy import exists, func, select
from sqlalchemy.orm import Session

from app.database import utcnow
from app.errors import NotFound, ValidationFailed
from app.models.erp import ROLE_NEW, Employee, Operation
from app.models.guide import (
    SKILL_INDEPENDENT,
    SKILL_NOT_TRAINED,
    GuidedRun,
    Procedure,
    RunStep,
    SkillMatrix,
)
from app.schemas.guide import SKILL_LABELS, PromoteOut, SkillOut
from app.utils.audit import audit

logger = logging.getLogger(__name__)

CLEAN_RUNS_TO_PROMOTE = 3
MAX_AUTO_LEVEL = SKILL_INDEPENDENT  # "can teach" (L4) is set by a supervisor, not by runs


def skill_level(db: Session, employee_id: int, operation_id: Optional[int]) -> int:
    if operation_id is None:
        return SKILL_NOT_TRAINED
    level = db.execute(
        select(SkillMatrix.level).filter_by(employee_id=employee_id, operation_id=operation_id)
    ).scalar_one_or_none()
    return level if level is not None else SKILL_NOT_TRAINED


def clean_runs(db: Session, employee_id: int, operation_id: int) -> int:
    """Finished runs on this operation, since the last sign-off, with every check passed."""
    row = db.execute(
        select(SkillMatrix).filter_by(employee_id=employee_id, operation_id=operation_id)
    ).scalar_one_or_none()
    since = row.signed_off_at if row and row.signed_off_at else None
    failed = exists().where(RunStep.run_id == GuidedRun.id, RunStep.passed.is_(False))
    conds = [
        GuidedRun.employee_id == employee_id,
        GuidedRun.status == "done",
        Procedure.operation_id == operation_id,
        ~failed,
    ]
    if since is not None:
        conds.append(GuidedRun.finished_at > since)
    return db.execute(
        select(func.count(GuidedRun.id))
        .join(Procedure, Procedure.id == GuidedRun.procedure_id)
        .where(*conds)
    ).scalar_one()


def _skill_out(
    db: Session, employee_id: int, op: Operation, row: Optional[SkillMatrix]
) -> SkillOut:
    level = row.level if row else SKILL_NOT_TRAINED
    signer = db.get(Employee, row.signed_off_by_id) if row and row.signed_off_by_id else None
    done = clean_runs(db, employee_id, op.id)
    return SkillOut(
        operation_id=op.id,
        operation=op.name,
        level=level,
        label=SKILL_LABELS[level],
        signed_off_by=signer.name if signer else None,
        clean_runs=done,
        runs_needed=max(0, CLEAN_RUNS_TO_PROMOTE - done),
    )


def skills(db: Session, employee_id: int) -> List[SkillOut]:
    """Skill level for every operation (untrained ones included)."""
    if db.get(Employee, employee_id) is None:
        raise NotFound(f"employee {employee_id} not found")
    rows = {
        r.operation_id: r
        for r in db.execute(select(SkillMatrix).filter_by(employee_id=employee_id)).scalars()
    }
    ops = db.execute(select(Operation).order_by(Operation.id)).scalars()
    return [_skill_out(db, employee_id, op, rows.get(op.id)) for op in ops]


def maybe_promote(
    db: Session, employee_id: int, operation_id: int, signed_off_by: int
) -> PromoteOut:
    """Raise the level by one if enough clean runs exist and a qualified person signs off."""
    op = db.get(Operation, operation_id)
    if op is None:
        raise NotFound(f"operation {operation_id} not found")
    signer = db.get(Employee, signed_off_by)
    if signer is None or signer.role == ROLE_NEW or signer.id == employee_id:
        raise ValidationFailed("sign-off must come from an old employee or a supervisor")
    row = db.execute(
        select(SkillMatrix).filter_by(employee_id=employee_id, operation_id=operation_id)
    ).scalar_one_or_none()
    level = row.level if row else SKILL_NOT_TRAINED
    done = clean_runs(db, employee_id, operation_id)
    if level >= MAX_AUTO_LEVEL:
        reason = "already independent; 'can teach' is set by a supervisor"
    elif done < CLEAN_RUNS_TO_PROMOTE:
        reason = f"needs {CLEAN_RUNS_TO_PROMOTE - done} more clean guided run(s)"
    else:
        if row is None:
            row = SkillMatrix(employee_id=employee_id, operation_id=operation_id)
            db.add(row)
        row.level, row.signed_off_by_id, row.signed_off_at = level + 1, signer.id, utcnow()
        audit(
            db,
            "skill.promoted",
            actor_id=signer.id,
            target_type="employee",
            target_id=employee_id,
            operation=op.name,
            level=row.level,
        )
        db.commit()
        return PromoteOut(
            promoted=True,
            skill=_skill_out(db, employee_id, op, row),
            reason=f"{done} clean runs, signed off by {signer.name}",
        )
    return PromoteOut(promoted=False, skill=_skill_out(db, employee_id, op, row), reason=reason)
