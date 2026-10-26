"""Speech-to-text with Groq Whisper (free tier), cached by audio hash.

Groq accepts wav/mp3/m4a/webm/mp4 up to 25 MB directly, so no ffmpeg step is needed.
Hindi, Marathi and English (and code-mixed speech) are handled by whisper-large-v3.
"""

import hashlib
import logging
import time
from pathlib import Path
from typing import Any, List, Optional

import openai
from pydantic import BaseModel

from app.config import get_settings
from app.errors import ProviderUnavailable, ValidationFailed
from app.models.ops import LLMCache
from app.services import llm

logger = logging.getLogger(__name__)

SUPPORTED_LANGUAGES = frozenset({"hi", "mr", "en"})
HASH_CHUNK_BYTES = 1024 * 1024


class Segment(BaseModel):
    start: float  # seconds
    end: float
    text: str


class Transcript(BaseModel):
    text: str
    language: Optional[str] = None
    segments: List[Segment] = []


def _file_sha256(path: Path) -> str:
    """Hash the file in chunks (O(1) memory)."""
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(HASH_CHUNK_BYTES), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _field(obj: Any, name: str, default: Any = None) -> Any:
    """Read a field from an SDK object or a plain dict (providers differ)."""
    if isinstance(obj, dict):
        return obj.get(name, default)
    return getattr(obj, name, default)


def _to_transcript(resp: Any, language: Optional[str]) -> Transcript:
    segments = [
        Segment(
            start=float(_field(s, "start", 0)),
            end=float(_field(s, "end", 0)),
            text=str(_field(s, "text", "")).strip(),
        )
        for s in (_field(resp, "segments") or [])
    ]
    return Transcript(
        text=str(_field(resp, "text", "")).strip(),
        language=_field(resp, "language") or language,
        segments=segments,
    )


def transcribe(path: Path, language: Optional[str] = None) -> Transcript:
    """Transcribe an audio or video file.

    Args:
        path: stored upload (see utils.files.save_upload).
        language: "hi", "mr" or "en" to force a language; None lets Whisper detect it.

    Returns:
        Transcript with full text and timestamped segments (used to align video steps).

    Raises:
        ValidationFailed: unsupported language or missing file.
        ProviderUnavailable: no Groq key or the API call failed.
    """
    if language is not None and language not in SUPPORTED_LANGUAGES:
        raise ValidationFailed(f"language must be one of {sorted(SUPPORTED_LANGUAGES)}")
    if not path.is_file():
        raise ValidationFailed("audio file not found")
    settings = get_settings()
    if not settings.groq_api_key:
        raise ProviderUnavailable("GROQ_API_KEY is not set; speech-to-text needs it")

    key = hashlib.sha256(
        f"stt|{settings.model_stt}|{language}|{_file_sha256(path)}".encode()
    ).hexdigest()
    with llm.session_factory() as db:
        cached = db.get(LLMCache, key)
        if cached is not None:
            logger.info("stt cache_hit=true")
            return Transcript.model_validate_json(cached.value)

    client = llm._client(llm.GROQ, settings.groq_api_key)
    start = time.perf_counter()
    kwargs = {"model": settings.model_stt, "response_format": "verbose_json"}
    if language:
        kwargs["language"] = language
    try:
        with path.open("rb") as fh:
            resp = client.audio.transcriptions.create(file=(path.name, fh), **kwargs)
    except openai.OpenAIError as exc:
        logger.warning("stt failed: %s", type(exc).__name__)
        raise ProviderUnavailable("speech-to-text failed") from exc
    logger.info(
        "stt model=%s latency_ms=%d", settings.model_stt, (time.perf_counter() - start) * 1000
    )

    transcript = _to_transcript(resp, language)
    with llm.session_factory() as db:
        db.merge(LLMCache(key=key, model=settings.model_stt, value=transcript.model_dump_json()))
        db.commit()
    return transcript
