# /enhance — Multi-Agent Feature Orchestrator

Orchestrates a chain of specialist agents to plan, build, test, and document a change. Two tracks:
- **UI track** (`rita`, `fno`, `ops`, `ds`) — a dashboard feature: API endpoint + JS module + HTML section.
- **Core/ML track** (`core`, `rl`, `ml`) — a change to `src/rita/core/` (or `services/`/`repositories/`) logic + tests, with **no endpoint/JS/HTML required** (e.g. RL reward/env, metrics, ML dispatch). See Step 0 and Appendix C.

**Usage:** `/enhance <app|track> "<description>"`
**Examples:**
- `/enhance rita "Add a volatility regime indicator to the market signals panel"`
- `/enhance fno "Add a net Greeks exposure summary to the portfolio overview"`
- `/enhance ops "Add a failed test trend chart to the test results section"`
- `/enhance ds "Feature 10 Phase 4 — extract ds.html inline scripts into dashboard/js/ds/ ES modules"`
- `/enhance core "Feature 32 Phase 3.5 — realign RIIATradingEnvV2 reward to optimise Sharpe>1 & MDD<10% (not profit); fix train/eval timing; golden env frozen"`
- `/enhance rl "Add a Differential Sharpe Ratio reward path to trading_env_v2 with a held-out test split"`

---

## How to Execute This Command

You are the orchestrator. Read these instructions fully before taking any action. Execute each step in sequence. Do not skip steps. Do not spawn the next agent until the current agent's section passes validation.

---

## Step 0 — Parse Arguments

Parse `$ARGUMENTS` to extract:
- `APP` — the first word (must be one of: `rita`, `fno`, `ops`, `ds`, `core`, `rl`, `ml`)
- `DESCRIPTION` — everything after the first word (strip surrounding quotes)

If `APP` is not one of the valid values, reply:
> "Unknown app '{APP}'. Valid: rita, fno, ops, ds (UI track) · core, rl, ml (Core/ML track). Usage: /enhance <app> \"<description>\""

Then stop.

**Determine `TRACK` from `APP` — this is the most important branch in the whole command:**

| `APP` value | `TRACK` | What the run builds |
|---|---|---|
| `rita`, `fno`, `ops`, `ds` | `ui` | A dashboard feature: API endpoint + JS module + HTML section |
| `core`, `rl`, `ml` | `core` | A change to `src/rita/core/` (or `services/`, `repositories/`) logic + tests — **no endpoint, no JS, no HTML required** |

`TRACK` selects which variant of Steps 3, 3.5, 4, 4.5, 5, 6 you run. **Each of those steps begins with a TRACK banner — when `TRACK = core`, follow the Core/ML variant in Appendix C for that step instead of the UI content.** Steps 0, 1, 2, 6.5, 7 are track-agnostic (with one Step-1a branch noted below).

**Routing table — select skill + spec based on APP:**

| APP | Skill file | Primary spec | Secondary spec |
|---|---|---|---|
| `rita` | `project-office/skills/skill-add-rita-feature.md` | `project-office/specs/Spec_RITA_App.md` | `project-office/specs/Spec_JS_Code.md` |
| `fno` | `project-office/skills/skill-add-fno-feature.md` | `project-office/specs/Spec_RITA_App.md` | `project-office/specs/Spec_JS_Code.md` |
| `ops` | `project-office/skills/skill-add-ops-feature.md` | `project-office/specs/Spec_RITA_App.md` | `project-office/specs/Spec_JS_Code.md` |
| `ds` | `project-office/skills/skill-add-ds-feature.md` | `project-office/specs/Spec_RITA_App.md` | `project-office/specs/Spec_JS_Code.md` |
| `core` / `rl` / `ml` | `project-office/skills/skill-add-core-feature.md` | `project-office/specs/Spec_Python_Code.md` | `project-office/specs/Spec_Data.md` |

Set:
- `SKILL_FILE` = skill file path from routing table
- `SPEC_FILE` = primary spec path
- `TIMESTAMP` = current datetime as `YYYYMMDD-HHMM`
- `BRIEF_PATH` = `project-office/task-briefs/task-brief-{TIMESTAMP}.md`
- `RUN_LOG_PATH` = `riia-ai-org/agent-ops/runs/run-{TIMESTAMP}.json`

Initialize in-memory tracking (carry these values forward through all steps):
- `AGENT_RESULTS` = empty list — each agent appends one record after validation
- `RUN_BRANCH` = "" — set by Engineer validation
- `RUN_WARNINGS` = [] — accumulates ⚠ warning strings
- `AGENT_USAGE` = {} — keyed by role; value = `{total_tokens: N, tool_uses: N}` parsed from the `<usage>` block in each agent result. Populate after every agent spawn.

**Usage parsing rule (apply after every agent spawn):**
The agent tool result contains a `<usage>` block like:
```
<usage>total_tokens: 22468
tool_uses: 3
duration_ms: 24311</usage>
```
After each agent completes, extract `total_tokens` and `tool_uses` from this block and store:
`AGENT_USAGE['{role}'] = { "total_tokens": N, "tool_uses": M }`
If no `<usage>` block appears in the result, store `null` for that role.

---

## Step 1 — Create Task Brief + Feature Folder

### Step 1a — Resolve the feature folder

**Branch on whether the description references an existing feature.**

First scan the description for an existing-feature reference: a token like `Feature NN`, `FNN`, `Phase N`, `continuation`, `resume`, `re-open`, or an explicit existing folder name. Search all month folders (`project-office/features/*/`) for a matching feature folder:
```bash
ls -d project-office/features/*/*/ | grep -iE '<feature-number-or-name from description>'
```

**Case A — existing feature referenced (reopen, do NOT mint a new number).** Common for `TRACK = core` continuation work.
- Set `FEATURE_FOLDER` = the matched existing folder (e.g. `project-office/features/Jun/32 riia-agent-performance-rl/`).
- Set `FEATURE_NUM` = that feature's existing number.
- Do **not** copy template stubs — the folder already has `REQUIREMENTS.md` / `PLAN_STATUS.md`. Instead, in `PLAN_STATUS.md` flip the relevant phase/overall status to `[~] reopened {TIMESTAMP[:8]}` and append a Session-Log row noting this `/enhance` run is reopening the feature. If the description names a phase/sub-task not yet in `REQUIREMENTS.md`, append it there.

**Case B — no existing feature referenced (auto-create new).** Default for fresh `TRACK = ui` features.
- Identify the next available feature number:
  ```bash
  ls project-office/features/May/ | grep -E '^[0-9]+' | sort -n | tail -1
  ```
  Set `FEATURE_NUM` = that number + 1 (zero-pad to 2 digits if ≤ 9).
- Set `FEATURE_FOLDER` = `project-office/features/May/{FEATURE_NUM} {APP}-{DESCRIPTION[:30].replace(' ','-').lower()}/`
- Create the folder and copy the three template stubs:
  ```bash
  mkdir -p "{FEATURE_FOLDER}"
  cp project-office/features/TEMPLATE/REQUIREMENTS.md "{FEATURE_FOLDER}/REQUIREMENTS.md"
  cp project-office/features/TEMPLATE/PLAN_STATUS.md  "{FEATURE_FOLDER}/PLAN_STATUS.md"
  cp project-office/features/TEMPLATE/eng-context.md  "{FEATURE_FOLDER}/eng-context.md"
  ```
- In `{FEATURE_FOLDER}/REQUIREMENTS.md` replace the title placeholders:
  - `Feature NN` → `Feature {FEATURE_NUM}`
  - `{Feature Name}` → `{APP} — {DESCRIPTION[:50]}`
  - `{YYYY-MM-DD}` → `{TIMESTAMP[:8]}` formatted as `YYYY-MM-DD`

