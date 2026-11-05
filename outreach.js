/* Exo v3 — Outreach (2026-11-01).
   Pablo: "it's not easy for me to send warm and cold outreach, which is one of the most important things of my second
   brain". His answers: a small daily batch, and a real Send inside the app. The people come from the same rows the run
   shows — cold from `cracks` (new people and follow-ups), warm from `seguimiento` (and cabina's CRM rows) — and every
   decision is saved the run's way (/api/marcar: [x] sent, [-] not this one, with the reason), so the run, the trust
   score and the agents all see it. Send goes out through Apple Mail with his own sign-in (/api/v3/correo/enviar),
   only after he confirms; an inbox not signed in yet opens its own compose window with everything written. */
import { $, $$, esc, api, toast, ST, NOW, iso, openSheet, closeSheet, runCmd, on } from './app.js';

const DAILY = 5;
const CUENTAS = [['mit', 'MIT', 'pablo@mit.example'], ['gmail', 'Gmail', 'pablo@gmail.example'], ['vynmsa', 'VYNMSA', 'pablo@vynmsa.example'], ['bentley', 'Bentley', 'pablo@bentley.example'], ['rd', 'pablo-rd', 'pablo.rd@gmail.example']];
const COMPOSE = {
  gmail: (to, su, b) => `https://mail.google.com/mail/?authuser=pablo@gmail.example&view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(su)}&body=${encodeURIComponent(b)}`,
  rd: (to, su, b) => `https://mail.google.com/mail/?authuser=pablo.rd@gmail.example&view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(su)}&body=${encodeURIComponent(b)}`,
  out: (to, su, b) => `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(su)}&body=${encodeURIComponent(b)}`,
};
const composeUrl = (c, to, su, b) => (c === 'gmail' || c === 'rd' ? COMPOSE[c] : COMPOSE.out)(to, su, b);
const strip = s => String(s || '').replace(/\[\[[^\]]*\]\]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*/g, '').replace(/\*/g, '').replace(/<!--.*?-->/g, '').trim();
const between = (t, a, b) => { const i = t.indexOf(a); if (i < 0) return ''; const r = t.slice(i + a.length); const j = !b ? -1 : typeof b === 'string' ? r.indexOf(b) : r.search(b); return (j < 0 ? r : r.slice(0, j)).trim(); };

function job(slug) { return ((ST.D && ST.D.trabajos) || []).find(t => t.slug === slug) || { pendientes: [] }; }

