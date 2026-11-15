"""F47 — Unit tests for GET /api/v1/experience/rita/algos/performance.

PATCH PATH ANALYSIS
-------------------
``AlgoRepository`` is imported INSIDE the handler function body at call time:

    from rita.repositories.algo_repository import AlgoRepository

Since the import is deferred to call time (not module-level), the correct
patch path is the SOURCE module attribute:

    rita.repositories.algo_repository.AlgoRepository

When the handler executes ``from rita.repositories.algo_repository import
AlgoRepository``, Python looks up ``AlgoRepository`` in sys.modules under
``rita.repositories.algo_repository``.  Patching the class there ensures the
handler receives the mock class.
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest  # noqa: F401 — pytest is used via fixture injection


# ---------------------------------------------------------------------------
# Helper — build a lightweight fake AlgoModel row
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
    algo = MagicMock()
    algo.algo_id = algo_id
    algo.name = name
    algo.algo_type = algo_type
    algo.instrument = instrument
    algo.status = status
    algo.setup_key = setup_key
    return algo


# ---------------------------------------------------------------------------
# Test class
# ---------------------------------------------------------------------------

class TestAlgosPerformanceEndpoint:
    """Unit tests for GET /api/v1/experience/rita/algos/performance."""

    URL = "/api/v1/experience/rita/algos/performance"
    _PATCH = "rita.repositories.algo_repository.AlgoRepository"

    # ── TC-01 happy_path ────────────────────────────────────────────────────

    def test_happy_path(self, client):
        """Two algos (1 ASTA paused, 1 DDQN live): response has correct structure.

        ASTA KPIs are null because no CSV exists in the test environment and
        the except-block silently absorbs the missing-file path.
        DDQN KPIs are null because no training_runs rows exist in the in-memory DB.
        The test validates field presence and aggregate counts, not KPI values.
        """
        asta_algo = _make_algo(
            algo_id="a1",
            name="GEO-PAN",
            algo_type="asta_setup",
            instrument="NIFTY",
            status="paused",
            setup_key="GEO",
        )
        ddqn_algo = _make_algo(
            algo_id="a2",
            name="DDQN-v2",
            algo_type="ddqn",
            instrument="NIFTY",
            status="live",
        )

        with patch(self._PATCH) as MockRepo:
            MockRepo.return_value.get_all_active.return_value = [asta_algo, ddqn_algo]
            response = client.get(self.URL)

        assert response.status_code == 200
        data = response.json()

        # Aggregate top-level fields
        assert data["total_algos"] == 2
        assert data["live_algos"] == 1          # only DDQN-v2 is live
        assert "avg_win_rate" in data           # null — no KPI data in test env
        assert "best_algo_name" in data
        assert "total_signals" in data

        # Per-algo list length and names
        assert len(data["algos"]) == 2
        names = {a["name"] for a in data["algos"]}
        assert names == {"GEO-PAN", "DDQN-v2"}

        # Every AlgoPerfSummaryItem has all 10 contract fields
        required_fields = (
            "algo_id", "name", "algo_type", "instrument", "status",
            "win_rate", "total_pts", "profit_factor", "signal_rate", "num_trades",
        )
        for item in data["algos"]:
            for field in required_fields:
                assert field in item, f"AlgoPerfSummaryItem missing field: {field}"

    # ── TC-02 empty_algos ───────────────────────────────────────────────────

    def test_empty_algos(self, client):
        """No algos registered — response is a zero-state payload."""
        with patch(self._PATCH) as MockRepo:
            MockRepo.return_value.get_all_active.return_value = []
            response = client.get(self.URL)

        assert response.status_code == 200
        data = response.json()
        assert data["total_algos"] == 0
        assert data["live_algos"] == 0
        assert data["algos"] == []
        assert data["total_signals"] == 0
        assert data["avg_win_rate"] is None
        assert data["best_algo_name"] is None

    # ── TC-03 ddqn_null_kpis ────────────────────────────────────────────────

    def test_ddqn_null_kpis(self, client):
        """Single DDQN algo: win_rate and profit_factor must be null in response.

        The endpoint explicitly keeps win_rate and profit_factor null for DDQN
        algos even when training_runs data exists (by design — trade-level data
        is unavailable for DDQN).  With an empty in-memory DB, the DDQN branch
        finds no training_runs rows and all KPIs stay null.
        """
        ddqn_algo = _make_algo(
            algo_id="d1",
            name="DDQN-nifty",
            algo_type="ddqn",
            instrument="NIFTY",
            status="live",
        )

        with patch(self._PATCH) as MockRepo:
            MockRepo.return_value.get_all_active.return_value = [ddqn_algo]
            response = client.get(self.URL)

        assert response.status_code == 200
        data = response.json()
        assert data["total_algos"] == 1
        item = data["algos"][0]
        assert item["win_rate"] is None, "DDQN win_rate must be null"
        assert item["profit_factor"] is None, "DDQN profit_factor must be null"

    # ── TC-04 instrument_filter ─────────────────────────────────────────────

    def test_instrument_filter(self, client):
        """?instrument=NIFTY: only NIFTY algos returned; BANKNIFTY algo excluded."""
        nifty_algo = _make_algo(
            algo_id="n1",
            name="NIFTY-ASTA",
            algo_type="asta_setup",
            instrument="NIFTY",
            status="live",
            setup_key="GEO",
        )
        bnf_algo = _make_algo(
            algo_id="b1",
            name="BNF-ASTA",
            algo_type="asta_setup",
            instrument="BANKNIFTY",
            status="live",
            setup_key="GEO",
        )

        with patch(self._PATCH) as MockRepo:
            MockRepo.return_value.get_all_active.return_value = [nifty_algo, bnf_algo]
            response = client.get(self.URL, params={"instrument": "NIFTY"})

        assert response.status_code == 200
        data = response.json()
        # Only 1 algo passes the instrument filter
        assert data["total_algos"] == 1
        assert len(data["algos"]) == 1
        assert data["algos"][0]["name"] == "NIFTY-ASTA"
        assert data["algos"][0]["instrument"] == "NIFTY"
        # live_algos counts live algos in the filtered set
        assert data["live_algos"] == 1
