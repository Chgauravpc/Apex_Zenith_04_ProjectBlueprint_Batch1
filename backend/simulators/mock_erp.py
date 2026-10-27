"""Mock ERP shaped like ERPNext's REST API, run as its own process:

    uvicorn simulators.mock_erp:app --port 8001

Only the slice Blueprint reads: `GET /api/resource/<DocType>` with ERPNext-style
`limit_start` / `limit_page_length` paging, answering `{"data": [...]}`. Record names
match the demo seed, plus a few records the seed does not have (a new joinee, open
work orders, a fresh QC reject), so a sync shows both updates and new rows.
"""

from datetime import date, timedelta
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException, Query

TODAY = date.today()

DOCS: Dict[str, List[Dict[str, Any]]] = {
    "Workstation": [
        {
            "name": "ERP-MC-VMC-3",
            "workstation_name": "VMC-3",
            "workstation_type": "VMC",
            "custom_rpm_min": 500,
            "custom_rpm_max": 12000,
            "custom_teeth": 2,
            "custom_location": "Bay A",
        },
        {
            "name": "ERP-MC-VMC-1",
            "workstation_name": "VMC-1",
            "workstation_type": "VMC",
            "custom_rpm_min": 500,
            "custom_rpm_max": 10000,
            "custom_teeth": 4,
            "custom_location": "Bay A",
        },
        {
            "name": "ERP-MC-Lathe-2",
            "workstation_name": "Lathe-2",
            "workstation_type": "CNC lathe",
            "custom_rpm_min": 50,
            "custom_rpm_max": 3000,
            "custom_teeth": 1,
            "custom_location": "Bay B",
        },
    ],
    "Employee": [
        {
            "name": "ERP-EMP-1001",
            "employee_name": "Ramesh Patil",
            "designation": "old_employee",
            "date_of_joining": "1998-06-01",
            "relieving_date": (TODAY + timedelta(days=213)).isoformat(),
        },
        {
            "name": "ERP-EMP-1002",
            "employee_name": "Suresh Jadhav",
            "designation": "old_employee",
            "date_of_joining": "2005-03-15",
            "relieving_date": None,
        },
        {
            "name": "ERP-EMP-2041",
            "employee_name": "Priya Shinde",
            "designation": "new_employee",
            "date_of_joining": (TODAY - timedelta(days=30)).isoformat(),
            "relieving_date": None,
        },
        {
            "name": "ERP-EMP-0007",
            "employee_name": "Anil Kulkarni",
            "designation": "supervisor",
            "date_of_joining": "2010-01-04",
            "relieving_date": None,
        },
        {
            "name": "ERP-EMP-2057",
            "employee_name": "Kavita More",
            "designation": "new_employee",
            "date_of_joining": (TODAY - timedelta(days=3)).isoformat(),
            "relieving_date": None,
        },
    ],
    "Work Order": [
        {
            "name": "ERP-WO-5001",
            "workstation": "ERP-MC-VMC-3",
            "production_item": "FL-101",
            "operation": "face milling",
            "employee": "ERP-EMP-2041",
            "qty": 40,
            "status": "Not Started",
        },
        {
            "name": "ERP-WO-5002",
            "workstation": "ERP-MC-Lathe-2",
            "production_item": "SH-220",
            "operation": "turning",
            "employee": "ERP-EMP-1002",
            "qty": 25,
            "status": "In Process",
        },
    ],
    "Quality Inspection": [
        {
            "name": "ERP-QC-011",
            "workstation": "ERP-MC-VMC-3",
            "item_code": "FL-101",
            "work_order": "ERP-WO-5001",
            "custom_defect": "chatter marks",
            "remarks": "Finish face wavy",
            "custom_qty": 2,
            "status": "Rejected",
        },
    ],
}

app = FastAPI(title="Mock ERP (ERPNext-shaped)")


@app.get("/api/resource/{doctype}")
def list_docs(
    doctype: str,
    limit_start: int = Query(0, ge=0),
    limit_page_length: int = Query(20, ge=1, le=500),
) -> Dict[str, List[Dict[str, Any]]]:
    """Page through one DocType, like ERPNext's `frappe.client.get_list` REST call."""
    if doctype not in DOCS:
        raise HTTPException(status_code=404, detail=f"DocType {doctype} not found")
    rows = DOCS[doctype]
    return {"data": rows[limit_start : limit_start + limit_page_length]}
