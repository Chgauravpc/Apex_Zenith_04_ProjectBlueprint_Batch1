"""Multilingual sentence embeddings for semantic search (free providers only).

EMBEDDING_PROVIDER picks where vectors come from:
- `cloudflare`: BAAI bge-m3 on Cloudflare Workers AI (1024 dims). No torch, so it fits small
  hosts; the free plan allows 10,000 neurons a day (~9 billion tokens of bge-m3).
- `local`: intfloat/multilingual-e5-small via sentence-transformers (384 dims, needs torch).
- `off`: no vectors; search uses FTS only.
Vectors from different models cannot be compared, so `dim()` tells callers which stored
vectors belong to the current model; the others are ignored by search and re-embedded by
the backfill. Every vector is float32 with unit length (cosine = dot product).

If embeddings are off or the provider fails, `try_embed` returns None and search falls back
to FTS only (PLAN.md). After a Cloudflare failure the API is skipped for a short cool-down,
so an outage does not slow every search down.
"""

import logging
import os
import threading
import time
from typing import Any, Dict, List, Literal, Optional

import httpx
import numpy as np

from app.config import get_settings
from app.errors import ProviderUnavailable

logger = logging.getLogger(__name__)

LOCAL_MODEL = "intfloat/multilingual-e5-small"
CLOUDFLARE_MODEL = "@cf/baai/bge-m3"
DIMS: Dict[str, int] = {"local": 384, "cloudflare": 1024, "off": 384}
BATCH_SIZE = 32
Kind = Literal["passage", "query"]  # e5 needs these prefixes; bge-m3 does not

CLOUDFLARE_URL = "https://api.cloudflare.com/client/v4/accounts/{account}/ai/run/{model}"
CLOUD_TIMEOUT = httpx.Timeout(8.0, connect=3.0)
CLOUD_RETRIES = 2  # extra attempts after a 429, a 5xx or a timeout
RETRY_WAIT_SECONDS = (0.5, 1.0)
MAX_RETRY_AFTER_SECONDS = 2.0
COOLDOWN_SECONDS = 60.0
RETRYABLE_STATUS = (429, 500, 502, 503, 504)

_model: Optional[Any] = None
_load_failed = False
_lock = threading.Lock()
_client: Optional[httpx.Client] = None
_cloud_down_until = 0.0


def dim() -> int:
    """Vector length of the configured provider; stored vectors of another length are stale."""
    return DIMS[get_settings().embedding_provider]


def _get_model() -> Any:
    """Load the local model once (thread-safe); remember a failure so we do not retry per call."""
    global _model, _load_failed
    if _model is not None:
        return _model
    with _lock:
        if _model is None and not _load_failed:
            try:
                # We only use torch; a stray TensorFlow install can break the transformers import.
                os.environ.setdefault("USE_TF", "0")
                from sentence_transformers import SentenceTransformer

                _model = SentenceTransformer(LOCAL_MODEL, device="cpu")
                logger.info("embedding model %s loaded", LOCAL_MODEL)
            except Exception as exc:  # noqa: BLE001  any import/download error → FTS-only mode
                _load_failed = True
                logger.warning(
                    "embeddings unavailable (%s); search uses FTS only", type(exc).__name__
                )
    if _model is None:
        raise ProviderUnavailable("embedding model unavailable")
    return _model


def _http() -> httpx.Client:
    global _client
    if _client is None:
        _client = httpx.Client(timeout=CLOUD_TIMEOUT)
    return _client


def _retry_wait(attempt: int, response: Optional[httpx.Response]) -> float:
    header = response.headers.get("retry-after") if response is not None else None
    try:
        return min(float(header), MAX_RETRY_AFTER_SECONDS)
    except (TypeError, ValueError):
        return RETRY_WAIT_SECONDS[min(attempt, len(RETRY_WAIT_SECONDS) - 1)]


