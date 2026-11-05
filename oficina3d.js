/* Exo demo — the agents' office in 3D (round 9, after the photo Pablo sent: a bright isometric office, white walls,
   concrete floor, round coloured characters at wooden desks, a whiteboard with sticky notes, a round meeting table,
   plants, a bookshelf and a status screen). Three.js r128 (vendored, global THREE). Every character is one agent from
   /api/datos `salud`; the crowned one at the round table is the Orchestrator, with the four team orchestrators seated
   around it. Click anyone to see what they did. */
const TEAM = {
  personas: { name: 'People', hex: 0x2F6FE0, css: '#2F6FE0', rug: 0x9db7ee, at: [-6.6, -4.2] },
  compromisos: { name: 'Commitments', hex: 0xF2C12E, css: '#E0A800', rug: 0xf3dc8c, at: [6.4, -4.4] },
  pensamiento: { name: 'Thinking', hex: 0xE8452C, css: '#E8452C', rug: 0xe9a093, at: [-6.6, 4.6] },
  mantenimiento: { name: 'Upkeep', hex: 0x2FA84F, css: '#2FA84F', rug: 0x9fd3ab, at: [6.6, 4.8] },
};
const ROOM = { w: 26, d: 20 };

export function oficina3d(stage, S, onPick) {
  const T = window.THREE; if (!T || !stage || !S) return null;
  stage.innerHTML = '<div class="o3-labels"></div>';
  const labels = stage.querySelector('.o3-labels');
  const R = new T.WebGLRenderer({ antialias: true, alpha: true });
  R.setPixelRatio(Math.min(2, devicePixelRatio || 1)); R.outputEncoding = T.sRGBEncoding;
  R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap; R.setClearColor(0x000000, 0);
  stage.insertBefore(R.domElement, labels);
  const scene = new T.Scene();
  const cam = new T.OrthographicCamera(-10, 10, 10, -10, 0.1, 300); let zoomK = 1;
  const target = new T.Vector3(0, 0, 0.6);
  let yaw = Math.PI / 4, pitch = 0.66, dist = 80;
  const placeCam = () => { cam.position.set(target.x + dist * Math.cos(pitch) * Math.sin(yaw), dist * Math.sin(pitch), target.z + dist * Math.cos(pitch) * Math.cos(yaw)); cam.lookAt(target); };

  /* light: a bright, soft daylight office */
  scene.add(new T.HemisphereLight(0xffffff, 0xb9b4aa, 0.75));
  const sun = new T.DirectionalLight(0xffffff, 0.85); sun.position.set(-14, 26, 10); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 70 }); sun.shadow.bias = -0.0006; sun.shadow.radius = 4;
  scene.add(sun); scene.add(new T.AmbientLight(0xffffff, 0.18));

  const M = (c, o = {}) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.75, metalness: 0.02 }, o));
  const box = (w, h, d, mat, x, y, z, parent = scene) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  const cyl = (rt, rb, h, mat, x, y, z, parent = scene, seg = 24) => { const m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  const sph = (r, mat, x, y, z, parent = scene) => { const m = new T.Mesh(new T.SphereGeometry(r, 28, 20), mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  const canvasTex = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t; };

  /* the room: concrete floor, two white walls, a big window on the left */
  const floorTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#efede8'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { const v = 215 + Math.random() * 30 | 0; g.fillStyle = `rgba(${v},${v},${v - 4},.25)`; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 6, 2 + Math.random() * 6); } });
  floorTex.wrapS = floorTex.wrapT = T.RepeatWrapping; floorTex.repeat.set(3, 3);
  box(ROOM.w + 0.9, 0.8, ROOM.d + 0.9, M(0xd9d4cc), 0, -0.41, 0);   /* the slab the office floats on */
  const haloTex = canvasTex(256, 256, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(0,0,0,.55)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
  const halo = new T.Mesh(new T.PlaneGeometry(ROOM.w * 1.5, ROOM.d * 1.5), new T.MeshBasicMaterial({ map: haloTex, transparent: true, depthWrite: false })); halo.rotation.x = -Math.PI / 2; halo.position.y = -2.2; scene.add(halo);
  const floor = new T.Mesh(new T.PlaneGeometry(ROOM.w, ROOM.d), M(0xf3f1ec, { map: floorTex, roughness: 0.92 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wallM = M(0xf1f0ec, { roughness: 0.95 });
  box(ROOM.w, 3.6, 0.3, wallM, 0, 1.8, -ROOM.d / 2 - 0.15);
  box(0.3, 3.6, ROOM.d, wallM, -ROOM.w / 2 - 0.15, 1.8, 0);
  const frameM = M(0x3a3f47), glassM = M(0xcfe3f2, { transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.1 });
  [[-6, 4.4], [1.2, 4.4]].forEach(([z, w]) => { box(0.08, 1.9, w, glassM, -ROOM.w / 2 + 0.02, 2.05, z + w / 2); box(0.14, 0.12, w, frameM, -ROOM.w / 2 + 0.05, 1.1, z + w / 2); box(0.14, 0.12, w, frameM, -ROOM.w / 2 + 0.05, 3.0, z + w / 2); for (let i = 0; i <= 2; i++) box(0.14, 2.0, 0.1, frameM, -ROOM.w / 2 + 0.05, 2.05, z + i * w / 2); });

  /* furniture */
  const wood = M(0xC99A64, { roughness: 0.6 }), white = M(0xf4f4f2), dark = M(0x2a2e35, { roughness: 0.4 }), screenM = M(0xdfe8f5, { emissive: 0x9fb4d8, emissiveIntensity: 0.35 });
  const chairM = M(0xd9d5cc), chairDark = M(0x55585e);
  function desk(x, z, rot) {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
    box(2.6, 0.12, 1.3, wood, 0, 1.15, 0, g); box(0.08, 1.1, 1.2, white, -1.2, 0.57, 0, g); box(0.7, 1.05, 1.15, white, 0.9, 0.55, 0, g);
    box(0.05, 0.75, 1.1, dark, 0.2, 1.62, -0.3, g).rotation.y = Math.PI / 2; const s = box(1.0, 0.62, 0.04, screenM, 0.2, 1.62, -0.32, g); s.castShadow = false;
    box(0.1, 0.3, 0.1, dark, 0.2, 1.3, -0.4, g); box(0.7, 0.03, 0.25, dark, 0.2, 1.22, 0.1, g);
    const lamp = cyl(0.03, 0.03, 0.6, white, -0.85, 1.5, -0.35, g); sph(0.1, white, -0.85, 1.82, -0.25, g); void lamp;
    return g;
  }
  function chair(x, z, rot, mat = chairM) { const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
    box(0.85, 0.1, 0.8, mat, 0, 0.72, 0, g); box(0.85, 0.75, 0.1, mat, 0, 1.12, 0.38, g); cyl(0.05, 0.05, 0.6, chairDark, 0, 0.4, 0, g, 8); cyl(0.38, 0.38, 0.05, chairDark, 0, 0.08, 0, g, 5); return g; }
  function plant(x, z, s = 1) { const g = new T.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g);
    cyl(0.32, 0.25, 0.6, white, 0, 0.3, 0, g); const leaf = M(0x3f8a4a, { roughness: 0.8 });
    for (let i = 0; i < 7; i++) { const c = new T.Mesh(new T.ConeGeometry(0.14, 0.9, 6), leaf); const a = i / 7 * Math.PI * 2; c.position.set(Math.cos(a) * 0.12, 0.95, Math.sin(a) * 0.12); c.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); c.castShadow = true; g.add(c); } return g; }
  function rug(x, z, w, d, color, round) { const m = new T.Mesh(round ? new T.CircleGeometry(w, 48) : new T.PlaneGeometry(w, d), M(color, { roughness: 1 })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, z); m.receiveShadow = true; scene.add(m); return m; }

  /* the back wall: bookshelf, whiteboard with sticky notes, the status screen, a water cooler */
  const shelf = new T.Group(); shelf.position.set(-9.2, 0, -ROOM.d / 2 + 0.55); scene.add(shelf);
  box(2.6, 2.4, 0.8, white, 0, 1.2, 0, shelf); const bookC = [0x7a5c3c, 0x3d5a80, 0xb5523b, 0x8a8f5a, 0x5a4a6a, 0xc7a35a];
  [0.55, 1.35, 2.0].forEach((y, r) => { for (let i = 0; i < 8; i++) box(0.18, 0.5 - (i % 3) * 0.06, 0.55, M(bookC[(i + r) % 6]), -1.05 + i * 0.27, y, 0.05, shelf); });
  plant(-9.6, -ROOM.d / 2 + 0.55, 0.6).position.y = 2.4;
  const board = new T.Group(); board.position.set(1.6, -0.7, -ROOM.d / 2 + 0.4); scene.add(board);
  box(3.6, 2.2, 0.08, white, 0, 2.6, 0, board); box(3.75, 0.1, 0.14, M(0xb9bcc2), 0, 1.45, 0.05, board);
  [[-1.25, 0], [1.25, 0]].forEach(([x]) => cyl(0.05, 0.05, 1.5, M(0xb9bcc2), x, 0.75, 0.15, board, 8));
  for (let i = 0; i < 14; i++) box(0.36, 0.34, 0.02, M(i % 5 === 3 ? 0x9fd6f0 : 0xf7d84a), -1.3 + (i % 7) * 0.42, 3.15 - Math.floor(i / 7) * 0.48 - (i % 2) * 0.05, 0.06, board);
  const statusTex = canvasTex(512, 300, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#2F6FE0'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(22 + i * 16, 22, 5, 0, 7); g.fill(); }
    g.fillStyle = '#1b1f27'; g.font = '700 30px Inter, sans-serif'; g.fillText('AGENTS · LAST NIGHT', 20, 76); g.font = '600 13px Inter, sans-serif'; g.fillStyle = '#666'; g.fillText('RAN AT 3:00', 20, 110);
    g.font = '700 64px Inter, sans-serif'; g.fillStyle = '#1b1f27'; g.fillText(String(S.cuenta.verde + S.cuenta.amarillo), 20, 178); g.font = '500 18px Inter, sans-serif'; g.fillStyle = '#666'; g.fillText('of ' + S.agentes.length + ' worked', 110, 176);
    g.fillStyle = '#E8452C'; g.font = '600 18px Inter, sans-serif'; g.fillText('1 needs your decision', 20, 214);
    g.strokeStyle = '#2F6FE0'; g.lineWidth = 3; g.beginPath(); [[250, 260], [290, 230], [330, 245], [370, 200], [410, 215], [450, 170], [490, 160]].forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
    g.fillStyle = 'rgba(47,111,224,.12)'; g.lineTo(490, 290); g.lineTo(250, 290); g.fill(); });
  const scr = new T.Mesh(new T.PlaneGeometry(3.4, 2.0), new T.MeshBasicMaterial({ map: statusTex, toneMapped: false })); scr.position.set(9.4, 2.0, -ROOM.d / 2 + 0.06); scene.add(scr);
  box(3.6, 2.2, 0.06, dark, 9.4, 2.0, -ROOM.d / 2 + 0.02);
  cyl(0.3, 0.3, 1.2, white, -2.6, 0.6, -ROOM.d / 2 + 0.6); cyl(0.26, 0.26, 0.7, M(0x8cc4ea, { transparent: true, opacity: 0.8 }), -2.6, 1.55, -ROOM.d / 2 + 0.6);
  plant(-12.2 + 0.6, -ROOM.d / 2 + 0.7, 1.1); plant(12.3, -ROOM.d / 2 + 0.7, 1.0); plant(-12.2 + 0.6, 8.6, 0.9); plant(11.8, 9.0, 0.8);
  /* the printer table, front right like the photo */
  box(2.4, 0.1, 1.0, wood, 9.6, 0.95, 8.6); [[-1.1, -0.42], [1.1, -0.42], [-1.1, 0.42], [1.1, 0.42]].forEach(([x, z]) => box(0.08, 0.9, 0.08, wood, 9.6 + x, 0.45, 8.6 + z)); box(0.9, 0.55, 0.7, dark, 9.9, 1.28, 8.6); box(0.5, 0.4, 0.4, white, 9.0, 1.2, 8.6);

  /* team zones: a coloured rug, desks; the round table in the middle is where the orchestrators meet */
  const by = {}; S.agentes.forEach(a => { if (a.id === 'lider') return; const k = TEAM[a.orquestador] ? a.orquestador : 'mantenimiento'; (by[k] = by[k] || []).push(a); });
  const spots = [];   // [agent, x, z, rot, seated]
  Object.entries(TEAM).forEach(([k, t]) => {
    const [cx, cz] = t.at, xs = by[k] || [];
    rug(cx, cz, 9.2, 6.4, t.rug);
    const cols = 4, DX = 2.15;
    xs.forEach((a, i) => { const c = i % cols, r = Math.floor(i / cols), x = cx - 3.25 + c * DX + (r % 2) * 0.5, z = cz - 1.9 + r * 2.7;
      chair(x, z - 0.15, Math.PI); const d = desk(x - 0.18, z + 0.95, Math.PI); d.scale.set(0.72, 1, 0.75);
      spots.push([a, x, z, 0, true]); });
  });
  rug(0, 0.3, 2.9, 0, 0x55595f, true);
  cyl(1.25, 1.25, 0.08, white, 0, 1.12, 0.3); cyl(0.12, 0.12, 1.1, M(0xb9bcc2), 0, 0.56, 0.3, scene, 10); cyl(0.6, 0.6, 0.05, M(0xb9bcc2), 0, 0.05, 0.3);
  plant(0.4, 0.0, 0.35).position.y = 1.16;

  /* the characters */
  const people = [], pickables = [];
  const eyeW = M(0xffffff, { roughness: 0.3 }), eyeB = M(0x111111, { roughness: 0.2 });
  function blob(color, opts = {}) {
    const g = new T.Group(), mat = M(color, { roughness: 0.55 }), s = opts.scale || 1;
    const inner = new T.Group(); g.add(inner); inner.scale.setScalar(s);
    const body = sph(0.5, mat, 0, 0.95, 0, inner); body.scale.set(1, 1.15, 0.9);
    const head = sph(0.58, mat, 0, 1.78, 0, inner); head.scale.set(1, 0.95, 0.95);
    const eyes = new T.Group(); eyes.position.set(0, 1.86, 0.48); inner.add(eyes);
    [-0.2, 0.2].forEach(x => { const w = sph(0.14, eyeW, x, 0, 0, eyes); w.scale.z = 0.6; const p = sph(0.075, eyeB, x, -0.01, 0.07, eyes); p.scale.z = 0.6; });
    const arms = [-1, 1].map(sx => { const p = new T.Group(); p.position.set(sx * 0.48, 1.18, 0); inner.add(p); const a = cyl(0.11, 0.11, 0.55, mat, 0, -0.25, 0, p, 10); sph(0.11, mat, 0, -0.52, 0, p); void a; p.rotation.z = sx * 0.25; return p; });
    const legs = [-1, 1].map(sx => { const p = new T.Group(); p.position.set(sx * 0.2, 0.55, 0); inner.add(p); cyl(0.13, 0.13, 0.45, mat, 0, -0.22, 0, p, 10); sph(0.15, mat, 0, -0.46, 0.04, p).scale.set(1, 0.7, 1.3); return p; });
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return { g, inner, mat, body, head, eyes, arms, legs };
  }
  function crown(parent, y, big) { const gold = M(0xF5B700, { roughness: 0.3, metalness: 0.6, emissive: 0x7a5200, emissiveIntensity: 0.25 }), c = new T.Group(); c.position.y = y; parent.add(c);
    cyl(big ? 0.34 : 0.26, big ? 0.34 : 0.26, 0.16, gold, 0, 0, 0, c, 20); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, r = big ? 0.32 : 0.24, k = new T.Mesh(new T.ConeGeometry(0.07, 0.22, 6), gold); k.position.set(Math.cos(a) * r, 0.17, Math.sin(a) * r); c.add(k); }
    return c; }
  function ring(parent, color, r) { const m = new T.Mesh(new T.RingGeometry(r * 0.82, r, 40), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: T.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.y = 0.04; parent.add(m); return m; }

  function addPerson(a, x, z, rot, seated, opts = {}) {
    const k = TEAM[a.orquestador] ? a.orquestador : 'mantenimiento';
    const down = a.color === 'rojo', idle = a.color === 'gris', look = a.color === 'amarillo';
    const color = opts.color != null ? opts.color : TEAM[k].hex;
    const b = blob(color, opts); b.g.position.set(x, 0, z); b.g.rotation.y = rot; scene.add(b.g);
    if (seated) { b.inner.position.y = -0.12; b.legs.forEach(l => { l.rotation.x = -1.4; l.position.z = 0.05; }); }
    if (idle) { b.mat.transparent = true; b.mat.opacity = 0.55; b.eyes.scale.y = 0.15; }
    if (down) { b.mat.color.lerp(new T.Color(0x9a9a9a), 0.45); }
    const p = { a, b, x, z, rot, seated, down, idle, look, phase: Math.random() * 6.28, label: null, kind: opts.kind || 'agent', team: k };
    if (down) p.ringM = ring(b.g, 0xE8452C, 1.0);
    if (look) p.ringM = ring(b.g, 0xF2A400, 0.85);
    if (opts.crown) crown(b.inner, 2.42, opts.crown === 'big');
    if (opts.kind === 'lead' || opts.kind === 'chief') ring(b.g, opts.kind === 'chief' ? 0xF5B700 : TEAM[k].hex, opts.kind === 'chief' ? 1.05 : 0.8);
    b.g.traverse(o => { if (o.isMesh) { o.userData.pid = people.length; pickables.push(o); } });
    people.push(p); return p;
  }
  spots.forEach(([a, x, z, r, s]) => addPerson(a, x, z, r, s));
  /* the round table: the Orchestrator (crowned) and the four team orchestrators */
  const lider = S.agentes.find(a => a.id === 'lider');
  if (lider) addPerson(lider, 0, 1.9, Math.PI / 4, false, { crown: 'big', kind: 'chief', color: 0x7b5cff, scale: 1.15 });
  Object.entries(TEAM).forEach(([k, t], i) => {
    const [x, z] = [[-1.5, -1.05], [1.5, -1.05], [-1.75, 1.35], [1.75, 1.35]][i];
    chair(x, z, Math.atan2(x, z - 0.3) + Math.PI, chairDark);
    addPerson({ id: 'orq-' + k, nombre: t.name + ' orchestrator', orquestador: k, color: 'verde', lead: true }, x, z, Math.atan2(-x, 0.3 - z), true, { crown: 'small', kind: 'lead' });
  });

  const badgeTex = {}; [['ok', '#2fbf71', '✓'], ['look', '#F2A400', '?'], ['down', '#E8452C', '!'], ['idle', '#6b7280', 'z']].forEach(([k, c, ch]) => {
    badgeTex[k] = canvasTex(128, 128, (g) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(64, 64, 50, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '700 64px Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 64, 70); }); });
  people.forEach(p => { if (p.kind !== 'agent') return; const k = p.down ? 'down' : p.look ? 'look' : p.idle ? 'idle' : 'ok';
    const sp = new T.Sprite(new T.SpriteMaterial({ map: badgeTex[k], depthTest: false })); sp.scale.setScalar(p.down ? 0.8 : 0.55); sp.position.set(0, p.seated ? 2.75 : 2.9, 0); sp.renderOrder = 5; p.b.g.add(sp); p.badge = sp; });

  /* labels over the 3D: the Orchestrator, the team orchestrators, the one that needs him; names on hover */
  people.forEach((p, i) => {
    const el = document.createElement('div'); el.dataset.pid = i;
    if (p.kind === 'chief') { el.className = 'o3-l chief'; el.innerHTML = '<b>Orchestrator</b><span>runs all 28 · reports to Pablo</span>'; }
    else if (p.kind === 'lead') { el.className = 'o3-l lead'; el.style.setProperty('--c', TEAM[p.team].css); el.innerHTML = `<b>${TEAM[p.team].name}</b><span>orchestrator</span>`; }
    else if (p.down) { el.className = 'o3-l down'; el.innerHTML = `<b>${p.a.nombre}</b><span>needs your decision</span>`; }
    else { el.className = 'o3-l tag'; el.innerHTML = `<b>${p.a.nombre}</b><span>${String(p.a.mensaje || p.a.titulo || '').split(/[;:.](\s|$)/)[0].slice(0, 60)}</span>`; }
    el.onclick = () => pick(i);
    labels.appendChild(el); p.label = el;
  });
  const zoneLabels = Object.entries(TEAM).map(([k, t]) => { const el = document.createElement('div'); el.className = 'o3-zone'; el.style.setProperty('--c', t.css); el.textContent = `${t.name} · ${(by[k] || []).length}`; labels.appendChild(el); return [el, new T.Vector3(t.at[0] - 3.4, 0.05, t.at[1] + 3.0)]; });

  /* picking */
  const ray = new T.Raycaster(), ptr = new T.Vector2(); let hover = -1, sel = -1, talk = -1;
  function hit(e) { const r = R.domElement.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, cam); const h = ray.intersectObjects(pickables, false)[0]; return h ? h.object.userData.pid : -1; }
  function pick(i) { sel = i; const p = people[i]; if (p && onPick) onPick(p.a.lead ? 'team:' + p.team : p.a.id); }
  let drag = null;
  R.domElement.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw, pitch, moved: false }; });
  addEventListener('pointerup', e => { if (!drag) return; const d = drag; drag = null; if (!d.moved && e.target === R.domElement) { const i = hit(e); if (i >= 0) pick(i); } });
  R.domElement.addEventListener('pointermove', e => {
    if (drag && (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4)) { drag.moved = true; yaw = drag.yaw - (e.clientX - drag.x) * 0.006; pitch = Math.max(0.35, Math.min(1.25, drag.pitch + (e.clientY - drag.y) * 0.004)); placeCam(); }
    hover = hit(e); R.domElement.style.cursor = hover >= 0 ? 'pointer' : drag ? 'grabbing' : 'grab'; });
  R.domElement.addEventListener('pointerleave', () => { hover = -1; });
  R.domElement.addEventListener('wheel', e => { e.preventDefault(); zoomK = Math.min(2.6, Math.max(0.8, zoomK * (e.deltaY > 0 ? 0.92 : 1.08))); size(); }, { passive: false });

  /* size */
  function size() { const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; R.setSize(w, h, false); const asp = w / h; let span = (asp < 1 ? ROOM.w * 0.56 / asp : ROOM.d * 0.56 + (asp < 1.4 ? 2.5 : 0)) / zoomK; cam.left = -span * asp; cam.right = span * asp; cam.top = span; cam.bottom = -span; cam.updateProjectionMatrix(); placeCam(); }
  const ro = new ResizeObserver(size); ro.observe(stage); size();

  /* one speech bubble at a time, like people talking across an office */
  const talkers = people.map((p, i) => i).filter(i => people[i].kind === 'agent' && !people[i].idle && !people[i].down);
  let tn = 0; const talkT = setInterval(() => { talk = talkers[tn++ % talkers.length]; }, 2600); talk = talkers[0];

  /* the loop */
  const v = new T.Vector3(); let alive = true, t0 = performance.now();
  function frame() {
    if (!alive) return;
    if (!stage.isConnected) { destroy(); return; }
    const t = (performance.now() - t0) / 1000;
    people.forEach((p, i) => { const b = p.b, ph = t * 2 + p.phase;
      if (p.idle) { b.inner.position.y = (p.seated ? -0.12 : 0) + Math.sin(t * 0.8 + p.phase) * 0.02; }
      else if (p.down) { b.inner.rotation.z = Math.sin(t * 9) * (Math.sin(t * 1.3) > 0.85 ? 0.08 : 0); b.inner.position.y = 0; }
      else if (p.seated) { b.arms.forEach((a, j) => a.rotation.x = -1.1 + Math.sin(ph * 4 + j * 2) * 0.12); b.head.rotation.y = Math.sin(ph * 0.3) * 0.2; }
      else { b.inner.position.y = Math.abs(Math.sin(ph)) * 0.08; b.arms[1].rotation.z = 0.25 + (i % 5 === 0 ? 0.9 + Math.sin(ph * 2) * 0.5 : Math.sin(ph) * 0.1); b.arms[0].rotation.z = -0.25 - Math.sin(ph) * 0.1; }
      if (p.ringM) p.ringM.material.opacity = 0.5 + Math.sin(t * 4) * 0.35;
      if (p.badge && p.down) p.badge.scale.setScalar(0.8 + Math.sin(t * 5) * 0.12);
      const isSel = i === sel; b.inner.scale.setScalar((p.kind === 'chief' ? 1.15 : 1) * (isSel ? 1.12 : i === hover ? 1.06 : 1));
      /* label */
      if (p.kind === 'chief') v.set(p.x - 1.9, 0.05, p.z + 1.4); else v.set(p.x, p.seated ? 2.75 : 2.85, p.z); v.project(cam);
      const el = p.label, show = p.kind === 'chief' || p.down || i === hover || i === sel || (i === talk && p.kind === 'agent');
      el.classList.toggle('on', show); el.classList.toggle('sel', isSel); el.classList.toggle('talk', i === talk && p.kind === 'agent' && !p.down && i !== hover && i !== sel);
      if (show) { el.style.transform = `translate(-50%,${p.kind === 'chief' ? '0' : '-100%'}) translate(${((v.x + 1) / 2 * stage.clientWidth).toFixed(1)}px,${((1 - v.y) / 2 * stage.clientHeight).toFixed(1)}px)`; el.style.zIndex = String(1000 - Math.round(v.z * 500)); }
    });
    zoneLabels.forEach(([el, w]) => { v.copy(w).project(cam); el.style.transform = `translate(${((v.x + 1) / 2 * stage.clientWidth).toFixed(1)}px,${((1 - v.y) / 2 * stage.clientHeight).toFixed(1)}px)`; });
    R.render(scene, cam); requestAnimationFrame(frame);
  }
  placeCam(); requestAnimationFrame(frame);
  function destroy() { alive = false; clearInterval(talkT); ro.disconnect(); R.dispose(); }
  return {
    select(id) { sel = people.findIndex(p => p.a.id === id || 'team:' + p.team === id && p.a.lead); },
    fix(id) { const p = people.find(x => x.a.id === id); if (!p) return; p.down = false; p.b.mat.color.set(TEAM[p.team].hex); if (p.badge) { p.badge.material.map = badgeTex.ok; p.badge.scale.setScalar(0.55); } if (p.ringM) { p.ringM.parent.remove(p.ringM); p.ringM = null; } p.label.className = 'o3-l tag'; p.label.innerHTML = `<b>${p.a.nombre}</b><span>back to work · runs tonight at 23:00</span>`; talk = people.indexOf(p); },
    destroy,
  };
}
