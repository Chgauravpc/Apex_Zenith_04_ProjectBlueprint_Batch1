"""Shared pytest fixtures.

Everything here is real (SQLite, FastAPI app, FTS5) except `fake_llm`, which
replaces only the network boundary to Groq/OpenRouter so tests stay offline
and deterministic.
"""

import os
from typing import Any, Dict, Iterator, List, Tuple, Type, Union

import pytest
from fastapi.testclient import TestClient
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base, get_db, init_db, make_engine
from app.errors import ProviderUnavailable
from app.main import create_app

# Optional: run the suite on Postgres, e.g. TEST_DATABASE_URL=postgresql://user:pw@localhost/db.
# Every table is dropped and recreated there, so never point it at a database you care about.
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")


@pytest.fixture(autouse=True)
def _no_real_provider_keys(request: pytest.FixtureRequest, monkeypatch: pytest.MonkeyPatch) -> None:
    """Unit tests never reach Groq/OpenRouter, even when backend/.env holds real keys.

    Tests marked `live` keep the real keys; tests that need a key set a fake one themselves.
    """
    if request.node.get_closest_marker("live") is None:
        from app.config import get_settings

        monkeypatch.setattr(get_settings(), "groq_api_key", None)
        monkeypatch.setattr(get_settings(), "openrouter_api_key", None)


@pytest.fixture(scope="session")
def pg_engine() -> Iterator[Engine]:
    """Postgres engine for TEST_DATABASE_URL with a freshly created schema."""
    if not TEST_DATABASE_URL:
        raise RuntimeError("set TEST_DATABASE_URL to a throwaway Postgres database")
    import app.models  # noqa: F401  (registers every model on Base.metadata)

    engine = make_engine(TEST_DATABASE_URL)
    with engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS chunks_fts"))
    Base.metadata.drop_all(bind=engine)
    init_db(bind=engine)
    yield engine
    engine.dispose()


def _empty_postgres(engine: Engine) -> None:
    tables = ", ".join(t.name for t in Base.metadata.sorted_tables)
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE {tables}, chunks_fts RESTART IDENTITY CASCADE"))


@pytest.fixture()
def db(request: pytest.FixtureRequest) -> Iterator[Session]:
    """Fresh database with all tables and the FTS index (in-memory SQLite by default)."""
    if TEST_DATABASE_URL:
        engine = request.getfixturevalue("pg_engine")
        _empty_postgres(engine)
    else:
        engine = make_engine("sqlite://")
        init_db(bind=engine)
    session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)()
    try:
        yield session
    finally:
        session.close()
        if not TEST_DATABASE_URL:
            engine.dispose()


@pytest.fixture()
def client(db: Session) -> Iterator[TestClient]:
    """TestClient whose requests share the `db` fixture session."""
    app = create_app()
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.clear()


class FakeLLM:
    """Stands in for llm.chat_json / llm.vision_json in tests.

    Set `responses[task]` to a Pydantic object (returned) or an exception
    (raised). Unset tasks raise ProviderUnavailable, like having no API keys.
    """

    def __init__(self) -> None:
        self.responses: Dict[str, Union[BaseModel, Exception]] = {}
        self.calls: List[Tuple[str, str]] = []

    def _reply(self, task: str, prompt: str, schema: Type[BaseModel]) -> Any:
        self.calls.append((task, prompt))
        reply = self.responses.get(task)
        if reply is None:
            raise ProviderUnavailable(f"no fake response for task '{task}'")
        if isinstance(reply, Exception):
            raise reply
        return schema.model_validate(reply.model_dump())

    def chat_json(self, task: str, system: str, user: str, schema: Type[BaseModel]) -> Any:
        return self._reply(task, user, schema)

    def vision_json(
        self, task: str, images: List[bytes], prompt: str, schema: Type[BaseModel]
    ) -> Any:
        return self._reply(task, prompt, schema)


@pytest.fixture()
def fake_llm(monkeypatch: pytest.MonkeyPatch) -> FakeLLM:
    """Patch the LLM entry points with a FakeLLM for the duration of a test."""
    fake = FakeLLM()
    monkeypatch.setattr("app.services.llm.chat_json", fake.chat_json, raising=False)
    monkeypatch.setattr("app.services.llm.vision_json", fake.vision_json, raising=False)
    return fake
