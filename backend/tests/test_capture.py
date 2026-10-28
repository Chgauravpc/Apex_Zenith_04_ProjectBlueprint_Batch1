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


def _cards_without_vectors(db, shop, n: int):
    from app.models.knowledge import KnowledgeCard

    rows = [
        KnowledgeCard(title=f"Tip {i}", action=f"Check spindle {i}", machine_id=shop["vmc"].id)
        for i in range(n)
    ]
    db.add_all(rows)
    db.commit()
    return rows


def test_backfill_fills_missing_vectors_once(db, shop, monkeypatch) -> None:
    import numpy as np

    from app.services import embeddings
    from app.services.capture.extractor import backfill_embeddings

    calls = []

    def embed(texts, kind="passage"):
        calls.append((len(texts), kind))
        return np.ones((len(texts), 384), np.float32)

    monkeypatch.setattr(embeddings, "try_embed", embed)
    rows = _cards_without_vectors(db, shop, 5)

    assert backfill_embeddings(db, batch_size=2) == 5
    assert calls == [(2, "passage"), (2, "passage"), (1, "passage")]
    assert all(len(r.embedding) == 384 * 4 for r in rows)
    assert backfill_embeddings(db) == 0 and len(calls) == 3  # nothing left: no API call


def test_backfill_keeps_cards_for_later_when_provider_is_down(db, shop, monkeypatch) -> None:
    import numpy as np

    from app.services import embeddings
    from app.services.capture.extractor import backfill_embeddings

    replies = [np.ones((2, 384), np.float32), None]
    monkeypatch.setattr(embeddings, "try_embed", lambda texts, kind="passage": replies.pop(0))
    rows = _cards_without_vectors(db, shop, 4)

    assert backfill_embeddings(db, batch_size=2) == 2  # first batch saved, then provider down
    assert [r.embedding is not None for r in rows] == [True, True, False, False]

    def embed(texts, kind="passage"):
        return np.ones((len(texts), 384), np.float32)

    monkeypatch.setattr(embeddings, "try_embed", embed)
    assert backfill_embeddings(db) == 2 and all(r.embedding is not None for r in rows)


def test_embeddings_unavailable_returns_none(monkeypatch) -> None:
    from app.services import embeddings

    monkeypatch.setattr(embeddings, "_model", None)
    monkeypatch.setattr(embeddings, "_load_failed", True)
    assert embeddings.try_embed(["chatter"]) is None
    assert embeddings.embed([]).shape == (0, 384)


def test_embeddings_switched_off_never_loads_the_model(monkeypatch) -> None:
    from app.config import get_settings
    from app.services import embeddings

    monkeypatch.setattr(get_settings(), "enable_embeddings", False)
    monkeypatch.setattr(embeddings, "_model", None)
    monkeypatch.setattr(embeddings, "_load_failed", False)
    assert embeddings.try_embed(["chatter"]) is None
    assert embeddings._load_failed is False  # flag is checked before any import or download


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


def test_transcribe_returns_text_and_keeps_nothing(api, tmp_path, monkeypatch) -> None:
    from app.services import stt

    seen = []

    def transcribe(path, language=None):
        seen.append(path)
        return stt.Transcript(text="  फीड कम करो  ", language="hindi")

    monkeypatch.setattr(stt, "transcribe", transcribe)
    resp = api.post(
        "/api/capture/transcribe",
        files={"file": ("blob", b"\x1aE\xdf\xa3audio", "audio/webm")},
        data={"language": "hi"},
    )
    assert resp.status_code == 200, resp.json()
    assert resp.json() == {"text": "फीड कम करो", "language": "hi", "mode": "live"}
    assert seen and not seen[0].exists()  # the reply's audio is not stored


def test_transcribe_offline_asks_to_type(api) -> None:
    resp = api.post("/api/capture/transcribe", files={"file": ("n.wav", b"RIFFdata", "audio/wav")})
    assert resp.status_code == 200 and resp.json()["mode"] == "offline"
    assert resp.json()["text"] == ""


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

    codec = "mp4v" if str(path).endswith(".mp4") else "MJPG"
    writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*codec), fps, size)
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


