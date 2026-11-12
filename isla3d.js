/* Agents Island (2026-11-11) — the agents map as a living island, for Pablo's talk "30 Agents and a Second Brain".
   Three.js r128 (vendored, global THREE). Everything is built in code: terrain, water, sky, buildings, people.
   Real data only: every agent in /api/datos `salud.agentes` is a character. An agent WORKS on the island only if
   its last run is dated today (Boston); otherwise it stands at its post. Red = broken (a "!" over its head),
   amber = watch. Live voices (rol en-vivo) sit on a bench: they work only when Pablo opens a chat with them.
   Districts = the four orchestrators; the morning run (rol jefe) stands at the second brain in the plaza with the
   four leads around it. Agents that wrote something today carry a glowing cube to the brain.
   Dev: ?manualFrames=1 → window.__step(n) advances n frames (hidden tabs do not render).
   2026-11-12: one module, two uses. `/isla` calls isla3d(stage, null, null, {full: true}) — HUD, tour, its own card,
   reads /api/datos itself. Exo's Agents page (oficina.js) calls isla3d(stage, vista(), onPick) — the island only; a
   click calls onPick(id) so the page's side panel shows exactly what the office showed (leads → 'team:<k>').
   Same API as the old office: select(id), marcar(m), count, destroy(). */
const ISL_CSS = `.isl-labels{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:2}
.isl-tag{position:absolute;left:0;top:0;white-space:nowrap;font:600 11px/15px Inter,system-ui,sans-serif;padding:2px 7px 2px 6px;border-radius:9px;background:rgba(14,20,28,.8);color:#fff;display:none;will-change:transform}
.isl-tag i{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px;vertical-align:0}
.isl-tag.red{background:#c9372b}.isl-tag.amber{background:#b67b0a}.isl-tag.fix{background:#2f6fe0}.isl-tag.fixed{background:#0f9488}
.isl-tag.sel{outline:2px solid #fff;outline-offset:1px}
.isl-sign{position:absolute;left:0;top:0;white-space:nowrap;font:700 13px Inter,system-ui,sans-serif;padding:5px 11px 5px 9px;border-radius:12px;background:rgba(255,255,255,.9);color:#16202a;box-shadow:0 2px 10px rgba(0,0,0,.18);display:none;will-change:transform}
.isl-sign b{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:7px}
.isl-sign span{font-weight:500;color:#566472;margin-left:6px}
.isl-sign small{display:block;font-size:11px;font-weight:500;color:#566472;margin:1px 0 0 16px}
.isl-bar{position:absolute;right:12px;bottom:12px;z-index:3;display:flex;gap:4px;padding:4px;border-radius:12px;background:rgba(20,28,38,.72);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.isl-bar button{font:600 12px Inter,system-ui,sans-serif;color:#eef3f7;background:transparent;border:0;border-radius:9px;padding:6px 10px;cursor:pointer}
.isl-bar button.on{background:rgba(255,255,255,.16)}
.isl-hint{position:absolute;left:12px;bottom:12px;z-index:3;font:500 11.5px Inter,system-ui,sans-serif;color:#dfe7ee;padding:6px 10px;border-radius:10px;background:rgba(20,28,38,.6);pointer-events:none}
.isl-cv{cursor:grab}.isl-cv.drag{cursor:grabbing}.isl-cv.point{cursor:pointer}`;
export function isla3d(stage, S0, onPick, opts) {
opts = opts || {};
const FULL = !!opts.full;
const T = window.THREE;
if (!T || !stage) return null;
if (!document.getElementById('isl-css')) { const st = document.createElement('style'); st.id = 'isl-css'; st.textContent = ISL_CSS; document.head.appendChild(st); }
if (getComputedStyle(stage).position === 'static') stage.style.position = 'relative';
const W = () => stage.clientWidth || innerWidth, H = () => stage.clientHeight || innerHeight;
const offs = [];   /* window listeners, removed by destroy() */
const on = (t, ev, f, o) => { t.addEventListener(ev, f, o); offs.push(() => t.removeEventListener(ev, f, o)); };
const Q = new URLSearchParams(location.search);
const MANUAL = Q.get('manualFrames') === '1';
const DUMMY = () => document.createElement('div');
const $ = id => (FULL && document.getElementById(id)) || DUMMY();
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const col = h => new T.Color(h).convertSRGBToLinear();

const TEAM = {
  personas: { name: 'People', hex: 0x2F6FE0, css: '#4C86F0' },
  compromisos: { name: 'Commitments', hex: 0xF2C12E, css: '#F2C12E' },
  pensamiento: { name: 'Thinking', hex: 0xE8452C, css: '#F0644C' },
  mantenimiento: { name: 'Upkeep', hex: 0x2FA84F, css: '#3CC064' },
  fuera: { name: 'On their own', hex: 0x8A93A0, css: '#A9B2BE' },
};
const equipoDe = a => TEAM[a.equipo] ? a.equipo : TEAM[a.orquestador] ? a.orquestador : (a.rol === 'script' ? 'mantenimiento' : 'fuera');

/* ── places ──────────────────────────────────────────────────────────────── */
const PLAZA = { x: 0, z: 5, r: 10, h: 1.5 };
const DIST = {
  personas: { x: -25, z: 17, r: 12, h: 1.5 },
  compromisos: { x: 25, z: 17, r: 11, h: 1.5 },
  pensamiento: { x: -24, z: -9, r: 12, h: 3.0 },
  mantenimiento: { x: 25, z: -9, r: 14, h: 2.0 },
  fuera: { x: 0, z: 33, r: 6.5, h: 1.2 },
};
Object.values(DIST).forEach(d => { d.a = Math.atan2(PLAZA.x - d.x, PLAZA.z - d.z); });   /* local +z faces the plaza */
const SUMMIT = { x: 0, z: -37 };
/* the maintenance shop: every agent flagged red today stands here, whatever its team */
const SHOP = { x: 0, z: -15, r: 9, h: 2.0 };
const ZONES = () => [PLAZA, ...Object.values(DIST), SHOP];
const TAG = {
  personas: 'Who you know, and who to write to next',
  compromisos: 'What you promised, and what is coming up',
  pensamiento: 'What you learn, and how you think',
  mantenimiento: 'Keeps every channel copied and every job honest',
  fuera: 'Your day and your time',
};
const PATHS = [[PLAZA, DIST.personas], [PLAZA, DIST.compromisos], [PLAZA, DIST.pensamiento], [PLAZA, DIST.mantenimiento],
  [PLAZA, DIST.fuera], [DIST.fuera, { x: 0, z: 50 }], [PLAZA, SHOP]];

/* ── terrain ─────────────────────────────────────────────────────────────── */
const sm = (a, b, t) => { t = Math.min(1, Math.max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t); };
const n2 = (x, z) => Math.sin(x * .11 + 1.3) * Math.cos(z * .13 - .7) * .5 + Math.sin(x * .27 - z * .21 + 2.1) * .25 + Math.sin(x * .53 + z * .47) * .12;
const shoreR = th => 55 + 4 * Math.sin(3 * th + .5) + 2.6 * Math.sin(7 * th + 1.7) + 1.4 * Math.sin(11 * th);
function segDist(px, pz, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, L = dx * dx + dz * dz;
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (pz - a.z) * dz) / L));
  return Math.hypot(px - a.x - t * dx, pz - a.z - t * dz);
}
const pathD = (x, z) => Math.min(...PATHS.map(p => segDist(x, z, p[0], p[1])));
function heightAt(x, z) {
  const d = Math.hypot(x, z), th = Math.atan2(z, x), R = shoreR(th);
  const land = sm(R + 2, R - 7, d);
  let h = -4.5 + land * (4.5 + 1.3 + n2(x, z) * .9);
  /* mountains: a ridge across the back, wrapping the sides */
  const back = sm(-6, -30, z) * sm(R + 1, R - 12, d);
  const side = sm(R - 4, R - 16, d) * sm(R + 1, R - 7, d) * sm(10, -12, z) * .55;
  const m = Math.max(back, side);
  if (m > 0) {
    const spikes = Math.abs(Math.sin(x * .31 + n2(x, z) * 2.2)) * Math.abs(Math.cos(z * .23 + x * .05));
    h += m * (7 + 9 * spikes + 4 * n2(x * 1.7, z * 1.7));
  }
  h += 17 * Math.exp(-((x - SUMMIT.x) ** 2 + (z - SUMMIT.z) ** 2) / 140) * land;
  /* flat ground for the plaza and the districts */
  ZONES().forEach(p => {
    const w = sm(p.r + 6, p.r, Math.hypot(x - p.x, z - p.z));
    if (w > 0) h = h * (1 - w) + p.h * w;
  });
  return h;
}
const onPlaza = (x, z) => Math.hypot(x - PLAZA.x, z - PLAZA.z) < 8.6;
const groundY = (x, z) => onPlaza(x, z) ? PLAZA.h + .22 : heightAt(x, z);

/* ── renderer, scene, camera ─────────────────────────────────────────────── */
const R = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: MANUAL });
R.setPixelRatio(Math.min(2, devicePixelRatio || 1));
R.setSize(W(), H());
R.domElement.classList.add('isl-cv'); R.domElement.setAttribute('aria-hidden', 'true');
R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap;
stage.appendChild(R.domElement);
const scene = new T.Scene();
const cam = new T.PerspectiveCamera(36, W() / H(), .5, 1200);

/* post: bloom + our own ACES, gamma and vignette (r128 composer targets are linear) */
const rtOpts = { type: T.HalfFloatType, format: T.RGBAFormat };
const rt = R.capabilities.isWebGL2 && T.WebGLMultisampleRenderTarget
  ? Object.assign(new T.WebGLMultisampleRenderTarget(W() * R.getPixelRatio(), H() * R.getPixelRatio(), rtOpts), { samples: 4 })
  : new T.WebGLRenderTarget(W() * R.getPixelRatio(), H() * R.getPixelRatio(), rtOpts);
const composer = new T.EffectComposer(R, rt);
composer.addPass(new T.RenderPass(scene, cam));
const bloom = new T.UnrealBloomPass(new T.Vector2(W(), H()), .2, .5, 1.4);
composer.addPass(bloom);
const finalPass = new T.ShaderPass({
  uniforms: { tDiffuse: { value: null }, exposure: { value: 1.05 }, vig: { value: .32 } },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: `uniform sampler2D tDiffuse;uniform float exposure;uniform float vig;varying vec2 vUv;
    vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
    void main(){vec3 c=texture2D(tDiffuse,vUv).rgb*exposure;c=aces(c);c=pow(c,vec3(1./2.2));
    vec2 p=vUv-.5;float v=smoothstep(.86,.28,length(p*vec2(1.,.92)));c*=mix(1.-vig,1.,v);gl_FragColor=vec4(c,1.);}`,
});
composer.addPass(finalPass);

