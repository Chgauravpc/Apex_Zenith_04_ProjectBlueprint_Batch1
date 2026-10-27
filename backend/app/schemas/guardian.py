"""Note Guardian schemas.

Field names follow what the frontend reads (WarningBanner / EvidenceList):
severity, warnings[].message, evidence[] {id, kind, title, date, detail}, expert_fix,
author_name, component_id.
"""

import datetime as dt
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field

Severity = Literal["info", "caution", "stop"]
SEVERITY_RANK: Dict[str, int] = {"info": 0, "caution": 1, "stop": 2}


class NoteIn(BaseModel):
    """A note to save and check (typed in the PWA, the ERP widget or a guided step)."""

    text: str = Field(min_length=1, max_length=8000)
    author_id: int
    machine_id: Optional[int] = None
    # Optional structured values the UI already knows (e.g. from a guided-job step form).
    params: Dict[str, float] = Field(default_factory=dict)
    symptoms: List[str] = Field(default_factory=list)


class Evidence(BaseModel):
    """A real record that supports a warning."""

    type: str  # maintenance / qc_reject / card / note / param_limit / anomaly / meeting
    id: int
    kind: str  # human label shown in the UI, e.g. "Breakdown", "QC reject"
    title: str
    date: Optional[dt.date] = None
    detail: Optional[str] = None


class Finding(BaseModel):
    """One problem found by a rule or by the grounded LLM check."""

    rule: str  # param_limit / precursor / maintenance / anomaly / llm
    severity: Severity
    message: str
    evidence: List[Evidence] = Field(default_factory=list)


class WarningOut(BaseModel):
    id: Optional[int] = None  # saved Warning row id
    severity: Severity
    message: str
    rule: str


class GuardianResult(BaseModel):
    """Answer returned the moment a note is saved."""

    note_id: int
    severity: Optional[Severity] = None  # None = no known issues
    warnings: List[WarningOut] = Field(default_factory=list)
    evidence: List[Evidence] = Field(default_factory=list)
    expert_fix: Optional[str] = None  # what the old employee did last time
    expert_card_id: Optional[int] = None
    author_name: Optional[str] = None  # the old employee behind expert_fix
    component_id: Optional[int] = None
    machine_id: Optional[int] = None
    mode: Literal["live", "offline"] = "live"  # offline = rules only, no LLM reached
    message: str = "No known issues for this note."


# --- plain-data inputs for the pure rule functions -------------------------------------------


class ParamLimitDTO(BaseModel):
    id: int
    param: str
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    unit: str = ""
    note: Optional[str] = None


class PrecursorStat(BaseModel):
    id: int
    symptom: str
    failure_kind: str
    preceded_count: int
    total_failures: int
    evidence_ids: List[int] = Field(default_factory=list)
