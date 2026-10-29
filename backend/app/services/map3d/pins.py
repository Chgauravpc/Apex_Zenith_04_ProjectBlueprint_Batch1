"""3D pin creation and auto-linking service.

A pin is a knowledge card placed on a machine part. Like every captured card it waits in the
review queue until an old employee or supervisor verifies it.

Reference: TASKS.md T12, PRD.md §9.4, and ENGINEERING.md.
"""

from typing import Optional

from sqlalchemy.orm import Session

from app.database import fts_index
from app.errors import NotFound
from app.models.erp import Employee
from app.models.knowledge import KnowledgeCard
from app.models.map3d import Component, ComponentPin
from app.schemas.map3d import PinIn, PinOut
from app.services import embeddings
from app.services.capture.extractor import _component_aliases, card_text
from app.utils import lexicon
from app.utils.audit import audit


def auto_pin(db: Session, card: KnowledgeCard) -> Optional[int]:
    """Link a card to the first component of its machine named in its title, symptom or action."""
    if card.component_id or not card.machine_id:
        return card.component_id
    text = " ".join(filter(None, [card.title, card.symptom, card.action]))
    matches = lexicon.match_components(
        text, _component_aliases(db, [card.machine_id]).get(card.machine_id, {})
    )
    if matches:
        card.component_id = matches[0]
        db.flush()
    return card.component_id


def create_pin(db: Session, component_id: int, pin: PinIn) -> PinOut:
    """Store a pin and its knowledge card (unverified, searchable) on a component.

    Raises:
        NotFound: unknown component or author.
    """
    component = db.get(Component, component_id)
    if component is None:
        raise NotFound(f"component {component_id} not found")
    author = db.get(Employee, pin.author_id)
    if author is None:
        raise NotFound(f"employee {pin.author_id} not found")

    card = KnowledgeCard(
        title=pin.title,
        machine_id=component.machine_id,
        component_id=component.id,
        action=pin.text,
        author_id=author.id,
    )
    db.add(card)
    db.flush()
    vectors = embeddings.try_embed([card_text(card)])
    if vectors is not None:
        card.embedding = embeddings.to_bytes(vectors[0])
    fts_index(db, "card", card.id, card.machine_id, card_text(card))

    row = ComponentPin(
        card_id=card.id,
        component_id=component.id,
        x=pin.x,
        y=pin.y,
        z=pin.z,
        author_id=author.id,
        severity=pin.severity,
        kind=pin.knowledge_type or pin.type or "tip",
    )
    db.add(row)
    db.flush()
    audit(db, "card.pinned", actor_id=author.id, target_type="card", target_id=card.id)
    db.commit()

    return PinOut(
        id=row.id,
        card_id=card.id,
        component_id=component.id,
        mesh_name=component.mesh_name,
        title=card.title,
        text=card.action,
        severity=row.severity,
        knowledge_type=row.kind,
        author=author.name,
        date=card.created_at.strftime("%Y-%m-%d"),
        verified=False,
    )
