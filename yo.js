/* Exo v3 — Me (2026-11-01). Pablo: "on the me page, I want you to make it way more beautiful in every sense,
   intuitive, and just take the info and make a good UI for it". He picked three things: Your time (Drucker), goals
   and streaks, health and sleep. Nothing new is measured here — it draws what the jobs already write:
   /api/yo (the `tiempo` job: weeks, fronts, the Sunday read, the Lab's nights) and /api/datos (week and quarter
   goals, the mornings). Read-only: goals are written in the run's weekly close, as before. */
import { $, $$, esc, api, ST, NOW, iso, go } from './app.js';

const A = '#8FA8FF', A2 = '#5EE6B0', MUTED = 'rgba(255,255,255,.16)';
let Y = null;

export const ME_APP = {
  per: '7d',
  async mount(el) {
    this.el = el; el.innerHTML = `<div class="wrap me"><div class="topbar"><div><h1 class="page">Me</h1><p class="sub" style="margin-top:6px">Your time, your goals, your nights — read from what your agents already record.</p></div></div><div id="meBox"><div class="skel" style="height:140px;border-radius:20px"></div></div></div>`;
    try { Y = await api('/api/yo', { timeout: 30000 }); } catch (e) { $('#meBox', el).innerHTML = `<div class="card"><p class="mu">Couldn't read your numbers: ${esc(e.message)}</p></div>`; return; }
    if (!ST.D) try { ST.D = await api('/api/datos'); } catch (_) { }
    this.draw();
  },
  show() { if (Y) this.draw(); },
  draw() {
    const el = this.el, box = $('#meBox', el); if (!box) return;
    box.innerHTML = tiempo(this.per) + respuesta() + tiles() + `<div class="me-grid">${metas()}${racha()}</div>` + tendencias() + salud();   /* demo (Pablo): time planned vs spent comes first */
    $$('[data-per]', box).forEach(b => b.onclick = () => { this.per = b.dataset.per; this.draw(); });
    $$('[data-go]', box).forEach(b => b.onclick = () => go(b.dataset.go));
  },
};

/* ── the three numbers on top ── */
function mornings() { return (ST.D && ST.D.mananas) || []; }
/* 2026-11-01, Pablo: level 01 "a must everyday", level 02 "should happen often" — the streak counts 01 */
const L1 = e => e === 'urgente' || e === 'completa';
function streak() { const m = mornings().slice().reverse(); let n = 0; for (const x of m) { if (L1(x.estado)) n++; else if (x.estado === 'descanso' || x.fecha === iso(NOW())) continue; else break; } return n; }
function tiles() {
  const p = Y.periodos['7d'] || {}, t = p.totales || {}, fr = (p.frentes || []).filter(f => f.declarado);
  const focus = fr.reduce((a, f) => a + (f.real || 0), 0), plan = fr.reduce((a, f) => a + (f.planeado || 0), 0);
  const s = (Y.lab && Y.lab.datos && Y.lab.datos.resumen_sueno) || {};
  const done = mornings().filter(m => L1(m.estado)).length, both = mornings().filter(m => m.estado === 'completa').length;
  return `<div class="me-tiles">
    <div class="card me-tile"><div class="kick">Your fronts · last 7 days</div><div class="me-big">${focus.toFixed(1)}<small> h</small></div><div class="me-s">${plan ? `against ${plan.toFixed(1)} h planned` : 'nothing planned on them'} · ${esc(fr.map(f => f.frente).join(', '))}</div></div>
    <div class="card me-tile"><div class="kick">Urgent cleared · level 01</div><div class="me-big">${streak()}<small> days in a row</small></div><div class="me-s">01 done ${done} of the last ${mornings().length} days · 01 and 02 both: ${both}</div></div>
    <div class="card me-tile"><div class="kick">Nights · last 14</div><div class="me-big">${s.mediana_h ? s.mediana_h.toFixed(1) : '—'}<small> h</small></div><div class="me-s">${s.acostar_mediana ? `bed ~${esc(s.acostar_mediana)} · up ~${esc(s.despertar_mediana)}` : 'not enough nights yet'} · screens off, not measured sleep</div></div>
  </div>`;
}

