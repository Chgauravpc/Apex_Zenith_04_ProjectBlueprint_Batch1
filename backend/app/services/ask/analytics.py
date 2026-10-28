"""Questions about numbers ("how many chatter rejects on VMC-3 last month?") → one SELECT.

Safety (ENGINEERING.md §6): the SQL must be a single SELECT/WITH statement with no
comments and no write or schema keywords. It then runs read-only with a 2 s time limit and
at most 200 rows: on SQLite through a separate `mode=ro` + `query_only` connection, on
Postgres inside a `READ ONLY` transaction with `statement_timeout`.
The LLM writes the SQL; offline, a small rule matcher covers the common questions.
"""

import logging
import re
import sqlite3
import time
from datetime import date, timedelta
from functools import lru_cache
from typing import Any, Callable, List, Optional, Tuple

from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import Base, make_engine, normalize_url
from app.errors import ProviderUnavailable, ValidationFailed
from app.models.erp import Machine
from app.prompts import RECORDS_ARE_DATA
from app.schemas.ask import AnalyticsLLM, AnalyticsRequest, AnalyticsResult
from app.services import llm
from app.utils import lexicon

logger = logging.getLogger(__name__)

ROW_LIMIT = 200
TIME_LIMIT_SECONDS = 2.0
ALLOWED_TABLES = (
    "machines",
    "components",
    "work_orders",
    "qc_rejects",
    "maintenance",
    "knowledge_cards",
    "warnings",
    "queries",
    "anomalies",
    "events",
    "parts",
    "materials",
    "operations",
)
FORBIDDEN = re.compile(
    r"\b(insert|update|delete|drop|alter|create|attach|detach|pragma|"
    r"replace|vacuum|reindex|analyze|truncate|grant|load_extension|"
    r"copy|set_config|pg_sleep\w*|pg_read\w*|lo_\w+|dblink\w*)\b",
    re.IGNORECASE,
)

ANALYTICS_SYSTEM = (
    "Write ONE {dialect} SELECT query that answers the question about a CNC machine shop. "
    "Use only these tables and columns:\n{schema}\n"
    "Dates look like 'YYYY-MM-DD HH:MM:SS'; today is {today}. Join machines to "
    "show machine names. Never select employee personal data. Reply with sql, a short "
    "explanation for a shop-floor reader, and chart: bar, line or none.\n" + RECORDS_ARE_DATA
)


# What each table means, so the model counts facts where they are recorded (e.g. breakdowns are
# maintenance rows, not timeline events, which only mirror them).
TABLE_NOTES = {
    "maintenance": "breakdowns and services; kind = 'breakdown' or 'preventive'; date: done_on",
    "qc_rejects": "rejected parts; count parts with SUM(quantity); defect is the reason",
    "warnings": "Note Guardian warnings; severity = 'info', 'caution' or 'stop'",
    "anomalies": "sensor readings far from normal; ts is the reading time",
    "events": "machine timeline that mirrors other tables; never count breakdowns or rejects here",
    "knowledge_cards": "know-how cards; verified when verified_by_id is not null",
    "queries": "questions asked to the assistant; answered is true or false",
}


def _schema_text() -> str:
    lines = []
    for name in ALLOWED_TABLES:
        table = Base.metadata.tables[name]
        cols = ", ".join(c.name for c in table.columns if c.name != "embedding")
        note = f"  -- {TABLE_NOTES[name]}" if name in TABLE_NOTES else ""
        lines.append(f"- {name}({cols}){note}")
    return "\n".join(lines)


def validate_sql(sql: str) -> str:
    """Return the cleaned single SELECT, or raise ValidationFailed."""
    cleaned = sql.strip().rstrip(";").strip()
    if not cleaned:
        raise ValidationFailed("empty query")
    if ";" in cleaned:
        raise ValidationFailed("only one statement is allowed")
    if "--" in cleaned or "/*" in cleaned:
        raise ValidationFailed("comments are not allowed in analytics queries")
    if not re.match(r"^(select|with)\b", cleaned, re.IGNORECASE):
        raise ValidationFailed("only SELECT queries are allowed")
    if FORBIDDEN.search(cleaned):
        raise ValidationFailed("this query tries to change the database")
    return cleaned


def _is_postgres_url(url: str) -> bool:
    return normalize_url(url).startswith("postgresql")


def _readonly_connection() -> sqlite3.Connection:
    url = get_settings().database_url
    if not url.startswith("sqlite:///"):
        raise ValidationFailed("analytics needs a SQLite or Postgres database")
    path = url[len("sqlite:///") :]
    conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True, timeout=TIME_LIMIT_SECONDS)
    conn.execute("PRAGMA query_only = ON")
    return conn


@lru_cache(maxsize=2)
def _pg_engine(url: str) -> Engine:
    return make_engine(url)


def _run_postgres(safe: str) -> Tuple[List[str], List[List[Any]]]:
    """Run on Postgres in a READ ONLY transaction; the server cancels it after the time limit."""
    with _pg_engine(get_settings().database_url).connect() as conn, conn.begin():
        conn.execute(text("SET TRANSACTION READ ONLY"))
        conn.execute(text(f"SET LOCAL statement_timeout = {int(TIME_LIMIT_SECONDS * 1000)}"))
        try:
            result = conn.execute(text(f"SELECT * FROM ({safe}) AS q LIMIT {ROW_LIMIT + 1}"))
        except DBAPIError as exc:
            if "statement timeout" in str(exc.orig):
                raise ValidationFailed("query took too long") from exc
            raise ValidationFailed(f"query failed: {str(exc.orig).strip()}") from exc
        return list(result.keys()), [list(r) for r in result.fetchall()]


