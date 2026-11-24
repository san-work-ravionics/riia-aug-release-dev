---
type: C4 Component
title: Services
status: stable
groma:
  id: services
  parent: fastapi-app
description: Business logic layer; 39 modules implementing domain operations with no direct DB or file I/O
---

39 service modules under src/rita/services/. Each module implements one domain area: backtest_service, fno_trade_analysis_service, fno_trade_analytics_service, goal_selection_service, fx_service, data_refresh, hedge_plan_service, instrument_onboard, jarvis_chat_service, jarvis_page_service, journey_service, kite_middleware_client, market_analysis_service, optimal_allocation_service, portfolio_pnl_service, portfolio_service, position_value_service, retirement_plan_service, retrain_trigger, user_portfolio_service, workflow_service, and others.

Services contain all business logic. They never issue SQL directly — all persistence goes through Repositories. They may call Core for ML dispatch, calculations, and market data.

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [Services](services.md "services") | [Repositories](repositories.md "repositories") | Reads and writes records via repository classes | Python |
| [Services](services.md "services") | [Core](core.md "core") | Delegates ML, strategy, and calculation work | Python |