/* ── goals: the week, each day's one thing, the quarter ── */
function metas() {
  const s = ST.D && ST.D.semana, q = ST.D && ST.D.trimestre;
  const objs = s ? s.objetivos || [] : [];
  const days = s ? s.dias || [] : [];
  const real = t => t && !/^[\s/.\-–—]*$/.test(t);
  return `<div class="card me-goals"><div class="kick">${s && s.vencida ? 'Last week’s goals' : 'This week'}${s ? ' · ' + esc(s.titulo || '') : ''}</div>
    ${s && s.vencida ? `<p class="me-warn">This week's goals aren't written yet — you write them in the weekly close. <button class="btn sm" type="button" data-go="needs">Open the close</button></p>` : ''}
    ${objs.map(o => `<div class="me-obj${o.hecho ? ' done' : ''}"><span class="me-ck">${o.hecho ? '✓' : ''}</span>${esc(o.texto)}</div>`).join('') || '<p class="mu">No goals written.</p>'}
    <div class="kick" style="margin-top:16px">Your one thing, each day</div>
    <div class="me-days">${days.map(d => `<div class="me-day${real(d.texto) ? ' set' : ''}${d.es_hoy ? ' today' : ''}" title="${esc(real(d.texto) ? d.texto : 'Not set')}"><b>${esc(d.etiqueta.split(' ')[0])}</b><span>${real(d.texto) ? esc(d.texto) : '—'}</span></div>`).join('')}</div>
    ${q && q.quests && q.quests.length ? `<div class="kick" style="margin-top:16px">${esc(q.nombre || 'This quarter')}</div>${q.quests.map(o => `<div class="me-obj${o.hecho ? ' done' : ''}"><span class="me-ck">${o.hecho ? '✓' : ''}</span>${esc(o.texto)}</div>`).join('')}` : ''}
  </div>`;
}
function racha() {
  const m = mornings().slice(-35);
  return `<div class="card me-streak"><div class="kick">Mornings · last ${m.length} days</div><p class="me-s" style="margin-top:4px">Level 01 every day; level 02 often.</p>
    <div class="me-dots me-wk">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => `<b>${d}</b>`).join('')}</div>
    <div class="me-dots">${m.length ? '<i class="pad"></i>'.repeat((new Date(m[0].fecha + 'T12:00').getDay() + 6) % 7) : ''}${m.map(x => { const ok = x.estado === 'completa', half = x.estado === 'urgente', rest = x.estado === 'descanso'; const d = new Date(x.fecha + 'T12:00');
      return `<i class="${ok ? 'ok' : half ? 'half' : rest ? 'rest' : ''}${x.fecha === iso(NOW()) ? ' today' : ''}" title="${esc(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))} · ${ok ? '01 and 02 done' : half ? '01 done' : rest ? 'rest day' : 'not done'}"></i>`; }).join('')}</div>
    <div class="me-legend"><span><i class="ok"></i>01 + 02</span><span><i class="half"></i>01 only</span><span><i></i>not done</span><span><i class="rest"></i>rest</span></div>
    <p class="me-s" style="margin-top:12px">Your skipped days, in your words: too long to clear, nothing pulled you in, wrong device. The new Today and the phone are the fix for all three.</p></div>`;
}

/* ── demo (Pablo, round 9): how long the messages that matter wait for him ── */
const RESP = [['Clients', 2.7, 4, 'Daniela, Rodrigo, Isabel'], ['Family', 1.2, 6, 'Mom, Lucía, Diego'], ['People who helped him', 19, 24, 'intros, mentors, hosts'], ['Prospects who replied', 31, 24, 'cold emails that answered'], ['Professors', 9, 24, 'Bentley']];
function respuesta() {
  const max = 36, f = h => h < 1 ? Math.round(h * 60) + ' min' : h < 10 ? Math.floor(h) + ' h ' + (Math.round((h % 1) * 60) ? Math.round((h % 1) * 60) + ' m' : '') : Math.round(h) + ' h';
  return `<div class="card me-resp" id="meResp"><div class="topbar" style="margin:0 0 4px"><div class="kick">How fast he answers what matters · last 30 days</div><span class="me-s">median time to reply · tick = his goal</span></div>
    <div class="me-rbars">${RESP.map(([k, h, g, who]) => `<div class="me-rb${h > g ? ' late' : ''}"><span class="n">${esc(k)}<small>${esc(who)}</small></span>
      <span class="tr"><i class="r" style="width:${(100 * Math.min(h, max) / max).toFixed(1)}%"></i><i class="p" style="left:${(100 * g / max).toFixed(1)}%"></i></span><span class="v">${f(h).trim()}<small> / ${g} h</small></span></div>`).join('')}</div>
    <p class="me-rnote"><b>The one to fix:</b> prospects who answer his cold emails wait 31 h, against a 24 h goal. They are the warmest leads he has. Rachel Whitfield has been waiting since yesterday; her reply is drafted in Messages.</p></div>`;
}

