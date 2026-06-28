"""Unit tests for RIIATradingEnvV2 (Feature 32, Phase 3).

Covers env mechanics only — action/obs shapes, the hedge action's payoff
truncation + carry, the tolerance-relative breach penalty, per-episode tolerance
sampling, run_episode_v2 with a stub policy, and a guard that the golden
RIIATradingEnv stays frozen at Discrete(3). No SB3 training (too slow for a unit).
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from rita.core.trading_env_v2 import (
    RIIATradingEnvV2,
    RISK_TOLERANCE_MDD,
    HEDGE_DAILY_FLOOR,
    HEDGE_COST_PER_DAY,
    run_episode_v2,
    _ACTION_MAP,
)


def _make_df(daily_return: float = 0.001, n: int = 300, with_ema: bool = False) -> pd.DataFrame:
    """Synthetic OHLCV+indicators frame with all required columns non-NaN."""
    idx = pd.date_range("2020-01-01", periods=n, freq="D")
    data = {
        "daily_return": np.full(n, daily_return, dtype=float),
        "rsi_14":       np.full(n, 55.0),
        "macd":         np.full(n, 1.5),
        "macd_signal":  np.full(n, 1.0),
        "bb_pct_b":     np.full(n, 0.5),
        "trend_score":  np.full(n, 0.2),
        "Close":        np.full(n, 100.0),
        "atr_14":       np.full(n, 2.0),
    }
    if with_ema:
        data["ema_ratio"] = np.full(n, 1.01)
    return pd.DataFrame(data, index=idx)


class _StubModel:
    """Minimal stand-in for a trained DQN — always returns `action`."""

    def __init__(self, action: int, n_obs: int = 11):
        self.observation_space = type("S", (), {"shape": (n_obs,)})()
        self._action = action

    def predict(self, obs, deterministic=True):
        return np.array(self._action), None


def test_action_space_is_discrete_4():
    env = RIIATradingEnvV2(_make_df())
    assert env.action_space.n == 4


def test_obs_shape_11_without_ema_12_with_ema():
    # golden 8 (+ema) + dd_vs_tolerance + is_hedged + tolerance_norm
    assert RIIATradingEnvV2(_make_df(with_ema=False)).observation_space.shape == (11,)
    assert RIIATradingEnvV2(_make_df(with_ema=True)).observation_space.shape == (12,)


def test_tolerance_norm_is_last_obs_feature():
    from rita.core.trading_env_v2 import _tol_norm, RISK_TOLERANCE_MDD
    for level in ("low", "medium", "high"):
        env = RIIATradingEnvV2(_make_df(), fixed_tolerance=level)
        obs, _ = env.reset(seed=1)
        assert obs[-1] == pytest.approx(_tol_norm(RISK_TOLERANCE_MDD[level]), abs=1e-6)
    # conservative < aggressive on the tolerance feature
    assert _tol_norm(RISK_TOLERANCE_MDD["low"]) < _tol_norm(RISK_TOLERANCE_MDD["high"])


def test_low_tol_has_no_cash_opportunity_cost_but_medium_does():
    from rita.core.trading_env_v2 import LAMBDA_CASH_BY_TOL
    assert LAMBDA_CASH_BY_TOL["low"] == 0.0
    assert LAMBDA_CASH_BY_TOL["medium"] > 0.0
    # Cash action (alloc 0) on a flat-return day: reward == −cash_penalty for that tol.
    flat = _make_df(daily_return=0.0)
    env_lo = RIIATradingEnvV2(flat, fixed_tolerance="low"); env_lo.reset(seed=5)
    _, r_lo, _, _, _ = env_lo.step(0)
    env_md = RIIATradingEnvV2(flat, fixed_tolerance="medium"); env_md.reset(seed=5)
    _, r_md, _, _, _ = env_md.step(0)
    assert r_lo == pytest.approx(0.0, abs=1e-9)          # de-risking is free at low tol
    assert r_md == pytest.approx(-LAMBDA_CASH_BY_TOL["medium"], abs=1e-9)
    assert r_md < r_lo                                    # cash is penalised at medium


def test_reset_returns_obs_of_declared_shape():
    env = RIIATradingEnvV2(_make_df())
    obs, info = env.reset(seed=0)
    assert obs.shape == (11,)
    assert info == {}


def test_fixed_tolerance_pins_level_else_sampled_from_valid_set():
    env = RIIATradingEnvV2(_make_df(), fixed_tolerance="low")
    env.reset(seed=1)
    assert env._mdd_tolerance == RISK_TOLERANCE_MDD["low"]

    sampled = set()
    env2 = RIIATradingEnvV2(_make_df())
    for s in range(20):
        env2.reset(seed=s)
        sampled.add(env2._mdd_tolerance)
    assert sampled.issubset(set(RISK_TOLERANCE_MDD.values()))


def test_hedge_action_truncates_downside_and_pays_carry():
    # Big daily loss: hedged (action 3) should floor the per-day loss and pay carry,
    # NOT take the raw -5%.
    env = RIIATradingEnvV2(_make_df(daily_return=-0.05), fixed_tolerance="medium")
    env.reset(seed=2)
    _, reward, _, _, info = env.step(3)
    expected_ret = max(-0.05, HEDGE_DAILY_FLOOR) - HEDGE_COST_PER_DAY
    assert info["is_hedged"] == 1.0
    assert env._portfolio_value == pytest.approx(1 + expected_ret, abs=1e-9)
    # hedged steps get no breach penalty, but the negative step return still incurs
    # the downside-semivariance penalty → reward = portfolio_ret − λ_dn·ret².
    from rita.core.trading_env_v2 import LAMBDA_DOWNSIDE
    assert reward == pytest.approx(expected_ret - LAMBDA_DOWNSIDE * expected_ret ** 2, abs=1e-9)


def test_full_unhedged_takes_raw_return():
    env = RIIATradingEnvV2(_make_df(daily_return=-0.05), fixed_tolerance="medium")
    env.reset(seed=3)
    _, _, _, _, info = env.step(2)  # Full, unhedged
    assert info["is_hedged"] == 0.0
    assert env._portfolio_value == pytest.approx(0.95, abs=1e-9)


def test_unhedged_breach_incurs_graded_penalty():
    # Drive the portfolio past the low tolerance (-8%) unhedged; once breached,
    # reward must be strictly below the raw portfolio return.
    env = RIIATradingEnvV2(_make_df(daily_return=-0.05), fixed_tolerance="low")
    env.reset(seed=4)
    breached = False
    for _ in range(5):
        _, reward, term, _, info = env.step(2)  # Full, unhedged
        if abs(info["drawdown"]) > abs(RISK_TOLERANCE_MDD["low"]):
            # portfolio_ret for a full unhedged step is -0.05; penalty makes reward < that
            assert reward < -0.05 + 1e-9
            breached = True
            break
        if term:
            break
    assert breached, "drawdown never exceeded tolerance — test setup wrong"


def test_run_episode_v2_with_stub_model_reports_hedge_usage():
    df = _make_df(daily_return=0.001)
    model = _StubModel(action=3, n_obs=11)  # always hedge
    result = run_episode_v2(model, df, risk_tolerance="medium")
    assert result["hedge_usage_pct"] == pytest.approx(100.0)
    for k in ("portfolio_values", "benchmark_values", "allocations",
              "hedge_flags", "performance", "dates"):
        assert k in result


def test_run_episode_v2_cash_action_keeps_capital_flat():
    df = _make_df(daily_return=0.02)  # market rises, but agent stays in cash
    model = _StubModel(action=0, n_obs=10)
    result = run_episode_v2(model, df, risk_tolerance="high")
    assert result["portfolio_values"][-1] == pytest.approx(1.0, abs=1e-9)
    assert result["hedge_usage_pct"] == pytest.approx(0.0)


def test_action_map_shapes():
    assert _ACTION_MAP == {0: (0.0, False), 1: (0.5, False), 2: (1.0, False), 3: (1.0, True)}


def test_downside_semivariance_penalty_applies_to_losses_only():
    from rita.core.trading_env_v2 import LAMBDA_DOWNSIDE, HEDGE_COST_PER_DAY
    # Full unhedged into a −5% day: reward = portfolio_ret − LAMBDA_DOWNSIDE·ret²
    # (no breach yet on the first step at medium tol).
    env = RIIATradingEnvV2(_make_df(daily_return=-0.05), fixed_tolerance="medium")
    env.reset(seed=7)
    _, reward, _, _, _ = env.step(2)            # Full, unhedged → portfolio_ret = -0.05
    expected = -0.05 - LAMBDA_DOWNSIDE * (-0.05) ** 2
    assert reward == pytest.approx(expected, abs=1e-9)

    # A gaining day incurs no downside penalty.
    env_up = RIIATradingEnvV2(_make_df(daily_return=0.03), fixed_tolerance="medium")
    env_up.reset(seed=7)
    _, reward_up, _, _, _ = env_up.step(2)
    assert reward_up == pytest.approx(0.03, abs=1e-9)


def test_outcome_match_term_rewards_hedge_into_decline_over_rally():
    # Phase 4.2 closed-loop shaping: hedging before a forward DROP scores a match
    # (+λ); hedging before a forward RISE scores a miss (−λ). Decision-day mechanics
    # are identical, so the reward gap isolates the outcome term (2·LAMBDA_OUTCOME).
    from rita.core.trading_env_v2 import LAMBDA_OUTCOME, OUTCOME_HORIZON_DAYS

    def _df_with_forward(close_at_h):
        df = _make_df(daily_return=0.0, n=40)
        closes = df["Close"].to_numpy().copy()
        closes[0] = 100.0
        closes[OUTCOME_HORIZON_DAYS] = close_at_h
        df = df.copy()
        df["Close"] = closes
        return df

    env_dn = RIIATradingEnvV2(_df_with_forward(80.0), fixed_tolerance="medium")
    env_dn.reset(seed=1)
    _, r_decline, _, _, _ = env_dn.step(3)   # hedge into −20% fwd move → match

    env_up = RIIATradingEnvV2(_df_with_forward(120.0), fixed_tolerance="medium")
    env_up.reset(seed=1)
    _, r_rally, _, _, _ = env_up.step(3)     # hedge into +20% fwd move → miss

    assert r_decline > r_rally
    assert (r_decline - r_rally) == pytest.approx(2 * LAMBDA_OUTCOME, abs=1e-9)


def test_temporal_split_is_chronological_and_non_overlapping():
    from rita.core.trading_env_v2 import temporal_split
    df = _make_df(n=1000)
    tr, va, te = temporal_split(df, train_frac=0.70, val_frac=0.15)
    # sizes ~ 70/15/15, cover the whole frame with no gaps or overlap
    assert len(tr) + len(va) + len(te) == len(df)
    assert (len(tr), len(va), len(te)) == (700, 150, 150)
    # strictly increasing in time: train precedes val precedes test
    assert tr.index.max() < va.index.min() < va.index.max() < te.index.min()


def test_static_baseline_matches_run_episode_result_shape():
    from rita.core.trading_env_v2 import run_static_baseline_v2
    df = _make_df(daily_return=0.001)
    result = run_static_baseline_v2(df, risk_tolerance="medium")
    for k in ("portfolio_values", "benchmark_values", "allocations",
              "hedge_flags", "hedged_steps", "hedge_usage_pct",
              "daily_returns", "dates", "performance"):
        assert k in result
    # Rising market never breaches tolerance → static rule never hedges.
    assert result["hedge_usage_pct"] == pytest.approx(0.0)
    assert all(a == 1.0 for a in result["allocations"])  # always fully invested


def test_static_baseline_hedges_after_drawdown_breach():
    from rita.core.trading_env_v2 import run_static_baseline_v2
    df = _make_df(daily_return=-0.05)  # steep, sustained drawdown
    result = run_static_baseline_v2(df, risk_tolerance="low")
    # A deep persistent drawdown must trip the threshold rule into hedging.
    assert result["hedged_steps"] > 0


def test_golden_env_is_frozen_discrete_3():
    """Regression guard: V2 must not have altered the golden env's action space."""
    from rita.core.trading_env import RIIATradingEnv
    env = RIIATradingEnv(_make_df())
    assert env.action_space.n == 3, "golden RIIATradingEnv must stay Discrete(3)"


