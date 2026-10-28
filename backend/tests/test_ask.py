"""Ask Experience: hybrid search (this half) and grounded answers."""

from datetime import date

import numpy as np
import pytest
from sqlalchemy import select

from app.models.erp import Employee, Machine
from app.models.knowledge import Document, KnowledgeCard
from app.models.map3d import Component
from app.models.ops import Query
from app.models.transfer import KnowledgeGap
from app.schemas.ask import AnswerLLM, AskRequest, FeedbackIn
from app.services import embeddings
from app.services.ask import qa
from app.services.ask.search import hybrid_search, search_with_mode


@pytest.fixture()
def story(db, tmp_path, monkeypatch):
    from app.config import get_settings
    from seed.seed import seed

    monkeypatch.setattr(get_settings(), "storage_dir", str(tmp_path))
    monkeypatch.setattr(embeddings, "try_embed", lambda texts, kind="passage": None)
    seed(db, date.today())
    machines = {m.name: m for m in db.execute(select(Machine)).scalars()}
    people = {e.name.split()[0]: e for e in db.execute(select(Employee)).scalars()}
    return {"machines": machines, "people": people, "tmp": tmp_path}


def test_hindi_question_finds_english_cards(db, story) -> None:
    vmc = story["machines"]["VMC-3"]
    hits = hybrid_search(db, "चैटर क्यों आ रहा है?", vmc.id, None, k=6)
    titles = [h.title for h in hits]
    assert "Chatter on SS304 finishing pass" in titles  # English card via lexicon expansion
    assert all(h.machine_id == vmc.id for h in hits)
    card = next(h for h in hits if h.record_type == "card")
    assert card.author == "Ramesh Patil" and card.machine == "VMC-3" and card.verified
    assert card.ref == f"card:{card.record_id}"


def test_verified_cards_rank_above_unverified(db, story) -> None:
    vmc = story["machines"]["VMC-3"]
    hits = hybrid_search(db, "coolant nozzle", vmc.id, None, k=6)
    cards = [h for h in hits if h.record_type == "card"]
    first_unverified = next(i for i, h in enumerate(cards) if not h.verified)
    assert all(h.verified for h in cards[:first_unverified]) and first_unverified > 0


def test_component_filter_keeps_that_part_only(db, story) -> None:
    vmc = story["machines"]["VMC-3"]
    coolant = db.execute(
        select(Component).filter_by(machine_id=vmc.id, mesh_name="coolant")
    ).scalar_one()
    hits = hybrid_search(db, "finish chatter coolant spindle", vmc.id, coolant.id, k=10)
    assert hits and all(h.component_id in (None, coolant.id) for h in hits)


def test_vector_search_finds_meaning_without_shared_words(db, story, monkeypatch) -> None:
    vmc = story["machines"]["VMC-3"]
    target = db.execute(
        select(KnowledgeCard).filter_by(title="Spindle warm-up in winter")
    ).scalar_one()
    for c in db.execute(select(KnowledgeCard).filter_by(machine_id=vmc.id)).scalars():
        v = np.zeros(384, np.float32)
        v[0 if c.id == target.id else 1] = 1.0  # unit vectors: only the target points at axis 0
        c.embedding = embeddings.to_bytes(v)
    db.commit()
    query_vec = np.zeros((1, 384), np.float32)
    query_vec[0, 0] = 1.0
    monkeypatch.setattr(embeddings, "try_embed", lambda texts, kind="passage": query_vec)

    hits, mode = search_with_mode(db, "machine cold in the morning", vmc.id, None, k=3)
    assert hits[0].record_id == target.id and mode == "semantic"


def test_search_ignores_vectors_from_another_model(db, story, monkeypatch) -> None:
    vmc = story["machines"]["VMC-3"]
    for c in db.execute(select(KnowledgeCard).filter_by(machine_id=vmc.id)).scalars():
        c.embedding = embeddings.to_bytes(np.ones(1024, np.float32))  # bge-m3 size
    db.commit()
    query_vec = np.zeros((1, 384), np.float32)
    monkeypatch.setattr(embeddings, "try_embed", lambda texts, kind="passage": query_vec)

    hits, mode = search_with_mode(db, "chatter on SS304", vmc.id, None)
    assert hits and mode == "keyword"  # no stored vector matches the local model yet


