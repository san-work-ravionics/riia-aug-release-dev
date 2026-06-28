# riia-cowork-aug-demo — August RL workspace

Isolated workspace for **Feature 32 Phases 3–5** (RL training: `RIIATradingEnvV2`,
hedge advisor, closed-loop retraining). Created 2026-06-27 by copying the
essential components out of `riia-cowork-jun-demo`.

**jun-demo is the golden version and MUST stay untouched.** Nothing here writes
back to jun-demo. This folder will become its own git repo (`*-aug-demo`).

## What was copied (and what was NOT)

Copied: `riia-jun-release/` (app code incl. the uncommitted Phase 3 work —
`core/trading_env_v2.py`, the `hedge_advice` intent, `ml_dispatch` V2 branch,
tests, `docs/design-RIIATradingEnvV2-phase3.md`), `project-office/`, `CLAUDE.md`,
`.gitignore`, plus `data/` and `models/` needed to train.

**Excluded (deliberately):** all `.git/` (this is a fresh repo — no jun history,
no prod remote), **secrets** (`git-key.txt`, `confluence-api-key.txt`, `.env`,
`terraform/generated-key.pem`), `terraform/` + `.github/` (prod infra/CI),
`logs/`, and caches. A new `.env` must be created locally if needed.

## Isolation — IMPORTANT before running anything

The shared Python env (`py-shared-env`) has `rita` installed as an **editable
package pointing at jun-demo's src**. A plain `import rita` therefore runs
JUN/golden code. To run *this* workspace's code:

```bash
source activate-aug.sh        # prepends aug src to PYTHONPATH
$PY -c 'import rita.core.trading_env_v2 as m; print(m.__file__)'   # must show .../aug-demo/...
```

## Running the Phase 3 training (isolated)

- Use `model_version="rita_ddqn_v2"` so `ml_dispatch` routes to `RIIATradingEnvV2`
  and the artifact is `rita_ddqn_v2_<run>.zip` (never overwrites golden).
- Point the training `output_dir` at a path **inside this workspace** so new
  models land here, not in jun-demo.
- Models created here are isolated; jun-demo's `rita_ddqn_model.zip` is never read
  or written by V2 training.

## Status (as of copy)

Phase 3 **code is complete and unit-tested** (15 V2 tests green). Only the actual
SB3 **training run + backtest comparison** (task 3.3) remains — run it here.
See `project-office/features/Jun/32 riia-agent-performance-rl/PLAN_STATUS.md`.
