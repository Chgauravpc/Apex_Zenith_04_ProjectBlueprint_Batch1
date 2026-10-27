"""Who knows what: experience scores and know-how holders per machine / part.

Both come from one aggregate query each, so they stay fast as cards grow.
"""

import logging
from dataclasses import dataclass
from datetime import date
from typing import Dict, List, Optional, Tuple

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models.erp import ROLE_OLD, Employee
from app.models.knowledge import KnowledgeCard
from app.models.transfer import ExperienceScore

logger = logging.getLogger(__name__)

SCORE_PER_CARD = 1.0
SCORE_PER_VERIFIED = 2.0
SCORE_PER_YEAR = 0.5


@dataclass(frozen=True)
class Holder:
    employee_id: int
    name: str
    cards: int
    exit_date: Optional[date]


def experience_scores(db: Session) -> None:
    """Recompute ExperienceScore rows from cards (one GROUP BY author, machine query)."""
    verified = func.sum(case((KnowledgeCard.verified_by_id.is_not(None), 1), else_=0))
    rows = db.execute(
        select(
            KnowledgeCard.author_id,
            KnowledgeCard.machine_id,
            func.count(KnowledgeCard.id),
            verified,
            Employee.join_date,
        )
        .join(Employee, Employee.id == KnowledgeCard.author_id)
        .where(KnowledgeCard.machine_id.is_not(None))
        .group_by(KnowledgeCard.author_id, KnowledgeCard.machine_id, Employee.join_date)
    ).all()
    existing = {
        (s.employee_id, s.machine_id): s
        for s in db.execute(
            select(ExperienceScore).where(ExperienceScore.operation_id.is_(None))
        ).scalars()
    }
    today = date.today()
    for author_id, machine_id, cards, ver, joined in rows:
        years = round((today - joined).days / 365.25, 1) if joined else 0.0
        row = existing.get((author_id, machine_id))
        if row is None:
            row = ExperienceScore(employee_id=author_id, machine_id=machine_id)
            db.add(row)
        row.cards_count, row.validated_count, row.years_on_machine = cards, int(ver or 0), years
        row.score = (
            SCORE_PER_CARD * cards + SCORE_PER_VERIFIED * (ver or 0) + SCORE_PER_YEAR * years
        )
    db.commit()
    logger.info("experience scores updated for %d employee/machine pairs", len(rows))


Key = Tuple[int, Optional[int]]  # (machine_id, component_id); component None = whole machine


def holders(db: Session, machine_id: Optional[int] = None) -> Dict[Key, List[Holder]]:
    """Old employees with verified cards, per machine and per machine part, most cards first."""
    conds = [
        KnowledgeCard.verified_by_id.is_not(None),
        Employee.role == ROLE_OLD,
        KnowledgeCard.machine_id.is_not(None),
    ]
    if machine_id is not None:
        conds.append(KnowledgeCard.machine_id == machine_id)
    rows = db.execute(
        select(
            KnowledgeCard.machine_id,
            KnowledgeCard.component_id,
            Employee.id,
            Employee.name,
            Employee.exit_date,
            func.count(KnowledgeCard.id),
        )
        .join(Employee, Employee.id == KnowledgeCard.author_id)
        .where(*conds)
        .group_by(
            KnowledgeCard.machine_id,
            KnowledgeCard.component_id,
            Employee.id,
            Employee.name,
            Employee.exit_date,
        )
    ).all()
    per_part: Dict[Key, List[Holder]] = {}
    per_machine: Dict[int, Dict[int, Holder]] = {}
    for m_id, c_id, e_id, name, exit_date, n in rows:
        if c_id is not None:
            per_part.setdefault((m_id, c_id), []).append(Holder(e_id, name, n, exit_date))
        prev = per_machine.setdefault(m_id, {}).get(e_id)
        per_machine[m_id][e_id] = Holder(e_id, name, n + (prev.cards if prev else 0), exit_date)
    out: Dict[Key, List[Holder]] = {(m, None): list(h.values()) for m, h in per_machine.items()}
    out.update(per_part)
    for value in out.values():
        value.sort(key=lambda h: (-h.cards, h.employee_id))
    return out
