---
type: C4 Component
title: Core
status: stable
groma:
  id: core
  parent: fastapi-app
description: ML, RL, strategy, FnO calculation, and market data modules; the domain engine of RITA
---

40+ modules under src/rita/core/. The domain calculation and ML engine. Key groups:

**RL / ML**: trading_env, trading_env_v2, asta_trading_env (ASTA indicator-based variant), ml_dispatch (routes inference to correct model), model_compat (loads Windows-trained models on Mac/Linux), rl_diagnostics, rl_scorecard, training_tracker.

**Strategy**: strategy_engine, market_regime, goal_selection, goal_targets, goal_model_runs, investment_horizons, retirement_plan.

**FnO / Portfolio**: portfolio_engine, portfolio_optimizer, backtest_dispatch, experiment_backtest.

**Data**: data_loader, data_integrity, data_understanding, nse_api (NSE/BSE market data fetch), geography.

**AI / Chat**: classifier (intent classifier for chat), chat_monitor, jarvis_rationale, journey_intents, journey_slots.

**Indicators**: asta_indicators, asta_labeler, technical_analyzer, drift_detector.

Model weights come from the Model Store container at inference time. Lot sizes and margin are sourced from Zerodha Kite via fno-margin-fetch, never from static config.

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [Core](core.md "core") | [Model Store container](../../../model-store/container.md "model-store") | Loads DDQN model weights at inference time | PyTorch |
| [Core](core.md "core") | [NSE/BSE](../../../../../externals/nse-bse.md "nse-bse") | Fetches market data via nse_api module | HTTP |
| [Core](core.md "core") | [Zerodha Kite](../../../../../externals/zerodha-kite.md "zerodha-kite") | Reads live lot sizes and margin via fno-margin-fetch middleware | HTTP |
