"""Guided jobs on the seeded VMC-3 flange procedure: skill views, live checks, promotion."""

from datetime import date

import pytest
from sqlalchemy import select

from app.models.erp import Employee, Machine, Operation, Part, WorkOrder
from app.models.guide import Procedure, ProcedureStep, SkillMatrix
from app.models.ops import Notification


@pytest.fixture()
def story(db, tmp_path, monkeypatch):
    from app.config import get_settings
    from seed.seed import seed

    monkeypatch.setattr(get_settings(), "storage_dir", str(tmp_path))
    seed(db, date.today())
    people = {e.name.split()[0]: e for e in db.execute(select(Employee)).scalars()}
    vmc = db.execute(select(Machine).filter_by(name="VMC-3")).scalar_one()
    face = db.execute(select(Operation).filter_by(name="face milling")).scalar_one()
    part = db.execute(select(Part).filter_by(number="FL-101")).scalar_one()
    order = WorkOrder(
        external_id="WO-T1",
        machine_id=vmc.id,
        part_id=part.id,
        operation_id=face.id,
        employee_id=people["Priya"].id,
    )
    db.add(order)
    db.commit()
    proc = db.execute(select(Procedure).filter_by(key="vmc3-fl101-face")).scalar_one()
    return {"people": people, "vmc": vmc, "face": face, "order": order, "proc": proc}


def _start(client, story, who="Priya"):
    return client.post(
        "/api/guide/runs",
        json={"employee_id": story["people"][who].id, "work_order_id": story["order"].id},
    ).json()


def test_procedure_steps_carry_old_employee_tips(client, story) -> None:
    body = client.get(f"/api/guide/procedures/{story['proc'].id}").json()
    assert body["status"] == "approved" and body["steps_count"] == 6
    last = body["steps"][-1]
    assert (last["param_name"], last["target_value"], last["tolerance"]) == (
        "thickness",
        12.0,
        0.05,
    )
    spindle = next(s for s in body["steps"] if s["component"] == "Spindle")
    assert spindle["expert_tip_author"] == "Ramesh Patil" and spindle["expert_tip"]
    listed = client.get(f"/api/guide/procedures?machine_id={story['vmc'].id}").json()
    assert [p["key"] for p in listed] == ["vmc3-fl101-face"]


def test_level_one_sees_all_steps_level_three_sees_checklist(client, db, story) -> None:
    run = _start(client, story)
    assert run["skill_level"] == 1 and run["view"] == "full"
    assert len(run["procedure"]["steps"]) == 6

    row = db.execute(
        select(SkillMatrix).filter_by(
            employee_id=story["people"]["Priya"].id, operation_id=story["face"].id
        )
    ).scalar_one()
    row.level = 3
    db.commit()
    run = _start(client, story)
    assert run["view"] == "checklist"
    assert [s["step_no"] for s in run["procedure"]["steps"]] == [4, 5, 6]  # critical only
    assert all(s["critical"] for s in run["procedure"]["steps"])


@pytest.mark.parametrize(
    "value,severity,can_continue",
    [(12.0, None, True), (12.08, "caution", True), (12.2, "stop", False)],
)
def test_out_of_tolerance_value_warns_inline(client, story, value, severity, can_continue) -> None:
    run = _start(client, story)
    out = client.post(
        f"/api/guide/runs/{run['run_id']}/steps", json={"step_no": 6, "value": value}
    ).json()
    assert out["passed"] == (severity is None) and out["can_continue"] == can_continue
    assert [w["severity"] for w in out["warnings"]] == ([severity] if severity else [])


def test_settings_are_checked_against_machine_limits(client, db, story) -> None:
    run = _start(client, story)
    out = client.post(
        f"/api/guide/runs/{run['run_id']}/steps", json={"step_no": 4, "values": {"feed": 0.3}}
    ).json()
    assert not out["can_continue"] and out["warnings"][0]["rule"] == "param_limit"
    assert "0.2" in out["warnings"][0]["message"]
    ramesh = story["people"]["Ramesh"]  # Priya's VMC-3 buddy is told
    assert db.execute(
        select(Notification).filter_by(employee_id=ramesh.id, kind="run_stop")
    ).scalar_one()


