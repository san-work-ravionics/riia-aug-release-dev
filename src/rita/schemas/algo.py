"""Pydantic schemas for the F46 Algo Page feature."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, model_validator


class AlgoCreate(BaseModel):
    name: str
    algo_type: Literal["asta_setup", "ddqn", "custom"]
    setup_key: str | None = None
    instrument: str
    description: str | None = None

    @model_validator(mode="after")
    def _setup_key_required_for_asta(self) -> "AlgoCreate":
        if self.algo_type == "asta_setup" and not self.setup_key:
            raise ValueError("setup_key is required when algo_type is 'asta_setup'")
        return self


class AlgoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    algo_id: str
    name: str
    algo_type: str
    setup_key: str | None = None
    instrument: str
    status: str
    description: str | None = None
    config_json: str | None = None
    created_at: datetime
    updated_at: datetime


class AlgoStatusUpdate(BaseModel):
    status: Literal["live", "paused"]


class AlgoSummaryOut(BaseModel):
    algo_id: str
    name: str
    instrument: str
    setup_key: str | None = None
    kpi_total_pts: float | None = None
    kpi_win_rate: float | None = None
    kpi_signal_rate: float | None = None


class AlgoKpisOut(BaseModel):
    win_rate: float | None = None
    total_pts: float | None = None
    profit_factor: float | None = None
    signal_rate: float | None = None
    avg_confidence: float | None = None
    avg_win: float | None = None
    avg_loss: float | None = None
    num_trades: int | None = None
    num_targets: int | None = None
    num_stops: int | None = None


class AlgoPerformanceOut(BaseModel):
    kpis: AlgoKpisOut
    equity_curve: list[dict] = []
    signal_markers: list[dict] = []
    recent_signals: list[dict] = []


# ── F47 — Algo Performance page (cross-strategy overview) ─────────────────────

class AlgoPerfSummaryItem(BaseModel):
    """Per-algo summary row for the Algo Performance cross-strategy overview."""

    algo_id: str
    name: str
    algo_type: str
    instrument: str
    status: str
    win_rate: float | None = None
    total_pts: float | None = None
    profit_factor: float | None = None
    signal_rate: float | None = None
    num_trades: int | None = None


class AlgosPerformanceListResponse(BaseModel):
    """Aggregate response for GET /api/v1/experience/rita/algos/performance."""

    total_algos: int
    live_algos: int
    avg_win_rate: float | None = None
    best_algo_name: str | None = None
    total_signals: int
    algos: list[AlgoPerfSummaryItem] = []


# ── F48 — Algo Check Now (live signal check) ──────────────────────────────────

class AlgoSignalOut(BaseModel):
    """Response for GET /experience/rita/algos/{algo_id}/signal (F48)."""

    algo_id: str
    name: str
    algo_type: str            # "asta_setup" | "ddqn" | "custom"
    instrument: str
    # ASTA fields
    signal: str | None = None         # "BUY" | "SELL" | None
    target: float | None = None       # target price
    stop_loss: float | None = None    # stop-loss price
    confidence: float | None = None   # 0.0–1.0
    # DDQN fields
    action: str | None = None         # "cash" | "half" | "full" | "hedged"
    allocation_pct: float | None = None  # 0 / 50 / 100
    # Shared
    close: float | None = None        # last bar close
    kite_ltp: float | None = None     # live Kite LTP — best-effort, None if Kite offline
    as_of: str | None = None          # ISO date of last bar checked
    message: str = ""                 # one-line summary
