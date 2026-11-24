---
type: C4 Container
title: MCP Server
status: stable
groma:
  id: mcp-server
  parent: rita
  technology: Python, Model Context Protocol
description: MCP integration layer for Claude Desktop; logs all MCP calls to /api/v1/mcp-calls and exposes tool interface for Jarvis
---

Model Context Protocol server integrated with the FastAPI application via the mcp_logger core module and the /api/v1/mcp-calls system router. Enables Claude Desktop to invoke RITA tools in agentic workflows. All MCP calls are logged for audit and replay. Also powers the Jarvis module's connection to Claude AI for natural-language portfolio queries and trade rationale generation.
