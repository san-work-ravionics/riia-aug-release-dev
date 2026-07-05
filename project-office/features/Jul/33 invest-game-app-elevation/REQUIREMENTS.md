# Feature 33 — Invest Game App Elevation

**Created:** 2026-07-04  
**Owner:** Engineer  
**Status:** `[ ] Not started`  
**Guardrail refs:** org · engineer-role · rita-project  
**Affected specs:** Spec_RITA_App.md, Spec_JS_Code.md, Spec_HTML_Code.md, Spec_Invest_Game.md  
**Affected skills:** skill-add-rita-feature.md, skill-add-mobile-feature.md

---

## Objective

Elevate "Invest Game" from a sub-menu item inside the RITA app to a standalone top-level app — at the same level as RITA, Ops, Data Science (ds), and FnO on the landing page (`index.html`). The new Invest Game app will have its own HTML page with a left sidebar navigation containing 6 pages that curate relevant content from across existing apps into a single guided learning flow.

---

## Background

Currently the Invest Game is embedded as a nav item inside `rita.html` under the "Study" section. As the game matures into a full educational/onboarding experience, it needs its own dedicated app with a curated flow that guides users through concepts → data science methodology → agent performance → agent builds → agent interaction. This pulls together content from RITA, Data Science, and Ops apps into one coherent journey.

---

## Scope

### In Scope
- New tile on `index.html` landing page in the **Open Access** zone, positioned as the **first tile** (before RITA Portfolio Builder)
- New standalone HTML page (`investgame-app.html`) with sidebar navigation and 6 pages:
  1. **Invest Game** — links to existing `investgame.html` (no iframe, standard navigation)
  2. **Concepts** — from RITA Concepts page (`sec-learnings`) but **excluding**: Technical Indicators card, Sharpe Ratio card, Model Building card, Market Trends card
  3. **CRISP-DM** — from Data Science app (`ds.html`) concepts section
  4. **Agent Performance** — from RITA app (`sec-agent-performance`)
  5. **Agent Builds** — from Ops Console (`sec-agent-builds`)
  6. **Agent Panel** — from RITA app (`sec-agent-panel`)
- Sidebar navigation matching existing app shell pattern (collapsible, nav items with icons)
- Remove "Invest Game" nav item from `rita.html` sidebar (it now lives in its own app)
- No Google Auth required — this is an open-access app

### Out of Scope
- Changes to the invest game logic itself (game flow, scoring, phases)
- New backend endpoints or database changes
- Changes to existing RITA / DS / Ops page content (content is referenced or duplicated, not moved)
- Google Auth protection — this app is open access
- Mobile PWA changes (beyond linking)

---

## Phases

### Phase 1 — Landing Page Tile + App Shell

**Goal:** Add Invest Game as a top-level app tile on `index.html` and create the new `investgame-app.html` with sidebar nav shell (6 menu items) and basic page switching.

| Deliverable | Description |
|---|---|
| `dashboard/index.html` | New tile for "Invest Game" in Open Access zone, first tile (before RITA) |
| `dashboard/investgame-app.html` | New standalone page with topbar, collapsible sidebar (6 nav items), and section containers |
| `dashboard/js/investgame-app/main.js` | Nav switching logic, section loader registration |
| `dashboard/js/investgame-app/nav.js` | Sidebar collapse/expand, active state management |

**Acceptance Criteria:**
- [ ] Landing page shows Invest Game tile as first tile in Open Access zone (before RITA Portfolio Builder)
- [ ] Clicking tile navigates to `investgame-app.html`
- [ ] Sidebar displays 6 nav items: Invest Game, Concepts, CRISP-DM, Agent Performance, Agent Builds, Agent Panel
- [ ] Clicking nav items switches visible section (show/hide pattern)
- [ ] Sidebar collapse/expand works
- [ ] No JS console errors on page load

---

### Phase 2 — Page 1: Invest Game (Link to Existing)

**Goal:** Wire the first nav item to navigate to the existing `investgame.html` page.  
**Blocked on:** Phase 1

| Deliverable | Description |
|---|---|
| `dashboard/investgame-app.html` | First nav item links directly to `investgame.html` (standard navigation, no iframe) |

