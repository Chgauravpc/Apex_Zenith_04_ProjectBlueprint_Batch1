"""Sensor readings: storage and rolling z-score anomaly detection.

A reading is an anomaly when it is more than `z` standard deviations away from the
mean of the `window` readings before it. Means and deviations come from cumulative
sums, so a batch of n readings is checked in O(n) time, not O(n × window).
"""

import logging
from typing import List

import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import NotFound, ValidationFailed
from app.models.erp import Machine
from app.models.ops import Anomaly, Event, SensorReading
from app.schemas.capture import IngestReport, SensorBatchIn

logger = logging.getLogger(__name__)

WINDOW = 60  # readings of history used as "normal" (1 min at 1 Hz)
Z_LIMIT = 3.0
MIN_STD = 1e-6  # a perfectly flat signal still flags a jump instead of dividing by zero


def detect_anomalies(readings: np.ndarray, window: int = WINDOW, z: float = Z_LIMIT) -> List[int]:
    """Indexes of readings that sit more than `z` std devs from the previous `window` readings.

    The first `window` readings only build history and are never flagged.

    Complexity: O(n) time, O(n) memory (two cumulative sums).
    """
    if window < 2:
        raise ValueError("window must be at least 2")
    x = np.asarray(readings, dtype=np.float64)
    n = x.size
    if n <= window:
        return []
    c1 = np.concatenate(([0.0], np.cumsum(x)))
    c2 = np.concatenate(([0.0], np.cumsum(x * x)))
    idx = np.arange(window, n)
    s1 = c1[idx] - c1[idx - window]  # sum of x[i-window : i]
    s2 = c2[idx] - c2[idx - window]
    mean = s1 / window
    var = np.maximum(s2 / window - mean * mean, 0.0)  # clamp tiny negative rounding
    std = np.maximum(np.sqrt(var), MIN_STD)
    score = np.abs(x[idx] - mean) / std
    return (idx[score > z]).tolist()


def ingest_readings(db: Session, batch: SensorBatchIn) -> IngestReport:
    """Store a batch and record anomalies (plus a timeline event for each).

    The last `WINDOW` stored readings of the same sensor are prepended as history, so
    detection is continuous across batches.

    Complexity: one history query, one bulk insert, O(n) detection.
    """
    if db.get(Machine, batch.machine_id) is None:
        raise NotFound(f"machine {batch.machine_id} not found")
    times = [r.ts for r in batch.readings]
    if any(b < a for a, b in zip(times, times[1:])):
        raise ValidationFailed("readings must be sorted oldest first")

    history = (
        db.execute(
            select(SensorReading.value)
            .where(
                SensorReading.machine_id == batch.machine_id, SensorReading.sensor == batch.sensor
            )
            .order_by(SensorReading.ts.desc())
            .limit(WINDOW)
        )
        .scalars()
        .all()[::-1]
    )
    values = np.array(list(history) + [r.value for r in batch.readings], dtype=np.float64)
    flagged = [i - len(history) for i in detect_anomalies(values) if i >= len(history)]

    db.add_all(
        [
            SensorReading(machine_id=batch.machine_id, sensor=batch.sensor, value=r.value, ts=r.ts)
            for r in batch.readings
        ]
    )
    anomalies = []
    for i in flagged:
        r = batch.readings[i]
        window = values[len(history) + i - WINDOW : len(history) + i]
        zscore = float((r.value - window.mean()) / max(window.std(), MIN_STD))
        anomalies.append(
            Anomaly(
                machine_id=batch.machine_id,
                sensor=batch.sensor,
                value=r.value,
                zscore=round(zscore, 2),
                ts=r.ts,
            )
        )
    db.add_all(anomalies)
    db.flush()
    db.add_all(
        [
            Event(
                machine_id=a.machine_id,
                kind="anomaly",
                ref_type="anomaly",
                ref_id=a.id,
                summary=f"{a.sensor} {a.value:g} (z={a.zscore:+.1f})",
                occurred_at=a.ts,
            )
            for a in anomalies
        ]
    )
    db.commit()
    if anomalies:
        logger.info(
            "machine %s %s: %d anomalies in %d readings",
            batch.machine_id,
            batch.sensor,
            len(anomalies),
            len(batch.readings),
        )
    return IngestReport(
        stored=len(batch.readings), anomalies=len(anomalies), anomaly_ids=[a.id for a in anomalies]
    )
