/* Exo v3 — Flashcards (2026-11-01). Pablo: "fix falshcards so it still has it's space repetition, and in that
   space put the recomendations of new flashcards I could add (based on learnings of benltey, meetings, "leraning"
   conversations, etc)". The review is the run's own spaced repetition (FSRS in servidor.py: /api/aprendizaje/tarjeta
   with Again / Hard / Good / Easy). Below it, suggested cards: the ones his jobs already propose (Bentley blocks, the
   coach — /api/bentley/tarjeta) and, once a day, Claude reading his last ten days of classes, recordings and study
   notes (/api/v3/tarjetas). Adding one is /api/aprendizaje/nueva-tarjeta; it first comes back tomorrow. */
import { $, $$, esc, api, toast, ST } from './app.js';

const GR = [['otra-vez', 'Again', "didn't know it"], ['dificil', 'Hard', 'struggled'], ['bien', 'Good', 'got it'], ['facil', 'Easy', 'obvious']];
const inD = n => n == null ? '' : n <= 0 ? 'today' : n === 1 ? 'tomorrow' : n < 30 ? 'in ' + n + ' days' : 'in ' + Math.round(n / 30) + ' mo';
let S = null, shown = false, done = 0;

export async function cards(b) {
  const A = (ST.D && ST.D.aprendizaje) || {}; const due = (A.tarjetas || []).filter(c => !c._done);
  const c = due[0];
  b.innerHTML = `<div class="fc-wrap">
    <section class="fc-review">${c ? `<div class="kick">Review · ${due.length} due${A.esperan ? ` (+${A.esperan} tomorrow)` : ''}${done ? ` · ${done} done` : ''}</div>
      <div class="card fc-card${shown ? ' flip' : ''}" id="fcCard"><div class="kick" style="opacity:.7">${esc(c.categoria || 'Flashcard')}</div>
        <div class="fc-q">${esc(c.pregunta || c.titulo)}</div>
        ${shown ? `<div class="fc-a">${esc(c.respuesta)}</div>` : ''}
      </div>
      ${shown ? `<div class="fc-grades">${GR.map(([g, l, h]) => `<button class="btn${g === 'otra-vez' ? '' : ' pri'}" type="button" data-g="${g}"><b>${l}</b><small>${h} · ${inD((c.previa || {})[g])}</small></button>`).join('')}</div>`
        : `<button class="btn pri fc-show" type="button" id="fcShow">Show the answer <span class="kbd">Space</span></button>`}`
      : `<div class="card fc-empty"><span class="serif">${done ? 'Done for today.' : 'Nothing to review today.'}</span><p class="mu">${A.mazo_total || 0} cards in your deck · next review ${esc(A.proxima_tarjeta || '—')}</p></div>`}</section>
    <section class="fc-sug"><div class="sec-head" style="margin-top:6px"><h2 class="sec">Suggested new cards</h2><span class="sub">From your classes, your recordings and your study notes. Add the ones worth remembering.</span></div>
      <div id="fcSug"><div class="skel" style="height:90px;border-radius:16px"></div></div></section>
    <section><details class="card fc-own"><summary>Write your own card</summary>
      <input class="input" id="fcQ" placeholder="Front — a question you answer from memory"><textarea class="input" id="fcA" rows="2" placeholder="Back — the shortest true answer"></textarea>
      <div style="display:flex;gap:8px"><input class="input" id="fcC" placeholder="Course or topic (CS399, Faith…)" style="flex:1"><button class="btn pri" type="button" id="fcAdd">Add — first review tomorrow</button></div></details></section></div>`;
  const sh = $('#fcShow', b); if (sh) sh.onclick = () => { shown = true; cards(b); };
  $$('[data-g]', b).forEach(x => x.onclick = () => grade(b, c, x.dataset.g));
  b.onkeydown = null;
  document.onkeydown = e => { if (!b.isConnected || !b.offsetParent || /INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) return; if (e.key === ' ' && c && !shown) { e.preventDefault(); shown = true; cards(b); } else if (shown && c && /^[1-4]$/.test(e.key)) grade(b, c, GR[+e.key - 1][0]); };
  $('#fcAdd', b).onclick = async () => { const q = $('#fcQ', b).value.trim(), a = $('#fcA', b).value.trim(); if (!q || !a) { toast('Write both sides first.', true); return; }
    const r = await api('/api/aprendizaje/nueva-tarjeta', { body: { pregunta: q, respuesta: a, categoria: $('#fcC', b).value.trim() } }).catch(e => e);
    if (r instanceof Error) toast(r.message, true); else { toast('Added. First review tomorrow.'); $('#fcQ', b).value = ''; $('#fcA', b).value = ''; } };
  sugeridas($('#fcSug', b));
}

