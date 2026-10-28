"""Capture a typed or spoken note: store it, turn it into cards, run note-saved checks.

Voice flow: upload → Document(voice) → Groq Whisper → extract_cards → save_cards →
on_note_saved hooks (Note Guardian registers itself there in T09).
"""

import logging
from typing import Any, Callable, Dict, List, Optional

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.errors import NotFound, ProviderUnavailable, ValidationFailed
from app.models.erp import Employee, Machine
from app.models.knowledge import Document
from app.schemas.capture import CardOut, ExtractedCard, TextNoteIn, TranscriptOut, VoiceNoteOut
from app.services import stt
from app.services.capture.extractor import extract_cards, save_cards
from app.utils.files import save_upload

logger = logging.getLogger(__name__)

NoteHook = Callable[[Session, Document], Optional[Dict[str, Any]]]
# Called after every saved note, in order. Note Guardian appends its check here (T09).
NOTE_SAVED_HOOKS: List[NoteHook] = []


def on_note_saved(db: Session, doc: Document) -> Optional[Dict[str, Any]]:
    """Run every registered hook; return the last non-empty result (the Guardian result).

    A failing hook is logged and skipped so that saving a note never fails because of it.
    """
    result: Optional[Dict[str, Any]] = None
    for hook in NOTE_SAVED_HOOKS:
        try:
            out = hook(db, doc)
        except Exception:  # noqa: BLE001  a check must never lose the employee's note
            logger.exception("note hook %s failed for doc %s", hook.__name__, doc.id)
            db.rollback()
            continue
        if out is not None:
            result = out
    return result


def check_refs(db: Session, author_id: int, machine_id: Optional[int]) -> None:
    """Raise NotFound for an unknown employee or machine (before storing any upload)."""
    if db.get(Employee, author_id) is None:
        raise NotFound(f"employee {author_id} not found")
    if machine_id is not None and db.get(Machine, machine_id) is None:
        raise NotFound(f"machine {machine_id} not found")


def _finish(
    db: Session, doc: Document, cards: List[ExtractedCard], transcript: Optional[str]
) -> VoiceNoteOut:
    rows = save_cards(db, cards, doc.id) if cards else []
    mode = "offline" if any(c.mode == "offline" for c in cards) else "live"
    return VoiceNoteOut(
        document_id=doc.id,
        transcript=transcript,
        language=doc.language,
        cards=[CardOut.model_validate(r) for r in rows],
        mode=mode,
        message=None if rows else "Saved. No know-how was found in this note.",
        guardian=on_note_saved(db, doc),
    )


def capture_text(db: Session, note: TextNoteIn) -> VoiceNoteOut:
    """Save a typed note and turn it into cards."""
    check_refs(db, note.author_id, note.machine_id)
    text = note.text.strip()
    if not text:
        raise ValidationFailed("note is empty")
    doc = Document(
        type="text",
        text=text,
        language=note.language,
        uploader_id=note.author_id,
        machine_id=note.machine_id,
    )
    db.add(doc)
    db.commit()  # the note is kept even if extraction fails later
    cards = extract_cards(text, note.author_id, note.machine_id)
    return _finish(db, doc, cards, transcript=None)


def capture_voice(
    db: Session,
    file: UploadFile,
    author_id: int,
    machine_id: Optional[int] = None,
    language: Optional[str] = None,
    consent: bool = True,
) -> VoiceNoteOut:
    """Save a voice note, transcribe it with Groq Whisper and turn it into cards.

    Without speech-to-text (no key / provider down) the recording is still stored and the
    response says so; nothing is invented from audio we could not read.
    """
    check_refs(db, author_id, machine_id)
    if not consent:
        raise ValidationFailed("recording needs the speaker's consent")
    path = save_upload(file, "audio")
    doc = Document(
        type="voice",
        file_path=str(path),
        language=language,
        uploader_id=author_id,
        machine_id=machine_id,
        consent=consent,
    )
    db.add(doc)
    db.commit()
    try:
        transcript = stt.transcribe(path, language)
    except ProviderUnavailable:
        logger.info("voice note %s saved without transcript (stt unavailable)", doc.id)
        return VoiceNoteOut(
            document_id=doc.id,
            language=language,
            mode="offline",
            message="Recording saved. Speech-to-text is not available right now, so no "
            "cards were made from it.",
        )
    doc.text = transcript.text
    doc.language = language or transcript.language
    db.commit()
    if not transcript.text:
        return _finish(db, doc, [], transcript="")
    cards = extract_cards(transcript.text, author_id, machine_id)
    return _finish(db, doc, cards, transcript=transcript.text)


def transcribe_only(file: UploadFile, language: Optional[str] = None) -> TranscriptOut:
    """Speech to text for a reply box: nothing is saved, the speaker edits and sends the text.

    Offline (no STT provider) returns empty text with mode "offline" so the UI asks to type.
    """
    path = save_upload(file, "audio")
    try:
        transcript = stt.transcribe(path, language)
    except ProviderUnavailable:
        return TranscriptOut(text="", language=language, mode="offline")
    finally:
        path.unlink(missing_ok=True)
    return TranscriptOut(text=transcript.text.strip(), language=language or transcript.language)
