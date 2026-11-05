/* the demo's clock: Pablo's morning, 9:10 AM on the viewer's day (the panel and this frame agree); ?at=HH:MM moves it */
(function () {
  let q = location.search; try { q += parent.location.search; } catch (_) { }
  const m = /[?&]at=(\d{1,2}):(\d{2})/.exec(q) || [null, '9', '10'];
  const R = Date, t = new R(); t.setHours(+m[1], +m[2], 0, 0); const off = t - R.now();
  class D extends R { constructor(...a) { a.length ? super(...a) : super(R.now() + off); } static now() { return R.now() + off; } }
  window.Date = D;
})();
/* demo: the guided layer's "sound off" reaches the intro's music and voice here */
(function () {
  const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
  const all = []; let muted = false;
  function Wrapped(o) { const c = new C(o); all.push(c); if (muted) c.suspend(); return c; }
  Wrapped.prototype = C.prototype; window.AudioContext = Wrapped; if (window.webkitAudioContext) window.webkitAudioContext = Wrapped;
  window.__ovAudio = () => all.map(c => c.state);
  window.__ovMute = m => { muted = m; all.forEach(c => { try { m ? c.suspend() : c.resume(); } catch (_) { } }); try { if (m) speechSynthesis.cancel(); } catch (_) { } };
  try { if (parent && parent.document && parent.document.getElementById('ovMute') && parent.document.getElementById('ovMute').textContent === 'sound off') muted = true; } catch (_) { }
  const sp = window.speechSynthesis && speechSynthesis.speak.bind(speechSynthesis); if (sp) speechSynthesis.speak = u => { if (!muted) sp(u); };
})();
/* Exo — public demo shim for the morning run (index.html) and the study room (estudio.html).
   The real pages talk to a small server on Pablo's Mac that reads his second brain. This file stands in for
   that server: every /api/... call is answered from the invented data in data/, decisions change an in-memory
   copy kept for this browser tab, and nothing is sent anywhere.
   The clock is the viewer's own: every date in data/ is a token — {{D+n}} = ISO date n days from today,
   {{W+n}} = weekday name, {{F+n}} = "Nov 3", {{G+n}} = "3 Nov" — replaced the moment a file is read. */
