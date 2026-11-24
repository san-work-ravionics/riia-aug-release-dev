---
type: C4 Component
title: Experience Layer
status: stable
groma:
  id: experience-layer
  parent: fastapi-app
description: Aggregates multi-service responses into dashboard-ready payloads; no business logic
---

25 FastAPI routers under src/rita/api/experience/. Each router composes calls to Services and Core to produce a single response shaped for a specific dashboard tab or UI feature. Contains no business logic — routing and aggregation only. Covers fno, jarvis, ds (data science), portfolio, invest_game, dashboard, ops, hedge_reasoning, fno_trade_analysis, fno_kite_live, equity_scenarios, experiment_backtest, optimal_allocation, pipeline_wizard, and others.

Per ADR-001, this is the UI-shaping tier. The dashboard never calls Workflow or System routers directly for multi-entity views.

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [Experience Layer](experience-layer.md "experience-layer") | [Services](services.md "services") | Composes service calls for dashboard responses | Python |
| [Experience Layer](experience-layer.md "experience-layer") | [Core](core.md "core") | Calls calculation and ML modules directly | Python |
