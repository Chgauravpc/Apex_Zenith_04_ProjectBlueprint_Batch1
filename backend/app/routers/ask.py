"""Ask Experience endpoints (paths match frontend/src/api/ask.js)."""

from typing import Literal, Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.ask import (
    AnalyticsRequest,
    AnalyticsResult,
    AskAnswer,
    AskRequest,
    ChatterResult,
    ChipResult,
    FeedbackIn,
    FeedbackOut,
)
from app.services.ask import analytics, chatter, chips, qa

router = APIRouter(prefix="/ask", tags=["ask"])


@router.post("", response_model=AskAnswer)
def ask(payload: AskRequest, db: Session = Depends(get_db)) -> AskAnswer:
    """Answer a typed question from old employees' recorded know-how, with sources."""
    return qa.answer(db, payload)


@router.post("/voice", response_model=AskAnswer)
def ask_voice(
    file: UploadFile = File(...),
    machine_id: Optional[int] = Form(None),
    language: Optional[Literal["hi", "mr", "en"]] = Form(None),
    asked_by_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
) -> AskAnswer:
    """Answer a spoken question (Hindi / Marathi / English); the answer can be played back."""
    return qa.answer_voice(db, file, machine_id, language, asked_by_id)


@router.post("/chatter", response_model=ChatterResult)
def ask_chatter(
    file: UploadFile = File(...),
    machine_id: int = Form(...),
    teeth: Optional[int] = Form(None),
    current_rpm: Optional[int] = Form(None),
    db: Session = Depends(get_db),
) -> ChatterResult:
    """Record 5–10 s of cutting sound: chatter frequency and stable speeds to try."""
    return chatter.chatter_from_upload(db, file, machine_id, teeth, current_rpm)


@router.post("/chips", response_model=ChipResult)
def ask_chips(
    file: UploadFile = File(...),
    tool_material: str = Form("carbide"),
    workpiece: str = Form("SS304"),
    machine_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
) -> ChipResult:
    """Photo of chips: colour, what it says about cutting heat, and the old employee's note."""
    return chips.read_chips(db, file, tool_material, workpiece, machine_id)


@router.post("/analytics", response_model=AnalyticsResult)
def ask_analytics(payload: AnalyticsRequest, db: Session = Depends(get_db)) -> AnalyticsResult:
    """Counting / trend questions answered with one read-only SELECT (max 200 rows)."""
    return analytics.run_analytics(db, payload)


@router.post("/{query_id}/feedback", response_model=FeedbackOut)
def feedback(query_id: int, payload: FeedbackIn, db: Session = Depends(get_db)) -> FeedbackOut:
    """Helpful / not helpful; adjusts the score of the cards the answer cited."""
    return qa.record_feedback(db, query_id, payload)
