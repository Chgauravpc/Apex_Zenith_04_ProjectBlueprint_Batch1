"""/machines and /machines/{id}/timeline (paths match frontend/src/api/machines.js)."""

from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.machines import MachineOut, TimelineOut
from app.services import machines

router = APIRouter(prefix="/machines", tags=["machines"])


@router.get("", response_model=List[MachineOut])
def list_machines(db: Session = Depends(get_db)) -> List[MachineOut]:
    """All machines from the ERP."""
    return machines.list_machines(db)


@router.get("/{machine_id}/timeline", response_model=TimelineOut)
def machine_timeline(
    machine_id: int,
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> TimelineOut:
    """One machine's events, newest first."""
    return machines.timeline(db, machine_id, limit, offset)
