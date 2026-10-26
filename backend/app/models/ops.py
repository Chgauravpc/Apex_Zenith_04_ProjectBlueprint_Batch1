"""Operational tables: background jobs, machine timeline, sensors, queries, LLM cache, audit."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from sqlalchemy import JSON, Boolean, DateTime, Float, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base, IdMixin, fk, utcnow

JOB_STATUSES = ("queued", "running", "done", "failed")


def _job_id() -> str:
    return uuid4().hex


class Job(Base):
    """Status of slow work (video, handwriting) that the client polls via GET /api/jobs/{id}."""

    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_job_id)
    kind: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(10), default="queued", index=True)
    result: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON)
    error: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class Event(IdMixin, Base):
    """One entry on a machine's unified timeline (ERP, sensors, notes, warnings, runs)."""

    __tablename__ = "events"
    __table_args__ = (Index("ix_events_machine_time", "machine_id", "occurred_at"),)

    machine_id: Mapped[int] = fk("machines.id", nullable=False)
    kind: Mapped[str] = mapped_column(String(24))  # note, warning, qc_reject, anomaly, run ...
    ref_type: Mapped[Optional[str]] = mapped_column(String(32))
    ref_id: Mapped[Optional[int]] = mapped_column(Integer)
    summary: Mapped[str] = mapped_column(Text)
    occurred_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class SensorReading(IdMixin, Base):
    __tablename__ = "sensor_readings"
    # Readings are always read per machine + sensor over a time window.
    __table_args__ = (Index("ix_readings_machine_sensor_ts", "machine_id", "sensor", "ts"),)

    machine_id: Mapped[int] = fk("machines.id", nullable=False)
    sensor: Mapped[str] = mapped_column(String(32))  # vibration, spindle_temp, spindle_load
    value: Mapped[float] = mapped_column(Float)
    ts: Mapped[datetime] = mapped_column(DateTime)


class Anomaly(IdMixin, Base):
    __tablename__ = "anomalies"

    machine_id: Mapped[int] = fk("machines.id", nullable=False)
    sensor: Mapped[str] = mapped_column(String(32))
    value: Mapped[float] = mapped_column(Float)
    zscore: Mapped[float] = mapped_column(Float)
    ts: Mapped[datetime] = mapped_column(DateTime, index=True)


class Query(IdMixin, Base):
    """A question asked in Ask Experience, its answer and the learning-loop feedback."""

    __tablename__ = "queries"

    question: Mapped[str] = mapped_column(Text)
    language: Mapped[Optional[str]] = mapped_column(String(8))
    asked_by_id: Mapped[Optional[int]] = fk("employees.id")
    machine_id: Mapped[Optional[int]] = fk("machines.id")
    component_id: Mapped[Optional[int]] = fk("components.id")
    answer: Mapped[Optional[str]] = mapped_column(Text)
    sources: Mapped[List[dict]] = mapped_column(JSON, default=list)
    answered: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    mode: Mapped[str] = mapped_column(String(8), default="live")
    feedback: Mapped[Optional[int]] = mapped_column(Integer)  # +1 / -1
    fix_worked: Mapped[Optional[bool]] = mapped_column(Boolean)


class Notification(IdMixin, Base):
    """In-app notification (Guardian escalation, routed question, handover task).

    Not listed in PRD §9.2; needed by Note Guardian's "notify supervisor + old employee" step.
    """

    __tablename__ = "notifications"

    employee_id: Mapped[int] = fk("employees.id", nullable=False)
    kind: Mapped[str] = mapped_column(String(24))
    ref_type: Mapped[Optional[str]] = mapped_column(String(32))
    ref_id: Mapped[Optional[int]] = mapped_column(Integer)
    message: Mapped[str] = mapped_column(Text)
    read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)


class LLMCache(Base):
    """Cached provider response keyed by sha256(model + prompt + schema); saves free quota."""

    __tablename__ = "llm_cache"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    model: Mapped[str] = mapped_column(String(120))
    value: Mapped[str] = mapped_column(Text)  # validated JSON
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class AuditLog(IdMixin, Base):
    """Every AI action and every human approval, for traceability."""

    __tablename__ = "audit_log"

    actor_id: Mapped[Optional[int]] = fk("employees.id")
    action: Mapped[str] = mapped_column(String(48), index=True)
    target_type: Mapped[Optional[str]] = mapped_column(String(32))
    target_id: Mapped[Optional[int]] = mapped_column(Integer)
    detail: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
