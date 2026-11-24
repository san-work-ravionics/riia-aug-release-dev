# CLAUDE.md — riia-aug-release

See the parent repo (`riia-agentic-firm/CLAUDE.md`) for full project guardrails, spec files, and agent workflow.

<!-- groma:start -->
## Architecture map

The project architecture is documented in `groma/` using the OKF 0.2 format.

Before writing or reviewing code:
1. Read `groma/project.md` for the system overview and scan scope.
2. Run `groma agent-instructions` for the curation workflow (requires Linux/Apple Silicon).
3. For the component you are working on, read its file under `groma/systems/rita/`.
4. After structural changes, update the relevant component or container file.

Key IDs: system `rita` · containers `fastapi-app`, `database`, `dashboard`, `mobile-pwa`, `model-store`, `mcp-server` · ADR-001: 3-tier API (experience/workflow/system) · ADR-002: repository pattern
<!-- groma:end -->
