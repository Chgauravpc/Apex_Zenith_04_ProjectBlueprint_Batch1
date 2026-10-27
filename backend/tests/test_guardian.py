"""Note Guardian: pure rules (this file) and the save-and-check flow."""

import time
from datetime import date

import pytest
from sqlalchemy import select

from app.models.erp import Employee, Machine
from app.models.guardian import Warning
from app.models.ops import Notification
from app.schemas.guardian import (
    Finding,
    GuardianLLMResult,
    LLMWarning,
    NoteIn,
    ParamLimitDTO,
    PrecursorStat,
)
from app.services.guardian import rules
from app.services.guardian.check import save_and_check

FEED = ParamLimitDTO(
    id=1,
    param="feed",
    min_value=0.05,
    max_value=0.2,
    unit="mm/rev",
    note="Above 0.2 the spindle starts to chatter",
)
SPEED = ParamLimitDTO(id=2, param="speed", min_value=500, max_value=12000, unit="rpm")


@pytest.mark.parametrize(
    "params,expected",
    [
        ({"feed": 0.3}, ["stop"]),  # 50% over the limit
        ({"feed": 0.22}, ["caution"]),
        ({"feed": 0.15}, []),
        ({"feed": 0.2}, []),  # exactly at the limit is fine
        ({"feed": 0.02}, ["caution"]),  # below minimum
        ({"speed": 13000, "feed": 0.12}, ["caution"]),
        ({"torque": 99}, []),  # no limit known for this parameter
        ({}, []),
    ],
)
def test_check_params(params, expected) -> None:
    found = rules.check_params(params, [FEED, SPEED])
    assert [f.severity for f in found] == expected
    for f in found:
        assert f.evidence and f.evidence[0].type == "param_limit"


def test_check_params_uses_most_specific_limit_first() -> None:
    ss304 = ParamLimitDTO(id=3, param="feed", max_value=0.2, unit="mm/rev")
    machine_wide = ParamLimitDTO(id=4, param="feed", max_value=0.35, unit="mm/rev")
    found = rules.check_params({"feed": 0.3}, [ss304, machine_wide])
    assert found[0].evidence[0].id == 3 and "0.2" in found[0].message


CHATTER = PrecursorStat(
    id=1,
    symptom="chatter",
    failure_kind="spindle bearing failure",
    preceded_count=4,
    total_failures=5,
    evidence_ids=[1, 2, 4, 5],
)
NOISE = PrecursorStat(
    id=2,
    symptom="noise",
    failure_kind="spindle bearing failure",
    preceded_count=1,
    total_failures=5,
    evidence_ids=[3],
)


@pytest.mark.parametrize(
    "symptoms,expected",
    [
        ({"chatter"}, ["stop"]),
        ({"noise"}, ["caution"]),
        ({"chatter", "noise"}, ["stop", "caution"]),
        ({"burr"}, []),
        (set(), []),
    ],
)
def test_check_precursors(symptoms, expected) -> None:
    found = rules.check_precursors(symptoms, {"chatter": CHATTER, "noise": NOISE})
    assert [f.severity for f in found] == expected


def test_precursor_message_and_evidence() -> None:
    finding = rules.check_precursors({"chatter"}, {"chatter": CHATTER})[0]
    assert "4 of the last 5 spindle bearing failures" in finding.message
    assert [e.id for e in finding.evidence] == [1, 2, 4, 5]


def test_precursor_with_no_failures_is_ignored() -> None:
    empty = CHATTER.model_copy(update={"preceded_count": 0, "total_failures": 0})
    assert rules.check_precursors({"chatter"}, {"chatter": empty}) == []


TODAY = date(2026, 10, 27)


@pytest.mark.parametrize(
    "days_ago,interval,expected",
    [(130, 90, "caution"), (200, 90, "stop"), (50, 90, None), (90, 90, None), (10, 0, None)],
)
def test_check_maintenance(days_ago, interval, expected) -> None:
    from datetime import timedelta

    found = rules.check_maintenance(TODAY - timedelta(days=days_ago), interval, TODAY)
    assert (found.severity if found else None) == expected


def test_overdue_message_counts_days() -> None:
    from datetime import timedelta

    found = rules.check_maintenance(TODAY - timedelta(days=130), 90, TODAY)
    assert "40 days overdue" in found.message


def test_max_severity() -> None:
    def f(s):
        return Finding(rule="x", severity=s, message="m")

    assert rules.max_severity([f("info"), f("stop"), f("caution")]) == "stop"
    assert rules.max_severity([]) is None


# --- save_and_check on the seeded demo story -------------------------------------------------


DEMO_NOTE = "VMC-3 slight chatter, increased feed to 0.3 on SS304"


