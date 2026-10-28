"""Database engine, sessions and the shared full-text index.

`chunks_fts` is one table for every searchable record type (cards, notes,
meetings, procedure steps ...). Each row points back to its source record by
`(record_type, record_id)`, so search never needs `LIKE '%x%'`.

SQLite (local, tests) uses an FTS5 virtual table with BM25 ranking. Postgres
(hosted, persistent) uses a `tsvector` column with a GIN index and `ts_rank`.
Both are behind `fts_index`, `fts_search` and `init_db`; callers never see the difference.
"""

import logging
import re
import unicodedata
from datetime import datetime, timezone
from typing import Any, Iterator, List, Optional, Tuple

from sqlalchemy import DateTime, ForeignKey, Integer, create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker
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


def utcnow() -> datetime:
    """Naive UTC timestamp (SQLite has no time zones)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class IdMixin:
    """Integer primary key + indexed creation time, shared by most tables."""

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


def fk(target: str, nullable: bool = True, ondelete: str = "SET NULL") -> Any:
    """Indexed foreign-key column. Every FK is indexed so joins/filters stay O(log n)."""
    if not nullable and ondelete == "SET NULL":
        ondelete = "CASCADE"
    return mapped_column(
        Integer, ForeignKey(target, ondelete=ondelete), nullable=nullable, index=True
    )


def normalize_url(url: str) -> str:
    """Give hosted-Postgres URLs (`postgres://`, `postgresql://`) the psycopg2 driver name."""
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg2://" + url[len(prefix) :]
    return url


def is_postgres(bind: Any) -> bool:
    """True when `bind` (an Engine, Connection or Session) talks to PostgreSQL."""
    target = bind.get_bind() if isinstance(bind, Session) else bind
    return target.dialect.name == "postgresql"


def make_engine(url: str) -> Engine:
    """Create an engine; SQLite gets thread-safe settings and foreign keys on."""
    url = normalize_url(url)
    if not url.startswith("sqlite"):
        # Free hosted Postgres closes idle connections: test before use, recycle often.
        return create_engine(url, pool_pre_ping=True, pool_recycle=300)
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
    """Create all tables and the full-text index if they do not exist."""
    import app.models  # noqa: F401  (registers every model on Base.metadata)

    target = bind or engine
    Base.metadata.create_all(bind=target)
    with target.begin() as conn:
        if is_postgres(conn):
            for statement in _PG_FTS_DDL:
                conn.execute(text(statement))
            return
        conn.execute(
            text(
                "CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5("
                "record_type, record_id UNINDEXED, machine_id UNINDEXED, text, "
                f'tokenize="{FTS_TOKENIZER}")'
            )
        )


_PG_FTS_DDL = (
    "CREATE TABLE IF NOT EXISTS chunks_fts ("
    "record_type text NOT NULL, record_id integer NOT NULL, machine_id integer, "
    "text text NOT NULL, tsv tsvector NOT NULL, PRIMARY KEY (record_type, record_id))",
    "CREATE INDEX IF NOT EXISTS chunks_fts_tsv_idx ON chunks_fts USING gin (tsv)",
    "CREATE INDEX IF NOT EXISTS chunks_fts_machine_idx ON chunks_fts (machine_id)",
)
PG_MAX_TOKENS = 64  # per query
PG_MAX_TOKEN_CHARS = 64  # a tsvector lexeme must stay far below 2 KB


def fts_tokens(text_: str) -> List[str]:
    """Split text into lower-case words, keeping letters, digits and combining marks.

    Mirrors the SQLite tokenizer (`L* N* Co M*`) so Devanagari words are not cut at their
    matras. Postgres' own parser depends on the database locale, so the Postgres path
    tokenizes here and stores the words directly with `array_to_tsvector`.
    """
    tokens: List[str] = []
    word: List[str] = []
    for ch in unicodedata.normalize("NFC", text_.casefold()):
        cat = unicodedata.category(ch)
        if cat[0] in "LNM" or cat == "Co":
            word.append(ch)
        elif word:
            tokens.append("".join(word)[:PG_MAX_TOKEN_CHARS])
            word = []
    if word:
        tokens.append("".join(word)[:PG_MAX_TOKEN_CHARS])
    return tokens


def fts_index(
    db: Session, record_type: str, record_id: int, machine_id: Optional[int], text_: str
) -> None:
    """Add or replace the searchable text of one record. Caller commits.

    Complexity: O(tokens in text_).
    """
    params = {"rt": record_type, "rid": record_id}
    if is_postgres(db):
        db.execute(
            text(
                "INSERT INTO chunks_fts (record_type, record_id, machine_id, text, tsv) "
                "VALUES (:rt, :rid, :mid, :txt, array_to_tsvector(CAST(:tokens AS text[]))) "
                "ON CONFLICT (record_type, record_id) DO UPDATE SET "
                "machine_id = EXCLUDED.machine_id, text = EXCLUDED.text, tsv = EXCLUDED.tsv"
            ),
            {**params, "mid": machine_id, "txt": text_, "tokens": fts_tokens(text_)},
        )
        return
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
    limit = max(1, min(limit, FTS_MAX_LIMIT))
    if is_postgres(db):
        return _pg_search(db, query, machine_id, limit)
    match = build_match_query(query)
    if not match:
        return []
    sql = (
        "SELECT record_type, record_id, -bm25(chunks_fts) AS score FROM chunks_fts "
        "WHERE chunks_fts MATCH :q"
    )
    params = {"q": match, "lim": limit}
    if machine_id is not None:
        sql += " AND machine_id = :mid"
        params["mid"] = machine_id
    sql += " ORDER BY bm25(chunks_fts) LIMIT :lim"
    rows = db.execute(text(sql), params).all()
    return [(r[0], int(r[1]), float(r[2])) for r in rows]


def _pg_search(
    db: Session, query: str, machine_id: Optional[int], limit: int
) -> List[Tuple[str, int, float]]:
    """Postgres counterpart of the FTS5 query: words joined with OR, ranked by `ts_rank`."""
    words = list(dict.fromkeys(fts_tokens(query)))[:PG_MAX_TOKENS]
    if not words:
        return []
    # Quoted lexemes are taken as-is by the tsquery parser; tokens never contain quotes.
    tsquery = " | ".join("'" + w + "'" for w in words)
    sql = (
        "SELECT record_type, record_id, ts_rank(tsv, CAST(:q AS tsquery)) AS score "
        "FROM chunks_fts WHERE tsv @@ CAST(:q AS tsquery)"
    )
    params = {"q": tsquery, "lim": limit}
    if machine_id is not None:
        sql += " AND machine_id = :mid"
        params["mid"] = machine_id
    sql += " ORDER BY score DESC, record_id LIMIT :lim"
    rows = db.execute(text(sql), params).all()
    return [(r[0], int(r[1]), float(r[2])) for r in rows]
