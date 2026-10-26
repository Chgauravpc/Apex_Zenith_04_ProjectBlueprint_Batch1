"""Imports every model module so `Base.metadata` knows all tables before `create_all`."""

from app.models import erp, guardian, guide, knowledge, map3d, ops, transfer  # noqa: F401
