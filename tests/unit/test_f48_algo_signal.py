"""Unit tests for F48 — GET /api/v1/experience/rita/algos/{algo_id}/signal.

Covers
------
a. 404 for unknown algo_id
b. ASTA CSV missing → signal=null, HTTP 200, message mentions csv unavailability
c. ASTA no matching setup_key → signal=null, HTTP 200
d. ASTA HOLD last-row passthrough → signal=HOLD, HTTP 200
e. ASTA BUY happy path → all ASTA fields populated
f. DDQN model not found → action=null, HTTP 200
g. Kite offline (raises) → kite_ltp=null, rest of response intact
h. Kite returns None → kite_ltp=null, no 500
i. Response schema contract: all 14 AlgoSignalOut fields present
j. Unsupported algo_type → HTTP 200, message contains "not supported"

PATCH PATH NOTES
----------------
AlgoRepository is imported inside the handler at call time:
    from rita.repositories.algo_repository import AlgoRepository
Correct patch path: rita.repositories.algo_repository.AlgoRepository

fetch_kite_quote is imported inside the handler:
    from rita.services.kite_middleware_client import fetch_kite_quote
Correct patch path: rita.services.kite_middleware_client.fetch_kite_quote

ModelArtifactRepository is imported inside the handler:
    from rita.repositories.model_artifact import ModelArtifactRepository
Correct patch path: rita.repositories.model_artifact.ModelArtifactRepository
"""
from __future__ import annotations

import uuid
from unittest.mock import MagicMock, patch

import pandas as pd
import pytest


# ── helpers ───────────────────────────────────────────────────────────────────

def _make_algo(
    algo_id: str | None = None,
    name: str = "Test Algo",
    algo_type: str = "asta_setup",
    setup_key: str | None = "geo_pan",
    instrument: str = "NIFTY",
    status: str = "live",
) -> MagicMock:
    """Return a MagicMock that quacks like an AlgoModel ORM row."""
    algo = MagicMock()
    algo.algo_id = algo_id or str(uuid.uuid4())
    algo.name = name
    algo.algo_type = algo_type
    algo.setup_key = setup_key
    algo.instrument = instrument
    algo.status = status
    return algo


def _asta_df(setup_key: str = "geo_pan", signal: str = "BUY") -> pd.DataFrame:
    """Return a minimal ASTA DataFrame for signal tests.

    One row representing the latest bar for the given setup_key.
    """
    dates = pd.to_datetime(["2026-11-15"])
    df = pd.DataFrame(
        {
            "Open": [22000.0],
            "High": [22200.0],
            "Low": [21900.0],
            "Close": [22100.0],
            "Volume": [1000],
            "asta_setup": [setup_key],
            "asta_signal": [signal],
            "asta_stop_loss": [21800.0],
            "asta_target": [22500.0],
            "asta_confidence": [0.72],
        },
        index=dates,
    )
    df.index.name = "Date"
    return df


# ── patch targets ─────────────────────────────────────────────────────────────

_ALGO_REPO = "rita.repositories.algo_repository.AlgoRepository"
_KITE = "rita.services.kite_middleware_client.fetch_kite_quote"
_MODEL_ARTIFACT_REPO = "rita.repositories.model_artifact.ModelArtifactRepository"


# ══════════════════════════════════════════════════════════════════════════════
# Test class
# ══════════════════════════════════════════════════════════════════════════════

