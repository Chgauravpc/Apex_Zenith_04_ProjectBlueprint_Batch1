"""Printable HTML reports (open in a browser, Ctrl+P → Save as PDF)."""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.ask import reports

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/handbook/{machine_id}", response_class=HTMLResponse)
def handbook(machine_id: int, db: Session = Depends(get_db)) -> HTMLResponse:
    """Machine handbook for new employees, every tip footnoted to its source."""
    return HTMLResponse(reports.render_handbook(db, machine_id))


@router.get("/handover/{employee_id}", response_class=HTMLResponse)
def handover_report(employee_id: int, db: Session = Depends(get_db)) -> HTMLResponse:
    """Handover progress of a leaving old employee."""
    return HTMLResponse(reports.render_handover(db, employee_id))


@router.get("/shift-summary", response_class=HTMLResponse)
def shift_summary(day: Optional[date] = None, db: Session = Depends(get_db)) -> HTMLResponse:
    """What happened on each machine on one day (today by default)."""
    return HTMLResponse(reports.render_shift_summary(db, day or date.today()))
