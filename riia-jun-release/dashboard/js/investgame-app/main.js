// ── Invest Game App — main.js (entry point) ─────────────────────────────────
import { show, registerLoader, toggleSidebar } from './nav.js';
import { loadConcepts, switchAgentTab } from './concepts.js';
import { loadCrispDm, switchCrispTab } from './crisp-dm.js';
import { loadAgentPerformance } from './agent-performance.js';
import { loadAgentBuilds } from './agent-builds.js';
import { loadAgentPanel, agentPanelStep, resetAgentPanel, approveAgentProposal, rejectAgentProposal } from './agent-panel.js';
import { ensureDevToken } from '../shared/dev-auth.js';

// ── Register section loaders ─────────────────────────────────────────────────
registerLoader('investgame', () => {}); // intro page — no data to load
registerLoader('concepts', loadConcepts);
registerLoader('crisp-dm', loadCrispDm);
registerLoader('agent-performance', loadAgentPerformance);
registerLoader('agent-builds', loadAgentBuilds);
registerLoader('agent-panel', loadAgentPanel);

// ── Expose to window for onclick attributes ──────────────────────────────────
window.show = show;
window.toggleSidebar = toggleSidebar;
window.switchAgentTab = switchAgentTab;
window.switchCrispTab = switchCrispTab;
window.loadConcepts = loadConcepts;
window.loadCrispDm = loadCrispDm;
window.loadAgentPerformance = loadAgentPerformance;
window.loadAgentBuilds = loadAgentBuilds;
window.loadAgentPanel = loadAgentPanel;
window.agentPanelStep = agentPanelStep;
window.resetAgentPanel = resetAgentPanel;
window.approveAgentProposal = approveAgentProposal;
window.rejectAgentProposal = rejectAgentProposal;

// ── Init ─────────────────────────────────────────────────────────────────────
window.addEventListener('load', async () => {
  await ensureDevToken();
  // Show the intro section by default
  const defaultNav = document.querySelector('[data-s="investgame"]');
  if (defaultNav) show('investgame', defaultNav);
});
