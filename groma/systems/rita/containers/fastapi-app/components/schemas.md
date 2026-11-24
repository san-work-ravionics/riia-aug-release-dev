---
type: C4 Component
title: Schemas
status: stable
groma:
  id: schemas
  parent: fastapi-app
description: Pydantic v2 request and response models defining the typed API contract for all endpoints
---

Pydantic schema modules under src/rita/schemas/. Define the typed input and output contracts for every API endpoint. Used by all three router tiers (Experience, Workflow, System) for request validation and response serialisation. Schemas are the API boundary — changes here are breaking changes for dashboard and mobile clients. Kept separate from ORM Models to avoid tight coupling between the HTTP contract and the database schema.
