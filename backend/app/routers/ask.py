"""Ask Experience endpoints (paths match frontend/src/api/ask.js)."""

from typing import Literal, Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.ask import AskAnswer, AskRequest, FeedbackIn, FeedbackOut
from app.services.ask import qa

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


@router.post("/{query_id}/feedback", response_model=FeedbackOut)
def feedback(query_id: int, payload: FeedbackIn, db: Session = Depends(get_db)) -> FeedbackOut:
    """Helpful / not helpful; adjusts the score of the cards the answer cited."""
    return qa.record_feedback(db, query_id, payload)
