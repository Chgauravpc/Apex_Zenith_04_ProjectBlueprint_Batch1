"""New employee's day: briefing, two quiz questions on old employees' tips, learning path.

Learning path: Watch (old employees' setup videos) → Learn (their cards) → Do (guided
runs) → Certify (sign-off). Progress numbers are counted from real records only.
"""

import logging
from datetime import date, datetime, time, timedelta
from typing import Dict, List, Set

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.errors import NotFound
from app.models.erp import ROLE_NEW, Employee, Machine, QCReject, WorkOrder
from app.models.guardian import Warning
from app.models.guide import GuidedRun, Procedure, QuizItem, SkillMatrix
from app.models.knowledge import ActionItem, KnowledgeCard
from app.models.ops import Query
from app.models.transfer import KnowledgeBuddy
from app.schemas.guide import Briefing, PathStage, QuizQuestion

logger = logging.getLogger(__name__)

QUIZ_PER_DAY = 2
RECENT_DAYS = 14
LIST_LIMIT = 5


def _machines(db: Session, employee_id: int) -> Dict[int, str]:
    """Machines from buddy pairs and from the employee's open work orders."""
    ids: Set[int] = set(
        db.execute(
            select(KnowledgeBuddy.machine_id).filter_by(new_employee_id=employee_id, active=True)
        ).scalars()
    )
    ids |= set(
        db.execute(
            select(WorkOrder.machine_id).where(
                WorkOrder.employee_id == employee_id, WorkOrder.status != "closed"
            )
        ).scalars()
    )
    if not ids:
        return {}
    return dict(db.execute(select(Machine.id, Machine.name).where(Machine.id.in_(ids))).all())


def _quiz(db: Session, machines: Dict[int, str], day: date) -> List[QuizQuestion]:
    """Two questions a day, rotating through verified old-employee tips (spaced repetition)."""
    cards = list(
        db.execute(
            select(KnowledgeCard)
            .join(Employee, Employee.id == KnowledgeCard.author_id)
            .where(
                KnowledgeCard.machine_id.in_(machines),
                KnowledgeCard.verified_by_id.is_not(None),
                Employee.role != ROLE_NEW,
            )
            .order_by(KnowledgeCard.id)
        ).scalars()
    )
    if not cards:
        return []
    have = {
        q.card_id: q
        for q in db.execute(
            select(QuizItem).where(QuizItem.card_id.in_([c.id for c in cards]))
        ).scalars()
    }
    for c in cards:
        if c.id not in have:
            have[c.id] = QuizItem(
                card_id=c.id,
                machine_id=c.machine_id,
                question=f"{machines[c.machine_id]}: {c.title} — what do you do?",
                answer=c.action,
            )
            db.add(have[c.id])
    db.flush()
    start = day.toordinal() * QUIZ_PER_DAY % len(cards)
    picked = [cards[(start + i) % len(cards)] for i in range(min(QUIZ_PER_DAY, len(cards)))]
    return [
        QuizQuestion(
            id=have[c.id].id, question=have[c.id].question, answer=have[c.id].answer, card_id=c.id
        )
        for c in picked
    ]


def _path(db: Session, employee_id: int, machine_ids: List[int]) -> List[PathStage]:
    procs = list(
        db.execute(
            select(Procedure).where(
                Procedure.machine_id.in_(machine_ids), Procedure.status == "approved"
            )
        ).scalars()
    )
    proc_ids = [p.id for p in procs]
    runs = db.execute(
        select(GuidedRun.procedure_id, GuidedRun.status).where(
            GuidedRun.employee_id == employee_id, GuidedRun.procedure_id.in_(proc_ids)
        )
    ).all()
    started = {pid for pid, _ in runs}
    finished = {pid for pid, status in runs if status == "done"}
    with_video = [p.id for p in procs if p.source_doc_id]
    cards = db.execute(
        select(func.count())
        .select_from(KnowledgeCard)
        .where(KnowledgeCard.machine_id.in_(machine_ids), KnowledgeCard.verified_by_id.is_not(None))
    ).scalar_one()
    seen: Set[int] = set()
    for sources in db.execute(select(Query.sources).filter_by(asked_by_id=employee_id)).scalars():
        seen |= {s["id"] for s in sources or [] if s.get("type") == "card"}
    ops = {p.operation_id for p in procs if p.operation_id}
    certified = (
        db.execute(
            select(func.count())
            .select_from(SkillMatrix)
            .where(
                SkillMatrix.employee_id == employee_id,
                SkillMatrix.operation_id.in_(ops),
                SkillMatrix.level >= 2,
            )
        ).scalar_one()
        if ops
        else 0
    )
    return [
        PathStage(stage="watch", done=len(started & set(with_video)), total=len(with_video)),
        PathStage(stage="learn", done=min(len(seen), cards), total=cards),
        PathStage(stage="do", done=len(finished), total=len(proc_ids)),
        PathStage(stage="certify", done=certified, total=len(ops)),
    ]


def daily_briefing(db: Session, employee_id: int, day: date) -> Briefing:
    """What a new employee should know before starting the shift."""
    person = db.get(Employee, employee_id)
    if person is None:
        raise NotFound(f"employee {employee_id} not found")
    machines = _machines(db, employee_id)
    ids = list(machines)
    jobs = [
        f"{w.external_id or w.id} on {machines.get(w.machine_id, '?')}: {w.quantity} pcs "
        f"({w.status})"
        for w in db.execute(
            select(WorkOrder)
            .where(WorkOrder.employee_id == employee_id, WorkOrder.status != "closed")
            .limit(LIST_LIMIT)
        ).scalars()
    ]
    warnings = [
        f"{machines[w.machine_id]} [{w.severity}] {w.message}"
        for w in db.execute(
            select(Warning)
            .where(Warning.machine_id.in_(ids), Warning.status == "open")
            .order_by(Warning.created_at.desc())
            .limit(LIST_LIMIT)
        ).scalars()
    ]
    since = datetime.combine(day - timedelta(days=RECENT_DAYS), time.min)
    issues = [
        f"{machines[m]}: {qty} x {defect} in the last {RECENT_DAYS} days"
        for m, defect, qty in db.execute(
            select(QCReject.machine_id, QCReject.defect, func.sum(QCReject.quantity))
            .where(QCReject.machine_id.in_(ids), QCReject.created_at >= since)
            .group_by(QCReject.machine_id, QCReject.defect)
        ).all()
    ]
    actions = [
        a.text
        for a in db.execute(
            select(ActionItem)
            .where(
                ActionItem.owner_id == employee_id, ActionItem.status.in_(("open", "needs_review"))
            )
            .limit(LIST_LIMIT)
        ).scalars()
    ]
    briefing = Briefing(
        employee_id=person.id,
        employee=person.name,
        day=day,
        machines=sorted(machines.values()),
        jobs=jobs,
        open_warnings=warnings,
        known_issues=issues,
        action_items=actions,
        quiz=_quiz(db, machines, day) if machines else [],
        path=_path(db, employee_id, ids),
    )
    db.commit()
    return briefing
