/* Exo public demo — the guided layer over the real panel.
   Scenes: intro (a drop opens into the orb and the title) → today's view (Exo writes the one thing, live) → enter with
   Pablo's own Exo intro (his song) or without → Home, the centre: everything blurs except the card being explained;
   Enter opens that card's app in the sidebar, Enter again brings you back and the card completes → the call → his name.
   Enter (or Next on a phone) advances everything; ← goes back; Esc leaves the tour; M mutes. */
import { go, $, $$, ST, openHud, runCmd, BADGE } from './app.js';

/* ── markup ───────────────────────────────────────────────────────────────── */
const html = `
<div id="ov-meet"><div class="m1">Meet <b>Exo</b></div><div class="m2">Pablo’s personal AGI system</div><button type="button" class="m3" data-ov="next"><span class="key">Enter ↵</span> to begin</button><div class="caps" aria-live="polite"><div class="cap"><b>2,311 notes.</b> Everything Pablo has read, written and decided.</div><div class="cap"><b>28 agents</b> read his 11 channels every night.</div><div class="cap">Each morning, <b>one page</b> asks only for his judgment.</div></div></div>
<section class="ov" id="ov-today">
  <div class="tv">
    <div class="lbl" id="tvDate">Today's view</div>
    <h1>Pablo, it’s <em id="tvClock"></em>.</h1>
    <p class="tv-sub">Read by 28 agents at 3:00 from 11 channels.</p>
    <div class="tv-cols"><div class="tv-col">
    <div class="lbl tv-h">Calendar</div>
    <div class="tv-rows">
      <div class="r"><span class="t">10:00 AM</span><span><b>Rebecca Lind · G19 Studio</b><i>First meeting · Zoom · prep ready</i></span></div>
      <div class="r"><span class="t">12:30 PM</span><span><b>CS100 · Prof. Marchetti</b><i>Class · Jennison 220</i></span></div>
      <div class="r"><span class="t">2:15 PM</span><span><b>Matthew Hale · NEST</b><i>First meeting · Kendall Square · prep ready</i></span></div>
      <div class="r"><span class="t">6:30 PM</span><span><b>HBS Latin America Club mixer</b><i>Spangler Center, Harvard</i></span></div>
    </div>
    </div>
    <div class="tv-pri tv-col"><div class="lbl tv-h">To-do list · top priorities</div>
      <ol><li><b>Send Daniela her two answers</b><i>Her board decides in two days · reply drafted</i></li><li><b>Bring three samples for Rebecca</b><i>Before 10:00 · two posts and work with Eduardo Vazquez</i></li><li><b>Send Sofía the one-pager you promised</b><i>She could intro you to speak at Venture Café</i></li></ol></div>
    </div>
    <div class="tv-one" id="tvOne"><div class="lbl">Today’s one thing <span id="tvWho">· Pablo writes it</span></div><div class="goal"><span id="tvGoal"></span><span class="caret"></span></div></div>
    <div class="tv-acts" id="tvActs"></div>
  </div>
</section>
<section class="ov gone" id="ov-call">
  <div>
    <div class="phone">
      <div class="top"><div class="orb"></div><b>Exo</b><span id="ovCallT">00:00 · on the phone</span></div>
      <div class="tr" id="ovTr"></div>
      <div class="end"><button data-ov="next" title="End the call" aria-label="End the call">●</button></div>
    </div>
    <div class="callside">Pablo just calls “Exo”, which answers with the context of his notes and the capabilities of Claude.</div>
  </div>
</section>
<section class="ov gone" id="ov-outro"><div class="name">Pablo González</div><div class="agi">My personal AGI system</div></section>
<button class="ovc" id="ov-resume" type="button" data-ov="resume"><i></i><span>Back to the guided tour</span><b>Enter ↵</b></button>
<div class="ovc" id="ov-spot" role="status" aria-live="polite">
  <div class="top"><span class="lbl" id="ovSpotL"></span><span class="n" id="ovSpotN"></span></div>
  <div id="ovSpotT"></div>
  <div class="acts"><span class="ov-links"><button type="button" data-ov="explore">Skip tour</button></span><button type="button" data-ov="prev" class="b g" id="ovPrev" aria-label="Back">← Back</button><button type="button" data-ov="next" class="b p" id="ovNext">Next <span class="key">Enter ↵</span></button></div>
  <div class="bar"><i id="ovBar"></i></div>
</div>
<div class="ovc" id="ov-hint"><span id="ovHintT">Press</span><span class="key">Enter ↵</span></div>
<div class="ovc" id="ov-tools"><button data-ov="mute" id="ovMute">sound on</button><button data-ov="restart">restart</button><button data-ov="explore" id="ovExplore">skip the tour</button></div>
<div class="ovc" id="ov-toast"></div>`;
const root = document.createElement('div'); root.id = 'ov-root'; root.innerHTML = html; document.body.appendChild(root);

/* ── the tour: Home's top, then every Home card in the sidebar's order.
   c = what the card on Home tells him · t = what its app shows ── */
