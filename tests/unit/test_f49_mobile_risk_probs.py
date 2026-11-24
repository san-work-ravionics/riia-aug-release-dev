"""
Feature 49 — FnO Mobile Risk Empirical Probabilities (P(1σ)/P(2σ)/P(3σ))
=========================================================================
Static analysis tests for the mobile single-file PWA change in
``mobileapp/fno.html``.  There is no Python code to run, so all assertions
are file-read + string-search checks against the HTML/JS source.

API-frontend contract being verified
--------------------------------------
The ``portfolio-analytics`` endpoint already returns
``positions[i].prob_exceed_1s``, ``positions[i].prob_exceed_2s``, and
``positions[i].prob_exceed_3s`` (deployed in F44 P4d, v2.0.8).
``renderRisk(data)`` in the inline <script> block must read those three
fields from ``data.positions[]`` (NOT from ``data.greeks``) and render them
as stat rows labelled ``P(1σ)``, ``P(2σ)``, ``P(3σ)`` via ``fmtProb``.
"""

import pathlib
import pytest

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_REPO = pathlib.Path(__file__).parents[2]   # riia-aug-release root
_FNO_HTML = _REPO / "mobileapp" / "fno.html"


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------
def _src() -> str:
    """Return the full text of mobileapp/fno.html (cached for the session)."""
    return _FNO_HTML.read_text(encoding="utf-8")


# ===========================================================================
# 1. File existence
# ===========================================================================
def test_fno_html_exists():
    """mobileapp/fno.html must be present (sanity gate)."""
    assert _FNO_HTML.exists(), f"Expected file not found: {_FNO_HTML}"


# ===========================================================================
# 2. fmtProb helper — existence and correct null guard
# ===========================================================================
def test_fmtProb_helper_defined():
    """fmtProb function must be defined in the inline script block."""
    src = _src()
    assert "function fmtProb(" in src, "fmtProb helper function not found in fno.html"


def test_fmtProb_null_guard_uses_not_null():
    """fmtProb must guard with 'v != null' (catches both null and undefined)."""
    src = _src()
    assert "v != null" in src, (
        "fmtProb null guard 'v != null' not found — must reject null AND undefined"
    )


def test_fmtProb_fallback_dash():
    """fmtProb must return the em-dash '—' as the fallback for null/undefined."""
    src = _src()
    # The em-dash character used as fallback
    assert "'—'" in src, "fmtProb fallback '—' not found in fno.html"


def test_fmtProb_percentage_format():
    """fmtProb must format valid values as one-decimal percentage strings."""
    src = _src()
    assert "toFixed(1) + '%'" in src, (
        "fmtProb percentage format 'toFixed(1) + \\'%\\'' not found in fno.html"
    )


# ===========================================================================
# 3. probMap built from data.positions, NOT data.greeks
# ===========================================================================
def test_probMap_built_from_positions():
    """probMap must be populated by iterating data.positions (not data.greeks)."""
    src = _src()
    # The assignment 'var positions = data.positions || [];' must exist inside renderRisk
    assert "data.positions || []" in src, (
        "'data.positions || []' guard not found — renderRisk must read positions with || [] fallback"
    )
    # probMap must be initialised as an empty object
    assert "var probMap = {};" in src, "probMap initialisation 'var probMap = {};' not found"


def test_probMap_iterates_positions_not_greeks():
    """The forEach loop that fills probMap must iterate positions, not greeks."""
    src = _src()
    # Look for the positions.forEach block that checks prob_exceed_1s
    assert "positions.forEach(function(p)" in src, (
        "positions.forEach loop not found — probMap must be built from positions array"
    )


def test_probMap_uses_prob_exceed_1s_guard():
    """probMap entry must only be set when prob_exceed_1s is not null."""
    src = _src()
    assert "p.prob_exceed_1s != null" in src, (
        "Guard 'p.prob_exceed_1s != null' not found — probMap must skip entries with null probabilities"
    )


