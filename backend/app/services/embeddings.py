"""Multilingual sentence embeddings (intfloat/multilingual-e5-small, 384 dims, free).

Two interchangeable providers, picked by EMBEDDING_PROVIDER:
- `local`: sentence-transformers in this process (~120 MB model, needs torch). Loaded once.
- `cloud`: the same model on the Hugging Face Inference API, for hosts too small for torch.
Both add the e5 `query:`/`passage:` prefixes and return unit-length float32 rows, so vectors
from either provider can be compared with each other.

If embeddings are off or the provider fails, `try_embed` returns None and search falls back
to FTS only (PLAN.md). After a cloud failure the API is skipped for a short cool-down, so a
Hugging Face outage does not slow every search down.
"""

import logging
import os
import threading
import time
from typing import Any, List, Literal, Optional

import httpx
import numpy as np

from app.config import get_settings
from app.errors import ProviderUnavailable

logger = logging.getLogger(__name__)

DIM = 384
BATCH_SIZE = 32
Kind = Literal["passage", "query"]  # e5 models expect these prefixes

HF_URL = "https://router.huggingface.co/hf-inference/models/{model}/pipeline/feature-extraction"
CLOUD_TIMEOUT = httpx.Timeout(5.0, connect=3.0)
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

                name = get_settings().embedding_model
                _model = SentenceTransformer(name, device="cpu")
                logger.info("embedding model %s loaded", name)
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


def _cloud_batch(texts: List[str], token: str) -> np.ndarray:
    """One feature-extraction request; retries only errors that can pass on their own."""
    url = HF_URL.format(model=get_settings().embedding_model)
    headers = {"Authorization": f"Bearer {token}", "x-wait-for-model": "true"}
    reason = ""
    for attempt in range(CLOUD_RETRIES + 1):
        response: Optional[httpx.Response] = None
        try:
            response = _http().post(url, json={"inputs": texts}, headers=headers)
        except httpx.HTTPError as exc:  # timeout, connection reset, DNS ...
            reason = type(exc).__name__
        else:
            if response.status_code == 200:
                return _parse(response, len(texts))
            reason = f"HTTP {response.status_code}"
            if response.status_code not in RETRYABLE_STATUS:
                break  # bad token, unknown model, bad request: retrying will not help
        if attempt < CLOUD_RETRIES:
            time.sleep(_retry_wait(attempt, response))
    raise ProviderUnavailable(f"Hugging Face embeddings failed ({reason})")


def _parse(response: httpx.Response, n: int) -> np.ndarray:
    try:
        vectors = np.asarray(response.json(), dtype=np.float32)
    except ValueError as exc:  # not JSON, or ragged (per-token) output
        raise ProviderUnavailable("Hugging Face returned an unexpected body") from exc
    if vectors.shape != (n, DIM):
        raise ProviderUnavailable(f"Hugging Face returned vectors of shape {vectors.shape}")
    return vectors


def _embed_cloud(texts: List[str]) -> np.ndarray:
    global _cloud_down_until
    token = get_settings().hf_api_token
    if not token:
        raise ProviderUnavailable("HF_API_TOKEN is not set")
    if time.monotonic() < _cloud_down_until:
        raise ProviderUnavailable("Hugging Face embeddings are cooling down after a failure")
    try:
        vectors = np.vstack(
            [
                _cloud_batch(texts[i : i + BATCH_SIZE], token)
                for i in range(0, len(texts), BATCH_SIZE)
            ]
        )
    except ProviderUnavailable:
        _cloud_down_until = time.monotonic() + COOLDOWN_SECONDS
        raise
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    if not np.all(norms > 0):
        raise ProviderUnavailable("Hugging Face returned an empty vector")
    return (vectors / norms).astype(np.float32)


def embed(texts: List[str], kind: Kind = "passage") -> np.ndarray:
    """Encode texts to an (n, 384) float32 array with unit-length rows.

    Unit length means cosine similarity is a plain dot product later.

    Raises:
        ProviderUnavailable: embeddings are off, or the provider cannot be reached or loaded.
    """
    if not texts:
        return np.zeros((0, DIM), dtype=np.float32)
    provider = get_settings().embedding_provider
    if provider == "off":
        raise ProviderUnavailable("embeddings are turned off (EMBEDDING_PROVIDER=off)")
    prefixed = [f"{kind}: {t}" for t in texts]
    if provider == "cloud":
        return _embed_cloud(prefixed)
    vectors = _get_model().encode(
        prefixed,
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
    """Store one vector compactly (384 × float32 = 1.5 KB)."""
    return np.asarray(vector, dtype=np.float32).tobytes()


def from_bytes(blob: bytes) -> np.ndarray:
    return np.frombuffer(blob, dtype=np.float32)
