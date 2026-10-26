"""Step-by-step guidance: versioned procedures, guided runs, skill levels, troubleshooting."""

from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import JSON, Boolean, DateTime, Float, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base, IdMixin, fk

# Skill levels per operator per operation.
SKILL_NOT_TRAINED, SKILL_GUIDED, SKILL_SUPERVISED, SKILL_INDEPENDENT, SKILL_CAN_TEACH = range(5)


class Procedure(IdMixin, Base):
    """One version of a procedure. Versions share `key`; approving creates a new row."""

    __tablename__ = "procedures"
    __table_args__ = (UniqueConstraint("key", "version"),)

    key: Mapped[str] = mapped_column(String(64), index=True)
    title: Mapped[str] = mapped_column(String(200))
    machine_id: Mapped[Optional[int]] = fk("machines.id")
    part_id: Mapped[Optional[int]] = fk("parts.id")
    operation_id: Mapped[Optional[int]] = fk("operations.id")
    version: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(12), default="draft", index=True)  # draft/approved
    author_id: Mapped[Optional[int]] = fk("employees.id")
    approver_id: Mapped[Optional[int]] = fk("employees.id")
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    source_doc_id: Mapped[Optional[int]] = fk("documents.id")  # e.g. the setup video


class ProcedureStep(IdMixin, Base):
    __tablename__ = "procedure_steps"
    __table_args__ = (UniqueConstraint("procedure_id", "step_no"),)

    procedure_id: Mapped[int] = fk("procedures.id", nullable=False)
    step_no: Mapped[int] = mapped_column(Integer)
    instruction: Mapped[str] = mapped_column(Text)
    media_path: Mapped[Optional[str]] = mapped_column(String(255))  # keyframe or image
    clip_start: Mapped[Optional[float]] = mapped_column(Float)  # seconds into source video
    clip_end: Mapped[Optional[float]] = mapped_column(Float)
    params: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    check_name: Mapped[Optional[str]] = mapped_column(String(64))  # e.g. "bore diameter"
    tolerance_min: Mapped[Optional[float]] = mapped_column(Float)
    tolerance_max: Mapped[Optional[float]] = mapped_column(Float)
    unit: Mapped[Optional[str]] = mapped_column(String(16))
    safety: Mapped[Optional[str]] = mapped_column(String(120))
    critical: Mapped[bool] = mapped_column(Boolean, default=False)  # shown at every skill level
    expected_seconds: Mapped[Optional[int]] = mapped_column(Integer)
    component_id: Mapped[Optional[int]] = fk("components.id")


class GuidedRun(IdMixin, Base):
    __tablename__ = "guided_runs"

    procedure_id: Mapped[int] = fk("procedures.id", nullable=False)
    employee_id: Mapped[int] = fk("employees.id", nullable=False)
    work_order_id: Mapped[Optional[int]] = fk("work_orders.id")
    skill_level: Mapped[int] = mapped_column(Integer, default=SKILL_GUIDED)
    status: Mapped[str] = mapped_column(String(12), default="running", index=True)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime)


class RunStep(IdMixin, Base):
    __tablename__ = "run_steps"

    run_id: Mapped[int] = fk("guided_runs.id", nullable=False)
    step_id: Mapped[int] = fk("procedure_steps.id", nullable=False)
    seconds: Mapped[Optional[int]] = mapped_column(Integer)
    values: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    photo_path: Mapped[Optional[str]] = mapped_column(String(255))
    passed: Mapped[Optional[bool]] = mapped_column(Boolean)
    deviation: Mapped[Optional[str]] = mapped_column(Text)


class SkillMatrix(IdMixin, Base):
    __tablename__ = "skill_matrix"
    __table_args__ = (UniqueConstraint("employee_id", "operation_id"),)

    employee_id: Mapped[int] = fk("employees.id", nullable=False)
    operation_id: Mapped[int] = fk("operations.id", nullable=False)
    level: Mapped[int] = mapped_column(Integer, default=SKILL_NOT_TRAINED)
    signed_off_by_id: Mapped[Optional[int]] = fk("employees.id")
    signed_off_at: Mapped[Optional[datetime]] = mapped_column(DateTime)


class TroubleshootNode(IdMixin, Base):
    """Node of a per-machine decision tree: symptom → cause → check → fix."""

    __tablename__ = "troubleshoot_nodes"

    machine_id: Mapped[int] = fk("machines.id", nullable=False)
    parent_id: Mapped[Optional[int]] = fk("troubleshoot_nodes.id", ondelete="CASCADE")
    kind: Mapped[str] = mapped_column(String(10))  # symptom / cause / check / fix
    text: Mapped[str] = mapped_column(Text)
    card_id: Mapped[Optional[int]] = fk("knowledge_cards.id")
    frequency: Mapped[int] = mapped_column(Integer, default=0)


class QuizItem(IdMixin, Base):
    __tablename__ = "quiz_items"

    card_id: Mapped[int] = fk("knowledge_cards.id", nullable=False)
    machine_id: Mapped[Optional[int]] = fk("machines.id")
    question: Mapped[str] = mapped_column(Text)
    answer: Mapped[str] = mapped_column(Text)
