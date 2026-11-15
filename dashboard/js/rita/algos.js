// ── Algos — registry, register form, and performance dashboard (F46) ─────────
import { api } from './api.js';
import { mkChart, destroyChart, C } from './charts.js';

// ── constants ─────────────────────────────────────────────────────────────────

const _SETUP_LABELS = {
  triple_screen:     'GEO PAN Triple Screen',
  smm_double_screen: 'SMM Double Screen',
  swing_db_dt:       'GEO PAN Swing (DB/DT)',
  momentum_bb:       'GEO PAN Momentum BB',
};

const _ALGO_TYPE_LABELS = {
  asta_setup: 'ASTA Setup',
  ddqn:       'DDQN',
  custom:     'Custom',
};

// ── helpers ───────────────────────────────────────────────────────────────────

function _esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;');
}

function _fmt(val, decimals = 1) {
  if (val === null || val === undefined) return 'N/A';
  const n = Number(val);
  return isNaN(n) ? 'N/A' : n.toFixed(decimals);
}

function _statusBadge(status) {
  const cls = status === 'live' ? 'badge-live' : status === 'paused' ? 'badge-paused' : 'badge-deleted';
  return `<span class="algo-badge ${_esc(cls)}">${_esc(status)}</span>`;
}

function _typeBadge(algo_type) {
  return `<span class="algo-badge badge-type">${_esc(_ALGO_TYPE_LABELS[algo_type] || algo_type)}</span>`;
}