Carry `FEATURE_FOLDER` and `FEATURE_NUM` forward — the Architect (core track) reads `{FEATURE_FOLDER}/REQUIREMENTS.md` for the design contract.

### Step 1b — Create Task Brief

Read `project-office/task-briefs/TEMPLATE.md`.

Create `{BRIEF_PATH}` by copying the template and filling in the header block:
- Replace `{timestamp}` with `{TIMESTAMP}`
- Replace `{YYYYMMDD-HHMM}` with `{TIMESTAMP}`
- Replace `{in-progress | complete | failed}` with `in-progress`
- Replace the `## Request` placeholder with the exact `DESCRIPTION` text
- Replace the `## App Target` placeholder with `{APP} (TRACK: {TRACK})`
- Replace the skill file path with `{SKILL_FILE}`
- Replace the spec references with the correct paths for `{APP}`

For `TRACK = core`, also add a line under `## App Target`: `Feature folder: {FEATURE_FOLDER}` so every agent can find the design contract (REQUIREMENTS.md) for the reopened feature.

Leave all agent sections (`[PM]`, `[Architect]`, `[Engineer]`, `[QA]`, `[TechWriter]`) as template placeholders — each agent will fill in its own section.

Report to user:
```
── Orchestrator ──────────────────────────────────────────
✓ App identified: {APP}   (TRACK: {TRACK})
✓ Skill selected: {SKILL_FILE}
✓ Feature folder: {FEATURE_FOLDER}
✓ Task brief created: {BRIEF_PATH}
─────────────────────────────────────────────────────────
```

---

## Step 2 — PM Agent

Spawn a `general-purpose` agent with this prompt:

```
You are the PM Agent for the RITA project.

Read these files:
1. PLAN_STATUS.md (first 80 lines only — for sprint context)
2. {BRIEF_PATH} (the ## Request and ## App Target sections)

Your job: validate that the requested feature fits the current sprint scope.

**Continuation run detection:** If the request contains words like "Phase 2", "Phase 3", "Run B", "continuation", "resume", or "part N", this is a multi-run feature. In this case, search `project-office/task-briefs/` for the most recently dated brief whose request matches this feature, then read its [Engineer] Implementation Log and [QA] Test Results sections. Include in your Dependencies field: "Prior run deliverables: [list what was merged, with commit hash]". This context ensures the Architect knows exactly what is already live and what remains to be built — omitting it causes scope drift and planning misses.

Write the [PM] Validation section into {BRIEF_PATH}. Fill in every field:
- Sprint alignment: state whether this is in scope for the current sprint and why
- Risk flags: list any technical risks, dependencies, or blockers you identify. Write "none" if there are none.
- Dependencies: list prerequisite tasks or external dependencies. Write "none" if there are none. For continuation runs, always list the prior run deliverables here.
- Cross-system scope check: state which dashboards/apps this feature touches beyond the primary target. For each dashboard not in the primary target (rita, fno, ops, ds), explicitly answer: "Does this feature affect [dashboard]? Yes/No — reason." If yes, flag it in Risk flags so the Architect includes it in files-to-touch.
- Approved to proceed: write "yes" or "no". Write "yes" unless there is a clear blocker (out of scope for sprint, hard dependency unmet, risk too high). Default to yes for reasonable feature additions.

Save the updated brief file after writing your section.
Report: "PM section complete. Approved: yes/no."
```

**After the PM agent completes:**

Read `{BRIEF_PATH}` — find the `[PM] Validation` section.
Check: does `Approved to proceed:` equal `yes`?

- If **yes**: report `✓ PM Agent — approved` and proceed to Step 3.
- If **no**: report the reason to the user and stop:
  > "Enhancement halted at PM validation. Reason: {reason from brief}. Resolve the blocker and re-run /enhance."

**Parse usage:** store `AGENT_USAGE['pm']` from the `<usage>` block in the PM agent result (see usage parsing rule in Step 0).

**Record PM agent result** (append to `AGENT_RESULTS`):
```json
{
  "role": "pm",
  "status": "<pass if approved=yes, else fail>",
  "steps_required": 4,
  "steps_completed": "<4 if approved=yes, else 3>",
  "adherence_score": "<steps_completed / 4>",
  "token_estimate": 22000,
  "actual_tokens": "<AGENT_USAGE['pm'] or null>",
  "grounding_checks": {
    "plan_status_read": true,
    "sprint_fit_confirmed": "<true if sprint alignment is stated>",
    "risk_flags_assessed": "<true if risk flags section is non-empty>",
    "approved": "<true or false>"
  },
  "failure_modes": []
}
```

---

## Step 3 — Architect Agent + TechWriter (Design Recording)

> **TRACK BRANCH — read first.** If `TRACK = core`, do NOT use the UI content in this step. Follow **Appendix C-3** (Architect, Core/ML variant) and **Appendix C-3.5** (validation gate, Core/ML variant), then run Step 3b (TechWriter recording) unchanged. If `TRACK = ui`, continue below.

### Step 3a — Architect Agent

Spawn a `Plan` agent with this prompt:

```
You are the Architect Agent for the RITA project.

Read these files in order:
1. {BRIEF_PATH} — focus on ## Request, ## App Target, ## Skill Selected
2. {SKILL_FILE} — read fully (endpoint inventory, module reference, code patterns, guardrails are all here)

Do NOT read spec files, HTML files, JS files, or Python source files. The skill file contains all the app context you need.

Your job: design the complete technical specification for this feature. You make design decisions — do not implement code and do not write files.

Produce a complete design covering all of the following. Output it clearly labelled so it can be recorded:

1. Feature summary: 1-2 sentences describing what the feature does for the user.

2. API contract: method, path, query params, request body, response shape (list every field the JS will read), auth required.
   - Choose the correct API tier: Experience tier for UI aggregation reads, Portfolio tier for FnO computation, System tier for raw CRUD.
   - Experience tier path format: /api/experience/{app}/feature-name
   - The path must not duplicate any existing endpoint in the spec.

3. Frontend target: JS module filename, section id (sec-name format), DOM element IDs the JS will target, window bindings needed.

4. Files to touch: list every file that must be created or modified, with a brief description of the change.

5. Edge cases to handle: list at least 2 (empty API response, null fields, API error).

6. Definition of Done checklist: the 8 items from the skill file for {APP} — mark none as checked (Engineer will check them).

Report: your complete design output. Do not write to any file.
```

**After the Architect agent completes:**

Capture the full design output returned by the Architect agent. Store it as `ARCHITECT_DESIGN`.

Validate `ARCHITECT_DESIGN` against these checks:

| Check | Pass condition |
|---|---|
| Feature summary present | Not empty |
| API contract present | Method, path, and at least 2 response fields |
| Frontend target present | JS module name, section id, at least 1 DOM id |
| Files to touch listed | At least 3 files |
| Edge cases listed | At least 2 edge cases |

- If **any fail**: re-invoke the Architect agent with:
  ```
  Your design output was incomplete. Missing: {list the failed checks}.
  Produce the complete design again covering all 6 sections. Do not write files.
  ```
  Re-validate. If it fails a second time, report to user and stop:
  > "Architect agent failed to produce a complete design after 2 attempts. Review the request and re-run /enhance."

### Step 3b — TechWriter (Record Architect Design)

Once `ARCHITECT_DESIGN` passes validation, spawn a `general-purpose` agent with this prompt:

