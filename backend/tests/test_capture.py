"""Capture (Lane 1): shop-floor lexicon, card extraction, text/voice capture."""

import pytest

from app.errors import ValidationFailed
from app.schemas.capture import ExtractedCard, ExtractionResult
from app.services.capture.extractor import extract_cards
from app.utils import lexicon


@pytest.mark.parametrize(
    "text,expected",
    [
        ("VMC-3 slight chatter, increased feed to 0.3 on SS304", {"chatter"}),
        ("VMC-3 pe chatter aa raha hai, feed kam kiya", {"chatter"}),
        ("स्पिंडल से चैटर की आवाज़ आ रही है", {"chatter", "noise"}),
        ("Spindle whine and too hot after 2 hours", {"noise", "overheating"}),
        ("Burr on holes, chamfer not done", {"burr"}),
        ("जॉमध्ये गळती आहे", {"coolant_leak"}),
        ("Finish सुधार हुआ", set()),  # "धार" inside "सुधार" must not mean burr
        ("Small coolant leak near the pump", {"coolant_leak"}),
        ("All good today", set()),
    ],
)
def test_find_symptoms(text: str, expected: set) -> None:
    assert lexicon.find_symptoms(text) == expected


@pytest.mark.parametrize(
    "text,expected",
    [
        ("increased feed to 0.3 on SS304", {"feed": 0.3}),
        ("feed 0.2 then feed = 0.25, rpm 9000", {"feed": 0.25, "speed": 9000.0}),
        ("running at 9500 rpm, depth of cut 1.5", {"speed": 9500.0, "depth": 1.5}),
        ("फीड 0.3 किया", {"feed": 0.3}),
        ("spindle temp 61 after warm-up", {"spindle_temp": 61.0}),
        ("F0.12 S3800", {"feed": 0.12, "speed": 3800.0}),
        ("VMC-3 is 3 years old", {}),
    ],
)
def test_find_params(text: str, expected: dict) -> None:
    assert lexicon.find_params(text) == expected


def test_match_machine_handles_spacing_and_prefixes() -> None:
    names = ["VMC-3", "VMC-1", "Lathe-2", "VMC-31"]
    assert lexicon.match_machine("vmc 3 pe chatter", names) == "VMC-3"
    assert lexicon.match_machine("VMC3 spindle", names) == "VMC-3"
    assert lexicon.match_machine("vmc-31 alarm", names) == "VMC-31"
    assert lexicon.match_machine("lathe 2 chuck", names) == "Lathe-2"
    assert lexicon.match_machine("no machine here", names) is None


def test_match_components_in_any_language() -> None:
    aliases = {1: ["spindle", "स्पिंडल"], 2: ["coolant", "nozzle"], 3: ["vise", "vice"]}
    assert lexicon.match_components("स्पिंडल गरम है", aliases) == [1]
    assert lexicon.match_components("Coolant nozzle blocked", aliases) == [2]
    assert lexicon.match_components("advice needed", aliases) == []  # "vice" inside a word


def test_expand_query_links_languages() -> None:
    terms = lexicon.expand_query("चैटर")
    assert "chatter" in terms and "kaanpna" in terms


# --- extract_cards ---------------------------------------------------------------------------


HINGLISH = "VMC-3 pe chatter aa raha hai, feed kam kiya 0.12 pe, spindle ab theek"


def test_extract_live_returns_llm_cards(fake_llm) -> None:
    fake_llm.responses["extract"] = ExtractionResult(
        cards=[
            ExtractedCard(
                title="Chatter pe feed kam",
                machine="VMC-3",
                component="spindle",
                symptom="chatter",
                action="Feed 0.12 pe kam kiya",
                params={"feed": 0.12},
                confidence=0.9,
            ),
            ExtractedCard(title="empty", action="   "),  # dropped: no action
            ExtractedCard(title="odd", action="Check it", symptom="wobbly"),  # unknown symptom
        ]
    )
    cards = extract_cards(HINGLISH, author_id=1, machine_hint=None)

    assert [c.title for c in cards] == ["Chatter pe feed kam", "odd"]
    assert cards[0].machine == "VMC-3" and cards[0].component == "spindle"
    assert cards[0].mode == "live" and cards[1].symptom is None
    task, prompt = fake_llm.calls[0]
    assert task == "extract" and '<record id="note">' in prompt and HINGLISH in prompt


