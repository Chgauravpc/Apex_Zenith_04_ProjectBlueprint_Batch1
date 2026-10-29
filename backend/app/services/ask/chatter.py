"""Chatter Doctor: machine sound → chatter frequency → stable spindle speeds.

Regenerative chatter shows up as a strong tone that is NOT a tooth-passing harmonic.
Speeds where the tooth-passing frequency lines up with it are usually stable
(Smith & Tlusty stability-lobe rule):  RPM = 60 · fc / (N · k),  k = 1, 2, 3 …
The result is shown next to what the old employee did for chatter on this machine; the
new employee decides. Complexity: O(n log n) for n ≤ 441,000 samples.
"""

import logging
from pathlib import Path
from typing import List, Optional, Sequence, Tuple

import numpy as np
import soundfile as sf
from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import NotFound, ValidationFailed
from app.models.erp import ROLE_OLD, Employee, Machine
from app.models.knowledge import KnowledgeCard
from app.models.ops import Event
from app.schemas.ask import ChatterResult, ExpertCard
from app.utils.files import save_upload

logger = logging.getLogger(__name__)

SAMPLE_RATE = 44100
MAX_SECONDS = 10  # ENGINEERING.md §4
BAND = (50.0, 5000.0)  # Hz: where machining chatter lives
HARMONIC_TOLERANCE = 0.03  # ±3% around each tooth-passing harmonic is masked
CLEAR_PROMINENCE = 8.0  # peak this many times the median magnitude = clear chatter
LOBES = 3


def load_audio(path: Path, sr: int = SAMPLE_RATE, max_seconds: int = MAX_SECONDS) -> np.ndarray:
    """Read WAV/FLAC/OGG/MP3 as mono float32 at `sr`, at most `max_seconds` long.

    Raises:
        ValidationFailed: format not readable (e.g. browser webm without ffmpeg) or silent.
    """
    try:
        with sf.SoundFile(str(path)) as f:
            native = f.samplerate
            data = f.read(frames=int(native * max_seconds), dtype="float32", always_2d=True)
    except (RuntimeError, sf.LibsndfileError) as exc:
        raise ValidationFailed(
            "could not read this recording; please send WAV, MP3, OGG or FLAC"
        ) from exc
    mono = data.mean(axis=1)
    if mono.size < native // 2:
        raise ValidationFailed("recording is shorter than half a second")
    if native != sr:  # linear resampling is enough for a spectrum below 5 kHz
        t_old = np.arange(mono.size) / native
        t_new = np.arange(int(mono.size * sr / native)) / sr
        mono = np.interp(t_new, t_old, mono).astype(np.float32)
    if not np.any(np.abs(mono) > 1e-4):
        raise ValidationFailed("recording is silent")
    return mono


