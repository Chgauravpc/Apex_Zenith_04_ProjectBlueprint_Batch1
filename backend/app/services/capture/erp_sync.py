"""Bring ERP data in: full sync over ERPNext-style REST, plus real-time webhook events.

Every ERP record is matched by its ERP name (`external_id`), so a sync can run any
number of times without creating duplicates. New QC rejects and work-order events
land on the machine timeline so Note Guardian and the assistant can use them.
"""

import logging
from datetime import date
from typing import Any, Callable, Dict, List, Optional, Tuple

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import fts_index, utcnow
from app.errors import NotFound, ProviderUnavailable, ValidationFailed
from app.models.erp import (
    ROLE_NEW,
    ROLE_OLD,
    ROLE_SUPERVISOR,
    Employee,
    Machine,
    Operation,
    Part,
    QCReject,
    WorkOrder,
)
from app.models.ops import Event
from app.schemas.capture import ErpWebhookIn, SyncReport

logger = logging.getLogger(__name__)

PAGE_SIZE = 100
TIMEOUT_SECONDS = 15
ROLES = {ROLE_OLD, ROLE_NEW, ROLE_SUPERVISOR}

# Called when the ERP sets an exit date: (db, employee) -> result. T11 registers the
# handover-plan builder here.
EXIT_DATE_HOOKS: List[Callable[[Session, Employee], Optional[Dict[str, Any]]]] = []


def fetch_all(client: Any, doctype: str) -> List[Dict[str, Any]]:
    """Read every record of a DocType page by page (ERPNext `limit_start` paging)."""
    rows: List[Dict[str, Any]] = []
    while True:
        resp = client.get(
            f"/api/resource/{doctype}",
            params={"limit_start": len(rows), "limit_page_length": PAGE_SIZE},
        )
        resp.raise_for_status()
        page = resp.json().get("data", [])
        rows.extend(page)
        if len(page) < PAGE_SIZE:
            return rows


def _upsert(db: Session, model: Any, external_id: str, values: Dict[str, Any]) -> Tuple[Any, str]:
    """Create or update one row by external_id; returns (row, created|updated|unchanged)."""
    row = db.execute(select(model).filter_by(external_id=external_id)).scalar_one_or_none()
    if row is None:
        row = model(external_id=external_id, **values)
        db.add(row)
        db.flush()
        return row, "created"
    changed = {k: v for k, v in values.items() if getattr(row, k) != v}
    for key, value in changed.items():
        setattr(row, key, value)
    return row, "updated" if changed else "unchanged"


def _day(value: Optional[str]) -> Optional[date]:
    return date.fromisoformat(value[:10]) if value else None


def _machine_values(doc: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "name": doc["workstation_name"],
        "type": doc.get("workstation_type") or "machine",
        "rpm_min": int(doc.get("custom_rpm_min") or 0),
        "rpm_max": int(doc["custom_rpm_max"]),
        "teeth": int(doc.get("custom_teeth") or 2),
        "location": doc.get("custom_location"),
    }


def _employee_values(doc: Dict[str, Any], existing_role: Optional[str]) -> Dict[str, Any]:
    role = doc.get("designation")
    return {
        "name": doc["employee_name"],
        # ERP designations vary; keep the known role, default new joinees to new_employee.
        "role": role if role in ROLES else existing_role or ROLE_NEW,
        "join_date": _day(doc.get("date_of_joining")),
        "exit_date": _day(doc.get("relieving_date")),
    }


class _Lookup:
    """ERP name → local id maps, loaded once per sync (no query per record)."""

    def __init__(self, db: Session) -> None:
        self.machines = dict(db.execute(select(Machine.external_id, Machine.id)).all())
        self.people = dict(db.execute(select(Employee.external_id, Employee.id)).all())
        self.parts = dict(db.execute(select(Part.number, Part.id)).all())
        self.ops = dict(db.execute(select(Operation.name, Operation.id)).all())
        self.orders = dict(db.execute(select(WorkOrder.external_id, WorkOrder.id)).all())


def _work_order_values(doc: Dict[str, Any], ids: _Lookup) -> Optional[Dict[str, Any]]:
    machine_id = ids.machines.get(doc.get("workstation"))
    if machine_id is None:
        return None
    status = {"Not Started": "open", "In Process": "running", "Completed": "closed"}
    return {
        "machine_id": machine_id,
        "part_id": ids.parts.get(doc.get("production_item")),
        "operation_id": ids.ops.get(doc.get("operation")),
        "employee_id": ids.people.get(doc.get("employee")),
        "quantity": int(doc.get("qty") or 1),
        "status": status.get(doc.get("status"), "open"),
    }


