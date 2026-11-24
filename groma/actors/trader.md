---
type: C4 Actor
title: Trader / Analyst
status: stable
groma:
  id: trader
description: A person who manages FnO positions, monitors RL model signals, and runs backtests via the dashboard
---

Uses the RITA dashboard and mobile PWA to monitor live Nifty 50 positions, review DDQN model signals, run backtests and training pipelines, manage F&O hedges, and track portfolio performance. May also interact via the Jarvis assistant (Sonnet-based chat interface) for natural-language queries about positions and goals.

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [Trader / Analyst](trader.md "trader") | [Dashboard](../systems/rita/containers/dashboard/container.md "dashboard") | Monitors signals, positions, and backtests | Browser |
| [Trader / Analyst](trader.md "trader") | [Mobile PWA](../systems/rita/containers/mobile-pwa/container.md "mobile-pwa") | Reviews portfolio summary and algo screen on mobile | PWA |
| [Trader / Analyst](trader.md "trader") | [FastAPI Application](../systems/rita/containers/fastapi-app/container.md "fastapi-app") | Directly queries REST endpoints for ops and config | HTTP/REST |
