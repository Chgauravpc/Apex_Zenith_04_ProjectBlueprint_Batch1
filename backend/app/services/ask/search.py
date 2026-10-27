"""Hybrid retrieval for Ask Experience: full-text + meaning, fused, verified first.

1. Expand the question with shop-floor synonyms (Hindi "चैटर" also searches "chatter").
2. FTS5/BM25 top 50 over every record type, filtered by machine.
3. Vector top 50 over the machine's cards (when the embedding model is available).
4. Reciprocal-rank fusion (RRF), boost cards an old employee verified, keep k.
5. Load details for the k winners only, one query per record type.
"""

import logging
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import fts_search
from app.models.erp import Employee, Machine, Maintenance, QCReject
from app.models.guide import Procedure
from app.models.knowledge import Document, KnowledgeCard, Meeting
from app.models.map3d import Component
from app.schemas.ask import Hit
from app.services import embeddings
from app.utils import lexicon

logger = logging.getLogger(__name__)

CANDIDATES = 50  # per retriever
MAX_VECTOR_ROWS = 2000  # brute-force dot product is fine up to here (ENGINEERING.md §4)
RRF_K = 60  # standard RRF constant: score = Σ 1 / (RRF_K + rank)
VERIFIED_BOOST = 1.3
SNIPPET_CHARS = 220

Ref = Tuple[str, int]


def _expanded(query: str) -> str:
    return " ".join([query] + lexicon.expand_query(query))


def _vector_ranking(db: Session, query: str, machine_id: Optional[int]) -> List[Ref]:
    """Cards ranked by cosine similarity; empty when embeddings are unavailable."""
    conds = [KnowledgeCard.embedding.is_not(None)]
    if machine_id is not None:
        conds.append(KnowledgeCard.machine_id == machine_id)
    rows = db.execute(
        select(KnowledgeCard.id, KnowledgeCard.embedding)
        .where(*conds)
        .order_by(KnowledgeCard.id.desc())
        .limit(MAX_VECTOR_ROWS)
    ).all()
    if not rows:
        return []
    qvec = embeddings.try_embed([query], kind="query")
    if qvec is None:
        return []
    matrix = np.vstack([embeddings.from_bytes(blob) for _, blob in rows])  # (n, 384)
    scores = matrix @ qvec[0]  # vectors are unit length, so this is cosine similarity
    top = np.argsort(-scores)[:CANDIDATES]
    return [("card", int(rows[i][0])) for i in top]


def _fuse(rankings: Iterable[List[Ref]]) -> Dict[Ref, float]:
    scores: Dict[Ref, float] = {}
    for ranking in rankings:
        for rank, ref in enumerate(ranking, start=1):
            scores[ref] = scores.get(ref, 0.0) + 1.0 / (RRF_K + rank)
    return scores


def _media_url(path: Optional[str]) -> Optional[str]:
    """Public URL of a stored upload (served by main.py under /media)."""
    if not path:
        return None
    storage = Path(get_settings().storage_dir).resolve()
    try:
        return "/media/" + Path(path).resolve().relative_to(storage).as_posix()
    except ValueError:
        return None


def _snip(text: str) -> str:
    text = " ".join(text.split())
    return text if len(text) <= SNIPPET_CHARS else text[: SNIPPET_CHARS - 1] + "…"