def test_extract_offline_uses_lexicon(fake_llm) -> None:
    # No response configured: FakeLLM raises ProviderUnavailable, like having no keys.
    cards = extract_cards("स्पिंडल से चैटर की आवाज़, फीड 0.3 था", author_id=2, machine_hint=3)

    assert len(cards) == 1
    card = cards[0]
    assert card.mode == "offline" and card.confidence < 0.5
    assert card.symptom == "chatter"  # chatter outranks noise
    assert card.params == {"feed": 0.3}
    assert card.action.startswith("स्पिंडल")


def test_extract_offline_long_note_gets_short_title(fake_llm) -> None:
    card = extract_cards("Coolant nozzle blocked. " * 20, author_id=2)[0]
    assert len(card.title) <= 80 and card.title.endswith("…")


def test_extract_rejects_empty_note(fake_llm) -> None:
    with pytest.raises(ValidationFailed):
        extract_cards("   ", author_id=1)
    assert fake_llm.calls == []


# --- save_cards ------------------------------------------------------------------------------


@pytest.fixture()
def shop(db):
    """Two machines with components, one employee and a voice note from them."""
    from app.models.erp import Employee, Machine
    from app.models.knowledge import Document
    from app.models.map3d import Component

    vmc = Machine(name="VMC-3", type="VMC", rpm_max=12000)
    lathe = Machine(name="Lathe-2", type="CNC lathe", rpm_max=3000)
    ramesh = Employee(name="Ramesh", role="old_employee")
    db.add_all([vmc, lathe, ramesh])
    db.flush()
    spindle = Component(
        machine_id=vmc.id, mesh_name="spindle", display_name="Spindle", aliases=["spindle", "स्पिंडल"]
    )
    coolant = Component(
        machine_id=vmc.id,
        mesh_name="coolant",
        display_name="Coolant system",
        aliases=["coolant", "nozzle"],
    )
    chuck = Component(
        machine_id=lathe.id, mesh_name="chuck", display_name="Chuck", aliases=["chuck", "jaw"]
    )
    doc = Document(
        type="voice",
        text="vmc 3 pe स्पिंडल chatter, feed kam kiya",
        uploader_id=ramesh.id,
        machine_id=lathe.id,
    )
    db.add_all([spindle, coolant, chuck, doc])
    db.commit()
    return {
        "vmc": vmc,
        "lathe": lathe,
        "spindle": spindle,
        "chuck": chuck,
        "doc": doc,
        "ramesh": ramesh,
    }


def test_save_cards_resolves_names_indexes_and_audits(db, shop, monkeypatch) -> None:
    import numpy as np
    from sqlalchemy import select

    from app.database import fts_search
    from app.models.ops import AuditLog
    from app.services import embeddings
    from app.services.capture.extractor import save_cards

    monkeypatch.setattr(
        embeddings,
        "try_embed",
        lambda texts, kind="passage": np.ones((len(texts), 384), np.float32),
    )
    cards = [
        ExtractedCard(
            title="Chatter fix",
            component="स्पिंडल",
            symptom="chatter",
            action="Feed kam kiya 0.12",
            params={"feed": 0.12},
        ),  # machine from note
        ExtractedCard(title="Jaw check", machine="Lathe 2", action="Clean the chuck jaw"),
    ]
    rows = save_cards(db, cards, shop["doc"].id)

    assert rows[0].machine_id == shop["vmc"].id and rows[0].component_id == shop["spindle"].id
    assert rows[1].machine_id == shop["lathe"].id and rows[1].component_id == shop["chuck"].id
    assert all(r.author_id == shop["ramesh"].id and r.verified_by_id is None for r in rows)
    assert len(rows[0].embedding) == 384 * 4
    assert [h[1] for h in fts_search(db, "chatter", machine_id=shop["vmc"].id)] == [rows[0].id]
    actions = db.execute(select(AuditLog.action)).scalars().all()
    assert actions == ["card.extracted", "card.extracted"]


