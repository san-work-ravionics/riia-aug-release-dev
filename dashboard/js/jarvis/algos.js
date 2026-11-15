// Jarvis — F48 Algo Check Now: table of registered algos + live signal panel.
// loadAlgos()  — called by showTab when the user opens the Algos tab.
// initAlgos()  — called once at boot to attach the delegated listener on jv-view-algos.

import { api } from '../shared/api.js';
import { t } from './copy.js?v=22';

const _byId = id => document.getElementById(id);
const _esc = s => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ── helpers ────────────────────────────────────────────────────────────────────

function _showMutationError(msg) {
  const el = _byId('jv-algos-mutation-error');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
}

function _hideMutationError() {
  const el = _byId('jv-algos-mutation-error');
  if (el) { el.textContent = ''; el.hidden = true; }
}

function _setSignalField(id, val) {
  const el = _byId(id);
  if (el) el.textContent = (val != null && val !== '') ? String(val) : '—';
}

function _resetSplit() {
  const wrap = _byId('jv-algos-table-wrap');
  const panel = _byId('jv-algos-signal-panel');
  if (wrap) wrap.style.width = '';
  if (panel) { panel.hidden = true; panel.style.width = ''; }
}

function _clearSignalPanel() {
  ['jv-sig-name', 'jv-sig-instrument', 'jv-sig-type', 'jv-sig-signal',
    'jv-sig-target', 'jv-sig-stop-loss', 'jv-sig-confidence', 'jv-sig-action',
    'jv-sig-allocation', 'jv-sig-ltp', 'jv-sig-close', 'jv-sig-as-of',
    'jv-sig-message',
  ].forEach(id => { const el = _byId(id); if (el) el.textContent = ''; });
  const sigErr = _byId('jv-sig-error');
  if (sigErr) { sigErr.textContent = ''; sigErr.hidden = true; }
  const sigLoad = _byId('jv-sig-loading');
  if (sigLoad) sigLoad.hidden = true;
}

// ── render table ───────────────────────────────────────────────────────────────

function _renderTable(algos) {
  const tbody = _byId('jv-algos-tbody');
  const emptyEl = _byId('jv-algos-empty');
  const tableWrap = _byId('jv-algos-table-wrap');
  if (!tbody) return;

  if (!algos || !algos.length) {
    if (emptyEl) emptyEl.hidden = false;
    if (tableWrap) tableWrap.hidden = true;
    return;
  }
  if (emptyEl) emptyEl.hidden = true;
  if (tableWrap) tableWrap.hidden = false;

  tbody.innerHTML = algos.map(a => {
    const isLive = a.status === 'live';
    const statusBadge = isLive
      ? `<span style="color:var(--success);font-weight:600">live</span>`
      : `<span style="color:var(--t3)">${_esc(a.status)}</span>`;
    const goLiveBtn = !isLive
      ? `<button class="btn btn-xs btn-primary" data-action="go-live">${_esc(t('algos.go_live'))}</button> ` : '';
    const pauseBtn = isLive
      ? `<button class="btn btn-xs btn-ghost" data-action="pause">${_esc(t('algos.pause'))}</button> ` : '';
    const deleteBtn = `<button class="btn btn-xs" style="color:var(--danger)" data-action="delete">${_esc(t('algos.delete'))}</button> `;
    const perfBtn = `<button class="btn btn-xs btn-ghost" data-action="perf" data-algo-name="${_esc(a.name)}">${_esc(t('algos.perf'))}</button> `;
    const checkNowBtn = isLive
      ? `<button class="btn btn-xs btn-primary" data-action="check-now">${_esc(t('algos.check_now'))}</button>` : '';
    return `<tr data-algo-id="${_esc(a.algo_id)}">
      <td>${_esc(a.name)}</td>
      <td>${_esc(a.instrument)}</td>
      <td>${_esc(a.algo_type)}</td>
      <td>${_esc(a.setup_key || '—')}</td>
      <td>${statusBadge}</td>
      <td style="white-space:nowrap">${goLiveBtn}${pauseBtn}${deleteBtn}${perfBtn}${checkNowBtn}</td>
    </tr>`;
  }).join('');
}

// ── load ───────────────────────────────────────────────────────────────────────

export async function loadAlgos() {
  const loading = _byId('jv-algos-loading');
  const errEl = _byId('jv-algos-error');
  if (loading) loading.hidden = false;
  if (errEl) { errEl.textContent = ''; errEl.hidden = true; }
  _hideMutationError();
  _resetSplit();
  try {
    const algos = await api('/api/v1/experience/rita/algos');
    _renderTable(algos);
  } catch (e) {
    if (errEl) { errEl.textContent = t('algos.error', { message: e.message }); errEl.hidden = false; }
  } finally {
    if (loading) loading.hidden = true;
  }
}

