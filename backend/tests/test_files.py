"""Upload saving: type checks, size cap, server-side names, streaming."""

import io
from pathlib import Path

import pytest
from fastapi import UploadFile
from starlette.datastructures import Headers

from app.config import get_settings
from app.errors import PayloadTooLarge, ValidationFailed
from app.utils import files


@pytest.fixture(autouse=True)
def _tmp_storage(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "storage_dir", str(tmp_path))


def _upload(data: bytes, name: str, mime: str) -> UploadFile:
    return UploadFile(io.BytesIO(data), filename=name, headers=Headers({"content-type": mime}))


def test_saves_with_server_generated_name(tmp_path: Path) -> None:
    path = files.save_upload(_upload(b"RIFF....WAVE", "../../etc/passwd.wav", "audio/wav"), "audio")
    assert path.parent == tmp_path / "audio"
    assert path.suffix == ".wav" and "passwd" not in path.name and len(path.stem) == 32
    assert path.read_bytes() == b"RIFF....WAVE"


def test_recorder_blob_gets_extension_from_mime() -> None:
    path = files.save_upload(_upload(b"\x1aE\xdf\xa3", "blob", "audio/webm;codecs=opus"), "audio")
    assert path.suffix == ".webm"


@pytest.mark.parametrize(
    "name,mime,kind",
    [
        ("note.exe", "audio/wav", "audio"),  # bad extension
        ("chips.jpg", "application/pdf", "image"),  # bad MIME
        ("clip.mp4", "image/png", "video"),  # MIME of another kind
        ("page.png", "", "image"),  # missing MIME
    ],
)
def test_rejects_wrong_types(name: str, mime: str, kind: str, tmp_path: Path) -> None:
    with pytest.raises(ValidationFailed):
        files.save_upload(_upload(b"data", name, mime), kind)
    assert not list(tmp_path.rglob("*.*"))


def test_rejects_empty_file(tmp_path: Path) -> None:
    with pytest.raises(ValidationFailed):
        files.save_upload(_upload(b"", "a.jpg", "image/jpeg"), "image")
    assert not list((tmp_path / "image").iterdir())


