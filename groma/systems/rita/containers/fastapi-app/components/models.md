---
type: C4 Component
title: Models
status: stable
groma:
  id: models
  parent: fastapi-app
description: SQLAlchemy 2.x declarative ORM models; 34 classes mapping Python objects to database tables
---

34 ORM model classes under src/rita/models/. Each class is a SQLAlchemy declarative base mapping to one database table. Used exclusively by Repositories — no other layer references model classes directly. Covers all entities: instrument, algo, trades, positions, orders, portfolio, snapshots, training, backtest, model_registry, nse_option_bhav, fno_import, jarvis, alerts, audit, config_overrides, manoeuvres, risk, paper_positions, user and user-related tables, agent_builds, agent_performance, commentary_log, mcp_call, api_call_log, and others.
