// Playtest log: anonymous, one record per play session, so Yoshi's stats dashboard can answer "is it fun?"
// (do people come back, how long they play, what they do, where they stop, would they buy a card).
// No names, emails or account ids: a random device id made on first visit. Players can turn it off.
// Where it goes:
//   * claude.ai build: the artifact's own database (the sandbox blocks other servers), doc plays/<viewer id>/sessions/<session>
//     (playtesters need Contributor access: claude.ai never lets plain viewers write);
//   * hosted build: Echowing's public.hl_log_session (guests allowed; see the 202611090008 migration).
// Both get the same session shape. Saved after every few events and whenever the page is hidden; no timers.
export const LOG_KEY='trottville-playtest',BUILD='v62',MAX_EVENTS=300,FLUSH_EVERY=8,NEW_SESSION_GAP=30*60e3;
const now=()=>Date.now();
const uuid=()=>globalThis.crypto?.randomUUID?.()||'10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(c^Math.random()*16>>c/4).toString(16));

export function loadPrefs(store=globalThis.localStorage){try{const v=JSON.parse(store.getItem(LOG_KEY));if(v&&typeof v.device==='string')return v;}catch{}return null;}
export function savePrefs(p,store=globalThis.localStorage){try{store.setItem(LOG_KEY,JSON.stringify(p));}catch{}}
export function freshPrefs(t=now()){return {device:uuid(),first:t,noticed:false,optOut:false};}
export const dayNumber=(first,t=now())=>Math.max(0,Math.floor((t-first)/864e5));

// A session record: what both sinks store.
export function newSession(prefs,t=now()){return {session:uuid(),device:prefs.device,start:t,last:t,secs:0,build:BUILD,
  events:[{t:'start',at:0,day:dayNumber(prefs.first,t),new:dayNumber(prefs.first,t)===0&&!prefs.seen}]};}
// Add an event (seconds since session start in `at`); keeps the list capped and the values small.
export function addEvent(s,type,data={},t=now()){const e={t:type,at:Math.round((t-s.start)/1000)};
  for(const [k,v] of Object.entries(data)){if(v==null)continue;e[k]=typeof v==='string'?v.slice(0,type==='feedback'?600:60):typeof v==='number'||typeof v==='boolean'?v:String(v).slice(0,60);}
  const events=s.events.length>=MAX_EVENTS?[...s.events.slice(0,MAX_EVENTS-1),e]:[...s.events,e];
  return {...s,last:t,events};}

// ---- runtime --------------------------------------------------------------------------------------------
let prefs=null,session=null,unsaved=0,visibleSince=null,hiddenAt=null,saving=null,again=false,db=null,dbTried=false;
const on=()=>!!prefs&&!prefs.optOut;

