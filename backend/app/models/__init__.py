"""Imports every model module so `Base.metadata` knows all tables before `create_all`."""

from app.models import erp, guardian, knowledge, map3d, ops  # noqa: F401
