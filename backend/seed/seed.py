"""Load the demo story into the real database: `python -m seed.seed`.

Story: Ramesh (old employee, retiring in ~7 months) is the only person who
really knows VMC-3. Priya (new employee) has just joined and is paired with
him. Suresh (old employee) knows Lathe-2 and VMC-1.

Idempotent: every row is looked up by a natural key first, so running the
seed twice gives the same row counts.
"""

import logging
from datetime import date, timedelta
from typing import Any, Dict, Type, TypeVar

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, init_db
from app.models.erp import (
    ROLE_NEW,
    ROLE_OLD,
    ROLE_SUPERVISOR,
    Employee,
    Machine,
    Maintenance,
    Material,
    Operation,
    Part,
    QCReject,
    Tool,
)
from app.models.guardian import FailurePrecursor, ParamLimit
from app.models.guide import Procedure, ProcedureStep, SkillMatrix
from app.models.knowledge import ChipSample, Document, KnowledgeCard, SoundClip
from app.models.map3d import Component
from app.models.ops import Event
from app.models.transfer import KnowledgeBuddy
from app.services.capture import extractor
from seed.history import seed_history
from seed.training import seed_training

logger = logging.getLogger(__name__)

M = TypeVar("M", bound=Base)

MACHINES = [
    # name, type, rpm_min, rpm_max, default teeth, location
    ("VMC-3", "VMC", 500, 12000, 2, "Bay A"),
    ("VMC-1", "VMC", 500, 10000, 4, "Bay A"),
    ("Lathe-2", "CNC lathe", 50, 3000, 1, "Bay B"),
]

VMC_COMPONENTS = [
    ("spindle", "Spindle", ["spindle", "spindle bearing", "स्पिंडल", "स्पिंडल बेअरिंग"]),
    ("atc", "Tool holder / ATC", ["atc", "tool changer", "tool holder", "holder", "टूल होल्डर"]),
    ("table_vise", "Table & vise", ["vise", "vice", "table", "fixture", "clamp", "वाइस"]),
    ("coolant", "Coolant system", ["coolant", "nozzle", "coolant pump", "कूलेंट"]),
    ("axes", "Axes / ways", ["axis", "ways", "ballscrew", "x axis", "y axis", "z axis"]),
    ("control_panel", "Control panel", ["control", "panel", "alarm", "screen", "कंट्रोल"]),
    ("chip_conveyor", "Chip conveyor", ["chip conveyor", "conveyor", "chips tray"]),
]

LATHE_COMPONENTS = [
    ("chuck", "Chuck", ["chuck", "jaw", "jaws", "चक"]),
    ("spindle", "Spindle", ["spindle", "headstock", "स्पिंडल"]),
    ("tailstock", "Tailstock", ["tailstock", "live centre", "centre", "टेलस्टॉक"]),
    ("turret", "Turret", ["turret", "tool post", "insert holder"]),
    ("coolant", "Coolant system", ["coolant", "nozzle", "कूलेंट"]),
    ("carriage", "Carriage / slides", ["carriage", "slide", "gib"]),
]

MATERIALS = [("SS304", "stainless"), ("EN8", "steel"), ("Al6061", "aluminium")]
OPERATIONS = ["face milling", "pocket milling", "drilling", "turning", "boring"]
TOOLS = [
    # name, tool material, teeth, diameter mm
    ("10 mm 2-flute carbide end mill", "carbide", 2, 10.0),
    ("50 mm face mill, 4 inserts", "carbide", 4, 50.0),
    ("8.5 mm HSS drill", "HSS", 2, 8.5),
    ("CNMG 120408 turning insert", "carbide", 1, None),
]
PARTS = [
    ("FL-101", "Flange 4-hole", "SS304"),
    ("SH-220", "Drive shaft", "EN8"),
    ("BR-310", "Mounting bracket", "Al6061"),
]

# machine, material (or None = any), param, min, max, unit, note
PARAM_LIMITS = [
    ("VMC-3", "SS304", "feed", 0.05, 0.2, "mm/rev", "Above 0.2 the spindle starts to chatter"),
    ("VMC-3", "SS304", "depth", 0.2, 1.5, "mm", "Finish pass max 0.3 mm"),
    ("VMC-3", None, "speed", 500, 12000, "rpm", "Machine range"),
    ("VMC-3", None, "spindle_temp", None, 55, "°C", "Stop and check lubrication above 55"),
    ("VMC-1", "Al6061", "feed", 0.05, 0.35, "mm/rev", None),
    ("VMC-1", None, "speed", 500, 10000, "rpm", "Machine range"),
    ("Lathe-2", "EN8", "feed", 0.1, 0.35, "mm/rev", None),
    ("Lathe-2", "EN8", "depth", 0.5, 3.0, "mm", None),
    ("Lathe-2", None, "speed", 50, 2500, "rpm", "Chuck rated to 2500"),
]


