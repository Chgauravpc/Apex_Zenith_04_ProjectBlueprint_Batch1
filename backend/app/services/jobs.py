"""Background jobs for slow work (video → procedure, handwritten page → meeting record).

The request saves the upload, creates a `Job` row and returns its id at once; the work
runs after the response (FastAPI BackgroundTasks, in a worker thread) with its own DB
session, and the client polls GET /api/jobs/{id} until status is done or failed.
"""

import logging
from typing import Any, Callable, Dict

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.errors import AppError, NotFound
from app.models.ops import Job

logger = logging.getLogger(__name__)

Work = Callable[[Session], Dict[str, Any]]

# Session factory for job threads; tests point it at their in-memory database.
session_factory: Callable[[], Session] = SessionLocal


def create_job(db: Session, kind: str) -> Job:
    """Create a queued job and commit it so the client can poll it right away."""
    job = Job(kind=kind)
    db.add(job)
    db.commit()
    return job


def run_job(job_id: str, work: Work) -> None:
    """Run `work` for a job and record the outcome. Never raises (runs after the response).

    Expected errors (AppError) are shown to the user as-is; anything else is logged and
    reported as an internal error without leaking details.
    """
    with session_factory() as db:
        job = db.get(Job, job_id)
        if job is None:
            logger.error("job %s vanished before it ran", job_id)
            return
        job.status = "running"
        db.commit()
        try:
            result = work(db)
        except AppError as exc:
            db.rollback()
            job.status, job.error = "failed", exc.message
        except Exception:  # noqa: BLE001  background thread: record, never crash the worker
            db.rollback()
            logger.exception("job %s (%s) crashed", job_id, job.kind)
            job.status, job.error = "failed", "internal error while processing"
        else:
            job.status, job.result = "done", result
        db.commit()
        logger.info("job %s %s -> %s", job_id, job.kind, job.status)


def get_job(db: Session, job_id: str) -> Job:
    """Return a job or raise NotFound."""
    job = db.get(Job, job_id)
    if job is None:
        raise NotFound(f"job {job_id} not found")
    return job