```
You are the TechWriter Agent for the RITA project. You are recording a design produced by the Architect Agent into the task brief.

The Architect's design output is:

{ARCHITECT_DESIGN}

Write this into the [Architect] Design section of the task brief at {BRIEF_PATH}.

Replace the placeholder line "{to be filled by Architect Agent}" with the formatted [Architect] Design section. Use the table and checklist format from the template — structure the Architect's output into the correct fields (Feature summary, API contract table, Frontend target table, Files to touch table, Edge cases, Definition of Done checklist).

Do not add your own opinions or changes — record the Architect's design faithfully.

Save the updated brief file.
Report: "Architect design recorded into task brief."
```

**After TechWriter completes Step 3b:**

Report `✓ Architect Agent — design complete and recorded` and proceed to Step 3.5.

---

## Step 3.5 — Design Reviewer Agent

> **TRACK BRANCH.** If `TRACK = core`, use the Design-Review checklist in **Appendix C-3.5b** (Core/ML) instead of the UI checklist below — same PASS/FAIL gate mechanics and retry rules. If `TRACK = ui`, continue below.

Spawn a `general-purpose` agent with this prompt:

```
You are the Design Reviewer for the RITA project. Your mode is: Design Review.

Read these files in order:
1. {BRIEF_PATH} — read the ## Request section (the user's requirement) and the [Architect] Design section only.
2. project-office/guardrails/roles/reviewer.md — read fully before reviewing.
3. project-office/guardrails/project.md §1 — API tier routing rules.

Do NOT read source code, spec files, or JS files.

Your job: review the Architect's design against the stated requirements. Report findings only — do not propose alternative designs.

Run the Design Review checklist from reviewer.md:
1. Requirements coverage — does every stated requirement have a design element?
2. API contract completeness — method, path, response fields (≥2), tier placement declared?
3. Frontend contract completeness — JS module named, DOM IDs listed, all response fields the JS reads are in the response shape?
4. Files-to-touch completeness — backend + frontend + spec files all listed (≥3 files)?
5. Definition of Done populated — DoD checklist has real items, not template placeholders?

For each failed check, state: finding, severity (BLOCKING or ADVISORY), and rule cited.

Write the [Reviewer] Design Review section into {BRIEF_PATH}. Fill in all fields:
- Findings table (write "No findings" if all checks pass)
- Checklist with PASS/FAIL for each item
- Decision: PASS or FAIL with reason

Save the updated brief file.
Report: "Design Review complete. Status: PASS/FAIL. Blocking findings: N."
```

**After the Design Reviewer completes:**

Read `{BRIEF_PATH}` — find the `[Reviewer] Design Review` section. Check `Decision:` field.

- If **PASS**: report `✓ Design Review — PASS. Proceeding to Engineer.` and proceed to Step 4.
- If **FAIL** (first time): re-invoke the **Architect agent** with:
  ```
  The Design Reviewer found blocking issues with your design. Fix these before the Engineer can start:
  {paste the blocking findings list from the Design Review section}
  Produce the corrected design output. Do not write files.
  ```
  After Architect re-runs, re-run the TechWriter (Step 3b) to record the updated design, then re-run the Design Reviewer.
- If **FAIL** (second time): escalate to user:
  > "Design Review failed twice on the same issues. Please review the Architect design in {BRIEF_PATH} and resolve: {list blocking findings}. Re-run /enhance when ready."
  Stop.

**Record Design Reviewer result** (append to `AGENT_RESULTS`):
```json
{
  "role": "design_reviewer",
  "status": "<pass | fail>",
  "steps_required": 5,
  "steps_completed": "<count of checklist items that passed>",
  "adherence_score": "<steps_completed / 5>",
  "token_estimate": 8000,
  "actual_tokens": null,
  "grounding_checks": {
    "requirements_coverage": "<true/false>",
    "api_contract_complete": "<true/false>",
    "frontend_contract_complete": "<true/false>",
    "files_to_touch_complete": "<true/false>",
    "dod_populated": "<true/false>"
  },
  "failure_modes": ["DR-001 if requirements_coverage failed", "DR-002 if api_contract incomplete", "DR-003 if frontend_contract incomplete", "DR-004 if files incomplete", "DR-005 if dod not populated — use [] if none"]
}
```

---

**Parse usage:** store `AGENT_USAGE['architect']` from the `<usage>` block in the Architect agent result (Plan agents may not emit a usage block — store null if absent).

**Record Architect agent result** (append to `AGENT_RESULTS`):
```json
{
  "role": "architect",
  "status": "<pass if all 5 validation checks passed on first attempt, pass_with_warnings if passed on second attempt>",
  "steps_required": 4,
  "steps_completed": "<4 if all checks passed>",
  "adherence_score": "<steps_completed / 4>",
  "token_estimate": 22000,
  "actual_tokens": "<AGENT_USAGE['architect'] or null>",
  "grounding_checks": {
    "api_contract_present": "<true/false from validation>",
    "files_listed": "<true/false from validation>",
    "dod_checklist_filled": "<true/false from validation>",
    "spec_reference_valid": "<true/false from validation>"
  },
  "failure_modes": ["FC-002" if api_contract was missing on first attempt, else []]
}
```

---

## Step 4 — Engineer Agent

> **TRACK BRANCH.** If `TRACK = core`, use the Engineer prompt and validation gate in **Appendix C-4** (Core/ML) instead of the UI content below. The Step-4 user confirmation pause, branch/commit gates, and `RUN_BRANCH` assignment still apply identically. If `TRACK = ui`, continue below.

Spawn a `general-purpose` agent with `isolation: "worktree"` and this prompt:

```
You are the Engineer Agent for the RITA project. You are working in an isolated git worktree.

IMPORTANT — WORKTREE RULES:
- You are in a git worktree. Your working directory is the worktree root.
- All file reads and writes must use paths relative to your worktree root, or absolute paths within it.
- Do NOT write to files outside your worktree. Do not reference the parent repo's working directory.
- Run `git rev-parse --show-toplevel` first to confirm your worktree root path.
- Your branch name is the current branch in this worktree — run `git branch --show-current` to get it.

Read these files in order (use absolute paths from your worktree root):
1. {BRIEF_PATH} — focus on [Architect] Design section (API contract, files to touch, DoD checklist)
2. {SKILL_FILE} — read fully (all rules, guardrails, code templates, and Definition of Done)

Do NOT read HTML files, spec files, or other source files beyond the specific files you are editing. The skill file and task brief contain all the patterns and context you need.

Your job: implement the feature exactly as designed in the Architect section. Follow every rule in the skill file.

Implementation order:
1. Run `git rev-parse --show-toplevel` — confirm worktree root. All your edits go inside this path.
2. Run `git branch --show-current` — record your branch name.
3. Create the Pydantic schema file first (src/rita/schemas/) — inside the worktree
4. Add the backend endpoint (correct tier as per Architect design) — inside the worktree
5. Register the router in main.py only if you created a new router file
6. Create the JS module (dashboard/js/{APP}/) — inside the worktree
7. Register the section loader and window bindings in dashboard/js/{APP}/main.js
7b. **HTML files in the Architect's "Files to touch" table — do NOT skip them.**
    "Never read HTML" = no full-file Read. For each HTML file listed by the Architect:
    use Grep to find the sibling element ID near your insertion point, read ±15 lines
    around the match, then use targeted Edit to insert. A targeted Edit does not require
    reading the full file. Skipping a required HTML change is a partial implementation
    (FC-PARTIAL-IMPL) and will trigger re-invocation before QA.
7c. **Alembic migrations must be applied, not just created — hard gate.**
    If you created a migration file: run `python -m alembic upgrade head` from
    `riia-jun-release/` and confirm the output shows `Running upgrade {prev} -> {new}`.
    Only then stage and commit. Committing the file without applying it causes a runtime
    crash (`OperationalError: no such column`) visible to the user immediately on page load.
    **Worktree note:** you are in a worktree — `alembic upgrade head` here runs against
    the worktree's DB, NOT the user's live `rita_output/rita.db`. After merge, the
    orchestrator MUST tell the user: "This session added migration {revision} — run
    `python -m alembic upgrade head` from `riia-jun-release/` before restarting the app."
    Failure to surface this causes silent runtime breakage that damages user CSAT.
7d. **File move/relocation gate — copy is NOT a move.**
    If any file in the Architect's "Files to touch" table is described as "move", "relocate",
    or "rename": the operation MUST be: (1) write content to the new path, (2) update ALL
    references in other files to the new path, (3) delete the old file — `git rm <old_path>`
    for git-tracked files, or `rm <old_path>` for untracked. Leaving the original file in
    place is an incomplete move (FC-PARTIAL-IMPL). Confirm old path is gone before committing.
8. Update Spec_RITA_App.md — add the new endpoint to the correct tier table
9. Update Spec_JS_Code.md — add the new JS module to the {APP} module structure table
10. Run: ruff check src/ — fix any errors before proceeding

After all changes are made, commit them to your branch:
- Stage all changed files: `git add -p` or `git add <file>` for each file you modified
- Commit with message: `feat({APP}): {brief 1-line description of the feature}`
- Confirm the commit exists: `git log --oneline -3`

After committing, fill in the [Engineer] Implementation Log section of {BRIEF_PATH}:
- Branch: your branch name (from git branch --show-current)
- Worktree path: your worktree root (from git rev-parse --show-toplevel)
- Files changed: list every file you created or modified
- Commit hash: the short hash from git log --oneline -1
- API contract verified: yes/no
- Spec updated: yes/no
- Ruff result: passed/failed

Then go through the 8-item Definition of Done checklist from the Architect section — check each item.
Write the result (checked/unchecked) for each item in the Engineer section of the brief.

Do NOT mark the task complete if any DoD item is unchecked. Fix the gap first.

Save the updated brief file.
Report: "Engineer section complete. Branch: {branch}. Commit: {hash}. DoD: {n}/8 passed."
```

