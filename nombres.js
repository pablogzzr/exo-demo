/* Exo v3 — the names of things (2026-11-01). Pablo: "create a shared lenguaje to give to architect so that I can
   more easily communicarte when tyring to improve or understand parts of the UI".
   THIS TABLE IS THE ONE HOME (2026-11-02: grouped, and the run, the brain map and every app added; a null selector = a part inside the run's frame, named but not pinned) of the names. ⌘K → "Show names" pins each name on screen; More → "Names of things"
   lists them; the Architect reads this file (pointer in .claude/skills/arquitecto/referencias/lenguaje-de-la-app.md).
   Rename a part here and both the screen and the list follow. Each row: [CSS selector, name, where, what it shows,
   file that draws it]. */
import { $, $$, esc, openSheet } from './app.js';

export const GRUPOS = [
  ['Every screen', [
    ['.side', 'Sidebar', 'Every screen, left (desktop)', 'The list of apps, grouped Today · Mind · Channels · You', 'index.html + app.js drawNav'],
    ['.side .prio', 'One-thing box', 'Sidebar, top', "Today's one thing, from the week file", 'app.js todayGoal'],
    ['.side-foot', 'Status line', 'Sidebar, bottom', 'Agents not working (from the health check) and when it last synced', 'app.js badges'],
    ['#cmd .bar, #cmd', 'Command bar', 'Bottom of every screen', 'Search notes, people, preps — or ask Exo; ⌘K opens it', 'app.js renderPal'],
    ['#orb', 'Orb', 'Right end of the command bar', 'Talk to Exo by voice', 'voz.js'],
    ['#hints', 'Quick asks', 'Under the command bar', 'Rundown · What’s next? · prep · council · search', 'app.js drawHints'],
    ['#tabs', 'Phone tabs', 'Bottom of the phone', 'Home · Prep · orb · Outreach · More', 'index.html'],
    ['#sheet', 'Sheet', 'Slides in from the right', 'Details on tap: a note, a rundown, a confirm', 'app.js openSheet'],
    ['#askPill', 'Answer-ready pill', 'Above the command bar', 'Tells you a question you closed has its answer; tap to reopen (⌘K → Recent asks keeps all)', 'app.js showPill']
  ]],
  ['Home', [
    ['#v-home .seg', 'Time switch', 'Home, top left', 'Morning / Day / Evening — follows the clock; tap to peek', 'app.js drawHome'],
    ['.intro-b', 'Intro button', 'Home, top right', 'Plays the Exo intro with your song', 'app.js drawHome'],
    ['#v-home .hi', 'Greeting', 'Home, hero', 'Good morning + one line on your day', 'app.js heroHtml'],
    ['#v-home .donow', 'Do now card', 'Home, hero right', 'The one thing Exo would do now, with the why', 'app.js candidates'],
    ['.miniclock', 'Clock', 'Home, next to the greeting', 'The time and the next event', 'app.js heroHtml'],
    ['.sugg', 'For today', 'Home, under the greeting', 'One learning, book, past thought or reminder from your notes that fits today — never how to use your time', 'app.js tipHoy + v3api estratega_dia'],
    ['.agents-alert', 'Agents alert', 'Home, under the hero', 'Shows only when an agent is red', 'app.js agentsLine'],
    ['.still', 'Still open', 'Home, evening', 'What is still open from the run', 'app.js stillOpenHtml'],
    ['.today', 'Today block', 'Home', 'What matters today, by the old run’s rule — one card per kind', 'app.js todayBlock'],
    ['.tgroup', 'Today card', 'Inside the Today block', 'What’s next · Meetings today · Due · Promises · Outreach · P1 · Waiting for', 'app.js todayBlock'],
    ['.card.tier', 'Run level', 'Home, morning', 'One level of the morning run with minutes left', 'app.js tierCards']
  ]],
  ['Needs you', [
    ['#v-needs', 'Needs you', 'Its own app (Today)', 'The morning run itself — every card you decide on', 'jarvis.js (embedded)'],
    [null, 'Level', 'Needs you', '00 Week close (Sundays) · 01 Urgent + important (every day) · 02 Important (often) · 03 Nice to have', 'jarvis.js TNAME'],
    [null, 'Group card', 'Inside a level', 'One kind of work: Meeting prep · Due soon · Bentley · Promises and replies · Warm outreach · LinkedIn · Events · Your AI toolbox', 'jarvis.js tiles'],
    [null, 'Row', 'Inside a group card', 'One thing to decide: keep or drop, with Undo', 'jarvis.js row'],
    [null, 'Why line', 'Under a row', 'Why the agent put it there; you can add your reason', 'jarvis.js why'],
    [null, 'Week close', 'Needs you, level 00 (Sundays)', 'The questions only you can answer, one at a time, then next week’s goals', 'jarvis.js wizard']
  ]],
  ['Meeting prep and Mail', [
    ['#v-prep', 'Meeting prep', 'Today', 'One page per meeting worth researching: who they are, Good to know, what to ask', 'apps.js APPS.prep'],
    ['#v-mail', 'Mail', 'Today', 'Your five inboxes, urgent first; reply and Send (tap twice to confirm)', 'apps.js APPS.mail']
  ]],
  ['Your day', [
    ['#dpDays', 'Day strip', 'Your day, top right', 'Today · Tomorrow · the next days', 'apps.js APPS.cal'],
    ['.dp-cal', 'Timeline', 'Your day, left', 'Every calendar for the day, by the hour, with the now line', 'apps.js APPS.cal.timeline'],
    ['#dpTasks', 'Priority list', 'Your day, right', 'Priority-1 tasks (tick closes in Todoist) and the rest behind a toggle', 'apps.js APPS.cal.tareas'],
    ['.dp-tip', 'Estratega tip', 'Your day, right top', 'One line on how to use the day, once a day', 'apps.js APPS.cal.tip + v3api estratega_dia']
  ]],
  ['Outreach', [
    ['.or-progress', 'Batch bar', 'Outreach, top', 'How many of today’s five you sent', 'outreach.js'],
    ['.or-card', 'Person card', 'Outreach', 'Who, why, the drafted message, Send · I sent it · Not this one', 'outreach.js card'],
    [null, 'From menu', 'Person card, above Send', 'Which inbox sends it: Bentley for Bentley, MIT for MIT, else the first email’s — you can change it', 'outreach.js']
  ]],
  ['Mind and Channels', [
    ['#v-council', 'Council', 'Mind', 'Ask the Estratega or the Filósofo', 'apps.js APPS.council'],
    ['#v-learn', 'Learn', 'Mind', 'Two tabs: Study (your study queue) and Flashcards', 'apps.js APPS.learn'],
    ['#v-meet', 'Meetings', 'Mind', 'Your recordings, newest first; open one to read it', 'apps.js APPS.meet'],
    ['#v-people', 'People', 'Mind', 'Your CRM: search a person, read their page', 'apps.js APPS.people'],
    ['#v-notes', 'Notes', 'Mind', 'Open any note in your second brain', 'apps.js APPS.notes'],
    ['#v-wa', 'WhatsApp', 'Channels', 'Who is waiting on you, and what was said', 'apps.js channel'],
    ['#v-in', 'LinkedIn', 'Channels', 'Messages, who is waiting, what moved', 'apps.js channel']
  ]],
  ['Learn', [
    ['.fc-review', 'Review card', 'Learn · Flashcards', 'One due card; Again · Hard · Good · Easy', 'tarjetas.js cards'],
    ['.fc-sug', 'Suggested cards', 'Learn · Flashcards', 'New cards from classes, recordings and study notes', 'tarjetas.js sugeridas']
  ]],
  ['Agents and the brain map', [
    ['.of-stage', 'Office', 'Agents, left', 'Every agent at a desk, colored by the health check', 'oficina.js construir'],
    ['.of-side', 'Agent panel', 'Agents, right', 'What is not working — or one agent’s proof', 'oficina.js lado'],
    ['#ofFeed', 'Today feed', 'Agents, between the office and Everyone', 'Today’s runs, newest first: time · agent · what it did; tap one for its proof', 'oficina.js feed'],
    ['.of-cols', 'Everyone list', 'Agents, bottom', 'All agents by orchestrator', 'oficina.js render'],
    [null, 'Brain map', 'You (opens full screen)', 'Your second brain in 3D with every agent around it; any tab closes it', 'jarvis-hud.js']
  ]],
  ['Me', [
    ['.me-tiles', 'Top numbers', 'Me, top', 'Hours on your fronts · morning streak · nights', 'yo.js tiles'],
    ['.me-goals', 'Goals card', 'Me', 'Week goals, each day’s one thing, the quarter', 'yo.js metas'],
    ['.me-streak', 'Mornings grid', 'Me', 'Which mornings you completed', 'yo.js racha'],
    ['.me-bars', 'Real vs planned', 'Me · Your time', 'Hours per front against plan', 'yo.js tiempo'],
    ['.me-line', 'Focus vs meetings', 'Me · Your time', 'Weekly hours on fronts vs in meetings', 'yo.js tiempo'],
    ['.me-ins', 'Sunday read', 'Me', 'What your week says, and one move', 'yo.js tiempo'],
    ['.me-trends', 'Trends', 'Me · after Your time', 'Last 30 days, one row a day: focus kept, Todoist closed, mail waiting, outreach sent/replies, LinkedIn impressions', 'yo.js tendencias'],
    ['.me-sleep', 'Nights chart', 'Me', 'Screen-off hours per night', 'yo.js salud'],
    ['.me-lab', 'Lab cards', 'Me, bottom', 'Questions about you, answered with your days', 'yo.js salud']
  ]],
];
export const PARTES = GRUPOS.flatMap(([, rs]) => rs);