/* sky dome */
const skyU = { top: { value: col(0x5fa9e6) }, hor: { value: col(0xe6f3fb) } };
const sky = new T.Mesh(new T.SphereGeometry(800, 32, 16), new T.ShaderMaterial({
  uniforms: skyU, side: T.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'uniform vec3 top;uniform vec3 hor;varying vec3 vP;void main(){float t=pow(max(vP.y,0.),.55);gl_FragColor=vec4(mix(hor,top,t),1.);}',
}));
scene.add(sky);
scene.fog = new T.Fog(col(0xe6f3fb), 220, 700);

const hemi = new T.HemisphereLight(col(0xdcefff), col(0x6d8f55), .75);
scene.add(hemi);
const sun = new T.DirectionalLight(col(0xfff1dc), 1.55);
sun.position.set(-60, 90, 55);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, near: 10, far: 260 });
sun.shadow.bias = -.0004; sun.shadow.normalBias = .04;
scene.add(sun);

/* materials */
const MATS = {};
function M(hex, o) {
  const key = hex + JSON.stringify(o || {});
  if (!o || !o.unique) { if (MATS[key]) return MATS[key]; }
  const m = new T.MeshStandardMaterial(Object.assign({ color: col(hex), roughness: .86, metalness: 0, flatShading: true }, o || {}));
  delete m.unique; if (!o || !o.unique) MATS[key] = m; return m;
}
function mk(geo, mat, x, y, z, parent) {
  const m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0);
  m.castShadow = true; m.receiveShadow = true; (parent || scene).add(m); return m;
}
const winMat = new T.MeshStandardMaterial({ color: col(0x2b3a4a), emissive: col(0xffc966), emissiveIntensity: 0, roughness: .3, flatShading: true });
const lampMat = new T.MeshStandardMaterial({ color: col(0xfff3d0), emissive: col(0xffd27a), emissiveIntensity: .2, flatShading: true });

/* terrain mesh — non-indexed so each face gets one flat colour (the low-poly look) */
(function terrain() {
  const S = 168, N = 168;
  let g = new T.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2);
  g = g.toNonIndexed();
  const p = g.attributes.position, cols = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i)));
  const c = new T.Color();
  const SAND = col(0xead9a2), GRASS1 = col(0x7cc35d), GRASS2 = col(0x5faa4a), GRASS3 = col(0x93cf68), ROCK = col(0x8f9298), ROCK2 = col(0x6f747c),
    SNOW = col(0xf4f6f8), DIRT = col(0xcfb689), SEA1 = col(0x56c0c0), SEA2 = col(0x2f8fae);
  for (let f = 0; f < p.count; f += 3) {
    let cx = 0, cy = 0, cz = 0, ymin = 1e9, ymax = -1e9;
    for (let k = 0; k < 3; k++) { const y = p.getY(f + k); cx += p.getX(f + k); cy += y; cz += p.getZ(f + k); ymin = Math.min(ymin, y); ymax = Math.max(ymax, y); }
    cx /= 3; cy /= 3; cz /= 3;
    const slope = ymax - ymin, n = n2(cx * 2.3, cz * 2.3);
    if (cy < -.2) c.copy(SEA1).lerp(SEA2, sm(-.2, -4, cy));
    else if (cy < .9) c.copy(SAND);
    else if (cy > 17.5 + n * 3) c.copy(SNOW);
    else if (cy > 7.5 + n * 2 || slope > 1.6) c.copy(n > 0 ? ROCK : ROCK2);
    else if (pathD(cx, cz) < 1.5 && cy < 5) c.copy(DIRT);
    else c.copy(n > .25 ? GRASS3 : n < -.2 ? GRASS2 : GRASS1);
    for (let k = 0; k < 3; k++) c.toArray(cols, (f + k) * 3);
  }
  g.setAttribute('color', new T.BufferAttribute(cols, 3));
  g.computeVertexNormals();
  const m = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .95 }));
  m.receiveShadow = true; m.castShadow = true; scene.add(m);
  const deep = new T.Mesh(new T.CircleGeometry(900, 48), M(0x1d6696)); deep.rotation.x = -Math.PI / 2; deep.position.y = -6; scene.add(deep);
})();

/* water + the foam line where sea meets sand */
const water = new T.Mesh(new T.PlaneGeometry(1600, 1600), new T.MeshStandardMaterial({ color: col(0x2a86c4), roughness: .12, metalness: .1, transparent: true, opacity: .72 }));
water.rotation.x = -Math.PI / 2; water.position.y = 0; water.receiveShadow = true; scene.add(water);
const foam = (function () {
  const pts = [], N = 220;
  for (let i = 0; i <= N; i++) {
    const th = i / N * Math.PI * 2; let lo = 20, hi = 75;
    for (let k = 0; k < 30; k++) { const mid = (lo + hi) / 2; if (heightAt(Math.cos(th) * mid, Math.sin(th) * mid) > 0) lo = mid; else hi = mid; }
    pts.push([Math.cos(th), Math.sin(th), lo]);
  }
  const pos = [];
  for (let i = 0; i < N; i++) {
    const [ax, az, ar] = pts[i], [bx, bz, br] = pts[i + 1];
    const a0 = [ax * (ar - .3), az * (ar - .3)], a1 = [ax * (ar + 1.6), az * (ar + 1.6)], b0 = [bx * (br - .3), bz * (br - .3)], b1 = [bx * (br + 1.6), bz * (br + 1.6)];
    pos.push(a0[0], .06, a0[1], a1[0], .06, a1[1], b1[0], .06, b1[1], a0[0], .06, a0[1], b1[0], .06, b1[1], b0[0], .06, b0[1]);
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  const m = new T.Mesh(g, new T.MeshBasicMaterial({ color: col(0xffffff), transparent: true, opacity: .55, depthWrite: false, side: T.DoubleSide }));
  scene.add(m); return m;
})();

/* ── nature: trees, rocks, palms, clouds ─────────────────────────────────── */
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
(function trees() {
  const spots = [];
  for (let i = 0; i < 4000 && spots.length < 300; i++) {
    const x = (rnd() * 2 - 1) * 68, z = (rnd() * 2 - 1) * 68, h = heightAt(x, z);
    if (h < 1.3 || h > 13) continue;
    if (Math.abs(heightAt(x + 1, z) - h) + Math.abs(heightAt(x, z + 1) - h) > 1.4) continue;
    if (ZONES().some(p => Math.hypot(x - p.x, z - p.z) < p.r + 2.5)) continue;
    if (pathD(x, z) < 2.6) continue;
    if (Math.abs(x) < 4 && z > 30) continue;
    spots.push({ x, z, h, s: .6 + rnd() * .6 });
  }
  const trunk = new T.InstancedMesh(new T.CylinderGeometry(.16, .24, 1.2, 6), M(0x7a5536), spots.length);
  const low = new T.InstancedMesh(new T.ConeGeometry(1.25, 2.2, 7), M(0xffffff), spots.length);
  const high = new T.InstancedMesh(new T.ConeGeometry(.9, 1.8, 7), M(0xffffff), spots.length);
  const o = new T.Object3D(), greens = [0x2f8f45, 0x3c9e4c, 0x4aa957, 0x27804a, 0x5bb35e].map(col);
  spots.forEach((s, i) => {
    o.position.set(s.x, s.h + .6 * s.s, s.z); o.scale.setScalar(s.s); o.rotation.set(0, rnd() * 6, 0); o.updateMatrix(); trunk.setMatrixAt(i, o.matrix);
    o.position.y = s.h + 2 * s.s; o.updateMatrix(); low.setMatrixAt(i, o.matrix);
    o.position.y = s.h + 3.1 * s.s; o.updateMatrix(); high.setMatrixAt(i, o.matrix);
    const g = greens[Math.floor(rnd() * greens.length)]; low.setColorAt(i, g); high.setColorAt(i, g.clone().multiplyScalar(1.12));
  });
  [trunk, low, high].forEach(m => { m.castShadow = m.receiveShadow = true; scene.add(m); });
  /* rocks */
  const rocks = [];
  for (let i = 0; i < 2000 && rocks.length < 70; i++) {
    const x = (rnd() * 2 - 1) * 62, z = (rnd() * 2 - 1) * 62, h = heightAt(x, z);
    if (h < .2 || h > 16 || pathD(x, z) < 2 || ZONES().some(p => Math.hypot(x - p.x, z - p.z) < p.r + 1)) continue;
    rocks.push({ x, z, h });
  }
  const rk = new T.InstancedMesh(new T.DodecahedronGeometry(.7, 0), M(0x9a9ca1), rocks.length);
  rocks.forEach((r, i) => { o.position.set(r.x, r.h + .1, r.z); o.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); o.scale.set(.6 + rnd(), .5 + rnd() * .6, .6 + rnd()); o.updateMatrix(); rk.setMatrixAt(i, o.matrix); });
  rk.castShadow = rk.receiveShadow = true; scene.add(rk);
  /* palms on the beach */
  for (let i = 0; i < 18; i++) {
    const th = (i / 18) * Math.PI * 2 + .2 + rnd() * .2; if (Math.sin(th) < -.35) continue;
    let r = shoreR(th) - 3.2, x = Math.cos(th) * r, z = Math.sin(th) * r; const h = heightAt(x, z); if (h < .3 || h > 2.5 || Math.abs(x) < 5) continue;
    const g = new T.Group(); g.position.set(x, h, z); g.rotation.y = rnd() * 6; scene.add(g);
    let px = 0, py = 0;
    for (let k = 0; k < 5; k++) { const seg = mk(new T.CylinderGeometry(.14, .18, .9, 6), M(0x9b7a4f), px, py + .45, 0, g); seg.rotation.z = -.12 * k; px += .1 * k; py += .86; }
    for (let k = 0; k < 6; k++) { const leaf = mk(new T.ConeGeometry(.35, 2.2, 4), M(0x3d9b4a), px, py, 0, g); leaf.rotation.set(0, k, 0); leaf.rotateX(1.9); leaf.translateY(1); }
  }
})();
const clouds = [];
for (let i = 0; i < 10; i++) {
  const g = new T.Group(), n = 4 + Math.floor(rnd() * 3);
  for (let k = 0; k < n; k++) { const s = mk(new T.IcosahedronGeometry(3 + rnd() * 3, 1), M(0xffffff, { roughness: 1 }), k * 4 - n * 2, rnd() * 1.5, rnd() * 3); s.castShadow = false; s.scale.y = .6; }
  g.position.set((rnd() * 2 - 1) * 160, 52 + rnd() * 18, -150 + rnd() * 220); g.userData.v = .6 + rnd() * .8; scene.add(g); clouds.push(g);
}
const stars = (function () {
  const pos = []; for (let i = 0; i < 900; i++) { const u = rnd() * Math.PI * 2, v = .05 + rnd() * .9; pos.push(Math.cos(u) * Math.cos(v) * 700, Math.sin(v) * 700, Math.sin(u) * Math.cos(v) * 700); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  const p = new T.Points(g, new T.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: .9 }));
  p.visible = false; scene.add(p); return p;
})();