**After the Engineer agent completes:**

Read `{BRIEF_PATH}` — find the `[Engineer] Implementation Log` section. Check:

| Check | Pass condition |
|---|---|
| Branch present | Not empty, not "master" |
| Commit hash present | Not empty |
| Files changed listed | At least 2 files |
| Files count vs Architect | `N_actual >= N_expected × 0.7` |
| Ruff result | "passed" |
| Spec updated | "yes"; or "n/a" only if Architect listed zero spec rows in files-to-touch |

**Active spec verification (FC-001 guard — do not trust self-report alone):**
After reading `Spec updated: yes` from the brief, independently confirm by checking the actual spec file:
- Grep `project-office/specs/Spec_RITA_App.md` for the new endpoint path from the Architect's API contract
- If the path does NOT appear in the spec file: treat `spec_updated` as `false` and apply the blocking gate below — even if the brief says "yes"
- This closes the historical gap where engineers wrote "yes" in the brief without actually editing the spec file

**Files-count cross-check (FC-PARTIAL-IMPL gate):**
- Count rows in the Architect's "Files to touch" table from `{BRIEF_PATH}` → `N_expected`
- Count files in the Engineer's "Files changed" list → `N_actual`
- If `N_actual < N_expected × 0.7`: halt and report:
  > `⚠ Engineer delivered {N_actual} files but Architect listed {N_expected}. Gap: {list missing files}. Do not advance to QA — send Engineer back to complete the missing files.`
  Re-invoke the Engineer agent with the missing files list before proceeding.

- If **branch is master**: report error and stop — `Engineer agent wrote to master instead of a worktree branch. Do not proceed. Check worktree isolation.`
- If **commit hash missing**: report error and stop — `Engineer agent did not commit. Changes may be lost. Check worktree and commit manually.`
- If **ruff failed**: report as warning — `⚠ Engineer Agent — ruff errors present. Review before merging.` — add `"FC-003"` to Engineer failure_modes
- If **spec not updated** (includes "n/a" when Architect files-to-touch lists spec rows): **BLOCKING GATE** — do not advance to QA. Re-invoke the Engineer agent with this prompt:
  ```
  Your spec files were not updated. Fix this now before QA can proceed:
  1. Open project-office/specs/Spec_RITA_App.md — find the {APP} tier table — add the new endpoint row.
  2. Open project-office/specs/Spec_JS_Code.md — find the {APP} module structure section — add the new JS module row.
  3. Run: git add project-office/specs/Spec_RITA_App.md project-office/specs/Spec_JS_Code.md
  4. Commit: git commit -m "fix({APP}): update spec files for new endpoint"
  5. Report the exact line you added to each spec file.
  ```
  After re-invocation, add `"FC-001"` to Engineer failure_modes. Only then advance to QA.
- Otherwise: report `✓ Engineer Agent — implementation complete. Branch: {branch}. Commit: {hash}`

Set `RUN_BRANCH` = branch name from the Engineer section.

**Step 4 confirmation pause — wait for user before advancing to QA:**

Report the Engineer summary and wait for confirmation:

```
── Step 4 Complete — Engineer Agent ──────────────────────
  Branch:             {RUN_BRANCH}
  Commit:             {hash from Engineer section}
  Files changed:      {N_actual} (Architect expected: {N_expected})
    {list each file, one per line, indented}
  Spec updated:       {yes/no}
  Ruff:               {passed/failed}
  DoD items passed:   {n}/8

  Reply "ok" to advance to QA, or "stop" to halt and review.
─────────────────────────────────────────────────────────
```

**Wait for user reply before proceeding to Step 4.5.**
- If user replies **"stop"**: write run log as partial (`overall_status = "partial"`) and halt.
- If user replies **"ok"** (or any other reply): proceed to Step 4.5.

---

## Step 4.5 — Code Reviewer Agent

> **TRACK BRANCH.** If `TRACK = core`, use the Code-Review checklist in **Appendix C-4.5** (Core/ML) instead of the UI checklist below — same PASS/CONDITIONAL/FAIL gate and retry rules. If `TRACK = ui`, continue below.

Spawn a `general-purpose` agent with this prompt:

```
You are the Code Reviewer for the RITA project. Your mode is: Code Review.

Read these files in order:
1. {BRIEF_PATH} — read the ## Request section, [Architect] Design section, and [Engineer] Implementation Log section.
2. project-office/guardrails/roles/reviewer.md — read fully before reviewing.
3. project-office/guardrails/roles/engineer.md — the guardrails you will enforce.
4. project-office/guardrails/project.md — project-specific rules.
5. Read ONLY the files listed in the Engineer's "Files changed" table — do not read other source files.

Your job: verify that the implementation matches the architect's design and that engineer guardrails are followed. Report findings only — do not modify source files.

Run the Code Review checklist from reviewer.md:
1. Implementation matches design — endpoint path in code matches Architect's path? Response fields in handler return dict match Architect's response shape? DOM element IDs in JS match Architect's frontend target?
2. JS frontend contract — every field the JS reads is in the handler return dict? No query param echoed as a row field? No undefined values (only null as sentinel)?
3. Engineer guardrails — worktree branch used (not master)? Route in correct tier directory? No direct DB access in routes/services (ADR-002)? No print() statements? No hardcoded secrets or lot sizes? Ruff confirmed passed?
4. Spec updated — if a new endpoint was added, does it appear in the spec file? (Grep the spec file for the endpoint path to verify — do not trust the brief alone.)

For each failed check, state: file, line number or N/A, finding, severity (BLOCKING or ADVISORY), and rule cited.

Write the [Reviewer] Code Review section into {BRIEF_PATH}. Fill in all fields:
- Findings table (write "No findings" if all checks pass)
- Checklist with PASS/FAIL for each item
- Decision: PASS, CONDITIONAL (advisory only), or FAIL (blocking issues)

Save the updated brief file.
Report: "Code Review complete. Status: PASS/CONDITIONAL/FAIL. Blocking findings: N."
```