/* one person to write to, from a run row */
function persona(trabajo, it) {
  const t = it.crudo || it.texto || ''; const links = [...t.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)].map(m => [m[1], m[2]]);
  const mail = links.find(l => /^mailto:/i.test(l[1]));
  const li = links.find(l => /linkedin\.com/i.test(l[1]));
  const p = { trabajo, it, id: it.id, linea: it.linea, crudo: it.crudo, li: li ? li[1] : '', to: '', asunto: '', cuerpo: '', desde: '', canal: 'email' };
  if (trabajo === 'cracks') {
    const mc = it.mensaje_crack || {};
    const fup = /-f\d+$/.test(it.id) || /Follow-up/.test(t), reply = /-reply/.test(it.id);
    p.kind = reply ? 'reply' : fup ? 'fup' : 'cold';
    p.nombre = mc.nombre || strip((t.match(/\*\*(?:Follow-up · )?([^*—·]+)/) || [, ''])[1]);
    p.quien = fup ? strip(between(t, '·', ' · **adds**')) : strip((t.match(/\*\*[^*—]+—\s*([^*]+)\*\*/) || [, ''])[1]);
    p.porque = strip(between(t, '**te sirve para**', / · \*\*/)) || strip(between(t, '**adds**', / · \[|$/));
    p.haz = strip(between(t, '**haz esto:**', / · \[/));
    if (mail) { const u = mail[1]; const q = new URLSearchParams(u.split('?')[1] || ''); p.to = decodeURIComponent(u.slice(7).split('?')[0]); p.asunto = q.get('subject') || ''; p.cuerpo = q.get('body') || ''; }
    if (mc.asunto) p.asunto = mc.asunto; if (mc.cuerpo) p.cuerpo = mc.cuerpo;
    const dm = (p.cuerpo.match(/MANDALO DESDE\s+(\S+@\S+)/i) || p.haz.match(/from your [^(]*\(([^)]+@[^)]+)\)/i) || []);
    p.desde = (dm[1] || '').trim(); p.cuerpo = p.cuerpo.replace(/\n*\s*MANDALO DESDE.*$/is, '').trim();
    if (!p.to && p.li) p.canal = 'linkedin';
  } else {
    const head = (t.match(/\*\*([^*]+)\*\*\s*—\s*([^·]+)/) || []);
    p.kind = 'warm'; p.nombre = strip(head[1] || ''); p.quien = strip(head[2] || '').replace(/^their news:\s*/i, '');
    p.cuerpo = (it.mensaje && it.mensaje[0]) || ''; p.porque = /your give, owed/.test(t) ? 'You owe them this.' : /never followed up/.test(t) ? 'You met once and never followed up.' : 'Their news is a reason to write.';
    p.canal = / · LinkedIn · /.test(t) ? 'linkedin' : / · WhatsApp · /.test(t) ? 'whatsapp' : mail ? 'email' : 'linkedin';
    if (mail) p.to = decodeURIComponent(mail[1].slice(7).split('?')[0]);
  }
  /* which inbox (2026-11-01, Pablo: "Same as first email but bentley for bentley and mit for mit always but it should
     give me and option to decide"): Bentley and MIT addresses always from those inboxes; otherwise the inbox he first
     wrote them from (his sent mail copy); otherwise the agent's hint; otherwise Gmail. The From menu still lets him pick. */
  const prev = p.to && SENT ? SENT.find(m => (m.para || '').toLowerCase().includes(p.to.toLowerCase())) : null;
  p.cuenta = /@([\w-]+\.)*bentley\.edu$/i.test(p.to) ? 'bentley' : /@([\w-]+\.)*mit\.edu$/i.test(p.to) ? 'mit'
    : prev ? prev.cuenta : ((CUENTAS.find(c => c[2] === p.desde) || CUENTAS[1])[0]);
  p.porCuenta = /bentley\.edu$|mit\.edu$/i.test(p.to) ? 'school address' : prev ? 'same inbox as your first email' : p.desde ? 'the agent’s pick' : 'default';
  return p;
}
function gente() {
  const cold = job('cracks').pendientes.filter(it => it.estado === 'pendiente' && /^crack-/.test(it.id || '')).map(it => persona('cracks', it));
  const warm = job('seguimiento').pendientes.filter(it => it.estado === 'pendiente' && /^seg-/.test(it.id || '') && !/^seg-(leer|map)-/.test(it.id)).map(it => persona('seguimiento', it));
  const cab = job('cabina').pendientes.filter(it => it.estado === 'pendiente' && /^md-rel-/.test(it.id || '')).map(it => persona('cabina', it));
  const rank = p => p.kind === 'reply' ? 0 : p.kind === 'fup' ? 1 : /owe/.test(p.porque) ? 2 : p.kind === 'cold' ? 3 : 4;
  return [...cold, ...warm, ...cab].sort((a, b) => rank(a) - rank(b));
}
/* today's small batch: replies always, then up to five; what he already did today counts toward the five */
const HECHO_KEY = () => 'jarvis-outreach-' + iso(NOW());   /* a function: this module loads before app.js finishes */
function hechosHoy() { try { return JSON.parse(localStorage.getItem(HECHO_KEY()) || '[]'); } catch (_) { return []; } }
function anotar(id) { try { const h = hechosHoy(); h.push(id); localStorage.setItem(HECHO_KEY(), JSON.stringify(h)); } catch (_) { } }
export function lote() { const all = gente(); const done = hechosHoy().length; const replies = all.filter(p => p.kind === 'reply'); const rest = all.filter(p => p.kind !== 'reply'); return { hoy: [...replies, ...rest.slice(0, Math.max(0, DAILY - done))], todos: all, hechos: done }; }

let listas = null, SENT = null;   // SENT: what he sent, oldest first, from the mail copy (for "same inbox as the first email")
/* demo (Pablo, round 5): cold and warm apart, each saying why it matters; warm opens on a map of everyone he has met */
const WHY = {   /* demo (Pablo, round 7): a status, not a lecture */
  cold: 'You’re working on landing two more mid-size clients before December, and you need 5 conversations with operations leaders this month — 2 so far. These messages are how you get the next three.',
  warm: 'You’re losing touch with important connections around Latam that could matter later: 8 people you met haven’t heard from you in over two weeks. One line each keeps them warm.' };