/* ── buildings ───────────────────────────────────────────────────────────── */
function prism(w, h, len) {   /* a gable roof: triangle w×h, ridge along z */
  const s = new T.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
  const g = new T.ExtrudeGeometry(s, { depth: len, bevelEnabled: false }); g.translate(0, 0, -len / 2); return g;
}
function district(k) {   /* a group at the district centre, its +z facing the plaza */
  const d = DIST[k], g = new T.Group(); g.position.set(d.x, d.h, d.z); g.rotation.y = d.a; scene.add(g); return g;
}
function toWorld(k, lx, lz) {
  const d = DIST[k], c = Math.cos(d.a), s = Math.sin(d.a);
  return { x: d.x + lx * c + lz * s, z: d.z - lx * s + lz * c };
}
function windows(g, w, h, z, y0, n) {
  for (let i = 0; i < n; i++) mk(new T.BoxGeometry(.55, .7, .08), winMat, -w / 2 + (i + .5) * w / n, y0, z, g);
}
function house(parent, x, z, ry, w, d, h, wall, roof) {
  const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
  mk(new T.BoxGeometry(w, h, d), M(wall), 0, h / 2, 0, g);
  const r = mk(prism(w + .5, h * .55, d + .5), M(roof), 0, h, 0, g); r.rotation.y = Math.PI / 2;
  mk(new T.BoxGeometry(.8, 1.3, .1), M(0x6b4a30), 0, .65, d / 2 + .02, g);
  windows(g, w, h, d / 2 + .03, h * .62, 2);
  return g;
}
const anim = [];   /* per-frame decorations */

/* plaza + the second brain */
const brain = {};
(function plaza() {
  const p = PLAZA;
  mk(new T.CylinderGeometry(p.r - 1.2, p.r - .9, .4, 40), M(0xa89d8a), p.x, p.h, p.z);
  mk(new T.CylinderGeometry(4.6, 4.8, .5, 32), M(0x968b76), p.x, p.h + .3, p.z);
  mk(new T.CylinderGeometry(3.6, 3.8, 1.1, 24), M(0xd8d2c6), p.x, p.h + .9, p.z);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; mk(new T.CylinderGeometry(.16, .16, 3.4, 8), M(0xf5f2ea), p.x + Math.cos(a) * 3.2, p.h + 3.1, p.z + Math.sin(a) * 3.2); }
  brain.domeMat = new T.MeshStandardMaterial({ color: col(0xbff3ff), emissive: col(0x5fe0d0), emissiveIntensity: .25, transparent: true, opacity: .55, roughness: .1, flatShading: true });
  brain.dome = mk(new T.SphereGeometry(3.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), brain.domeMat, p.x, p.h + 4.8, p.z); brain.dome.castShadow = false;
  brain.coreMat = new T.MeshStandardMaterial({ color: col(0x9ff8d8), emissive: col(0x5ef0c0), emissiveIntensity: 1.4, flatShading: true });
  brain.core = mk(new T.IcosahedronGeometry(1.15, 1), brain.coreMat, p.x, p.h + 3.2, p.z);
  brain.pulse = 0;
  for (let i = 0; i < 8; i++) {
    const a = (i + .5) / 8 * Math.PI * 2, x = p.x + Math.cos(a) * 8.2, z = p.z + Math.sin(a) * 8.2;
    if (Math.abs(Math.cos(a)) < .2 || Math.abs(Math.sin(a)) < .2) continue;
    mk(new T.CylinderGeometry(.08, .1, 3, 6), M(0x2d3640), x, p.h + 1.5, z);
    mk(new T.SphereGeometry(.28, 8, 6), lampMat, x, p.h + 3.1, z);
  }
})();

