"""Shared pytest fixtures.

Everything here is real (SQLite, FastAPI app, FTS5) except `fake_llm`, which
replaces only the network boundary to Groq/OpenRouter so tests stay offline
and deterministic.
"""

from typing import Any, Dict, Iterator, List, Tuple, Type, Union

import pytest
from fastapi.testclient import TestClient
from pydantic import BaseModel
from sqlalchemy.orm import Session, sessionmaker

from app.database import get_db, init_db, make_engine
from app.errors import ProviderUnavailable
from app.main import create_app


@pytest.fixture()
def db() -> Iterator[Session]:
    """Fresh in-memory database with all tables and the FTS index."""
    engine = make_engine("sqlite://")
    init_db(bind=engine)
    session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)()
    try:
        yield session
    finally:
        session.close()
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
