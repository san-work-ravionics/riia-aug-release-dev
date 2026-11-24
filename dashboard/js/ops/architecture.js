// ── Architecture Map (groma C4 viewer) ───────────────────────────────────────
import { apiFetch } from './api.js';

let _d = null;

export async function loadArchitecture() {
  const wrap = document.getElementById('arch-wrap');
  wrap.innerHTML = '<div class="loading">Loading architecture map…</div>';

  _d = await apiFetch('/api/v1/architecture');
  if (!_d || !_d.systems?.length) {
    wrap.innerHTML = '<div class="empty">Architecture data unavailable — groma/ folder missing or empty.</div>';
    return;
  }
  _render();
}

function _render() {
  const wrap = document.getElementById('arch-wrap');
  const sys = _d.systems[0];
  const totalComps = sys.containers.reduce((s, c) => s + c.components.length, 0);

  const conCards = sys.containers.map(con => {
    const hasComps = con.components.length > 0;
    return `<div class="card" data-con-id="${con.id}" onclick="selectArchContainer('${con.id}')"
         style="cursor:pointer;border-left:3px solid ${hasComps ? 'var(--data)' : 'var(--border)'}">
      <div class="c-ey" style="justify-content:space-between">
        <span style="display:flex;align-items:center;gap:5px">
          <span class="ey-d" style="background:${hasComps ? 'var(--data)' : 'var(--t4)'}"></span>Container
        </span>
        ${hasComps ? `<span style="color:var(--data);font-weight:600">${con.components.length}</span>` : ''}
      </div>
      <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:4px">${_esc(con.title)}</div>
      ${con.technology ? `<div style="font-family:var(--fm);font-size:9px;color:var(--t4);margin-bottom:7px">${_esc(con.technology)}</div>` : ''}
      <div style="font-size:11px;color:var(--t2);line-height:1.5">${_esc(con.description)}</div>
      ${hasComps ? `<div style="margin-top:10px;font-size:10px;color:var(--data);font-weight:600">View components ›</div>` : ''}
    </div>`;
  }).join('');

  const actorRows = (_d.actors || []).map(a =>
    `<div class="svc-row"><span>${_esc(a.title)}</span>
     <span style="font-size:10px;color:var(--t3);max-width:60%;text-align:right">${_esc(a.description)}</span></div>`
  ).join('') || '<div class="empty" style="padding:14px">No actors defined</div>';

  const extRows = (_d.externals || []).map(e =>
    `<div class="svc-row"><span>${_esc(e.title)}</span>
     <span style="font-size:10px;color:var(--t3);max-width:60%;text-align:right">${_esc(e.description)}</span></div>`
  ).join('') || '<div class="empty" style="padding:14px">No externals defined</div>';

  wrap.innerHTML = `
    <div class="kpi-strip" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
      <div class="kpi"><div class="kpi-ey">System</div>
        <div class="kpi-val" style="font-size:16px">${_esc(sys.title)}</div>
        <div class="kpi-sub">${_esc(sys.description).slice(0, 60)}…</div></div>
      <div class="kpi"><div class="kpi-ey">Containers</div>
        <div class="kpi-val ops">${sys.containers.length}</div>
        <div class="kpi-sub">C4 L2</div></div>
      <div class="kpi"><div class="kpi-ey">Components</div>
        <div class="kpi-val ops">${totalComps}</div>
        <div class="kpi-sub">C4 L3 (FastAPI app)</div></div>
      <div class="kpi"><div class="kpi-ey">Externals</div>
        <div class="kpi-val">${(_d.externals || []).length}</div>
        <div class="kpi-sub">External systems</div></div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:13px;margin-bottom:16px" id="arch-con-grid">
      ${conCards}
    </div>

    <div id="arch-drill" style="display:none;margin-bottom:16px"></div>

    <div class="g2">
      <div class="card">
        <div class="c-ey"><span class="ey-d" style="background:var(--t3)"></span>Actors &amp; Users</div>
        ${actorRows}
      </div>
      <div class="card">
        <div class="c-ey"><span class="ey-d" style="background:var(--t3)"></span>External Systems</div>
        ${extRows}
      </div>
    </div>`;
}

export function selectArchContainer(conId) {
  document.querySelectorAll('#arch-con-grid .card').forEach(el =>
    el.style.outline = el.dataset.conId === conId ? '2px solid var(--data)' : ''
  );

  const sys = _d.systems[0];
  const con = sys.containers.find(c => c.id === conId);
  const drill = document.getElementById('arch-drill');
  if (!con) { drill.style.display = 'none'; return; }

  if (!con.components.length) {
    drill.style.display = 'block';
    drill.innerHTML = `<div class="card">
      <div class="c-ey"><span class="ey-d" style="background:var(--data)"></span>${_esc(con.title)}</div>
      <div style="font-size:12px;color:var(--t2)">${_esc(con.overview || con.description)}</div>
    </div>`;
    drill.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }

  const compRows = con.components.map(c => {
    const relItems = (c.relationships || []).slice(0, 2).map(r =>
      `<span style="font-family:var(--fm);font-size:9px;color:var(--t4)">${_esc(r.source)} → ${_esc(r.target)}</span>`
    ).join(' &nbsp; ');
    return `<div style="padding:12px 14px;border-right:1px solid var(--border);border-bottom:1px solid var(--border)">
      <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:3px">${_esc(c.title)}</div>
      <div style="font-size:11px;color:var(--t2);margin-bottom:6px;line-height:1.4">${_esc(c.description)}</div>
      ${relItems ? `<div>${relItems}</div>` : ''}
    </div>`;
  }).join('');

  drill.style.display = 'block';
  drill.innerHTML = `<div class="card" style="padding:0;overflow:hidden">
    <div style="padding:13px 16px;border-bottom:1.5px solid var(--border);display:flex;align-items:center;justify-content:space-between">
      <div>
        <div class="c-ey"><span class="ey-d" style="background:var(--data)"></span>Components — ${_esc(con.title)}</div>
        <div style="font-family:var(--fm);font-size:9px;color:var(--t4)">${_esc(con.technology)}</div>
      </div>
      <div style="font-size:11px;color:var(--t3)">${con.components.length} components</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">
      ${compRows}
    </div>
  </div>`;
  setTimeout(() => drill.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
}

function _esc(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