async function sink(){
  // claude.ai: each player writes only under their own id (rules: plays/{self}); only the owner reads across.
  if(!dbTried){dbTried=true;try{if(globalThis.claude?.use){const [d,u]=await Promise.all([globalThis.claude.use('db'),globalThis.claude.use('user')]);const id=d&&u?await u.id():null;if(id)db={d,id};}}catch{db=null;}}
  // plays/<id> itself is a small index doc, so the owner can list players and then their sessions.
  if(db){if(!db.indexed){db.indexed=true;await db.d.doc('plays/'+db.id).set({device:session.device,last:session.last}).catch(()=>{db.indexed=false;});}
    await db.d.doc('plays/'+db.id+'/sessions/'+session.session).set(session);return;}
  const c=globalThis.MEADOWGATE_SUPABASE;if(!c?.url||!c?.publishableKey)return;
  await fetch(c.url+'/rest/v1/rpc/hl_log_session',{method:'POST',keepalive:true,headers:{apikey:c.publishableKey,Authorization:'Bearer '+c.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({p:session})});
}
// One save at a time; a save asked for mid-save runs once more afterwards with the newest record.
// Nothing leaves the device until the player has seen the notice and pressed OK (or sends feedback themselves).
function flush(){if(!on()||!prefs.noticed||!session||!unsaved)return;if(saving){again=true;return;}
  if(visibleSince!=null){const t=now();session={...session,secs:session.secs+Math.round((t-visibleSince)/1000)};visibleSince=t;}
  unsaved=0;saving=sink().catch(()=>{}).finally(()=>{saving=null;if(again){again=false;unsaved=Math.max(unsaved,1);flush();}});}

export function log(type,data){try{globalThis.dispatchEvent?.(new CustomEvent('trottville:did',{detail:{type,data}}));}catch{}if(!on())return;if(!session)start();session=addEvent(session,type,data);unsaved++;if(unsaved>=FLUSH_EVERY||type==='feedback'||type==='wouldbuy')flush();}

function start(){session=newSession(prefs);prefs={...prefs,seen:true};savePrefs(prefs);unsaved=1;visibleSince=document.visibilityState==='visible'?now():null;flush();}

function onVisibility(){
  if(document.visibilityState==='hidden'){hiddenAt=now();if(session){if(visibleSince!=null){session={...session,secs:session.secs+Math.round((hiddenAt-visibleSince)/1000)};visibleSince=null;}session=addEvent(session,'pause');unsaved++;flush();}return;}
  // Back after a long break = a new session (that's how "came back later" shows up).
  if(session&&hiddenAt&&now()-hiddenAt>NEW_SESSION_GAP){start();}else visibleSince=now();
}

// ---- notice + feedback UI --------------------------------------------------------------------------------
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// 2026-11-15 playtest: the game pages (board-*.html etc.) don't load horselandia.css, so the notice showed as bare text.
// Bring the same look along once per page when no stylesheet has it.
const PL_CSS=`.pl-sheet{position:fixed;inset:0;z-index:9000;display:grid;place-items:end center;padding:16px;background:#1f33244d}.pl-card{width:min(420px,100%);background:#fffdf4;border-radius:20px;padding:18px;box-shadow:0 14px 40px #1f332455;color:#2f4a34}.pl-card h3{margin:0 0 8px;font:800 19px/1.2 Georgia,serif}.pl-card p{margin:0 0 12px;font-size:14.5px;line-height:1.45}.pl-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px}.pl-row button,.pl-moods button{min-height:46px;border-radius:14px;border:0;font-weight:800;font-size:15px}.pl-go{background:#2f6b3a;color:#fff}.pl-quiet{background:#eef1e3;color:#2f4a34}.pl-go:hover{background:#3a7d46}.pl-quiet:hover{background:#e3e8d4}.pl-moods{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:10px}.pl-moods button{background:#eef1e3;font-size:24px}.pl-moods button[aria-checked="true"]{background:#2f6b3a;box-shadow:inset 0 0 0 3px #a8d5b0}.pl-card textarea{width:100%;box-sizing:border-box;border:1px solid #c9d1bb;border-radius:12px;padding:10px;font:inherit;font-size:15px;resize:vertical;margin-bottom:6px}`;
function ensureStyles(){if(document.getElementById('pl-css'))return;const probe=document.createElement('div');probe.className='pl-sheet';probe.style.visibility='hidden';document.body.append(probe);const ok=getComputedStyle(probe).position==='fixed';probe.remove();if(ok)return;const st=document.createElement('style');st.id='pl-css';st.textContent=PL_CSS;document.head.append(st);}
function sheet(html){ensureStyles();document.querySelector('.pl-sheet')?.remove();const d=document.createElement('div');d.className='pl-sheet';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.innerHTML=`<div class="pl-card">${html}</div>`;document.body.append(d);return d;}
function notice(){const d=sheet(`<h3>Thanks for playtesting!</h3><p>Trottville is still being made. To learn what's fun, it keeps an anonymous record of how you play: where you go, what you play and for how long. No name, email or account is saved.</p>
  <div class="pl-row"><button type="button" class="pl-quiet" data-x="off">Don't record</button><button type="button" class="pl-go" data-x="ok">OK</button></div>`);
  d.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>{const off=b.dataset.x==='off';prefs={...prefs,noticed:true,optOut:off};savePrefs(prefs);d.remove();if(off)session=null;else log('notice',{ok:true});});
  d.querySelector('[data-x="ok"]').focus({preventScroll:true});}

