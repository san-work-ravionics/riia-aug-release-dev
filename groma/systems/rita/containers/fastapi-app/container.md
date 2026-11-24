---
type: C4 Container
title: FastAPI Application
status: stable
groma:
  id: fastapi-app
  parent: rita
  technology: Python 3.11, FastAPI, Uvicorn, SQLAlchemy 2.x, Pydantic
description: Stateless REST API implementing three tiers per ADR-001; serves all dashboard, mobile, and MCP traffic on port 8000
---

Runs all server-side logic. Owns the three-tier API (Experience Layer, Workflow Layer, System Layer), business services, ML/calculation core, and the repository data access layer. Stateless by design — all persistence goes through repositories to the configured database. JWT-secured. Serves static dashboard files from /dashboard/ and the mobile PWA from /mobileapp.

## Technology

Python 3.11 with FastAPI and Uvicorn. SQLAlchemy 2.x async ORM. Pydantic v2 for request/response validation. Rate limiting via the limiter module. Structured logging via logging_config. Prometheus metrics exposed at /metrics.
