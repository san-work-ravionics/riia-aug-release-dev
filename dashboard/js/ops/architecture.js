// ── Architecture Map (groma C4 diagram view) ─────────────────────────────────
import { apiFetch } from './api.js';

let _d = null;
let _selConId = null;

export async function loadArchitecture() {
  const wrap = document.getElementById('arch-wrap');
  wrap.innerHTML = '<div class="loading">Loading architecture map…</div>';

  _d = await apiFetch('/api/v1/architecture');
  if (!_d || !_d.systems?.length) {
    wrap.innerHTML = '<div class="empty">Architecture data unavailable — groma/ folder missing or empty.</div>';
    return;
  }
  _renderDiagram();
}

function _renderDiagram() {
  const wrap = document.getElementById('arch-wrap');
  const sys = _d.systems[0];

  const actorCards = (_d.actors || []).map(a => `
    <div class="ac-person">
      <svg class="ac-person-ic" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.6"/>
        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
      <div class="ac-person-name">${_esc(a.title)}</div>
      <div class="ac-person-desc">${_esc(a.description)}</div>
    </div>`).join('');

  const conCards = sys.containers.map(con => `
    <div class="ac-con" data-con-id="${con.id}" onclick="selectArchContainer('${con.id}')">
      <div class="ac-con-name">${_esc(con.title)}</div>
      ${con.technology ? `<div class="ac-con-tech">${_esc(con.technology)}</div>` : ''}
      <div class="ac-con-desc">${_esc(con.description)}</div>
      ${con.components.length ? `<div class="ac-con-cta">${con.components.length} components ›</div>` : ''}
    </div>`).join('');

  const extCards = (_d.externals || []).map(e => `
    <div class="ac-ext">
      <div class="ac-ext-name">${_esc(e.title)}</div>
      <div class="ac-ext-desc">${_esc(e.description)}</div>
    </div>`).join('');

  wrap.innerHTML = `
    <div class="ac-wrap">

      <div class="ac-tier ac-actors-tier">
        <div class="ac-tier-lbl">Actors</div>
        <div class="ac-tier-items">${actorCards}</div>
      </div>

      <div class="ac-connector"><div class="ac-line"></div><div class="ac-arrow-head">▼</div></div>

      <div class="ac-sys-boundary">
        <div class="ac-sys-label">${_esc(sys.title)}
          <span class="ac-sys-tag">System</span>
        </div>
        <div class="ac-con-grid">${conCards}</div>
      </div>

      <div class="ac-connector"><div class="ac-line"></div><div class="ac-arrow-head">▼</div></div>

      <div class="ac-tier ac-ext-tier">
        <div class="ac-tier-lbl">External Systems</div>
        <div class="ac-tier-items">${extCards}</div>
      </div>

    </div>

    <div class="ac-drill" id="ac-drill" style="display:none">
      <div id="ac-drill-inner"></div>
    </div>`;
}

export function selectArchContainer(conId) {
  _selConId = conId;

  document.querySelectorAll('.ac-con').forEach(el =>
    el.classList.toggle('on', el.dataset.conId === conId)
  );

  const sys = _d.systems[0];
  const con = sys.containers.find(c => c.id === conId);
  if (!con) return;

  const drill = document.getElementById('ac-drill');
  const inner = document.getElementById('ac-drill-inner');

  if (!con.components.length) {
    _renderConDetail(inner, con);
  } else {
    _renderCompGrid(inner, con);
  }

  drill.style.display = 'block';
  setTimeout(() => drill.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
}

function _renderConDetail(inner, con) {
  inner.innerHTML = `
    <div class="ac-drill-hdr">
      <div class="ac-drill-eyebrow">Container · C4 L2</div>
      <div class="ac-drill-title">${_esc(con.title)}</div>
      ${con.technology ? `<div class="ac-drill-tech">${_esc(con.technology)}</div>` : ''}
    </div>
    <div class="ac-drill-desc">${_esc(con.description)}</div>
    ${con.overview ? `<div class="ac-drill-body">${_esc(con.overview)}</div>` : ''}`;
}

function _renderCompGrid(inner, con) {
  const cards = con.components.map(c => {
    const relRows = (c.relationships || []).slice(0, 3).map(r => `
      <div class="ac-rel-row">
        <span class="ac-rel-src">${_esc(r.source)}</span>
        <span class="ac-rel-arr">→</span>
        <span class="ac-rel-tgt">${_esc(r.target)}</span>
        <span class="ac-rel-desc">${_esc(r.description)}</span>
      </div>`).join('');

    return `
      <div class="ac-comp">
        <div class="ac-comp-name">${_esc(c.title)}</div>
        <div class="ac-comp-desc">${_esc(c.description)}</div>
        ${relRows ? `<div class="ac-rels">${relRows}</div>` : ''}
      </div>`;
  }).join('');

  inner.innerHTML = `
    <div class="ac-drill-hdr">
      <div class="ac-drill-eyebrow">Container · C4 L2</div>
      <div class="ac-drill-title">${_esc(con.title)}</div>
      ${con.technology ? `<div class="ac-drill-tech">${_esc(con.technology)}</div>` : ''}
      <div class="ac-drill-cnt">${con.components.length} Components</div>
    </div>
    <div class="ac-comp-grid">${cards}</div>`;
}

function _esc(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
