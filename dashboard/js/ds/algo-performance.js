import { api } from './api.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
function _setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function _setHtml(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function esc(s) {
  return String(s == null ? '—' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmt2(v) {
  if (v == null) return '—';
  const n = parseFloat(v);
  return isNaN(n) ? '—' : n.toFixed(2);
}

function fmtPctAbs(v) {
  if (v == null) return '—';
  const n = parseFloat(v);
  return isNaN(n) ? '—' : n.toFixed(1) + '%';
}

function showAlgoError() {
  ['ds-algo-total', 'ds-algo-live', 'ds-algo-avg-wr', 'ds-algo-best', 'ds-algo-signals'].forEach(id => _setText(id, '—'));
  _setHtml('ds-algo-tbody', '<tr><td colspan="9" style="text-align:center;padding:16px;color:var(--t4);font-family:var(--fm);font-size:11px">Error loading algos</td></tr>');
}

// ── Main loader ───────────────────────────────────────────────────────────────
export async function loadAlgoPerformance() {
  try {
    const data = await api('/api/v1/experience/rita/algos/performance');
    if (!data) { showAlgoError(); return; }

    const algos = Array.isArray(data.algos) ? data.algos : [];

    _setText('ds-algo-total', data.total_algos ?? '—');

    // Live count — amber badge when all paused
    const liveEl = document.getElementById('ds-algo-live');
    if (liveEl) {
      liveEl.textContent = data.live_algos ?? '—';
      liveEl.className = 'kpi-val' + (data.live_algos === 0 ? ' warn' : '');
    }

    _setText('ds-algo-avg-wr', data.avg_win_rate != null ? fmtPctAbs(data.avg_win_rate) : '—');
    _setText('ds-algo-best', data.best_algo_name ?? '—');
    _setText('ds-algo-signals', data.total_signals ?? '—');

    // ── Algo table ────────────────────────────────────────────────────────────
    if (!algos.length) {
      _setHtml('ds-algo-tbody', '<tr><td colspan="9" style="text-align:center;padding:16px;color:var(--t4);font-family:var(--fm);font-size:11px">No algos registered</td></tr>');
    } else {
      _setHtml('ds-algo-tbody', algos.map(a => {
        const statusBadge = a.status === 'live'
          ? '<span style="color:var(--ok);font-weight:600">live</span>'
          : '<span class="warn" style="color:var(--warn);font-weight:600">paused</span>';
        return '<tr style="border-bottom:1px solid var(--border)">'
          + '<td style="padding:5px 6px;font-size:10px">' + esc(a.name) + '</td>'
          + '<td style="padding:5px 6px;font-size:10px;color:var(--t3)">' + esc(a.algo_type) + '</td>'
          + '<td style="padding:5px 6px;font-size:10px;color:var(--t3)">' + esc(a.instrument) + '</td>'
          + '<td style="padding:5px 6px;font-size:10px">' + statusBadge + '</td>'
          + '<td style="padding:5px 6px;font-size:10px;text-align:right;font-family:var(--fm)">' + (a.win_rate != null ? fmtPctAbs(a.win_rate) : '—') + '</td>'
          + '<td style="padding:5px 6px;font-size:10px;text-align:right;font-family:var(--fm)">' + (a.total_pts ?? '—') + '</td>'
          + '<td style="padding:5px 6px;font-size:10px;text-align:right;font-family:var(--fm)">' + fmt2(a.profit_factor) + '</td>'
          + '<td style="padding:5px 6px;font-size:10px;text-align:right;font-family:var(--fm)">' + (a.signal_rate != null ? fmt2(a.signal_rate) : '—') + '</td>'
          + '<td style="padding:5px 6px;font-size:10px;text-align:right;font-family:var(--fm)">' + (a.num_trades ?? '—') + '</td>'
          + '</tr>';
      }).join(''));
    }

    // Local timestamp — no API field (Reviewer advisory A1)
    const updEl = document.getElementById('ds-algo-updated');
    if (updEl) updEl.textContent = new Date().toLocaleTimeString();

  } catch (e) {
    showAlgoError();
  }
}