def test_save_cards_without_embeddings_still_searchable(db, shop, monkeypatch) -> None:
    from app.database import fts_search
    from app.services import embeddings
    from app.services.capture.extractor import save_cards

    monkeypatch.setattr(embeddings, "try_embed", lambda texts, kind="passage": None)
    shop["doc"].text = "no machine named here"
    rows = save_cards(db, [ExtractedCard(title="Nozzle", action="Clean nozzle")], shop["doc"].id)

    assert rows[0].embedding is None
    assert rows[0].machine_id == shop["lathe"].id  # falls back to the note's machine
    assert fts_search(db, "nozzle")


def test_save_cards_unknown_document(db) -> None:
    from app.errors import NotFound
    from app.services.capture.extractor import save_cards

    with pytest.raises(NotFound):
        save_cards(db, [], 999)


def test_embeddings_unavailable_returns_none(monkeypatch) -> None:
    from app.services import embeddings

    monkeypatch.setattr(embeddings, "_model", None)
    monkeypatch.setattr(embeddings, "_load_failed", True)
    assert embeddings.try_embed(["chatter"]) is None
    assert embeddings.embed([]).shape == (0, 384)


# --- capture endpoints -----------------------------------------------------------------------


@pytest.fixture()
def api(client, shop, tmp_path, monkeypatch):
    """Client with temp storage and no heavy embedding model (vectors tested above)."""
    from app.config import get_settings
    from app.services import embeddings

    monkeypatch.setattr(get_settings(), "storage_dir", str(tmp_path))
    monkeypatch.setattr(embeddings, "try_embed", lambda texts, kind="passage": None)
    return client


def test_text_note_offline_makes_card(api, shop, fake_llm) -> None:
    resp = api.post(
        "/api/capture/text",
        json={"text": "VMC-3 pe chatter, feed 0.3 tha", "author_id": shop["ramesh"].id},
    )
    body = resp.json()
    assert resp.status_code == 200, body
    assert body["mode"] == "offline" and body["transcript"] is None
    card = body["cards"][0]
    assert card["machine_id"] == shop["vmc"].id and card["symptom"] == "chatter"
    assert card["params"] == {"feed": 0.3} and card["verified_by_id"] is None


def test_text_note_live_and_hook_result(api, shop, fake_llm, monkeypatch) -> None:
    from app.services.capture import voice

    fake_llm.responses["extract"] = ExtractionResult(
        cards=[
            ExtractedCard(
                title="Coolant nozzle", machine="VMC-3", component="nozzle", action="Clean it daily"
            )
        ]
    )
    seen = []

    def failing_hook(db, doc):
        raise RuntimeError("boom")

    def guardian_hook(db, doc):
        seen.append(doc.id)
        return {"severity": "info", "warnings": []}

    monkeypatch.setattr(voice, "NOTE_SAVED_HOOKS", [failing_hook, guardian_hook])
    body = api.post(
        "/api/capture/text",
        json={"text": "Clean the coolant nozzle daily", "author_id": shop["ramesh"].id},
    ).json()

    assert body["mode"] == "live" and body["cards"][0]["title"] == "Coolant nozzle"
    assert body["guardian"] == {"severity": "info", "warnings": []}
    assert seen == [body["document_id"]]


def test_voice_note_is_transcribed_and_saved(api, shop, fake_llm, monkeypatch) -> None:
    from app.services import stt

    def transcribe(path, language=None):
        assert path.is_file() and path.suffix == ".webm"
        return stt.Transcript(text="स्पिंडल से चैटर आ रहा है", language="hindi")

    monkeypatch.setattr(stt, "transcribe", transcribe)
    resp = api.post(
        "/api/capture/voice",
        files={"file": ("blob", b"\x1aE\xdf\xa3audio", "audio/webm")},
        data={
            "author_id": str(shop["ramesh"].id),
            "machine_id": str(shop["vmc"].id),
            "language": "hi",
        },
    )
    body = resp.json()
    assert resp.status_code == 200, body
    assert body["transcript"] == "स्पिंडल से चैटर आ रहा है"
    assert body["cards"][0]["component_id"] == shop["spindle"].id


