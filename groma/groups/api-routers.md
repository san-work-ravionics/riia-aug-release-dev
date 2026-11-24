---
type: Groma Group
title: API routers
groma:
  id: api-routers
---

The three ADR-001 routing tiers. Each tier has a distinct responsibility: Experience Layer shapes data for the UI, Workflow Layer orchestrates multi-step processes, System Layer provides pure CRUD. No tier reaches down past its allowed boundary.

## Members

- [Experience Layer](../systems/rita/containers/fastapi-app/components/experience-layer.md "experience-layer")
- [Workflow Layer](../systems/rita/containers/fastapi-app/components/workflow-layer.md "workflow-layer")
- [System Layer](../systems/rita/containers/fastapi-app/components/system-layer.md "system-layer")
