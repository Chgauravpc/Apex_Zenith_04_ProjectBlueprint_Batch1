"""Demo training data: buddy pairing, skill levels, one approved procedure, reference samples.

Reference samples are generated here, not downloaded:
- sound clips: WAV files built with numpy (tooth-passing tone, plus a 427 Hz chatter
  tone for the "chatter" clip), so the chatter tool has a known answer to check;
- chip photos: OpenCV drawings of curled chips in silver / straw / blue, so the
  chip reader has known colours. Real phone recordings/photos replace them later
  through the normal capture flow.
"""

import wave
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple

import cv2
import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.erp import Material, Operation, Part
from app.models.guide import SKILL_CAN_TEACH, SKILL_GUIDED, Procedure, ProcedureStep, SkillMatrix
from app.models.knowledge import ChipSample, KnowledgeCard, SoundClip
from app.models.map3d import Component
from app.models.transfer import KnowledgeBuddy
from app.services import storage

SAMPLE_RATE = 44100
CLIP_SECONDS = 3
SPINDLE_RPM = 9000  # used for the reference clips; 2 teeth → tooth passing 300 Hz
CHATTER_HZ = 427.0

# step_no, instruction, component, params, check name, tol min, tol max, unit, safety, critical
STEPS: List[Tuple[Any, ...]] = [
    (
        1,
        "Clean vise jaws and seat with air; no chips under the part.",
        "table_vise",
        {},
        None,
        None,
        None,
        None,
        "Safety glasses",
        False,
    ),
    (
        2,
        "Clamp FL-101 blank, tap down with a soft hammer until it does not move.",
        "table_vise",
        {"vise_torque_nm": 40},
        None,
        None,
        None,
        None,
        None,
        False,
    ),
    (
        3,
        "Load T3 50 mm face mill; check all 4 inserts are seated.",
        "atc",
        {},
        None,
        None,
        None,
        None,
        "Gloves when handling inserts",
        False,
    ),
    (
        4,
        "Rough face at 0.15 mm/rev, depth 1.0 mm; listen for chatter.",
        "spindle",
        {"feed": 0.15, "depth": 1.0, "speed": 3500},
        None,
        None,
        None,
        None,
        None,
        True,
    ),
    (
        5,
        "Finish face at 0.12 mm/rev, depth 0.2 mm, fresh insert edge.",
        "spindle",
        {"feed": 0.12, "depth": 0.2, "speed": 3800},
        None,
        None,
        None,
        None,
        None,
        True,
    ),
    (
        6,
        "Measure flange thickness with micrometer.",
        "table_vise",
        {},
        "thickness",
        11.95,
        12.05,
        "mm",
        None,
        True,
    ),
]

# file name, colour label, BGR colour, tool material
CHIPS = [
    ("chips_silver.jpg", "silver", (192, 192, 192), "carbide"),
    ("chips_straw.jpg", "straw", (60, 175, 225), "carbide"),
    ("chips_blue.jpg", "blue", (170, 90, 30), "carbide"),
]


def _get_or_add(db: Session, model: Any, lookup: Dict[str, Any], **defaults: Any) -> Any:
    row = db.execute(select(model).filter_by(**lookup)).scalar_one_or_none()
    if row is None:
        row = model(**lookup, **defaults)
        db.add(row)
        db.flush()
    return row


def write_wav(path: Path, freqs: List[Tuple[float, float]], seed: int) -> None:
    """Write a mono 16-bit WAV of summed sines (freq Hz, amplitude) plus light noise."""
    t = np.arange(SAMPLE_RATE * CLIP_SECONDS) / SAMPLE_RATE
    signal = sum(a * np.sin(2 * np.pi * f * t) for f, a in freqs)
    signal = signal + 0.05 * np.random.default_rng(seed).standard_normal(t.size)
    pcm = np.int16(signal / np.max(np.abs(signal)) * 0.8 * 32767)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(pcm.tobytes())


def draw_chips(path: Path, bgr: Tuple[int, int, int], seed: int) -> None:
    """Draw curled chips (thick elliptic arcs) of one colour on a grey tray."""
    rng = np.random.default_rng(seed)
    img = np.full((480, 640, 3), 70, np.uint8)
    for _ in range(25):
        centre = (int(rng.integers(60, 580)), int(rng.integers(60, 420)))
        axes = (int(rng.integers(15, 40)), int(rng.integers(8, 25)))
        start = int(rng.integers(0, 180))
        shade = rng.uniform(0.85, 1.15)
        colour = tuple(int(min(255, c * shade)) for c in bgr)
        cv2.ellipse(img, centre, axes, int(rng.integers(0, 180)), start, start + 270, colour, 7)
    cv2.imwrite(str(path), img, [cv2.IMWRITE_JPEG_QUALITY, 85])


