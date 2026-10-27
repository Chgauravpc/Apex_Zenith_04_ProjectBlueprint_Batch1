"""AI interview with an old employee: ask about what is missing, turn answers into cards.

Questions come from real gaps: open handover tasks, questions new employees asked that
nobody could answer, and machine parts with no recorded know-how. The LLM only words them
naturally; offline, fixed templates ask the same thing. Every answer becomes a card
verified by the old employee who gave it.
"""

import logging
from typing import List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import utcnow
from app.errors import NotFound, ProviderUnavailable, ValidationFailed
from app.models.erp import ROLE_OLD, Employee, Machine
from app.models.knowledge import Document, KnowledgeCard
from app.models.map3d import Component
from app.models.transfer import HandoverPlan, HandoverTask, InterviewSession, KnowledgeGap
from app.prompts.answer import LANGUAGE_NAMES
from app.prompts.interview import INTERVIEW_SYSTEM, INTERVIEW_USER
from app.schemas.capture import CardOut, ExtractedCard
from app.schemas.transfer import (
    InterviewAnswerIn,
    InterviewAnswerOut,
    InterviewQuestion,
    InterviewQuestionsLLM,
    InterviewSessionOut,
    InterviewStartIn,
)
from app.services import llm
from app.services.capture.extractor import extract_cards, save_cards
from app.services.transfer.handover import refresh_progress
from app.services.transfer.profiles import holders
from app.utils.audit import audit

logger = logging.getLogger(__name__)

QUESTIONS_PER_SESSION = 5
Topic = Tuple[str, str, Optional[int], Optional[int], Optional[int]]  # kind, text, gap, comp, task


def record_answer(
    db: Session,
    answer_text: str,
    author_id: int,
    machine_id: Optional[int],
    component_id: Optional[int],
    question: str,
) -> KnowledgeCard:
    """Store an old employee's answer as a card they verify themselves (it is their word).

    The question is kept as the card's context and, when no LLM shaped the card, as its
    title, so the card reads "question → answer" and is found by people asking the same.
    """
    doc = Document(
        type="text", text=f"{question}\n{answer_text}", uploader_id=author_id, machine_id=machine_id
    )
    db.add(doc)
    db.commit()
    cards = extract_cards(answer_text, author_id, machine_id)
    if not cards or cards[0].mode == "offline":
        found = cards[0] if cards else None
        cards = [
            ExtractedCard(
                title=question[:80],
                context=question,
                action=answer_text.strip(),
                symptom=found.symptom if found else None,
                params=found.params if found else {},
                confidence=0.9,
                mode="offline" if found else "live",
            )
        ]
    else:
        cards = [c.model_copy(update={"context": c.context or question}) for c in cards]
    rows = save_cards(db, cards, doc.id)
    now = utcnow()
    for row in rows:
        if row.component_id is None:
            row.component_id = component_id
        row.verified_by_id, row.verified_at = author_id, now
        row.confidence = max(row.confidence, 0.9)
        audit(
            db,
            "card.verified",
            actor_id=author_id,
            target_type="card",
            target_id=row.id,
            via="answer",
        )
    db.commit()
    return rows[0]


def _topics(db: Session, session: InterviewSession, n: int) -> List[Topic]:
    machine_id = session.machine_id
    topics: List[Topic] = []
    if session.plan_id:
        for t in db.execute(
            select(HandoverTask)
            .where(
                HandoverTask.plan_id == session.plan_id,
                HandoverTask.status == "todo",
                HandoverTask.kind == "interview",
                HandoverTask.machine_id == machine_id,
            )
            .order_by(HandoverTask.id)
        ).scalars():
            topics.append(("task", t.topic, None, t.component_id, t.id))
    for g in db.execute(
        select(KnowledgeGap)
        .where(KnowledgeGap.machine_id == machine_id, KnowledgeGap.resolved.is_(False))
        .order_by(KnowledgeGap.count.desc())
    ).scalars():
        if not any(g.topic in t[1] for t in topics):
            topics.append(("gap", f"A new employee asked: {g.topic}", g.id, g.component_id, None))
    who = holders(db, machine_id)
    cards_on = {
        c: sum(h.cards for h in hs)
        for (m, c), hs in who.items()
        if m == machine_id and c is not None
    }
    taken = {t[3] for t in topics}
    comps = list(db.execute(select(Component).filter_by(machine_id=machine_id)).scalars())
    for comp in comps:
        if comp.id not in cards_on and comp.id not in taken:
            topics.append(
                (
                    "part",
                    f"Nothing recorded yet about the " f"{comp.display_name.lower()}",
                    None,
                    comp.id,
                    None,
                )
            )
            taken.add(comp.id)
    # Nothing obviously missing: still go deeper, where the least has been recorded.
    if len(topics) < n:
        topics.append(("general", "What only you know about this machine", None, None, None))
        for comp in sorted(comps, key=lambda c: (cards_on.get(c.id, 0), c.id)):
            if comp.id not in taken:
                topics.append(
                    (
                        "thin",
                        f"Only {cards_on.get(comp.id, 0)} tip(s) recorded about "
                        f"the {comp.display_name.lower()}",
                        None,
                        comp.id,
                        None,
                    )
                )
    return topics[:n]


