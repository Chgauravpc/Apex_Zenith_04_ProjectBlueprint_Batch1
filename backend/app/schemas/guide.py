"""Step-by-step guidance schemas. Step fields follow the frontend's StepView / StepList."""

import datetime as dt
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field

from app.schemas.guardian import Finding

SKILL_LABELS = {0: "Not trained", 1: "Guided", 2: "Supervised", 3: "Independent", 4: "Can teach"}


class StepOut(BaseModel):
    id: int
    step_no: int
    title: str
    instruction: str
    component_id: Optional[int] = None
    component: Optional[str] = None
    keyframe_url: Optional[str] = None
    clip_start: Optional[float] = None
    clip_end: Optional[float] = None
    param_name: Optional[str] = None  # the value to measure at this step
    param_unit: Optional[str] = None
    target_value: Optional[float] = None
    tolerance: Optional[float] = None  # ± around target_value
    tolerance_min: Optional[float] = None
    tolerance_max: Optional[float] = None
    params: Dict[str, float] = Field(default_factory=dict)  # settings to use
    safety: Optional[str] = None
    critical: bool = False
    expected_seconds: Optional[int] = None
    expert_tip: Optional[str] = None  # an old employee's verified tip for this part
    expert_tip_author: Optional[str] = None
    expert_tip_card_id: Optional[int] = None


class ProcedureSummary(BaseModel):
    id: int
    key: str
    title: str
    machine_id: Optional[int] = None
    machine: Optional[str] = None
    version: int
    status: str
    steps_count: int
    author: Optional[str] = None
    approver: Optional[str] = None
    approved_at: Optional[dt.datetime] = None


class ProcedureOut(ProcedureSummary):
    steps: List[StepOut]


class StepEdit(BaseModel):
    step_no: int
    instruction: Optional[str] = Field(None, min_length=1, max_length=2000)
    safety: Optional[str] = None
    critical: Optional[bool] = None


class ProcedureUpdate(BaseModel):
    """approve: publish a new approved version; edit: change a draft in place."""

    action: Literal["approve", "edit"]
    approver_id: int
    title: Optional[str] = Field(None, max_length=200)
    steps: List[StepEdit] = Field(default_factory=list)


class RunStartIn(BaseModel):
    employee_id: int
    work_order_id: Optional[int] = None
    procedure_id: Optional[int] = None


class GuidedRunOut(BaseModel):
    run_id: int
    employee_id: int
    skill_level: int
    skill_label: str
    view: Literal["full", "condensed", "checklist"]
    procedure: ProcedureOut  # steps already filtered for this skill level


class RunStepIn(BaseModel):
    step_no: int
    value: Optional[float] = None  # the measured value for the step's check
    values: Dict[str, float] = Field(default_factory=dict)  # settings actually used
    notes: Optional[str] = Field(None, max_length=2000)


class RunStepOut(BaseModel):
    run_id: int
    step_no: int
    passed: bool
    warnings: List[Finding] = Field(default_factory=list)
    can_continue: bool  # False on a stop-level warning: check with the buddy first
    next_step_no: Optional[int] = None
    run_status: str


class SkillOut(BaseModel):
    operation_id: int
    operation: str
    level: int
    label: str
    signed_off_by: Optional[str] = None
    clean_runs: int
    runs_needed: int  # clean runs still needed before sign-off can promote


class PromoteIn(BaseModel):
    operation_id: int
    signed_off_by: int


class PromoteOut(BaseModel):
    promoted: bool
    skill: SkillOut
    reason: str
