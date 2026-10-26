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
