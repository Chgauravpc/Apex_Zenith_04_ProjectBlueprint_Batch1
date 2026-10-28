"""FastAPI entry point: `uvicorn app.main:app`.

`create_app()` wires CORS, error handlers, the `/api` routes, uploaded media
and (when built) the React app from `frontend/dist`.
"""

import logging
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import SessionLocal, init_db
from app.errors import register_handlers
from app.routers import ask, capture, erp, guardian, guide, machines, reports, transfer
from app.services.capture import erp_sync, extractor, voice
from app.services.guardian import check
from app.services.transfer import handover

logger = logging.getLogger(__name__)

FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Create tables and the FTS index once at startup, then fill missing card vectors."""
    init_db()
    if get_settings().embedding_provider != "off":
        worker = threading.Thread(target=_backfill_embeddings, name="embedding-backfill")
        worker.daemon = True
        worker.start()
    yield


def _backfill_embeddings() -> None:
    """Give vectors to cards saved while embeddings were down (background, never blocks startup)."""
    try:
        with SessionLocal() as db:
            extractor.backfill_embeddings(db)
    except Exception:  # noqa: BLE001  a failed backfill must not take the API down
        logger.exception("embedding backfill failed")


def create_app() -> FastAPI:
    """Build the application. Kept as a factory so tests get a fresh instance."""
    settings = get_settings()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

    app = FastAPI(title="Project Blueprint", version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_handlers(app)

    @app.get("/api/health", tags=["meta"])
    def health() -> Dict[str, str]:
        """Liveness check used by the frontend and the demo tunnel."""
        return {"status": "ok"}

    app.include_router(capture.router, prefix="/api")
    app.include_router(capture.jobs_router, prefix="/api")
    app.include_router(erp.router, prefix="/api")
    app.include_router(machines.router, prefix="/api")
    app.include_router(guardian.router, prefix="/api")
    app.include_router(ask.router, prefix="/api")
    app.include_router(transfer.router, prefix="/api")
    app.include_router(reports.router, prefix="/api")
    app.include_router(guide.router, prefix="/api")
    # Every captured note is checked by Note Guardian (idempotent across app instances).
    if check.note_saved_hook not in voice.NOTE_SAVED_HOOKS:
        voice.NOTE_SAVED_HOOKS.append(check.note_saved_hook)
    # An exit date from the ERP starts the old employee's handover plan.
    if handover.exit_date_hook not in erp_sync.EXIT_DATE_HOOKS:
        erp_sync.EXIT_DATE_HOOKS.append(handover.exit_date_hook)

    storage = Path(settings.storage_dir)
    storage.mkdir(parents=True, exist_ok=True)
    app.mount("/media", StaticFiles(directory=storage), name="media")
    if FRONTEND_DIST.is_dir():
        app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
    return app


app = create_app()
