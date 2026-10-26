"""Demo history: failures, rejects, operator notes and old employees' know-how cards.

Kept apart from seed.py to respect the ~300-line file limit (ENGINEERING.md §1).
Failure-precursor stats are computed from the seeded notes and failures,
not typed in, so they always match the evidence they cite.
"""

import json
from datetime import date, datetime, time, timedelta
from pathlib import Path
from typing import Any, Dict, List, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import fts_index
from app.models.erp import Machine, Maintenance, Material, Operation, QCReject
from app.models.guardian import FailurePrecursor
from app.models.knowledge import Document, KnowledgeCard
from app.models.map3d import Component
from app.models.ops import Event

PRECURSOR_WINDOW_DAYS = 14  # a symptom note counts if written this many days before a failure

# (days ago, machine, component, kind, description, interval_days)
MAINTENANCE = [
    (520, "VMC-3", "spindle", "breakdown", "Spindle bearing failure, bearings replaced", None),
    (400, "VMC-3", "spindle", "breakdown", "Spindle bearing failure, front bearing seized", None),
    (290, "VMC-3", "spindle", "breakdown", "Spindle bearing failure after a collision", None),
    (170, "VMC-3", "spindle", "breakdown", "Spindle bearing failure, noisy and hot", None),
    (60, "VMC-3", "spindle", "breakdown", "Spindle bearing failure, 2 days downtime", None),
    (130, "VMC-3", "spindle", "preventive", "Spindle lubrication and grease check", 90),
    (20, "VMC-3", "coolant", "preventive", "Coolant filter clean and concentration check", 30),
    (100, "VMC-1", "atc", "breakdown", "ATC arm misaligned, re-taught tool change position", None),
    (
        200,
        "Lathe-2",
        "chuck",
        "breakdown",
        "Chuck jaws worn, part taper 0.04 mm, jaws re-bored",
        None,
    ),
]

# (days ago, machine, author, symptom, text) — operator notes before / between failures
NOTES = [
    (529, "VMC-3", "Suresh", "chatter", "VMC-3 pe finishing me chatter aa raha hai, SS304 flange"),
    (406, "VMC-3", "Ramesh", "chatter", "VMC-3 chatter on SS304 at feed 0.25, surface marks"),
    (300, "VMC-3", "Ramesh", "noise", "VMC-3 Z axis noise during rapid, checked ways lube"),
    (182, "VMC-3", "Ramesh", "chatter", "VMC-3 स्पिंडल से चैटर की आवाज़ आ रही है, फीड कम किया"),
    (64, "VMC-3", "Anil", "chatter", "VMC-3 chatter again on flange job, spindle feels warm"),
    (90, "Lathe-2", "Suresh", "dimension_drift", "Lathe-2 shaft OD taper 0.03, chuck jaws worn"),
]

# (days ago, machine, part, defect, cause, qty)
QC_REJECTS = [
    (410, "VMC-3", "FL-101", "chatter marks", "Feed too high on finish pass", 6),
    (175, "VMC-3", "FL-101", "chatter marks", "Spindle bearing wear", 9),
    (65, "VMC-3", "FL-101", "chatter marks", "Spindle bearing wear", 12),
    (150, "VMC-3", "FL-101", "burr", "Chamfer tool not used", 4),
    (95, "VMC-3", "FL-101", "oversize bore", "Chip under vise jaw", 3),
    (40, "VMC-1", "BR-310", "built-up edge finish", "Coolant concentration low", 5),
    (120, "VMC-1", "BR-310", "pocket depth oversize", "Tool length offset not updated", 2),
    (200, "Lathe-2", "SH-220", "taper", "Worn chuck jaws", 8),
    (80, "Lathe-2", "SH-220", "poor finish", "Insert nose worn", 5),
    (30, "Lathe-2", "SH-220", "chatter marks", "Long overhang without tailstock", 3),
]

# Old employees' know-how cards (plus two unreviewed notes from Priya), kept as JSON data.
CARDS_FILE = Path(__file__).resolve().parent / "assets" / "cards.json"


def _at(today: date, days_ago: int) -> datetime:
    return datetime.combine(today - timedelta(days=days_ago), time(10, 0))


def _get_or_add(db: Session, model: Any, lookup: Dict[str, Any], **defaults: Any) -> Any:
    row = db.execute(select(model).filter_by(**lookup)).scalar_one_or_none()
    if row is None:
        row = model(**lookup, **defaults)
        db.add(row)
        db.flush()
    return row


def _event(
    db: Session,
    machine_id: int,
    kind: str,
    ref_type: str,
    ref_id: int,
    summary: str,
    when: datetime,
) -> None:
    _get_or_add(
        db,
        Event,
        {"ref_type": ref_type, "ref_id": ref_id, "kind": kind},
        machine_id=machine_id,
        summary=summary,
        occurred_at=when,
    )