def test_search_says_keyword_when_embeddings_are_down(db, story) -> None:
    # story: try_embed returns None, as with EMBEDDING_PROVIDER=off or Hugging Face down
    hits, mode = search_with_mode(db, "chatter on SS304", _vmc(story).id, None)
    assert hits and mode == "keyword"


def test_card_source_links_its_recording(db, story) -> None:
    vmc = story["machines"]["VMC-3"]
    audio = story["tmp"] / "audio" / "note.webm"
    audio.parent.mkdir(parents=True)
    audio.write_bytes(b"x")
    doc = Document(type="voice", file_path=str(audio), text="x", machine_id=vmc.id)
    db.add(doc)
    db.flush()
    card = db.execute(
        select(KnowledgeCard).filter_by(title="Spindle warm-up in winter")
    ).scalar_one()
    card.source_doc_id = doc.id
    db.commit()
    hit = next(
        h
        for h in hybrid_search(db, "warm-up program O9001", vmc.id, None)
        if h.record_id == card.id
    )
    assert hit.media_url == "/media/audio/note.webm"


def test_empty_database_and_blank_query(db) -> None:
    assert hybrid_search(db, "chatter", None, None) == []
    assert hybrid_search(db, "   ", None, None) == []


# --- grounded answers ------------------------------------------------------------------------


def _vmc(story):
    return story["machines"]["VMC-3"]


def test_answer_keeps_only_retrieved_citations(db, story, fake_llm) -> None:
    hits = hybrid_search(db, "chatter on SS304", _vmc(story).id, None)
    real = hits[0].ref
    fake_llm.responses["answer"] = AnswerLLM(
        answer="Ramesh says: drop the feed to 0.12 and shorten stick-out.",
        steps=["Feed 0.12 mm/rev", "Stick-out under 30 mm"],
        watch_out="Chatter came before spindle failures.",
        source_ids=[real, "card:99999"],
        confidence=0.85,
    )
    out = qa.answer(
        db,
        AskRequest(
            question="chatter on SS304",
            machine_id=_vmc(story).id,
            language="en",
            asked_by_id=story["people"]["Priya"].id,
        ),
    )

    assert [s.id for s in out.sources] == [real]  # invented id dropped
    assert not out.not_enough_data and out.mode == "live" and out.steps[0] == "Feed 0.12 mm/rev"
    assert out.search_mode == "keyword"  # no vectors in this test: full-text search only
    assert out.suggested_expert == "Ramesh Patil"
    saved = db.get(Query, out.query_id)
    assert saved.answered and saved.sources == [
        {"type": real.split(":")[0], "id": int(real.split(":")[1])}
    ]
    _, prompt = fake_llm.calls[-1]
    assert f'<record id="{real}">' in prompt


def test_only_invented_citations_means_not_enough_data(db, story, fake_llm) -> None:
    fake_llm.responses["answer"] = AnswerLLM(answer="Use 2000 rpm.", source_ids=["card:99999"])
    req = AskRequest(question="chatter on SS304", machine_id=_vmc(story).id, language="hi")
    out = qa.answer(db, req)
    assert out.not_enough_data and out.sources == [] and out.answer.startswith("हमारे")
    assert out.suggested_expert == "Ramesh Patil"


def test_unanswerable_question_is_logged_as_a_gap(db, story, fake_llm) -> None:
    req = AskRequest(question="How do I calibrate the probe on VMC-3?", machine_id=_vmc(story).id)
    fake_llm.responses["answer"] = AnswerLLM(answer="", not_enough_data=True)
    qa.answer(db, req)
    qa.answer(db, req)
    gap = db.execute(select(KnowledgeGap)).scalar_one()
    assert gap.count == 2 and gap.source == "unanswered_query" and not gap.resolved