/* People: a small neighbourhood around a café */
const SPOTS = {};
(function people() {
  const k = 'personas', g = district(k);
  const H = [[-7, -5, .5, 0xf4efe6, 0x2f6fe0], [0, -8, 0, 0xfaf3e3, 0x3a5fa8], [7, -5, -.5, 0xf0e6d6, 0x4c86f0], [-9.5, 2, 1.3, 0xf6efe2, 0x2a4f94], [9.5, 2, -1.3, 0xefe9de, 0x5b8de8]];
  H.forEach(([x, z, r, w, rf]) => house(g, x, z, r, 3.6, 3.2, 2.8, w, rf));
  mk(new T.CylinderGeometry(.7, .7, .08, 12), M(0xffffff), 0, .95, -1, g); mk(new T.CylinderGeometry(.06, .06, .95, 6), M(0x444), 0, .47, -1, g);
  mk(new T.ConeGeometry(2, .8, 10), M(0x2f6fe0), 0, 2.5, -1, g); mk(new T.CylinderGeometry(.05, .05, 2.2, 6), M(0xdddddd), 0, 1.1, -1, g);
  SPOTS[k] = [[-6.4, -3.2], [0, -6], [6.4, -3.2], [-8, 1.4], [8, 1.4], [-1.2, -.2], [1.2, -.2]];
})();
/* Commitments: a clock tower (real Boston time) and a post office */
const clock = {};
(function commitments() {
  const k = 'compromisos', g = district(k);
  mk(new T.BoxGeometry(2.8, 10, 2.8), M(0xf3ead6), -4.5, 5, -5, g);
  mk(new T.ConeGeometry(2.4, 2.6, 4), M(0xe0a800), -4.5, 11.3, -5, g).rotation.y = Math.PI / 4;
  const face = mk(new T.CylinderGeometry(1, 1, .12, 24), M(0xffffff), -4.5, 8.4, -3.55, g); face.rotation.x = Math.PI / 2;
  clock.h = new T.Group(); clock.h.position.set(-4.5, 8.4, -3.45); g.add(clock.h); mk(new T.BoxGeometry(.12, .55, .05), M(0x222), 0, .25, 0, clock.h);
  clock.m = new T.Group(); clock.m.position.set(-4.5, 8.4, -3.42); g.add(clock.m); mk(new T.BoxGeometry(.08, .82, .05), M(0x222), 0, .38, 0, clock.m);
  mk(new T.BoxGeometry(.9, 1.6, .1), M(0x6b4a30), -4.5, .8, -3.55, g);
  const po = new T.Group(); po.position.set(4, 0, -5); g.add(po);
  mk(new T.BoxGeometry(7, 3.6, 4.6), M(0xf7f1e6), 0, 1.8, 0, po);
  mk(new T.BoxGeometry(7.4, .35, 5), M(0xc99700), 0, 3.75, 0, po);
  const aw = mk(new T.BoxGeometry(6, .1, 1.4), M(0xf2c12e), 0, 2.6, 2.9, po); aw.rotation.x = .25;
  windows(po, 6, 3.6, 2.32, 1.7, 4);
  mk(new T.BoxGeometry(1, 1.6, .1), M(0x6b4a30), 0, .8, 2.33, po);
  mk(new T.BoxGeometry(.6, 1.1, .5), M(0x2f6fe0), 4.2, .55, -1.5 + 4.5, g);
  SPOTS[k] = [[-4.5, -2.6], [4, -1.8], [4.2, 2.4], [0, 1], [-2, -1]];
})();
/* Thinking: a library with columns, an observatory, the council's bench */
const benches = {};
(function thinking() {
  const k = 'pensamiento', g = district(k);
  mk(new T.BoxGeometry(11, .6, 7), M(0xe8e1d3), 0, .3, -5.5, g);
  mk(new T.BoxGeometry(9.5, 4.4, 4.6), M(0xf8f5ee), 0, 2.8, -6.2, g);
  for (let i = 0; i < 6; i++) mk(new T.CylinderGeometry(.28, .3, 4.2, 10), M(0xffffff), -4 + i * 1.6, 2.7, -3.3, g);
  const ped = mk(prism(10.4, 1.9, 6.4), M(0xd2442e), 0, 5, -5.6, g); ped.rotation.y = Math.PI / 2; ped.rotation.y = 0;
  windows(g, 8, 4.4, -3.88, 3, 3);
  const ob = new T.Group(); ob.position.set(-8, 0, 1); g.add(ob);
  mk(new T.CylinderGeometry(1.8, 1.9, 3, 14), M(0xf2ede4), 0, 1.5, 0, ob);
  mk(new T.SphereGeometry(1.85, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(0x8a2f22), 0, 3, 0, ob);
  const tel = mk(new T.CylinderGeometry(.18, .25, 2, 8), M(0x333a42), 0, 4.1, .6, ob); tel.rotation.x = -.8;
  /* the council: a big tree and a bench */
  mk(new T.CylinderGeometry(.35, .5, 2.4, 8), M(0x6e4b31), 7.5, 1.2, -1.5, g);
  mk(new T.IcosahedronGeometry(2.6, 1), M(0x3f9a4b), 7.5, 3.8, -1.5, g);
  const b = new T.Group(); b.position.set(6.6, 0, 1.4); b.rotation.y = -.5; b.scale.setScalar(1.6); g.add(b);
  mk(new T.BoxGeometry(4.2, .14, .7), M(0x8b5e3c), 0, .55, 0, b); mk(new T.BoxGeometry(4.2, .7, .12), M(0x8b5e3c), 0, .95, -.32, b);
  [-1.8, 1.8].forEach(x => mk(new T.BoxGeometry(.12, .55, .6), M(0x3a3a3a), x, .27, 0, b));
  benches.pensamiento = { k, lx: 6.6, lz: 1.4, ry: -.5, len: 6.4 };
  SPOTS[k] = [[-2.5, -2.4], [2.5, -2.4], [-7, 3], [0, -1], [3.5, 1.5]];
})();
/* Upkeep: a workshop with a turning gear, a chimney, a lighthouse on the shore */
const gear = {}, smoke = [];
(function upkeep() {
  const k = 'mantenimiento', g = district(k);
  mk(new T.BoxGeometry(10, 4.6, 6), M(0xeef0ea), -2, 2.3, -7, g);
  const rf = mk(prism(11, 2.4, 6.8), M(0x2fa84f), -2, 4.6, -7, g); rf.rotation.y = Math.PI / 2; rf.scale.set(1, 1, 1);
  rf.rotation.y = 0; rf.scale.set(1, 1, 1);
  mk(new T.BoxGeometry(2.4, 2.8, .1), M(0x4a5560), -2, 1.4, -3.97, g);
  windows(g, 9, 4.6, -3.96, 3.2, 4);
  mk(new T.BoxGeometry(.9, 3, .9), M(0x8d6e5a), 1.5, 6, -8, g);
  gear.g = new T.Group(); gear.g.position.set(-5.4, 3.3, -3.8); g.add(gear.g);
  mk(new T.CylinderGeometry(1.1, 1.1, .3, 16), M(0x2fa84f, { metalness: .3 }), 0, 0, 0, gear.g).rotation.x = Math.PI / 2;
  for (let i = 0; i < 10; i++) { const t = mk(new T.BoxGeometry(.35, .5, .3), M(0x2fa84f, { metalness: .3 }), 0, 0, 0, gear.g); t.rotation.z = i / 10 * Math.PI * 2; t.translateY(1.2); }
  for (let i = 0; i < 6; i++) {
    const m = new T.Mesh(new T.IcosahedronGeometry(.5, 0), new T.MeshStandardMaterial({ color: col(0xdedede), transparent: true, opacity: .6, flatShading: true }));
    g.add(m); smoke.push({ m, t: i / 6 });
  }
  smoke.base = { x: 1.5, y: 7.6, z: -8 };
  /* robots' yard: a low concrete pad */
  mk(new T.BoxGeometry(16, .14, 7), M(0xbfc3c4), 0, .1, -.2, g);
  benches.mantenimiento = { k, lx: 10.5, lz: -2, ry: -1.2, len: 3.5 };
  const b = new T.Group(); b.position.set(10.5, 0, -2); b.rotation.y = -1.2; b.scale.setScalar(1.6); g.add(b);
  mk(new T.BoxGeometry(2.6, .14, .7), M(0x8b5e3c), 0, .55, 0, b); mk(new T.BoxGeometry(2.6, .7, .12), M(0x8b5e3c), 0, .95, -.32, b);
  SPOTS[k] = [[-2, -3.2], [-5.4, -2.8], [1.5, -3.5], [5, -4], [-7, 0], [7, 2]];
  /* lighthouse: on the shore east of the workshop */
  const th = -.18, r = shoreR(th) - 4, lx = Math.cos(th) * r, lz = Math.sin(th) * r, ly = heightAt(lx, lz);
  const L = new T.Group(); L.position.set(lx, ly, lz); scene.add(L);
  for (let i = 0; i < 5; i++) mk(new T.CylinderGeometry(1.15 - i * .12, 1.27 - i * .12, 1.6, 14), M(i % 2 ? 0x2fa84f : 0xffffff), 0, .8 + i * 1.6, 0, L);
  mk(new T.CylinderGeometry(.75, .75, .9, 10), lampMat, 0, 8.45, 0, L);
  mk(new T.ConeGeometry(1, .9, 10), M(0x2a3138), 0, 9.3, 0, L);
  gear.beam = new T.Mesh(new T.ConeGeometry(2.2, 22, 16, 1, true), new T.MeshBasicMaterial({ color: col(0xfff1b0), transparent: true, opacity: .16, depthWrite: false, side: T.DoubleSide }));
  gear.beam.geometry.translate(0, -11, 0); gear.beam.geometry.rotateZ(Math.PI / 2);
  const bg = new T.Group(); bg.position.set(0, 8.45, 0); bg.add(gear.beam); L.add(bg); gear.beamG = bg; gear.beam.visible = false;
})();
/* On their own: a wooden lookout by the pier */
(function lookout() {
  const k = 'fuera', g = district(k);
  [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]].forEach(([x, z]) => mk(new T.BoxGeometry(.25, 4, .25), M(0x8b5e3c), x, 2, z - 2, g));
  mk(new T.BoxGeometry(3.6, .3, 3.6), M(0xa0714a), 0, 4, -2, g);
  mk(new T.ConeGeometry(2.8, 1.6, 4), M(0x6b7280), 0, 5.6, -2, g).rotation.y = Math.PI / 4;
  SPOTS[k] = [[-2, 1], [2, 1], [0, -2.5]];
})();
/* ── what each district is about: tinted ground, a signboard, a symbol ──── */
function drawBoard(c, title, sub, color) {
  const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height);
  x.fillStyle = '#fbfaf6'; x.beginPath(); x.moveTo(24, 0); x.arcTo(1024, 0, 1024, 360, 24); x.arcTo(1024, 360, 0, 360, 24); x.arcTo(0, 360, 0, 0, 24); x.arcTo(0, 0, 1024, 0, 24); x.fill();
  x.fillStyle = color; x.fillRect(0, 0, 34, 360);
  x.fillStyle = '#16202a'; let fs = 118; do { x.font = `700 ${fs}px Inter, system-ui, sans-serif`; fs -= 4; } while (x.measureText(title).width > 900 && fs > 40); x.fillText(title, 80, 150);
  x.fillStyle = '#4d5b69'; x.font = '500 54px Inter, system-ui, sans-serif';
  const words = sub.split(' '); let line = '', y = 240;
  words.forEach(w => { if (x.measureText(line + w).width > 880) { x.fillText(line, 80, y); line = ''; y += 66; } line += w + ' '; }); x.fillText(line, 80, y);
}
const BOARDS = [];
function board(parent, lx, lz, ry, title, sub, color, w) {
  w = w || 7.5; const h = w * 360 / 1024, c = document.createElement('canvas'); c.width = 1024; c.height = 360;
  drawBoard(c, title, sub, color);
  const tex = new T.CanvasTexture(c); tex.encoding = T.sRGBEncoding; tex.anisotropy = 8;
  const g = new T.Group(); g.position.set(lx, 0, lz); g.rotation.y = ry; parent.add(g);
  [-w / 2 + .4, w / 2 - .4].forEach(x => mk(new T.BoxGeometry(.22, 2.6 + h, .22), M(0x6e4b31), x, (2.6 + h) / 2, -.12, g));
  mk(new T.BoxGeometry(w + .2, h + .2, .16), M(0x6e4b31), 0, 2.4 + h / 2, -.1, g);
  const face = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: new T.Color(0xffffff), emissiveIntensity: .35, roughness: .8 }));
  face.position.set(0, 2.4 + h / 2, .0); g.add(face);
  BOARDS.push({ c, tex, title, sub, color });
}
if (document.fonts) document.fonts.ready.then(() => BOARDS.forEach(b => { drawBoard(b.c, b.title, b.sub, b.color); b.tex.needsUpdate = true; }));
const blink = [], FACE = [];   /* symbols that turn to face the camera */
(function themes() {
  Object.keys(DIST).forEach(k => {
    const d = DIST[k], g = district(k), tint = new T.Color(TEAM[k].hex).lerp(new T.Color(0xffffff), .62);
    const disc = mk(new T.CircleGeometry(d.r - .6, 48), new T.MeshStandardMaterial({ color: tint.convertSRGBToLinear(), roughness: .95, polygonOffset: true, polygonOffsetFactor: -2 }), 0, .05, 0, g);
    disc.rotation.x = -Math.PI / 2; disc.castShadow = false;
    const ring = mk(new T.RingGeometry(d.r - .6, d.r, 48), M(TEAM[k].hex), 0, .07, 0, g); ring.rotation.x = -Math.PI / 2; ring.castShadow = false;
    board(g, k === 'fuera' ? -4.6 : -5.2, d.r - 1.2, 0, TEAM[k].name, TAG[k], TEAM[k].css, k === 'fuera' ? 5.5 : 7.5);
  });
  /* People: a big speech bubble over the café — conversations */
  const gp = district('personas'), bub = new T.Group(); bub.position.set(0, 8, -1); bub.scale.setScalar(1.5); gp.add(bub); FACE.push({ o: bub, a: DIST.personas.a });
  const bm = M(0x4c86f0, { roughness: .5 });
  mk(new T.SphereGeometry(1, 20, 14), bm, 0, 0, 0, bub).scale.set(2.4, 1.5, .7);
  const tail = mk(new T.ConeGeometry(.5, 1.2, 8), bm, -1, -1.4, 0, bub); tail.rotation.z = -.5;
  [-.8, 0, .8].forEach(x => mk(new T.SphereGeometry(.26, 10, 8), M(0xffffff), x, 0, .66, bub));
  anim.push(t => { bub.position.y = 8 + Math.sin(t * 1.2) * .3; });
  /* Commitments: today's page of a calendar on the post-office roof */
  const gc = district('compromisos'), cal = new T.Group(); cal.position.set(4, 9.5, -4); cal.scale.setScalar(1.8); gc.add(cal); FACE.push({ o: cal, a: DIST.compromisos.a });
  anim.push(t => { cal.position.y = 9.5 + Math.sin(t * 1.1 + 2) * .3; });
  const cc = document.createElement('canvas'); cc.width = 256; cc.height = 256; const cx = cc.getContext('2d');
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const drawCal = () => { cx.fillStyle = '#fff'; cx.fillRect(0, 0, 256, 256); cx.fillStyle = '#e8452c'; cx.fillRect(0, 0, 256, 70);
    cx.fillStyle = '#fff'; cx.font = '700 44px Inter, sans-serif'; cx.textAlign = 'center'; cx.fillText(now.toLocaleString('en-US', { month: 'short' }).toUpperCase(), 128, 52);
    cx.fillStyle = '#16202a'; cx.font = '700 140px Inter, sans-serif'; cx.fillText(String(now.getDate()), 128, 215); };
  drawCal(); const ct = new T.CanvasTexture(cc); ct.encoding = T.sRGBEncoding;
  if (document.fonts) document.fonts.ready.then(() => { drawCal(); ct.needsUpdate = true; });
  mk(new T.BoxGeometry(2.8, 2.8, .35), M(0xf2c12e), 0, 0, -.05, cal);
  const page = new T.Mesh(new T.PlaneGeometry(2.5, 2.5), new T.MeshStandardMaterial({ map: ct, emissiveMap: ct, emissive: new T.Color(0xffffff), emissiveIntensity: .3 })); page.position.z = .13; cal.add(page);
  [-.7, .7].forEach(x => mk(new T.TorusGeometry(.16, .05, 6, 12), M(0x444a52, { metalness: .5 }), x, 1.4, .05, cal));
  /* Thinking: an open book floating over the library */
  const gt = district('pensamiento'), bookF = new T.Group(); bookF.position.set(0, 11.5, -5.5); gt.add(bookF); FACE.push({ o: bookF, a: DIST.pensamiento.a });
  const book = new T.Group(); book.scale.setScalar(1.9); book.rotation.x = .9; bookF.add(book);
  [-1, 1].forEach(s => { const half = new T.Group(); half.rotation.z = s * -.28; book.add(half);
    mk(new T.BoxGeometry(2.2, .12, 3), M(0xd2442e), s * 1.1, -.06, 0, half); mk(new T.BoxGeometry(2.05, .14, 2.8), M(0xfffaf0), s * 1.05, .05, 0, half); });
  anim.push(t => { bookF.position.y = 11.5 + Math.sin(t * 1.1 + 1) * .3; });
  /* Upkeep: server racks with blinking lights — the machinery */
  const gu = district('mantenimiento');
  for (let i = 0; i < 3; i++) {
    const r = mk(new T.BoxGeometry(1.3, 3.4, 1.2), M(0x2a3138, { roughness: .5 }), 6 + i * 1.5, 1.7, -7, gu);
    for (let j = 0; j < 6; j++) { const m = new T.MeshStandardMaterial({ color: col(0x103018), emissive: col(j % 3 ? 0x4ff07a : 0x5ef0e0), emissiveIntensity: 1 });
      mk(new T.BoxGeometry(.9, .08, .05), m, 6 + i * 1.5, .5 + j * .5, -6.38, gu); blink.push({ m, p: Math.random() * 10 }); }
  }
  anim.push(t => blink.forEach(b => { b.m.emissiveIntensity = Math.sin(t * 5 + b.p * 3) > 0 ? 1.6 : .15; }));
})();
/* the maintenance shop: an open garage with a lift, a tool bench and a red-and-white awning */
(function shop() {
  const g = new T.Group(); g.position.set(SHOP.x, SHOP.h, SHOP.z); scene.add(g);
  mk(new T.BoxGeometry(14, .16, 10), M(0x9ea3a6), 0, .08, 0, g);
  const wall = M(0xe9e4dc);
  mk(new T.BoxGeometry(11, 5, .4), wall, 0, 2.5, -4, g);
  [-5.3, 5.3].forEach(x => mk(new T.BoxGeometry(.4, 5, 4), wall, x, 2.5, -2.2, g));
  mk(new T.BoxGeometry(11.6, .45, 4.8), M(0x8b2a22), 0, 5.2, -2.1, g);
  for (let i = 0; i < 8; i++) { const a = mk(new T.BoxGeometry(11.6 / 8, .1, 1.6), M(i % 2 ? 0xffffff : 0xd8392b), -5.8 + (i + .5) * 11.6 / 8, 4.1, .4, g); a.rotation.x = .35; }
  /* lift */
  [-1.6, 1.6].forEach(x => mk(new T.BoxGeometry(.4, 3, .4), M(0xf2c12e), x, 1.5, -2.6, g));
  mk(new T.BoxGeometry(3.6, .25, 2.2), M(0x5a6068, { metalness: .4 }), 0, 1.6, -2.6, g);
  /* tool bench and a big wrench */
  mk(new T.BoxGeometry(2.8, .9, 1), M(0x8b5e3c), -3.6, .45, -3.2, g);
  mk(new T.BoxGeometry(2.8, 1.8, .1), M(0x55606a), -3.6, 2.1, -3.7, g);
  const wr = new T.Group(); wr.position.set(3.6, 2.4, -3.75); wr.rotation.z = .6; g.add(wr);
  const steel = M(0xb9c0c6, { metalness: .6, roughness: .35 });
  mk(new T.BoxGeometry(.35, 2.4, .15), steel, 0, 0, 0, wr); mk(new T.TorusGeometry(.42, .14, 6, 12, Math.PI * 1.4), steel, 0, 1.45, 0, wr);
  board(g, -9, 2.2, .55, 'Maintenance shop', 'Agents flagged red today wait here for a fix', '#E8452C', 7);
})();

