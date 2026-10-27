"""Sensor simulator: streams spindle vibration / temperature / load to the real API.

Stands in for a machine gateway (old CNCs have no network). Readings follow a realistic
baseline with noise and slow drift; anomalies can be injected at chosen seconds.

    python -m simulators.sensor_sim --machine-id 1 --sensor vibration --seconds 300 --spike-at 200
"""

import argparse
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

import httpx
import numpy as np

logger = logging.getLogger(__name__)

# sensor -> (baseline, noise std, drift per hour, spike size); units: mm/s, °C, % load
PROFILES: Dict[str, Tuple[float, float, float, float]] = {
    "vibration": (2.0, 0.05, 0.10, 1.6),
    "spindle_temp": (38.0, 0.25, 4.0, 14.0),
    "spindle_load": (45.0, 1.5, 2.0, 35.0),
}
DEFAULT_BATCH = 60


def generate(
    sensor: str,
    seconds: int,
    start: datetime,
    spikes: Iterable[int] = (),
    seed: int = 0,
) -> List[Tuple[datetime, float]]:
    """One reading per second: baseline + linear drift + Gaussian noise, spikes added."""
    if sensor not in PROFILES:
        raise ValueError(f"unknown sensor {sensor!r}; choose from {sorted(PROFILES)}")
    base, noise, drift_per_h, spike = PROFILES[sensor]
    t = np.arange(seconds)
    values = (
        base + drift_per_h * t / 3600 + noise * np.random.default_rng(seed).standard_normal(seconds)
    )
    for s in spikes:
        if 0 <= s < seconds:
            values[s] += spike
    return [(start + timedelta(seconds=int(i)), round(float(v), 3)) for i, v in zip(t, values)]


def stream(
    client: Any,
    machine_id: int,
    sensor: str,
    readings: Sequence[Tuple[datetime, float]],
    batch: int = DEFAULT_BATCH,
) -> List[Dict[str, Any]]:
    """POST readings in batches to /api/capture/sensors; return each batch report.

    `client` is an httpx.Client (or FastAPI TestClient) pointed at the Blueprint API.
    """
    reports = []
    for i in range(0, len(readings), batch):
        chunk = readings[i : i + batch]
        resp = client.post(
            "/api/capture/sensors",
            json={
                "machine_id": machine_id,
                "sensor": sensor,
                "readings": [{"ts": ts.isoformat(), "value": v} for ts, v in chunk],
            },
        )
        resp.raise_for_status()
        report = resp.json()
        if report["anomalies"]:
            logger.info("batch %d: %d anomalies", i // batch, report["anomalies"])
        reports.append(report)
    return reports


def main(argv: Optional[Sequence[str]] = None) -> None:
    """CLI entry point."""
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--api", default="http://localhost:8000")
    parser.add_argument("--machine-id", type=int, required=True)
    parser.add_argument("--sensor", choices=sorted(PROFILES), default="vibration")
    parser.add_argument("--seconds", type=int, default=300)
    parser.add_argument("--spike-at", type=int, action="append", default=[])
    parser.add_argument("--batch", type=int, default=DEFAULT_BATCH)
    parser.add_argument("--seed", type=int, default=0)
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO)

    start = datetime.now().replace(microsecond=0) - timedelta(seconds=args.seconds)
    readings = generate(args.sensor, args.seconds, start, args.spike_at, args.seed)
    with httpx.Client(base_url=args.api, timeout=30) as client:
        reports = stream(client, args.machine_id, args.sensor, readings, args.batch)
    total = sum(r["anomalies"] for r in reports)
    print(f"sent {len(readings)} {args.sensor} readings, anomalies flagged: {total}")


if __name__ == "__main__":
    main()