def test_offline_answer_quotes_the_old_employee(db, story, fake_llm) -> None:
    out = qa.answer(db, AskRequest(question="drill breaking in SS304", machine_id=_vmc(story).id))
    assert out.mode == "offline" and not out.not_enough_data
    assert "Ramesh Patil's know-how" in out.answer and "Peck drill" in out.answer
    assert out.sources and all(
        s.id.startswith(("card:", "qc_reject:", "maintenance:")) for s in out.sources
    )


def test_empty_database_gives_not_enough_data(db, fake_llm) -> None:
    out = qa.answer(db, AskRequest(question="chatter"))
    assert out.not_enough_data and out.sources == [] and out.suggested_expert is None
    assert fake_llm.calls == []  # nothing to ground on, so the LLM is not asked


def test_feedback_moves_card_scores(db, story, fake_llm) -> None:
    out = qa.answer(db, AskRequest(question="drill breaking in SS304", machine_id=_vmc(story).id))
    card_id = int(next(s.id for s in out.sources if s.id.startswith("card:")).split(":")[1])
    before = db.get(KnowledgeCard, card_id).score
    fb = qa.record_feedback(db, out.query_id, FeedbackIn(helpful=False, fix_worked=False))
    assert fb.cards_updated >= 1 and db.get(KnowledgeCard, card_id).score == before - 0.1


def test_ask_endpoints(client, db, story, fake_llm, monkeypatch) -> None:
    from app.errors import ProviderUnavailable
    from app.services import stt, tts

    body = client.post(
        "/api/ask",
        json={"question": "chuck jaw taper", "machine_id": story["machines"]["Lathe-2"].id},
    ).json()
    assert body["sources"] and body["sources"][0]["author"] == "Suresh Jadhav"
    assert (
        client.post(f"/api/ask/{body['query_id']}/feedback", json={"helpful": True}).json()[
            "feedback"
        ]
        == 1
    )
    assert client.post("/api/ask/999/feedback", json={"helpful": True}).status_code == 404
    assert client.post("/api/ask", json={"question": "x", "machine_id": 999}).status_code == 404

    monkeypatch.setattr(
        stt, "transcribe", lambda p, lang=None: stt.Transcript(text="चक जॉ साफ कैसे करें")
    )

    def no_tts(text, language):
        raise ProviderUnavailable("offline")

    monkeypatch.setattr(tts, "synthesize", no_tts)
    voice = client.post(
        "/api/ask/voice",
        files={"file": ("q.webm", b"\x1aE", "audio/webm")},
        data={"machine_id": str(story["machines"]["Lathe-2"].id), "language": "hi"},
    ).json()
    assert voice["transcript"] == "चक जॉ साफ कैसे करें" and voice["audio_url"] is None
    assert voice["sources"]


def test_voice_question_without_speech_to_text(client, story, monkeypatch) -> None:
    from app.config import get_settings

    monkeypatch.setattr(get_settings(), "groq_api_key", None)
    resp = client.post("/api/ask/voice", files={"file": ("q.webm", b"\x1aE", "audio/webm")})
    assert resp.status_code == 503 and resp.json()["code"] == "provider_unavailable"


def test_offline_refuses_off_topic_tips(db, story, fake_llm) -> None:
    out = qa.answer(
        db, AskRequest(question="How do I calibrate the tool probe?", machine_id=_vmc(story).id)
    )
    assert out.not_enough_data and out.sources == []  # pull-stud card shares only "tool"
    assert out.suggested_expert == "Ramesh Patil"


def test_offline_hindi_question_matches_by_symptom(db, story, fake_llm) -> None:
    out = qa.answer(
        db,
        AskRequest(
            question="VMC-3 पर ड्रिल क्यों टूट रहा है SS304 में?", machine_id=_vmc(story).id, language="hi"
        ),
    )
    assert not out.not_enough_data and "Peck drill" in out.answer


def test_topic_words_ignore_machine_and_material_codes() -> None:
    assert qa._topic_words("VMC-3 पर ड्रिल क्यों टूट रहा है SS304 में?") == {"ड्रिल", "टूट"}
