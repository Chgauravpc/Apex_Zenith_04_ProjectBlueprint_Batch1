"""Turn note text into Know-How Cards.

`extract_cards` understands the language (LLM, or the lexicon when no provider
is available) and returns names as written. `save_cards` (needs the DB) resolves
those names to machine/component IDs, indexes the cards and stores them.
"""

import logging
from typing import Dict, Iterable, List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import fts_index
from app.errors import NotFound, ProviderUnavailable, ValidationFailed
from app.models.erp import Machine
from app.models.knowledge import Document, KnowledgeCard
from app.models.map3d import Component
from app.prompts import wrap_records
from app.prompts.extract import EXTRACT_SYSTEM, EXTRACT_USER
from app.schemas.capture import ExtractedCard, ExtractionResult
from app.services import embeddings, llm
from app.utils import lexicon
from app.utils.audit import audit

logger = logging.getLogger(__name__)

MAX_NOTE_CHARS = 8000  # ~10 min of speech; longer text is cut to protect the free quota
OFFLINE_CONFIDENCE = 0.4  # keyword match only: always goes to the review queue
OFFLINE_TITLE_CHARS = 80
# When several symptoms appear offline, the card is filed under the most serious one.
SYMPTOM_PRIORITY = [
    "chatter",
    "tool_break",
    "overheating",
    "coolant_leak",
    "alarm",
    "vibration",
    "noise",
    "dimension_drift",
    "poor_finish",
    "burr",
    "chip_colour",
]


def _offline_card(text: str) -> ExtractedCard:
    """Rule-based card: symptom and parameters from the lexicon, the note itself as action."""
    found = lexicon.find_symptoms(text)
    symptom = next((s for s in SYMPTOM_PRIORITY if s in found), None)
    title = " ".join(text.split())
    if len(title) > OFFLINE_TITLE_CHARS:
        title = title[: OFFLINE_TITLE_CHARS - 1].rstrip() + "…"
    return ExtractedCard(
        title=title,
        symptom=symptom,
        action=text.strip(),
        params=lexicon.find_params(text),
        confidence=OFFLINE_CONFIDENCE,
        mode="offline",
    )


def _clean(card: ExtractedCard) -> Optional[ExtractedCard]:
    """Drop empty cards and symptoms outside the canonical list the rest of the app uses."""
    if not card.action.strip():
        return None
    symptom = card.symptom if card.symptom in lexicon.SYMPTOMS else None
    return card.model_copy(update={"symptom": symptom, "mode": "live"})


def extract_cards(
    text: str, author_id: int, machine_hint: Optional[int] = None
) -> List[ExtractedCard]:
    """Extract know-how cards from a note.

    Args:
        text: typed note or transcript (any of en / hi / mr / Hinglish).
        author_id: employee who wrote or spoke it (for logs; saved by save_cards).
        machine_hint: machine already chosen in the app, if any; then the model may
            leave `machine` empty and save_cards uses the hint.

    Returns:
        Cards with `mode="live"` from the LLM, or one `mode="offline"` card from the lexicon
        when no provider is available. May be empty if the note has no know-how.

    Raises:
        ValidationFailed: empty note.
    """
    text = text.strip()
    if not text:
        raise ValidationFailed("note is empty")
    note = text[:MAX_NOTE_CHARS]
    hint = " (machine already selected in the app)" if machine_hint else ""
    user = EXTRACT_USER.format(hint=hint, note=wrap_records([("note", note)]))
    try:
        result = llm.chat_json("extract", EXTRACT_SYSTEM, user, ExtractionResult)
    except ProviderUnavailable:
        logger.info("extract offline fallback author=%s", author_id)
        return [_offline_card(note)]
    cards = [c for c in (_clean(card) for card in result.cards) if c is not None]
    logger.info("extract live author=%s cards=%d", author_id, len(cards))
    return cards


def card_text(card: KnowledgeCard) -> str:
    """Text used for search and embeddings: everything a person might search for."""
    return " ".join(filter(None, [card.title, card.symptom, card.context, card.action, card.why]))


def _component_aliases(db: Session, machine_ids: Iterable[int]) -> Dict[int, Dict[int, List[str]]]:
    """machine_id -> {component_id: aliases}, loaded in one query (no N+1)."""
    by_machine: Dict[int, Dict[int, List[str]]] = {}
    ids = list(set(machine_ids))
    if not ids:
        return by_machine
    for comp in db.execute(select(Component).where(Component.machine_id.in_(ids))).scalars():
        names = [comp.mesh_name.replace("_", " "), comp.display_name, *(comp.aliases or [])]
        by_machine.setdefault(comp.machine_id, {})[comp.id] = names
    return by_machine


def save_cards(db: Session, cards: List[ExtractedCard], source_doc_id: int) -> List[KnowledgeCard]:
    """Store extracted cards linked to their source note, index them and commit.

    Machine: name in the card, else name found in the note, else the note's machine.
    Component: aliases (en/hi/mr) of that machine's components found in the card text.
    New cards are unverified; an old employee verifies them from the review queue.

    Complexity: 3 queries + 1 batch embedding, O(cards × aliases) matching.
    """
    doc = db.get(Document, source_doc_id)
    if doc is None:
        raise NotFound(f"document {source_doc_id} not found")
    machines = {m.name: m.id for m in db.execute(select(Machine)).scalars()}

    resolved = []
    for card in cards:
        name = lexicon.match_machine(card.machine or "", machines) or lexicon.match_machine(
            doc.text or "", machines
        )
        resolved.append((card, machines[name] if name else doc.machine_id))
    aliases = _component_aliases(db, [mid for _, mid in resolved if mid])

    rows: List[KnowledgeCard] = []
    for card, machine_id in resolved:
        text = " ".join(filter(None, [card.component, card.title, card.action]))
        comp_ids = lexicon.match_components(text, aliases.get(machine_id, {}))
        row = KnowledgeCard(
            title=card.title[:200],
            machine_id=machine_id,
            component_id=comp_ids[0] if comp_ids else None,
            symptom=card.symptom,
            context=card.context,
            action=card.action,
            why=card.why,
            params=card.params,
            author_id=doc.uploader_id,
            confidence=card.confidence,
            source_doc_id=doc.id,
            unofficial=card.unofficial,
        )
        db.add(row)
        rows.append(row)
    db.flush()  # assign IDs for FTS rows and the audit log

    vectors = embeddings.try_embed([card_text(r) for r in rows])
    for i, row in enumerate(rows):
        if vectors is not None:
            row.embedding = embeddings.to_bytes(vectors[i])
        fts_index(db, "card", row.id, row.machine_id, card_text(row))
        audit(
            db,
            "card.extracted",
            actor_id=doc.uploader_id,
            target_type="card",
            target_id=row.id,
            source_doc_id=doc.id,
            mode=cards[i].mode,
        )
    db.commit()
    logger.info(
        "saved %d cards from doc %s (embeddings=%s)", len(rows), doc.id, vectors is not None
    )
    return rows