**After the Code Reviewer completes:**

Read `{BRIEF_PATH}` — find the `[Reviewer] Code Review` section. Check `Decision:` field.

- If **PASS** or **CONDITIONAL**: report `✓ Code Review — {status}. Proceeding to QA.` and proceed to Step 5.
- If **FAIL** (first time): re-invoke the **Engineer agent** with:
  ```
  The Code Reviewer found blocking issues with your implementation. Fix these before QA can proceed:
  {paste the blocking findings list from the Code Review section}
  Make the targeted fixes, commit to the same branch, and update the [Engineer] Implementation Log section.
  ```
  After Engineer re-runs, re-run the Code Reviewer.
- If **FAIL** (second time): escalate to user:
  > "Code Review failed twice on the same issues. Please review the Engineer implementation in branch {RUN_BRANCH} and resolve: {list blocking findings}. Re-run /enhance when ready."
  Stop.

**Record Code Reviewer result** (append to `AGENT_RESULTS`):
```json
{
  "role": "code_reviewer",
  "status": "<pass | conditional | fail>",
  "steps_required": 4,
  "steps_completed": "<count of checklist items that passed>",
  "adherence_score": "<steps_completed / 4>",
  "token_estimate": 12000,
  "actual_tokens": null,
  "grounding_checks": {
    "implementation_matches_design": "<true/false>",
    "js_contract_verified": "<true/false/na>",
    "engineer_guardrails_followed": "<true/false>",
    "spec_updated": "<true/false/na>"
  },
  "failure_modes": ["CR-001 if implementation_matches_design failed", "CR-002 if js_contract failed", "CR-003 if guardrails failed", "CR-004 if spec not updated — use [] if none"]
}
```

---

**Parse usage:** store `AGENT_USAGE['engineer']` from the `<usage>` block in the Engineer agent result.

**Record Engineer agent result** (append to `AGENT_RESULTS`):
```json
{
  "role": "engineer",
  "status": "<fail if branch=master or no commit; pass_with_warnings if ruff failed or spec not updated; pass otherwise>",
  "steps_required": 5,
  "steps_completed": "<count of checks that passed: branch_created, code_changed, spec_updated, ruff_passed, contract_matches_architect>",
  "adherence_score": "<steps_completed / 5>",
  "token_estimate": 55000,
  "actual_tokens": "<AGENT_USAGE['engineer'] or null>",
  "grounding_checks": {
    "branch_created": "<true if branch present and not master>",
    "code_changed": "<true if files_changed >= 2>",
    "spec_updated": "<true/false from brief>",
    "ruff_passed": "<true/false from brief>",
    "contract_matches_architect": "<true if no contract mismatch reported>"
  },
  "failure_modes": ["FC-001" if spec not updated, "FC-003" if ruff failed — use [] if none]
}
```

---

## Step 5 — QA Agent

> **TRACK BRANCH.** If `TRACK = core`, use the QA prompt in **Appendix C-5** (Core/ML) instead of the UI content below — it tests core/numerical behaviour and a design-contract check rather than an API-frontend contract. If `TRACK = ui`, continue below.

Spawn a `general-purpose` agent with this prompt:

```
You are the QA Agent for the RITA project.

Read these files:
1. {BRIEF_PATH} — read fully (all sections: Architect Design for contract + edge cases, Engineer log for files changed)
2. **File-path gate (prevents wrong patch targets):** For each Python file listed in the Engineer's "Files changed" section that is a schema (`src/rita/schemas/`) or endpoint handler (`src/rita/api/`): read that file now to verify exact class names, function names, and module import paths. Write down the verified paths before writing any test. A test that patches the wrong module path will always fail — reading the source is required, not optional.

Do NOT read HTML files or spec files.

Your job: write unit tests for the new endpoint and verify the API-frontend contract.

Tasks:
1. Write at least 1 unit test per new endpoint function. Place tests in tests/unit/.
   Test structure: happy path + at least 1 edge case from the Architect's edge cases list.
   Use pytest. Mock the database session where needed.
   **Patch path rule:** every `@patch('module.path.ClassName')` must match the exact import path of the class as used in the handler file you read in step 2 above. If unsure, grep the handler file for the import line.

2. Verify the API-frontend contract:
   - List every field in the Pydantic response schema
   - List every field the JS module reads from the response (from the JS file in files changed)
   - Check they match. Flag any mismatch as a failure.

3. Run the tests: pytest tests/unit/ -v
   Record: tests written, tests passed, any failures.

Fill in the [QA] Test Results section of {BRIEF_PATH}:
- Tests written: n
- Test file: path
- Tests passed: n/n
- Coverage delta: estimate from pytest output
- Contract check table: schema field vs handler return vs match
- Edge cases tested: list each from Architect section, note tested/not tested

Save the updated brief file.
Report: "QA section complete. Tests: {n}/{n} passed. Contract: match/mismatch."
```

**After the QA agent completes:**

Report `✓ QA Agent — {n} tests, {n} passed` (or flag failures as warnings).

**Parse usage:** store `AGENT_USAGE['qa']` from the `<usage>` block in the QA agent result.

**Record QA agent result** (append to `AGENT_RESULTS`):
```json
{
  "role": "qa",
  "status": "<pass if all tests passed and contract matched; pass_with_warnings if any test failed or mismatch found>",
  "steps_required": 4,
  "steps_completed": "<count: tests_written + tests_passed + coverage_delta_recorded + contract_check_done>",
  "adherence_score": "<steps_completed / 4>",
  "token_estimate": 65000,
  "actual_tokens": "<AGENT_USAGE['qa'] or null>",
  "grounding_checks": {
    "tests_written": "<true if tests_written > 0>",
    "tests_passed": "<true if all written tests passed>",
    "coverage_delta_recorded": "<true if coverage delta noted in brief>",
    "contract_check_done": "<true if contract check table present in brief>"
  },
  "failure_modes": ["FC-004" if contract mismatch found, else []]
}
```

---

## Step 6 — TechWriter Agent

> **TRACK BRANCH.** If `TRACK = core`, use the TechWriter task in **Appendix C-6** (Core/ML) — it confirms `Spec_Python_Code.md` + the feature design doc/REQUIREMENTS are current instead of a dashboard endpoint table. Confluence remains optional (n/a if key absent). If `TRACK = ui`, continue below.

Spawn a `general-purpose` agent with this prompt:

```
You are the TechWriter Agent for the RITA project.

Read these files in order:
1. {BRIEF_PATH} — read the full brief (all sections)
2. project-office/context/confluence-guide.md — for Confluence publish instructions

Your job: update the Confluence documentation for the affected app section and confirm the spec files are current.

Tasks:
1. Identify which Confluence page covers the {APP} dashboard. For engineering changes, use the Engineering page (ID 76611602). Refer to confluence-guide.md for the full page ID map.
2. Fetch the current page content using the ConfluenceClient from project-office/confluence/publish.py. The key file is at riia-cowork-aug-demo/confluence-api-key.txt — it contains the token on line 1 and the email on line 2. Always run Confluence scripts from the riia-cowork-aug-demo/ project root so the key file path resolves correctly. NOTE (Aug release): the secret is intentionally excluded from this workspace — if the key file is absent, record Confluence as "n/a — key not present in aug workspace" and continue (not a blocker, per Failure Rules).
3. Update the page to reflect the new feature: add a row to the endpoint table or a description of the new panel/DOM element.
4. Confirm that Spec_RITA_App.md and Spec_JS_Code.md already reflect the new endpoint and module (Engineer should have done this — if not, update them now).

Fill in the [TechWriter] Documentation section of {BRIEF_PATH}:
- Confluence page updated: URL of the page updated (or "n/a — reason" if not reachable)
- Page section modified: which section of the page was changed
- Spec file confirmed current: yes/no
- Task brief archived: yes (set the Status field at the top of the brief to "complete")

Save the updated brief file.
Report: "TechWriter section complete."
```