const END = 'Thank you for your time and attention. I hope this was a fun trip.';
const GOAL = 'Be fully present and make others feel heard in both meetings today.';
const TOUR = [
  { k: 'home', l: 'Home', c: 'Exo greets Pablo with an insight and the most important thing to do right now.' },
  { k: 'donow', l: 'Do now', c: 'Exo picks the one task that matters most right now, so Pablo never wastes time deciding what’s next.', t: '', spots: [['#shBody', 'Daniela is asking two questions before her board decides. Exo wrote the reply from the project notes and their last call.', null, null, true]] },
  { k: 'prep', l: 'Meeting prep', c: 'Every meeting today comes with a prep, so Pablo never walks in cold.', t: '', pick: ['#prepBox .item', 'Rebecca'], spots: [['#prepBox .list', 'Every meeting from yesterday to the next ten days, each with a prep written overnight.'], ['#prepBox .pane .card.hot', 'The one question worth asking, so every meeting has a goal.'], ['#prepBox .pane .prose', 'Relevant information to know before the meeting.']] },
  { k: 'outreach', l: 'Outreach', c: 'Create and maintain relationships. Every message is already drafted, so reaching out takes seconds.', t: '', spots: [['.or-col:first-child', 'Cold outreach: the status says his current situation, and each message is drafted in his voice.', null, sendCold], ['#orWarm', 'Warm outreach: people he has already met, each with a one-line follow-up ready, so he never loses contact with people who could be valuable in the future.', () => setTimeout(sendWarmHalf, 900)], ['#orMap', 'His CRM map, where he can search groups of people like people that are from “San Francisco” for example.']] },
  { k: 'mail', l: 'Messages', c: 'Everything urgent and important from his channels: Mail, LinkedIn, iMessage and Instagram.', t: '', pick: ['#ibBox [data-m]', 'Daniela'], spots: [['#ibBox', 'Every message that needs him, with the reply already drafted. He reads it, and one click sends it.', () => setTimeout(showSend, 300), sendReply, 'under']] },
  { k: 'promises', l: 'Never miss anything', c: 'Every promise Pablo made, and every promise made to him, that isn’t on his to-do list or calendar yet.', t: '', spots: [['#pmMine', 'What he promised. Exo catches these in his messages, calls and meetings, so none slips.', null, addCoffee], ['#pmTheirs', 'What others promised him, with a nudge drafted when someone goes quiet.']] },
  { k: 'council', l: 'Council', c: 'Feedback on his life: his communication coach and his council tell him what to improve.', t: '', spots: [['#cCoach', 'His communication coach listens to his recorded calls and gives honest feedback.'], ['#cVoices', 'His council speaks through the voice of people he chose. Ex: Drucker on where his time goes, Frankl and Marcus Aurelius on what matters.'], ['.fb-table', 'The people at his table. Tap one to read why they are there.']] },
  { k: 'learn', l: 'Learn', c: 'His learning optimized. With the readings that matter most, learned in a way that sticks.', t: 'Exo selects the reading that matters most this week. The queue comes from topics and sources Pablo gave it, plus others it found.', subs: [
    { cap: 'Before reading, Pablo writes what he already thinks. Recalling first is what makes it stick.', run: () => studyStep('before'), pos: 'bot' },
    { cap: 'He reads the note Exo prepared: the 80/20 of the source, tied to his week.', run: () => studyStep('read'), pos: 'right' },
    { cap: 'Worth more time? One click opens a go-deeper session with Claude, with his context already written into the prompt. Optional, so the tour moves on.', run: () => studyStep('deeper'), pos: 'right' },
    { cap: 'He writes what he learned, in his own words. The key terms become flashcards.', run: () => studyStep('close'), pos: 'top' },
    { cap: 'Saved into his notes and his deck. Every morning Exo quizzes him: a question first, answered from memory.', run: () => studyStep('save'), pos: 'card' },
    { cap: 'He tries to remember, then shows the answer.', run: () => cardStep('flip'), pos: 'card' },
    { cap: 'Spaced repetition: he grades how well he remembered, and Exo brings the card back right before he would forget it. Tomorrow if it was hard, in a week or more if it was easy. Five minutes a day keeps hundreds of cards.', run: () => cardStep('grade'), pos: 'card' }] },
  { k: 'call', l: 'On the phone', c: 'The same brain could be accessed through a call, so Pablo could get work done while walking or in the subway.', call: true },
  { k: 'agents', l: 'Agents', c: '28 agents did the busywork overnight. One needs special attention.', t: '', spots: [['#ofStage', '28 agents with 4 orchestrators; the crowned one in the middle runs them all.'], ['#ofDecide', 'One agent failed because his setup changed: Bentley moved to a new sign-in. It needs one decision from Pablo, right here.', () => { if (window.__ofPick) window.__ofPick('canales-mac'); }, decideAgent]] },
  { k: 'me', l: 'Me', c: 'An analysis of his time and habits.', t: '', spots: [['.me-grid2', 'Time planned vs time spent, by priority.'], ['#meResp', 'How fast he answers the messages that matter. Prospects who reply wait the longest, so that is what he fixes next.']] },
];const CALL = [
  ['me', 'Exo, what did Sofía say on Saturday?'],
  ['j', '<b>Sofía Treviño</b>, Saturday 23:40 on WhatsApp: she offered an intro to a Boston family office that funds Mexican founders, and asked for your one-pager. You promised it. The draft is in Outreach.'],
  ['me', 'Add that I can be in Boston any Thursday.'],
  ['j', 'Added one line. It still ends with the question about the dinner. Want me to read it back?'],
  ['me', 'No. What’s my one ask for Matthew Hale?'],
  ['j', 'A 20-minute slot at NEST’s founder lunch in December. Don’t pitch — ask about his founders’ worst week.'],
];

/* ── state ────────────────────────────────────────────────────────────────── */
let sub = 0, scene = 'today', step = -1, phase = 'home', muted = false, introReady = false, callBusy = false, callFast = false, busy = false, runPresses = 0, tvStage = 0, typer = null;
const body = document.body;
const TOUCH = matchMedia('(hover: none) and (pointer: coarse)').matches;   /* a phone has no Enter key: tap, and the caption's Next */
const PHONE = () => innerWidth <= 900;
const wait = ms => new Promise(r => setTimeout(r, ms));
const keyWord = t => TOUCH ? t.replace(/\bEnter\b/g, 'Next') : t;
function hint(t) { $('#ovHintT').textContent = t; $('#ov-hint').classList.add('on'); }
function unhint() { $('#ov-hint').classList.remove('on'); }
function toast(h) { const t = $('#ov-toast'); t.innerHTML = h; t.classList.add('on'); clearTimeout(t._x); t._x = setTimeout(() => t.classList.remove('on'), 2400); }
function sceneOn(id) { $$('#ov-root .ov').forEach(s => { const on = s.id === 'ov-' + id;
  if (on) { s.classList.remove('gone'); void s.offsetWidth; }
  if (s.classList.contains('on') && !on) { s.classList.add('out'); setTimeout(() => { s.classList.remove('out'); if (!s.classList.contains('on')) s.classList.add('gone'); }, 750); }
  s.classList.toggle('on', on); }); }
function frame() { return $('#v-needs iframe'); }
function frameWin() { try { return frame().contentWindow; } catch (_) { return null; } }

/* ── today's view: the one thing types itself, then Next, then with or without Exo ── */
function showToday() {
  scene = 'today'; tvStage = 0; unhint(); sceneOn('today'); body.classList.add('ov-today');
  const d = new Date();
  $('#tvDate').textContent = 'Today’s view · ' + d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  $('#tvClock').textContent = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  $('#tvGoal').textContent = ''; $('#tvOne').classList.remove('done'); $('#tvActs').innerHTML = '';
  let i = 0; clearInterval(typer);
  setTimeout(() => { typer = setInterval(() => { $('#tvGoal').textContent = GOAL.slice(0, ++i); if (i >= GOAL.length) typed(); }, 38); }, 1100);
}
function typed() {
  clearInterval(typer); typer = null; $('#tvGoal').textContent = GOAL; if (tvStage) return; tvStage = 1;
  $('#tvOne').classList.add('done'); $('#tvWho').textContent = '· I write this myself every day';
  setGoal(); chooseStage();
}
function chooseStage() {
  tvStage = 2;
  $('#tvActs').innerHTML = `<button class="btn p" type="button" data-ov="with">${ico()} Open the panel <span class="key">Enter ↵</span></button>`;
}
const ico = () => '<i class="orbi"></i>';
function setGoal() {   /* the one thing he just watched being written shows in the sidebar and the run */
  try { sessionStorage.setItem('ov-goal', GOAL); const t = ST.D && ST.D.semana && (ST.D.semana.dias || []).find(x => x.es_hoy); if (t) t.texto = GOAL; const p = $('#prio'); if (p) { p.textContent = GOAL; p.classList.remove('empty'); } } catch (_) { }
}
function choose() { tvStage = 3; body.classList.remove('ov-today'); sceneOn(null); startTour(); }

