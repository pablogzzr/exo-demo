/* Exo v3 — Your agents, as an office (2026-11-01).
   Pablo: "visually improve where I can see my agents working, something more like the pictures" (an isometric 3D
   office: characters at desks, a status board, Three.js) and "I want it to be the source of truth for me to diagnose
   my second brain". Every color here comes from ONE verdict per agent — `.claude/scripts/salud-agentes.py`, served in
   /api/datos as `salud` — the same one Home and the run read. Green = ran + read + wrote; red = one of them missing,
   with the proof; yellow = works, but needs a decision only he can make or hasn't been useful lately (quiet: shown
   only here); grey = not its day, or he starts it. Three.js is vendored (/vendor/three.min.js, global THREE). */
import { $, $$, esc, api, toast, ST, reportMiss } from './app.js';
import { isla3d } from './isla3d.js';   /* the agents map is the island (was the office, oficina3d) */
let O3 = null; const DECIDED = {};
async function office(stage) { if (!stage) return; try { await loadThree(); } catch (_) { pueblo(stage); return; } if (O3) O3.destroy(); O3 = isla3d(stage, salud(), id => elegir(id)); if (!O3) pueblo(stage); else Object.keys(DECIDED).forEach(id => O3.fix(id)); }

const ORQ = {
  mantenimiento: { name: 'Upkeep', color: 0x5EE6B0, css: '#5EE6B0' },
  personas: { name: 'People', color: 0x7C9BFF, css: '#7C9BFF' },
  pensamiento: { name: 'Thinking', color: 0xB49CFF, css: '#B49CFF' },
  compromisos: { name: 'Commitments', color: 0xFFB547, css: '#FFB547' },
  fuera: { name: 'On their own', color: 0xC9CED6, css: '#C9CED6' },
};
const COL = { rojo: { css: '#FF5A5A', hex: 0xFF5A5A, word: 'Not working' }, amarillo: { css: '#FFB547', hex: 0xFFB547, word: 'Needs a look' }, verde: { css: '#5EE6B0', hex: 0x5EE6B0, word: 'Working' }, gris: { css: '#8A93A0', hex: 0x8A93A0, word: 'Idle' } };
const PROOF = { ran: 'Ran', read: 'Read', wrote: 'Wrote', you: 'Needs you', useful: 'Useful' };

let W = null;         // the 3D world, built once per mount
export const _debug = () => W;
let SEL = null;

