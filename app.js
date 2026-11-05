/* Exo v3 — the shell, the home and the bridge to the morning run (2026-11-01).
   Pablo's answers that shape this file (1 Projects/Exo v2/jarvis-v3-app-plan_2026-11-01.md):
   calm screens with details on tap · Morning / Day / Evening by the clock, carrying what is still open ·
   one "Do now" that Exo reasons, with the why · thinking cards only in the evening, one at a time ·
   faith only as his own week objectives · calm, plus a little delight · every card and save stays on the
   run (jarvis.js), which lives here as "Needs you". */

import { APPS, montarApp } from './apps.js';
import { lote } from './outreach.js';

/* ── helpers ──────────────────────────────────────────────────────────────── */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const ico = n => `<svg aria-hidden="true"><use href="#i-${n}"/></svg>`;
export const pad = n => String(n).padStart(2, '0');

export async function api(path, opt = {}) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), opt.timeout || 20000);
  try {
    const r = await fetch(path, { cache: 'no-store', signal: ctl.signal, ...(opt.body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(opt.body) } : {}) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error || ('HTTP ' + r.status)), { status: r.status, body: j });
    return j;
  } finally { clearTimeout(t); }
}

/* Boston's clock, always (the server's rule — one clock for every day decision). */
/* Demo: the viewer's own clock — the invented week happens on their day, at their hour. */
export function NOW() { return new Date(); }
export const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export function hm(h) { if (!h) return ''; const [H, M] = h.split(':').map(Number); const ap = H >= 12 ? 'PM' : 'AM'; return ((H % 12) || 12) + (M ? ':' + pad(M) : '') + ' ' + ap; }
export function relDay(dstr) {
  const t = iso(NOW()); if (dstr === t) return 'Today';
  const d = new Date(dstr + 'T12:00:00'), n = new Date(t + 'T12:00:00'), diff = Math.round((d - n) / 864e5);
  if (diff === 1) return 'Tomorrow'; if (diff === -1) return 'Yesterday';
  /* 2026-11-02 — a bare weekday only for the days ahead: "Wednesday" for last Wednesday read as this one (a past due date
     looked upcoming in Learn · Bentley); a past day always carries its date */
  const near = diff > 1 && diff < 7;
  return d.toLocaleDateString('en-US', { weekday: near ? 'long' : 'short', month: near ? undefined : 'short', day: near ? undefined : 'numeric' });
}
export function inMin(dstr, h) { if (!h) return null; const d = new Date(dstr + 'T' + h + ':00'); return Math.round((d - NOW()) / 6e4); }
export function dur(min) { if (min == null) return ''; const a = Math.abs(min); const s = a < 60 ? a + ' min' : Math.floor(a / 60) + ' h' + (a % 60 ? ' ' + (a % 60) + ' min' : ''); return min >= 0 ? 'in ' + s : s + ' ago'; }

/* A small, safe markdown renderer for notes, preps, meetings and answers. Wikilinks open in the reader. */
export function md(src) {
  const lines = String(src || '').replace(/\r/g, '').split('\n');
  let out = '', list = null, para = [], i = 0;
  const inline = t => esc(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (_, a, b) => `<a class="wl" href="#" data-note="${a.replace(/"/g, '&quot;')}">${b || a.split('/').pop()}</a>`)
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/(^|\s)_([^_\n]+)_(?=\s|$|[.,;:])/g, '$1<em>$2</em>');
  const flushP = () => { if (para.length) { out += '<p>' + para.map(inline).join('<br>') + '</p>'; para = []; } };
  const flushL = () => { if (list) { out += `<${list.t}>` + list.items.map(x => '<li>' + inline(x) + '</li>').join('') + `</${list.t}>`; list = null; } };
  while (i < lines.length) {
    let l = lines[i];
    if (/^<!--.*-->\s*$/.test(l.trim())) { i++; continue; }
    l = l.replace(/\s*<!--.*?-->\s*/g, ' ').replace(/\s+$/, '');
    if (/^```/.test(l)) { flushP(); flushL(); let code = ''; i++; while (i < lines.length && !/^```/.test(lines[i])) code += lines[i++] + '\n'; i++; out += '<pre><code>' + esc(code) + '</code></pre>'; continue; }
    const h = l.match(/^(#{1,5})\s+(.*)/); if (h) { flushP(); flushL(); out += `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`; i++; continue; }
    if (/^\s*(---|\*\*\*)\s*$/.test(l)) { flushP(); flushL(); out += '<hr>'; i++; continue; }
    if (/^\|.*\|\s*$/.test(l) && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1])) {
      flushP(); flushL(); const row = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      out += '<table><thead><tr>' + row(l).map(c => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>'; i += 2;
      while (i < lines.length && /^\|/.test(lines[i])) { out += '<tr>' + row(lines[i]).map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>'; i++; }
      out += '</tbody></table>'; continue;
    }
    const q = l.match(/^>\s?(.*)/); if (q) { flushP(); flushL(); let b = [q[1]]; i++; while (i < lines.length && /^>/.test(lines[i])) b.push(lines[i++].replace(/^>\s?/, '')); out += '<blockquote>' + md(b.join('\n')) + '</blockquote>'; continue; }
    const li = l.match(/^\s*([-*+]|\d+[.)])\s+(?:\[[ xX\-mnr]\]\s+)?(.*)/);
    if (li) { flushP(); const t = /\d/.test(li[1]) ? 'ol' : 'ul'; if (!list || list.t !== t) { flushL(); list = { t, items: [] }; } list.items.push(li[2]); i++; continue; }
    if (!l.trim()) { flushP(); flushL(); i++; continue; }
    if (list && /^\s{2,}\S/.test(l)) { list.items[list.items.length - 1] += ' ' + l.trim(); i++; continue; }
    flushL(); para.push(l); i++;
  }
  flushP(); flushL(); return out;
}

