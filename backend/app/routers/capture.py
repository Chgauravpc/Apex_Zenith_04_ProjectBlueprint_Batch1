"""Capture endpoints (Lane 1). Thin: parse the request, call one service function."""

from typing import Literal, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.capture import JobCreated, JobOut, TextNoteIn, VoiceNoteOut
from app.services import jobs
from app.services.capture import video, voice

router = APIRouter(prefix="/capture", tags=["capture"])
jobs_router = APIRouter(prefix="/jobs", tags=["jobs"])


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


@router.post("/video", response_model=JobCreated, status_code=202)
def capture_video(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    author_id: int = Form(...),
    machine_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
) -> JobCreated:
    """Store a setup video (≤ 100 MB) and draft a procedure from it in the background."""
    job, work = video.start_video_job(db, file, author_id, machine_id)
    background.add_task(jobs.run_job, job.id, work)
    return JobCreated(job_id=job.id)


@jobs_router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: str, db: Session = Depends(get_db)) -> JobOut:
    """Poll a background job (queued → running → done / failed)."""
    return JobOut.model_validate(jobs.get_job(db, job_id))
