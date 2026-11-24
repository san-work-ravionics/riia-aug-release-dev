// ── Architecture Map (groma C4 viewer) ───────────────────────────────────────
import { apiFetch } from './api.js';

let _d = null;        // full architecture JSON
let _selKey = null;   // 'con:<id>' | 'comp:<id>' | 'context'

export async function loadArchitecture() {
  const wrap = document.getElementById('arch-wrap');
  wrap.innerHTML = '<div class="loading">Loading architecture map…</div>';

  _d = await apiFetch('/api/v1/architecture');
  if (!_d || !_d.systems?.length) {
    wrap.innerHTML = '<div class="empty">Architecture data unavailable — groma/ folder missing or empty.</div>';
    return;
  }

  _render();
  _selectNode('context');
}

function _render() {
  const wrap = document.getElementById('arch-wrap');
  const sys = _d.systems[0];
  const compCount = sys.containers.reduce((s, c) => s + c.components.length, 0);

  wrap.innerHTML = `
    <div class="arch-layout">
      <div class="arch-tree" id="arch-tree">${_buildTree(sys)}</div>
      <div class="arch-detail" id="arch-detail"></div>
    </div>
    <div class="arch-context-row" id="arch-ctx-row" style="display:none">
      <div class="arch-ctx-title">System Context</div>
      <div class="arch-ctx-grid" id="arch-ctx-grid"></div>
    </div>`;
}

function _buildTree(sys) {
  const conRows = sys.containers.map(con => {
    const comps = con.components.map(comp =>
      `<div class="arch-node arch-comp-node" data-key="comp:${comp.id}" onclick="selectArchNode('comp','${comp.id}')">${_esc(comp.title)}</div>`
    ).join('');
    return `
      <div class="arch-node arch-con-node" data-key="con:${con.id}" onclick="selectArchNode('con','${con.id}')">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="flex-shrink:0;margin-right:2px">
          <rect x="1" y="1" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
        </svg>
        <span>${_esc(con.title)}</span>
        ${con.components.length ? `<span class="arch-cnt">${con.components.length}</span>` : ''}
      </div>
      <div class="arch-sub" id="arch-sub-${con.id}">${comps}</div>`;
  }).join('');

  return `
    <div class="arch-sys-hdr">${_esc(sys.title)}</div>
    ${conRows}
    <div class="arch-sep"></div>
    <div class="arch-node arch-con-node" data-key="context" onclick="selectArchNode('context','')">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="flex-shrink:0;margin-right:2px">
        <circle cx="5" cy="5" r="4" stroke="currentColor" stroke-width="1.3"/>
      </svg>
      <span>System Context</span>
    </div>`;
}

export function selectArchNode(type, id) {
  _selectNode(type === 'context' ? 'context' : `${type}:${id}`);
}

function _selectNode(key) {
  _selKey = key;

  // Update tree highlighting
  document.querySelectorAll('#arch-tree .arch-node').forEach(el => {
    const k = el.dataset.key;
    el.classList.toggle('on', k === key);
  });

  // Expand/collapse sub-lists
  document.querySelectorAll('#arch-tree .arch-sub').forEach(sub => sub.style.display = 'none');
  if (key.startsWith('con:')) {
    const conId = key.slice(4);
    const sub = document.getElementById('arch-sub-' + conId);
    if (sub) sub.style.display = 'block';
    _renderContainerDetail(conId);
  } else if (key.startsWith('comp:')) {
    const compId = key.slice(5);
    const { con, comp } = _findComp(compId);
    if (con) {
      const sub = document.getElementById('arch-sub-' + con.id);
      if (sub) sub.style.display = 'block';
    }
    _renderComponentDetail(comp);
  } else {
    _renderContextDetail();
  }
}

