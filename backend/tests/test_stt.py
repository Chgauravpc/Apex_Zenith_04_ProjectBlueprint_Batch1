"""Speech-to-text: request shape, segment parsing, caching and failures (network faked)."""

from pathlib import Path
from types import SimpleNamespace
from typing import Any, Dict, List

import httpx
import openai
import pytest
from sqlalchemy.orm import Session

from app.config import get_settings
from app.errors import ProviderUnavailable, ValidationFailed
from app.services import llm, stt


class WhisperClient:
    """Replaces the Groq HTTP client; records requests, returns a verbose_json-like reply."""

    def __init__(self, reply: Any) -> None:
        self.reply = reply
        self.calls: List[Dict[str, Any]] = []
        self.audio = SimpleNamespace(transcriptions=SimpleNamespace(create=self._create))

    def _create(self, **kwargs: Any) -> Any:
        self.calls.append({**kwargs, "file_name": kwargs["file"][0]})
        if isinstance(self.reply, Exception):
            raise self.reply
        return self.reply


@pytest.fixture()
def audio(tmp_path: Path) -> Path:
    path = tmp_path / "note.webm"
    path.write_bytes(b"\x1aE\xdf\xa3 any bytes work here: the HTTP client is replaced")
    return path


@pytest.fixture()
def whisper(db: Session, monkeypatch: pytest.MonkeyPatch):
    def install(reply: Any) -> WhisperClient:
        client = WhisperClient(reply)
        monkeypatch.setattr(get_settings(), "groq_api_key", "test-groq")
        monkeypatch.setattr(llm, "_client", lambda provider, key: client)
        monkeypatch.setattr(llm, "session_factory", lambda: Session(bind=db.get_bind()))
        return client

    return install


HINDI = {
    "text": " VMC-3 पे चैटर आ रहा है, फीड कम किया ",
    "language": "hindi",
    "segments": [
        {"start": 0.0, "end": 2.1, "text": " VMC-3 पे चैटर आ रहा है,"},
        {"start": 2.1, "end": 3.4, "text": " फीड कम किया"},
    ],
}


def test_transcribe_parses_segments_and_caches(whisper, audio: Path) -> None:
    client = whisper(HINDI)
    first = stt.transcribe(audio, "hi")
    second = stt.transcribe(audio, "hi")

    assert first == second
    assert first.text == "VMC-3 पे चैटर आ रहा है, फीड कम किया"
    assert [s.end for s in first.segments] == [2.1, 3.4]
    assert len(client.calls) == 1
    call = client.calls[0]
    assert call["model"] == get_settings().model_stt and call["language"] == "hi"
    assert call["response_format"] == "verbose_json" and call["file_name"] == "note.webm"


def test_sdk_objects_are_parsed_too(whisper, audio: Path) -> None:
    seg = SimpleNamespace(start=0.0, end=1.0, text=" hello ")
    whisper(SimpleNamespace(text="hello", language="english", segments=[seg]))
    result = stt.transcribe(audio)
    assert result.segments[0].text == "hello" and result.language == "english"


def test_api_error_becomes_provider_unavailable(whisper, audio: Path) -> None:
    whisper(openai.APIConnectionError(request=httpx.Request("POST", "https://x.invalid")))
    with pytest.raises(ProviderUnavailable):
        stt.transcribe(audio, "mr")


def test_no_key_and_bad_input(audio: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "groq_api_key", None)
    with pytest.raises(ProviderUnavailable):
        stt.transcribe(audio)
    with pytest.raises(ValidationFailed):
        stt.transcribe(audio, "fr")
    with pytest.raises(ValidationFailed):
        stt.transcribe(audio.parent / "missing.wav")
