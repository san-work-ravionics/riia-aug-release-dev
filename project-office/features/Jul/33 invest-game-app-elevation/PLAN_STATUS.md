# Feature 33 — Invest Game App Elevation: Plan Status

**Last updated:** 2026-07-04  
**Overall status:** `[~] In progress` — reopened 20260704 via /enhance run  
**Requirements:** `project-office/features/Jul/33 invest-game-app-elevation/REQUIREMENTS.md`

---

## Phase Summary

| Phase | Title | Status | Blocker |
|---|---|---|---|
| Phase 1 | Landing Page Tile + App Shell | `[ ] Not started` | — |
| Phase 2 | Page 1: Invest Game (Link) | `[ ] Not started` | Phase 1 |
| Phase 3 | Page 2: Concepts (Filtered) | `[ ] Not started` | Phase 1 |
| Phase 4 | Page 3: CRISP-DM | `[ ] Not started` | Phase 1 |
| Phase 5 | Pages 4–6: Agent Performance, Agent Builds, Agent Panel | `[ ] Not started` | Phase 1 |
| Phase 6 | Cleanup + Integration Testing | `[ ] Not started` | Phases 2–5 |

---

## Phase 1 — Landing Page Tile + App Shell

**Status:** `[ ] Not started`  
**Agent:** engineer  
**Effort estimate:** 3 hours

### Tasks

| # | Task | Status | Notes |
|---|---|---|---|
| 1.1 | Add Invest Game tile to `index.html` Open Access zone as first tile (before RITA) | `[ ]` | No auth required |
| 1.2 | Create `dashboard/investgame-app.html` with topbar + sidebar shell + 6 section containers | `[ ]` | Follow existing app shell pattern from `rita.html` / `ops.html` |
| 1.3 | Create `dashboard/js/investgame-app/main.js` with section loader registration | `[ ]` | |
| 1.4 | Create `dashboard/js/investgame-app/nav.js` with sidebar collapse/expand logic | `[ ]` | |
| 1.5 | Verify page loads and nav switching works | `[ ]` | |

### Acceptance Gate
Landing page tile links to new app; sidebar renders 6 items; clicking switches sections; no JS errors.

---

## Phase 2 — Page 1: Invest Game (Link to Existing)

**Status:** `[ ] Not started` ��� blocked on Phase 1  
**Agent:** engineer  
**Effort estimate:** 0.5 hours

### Tasks

| # | Task | Status | Notes |
|---|---|---|---|
| 2.1 | Wire first nav item ("Invest Game") to link to `investgame.html` | `[ ]` | Standard `<a>` navigation, no iframe |
| 2.2 | Verify game loads and back-navigation works | `[ ]` | |

### Acceptance Gate
Clicking "Invest Game" navigates to existing game page; back button returns to app.

---

## Phase 3 — Page 2: Concepts (Filtered)

**Status:** `[ ] Not started` — blocked on Phase 1  
**Agent:** engineer  
**Effort estimate:** 2 hours

### Tasks

| # | Task | Status | Notes |
|---|---|---|---|
| 3.1 | Port Investment Philosophies + Why Retail Investors Lose Money cards from `rita.html` | `[ ]` | Static HTML content |
| 3.2 | Port Investment Workflow & Agents tabbed section (8 tabs) | `[ ]` | Requires API calls + Chart.js |
| 3.3 | Create `dashboard/js/investgame-app/concepts.js` with `switchAgentTab` + chart rendering | `[ ]` | Reuse API endpoints from `rita/learnings.js` |
| 3.4 | Verify excluded cards are NOT present: Technical Indicators, Sharpe Ratio, Model Building, Market Trends | `[ ]` | |

### Acceptance Gate
Only allowed content visible; agent tabs render charts; no console errors.

---

## Phase 4 — Page 3: CRISP-DM

**Status:** `[ ] Not started` — blocked on Phase 1  
**Agent:** engineer  
**Effort estimate:** 2 hours

### Tasks

| # | Task | Status | Notes |
|---|---|---|---|
| 4.1 | Port CRISP-DM concepts section HTML from `ds.html` | `[ ]` | |
| 4.2 | Create `dashboard/js/investgame-app/crisp-dm.js` section loader | `[ ]` | Port from DS page JS |
| 4.3 | Verify tabs/accordions render correctly | `[ ]` | |

### Acceptance Gate
CRISP-DM content renders identically to `ds.html` version; no errors.

---

## Phase 5 — Pages 4–6: Agent Performance, Agent Builds, Agent Panel

**Status:** `[ ] Not started` — blocked on Phase 1  
**Agent:** engineer  
**Effort estimate:** 4 hours

### Tasks

| # | Task | Status | Notes |
|---|---|---|---|
| 5.1 | Port Agent Performance section HTML + JS from `rita.html` / `rita/agent-performance.js` | `[ ]` | |
| 5.2 | Port Agent Builds section HTML + JS from `ops.html` / `ops/agent-builds.js` | `[ ]` | |
| 5.3 | Port Agent Panel section HTML + JS from `rita.html` / `rita/agent-panel.js` | `[ ]` | |
| 5.4 | Create loader modules in `dashboard/js/investgame-app/` for each | `[ ]` | |
| 5.5 | Verify all API calls succeed and charts/panels render | `[ ]` | |

### Acceptance Gate
All three pages render with correct data; API calls succeed; no console errors.

---

## Phase 6 — Cleanup + Integration Testing

**Status:** `[ ] Not started` — blocked on Phases 2–5  
**Agent:** engineer + qa  
**Effort estimate:** 2 hours

### Tasks

| # | Task | Status | Notes |
|---|---|---|---|
| 6.1 | Remove `investgame` nav item from `rita.html` sidebar | `[ ]` | |
| 6.2 | Update `Spec_Invest_Game.md` — document new standalone app structure | `[ ]` | |
| 6.3 | Update `Spec_RITA_App.md` — remove invest game from nav inventory | `[ ]` | |
| 6.4 | Update `Spec_JS_Code.md` — add `investgame-app/` module structure | `[ ]` | |
| 6.5 | Update `Spec_HTML_Code.md` — add `investgame-app.html` | `[ ]` | |
| 6.6 | Full browser smoke test: landing → all 6 pages → no console errors | `[ ]` | |

### Acceptance Gate
All specs updated; invest game removed from RITA nav; end-to-end flow works; no errors anywhere.

---

## Session Log

| Date | Session | Work Done |
|---|---|---|
| 2026-07-04 | Initial | Requirements written; PLAN_STATUS created |
| 2026-07-04 | /enhance 20260704-2031 | Reopened for implementation via /enhance orchestrator |

---

## Open Questions

| # | Question | Owner | Status |
|---|---|---|---|
| Q1 | Should Invest Game tile be in "Open Access" zone or "Google Auth Protected" zone on index.html? | PM / user | Resolved: Open Access, first tile before RITA |
| Q2 | Should game content be inlined or loaded via iframe to avoid CSS/JS conflicts? | Engineer | Resolved: No iframe — nav links to existing `investgame.html` directly |
| Q3 | Should the existing standalone `investgame.html` be kept as a redirect or removed? | PM / user | Resolved: Keep `investgame.html` as-is; nav links to it; remove menu item from RITA sidebar |
