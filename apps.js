/* Exo v3 — the apps inside it (2026-11-01). Each one reads the copies the agents already keep
   (5 Sistema/canales/, the CRM, the preps) through v3api.py; nothing here writes into the brain except closing
   a Todoist task (the run's own route) and, once he signs in, sending mail. */

import { $, $$, esc, ico, api, md, NOW, iso, hm, relDay, inMin, dur, toast, openSheet, closeSheet, openNote, askClaude, go, ST, runCmd } from './app.js';

export const APPS = {};
export function montarApp(view, el, opts) { const a = APPS[view]; if (!a) { el.innerHTML = '<div class="wrap"><p class="mu">Coming soon.</p></div>'; return; } a.mount(el, opts || {}); }
const head = (title, sub = '', right = '') => `<div class="topbar"><div><h1 class="page">${esc(title)}</h1>${sub ? `<p class="sub" style="margin-top:6px">${sub}</p>` : ''}</div>${right}</div>`;
const skel = n => Array.from({ length: n }, (_, i) => `<div style="padding:12px"><div class="skel" style="width:${50 + (i * 17) % 40}%"></div><div class="skel" style="margin-top:8px;width:${70 + (i * 13) % 25}%"></div></div>`).join('');
const short = d => { const t = iso(NOW()); if (d.slice(0, 10) === t) return d.slice(11, 16); const r = relDay(d.slice(0, 10)); return r === 'Yesterday' ? 'Yest.' : new Date(d.slice(0, 10) + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
function master(el, { list, pane, empty }) {
  el.innerHTML = `<div class="md" id="md"><div class="glass list" id="mdList">${list}</div><div class="glass pane" id="mdPane">${pane || `<div class="empty-pane"><span class="serif">${empty || 'Pick one on the left.'}</span></div>`}</div></div>`;
  return { listEl: $('#mdList', el), paneEl: $('#mdPane', el), mdEl: $('#md', el) };
}
const backBtn = () => `<button class="btn sm ghost back" type="button" data-back>${ico('back')} Back</button>`;
function wireBack(root) { $$('[data-back]', root).forEach(b => b.onclick = () => root.querySelector('.md').classList.remove('open')); }

/* ── Meeting prep ─────────────────────────────────────────────────────────── */
APPS.prep = {
  async mount(el, opts) { this.el = el; el.innerHTML = `<div class="wrap">${head('Meeting prep', 'Who they are and the one thing to ask — for every meeting from yesterday to the next ten days.')}<div id="prepBox">${skel(3)}</div></div>`; await this.load(); this.show(el, opts); },
  async load() { const r = await api('/api/v3/preps').catch(() => ({ preps: [] })); this.preps = r.preps; },
  show(el, opts = {}) {
    const box = $('#prepBox', el); if (!box) return;
    const P = this.preps || []; const td = iso(NOW());
    if (!P.length) { box.innerHTML = '<div class="card"><p class="serif" style="font-size:24px">No meetings to prep.</p><p class="mu" style="margin-top:6px">The prep agent writes one for each meeting with someone, every morning.</p></div>'; return; }
    const sel = (opts.nota && P.find(p => p.nota === opts.nota)) || P.find(p => p.cuando.slice(0, 10) >= td && (inMin(p.cuando.slice(0, 10), p.cuando.slice(11, 16)) ?? 0) > -90) || P[P.length - 1];
    const listHtml = P.map(p => { const d = p.cuando.slice(0, 10), h = p.cuando.slice(11, 16), past = d < td || (d === td && (inMin(d, h) ?? 0) < -90);
      return `<button type="button" role="option" data-n="${esc(p.nota)}" aria-selected="${p === sel}" class="item${past ? ' pv-past' : ''}"><div class="l1"><b>${esc(p.evento.replace(/\s+-\s+.*$/, ''))}</b><time>${past ? '<span class="pv-done">✓ Happened</span> ' : ''}${esc(relDay(d))} ${esc(hm(h))}</time></div><div class="l3">${esc(p.texto.replace(/\[\[[^\]]*\]\]/g, '').replace(/[*_`#]/g, '').slice(0, 140))}</div></button>`; }).join('');
    const { paneEl, mdEl } = master(box, { list: listHtml });
    const showP = p => {
      $$('.item', box).forEach(b => b.setAttribute('aria-selected', b.dataset.n === p.nota));
      const d = p.cuando.slice(0, 10), h = p.cuando.slice(11, 16), m = inMin(d, h);
      const ask = (p.texto.match(/(Ask (?:him|her|them)[^.]*[.?])/i) || [])[1];
      paneEl.innerHTML = `${backBtn()}<div class="kick ac">${esc(relDay(d))} · ${esc(hm(h))}${m != null && m > 0 && m < 1440 ? ' · ' + esc(dur(m)) : ''}${p.nivel ? ' · ' + esc(p.nivel.replace(/-/g, ' ')) : ''}</div>
        <h2 class="sec" style="margin:8px 0 6px">${esc(p.evento)}</h2><p class="mu">${esc([p.donde, p.con].filter(Boolean).join(' · '))}</p>
        ${ask ? `<div class="card hot" style="margin:18px 0;font-size:15.5px;line-height:1.5"><div class="kick ac" style="margin-bottom:6px">Ask</div>${esc(ask.replace(/^Ask (him|her|them)\s*/i, '').replace(/^./, c => c.toUpperCase()))}</div>` : ''}
        <div class="prose">${md(p.texto)}</div>
        <div style="display:flex;gap:8px;margin-top:22px;flex-wrap:wrap"><a class="btn" href="${esc(p.linkedin || 'https://www.linkedin.com/search/results/people/?keywords=' + encodeURIComponent(p.evento.split(/\s+[—(·-]\s*/)[0]))}" target="_blank" rel="noopener">${ico('in')} LinkedIn</a><button class="btn" type="button" data-open>${ico('notes')} Full note</button><button class="btn" type="button" data-deeper>${ico('spark')} Go deeper with Claude</button></div>`;
      $('[data-open]', paneEl).onclick = () => openNote(p.nota);
      $('[data-deeper]', paneEl).onclick = () => deeper(p);
      mdEl.classList.add('open'); wireBack(box);
    };
    $$('.item', box).forEach(b => b.onclick = () => showP(P.find(p => p.nota === b.dataset.n)));
    showP(sel); if (innerWidth <= 900 && !opts.nota) mdEl.classList.remove('open');
  }
};
async function deeper(p) {
  openSheet({ kick: 'Prep · Claude on your Mac', title: p.evento.replace(/\s+-\s+.*$/, ''), html: '<div class="typing"><i></i><i></i><i></i></div> <span class="mu">Reading your brain on them…</span>' });
  const r = await askClaude(`I'm meeting "${p.evento}" (${p.cuando}, ${p.donde}). My prep note is "${p.nota}". Read it and anything in my brain about them (CRM, past meetings). Give me in under 150 words: who they are to me, the one thing I want from this meeting, two sharp questions, and one thing to avoid. Plain English.`).catch(e => ({ texto: e.message }));
  $('#shBody').innerHTML = `<div class="prose">${md(r.texto)}</div>`;
}

/* ── Calendar ─────────────────────────────────────────────────────────────── */
const CALC = { 'Bentley': '#A9C1F5', 'Vocación': '#E3ECFF', 'Vida personal': '#7F95C2', 'Social': '#C9B8F2', 'VYNMSA': '#9FD3E6', 'Trabajo': '#9FD3E6' };
/* Your day — calendar and tasks together (2026-11-01). Pablo: "full calendar of today on the left and p1 on the right.
   then have a small space for one stratega recomendation of how to priorizitze or make the most out of my time that day."
   Left: the day as a timeline (every calendar). Right: priority-1 tasks (tick closes in Todoist), the rest one tap away,
   and one Estratega line for the day (claude on the Mac, cached per day — /api/v3/dia). */
const HH = 54, H0 = 6, H1 = 24;
APPS.cal = {
  day: null, all: false,
  async mount(el) {
    el.innerHTML = `<div class="wrap wide">${head('Your day', 'Your calendar and what only you can do — together. An event is a candidate, not a commitment.', '<div class="chips" id="dpDays"></div>')}
      <div class="dp-grid"><div class="glass dp-cal" id="dpCal">${skel(6)}</div><div class="dp-side"><div class="card dp-tip" id="dpTip"></div><div class="card" id="dpTasks">${skel(4)}</div></div></div></div>`;
    const [a, t] = await Promise.all([api('/api/v3/agenda?dias=8').catch(() => null), ST.tareas ? Promise.resolve(ST.tareas) : api('/api/v3/tareas').catch(() => null)]);
    this.data = a; this.tasks = t; this.day = iso(NOW()); this.draw(el);
  },
  show(el) { if (ST.tareas) this.tasks = ST.tareas; this.draw(el); },
  draw(el) {
    this.el = el; const r = this.data; const td = iso(NOW());
    const days = r ? r.dias.filter(d => d.dia >= td).slice(0, 7) : [];
    $('#dpDays', el).innerHTML = days.map(d => `<button class="chip" type="button" data-d="${d.dia}" aria-pressed="${d.dia === this.day}">${esc(d.dia === td ? 'Today' : relDay(d.dia) === 'Tomorrow' ? 'Tomorrow' : new Date(d.dia + 'T12:00').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }))}</button>`).join('');
    $$('#dpDays [data-d]', el).forEach(b => b.onclick = () => { this.day = b.dataset.d; this.draw(el); });
    const dd = days.find(d => d.dia === this.day) || { dia: this.day, eventos: [] };
    this.timeline(el, dd);
    /* the day's load, as the old panel said it (2026-11-01): blocks, free hours between 8:00 and 22:00, P1 tasks */
    const timed = dd.eventos.filter(e => !e.todo && e.inicio);
    const iv = timed.map(e => { const [h, m] = e.inicio.split(':').map(Number), [h2, m2] = (e.fin || e.inicio).split(':').map(Number); return [Math.max(8 * 60, h * 60 + m), Math.min(22 * 60, h2 * 60 + m2)]; }).filter(([a, z]) => z > a).sort((x, y) => x[0] - y[0]);
    let mins = 0, cur = null; iv.forEach(([a, z]) => { if (!cur || a > cur[1]) { if (cur) mins += cur[1] - cur[0]; cur = [a, z]; } else cur[1] = Math.max(cur[1], z); }); if (cur) mins += cur[1] - cur[0];   /* overlaps counted once */
    const free = Math.max(0, (14 * 60 - mins) / 60), p1n = this.tasks ? this.tasks.tareas.filter(t => t.prioridad === 'p1').length : 0;
    const sub = $('.topbar .sub', el); if (sub) sub.textContent = `${timed.length} blocks · about ${free.toFixed(free < 10 ? 1 : 0)} free hours between 8 and 10 pm · ${p1n} priority-1 task${p1n === 1 ? '' : 's'}`;
    this.tareas(el); this.tip(el);
  },
  timeline(el, d) {
    const box = $('#dpCal', el); const td = iso(NOW());
    const allday = d.eventos.filter(e => e.todo || !e.inicio);
    const timed = d.eventos.filter(e => !e.todo && e.inicio).map(e => { const [h, m] = e.inicio.split(':').map(Number); const [h2, m2] = (e.fin || '').split(':').map(Number);
      const a = h + m / 60, b = e.fin ? Math.max(a + 0.4, h2 + m2 / 60 + (h2 < h ? 24 : 0)) : a + 0.5; return Object.assign({ a, b }, e); }).sort((x, y) => x.a - y.a || y.b - x.b);
    // side-by-side columns for overlaps
    const cols = []; let group = [], gEnd = -1; const flush = () => { const n = Math.max(...group.map(g => g.col + 1), 1); group.forEach(g => g.n = n); group = []; };
    timed.forEach(e => { if (e.a >= gEnd && group.length) { flush(); cols.length = 0; } let c = cols.findIndex(end => end <= e.a); if (c < 0) { c = cols.length; cols.push(0); } cols[c] = e.b; e.col = c; group.push(e); gEnd = Math.max(gEnd, e.b); });
    if (group.length) flush();
    const lo = Math.min(H0, ...timed.map(e => Math.floor(e.a))), hi = Math.max(22, ...timed.map(e => Math.ceil(e.b)));
    const now = NOW(), nh = now.getHours() + now.getMinutes() / 60;
    box.innerHTML = `${allday.length ? `<div class="dp-allday"><span class="kick">All day</span>${allday.map(e => `<span class="dp-ad" style="--c:${CALC[e.cal] || '#8D97AA'}">${esc(e.titulo)}</span>`).join('')}</div>` : ''}
      <div class="dp-tl" style="height:${(hi - lo) * HH}px">
        ${Array.from({ length: hi - lo }, (_, i) => `<div class="dp-h" style="top:${i * HH}px"><span>${hm(pad2(lo + i) + ':00').replace(':00', '')}</span></div>`).join('')}
        ${timed.map(e => { const past = d.dia < td || (d.dia === td && e.b < nh), routine = /^(bañarme|shuttle|comer|desayuno|cena|cenar|dormir|gym|misa)/i.test(e.titulo);
          return `<div class="dp-ev${past ? ' past' : ''}${routine ? ' routine' : ''}" style="--c:${CALC[e.cal] || '#8D97AA'};top:${(e.a - lo) * HH + 1}px;height:${Math.max(22, (e.b - e.a) * HH - 3)}px;left:calc(56px + (100% - 62px) * ${e.col / e.n});width:calc((100% - 62px) / ${e.n} - 4px)" title="${esc(e.titulo + ' · ' + e.cal)}">
            <b>${esc(e.titulo.replace(/ with (Mr|Ms|Prof)\.\s?\w+$/, ''))}</b><span>${esc(hm(e.inicio))}${e.fin ? '–' + esc(hm(e.fin)) : ''} · ${esc(e.cal)}${e.lugar ? ' · ' + esc(e.lugar.split(',')[0]) : ''}</span></div>`; }).join('')}
        ${d.dia === td && nh >= lo && nh <= hi ? `<div class="dp-now" style="top:${(nh - lo) * HH}px"><i></i></div>` : ''}
      </div>`;
    if (d.dia === td) { const y = Math.max(0, (nh - lo - 1) * HH); requestAnimationFrame(() => { box.scrollTop = y; }); }
  },
  tareas(el) {
    const box = $('#dpTasks', el); const r = this.tasks; if (!r) { box.innerHTML = '<p class="mu">No task copy yet.</p>'; return; }
    const td = iso(NOW()), p1 = r.tareas.filter(t => t.prioridad === 'p1'), rest = r.tareas.filter(t => t.prioridad !== 'p1');
    const row = t => `<div class="task" data-id="${esc(t.id)}"><button class="ck ${t.prioridad}" type="button" aria-label="Close: ${esc(t.titulo)}">${ico('check')}</button><div><div class="t">${esc(t.titulo)}</div><div class="n">${t.vence ? `<span class="${t.vence < td ? 'ac' : ''}">${t.vence < td ? 'overdue · ' : 'due '}${esc(relDay(t.vence))}</span> · ` : ''}${esc(t.proyecto)}${t.nota ? ' · ' + esc(t.nota) : ''}</div></div></div>`;
    const by = {}; rest.forEach(t => (by[t.proyecto] = by[t.proyecto] || []).push(t));
    box.innerHTML = `<div class="kick ac" style="margin-bottom:4px">Priority 1 · ${p1.length}</div><div class="row-list">${p1.map(row).join('') || '<p class="mu" style="padding:8px 0">No priority-1 tasks.</p>'}</div>
      <button class="btn sm ghost" type="button" id="dpAll" style="margin-top:8px">${this.all ? 'Hide' : 'Show'} the other ${rest.length} tasks ${this.all ? '▾' : '▸'}</button>
      ${this.all ? Object.entries(by).map(([p, ts]) => `<div class="kick" style="margin:14px 0 2px">${esc(p)} · ${ts.length}</div><div class="row-list">${ts.map(row).join('')}</div>`).join('') : ''}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px"><span class="mu" style="font-size:11.5px">Copy from ${esc(r.generado || 'the morning run')}</span><a class="btn sm ghost" href="https://app.todoist.com/app/today" target="_blank" rel="noopener">${ico('ext')} Todoist</a></div>`;
    $('#dpAll', box).onclick = () => { this.all = !this.all; this.tareas(el); };
    $$('.task .ck', box).forEach(b => b.onclick = async () => {
      const rowEl = b.closest('.task'), id = rowEl.dataset.id.replace(/^td-/, ''); const undo = rowEl.classList.contains('done');
      rowEl.classList.toggle('done');
      const res = await api(undo ? '/api/todoist/reabrir' : '/api/todoist/cerrar', { body: { id } }).catch(e => e);
      if (res instanceof Error) { rowEl.classList.toggle('done'); toast(undo ? "Couldn't reopen it in Todoist" : "Couldn't close it in Todoist", true); }
      else toast(undo ? 'Reopened in Todoist.' : 'Closed in Todoist.');
    });
  },
  async tip(el, again) {
    const box = $('#dpTip', el); const day = this.day, td = iso(NOW()); const lbl = day === td ? 'today' : relDay(day).toLowerCase();
    const head2 = `<div class="kick" style="margin-bottom:8px"><span style="color:#B49CFF">Estratega</span> · how to use ${esc(lbl)}</div>`;
    const cached = (this.tips = this.tips || {})[day];
    if (cached && !again) { box.innerHTML = head2 + `<p class="dp-tiptext">${esc(cached)}</p><button class="btn sm ghost" type="button" id="dpAgain" style="margin-top:10px">Ask again</button>`; $('#dpAgain', box).onclick = () => this.tip(el, true); return; }
    if (day !== td && !again) { box.innerHTML = head2 + `<button class="btn sm" type="button" id="dpAsk">Ask the Estratega about ${esc(lbl)}</button>`; $('#dpAsk', box).onclick = () => this.tip(el, true); return; }
    box.innerHTML = head2 + `<p class="mu"><span class="typing"><i></i><i></i><i></i></span> Reading your day…</p>`;
    const due = (ST.D && ST.D.entregas || []).filter(e => e.estado === 'pendiente' && (e.cuando || '').slice(0, 10) >= day && (e.cuando || '').slice(0, 10) <= iso(new Date(new Date(day + 'T12:00').getTime() + 2 * 864e5))).map(e => e.texto.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*/g, '').slice(0, 120));
    const ctx = due.length ? 'Bentley due in the next two days:\n- ' + due.join('\n- ') : '';
    let r = await api(`/api/v3/dia?fecha=${day}${again ? '&otra=1' : ''}&ctx=${encodeURIComponent(ctx)}`).catch(e => ({ estado: 'error', texto: e.message }));
    while (r && r.estado === 'corriendo' && r.id) { await new Promise(ok => setTimeout(ok, 2500)); if (this.day !== day) return; r = await api('/api/v3/claude?id=' + r.id).catch(e => ({ estado: 'error', texto: e.message })); }
    if (this.day !== day) return;
    if (r && r.estado === 'listo') { this.tips[day] = r.texto.trim(); this.tip(el); }
    else box.innerHTML = head2 + `<p class="mu">${esc((r && (r.texto || r.error)) || "Claude couldn't answer on the Mac.")}</p><button class="btn sm ghost" type="button" id="dpAgain" style="margin-top:10px">Try again</button>`, $('#dpAgain', box) && ($('#dpAgain', box).onclick = () => this.tip(el, true));
  }
};
const pad2 = n => String(n % 24).padStart(2, '0');

/* ── Mail ─────────────────────────────────────────────────────────────────── */
/* Five inboxes (personal Gmail, VYNMSA, Bentley, MIT, pablo-rd). Reading comes from the canales copies.
   Sending: Pablo asked for a real Send button (2026-11-01) — it lights up per inbox once he signs it in;
   until then "Send" opens that inbox's own compose window with the text already written. */
const COMPOSE = {
  gmail: (to, su, body) => `https://mail.google.com/mail/?authuser=pablo@gmail.example&view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(su)}&body=${encodeURIComponent(body)}`,
  rd: (to, su, body) => `https://mail.google.com/mail/?authuser=pablo.rd@gmail.example&view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(su)}&body=${encodeURIComponent(body)}`,
  vynmsa: (to, su, body) => `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(su)}&body=${encodeURIComponent(body)}`,
  bentley: (to, su, body) => `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(su)}&body=${encodeURIComponent(body)}`,
  mit: (to, su, body) => `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(su)}&body=${encodeURIComponent(body)}`,
};
/* demo (Pablo, round 6): Messages — mail, LinkedIn, iMessage and Instagram in one list, only what needs him, most urgent
   first; each comes with a reply Exo drafted. The full mail app stays below as APPS.mailFull. */
APPS.mail = {
  async mount(el) {
    el.innerHTML = `<div class="wrap wide">${head('Messages', 'Mail, LinkedIn, iMessage and Instagram in one list — only what needs you, most urgent first.')}<div id="ibBox">${skel(5)}</div></div>`;
    this.data = await api('/api/v3/inbox').catch(() => ({ items: [] })); this.done = this.done || new Set(); this.draw(el);
  },
  show() { },
  draw(el) {
    const box = $('#ibBox', el), I = this.data.items || [];
    const CH = { Mail: 'mail', LinkedIn: 'in', iMessage: 'wa', Instagram: 'people' };
    const row = (m, i) => `<button class="item ib-row${this.done.has(m.id) ? ' ib-done' : ''}" type="button" data-m="${i}"><div class="l1"><b>${esc(m.quien)}</b><span class="ib-ch">${ico(CH[m.canal] || 'mail')}${esc(m.canal)}</span></div><div class="l2">${esc(m.que)}</div></button>`;
    const grp = (k, lbl) => { const xs = I.map((m, i) => [m, i]).filter(([m]) => m.nivel === k); return xs.length ? `<div class="kick ${k === 'urgent' ? 'ib-urg' : ''}" style="padding:12px 12px 6px">${lbl} · ${xs.length}</div>${xs.map(([m, i]) => row(m, i)).join('')}` : ''; };
    const { paneEl } = master(box, { list: grp('urgent', 'Urgent') + grp('important', 'Important') + (this.data.otros ? `<p class="mu" style="padding:14px 12px;font-size:12.5px">${this.data.otros} newsletters and receipts summarized — nothing to do.</p>` : ''), empty: 'Pick a message.' });
    const open = i => { const m = I[i]; $$('[data-m]', box).forEach(x => x.setAttribute('aria-selected', +x.dataset.m === i));
      paneEl.innerHTML = `${backBtn()}<div class="kick ${m.nivel === 'urgent' ? 'ib-urg' : ''}">${esc(m.nivel === 'urgent' ? 'Urgent' : 'Important')} · ${esc(m.canal)} · ${esc(m.cuando)}</div>
        <h2 class="sec" style="margin:8px 0 2px">${esc(m.quien)}</h2><p class="mu">${esc(m.org)} · ${esc(m.porque)}</p>
        <div class="msg" style="margin-top:16px"><div class="body">${esc(m.mensaje)}</div></div>
        <div class="kick ac" style="margin:18px 0 6px">Reply Exo drafted</div><textarea class="input ib-draft" rows="${Math.min(9, (m.borrador.match(/\n/g) || []).length + 3)}">${esc(m.borrador)}</textarea>
        <div style="display:flex;gap:8px;margin-top:12px"><button class="btn pri" type="button" data-ok>${this.done.has(m.id) ? 'Sent ✓' : 'Send the reply'}</button><button class="btn ghost" type="button" data-later>Later</button></div>`;
      $('[data-ok]', paneEl).onclick = () => { this.done.add(m.id); toast('Sent to ' + m.quien + ' on ' + m.canal + '.'); this.draw(el); open(i); };
      $('[data-later]', paneEl).onclick = () => toast('Moved to later.');
      box.querySelector('.md').classList.add('open'); wireBack(box); };
    $$('[data-m]', box).forEach(b => b.onclick = () => open(+b.dataset.m));
    if (innerWidth > 900 && I.length && !paneEl.querySelector('.msg')) open(this.cur || 0);
  }
};
APPS.mailFull = {
  acc: 'all', kind: 'people',
  async mount(el) {
    el.innerHTML = `<div class="wrap wide">${head('Mail', 'People who wrote you, and what you sent — every inbox in one place.', `<div class="seg" id="mailK"><button type="button" data-k="people" aria-pressed="true">People</button><button type="button" data-k="updates" aria-pressed="false">Updates</button></div>`)}<div id="mailBox">${skel(6)}</div></div>`;
    $$('#mailK button', el).forEach(b => b.onclick = () => { this.kind = b.dataset.k; $$('#mailK button', el).forEach(x => x.setAttribute('aria-pressed', x === b)); this.draw(el); });
    this.data = await api('/api/v3/correo').catch(() => null); this.draw(el);
  },
  show(el) { },
  threads() {
    const by = new Map();
    for (const m of this.data.mensajes) { if (this.acc !== 'all' && m.cuenta !== this.acc) continue; const k = m.hilo || m.id; if (!by.has(k)) by.set(k, []); by.get(k).push(m); }
    return [...by.values()].map(ms => ({ ms: ms.sort((a, b) => a.fecha.localeCompare(b.fecha)), last: ms[ms.length - 1] })).sort((a, b) => b.last.fecha.localeCompare(a.last.fecha));
  },
  draw(el) {
    const box = $('#mailBox', el); const D = this.data;
    if (!D) { box.innerHTML = '<div class="card"><p class="mu">Your mail copy is not reachable right now.</p></div>'; return; }
    const counts = {}; D.mensajes.forEach(m => counts[m.cuenta] = (counts[m.cuenta] || 0) + 1);
    const chips = `<div class="list-head"><div class="chips">${[['all', 'All'], ...D.cuentas.map(c => [c.clave, c.nombre])].map(([k, n]) => `<button class="chip" type="button" data-a="${k}" aria-pressed="${this.acc === k}">${esc(n)}${k !== 'all' ? `<span class="badge">${counts[k] || ''}</span>` : ''}</button>`).join('')}</div></div>`;
    if (this.kind === 'updates') {
      const { paneEl } = master(box, { list: chips + D.otros.map((o, i) => `<button class="item" type="button" data-o="${i}"><div class="l1"><b>${esc(o.de.replace(/<.*>/, ''))}</b><time>${esc(short(o.fecha))}</time></div><div class="l2">${esc(o.asunto)}</div><div class="l3">${esc(o.resumen)}</div></button>`).join(''), empty: 'Newsletters, receipts and notices — summarized, no action needed.' });
      $$('[data-o]', box).forEach(b => b.onclick = () => { const o = D.otros[+b.dataset.o]; $$('[data-o]', box).forEach(x => x.setAttribute('aria-selected', x === b)); paneEl.innerHTML = `${backBtn()}<div class="kick">${esc(o.fecha)} · ${esc(o.canal)}</div><h2 class="sec" style="margin:8px 0">${esc(o.asunto)}</h2><p class="mu">${esc(o.de)}</p><p style="margin-top:16px;font-size:15px">${esc(o.resumen)}</p>`; box.querySelector('.md').classList.add('open'); wireBack(box); });
    } else {
      /* demo (Pablo: "I get lost on the mail"): two groups — waiting on you, then the rest — name and subject only */
      const T = this.threads(), wait = T.filter(t => !t.last.mio), rest = T.filter(t => t.last.mio), O = [...wait, ...rest];
      const row = (t, i) => { const them = t.ms.find(m => !m.mio) || t.last; return `<button class="item${!t.last.mio ? ' unread' : ''}" type="button" data-t="${i}"><div class="l1"><b>${esc(them.quien || them.de)}</b><time>${esc(short(t.last.fecha))}</time></div><div class="l2">${esc((t.last.asunto || '(no subject)').replace(/^(re|fw|fwd):\s*/i, ''))}</div></button>`; };
      const { paneEl } = master(box, { list: `<div class="kick ac" style="padding:12px 12px 6px">Waiting on you · ${wait.length}</div>${wait.map((t, i) => row(t, i)).join('') || '<p class="mu" style="padding:8px 12px">Nobody is waiting.</p>'}<div class="kick" style="padding:16px 12px 6px">You answered · ${rest.length}</div>${rest.map((t, i) => row(t, wait.length + i)).join('')}`, empty: 'Pick a conversation.' });
      $$('[data-t]', box).forEach(b => b.onclick = () => { $$('[data-t]', box).forEach(x => x.setAttribute('aria-selected', x === b)); this.thread(O[+b.dataset.t], paneEl, box); });
      if (innerWidth > 900 && wait.length) $('[data-t="0"]', box).click();
    }
    $$('[data-a]', box).forEach(b => b.onclick = () => { this.acc = b.dataset.a; this.draw(el); });
  },
  thread(t, pane, box) {
    const l = t.last, them = t.ms.find(m => !m.mio) || l;
    const acc = (this.data.cuentas.find(c => c.clave === l.cuenta) || {}).nombre || l.cuenta;
    const latest = [...t.ms].reverse().find(m => !m.mio) || l, earlier = t.ms.filter(m => m !== latest);
    const msg = m => `<div class="msg${m.mio ? ' mine' : ''}"><div class="who"><b>${esc(m.mio ? 'You' : m.quien || m.de)}</b><span>${esc(short(m.fecha))}</span></div><div class="body">${esc(m.cuerpo)}</div>${m.adjuntos.length ? `<div class="att">${m.adjuntos.map(a => '📎 ' + esc(a)).join('<br>')}</div>` : ''}</div>`;
    pane.innerHTML = `${backBtn()}<div class="kick">${esc(acc)}${latest.mio ? ' · you answered' : ' · waiting on you'}</div><h2 class="sec" style="margin:8px 0 14px">${esc((l.asunto || '(no subject)').replace(/^(re|fw|fwd):\s*/i, ''))}</h2>
      ${msg(latest)}${earlier.length ? `<details style="margin-top:10px"><summary class="kick" style="cursor:pointer">Earlier in this conversation · ${earlier.length}</summary>${earlier.map(msg).join('')}</details>` : ''}
      <div style="display:flex;gap:8px;margin-top:20px;flex-wrap:wrap;position:sticky;bottom:0;padding:12px 0;background:linear-gradient(transparent,rgba(24,29,40,.95) 30%)">
        <button class="btn pri" type="button" data-reply>${ico('reply')} Reply</button><button class="btn" type="button" data-draft>${ico('spark')} Draft with Claude</button>
        ${l.abrir ? `<a class="btn ghost" href="${esc(l.abrir)}" target="_blank" rel="noopener">${ico('ext')} Open in ${l.canal === 'vynmsa' ? 'Outlook' : 'Gmail'}</a>` : ''}</div>`;
    const to = (them.correo_de || (them.de.match(/[\w.+-]+@[\w.-]+/) || [''])[0]);
    const su = /^re:/i.test(l.asunto) ? l.asunto : 'Re: ' + l.asunto;
    $('[data-reply]', pane).onclick = () => compose({ cuenta: l.cuenta, to, su, body: '' });
    $('[data-draft]', pane).onclick = async () => {
      const b = $('[data-draft]', pane); b.disabled = true; b.innerHTML = '<span class="typing"><i></i><i></i><i></i></span> Drafting…';
      const conv = t.ms.slice(-6).map(m => `${m.mio ? 'Me' : m.quien} (${m.fecha}): ${m.cuerpo.slice(0, 1500)}`).join('\n\n');
      const r = await askClaude(`Draft my reply to this email thread, in my voice (follow my communication skill: .claude/skills/communication). Same language as the thread. Return only the email body, no subject, no commentary.\n\nSubject: ${l.asunto}\n\n${conv}`).catch(e => ({ estado: 'error', texto: e.message }));
      b.disabled = false; b.innerHTML = ico('spark') + ' Draft with Claude';
      if (r.estado === 'listo') compose({ cuenta: l.cuenta, to, su, body: r.texto.trim() }); else toast(r.texto, true);
    };
    box.querySelector('.md').classList.add('open'); wireBack(box); pane.scrollTop = 0;
  }
};
function compose({ cuenta, to, su, body }) {
  const accs = (APPS.mail.data && APPS.mail.data.cuentas) || [];
  openSheet({ kick: 'New message', title: su || 'New message', html: `
    <div style="display:flex;flex-direction:column;gap:10px">
      <label class="kick" for="cFrom">From</label><select class="input" id="cFrom">${accs.map(a => `<option value="${a.clave}"${a.clave === cuenta ? ' selected' : ''}>${esc(a.nombre)} · ${esc(a.correo)}</option>`).join('')}</select>
      <label class="kick" for="cTo">To</label><input class="input" id="cTo" value="${esc(to)}">
      <label class="kick" for="cSu">Subject</label><input class="input" id="cSu" value="${esc(su)}">
      <label class="kick" for="cBody">Message</label><textarea class="input" id="cBody" style="min-height:260px">${esc(body)}</textarea>
      <p class="mu" style="font-size:12px" id="cNote">Send goes out through Apple Mail on your Mac, from the inbox you pick. If that inbox isn't in Mail, it opens the inbox's own window with everything written.</p></div>`,
    foot: `<button class="btn ghost" type="button" id="cCancel">Cancel</button><button class="btn pri" type="button" id="cSend">Send</button>` });
  $('#cCancel').onclick = closeSheet;
  $('#cSend').onclick = async () => {
    const c = $('#cFrom').value, t = $('#cTo').value.trim(), s = $('#cSu').value, b = $('#cBody').value;
    if (!t) { toast('Who is it to?', true); return; }
    const btn = $('#cSend');
    if (!btn.dataset.armed) { btn.dataset.armed = '1'; btn.textContent = 'Tap again to send'; setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = 'Send'; } }, 6000); return; }
    btn.disabled = true; btn.textContent = 'Sending…';
    const r = await api('/api/v3/correo/enviar', { body: { cuenta: c, para: t, asunto: s, cuerpo: b, confirmado: true }, timeout: 70000 }).catch(e => e);
    if (r && r.ok) { toast('Sent from ' + r.desde + '.'); closeSheet(); return; }
    if (r && r.body && !r.body.conectar) { btn.disabled = false; btn.textContent = 'Send'; delete btn.dataset.armed; toast(r.body.error || 'Mail could not send it.', true); return; }
    window.open((COMPOSE[c] || COMPOSE.gmail)(t, s, b), '_blank', 'noopener'); closeSheet(); toast('Opened in your inbox — press Send there.');
  };
}