# --- video -> draft procedure ----------------------------------------------------------------


@pytest.fixture()
def setup_video(tmp_path, monkeypatch):
    from app.config import get_settings

    monkeypatch.setattr(get_settings(), "storage_dir", str(tmp_path / "store"))
    return _write_video(tmp_path / "setup.mp4", [RED, GREEN, BLUE])


def _speech(monkeypatch, segments):
    from app.services import stt

    def transcribe(path, language=None):
        segs = [stt.Segment(start=a, end=b, text=t) for a, b, t in segments]
        return stt.Transcript(text=" ".join(t for _, _, t in segments), segments=segs)

    monkeypatch.setattr(stt, "transcribe", transcribe)


def test_draft_procedure_live_vision(db, shop, setup_video, fake_llm, monkeypatch) -> None:
    from pathlib import Path

    from app.models.guide import ProcedureStep
    from app.schemas.capture import DraftStep, VideoProcedureDraft
    from app.services.capture.video import draft_procedure

    _speech(monkeypatch, [(0.5, 1.5, "vise saaf karo"), (2.2, 3.0, "face mill lagao")])
    fake_llm.responses["vision"] = VideoProcedureDraft(
        title="Face milling FL-101",
        steps=[
            DraftStep(frame_index=1, instruction="Load the face mill", params={"speed": 3500}),
            DraftStep(frame_index=0, instruction="Clean the vise", safety="Safety glasses"),
            DraftStep(frame_index=7, instruction="Out of range frame is dropped"),
        ],
    )
    proc = draft_procedure(db, setup_video, shop["ramesh"].id, shop["vmc"].id)

    assert proc.status == "draft" and proc.title == "Face milling FL-101"
    steps = db.query(ProcedureStep).filter_by(procedure_id=proc.id).order_by("step_no").all()
    assert [s.instruction for s in steps] == ["Clean the vise", "Load the face mill"]
    assert (steps[0].clip_start, steps[0].clip_end, steps[1].clip_start) == (0.0, 2.0, 2.0)
    assert Path(steps[0].media_path).is_file() and steps[1].params == {"speed": 3500}
    assert "vise saaf karo" in fake_llm.calls[0][1]  # transcript went to the model
    assert draft_procedure(db, setup_video, shop["ramesh"].id, shop["vmc"].id).id == proc.id


def test_draft_procedure_offline_uses_transcript(db, shop, setup_video, monkeypatch) -> None:
    from app.services.capture.video import OFFLINE_TITLE, draft_procedure

    _speech(monkeypatch, [(0.2, 1.0, "vise saaf karo"), (4.1, 5.0, "thickness napo")])
    proc = draft_procedure(db, setup_video, shop["ramesh"].id, None)  # FakeLLM: no vision

    steps = sorted(proc_steps(db, proc.id), key=lambda s: s.step_no)
    assert proc.title == OFFLINE_TITLE
    assert [(s.instruction, s.clip_start) for s in steps] == [
        ("vise saaf karo", 0.0),
        ("thickness napo", 4.0),
    ]


def proc_steps(db, procedure_id):
    from app.models.guide import ProcedureStep

    return db.query(ProcedureStep).filter_by(procedure_id=procedure_id).all()


def test_draft_procedure_needs_vision_or_speech(db, shop, setup_video, monkeypatch) -> None:
    from app.config import get_settings
    from app.errors import ProviderUnavailable
    from app.services.capture.video import draft_procedure

    monkeypatch.setattr(get_settings(), "groq_api_key", None)
    monkeypatch.setattr(get_settings(), "openrouter_api_key", None)
    with pytest.raises(ProviderUnavailable):
        draft_procedure(db, setup_video, shop["ramesh"].id, None)


# --- background jobs + video endpoint --------------------------------------------------------


