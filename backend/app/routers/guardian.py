"""Note Guardian endpoints (paths match frontend/src/api/guardian.js)."""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.guardian import (
    GuardianResult,
    NoteIn,
    WarningList,
    WarningRecord,
    WarningRespondIn,
)
from app.services.guardian import check, warnings

router = APIRouter(prefix="/guardian", tags=["guardian"])


@router.post("/notes", response_model=GuardianResult)
def save_note(payload: NoteIn, db: Session = Depends(get_db)) -> GuardianResult:
    """Save a note and check it against machine history."""
    return check.save_and_check(db, payload)


@router.get("/warnings", response_model=WarningList)
def list_warnings(
    machine_id: Optional[int] = None,
    status: Optional[str] = Query("open"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> WarningList:
    """Warnings, newest first; open ones by default."""
    return warnings.list_warnings(db, machine_id, status, limit, offset)


@router.post("/warnings/{warning_id}/respond", response_model=WarningRecord)
def respond(
    warning_id: int, payload: WarningRespondIn, db: Session = Depends(get_db)
) -> WarningRecord:
    """Acknowledge, override (with a reason) or resolve a warning."""
    return warnings.respond(db, warning_id, payload)