/* ── Tasks ────────────────────────────────────────────────────────────────── */
APPS.tasks = {
  async mount(el) { el.innerHTML = `<div class="wrap">${head('Tasks', 'Todoist, open tasks. Tick to close it in Todoist.', '<a class="btn sm" href="https://app.todoist.com/app/today" target="_blank" rel="noopener">' + ico('ext') + ' Todoist</a>')}<div id="tkBox">${skel(6)}</div></div>`;
    const r = ST.tareas || await api('/api/v3/tareas').catch(() => null); this.data = r; this.draw(el); },
  show(el) { if (ST.tareas) { this.data = ST.tareas; this.draw(el); } },
  draw(el) {
    const box = $('#tkBox', el); const r = this.data; if (!r) { box.innerHTML = '<p class="mu">No task copy yet.</p>'; return; }
    const by = {}; r.tareas.forEach(t => (by[t.proyecto] = by[t.proyecto] || []).push(t)); const td = iso(NOW());
    box.innerHTML = Object.entries(by).map(([p, ts]) => `<div class="card" style="margin-bottom:14px"><div class="kick" style="margin-bottom:4px">${esc(p)} · ${ts.length}</div><div class="row-list">
      ${ts.map(t => `<div class="task" data-id="${esc(t.id)}"><button class="ck ${t.prioridad}" type="button" aria-label="Close: ${esc(t.titulo)}">${ico('check')}</button><div><div class="t">${esc(t.titulo)}</div>${t.nota || t.vence ? `<div class="n">${t.vence ? `<span class="${t.vence < td ? 'ac' : ''}">${t.vence < td ? 'overdue · ' : 'due '}${esc(relDay(t.vence))}</span>${t.nota ? ' · ' : ''}` : ''}${esc(t.nota)}</div>` : ''}</div></div>`).join('')}</div></div>`).join('') +
      `<p class="mu" style="font-size:12px">Copy from ${esc(r.generado || 'the morning run')}.</p>`;
    $$('.task .ck', box).forEach(b => b.onclick = async () => {
      const row = b.closest('.task'), id = row.dataset.id.replace(/^td-/, ''); const undo = row.classList.contains('done');
      row.classList.toggle('done');
      const res = await api(undo ? '/api/todoist/reabrir' : '/api/todoist/cerrar', { body: { id } }).catch(e => e);
      if (res instanceof Error) { row.classList.toggle('done'); toast(undo ? "Couldn't reopen it in Todoist" : "Couldn't close it in Todoist", true); }
      else toast(undo ? 'Reopened in Todoist.' : 'Closed in Todoist.');
    });
  }
};

