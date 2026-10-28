"""Knowledge risk and exit handover.

Risk: for every machine and part, how many old employees hold verified know-how, and how
many of them will still be here (bus factor). Handover: when the ERP sets an exit date,
plan what that person must pass on before leaving: machines only they know, parts nobody
has recorded, open questions, cards waiting for their review.
"""

import logging
from datetime import date, timedelta
from typing import Dict, List, Optional

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.errors import NotFound, ValidationFailed
from app.models.erp import ROLE_OLD, Employee, Machine
from app.models.knowledge import KnowledgeCard
from app.models.map3d import Component
from app.models.transfer import HandoverPlan, HandoverTask, KnowledgeGap
from app.schemas.transfer import HandoverPlanOut, HandoverTaskOut, RiskCell
from app.services.transfer.profiles import Holder, holders
from app.utils.audit import audit

logger = logging.getLogger(__name__)

LEAVING_WITHIN = timedelta(days=365)  # an exit inside a year counts as "leaving"
MAX_GAP_TASKS = 5


def _leaving(h: Holder, today: date) -> bool:
    return h.exit_date is not None and h.exit_date <= today + LEAVING_WITHIN


def _cell(
    machine: Machine, comp: Optional[Component], who: List[Holder], coverage: int, today: date
) -> RiskCell:
    staying = [h for h in who if not _leaving(h, today)]
    bus = len(staying)
    top = who[0] if who else None
    return RiskCell(
        machine_id=machine.id,
        component_id=comp.id if comp else None,
        name=f"{machine.name} · {comp.display_name}" if comp else machine.name,
        cards=sum(h.cards for h in who),
        holders=len(who),
        bus=bus,
        coverage=coverage,
        expert=top.name if top else None,
        expert_id=top.employee_id if top else None,
        expert_leaving_on=top.exit_date if top and _leaving(top, today) else None,
        status="critical" if bus == 0 else "at_risk" if bus == 1 else "ok",
    )


def knowledge_risk(db: Session, machine_id: Optional[int] = None) -> List[RiskCell]:
    """Risk cells for each machine followed by its parts, most at-risk machines first."""
    today = date.today()
    who = holders(db, machine_id)
    stmt = select(Machine).order_by(Machine.id)
    if machine_id is not None:
        stmt = stmt.where(Machine.id == machine_id)
    machines = list(db.execute(stmt).scalars())
    comps: Dict[int, List[Component]] = {}
    for c in db.execute(select(Component).order_by(Component.id)).scalars():
        comps.setdefault(c.machine_id, []).append(c)
    rank = {"critical": 0, "at_risk": 1, "ok": 2}
    cells: List[RiskCell] = []
    for m in machines:
        parts = comps.get(m.id, [])
        covered = sum(1 for c in parts if who.get((m.id, c.id)))
        machine_cell = _cell(
            m,
            None,
            who.get((m.id, None), []),
            round(100 * covered / len(parts)) if parts else 0,
            today,
        )
        part_cells = [
            _cell(m, c, who.get((m.id, c.id), []), 100 if who.get((m.id, c.id)) else 0, today)
            for c in parts
        ]
        cells.append(machine_cell)
        cells.extend(part_cells)
    order = {c.machine_id: rank[c.status] for c in cells if c.component_id is None}
    cells.sort(key=lambda c: (order[c.machine_id], c.machine_id, c.component_id or 0))
    return cells


def _tasks_for(
    db: Session,
    emp: Employee,
    machine: Machine,
    plan: HandoverPlan,
    who: Dict,
    gaps: List[KnowledgeGap],
) -> List[HandoverTask]:
    tasks = [
        HandoverTask(
            plan_id=plan.id,
            kind="record_setup",
            machine_id=machine.id,
            topic=f"Record a setup video on {machine.name}",
        ),
        HandoverTask(
            plan_id=plan.id,
            kind="interview",
            machine_id=machine.id,
            topic=f"AI interview: what only you know about {machine.name}",
        ),
    ]
    for comp in db.execute(select(Component).filter_by(machine_id=machine.id)).scalars():
        if not who.get((machine.id, comp.id)):
            tasks.append(
                HandoverTask(
                    plan_id=plan.id,
                    kind="interview",
                    machine_id=machine.id,
                    component_id=comp.id,
                    topic=f"Explain the {comp.display_name.lower()} on {machine.name} "
                    f"(nothing recorded yet)",
                )
            )
    for gap in [g for g in gaps if g.machine_id == machine.id][:MAX_GAP_TASKS]:
        tasks.append(
            HandoverTask(
                plan_id=plan.id,
                kind="interview",
                machine_id=machine.id,
                topic=f"Answer: {gap.topic}"[:200],
            )
        )
    pending = db.execute(
        select(func.count())
        .select_from(KnowledgeCard)
        .where(KnowledgeCard.machine_id == machine.id, KnowledgeCard.verified_by_id.is_(None))
    ).scalar_one()
    if pending:
        tasks.append(
            HandoverTask(
                plan_id=plan.id,
                kind="validate",
                machine_id=machine.id,
                topic=f"Review {pending} unverified card(s) on {machine.name}",
            )
        )
    return tasks