export function openFeedback(where=''){const moods=[['😍','love'],['🙂','like'],['😐','meh'],['😕','confused'],['😠','annoyed']];
  const d=sheet(`<h3>How's it going?</h3><div class="pl-moods" role="radiogroup" aria-label="How do you feel about the game">${moods.map(([e,m])=>`<button type="button" role="radio" aria-checked="false" data-m="${m}" aria-label="${m}">${e}</button>`).join('')}</div>
    <textarea maxlength="600" rows="4" placeholder="What did you like? What was confusing or annoying?" aria-label="Your feedback"></textarea>
    <div class="pl-row"><button type="button" class="pl-quiet" data-x>Cancel</button><button type="button" class="pl-go" data-send>Send</button></div>`);
  let mood=null;d.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{mood=b.dataset.m;d.querySelectorAll('[data-m]').forEach(x=>x.setAttribute('aria-checked',String(x===b)));});
  d.querySelector('[data-x]').onclick=()=>d.remove();
  d.querySelector('[data-send]').onclick=()=>{const text=d.querySelector('textarea').value.trim();if(!mood&&!text){d.querySelector('textarea').focus();return;}
    const keep={optOut:prefs.optOut,noticed:prefs.noticed};prefs={...prefs,optOut:false,noticed:true};log('feedback',{mood,text,where});prefs={...prefs,...keep};
    d.querySelector('.pl-card').innerHTML=`<h3>Thank you!</h3><p>Your note is on its way to the game's maker.</p><div class="pl-row"><button type="button" class="pl-go" data-x>Close</button></div>`;d.querySelector('[data-x]').onclick=()=>d.remove();};
  d.querySelector('[data-m]').focus();}

// "Would you have bought this?" (cards aren't on sale): resolves true/false/null.
export function askWouldBuy(card){return new Promise(res=>{const d=sheet(`<h3>Game Cards aren't on sale yet</h3><p>We're checking whether people would want them. If it were on sale right now, would you have bought the <b>$${esc(card.dollars)}</b> card (${esc(card.stars.toLocaleString())} stars)?</p>
    <div class="pl-row"><button type="button" class="pl-quiet" data-v="no">No</button><button type="button" class="pl-go" data-v="yes">Yes, I would</button></div>`);
  d.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{const yes=b.dataset.v==='yes';log('wouldbuy',{card:card.id,dollars:card.dollars,yes});d.remove();res(yes);});
  d.addEventListener('click',e=>{if(e.target===d){d.remove();res(null);}});});}

export function initPlayLog(){
  if(prefs||typeof document==='undefined')return;
  prefs=loadPrefs()||freshPrefs();savePrefs(prefs);
  addEventListener('visibilitychange',onVisibility);addEventListener('pagehide',()=>{if(session){session=addEvent(session,'pause');unsaved++;flush();}});
  addEventListener('hashchange',()=>log('screen',{to:location.hash.slice(1).split(/[?&]/)[0]||'home'}));
  addEventListener('ranch:tack',()=>log('tack'));
  document.addEventListener('click',e=>{const b=e.target.closest?.('[data-feedback]');if(b){e.preventDefault();openFeedback(b.dataset.feedback||'');}});
  if(on())start();
  // Wait for the start screen (note #46) so the notice never sits on top of it.
  // 2026-11-17 Yoshi: it blocked "Choose your first horse". Also wait until the player HAS a horse (or is signed in,
  // when the device ranch is off), so the first thing they see is never this card.
  if(!prefs.noticed){const hasHorse=()=>{try{if(Object.keys(localStorage).some(k=>k.startsWith('meadowgate-auth-')))return true;return !!JSON.parse(localStorage.getItem('trottville-ranch-v1')||'null')?.herd?.length;}catch{return true;}};
    const startUp=()=>{const st=document.getElementById('start');return !!st&&!st.hidden&&!st.classList.contains('gone');};
    const ready=()=>!startUp()&&hasHorse();if(ready())notice();
    else{const w=()=>{if(!ready())return;removeEventListener('ranch:change',w);removeEventListener('trottstart:done',w);notice();};
      addEventListener('ranch:change',w);addEventListener('trottstart:done',w);}}
  log('screen',{to:location.hash.slice(1).split(/[?&]/)[0]||'home'});
  globalThis.TrottLog={log,openFeedback,askWouldBuy};
}
initPlayLog();
