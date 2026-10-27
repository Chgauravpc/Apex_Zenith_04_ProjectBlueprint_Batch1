"""ShadowTrace: the old employee's recorded run, step by step.

A new employee doing a guided job sees, at each step, the exact clip of the old
employee doing that step and the machine parts they checked there.
"""

from typing import List

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import NotFound
from app.models.erp import Employee
from app.models.guide import Procedure, ProcedureStep
from app.models.knowledge import Document
from app.models.map3d import Component
from app.schemas.guide import ShadowTraceOut, TraceStep
from app.services.ask.search import media_url


def shadow_trace(db: Session, procedure_id: int) -> List[TraceStep]:
    """Clip range and checked parts per step (component ids from the steps; no 3D needed)."""
    steps = list(
        db.execute(
            select(ProcedureStep)
            .filter_by(procedure_id=procedure_id)
            .order_by(ProcedureStep.step_no)
        ).scalars()
    )
    comp_ids = {s.component_id for s in steps if s.component_id}
    names = (
        dict(
            db.execute(
                select(Component.id, Component.display_name).where(Component.id.in_(comp_ids))
            ).all()
        )
        if comp_ids
        else {}
    )
    return [
        TraceStep(
            step_no=s.step_no,
            instruction=s.instruction,
            clip_start=s.clip_start,
            clip_end=s.clip_end,
            component_ids=[s.component_id] if s.component_id else [],
            components_checked=[names[s.component_id]] if s.component_id in names else [],
        )
        for s in steps
    ]


def shadow_trace_out(db: Session, procedure_id: int) -> ShadowTraceOut:
    proc = db.get(Procedure, procedure_id)
    if proc is None:
        raise NotFound(f"procedure {procedure_id} not found")
    video = db.get(Document, proc.source_doc_id) if proc.source_doc_id else None
    author = db.get(Employee, proc.author_id) if proc.author_id else None
    return ShadowTraceOut(
        procedure_id=proc.id,
        title=proc.title,
        author=author.name if author else None,
        video_url=media_url(video.file_path) if video else None,
        steps=shadow_trace(db, proc.id),
    )
