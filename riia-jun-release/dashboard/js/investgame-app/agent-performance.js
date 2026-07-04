// ── Invest Game App — Agent Performance ──────────────────────────────────────
// Ported from rita/agent-performance.js
import { api } from '../shared/api.js';
import { setEl } from '../shared/utils.js';
import { mkChart, C } from '../shared/charts.js';

const AGENT_PALETTE = [C.run, C.build, C.mon, C.warn, '#0E7490', '#BE185D', C.danger];

const MOCK_AGENTS = [
  { agent_name: 'Financial Goal',    outcome_match: 0.82, avg_reward: 0.74, data_coverage: 0.98, invocations: 64, trend:  0.12 },
  { agent_name: 'Sentiment Analyst', outcome_match: 0.61, avg_reward: 0.48, data_coverage: 0.55, invocations: 38, trend: -0.06 },
  { agent_name: 'Technical Analyst', outcome_match: 0.78, avg_reward: 0.69, data_coverage: 0.95, invocations: 91, trend:  0.08 },
  { agent_name: 'Strategy Analyst',  outcome_match: 0.74, avg_reward: 0.71, data_coverage: 0.90, invocations: 57, trend:  0.03 },
  { agent_name: 'Scenario Analyst',  outcome_match: 0.69, avg_reward: 0.63, data_coverage: 0.88, invocations: 44, trend:  0.15 },
  { agent_name: 'Execution Analyst', outcome_match: 0.71, avg_reward: 0.66, data_coverage: 0.82, invocations: 29, trend:  0.21 },
  { agent_name: 'Outcome Analyst',   outcome_match: 0.85, avg_reward: 0.79, data_coverage: 0.93, invocations: 33, trend:  0.05 },
];

const pct = v => (v == null ? '—' : `${Math.round(v * 100)}%`);
const fmtReward = v => v == null ? '—' : (Math.abs(v) < 0.1 ? v.toFixed(4) : v.toFixed(2));

function fmtTrend(trend) {
  if (trend == null) return '<span class="badge neu">—</span>';
  const p = (trend * 100).toFixed(1);
  if (trend > 0) return `<span class="badge ok">+${p}%</span>`;
  if (trend < 0) return `<span class="badge err">${p}%</span>`;
  return '<span class="badge neu">0.0%</span>';
}

function _mergeLive(mock, liveAgents) {
  const byName = {};
  for (const a of (liveAgents || [])) byName[a.agent_name] = a;
  return mock.map(m => {
    const live = byName[m.agent_name];
    if (!live) return m;
    const isRL = live.gap_status === 'live-rl' || live.avg_reward != null;
    if (!isRL && (live.invocation_count_30d ?? 0) === 0) return m;
    return {
      ...m,
      invocations:   live.invocation_count_30d ?? m.invocations,
      outcome_match: live.outcome_match_rate != null ? live.outcome_match_rate : m.outcome_match,
      trend:         live.trend_vs_prior_30d != null ? live.trend_vs_prior_30d : m.trend,
      avg_reward:    live.avg_reward != null ? live.avg_reward : m.avg_reward,
      data_coverage: live.data_coverage != null ? live.data_coverage : m.data_coverage,
      live:          isRL,
    };
  });
}

