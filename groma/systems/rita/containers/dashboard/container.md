---
type: C4 Container
title: Dashboard
status: stable
groma:
  id: dashboard
  parent: rita
  technology: Vanilla JavaScript, HTML, CSS
description: Multi-tab browser dashboard served from /dashboard/; 10 JS apps covering RITA, FnO, DS, Ops, Jarvis, InvestGame, and more
---

Static JavaScript dashboard served from /dashboard/ by the FastAPI application. Contains 10 JS app modules: rita (main trading signals), fno (F&O positions and hedging), ds (data science / model analytics), ops (operations and health), jarvis (AI assistant UI), invest-game (investment simulation), investgame-app, scenarios, users, and shared utilities. Each tab communicates with the Experience Layer routers via the api.js client, following the 401→ensureDevToken(true)→retry auth pattern.
