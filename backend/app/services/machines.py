"""Machine list and each machine's timeline (ERP, sensors, notes, warnings in one stream)."""

from typing import List

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.errors import NotFound
from app.models.erp import Machine
from app.models.ops import Event
from app.schemas.machines import EventOut, MachineOut, TimelineOut

MAX_PAGE = 100


def list_machines(db: Session) -> List[MachineOut]:
    rows = db.execute(select(Machine).order_by(Machine.name)).scalars()
    return [MachineOut.model_validate(m) for m in rows]


def timeline(db: Session, machine_id: int, limit: int = 30, offset: int = 0) -> TimelineOut:
    """Newest events first, one page at a time."""
    machine = db.get(Machine, machine_id)
    if machine is None:
        raise NotFound(f"machine {machine_id} not found")
    limit = max(1, min(limit, MAX_PAGE))
    offset = max(0, offset)
    total = db.execute(
        select(func.count()).select_from(Event).where(Event.machine_id == machine_id)
    ).scalar_one()
    rows = db.execute(
        select(Event)
        .where(Event.machine_id == machine_id)
        .order_by(Event.occurred_at.desc(), Event.id.desc())
        .limit(limit)
        .offset(offset)
    ).scalars()
    return TimelineOut(
        machine_id=machine.id,
        machine=machine.name,
        items=[EventOut.model_validate(e) for e in rows],
        total=total,
        limit=limit,
        offset=offset,
    )