function loadThree() {
  if (window.THREE && window.THREE.UnrealBloomPass) return Promise.resolve();
  const one = f => new Promise((ok, no) => { const s = document.createElement('script'); s.src = './vendor/' + f; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  const fs = ['CopyShader.js', 'LuminosityHighPassShader.js', 'EffectComposer.js', 'RenderPass.js', 'ShaderPass.js', 'UnrealBloomPass.js'];
  return (window.THREE ? Promise.resolve() : one('three.min.js')).then(() => window.THREE.UnrealBloomPass ? null : fs.reduce((p, f) => p.then(() => one(f)), Promise.resolve()));
}

/* ── the data ──────────────────────────────────────────────────────────────── */
function salud() { return (ST.D && ST.D.salud) || null; }
async function refrescar() { try { ST.D = await api('/api/datos'); } catch (_) { } }

/* ── the page ──────────────────────────────────────────────────────────────── */
export const AGENTS_APP = {
  async mount(el) {
    this.el = el;
    el.innerHTML = `<div class="wrap of-wrap">
      <div class="topbar"><div><h1 class="page">Your agents</h1><p class="sub" style="margin-top:6px" id="ofSub">Reading their last runs…</p></div>
        <div class="of-legend"><span><i style="background:${COL.verde.css}"></i>Working</span><span><i style="background:${COL.amarillo.css}"></i>Needs a look</span><span><i style="background:${COL.rojo.css}"></i>Not working</span><span><i style="background:${COL.gris.css}"></i>Idle</span></div></div>
      <div class="of-grid">
        <div class="glass of-stage of-3d" id="ofStage"></div>
        <div class="glass of-side" id="ofSide"></div>
      </div>
      <div id="ofFeed"></div>
      <div id="ofList"></div></div>`;
    if (!salud()) await refrescar();
    this.render();
    this.feed();
    /* the Today feed stays live: re-read every minute while Agents is the open app */
    if (!this.reloj) this.reloj = setInterval(() => { if (ST.view === 'agents' && !document.hidden) this.feed(); }, 60000);
    office($('#ofStage', el));   /* demo (Pablo, round 9): the office from his photo */
  },
  async show() { await refrescar(); this.render(); this.feed(); if (!O3 || !$('#ofStage canvas', this.el)) office($('#ofStage', this.el)); },
  /* Today feed (2026-11-02) — every run of today, newest first, one line each: time · agent · what it did. From
     the day's activity log (`5 Sistema/dia/actividad/`, written by .claude/scripts/actividad.py), served as
     /api/datos `actividad`; /api/corridas only when that is missing. Tap a line to see that agent's proof. */
  async feed() {
    const box = $('#ofFeed', this.el); if (!box) return;
    const n = new Date(), hoy = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
    let de;
    if (ST.D && Array.isArray(ST.D.actividad) && ST.D.actividad.length) {
      de = ST.D.actividad.map(r => ({ trabajo: r.trabajo, cuando: `${hoy}T${r.hora}`, resultado: r.resultado, nota: r.nota, nombre: r.nombre })).reverse();
    } else {
      try { de = ((await api('/api/corridas?n=60')).corridas || []).filter(r => (r.cuando || '').slice(0, 10) === hoy); } catch (_) { box.innerHTML = ''; return; }
    }
    const nombre = r => { const a = r.trabajo && agente(r.trabajo); return a ? a.nombre : (r.nombre || r.trabajo); };
    const punto = { ok: COL.verde.css, fallo: COL.rojo.css, 'sin-novedad': COL.gris.css };
    box.innerHTML = `<div class="sec-head"><h2 class="sec">Today</h2><span class="sub">${de.length ? `${de.length} run${de.length > 1 ? 's' : ''} so far, newest first` : 'Nothing ran yet today'}</span></div>` +
      (de.length ? `<div class="glass of-col">${de.map(r =>
        `<button class="of-row" type="button" data-ag="${esc(r.trabajo)}" title="${esc(r.nota || '')}"><span class="mono mu" style="flex:none;font-size:11.5px">${esc(r.cuando.slice(11, 16))}</span><span class="of-dot" style="background:${punto[r.resultado] || COL.gris.css}"></span><span style="flex:none;max-width:34%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(nombre(r))}</span><span class="of-t" style="flex:1;max-width:none">${esc(r.nota || (r.resultado === 'sin-novedad' ? 'Nothing new' : ''))}</span></button>`).join('')}</div>` : '');
    $$('[data-ag]:not([data-ag=""])', box).forEach(b => b.onclick = () => elegir(b.dataset.ag, true));
  },
  render() {
    const S = salud(); const el = this.el; if (!S || !S.agentes) { $('#ofSub', el).textContent = "Couldn't read your agents' health."; return; }
    const c = S.cuenta || {}; const corren = S.agentes.filter(a => a.color !== 'gris');
    $('#ofSub', el).innerHTML = `${c.rojo ? `<b style="color:${COL.rojo.css}">${c.rojo} needs your decision</b> · ` : '<b style="color:#5EE6B0">Everything ran</b> · '}${c.amarillo ? `${c.amarillo} need a look · ` : ''}${c.verde} working · checked ${esc((S.calculado || '').slice(11, 16))}`;
    if (!SEL) lado(null); else lado(SEL);
    // the list under the office, by orchestrator
    const grupos = {}; S.agentes.forEach(a => { const k = ORQ[a.orquestador] ? a.orquestador : 'fuera'; (grupos[k] = grupos[k] || []).push(a); });
    $('#ofList', el).innerHTML = `<div class="sec-head"><h2 class="sec">Everyone</h2><span class="sub">By the goal they serve. Red first.</span></div><div class="of-cols">` +
      Object.keys(ORQ).filter(k => grupos[k]).map(k => `<div class="glass of-col"><div class="kick" style="color:${ORQ[k].css}">${ORQ[k].name}</div>${grupos[k].map(a =>
        `<button class="of-row" type="button" data-ag="${esc(a.id)}"><span class="of-dot" style="background:${COL[a.color].css}"></span><span class="of-n">${esc(a.nombre)}</span><span class="of-t">${esc(a.color === 'verde' ? (a.ultima_texto || '') : a.color === 'gris' ? a.titulo : COL[a.color].word)}</span></button>`).join('')}</div>`).join('') + '</div>';
    $$('[data-ag]', el).forEach(b => b.onclick = () => elegir(b.dataset.ag, true));
    void corren;
  },
};

function agente(id) { const S = salud(); return S && S.agentes.find(a => a.id === id); }

window.__ofPick = id => elegir(id);
function elegir(id, scroll) {
  SEL = id; lado(id); if (O3) O3.select(id); document.querySelectorAll('#agTown .ag').forEach(x => x.classList.toggle('sel', x.dataset.ag === id));
  if (scroll) $('#ofStage').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* the side panel: what's wrong (nothing picked) or one agent's proof */
function lado(id) {
  const box = $('#ofSide'); if (!box) return; const S = salud(); if (!S) return;
  if (id && id.startsWith('team:')) { const k = id.slice(5), o = ORQ[k], xs = S.agentes.filter(x => x.orquestador === k && x.id !== 'lider');
    box.innerHTML = `<div class="of-top"><button class="btn sm ghost" type="button" id="ofBack">← Everyone</button><span class="chip" style="border-color:${o.css};color:${o.css}">Orchestrator</span></div>
      <div class="kick" style="color:${o.css};margin-top:12px">${esc(o.name)} team</div><h2 class="serif of-name">${esc(o.name)} orchestrator</h2>
      <p class="mu" style="margin-top:4px">Runs ${xs.length} agents, checks their work at 3:00 and reports to the Orchestrator.</p>
      <div class="of-proofs">${xs.map(x => `<button class="of-issue${x.color === 'rojo' ? ' bad' : x.color === 'amarillo' ? ' warn' : ''}" type="button" data-ag="${esc(x.id)}"><b>${esc(x.nombre)}</b><span>${esc(DECIDED[x.id] ? 'Decided · runs tonight at 23:00' : x.titulo)}</span></button>`).join('')}</div>`;
    $('#ofBack').onclick = () => { SEL = null; lado(null); if (O3) O3.select(null); }; $$('[data-ag]', box).forEach(b => b.onclick = () => elegir(b.dataset.ag)); return; }
  const a = id && agente(id);
  if (!a) {
    const rojos = S.agentes.filter(x => x.color === 'rojo'), amar = S.agentes.filter(x => x.color === 'amarillo');
    const open = rojos.filter(x => !DECIDED[x.id]);
    box.innerHTML = `<div class="kick">${open.length ? 'Needs your decision' : 'All clear'}</div>
      ${open.length ? '' : `<p class="serif of-big">Every agent ran, read and wrote what it should.</p>`}
      ${open.map(x => `<button class="of-issue bad" type="button" data-ag="${esc(x.id)}"><b>${esc(x.nombre)}</b><span>${esc(x.titulo)}</span></button>`).join('')}
      ${amar.length ? `<div class="kick" style="margin-top:18px">Needs a look · only here</div>${amar.map(x => `<button class="of-issue warn" type="button" data-ag="${esc(x.id)}"><b>${esc(x.nombre)}</b><span>${esc(x.titulo)}</span></button>`).join('')}` : ''}
      ${S.agentes.some(x => x.arreglado) ? `<div class="kick" style="margin-top:18px">Fixed this morning</div>${S.agentes.filter(x => x.arreglado).map(x => `<button class="of-issue" type="button" data-ag="${esc(x.id)}"><b>${esc(x.nombre)}</b><span>${esc(x.arreglado)}</span></button>`).join('')}` : ''}
      ${(S.preguntas || []).length ? `<div class="kick" style="margin-top:18px">Questions for you · ${S.preguntas.length}</div>${S.preguntas.map((q, n) => `<button class="of-issue warn" type="button" data-pq="${n}"><b>${esc(ORQ[q.orquestador] ? ORQ[q.orquestador].name : q.orquestador)}</b><span>${esc(q.texto)}</span></button>`).join('')}<p class="of-src">Your setup's questions live here, not in the week close. Tap one to answer it with the Architect.</p>` : ''}
      <button class="btn sm" type="button" id="ofMiss" style="margin-top:16px">Report a miss</button>
      <p class="of-src">One check for every screen: last run, schedule, the read check, the judge (${esc(S.fuentes && S.fuentes.juez || '—')}), the morning pass's questions and the trust score.</p>`;
    $$('[data-ag]', box).forEach(b => b.onclick = () => elegir(b.dataset.ag));
    $('#ofMiss', box).onclick = reportMiss;
    /* 2026-11-02 — the setup questions moved here from the week close (Pablo: "give it to me in my agents"). */
    $$('[data-pq]', box).forEach(b => b.onclick = () => { const q = S.preguntas[+b.dataset.pq]; if (!q) return;
      const p = `/arquitecto A setup question from Your agents (${q.fila}). The question: ${q.texto}\n\nWrite my answer under that row as "  Pablo: <my answer>" and mark it [x] ([-] for a no); a yes to a change, build it.\n\nMy answer: `;
      fetch('/api/correlo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: p }) })
        .then(r => r.json()).then(j => toast(j.ok ? 'Opened a Claude chat with it written' : (j.error || 'The prompt is copied — paste it in a chat'))).catch(() => toast("Couldn't reach your Mac", true)); });
    return;
  }
  const o = ORQ[a.orquestador] || ORQ.fuera, col = COL[a.color];
  const fixPrompt = `/arquitecto ${a.id} (${a.nombre}) is ${a.color === 'rojo' ? 'not working' : 'flagged'} on Your agents. The proof: ${a.pruebas.filter(p => p.ok !== true).map(p => p.texto).join(' | ')}. Find the cause and fix it; if it needs my input, ask me in plain words.`;
  box.innerHTML = `<div class="of-top"><button class="btn sm ghost" type="button" id="ofBack">← Everyone</button><span class="chip" style="border-color:${col.css};color:${col.css}">${col.word}</span></div>
    <div class="kick" style="color:${o.css};margin-top:12px">${o.name}</div><h2 class="serif of-name">${esc(a.nombre)}</h2>
    ${a.hace ? `<p class="mu" style="margin-top:4px">${esc(a.hace)}</p>` : ''}
    <div class="of-proofs">${(a.pruebas || []).map(p => `<div class="of-proof ${p.ok === true ? 'ok' : p.ok === false ? 'bad' : p.ok === 'warn' ? 'warn' : 'wait'}"><span class="of-pk">${esc(PROOF[p.k] || p.k)}</span><span>${esc(p.texto)}</span></div>`).join('') || `<p class="mu">${esc(a.titulo)}</p>`}</div>
    ${a.arreglado ? `<div class="kick" style="margin-top:14px">Fixed this morning</div><p class="of-msg">${esc(a.arreglado)}</p>` : ''}
    ${a.opciones && !DECIDED[a.id] ? `<div class="of-decide" id="ofDecide"><div class="kick">Your decision</div><p>${esc(a.pregunta)}</p>${a.opciones.map((o, n) => `<button class="of-opt" type="button" data-op="${n}"><b>${esc(o[0])}</b><span>${esc(o[1])}</span></button>`).join('')}</div>`
      : DECIDED[a.id] ? `<div class="of-decide done" id="ofDecide"><div class="kick">Decided</div><p><b>${esc(DECIDED[a.id])}</b>. It runs again tonight at 23:00.</p></div>`
      : a.pregunta ? `<div class="of-q"><div class="kick">The question for you</div><p>${esc(a.pregunta)}</p></div>` : ''}
    ${a.mensaje && a.color !== 'gris' ? `<div class="kick" style="margin-top:14px">What its last run said</div><p class="of-msg">${esc(a.mensaje)}</p>` : ''}
    <dl class="of-dl">${a.proxima_texto ? `<dt>Next run</dt><dd>${esc(a.proxima_texto)}</dd>` : ''}${a.corre_en ? `<dt>Runs</dt><dd>${a.corre_en === 'nube' ? 'In the cloud' : 'On the Mac'}</dd>` : ''}${a.util != null ? `<dt>Trust</dt><dd>${a.util}/100</dd>` : ''}${a.esperando ? `<dt>Waiting on you</dt><dd>${a.esperando} card${a.esperando > 1 ? 's' : ''}</dd>` : ''}</dl>
    ${(a.color === 'rojo' || a.color === 'amarillo') && !a.opciones ? `<button class="btn" type="button" id="ofFix" style="margin-top:14px">${a.pregunta ? 'Answer it with the Architect ↗' : 'Ask the Architect to fix it ↗'}</button>` : ''}
    <button class="btn sm" type="button" id="ofMiss" style="margin-top:16px">Report a miss</button>`;
  $$('[data-op]', box).forEach(b => b.onclick = () => { const o = a.opciones[+b.dataset.op]; DECIDED[a.id] = o[0]; if (O3) O3.fix(a.id); toast('Decided: ' + o[0] + '. ' + a.nombre + ' runs again tonight at 23:00.'); lado(a.id); });
  const mi = $('#ofMiss', box); if (mi) mi.onclick = reportMiss;
  $('#ofBack').onclick = () => { SEL = null; lado(null); if (O3) O3.select(null); document.querySelectorAll('#agTown .ag.sel').forEach(x => x.classList.remove('sel')); };
  const fx = $('#ofFix'); if (fx) fx.onclick = () => {
    const p = a.pregunta ? `/arquitecto ${a.id} needs my input. The question: ${a.pregunta}\n\nMy answer: ` : fixPrompt;
    fetch('/api/correlo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: p }) })
      .then(r => r.json()).then(j => toast(j.ok ? 'Opened a Claude chat with it written' : (j.error || 'The prompt is copied — paste it in a chat'))).catch(() => toast("Couldn't reach your Mac", true));
  };
}

/* ── the town (demo, 2026-11-03): after a16z's AI Town and Stanford's Smallville — four rooms, one per team; every
   agent a character with its job on its face, its name on a tag, last night's work in a bubble, and its health in how
   it moves (bobbing = working, ! = needs a look, grey and shaking = failed, zzz = not its day) ── */
const ICON = { registro: '📇', seguimiento: '🤝', cracks: '🎯', linkedin: '✍️', 'linkedin-mac': '📣', platicas: '🎤', conectar: '🔗',
  esperando: '⏳', prep: '📋', 'prep-mac': '🔎', 'prep-registros': '🎟️', bandeja: '📥', coach: '🧭', consejo: '🏛️', digest: '🎧', bentley: '🎓',
  leccion: '💡', estudio: '📚', tiempo: '⏱️', cierre: '📅', canales: '📡', 'canales-mac': '🖥️', aduana: '🗂️', taller: '🔧', juez: '⚖️',
  sincronia: '🔄', respaldo: '💾', lider: '👑' };
const ROOM = { personas: 'Finds and keeps your people', compromisos: 'Keeps your promises and meetings', pensamiento: 'Helps you think and learn', mantenimiento: 'Keeps the system alive' };
function corto(t) { t = String(t || '').split(/[;:.](\s|$)/)[0].trim(); return t.length > 46 ? t.slice(0, 44).replace(/\s+\S*$/, '') + '…' : t; }
function pueblo(stage) {
  const S = salud(); if (!stage || !S) return;
  const by = {}; S.agentes.forEach(a => { const k = ROOM[a.orquestador] ? a.orquestador : 'mantenimiento'; (by[k] = by[k] || []).push(a); });
  stage.innerHTML = `<div class="ag-town" id="agTown">${Object.keys(ROOM).filter(k => by[k]).map(k => { const o = ORQ[k];
    return `<section class="ag-room" style="--c:${o.css}"><header><b>${esc(o.name)}</b><span>${esc(ROOM[k])} · ${by[k].length}</span></header><div class="ag-floor">${by[k].map((a, i) => {
      const st = a.color === 'rojo' ? 'down' : a.color === 'amarillo' ? 'look' : a.color === 'gris' ? 'idle' : 'ok';
      return `<button type="button" class="ag ag-${st}${SEL === a.id ? ' sel' : ''}" data-ag="${esc(a.id)}" style="--d:${(i * .37) % 2.2}s" title="${esc(a.nombre)}: ${esc(a.mensaje || a.titulo || '')}">
        <span class="ag-bub">${esc(st === 'idle' ? 'Not my day — Sunday' : corto(a.color === 'rojo' ? a.titulo : a.mensaje))}</span>
        <span class="ag-body"><span class="ag-face">${ICON[a.id] || '🤖'}</span>${st === 'down' ? '<i class="ag-b">!</i>' : st === 'look' ? '<i class="ag-b">?</i>' : st === 'idle' ? '<i class="ag-b">z</i>' : ''}</span>
        <span class="ag-name">${esc(a.nombre)}</span></button>`; }).join('')}</div></section>`; }).join('')}</div>
    <div class="ag-legend"><span><i class="ok"></i>working</span><span><i class="look"></i>needs a look</span><span><i class="down"></i>failed</span><span><i class="idle"></i>not its day</span><span class="mu">Tap anyone to see what they did</span></div>`;
  stage.querySelectorAll('[data-ag]').forEach(b => b.onclick = () => elegir(b.dataset.ag));
  /* one bubble at a time per room, so the town talks without shouting */
  clearInterval(pueblo.t); let n = 0;
  const talk = () => { stage.querySelectorAll('.ag-room').forEach(r => { const xs = [...r.querySelectorAll('.ag')]; xs.forEach(x => x.classList.remove('talk')); const pick = xs.find(x => x.classList.contains('ag-down')) && n % 2 === 0 ? xs.find(x => x.classList.contains('ag-down')) : xs[n % xs.length]; if (pick) pick.classList.add('talk'); }); n++; };
  talk(); pueblo.t = setInterval(() => { if (!stage.isConnected) return clearInterval(pueblo.t); talk(); }, 2600);
}

/* ── the 3D office ─────────────────────────────────────────────────────────── */
function construir(stage) {
  const T = window.THREE; const S = salud(); if (!S) return;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const R = new T.WebGLRenderer({ antialias: true, alpha: true });
  R.setPixelRatio(Math.min(2, devicePixelRatio)); R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap;
  if ('outputEncoding' in R) R.outputEncoding = T.sRGBEncoding;
  stage.prepend(R.domElement);
  const scene = new T.Scene();
  const cam = new T.OrthographicCamera(-10, 10, 10, -10, 0.1, 200);
  scene.add(new T.HemisphereLight(0xf4f1ff, 0x1a1d2b, 0.75));
  const sun = new T.DirectionalLight(0xfff3e2, 0.95); sun.position.set(-14, 26, 12); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 80 }); sun.shadow.radius = 4; sun.shadow.bias = -0.0006;
  scene.add(sun);
  const fill = new T.DirectionalLight(0x9fb4ff, 0.25); fill.position.set(18, 10, -6); scene.add(fill);

  const mat = (c, o = {}) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85, metalness: 0.02 }, o));
  const box = (w, h, d, m, x, y, z, sh = true) => { const g = new T.Mesh(new T.BoxGeometry(w, h, d), m); g.position.set(x, y, z); g.castShadow = sh; g.receiveShadow = true; return g; };
  const world = new T.Group(); scene.add(world);

  // who sits where: zones by orchestrator, leads stand at the front of their zone
  const grupos = {}; S.agentes.forEach(a => { const k = ORQ[a.orquestador] ? a.orquestador : 'fuera'; (grupos[k] = grupos[k] || []).push(a); });
  const COLS = 4, DX = 3.0, DZ = 3.3;
  const zonas = [['mantenimiento', 'L'], ['compromisos', 'L'], ['personas', 'R'], ['pensamiento', 'R'], ['fuera', 'R']].filter(([k]) => grupos[k]);
  const filas = k => Math.ceil(grupos[k].filter(a => a.tipo !== 'lider').length / COLS);
  const prof = lado => zonas.filter(z => z[1] === lado).reduce((s, [k]) => s + filas(k) * DZ + 2.2, 0);
  const D = Math.max(prof('L'), prof('R')) + 1.5, Wd = COLS * DX * 2 + 4.5;
  const x0 = -Wd / 2, z0 = -D / 2;

  // the floating platform, its floor and two low walls
  world.add(box(Wd + 0.8, 0.7, D + 0.8, mat(0xd9d4cc), 0, -0.36, 0, false));
  const floor = box(Wd, 0.06, D, mat(0xeeeae4), 0, 0.02, 0, false); world.add(floor);
  const wallM = mat(0xf6f3ee); world.add(box(Wd, 3.2, 0.3, wallM, 0, 1.6, z0 - 0.15)); world.add(box(0.3, 3.2, D, wallM, x0 - 0.15, 1.6, 0));
  // windows on the side wall
  for (let i = 0; i < 3; i++) world.add(box(0.06, 1.5, 2.2, mat(0x9fc6ff, { emissive: 0x3a5a9a, emissiveIntensity: 0.35, roughness: 0.2 }), x0 + 0.02, 1.8, z0 + 3 + i * (D - 5) / 2, false));
  // a soft shadow under the platform
  const halo = new T.Mesh(new T.PlaneGeometry(Wd * 1.25, D * 1.25), new T.MeshBasicMaterial({ map: radial(T), transparent: true, depthWrite: false }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = -1.6; world.add(halo);

  // the status board on the back wall
  const board = tablero(T, S); const bm = new T.Mesh(new T.PlaneGeometry(6.4, 3.2), new T.MeshBasicMaterial({ map: board.tex }));
  bm.position.set(Wd / 2 - 4.4, 1.85, z0 + 0.02); world.add(bm); world.add(box(6.7, 3.5, 0.08, mat(0x2b2f3a), Wd / 2 - 4.4, 1.85, z0 - 0.03, false));
  // plants
  [[x0 + 0.9, z0 + 0.9], [Wd / 2 - 0.9, D / 2 - 0.9], [0, z0 + 0.9]].forEach(([x, z]) => world.add(planta(T, mat, box, x, z)));

  const pick = [], gente = {};
  let zL = z0 + 1.2, zR = z0 + 1.2;
  zonas.forEach(([k, side]) => {
    const xs = side === 'L' ? x0 + 1.6 : 2.2, n = filas(k), o = ORQ[k];
    let zz = side === 'L' ? zL : zR;
    const alfombra = box(COLS * DX + 0.4, 0.02, n * DZ + 1.2, mat(o.color, { roughness: 1, transparent: true, opacity: 0.22 }), xs + (COLS - 1) * DX / 2, 0.06, zz + (n - 1) * DZ / 2 + 0.3, false);
    world.add(alfombra);
    const lab = document.createElement('div'); lab.className = 'of-zone'; lab.style.color = o.css; lab.textContent = o.name; $('#ofLabels').appendChild(lab);
    board.zonas.push({ el: lab, p: new T.Vector3(xs - 1.1, 0.1, zz - 0.9) });
    let i = 0;
    grupos[k].forEach(a => {
      if (a.tipo === 'lider') {
        const p = persona(T, mat, o.color, a); p.root.position.set(xs - 1.4, 0, zz + (n - 1) * DZ / 2 + 0.4); p.root.rotation.y = Math.PI / 2.2; world.add(p.root);
        registrar(a, p); return;
      }
      const c = i % COLS, r = Math.floor(i / COLS); i++;
      const x = xs + c * DX, z = zz + r * DZ;
      world.add(escritorio(T, mat, box, x, z, a));
      const p = persona(T, mat, o.color, a); p.root.position.set(x, 0, z + 0.95); world.add(p.root);
      registrar(a, p);
    });
    zz += n * DZ + 2.2; if (side === 'L') zL = zz; else zR = zz;
  });
  function registrar(a, p) { gente[a.id] = p; p.root.traverse(m => { if (m.isMesh) { m.userData.ag = a.id; pick.push(m); } }); p.a = a;
    const l = document.createElement('div'); l.className = 'of-name-tag ' + a.color; l.textContent = a.nombre; $('#ofLabels').appendChild(l); p.tag = l; }

  // selection ring
  const ring = new T.Mesh(new T.RingGeometry(0.75, 0.95, 40), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
  ring.rotation.x = -Math.PI / 2; ring.visible = false; world.add(ring);

  // camera: isometric, fitted, drag to turn
  let ang = Math.PI / 4, tilt = 0.62, zoomK = 1;
  function fit() {
    const w = stage.clientWidth, h = stage.clientHeight; R.setSize(w, h, false); R.domElement.style.width = w + 'px'; R.domElement.style.height = h + 'px';
    const span = Math.max(Wd, D) * 0.56 / zoomK, asp = w / h;
    cam.left = -span * asp; cam.right = -cam.left; cam.top = span; cam.bottom = -cam.top; cam.updateProjectionMatrix();
  }
  function place() { const r = 60; cam.position.set(Math.sin(ang) * r * Math.cos(tilt), r * Math.sin(tilt), Math.cos(ang) * r * Math.cos(tilt)); cam.lookAt(0, 0.6, 0); }
  fit(); place();
  const ro = new ResizeObserver(() => { fit(); if (W) W.draw((performance.now() - t0) / 1000); }); ro.observe(stage);
  let drag = null, moved = 0;
  R.domElement.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, a: ang, t: tilt }; moved = 0; R.domElement.setPointerCapture(e.pointerId); });
  R.domElement.addEventListener('pointermove', e => { if (!drag) { hover(e); return; } const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved = Math.max(moved, Math.abs(dx) + Math.abs(dy)); ang = drag.a - dx * 0.006; tilt = Math.min(1.25, Math.max(0.35, drag.t + dy * 0.004)); place(); draw((performance.now() - t0) / 1000); });
  R.domElement.addEventListener('pointerup', e => { if (drag && moved < 6) click(e); drag = null; });
  R.domElement.addEventListener('wheel', e => { e.preventDefault(); zoomK = Math.min(2.4, Math.max(0.8, zoomK * (e.deltaY > 0 ? 0.92 : 1.08))); fit(); }, { passive: false });
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  function hit(e) { const b = R.domElement.getBoundingClientRect(); ndc.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1); ray.setFromCamera(ndc, cam); const h = ray.intersectObjects(pick, false)[0]; return h && h.object.userData.ag; }
  let hov = null;
  function hover(e) { const id = hit(e); if (id === hov) return; hov = id; R.domElement.style.cursor = id ? 'pointer' : 'grab'; Object.values(gente).forEach(p => p.tag.classList.toggle('show', p.a.id === id)); }
  function click(e) { const id = hit(e); if (id) elegir(id); }

  const v = new T.Vector3();
  function proj(p3) { v.copy(p3).project(cam); return { x: (v.x + 1) / 2 * stage.clientWidth, y: (1 - v.y) / 2 * stage.clientHeight }; }
  let t0 = performance.now(), raf = 0, vivo = true;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!vivo || ST.view !== 'agents' || document.hidden) return;
    draw((now - t0) / 1000);
  }
  function draw(t) {
    Object.values(gente).forEach(p => p.anim(RM ? 0 : t));
    board.anim && board.anim(t);
    if (ring.visible) ring.material.opacity = 0.55 + 0.3 * Math.sin(t * 3);
    R.render(scene, cam);
    Object.values(gente).forEach(p => { p.head.getWorldPosition(v); v.y += 1.0; const s = proj(v); p.tag.style.transform = `translate(${s.x}px,${s.y}px) translate(-50%,-100%)`; });
    board.zonas.forEach(z => { const s = proj(z.p); z.el.style.transform = `translate(${s.x}px,${s.y}px)`; });
  }
  draw(0); raf = requestAnimationFrame(frame);
  W = {
    draw,
    seleccionar(id) { const p = id && gente[id]; ring.visible = !!p; if (p) { ring.position.set(p.root.position.x, 0.08, p.root.position.z); } Object.values(gente).forEach(q => q.tag.classList.toggle('pin', q.a.id === id)); draw((performance.now() - t0) / 1000); },
    actualizar() { /* colors come from the verdicts; a reload of the page rebuilds the office */ },
    stop() { vivo = false; cancelAnimationFrame(raf); ro.disconnect(); },
  };
}

