---
type: Groma Project
title: RITA
groma:
  profile: architecture
description: Nifty 50 Double DQN RL trading system and FnO portfolio manager, POC refactored to production
---

RITA is a production-grade algorithmic trading system built around a Double DQN reinforcement learning model trained on Nifty 50 equities. It manages F&O portfolio positions, runs backtests, generates trade signals, and provides a multi-tab dashboard for monitoring and control.

## Scan scope

This map covers the FastAPI application, its three API tiers, service and core layers, data tier, the JS dashboard, Mobile PWA, MCP server, and ML model store. Test fixtures, migration scripts, and the RL training workspace (riia-cowork-aug-demo) are outside this map.

The Python scanner is not yet configured — this map is hand-curated. Add the Python scanner when running groma on Linux or Apple Silicon (the binary does not support Intel Mac).

## Architecture decisions

- **ADR-001**: Three-tier API — Experience Layer (UI aggregation) / Workflow (business process) / System CRUD (pure data access)
- **ADR-002**: Repository pattern — one class per DB table; only repositories issue SQL or touch files on disk
- **v1**: SQLite + SQLAlchemy 2.x ORM, stateless API, JWT auth
- **v2**: PostgreSQL replaces SQLite via one config change — zero application code changes required