/* ── Pablo's own Exo intro (the HUD in the run's frame, with his song) ── */
let hudHeld = false;
function startHud() {
  scene = 'hud'; hudHeld = true; unhint(); hideRun(true); $('#ov-tools').classList.remove('on');
  $('#ov-meet').classList.add('on');
  openHud('intro', { demo: 1 });
  const t0 = Date.now(); let seen = false;
  const watch = setInterval(() => {   /* the moment the intro closes, Home — never a glimpse of the run behind it */
    const w = frameWin(); const open = !!(w && w.JarvisHUD && w.JarvisHUD.isOpen); if (open && !seen) { seen = true; hideRun(true); if (!hudHeld) runCmd('introgo'); }   /* Enter came before the intro was ready: start it now */
    if ((seen && !open) || (!seen && !hudHeld && Date.now() - t0 > 15000)) { clearInterval(watch); if (scene === 'hud') { capsOff(); $('#ov-meet').classList.remove('on'); go('home'); hideRun(false); $('#ov-tools').classList.add('on'); showToday(); } }
  }, 60);
}
/* while the intro plays, only the intro: the run's own page behind it stays hidden */
function hideRun(on) { try { const d = frame().contentDocument; if (!d.getElementById('ovHudCss')) { const st = d.createElement('style'); st.id = 'ovHudCss'; st.textContent = 'body.ov-hud{background:#000!important}body.ov-hud>*{visibility:hidden!important}body.ov-hud>div[style*="z-index"]{visibility:visible!important}'; d.head.appendChild(st); } d.body.classList.toggle('ov-hud', on); } catch (_) { } }
/* while the constellation forms: three lines, one after another, timed to the clip */
let capT = [];
function capsOn() { const cs = $$('#ov-meet .cap'); capT.forEach(clearTimeout); capT = [];
  [[1700, 4300], [4700, 7300], [7700, 10400]].forEach(([a, b], i) => { capT.push(setTimeout(() => cs[i] && cs[i].classList.add('on'), a)); capT.push(setTimeout(() => cs[i] && cs[i].classList.remove('on'), b)); }); }
function capsOff() { capT.forEach(clearTimeout); capT = []; $$('#ov-meet .cap').forEach(c => c.classList.remove('on')); }
function beginHud() { hudHeld = false; unhint(); $('#ov-meet').classList.add('go'); capsOn(); try { const a = new Audio('./startup.mp3'); a.volume = .9; a.play().catch(() => { }); window.__exoClip = a; } catch (_) { } runCmd('introgo'); }
function skipHud() { if (hudHeld) { beginHud(); return; } capsOff(); $('#ov-meet').classList.remove('on'); const w = frameWin(); try { if (w && w.JarvisHUD && w.JarvisHUD.isOpen) { w.JarvisHUD.finish(); return; } } catch (_) { } scene = 'hud-x'; go('home'); hideRun(false); $('#ov-tools').classList.add('on'); showToday(); }

function startTour() {
  scene = 'tour'; body.classList.add('ov-tour'); sceneOn(null); unhint();
  $('#ov-tools').classList.add('on'); ST.hubSeen = new Set(); go('home'); setTimeout(() => showCard(0), 500);
}

/* ── Home: blur everything but one card, and say what it is ── */
function focusEl(i) { if (!TOUR[i]) return null; if (TOUR[i].k === 'donow') return $('#v-home .donow'); return i === 0 ? $('#v-home .hero') : $(`#v-home [data-hub="${TOUR[i].k}"]`); }
function applyFocus() {
  const on = scene === 'tour' && phase === 'home' && ST.view === 'home';
  body.classList.toggle('ov-focus', on);
  body.classList.toggle('ov-app', scene === 'tour' && phase === 'app');
  $$('#v-home .hero,#v-home .donow,#v-home .hub-b').forEach(x => x.classList.remove('ov-lit'));
  if (on) { const el = focusEl(step); if (el) el.classList.add('ov-lit'); }
  $$('#v-home .hub-b').forEach(x => { const seen = !!(ST.hubSeen && ST.hubSeen.has(x.dataset.hub)); x.classList.toggle('seen', seen); const hu = x.querySelector('.hub-u'); if (hu) { if (!hu.dataset.o) hu.dataset.o = hu.innerHTML; hu.innerHTML = seen ? '<b class="ok">✓</b> Done' : hu.dataset.o; } const bd = x.querySelector('.hub-badge'); if (bd && !bd._run) { if (seen) { bd.textContent = '✓'; bd.classList.add('zero'); } else if (bd.classList.contains('zero')) { bd.textContent = BADGE[x.dataset.hub] || ''; bd.classList.remove('zero'); } } });
}
async function showCard(i) {
  busy = true; step = i; phase = 'home'; const s = TOUR[i]; spotOff(); markRun();
  if (body.classList.contains('hud-on') || ST.view !== 'home') { go('home'); await wait(120); }
  applyFocus();
  const el = focusEl(i), v = $('#v-home');
  if (el) { const r = el.getBoundingClientRect(), vr = v.getBoundingClientRect();
    const want = i === 0 ? 0 : v.scrollTop + r.top - vr.top - (PHONE() ? 70 : Math.max(60, (innerHeight - r.height) / 2 - 90));
    v.scrollTo({ top: Math.max(0, want), behavior: 'smooth' }); }
  await wait(520);
  spot(s, s.c, true); busy = false;
}
/* Enter on a card: open its app in the sidebar */
async function openApp(i) {
  busy = true; phase = 'app'; const s = TOUR[i]; spotOff(); runPresses = 0;
  const el = focusEl(i); if (el) { el.classList.add('pulse'); await wait(420); el.classList.remove('pulse'); }
  applyFocus(); sub = 0;
  if (s.call) { busy = false; showCall(true); return; }
  spotI = 0; if (s.k === 'donow') { const d = $('#doGo');
    if (d) { const dn = $('#v-home .donow'); if (dn) { dn.classList.add('ov-lit'); dn.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      await wait(450); await fakeClick(d); d.click(); }
    await wait(500); if (!nextSpot(s)) spot(s, s.t, null); busy = false; return; }
  if (s.k === 'learn') { try { const k = 'jarvis-demo-state-v2', o = JSON.parse(sessionStorage.getItem(k) || 'null'); if (o && o.sala) { delete o.sala; sessionStorage.setItem(k, JSON.stringify(o)); } } catch (_) { } }
  go(s.k);
  if (s.notes) setTimeout(() => notesSearch('Ferra'), 450);
  if (s.pick) setTimeout(() => { const it = $$(s.pick[0]).find(x => x.textContent.includes(s.pick[1])); if (it) { it.scrollIntoView({ block: 'nearest' }); it.click(); } }, 700);
  if (s.k === 'learn') { resetLearn(); const lit0 = (n) => { const d = studyDoc(); if (d && d.querySelector('.next')) { setLStep(0); litFrame('.next'); } else if (n < 20) setTimeout(() => lit0(n + 1), 150); }; setTimeout(() => lit0(0), 700); }
  if (s.run) setTimeout(markRun, 500);
  afterRan.clear(); spotI = 0; await wait(s.spots ? 1000 : 350); if (!nextSpot(s)) spot(s, s.t, null); busy = false;
}
/* a section longer than the screen: the first Enter takes him to the bottom, the next one back to Home */
let scrolledDown = false;
function scrollerOf(k) { const v = $('#v-' + k); if (!v) return null;
  const c = [v, ...$$('*', v)].filter(e => e.scrollHeight - e.clientHeight > 120 && /auto|scroll/.test(getComputedStyle(e).overflowY) && e.offsetParent !== null);
  return c.sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0] || null; }
