// ── Invest Game App — CRISP-DM ───────────────────────────────────────────────
// Ported from ds/concepts.js — the 6-phase CRISP-DM methodology tabs.
import { api } from '../shared/api.js';
import { mkChart, C } from '../shared/charts.js';
import { setEl } from '../shared/utils.js';

const _LEG = { labels: { font: { family: "'IBM Plex Mono'", size: 10 }, color: '#4A4640' } };
const _M9  = { font: { family: "'IBM Plex Mono'", size: 9 } };

function _mkScales(extraX = {}, extraY = {}) {
  return {
    x: { grid: { color: 'rgba(0,0,0,.04)' }, ticks: { font: { family: "'IBM Plex Mono'", size: 9 }, color: '#8C877A', maxTicksLimit: 10 }, ...extraX },
    y: { grid: { color: 'rgba(0,0,0,.04)' }, ticks: { font: { family: "'IBM Plex Mono'", size: 9 }, color: '#8C877A' }, ...extraY }
  };
}

function _num(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function _set(id, v) {
  const e = document.getElementById(id);
  if (e) e.textContent = v;
}

function _fmt(v, dec = 2) {
  if (v == null || v === '') return '—';
  const n = parseFloat(v);
  return isNaN(n) ? String(v) : n.toFixed(dec);
}

function _fmtPct(v, dec = 1) {
  if (v == null) return '—';
  return parseFloat(v).toFixed(dec) + '%';
}

function _thin(labels, ...arrays) {
  const n = labels.length;
  const maxPts = 300;
  if (n <= maxPts) return [labels, ...arrays];
  const step = Math.ceil(n / maxPts);
  const idx = labels.map((_, i) => i).filter(i => i % step === 0);
  return [idx.map(i => labels[i]), ...arrays.map(a => idx.map(i => a[i]))];
}

export function switchCrispTab(phase, el) {
  document.querySelectorAll('.crisp-tab').forEach(t => t.classList.remove('active'));
  el?.classList.add('active');
  document.querySelectorAll('.crisp-panel').forEach(p => p.classList.add('hidden'));
  const panel = document.getElementById('crisp-' + phase);
  if (panel) panel.classList.remove('hidden');
}

export async function loadCrispDm() {
  const statusEl = document.getElementById('crisp-status');
  if (statusEl) statusEl.innerHTML = 'Loading NIFTY...';

  try {
    const [perfRes, btdRes, histRes, shapRes] = await Promise.allSettled([
      api('/api/v1/performance-summary'),
      api('/api/v1/experience/rita/backtest-daily?instrument=NIFTY'),
      api('/api/v1/experience/rita/training-history?instrument=NIFTY'),
      api('/api/v1/shap'),
    ]);

    const perf = perfRes.status === 'fulfilled' ? perfRes.value : null;
    const btd  = btdRes.status === 'fulfilled' ? btdRes.value : null;
    const hist = histRes.status === 'fulfilled' && Array.isArray(histRes.value) ? histRes.value : [];
    const shap = shapRes.status === 'fulfilled' ? shapRes.value : null;

    if (statusEl) statusEl.textContent = '';

    _renderPhase1(perf, btd);
    _renderPhase4(shap, hist);
    _renderPhase5(hist, btd);
  } catch (e) {
    if (statusEl) statusEl.textContent = 'Failed to load data';
  }
}

// Phase 1 — Business Understanding
function _renderPhase1(perf, btd) {
  const p      = perf?.performance || perf || {};
  const sharpe = parseFloat(p.sharpe_ratio ?? p.sharpe ?? 0) || 0;
  const mdd    = Math.abs(parseFloat(p.max_drawdown_pct ?? p.max_drawdown ?? 0)) || 0;
  const ret    = parseFloat(p.portfolio_total_return_pct ?? p.total_return_pct ?? p.total_return ?? 0) || 0;
  const winRt  = parseFloat(p.win_rate_pct ?? p.win_rate ?? 0) || 0;

  _set('crisp-p1-sharpe', _fmt(sharpe, 2));
  _set('crisp-p1-mdd', _fmt(mdd, 1) + '%');
  _set('crisp-p1-ret', _fmtPct(ret, 1));
  _set('crisp-p1-wr', _fmtPct(winRt, 1));

  mkChart('crisp-p1-c1', {
    type: 'bar',
    data: {
      labels: ['Achieved', 'Target'],
      datasets: [{ label: 'Sharpe Ratio', data: [sharpe, 1.0],
        backgroundColor: [sharpe >= 1.0 ? 'rgba(26,107,60,.12)' : 'rgba(155,28,28,.12)', 'rgba(0,86,184,.12)'],
        borderColor: [sharpe >= 1.0 ? C.build : C.danger, C.run],
        borderWidth: 1.5, borderRadius: 4 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: _mkScales() }
  });

  // DDQN vs B&H
  const days = Array.isArray(btd) ? btd : (btd?.daily ?? []);
  if (days.length) {
    const labels = days.map(d => d.date ?? d.Date ?? '');
    const ddqn   = days.map(d => _num(d.strategy_value ?? d.portfolio_value ?? d.cum_return_pct));
    const bh     = days.map(d => _num(d.bh_value ?? d.benchmark_value ?? d.bh_cum_return_pct));
    const [tl, td, tb] = _thin(labels, ddqn, bh);
    mkChart('crisp-p1-c2', {
      type: 'line',
      data: {
        labels: tl,
        datasets: [
          { label: 'DDQN Strategy', data: td, borderColor: C.build, backgroundColor: 'rgba(26,107,60,.10)', borderWidth: 2, pointRadius: 0, fill: true, tension: 0.2, spanGaps: false },
          { label: 'Buy & Hold',    data: tb, borderColor: C.run, backgroundColor: 'transparent', borderWidth: 1.5, pointRadius: 0, borderDash: [5, 3], tension: 0.2, spanGaps: false },
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: _LEG }, scales: _mkScales() }
    });
  } else {
    _noData('crisp-p1-c2');
  }
}

// Phase 4 — Modeling (SHAP + policy improvement)
function _renderPhase4(shap, hist) {
  const shapRows = Array.isArray(shap) ? shap : (shap?.features ?? shap?.shap_values ?? []);
  if (shapRows.length) {
    const top = [...shapRows]
      .sort((a, b) => Math.abs(parseFloat(b.Overall ?? b.importance ?? b.mean_abs ?? b.value ?? 0))
                    - Math.abs(parseFloat(a.Overall ?? a.importance ?? a.mean_abs ?? a.value ?? 0)))
      .slice(0, 8);
    const fLabels = top.map(r => r.feature ?? r.name ?? String(r));
    const fVals   = top.map(r => Math.abs(parseFloat(r.Overall ?? r.importance ?? r.mean_abs ?? r.value ?? 0)));
    mkChart('crisp-p4-c1', {
      type: 'bar',
      data: {
        labels: fLabels,
        datasets: [{ label: 'SHAP |Overall|', data: fVals, backgroundColor: 'rgba(0,86,184,.12)', borderColor: C.run, borderWidth: 1.5, borderRadius: 3 }]
      },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: _LEG }, scales: _mkScales() }
    });
  } else {
    _noData('crisp-p4-c1');
  }

  // Policy improvement across rounds
  if (hist.length) {
    const labels = hist.map((r, i) => `R${r.round ?? i + 1}`);
    const sharpe = hist.map(r => _num(r.backtest_sharpe));
    mkChart('crisp-p4-c2', {
      type: 'line',
      data: {
        labels,
        datasets: [{ label: 'Backtest Sharpe', data: sharpe, borderColor: C.build, backgroundColor: 'rgba(26,107,60,.10)', borderWidth: 2, pointRadius: 5, fill: true, spanGaps: false }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: _LEG }, scales: _mkScales() }
    });
  } else {
    _noData('crisp-p4-c2');
  }
}

// Phase 5 — Evaluation
function _renderPhase5(hist, btd) {
  if (!hist.length) { _noData('crisp-p5-c1'); return; }
  const labels = hist.map((r, i) => r.timestamp?.slice(0, 10) || `Run ${i + 1}`);
  const sharpe = hist.map(r => _num(r.backtest_sharpe));
  const mdd    = hist.map(r => Math.abs(_num(r.backtest_mdd_pct) ?? 0));
  mkChart('crisp-p5-c1', {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Sharpe', data: sharpe, backgroundColor: 'rgba(0,86,184,.12)', borderColor: C.run, borderWidth: 1.5, borderRadius: 3 },
        { label: 'Max DD %', data: mdd, backgroundColor: 'rgba(155,28,28,.12)', borderColor: C.danger, borderWidth: 1.5, borderRadius: 3 },
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: _LEG }, scales: _mkScales() }
  });
}

function _noData(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(0,0,0,.04)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#8C877A';
  ctx.font = "11px 'IBM Plex Mono', monospace";
  ctx.textAlign = 'center';
  ctx.fillText('No data — run pipeline first', canvas.width / 2, canvas.height / 2);
}
