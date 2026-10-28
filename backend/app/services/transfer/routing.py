"""Question routing: "asked once, answered forever".

A question the assistant could not answer goes to the old employee who knows that
machine best. Their reply becomes a verified card, so the next person asking gets the
answer from the assistant, even after that old employee has left.
"""

import logging
from typing import Any, Dict, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.orm import Session, aliased

from app.database import utcnow
from app.errors import NotFound, ValidationFailed
from app.models.erp import ROLE_NEW, ROLE_OLD, Employee, Machine
from app.models.knowledge import KnowledgeCard
from app.models.ops import Notification, Query
from app.models.transfer import KnowledgeGap, RoutedQuestion
from app.schemas.capture import CardOut
from app.schemas.transfer import ReplyIn, ReplyOut, RoutedList, RoutedQuestionOut
from app.services.ask.qa import machine_experts
from app.services.transfer.interview import record_answer

logger = logging.getLogger(__name__)

MAX_PAGE = 100


def _out(db: Session, rq: RoutedQuestion) -> RoutedQuestionOut:
    asker = db.get(Employee, rq.asked_by_id) if rq.asked_by_id else None
    machine = db.get(Machine, rq.machine_id) if rq.machine_id else None
    return RoutedQuestionOut(
        id=rq.id,
        question=rq.question,
        status=rq.status,
        machine_id=rq.machine_id,
        machine=machine.name if machine else None,
        asked_by_id=rq.asked_by_id,
        asked_by=asker.name if asker else None,
        routed_to_id=rq.routed_to_id,
        routed_to=db.get(Employee, rq.routed_to_id).name,
        answer_card_id=rq.answer_card_id,
        created_at=rq.created_at,
    )


def route_question(db: Session, query_id: int) -> RoutedQuestion:
    """Send an Ask question to the best old employee for its machine (idempotent)."""
    query = db.get(Query, query_id)
    if query is None:
        raise NotFound(f"question {query_id} not found")
    existing = db.execute(select(RoutedQuestion).filter_by(query_id=query.id)).scalar_one_or_none()
    if existing is not None:
        return existing
    experts = machine_experts(db, query.machine_id, limit=1)
    target = (
        experts[0].id
        if experts
        else db.execute(
            select(Employee.id).where(Employee.role == ROLE_OLD).order_by(Employee.id)
        ).scalar()
    )
    if target is None:
        raise ValidationFailed("no old employee to route this question to")
    rq = RoutedQuestion(
        query_id=query.id,
        question=query.question,
        asked_by_id=query.asked_by_id,
        routed_to_id=target,
        machine_id=query.machine_id,
    )
    db.add(rq)
    db.flush()
    db.add(
        Notification(
            employee_id=target,
            kind="routed_question",
            ref_type="routed_question",
            ref_id=rq.id,
            message=f"A new employee asks: {query.question[:200]}",
        )
    )
    db.commit()
    logger.info("question %s routed to employee %s", query.id, target)
    return rq


def list_routed(
    db: Session, employee_id: Optional[int], status: Optional[str], limit: int, offset: int
) -> RoutedList:
    conds = []
    if employee_id is not None:
        conds.append(RoutedQuestion.routed_to_id == employee_id)
    if status:
        conds.append(RoutedQuestion.status == status)
    total = db.execute(select(func.count()).select_from(RoutedQuestion).where(*conds)).scalar_one()
    asker, target = aliased(Employee), aliased(Employee)
    rows = db.execute(
        select(RoutedQuestion, asker.name, target.name, Machine.name)
        .join(target, target.id == RoutedQuestion.routed_to_id)
        .outerjoin(asker, asker.id == RoutedQuestion.asked_by_id)
        .outerjoin(Machine, Machine.id == RoutedQuestion.machine_id)
        .where(*conds)
        .order_by(RoutedQuestion.created_at.desc(), RoutedQuestion.id.desc())
        .limit(max(1, min(limit, MAX_PAGE)))
        .offset(max(0, offset))
    ).all()
    items = [
        RoutedQuestionOut(
            id=rq.id,
            question=rq.question,
            status=rq.status,
            machine_id=rq.machine_id,
            machine=m_name,
            asked_by_id=rq.asked_by_id,
            asked_by=a_name,
            routed_to_id=rq.routed_to_id,
            routed_to=t_name,
            answer_card_id=rq.answer_card_id,
            created_at=rq.created_at,
        )
        for rq, a_name, t_name, m_name in rows
    ]
    return RoutedList(items=items, total=total)


def reply(
    db: Session, routed_id: int, payload: ReplyIn
) -> Tuple[RoutedQuestion, KnowledgeCard, Optional[Dict[str, Any]]]:
    """The old employee's reply becomes a verified card; the asker is told; the gap closes.

    Returns the question, the card and Note Guardian's check of the reply.
    """
    rq = db.get(RoutedQuestion, routed_id)
    if rq is None:
        raise NotFound(f"routed question {routed_id} not found")
    author = db.get(Employee, payload.author_id)
    if author is None:
        raise NotFound(f"employee {payload.author_id} not found")
    if author.role == ROLE_NEW:
        raise ValidationFailed("only an old employee or a supervisor can answer for the team")
    if rq.status == "answered":
        raise ValidationFailed("this question is already answered")
    card, guardian = record_answer(
        db, payload.reply_text.strip(), author.id, rq.machine_id, None, rq.question
    )
    rq.status, rq.answer_card_id, rq.answered_at = "answered", card.id, utcnow()
    gap = db.execute(
        select(KnowledgeGap).filter_by(machine_id=rq.machine_id, topic=rq.question.strip()[:200])
    ).scalar_one_or_none()
    if gap is not None:
        gap.resolved = True
    if rq.asked_by_id:
        db.add(
            Notification(
                employee_id=rq.asked_by_id,
                kind="answer",
                ref_type="card",
                ref_id=card.id,
                message=f"{author.name} answered: {rq.question[:150]}",
            )
        )
    db.commit()
    return rq, card, guardian


def reply_out(db: Session, routed_id: int, payload: ReplyIn) -> ReplyOut:
    rq, card, guardian = reply(db, routed_id, payload)
    return ReplyOut(routed=_out(db, rq), card=CardOut.model_validate(card), guardian=guardian)


def route_out(db: Session, query_id: int) -> RoutedQuestionOut:
    return _out(db, route_question(db, query_id))