**After the TechWriter agent completes:**

Update `{BRIEF_PATH}` status field from `in-progress` to `complete`.

**Parse usage:** store `AGENT_USAGE['techwriter']` from the `<usage>` block in the TechWriter agent result. If Step 3b (TechWriter recording Architect design) also ran, add its tokens to the Step 6 TechWriter total.

**Record TechWriter agent result** (append to `AGENT_RESULTS`):
```json
{
  "role": "techwriter",
  "status": "<pass if confluence_updated and spec_file_confirmed; pass_with_warnings if confluence was n/a>",
  "steps_required": 3,
  "steps_completed": "<count: confluence_updated + spec_file_confirmed + branch_noted>",
  "adherence_score": "<steps_completed / 3>",
  "token_estimate": 38000,
  "actual_tokens": "<AGENT_USAGE['techwriter'] or null>",
  "grounding_checks": {
    "confluence_updated": "<true if Confluence page was updated or a valid n/a reason given>",
    "spec_file_confirmed": "<true if spec confirmed current in brief>",
    "branch_noted": "<true if branch name recorded in documentation>"
  },
  "failure_modes": ["FC-005" if spec_file_confirmed=false, else []]
}
```

---

## Step 6.5 — Merge Confirmation + Engineer Merge

After TechWriter completes, present the branch to the user and ask for confirmation before merging.

Report to user:
```
── Merge Review ──────────────────────────────────────────
  Branch: {RUN_BRANCH}
  Commit: {commit hash from Engineer section}
  Files changed: {file list from Engineer section}

  Review the branch above. Reply "merge" to merge into master, or "skip" to leave the branch open.
─────────────────────────────────────────────────────────
```

**Wait for user reply before proceeding.**

- If user replies **"skip"** (or anything other than "merge"): note in run log that merge was deferred. Proceed to Step 7.
- If user replies **"merge"**: spawn a `general-purpose` agent with this prompt:

```
You are the Engineer Agent for the RITA project. Your only job in this task is to merge a feature branch into master.

Branch to merge: {RUN_BRANCH}
Working directory: the main repo root (not a worktree)

Steps:
1. Run: git checkout master
2. Run: git merge --no-ff {RUN_BRANCH} -m "merge({APP}): {DESCRIPTION}"
3. Confirm the merge: git log --oneline -3
4. Report: "Merge complete. Commit: {merge commit hash}."
```

After the Engineer merge agent completes:
- Set `MERGE_STATUS` = `"merged"` and `MERGE_COMMIT` = the merge commit hash
- Report: `✓ Merge complete — {MERGE_COMMIT}`

If user replied "skip":
- Set `MERGE_STATUS` = `"deferred"`
- Report: `⚠ Merge deferred — branch {RUN_BRANCH} left open for manual review`

---

## Step 7 — Write Run Log

After all agents have completed and `AGENT_RESULTS` contains 5 records, write the run log JSON.

**Derive `overall_status`:**
- If any agent has `status = "fail"` → `"fail"`
- Else if any agent has `status = "pass_with_warnings"` → `"pass_with_warnings"`
- Else → `"pass"`

**Compute `total_tokens_estimated`:** sum all agent `token_estimate` values from `AGENT_RESULTS`.

**Compute `total_actual_tokens`:** sum all `actual_tokens.total_tokens` values from `AGENT_USAGE` (skip nulls). If zero agents have actual data, set to null.

**Compute `duration_minutes`:** elapsed time from Step 0 parse to now (estimate in whole minutes).

**Write `{RUN_LOG_PATH}`** with this structure (fill in all values from tracked state):

```json
{
  "run_id": "{TIMESTAMP}",
  "app": "{APP}",
  "request": "{DESCRIPTION}",
  "skill_file": "{SKILL_FILE}",
  "agents": {AGENT_RESULTS},
  "overall_status": "{derived above}",
  "total_tokens_estimated": {sum of token_estimate values},
  "total_actual_tokens": {sum of actual_tokens.total_tokens or null},
  "duration_minutes": {elapsed minutes},
  "branch": "{RUN_BRANCH}",
  "merge_status": "{MERGE_STATUS}",
  "merge_commit": "{MERGE_COMMIT | null if deferred}"
}
```

Report: `✓ Run log written: {RUN_LOG_PATH}`

**Write run to DB (non-blocking):**

Run from the repo root (`riia-cowork-aug-demo/`):
```
python riia-ai-org/agent-ops/write_run_to_db.py {RUN_LOG_PATH}
```
DB write failure is non-blocking — if the script exits 1, log a warning and continue. Do not halt the /enhance run.

**Regenerate `riia-ai-org/agent-ops/metrics.json`:**

Run from the repo root (`riia-cowork-aug-demo/`):
```
python riia-ai-org/agent-ops/aggregate_metrics.py
```

This reads all `runs/run-*.json` files and rewrites `metrics.json` with fresh aggregates. The Agent Builds dashboard reads `metrics.json` on next load — no further action needed.

Capture the stdout output. If any `[ALERT]` lines appear, collect them as `METRIC_ALERTS`.

Report: `✓ metrics.json regenerated`

If `METRIC_ALERTS` is non-empty, append to the final report:
```
⚠ aggregate_metrics.py flagged {N} alert(s):
  {list each alert line}

  Run /agent-performance-improvements to address these before the next /enhance run.
```

---

## Final Report

Report the completed run to the user:

```
── /enhance complete ─────────────────────────────────────
  App:         {APP}
  Request:     {DESCRIPTION}
  Branch:      {branch from Engineer section}
  Task brief:  {BRIEF_PATH}
  Run log:     {RUN_LOG_PATH}

  Agent results:
  ✓ PM Agent            — approved
  ✓ Architect Agent     — design complete
  ✓ Design Review       — {PASS | FAIL with N retry}
  ✓ Engineer Agent      — {n}/8 DoD items passed
  ✓ Code Review         — {PASS | CONDITIONAL | FAIL with N retry}
  ✓ QA Agent            — {n}/{n} tests passed
  ✓ TechWriter Agent    — docs updated
  ✓ Merge               — {merged: {MERGE_COMMIT} | deferred: branch left open}

  Overall status: {overall_status}
  Tokens (est):   ~{total_tokens_estimated}
  Tokens (actual): {total_actual_tokens | "not captured"}
  Duration:       {duration_minutes} min

  {list any ⚠ warnings here}

  Next step: review the branch and merge when ready.
─────────────────────────────────────────────────────────
```

---

## Failure Rules

- **Never auto-advance** past a failed validation gate. Read the section, check the conditions, decide explicitly.
- **PM blocks**: halt the entire run and tell the user why.
- **Architect incomplete after 2 attempts**: halt, tell user to complete manually.
- **Engineer branch missing**: halt.
- **Ruff failures, spec not updated**: warn but continue — these are quality issues, not blockers.
- **QA test failures**: warn and continue — tests are logged in the brief for the user to review.
- **TechWriter Confluence unreachable**: log as "n/a" and continue — not a blocker.
- **(Core track) Golden env edited**: BLOCKING — if the Engineer's diff touches `src/rita/core/trading_env.py` or any `rita_ddqn_model.zip` artifact, halt and send the Engineer back. The June-release golden model is frozen (see `skill-add-core-feature.md`).
- **(Core track) Tests missing**: a core change with no new/updated test in `tests/` is treated like "ruff failed" — warn loudly; if the change is to `core/` calculation/ML logic, escalate to BLOCKING and re-invoke the Engineer.