@pytest.fixture()
def job_db(db, monkeypatch):
    """Job threads open their own session; point them at the test database."""
    from sqlalchemy.orm import Session

    from app.services import jobs

    monkeypatch.setattr(jobs, "session_factory", lambda: Session(bind=db.get_bind()))
    return db


def test_video_endpoint_runs_job_to_done(api, shop, job_db, setup_video, monkeypatch) -> None:
    _speech(monkeypatch, [(0.2, 1.0, "vise saaf karo"), (2.1, 3.0, "face mill lagao")])
    with open(setup_video, "rb") as fh:
        resp = api.post(
            "/api/capture/video",
            files={"file": ("setup.mp4", fh, "video/mp4")},
            data={"author_id": str(shop["ramesh"].id), "machine_id": str(shop["vmc"].id)},
        )
    assert resp.status_code == 202, resp.json()
    job = api.get(f"/api/jobs/{resp.json()['job_id']}").json()  # TestClient ran the task

    assert job["status"] == "done" and job["error"] is None
    assert job["result"]["procedure_id"] > 0


def test_video_job_failure_is_reported(api, shop, job_db, setup_video, monkeypatch) -> None:
    from app.config import get_settings

    monkeypatch.setattr(get_settings(), "groq_api_key", None)  # no speech, no vision
    with open(setup_video, "rb") as fh:
        job_id = api.post(
            "/api/capture/video",
            files={"file": ("s.mp4", fh, "video/mp4")},
            data={"author_id": str(shop["ramesh"].id)},
        ).json()["job_id"]
    job = api.get(f"/api/jobs/{job_id}").json()
    assert job["status"] == "failed" and "vision model or speech" in job["error"]


def test_run_job_hides_unexpected_errors(job_db) -> None:
    from app.services import jobs

    job = jobs.create_job(job_db, "test")

    def crash(db):
        raise KeyError("secret detail")

    jobs.run_job(job.id, crash)
    job_db.expire_all()
    stored = jobs.get_job(job_db, job.id)
    assert stored.status == "failed" and stored.error == "internal error while processing"


def test_unknown_job_and_bad_video_requests(api, shop) -> None:
    assert api.get("/api/jobs/doesnotexist").status_code == 404
    resp = api.post(
        "/api/capture/video",
        files={"file": ("a.mp4", b"x", "video/mp4")},
        data={"author_id": "999"},
    )
    assert resp.status_code == 404  # unknown employee checked before storing anything


# --- handwritten pages -----------------------------------------------------------------------


@pytest.fixture()
def page_photo(tmp_path):
    """A real JPEG of a page with dark handwriting-like strokes."""
    import cv2
    import numpy as np

    img = np.full((2000, 1500, 3), 235, np.uint8)
    for y in range(150, 1900, 90):
        cv2.putText(
            img,
            "VMC-3 chatter - Ramesh check spindle",
            (80, y),
            cv2.FONT_HERSHEY_SCRIPT_SIMPLEX,
            2,
            (40, 40, 40),
            3,
        )
    path = tmp_path / "page.jpg"
    cv2.imwrite(str(path), img)
    return path


def _page_reading():
    from app.schemas.capture import ActionItemIn, HandwrittenResult, NoteItem

    return HandwrittenResult(
        title="Shift meeting",
        meeting_date="2026-10-20",
        text="VMC-3 chatter on flange job. Ramesh to check spindle bearing by Friday.",
        issues=[NoteItem(text="VMC-3 chatter on flange job", machine="VMC-3", confidence=0.9)],
        decisions=[NoteItem(text="Feed max 0.2 on SS304", confidence=0.5)],
        action_items=[
            ActionItemIn(
                text="Check spindle bearing",
                owner="Ramesh bhau",
                machine="VMC-3",
                due="2026-10-24",
                confidence=0.85,
            ),
            ActionItemIn(text="[?] coolant", owner="unknown", due="next week", confidence=0.3),
        ],
    )


