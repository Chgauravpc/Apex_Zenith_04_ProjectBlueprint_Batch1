"""Note Guardian data: approved parameter limits, failure precursor stats and warnings."""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import JSON, DateTime, Float, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base, IdMixin, fk

SEVERITIES = ("info", "caution", "stop")  # ordered: higher index = more serious
WARNING_STATUSES = ("open", "acknowledged", "false_alarm", "resolved")


class ParamLimit(IdMixin, Base):
    """Approved range for one parameter, optionally narrowed to a material/operation."""

    __tablename__ = "param_limits"

    machine_id: Mapped[int] = fk("machines.id", nullable=False)
    material_id: Mapped[Optional[int]] = fk("materials.id")
    operation_id: Mapped[Optional[int]] = fk("operations.id")
    param: Mapped[str] = mapped_column(String(32), index=True)  # feed, speed, depth, temp ...
    min_value: Mapped[Optional[float]] = mapped_column(Float)
    max_value: Mapped[Optional[float]] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(16))  # mm/rev, rpm, mm, °C
    set_by_id: Mapped[Optional[int]] = fk("employees.id")
    note: Mapped[Optional[str]] = mapped_column(Text)


class FailurePrecursor(IdMixin, Base):
    """How often a symptom came before a failure on a machine (from history).

    Example: "chatter" preceded 3 of the last 4 spindle failures on VMC-3.
    """

    __tablename__ = "failure_precursors"
    __table_args__ = (UniqueConstraint("machine_id", "symptom", "failure_kind"),)

    machine_id: Mapped[int] = fk("machines.id", nullable=False)
    component_id: Mapped[Optional[int]] = fk("components.id")
    symptom: Mapped[str] = mapped_column(String(80), index=True)
    failure_kind: Mapped[str] = mapped_column(String(80))  # spindle bearing failure, QC reject ...
    preceded_count: Mapped[int] = mapped_column(Integer, default=0)
    total_failures: Mapped[int] = mapped_column(Integer, default=0)
    evidence_ids: Mapped[List[int]] = mapped_column(JSON, default=list)  # maintenance/reject ids
    last_seen: Mapped[Optional[datetime]] = mapped_column(DateTime)


class Warning(IdMixin, Base):  # noqa: A001  (domain name; shadows builtin only in this module)
    __tablename__ = "warnings"

    note_id: Mapped[int] = fk("documents.id", nullable=False)
    employee_id: Mapped[Optional[int]] = fk("employees.id")
    machine_id: Mapped[Optional[int]] = fk("machines.id")
    component_id: Mapped[Optional[int]] = fk("components.id")
    severity: Mapped[str] = mapped_column(String(10), index=True)  # one of SEVERITIES
    message: Mapped[str] = mapped_column(Text)
    # Cited records as {"type": "maintenance", "id": 12}; never empty for a saved warning.
    evidence: Mapped[List[dict]] = mapped_column(JSON, default=list)
    card_id: Mapped[Optional[int]] = fk("knowledge_cards.id")  # what the old employee did
    status: Mapped[str] = mapped_column(String(16), default="open", index=True)
    response: Mapped[Optional[str]] = mapped_column(Text)  # employee's reply / false-alarm reason
    mode: Mapped[str] = mapped_column(String(8), default="live")  # live / offline (rules only)