// ── actions ────────────────────────────────────────────────────────────────────

async function _goLive(algo_id) {
  try {
    await api(`/api/v1/workflow/algos/${encodeURIComponent(algo_id)}`, 'PATCH', { status: 'live' });
    _resetSplit();
    await loadAlgos();
  } catch (e) {
    _showMutationError(t('algos.mutation_error', { message: e.message }));
  }
}

async function _pause(algo_id) {
  try {
    await api(`/api/v1/workflow/algos/${encodeURIComponent(algo_id)}`, 'PATCH', { status: 'paused' });
    _resetSplit();
    await loadAlgos();
  } catch (e) {
    _showMutationError(t('algos.mutation_error', { message: e.message }));
  }
}

const _deleteTimers = {};

async function _delete(algo_id, btn) {
  if (btn.dataset.confirmPending === '1') {
    // Second click — confirm delete
    clearTimeout(_deleteTimers[algo_id]);
    delete _deleteTimers[algo_id];
    btn.dataset.confirmPending = '';
    try {
      await api(`/api/v1/workflow/algos/${encodeURIComponent(algo_id)}`, 'DELETE')
        .catch(e => { if (!/unexpected end|JSON/i.test(e.message)) throw e; });
      _resetSplit();
      await loadAlgos();
    } catch (e) {
      _showMutationError(t('algos.mutation_error', { message: e.message }));
    }
  } else {
    // First click — arm
    btn.dataset.confirmPending = '1';
    btn.textContent = t('algos.delete_confirm');
    _deleteTimers[algo_id] = setTimeout(() => {
      btn.dataset.confirmPending = '';
      btn.textContent = t('algos.delete');
      delete _deleteTimers[algo_id];
    }, 4000);
  }
}

function _perf(_algo_id, _algo_name) {
  window.open('/dashboard/rita.html#algo-performance', '_blank');
}

async function _checkNow(algo_id) {
  const wrap = _byId('jv-algos-table-wrap');
  const panel = _byId('jv-algos-signal-panel');
  if (!panel) return;

  _clearSignalPanel();

  if (wrap) wrap.style.width = '40%';
  panel.style.width = '60%';
  panel.hidden = false;

  const sigLoad = _byId('jv-sig-loading');
  if (sigLoad) { sigLoad.textContent = t('algos.signal.loading'); sigLoad.hidden = false; }

  try {
    const data = await api(`/api/v1/experience/rita/algos/${encodeURIComponent(algo_id)}/signal`);
    if (sigLoad) sigLoad.hidden = true;
    _setSignalField('jv-sig-name', data.name);
    _setSignalField('jv-sig-instrument', data.instrument);
    _setSignalField('jv-sig-type', data.algo_type);
    _setSignalField('jv-sig-signal', data.signal);
    _setSignalField('jv-sig-target', data.target);
    _setSignalField('jv-sig-stop-loss', data.stop_loss);
    _setSignalField('jv-sig-confidence',
      data.confidence != null ? (data.confidence * 100).toFixed(1) + '%' : null);
    _setSignalField('jv-sig-action', data.action);
    _setSignalField('jv-sig-allocation',
      data.allocation_pct != null ? data.allocation_pct + '%' : null);
    _setSignalField('jv-sig-ltp', data.kite_ltp);
    _setSignalField('jv-sig-close', data.close);
    _setSignalField('jv-sig-as-of', data.as_of);
    _setSignalField('jv-sig-message', data.message || t('algos.signal.no_signal'));
  } catch (e) {
    if (sigLoad) sigLoad.hidden = true;
    const sigErr = _byId('jv-sig-error');
    if (sigErr) {
      sigErr.textContent = t('algos.signal.error', { message: e.message });
      sigErr.hidden = false;
    }
  }
}

// ── init ───────────────────────────────────────────────────────────────────────

export function initAlgos() {
  _byId('jv-view-algos')?.addEventListener('click', async e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const tr = btn.closest('tr[data-algo-id]');
    if (!tr) return;
    const algo_id = tr.dataset.algoId;
    _hideMutationError();
    const action = btn.dataset.action;
    if (action === 'go-live') await _goLive(algo_id);
    else if (action === 'pause') await _pause(algo_id);
    else if (action === 'delete') await _delete(algo_id, btn);
    else if (action === 'perf') _perf(algo_id, btn.dataset.algoName || '');
    else if (action === 'check-now') await _checkNow(algo_id);
  });

  _byId('jv-sig-dismiss')?.addEventListener('click', _resetSplit);
}
