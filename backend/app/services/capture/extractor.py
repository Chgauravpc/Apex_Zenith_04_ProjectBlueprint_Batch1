"""Turn note text into Know-How Cards.

`extract_cards` understands the language (LLM, or the lexicon when no provider
is available) and returns names as written. `save_cards` (needs the DB) resolves
those names to machine/component IDs, indexes the cards and stores them.
"""

import logging
from typing import List, Optional

from app.errors import ProviderUnavailable, ValidationFailed
from app.prompts import wrap_records
from app.prompts.extract import EXTRACT_SYSTEM, EXTRACT_USER
from app.schemas.capture import ExtractedCard, ExtractionResult
from app.services import llm
from app.utils import lexicon

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