def _cloud_batch(texts: List[str], account: str, token: str) -> np.ndarray:
    """One Workers AI request; retries only errors that can pass on their own."""
    url = CLOUDFLARE_URL.format(account=account, model=CLOUDFLARE_MODEL)
    headers = {"Authorization": f"Bearer {token}"}
    reason = ""
    for attempt in range(CLOUD_RETRIES + 1):
        response: Optional[httpx.Response] = None
        try:
            response = _http().post(url, json={"text": texts}, headers=headers)
        except httpx.HTTPError as exc:  # timeout, connection reset, DNS ...
            reason = type(exc).__name__
        else:
            if response.status_code == 200:
                return _parse(response, len(texts))
            reason = f"HTTP {response.status_code}"
            if response.status_code not in RETRYABLE_STATUS:
                break  # bad token, wrong account, bad request: retrying will not help
        if attempt < CLOUD_RETRIES:
            time.sleep(_retry_wait(attempt, response))
    raise ProviderUnavailable(f"Cloudflare embeddings failed ({reason})")


def _parse(response: httpx.Response, n: int) -> np.ndarray:
    """Read `{"result": {"data": [[...], ...]}}` and insist on one 1024-dim row per text."""
    try:
        body = response.json()
        vectors = np.asarray(body["result"]["data"], dtype=np.float32)
    except (ValueError, KeyError, TypeError) as exc:  # not JSON, other shape, ragged rows
        raise ProviderUnavailable("Cloudflare returned an unexpected body") from exc
    if vectors.shape != (n, DIMS["cloudflare"]):
        raise ProviderUnavailable(f"Cloudflare returned vectors of shape {vectors.shape}")
    return vectors


def _embed_cloudflare(texts: List[str]) -> np.ndarray:
    global _cloud_down_until
    settings = get_settings()
    if not settings.cf_account_id or not settings.cf_api_token:
        raise ProviderUnavailable("CF_ACCOUNT_ID or CF_API_TOKEN is not set")
    if time.monotonic() < _cloud_down_until:
        raise ProviderUnavailable("Cloudflare embeddings are cooling down after a failure")
    try:
        vectors = np.vstack(
            [
                _cloud_batch(
                    texts[i : i + BATCH_SIZE], settings.cf_account_id, settings.cf_api_token
                )
                for i in range(0, len(texts), BATCH_SIZE)
            ]
        )
    except ProviderUnavailable:
        _cloud_down_until = time.monotonic() + COOLDOWN_SECONDS
        raise
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    if not np.all(norms > 0):
        raise ProviderUnavailable("Cloudflare returned an empty vector")
    return (vectors / norms).astype(np.float32)


def embed(texts: List[str], kind: Kind = "passage") -> np.ndarray:
    """Encode texts to an (n, dim()) float32 array with unit-length rows.

    Unit length means cosine similarity is a plain dot product later.

    Raises:
        ProviderUnavailable: embeddings are off, or the provider cannot be reached or loaded.
    """
    provider = get_settings().embedding_provider
    if not texts:
        return np.zeros((0, dim()), dtype=np.float32)
    if provider == "off":
        raise ProviderUnavailable("embeddings are turned off (EMBEDDING_PROVIDER=off)")
    if provider == "cloudflare":
        return _embed_cloudflare(texts)
    vectors = _get_model().encode(
        [f"{kind}: {t}" for t in texts],
        batch_size=BATCH_SIZE,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False,
    )
    return np.asarray(vectors, dtype=np.float32)


def try_embed(texts: List[str], kind: Kind = "passage") -> Optional[np.ndarray]:
    """Like `embed`, but returns None instead of raising when embeddings are unavailable."""
    try:
        return embed(texts, kind)
    except ProviderUnavailable as exc:
        logger.info("embeddings skipped: %s", exc)
        return None


def to_bytes(vector: np.ndarray) -> bytes:
    """Store one vector compactly (float32: 1.5 KB for e5, 4 KB for bge-m3)."""
    return np.asarray(vector, dtype=np.float32).tobytes()


def from_bytes(blob: bytes) -> np.ndarray:
    return np.frombuffer(blob, dtype=np.float32)