def _seed_maintenance(
    db: Session,
    today: date,
    mc: Dict[str, Machine],
    comps: Dict[Tuple[int, str], int],
    people: Dict[str, Any],
) -> List[Any]:
    rows = []
    for i, (ago, mname, comp, kind, desc, interval) in enumerate(MAINTENANCE, start=1):
        m = mc[mname]
        row = _get_or_add(
            db,
            Maintenance,
            {"external_id": f"ERP-MNT-{i:03d}"},
            machine_id=m.id,
            component_id=comps[(m.id, comp)],
            kind=kind,
            description=desc,
            interval_days=interval,
            done_on=today - timedelta(days=ago),
            done_by_id=people["Anil"].id,
            created_at=_at(today, ago),
        )
        fts_index(db, "maintenance", row.id, m.id, f"{mname} {comp} {kind}: {desc}")
        _event(db, m.id, "maintenance", "maintenance", row.id, desc, _at(today, ago))
        rows.append(row)
    return rows


def _seed_notes(
    db: Session, today: date, mc: Dict[str, Machine], people: Dict[str, Any]
) -> List[Tuple[Document, str]]:
    notes = []
    for ago, mname, author, symptom, text in NOTES:
        m = mc[mname]
        doc = _get_or_add(
            db,
            Document,
            {"type": "text", "text": text},
            machine_id=m.id,
            uploader_id=people[author].id,
            created_at=_at(today, ago),
        )
        fts_index(db, "note", doc.id, m.id, text)
        _event(db, m.id, "note", "document", doc.id, text, _at(today, ago))
        notes.append((doc, symptom))
    return notes


def _seed_rejects(db: Session, today: date, mc: Dict[str, Machine], parts: Dict[str, Any]) -> None:
    for i, (ago, mname, pnum, defect, cause, qty) in enumerate(QC_REJECTS, start=1):
        m = mc[mname]
        row = _get_or_add(
            db,
            QCReject,
            {"external_id": f"ERP-QC-{i:03d}"},
            machine_id=m.id,
            part_id=parts[pnum].id,
            defect=defect,
            cause=cause,
            quantity=qty,
            created_at=_at(today, ago),
        )
        fts_index(db, "qc_reject", row.id, m.id, f"{mname} {pnum} reject: {defect}. {cause}")
        _event(db, m.id, "qc_reject", "qc_reject", row.id, f"{qty} x {defect}", _at(today, ago))


def _seed_precursors(
    db: Session, maint: List[Maintenance], notes: List[Tuple[Document, str]]
) -> None:
    """For each machine/component failure kind, count failures preceded by each symptom.

    Complexity: O(failures × notes) — both tiny (tens of rows) in seed data.
    """
    failures = [r for r in maint if r.kind == "breakdown"]
    window = timedelta(days=PRECURSOR_WINDOW_DAYS)
    for f in failures:
        kind = "spindle bearing failure" if "bearing" in f.description else f.description
        same = [
            x for x in failures if x.machine_id == f.machine_id and x.component_id == f.component_id
        ]
        for symptom in {s for d, s in notes if d.machine_id == f.machine_id}:
            hits = [
                x.id
                for x in same
                if any(
                    d.machine_id == x.machine_id
                    and s == symptom
                    and timedelta(0) <= x.created_at - d.created_at <= window
                    for d, s in notes
                )
            ]
            if not hits:
                continue
            row = _get_or_add(
                db,
                FailurePrecursor,
                {"machine_id": f.machine_id, "symptom": symptom, "failure_kind": kind},
                component_id=f.component_id,
            )
            row.preceded_count, row.total_failures = len(hits), len(same)
            row.evidence_ids = hits
            row.last_seen = max(x.created_at for x in same if x.id in hits)


def _card_text(c: KnowledgeCard) -> str:
    return " ".join(filter(None, [c.title, c.symptom, c.context, c.action, c.why]))


def _seed_cards(
    db: Session, mc: Dict[str, Machine], comps: Dict[Tuple[int, str], int], people: Dict[str, Any]
) -> None:
    mats = {m.name: m.id for m in db.execute(select(Material)).scalars()}
    ops = {o.name: o.id for o in db.execute(select(Operation)).scalars()}
    cards = json.loads(CARDS_FILE.read_text(encoding="utf-8"))
    for c in cards:
        mname, comp, author = c["machine"], c["component"], c["author"]
        mat, op = c["material"], c["operation"]
        m = mc[mname]
        is_old = author != "Priya"  # new employee's notes wait for review by an old employee
        card = _get_or_add(
            db,
            KnowledgeCard,
            {"machine_id": m.id, "title": c["title"]},
            component_id=comps[(m.id, comp)],
            symptom=c["symptom"],
            action=c["action"],
            why=c["why"],
            author_id=people[author].id,
            material_id=mats.get(mat),
            operation_id=ops.get(op),
            params=c["params"],
            confidence=1.0 if is_old else 0.6,
            verified_by_id=people[author].id if is_old else None,
        )
        fts_index(db, "card", card.id, m.id, _card_text(card))


def seed_history(db: Session, today: date, ref: Dict[str, Any]) -> None:
    """Load failures, notes, rejects, precursor stats and cards; index all of it for search."""
    mc: Dict[str, Machine] = ref["machines"]
    people = ref["people"]
    comps = {(c.machine_id, c.mesh_name): c.id for c in db.execute(select(Component)).scalars()}
    maint = _seed_maintenance(db, today, mc, comps, people)
    notes = _seed_notes(db, today, mc, people)
    _seed_rejects(db, today, mc, ref["parts"])
    _seed_precursors(db, maint, notes)
    _seed_cards(db, mc, comps, people)
