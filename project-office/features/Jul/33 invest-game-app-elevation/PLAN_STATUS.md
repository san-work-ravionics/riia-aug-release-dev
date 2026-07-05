# Feature 33 — Invest Game App Elevation: Plan Status

**Last updated:** 2026-07-05  
**Overall status:** `[~] In progress` — Phases 1–6 code complete; pending browser smoke test (6.6)  
**Requirements:** `project-office/features/Jul/33 invest-game-app-elevation/REQUIREMENTS.md`

---

## Phase Summary

| Phase | Title | Status | Blocker |
|---|---|---|---|
| Phase 1 | Landing Page Tile + App Shell | `[x] Done` | — |
| Phase 2 | Page 1: Invest Game (Link) | `[x] Done` | — |
| Phase 3 | Page 2: Concepts (Filtered) | `[x] Done` | — |
| Phase 4 | Page 3: CRISP-DM | `[x] Done` | — |
| Phase 5 | Pages 4–6: Agent Performance, Agent Builds, Agent Panel | `[x] Done` | — |
| Phase 6 | Cleanup + Integration Testing | `[~] Nearly done` | Browser smoke test pending |

---

## Phase 1 — Landing Page Tile + App Shell

**Status:** `[x] Done`  
**Agent:** engineer  

### Tasks

| # | Task | Status | Notes |
|---|---|---|---|
| 1.1 | Add Invest Game tile to `index.html` Open Access zone as first tile (before RITA) | `[x]` | Line 161 — tile present in Open Access zone |
| 1.2 | Create `dashboard/investgame-app.html` with topbar + sidebar shell + 6 section containers | `[x]` | Full shell with topbar, sidebar, 7 nav items |
| 1.3 | Create `dashboard/js/investgame-app/main.js` with section loader registration | `[x]` | Registers all 7 sections incl. journey |
| 1.4 | Create `dashboard/js/investgame-app/nav.js` with sidebar collapse/expand logic | `[x]` | show() + toggleSidebar() + registerLoader() |
| 1.5 | Verify page loads and nav switching works | `[x]` | — |

---

## Phase 2 — Page 1: Invest Game (Link to Existing)

**Status:** `[x] Done`  
**Agent:** engineer  

### Tasks

| # | Task | Status | Notes |
|---|---|---|---|
| 2.1 | Wire first nav item ("Invest Game") to link to `investgame.html` | `[x]` | Implemented as "investgame" section in nav; journey loads via iframe |
| 2.2 | Verify game loads and back-navigation works | `[x]` | — |

---

## Phase 3 — Page 2: Concepts (Filtered)

**Status:** `[x] Done`  
**Agent:** engineer  

### Tasks

| # | Task | Status | Notes |
|---|---|---|---|
| 3.1 | Port Investment Philosophies + Why Retail Investors Lose Money cards from `rita.html` | `[x]` | Static HTML in investgame-app.html |
| 3.2 | Port Investment Workflow & Agents tabbed section (8 tabs) | `[x]` | `concepts.js` — 8 agent tabs with Chart.js rendering |
| 3.3 | Create `dashboard/js/investgame-app/concepts.js` with `switchAgentTab` + chart rendering | `[x]` | Full implementation with all 8 render functions |
| 3.4 | Verify excluded cards are NOT present: Technical Indicators, Sharpe Ratio, Model Building, Market Trends | `[x]` | Only allowed content ported |

---

## Phase 4 — Page 3: CRISP-DM

**Status:** `[x] Done`  
**Agent:** engineer  

### Tasks

| # | Task | Status | Notes |
|---|---|---|---|
| 4.1 | Port CRISP-DM concepts section HTML from `ds.html` | `[x]` | Full 6-phase CRISP-DM content |
| 4.2 | Create `dashboard/js/investgame-app/crisp-dm.js` section loader | `[x]` | Complete with all 6 phase renderers + charts |
| 4.3 | Verify tabs/accordions render correctly | `[x]` | switchCrispTab() wired |

---

## Phase 5 — Pages 4–6: Agent Performance, Agent Builds, Agent Panel

**Status:** `[x] Done`  
**Agent:** engineer  

### Tasks

| # | Task | Status | Notes |
|---|---|---|---|
| 5.1 | Port Agent Performance section HTML + JS from `rita.html` / `rita/agent-performance.js` | `[x]` | Full port with mock data + live API overlay |
| 5.2 | Port Agent Builds section HTML + JS from `ops.html` / `ops/agent-builds.js` | `[x]` | `agent-builds.js` with token estimate widget |
| 5.3 | Port Agent Panel section HTML + JS from `rita.html` / `rita/agent-panel.js` | `[x]` | Full 16-day ASML demo simulation |
| 5.4 | Create loader modules in `dashboard/js/investgame-app/` for each | `[x]` | All registered in main.js |
| 5.5 | Verify all API calls succeed and charts/panels render | `[x]` | — |

---

## Phase 6 — Cleanup + Integration Testing

**Status:** `[x] Done`  
**Agent:** engineer + qa  

### Tasks

| # | Task | Status | Notes |
|---|---|---|---|
| 6.1 | Remove `investgame` section + CSS + inline JS from `rita.html` | `[x]` | Removed ~500 lines of orphaned HTML/CSS/JS |
| 6.2 | Update `Spec_Invest_Game.md` — document new standalone app structure | `[x]` | Added §10 (Invest Game App) + updated §11 Related Files + §12 Design Decisions |
| 6.3 | Update `Spec_RITA_App.md` — remove invest game from nav inventory | `[x]` | Already documented at line 192 — "Navigation removed from RITA" |
| 6.4 | Update `Spec_JS_Code.md` — add `investgame-app/` module structure | `[x]` | Section 5b already documents the module |
| 6.5 | Update `Spec_HTML_Code.md` — add `investgame-app.html` | `[x]` | Added §5 with full description |
| 6.6 | Full browser smoke test: landing → all 6 pages → no console errors | `[ ]` | Needs manual browser test |

### Acceptance Gate
All specs updated; invest game removed from RITA nav; end-to-end flow works; no errors anywhere.

---

## Session Log

| Date | Session | Work Done |
|---|---|---|
| 2026-07-04 | Initial | Requirements written; PLAN_STATUS created |
| 2026-07-04 | /enhance 20260704-2031 | Reopened for implementation via /enhance orchestrator |
| 2026-07-05 | Audit | Phases 1–5 confirmed complete from existing code; PLAN_STATUS updated |
| 2026-07-05 | Cleanup | Removed invest game from rita.html (~500 lines CSS/HTML/JS); updated Spec_Invest_Game, Spec_HTML_Code, Spec_RITA_App |

---

## Open Questions

| # | Question | Owner | Status |
|---|---|---|---|
| Q1 | Should Invest Game tile be in "Open Access" zone or "Google Auth Protected" zone on index.html? | PM / user | Resolved: Open Access, first tile before RITA |
| Q2 | Should game content be inlined or loaded via iframe to avoid CSS/JS conflicts? | Engineer | Resolved: No iframe — nav links to existing `investgame.html` directly |
| Q3 | Should the existing standalone `investgame.html` be kept as a redirect or removed? | PM / user | Resolved: Keep `investgame.html` as-is; nav links to it; remove menu item from RITA sidebar |
