"""The demo seed loads the story and is idempotent."""

from datetime import date
from pathlib import Path

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.erp import Employee, Machine
from app.models.map3d import Component
from seed.seed import seed

TODAY = date(2026, 10, 27)


@pytest.fixture(autouse=True)
def _tmp_storage(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Seed writes reference WAV/JPEG files; keep them out of the real storage dir."""
    from app.config import get_settings

    monkeypatch.setattr(get_settings(), "storage_dir", str(tmp_path))


def test_seed_is_idempotent(db: Session) -> None:
    first = seed(db, TODAY)
    second = seed(db, TODAY)
    assert first == second
    assert first["machines"] == 3 and first["employees"] == 4
    assert first["components"] == 7 + 7 + 6


def test_seed_story_facts(db: Session) -> None:
    seed(db, TODAY)
    vmc3 = db.execute(select(Machine).filter_by(name="VMC-3")).scalar_one()
    assert (vmc3.rpm_min, vmc3.rpm_max, vmc3.teeth) == (500, 12000, 2)
    ramesh = db.execute(select(Employee).filter_by(external_id="ERP-EMP-1001")).scalar_one()
    assert ramesh.role == "old_employee" and ramesh.exit_date > TODAY
    spindle = db.execute(
        select(Component).filter_by(machine_id=vmc3.id, mesh_name="spindle")
    ).scalar_one()
    assert "स्पिंडल" in spindle.aliases


def test_seed_history_counts_and_precursor(db: Session) -> None:
    from app.models.guardian import FailurePrecursor

    counts = seed(db, TODAY)
    assert counts["knowledge_cards"] >= 30
    assert counts["qc_rejects"] == 10
    vmc3 = db.execute(select(Machine).filter_by(name="VMC-3")).scalar_one()
    chatter = db.execute(
        select(FailurePrecursor).filter_by(machine_id=vmc3.id, symptom="chatter")
    ).scalar_one()
    # Computed from seeded notes: chatter was written down before 4 of the 5 spindle failures.
    assert (chatter.preceded_count, chatter.total_failures) == (4, 5)
    assert len(chatter.evidence_ids) == 4


def test_seed_is_searchable(db: Session) -> None:
    from app.database import fts_search

    seed(db, TODAY)
    vmc3 = db.execute(select(Machine).filter_by(name="VMC-3")).scalar_one()
    hits = fts_search(db, "chatter", machine_id=vmc3.id, limit=50)
    kinds = {h[0] for h in hits}
    assert {"card", "note", "qc_reject"} <= kinds
    assert fts_search(db, "चैटर", machine_id=vmc3.id)  # Hindi card and note


def test_seed_training_and_samples(db: Session, tmp_path: Path) -> None:
    import wave

    import cv2

    from app.models.guide import ProcedureStep
    from app.models.knowledge import ChipSample, SoundClip
    from app.models.transfer import KnowledgeBuddy

    counts = seed(db, TODAY)
    assert counts["knowledge_buddies"] == 2 and counts["procedure_steps"] == 6
    step6 = db.execute(select(ProcedureStep).filter_by(step_no=6)).scalar_one()
    assert (step6.tolerance_min, step6.tolerance_max, step6.critical) == (11.95, 12.05, True)
    buddy = db.execute(select(KnowledgeBuddy)).scalars().first()
    assert buddy.old_employee_id != buddy.new_employee_id

    chatter = db.execute(select(SoundClip).filter_by(label="chatter")).scalar_one()
    with wave.open(chatter.file_path) as w:
        assert (w.getframerate(), w.getnchannels()) == (44100, 1) and w.getnframes() == 3 * 44100
    blue = db.execute(select(ChipSample).filter_by(colour="blue")).scalar_one()
    img = cv2.imread(blue.file_path)
    assert img is not None and img.shape == (480, 640, 3)
    assert Path(blue.file_path).parent == tmp_path / "seed"