export async function loadAgentPerformance() {
  let agents = MOCK_AGENTS;
  try {
    const data = await api('/api/v1/experience/rita/agent-performance');
    agents = _mergeLive(MOCK_AGENTS, data && data.agents);
  } catch (e) {
    // fall back to mock
  }

  // Mode badge
  const liveCount = agents.filter(a => a.live).length;
  const modeEl = document.getElementById('igap-mode');
  if (modeEl) {
    if (liveCount === 0) {
      modeEl.className = 'badge warn';
      modeEl.textContent = 'Demo data';
    } else if (liveCount === agents.length) {
      modeEl.className = 'badge ok';
      modeEl.textContent = 'Live RL data';
    } else {
      modeEl.className = 'badge run';
      modeEl.textContent = `${liveCount}/${agents.length} live`;
    }
  }

  // Aggregate KPIs
  const liveAgents = agents.filter(a => a.live);
  const aggBase = liveAgents.length ? liveAgents : agents;
  const avg = sel => {
    const vals = aggBase.map(sel).filter(v => v != null);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  };
  setEl('igap-total', String(agents.reduce((s, a) => s + (a.invocations || 0), 0)));
  setEl('igap-match', pct(avg(a => a.outcome_match)));
  setEl('igap-reward', fmtReward(avg(a => a.avg_reward)));
  setEl('igap-coverage', pct(avg(a => a.data_coverage)));

  // Scorecards
  _renderScorecards(agents);

  // Chart
  _renderChart(agents);

  // Table
  const rows = agents.map(a => `
    <tr>
      <td style="font-weight:600">${a.agent_name}</td>
      <td style="text-align:right;font-family:var(--fm)">${pct(a.outcome_match)}</td>
      <td style="text-align:right;font-family:var(--fm)">${fmtReward(a.avg_reward)}</td>
      <td style="text-align:right;font-family:var(--fm)">${pct(a.data_coverage)}</td>
      <td style="text-align:right;font-family:var(--fm)">${a.invocations}</td>
      <td style="text-align:right">${fmtTrend(a.trend)}</td>
    </tr>`).join('');
  setEl('igap-table', rows || '<tr><td colspan="6" class="empty">No agent activity recorded yet.</td></tr>');
}

function _renderScorecards(agents) {
  const cards = agents.map((a, i) => {
    const barW = Math.round((a.outcome_match ?? 0) * 100);
    const covW = Math.round((a.data_coverage ?? 0) * 100);
    return `<div class="agp-sc">
      <div class="agp-sc-role">
        <span>${a.agent_name}${a.live ? ' <span class="badge ok" style="font-size:8px;vertical-align:middle">LIVE</span>' : ''}</span>
        <span style="width:8px;height:8px;border-radius:50%;background:${AGENT_PALETTE[i % AGENT_PALETTE.length]};flex-shrink:0"></span>
      </div>
      <div class="agp-sc-row"><span class="agp-sc-lbl">Outcome</span><span class="agp-sc-val"><span class="agp-bar-wrap"><span class="agp-bar" style="width:${barW}%"></span></span>&nbsp;${pct(a.outcome_match)}</span></div>
      <div class="agp-sc-row"><span class="agp-sc-lbl">Reward</span><span class="agp-sc-val">${fmtReward(a.avg_reward)}</span></div>
      <div class="agp-sc-row"><span class="agp-sc-lbl">Coverage</span><span class="agp-sc-val" style="color:var(${covW < 70 ? '--warn' : '--t2'})"><span class="agp-bar-wrap"><span class="agp-bar" style="width:${covW}%;background:var(${covW < 70 ? '--warn' : '--build'})"></span></span>&nbsp;${pct(a.data_coverage)}</span></div>
      <div class="agp-sc-row"><span class="agp-sc-lbl">Invocations</span><span class="agp-sc-val">${a.invocations} ${fmtTrend(a.trend)}</span></div>
    </div>`;
  }).join('');
  setEl('igap-scorecards', cards || '<div class="empty">No agents.</div>');
}

function _renderChart(agents) {
  mkChart('igap-chart', {
    type: 'bar',
    data: {
      labels: agents.map(a => a.agent_name),
      datasets: [{
        label: 'Invocations (30d)',
        data: agents.map(a => a.invocations),
        backgroundColor: agents.map((_, i) => AGENT_PALETTE[i % AGENT_PALETTE.length]),
        borderRadius: 4,
        maxBarThickness: 26,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: C.mono, size: 9 }, maxRotation: 50, minRotation: 30 } },
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.035)' }, ticks: { precision: 0, font: { family: C.mono, size: 10 } } },
      },
    },
  });
}
