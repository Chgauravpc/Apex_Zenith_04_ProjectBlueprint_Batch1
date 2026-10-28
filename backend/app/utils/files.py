"""Safe, streamed saving of uploaded files.

Uploads are copied to disk in 1 MB chunks (O(1) memory), checked by MIME type
and extension, capped by size per kind, and stored under a server-generated
name so a client can never pick the path (no traversal, no overwrite).
"""

import logging
from pathlib import Path
from typing import BinaryIO, Dict, FrozenSet, Literal, Optional
from uuid import uuid4

from fastapi import UploadFile

from app.config import get_settings
from app.errors import PayloadTooLarge, ProviderUnavailable, ValidationFailed
from app.services import storage

logger = logging.getLogger(__name__)

Kind = Literal["audio", "image", "video"]

CHUNK_BYTES = 1024 * 1024
MB = 1024 * 1024
# Video: Supabase's free plan stores at most 50 MB per file.
MAX_BYTES: Dict[str, int] = {"audio": 25 * MB, "image": 10 * MB, "video": 50 * MB}

ALLOWED_EXT: Dict[str, FrozenSet[str]] = {
    "audio": frozenset({".wav", ".mp3", ".m4a", ".webm", ".ogg", ".mp4", ".flac"}),
    "image": frozenset({".jpg", ".jpeg", ".png", ".webp"}),
    "video": frozenset({".mp4", ".webm", ".mov", ".3gp"}),
}
# Browsers record audio as "video/webm" or "audio/webm;codecs=opus"; both are fine for audio.
ALLOWED_MIME_PREFIX: Dict[str, FrozenSet[str]] = {
    "audio": frozenset({"audio/", "video/webm", "video/mp4"}),
    "image": frozenset({"image/"}),
    "video": frozenset({"video/"}),
}
# Extension to use when the client sends no usable file name (e.g. a recorder "blob").
EXT_FOR_MIME: Dict[str, str] = {
    "audio/webm": ".webm",
    "video/webm": ".webm",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
    "audio/ogg": ".ogg",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def _base_mime(content_type: Optional[str]) -> str:
    return (content_type or "").split(";")[0].strip().lower()


def _extension(filename: Optional[str], mime: str, kind: str) -> str:
    ext = Path(filename or "").suffix.lower()
    if not ext:
        ext = EXT_FOR_MIME.get(mime, "")
    if ext not in ALLOWED_EXT[kind]:
        raise ValidationFailed(f"file type '{ext or mime}' is not allowed for {kind}")
    return ext


def _copy_limited(src: BinaryIO, dest: Path, limit: int) -> int:
    """Copy in CHUNK_BYTES pieces; delete the partial file and raise if over `limit`."""
    written = 0
    with dest.open("wb") as out:
        while True:
            chunk = src.read(CHUNK_BYTES)
            if not chunk:
                break
            written += len(chunk)
            if written > limit:
                break
            out.write(chunk)
    if written > limit:
        dest.unlink(missing_ok=True)
        raise PayloadTooLarge(f"file is larger than {limit // MB} MB")
    if written == 0:
        dest.unlink(missing_ok=True)
        raise ValidationFailed("file is empty")
    return written


def save_upload(file: UploadFile, kind: Kind) -> Path:
    """Validate and store an upload under `<storage_dir>/<kind>/<uuid><ext>`.

    Args:
        file: FastAPI upload (spooled to a temp file by Starlette).
        kind: "audio", "image" or "video"; decides allowed types and the size cap.

    Returns:
        Path of the stored file.

    Raises:
        ValidationFailed: wrong MIME type or extension, or empty file.
        PayloadTooLarge: larger than MAX_BYTES[kind].
        ProviderUnavailable: hosted file storage refused it (the local copy is removed too).

    Complexity: O(size) time, O(1) memory.
    """
    if kind not in MAX_BYTES:
        raise ValidationFailed(f"unknown upload kind '{kind}'")
    mime = _base_mime(file.content_type)
    if not any(mime.startswith(p) for p in ALLOWED_MIME_PREFIX[kind]):
        raise ValidationFailed(f"content type '{mime or 'missing'}' is not allowed for {kind}")
    ext = _extension(file.filename, mime, kind)

    folder = Path(get_settings().storage_dir) / kind
    folder.mkdir(parents=True, exist_ok=True)
    dest = folder / f"{uuid4().hex}{ext}"
    size = _copy_limited(file.file, dest, MAX_BYTES[kind])
    try:
        storage.persist(dest)
    except ProviderUnavailable:
        dest.unlink(missing_ok=True)  # a file that vanishes on the next restart is worse
        raise
    logger.info("saved %s upload %s (%d bytes)", kind, dest.name, size)
    return dest