function toBottom(k) { const el = scrollerOf(k); if (!el || el.scrollTop >= el.scrollHeight - el.clientHeight - 40) return false; el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); return true; }
/* inside an app: light one part, blur everything around it */
let spotI = 0, anchorEl = null, curSel = null;
function clearApp() { curSel = null; const sp0 = $('#ov-spot'); const keepL = scene === 'tour' && phase === 'app' && TOUR[step] && TOUR[step].k === 'learn'; sp0.classList.remove('dock', 'lmid', 'ltop', 'lside', 'lbot'); if (!keepL) sp0.classList.remove('lright'); sp0.style.width = ''; body.classList.remove('ov-lblur'); $$('.ov-dim').forEach(x => x.classList.remove('ov-dim')); $$('.ov-alit').forEach(x => x.classList.remove('ov-alit')); body.classList.remove('ov-appfocus'); anchorEl = null; }
function lightApp(sel) {
  const root = sel.startsWith('#shBody') ? $('#sheet') : $('.view.on'); if (!root) return null;
  const el = [...root.querySelectorAll(sel)].find(x => x.offsetParent !== null && x.getBoundingClientRect().height > 8); if (!el) return null;
  clearApp(); let n = el;
  while (n && n !== root && n.parentElement) { [...n.parentElement.children].forEach(c => { if (c !== n && !c.matches('script,style')) c.classList.add('ov-dim'); }); n = n.parentElement; }
  el.classList.add('ov-alit'); body.classList.add('ov-appfocus'); el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); anchorEl = el; curSel = sel;
  setTimeout(() => { if (!el.isConnected || anchorEl !== el) return; const r = el.getBoundingClientRect(); if (r.top < -4 || r.top > innerHeight - 60) { el.scrollIntoView({ block: r.height > innerHeight ? 'start' : 'nearest' }); place(); } }, 900);   /* if the smooth scroll stalled, jump */
  return el;
}
function nextSpot(s) {   /* the next visible part; false when there is none left */
  while (s.spots && spotI < s.spots.length) { const [sel, cap, pre, , bare] = s.spots[spotI++]; if (pre) pre(); if (bare === 'under') { if (lightApp(sel)) { anchorEl = null; curSel = null; spot(s, cap, null); setTimeout(placeUnder, 450); return true; } continue; }
    if (bare) { spot(s, cap, null); $('#ov-spot').classList.add('lside'); return true; } if (lightApp(sel)) { spot(s, cap, true); setTimeout(place, 420); return true; } }
  return false;
}
/* Enter in the app: back to Home, the card completes, the next one lights up */
async function backHome(i) {
  busy = true; spotOff(); clearApp(); phase = 'home'; markRun();
  go('home'); await wait(150);
  ST.hubSeen.add(TOUR[i].k); applyFocus();
  const el = focusEl(i);
  if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('ov-lit', 'just-seen'); countDown(el); await wait(1100); el.classList.remove('just-seen'); }
  busy = false;
  if (i + 1 < TOUR.length) showCard(i + 1); else finishTour();
}
async function finishTour() {
  busy = true; phase = 'done'; applyFocus(); body.classList.remove('ov-focus');
  $('#v-home').scrollTo({ top: 0, behavior: 'smooth' });
  spot({ l: 'End of tour', k: 'home' }, END, null, true);
  busy = false;
}
let posK = '', pos = 0, posT = '';
const stepsOf = s => s.k === 'donow' ? 1 : 1 + (s.spots ? s.spots.length : 0) + (s.subs ? s.subs.length + 1 : 0);
function spot(s, text, anchor, last) {
  const i = TOUR.indexOf(s), n = TOUR.length;
  if (phase !== 'app' || posK !== s.k) { posK = s.k; pos = 1; posT = text; } else if (text !== posT) { pos++; posT = text; }
  $('#ovSpotL').textContent = s.l;
  const tot = stepsOf(s); $('#ovSpotN').textContent = last || tot < 2 ? '' : 'Step ' + Math.min(pos, tot) + ' of ' + tot;
  $('#ovSpotT').textContent = keyWord(text);
  const more = phase === 'app' && ((s.spots && spotI < s.spots.length) || (s.subs && sub < s.subs.length) || (s.spots && spotI > 0 && s.spots[spotI - 1][3]));   /* a part with an action still to show: Next, not Back to Home */
  $('#ovNext').firstChild.textContent = phase === 'app' ? (more ? 'Next ' : s.k === 'donow' ? 'Send it ' : s.k === 'learn' ? 'Grade it Good ' : 'Back to Home ') : last ? 'Finish ' : i === 0 ? 'Open Do now ' : 'Open ' + s.l + ' ';
  $('#ovBar').style.width = (last ? 100 : ((i + (phase === 'app' ? .5 : 0)) / (n - 1) * 100)) + '%';
  $('#ovPrev').style.visibility = i > 0 || phase === 'app' ? 'visible' : 'hidden';
  const sp = $('#ov-spot'); sp.classList.remove('anch'); sp.style.left = sp.style.top = sp.style.width = '';
  const lp = phase === 'app' && s.k === 'learn' ? 'right' : '';
  sp.classList.remove('dock', 'lmid'); sp.classList.toggle('ltop', lp === 'top'); sp.classList.toggle('lright', lp === 'right'); sp.classList.toggle('lbot', lp === 'bot'); body.classList.toggle('ov-lblur', !!lp);
  if (anchor) place(); sp.classList.add('on');
}
/* next to the lit card (re-measured: Home can redraw under it) */
const sideW = () => { const sd = $('.side'); return sd && innerWidth > 900 ? sd.getBoundingClientRect().right : 0; };
function place() {
  const sp = $('#ov-spot'), el = phase === 'app' ? anchorEl : focusEl(step);
  if (!el || PHONE() || scene !== 'tour' || (phase !== 'home' && phase !== 'app') || (phase === 'app' && TOUR[step] && TOUR[step].k === 'learn')) { sp.classList.remove('anch'); sp.style.left = sp.style.top = ''; return; }
  if (phase === 'app') {   /* beside the lit part if there is room (narrower if needed), else under or over it, never on the sidebar */
    const r = el.getBoundingClientRect(), L = sideW() + 16; sp.classList.add('anch');
    const spaceR = innerWidth - 16 - (r.right + 18), spaceL = r.left - 18 - L;
    const side = spaceR >= 340 ? 'r' : spaceL >= 340 ? 'l' : '';
    const w = side ? Math.min(500, side === 'r' ? spaceR : spaceL) : Math.min(500, innerWidth - L - 16);
    sp.style.width = w + 'px'; const h = sp.offsetHeight || 210; let left, top;
    if (side) { left = side === 'r' ? r.right + 18 : r.left - 18 - w; top = Math.max(16, Math.min(innerHeight - h - 20, r.top)); }
    else { left = Math.max(L, Math.min(innerWidth - w - 16, r.left + (r.width - w) / 2));
      top = r.bottom + 14 + h <= innerHeight - 16 ? r.bottom + 14 : r.top - h - 14 >= 16 ? r.top - h - 14 : innerHeight - h - 20; }
    sp.style.left = left + 'px'; sp.style.top = top + 'px'; return; }
  sp.style.width = '';
  const i = step;
  {
    sp.classList.add('anch'); const r = el.getBoundingClientRect(), w = Math.min(500, innerWidth - 32), h = sp.offsetHeight || 190;
    let top = r.bottom + 14; if (top + h > innerHeight - 20) top = r.top - h - 14; if (top < 16) top = Math.min(innerHeight - h - 20, r.top + 16);
    sp.style.left = Math.max(sideW() + 16, Math.min(innerWidth - w - 16, r.left + (i === 0 ? r.width - w - 20 : 0))) + 'px'; sp.style.top = top + 'px';
  }
}
addEventListener('resize', () => { if (scene === 'tour') place(); });
setInterval(() => { if (scene === 'tour' && !PHONE() && document.scrollingElement.scrollTop) document.scrollingElement.scrollTop = 0;   /* the page never drifts */
  if (scene === 'tour' && !busy) {
  if (phase === 'home') applyFocusIfLost();
  if (phase === 'app' && curSel && anchorEl && !anchorEl.isConnected) { const k = curSel; lightApp(k); }   /* the app redrew itself: light the same part again */
  if (phase === 'home' || anchorEl) place(); } }, 400);
