"""System CRUD router for the algo_registry table (F46).

ADR-001 Tier 1: pure CRUD, single repository, zero business logic.
Internal base layer only — dashboard JS must NOT call these routes directly.
JS uses Experience tier (GET reads) and Workflow tier (POST/PATCH/DELETE writes).
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from rita.database import get_db
from rita.models.algo import AlgoModel
from rita.repositories.algo_repository import AlgoRepository
from rita.schemas.algo import AlgoCreate, AlgoOut, AlgoStatusUpdate

router = APIRouter(prefix="/api/v1", tags=["system:algos"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@router.get("/algos", response_model=list[AlgoOut], summary="List non-deleted algos (internal)")
def list_algos(db: Session = Depends(get_db)) -> list[AlgoOut]:
    rows = AlgoRepository(db).get_all_active()
    return [AlgoOut.model_validate(r) for r in rows]


@router.post("/algos", response_model=AlgoOut, status_code=status.HTTP_201_CREATED,
             summary="Register algo (internal)")
def create_algo(body: AlgoCreate, db: Session = Depends(get_db)) -> AlgoOut:
    now = _utcnow()
    row = AlgoModel(
        algo_id=str(uuid.uuid4()),
        name=body.name,
        algo_type=body.algo_type,
        setup_key=body.setup_key,
        instrument=body.instrument.upper(),
        status="paused",
        description=body.description,
        created_at=now,
        updated_at=now,
    )
    AlgoRepository(db).create(row)
    return AlgoOut.model_validate(row)


@router.patch("/algos/{algo_id}", response_model=AlgoOut, summary="Update algo status (internal)")
def update_algo_status(
    algo_id: str,
    body: AlgoStatusUpdate,
    db: Session = Depends(get_db),
) -> AlgoOut:
    row = AlgoRepository(db).update_status(algo_id, body.status)
    if row is None:
        raise HTTPException(status_code=404, detail=f"Algo '{algo_id}' not found")
    return AlgoOut.model_validate(row)


@router.delete("/algos/{algo_id}", status_code=status.HTTP_204_NO_CONTENT,
               summary="Soft-delete algo (internal)")
def delete_algo(algo_id: str, db: Session = Depends(get_db)) -> None:
    deleted = AlgoRepository(db).soft_delete(algo_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Algo '{algo_id}' not found")
