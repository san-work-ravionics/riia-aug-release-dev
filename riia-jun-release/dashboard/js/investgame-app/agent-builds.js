// ── Invest Game App — Agent Builds ───────────────────────────────────────────
// Ported from ops/agent-builds.js (simplified view for Invest Game context)
import { apiFetch } from '../shared/api.js';
import { setEl } from '../shared/utils.js';
import { mkChart, C } from '../shared/charts.js';

const ROLES = ['pm', 'architect', 'engineer', 'qa', 'techwriter'];
const ROLE_LABEL = { pm: 'PM', architect: 'Architect', engineer: 'Engineer', qa: 'QA', techwriter: 'TechWriter' };
const PALETTE = ['#6B2FA0', '#0056B8', '#1A6B3C', '#92480A', '#BE185D'];

function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function pct(v) { return v != null ? Math.round(v * 100) + '%' : '—'; }
function fmtRunId(id) {
  if (!id || id === 'sample') return id;
  const m = id.match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})$/);
  return m ? `${m[2]}/${m[3]} ${m[4]}:${m[5]}` : id;
}
function statusBadge(s) {
  if (s === 'pass') return '<span class="badge ok">Pass</span>';
  if (s === 'pass_with_warnings') return '<span class="badge warn">Warnings</span>';
  return '<span class="badge err">Fail</span>';
}

export async function loadAgentBuilds() {
  const grid = document.getElementById('igab-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const data = await apiFetch('/api/experience/ops/agent-builds');
    if (!data) {
      grid.innerHTML = '<div class="empty">Could not load agent-ops metrics</div>';
      return;
    }

    const runs = data.runs || [];
    const m = data.metrics || {};

    // Build HTML
    let html = '';

    // Scorecards
    const pr = m.per_role || {};
    if (Object.keys(pr).length) {
      const cards = ROLES.map(role => {
        const d = pr[role];
        if (!d) return '';
        const barW = Math.round((d.avg_adherence_score ?? 0) * 100);
        return `<div class="ab-sc">
          <div class="ab-sc-role">${ROLE_LABEL[role]}</div>
          <div class="ab-sc-row"><span class="ab-sc-lbl">Adherence</span><span class="ab-sc-val"><span class="ab-bar-wrap"><span class="ab-bar" style="width:${barW}%"></span></span>&nbsp;${pct(d.avg_adherence_score)}</span></div>
          <div class="ab-sc-row"><span class="ab-sc-lbl">1st pass</span><span class="ab-sc-val" style="color:var(${(d.first_pass_rate ?? 0) >= 1 ? '--ok' : '--warn'})">${pct(d.first_pass_rate)}</span></div>
          <div class="ab-sc-row"><span class="ab-sc-lbl">Avg tokens</span><span class="ab-sc-val">${d.avg_token_cost?.toLocaleString() ?? '—'}</span></div>
          <div class="ab-sc-row"><span class="ab-sc-lbl">Runs</span><span class="ab-sc-val">${d.run_count ?? '—'}</span></div>
        </div>`;
      }).join('');
      html += `<div class="ab-panel"><div class="c-ey"><div class="ey-d" style="background:var(--run)"></div>Agent Scorecards</div><div class="ab-sc-grid">${cards}</div></div>`;
    }

    // Run history table
    if (runs.length) {
      const rows = runs.slice(0, 10).map(r => `<tr>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--t3)" title="${esc(r.request)}">${esc(r.request ?? '—')}</td>
        <td>${statusBadge(r.overall_status)}</td>
        <td style="font-family:var(--fm)">${r.duration_minutes ?? '—'} min</td>
        <td style="font-family:var(--fm);font-size:10px;color:var(--t3)">${fmtRunId(r.run_id)}</td>
      </tr>`).join('');
      html += `<div class="ab-panel"><div class="c-ey"><div class="ey-d" style="background:var(--run)"></div>Pipeline Run History</div>
        <div class="tbl-wrap"><table><thead><tr><th>Request</th><th>Status</th><th>Duration</th><th>Run</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
    }

    // Grounding chart
    const trend = m.grounding_trend ?? [];
    if (trend.length) {
      html += `<div class="ab-panel"><div class="c-ey"><div class="ey-d" style="background:var(--run)"></div>Grounding Score Trend</div>
        <div class="chart-wrap" style="height:200px"><canvas id="igab-chart-grounding"></canvas></div></div>`;
    }

    grid.innerHTML = html || '<div class="empty">No build data available</div>';

    // Mount chart after DOM insertion
    if (trend.length && document.getElementById('igab-chart-grounding')) {
      const labels = trend.map(r => fmtRunId(r.run_id));
      const scores = trend.map(r => +(r.grounding_score * 100).toFixed(1));
      mkChart('igab-chart-grounding', {
        type: 'line',
        data: {
          labels,
          datasets: [{ label: '% Grounding Passed', data: scores, borderColor: '#6B2FA0', backgroundColor: 'rgba(107,47,160,0.10)', fill: true, tension: 0.35, pointRadius: 3 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { font: { size: 11 } } } },
          scales: {
            x: { ticks: { font: { size: 10 } } },
            y: { max: 100, ticks: { font: { size: 10 }, callback: v => v + '%' } }
          }
        }
      });
    }
  } catch (e) {
    grid.innerHTML = '<div class="empty">Could not load agent-ops metrics</div>';
  }
}
