"""3D pin creation and auto-linking service.

Reference: TASKS.md T12, PRD.md §9.4, and ENGINEERING.md.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import NotFound
from app.models.erp import Employee
from app.models.knowledge import KnowledgeCard
from app.models.map3d import Component, ComponentPin
from app.schemas.map3d import PinIn, PinOut


def auto_pin(db: Session, card: KnowledgeCard) -> Optional[int]:
    """Auto-link a KnowledgeCard to a component via title/symptom/action alias matching."""
    if card.component_id:
        return card.component_id

    if not card.machine_id:
        return None

    components = (
        db.execute(select(Component).where(Component.machine_id == card.machine_id))
        .scalars()
        .all()
    )

    text_to_check = f"{card.title} {card.symptom or ''} {card.action or ''}".lower()

    for comp in components:
        if comp.mesh_name.lower() in text_to_check or comp.display_name.lower() in text_to_check:
            card.component_id = comp.id
            db.flush()
            return comp.id
        if comp.aliases:
            for alias in comp.aliases:
                if str(alias).lower() in text_to_check:
                    card.component_id = comp.id
                    db.flush()
                    return comp.id

    return None


def create_pin(
    db: Session,
    component_id: int,
    pin: PinIn,
    author_id: Optional[int] = None,
) -> PinOut:
    """Create a 3D pin and corresponding KnowledgeCard attached to a component."""
    component = db.get(Component, component_id)
    if not component:
        raise NotFound("Component", component_id)

    author_name = pin.author or "Ramesh (Master Machinist)"
    if not author_id:
        emp = (
            db.execute(
                select(Employee).where(Employee.name.ilike(f"%{author_name.split()[0]}%"))
            )
            .scalars()
            .first()
        )
        author_id = emp.id if emp else None

    card = KnowledgeCard(
        title=pin.title,
        machine_id=component.machine_id,
        component_id=component.id,
        action=pin.text,
        author_id=author_id,
        confidence=1.0,
        verified_by_id=author_id,
        verified_at=datetime.now(timezone.utc),
    )
    db.add(card)
    db.flush()

    comp_pin = ComponentPin(
        card_id=card.id,
        component_id=component.id,
        x=pin.x,
        y=pin.y,
        z=pin.z,
        author_id=author_id,
    )
    db.add(comp_pin)
    db.commit()
    db.refresh(comp_pin)
    db.refresh(card)

    return PinOut(
        id=comp_pin.id,
        card_id=card.id,
        component_id=component.id,
        mesh_name=component.mesh_name,
        title=card.title,
        text=card.action,
        severity=pin.severity or "info",
        knowledge_type=pin.knowledge_type or pin.type or "tip",
        author=author_name,
        date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        verified=True,
    )
