"""Photo of a handwritten logbook / meeting page → meeting record with issues and actions.

The vision model reads the page. Each item carries a confidence; anything below
REVIEW_BELOW is marked for review so a person checks it before it is trusted.
There is no offline fallback: if no vision model is reachable the job fails with a
clear message (we never guess what a page says).
"""

import logging
import re
from datetime import date
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import fts_index
from app.errors import ValidationFailed
from app.models.erp import Employee, Machine
from app.models.knowledge import ActionItem, Document, Meeting
from app.models.ops import Event, Job
from app.prompts.handwritten import HANDWRITTEN_PROMPT
from app.schemas.capture import ActionItemIn, HandwrittenResult
from app.services import jobs, llm
from app.services.capture.voice import check_refs, on_note_saved
from app.utils import lexicon
from app.utils.audit import audit
from app.utils.files import save_upload

logger = logging.getLogger(__name__)

REVIEW_BELOW = 0.6  # items read with less confidence wait for a person to check them
MAX_LONG_SIDE = 1280  # px, page photo is resized before sending (ENGINEERING.md §4)
JPEG_QUALITY = 85


def _page_jpeg(image_path: Path) -> bytes:
    """Load the photo, shrink it to ≤ 1280 px on the long side and re-encode as JPEG."""
    img = cv2.imread(str(image_path), cv2.IMREAD_COLOR)
    if img is None:
        raise ValidationFailed("file is not a readable image")
    h, w = img.shape[:2]
    scale = MAX_LONG_SIDE / max(h, w)
    if scale < 1:
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
    if not ok:
        raise ValidationFailed("could not encode the image")
    return buf.tobytes()


def _parse_date(
    value: Optional[str], page_text: str = "", today: Optional[date] = None
) -> Optional[date]:
    """The meeting date, in this year when the page shows no year ("29/10").

    The model fills in a year it cannot see; keep it only if the page has it (2026 or /26).
    """
    try:
        held = date.fromisoformat(value) if value else None
    except ValueError:
        return None
    if held is None or re.search(rf"{held.year}|[/.-]{held.year % 100:02d}\b", page_text):
        return held
    today = today or date.today()
    try:
        held = held.replace(year=today.year)
        return held if held <= today else held.replace(year=today.year - 1)
    except ValueError:  # 29 February
        return None


def _match_owner(name: Optional[str], people: List[Employee]) -> Optional[int]:
    """Match a written name ("Ramesh", "ramesh bhau") to an employee by first name."""
    if not name:
        return None
    words = set(lexicon.normalize(name).split())
    for person in people:
        first = lexicon.normalize(person.name).split()[0]
        if first in words or lexicon.normalize(person.name) == lexicon.normalize(name):
            return person.id
    return None


def _save_actions(
    db: Session, meeting: Meeting, items: List[ActionItemIn], machines: Dict[str, int]
) -> Tuple[int, int]:
    """Store action items; return (saved, needing review)."""
    people = list(db.execute(select(Employee)).scalars())
    review = 0
    for item in items:
        low = item.confidence < REVIEW_BELOW
        review += low
        name = lexicon.match_machine(item.machine or item.text, machines)
        db.add(
            ActionItem(
                meeting_id=meeting.id,
                text=item.text,
                owner_id=_match_owner(item.owner, people),
                machine_id=machines[name] if name else None,
                due_on=_parse_date(item.due),
                status="needs_review" if low else "open",
            )
        )
    return len(items), review


def process_handwritten(
    db: Session, image_path: Path, uploader_id: int, machine_id: Optional[int] = None
) -> HandwrittenResult:
    """Read a handwritten page and store it as a meeting with issues, decisions and actions.

    Raises:
        ValidationFailed: unreadable image. ProviderUnavailable: no vision model reachable.
    """
    page = _page_jpeg(image_path)
    result = llm.vision_json("vision", [page], HANDWRITTEN_PROMPT, HandwrittenResult)
    machines = {m.name: m.id for m in db.execute(select(Machine)).scalars()}
    everything = " ".join([result.text] + [i.text for i in result.issues + result.decisions])
    found = lexicon.match_machine(everything, machines)
    machine = machines[found] if found else machine_id

    doc = Document(
        type="handwritten",
        file_path=str(image_path),
        text=result.text,
        uploader_id=uploader_id,
        machine_id=machine,
    )
    db.add(doc)
    db.flush()
    summary = "\n".join(
        [f"Issue: {i.text}" for i in result.issues]
        + [f"Decision: {d.text}" for d in result.decisions]
    )
    meeting = Meeting(
        document_id=doc.id,
        title=result.title[:200],
        summary=summary or None,
        held_on=_parse_date(result.meeting_date, result.text) or date.today(),
    )
    db.add(meeting)
    db.flush()
    _, review = _save_actions(db, meeting, result.action_items, machines)
    review += sum(i.confidence < REVIEW_BELOW for i in result.issues + result.decisions)

    searchable = " ".join([meeting.title, summary] + [a.text for a in result.action_items])
    fts_index(db, "meeting", meeting.id, machine, searchable)
    if machine is not None:
        db.add(
            Event(
                machine_id=machine,
                kind="meeting",
                ref_type="meeting",
                ref_id=meeting.id,
                summary=meeting.title,
            )
        )
    audit(
        db,
        "meeting.read",
        actor_id=uploader_id,
        target_type="meeting",
        target_id=meeting.id,
        needs_review=review,
    )
    db.commit()
    logger.info(
        "handwritten doc %s -> meeting %s (%d actions, %d to review)",
        doc.id,
        meeting.id,
        len(result.action_items),
        review,
    )
    return result.model_copy(
        update={
            "document_id": doc.id,
            "meeting_id": meeting.id,
            "needs_review": review,
            # Every note is checked against the machine's history, handwritten ones too.
            "guardian": on_note_saved(db, doc),
        }
    )


def start_handwritten_job(
    db: Session, file: UploadFile, uploader_id: int, machine_id: Optional[int]
) -> Tuple[Job, jobs.Work]:
    """Store the photo and create a queued job; return the job and the work to run later."""
    check_refs(db, uploader_id, machine_id)
    path = save_upload(file, "image")
    job = jobs.create_job(db, "handwritten")

    def work(job_db: Session) -> Dict[str, Any]:
        out = process_handwritten(job_db, path, uploader_id, machine_id)
        return out.model_dump(mode="json")

    return job, work
