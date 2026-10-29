"""Unit tests for 3D Machine Knowledge Map endpoints (T12 / T21)."""

from datetime import date

import pytest

from app.services import embeddings


@pytest.fixture()
def story(db, tmp_path, monkeypatch):
    from app.config import get_settings
    from seed.seed import seed

    monkeypatch.setattr(get_settings(), "storage_dir", str(tmp_path))
    monkeypatch.setattr(embeddings, "try_embed", lambda texts, kind="passage": None)
    seed(db, date.today())


def test_list_machine_components(client, story, db) -> None:
    """Lists components for VMC-3 with risk levels, live telemetry, and specs."""
    machines = client.get("/api/machines").json()
    vmc = next(m for m in machines if m["name"] == "VMC-3")

    res = client.get(f"/api/machines/{vmc['id']}/components")
    assert res.status_code == 200

    comps = res.json()
    assert len(comps) >= 6

    # The 3D model's nodes, each backed by a real component, plus parts the model does not draw.
    meshes = {c["mesh_name"] for c in comps}
    assert {"spindle", "tool_holder", "worktable", "vise", "control_panel"} <= meshes
    assert {"coolant", "chip_conveyor"} <= meshes
    assert "doors" not in meshes  # no component in the database, so no made-up id

    spindle = next(c for c in comps if c["mesh_name"] == "spindle")
    assert spindle["risk"] in ("low", "medium", "high")
    assert spindle["display_name"] == "Spindle Assembly"
    assert spindle["specs"] is not None
    assert "Max RPM" in spindle["specs"]

    from sqlalchemy import select

    from app.models.map3d import Component

    real = {
        c.id: c.mesh_name
        for c in db.execute(select(Component).where(Component.machine_id == vmc["id"])).scalars()
    }
    assert all(c["id"] in real for c in comps)
    by_mesh = {c["mesh_name"]: c["id"] for c in comps}
    assert real[by_mesh["tool_holder"]] == "atc" and real[by_mesh["vise"]] == "table_vise"


def test_component_incidents_are_its_own_breakdowns(client, story, db) -> None:
    from sqlalchemy import select

    from app.models.erp import Maintenance

    vmc = next(m for m in client.get("/api/machines").json() if m["name"] == "VMC-3")
    for comp in client.get(f"/api/machines/{vmc['id']}/components").json():
        rows = db.execute(
            select(Maintenance).where(
                Maintenance.component_id == comp["id"], Maintenance.kind == "breakdown"
            )
        ).scalars()
        assert sorted(i["summary"] for i in comp["past_incidents"]) == sorted(
            r.description for r in rows
        )
        assert comp["incident_count"] == len(comp["past_incidents"])
        assert comp["knowledge_count"]["tips"] == len(comp["expert_tips"] or [])


def test_get_component_knowledge(client, story) -> None:
    """Fetches verified cards, incidents, and troubleshooting for a component."""
    machines = client.get("/api/machines").json()
    vmc = next(m for m in machines if m["name"] == "VMC-3")
    comps = client.get(f"/api/machines/{vmc['id']}/components").json()
    spindle = next(c for c in comps if c["mesh_name"] == "spindle")

    res = client.get(f"/api/components/{spindle['id']}/knowledge")
    assert res.status_code == 200

    data = res.json()
    assert data["component"]["id"] == spindle["id"]
    assert "cards" in data
    assert "incidents" in data
    assert "specs" in data
    assert "knowledge_count" in data


def _spindle(client):
    machines = client.get("/api/machines").json()
    vmc = next(m for m in machines if m["name"] == "VMC-3")
    comps = client.get(f"/api/machines/{vmc['id']}/components").json()
    return next(c for c in comps if c["mesh_name"] == "spindle")


def _pin_payload(author_id, **extra):
    return {
        "title": "SS304 Chatter Reduction Check",
        "text": "Reduce feed to 0.15 mm/rev and inspect drawbar clamping before heavy cut.",
        "severity": "stop",
        "knowledge_type": "tip",
        "author_id": author_id,
        "author": "Ramesh (Old Employee)",
        "mesh_name": "spindle",
        "x": 0.0,
        "y": 1.85,
        "z": 0.15,
        **extra,
    }


