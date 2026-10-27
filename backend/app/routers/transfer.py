"""Old → new transfer endpoints (paths match frontend/src/api/transfer.js)."""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.transfer import (
    HandoverPlanOut,
    InterviewAnswerIn,
    InterviewAnswerOut,
    InterviewSessionOut,
    InterviewStartIn,
    ReplyIn,
    ReplyOut,
    RiskCell,
    RoutedList,
    RoutedQuestionOut,
    RouteIn,
)
from app.services.transfer import handover, interview, routing

router = APIRouter(prefix="/transfer", tags=["transfer"])


@router.get("/handover/{employee_id}", response_model=HandoverPlanOut)
def get_handover(employee_id: int, db: Session = Depends(get_db)) -> HandoverPlanOut:
    """Handover plan of a leaving old employee (created on first request if needed)."""
    return handover.get_handover_plan(db, employee_id)


@router.post("/interview/start", response_model=InterviewSessionOut)
def start_interview(
    payload: InterviewStartIn, db: Session = Depends(get_db)
) -> InterviewSessionOut:
    """Open an AI interview with questions drawn from real knowledge gaps."""
    return interview.start_interview(db, payload)


@router.post("/interview/{session_id}/answer", response_model=InterviewAnswerOut)
def answer_interview(
    session_id: int, payload: InterviewAnswerIn, db: Session = Depends(get_db)
) -> InterviewAnswerOut:
    """Answer one question; it is saved as a verified card."""
    return interview.answer_interview(db, session_id, payload)


@router.get("/routed-questions", response_model=RoutedList)
def routed_questions(
    employee_id: Optional[int] = None,
    status: Optional[str] = Query("open"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> RoutedList:
    """Questions waiting for an old employee (open by default)."""
    return routing.list_routed(db, employee_id, status, limit, offset)


@router.post("/routed-questions", response_model=RoutedQuestionOut)
def route(payload: RouteIn, db: Session = Depends(get_db)) -> RoutedQuestionOut:
    """Send an unanswered Ask question to the old employee who knows the machine."""
    return routing.route_out(db, payload.query_id)


@router.post("/routed-questions/{routed_id}/reply", response_model=ReplyOut)
def reply(routed_id: int, payload: ReplyIn, db: Session = Depends(get_db)) -> ReplyOut:
    """The old employee's answer becomes a verified card everyone can find."""
    return routing.reply_out(db, routed_id, payload)


@router.get("/risk", response_model=List[RiskCell])
def risk(machine_id: Optional[int] = None, db: Session = Depends(get_db)) -> List[RiskCell]:
    """Who holds the know-how per machine and part, and how much leaves with exits."""
    return handover.knowledge_risk(db, machine_id)
