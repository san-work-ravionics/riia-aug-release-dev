"""ORM model for the F46 algo_registry table."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, String

from rita.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AlgoModel(Base):
    __tablename__ = "algo_registry"

    algo_id = Column(String, primary_key=True)          # uuid4
    name = Column(String, nullable=False)
    algo_type = Column(String, nullable=False)           # "asta_setup" | "ddqn" | "custom"
    setup_key = Column(String, nullable=True)
    instrument = Column(String, nullable=False)
    status = Column(String, nullable=False, default="paused")  # "live" | "paused" | "deleted"
    description = Column(String, nullable=True)
    config_json = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=_utcnow)
    updated_at = Column(DateTime, nullable=False, default=_utcnow)
