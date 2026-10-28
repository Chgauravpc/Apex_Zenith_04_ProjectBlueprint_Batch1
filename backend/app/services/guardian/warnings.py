"""Listing and answering Note Guardian warnings.

An "override" (the employee says it is not a problem here) needs a reason; it is kept as a
false alarm so thresholds and cards can be improved later (learning loop).
"""

from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.errors import NotFound, ValidationFailed
from app.models.guardian import Warning
from app.schemas.guardian import WarningList, WarningRecord, WarningRespondIn
from app.utils.audit import audit

STATUS_FOR = {"acknowledge": "acknowledged", "override": "false_alarm", "resolve": "resolved"}


def list_warnings(
    db: Session, machine_id: Optional[int], status: Optional[str], limit: int, offset: int
) -> WarningList:
    """Paginated warnings, newest first (one count + one page query)."""
    conds = []
    if machine_id is not None:
        conds.append(Warning.machine_id == machine_id)
    if status:
        conds.append(Warning.status == status)
    total = db.execute(select(func.count()).select_from(Warning).where(*conds)).scalar_one()
    rows = (
        db.execute(
            select(Warning)
            .where(*conds)
            .order_by(Warning.created_at.desc(), Warning.id.desc())
            .limit(limit)
            .offset(offset)
        )
        .scalars()
        .all()
    )
    return WarningList(
        items=[WarningRecord.model_validate(r) for r in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


def respond(db: Session, warning_id: int, answer: WarningRespondIn) -> WarningRecord:
    """Record the employee's response to a warning."""
    row = db.get(Warning, warning_id)
    if row is None:
        raise NotFound(f"warning {warning_id} not found")
    if answer.action == "override" and not (answer.reason or "").strip():
        raise ValidationFailed("say why this is not a problem, so others can learn from it")
    row.status = STATUS_FOR[answer.action]
    row.response = (answer.reason or "").strip() or None
    audit(
        db,
        f"warning.{row.status}",
        actor_id=answer.employee_id,
        target_type="warning",
        target_id=row.id,
    )
    db.commit()
    return WarningRecord.model_validate(row)