function applyFocusIfLost() { const el = focusEl(step); if (el && !el.classList.contains('ov-lit') && !el.classList.contains('just-seen')) applyFocus(); }
function countDown(el) { const bd = el.querySelector('.hub-badge'); if (!bd) return; bd._run = true;
  bd.classList.add('ck-out'); setTimeout(() => { bd.textContent = '✓'; bd.classList.remove('ck-out'); bd.classList.add('zero', 'ck-pop'); bd._run = false; setTimeout(() => bd.classList.remove('ck-pop'), 900); }, 220); }
/* a cursor glides to a button and presses it, so the viewer sees what was clicked */
async function fakeClick(el) {
  let c = $('#ov-cursor'); if (!c) { c = document.createElement('div'); c.id = 'ov-cursor'; c.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M4 2l16 10-7 1.5L9.5 21z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>'; document.body.appendChild(c); }
  if (!el || scene !== 'tour') return;
  const r = el.getBoundingClientRect(); let ox = 0, oy = 0;
  if (el.ownerDocument !== document) { const f = $$('iframe').find(x => { try { return x.contentDocument === el.ownerDocument; } catch (_) { return false; } }); if (f) { const fr = f.getBoundingClientRect(); ox = fr.left; oy = fr.top; } }
  const fresh = !c.classList.contains('on');
  if (fresh) { c.style.transition = 'none'; c.style.left = (innerWidth * 0.62) + 'px'; c.style.top = (innerHeight * 0.82) + 'px'; c.classList.add('on'); void c.offsetWidth; }
  clearTimeout(c._off);
  c.style.transition = 'left .75s cubic-bezier(.3,.7,.2,1),top .75s cubic-bezier(.3,.7,.2,1)'; c.style.left = (ox + r.left + r.width * 0.55) + 'px'; c.style.top = (oy + r.top + r.height * 0.55) + 'px';
  await wait(800); el.classList.add('ov-press'); c.classList.add('press'); await wait(260); el.classList.remove('ov-press'); c.classList.remove('press');
  c._off = setTimeout(() => c.classList.remove('on'), 900);
}
const pressIt = async el => { if (!el) return null; await fakeClick(el); el.click(); return el; };
const afterRan = new Set();
/* Outreach: the cursor presses Send and the cold email flies out (nothing is really sent) */
async function sendCold() {
  const card = $('.or-col:first-child .or-card'); if (!card) return; const b = card.querySelector('[data-a="send"]');
  if (b) { b.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); await wait(350); await fakeClick(b); }
  card.classList.add('or-fly'); toast('Sent to ' + ((card.querySelector('h3') || {}).textContent || 'him') + ' · demo, nothing leaves'); await wait(750); card.style.display = 'none';
  const n = $('.or-col:first-child .or-n'); if (n) n.textContent = $$('.or-col:first-child .or-card').filter(x => x.style.display !== 'none').length + ' today';
}
/* then half the warm follow-ups go out, one by one */
async function sendWarmHalf() {
  const rows = $$('#orWarm .wl-r:not(.sent)'); const half = rows.slice(0, Math.ceil(rows.length / 2));
  for (const r of half) { if (scene !== 'tour' || phase !== 'app' || TOUR[step].k !== 'outreach') return; const b = r.querySelector('[data-wa="send"]'); if (b) await pressIt(b); await wait(250); }
}
/* Messages: the cursor sends the drafted reply */
function showSend() { const b = $('#ibBox [data-ok]'); if (!b) return; let el = b.parentElement; while (el && el !== document.body) { if (el.scrollHeight > el.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(el).overflowY)) { el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); break; } el = el.parentElement; } setTimeout(() => b.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 350); }
async function sendReply() { const b = $('#ibBox [data-ok]'); if (b) { showSend(); await wait(500); await fakeClick(b); b.click(); await wait(900); } }
/* Messages: the caption goes under the message list, the one place with nothing to read */
function placeUnder() {
  const sp = $('#ov-spot'), l = $('#ibBox .list'); if (!l || PHONE() || phase !== 'app') return;
  const items = $$('#ibBox .list [data-m]'), last = items[items.length - 1], r = l.getBoundingClientRect();
  const top = Math.max((last ? last.getBoundingClientRect().bottom : r.top) + 16, innerHeight - (sp.offsetHeight || 220) - 20);
  sp.classList.add('anch'); sp.style.left = Math.max(sideW() + 16, r.left) + 'px'; sp.style.width = Math.max(300, Math.min(500, r.width)) + 'px'; sp.style.top = Math.min(top, innerHeight - (sp.offsetHeight || 220) - 16) + 'px';
}
/* Agents: the cursor picks the first option, and the failed agent is set to run again tonight */
async function decideAgent() { const b = $('#ofDecide .of-opt'); if (!b) return; b.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); await wait(300); await pressIt(b); await wait(900); const d = $('#ofDecide'); if (d) lightApp('#ofDecide'); await wait(1300); }
async function addCoffee() { const b = $$('#pmMine [data-pmgo]').find(x => /calendar/i.test(x.textContent)); if (b && !b.disabled) { b.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); await wait(300); await pressIt(b); await wait(700); } }
function spotOff() { $('#ov-spot').classList.remove('on'); }