/* one desk: top, legs, a monitor whose screen glows with the agent's verdict, a chair */
function escritorio(T, mat, box, x, z, a) {
  const g = new T.Group(); const wood = mat(0xc89f74), leg = mat(0x7d7f86);
  g.add(box(2.1, 0.12, 1.15, wood, x, 1.0, z));
  [[-0.95, -0.48], [0.95, -0.48], [-0.95, 0.48], [0.95, 0.48]].forEach(([dx, dz]) => g.add(box(0.08, 1.0, 0.08, leg, x + dx, 0.5, z + dz)));
  const scr = COL[a.color];
  g.add(box(1.15, 0.72, 0.08, mat(0x24262d), x, 1.55, z - 0.3));
  const glow = new T.Mesh(new T.PlaneGeometry(1.03, 0.6), new T.MeshBasicMaterial({ map: pantalla(T, a), toneMapped: false }));
  glow.position.set(x, 1.55, z - 0.255); g.add(glow);
  g.add(box(0.1, 0.32, 0.1, leg, x, 1.2, z - 0.32)); g.add(box(0.7, 0.04, 0.35, mat(0xe7e3dc), x, 1.08, z + 0.15));
  if (a.color === 'amarillo') { const n = box(0.32, 0.32, 0.02, mat(0xffd84d, { emissive: 0x6b5200, emissiveIntensity: 0.3 }), x + 0.45, 1.75, z - 0.25, false); n.rotation.z = 0.15; g.add(n); }
  if (a.color === 'verde' && a.produjo) for (let i = 0; i < Math.min(4, a.produjo); i++) g.add(box(0.42, 0.04, 0.55, mat(0xfafafa), x - 0.7, 1.08 + i * 0.045, z + 0.1, false));
  // chair
  const ch = mat(0x3b3f4a); g.add(box(0.8, 0.1, 0.75, ch, x, 0.62, z + 1.0)); g.add(box(0.8, 0.8, 0.1, ch, x, 1.05, z + 1.4)); g.add(box(0.08, 0.6, 0.08, leg, x, 0.3, z + 1.0));
  void scr; return g;
}

