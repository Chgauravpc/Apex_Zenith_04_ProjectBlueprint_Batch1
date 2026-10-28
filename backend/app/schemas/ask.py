"""Ask Experience schemas. Field names follow what the frontend reads (AnswerCard, SourceCard)."""

import datetime as dt
from typing import Any, List, Literal, Optional

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
    symptom: Optional[str] = None  # cards: canonical symptom key
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


class AnswerLLM(BaseModel):
    """JSON the answer prompt must return."""

    answer: str
    steps: List[str] = Field(default_factory=list)
    watch_out: Optional[str] = None
    source_ids: List[str] = Field(default_factory=list, description="e.g. card:12")
    confidence: float = Field(0.7, ge=0, le=1)
    not_enough_data: bool = False


class SourceOut(BaseModel):
    """A cited record as shown in SourceCard."""

    id: str  # "card:12"
    kind: str
    title: str
    text: str
    snippet: str
    action: Optional[str] = None
    author: Optional[str] = None
    machine: Optional[str] = None
    component: Optional[str] = None
    media_url: Optional[str] = None
    timestamp: Optional[float] = None
    verified: bool = False
    date: Optional[dt.date] = None


class ExpertOut(BaseModel):
    id: int
    name: str
    cards: int  # verified cards this person has on the machine


class AskAnswer(BaseModel):
    query_id: int
    question: str
    transcript: Optional[str] = None  # for voice questions
    answer: str
    steps: List[str] = Field(default_factory=list)
    watch_out: Optional[str] = None
    sources: List[SourceOut] = Field(default_factory=list)
    experts: List[ExpertOut] = Field(default_factory=list)
    suggested_expert: Optional[str] = None
    suggested_expert_id: Optional[int] = None
    confidence: float = 0.0
    not_enough_data: bool = False
    mode: Literal["live", "offline"] = "live"
    # "keyword" = embeddings were unavailable, so only full-text search ran
    search_mode: Literal["semantic", "keyword"] = "keyword"
    audio_url: Optional[str] = None


class FeedbackIn(BaseModel):
    helpful: bool
    fix_worked: Optional[bool] = None
    note: Optional[str] = Field(None, max_length=1000)


class FeedbackOut(BaseModel):
    query_id: int
    feedback: int
    cards_updated: int


class ExpertCard(BaseModel):
    id: int
    title: str
    action: str
    why: Optional[str] = None
    author: Optional[str] = None


class ChatterResult(BaseModel):
    """Chatter analysis of a machine recording. Advice to learn from; the operator decides."""

    fc: float  # dominant chatter frequency, Hz
    clear_chatter: bool  # peak clearly stands out from the background noise
    prominence: float  # peak magnitude / median magnitude in the band
    tooth_passing_hz: Optional[float] = None
    teeth: int
    current_rpm: Optional[int] = None
    rpm_min: int
    rpm_max: int
    candidate_rpms: List[int]  # stable speeds, k = 1..3, inside the machine's range
    nearest_rpm: Optional[int] = None  # candidate closest to the current speed
    formula: str = "RPM = 60 × fc / (N × k)"
    explanation: str
    expert_card: Optional[ExpertCard] = None


class ChipColour(BaseModel):
    colour: str  # silver / straw / bronze / violet / blue
    hue: float  # OpenCV hue 0..179 (circular mean over chip pixels)
    saturation: float  # 0..255
    value: float  # 0..255
    coverage: float  # % of the photo that is chips


class ChipResult(BaseModel):
    """Chip colour as a learning cue about cutting heat; lighting and coolant affect it."""

    colour: str
    hue: float
    saturation: float
    coverage: float
    temperature_range: str
    severity: Literal["ok", "caution", "stop"]
    diagnosis: str
    recommendation: str
    tool_material: str
    workpiece: str
    note: str = (
        "Colour is a cue, not a measurement: light, coolant and the camera change it. "
        "Compare with the old employee's note and decide."
    )
    expert_card: Optional[ExpertCard] = None


class AnalyticsRequest(BaseModel):
    question: str = Field(min_length=3, max_length=500)


class AnalyticsLLM(BaseModel):
    """JSON from the analytics prompt (or the offline rule matcher)."""

    sql: str
    explanation: str = ""
    chart: Literal["bar", "line", "none"] = "none"


class AnalyticsResult(BaseModel):
    question: str
    sql: str  # shown so people can see exactly what was counted
    columns: List[str]
    rows: List[List[Any]]
    row_count: int
    truncated: bool  # more than 200 rows existed
    chart: Literal["bar", "line", "none"]
    explanation: str
    mode: Literal["live", "offline"]
