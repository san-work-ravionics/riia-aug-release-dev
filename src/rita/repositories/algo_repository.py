"""Repository for the algo_registry table (F46 — ADR-002).

All DB access for AlgoModel goes through this class.  No other code may
query or mutate algo_registry directly.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from rita.models.algo import AlgoModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AlgoRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    # ── reads ──────────────────────────────────────────────────────────────────

    def get_all_active(self) -> list[AlgoModel]:
        """All algos that have not been soft-deleted (status != 'deleted')."""
        return (
            self._db.query(AlgoModel)
            .filter(AlgoModel.status != "deleted")
            .order_by(AlgoModel.created_at.desc())
            .all()
        )

    def get_live(self) -> list[AlgoModel]:
        """Algos currently set to live status."""
        return (
            self._db.query(AlgoModel)
            .filter(AlgoModel.status == "live")
            .order_by(AlgoModel.created_at.desc())
            .all()
        )

    def find_by_id(self, algo_id: str) -> AlgoModel | None:
        return self._db.get(AlgoModel, algo_id)

    # ── writes ─────────────────────────────────────────────────────────────────

    def create(self, row: AlgoModel) -> AlgoModel:
        self._db.add(row)
        self._db.commit()
        self._db.refresh(row)
        return row

    def update_status(self, algo_id: str, status: str) -> AlgoModel | None:
        row = self._db.get(AlgoModel, algo_id)
        if row is None:
            return None
        row.status = status
        row.updated_at = _utcnow()
        self._db.commit()
        self._db.refresh(row)
        return row

    def soft_delete(self, algo_id: str) -> bool:
        row = self._db.get(AlgoModel, algo_id)
        if row is None:
            return False
        row.status = "deleted"
        row.updated_at = _utcnow()
        self._db.commit()
        return True