def run_sql(
    sql: str, connect: Optional[Callable[[], sqlite3.Connection]] = None
) -> Tuple[List[str], List[List[Any]], bool]:
    """Run a validated SELECT read-only; returns (columns, rows, truncated)."""
    safe = validate_sql(sql)
    if connect is None and _is_postgres_url(get_settings().database_url):
        columns, rows = _run_postgres(safe)
        return columns, rows[:ROW_LIMIT], len(rows) > ROW_LIMIT
    conn = (connect or _readonly_connection)()
    deadline = time.monotonic() + TIME_LIMIT_SECONDS
    conn.set_progress_handler(lambda: 1 if time.monotonic() > deadline else 0, 10_000)
    try:
        cur = conn.execute(f"SELECT * FROM ({safe}) LIMIT {ROW_LIMIT + 1}")
        rows = [list(r) for r in cur.fetchall()]
        columns = [d[0] for d in cur.description or []]
    except sqlite3.OperationalError as exc:
        if "interrupted" in str(exc):
            raise ValidationFailed("query took too long") from exc
        raise ValidationFailed(f"query failed: {exc}") from exc
    except sqlite3.DatabaseError as exc:
        raise ValidationFailed(f"query failed: {exc}") from exc
    finally:
        conn.close()
    return columns, rows[:ROW_LIMIT], len(rows) > ROW_LIMIT


# --- offline rule matcher --------------------------------------------------------------------

ENTITIES = {  # words in the question → (table, date column, label, extra filter)
    "reject": ("qc_rejects", "created_at", "rejects", ""),
    "breakdown": ("maintenance", "done_on", "breakdowns", "kind = 'breakdown'"),
    "failure": ("maintenance", "done_on", "breakdowns", "kind = 'breakdown'"),
    "warning": ("warnings", "created_at", "warnings", ""),
    "anomal": ("anomalies", "ts", "sensor anomalies", ""),
    "card": ("knowledge_cards", "created_at", "know-how cards", ""),
    "question": ("queries", "created_at", "questions asked", ""),
}


def _period(q: str, today: date) -> Tuple[Optional[date], str]:
    m = re.search(r"last (\d+) days?", q)
    if m:
        return today - timedelta(days=int(m.group(1))), f"last {m.group(1)} days"
    for words, days, label in (
        ("last week", 7, "last 7 days"),
        ("this week", 7, "last 7 days"),
        ("last month", 30, "last 30 days"),
        ("this month", 30, "last 30 days"),
        ("this year", 365, "last 365 days"),
        ("today", 0, "today"),
    ):
        if words in q:
            return today - timedelta(days=days), label
    return None, "all time"


def offline_sql(db: Session, question: str, today: date) -> AnalyticsLLM:
    """Rule-based SQL for: how many <rejects|breakdowns|warnings|...> [on M] [period] [per X]."""
    q = lexicon.normalize(question)
    entity = next((v for k, v in ENTITIES.items() if k in q), None)
    if entity is None:
        raise ValidationFailed(
            "without the AI service I can answer counts of rejects, "
            "breakdowns, warnings, anomalies, cards or questions"
        )
    table, date_col, label, extra = entity
    names = {m.name: m.id for m in db.query(Machine).all()}
    machine = lexicon.match_machine(question, names)
    since, period = _period(q, today)
    where = [
        w
        for w in (
            extra,
            f"t.machine_id = {names[machine]}" if machine else "",
            f"t.{date_col} >= '{since.isoformat()}'" if since else "",
        )
        if w
    ]
    where_sql = f" WHERE {' AND '.join(where)}" if where else ""
    if table == "qc_rejects" and any(w in q for w in ("defect", "type", "why", "reason")):
        sql = (
            f"SELECT t.defect, SUM(t.quantity) AS parts FROM qc_rejects t{where_sql} "
            f"GROUP BY t.defect ORDER BY parts DESC"
        )
        chart = "bar"
    elif machine is None or any(w in q for w in ("per machine", "by machine", "each machine")):
        count = "SUM(t.quantity)" if table == "qc_rejects" else "COUNT(*)"
        sql = (
            f"SELECT m.name AS machine, {count} AS {label.replace(' ', '_')} FROM {table} t "
            f"JOIN machines m ON m.id = t.machine_id{where_sql} GROUP BY m.name "
            f"ORDER BY 2 DESC"
        )
        chart = "bar"
    else:
        count = "COALESCE(SUM(t.quantity), 0)" if table == "qc_rejects" else "COUNT(*)"
        sql = f"SELECT {count} AS {label.replace(' ', '_')} FROM {table} t{where_sql}"
        chart = "none"
    where_text = f" on {machine}" if machine else ""
    return AnalyticsLLM(
        sql=sql, chart=chart, explanation=f"Number of {label}{where_text}, {period}."
    )


def run_analytics(db: Session, req: AnalyticsRequest) -> AnalyticsResult:
    """Answer a counting/trend question with a safe read-only query."""
    today = date.today()
    try:
        plan = llm.chat_json(
            "query",
            ANALYTICS_SYSTEM.format(
                dialect="PostgreSQL" if _is_postgres_url(get_settings().database_url) else "SQLite",
                schema=_schema_text(),
                today=today.isoformat(),
            ),
            req.question,
            AnalyticsLLM,
        )
        mode = "live"
    except ProviderUnavailable:
        plan, mode = offline_sql(db, req.question, today), "offline"
    columns, rows, truncated = run_sql(plan.sql)
    logger.info("analytics mode=%s rows=%d", mode, len(rows))
    return AnalyticsResult(
        question=req.question,
        sql=validate_sql(plan.sql),
        columns=columns,
        rows=rows,
        row_count=len(rows),
        truncated=truncated,
        chart=plan.chart if len(rows) > 1 else "none",
        explanation=plan.explanation,
        mode=mode,
    )