def test_oversize_is_rejected_and_partial_file_removed(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setitem(files.MAX_BYTES, "image", 3 * files.CHUNK_BYTES)
    monkeypatch.setattr(files, "MB", 1)
    data = b"x" * (3 * files.CHUNK_BYTES + 1)
    with pytest.raises(PayloadTooLarge):
        files.save_upload(_upload(data, "big.png", "image/png"), "image")
    assert not list((tmp_path / "image").iterdir())


def test_exactly_at_limit_is_accepted(monkeypatch) -> None:
    monkeypatch.setitem(files.MAX_BYTES, "image", 2 * files.CHUNK_BYTES)
    path = files.save_upload(
        _upload(b"y" * (2 * files.CHUNK_BYTES), "ok.png", "image/png"), "image"
    )
    assert path.stat().st_size == 2 * files.CHUNK_BYTES


# --- hosted storage (Supabase, mocked HTTP) ---------------------------------------------------


@pytest.fixture()
def supa(monkeypatch: pytest.MonkeyPatch):
    """Supabase backend pointed at a mock transport; `supa.replies` are served in order."""
    import httpx

    from app.services import storage

    class Supa:
        replies: list = []
        requests: list = []

    def handler(request: httpx.Request) -> httpx.Response:
        Supa.requests.append(request)
        reply = Supa.replies.pop(0)
        if isinstance(reply, int):
            return httpx.Response(reply, json={"error": "nope"})
        return httpx.Response(200, json=reply)

    Supa.replies, Supa.requests = [], []
    s = get_settings()
    monkeypatch.setattr(s, "storage_backend", "supabase")
    monkeypatch.setattr(s, "supabase_url", "https://proj.supabase.co")
    monkeypatch.setattr(s, "supabase_service_key", "service-key")
    monkeypatch.setattr(storage, "_client", httpx.Client(transport=httpx.MockTransport(handler)))
    monkeypatch.setattr(storage, "_signed", {})
    monkeypatch.setattr(storage.time, "sleep", lambda _s: None)
    return Supa


@pytest.mark.parametrize(
    "key", ["", "../secret", "image/../../x", "/etc/passwd", "a\\b", "a\x08b", "a//b"]
)
def test_media_keys_cannot_leave_the_storage_folder(key: str) -> None:
    from app.errors import NotFound
    from app.services import storage

    with pytest.raises(NotFound):
        storage.local_path(key)


def test_local_storage_never_calls_supabase(tmp_path: Path) -> None:
    from app.services import storage

    path = files.save_upload(_upload(b"\xff\xd8jpeg", "chips.jpg", "image/jpeg"), "image")
    storage.persist(path)  # no client configured: any HTTP call would fail the test
    assert path.is_file()


def test_upload_goes_to_the_private_bucket_under_its_key(supa) -> None:
    supa.replies = [{"Key": "media/image/x.jpg"}]
    path = files.save_upload(_upload(b"\xff\xd8jpeg", "chips.jpg", "image/jpeg"), "image")

    (req,) = supa.requests
    assert req.method == "POST"
    assert req.url.path == f"/storage/v1/object/media/image/{path.name}"
    assert req.headers["authorization"] == "Bearer service-key"
    assert req.headers["apikey"] == "service-key"
    assert req.headers["content-type"] == "image/jpeg" and req.headers["x-upsert"] == "true"
    assert req.content == b"\xff\xd8jpeg"
    assert path.is_file()  # the local copy stays for processing


def test_upload_retries_a_server_error(supa) -> None:
    supa.replies = [503, {"Key": "ok"}]
    files.save_upload(_upload(b"RIFF", "a.wav", "audio/wav"), "audio")
    assert len(supa.requests) == 2 and supa.requests[1].content == b"RIFF"


def test_failed_upload_is_reported_and_local_copy_removed(supa, tmp_path: Path) -> None:
    from app.errors import ProviderUnavailable

    supa.replies = [401]
    with pytest.raises(ProviderUnavailable):
        files.save_upload(_upload(b"RIFF", "a.wav", "audio/wav"), "audio")
    assert len(supa.requests) == 1  # a bad key is not retried
    assert list((tmp_path / "audio").iterdir()) == []


def test_media_route_serves_local_then_signed_url(supa, client, tmp_path: Path) -> None:
    (tmp_path / "image").mkdir()
    (tmp_path / "image" / "here.jpg").write_bytes(b"local")
    assert client.get("/media/image/here.jpg").content == b"local"
    assert supa.requests == []

    supa.replies = [{"signedURL": "/object/sign/media/image/gone.jpg?token=abc"}]
    for _ in range(2):
        r = client.get("/media/image/gone.jpg", follow_redirects=False)
        assert r.status_code == 307
        assert r.headers["location"] == (
            "https://proj.supabase.co/storage/v1/object/sign/media/image/gone.jpg?token=abc"
        )
    assert len(supa.requests) == 1  # the second visit reuses the cached link
    assert supa.requests[0].url.path == "/storage/v1/object/sign/media/image/gone.jpg"


def test_media_route_404s(supa, client, monkeypatch) -> None:
    supa.replies = [400]  # Supabase answers 400 "Object not found"
    assert client.get("/media/image/missing.jpg").status_code == 404
    assert client.get("/media/../.env").status_code == 404
    monkeypatch.setattr(get_settings(), "storage_backend", "local")
    assert client.get("/media/image/missing.jpg").status_code == 404


def test_media_links_are_absolute_when_the_api_has_a_public_url(tmp_path, monkeypatch) -> None:
    from app.services.ask.search import media_url

    path = str(tmp_path / "video" / "x.mp4")
    assert media_url(path) == "/media/video/x.mp4"
    monkeypatch.setattr(get_settings(), "public_base_url", "https://api.example.com/")
    assert media_url(path) == "https://api.example.com/media/video/x.mp4"
    assert media_url("/somewhere/else.mp4") is None and media_url(None) is None


def test_half_configured_supabase_fails_at_startup(monkeypatch) -> None:
    from app.errors import ProviderUnavailable
    from app.services import storage

    monkeypatch.setattr(get_settings(), "storage_backend", "supabase")
    monkeypatch.setattr(get_settings(), "supabase_url", None)
    with pytest.raises(ProviderUnavailable):
        storage.check_config()


def test_supabase_url_with_rest_path_still_reaches_storage(supa, monkeypatch) -> None:
    monkeypatch.setattr(get_settings(), "supabase_url", "https://proj.supabase.co/rest/v1/")
    supa.replies = [{"Key": "ok"}]
    files.save_upload(_upload(b"RIFF", "a.wav", "audio/wav"), "audio")
    assert supa.requests[0].url.path.startswith("/storage/v1/object/media/audio/")