def _seed_procedure(db: Session, mc: Dict[str, Any], people: Dict[str, Any]) -> None:
    vmc3 = mc["VMC-3"]
    comps = {
        c.mesh_name: c.id
        for c in db.execute(select(Component).filter_by(machine_id=vmc3.id)).scalars()
    }
    part = db.execute(select(Part).filter_by(number="FL-101")).scalar_one()
    op = db.execute(select(Operation).filter_by(name="face milling")).scalar_one()
    proc = _get_or_add(
        db,
        Procedure,
        {"key": "vmc3-fl101-face", "version": 1},
        title="Face milling FL-101 flange on VMC-3",
        machine_id=vmc3.id,
        part_id=part.id,
        operation_id=op.id,
        status="approved",
        author_id=people["Ramesh"].id,
        approver_id=people["Anil"].id,
        approved_at=datetime(2026, 1, 12, 9, 0),
    )
    for no, text, comp, params, check, lo, hi, unit, safety, critical in STEPS:
        _get_or_add(
            db,
            ProcedureStep,
            {"procedure_id": proc.id, "step_no": no},
            instruction=text,
            component_id=comps[comp],
            params=params,
            check_name=check,
            tolerance_min=lo,
            tolerance_max=hi,
            unit=unit,
            safety=safety,
            critical=critical,
            expected_seconds=120,
        )


def _seed_samples(db: Session, mc: Dict[str, Any], people: Dict[str, Any]) -> None:
    out = Path(get_settings().storage_dir) / "seed"
    out.mkdir(parents=True, exist_ok=True)
    vmc3, ramesh = mc["VMC-3"], people["Ramesh"]
    spindle = db.execute(
        select(Component).filter_by(machine_id=vmc3.id, mesh_name="spindle")
    ).scalar_one()
    tpf = SPINDLE_RPM * vmc3.teeth / 60  # tooth-passing frequency
    chatter_card = (
        db.execute(select(KnowledgeCard).filter_by(machine_id=vmc3.id, symptom="chatter"))
        .scalars()
        .first()
    )
    clips = [
        ("vmc3_normal.wav", "normal cutting", [(tpf, 1.0), (2 * tpf, 0.4)], None),
        (
            "vmc3_chatter.wav",
            "chatter",
            [(tpf, 0.6), (2 * tpf, 0.3), (CHATTER_HZ, 1.0)],
            chatter_card.id if chatter_card else None,
        ),
    ]
    for i, (name, label, freqs, card_id) in enumerate(clips):
        path = out / name
        write_wav(path, freqs, seed=i)
        storage.persist(path)
        _get_or_add(
            db,
            SoundClip,
            {"file_path": str(path)},
            machine_id=vmc3.id,
            component_id=spindle.id,
            label=label,
            contributor_id=ramesh.id,
            card_id=card_id,
        )

    ss304 = db.execute(select(Material).filter_by(name="SS304")).scalar_one()
    chip_card = (
        db.execute(select(KnowledgeCard).filter_by(machine_id=vmc3.id, symptom="chip_colour"))
        .scalars()
        .first()
    )
    for i, (name, colour, bgr, tool_mat) in enumerate(CHIPS):
        path = out / name
        draw_chips(path, bgr, seed=i)
        storage.persist(path)
        _get_or_add(
            db,
            ChipSample,
            {"file_path": str(path)},
            machine_id=vmc3.id,
            colour=colour,
            shape="curled",
            tool_material=tool_mat,
            material_id=ss304.id,
            contributor_id=ramesh.id,
            card_id=chip_card.id if chip_card else None,
        )


def seed_training(db: Session, ref: Dict[str, Any]) -> None:
    """Buddy pairs, skill levels, the approved VMC-3 procedure and reference samples."""
    mc, people = ref["machines"], ref["people"]
    pairs = [("Priya", "Ramesh", "VMC-3"), ("Priya", "Suresh", "Lathe-2")]
    for new, old, mname in pairs:
        _get_or_add(
            db,
            KnowledgeBuddy,
            {"new_employee_id": people[new].id, "machine_id": mc[mname].id},
            old_employee_id=people[old].id,
        )
    ops = {o.name: o.id for o in db.execute(select(Operation)).scalars()}
    levels = [
        ("Ramesh", "face milling", SKILL_CAN_TEACH),
        ("Ramesh", "drilling", SKILL_CAN_TEACH),
        ("Suresh", "turning", SKILL_CAN_TEACH),
        ("Priya", "face milling", SKILL_GUIDED),
        ("Priya", "turning", SKILL_GUIDED),
    ]
    for who, op, level in levels:
        _get_or_add(
            db,
            SkillMatrix,
            {"employee_id": people[who].id, "operation_id": ops[op]},
            level=level,
            signed_off_by_id=people["Anil"].id,
        )
    _seed_procedure(db, mc, people)
    _seed_samples(db, mc, people)
