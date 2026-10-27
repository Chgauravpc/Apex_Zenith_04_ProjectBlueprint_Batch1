"""Capture endpoints (Lane 1). Thin: parse the request, call one service function."""

from typing import Literal, Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.capture import TextNoteIn, VoiceNoteOut
from app.services.capture import voice

router = APIRouter(prefix="/capture", tags=["capture"])


@router.post("/text", response_model=VoiceNoteOut)
def capture_text(payload: TextNoteIn, db: Session = Depends(get_db)) -> VoiceNoteOut:
    """Save a typed note and return the know-how cards found in it."""
    return voice.capture_text(db, payload)


@router.post("/voice", response_model=VoiceNoteOut)
def capture_voice(
    file: UploadFile = File(...),
    author_id: int = Form(...),
    machine_id: Optional[int] = Form(None),
    language: Optional[Literal["hi", "mr", "en"]] = Form(None),
    consent: bool = Form(True),
    db: Session = Depends(get_db),
) -> VoiceNoteOut:
    """Save a voice note (≤ 25 MB), transcribe it and return the cards found in it."""
    return voice.capture_voice(db, file, author_id, machine_id, language, consent)