/* ── your time (Drucker: record · prune · consolidate) ── */
function tiempo(per) {
  const p = Y.periodos[per] || Y.periodos['7d']; const fr = (p.frentes || []).filter(f => (f.real || 0) + (f.planeado || 0) >= 0.3).slice(0, 14);
  const max = Math.max(1, ...fr.map(f => Math.max(f.real || 0, f.planeado || 0)));
  const L = Y.lectura || {}; const ins = L.insights || []; const mv = L.movida;
  const H = (Y.historia || []).filter(h => h.totales && h.totales.horas_real_foco != null).slice(-10);
  const hmax = Math.max(1, ...H.map(h => Math.max(h.totales.horas_real_foco, h.totales.horas_juntas || 0)));
  const W = 520, HH = 120, step = H.length > 1 ? W / (H.length - 1) : W;
  const pts = H.map((h, i) => [i * step, HH - (h.totales.horas_real_foco / hmax) * (HH - 10) - 4]);
  const ptsJ = H.map((h, i) => [i * step, HH - ((h.totales.horas_juntas || 0) / hmax) * (HH - 10) - 4]);
  const path = a => a.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' ');
  const lbl = { '7d': 'Last 7 days', semana: 'This week', pasada: 'Last week', '30d': 'Last 30 days' };
  return `<div class="sec-head"><h2 class="sec">Your time</h2><span class="sub">Where the hours really went, against what you planned. Bright = a front from your Current Focus.</span></div>
  <div class="me-grid2">
    <div class="card"><div class="topbar" style="margin:0 0 10px"><div class="kick">Real vs planned · ${esc(lbl[per] || per)}</div>
      <div class="seg">${Object.keys(Y.periodos).map(k => `<button type="button" data-per="${k}" aria-pressed="${k === per}">${esc(lbl[k] || k)}</button>`).join('')}</div></div>
      <div class="me-bars">${fr.map(f => `<div class="me-bar${f.declarado ? ' dec' : ''}" title="${esc(f.frente)}: ${f.real} h real · ${f.planeado} h planned"><span class="n">${esc(f.frente)}</span>
        <span class="tr"><i class="r" style="width:${(100 * (f.real || 0) / max).toFixed(1)}%"></i>${f.planeado ? `<i class="p" style="left:${(100 * f.planeado / max).toFixed(1)}%"></i>` : ''}</span><span class="v">${(f.real || 0).toFixed(1)}<small>${f.planeado ? ' / ' + f.planeado.toFixed(1) : ''}</small></span></div>`).join('')}</div>
      <div class="me-legend" style="margin-top:10px"><span><i class="bar"></i>real hours</span><span><i class="tick"></i>planned</span></div></div>
    <div class="card"><div class="kick" style="margin-bottom:10px">Focus vs meetings · by week</div>
      ${H.length > 1 ? `<svg viewBox="-6 -6 ${W + 12} ${HH + 30}" class="me-line" role="img" aria-label="Weekly focus hours and meeting hours">
        <path d="${path(ptsJ)}" fill="none" stroke="rgba(255,181,71,.8)" stroke-width="2" stroke-dasharray="4 4"/>
        <path d="${path(pts)}" fill="none" stroke="${A2}" stroke-width="2.2"/>
        ${pts.map((q, i) => `<circle cx="${q[0]}" cy="${q[1]}" r="4" fill="${A2}" stroke="#141824" stroke-width="2"><title>Week of ${esc(H[i].semana)}: ${H[i].totales.horas_real_foco} h on fronts · ${H[i].totales.horas_juntas || 0} h meetings</title></circle>`).join('')}
        ${H.map((h, i) => i % 2 === 0 || i === H.length - 1 ? `<text x="${i * step}" y="${HH + 20}" text-anchor="middle" class="me-ax">${esc(new Date(h.semana + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))}</text>` : '').join('')}
      </svg><div class="me-legend"><span><i class="ln"></i>hours on your fronts</span><span><i class="ln dash"></i>hours in meetings</span></div>` : '<p class="mu">Not enough weeks yet.</p>'}
    </div>
  </div>
  ${ins.length || mv ? `<div class="sec-head"><h2 class="sec">The Sunday read</h2><span class="sub">What your week says, and one move.</span></div>
  <div class="me-ins">${ins.map(i => `<div class="card"><div class="me-dato">${esc(i.dato || '')}</div><h3>${esc(i.titulo)}</h3><p>${esc(i.por_que)}</p></div>`).join('')}
    ${mv ? `<div class="card me-move"><div class="kick ac">The move</div><h3>${esc(mv.que)}</h3><p><b>${esc(mv.cuando || '')}</b>${mv.donde ? ' · ' + esc(mv.donde) : ''}</p><p>${esc(mv.hacer || '')}</p></div>` : ''}</div>` : ''}`;
}