def _load_by_type(db: Session, refs: List[Ref]) -> Dict[Ref, Hit]:
    ids: Dict[str, List[int]] = {}
    for t, i in refs:
        ids.setdefault(t, []).append(i)
    out: Dict[Ref, Hit] = {}

    def rows(model, key: str) -> List:
        return (
            list(db.execute(select(model).where(model.id.in_(ids.get(key, [])))).scalars())
            if ids.get(key)
            else []
        )

    cards = rows(KnowledgeCard, "card")
    docs = {d.id: d for d in rows(Document, "note")}
    doc_ids = [c.source_doc_id for c in cards if c.source_doc_id]
    if doc_ids:
        docs.update(
            {
                d.id: d
                for d in db.execute(select(Document).where(Document.id.in_(doc_ids))).scalars()
            }
        )
    for c in cards:
        src = docs.get(c.source_doc_id) if c.source_doc_id else None
        text = " ".join(filter(None, [c.title, c.context, c.action, c.why]))
        out[("card", c.id)] = Hit(
            record_type="card",
            record_id=c.id,
            score=0,
            kind="Know-how card",
            title=c.title,
            text=text,
            snippet=_snip(text),
            action=c.action,
            verified=c.verified_by_id is not None,
            author_id=c.author_id,
            machine_id=c.machine_id,
            component_id=c.component_id,
            media_url=_media_url(src.file_path) if src else None,
            when=c.created_at.date(),
        )
    for d in (docs[i] for i in ids.get("note", []) if i in docs):
        kind = {"voice": "Voice note", "handwritten": "Handwritten page"}.get(d.type, "Note")
        out[("note", d.id)] = Hit(
            record_type="note",
            record_id=d.id,
            score=0,
            kind=kind,
            title=_snip(d.text or kind),
            text=d.text or "",
            snippet=_snip(d.text or ""),
            author_id=d.uploader_id,
            machine_id=d.machine_id,
            media_url=_media_url(d.file_path),
            when=d.created_at.date(),
        )
    for q in rows(QCReject, "qc_reject"):
        text = f"{q.quantity} x {q.defect}. {q.cause or ''}".strip()
        out[("qc_reject", q.id)] = Hit(
            record_type="qc_reject",
            record_id=q.id,
            score=0,
            kind="QC reject",
            title=q.defect,
            text=text,
            snippet=_snip(text),
            machine_id=q.machine_id,
            when=q.created_at.date(),
        )
    for m in rows(Maintenance, "maintenance"):
        out[("maintenance", m.id)] = Hit(
            record_type="maintenance",
            record_id=m.id,
            score=0,
            kind=f"Maintenance ({m.kind})",
            title=m.description,
            text=m.description,
            snippet=_snip(m.description),
            machine_id=m.machine_id,
            component_id=m.component_id,
            when=m.done_on,
        )
    for g in rows(Meeting, "meeting"):
        text = f"{g.title}. {g.summary or ''}"
        out[("meeting", g.id)] = Hit(
            record_type="meeting",
            record_id=g.id,
            score=0,
            kind="Meeting",
            title=g.title,
            text=text,
            snippet=_snip(text),
            when=g.held_on,
        )
    for p in rows(Procedure, "procedure"):
        out[("procedure", p.id)] = Hit(
            record_type="procedure",
            record_id=p.id,
            score=0,
            kind="Procedure",
            title=p.title,
            text=p.title,
            snippet=p.title,
            author_id=p.author_id,
            machine_id=p.machine_id,
            verified=p.status == "approved",
            when=p.created_at.date(),
        )
    return out


def _add_names(db: Session, hits: List[Hit]) -> None:
    """Author / machine / component names for the source cards (3 small queries)."""

    def names(model, ids, attr: str) -> Dict[int, str]:
        wanted = {i for i in ids if i}
        if not wanted:
            return {}
        return {
            r.id: getattr(r, attr)
            for r in db.execute(select(model).where(model.id.in_(wanted))).scalars()
        }

    people = names(Employee, (h.author_id for h in hits), "name")
    machines = names(Machine, (h.machine_id for h in hits), "name")
    comps = names(Component, (h.component_id for h in hits), "display_name")
    for h in hits:
        h.author = people.get(h.author_id)
        h.machine = machines.get(h.machine_id)
        h.component = comps.get(h.component_id)


def hybrid_search(
    db: Session, query: str, machine_id: Optional[int], component_id: Optional[int], k: int = 6
) -> List[Hit]:
    """Best k records for a question, any language.

    Complexity: FTS O(log n) + vectors O(m·384) for m ≤ MAX_VECTOR_ROWS cards of the machine,
    then O(k) detail loading.
    """
    if not query.strip():
        return []
    fts = [
        (t, i)
        for t, i, _ in fts_search(db, _expanded(query), machine_id=machine_id, limit=CANDIDATES)
    ]
    vectors = _vector_ranking(db, query, machine_id)
    scores = _fuse([fts, vectors])
    if not scores:
        return []
    # Load a few more than k: the verified boost and the component filter re-order them.
    shortlist = sorted(scores, key=scores.get, reverse=True)[: k * 3]
    loaded = _load_by_type(db, shortlist)
    hits = []
    for ref in shortlist:
        hit = loaded.get(ref)
        if hit is None:
            continue
        if component_id is not None and hit.component_id not in (None, component_id):
            continue  # about another part of the machine
        hit.score = scores[ref] * (VERIFIED_BOOST if hit.verified else 1.0)
        hits.append(hit)
    hits.sort(key=lambda h: h.score, reverse=True)
    hits = hits[:k]
    _add_names(db, hits)
    logger.info("search fts=%d vector=%d hits=%d", len(fts), len(vectors), len(hits))
    return hits