function _setEl(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function _setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── A. Registry table ─────────────────────────────────────────────────────────

function _renderRegistry(algos) {
  if (!algos || algos.length === 0) {
    _setEl('algos-registry-tbody',
      '<tr><td colspan="5" class="empty-row">No algorithms registered</td></tr>');
    return;
  }

  const rows = algos.map(a => `
    <tr>
      <td>${_esc(a.name)}</td>
      <td>${_typeBadge(a.algo_type)}</td>
      <td>${_esc(a.instrument)}${a.setup_key ? ' <span class="algo-setup-key">(' + _esc(_SETUP_LABELS[a.setup_key] || a.setup_key) + ')</span>' : ''}</td>
      <td>${_statusBadge(a.status)}</td>
      <td class="algo-actions" style="white-space:nowrap">
        ${a.status !== 'live'
          ? `<button class="btn btn-xs btn-build" title="Go Live" onclick="algoSetLive('${_esc(a.algo_id)}')">▶</button>`
          : `<button class="btn btn-xs btn-ghost" title="Pause" onclick="algoPause('${_esc(a.algo_id)}')">⏸</button>`}
        <button class="btn btn-xs btn-ghost" title="Performance" onclick="algoShowPerf('${_esc(a.algo_id)}', '${_esc(a.name)}')">↗</button>
        <button class="btn btn-xs btn-ghost" title="Delete" style="color:var(--danger)" onclick="algoDelete('${_esc(a.algo_id)}')">🗑</button>
        ${a.status === 'live'
          ? `<button class="btn btn-xs btn-build" title="Check Now" onclick="algoCheckNow('${_esc(a.algo_id)}', '${_esc(a.name)}')">⚡</button>`
          : ''}
      </td>
    </tr>`).join('');

  _setEl('algos-registry-tbody', rows);
}

// ── B. Register form ──────────────────────────────────────────────────────────

export function algoRegisterToggle() {
  const form = document.getElementById('algos-register-form');
  if (!form) return;
  const hidden = form.style.display === 'none' || form.style.display === '';
  form.style.display = hidden ? 'block' : 'none';
  if (hidden) {
    // reset form fields
    const nameEl = document.getElementById('algos-register-name');
    const descEl = document.getElementById('algos-register-desc');
    if (nameEl) nameEl.value = '';
    if (descEl) descEl.value = '';
    _algoTypeChanged();
  }
}

function _algoTypeChanged() {
  const typeEl = document.getElementById('algos-register-type');
  const setupRow = document.getElementById('algos-setup-row');
  const setupEl = document.getElementById('algos-register-setup');
  const submitBtn = document.getElementById('algos-register-submit');
  if (!typeEl) return;
  const isAsta = typeEl.value === 'asta_setup';
  if (setupRow) setupRow.style.display = isAsta ? '' : 'none';
  if (setupEl) setupEl.required = isAsta;
  if (submitBtn) {
    const name = (document.getElementById('algos-register-name') || {}).value || '';
    submitBtn.disabled = !name.trim() || (isAsta && !(setupEl && setupEl.value));
  }
}

export async function algoSubmitRegister() {
  const nameEl = document.getElementById('algos-register-name');
  const typeEl = document.getElementById('algos-register-type');
  const setupEl = document.getElementById('algos-register-setup');
  const instEl = document.getElementById('algos-register-instrument');
  const descEl = document.getElementById('algos-register-desc');
  const submitBtn = document.getElementById('algos-register-submit');
  if (!nameEl || !typeEl || !instEl) return;

  const name = nameEl.value.trim();
  const algo_type = typeEl.value;
  const setup_key = algo_type === 'asta_setup' ? (setupEl ? setupEl.value : null) : null;
  const instrument = instEl.value;
  const description = descEl ? descEl.value.trim() : '';

  if (!name) { alert('Name is required'); return; }
  if (algo_type === 'asta_setup' && !setup_key) { alert('Setup is required for ASTA Setup type'); return; }

  if (submitBtn) submitBtn.disabled = true;
  try {
    await api('/api/v1/workflow/algos', 'POST', {
      name, algo_type, setup_key: setup_key || null,
      instrument, description: description || null,
    });
    algoRegisterToggle();
    await loadAlgos();
  } catch (e) {
    alert('Registration failed: ' + e.message);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

// ── Registry actions ──────────────────────────────────────────────────────────

export async function algoSetLive(algo_id) {
  try {
    await api(`/api/v1/workflow/algos/${algo_id}`, 'PATCH', { status: 'live' });
    await loadAlgos();
  } catch (e) {
    alert('Failed to set live: ' + e.message);
  }
}

export async function algoPause(algo_id) {
  try {
    await api(`/api/v1/workflow/algos/${algo_id}`, 'PATCH', { status: 'paused' });
    await loadAlgos();
  } catch (e) {
    alert('Failed to pause: ' + e.message);
  }
}

export async function algoDelete(algo_id) {
  if (!confirm('Delete this algorithm? This cannot be undone.')) return;
  try {
    await api(`/api/v1/workflow/algos/${algo_id}`, 'DELETE');
    await loadAlgos();
  } catch (e) {
    alert('Failed to delete: ' + e.message);
  }
}

// ── C. Performance panel ──────────────────────────────────────────────────────

const _DDQN_NA_TITLE = 'Trade-level data unavailable for DDQN — requires signal-capture table';

let _perfData = null;
let _currentYear = 2026;

function _renderPerfCharts(year) {
  if (!_perfData) return;
  const yStr = String(year);
  const _filt = year === 'all' ? () => true : r => r.date.startsWith(yStr);

  const eq = (_perfData.equity_curve || []).filter(_filt);
  if (eq.length > 0) {
    mkChart('algo-chart-equity', {
      type: 'line',
      data: {
        labels: eq.map(r => r.date),
        datasets: [{
          label: 'Cumulative Pts',
          data: eq.map(r => r.cumulative_pts),
          borderColor: C.build,
          backgroundColor: 'transparent',
          tension: 0.3,
          pointRadius: 0,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { maxTicksLimit: 8 } } },
      },
    });
  } else {
    destroyChart('algo-chart-equity');
    const _ec = document.getElementById('algo-chart-equity');
    if (_ec) _ec.width = _ec.width; // force-clear stale drawing
  }

  const sm = (_perfData.signal_markers || []).filter(_filt);
  if (sm.length > 0) {
    const smLabels = sm.map(r => r.date);
    const smCloses = sm.map(r => r.close);
    const buyPts  = sm.map(r => r.signal === 'BUY'  ? r.close : null);
    const sellPts = sm.map(r => r.signal === 'SELL' ? r.close : null);
    mkChart('algo-chart-signals', {
      type: 'line',
      data: {
        labels: smLabels,
        datasets: [
          {
            label: 'Price',
            data: smCloses,
            borderColor: C.t3,
            backgroundColor: 'transparent',
            pointRadius: 0,
            tension: 0.2,
            order: 2,
          },
          {
            label: 'BUY',
            data: buyPts,
            borderColor: 'transparent',
            backgroundColor: C.build,
            pointRadius: 7,
            pointStyle: 'triangle',
            showLine: false,
            spanGaps: false,
            order: 1,
          },
          {
            label: 'SELL',
            data: sellPts,
            borderColor: 'transparent',
            backgroundColor: C.danger,
            pointRadius: 7,
            pointStyle: 'triangle',
            rotation: 180,
            showLine: false,
            spanGaps: false,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: true } },
        scales: { x: { ticks: { maxTicksLimit: 8 } } },
      },
    });
  } else {
    destroyChart('algo-chart-signals');
    const _sc = document.getElementById('algo-chart-signals');
    if (_sc) _sc.width = _sc.width; // force-clear stale drawing
  }

  const recent = (_perfData.recent_signals || []).filter(_filt);
  if (recent.length === 0) {
    _setEl('algos-recent-tbody', `<tr><td colspan="5" class="empty-row">No signals for ${_esc(yStr)}</td></tr>`);
  } else {
    const rows = recent.map(r => `
      <tr>
        <td>${_esc(r.date)}</td>
        <td><span class="algo-sig-badge ${r.signal === 'BUY' ? 'sig-buy' : 'sig-sell'}">${_esc(r.signal)}</span></td>
        <td>${r.close !== null && r.close !== undefined ? _fmt(r.close, 2) : '—'}</td>
        <td>${r.confidence !== null && r.confidence !== undefined ? _fmt(r.confidence * 100, 1) + '%' : '—'}</td>
        <td class="${r.outcome === 'target' ? 'col-build' : r.outcome === 'stopped' ? 'col-danger' : ''}">${_esc(r.outcome || '—')}</td>
      </tr>`).join('');
    _setEl('algos-recent-tbody', rows);
  }
}

export function algoSetYear(year) {
  _currentYear = year;
  ['all', 2022, 2023, 2024, 2025, 2026].forEach(y => {
    const btn = document.getElementById(`algo-year-${y}`);
    if (!btn) return;
    if (y === year) {
      btn.className = btn.className.replace(/\bbtn-ghost\b/g, 'btn-build');
    } else {
      btn.className = btn.className.replace(/\bbtn-build\b/g, 'btn-ghost');
    }
  });
  _renderPerfCharts(year);
}

export async function algoShowPerf(algo_id, algo_name) {
  _currentYear = 2026;
  const panel = document.getElementById('algos-perf-panel');
  if (panel) panel.style.display = 'block';
  _setEl('algos-perf-title', _esc(algo_name) + ' Performance');

  const kpiIds = [
    'algo-kpi-num-trades', 'algo-kpi-signal-rate', 'algo-kpi-profit-factor',
    'algo-kpi-total-pts', 'algo-kpi-num-targets', 'algo-kpi-num-stops',
    'algo-kpi-avg-loss', 'algo-kpi-avg-win',
    'algo-kpi-avg-confidence', 'algo-kpi-win-rate',
  ];
  kpiIds.forEach(id => _setVal(id, '…'));
  _setEl('algos-recent-tbody', '<tr><td colspan="5">Loading…</td></tr>');

  try {
    const data = await api(`/api/v1/experience/rita/algo-performance?algo_id=${encodeURIComponent(algo_id)}`);
    _perfData = data;
    // Auto-select most recent populated year; fall back to 'all'
    const has2026 = (data.equity_curve || []).some(r => r.date.startsWith('2026')) ||
                    (data.recent_signals || []).some(r => r.date.startsWith('2026'));
    const defaultYear = has2026 ? 2026 : 'all';
    algoSetYear(defaultYear);
    const k = data.kpis || {};

    function _kv(id, val, unit, decimals) {
      const el = document.getElementById(id);
      if (!el) return;
      if (val === null || val === undefined) {
        el.textContent = 'N/A';
        el.title = _DDQN_NA_TITLE;
      } else {
        el.textContent = _fmt(val, decimals) + (unit || '');
        el.title = '';
      }
    }

    _kv('algo-kpi-win-rate', k.win_rate, '%', 1);
    _kv('algo-kpi-total-pts', k.total_pts, ' pts', 1);
    _kv('algo-kpi-profit-factor', k.profit_factor, '', 2);
    _kv('algo-kpi-signal-rate', k.signal_rate, '%', 1);
    _kv('algo-kpi-avg-confidence', k.avg_confidence !== undefined ? (k.avg_confidence !== null ? k.avg_confidence * 100 : null) : null, '%', 1);
    _kv('algo-kpi-avg-win', k.avg_win, ' pts', 1);
    _kv('algo-kpi-avg-loss', k.avg_loss, ' pts', 1);
    _kv('algo-kpi-num-trades', k.num_trades, '', 0);
    _kv('algo-kpi-num-targets', k.num_targets, '', 0);
    _kv('algo-kpi-num-stops', k.num_stops, '', 0);

    _renderPerfCharts(_currentYear);
  } catch (e) {
    kpiIds.forEach(id => _setVal(id, '—'));
    _setEl('algos-recent-tbody', `<tr><td colspan="5" class="empty-row">Error: ${_esc(e.message)}</td></tr>`);
  }
}

// ── D. Check Now (F48) ────────────────────────────────────────────────────────

export async function algoCheckNow(algo_id, algo_name) {
  const panel = document.getElementById('algos-signal-panel');
  const wrap  = document.getElementById('algos-registry-wrap');
  if (!panel) return;
  panel.style.display = 'block';
  if (wrap) { wrap.style.flex = '0 0 70%'; wrap.style.minWidth = '0'; }
  _setVal('algos-sig-title', (algo_name || 'Signal') + ' — Check Now');

  const fields = ['algos-sig-name','algos-sig-instrument','algos-sig-type',
    'algos-sig-signal','algos-sig-target','algos-sig-stop-loss','algos-sig-confidence',
    'algos-sig-action','algos-sig-allocation','algos-sig-ltp','algos-sig-close',
    'algos-sig-as-of','algos-sig-message'];
  fields.forEach(id => _setVal(id, '…'));
  _setEl('algos-sig-error', '');

  try {
    const d = await api(`/api/v1/experience/rita/algos/${encodeURIComponent(algo_id)}/signal`);
    const na = v => (v != null && v !== '') ? String(v) : '—';
    _setVal('algos-sig-name',       na(d.name));
    _setVal('algos-sig-instrument', na(d.instrument));
    _setVal('algos-sig-type',       na(d.algo_type));
    _setVal('algos-sig-signal',     na(d.signal));
    _setVal('algos-sig-target',     na(d.target));
    _setVal('algos-sig-stop-loss',  na(d.stop_loss));
    _setVal('algos-sig-confidence', d.confidence != null ? (d.confidence * 100).toFixed(1) + '%' : '—');
    _setVal('algos-sig-action',     na(d.action));
    _setVal('algos-sig-allocation', d.allocation_pct != null ? d.allocation_pct + '%' : '—');
    _setVal('algos-sig-ltp',        na(d.kite_ltp));
    _setVal('algos-sig-close',      na(d.close));
    _setVal('algos-sig-as-of',      na(d.as_of));
    _setVal('algos-sig-message',    na(d.message));
  } catch (e) {
    fields.forEach(id => _setVal(id, '—'));
    _setEl('algos-sig-error', `<span style="color:var(--danger)">Error: ${_esc(e.message)}</span>`);
  }
}

export function algoCloseSignal() {
  const panel = document.getElementById('algos-signal-panel');
  const wrap  = document.getElementById('algos-registry-wrap');
  if (panel) panel.style.display = 'none';
  if (wrap) { wrap.style.flex = '1'; wrap.style.minWidth = '0'; }
}

// ── Entry point ───────────────────────────────────────────────────────────────

export async function loadAlgos() {
  try {
    const algos = await api('/api/v1/experience/rita/algos');
    _renderRegistry(algos);
  } catch (e) {
    _setEl('algos-registry-tbody',
      `<tr><td colspan="5" class="empty-row">Error loading algos: ${_esc(e.message)}</td></tr>`);
  }

  // Wire up form type selector
  const typeEl = document.getElementById('algos-register-type');
  if (typeEl) typeEl.addEventListener('change', _algoTypeChanged);
  const nameEl = document.getElementById('algos-register-name');
  if (nameEl) nameEl.addEventListener('input', _algoTypeChanged);
  const setupEl = document.getElementById('algos-register-setup');
  if (setupEl) setupEl.addEventListener('change', _algoTypeChanged);

  _algoTypeChanged();
}

// ── Window bindings ───────────────────────────────────────────────────────────

window.loadAlgos        = loadAlgos;
window.algoRegisterToggle = algoRegisterToggle;
window.algoSubmitRegister = algoSubmitRegister;
window.algoSetLive      = algoSetLive;
window.algoPause        = algoPause;
window.algoDelete       = algoDelete;
window.algoShowPerf     = algoShowPerf;
window.algoSetYear      = algoSetYear;
