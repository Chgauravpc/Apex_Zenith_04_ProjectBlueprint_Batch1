"""Ask Experience schemas. Field names follow what the frontend reads (AnswerCard, SourceCard)."""

import datetime as dt
from typing import Literal, Optional

from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    machine_id: Optional[int] = None
    component_id: Optional[int] = None
    language: Optional[Literal["hi", "mr", "en"]] = None
    asked_by_id: Optional[int] = None


class Hit(BaseModel):
    """One retrieved record, ready to show as a source card."""

    record_type: str  # card / note / qc_reject / maintenance / meeting / procedure
    record_id: int
    score: float  # fused rank score (higher = better)
    kind: str  # label for the UI
    title: str
    text: str  # full text given to the LLM
    snippet: str  # short text for the UI
    action: Optional[str] = None  # cards: what to do
    verified: bool = False
    author_id: Optional[int] = None
    author: Optional[str] = None
    machine_id: Optional[int] = None
    machine: Optional[str] = None
    component_id: Optional[int] = None
    component: Optional[str] = None
    media_url: Optional[str] = None  # photo / voice note / video behind the record
    timestamp: Optional[float] = None  # seconds into the video, when known
    when: Optional[dt.date] = None

    @property
    def ref(self) -> str:
        """Citation id used in prompts and answers, e.g. "card:12"."""
        return f"{self.record_type}:{self.record_id}"