function _renderContainerDetail(conId) {
  const sys = _d.systems[0];
  const con = sys.containers.find(c => c.id === conId);
  if (!con) return;

  const ctx = document.getElementById('arch-ctx-row');
  if (ctx) ctx.style.display = 'none';

  const techHtml = con.technology ? `<div class="arch-tech">${_esc(con.technology)}</div>` : '';
  const compRows = con.components.map(c =>
    `<div class="arch-comp-chip" onclick="selectArchNode('comp','${c.id}')">${_esc(c.title)}</div>`
  ).join('');

  document.getElementById('arch-detail').innerHTML = `
    <div class="arch-dl-eyebrow">Container · C4 L2</div>
    <div class="arch-dl-title">${_esc(con.title)}</div>
    ${techHtml}
    <div class="arch-dl-desc">${_esc(con.description)}</div>
    ${con.overview ? `<div class="arch-dl-body">${_escHtml(con.overview)}</div>` : ''}
    ${con.components.length ? `
      <div class="arch-dl-sec">Components <span class="arch-cnt-sm">${con.components.length}</span></div>
      <div class="arch-chip-row">${compRows}</div>
    ` : ''}`;
}

function _renderComponentDetail(comp) {
  if (!comp) return;

  const ctx = document.getElementById('arch-ctx-row');
  if (ctx) ctx.style.display = 'none';

  const techHtml = comp.technology ? `<div class="arch-tech">${_esc(comp.technology)}</div>` : '';
  const relRows = comp.relationships?.map(r =>
    `<tr><td>${_esc(r.source)}</td><td>→</td><td>${_esc(r.target)}</td><td class="arch-rel-desc">${_esc(r.description)}</td></tr>`
  ).join('') || '';

  document.getElementById('arch-detail').innerHTML = `
    <div class="arch-dl-eyebrow">Component · C4 L3</div>
    <div class="arch-dl-title">${_esc(comp.title)}</div>
    ${techHtml}
    <div class="arch-dl-desc">${_esc(comp.description)}</div>
    ${comp.overview ? `<div class="arch-dl-body">${_escHtml(comp.overview)}</div>` : ''}
    ${relRows ? `
      <div class="arch-dl-sec">Relationships</div>
      <div class="tbl-wrap"><table class="arch-rel-tbl"><tbody>${relRows}</tbody></table></div>
    ` : ''}`;
}

function _renderContextDetail() {
  const sys = _d.systems[0];
  const ctx = document.getElementById('arch-ctx-row');

  const actorCards = (_d.actors || []).map(a =>
    `<div class="arch-ctx-card">
      <div class="arch-ctx-card-ic actor">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="4.5" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M2.5 12c0-2.485 2.015-4.5 4.5-4.5s4.5 2.015 4.5 4.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
      </div>
      <div class="arch-ctx-card-name">${_esc(a.title)}</div>
      <div class="arch-ctx-card-desc">${_esc(a.description)}</div>
    </div>`
  ).join('');

  const extCards = (_d.externals || []).map(e =>
    `<div class="arch-ctx-card">
      <div class="arch-ctx-card-ic external">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M5 7h4M7 5v4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
      </div>
      <div class="arch-ctx-card-name">${_esc(e.title)}</div>
      <div class="arch-ctx-card-desc">${_esc(e.description)}</div>
    </div>`
  ).join('');

  document.getElementById('arch-detail').innerHTML = `
    <div class="arch-dl-eyebrow">System · C4 L1</div>
    <div class="arch-dl-title">${_esc(sys.title)}</div>
    <div class="arch-dl-desc">${_esc(sys.description)}</div>
    ${sys.overview ? `<div class="arch-dl-body">${_escHtml(sys.overview)}</div>` : ''}
    <div class="arch-dl-sec" style="margin-top:16px">Stats</div>
    <div class="arch-stat-row">
      <div class="arch-stat-box"><span>${sys.containers.length}</span><label>Containers</label></div>
      <div class="arch-stat-box"><span>${sys.containers.reduce((s,c)=>s+c.components.length,0)}</span><label>Components</label></div>
      <div class="arch-stat-box"><span>${(_d.externals||[]).length}</span><label>Externals</label></div>
      <div class="arch-stat-box"><span>${(_d.actors||[]).length}</span><label>Actors</label></div>
    </div>`;

  if (ctx) {
    ctx.style.display = 'block';
    document.getElementById('arch-ctx-grid').innerHTML = actorCards + extCards;
  }
}

function _findComp(compId) {
  for (const con of (_d.systems[0]?.containers || [])) {
    const comp = con.components.find(c => c.id === compId);
    if (comp) return { con, comp };
  }
  return { con: null, comp: null };
}

function _esc(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _escHtml(text) {
  // Convert markdown-ish overview text to escaped HTML with line breaks
  return _esc(text).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
}
