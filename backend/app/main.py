"""FastAPI entry point: `uvicorn app.main:app`.

`create_app()` wires CORS, error handlers, the `/api` routes, uploaded media
and (when built) the React app from `frontend/dist`.
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import init_db
from app.errors import register_handlers
from app.routers import capture

logger = logging.getLogger(__name__)

FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Create tables and the FTS index once at startup."""
    init_db()
    yield


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

    storage = Path(settings.storage_dir)
    storage.mkdir(parents=True, exist_ok=True)
    app.mount("/media", StaticFiles(directory=storage), name="media")
    if FRONTEND_DIST.is_dir():
        app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
    return app


app = create_app()
