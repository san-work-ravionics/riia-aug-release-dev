#!/usr/bin/env bash
# Source this before running anything in the aug workspace:
#     source activate-aug.sh
#
# Why: the shared Python env (py-shared-env) has `rita` installed as an EDITABLE
# package pointing at the JUN-demo source (__editable__.rita-1.0.0.pth). So a
# plain `import rita` would run jun/golden code. Prepending the aug src to
# PYTHONPATH makes `import rita` resolve to THIS workspace instead — keeping all
# training/experiments isolated from jun-demo / the golden version.

AUG_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
export AUG_ROOT
export PYTHONPATH="$AUG_ROOT/riia-jun-release/src:$PYTHONPATH"
export PY="/Users/sgawde/work/py-shared-env/dev/bin/python3"

echo "aug workspace active:"
echo "  AUG_ROOT   = $AUG_ROOT"
echo "  PYTHONPATH = aug src takes precedence over jun editable install"
echo "  python     = \$PY ($PY)"
echo "Verify isolation:  \$PY -c 'import rita.core.trading_env_v2 as m; print(m.__file__)'"