function next() {
  if (busy) return;
  if (scene === 'today') { if (tvStage < 2) { typed(); return; } if (tvStage === 2) choose(); return; }
  if (scene === 'hud') { skipHud(); return; }
  if (scene === 'tour') {
    if (phase === 'done') { endTour(); scene = 'outro'; sceneOn('outro'); hint('Explore the panel'); $('#ov-tools').classList.remove('on'); return; }
    const s = TOUR[step]; if (!s) return;   /* Enter pressed before Home's first card is up */
    if (phase === 'home') { if (step === 0) { ST.hubSeen.add('home'); step = 1; openApp(1); } else openApp(step); return; }
    { const cur = s.spots && spotI > 0 && s.spots[spotI - 1]; if (phase === 'app' && cur && cur[3] && !afterRan.has(cur)) { afterRan.add(cur); busy = true; Promise.resolve(cur[3]()).catch(() => { }).then(() => { busy = false; next(); }); return; } }
    if (nextSpot(s)) return;
    if (s.k === 'donow') { busy = true; const ok = $('#drOk'); spotOff(); (async () => { if (ok) { ok.scrollIntoView({ block: 'nearest' }); await fakeClick(ok); } clearApp(); if (ok) ok.click(); busy = false; backHome(step); })(); return; }
    if (s.subs && sub < s.subs.length) { const x = s.subs[sub++]; x.run(); spot(s, x.cap, null); return; }
    if (s.k === 'learn') { busy = true; spotOff(); gradeGood().then(() => { busy = false; backHome(step); }); return; }   /* Good ends the block: the cursor grades, then Home */
    backHome(step); return;
  }
  if (scene === 'call') { callFast = true; unhint(); sceneOn(null); if (callFree) { callFree = false; scene = 'free'; return; } scene = 'tour'; body.classList.add('ov-tour'); backHome(step); return; }
  if (scene === 'outro') { explore(); $('#ov-resume span').textContent = 'Watch the demo again'; $('#ov-resume').dataset.again = '1'; }
}
function prev() {
  if (busy) return;
  if (scene === 'tour') { if (phase === 'app') { clearApp(); try { if ($('#sheet').classList.contains('on')) $('#shClose').click(); } catch (_) { } showCard(TOUR[step].k === 'donow' ? 0 : step); return; } if (phase === 'done') { showCard(TOUR.length - 1); return; } if (step > 0) { const b = TOUR[step - 1].k === 'donow' ? 0 : step - 1; ST.hubSeen.delete(TOUR[b].k); showCard(b); } return; }
  if (scene === 'call') { callFast = true; sceneOn(null); scene = 'tour'; body.classList.add('ov-tour'); unhint(); showCard(step); return; }
  if (scene === 'outro') { sceneOn(null); unhint(); scene = 'tour'; body.classList.add('ov-tour'); $('#ov-tools').classList.add('on'); go('home'); finishTour(); }
}
function endTour() { clearApp(); body.classList.remove('ov-tour', 'ov-focus', 'ov-app'); spotOff(); $$('#v-home .ov-lit').forEach(x => x.classList.remove('ov-lit')); resetLearn(); }
/* Learn starts clean: a fresh study room, with nothing lit, blurred or half-typed from an earlier pass of the tour */
function resetLearn() {
  clearInterval(readThrough._t); $$('#lSteps li').forEach(li => li.classList.remove('on', 'ok')); $$('.ov-next').forEach(x => x.classList.remove('ov-next'));
  const st = $('#lT button[data-t="study"]'); if (!st) return;
  if (st.getAttribute('aria-pressed') === 'true') { const f = $('#v-learn iframe'); if (f) { try { f.contentWindow.location.reload(); } catch (_) { st.click(); } } } else st.click();
}
function explore(keepView) {
  scene = 'free'; clearInterval(typer); sceneOn(null); endTour(); sceneOn(null); unhint();
  try { const w = frameWin(); if (w && w.JarvisHUD && w.JarvisHUD.isOpen) w.JarvisHUD.close(); } catch (_) { }
  if (keepView !== true) { go('home'); $('#v-home').scrollTo({ top: 0 }); } $('#ov-tools').classList.add('on'); $('#ovExplore').style.display = 'none';
  $('#ov-resume').classList.add('on');
  toast('<b>Explore freely</b> · the button at the bottom takes you back to the tour');
}
/* back into the tour where he left it — nothing else on the page changes */
function resume() {
  if ($('#ov-resume').dataset.again) { try { sessionStorage.clear(); Object.keys(localStorage).filter(k => k.startsWith('jarvis')).forEach(k => localStorage.removeItem(k)); } catch (_) { } location.hash = ''; location.reload(); return; }
  $('#ov-resume').classList.remove('on'); $('#ovExplore').style.display = '';
  try { if ($('#sheet').classList.contains('on')) $('#shClose').click(); } catch (_) { }
  scene = 'tour'; body.classList.add('ov-tour'); ST.hubSeen = ST.hubSeen || new Set();
  if (step < 0 || step >= TOUR.length) { step = -1; startTour(); return; }
  go('home'); setTimeout(() => showCard(step), 300);
}

/* ── the run inside Needs you: start it without the start page, then Enter clicks its next button ── */
function runDoc() { try { return frame().contentDocument; } catch (_) { return null; } }
const vis = el => !!(el && el.offsetParent !== null && !el.disabled);
function startRunSilently() {
  const d = runDoc(); if (!d) return false; const g = d.querySelector('#go');
  if (vis(g)) { const ta = d.querySelector('textarea'); if (ta && !ta.value.trim()) { ta.value = GOAL; ta.dispatchEvent(new Event('input', { bubbles: true })); } g.click(); return true; }
  return !!d.querySelector('.tile');
}
function markRun() { const d = runDoc(); if (!d) return;
  if (!d.getElementById('ovNextCss')) { const st = d.createElement('style'); st.id = 'ovNextCss'; st.textContent = '.ov-next{outline:2px solid #6FA8FF!important;outline-offset:3px;box-shadow:0 0 0 6px rgba(111,168,255,.18),0 0 30px rgba(111,168,255,.35)!important;animation:ovNx 1.4s ease-in-out infinite}@keyframes ovNx{50%{box-shadow:0 0 0 10px rgba(111,168,255,.06),0 0 30px rgba(111,168,255,.2)}}'; d.head.appendChild(st); }
  if (scene !== 'tour' || phase !== 'app' || !TOUR[step] || !TOUR[step].run) { $$('.ov-next', d).forEach(x => x.classList.remove('ov-next')); return; }
  const b = nextRunButton(d); if (b && b.classList.contains('ov-next')) return;
  $$('.ov-next', d).forEach(x => x.classList.remove('ov-next')); if (b) { b.classList.add('ov-next'); const r = b.closest('.row,.tile,.closebar,[data-id]'); if (r && !r.closest('#sheet')) r.scrollIntoView({ block: 'center', behavior: 'smooth' }); else if (b.closest('#shBody')) b.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } }
