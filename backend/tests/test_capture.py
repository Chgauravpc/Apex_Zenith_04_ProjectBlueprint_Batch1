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
