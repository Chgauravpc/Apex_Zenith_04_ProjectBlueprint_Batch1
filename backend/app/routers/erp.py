"""ERP integration endpoints: full sync and real-time webhook events."""

from typing import Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database import get_db
from app.schemas.capture import ErpWebhookIn, SyncReport
from app.services.capture import erp_sync

router = APIRouter(prefix="/erp", tags=["erp"])


@router.post("/sync", response_model=SyncReport)
def sync(db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> SyncReport:
    """Pull machines, people, work orders and QC rejects from the ERP (safe to repeat)."""
    return erp_sync.sync_erp(db, settings.erp_base_url)


@router.post("/webhook")
def webhook(event: ErpWebhookIn, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """job_start / job_close / qc_reject / exit_date_set pushed by the ERP."""
    return erp_sync.handle_webhook(db, event)
