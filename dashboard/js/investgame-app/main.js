// ── Invest Game App — main.js (entry point) ─────────────────────────────────
import { show, registerLoader, toggleSidebar } from './nav.js';
import { loadConcepts, switchAgentTab } from './concepts.js';
import { loadCrispDm, switchCrispTab } from './crisp-dm.js';
import { loadAgentPerformance, setAgentPerfPeriod, loadAgentPerfTimeline } from './agent-performance.js';
import { loadAgentBuilds, submitTokenEstimate, toggleEstimateWidget, closeChartModal } from './agent-builds.js';
import { loadAgentPanel, agentPanelStep, resetAgentPanel, approveAgentProposal, rejectAgentProposal, setApDays } from './agent-panel.js?v=3';
import { loadWhatINeed, hasPendingSave } from './what-i-need.js?v=65';
import { ensureDevToken } from '../shared/dev-auth.js';
import { api } from '../shared/api.js';

// ── Live Algos strip (F46): rendered when state.live_algos is non-empty ──────
async function _renderLiveAlgos() {
  const strip = document.getElementById('ap-live-algos-strip');
  const rows = document.getElementById('ap-live-algos-rows');
  if (!strip || !rows) return;
  try {
    const state = await api('/api/v1/experience/jarvis/state?location=india');
    const algos = state && state.live_algos;
    if (!algos || algos.length === 0) { strip.style.display = 'none'; return; }
    strip.style.display = '';
    rows.innerHTML = algos.map(a => {
      const wr = a.kpi_win_rate !== null && a.kpi_win_rate !== undefined
        ? ' · Win ' + Number(a.kpi_win_rate).toFixed(1) + '%' : '';
      const pts = a.kpi_total_pts !== null && a.kpi_total_pts !== undefined
        ? ' · ' + Number(a.kpi_total_pts).toFixed(1) + ' pts' : '';
      return `<span style="display:inline-flex;align-items:center;gap:4px;background:var(--surface2);border:1.5px solid var(--border);border-radius:6px;padding:4px 10px;font-size:11px;white-space:nowrap">
        <strong>${String(a.name || '').replace(/&/g,'&amp;').replace(/</g,'&lt;')}</strong>
        <span style="color:var(--t3)">·</span>
        <span class="mono">${String(a.instrument || '').replace(/&/g,'&amp;').replace(/</g,'&lt;')}</span>
        ${wr ? '<span style="color:var(--t3)">' + wr.replace(/</g,'&lt;') + '</span>' : ''}
        ${pts ? '<span style="color:var(--t3)">' + pts.replace(/</g,'&lt;') + '</span>' : ''}
      </span>`;
    }).join('');
  } catch (_) {
    // Live algos strip is non-critical — silently skip on error
  }
}

// ── Register section loaders ─────────────────────────────────────────────────
registerLoader('investgame', () => {}); // intro page — no data to load
registerLoader('what-i-need', loadWhatINeed);
registerLoader('journey', () => {
  const frame = document.getElementById('journey-frame');
  if (frame && !frame.src) frame.src = frame.dataset.src;
});
registerLoader('concepts', loadConcepts);
registerLoader('crisp-dm', loadCrispDm);
registerLoader('agent-performance', loadAgentPerformance);
registerLoader('agent-builds', loadAgentBuilds);
registerLoader('agent-panel', async () => { await loadAgentPanel(); _renderLiveAlgos(); });

// ── Expose to window for onclick attributes ──────────────────────────────────
window.show = show;
window.toggleSidebar = toggleSidebar;
window.switchAgentTab = switchAgentTab;
window.switchCrispTab = switchCrispTab;
window.loadConcepts = loadConcepts;
window.loadCrispDm = loadCrispDm;
window.loadAgentPerformance = loadAgentPerformance;
window.setAgentPerfPeriod = setAgentPerfPeriod;
window.loadAgentPerfTimeline = loadAgentPerfTimeline;
window.loadAgentBuilds = loadAgentBuilds;
window.submitTokenEstimate = submitTokenEstimate;
window.toggleEstimateWidget = toggleEstimateWidget;
window.closeChartModal = closeChartModal;
window.loadAgentPanel = loadAgentPanel;
window.agentPanelStep = agentPanelStep;
window.resetAgentPanel = resetAgentPanel;
window.approveAgentProposal = approveAgentProposal;
window.rejectAgentProposal = rejectAgentProposal;
window.setApDays = setApDays;

// ── Init ─────────────────────────────────────────────────────────────────────
window.addEventListener('load', async () => {
  await ensureDevToken();
  // Show the intro section by default; back from sign-in to save → What I Need
  const start = hasPendingSave() ? 'what-i-need' : 'investgame';
  const defaultNav = document.querySelector(`[data-s="${start}"]`);
  if (defaultNav) show(start, defaultNav);
});