(function(){
  'use strict';
  const BASE = new URL('.', document.currentScript ? document.currentScript.src : location.href).href;
  const KEY = 'jarvis-demo-state-v2';
  const VER = 'v2-' + new Date().toISOString().slice(0,10);

  /* ── date tokens → the viewer's calendar ── */
  const now = new Date();
  const WDN = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day = n => new Date(now.getFullYear(), now.getMonth(), now.getDate() + n);
  const iso = d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  const TOK = /\{\{([DWFG])([+-]\d+)\}\}/g;
  function tokens(s){ return s.replace(TOK, (m, t, n) => { const d = day(+n);
    return t === 'D' ? iso(d) : t === 'W' ? WDN[d.getDay()] : t === 'F' ? MON[d.getMonth()] + ' ' + d.getDate() : d.getDate() + ' ' + MON[d.getMonth()]; }); }
  function fill(v){ if(typeof v === 'string') return tokens(v); if(Array.isArray(v)) return v.map(fill);
    if(v && typeof v === 'object'){ const o = {}; for(const k of Object.keys(v)) o[tokens(k)] = fill(v[k]); return o; } return v; }
  window.jarvisDemoTokens = tokens;

  /* ── the data ── */
  const FILES = { datos:'data/datos.json', cerebro:'data/cerebro.json', corridas:'data/corridas.json', notas:'data/notas.json',
                  sala:'data/estudio_sala.json', snotas:'data/estudio_notas.json' };
  const cache = {};
  const realFetch = window.fetch.bind(window);
  function get(name){
    if(!cache[name]) cache[name] = realFetch(BASE + FILES[name] + '?v=' + VER).then(r => r.ok ? r.json() : {}).then(fill).catch(() => ({}));
    return cache[name];
  }
  /* a new tab starts the morning from the top: the run's own saved state on this computer goes (only its keys) */
  function wipeRun(){ try{ for(let i = localStorage.length - 1; i >= 0; i--){ const k = localStorage.key(i); if(k && /^jarvis-(run-|outbox)/.test(k)) localStorage.removeItem(k); } }catch(_){} }
  try{ if(!sessionStorage.getItem('jarvis-demo-visit')){ wipeRun(); sessionStorage.setItem('jarvis-demo-visit', '1'); } }catch(_){}
  let state = null;
  try{ const s = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if(s && s.day === iso(now) && s.datos && Array.isArray(s.datos.trabajos)) state = s; }catch(_){}
  function save(){ try{ sessionStorage.setItem(KEY, JSON.stringify(state)); }catch(_){} }
  async function datos(){ if(!state){ const d = await get('datos'); state = { day: iso(now), datos: d }; if(Array.isArray(d.trabajos)) save(); } return state.datos; }
  async function sala(){ await datos(); if(!state.sala){ state.sala = await get('sala'); save(); } return state.sala; }

  /* ── decisions: every object in the tab's copy whose raw line matches ── */
  function walk(v, fn){ if(Array.isArray(v)) v.forEach(x => walk(x, fn)); else if(v && typeof v === 'object'){ fn(v); Object.values(v).forEach(x => walk(x, fn)); } }
  const ESTADO = { 'x':'hecho', '*':'guardado', '-':'no-sirve', 'r':'duda', 'n':'no-voy', ' ':'pendiente', '':'pendiente' };
  function marcar(crudo, marca){
    if(!crudo) return null; const est = ESTADO[marca] || 'hecho'; let out = null;
    const nuevo = crudo.replace(/^(\s*- )\[.\]/, '$1[' + (marca || ' ') + ']');
    const roots = [state.datos, state.sala].filter(Boolean);
    roots.forEach(root => walk(root, o => { if(o.crudo === crudo){ o.crudo = nuevo; o.estado = est; out = o; } }));
    /* the lists the run reads: an item leaves `pendientes` when it is decided and comes back on undo */
    (state.datos.trabajos || []).forEach(t => { ['pendientes','hechos','despues'].forEach(col => { t[col] = t[col] || []; });
      const all = [...t.pendientes, ...t.hechos, ...t.despues].filter(it => it.crudo === nuevo);
      all.forEach(it => { ['pendientes','hechos','despues'].forEach(col => { t[col] = t[col].filter(x => x !== it); }); (est === 'pendiente' ? t.pendientes : t.hechos).push(it); }); });
    if(state.sala && Array.isArray(state.sala.items)){ const items = state.sala.items; state.sala.abiertos = items.filter(i => i.estado === 'pendiente').length;
      state.sala.aprendidos = items.filter(i => i.estado === 'hecho').length; state.sala.no_utiles = items.filter(i => i.estado === 'no-sirve').length; }
    save(); return out ? nuevo : null;
  }
  function despues(trabajo, id, deshacer){
    const t = (state.datos.trabajos || []).find(x => x.slug === trabajo); if(!t) return;
    const from = deshacer ? (t.despues || []) : (t.pendientes || []), it = from.find(x => x.id === id); if(!it) return;
    t.despues = (t.despues || []).filter(x => x !== it); t.pendientes = (t.pendientes || []).filter(x => x !== it);
    it.estado = deshacer ? 'pendiente' : 'despues'; (deshacer ? t.pendientes : t.despues).push(it); save();
  }

  const json = (obj, status) => new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json' } });
  const qs = u => Object.fromEntries(new URL(u, location.href).searchParams);
  const clip = t => { try{ navigator.clipboard && navigator.clipboard.writeText(String(t || '')).catch(() => {}); }catch(_){} };

  async function answer(url, opt){
    const u = new URL(url, location.href), path = u.pathname.replace(/^.*?\/api\//, '/api/'), method = (opt && opt.method || 'GET').toUpperCase();
    let body = {}; try{ body = opt && opt.body ? JSON.parse(opt.body) : {}; }catch(_){}
    if(method === 'GET'){
      if(path === '/api/datos') return json(await datos());
      if(path === '/api/cerebro') return json(await get('cerebro'));
      if(path === '/api/corridas') return json(await get('corridas'));
      if(path === '/api/nota'){ const n = (await get('notas'))[qs(url).nombre]; return n ? json(n) : json({ error: 'That note is not in the demo' }, 404); }
      if(path === '/api/estudio/sala') return json(await sala());
      if(path === '/api/estudio/nota'){ const it = ((await sala()).items || []).find(x => x.id === qs(url).id); let n = (await get('snotas'))[qs(url).id];
        if(!n && it) n = { nombre: it.titulo, ruta: '3 Resources/Study/' + it.nota + '.md', texto: '# ' + it.titulo + '\n\n## Think about this first\n\n' + it.por_que + '. What do you already think?\n\n## The 80/20\n\nExo writes this note the night before it becomes the next pick, so the demo only carries the full note for this week\'s reading.\n\n## Lo que pensó Pablo\n' };
        if(!n) return json({ error: 'That note is not in the demo' }, 404); return json(Object.assign({}, n, it ? { fila: it } : {})); }
      if(path === '/api/v3/cierre/semana') return json({ contexto: '', generado: false });
      return json({ error: 'Not in the demo' }, 404);
    }
    /* POST — every decision is accepted and kept in this tab only */
    const d = await datos();
    if(path === '/api/marcar'){ const c = marcar(body.crudo, body.marca); return json({ ok: true, demo: true, crudo: c || body.crudo }); }
    if(path === '/api/comentar'){ let hit = null; walk(d, o => { if(!hit && o.crudo === body.crudo) hit = o; }); if(hit){ (hit.comentarios = hit.comentarios || []).push(body.texto || ''); save(); } return json({ ok: true, crudo: body.crudo }); }
    if(path === '/api/despues'){ despues(body.trabajo, body.id, !!body.deshacer); return json({ ok: true }); }
    if(path === '/api/quien'){ d.quien = (d.quien || []).filter(q => q.crudo !== body.crudo); save(); return json({ ok: true, crudo: body.crudo }); }
    if(path === '/api/aprendizaje/tarjeta'){ const ap = d.aprendizaje || {}, c = (ap.tarjetas || []).find(x => x.crudo === body.crudo); const dias = c && c.previa ? (c.previa[body.calidad] ?? 1) : 1;
      ap.tarjetas = (ap.tarjetas || []).filter(x => x !== c); save(); return json({ ok: true, crudo: body.crudo, dias }); }
    if(path === '/api/aprendizaje/gusto'){ const c = marcar(body.crudo, body.marca); return json({ ok: true, crudo: c || body.crudo }); }
    if(path === '/api/linkedin/decidir'){ const b = ((d.linkedin || {}).borradores || []).find(x => x.id === body.id);
      if(b){ b.estado = body.accion === 'aprobar' ? 'aprobado' : body.accion === 'tirar' ? 'tirado' : 'borrador'; if(body.texto != null) b.post = body.texto; if(body.hora) b.hora = body.hora; save(); } return json({ ok: true }); }
    if(path === '/api/linkedin/nuevo'){ d.linkedin = d.linkedin || {}; (d.linkedin.borradores = d.linkedin.borradores || []).push({ id: 'li-mine-' + Date.now().toString(36), estado: 'borrador', origen: 'pablo', pilar: '', apertura: '', creado: iso(now), hora: '', programado: '', sugerida: '', post: body.texto || '', huella: '' }); save(); return json({ ok: true }); }
    if(path === '/api/semana'){ const sem = body.destino === 'proxima' ? (d.proxima = d.proxima || { objetivos: [] }) : (d.semana = d.semana || {});
      if(body.objetivos) sem.objetivos = body.objetivos.map(texto => ({ texto, hecho: false }));
      if(body.dia != null && body.texto != null){ const dd = (sem.dias || []).find(x => x.etiqueta === body.dia || x.es_hoy); if(dd) dd.texto = body.texto; }
      save(); return json({ ok: true }); }
    if(path === '/api/trimestre'){ d.trimestre = d.trimestre || {}; if(body.quests) d.trimestre.quests = body.quests.map(texto => ({ texto, hecho: false })); save(); return json({ ok: true }); }
    if(path === '/api/manana'){ d.mananas = d.mananas || []; const m = d.mananas.find(x => x.fecha === body.fecha); if(m) m.estado = body.estado; else d.mananas.push({ fecha: body.fecha, estado: body.estado }); save(); return json({ ok: true }); }
    if(path === '/api/todoist/cerrar' || path === '/api/todoist/reabrir'){ const t = ((d.p1 || {}).tareas || []).find(x => x.id === body.id); if(t){ t.cerrada = path.endsWith('cerrar'); save(); }
      demoNote(path.endsWith('cerrar') ? 'In the real Exo this closes the task in Todoist.' : 'In the real Exo this reopens the task in Todoist.'); return json({ ok: true }); }
    if(path === '/api/correlo'){ if(body.solo_copiar){ clip(body.prompt); return json({ ok: true, donde: 'portapapeles' }); } clip(body.prompt); demoNote('In the real Exo this opens a Claude session on his Mac with this prompt. It is on your clipboard.'); return json({ ok: true, donde: 'mac' }); }
    if(path === '/api/digest/escuchado'){ const t = (d.trabajos || []).find(x => x.slug === 'digest'); if(t){ (t.pendientes || []).slice().forEach(it => marcar(it.crudo, 'x')); } return json({ ok: true }); }
    if(path === '/api/estudio/pensar'){ const sn = await get('snotas'); const n = Object.values(sn).find(x => x.ruta === body.nota);
      if(n) n.texto = n.texto.replace(/(## Lo que pensó Pablo[^\n]*\n)/, '$1\n**' + (body.cuando === 'antes' ? 'Before reading' : 'In my words') + ' · now**\n' + (body.texto || '') + '\n'); return json({ ok: true }); }
    if(path === '/api/estudio/tarjetas') return json({ ok: true, hechas: (body.tarjetas || []).map(t => ({ titulo: t.p, categoria: 'Study', proximo: iso(day(1)) })) });
    if(path === '/api/cierre/archivar' || path === '/api/semana/nueva' || path === '/api/semana/proxima/nueva' || path === '/api/registro/mio' || path === '/api/grupo/nuevo') return json({ ok: true, demo: true });
    return json({ ok: true, demo: true, crudo: body.crudo });
  }

  window.fetch = function(input, opt){
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if(/\/api\//.test(url) && new URL(url, location.href).origin === location.origin) return answer(url, opt);
    return realFetch(input, opt);
  };

  /* "Reset the demo" — back to the untouched morning */
  window.jarvisDemoReset = function(){
    const set = Storage.prototype.setItem; Storage.prototype.setItem = function(){};
    try{ wipeRun(); sessionStorage.removeItem(KEY); set.call(sessionStorage, 'jarvis-demo-visit', '1'); }catch(_){}
    location.reload();
  };

  /* a small bottom note for actions that would leave the browser in the real Exo */
  function demoNote(text){
    let n = document.getElementById('demo-note');
    if(!n){ n = document.createElement('div'); n.id = 'demo-note'; document.body.appendChild(n);
      const css = document.createElement('style'); css.textContent = '#demo-note{position:fixed;left:50%;bottom:22px;transform:translate(-50%,12px);z-index:2147482000;max-width:min(92vw,560px);padding:10px 16px;border-radius:8px;background:#0f1311;color:#D5DED9;border:1px solid #2a332e;font:12px/1.5 Inter,system-ui,sans-serif;opacity:0;pointer-events:none;transition:opacity .25s,transform .25s}#demo-note.show{opacity:1;transform:translate(-50%,0)}'; document.head.appendChild(css); }
    n.textContent = text; n.className = 'show'; clearTimeout(n._t); n._t = setTimeout(() => n.className = '', 3400);
  }
  window.jarvisDemoNote = demoNote;

  /* links into Pablo's own apps (Obsidian, Mail, WhatsApp, Word, Claude…) have nothing behind them here */
  const APP = /^(obsidian|ms-word|whatsapp|claude|things|todoist|shortcuts|message|mailto|addressbook|sms|granola|podcasts?):/i;
  const APPNAME = u => ({ obsidian:'Obsidian', 'ms-word':'Word', whatsapp:'WhatsApp', message:'Mail', mailto:'Mail', addressbook:'Contacts', sms:'Messages' }[String(u).split(':')[0].toLowerCase()] || 'an app');
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]');
    if(a && APP.test(a.getAttribute('href'))){ e.preventDefault(); e.stopPropagation(); demoNote('In the real Exo this opens ' + APPNAME(a.getAttribute('href')) + ' on Pablo\'s Mac.'); }
  }, true);
  window.open = (orig => (u, ...r) => { if(u && APP.test(String(u))){ demoNote('In the real Exo this opens ' + APPNAME(u) + ' on Pablo\'s Mac.'); return null; } return orig(u, ...r); })(window.open.bind(window));
})();
