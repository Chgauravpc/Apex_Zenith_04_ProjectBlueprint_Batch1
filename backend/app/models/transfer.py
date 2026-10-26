"""Old employee → new employee transfer: who knows what, buddies, exit handover, interviews."""

from datetime import date, datetime
from typing import List, Optional

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base, IdMixin, fk


class ExperienceScore(IdMixin, Base):
    """How much an employee knows about a machine (optionally one operation)."""

    __tablename__ = "experience_scores"
    __table_args__ = (UniqueConstraint("employee_id", "machine_id", "operation_id"),)

    employee_id: Mapped[int] = fk("employees.id", nullable=False)
    machine_id: Mapped[int] = fk("machines.id", nullable=False)
    operation_id: Mapped[Optional[int]] = fk("operations.id")
    score: Mapped[float] = mapped_column(Float, default=0.0)
    cards_count: Mapped[int] = mapped_column(Integer, default=0)
    validated_count: Mapped[int] = mapped_column(Integer, default=0)
    years_on_machine: Mapped[float] = mapped_column(Float, default=0.0)


class KnowledgeBuddy(IdMixin, Base):
    """Pairs a new employee with an old employee for one machine."""

    __tablename__ = "knowledge_buddies"
    __table_args__ = (UniqueConstraint("new_employee_id", "machine_id"),)

    new_employee_id: Mapped[int] = fk("employees.id", nullable=False)
    old_employee_id: Mapped[int] = fk("employees.id", nullable=False)
    machine_id: Mapped[int] = fk("machines.id", nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class HandoverPlan(IdMixin, Base):
    """Plan created when the ERP sets an exit date for an employee."""

    __tablename__ = "handover_plans"

    employee_id: Mapped[int] = fk("employees.id", nullable=False)
    exit_date: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(16), default="active", index=True)
    progress: Mapped[float] = mapped_column(Float, default=0.0)  # 0..1, done tasks / all tasks
    # Machines where this person is the only knowledge holder (bus factor = 1).
    sole_holder_machine_ids: Mapped[List[int]] = mapped_column(JSON, default=list)


class HandoverTask(IdMixin, Base):
    __tablename__ = "handover_tasks"

    plan_id: Mapped[int] = fk("handover_plans.id", nullable=False)
    kind: Mapped[str] = mapped_column(String(24))  # interview, video_interview, record_setup ...
    machine_id: Mapped[Optional[int]] = fk("machines.id")
    component_id: Mapped[Optional[int]] = fk("components.id")
    topic: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(16), default="todo", index=True)
    done_at: Mapped[Optional[datetime]] = mapped_column(DateTime)


class InterviewSession(IdMixin, Base):
    """AI interview (or video-stimulated interview) with an old employee."""

    __tablename__ = "interview_sessions"

    employee_id: Mapped[int] = fk("employees.id", nullable=False)
    plan_id: Mapped[Optional[int]] = fk("handover_plans.id")
    machine_id: Mapped[Optional[int]] = fk("machines.id")
    kind: Mapped[str] = mapped_column(String(16), default="ai")  # ai / video
    video_document_id: Mapped[Optional[int]] = fk("documents.id")
    questions: Mapped[List[dict]] = mapped_column(JSON, default=list)  # [{q, gap_id, answered}]
    status: Mapped[str] = mapped_column(String(16), default="open", index=True)


class RoutedQuestion(IdMixin, Base):
    """A question the assistant could not answer, sent to an old employee."""

    __tablename__ = "routed_questions"

    query_id: Mapped[Optional[int]] = fk("queries.id")
    question: Mapped[str] = mapped_column(Text)
    asked_by_id: Mapped[Optional[int]] = fk("employees.id")
    routed_to_id: Mapped[int] = fk("employees.id", nullable=False)
    machine_id: Mapped[Optional[int]] = fk("machines.id")
    status: Mapped[str] = mapped_column(String(16), default="open", index=True)
    answer_card_id: Mapped[Optional[int]] = fk("knowledge_cards.id")
    answered_at: Mapped[Optional[datetime]] = mapped_column(DateTime)


class KnowledgeGap(IdMixin, Base):
    """Topic with missing knowledge; feeds interview questions for old employees."""

    __tablename__ = "knowledge_gaps"
    __table_args__ = (UniqueConstraint("machine_id", "topic"),)

    machine_id: Mapped[Optional[int]] = fk("machines.id")
    component_id: Mapped[Optional[int]] = fk("components.id")
    topic: Mapped[str] = mapped_column(String(200))
    source: Mapped[str] = mapped_column(String(24))  # unanswered_query / uncovered_component
    count: Mapped[int] = mapped_column(Integer, default=1)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
