"""Transfer metrics for the dashboard: coverage, Guardian, routing, new employees' skills."""

from datetime import date
from typing import Optional

from sqlalchemy import exists, func, select
from sqlalchemy.orm import Session

from app.models.erp import ROLE_NEW, Employee
from app.models.guardian import Warning
from app.models.guide import SKILL_INDEPENDENT, GuidedRun, RunStep, SkillMatrix
from app.models.knowledge import KnowledgeCard
from app.models.transfer import HandoverPlan, RoutedQuestion
from app.schemas.transfer import NewEmployeeProgress, TransferMetrics
from app.services.transfer.handover import knowledge_risk


def _count(db: Session, stmt) -> int:
    return db.execute(stmt).scalar_one() or 0


def _new_employee(db: Session, emp: Employee, today: date) -> NewEmployeeProgress:
    levels = list(db.execute(select(SkillMatrix.level).filter_by(employee_id=emp.id)).scalars())
    failed = exists().where(RunStep.run_id == GuidedRun.id, RunStep.passed.is_(False))
    clean = _count(
        db,
        select(func.count(GuidedRun.id)).where(
            GuidedRun.employee_id == emp.id, GuidedRun.status == "done", ~failed
        ),
    )
    return NewEmployeeProgress(
        employee_id=emp.id,
        employee=emp.name,
        days_on_job=(today - emp.join_date).days if emp.join_date else None,
        independent_ops=sum(1 for lv in levels if lv >= SKILL_INDEPENDENT),
        trained_ops=sum(1 for lv in levels if lv >= 1),
        clean_runs=clean,
    )


def transfer_metrics(db: Session, today: Optional[date] = None) -> TransferMetrics:
    today = today or date.today()
    parts = [c for c in knowledge_risk(db) if c.component_id is not None]
    covered = sum(1 for c in parts if c.cards > 0)
    warnings = dict(
        db.execute(select(Warning.severity, func.count()).group_by(Warning.severity)).all()
    )
    plans = list(db.execute(select(HandoverPlan.progress).filter_by(status="active")).scalars())
    new_emps = db.execute(select(Employee).filter_by(role=ROLE_NEW).order_by(Employee.id)).scalars()
    return TransferMetrics(
        coverage=round(100 * covered / len(parts)) if parts else 0,
        parts_total=len(parts),
        parts_at_risk=sum(1 for c in parts if c.status == "critical"),
        verified_cards=_count(
            db, select(func.count()).where(KnowledgeCard.verified_by_id.is_not(None))
        ),
        pending_review=_count(
            db, select(func.count()).where(KnowledgeCard.verified_by_id.is_(None))
        ),
        guardian_stops=warnings.get("stop", 0),
        guardian_cautions=warnings.get("caution", 0),
        warnings_with_fix=_count(db, select(func.count()).where(Warning.card_id.is_not(None))),
        questions_routed=_count(db, select(func.count()).select_from(RoutedQuestion)),
        questions_answered=_count(
            db, select(func.count()).where(RoutedQuestion.answer_card_id.is_not(None))
        ),
        handover_progress=round(sum(plans) / len(plans)) if plans else None,
        new_employees=[_new_employee(db, e, today) for e in new_emps],
    )
