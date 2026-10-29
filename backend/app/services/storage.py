"""Where uploaded media lives: the local `storage_dir`, plus Supabase Storage when hosted.

Processing (OpenCV, speech-to-text, vision) always works on the local file. With
STORAGE_BACKEND=supabase every stored file is also uploaded to a private bucket under the
same key (`image/<uuid>.jpg`), because a free host's disk is wiped on restart. The
`/media/<key>` route serves the local copy when it is there and otherwise redirects to a
short-lived signed URL, so links stored in the database keep working after a restart.
"""

import logging
import mimetypes
import threading
import time
from pathlib import Path
from typing import Dict, Optional, Tuple
from urllib.parse import urlsplit

import httpx

from app.config import get_settings
from app.errors import NotFound, ProviderUnavailable

logger = logging.getLogger(__name__)

TIMEOUT = httpx.Timeout(60.0, connect=5.0)  # uploads can be tens of MB
RETRIES = 2  # extra attempts after a 429, a 5xx or a network error
RETRY_WAIT_SECONDS = (0.5, 1.5)
RETRYABLE_STATUS = (429, 500, 502, 503, 504)
SIGNED_URL_SECONDS = 3600
SIGNED_URL_REUSE_MARGIN = 300  # hand out a cached URL only while it has 5+ minutes left
MAX_CACHED_URLS = 1000

_client: Optional[httpx.Client] = None
_client_lock = threading.Lock()
_signed: Dict[str, Tuple[str, float]] = {}  # key -> (url, expires at, monotonic)
_signed_lock = threading.Lock()


def _root() -> Path:
    return Path(get_settings().storage_dir).resolve()


def key_for(path: Path) -> Optional[str]:
    """Storage key (`kind/name.ext`) of a file inside `storage_dir`, or None if outside it."""
    try:
        return Path(path).resolve().relative_to(_root()).as_posix()
    except ValueError:
        return None


def local_path(key: str) -> Path:
    """Local path for a key from a URL; refuses anything that would leave `storage_dir`.

    Raises:
        NotFound: empty, absolute or traversing key.
    """
    parts = key.split("/")
    if (
        not key
        or "\\" in key
        or key.startswith("/")
        or any(ord(ch) < 32 for ch in key)
        or any(p in ("", ".", "..") for p in parts)
    ):
        raise NotFound("media not found")
    try:
        path = (_root() / key).resolve()
    except (OSError, ValueError) as exc:  # names the OS cannot represent
        raise NotFound("media not found") from exc
    if key_for(path) != key:
        raise NotFound("media not found")
    return path


class StorageRequestFailed(ProviderUnavailable):
    """Supabase Storage refused or could not be reached; `status` is the HTTP code, if any."""

    def __init__(self, message: str, status: Optional[int] = None) -> None:
        super().__init__(message)
        self.status = status


def _http() -> httpx.Client:
    global _client
    with _client_lock:  # one shared connection pool, even when threads start together
        if _client is None:
            _client = httpx.Client(timeout=TIMEOUT)
        return _client


def _supabase() -> Tuple[str, str, str]:
    s = get_settings()
    if not s.supabase_url or not s.supabase_service_key:
        raise ProviderUnavailable("SUPABASE_URL or SUPABASE_SERVICE_KEY is not set")
    # Only scheme + host: the dashboard also shows ".../rest/v1/", which is easy to paste.
    parts = urlsplit(s.supabase_url)
    return f"{parts.scheme}://{parts.netloc}", s.supabase_service_key, s.supabase_bucket


def check_config() -> None:
    """Fail at startup, not on the first upload, when Supabase storage is half configured."""
    if get_settings().storage_backend == "supabase":
        _supabase()


def _request(method: str, url: str, key: str, **kwargs) -> httpx.Response:  # noqa: ANN003
    """Call Supabase Storage; retry only failures that can pass on their own."""
    _, service_key, _ = _supabase()
    headers = {"Authorization": f"Bearer {service_key}", "apikey": service_key}
    headers.update(kwargs.pop("headers", {}))
    body_path: Optional[Path] = kwargs.pop("body_path", None)
    reason, status = "", None
    for attempt in range(RETRIES + 1):
        try:
            if body_path is not None:
                with body_path.open("rb") as body:  # reopened per attempt: a stream reads once
                    response = _http().request(method, url, headers=headers, content=body)
            else:
                response = _http().request(method, url, headers=headers, **kwargs)
        except httpx.HTTPError as exc:
            reason = type(exc).__name__
        else:
            if response.status_code < 300:
                return response
            status = response.status_code
            reason = f"HTTP {status}"
            if response.status_code not in RETRYABLE_STATUS:
                break
        if attempt < RETRIES:
            time.sleep(RETRY_WAIT_SECONDS[min(attempt, len(RETRY_WAIT_SECONDS) - 1)])
    logger.warning("supabase storage %s %s failed: %s", method, key, reason)
    raise StorageRequestFailed(f"file storage unavailable ({reason})", status)


def persist(path: Path) -> None:
    """Copy a freshly written file to Supabase (no-op for local storage).

    Raises:
        ProviderUnavailable: the upload failed after retries; the caller decides what to keep.
        ValueError: `path` is not inside `storage_dir` (a programming error).
    """
    if get_settings().storage_backend != "supabase":
        return
    key = key_for(path)
    if key is None:
        raise ValueError(f"{path} is outside the storage folder")
    base, _, bucket = _supabase()
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    _request(
        "POST",
        f"{base}/storage/v1/object/{bucket}/{key}",
        key,
        headers={"Content-Type": mime, "x-upsert": "true"},
        body_path=path,
    )
    logger.info("stored %s in supabase (%d bytes)", key, path.stat().st_size)


def signed_url(key: str) -> str:
    """Short-lived URL for a private object; cached until it nearly expires.

    Raises:
        NotFound: local storage only, or the object does not exist.
        ProviderUnavailable: Supabase cannot be reached.
    """
    if get_settings().storage_backend != "supabase":
        raise NotFound("media not found")
    now = time.monotonic()
    with _signed_lock:
        cached = _signed.get(key)
    if cached and cached[1] - now > SIGNED_URL_REUSE_MARGIN:
        return cached[0]
    base, _, bucket = _supabase()
    try:
        response = _request(
            "POST",
            f"{base}/storage/v1/object/sign/{bucket}/{key}",
            key,
            json={"expiresIn": SIGNED_URL_SECONDS},
        )
    except StorageRequestFailed as exc:
        if exc.status in (400, 404):  # Supabase answers 400 or 404 for a missing object
            raise NotFound("media not found") from exc
        raise
    signed = response.json().get("signedURL")
    if not signed:
        raise ProviderUnavailable("file storage returned no signed URL")
    url = f"{base}/storage/v1{signed}"
    with _signed_lock:
        if len(_signed) >= MAX_CACHED_URLS:
            _signed.clear()
        _signed[key] = (url, now + SIGNED_URL_SECONDS)
    return url