/* ── demo (Pablo, round 9): real-looking cold emails (his signature, "Company / Pablo Gonzalez" subjects) and a fast warm list ── */
const SIG = '\n\n—\nPablo González\nBentley University · VYNMSA\nAI for operations teams · Boston / Monterrey';
const COLD = {
  'Nathan Okafor': { to: 'nathan.okafor@crestlinefreight.com', asunto: 'Re: Crestline Freight / Pablo Gonzalez', cuerpo: 'Hi Nathan,\n\nI’m a student at Bentley who spent the summer on the floor of a 200-person metal-parts plant in Monterrey. Supervisors were losing about 40 minutes a shift writing the line-stop report by hand. We built an assistant that drafts it from a voice note; now it takes them 6.\n\nYou posted about dock scheduling last week. Is that still where your team loses the most time? I’d love 15 minutes to hear how you handle it today. I’m not selling anything yet.\n\nBest,' + SIG },
  'Alain Chenier': { to: 'alain@borealvision.ca', asunto: 'Boreal Vision / Pablo Gonzalez', cuerpo: 'Hi Alain,\n\nYou wrote that every sawmill customer asks you for AI and you don’t know what to promise. I’d promise one thing: the inspection report their shift lead already writes, done in 6 minutes instead of 40.\n\nThat’s what we did at a 200-person metal-parts plant in Monterrey. 31 of 38 supervisors use the assistant every week, because it was trained on how they report.\n\nWorth 15 minutes next week? I’m in Boston, and Montreal is a short flight if it ever makes sense.\n\nBest,' + SIG },
  'Helena Strand': { to: 'hstrand@piedmontmetalworks.com', asunto: 'Piedmont Metalworks / Pablo Gonzalez', cuerpo: 'Hi Helena,\n\nYour post last week about supervisors drowning in reports is the exact problem I worked on from July to October at a 200-person metal-parts plant in Monterrey.\n\nThe line-stop report went from 40 minutes to 6, and 31 of 38 supervisors use the assistant every week. Nobody was trained on the tool; the tool was trained on how each supervisor already reports.\n\nIf that’s useful in North Carolina, 15 minutes next week and I’ll show you what we did, and what I wouldn’t do again.\n\nBest,' + SIG },
};
const WARM = [
  ['Sofía Treviño', 'HBS ’27 · Mexas dinner, Saturday', 'WhatsApp', 'Sofía! Great meeting you Saturday. Here’s the one-pager I promised. Happy to walk your friends through it, and coffee still stands.'],
  ['Marcus Bell', 'Bentley ’21 · alumni panel', 'LinkedIn', 'Marcus, finally sending the one-pager you offered to read. Two minutes of your honest take would mean a lot.'],
  ['Ernesto Salinas', 'HKS · Monterrey', 'WhatsApp', 'Ernesto, saw your panel at HKS. Congrats! Around Cambridge next week? Coffee on me.'],
  ['Felipe Cantú', 'VYNMSA · Monterrey', 'WhatsApp', 'Felipe, how did the Apodaca expansion go? I’m back in December, tacos?'],
  ['Isabel Moreno', 'Client · Monterrey', 'LinkedIn', 'Isabel, a million hours without incidents. Huge. Hope the plant celebrated.'],
  ['Andrés Villarreal', 'MIT · robotics', 'iMessage', 'Andrés! How’s the lab? Lunch at Stata this week?'],
  ['Lena Hartwig', 'MIT · factory data talk', 'LinkedIn', 'Lena, your point about messy factory data stuck with me. Mind if I send you one question?'],
  ['Tomás Aguirre', 'Nearshoring · Mexico', 'LinkedIn', 'Tomás, your nearshoring piece nailed the supplier gap. 15 minutes next time you’re in Boston?'],
];
const ini = n => n.split(' ').map(w => w[0]).slice(0, 2).join('');
function warmList() {
  return `<div class="wl" id="orWarm">${WARM.map((w, i) => `<div class="wl-r" data-wl="${i}"><span class="wl-a">${esc(ini(w[0]))}</span>
    <div class="wl-m"><div class="wl-h"><b>${esc(w[0])}</b><span>${esc(w[1])}</span><em>${esc(w[2])}</em></div><p contenteditable="true" spellcheck="false">${esc(w[3])}</p></div>
    <div class="wl-b"><button class="btn sm pri" type="button" data-wa="send">Send</button><button class="btn sm ghost" type="button" data-wa="skip" aria-label="Skip">✕</button></div></div>`).join('')}</div>`;
}
function wireWarm(el) {
  $$('[data-wl]', el).forEach(r => $$('[data-wa]', r).forEach(b => b.onclick = () => { const w = WARM[+r.dataset.wl];
    r.classList.add(b.dataset.wa === 'send' ? 'sent' : 'skip'); if (b.dataset.wa === 'send') toast('Sent to ' + w[0].split(' ')[0] + ' on ' + w[2] + '.');
    const n = $('#orWarmN'); if (n) n.textContent = $$('.wl-r:not(.sent):not(.skip)', el).length + ' today'; }));
}