let on = false, mo = null;
function tag() { PARTES.forEach(([sel, name]) => sel && $$(sel).forEach(el => { if (el.dataset.part) return; const k = name === 'Today card' && el.querySelector('.kick'); el.dataset.part = k ? 'Today · ' + k.textContent.split('·')[0].trim().toLowerCase().replace(/^./, c => c.toUpperCase()) : name; if (getComputedStyle(el).position === 'static') el.classList.add('nm-rel'); })); }
export function alternar(force) {
  on = force == null ? !on : force; document.body.classList.toggle('names', on);
  if (on) { tag(); mo = new MutationObserver(() => tag()); mo.observe(document.body, { childList: true, subtree: true }); }
  else { if (mo) { mo.disconnect(); mo = null; } $$('[data-part]').forEach(el => { delete el.dataset.part; el.classList.remove('nm-rel'); }); }
  return on;
}
export function lista() {
  openSheet({ kick: 'The shared language', title: 'Names of things', html: `<p class="mu" style="margin-bottom:14px">Use these names with the Architect: “make the Do now card smaller”, “the Timeline should start at 7”. ⌘K → <b>Show names</b> pins them on screen.</p>` +
    GRUPOS.map(([g, rs]) => `<div class="kick" style="margin:16px 0 6px">${g}</div>` + rs.map(([, n, w, s]) => `<div class="nm-row"><b>${esc(n)}</b><span>${esc(s)}</span><small>${esc(w)}</small></div>`).join('')).join('') });
}
