---
type: Groma Group
title: Service tier
groma:
  id: service-tier
---

Business logic and domain calculation. Services implement domain operations and delegate ML/calculation work to Core. Neither component issues SQL directly — that boundary belongs to the data tier.

## Members

- [Services](../systems/rita/containers/fastapi-app/components/services.md "services")
- [Core](../systems/rita/containers/fastapi-app/components/core.md "core")
