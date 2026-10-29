"""ERP sync against the real mock-ERP app, ERP webhooks, and the card review queue."""

from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.errors import NotFound
from app.models.erp import Employee, Machine, QCReject, WorkOrder
from app.models.knowledge import KnowledgeCard
from app.models.ops import Event
from app.schemas.capture import ErpWebhookIn
from app.services.capture import erp_sync
from seed.seed import seed_reference
from simulators import mock_erp

TODAY = date(2026, 10, 27)


@pytest.fixture()
def erp() -> TestClient:
    """The mock ERP app itself, reached through an httpx-compatible test client."""
    return TestClient(mock_erp.app)


def _count(db: Session, model) -> int:
    return db.execute(select(func.count()).select_from(model)).scalar_one()


def test_sync_twice_creates_no_duplicates(db: Session, erp: TestClient) -> None:
    seed_reference(db, TODAY)
    db.commit()

    first = erp_sync.sync_erp(db, "unused", client=erp)
    counts = {m: _count(db, m) for m in (Machine, Employee, WorkOrder, QCReject)}
    second = erp_sync.sync_erp(db, "unused", client=erp)

    assert first.created == {"Employee": 1, "Work Order": 2, "Quality Inspection": 1}
    assert first.unchanged["Workstation"] == 3  # seeded machines matched by ERP name
    assert {m: _count(db, m) for m in counts} == counts
    assert second.created == {} and second.updated == {}
    kavita = db.execute(select(Employee).filter_by(external_id="ERP-EMP-2057")).scalar_one()
    assert kavita.role == "new_employee"
    order = db.execute(select(WorkOrder).filter_by(external_id="ERP-WO-5002")).scalar_one()
    assert order.status == "running" and order.employee_id is not None
    assert db.execute(select(Event).filter_by(kind="qc_reject")).scalars().first() is not None


def test_repeated_doc_in_one_batch_updates_the_row_it_created(db: Session) -> None:
    doc = {"name": "ERP-WS-NEW", "workstation_name": "VMC-9", "custom_rpm_max": 8000}
    report = erp_sync.SyncReport()
    erp_sync._apply_doctype(db, "Workstation", [doc, {**doc, "custom_rpm_max": 9000}], report)
    machine = db.execute(select(Machine).filter_by(external_id="ERP-WS-NEW")).scalar_one()
    assert machine.rpm_max == 9000
    assert report.created == {"Workstation": 1} and report.updated == {"Workstation": 1}