def test_voice_note_kept_when_stt_unavailable(api, shop, db, monkeypatch) -> None:
    from app.config import get_settings
    from app.models.knowledge import Document

    monkeypatch.setattr(get_settings(), "groq_api_key", None)
    resp = api.post(
        "/api/capture/voice",
        files={"file": ("n.wav", b"RIFFdata", "audio/wav")},
        data={"author_id": str(shop["ramesh"].id)},
    )
    body = resp.json()
    assert resp.status_code == 200 and body["mode"] == "offline" and body["cards"] == []
    doc = db.get(Document, body["document_id"])
    assert doc.type == "voice" and doc.text is None and doc.file_path.endswith(".wav")


@pytest.mark.parametrize(
    "payload,status",
    [
        ({"text": "chatter", "author_id": 999}, 404),
        ({"text": "chatter", "author_id": 1, "machine_id": 999}, 404),
        ({"text": "", "author_id": 1}, 422),
        ({"text": "x" * 8001, "author_id": 1}, 422),
    ],
)
def test_text_note_bad_input(api, shop, payload, status) -> None:
    assert api.post("/api/capture/text", json=payload).status_code == status


def test_voice_rejects_wrong_file_type(api, shop) -> None:
    resp = api.post(
        "/api/capture/voice",
        files={"file": ("x.pdf", b"%PDF", "application/pdf")},
        data={"author_id": str(shop["ramesh"].id)},
    )
    assert resp.status_code == 422 and resp.json()["code"] == "validation_failed"


# --- video key frames ------------------------------------------------------------------------


def _write_video(path, scenes, fps=10, seconds=2, size=(320, 240)):
    """Write a real MJPG video: one solid BGR colour per scene, with light noise."""
    import cv2
    import numpy as np

    writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"MJPG"), fps, size)
    rng = np.random.default_rng(0)
    for bgr in scenes:
        for _ in range(fps * seconds):
            frame = np.full((size[1], size[0], 3), bgr, np.uint8)
            noise = rng.integers(0, 12, frame.shape, dtype=np.uint8)
            writer.write(cv2.add(frame, noise))
    writer.release()
    return path


RED, GREEN, BLUE = (30, 30, 200), (30, 200, 30), (200, 30, 30)


def test_keyframes_one_per_scene(tmp_path) -> None:
    import cv2
    import numpy as np

    from app.services.capture.video import extract_keyframes

    video = _write_video(tmp_path / "setup.avi", [RED, GREEN, BLUE])
    frames = extract_keyframes(video)

    assert [f.ts for f in frames] == [0.0, 2.0, 4.0]
    first = cv2.imdecode(np.frombuffer(frames[0].jpeg_bytes, np.uint8), cv2.IMREAD_COLOR)
    assert first.shape == (240, 320, 3) and first[..., 2].mean() > 150  # the red scene


def test_keyframes_static_video_gives_one(tmp_path) -> None:
    from app.services.capture.video import extract_keyframes

    video = _write_video(tmp_path / "static.avi", [GREEN, GREEN])
    assert len(extract_keyframes(video)) == 1


def test_keyframes_cap_keeps_biggest_changes_in_time_order(tmp_path) -> None:
    from app.services.capture.video import extract_keyframes

    grey = (120, 120, 120)
    video = _write_video(tmp_path / "many.avi", [RED, grey, BLUE], seconds=1)
    frames = extract_keyframes(video, max_frames=2)
    assert len(frames) == 2 and frames[0].ts == 0.0 and frames[0].ts < frames[1].ts


def test_keyframes_resizes_large_video(tmp_path) -> None:
    import cv2
    import numpy as np

    from app.services.capture.video import extract_keyframes

    video = _write_video(tmp_path / "big.avi", [RED], fps=2, seconds=1, size=(1600, 900))
    frame = extract_keyframes(video)[0]
    img = cv2.imdecode(np.frombuffer(frame.jpeg_bytes, np.uint8), cv2.IMREAD_COLOR)
    assert max(img.shape[:2]) == 1280


def test_keyframes_rejects_non_video(tmp_path) -> None:
    from app.services.capture.video import extract_keyframes

    bad = tmp_path / "notes.mp4"
    bad.write_bytes(b"this is not a video")
    with pytest.raises(ValidationFailed):
        extract_keyframes(bad)
