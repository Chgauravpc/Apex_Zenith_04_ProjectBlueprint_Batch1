"""3D Machine Knowledge Map endpoints.

Reference: TASKS.md T12 / T21, PRD.md §9.4, and ENGINEERING.md.
"""

from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import NotFound
from app.schemas.map3d import ComponentKnowledge, ComponentOut, MachineLiveTelemetry, PinIn, PinOut
from app.services.map3d import components, pins

router = APIRouter(tags=["map3d"])


@router.get("/machines/{machine_id}/components", response_model=List[ComponentOut])
def get_machine_components(
    machine_id: int,
    db: Session = Depends(get_db),
) -> List[ComponentOut]:
    """Retrieve 3D components for a machine with live telemetry and risk status."""
    return components.list_components(db, machine_id)


@router.get("/machines/{machine_id}/telemetry", response_model=MachineLiveTelemetry)
def get_machine_telemetry(
    machine_id: int,
    db: Session = Depends(get_db),
) -> MachineLiveTelemetry:
    """Fetch live sensor telemetry, vibration, and alarms for the 3D machine viewer."""
    return components.get_machine_telemetry(db, machine_id)


@router.get("/components/{component_id}/knowledge", response_model=ComponentKnowledge)
def get_component_knowledge(
    component_id: int,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> ComponentKnowledge:
    """Retrieve verified knowledge cards, historical incidents, and troubleshooting for a component."""
    data = components.component_knowledge(db, component_id, limit=limit, offset=offset)
    if not data:
        raise NotFound("Component", component_id)
    return data


@router.post("/components/{component_id}/pins", response_model=PinOut)
def create_pin_endpoint(
    component_id: int,
    pin: PinIn,
    db: Session = Depends(get_db),
) -> PinOut:
    """Attach and pin a new verified know-how card to a 3D component."""
    return pins.create_pin(db, component_id, pin)
