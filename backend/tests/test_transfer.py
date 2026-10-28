"""Old → new transfer: risk, exit handover, AI interview, question routing (seeded story)."""

from datetime import date

import pytest
from sqlalchemy import select

from app.errors import ValidationFailed
from app.models.erp import Employee, Machine
from app.models.knowledge import KnowledgeCard
from app.models.ops import Notification
from app.models.transfer import ExperienceScore, HandoverTask, KnowledgeGap
from app.schemas.ask import AnswerLLM, AskRequest
from app.schemas.transfer import InterviewAnswerIn, InterviewStartIn, ReplyIn
from app.services import embeddings
from app.services.ask import qa
from app.services.transfer import handover, interview, profiles, routing


@pytest.fixture()
def story(db, tmp_path, monkeypatch):
    from app.config import get_settings
    from seed.seed import seed

    monkeypatch.setattr(get_settings(), "storage_dir", str(tmp_path))
    monkeypatch.setattr(embeddings, "try_embed", lambda texts, kind="passage": None)
    seed(db, date.today())
    people = {e.name.split()[0]: e for e in db.execute(select(Employee)).scalars()}
    machines = {m.name: m for m in db.execute(select(Machine)).scalars()}
    return {"people": people, "machines": machines}


def test_risk_flags_vmc3_as_critical(db, story) -> None:
    cells = {c.name: c for c in handover.knowledge_risk(db)}
    vmc3 = cells["VMC-3"]
    assert vmc3.status == "critical" and vmc3.holders == 1 and vmc3.bus == 0
    assert vmc3.expert == "Ramesh Patil" and vmc3.expert_leaving_on is not None
    assert vmc3.coverage == 100  # every VMC-3 part has a verified card ... from one person
    lathe = cells["Lathe-2"]
    assert lathe.status == "at_risk" and lathe.bus == 1 and lathe.expert == "Suresh Jadhav"
    assert cells["VMC-3 · Spindle"].cards >= 5
    first_machine = next(c for c in handover.knowledge_risk(db) if c.component_id is None)
    assert first_machine.name == "VMC-3"  # most at risk first


def test_experience_scores_from_cards(db, story) -> None:
    profiles.experience_scores(db)
    ramesh = story["people"]["Ramesh"]
    row = db.execute(
        select(ExperienceScore).filter_by(
            employee_id=ramesh.id, machine_id=story["machines"]["VMC-3"].id
        )
    ).scalar_one()
    assert row.cards_count == row.validated_count >= 16 and row.years_on_machine > 25
    before = len(db.execute(select(ExperienceScore)).scalars().all())
    profiles.experience_scores(db)  # running again updates rows, never duplicates them
    assert len(db.execute(select(ExperienceScore)).scalars().all()) == before == 4


def test_exit_date_webhook_creates_plan_for_vmc3(client, db, story) -> None:
    resp = client.post(
        "/api/erp/webhook",
        json={
            "event": "exit_date_set",
            "data": {"employee": "ERP-EMP-1001", "exit_date": "2027-05-31"},
        },
    )
    body = resp.json()
    assert resp.status_code == 200 and body["handover"]["sole_holder_machine_ids"] == [
        story["machines"]["VMC-3"].id
    ]

    plan = client.get(f"/api/transfer/handover/{story['people']['Ramesh'].id}").json()
    assert plan["sole_holder_machines"] == ["VMC-3"] and plan["exit_date"] == "2027-05-31"
    kinds = {t["category"] for t in plan["tasks"]}
    assert {"record_setup", "interview", "validate"} <= kinds
    assert plan["progress"] == 0
    again = client.get(f"/api/transfer/handover/{story['people']['Ramesh'].id}").json()
    assert again["id"] == plan["id"]  # one active plan per person


def test_no_plan_without_exit_date(client, story) -> None:
    resp = client.get(f"/api/transfer/handover/{story['people']['Suresh'].id}")
    assert resp.status_code == 422


def test_interview_answers_become_verified_cards_and_tick_tasks(db, story, fake_llm) -> None:
    ramesh = story["people"]["Ramesh"]
    db.add(
        KnowledgeGap(
            machine_id=story["machines"]["VMC-3"].id,
            topic="How to set the probe?",
            source="unanswered_query",
            count=3,
        )
    )
    db.commit()
    plan = handover.create_handover_plan(db, ramesh.id)
    session = interview.start_interview(db, InterviewStartIn(employee_id=ramesh.id))

    assert session.machine_id == story["machines"]["VMC-3"].id and session.mode == "live"
    reasons = [q.reason for q in session.questions]
    assert any("probe" in r for r in reasons)  # the unanswered question became a topic
    q = next(q for q in session.questions if q.task_id)
    out = interview.answer_interview(
        db,
        session.id,
        InterviewAnswerIn(
            question_id=q.id,
            answer_text="Spindle ki awaaz badal jaye to temp check karo, 55 se "
            "upar ho to machine roko",
            author_id=ramesh.id,
        ),
    )

    card = db.get(KnowledgeCard, out.card.id)
    assert card.verified_by_id == ramesh.id and card.author_id == ramesh.id
    assert card.title == q.text[:80] or card.context == q.text  # the question asked, not why
    assert db.get(HandoverTask, q.task_id).status == "done"
    db.refresh(plan)
    assert 0 < plan.progress < 1 and out.remaining == len(session.questions) - 1
    with pytest.raises(ValidationFailed):
        interview.answer_interview(
            db,
            session.id,
            InterviewAnswerIn(question_id=q.id, answer_text="again", author_id=ramesh.id),
        )


