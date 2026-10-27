"""Note Guardian: pure rules (this file) and the save-and-check flow."""

from datetime import date

import pytest

from app.schemas.guardian import Finding, ParamLimitDTO, PrecursorStat
from app.services.guardian import rules

FEED = ParamLimitDTO(
    id=1,
    param="feed",
    min_value=0.05,
    max_value=0.2,
    unit="mm/rev",
    note="Above 0.2 the spindle starts to chatter",
)
SPEED = ParamLimitDTO(id=2, param="speed", min_value=500, max_value=12000, unit="rpm")


@pytest.mark.parametrize(
    "params,expected",
    [
        ({"feed": 0.3}, ["stop"]),  # 50% over the limit
        ({"feed": 0.22}, ["caution"]),
        ({"feed": 0.15}, []),
        ({"feed": 0.2}, []),  # exactly at the limit is fine
        ({"feed": 0.02}, ["caution"]),  # below minimum
        ({"speed": 13000, "feed": 0.12}, ["caution"]),
        ({"torque": 99}, []),  # no limit known for this parameter
        ({}, []),
    ],
)
def test_check_params(params, expected) -> None:
    found = rules.check_params(params, [FEED, SPEED])
    assert [f.severity for f in found] == expected
    for f in found:
        assert f.evidence and f.evidence[0].type == "param_limit"


def test_check_params_uses_most_specific_limit_first() -> None:
    ss304 = ParamLimitDTO(id=3, param="feed", max_value=0.2, unit="mm/rev")
    machine_wide = ParamLimitDTO(id=4, param="feed", max_value=0.35, unit="mm/rev")
    found = rules.check_params({"feed": 0.3}, [ss304, machine_wide])
    assert found[0].evidence[0].id == 3 and "0.2" in found[0].message


CHATTER = PrecursorStat(
    id=1,
    symptom="chatter",
    failure_kind="spindle bearing failure",
    preceded_count=4,
    total_failures=5,
    evidence_ids=[1, 2, 4, 5],
)
NOISE = PrecursorStat(
    id=2,
    symptom="noise",
    failure_kind="spindle bearing failure",
    preceded_count=1,
    total_failures=5,
    evidence_ids=[3],
)


@pytest.mark.parametrize(
    "symptoms,expected",
    [
        ({"chatter"}, ["stop"]),
        ({"noise"}, ["caution"]),
        ({"chatter", "noise"}, ["stop", "caution"]),
        ({"burr"}, []),
        (set(), []),
    ],
)
def test_check_precursors(symptoms, expected) -> None:
    found = rules.check_precursors(symptoms, {"chatter": CHATTER, "noise": NOISE})
    assert [f.severity for f in found] == expected


def test_precursor_message_and_evidence() -> None:
    finding = rules.check_precursors({"chatter"}, {"chatter": CHATTER})[0]
    assert "4 of the last 5 spindle bearing failures" in finding.message
    assert [e.id for e in finding.evidence] == [1, 2, 4, 5]


def test_precursor_with_no_failures_is_ignored() -> None:
    empty = CHATTER.model_copy(update={"preceded_count": 0, "total_failures": 0})
    assert rules.check_precursors({"chatter"}, {"chatter": empty}) == []


TODAY = date(2026, 10, 27)


@pytest.mark.parametrize(
    "days_ago,interval,expected",
    [(130, 90, "caution"), (200, 90, "stop"), (50, 90, None), (90, 90, None), (10, 0, None)],
)
def test_check_maintenance(days_ago, interval, expected) -> None:
    from datetime import timedelta

    found = rules.check_maintenance(TODAY - timedelta(days=days_ago), interval, TODAY)
    assert (found.severity if found else None) == expected


def test_overdue_message_counts_days() -> None:
    from datetime import timedelta

    found = rules.check_maintenance(TODAY - timedelta(days=130), 90, TODAY)
    assert "40 days overdue" in found.message


def test_max_severity() -> None:
    def f(s):
        return Finding(rule="x", severity=s, message="m")

    assert rules.max_severity([f("info"), f("stop"), f("caution")]) == "stop"
    assert rules.max_severity([]) is None
