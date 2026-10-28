"""Deterministic Note Guardian rules. Pure functions: plain data in, findings out.

No database and no LLM here, so every rule is fast (O(params + symptoms)) and easy to
test. `check.py` loads the data, runs these, and only then asks the LLM.
"""

from datetime import date
from typing import Dict, Iterable, List, Mapping, Optional, Set

from app.schemas.guardian import (
    SEVERITY_RANK,
    Evidence,
    Finding,
    ParamLimitDTO,
    PrecursorStat,
)

STOP_OVER_LIMIT = 1.25  # 25% beyond the approved maximum is a stop, below that a caution
STOP_PRECURSOR_SHARE = 0.5  # symptom came before at least half of the failures ...
STOP_PRECURSOR_MIN = 2  # ... and at least twice: stop the machine and check
STOP_OVERDUE_FACTOR = 2.0  # maintenance more than one full interval late


def _fmt(value: float) -> str:
    return f"{value:g}"


def check_params(params: Mapping[str, float], limits: Iterable[ParamLimitDTO]) -> List[Finding]:
    """Compare each value in the note with the approved range for that parameter.

    When several limits exist for one parameter (e.g. machine-wide and per-material), the
    caller passes the most specific one first; only the first limit per parameter is used.
    """
    first: Dict[str, ParamLimitDTO] = {}
    for limit in limits:
        first.setdefault(limit.param, limit)
    findings: List[Finding] = []
    for name, value in params.items():
        limit = first.get(name)
        if limit is None:
            continue
        evidence = [
            Evidence(
                type="param_limit",
                id=limit.id,
                kind="Approved limit",
                title=f"{name} {_fmt(limit.min_value or 0)}–"
                f"{_fmt(limit.max_value) if limit.max_value else '∞'} {limit.unit}",
                detail=limit.note,
            )
        ]
        if limit.max_value is not None and value > limit.max_value:
            severity = "stop" if value > limit.max_value * STOP_OVER_LIMIT else "caution"
            message = (
                f"{name} {_fmt(value)} {limit.unit} is above the approved maximum "
                f"{_fmt(limit.max_value)} {limit.unit}."
            )
        elif limit.min_value is not None and value < limit.min_value:
            severity = "caution"
            message = (
                f"{name} {_fmt(value)} {limit.unit} is below the approved minimum "
                f"{_fmt(limit.min_value)} {limit.unit}."
            )
        else:
            continue
        if limit.note:
            message += f" Note from the limit: {limit.note}."
        findings.append(
            Finding(rule="param_limit", severity=severity, message=message, evidence=evidence)
        )
    return findings


def check_precursors(symptoms: Set[str], stats: Mapping[str, PrecursorStat]) -> List[Finding]:
    """Warn when a reported symptom has come before failures on this machine in the past."""
    findings: List[Finding] = []
    for symptom in sorted(symptoms):
        stat = stats.get(symptom)
        if stat is None or stat.preceded_count == 0 or stat.total_failures == 0:
            continue
        share = stat.preceded_count / stat.total_failures
        severe = share >= STOP_PRECURSOR_SHARE and stat.preceded_count >= STOP_PRECURSOR_MIN
        message = (
            f"'{symptom}' was reported before {stat.preceded_count} of the last "
            f"{stat.total_failures} {stat.failure_kind}s on this machine."
        )
        message += " Stop and check before continuing." if severe else " Keep an eye on it."
        evidence = [
            Evidence(type="maintenance", id=i, kind="Breakdown", title=stat.failure_kind)
            for i in stat.evidence_ids
        ]
        findings.append(
            Finding(
                rule="precursor",
                severity="stop" if severe else "caution",
                message=message,
                evidence=evidence,
            )
        )
    return findings


def check_maintenance(last_done: date, interval_days: int, today: date) -> Optional[Finding]:
    """Caution when preventive maintenance is overdue (stop when a whole interval late).

    The caller attaches the maintenance record as evidence.
    """
    if interval_days <= 0:
        return None
    due = (today - last_done).days - interval_days
    if due <= 0:
        return None
    late = (today - last_done).days >= interval_days * STOP_OVERDUE_FACTOR
    return Finding(
        rule="maintenance",
        severity="stop" if late else "caution",
        message=f"Preventive maintenance is {due} days overdue (every {interval_days} days, "
        f"last done {last_done.isoformat()}).",
    )


def max_severity(findings: Iterable[Finding]) -> Optional[str]:
    """Most serious severity among findings, or None when there are none."""
    ranked = [f.severity for f in findings]
    return max(ranked, key=SEVERITY_RANK.__getitem__) if ranked else None