/* what a person would press next in level 01: the open panel's next ✓ (or its close), else the next tile, else "Check 01" */
function nextRunButton(d) {
  const sh = d.querySelector('#sheet.show');
  if (sh) { const ok = [...sh.querySelectorAll('#shBody button[data-act="ok"]')].find(vis); return ok || d.querySelector('#shClose'); }
  const cb = d.querySelector('.closebar button[data-close="1"]'); if (!cb) return null;
  const lv = cb.closest('section') || d;
  return [...lv.querySelectorAll('.tile:not(.done) button[data-panel]')].find(vis) || (vis(cb) ? cb : null);
}
function approveInRun() {
  const d = runDoc(); if (!d) return false;
  if (vis(d.querySelector('#go'))) { startRunSilently(); setTimeout(markRun, 600); return true; }
  const b = nextRunButton(d); if (!b) return false;
  b.click(); [450, 1100].forEach(ms => setTimeout(markRun, ms)); return true;
}
setInterval(() => { if (scene === 'tour' && phase === 'app' && TOUR[step] && TOUR[step].run) markRun(); }, 700);   /* the run re-renders itself: keep the highlight on what Enter will press */
/* the run's start page is "today's view" — the tour never shows it: start the run as soon as its frame is ready */
const startT = setInterval(() => { if (startRunSilently()) clearInterval(startT); }, 500);
setTimeout(() => clearInterval(startT), 30000);

/* ── the study room, step by step ── */
function setLStep(i) { $$('#lSteps li').forEach(li => { const n = +li.dataset.i; li.classList.toggle('on', n === i); li.classList.toggle('ok', n < i); }); }
/* run fn once sel is on the study room's page (each screen appears after a click), at most 4 s */
function whenFrame(sel, fn, n = 0) { const d = studyDoc(); const el = d && d.querySelector(sel); if (el && el.offsetParent !== null) { fn(d, el); return; } if (n < 40 && scene === 'tour' && phase === 'app') setTimeout(() => whenFrame(sel, fn, n + 1), 100); }
function studyDoc() { try { return $('#v-learn iframe').contentDocument; } catch (_) { return null; } }
function typeInto(ta, text) { if (!ta) return; let i = 0; const t = setInterval(() => { ta.value = text.slice(0, i += 3); ta.dispatchEvent(new Event('input', { bubbles: true })); if (i >= text.length) clearInterval(t); }, 20); }
function litFrame(sel, scrollTo) {   /* light the parts of the study room that matter; blur everything else */
  const d = studyDoc(); if (!d) return;
  if (!d.getElementById('ovLitCss')) { const st = d.createElement('style'); st.id = 'ovLitCss'; st.textContent = '.ov-flit{outline:2px solid #6FA8FF!important;outline-offset:4px;border-radius:12px;box-shadow:0 0 0 8px rgba(111,168,255,.12),0 0 50px rgba(111,168,255,.3)!important;transition:outline-color .3s}.ov-fdim{filter:blur(1.5px) saturate(.75)!important;opacity:.42!important;transition:filter .4s,opacity .4s;pointer-events:none}.ov-compact .rd-head{display:none}.ov-compact #reader{padding-top:4px}.ov-compact #reader .box{margin-bottom:10px}.ov-compact #close{min-height:76px!important;height:76px}.ov-compact #reader .q{margin-bottom:6px}.ov-compact #reader .cards{gap:4px}.ov-compact #reader .cards .card{padding:6px 10px}.ov-compact #reader .cards .card .r{font-size:12px}.ov-compact #reader .cards+.hint{display:none}.ov-compact #reader .stage .acts .b:not([data-act=close-save]){display:none}'; d.head.appendChild(st); }
  d.querySelectorAll('.ov-flit').forEach(x => x.classList.remove('ov-flit')); d.querySelectorAll('.ov-fdim').forEach(x => x.classList.remove('ov-fdim'));
  const els = [].concat(sel || []).map(x => d.querySelector(x)).filter(Boolean); if (!els.length) return;
  els.forEach(el => { el.classList.add('ov-flit'); let n = el;
    while (n && n.parentElement && n !== d.body) { [...n.parentElement.children].forEach(c => { if (!els.some(e => c === e || c.contains(e)) && !c.matches('script,style,link')) c.classList.add('ov-fdim'); }); n = n.parentElement; } });
  (scrollTo ? d.querySelector(scrollTo) || els[0] : els[0]).scrollIntoView({ block: 'center', behavior: 'smooth' });
}
/* the read step: the note scrolls by from its first heading to its end, so the viewer sees how much he read */
function readThrough() {
  const d = studyDoc(); if (!d || scene !== 'tour' || phase !== 'app') return; const w = d.defaultView;
  const nt = d.querySelector('.note'); if (!nt) return;
  litFrame(['.note']);
  const se = d.scrollingElement || d.documentElement;
  const top = Math.max(0, nt.getBoundingClientRect().top + w.scrollY - 24);
  const end = Math.max(top, Math.min(se.scrollHeight - w.innerHeight, nt.getBoundingClientRect().bottom + w.scrollY - w.innerHeight + 60));
  w.scrollTo(0, top);
  const t0 = performance.now() + 700, dur = Math.min(9000, Math.max(3500, (end - top) * 5)), mySub = sub;
  clearInterval(readThrough._t);
  readThrough._t = setInterval(() => { if (scene !== 'tour' || phase !== 'app' || TOUR[step].k !== 'learn' || sub !== mySub) { clearInterval(readThrough._t); return; }
    const now = performance.now(); if (now < t0) return; const p = Math.min(1, (now - t0) / dur);
    w.scrollTo(0, top + (end - top) * (p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2)); if (p >= 1) clearInterval(readThrough._t); }, 16);
}
/* flashcards: the cursor shows the answer, then grades it */
function showCard_() { const c = $('.fc-review'); if (!c) return null; lightApp('.fc-review'); c.scrollIntoView({ block: 'center', behavior: 'smooth' }); return c; }
function cardStep(k) {
  const go = async () => { if (scene !== 'tour' || phase !== 'app') return;
    if (k === 'flip') { const b = $('#fcShow'); if (b) { b.scrollIntoView({ block: 'center', behavior: 'smooth' }); await wait(450); await pressIt(b); } }
    await wait(250); showCard_();
    if (k === 'grade') { const g = $('.fc-grades [data-g="bien"]'); if (g) g.classList.add('ov-next'); } };
  setTimeout(go, 300);
}
async function gradeGood() {
  const g = $('.fc-grades [data-g="bien"]'); if (g) { g.scrollIntoView({ block: 'center', behavior: 'smooth' }); await wait(400); await fakeClick(g); g.classList.remove('ov-next'); g.click(); await wait(700); }
}
function studyStep(k) {
  setLStep({ before: 1, read: 2, deeper: 3, close: 4, save: 5 }[k]);
  const d = studyDoc(); if (!d) return; const click = sel => { const b = [...d.querySelectorAll(sel)].find(x => x.offsetParent !== null && x.getBoundingClientRect().height > 0); if (b) { b.classList.remove('ov-fdim'); let n = b; while (n && n !== d.body) { n.classList.remove('ov-fdim'); n = n.parentElement; } b.classList.add('ov-flit'); b.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); pressIt(b); } return b; };
  if (k === 'before') { click('[data-open]') || click('.row[data-id]');
    whenFrame('#before', (dd, ta) => { litFrame(['#reader .box.active']); ta.blur(); setTimeout(() => typeInto(ta, 'An agent decides its own next step; a workflow follows steps I wrote. I think most of Exo is workflows.'), 350); }); }
  if (k === 'read') { click('[data-act="before-save"]'); whenFrame('.note', () => setTimeout(readThrough, 300)); }
  if (k === 'deeper') { clearInterval(readThrough._t); litFrame(['.deep']); }
  if (k === 'close') { click('[data-act="learned"]');
    whenFrame('#close', (dd, ta) => { dd.body.classList.add('ov-compact'); dd.defaultView.scrollTo(0, 0); litFrame(['#reader .box.active', '#reader .cards', '#reader .stage .acts [data-act=close-save]'], '#reader .box.active'); dd.defaultView.scrollTo({ top: 0 }); ta.blur(); setTimeout(() => typeInto(ta, 'Workflows run steps I designed; agents choose their own steps and tools. Start with the simplest thing that works and add autonomy only when the task needs it. For Exo, the 3 a.m. jobs stay workflows, and only the council and the prep research earn an agent loop.'), 350); }); }
  if (k === 'save') { click('[data-act="close-save"]'); setTimeout(() => litFrame(null), 1150);
    setTimeout(async () => { if (scene !== 'tour' || phase !== 'app') return; litFrame(null); const t = $('#lT button[data-t="cards"]'); if (t) { const lt = $('#lT'); lt.classList.add('ov-unblur'); t.classList.add('ov-tablit'); await pressIt(t); setTimeout(() => { lt.classList.remove('ov-unblur'); t.classList.remove('ov-tablit'); }, 900); }
      const show = (n = 0) => { if ($('.fc-review')) { showCard_(); return; } if (n < 30) setTimeout(() => show(n + 1), 100); }; show(); }, 1500); }
}
/* ── Council: show it working ── */
function notesSearch(q) { const i = $('#ntQ'); if (!i) return; i.value = ''; let n = 0; const tick = setInterval(() => { i.value = q.slice(0, ++n); if (n >= q.length) { clearInterval(tick); i.dispatchEvent(new Event('input', { bubbles: true })); i.blur(); setTimeout(() => { const f = $('#ntL .item'); if (f) f.click(); }, 650); } }, 70); }
function councilAsk() { const i = $('#cIn'); if (!i || $('#cLog .bubble')) return; i.value = 'Should I take a summer role at G19 if Rebecca offers one, or stay with Ferra?'; const b = $('#cGo'); if (b) b.click(); i.blur(); }

