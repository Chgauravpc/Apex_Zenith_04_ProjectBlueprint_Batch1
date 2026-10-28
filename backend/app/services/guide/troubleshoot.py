"""Troubleshooting tree per machine, built from its own history.

symptom → causes ranked by how often they caused it here → the fix an old employee
recorded. Causes come from QC rejects (one aggregate query) and from failure-precursor
stats (e.g. chatter before spindle bearing failures). The tree is stored in
`troubleshoot_nodes` so it can be browsed and reviewed.
"""

import logging
from typing import Dict, List, Optional, Tuple

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.errors import NotFound
from app.models.erp import ROLE_NEW, Employee, Machine, QCReject
from app.models.guardian import FailurePrecursor
from app.models.guide import TroubleshootNode
from app.models.knowledge import KnowledgeCard
from app.schemas.guide import CauseNode, SymptomNode
from app.utils import lexicon

logger = logging.getLogger(__name__)

LABELS = {
    "chatter": "Chatter / vibration marks",
    "burr": "Burr on edges",
    "dimension_drift": "Size out of tolerance",
    "poor_finish": "Poor surface finish",
    "tool_break": "Tool breaking",
    "noise": "Unusual noise",
    "overheating": "Overheating",
}


def _symptom_of(defect: str) -> str:
    """Canonical symptom for a QC defect name ("oversize bore" → dimension_drift)."""
    found = lexicon.find_symptoms(defect)
    priority = ["chatter", "burr", "tool_break", "dimension_drift", "poor_finish", "noise"]
    hit = next((s for s in priority if s in found), None)
    if hit:
        return hit
    d = defect.lower()
    if any(w in d for w in ("oversize", "undersize", "depth", "taper")):
        return "dimension_drift"
    if any(w in d for w in ("finish", "edge")):
        return "poor_finish"
    return d


def _fix_for(
    cause: str, cards: List[Tuple[KnowledgeCard, str]]
) -> Optional[Tuple[KnowledgeCard, str]]:
    """Card whose text shares most words with the cause; else the best card for the symptom."""
    words = {w for w in lexicon.normalize(cause).split() if len(w) > 3}

    def overlap(item: Tuple[KnowledgeCard, str]) -> int:
        text = lexicon.normalize(
            " ".join(filter(None, [item[0].title, item[0].action, item[0].why]))
        )
        return sum(w in text for w in words)

    return max(cards, key=overlap) if cards else None


def build_tree(db: Session, machine_id: int) -> List[SymptomNode]:
    """Rebuild and return the machine's troubleshooting tree, most frequent symptom first."""
    machine = db.get(Machine, machine_id)
    if machine is None:
        raise NotFound(f"machine {machine_id} not found")
    counts: Dict[str, Dict[str, int]] = {}
    for defect, cause, qty in db.execute(
        select(QCReject.defect, QCReject.cause, func.sum(QCReject.quantity))
        .filter_by(machine_id=machine.id)
        .group_by(QCReject.defect, QCReject.cause)
    ).all():
        bucket = counts.setdefault(_symptom_of(defect), {})
        key = (cause or defect).strip()
        bucket[key] = bucket.get(key, 0) + int(qty or 0)
    for p in db.execute(select(FailurePrecursor).filter_by(machine_id=machine.id)).scalars():
        if p.preceded_count:
            key = (
                f"{p.failure_kind} starting (came before {p.preceded_count} of "
                f"{p.total_failures} failures)"
            )
            counts.setdefault(p.symptom, {})[key] = p.preceded_count

    card_rows = db.execute(
        select(KnowledgeCard, Employee.name)
        .join(Employee, Employee.id == KnowledgeCard.author_id)
        .where(
            KnowledgeCard.machine_id == machine.id,
            KnowledgeCard.verified_by_id.is_not(None),
            Employee.role != ROLE_NEW,
        )
    ).all()
    cards: Dict[str, List[Tuple[KnowledgeCard, str]]] = {}
    for card, name in card_rows:
        cards.setdefault(card.symptom or "", []).append((card, name))

    db.execute(delete(TroubleshootNode).where(TroubleshootNode.machine_id == machine.id))
    tree: List[SymptomNode] = []
    for symptom, causes in sorted(counts.items(), key=lambda kv: -sum(kv[1].values())):
        total = sum(causes.values())
        root = TroubleshootNode(
            machine_id=machine.id, kind="symptom", text=symptom, frequency=total
        )
        db.add(root)
        db.flush()
        nodes = []
        for cause, n in sorted(causes.items(), key=lambda kv: -kv[1]):
            fix = _fix_for(cause, cards.get(symptom, []))
            cause_row = TroubleshootNode(
                machine_id=machine.id,
                parent_id=root.id,
                kind="cause",
                text=cause[:500],
                frequency=n,
                card_id=fix[0].id if fix else None,
            )
            db.add(cause_row)
            nodes.append(
                CauseNode(
                    cause=cause,
                    count=n,
                    share=round(n / total, 3),
                    frequency=f"{round(100 * n / total)}% of past incidents",
                    fix=fix[0].action if fix else None,
                    fix_author=fix[1] if fix else None,
                    card_id=fix[0].id if fix else None,
                )
            )
        tree.append(
            SymptomNode(
                symptom=symptom,
                label=LABELS.get(symptom, symptom.title()),
                incidents=total,
                causes=nodes,
            )
        )
    db.commit()
    logger.info("troubleshoot tree machine=%s symptoms=%d", machine.id, len(tree))
    return tree