class TestAlgoSignalEndpoint:
    """Unit tests for GET /api/v1/experience/rita/algos/{algo_id}/signal."""

    _URL = "/api/v1/experience/rita/algos/{algo_id}/signal"

    def _url(self, algo_id: str) -> str:
        return self._URL.format(algo_id=algo_id)

    # ── Edge case a: 404 for unknown algo_id ──────────────────────────────

    def test_unknown_algo_id_returns_404(self, client) -> None:
        """AlgoRepository.find_by_id returns None → HTTPException 404."""
        with patch(_ALGO_REPO) as MockRepo:
            MockRepo.return_value.find_by_id.return_value = None
            resp = client.get(self._url(str(uuid.uuid4())))
        assert resp.status_code == 404

    # ── Edge case b: ASTA CSV missing → 200 with signal=null ─────────────

    def test_asta_csv_missing_returns_200_signal_null(self, client) -> None:
        """ASTA algo, CSV file absent → HTTP 200, signal=null, message indicates unavailability."""
        algo = _make_algo(algo_type="asta_setup", setup_key="geo_pan", instrument="NIFTY")
        with patch(_ALGO_REPO) as MockRepo, \
             patch(_KITE, return_value=None), \
             patch("pathlib.Path.exists", return_value=False):
            MockRepo.return_value.find_by_id.return_value = algo
            resp = client.get(self._url(algo.algo_id))

        assert resp.status_code == 200
        body = resp.json()
        assert body["signal"] is None
        # message must be non-empty and mention the missing data
        assert body["message"]
        msg_lower = body["message"].lower()
        # handler sets: "No asta_labeled_dataset.csv for NIFTY"
        assert any(kw in msg_lower for kw in ("csv", "asta", "no", "not")), (
            f"Expected message to describe CSV unavailability, got: {body['message']!r}"
        )

    # ── Edge case c: ASTA no matching setup_key → signal=null ────────────

    def test_asta_no_matching_setup_key_signal_null(self, client) -> None:
        """ASTA algo whose setup_key has no rows in the CSV → signal=null, HTTP 200."""
        algo = _make_algo(algo_type="asta_setup", setup_key="nonexistent_key", instrument="NIFTY")
        df = _asta_df(setup_key="other_setup", signal="BUY")  # no rows match nonexistent_key

        with patch(_ALGO_REPO) as MockRepo, \
             patch(_KITE, return_value=None), \
             patch("pathlib.Path.exists", return_value=True), \
             patch("pandas.read_csv", return_value=df):
            MockRepo.return_value.find_by_id.return_value = algo
            resp = client.get(self._url(algo.algo_id))

        assert resp.status_code == 200
        body = resp.json()
        assert body["signal"] is None

    # ── Edge case d: ASTA HOLD passthrough ───────────────────────────────

    def test_asta_hold_signal_passthrough(self, client) -> None:
        """ASTA last-row signal is HOLD → signal='HOLD' passed through (not suppressed).

        Note: 'HOLD' is different from NaN/empty which the handler converts to None.
        """
        algo = _make_algo(algo_type="asta_setup", setup_key="geo_pan", instrument="NIFTY")
        df = _asta_df(setup_key="geo_pan", signal="HOLD")

        with patch(_ALGO_REPO) as MockRepo, \
             patch(_KITE, return_value=None), \
             patch("pathlib.Path.exists", return_value=True), \
             patch("pandas.read_csv", return_value=df):
            MockRepo.return_value.find_by_id.return_value = algo
            resp = client.get(self._url(algo.algo_id))

        assert resp.status_code == 200
        body = resp.json()
        # HOLD is a string value — handler passes it through as-is
        assert body["signal"] == "HOLD"

    # ── Edge case e: ASTA BUY happy path ─────────────────────────────────

    def test_asta_buy_signal_all_fields_populated(self, client) -> None:
        """ASTA BUY: signal/target/stop_loss/confidence/close/as_of all set, action=null."""
        algo = _make_algo(
            algo_id="asta-buy-01",
            name="GEO-PAN ASTA",
            algo_type="asta_setup",
            setup_key="geo_pan",
            instrument="NIFTY",
        )
        df = _asta_df(setup_key="geo_pan", signal="BUY")

        with patch(_ALGO_REPO) as MockRepo, \
             patch(_KITE, return_value={"ltp": 22150.0}), \
             patch("pathlib.Path.exists", return_value=True), \
             patch("pandas.read_csv", return_value=df):
            MockRepo.return_value.find_by_id.return_value = algo
            resp = client.get(self._url(algo.algo_id))

        assert resp.status_code == 200
        body = resp.json()
        assert body["signal"] == "BUY"
        assert body["target"] == pytest.approx(22500.0, abs=0.01)
        assert body["stop_loss"] == pytest.approx(21800.0, abs=0.01)
        assert body["confidence"] == pytest.approx(0.72, abs=0.001)
        assert body["close"] == pytest.approx(22100.0, abs=0.01)
        assert body["as_of"] == "2026-11-15"
        assert body["kite_ltp"] == pytest.approx(22150.0, abs=0.01)
        # DDQN-only fields must be null for ASTA algo
        assert body["action"] is None
        assert body["allocation_pct"] is None

    # ── Edge case f: DDQN model not found → action=null ──────────────────

    def test_ddqn_model_not_found_returns_200_action_null(self, client) -> None:
        """DDQN algo, artifact_repo.find() returns None → HTTP 200, action=null.

        Base config has model_lineages set, so the handler reaches find() — we
        mock find() to return None to exercise the 'No model found' branch.
        """
        algo = _make_algo(algo_type="ddqn", setup_key=None, instrument="NIFTY")

        mock_artifact_repo = MagicMock()
        mock_artifact_repo.find.return_value = None  # no model zip on disk

        with patch(_ALGO_REPO) as MockRepo, \
             patch(_KITE, return_value=None), \
             patch(_MODEL_ARTIFACT_REPO) as MockArtifact:
            MockRepo.return_value.find_by_id.return_value = algo
            MockArtifact.from_settings.return_value = mock_artifact_repo
            resp = client.get(self._url(algo.algo_id))

        assert resp.status_code == 200
        body = resp.json()
        assert body["action"] is None
        assert body["message"]  # non-empty; handler sets "No model found for NIFTY"

    def test_ddqn_exception_returns_200_action_null(self, client) -> None:
        """DDQN algo, artifact_repo raises → except block → action=null, HTTP 200, no 500."""
        algo = _make_algo(algo_type="ddqn", setup_key=None, instrument="NIFTY")

        with patch(_ALGO_REPO) as MockRepo, \
             patch(_KITE, return_value=None), \
             patch(_MODEL_ARTIFACT_REPO) as MockArtifact:
            MockRepo.return_value.find_by_id.return_value = algo
            MockArtifact.from_settings.side_effect = RuntimeError("model storage unavailable")
            resp = client.get(self._url(algo.algo_id))

        assert resp.status_code == 200
        body = resp.json()
        assert body["action"] is None
        assert "ddqn" in body["message"].lower() or "compute" in body["message"].lower()

    # ── Edge case g: Kite offline (raises) ───────────────────────────────

    def test_kite_offline_raises_ltp_null_rest_intact(self, client) -> None:
        """fetch_kite_quote raises ConnectionError → kite_ltp=null; algo identity fields intact."""
        algo = _make_algo(
            algo_id="kite-test-01",
            name="Kite Test Algo",
            algo_type="asta_setup",
            setup_key="geo_pan",
            instrument="NIFTY",
        )
        df = _asta_df(setup_key="geo_pan", signal="BUY")

        with patch(_ALGO_REPO) as MockRepo, \
             patch(_KITE, side_effect=ConnectionError("port 8001 offline")), \
             patch("pathlib.Path.exists", return_value=True), \
             patch("pandas.read_csv", return_value=df):
            MockRepo.return_value.find_by_id.return_value = algo
            resp = client.get(self._url(algo.algo_id))

        assert resp.status_code == 200
        body = resp.json()
        assert body["kite_ltp"] is None
        # Identity fields must still be present and correct
        assert body["algo_id"] == "kite-test-01"
        assert body["name"] == "Kite Test Algo"
        assert body["instrument"] == "NIFTY"
        # Signal fields still populated from CSV
        assert body["signal"] == "BUY"

    # ── Edge case h: Kite returns None ───────────────────────────────────

    def test_kite_returns_none_ltp_null(self, client) -> None:
        """fetch_kite_quote returns None (middleware running but no quote) → kite_ltp=null."""
        algo = _make_algo(algo_type="asta_setup", setup_key="geo_pan", instrument="NIFTY")
        df = _asta_df(setup_key="geo_pan", signal="BUY")

        with patch(_ALGO_REPO) as MockRepo, \
             patch(_KITE, return_value=None), \
             patch("pathlib.Path.exists", return_value=True), \
             patch("pandas.read_csv", return_value=df):
            MockRepo.return_value.find_by_id.return_value = algo
            resp = client.get(self._url(algo.algo_id))

        assert resp.status_code == 200
        assert resp.json()["kite_ltp"] is None

    # ── Edge case i: Response schema contract ────────────────────────────

    def test_response_schema_all_14_fields_present(self, client) -> None:
        """AlgoSignalOut contract: all 14 expected fields must be present in response JSON."""
        algo = _make_algo(
            algo_id="schema-test",
            name="Schema Check",
            algo_type="asta_setup",
            setup_key="geo_pan",
            instrument="BANKNIFTY",
        )
        df = _asta_df(setup_key="geo_pan", signal="SELL")

        with patch(_ALGO_REPO) as MockRepo, \
             patch(_KITE, return_value={"ltp": 47000.0}), \
             patch("pathlib.Path.exists", return_value=True), \
             patch("pandas.read_csv", return_value=df):
            MockRepo.return_value.find_by_id.return_value = algo
            resp = client.get(self._url(algo.algo_id))

        assert resp.status_code == 200
        body = resp.json()

        # All 14 AlgoSignalOut fields (algo_id, name, algo_type, instrument are identity;
        # signal/target/stop_loss/confidence are ASTA; action/allocation_pct are DDQN;
        # close/kite_ltp/as_of/message are shared)
        required_fields = (
            "algo_id", "name", "algo_type", "instrument",
            "signal", "target", "stop_loss", "confidence",
            "action", "allocation_pct",
            "close", "kite_ltp", "as_of", "message",
        )
        for field in required_fields:
            assert field in body, f"AlgoSignalOut missing field: {field!r}"

        # Field type checks for identity fields
        assert isinstance(body["algo_id"], str)
        assert isinstance(body["name"], str)
        assert isinstance(body["algo_type"], str)
        assert isinstance(body["instrument"], str)
        assert isinstance(body["message"], str)

    def test_response_schema_field_types_nullable(self, client) -> None:
        """Nullable fields accept None when data is unavailable (CSV missing path)."""
        algo = _make_algo(algo_type="asta_setup", setup_key="geo_pan", instrument="NIFTY")

        with patch(_ALGO_REPO) as MockRepo, \
             patch(_KITE, return_value=None), \
             patch("pathlib.Path.exists", return_value=False):
            MockRepo.return_value.find_by_id.return_value = algo
            resp = client.get(self._url(algo.algo_id))

        assert resp.status_code == 200
        body = resp.json()
        # All nullable fields must accept None
        for nullable_field in ("signal", "target", "stop_loss", "confidence",
                                "action", "allocation_pct", "close", "kite_ltp", "as_of"):
            assert body[nullable_field] is None, (
                f"Field {nullable_field!r} expected None when no data, got {body[nullable_field]!r}"
            )

    # ── Edge case j: Unsupported algo_type ───────────────────────────────

    def test_unsupported_algo_type_200_with_message(self, client) -> None:
        """Unknown algo_type (e.g. 'custom_ml') → HTTP 200, message contains 'not supported'."""
        algo = _make_algo(algo_type="custom_ml", setup_key=None, instrument="NIFTY")

        with patch(_ALGO_REPO) as MockRepo, \
             patch(_KITE, return_value=None):
            MockRepo.return_value.find_by_id.return_value = algo
            resp = client.get(self._url(algo.algo_id))

        assert resp.status_code == 200
        body = resp.json()
        assert "not supported" in body["message"].lower(), (
            f"Expected 'not supported' in message, got: {body['message']!r}"
        )
        # Both ASTA and DDQN fields must be null
        assert body["signal"] is None
        assert body["action"] is None