/* ── Council ──────────────────────────────────────────────────────────────── */
const VOICES = { estratega: ['Estratega', 'Where is your life heading, and what is holding it back?'], filosofo: ['Filósofo', "What's underneath this — and which question haven't you asked?"] };
/* demo (Pablo, round 9): one place where his communication coach and his council tell him what to improve */
export const FEEDBACK = {
  coach: { from: 'From 4 recorded calls this week',
    fix: ['Talk less, ask more', 'In Thursday’s call with Daniela you talked 68% of the time, and you answered the data question before she finished asking it. Today with Rebecca: ask, then count to three before you speak.'],
    keep: ['Play it back', 'You repeated Rodrigo’s worry back to him before answering, and the call relaxed right after. Do it again at 10:00.'],
    stats: [['68%', 'your talk time', '45% goal'], ['6', 'questions asked', 'in 50 min'], ['14×', '“basically”', 'down from 22']] },
  council: [
    { who: 'Drucker', via: 'Estratega · The Effective Executive', t: 'Your week had 11 hours of meetings and 3 hours of building. Block Tuesday and Thursday mornings for Ferra phase two before someone else takes them.' },
    { who: 'Frankl and Marcus Aurelius', via: 'Filósofo', t: 'You moved Sunday’s call home twice this month. Keep it this week; it’s the one meeting nobody else can take for you.' },
  ],
};
/* Never miss anything: promises he made and promises made to him that live in no to-do list or calendar —
   Exo catches them in his messages, calls and meetings. All people invented. Nothing is sent. */
