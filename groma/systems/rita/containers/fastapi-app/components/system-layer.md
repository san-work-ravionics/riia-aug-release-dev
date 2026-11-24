---
type: C4 Component
title: System Layer
status: stable
groma:
  id: system-layer
  parent: fastapi-app
description: Pure CRUD routers; one router per entity, no business logic, delegates directly to repositories
---

15 FastAPI routers under src/rita/api/v1/system/. Each router provides create/read/update/delete operations for a single entity. Covers instruments, trades, positions, alerts, snapshots, training_runs, market_data, orders, audit, config_overrides, algos, drift, hedge_plan_history, market_signals, mcp_calls, and client_errors.

Per ADR-001, System routers call Repositories directly — no Services or Core in the call path for simple CRUD.

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [System Layer](system-layer.md "system-layer") | [Repositories](repositories.md "repositories") | CRUD operations via repository classes | Python |