def _save_reject(db: Session, doc: Dict[str, Any], ids: _Lookup) -> Tuple[Optional[QCReject], str]:
    machine_id = ids.machines.get(doc.get("workstation"))
    if machine_id is None:
        return None, "skipped"
    values = {
        "machine_id": machine_id,
        "part_id": ids.parts.get(doc.get("item_code")),
        "work_order_id": ids.orders.get(doc.get("work_order")),
        "defect": doc.get("custom_defect") or "rejected",
        "cause": doc.get("remarks"),
        "quantity": int(doc.get("custom_qty") or 1),
    }
    row, outcome = _upsert(db, QCReject, doc["name"], values)
    if outcome == "created":
        text = f"{doc.get('item_code')} reject: {row.defect}. {row.cause or ''}"
        fts_index(db, "qc_reject", row.id, machine_id, text)
        db.add(
            Event(
                machine_id=machine_id,
                kind="qc_reject",
                ref_type="qc_reject",
                ref_id=row.id,
                summary=f"{row.quantity} x {row.defect}",
            )
        )
    return row, outcome


def _count(report: SyncReport, doctype: str, outcome: str) -> None:
    bucket = getattr(report, outcome)
    bucket[doctype] = bucket.get(doctype, 0) + 1


def _apply_doctype(
    db: Session, doctype: str, docs: List[Dict[str, Any]], report: SyncReport
) -> None:
    ids = _Lookup(db)
    for doc in docs:
        if doctype == "Workstation":
            _, outcome = _upsert(db, Machine, doc["name"], _machine_values(doc))
        elif doctype == "Employee":
            current = db.execute(select(Employee.role).filter_by(external_id=doc["name"]))
            values = _employee_values(doc, current.scalar_one_or_none())
            _, outcome = _upsert(db, Employee, doc["name"], values)
        elif doctype == "Work Order":
            values = _work_order_values(doc, ids)
            outcome = (
                "skipped" if values is None else _upsert(db, WorkOrder, doc["name"], values)[1]
            )
        else:
            _, outcome = _save_reject(db, doc, ids)
        _count(report, doctype, outcome)
    db.flush()


# Order matters: work orders need machines/people, rejects need work orders.
SYNC_ORDER = ["Workstation", "Employee", "Work Order", "Quality Inspection"]


def sync_erp(db: Session, base_url: str, client: Optional[Any] = None) -> SyncReport:
    """Pull machines, people, work orders and QC rejects from the ERP and upsert them.

    Args:
        base_url: ERP root URL (settings.erp_base_url).
        client: optional httpx-compatible client (tests pass the mock ERP's TestClient).

    Raises:
        ProviderUnavailable: the ERP could not be reached or answered with an error.
    """
    report = SyncReport()
    own = client is None
    http = client or httpx.Client(base_url=base_url, timeout=TIMEOUT_SECONDS)
    try:
        for doctype in SYNC_ORDER:
            _apply_doctype(db, doctype, fetch_all(http, doctype), report)
    except httpx.HTTPError as exc:
        db.rollback()
        raise ProviderUnavailable(f"ERP not reachable: {type(exc).__name__}") from exc
    finally:
        if own:
            http.close()
    db.commit()
    logger.info("erp sync created=%s updated=%s", report.created, report.updated)
    return report


def _order(db: Session, name: Any) -> WorkOrder:
    order = db.execute(select(WorkOrder).filter_by(external_id=name)).scalar_one_or_none()
    if order is None:
        raise NotFound(f"work order {name} not found; run an ERP sync first")
    return order


def handle_webhook(db: Session, event: ErpWebhookIn) -> Dict[str, Any]:
    """Apply one ERP event and return what changed."""
    data = event.data
    if event.event in ("job_start", "job_close"):
        order = _order(db, data.get("work_order"))
        now = utcnow()
        if event.event == "job_start":
            order.status, order.started_at = "running", now
        else:
            order.status, order.closed_at = "closed", now
        db.add(
            Event(
                machine_id=order.machine_id,
                kind=event.event,
                ref_type="work_order",
                ref_id=order.id,
                summary=f"{order.external_id} {order.status}",
            )
        )
        db.commit()
        return {"work_order_id": order.id, "status": order.status}
    if event.event == "qc_reject":
        if "name" not in data:
            raise ValidationFailed("qc_reject needs the ERP record name")
        row, outcome = _save_reject(db, data, _Lookup(db))
        if row is None:
            raise NotFound(f"workstation {data.get('workstation')} not found")
        db.commit()
        return {"qc_reject_id": row.id, "outcome": outcome}

    person = db.execute(
        select(Employee).filter_by(external_id=data.get("employee"))
    ).scalar_one_or_none()
    if person is None:
        raise NotFound(f"employee {data.get('employee')} not found")
    try:
        person.exit_date = date.fromisoformat(str(data.get("exit_date")))
    except ValueError as exc:
        raise ValidationFailed("exit_date must be YYYY-MM-DD") from exc
    db.commit()
    results = [hook(db, person) for hook in EXIT_DATE_HOOKS]
    return {
        "employee_id": person.id,
        "exit_date": person.exit_date.isoformat(),
        "handover": next((r for r in results if r), None),
    }