/* ── the CRM map: everyone he knows as a graph (people ↔ the places and circles they belong to), searchable ── */
const SF_RE = /san francisco|\bsf\b|bay area|stanford|palo alto/i;
function circles(p) {
  const m = (p.metas || '') + ' ' + (p.contexto || '') + ' ' + (p.seccion || ''), out = [];
  if (SF_RE.test(m)) out.push('San Francisco');
  if (/Mexas|HBS|HKS|Harvard/.test(m)) out.push('Harvard');
  if (/\bMIT\b/.test(m)) out.push('MIT');
  if (/Bentley/.test(m)) out.push('Bentley');
  if (/Ferra|VYNMSA|Monterrey|Apodaca/.test(m)) out.push('Monterrey');
  if (/Ohio|North Carolina|Montreal|US manufacturers|US distributors/.test(m)) out.push('Prospects');
  if (p.tipo === 'Family') out.push('Family');
  if (!out.length) out.push('Boston');
  return out;
}
/* his CRM has about 150 people (Pablo, round 14): the named contacts from the data, plus invented ones to reach that size */
const CRM_TOTAL = 150;
const FIRST = ['Ana', 'Luis', 'Sara', 'Diego', 'Emma', 'Mateo', 'Lucía', 'Noah', 'Valeria', 'Ethan', 'Camila', 'Leo', 'Sofia', 'Owen', 'Mia', 'Jacob', 'Elena', 'Ryan', 'Paula', 'Adam', 'Julia', 'Marco', 'Nora', 'Tomás', 'Grace', 'Iván', 'Chloe', 'Pedro', 'Isla', 'Hugo', 'Ava', 'Rafael', 'Zoe', 'Bruno', 'Lily', 'Andrés', 'Ella', 'Simón', 'Ruby', 'Max'];
const LAST = ['Reyes', 'Kim', 'Patel', 'Garza', 'Nguyen', 'Silva', 'Cohen', 'Ruiz', 'Walsh', 'Ortiz', 'Brooks', 'Lopez', 'Moore', 'Treviño', 'Park', 'Shah', 'Rossi', 'Haddad', 'Diaz', 'Bauer'];
const MIX = [['Bentley', 'Classmate at Bentley', 42], ['Boston', 'Met in Boston', 22], ['Harvard', 'Met at a Harvard event', 18], ['MIT', 'Met at an MIT event', 14], ['Monterrey', 'From Monterrey', 22], ['Ohio · prospect', 'A prospect from his cold outreach', 10], ['San Francisco', 'Lives in San Francisco', 6], ['Bentley · Monterrey', 'Bentley classmate from Monterrey', 8], ['Harvard · Monterrey', 'Mexican at Harvard', 8]];
let PEOPLE = null;
function people() {
  const G = window.__gente || []; if (!G.length) return [];
  if (PEOPLE && PEOPLE.base === G.length) return PEOPLE.list;
  const out = G.slice(), have = new Set(G.map(x => x.nombre)); let k = 0, seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pool = MIX.flatMap(([m, c, n]) => Array(n).fill([m, c]));
  while (out.length < CRM_TOTAL && k < 2000) { const [m, c] = pool[Math.floor(rnd() * pool.length)]; const nm = FIRST[Math.floor(rnd() * FIRST.length)] + ' ' + LAST[Math.floor(rnd() * LAST.length)]; k++;
    if (have.has(nm)) continue; have.add(nm); out.push({ nombre: nm, tipo: 'Contact', metas: m, contexto: c + ' (invented for the demo).', extra: true }); }
  PEOPLE = { base: G.length, list: out }; return out;
}
let LAYOUT = null;
function graph(q) {
  const G = people(); if (!G.length) return '';
  const W = 1400, H = 820;
  if (!LAYOUT || LAYOUT.n !== G.length) LAYOUT = { n: G.length, ...layout(G, W, H) };
  const { nodes, links, hubs } = LAYOUT;
  return draw(G, nodes, links, hubs, q, W, H);
}
function layout(G, W, H) {
  const hubs = {}, nodes = [], links = [];
  G.forEach(p => { const n = { id: p.nombre, p, x: 0, y: 0, vx: 0, vy: 0, r: 5, extra: !!p.extra }; nodes.push(n);
    circles(p).forEach(c => { if (!hubs[c]) { hubs[c] = { id: c, hub: true, x: 0, y: 0, vx: 0, vy: 0, r: 9 }; nodes.push(hubs[c]); } links.push([n, hubs[c]]); }); });
  /* a fixed seed, so the map looks the same on every visit */
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  nodes.forEach(n => { n.x = W / 2 + (rnd() - .5) * W * .8; n.y = H / 2 + (rnd() - .5) * H * .8; });
  for (let it = 0; it < 220; it++) {
    const a = .9 * (1 - it / 220) + .05;
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) { const A = nodes[i], Bn = nodes[j]; let dx = A.x - Bn.x, dy = A.y - Bn.y, d2 = dx * dx + dy * dy || .01; const f = (A.hub && Bn.hub ? 26000 : A.hub || Bn.hub ? 2400 : 700) / d2; const d = Math.sqrt(d2); A.vx += dx / d * f; A.vy += dy / d * f; Bn.vx -= dx / d * f; Bn.vy -= dy / d * f; }
    links.forEach(([A, Bn]) => { const dx = Bn.x - A.x, dy = Bn.y - A.y, d = Math.sqrt(dx * dx + dy * dy) || 1, f = (d - (A.extra ? 70 : 90)) * .06; A.vx += dx / d * f; A.vy += dy / d * f; Bn.vx -= dx / d * f * .4; Bn.vy -= dy / d * f * .4; });
    nodes.forEach(n => { n.vx += (W / 2 - n.x) * .004; n.vy += (H / 2 - n.y) * .006; n.x += n.vx * a; n.y += n.vy * a; n.vx *= .55; n.vy *= .55; n.x = Math.max(30, Math.min(W - 30, n.x)); n.y = Math.max(24, Math.min(H - 24, n.y)); });
  }
  return { nodes, links, hubs };
}
function draw(G, nodes, links, hubs, q, W, H) {
  const ql = (q || '').trim().toLowerCase();
  const hit = n => !ql || (n.hub ? n.id.toLowerCase().includes(ql) : (n.p.nombre + ' ' + n.p.metas + ' ' + n.p.contexto + ' ' + (n.p.seccion || '') + ' ' + circles(n.p).join(' ')).toLowerCase().includes(ql));
  const H1 = new Set(nodes.filter(hit).map(n => n.id)); const nHit = nodes.filter(n => !n.hub && H1.has(n.id)).length;
  const L = links.map(([A, Bn]) => `<line x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${Bn.x.toFixed(1)}" y2="${Bn.y.toFixed(1)}" class="${ql && H1.has(A.id) && H1.has(Bn.id) ? 'on' : ql ? 'off' : ''}"/>`).join('');
  const N = nodes.map(n => { const on = ql && H1.has(n.id), off = ql && !on;
    return `<g class="gn${n.hub ? ' hub' : ''}${n.extra ? ' ex' : ''}${on ? ' on' : ''}${off ? ' off' : ''}" data-gn="${esc(n.id)}" transform="translate(${n.x.toFixed(1)},${n.y.toFixed(1)})"><circle r="${n.hub ? 11 : n.extra ? 3.6 : 5.5}"/><text y="${n.hub ? -16 : -10}">${esc(n.hub ? n.id : n.id.split(' ')[0])}</text></g>`; }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"><g class="gl">${L}</g>${N}</svg><div class="gr-c">${ql ? `<b>${nHit}</b> ${nHit === 1 ? 'person matches' : 'people match'} “${esc(q)}”` : `<b>${G.length}</b> people · ${Object.keys(hubs).length} circles`}</div>`;
}
function crm(q) {
  return `<section class="card gr" id="orMap"><div class="gr-h"><div><h2 class="sec" style="margin:0">CRM map</h2><span class="mu">Everyone he knows, linked to the places and circles they share</span></div>
    <label class="gr-q"><svg viewBox="0 0 24 24" width="15" height="15"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 20l-4-4" stroke="currentColor" stroke-width="2"/></svg><input id="grQ" class="input" value="${esc(q)}" placeholder="Filter: a city, a school, a name…" autocomplete="off"></label></div>
    <div class="gr-box" id="grBox">${graph(q)}</div><div class="or-node" id="orNode">Tap a person to see who they are.</div></section>`;
}
function wireCrm(el, app) {
  const i = $('#grQ', el); if (!i) return;
  const draw = () => { app.q = i.value; $('#grBox', el).innerHTML = graph(i.value); wireNodes(); };
  const wireNodes = () => $$('[data-gn]', el).forEach(g => g.onclick = () => { const p = people().find(x => x.nombre === g.dataset.gn), box = $('#orNode', el);
    if (!box) return; if (!p) { i.value = g.dataset.gn; draw(); return; }
    box.innerHTML = `<b>${esc(p.nombre)}</b> · <span class="mu">${esc(strip(p.metas))}</span><br>${esc(strip(p.contexto).slice(0, 240))}`; box.classList.add('on'); });
  i.oninput = draw; wireNodes();
}

export const OUTREACH_APP = {
  q: 'San Francisco',
  kind: 'cold',
  async mount(el, o) { this.el = el; if (o && o.kind) this.kind = o.kind; this.draw();
    api('/api/v3/correo', { timeout: 25000 }).then(r => { SENT = (r.mensajes || []).filter(m => m.mio).sort((a, b) => a.fecha.localeCompare(b.fecha)); if (!this.touched) this.draw(); }).catch(() => { SENT = []; }); on('data', () => { if (this.el && !this.touched) this.draw(); });   /* never wipe a message he is editing */ if (!listas) api('/api/v3/correo/cuentas', { timeout: 25000 }).then(r => { listas = r.listas || []; this.draw(); }).catch(() => { listas = []; }); },
  show(el, o) { if (o && o.kind) this.kind = o.kind; this.draw(); },
  draw() {
    const el = this.el; const L = lote(); const cold = L.todos.filter(p => p.kind !== 'warm'), warm = L.todos.filter(p => p.kind === 'warm');
    cold.forEach(p => { const d = COLD[p.nombre]; if (d) { p.to = d.to; p.asunto = d.asunto; p.cuerpo = d.cuerpo; p.canal = 'email'; p.cuenta = 'bentley'; p.porCuenta = 'school address'; } });
    const col = (k, rows, off) => `<section class="or-col"><div class="or-col-h"><h2 class="sec">${k === 'cold' ? 'Cold outreach' : 'Warm outreach'}</h2><span class="or-n"${k === 'warm' ? ' id="orWarmN"' : ''}>${k === 'warm' ? WARM.length : rows.length} today</span></div>
      <div class="card or-why-box"><div class="kick ac">Status</div><p>${WHY[k]}</p></div>
      ${k === 'warm' ? warmList() : `<div class="or-list">${rows.map((p, i) => card(p, off + i)).join('') || `<div class="card"><p class="mu">Nobody ${k} to write to today.</p></div>`}</div>`}</section>`;
    el.innerHTML = `<div class="wrap wide">
      <div class="topbar"><div><h1 class="page">Outreach</h1><p class="sub" style="margin-top:6px">Today: <b>${cold.length + WARM.length}</b> messages, each already drafted — read it, change it, send it.</p></div></div>
      <div class="or-split">${col('cold', cold, 0)}${col('warm', warm, cold.length)}</div>${crm(this.q)}</div>`;
    cold.forEach((p, i) => wire(this, p, $(`[data-or="${i}"]`, el))); wireWarm(el); wireCrm(el, this);
  },
};
/* the warm map: Pablo in the middle, everyone he has met grouped by where; amber = due a follow-up */
function mapa(warm) {
  const G = (window.__gente || []).filter(p => /^(Warm|New|Mentor|Client)$/.test(p.tipo));
  if (!G.length) return '';
  const where = p => { const m = p.metas + ' ' + p.contexto; return /Mexas|HBS|HKS|Harvard/.test(m) ? 'Harvard' : /\bMIT\b/.test(m) ? 'MIT' : /Bentley/.test(m) ? 'Bentley' : /Ferra|VYNMSA|Monterrey|Apodaca/.test(m) ? 'Monterrey' : 'Boston'; };
  const groups = {}; G.forEach(p => (groups[where(p)] = groups[where(p)] || []).push(p));
  const due = new Set(warm.map(p => p.nombre)); G.filter(p => p.tipo === 'New').forEach(p => due.add(p.nombre));
  const order = ['Harvard', 'MIT', 'Bentley', 'Boston', 'Monterrey'].filter(g => groups[g]);
  const nDue = G.filter(p => due.has(p.nombre)).length;
  return `<div class="card or-map" id="orMap"><div class="or-map-h"><span class="or-map-t"><b>${G.length}</b> people he has met · <b class="due">${nDue}</b> due a follow-up this week</span><span class="mp-leg"><i class="due"></i>due · <i></i>in touch</span></div>
    <div class="mp-grid">${order.map(g => { const ps = groups[g].slice().sort((a, b) => due.has(b.nombre) - due.has(a.nombre)), nd = ps.filter(p => due.has(p.nombre)).length;
      return `<div class="mp-box${nd ? ' hot' : ''}"><div class="mp-bh"><b>${esc(g)}</b><span>${ps.length}${nd ? ` · <em>${nd} due</em>` : ''}</span></div><div class="mp-ppl">${ps.map(p => `<button type="button" class="mp-p${due.has(p.nombre) ? ' due' : ''}" data-node="${esc(p.nombre)}"><i></i>${esc(p.nombre.split(' ')[0])}</button>`).join('')}</div></div>`; }).join('')}</div>
    <div class="or-node" id="orNode">Tap a person to see who they are.</div></div>`;
}

function card(p, i) {
  const k = { reply: ['Replied', 'ac'], fup: ['Follow-up', ''], cold: ['Cold', ''], warm: ['Warm', 'warm'] }[p.kind];
  const ready = listas && listas.includes(p.cuenta);
  return `<article class="card or-card" data-or="${i}">
    <div class="or-head"><span class="or-k ${k[1]}">${k[0]}</span><h3>${esc(p.nombre)}</h3>${p.li ? `<a class="btn sm ghost" href="${esc(p.li)}" target="_blank" rel="noopener">LinkedIn ↗</a>` : ''}</div>
    ${p.quien ? `<p class="or-who">${esc(p.quien)}</p>` : ''}
    ${p.porque ? `<p class="or-why"><b>Why:</b> ${esc(p.porque)}</p>` : ''}
    ${p.canal === 'email' ? `<div class="or-fields"><label>From <span class="or-hint">· ${esc(p.porCuenta)}</span><select class="input" data-f="cuenta">${CUENTAS.map(c => `<option value="${c[0]}"${c[0] === p.cuenta ? ' selected' : ''}>${esc(c[1])} inbox</option>`).join('')}</select></label>
      <label>To<input class="input" data-f="to" value="${esc(p.to)}"></label><label class="wide">Subject<input class="input" data-f="asunto" value="${esc(p.asunto)}"></label></div>` : `<p class="or-chan">Send on ${p.canal === 'whatsapp' ? 'WhatsApp' : 'LinkedIn'} — copy the message, then open their profile.</p>`}
    <textarea class="input or-body" data-f="cuerpo" rows="${Math.max(4, (p.cuerpo.match(/\n/g) || []).length + 2)}">${esc(p.cuerpo)}</textarea>
    <div class="or-acts">
      ${p.canal === 'email' ? `<button class="btn pri" type="button" data-a="send">${ready ? 'Send' : 'Send…'}</button>` : `<button class="btn pri" type="button" data-a="copy">Copy and open ${p.canal === 'whatsapp' ? 'WhatsApp' : 'LinkedIn'}</button>`}
      <button class="btn" type="button" data-a="done">I sent it ✓</button>
      <button class="btn ghost" type="button" data-a="no">Not this one</button>
    </div></article>`;
}

function wire(app, p, box) {
  if (!box) return; const t0 = Date.now(); const orig = p.cuerpo; box.addEventListener('input', () => { app.touched = true; });
  const val = f => { const x = $(`[data-f="${f}"]`, box); return x ? x.value : ''; };
  $$('[data-a]', box).forEach(b => b.onclick = async () => {
    const a = b.dataset.a;
    if (a === 'copy') { try { await navigator.clipboard.writeText(val('cuerpo')); toast('Message copied.'); } catch (_) { toast("Couldn't copy — select the text and copy it.", true); } if (p.li) window.open(p.li, '_blank', 'noopener'); return; }
    if (a === 'send') return enviar(app, p, box, { cuenta: val('cuenta'), to: val('to').trim(), asunto: val('asunto'), cuerpo: val('cuerpo') }, t0, orig);
    if (a === 'done') return decidir(app, p, box, 'x', '', t0, val('cuerpo') !== orig);
    if (a === 'no') {
      openSheet({ kick: p.nombre, title: 'Why not this one?', html: `<p class="mu" style="margin-bottom:10px">One line — the agent learns from it.</p><textarea class="input" id="orWhy" rows="3" placeholder="e.g. not relevant to my focus right now"></textarea>`, foot: `<button class="btn ghost" type="button" id="orC">Cancel</button><button class="btn pri" type="button" id="orOk">Drop them</button>` });
      $('#orC').onclick = closeSheet; $('#orOk').onclick = () => { const w = $('#orWhy').value.trim(); if (!w) { toast('Write the reason first.', true); return; } closeSheet(); decidir(app, p, box, '-', w, t0, false); };
    }
  });
}

async function enviar(app, p, box, m, t0, orig) {
  if (!m.to) { toast('Who is it to?', true); return; }
  const c = CUENTAS.find(x => x[0] === m.cuenta) || CUENTAS[1];
  if (!(listas && listas.includes(m.cuenta))) {
    window.open(composeUrl(m.cuenta, m.to, m.asunto, m.cuerpo), '_blank', 'noopener');
    toast('Opened in ' + c[1] + ' with everything written — press Send there, then tap “I sent it”.'); return;
  }
  openSheet({ kick: 'Send', title: 'Send to ' + p.nombre + '?', html: `<p>From <b>${esc(c[2])}</b> to <b>${esc(m.to)}</b></p><p class="mu" style="margin-top:6px">${esc(m.asunto)}</p><div class="or-preview">${esc(m.cuerpo)}</div>`, foot: `<button class="btn ghost" type="button" id="sC">Cancel</button><button class="btn pri" type="button" id="sOk">Send now</button>` });
  $('#sC').onclick = closeSheet;
  $('#sOk').onclick = async () => {
    const b = $('#sOk'); b.disabled = true; b.textContent = 'Sending…';
    const r = await api('/api/v3/correo/enviar', { body: { cuenta: m.cuenta, para: m.to, asunto: m.asunto, cuerpo: m.cuerpo, confirmado: true }, timeout: 70000 }).catch(e => e);
    closeSheet();
    if (r && r.ok) { toast('Sent from ' + r.desde + '.'); decidir(app, p, box, 'x', '', t0, m.cuerpo !== orig, true); return; }
    const err = (r && r.body && r.body.error) || (r && r.message) || 'Mail could not send it.';
    if (r && r.body && r.body.conectar) { listas = (listas || []).filter(x => x !== m.cuenta); window.open(composeUrl(m.cuenta, m.to, m.asunto, m.cuerpo), '_blank', 'noopener'); toast(err + ' Opened it in your inbox instead.', true); }
    else toast(err, true);
  };
}

/* the run's own save: [x] = sent, [-] = not this one (with why). 5 seconds to undo before it is written. */
function decidir(app, p, box, marca, motivo, t0, editado, enviado) {
  box.classList.add('leaving');
  let undone = false;
  const tt = document.createElement('div'); tt.className = 'toast on or-undo'; tt.innerHTML = `${marca === 'x' ? (enviado ? 'Sent' : 'Marked sent') : 'Dropped'} · ${esc(p.nombre)} <button type="button">Undo</button>`;
  document.body.appendChild(tt);
  $('button', tt).onclick = () => { undone = true; box.classList.remove('leaving'); tt.remove(); };
  setTimeout(async () => {
    tt.remove(); if (undone) return;
    const r = await api('/api/marcar', { body: { trabajo: p.trabajo, linea: p.linea, crudo: p.crudo, marca, decision_id: 'v3o.' + Date.now().toString(36), ms: Date.now() - t0, editado: !!editado, motivo } }).catch(e => e);
    if (r instanceof Error) { box.classList.remove('leaving'); toast("Couldn't save it: " + r.message, true); return; }
    if (marca === 'x') anotar(p.id);
    try { ST.D = await api('/api/datos'); } catch (_) { }
    runCmd('refresh'); app.touched = false; app.draw();
    if (marca === 'x' && lote().hoy.length === 0) toast("That's today's outreach. Done.");
  }, 5000);
}

function conectar() {
  openSheet({ kick: 'Send from Exo', title: 'Connect your inboxes', html: `<div class="prose">
    <p>Exo sends through <b>Apple Mail</b> on this Mac, with your own sign-in — no password is stored in Exo.</p>
    <ol><li>Open <b>System Settings → Internet Accounts → Add Account</b>.</li>
    <li><b>Google</b> for pablo@gmail.example and pablo.rd@gmail.example.</li>
    <li><b>Microsoft Exchange</b> for pablo@vynmsa.example, your Bentley address and pablo@mit.example.</li>
    <li>Turn on <b>Mail</b> for each. The first time you press Send, your Mac asks to let Exo use Mail — say <b>OK</b>.</li></ol>
    <p>Signed in now: <b>${listas && listas.length ? listas.map(k => (CUENTAS.find(c => c[0] === k) || [])[1]).join(', ') : 'none yet'}</b>. Until an inbox is connected, Send opens that inbox with the message written.</p></div>`,
    foot: `<button class="btn" type="button" id="cnR">Check again</button><button class="btn pri" type="button" id="cnOk">Done</button>` });
  $('#cnOk').onclick = closeSheet;
  $('#cnR').onclick = async () => { listas = (await api('/api/v3/correo/cuentas', { timeout: 25000 }).catch(() => ({ listas: [] }))).listas; closeSheet(); OUTREACH_APP.draw(); toast((listas.length || 'No') + ' inbox' + (listas.length === 1 ? '' : 'es') + ' can send from Exo.'); };
}
