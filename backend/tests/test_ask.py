"""Ask Experience: hybrid search (this half) and grounded answers."""

from datetime import date

import numpy as np
import pytest
from sqlalchemy import select

from app.models.erp import Employee, Machine
from app.models.knowledge import Document, KnowledgeCard
from app.models.map3d import Component
from app.services import embeddings
from app.services.ask.search import hybrid_search


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

    hits = hybrid_search(db, "machine cold in the morning", vmc.id, None, k=3)
    assert hits[0].record_id == target.id


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
