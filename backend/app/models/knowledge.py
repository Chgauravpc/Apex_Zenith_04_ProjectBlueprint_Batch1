"""Captured knowledge: raw source documents and the structured items extracted from them.

A `Document` is what someone handed in (voice note, video, photo of a
handwritten page, typed note). `KnowledgeCard`s, meetings and action items are
extracted from it and always point back via `source_doc_id`, so every answer
can cite the original evidence and the person who gave it.
"""

from datetime import date, datetime
from typing import Any, Dict, Optional

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, LargeBinary, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base, IdMixin, fk

DOC_TYPES = ("text", "voice", "video", "handwritten", "sop", "erp")


class Document(IdMixin, Base):
    __tablename__ = "documents"

    type: Mapped[str] = mapped_column(String(16), index=True)  # one of DOC_TYPES
    file_path: Mapped[Optional[str]] = mapped_column(String(255))
    text: Mapped[Optional[str]] = mapped_column(Text)  # typed text or transcript / OCR
    language: Mapped[Optional[str]] = mapped_column(String(8))
    uploader_id: Mapped[Optional[int]] = fk("employees.id")
    machine_id: Mapped[Optional[int]] = fk("machines.id")
    consent: Mapped[bool] = mapped_column(Boolean, default=True)  # recording consent


class KnowledgeCard(IdMixin, Base):
    """One piece of know-how: in this context, when you see X, do Y, because Z."""

    __tablename__ = "knowledge_cards"

    title: Mapped[str] = mapped_column(String(200))
    machine_id: Mapped[Optional[int]] = fk("machines.id")
    component_id: Mapped[Optional[int]] = fk("components.id")
    part_id: Mapped[Optional[int]] = fk("parts.id")
    material_id: Mapped[Optional[int]] = fk("materials.id")
    operation_id: Mapped[Optional[int]] = fk("operations.id")
    context: Mapped[Optional[str]] = mapped_column(Text)
    symptom: Mapped[Optional[str]] = mapped_column(String(80), index=True)  # canonical lexicon key
    action: Mapped[str] = mapped_column(Text)
    why: Mapped[Optional[str]] = mapped_column(Text)
    params: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)  # {"feed": 0.2, ...}
    author_id: Mapped[Optional[int]] = fk("employees.id")
    confidence: Mapped[float] = mapped_column(Float, default=1.0)  # extraction confidence 0..1
    verified_by_id: Mapped[Optional[int]] = fk("employees.id")
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    source_doc_id: Mapped[Optional[int]] = fk("documents.id")
    unofficial: Mapped[bool] = mapped_column(Boolean, default=False)  # proven but not in the SOP
    score: Mapped[float] = mapped_column(Float, default=0.0)  # learning-loop feedback
    # float32 vector from embeddings.embed(); 384 dims = 1.5 KB. Filled on write.
    embedding: Mapped[Optional[bytes]] = mapped_column(LargeBinary)


class Meeting(IdMixin, Base):
    __tablename__ = "meetings"

    document_id: Mapped[Optional[int]] = fk("documents.id")
    held_on: Mapped[date] = mapped_column(Date, index=True)
    title: Mapped[str] = mapped_column(String(200))
    summary: Mapped[Optional[str]] = mapped_column(Text)


class ActionItem(IdMixin, Base):
    __tablename__ = "action_items"

    meeting_id: Mapped[int] = fk("meetings.id", nullable=False)
    text: Mapped[str] = mapped_column(Text)
    owner_id: Mapped[Optional[int]] = fk("employees.id")
    machine_id: Mapped[Optional[int]] = fk("machines.id")
    due_on: Mapped[Optional[date]] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(16), default="open", index=True)


class SoundClip(IdMixin, Base):
    """Labelled machine sound recorded by an old employee ("worn insert", "normal")."""

    __tablename__ = "sound_clips"

    machine_id: Mapped[int] = fk("machines.id", nullable=False)
    component_id: Mapped[Optional[int]] = fk("components.id")
    label: Mapped[str] = mapped_column(String(80))
    file_path: Mapped[str] = mapped_column(String(255))
    fingerprint: Mapped[Optional[bytes]] = mapped_column(LargeBinary)  # float32 spectrum
    contributor_id: Mapped[Optional[int]] = fk("employees.id")
    card_id: Mapped[Optional[int]] = fk("knowledge_cards.id")


class ChipSample(IdMixin, Base):
    """Photo of chips with the colour/shape read from it and the expert's note."""

    __tablename__ = "chip_samples"

    machine_id: Mapped[Optional[int]] = fk("machines.id")
    file_path: Mapped[str] = mapped_column(String(255))
    colour: Mapped[Optional[str]] = mapped_column(String(16))  # silver / straw / blue / violet
    shape: Mapped[Optional[str]] = mapped_column(String(24))
    tool_material: Mapped[Optional[str]] = mapped_column(String(20))
    material_id: Mapped[Optional[int]] = fk("materials.id")
    contributor_id: Mapped[Optional[int]] = fk("employees.id")
    card_id: Mapped[Optional[int]] = fk("knowledge_cards.id")
