---
type: C4 Component
title: Workflow Layer
status: stable
groma:
  id: workflow-layer
  parent: fastapi-app
description: Orchestrates multi-step business processes; triggers training, pipeline, backtest, and chat flows
---

12 FastAPI routers under src/rita/api/v1/workflow/. Each router implements a business process that spans multiple services or core modules. Covers train, pipeline, backtest, chat, evaluate, jarvis, instrument_onboard, invest_game_plan, fno_console_import, commentary, algos, and user_portfolio. These are the entry points for long-running or state-changing operations.

Per ADR-001, Workflow routers call Services and Core; they never issue SQL directly.

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [Workflow Layer](workflow-layer.md "workflow-layer") | [Services](services.md "services") | Orchestrates business process steps | Python |
| [Workflow Layer](workflow-layer.md "workflow-layer") | [Core](core.md "core") | Triggers training, backtest, pipeline runs | Python |
