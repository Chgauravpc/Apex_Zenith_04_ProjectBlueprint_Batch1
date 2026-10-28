"""3D Machine Knowledge Map schemas.

Defines schemas for machine components, live telemetry, pinned knowledge notes,
and component-level diagnostics. Reference: TASKS.md T12 / T21 and PRD.md §9.4.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class PinIn(BaseModel):
    title: str = Field(..., max_length=200)
    text: str
    severity: Optional[str] = "info"
    knowledge_type: Optional[str] = "tip"
    type: Optional[str] = None
    author: Optional[str] = None
    mesh_name: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None
    z: Optional[float] = None


class PinOut(BaseModel):
    id: int
    card_id: Optional[int] = None
    component_id: int
    mesh_name: str
    title: str
    text: str
    severity: str = "info"
    knowledge_type: str = "tip"
    author: str
    date: str
    verified: bool = True


class ComponentOut(BaseModel):
    id: int
    machine_id: int
    mesh_name: str
    display_name: str
    category: Optional[str] = None
    description: Optional[str] = None
    risk: str = "low"  # "low", "medium", "high"
    incident_count: int = 0
    status: str = "Optimal / Normal"
    telemetry: Optional[Dict[str, Any]] = None
    position: Optional[List[float]] = None
    pin_position: Optional[List[float]] = None
    specs: Optional[Dict[str, str]] = None
    knowledge_count: Optional[Dict[str, int]] = None
    expert_tips: Optional[List[Dict[str, Any]]] = None
    expert_notes: Optional[List[Dict[str, Any]]] = None
    past_incidents: Optional[List[Dict[str, Any]]] = None
    troubleshooting: Optional[List[Dict[str, Any]]] = None


class ComponentKnowledge(BaseModel):
    component: ComponentOut
    cards: List[Dict[str, Any]] = Field(default_factory=list)
    incidents: List[Dict[str, Any]] = Field(default_factory=list)
    troubleshooting: List[Dict[str, Any]] = Field(default_factory=list)
    specs: Dict[str, str] = Field(default_factory=dict)
    knowledge_count: Dict[str, int] = Field(default_factory=dict)


class MachineLiveTelemetry(BaseModel):
    machine_id: int
    machine_name: str
    status: str  # "online", "running", "warning", "idle", "maintenance"
    spindle_rpm: float = 0.0
    vibration: float = 0.0
    spindle_temp: float = 0.0
    spindle_load: float = 0.0
    doors_open: bool = False
    active_warnings_count: int = 0
    anomalies_count: int = 0
    latest_anomaly: Optional[str] = None
    timestamp: str