async function grade(b, c, g) {
  const r = await api('/api/aprendizaje/tarjeta', { body: { linea: c.linea, crudo: c.crudo, calidad: g } }).catch(e => e);
  if (r instanceof Error) { toast("Couldn't save the grade: " + r.message, true); return; }
  c._done = true; done++; shown = false; toast((GR.find(x => x[0] === g) || [, ''])[1] + ' · back ' + inD(r.dias != null ? r.dias : (c.previa || {})[g]));
  cards(b);
}

async function sugeridas(box, nuevo) {
  if (!box) return;
  S = await api('/api/v3/tarjetas' + (nuevo ? '?nuevo=1' : ''), { timeout: 20000 }).catch(() => null);
  if (!S) { box.innerHTML = '<p class="mu">Your Mac is not answering.</p>'; return; }
  const cl = S.claude || {};
  if (!nuevo && cl.estado === 'nada') return sugeridas(box, true);   // once a day, on first open
  const items = [...(cl.items || []).map(x => Object.assign({ tipo: 'claude' }, x)), ...S.archivo.map(x => Object.assign({ tipo: 'archivo', fuente: '', por_que: x.origen }, x))];
  box.innerHTML = `${cl.estado === 'corriendo' ? `<div class="card fc-wait"><span class="typing"><i></i><i></i><i></i></span> Claude is reading your last ten days of classes, recordings and study notes…</div>` : ''}
    <div class="fc-grid">${items.map((x, i) => `<div class="card fc-s" data-i="${i}">
      <div class="kick">${esc(x.categoria || 'Card')}${x.tipo === 'archivo' ? ' · from a study block' : ''}</div>
      <div class="fc-sq" contenteditable="plaintext-only" spellcheck="false">${esc(x.pregunta)}</div>
      <div class="fc-sa" contenteditable="plaintext-only" spellcheck="false">${esc(x.respuesta)}</div>
      ${x.por_que ? `<p class="fc-why">${esc(x.por_que)}${x.fuente ? ` · <span class="mu">${esc(x.fuente)}</span>` : ''}</p>` : ''}
      <div class="fc-acts"><button class="btn sm pri" type="button" data-add>Add to deck</button><button class="btn sm ghost" type="button" data-skip>Skip</button></div></div>`).join('')}</div>
    ${!items.length && cl.estado !== 'corriendo' ? `<div class="card"><p class="mu">No suggestions right now.</p></div>` : ''}
    ${cl.estado !== 'corriendo' ? `<button class="btn sm ghost" type="button" id="fcMore" style="margin-top:12px">Look again in my last ten days</button>` : ''}`;
  if (cl.estado === 'corriendo') setTimeout(() => { if (box.isConnected) sugeridas(box); }, 5000);
  const m = $('#fcMore', box); if (m) m.onclick = () => sugeridas(box, true);
  $$('.fc-s', box).forEach(el => {
    const x = items[+el.dataset.i];
    $('[data-add]', el).onclick = async () => {
      const q = $('.fc-sq', el).innerText.trim(), a = $('.fc-sa', el).innerText.trim(); const edited = q !== x.pregunta || a !== x.respuesta;
      let r;
      if (x.tipo === 'archivo' && !edited) r = await api('/api/bentley/tarjeta', { body: { id: x.id, marca: 'x' } }).catch(e => e);
      else { r = await api('/api/aprendizaje/nueva-tarjeta', { body: { pregunta: q, respuesta: a, categoria: x.categoria || '', fuente: x.fuente || '' } }).catch(e => e);
        if (!(r instanceof Error)) { if (x.tipo === 'claude') api('/api/v3/tarjetas/descartar', { body: { id: x.id } }).catch(() => { }); else api('/api/bentley/tarjeta', { body: { id: x.id, marca: '-' } }).catch(() => { }); } }
      if (r instanceof Error) { toast("Couldn't add it: " + r.message, true); return; }
      el.classList.add('gone'); toast('Added to your deck — first review tomorrow.'); setTimeout(() => el.remove(), 350);
    };
    $('[data-skip]', el).onclick = async () => {
      const r = x.tipo === 'claude' ? await api('/api/v3/tarjetas/descartar', { body: { id: x.id } }).catch(e => e) : await api('/api/bentley/tarjeta', { body: { id: x.id, marca: '-' } }).catch(e => e);
      if (r instanceof Error) { toast(r.message, true); return; }
      el.classList.add('gone'); setTimeout(() => el.remove(), 350);
    };
  });
}
