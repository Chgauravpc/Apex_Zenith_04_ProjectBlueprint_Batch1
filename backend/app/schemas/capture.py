"""Schemas for capture (Lane 1).

`ExtractedCard` / `ExtractionResult` are also the JSON shape the LLM must return,
so field descriptions here double as instructions to the model.
"""

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field

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
