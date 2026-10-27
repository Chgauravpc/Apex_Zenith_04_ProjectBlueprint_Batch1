"""Chip Reader: colour classes on generated images, rules, endpoint on seeded chip photos."""

from datetime import date

import cv2
import numpy as np
import pytest
from sqlalchemy import select

from app.errors import ValidationFailed
from app.models.knowledge import ChipSample
from app.schemas.ask import ChipColour
from app.services.ask import chips

SOLID = {  # BGR
    "blue": (170, 90, 30),
    "straw": (60, 175, 225),
    "silver": (192, 192, 192),
    "bronze": (40, 90, 160),
    "violet": (160, 60, 130),
}


@pytest.mark.parametrize("name,bgr", list(SOLID.items()))
def test_solid_images_classify_correctly(name, bgr) -> None:
    img = np.full((400, 600, 3), bgr, np.uint8)
    mask = chips.segment_chips(img)
    assert mask.mean() == 255  # whole frame is chips
    assert chips.classify_hue(img, mask).colour == name


def test_chips_on_a_tray_are_segmented() -> None:
    img = np.full((480, 640, 3), 70, np.uint8)  # grey tray
    for x in range(60, 600, 90):
        cv2.ellipse(img, (x, 240), (30, 15), 0, 0, 270, SOLID["blue"], 7)
    mask = chips.segment_chips(img)
    share = (mask > 0).mean()
    assert 0.01 < share < 0.2  # only the chips, not the tray
    assert chips.classify_hue(img, mask).colour == "blue"


def test_empty_mask_is_rejected() -> None:
    img = np.full((100, 100, 3), 70, np.uint8)
    with pytest.raises(ValidationFailed):
        chips.classify_hue(img, np.zeros((100, 100), np.uint8))


@pytest.mark.parametrize(
    "colour,tool,workpiece,severity",
    [
        ("blue", "carbide", "SS304", "stop"),
        ("straw", "carbide", "SS304", "ok"),
        ("straw", "hss", "Mild Steel", "caution"),
        ("bronze", "HSS", "EN8", "stop"),
        ("silver", "carbide", "Aluminum", "ok"),
        ("straw", "carbide", "Aluminum", "caution"),  # aluminium does not temper-colour
    ],
)
def test_diagnose_rules(colour, tool, workpiece, severity) -> None:
    result = chips.diagnose(
        ChipColour(colour=colour, hue=0, saturation=0, value=0, coverage=50), tool, workpiece
    )
    assert result.severity == severity and result.recommendation


def test_blue_on_carbide_says_reduce_speed() -> None:
    result = chips.diagnose(
        ChipColour(colour="blue", hue=105, saturation=180, value=170, coverage=30),
        "carbide",
        "SS304",
    )
    assert "Reduce speed" in result.recommendation and result.temperature_range == "~300–320 °C"


@pytest.fixture()
def seeded(db, tmp_path, monkeypatch):
    from app.config import get_settings
    from seed.seed import seed

    monkeypatch.setattr(get_settings(), "storage_dir", str(tmp_path))
    seed(db, date.today())


@pytest.mark.parametrize("colour", ["blue", "straw", "silver"])
def test_endpoint_reads_seeded_chip_photos(client, db, seeded, colour) -> None:
    sample = db.execute(select(ChipSample).filter_by(colour=colour)).scalar_one()
    with open(sample.file_path, "rb") as fh:
        body = client.post(
            "/api/ask/chips",
            files={"file": ("chips.jpg", fh, "image/jpeg")},
            data={"tool_material": "carbide", "workpiece": "SS304"},
        ).json()
    assert body["colour"] == colour, body
    assert body["expert_card"]["author"] == "Ramesh Patil"  # SS304 → steel note


def test_endpoint_aluminium_uses_aluminium_note(client, db, seeded) -> None:
    sample = db.execute(select(ChipSample).filter_by(colour="silver")).scalar_one()
    with open(sample.file_path, "rb") as fh:
        body = client.post(
            "/api/ask/chips",
            files={"file": ("c.jpg", fh, "image/jpeg")},
            data={"tool_material": "carbide", "workpiece": "Aluminum"},
        ).json()
    assert body["severity"] == "ok" and body["expert_card"]["author"] == "Suresh Jadhav"


def test_endpoint_rejects_non_images(client, seeded) -> None:
    resp = client.post("/api/ask/chips", files={"file": ("c.jpg", b"not an image", "image/jpeg")})
    assert resp.status_code == 422


@pytest.mark.parametrize(
    "name,bgr",
    [
        ("blue", (175, 100, 40)),
        ("straw", (50, 165, 215)),
        ("silver", (205, 205, 210)),
        ("violet", (150, 60, 125)),
    ],
)
def test_uneven_light_and_noise(name, bgr) -> None:
    """A bright tray corner and sensor noise must not turn coloured chips into silver."""
    rng = np.random.default_rng(3)
    h, w = 800, 1200
    img = np.full((h, w, 3), (95, 100, 105), np.float32)
    for _ in range(40):
        centre = (int(rng.integers(60, w - 60)), int(rng.integers(60, h - 60)))
        shade = rng.uniform(0.75, 1.15)
        colour = tuple(float(min(255, v * shade)) for v in bgr)
        cv2.ellipse(
            img,
            centre,
            (int(rng.integers(20, 45)), int(rng.integers(10, 25))),
            int(rng.integers(0, 180)),
            0,
            int(rng.integers(200, 330)),
            colour,
            6,
        )
    light = np.linspace(0.7, 1.2, w)[None, :, None] * np.linspace(1.1, 0.8, h)[:, None, None]
    photo = np.clip(img * light + rng.normal(0, 8, img.shape), 0, 255).astype(np.uint8)
    assert chips.classify_hue(photo, chips.segment_chips(photo)).colour == name