/* pier and boat */
(function pier() {
  for (let z = 40; z < 64; z += 1.1) mk(new T.BoxGeometry(3.2, .18, .95), M(0xa57a4f), 0, .55, z);
  for (let z = 44; z < 64; z += 4.4) [-1.5, 1.5].forEach(x => mk(new T.CylinderGeometry(.14, .14, 2.4, 6), M(0x6e4b31), x, -.3, z));
  const b = new T.Group(); b.position.set(4.2, .15, 58); scene.add(b); anim.push(t => { b.position.y = .12 + Math.sin(t * 1.3) * .08; b.rotation.z = Math.sin(t * 1.1) * .04; });
  mk(new T.BoxGeometry(1.6, .6, 4.2), M(0xd8432e), 0, 0, 0, b); mk(new T.BoxGeometry(1.3, .1, 3.8), M(0xa57a4f), 0, .3, 0, b);
})();
/* the cross on the summit */
(function cross() {
  const y = heightAt(SUMMIT.x, SUMMIT.z) - .6, wood = M(0x5e3f27);
  mk(new T.BoxGeometry(1.1, 13, 1.1), wood, SUMMIT.x, y + 6.5, SUMMIT.z);
  mk(new T.BoxGeometry(7, 1.1, 1.1), wood, SUMMIT.x, y + 9.6, SUMMIT.z);
})();

/* ── characters ──────────────────────────────────────────────────────────── */
const SKIN = [0xf1c9a5, 0xe0ac85, 0xc68a62, 0x9a6440, 0xf6d7bd].map(h => h), HAIR = [0x2b1d14, 0x4a3020, 0x7a5230, 0x1d1d1d, 0xb8894a];
const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const cubeMat = new T.MeshStandardMaterial({ color: col(0xaaffe0), emissive: col(0x4ff0bd), emissiveIntensity: 1.6, flatShading: true });
function person(a, team) {
  const h = hash(a.id), g = new T.Group(), shirt = M(TEAM[team].hex);
  const pants = M([0x2f3540, 0x4b4f58, 0x3b4a66, 0x5a4636][h % 4]), skin = M(SKIN[h % 5]), hair = M(HAIR[(h >> 3) % 5]);
  const rig = { g };
  const leg = x => { const p = new T.Group(); p.position.set(x, .66, 0); g.add(p); mk(new T.BoxGeometry(.19, .64, .22), pants, 0, -.32, 0, p); mk(new T.BoxGeometry(.21, .12, .3), M(0x222), 0, -.62, .04, p); return p; };
  rig.legL = leg(-.13); rig.legR = leg(.13);
  rig.body = new T.Group(); g.add(rig.body);
  mk(new T.CylinderGeometry(.25, .22, .66, 8), shirt, 0, .98, 0, rig.body);
  const arm = x => { const p = new T.Group(); p.position.set(x, 1.24, 0); rig.body.add(p); mk(new T.BoxGeometry(.13, .56, .15), shirt, 0, -.27, 0, p); mk(new T.SphereGeometry(.085, 6, 5), skin, 0, -.58, 0, p); return p; };
  rig.armL = arm(-.33); rig.armR = arm(.33);
  rig.head = new T.Group(); rig.head.position.set(0, 1.5, 0); rig.body.add(rig.head);
  mk(new T.SphereGeometry(.25, 12, 10), skin, 0, 0, 0, rig.head);
  mk(new T.SphereGeometry(.262, 12, 8, 0, Math.PI * 2, 0, Math.PI * .5), hair, 0, .03, -.02, rig.head);
  [-.09, .09].forEach(x => mk(new T.SphereGeometry(.035, 6, 4), M(0x1a1a1a), x, .02, .23, rig.head));
  if (a.rol === 'jefe') {
    const gold = M(0xf3c53a, { metalness: .6, roughness: .35, emissive: col(0x6b4b00) });
    mk(new T.CylinderGeometry(.21, .23, .16, 10, 1, true), gold, 0, .27, 0, rig.head);
    for (let i = 0; i < 5; i++) { const s = mk(new T.ConeGeometry(.05, .16, 4), gold, 0, .4, 0, rig.head); s.rotation.y = i * 1.256; s.position.set(Math.sin(i * 1.256) * .2, .4, Math.cos(i * 1.256) * .2); }
    const cape = mk(new T.BoxGeometry(.56, .9, .05), M(0x7a1f2b), 0, .86, -.24, rig.body); cape.rotation.x = .08;
  }
  if (a.rol === 'lider') {
    mk(new T.CylinderGeometry(.27, .27, .1, 12), shirt, 0, .2, 0, rig.head);
    mk(new T.BoxGeometry(.3, .04, .22), shirt, 0, .16, .22, rig.head);
    mk(new T.SphereGeometry(.07, 6, 5), M(0xf3c53a, { metalness: .5 }), .12, 1.12, .22, rig.body);
  }
  rig.cube = mk(new T.BoxGeometry(.32, .32, .32), cubeMat, 0, 1, .42, rig.body); rig.cube.visible = false;
  return rig;
}
function robot(a, team) {
  const g = new T.Group(), rig = { g, robot: true };
  const metal = M(0xd5dade, { metalness: .35, roughness: .45 }), stripe = M(TEAM[team].hex);
  [-.15, .15].forEach(x => mk(new T.CylinderGeometry(.08, .1, .4, 6), M(0x5a6068), x, .2, 0, g));
  rig.body = new T.Group(); g.add(rig.body);
  mk(new T.BoxGeometry(.6, .6, .46), metal, 0, .72, 0, rig.body);
  mk(new T.BoxGeometry(.62, .12, .48), stripe, 0, .62, 0, rig.body);
  rig.head = new T.Group(); rig.head.position.set(0, 1.18, 0); rig.body.add(rig.head);
  mk(new T.BoxGeometry(.46, .32, .38), metal, 0, 0, 0, rig.head);
  rig.eyeMat = new T.MeshStandardMaterial({ color: col(0x0f2a2a), emissive: col(0x5ef0e0), emissiveIntensity: 1.2 });
  mk(new T.BoxGeometry(.32, .08, .02), rig.eyeMat, 0, .02, .2, rig.head);
  mk(new T.CylinderGeometry(.02, .02, .3, 4), M(0x5a6068), 0, .3, 0, rig.head);
  rig.bulbMat = new T.MeshStandardMaterial({ color: col(0xff9d6b), emissive: col(0xff7a3d), emissiveIntensity: 1 });
  mk(new T.SphereGeometry(.06, 6, 5), rig.bulbMat, 0, .47, 0, rig.head);
  return rig;
}

/* ── the agents ──────────────────────────────────────────────────────────── */
const AG = [], HIT = [];
const labelsEl = document.createElement('div'); labelsEl.className = 'isl-labels'; stage.appendChild(labelsEl);
const ROOTQ = FULL ? document : stage;
if (!FULL) {
  const bar = document.createElement('div'); bar.className = 'isl-bar';
  bar.innerHTML = '<button data-sky="sunset">Sunset</button><button data-sky="day">Day</button><button data-sky="night">Night</button><button data-home>Whole island</button>';
  stage.appendChild(bar);
  const hint = document.createElement('div'); hint.className = 'isl-hint'; hint.textContent = 'Drag to rotate · ⌘ + scroll to zoom · click an agent'; stage.appendChild(hint);
}
const todayBoston = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };   /* the viewer's own day (the demo shifts Date) */
const ranToday = a => !!a.ultima && a.ultima.slice(0, 10) === todayBoston();
const brainDrop = k => { const d = DIST[k], a = Math.atan2(d.z - PLAZA.z, d.x - PLAZA.x) + (Math.random() - .5) * .9; return { x: PLAZA.x + Math.cos(a) * 4.9, z: PLAZA.z + Math.sin(a) * 4.9 }; };

