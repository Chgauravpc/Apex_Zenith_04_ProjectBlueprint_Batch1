"""Text-to-speech with edge-tts (free Microsoft neural voices, no key), cached on disk.

Used to read steps and answers aloud on the shop floor in Hindi, Marathi or English.
If the service is unreachable the frontend falls back to the browser's speechSynthesis.
"""

import asyncio
import hashlib
import logging
from pathlib import Path

import aiohttp
import edge_tts

from app.config import get_settings
from app.errors import ProviderUnavailable, ValidationFailed

logger = logging.getLogger(__name__)

VOICES = {
    "hi": "hi-IN-SwaraNeural",
    "mr": "mr-IN-AarohiNeural",
    "en": "en-IN-NeerjaNeural",
}
MAX_CHARS = 2000  # one step or one answer; longer text should be split by the caller
CONNECT_TIMEOUT_SECONDS = 10
RECEIVE_TIMEOUT_SECONDS = 30


def _cache_path(text: str, voice: str) -> Path:
    digest = hashlib.sha256(f"{voice}|{text}".encode()).hexdigest()
    return Path(get_settings().storage_dir) / "tts" / f"{digest}.mp3"


async def _save(text: str, voice: str, dest: Path) -> None:
    communicate = edge_tts.Communicate(
        text,
        voice,
        connect_timeout=CONNECT_TIMEOUT_SECONDS,
        receive_timeout=RECEIVE_TIMEOUT_SECONDS,
    )
    await communicate.save(str(dest))


def synthesize(text: str, language: str) -> Path:
    """Return an MP3 of `text` spoken in `language`, generating it only once.

    Must run in a worker thread (sync FastAPI endpoint), not inside the event loop.

    Raises:
        ValidationFailed: empty/too long text or unsupported language.
        ProviderUnavailable: edge-tts could not be reached.
    """
    text = text.strip()
    if not text or len(text) > MAX_CHARS:
        raise ValidationFailed(f"text must be 1-{MAX_CHARS} characters")
    if language not in VOICES:
        raise ValidationFailed(f"language must be one of {sorted(VOICES)}")
    voice = VOICES[language]
    dest = _cache_path(text, voice)
    if dest.is_file() and dest.stat().st_size > 0:
        return dest

    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(".part")  # never leave a half-written file at the cache path
    try:
        asyncio.run(_save(text, voice, tmp))
    except (
        edge_tts.exceptions.EdgeTTSException,
        aiohttp.ClientError,
        OSError,
        asyncio.TimeoutError,
    ) as exc:
        tmp.unlink(missing_ok=True)
        logger.warning("tts failed: %s", type(exc).__name__)
        raise ProviderUnavailable("text-to-speech service unavailable") from exc
    if not tmp.is_file() or tmp.stat().st_size == 0:
        tmp.unlink(missing_ok=True)
        raise ProviderUnavailable("text-to-speech returned no audio")
    tmp.replace(dest)
    logger.info("tts voice=%s chars=%d", voice, len(text))
    return dest