# ===========================================================================
# 4. All three prob_exceed_* fields consumed
# ===========================================================================
def test_prob_exceed_1s_referenced():
    """prob_exceed_1s must be referenced in fno.html."""
    src = _src()
    assert "prob_exceed_1s" in src, "Field prob_exceed_1s not found in fno.html"


def test_prob_exceed_2s_referenced():
    """prob_exceed_2s must be referenced in fno.html."""
    src = _src()
    assert "prob_exceed_2s" in src, "Field prob_exceed_2s not found in fno.html"


def test_prob_exceed_3s_referenced():
    """prob_exceed_3s must be referenced in fno.html."""
    src = _src()
    assert "prob_exceed_3s" in src, "Field prob_exceed_3s not found in fno.html"


def test_probMap_stores_all_three_sigma_fields():
    """probMap entry must store p1/p2/p3 from all three prob_exceed_* fields."""
    src = _src()
    assert "p1: p.prob_exceed_1s" in src, "probMap p1 assignment not found"
    assert "p2: p.prob_exceed_2s" in src, "probMap p2 assignment not found"
    assert "p3: p.prob_exceed_3s" in src, "probMap p3 assignment not found"


# ===========================================================================
# 5. Stat row labels P(1σ), P(2σ), P(3σ) exist in generated HTML
# ===========================================================================
def test_p1_sigma_stat_row_label():
    """The P(1σ) label must appear in the stat row markup."""
    src = _src()
    assert "P(1σ)" in src, "Stat row label 'P(1σ)' not found in fno.html"


def test_p2_sigma_stat_row_label():
    """The P(2σ) label must appear in the stat row markup."""
    src = _src()
    assert "P(2σ)" in src, "Stat row label 'P(2σ)' not found in fno.html"


def test_p3_sigma_stat_row_label():
    """The P(3σ) label must appear in the stat row markup."""
    src = _src()
    assert "P(3σ)" in src, "Stat row label 'P(3σ)' not found in fno.html"


# ===========================================================================
# 6. Styling — stat-val neu class used for probability values
# ===========================================================================
def test_prob_rows_use_stat_val_neu_class():
    """Probability stat values must use the 'stat-val neu' CSS class (muted grey — informational)."""
    src = _src()
    assert 'class="stat-val neu"' in src, (
        "'stat-val neu' class not found — probability values must use the neutral/muted style"
    )


# ===========================================================================
# 7. Null safety — probs && probs.pN short-circuit passed to fmtProb
# ===========================================================================
def test_null_safe_probs_lookup_p1():
    """probs && probs.p1 short-circuit must be passed to fmtProb (handles undefined underlying)."""
    src = _src()
    assert "probs && probs.p1" in src, (
        "Null-safe lookup 'probs && probs.p1' not found — fmtProb call must guard against undefined probMap entry"
    )


def test_null_safe_probs_lookup_p2():
    """probs && probs.p2 short-circuit must be passed to fmtProb."""
    src = _src()
    assert "probs && probs.p2" in src, (
        "Null-safe lookup 'probs && probs.p2' not found"
    )


def test_null_safe_probs_lookup_p3():
    """probs && probs.p3 short-circuit must be passed to fmtProb."""
    src = _src()
    assert "probs && probs.p3" in src, (
        "Null-safe lookup 'probs && probs.p3' not found"
    )


# ===========================================================================
# 8. renderRisk function — existence check
# ===========================================================================
def test_renderRisk_function_defined():
    """renderRisk(data) function must exist in fno.html."""
    src = _src()
    assert "function renderRisk(data)" in src, "renderRisk(data) function not found in fno.html"


def test_renderRisk_reads_greeks_from_data():
    """renderRisk still reads data.greeks (pre-existing Greeks rows must be intact)."""
    src = _src()
    assert "data.greeks" in src, (
        "data.greeks not found in renderRisk — existing Greeks rows must still be populated"
    )
