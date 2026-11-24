---
type: C4 Container
title: Database
status: stable
groma:
  id: database
  parent: rita
  technology: SQLite (dev), PostgreSQL (prod), SQLAlchemy 2.x
description: Relational store for all RITA state; SQLite in development, PostgreSQL in production — zero application code change required
---

Stores all persistent RITA state: instrument configs, trades, positions, model runs, backtests, FnO imports, user portfolios, audit logs, and more. The switch from SQLite to PostgreSQL is a single configuration change in config/production.yaml — no application code changes are needed (ADR-001 / ADR-002 guarantee). Accessed exclusively through the Repositories component; no other layer issues SQL directly.