@pytest.fixture()
def story(db, tmp_path, monkeypatch):
    from app.config import get_settings
    from seed.seed import seed

    monkeypatch.setattr(get_settings(), "storage_dir", str(tmp_path))
    seed(db, date.today())
    people = {e.name.split()[0]: e for e in db.execute(select(Employee)).scalars()}
    machines = {m.name: m for m in db.execute(select(Machine)).scalars()}
    return {"people": people, "machines": machines}


def test_demo_note_gets_stop_warning_with_evidence(db, story, fake_llm) -> None:
    priya, ramesh = story["people"]["Priya"], story["people"]["Ramesh"]
    start = time.perf_counter()
    result = save_and_check(db, NoteIn(text=DEMO_NOTE, author_id=priya.id))
    elapsed = time.perf_counter() - start

    assert result.severity == "stop" and result.machine_id == story["machines"]["VMC-3"].id
    rules_hit = {w.rule for w in result.warnings}
    assert {"param_limit", "precursor", "maintenance"} <= rules_hit
    assert any("4 of the last 5" in w.message for w in result.warnings)
    kinds = {e.type for e in result.evidence}
    assert {"param_limit", "maintenance"} <= kinds
    assert all(e.title for e in result.evidence)
    assert result.author_name == "Ramesh Patil" and "0.12" in result.expert_fix
    assert result.mode == "offline"  # FakeLLM has no "guardian" answer -> rules only
    assert elapsed < 3.0  # budget from ENGINEERING.md §4

    saved = db.execute(select(Warning).filter_by(note_id=result.note_id)).scalars().all()
    assert len(saved) == len(result.warnings) and all(w.evidence for w in saved)
    notified = {n.employee_id for n in db.execute(select(Notification)).scalars()}
    assert {ramesh.id, story["people"]["Anil"].id} <= notified and priya.id not in notified


def test_normal_note_has_no_warning(db, story, fake_llm) -> None:
    priya = story["people"]["Priya"]
    vmc = story["machines"]["VMC-3"]
    result = save_and_check(
        db,
        NoteIn(
            text="Coolant level topped up, ran 20 flanges", author_id=priya.id, machine_id=vmc.id
        ),
    )
    assert result.severity is None and result.warnings == [] and result.expert_fix is None
    assert db.execute(select(Warning)).scalars().all() == []


def test_llm_adds_grounded_warning_and_drops_invented_ids(db, story, fake_llm) -> None:
    from app.models.knowledge import KnowledgeCard

    card = db.execute(select(KnowledgeCard).filter_by(title="Burr on FL-101 holes")).scalar_one()
    fake_llm.responses["guardian"] = GuardianLLMResult(
        warnings=[
            LLMWarning(
                message="Last time burrs came back when the chamfer step was skipped.",
                severity="caution",
                evidence_ids=[f"card:{card.id}"],
            ),
            LLMWarning(message="Invented risk", severity="stop", evidence_ids=["card:99999"]),
        ]
    )
    result = save_and_check(
        db,
        NoteIn(
            text="VMC-3 burr on FL-101 holes, skipped chamfer",
            author_id=story["people"]["Priya"].id,
        ),
    )

    messages = [w.message for w in result.warnings]
    assert "Invented risk" not in messages
    assert any("chamfer step" in m for m in messages) and result.mode == "live"
    task, prompt = fake_llm.calls[-1]
    assert task == "guardian" and f'<record id="card:{card.id}">' in prompt


def test_note_without_machine_asks_for_one(db, story, fake_llm) -> None:
    result = save_and_check(db, NoteIn(text="something rattles", author_id=1))
    assert result.warnings == [] and "Choose a machine" in result.message


def test_guardian_endpoints_and_capture_hook(client, db, story, fake_llm) -> None:
    priya = story["people"]["Priya"]
    body = client.post(
        "/api/guardian/notes", json={"text": DEMO_NOTE, "author_id": priya.id}
    ).json()
    assert body["severity"] == "stop" and body["evidence"]

    listed = client.get("/api/guardian/warnings").json()
    assert listed["total"] == len(body["warnings"])
    wid = listed["items"][0]["id"]
    assert (
        client.post(
            f"/api/guardian/warnings/{wid}/respond", json={"action": "override"}
        ).status_code
        == 422
    )  # reason required
    ok = client.post(
        f"/api/guardian/warnings/{wid}/respond",
        json={"action": "acknowledge", "employee_id": priya.id},
    ).json()
    assert ok["status"] == "acknowledged"
    assert (
        client.post("/api/guardian/warnings/9999/respond", json={"action": "resolve"}).status_code
        == 404
    )

    captured = client.post(
        "/api/capture/text", json={"text": DEMO_NOTE, "author_id": priya.id}
    ).json()
    assert captured["guardian"]["severity"] == "stop"  # hook ran on the captured note
