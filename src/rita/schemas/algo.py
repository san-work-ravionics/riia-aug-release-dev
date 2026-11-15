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
    max_drawdown: float | None = None
    avg_win: float | None = None
    avg_loss: float | None = None
    max_consec_wins: float | None = None
    max_consec_losses: float | None = None


class AlgoPerformanceOut(BaseModel):
    kpis: AlgoKpisOut
    equity_curve: list[dict] = []
    signal_markers: list[dict] = []
    recent_signals: list[dict] = []