export const PROMISES = {
  mine: [
    { who: 'Priya Raman', what: 'The Harrow message and your rewritten answer 2', src: 'Said in yesterday’s coaching session', when: 'By Friday', next: 'Both are drafted; read them once and send.', act: 'Send' },
    { who: 'Andrés Villarreal', what: 'Pick a day for coffee after the MIT night', src: 'WhatsApp · two days ago', when: 'This week', next: 'Friday after the MIT night is free from 9:30. Exo holds it on your calendar and sends Andrés the reply.', act: 'Add to calendar' },
    { who: 'Felipe Cantú', what: 'Tell him if the Ferra scope is final', src: 'WhatsApp · yesterday', when: 'After Daniela’s board decides', next: 'Exo will remind you the moment Daniela answers.', act: 'Add to to-do list' },
    { who: 'Mom', what: 'A photo of Saturday’s dinner for your grandmother', src: 'WhatsApp · yesterday', when: 'Today', next: 'Ten seconds. The photo is the second one in your camera roll from Saturday.', act: 'Send' },
  ],
  theirs: [
    { who: 'Ernesto Salinas', what: 'A Harvard class you can sit in on', src: 'Offered at the HBS mixer · silent 9 days', when: 'Overdue', next: 'Nudge drafted: “Ernesto, is the class still on? This week or next, I’ll work around your schedule.”', act: 'Send nudge', late: true },
    { who: 'Andrés Villarreal', what: 'An intro to the people he knows at NEST', src: 'WhatsApp · two days ago', when: 'Before Friday', next: 'You see Matthew Hale (NEST) at 2:15 today; ask Andrés after, not before.', act: 'Done' },
    { who: 'Prof. Alan Purcell', what: 'Two more alumni who sell AI to mid-size firms', src: 'Office hours · 15 days ago', when: 'Ask after Rebecca', next: 'Exo will put this in your thank-you note to him after today’s call with Rebecca.', act: 'Done' },
  ],
};
APPS.promises = {
  mount(el) {
    const P = PROMISES;
    const row = (p, i, side) => `<div class="pm-row${p.late ? ' late' : ''}" data-pm="${side}${i}"><div class="pm-top"><b>${esc(p.who)}</b><span class="pm-when">${esc(p.when)}</span></div>
      <div class="pm-what">${esc(p.what)}</div><div class="pm-src">${esc(p.src)}</div><div class="pm-next">${esc(p.next)}</div>
      <div class="pm-acts"><button class="btn sm" type="button" data-pmgo="${side}${i}">${esc(p.act)}</button></div></div>`;
    el.innerHTML = `<div class="wrap wide">${head('Never miss anything', 'Every promise he made, and every promise made to him, that isn’t on his to-do list or calendar. Exo finds them in his messages, calls and meetings.')}
      <div class="pm-grid"><section class="card pm-col" id="pmMine"><div class="kick ac">You promised · ${P.mine.length}</div>${P.mine.map((p, i) => row(p, i, 'm')).join('')}</section>
      <section class="card pm-col" id="pmTheirs"><div class="kick ac">Promised to you · ${P.theirs.length}</div>${P.theirs.map((p, i) => row(p, i, 't')).join('')}</section></div></div>`;
    $$('[data-pmgo]', el).forEach(b => b.onclick = () => { const r = b.closest('.pm-row'); r.classList.add('done'); const t = b.textContent; b.textContent = /calendar/i.test(t) ? 'On your calendar ✓' : /to-do/i.test(t) ? 'On your to-do list ✓' : /Send/.test(t) ? 'Sent ✓' : 'Done ✓'; b.disabled = true; });
  },
  show() { },
};
/* the council's faces: free-licensed portraits on Wikimedia Commons, loaded from Commons (credited under the table) */
const FACES = { 'Jeff Bezos': 'Jeff Bezos at Amazon Spheres Grand Opening in Seattle - 2018 (39074799225) (cropped).jpg', 'Steve Jobs': 'Steve Jobs Headshot 2010-CROP2.jpg',
  'Michael Dell': 'Michael Dell 2010.jpg', 'Elon Musk': 'Elon Musk (54816836217) (cropped 2) (b).jpg', 'Dale Carnegie': 'Dale Carnegie (1937).jpg', 'Robert Greene': 'Robert Greene B&W.jpg',
  'Simon Sinek': 'Simon Sinek speaks to I MIG Marines (2) (cropped).jpg', 'David Goggins': 'DavidGogginsMay08.jpg', 'Tony Robbins': 'Tony Robbins (cropped).jpg',
  'Enrique Shaw': 'Enrique Shaw (cropped).JPG', 'Viktor Frankl': 'Viktor Frankl2.jpg', 'Aristotle': 'Aristotle Altemps Inv8575.jpg', 'Marcus Aurelius': 'Marcus Aurelius Louvre MR561 n02.jpg',
  'C.S. Lewis': 'CS Lewis (1917).jpg', 'Jacques Philippe': 'JPhilippe2021.jpg', 'Pope Leo XIV': 'Leo XIV (13 October 2025).jpg' };
