---
type: Groma Group
title: Data tier
groma:
  id: data-tier
---

Persistence layer per ADR-002. Repositories are the only components allowed to issue SQL or touch files. Models define the ORM mapping. Schemas define the HTTP contract. These three components change together when a database table or API field changes.

## Members

- [Repositories](../systems/rita/containers/fastapi-app/components/repositories.md "repositories")
- [Models](../systems/rita/containers/fastapi-app/components/models.md "models")
- [Schemas](../systems/rita/containers/fastapi-app/components/schemas.md "schemas")