/* one person: a soft rounded body in the orchestrator's color, a head with eyes, and a badge above */
function persona(T, mat, color, a) {
  const root = new T.Group(); root.scale.setScalar(1.18); const body = new T.Group(); root.add(body);
  const skin = mat(color, { roughness: 0.55 });
  const torso = new T.Mesh(new T.CylinderGeometry(0.42, 0.5, 0.95, 20), skin); torso.position.y = 1.05; torso.castShadow = true; body.add(torso);
  const cap = new T.Mesh(new T.SphereGeometry(0.42, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), skin); cap.position.y = 1.52; cap.castShadow = true; body.add(cap);
  const head = new T.Group(); head.position.y = 2.05; body.add(head);
  const hs = new T.Mesh(new T.SphereGeometry(0.42, 24, 18), skin); hs.castShadow = true; head.add(hs);
  const eyeM = new T.MeshStandardMaterial({ color: 0x15171c, roughness: 0.3 }), whiteM = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  [-0.15, 0.15].forEach(dx => { const w = new T.Mesh(new T.SphereGeometry(0.11, 12, 10), whiteM); w.position.set(dx, 0.06, -0.36); head.add(w); const e = new T.Mesh(new T.SphereGeometry(0.06, 10, 8), eyeM); e.position.set(dx, 0.06, -0.45); head.add(e); });
  const legM = mat(0x2a2d36); [-0.18, 0.18].forEach(dx => { const l = new T.Mesh(new T.CylinderGeometry(0.11, 0.11, 0.6, 10), legM); l.position.set(dx, 0.42, 0); l.castShadow = true; body.add(l); });
  const armL = new T.Mesh(new T.CylinderGeometry(0.09, 0.09, 0.6, 10), skin), armR = armL.clone();
  armL.position.set(-0.48, 1.12, -0.15); armR.position.set(0.48, 1.12, -0.15); armL.rotation.x = armR.rotation.x = -0.9; body.add(armL, armR);
  if (a.tipo === 'lider') { const tab = new T.Mesh(new T.BoxGeometry(0.5, 0.36, 0.04), new T.MeshStandardMaterial({ color: 0x1d2230, emissive: 0x3b6cff, emissiveIntensity: 0.4 })); tab.position.set(0, 1.25, -0.5); tab.rotation.x = -0.6; body.add(tab); }
  // badge
  const badge = new T.Sprite(new T.SpriteMaterial({ map: insignia(T, a.color), depthTest: false, transparent: true })); badge.scale.set(0.62, 0.62, 1); badge.position.y = 2.85; body.add(badge);
  if (a.color === 'gris') body.position.y = -0.0;
  const seed = Math.random() * 10, sentado = a.tipo !== 'lider';
  if (sentado) body.position.y = -0.18;
  return {
    root, head,
    anim(t) {
      if (!t) return;
      if (a.color === 'verde') { armL.rotation.x = -0.95 + Math.sin(t * 9 + seed) * 0.12; armR.rotation.x = -0.95 + Math.cos(t * 9 + seed) * 0.12; head.rotation.x = Math.sin(t * 1.3 + seed) * 0.05; }
      else if (a.color === 'rojo') { head.rotation.z = Math.sin(t * 0.9 + seed) * 0.18; head.rotation.x = 0.25; badge.position.y = 2.85 + Math.abs(Math.sin(t * 3)) * 0.18; }
      else if (a.color === 'amarillo') { head.rotation.y = Math.sin(t * 0.7 + seed) * 0.5; badge.position.y = 2.85 + Math.sin(t * 2 + seed) * 0.06; }
      else { head.rotation.y = Math.sin(t * 0.4 + seed) * 0.3; }
      if (!sentado) body.position.y = Math.abs(Math.sin(t * 1.6 + seed)) * 0.04;
    },
  };
}

