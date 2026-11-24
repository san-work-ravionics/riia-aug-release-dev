"""F50 — QA unit tests for DS mobile Algo screen contract.

Verifies that GET /api/v1/experience/rita/algos/performance returns every
field that ``dashboard/js/ds/algo-performance.js`` reads.

PATCH PATH
----------
``AlgoRepository`` is imported inside the handler body at call time:

    from rita.repositories.algo_repository import AlgoRepository

Patching the source-module attribute is therefore required:

    rita.repositories.algo_repository.AlgoRepository

API-FRONTEND CONTRACT UNDER TEST
---------------------------------
Schema (AlgosPerformanceListResponse):
    total_algos, live_algos, avg_win_rate, best_algo_name, total_signals, algos

Schema (AlgoPerfSummaryItem):
    algo_id, name, algo_type, instrument, status,
    win_rate, total_pts, profit_factor, signal_rate, num_trades

JS reads (algo-performance.js):
    data.total_algos, data.live_algos, data.avg_win_rate, data.best_algo_name,
    data.total_signals, data.algos,
    a.name, a.algo_type, a.instrument, a.status, a.win_rate,
    a.total_pts, a.profit_factor, a.signal_rate, a.num_trades
    (a.algo_id is defined in the schema but advisory A1 notes it is not yet
    attached to <tr data-id>; the field is still present in the payload)
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest  # noqa: F401 — used via fixture injection


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_URL = "/api/v1/experience/rita/algos/performance"
_PATCH = "rita.repositories.algo_repository.AlgoRepository"

# All top-level fields AlgosPerformanceListResponse must expose
_TOP_LEVEL_FIELDS = ("total_algos", "live_algos", "avg_win_rate", "best_algo_name",
                     "total_signals", "algos")

# All per-algo fields AlgoPerfSummaryItem must expose (what JS reads)
_ITEM_FIELDS = ("algo_id", "name", "algo_type", "instrument", "status",
                "win_rate", "total_pts", "profit_factor", "signal_rate", "num_trades")


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def _make_algo(
    algo_id: str = "a1",
    name: str = "Test Algo",
    algo_type: str = "ddqn",
    instrument: str = "NIFTY",
    status: str = "live",
    setup_key: str | None = None,
) -> MagicMock:
    """Return a MagicMock that quacks like an AlgoModel ORM row."""
    m = MagicMock()
    m.algo_id = algo_id
    m.name = name
    m.algo_type = algo_type
    m.instrument = instrument
    m.status = status
    m.setup_key = setup_key
    return m


# ---------------------------------------------------------------------------
# TC-01  happy path — two algos (one live, one paused)
# ---------------------------------------------------------------------------

class TestAlgosPerformanceMobileHappyPath:
    """TC-01: Two algos returned — verify full response shape consumed by mobile JS."""

    def test_happy_path_two_algos_response_shape(self, client):
        """Two algos (live DDQN + paused DDQN) — all response keys present.

        KPIs are null because there are no training_runs rows in the in-memory
        DB; the test validates field presence and counts, not KPI values.
        """
        live_algo = _make_algo(algo_id="a1", name="DDQN-Live", algo_type="ddqn",
                               instrument="NIFTY", status="live")
        paused_algo = _make_algo(algo_id="a2", name="DDQN-Paused", algo_type="ddqn",
                                 instrument="NIFTY", status="paused")

        with patch(_PATCH) as MockRepo:
            MockRepo.return_value.get_all_active.return_value = [live_algo, paused_algo]
            resp = client.get(_URL)

        assert resp.status_code == 200
        data = resp.json()

        # ── top-level fields (AlgosPerformanceListResponse) ──────────────────
        for field in _TOP_LEVEL_FIELDS:
            assert field in data, f"Response missing top-level field: {field}"

        assert data["total_algos"] == 2, "total_algos should be 2"
        assert data["live_algos"] == 1, "live_algos should be 1 (only DDQN-Live)"
        assert isinstance(data["algos"], list)
        assert len(data["algos"]) == 2

        # ── per-algo fields (AlgoPerfSummaryItem) — what algo-performance.js reads
        for item in data["algos"]:
            for field in _ITEM_FIELDS:
                assert field in item, f"AlgoPerfSummaryItem missing field: {field}"

        # ── verify status values are correct (used for live/paused badge in JS)
        statuses = {a["status"] for a in data["algos"]}
        assert statuses == {"live", "paused"}

    def test_happy_path_names_match(self, client):
        """Names returned in algos list match what was registered."""
        live_algo = _make_algo(algo_id="a1", name="DDQN-Live", status="live")
        paused_algo = _make_algo(algo_id="a2", name="DDQN-Paused", status="paused")

        with patch(_PATCH) as MockRepo:
            MockRepo.return_value.get_all_active.return_value = [live_algo, paused_algo]
            resp = client.get(_URL)

        data = resp.json()
        names = {a["name"] for a in data["algos"]}
        assert "DDQN-Live" in names
        assert "DDQN-Paused" in names


# ---------------------------------------------------------------------------
# TC-02  edge case — empty algos list
# ---------------------------------------------------------------------------

class TestAlgosPerformanceMobileEmpty:
    """TC-02: No algos registered — zero-state payload with all keys present."""

    def test_empty_algos_list(self, client):
        """Empty algo list — all top-level fields must still be present and correct.

        algo-performance.js reads ``data.total_algos`` and ``data.algos`` even
        in the empty state to decide whether to render the "No algos registered"
        row. The contract must hold regardless of data presence.
        """
        with patch(_PATCH) as MockRepo:
            MockRepo.return_value.get_all_active.return_value = []
            resp = client.get(_URL)

        assert resp.status_code == 200
        data = resp.json()

        # All top-level fields must be present even when algos = []
        for field in _TOP_LEVEL_FIELDS:
            assert field in data, f"Empty-state response missing field: {field}"

        assert data["total_algos"] == 0, "total_algos must be 0"
        assert data["live_algos"] == 0, "live_algos must be 0"
        assert data["algos"] == [], "algos must be empty list"
        assert data["total_signals"] == 0, "total_signals must be 0"
        # avg_win_rate and best_algo_name should be null — not missing
        assert data["avg_win_rate"] is None, "avg_win_rate must be null when no algos"
        assert data["best_algo_name"] is None, "best_algo_name must be null when no algos"


# ---------------------------------------------------------------------------
# TC-03  edge case — null metric fields
# ---------------------------------------------------------------------------

class TestAlgosPerformanceMobileNullMetrics:
    """TC-03: Single algo with no KPI data — null fields allowed in schema."""

    def test_null_kpi_fields_allowed(self, client):
        """Single DDQN algo with no training data: win_rate, total_pts, etc. must
        be null (not absent) so that algo-performance.js null-coalescing works:
        ``(a.win_rate != null ? fmtPctAbs(a.win_rate) : '—')``.
        """
        algo = _make_algo(algo_id="d1", name="DDQN-nifty", algo_type="ddqn",
                          instrument="NIFTY", status="live")

        with patch(_PATCH) as MockRepo:
            MockRepo.return_value.get_all_active.return_value = [algo]
            resp = client.get(_URL)

        assert resp.status_code == 200
        data = resp.json()

        assert data["total_algos"] == 1
        item = data["algos"][0]

        # Nullable metric fields must be null, not absent — JS reads them directly
        nullable_item_fields = ("win_rate", "total_pts", "profit_factor",
                                "signal_rate", "num_trades")
        for field in nullable_item_fields:
            assert field in item, f"Nullable field '{field}' absent from item"
            # For DDQN with no training data, these should be null
            assert item[field] is None, (
                f"Field '{field}' should be null for DDQN algo with no training data"
            )

        # Top-level nullable fields
        assert "avg_win_rate" in data, "avg_win_rate must be present"
        assert "best_algo_name" in data, "best_algo_name must be present"
        # With null win_rates, avg_win_rate and best_algo_name should be null
        assert data["avg_win_rate"] is None, (
            "avg_win_rate must be null when all algos have null win_rate"
        )
        assert data["best_algo_name"] is None, (
            "best_algo_name must be null when no algo has a win_rate"
        )

    def test_total_signals_zero_when_num_trades_null(self, client):
        """total_signals = sum(num_trades): null num_trades excluded from sum → 0."""
        algo = _make_algo(algo_id="d1", name="DDQN-nifty", algo_type="ddqn",
                          instrument="NIFTY", status="live")

        with patch(_PATCH) as MockRepo:
            MockRepo.return_value.get_all_active.return_value = [algo]
            resp = client.get(_URL)

        data = resp.json()
        assert data["total_signals"] == 0, (
            "total_signals must be 0 when all algos have null num_trades"
        )