function place(list) {
  const by = {}; Object.keys(TEAM).forEach(k => by[k] = { walk: [], robots: [], bench: [] });
  const leads = [];
  let jefe = null;
  list.forEach(a => {
    const k = equipoDe(a);
    if (a.rol === 'jefe') jefe = a; else if (a.rol === 'lider') leads.push(a);
    else if (a.rol === 'script') by[k].robots.push(a);
    else if (a.rol === 'en-vivo') (benches[k] ? by[k].bench : by.pensamiento.bench).push(a);
    else by[k].walk.push(a);
  });
  /* the public demo has no roles: its 'lider' is the crowned orchestrator, and each team gets an orchestrator */
  if (!jefe) { const i = by.mantenimiento.walk.findIndex(a => a.id === 'lider'); if (i >= 0) jefe = by.mantenimiento.walk.splice(i, 1)[0]; }
  if (!leads.length && jefe) ['personas', 'compromisos', 'pensamiento', 'mantenimiento'].forEach(k => {
    if (by[k].walk.length || by[k].robots.length) leads.push({ id: 'orq-' + k, nombre: TEAM[k].name + ' orchestrator', orquestador: k, rol: 'lider', color: 'verde', ultima: jefe.ultima, hace: '' });
  });
  const out = [];
  if (jefe) out.push({ a: jefe, k: equipoDe(jefe), x: PLAZA.x, z: PLAZA.z + 4.6, ry: 0, role: 'jefe' });
  leads.forEach(a => {
    const k = TEAM[a.orquestador] ? a.orquestador : equipoDe(a), d = DIST[k];
    const ang = Math.atan2(d.z - PLAZA.z, d.x - PLAZA.x);
    out.push({ a, k, x: PLAZA.x + Math.cos(ang) * 6.6, z: PLAZA.z + Math.sin(ang) * 6.6, ry: Math.atan2(Math.cos(ang), Math.sin(ang)), role: 'lider' });
  });
  Object.entries(by).forEach(([k, g]) => {
    const n = g.walk.length;
    g.walk.forEach((a, i) => {
      const t = n === 1 ? 0 : i / (n - 1) - .5, ang = t * 2.3, r = k === 'mantenimiento' ? 9.5 : 7.4;
      const w = toWorld(k, Math.sin(ang) * r, Math.cos(ang) * r * .55 + (k === 'mantenimiento' ? 2.2 : 1.6));
      out.push({ a, k, x: w.x, z: w.z, ry: DIST[k].a + Math.PI, role: 'walk' });
    });
    const cols = 6;
    g.robots.forEach((a, i) => {
      const c = i % cols, r = Math.floor(i / cols), w = toWorld(k, (c - (Math.min(cols, g.robots.length) - 1) / 2) * 2.3, -1.2 + r * 2.5);
      out.push({ a, k, x: w.x, z: w.z, ry: DIST[k].a, role: 'robot' });
    });
    const b = benches[k] || benches.pensamiento, bk = benches[k] ? k : 'pensamiento';
    g.bench.forEach((a, i) => {
      const off = (i - (g.bench.length - 1) / 2) * (b.len / Math.max(3, g.bench.length));
      const w = toWorld(bk, b.lx + Math.cos(b.ry) * off, b.lz - Math.sin(b.ry) * off);
      out.push({ a, k, x: w.x, z: w.z, ry: DIST[bk].a + b.ry, role: 'bench' });
    });
  });
  return out;
}

function build(list) {
  place(list).forEach(p => {
    const rig = p.role === 'robot' ? robot(p.a, p.k) : person(p.a, p.k);
    rig.g.scale.setScalar(p.role === 'robot' ? 1.5 : 1.6);
    rig.g.position.set(p.x, groundY(p.x, p.z), p.z); rig.g.rotation.y = p.ry; scene.add(rig.g);
    const hit = new T.Mesh(new T.BoxGeometry(1.6, 2.3, 1.6), new T.MeshBasicMaterial({ visible: false })); hit.position.y = 1.1; rig.g.add(hit);
    const tag = document.createElement('div'); tag.className = 'isl-tag'; labelsEl.appendChild(tag);
    const e = { ...p, pid: p.role === 'lider' ? 'team:' + p.k : p.a.id, rig, tag, home: { x: p.x, z: p.z, ry: p.ry }, phase: 'idle', t: Math.random() * 5, walkT: Math.random() * 10, target: null, carry: false, seed: Math.random() * 100 };
    hit.userData.e = e; HIT.push(hit); AG.push(e);
  });
  refreshAll();
}
function refreshAll() {
  let ri = 0; const nRed = AG.filter(e => e.a.color === 'rojo').length;
  AG.forEach(e => {
    const a = e.a, wasRed = e.red;
    e.ran = ranToday(a); e.red = a.color === 'rojo'; e.amber = a.color === 'amarillo';
    if (!e.base) e.base = { ...e.home };
    if (e.red) { const i = ri++, perRow = 5, row = Math.floor(i / perRow), inRow = Math.min(perRow, nRed - row * perRow);
      e.home = { x: SHOP.x + (i % perRow - (inRow - 1) / 2) * 2.6, z: SHOP.z + 3.4 + row * 2.6, ry: 0 }; }
    else e.home = { ...e.base };
    if (wasRed !== e.red) { e.rig.g.position.set(e.home.x, groundY(e.home.x, e.home.z), e.home.z); e.rig.g.rotation.y = e.home.ry; e.phase = 'idle'; if (e.rig.cube) e.rig.cube.visible = false; }
    e.works = e.ran && !e.red && e.role !== 'bench';
    e.tag.className = 'isl-tag' + (e.fix ? ' ' + e.fix.k : e.red ? ' red' : e.amber ? ' amber' : '') + (e === selected ? ' sel' : '');
    e.tag.innerHTML = (e.red ? '! ' : '') + `<i style="background:${TEAM[e.k].css}"></i>` + esc(a.nombre) + (e.fix && e.fix.txt ? ' · ' + esc(e.fix.txt) : '');
  });
  hud();
}

/* behaviour: walk-work-carry loops for agents who ran today */
const WALK = 3.1;
function pickSpot(e) { const s = SPOTS[e.k] || [[0, 0]], p = s[Math.floor(Math.random() * s.length)]; return toWorld(e.k, p[0] + (Math.random() - .5) * 1.2, p[1] + (Math.random() - .5) * 1.2); }
function nextTask(e) {
  if (e.role !== 'walk') return;
  if (e.phase === 'work' && (+e.a.produjo || 0) > 0 && Math.random() < .55) { e.phase = 'carry'; e.target = brainDrop(e.k); e.rig.cube.visible = true; return; }
  if (e.phase === 'carry') { e.phase = 'drop'; e.t = 1.1; return; }
  if (e.phase === 'walkto') { e.phase = 'work'; e.t = 3 + Math.random() * 5; return; }
  e.phase = 'walkto'; e.target = pickSpot(e);
}
function step(e, dt, time) {
  const r = e.rig, g = r.g;
  const breathe = Math.sin(time * 2 + e.seed) * .015;
  if (r.robot) {
    r.body.position.y = e.ran ? Math.sin(time * 3 + e.seed) * .04 + .03 : 0;
    r.head.rotation.y = e.ran ? Math.sin(time * .9 + e.seed) * .6 : 0;
    r.eyeMat.emissiveIntensity = e.red ? 0 : e.ran ? 1.3 : .25;
    r.bulbMat.emissiveIntensity = e.red ? 2.5 : e.ran ? (Math.sin(time * 4 + e.seed) > .3 ? 2 : .2) : 0;
    r.bulbMat.emissive.setHex(e.red ? 0xff2a2a : 0xff7a3d);
    return;
  }
  if (e.role === 'bench') {   /* seated: waits for Pablo to open a chat */
    r.legL.rotation.x = r.legR.rotation.x = -Math.PI / 2; r.body.position.y = 0;
    g.position.y = groundY(g.position.x, g.position.z);
    r.head.rotation.y = Math.sin(time * .4 + e.seed) * .5; r.armL.rotation.x = r.armR.rotation.x = -.5;
    return;
  }
  if (!e.works) {   /* at its post: still, or slumped if broken */
    r.legL.rotation.x = r.legR.rotation.x = 0; r.armL.rotation.x = r.armR.rotation.x = 0; r.armL.rotation.z = .05; r.armR.rotation.z = -.05;
    r.body.position.y = breathe; r.head.rotation.x = e.red ? .45 : 0; r.cube.visible = false;
    g.position.x += (e.home.x - g.position.x) * Math.min(1, dt * 2); g.position.z += (e.home.z - g.position.z) * Math.min(1, dt * 2);
    g.position.y = groundY(g.position.x, g.position.z);
    return;
  }
  if (e.role === 'jefe' || e.role === 'lider') {   /* conducting at the brain */
    const beat = Math.sin(time * 1.6 + e.seed);
    r.armR.rotation.x = e.role === 'jefe' ? -1.3 - beat * .5 : -.4 + Math.max(0, beat) * -.9;
    r.armR.rotation.z = e.role === 'jefe' ? -.3 + beat * .2 : -.05;
    r.armL.rotation.x = e.role === 'jefe' ? -.2 : 0;
    if (e.role === 'jefe') g.rotation.y = Math.PI + Math.sin(time * .5) * 1.4;
    r.body.position.y = breathe; return;
  }
  /* walkers */
  e.t -= dt;
  if (e.phase === 'idle') { e.phase = 'work'; e.t = Math.random() * 4; }
  if (e.phase === 'walkto' || e.phase === 'carry') {
    const dx = e.target.x - g.position.x, dz = e.target.z - g.position.z, d = Math.hypot(dx, dz);
    if (d < .25) { nextTask(e); }
    else {
      const s = Math.min(d, WALK * dt); g.position.x += dx / d * s; g.position.z += dz / d * s;
      const want = Math.atan2(dx, dz); let diff = want - g.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); g.rotation.y += diff * Math.min(1, dt * 8);
      e.walkT += dt * 9; const sw = Math.sin(e.walkT) * .6;
      r.legL.rotation.x = sw; r.legR.rotation.x = -sw;
      if (e.phase === 'carry') { r.armL.rotation.x = r.armR.rotation.x = -1.2; } else { r.armL.rotation.x = -sw * .8; r.armR.rotation.x = sw * .8; }
      r.body.position.y = Math.abs(Math.cos(e.walkT)) * .05;
    }
  } else if (e.phase === 'work') {
    r.legL.rotation.x = r.legR.rotation.x = 0;
    const w = Math.sin(time * 6 + e.seed);
    r.armR.rotation.x = -1 + w * .35; r.armL.rotation.x = -.8 - w * .2; r.head.rotation.x = .25;
    r.body.position.y = breathe;
    if (e.t <= 0) { r.head.rotation.x = 0; nextTask(e); }
  } else if (e.phase === 'drop') {
    r.legL.rotation.x = r.legR.rotation.x = 0;
    r.armL.rotation.x = r.armR.rotation.x = -1.4 + (1.1 - e.t) * .8;
    if (e.t < .5 && r.cube.visible) { r.cube.visible = false; brain.pulse = 1; }
    if (e.t <= 0) { e.phase = 'walkto'; e.target = pickSpot(e); }
  }
  g.position.y = groundY(g.position.x, g.position.z);
}