---

## Appendix C — Core/ML Track (used when `TRACK = core`)

This appendix replaces the UI content of Steps 3, 3.5, 4, 4.5, 5, 6 when `APP ∈ {core, rl, ml}`. The orchestration mechanics (validation gates, retry counts, user pauses, `AGENT_RESULTS` records, run log) are identical — only the agent prompts and the *content* of the checks change from "API endpoint + JS + HTML" to "core module + algorithm + tests".

The guiding contract for this track is **`project-office/skills/skill-add-core-feature.md`** (this is `{SKILL_FILE}` for the core track) plus **`{FEATURE_FOLDER}/REQUIREMENTS.md`** (the design contract for the reopened feature).

---

### Appendix C-3 — Architect Agent (Core/ML variant)

Spawn a `Plan` agent with this prompt:

```
You are the Architect Agent for the RITA project. This is a CORE/ML change (TRACK: core), not a dashboard feature — there is NO API endpoint, JS module, or HTML section to design unless the requirement explicitly asks for one.

Read these files in order:
1. {BRIEF_PATH} — focus on ## Request, ## App Target, ## Skill Selected
2. {SKILL_FILE} (skill-add-core-feature.md) — read fully (core module map, golden-frozen rule, repository pattern, test + numerical-validation conventions, the Sharpe>1 & MDD<10% objective)
3. {FEATURE_FOLDER}/REQUIREMENTS.md — the feature's objective, findings, and acceptance criteria (this is your design contract)

You make design decisions — do not implement code and do not write files.

Produce a complete design covering ALL of the following, clearly labelled so it can be recorded:

1. Feature summary: 1-2 sentences — what behaviour/metric changes and for whom.

2. Approach & algorithm: the concrete technical design. For an RL/ML change, state the math/formulation explicitly — reward terms (with formulas), observation/feature changes, training/evaluation changes, hyper-parameters touched, and WHY each change moves the graded objective (e.g. Sharpe>1 & MDD<10%, NOT profit). List at least 2 concrete, reviewable design decisions. If an API/UI surface IS genuinely required to expose results, specify it here; otherwise write "API/UI surface: none — core change only".

3. Module targets: every module/class/function that will change or be added, with the new/changed signature. Format: `path::symbol — what changes`. At least 1 module and 1 symbol.

4. Files to touch: list every file to create or modify, each with a one-line description. MUST include at least one source file under `src/rita/` AND at least one test file under `tests/`. Include the spec/doc files to update (`Spec_Python_Code.md` and any design doc under `docs/`).

5. Edge cases / numerical risks: at least 2 (e.g. empty/short data window, NaN indicators, divide-by-zero in a ratio, train/eval distribution mismatch, non-determinism).

6. Definition of Done checklist: the items from skill-add-core-feature.md for a core change — mark none as checked (Engineer will check them). MUST include the golden-frozen guard item.

Report: your complete design output. Do not write to any file.
```

**After the Architect agent completes:** capture the full output as `ARCHITECT_DESIGN` and proceed to the Core validation gate (Appendix C-3.5).

---

### Appendix C-3.5 — Architect validation gate (Core/ML variant)