def _template(kind: str, text: str, machine: str) -> str:
    """Offline wording for one topic; says the same thing the LLM would ask."""
    if kind == "gap" or text.startswith("Answer: "):
        asked = text.split(": ", 1)[1] if ": " in text else text
        return (
            f'A new employee asked: "{asked}" How do you handle that on {machine}, '
            f"and how do you know it is time?"
        )
    if kind == "thin":
        part = text.split("about the ", 1)[-1]
        return (
            f"We have very little about the {part} on {machine}. What is one thing about "
            f"it that a new employee always gets wrong, and how do you check it?"
        )
    if "nothing recorded yet" in text.lower() or kind == "part":
        part = (
            text.split("(")[0]
            .replace("Explain the ", "")
            .replace("Nothing recorded yet about the ", "")
            .replace(f" on {machine}", "")
            .strip()
        )
        return (
            f"What usually goes wrong with the {part} on {machine}? How do you notice it "
            f"early (sound, chips, readings), and what do you do?"
        )
    return (
        f"What do you know about {machine} that is not written down anywhere? Tell one "
        f"problem you see often, how you notice it early, and what you do about it."
    )


def next_interview_questions(
    db: Session, session_id: int, n: int = QUESTIONS_PER_SESSION
) -> List[InterviewQuestion]:
    """Pick the next topics for a session and word them as questions (LLM or templates)."""
    session = db.get(InterviewSession, session_id)
    if session is None:
        raise NotFound(f"interview {session_id} not found")
    emp = db.get(Employee, session.employee_id)
    machine = db.get(Machine, session.machine_id).name if session.machine_id else "the machine"
    topics = _topics(db, session, n)
    worded = [_template(k, t, machine) for k, t, *_ in topics]
    if topics:
        try:
            out = llm.chat_json(
                "interview",
                INTERVIEW_SYSTEM.format(language=LANGUAGE_NAMES.get(emp.language, "English")),
                INTERVIEW_USER.format(
                    machine=machine,
                    topics="\n".join(f"{i + 1}. {t[1]}" for i, t in enumerate(topics)),
                ),
                InterviewQuestionsLLM,
            )
            if len(out.questions) == len(topics) and all(q.strip() for q in out.questions):
                worded = out.questions
        except ProviderUnavailable:
            logger.info("interview questions offline for session %s", session_id)
    start = len(session.questions or [])
    return [
        InterviewQuestion(
            id=start + i, text=q, reason=t[1], gap_id=t[2], component_id=t[3], task_id=t[4]
        )
        for i, (q, t) in enumerate(zip(worded, topics))
    ]


def _session_out(session: InterviewSession, mode: str = "live") -> InterviewSessionOut:
    return InterviewSessionOut(
        id=session.id,
        employee_id=session.employee_id,
        machine_id=session.machine_id,
        status=session.status,
        mode=mode,
        questions=[InterviewQuestion(**q) for q in session.questions or []],
    )


def start_interview(db: Session, payload: InterviewStartIn) -> InterviewSessionOut:
    """Open a session for an old employee on one machine (their handover machine by default)."""
    emp = db.get(Employee, payload.employee_id)
    if emp is None:
        raise NotFound(f"employee {payload.employee_id} not found")
    if emp.role != ROLE_OLD:
        raise ValidationFailed("interviews are for old employees, to keep what they know")
    plan = db.execute(
        select(HandoverPlan).filter_by(employee_id=emp.id, status="active")
    ).scalar_one_or_none()
    machine_id = payload.machine_id or (
        plan.sole_holder_machine_ids[0] if plan and plan.sole_holder_machine_ids else None
    )
    if machine_id is None:
        top = next(
            (
                (m, hs)
                for (m, c), hs in holders(db).items()
                if c is None and hs and hs[0].employee_id == emp.id
            ),
            None,
        )
        machine_id = top[0] if top else None
    if machine_id is None or db.get(Machine, machine_id) is None:
        raise ValidationFailed("choose a machine for the interview")
    session = InterviewSession(
        employee_id=emp.id, machine_id=machine_id, plan_id=plan.id if plan else None, questions=[]
    )
    db.add(session)
    db.commit()  # never hold SQLite's write lock while waiting for the LLM
    questions = next_interview_questions(db, session.id)
    if payload.component_id is not None:
        questions.sort(key=lambda q: q.component_id != payload.component_id)
    session.questions = [q.model_dump() for q in questions]
    db.commit()
    return _session_out(session)


def answer_interview(
    db: Session, session_id: int, payload: InterviewAnswerIn
) -> InterviewAnswerOut:
    """Save an answer as a verified card and tick off the gap / handover task it covers."""
    session = db.get(InterviewSession, session_id)
    if session is None:
        raise NotFound(f"interview {session_id} not found")
    questions = [dict(q) for q in session.questions or []]
    q = next((x for x in questions if x["id"] == payload.question_id), None)
    if q is None:
        raise NotFound(f"question {payload.question_id} not in interview {session_id}")
    if q["answered"]:
        raise ValidationFailed("this question is already answered")
    card = record_answer(
        db,
        payload.answer_text,
        session.employee_id,
        session.machine_id,
        q.get("component_id"),
        q["reason"],
    )
    q["answered"] = True
    session.questions = questions  # reassign so the JSON column change is saved
    if q.get("gap_id"):
        gap = db.get(KnowledgeGap, q["gap_id"])
        if gap is not None:
            gap.resolved = True
    if q.get("task_id"):
        task = db.get(HandoverTask, q["task_id"])
        if task is not None:
            task.status, task.done_at = "done", utcnow()
    remaining = sum(1 for x in questions if not x["answered"])
    session.status = "done" if remaining == 0 else "open"
    if session.plan_id:
        refresh_progress(db, db.get(HandoverPlan, session.plan_id))
    db.commit()
    return InterviewAnswerOut(
        session_id=session.id,
        question_id=q["id"],
        card=CardOut.model_validate(card),
        remaining=remaining,
    )
