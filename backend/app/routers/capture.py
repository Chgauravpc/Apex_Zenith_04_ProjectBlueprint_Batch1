"""Capture endpoints (Lane 1). Thin: parse the request, call one service function."""

from typing import Literal, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Query, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.capture import (
    IngestReport,
    JobCreated,
    JobOut,
    ReviewIn,
    ReviewOut,
    ReviewQueueOut,
    SensorBatchIn,
    TextNoteIn,
    TranscriptOut,
    VoiceNoteOut,
)
from app.services import jobs
from app.services.capture import handwritten, review, sensors, video, voice

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


@router.post("/transcribe", response_model=TranscriptOut)
def transcribe(
    file: UploadFile = File(...),
    language: Optional[Literal["hi", "mr", "en"]] = Form(None),
) -> TranscriptOut:
    """Turn a spoken reply into text the speaker can check before sending; nothing is kept."""
    return voice.transcribe_only(file, language)


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


@router.post("/handwritten", response_model=JobCreated, status_code=202)
def capture_handwritten(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    uploader_id: int = Form(...),
    machine_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
) -> JobCreated:
    """Store a photo of a handwritten page (≤ 10 MB) and read it in the background."""
    job, work = handwritten.start_handwritten_job(db, file, uploader_id, machine_id)
    background.add_task(jobs.run_job, job.id, work)
    return JobCreated(job_id=job.id)


@router.post("/sensors", response_model=IngestReport)
def capture_sensors(batch: SensorBatchIn, db: Session = Depends(get_db)) -> IngestReport:
    """Store a batch of readings from one sensor and report anomalies found in it."""
    return sensors.ingest_readings(db, batch)


@router.get("/review-queue", response_model=ReviewQueueOut)
def review_queue(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> ReviewQueueOut:
    """Cards waiting for an old employee to check them, least confident first."""
    return review.review_queue(db, limit, offset)


@router.post("/review/{card_id}", response_model=ReviewOut)
def review_card(card_id: int, payload: ReviewIn, db: Session = Depends(get_db)) -> ReviewOut:
    """Approve, correct or reject a captured card."""
    outcome, card = review.review_card(db, card_id, payload)
    return ReviewOut(outcome=outcome, card=card)


@jobs_router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: str, db: Session = Depends(get_db)) -> JobOut:
    """Poll a background job (queued → running → done / failed)."""
    return JobOut.model_validate(jobs.get_job(db, job_id))
