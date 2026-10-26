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


def test_core_tables_created_and_linked(db: Session) -> None:
    from sqlalchemy import inspect, select

    from app.models.erp import ROLE_OLD, Employee, Machine
    from app.models.knowledge import KnowledgeCard
    from app.models.map3d import Component

    tables = set(inspect(db.get_bind()).get_table_names())
    assert {"machines", "employees", "knowledge_cards", "components", "chunks_fts"} <= tables

    vmc = Machine(name="VMC-3", type="VMC", rpm_min=500, rpm_max=12000, teeth=2)
    ramesh = Employee(name="Ramesh", role=ROLE_OLD)
    db.add_all([vmc, ramesh])
    db.flush()
    spindle = Component(
        machine_id=vmc.id, mesh_name="spindle", display_name="Spindle", aliases=["spindle", "स्पिंडल"]
    )
    db.add(spindle)
    db.flush()
    db.add(
        KnowledgeCard(
            title="Chatter fix",
            machine_id=vmc.id,
            component_id=spindle.id,
            symptom="chatter",
            action="Drop feed to 0.15",
            author_id=ramesh.id,
            params={"feed": 0.15},
        )
    )
    db.commit()

    card = db.execute(select(KnowledgeCard)).scalar_one()
    assert card.params == {"feed": 0.15} and card.created_at is not None
    assert db.get(Component, spindle.id).aliases[1] == "स्पिंडल"


def test_guardian_and_ops_tables(db: Session) -> None:
    from app.models.erp import Machine
    from app.models.guardian import FailurePrecursor, Warning
    from app.models.knowledge import Document
    from app.models.ops import Job, LLMCache

    vmc = Machine(name="VMC-3", type="VMC", rpm_max=12000)
    note = Document(type="text", text="VMC-3 slight chatter")
    db.add_all([vmc, note])
    db.flush()
    db.add(
        FailurePrecursor(
            machine_id=vmc.id,
            symptom="chatter",
            failure_kind="spindle failure",
            preceded_count=3,
            total_failures=4,
            evidence_ids=[1, 2, 3],
        )
    )
    db.add(
        Warning(
            note_id=note.id,
            machine_id=vmc.id,
            severity="stop",
            message="Chatter",
            evidence=[{"type": "maintenance", "id": 1}],
        )
    )
    job = Job(kind="video")
    db.add_all([job, LLMCache(key="a" * 64, model="m", value="{}")])
    db.commit()

    assert len(job.id) == 32 and job.status == "queued"
    assert db.get(Warning, 1).evidence == [{"type": "maintenance", "id": 1}]
