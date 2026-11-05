/* Exo v3 — the orb (2026-11-01). Pablo: "Tap the orb" — tap, talk, pause to send. It is the same ElevenLabs
   Exo as his phone line (+1 000 000 0000), opened in the browser with a signed pass from his Mac
   (/api/v3/voz). It asks for his code like any call from a number that isn't his cell (llamada.md §1) —
   skipping it from the app is a security decision left to Pablo (2026-11-01). The SDK is vendored
   (vendor/elevenlabs-client-1.28.0.js) so nothing loads from the internet. */
import { $, api, toast } from './app.js';

let conv = null, raf = 0;
function loadSdk() {
  if (window.ElevenLabsClient) return Promise.resolve(window.ElevenLabsClient);
  return new Promise((ok, no) => { const s = document.createElement('script'); s.src = '/vendor/elevenlabs-client-1.28.0.js'; s.onload = () => ok(window.ElevenLabsClient); s.onerror = no; document.head.appendChild(s); });
}
const ui = (state, said, reply) => {
  if (state != null) $('#vState').textContent = state;
  if (said != null) $('#vSaid').textContent = said;
  if (reply != null) $('#vReply').textContent = reply;
};
function pulse() {
  const o = $('#vOrb');
  const tick = () => {
    if (!conv) return;
    let v = 0; try { v = Math.max(conv.getOutputVolume ? conv.getOutputVolume() : 0, conv.getInputVolume ? conv.getInputVolume() * .8 : 0); } catch (_) { }
    o.style.transform = `scale(${1 + Math.min(.22, v * .6)})`;
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}
export async function end() {
  cancelAnimationFrame(raf);
  const c = conv; conv = null;
  try { if (c) await c.endSession(); } catch (_) { }
  $('#voice').classList.remove('on'); $('#orb').classList.remove('live'); $('#orbM').classList.remove('live');
}
export async function start() {
  if (conv) return end();
  $('#voice').classList.add('on'); $('#orb').classList.add('live'); $('#orbM').classList.add('live');
  ui('Connecting', '', ''); $('#vEnd').onclick = end;
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true }).then(s => s.getTracks().forEach(t => t.stop()));
  } catch (e) { ui('No microphone', '', 'Allow the microphone for Exo in your browser settings, then tap the orb again.'); return; }
  let pase;
  try { [pase] = await Promise.all([api('/api/v3/voz'), loadSdk()]); }
  catch (e) {
    const tel = '+10000000000';
    ui('Not connected', '', (e.body && e.body.error) || "Voice can't reach your Mac right now.");
    $('#vReply').insertAdjacentHTML('beforeend', ` <a href="tel:${tel}">Call Exo instead</a>.`); return;
  }
  try {
    conv = await window.ElevenLabsClient.Conversation.startSession({
      signedUrl: pase.signed_url, connectionType: 'websocket',
      onConnect: () => ui('Listening', '', 'Exo will ask for your code first — say it, then talk.'),
      onDisconnect: () => { if (conv) { conv = null; } setTimeout(() => { if (!conv) { $('#voice').classList.remove('on'); $('#orb').classList.remove('live'); $('#orbM').classList.remove('live'); } }, 900); },
      onError: (m) => { ui('Something went wrong', null, String(m && m.message || m || '')); },
      onModeChange: ({ mode }) => ui(mode === 'speaking' ? 'Speaking' : 'Listening'),
      onMessage: ({ message, source }) => { if (source === 'user') ui(null, message, ''); else ui(null, null, message); },
    });
    pulse();
  } catch (e) { conv = null; ui('Not connected', '', String(e && e.message || e)); toast("Voice didn't start.", true); }
}
