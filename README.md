# Exo — public demo

A guided demo of Exo, the personal AI Pablo González built with Claude Code: a second brain of notes, 28 agents that read his channels overnight, and one page that asks only for his judgment.

**Everything here is invented** — the people, the mail, the messages. The system is the real one: this is a copy of the panel Pablo opens every morning, answered from the invented data in `data/` and `run/data/` instead of the server on his Mac. Nothing is ever sent.

- `index.html` — the panel: Home, Meeting prep, Outreach (cold emails, a warm list, a searchable CRM map), Messages, Council (his communication coach and his council), Learn, Agents (a Three.js office), Me.
- `overlay.js` / `overlay.css` — the guided layer: today's view (the one thing he writes himself, typed live), enter with Pablo's own Exo intro or without, then Home: one card at a time, its app, back to Home where the card completes and its count drops to zero; the phone call last; his name. **Enter** advances (**Next** on a phone), **⇧Enter** enters without Exo, **←** goes back, **Esc** leaves the tour, **M** mutes.
- `demo.js` — stands in for the server; `run/` — the morning run and the study room, embedded.

Text written by Pablo. Code written with Claude.