/* ── toast, sheet ──────────────────────────────────────────────────────────── */
let toastT;
export function toast(msg, bad) {
  const t = $('#toast'); $('#toastMsg').textContent = msg; t.classList.toggle('bad', !!bad); t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 3200);
}
let sheetBack = null;
export function openSheet({ kick = '', title = '', html = '', foot = '' }) {
  $('#shKick').textContent = kick; $('#shTitle').textContent = title; $('#shBody').innerHTML = html; $('#shFoot').innerHTML = foot;
  $('#shFoot').style.display = foot ? '' : 'none';
  $('#scrim').classList.add('on'); $('#sheet').classList.add('on'); $('#shBody').scrollTop = 0;
  sheetBack = document.activeElement; setTimeout(() => $('#shClose').focus(), 60);
  return $('#sheet');
}
export function closeSheet() { $('#scrim').classList.remove('on'); $('#sheet').classList.remove('on'); if (sheetBack && sheetBack.focus) sheetBack.focus(); }
export async function openNote(name, kick = 'From your brain') {
  openSheet({ kick, title: name.split('/').pop().replace(/\.md$/, ''), html: '<div class="skel" style="width:60%"></div><div class="skel" style="margin-top:12px"></div><div class="skel" style="margin-top:8px;width:85%"></div>' });
  try {
    const n = await api('/api/nota?nombre=' + encodeURIComponent(name));
    $('#shTitle').textContent = n.nombre; $('#shKick').textContent = n.ruta.split('/').slice(0, -1).join(' / ') || kick;
    $('#shBody').innerHTML = '<div class="prose">' + md(n.texto.replace(/^# .*\n/, '')) + (n.cortada ? '<p class="mu">…the note continues in Obsidian.</p>' : '') + '</div>';
    $('#shFoot').style.display = ''; $('#shFoot').innerHTML = `<a class="btn sm" href="${esc(n.obsidian)}">${ico('ext')} Open in Obsidian</a>`;
  } catch (e) { $('#shBody').innerHTML = `<p class="mu">${esc(e.message || "Couldn't open that note.")}</p>`; }
}
document.addEventListener('click', e => {
  const a = e.target.closest('a.wl[data-note]'); if (a) { e.preventDefault(); openNote(a.dataset.note); }
});

/* Claude on the Mac: ask, wait, show. Used by the command bar, the council and "Draft with Claude". */
export async function askClaude(prompt, agente, onUpdate) {
  const j = await api('/api/v3/claude', { body: { prompt, agente } });
  for (let i = 0; i < 200; i++) {
    await new Promise(r => setTimeout(r, i < 5 ? 1500 : 2500));
    const s = await api('/api/v3/claude?id=' + j.id).catch(() => null);
    if (s && s.estado !== 'corriendo') return s;
    onUpdate && onUpdate(i);
  }
  return { estado: 'error', texto: 'No answer after several minutes.' };
}

/* ── state ─────────────────────────────────────────────────────────────────── */
export const ST = { D: null, RUN: null, agenda: null, preps: null, tareas: null, ritmo: null, mode: null, modeAuto: null, view: 'home', skipDo: new Set(), firstHome: true, prevAllDone: null };
const bus = new EventTarget();
export const on = (ev, fn) => bus.addEventListener(ev, fn);
const emit = ev => bus.dispatchEvent(new Event(ev));

/* 0–5 h still counts as the evening, but the next day is already today's date. */
const NEXT_DAY = () => { const n = NOW(); return n.getHours() < 5 ? { d: iso(n), lbl: 'Today' } : { d: iso(new Date(n.getTime() + 864e5)), lbl: 'Tomorrow' }; };
function autoMode() { const h = NOW().getHours(); return h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 18 ? 'day' : 'evening'; }

async function loadAll() {
  const [D, agenda, preps, tareas, ritmo] = await Promise.allSettled([
    api('/api/datos', { timeout: 40000 }), api('/api/v3/agenda?dias=10'), api('/api/v3/preps'), api('/api/v3/tareas'), api('/api/v3/ritmo')]);
  if (D.status === 'fulfilled') ST.D = D.value;
  if (agenda.status === 'fulfilled') ST.agenda = agenda.value;
  if (preps.status === 'fulfilled') ST.preps = preps.value.preps;
  if (tareas.status === 'fulfilled') ST.tareas = tareas.value;
  if (ritmo.status === 'fulfilled') ST.ritmo = ritmo.value;
  const ok = D.status === 'fulfilled';
  $('#pipSync').className = 'pip' + (ok ? '' : ' bad');
  const t = NOW(); $('#syncLine').textContent = ok ? 'Synced ' + pad(t.getHours()) + ':' + pad(t.getMinutes()) : "Can't reach your Mac";
  /* the cloud copy (2026-11-01): say how fresh it is and whether the Mac is awake */
  const nb = await api('/api/nube').catch(() => null);
  ST.nube = nb && nb.nube ? nb : null; document.body.classList.toggle('en-nube', !!ST.nube);
  if (ST.nube) { const f = nb.foto ? new Date(nb.foto) : null, mv = nb.mac_visto ? (Date.now() - new Date(nb.mac_visto)) / 6e4 : 1e9;
    const hh = d => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    $('#syncLine').textContent = (mv < 15 ? 'Mac awake · ' : 'Mac off · ') + (f ? 'copy from ' + hh(f) : 'no copy yet') + (nb.en_cola ? ' · ' + nb.en_cola + ' waiting' : '');
    $('#pipSync').className = 'pip' + (mv < 15 ? '' : ' warn'); }
  autoWeek();
  emit('data');
  if (!ST.hub) loadHub();
}
/* A new week starts by itself (2026-11-01, Pablo picked "Start it for me"): from Monday on, an out-of-date week file is
   archived and this week's opens empty (the run's own /api/semana/nueva); Do now then asks for three goals. Sunday
   stays the weekly close's day. Once per day per device. */
async function autoWeek() {
  const s = ST.D && ST.D.semana; if (!s || !s.vencida || NOW().getDay() === 0) return;
  const k = 'jarvis-week-' + iso(NOW()); try { if (localStorage.getItem(k)) return; localStorage.setItem(k, '1'); } catch (_) { }
  const r = await api('/api/semana/nueva', { body: {} }).catch(e => e);
  if (r instanceof Error) return;
  try { ST.D = await api('/api/datos', { timeout: 40000 }); } catch (_) { }
  runCmd('refresh'); toast('This week is open — write your three goals.'); emit('data');
}
export function writeGoals() {
  const s = ST.D && ST.D.semana; const cur = s ? (s.objetivos || []).map(o => o.texto) : [];
  openSheet({ kick: s ? s.titulo : 'This week', title: 'Your three goals for the week', html: `<p class="mu" style="margin-bottom:10px">Results, not tasks — what has to be true by Sunday.</p>${[0, 1, 2].map(i => `<input class="input" data-g="${i}" value="${esc(cur[i] || '')}" placeholder="Goal ${i + 1}" style="margin-bottom:8px">`).join('')}`,
    foot: `<button class="btn ghost" type="button" id="wgC">Cancel</button><button class="btn pri" type="button" id="wgOk">Save the week</button>` });
  $('#wgC').onclick = closeSheet;
  $('#wgOk').onclick = async () => { const lines = $$('[data-g]').map(x => x.value.trim()).filter(Boolean); if (!lines.length) { toast('Write at least one goal.', true); return; }
    const r = await api('/api/semana', { body: { objetivos: lines } }).catch(e => e);
    if (r instanceof Error) { toast("Couldn't save: " + r.message, true); return; }
    closeSheet(); toast('Your week is set.'); try { ST.D = await api('/api/datos', { timeout: 40000 }); } catch (_) { } runCmd('refresh'); emit('data'); };
}

/* ── the run, embedded (Needs you) ────────────────────────────────────────── */
let runFrame;
function mountRun() {
  runFrame = document.createElement('iframe');
  runFrame.className = 'frame'; runFrame.title = 'Needs you — your morning run';
  runFrame.src = './run/index.html?embed=1&tema=spazio';
  $('#v-needs').appendChild(runFrame);
}
/* 2026-11-02 · a command sent before the run's page has loaded was lost (the phone's first Brain map did nothing):
   hold it until the page says hello with its first jarvis-run message. */
let runReady = false; const runQueue = [];
export function runCmd(accion, extra = {}) {
  const m = Object.assign({ tipo: 'v3', accion }, extra);
  if (!runFrame && (accion === 'refresh' || accion === 'nohud')) return;
  if (!runFrame || !runReady) { if (accion !== 'refresh' || !runQueue.length) runQueue.push(m); return; }
  runFrame.contentWindow.postMessage(m, location.origin);
}
window.addEventListener('message', e => {
  if (e.origin !== location.origin || !e.data) return;
  if (e.data.tipo === 'jarvis-run') {
    if (!runReady) { runReady = true; runQueue.splice(0).forEach(m => runFrame.contentWindow.postMessage(m, location.origin)); }
    ST.RUN = e.data; emit('run');
    const all = !!e.data.allDone;
    if (ST.prevAllDone === false && all) celebrate();
    ST.prevAllDone = all;
  }
  if (e.data.tipo === 'jarvis-go' && e.data.vista) go(e.data.vista);
  if (e.data.tipo === 'jarvis-hud') document.body.classList.toggle('hud-on', !!e.data.open);
});
/* The brain map and the intro open inside the run's frame, shown full-screen; closing them gives the screen back
   (2026-11-01: "Needs you" had kept showing the brain after Brain map). */
export function openHud(kind, extra) { if (!runFrame) mountRun(); document.body.classList.add('hud-on'); runCmd(kind === 'intro' ? 'intro' : 'brain', extra || {}); }

function morningGate() {
  return false;   /* demo: Home is the centre; the run lives in Needs you */
  if (autoMode() !== 'morning' || ST.mode) return false;
  if (ST.RUN) return !ST.RUN.started;
  try { const r = JSON.parse(localStorage.getItem('jarvis-run-' + iso(NOW())) || 'null'); return !(r && r.S && r.S.started); } catch (_) { return false; }
}
/* ── navigation ────────────────────────────────────────────────────────────── */
const NAV = [
  ['Today', [['home', 'Home', 'home'], ['prep', 'Meeting prep', 'prep'], ['outreach', 'Outreach', 'people'], ['mail', 'Messages', 'mail'], ['promises', 'Never miss anything', 'check']]],
  ['Mind', [['council', 'Council', 'council'], ['learn', 'Learn', 'learn']]],
  ['You', [['agents', 'Agents', 'agents'], ['me', 'Me', 'me']]],   /* demo (Pablo, round 5): Meetings, People, Notes, WhatsApp, LinkedIn and Brain map left out */
];
export const VIEWS = Object.fromEntries(NAV.flatMap(([, xs]) => xs.map(([k, l, i]) => [k, { label: l, icon: i }])));
function drawNav() {
  $('#nav').innerHTML = NAV.map(([g, xs]) => `<h6>${g}</h6>` + xs.map(([k, l, i]) =>
    `<button type="button" data-go="${k}">${ico(i)}<span class="lbl">${l}</span><span class="badge" data-badge="${k}"></span></button>`).join('')).join('');
}
const mounted = new Set();
export function go(view, opts = {}) {
  if (view === 'brain') { openHud('brain'); return; }
  if (view === 'intro') { openHud('intro'); return; }
  if (view === 'goals') { writeGoals(); return; }
  /* 2026-11-03 Pablo: "whenever I click Home or refresh in the morning, the first thing up there should be" today's view
     (one thing to write, then start). Until the run is started today on this device; starting sends him back to Home. */
  if (view === 'home' && morningGate()) { go('needs'); runCmd('today'); return; }
  if (document.body.classList.contains('hud-on')) { runCmd('nohud'); document.body.classList.remove('hud-on'); }   /* any tab closes the brain map (2026-11-02, phone) */
  if (view === 'tasks' || view === 'calendar') view = 'cal';   /* 2026-11-01: calendar and tasks live together in Your day */
  if (!document.getElementById('v-' + view)) view = 'home';
  ST.view = view;
  $$('.view').forEach(v => v.classList.toggle('on', v.dataset.view === view));
  $$('[data-go]').forEach(b => { if (b.dataset.go === view) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  if (view === 'home') drawHome();
  else if (view !== 'needs' && view !== 'more') { const el = document.getElementById('v-' + view); if (!mounted.has(view)) { mounted.add(view); montarApp(view, el, opts); } else if (APPS[view] && APPS[view].show) APPS[view].show(el, opts); }
  if (view === 'more') drawMore();
  if (view === 'needs' && opts.tier != null) runCmd('goto', { n: opts.tier });
  if (view === 'needs' && opts.tile) runCmd('sheet', { k: opts.tile });
  const h = '#/' + view; if (location.hash !== h) history.replaceState(null, '', h);
  document.title = view === 'home' ? 'Exo' : (VIEWS[view] ? VIEWS[view].label : 'More') + ' · Exo';
  closePal();
}
document.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) { e.preventDefault(); go(b.dataset.go, b.dataset.tier != null ? { tier: +b.dataset.tier } : {}); } });

function drawMore() {
  const el = $('#v-more');
  el.innerHTML = `<div class="wrap"><h1 class="page" style="margin-bottom:18px">Everything</h1><div class="more-grid">` +
    NAV.flatMap(([, xs]) => xs).filter(([k]) => !['home', 'needs', 'prep'].includes(k)).map(([k, l, i]) =>
      `<button type="button" data-go="${k}">${ico(i)}${l}</button>`).join('') + `</div></div>`;   /* demo: no phone pairing, no names list */
}

function badges() {
  const set = (k, v) => { $$(`[data-badge="${k}"]`).forEach(b => b.textContent = v ? String(v) : ''); };
  const left = ST.RUN ? ST.RUN.left : '';
  set('needs', left); $('#tbNeeds').textContent = left || '';
  const td = iso(NOW()); const pt = (ST.preps || []).filter(p => p.cuando.slice(0, 10) === td && (inMin(td, p.cuando.slice(11, 16)) ?? 0) > -90).length;
  set('prep', pt); $('#tbPrep').textContent = pt || '';
  const p1 = ST.tareas ? ST.tareas.tareas.filter(t => t.prioridad === 'p1').length : '';
  set('cal', p1);
  const on = ST.D ? lote().todos.filter(p => p.kind !== 'warm').length + 8 : 0;   /* demo: 3 cold + the 8-person warm list */ set('outreach', on); const tb = $('#tbOut'); if (tb) tb.textContent = on || '';
  /* agents: one verdict per agent (salud-agentes.py) — only red counts outside the Agents view (2026-11-01) */
  const SA = ST.D && ST.D.salud && ST.D.salud.cuenta; const ag = SA ? SA.rojo : 0;
  set('agents', ag);
  if (SA) {
    $('#agentsLine').textContent = ag ? ag + (ag === 1 ? ' agent not working' : ' agents not working') : 'All agents working';
    $('#pipAgents').className = 'pip' + (ag ? ' bad' : '');
  }
  const prio = todayGoal();
  $('#prio').textContent = prio || 'Tap to write your one thing.'; $('#prio').classList.toggle('empty', !prio);
}
/* Today's one thing, written from the sidebar (2026-11-01: the old panel let him write it; v3 only showed it).
   Same route as the run: /api/semana {dia, texto}. A week file that is out of date sends him to the weekly close. */
function editGoal() {
  const s = ST.D && ST.D.semana; const d = s && (s.dias || []).find(x => x.es_hoy);
  if (!s || s.vencida || !d) { toast("This week's file isn't started — write it in the weekly close first."); go('needs', { tier: 0 }); return; }
  openSheet({ kick: 'Today', title: 'Your one thing', html: `<p class="mu" style="margin-bottom:10px">One line. It shows on the sidebar and in your run.</p><input class="input" id="goalIn" value="${esc(todayGoal())}" placeholder="The one thing that makes today a good day">`,
    foot: `<button class="btn ghost" type="button" id="goalC">Cancel</button><button class="btn pri" type="button" id="goalOk">Save</button>` });
  setTimeout(() => $('#goalIn').focus(), 50);
  $('#goalC').onclick = closeSheet;
  const save = async () => { const v = $('#goalIn').value.trim(); if (!v) return;
    const r = await api('/api/semana', { body: { dia: d.etiqueta, texto: v } }).catch(e => e);
    if (r instanceof Error) { toast("Couldn't save it: " + r.message, true); return; }
    d.texto = v; closeSheet(); badges(); runCmd('refresh'); toast('Saved.'); };
  $('#goalOk').onclick = save; $('#goalIn').onkeydown = e => { if (e.key === 'Enter') save(); };
}
/* Connect this phone (2026-11-01): the Mac (or the phone over Tailscale) asks this panel for the one-time link to the
   cloud copy; opening it on the phone leaves a year-long key there. */
async function conectarTelefono() {
  if (ST.nube) { toast('This phone is already connected.'); return; }
  const r = await api('/api/v3/nube/enlace').catch(e => e);
  if (r instanceof Error) { toast(r.message, true); return; }
  const phone = matchMedia('(max-width: 900px)').matches;
  openSheet({ kick: 'Exo on your phone', title: 'Connect this phone', html: `<div class="prose">
    ${phone ? `<p>Tap the button: it opens the cloud copy of Exo and remembers this phone for a year.</p><p><a class="btn pri" href="${esc(r.enlace)}" target="_blank" rel="noopener">Open Exo in the cloud</a></p><p>Then in Safari: <b>Share → Add to Home Screen</b>. Use that icon from now on — it works with your Mac off.</p>`
      : `<p>Do this on your iPhone: open Exo there (the icon you use today, over Tailscale), press the search bar, and run <b>Connect this phone</b>. It opens the cloud copy and remembers the phone.</p><p class="mu">Cloud address: ${esc(r.url)}</p>`}</div>` });
}
/* Report a miss (the old panel's header button): one line to fallos.md through /api/fallo. */
export function reportMiss() {
  const C = ['Gmail', 'VYNMSA email', 'WhatsApp', 'LinkedIn', 'Granola / a meeting', 'Calendar', 'Todoist', 'Brightspace', 'In person', "Don't know"];
  openSheet({ kick: 'Your agents', title: 'Report a miss', html: `<p class="mu" style="margin-bottom:10px">Something slipped that an agent should have caught. The Architect's morning pass reads these.</p>
    <textarea class="input" id="missQ" rows="3" placeholder="What slipped — e.g. nobody told me Prof. X moved the deadline"></textarea>
    <label class="kick" style="display:block;margin:12px 0 6px">Where it was</label><select class="input" id="missC">${C.map(c => `<option>${esc(c)}</option>`).join('')}</select>${ST.D && ST.D.fallos_semana ? `<p class="mu" style="margin-top:10px">${ST.D.fallos_semana} reported this week.</p>` : ''}`,
    foot: `<button class="btn ghost" type="button" id="missX">Cancel</button><button class="btn pri" type="button" id="missOk">Report it</button>` });
  $('#missX').onclick = closeSheet;
  $('#missOk').onclick = async () => { const q = $('#missQ').value.trim(); if (!q) { toast('Write what slipped.', true); return; }
    const r = await api('/api/fallo', { body: { que: q, canal: $('#missC').value } }).catch(e => e);
    if (r instanceof Error) { toast(r.message, true); return; } closeSheet(); toast('Reported. The morning pass picks it up.'); };
}
function todayGoal() {
  const d = ST.D && ST.D.semana && (ST.D.semana.dias || []).find(x => x.es_hoy);
  const t = d && d.texto && d.texto.replace(/^[\s/.\-–—]+$/, '').trim();
  return t || '';
}

/* ── the home ──────────────────────────────────────────────────────────────── */
const TODAY_EVENTS = () => { const td = iso(NOW()); const d = ST.agenda && ST.agenda.dias.find(x => x.dia === td); return d ? d.eventos : []; };
const DAY_EVENTS = dstr => { const d = ST.agenda && ST.agenda.dias.find(x => x.dia === dstr); return d ? d.eventos : []; };
const ROUTINE = /^(bañarme|shuttle|comer|desayuno|cena|dormir|gym|misa)/i;
function nextEvent() {
  const td = iso(NOW()); const now = NOW();
  for (const d of (ST.agenda ? ST.agenda.dias : [])) {
    if (d.dia < td) continue;
    for (const e of d.eventos) { if (e.todo || ROUTINE.test(e.titulo)) continue; const m = inMin(d.dia, e.inicio); if (m != null && m > -15) return Object.assign({ dia: d.dia, min: m }, e); }
  }
  return null;
}
const GENERIC = new Set(['harvard', 'bentley', 'meeting', 'professor', 'with', 'chat', 'call', 'session', 'event', 'meetup', 'boston', 'invitation', 'minute', 'appointment']);
const TODAY_AT = (dia, h) => DAY_EVENTS(dia).filter(e => e.inicio === h && !e.todo).length;
function prepFor(ev) {
  if (!ev || !ST.preps) return null;
  const w = ev.titulo.toLowerCase().split(/\W+/).filter(x => x.length > 4);
  /* a prep belongs to an event when they share two real words, or one plus the same start time — "Harvard" alone
     once tied the Día de Muertos meetup to the Greene fireside's prep (2026-11-01) */
  const day = ST.preps.filter(p => p.cuando.slice(0, 10) === ev.dia);
  const score = p => w.filter(x => !GENERIC.has(x) && p.evento.toLowerCase().includes(x)).length;
  return day.find(p => score(p) >= 2) || day.find(p => score(p) >= 1 && p.cuando.slice(11, 16) === ev.inicio) ||
    (TODAY_AT(ev.dia, ev.inicio) === 1 ? day.find(p => p.cuando.slice(11, 16) === ev.inicio && score(p) >= 1) : null) || null;
}
function minsPerRow(job) {
  const r = ST.ritmo && ST.ritmo.por_trabajo && ST.ritmo.por_trabajo[job];
  return Math.min(1.5, (r != null ? r : (ST.ritmo ? ST.ritmo.mediana : 45)) / 60);
}
function tierMinutes(t) { return Math.max(1, Math.round((t.rows || []).filter(r => r.open).reduce((a, r) => a + minsPerRow(r.job), 0))); }

/* 2026-11-03 Pablo: "for the do now write it more as the action, not the event" — "Do your meeting prep for …". */
const VERB = /^(reply|send|write|read|call|answer|follow|ask|confirm|book|pay|submit|do|finish|review|check|email|text|schedule|open|watch|sign|register|fill|prepare|pick|take|meet)\b/i;
function asAction(title, tile) {
  const t = String(title || '').replace(/^Invitation:\s*/i, '').replace(/\s+—\s+to\s+.*$/, '').trim();
  if (tile === 'prep') return 'Do your meeting prep for ' + (t.split(' · ').pop() || t);
  if (VERB.test(t)) return t.replace(/^read:\s*/i, 'Read ');
  if (tile === 'commit' && /^Daniela Ruiz/.test(t)) return 'Send Daniela Ruiz her two answers';   /* demo: the run's row is only her name */
  const pre = { commit: 'Follow up: ', due: 'Finish ', who: 'Say who this is: ', cold: 'Send the message to ', warm: 'Send the message to ', linkedin: 'Review the LinkedIn post: ' }[tile];
  return pre ? pre + t : t;
}
/* "Do now" — Pablo: let Exo reason (bottleneck: deadline vs this week's objective vs who waits) and show why. */
function candidates() {
  const out = []; const td = iso(NOW());
  const ev = nextEvent(); const pr = prepFor(ev);
  if (ev && pr && ev.dia === td && ev.min > -10)
    out.push({ what: 'Read the prep for ' + ev.titulo.replace(/\s+-\s+.*$/, '').replace(/\s+\(.*\)$/, ''), why: 'It starts at ' + hm(ev.inicio) + ', ' + dur(ev.min) + '. One question is ready for you.', act: 'Open the prep', go: ['prep', { nota: pr.nota }] });
  const R = ST.RUN;
  const wk = ST.D && ST.D.semana; if (wk && !wk.vencida && !(wk.objetivos || []).length && NOW().getDay() !== 0) out.push({ what: "Write this week's three goals", why: 'A new week started. Three results, then your day.', act: 'Write them', go: ['goals', {}] });
  if (R && R.weekFirst) out.push({ what: 'Close your week first', why: new Date().getDay() === 0 ? "It's Sunday: a few questions only you can answer, then your day starts." : "Left open from Sunday: a few questions only you can answer, then your day starts.", act: 'Start the close', go: ['needs', { tier: 0 }] });
  if (R) {
    const t1 = (R.tiers || []).find(t => t.n === 1);
    const prepLeft = (ST.preps || []).some(p => p.cuando.slice(0, 10) === td && (inMin(td, p.cuando.slice(11, 16)) ?? 0) > 0);
    const DEST = { prep: ['prep', {}], commit: ['outreach', {}], due: ['cal', {}] };
    (t1 ? t1.rows.filter(r => r.open && (r.tile !== 'prep' || prepLeft)).sort((a, b) => /^Daniela Ruiz/.test(b.title) - /^Daniela Ruiz/.test(a.title)) : []).slice(0, 3).forEach(r => out.push({ what: asAction(r.title, r.tile), why: /^Daniela Ruiz/.test(r.title) ? 'Her board decides in two days. Exo drafted the reply — read it, then send.' : 'Urgent and important in your run · ' + r.tileName + '.', act: /^Daniela Ruiz/.test(r.title) ? 'Read the draft' : 'Do it', go: /^Daniela Ruiz/.test(r.title) ? ['draft', 'daniela'] : DEST[r.tile] || ['cal', {}] }));
  }
  /* Bentley due tomorrow or sooner, then Todoist only when priority 1 AND due today or overdue (2026-11-01: "you put
     all my to-do list in today's view" — the rest of Todoist stays in Day plan / Tasks). */
  dueSoon(1).forEach(e => out.push({ what: asAction(e.title.replace(/\s*\(\d+\s*pts\)/i, ''), 'due'), why: e.course + ' · due ' + e.whenTxt + '.', act: e.link ? 'Open in Brightspace' : 'Open', go: e.link ? ['url', e.link] : ['needs', { tier: 1, tile: 'due' }] }));
  p1Today().forEach(t => out.push({ what: t.titulo.replace(/^📞\s*/, ''), why: 'Priority 1, due ' + (t.vence < td ? 'since ' + relDay(t.vence).toLowerCase() : 'today') + '.', act: 'Open your day', go: ['cal', {}], task: t.id }));
  const outN = outreachRows().length;
  if (outN) out.push({ what: 'Write to ' + outN + (outN === 1 ? ' person' : ' people') + ' today', why: "Today's outreach batch is ready — each message is drafted.", act: 'Open outreach', go: ['outreach', {}] });
  if (R) {
    const t2 = (R.tiers || []).find(t => t.n === 2);
    (t2 ? t2.rows.filter(r => r.open) : []).slice(0, 2).forEach(r => out.push({ what: asAction(r.title, r.tile), why: 'Important · ' + r.tileName + '.', act: 'Do it', go: ['needs', { tier: 2, tile: r.tile }] }));
  }
  /* demo: Daniela's reply leads at any hour, and nothing points to the run (not in the demo) */
  out.sort((a, b) => (b.go[0] === 'draft') - (a.go[0] === 'draft')); out.forEach(c => { if (c.go[0] === 'needs') c.go = ['cal', {}]; });
  const seen = new Set();
  return out.filter(c => { const k = c.what.toLowerCase().slice(0, 50); if (seen.has(k) || ST.skipDo.has(k)) return false; seen.add(k); return true; });
}

/* demo: the name and the viewer's time, never "good morning" (a reader opens this at any hour) */
function greeting() { return 'Pablo, it’s ' + NOW().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + '.'; }
function leadLine(mode) {
  const td = iso(NOW()); const ev = nextEvent(); const left = ST.RUN ? ST.RUN.left : null;
  const wd = NOW().toLocaleDateString('en-US', { weekday: 'long' });
  const parts = [];
  if (mode === 'evening') {
    const nd = NEXT_DAY(); const first = DAY_EVENTS(nd.d).find(e => !e.todo && !ROUTINE.test(e.titulo));
    parts.push(left ? left + ' still open.' : 'Nothing left open.');
    if (first) parts.push(nd.lbl + ' starts with ' + first.titulo.replace(/\s+-\s+.*$/, '').replace(/ with .*$/, '') + ' at ' + hm(first.inicio) + '.');
    return parts.join(' ');
  }
  parts.push(wd + '.');
  if (ST.RUN && ST.RUN.weekFirst) parts.push('Weekly close first.');
  if (left != null) parts.push(left ? left + (left === 1 ? ' thing needs' : ' things need') + ' you.' : 'Nothing needs you right now.');
  if (ev) { const pr = prepFor(ev); parts.push((ev.dia === td ? '' : relDay(ev.dia) + ': ') + ev.titulo.replace(/\s+-\s+.*$/, '').replace(/ with (Mr|Ms|Prof)\..*$/, '') + ' at ' + hm(ev.inicio) + (pr ? ' — the prep is ready.' : '.')); }
  return parts.join(' ');
}

function letters(text) { let i = 0; return [...text].map(c => c === ' ' ? ' ' : `<span class="ch" style="animation-delay:${(i++ * 22)}ms">${esc(c)}</span>`).join(''); }

/* The hero (2026-11-01, his answer): "Greeting, a suggestion for today …, clock but not as big and in a square as now,
   and one do now". The suggestion is the Estratega's line for the day (the same one Your day shows, /api/v3/dia). */
function heroHtml(mode) {
  const c = candidates()[0];
  const ev = nextEvent(); const t = NOW();
  return `<div class="hero rise">
    <div class="hi"><div class="hi-top"><h1 class="hello" id="hello">${ST.firstHome ? letters(greeting(mode)) : esc(greeting(mode))}</h1>
        <span class="miniclock">${esc(t.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }))}${ev ? ' · next: ' + esc(ev.titulo.replace(/\s+[-—]\s+.*$/, '')) + ' ' + esc((ev.dia === iso(t) ? '' : relDay(ev.dia) + ' ') + hm(ev.inicio)) + (ev.min > 0 && ev.min < 600 ? ' · ' + esc(dur(ev.min)) : '') : ''}</span></div>
      <div class="sugg"><span class="kick"><span style="color:#B49CFF">For today</span> · the Estratega</span><p id="hSug">${ST.tipHoy ? esc(ST.tipHoy) : '<span class="typing"><i></i><i></i><i></i></span> Reading your day…'}</p></div></div>
    <div class="donow"><div class="kick ac">Do now</div>
      ${c ? `<div class="what">${esc(c.what)}</div><div class="why">${esc(c.why)}</div>
      <div class="acts"><button class="btn sm pri" type="button" id="doGo">${esc(c.act)}</button><button class="btn sm ghost" type="button" id="doSkip">Not now</button></div>`
        : `<div class="what">You're clear.</div><div class="why">Nothing urgent or important is waiting. Use the time on your focus.</div>`}
    </div>
  </div>`;
}
async function tipHoy() {
  if (ST.tipHoy || ST.tipBusy) return; ST.tipBusy = true;
  const td = iso(NOW()), lim = iso(new Date(NOW().getTime() + 2 * 864e5));
  const due = (ST.D && ST.D.entregas || []).filter(e => e.estado === 'pendiente' && (e.cuando || '').slice(0, 10) >= td && (e.cuando || '').slice(0, 10) <= lim).map(e => e.texto.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*/g, '').slice(0, 120));
  let r = await api('/api/v3/dia?fecha=' + td + '&ctx=' + encodeURIComponent(due.length ? 'Bentley due in the next two days:\n- ' + due.join('\n- ') : '')).catch(() => null);
  while (r && r.estado === 'corriendo' && r.id) { await new Promise(ok => setTimeout(ok, 3000)); r = await api('/api/v3/claude?id=' + r.id).catch(() => null); }
  ST.tipBusy = false;
  const el = $('#hSug');
  if (r && r.estado === 'listo') { ST.tipHoy = r.texto.trim(); if (el) el.textContent = ST.tipHoy; }
  else if (el) el.textContent = 'Open Your day for the plan.';
}

function stillOpenHtml(mode) {
  if (mode !== 'evening' || !ST.RUN) return '';   /* Day: the Today block already carries what is open */
  const rows = (ST.RUN.tiers || []).filter(t => t.n <= (mode === 'evening' ? 2 : 1)).flatMap(t => t.rows.filter(r => r.open).map(r => Object.assign({ n: t.n }, r)));
  if (!rows.length) return '';
  return `<div class="still rise" style="animation-delay:.08s"><span class="kick ac">${mode === 'day' ? 'Still open from this morning' : 'Still open today'}</span>
    ${rows.slice(0, 5).map(r => `<button class="chip" type="button" data-go="needs" data-tier="${r.n}">○ ${esc(r.title.slice(0, 56))}</button>`).join('')}
    ${rows.length > 5 ? `<button class="chip" type="button" data-go="needs">+${rows.length - 5} more</button>` : ''}</div>`;
}

function tierCards() {
  const R = ST.RUN;
  if (!R) return `<div class="grid">${[0, 1, 2].map(() => `<div class="card"><div class="skel" style="width:50%"></div><div class="skel" style="margin-top:14px"></div><div class="skel" style="margin-top:8px;width:80%"></div></div>`).join('')}</div>`;
  const tiers = (R.tiers || []).filter(t => t.total > 0 || t.n > 0);
  return `<div class="grid">${tiers.map((t, i) => {
    const open = t.rows.filter(r => r.open), done = t.closed || open.length === 0;
    return `<button type="button" class="card tier lift rise${done ? ' done' : ''}${t.n <= 1 && !done ? ' hot' : ''}" style="animation-delay:${.06 * i + .1}s" data-go="needs" data-tier="${t.n}">
      <div class="top"><span class="kick${t.n <= 1 && !done ? ' ac' : ''}">${esc(t.name)}</span><span class="kick">${done ? 'done ✓' : '~' + tierMinutes(t) + ' min'}</span></div>
      <div class="segbar">${t.rows.slice(0, 18).map(r => `<i class="${r.open ? '' : 'on'}"></i>`).join('') || '<i></i>'}</div>
      <ul>${open.slice(0, 3).map(r => `<li>${esc(r.title.slice(0, 90))}</li>`).join('')}${open.length > 3 ? `<li class="more">+${open.length - 3} more</li>` : ''}${!open.length ? '<li class="more">Nothing left here.</li>' : ''}</ul>
      <div class="go"><span>${open.length} open of ${t.total}</span><span>${done ? '' : 'Start →'}</span></div></button>`;
  }).join('')}</div>`;
}

function objectivesCard() {
  const s = ST.D && ST.D.semana; if (!s || !s.objetivos || !s.objetivos.length) return '';
  return `<div class="card rise" style="animation-delay:.25s"><div class="kick" style="margin-bottom:8px">This week · ${esc(s.titulo || '')}${s.vencida ? ' · <span class="ac">write next week\'s in the run</span>' : ''}</div>
    ${s.objetivos.map(o => `<div class="task${o.hecho ? ' done' : ''}" style="padding:7px 0"><span class="ck">${ico('check')}</span><div class="t">${esc(o.texto)}</div></div>`).join('')}</div>`;
}

function prepCard() {
  const ev = nextEvent(); const pr = prepFor(ev) || (ST.preps || []).find(p => p.cuando >= iso(NOW()));
  if (!pr) return '';
  const when = pr.cuando.slice(0, 10), h = pr.cuando.slice(11, 16), m = inMin(when, h);
  const ask = (pr.texto.match(/(Ask (?:him|her|them)[^.]*\.)/i) || [])[1] || '';
  return `<button type="button" class="card hot lift rise" style="text-align:left;animation-delay:.12s" data-go="prep">
    <div class="kick ac" style="margin-bottom:8px">Meeting prep · ${esc(relDay(when))} ${esc(hm(h))}${m != null && m > 0 && m < 600 ? ' · ' + esc(dur(m)) : ''}</div>
    <div class="serif" style="font-size:24px;line-height:1.15;margin-bottom:8px">${esc(pr.evento.replace(/\s+-\s+.*$/, ''))}</div>
    <div class="t2" style="font-size:13px;line-height:1.5">${esc(pr.texto.replace(/\[\[[^\]]*\]\]/g, '').replace(/[*_`]/g, '').slice(0, 220))}</div>
    ${ask ? `<div style="margin-top:12px;padding:11px 13px;border-radius:12px;background:rgba(255,255,255,.05);font-size:13.5px">${esc(ask)}</div>` : ''}</button>`;
}

function needsCard() {
  const R = ST.RUN; if (!R) return '';
  const rows = (R.tiers || []).filter(t => t.n >= 1).flatMap(t => t.rows.filter(r => r.open).map(r => Object.assign({ n: t.n }, r))).slice(0, 5);
  return `<div class="card rise" style="animation-delay:.16s"><div class="kick" style="margin-bottom:4px">Needs you · ${R.left}</div><div class="row-list">
    ${rows.map(r => `<div class="mini-row"><span class="dotl"></span><div class="what"><b>${esc(r.title.slice(0, 100))}</b><span>${esc(r.tileName)}</span></div><button class="btn sm act" type="button" data-go="needs" data-tier="${r.n}">Open</button></div>`).join('') || '<p class="mu" style="padding:10px 0">Nothing waits on you.</p>'}
  </div></div>`;
}

function comingCard() {
  const td = iso(NOW()); const tm = iso(new Date(NOW().getTime() + 864e5));
  const evs = [...DAY_EVENTS(td).map(e => Object.assign({ dia: td }, e)), ...DAY_EVENTS(tm).map(e => Object.assign({ dia: tm }, e))]
    .filter(e => !e.todo && (inMin(e.dia, e.fin || e.inicio) ?? 1) > 0).slice(0, 6);
  return `<div class="card rise" style="animation-delay:.2s"><div class="kick" style="margin-bottom:4px">Coming up</div><div class="row-list">
    ${evs.map(e => `<div class="mini-row"><span class="when">${e.dia === td ? hm(e.inicio) : 'Tmrw ' + hm(e.inicio).replace(' ', '')}</span><div class="what"><b>${esc(e.titulo.replace(/\s+-\s+Harvard.*$/, ''))}</b><span>${esc(e.cal + (e.lugar ? ' · ' + e.lugar : ''))}</span></div></div>`).join('') || '<p class="mu" style="padding:10px 0">Nothing else on the calendar.</p>'}
  </div><button class="btn sm ghost" type="button" data-go="cal" style="margin-top:6px">Full calendar →</button></div>`;
}

/* ── Today: the old run's rule (2026-11-01, Pablo picked it) ────────────────────
   meetings today with their prep · Bentley due in two days or less · promises and replies owed · today's outreach
   · priority-1 tasks due today. Everything else lives in its own app. */
function dueSoon(days) {
  const td = iso(NOW()), lim = iso(new Date(NOW().getTime() + days * 864e5));
  return (ST.D && ST.D.entregas || []).filter(e => e.estado === 'pendiente' && /^\d{4}-\d\d-\d\d/.test(e.cuando || '') && e.cuando.slice(0, 10) >= td && e.cuando.slice(0, 10) <= lim)
    .sort((a, b) => a.cuando.localeCompare(b.cuando)).map(e => {
      const t = e.texto; const course = (t.match(/^\*\*([A-Z]{2,4}\s?\d{3})\*\*/) || [, 'Bentley'])[1];
      const link = (t.match(/\]\((https?:[^)]+)\)/) || [])[1] || '';
      const title = t.replace(/^\*\*[^*]+\*\*\s*·\s*/, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*+/g, '').replace(/\s+—\s+.*$/, '').replace(/\s*\*\(.*$/, '').trim();
      const d = e.cuando.slice(0, 10), h = e.cuando.slice(11, 16);
      return { id: e.id, course, title, link, when: e.cuando, whenTxt: relDay(d).toLowerCase() + (h ? ' ' + hm(h) : '') };
    });
}
function p1Today() { const td = iso(NOW()); return (ST.tareas ? ST.tareas.tareas : []).filter(t => t.prioridad === 'p1' && t.vence && t.vence <= td); }
function runRows(tiles) { return ST.RUN ? (ST.RUN.tiers || []).flatMap(t => t.rows.filter(r => r.open && tiles.includes(r.tile)).map(r => Object.assign({ n: t.n }, r))) : []; }
function outreachRows() { return ST.D ? lote().hoy.map(p => ({ title: p.nombre, tile: p.kind === 'warm' ? 'warm' : 'cold', tileName: p.kind === 'fup' ? 'Follow-up' : p.kind === 'reply' ? 'They replied' : p.kind === 'warm' ? 'Warm · ' + p.porque : 'Cold · ' + (p.quien || '').slice(0, 60) })) : []; }
function todayBlock(mode) {
  const td = iso(NOW()); const groups = [];
  /* a meeting = something with people: it has a prep, or it sits in a shared calendar (Bentley, Social, mail invites);
     his own Vocación / Vida personal blocks stay in Day plan */
  const meets = TODAY_EVENTS().filter(e => !e.todo && !ROUTINE.test(e.titulo) && (inMin(td, e.fin || e.inicio) ?? 1) > 0 &&
    (prepFor(Object.assign({ dia: td }, e)) || !/^(Vocación|Vida personal)$/.test(e.cal)) && !/^⏰/.test(e.titulo));
  if (meets.length) groups.push({ k: 'Meetings today', go: 'cal', rows: meets.slice(0, 5).map(e => { const pr = prepFor(Object.assign({ dia: td }, e)); return { l: hm(e.inicio), t: e.titulo.replace(/\s+-\s+.*$/, '').replace(/ with (Mr|Ms|Prof)\..*$/, ''), s: e.cal + (pr ? ' · prep ready' : ''), go: pr ? ['prep', { nota: pr.nota }] : ['cal', {}] }; }) });
  const due = dueSoon(2);
  if (due.length) groups.push({ k: 'Due in the next two days · Bentley', hot: true, rows: due.map(e => ({ l: e.whenTxt.replace(/^tomorrow/, 'Tmrw'), t: e.title, s: e.course, go: e.link ? ['url', e.link] : ['needs', { tier: 1, tile: 'due' }] })) });
  const com = runRows(['commit']);
  if (com.length) groups.push({ k: 'Promises and replies', rows: com.slice(0, 4).map(r => ({ l: '', t: r.title, s: r.tileName, go: ['needs', { tier: 1, tile: 'commit' }] })), more: com.length > 4 ? ['needs', { tier: 1, tile: 'commit' }, com.length - 4] : null });
  const outr = outreachRows();
  if (outr.length) groups.push({ k: 'Outreach today', rows: outr.slice(0, 4).map(r => ({ l: r.tile === 'cold' ? 'Cold' : 'Warm', t: r.title, s: r.tileName, go: ['outreach', {}] })), more: outr.length > 4 ? ['outreach', {}, outr.length - 4] : null });
  const p1 = p1Today();
  if (p1.length) groups.push({ k: 'Priority 1 · due today', rows: p1.map(t => ({ l: t.vence < td ? 'Late' : 'Today', t: t.titulo.replace(/^📞\s*/, ''), s: t.proyecto || 'Todoist', go: ['cal', {}] })) });
  /* the cabina job's own read of the day ("What's next": clashes, what's due, what to send) and who owes him —
     the old cabina's two blocks, 2026-11-01 */
  const sec = name => { const h = (ST.D && ST.D.hoy) || ''; const m = h.match(new RegExp('## ' + name + '\\s*\\n([\\s\\S]*?)(?=\\n## |$)')); return m ? m[1].split('\n').filter(l => /^- /.test(l)).map(l => l.replace(/^- /, '').replace(/<!--.*?-->/g, '').trim()) : []; };
  const nxt = sec("What's next").map(l => { const m = l.match(/^\*\*(.+?)\*\*\s*—\s*(.*)$/); return m ? { l: m[1].replace(/^Tomorrow,?\s*/, 'Tmrw ').replace(/, all day/, ''), t: m[2].split(' · ')[0], s: m[2].split(' · ').slice(1).join(' · ') } : { l: '', t: l, s: '' }; });
  if (nxt.length) groups.unshift({ k: "What's next · Exo's read", rows: nxt.slice(0, 5).map(r => Object.assign(r, { go: ['cal', {}] })) });
  const urg = [...sec('Urgent'), ...sec('Urgente')];
  if (urg.length) groups.splice(nxt.length ? 1 : 0, 0, { k: 'Urgent mail', hot: true, rows: urg.slice(0, 5).map(l => { const m = l.match(/^\*\*(.+?)\*\*\s*[—-]\s*(.*)$/); return { l: '', t: m ? m[1] : l.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'), s: m ? m[2].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').slice(0, 120) : '', go: ['mail', {}] }; }) });
  const wf = sec('Waiting for');
  if (wf.length) groups.push({ k: 'Waiting for · they owe you', rows: wf.map(t => { const m = t.match(/^(.+?) owes you:?\s*(.*)$/); return { l: '', t: m ? m[2] : t, s: m ? m[1] : '', go: ['cal', {}] }; }) });
  if (!groups.length) return `<div class="card rise today-empty"><span class="serif">Nothing urgent today.</span><span class="mu"> Use the time on your focus.</span></div>`;
  return `<div class="today rise">${groups.map(g => `<div class="card tgroup${g.hot ? ' hot' : ''}"><div class="kick${g.hot ? ' ac' : ''}">${esc(g.k)}</div>
    ${g.rows.map((r, i) => `<button type="button" class="trow" data-tg='${esc(JSON.stringify(r.go))}'><span class="tl">${esc(r.l)}</span><span class="tt"><b>${esc(r.t)}</b><span>${esc(r.s)}</span></span><span class="ta">→</span></button>`).join('')}
    ${g.more ? `<button type="button" class="trow more" data-tg='${esc(JSON.stringify(g.more.slice(0, 2)))}'><span class="tl"></span><span class="tt"><span>+${g.more[2]} more</span></span></button>` : ''}</div>`).join('')}</div>`;
}
function wireToday(el) {
  $$('[data-tg]', el).forEach(b => b.onclick = () => { const [v, o] = JSON.parse(b.dataset.tg); if (v === 'url') window.open(o, '_blank', 'noopener'); else go(v, o || {}); });
}
function agentsLine() {
  const S = ST.D && ST.D.salud; if (!S || !S.cuenta || !S.cuenta.rojo) return '';
  const r = S.agentes.filter(a => a.color === 'rojo');
  return `<button type="button" class="agents-alert rise" data-go="agents"><span class="pip bad"></span><b>${r.length} ${r.length === 1 ? 'agent' : 'agents'} not working</b><span>${esc(r.map(a => a.nombre).join(' · '))}</span><span class="go">See why →</span></button>`;
}
// A job's note, readable: no file paths or quote marks, cut at a word with an ellipsis.
function clip(t, n = 120) {
  t = String(t || '').replace(/\s*\([^()]*\/[^()]*(\)|$)/g, '').replace(/`[^`]*\/([^`\/]+)`/g, '$1').replace(/["“”]/g, '').replace(/\s+([,.;:])/g, '$1').replace(/\s{2,}/g, ' ').trim();
  if (t.length <= n) return t;
  const c = t.slice(0, n); const sp = c.lastIndexOf(' ');
  return (sp > n * 0.6 ? c.slice(0, sp) : c).replace(/[\s,;:·—-]+$/, '') + '…';
}
function agentsCard() {
  const S = ST.D && ST.D.salud; if (!S || !S.agentes) return '';
  const C = { rojo: '#FF5A5A', amarillo: '#FFB547', verde: '#5EE6B0', gris: '#8A93A0' };
  const recent = S.agentes.filter(a => a.ultima && !/^(respaldo|vigia)/.test(a.id)).sort((a, b) => String(b.ultima).localeCompare(String(a.ultima))).slice(0, 7);
  return `<div class="card rise" style="animation-delay:.1s"><div class="kick" style="margin-bottom:4px">What your agents did</div><div class="row-list">
    ${recent.map(a => `<div class="mini-row"><span class="when"><span class="dotl" style="background:${C[a.color === 'amarillo' ? 'verde' : a.color]}"></span>${esc(a.ultima_texto || '')}</span><div class="what"><b>${esc(a.nombre)}</b><span>${esc(clip(a.color === 'rojo' ? a.titulo : a.mensaje || ''))}</span></div></div>`).join('')}
  </div><button class="btn sm ghost" type="button" data-go="agents" style="margin-top:6px">All agents →</button></div>`;
}

function thinkingCard() {
  const h = ST.D && ST.D.hoy || '';
  const m = h.match(/## Lesson of the day\s*\n+([\s\S]*?)(?=\n## |$)/);
  if (!m) return '';
  const block = m[1].trim(); const title = (block.match(/\*\*(.+?)\*\*/) || [, ''])[1];
  const quote = (block.match(/^>\s*(.+)$/m) || [, ''])[1];
  return `<div class="card rise" style="animation-delay:.14s"><div class="kick" style="margin-bottom:10px">One thing to think about</div>
    <div class="quote">${esc(title || block.split('\n')[0])}</div>${quote ? `<div class="lesson-src">${esc(quote.replace(/\*/g, ''))}</div>` : ''}
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="btn sm" type="button" data-go="needs" data-tier="3">Your thinking cards</button><button class="btn sm ghost" type="button" data-go="council">Talk it through →</button></div></div>`;
}

function tomorrowCard() {
  const nd = NEXT_DAY(); const evs = DAY_EVENTS(nd.d).filter(e => !e.todo && !ROUTINE.test(e.titulo)).slice(0, 5);
  if (!evs.length) return '';
  return `<div class="card rise" style="animation-delay:.18s"><div class="kick" style="margin-bottom:4px">${nd.lbl}</div><div class="row-list">
    ${evs.map(e => `<div class="mini-row"><span class="when">${hm(e.inicio)}</span><div class="what"><b>${esc(e.titulo.replace(/ with (Mr|Ms|Prof)\..*$/, ''))}</b><span>${esc(e.cal + (e.lugar ? ' · ' + e.lugar.split(',')[0] : ''))}</span></div></div>`).join('')}</div></div>`;
}

/* ── the hub: one block per sidebar section (demo, 2026-11-03) ───────────────────────────────────────────────────
   Each block names its section exactly as the sidebar does, says one number, and two or three short lines; a click
   opens that section. Numbers come from the same data the section shows, so the block and the page never disagree. */
const cut = (t, n) => { t = String(t || '').replace(/[*_`]/g, '').replace(/\[\[([^\]|]*)(\|[^\]]*)?\]\]/g, '$1').trim(); return t.length <= n ? t : t.slice(0, n).replace(/\s+\S*$/, '') + '…'; };
const firstSentence = t => cut(String(t || '').split(/(?<=[.?!])\s/)[0], 70);
function runLine(r) {
  let t = r.title.replace(/^First meeting · /, '').replace(/\s+—\s+to\s+.*$/, '');
  if (/^Daniela Ruiz/.test(t)) t = 'Daniela Ruiz — her two board questions';
  const lead = r.tile === 'prep' ? 'Prep' : r.tile === 'commit' ? (/owes you/.test(t) ? 'Waiting' : 'You owe') : r.tile === 'cold' ? 'Cold' : r.tile === 'warm' ? 'Warm' : r.tile === 'linkedin' ? 'Post' : '';
  return [lead, t.replace(/ owes you /, ' owes you ')];
}
const HUB = {
  needs() {
    const R = ST.RUN; if (!R) return null;
    const open = n => { const t = (R.tiers || []).find(x => x.n === n); return t ? t.rows.filter(r => r.open) : []; };
    const t1 = open(1), t2 = open(2);
    return t1.length ? { n: t1.length, unit: 'urgent decisions, then ' + t2.length + ' important', lines: t1.slice(0, 3).map(runLine), hot: true }
      : { n: t2.length, unit: 'important decisions left', lines: t2.slice(0, 3).map(runLine) };
  },
  prep() {
    const td = iso(NOW()); const P = (ST.preps || []).filter(p => p.cuando.slice(0, 10) >= td);
    const today = P.filter(p => p.cuando.slice(0, 10) === td), later = P.filter(p => p.cuando.slice(0, 10) > td);
    const ask = p => firstSentence((p.texto.match(/Ask (?:him|her|them)\s*([^.?]*[.?])/i) || [, ''])[1]).replace(/^./, c => c.toUpperCase());
    return { n: today.length, unit: today.length === 1 ? 'meeting today, prep written' : 'first meetings today, prep written', hot: true,
      lines: [...today.map(p => [hm(p.cuando.slice(11, 16)), cut(p.evento.replace(/\s+[—-]\s+.*$/, ''), 30) + (ask(p) ? ' — ' + ask(p) : '')]), ...later.slice(0, 1).map(p => [relDay(p.cuando.slice(0, 10)), cut(p.evento.replace(/\s+[—-]\s+.*$/, ''), 40)])].slice(0, 3) };
  },
  cal() {
    const td = iso(NOW()); const evs = TODAY_EVENTS().filter(e => !e.todo && e.inicio && !ROUTINE.test(e.titulo));
    const next = evs.filter(e => (inMin(td, e.fin || e.inicio) ?? 1) > 0); const p1 = p1Today().length;
    const show = (next.length ? next : evs).slice(0, 3);
    return { n: evs.length, unit: 'on the calendar · ' + p1 + ' priority-1 task' + (p1 === 1 ? '' : 's'), lines: show.map(e => [hm(e.inicio), cut(e.titulo.replace(/\s+-\s+.*$/, ''), 44)]) };
  },
  outreach() {
    if (!ST.D) return null; const L = lote().hoy;
    const k = p => p.kind === 'reply' ? 'Replied' : p.kind === 'fup' ? 'Follow-up' : p.kind === 'warm' ? 'Warm' : 'Cold';
    const C = lote().todos.filter(p => p.kind !== 'warm'), cold = C.length, warm = 8;   /* demo: the warm list is eight people */
    return { n: cold + warm, unit: `messages drafted · ${cold} cold, ${warm} warm`, lines: C.slice(0, 1).map(p => [k(p), cut(p.nombre + (p.porque ? ' — ' + p.porque : ''), 52)]) };
  },
  mail() {
    const I = (ST.hub && ST.hub.inbox && ST.hub.inbox.items) || []; if (!I.length) return null; const u = I.filter(m => m.nivel === 'urgent');
    return { n: u.length, unit: 'urgent · mail, LinkedIn, iMessage, Instagram', hot: true, lines: u.slice(0, 1).map(m => [m.canal, m.quien + ' — ' + m.que]) };
  },
  promises() { return { n: 7, unit: 'open promises', lines: [['Yours', 'Priya — the Harrow message and your new answer 2, by Friday']] }; },
  council() {
    return { n: 3, unit: 'pieces of feedback this week', lines: [['Coach', 'You talked 68% of the time with Daniela. Ask, then wait.']] };
  },
  learn() {
    const A = (ST.D && ST.D.aprendizaje) || {}; const cards = (A.tarjetas || []).length; const st = ((A.estudio || {}).items || []).filter(i => i.estado === 'abierto');
    const due = dueSoon(2);
    return { n: cards, unit: 'flashcards due · ' + st.length + ' readings queued', lines: [...st.slice(0, 1).map(i => ['Read', cut(i.titulo, 34) + ' · ' + i.minutos + ' min']), ...due.slice(0, 2).map(e => [e.course, cut(e.title, 28) + ' · ' + e.whenTxt])] };
  },
  meet() {
    const J = (ST.hub && ST.hub.juntas) || []; if (!J.length) return null;
    return { n: J.length, unit: 'recordings · summary, notes, transcript', lines: J.slice(0, 2).map(j => [relDay(j.dia).replace('Yesterday', 'Yest.'), cut(j.titulo, 46)]) };
  },
  people() {
    const G = window.__gente || (ST.hub && ST.hub.gente) || []; if (!G.length) return null;
    return { n: G.length, unit: 'people in your CRM', lines: G.slice(0, 3).map(p => [cut(p.tipo, 10), cut(p.nombre + ' — ' + p.contexto, 50)]) };
  },
  notes() {
    const B = (ST.hub && ST.hub.notas) || [];
    return { n: '2,311', unit: 'notes in four folders', lines: B.slice(0, 3).map(r => [cut(r.carpeta.split('/')[0].replace(/^\d\s*/, ''), 10), cut(r.titulo, 46)]) };
  },
  wa() { return chan('wa'); },
  in() { return chan('in'); },
  agents() {
    const S = ST.D && ST.D.salud; if (!S) return null; const c = S.cuenta, tot = c.rojo + c.amarillo + c.verde + c.gris;
    const bad = S.agentes.filter(a => a.color === 'rojo' || a.color === 'amarillo').sort((x, y) => (x.color === 'rojo' ? 0 : 1) - (y.color === 'rojo' ? 0 : 1));
    return { n: (tot - c.rojo) + '/' + tot, unit: 'agents ran at 3:00 and worked', lines: bad.map(a => [a.color === 'rojo' ? 'Failed' : 'Look', cut(a.nombre + ' — ' + (a.titulo || a.mensaje), 50)]) };
  },
  brain() { return { n: '6,840', unit: 'links between 2,311 notes', lines: [['3D', 'The map your agents read and write, live']] }; },
  call() { return { n: '1', unit: 'call from the car this morning', lines: [['8:40', 'Asked about Sofía, and his one ask for Matthew']] }; },
  me() {
    const Y = ST.hub && ST.hub.yo; const p = Y && Y.periodos && Y.periodos['7d'];
    if (p) { const t = p.totales || {}, fr = (p.frentes || []).filter(f => f.declarado && f.planeado);
      const gap = fr.slice().sort((a, b) => Math.abs(b.real - b.planeado) - Math.abs(a.real - a.planeado))[0];
      return { n: (t.horas_real_foco || 0) + ' h', unit: 'on his priorities this week · ' + (t.horas_plan_foco || 0) + ' h planned', lines: gap ? [['Gap', gap.frente + ': ' + gap.real + ' h spent vs ' + gap.planeado + ' h planned']] : [] }; }
    const m = (ST.D && ST.D.mananas) || []; let st = 0; for (const x of m.slice().reverse()) { if (x.estado === 'urgente' || x.estado === 'completa') st++; else if (x.estado === 'descanso' || x.fecha === iso(NOW())) continue; else break; }
    const w = (ST.D && ST.D.semana && ST.D.semana.objetivos) || [];
    return { n: st, unit: 'mornings in a row with the urgent cleared', lines: [['Week', w.filter(o => o.hecho).length + ' of ' + w.length + ' goals done · ' + cut(ST.D && ST.D.semana ? ST.D.semana.titulo : '', 30)], ['Time', 'Where your hours went, by front']] };
  },
};
function chan(k) {
  const r = ST.hub && ST.hub[k]; if (!r) return null; const P = r.pelota.filas || [];
  return { n: P.length, unit: 'waiting on you', lines: P.slice(0, 3).map(f => [f.dias && f.dias !== '0' ? f.dias + 'd' : 'new', cut(f.quien + ' — ' + f.que, 52)]) };
}
async function loadHub() {
  const g = (u, f) => api(u).then(f).catch(() => null);
  const [inbox, consejo, yo] = await Promise.all([g('/api/v3/inbox', r => r), g('/api/v3/consejo', r => r.gente), g('/api/yo', r => r)]);
  ST.hub = { inbox, consejo, yo }; emit('data');
}
ST.hubDone = new Set();
/* demo (Pablo, round 9): what waits in each block; the tour drives it to zero as each one is done */
export const BADGE = { prep: 2, outreach: 11, mail: 6, promises: 7, council: 3, learn: 1, agents: 1, me: 2, call: 1 };
/* what each badge counts, said on the block itself so the number never floats free */
const BUNIT = { promises: 'open promises · 4 yours, 3 owed to you', prep: 'meetings today · prep written', outreach: 'messages drafted · 3 cold, 8 warm', mail: 'replies drafted · 3 urgent', council: 'pieces of feedback this week', learn: 'reading due · 5 important · 10 good to have', agents: 'agent needs your decision', me: 'things to fix · time and replies', call: 'call from the car this morning' };
function hubHtml() {
  return `<div class="hub">${NAV.map(([grp, xs]) => { const items = (grp === 'You' ? [['call', 'On the phone', 'phone']] : []).concat(xs.filter(([k]) => k !== 'home'));   /* the phone first, before Agents (Pablo, round 11) */
    return `<div class="hub-g"><h6 class="kick">${esc(grp)}</h6><div class="hub-grid">${items.map(([k, l, i]) => { const b = HUB[k] && HUB[k]();
      return `<div class="card hub-b lift${b && b.hot ? ' hot' : ''}${ST.hubDone.has(k) ? ' ov-finished' : ''}${ST.hubFocus === k ? ' focus' : ''}" role="link" tabindex="0" data-hub="${k}" aria-label="Open ${esc(l)}">
        <div class="hub-top">${ico(i)}<span class="hub-t">${esc(l)}</span><span class="hub-badge" data-hb="${k}">${BADGE[k] || ''}</span><button class="hub-ck" type="button" data-hubck="${k}" title="Done with this — blur it" aria-label="Mark ${esc(l)} done">✓</button></div>
        ${BUNIT[k] ? `<div class="hub-u"><b>${BADGE[k]}</b> ${esc(BUNIT[k])}</div>` : ''}
        ${b ? `<ul class="hub-l">${b.lines.slice(0, 1).map(([a, t]) => `<li><span class="hub-k">${esc(a)}</span><span>${esc(t)}</span></li>`).join('')}</ul>`
          : `<div class="skel" style="width:40%;height:22px;margin:12px 0"></div><div class="skel" style="width:80%"></div>`}
        <div class="hub-go">Open ${esc(l)} →</div></div>`; }).join('')}</div></div>`; }).join('')}</div>`;
}
function wireHub(el) {
  $$('[data-hub]', el).forEach(b => { b.onclick = e => { if (e.target.closest('[data-hubck]')) return; if (b.dataset.hub === 'call') { if (window.__ov && !document.body.classList.contains('ov-tour')) window.__ov.call(); return; } go(b.dataset.hub); }; b.onkeydown = e => { if (e.key === ' ' || (e.key === 'Enter' && !document.body.classList.contains('ov-tour'))) { e.preventDefault(); go(b.dataset.hub); } }; });
  $$('[data-hubck]', el).forEach(b => b.onclick = e => { e.stopPropagation(); const k = b.dataset.hubck; ST.hubDone.has(k) ? ST.hubDone.delete(k) : ST.hubDone.add(k); b.closest('.hub-b').classList.toggle('ov-finished'); });
}

/* demo: the Do-now draft, read and approved without leaving Home. Approving never sends: the reply waits in his outbox. */
const DRAFT = { to: 'Daniela Ruiz · Grupo Ferra', asks: ['Who owns the data after phase two?', 'What happens if the supervisors stop using it?'],
  body: `Daniela, thanks for writing before the board. Two short answers you can take as they are:\n\n1. The data is Ferra's. Everything that goes into the assistant lives in Ferra's accounts, trains no model, and if we stop working together you keep all of it. We'll put it in writing in the phase-two contract, as Rodrigo asked.\n\n2. If usage drops, that's my problem, not the supervisors'. Every Monday I check usage by shift; if someone stops for two weeks, I go to the floor with him and we adjust the assistant to how he works. That's why phase two is monthly and can be cancelled with 30 days' notice.\n\nIf it helps, I can join the board call for 15 minutes.\n\nPablo` };
export function openDraft(c) {
  openSheet({ kick: 'Do now · drafted by Exo', title: 'Reply to Daniela Ruiz', html: `<p class="mu" style="margin-bottom:8px">Her board decides in two days. She asked:</p><ol style="margin:0 0 14px 18px;line-height:1.6">${DRAFT.asks.map(a => `<li>${esc(a)}</li>`).join('')}</ol>
    <div class="kick ac" style="margin-bottom:6px">The reply Exo wrote · from the scope note and your last call</div><div class="card" style="white-space:pre-wrap;font-size:14px;line-height:1.6">${esc(DRAFT.body)}</div>`,
    foot: `<button class="btn ghost" type="button" id="drNo">Not now</button><button class="btn pri" type="button" id="drOk">Send the reply</button>` });
  $('#drNo').onclick = closeSheet;
  $('#drOk').onclick = () => { closeSheet(); if (c) ST.skipDo.add(c.what.toLowerCase().slice(0, 50)); toast('Sent to Daniela Ruiz.'); drawHome(); };
}
function drawHome() {
  const el = $('#v-home');
  ST.modeAuto = autoMode(); const mode = ST.mode || ST.modeAuto;
  const d = NOW();
  const date = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase().replace(',', ' ·');
  /* demo (2026-11-03, Pablo: "home is the centre … whenever I click each block it should lead me to each thing in the side
     bar"): one block per sidebar section, in the sidebar's order and groups; each says one concrete thing and opens it. */
  const html = `<div class="wrap">
    <button class="m-search" type="button" id="mSearch">${ico('search')}Search or ask Exo</button>
    <div class="topbar"><span class="date">${esc(date)} · <span class="mu">read by 28 agents at 3:00</span></span><span class="date"><button class="btn sm ghost intro-b" type="button" data-go="intro" title="Pablo's Exo intro, with his song">▶ Intro</button></span></div>
    ${heroHtml(mode)}${hubHtml()}</div>`;
  /* the run posts a message on every change: redraw only when something on Home changed, and fade in only once */
  if (html === ST.homeHtml && el.firstChild) return;
  el.classList.toggle('calm', !!ST.homeHtml); ST.homeHtml = html; el.innerHTML = html;
  ST.firstHome = false;
  const cands = candidates();
  const dg = $('#doGo'); if (dg && cands[0]) dg.onclick = () => cands[0].go[0] === 'url' ? window.open(cands[0].go[1], '_blank', 'noopener') : cands[0].go[0] === 'draft' ? openDraft(cands[0]) : go(cands[0].go[0], cands[0].go[1]);
  const ds = $('#doSkip'); if (ds && cands[0]) ds.onclick = () => { ST.skipDo.add(cands[0].what.toLowerCase().slice(0, 50)); drawHome(); };
  wireHub(el);
  const ms = $('#mSearch'); if (ms) ms.onclick = () => openPalMobile();
  wireToday(el);
  if (ST.D) tipHoy();
}

/* ── the command bar ───────────────────────────────────────────────────────── */
let palSel = 0, palItems = [], palT, palQ = '';
function closePal() { $('#pal').classList.remove('on'); $('#cmd').classList.remove('m-on'); palItems = []; }
function openPalMobile() { $('#cmd').classList.add('m-on'); setTimeout(() => $('#q').focus(), 30); renderPal(''); }
const HINTS = ['Rundown', "What's next?", 'Open today\'s prep', 'Ask the council', 'Search my brain'];
function drawHints() {
  $('#hints').innerHTML = HINTS.map(h => `<button type="button">${esc(h)}</button>`).join('');
  $$('#hints button').forEach((b, i) => b.onclick = () => {
    if (i === 0) rundown(); else if (i === 1) whatsNext(); else if (i === 2) go('prep'); else if (i === 3) go('council'); else { $('#q').focus(); }
  });
}
function rundown() {
  const left = ST.RUN ? ST.RUN.left : 0; const ev = nextEvent(); const c = candidates()[0];
  openSheet({ kick: 'Rundown', title: NOW().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }), html: `<div class="prose">
    <p>${esc(leadLine(ST.mode || autoMode()))}</p>
    ${c ? `<h3>Do now</h3><p><strong>${esc(c.what)}</strong> — ${esc(c.why)}</p>` : ''}
    ${ev ? `<h3>Next</h3><p>${esc(ev.titulo)} · ${esc(relDay(ev.dia))} ${esc(hm(ev.inicio))}${ev.lugar ? ' · ' + esc(ev.lugar) : ''}</p>` : ''}
    <h3>Your run</h3><ul>${(ST.RUN ? ST.RUN.tiers : []).map(t => `<li>${esc(t.name)}: ${t.rows.filter(r => r.open).length} open</li>`).join('')}</ul>
    ${left ? '' : '<p>Nothing needs you right now.</p>'}</div>` });
}
function whatsNext() {
  const td = iso(NOW()); const evs = (ST.agenda ? ST.agenda.dias : []).filter(d => d.dia >= td).flatMap(d => d.eventos.filter(e => !e.todo && (inMin(d.dia, e.fin || e.inicio) ?? 1) > 0).map(e => Object.assign({ dia: d.dia }, e))).slice(0, 8);
  openSheet({ kick: "What's next", title: 'Coming up', html: `<div class="row-list">${evs.map(e => `<div class="mini-row"><span class="when">${esc(relDay(e.dia) === 'Today' ? hm(e.inicio) : relDay(e.dia).slice(0, 3) + ' ' + hm(e.inicio))}</span><div class="what"><b>${esc(e.titulo)}</b><span>${esc(e.cal + (e.lugar ? ' · ' + e.lugar : ''))}</span></div></div>`).join('')}</div>` });
}
async function renderPal(q) {
  palQ = q; const ql = q.trim().toLowerCase();
  const items = [];
  const cmds = [...Object.entries(VIEWS).map(([k, v]) => ({ t: v.label, s: 'Open', ic: v.icon, run: () => go(k) })),
    { t: 'Start the run', s: 'Needs you', ic: 'needs', run: () => go('needs', { tier: 1 }) },
    { t: 'Rundown', s: 'Your day in one screen', ic: 'spark', run: rundown },
    { t: "What's next?", s: 'Your calendar', ic: 'cal', run: whatsNext },
    { t: 'Show names', s: 'Pin the name of every part on screen — for talking to the Architect', ic: 'spark', run: () => import('./nombres.js').then(m => toast(m.alternar() ? 'Names on — ⌘K → Show names again to hide them.' : 'Names off.')) },
    { t: 'Names of things', s: 'The shared language for every part of Exo', ic: 'notes', run: () => import('./nombres.js').then(m => m.lista()) },
    { t: 'Play the intro', s: 'The Exo intro with your song', ic: 'spark', run: () => go('intro') },
    { t: 'Report a miss', s: 'Something slipped that an agent should have caught', ic: 'spark', run: () => reportMiss() },
    { t: 'Connect this phone', s: 'Exo on your phone even with the Mac off', ic: 'spark', run: () => conectarTelefono() },
    { t: 'Back to the classic panel', s: '/classic', ic: 'arrow', run: () => { location.href = '/classic'; } }];
  const cm = ql ? cmds.filter(c => c.t.toLowerCase().includes(ql)) : cmds.slice(0, 7);
  const recent = asks().filter(r => !ql || r.q.toLowerCase().includes(ql)).slice(0, ql ? 3 : 4);
  if (recent.length) items.push({ h: 'Recent asks' }, ...recent.map(r => ({ t: r.q, s: r.estado === 'corriendo' ? 'Answering…' : r.estado === 'listo' ? 'Answer ready · ' + new Date(r.t).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : 'No answer — tap to see', ic: 'spark', run: () => openAsk(r.id) })));
  if (ql) {
    items.push({ h: 'Ask' }, { t: 'Ask Exo: “' + q.trim() + '”', s: 'Claude on your Mac reads your brain and answers', ic: 'spark', run: () => askSheet(q.trim()) },
      { t: 'Ask the council: “' + q.trim() + '”', s: 'Estratega answers', ic: 'council', run: () => go('council', { ask: q.trim() }) });
  }
  if (cm.length) items.push({ h: 'Go to' }, ...cm.slice(0, 6));
  if (ql.length >= 2) {
    const ppl = (window.__gente || []).filter(p => p.nombre.toLowerCase().includes(ql)).slice(0, 5);
    if (ppl.length) items.push({ h: 'People' }, ...ppl.map(p => ({ t: p.nombre, s: (p.tipo ? p.tipo + ' · ' : '') + p.contexto.replace(/[*`]/g, '').slice(0, 90), ic: 'people', run: () => go('people', { nombre: p.nombre }) })));
    const pr = (ST.preps || []).filter(p => p.evento.toLowerCase().includes(ql)).slice(0, 3);
    if (pr.length) items.push({ h: 'Preps' }, ...pr.map(p => ({ t: p.evento, s: relDay(p.cuando.slice(0, 10)) + ' ' + hm(p.cuando.slice(11, 16)), ic: 'prep', run: () => go('prep', { nota: p.nota }) })));
    items.push({ h: 'Notes', pending: true });
  }
  palItems = items; palSel = items.findIndex(x => !x.h); drawPal();
  if (ql.length >= 2) {
    clearTimeout(palT); palT = setTimeout(async () => {
      const r = await api('/api/v3/buscar?q=' + encodeURIComponent(q.trim())).catch(() => ({ resultados: [] }));
      if (palQ !== q) return;
      const i = palItems.findIndex(x => x.pending);
      const notes = r.resultados.slice(0, 8).map(n => ({ t: n.titulo, s: n.carpeta, ic: 'notes', run: () => openNote(n.ruta) }));
      if (i >= 0) palItems.splice(i, 1, ...(notes.length ? [{ h: 'Notes' }, ...notes] : []));
      drawPal();
    }, 220);
  }
}
function drawPal() {
  const p = $('#pal'); if (!palItems.length) { p.classList.remove('on'); return; }
  p.innerHTML = palItems.map((x, i) => x.h ? `<h6>${esc(x.h)}${x.pending ? ' · searching…' : ''}</h6>` : `<button type="button" class="opt" role="option" data-i="${i}" aria-selected="${i === palSel}"><span class="ic">${ico(x.ic || 'arrow')}</span><span class="tx"><b>${esc(x.t)}</b><span>${esc(x.s || '')}</span></span></button>`).join('');
  p.classList.add('on');
  $$('.opt', p).forEach(b => { b.onmousedown = e => e.preventDefault(); b.onclick = () => runPal(+b.dataset.i); });
  const sel = p.querySelector('[aria-selected=true]'); if (sel) sel.scrollIntoView({ block: 'nearest' });
}
function runPal(i) { const x = palItems[i]; if (!x || x.h) return; $('#q').value = ''; closePal(); $('#q').blur(); x.run(); }
function movePal(d) { if (!palItems.length) return; let i = palSel; do { i = (i + d + palItems.length) % palItems.length; } while (palItems[i].h); palSel = i; drawPal(); }
/* Asks are kept (2026-11-01, Pablo: "when asking a quetions and clicking esc, there is no way to come back to that
   quesiton"). Each ask is a record on this device (last 15): Esc only closes the sheet, the answer keeps coming, a
   pill says when it is ready, and ⌘K lists "Recent asks" to reopen any of them. A reload picks unfinished ones up. */
const ASK_KEY = 'jarvis-asks';
function asks() { try { return JSON.parse(localStorage.getItem(ASK_KEY) || '[]'); } catch (_) { return []; } }
function saveAsks(a) { try { localStorage.setItem(ASK_KEY, JSON.stringify(a.slice(0, 15))); } catch (_) { } }
function upd(id, ch) { const a = asks(); const r = a.find(x => x.id === id); if (r) { Object.assign(r, ch); saveAsks(a); } return r; }
let askOpen = null;
function askHtml(r) {
  return r.estado === 'corriendo' ? '<div class="typing"><i></i><i></i><i></i></div> <span class="mu">' + (r.slow ? 'Still working — big questions take a minute or two. You can close this; it keeps going.' : 'Reading your brain… You can close this; the answer waits under Recent asks.') + '</span>'
    : r.estado === 'listo' ? `<div class="prose">${md(r.texto)}</div><p class="mu" style="margin-top:16px;font-size:12px">Asked ${esc(new Date(r.t).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }))} · kept under ⌘K → Recent asks</p>`
      : `<p class="mu">${esc(r.texto || 'No answer.')}</p><button class="btn sm" type="button" id="askRetry" style="margin-top:12px">Ask again</button>`;
}
export function openAsk(id) {
  const r = asks().find(x => x.id === id); if (!r) return;
  askOpen = id; hidePill(id);
  openSheet({ kick: 'Exo · Claude on your Mac', title: r.q.length > 70 ? r.q.slice(0, 68) + '…' : r.q, html: askHtml(r) });
  const rb = $('#askRetry'); if (rb) rb.onclick = () => askSheet(r.q);
}
function showPill(r) {
  let p = $('#askPill'); if (!p) { p = document.createElement('button'); p.id = 'askPill'; p.type = 'button'; document.body.appendChild(p); }
  p.innerHTML = `<span class="pip"></span>Answer ready · <b>${esc(r.q.slice(0, 40))}${r.q.length > 40 ? '…' : ''}</b>`; p.dataset.id = r.id; p.classList.add('on');
  p.onclick = () => openAsk(r.id);
}
function hidePill(id) { const p = $('#askPill'); if (p && (!id || p.dataset.id === id)) p.classList.remove('on'); }
async function follow(id, jobId) {
  for (let i = 0; i < 200; i++) {
    await new Promise(ok => setTimeout(ok, i < 5 ? 1500 : 2500));
    const s = await api('/api/v3/claude?id=' + jobId).catch(e => (e && e.status === 404 ? { estado: 'error', texto: 'This answer was lost when your Mac restarted. Ask again.' } : null));
    if (i === 8) { upd(id, { slow: true }); if (askOpen === id && $('#sheet').classList.contains('on')) openAsk(id); }
    if (s && s.estado !== 'corriendo') {
      const r = upd(id, { estado: s.estado === 'listo' ? 'listo' : 'error', texto: s.texto });
      if (askOpen === id && $('#sheet').classList.contains('on')) openAsk(id); else if (r) showPill(r);
      return;
    }
  }
  upd(id, { estado: 'error', texto: 'No answer after several minutes.' });
}
async function askSheet(q) {
  const id = 'a' + Date.now().toString(36);
  const a = asks(); a.unshift({ id, q, t: Date.now(), estado: 'corriendo' }); saveAsks(a);
  openAsk(id);
  const j = await api('/api/v3/claude', { body: { prompt: q } }).catch(e => ({ error: e.body && e.body.error || e.message }));
  if (!j.id) { upd(id, { estado: 'error', texto: j.error }); if (askOpen === id) openAsk(id); return; }
  upd(id, { job: j.id }); follow(id, j.id);
}
function resumeAsks() { asks().filter(r => r.estado === 'corriendo' && r.job && Date.now() - r.t < 3600e3).forEach(r => follow(r.id, r.job));
  asks().filter(r => r.estado === 'corriendo' && (!r.job || Date.now() - r.t >= 3600e3)).forEach(r => upd(r.id, { estado: 'error', texto: 'This one never finished. Ask again.' })); }

/* ── voice ─────────────────────────────────────────────────────────────────── */
async function voice() {   /* demo: no phone line here — the call at the end of the tour shows it */
  toast('In the real panel this orb calls Exo by voice. The tour ends with that call.');
}

/* ── hover: a soft light follows the mouse inside whatever card it is over (2026-11-01, Pablo: "add a interactives
   way for whenver I have my mouse in top of things"). One fixed layer, clipped to the hovered card; no pointer events. */
function hoverLight() {
  if (matchMedia('(hover: none)').matches) return;
  const g = document.createElement('div'); g.id = 'glow'; document.body.appendChild(g);
  const SEL = '.card, .tgroup, .or-card, .of-issue, .fc-s, .me-tile, .hero, .donow, .of-col, .dp-ev, .item, .nav button';
  let cur = null;
  addEventListener('pointermove', e => {
    const el = e.target.closest && e.target.closest(SEL);
    if (el !== cur) { cur = el; g.classList.toggle('on', !!el); }
    if (!el) return;
    const r = el.getBoundingClientRect(), rad = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 12;
    g.style.clipPath = `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round ${rad}px)`;
    g.style.setProperty('--mx', e.clientX + 'px'); g.style.setProperty('--my', e.clientY + 'px');
  }, { passive: true });
  addEventListener('scroll', () => { if (cur) { cur = null; g.classList.remove('on'); } }, { passive: true, capture: true });
  document.addEventListener('pointerleave', () => { cur = null; g.classList.remove('on'); });
}

/* ── the sky: dithered clouds that drift, stars that breathe ─ */
function sky() {
  const c = $('#sky'), x = c.getContext('2d'), f = $('#skyFx'), fx = f.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const S = 5; let W, H, img, stars = [], comets = [], t0 = performance.now();
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16);
  const pal = [[15, 18, 24], [24, 31, 44], [38, 50, 72], [62, 82, 118], [104, 128, 176], [156, 178, 224]];
  const P = new Uint8Array(512); for (let i = 0; i < 256; i++) P[i] = i; for (let i = 255; i > 0; i--) { const j = (Math.sin(i * 91.7) * 43758.5453 % 1 + 1) % 1 * (i + 1) | 0; [P[i], P[j]] = [P[j], P[i]]; } for (let i = 0; i < 256; i++) P[i + 256] = P[i];
  const fade = t => t * t * (3 - 2 * t), lerp = (a, b, t) => a + (b - a) * t;
  const h2 = (i, j) => P[(P[i & 255] + j) & 511] / 255;
  const noise = (xx, yy) => { const i = Math.floor(xx), j = Math.floor(yy), u = fade(xx - i), v = fade(yy - j); return lerp(lerp(h2(i, j), h2(i + 1, j), u), lerp(h2(i, j + 1), h2(i + 1, j + 1), u), v); };
  const fbm = (xx, yy) => noise(xx, yy) * .55 + noise(xx * 2.1, yy * 2.1) * .28 + noise(xx * 4.3, yy * 4.3) * .17;
  function size() {
    W = Math.max(1, Math.ceil((innerWidth || 1280) / S)); H = Math.max(1, Math.ceil((innerHeight || 800) / S)); c.width = W; c.height = H; img = x.createImageData(W, H);
    const dpr = Math.min(2, devicePixelRatio || 1); f.width = innerWidth * dpr; f.height = innerHeight * dpr; fx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.round(innerWidth * innerHeight / 14000) }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight * .78, r: Math.random() < .12 ? 1.6 : 1, p: Math.random() * 6.28, s: .4 + Math.random() * 1.2 }));
  }
  function clouds(t) {
    const d = img.data, dx = t * .006, dy = t * .0015;
    for (let yy = 0; yy < H; yy++) {
      const ny = yy / H; const band = Math.max(0, Math.min(1, (ny - .34) / .66)); const lift = band * band;
      for (let xx = 0; xx < W; xx++) {
        const n = fbm(xx * .028 + dx, yy * .045 + dy);
        let v = (n - .38) * 2.1 * lift + lift * .18 + (1 - ny) * .02;
        v = Math.max(0, Math.min(.999, v)) * (pal.length - 1);
        let k = Math.floor(v); const fr = v - k; if (fr > bayer[(yy & 3) * 4 + (xx & 3)]) k++;
        const col = pal[Math.min(pal.length - 1, k)], o = (yy * W + xx) * 4;
        d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
  }
  function fxFrame(t) {
    fx.clearRect(0, 0, innerWidth, innerHeight);
    for (const s of stars) { const a = .35 + .45 * (0.5 + 0.5 * Math.sin(t / 1000 * s.s + s.p)); fx.fillStyle = `rgba(232,238,255,${a})`; fx.fillRect(Math.round(s.x), Math.round(s.y), s.r, s.r); }
    /* no comets (2026-11-01, Pablo: the stars that travel in a line confused him) */
    comets = comets.filter(cm => { const y = cm.y0 + (t - cm.t) * cm.v; if (y > innerHeight * .55) return false;
      const g = fx.createLinearGradient(cm.x, y - cm.len, cm.x, y); g.addColorStop(0, 'rgba(227,236,255,0)'); g.addColorStop(1, 'rgba(227,236,255,.65)');
      fx.fillStyle = g; fx.fillRect(cm.x, y - cm.len, 1, cm.len); fx.fillStyle = 'rgba(235,242,255,.95)'; fx.fillRect(cm.x - 2, y - 2, 5, 5); return true; });
  }
  size(); addEventListener('resize', () => { size(); clouds((performance.now() - t0) / 100); });
  clouds(0); fxFrame(0);
  if (reduce) return;
  let lastC = 0, lastF = 0;
  (function loop(now) {
    if (!document.hidden) {
      if (now - lastC > 140) { clouds((now - t0) / 100); lastC = now; }
      if (now - lastF > 33) { fxFrame(now); lastF = now; }
    }
    requestAnimationFrame(loop);
  })(0);
}

/* ── delight: the morning-complete moment ─────────────────────────────────── */
function celebrate() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { toast('Morning complete. Close Exo.'); return; }
  const r = document.createElement('div'); r.className = 'rocket';
  r.innerHTML = `<svg viewBox="0 0 9 23" width="18" height="46" shape-rendering="crispEdges"><rect x="3" y="0" width="3" height="2" fill="#fff"/><rect x="2" y="2" width="5" height="9" fill="#E3ECFF"/><rect x="3" y="4" width="3" height="2" fill="#4F6DAA"/><rect x="0" y="9" width="2" height="4" fill="#A9C1F5"/><rect x="7" y="9" width="2" height="4" fill="#A9C1F5"/><rect x="3" y="11" width="3" height="3" fill="#fff"/><rect x="3" y="14" width="3" height="5" fill="#D3E0FF" opacity=".75"/><rect x="4" y="19" width="1" height="4" fill="#D3E0FF" opacity=".45"/></svg>`;
  document.body.appendChild(r); requestAnimationFrame(() => r.classList.add('go'));
  for (let i = 0; i < 26; i++) setTimeout(() => { const s = document.createElement('div'); s.className = 'streak'; s.style.left = (Math.random() * 100) + 'vw'; s.style.top = '0'; s.style.height = (40 + Math.random() * 90) + 'px'; document.body.appendChild(s); setTimeout(() => s.remove(), 1200); }, i * 70);
  const c = $('#complete'); c.classList.remove('on'); void c.offsetWidth; c.classList.add('on');
  setTimeout(() => r.remove(), 2800);
}
window.__celebrate = celebrate;

/* ── keyboard ──────────────────────────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  const typing = /INPUT|TEXTAREA/.test(document.activeElement.tagName);
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (innerWidth <= 900) openPalMobile(); else { $('#q').focus(); renderPal($('#q').value); } return; }
  if (e.key === 'Escape') { if ($('#sheet').classList.contains('on')) { closeSheet(); return; } if ($('#voice').classList.contains('on')) return; closePal(); $('#q').blur(); return; }
  if (!typing && e.key === '/') { e.preventDefault(); $('#q').focus(); return; }
  if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && /^[1-9]$/.test(e.key) && ST.view !== 'needs') {
    const keys = ['home', 'needs', 'prep', 'cal', 'outreach', 'mail', 'council', 'learn', 'notes']; go(keys[+e.key - 1]);
  }
});

/* ── boot ──────────────────────────────────────────────────────────────────── */
function boot() {
  drawNav(); drawHints(); sky(); mountRun(); hoverLight(); resumeAsks();
  const pb = document.querySelector('.side .prio'); if (pb) { pb.style.cursor = 'pointer'; pb.title = 'Write today’s one thing'; pb.onclick = editGoal; }
  const q = $('#q');
  q.addEventListener('input', () => renderPal(q.value));
  q.addEventListener('focus', () => renderPal(q.value));
  q.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== q) closePal(); }, 120));
  q.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); movePal(1); } else if (e.key === 'ArrowUp') { e.preventDefault(); movePal(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (palSel >= 0) runPal(palSel); else if (q.value.trim()) { askSheet(q.value.trim()); q.value = ''; closePal(); } }
  });
  $('#scrim').onclick = closeSheet; $('#shClose').onclick = closeSheet;
  $('#orb').onclick = voice; $('#orbM').onclick = voice;
  on('data', () => { badges(); if (ST.view === 'home') drawHome(); });
  on('run', () => { badges(); if (ST.view === 'home' && !document.querySelector('#v-home .hero:hover')) drawHome(); });
  const start = (location.hash.match(/^#\/([a-z]+)/) || [, 'home'])[1];
  go(start);
  loadAll();
  api('/api/v3/gente').then(g => { window.__gente = g.gente; }).catch(() => { });
  setInterval(loadAll, 5 * 60 * 1000);
  setInterval(() => { const t = $('#hello'); if (t && !t.querySelector('.ch')) t.textContent = greeting(); if (!ST.mode && autoMode() !== ST.modeAuto && ST.view === 'home') drawHome(); }, 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { loadAll(); runCmd('refresh'); } });
  addEventListener('hashchange', () => { const v = (location.hash.match(/^#\/([a-z]+)/) || [, 'home'])[1]; if (v !== ST.view) go(v); });
}
boot();