const face = n => FACES[n] ? `<img alt="" loading="lazy" src="https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(FACES[n])}?width=120" onerror="this.remove()">` : '';
APPS.council = {
  async mount(el) {
    const F = FEEDBACK, c = F.coach;
    el.innerHTML = `<div class="wrap wide">${head('Council', 'Feedback on his life, every Sunday: from the coach who listens to his calls, and from seventeen people whose thinking he trusts.')}
      <div class="fb">
        <section class="card fb-coach" id="cCoach"><div class="fb-h"><span class="fb-av">🎙️</span><div><b>Communication coach</b><span>${esc(c.from)}</span></div></div>
          <div class="fb-stats">${c.stats.map(([n, l, g]) => `<div><b>${esc(n)}</b><span>${esc(l)}</span><em>${esc(g)}</em></div>`).join('')}</div>
          <div class="fb-two"><div class="fb-it fix"><div class="kick">Improve · ${esc(c.fix[0])}</div><p>${esc(c.fix[1])}</p></div><div class="fb-it keep"><div class="kick">Keep · ${esc(c.keep[0])}</div><p>${esc(c.keep[1])}</p></div></div></section>
        <section class="fb-voices" id="cVoices">${F.council.map(v => `<div class="card fb-v"><div class="kick ac">The council · ${esc(v.via)}</div><p>${esc(v.t)}</p><span class="fb-who">— through ${esc(v.who)}</span></div>`).join('')}</section>
      </div>
      <div class="glass table-list fb-table"><div class="kick" style="margin-bottom:10px">At his table · the 17 people he chose</div><div id="cT" class="fb-seats">${skel(4)}</div><p class="fb-credit">Portraits: <a href="https://commons.wikimedia.org" target="_blank" rel="noopener">Wikimedia Commons</a>, free licenses.</p></div></div>`;
    this.el = el;
    api('/api/v3/consejo').then(r => { $('#cT', el).innerHTML = r.gente.map(p => `<button class="seat" type="button" data-n="${esc(p.nota)}"><span class="av">${esc(p.nombre.split(/\s+/).map(w => w[0]).slice(0, 2).join(''))}${face(p.nombre)}</span><span><b>${esc(p.nombre)}</b><span class="fb-l">${esc(p.linea.split(/;|—/)[0].trim().replace(/[.,]$/, ''))}</span></span></button>`).join('');
      $$('#cT .seat', el).forEach(b => b.onclick = () => openNote(b.dataset.n, 'On your council')); }).catch(() => { $('#cT', el).innerHTML = ''; });
  },
  show() { },
};


