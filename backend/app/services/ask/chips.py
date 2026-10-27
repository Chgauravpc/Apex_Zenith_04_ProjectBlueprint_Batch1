"""Chip Reader: photo of chips → colour → what it says about cutting heat.

Steel chips take temper colours from the heat at the cutting edge: silver → straw →
bronze → violet → blue as it gets hotter (hue is the strongest signal, Pagani et al. 2020).
The reading is a learning cue shown with the old employee's own note, never a verdict.
Complexity: O(pixels) on an image resized to ≤ 1280 px.
"""

import logging
from pathlib import Path
from typing import Dict, Optional, Tuple

import cv2
import numpy as np
from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import NotFound, ValidationFailed
from app.models.erp import ROLE_OLD, Employee, Machine, Material
from app.models.knowledge import ChipSample, KnowledgeCard
from app.schemas.ask import ChipColour, ChipResult, ExpertCard
from app.utils import lexicon
from app.utils.files import save_upload

logger = logging.getLogger(__name__)

MAX_LONG_SIDE = 1280
MIN_CHIP_SHARE = 0.005  # below 0.5% of the photo there are no chips to read
UNIFORM_LAB_DISTANCE = 12.0  # whole photo is one colour → it is all chips
SILVER_MAX_SATURATION = 60  # OpenCV S (0..255): below this a pixel is grey/silver
MIN_COLOURED_SHARE = 0.25  # at least a quarter of chip pixels coloured → not silver
BACKGROUND_FRACTION = 12  # median-blur window = 1/12 of the short side (≫ chip width)
# OpenCV hue bands (0..179), checked in order. Red-brown wraps around 180.
HUE_BANDS = [
    ("straw", 15, 35),
    ("bronze", 0, 15),
    ("bronze", 165, 180),
    ("violet", 125, 165),
    ("blue", 90, 125),
]
TEMPER_RANGE = {
    "silver": "below ~200 °C",
    "straw": "~220–240 °C",
    "bronze": "~250–270 °C",
    "violet": "~280–290 °C",
    "blue": "~300–320 °C",
}
STEEL_HEAT = {"silver": 0, "straw": 1, "bronze": 2, "violet": 3, "blue": 3}

# (tool material, heat level) → (severity, diagnosis, recommendation)
RULES: Dict[Tuple[str, int], Tuple[str, str, str]] = {
    ("carbide", 0): (
        "ok",
        "Cool cut.",
        "Fine for finishing; for roughing you may have room " "to raise speed a little.",
    ),
    ("carbide", 1): ("ok", "Normal cutting heat for carbide on steel.", "Keep going."),
    ("carbide", 2): (
        "caution",
        "Getting hot.",
        "Check coolant flow and insert wear before " "the next part.",
    ),
    ("carbide", 3): (
        "stop",
        "Too hot at the edge.",
        "Reduce speed about 10%, check coolant " "aim and change the insert edge if it is worn.",
    ),
    ("hss", 0): ("ok", "Cool cut for HSS.", "Keep going."),
    ("hss", 1): ("caution", "Upper limit for HSS.", "Do not raise speed; keep coolant on."),
    ("hss", 2): (
        "stop",
        "Too hot for HSS: the edge softens.",
        "Stop, reduce speed 20–30% " "and check the edge.",
    ),
    ("hss", 3): (
        "stop",
        "Far too hot for HSS.",
        "Stop now, reduce speed, regrind or replace " "the tool.",
    ),
}


def _resize(img: np.ndarray) -> np.ndarray:
    h, w = img.shape[:2]
    scale = MAX_LONG_SIDE / max(h, w)
    if scale >= 1:
        return img
    return cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)


