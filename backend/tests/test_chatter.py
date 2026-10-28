"""Chatter Doctor: FFT on real generated audio, stable speeds, endpoint on the seeded clip."""

from datetime import date
from pathlib import Path

import numpy as np
import pytest
import soundfile as sf
from sqlalchemy import select

from app.errors import ValidationFailed
from app.models.erp import Machine
from app.models.knowledge import SoundClip
from app.services.ask import chatter
from app.services.ask.chatter import dominant_frequency, harmonics, stable_rpms


@pytest.mark.parametrize("fc,n,expected_first", [(427, 2, 12810), (300, 4, 4500)])
def test_stable_rpms(fc, n, expected_first) -> None:
    assert stable_rpms(fc, n, 0, 20000)[0] == expected_first


def test_stable_rpms_rejects_bad_input() -> None:
    with pytest.raises(ValueError):
        stable_rpms(0, 2, 0, 20000)


def test_stable_rpms_respects_machine_range() -> None:
    assert stable_rpms(427, 2, 500, 12000) == [6405, 4270]  # 12,810 is above VMC-3's max


def _tone(freqs, seconds=3.0, sr=44100, noise=0.3, seed=0):
    t = np.arange(int(sr * seconds)) / sr
    x = sum(a * np.sin(2 * np.pi * f * t) for f, a in freqs)
    return x + noise * np.random.default_rng(seed).standard_normal(t.size)


def test_dominant_frequency_finds_427_hz_in_noise() -> None:
    signal = _tone([(427, 1.0)])
    assert abs(dominant_frequency(signal, 44100, exclude=[]) - 427) <= 2


def test_tooth_passing_harmonics_are_ignored() -> None:
    # 9000 rpm × 2 teeth = 300 Hz tooth passing, louder than the chatter itself.
    signal = _tone([(300, 2.0), (600, 1.0), (427, 0.8)])
    loud = dominant_frequency(signal, 44100, exclude=[])
    found = dominant_frequency(signal, 44100, exclude=harmonics(300, 5000))
    assert abs(loud - 300) <= 2 and abs(found - 427) <= 2


def test_load_audio_resamples_and_validates(tmp_path: Path) -> None:
    path = tmp_path / "s.wav"
    sf.write(path, _tone([(427, 1.0)], seconds=12, sr=48000, noise=0.05).astype(np.float32), 48000)
    audio = chatter.load_audio(path)
    assert audio.size == 10 * 44100  # trimmed to 10 s and resampled to 44.1 kHz
    assert abs(dominant_frequency(audio, 44100, []) - 427) <= 2

    webm = tmp_path / "rec.wav"
    webm.write_bytes(b"\x1aE\xdf\xa3" + b"\x00" * 2000)  # browser webm saved as .wav
    with pytest.raises(ValidationFailed):
        chatter.load_audio(webm)
    silent = tmp_path / "quiet.wav"
    sf.write(silent, np.zeros(44100, np.float32), 44100)
    with pytest.raises(ValidationFailed):
        chatter.load_audio(silent)


@pytest.fixture()
def story(db, tmp_path, monkeypatch):
    from app.config import get_settings
    from seed.seed import seed

    monkeypatch.setattr(get_settings(), "storage_dir", str(tmp_path))
    seed(db, date.today())
    return {m.name: m for m in db.execute(select(Machine)).scalars()}


def test_chatter_endpoint_on_seeded_vmc3_recording(client, db, story) -> None:
    clip = db.execute(select(SoundClip).filter_by(label="chatter")).scalar_one()
    with open(clip.file_path, "rb") as fh:
        resp = client.post(
            "/api/ask/chatter",
            files={"file": ("chatter.wav", fh, "audio/wav")},
            data={"machine_id": str(story["VMC-3"].id), "current_rpm": "9000"},
        )
    body = resp.json()
    assert resp.status_code == 200, body
    assert abs(body["fc"] - 427) <= 2 and body["clear_chatter"]
    assert body["tooth_passing_hz"] == 300.0 and body["teeth"] == 2
    assert body["candidate_rpms"] == [6405, 4270] and body["nearest_rpm"] == 6405
    assert body["expert_card"]["author"] == "Ramesh Patil"
    assert "0.12" in body["expert_card"]["action"]


def test_normal_cut_is_not_called_chatter(client, db, story) -> None:
    clip = db.execute(select(SoundClip).filter_by(label="normal cutting")).scalar_one()
    with open(clip.file_path, "rb") as fh:
        body = client.post(
            "/api/ask/chatter",
            files={"file": ("n.wav", fh, "audio/wav")},
            data={"machine_id": str(story["VMC-3"].id), "current_rpm": "9000"},
        ).json()
    assert not body["clear_chatter"] and "may not be chatter" in body["explanation"]


def test_chatter_endpoint_errors(client, story, tmp_path) -> None:
    wav = tmp_path / "x.wav"
    sf.write(wav, _tone([(427, 1.0)], seconds=1).astype(np.float32), 44100)
    with open(wav, "rb") as fh:
        missing = client.post(
            "/api/ask/chatter",
            files={"file": ("x.wav", fh, "audio/wav")},
            data={"machine_id": "999"},
        )
    assert missing.status_code == 404
