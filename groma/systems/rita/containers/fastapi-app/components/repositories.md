---
type: C4 Component
title: Repositories
status: stable
groma:
  id: repositories
  parent: fastapi-app
description: Data access layer; 38 classes, one per DB table, the only layer permitted to issue SQL or touch files
---

38 repository classes under src/rita/repositories/. Per ADR-002, this is the only layer allowed to issue SQL or read/write files on disk. Each class owns exactly one table. Key repositories: instrument, trades, positions, orders, portfolio, snapshots, training, backtest, model_registry, model_artifact, nse_option_bhav, fno_import, fno_sample_files, jarvis, alerts, audit, config_overrides, manoeuvres, risk, paper_positions, user_hedge_plan, user_hedge_plan_history, user_portfolio, user_portfolio_key, user_retirement_plan, agent_builds, agent_performance, commentary_log, mcp_call, api_call_log, and others.

No business logic lives here. Services and System Layer routers call repositories; Core modules do not.

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [Repositories](repositories.md "repositories") | [Models](models.md "models") | Maps ORM model classes to SQL queries | SQLAlchemy 2.x |
| [Repositories](repositories.md "repositories") | [Database container](../../../database/container.md "database") | Issues SQL against the configured database | SQLAlchemy |