def get_or_create(db: Session, model: Type[M], lookup: Dict[str, Any], **defaults: Any) -> M:
    """Return the row matching `lookup`, creating it with `defaults` if missing."""
    row = db.execute(select(model).filter_by(**lookup)).scalar_one_or_none()
    if row is None:
        row = model(**lookup, **defaults)
        db.add(row)
        db.flush()
    return row


def seed_reference(db: Session, today: date) -> Dict[str, Any]:
    """Machines, components, materials, operations, tools, parts, people and limits."""
    machines = {
        name: get_or_create(
            db,
            Machine,
            {"name": name},
            external_id=f"ERP-MC-{name}",
            type=mtype,
            rpm_min=rmin,
            rpm_max=rmax,
            teeth=teeth,
            location=loc,
        )
        for name, mtype, rmin, rmax, teeth, loc in MACHINES
    }
    for machine in machines.values():
        parts_list = LATHE_COMPONENTS if machine.type == "CNC lathe" else VMC_COMPONENTS
        for mesh, display, aliases in parts_list:
            get_or_create(
                db,
                Component,
                {"machine_id": machine.id, "mesh_name": mesh},
                display_name=display,
                aliases=aliases,
            )

    materials = {
        n: get_or_create(db, Material, {"name": n}, external_id=f"ERP-MAT-{n}", category=c)
        for n, c in MATERIALS
    }
    for op in OPERATIONS:
        get_or_create(db, Operation, {"name": op}, external_id=f"ERP-OP-{op}")
    for name, tmat, teeth, dia in TOOLS:
        get_or_create(db, Tool, {"name": name}, tool_material=tmat, teeth=teeth, diameter_mm=dia)
    parts = {}
    for number, name, mat in PARTS:
        parts[number] = get_or_create(
            db,
            Part,
            {"number": number},
            external_id=f"ERP-PT-{number}",
            name=name,
            material_id=materials[mat].id,
        )

    # Creation order fixes the ids the frontend's role switcher uses:
    # 1 = Ramesh (old), 2 = Priya (new), 3 = Suresh, 4 = Anil (supervisor).
    people = {
        "Ramesh": get_or_create(
            db,
            Employee,
            {"external_id": "ERP-EMP-1001"},
            name="Ramesh Patil",
            role=ROLE_OLD,
            language="hi",
            join_date=date(1998, 6, 1),
            exit_date=today + timedelta(days=213),
        ),
        "Priya": get_or_create(
            db,
            Employee,
            {"external_id": "ERP-EMP-2041"},
            name="Priya Shinde",
            role=ROLE_NEW,
            language="hi",
            join_date=today - timedelta(days=30),
        ),
        "Suresh": get_or_create(
            db,
            Employee,
            {"external_id": "ERP-EMP-1002"},
            name="Suresh Jadhav",
            role=ROLE_OLD,
            language="mr",
            join_date=date(2005, 3, 15),
        ),
        "Anil": get_or_create(
            db,
            Employee,
            {"external_id": "ERP-EMP-0007"},
            name="Anil Kulkarni",
            role=ROLE_SUPERVISOR,
            language="mr",
            join_date=date(2010, 1, 4),
        ),
    }

    for mname, mat, param, lo, hi, unit, note in PARAM_LIMITS:
        get_or_create(
            db,
            ParamLimit,
            {
                "machine_id": machines[mname].id,
                "material_id": materials[mat].id if mat else None,
                "param": param,
            },
            min_value=lo,
            max_value=hi,
            unit=unit,
            note=note,
            set_by_id=people["Ramesh"].id,
        )
    return {"machines": machines, "materials": materials, "parts": parts, "people": people}


def seed(db: Session, today: date) -> Dict[str, int]:
    """Load all demo data and return row counts per table."""
    ref = seed_reference(db, today)
    seed_history(db, today, ref)
    seed_training(db, ref)
    db.commit()
    counted = [
        Machine,
        Component,
        Material,
        Operation,
        Tool,
        Part,
        Employee,
        ParamLimit,
        Maintenance,
        QCReject,
        Document,
        KnowledgeCard,
        FailurePrecursor,
        Event,
        KnowledgeBuddy,
        SkillMatrix,
        Procedure,
        ProcedureStep,
        SoundClip,
        ChipSample,
    ]
    return {
        m.__tablename__: db.execute(select(func.count()).select_from(m)).scalar_one()
        for m in counted
    }


def main() -> None:
    """CLI entry point: create tables, seed, print counts."""
    logging.basicConfig(level=logging.INFO)
    init_db()
    with SessionLocal() as db:
        counts = seed(db, date.today())
        filled = extractor.backfill_embeddings(db)
    for table, n in counts.items():
        logger.info("%-16s %d", table, n)
    logger.info("card vectors     %d (0 means embeddings are off or unavailable)", filled)


if __name__ == "__main__":
    main()
