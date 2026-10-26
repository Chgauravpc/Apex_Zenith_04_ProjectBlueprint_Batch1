"""Tests for the foundation layer: health route, error handlers, FTS search."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.database import build_match_query, fts_index, fts_search
from app.errors import NotFound, PayloadTooLarge, register_handlers


def test_health(client: TestClient) -> None:
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_app_errors_map_to_status_and_code() -> None:
    from fastapi import FastAPI

    app = FastAPI()
    register_handlers(app)

    @app.get("/missing")
    def missing() -> None:
        raise NotFound("machine 99 not found")

    @app.get("/big")
    def big() -> None:
        raise PayloadTooLarge("video over 100 MB")

    c = TestClient(app)
    r = c.get("/missing")
    assert r.status_code == 404
    assert r.json() == {"detail": "machine 99 not found", "code": "not_found"}
    assert c.get("/big").status_code == 413


def _seed(db: Session) -> None:
    fts_index(db, "card", 1, 3, "VMC-3 spindle chatter at 9000 rpm, reduced feed and it stopped")
    fts_index(db, "card", 2, 3, "Coolant nozzle blocked on VMC-3, cleaned it")
    fts_index(db, "card", 3, 2, "Lathe-2 chatter on long shaft, used tailstock")
    fts_index(db, "note", 4, 3, "स्पिंडल में आवाज़ आ रही है, फीड कम किया")
    db.commit()


def test_fts_search_ranks_and_filters(db: Session) -> None:
    _seed(db)
    hits = fts_search(db, "spindle chatter")
    assert hits[0][:2] == ("card", 1)  # matches both words, ranks first
    assert {h[1] for h in hits} == {1, 3}
    assert all(a[2] >= b[2] for a, b in zip(hits, hits[1:]))

    only_vmc = fts_search(db, "chatter", machine_id=3)
    assert [h[1] for h in only_vmc] == [1]


def test_fts_search_handles_hindi_words(db: Session) -> None:
    _seed(db)
    hits = fts_search(db, "आवाज़")
    assert [(h[0], h[1]) for h in hits] == [("note", 4)]


def test_fts_index_replaces_existing_text(db: Session) -> None:
    _seed(db)
    fts_index(db, "card", 2, 3, "Coolant pump replaced")
    db.commit()
    assert fts_search(db, "nozzle") == []
    assert [h[1] for h in fts_search(db, "pump")] == [2]


@pytest.mark.parametrize("query", ["", "   ", "***", '"', "-:()"])
def test_fts_search_ignores_empty_or_operator_only_queries(db: Session, query: str) -> None:
    _seed(db)
    assert fts_search(db, query) == []


def test_match_query_quotes_user_operators() -> None:
    assert build_match_query('chatter NEAR "spindle"') == '"chatter" OR "NEAR" OR "spindle"'
