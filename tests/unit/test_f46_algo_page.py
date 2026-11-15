"""Unit tests for F46 — Algo Page feature.

Covers
------
1. Schema validation — AlgoCreate, AlgoKpisOut field contract
2. AlgoRepository — CRUD operations (in-memory SQLite via db_session fixture)
3. Workflow API — POST / PATCH / DELETE /api/v1/workflow/algos
4. System API  — GET /api/v1/algos (list)
5. Experience API — GET /api/v1/experience/rita/algo-performance
   KPI computation tested with a synthetic CSV (mocked pd.read_csv + Path.exists)
   verifying the new num_trades / num_targets / num_stops fields.

All rita.* imports are deferred to inside test functions per project convention.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from unittest.mock import patch

import pandas as pd
import pytest


# ── helpers ───────────────────────────────────────────────────────────────────

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _make_algo_model(
    *,
    algo_id: str | None = None,
    name: str = "Test Algo",
    algo_type: str = "asta_setup",
    setup_key: str | None = "smm_double_screen",
    instrument: str = "NIFTY",
    status: str = "paused",
):
    from rita.models.algo import AlgoModel

    now = _utcnow()
    return AlgoModel(
        algo_id=algo_id or str(uuid.uuid4()),
        name=name,
        algo_type=algo_type,
        setup_key=setup_key,
        instrument=instrument,
        status=status,
        created_at=now,
        updated_at=now,
    )


def _synthetic_csv(setup_key: str = "test_setup") -> pd.DataFrame:
    """Return a minimal asta_labeled_dataset DataFrame for KPI computation tests.

    Two resolved trades:
      Trade 1 — BUY at Close=100, SL=95, target=110; next-bar High=115 → target hit (+10 pts)
      Trade 2 — BUY at Close=200, SL=190, target=220; next-bar Low=185  → stopped  (-10 pts)

    Expected KPIs: num_trades=2, num_targets=1, num_stops=1,
                   win_rate=50.0, total_pts=0.0, avg_win=10.0, avg_loss=-10.0
    """
    dates = pd.to_datetime(
        ["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04"]
    )
    df = pd.DataFrame(
        {
            "Open":  [100.0, 104.0, 200.0, 199.0],
            "High":  [102.0, 115.0, 202.0, 202.0],  # row1 High>=110 → trade1 target
            "Low":   [ 98.0, 104.0, 198.0, 185.0],  # row3 Low<=190  → trade2 stop
            "Close": [100.0, 108.0, 200.0, 190.0],
            "Volume":[1000,  1000,  1000,  1000 ],
            "asta_setup":      [setup_key, "none", setup_key, "none"],
            "asta_signal":     ["BUY",     "",     "BUY",     ""    ],
            "asta_stop_loss":  [95.0,      None,   190.0,     None  ],
            "asta_target":     [110.0,     None,   220.0,     None  ],
            "asta_confidence": [0.70,      None,   0.80,      None  ],
        },
        index=dates,
    )
    df.index.name = "Date"
    return df


# ══════════════════════════════════════════════════════════════════════════════
# 1. Schema tests
# ══════════════════════════════════════════════════════════════════════════════

def test_algo_create_requires_setup_key_for_asta() -> None:
    from pydantic import ValidationError
    from rita.schemas.algo import AlgoCreate

    with pytest.raises(ValidationError):
        AlgoCreate(name="X", algo_type="asta_setup", instrument="NIFTY")


def test_algo_create_ddqn_no_setup_key_ok() -> None:
    from rita.schemas.algo import AlgoCreate

    obj = AlgoCreate(name="DDQN v1", algo_type="ddqn", instrument="NIFTY")
    assert obj.setup_key is None


def test_algo_create_asta_with_setup_key_ok() -> None:
    from rita.schemas.algo import AlgoCreate

    obj = AlgoCreate(
        name="Triple Screen", algo_type="asta_setup",
        setup_key="triple_screen", instrument="NIFTY",
    )
    assert obj.setup_key == "triple_screen"


def test_algo_kpis_out_has_new_fields() -> None:
    """AlgoKpisOut must expose num_trades/num_targets/num_stops; must NOT have max_drawdown."""
    from rita.schemas.algo import AlgoKpisOut

    kpis = AlgoKpisOut(num_trades=5, num_targets=3, num_stops=2)
    assert kpis.num_trades == 5
    assert kpis.num_targets == 3
    assert kpis.num_stops == 2
    assert not hasattr(kpis, "max_drawdown"), "max_drawdown was removed in this sprint"


def test_algo_kpis_out_defaults_none() -> None:
    from rita.schemas.algo import AlgoKpisOut

    kpis = AlgoKpisOut()
    assert kpis.win_rate is None
    assert kpis.num_trades is None
    assert kpis.num_stops is None


# ══════════════════════════════════════════════════════════════════════════════
# 2. Repository tests
# ══════════════════════════════════════════════════════════════════════════════

def test_repo_create_and_find(db_session) -> None:
    from rita.repositories.algo_repository import AlgoRepository

    repo = AlgoRepository(db_session)
    row = _make_algo_model(name="Algo A")
    repo.create(row)

    found = repo.find_by_id(row.algo_id)
    assert found is not None
    assert found.name == "Algo A"
    assert found.status == "paused"


def test_repo_find_missing_returns_none(db_session) -> None:
    from rita.repositories.algo_repository import AlgoRepository

    result = AlgoRepository(db_session).find_by_id(str(uuid.uuid4()))
    assert result is None


def test_repo_get_all_active_excludes_deleted(db_session) -> None:
    from rita.repositories.algo_repository import AlgoRepository

    repo = AlgoRepository(db_session)
    repo.create(_make_algo_model(name="Active"))
    deleted_row = _make_algo_model(name="Deleted", status="deleted")
    repo.create(deleted_row)

    active = repo.get_all_active()
    names = [r.name for r in active]
    assert "Active" in names
    assert "Deleted" not in names


def test_repo_get_live(db_session) -> None:
    from rita.repositories.algo_repository import AlgoRepository

    repo = AlgoRepository(db_session)
    repo.create(_make_algo_model(name="Paused One", status="paused"))
    repo.create(_make_algo_model(name="Live One",   status="live"))

    live = repo.get_live()
    assert len(live) == 1
    assert live[0].name == "Live One"


def test_repo_update_status(db_session) -> None:
    from rita.repositories.algo_repository import AlgoRepository

    repo = AlgoRepository(db_session)
    row = _make_algo_model()
    repo.create(row)

    updated = repo.update_status(row.algo_id, "live")
    assert updated is not None
    assert updated.status == "live"


def test_repo_soft_delete(db_session) -> None:
    from rita.repositories.algo_repository import AlgoRepository

    repo = AlgoRepository(db_session)
    row = _make_algo_model()
    repo.create(row)

    ok = repo.soft_delete(row.algo_id)
    assert ok is True
    assert repo.find_by_id(row.algo_id).status == "deleted"


def test_repo_soft_delete_missing_returns_false(db_session) -> None:
    from rita.repositories.algo_repository import AlgoRepository

    result = AlgoRepository(db_session).soft_delete(str(uuid.uuid4()))
    assert result is False


# ══════════════════════════════════════════════════════════════════════════════
# 3. Workflow API tests
# ══════════════════════════════════════════════════════════════════════════════

def test_workflow_create_algo(client) -> None:
    resp = client.post(
        "/api/v1/workflow/algos",
        json={"name": "My Setup", "algo_type": "asta_setup",
              "setup_key": "triple_screen", "instrument": "NIFTY"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "paused"
    assert body["instrument"] == "NIFTY"
    assert "algo_id" in body


def test_workflow_create_missing_setup_key_422(client) -> None:
    resp = client.post(
        "/api/v1/workflow/algos",
        json={"name": "Bad", "algo_type": "asta_setup", "instrument": "NIFTY"},
    )
    assert resp.status_code == 422


def test_workflow_patch_status(client) -> None:
    create = client.post(
        "/api/v1/workflow/algos",
        json={"name": "Patchable", "algo_type": "ddqn", "instrument": "BANKNIFTY"},
    )
    algo_id = create.json()["algo_id"]

    patch_resp = client.patch(
        f"/api/v1/workflow/algos/{algo_id}",
        json={"status": "live"},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["status"] == "live"


def test_workflow_patch_missing_404(client) -> None:
    resp = client.patch(
        f"/api/v1/workflow/algos/{uuid.uuid4()}",
        json={"status": "live"},
    )
    assert resp.status_code == 404


def test_workflow_delete_algo(client) -> None:
    create = client.post(
        "/api/v1/workflow/algos",
        json={"name": "ToDelete", "algo_type": "ddqn", "instrument": "NIFTY"},
    )
    algo_id = create.json()["algo_id"]

    del_resp = client.delete(f"/api/v1/workflow/algos/{algo_id}")
    assert del_resp.status_code == 204


def test_workflow_delete_missing_404(client) -> None:
    resp = client.delete(f"/api/v1/workflow/algos/{uuid.uuid4()}")
    assert resp.status_code == 404


# ══════════════════════════════════════════════════════════════════════════════
# 4. System API tests
# ══════════════════════════════════════════════════════════════════════════════

def test_system_list_algos(client) -> None:
    client.post(
        "/api/v1/workflow/algos",
        json={"name": "A", "algo_type": "ddqn", "instrument": "NIFTY"},
    )
    client.post(
        "/api/v1/workflow/algos",
        json={"name": "B", "algo_type": "ddqn", "instrument": "NIFTY"},
    )
    resp = client.get("/api/v1/algos")
    assert resp.status_code == 200
    names = [r["name"] for r in resp.json()]
    assert "A" in names
    assert "B" in names


def test_system_list_excludes_deleted(client) -> None:
    create = client.post(
        "/api/v1/workflow/algos",
        json={"name": "Gone", "algo_type": "ddqn", "instrument": "NIFTY"},
    )
    algo_id = create.json()["algo_id"]
    client.delete(f"/api/v1/workflow/algos/{algo_id}")

    resp = client.get("/api/v1/algos")
    names = [r["name"] for r in resp.json()]
    assert "Gone" not in names


# ══════════════════════════════════════════════════════════════════════════════
# 5. Experience API — algo-performance KPI computation
# ══════════════════════════════════════════════════════════════════════════════

def _register_algo(client, *, setup_key: str = "test_setup") -> str:
    resp = client.post(
        "/api/v1/workflow/algos",
        json={"name": "KPI Test Algo", "algo_type": "asta_setup",
              "setup_key": setup_key, "instrument": "NIFTY"},
    )
    assert resp.status_code == 201
    return resp.json()["algo_id"]


def test_perf_missing_algo_404(client) -> None:
    resp = client.get(f"/api/v1/experience/rita/algo-performance?algo_id={uuid.uuid4()}")
    assert resp.status_code == 404


def test_perf_csv_not_found_404(client) -> None:
    algo_id = _register_algo(client, setup_key="test_setup")
    with patch("pathlib.Path.exists", return_value=False):
        resp = client.get(
            f"/api/v1/experience/rita/algo-performance?algo_id={algo_id}"
        )
    assert resp.status_code == 404


def test_perf_empty_setup_returns_null_kpis(client) -> None:
    """When setup has no rows in the CSV, all KPIs should be None."""
    algo_id = _register_algo(client, setup_key="nonexistent_setup")
    df = _synthetic_csv(setup_key="other_setup")  # no rows match 'nonexistent_setup'
    with patch("pathlib.Path.exists", return_value=True), \
         patch("pandas.read_csv", return_value=df):
        resp = client.get(
            f"/api/v1/experience/rita/algo-performance?algo_id={algo_id}"
        )
    assert resp.status_code == 200
    kpis = resp.json()["kpis"]
    assert kpis["win_rate"] is None
    assert kpis["num_trades"] is None


def test_perf_kpi_counts_and_win_rate(client) -> None:
    """Verify num_trades, num_targets, num_stops and win_rate from synthetic data.

    Synthetic CSV: 2 BUY trades — trade 1 hits target (+10 pts), trade 2 hits stop (-10 pts).
    """
    algo_id = _register_algo(client, setup_key="test_setup")
    df = _synthetic_csv(setup_key="test_setup")

    with patch("pathlib.Path.exists", return_value=True), \
         patch("pandas.read_csv", return_value=df):
        resp = client.get(
            f"/api/v1/experience/rita/algo-performance?algo_id={algo_id}"
        )

    assert resp.status_code == 200
    body = resp.json()
    kpis = body["kpis"]

    assert kpis["num_trades"] == 2
    assert kpis["num_targets"] == 1
    assert kpis["num_stops"] == 1
    assert kpis["win_rate"] == pytest.approx(50.0, abs=0.1)
    assert kpis["total_pts"] == pytest.approx(0.0, abs=0.1)
    assert kpis["avg_win"] == pytest.approx(10.0, abs=0.1)
    assert kpis["avg_loss"] == pytest.approx(-10.0, abs=0.1)
    # Removed fields must NOT appear in the response
    assert "max_drawdown" not in kpis
    assert "max_consec_wins" not in kpis
    assert "max_consec_losses" not in kpis


def test_perf_equity_curve_present(client) -> None:
    algo_id = _register_algo(client, setup_key="test_setup")
    df = _synthetic_csv(setup_key="test_setup")

    with patch("pathlib.Path.exists", return_value=True), \
         patch("pandas.read_csv", return_value=df):
        resp = client.get(
            f"/api/v1/experience/rita/algo-performance?algo_id={algo_id}"
        )

    eq = resp.json()["equity_curve"]
    assert len(eq) == 2  # 2 resolved trades
    assert "date" in eq[0]
    assert "cumulative_pts" in eq[0]


def test_perf_signal_markers_present(client) -> None:
    algo_id = _register_algo(client, setup_key="test_setup")
    df = _synthetic_csv(setup_key="test_setup")

    with patch("pathlib.Path.exists", return_value=True), \
         patch("pandas.read_csv", return_value=df):
        resp = client.get(
            f"/api/v1/experience/rita/algo-performance?algo_id={algo_id}"
        )

    markers = resp.json()["signal_markers"]
    assert len(markers) == 2
    signals = {m["signal"] for m in markers}
    assert signals == {"BUY"}


def test_perf_signal_rate(client) -> None:
    """signal_rate = active_signals / total_rows * 100 = 2/4 * 100 = 50%."""
    algo_id = _register_algo(client, setup_key="test_setup")
    df = _synthetic_csv(setup_key="test_setup")

    with patch("pathlib.Path.exists", return_value=True), \
         patch("pandas.read_csv", return_value=df):
        resp = client.get(
            f"/api/v1/experience/rita/algo-performance?algo_id={algo_id}"
        )

    assert resp.json()["kpis"]["signal_rate"] == pytest.approx(50.0, abs=0.1)