Validate `ARCHITECT_DESIGN` against these checks (this REPLACES the UI gate's API/frontend checks):

| Check | Pass condition |
|---|---|
| Feature summary present | Not empty |
| Approach & algorithm present | At least 2 concrete design decisions; for an RL/ML reward change, at least one explicit formula or rule |
| Module targets present | At least 1 `path::symbol` with a signature/behaviour change |
| Files to touch listed | At least 2 files, including ≥1 under `src/rita/` AND ≥1 under `tests/` |
| Edge cases listed | At least 2 numerical/data edge cases |
| Objective alignment stated | The design says how the change moves the graded metric (e.g. Sharpe/MDD), not just "improves performance" |

- If **any fail**: re-invoke the Architect agent with the failed checks listed; re-validate. Second failure → escalate to user and stop (same wording as the UI gate, substituting "design" appropriately).
- On pass: run **Step 3b (TechWriter — Record Architect Design)** exactly as written in the main flow (it is track-agnostic — it just records `ARCHITECT_DESIGN` into the `[Architect] Design` section of the brief), then proceed to Step 3.5 using **Appendix C-3.5b**.

Record the Architect `AGENT_RESULTS` entry as in the main flow, but set `grounding_checks` to: `{ "approach_present": ..., "module_targets_present": ..., "files_listed": ..., "objective_alignment_stated": ... }`.

---

### Appendix C-3.5b — Design Reviewer checklist (Core/ML variant)

Spawn the Design Reviewer `general-purpose` agent exactly as in Step 3.5, but replace the checklist in its prompt with:

```
Run the Core/ML Design Review checklist:
1. Requirements coverage — does every requirement/finding in {FEATURE_FOLDER}/REQUIREMENTS.md have a design element?
2. Objective alignment — does the design target the GRADED metric (e.g. Sharpe>1 & MDD<10%), and explicitly NOT profit-maximisation? Flag any reward/term that optimises the wrong objective.
3. Approach soundness — is the algorithm/formulation internally consistent and reviewable (formulas/rules stated, not hand-waved)? Are train and eval consistent (no train/serve skew)?
4. Golden-frozen safety — does the design avoid editing src/rita/core/trading_env.py or any golden model artifact? (New work must live in a parallel module, e.g. *_v2.)
5. Files-to-touch completeness — source (≥1 under src/rita/) + tests (≥1 under tests/) + spec/doc all listed?
6. Definition of Done populated — real items incl. the golden-frozen guard, not template placeholders?
```

Same PASS/FAIL decision, retry-once-then-escalate mechanics, and `AGENT_RESULTS` recording as the UI Step 3.5 (use `failure_modes` DR-001..DR-006 mapping to the six checks above).

---

### Appendix C-4 — Engineer Agent (Core/ML variant)

Spawn a `general-purpose` agent with `isolation: "worktree"` and this prompt:

```
You are the Engineer Agent for the RITA project, working in an isolated git worktree. This is a CORE/ML change (TRACK: core).

IMPORTANT — WORKTREE RULES (identical to the UI track):
- Run `git rev-parse --show-toplevel` first — all edits stay inside this worktree root.
- Run `git branch --show-current` — record your branch name (must not be master/main).

Read these files in order:
1. {BRIEF_PATH} — focus on [Architect] Design (Approach & algorithm, Module targets, Files to touch, DoD)
2. {SKILL_FILE} (skill-add-core-feature.md) — read fully (golden-frozen rule, core module map, repository pattern, ruff + test + numerical-validation conventions)
3. {FEATURE_FOLDER}/REQUIREMENTS.md — acceptance criteria you must satisfy

Your job: implement the core change exactly as designed. Follow every rule in the skill file.

Implementation order:
1. Confirm worktree root and branch.
2. **Golden-frozen guard — do this BEFORE editing anything.** You may NOT modify src/rita/core/trading_env.py or any rita_ddqn_model.zip. New behaviour goes in a parallel module (e.g. trading_env_v2.py) or a clearly additive function. If the design appears to require editing the golden file, STOP and report — do not edit it.
3. Implement the source change under src/rita/ per the Module targets table (correct layer: core/ for calculation/ML, services/ for orchestration, repositories/ for data access — no direct DB/file I/O in routes/services per ADR-002).
4. Add or extend unit tests under tests/ that assert the new BEHAVIOUR/numerics — not just that it imports. For an RL reward change, include at least one test that pins the intended property (e.g. causal train/eval alignment; the MDD penalty engages at the constraint; reward sign under a known input).
5. Run `python -m pytest <your new/changed test files> -q` from riia-jun-release/ — all must pass.
6. Run `ruff check src/` — fix any errors.
7. If you added/changed a migration, apply it (`python -m alembic upgrade head` from riia-jun-release/) and surface the revision for the post-merge note — same hard gate as the UI track.
8. Update project-office/specs/Spec_Python_Code.md (and any docs/ design doc named in Files-to-touch) to reflect the change.

Commit to your branch:
- Stage each changed file; commit `feat(core): {1-line description}`; confirm with `git log --oneline -3`.
- Run `git diff --name-only master...HEAD` (or against the base) and CONFIRM trading_env.py / golden artifacts are NOT in the list. Paste this list into your log.

Fill in the [Engineer] Implementation Log section of {BRIEF_PATH}:
- Branch / Worktree path / Files changed / Commit hash
- Tests added: list test names + pass count (n/n)
- Ruff result: passed/failed
- Golden-frozen confirmed: yes (paste the changed-file list proving trading_env.py is untouched)
- Spec/doc updated: yes/no

Then check each DoD item from the Architect section. Do not mark complete with any item unchecked.

Save the brief. Report: "Engineer section complete. Branch: {branch}. Commit: {hash}. Tests: {n}/{n}. Golden-frozen: yes/no. DoD: {n}/{n} passed."
```

**After the Engineer completes — Core validation gate** (replaces the UI files/spec checks):

| Check | Pass condition |
|---|---|
| Branch present | Not empty, not master/main |
| Commit hash present | Not empty |
| Files changed listed | ≥2, including ≥1 under `src/rita/` and ≥1 under `tests/` |
| Tests added & passing | ≥1 new/changed test, all passing (if failing → warn, log to brief) |
| Ruff result | "passed" (else warn, add FC-003) |
| Golden-frozen confirmed | `trading_env.py` and golden `.zip` NOT in the changed-file list — **BLOCKING if violated**: re-invoke Engineer to revert the golden edit |
| Spec/doc updated | "yes"; independently confirm by grepping `Spec_Python_Code.md` (or the named design doc) for the changed symbol — same FC-001 self-report guard as the UI track |

Branch=master, missing commit → halt (same as UI). Then apply the **Step-4 confirmation pause** (present the Engineer summary, wait for "ok"/"stop") exactly as in the main flow, set `RUN_BRANCH`, and record the Engineer `AGENT_RESULTS` entry with core `grounding_checks`: `{ branch_created, tests_added_passing, ruff_passed, golden_frozen_confirmed, spec_updated }`.

---

### Appendix C-4.5 — Code Reviewer checklist (Core/ML variant)

Spawn the Code Reviewer `general-purpose` agent as in Step 4.5, but read `engineer.md` + `project.md` + `skill-add-core-feature.md` and ONLY the files in the Engineer's changed list, and run this checklist:

```
Run the Core/ML Code Review checklist:
1. Implementation matches design — do the changed symbols/signatures match the Architect's Module targets? Does the algorithm/reward in code match the formulas in the design?
2. Objective alignment in code — does the implemented reward/metric optimise the graded objective (Sharpe/MDD), with no leftover profit-maximising term contradicting it?
3. Train/eval consistency — for an RL change, is the data/return alignment the SAME in training and evaluation/inference (no contemporaneous-vs-next-bar skew)?
4. Golden-frozen — confirm via the changed-file list / git that trading_env.py and golden artifacts are untouched.
5. Engineer guardrails — worktree branch (not master); correct layer (core/services/repositories per ADR-002); no print(); no hardcoded secrets/lot sizes; ruff passed.
6. Tests present & meaningful — at least one test asserts the new behaviour/property, not just import; spec/doc updated (grep to verify).
```

Same PASS/CONDITIONAL/FAIL decision and retry mechanics as UI Step 4.5; `failure_modes` CR-001..CR-006 map to the checks above; CR-004 reserved for golden-frozen violation (treat as BLOCKING).

---

### Appendix C-5 — QA Agent (Core/ML variant)

Spawn a `general-purpose` agent with this prompt:

```
You are the QA Agent for the RITA project. This is a CORE/ML change (TRACK: core) — there is no API-frontend contract to check; you verify BEHAVIOUR and numerics.

Read these files:
1. {BRIEF_PATH} — read fully (Architect Approach & algorithm + edge cases; Engineer Files changed + tests added)
2. {FEATURE_FOLDER}/REQUIREMENTS.md — the acceptance criteria the change must meet
3. The specific source files in the Engineer's "Files changed" list (read them to get exact symbol names/signatures before writing tests — a test importing the wrong path always fails)

Your job:
1. Write/extend unit tests in tests/ that cover: the happy path + at least 1 edge case from the Architect's list + at least 1 test that pins the change's intended PROPERTY (e.g. for a reward change: the penalty engages at the MDD constraint; train and eval use the same return alignment; reward monotonicity/sign under a constructed input). Use pytest; build small synthetic DataFrames/arrays rather than relying on full datasets where possible; seed any RNG for determinism.
2. Design-contract check (replaces the API-frontend contract): list the symbols/signatures the Architect specified in Module targets, and confirm the implemented code exposes exactly those (name, args, return shape). Flag any mismatch as a failure.
3. Run: pytest tests/unit/ -q (plus any new test path). Record tests written, passed, failures.

Fill in the [QA] Test Results section of {BRIEF_PATH}:
- Tests written: n / Test file: path / Tests passed: n/n
- Coverage delta: estimate from pytest output
- Design-contract table: Architect symbol vs implemented symbol vs match
- Edge/property cases tested: list each, note tested/not tested
- Acceptance-criteria check: for each acceptance criterion in REQUIREMENTS.md that is testable now, note met / not-yet / needs-training-run

Save the brief. Report: "QA section complete. Tests: {n}/{n} passed. Design-contract: match/mismatch."
```

After QA completes, record the QA `AGENT_RESULTS` entry as in the UI flow, with `grounding_checks`: `{ tests_written, tests_passed, design_contract_done, acceptance_checked }`. FC-004 = design-contract mismatch.

---

### Appendix C-6 — TechWriter Agent (Core/ML variant)

Spawn a `general-purpose` agent with this prompt:

```
You are the TechWriter Agent for the RITA project. This is a CORE/ML change (TRACK: core).

Read these files in order:
1. {BRIEF_PATH} — the full brief
2. project-office/context/confluence-guide.md — Confluence publish instructions (optional)

Tasks:
1. Confirm project-office/specs/Spec_Python_Code.md reflects the changed/added core symbols (the Engineer should have done this — if not, update it now).
2. Confirm any design doc under docs/ named in the brief's Files-to-touch is current (e.g. the RL design doc reflects the new reward/algorithm). Update {FEATURE_FOLDER}/PLAN_STATUS.md: mark the worked tasks done and add a Session-Log row for this /enhance run (branch + commit).
3. Confluence (optional): if the Engineering page is relevant AND project-office/confluence-api-key.txt exists, update it. If the key file is absent (expected in the aug workspace), record "n/a — key not present in aug workspace" and continue.

Fill in the [TechWriter] Documentation section of {BRIEF_PATH}:
- Spec file confirmed current: yes/no (Spec_Python_Code.md)
- Design doc / PLAN_STATUS updated: yes/no — which files
- Confluence page updated: URL or "n/a — reason"
- Task brief archived: yes (set the brief Status to "complete")

Save the brief. Report: "TechWriter section complete."
```

After completion, set the brief Status to `complete` and record the TechWriter `AGENT_RESULTS` entry with `grounding_checks`: `{ spec_file_confirmed, design_doc_updated, confluence_updated }`.
