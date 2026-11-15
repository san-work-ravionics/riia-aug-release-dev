// ── Algo Performance (Feature 47) ────────────────────────────────────────────
// Cross-strategy overview page under the Backtest nav.  Shows all registered
// algo strategies in a single view: aggregate KPI tiles, per-strategy
// scorecards, a comparative win-rate bar chart, and a detail table.
//
// Design language mirrors the Agent Performance page (agent-performance.js).
//
// Advisory A1 (algoperf-updated): the API has no server-side timestamp field.
// The updated timestamp is populated client-side with new Date().toLocaleTimeString()
// at the end of each load call — this is documented here and in the task brief.
//
// Advisory A2 (total_signals): a 5th KPI tile `algoperf-total-signals` is
// rendered in both HTML and here, showing the aggregate signal/trade count.
import { api } from './api.js';
import { setEl, badge, fmt, fmtPct } from './utils.js';
import { mkChart, C } from './charts.js';

// Colour slots per algo row in the chart + scorecards.
const ALGO_PALETTE = [C.build, C.run, C.mon, C.warn, C.danger, '#0E7490', '#BE185D'];

// Format a nullable percentage value (already in percent, e.g. 68.4 → "68.40%")
const fmtRate = v => (v == null ? 'N/A' : fmtPct(v));

// Format nullable float to 2 dp; null → 'N/A'
const fmtVal = (v, dp = 2) => (v == null ? 'N/A' : fmt(v, dp));

function _renderScorecards(algos) {
  if (!algos.length) {
    setEl('algoperf-scorecards',
      '<div class="empty">No algos registered. Use the Algos page to register a strategy.</div>');
    return;
  }
  const cards = algos.map((a, i) => {
    const wr = a.win_rate != null ? Math.round(a.win_rate) : null;
    const barW = wr ?? 0;
    const isLive = a.status === 'live';
    const statusBadge = isLive
      ? '<span class="badge ok" style="font-size:8px;vertical-align:middle">LIVE</span>'
      : '<span class="badge neu" style="font-size:8px;vertical-align:middle">PAUSED</span>';
    const ddqnNote = a.algo_type === 'ddqn'
      ? ' <span title="DDQN — trade-level data unavailable" style="cursor:help;font-size:10px;color:var(--t3)">(DDQN)</span>'
      : '';
    return `<div class="agp-sc">
      <div class="agp-sc-role">
        <span>${a.name}${ddqnNote} ${statusBadge}</span>
        <span style="width:8px;height:8px;border-radius:50%;background:${ALGO_PALETTE[i % ALGO_PALETTE.length]};flex-shrink:0"></span>
      </div>
      <div class="agp-sc-row">
        <span class="agp-sc-lbl">Win Rate</span>
        <span class="agp-sc-val"><span class="agp-bar-wrap"><span class="agp-bar" style="width:${barW}%"></span></span>&nbsp;${fmtRate(a.win_rate)}</span>
      </div>
      <div class="agp-sc-row">
        <span class="agp-sc-lbl">Total Pts</span>
        <span class="agp-sc-val">${fmtVal(a.total_pts)}</span>
      </div>
      <div class="agp-sc-row">
        <span class="agp-sc-lbl">Profit Factor</span>
        <span class="agp-sc-val">${fmtVal(a.profit_factor, 3)}</span>
      </div>
      <div class="agp-sc-row">
        <span class="agp-sc-lbl">Signal Rate</span>
        <span class="agp-sc-val">${fmtRate(a.signal_rate)}</span>
      </div>
      <div class="agp-sc-row">
        <span class="agp-sc-lbl">Trades</span>
        <span class="agp-sc-val">${a.num_trades != null ? a.num_trades : 'N/A'}</span>
      </div>
    </div>`;
  }).join('');
  setEl('algoperf-scorecards', cards);
}

function _renderChart(algos) {
  mkChart('algoperf-chart', {
    type: 'bar',
    data: {
      labels: algos.map(a => a.name),
      datasets: [{
        label: 'Win Rate (%)',
        data: algos.map(a => a.win_rate),
        backgroundColor: algos.map((_, i) => ALGO_PALETTE[i % ALGO_PALETTE.length]),
        borderRadius: 4,
        maxBarThickness: 26,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: C.mono, size: 9 }, maxRotation: 50, minRotation: 30, autoSkip: false },
        },
        y: {
          beginAtZero: true,
          suggestedMax: 100,
          grid: { color: 'rgba(0,0,0,.035)' },
          ticks: { font: { family: C.mono, size: 10 }, callback: v => v + '%' },
        },
      },
    },
  });
}

export async function loadAlgoPerformance() {
  let data = null;
  try {
    data = await api('/api/v1/experience/rita/algos/performance');
  } catch (e) {
    // API unavailable — zero-state all tiles and show error in scorecards
    setEl('algoperf-total-algos', '—');
    setEl('algoperf-live-count', '—');
    setEl('algoperf-avg-win-rate', '—');
    setEl('algoperf-best-algo', '—');
    setEl('algoperf-total-signals', '—');
    setEl('algoperf-scorecards', '<div class="empty">Unable to load algo performance data.</div>');
    setEl('algoperf-table',
      '<tr><td colspan="9" class="empty">Unable to load data.</td></tr>');
    return;
  }

  const algos = (data && data.algos) || [];

  // ── Aggregate KPI tiles ──
  setEl('algoperf-total-algos', data ? String(data.total_algos) : '0');
  setEl('algoperf-live-count', data ? String(data.live_algos) : '0');
  setEl('algoperf-avg-win-rate',
    data && data.avg_win_rate != null ? fmtPct(data.avg_win_rate) : '—');
  setEl('algoperf-best-algo',
    data && data.best_algo_name ? data.best_algo_name : '—');
  setEl('algoperf-total-signals', data ? String(data.total_signals) : '0');

  if (!algos.length) {
    setEl('algoperf-scorecards',
      '<div class="empty">No algos registered. Use the Algos page to register a strategy.</div>');
    setEl('algoperf-table',
      '<tr><td colspan="9" class="empty">No algo strategies registered yet.</td></tr>');
    setEl('algoperf-updated', new Date().toLocaleTimeString());
    return;
  }

  // ── Scorecards ──
  _renderScorecards(algos);

  // ── Bar chart ──
  _renderChart(algos);

  // ── Detail table ──
  const rows = algos.map(a => {
    const isLive = a.status === 'live';
    const statusCell = isLive
      ? `<span class="badge ok">Live</span>`
      : `<span class="badge neu">Paused</span>`;
    return `<tr>
      <td style="font-weight:600">${a.name}</td>
      <td>${a.algo_type}</td>
      <td>${a.instrument}</td>
      <td>${statusCell}</td>
      <td style="text-align:right;font-family:var(--fm)">${fmtRate(a.win_rate)}</td>
      <td style="text-align:right;font-family:var(--fm)">${fmtVal(a.total_pts)}</td>
      <td style="text-align:right;font-family:var(--fm)">${fmtVal(a.profit_factor, 3)}</td>
      <td style="text-align:right;font-family:var(--fm)">${fmtRate(a.signal_rate)}</td>
      <td style="text-align:right;font-family:var(--fm)">${a.num_trades != null ? a.num_trades : 'N/A'}</td>
    </tr>`;
  }).join('');
  setEl('algoperf-table', rows);

  // A1: Updated timestamp is client-side — the API has no server timestamp field.
  setEl('algoperf-updated', new Date().toLocaleTimeString());
}
