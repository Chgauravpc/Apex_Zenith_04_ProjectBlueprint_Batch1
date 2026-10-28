"""Local multilingual sentence embeddings (intfloat/multilingual-e5-small, 384 dims, free).

The model is loaded once per process (~120 MB RAM) and texts are encoded in batches.
If sentence-transformers cannot be loaded (not installed, broken dependency, no model
download), `try_embed` returns None and search falls back to FTS only (PLAN.md).
"""

import logging
import threading
from typing import Any, List, Literal, Optional

import numpy as np

from app.config import get_settings
from app.errors import ProviderUnavailable

logger = logging.getLogger(__name__)

MODEL_NAME = "intfloat/multilingual-e5-small"
DIM = 384
BATCH_SIZE = 32
Kind = Literal["passage", "query"]  # e5 models expect these prefixes

_model: Optional[Any] = None
_load_failed = False
_lock = threading.Lock()


def _get_model() -> Any:
    """Load the model once (thread-safe); remember a failure so we do not retry per call."""
    global _model, _load_failed
    if not get_settings().enable_embeddings:
        raise ProviderUnavailable("embeddings are turned off (ENABLE_EMBEDDINGS=false)")
    if _model is not None:
        return _model
    with _lock:
        if _model is None and not _load_failed:
            try:
                from sentence_transformers import SentenceTransformer

                _model = SentenceTransformer(MODEL_NAME, device="cpu")
                logger.info("embedding model %s loaded", MODEL_NAME)
            except Exception as exc:  # noqa: BLE001  any import/download error → FTS-only mode
                _load_failed = True
                logger.warning(
                    "embeddings unavailable (%s); search uses FTS only", type(exc).__name__
                )
    if _model is None:
        raise ProviderUnavailable("embedding model unavailable")
    return _model


def embed(texts: List[str], kind: Kind = "passage") -> np.ndarray:
    """Encode texts to an (n, 384) float32 array with unit-length rows.

    Unit length means cosine similarity is a plain dot product later.

    Raises:
        ProviderUnavailable: the model cannot be loaded.
    """
    if not texts:
        return np.zeros((0, DIM), dtype=np.float32)
    model = _get_model()
    vectors = model.encode(
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
    except ProviderUnavailable:
        return None


def to_bytes(vector: np.ndarray) -> bytes:
    """Store one vector compactly (384 × float32 = 1.5 KB)."""
    return np.asarray(vector, dtype=np.float32).tobytes()


def from_bytes(blob: bytes) -> np.ndarray:
    return np.frombuffer(blob, dtype=np.float32)