/* ── HUD, card, signs ────────────────────────────────────────────────────── */
let DATA = null;
function hud() {
  const list = AG.map(e => e.a);
  const working = AG.filter(e => e.ran && e.role !== 'bench').length, red = AG.filter(e => e.red).length;
  const wrote = AG.filter(e => e.ran).reduce((s, e) => s + (+e.a.produjo || 0), 0);
  $('hN').innerHTML = `${list.length}<span>agents on the island</span>`;
  $('hRan').textContent = working; $('hRed').textContent = red;
  const t = DATA && DATA.salud && DATA.salud.calculado ? String(DATA.salud.calculado).slice(11, 16) : new Date().toTimeString().slice(0, 5);
  $('hFoot').innerHTML = `${wrote} things written into your brain today<br>Live from your files · read ${esc(t)}`;
  Object.entries(signs).forEach(([k, s]) => {
    const n = AG.filter(e => e.k === k && e.role !== 'jefe').length;
    s.el.innerHTML = `<b style="background:${TEAM[k].css}"></b>${TEAM[k].name}<span>${n}</span><small>${TAG[k]}</small>`;
  });
  const nr = AG.filter(e => e.red).length;
  shopSign.innerHTML = `<b style="background:#ff6b5e"></b>Maintenance shop<span>${nr}</span><small>${nr ? 'Flagged red today — waiting for a fix' : 'Empty — nothing flagged today'}</small>`;
}
const signs = {};
Object.keys(DIST).forEach(k => {
  const el = document.createElement('div'); el.className = 'isl-sign'; labelsEl.appendChild(el);
  const d = DIST[k], b = toWorld(k, 0, -9.5);
  signs[k] = { el, p: new T.Vector3(b.x, d.h + ({ personas: 13, compromisos: 16, pensamiento: 16.5, mantenimiento: 9, fuera: 8 })[k], b.z) };
});
const brainSign = document.createElement('div'); brainSign.className = 'isl-sign'; labelsEl.appendChild(brainSign);
brainSign.innerHTML = '<b style="background:#5ef0c0"></b>Your second brain';
const shopSign = document.createElement('div'); shopSign.className = 'isl-sign'; labelsEl.appendChild(shopSign);
const shopP = new T.Vector3(SHOP.x, SHOP.h + 8, SHOP.z - 3);
const brainP = new T.Vector3(PLAZA.x, PLAZA.h + 9.5, PLAZA.z);

let selected = null;
function showCard(e) {
  if (!FULL) return;
  selected = e; const el = $('card');
  if (!e) { el.style.display = 'none'; return; }
  const a = e.a;
  const kind = { jefe: 'conductor', lider: 'lead', script: 'script', 'en-vivo': 'live voice', agente: 'agent' }[a.rol] || a.rol;
  let st, cls = '';
  if (a.rol === 'en-vivo') st = 'On call — works only when you open a chat with it.';
  else if (e.red) { st = esc(a.titulo || 'Broken'); cls = 'red'; }
  else if (e.amber) { st = esc(a.titulo || 'Worth a look'); cls = 'amber'; }
  else st = e.ran ? `Worked today · ${esc(a.ultima_texto || '')}` : `Waiting · last ran ${esc(a.ultima_texto || 'never')}`;
  if (a.proxima_texto && a.rol !== 'en-vivo') st += `<br>Next: ${esc(a.proxima_texto)}`;
  const proofs = (a.pruebas || []).map(p => `<li><b style="color:${p.ok ? '#7ee2a8' : '#ff8a7e'}">${p.ok ? '✓' : '✗'}</b>${esc(p.texto)}</li>`).join('');
  el.innerHTML = `<button class="x" aria-label="Close">×</button>
    <div class="t" style="color:${TEAM[e.k].css}">${TEAM[e.k].name} · ${esc(kind)}</div>
    <h2>${esc(a.nombre)}</h2><div class="st ${cls}">${st}</div>
    ${a.hace ? `<div class="lb">What it does</div><p>${esc(a.hace)}</p>` : ''}
    ${a.mensaje ? `<div class="lb">Its last report</div><p>${esc(a.mensaje)}</p>` : ''}
    ${proofs ? `<div class="lb">Proof it worked</div><ul>${proofs}</ul>` : ''}
    ${a.produjo ? `<div class="lb">Wrote</div><p>${a.produjo} thing${a.produjo === 1 ? '' : 's'} on its last run</p>` : ''}`;
  el.querySelector('.x').onclick = () => showCard(null);
  el.style.display = 'block';
}

/* ── camera: orbit, zoom, pan, tweens (frozen once right) ────────────────── */
const view = { tx: 0, ty: 6, tz: -2, dist: 140, yaw: 0, pitch: .36 };
const HOME = { tx: 0, ty: 6, tz: -2, dist: 140 * Math.max(1, Math.min(1.5, 1.7 / (W() / H()))), yaw: 0, pitch: .36 };
view.dist = HOME.dist;
let tween = null;
function applyCam() {
  const v = view, cp = Math.cos(v.pitch);
  cam.position.set(v.tx + Math.sin(v.yaw) * cp * v.dist, v.ty + Math.sin(v.pitch) * v.dist, v.tz + Math.cos(v.yaw) * cp * v.dist);
  cam.lookAt(v.tx, v.ty, v.tz);
}
function flyTo(to, ms) {
  const from = { ...view }; let dy = (to.yaw - from.yaw); dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  tween = { from, to: { ...to, yaw: from.yaw + dy }, t: 0, start: performance.now(), ms: ms || 1800 };
}
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
let drag = null;
const cv = R.domElement;
cv.addEventListener('pointerdown', ev => { drag = { x: ev.clientX, y: ev.clientY, moved: 0, pan: ev.button === 2 || ev.shiftKey }; cv.setPointerCapture(ev.pointerId); });
cv.addEventListener('pointermove', ev => {
  if (drag) {
    const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y; drag.x = ev.clientX; drag.y = ev.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.moved > 4) { cv.classList.add('drag'); tween = null; }
    if (drag.pan) {
      const s = view.dist * .0016, c = Math.cos(view.yaw), si = Math.sin(view.yaw);
      view.tx = Math.max(-55, Math.min(55, view.tx - (dx * c - dy * si) * s)); view.tz = Math.max(-55, Math.min(60, view.tz - (-dx * si - dy * c) * s));
    } else { view.yaw -= dx * .005; view.pitch = Math.max(.14, Math.min(1.3, view.pitch + dy * .004)); }
  } else hover(ev);
});
cv.addEventListener('pointerup', ev => { cv.classList.remove('drag'); if (drag && drag.moved < 5) click(ev); drag = null; });
cv.addEventListener('contextmenu', ev => ev.preventDefault());
cv.addEventListener('wheel', ev => { if (!FULL && !ev.ctrlKey && !ev.metaKey) return; ev.preventDefault(); tween = null; view.dist = Math.max(14, Math.min(220, view.dist * Math.exp(ev.deltaY * .0012))); }, { passive: false });
const ray = new T.Raycaster(), mv = new T.Vector2();
function pick(ev) { const rc = cv.getBoundingClientRect(); mv.set((ev.clientX - rc.left) / rc.width * 2 - 1, -((ev.clientY - rc.top) / rc.height) * 2 + 1); ray.setFromCamera(mv, cam); const h = ray.intersectObjects(HIT, false)[0]; return h ? h.object.userData.e : null; }
let hovered = null;
function hover(ev) { hovered = pick(ev); cv.classList.toggle('point', !!hovered); }
function click(ev) {
  const e = pick(ev);
  if (!FULL) { if (e && onPick) onPick(e.pid); if (e) { selected = e; refreshAll(); } }
  if (!e) { showCard(null); return; }
  showCard(e);
  if (!tourOn) flyTo({ tx: e.rig.g.position.x, ty: e.rig.g.position.y + 1, tz: e.rig.g.position.z, dist: Math.min(view.dist, 26), yaw: view.yaw, pitch: Math.max(.35, Math.min(.6, view.pitch)) });
}
$('bHome').onclick = () => { showCard(null); flyTo(HOME); };
ROOTQ.querySelectorAll('[data-home]').forEach(b => b.onclick = () => flyTo(HOME));

/* ── the tour: one shot per place, captions written from the data ───────── */
let tourOn = false, tourI = 0, SHOTS = [];
function shots() {
  const S = [];
  const working = AG.filter(e => e.ran && e.role !== 'bench').length, red = AG.filter(e => e.red);
  S.push({ v: HOME, h: `${AG.length} agents, one island`, s: `${working} of them worked today. Each one only moves if a file proves it ran.`, c: '#5ef0c0' });
  const jefe = AG.find(e => e.role === 'jefe');
  if (jefe) S.push({ v: { tx: PLAZA.x, ty: PLAZA.h + 2, tz: PLAZA.z, dist: 34, yaw: .35, pitch: .5 }, h: `${jefe.a.nombre} and the four leads`, s: jefe.a.hace || '', c: '#f3c53a' });
  ['personas', 'compromisos', 'pensamiento', 'mantenimiento'].forEach(k => {
    const d = DIST[k], mine = AG.filter(e => e.k === k && e.role !== 'jefe' && e.role !== 'lider');
    const lead = AG.find(e => e.role === 'lider' && e.k === k);
    const wrote = mine.filter(e => e.ran).reduce((s, e) => s + (+e.a.produjo || 0), 0);
    const live = mine.filter(e => e.role === 'bench').length;
    S.push({
      v: { tx: d.x, ty: d.h + 1.5, tz: d.z, dist: k === 'mantenimiento' ? 46 : 40, yaw: d.a + (k === 'personas' || k === 'pensamiento' ? -.35 : .35), pitch: .55 },
      h: `${TEAM[k].name} · ${mine.length} agents`,
      s: `${mine.filter(e => e.ran && e.role !== 'bench').length} worked today · ${wrote} things written${live ? ` · ${live} on call` : ''}${lead && lead.a.hace ? ' — ' + lead.a.hace : ''}`,
      c: TEAM[k].css,
    });
  });
  if (red.length) {
    const e = red[0];
    S.push({ v: { tx: SHOP.x, ty: SHOP.h + 2, tz: SHOP.z + 1, dist: 30, yaw: .25, pitch: .42 }, h: `The maintenance shop · ${red.length} need${red.length === 1 ? 's' : ''} you`, s: red.map(x => x.a.nombre).join(' · ') + ' — flagged red by today’s checks, so they leave their team and wait here. Each card shows the proof.', c: '#ff6b5e', pick: e });
  }
  S.push({ v: { tx: SUMMIT.x, ty: heightAt(SUMMIT.x, SUMMIT.z) + 6, tz: SUMMIT.z, dist: 60, yaw: .2, pitch: .22 }, h: '', s: '', c: '' });
  return S;
}
function tourGo(i) {
  SHOTS = shots(); tourI = Math.max(0, Math.min(SHOTS.length - 1, i)); const s = SHOTS[tourI];
  flyTo(s.v, 2200); showCard(s.pick || null);
  const cap = $('cap');
  if (!s.h) { cap.style.display = 'none'; return; }
  cap.innerHTML = `<div class="h"><b style="background:${s.c}"></b>${esc(s.h)}</div>${s.s ? `<div class="s">${esc(s.s)}</div>` : ''}<div class="n">${tourI + 1} / ${SHOTS.length} · → next · Esc out</div>`;
  cap.style.display = 'block';
}
function tour(on) { tourOn = on; document.body.classList.toggle('tour', on); $('bTour').textContent = on ? '■ Stop' : '▶ Tour'; if (on) tourGo(0); else { $('cap').style.display = 'none'; showCard(null); flyTo(HOME); } }
$('bTour').onclick = () => tour(!tourOn);
on(window, 'keydown', ev => {
  if (!FULL) return;
  const k = ev.key;
  if (k === 't' || k === 'T') return tour(!tourOn);
  if (k === 'f' || k === 'F') { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {}); else document.exitFullscreen(); return; }
  if (k === 'Escape') { if (tourOn) tour(false); else showCard(null); return; }
  if (!tourOn) return;
  if (k === 'ArrowRight' || k === ' ' || k === 'PageDown' || k === 'Enter') { ev.preventDefault(); if (tourI === SHOTS.length - 1) tour(false); else tourGo(tourI + 1); }
  if (k === 'ArrowLeft' || k === 'PageUp') { ev.preventDefault(); tourGo(tourI - 1); }
});

