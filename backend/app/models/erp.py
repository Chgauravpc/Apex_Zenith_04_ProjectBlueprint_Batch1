"""Tables mirrored from the ERP (system of record).

Every table carries `external_id` = the ERP's own key, so `sync_erp()` can
upsert by it and running a sync twice never creates duplicates.
"""

from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base, IdMixin, fk

# Employee roles. "old"/"new" describe experience, not age or rank.
ROLE_OLD = "old_employee"
ROLE_NEW = "new_employee"
ROLE_SUPERVISOR = "supervisor"


class Machine(IdMixin, Base):
    __tablename__ = "machines"

    external_id: Mapped[Optional[str]] = mapped_column(String(64), unique=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    type: Mapped[str] = mapped_column(String(40))  # VMC, lathe, ...
    rpm_min: Mapped[int] = mapped_column(Integer, default=0)
    rpm_max: Mapped[int] = mapped_column(Integer)
    teeth: Mapped[int] = mapped_column(Integer, default=2)  # default cutter teeth for chatter maths
    location: Mapped[Optional[str]] = mapped_column(String(80))


class Material(IdMixin, Base):
    __tablename__ = "materials"

    external_id: Mapped[Optional[str]] = mapped_column(String(64), unique=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)  # SS304, EN8, Al6061
    category: Mapped[Optional[str]] = mapped_column(String(40))  # stainless, steel, aluminium


class Part(IdMixin, Base):
    __tablename__ = "parts"

    external_id: Mapped[Optional[str]] = mapped_column(String(64), unique=True)
    number: Mapped[str] = mapped_column(String(64), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    material_id: Mapped[Optional[int]] = fk("materials.id")


class Tool(IdMixin, Base):
    __tablename__ = "tools"

    external_id: Mapped[Optional[str]] = mapped_column(String(64), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    tool_material: Mapped[str] = mapped_column(String(20))  # HSS / carbide
    teeth: Mapped[int] = mapped_column(Integer, default=2)
    diameter_mm: Mapped[Optional[float]] = mapped_column(Float)


class Operation(IdMixin, Base):
    __tablename__ = "operations"

    external_id: Mapped[Optional[str]] = mapped_column(String(64), unique=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)  # facing, pocket milling, ...


class Employee(IdMixin, Base):
    __tablename__ = "employees"

    external_id: Mapped[Optional[str]] = mapped_column(String(64), unique=True)
    name: Mapped[str] = mapped_column(String(80))
    role: Mapped[str] = mapped_column(String(20), index=True)  # ROLE_* constants
    language: Mapped[str] = mapped_column(String(8), default="hi")
    join_date: Mapped[Optional[date]] = mapped_column(Date)
    exit_date: Mapped[Optional[date]] = mapped_column(Date, index=True)


class WorkOrder(IdMixin, Base):
    __tablename__ = "work_orders"

    external_id: Mapped[Optional[str]] = mapped_column(String(64), unique=True)
    machine_id: Mapped[int] = fk("machines.id", nullable=False)
    part_id: Mapped[Optional[int]] = fk("parts.id")
    operation_id: Mapped[Optional[int]] = fk("operations.id")
    employee_id: Mapped[Optional[int]] = fk("employees.id")
    tool_id: Mapped[Optional[int]] = fk("tools.id")
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(20), default="open", index=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)


class QCReject(IdMixin, Base):
    __tablename__ = "qc_rejects"

    external_id: Mapped[Optional[str]] = mapped_column(String(64), unique=True)
    machine_id: Mapped[int] = fk("machines.id", nullable=False)
    work_order_id: Mapped[Optional[int]] = fk("work_orders.id")
    part_id: Mapped[Optional[int]] = fk("parts.id")
    defect: Mapped[str] = mapped_column(String(80))  # chatter marks, burr, oversize ...
    cause: Mapped[Optional[str]] = mapped_column(Text)
    quantity: Mapped[int] = mapped_column(Integer, default=1)


class Maintenance(IdMixin, Base):
    __tablename__ = "maintenance"

    external_id: Mapped[Optional[str]] = mapped_column(String(64), unique=True)
    machine_id: Mapped[int] = fk("machines.id", nullable=False)
    component_id: Mapped[Optional[int]] = fk("components.id")
    kind: Mapped[str] = mapped_column(String(20), index=True)  # preventive / breakdown
    description: Mapped[str] = mapped_column(Text)
    interval_days: Mapped[Optional[int]] = mapped_column(Integer)  # for preventive tasks
    done_on: Mapped[date] = mapped_column(Date, index=True)
    done_by_id: Mapped[Optional[int]] = fk("employees.id")