def test_only_the_interviewed_employee_can_answer(db, story, fake_llm) -> None:
    ramesh, priya = story["people"]["Ramesh"], story["people"]["Priya"]
    session = interview.start_interview(db, InterviewStartIn(employee_id=ramesh.id))
    q = session.questions[0]
    with pytest.raises(ValidationFailed, match="only Ramesh Patil can answer"):
        interview.answer_interview(
            db,
            session.id,
            InterviewAnswerIn(question_id=q.id, answer_text="feed 0.12", author_id=priya.id),
        )


def test_interview_is_only_for_old_employees(client, story) -> None:
    resp = client.post(
        "/api/transfer/interview/start", json={"employee_id": story["people"]["Priya"].id}
    )
    assert resp.status_code == 422


def test_asked_once_answered_forever(client, db, story, fake_llm) -> None:
    priya, ramesh = story["people"]["Priya"], story["people"]["Ramesh"]
    vmc = story["machines"]["VMC-3"]
    fake_llm.responses["answer"] = AnswerLLM(answer="", not_enough_data=True)
    first = qa.answer(
        db,
        AskRequest(
            question="How do I set the tool probe offset on VMC-3?",
            machine_id=vmc.id,
            asked_by_id=priya.id,
        ),
    )
    assert first.not_enough_data and first.suggested_expert == "Ramesh Patil"

    routed = client.post("/api/transfer/routed-questions", json={"query_id": first.query_id})
    assert routed.json()["routed_to"] == "Ramesh Patil"
    inbox = client.get(f"/api/transfer/routed-questions?employee_id={ramesh.id}").json()
    assert inbox["total"] == 1 and inbox["items"][0]["asked_by"] == "Priya Shinde"

    denied = client.post(
        f"/api/transfer/routed-questions/{routed.json()['id']}/reply",
        json={"reply_text": "no idea", "author_id": priya.id},
    )
    assert denied.status_code == 422
    reply = client.post(
        f"/api/transfer/routed-questions/{routed.json()['id']}/reply",
        json={
            "reply_text": "Use the setter, touch off T1, then G10 L10 for the probe offset",
            "author_id": ramesh.id,
        },
    ).json()
    card_id = reply["card"]["id"]
    assert reply["routed"]["status"] == "answered" and reply["card"]["verified_by_id"] == ramesh.id
    assert reply["guardian"] is not None  # the old employee's reply was checked too
    assert (
        db.execute(select(Notification).filter_by(employee_id=priya.id, kind="answer")).scalar_one()
        is not None
    )
    assert db.execute(select(KnowledgeGap)).scalar_one().resolved

    # Next time anyone asks, the assistant finds Ramesh's answer and cites it.
    fake_llm.responses["answer"] = AnswerLLM(
        answer="Ramesh: touch off T1, then G10 L10.", source_ids=[f"card:{card_id}"]
    )
    second = qa.answer(db, AskRequest(question="tool probe offset VMC-3", machine_id=vmc.id))
    assert not second.not_enough_data and [s.id for s in second.sources] == [f"card:{card_id}"]
    assert second.sources[0].verified and second.sources[0].author == "Ramesh Patil"


def test_routing_is_idempotent_and_reply_once(db, story, fake_llm) -> None:
    fake_llm.responses["answer"] = AnswerLLM(answer="", not_enough_data=True)
    q = qa.answer(
        db,
        AskRequest(question="How to clean the encoder?", machine_id=story["machines"]["VMC-1"].id),
    )
    rq = routing.route_question(db, q.query_id)
    assert routing.route_question(db, q.query_id).id == rq.id
    assert db.get(Employee, rq.routed_to_id).name == "Suresh Jadhav"  # VMC-1 expert
    routing.reply(db, rq.id, ReplyIn(reply_text="Dry cloth only", author_id=rq.routed_to_id))
    with pytest.raises(ValidationFailed):
        routing.reply(db, rq.id, ReplyIn(reply_text="again", author_id=rq.routed_to_id))


def test_offline_answer_card_reads_question_then_answer(db, story, fake_llm) -> None:
    from app.services.transfer.interview import _template, record_answer

    card, _ = record_answer(
        db,
        "Touch off T1, then G10 L10.",
        story["people"]["Ramesh"].id,
        story["machines"]["VMC-3"].id,
        None,
        "How do I set the probe offset?",
    )
    assert card.title == "How do I set the probe offset?" and card.context == card.title
    assert card.action == "Touch off T1, then G10 L10."
    q = _template("task", "AI interview: what only you know about VMC-3", "VMC-3")
    assert q.startswith("What do you know about VMC-3") and "VMC-3 on VMC-3" not in q
    part = _template("task", "Explain the spindle on VMC-3 (nothing recorded yet)", "VMC-3")
    assert part.startswith("What usually goes wrong with the spindle on VMC-3?")


def test_interview_still_asks_when_no_gaps_are_left(db, story, fake_llm) -> None:
    """All parts covered and no open gaps: ask what only they know, then the thinnest parts."""
    ramesh = story["people"]["Ramesh"]
    session = interview.start_interview(
        db, InterviewStartIn(employee_id=ramesh.id, machine_id=story["machines"]["VMC-3"].id)
    )
    texts = [q.text for q in session.questions]
    assert len(texts) == 5 and texts[0].startswith("What do you know about VMC-3")
    assert all("very little about the" in t for t in texts[1:])
