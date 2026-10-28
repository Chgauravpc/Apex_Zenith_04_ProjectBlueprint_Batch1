"""Machines list and timeline, transfer metrics (seeded story)."""

from datetime import date

import pytest

from app.models.guardian import Warning
from app.services import embeddings


@pytest.fixture()
def story(db, tmp_path, monkeypatch):
    from app.config import get_settings
    from seed.seed import seed

    monkeypatch.setattr(get_settings(), "storage_dir", str(tmp_path))
    monkeypatch.setattr(embeddings, "try_embed", lambda texts, kind="passage": None)
    seed(db, date.today())


def test_machines_listed_by_name(client, story) -> None:
    names = [m["name"] for m in client.get("/api/machines").json()]
    assert names == sorted(names) and "VMC-3" in names


def test_timeline_newest_first_and_paged(client, story) -> None:
    vmc = next(m for m in client.get("/api/machines").json() if m["name"] == "VMC-3")
    body = client.get(f"/api/machines/{vmc['id']}/timeline?limit=5").json()
    assert body["machine"] == "VMC-3" and body["total"] > 5 and len(body["items"]) == 5
    times = [e["occurred_at"] for e in body["items"]]
    assert times == sorted(times, reverse=True)
    assert {e["kind"] for e in body["items"]} <= {
        "note",
        "warning",
        "qc_reject",
        "anomaly",
        "maintenance",
        "meeting",
        "run",
        "chatter",
    }
    page2 = client.get(f"/api/machines/{vmc['id']}/timeline?limit=5&offset=5").json()
    assert not {e["id"] for e in page2["items"]} & {e["id"] for e in body["items"]}


def test_timeline_unknown_machine(client, story) -> None:
    assert client.get("/api/machines/999/timeline").status_code == 404


def test_metrics_counted_from_records(client, story, db) -> None:
    body = client.get("/api/transfer/metrics").json()
    assert 0 < body["coverage"] <= 100 and body["parts_total"] > 0
    assert body["parts_at_risk"] > 0  # Ramesh is the only one who knows VMC-3
    assert body["verified_cards"] > 0
    stops = db.query(Warning).filter_by(severity="stop").count()
    assert body["guardian_stops"] == stops
    priya = next(p for p in body["new_employees"] if p["employee"].startswith("Priya"))
    assert priya["trained_ops"] >= 1 and priya["independent_ops"] == 0
    assert priya["days_on_job"] is not None and priya["days_on_job"] >= 0