**Acceptance Criteria:**
- [ ] Clicking "Invest Game" in sidebar navigates to `investgame.html`
- [ ] Existing invest game page works as before
- [ ] Back navigation returns to `investgame-app.html`

---

### Phase 3 — Page 2: Concepts (Filtered)

**Goal:** Add the Concepts section with only the allowed widgets from RITA Concepts page.  
**Blocked on:** Phase 1

| Deliverable | Description |
|---|---|
| `dashboard/investgame-app.html` | Section `sec-concepts` with: Investment Philosophies card, Why Retail Investors Lose Money card, Investment Workflow & Agents tabbed section |
| `dashboard/js/investgame-app/concepts.js` | Loader for concepts content — reuses API calls from `rita/learnings.js` |

**Acceptance Criteria:**
- [ ] Concepts page shows: Investment Philosophies, Why Retail Investors Lose Money, Investment Workflow & Agents (8 tabs)
- [ ] Does NOT show: Technical Indicators, Sharpe Ratio, Model Building, Market Trends cards
- [ ] Agent tabs switch and render charts correctly
- [ ] No JS console errors

---

### Phase 4 — Page 3: CRISP-DM

**Goal:** Add the CRISP-DM section from Data Science app.  
**Blocked on:** Phase 1

| Deliverable | Description |
|---|---|
| `dashboard/investgame-app.html` | Section `sec-crisp-dm` with CRISP-DM content from `ds.html` |
| `dashboard/js/investgame-app/crisp-dm.js` | CRISP-DM section loader — port of DS concepts section |

**Acceptance Criteria:**
- [ ] CRISP-DM content renders identically to `ds.html` concepts section
- [ ] All tabs/accordions in CRISP-DM work correctly
- [ ] No JS console errors

---

### Phase 5 — Pages 4–6: Agent Performance, Agent Builds, Agent Panel

**Goal:** Add the remaining three agent-focused pages.  
**Blocked on:** Phase 1

| Deliverable | Description |
|---|---|
| `dashboard/investgame-app.html` | Sections `sec-agent-performance`, `sec-agent-builds`, `sec-agent-panel` |
| `dashboard/js/investgame-app/agent-performance.js` | Port of `rita/agent-performance.js` loader |
| `dashboard/js/investgame-app/agent-builds.js` | Port of `ops/agent-builds.js` loader |
| `dashboard/js/investgame-app/agent-panel.js` | Port of `rita/agent-panel.js` loader |

**Acceptance Criteria:**
- [ ] Agent Performance page renders with same data/charts as RITA app version
- [ ] Agent Builds page renders with same data/charts as Ops Console version
- [ ] Agent Panel page renders with same interactive panel as RITA app version
- [ ] All API calls succeed and charts render
- [ ] No JS console errors

---

### Phase 6 — Cleanup + Integration Testing

**Goal:** Remove Invest Game from RITA sidebar, update specs, full smoke test.  
**Blocked on:** Phases 2–5

| Deliverable | Description |
|---|---|
| `dashboard/rita.html` | Remove `investgame` nav item from sidebar |
| `project-office/specs/Spec_Invest_Game.md` | Update to reflect new standalone app structure |
| `project-office/specs/Spec_RITA_App.md` | Remove invest game from nav inventory |
| `project-office/specs/Spec_JS_Code.md` | Add `investgame-app/` module structure |
| `project-office/specs/Spec_HTML_Code.md` | Add `investgame-app.html` documentation |

**Acceptance Criteria:**
- [ ] Invest Game no longer appears in RITA sidebar
- [ ] Landing page tile works end-to-end → new app loads
- [ ] All 6 pages load without errors
- [ ] All specs updated
- [ ] Browser smoke test passes (no console errors, all sections render)

---

## Dependencies

| Phase | Depends on |
|---|---|
| Phase 2 | Phase 1 (app shell) |
| Phase 3 | Phase 1 (app shell) |
| Phase 4 | Phase 1 (app shell) |
| Phase 5 | Phase 1 (app shell) |
| Phase 6 | Phases 2, 3, 4, 5 complete |

---

## Definition of Done

- [ ] All phases complete with acceptance criteria checked
- [ ] Relevant spec files updated
- [ ] Relevant skill files have updated `Last validated against spec` date
- [ ] Session committed to git