def test_missing_measurement_is_refused(client, story) -> None:
    run = _start(client, story)
    resp = client.post(f"/api/guide/runs/{run['run_id']}/steps", json={"step_no": 6})
    assert resp.status_code == 422


def _clean_run(client, story) -> dict:
    run = _start(client, story)
    out = None
    for step in run["procedure"]["steps"]:
        payload = {"step_no": step["step_no"]}
        if step["param_name"]:
            payload["value"] = step["target_value"]
        out = client.post(f"/api/guide/runs/{run['run_id']}/steps", json=payload).json()
    return out


def test_promotion_needs_clean_runs_and_sign_off(client, story) -> None:
    priya, ramesh = story["people"]["Priya"], story["people"]["Ramesh"]
    url = f"/api/guide/skills/{priya.id}/promote"
    body = {"operation_id": story["face"].id, "signed_off_by": ramesh.id}

    last = _clean_run(client, story)
    assert last["run_status"] == "done" and last["next_step_no"] is None
    early = client.post(url, json=body).json()
    assert not early["promoted"] and "2 more" in early["reason"]

    _clean_run(client, story)
    _clean_run(client, story)
    assert client.post(url, json={**body, "signed_off_by": priya.id}).status_code == 422
    done = client.post(url, json=body).json()
    assert done["promoted"] and done["skill"]["level"] == 2
    assert done["skill"]["signed_off_by"] == "Ramesh Patil"
    skills = {s["operation"]: s for s in client.get(f"/api/guide/skills/{priya.id}").json()}
    assert skills["face milling"]["label"] == "Supervised"
    assert skills["face milling"]["clean_runs"] == 0  # counting restarts after sign-off


def test_failed_check_does_not_count_as_clean(client, story) -> None:
    run = _start(client, story)
    for step in run["procedure"]["steps"]:
        value = 12.3 if step["step_no"] == 6 else step["target_value"]
        payload = {"step_no": step["step_no"], **({"value": value} if step["param_name"] else {})}
        client.post(f"/api/guide/runs/{run['run_id']}/steps", json=payload)
    skills = client.get(f"/api/guide/skills/{story['people']['Priya'].id}").json()
    assert next(s for s in skills if s["operation"] == "face milling")["clean_runs"] == 0


def test_approving_keeps_old_versions(client, db, story) -> None:
    old = story["proc"]
    draft = Procedure(
        key=old.key,
        title="Face milling FL-101 (new fixture)",
        machine_id=old.machine_id,
        operation_id=old.operation_id,
        version=2,
        status="draft",
    )
    db.add(draft)
    db.flush()
    db.add(ProcedureStep(procedure_id=draft.id, step_no=1, instruction="Use the new fixture."))
    db.commit()
    priya, ramesh = story["people"]["Priya"], story["people"]["Ramesh"]
    edit = client.put(
        f"/api/guide/procedures/{draft.id}",
        json={
            "action": "edit",
            "approver_id": ramesh.id,
            "steps": [{"step_no": 1, "instruction": "Use the new fixture, torque 40 Nm."}],
        },
    )
    assert edit.json()["steps"][0]["instruction"].endswith("40 Nm.")
    assert (
        client.put(
            f"/api/guide/procedures/{draft.id}", json={"action": "approve", "approver_id": priya.id}
        ).status_code
        == 422
    )

    new = client.put(
        f"/api/guide/procedures/{draft.id}", json={"action": "approve", "approver_id": ramesh.id}
    ).json()
    assert new["version"] == 3 and new["status"] == "approved" and new["approver"] == "Ramesh Patil"
    db.expire_all()
    assert db.get(Procedure, old.id).status == "archived"
    assert db.get(Procedure, draft.id).status == "superseded"
    assert (
        client.put(
            f"/api/guide/procedures/{old.id}",
            json={"action": "edit", "approver_id": ramesh.id, "title": "x"},
        ).status_code
        == 422
    )


# --- T17: troubleshooting, ShadowTrace, daily briefing ---------------------------------------


