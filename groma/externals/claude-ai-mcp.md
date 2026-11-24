---
type: C4 System
title: Claude AI (MCP)
status: stable
groma:
  id: claude-ai-mcp
description: Claude Sonnet model accessed via MCP server for the Jarvis assistant and agentic workflow
---

Anthropic's Claude API, accessed through the RITA MCP server. Powers the Jarvis module (natural-language assistant for portfolio queries and trade rationale) and supports agentic workflows via Claude Desktop integration. The MCP server logs all calls to /api/v1/mcp-calls for audit and replay.