/* ── Meetings (Granola) ───────────────────────────────────────────────────── */
APPS.meet = {
  async mount(el) { el.innerHTML = `<div class="wrap wide">${head('Meetings', 'Every recording — the summary, your notes and the transcript.')}<div id="mtBox">${skel(6)}</div></div>`;
    const r = await api('/api/v3/juntas').catch(() => ({ juntas: [] })); const box = $('#mtBox', el);
    const J = r.juntas; this.J = J;
    const { paneEl } = master(box, { list: `<div class="list-head"><input class="input" id="mtQ" placeholder="Filter by title"></div><div id="mtL">${this.items(J)}</div>`, empty: 'Pick a meeting.' });
    $('#mtQ', box).oninput = e => { const q = e.target.value.toLowerCase(); $('#mtL', box).innerHTML = this.items(J.filter(j => j.titulo.toLowerCase().includes(q))); this.wire(box, paneEl); };
    this.wire(box, paneEl);
    if (innerWidth > 900) { const f = $('#mtL .item', box); if (f) f.click(); }
  },
  items: J => J.map(j => `<button class="item" type="button" data-id="${j.id}"><div class="l1"><b>${esc(j.titulo)}</b><time>${esc(new Date(j.dia + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))}</time></div><div class="l3">${esc(j.hora)}</div></button>`).join(''),
  wire(box, pane) { $$('#mtL .item', box).forEach(b => b.onclick = async () => {
    $$('#mtL .item', box).forEach(x => x.setAttribute('aria-selected', x === b)); pane.innerHTML = skel(6); box.querySelector('.md').classList.add('open');
    const r = await api('/api/v3/junta?id=' + b.dataset.id).catch(() => null);
    pane.innerHTML = backBtn() + (r ? `<div class="prose">${md(r.texto.replace(/^# /, '# '))}</div>` : '<p class="mu">Could not open it.</p>'); wireBack(box); pane.scrollTop = 0; }); },
  show() { }
};

