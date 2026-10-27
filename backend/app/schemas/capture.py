"""Schemas for capture (Lane 1).

`ExtractedCard` / `ExtractionResult` are also the JSON shape the LLM must return,
so field descriptions here double as instructions to the model.
"""

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, model_validator

Mode = Literal["live", "offline"]


class ExtractedCard(BaseModel):
    """One piece of know-how pulled out of a note, before it is saved."""

    title: str = Field(description="Short title, same language as the note, max 80 chars")
    machine: Optional[str] = Field(None, description="Machine name as written, e.g. VMC-3")
    component: Optional[str] = Field(
        None, description="Machine part as written, e.g. spindle, coolant nozzle, chuck"
    )
    symptom: Optional[str] = Field(
        None,
        description="One canonical key: chatter, noise, vibration, overheating, "
        "dimension_drift, poor_finish, tool_break, coolant_leak, alarm, burr, chip_colour",
    )
    context: Optional[str] = Field(None, description="When/where it applies: material, job")
    action: str = Field(description="What the person did or advises doing")
    why: Optional[str] = Field(None, description="The reason, if the note gives one")
    params: Dict[str, float] = Field(
        default_factory=dict, description='Numbers mentioned, e.g. {"feed": 0.12}'
    )
    confidence: float = Field(0.8, ge=0, le=1, description="How sure you are, 0..1")
    unofficial: bool = Field(
        False, description="True if it is a workaround that differs from the normal procedure"
    )
    mode: Mode = Field("live", description="Set by the server; leave as live")


class ExtractionResult(BaseModel):
    """Top-level JSON object returned by the extraction prompt."""

    cards: List[ExtractedCard] = Field(default_factory=list)


class TextNoteIn(BaseModel):
    """Typed note from the PWA or the ERP widget."""

    text: str = Field(min_length=1, max_length=8000)
    author_id: int
    machine_id: Optional[int] = None
    language: Optional[Literal["hi", "mr", "en"]] = None


class CardOut(BaseModel):
    """A saved Know-How Card as shown to the user."""

    model_config = {"from_attributes": True}

    id: int
    title: str
    machine_id: Optional[int] = None
    component_id: Optional[int] = None
    symptom: Optional[str] = None
    context: Optional[str] = None
    action: str
    why: Optional[str] = None
    params: Dict[str, float] = Field(default_factory=dict)
    confidence: float
    author_id: Optional[int] = None
    verified_by_id: Optional[int] = None
    unofficial: bool = False


class VoiceNoteOut(BaseModel):
    """Result of saving a typed or spoken note."""

    document_id: int
    transcript: Optional[str] = None  # None for typed notes or when speech-to-text is down
    language: Optional[str] = None
    cards: List[CardOut] = Field(default_factory=list)
    mode: Mode = "live"  # offline = rules/lexicon only, no AI provider reached
    message: Optional[str] = None
    # Filled by Note Guardian (registered on the on_note_saved hook); None until it runs.
    guardian: Optional[Dict[str, Any]] = None
    # Same object under the name the frontend's NoteEditor / VoiceRecorder read.
    guardian_result: Optional[Dict[str, Any]] = None

    @model_validator(mode="after")
    def _mirror_guardian(self) -> "VoiceNoteOut":
        self.guardian_result = self.guardian
        return self


class DraftStep(BaseModel):
    """One step proposed from the video; the old employee reviews it before approval."""

    frame_index: int = Field(ge=0, description="0-based index of the frame showing this step")
    instruction: str = Field(description="What to do, short and concrete")
    params: Dict[str, float] = Field(default_factory=dict)
    safety: Optional[str] = None
    check_name: Optional[str] = Field(None, description="Measurement taken, e.g. thickness")
    tolerance_min: Optional[float] = None
    tolerance_max: Optional[float] = None
    unit: Optional[str] = None


class VideoProcedureDraft(BaseModel):
    """JSON returned by the vision model for a setup video."""

    title: str = Field(description="Short name of the job, e.g. Face milling FL-101")
    steps: List[DraftStep] = Field(default_factory=list)


class JobCreated(BaseModel):
    job_id: str


class JobOut(BaseModel):
    """Status of a background job; `result` holds ids of what was created."""

    model_config = {"from_attributes": True}

    id: str
    kind: str
    status: Literal["queued", "running", "done", "failed"]
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class NoteItem(BaseModel):
    text: str
    machine: Optional[str] = Field(None, description="Machine name as written, if any")
    confidence: float = Field(0.8, ge=0, le=1)


class ActionItemIn(NoteItem):
    owner: Optional[str] = Field(None, description="Person's name as written")
    due: Optional[str] = Field(None, description="Due date YYYY-MM-DD if written")


class HandwrittenResult(BaseModel):
    """What the vision model read from the page; ids are filled in by the server."""

    title: str = Field("Handwritten note", description="Short title, e.g. Shift meeting")
    meeting_date: Optional[str] = Field(None, description="YYYY-MM-DD if written on the page")
    text: str = Field("", description="Everything readable, line by line")
    issues: List[NoteItem] = Field(default_factory=list)
    decisions: List[NoteItem] = Field(default_factory=list)
    action_items: List[ActionItemIn] = Field(default_factory=list)
    document_id: Optional[int] = Field(None, description="Set by the server")
    meeting_id: Optional[int] = Field(None, description="Set by the server")
    needs_review: int = Field(0, description="Set by the server: low-confidence items")


class Reading(BaseModel):
    ts: datetime
    value: float


class SensorBatchIn(BaseModel):
    """Readings of one sensor on one machine, oldest first (simulator or gateway)."""

    machine_id: int
    sensor: Literal["vibration", "spindle_temp", "spindle_load"]
    readings: List[Reading] = Field(min_length=1, max_length=10000)


class IngestReport(BaseModel):
    stored: int
    anomalies: int
    anomaly_ids: List[int] = Field(default_factory=list)


class SyncReport(BaseModel):
    """Per ERP DocType: how many rows were created, updated, unchanged or skipped."""

    created: Dict[str, int] = Field(default_factory=dict)
    updated: Dict[str, int] = Field(default_factory=dict)
    unchanged: Dict[str, int] = Field(default_factory=dict)
    skipped: Dict[str, int] = Field(default_factory=dict)


class ErpWebhookIn(BaseModel):
    """Event pushed by the ERP. `data` uses ERP record names (external ids)."""

    event: Literal["job_start", "job_close", "qc_reject", "exit_date_set"]
    data: Dict[str, Any]


class ReviewIn(BaseModel):
    """An old employee or supervisor approving, correcting or rejecting a captured card."""

    reviewer_id: int
    action: Literal["approve", "edit", "reject"]
    title: Optional[str] = Field(None, max_length=200)
    action_text: Optional[str] = Field(None, description="Corrected 'what to do' text")
    why: Optional[str] = None
    symptom: Optional[str] = None
    params: Optional[Dict[str, float]] = None


class ReviewQueueOut(BaseModel):
    items: List[CardOut]
    total: int
    limit: int
    offset: int


class ReviewOut(BaseModel):
    outcome: Literal["verified", "rejected"]
    card: CardOut
