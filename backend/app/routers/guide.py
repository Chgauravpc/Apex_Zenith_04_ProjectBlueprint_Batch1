"""Step-by-step guidance endpoints (paths match frontend/src/api/guide.js)."""

from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.guide import (
    GuidedRunOut,
    ProcedureOut,
    ProcedureSummary,
    ProcedureUpdate,
    PromoteIn,
    PromoteOut,
    RunStartIn,
    RunStepIn,
    RunStepOut,
    SkillOut,
)
from app.services.guide import authoring, guided, skills

router = APIRouter(prefix="/guide", tags=["guide"])


@router.get("/procedures", response_model=List[ProcedureSummary])
def list_procedures(
    machine_id: Optional[int] = None, status: Optional[str] = None, db: Session = Depends(get_db)
) -> List[ProcedureSummary]:
    """Procedures, newest version first per procedure."""
    return authoring.list_procedures(db, machine_id, status)


@router.get("/procedures/{procedure_id}", response_model=ProcedureOut)
def get_procedure(procedure_id: int, db: Session = Depends(get_db)) -> ProcedureOut:
    """One procedure with its steps and the old employees' tips per step."""
    return authoring.get_procedure(db, procedure_id)


@router.put("/procedures/{procedure_id}", response_model=ProcedureOut)
def update_procedure(
    procedure_id: int, change: ProcedureUpdate, db: Session = Depends(get_db)
) -> ProcedureOut:
    """Edit a draft, or approve it as a new version (the old version is kept)."""
    return authoring.update_procedure(db, procedure_id, change)


@router.post("/runs", response_model=GuidedRunOut)
def start_run(payload: RunStartIn, db: Session = Depends(get_db)) -> GuidedRunOut:
    """Start a guided job; steps adapt to the operator's skill level."""
    return guided.start_run(db, payload)


@router.post("/runs/{run_id}/steps", response_model=RunStepOut)
def record_step(run_id: int, payload: RunStepIn, db: Session = Depends(get_db)) -> RunStepOut:
    """Record a step; values are checked live and a stop blocks the next step."""
    return guided.record_step(db, run_id, payload)


@router.get("/skills/{employee_id}", response_model=List[SkillOut])
def get_skills(employee_id: int, db: Session = Depends(get_db)) -> List[SkillOut]:
    """Skill level per operation and clean runs towards the next level."""
    return skills.skills(db, employee_id)


@router.post("/skills/{employee_id}/promote", response_model=PromoteOut)
def promote(employee_id: int, payload: PromoteIn, db: Session = Depends(get_db)) -> PromoteOut:
    """Promote one level: needs enough clean runs and an old employee's sign-off."""
    return skills.maybe_promote(db, employee_id, payload.operation_id, payload.signed_off_by)
