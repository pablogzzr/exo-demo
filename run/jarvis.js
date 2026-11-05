/* Exo — Pablo's morning run (2026-10-15).
   The design is the one he settled in eleven rounds (1 Projects/Exo v2/jarvis-rediseno-gustos_2026-10-14.md);
   everything on screen comes from /api/datos and the other routes of servidor.py, which read and write only
   5 Sistema/. Nothing here is sample data: a tile with nothing behind it hides.
   How the pieces fit, and the traps: GUIA.md, "The morning run — the real panel". */
'use strict';
const QS = new URLSearchParams(location.search);
/* Exo v3 (2026-11-01): the run lives inside the new app as "Needs you" (/run?embed=1&tema=spazio). EMB hides
   what the app's shell already draws, takes the Spazio look, keeps the thinking cards for the evening (Pablo:
   "Evening, one at a time") and tells the app what is open after every render (embReport). On its own (/classic)
   nothing changes. */
const EMB = QS.get('embed')==='1' && window.parent!==window;
if(QS.get('tema')==='spazio'){ const l=document.createElement('link'); l.rel='stylesheet'; l.href='tema-run.css'; document.head.appendChild(l); document.documentElement.classList.add('spazio'); }
if(EMB) document.documentElement.classList.add('emb','emb-run');
/* his Mac's "reduce motion" (and ?motion=reduce, to test it) */
const RM = QS.get('motion')==='reduce' ? {matches:true} : matchMedia('(prefers-reduced-motion: reduce)');
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
function iso(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
/* Boston's clock, same as the server's ahora_boston() (2026-10-17): when he travels, the Mac's clock
   gave a different 'today', Sunday and morning dot than the server. Every 'now' below is this one. */
function NOW(){ return new Date(); }   /* demo: the viewer's own clock (the data's dates are relative to the viewer's day) */
const DAY = iso(NOW());
const TOUCH = matchMedia('(hover:none) and (pointer:coarse)').matches;   /* his iPhone (2026-10-21): no keyboard, so no auto-focus that pops it up */
const SUN = QS.get('sun')==='1';   /* demo: level 00 only on ?sun=1, whatever the weekday */
/* WK — level 00 is on. Sunday always; 2026-10-19 also any later day while the latest Sunday's close is still open
   (Pablo skipped Sunday and it vanished Monday). Set in build(), once the data is in. */
let WK=SUN;
const UNDO_MS = 6000;

/* a gentle spring (no visible bounce) sampled into CSS linear(); falls back to an ease-out curve */
function springCSS(k,c){ let x=0,v=0; const pts=[]; const dt=1/120; let t=0; while(t<2){ const a=k*(1-x)-c*v; v+=a*dt; x+=v*dt; t+=dt; pts.push(x); if(t>.3&&Math.abs(1-x)<.001&&Math.abs(v)<.01) break; }
  const n=Math.min(40,pts.length), step=pts.length/n, out=[]; for(let i=0;i<n;i++) out.push(+pts[Math.floor(i*step)].toFixed(3)); out[0]=0; out.push(1); return {css:'linear('+out.join(',')+')', ms:Math.round(t*1000)}; }
let SPRING='cubic-bezier(.22,1,.36,1)';
try{ if(CSS.supports('transition-timing-function','linear(0, 1)')){ const sp=springCSS(210,27); SPRING=sp.css; document.documentElement.style.setProperty('--spring',sp.css); document.documentElement.style.setProperty('--spring-ms',Math.min(620,Math.max(380,sp.ms))+'ms'); } }catch(_){}

/* ───── libraries: copied onto this Mac in .claude/app/vendor/; the internet only if that copy is missing ───── */
const CDN3='https://cdn.jsdelivr.net/npm/three@0.128.0/';
const LIBS={
  three:[['vendor/three.min.js',CDN3+'build/three.min.js']],
  fx:[['vendor/CopyShader.js',CDN3+'examples/js/shaders/CopyShader.js'],['vendor/LuminosityHighPassShader.js',CDN3+'examples/js/shaders/LuminosityHighPassShader.js'],
      ['vendor/EffectComposer.js',CDN3+'examples/js/postprocessing/EffectComposer.js'],['vendor/RenderPass.js',CDN3+'examples/js/postprocessing/RenderPass.js'],
      ['vendor/ShaderPass.js',CDN3+'examples/js/postprocessing/ShaderPass.js'],['vendor/UnrealBloomPass.js',CDN3+'examples/js/postprocessing/UnrealBloomPass.js']],
  hud:[['jarvis-hud.js']],
  matter:[['vendor/matter.min.js','https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js']],
  confetti:[['vendor/confetti.browser.js','https://cdnjs.cloudflare.com/ajax/libs/canvas-confetti/1.9.3/confetti.browser.min.js']]
};
function loadOne(srcs){ return new Promise((ok,no)=>{ let i=0; const next=()=>{ if(i>=srcs.length) return no(new Error('could not load '+srcs[0])); const s=document.createElement('script'); s.src=srcs[i++]; s.onload=()=>ok(); s.onerror=()=>{ s.remove(); next(); }; document.head.appendChild(s); }; next(); }); }
const LOADED={};
function need(...names){ return names.reduce((p,n)=>p.then(()=>LOADED[n]||(LOADED[n]=LIBS[n].reduce((q,s)=>q.then(()=>loadOne(s)),Promise.resolve()).catch(e=>{ delete LOADED[n]; throw e; }))),Promise.resolve()); }

/* ───── text: escaping and the bit of markdown the agents write ───── */
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SAFE=/^(https?:|mailto:|message:|whatsapp:|obsidian:|podcasts?:|ms-word:)/i;
const blank=u=>/^https?:/i.test(u)?' target="_blank" rel="noopener"':'';
function inl(t){
  let h=esc(t);
  h=h.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,(_,n,a)=>`<a href="#" data-nota="${n.trim()}">${a||n}</a>`);
  h=h.replace(/\[([^\]]+)\]\(([^\s)]+)\)/g,(m,txt,url)=>{ const u=url.replace(/&amp;/g,'&'); return SAFE.test(u)?`<a href="${esc(u)}"${blank(u)}>${txt}</a>`:txt; });
  h=h.replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');
  h=h.replace(/(^|[\s(\[—–:«"¿¡])\*([^*\n]+)\*/g,'$1<em>$2</em>');
  h=h.replace(/`([^`]+)`/g,'<code>$1</code>');
  return h; }
function mdTable(rows){ const cells=r=>r.trim().replace(/^\||\|$/g,'').split('|').map(c=>c.trim()); const body=rows.filter(r=>!/^\s*\|?\s*:?-{2,}/.test(r)); if(!body.length) return '';
  const [h,...rest]=body; return '<table><tr>'+cells(h).map(c=>'<th>'+inl(c)+'</th>').join('')+'</tr>'+rest.map(r=>'<tr>'+cells(r).map(c=>'<td>'+inl(c)+'</td>').join('')+'</tr>').join('')+'</table>'; }
function md(t){
  t=String(t||'').replace(/<!--[\s\S]*?-->/g,''); const L=t.split('\n'); let out='', list=null, para=[];
  const flushP=()=>{ if(para.length){ out+='<p>'+inl(para.join(' '))+'</p>'; para=[]; } };
  const closeL=()=>{ if(list){ out+='</'+list+'>'; list=null; } };
  for(let i=0;i<L.length;i++){ const l=L[i]; let m;
    if(/^\s*$/.test(l)){ flushP(); closeL(); continue; }
    if((m=l.match(/^(#{1,4})\s+(.*)/))){ flushP(); closeL(); const n=m[1].length; out+=`<h${n}>${inl(m[2])}</h${n}>`; continue; }
    if(/^\s*(---|\*\*\*)\s*$/.test(l)){ flushP(); closeL(); out+='<hr>'; continue; }
    if((m=l.match(/^>\s?(.*)/))){ flushP(); closeL(); out+='<blockquote>'+inl(m[1])+'</blockquote>'; continue; }
    if(/^\s*\|/.test(l)){ flushP(); closeL(); const rows=[]; while(i<L.length&&/^\s*\|/.test(L[i])) rows.push(L[i++]); i--; out+=mdTable(rows); continue; }
    if((m=l.match(/^\s*[-*]\s+(?:\[(.)\]\s+)?(.*)/))){ flushP(); if(list!=='ul'){ closeL(); out+='<ul>'; list='ul'; } out+='<li>'+(m[1]?(m[1]==='x'?'✓ ':m[1]==='-'?'✕ ':''):'')+inl(m[2])+'</li>'; continue; }
    if((m=l.match(/^\s*\d+[.)]\s+(.*)/))){ flushP(); if(list!=='ol'){ closeL(); out+='<ol>'; list='ol'; } out+='<li>'+inl(m[1])+'</li>'; continue; }
    if(list&&/^\s{2,}\S/.test(l)){ out=out.replace(/<\/li>$/,' '+inl(l.trim())+'</li>'); continue; }
    closeL(); para.push(l.trim()); }
  flushP(); closeL(); return out; }

/* One agent row → title, context, and its buttons to where the action happens (LEEME "Every row has a button"). */
const EMO=/^[\s←-⇿⌀-➿⬀-⯿\u{1F000}-\u{1FAFF}️‍]+/u;
function parseRow(text){
  let t=String(text||'').replace(/\{[a-z]+:[^}]*\}/gi,'').replace(/<!--[\s\S]*?-->/g,'');
  const links=[], notes=[];
  t=t.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,(_,n,a)=>{ notes.push([a||n,n.trim()]); return ' '; });
  t=t.replace(/\[([^\]]+)\]\(([^\s)]+)\)/g,(m,l,u)=>{ if(SAFE.test(u)){ links.push([l,u]); return ' '; } return l; });
  t=t.replace(/\*\*linkedin\*\*\s+(https?:\/\/\S+)/i,(m,u)=>{ links.push(['LinkedIn',u]); return ' '; });
  t=t.replace(/\*\*→[^*]*\*\*/g,' ').replace(/borrador en tu Gmail\s*→?/gi,' ');
  t=t.replace(/\s*→\s*(?=$|·)/g,' ').replace(/(\s*·\s*){2,}/g,' · ').replace(/[\s·]+$/,'').trim().replace(EMO,'');
  let ti='', ctx='';
  const m=t.match(/^\*\*(.+?)\*\*\s*([\s\S]*)$/);
  if(m){ ti=m[1]; ctx=m[2].replace(/^[\s—–·:,-]+/,''); }
  else { const s=t.match(/^([\s\S]{20,170}?[.?!])\s+([\s\S]*)$/); if(s){ ti=s[1]; ctx=s[2]; } else ti=t; }
  ctx=ctx.replace(/[\s·→]+$/,'').trim();
  return {ti, ctx, links, notes}; }
/* 2026-10-19 — every Bentley homework opens in Brightspace (Pablo: "a button link with a command in the bentley homeworks
   that lead me to the brightspace link of the homework"). Its own link when the row has one; otherwise the course's page.
   Key B. */
const BS='https://brightspace.bentley.edu/d2l/', BS_OU={CS100:61074,CS399:61135,FDS100:61347,AI101:61048,MG116:61693};
/* 2026-10-19 — every Promises and replies row opens its source (Pablo: "add it also with the source from promises and
   replies"). The channel is the one the row names first; a row that already links to it keeps its own link. Key S. */
function srcLink(r,it){
  const raw=String(it.texto||''), txt=(r.ctx||'')+' '+raw, links=r.links||(r.links=[]);
  const mail=(raw.match(/`([^`\s]+@[^`\s]+)`/)||[])[1];
  const ti=String(r.ti).replace(/^TODAY\s*—\s*/i,''), to=ti.match(/—\s*to\s+(.+)$/i);
  const owes=ti.match(/^(.+?)\s+owes you\b/i);
  const name=(to?to[1]:owes?owes[1]:ti.replace(/^[^:—]*:\s*/,'')).replace(/\[\[|\]\]/g,'').split(/\s+(?:—|\(|owes\b)/)[0].replace(/`[^`]*`/g,'').trim();
  const meet=/lo anotó Granola|lo anotó la grabación|Granola/i.test(raw)&&(raw.match(/\*\*[^*]+\*\*[^*]*?\*([^*"]{4,90})\*/)||[])[1];
  if(meet&&!(r.notes||[]).length){ const x=['Source · the meeting','granola:'+meet.trim(),'S']; (r.notes=r.notes||[]).push(x);
    getNote(x[1]).catch(()=>{ r.notes=r.notes.filter(y=>y!==x); sheetOpen?renderSheet():render(); }); return; }
  const ch=(txt.match(/\b(WhatsApp|LinkedIn|Outlook|Gmail|e-?mail|mail|Granola|Instagram|iMessage)\b/i)||[])[1]||(mail?'mail':'');
  const has=re=>links.some(l=>re.test(l[1]));
  let u=null, lab='';
  if(/whatsapp/i.test(ch)){ if(!has(/^whatsapp:/i)){ u='whatsapp://'; lab='Source · WhatsApp'; } }
  else if(/linkedin/i.test(ch)){ if(!has(/linkedin\.com/i)){ u='https://www.linkedin.com/messaging/'; lab='Source · LinkedIn messages'; } }
  else if(/outlook/i.test(ch)||(/mail/i.test(ch)&&/VYNMSA/.test(txt)&&!mail)){ u='https://outlook.office.com/mail/'; lab='Source · Outlook'; }
  else if(/mail/i.test(ch)){ if(!has(/^(message|mailto):|mail\.google/i)){ u='https://mail.google.com/mail/u/0/#search/'+encodeURIComponent(mail||(name?'"'+name+'"':'')); lab='Source · Gmail'; } }
  else if(/instagram/i.test(ch)){ u='https://www.instagram.com/direct/inbox/'; lab='Source · Instagram'; }
  else if(/imessage/i.test(ch)){ u='sms:'; lab='Source · Messages'; }
  const own=links.findIndex(l=>/^(whatsapp|message|mailto):|linkedin\.com|mail\.google/i.test(l[1]));
  if(u) links.unshift([lab,u,'S']); else if(own>=0) links[own]=[links[own][0],links[own][1],'S']; }
function bsLinks(course,links){ const bs=links.filter(l=>/brightspace\.bentley\.edu/i.test(l[1])), rest=links.filter(l=>!bs.includes(l));
  const out=bs.map((l,i)=>[bs.length>1?'Open in Brightspace: '+String(l[0]).replace(/\*/g,'').slice(0,30):'Open in Brightspace',l[1],i?'':'B']);
  if(!out.length&&course!=='Bentley') out.push([BS_OU[course]?'Open the course in Brightspace':'Open Brightspace',BS_OU[course]?BS+'home/'+BS_OU[course]:BS+'home','B']);
  return [...out,...rest]; }
/* 2026-10-21 — Pablo: "Keep the same keyboard keys … I want to memorize each letter for each botton". A LinkedIn profile is always P. */
const LI_PROFILE=/linkedin\.com\/(in|pub|search\/results\/people)\b/i;
function linkBtn([l,u,chip]){
  if(!chip&&LI_PROFILE.test(u)) chip='P';
  let lab=String(l).replace(/\s*↗$/,'');
  if(/^message:/i.test(u)) lab='Open the email in Mail'; else if(/^whatsapp:/i.test(u)) lab='Open in WhatsApp'; else if(/^mailto:/i.test(u)) lab='Write it in Mail';
  return `<a class="b go" href="${esc(u)}"${blank(u)}${chip&&chip!=='↵'?` data-key="${esc(chip.toLowerCase())}"`:''}>${esc(lab)} ↗${chip?`<span class="kchip">${esc(chip)}</span>`:''}</a>`; }

/* dates the agents write: "15 oct", "16 oct · hoy", "2026-10-16", "2026-10-16T17:00" */
const MES={ene:0,jan:0,feb:1,mar:2,abr:3,apr:3,may:4,jun:5,jul:6,ago:7,aug:7,sep:8,oct:9,nov:10,dic:11,dec:11};
function whenOf(c){ const s=String(c||''); let m=s.match(/(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/); if(m) return new Date(+m[1],+m[2]-1,+m[3],+(m[4]||0),+(m[5]||0));
  const e=s.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})\b/); if(e){ const n=NOW(), r=new Date(n.getFullYear(),MES[e[1].toLowerCase()],+e[2]); if(r-n>200*864e5) r.setFullYear(r.getFullYear()-1); if(n-r>200*864e5) r.setFullYear(r.getFullYear()+1); return r; }
  m=s.match(/(\d{1,2})\s+([a-záé]{3})/i); if(m&&MES[m[2].toLowerCase()]!=null){ const n=NOW(), r=new Date(n.getFullYear(),MES[m[2].toLowerCase()],+m[1]); if(r-n>200*864e5) r.setFullYear(r.getFullYear()-1); if(n-r>200*864e5) r.setFullYear(r.getFullYear()+1); return r; }
  return null; }
function dayDiff(dt){ if(!dt) return null; const a=NOW(); a.setHours(0,0,0,0); const b=new Date(dt); b.setHours(0,0,0,0); return Math.round((b-a)/864e5); }
const WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function dayLabel(dt){ const n=dayDiff(dt); if(n==null) return ''; if(n===0) return 'Today'; if(n===1) return 'Tomorrow'; if(n===-1) return 'Yesterday'; return WD[dt.getDay()]+' '+MO[dt.getMonth()]+' '+dt.getDate(); }
function hash(s){ let h=2166136261; s=String(s); for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return (h>>>0).toString(36); }
const short=n=>String(n).padStart(2,'0');
const plural=(n,w,ws)=>n+' '+(n===1?w:(ws||w+'s'));

/* ───── sounds: one family (soft sine/triangle tones in C major pentatonic), synthesized, quiet ───── */
const SFX=(()=>{ let c=null, out=null, ladder=0;
  const on=()=>LAY.sound!==false && !document.hidden;
  const ctx=()=>{ if(c) return c; try{ const C=window.AudioContext||window.webkitAudioContext; c=new C(); const comp=c.createDynamicsCompressor(); out=c.createGain(); out.gain.value=.9; out.connect(comp); comp.connect(c.destination); }catch(_){ c=null; } return c; };
  const vary=f=>f*Math.pow(2,(Math.random()*30-15)/1200);
  function tone(f,{type='triangle',dur=.06,gain=.08,at=0,to=null}={}){ const a=ctx(); if(!a) return; const t=a.currentTime+at, o=a.createOscillator(), g=a.createGain(); o.type=type; o.frequency.setValueAtTime(vary(f),t); if(to) o.frequency.exponentialRampToValueAtTime(to,t+dur);
    const v=gain*(.9+Math.random()*.2); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(v,t+.002); g.gain.exponentialRampToValueAtTime(.0001,t+dur); o.connect(g); g.connect(out); o.start(t); o.stop(t+dur+.02); }
  function noise({dur=.04,gain=.06,type='lowpass',f=700,f2=null,at=0}={}){ const a=ctx(); if(!a) return; const t=a.currentTime+at, b=a.createBuffer(1,Math.ceil(a.sampleRate*dur),a.sampleRate), d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    const s=a.createBufferSource(); s.buffer=b; const fl=a.createBiquadFilter(); fl.type=type; fl.frequency.setValueAtTime(f,t); if(f2) fl.frequency.exponentialRampToValueAtTime(f2,t+dur); const g=a.createGain(); g.gain.setValueAtTime(gain,t); g.gain.exponentialRampToValueAtTime(.0001,t+dur); s.connect(fl); fl.connect(g); g.connect(out); s.start(t); s.stop(t+dur+.01); }
  const LAD=[1047,1175,1319,1568,1760,2093];
  const P={
    accept(){ tone(LAD[Math.min(ladder,LAD.length-1)],{dur:.07,gain:.08}); ladder++; },
    dismiss(){ noise({dur:.045,gain:.06,f:700}); tone(150,{type:'sine',dur:.08,gain:.07,to:90}); },
    soft(){ tone(880,{type:'sine',dur:.06,gain:.05}); },
    undo(){ tone(500,{type:'sine',dur:.09,gain:.05,to:1000}); },
    level(){ [523,659,784,1047].forEach((f,i)=>tone(f,{dur:.3,gain:.1,at:i*.05})); ladder=0; },
    day(){ [523,659,784,1047].forEach((f,i)=>tone(f,{dur:.3,gain:.1,at:i*.05})); tone(523,{dur:.9,gain:.06,at:.22}); tone(784,{dur:.9,gain:.05,at:.22}); for(let i=0;i<6;i++) noise({dur:.012,gain:.05,type:'highpass',f:3000,at:.25+Math.random()*.4}); ladder=0; },
    open(){ noise({dur:.18,gain:.03,type:'bandpass',f:400,f2:2000}); },
    flip(){ noise({dur:.02,gain:.05,type:'bandpass',f:2500}); noise({dur:.02,gain:.05,type:'bandpass',f:2500,at:.03}); },
    good(){ tone(660,{type:'sine',dur:.12,gain:.07}); }, again(){ tone(330,{type:'sine',dur:.12,gain:.07}); },
    error(){ tone(220,{type:'square',dur:.08,gain:.03}); tone(185,{type:'square',dur:.08,gain:.03,at:.09}); },
    toggle(){ tone(1319,{type:'sine',dur:.05,gain:.05}); },
    land(){ noise({dur:.025,gain:.025,f:900+Math.random()*700}); }
  };
  addEventListener('pointerdown',ctx,{once:true}); addEventListener('keydown',ctx,{once:true});
  return { play(n,force){ if(!on()) return; if(EMB&&!force) return;   /* in the app: one tone only, when level 01 clears (2026-11-01) */ try{ ctx(); if(c&&c.state==='suspended') c.resume(); P[n]&&P[n](); }catch(_){} }, reset(){ ladder=0; } };
})();

/* ───── layout he customizes, kept on this computer ───── */
const LK='jarvis-layout';
let LAY={w:{},order:{},zoom:1,dense:false,sheet:'wide'};
try{ const sv=JSON.parse(localStorage.getItem(LK)||'null'); if(sv) LAY=Object.assign(LAY,sv); }catch(_){}
function saveLay(){ try{ localStorage.setItem(LK,JSON.stringify(LAY)); }catch(_){} applyLay(); }
function applyLay(){ document.body.style.zoom=LAY.zoom; document.body.classList.toggle('dense',!!LAY.dense); $('#sheet').style.width=LAY.sheet==='narrow'?'min(760px,calc(100vw - 20px))':''; }

/* ───── the morning's state: what he decided, typed and opened today, kept on this computer ───── */
let D=null;            /* the latest /api/datos */
let R={}, T={}, X={};  /* rows by key, tiles, and the pieces that aren't rows (day, mail, cards, upcoming…) */
const STORE='jarvis-run-'+DAY;
const S={started:false, objective:null, closed:{}, view:null, skip0:false, manual:{}, tab:'drafts', pastOpen:false, f:null, sf:null, retF:null,
  editing:null, why:null, note:null, handled:{}, drafts:{}, cards:{}, exp:{}, folds:{}, confetti:false, dayPlayed:false, open:null,
  undo:[], g:false, focusMtg:null, shownAt:{}};
const KEEP=['started','objective','closed','view','skip0','manual','tab','pastOpen','f','sf','editing','why','whyKind','note','handled','drafts','cards','exp','folds','confetti','dayPlayed','open','added','wz'];
let canStore=true; try{ localStorage.setItem('jarvis-probe','1'); localStorage.removeItem('jarvis-probe'); }catch(_){ canStore=false; }
let applying=false, saveT=null, lastSaveOk=true, wiping=false;   /* wiping: a test wipes this computer's copy and reloads; nothing writes it back on the way out */
function snapshot(){ return {v:2, at:Date.now(), S:Object.fromEntries(KEEP.map(k=>[k,S[k]]))}; }
function persist(now){ if(applying||wiping) return; clearTimeout(saveT); const go=()=>{ if(canStore){ try{ localStorage.setItem(STORE,JSON.stringify(snapshot())); lastSaveOk=true; }catch(_){ lastSaveOk=false; } } savedLabel(); }; now?go():saveT=setTimeout(go,120); }
function restore(raw){ let d; try{ d=JSON.parse(raw); }catch(_){ return null; } if(!d||d.v!==2||!d.S) return null;
  applying=true; for(const k of KEEP) if(d.S[k]!==undefined) S[k]=d.S[k]; applying=false; return d; }
let resumed=null;
if(canStore){ try{ const raw=localStorage.getItem(STORE); if(raw) resumed=restore(raw); }catch(_){} }
/* yesterday's morning is not today's: old run states go */
try{ for(let i=localStorage.length-1;i>=0;i--){ const k=localStorage.key(i); if(k&&k.startsWith('jarvis-run-')&&k!==STORE) localStorage.removeItem(k); } }catch(_){}

/* ───── the data: one /api/datos read, turned into tiles and rows ───── */
const job=s=>((D&&D.trabajos)||[]).find(t=>t.slug===s)||{pendientes:[],hechos:[],despues:[]};
/* 2026-10-16 — an `esperando` row the job itself found settled (`· resuelto` / `· entregado` / `· capturado` in its id
   comment, SKILL.md § 11) no longer waits for his tick: Massiel's stayed on the board a morning after the job knew. */
const SETTLED=/<!--[^>]*·\s*(?:resuelto|entregado|capturado)\b[^>]*-->/;
const GRADE=/^pen-bentley-grade-/;
const pend=(s,re)=>(job(s).pendientes||[]).filter(it=>(!re||re.test(it.id||''))&&!it.en_crm&&!(s==='esperando'&&SETTLED.test(it.crudo||'')));   /* en_crm: registro Step 1e, 2026-10-17 */
/* an id can repeat across days (prep-venture-cafe on Oct 8 and Oct 15), so the key carries the row's date too */
const rowKey=(trabajo,it)=>trabajo+':'+(it.id?it.id+'~'+String(it.cuando||'').replace(/\s*·\s*hoy$/,''):'h'+hash(it.crudo));

/* The labels Pablo chose for each kind of row. ok = ✓ [x] · keep = ★ [*] · no = ✕ [-] · unsure = [r] ·
   rev = a draft he reviews (Edit + "No, this is why") · note = his line under the row. Every row also gets
   *Later* when its job says it's a to-do (`salida: later`, servidor.py `salida_de_renglon`). */
const LB={
  prep:{ok:'Useful',keep:'Keep',no:'Not useful',skip:"I won't go",nolater:1},   /* 2026-10-20 Pablo: no Later, and "I won't go anymore" → [n] */
  tuyo:{ok:'Useful · I already did it',no:'Not useful',nolater:1}, mio:{ok:'Useful · did it or in To-do',no:'Not useful',nolater:1}, inperson:{ok:'Nothing was promised',no:'Not useful',note:1,nolater:1}, owed:{ok:'Useful · I already did it',no:'Not useful',nolater:1},
  cold:{ok:'I wrote to them',rev:1,laterNote:1},   /* 2026-10-25 Pablo: No, this is why = drop them ([-]); Later opens a note = rewrite from it ([r]) */ reply:{ok:'I answered them'}, fup:{ok:'I sent the follow-up',rev:1,no:'Stop following up'},
  warm:{ok:'I sent it',rev:1}, map:{ok:'Accept · move them on the map',no:'Not now'},
  person:{ok:'Add to CRM',no:'Not worth it',unsure:"Not sure who they are",note:1}, group:{ok:'Add them to those groups',no:'Not those groups',unsure:'Not sure',note:1},
  event:{ok:"I'm going",no:'Not interested'}, call:{ok:"I'll apply",no:'Not for me',rev:1},
  lesson:{ok:'Useful today',no:'Not useful today'}, coach:{ok:'Useful',keep:'Keep',no:'Not useful'}, council:{ok:'It helped',no:"It didn't help"},
  book:{ok:'Useful',no:'Not useful'}, study:{ok:'Learned',no:'Not useful'}, cls:{ok:'Already did it',no:'Not going to do it'},
  ask:{ok:'Done',no:'Not useful',note:1}, grade:{ok:'Seen · hide it',note:1,nolater:1},   /* 2026-10-28 Pablo: a grade he already acted on is clicked away and never comes back */ tool:{ok:'Do it',no:'Not useful'}, conn:{ok:'Done',note:1},
  files:{ok:'Done',note:1}, week:{ok:'Done',note:1}, digest:{ok:'I listened',no:'Not useful'}, mail:{ok:'Done',no:'Not relevant'},
  lidraft:{ok:'I scheduled it',rev:1,li:1}, licomment:{ok:'I posted it',no:'Skip',note:1,lic:1},
  who:{}
};

function addRow(key,o){ const r=Object.assign({key,state:'open'},o); const h=S.handled[key]; if(h) r.state=h.state; R[key]=r; return key; }
/* LinkedIn by hand (2026-10-17). Pablo: "for the comment it should be a link to the exact post and a sugestion of what to
   write. For schedualing it should give me the draft so taht I perfect it … a link to post it to linkedin and the recomended time". */
function liWhen(s){ const d=new Date(s); return isNaN(d)?String(s).replace('T',' '):d.toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}); }
function liComment(it){ const own=(it.comentarios||[]).map(c=>typeof c==='string'?c:(c&&c.texto)||'').filter(Boolean).pop(); if(own) return own;
  const m=String(it.texto||it.crudo||'').match(/\*\*Your comment:\*\*\s*(.+?)\s*(?:<!--|$)/); return m?m[1].trim():''; }
function mk(trabajo,it,lb,tile,extra){
  const key=rowKey(trabajo,it), p=parseRow(it.texto), mc=it.mensaje_crack||null;
  addRow(key,Object.assign({src:{t:'m',trabajo,id:it.id||'',crudo:it.crudo,cuando:it.cuando||''}, lb, tile, salida:it.salida||'no-sirve',
    ti:p.ti, ctx:p.ctx, links:p.links, notes:p.notes, tag:'', msg:(mc&&mc.cuerpo)||'', su:(mc&&mc.asunto)||'', ficha:(mc&&mc.ficha)||[],
    comentarios:it.comentarios||[], correlo:it.correlo||[], hoy:!!it.hoy, cuando:it.cuando||''}, extra||{}));
  return autoSrc(R[key],it.texto||it.crudo||''), key; }
/* 2026-10-19 — every row that comes from a conversation opens it (Pablo: "every message that needs a source has one").
   Runs on every row built by mk(); a row that already has a link, a note or a prep keeps them. Key S. */
function autoSrc(r,raw){
  if(!r||(r.links||[]).length||(r.notes||[]).length||r.prepNote||['lidraft','licomment','who','cls','week','files','lesson','study','event'].includes(r.lb)) return;
  if(r.src&&r.src.trabajo==='esperando') return;   /* srcLink() does those */
  const t=String(raw), L=(lab,u)=>r.links.push(['Source · '+lab,u,'S']), N=(lab,n)=>{ const x=['Source · '+lab,n,'S']; r.notes.push(x);
    /* a meeting the brain never copied (Granola notes before Oct 9 that no note kept): drop the button instead of a dead one */
    getNote(n).catch(()=>{ r.notes=r.notes.filter(y=>y!==x); sheetOpen?renderSheet():render(); }); };
  const phone=(t.match(/\+\d[\d\s().-]{8,}\d/)||[])[0], wa=()=>L('WhatsApp',phone?'whatsapp://send?phone='+phone.replace(/\D/g,''):'whatsapp://');
  const day=(t.match(/\d{4}-\d{2}-\d{2}/)||[])[0];
  if(r.lb==='tool'){ const j=(t.match(/`([a-z][a-z-]+)`/)||[])[1]; if(j) N(j+"'s last runs",'5 Sistema/trabajos/'+j+'/estado'); return; }
  if(r.lb==='book'){ const m=String(r.ti).match(/^(.+?),\s*by\s+(.+?)(?:\s+—|$)/); if(m) N('the book',m[2].trim().split(/\s+/).pop()+'-'+m[1].trim()); return; }
  if(r.lb==='conn'){ const who=(t.match(/^[\s\S]{0,4}?([A-ZÁÉÍÓÚ][\wáéíóúñ'-]+(?:\s[A-ZÁÉÍÓÚ][\wáéíóúñ'-]+)+)(?:'s\b|\s\(|\shas\b|\scannot\b)/)||[])[1];
    if(/premium/i.test(t)) return L('LinkedIn Premium','https://www.linkedin.com/premium/products/');
    if(who) return L('their LinkedIn','https://www.linkedin.com/search/results/people/?keywords='+encodeURIComponent(who));
    /invit/i.test(t)?L('your sent invites','https://www.linkedin.com/mynetwork/invitation-manager/sent/'):/premium/i.test(t)?L('LinkedIn Premium','https://www.linkedin.com/premium/products/'):L('your LinkedIn network','https://www.linkedin.com/mynetwork/'); return; }
  if(r.lb==='coach'){ if(/💬|coach-wa-/.test(t)) return wa(); if(/✉️/.test(t)) L('Gmail','https://mail.google.com/mail/u/0/#search/'+encodeURIComponent('"'+String(r.ti).split(/\s*→/)[0].trim()+'"'));
    else { const dm=String(r.ti).match(/\((\d{1,2}\s+\w{3})\)\s*$/), d=dm&&whenOf(dm[1]);
      N('the meeting','granola:'+String(r.ti).replace(/\s*\((\d{1,2}\s+\w{3})\)\s*$/,'').trim()+(d?'@'+d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'):'')); } return; }
  if(r.lb==='person'||r.lb==='group'){ const from=(t.match(/\*\*from\*\*([^·<]*)/)||['',''])[1], name=String(r.ti).replace(/\s*\(.*$/,'').trim();
    if(/linkedin/i.test(from)) return;   /* liPerson() gives "Open their LinkedIn" */
    if(/whatsapp/i.test(from)) return wa();
    if(/granola/i.test(from)) return N('the meeting','granola:'+name+(day?'@'+day:''));
    if(/phone contacts/i.test(from)) return L('your Contacts','addressbook://');
    if(/gmail|e-?mail/i.test(from)) return L('Gmail','https://mail.google.com/mail/u/0/#search/'+encodeURIComponent('"'+name+'"'));
    if(r.lb==='group') N('their CRM profile',name);
    if(/linkedin/i.test(t)) return L('their LinkedIn','https://www.linkedin.com/search/results/people/?keywords='+encodeURIComponent(name));
    return; }
  if(/voice note|WhatsApp/i.test(t)) return wa();
  if(/lo anotó Granola|lo anotó la grabación|Granola/.test(t)){ const m=(t.match(/\*([^*"]{4,90})\*/)||[])[1]; if(m) return N('the meeting','granola:'+m.trim()); } }
/* New-person cards (2026-10-16). Pablo: "add a command on adding new people on my crm for the button of opening
   their linkedin" · "don't show the open linkedin button if the contact did not come from linkedin" · "only show what
   you know, there is no need to put 'talks unknown' and start with 'from'". So the line under the name drops every
   unknown/none field and opens with **from**; and only someone who came from LinkedIn gets "Open their LinkedIn" — their
   saved profile when the row has one, else LinkedIn's people search for the name and place. ↵ opens it. */
const NOPE=/^(unknown|none|n\/a|-|where unknown\b.*)$/i;
function liPerson(key){ const r=R[key]; if(!r) return key;
  const seg=String(r.ctx||'').split(' · ').map(x=>x.trim()).filter(Boolean), lab=x=>(x.match(/^\*\*([a-z]+)\*\*\s*(.*)$/)||[]), isDate=x=>/^\d{4}-\d{2}-\d{2}$/.test(x);
  const from=seg.find(x=>lab(x)[1]==='from')||'', met=seg.find(x=>lab(x)[1]==='met'), fv=(lab(from)[2]||'').toLowerCase(), mv=met?(lab(met)[2]||'').toLowerCase():'', metOk=met&&!NOPE.test(mv)&&!(fv&&(fv.includes(mv)||mv.includes(fv)||/saved to your phone/.test(mv)&&/phone/.test(fv)));
  const date=seg.find(isDate), org=seg[0]&&!lab(seg[0])[1]?seg[0]:'';
  const keep=seg.filter(x=>x!==from&&!isDate(x)&&!(x===met&&!metOk)&&!NOPE.test(lab(x)[1]?lab(x)[2]:x)).map(x=>x===met&&date?x+' · '+date:x);
  r.ctx=[from+(date&&!metOk&&from?' · '+date:''),...keep].filter(Boolean).join(' · ');
  const li=(r.links||[]).find(l=>/linkedin\.com/i.test(l[1])); r.links=(r.links||[]).filter(l=>l!==li);
  if(!/linkedin/i.test(from)) return key;
  const place=NOPE.test(org)?'':org.replace(/\s*\(.*?\)\s*/g,' ').split(/[;,]/)[0].trim();
  r.links.unshift(['Open their LinkedIn',li?li[1]:'https://www.linkedin.com/search/results/people/?keywords='+encodeURIComponent([r.ti,place].filter(Boolean).join(' '))]); return key; }
function openFocusedLinkedIn(){ const k=S[FK()], r=k&&R[k], l=r&&(r.links||[]).find(x=>/linkedin\.com/i.test(x[1]));
  if(!l) return toast('Move to a new person first · G N'); window.open(l[1],'_blank','noopener'); }
/* rows he handled this morning that the files no longer list (already saved): they stay, handled, for the
   level bar, the pile and "What you approved" */
function ghosts(tile,col){ return Object.entries(S.handled).filter(([k,h])=>h.tile===tile&&(col==null||h.col===col)&&!R[k]).map(([k,h])=>{ R[k]={key:k,state:h.state,ti:h.ti,tile,col,ghost:true}; return k; }); }
const fromCuando=c=>{ const dt=whenOf(c); return dt?dayLabel(dt):String(c||'').replace(/\s*·\s*hoy$/,''); };
function emailIn(t){ const m=String(t||'').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i); return m?m[0]:''; }

function build(){
  R={}; T={}; X={};
  const tile=(k,o)=>(T[k]=Object.assign({k,rows:[],more:[]},o));
  const J=D;

  /* 00 — Sunday's week close: the questions only he can answer, and his files */
  /* off Sunday only the latest close's rows, if it is at most 6 days old; older leftovers stay hidden, and
     the files tile stays a Sunday thing */
  /* 2026-10-31: once a close's filing row is [x] it is done — a question he left blank no longer holds 00
     open (next Sunday's close re-asks leftovers, en-jarvis.md §1) */
  const cps0=pend('cierre'), openIds=new Set(cps0.map(it=>it.id||'')),
        cps=cps0.filter(it=>{ const m=/^cierre-q-(\d{6})-\d+$/.exec(it.id||''); return !m||openIds.has('cierre-q-'+m[1]+'-file'); }), last=SUN?'':cps.map(it=>it.cuando||'').filter(c=>/^\d{4}-\d{2}-\d{2}$/.test(c)).sort().pop(),
        wkRows=SUN?cps:(last&&dayDiff(whenOf(last))>=-6?cps.filter(it=>it.cuando===last):[]), wkG=ghosts('week');
  WK=SUN||wkRows.length>0||wkG.length>0;
  if(WK){
    tile('week',{tier:0,o:'Upkeep',title:'Questions only you can answer',wide:true,kind:'panel',panel:'close'});   /* 2026-10-26: opens the step-by-step close */
    T.week.rows=[...wkRows.map(it=>mk('cierre',it,'week','week',{tag:'Week close'})),...wkG];
  }
  /* 'Your files' (aduana's questions) retired 2026-10-20: aduana decides every file alone */

  /* 2026-11-03 — Pablo: "for people that I'm going to meet for the first time or that I don't really know very
   well add a botton for checking out his LinkedIn or, if it's a company, the website". The prep agent says
   "first meeting / first coffee chat…" in the row; the title ends "· Name (Company)". A person → their
   LinkedIn (search by name + company); only a company → its website (DuckDuckGo's first result). */
function meetLinks(ti,ctx,have){
  if(!/\bfirst\b|never met|haven't met|barely know|don't know (her|him|them)|new (contact|person)/i.test(ti+' '+(ctx||''))) return [];
  if(have.some(l=>/linkedin\.com/i.test(l[1]))) return [];
  const m=String(ti).replace(/\*/g,'').match(/·\s*([^·]+?)\s*(?:\(([^)]*)\))?\s*$/); if(!m) return [];
  const who=m[1].trim(), co=(m[2]||'').split(/,|\bex-/)[0].trim();
  const person=/^[A-ZÁÉÍÓÚÑ][\w'’.-]+(\s+[A-ZÁÉÍÓÚÑ][\w'’.-]+)+$/.test(who)
    && !/\b(Inc|LLC|Ltd|Corp|Co|Company|Labs?|Studios?|Group|Capital|Partners|Ventures|Robotics|AI|Tech|Club|Fund|Bank|University|College|School|Institute|Foundation|Center)\b/.test(who);
  if(person) return [['Their LinkedIn','https://www.linkedin.com/search/results/people/?keywords='+encodeURIComponent(who+(co?' '+co:'')),'P']];
  const firm=co||who; return firm?[['Their website','https://duckduckgo.com/?q=!ducky+'+encodeURIComponent(firm+' official site'),'W']]:[]; }

/* 01 — meeting prep: today, tomorrow and the day after, in time order (the server sorts them) */
  tile('prep',{tier:1,o:'Commitments',title:'Meeting prep',wide:true,kind:'panel',panel:'prep'});
  T.prep.rows=[...pend('prep').map(it=>({it,dt:whenOf(it.cuando)})).filter(x=>x.dt&&dayDiff(x.dt)>=0&&dayDiff(x.dt)<=2).map(({it,dt})=>{
      const p=parseRow(it.texto), b=p.ti.match(/^(Must read|Good to know)\s*·\s*(.+?)\s+—\s+([\s\S]+)$/);
      let kind='', time='', ti=p.ti; if(b){ kind=b[1]; time=b[2].replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w*\s+\d{1,2}\s+[A-Za-z]{3}\s+/,''); ti=b[3]; }
      const key=mk('prep',it,'prep','prep',{ti, tag:[dayLabel(dt),time,kind].filter(Boolean).join(' · '), prepNote:(p.notes[0]||[])[1]||'', dt}), r=R[key];
      if(r) r.links=[...(r.links||[]),...meetLinks(ti,p.ctx,r.links||[])]; return key; }), ...ghosts('prep')];

  /* 01 — promises and replies: the three columns of `esperando` */
  tile('commit',{tier:1,o:'Commitments',title:'Promises and replies',wide:true,kind:'panel',panel:'commit'});
  const espTag=it=>{ const today=/^TODAY\b/i.test(parseRow(it.texto).ti); return (today?'Due today · ':'')+fromCuando(it.cuando); };
  const espTi=t=>t.replace(/^TODAY\s*[—–-]\s*/i,'').replace(/^Your turn to reply:\s*/i,'');
  const esp=pend('esperando'), C3={'Your turn to reply':[/^esp-tuyo-/,'tuyo'],'My promises':[/^esp-mio-/,'mio'],'Waiting for':[/^(?!esp-tuyo-|esp-mio-)/,'owed']};
  T.commit.cols={}; for(const [name,[re,lb]] of Object.entries(C3)) T.commit.cols[name]=[...esp.filter(it=>re.test(it.id||'')).map(it=>{ const k=mk('esperando',it,/^esp-mio-persona-[^-]+(-[^-]+)*-\d{8}$/.test(it.id||'')?'inperson':lb,'commit',{col:name,tag:espTag(it)}); /* 2026-10-26: the ❓ in-person question takes his answer as a note */ R[k].ti=espTi(R[k].ti); srcLink(R[k],it); return k; }),...ghosts('commit',name)];

  /* 02 — who was who: the meeting recordings' open questions (Granola), asked the morning after. In 02 first since 2026-10-15
     (Pablo: "people who was who should be level 02"). */
  tile('who',{tier:2,o:'People',title:'Who was who',kind:'panel',panel:'who'});
  T.who.rows=[...(J.quien||[]).map(q=>{
      const key='quien:'+q.id; let opts=[], letters=[];
      const m=String(q.etiqueta||'').match(/^([A-Z])-([A-Z])$/);
      if(m) for(let c=m[1].charCodeAt(0);c<=m[2].charCodeAt(0);c++) letters.push(String.fromCharCode(c)); else if(q.etiqueta) letters=[q.etiqueta];
      /* `says:` (2026-10-16): one quote per speaker, shown on its button so he recognizes his own words. */
      const says={}, sm=String(q.texto||'').match(/ · says: (.*?)(?: <!--.*)?$/);
      if(sm) sm[1].split(' | ').forEach(p=>{ const v=p.match(/^([A-Z])\s+(.+)$/); if(v) says[v[1]]=v[2].trim(); });
      /* `muestras` (2026-10-16, Pablo: "give me more context to tell you which I was"): each speaker's share of the
         talk and three lines from the transcript copy, shown above the buttons; the buttons then just name the letter. */
      const mu=q.muestras||{}, hasMu=Object.keys(mu).length>0;
      if(hasMu) letters=[...new Set([...letters,...Object.keys(mu)])].sort();
      if(q.es_pablo) opts=hasMu ? letters.map(l=>['Speaker '+l+(mu[l]?' · '+mu[l].parte+'%':''),l]).concat([["I didn't speak","didn't speak"],['Not my recording','not mine']])
        : Object.keys(says).map(l=>['Speaker '+l+' — '+says[l],l]).concat(letters.filter(l=>!says[l]).map(l=>['Speaker '+l,l]),[["I didn't speak","didn't speak"],['Not my recording','not mine']]);
      else opts=(q.probables||[]).map(n=>[n,n]);
      const desc=q.es_pablo?String(q.texto||'').replace(/ · says: .*$/,'').split(' · ').slice(3).join(' · '):'';
      return addRow(key,{src:{t:'q',archivo:q.archivo,id:q.id,crudo:q.crudo}, lb:'who', tile:'who', salida:'no-sirve',
        tag:['Granola',fromCuando(q.cuando)+(String(q.cuando).length>10?' '+String(q.cuando).slice(11):''),q.junta].filter(Boolean).join(' · '),
        ti:q.es_pablo?'Which speaker was you?':`Who is Speaker ${q.etiqueta}?`, junta:q.junta||'', ctx:desc, quote:q.cita||'', opts, other:!q.es_pablo, voices:q.es_pablo&&hasMu?letters.filter(l=>mu[l]).map(l=>({l,says:says[l]||'',...mu[l]})):null, links:[], notes:[]}); }),...ghosts('who')];

  /* 02 — outreach is a Sunday batch (2026-10-24, Pablo: "do it on sunday for both"). `cracks` appends an `out-semana-`
     row each Sunday; while it is open both tiles show the whole batch and stay until his "Done with outreach this week"
     ticks it. The rest of the week warm shows only new people. Cold is a daily batch since 2026-11-02 (`cracks` keeps up to 5
     new people waiting, every morning), so its new people and follow-ups show every day. */
  const OSEM=pend('cracks',/^out-semana-/).sort((a,b)=>a.id<b.id?-1:1).pop()||null, OWK=!!OSEM||!!S.manual.cold||!!S.manual.warm;
  tile('cold',{tier:2,o:'People',title:'Cold outreach',kind:'panel',panel:'cold',db:'cold',manualDone:OWK,sem:OSEM});
  const tasa=String(job('cracks').tasa_de_respuesta||''), pm=tasa.match(/(\d+)%/), tm=tasa.match(/(\d+)\s*\/\s*(\d+).*?(\d+)\s*d[ií]as/i); T.cold.rate=pm?pm[1]+'% replied':''; T.cold.rateFull=tm?`${tm[1]} of ${tm[2]} replied · ${pm?pm[1]+'% · ':''}last ${tm[3]} days`:tasa;
  const coldRow=(it,lb,col)=>{ const p=parseRow(it.texto), nm=p.ti.split(/\s+—\s+/); const mail=p.links.find(l=>/^mailto:/i.test(l[1]));
    return mk('cracks',it,lb,'cold',{col, ti:nm[0], ctx:(nm.length>1?nm.slice(1).join(' — ')+(p.ctx?' · '+p.ctx:''):p.ctx), tag:(lb==='fup'?'Follow-up · ':lb==='reply'?'Replied · ':'Cold · ')+fromCuando(it.cuando),
      to:mail?'':emailIn(it.texto)}); };
  const cr=pend('cracks').filter(it=>!/^out-semana-/.test(it.id||'')), rp=cr.filter(it=>/-reply$/.test(it.id||'')), fu=cr.filter(it=>/-f\d+$/.test(it.id||'')), nw=cr.filter(it=>!/-f\d+$|-reply$/.test(it.id||''));
  T.cold.replies=[...rp.map(it=>coldRow(it,'reply','reply')),...ghosts('cold','reply')];
  T.cold.rows=[...nw.reverse().map(it=>coldRow(it,'cold','new')),...ghosts('cold','new')]; T.cold.more=[];
  T.cold.fups=[...fu.map(it=>coldRow(it,'fup','fup')),...ghosts('cold','fup')];

  /* 02 — warm outreach: the CRM follow-ups (cabina's md-rel- rows and seguimiento's pick) and the map proposals, Sunday batch only */
  tile('warm',{tier:2,o:'People',title:'Warm outreach',kind:'panel',panel:'warm',db:'warm',people:true,manualDone:OWK,sem:OSEM});
  const seven=NOW(); seven.setDate(seven.getDate()-7); const cut=iso(seven);
  T.warm.rows=OWK?[...pend('cabina',/^md-rel-/).map(it=>mk('cabina',it,'warm','warm',{col:'write',tag:'From your CRM · '+fromCuando(it.cuando)})),
    ...pend('seguimiento').filter(it=>!/^seg-map-/.test(it.id||'')).map(it=>mk('seguimiento',it,'warm','warm',{col:'write',tag:'Warm follow-up · '+fromCuando(it.cuando)})),...ghosts('warm','write')]:[];
  T.warm.mapRows=!OWK?[]:[...pend('seguimiento',/^seg-map-/).filter(it=>{ const m=/(\d{4}-\d{2}-\d{2})$/.exec(it.id||''); return !m||m[1]>cut; }).map(it=>mk('seguimiento',it,'map','warm',{col:'map',tag:'Map proposal'})),...ghosts('warm','map')];
  X.newp=[...pend('registro',/^reg-(?!grp-)/).reverse().map(it=>liPerson(mk('registro',it,'person','people',{col:'p',tag:'New person · '+fromCuando(it.cuando)}))),...ghosts('people','p')];
  X.newg=[...pend('registro',/^reg-grp-/).map(it=>mk('registro',it,'group','people',{col:'g',tag:'Group suggestion · '+fromCuando(it.cuando)})),...ghosts('people','g')];

  /* 02 — LinkedIn: from Friday until he says he's done for the week */
  const L=J.linkedin||{};
  if(L.semana||S.manual.linkedin){
    tile('linkedin',{tier:2,o:'People',title:'LinkedIn',kind:'panel',panel:'linkedin',manualDone:true,sem:L.semana||null});
    const firstLine=t=>{ const l=String(t||'').split('\n').find(x=>x.trim())||''; return l.length>96?l.slice(0,93)+'…':l; };
    T.linkedin.drafts=[...(L.borradores||[]).filter(b=>b.estado==='borrador').map(b=>addRow('li:'+b.id,{src:{t:'li',id:b.id}, lb:'lidraft', tile:'linkedin', col:'d', salida:'no-sirve',
        ti:firstLine(b.post), msg:b.post||'', sug:b.sugerida||'', ctx:b.sugerida?'**Best time** '+liWhen(b.sugerida):'', links:b.boceto?[['Open the sketch to attach','/api/linkedin/boceto?id='+b.id]]:[], tag:[b.origen==='pablo'?'Yours':'',b.pilar,b.apertura].filter(Boolean).join(' · ')||'Draft', huella:b.huella||'', notes:[]})),...ghosts('linkedin','d')];
    T.linkedin.comments=[...pend('linkedin-mac').map(it=>mk('linkedin-mac',it,'licomment','linkedin',{col:'c',tag:'Comment · '+fromCuando(it.cuando),msg:liComment(it)})),...ghosts('linkedin','c')];
    T.linkedin.asks=[...pend('linkedin',/^(?!li-semana-)/).map(it=>mk('linkedin',it,'ask','linkedin',{col:'a',tag:'The LinkedIn agent asks · '+fromCuando(it.cuando)})),...ghosts('linkedin','a')];
    T.linkedin.scheduled=(L.borradores||[]).filter(b=>b.estado==='aprobado'||b.estado==='programado').map(b=>({d:b.hora||b.programado||'',t:firstLine(b.post),booked:b.estado==='programado'}));
  }

  /* 03 — events: what to decide, where he could speak, and what he's registered for */
  tile('events',{tier:3,o:'People',title:'Events',kind:'panel',panel:'events'});
  const evRow=(it,lb,col)=>{ const p=parseRow(it.texto), dm=String(it.texto).match(/\*\*date\*\*\s+(\d{4}-\d{2}-\d{2})(?:\s+(\d{1,2}:\d{2}))?/), pl=String(it.texto).match(/\*\*place\*\*\s+([^·]+)/);
    const dt=dm?whenOf(dm[1]):null, ctx=p.ctx.replace(/\*\*date\*\*\s+[^·]+·?\s*/,'').replace(/\*\*place\*\*\s+[^·]+·?\s*/,'').replace(/\*\*why\*\*\s*/,'');
    return mk('platicas',it,lb,'events',{col, dt, ctx, tag:[dt?dayLabel(dt):'',dm&&dm[2]||'',pl?pl[1].trim():''].filter(Boolean).join(' · ')||fromCuando(it.cuando)}); };
  const pl=pend('platicas'), hab=pl.filter(it=>/^pla-hablar-/.test(it.id||'')), asi=pl.filter(it=>!/^pla-hablar-/.test(it.id||''));
  const evs=asi.map(it=>evRow(it,'event','e')).sort((a,b)=>((R[a].dt||Infinity)-(R[b].dt||Infinity)));
  T.events.cols={'Events to decide':[...evs.filter(k=>!R[k].dt||dayDiff(R[k].dt)>=0),...ghosts('events','e')], 'Apply to speak':[...hab.map(it=>evRow(it,'call','s')),...ghosts('events','s')]};
  T.events.more=evs.filter(k=>R[k].dt&&dayDiff(R[k].dt)<0);
  X.going=(job('platicas').hechos||[]).filter(it=>it.estado==='hecho'&&/^pla-asistir-/.test(it.id||'')).map(it=>{ const p=parseRow(it.texto), dm=String(it.texto).match(/\*\*date\*\*\s+(\d{4}-\d{2}-\d{2})(?:\s+(\d{1,2}:\d{2}))?/), dt=dm?whenOf(dm[1]):null; return {dt,d:dt?dayLabel(dt)+(dm[2]?' · '+dm[2]:''):'',t:p.ti,w:'you said you are going',url:(p.links[0]||[])[1]||''}; }).filter(e=>!e.dt||dayDiff(e.dt)>=0);

  /* 03 — Thinking, all of it in one panel */
  tile('thinking',{tier:3,o:'Thinking',title:'Everything to learn today',wide:true,kind:'panel',panel:'thinking',manualDone:true});
  const todayFirst=(list,cap)=>{ let h=list.filter(i=>i.hoy), a=list.filter(i=>!i.hoy); if(!h.length&&a.length) h=a.splice(Math.max(0,a.length-cap)); if(h.length>cap) a=a.concat(h.splice(cap)); return [h,a.reverse()]; };
  { const [v,m]=todayFirst(pend('leccion'),1); X.lesson=[...v.map(it=>mk('leccion',it,'lesson','thinking',{col:'lesson',tag:'Lesson of the day'})),...ghosts('thinking','lesson')]; X.lessonMore=m.map(it=>mk('leccion',it,'lesson','thinking',{col:'lesson',tag:'Lesson · '+fromCuando(it.cuando)})); }
  /* 2026-11-02 — the tag already says "Today 17:00"; the row's own date in words ("— lun 2 nov, 5:00 p.m.") is cut from the title
     (Pablo: "why does it say Monday, 2nd of nov, and not today?"). Only a last "— <weekday> …<digit>…" part; a note after it stays. */
  const DATEW=/\s+—\s+(?:lun|mar|mié|mie|jue|vie|sáb|sab|dom|mon|tue|wed|thu|fri|sat|sun)\w*\.?\s(?=[^—*]*\d)[^—*]*?(\s*\*\([^)]*\)\*)?\s*$/i;
  const ent=(J.entregas||[]).filter(e=>e.estado==='pendiente'), entRow=e=>{ const m=String(e.texto).match(/^\*\*([^*]+)\*\*\s*·\s*([\s\S]*)$/), dt=whenOf(e.cuando), raw=dt?String(m?m[2]:e.texto).replace(DATEW,'$1'):(m?m[2]:e.texto),
      p=parseRow(String(raw).replace(/\[([^\]]+)\]\(([^\s)]+)\)/g,(x,l,u,at)=>at===0?'**'+l+'**':l)), links=bsLinks(m?m[1]:'',parseRow(raw).links);
    return mk('bentley-entregas',e,'cls','thinking',{col:'cls',ti:p.ti,ctx:p.ctx,links,tag:[m?m[1]:'Bentley',dt?dayLabel(dt)+(/T\d/.test(e.cuando)?' '+String(e.cuando).slice(11,16):''):'no date'].join(' · '),dt}); };
  /* 2026-10-15 — homework due today or tomorrow climbs to 01 as its own tile (Pablo: "the bentley thing should be in level 01
     if there is an assignment due today or tomorrow"); 01 can't close until it's handled. Later ones stay here in 03; none
     due soon → no tile in 01. The day is his Mac's (Boston). */
  const soon=e=>{ const n=dayDiff(whenOf(e.cuando)); return n===0||n===1; };
  tile('due',{tier:1,o:'Thinking',title:'Due soon · Bentley',kind:'panel',panel:'due'});
  T.due.rows=[...ent.filter(soon).sort((a,b)=>whenOf(a.cuando)-whenOf(b.cuando)).map(e=>{ const k=entRow(e); const rr=R[k]; if(rr){ rr.tile='due'; rr.col=null; } return k; }),...ghosts('due')];
  X.classes=[...ent.filter(e=>!soon(e)).filter(e=>{ const n=dayDiff(whenOf(e.cuando)); return n!=null&&n>=-2&&n<=7; }).sort((a,b)=>whenOf(a.cuando)-whenOf(b.cuando)).map(entRow),
    ...pend('bentley').filter(it=>!GRADE.test(it.id||'')).map(it=>mk('bentley',it,'ask','thinking',{col:'cls',tag:'Bentley asks · '+fromCuando(it.cuando)})),...ghosts('thinking','cls')];
  /* 2026-10-28 — the Monday grades check: every grade that is not an A is a row first in Your classes, until he hides it */
  X.grades=pend('bentley',GRADE).map(it=>mk('bentley',it,'grade','thinking',{col:'cls',tag:'Grade not an A · '+fromCuando(it.cuando)}));
  X.classesMore=ent.filter(e=>dayDiff(whenOf(e.cuando))==null).map(entRow);
  X.council=[...pend('consejo').map(it=>mk('consejo',it,'council','thinking',{col:'council',tag:'Your council · '+fromCuando(it.cuando)})),...ghosts('thinking','council')];
  { const coachBody=Object.fromEntries((J.coach||[]).map(c=>[c.id,c.cuerpo])); const [v,m]=todayFirst(pend('coach'),2);
    const cr2=it=>mk('coach',it,'coach','thinking',{col:'coach',tag:'Coach · '+fromCuando(it.cuando),body:coachBody[it.id]||''});
    X.coach=[...v.map(cr2),...ghosts('thinking','coach')]; X.coachMore=m.map(cr2);
    /* 2026-10-21 — Pablo: "the communication feedback always have it open" */
    [...X.coach,...X.coachMore].forEach(k=>{ if(R[k]&&R[k].body&&S.exp[k]==null) S.exp[k]=true; }); if(S.folds['How you communicated']==null) S.folds['How you communicated']=true; }
  X.books=[...((J.aprendizaje||{}).subrayados||[]).filter(s=>/^\s*- \[ \]/.test(s.crudo||'')).map(s=>{ const p=parseRow(s.texto); const k=addRow('mesa:'+(s.id||hash(s.crudo)),{src:{t:'g',id:s.id,crudo:s.crudo},lb:'book',tile:'thinking',col:'books',salida:'no-sirve',ti:p.ti,ctx:p.ctx,links:p.links,notes:p.notes,tag:'From your books'}); autoSrc(R[k],s.texto||s.crudo); return k; }),...ghosts('thinking','books')];
  //  2026-10-21: the study queue left the Thinking tier for the study room (/estudio). Here only the urgent count
  //  survives, as the number on the Study button and on the phone bar (Pablo: "only put the number of things that are urgent").
  { const urg=pend('estudio').filter(i=>/\b(iu|nu)\s*$/i.test(i.cuando||'')).length; X.study=[]; X.studyMore=[];   // the square is the last code of the row's id comment
    ['#studyBadge','#studyBadgeT'].forEach(id=>{ const b=$(id); if(!b) return; b.textContent=urg; b.style.display=urg?'':'none'; }); }
  X.digestRows=[...pend('digest').map(it=>mk('digest',it,'digest','thinking',{col:'digest',tag:'Newsletter'})),...ghosts('thinking','digest')];
  X.episode=(J.newsletter||{}).episodio||null;
  X.cards=((J.aprendizaje||{}).tarjetas||[]).map(c=>Object.assign({key:'card:'+hash((c.categoria||'')+'|'+c.titulo)},c));
  Object.entries(S.cards).forEach(([k,st])=>{ if(st.rated&&!X.cards.some(c=>c.key===k)) X.cards.push({key:k,titulo:st.ti||'',pregunta:st.ti||'',gone:true}); });

  /* 03 — the AI toolbox: the Architect's morning pass (its panel check included) and LinkedIn connect's questions */
  tile('toolbox',{tier:3,o:'Upkeep',title:'Your AI toolbox',kind:'panel',panel:'toolbox'});
  T.toolbox.rows=[...pend('taller').map(it=>mk('taller',it,'tool','toolbox',{tag:/panel check/i.test(it.texto)?'Panel check':'The Architect · '+fromCuando(it.cuando)})),
    ...pend('conectar').map(it=>mk('conectar',it,'conn','toolbox',{tag:'LinkedIn connect · '+fromCuando(it.cuando)})),...ghosts('toolbox')];

  buildDay();
}

/* Today's view: the day from `dia/hoy.md` (cabina, 3:00), its urgent mail, and the preps he kept */
function hoySections(){ const out={}; let cur=null; String((D&&D.hoy)||'').split('\n').forEach(l=>{ const m=l.match(/^##\s+(.*)/); if(m){ cur=m[1].trim(); out[cur]=[]; } else if(cur) out[cur].push(l); }); return out; }
function dayWhen(k){ const s=String(k||''), now=NOW(); let d=null;
  if(/^today/i.test(s)) d=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  else if(/^tomorrow/i.test(s)) d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
  else if(/^\d{1,2}:\d{2}\b/.test(s)) d=new Date(now.getFullYear(),now.getMonth(),now.getDate());   /* 2026-10-20: a bare "11:00" is today — it was sorting below tomorrow */
  else { const m=s.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})\b/i);
    if(m){ const mo=MO.findIndex(x=>x.toLowerCase()===m[1].slice(0,3).toLowerCase()); d=new Date(now.getFullYear(),mo,+m[2]); if(d<now-1000*60*60*24*180) d.setFullYear(d.getFullYear()+1); } }
  if(!d) return s?8.64e15:Infinity; const t=s.match(/\b(\d{1,2}):(\d{2})\b/); if(t) d.setHours(+t[1],+t[2]); return d.getTime(); }
function buildDay(){
  const sec=hoySections(); const items=(name)=>{ const k=Object.keys(sec).find(x=>name.test(x)); return k?sec[k]:[]; };
  X.day=[]; X.allday=[];
  items(/^(what'?s next|lo que sigue)/i).forEach(l=>{ const m=l.match(/^\s*-\s+\*\*([^*]+)\*\*\s*[—–-]?\s*(.*)$/);
    if(!m){ const p=l.match(/^\s*-\s+(.+)$/); if(p) X.day.push({k:'',t:p[1].replace(/<!--[\s\S]*?-->/g,'').trim()}); return; }   /* "Nothing outside your routine today." is news too */ const k=m[1].trim(), t=m[2].replace(/<!--[\s\S]*?-->/g,'').trim();
    if(/^all day$/i.test(k)) X.allday.push(t); else X.day.push({k,t}); });
  /* chronological, whatever order the job wrote them in (2026-10-17: "Tomorrow" came after Thu Oct 22) */
  X.day=X.day.map((d,i)=>({d,i,w:dayWhen(d.k)})).sort((a,b)=>a.w-b.w||a.i-b.i).map(x=>x.d);
  X.mail=[];
  items(/urgent|urgente/i).forEach(l=>{ const m=l.match(/^\s*-\s+(?:\[.\]\s+)?(.*)$/); if(!m) return; const idm=l.match(/<!--\s*([A-Za-z0-9_-]+)/), id=idm?idm[1]:''; const it=id&&D.descartables&&D.descartables[id];
    const p=parseRow(m[1]); const key=it?it.trabajo+':'+id:'mail:'+hash(l);
    if(it) addRow(key,{src:{t:'m',trabajo:it.trabajo,id,crudo:it.crudo,cuando:((it.crudo.match(/·\s*(\d{1,2} [a-z]{3})/)||[])[1]||'')},lb:'mail',tile:'mail',salida:'no-sirve',ti:p.ti,ctx:p.ctx,links:p.links,notes:p.notes,tag:'Urgent mail'});
    else addRow(key,{ti:p.ti,ctx:p.ctx,links:p.links,notes:p.notes,tag:'Urgent mail',static:true});
    X.mail.push(key); });
  const tdy=d=>dayDiff(whenOf(d))===0;
  X.kept=(job('prep').hechos||[]).filter(it=>it.estado==='guardado'&&tdy(it.cuando)).map(it=>{ const p=parseRow(it.texto); const b=p.ti.match(/—\s+([\s\S]+)$/); return {ti:b?b[1]:p.ti,note:(p.notes[0]||[])[1]||''}; });
  Object.entries(S.handled).forEach(([k,h])=>{ if(h.state==='keep'&&h.tile==='prep'&&h.today&&!X.kept.some(x=>x.ti===h.ti)) X.kept.push({ti:h.ti,note:h.note||''}); });
  const sem=(D.semana||{}); X.today=(sem.dias||[]).find(d=>d.es_hoy)||null; X.weekProblem=sem.problema||(sem.vencida?'Your week file is from last week.':'');
}

/* the tiles that have something today (a tile with nothing behind it hides) */
function tileRows(t){ if(!t) return []; if(t.k==='commit'||t.k==='events') return Object.values(t.cols).flat(); if(t.k==='cold') return [...t.replies,...t.rows,...t.fups]; if(t.k==='warm') return [...t.rows,...t.mapRows];
  if(t.k==='linkedin') return [...t.drafts,...t.comments,...t.asks]; if(t.k==='thinking') return [...X.lesson,...X.council,...X.coach,...X.books,...X.study,...X.digestRows]; return t.rows; }
const isOpen=k=>R[k]&&R[k].state==='open';
const openIds=ids=>ids.filter(isOpen);
function openCount(t){ return openIds(tileRows(t)).length; }
function shown(k){ const t=T[k]; if(!t) return false; if(k==='thinking') return tileRows(t).length>0||X.cards.length>0||!!X.episode||!!S.manual.thinking; if(t.manualDone) return true; if(k==='warm') return tileRows(t).length>0||openIds(X.newp).length>0||openIds(X.newg).length>0; return tileRows(t).length>0; }
function tileDone(k){ const t=T[k]; return t.manualDone ? !!S.manual[k] : openCount(t)===0; }
const TIERS={0:['week','files'],1:['prep','due','commit'],2:['who','cold','warm','linkedin'],3:['events','thinking','toolbox']};
const TNAME={0:'00 · Week close',1:'01 · Urgent + important',2:'02 · Important',3:'03 · Nice to have'};
const levels=()=>WK?[0,1,2,3]:[1,2,3];
const RUNLV=[1,2,3];
function tierKeys(n){ const base=TIERS[n].filter(shown), o=(LAY.order[n]||[]).filter(k=>base.includes(k)); return [...o,...base.filter(k=>!o.includes(k))]; }
const isWide=k=>LAY.w[k]!=null?LAY.w[k]==='full':!!T[k].wide;
function tierLeft(n){ return tierKeys(n).reduce((a,k)=>a+(T[k].manualDone?(S.manual[k]?0:1):openCount(T[k])),0); }
function tierTotal(n){ return tierKeys(n).reduce((a,k)=>a+(T[k].manualDone?1:tileRows(T[k]).length),0); }
function firstOpen(from){ return RUNLV.find(n=>!S.closed[n]&&n>=(from||0)) ?? RUNLV.find(n=>!S.closed[n]) ?? null; }
function viewLv(){ if(S.view!=null && !S.closed[S.view]) return S.view; return firstOpen(); }
const weekFirst=()=>WK && !S.closed[0] && !S.skip0;

/* ───── nothing lost: every decision goes to an outbox on this computer, waits out the undo window, then is
   written through the server with its own decision_id — a resend after a closed laptop never applies twice
   (servidor.py `decision_ya_aplicada`). Rows are found again by their id right before each write, because the
   files are bitácoras and a note under one row moves the lines below it. ───── */
const OBK='jarvis-outbox', LOCK='jarvis-outbox-lock', TAB=Math.random().toString(36).slice(2);
let OB=[]; try{ OB=JSON.parse(localStorage.getItem(OBK)||'[]')||[]; }catch(_){ OB=[]; }
function saveOB(){ if(canStore&&!wiping){ try{ localStorage.setItem(OBK,JSON.stringify(OB)); }catch(_){ lastSaveOk=false; } } savedLabel(); }
const newDid=()=>'jv-'+DAY.replace(/-/g,'')+'-'+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-5);
function queue(op){ op.did=op.did||newDid(); op.i=op.i||0; op.due=Date.now()+(op.now?0:UNDO_MS); OB.push(op); saveOB(); schedFlush(); return op; }
function cancelOp(did){ const i=OB.findIndex(o=>o.did===did&&!o.sending&&!o.i&&!o.ka); if(i<0) return false; OB.splice(i,1); saveOB(); return true; }
/* by id, never by position: another tab may have replaced the list while a write was on its way */
function removeOp(op){ const ix=OB.findIndex(o=>o.did===op.did); if(ix>=0) OB.splice(ix,1); }
function syncOp(op){ const cur=OB.find(o=>o.did===op.did); if(cur&&cur!==op) Object.assign(cur,{i:op.i,res:op.res,sending:false,retried409:op.retried409}); }

function findIt(src,also){
  if(!D||!src) return null;
  if(src.t==='q') return (D.quien||[]).find(q=>q.id===src.id)||null;
  if(src.t==='g') return ((D.aprendizaje||{}).subrayados||[]).find(s=>(src.id&&s.id===src.id)||s.crudo===src.crudo)||null;
  if(src.t==='card') return ((D.aprendizaje||{}).tarjetas||[]).find(c=>c.titulo===src.titulo&&(c.categoria||'')===(src.categoria||''))||null;
  const j=job(src.trabajo), list=src.trabajo==='bentley-entregas'?(D.entregas||[]):[...(j.pendientes||[]),...(j.despues||[]),...(also?j.hechos||[]:[])];
  /* the exact line first (the one on screen, or the one this write left), then the same id among what's still open */
  const exact=list.find(it=>it.crudo===(also&&src.after?src.after:src.crudo)); if(exact) return exact; if(also&&src.after) return null;
  if(!src.id) return null; const same=list.filter(it=>it.id===src.id&&(!src.cuando||String(it.cuando||'').replace(/\s*·\s*hoy$/,'')===String(src.cuando).replace(/\s*·\s*hoy$/,'')));
  return same.find(it=>it.estado==='pendiente')||same[same.length-1]||null; }
function request(op,st){
  const s=op.src||{}, did=op.did+'.'+op.i, extra={decision_id:did, ms:op.ms||0, editado:!!op.editado, motivo:op.motivo||''};
  if(st.k==='post') return {url:st.url, body:st.did===false?st.body:Object.assign({decision_id:did},st.body)};
  if(st.k==='li') return {url:'/api/linkedin/decidir', body:Object.assign({id:s.id, accion:st.accion}, st.texto!=null?{texto:st.texto}:{}, st.hora?{hora:st.hora}:{}, st.motivo?{motivo:st.motivo}:{}, extra)};
  if(st.k==='later') return s.id?{url:'/api/despues', body:Object.assign({trabajo:s.trabajo,id:s.id,cuando:s.cuando||'',deshacer:!!st.deshacer},extra)}:null;
  if(st.k==='esc') return {url:'/api/digest/escuchado', body:{decision_id:did}};
  const it=findIt(s, st.reverse);
  if(!it) return null;
  if(st.k==='q') return {url:'/api/quien', body:Object.assign({archivo:s.archivo,linea:it.linea,crudo:it.crudo,respuesta:st.respuesta},extra)};
  if(st.k==='card') return {url:'/api/aprendizaje/tarjeta', body:Object.assign({linea:it.linea,crudo:it.crudo,calidad:st.calidad},extra)};
  if(st.k==='g') return {url:'/api/aprendizaje/gusto', body:Object.assign({linea:it.linea,crudo:it.crudo,marca:st.marca},extra)};
  if(st.k==='c') return {url:'/api/comentar', body:Object.assign({trabajo:s.trabajo,linea:it.linea,crudo:it.crudo,texto:st.texto},extra)};
  if(st.k==='m') return {url:'/api/marcar', body:Object.assign({trabajo:s.trabajo,linea:it.linea,crudo:it.crudo,marca:st.marca},extra)};
  return null; }

let flushing=false, flushT=null, netBad=false;
function takeLock(){ try{ const l=JSON.parse(localStorage.getItem(LOCK)||'null'); if(l&&l.tab!==TAB&&Date.now()-l.t<15000) return false; localStorage.setItem(LOCK,JSON.stringify({tab:TAB,t:Date.now()})); return true; }catch(_){ return true; } }
function dropLock(){ try{ const l=JSON.parse(localStorage.getItem(LOCK)||'null'); if(l&&l.tab===TAB) localStorage.removeItem(LOCK); }catch(_){} }
function schedFlush(){ clearTimeout(flushT); const live=OB.filter(o=>!o.dead); if(!live.length) return; const wait=Math.max(0,Math.min(...live.map(o=>o.retryAt||o.due))-Date.now()); flushT=setTimeout(flush,Math.min(wait,60000)+30); }
async function post(url,body,keepalive){ const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),keepalive:!!keepalive}); let j={}; try{ j=await r.json(); }catch(_){} return {status:r.status,j}; }
async function flush(){
  if(flushing) return; if(!takeLock()){ flushT=setTimeout(flush,4000); return; }
  flushing=true; let wrote=false;
  try{
    for(;;){
      if(canStore) try{ const fresh=JSON.parse(localStorage.getItem(OBK)||'[]'); if(Array.isArray(fresh)&&(fresh.length||!OB.length)) OB=fresh; }catch(_){}
      const now=Date.now(), op=OB.find(o=>!o.dead&&o.due<=now&&(!o.retryAt||o.retryAt<=now)); if(!op) break;
      try{ localStorage.setItem(LOCK,JSON.stringify({tab:TAB,t:Date.now()})); }catch(_){}
      op.sending=true; const st=op.steps[op.i]; let rq=request(op,st);
      if(!rq&&!op.reloaded){ op.reloaded=true; await load(true); rq=request(op,st); }
      /* already decided elsewhere (another tab, the old panel, the agent itself): that's done, not a failure */
      if(!rq&&(st.k==='m'||st.k==='c')&&!st.reverse){ const it=findIt(op.src,true); if(it&&it.estado&&it.estado!=='pendiente'){ op.i=op.steps.length; removeOp(op); saveOB(); continue; } }
      if(!rq){ failOp(op,'its row changed in the file since this screen was drawn'); continue; }
      let res;
      try{ res=await post(rq.url,rq.body); }catch(e){ op.sending=false; op.err='net'; op.tries=(op.tries||0)+1; op.retryAt=Date.now()+Math.min(60000,4000*op.tries); netBad=true; saveOB(); offline(true); break; }
      op.sending=false; netBad=false; offline(false);
      if(res.status===200){
        if(res.j&&res.j.crudo) op.res={crudo:res.j.crudo}; wrote=true; op.i++; op.err=null; op.reloaded=false; op.retried409=false; syncOp(op);
        if(op.i>=op.steps.length){ removeOp(op); const h=S.handled[op.key]; if(h&&h.did===op.did){ h.sent=true; h.res=op.res||null; } (SENT[op.did]=op); }
        saveOB(); persist(); if(op.after) try{ AFTER[op.after]&&AFTER[op.after](res.j,op); }catch(_){}
        await load(true);
        continue; }
      if(res.status===409&&!op.retried409){ op.retried409=true; syncOp(op); await load(true); continue; }
      /* part of it is already in the file (his reason under the row): never pretend it all failed */
      if(op.i>0){ removeOp(op); saveOB(); toast(`Your note was saved, but the row itself changed in the file · ${String(op.ti||'').slice(0,40)}`,false,true); continue; }
      failOp(op,(res.j&&res.j.error)||('the server answered '+res.status));
    }
  } finally { flushing=false; OB.forEach(o=>{ o.sending=false; }); dropLock(); saveOB(); if(wrote) softRender(); schedFlush(); }
}
const SENT={};          /* this session's written decisions, for undo after the window */
const AFTER={};         /* small follow-ups some writes need (a toast with the server's answer) */
function failOp(op,why){
  removeOp(op); saveOB();
  if(op.src&&op.src.t==='card'&&S.cards[op.key]) delete S.cards[op.key].rated;
  const h=S.handled[op.key]; const ti=(h&&h.ti)||op.ti||(R[op.key]&&R[op.key].ti)||'that';
  if(h&&h.did===op.did){ delete S.handled[op.key]; persist(); }
  toast(`Couldn't save · ${String(ti).slice(0,46)} — ${why}. It's back on your list.`,false,true); SFX.play('error');
  softRender(); }
addEventListener('storage',e=>{ if(e.key===OBK){ try{ OB=JSON.parse(e.newValue||'[]')||[]; }catch(_){} savedLabel(); schedFlush(); } });
/* closing the laptop or the tab: anything still waiting goes now; the outbox stays until the server says yes */
function flushNow(){ const now=Date.now(); let any=false; OB.forEach(o=>{ if(!o.dead&&o.due>now){ o.due=now; any=true; } }); if(!any) return;
  OB.filter(o=>!o.dead&&!o.sending).forEach(o=>{ const rq=request(o,o.steps[o.i]); if(rq){ o.ka=true; try{ post(rq.url,rq.body,true).catch(()=>{}); }catch(_){} } }); saveOB(); }
addEventListener('pagehide',()=>{ persist(true); flushNow(); });
/* hidden (another tab, the lid closed): only remember; the outbox goes out on its own clock, so Undo still works */
document.addEventListener('visibilitychange',()=>{ if(document.hidden){ persist(true); } else { if(iso(NOW())!==DAY) return location.reload(); refresh(); schedFlush(); } });

function savedLabel(){ const el=$('#saved'); if(!el) return; const pend=OB.filter(o=>!o.dead).length; el.classList.remove('bad','wait'); el.hidden=false;
  if(!canStore||!lastSaveOk){ el.textContent='● not saving on this computer · the browser blocks storage'; el.classList.add('bad'); return; }
  if(netBad){ el.textContent=`● couldn't save · ${plural(pend,'decision')} waiting · retrying`; el.classList.add('bad'); return; }
  /* 2026-10-15: the footer is gone (Pablo). This label shows only when saving fails; while saving works, nothing. */
  el.hidden=true; el.textContent=''; }
function offline(on,e){ const b=$('#errBanner'); if(!b) return; b.classList.toggle('show',!!on); if(on) $('#errMsg').textContent="Exo can't reach your files. Is the black window still open? Your decisions are kept here and go out when it's back."; }

/* ───── one decision on a row ───── */
const ms=key=>Math.max(0,Date.now()-(S.shownAt[key]||Date.now()));
function steps(r,how,o){
  const t=(r.src||{}).t, lb=LB[r.lb]||{};
  if(how==='later') return [{k:'later'}];
  if(t==='li'){ if(how==='ok') return [{k:'li',accion:'aprobar',texto:o.texto!=null?o.texto:undefined,hora:r.sug||undefined}]; return [{k:'li',accion:'tirar',motivo:o.why||''}]; }
  if(t==='q') return [{k:'q',respuesta:o.answer}];
  if(t==='g') return [{k:'g',marca:how==='ok'?'x':'-'}];
  if(how==='ok') return r.lb==='digest'&&/^dg-reporte-/.test((r.src||{}).id||'')?[{k:'esc'}]:[{k:'m',marca:'x'}];   /* "I listened" ticks the digest's rows itself (servidor.py `_escuchado_digest`) */
  if(how==='keep') return [{k:'m',marca:'*'}];
  if(how==='unsure') return [{k:'m',marca:'r'}];
  if(how==='skip') return [{k:'m',marca:'n'}];
  if(how==='why'&&o.why) return [{k:'c',texto:o.why},{k:'m',marca:lb.whyMark||'-'}];
  if(how==='laternote'&&o.why) return [{k:'c',texto:'Later — '+o.why},{k:'m',marca:'r'}];
  return [{k:'m',marca:'-'}]; }
function act(key,how,o={}){
  const r=R[key]; if(!r||r.state!=='open'||r.static) return;     /* a second click on a row already handled does nothing */
  const state = how==='ok'||how==='keep' ? 'ok' : how==='later' ? 'later' : how==='laternote' ? 'redo' : how==='skip' ? 'no' : how==='unsure' ? 'unsure' : (how==='why'&&o.why&&(LB[r.lb]||{}).whyMark==='r') ? 'redo' : (how==='who'&&o.answer==="don't know") ? 'no' : how==='who' ? 'ok' : 'no';
  const list=focusables(), i=list.findIndex(e=>e.dataset.k===key);
  if(i>=0){ const n=list.slice(i+1).find(e=>e.dataset.k!==key)||list.slice(0,i).reverse().find(e=>e.dataset.k!==key); S[FK()]=n?n.dataset.k:null; }
  const op=queue({key, src:r.src, steps:steps(r,how==='who'?'who':how,o), ms:ms(key), editado:!!o.editado, motivo:o.why||''});
  S.handled[key]={state, ti:r.lb==='who'?`${o.answer==="don't know"?"Don't know":/^[A-Z]$/.test(o.answer||'')?'Speaker '+o.answer:/^[A-Z](\+[A-Z])+$/.test(o.answer||'')?'Speakers '+o.answer.split('+').join(' + '):o.answer} · ${r.junta||'Granola'}`:r.ti, tile:r.tile, col:r.col||null, did:op.did, at:Date.now(), keep:how==='keep', today:how==='keep'&&r.dt?dayDiff(r.dt)===0:false, mtg:r.tile==='prep'&&r.dt?+r.dt:null, note:r.prepNote||''};
  S.undo.push({type:'row',key,did:op.did}); r.state=state; S.editing=S.why=S.note=null; delete S.drafts[key];
  const label=o.label||(how==='laternote'?'Later · Sunday it rewrites the message from your note':null)||(how==='skip'?"You won't go · it's off your day and its calendar block goes tomorrow":null)||({ok:'Done',later:'Later · it comes back '+laterWhen(r),unsure:'The agent will find out more · back tomorrow',redo:'No · the agent will learn from that'}[state]||'Dismissed');
  pendingSay=label;
  const el=document.getElementById('row-'+cssId(key));
  SFX.play(state==='ok'?'accept':state==='unsure'||state==='later'?'soft':'dismiss'); dropToPile(el,state==='ok');
  if(el){ el.classList.add('leaving');
    if(RM.matches||!el.animate){ el.style.opacity='.2'; scheduleRender(90); }
    else { const h=el.offsetHeight; el.style.overflow='hidden';
      el.animate([{height:h+'px',opacity:1,transform:'translateX(0)'},{height:'0px',opacity:0,transform:'translateX(14px)',paddingTop:'0px',paddingBottom:'0px',borderTopWidth:'0px',borderBottomWidth:'0px',marginBottom:'-8px'}],{duration:280,easing:SPRING,fill:'forwards'});
      scheduleRender(270); } }
  else scheduleRender(0);
  toast(label+' · '+String(r.ti).slice(0,40), true);
  persist(); }
function laterWhen(r){ const s=r.src||{}; if(s.trabajo==='estudio') return 'in 7 days'; if(s.trabajo==='prep'&&r.dt&&dayDiff(r.dt)>1) return 'on '+WD[r.dt.getDay()]; return 'tomorrow'; }
/* a line under the row (his note, his answer); the row stays open */
function comment(key,texto,label){ const r=R[key]; if(!r||!texto) return; queue({key:key+'#c',src:r.src,steps:[{k:'c',texto}],ms:ms(key),motivo:'',ti:r.ti}); (r.comentarios=r.comentarios||[]).push(texto); if(label) toast(label); persist(); }
function undo(){
  const u=S.undo.pop(); if(!u){ SFX.play('error'); toast('Nothing to undo'); return; }
  SFX.play('undo');
  if(u.type==='row'){ clearTimeout(renderT); const h=S.handled[u.key];
    if(cancelOp(u.did)){ delete S.handled[u.key]; if(R[u.key]&&!R[u.key].ghost) R[u.key].state='open'; S[sheetOpen?'sf':'f']=u.key; }
    else { const op=SENT[u.did]; const last=op&&op.steps[op.steps.length-1];
      let rev=null;
      if(op.steps.some(x=>x.k==='c')){ S.undo.push(u); toast('Already saved — your reason is with the agent; this one stays'); return; }
      if(last&&last.k==='m'&&op.res&&op.res.crudo) rev=[{k:'m',marca:' ',reverse:true}];
      else if(last&&last.k==='later') rev=[{k:'later',deshacer:true}];
      else if(last&&last.k==='li') rev=[{k:'li',accion:'reabrir'}];
      if(!rev){ S.undo.push(u); toast("Already saved — this one can't be undone from here"); return; }
      queue({key:u.key+'#undo',src:Object.assign({},op.src,{after:op.res&&op.res.crudo}),steps:rev,now:true}); delete S.handled[u.key]; refresh(); } }
  if(u.type==='manual'){ delete S.manual[u.k]; if(u.did&&!cancelOp(u.did)){ const op=SENT[u.did]; if(op&&op.res&&op.res.crudo) queue({key:'undo-'+u.k,src:Object.assign({},op.src,{after:op.res.crudo}),steps:[{k:'m',marca:' ',reverse:true}],now:true}); } }
  if(u.type==='close'){ delete S.closed[u.n]; if(u.n!==0) S.view=u.n; else S.skip0=false; if(u.manana&&!cancelOp(u.manana)) queue({key:'manana',steps:[{k:'post',url:'/api/manana',body:{fecha:DAY,estado:'reabierta'}}],now:true}); }
  if(u.type==='card'){ const c=S.cards[u.key]; if(c&&cancelOp(u.did)){ delete c.rated; } else { S.undo.push(u); toast("Already saved — this card can't be undone"); return; } }
  if(!sheetOpen&&S.autoClosed){ const k2=S.autoClosed, tk=u.type==='row'?(R[u.key]||{}).tile:u.type==='manual'?u.k:u.type==='card'?'thinking':null;   /* undo right after a screen closed itself → it opens again */
    if(tk&&T[tk]&&T[tk].panel===k2||(k2==='people'&&u.type==='row')){ S.autoClosed=null; openSheet(k2,true); } }
  if(sheetOpen) renderSheet(); render(); toast('Undone'); persist(); }

/* ───── rows ───── */
const cssId=k=>String(k).replace(/[^A-Za-z0-9_-]/g,'_');
const C={People:'var(--amber)',Commitments:'var(--amber)',Thinking:'var(--amber)',Upkeep:'var(--amber)'};
function mailtoOf(r){ const body=S.drafts[r.key]&&S.drafts[r.key].draft!=null?S.drafts[r.key].draft:r.msg; return 'mailto:'+encodeURIComponent(r.to).replace(/%40/g,'@')+'?subject='+encodeURIComponent(r.su||'')+'&body='+encodeURIComponent(body||''); }
function rowHtml(key){
  const r=R[key]; if(!r||r.state!=='open') return '';
  if(!S.shownAt[key]) S.shownAt[key]=Date.now();
  const lb=LB[r.lb]||{}, id=esc(key), dr=S.drafts[key]||{};
  const later = (r.salida==='later'&&r.src&&r.src.id&&!lb.nolater) ? `<button class="b" data-act="${lb.laterNote?'laterbox':'later'}" data-id="${id}">Later<span class="kchip">L</span></button>` : '';
  let btns='';
  if(r.lb==='who'){
    const two=WHO2[key], isL=v=>/^[A-Z]$/.test(v);
    btns=r.opts.filter(([l,v])=>!two||isL(v)).map(([l,v],i)=>`<button class="b ok${l.length>24?' say':''}${two&&two.includes(v)?' pressed':''}" data-act="${two?'who2':'who'}" data-v="${esc(v)}" data-id="${id}">${esc(l)}${i<9?`<span class="kchip">${i+1}</span>`:''}</button>`).join('')
      +(two ? `<button class="b ok" data-act="who2save" data-id="${id}"${two.length<2?' disabled':''}>${two.length<2?'Pick two or more':'Save '+two.join(' + ')}<span class="kchip">↵</span></button><button class="b" data-act="who2" data-v="" data-id="${id}">Cancel<span class="kchip">T</span></button>`
      : (r.opts.filter(([,v])=>isL(v)).length>2&&!r.other ? `<button class="b" data-act="who2" data-v="" data-id="${id}">I was two of them<span class="kchip">T</span></button>` : '')
        +`<button class="b no" data-act="who" data-v="don't know" data-id="${id}">Don't know<span class="kchip">X</span></button>`);
  } else if(!r.static){
    btns=`<button class="b ok" data-act="ok" data-id="${id}">${esc(lb.ok||'Useful')}<span class="kchip">A</span></button>`;
    if(lb.keep) btns+=`<button class="b" data-act="keep" data-id="${id}">${esc(lb.keep)}<span class="kchip">K</span></button>`;
    if(lb.skip) btns+=`<button class="b" data-act="skip" data-id="${id}">${esc(lb.skip)}<span class="kchip">Y</span></button>`;
    if(lb.unsure) btns+=`<button class="b" data-act="unsure" data-id="${id}">${esc(lb.unsure)}<span class="kchip">U</span></button>`;
    if(lb.note) btns+=`<button class="b" data-act="note" data-id="${id}">Note<span class="kchip">N</span></button>`;
    if(lb.rev&&r.msg) btns+=`<button class="b" data-act="edit" data-id="${id}">Edit<span class="kchip">E</span></button>`;
    btns+=later;
    if(lb.rev) btns+=`<button class="b no" data-act="why" data-id="${id}">No, this is why<span class="kchip">X</span></button>`;
    else if(lb.no) btns+=`<button class="b no" data-act="no" data-id="${id}">${esc(lb.no)}<span class="kchip">X</span></button>`;
  }
  const L=[];
  if(lb.rev&&r.msg&&r.to) L.push(`<a class="b go" href="${esc(mailtoOf(r))}">Write it in Mail ↗</a>`);
  else if(lb.rev&&r.msg&&!r.links.some(l=>/^(mailto|whatsapp):/i.test(l[1]))&&!lb.li) L.push(`<button class="b go" data-act="copy" data-id="${id}" data-key="c">Copy the message<span class="kchip">C</span></button>`);
  if(lb.li&&r.msg) L.push(`<button class="b go" data-act="liopen" data-id="${id}" data-key="o">Copy it and open LinkedIn ↗<span class="kchip">O</span></button>`);
  if(lb.lic&&r.msg) L.push(`<button class="b go" data-act="copy" data-id="${id}" data-key="c">Copy the comment<span class="kchip">C</span></button>`);
  (r.links||[]).forEach(l=>L.push(linkBtn(l)));
  (r.notes||[]).filter(n=>n[1]!==r.prepNote&&!(r.msg&&/^cracks_/.test(n[1]))).forEach(([lab,n,ck])=>L.push(ck?`<a class="b go" href="#" data-nota="${esc(n)}" data-key="${ck.toLowerCase()}">${esc(lab)} ↗<span class="kchip">${ck}</span></a>`:`<a class="b go" href="#" data-nota="${esc(n)}">${esc(/^open/i.test(lab)?lab:lab===n?'Open: '+n.split('/').pop().replace(/_\d{4}-\d{2}-\d{2}$/,'').replace(/[-_]+/g,' ').slice(0,38):'Open '+lab)} ↗</a>`));
  if(r.prepNote&&sheetOpen!=='prep') L.push(`<a class="b go" href="#" data-nota="${esc(r.prepNote)}">Open the prep ↗</a>`);   /* 2026-10-20: on the prep sheet the prep just shows — no Hide, no Full screen (Pablo) */
  (r.correlo||[]).slice(0,1).forEach(p=>L.push(r.lb==='study'?`<button class="b go" data-act="deeper" data-id="${id}" data-key="r">Copy the go-deeper prompt<span class="kchip">R</span></button>`:`<button class="b go" data-act="claude" data-id="${id}" data-key="r">Run it in Claude ↗<span class="kchip">R</span></button>`));
  if(r.body) L.push(`<button class="b go" data-act="read" data-id="${id}" data-key="v">${S.exp[key]?'Hide':'Read it'}<span class="kchip">V</span></button>`);
  if(r.ficha&&r.ficha.length) L.push(`<button class="b go" data-act="ficha" data-id="${id}" data-key="i">${S.exp[key+'#f']?'Hide the profile':'Who they are'}<span class="kchip">I</span></button>`);
  /* 2026-10-19 — every row button shows its key: ↵ the first link, ⇧↵ the second */
  /* 2026-10-21 — ↵ / ⇧↵ go only to links with no letter of their own, so a lettered link never shifts them */
  let na=0; const LL=L.map(h=>/^<a class="b go"/.test(h)&&!/class="kchip"/.test(h)&&na<2?h.replace(/^<a /,`<a data-enter="${na+1}" `).replace(/<\/a>$/,`<span class="kchip">${na++?'⇧↵':'↵'}</span></a>`):h);
  const links=LL.length?`<div class="links">${LL.join('')}</div>`:'';
  const msgTxt=dr.draft!=null?dr.draft:r.msg;
  const msg = S.editing===key ? `<div class="edit"><textarea data-msg="${id}" rows="8">${esc(msgTxt)}</textarea><div style="display:flex;gap:6px;margin-top:6px"><button class="b ok" data-act="save" data-id="${id}">Save and accept<span class="kchip" style="display:inline-block">⌘↵</span></button><button class="b" data-act="cancel" data-id="${id}">✕ Close<span class="kchip" style="display:inline-block">Esc</span></button></div></div>`
            : msgTxt?`<div class="msg ${lb.rev?'full':''}">${esc(msgTxt)}</div>`:'';
  const wl=S.whyKind==='later';
  const why = S.why===key ? `<div class="why"><input data-whyin="${id}" placeholder="${wl?'What should it be about? · ↵ (empty = just Later)':'Why not? The agent learns from it · ↵ to send (empty = just no)'}" value="${esc(dr.why||'')}"><button class="b ${wl?'':'no'}" data-act="whysend" data-id="${id}">${wl?'Later':'No'}</button><button class="b" data-act="cancel" data-id="${id}">✕</button></div>`:'';
  /* 2026-10-20: the week close is answered here, so its rows (and the files ones) take a multi-line answer · ⌘↵ saves */
  const longNote=r.lb==='week'||r.lb==='files';
  const note = S.note===key ? `<div class="why">${longNote?`<textarea data-notein="${id}" rows="4" placeholder="Your answer · ⌘↵ to save · blank comes back next Sunday">${esc(dr.note||'')}</textarea>`:`<input data-notein="${id}" placeholder="${r.lb==='person'||r.lb==='group'?'Where you met, anything to remember':'Your answer or note'} · ↵ to save" value="${esc(dr.note||'')}">`}<button class="b ok" data-act="notesave" data-id="${id}">Save</button><button class="b" data-act="cancel" data-id="${id}">✕</button></div>`:'';
  const mine=(r.comentarios||[]).map(c=>`<div class="yours">✎ ${esc(c)}</div>`).join('');
  const other = r.other ? `<div class="why"><input data-whoin="${id}" placeholder="Someone else · ↵ to save" value="${esc(dr.who||'')}"></div>`:'';
  const body = r.body&&S.exp[key] ? `<div class="prepdoc md">${md(r.body)}</div>`:'';
  const ficha = r.ficha&&r.ficha.length&&S.exp[key+'#f'] ? `<div class="prepdoc md">${r.ficha.map(([k,v])=>`<h4>${esc(k)}</h4><p>${inl(v)}</p>`).join('')}</div>`:'';
  const prep = r.prepNote&&(sheetOpen==='prep'||S.exp[key]) ? `<div class="prepdoc md" data-prepdoc="${esc(r.prepNote)}">${NOTE_CACHE[r.prepNote]?md(String(NOTE_CACHE[r.prepNote].texto).split(/^##\s+(?:Conexiones|Connections)\b/m)[0].replace(/^#\s.*\n/,'')):'<span class="loading">Reading the prep…</span>'}</div>`:'';
  const huella = r.huella ? `<div class="cnote">${inl(r.huella.split('\n')[0].replace(/^-\s*/,''))}</div>`:'';
  const kind = r.lb==='who'?'<span class="kind dec">Name</span>':lb.rev?'<span class="kind rev">Review draft</span>':'<span class="kind dec">Decide</span>';
  const wide = lb.rev||r.prepNote||r.lb==='who'||r.lb==='person'||r.lb==='group';
  return `<div class="row ${wide?'rev':''}" id="row-${cssId(key)}" data-k="${id}"><div><div class="tag">${kind}<span>${esc(r.tag||'')}</span></div><div class="ti">${inl(r.ti)}</div>${r.ctx?`<div class="ctx">${inl(r.ctx)}</div>`:''}${huella}${r.quote?`<div class="quote">"${esc(r.quote)}"</div>`:''}${r.voices?voicesHtml(r.voices):''}${other}${prep}${body}${ficha}${msg}${why}${note}${mine}${links}</div><div class="btns">${btns}</div></div>`;
}
function rowsHtml(ids){ return ids.map(rowHtml).join(''); }
function foldHtml(name,ids,label){ const open=openIds(ids); if(!open.length) return ''; const on=!!S.folds[name];
  return `<div class="fold" data-fold="${esc(name)}"><span>${esc(label||plural(open.length,'earlier one'))} · ${open.length}</span><span>${on?'hide':'show'}</span></div>${on?`<div class="foldrows">${rowsHtml(open)}</div>`:''}`; }

/* ───── done pile, rolling number, level bars, magnetic buttons (the "feel" pieces of rounds 9–10) ───── */
let DONE_N=-1;
function doneCount(){ return Object.values(S.handled).filter(h=>h.state==='ok').length; }
function drawOdo(n){ const el=$('#odo'); if(!el) return; const d=String(n).split(''); while(el.children.length<d.length) el.insertAdjacentHTML('afterbegin','<span><i>0<br>1<br>2<br>3<br>4<br>5<br>6<br>7<br>8<br>9</i></span>');
  while(el.children.length>d.length) el.firstChild.remove(); [...el.children].forEach((sp,i)=>{ sp.firstChild.style.transform=`translateY(${-(+d[i])*1.25}em)`; }); }
function pileBump(){ const p=$('#pile'); if(!p||RM.matches||!p.animate) return; p.animate([{transform:'scale(1,1)'},{transform:'scale(1.18,.84)'},{transform:'scale(.94,1.08)'},{transform:'scale(1,1)'}],{duration:380,easing:'ease-out'}); }
function dropToPile(el,accepted){
  if(RM.matches||!el||!el.animate) return; const r=el.getBoundingClientRect(), p=$('#pile').getBoundingClientRect(); if(r.width<1) return;
  const g=el.cloneNode(true); g.removeAttribute('id'); g.classList.remove('leaving','focus'); g.classList.add('ghost'); Object.assign(g.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'}); document.body.appendChild(g);
  setTimeout(()=>{ if(g.isConnected){ g.remove(); if(accepted) pileBump(); } },900);
  if(accepted&&p.width){ const dx=p.left+p.width/2-(r.left+r.width/2), dy=p.top+p.height/2-(r.top+r.height/2);
    g.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${dx*.25}px,${-18}px) scale(.7) rotate(-2deg)`,opacity:1,offset:.22,easing:'cubic-bezier(.55,0,1,.45)'},{transform:`translate(${dx}px,${dy}px) scale(.08) rotate(4deg)`,opacity:.6}],{duration:560,easing:'cubic-bezier(.2,.7,.4,1)',fill:'forwards'}).onfinish=()=>{ if(g.isConnected){ g.remove(); pileBump(); } };
  } else { g.animate([{transform:'translateY(0) rotate(0)',opacity:.9},{transform:`translateY(${Math.min(260,innerHeight-r.top)}px) rotate(${Math.random()<.5?-6:6}deg)`,opacity:0}],{duration:420,easing:'cubic-bezier(.55,0,1,.45)',fill:'forwards'}).onfinish=()=>g.remove(); } }
function updatePile(){ const n=doneCount(); if(n!==DONE_N){ DONE_N=n; drawOdo(n); } $('#pile').style.display=S.started&&n>0?'':'none'; }
let PILE=null;
function pileMount(){
  const slot=$('#pileSlot'); if(!slot) return;
  if(PILE){ if(PILE.cv.parentNode!==slot) slot.appendChild(PILE.cv); return; }
  if(RM.matches) return; if(!window.Matter){ need('matter').then(()=>pileMount()).catch(()=>{}); return; }
  const M=window.Matter, W=slot.clientWidth||600, H=slot.clientHeight||230, Dp=Math.min(2,devicePixelRatio||1);
  const cv=document.createElement('canvas'); cv.width=W*Dp; cv.height=H*Dp; slot.appendChild(cv); const x=cv.getContext('2d'); x.scale(Dp,Dp);
  const eng=M.Engine.create({enableSleeping:true}); eng.gravity.y=1.1;
  const wall=(a,b,w,h)=>M.Bodies.rectangle(a,b,w,h,{isStatic:true});
  M.Composite.add(eng.world,[wall(W/2,H+30,W*2,60),wall(-30,H/2,60,H*3),wall(W+30,H/2,60,H*3)]);
  const items=Object.values(S.handled).slice(0,46);
  x.font='500 11px Geist Mono, ui-monospace, monospace';
  const chips=[]; items.forEach((h,i)=>setTimeout(()=>{ if(!PILE) return; const label=(h.state==='ok'?'✓ ':'· ')+String(h.ti||'').replace(/ · .*/,'').slice(0,22), w=Math.ceil(x.measureText(label).width)+22, hh=26;
      const b=M.Bodies.rectangle(30+Math.random()*(W-60),-30-Math.random()*40,w,hh,{chamfer:{radius:8},restitution:.32,friction:.4,frictionAir:.012,angle:(Math.random()-.5)*.8});
      b.plugin={label,ok:h.state==='ok',w,h:hh}; chips.push(b); M.Composite.add(eng.world,b); },120+i*85));
  const mouse=M.Mouse.create(cv); mouse.pixelRatio=Dp; const mc=M.MouseConstraint.create(eng,{mouse,constraint:{stiffness:.18,render:{visible:false}}}); M.Composite.add(eng.world,mc);
  mouse.element.removeEventListener('mousewheel',mouse.mousewheel); mouse.element.removeEventListener('DOMMouseScroll',mouse.mousewheel); mouse.element.removeEventListener('wheel',mouse.mousewheel);
  let lastTick=0; M.Events.on(eng,'collisionStart',ev=>{ const now=performance.now(); if(now-lastTick<55) return; if(ev.pairs.some(p=>Math.abs(p.bodyA.velocity.y-p.bodyB.velocity.y)>3.2)){ lastTick=now; SFX.play('land'); } });
  const rr=(x0,y0,w,h,r)=>{ x.beginPath(); x.moveTo(x0+r,y0); x.arcTo(x0+w,y0,x0+w,y0+h,r); x.arcTo(x0+w,y0+h,x0,y0+h,r); x.arcTo(x0,y0+h,x0,y0,r); x.arcTo(x0,y0,x0+w,y0,r); x.closePath(); };
  let last=performance.now();
  const loop=now=>{ if(!PILE) return; PILE.raf=requestAnimationFrame(loop); if(!cv.isConnected) return; M.Engine.update(eng,Math.min(32,now-last)); last=now;
    x.clearRect(0,0,W,H); x.textBaseline='middle'; x.textAlign='center';
    chips.forEach(b=>{ const p=b.plugin; x.save(); x.translate(b.position.x,b.position.y); x.rotate(b.angle); rr(-p.w/2,-p.h/2,p.w,p.h,8);
      x.fillStyle=p.ok?'#10261d':'#161b19'; x.fill(); x.lineWidth=1; x.strokeStyle=p.ok?'#2f7d61':'#2A3430'; x.stroke(); x.fillStyle=p.ok?'#5EE6B0':'#9AA8A1'; x.fillText(p.label,0,1); x.restore(); }); };
  PILE={cv,eng,raf:requestAnimationFrame(loop)}; }
const LASTP={};
function animateBars(){ $$('.lvbar').forEach(b=>{ const n=b.dataset.lv, tot=tierTotal(+n), p=tot?(tot-tierLeft(+n))/tot:1, prev=LASTP[n]??p, i=b.firstChild;
    i.style.transition='none'; i.style.width=(prev*100)+'%'; void i.offsetWidth;
    if(!RM.matches) i.style.transition='width .6s cubic-bezier(.34,1.56,.64,1)'; i.style.width=(p*100)+'%';
    b.classList.toggle('full',p>=1); if(p>=1&&prev<1&&!RM.matches){ b.classList.add('shimmer'); setTimeout(()=>b.classList.remove('shimmer'),950); }
    LASTP[n]=p; }); }
function lvBar(n){ const tot=tierTotal(n), done=tot-tierLeft(n); return `<div class="lvbar" data-lv="${n}"><i></i></div><div class="lvlbl"><span>${done} of ${tot} handled</span><span>${tot?Math.round(done/tot*100):100}%</span></div>`; }
addEventListener('pointermove',e=>{ if(RM.matches||e.pointerType==='touch') return;
  $$('.b.big').forEach(b=>{ const r=b.getBoundingClientRect(); if(!r.width) return; const dx=e.clientX-(r.left+r.width/2), dy=e.clientY-(r.top+r.height/2), d=Math.hypot(dx,dy), RAD=120;
    if(d<RAD){ const k=(1-d/RAD)*.32; b.style.transition='transform .12s ease-out'; b.style.transform=`translate(${(dx*k).toFixed(1)}px,${(dy*k).toFixed(1)}px)`; b.dataset.mag='1'; }
    else if(b.dataset.mag){ b.style.transition='transform .6s cubic-bezier(.34,1.56,.64,1)'; b.style.transform=''; delete b.dataset.mag; } }); },{passive:true});

/* ───── mornings: one dot a day from `dia/mananas.md`; Sundays are rest days and never break anything ───── */
function drawDots(){ let m=(D&&D.mananas)||[];
  /* the dots start the first morning he completed (or today): the days before the panel counted aren't misses */
  const first=m.findIndex(x=>x.estado==='completa'||x.estado==='reabierta'||x.fecha===DAY); if(first>0) m=m.slice(first);
  if(!m.length){ $('#dots').innerHTML=''; return; }
  const today=S.closed[1]&&S.closed[2];
  const out=m.map(x=>{ const t=x.fecha===DAY, st=t?(today||x.estado==='completa'?'today done':'today'):x.estado==='completa'?'':x.estado==='descanso'?'rest':'miss';
    const dt=whenOf(x.fecha); return {st,label:dt?WD[dt.getDay()]+' '+MO[dt.getMonth()]+' '+dt.getDate():x.fecha}; });
  const done=out.filter(x=>x.st===''||x.st==='today done').length, work=out.filter(x=>x.st!=='rest'&&x.st!=='today').length;
  $('#dots').innerHTML=out.map(x=>`<i class="${x.st}" title="${esc(x.label)}${x.st==='rest'?' · rest day':x.st==='miss'?' · not completed':x.st.startsWith('today')?' · today':' · completed'}"></i>`).join('')+`<span>${work?done+' of '+work+' mornings':'your first morning'}</span>`; }

/* ───── views ───── */
function render(){
  if(!D) return;
  document.body.classList.toggle('started',S.started);
  const now=NOW(); $('#date').textContent=WD[now.getDay()].replace('Sun','Sunday').replace('Mon','Monday').replace('Tue','Tuesday').replace('Wed','Wednesday').replace('Thu','Thursday').replace('Fri','Friday').replace('Sat','Saturday')+' '+now.getDate()+' '+['January','February','March','April','May','June','July','August','September','October','November','December'][now.getMonth()]+' · '+String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  const v=viewLv();
  if($('#steps')){ $('#steps').hidden=!S.started&&!weekFirst();
  $('#steps').innerHTML=levels().map((n,i)=>{ const st=S.closed[n]?'done':(n===0?(weekFirst()?'cur':''):(S.started&&v===n?'cur':(S.started&&n<v&&!S.closed[n]?'skip':''))); return (i?`<i class="${S.closed[levels()[i-1]]?'done':''}"></i>`:'')+`<span class="s ${st}" data-goto="${n}" title="Go to ${short(n)}">${short(n)}</span>`; }).join(''); }
  agentsBtn();
  const app=$('#app');
  keepTyping(()=>{
    if(weekFirst()) app.innerHTML=weekCard();
    else if(!S.started){ app.innerHTML=startCard(); }
    else app.innerHTML=runView(); });
  if(!TOUCH&&!S.started&&!weekFirst()&&!sheetOpen&&!S._focusedObj){ const o=$('#obj'); if(o&&document.activeElement===document.body){ o.focus(); o.setSelectionRange(o.value.length,o.value.length); S._focusedObj=true; } }
  applyFocus(); drawDots(); updatePile(); animateBars(); pileMount();
  persist(); embReport(); }
/* v3: what is open, level by level, for the app's home ("Do now", "Still open", the badges). */
function embReport(){ if(!EMB||!D) return; try{
  const lv=levels(), tiers=lv.map(n=>({n, name:TNAME[n], closed:!!S.closed[n], total:tierTotal(n), left:tierLeft(n),
    rows:tierKeys(n).flatMap(k=>{ const t=T[k]; if(t.manualDone&&!tileRows(t).length) return [{title:t.title, open:!S.manual[k], tile:k, tileName:t.title, job:''}];
      return tileRows(t).filter(id=>R[id]&&!R[id].ghost).map(id=>({title:String(R[id].ti||'').replace(/<[^>]+>/g,'').replace(/\*\*/g,''), open:R[id].state==='open', tile:k, tileName:t.title, job:(R[id].src&&R[id].src.trabajo)||''})); }) }));
  const left=tiers.reduce((a,t)=>a+(t.closed?0:t.left),0);
  parent.postMessage({tipo:'jarvis-run', tiers, left, started:!!S.started, weekFirst:weekFirst(), objective:S.objective||'',
    allDone:RUNLV.every(n=>S.closed[n]||tierLeft(n)===0)}, location.origin);
}catch(e){ /* the run must never break because the app is listening */ } }
if(EMB) addEventListener('message',e=>{ if(e.origin!==location.origin||!e.data||e.data.tipo!=='v3') return; const m=e.data;
  if(m.accion==='goto'){ if(sheetOpen) closeSheet(); if(m.n===3&&NOW().getHours()<17){ S.manual.thinkingNow=true; } goto(m.n); }
  else if(m.accion==='sheet'&&m.k&&T[m.k]){ openSheet(m.k,true); }   /* 2026-11-01: a tap on Today opens that card even before the run is started */
  else if(m.accion==='brain') openBrain();
  else if(m.accion==='intro') playIntro(false,!!m.demo);
  else if(m.accion==='introgo'){ unlockAudio(); if(window.JarvisHUD&&JarvisHUD.begin) JarvisHUD.begin(); }
  else if(m.accion==='today'){ backHome=true; if(S.started){ S.started=false; S.f=null; render(); } scrollTo({top:0}); }
  else if(m.accion==='nohud'){ if(window.JarvisHUD&&JarvisHUD.isOpen) JarvisHUD.close(); }
  else if(m.accion==='refresh') refresh(); });
/* 2026-11-01 — the app shows this frame full-screen while the brain or the intro is open, and puts it back when it closes */
if(EMB){ let hudWas=false; setInterval(()=>{ const o=!!(window.JarvisHUD&&JarvisHUD.isOpen); if(o!==hudWas){ hudWas=o; parent.postMessage({tipo:'jarvis-hud',open:o},location.origin); } },300); }
/* re-render without pulling the box he's typing in out from under his fingers */
function keepTyping(fn){ const a=document.activeElement, sel=a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA')?[...a.attributes].filter(x=>x.name.startsWith('data-')||x.name==='id').map(x=>`[${x.name}="${CSS.escape(x.value)}"]`).join(''):null, s0=a&&a.selectionStart, s1=a&&a.selectionEnd;
  fn(); if(sel){ const b=document.querySelector((a.tagName.toLowerCase())+sel); if(b&&b!==a){ b.focus(); try{ b.setSelectionRange(s0,s1); }catch(_){} } } }
let renderT=null;
function scheduleRender(ms_){ clearTimeout(renderT); renderT=setTimeout(()=>{ renderT=null; if(sheetOpen) renderSheet(); render(); afterAct(); autoClose(); },ms_); }
/* 2026-10-17 — Pablo: "when I open any screen and finish what is there close the screen automatically for me".
   The last thing in a screen handled → "✓ All handled" for a moment, then it closes; Thinking and LinkedIn count as Done.
   Only after an action (a screen that opens empty stays open). Z right after opens it again (undo). */
let autoT=null;
/* 2026-10-22 — Pablo: "when I finish today's preps I want you to close the tab for me and put the mouse on the next block".
   The prep screen counts only today's meetings; tomorrow's stay in the tile, untouched. No meeting today → it never auto-closes. */
function prepToday(){ return (T.prep?T.prep.rows:[]).filter(id=>{ const h=S.handled[id], d=R[id]&&(R[id].dt||(h&&h.mtg&&new Date(h.mtg))); return d&&dayDiff(d)===0; }); }   /* a handled row comes back without its date → h.mtg */
function sheetLeft(k){ if(k==='people') return openIds(X.newp).length+openIds(X.newg).length;
  if(k==='prep'){ const td=prepToday(); return td.length?openIds(td).length:null; }
  const tk=Object.keys(T).find(x=>T[x]&&T[x].panel===k); if(!tk) return null;
  return openIds(tileRows(T[tk])).length+(k==='thinking'?X.cards.filter(c=>!cardState(c).rated).length:0); }
function autoClose(){ const k=sheetOpen; if(!k||sheetLeft(k)!==0) return; clearTimeout(autoT);
  autoT=setTimeout(()=>{ if(sheetOpen!==k||sheetLeft(k)!==0||S.editing||S.why||S.note) return;
    const tk=Object.keys(T).find(x=>T[x]&&T[x].panel===k); if(tk&&T[tk].manualDone&&!S.manual[tk]) finish(tk); else closeSheet(); S.autoClosed=k; },650); }
function softRender(){ if(!D) return; const a=document.activeElement; if(a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA')&&a.value){ pendingSoft=true; return; } if(sheetOpen) renderSheet(); render(); }
let pendingSoft=false; document.addEventListener('focusout',()=>{ if(pendingSoft){ pendingSoft=false; setTimeout(softRender,50); } });
let pendingSay='';
function afterAct(){ const el=document.querySelector('.focus'); if(el) el.scrollIntoView({block:'nearest',behavior:RM.matches?'auto':'smooth'}); if(pendingSay){ $('#live').textContent=pendingSay+'. '+leftNow(); pendingSay=''; } }
function leftNow(){ if(sheetOpen){ const n=focusables().filter(e=>isOpen(e.dataset.k)).length; return n+' left in this panel'; } const v=viewLv(); return v==null?'Morning complete':tierLeft(v)+' left in '+short(v); }
/* 2026-10-19 — the count reads the same list as the agents page (/api/datos → agentes, built from the files by
   agentes.py), so adding or retiring an agent moves both. It used to count only agents with a status file (24 vs 28). */
function agentList(){ const tr=Object.fromEntries(((D&&D.trabajos)||[]).map(t=>[t.slug,t])), ag=((D&&D.agentes&&D.agentes.agentes)||[]).filter(a=>a.tipo==='trabajo'||a.tipo==='en-vivo');
  return ag.length?ag.map(a=>({id:a.id,bad:(tr[a.id]||{}).color==='rojo'})):((D&&D.trabajos)||[]).map(t=>({id:t.slug,bad:t.color==='rojo'})); }
function agentsBtn(){ const js=agentList(); const bad=js.filter(t=>t.bad).length; $('#agentsBtn').innerHTML=`<span><span class="dot"></span>${js.length-bad} working</span>${bad?`<span><span class="dot r"></span>${bad} not working</span>`:''}<span class="t2">See your agents ↗</span><span class="kchip" style="display:inline-block">G A</span>`; }
/* 2026-10-16 — his Vocación p1 tasks above the calendar (Pablo: "not only my calendar… but the priority 1 things on my to-do list").
   From the Todoist copy `canales` rewrites each run; the ✓ closes it in Todoist and a second click reopens it. None → the block hides. */
function p1Html(){ const p=D&&D.p1; if(!p||!p.tareas||!p.tareas.length) return '';
  const old=p.copia&&!p.copia.startsWith(DAY)?` · copy from ${esc(dayLabel(whenOf(p.copia))||p.copia)}`:'';
  return `<div class="sec" style="margin-top:0"><span>Priority 1</span><span>Todoist${old}</span></div><div class="p1">${p.tareas.map(t=>`<div class="${t.cerrada?'done':''}"><button class="chk" ${t.id?`data-td="${esc(t.id)}"`:'disabled'} title="${t.cerrada?'Reopen it in Todoist':'Close it in Todoist'}">${t.cerrada?'✓':''}</button><span>${inl(t.texto)}</span></div>`).join('')}</div>`; }
/* 2026-10-20 Pablo: "1. the all-day things 2. today's uncommon things 3. anything uncommon throughout the week" —
   all day on top, then by time (dayWhen), and the notices with no time (a source not read) last, greyed */
function dayList(){ if(!X.day.length&&!X.allday.length) return '<div class="emptyday">Nothing on the calendar copy for today.</div>';
  return `<div class="tl">${X.allday.map(t=>`<div><span class="k">All day</span><span>${inl(t)}</span></div>`).join('')}${X.day.map(d=>`<div${d.k?'':' style="opacity:.55"'}><span class="k">${esc(d.k.replace(/\s*ET$/,''))}</span><span>${inl(d.t)}</span></div>`).join('')}</div>`; }
function mailHtml(){ const open=X.mail.filter(isOpen); if(!open.length) return '';
  return `<div class="sec">Urgent mail</div><div class="mail">${open.map(k=>{ const r=R[k], ln=(r.links||[]).find(l=>/^message:/i.test(l[1]))||(r.links||[])[0];
    return `<div><span><b>${inl(r.ti)}</b>${r.ctx?' · '+inl(r.ctx):''}</span><span class="acts3">${ln?`<a href="${esc(ln[1])}"${blank(ln[1])}>${/^message:/i.test(ln[1])?'Open in Mail':esc(ln[0])} ↗</a>`:''}${r.static?'':`<button data-act="ok" data-id="${esc(k)}" title="Done">✓</button><button data-act="no" data-id="${esc(k)}" title="Not relevant">✕</button>`}</span></div>`; }).join('')}</div>`; }
function keptHtml(){ if(!X.kept.length) return '';
  return X.kept.map(k=>`<div class="kept"><div class="t">Kept prep · today</div><b>${inl(k.ti)}</b>${k.note?`<div style="margin-top:6px"><a class="b go" href="#" data-nota="${esc(k.note)}">Open the prep ↗</a></div>`:''}</div>`).join(''); }
function weekCard(){
  const left=tierLeft(0), ready=left===0, keys=tierKeys(0);
  /* 2026-10-26: the close is answered step by step here — the Word button left the hero (G U opens Current Focus in Word; its panel step left 2026-10-31) */
  const word=keys.length?`<button class="b big" data-wz="start" style="margin-left:1ch">${S.wz?'Continue my close →':'Start my close →'}</button>`:'';
  return `<section class="box start active"><div class="legend up"><span class="n">00 · Week close</span><span class="r">${SUN?'first thing on Sunday':'still open from Sunday'}</span></div>
    <div class="mu up" style="font-size:11px">${SUN?'Sunday':'Left from Sunday'}</div><h1 style="font-size:28px;font-weight:500;margin:2px 0 6px">${SUN?'Close your week first.':'Your week is still open.'}</h1>
    <p class="t2" style="font-size:12px;margin-bottom:20px">I take you through it one question at a time. Then your day starts. ${word}</p>
    ${keys.length?`<div class="tiles">${keys.map(tileHtml).join('')}</div>`:'<div class="levelnote">Nothing waits here this week.</div>'}
    ${lvBar(0)}<div class="closebar ${ready?'ready':''}" data-k="close:0"><span class="left">${ready?'✓ Your week is closed':left+' still open'}</span>
    <span class="acts2"><button class="b" data-skip0>Skip to today →<span class="kchip">S</span></button><button class="b ${ready?'big':''}" data-close="0">${ready?'Close the week':'Check 00'}<span class="kchip" style="display:inline-block">⌘↵</span></button></span></div></section>`; }
/* 2026-10-19 — the quarter's quests and the week's objectives above today's one thing, read-only. Pablo: "there is no
   way to see my goals of the quarter and of the week … always show me these on the initial today's view where I place
   today's goal". A week file from last week shows greyed and says so: the new week opens in the week close. */
/* 2026-10-20 — and now editable here (Pablo: "give me a way to edit my quarterly and weekly goals"): Edit opens one
   line per goal, Save writes `trimestre/actual.md` (/api/trimestre) or `semana/actual.md` (/api/semana). A week file
   from last week gets "Start this week" (/api/semana/nueva archives it and opens this one). */
let GOAL_EDIT=null;
function goalsHtml(){ const tri=(D&&D.trimestre)||{}, q=(tri.quests||[]).filter(x=>x.texto), sem=(D&&D.semana)||{}, w=(sem.objetivos||[]).filter(x=>x.texto);
  const li=x=>`<li style="margin:3px 0;${x.hecho?'text-decoration:line-through;opacity:.55':''}">${inl(x.texto)}</li>`, ul=xs=>`<ul style="margin:4px 0 0;padding-left:18px;font-size:13px;line-height:1.4">${xs.map(li).join('')}</ul>`;
  const edLink=g=>`<a href="#" data-goaledit="${g}" style="font-size:10px">edit</a>`;
  const editor=(g,xs)=>`<textarea data-goalbox="${g}" rows="${Math.max(3,xs.length+1)}" style="width:100%;margin-top:6px;font-size:13px" placeholder="One per line">${esc(xs.map(x=>x.texto).join('\n'))}</textarea><div style="display:flex;gap:6px;margin-top:6px"><button class="b ok" data-goalsave="${g}">Save<span class="kchip" style="display:inline-block">⌘↵</span></button><button class="b" data-goalcancel>Cancel<span class="kchip" style="display:inline-block">Esc</span></button></div>`;
  let h='';
  if(tri.quests) h+=`<div class="sec" style="margin-top:0"><span>Quarter quests · ${esc(tri.nombre||tri.etiqueta||'')}</span>${GOAL_EDIT==='q'?'':edLink('q')}</div>${GOAL_EDIT==='q'?editor('q',q):q.length?ul(q):'<div class="mu" style="font-size:12px">No quests yet</div>'}`;
  const wsec=`<div class="sec"${h?'':' style="margin-top:0"'}><span>This week</span>${GOAL_EDIT==='w'||sem.vencida||sem.problema?'':edLink('w')}</div>`;
  if(sem.vencida) h+=wsec+`<div style="opacity:.5">${ul(w)}</div><div style="margin-top:6px;display:flex;align-items:center;gap:8px"><span class="mu" style="font-size:11px">From last week</span><button class="b" data-newweek>Start this week</button></div>`;
  else if(!sem.problema) h+=wsec+(GOAL_EDIT==='w'?editor('w',w):w.length?ul(w):'<div class="mu" style="font-size:12px">No goals yet</div>');
  return h?`<div style="margin-bottom:22px">${h}</div>`:''; }
function goalSave(g){ const box=document.querySelector(`[data-goalbox="${g}"]`); if(!box) return;
  const lines=box.value.split('\n').map(x=>x.replace(/^\s*[-*•]\s*/,'').trim()).filter(Boolean).slice(0,12);
  post(g==='q'?'/api/trimestre':'/api/semana',g==='q'?{quests:lines}:{objetivos:lines}).then(({status,j})=>{
    if(status!==200) return toast(j.error||"Couldn't save your goals",false,true);
    GOAL_EDIT=null; SFX.play('accept'); toast(g==='q'?'Quarter quests saved':"This week's goals saved"); load(); }).catch(()=>toast("Couldn't reach Exo",false,true)); }
document.addEventListener('click',e=>{ const el=e.target.closest('[data-goaledit],[data-goalsave],[data-goalcancel],[data-newweek]'); if(!el) return; e.preventDefault(); e.stopPropagation(); const d=el.dataset;
  if(d.goaledit){ GOAL_EDIT=d.goaledit; render(); const b=document.querySelector(`[data-goalbox="${d.goaledit}"]`); if(b){ b.focus(); b.setSelectionRange(b.value.length,b.value.length); } }
  else if(d.goalsave) goalSave(d.goalsave);
  else if('goalcancel' in d){ GOAL_EDIT=null; render(); }
  else if('newweek' in d){ el.disabled=true; post('/api/semana/nueva',{}).then(({status,j})=>{ if(status!==200){ el.disabled=false; return toast(j.error||"Couldn't open this week",false,true); }
    GOAL_EDIT='w'; toast('This week is open · write its goals'); load().then(()=>{ const b=document.querySelector('[data-goalbox="w"]'); if(b) b.focus(); }); }).catch(()=>{ el.disabled=false; toast("Couldn't reach Exo",false,true); }); } },true);
document.addEventListener('keydown',e=>{ const g=e.target&&e.target.dataset&&e.target.dataset.goalbox; if(!g) return;
  if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){ e.preventDefault(); e.stopPropagation(); goalSave(g); }
  else if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); GOAL_EDIT=null; render(); }
  else e.stopPropagation(); },true);
function objValue(){ return S.objective!=null?S.objective:((X.today&&X.today.texto)||''); }
function startCard(){ const any=Object.keys(S.handled).length>0;
  return `<section class="box start active"><div class="legend up"><span class="n">Today's view</span><span class="r">fill it, then start</span></div>
  <div class="in"><div>${keptHtml()}${p1Html()}<div class="sec"${D&&D.p1&&D.p1.tareas&&D.p1.tareas.length?'':' style="margin-top:0"'}>Your day</div>${dayList()}${mailHtml()}</div>
  <div class="obj">${goalsHtml()}<div class="sec" style="margin-top:0">Today's one thing</div><textarea id="obj" placeholder="What makes today a win?">${esc(objValue())}</textarea>
    ${X.weekProblem?`<div class="cnote">${esc(X.weekProblem)} Your one thing stays on this computer until the new week opens.</div>`:''}
    <div style="margin-top:22px;display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap"><button class="b" id="goIntro" data-gointro title="The Exo intro, then the run · ⇧⌘↵">▶ Start with intro<span class="kchip" style="display:inline-block">⇧⌘↵</span></button><button class="b big" id="go" data-go>${any?'Back to the run →':'Start the run →'}<span class="kchip" style="display:inline-block;color:var(--bg);border-color:rgba(0,0,0,.3)">⌘↵</span></button></div><div class="mpick" id="mpick">♪ Intro sound · <b>${esc(musicLabel())}</b> · <a href="#" data-music="open">change</a></div></div></div></section>`; }
function saveObjective(v){ const t=X.today; S.objective=v; persist(); if(!t||X.weekProblem) return;
  if((t.texto||'')===v) return; queue({key:'objective',now:true,steps:[{k:'post',url:'/api/semana',did:false,body:{dia:t.etiqueta,texto:v}}]}); t.texto=v; }
function start(){ const o=$('#obj'); const v=(o?o.value:objValue()).trim(); if(!v){ if(o){ o.focus(); o.placeholder='Write one line first'; } return; } saveObjective(v); S.started=true; S.f=null; render(); scrollTo({top:0,behavior:RM.matches?'auto':'smooth'}); homeAfter(); }
/* 2026-11-03 Pablo: in the morning Home opens on today's view first; once he starts, he lands on Home. */
let backHome=false;
function homeAfter(){ if(EMB&&backHome){ backHome=false; parent.postMessage({tipo:'jarvis-go',vista:'home'},location.origin); } }
function skipBtns(n){ return RUNLV.filter(m=>m!==n&&!S.closed[m]).map(m=>`<button class="b" data-goto="${m}">${m>n?'Skip to':'Back to'} ${short(m)} →<span class="kchip">${m}</span></button>`).join(''); }
/* 2026-10-21 — Pablo: "the bentley 'your classes' of level 3 should be a toggler on level 01 that should be always down".
   Always starts folded (his call); it never counts toward closing 01. */
let CLS_OPEN=false;
function clsFold(){ const g=openIds(X.grades||[]), ids=[...(X.grades||[]),...X.classes,...X.classesMore], open=openIds(ids); if(!open.length) return '';
  return `<section class="box clsfold"><div class="fold" data-clsfold data-k="clsfold"><span>Your classes · ${open.length}${g.length?' · '+plural(g.length,'grade')+' not an A':''}</span><span>${CLS_OPEN?'hide':'show'}</span></div>${CLS_OPEN?`<div class="rows">${rowsHtml(open)}</div>`:''}</section>`; }
function tierHtml(n){ const h=tierHtml_(n); return n===1?h+clsFold():h; }
function tierHtml_(n){
  const v=viewLv(), left=tierLeft(n), keys=tierKeys(n);
  if(n===0){ if(S.closed[0]) return `<section class="box tier closed" data-goto="0"><div class="legend up"><span class="n">${TNAME[0]}</span><span class="r">closed</span></div><div class="line"><span style="flex:1">Your week is closed</span><span class="mu up" style="font-size:10px">reopen</span></div></section>`;
             return `<section class="box tier skipped" data-goto="0"><div class="legend up"><span class="n">${TNAME[0]}</span><span class="r">skipped</span></div><div class="line"><span>${left} still open · your week isn't closed</span><span class="amb up" style="font-size:10px">open now</span></div></section>`; }
  if(S.closed[n]) return `<section class="box tier closed" data-goto="${n}"><div class="legend up"><span class="n">${TNAME[n]}</span><span class="r">closed</span></div><div class="line"><span style="flex:1">All done${keys.length?' · '+plural(keys.length,'group'):''}</span><span class="mu up" style="font-size:10px">reopen</span></div></section>`;
  if(n!==v){ const skipped=n<v; return `<section class="box tier ${skipped?'skipped':'future'}" data-goto="${n}"><div class="legend up"><span class="n">${TNAME[n]}</span><span class="r">${skipped?'skipped · '+left+' still open':'later'}</span></div><div class="line"><span>${keys.map(k=>esc(T[k].title)).join(' · ')||'Nothing today'}</span><span class="${skipped?'amb':'mu'} up" style="font-size:10px">open now · ${n}</span></div></section>`; }
  const ready=left===0;
  return `<section class="box tier active"><div class="legend up"><span class="n">${TNAME[n]}</span><span class="r">${n===3?'optional':'now'}</span></div>
    ${keys.length?`<div class="tiles">${keys.map(tileHtml).join('')}</div>`:'<div class="levelnote">Nothing waits here today.</div>'}
    ${lvBar(n)}<div class="closebar ${ready?'ready':''}" data-k="close:${n}"><span class="left">${ready?'✓ Everything here is handled':left+' still open'}</span>
    <span class="acts2">${skipBtns(n)}<button class="b ${ready?'big':''}" data-close="${n}">${ready?`Close ${short(n)}`:`Check ${short(n)}`}<span class="kchip" style="display:inline-block">⌘↵</span></button></span></div></section>`; }
function tileHtml(k){
  const t=T[k], done=tileDone(k), oc=openCount(t); let acts='', body='';
  if(t.db) acts+=`<button class="b link" data-panel="db-${t.db}">${t.db==='cold'?'The list ↗':'Database ↗'}<span class="kchip">D</span></button>`;
  if(t.people) acts+=`<button class="b link" data-panel="people">New people${openIds(X.newp).length?`<span class="badge">${openIds(X.newp).length}</span>`:''}<span class="kchip">N</span></button>`;
  if(k==='linkedin') acts+=`<a class="b link" target="_blank" rel="noopener" href="https://www.linkedin.com/feed/" data-tilekey="f">LinkedIn ↗<span class="kchip">F</span></a>`;
  if(t.kind==='panel') acts+=`<button class="b ok" data-panel="${t.panel}">Open ↗<span class="kchip">↵</span></button>`;
  if(t.kind==='inline') body = oc ? `<div class="rows">${rowsHtml(t.rows)}</div>` : `<div class="allok">✓ All handled</div>`;
  if(t.kind==='panel') body = done ? `<div class="allok">✓ All handled</div>` : summary(k);
  const fk = t.kind==='panel' ? `data-k="tile:${k}"` : '';
  const cz=`<span class="cz"><button data-czt="left" data-t="${k}" title="Move earlier">←</button><button data-czt="right" data-t="${k}" title="Move later">→</button><button data-czt="size" data-t="${k}" title="Half or full width">⇔</button></span>`;
  return `<div class="tile ${isWide(k)?'wide':''} ${done?'done':''}" style="--c:${C[t.o]}" ${fk}><div class="th"><div><div class="nm">${t.o}${cz}</div><h3>${esc(t.title)}${t.rate?`<span class="rate" title="${esc(t.rateFull)}">${esc(t.rate)}</span>`:''}${oc&&t.kind==='panel'&&!t.manualDone?`<span class="badge">${oc}</span>`:''}</h3></div><div class="acts">${acts}</div></div>${body}</div>`; }
function counts(list){ return `<div class="counts">${list.filter(([n])=>n>0).map(([n,l])=>`<span><b>${n}</b>${esc(l)}</span>`).join('')||'<span class="t2">Open it to review</span>'}</div>`; }
function summary(k){
  const t=T[k], o=ids=>openIds(ids).length;
  if(k==='prep'){ const ids=openIds(t.rows); return `<div class="sumlist">${ids.map(id=>`<div><span class="k">${esc(R[id].tag.split(' · ').slice(0,2).join(' · '))}</span><span>${inl(R[id].ti)}</span></div>`).join('')}</div>`; }
  if(k==='who') return counts([[o(t.rows),'speakers to name']]);
  if(k==='due') return counts([[o(t.rows),'due today or tomorrow']]);
  if(k==='cold') return counts([[o(t.replies),'replied'],[o(t.rows),'new messages'],[o(t.fups),'follow-ups']]);
  if(k==='warm') return counts([[o(t.rows),'people to write to'],[o(t.mapRows),'map proposals'],[o(X.newp),'new people'],[o(X.newg),'group suggestions']]);
  if(k==='commit') return counts(Object.entries(t.cols).map(([n,ids])=>[o(ids),n]));
  if(k==='week') return counts([[o(t.rows),'questions only you can answer']]);
  if(k==='toolbox'){ const a=t.rows.filter(id=>R[id]&&R[id].src&&R[id].src.trabajo==='taller'); return counts([[o(a),'from the Architect'],[o(t.rows.filter(id=>!a.includes(id))),'LinkedIn connect']]); }
  if(k==='events'){ const c=Object.values(t.cols); return counts([[o(c[0]),'to decide'],[o(c[1]),'calls to speak'],[upcoming().length,'upcoming']]); }
  if(k==='linkedin') return counts([[o(t.drafts),'drafts'],[o(t.comments),'comments'],[t.scheduled.length,'scheduled'],[o(t.asks),'questions']]);
  if(k==='thinking') return counts([[o(X.lesson),'lesson'],[o(X.coach),'coach'],[o(X.council),'council'],[o(X.books),'from your books'],[X.cards.filter(c=>!(S.cards[c.key]||{}).rated).length,'flashcards'],[X.episode&&o(X.digestRows)?1:0,'episode']]);
  return ''; }
function shutdown(){
  const H=Object.values(S.handled), ok=H.filter(h=>h.state==='ok');
  const sent=ok.filter(h=>h.tile==='cold'||(h.tile==='warm'&&h.col!=='map')).length;
  if(!S.confetti&&!RM.matches){ S.confetti=true; need('confetti').then(()=>setTimeout(()=>{ try{ confetti({particleCount:70,spread:62,origin:{y:.25},colors:['#5EE6B0','#FF8A3D','#D5DED9'],disableForReducedMotion:true}); }catch(_){} },150)).catch(()=>{}); }
  return `<section class="box shut"><div class="legend up" style="color:var(--mint)"><span>✓ Morning complete</span></div>
    ${RM.matches?'<div class="still">✓</div>':''}<h2>You're done, Pablo.<br>Close Exo.</h2>
    <div class="stats"><div><b>${ok.length}</b>approved</div><div><b>${sent}</b>messages sent</div><div><b>${H.length-ok.length}</b>dismissed or later</div></div>
    ${RM.matches||!H.length?'':'<div class="pileslot" id="pileSlot"><span class="hint2">this morning · drag them</span></div>'}<div class="sec">What you approved</div><div class="approved">${ok.slice(0,8).map(h=>`<div>${inl(h.ti)}</div>`).join('')||'<span class="empty">Nothing approved this morning.</span>'}</div>
    <p class="t2" style="font-size:12px;margin-top:14px">Your agents keep working. ${S.closed[3]?'':'Level 03 is below if you want it.'}</p></section>`; }
function runView(){
  const done=S.closed[1]&&S.closed[2];
  return `<main class="grid"><section class="col">${done?shutdown():''}${WK?tierHtml(0):''}${tierHtml(1)}${tierHtml(2)}${tierHtml(3)}</section>
  <aside class="col side"><section class="box"><div class="legend up"><span class="n">Today</span><button class="b link" data-edit style="padding:2px 1ch">Edit</button></div>
    ${keptHtml()}<div class="sec" style="margin-top:0">Your one thing</div><div class="one">${esc(objValue())}</div>${p1Html().replace(' style="margin-top:0"','')}<div class="sec">Day</div>${dayList()}${mailHtml()}</section></aside></main>`; }
function goto(n){
  n=+n; if(n===0){ delete S.closed[0]; S.skip0=false; S.f=null; return render(); }
  if(!S.started){ toast('Write your one thing first'); const o=$('#obj'); if(o) o.focus(); return; }
  if(WK&&!S.closed[0]) S.skip0=true;
  delete S.closed[n]; S.view=n; S.f=nextBox(n); render();
  setTimeout(()=>{ const a=document.querySelector('.tier.active'); if(a) a.scrollIntoView({behavior:RM.matches?'auto':'smooth',block:'start'}); },40); }

function closeLevel(n){
  if(n==null||!TIERS[n]) return;
  if(n===0){ if(tierLeft(0)>0) return pointAt(0); S.closed[0]=true; S.undo.push({type:'close',n:0}); S.f=nextBox(); render(); showFocus(); SFX.play('level'); return toast('Week closed',true); }
  if(tierLeft(n)>0) return pointAt(n);
  S.closed[n]=true; const u={type:'close',n}; S.undo.push(u); S.view=firstOpen(n+1); S.f=nextBox(S.view);
  const morning=S.closed[1]&&S.closed[2];
  if(morning&&(n===1||n===2)){ const op=queue({key:'manana',steps:[{k:'post',url:'/api/manana',body:{fecha:DAY,estado:'completa'}}]}); u.manana=op.did; const m=(D.mananas||[]).find(x=>x.fecha===DAY); if(m) m.estado='completa'; }
  else if(n===1){ const op=queue({key:'manana',steps:[{k:'post',url:'/api/manana',body:{fecha:DAY,estado:'urgente'}}]}); u.manana=op.did; const m=(D.mananas||[]).find(x=>x.fecha===DAY); if(m&&m.estado!=='completa') m.estado='urgente'; }   /* 2026-11-01: 01 alone counts, as "urgent done" */
  render(); toast(`${short(n)} closed`,true);
  SFX.play(morning&&!S.dayPlayed?'day':'level', EMB&&n===1); if(morning) S.dayPlayed=true;
  if(!RM.matches){ document.body.classList.remove('nudge'); void document.body.offsetWidth; document.body.classList.add('nudge'); setTimeout(()=>document.body.classList.remove('nudge'),300); }
  setTimeout(()=>{ const a=document.querySelector('.shut,.tier.active'); if(a) a.scrollIntoView({behavior:RM.matches?'auto':'smooth',block:'start'}); },60); }
/* 2026-10-21 — Pablo: "when I close a window or go to a next level or finish a window, automatically put the pointer to the
   next box". The first box of level n that still has something open; none left → that level's Close bar, so ↵ closes it. */
function openBoxes(n){ return tierKeys(n).flatMap(k=>T[k].manualDone?(S.manual[k]?[]:['tile:'+k]):openIds(tileRows(T[k])).map(id=>T[k].kind==='panel'?'tile:'+k:id)); }
function nextBox(n){ n=n??(weekFirst()?0:viewLv()); if(n==null) return null; return openBoxes(n)[0]||(n===0?null:'close:'+n); }
function stillOpen(f){ if(!f) return false; if(f.startsWith('tile:')){ const k=f.slice(5); return !!T[k]&&!tileDone(k); } return isOpen(f); }
function showFocus(){ setTimeout(()=>{ const el=S.f&&document.querySelector(`[data-k="${CSS.escape(S.f)}"]`); if(el&&!inView(el)) el.scrollIntoView({behavior:RM.matches?'auto':'smooth',block:'center'}); },80); }
function pointAt(n){
  const first=openBoxes(n)[0];
  S.f=first; applyFocus(); const el=first&&document.querySelector(`[data-k="${CSS.escape(first)}"]`); if(el){ el.scrollIntoView({behavior:RM.matches?'auto':'smooth',block:'center'}); el.classList.add('flash'); setTimeout(()=>el.classList.remove('flash'),900); }
  SFX.play('error'); toast(`${tierLeft(n)} still open in ${short(n)} · S to skip ahead`); }
function skipAhead(){ if(weekFirst()){ S.skip0=true; S.f=null; render(); return toast('Week close skipped · it waits at the top'); } const v=viewLv(); const nx=RUNLV.find(m=>m>v&&!S.closed[m]); if(nx!=null){ goto(nx); toast(`Skipped to ${short(nx)} · ${short(v)} waits`); } }

/* ───── flashcards: FSRS-4.5 in servidor.py; each card already carries `previa`, the days each grade brings it back ───── */
const SRS=[['otra-vez','Again',"didn't know it"],['dificil','Hard','struggled'],['bien','Good','got it'],['facil','Easy','obvious']];
const inDays=n=>n===1?'tomorrow':n===0?'today':'in '+n+' days';
function cardState(c){ return S.cards[c.key]||(S.cards[c.key]={}); }
/* cards are addressed by their own key, never their place in the list: a rated card leaves the server's list */
const cardBy=k=>X.cards.find(c=>c.key===k);
function fitBox(t){ t.style.height='auto'; t.style.height=t.scrollHeight+2+'px'; }
function fcBox(){ const cs=X.cards, c=cs.find(x=>!cardState(x).rated), left=cs.filter(x=>!cardState(x).rated).length;
  if(!cs.length) return `<div class="allok">✓ No cards due today${(D.aprendizaje||{}).proxima_tarjeta?' · the next one comes back '+esc(dayLabel(whenOf(D.aprendizaje.proxima_tarjeta))||D.aprendizaje.proxima_tarjeta):''}</div>`;
  if(!c) return `<div class="allok">✓ Done for today · ${cs.filter(x=>cardState(x).rated==='otra-vez').length} come back tomorrow</div>`;
  const k=esc(c.key), st=cardState(c), q=c.pregunta||c.titulo, a=c.respuesta||'', meta=`<div class="meta"><span>Card ${cs.length-left+1} of ${cs.length}${c.categoria?' · '+esc(c.categoria):''}</span><span>${(D.aprendizaje||{}).mazo_total||''} in your deck</span></div>`;
  const front=`<div class="fc face front">${meta}<div class="q">${inl(q)}</div>${st.checked?`<div class="note">You wrote: ${esc(st.mine||'—')}</div>`:`<form class="fcform" data-fc="${k}" style="display:grid;grid-template-columns:1fr auto;gap:6px"><textarea data-fcin="${k}" rows="1" placeholder="Your answer · ↵ to check · ⇧↵ new line">${esc(st.mine||'')}</textarea><button class="b" type="submit">Check<span class="kchip" style="display:inline-block">↵</span></button></form>`}</div>`;
  const back=`<div class="fc face back">${meta}<div class="q">${inl(q)}</div><div class="cmp"><div><small>You wrote</small>${esc(st.mine||'—')}</div><div class="right"><small>The answer</small>${inl(a)}</div></div>
    <div class="srs">${SRS.map(([g,l,h],j)=>`<button class="b ${g==='otra-vez'?'no':'ok'}" data-rate="${g}" data-card="${k}" ${st.checked?'':'tabindex="-1"'}>${l}<small>${h} · ${inDays((c.previa||{})[g]??1)}</small><span class="kchip">${j+1}</span></button>`).join('')}</div></div>`;
  return `<div class="fc3d ${st.checked&&!st.flipNow?'flipped':''} ${st.enterNow?'enter':''}" data-k="${k}" id="fc3d"><div class="fcin">${front}${back}</div></div>`; }
function fcAfter(){ const el=$('#fc3d'); if(!el) return; const c=cardBy(el.dataset.k); if(!c) return; const st=cardState(c);
  if(st.flipNow){ st.flipNow=false; void el.offsetWidth; el.classList.add('flipped'); } if(st.enterNow) st.enterNow=false; }
function checkCard(key,v){ const c=cardBy(key); if(!c) return; const st=cardState(c); if(st.checked) return; SFX.play('flip'); st.mine=v; st.checked=true; st.flipNow=!RM.matches; S.sf=c.key; renderSheet(); persist(); }
function rateCard(key,g){ const c=cardBy(key); if(!c) return; const st=cardState(c); if(st.rated||!st.checked) return; SFX.play(g==='otra-vez'?'again':'good');
  const op=queue({key:c.key,src:{t:'card',titulo:c.titulo,categoria:c.categoria||''},steps:[{k:'card',calidad:g}],ms:0,ti:c.titulo}); st.rated=g; st.ti=c.titulo; S.undo.push({type:'card',key:c.key,did:op.did});
  const nx=X.cards.find(x=>!cardState(x).rated); S.sf=nx?nx.key:null; if(nx) cardState(nx).enterNow=!RM.matches; renderSheet(); toast(`Comes back ${inDays((c.previa||{})[g]??1)}`,true);
  const f=nx&&document.querySelector(`[data-fcin="${CSS.escape(nx.key)}"]`); if(f) f.focus(); persist(); if(!nx) autoClose(); }

/* ───── a note from the brain, read inside Exo (the prep, a lesson's source, a database) ───── */
const NOTE_CACHE={};
function getNote(name){ if(NOTE_CACHE[name]) return Promise.resolve(NOTE_CACHE[name]); return fetch('/api/nota?nombre='+encodeURIComponent(name)).then(r=>r.json()).then(j=>{ if(j.error) throw new Error(j.error); NOTE_CACHE[name]=j; return j; }); }
let noteOpen=null;
function openNote(name){ noteOpen=name; openSheet('nota',true); getNote(name).then(()=>{ if(sheetOpen==='nota'&&noteOpen===name) renderSheet(); }).catch(e=>{ if(sheetOpen==='nota'){ $('#shBody').innerHTML=`<p class="cnote">${esc(e.message)}</p>`; } }); }

/* ───── the guided week close (2026-10-26) ─────
   Pablo: "I told you I wanted to do everything on the pannel … and you need to lead me through the process there".
   One screen per step: the report, each question (Yes / No when it asks for one), Current Focus written into Word by
   the server, then Finish, which files the answers on the Mac with no window (servidor.py `archivar_cierre`).
   An answer is saved as a `Pablo:` line the moment he presses Next; changing a saved one adds a correction line. */
const WZ={started:{}};
function wzRows(){ const ks=(T.week?T.week.rows:[]).filter(k=>R[k]&&!R[k].ghost&&R[k].src&&R[k].src.trabajo==='cierre'), id=k=>R[k].src.id||'';
  const sellos=ks.map(k=>(id(k).match(/^cierre-q-(\d{6})-/)||[])[1]).filter(Boolean).sort(), sello=sellos.pop()||'';
  return {sello, rep:ks.filter(k=>/^cierre-rep/.test(id(k))).sort((a,b)=>String(R[a].cuando).localeCompare(String(R[b].cuando))).pop()||null,
    qs:ks.filter(k=>new RegExp('^cierre-q-'+sello+'-\\d+$').test(id(k))&&R[k].state==='open'&&!/^\d+ · Your setup\b/i.test(R[k].ti)), file:ks.find(k=>id(k)==='cierre-q-'+sello+'-file')||null}; }
function wzSteps(){ const w=wzRows(), st=[]; if(w.rep) st.push({t:'report',k:w.rep}); w.qs.forEach(k=>st.push({t:'q',k})); st.push({t:'goals'}); st.push({t:'finish',k:w.file,sello:w.sello}); return st; }
/* 2026-11-01 — the close ends with next week's three goals (Pablo's week file had gone two weeks stale). They go to the
   Sunday draft (proxima.md, /api/semana {destino:'proxima'}); promover_proxima() makes it this week on Monday by itself. */
const wzGoalsNow=()=>((D.proxima&&D.proxima.objetivos)||[]).map(o=>o.texto);
function wzGoalsSave(){ const v=[0,1,2].map(i=>{ const t=document.querySelector(`[data-wzg="${i}"]`); return t?t.value.trim():''; }).filter(Boolean);
  if(!v.length) return Promise.resolve(true);
  if(JSON.stringify(v)===JSON.stringify(wzGoalsNow())){ delete S.drafts.__goals; persist(); return Promise.resolve(true); }
  return post('/api/semana/proxima/nueva',{}).then(()=>post('/api/semana',{destino:'proxima',objetivos:v})).then(({status,j})=>{
    if(status!==200){ toast(j.error||"Couldn't save next week's goals",false,true); return false; }
    D.proxima=Object.assign(D.proxima||{},{objetivos:v.map(texto=>({texto,hecho:false}))}); delete S.drafts.__goals; persist(); toast("Next week's goals saved · they start Monday",true); return true; })
    .catch(()=>{ toast("Couldn't reach Exo",false,true); return false; }); }
const wzSaid=k=>(R[k].comentarios||[]).map(c=>typeof c==='string'?c:(c&&c.texto)||'').filter(Boolean);
const wzYesNo=r=>/\{asks:yes-no\}/.test((r.src||{}).crudo||'')||/\b(Yes or no|Yes,? (has|have|to|keeps?|moves?|lets?)\b)/i.test(r.ti+' '+r.ctx);
const wzDraft=k=>(S.drafts[k]||{}).wz;
const wzId=x=>x.k||x.t, wzIdx=st=>Math.max(0,st.findIndex(x=>wzId(x)===S.wz));
function wzWeek(){ const w=wzRows(), r=w.rep&&R[w.rep], n=r&&(r.notes||[])[0]; return n?n[1]:''; }
function wzSection(txt,name){ const m=String(txt||'').split(/^##\s+/m).find(s=>s.toLowerCase().startsWith(name.toLowerCase())); return m?m.replace(/^[^\n]*\n/,''):''; }
/* ── the close's context (2026-11-01, Pablo through his week-close session): beside each reflection question, his week
   (calendar by day, tasks closed), 3–5 suggested answers he can tap into the box (written by `cierre`; drafted once here
   if missing), the week's recorded and not-recorded conversations, and his Claude sessions for the minutes. Read-only:
   only his own answer is saved. Data: /api/v3/cierre/semana (v3api.py semana_ctx). */
const WZC={sello:'',d:null,busy:false,t:null,abiertas:{}};
(function(){ const st=document.createElement('style'); st.textContent=`
.wz.wzwide{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:22px;max-width:none}
.wzside{border-left:1px solid var(--line,rgba(255,255,255,.1));padding-left:18px;max-height:70vh;overflow:auto;font-size:12px}
.wzday{margin:10px 0}.wzday b{display:block;font-size:11.5px;letter-spacing:.04em;margin-bottom:3px}
.wzday div{display:flex;gap:8px;line-height:1.35;padding:1px 0;color:var(--tx,#e8ecf4)}.wzday div span{flex:none;width:38px;opacity:.55;font-variant-numeric:tabular-nums}
.wzday div.own{opacity:.55}.wzday div.done{color:var(--mint,#5EE6B0)}
.wzsugs{display:flex;flex-direction:column;gap:6px;margin:12px 0}
.wzsug{text-align:left;white-space:normal;line-height:1.4;padding:8px 11px;font-size:13px;text-transform:none!important;letter-spacing:0!important;font-family:var(--sans,Inter,system-ui,sans-serif)!important;font-weight:400!important;height:auto!important}
.wzconv .b.link{text-transform:none!important;letter-spacing:0!important;font-family:var(--sans,Inter,system-ui,sans-serif)!important;font-weight:400!important;height:auto!important;padding:2px 0}
.wzlists{display:grid;gap:16px;margin:12px 0}.wzconv{padding:4px 0;font-size:13px;line-height:1.4}.wzconv.nr{opacity:.9}
.wzconv .b.link{text-align:left;white-space:normal;display:inline}
.wzsum{margin:6px 0 10px 12px;padding:8px 12px;border-left:2px solid var(--line,rgba(255,255,255,.15));font-size:12.5px}
.wztot{display:flex;gap:18px;margin:12px 0 6px}.wztot div{display:flex;flex-direction:column}.wztot b{font-size:26px;font-weight:500}.wztot span{font-size:11px;opacity:.6}
.wzses{display:grid;grid-template-columns:74px 92px 1fr 60px;gap:8px;align-items:baseline;font-size:12.5px;padding:4px 0;border-top:1px solid var(--line,rgba(255,255,255,.08))}
.wzses .tag{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;opacity:.8}.wzses .tag.fix{color:#FFB547}.wzses .tag.improve{color:#8FA8FF}.wzses .mins{text-align:right;font-variant-numeric:tabular-nums}
@media (max-width:900px){.wz.wzwide{grid-template-columns:1fr}.wzside{border-left:0;padding-left:0;max-height:none}.wzses{grid-template-columns:64px 1fr 52px}.wzses span:nth-child(2){display:none}}`; document.head.appendChild(st); })();
function wzCtx(){ const sello=wzRows().sello; if(!sello) return null;
  if(WZC.sello!==sello){ WZC.sello=sello; WZC.d=null; }
  if(!WZC.d&&!WZC.busy) wzCtxLoad(false);
  return WZC.d; }
function wzCtxLoad(gen){ WZC.busy=true; fetch('/api/v3/cierre/semana?sello='+WZC.sello+(gen?'&generar=1':''),{cache:'no-store'}).then(r=>r.json()).then(d=>{
    WZC.busy=false; if(!d||d.error) return; WZC.d=d;
    if(d.estado==='nada'&&!gen) return wzCtxLoad(true);
    if(d.estado==='corriendo'){ clearTimeout(WZC.t); WZC.t=setTimeout(()=>{ if(sheetOpen==='close') wzCtxLoad(false); },6000); }
    if(sheetOpen==='close') keepTyping(()=>renderSheet()); }).catch(()=>{ WZC.busy=false; }); }
const WZ_ROUT=/^(bañarme|shuttle|comer|desayuno|cena|cenar|dormir|gym|misa|metro|ba[nñ]arme)/i;
function wzSide(){ const d=WZC.d; if(!d) return `<aside class="wzside"><span class="loading">Reading your week…</span></aside>`;
  const fmt=x=>new Date(x+'T12:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  const days=d.agenda.map(day=>{ const ev=day.eventos.filter(e=>!WZ_ROUT.test(e.titulo)), ppl=ev.filter(e=>!/^(Vocación|Vida personal)$/.test(e.cal)), own=ev.filter(e=>/^(Vocación|Vida personal)$/.test(e.cal));
    const done=d.hechas.filter(h=>h.dia===day.dia);
    return `<div class="wzday"><b>${esc(fmt(day.dia))}</b>${[...ppl,...own].slice(0,7).map(e=>`<div class="${/^(Vocación|Vida personal)$/.test(e.cal)?'own':''}"><span>${esc(e.inicio||'')}</span>${esc(e.titulo.replace(/ with (Mr|Ms|Prof)\..*$/,''))}</div>`).join('')}${done.map(h=>`<div class="done"><span>✓</span>${esc(h.titulo.replace(/https?:\S+/g,'').slice(0,90))}</div>`).join('')}</div>`; }).join('');
  return `<aside class="wzside"><div class="mu up">Your week · calendar and what you closed</div>${days}<p class="mu" style="font-size:11px;margin-top:8px">Closed in Todoist means done or dropped.</p></aside>`; }
function wzSug(k){ const d=WZC.d, id=(R[k].src||{}).id||''; if(!d) return '';
  const xs=(d.sugerencias||{})[id]||[];
  if(!xs.length) return d.estado==='corriendo'?`<div class="wzsugs"><span class="mu">Drafting starting points from your week…</span></div>`:'';
  return `<div class="wzsugs"><span class="mu up">Starting points · tap one, then make it yours</span>${xs.map((x,i)=>`<button class="b wzsug" data-wz="sug:${i}">${inl(x)}</button>`).join('')}</div>`; }
function wzConvs(){ const d=WZC.d; if(!d) return '<span class="loading">Reading your recordings…</span>';
  const fmt=x=>new Date(x+'T12:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  const rec=d.juntas.map(j=>`<div class="wzconv"><button class="b link" data-wz="junta:${esc(j.id)}">${esc(fmt(j.dia))} · ${esc(j.hora)} — <b>${esc(j.titulo)}</b>${j.gente.length?` · <span class="mu">${esc(j.gente.slice(0,4).join(', '))}${j.gente.length>4?'…':''}</span>`:''}</button>${WZC.abiertas[j.id]?`<div class="md wzsum">${WZC.abiertas[j.id]===1?'<span class="loading">Opening…</span>':md(WZC.abiertas[j.id])}</div>`:''}</div>`).join('');
  const nr=((d.sugerencias||{})['no-grabadas']||[]);
  return `<div class="wzlists"><div><div class="mu up">Recorded this week · ${d.juntas.length}</div>${rec||'<p class="mu">No recordings this week.</p>'}</div>
    <div><div class="mu up">Possible important conversations not recorded</div>${nr.length?nr.map(x=>`<div class="wzconv nr">${inl(x)}</div>`).join(''):(d.estado==='corriendo'?'<p class="mu">Looking through your calendar, WhatsApp and mail…</p>':'<p class="mu">None found.</p>')}</div></div>`; }
function wzHtml(){
  const st=wzSteps(), i=wzIdx(st), s=st[i], n=st.length; S.wz=wzId(s);
  const bar=`<div class="wzbar"><span class="mu up">Step ${i+1} of ${n}</span><div class="wzprog"><i style="width:${Math.round(100*(i+1)/n)}%"></i></div><button class="b link" data-panel="week">See them as a list</button></div>`;
  const nav=(next,extra='')=>`<div class="wznav">${i>0?'<button class="b" data-wz="back">← Back</button>':'<span></span>'}<span class="acts2">${extra}<button class="b big" data-wz="next">${next}<span class="kchip" style="display:inline-block">⌘↵</span></button></span></div>`;
  if(s.t==='report'){ const r=R[s.k], n_=(r.notes||[])[0], doc=n_&&NOTE_CACHE[n_[1]];
    if(n_&&!doc) getNote(n_[1]).then(()=>{ if(sheetOpen==='close') renderSheet(); }).catch(()=>{});
    return `<div class="wz">${bar}<div class="mu up">Your week</div><h2>${inl(r.ti)}</h2><p class="t2">Read what happened first. Then I ask you, one question at a time.</p>
      <div class="md wzdoc">${doc?md(String(doc.texto).replace(/^#\s.*\n/,'')):'<span class="loading">Reading the report…</span>'}</div>${nav('Start the questions →')}</div>`; }
  if(s.t==='q'){ const r=R[s.k], parts=String(r.ti).split(' · '), sec=parts.slice(0,2).join(' · '), said=wzSaid(s.k), d=wzDraft(s.k), yn=wzYesNo(r);
    let field=parts.slice(2).join(' · ')||parts[1]||r.ti, ctx=r.ctx;
    const conv=/^\d+ · Your meetings/i.test(sec)&&/^(General|Important conversations)$/i.test(field), refl=/^[12]\b/.test(sec);
    if(conv){ field='Important conversations'; ctx='Which of these conversations mattered this week — and for each, what was agreed or left open?'; }
    if(refl||conv) wzCtx();
    const wn=/^1\b/.test(sec)?wzWeek():''; if(wn&&!NOTE_CACHE[wn]) getNote(wn).then(()=>{ if(sheetOpen==='close') renderSheet(); }).catch(()=>{});
    const week=wn&&NOTE_CACHE[wn]?wzSection(NOTE_CACHE[wn].texto,'What got done'):'';
    const ynv=(S.drafts[s.k]||{}).yn||'';
    const extra=conv?wzConvs():'';
    return `<div class="wz${refl?' wzwide':''}"><div class="wzmain">${bar}<div class="mu up">${esc(sec)}</div><h2>${inl(field)}</h2><p class="wzq">${inl(ctx)}</p>${extra}${refl?wzSug(s.k):''}
      ${yn?`<div class="wzyn"><button class="b ${ynv==='Yes'?'on':''}" data-wz="yes">Yes<span class="kchip" style="display:inline-block">⌥Y</span></button><button class="b ${ynv==='No'?'on':''}" data-wz="no">No<span class="kchip" style="display:inline-block">⌥N</span></button></div>`:''}
      ${said.length?`<div class="wzsaid"><span class="mu up">Already saved</span>${said.map(c=>`<div>✎ ${esc(c)}</div>`).join('')}</div>`:''}
      <textarea data-wzin="${esc(s.k)}" rows="${yn?3:6}" placeholder="${yn?'Anything to add (optional)':'Your answer'} · ⌘↵ saves and goes on${said.length?' · what you write here corrects the saved answer':''}">${esc(d!=null?d:'')}</textarea>
      ${nav('Save and next →',`<button class="b" data-wz="skip">Skip · back next Sunday</button>`)}
      ${week?`<details class="wzctx"${refl?'':' open'}><summary class="mu up">From your week</summary><div class="md">${md(week)}</div></details>`:''}</div>${refl?wzSide():''}</div>`; }
  if(s.t==='goals'){ const cur=(S.drafts.__goals&&S.drafts.__goals.some(Boolean)?S.drafts.__goals:wzGoalsNow());
    return `<div class="wz">${bar}<div class="mu up">Next week · ${esc((D.semana&&D.semana.titulo_proxima)||'')}</div><h2>Your three goals for the week</h2>
      <p class="wzq">Results, not tasks — what has to be true by next Sunday. They show on Today and in your run from Monday.</p>
      ${[0,1,2].map(i=>`<input class="wzg" data-wzg="${i}" value="${esc(cur[i]||'')}" placeholder="Goal ${i+1}" style="display:block;width:100%;margin:8px 0;padding:10px 12px;font:inherit;border-radius:10px;border:1px solid var(--line-2,#333);background:transparent;color:inherit">`).join('')}
      <p class="t2" style="margin-top:10px">Your Current Focus also changes on Sundays: <button class="b link" data-wz="focus">Rewrite it in Word ↗</button></p>
      ${nav('Save and finish →',`<button class="b" data-wz="skip">Skip for now</button>`)}</div>`; }
  const done=st.filter(x=>x.t==='q'&&wzSaid(x.k).length).length, qs=st.filter(x=>x.t==='q').length, left=st.filter(x=>x.t==='q'&&!wzSaid(x.k).length).map(x=>String(R[x.k].ti).split(' · ').slice(2).join(' · ')||R[x.k].ti);
  const started=WZ.started[s.sello];
  return `<div class="wz">${bar}<div class="mu up">Finish</div><h2>${started?'Filing your close.':'File your close.'}</h2>
    <p class="wzq">You answered ${done} of ${qs} questions.${left.length?` Skipped: ${left.map(esc).join(', ')} — they come back next Sunday.`:''}</p>
    <p class="t2">${started?'Claude is putting each answer where it belongs, on your Mac, with no window. It takes a few minutes; this screen updates when it is done.':'Filing puts each answer where it belongs in your brain. It runs on your Mac with no window. If you close this instead, the 3:00 run files your answers tomorrow morning.'}</p>
    ${nav(started?'Close →':'File my close →')}</div>`; }
function wzSave(k){ const t=document.querySelector(`[data-wzin="${CSS.escape(k)}"]`), d=S.drafts[k]||{}, txt=(t?t.value:(d.wz||'')).trim(), yn=d.yn||'';
  const ans=[yn,txt].filter(Boolean).join(' — '); if(!ans) return false;
  const said=wzSaid(k); if(said.length&&said[said.length-1]===ans) return true;
  comment(k,(said.length?'Correction — replaces my answer above: ':'')+ans,'Saved'); delete S.drafts[k]; return true; }
function wzGo(i){ const st=wzSteps(); S.wz=wzId(st[Math.max(0,Math.min(i,st.length-1))]); persist(); renderSheet(); const b=$('#shBody'); if(b) b.scrollTop=0; if(!TOUCH) setTimeout(()=>{ const t=$('#shBody [data-wzin]'); if(t){ t.focus(); t.setSelectionRange(t.value.length,t.value.length); } },40); }
function wzNext(skip){ const st=wzSteps(), i=wzIdx(st), s=st[i]; if(!s) return;
  if(s.t==='report'){ if(R[s.k]&&R[s.k].state==='open') act(s.k,'ok',{label:'Report read'}); return wzGo(i+1); }
  if(s.t==='q'){ if(!skip) wzSave(s.k); return wzGo(i+1); }
  if(s.t==='goals'){ const go=()=>{ wzGo(i+1); const f=st[i+1]; if(f&&f.t==='finish'&&f.sello&&!WZ.started[f.sello]) wzFile(f); };
    if(skip) return go(); return wzGoalsSave().then(ok=>{ if(ok) go(); }); }
  if(s.t==='finish'){ if(WZ.started[s.sello]||!s.sello) return closeSheet(); wzFile(s); } }
/* 2026-11-02 — Pablo: "why would I have to file my close, just do it yourself". Saving (or skipping) the goals files it. */
function wzFile(s){ if(WZ.started[s.sello]||wzFile.busy) return; wzFile.busy=true; setTimeout(()=>{ wzFile.busy=false; },15000);
    toast('Filing your close…',true); flushNow(); setTimeout(()=>post('/api/cierre/archivar',{sello:s.sello,fechas:(String((R[wzRows().rep]||{}).ti||'').match(/[A-Z][a-z]{2} \d{1,2}\s*[–-]\s*(?:[A-Z][a-z]{2} )?\d{1,2}/)||[''])[0]}).then(({status,j})=>{
      if(status!==200) return toast(j.error||"Couldn't start the filing",false,true);
      WZ.started[s.sello]=Date.now(); S.closed[0]=true; S.undo.push({type:'close',n:0}); persist(); SFX.play('level'); toast(j.estado==='ya'?'Week closed · already filing, a few minutes':'Week closed · filing on your Mac, a few minutes',true); render(); renderSheet(); wzWatch(s.sello); })
      .catch(()=>toast("Couldn't reach Exo",false,true)),1500); }
/* while the filing runs, re-read the files every 20 s; the close disappears from 00 when its rows are filed */
function wzWatch(sello){ let n=0; const t=setInterval(()=>{ n++; load(true); if(n>45||!wzRows().qs.length) clearInterval(t); },20000); }
function wzAct(c){ const st=wzSteps(), i=wzIdx(st), s=st[i];
  if(c.startsWith('sug:')&&s&&s.t==='q'){ const id=(R[s.k].src||{}).id||'', x=((WZC.d&&WZC.d.sugerencias)||{})[id]||[], v=String(x[+c.slice(4)]||'').replace(/\*\*/g,'');
    const t=document.querySelector(`[data-wzin="${CSS.escape(s.k)}"]`); if(!t||!v) return;
    t.value=t.value.trim()?t.value.trim()+'\n'+v:v; (S.drafts[s.k]||(S.drafts[s.k]={})).wz=t.value; persist(); t.focus(); t.setSelectionRange(t.value.length,t.value.length); return; }
  if(c.startsWith('junta:')){ const id=c.slice(6); if(WZC.abiertas[id]){ delete WZC.abiertas[id]; return keepTyping(()=>renderSheet()); }
    WZC.abiertas[id]=1; keepTyping(()=>renderSheet());
    fetch('/api/v3/junta?id='+encodeURIComponent(id),{cache:'no-store'}).then(r=>r.json()).then(j=>{ const t=String(j.texto||j.error||'');
      const m=t.match(/## Granola's summary\s*\n([\s\S]*?)(?=\n## (?!#)|$)/); WZC.abiertas[id]=(m?m[1]:t).slice(0,6000)||'No summary.'; if(sheetOpen==='close') keepTyping(()=>renderSheet()); })
      .catch(()=>{ WZC.abiertas[id]='Could not open it.'; renderSheet(); }); return; }
  if(c==='start'){ if(sheetOpen) closeSheet(); return openSheet('close',true); }
  if(c==='back') return wzGo(i-1);
  if(c==='focus') return openFocusWord();
  if(c==='skip') return wzNext(true);
  if(c==='next') return wzNext(false);
  if((c==='yes'||c==='no')&&s&&s.t==='q'){ const x=S.drafts[s.k]||(S.drafts[s.k]={}), v=c==='yes'?'Yes':'No'; x.yn=x.yn===v?'':v; persist(); renderSheet(); } }

/* ───── the side panel ───── */
let sheetOpen=null;
const SHEET={due:['Thinking','Due soon · Bentley'],cold:['People','Cold outreach'],warm:['People','Warm outreach'],who:['People','Who was who'],prep:['Commitments','Meeting prep'],commit:['Commitments','Promises and replies'],events:['People','Events'],people:['People','New people and new groups'],linkedin:['People','LinkedIn · this week'],
  thinking:['Thinking','Everything to learn today'],'db-cold':['People','Cold outreach · the list'],'db-warm':['People','Warm outreach · your database'],world:['Upkeep','Your agents'],nota:['Upkeep','Note'],week:['Upkeep','Questions only you can answer'],close:['Upkeep','Your week close · step by step'],toolbox:['Upkeep','Your AI toolbox']};
function tileFor(k){ const key=Object.keys(T).find(x=>T[x].panel===k); return key?document.querySelector(`.tile[data-k="tile:${key}"]`):null; }
function inView(el){ if(!el) return false; const r=el.getBoundingClientRect(); return r.bottom>0&&r.top<innerHeight&&r.width>0; }
const canVT=()=>!!document.startViewTransition && !RM.matches;
let curVT=null;
function syncSheet(){ const open=!!sheetOpen, sh=$('#sheet'); $('#veil').classList.toggle('show',open); sh.classList.toggle('show',open); document.body.classList.toggle('lock',open); }
function clearVTNames(){ $$('.tile,#sheet').forEach(e=>{ if(e.style.viewTransitionName) e.style.viewTransitionName=''; }); }
function runVT(update,after){ if(curVT){ try{ curVT.skipTransition(); }catch(_){} }
  let vt; try{ vt=document.startViewTransition(()=>{ update(); syncSheet(); }); }catch(_){ update(); syncSheet(); after&&after(); return; }
  curVT=vt; const done=()=>{ if(curVT===vt) curVT=null; clearVTNames(); syncSheet(); after&&after(); }; vt.finished.then(done,done); vt.ready.catch(()=>{}); vt.updateCallbackDone.catch(()=>{}); }
function openSheet(k,kb,from){ if(EMB&&k==='world'){ parent.postMessage({tipo:'jarvis-go',vista:'agents'},location.origin); return; }   /* 2026-11-01: one Agents view, in the app */
  if(sheetOpen===k&&k!=='nota') return; SFX.play('open');
  S.retF=sheetOpen?S.retF:S.f; sheetOpen=k; S.open=k; S.sf=null; S.editing=S.why=S.note=null; const sh=$('#sheet'), B=$('#shBody');
  if(k==='events'&&!REGS) loadRegs();
  B.scrollTop=0; renderSheet();
  const enter=()=>{ B.classList.add('entering'); setTimeout(()=>B.classList.remove('entering'),450); };
  from=from||(kb?null:tileFor(k));
  if(from&&inView(from)&&canVT()&&!sh.classList.contains('show')){ sh.classList.add('instant'); clearVTNames(); from.style.viewTransitionName='grow';
    runVT(()=>{ from.style.viewTransitionName=''; sh.style.viewTransitionName='grow'; enter(); }); }
  else { sh.classList.toggle('instant',!!kb||RM.matches); syncSheet(); enter(); }
  setTimeout(()=>{ if(sheetOpen===k&&!(S.editing||S.why||S.note)&&!/^(INPUT|TEXTAREA)$/.test((document.activeElement||{}).tagName||'')) $('#shClose').focus({preventScroll:true}); },30);
  persist(); }
function closeSheet(){
  if(!sheetOpen) return; const k=sheetOpen, sh=$('#sheet');
  /* 2026-10-17 — the keyboard stayed on the hidden "Close · Esc" button, so the next ↵ pressed it instead of opening the tile */
  const ae=document.activeElement; if(ae&&sh.contains(ae)) ae.blur();
  sheetOpen=null; S.open=null; S.editing=S.why=S.note=null; S.f=stillOpen(S.retF)?S.retF:nextBox(); S.autoClosed=null;
  if(k==='prep'&&sheetLeft('prep')===0){ const n=viewLv()??1; S.f=openBoxes(n).find(b=>b!=='tile:prep')||'close:'+n; }   /* today's preps done → the next block, not back on prep */
  const tile=tileFor(k);
  if(tile&&inView(tile)&&canVT()){ clearVTNames(); sh.style.viewTransitionName='grow';
    runVT(()=>{ sh.style.viewTransitionName=''; sh.classList.add('instant'); render(); const t2=tileFor(k); if(t2) t2.style.viewTransitionName='grow'; }); }
  else { sh.classList.remove('instant'); syncSheet(); render(); }
  showFocus(); persist(); }
let REGS=null;
function loadRegs(){ getNote('5 Sistema/platicas/registros').then(j=>{ const secs={}; let cur=null; String(j.texto||'').split('\n').forEach(l=>{ const m=l.match(/^##\s+(.*)/); if(m){ cur=m[1].trim().toLowerCase(); secs[cur]=[]; } else if(cur&&/^\s*-\s+/.test(l)) secs[cur].push(l.replace(/^\s*-\s+/,'')); });
    const one=l=>{ const p=parseRow(l), parts=p.ctx.split(' · '); return {d:parts[0]||'',t:p.ti,w:parts.slice(1).filter(x=>!/^\*\*/.test(x)).slice(0,2).join(' · '),st:(l.match(/\*\*(going|waitlisted|invited only|registered|applied|pending approval|pending)\*\*/i)||[])[1]||'',url:(p.links.find(x=>!/mail\.google/.test(x[1]))||p.links[0]||[])[1]||''}; };
    /* 2026-10-26 — Pablo: hide invited-only and cancelled rows from Upcoming (mass Luma invites read as registrations); they stay in the file */
    const up=(secs['upcoming']||[]).filter(l=>!/\*\*(invited only|cancelled)\*\*/i.test(l)).map(one), gone=up.filter(e=>{ const n=dayDiff(whenOf(e.d)); return n!=null&&n<0; });
    REGS={up:up.filter(e=>!gone.includes(e)),past:[...gone.reverse(),...(secs['past']||[]).map(one)]}; if(sheetOpen==='events') renderSheet(); if(!sheetOpen) render(); }).catch(()=>{ REGS={up:[],past:[],err:true}; }); }
function upcoming(){ const regs=(REGS&&REGS.up)||[]; return [...X.going,...regs]; }
function col(title,ids,extra='',top=''){ return `<section class="box"><div class="legend up"><span class="n">${esc(title)}</span><span class="r">${openIds(ids).length} open</span></div>${top}<div class="rows">${rowsHtml(ids)||(ids.length?'<div class="allok">✓ All handled</div>':'<div class="empty">Nothing today.</div>')}</div>${extra}</section>`; }
function chips(list){ return list.filter(([n])=>n!==0&&n!=='').map(([n,l])=>`<span class="chip"><b>${esc(n)}</b>${esc(l)}</span>`).join(''); }
function renderSheet(){
  const k=sheetOpen; if(!k) return; const [o,title]=SHEET[k]||['','']; const sh=$('#sheet'); sh.style.setProperty('--c', k==='world'?'var(--mint)':C[o]||'var(--amber)');
  $('#shKick').textContent=o; $('#shTitle').textContent=title;
  const B=$('#shBody'); B.classList.toggle('flush',k==='world'); let h='', ch=[]; const o_=ids=>openIds(ids).length;
  if(k==='prep'){ const ids=T.prep.rows; ch=[[o_(ids),'meetings in the next 3 days']];
    h=`<div class="split" style="--n:${Math.min(3,Math.max(1,ids.length))}">${ids.map(id=>col(R[id].tag||'Meeting',[id])).join('')}</div><p class="note" style="margin-top:18px">Keep = it shows at the top of Today's view and goes into that person's CRM note tomorrow morning. Later = it comes back on the meeting's day.</p>`; }
  if(k==='commit'){ const c=T.commit.cols; ch=Object.entries(c).map(([n,ids])=>[o_(ids),n]);
    h=`<div class="split" style="--n:3">${Object.entries(c).map(([n,ids])=>col(n,ids)).join('')}</div>`; }
  if(k==='cold'){ const C_=T.cold; ch=[[o_(C_.replies),'replied'],[o_(C_.rows),'new messages'],[o_(C_.fups),'follow-ups'],[C_.rate?C_.rateFull:'','']];
    h=`<div class="topbar"><button class="b link" data-panel="db-cold" data-skey="d">The list ↗<span class="kchip" style="display:inline-block">D</span></button>${OUTDONE()}</div>${C_.replies.length?`<div style="max-width:780px;margin-bottom:14px">${col('They replied · answer them',C_.replies)}</div>`:''}${C_.sem||C_.rows.length||C_.fups.length?`<div class="split">${col('New messages · this week’s batch',C_.rows)}${col('Follow-ups · no reply in the window',C_.fups)}</div><p class="note" style="margin-top:14px">Email: use Schedule send in Gmail for <b>Tuesday 8:00 a.m. their time</b>.</p>`:`<p class="note">Your outreach batch comes on Sunday. Midweek this only shows who replied.</p>`}`; }
  if(k==='warm'){ ch=[[o_(T.warm.rows),'people to write to'],[o_(T.warm.mapRows),'map proposals'],[o_(X.newp),'new people']];
    h=`<div class="topbar"><button class="b link" data-panel="db-warm" data-skey="d">Database ↗<span class="kchip" style="display:inline-block">D</span></button><button class="b link" data-panel="people" data-skey="n">New people${o_(X.newp)?`<span class="badge">${o_(X.newp)}</span>`:''}<span class="kchip" style="display:inline-block">N</span></button>${OUTDONE()}</div>${T.warm.sem||T.warm.rows.length?`<div class="split">${col('Write to them · this week’s batch',T.warm.rows)}${T.warm.mapRows.length?col('Map proposals',T.warm.mapRows):''}</div>`:`<p class="note">Your outreach batch comes on Sunday.</p>`}`; }
  /* 2026-10-21 — Pablo: "upkeep should also have a block that you click to open in like the rest" */
  if(k==='week'){ ch=[[o_(T.week.rows),'questions']]; h=`<div class="topbar"><button class="b big" data-wz="start">Answer them step by step →</button></div><div style="max-width:780px">${col('Your week close',T.week.rows)}</div>`; }
  if(k==='close'){ ch=[]; h=wzHtml(); }
  if(k==='toolbox'){ const tb=T.toolbox.rows, a=tb.filter(id=>R[id]&&R[id].src&&R[id].src.trabajo==='taller'), b=tb.filter(id=>!a.includes(id));
    ch=[[o_(a),'from the Architect'],[o_(b),'LinkedIn connect']]; h=`<div class="split" style="--n:${a.length&&b.length?2:1}">${a.length?col('The Architect',a):''}${b.length?col('LinkedIn connect',b):''}</div>`; }
  if(k==='due'){ ch=[[o_(T.due.rows),'due soon']]; h=`<div style="max-width:780px">${col('Due today or tomorrow',T.due.rows)}</div><p class="note" style="margin-top:14px">Anything due later is in Your classes, folded at the bottom of 01.</p>`; }
  if(k==='who'){ ch=[[o_(T.who.rows),'to name']]; h=`<div style="max-width:780px">${col('From Granola',T.who.rows)}</div><p class="note" style="margin-top:14px">Your answer goes under the row in Granola's "who is who" file; the jobs that read your meetings use it.</p>`; }
  if(k==='events'){ const c=Object.entries(T.events.cols), up=upcoming(), past=(REGS&&REGS.past)||[]; ch=[[o_(c[0][1]),'to decide'],[o_(c[1][1]),'calls to speak'],[up.length,'upcoming']];
    const upH=`<section class="box"><div class="legend up"><span class="n">Upcoming</span><span class="r">your registrations</span></div><div class="up-list">${up.map((e,i)=>`<div class="up-row"><div><div class="when">${esc(e.d)}${e.st?' · '+esc(e.st):''}</div><div>${inl(e.t)}</div><div class="mu">${inl(e.w||'')}</div></div>${e.url?`<a class="b go" href="${esc(e.url)}"${blank(e.url)}${i<9?` data-skey="${i+1}"`:''}>Open ↗${i<9?`<span class="kchip" style="display:inline-block">${i+1}</span>`:''}</a>`:''}</div>`).join('')||(REGS?'<div class="empty">Nothing registered yet.</div>':'<div class="loading">Reading your registrations…</div>')}</div>
      <div style="margin-top:12px"><a class="b link" href="#" data-nota="5 Sistema/platicas/registros" data-skey="o">Your registrations ↗<span class="kchip" style="display:inline-block">O</span></a></div></section>`;
    h=`<div class="split" style="--n:3">${col(c[0][0],c[0][1],foldHtml('ev-past',T.events.more,'Past dates you never answered'))}${col(c[1][0],c[1][1])}${upH}</div>
      ${past.length?`<div class="past" data-past><span>Past events · ${past.length}</span><span class="mu">${S.pastOpen?'hide':'show'}</span></div>${S.pastOpen?`<div class="past-list">${past.map(e=>`<div>${esc(e.d)} · ${inl(e.t)}${e.st?' · '+esc(e.st):''}</div>`).join('')}</div>`:''}`:''}`; }
  if(k==='people'){ ch=[[o_(X.newp),'people wait for your yes'],[o_(X.newg),'group suggestions'],[(D.grupos||[]).length,'groups']];
    const mine=(S.added||[]);
    const pform=`<form id="pform" class="addmine"><input id="pn" placeholder="Name" maxlength="80"><input id="pw" placeholder="Where you met · ↵ to add" maxlength="160"><button class="b ok" type="submit">Add mine<span class="kchip" style="display:inline-block">↵</span></button></form>${mine.filter(a=>a.list==='p').map(a=>`<div class="yours">✓ ${esc(a.ti)} · goes to your CRM tomorrow morning</div>`).join('')}`;
    const opts=(D.grupos||[]).filter(g=>g.estado==='activo').map(g=>`<option value="${esc(g.slug)}">${esc(g.nombre)}</option>`).join('');
    const gform=`<form id="gform" class="addmine g3"><input id="gp" placeholder="Person" maxlength="80"><select id="gg"><option value="">Group…</option>${opts}</select><button class="b ok" type="submit">Add mine<span class="kchip" style="display:inline-block">↵</span></button></form>
      <form id="nform" class="addmine g3"><input id="ng" placeholder="A new group" maxlength="60"><input id="nq" placeholder="Who belongs in it · ↵ to create" maxlength="200"><button class="b" type="submit">Create<span class="kchip" style="display:inline-block">↵</span></button></form>${mine.filter(a=>a.list!=='p').map(a=>`<div class="yours">✓ ${esc(a.ti)}</div>`).join('')}`;
    h=`<div style="display:flex;justify-content:flex-end;margin-bottom:16px"><a class="b link" href="#" data-nota="2 Areas/Personal CRM/PEOPLE-INDEX" data-skey="o">Your CRM ↗<span class="kchip" style="display:inline-block">O</span></a></div><div class="split">${col('New people',X.newp,'',pform)}${col('New groups',X.newg,'',gform)}</div>`; }
  if(k==='linkedin'){ const L=T.linkedin||{drafts:[],comments:[],asks:[],scheduled:[]}; ch=[[o_(L.drafts),'drafts'],[o_(L.comments),'comments'],[L.scheduled.length,'scheduled']];
    const tabs=[['drafts','Drafts','1',ch[0][0]],['comments','Comments','2',ch[1][0]],['scheduled','Scheduled','3',ch[2][0]]].map(([v,l,n,c])=>`<button class="b ${S.tab===v?'pressed':''}" data-tab="${v}" title="Press ${n}">${l}${c?` · ${c}`:''}<span class="kchip" style="display:inline-block">${n}</span></button>`).join('');
    const body= S.tab==='drafts'?col('Pick 3–5 to post',L.drafts,`<form id="liform" style="display:grid;grid-template-columns:1fr auto;gap:6px;margin-top:12px"><textarea id="lin" rows="3" placeholder="Add your own draft · ⌘↵ to add" style="min-height:0;resize:vertical"></textarea><button class="b" type="submit">Add<span class="kchip" style="display:inline-block">⌘↵</span></button></form>`)+(L.asks.length?col('The LinkedIn agent asks',L.asks):'')
      : S.tab==='comments' ? col('Posts you could comment on',L.comments)
      : `<section class="box"><div class="legend up"><span class="n">Scheduled</span></div>${L.scheduled.length?`<table><tr><th>When</th><th>Post</th><th></th></tr>${L.scheduled.map(s=>`<tr><td style="color:var(--c)">${esc(s.d.replace('T',' '))}</td><td>${esc(s.t)}</td><td class="mu">${s.booked?'booked in LinkedIn':'goes out with the next Mac run'}</td></tr>`).join('')}</table>`:'<div class="empty">Nothing scheduled yet.</div>'}</section>`;
    h=`<div class="tabs">${tabs}<a class="b link" id="lifeed" target="_blank" rel="noopener" href="https://www.linkedin.com/feed/">LinkedIn ↗<span class="kchip" style="display:inline-block">F</span></a>${T.linkedin&&T.linkedin.sem?`<button class="b big ok close-x" data-finish="linkedin">Done with LinkedIn this week<span class="kchip" style="display:inline-block">⌘↵</span></button>`:''}</div>${body}`; }
  if(k==='thinking'){ const ep=X.episode;
    ch=[[o_(X.lesson),'lesson'],[o_(X.coach),'coach'],[o_(X.council),'council'],[X.cards.filter(c=>!cardState(c).rated).length,'flashcards']];
    const sec=(t,ids,more,ml)=>(ids.length||(more&&openIds(more).length))?`<section class="box"><div class="legend up"><span class="n">${t}</span></div><div class="rows">${rowsHtml(ids)||'<div class="allok">✓ All handled</div>'}</div>${more?foldHtml(t,more,ml):''}</section>`:'';
    h=`<div class="think">
      ${sec('Lesson of the day',X.lesson,X.lessonMore,'Earlier lessons')}
      ${sec('Your council',X.council)}
      ${sec('How you communicated',X.coach,X.coachMore,'Earlier feedback')}
      ${sec('From your books',X.books)}
      ${X.cards.length||((D.aprendizaje||{}).mazo_total)?`<section class="box"><div class="legend up"><span class="n">Flashcards</span><span class="r">type, ↵, then rate · FSRS</span></div>${fcBox()}</section>`:''}
      ${ep||X.digestRows.length?`<section class="box"><div class="legend up"><span class="n">Newsletter</span></div>${ep?`<div style="display:flex;justify-content:space-between;align-items:center;gap:2ch;margin-bottom:8px"><div><div>${esc(ep.titulo)}</div><div class="note">${ep.minutos?ep.minutos+' min · ':''}on your podcast feed</div></div><a class="b ok" href="podcasts://">▶ Play</a></div>`:''}<div class="rows">${rowsHtml(X.digestRows)}</div></section>`:''}
    </div><div style="margin-top:8px;display:flex;justify-content:flex-end"><button class="b big ok" data-finish="thinking">Done thinking<span class="kchip" style="display:inline-block">⌘↵</span></button></div>`; }
  if(k==='db-cold'){ const t=NOTE_CACHE['5 Sistema/cracks/cola'];
    if(!t){ h='<p class="loading">Reading the list…</p>'; getNote('5 Sistema/cracks/cola').then(()=>{ if(sheetOpen==='db-cold') renderSheet(); }).catch(e=>{ if(sheetOpen==='db-cold') $('#shBody').innerHTML=`<p class="cnote">${esc(e.message)}</p>`; }); }
    else { const rows=String(t.texto).split('\n').filter(l=>/^\s*- \[.\]/.test(l)).map(l=>{ const m=l.match(/^\s*- \[(.)\]\s*(.*)$/), p=parseRow(m[2]); return [m[1],p.ti,p.ctx]; });
      const st={' ':['queued',''],'x':['served','m'],'-':['dropped','r']}; const n=c=>rows.filter(r=>r[0]===c).length;
      ch=[[n(' '),'in the queue'],[n('x'),'served'],[T.cold.rateFull,'']];
      h=`<input id="flt" placeholder="Filter by name or status · / to focus" style="margin-bottom:22px"><section class="box"><div class="legend up"><span class="n">The list the agent follows</span><span class="r">${rows.length} people</span></div><table id="tb"><tr><th>Status</th><th>Person</th><th>Note</th></tr>${rows.slice().reverse().map(r=>`<tr><td><span class="st ${(st[r[0]]||['',''])[1]}">${(st[r[0]]||[r[0]])[0]}</span></td><td>${inl(r[1])}</td><td class="t2">${inl(String(r[2]).slice(0,180))}</td></tr>`).join('')}</table></section>
        <div style="margin-top:12px"><a class="b link" href="#" data-nota="5 Sistema/cracks/cola" data-skey="o">Open the whole file ↗<span class="kchip" style="display:inline-block">O</span></a></div>`; } }
  if(k==='db-warm'){ const g=((D.mapa||{}).gente||[]).slice().sort((a,b)=>String(b.ultimo||'').localeCompare(String(a.ultimo||'')));
    ch=[[g.length,'people on your follow-up map'],[(D.mapa||{}).actualizado?'updated '+String(D.mapa.actualizado).replace('T',' '):'','']];
    h=`<input id="flt" placeholder="Filter by name or why · / to focus" style="margin-bottom:22px"><section class="box"><div class="legend up"><span class="n">Follow-up map</span><span class="r">from your Personal CRM</span></div><table id="tb"><tr><th>Person</th><th>Last conversation</th><th>Why</th></tr>${g.map(p=>`<tr><td>${esc(p.nombre)}</td><td class="t2">${esc(p.ultimo?dayLabel(whenOf(p.ultimo)):'—')}</td><td class="mu">${esc(p.porque||'')}</td></tr>`).join('')}</table></section>`; }
  if(k==='nota'){ const n=NOTE_CACHE[noteOpen]; $('#shTitle').textContent=n?n.nombre:'Reading…'; $('#shKick').textContent=n?n.ruta:'';
    h=n?`<div class="md" style="max-width:820px">${md(n.texto)}</div>${n.cortada?'<p class="cnote">The note is long; the rest is in Obsidian.</p>':''}<div style="margin-top:16px"><a class="b go" href="${esc(n.obsidian)}">Open in Obsidian ↗</a></div>`:'<p class="loading">Reading the note…</p>'; }
  if(k==='world'){ ch=[]; h=`<iframe src="../index.html" title="Your agents"></iframe>`; }
  $('#shChips').innerHTML=chips(ch);
  if(k==='world'&&B.querySelector('iframe')) return;
  const y=B.scrollTop; keepTyping(()=>{ B.innerHTML=h; }); B.scrollTop=y;
  const f=$('#flt'); if(f) f.oninput=()=>$$('#tb tr').forEach((tr,i)=>{ if(i) tr.style.display=tr.textContent.toLowerCase().includes(f.value.toLowerCase())?'':'none'; });
  bindForms(); $$('.fcform').forEach(f=>f.onsubmit=e=>{ e.preventDefault(); checkCard(f.dataset.fc, f.querySelector('[data-fcin]').value.trim()); }); $$('[data-fcin]').forEach(fitBox);
  applyFocus(); fcAfter();
  if(k==='prep'&&S.focusMtg){ S.sf=S.focusMtg; applyFocus(); const el=document.getElementById('row-'+cssId(S.focusMtg)); if(el) el.scrollIntoView({block:'nearest'}); S.focusMtg=null; }
  $$('[data-prepdoc]').forEach(d=>{ const n=d.dataset.prepdoc; if(!NOTE_CACHE[n]) getNote(n).then(()=>{ if(sheetOpen) renderSheet(); }).catch(e=>{ d.innerHTML=`<span class="cnote">${esc(e.message)}</span>`; }); });
}
function bindForms(){
  const g=$('#gform'); if(g) g.onsubmit=e=>{ e.preventDefault(); const p=$('#gp').value.trim(), gg=$('#gg').value; if(!p||!gg){ (p?$('#gg'):$('#gp')).focus(); return; }
    const gn=((D.grupos||[]).find(x=>x.slug===gg)||{}).nombre||gg; queue({key:'mio',now:true,ti:p,steps:[{k:'post',url:'/api/registro/mio',body:{nombre:p,grupo:gg}}]}); (S.added=S.added||[]).push({list:'g',ti:`${p} → ${gn} · on their profile tomorrow`}); toast(`Added: ${p} → ${gn}`); persist(); renderSheet(); };
  const nf=$('#nform'); if(nf) nf.onsubmit=e=>{ e.preventDefault(); const n=$('#ng').value.trim(), q=$('#nq').value.trim(); if(!n||!q){ (n?$('#nq'):$('#ng')).focus(); return; }
    queue({key:'grupo',now:true,ti:n,steps:[{k:'post',url:'/api/grupo/nuevo',body:{nombre:n,quien:q}}]}); (S.added=S.added||[]).push({list:'n',ti:`New group: ${n} · the agent proposes who goes in`}); toast(`Group created: ${n}`); persist(); renderSheet(); };
  const pf=$('#pform'); if(pf) pf.onsubmit=e=>{ e.preventDefault(); const n=$('#pn').value.trim(), w=$('#pw').value.trim(); if(!n){ $('#pn').focus(); return; } if(!w){ $('#pw').focus(); $('#pw').placeholder='Say where you met first'; return; }
    queue({key:'mio',now:true,ti:n,steps:[{k:'post',url:'/api/registro/mio',body:{nombre:n,donde:w}}]}); (S.added=S.added||[]).push({list:'p',ti:n}); toast(`${n} goes to your CRM tomorrow morning`); persist(); renderSheet(); };
  const lf=$('#liform'); if(lf) lf.onsubmit=e=>{ e.preventDefault(); addLiDraft(); };
}
function addLiDraft(){ const t=$('#lin'); const v=t?t.value.trim():''; if(v.length<20){ if(t){ t.focus(); t.placeholder='Write the post first — at least a sentence'; } return; }
  queue({key:'linuevo',now:true,ti:v.slice(0,40),steps:[{k:'post',url:'/api/linkedin/nuevo',body:{texto:v}}]}); t.value=''; toast('Your draft was added to the board'); }

/* ───── focus + keyboard ───── */
function scope(){ if(sheetOpen) return $('#shBody'); return document.querySelector('.tier.active')||document.querySelector('.start'); }
function focusables(){ const s=scope(); return s?[...s.querySelectorAll('[data-k]')]:[]; }
const FK=()=>sheetOpen?'sf':'f';
function applyFocus(){ $$('.focus').forEach(e=>e.classList.remove('focus')); const list=focusables(); if(!list.length) return;
  let el=list.find(e=>e.dataset.k===S[FK()]); if(!el){ el=list[0]; S[FK()]=el.dataset.k; } el.classList.add('focus'); }
function setF(el){ S[FK()]=el.dataset.k; applyFocus(); el.scrollIntoView({block:'nearest',behavior:RM.matches?'auto':'smooth'}); }
function move(d){ const list=focusables(); if(!list.length) return; let i=list.findIndex(e=>e.dataset.k===S[FK()]); i=Math.max(0,Math.min(list.length-1,i+d)); setF(list[i]); }
/* arrows: spatial — the nearest item in that direction, so columns and side-by-side tiles work.
   2026-10-16 — "off" is the gap between the two edges, not between centers: a half-width tile under a full-width one
   (Due soon · Bentley, under Meeting prep) used to lose to the full-width tile below it and got skipped. */
function spatial(dir){
  const list=focusables(); const cur=list.find(e=>e.dataset.k===S[FK()]); if(!cur){ if(list[0]) setF(list[0]); return; }
  const r=cur.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2; let best=null, bs=1e9;
  const gap=(a0,a1,b0,b1)=>Math.max(0,b0-a1,a0-b1);
  for(const e of list){ if(e===cur) continue; const q=e.getBoundingClientRect(), qx=q.left+q.width/2, qy=q.top+q.height/2; let ok=false, main=0, off=0, tie=0;
    if(dir==='right'){ ok=q.left>=r.right-6; main=q.left-r.right; off=gap(r.top,r.bottom,q.top,q.bottom); tie=Math.abs(qy-cy); }
    if(dir==='left'){ ok=q.right<=r.left+6; main=r.left-q.right; off=gap(r.top,r.bottom,q.top,q.bottom); tie=Math.abs(qy-cy); }
    if(dir==='down'){ ok=q.top>=r.bottom-6; main=q.top-r.bottom; off=gap(r.left,r.right,q.left,q.right); tie=Math.abs(qx-cx); }
    if(dir==='up'){ ok=q.bottom<=r.top+6; main=r.top-q.bottom; off=gap(r.left,r.right,q.left,q.right); tie=Math.abs(qx-cx); }
    if(!ok) continue; const sc=Math.max(0,main)+off*2+tie*.01; if(sc<bs){ bs=sc; best=e; } }
  if(best) setF(best); else if(dir==='down') move(1); else if(dir==='up') move(-1);
  else if(sheetOpen==='linkedin'){ const t=['drafts','comments','scheduled'], i=t.indexOf(S.tab); S.tab=t[(i+(dir==='right'?1:2))%3]; S.sf=null; renderSheet(); } }
const focused=()=>S[FK()];
function openBox(kind,key,sub){ S.editing=S.why=S.note=null; S.whyKind=sub||null; S[kind]=key; sheetOpen?renderSheet():render(); const sel={editing:`[data-msg="${CSS.escape(key)}"]`,why:`[data-whyin="${CSS.escape(key)}"]`,note:`[data-notein="${CSS.escape(key)}"]`}[kind]; const x=document.querySelector(sel); if(x){ x.focus(); try{ x.setSelectionRange(x.value.length,x.value.length); }catch(_){} } }
/* ✕ and Esc throw away what you typed in the box; a click outside only closes it and keeps your text */
function discardBox(){ const key=S.editing||S.why||S.note, d=S.drafts[key]; if(d){ if(S.editing) delete d.draft; if(S.why) delete d.why; if(S.note) delete d.note; } S.editing=S.why=S.note=null; sheetOpen?renderSheet():render(); persist(); }
function sendWhy(key){ const t=document.querySelector(`[data-whyin="${CSS.escape(key)}"]`); const v=t?t.value.trim():'', wl=S.whyKind==='later'; S.why=S.whyKind=null; if(!v) return act(key,wl?'later':'no'); act(key,wl?'laternote':'why',{why:v}); }
function saveNote(key){ const t=document.querySelector(`[data-notein="${CSS.escape(key)}"]`); const v=t?t.value.trim():''; S.note=null; if(S.drafts[key]) delete S.drafts[key].note; if(v) comment(key,v,'Saved under the row · the agent reads it'); sheetOpen?renderSheet():render(); }
function saveEdit(key){ const x=document.querySelector(`[data-msg="${CSS.escape(key)}"]`), r=R[key]; if(!r) return; const v=x?x.value:r.msg; const changed=v!==r.msg;
  if(r.lb==='lidraft') return act(key,'ok',{texto:v,editado:changed,label:changed?'Edited · marked scheduled':'Marked scheduled'});
  r.msg=v; act(key,'ok',{editado:changed,label:changed?'Edited and accepted':'Done'}); }
/* "I was two of them" (2026-10-16): Granola sometimes splits his voice in two labels. The answer is `A+C`. */
const WHO2={};
function voicesHtml(vs){ const top=[...vs].sort((a,b)=>b.parte-a.parte), main=new Set(top.slice(0,4).map(v=>v.l));
  const one=v=>`<div class="voice"><div class="vh"><b>Speaker ${v.l}</b> · ${v.parte}% of the words · ${v.turnos} turns</div>${v.says?`<div class="quote">"${esc(v.says.replace(/^"|"$/g,''))}"</div>`:''}${v.lineas.map(t=>`<div class="quote">"${esc(t)}"</div>`).join('')}</div>`;
  const rest=vs.filter(v=>!main.has(v.l));
  return `<div class="voices">${vs.filter(v=>main.has(v.l)).map(one).join('')}${rest.length?`<details><summary>${rest.length} more speaker${rest.length>1?'s':''}, who said little</summary>${rest.map(one).join('')}</details>`:''}</div>`; }
function who2(key,v){ if(!v){ if(WHO2[key]) delete WHO2[key]; else WHO2[key]=[]; } else { const a=WHO2[key]||(WHO2[key]=[]), i=a.indexOf(v); if(i<0) a.push(v); else a.splice(i,1); a.sort(); }
  sheetOpen?renderSheet():render(); }
function who2save(key){ const a=WHO2[key]||[]; if(a.length<2) return toast('Pick two or more speakers'); delete WHO2[key]; who(key,a.join('+')); }
function who(key,v){ if(!v) return; act(key,'who',{answer:v,label:v==="don't know"?"Don't know · noted":'Saved · '+v}); }

const PAL=[['Re-open Exo','',()=>reopenJarvis()],['Go to the start page','G H',()=>startPage()],['See your second brain','G B',()=>openBrain()],['Open the study room','G S',()=>{ location.href='estudio.html'; }],['Open Me — your time','G M',()=>{ location.href='../index.html'; }],['Play the Exo intro','',()=>playIntro(false)],['Intro sound: choose','',()=>{ startPage(); setTimeout(openMusic,80); }],
  ['See your agents','G A',()=>openSheet('world',true)],['Open meeting prep','G P',()=>openSheet('prep',true)],['Open who was who','G O',()=>openSheet('who',true)],['Open promises and replies','G R',()=>openSheet('commit',true)],['Open due soon · Bentley','',()=>{ if(T.due&&T.due.rows.length) openSheet('due',true); else toast('Nothing due today or tomorrow'); }],
  ['Open cold outreach','G C',()=>openSheet('cold',true)],['Open warm outreach','G W',()=>openSheet('warm',true)],['Open new people and groups','G N',()=>openSheet('people',true)],['Open LinkedIn','G L',()=>{ if(T.linkedin) openSheet('linkedin',true); else toast('LinkedIn comes on Fridays'); }],
  ['Open events','G E',()=>openSheet('events',true)],['Open your registrations','',()=>openNote('5 Sistema/platicas/registros')],['Open Thinking','G T',()=>openSheet('thinking',true)],['Review flashcards','G F',()=>{ openSheet('thinking',true); setTimeout(()=>{ const f=document.querySelector('[data-fcin]'); if(f){ f.scrollIntoView({block:'center'}); f.focus(); } },60); }],
  ['Open the cold outreach list','',()=>openSheet('db-cold',true)],['Open the warm outreach database','',()=>openSheet('db-warm',true)],['Open your CRM','',()=>openNote('2 Areas/Personal CRM/PEOPLE-INDEX')],
  ['Go to 01','1',()=>goto(1)],['Go to 02','2',()=>goto(2)],['Go to 03','3',()=>goto(3)],['Skip ahead to the next level','S',skipAhead],['Check or close this level','⌘↵',()=>{ const v=weekFirst()?0:viewLv(); if(v!=null) closeLevel(v); }],
  ["Edit today's view",'',()=>{ S.started=false; render(); }],['Customize: sizes and order','',()=>{ document.body.classList.add('customize'); render(); }],['Bigger text','',()=>{ LAY.zoom=Math.min(1.4,+(LAY.zoom+.1).toFixed(2)); saveLay(); }],['Smaller text','',()=>{ LAY.zoom=Math.max(.8,+(LAY.zoom-.1).toFixed(2)); saveLay(); }],
  ['Compact / roomy spacing','',()=>{ LAY.dense=!LAY.dense; saveLay(); }],['Reset layout','',()=>{ LAY={w:{},order:{},zoom:1,dense:false,sheet:'wide',sound:LAY.sound,bgfx:LAY.bgfx,musicType:LAY.musicType,musicName:LAY.musicName}; saveLay(); render(); }],['Sounds on or off','M',()=>setSound(LAY.sound===false)],['Close the panel','Esc',()=>sheetOpen&&closeSheet()],
  /* 2026-10-15 — every button has a command, named the way the button reads (Pablo: "include commands for the open
     'the list' 'database' and all buttons"). The ones below name the main buttons; `liveCmds()` adds every button
     visible right now, so nothing on screen is out of reach of ⌘K. */
  ['Start the run','⌘↵',()=>start()],['Start with intro','⇧⌘↵',()=>{ const b=$('#goIntro'); if(b) b.click(); else playIntro(false); }],
  ['The list · cold outreach','',()=>openSheet('db-cold',true)],['Database · warm outreach','',()=>openSheet('db-warm',true)],
  ['Your brain','G B',()=>openBrain()],['The study room','G S',()=>{ location.href='estudio.html'; }],['Me — your time','G M',()=>{ location.href='../index.html'; }],['New people','G N',()=>openSheet('people',true)],["Open this person's LinkedIn",'↵',()=>openFocusedLinkedIn()],['Choose the intro music','',()=>{ startPage(); setTimeout(openMusic,80); }],
  ['Start my week close','',()=>wzAct('start')],['Rewrite your Current Focus in Word','G U',()=>openFocusWord()],['Run this row in Claude','R',()=>rowKey_('r','Move to a row with a prompt first')],['Who they are','I',()=>rowKey_('i','Move to a person first')],['Read it · show or hide','V',()=>rowKey_('v','Move to a row you can read first')],['Copy the message','C',()=>rowKey_('c','Move to a row with a message first')],['Open the second link of this row','⇧↵',()=>{ const f=focused(), a=f&&document.querySelectorAll(`#row-${cssId(f)} a.b.go`)[1]; a?a.click():toast('This row has one link'); }],
  ['Open the source of this promise or reply','S',()=>rowKey_('s','Move to a promise or reply first')],
  ['Bentley: open this homework in Brightspace','B',()=>rowKey_('b','Move to a homework first')],
  ['LinkedIn: copy the post and open LinkedIn','O',()=>rowKey_('o','Move to a LinkedIn draft first')],['LinkedIn: copy the comment','C',()=>rowKey_('c','Move to a LinkedIn comment first')],
  ['LinkedIn: open the post, sketch or profile','↵',()=>{ const f=focused(), a=f&&document.querySelector(`#row-${cssId(f)} a.b.go`); a?a.click():toast('Move to a LinkedIn row first'); }],
  ['LinkedIn: open the feed','F',()=>{ window.open('https://www.linkedin.com/feed/','_blank','noopener'); }],
  ['LinkedIn: done for this week','⌘↵',()=>{ if(!T.linkedin||!T.linkedin.sem) return toast('LinkedIn comes on Fridays'); openSheet('linkedin',true); const b=$('.tabs [data-finish]'); if(b) b.click(); }],
  ['LinkedIn: add your own draft','',()=>{ liTab('drafts'); setTimeout(()=>{ const t=$('#lin'); if(t){ t.scrollIntoView({block:'center'}); t.focus(); } },60); }],
  ['LinkedIn: Drafts','',()=>liTab('drafts')],['LinkedIn: Comments','',()=>liTab('comments')],['LinkedIn: Scheduled','',()=>liTab('scheduled')],
  ['Skip to 02','',()=>goto(2)],['Skip to 03','',()=>goto(3)],
  ['Background motion on/off','',()=>{ LAY.bgfx=LAY.bgfx===false; saveLay(); BGFX.reset(); toast('Background motion '+(LAY.bgfx===false?'off':'on')); }],
  ['Undo the last action','Z',undo],['Read your files again','',()=>load().then(()=>toast('Up to date'))],['The old panel (for a week)','',()=>{ location.href='/viejo'; }],['Show keyboard shortcuts','?',()=>showHelp()]];
const CHORD={u:'focus',h:'home',b:'brain',s:'study',m:'me',a:'world',p:'prep',o:'who',r:'commit',c:'cold',w:'warm',n:'people',l:'linkedin',e:'events',t:'thinking',f:'flash'};
if(SUN) PAL.splice(20,0,['Go to 00 · week close','0',()=>goto(0)]);
function rowKey_(k,miss){ const f=focused(), b=f&&document.querySelector(`#row-${cssId(f)} [data-key="${k}"]`); b?b.click():toast(miss); }
function openFocusWord(){ if(!D.foco_docx) return toast('Your Current Focus file is not found'); location.href='ms-word:ofe|u|file://'+encodeURI(D.foco_docx); }
function liTab(v){ if(!T.linkedin) return toast('LinkedIn comes on Fridays'); openSheet('linkedin',true); S.tab=v; S.sf=null; renderSheet(); }
/* The buttons on screen right now, as commands: the focused row's as "This row: <label>", the rest by their own label
   when it is unique (two "Later" buttons in a list are the rows' — reach them with "This row"). */
function liveCmds(){
  const seen=new Set(PAL.map(p=>p[0].toLowerCase())), out=[];
  const label=e=>{ const c=e.cloneNode(true); c.querySelectorAll('.kchip,.k,kbd').forEach(x=>x.remove());
    const w=document.createTreeWalker(c,NodeFilter.SHOW_TEXT), parts=[]; while(w.nextNode()) parts.push(w.currentNode.nodeValue.trim());
    return (parts.filter(Boolean).join(' ')||e.title||e.getAttribute('aria-label')||'').replace(/[↗→]/g,'').replace(/\s+/g,' ').trim(); };
  const vis=e=>e.offsetParent!==null && !e.closest('#ovPal,#ovHelp');
  const names=[...seen];
  const add=(name,el,row)=>{ const k=name.toLowerCase(); if(!name||name.length>70||seen.has(k)) return;
    if(!row&&names.some(n=>k.includes(n)||n.includes(k))) return;   /* already a named command */
    seen.add(k); out.push([name,'',()=>el.click()]); };
  const row=document.querySelector('#sheet .row.focus')||document.querySelector('.row.focus');
  if(row) row.querySelectorAll('button,a[href]').forEach(e=>{ if(vis(e)) add('This row: '+label(e),e,true); });
  /* Other rows' buttons are left out: "Later" there is another row's — move to it and use "This row". */
  const els=[...document.querySelectorAll('button,a[href],[data-tab]')].filter(vis).filter(e=>!e.closest('.row')), n={};
  els.forEach(e=>{ const l=label(e); n[l]=(n[l]||0)+1; });
  els.forEach(e=>{ const l=label(e); if(n[l]===1) add(l,e); });
  return out;
}
let LIVE=[];
let palSel=0;
function showPal(){ LIVE=liveCmds(); $('#ovPal').classList.add('show'); const i=$('#palIn'); i.value=''; palSel=0; drawPal(); if(!TOUCH) setTimeout(()=>i.focus(),10); else $('#palList').scrollTop=0; }
function hidePal(){ $('#ovPal').classList.remove('show'); }
function palItems(){ const q=$('#palIn').value.toLowerCase(); return PAL.concat(LIVE).filter(p=>q.split(' ').every(w=>p[0].toLowerCase().includes(w))); }
function drawPal(){ const it=palItems(); palSel=Math.min(palSel,Math.max(0,it.length-1)); $('#palList').innerHTML=it.map((p,i)=>`<div class="it ${i===palSel?'on':''}" data-pal="${i}"><span>${esc(p[0])}</span>${p[1]?`<span class="kchip">${esc(p[1])}</span>`:''}</div>`).join('')||'<div class="it mu">No command</div>'; const on=$('#palList .on'); if(on) on.scrollIntoView({block:'nearest'}); }
$('#palIn').oninput=()=>{ palSel=0; drawPal(); };
$('#palIn').onkeydown=e=>{ const it=palItems(); if(e.key==='ArrowDown'){ palSel=Math.min(palSel+1,it.length-1); drawPal(); e.preventDefault(); } if(e.key==='ArrowUp'){ palSel=Math.max(palSel-1,0); drawPal(); e.preventDefault(); } if(e.key==='Enter'&&it[palSel]){ e.preventDefault(); hidePal(); it[palSel][2](); } if(e.key==='Escape'){ e.stopPropagation(); hidePal(); } };
$('#palList').onclick=e=>{ const el=e.target.closest('[data-pal]'); if(!el) return; const it=palItems()[+el.dataset.pal]; hidePal(); it&&it[2](); };
const KEYS=[['M','Sounds on or off'],['⇧⌘↵ on Today','Start with the intro'],['G then B','Your second brain'],['G then H','Back to the start page'],['G then A E L T C W P O R N F','Jump: agents, events, LinkedIn, thinking, cold, warm, prep, who, replies, new people, flashcards'],['↑ ↓ ← →','Move, also across columns'],['J / K','Next / previous (K keeps a meeting prep)'],['A','Accept · done'],['X','Dismiss · not useful · on a draft: no, this is why'],['L','Later · on cold outreach it asks what the message should be about'],['E','Edit the draft'],['B','Bentley homework: open it in Brightspace'],['O · C','LinkedIn: copy the post and open LinkedIn · copy the comment'],['F','In LinkedIn: open the feed'],['S','Promise or reply: open its source'],['R · I · V · C','On a row: run it in Claude · who they are · read it · copy the message'],['↵ · ⇧↵','On a row: its first link · its second link'],['1–9 in Events','Open an upcoming registration'],['Y on a prep',"I won't go"],['D · N · O','The list or database · new people · the whole file (CRM, registrations)'],['G then U','Rewrite your Current Focus in Word'],['P','Their LinkedIn profile'],['U · N','Not sure · note'],['↵','Open the panel or link'],
  ['⌘↵','Finish: start the run, save, close the level'],['S','Skip to the next level'],['1 2 3','Go to a level · in LinkedIn: tabs · in Who was who: pick'],['↵ on a flashcard','Type your answer, ↵ checks, 1–4 rate'],['/','Filter a list'],['Z · ⌘Z','Undo'],['⌘K','Commands'],['Esc','Cancel, leave a box, close']];
function showHelp(){ $('#helpGrid').innerHTML=KEYS.map(([k,l])=>`<div><span>${esc(l)}</span><span class="kchip">${esc(k)}</span></div>`).join(''); $('#ovHelp').classList.add('show'); }
$('#ovPal').onclick=e=>{ if(e.target.id==='ovPal') hidePal(); }; $('#ovHelp').onclick=()=>$('#ovHelp').classList.remove('show');
function setSound(v){ LAY.sound=v; saveLay(); const b=$('#snd'); if(b) b.textContent=v?'♪ on':'♪ off'; if(v) SFX.play('toggle'); toast('Sounds '+(v?'on':'off')+' · M'); }

function cmdEnter(e){
  const t=e.target, d=t.dataset||{};
  if(sheetOpen==='close') return wzNext(false);
  if(t.id==='obj') return e.shiftKey?startIntro():start();
  if(d.msg) return saveEdit(d.msg);
  if(d.whoin){ const v=t.value.trim(); if(v) who(d.whoin,v); return; }
  if(['pn','pw','gp','gg','ng','nq'].includes(t.id)){ t.form&&t.form.requestSubmit(); return; }
  if(t.id==='lin') return addLiDraft();
  if(d.whyin) return sendWhy(d.whyin);
  if(d.notein) return saveNote(d.notein);
  if(d.fcin) return checkCard(d.fcin,t.value.trim());
  if(sheetOpen){ const fin=$('#shBody [data-finish]')||$('.tabs [data-finish]'); if(fin) return fin.click(); return closeSheet(); }
  if(!S.started&&!weekFirst()) return e.shiftKey?startIntro():start();
  const v=weekFirst()?0:viewLv(); if(v==null) return toast('Morning complete · nothing left to close'); closeLevel(v); }
addEventListener('keydown',e=>{
  if(e.isComposing||e.keyCode===229) return;
  if(window.JarvisHUD&&JarvisHUD.isOpen) return;   /* the HUD owns the keyboard while it is open */
  const meta=e.metaKey||e.ctrlKey, k=(e.key||'').toLowerCase(), t=e.target, tag=(t.tagName||'').toLowerCase(), typing=tag==='input'||tag==='textarea'||tag==='select'||!!t.isContentEditable;
  if(!meta&&(tag==='button'||tag==='a')&&(e.key==='Enter'||e.key===' ')&&t.matches(':focus-visible')&&t.getClientRects().length&&!(t.closest('#sheet')&&!sheetOpen)) return; /* the focused button or link does its own click, once — only if he can see it */
  if($('#ovHelp').classList.contains('show')&&e.key!=='Escape'&&!typing){ $('#ovHelp').classList.remove('show'); return; }
  if(meta&&k==='k'){ e.preventDefault(); $('#ovPal').classList.contains('show')?hidePal():showPal(); return; }
  if(e.key==='Escape'&&$('#ovPal').classList.contains('show')){ e.preventDefault(); hidePal(); return; }
  if($('#ovPal').classList.contains('show')) return;
  if(meta&&e.key==='Enter'){ e.preventDefault(); return cmdEnter(e); }
  if(sheetOpen==='close'&&e.altKey&&(e.code==='KeyY'||e.code==='KeyN')){ e.preventDefault(); return wzAct(e.code==='KeyY'?'yes':'no'); }
  if(meta&&k==='z'&&!typing){ e.preventDefault(); return undo(); }
  if(e.key==='Escape'){ if($('#ovHelp').classList.contains('show')) return $('#ovHelp').classList.remove('show');
    if(S.editing||S.why||S.note){ discardBox(); return; } if(typing){ t.blur(); return; } if(sheetOpen) return closeSheet(); if(document.body.classList.contains('customize')){ document.body.classList.remove('customize'); return render(); } return; }
  if(typing&&e.key==='Enter'&&!e.shiftKey&&t.dataset.fcin){ e.preventDefault(); if(t.form) t.form.requestSubmit(); return; }
  if(typing){ if(e.key==='Enter'&&!e.shiftKey&&tag==='input'){ const d=t.dataset;
      if(d.whoin){ e.preventDefault(); const v=t.value.trim(); if(v) who(d.whoin,v); } else if(d.notein){ e.preventDefault(); saveNote(d.notein); } else if(d.whyin){ e.preventDefault(); sendWhy(d.whyin); } }
    return; }
  if(meta||e.altKey) return;
  if(S.g){ S.g=false; $('#chord').classList.remove('show'); const c=CHORD[k]; if(c){ e.preventDefault(); if(c==='flash') return PAL.find(p=>p[1]==='G F')[2](); if(c==='study'){ location.href='estudio.html'; return; } if(c==='me'){ location.href='../index.html'; return; } if(c==='focus') return openFocusWord(); if(c==='brain'){ if(sheetOpen) closeSheet(); return openBrain(); } if(c==='home') return startPage(); if(c==='linkedin'&&!T.linkedin) return toast('LinkedIn comes on Fridays'); if(sheetOpen) closeSheet(); return openSheet(c,true); } return; }
  if(k==='m') return setSound(LAY.sound===false);
  if(k==='g'){ S.g=true; $('#chord').classList.add('show'); setTimeout(()=>{ S.g=false; $('#chord').classList.remove('show'); },1500); return; }
  const f=focused();
  if(e.key==='ArrowDown'){ e.preventDefault(); return spatial('down'); } if(e.key==='ArrowUp'){ e.preventDefault(); return spatial('up'); }
  if(e.key==='ArrowRight'){ e.preventDefault(); return spatial('right'); } if(e.key==='ArrowLeft'){ e.preventDefault(); return spatial('left'); }
  if(k==='j') return move(1);
  if(k==='z') return undo();
  if(e.key==='?') return showHelp();
  if(e.key==='/'){ const fl=$('#flt'); if(fl){ e.preventDefault(); fl.focus(); } return; }
  const fr=f&&R[f];
  if(fr&&fr.lb==='who'&&/^[1-9]$/.test(e.key)&&fr.opts[+e.key-1]){ const v=fr.opts[+e.key-1][1]; return WHO2[f]?(/^[A-Z]$/.test(v)&&who2(f,v)):who(f,v); }
  if(sheetOpen&&(/^[a-z]$/.test(k)||(sheetOpen==='events'&&/^[1-9]$/.test(k)))){ const sb=[...document.querySelectorAll(`#sheet [data-skey="${k}"]`)].find(x=>x.offsetParent!==null), own=f&&document.querySelector(`#row-${cssId(f)} [data-key="${k}"]`), rowLb=fr&&LB[fr.lb]||{};
    if(sb&&!own&&!(k==='n'&&rowLb.note)){ e.preventDefault(); sb.click(); return; } }
  if(sheetOpen==='linkedin'&&k==='f'){ const a=$('#lifeed'); if(a) a.click(); return; }
  if(sheetOpen==='linkedin'&&['1','2','3'].includes(e.key)){ S.tab=['drafts','comments','scheduled'][+e.key-1]; S.sf=null; return renderSheet(); }
  if(!sheetOpen&&['0','1','2','3'].includes(e.key)){ if(e.key==='0'&&!WK) return; return goto(+e.key); }
  if(!sheetOpen&&k==='s') return skipAhead();
  if(!f) return;
  if(k==='k'&&!(fr&&LB[fr.lb]&&LB[fr.lb].keep)) return move(-1);
  if(f.startsWith('tile:')){ if(e.key==='Enter'||k==='a'){ e.preventDefault(); openSheet(T[f.slice(5)].panel,true); return; }
    /* 2026-10-19 — the tile's other buttons: D the list / database, N new people, F LinkedIn */
    const tb=document.querySelector(`[data-k="${CSS.escape(f)}"] ${k==='d'?'[data-panel^="db-"]':k==='n'?'[data-panel="people"]':k==='f'?'[data-tilekey="f"]':'x-none'}`);
    if(tb){ e.preventDefault(); tb.click(); } return; }
  if(f==='clsfold'){ if(e.key==='Enter'){ e.preventDefault(); CLS_OPEN=!CLS_OPEN; render(); } return; }
  if(f.startsWith('close:')){ if(e.key==='Enter'){ e.preventDefault(); closeLevel(+f.slice(6)); } return; }
  if(f.startsWith('card:')){ const c=cardBy(f); if(!c) return; const st=cardState(c); if(st.checked){ const g={'1':'otra-vez','2':'dificil','3':'bien','4':'facil'}[e.key]; if(g){ e.preventDefault(); rateCard(c.key,g); } } else if(e.key===' '||e.key==='Enter'){ e.preventDefault(); const x=document.querySelector(`[data-fcin="${CSS.escape(c.key)}"]`); if(x) x.focus(); } return; }
  if(fr&&fr.state==='open'&&!fr.static){ const lb=LB[fr.lb]||{};
    if(fr.lb==='who'){ if(k==='t'&&!fr.other) who2(f,''); else if(WHO2[f]&&e.key==='Enter'){ e.preventDefault(); who2save(f); } else if(k==='x') who(f,"don't know"); else if(e.key==='Enter'||k==='a'){ e.preventDefault(); const i=document.querySelector(`#row-${cssId(f)} [data-whoin]`); if(i) i.focus(); else toast('Pick one with 1–'+fr.opts.length); } return; }
    if(e.key==='Enter'&&e.shiftKey){ const a2=document.querySelector(`#row-${cssId(f)} [data-enter="2"]`); if(a2){ e.preventDefault(); a2.click(); } return; }
    const kb=['b','o','c','r','i','v','f','s','p','w'].includes(k)&&document.querySelector(`#row-${cssId(f)} [data-key="${k}"]`);
    if(kb){ e.preventDefault(); kb.click(); }
    else if(k==='a') act(f,'ok');
    else if(k==='x'){ if(lb.rev){ e.preventDefault(); openBox('why',f); } else if(lb.no) act(f,'no'); else if(fr.salida==='later'&&fr.src.id) act(f,'later'); }
    else if(k==='l'&&fr.salida==='later'&&fr.src&&fr.src.id&&!lb.nolater){ if(lb.laterNote){ e.preventDefault(); openBox('why',f,'later'); } else act(f,'later'); }
    else if(k==='k'&&lb.keep) act(f,'keep',{label:fr.tile==='prep'?"Kept · it's at the top of Today's view":'Kept'});
    else if(k==='u'&&lb.unsure) act(f,'unsure');
    else if(k==='y'&&lb.skip) act(f,'skip');
    else if(k==='n'&&lb.note){ e.preventDefault(); openBox('note',f); }
    else if(k==='e'&&lb.rev&&fr.msg){ e.preventDefault(); openBox('editing',f); }
    else if(k==='w'&&lb.rev){ e.preventDefault(); openBox('why',f); }
    else if(e.key==='Enter'){ const a=document.querySelector(`#row-${cssId(f)} [data-enter="1"]`)||document.querySelector(`#row-${cssId(f)} a.b.go`); if(a){ e.preventDefault(); a.click(); } else if(fr.prepNote){ S.exp[f]=!S.exp[f]; sheetOpen?renderSheet():render(); } else if(fr.body){ S.exp[f]=!S.exp[f]; renderSheet(); } }
  } });
document.addEventListener('input',e=>{ const t=e.target, d=t.dataset||{};
  if(t.id==='obj'){ S.objective=t.value; }
  else { const key=d.msg||d.whyin||d.notein||d.whoin; if(key){ const x=S.drafts[key]||(S.drafts[key]={}); x[d.msg?'draft':d.whyin?'why':d.notein?'note':'who']=t.value; }
    else if(d.wzin!=null){ (S.drafts[d.wzin]||(S.drafts[d.wzin]={})).wz=t.value; }
    else if(d.wzg!=null){ const g=[0,1,2].map(i=>{ const x=document.querySelector(`[data-wzg="${i}"]`); return x?x.value:''; }); S.drafts.__goals=g; }
    else if(d.fcin&&cardBy(d.fcin)){ cardState(cardBy(d.fcin)).mine=t.value; fitBox(t); } }
  persist(); });
document.addEventListener('focusout',e=>{ if(e.target.id==='obj'&&S.started===false){ const v=e.target.value.trim(); if(v&&X.today&&v!==(X.today.texto||'')) clearTimeout(objT), objT=setTimeout(()=>saveObjective(v),1500); } });
let objT=null;
document.addEventListener('click',e=>{ const b=e.target.closest('button[data-td]'); if(!b||b.disabled) return; e.stopPropagation();
  const id=b.dataset.td, undo=b.closest('.done')!=null; b.disabled=true;
  post(undo?'/api/todoist/reabrir':'/api/todoist/cerrar',{id}).then(({status,j})=>{ if(status!==200){ b.disabled=false; return toast(j.error||(undo?"Couldn't reopen it in Todoist":"Couldn't close it in Todoist"),false,true); }
    toast(undo?'Back on your list in Todoist':'Closed in Todoist · click again to reopen'); load(); }).catch(()=>{ b.disabled=false; toast("Couldn't reach Exo",false,true); }); },true);
document.addEventListener('click',e=>{
  const nota=e.target.closest('[data-nota]'); if(nota){ e.preventDefault(); return openNote(nota.dataset.nota); }
  if(S.editing||S.why||S.note){ const open=S.editing||S.why||S.note; if(!e.target.closest('#row-'+cssId(open))){ S.editing=S.why=S.note=null; sheetOpen?renderSheet():render(); } }
  const el=e.target.closest('[data-snd],[data-music],[data-home],[data-brain],[data-act],[data-panel],[data-tab],[data-finish],[data-edit],[data-close],[data-goto],[data-skip0],[data-rate],[data-past],[data-fold],[data-czt],[data-cz],[data-wz],[data-go],[data-gointro],[data-k]'); if(!el) return;
  if(el.tagName==='A'&&el.getAttribute('href')==='#') e.preventDefault();
  const d=el.dataset;
  if(d.clsfold!=null){ CLS_OPEN=!CLS_OPEN; S.f='clsfold'; return render(); }
  if(d.wz) return wzAct(d.wz);
  if(d.act){ const key=d.id, r=R[key]; if(!r&&d.act!=='cancel') return;
    if(d.act==='ok'||d.act==='no'||d.act==='later') act(key,d.act);
    else if(d.act==='keep') act(key,'keep',{label:r.tile==='prep'?"Kept · it's at the top of Today's view":'Kept'});
    else if(d.act==='who') who(key,d.v);
    else if(d.act==='who2') who2(key,d.v);
    else if(d.act==='who2save') who2save(key);
    else if(d.act==='unsure') act(key,'unsure');
    else if(d.act==='skip') act(key,'skip');
    else if(d.act==='note') openBox('note',key);
    else if(d.act==='notesave') saveNote(key);
    else if(d.act==='liopen'){ const txt=(S.drafts[key]&&S.drafts[key].draft)||r.msg; try{ navigator.clipboard.writeText(txt).catch(()=>{}); }catch(_){}
      window.open('https://www.linkedin.com/feed/?shareActive=true&text='+encodeURIComponent(txt),'_blank','noopener'); toast('Copied · LinkedIn opens with the post written'+(r.sug?' · best time '+liWhen(r.sug):'')); }
    else if(d.act==='copy'){ const txt=(S.drafts[key]&&S.drafts[key].draft)||r.msg; const ok=()=>toast('Copied'), no=()=>toast('Could not copy · select the text instead'); try{ navigator.clipboard.writeText(txt).then(ok,no); }catch(_){ no(); } }
    else if(d.act==='edit') openBox('editing',key);
    else if(d.act==='cancel') discardBox();
    else if(d.act==='save') saveEdit(key);
    else if(d.act==='why') openBox('why',key);
    else if(d.act==='laterbox') openBox('why',key,'later');
    else if(d.act==='whysend') sendWhy(key);
    else if(d.act==='read'||d.act==='ficha'){ const x=d.act==='ficha'?key+'#f':key; S.exp[x]=(r.prepNote&&sheetOpen==='prep')?S.exp[x]===false:!S.exp[x]; sheetOpen?renderSheet():render(); }
    else if(d.act==='claude'||d.act==='deeper'){ const p=r.correlo[0]; fetch('/api/correlo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d.act==='deeper'?{prompt:p,solo_copiar:true}:{prompt:p})}).then(x=>x.json()).then(j=>toast(j.ok?(d.act==='deeper'?'Go-deeper prompt copied — paste it into Claude':j.donde==='mac'?'Sent to your Mac — Claude does it there':'Opened Claude with the prompt written out'):(j.error||"Couldn't open Claude"),false,!j.ok)).catch(()=>toast("Couldn't reach Exo",false,true)); }
    return; }
  if(d.go!==undefined) return start();
  if(d.gointro!==undefined) return startIntro();
  if(d.brain!==undefined) return openBrain();
  if(d.home!==undefined) return startPage();
  if(d.snd!==undefined) return setSound(LAY.sound===false);
  if(d.music){ e.preventDefault(); return setMusic(d.music); }
  if(d.rate) return rateCard(d.card,d.rate);
  if(d.past!==undefined){ S.pastOpen=!S.pastOpen; return renderSheet(); }
  if(d.fold){ S.folds[d.fold]=!S.folds[d.fold]; persist(); return sheetOpen?renderSheet():render(); }
  if(d.czt){ const k=d.t, n=T[k].tier; if(d.czt==='size') LAY.w[k]=isWide(k)?'half':'full'; else { const ks=tierKeys(n), i=ks.indexOf(k), j=d.czt==='left'?i-1:i+1; if(j>=0&&j<ks.length){ [ks[i],ks[j]]=[ks[j],ks[i]]; LAY.order[n]=ks; } } saveLay(); return render(); }
  if(d.cz){ const c=d.cz; if(c==='toggle'||c==='done') document.body.classList.toggle('customize', c==='toggle'?undefined:false);
    if(c==='zoom+') LAY.zoom=Math.min(1.4,+(LAY.zoom+.1).toFixed(2)); if(c==='zoom-') LAY.zoom=Math.max(.8,+(LAY.zoom-.1).toFixed(2));
    if(c==='dense') LAY.dense=!LAY.dense; if(c==='sheet') LAY.sheet=LAY.sheet==='wide'?'narrow':'wide';
    if(c==='reset') LAY={w:{},order:{},zoom:1,dense:false,sheet:'wide',sound:LAY.sound,musicType:LAY.musicType,musicName:LAY.musicName};
    if(c!=='toggle'&&c!=='done') toast(c==='reset'?'Layout reset':'Saved on this computer'); saveLay(); return render(); }
  if(d.panel){ if(d.panel==='linkedin'&&!T.linkedin) return; return openSheet(d.panel,false); }
  if(d.tab){ S.tab=d.tab; S.sf=null; return renderSheet(); }
  if(d.finish) return finish(d.finish);
  if(d.edit!==undefined){ S.started=false; S._focusedObj=false; return render(); }
  if(d.close) return closeLevel(+d.close);
  if(d.skip0!==undefined) return skipAhead();
  if(d.goto!==undefined) return goto(d.goto);
  if(d.k){ S[FK()]=d.k; applyFocus(); } });
document.addEventListener('pointerup',e=>{ const b=e.target.closest('button,a'); if(b) setTimeout(()=>b.blur()); });
/* outreach (2026-10-24): one week row for both tiles — ticked once both are done, or the other has nothing open */
const OUTDONE=()=>T.cold&&T.cold.sem?`<button class="b big ok close-x" data-finish="${sheetOpen==='warm'?'warm':'cold'}">Done with outreach this week<span class="kchip" style="display:inline-block">⌘↵</span></button>`:'';
function finish(k){ if(S.manual[k]) return closeSheet(); S.manual[k]=true; const u={type:'manual',k};
  if((k==='cold'||k==='warm')&&T.cold&&T.cold.sem){ const o=k==='cold'?'warm':'cold'; if(S.manual[o]||!openCount(T[o])){ const s=T.cold.sem; const op=queue({key:'out-semana',src:{t:'m',trabajo:'cracks',id:s.id,crudo:s.crudo},steps:[{k:'m',marca:'x'}],ti:'Outreach this week'}); u.did=op.did; } }
  if(k==='linkedin'&&T.linkedin&&T.linkedin.sem){ const s=T.linkedin.sem; const op=queue({key:'li-semana',src:{t:'m',trabajo:'linkedin',id:s.id,crudo:s.crudo},steps:[{k:'m',marca:'x'}],ti:'LinkedIn this week'}); u.did=op.did; }
  S.undo.push(u); closeSheet(); SFX.play('accept'); toast(k==='linkedin'?'Done with LinkedIn this week':k==='cold'||k==='warm'?'Done with '+k+' outreach this week':'Done thinking',true); persist(); }
$('#toastUndo').onclick=()=>undo();
$('#veil').onclick=closeSheet; $('#shClose').onclick=closeSheet; $('#errRetry').onclick=()=>{ load().then(ok=>{ if(ok){ toast('Back · reading your files'); schedFlush(); } }); };
let th;
function toast(m,withUndo,bad){ const t=$('#toast'); $('#toastMsg').textContent=m; $('#toastUndo').style.display=withUndo?'':'none'; t.classList.toggle('bad',!!bad); t.classList.add('show'); clearTimeout(th); th=setTimeout(()=>t.classList.remove('show'),withUndo?UNDO_MS:bad?7000:1900); }

/* ───── your second brain and the intro: one HUD (jarvis-hud.js) on /api/cerebro, /api/corridas and the trust scores ───── */
const OMAP={personas:0,compromisos:1,pensamiento:2,mantenimiento:3};
let RUNS=null;
function getRuns(){ return RUNS?Promise.resolve(RUNS):fetch('/api/corridas?n=60').then(r=>r.json()).then(j=>(RUNS=j.corridas||[])).catch(()=>[]); }
/* 2026-11-03 Pablo: "the info that is there make it accurate, put relevant info of every day" — agents from the same health
   check Home uses (on-demand ones don't count), last night's runs only, today's meetings, the next thing due, and the
   same "Needs you" count as the badge. */
function hudData(runs){
  const conf=(D&&D.confianza)||{}, ag=conf.agentes||{}, orq=conf.orquestadores||{}, of={};
  Object.entries(orq).forEach(([o,v])=>(v.agentes||[]).forEach(a=>{ of[a]=OMAP[o]; }));
  const sal=(D&&D.salud&&D.salud.agentes)||[], red=Object.fromEntries(sal.map(a=>[a.id,a.color==='rojo']));
  const agents=agentList().map(t=>[t.id, of[t.id]??3, (ag[t.id]||{}).puntos??0, (t.id in red?red[t.id]:t.bad)?1:0]);
  const sched=sal.filter(a=>a.color!=='gris'), down=sal.filter(a=>a.color==='rojo').map(a=>a.nombre);
  const COLR={ok:'#5EE6B0','sin-novedad':'#5AB8FF',fallo:'#FF5A5A'};
  const night=NOW().getTime()-16*36e5, all=runs||[], recent=all.filter(r=>new Date(r.cuando).getTime()>=night);
  const events=(recent.length?recent:all).slice(0,30).map(r=>[String(r.cuando||'').slice(11,16), r.trabajo, String(r.nota||r.resultado||'').slice(0,64), COLR[r.resultado]||'#9FD3FF']);
  const tasa=String(job('cracks').tasa_de_respuesta||''), pm=tasa.match(/(\d+)%/);
  const hhmm=r=>(String(r.tag||'').match(/\b(\d{1,2}:\d{2})\b/)||[,''])[1].padStart(5,'0'), nowHm=new Date(NOW().getTime()-10*6e4).toTimeString().slice(0,5);
  const mtgs=prepToday().map(id=>R[id]).filter(r=>r&&r.dt).sort((a,b)=>hhmm(a).localeCompare(hhmm(b)));
  const nx=mtgs.find(r=>hhmm(r)&&hhmm(r)>=nowHm);
  const name=t=>String(t||'').replace(/<[^>]+>/g,'').replace(/\*\*/g,'').replace(/\s*\(.*$/,'').replace(/^.*?·\s*/,'').trim().slice(0,28);
  const td=DAY, lim=iso(new Date(NOW().getTime()+2*864e5));
  const due=((D&&D.entregas)||[]).filter(e=>e.estado==='pendiente'&&(e.cuando||'').slice(0,10)>=td&&(e.cuando||'').slice(0,10)<=lim).sort((a,b)=>String(a.cuando).localeCompare(String(b.cuando)))[0];
  const dueTxt=due?String(due.texto).replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/\*/g,'').split(/\s*[(—]/)[0].trim().slice(0,46)+' · '+(dayLabel(whenOf(due.cuando))||'')+(/T\d/.test(due.cuando)?' '+String(due.cuando).slice(11,16):''):'';
  const left=levels().reduce((a,n)=>a+(S.closed[n]?0:tierLeft(n)),0);
  return {agents, events, working:sched.length?sched.length-down.length:agents.filter(a=>!a[3]).length, total:sched.length||agents.length, down,
    nightRuns:recent.length, nightFails:recent.filter(r=>r.resultado==='fallo').length, rate:pm?+pm[1]:null, meetings:mtgs.length,
    next:nx?name(nx.ti)+' at '+hhmm(nx):'', due:dueTxt, waiting:left}; }
let BSTATS=null;
function introLine(){
  const h=hudData(RUNS), parts=[];
  parts.push(h.down.length?`${h.working} of your ${h.total} agents are working; ${h.down.length===1?h.down[0]+' needs':h.down.slice(0,-1).join(', ')+' and '+h.down.slice(-1)+' need'} a look.`:`All ${h.total} of your agents are working.`);
  if(h.next) parts.push(`${plural(h.meetings,'meeting')} today; next is ${h.next}.`);
  else if(h.due) parts.push(`Next due: ${h.due}.`);
  return parts.join(' '); }
function openBrain(){ if(window.JarvisHUD&&JarvisHUD.isOpen) return; toast('Opening your brain…');
  Promise.all([need('three','fx','hud'),getRuns()]).then(([,runs])=>{ if(!JarvisHUD.isOpen) JarvisHUD.open({mode:'explore', data:hudData(runs), onReplay:()=>playIntro(false)}); })
    .catch(()=>toast("Couldn't load the 3D view",false,true)); }
function closeBrain(){ if(window.JarvisHUD&&JarvisHUD.mode==='explore') JarvisHUD.close(); }
/* intro sound: his Exo startup clip (default, played whole), Back in Black from his own copy, the original score, a file, or off */
let MUSIC_URL=null;
const idb=()=>new Promise((ok,no)=>{ try{ const r=indexedDB.open('jarvis',1); r.onupgradeneeded=()=>r.result.createObjectStore('files'); r.onsuccess=()=>ok(r.result); r.onerror=()=>no(r.error); }catch(e){ no(e); } });
const idbPut=(k,v)=>idb().then(db=>new Promise((ok,no)=>{ const t=db.transaction('files','readwrite'); t.objectStore('files').put(v,k); t.oncomplete=ok; t.onerror=()=>no(t.error); }));
const idbGet=k=>idb().then(db=>new Promise((ok,no)=>{ const q=db.transaction('files').objectStore('files').get(k); q.onsuccess=()=>ok(q.result); q.onerror=()=>no(q.error); }));
if(LAY.musicType==='file') idbGet('intro-music').then(b=>{ if(b) MUSIC_URL=URL.createObjectURL(b); }).catch(()=>{});
function musicLabel(){ const t=LAY.musicType||'startup'; return t==='startup'?'Exo startup · your clip':t==='bib'?'Back in Black · from the riff':t==='file'?(LAY.musicName||'your song'):t==='off'?'off':'original score'; }
function musicCfg(){ const t=LAY.musicType||'startup'; if(t==='startup') return {type:'startup',url:'../startup.mp3',whole:true}; if(t==='bib') return {type:'file',url:'../startup.mp3',start:0};
  if(t==='file') return MUSIC_URL?{type:'file',url:MUSIC_URL,start:0}:{type:'score'}; return {type:t}; }
function openMusic(){ const box=$('#mpick'); if(!box||box.querySelector('.mbox')) return;
  box.insertAdjacentHTML('beforeend',`<div class="mbox"><div class="row2"><button class="b" data-music="startup">Exo startup</button><button class="b" data-music="bib">Back in Black</button><button class="b" data-music="score">Original score</button><button class="b" data-music="pickfile">A song file from your Mac…</button><button class="b" data-music="off">No sound</button></div>
    <small>Exo startup plays your clip whole. Back in Black plays from your own copy, starting just before the riff. Both live only on this Mac.</small><input type="file" id="mFile" accept="audio/*" hidden></div>`);
  $('#mFile').onchange=e=>{ const f=e.target.files[0]; if(!f) return; idbPut('intro-music',f).then(()=>{ if(MUSIC_URL) URL.revokeObjectURL(MUSIC_URL); MUSIC_URL=URL.createObjectURL(f); LAY.musicType='file'; LAY.musicName=f.name; saveLay(); render(); toast('Intro sound · '+f.name); }).catch(()=>toast("Couldn't keep that file in this browser",false,true)); }; }
function setMusic(kind){ if(kind==='open') return openMusic(); if(kind==='pickfile') return $('#mFile').click();
  LAY.musicType=kind; saveLay(); render(); toast('Intro sound · '+musicLabel()); }
function startIntro(){ const o=$('#obj'); const v=(o?o.value:objValue()).trim(); if(!v){ if(o){ o.focus(); o.placeholder='Write one line first'; } return; } saveObjective(v); playIntro(true); }
/* 2026-10-21 · the iPhone plays sound only from inside the tap itself: open the sound and the voice here, while the tap
   still counts — the HUD opens a moment later and reuses them (`ctx()` in jarvis-hud.js). */
function unlockAudio(){ try{ if(navigator.audioSession) navigator.audioSession.type='playback'; }catch(_){}   /* iPhone: Web Audio otherwise obeys the silent switch */
  try{ const C=window.AudioContext||window.webkitAudioContext; if(!window.__jac||window.__jac.state==='closed') window.__jac=new C(); const c=window.__jac; if(c.resume) c.resume(); const s=c.createBufferSource(); s.buffer=c.createBuffer(1,1,22050); s.connect(c.destination); s.start(0); }catch(_){}
  try{ if('speechSynthesis' in window){ const u=new SpeechSynthesisUtterance(' '); u.volume=0; speechSynthesis.speak(u); } }catch(_){} }
function playIntro(thenStart,demo){ if(!demo) unlockAudio();
  const go=()=>{ if(JarvisHUD.isOpen) JarvisHUD.close();
    setTimeout(()=>JarvisHUD.open({mode:'intro', demo, objective:objValue(), line:introLine(), music:musicCfg(), data:hudData(RUNS),
      onDone:()=>{ if(thenStart){ S.started=true; S.f=null; render(); scrollTo({top:0}); persist(); homeAfter(); } }}), JarvisHUD.isOpen?500:0); };
  Promise.all([need('three','fx','hud'),getRuns(),BSTATS?null:fetch('/api/cerebro').then(r=>r.json()).then(d=>{ BSTATS=d.stats; }).catch(()=>{})]).then(go)
    .catch(()=>{ toast("The intro couldn't load",false,true); if(thenStart){ S.started=true; render(); } }); }
/* re-open Exo: a fresh load, as if he just opened it this morning; his decisions are kept */
function reopenJarvis(){ if(window.JarvisHUD&&JarvisHUD.isOpen) JarvisHUD.close(); if(sheetOpen) closeSheet(); S.started=false; S.view=null; S.f=null; S.open=null; persist(true); location.reload(); }
function startPage(){ if(sheetOpen) closeSheet(); closeBrain(); S.started=false; S.f=null; S._focusedObj=false; render(); scrollTo({top:0,behavior:RM.matches?'auto':'smooth'}); toast('Start page · your decisions are kept'); }

/* ───── reading the files ───── */
let loading=null;
function load(quiet){ if(loading) return loading;
  loading=fetch('/api/datos',{cache:'no-store'}).then(r=>r.json()).then(d=>{ if(!d||d.error) throw new Error((d&&d.error)||'no data'); D=d; offline(false); build(); if(!quiet) render(); return true; })
    .catch(e=>{ offline(true,e); if(!D) $('#app').innerHTML=`<p class="cnote" style="margin-top:30px">Exo can't read your files right now (${esc(e.message)}). Is the black window open?</p>`; return false; })
    .finally(()=>{ loading=null; });
  return loading; }
let refreshT=null;
function refresh(){ clearTimeout(refreshT); refreshT=setTimeout(()=>{ if(S.editing||S.why||S.note||GOAL_EDIT) return; load(true).then(ok=>{ if(ok) softRender(); }); },300); }
/* another tab decided something: take its state, so two tabs never undo each other */
addEventListener('storage',e=>{ if(e.key!==STORE||!e.newValue) return; const d=restore(e.newValue); if(!d) return; if(!D) return;
  applying=true; try{ build(); if(S.open!==sheetOpen){ if(S.open&&S.open!=='nota') openSheet(S.open,true); else if(!S.open) closeSheet(); } else if(sheetOpen) renderSheet(); render(); } finally{ applying=false; } toast('Updated from your other tab'); });

$('#tnav').onclick=e=>{ const b=e.target.closest('[data-tnav]'); if(!b) return; const k=b.dataset.tnav;
  if(window.JarvisHUD&&JarvisHUD.isOpen&&k!=='brain') JarvisHUD.close(); if($('#ovPal').classList.contains('show')) hidePal();
  if(k==='today') return startPage(); if(k==='brain') return openBrain(); if(k==='agents') return openSheet('world',true); if(k==='study'){ if(EMB) return parent.postMessage({tipo:'jarvis-go',vista:'learn'},location.origin); location.href='estudio.html'; return; } if(k==='me'){ if(EMB) return parent.postMessage({tipo:'jarvis-go',vista:'me'},location.origin); location.href='../index.html'; return; } if(k==='menu') return showPal(); };
/* 2026-10-21 · the phone keeps yesterday's page in memory: coming back on a new day is a fresh load, so the first open of
   the day lands on today's view (the start page, at the top). */
const newDay=()=>{ if(iso(NOW())!==DAY) location.reload(); };
addEventListener('pageshow',newDay); document.addEventListener('visibilitychange',()=>{ if(!document.hidden) newDay(); });
if(TOUCH&&!resumed) scrollTo(0,0);
if(TOUCH&&$('#shClose')) $('#shClose').textContent='Close';
applyLay(); savedLabel(); if(LAY.sound===false&&$('#snd')) $('#snd').textContent='♪ off';
load().then(ok=>{ if(!ok) return;
  if(resumed&&S.open&&S.open!=='nota'&&(S.open!=='linkedin'||T.linkedin)){ const bx=[S.editing,S.why,S.note]; openSheet(S.open,true); [S.editing,S.why,S.note]=bx; renderSheet();
    setTimeout(()=>{ const x=document.querySelector('[data-msg],[data-whyin],[data-notein]'); if(x){ x.focus(); try{ x.setSelectionRange(x.value.length,x.value.length); }catch(_){} } },60); }
  else if(resumed&&(S.editing||S.why||S.note)){ render(); const x=document.querySelector('[data-msg],[data-whyin],[data-notein]'); if(x){ x.focus(); try{ x.setSelectionRange(x.value.length,x.value.length); }catch(_){} } }
  if(resumed&&S.started) toast('Picked up where you left off');
  if(OB.length) schedFlush(); });
setInterval(()=>{ if(document.hidden) return; if(iso(NOW())!==DAY) return location.reload(); refresh(); }, 60000);

/* ───── background motion around the mouse (2026-10-15) ─────
   Pablo: "also have some background (or around the mouse) things moving for when I move the mouse to make it more
   interactive". Round 3 removed the background, so at rest there is nothing: a hidden grid of points (28 px) wakes only
   within 160 px of the cursor — brighter toward it, leaning away and springing back, near ones joined by thin lines —
   plus a short trail on fast moves and one ring per click. One canvas, one loop that stops itself: still for 2 s, tab
   hidden, touch screen, reduce motion, the intro or Your brain open, or ⌘K "Background motion on/off". */
const BGFX=(function(){
  const cv=document.getElementById('bgfx'); if(!cv||!cv.getContext) return {reset(){}};
  const ctx=cv.getContext('2d'), GAP=28, R=160, LINK=70, TRAIL=400, STILL=2000;
  const touch=matchMedia('(pointer: coarse)').matches;
  let W=0,H=0,pts=[],mx=-1e4,my=-1e4,lastMove=0,raf=0,trail=[],rings=[],lx=null,ly=null,lt=0;
  const on=()=>LAY.bgfx!==false&&!touch&&!RM.matches&&!document.hidden&&!(window.JarvisHUD&&JarvisHUD.isOpen);
  function size(){ const d=Math.min(2,devicePixelRatio||1); W=innerWidth; H=innerHeight; cv.width=W*d; cv.height=H*d; ctx.setTransform(d,0,0,d,0,0);
    pts=[]; for(let y=GAP/2;y<H;y+=GAP) for(let x=GAP/2;x<W;x+=GAP) pts.push({x,y,ox:0,oy:0,b:0}); }
  function stop(){ if(raf) cancelAnimationFrame(raf); raf=0; ctx.clearRect(0,0,W,H); for(const p of pts){ p.ox=p.oy=p.b=0; } trail=[]; rings=[]; }
  function wake(){ if(W!==innerWidth||H!==innerHeight) size(); if(!raf&&on()) raf=requestAnimationFrame(frame); }
  function frame(now){
    raf=0; if(!on()) return stop();
    ctx.clearRect(0,0,W,H);
    const live=now-lastMove<STILL; let busy=live||trail.length||rings.length;
    rings=rings.filter(g=>now-g.t<800); trail=trail.filter(q=>now-q.t<TRAIL);
    const near=[];
    for(const p of pts){
      const dx=p.x-mx, dy=p.y-my, d=Math.hypot(dx,dy);
      let tb=live&&d<R?Math.pow(1-d/R,1.5):0, tx=0, ty=0;
      if(live&&d<R&&d>0.1){ const k=(1-d/R)*6; tx=dx/d*k; ty=dy/d*k; }
      for(const g of rings){ const rr=(now-g.t)*0.55, dd=Math.abs(Math.hypot(p.x-g.x,p.y-g.y)-rr); if(dd<16) tb=Math.max(tb,(1-dd/16)*(1-(now-g.t)/800)); }
      p.ox+=(tx-p.ox)*0.18; p.oy+=(ty-p.oy)*0.18; p.b+=(tb-p.b)*0.2;
      if(p.b<0.01&&Math.abs(p.ox)<0.05&&Math.abs(p.oy)<0.05){ p.b=0; p.ox=p.oy=0; continue; }
      busy=true;
      const x=p.x+p.ox, y=p.y+p.oy;
      if(d<R&&live) near.push([x,y,d]);
      ctx.globalAlpha=Math.min(1,p.b*0.9);
      ctx.fillStyle=d<45&&live?'#FF8A3D':'#66756E';
      ctx.fillRect(x-1,y-1,2,2);
    }
    ctx.lineWidth=1;
    for(let i=0;i<near.length;i++) for(let j=i+1;j<near.length;j++){
      const a=near[i], c=near[j], dd=Math.hypot(a[0]-c[0],a[1]-c[1]); if(dd>LINK) continue;
      ctx.globalAlpha=(1-dd/LINK)*(1-Math.min(a[2],c[2])/R)*0.35; ctx.strokeStyle='#2A3430';
      ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(c[0],c[1]); ctx.stroke(); }
    for(const q of trail){ const f=1-(now-q.t)/TRAIL; ctx.globalAlpha=f*0.5; ctx.fillStyle='#66756E';
      ctx.beginPath(); ctx.arc(q.x+q.vx*(now-q.t)*0.05,q.y+q.vy*(now-q.t)*0.05,1.6*f,0,6.283); ctx.fill(); }
    for(const g of rings){ const f=1-(now-g.t)/800; ctx.globalAlpha=f*0.25; ctx.strokeStyle='#FF8A3D';
      ctx.beginPath(); ctx.arc(g.x,g.y,(now-g.t)*0.55,0,6.283); ctx.stroke(); }
    ctx.globalAlpha=1;
    if(busy) raf=requestAnimationFrame(frame); else ctx.clearRect(0,0,W,H);
  }
  addEventListener('pointermove',e=>{ if(e.pointerType==='touch') return; const now=performance.now();
    if(lx!=null){ const dt=Math.max(1,now-lt), sp=Math.hypot(e.clientX-lx,e.clientY-ly)/dt;
      if(sp>1.2&&on()) trail.push({x:e.clientX,y:e.clientY,t:now,vx:(e.clientX-lx)/dt,vy:(e.clientY-ly)/dt}); }
    lx=mx=e.clientX; ly=my=e.clientY; lt=lastMove=now; wake(); },{passive:true});
  addEventListener('pointerdown',e=>{ if(e.pointerType==='touch'||e.button!==0) return; rings.push({x:e.clientX,y:e.clientY,t:performance.now()}); lastMove=performance.now(); wake(); },{passive:true});
  addEventListener('resize',()=>{ size(); });
  document.addEventListener('visibilitychange',()=>{ if(document.hidden) stop(); });
  size();
  return {reset(){ stop(); size(); }, get running(){ return !!raf; }};
})();