/* ── trends: the daily numbers row (2026-11-02). `.claude/scripts/metricas.py` writes one file per day
   (5 Sistema/dia/metricas/), /api/yo hands the last 30 as `metricas`, oldest first. A null day is a gap, never a 0. ── */
const AMBER = 'rgba(255,181,71,.85)';
const num = v => typeof v === 'number';
const dia = f => new Date(f + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
function ultimo(R, k) { for (let i = R.length - 1; i >= 0; i--) if (num(R[i][k])) return R[i]; return null; }
function spark(R, series, ref) {
  const W = 240, H = 56, n = R.length, x = i => n > 1 ? i * W / (n - 1) : W / 2;
  const max = Math.max(ref || 0, 1, ...series.flatMap(s => R.map(r => r[s.k]).filter(num)));
  const y = v => H - 3 - (v / max) * (H - 8);
  const linea = s => { let out = '', seg = [];
    const cerrar = () => { if (seg.length === 1) out += `<circle cx="${seg[0][0].toFixed(1)}" cy="${seg[0][1].toFixed(1)}" r="2.6" fill="${s.c}"/>`;
      else if (seg.length) out += `<path d="${seg.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' ')}" fill="none" stroke="${s.c}" stroke-width="2"${s.dash ? ' stroke-dasharray="4 3"' : ''}/>`; seg = []; };
    R.forEach((r, i) => { if (num(r[s.k])) seg.push([x(i), y(r[s.k])]); else cerrar(); }); cerrar();
    return out + R.map((r, i) => num(r[s.k]) ? `<circle cx="${x(i).toFixed(1)}" cy="${y(r[s.k]).toFixed(1)}" r="6" fill="transparent"><title>${esc(dia(r.fecha))} · ${esc(s.n)}: ${r[s.k]}${s.u || ''}</title></circle>` : '').join(''); };
  return `<svg viewBox="-4 -4 ${W + 8} ${H + 22}" class="me-spark" style="width:100%;height:auto;display:block;margin-top:10px" role="img" aria-label="${esc(series.map(s => s.n).join(' and '))}, last ${n} days">
    ${ref ? `<line x1="0" x2="${W}" y1="${y(ref).toFixed(1)}" y2="${y(ref).toFixed(1)}" stroke="${MUTED}" stroke-dasharray="3 5"/><text x="${W}" y="${(y(ref) - 4).toFixed(1)}" text-anchor="end" class="me-ax">${ref}${series[0].u || ''}</text>` : ''}
    ${series.map(linea).join('')}
    ${n ? `<text x="0" y="${H + 16}" class="me-ax">${esc(dia(R[0].fecha))}</text><text x="${W}" y="${H + 16}" text-anchor="end" class="me-ax">${esc(dia(R[n - 1].fecha))}</text>` : ''}
  </svg>`;
}
function tendencias() {
  const R = Y.metricas || [];
  const cards = [
    { t: 'Focus kept', s: [{ k: 'foco_cumplido_pct', n: 'focus kept', c: A2, u: '%' }], ref: 100,
      sub: 'Real ÷ planned hours on your declared fronts.' },
    { t: 'Todoist closed', s: [{ k: 'todoist_cerradas', n: 'closed', c: A2 }], sub: 'Tasks closed each day — done or dropped.' },
    { t: 'Mail waiting for you', s: [{ k: 'correo_sin_responder_gmail', n: 'personal', c: A2 }, { k: 'correo_sin_responder_vynmsa', n: 'VYNMSA', c: AMBER, dash: 1 }],
      sub: 'Mail from people in the last 7 days you haven’t replied to.' },
    { t: 'Outreach', s: [{ k: 'outreach_enviados', n: 'sent', c: A2 }, { k: 'outreach_respuestas', n: 'replies', c: AMBER, dash: 1 }],
      sub: 'Cold outreach sent and replies, each day.' },
    { t: 'LinkedIn impressions', s: [{ k: 'linkedin_impresiones', n: 'post impressions', c: A2 }], sub: 'Your post impressions, from the LinkedIn sidebar.' },
  ];
  const grande = c => { const r = ultimo(R, c.s[0].k); if (!r) return '<div class="me-big" style="font-size:38px">—</div>';
    const v = c.s.map(s => num(r[s.k]) ? r[s.k].toLocaleString('en-US') : '—').join(' · ');
    return `<div class="me-big" style="font-size:38px">${esc(v)}<small>${esc(c.s[0].u || '')} · ${esc(dia(r.fecha))}</small></div>`; };
  return `<div class="sec-head"><h2 class="sec">Trends</h2><span class="sub">Your daily numbers, last ${R.length || 30} days — one row a day, written every hour. A gap is a day with no data.</span></div>
  ${R.length ? `<div class="me-trends" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px">${cards.map(c => `<div class="card"><div class="kick">${esc(c.t)}</div>${grande(c)}<div class="me-s">${esc(c.sub)}</div>
    ${spark(R, c.s, c.ref)}${c.s.length > 1 ? `<div class="me-legend"><span><i class="ln"></i>${esc(c.s[0].n)}</span><span><i class="ln dash"></i>${esc(c.s[1].n)}</span></div>` : ''}</div>`).join('')}</div>`
    : '<div class="card"><p class="mu">No daily numbers written yet.</p></div>'}`;
}

/* ── nights and the Lab ── */
function salud() {
  const D = (Y.lab && Y.lab.datos) || {}; const N = (D.noches || []).slice(-28); const cards = (Y.lab && Y.lab.tarjetas) || [];
  const W = 640, H = 150, bw = N.length ? W / N.length : W, top = 11;
  const bars = N.map((n, i) => { const h = Math.max(0, Math.min(top, n.horas || 0)); const y = H - (h / top) * H;
    return `<rect x="${(i * bw + 2).toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(2, bw - 4).toFixed(1)}" height="${(H - y).toFixed(1)}" rx="3" fill="${(n.horas || 0) < 7 ? 'rgba(255,181,71,.85)' : A}"><title>${esc(new Date(n.noche + 'T12:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))}: ${n.horas} h · bed ${esc(n.acostar)} · up ${esc(n.despertar)}</title></rect>`; }).join('');
  const y8 = H - (8 / top) * H;
  const verdict = c => { const e = (D.evaluaciones || []).find(x => x.id === c.id); if (!e) return 'Not enough days yet'; const clear = (e.resultados || []).some(r => r.claro); return clear ? 'A clear difference' : `No clear difference yet · ${e.n} days`; };
  return `<div class="sec-head"><h2 class="sec">Nights</h2><span class="sub">Screen-off nights from your phone and Mac — the longest stretch with no screen, not measured sleep.</span></div>
  <div class="card">${N.length ? `<svg viewBox="0 -8 ${W} ${H + 28}" class="me-sleep" role="img" aria-label="Hours per night, last ${N.length} nights">
      <line x1="0" x2="${W}" y1="${y8}" y2="${y8}" stroke="${MUTED}" stroke-dasharray="3 5"/><text x="${W}" y="${y8 - 5}" text-anchor="end" class="me-ax">8 h</text>
      ${bars}${N.map((n, i) => i % 7 === 0 ? `<text x="${i * bw + bw / 2}" y="${H + 18}" text-anchor="middle" class="me-ax">${esc(new Date(n.noche + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))}</text>` : '').join('')}
    </svg><div class="me-legend"><span><i class="bar"></i>7 h or more</span><span><i class="bar warn"></i>under 7 h</span></div>` : '<p class="mu">No nights read yet.</p>'}</div>
  ${cards.length ? `<div class="sec-head"><h2 class="sec">The Lab</h2><span class="sub">Questions about you, answered with your own days. Most need more days before they say anything.</span></div>
  <div class="me-lab">${cards.map(c => `<div class="card"><h3>${esc(c.titulo)}</h3>${c.cita ? `<p class="me-quote">“${esc(c.cita)}”</p>` : ''}<div class="me-verdict">${esc(verdict(c))}</div>${c.ciencia ? `<p class="me-s">${esc(c.ciencia.resumen)}</p>` : ''}</div>`).join('')}</div>` : ''}`;
}