function planta(T, mat, box, x, z) {
  const g = new T.Group(); g.add(box(0.7, 0.6, 0.7, mat(0xeae7e1), x, 0.3, z));
  [[0, 1.05, 0, 0.5], [0.25, 0.9, 0.15, 0.35], [-0.2, 0.95, -0.2, 0.38]].forEach(([dx, y, dz, r]) => { const s = new T.Mesh(new T.SphereGeometry(r, 14, 10), mat(0x5fae6e, { roughness: 0.9 })); s.position.set(x + dx, y, z + dz); s.castShadow = true; g.add(s); });
  return g;
}

/* canvas textures: a screen per agent, a badge per color, the status board, the floor shadow */
function lienzo(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
function tex(T, c) { const t = new T.CanvasTexture(c); if ('encoding' in t) t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t; }
function pantalla(T, a) {
  return tex(T, lienzo(256, 150, (g, w, h) => {
    const c = COL[a.color].css; g.fillStyle = a.color === 'gris' ? '#1b1e25' : '#0f1420'; g.fillRect(0, 0, w, h);
    g.fillStyle = c; g.globalAlpha = a.color === 'gris' ? 0.35 : 0.9; g.fillRect(0, 0, w, 10); g.globalAlpha = 1;
    g.font = '600 20px Inter, system-ui, sans-serif'; g.fillStyle = '#e8ecf3'; g.fillText(String(a.nombre).slice(0, 18), 12, 40);
    g.font = '15px "JetBrains Mono", monospace'; g.fillStyle = c; g.fillText(a.color === 'verde' ? '✓ ran · read · wrote' : a.color === 'rojo' ? '✕ ' + ((a.pruebas || []).find(p => p.ok === false) || { k: '' }).k + ' failed' : a.color === 'amarillo' ? '! needs a look' : '— idle', 12, 68);
    g.globalAlpha = 0.5; for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#3a4458' : '#2a3242'; g.fillRect(12, 84 + i * 12, 60 + ((i * 53 + a.nombre.length * 17) % 160), 6); } g.globalAlpha = 1;
  }));
}
function insignia(T, color) {
  return tex(T, lienzo(128, 128, (g) => {
    const c = COL[color].css; g.beginPath(); g.arc(64, 64, 50, 0, Math.PI * 2); g.fillStyle = color === 'gris' ? 'rgba(40,44,54,.85)' : c; g.fill();
    g.lineWidth = 8; g.strokeStyle = 'rgba(255,255,255,.9)'; g.stroke();
    g.fillStyle = color === 'gris' ? '#cfd5df' : '#101318'; g.font = '700 64px Inter, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(color === 'verde' ? '✓' : color === 'rojo' ? '!' : color === 'amarillo' ? '?' : '…', 64, 68);
  }));
}
function tablero(T, S) {
  const c = S.cuenta || {}; const total = (c.verde || 0) + (c.amarillo || 0) + (c.rojo || 0);
  const can = lienzo(1024, 512, (g, w, h) => {
    g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1b1e25'; g.font = '700 46px Inter, system-ui, sans-serif'; g.fillText('AGENT STATUS', 48, 82);
    g.font = '24px "JetBrains Mono", monospace'; g.fillStyle = '#6a7180'; g.fillText('checked ' + String(S.calculado || '').replace('T', ' '), 48, 122);
    [['verde', 'working'], ['amarillo', 'need a look'], ['rojo', 'not working']].forEach(([k, l], i) => {
      const x = 48 + i * 320; g.fillStyle = COL[k].css; g.font = '800 120px Inter, system-ui, sans-serif'; g.fillText(String(c[k] || 0), x, 270);
      g.fillStyle = '#3a404c'; g.font = '30px Inter, system-ui, sans-serif'; g.fillText(l, x + 4, 318);
    });
    let x = 48; [['verde'], ['amarillo'], ['rojo']].forEach(([k]) => { const wd = total ? (w - 96) * (c[k] || 0) / total : 0; g.fillStyle = COL[k].css; g.fillRect(x, 380, wd, 34); x += wd; });
    g.fillStyle = '#6a7180'; g.font = '24px Inter, system-ui, sans-serif'; g.fillText('green = ran · read · wrote    yellow = needs you or not useful    red = one of the three missing', 48, 468);
  });
  return { tex: tex(T, can), zonas: [] };
}
function radial(T) {
  return tex(T, lienzo(256, 256, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(0,0,0,.55)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }));
}
