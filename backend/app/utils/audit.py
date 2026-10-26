"""Record AI actions and human approvals in `audit_log` for traceability.

The row is added to the caller's session and saved with the caller's commit, so
an audit entry exists exactly when the action it describes was saved.
"""

from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.ops import AuditLog

MAX_DETAIL_CHARS = 500  # keep audit rows small; store IDs, not full employee text


def _shorten(value: Any) -> Any:
    if isinstance(value, str) and len(value) > MAX_DETAIL_CHARS:
        return value[:MAX_DETAIL_CHARS] + "…"
    return value


def audit(
    db: Session,
    action: str,
    actor_id: Optional[int] = None,
    target_type: Optional[str] = None,
    target_id: Optional[int] = None,
    **detail: Any,
) -> AuditLog:
    """Add an audit entry to `db` (not committed here).

    Args:
        action: what happened, e.g. "card.extracted", "warning.raised", "card.verified".
        actor_id: employee who acted; None for an automatic AI action.
        target_type / target_id: the record affected.
        detail: small extra facts (model name, mode "live"/"offline", severity ...).
    """
    entry = AuditLog(
        action=action,
        actor_id=actor_id,
        target_type=target_type,
        target_id=target_id,
        detail={k: _shorten(v) for k, v in detail.items()},
    )
    db.add(entry)
    return entry