def test_process_handwritten_saves_meeting_and_actions(db, shop, page_photo, fake_llm) -> None:
    from datetime import date

    from app.database import fts_search
    from app.models.knowledge import ActionItem, Meeting
    from app.services.capture.handwritten import process_handwritten

    fake_llm.responses["vision"] = _page_reading()
    out = process_handwritten(db, page_photo, shop["ramesh"].id)

    meeting = db.get(Meeting, out.meeting_id)
    assert meeting.held_on == date(2026, 10, 20) and "Decision: Feed max 0.2" in meeting.summary
    actions = db.query(ActionItem).filter_by(meeting_id=meeting.id).order_by("id").all()
    assert actions[0].owner_id == shop["ramesh"].id and actions[0].due_on == date(2026, 10, 24)
    assert actions[0].machine_id == shop["vmc"].id and actions[0].status == "open"
    assert actions[1].owner_id is None and actions[1].due_on is None
    assert actions[1].status == "needs_review"
    assert out.needs_review == 2  # the unclear action and the 0.5 decision
    assert [h[1] for h in fts_search(db, "spindle bearing")] == [meeting.id]


def test_handwritten_photo_is_shrunk_before_sending(db, shop, page_photo, fake_llm) -> None:
    import cv2
    import numpy as np

    from app.services.capture import handwritten

    sent = handwritten._page_jpeg(page_photo)
    img = cv2.imdecode(np.frombuffer(sent, np.uint8), cv2.IMREAD_COLOR)
    assert max(img.shape[:2]) == 1280


def test_handwritten_job_without_vision_fails_clearly(api, shop, job_db, page_photo) -> None:
    with open(page_photo, "rb") as fh:
        resp = api.post(
            "/api/capture/handwritten",
            files={"file": ("page.jpg", fh, "image/jpeg")},
            data={"uploader_id": str(shop["ramesh"].id)},
        )
    assert resp.status_code == 202
    job = api.get(f"/api/jobs/{resp.json()['job_id']}").json()
    assert job["status"] == "failed" and "vision" in job["error"]


def test_handwritten_job_done(api, shop, job_db, page_photo, fake_llm) -> None:
    fake_llm.responses["vision"] = _page_reading()
    with open(page_photo, "rb") as fh:
        job_id = api.post(
            "/api/capture/handwritten",
            files={"file": ("page.jpg", fh, "image/jpeg")},
            data={"uploader_id": str(shop["ramesh"].id)},
        ).json()["job_id"]
    job = api.get(f"/api/jobs/{job_id}").json()
    assert job["status"] == "done" and job["result"]["action_items"] == 2


def test_handwritten_rejects_unreadable_image(db, shop, tmp_path, fake_llm) -> None:
    from app.services.capture.handwritten import process_handwritten

    bad = tmp_path / "x.jpg"
    bad.write_bytes(b"not an image")
    with pytest.raises(ValidationFailed):
        process_handwritten(db, bad, shop["ramesh"].id)
    assert fake_llm.calls == []


# --- sensors ---------------------------------------------------------------------------------


def test_detect_anomalies_finds_injected_spike() -> None:
    import numpy as np

    from app.services.capture.sensors import detect_anomalies

    rng = np.random.default_rng(1)
    signal = 2.0 + 0.05 * rng.standard_normal(300)
    signal[200] = 3.5  # vibration spike
    # At z=3 Gaussian noise alone crosses the line ~0.3% of the time, so expect the spike
    # among a few false alarms; a stricter limit keeps only the spike.
    assert 200 in detect_anomalies(signal, window=60, z=3.0)
    assert detect_anomalies(signal, window=60, z=5.0) == [200]


def test_detect_anomalies_matches_slow_reference() -> None:
    import numpy as np

    from app.services.capture.sensors import detect_anomalies

    rng = np.random.default_rng(7)
    x = rng.standard_normal(500) + np.where(rng.random(500) < 0.02, 6.0, 0.0)
    w, z = 30, 2.5
    slow = [
        i
        for i in range(w, x.size)
        if abs(x[i] - x[i - w : i].mean()) / max(x[i - w : i].std(), 1e-6) > z
    ]
    assert detect_anomalies(x, window=w, z=z) == slow


