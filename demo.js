/* Exo — public demo shim for the v3 panel.
   The real panel talks to a small server on Pablo's Mac that reads his second brain. This file stands in for it:
   every /api/... call is answered from the invented data in data/, dates are relative to the viewer's own day,
   decisions change an in-memory copy for this tab, and nothing is ever sent. */
/* the demo always runs on Pablo's morning: 9:10 AM on the viewer's day, so every meeting, "today" and "prep ready" holds.
   ?at=HH:MM moves it (testing). */
(function () {
  const m = /[?&]at=(\d{1,2}):(\d{2})/.exec(location.search) || [null, '9', '10'];
  const R = Date, t = new R(); t.setHours(+m[1], +m[2], 0, 0); const off = t - R.now();
  class D extends R { constructor(...a) { a.length ? super(...a) : super(R.now() + off); } static now() { return R.now() + off; } }
  window.Date = D;
})();
(function () {
  'use strict';
  const BASE = new URL('.', document.currentScript ? document.currentScript.src : location.href).href;
  const realFetch = window.fetch.bind(window);
  const cache = {};
  const state = { lastPrompt: '', marked: new Set() };

  /* ── dates: {{D+n}} ISO · {{W+n}} weekday · {{F+n}} "Nov 3" ───────────────── */
  const pad = n => (n < 10 ? '0' : '') + n;
  function dayN(n) { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d; }
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  function tok(s) {
    return s.replace(/\{\{([DWF])([+-]\d+)\}\}/g, (_, k, n) => {
      const d = dayN(parseInt(n, 10));
      if (k === 'D') return iso(d);
      if (k === 'W') return d.toLocaleDateString('en-US', { weekday: 'long' });
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
  }
  function deep(v) { if (typeof v === 'string') return v.includes('{{') ? tok(v) : v; if (Array.isArray(v)) return v.map(deep); if (v && typeof v === 'object') { const o = {}; for (const k in v) o[k] = deep(v[k]); return o; } return v; }
  window.DEMO_TODAY = iso(dayN(0));

  /* ── data files ─────────────────────────────────────────────────────────── */
  function load(name) {
    if (!cache[name]) cache[name] = realFetch(BASE + 'data/' + name + '.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(j => j == null ? null : deep(j)).catch(() => null);
    return cache[name];
  }
  const slug = s => (s || '').split('/').pop().replace(/\.md$/i, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  async function nota(nombre) {
    const idx = await load('nota__index');
    let f = idx && (idx[nombre] || idx[decodeURIComponent(nombre)]);
    if (f) f = f.replace(/^data\//, '').replace(/\.json$/, '');
    let n = f ? await load(f) : null;
    if (!n) n = await load('nota__' + slug(nombre));
    if (!n) { const raw = (nombre || '').split('/').pop().replace(/\.md$/i, '').toLowerCase(); n = await load('nota__' + raw); }
    return n;
  }
  const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
  const ok = () => json({ ok: true });

  /* ── seed: today's outreach count, the run's "started" so Home does not bounce ── */
  try {
    const k = 'jarvis-outreach-' + window.DEMO_TODAY;
    if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify(['crack-jonah-feldstein-reply', 'seg-priya-raman']));
  } catch (_) { }

  /* ── the router ─────────────────────────────────────────────────────────── */
  async function route(path, q, opt) {
    const body = opt && opt.body ? (typeof opt.body === 'string' ? JSON.parse(opt.body) : opt.body) : null;
    const post = !!body || !!(opt && (opt.method || 'GET').toUpperCase() === 'POST');

    if (path === '/api/datos') {
      const d = await load('datos'); if (!d) return json({ error: 'no data' }, 500);
      /* decisions taken in this tab: a marked row stops being pending */
      if (state.marked.size && Array.isArray(d.trabajos)) d.trabajos.forEach(t => (t.pendientes || []).forEach(p => { if (state.marked.has(p.decision_id || p.linea || p.crudo)) p.estado = 'hecho'; }));
      try { const g = sessionStorage.getItem('ov-goal'); const t = d.semana && Array.isArray(d.semana.dias) && d.semana.dias.find(x => x.es_hoy); if (g && t) t.texto = g; } catch (_) { }
      return json(d);
    }
    if (path === '/api/marcar' && body) { state.marked.add(body.decision_id || body.linea || body.crudo); return ok(); }
    if (path === '/api/nota') { const n = await nota(q.get('nombre') || ''); return n ? json(n) : json({ error: 'not in the demo' }, 404); }
    if (path === '/api/v3/buscar') {
      const d = await load('v3_buscar'); const s = (q.get('q') || '').toLowerCase().trim();
      const all = (d && d.resultados) || [];
      return json({ q: s, resultados: s ? all.filter(r => [r.titulo, r.fragmento, r.ruta, r.carpeta].join(' ').toLowerCase().includes(s)).slice(0, 12) : all.slice(0, 8) });
    }
    if (path === '/api/v3/claude') {
      const d = await load('v3_claude');
      if (post) { state.lastPrompt = (body && body.prompt) || ''; return json({ id: 'demo-' + Date.now() }); }
      const a = (d && d.answers) || {}; const p = state.lastPrompt.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const k = Object.keys(a).find(x => x !== 'default' && p.includes(x)) || 'default';
      const v = a[k]; return json({ estado: 'listo', texto: (v && typeof v === 'object' ? v.texto : v) || 'In the real panel this answers from the 2,311 notes of his second brain.' });
    }
    if (path === '/api/v3/dia') return json((await load('v3_dia')) || { estado: 'listo', texto: '' });
    if (path === '/api/v3/junta') return json((await load('v3_junta__' + (q.get('id') || ''))) || { texto: '' });
    if (path === '/api/v3/agenda') return json((await load('v3_agenda')) || { hoy: [], dias: [] });
    if (path === '/api/corridas') return json((await load('corridas')) || { corridas: [] });
    if (path === '/api/v3/tarjetas') return json((await load('v3_tarjetas')) || { archivo: [], claude: { estado: 'listo', items: [] } });
    if (path === '/api/v3/correo/enviar') return json({ ok: true, desde: 'demo — nothing is sent' });
    if (path === '/api/semana' && post) return ok();
    if (path === '/api/semana/nueva') return ok();
    if (path === '/api/correlo' || path === '/api/fallo' || path.startsWith('/api/todoist/') || path === '/api/v3/tarjetas/descartar' || path === '/api/bentley/tarjeta' || path === '/api/aprendizaje/tarjeta' || path === '/api/aprendizaje/nueva-tarjeta') {
      const f = path.replace(/^\/api\//, '').replace(/\//g, '_'); const d = await load(f); return json(d || { ok: true, dias: null });
    }
    if (path === '/api/nube' || path === '/api/v3/voz' || path === '/api/v3/nube/enlace' || path === '/api/semana') return json({ error: 'not in the demo' }, 404);

    /* generic: /api/x/y → data/x_y.json */
    const name = path.replace(/^\/api\//, '').replace(/\/$/, '').replace(/\//g, '_');
    const d = await load(name);
    return d ? json(d) : json({ error: 'not in the demo: ' + path }, 404);
  }

  window.fetch = function (input, opt) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const u = new URL(url, location.href);
    if (!u.pathname.startsWith('/api/') && !u.pathname.includes('/api/')) return realFetch(input, opt);
    const path = '/api/' + u.pathname.split('/api/')[1].replace(/\/+$/, '');
    return route(path, u.searchParams, opt || {}).catch(e => json({ error: String(e) }, 500));
  };
  window.DEMO = { reset() { try { Object.keys(localStorage).filter(k => k.startsWith('jarvis')).forEach(k => localStorage.removeItem(k)); } catch (_) { } location.reload(); } };
})();
