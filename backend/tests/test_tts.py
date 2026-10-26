"""Text-to-speech: caching, validation, failure handling, and a live edge-tts call."""

from pathlib import Path
from typing import List

import aiohttp
import pytest

from app.config import get_settings
from app.errors import ProviderUnavailable, ValidationFailed
from app.services import tts


@pytest.fixture(autouse=True)
def _tmp_storage(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "storage_dir", str(tmp_path))


@pytest.fixture()
def calls(monkeypatch: pytest.MonkeyPatch) -> List[str]:
    """Replace the network call to edge-tts with one that writes a small MP3-like file."""
    seen: List[str] = []

    async def save(text: str, voice: str, dest: Path) -> None:
        seen.append(voice)
        dest.write_bytes(b"ID3" + text.encode("utf-8"))

    monkeypatch.setattr(tts, "_save", save)
    return seen


def test_generates_once_then_serves_from_cache(calls: List[str], tmp_path: Path) -> None:
    first = tts.synthesize("स्पिंडल का तापमान जाँचें", "hi")
    second = tts.synthesize("  स्पिंडल का तापमान जाँचें ", "hi")
    assert first == second and first.parent == tmp_path / "tts"
    assert first.read_bytes().startswith(b"ID3")
    assert calls == ["hi-IN-SwaraNeural"]
    assert not list(first.parent.glob("*.part"))


def test_voice_per_language(calls: List[str]) -> None:
    tts.synthesize("Check the chuck jaws", "en")
    tts.synthesize("जॉ साफ करा", "mr")
    assert calls == ["en-IN-NeerjaNeural", "mr-IN-AarohiNeural"]


@pytest.mark.parametrize("text,lang", [("", "hi"), ("   ", "en"), ("x" * 2001, "en"), ("hi", "fr")])
def test_rejects_bad_input(text: str, lang: str, calls: List[str]) -> None:
    with pytest.raises(ValidationFailed):
        tts.synthesize(text, lang)
    assert calls == []


def test_network_failure_leaves_no_file(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    async def broken(text: str, voice: str, dest: Path) -> None:
        dest.write_bytes(b"half")
        raise aiohttp.ClientConnectionError("offline")

    monkeypatch.setattr(tts, "_save", broken)
    with pytest.raises(ProviderUnavailable):
        tts.synthesize("Stop the machine", "en")
    assert not [p for p in tmp_path.rglob("*") if p.is_file()]


@pytest.mark.live
def test_live_edge_tts_hindi() -> None:
    """Real call to Microsoft edge-tts (no key needed, internet required)."""
    path = tts.synthesize("स्पिंडल का तापमान पचपन डिग्री से ऊपर हो तो मशीन रोकें।", "hi")
    data = path.read_bytes()
    assert len(data) > 5000  # a few seconds of 24 kHz MP3
