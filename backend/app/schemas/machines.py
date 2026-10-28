"""Machines and their unified timeline (PRD §9.4 machines.py)."""

import datetime as dt
from typing import List, Optional

from pydantic import BaseModel


class MachineOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    name: str
    type: str
    rpm_min: int
    rpm_max: int
    location: Optional[str] = None


class EventOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    machine_id: int
    kind: str  # note, warning, qc_reject, anomaly, maintenance, meeting, run ...
    ref_type: Optional[str] = None
    ref_id: Optional[int] = None
    summary: str
    occurred_at: dt.datetime


class TimelineOut(BaseModel):
    machine_id: int
    machine: str
    items: List[EventOut]
    total: int
    limit: int
    offset: int
