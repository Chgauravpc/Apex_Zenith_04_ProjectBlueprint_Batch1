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


def test_list_machine_components(client, story) -> None:
    """Lists components for VMC-3 with risk levels, live telemetry, and specs."""
    machines = client.get("/api/machines").json()
    vmc = next(m for m in machines if m["name"] == "VMC-3")

    res = client.get(f"/api/machines/{vmc['id']}/components")
    assert res.status_code == 200

    comps = res.json()
    assert len(comps) >= 6

    meshes = {c["mesh_name"] for c in comps}
    assert "spindle" in meshes
    assert "tool_holder" in meshes
    assert "worktable" in meshes
    assert "vise" in meshes
    assert "control_panel" in meshes
    assert "doors" in meshes

    spindle = next(c for c in comps if c["mesh_name"] == "spindle")
    assert spindle["risk"] in ("low", "medium", "high")
    assert spindle["display_name"] == "Spindle Assembly"
    assert spindle["specs"] is not None
    assert "Max RPM" in spindle["specs"]


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


def test_create_component_pin(client, story) -> None:
    """Creates a new pinned knowledge note for a 3D component."""
    machines = client.get("/api/machines").json()
    vmc = next(m for m in machines if m["name"] == "VMC-3")
    comps = client.get(f"/api/machines/{vmc['id']}/components").json()
    spindle = next(c for c in comps if c["mesh_name"] == "spindle")

    payload = {
        "title": "SS304 Chatter Reduction Check",
        "text": "Reduce feed to 0.15 mm/rev and inspect drawbar clamping before heavy cut.",
        "severity": "stop",
        "knowledge_type": "tip",
        "author": "Ramesh (Old Employee)",
        "mesh_name": "spindle",
        "x": 0.0,
        "y": 1.85,
        "z": 0.15,
    }

    res = client.post(f"/api/components/{spindle['id']}/pins", json=payload)
    assert res.status_code == 200

    pin = res.json()
    assert pin["component_id"] == spindle["id"]
    assert pin["title"] == payload["title"]
    assert pin["text"] == payload["text"]
    assert pin["severity"] == "stop"
    assert pin["knowledge_type"] == "tip"
    assert pin["verified"] is True


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