# ── Execution Analyst intent (recommendation-only) ────────────────────────────

def test_recommend_hedge_returns_labelled_recommendation():
    from rita.core.trading_env_v2 import recommend_hedge, _ACTION_LABEL
    df = _make_df(daily_return=-0.01)
    model = _StubModel(action=3, n_obs=10)
    rec = recommend_hedge(df, model, risk_tolerance="medium")
    assert rec["action"] == 3
    assert rec["label"] == _ACTION_LABEL[3][0]
    for k in ("drawdown_pct", "mdd_tolerance_pct", "breach"):
        assert k in rec


def test_hedge_advice_intent_registered_and_mapped():
    from rita.core.classifier import INTENTS, INTENT_TO_AGENT
    intent = next((i for i in INTENTS if i.name == "hedge_advice"), None)
    assert intent is not None, "hedge_advice intent must be registered"
    assert intent.handler == "execution_hedge"
    assert INTENT_TO_AGENT["hedge_advice"] == "Execution Analyst"


def test_execution_hedge_dispatch_graceful_when_untrained(tmp_path):
    """No V2 model artifact → advisory message, never an error, never an order."""
    from rita.core.classifier import INTENTS, IntentResult, dispatch
    intent = next(i for i in INTENTS if i.name == "hedge_advice")
    result = IntentResult(intent=intent, confidence=0.9, low_confidence=False)
    out = dispatch(result, _make_df(), output_dir=str(tmp_path))  # empty dir
    assert "not yet trained" in out.lower()
    assert "advisory" in out.lower()


def test_train_best_of_n_v2_selects_and_returns_structure():
    """Tiny best-of-2 smoke — verifies seed loop + winner selection structure."""
    import tempfile
    from rita.core.trading_env_v2 import train_best_of_n_v2
    df = _make_df(daily_return=0.001, n=320)
    with tempfile.TemporaryDirectory() as d:
        _model, _cb, info = train_best_of_n_v2(
            train_df=df, val_df=df, output_dir=d,
            timesteps=400, n_seeds=2, model_name="rita_ddqn_v2_test",
        )
    assert info["n_seeds_tried"] == 2
    assert len(info["seed_results"]) == 2
    assert info["best_seed"] in (0, 1)
    assert all("val_sharpe" in r and "hedge_usage_pct" in r for r in info["seed_results"])


def test_trading_env_v2_has_no_order_execution_paths():
    """Load-bearing: the V2 module is advisory only — no order/trade routing."""
    import rita.core.trading_env_v2 as mod
    src = open(mod.__file__, encoding="utf-8").read().lower()
    for forbidden in ("place_order", "submit_order", "execute_trade",
                      "create_order", "broker.", "send_order"):
        assert forbidden not in src, f"advisory module must not reference {forbidden}"
