"""Imports every model module so `Base.metadata` knows all tables before `create_all`."""

from app.models import erp, knowledge, map3d  # noqa: F401
