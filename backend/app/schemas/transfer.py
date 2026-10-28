"""Old → new transfer schemas. Field names follow the frontend's transfer and dashboard views."""

import datetime as dt
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

from app.schemas.capture import CardOut

RiskStatus = Literal["critical", "at_risk", "ok"]


class RiskCell(BaseModel):
    """Who holds the know-how for one machine (component_id None) or one machine part."""

    machine_id: int
    component_id: Optional[int] = None
    name: str  # "VMC-3" or "VMC-3 · Spindle"
    cards: int  # verified cards by old employees
    holders: int  # distinct old employees with verified cards
    bus: int  # bus factor = holders still here after planned exits
    coverage: int  # machine: % of its parts with know-how; part: 100 if any card
    expert: Optional[str] = None
    expert_id: Optional[int] = None
    expert_leaving_on: Optional[dt.date] = None
    status: RiskStatus


class HandoverTaskOut(BaseModel):
    id: int
    title: str
    category: str  # interview / record_setup / validate
    status: str  # todo / done
    machine_id: Optional[int] = None
    component_id: Optional[int] = None


class HandoverPlanOut(BaseModel):
    id: int
    employee_id: int
    employee: str
    exit_date: dt.date
    days_left: int
    status: str
    progress: int  # 0..100
    sole_holder_machines: List[str]
    gaps: List[str]
    tasks: List[HandoverTaskOut]


class InterviewStartIn(BaseModel):
    employee_id: int
    machine_id: Optional[int] = None
    component_id: Optional[int] = None


class InterviewQuestion(BaseModel):
    id: int  # position in the session
    text: str
    reason: str  # why we ask: the gap or the uncovered part
    gap_id: Optional[int] = None
    component_id: Optional[int] = None
    task_id: Optional[int] = None
    answered: bool = False


class InterviewSessionOut(BaseModel):
    id: int
    employee_id: int
    machine_id: Optional[int] = None
    status: str
    mode: Literal["live", "offline"] = "live"
    questions: List[InterviewQuestion]


class InterviewQuestionsLLM(BaseModel):
    """JSON from the interview prompt: one natural question per topic, same order."""

    questions: List[str] = Field(default_factory=list)


class InterviewAnswerIn(BaseModel):
    question_id: int
    answer_text: str = Field(min_length=1, max_length=8000)
    # Who is answering: must be the interviewed old employee (the card is verified as theirs).
    author_id: int


class InterviewAnswerOut(BaseModel):
    session_id: int
    question_id: int
    card: CardOut
    remaining: int
    guardian: Optional[Dict[str, Any]] = None  # Note Guardian check of the answer


class RouteIn(BaseModel):
    query_id: int


class RoutedQuestionOut(BaseModel):
    id: int
    question: str
    status: str
    machine_id: Optional[int] = None
    machine: Optional[str] = None
    asked_by_id: Optional[int] = None
    asked_by: Optional[str] = None
    routed_to_id: int
    routed_to: str
    answer_card_id: Optional[int] = None
    created_at: dt.datetime


class RoutedList(BaseModel):
    items: List[RoutedQuestionOut]
    total: int


class ReplyIn(BaseModel):
    reply_text: str = Field(min_length=1, max_length=8000)
    author_id: int


class ReplyOut(BaseModel):
    routed: RoutedQuestionOut
    card: CardOut
    guardian: Optional[Dict[str, Any]] = None  # Note Guardian check of the reply


class NewEmployeeProgress(BaseModel):
    employee_id: int
    employee: str
    days_on_job: Optional[int] = None
    independent_ops: int  # operations at skill level 3 (independent) or above
    trained_ops: int  # operations at level 1 or above
    clean_runs: int  # finished guided runs where every check passed


class TransferMetrics(BaseModel):
    """How far the old → new transfer has got, counted from the records (no estimates)."""

    coverage: int  # % of machine parts with verified know-how from an old employee
    parts_total: int
    parts_at_risk: int  # parts whose know-how leaves with planned exits
    verified_cards: int
    pending_review: int
    guardian_stops: int
    guardian_cautions: int
    warnings_with_fix: int  # warnings that showed what an old employee did last time
    questions_routed: int
    questions_answered: int
    handover_progress: Optional[int] = None  # mean progress of active handover plans
    new_employees: List[NewEmployeeProgress]
