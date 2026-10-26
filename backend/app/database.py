"""Database engine, sessions and the shared full-text index.

`chunks_fts` is one FTS5 table for every searchable record type (cards,
notes, meetings, procedure steps ...). Each row points back to its source
record by `(record_type, record_id)`, so search never needs `LIKE '%x%'`.
"""

import logging
import re
from typing import Iterator, List, Optional, Tuple

from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings

logger = logging.getLogger(__name__)

# unicode61 treats combining marks (Devanagari matras) as separators by default,
# which splits Hindi/Marathi words apart. Keep marks (M*) as token characters.
FTS_TOKENIZER = "unicode61 remove_diacritics 2 categories 'L* N* Co M*'"
FTS_MAX_LIMIT = 100
# Characters that have meaning in FTS5 query syntax; user text is split on them.
_FTS_SPLIT = re.compile(r"[\s\"'(){}\[\]*^:+\-.,;!?/\\|<>=&%$#@~`]+")


class Base(DeclarativeBase):
    """Declarative base for every SQLAlchemy model."""


def make_engine(url: str) -> Engine:
    """Create an engine; SQLite gets thread-safe settings and foreign keys on."""
    if not url.startswith("sqlite"):
        return create_engine(url, pool_pre_ping=True)
    kwargs = {"connect_args": {"check_same_thread": False}}
    # In-memory DB: one shared connection, else each session would see an empty DB.
    if url in ("sqlite://", "sqlite:///:memory:"):
        kwargs["poolclass"] = StaticPool
    engine = create_engine(url, **kwargs)

    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(dbapi_conn, _record) -> None:  # noqa: ANN001
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.execute("PRAGMA journal_mode=WAL")
        cur.close()

    return engine


engine = make_engine(get_settings().database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one session per request, always closed."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db(bind: Optional[Engine] = None) -> None:
    """Create all tables and the FTS5 index if they do not exist."""
    import app.models  # noqa: F401  (registers every model on Base.metadata)

    target = bind or engine
    Base.metadata.create_all(bind=target)
    with target.begin() as conn:
        conn.execute(
            text(
                "CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5("
                "record_type, record_id UNINDEXED, machine_id UNINDEXED, text, "
                f'tokenize="{FTS_TOKENIZER}")'
            )
        )


def fts_index(
    db: Session, record_type: str, record_id: int, machine_id: Optional[int], text_: str
) -> None:
    """Add or replace the searchable text of one record. Caller commits.

    Complexity: O(tokens in text_).
    """
    params = {"rt": record_type, "rid": record_id}
    db.execute(text("DELETE FROM chunks_fts WHERE record_type = :rt AND record_id = :rid"), params)
    db.execute(
        text(
            "INSERT INTO chunks_fts (record_type, record_id, machine_id, text) "
            "VALUES (:rt, :rid, :mid, :txt)"
        ),
        {**params, "mid": machine_id, "txt": text_},
    )


def build_match_query(query: str) -> str:
    """Turn free user text into a safe FTS5 query: each token quoted, joined with OR.

    Quoting stops user input from being read as FTS5 operators (NEAR, AND, column filters).
    Returns "" when the text has no searchable tokens.
    """
    tokens = [t for t in _FTS_SPLIT.split(query) if t]
    return " OR ".join('"' + t.replace('"', '""') + '"' for t in tokens)


def fts_search(
    db: Session, query: str, machine_id: Optional[int] = None, limit: int = 20
) -> List[Tuple[str, int, float]]:
    """Rank records by BM25 relevance.

    Args:
        db: open session.
        query: free text in any language.
        machine_id: if set, only records for that machine.
        limit: max results, capped at FTS_MAX_LIMIT.

    Returns:
        `(record_type, record_id, score)` sorted best first; higher score = more relevant.
    """
    match = build_match_query(query)
    if not match:
        return []
    sql = (
        "SELECT record_type, record_id, -bm25(chunks_fts) AS score FROM chunks_fts "
        "WHERE chunks_fts MATCH :q"
    )
    params = {"q": match, "lim": max(1, min(limit, FTS_MAX_LIMIT))}
    if machine_id is not None:
        sql += " AND machine_id = :mid"
        params["mid"] = machine_id
    sql += " ORDER BY bm25(chunks_fts) LIMIT :lim"
    rows = db.execute(text(sql), params).all()
    return [(r[0], int(r[1]), float(r[2])) for r in rows]
