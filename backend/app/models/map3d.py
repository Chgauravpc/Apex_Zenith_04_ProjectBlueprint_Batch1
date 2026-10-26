"""Machine components and 3D pins.

Shared contract with the 3D teammate (TASKS.md ownership): the AI track uses
`components` as a plain list of machine parts (spindle, ATC, coolant ...) and
only ever stores an optional `component_id`. The 3D viewer adds meaning to
`mesh_name`, `MachineModel` and `ComponentPin` coordinates.
"""

from typing import List, Optional

from sqlalchemy import JSON, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base, IdMixin, fk


class MachineModel(IdMixin, Base):
    __tablename__ = "machine_models"

    machine_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("machines.id", ondelete="CASCADE"), unique=True
    )  # one model per machine; unique also gives the index
    glb_path: Mapped[str] = mapped_column(String(255))


class Component(IdMixin, Base):
    __tablename__ = "components"
    __table_args__ = (UniqueConstraint("machine_id", "mesh_name"),)

    machine_id: Mapped[int] = fk("machines.id", nullable=False)
    mesh_name: Mapped[str] = mapped_column(String(80))  # node name in the GLB, e.g. "spindle"
    display_name: Mapped[str] = mapped_column(String(80))
    # Synonyms in en/hi/mr used to auto-link notes to this component ("spindle", "स्पिंडल").
    aliases: Mapped[List[str]] = mapped_column(JSON, default=list)


class ComponentPin(IdMixin, Base):
    __tablename__ = "component_pins"

    card_id: Mapped[int] = fk("knowledge_cards.id", nullable=False)
    component_id: Mapped[int] = fk("components.id", nullable=False)
    x: Mapped[Optional[float]] = mapped_column(Float)
    y: Mapped[Optional[float]] = mapped_column(Float)
    z: Mapped[Optional[float]] = mapped_column(Float)
    author_id: Mapped[Optional[int]] = fk("employees.id")
