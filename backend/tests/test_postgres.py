"""Checks that only real Postgres can answer (run: TEST_DATABASE_URL=... pytest -m postgres).

The rest of the suite also runs on Postgres when TEST_DATABASE_URL is set; these tests cover
what SQLite cannot: tsvector search, READ ONLY transactions and statement timeouts.
"""

from datetime import date

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import fts_index, fts_search, is_postgres
from app.errors import ValidationFailed
from app.services import embeddings
from app.services.ask import analytics
from tests.conftest import TEST_DATABASE_URL

pytestmark = pytest.mark.postgres


@pytest.fixture()
def pgdb(db: Session, monkeypatch: pytest.MonkeyPatch) -> Session:
    assert is_postgres(db), "set TEST_DATABASE_URL to run the postgres tests"
    monkeypatch.setattr(get_settings(), "database_url", TEST_DATABASE_URL)
    return db


@pytest.fixture()
def seeded(pgdb: Session, tmp_path, monkeypatch: pytest.MonkeyPatch) -> Session:
    from seed.seed import seed

    monkeypatch.setattr(get_settings(), "storage_dir", str(tmp_path / "store"))
    monkeypatch.setattr(embeddings, "try_embed", lambda texts, kind="passage": None)
    seed(pgdb, date.today())
    return pgdb


def test_index_is_a_tsvector_table_with_gin(pgdb: Session) -> None:
    kinds = pgdb.execute(
        text("SELECT indexdef FROM pg_indexes WHERE tablename = 'chunks_fts'")
    ).scalars()
    assert any("USING gin (tsv)" in k for k in kinds)


def test_hindi_and_marathi_words_match_whole_words(pgdb: Session) -> None:
    fts_index(pgdb, "note", 1, 3, "स्पिंडल में आवाज़ आ रही है, फीड कम किया")
    fts_index(pgdb, "note", 2, 1, "मशीनचा आवाज वाढला, कूलंट तपासला")
    fts_index(pgdb, "card", 3, 1, "Coolant nozzle blocked, cleaned it")
    pgdb.commit()
    assert [h[1] for h in fts_search(pgdb, "आवाज़")] == [1]
    assert [h[1] for h in fts_search(pgdb, "आवाज वाढला")] == [2]
    assert fts_search(pgdb, "आव") == []  # no prefix matches, same as FTS5
    assert [h[1] for h in fts_search(pgdb, "COOLANT", machine_id=1)] == [3]
    assert fts_search(pgdb, "coolant", machine_id=3) == []


def test_better_matches_rank_higher(pgdb: Session) -> None:
    fts_index(pgdb, "card", 1, 3, "spindle chatter at 9000 rpm, reduced feed and chatter stopped")
    fts_index(pgdb, "card", 2, 3, "chatter on long shaft")
    fts_index(pgdb, "card", 3, 3, "coolant nozzle")
    pgdb.commit()
    hits = fts_search(pgdb, "spindle chatter")
    assert [h[1] for h in hits] == [1, 2]
    assert hits[0][2] > hits[1][2] > 0


def test_reindex_replaces_text_instead_of_duplicating(pgdb: Session) -> None:
    fts_index(pgdb, "card", 7, 3, "Coolant nozzle blocked")
    fts_index(pgdb, "card", 7, 3, "Coolant pump replaced")
    pgdb.commit()
    assert fts_search(pgdb, "nozzle") == []
    assert pgdb.execute(text("SELECT count(*) FROM chunks_fts")).scalar_one() == 1


def test_analytics_runs_on_postgres(seeded: Session) -> None:
    columns, rows, truncated = analytics.run_sql(
        "SELECT m.name, COUNT(*) AS n FROM maintenance t JOIN machines m ON m.id = t.machine_id "
        "WHERE t.kind = 'breakdown' GROUP BY m.name ORDER BY n DESC"
    )
    assert columns == ["name", "n"] and rows[0] == ["VMC-3", 5] and not truncated


def test_offline_analytics_sql_is_valid_postgres(seeded: Session, fake_llm) -> None:
    from app.schemas.ask import AnalyticsRequest

    out = analytics.run_analytics(seeded, AnalyticsRequest(question="rejects on VMC-3 last month"))
    assert out.mode == "offline" and out.rows and out.rows[0][0] is not None


def test_analytics_transaction_is_read_only_past_the_guard(seeded: Session) -> None:
    # nextval() passes the keyword guard but writes; the READ ONLY transaction must refuse it.
    with pytest.raises(ValidationFailed, match="read-only transaction"):
        analytics.run_sql("SELECT nextval('machines_id_seq')")


def test_analytics_long_query_is_cancelled(seeded: Session) -> None:
    with pytest.raises(ValidationFailed, match="too long"):
        analytics.run_sql("SELECT count(*) FROM generate_series(1, 2000000000)")
