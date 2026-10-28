"""Reports (footnoted HTML) and read-only analytics on a real SQLite file."""

import sqlite3
from datetime import date

import pytest
from sqlalchemy.orm import sessionmaker

from app.config import get_settings
from app.database import init_db, make_engine
from app.errors import ValidationFailed
from app.models.knowledge import KnowledgeCard
from app.schemas.ask import AnalyticsRequest
from app.services import embeddings
from app.services.ask import analytics, reports


@pytest.fixture()
def filedb(tmp_path, monkeypatch):
    """Seeded SQLite FILE (analytics opens its own read-only connection to it)."""
    from seed.seed import seed

    path = tmp_path / "bp.db"
    monkeypatch.setattr(get_settings(), "database_url", f"sqlite:///{path.as_posix()}")
    monkeypatch.setattr(get_settings(), "storage_dir", str(tmp_path / "store"))
    monkeypatch.setattr(embeddings, "try_embed", lambda texts, kind="passage": None)
    engine = make_engine(f"sqlite:///{path.as_posix()}")
    init_db(bind=engine)
    db = sessionmaker(bind=engine, expire_on_commit=False)()
    seed(db, date.today())
    yield db
    db.close()
    engine.dispose()


@pytest.mark.parametrize(
    "sql",
    [
        "DROP TABLE machines",
        "SELECT 1; DROP TABLE machines",
        "SELECT * FROM machines; SELECT 1",
        "DELETE FROM machines",
        "UPDATE machines SET name='x'",
        "SELECT * FROM machines -- sneaky",
        "ATTACH DATABASE 'x.db' AS x",
        "PRAGMA table_info(machines)",
        "SELECT pg_sleep(5)",
        "SELECT set_config('default_transaction_read_only', 'off', false)",
        "SELECT lo_import('/etc/passwd')",
        "",
    ],
)
def test_unsafe_sql_is_rejected(sql) -> None:
    with pytest.raises(ValidationFailed):
        analytics.validate_sql(sql)


def test_readonly_connection_blocks_writes_even_past_the_guard(filedb) -> None:
    conn = analytics._readonly_connection()
    with pytest.raises(sqlite3.OperationalError):
        conn.execute("DELETE FROM machines")
    conn.close()


def test_run_sql_limits_rows(filedb, monkeypatch) -> None:
    monkeypatch.setattr(analytics, "ROW_LIMIT", 5)
    columns, rows, truncated = analytics.run_sql("SELECT id, title FROM knowledge_cards")
    assert columns == ["id", "title"] and len(rows) == 5 and truncated


@pytest.mark.parametrize(
    "question,expected",
    [
        ("How many rejects on VMC-3?", [[34]]),  # 6 + 9 + 12 + 4 + 3 seeded parts
        ("How many breakdowns on VMC-3?", [[5]]),
    ],
)
def test_offline_counts_match_the_seed(filedb, fake_llm, question, expected) -> None:
    out = analytics.run_analytics(filedb, AnalyticsRequest(question=question))
    assert out.mode == "offline" and out.rows == expected and "VMC-3" in out.explanation


def test_offline_breakdowns_per_machine_and_defects(filedb, fake_llm) -> None:
    per = analytics.run_analytics(filedb, AnalyticsRequest(question="breakdowns per machine"))
    assert per.rows[0] == ["VMC-3", 5] and per.chart == "bar"
    defects = analytics.run_analytics(
        filedb, AnalyticsRequest(question="top reject defects on VMC-3")
    )
    assert defects.rows[0] == ["chatter marks", 27]


def test_llm_sql_is_still_guarded(filedb, fake_llm) -> None:
    from app.schemas.ask import AnalyticsLLM

    fake_llm.responses["query"] = AnalyticsLLM(sql="DROP TABLE machines")
    with pytest.raises(ValidationFailed):
        analytics.run_analytics(filedb, AnalyticsRequest(question="delete everything"))
    fake_llm.responses["query"] = AnalyticsLLM(
        sql="SELECT COUNT(*) AS n FROM warnings", explanation="Warnings so far"
    )
    assert analytics.run_analytics(filedb, AnalyticsRequest(question="warnings?")).mode == "live"


def test_unknown_question_offline_explains_limits(filedb, fake_llm) -> None:
    with pytest.raises(ValidationFailed):
        analytics.run_analytics(filedb, AnalyticsRequest(question="what is the weather"))


def test_handbook_has_footnoted_sources(filedb) -> None:
    html = reports.render_handbook(filedb, 1)
    assert "VMC-3 — handbook for new employees" in html
    assert "<sup>[1]</sup>" in html and "Card #" in html and "Ramesh Patil" in html
    assert "Spindle" in html and "feed" in html and "critical" in html
    cited = html.count("<sup>[")
    listed = html.split("<h2>Sources</h2>")[1].count("<li>")
    assert cited == listed > 10  # every tip has exactly one source line


def test_handbook_escapes_card_text(filedb) -> None:
    card = filedb.query(KnowledgeCard).first()
    card.title = "<script>alert(1)</script>"
    filedb.commit()
    html = reports.render_handbook(filedb, card.machine_id)
    assert "<script>alert(1)</script>" not in html and "&lt;script&gt;" in html


def test_handover_and_shift_reports(client, filedb) -> None:
    from datetime import timedelta

    html = reports.render_handover(filedb, 1)
    assert "Handover report — Ramesh Patil" in html and "VMC-3" in html
    assert "Record a setup video on VMC-3" in html
    shift = reports.render_shift_summary(filedb, date.today() - timedelta(days=60))
    assert "VMC-3" in shift and "Spindle bearing failure" in shift
    assert client.get("/api/reports/handbook/999").status_code == 404