def harmonics(base_hz: float, up_to: float) -> List[float]:
    """base, 2·base, 3·base … up to `up_to` Hz."""
    if base_hz <= 0:
        return []
    return [base_hz * k for k in range(1, int(up_to // base_hz) + 1)]


def dominant_frequency(
    signal: np.ndarray,
    sr: int,
    exclude: Sequence[float],
    band: Tuple[float, float] = BAND,
) -> float:
    """Strongest frequency in `band`, ignoring ±3% around each frequency in `exclude`."""
    freq, mag = _spectrum(signal, sr)
    mask = _band_mask(freq, band, exclude)
    if not mask.any():
        raise ValidationFailed("no frequencies left to analyse")
    i = int(np.argmax(np.where(mask, mag, -1.0)))
    return _refine(freq, mag, i)


def _spectrum(signal: np.ndarray, sr: int) -> Tuple[np.ndarray, np.ndarray]:
    windowed = (signal - signal.mean()) * np.hanning(signal.size)
    return np.fft.rfftfreq(signal.size, 1.0 / sr), np.abs(np.fft.rfft(windowed))


def _band_mask(freq: np.ndarray, band: Tuple[float, float], exclude: Sequence[float]) -> np.ndarray:
    mask = (freq >= band[0]) & (freq <= band[1])
    for f in exclude:
        mask &= np.abs(freq - f) > f * HARMONIC_TOLERANCE
    return mask


def _refine(freq: np.ndarray, mag: np.ndarray, i: int) -> float:
    """Parabolic interpolation of the peak: sub-bin accuracy."""
    if 0 < i < mag.size - 1:
        a, b, c = mag[i - 1], mag[i], mag[i + 1]
        denom = a - 2 * b + c
        if denom != 0:
            return float(freq[i] + 0.5 * (a - c) / denom * (freq[1] - freq[0]))
    return float(freq[i])


def stable_rpms(
    chatter_hz: float, teeth: int, rpm_min: int, rpm_max: int, lobes: int = LOBES
) -> List[int]:
    """Candidate stable spindle speeds: RPM = 60 * fc / (N * k), k = 1..lobes, within range."""
    if chatter_hz <= 0 or teeth <= 0:
        raise ValueError("chatter_hz and teeth must be positive")
    candidates = (round(60 * chatter_hz / (teeth * k)) for k in range(1, lobes + 1))
    return [rpm for rpm in candidates if rpm_min <= rpm <= rpm_max]


def _expert_card(db: Session, machine_id: int) -> Optional[ExpertCard]:
    row = db.execute(
        select(KnowledgeCard, Employee.name)
        .join(Employee, Employee.id == KnowledgeCard.author_id)
        .where(
            KnowledgeCard.machine_id == machine_id,
            KnowledgeCard.symptom == "chatter",
            KnowledgeCard.verified_by_id.is_not(None),
            Employee.role == ROLE_OLD,
        )
        .order_by(KnowledgeCard.score.desc(), KnowledgeCard.id)
        .limit(1)
    ).first()
    if row is None:
        return None
    card, name = row
    return ExpertCard(id=card.id, title=card.title, action=card.action, why=card.why, author=name)


def analyse_chatter(
    db: Session,
    path: Path,
    machine_id: int,
    teeth: Optional[int] = None,
    current_rpm: Optional[int] = None,
) -> ChatterResult:
    """Full chatter check for one recording on one machine."""
    machine = db.get(Machine, machine_id)
    if machine is None:
        raise NotFound(f"machine {machine_id} not found")
    teeth = teeth or machine.teeth
    if teeth <= 0:
        raise ValidationFailed("number of cutter teeth must be positive")
    signal = load_audio(path)
    tpf = current_rpm * teeth / 60 if current_rpm else None
    exclude = harmonics(tpf, BAND[1]) if tpf else []
    freq, mag = _spectrum(signal, SAMPLE_RATE)
    mask = _band_mask(freq, BAND, exclude)
    i = int(np.argmax(np.where(mask, mag, -1.0)))
    fc = _refine(freq, mag, i)
    prominence = float(mag[i] / max(float(np.median(mag[mask])), 1e-12))
    clear = prominence >= CLEAR_PROMINENCE
    candidates = stable_rpms(fc, teeth, machine.rpm_min, machine.rpm_max)
    nearest = (
        min(candidates, key=lambda r: abs(r - current_rpm)) if candidates and current_rpm else None
    )
    explanation = (
        f"Strongest non-tooth tone is {fc:.0f} Hz"
        + (
            f" (tooth passing at {current_rpm} rpm × {teeth} teeth = {tpf:.0f} Hz was ignored)"
            if tpf
            else ""
        )
        + f". With {teeth} teeth, speeds where the cutter lines up with it are "
        + (", ".join(str(r) for r in candidates) if candidates else "outside this machine's range")
        + " rpm. Try the nearest one and listen again; the decision is yours."
        + ("" if clear else " The peak is weak, so this may not be chatter at all.")
    )
    db.add(
        Event(
            machine_id=machine.id,
            kind="chatter_check",
            ref_type="machine",
            ref_id=machine.id,
            summary=f"chatter check: {fc:.0f} Hz, stable {candidates or 'none in range'}",
        )
    )
    db.commit()
    logger.info("chatter machine=%s fc=%.1f prominence=%.1f", machine.id, fc, prominence)
    return ChatterResult(
        fc=round(fc, 1),
        clear_chatter=clear,
        prominence=round(prominence, 1),
        tooth_passing_hz=round(tpf, 1) if tpf else None,
        teeth=teeth,
        current_rpm=current_rpm,
        rpm_min=machine.rpm_min,
        rpm_max=machine.rpm_max,
        candidate_rpms=candidates,
        nearest_rpm=nearest,
        explanation=explanation,
        expert_card=_expert_card(db, machine.id),
    )


def chatter_from_upload(
    db: Session, file: UploadFile, machine_id: int, teeth: Optional[int], current_rpm: Optional[int]
) -> ChatterResult:
    if db.get(Machine, machine_id) is None:
        raise NotFound(f"machine {machine_id} not found")
    return analyse_chatter(db, save_upload(file, "audio"), machine_id, teeth, current_rpm)