/* ── day and night ───────────────────────────────────────────────────────── */
let skyMode = 'day';
function bostonPhase() { const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })), h = d.getHours() + d.getMinutes() / 60; return h >= 15.5 && h < 17.25 ? 'sunset' : (h < 6 || h >= 17.25) ? 'night' : 'day'; }
function sunset() {
  skyU.top.value = col(0x2f3f78); skyU.hor.value = col(0xffa774);
  scene.fog.color = col(0xf2a57e);
  hemi.intensity = .6; hemi.color = col(0xffc7a6); hemi.groundColor = col(0x3c4a3a);
  sun.intensity = 1.35; sun.color = col(0xffa864); sun.position.set(-95, 32, 30);
  winMat.emissiveIntensity = 1.1; lampMat.emissiveIntensity = 2;
  water.material.color = col(0x3f6fa3);
  stars.visible = false; gear.beam.visible = true;
  clouds.forEach(c => c.children.forEach(m => m.material.color = col(0xffc2a3)));
  bloom.strength = .5; bloom.threshold = .95;
  finalPass.uniforms.exposure.value = 1.15;
}
function bostonNight() { const h = +new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(new Date()) % 24; return h < 6 || h >= 17; }
function setSky(mode) {
  skyMode = mode; ROOTQ.querySelectorAll('[data-sky]').forEach(b => b.classList.toggle('on', b.dataset.sky === mode));
  const ph = mode === 'auto' ? bostonPhase() : mode;
  if (ph === 'sunset') return sunset();
  const night = ph === 'night';
  skyU.top.value = col(night ? 0x040a1a : 0x5fa9e6); skyU.hor.value = col(night ? 0x1a2c50 : 0xe6f3fb);
  scene.fog.color = col(night ? 0x0d1830 : 0xe6f3fb);
  hemi.intensity = night ? .28 : .75; hemi.color = col(night ? 0x34508a : 0xdcefff); hemi.groundColor = col(night ? 0x0e1a12 : 0x6d8f55);
  sun.intensity = night ? .42 : 1.55; sun.color = col(night ? 0x9db8ff : 0xfff1dc); sun.position.set(night ? 50 : -60, night ? 80 : 90, night ? -30 : 55);
  winMat.emissiveIntensity = night ? 1.8 : 0; lampMat.emissiveIntensity = night ? 3 : .2;
  water.material.color = col(night ? 0x0f3557 : 0x2a86c4);
  stars.visible = night; gear.beam.visible = night;
  clouds.forEach(c => c.children.forEach(m => m.material.color = col(night ? 0x56607a : 0xffffff)));
  bloom.strength = night ? .85 : .2; bloom.threshold = night ? .55 : 1.4;
  finalPass.uniforms.exposure.value = night ? 1.4 : 1.05;
}
ROOTQ.querySelectorAll('[data-sky]').forEach(b => b.onclick = () => setSky(b.dataset.sky));
setSky('sunset');

/* ── frame loop ──────────────────────────────────────────────────────────── */
const vp = new T.Vector3();
function project(v3, el, offY) {
  vp.copy(v3).project(cam);
  if (vp.z > 1 || vp.x < -1.1 || vp.x > 1.1 || vp.y < -1.1 || vp.y > 1.1) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  el.style.transform = `translate(${(vp.x + 1) / 2 * W()}px,${(1 - vp.y) / 2 * H() - (offY || 0)}px) translate(-50%,-100%)`;
}
let time = 0, last = performance.now();
const hp = new T.Vector3();
function frame(dt) {
  time += dt;
  if (tween) {
    tween.t = (performance.now() - tween.start) / tween.ms; const k = ease(Math.min(1, tween.t));
    for (const key of ['tx', 'ty', 'tz', 'dist', 'yaw', 'pitch']) view[key] = tween.from[key] + (tween.to[key] - tween.from[key]) * k;
    if (tween.t >= 1) tween = null;
  }
  applyCam();
  AG.forEach(e => step(e, dt, time));
  brain.core.rotation.y += dt * .5; brain.core.rotation.x += dt * .2;
  brain.pulse = Math.max(0, brain.pulse - dt * 1.4);
  brain.coreMat.emissiveIntensity = 1.4 + brain.pulse * 2.5; brain.domeMat.emissiveIntensity = .25 + brain.pulse * .5;
  brain.core.scale.setScalar(1 + brain.pulse * .15);
  gear.g.rotation.z += dt * .6; gear.beamG.rotation.y += dt * .7;
  smoke.forEach(s => { s.t = (s.t + dt * .12) % 1; s.m.position.set(smoke.base.x + s.t * 1.2, smoke.base.y + s.t * 4, smoke.base.z); s.m.scale.setScalar(.5 + s.t * 1.4); s.m.material.opacity = .55 * (1 - s.t); });
  foam.material.opacity = .35 + Math.sin(time * 1.2) * .18;
  clouds.forEach(c => { c.position.x += c.userData.v * dt; if (c.position.x > 190) c.position.x = -190; });
  anim.forEach(f => f(time));
  FACE.forEach(f => { f.o.rotation.y = view.yaw - f.a; });
  const bt = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  clock.h.rotation.z = -((bt.getHours() % 12) + bt.getMinutes() / 60) / 12 * Math.PI * 2; clock.m.rotation.z = -bt.getMinutes() / 60 * Math.PI * 2;
  /* labels pinned to heads: all names when close, flags always, hovered/selected always */
  const close = view.dist < 62;
  AG.forEach(e => {
    const g = e.rig.g.position, near = close && Math.hypot(g.x - view.tx, g.z - view.tz) < view.dist * .42;
    const show = (near && (!e.rig.robot || view.dist < 30)) || e === hovered || e === selected || (e.red && close) || !!e.fix;
    if (!show) { e.tag.style.display = 'none'; return; }
    e.rig.head.getWorldPosition(hp); hp.y += .95; project(hp, e.tag, 0);
  });
  const far = view.dist > 70;
  Object.values(signs).forEach(s => far ? project(s.p, s.el, 0) : (s.el.style.display = 'none'));
  far ? project(brainP, brainSign, 0) : (brainSign.style.display = 'none');
  far ? project(shopP, shopSign, 0) : (shopSign.style.display = 'none');
  composer.render();
}
let raf = 0, dead = false;
function loop(now) { if (dead) return; const dt = Math.min(.05, (now - last) / 1000); last = now; if (!document.hidden && stage.isConnected && stage.offsetParent !== null) frame(dt); raf = requestAnimationFrame(loop); }
if (MANUAL && FULL) { window.__step = (n, dt) => { for (let i = 0; i < (n || 1); i++) frame(dt || 1 / 30); return time; }; window.__view = view; window.__tour = i => tourGo(i); window.__sky = setSky; }
else raf = requestAnimationFrame(loop);
function resize() {
  if (!W() || !H()) return;
  cam.aspect = W() / H(); cam.updateProjectionMatrix(); R.setSize(W(), H());
  composer.setSize(W(), H()); bloom.setSize(W(), H());
}
const RO = window.ResizeObserver ? new ResizeObserver(resize) : null; if (RO) RO.observe(stage); else on(window, 'resize', resize);

/* ── data ────────────────────────────────────────────────────────────────── */
async function load(first) {
  try {
    const r = await fetch('/api/datos', { cache: 'no-store' }); DATA = await r.json();
    const list = (DATA.salud && DATA.salud.agentes) || [];
    if (first) build(list);
    else { const by = Object.fromEntries(list.map(a => [a.id, a])); AG.forEach(e => { if (by[e.a.id]) e.a = by[e.a.id]; }); refreshAll(); }
    $('err').style.display = 'none';
  } catch (err) {
    console.error(err); if (first) { $('err').textContent = 'Can’t reach your panel — is Ezer running?'; $('err').style.display = 'block'; }
  }
}
let poll = 0;
if (FULL) { load(true); poll = setInterval(() => load(false), 60000); }
else build((S0 && S0.agentes) || []);
applyCam(); if (MANUAL && FULL) frame(1 / 30);
let selectCount = 0;
function look(e) {   /* frame one agent: from the plaza side in a district, from above in the shop or the plaza */
  const p = e.home, far = Math.hypot(p.x - PLAZA.x, p.z - PLAZA.z) > 12 && !e.red;
  flyTo({ tx: p.x, ty: groundY(p.x, p.z) + 1, tz: p.z, dist: far ? 30 : 26, yaw: far ? Math.atan2(PLAZA.x - p.x, PLAZA.z - p.z) : .3, pitch: far ? .5 : .8 });
}
function destroy() {
  dead = true; cancelAnimationFrame(raf); clearInterval(poll); offs.forEach(f => f()); if (RO) RO.disconnect();
  scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  composer.renderTarget1.dispose(); composer.renderTarget2.dispose(); R.dispose();
  if (R.forceContextLoss) R.forceContextLoss();
  stage.innerHTML = '';
}
return {
  select(id) {
    selectCount++;
    const e = id ? AG.find(x => x.pid === id) : null; selected = e || null; refreshAll();
    if (e) look(e);
  },
  /* m = {agentId: {k: 'fix'|'fixed', txt}} — blue = the Architect is fixing it now; teal = fixed, green after its next run */
  marcar(m) { AG.forEach(e => { const f = m && m[e.a.id]; e.fix = f && (f.k === 'fix' || f.k === 'fixed') ? f : null; }); refreshAll(); },
  /* the demo: after his decision, the agent leaves the shop and goes back to work */
  fix(id) { const e = AG.find(x => x.a.id === id); if (!e) return; e.a = { ...e.a, color: 'verde' }; e.fix = { k: 'fixed', txt: 'back to work · runs tonight at 23:00' }; refreshAll(); if (selected === e) setTimeout(() => look(e), 600); },
  get count() { return AG.length; },
  destroy,
};
}