/* ── the call ─────────────────────────────────────────────────────────────── */
let callFree = false;
async function showCall(inTour) {
  callFree = !inTour && scene === 'free';
  scene = 'call'; sceneOn('call'); hint('Back to Home');
  const tr = $('#ovTr'); tr.innerHTML = ''; callBusy = true; callFast = false; const t0 = Date.now();
  const tk = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); $('#ovCallT').textContent = `0${Math.floor(s / 60)}:${(s % 60 + '').padStart(2, '0')} · on the phone`; }, 500);
  for (const [who, text] of CALL) {
    const m = document.createElement('div'); m.className = 'm ' + who; m.innerHTML = text; tr.appendChild(m);
    await wait(60); m.classList.add('on');
    await wait(callFast ? 60 : (who === 'j' ? 1300 : 700));
  }
  clearInterval(tk); callBusy = false;
  if (inTour && !callFast) { await wait(2200); if (scene === 'call' && !callFast) next(); }
}

/* ── keys: Enter is never swallowed — not by a text box, not by an iframe ── */
function onKey(e) {
  if (e.isComposing || e.metaKey || e.ctrlKey || e.altKey) return;
  const guided = scene !== 'free';
  const k = e.key;
  if (guided && (k === 'Enter' || k === 'ArrowRight')) {
    const t = e.target, typing = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
    if (k === 'ArrowRight' && typing) return;
    e.preventDefault(); e.stopImmediatePropagation(); if (typing && t.blur) t.blur();
    next(); return;
  }
  if (!guided) { if (k === 'Enter' && scene === 'free' && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || '') && $('#ov-resume').classList.contains('on') && !$('#sheet').classList.contains('on')) { e.preventDefault(); resume(); } return; }
  if (k === 'ArrowLeft') { e.preventDefault(); prev(); }
  else if (k === 'Escape') { if (scene === 'hud') { skipHud(); return; } e.preventDefault(); explore(); }
  else if (k.toLowerCase() === 'm' && !/^(INPUT|TEXTAREA)$/.test((e.target || {}).tagName || '')) toggleMute();
}
window.addEventListener('keydown', onKey, true);
/* every same-origin frame (the run, the HUD, the study room) forwards its keys here */
function hookFrames() { $$('iframe').forEach(f => { if (f._ov) return; f._ov = true; const wire = () => { try { f.contentWindow.addEventListener('keydown', onKey, true); } catch (_) { } }; f.addEventListener('load', wire); wire(); }); }
setInterval(hookFrames, 600); hookFrames();

root.addEventListener('click', e => {
  const b = e.target.closest('[data-ov]');
  if (!b) { if (e.target.closest('#ov-hint,#ov-outro') || (e.target.closest('#ov-today') && tvStage === 0)) next(); return; }
  const a = b.dataset.ov;
  if (a === 'resume') resume(); else if (a === 'next') next(); else if (a === 'with') choose(); else if (a === 'prev') prev(); else if (a === 'explore') explore(); else if (a === 'mute') toggleMute();
  else if (a === 'restart') { try { sessionStorage.clear(); Object.keys(localStorage).filter(k => k.startsWith('jarvis')).forEach(k => localStorage.removeItem(k)); } catch (_) { } location.hash = ''; location.reload(); }
});

/* ── sound: nothing plays before the first Enter (browsers block it, and a reader should choose) ── */
function toggleMute() {
  muted = !muted; $('#ovMute').textContent = muted ? 'sound off' : 'sound on'; $$('.ovMuteL').forEach(b => b.textContent = muted ? 'Sound off' : 'Sound on');
  try { const w = frameWin(); w.document.querySelectorAll('audio,video').forEach(a => a.muted = muted); if (w.__ovMute) w.__ovMute(muted); } catch (_) { }
}
function playSoundGate() { if (muted) { try { localStorage.setItem('jarvis-demo-muted', '1'); } catch (_) { } } }

/* a reader who lands on a section link (#/prep) skips the intro and explores */
if (/^#\/(?!home)[a-z]+/.test(location.hash)) explore(true); else startHud();   /* demo (Pablo, round 6): it opens on today's view */

function decorateHome() { applyFocus(); }
new MutationObserver(decorateHome).observe($('#v-home'), { childList: true });
window.__ov = { next, prev, call: () => showCall(), get s() { return { scene, step, phase, sub, busy, runPresses }; } };   /* for checking the tour from the console */