def test_troubleshoot_tree_ranks_most_frequent_cause_first(client, db, story) -> None:
    from app.models.guide import TroubleshootNode

    tree = client.get(f"/api/guide/troubleshoot/{story['vmc'].id}").json()
    assert tree[0]["symptom"] == "chatter"  # most incidents on VMC-3
    causes = tree[0]["causes"]
    assert causes[0]["cause"] == "Spindle bearing wear" and causes[0]["count"] == 21
    assert [c["count"] for c in causes] == sorted((c["count"] for c in causes), reverse=True)
    assert causes[0]["frequency"].endswith("% of past incidents")
    assert causes[0]["fix"] and causes[0]["fix_author"] == "Ramesh Patil"
    assert any("spindle bearing failure" in c["cause"] for c in causes)  # from precursor stats
    stored = db.execute(select(TroubleshootNode).filter_by(machine_id=story["vmc"].id)).all()
    client.get(f"/api/guide/troubleshoot/{story['vmc'].id}")  # rebuild replaces, not appends
    assert len(db.execute(select(TroubleshootNode)).all()) == len(stored)
    assert client.get("/api/guide/troubleshoot/999").status_code == 404


def test_shadow_trace_lists_parts_checked(client, story) -> None:
    body = client.get(f"/api/guide/shadowtrace/{story['proc'].id}").json()
    assert body["author"] == "Ramesh Patil" and len(body["steps"]) == 6
    step4 = next(s for s in body["steps"] if s["step_no"] == 4)
    assert step4["components_checked"] == ["Spindle"] and step4["component_ids"]


def test_briefing_lists_open_warnings_for_assigned_machines(client, db, story) -> None:
    priya = story["people"]["Priya"]
    client.post(
        "/api/guardian/notes",
        json={"text": "VMC-3 chatter, feed 0.3 on SS304", "author_id": priya.id},
    )
    first = client.get(f"/api/guide/briefing/{priya.id}?day=2026-10-28").json()
    assert "VMC-3" in first["machines"] and "Lathe-2" in first["machines"]  # buddy pairs
    assert any("VMC-3" in w and "[stop]" in w for w in first["open_warnings"])
    assert any("WO-T1" in j for j in first["jobs"])
    assert len(first["quiz"]) == 2 and all(q["answer"] for q in first["quiz"])
    next_day = client.get(f"/api/guide/briefing/{priya.id}?day=2026-10-29").json()
    assert {q["card_id"] for q in next_day["quiz"]} != {q["card_id"] for q in first["quiz"]}
    stages = {s["stage"]: s for s in first["path"]}
    assert stages["do"]["total"] >= 1 and stages["do"]["done"] == 0


def test_briefing_path_counts_real_runs(client, story) -> None:
    _clean_run(client, story)
    priya = story["people"]["Priya"]
    stages = {s["stage"]: s for s in client.get(f"/api/guide/briefing/{priya.id}").json()["path"]}
    assert stages["do"]["done"] == 1
    assert client.get("/api/guide/briefing/999").status_code == 404


def test_checklist_shows_every_step_when_none_is_critical(client, db, story) -> None:
    for step in db.execute(
        select(ProcedureStep).filter_by(procedure_id=story["proc"].id)
    ).scalars():
        step.critical = False
    row = db.execute(
        select(SkillMatrix).filter_by(
            employee_id=story["people"]["Priya"].id, operation_id=story["face"].id
        )
    ).scalar_one()
    row.level = 3
    db.commit()
    run = _start(client, story)
    assert run["view"] == "checklist" and len(run["procedure"]["steps"]) == 6


def test_stopped_run_goes_on_the_machine_timeline(client, db, story) -> None:
    from app.models.ops import Event

    run = _start(client, story)
    client.post(
        f"/api/guide/runs/{run['run_id']}/steps", json={"step_no": 4, "values": {"feed": 0.3}}
    )
    event = db.execute(select(Event).filter_by(kind="run", ref_id=run["run_id"])).scalar_one()
    assert event.machine_id == story["vmc"].id and event.summary.startswith("STOP at step 4")