def create_handover_plan(db: Session, employee_id: int) -> HandoverPlan:
    """Plan for an employee with an exit date; returns the existing active plan if any."""
    emp = db.get(Employee, employee_id)
    if emp is None:
        raise NotFound(f"employee {employee_id} not found")
    if emp.exit_date is None:
        raise ValidationFailed(f"{emp.name} has no exit date in the ERP")
    plan = db.execute(
        select(HandoverPlan).filter_by(employee_id=emp.id, status="active")
    ).scalar_one_or_none()
    if plan is not None:
        plan.exit_date = emp.exit_date
        db.commit()
        return plan

    who = holders(db)
    sole = [
        m
        for m in db.execute(select(Machine).order_by(Machine.id)).scalars()
        if [h.employee_id for h in who.get((m.id, None), [])] == [emp.id]
    ]
    plan = HandoverPlan(
        employee_id=emp.id, exit_date=emp.exit_date, sole_holder_machine_ids=[m.id for m in sole]
    )
    db.add(plan)
    db.flush()
    gaps = list(
        db.execute(
            select(KnowledgeGap)
            .where(KnowledgeGap.resolved.is_(False))
            .order_by(KnowledgeGap.count.desc())
        ).scalars()
    )
    for machine in sole:
        db.add_all(_tasks_for(db, emp, machine, plan, who, gaps))
    audit(
        db,
        "handover.planned",
        target_type="employee",
        target_id=emp.id,
        machines=[m.name for m in sole],
    )
    db.commit()
    logger.info(
        "handover plan %s for employee %s: %d sole-holder machines", plan.id, emp.id, len(sole)
    )
    return plan


def refresh_progress(db: Session, plan: HandoverPlan) -> None:
    """progress = done tasks / all tasks (one count query)."""
    db.flush()  # sessions do not autoflush; count the task changes made by the caller
    total, done = db.execute(
        select(
            func.count(HandoverTask.id), func.sum(case((HandoverTask.status == "done", 1), else_=0))
        ).where(HandoverTask.plan_id == plan.id)
    ).one()
    plan.progress = round((done or 0) / total, 3) if total else 0.0


def plan_out(db: Session, plan: HandoverPlan) -> HandoverPlanOut:
    emp = db.get(Employee, plan.employee_id)
    tasks = list(
        db.execute(
            select(HandoverTask).filter_by(plan_id=plan.id).order_by(HandoverTask.id)
        ).scalars()
    )
    names = dict(db.execute(select(Machine.id, Machine.name)).all())
    return HandoverPlanOut(
        id=plan.id,
        employee_id=emp.id,
        employee=emp.name,
        exit_date=plan.exit_date,
        days_left=(plan.exit_date - date.today()).days,
        status=plan.status,
        progress=round(100 * plan.progress),
        sole_holder_machines=[names[m] for m in plan.sole_holder_machine_ids if m in names],
        gaps=[
            t.topic
            for t in tasks
            if t.kind == "interview"
            and t.status != "done"
            and (t.component_id or t.topic.startswith("Answer:"))
        ],
        tasks=[
            HandoverTaskOut(
                id=t.id,
                title=t.topic,
                category=t.kind,
                status=t.status,
                machine_id=t.machine_id,
                component_id=t.component_id,
            )
            for t in tasks
        ],
    )


def get_handover_plan(db: Session, employee_id: int) -> HandoverPlanOut:
    plan = create_handover_plan(db, employee_id)
    refresh_progress(db, plan)
    db.commit()
    return plan_out(db, plan)


def exit_date_hook(db: Session, person: Employee) -> Optional[dict]:
    """ERP webhook hook: an old employee got an exit date → build their handover plan."""
    if person.role != ROLE_OLD:
        return None
    plan = create_handover_plan(db, person.id)
    return {"plan_id": plan.id, "sole_holder_machine_ids": plan.sole_holder_machine_ids}