def test_sync_pages_through_large_doctypes(db: Session, erp: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(erp_sync, "PAGE_SIZE", 2)
    rows = erp_sync.fetch_all(erp, "Employee")
    assert [r["name"] for r in rows][-1] == "ERP-EMP-2057" and len(rows) == 5


def test_sync_reports_unreachable_erp(db: Session) -> None:
    from app.errors import ProviderUnavailable

    with pytest.raises(ProviderUnavailable):
        erp_sync.sync_erp(db, "http://127.0.0.1:9")  # nothing listens on port 9


def test_webhooks_update_orders_rejects_and_exit_dates(
    db: Session, erp: TestClient, monkeypatch
) -> None:
    seed_reference(db, TODAY)
    erp_sync.sync_erp(db, "unused", client=erp)
    calls = []
    monkeypatch.setattr(
        erp_sync, "EXIT_DATE_HOOKS", [lambda s, person: calls.append(person.name) or {"plan_id": 7}]
    )

    started = erp_sync.handle_webhook(
        db, ErpWebhookIn(event="job_start", data={"work_order": "ERP-WO-5001"})
    )
    closed = erp_sync.handle_webhook(
        db, ErpWebhookIn(event="job_close", data={"work_order": "ERP-WO-5001"})
    )
    reject = erp_sync.handle_webhook(
        db,
        ErpWebhookIn(
            event="qc_reject",
            data={
                "name": "ERP-QC-012",
                "workstation": "ERP-MC-VMC-3",
                "item_code": "FL-101",
                "custom_defect": "burr",
                "custom_qty": 3,
            },
        ),
    )
    exit_ = erp_sync.handle_webhook(
        db,
        ErpWebhookIn(
            event="exit_date_set", data={"employee": "ERP-EMP-1002", "exit_date": "2027-03-31"}
        ),
    )

    assert started["status"] == "running" and closed["status"] == "closed"
    assert db.get(QCReject, reject["qc_reject_id"]).defect == "burr"
    assert exit_["exit_date"] == "2027-03-31" and exit_["handover"] == {"plan_id": 7}
    assert calls == ["Suresh Jadhav"]


def test_webhook_unknown_records(db: Session) -> None:
    with pytest.raises(NotFound):
        erp_sync.handle_webhook(db, ErpWebhookIn(event="job_start", data={"work_order": "X"}))
    with pytest.raises(NotFound):
        erp_sync.handle_webhook(
            db,
            ErpWebhookIn(event="exit_date_set", data={"employee": "X", "exit_date": "2027-01-01"}),
        )


def test_webhook_endpoint_validates_event_name(client: TestClient) -> None:
    assert client.post("/api/erp/webhook", json={"event": "party", "data": {}}).status_code == 422


# --- review queue ---------------------------------------------------------------------------


@pytest.fixture()
def cards(db: Session):
    ref = seed_reference(db, TODAY)
    vmc = ref["machines"]["VMC-3"]
    priya, ramesh = ref["people"]["Priya"], ref["people"]["Ramesh"]
    rows = [
        KnowledgeCard(
            title="Nozzle",
            action="Cleaned nozzle",
            machine_id=vmc.id,
            author_id=priya.id,
            confidence=0.4,
        ),
        KnowledgeCard(
            title="Seat part",
            action="Tap part down",
            machine_id=vmc.id,
            author_id=priya.id,
            confidence=0.7,
        ),
        KnowledgeCard(
            title="Old tip",
            action="Warm up spindle",
            machine_id=vmc.id,
            author_id=ramesh.id,
            verified_by_id=ramesh.id,
        ),
    ]
    db.add_all(rows)
    db.commit()
    return {"rows": rows, "priya": priya, "ramesh": ramesh, "vmc": vmc}


def test_review_queue_lists_unverified_least_confident_first(client, cards) -> None:
    body = client.get("/api/capture/review-queue?limit=1").json()
    assert body["total"] == 2 and [c["title"] for c in body["items"]] == ["Nozzle"]
    first = body["items"][0]
    assert (first["machine"], first["author"]) == ("VMC-3", cards["priya"].name)
    page2 = client.get("/api/capture/review-queue?limit=1&offset=1").json()
    assert [c["title"] for c in page2["items"]] == ["Seat part"]
    assert client.get("/api/capture/review-queue?limit=500").status_code == 422


def test_old_employee_edits_and_verifies(client, cards, db, monkeypatch) -> None:
    from app.database import fts_search
    from app.services import embeddings

    monkeypatch.setattr(embeddings, "try_embed", lambda texts, kind="passage": None)
    card = cards["rows"][0]
    resp = client.post(
        f"/api/capture/review/{card.id}",
        json={
            "reviewer_id": cards["ramesh"].id,
            "action": "edit",
            "action_text": "Clean the coolant nozzle with a 1 mm wire every Monday",
            "symptom": "poor_finish",
        },
    )
    body = resp.json()

    assert resp.status_code == 200 and body["outcome"] == "verified"
    assert body["card"]["verified_by_id"] == cards["ramesh"].id
    assert body["card"]["confidence"] >= 0.9
    assert [h[1] for h in fts_search(db, "wire")] == [card.id]


def test_new_employee_cannot_verify_and_reject_removes_card(client, cards, db) -> None:
    from app.database import fts_index, fts_search

    card = cards["rows"][1]
    fts_index(db, "card", card.id, card.machine_id, "Tap part down")
    db.commit()
    denied = client.post(
        f"/api/capture/review/{card.id}",
        json={"reviewer_id": cards["priya"].id, "action": "approve"},
    )
    assert denied.status_code == 422

    resp = client.post(
        f"/api/capture/review/{card.id}",
        json={"reviewer_id": cards["ramesh"].id, "action": "reject"},
    )
    assert resp.json()["outcome"] == "rejected"
    db.expire_all()
    assert db.get(KnowledgeCard, card.id) is None and fts_search(db, "Tap part") == []
    assert (
        client.post(
            "/api/capture/review/9999",
            json={"reviewer_id": cards["ramesh"].id, "action": "approve"},
        ).status_code
        == 404
    )