@pytest.mark.parametrize(
    "values,expected", [([5.0] * 70 + [9.0], [70]), ([1.0] * 10, []), ([5.0] * 80, [])]
)
def test_detect_anomalies_edge_cases(values, expected) -> None:
    from app.services.capture.sensors import detect_anomalies

    assert detect_anomalies(values, window=60) == expected


def _batch(machine_id, values, start_s=0):
    from datetime import datetime, timedelta

    from app.schemas.capture import SensorBatchIn

    t0 = datetime(2026, 10, 27, 8, 0)
    return SensorBatchIn(
        machine_id=machine_id,
        sensor="vibration",
        readings=[
            {"ts": t0 + timedelta(seconds=start_s + i), "value": v} for i, v in enumerate(values)
        ],
    )


def test_ingest_uses_history_across_batches(db, shop) -> None:
    import numpy as np

    from app.models.ops import Anomaly, Event, SensorReading
    from app.services.capture.sensors import ingest_readings

    rng = np.random.default_rng(3)
    calm = (2.0 + 0.05 * rng.standard_normal(80)).tolist()
    first = ingest_readings(db, _batch(shop["vmc"].id, calm))
    second = ingest_readings(db, _batch(shop["vmc"].id, [3.6, 2.0, 2.01], start_s=80))

    assert first.anomalies == 0
    assert second.stored == 3 and second.anomalies == 1  # spike is first reading of batch 2
    anomaly = db.get(Anomaly, second.anomaly_ids[0])
    assert anomaly.value == 3.6 and anomaly.zscore > 3
    assert db.query(SensorReading).count() == 83
    assert db.query(Event).filter_by(kind="anomaly").count() == 1


def test_ingest_rejects_bad_batches(db, shop) -> None:
    from app.errors import NotFound
    from app.services.capture.sensors import ingest_readings

    with pytest.raises(NotFound):
        ingest_readings(db, _batch(999, [1.0]))
    batch = _batch(shop["vmc"].id, [1.0, 2.0])
    batch.readings.reverse()
    with pytest.raises(ValidationFailed):
        ingest_readings(db, batch)


# --- sensor simulator -> API -----------------------------------------------------------------


def test_sensor_sim_generates_profile_with_spikes() -> None:
    from datetime import datetime

    from simulators.sensor_sim import generate

    start = datetime(2026, 10, 27, 8, 0)
    a = generate("spindle_temp", 120, start, spikes=[100], seed=4)
    assert a == generate("spindle_temp", 120, start, spikes=[100], seed=4)  # reproducible
    values = [v for _, v in a]
    assert 37 < sum(values[:90]) / 90 < 39 and values[100] > 48
    assert a[1][0] - a[0][0] == (a[2][0] - a[1][0])  # 1 Hz
    with pytest.raises(ValueError):
        generate("pressure", 10, start)


def test_sensor_sim_streams_to_api_and_spike_is_flagged(api, shop, db) -> None:
    from datetime import datetime

    from app.models.ops import Anomaly
    from simulators.sensor_sim import generate, stream

    start = datetime(2026, 10, 27, 8, 0)
    readings = generate("vibration", 240, start, spikes=[150], seed=2)
    reports = stream(api, shop["vmc"].id, "vibration", readings, batch=60)

    assert [r["stored"] for r in reports] == [60, 60, 60, 60]
    flagged = {a.ts for a in db.query(Anomaly).filter_by(machine_id=shop["vmc"].id)}
    assert readings[150][0] in flagged


def test_capture_response_carries_guardian_under_frontend_name(api, shop, fake_llm) -> None:
    body = api.post(
        "/api/capture/text",
        json={"text": "VMC-3 pe chatter, feed 0.3 tha", "author_id": shop["ramesh"].id},
    ).json()
    assert body["guardian_result"] == body["guardian"]  # NoteEditor reads guardian_result