def segment_chips(img_bgr: np.ndarray) -> np.ndarray:
    """Mask (uint8 0/255) of chip pixels.

    The tray/bench colour is taken from the photo border; pixels far from it (Lab distance,
    Otsu threshold) are chips. A photo filled with chips (no visible background) → all chips.
    """
    img = _resize(img_bgr)
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
    border = np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])
    if np.linalg.norm(lab - np.median(border, axis=0), axis=2).max() < UNIFORM_LAB_DISTANCE:
        return np.full(lab.shape[:2], 255, np.uint8)
    # Local background: a wide median blur wipes out thin chips but keeps the tray and its
    # uneven lighting, so a bright corner of the tray is not mistaken for chips.
    k = max(3, (min(img.shape[:2]) // BACKGROUND_FRACTION) | 1)
    background = cv2.cvtColor(cv2.medianBlur(img, min(k, 255)), cv2.COLOR_BGR2LAB)
    dist = np.linalg.norm(lab - background.astype(np.float32), axis=2)
    scaled = np.clip(dist * (255.0 / max(float(dist.max()), 1e-6)), 0, 255).astype(np.uint8)
    _, mask = cv2.threshold(scaled, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    kernel = np.ones((3, 3), np.uint8)
    return cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)


def classify_hue(img_bgr: np.ndarray, mask: np.ndarray) -> ChipColour:
    """Colour class from the chip pixels: saturation decides silver, hue decides the rest.

    Raises:
        ValidationFailed: no chips in the mask.
    """
    img = _resize(img_bgr)
    if mask.shape != img.shape[:2]:
        mask = cv2.resize(mask, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_NEAREST)
    chips = mask > 0
    share = float(chips.mean())
    if share < MIN_CHIP_SHARE:
        raise ValidationFailed("no chips found in the photo; put them on a plain tray")
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)[chips].astype(np.float64)
    hue, sat, val = hsv[:, 0], hsv[:, 1], hsv[:, 2]
    coloured = sat >= SILVER_MAX_SATURATION
    mean_sat = float(sat.mean())
    if coloured.mean() < MIN_COLOURED_SHARE:  # mostly grey pixels → silver chips
        colour, mean_hue = "silver", float(np.median(hue))
    else:
        # Vote per coloured pixel; a few stray grey pixels cannot turn blue into silver.
        h = hue[coloured]
        votes = {name: 0 for name, _, _ in HUE_BANDS}
        votes["other"] = 0
        for name, lo, hi in HUE_BANDS:
            votes[name] += int(((h >= lo) & (h < hi)).sum())
        votes["other"] = int(h.size - sum(votes.values()))
        colour = max(votes, key=votes.get)
        # Circular mean hue of the winning pixels (hue wraps at 180).
        angle = h * (2 * np.pi / 180.0)
        mean_hue = float(
            (np.arctan2(np.sin(angle).sum(), np.cos(angle).sum()) % (2 * np.pi))
            * 180.0
            / (2 * np.pi)
        )
    return ChipColour(
        colour=colour,
        hue=round(mean_hue, 1),
        saturation=round(mean_sat, 1),
        value=round(float(val.mean()), 1),
        coverage=round(100 * share, 1),
    )


def _is_aluminium(workpiece: str) -> bool:
    w = lexicon.normalize(workpiece)
    return any(k in w for k in ("alumin", "al6061", "al 6061", "एल्यु"))


def diagnose(colour: ChipColour, tool_material: str, workpiece: str) -> ChipResult:
    """Rule table → what the colour means for this tool and workpiece."""
    tool = "hss" if lexicon.normalize(tool_material) in ("hss", "high speed steel") else "carbide"
    if _is_aluminium(workpiece):
        ok = colour.colour == "silver"
        severity, diagnosis, recommendation = (
            ("ok", "Bright aluminium chips: clean cut.", "Keep going.")
            if ok
            else (
                "caution",
                "Aluminium does not change colour with heat; discoloured chips "
                "usually mean built-up edge or dirty coolant.",
                "Clean the tool edge and check coolant concentration.",
            )
        )
        temp = "not readable from colour for aluminium"
    elif colour.colour == "other":
        severity, diagnosis, recommendation = (
            "caution",
            "Colour not recognised.",
            "Retake the photo in daylight on a plain tray.",
        )
        temp = "unknown"
    else:
        severity, diagnosis, recommendation = RULES[(tool, STEEL_HEAT[colour.colour])]
        temp = TEMPER_RANGE[colour.colour]
    return ChipResult(
        colour=colour.colour,
        hue=colour.hue,
        saturation=colour.saturation,
        coverage=colour.coverage,
        temperature_range=temp,
        severity=severity,
        diagnosis=diagnosis,
        recommendation=recommendation,
        tool_material=tool,
        workpiece=workpiece,
    )


def _expert_card(db: Session, workpiece: str, machine_id: Optional[int]) -> Optional[ExpertCard]:
    """Old employee's verified chip-colour note, preferring the same material family."""
    rows = db.execute(
        select(KnowledgeCard, Employee.name, Material.category)
        .join(Employee, Employee.id == KnowledgeCard.author_id)
        .outerjoin(Material, Material.id == KnowledgeCard.material_id)
        .where(
            KnowledgeCard.symptom == "chip_colour",
            KnowledgeCard.verified_by_id.is_not(None),
            Employee.role == ROLE_OLD,
        )
    ).all()
    if not rows:
        return None
    family = "aluminium" if _is_aluminium(workpiece) else "steel"

    def rank(row) -> Tuple[int, int, float]:
        card, _, category = row
        same_family = (category == "aluminium") == (family == "aluminium")
        return (not same_family, card.machine_id != machine_id, -card.score)

    card, name, _ = min(rows, key=rank)
    return ExpertCard(id=card.id, title=card.title, action=card.action, why=card.why, author=name)


def read_chips(
    db: Session,
    file: UploadFile,
    tool_material: str,
    workpiece: str,
    machine_id: Optional[int] = None,
) -> ChipResult:
    """Photo upload → mask → colour → diagnosis + old employee's note; keeps the sample."""
    if machine_id is not None and db.get(Machine, machine_id) is None:
        raise NotFound(f"machine {machine_id} not found")
    path: Path = save_upload(file, "image")
    img = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if img is None:
        raise ValidationFailed("file is not a readable image")
    colour = classify_hue(img, segment_chips(img))
    result = diagnose(colour, tool_material, workpiece)
    result.expert_card = _expert_card(db, workpiece, machine_id)
    db.add(
        ChipSample(
            machine_id=machine_id,
            file_path=str(path),
            colour=colour.colour,
            shape=None,
            tool_material=result.tool_material,
            card_id=result.expert_card.id if result.expert_card else None,
        )
    )
    db.commit()
    logger.info("chips colour=%s hue=%.0f severity=%s", colour.colour, colour.hue, result.severity)
    return result
