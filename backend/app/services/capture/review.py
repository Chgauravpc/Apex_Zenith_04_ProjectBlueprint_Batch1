"""Review queue: captured cards wait here until an old employee or supervisor checks them.

Approving (optionally after correcting) stamps `verified_by`, which is what lets the
assistant label an answer "verified by Ramesh". Rejected cards are removed from search.
"""

import logging
from typing import Tuple

from sqlalchemy import delete, func, select, text
from sqlalchemy.orm import Session

from app.database import fts_index, utcnow
from app.errors import NotFound, ValidationFailed
from app.models.erp import ROLE_NEW, Employee, Machine
from app.models.knowledge import KnowledgeCard
from app.models.map3d import Component, ComponentPin
from app.schemas.capture import CardOut, ReviewCardOut, ReviewIn, ReviewQueueOut
from app.services import embeddings
from app.services.capture.extractor import card_text
from app.utils import lexicon
from app.utils.audit import audit

logger = logging.getLogger(__name__)

MAX_PAGE = 100


def review_queue(db: Session, limit: int = 20, offset: int = 0) -> ReviewQueueOut:
    """Unverified cards, least confident first, then oldest. One count + one page query."""
    limit = max(1, min(limit, MAX_PAGE))
    offset = max(0, offset)
    pending = KnowledgeCard.verified_by_id.is_(None)
    total = db.execute(select(func.count()).select_from(KnowledgeCard).where(pending)).scalar_one()
    rows = (
        db.execute(
            select(KnowledgeCard)
            .where(pending)
            .order_by(KnowledgeCard.confidence, KnowledgeCard.created_at, KnowledgeCard.id)
            .limit(limit)
            .offset(offset)
        )
        .scalars()
        .all()
    )

    def names(model, attr: str, ids) -> dict:
        ids = {i for i in ids if i is not None}
        if not ids:
            return {}
        col = getattr(model, attr)
        return dict(db.execute(select(model.id, col).where(model.id.in_(ids))).all())

    machines = names(Machine, "name", (r.machine_id for r in rows))
    parts = names(Component, "display_name", (r.component_id for r in rows))
    people = names(Employee, "name", (r.author_id for r in rows))
    items = [
        ReviewCardOut.model_validate(r).model_copy(
            update={
                "machine": machines.get(r.machine_id),
                "component": parts.get(r.component_id),
                "author": people.get(r.author_id),
            }
        )
        for r in rows
    ]
    return ReviewQueueOut(items=items, total=total, limit=limit, offset=offset)


def _reviewer(db: Session, reviewer_id: int) -> Employee:
    person = db.get(Employee, reviewer_id)
    if person is None:
        raise NotFound(f"employee {reviewer_id} not found")
    if person.role == ROLE_NEW:
        raise ValidationFailed("only an old employee or a supervisor can verify know-how")
    return person


def _apply_edits(card: KnowledgeCard, review: ReviewIn) -> None:
    if review.symptom is not None and review.symptom not in lexicon.SYMPTOMS:
        raise ValidationFailed(f"unknown symptom '{review.symptom}'")
    for field, value in (
        ("title", review.title),
        ("action", review.action_text),
        ("why", review.why),
        ("symptom", review.symptom),
        ("params", review.params),
    ):
        if value is not None:
            setattr(card, field, value)


def review_card(db: Session, card_id: int, review: ReviewIn) -> Tuple[str, CardOut]:
    """Approve, correct-and-approve, or reject a card. Returns (outcome, card as it was saved).

    Raises:
        NotFound: unknown card or reviewer. ValidationFailed: reviewer is a new employee.
    """
    card = db.get(KnowledgeCard, card_id)
    if card is None:
        raise NotFound(f"card {card_id} not found")
    person = _reviewer(db, review.reviewer_id)
    out = CardOut.model_validate(card)

    if review.action == "reject":
        db.execute(
            text("DELETE FROM chunks_fts WHERE record_type = 'card' AND record_id = :id"),
            {"id": card.id},
        )
        db.execute(delete(ComponentPin).where(ComponentPin.card_id == card.id))
        db.delete(card)
        audit(db, "card.rejected", actor_id=person.id, target_type="card", target_id=card_id)
        db.commit()
        return "rejected", out

    if review.action == "edit":
        _apply_edits(card, review)
        vectors = embeddings.try_embed([card_text(card)])
        if vectors is not None:
            card.embedding = embeddings.to_bytes(vectors[0])
        fts_index(db, "card", card.id, card.machine_id, card_text(card))
    card.verified_by_id, card.verified_at = person.id, utcnow()
    card.confidence = max(card.confidence, 0.9)  # a person checked it
    audit(
        db,
        "card.verified",
        actor_id=person.id,
        target_type="card",
        target_id=card.id,
        edited=review.action == "edit",
    )
    db.commit()
    logger.info("card %s %s by employee %s", card.id, review.action, person.id)
    return "verified", CardOut.model_validate(card)
