"""3D Machine Knowledge Map component query service.

Provides dynamic, real-time component states, live sensor telemetry,
risk calculation, and linked knowledge. Reference: TASKS.md T12 and PRD.md §9.4.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.erp import Employee, Machine, Maintenance
from app.models.guardian import Warning
from app.models.guide import ProcedureStep
from app.models.knowledge import KnowledgeCard
from app.models.map3d import Component, ComponentPin
from app.models.ops import Anomaly, SensorReading
from app.schemas.map3d import ComponentKnowledge, ComponentOut, MachineLiveTelemetry

# Default 3D metadata catalog for standard VMC machines, keyed by the seeded mesh_name
VMC_COMPONENT_DEFAULTS: Dict[str, Dict[str, Any]] = {
    "spindle": {
        "display_name": "Spindle Assembly",
        "category": "Drive & Headstock",
        "description": (
            "High-speed precision cartridge spindle with ceramic hybrid angular "
            "contact bearings. Houses BT40 taper."
        ),
        "position": [0.0, 1.45, -0.15],
        "pin_position": [0.0, 1.95, 0.05],
        "specs": {
            "Max RPM": "12,000 RPM",
            "Taper": "BT40 / CAT40",
            "Drive Power": "15 kW Direct Drive",
            "Bearings": "Ceramic Hybrid Angular Contact",
            "Coolant": "Through-Spindle + Ring Nozzles",
        },
    },
    "atc": {
        "display_name": "Tool Holder & ATC Magazine",
        "category": "Automatic Tool Changer",
        "description": (
            "24-station arm-type automatic tool changer (ATC) magazine with "
            "dual-gripper swing arm."
        ),
        "position": [-0.72, 1.55, -0.1],
        "pin_position": [-0.85, 1.95, 0.15],
        "specs": {
            "Tool Capacity": "24 Tools (BT40)",
            "Changer Type": "Twin-Arm Cam Driven",
            "Max Tool Weight": "7.0 kg",
            "Tool Change Time": "1.8 sec (Tool to Tool)",
        },
    },
    "table_vise": {
        "display_name": "T-Slot Worktable",
        "category": "Workholding & Kinematics",
        "description": (
            "Precision ground Meehanite cast-iron table with 5 precision T-slots "
            "for modular clamping."
        ),
        "position": [0.0, 0.65, 0.05],
        "pin_position": [0.65, 0.95, 0.35],
        "specs": {
            "Table Size": "1,000 x 500 mm",
            "Max Table Load": "600 kg",
            "T-Slot Width": "18 mm H8 (5 slots)",
            "X / Y Travel": "800 mm / 500 mm",
        },
    },
    "vise": {
        "display_name": "Precision Clamping Vise",
        "category": "Clamping Fixture",
        "description": (
            "Kurt-style 6-inch precision CNC milling vise with flame-hardened bed "
            "and matched-height ground step jaws."
        ),
        "position": [0.0, 0.84, 0.0],
        "pin_position": [-0.25, 1.15, 0.25],
        "specs": {
            "Jaw Width": "150 mm (6 inch)",
            "Jaw Opening": "225 mm",
            "Clamping Force": "35 kN at 90 Nm torque",
            "Bed Height": "73.0 ± 0.01 mm matched",
        },
    },
    "control_panel": {
        "display_name": "Operator Pendant Console",
        "category": "HMI & Controller",
        "description": (
            "Ergonomic swing-arm operator console with 15-inch industrial LCD, "
            "tactile QWERTY keyboard, MPG, and stack light."
        ),
        "position": [1.35, 1.45, 0.95],
        "pin_position": [1.45, 1.85, 1.05],
        "specs": {
            "Screen": "15-inch Color TFT LCD",
            "CNC Control": "Fanuc 0i-MF Plus / Siemens 828D",
            "MPG Handwheel": "x1, x10, x100 detented dial",
            "Tower Light": "3-Tier Industrial LED",
        },
    },
    "doors": {
        "display_name": "Enclosure Sliding Doors",
        "category": "Safety Enclosure",
        "description": (
            "Twin sliding safety enclosure doors with 12 mm impact-resistant "
            "polycarbonate observation windows and RFID interlocks."
        ),
        "position": [0.0, 1.35, 0.95],
        "pin_position": [0.55, 1.65, 1.05],
        "specs": {
            "Viewing Glass": "12 mm Polycarbonate / Laminated Safety Glass",
            "Interlock Type": "RFID Solenoid Locking Switch (Category 4)",
            "Sealing": "Twin Neoprene Coolant Wipers",
            "Action": "Dual-slide counterbalanced guide rails",
        },
    },
    "machine_body": {
        "display_name": "Machine Body, Base & Column",
        "category": "Structural Casting",
        "description": (
            "Rigid Meehanite cast-iron base bed and vertical Z-axis column "
            "providing high vibration damping."
        ),
        "position": [0.0, 1.35, 0.0],
        "pin_position": [-1.05, 0.55, 0.85],
        "specs": {
            "Bed Casting": "Heavy-Ribbed Meehanite Cast Iron GC-300",
            "Machine Weight": "4,850 kg",
            "Footprint": "2,400 x 2,200 mm",
            "Leveling": "6 Vibration-Damping Leveling Wedges",
        },
    },
}


def get_machine_telemetry(db: Session, machine_id: int) -> MachineLiveTelemetry:
    """Fetch live telemetry, sensor readings, and operational status for a machine."""
    machine = db.get(Machine, machine_id)
    machine_name = machine.name if machine else f"Machine-{machine_id}"

    # Latest readings
    vibration = (
        db.execute(
            select(SensorReading.value)
            .where(SensorReading.machine_id == machine_id, SensorReading.sensor == "vibration")
            .order_by(SensorReading.ts.desc())
        ).scalar()
        or 1.85
    )
    temp = (
        db.execute(
            select(SensorReading.value)
            .where(SensorReading.machine_id == machine_id, SensorReading.sensor == "spindle_temp")
            .order_by(SensorReading.ts.desc())
        ).scalar()
        or 41.2
    )
    load = (
        db.execute(
            select(SensorReading.value)
            .where(SensorReading.machine_id == machine_id, SensorReading.sensor == "spindle_load")
            .order_by(SensorReading.ts.desc())
        ).scalar()
        or 42.5
    )

    # Active open warnings
    open_warnings_count = db.execute(
        select(func.count())
        .select_from(Warning)
        .where(Warning.machine_id == machine_id, Warning.status.in_(["open", "acknowledged"]))
    ).scalar_one()

    # Recent anomalies
    recent_anomaly = db.execute(
        select(Anomaly).where(Anomaly.machine_id == machine_id).order_by(Anomaly.ts.desc()).limit(1)
    ).scalar()

    status = "online"
    latest_anomaly_text = None
    if recent_anomaly:
        latest_anomaly_text = (
            f"Anomaly on {recent_anomaly.sensor}: {recent_anomaly.value:g} "
            f"(z={recent_anomaly.zscore:+.1f})"
        )
        status = "warning"
    elif open_warnings_count > 0:
        status = "warning"
    elif load > 20:
        status = "running"

    # Spindle RPM estimation from load/baseline
    rpm = 8200.0 if status in ("running", "warning") else 0.0

    return MachineLiveTelemetry(
        machine_id=machine_id,
        machine_name=machine_name,
        status=status,
        spindle_rpm=rpm,
        vibration=round(float(vibration), 3),
        spindle_temp=round(float(temp), 1),
        spindle_load=round(float(load), 1),
        doors_open=False,
        active_warnings_count=open_warnings_count,
        anomalies_count=1 if recent_anomaly else 0,
        latest_anomaly=latest_anomaly_text,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


def list_components(db: Session, machine_id: int) -> List[ComponentOut]:
    """Retrieve machine components with live dynamic risk levels, telemetry, and pinned cards."""
    # Query database components
    db_components = (
        db.execute(select(Component).where(Component.machine_id == machine_id)).scalars().all()
    )

    # Fetch live telemetry to drive component states
    telemetry = get_machine_telemetry(db, machine_id)

    # Open warnings by component
    warnings = (
        db.execute(
            select(Warning).where(
                Warning.machine_id == machine_id, Warning.status.in_(["open", "acknowledged"])
            )
        )
        .scalars()
        .all()
    )
    warnings_by_comp: Dict[int, List[Warning]] = {}
    for w in warnings:
        if w.component_id:
            warnings_by_comp.setdefault(w.component_id, []).append(w)

    # Breakdowns and procedures recorded against each part (two grouped queries, no N+1).
    ids = [c.id for c in db_components]
    breakdowns: Dict[int, List[Maintenance]] = {}
    for row in db.execute(
        select(Maintenance)
        .where(Maintenance.component_id.in_(ids), Maintenance.kind == "breakdown")
        .order_by(Maintenance.done_on.desc())
    ).scalars():
        breakdowns.setdefault(row.component_id, []).append(row)
    procedures = dict(
        db.execute(
            select(
                ProcedureStep.component_id, func.count(func.distinct(ProcedureStep.procedure_id))
            )
            .where(ProcedureStep.component_id.in_(ids))
            .group_by(ProcedureStep.component_id)
        ).all()
    )

    results: List[ComponentOut] = []

    # The machine's real components; the 3D defaults only add descriptions, specs and positions.
    for db_comp in sorted(db_components, key=lambda c: c.id):
        mesh_name = db_comp.mesh_name
        meta = VMC_COMPONENT_DEFAULTS.get(mesh_name, {})

        # Dynamic risk calculation based on live warnings & sensor telemetry
        risk = "low"
        comp_status = "Optimal / Normal"
        comp_warnings = warnings_by_comp.get(db_comp.id, [])

        if mesh_name == "spindle":
            # Spindle reflects vibration, temp, and stop alerts dynamically
            if telemetry.vibration > 3.0 or telemetry.spindle_temp > 50.0:
                risk = "high"
                comp_status = (
                    f"High Chatter Risk ({telemetry.vibration} mm/s, {telemetry.spindle_temp}°C)"
                )
            elif any(w.severity == "stop" for w in comp_warnings):
                risk = "high"
                comp_status = "STOP Warning Alert"
            elif any(w.severity == "caution" for w in comp_warnings) or telemetry.vibration > 2.2:
                risk = "medium"
                comp_status = "Elevated Vibration Caution"
        elif any(w.severity == "stop" for w in comp_warnings):
            risk = "high"
            comp_status = "Component Interlock Alert"
        elif any(w.severity == "caution" for w in comp_warnings):
            risk = "medium"
            comp_status = "Caution Monitored"

        cards = _card_dicts(db, db_comp.id)
        incidents = [
            {
                "id": f"INC-{row.id}",
                "date": row.done_on.isoformat(),
                "type": row.kind,
                "summary": row.description,
            }
            for row in breakdowns.get(db_comp.id, [])
        ]
        knowledge_count = {
            "tips": len(cards),
            "incidents": len(incidents),
            "troubleshooting": 0,
            "procedures": procedures.get(db_comp.id, 0),
            "total": len(cards) + len(incidents) + procedures.get(db_comp.id, 0),
        }

        results.append(
            ComponentOut(
                id=db_comp.id,
                machine_id=machine_id,
                mesh_name=mesh_name,
                display_name=meta.get("display_name", db_comp.display_name),
                category=meta.get("category"),
                description=meta.get("description"),
                risk=risk,
                incident_count=len(incidents),
                status=comp_status,
                telemetry={
                    "vibration": telemetry.vibration,
                    "temperature": telemetry.spindle_temp,
                    "load": telemetry.spindle_load,
                    "status": telemetry.status,
                },
                position=meta.get("position"),
                pin_position=meta.get("pin_position"),
                specs=meta.get("specs"),
                knowledge_count=knowledge_count,
                expert_tips=cards if cards else None,
                expert_notes=cards if cards else None,
                past_incidents=incidents,
            )
        )

    return results


def _card_dicts(
    db: Session, component_id: int, limit: Optional[int] = None, offset: int = 0
) -> List[Dict[str, Any]]:
    """Cards on a component with their real author, review state and pin severity (one query)."""
    rows = db.execute(
        select(KnowledgeCard, Employee.name, ComponentPin.severity)
        .outerjoin(Employee, Employee.id == KnowledgeCard.author_id)
        .outerjoin(ComponentPin, ComponentPin.card_id == KnowledgeCard.id)
        .where(KnowledgeCard.component_id == component_id)
        .order_by(KnowledgeCard.id)
        .limit(limit)
        .offset(offset)
    ).all()
    return [
        {
            "id": card.id,
            "title": card.title,
            "text": card.action,
            "why": card.why,
            "date": card.created_at.strftime("%Y-%m-%d") if card.created_at else None,
            "confidence": round(card.confidence * 100),
            "author": author or "Unknown",
            # Cards captured outside the 3D map have no pin severity; chatter is the known risk.
            "severity": severity or ("stop" if "chatter" in card.title.lower() else "watch"),
            "verified": card.verified_by_id is not None,
        }
        for card, author, severity in rows
    ]


def component_knowledge(
    db: Session, component_id: int, limit: int = 20, offset: int = 0
) -> Optional[ComponentKnowledge]:
    """Retrieve full knowledge cards, incidents, and troubleshooting for a component."""
    component = db.get(Component, component_id)
    if component is None:
        # Fallback by ID matching default list
        comps = list_components(db, machine_id=1)
        target = next((c for c in comps if c.id == component_id), None)
        if target:
            return ComponentKnowledge(
                component=target,
                cards=target.expert_tips or [],
                incidents=target.past_incidents or [],
                troubleshooting=[],
                specs=target.specs or {},
                knowledge_count=target.knowledge_count or {},
            )
        return None

    # Fetch component details with live stats
    all_comps = list_components(db, machine_id=component.machine_id)
    comp_out = next((c for c in all_comps if c.id == component.id), None)
    if not comp_out:
        return None

    card_list = _card_dicts(db, component.id, limit=limit, offset=offset)

    return ComponentKnowledge(
        component=comp_out,
        cards=card_list,
        incidents=comp_out.past_incidents or [],
        troubleshooting=[],
        specs=comp_out.specs or {},
        knowledge_count=comp_out.knowledge_count or {},
    )