def test_create_component_pin(client, story, db) -> None:
    """A pin becomes a card by its real author, waits for review and is searchable."""
    from sqlalchemy import select

    from app.database import fts_search
    from app.models.erp import Employee
    from app.models.knowledge import KnowledgeCard
    from app.models.map3d import ComponentPin

    spindle = _spindle(client)
    ramesh = db.execute(select(Employee).where(Employee.name == "Ramesh Patil")).scalar_one()
    payload = _pin_payload(ramesh.id)

    res = client.post(f"/api/components/{spindle['id']}/pins", json=payload)
    assert res.status_code == 200

    pin = res.json()
    assert pin["component_id"] == spindle["id"]
    assert pin["title"] == payload["title"]
    assert pin["text"] == payload["text"]
    assert pin["severity"] == "stop"
    assert pin["knowledge_type"] == "tip"
    assert pin["author"] == "Ramesh Patil"
    assert pin["verified"] is False  # nobody checked it yet

    db.expire_all()
    card = db.get(KnowledgeCard, pin["card_id"])
    assert card.author_id == ramesh.id and card.verified_by_id is None
    stored = db.get(ComponentPin, pin["id"])
    assert (stored.severity, stored.kind) == ("stop", "tip")

    queue = client.get("/api/capture/review-queue", params={"limit": 100}).json()
    assert pin["card_id"] in [c["id"] for c in queue["items"]]
    hits = fts_search(db, "drawbar clamping", machine_id=card.machine_id)
    assert ("card", card.id) in [(kind, rid) for kind, rid, _ in hits]

    shown = client.get(f"/api/components/{spindle['id']}/knowledge").json()["cards"]
    mine = next(c for c in shown if c["id"] == card.id)
    assert (mine["author"], mine["verified"], mine["severity"]) == ("Ramesh Patil", False, "stop")
    assert mine["date"] == card.created_at.strftime("%Y-%m-%d") and mine["confidence"] == 100
    assert all(c["author"] != "Ramesh (Master Machinist)" for c in shown)


def test_pin_needs_a_known_author_and_valid_severity(client, story) -> None:
    spindle = _spindle(client)
    url = f"/api/components/{spindle['id']}/pins"

    assert client.post(url, json=_pin_payload(99999)).status_code == 404
    assert client.post(url, json=_pin_payload(1, severity="panic")).status_code == 422
    no_author = _pin_payload(1)
    del no_author["author_id"]
    assert client.post(url, json=no_author).status_code == 422
    assert client.post("/api/components/99999/pins", json=_pin_payload(1)).status_code == 404


def test_auto_pin_links_a_card_to_the_part_it_names(client, story, db) -> None:
    from app.models.knowledge import KnowledgeCard
    from app.models.map3d import Component
    from app.services.map3d.pins import auto_pin

    spindle = _spindle(client)
    machine_id = db.get(Component, spindle["id"]).machine_id
    named = KnowledgeCard(
        title="Spindle warm-up", action="Run 10 min at 2000 rpm", machine_id=machine_id
    )
    unrelated = KnowledgeCard(
        title="Clean the chip tray", action="Every shift", machine_id=machine_id
    )
    db.add_all([named, unrelated])
    db.flush()

    assert auto_pin(db, named) == spindle["id"]
    assert auto_pin(db, unrelated) is None


def test_machine_live_telemetry(client, story) -> None:
    """Retrieves live sensor telemetry, vibration, and alarms for the 3D viewer."""
    machines = client.get("/api/machines").json()
    vmc = next(m for m in machines if m["name"] == "VMC-3")

    res = client.get(f"/api/machines/{vmc['id']}/telemetry")
    assert res.status_code == 200

    telemetry = res.json()
    assert telemetry["machine_id"] == vmc["id"]
    assert telemetry["machine_name"] == "VMC-3"
    assert telemetry["status"] in ("online", "running", "warning", "idle", "maintenance")
    assert "vibration" in telemetry
    assert "spindle_temp" in telemetry
    assert "spindle_rpm" in telemetry


def test_unknown_component_knowledge(client, story) -> None:
    """Returns 404 for non-existent component."""
    res = client.get("/api/components/99999/knowledge")
    assert res.status_code == 404