/* ── People ───────────────────────────────────────────────────────────────── */
APPS.people = {
  async mount(el, opts) { el.innerHTML = `<div class="wrap wide">${head('People', 'Your CRM. Search a name, a company, or what someone is good for.')}<div id="ppBox">${skel(6)}</div></div>`;
    const r = window.__gente ? { gente: window.__gente } : await api('/api/v3/gente').catch(() => ({ gente: [] })); this.G = r.gente; const box = $('#ppBox', el);
    const { paneEl } = master(box, { list: `<div class="list-head"><input class="input" id="ppQ" placeholder="Search ${this.G.length} people"></div><div id="ppL"></div>`, empty: 'Pick someone.' });
    this.box = box; this.pane = paneEl;
    $('#ppQ', box).oninput = e => this.list(e.target.value); this.list(''); this.show(el, opts);
    if (!opts.nombre && innerWidth > 900 && this.G.length) this.open(this.G[0].nombre); },
  list(q) { const ql = q.toLowerCase();
    const G = (ql ? this.G.filter(p => (p.nombre + ' ' + p.contexto + ' ' + p.tipo + ' ' + p.metas).toLowerCase().includes(ql)) : this.G).slice(0, 200);
    $('#ppL', this.box).innerHTML = G.map(p => `<button class="item" type="button" data-n="${esc(p.nombre)}"><div class="l1"><b>${esc(p.nombre)}</b>${p.tipo ? `<span class="tag">${esc(p.tipo.replace(/[*`]/g, '').slice(0, 18))}</span>` : ''}</div><div class="l3">${esc(p.contexto.replace(/[*`_]/g, '').slice(0, 150))}</div></button>`).join('') || '<p class="mu" style="padding:12px">Nobody matches.</p>';
    $$('#ppL .item', this.box).forEach(b => b.onclick = () => this.open(b.dataset.n)); },
  async open(nombre) { const p = this.G.find(x => x.nombre === nombre); if (!p) return;
    $$('#ppL .item', this.box).forEach(x => x.setAttribute('aria-selected', x.dataset.n === nombre));
    this.box.querySelector('.md').classList.add('open');
    this.pane.innerHTML = `${backBtn()}<div class="kick">${esc(p.tipo.replace(/[*`]/g, ''))}${p.metas && p.metas !== '—' ? ' · ' + esc(p.metas.replace(/[*`]/g, '')) : ''}</div><h2 class="sec" style="margin:8px 0 10px">${esc(p.nombre)}</h2><div class="prose" style="margin-bottom:16px">${md(p.contexto)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px"><button class="btn sm" type="button" data-ask>${ico('spark')} What should I do with ${esc(p.nombre.split(' ')[0])}?</button></div><div id="ppProf">${p.perfil ? skel(5) : '<p class="mu">No full profile yet.</p>'}</div>`;
    wireBack(this.box);
    $('[data-ask]', this.pane).onclick = async () => { openSheet({ kick: 'People · Claude on your Mac', title: p.nombre, html: '<div class="typing"><i></i><i></i><i></i></div>' });
      const r = await askClaude(`From my CRM and brain, what's my relationship with ${p.nombre}, when did we last talk, what is open between us, and the one next move I should make? Under 120 words.`).catch(e => ({ texto: e.message })); $('#shBody').innerHTML = `<div class="prose">${md(r.texto)}</div>`; };
    if (p.perfil) { const n = await api('/api/nota?nombre=' + encodeURIComponent(p.perfil)).catch(() => null); const pr = $('#ppProf', this.pane); if (pr) pr.innerHTML = n ? `<div class="hr"></div><div class="prose">${md(n.texto.replace(/^# .*\n/, ''))}</div>` : ''; } },
  show(el, opts = {}) { if (opts.nombre && this.G) this.open(opts.nombre); }
};

/* ── Notes (search the brain) ─────────────────────────────────────────────── */
APPS.notes = {
  async mount(el, opts) { el.innerHTML = `<div class="wrap wide">${head('Notes', 'Search the four folders of your brain. Titles first, then what\'s inside.')}<div id="ntBox"></div></div>`;
    const box = $('#ntBox', el);
    const { paneEl } = master(box, { list: `<div class="list-head"><input class="input" id="ntQ" placeholder="Search your brain"></div><div id="ntL"></div>`, empty: 'Pick a note.' });
    let t; $('#ntQ', box).oninput = e => { clearTimeout(t); const q = e.target.value; t = setTimeout(() => this.search(q, box, paneEl), 220); };
    this.box = box; this.pane = paneEl; this.show(el, opts); if (!opts.q) this.search('', box, paneEl, innerWidth > 900); },
  async search(q, box, pane, openFirst) { if (q.trim().length === 1) return; $('#ntL', box).innerHTML = skel(4);
    const r = await api('/api/v3/buscar?q=' + encodeURIComponent(q.trim())).catch(() => ({ resultados: [] }));
    $('#ntL', box).innerHTML = r.resultados.map(n => `<button class="item" type="button" data-r="${esc(n.ruta)}"><div class="l1"><b>${esc(n.titulo)}</b>${n.por_nombre ? '<span class="tag ac">title</span>' : ''}</div><div class="l2 mu" style="font-size:11.5px">${esc(n.carpeta)}</div><div class="l3">${esc(n.fragmento)}</div></button>`).join('') || '<p class="mu" style="padding:12px">Nothing found.</p>';
    $$('#ntL .item', box).forEach(b => b.onclick = async () => { $$('#ntL .item', box).forEach(x => x.setAttribute('aria-selected', x === b)); box.querySelector('.md').classList.add('open'); pane.innerHTML = skel(6);
      const n = await api('/api/nota?nombre=' + encodeURIComponent(b.dataset.r)).catch(() => null);
      pane.innerHTML = backBtn() + (n ? `<div class="kick">${esc(n.ruta.split('/').slice(0, -1).join(' / '))}</div><div class="prose" style="margin-top:10px"><h1>${esc(n.nombre)}</h1>${md(n.texto.replace(/^# .*\n/, ''))}</div><div style="margin-top:18px"><span class="mu" style="font-size:12px">In the real panel this opens in Obsidian.</span></div>` : '<p class="mu">Could not open it.</p>'); wireBack(box); pane.scrollTop = 0; });
    if (!q.trim()) $('#ntL', box).insertAdjacentHTML('afterbegin', '<div class="kick" style="padding:10px 12px 4px">Recent · 8 of 2,311</div>');
    if (openFirst) { const f = $('#ntL .item', box); if (f) f.click(); } },
  show(el, opts = {}) { if (opts.q) { $('#ntQ', el).value = opts.q; this.search(opts.q, this.box, this.pane); } }
};

/* ── WhatsApp and LinkedIn (what was said) ────────────────────────────────── */
function channel(key, title, sub, url) {
  return {
    async mount(el) { el.innerHTML = `<div class="wrap">${head(title, sub, `<a class="btn sm" href="${url}" target="_blank" rel="noopener">${ico('ext')} Open ${title}</a>`)}<div id="chBox-${key}">${skel(5)}</div></div>`;
      const r = await api('/api/v3/' + key).catch(() => null); const box = $('#chBox-' + key, el);
      if (!r) { box.innerHTML = '<p class="mu">Nothing copied yet.</p>'; return; }
      const P = r.pelota.filas || [];
      const cols = P.length ? Object.keys(P[0]) : [];
      box.innerHTML = (P.length ? `<div class="card" style="margin-bottom:18px"><div class="kick ac" style="margin-bottom:6px">Ball in your court${r.pelota.actualizado ? ' · ' + esc(r.pelota.actualizado.replace('T', ' ')) : ''}</div><div class="row-list">
        ${P.map(f => `<div class="mini-row"><span class="when">${esc((f[cols[2]] || '') + (f[cols[2]] && /^\d+$/.test(f[cols[2]]) ? 'd' : ''))}</span><div class="what"><b>${esc(f[cols[0]] || '')}</b><span>${esc(f[cols[cols.length - 1]] || '')}</span></div></div>`).join('')}</div></div>` : '') +
        `<h2 class="sec" style="margin:24px 0 12px">What was said</h2>` + r.dias.map((d, i) => `<details class="card" style="margin-bottom:12px"${i === 0 ? ' open' : ''}><summary style="cursor:pointer;list-style:none" class="kick">${esc(d.split('\n')[0].replace(/^## /, ''))}</summary><div class="prose" style="margin-top:12px">${md(d.split('\n').slice(1).join('\n'))}</div></details>`).join('');
    },
    show() { }
  };
}
APPS.wa = channel('whatsapp', 'WhatsApp', 'Who is waiting on you, and what was said — copied every morning from your Mac.', 'https://web.whatsapp.com');
APPS.in = channel('linkedin', 'LinkedIn', 'Messages, who is waiting, and what moved — copied every morning.', 'https://www.linkedin.com/messaging/');

/* ── Learn: the study room, Bentley, flashcards, your podcast ──────────────── */
APPS.learn = {
  tab: 'study',
  mount(el) {
    el.innerHTML = `<div style="position:absolute;inset:0;display:flex;flex-direction:column"><div style="padding:22px 40px 0" class="learn-top"><div class="topbar" style="margin-bottom:12px"><h1 class="page">Learn</h1><ol class="l-steps" id="lSteps" title="How to use it">${['Pick', 'Think first', 'Read', 'Go deeper', 'Say it back', 'Review'].map((x, i) => `<li data-i="${i}"><b>${i + 1}</b>${x}</li>`).join('')}</ol><div class="seg" id="lT">${[['study', 'Study'], ['bentley', 'Bentley'], ['cards', 'Flashcards'], ['pod', 'Podcast']].map(([k, n]) => `<button type="button" data-t="${k}" aria-pressed="${k === this.tab}">${n}</button>`).join('')}</div></div></div><div id="lBody" style="position:relative;flex:1;min-height:0"></div></div>`;
    $$('#lT button', el).forEach(b => b.onclick = () => { this.tab = b.dataset.t; $$('#lT button', el).forEach(x => x.setAttribute('aria-pressed', x === b)); this.draw(el); });
    this.draw(el);
  },
  show() { },
  draw(el) {
    const b = $('#lBody', el); const D = ST.D || {};
    if (this.tab === 'study') { b.innerHTML = '<iframe class="frame" title="The study room" src="./run/estudio.html?embed=1&tema=spazio"></iframe>'; return; }
    const wrap = h => `<div style="position:absolute;inset:0;overflow-y:auto;padding:8px 40px 150px"><div class="wrap">${h}</div></div>`;
    if (this.tab === 'bentley') {
      /* 2026-11-02 — open rows only (a `[-]` row is `descartado`: a moved date or a dropped item, never shown); the row's own date in
         words is cut, the left column already says it (same rule as the run's `DATEW`, jarvis.js) */
      const DATEW = /\s+—\s+(?:lun|mar|mié|mie|jue|vie|sáb|sab|dom|mon|tue|wed|thu|fri|sat|sun)\w*\.?\s(?=[^—*]*\d)[^—*]*?(\s*\*\([^)]*\)\*)?\s*$/i;
      const td = iso(NOW()); const E = (D.entregas || []).filter(e => e.estado === 'pendiente');
      const rows = E.map(e => ({ t: (e.texto || '').replace(/<!--.*?-->/g, '').replace(/\s+$/, '').replace(/^\d{4}-\d\d-\d\d/.test(e.cuando || '') ? DATEW : /$^/, '$1').replace(/\*\*/g, ''), c: e.cuando || '' })).sort((a, z) => (a.c || '9').localeCompare(z.c || '9'));
      b.innerHTML = wrap(`<div class="card"><div class="kick" style="margin-bottom:4px">Due · from Brightspace and your classes</div><div class="row-list">${rows.slice(0, 40).map(r => `<div class="mini-row"><span class="when">${esc(r.c ? relDay(r.c.slice(0, 10)) : '—')}</span><div class="what"><b>${md(r.t).replace(/^<p>|<\/p>$/g, '')}</b></div></div>`).join('') || '<p class="mu" style="padding:10px 0">Nothing due.</p>'}</div></div><p class="mu" style="font-size:12px;margin-top:10px">Mark them in Needs you → Due soon · Bentley.</p>`);
      return;
    }
    if (this.tab === 'cards') { b.innerHTML = wrap('<div id="fcBox"></div>'); import('./tarjetas.js').then(m => m.cards($('#fcBox', b))); return; }   /* spaced review + suggested cards (tarjetas.js) */
    const N = D.newsletter || {}; const ep = N.episodio || {};
    b.innerHTML = wrap(`<div class="card hot" style="max-width:640px"><div class="kick ac">Your digest · private podcast</div><div class="serif" style="font-size:30px;margin:10px 0 6px">${esc(ep.titulo || 'No episode yet')}</div><p class="mu">${ep.cuando ? esc(relDay(ep.cuando.slice(0, 10))) + ' · ' : ''}${ep.minutos ? ep.minutos + ' min' : ''}</p>
      <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">${N.url ? `<a class="btn pri" href="${esc(N.url)}" target="_blank" rel="noopener">${ico('play')} Listen</a>` : ''}<a class="btn" href="podcasts://" >${ico('ext')} Apple Podcasts</a></div></div>`);
  }
};

/* ── Agents and Me: their own pages, in the new look ──────────────────────── */
/* Outreach — today's small batch, Send through Apple Mail (outreach.js, 2026-11-01). */
APPS.outreach = { mount(el, o) { import('./outreach.js').then(m => { APPS.outreach.m = m.OUTREACH_APP; m.OUTREACH_APP.mount(el, o); }); }, show(el, o) { if (APPS.outreach.m) APPS.outreach.m.show(el, o); } };
/* Your agents — the office (oficina.js); one verdict per agent from salud-agentes.py (2026-11-01). */
APPS.agents = { mount(el, o) { import('./oficina.js').then(m => { APPS.agents.m = m.AGENTS_APP; m.AGENTS_APP.mount(el, o); }); }, show(el, o) { if (APPS.agents.m) APPS.agents.m.show(el, o); } };
/* Me — time, goals and streaks, nights (yo.js, 2026-11-01). */
APPS.me = { mount(el, o) { import('./yo.js').then(m => { APPS.me.m = m.ME_APP; m.ME_APP.mount(el, o); }); }, show(el, o) { if (APPS.me.m) APPS.me.m.show(el, o); } };
