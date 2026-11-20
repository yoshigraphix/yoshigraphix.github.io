// Test friends switch (owner only). Players never see it: the switch shows only to the artifact's owner on claude.ai
// (claude.use('user').isOwner()) or on the local dev server. While on, friends.js and world-network.js talk to the
// computer-run riders in test-friends.mjs instead of the game server. Turning it off forgets nothing; Reset starts over.
import {createTestFriends,TEST_ME,STATE_KEY} from './test-friends.mjs?v=162';
import {RANCH_KEY,loadRanch,restNow,condition,level} from './ranch.mjs?v=162';
import {rideTrustOf,isTamed,TAME_AT} from './riding.mjs?v=162';
import {loadDirt,dirtLevel,sweepsLeft} from './stall-dirt.mjs?v=162';
export {TEST_ME};
const KEY='trottville-test-friends';
const host=globalThis.location?.hostname||'',local=/^(localhost|127\.0\.0\.1|\[::1\])$/.test(host)||/\.(localhost|test)$/.test(host);
let owner=local,sim=null;
const read=()=>{try{return localStorage.getItem(KEY)==='1';}catch{return false;}};
// On claude.ai the owner check resolves a moment after load; until then (and for everyone else) the switch stays hidden.
const ownerKnown=local||!globalThis.window?Promise.resolve(local):(async()=>{try{const u=await globalThis.claude?.use?.('user');owner=!!u?.isOwner?.();}catch{owner=false;}
  if(owner&&read())window.dispatchEvent(new CustomEvent('trottville:test-friends'));return owner;})();
export const testAllowed=()=>owner;
export const testOn=()=>owner&&read();
function myHorses(){try{return (JSON.parse(localStorage.getItem(RANCH_KEY)||'null')?.herd||[]).filter(h=>!h.retired).map(h=>({id:h.id,name:h.name}));}catch{return [];}}
export function testFriends(){return sim||=createTestFriends({myHorses,inWorld:()=>!!window.TrottWorld?.open,ground:(x,z)=>window.TrottWorld?.groundY?.(x,z)??0});}
// The servers' replies arrive asynchronously: keep that so callers behave the same.
export const testCall=(kind,action,payload)=>new Promise((ok,fail)=>setTimeout(()=>{try{ok(testFriends()[kind](action,payload));}catch(e){fail(e);}},60));
export function setTest(on){try{localStorage.setItem(KEY,on?'1':'0');}catch{}window.dispatchEvent(new CustomEvent('trottville:test-friends'));}
export function resetTest(){testFriends().reset();try{localStorage.removeItem(STATE_KEY);}catch{}}

// ---------------------------------------------------------------------------------------------------------------
// Dev stats (owner only, 2026-11-12; Yoshi: "a dev button ... brings up the stats like trust and i can see it grow or
// shrink based off things i do with the horse"). A 📊 button on the left edge opens a small panel you can drag by its
// title bar: each horse's hidden numbers, live. When one changes it flashes the difference and what caused it (the
// last thing play-log.js saw you do). Nothing here is shown to other players or saved anywhere but this device.
const DEV_KEY='trottville-dev-stats';
const CARE_WORD={pet:'petting',groom:'brushing',feed:'feeding',golden:'golden carrot',tidy:'raked stall'};
function causeOf(ev){if(!ev||performance.now()-ev.at>5000)return '';const {type,data={}}=ev;
  if(type==='care')return CARE_WORD[data.a]||data.a||'care';if(type==='place')return (data.how==='jump'?'jumped to ':'visited ')+(data.id||'');
  return type+(data.id?' '+data.id:data.a?' '+data.a:'');}
function snapshot(){const r=loadRanch(),who=globalThis.MeadowCloud?.active?globalThis.MeadowCloud.user.id:'guest',dirt=loadDirt(),now=Date.now();
  return (r?.herd||[]).filter(h=>!h.retired).map(h=>{const c=condition(h,now),lv=dirtLevel(dirt[h.id],now);
    return {id:h.id,name:h.name,stats:[
      ['trust','Trust (riding)',rideTrustOf(who,h.id),100],
      ['taming','Taming',isTamed(h)?null:(h.trust||0),TAME_AT,isTamed(h)?'tamed':null],
      ['bond','Bond',Math.round(h.bond||0),100],['happy','Happiness',Math.round(h.happiness||0),100],
      ['rest','Energy',Math.round(restNow(h,now)),100],['xp','XP',h.xp||0,null,`${h.xp||0} · lvl ${level(h.xp)}`],
      ['fed','Fed',null,null,c.label],['mess','Stall mess',sweepsLeft(lv),10,sweepsLeft(lv)?`${sweepsLeft(lv)} strokes`:'spotless']]};});}
// Test tools (owner only, 2026-11-13; Yoshi: "allow me to test by either resetting clouds and also giving myself as
// much money as needed"). Map clouds go through world.js (globalThis.__trottDevFog, set while the valley is loaded);
// Trotties are this device's own wallet (localStorage), never Stars, never the server. Every change can be undone.
const TOOLS=`<div class="tools"><b>Map clouds (test)</b><div class="row"><button type="button" data-fog="reset">☁️ Reset clouds</button><button type="button" data-fog="reveal">☀️ Reveal all</button></div>
<b>Trotties (test money)</b><div class="row"><button type="button" data-add="100">+100</button><button type="button" data-add="1000">+1,000</button><button type="button" data-add="10000">+10,000</button></div>
<div class="row"><input type="number" min="0" step="1" inputmode="numeric" placeholder="Amount" aria-label="Set Trotties to"><button type="button" data-set>Set</button></div><b>Time of day (test)</b><div class="row"><button type="button" data-hour="6.6">🌅 Dawn</button><button type="button" data-hour="12">☀️ Noon</button><button type="button" data-hour="19.9">🌇 Sunset</button><button type="button" data-hour="23">🌙 Night</button></div>
<div class="row"><input type="range" min="0" max="23.75" step="0.25" aria-label="Hour of the day" data-hourslider><button type="button" data-hour="live">🕒 Live clock</button></div><b>Weather (test)</b><div class="row"><button type="button" data-weather="clear">☀️ Clear</button><button type="button" data-weather="partly">⛅ Partly</button><button type="button" data-weather="overcast">☁️ Cloudy</button><button type="button" data-weather="fog">🌫️ Fog</button><button type="button" data-weather="rain">🌧️ Rain</button><button type="button" data-weather="storm">⛈️ Storm</button><button type="button" data-weather="windy">🌬️ Windy</button><button type="button" data-weather="snow">🌨️ Snow</button><button type="button" data-weather="live">🔄 Live weather</button></div><b>Moon (test)</b><div class="row"><button type="button" data-moon="1">🌕 Full moon</button><button type="button" data-moon="0">🌑 No moon</button><button type="button" data-moon="live">🌙 Real moon</button></div><b>Legends (test)</b><div class="row"><button type="button" data-legend="unicorn">🦄 Unicorn here</button><button type="button" data-legend="pegasus">🪽 Pegasus here</button></div><div class="row"><button type="button" data-legend="moon">🌙 Moon pegasus</button><button type="button" data-legend="treats">🥕 Legend treats</button></div>
<b>New player (test)</b><div class="row"><button type="button" data-newplayer>🐣 Start as a new player</button></div>
<p class="msg" hidden><span></span><button type="button">Undo</button></p></div>`;
function tools(box){const msg=box.querySelector('.msg');let undo=null,timer=0;
  const say=(text,back)=>{clearTimeout(timer);undo=back;msg.querySelector('span').textContent=text;msg.querySelector('button').hidden=!back;msg.hidden=false;timer=setTimeout(()=>{msg.hidden=true;undo=null;},7000);};
  msg.querySelector('button').onclick=()=>{const u=undo;undo=null;msg.hidden=true;u?.();};
  const money=async(fn,label)=>{const {loadWallet,saveWallet}=await import('./character-looks.mjs?v=162'),{paintCounters}=await import('./coin-collect.js?v=162');
    const put=c=>{saveWallet({...loadWallet(),coins:c});const w=loadWallet();paintCounters(w.coins);dispatchEvent(new CustomEvent('trottcoins:change',{detail:{coins:w.coins}}));return w.coins;};
    const before=loadWallet().coins,now=put(fn(before));say(`${label}: ${before.toLocaleString()} → ${now.toLocaleString()} Trotties`,()=>{put(before);say('Trotties put back.');});};
  box.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{const n=+b.dataset.add;money(c=>c+n,'+'+n.toLocaleString());});
  const inp=box.querySelector('.tools input');box.querySelector('[data-set]').onclick=()=>{const n=Math.floor(Number(inp.value));if(!(n>=0)||inp.value===''){say('Type a number first.');return;}money(()=>n,'Set');inp.value='';};
  // Time: a fixed game hour on this device (world-weather setDevHour) until Live clock; the sky follows at once.
  import('./world-weather.mjs?v=162').then(W=>{const sl=box.querySelector('[data-hourslider]'),label=h=>h==null?'the live clock':W.clockLabel(h);sl.value=W.devHourNow()??W.gameHours();
    const set=h=>{const before=W.devHourNow();W.setDevHour(h);if(h!=null)sl.value=h;say(h==null?'Back on the live clock.':`Time fixed at ${label(h)}.`,()=>{W.setDevHour(before);if(before!=null)sl.value=before;say(`Time put back to ${label(before)}.`);});};
    box.querySelectorAll('[data-hour]').forEach(b=>b.onclick=()=>set(b.dataset.hour==='live'?null:+b.dataset.hour));box.querySelectorAll('[data-weather]').forEach(b=>b.onclick=()=>{const before=W.devWeatherNow(),v=b.dataset.weather==='live'?null:b.dataset.weather;W.setDevWeather(v);const lab=k=>k?W.WEATHER[k].label:'the live weather';say(`Weather set to ${lab(v)}.`,()=>{W.setDevWeather(before);say(`Weather put back to ${lab(before)}.`);});});box.querySelectorAll('[data-moon]').forEach(b=>b.onclick=()=>{const before=W.devMoonNow(),v=b.dataset.moon==='live'?null:+b.dataset.moon;W.setDevMoon(v);const lab=m=>m==null?'the real moon':m>=1?'a full moon':'no moon';say(`Moon set to ${lab(v)}.`,()=>{W.setDevMoon(before);say(`Moon put back to ${lab(before)}.`);});});sl.oninput=()=>W.setDevHour(+sl.value);sl.onchange=()=>set(+sl.value);});
  // v139: legends on demand. Unicorn/pegasus need night to look right, so the clock jumps to 11 pm (Undo puts it back);
  // the moon pegasus needs the game's midnight, so 12:15 am.
  box.querySelectorAll('[data-legend]').forEach(b=>b.onclick=async()=>{const f=globalThis.__trottDevLegend;if(!f){say('Go out into the valley first, then try again.');return;}
    const kind=b.dataset.legend,W=await import('./world-weather.mjs?v=162'),before=W.devHourNow();if(kind!=='treats')W.setDevHour(kind==='moon'?.25:23);
    const text=f(kind);say(text,kind==='treats'?null:()=>{W.setDevHour(before);say('Time put back.');});});
  // New-player run: two taps (native confirm is blocked in Yoshi's browser), the save is backed up before anything is cleared.
  {const np=box.querySelector('[data-newplayer]'),idle=runInfo()?'🐣 Start over (test run is on)':'🐣 Start as a new player';let armed=0;np.textContent=idle;
    np.onclick=async()=>{if(!armed){armed=setTimeout(()=>{armed=0;np.textContent=idle;},4000);np.textContent=runInfo()?'Tap again to start over':'Tap again: your save is backed up first';return;}
      clearTimeout(armed);armed=0;np.disabled=true;np.textContent='Backing up…';try{await startNewPlayer();}catch(e){np.disabled=false;np.textContent=idle;say(e.message||'Backup failed. Nothing was changed.');}};}
  box.querySelectorAll('[data-fog]').forEach(b=>b.onclick=()=>{const f=globalThis.__trottDevFog;if(!f){say('Go out into the valley first, then try again.');return;}
    const kind=b.dataset.fog,before=f(kind);say(kind==='reset'?'Clouds reset: only where you stand is clear.':'Whole map revealed.',()=>{f('restore',before);say('Clouds put back.');});});}
function devStats(){if(!globalThis.document||document.querySelector('.dev-stats-btn'))return;
  let last=null,prev=new Map(),pick=null,box=null,queued=false;
  // Coin rewards and other bookkeeping follow the real action a moment later: keep the action as the cause.
  addEventListener('trottville:did',e=>{const t=e.detail?.type;if(last&&performance.now()-last.at<2500&&!['care','place'].includes(t)&&['care','place'].includes(last.type))return;last={...e.detail,at:performance.now()};});
  const css=document.createElement('style');css.textContent=`.dev-stats-btn{position:fixed;left:8px;top:42%;z-index:9998;width:44px;height:44px;border-radius:50%;border:2px solid #c89a64;background:#fffaf0e6;font-size:20px;box-shadow:0 3px 10px #0003;cursor:pointer}
.dev-stats{position:fixed;z-index:9999;width:min(236px,calc(100vw - 24px));max-height:62vh;overflow:auto;background:#fffaf0f2;border:2px solid #c89a64;border-radius:14px;box-shadow:0 6px 20px #0004;font:600 13px system-ui,sans-serif;color:#3a2a22}
.dev-stats header{display:flex;align-items:center;gap:6px;padding:6px 6px 6px 10px;background:#f1e2c4;border-radius:12px 12px 0 0;cursor:grab;touch-action:none;position:sticky;top:0}
.dev-stats header b{flex:1}.dev-stats select{font:600 13px system-ui;max-width:110px;min-height:32px}.dev-stats .x{min-width:36px;min-height:36px;border:0;background:none;font-size:18px;cursor:pointer}
.dev-stats ul{list-style:none;margin:0;padding:6px 10px 10px}.dev-stats li{display:grid;grid-template-columns:1fr auto;gap:2px 6px;padding:4px 0;border-bottom:1px solid #ead9b8;position:relative}
.dev-stats .bar{grid-column:1/3;height:5px;background:#ead9b8;border-radius:3px;overflow:hidden}.dev-stats .bar i{display:block;height:100%;background:#5d9a6a;transition:width .4s}
.dev-stats .fl{position:absolute;right:0;top:-2px;padding:1px 6px;border-radius:8px;font-size:12px;white-space:nowrap;animation:devfl 3.5s ease-out forwards;pointer-events:none}
.dev-stats .tools{padding:4px 10px 10px;border-top:2px solid #ead9b8}.dev-stats .tools b{display:block;margin:6px 0 4px;font-size:12px;color:#7a5a3a}
.dev-stats .row{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px}.dev-stats .row button,.dev-stats .msg button{flex:1;min-height:44px;border:2px solid #c89a64;border-radius:10px;background:#fff;font:700 13px system-ui;color:#3a2a22;cursor:pointer;padding:0 6px}
.dev-stats .row button:active,.dev-stats .msg button:active{background:#f1e2c4}.dev-stats .row input[type=range]{min-height:44px;accent-color:#c89a64}.dev-stats .row input{flex:1;min-width:0;min-height:44px;border:2px solid #c89a64;border-radius:10px;padding:0 8px;font:600 14px system-ui}
.dev-stats .msg{display:flex;align-items:center;gap:6px;margin:6px 0 0;padding:4px 4px 4px 8px;background:#3a2a22;color:#fffaf0;border-radius:10px;font-size:12px}.dev-stats .msg span{flex:1}.dev-stats .msg button{flex:0 0 auto;background:#ffcf3a;border-color:#ffcf3a}
.dev-stats .fl.up{background:#d8f0dc;color:#22603a}.dev-stats .fl.down{background:#f6d6d2;color:#8a2a22}
@keyframes devfl{0%{opacity:0;transform:translateY(4px)}8%{opacity:1;transform:none}75%{opacity:1}100%{opacity:0;transform:translateY(-10px)}}`;document.head.append(css);
  const btn=document.createElement('button');btn.type='button';btn.className='dev-stats-btn';btn.textContent='📊';btn.setAttribute('aria-label','Dev stats (only you see this)');document.body.append(btn);
  const saved=()=>{try{return JSON.parse(localStorage.getItem(DEV_KEY))||{};}catch{return {};}},save=o=>{try{localStorage.setItem(DEV_KEY,JSON.stringify({...saved(),...o}));}catch{}};
  function render(flashes=[]){if(!box)return;const all=snapshot();if(!all.length){box.querySelector('ul').innerHTML='<li>No horses yet.</li>';return;}
    if(!all.some(h=>h.id===pick))pick=all[0].id;const sel=box.querySelector('select');sel.innerHTML=all.map(h=>`<option value="${h.id}"${h.id===pick?' selected':''}>${h.name}</option>`).join('');
    const h=all.find(x=>x.id===pick);box.querySelector('ul').innerHTML=h.stats.map(([k,label,v,max,text])=>`<li data-k="${k}"><span>${label}</span><span>${text??v}${max&&v!=null&&text==null?' / '+max:''}</span>${max&&v!=null?`<span class="bar"><i style="width:${Math.max(0,Math.min(100,v/max*100))}%"></i></span>`:''}</li>`).join('');
    for(const f of flashes.filter(f=>f.id===pick)){const li=box.querySelector(`li[data-k="${f.k}"]`);if(!li)continue;const s=document.createElement('span');s.className='fl '+(f.d>0?'up':'down');s.textContent=(f.d>0?'+':'')+f.d+(f.cause?' · '+f.cause:'');s.onanimationend=()=>s.remove();li.append(s);}}
  // Compare with the last look; numbers that moved flash. The panel follows the horse that just changed.
  function refresh(){queued=false;const all=snapshot(),flashes=[];for(const h of all)for(const [k,,v] of h.stats){const key=h.id+':'+k,p=prev.get(key);if(typeof v==='number'&&typeof p==='number'&&v!==p&&!(k==='rest'&&Math.abs(v-p)<2&&!last))flashes.push({id:h.id,k,d:v-p,cause:causeOf(last)});prev.set(key,v);}
    if(flashes.length&&!flashes.some(f=>f.id===pick))pick=flashes[0].id;render(flashes);}
  const soon=()=>{if(!queued){queued=true;queueMicrotask(refresh);}};
  // Every save to this device's storage is a chance something moved (care, rides, raking): look again right away.
  const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){const out=set.call(this,k,v);if(box&&k!==DEV_KEY)soon();return out;};
  let tick=0;
  function open(){if(box)return close();box=document.createElement('section');box.className='dev-stats';box.setAttribute('aria-label','Dev stats');
    const pos=saved();box.style.left=(pos.x??60)+'px';box.style.top=(pos.y??90)+'px';
    box.innerHTML='<header><b>📊 Dev stats</b><select aria-label="Horse"></select><button type="button" class="x" aria-label="Close dev stats">×</button></header><ul></ul>'+TOOLS;document.body.append(box);tools(box);
    box.querySelector('.x').onclick=close;box.querySelector('select').onchange=e=>{pick=e.target.value;render();};
    const hd=box.querySelector('header');hd.addEventListener('pointerdown',e=>{if(e.target.closest('select,button'))return;const r=box.getBoundingClientRect(),ox=e.clientX-r.left,oy=e.clientY-r.top;hd.setPointerCapture(e.pointerId);
      const mv=m=>{box.style.left=Math.max(0,Math.min(innerWidth-60,m.clientX-ox))+'px';box.style.top=Math.max(0,Math.min(innerHeight-40,m.clientY-oy))+'px';};
      const up=()=>{hd.removeEventListener('pointermove',mv);hd.removeEventListener('pointerup',up);save({x:parseInt(box.style.left),y:parseInt(box.style.top),open:true});};hd.addEventListener('pointermove',mv);hd.addEventListener('pointerup',up);});
    prev=new Map();refresh();tick=setInterval(()=>{last=null;refresh();},5000);save({open:true});}
  function close(){box?.remove();box=null;clearInterval(tick);save({open:false});}
  btn.onclick=open;if(saved().open)open();}
// Shown only to the owner (claude.ai artifact owner, or the local dev server).
export function devStatsBoot(){if(globalThis.document&&runInfo()){if(document.readyState==='loading')addEventListener('DOMContentLoaded',runBar,{once:true});else runBar();}
  ownerKnown.then(ok=>{if(ok){if(document.readyState==='loading')addEventListener('DOMContentLoaded',devStats,{once:true});else devStats();}});}

// ---------------------------------------------------------------------------------------------------------------
// New-player test run (owner only, 2026-11-16; Yoshi: "through dev mode I'd like to have a way to test new user flow
// from very first thing they see to getting first horse"). "Start as a new player" copies EVERYTHING this site keeps in
// localStorage into IndexedDB (read back and compared before anything is cleared), clears the game's keys and reloads,
// so the page opens exactly as a first-time visitor sees it: loading bar, Play / Sign in, starter horse page. Sign-in
// stays off during the run (cloud.js), so the test horse never reaches the real account and the real sign-in is kept.
// A bar at the top times each step. "Back to my save" puts every key back exactly as it was; "Start over" clears again.
const RUN_KEY='trottville-newplayer-run';
const KEEP_RE=/^(meadowgate-auth-|meadowgate-supabase-config$|meadowgate-account-v1:|trottville-dev-stats$|trottville-newplayer-run$)/;
function runInfo(){try{return JSON.parse(localStorage.getItem(RUN_KEY));}catch{return null;}}
function backupDB(){return new Promise((ok,no)=>{const r=indexedDB.open('trottville-dev-backup',1);r.onupgradeneeded=()=>r.result.createObjectStore('b');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});}
async function backupDo(mode,fn){const db=await backupDB();return new Promise((ok,no)=>{const t=db.transaction('b',mode),q=fn(t.objectStore('b'));t.oncomplete=()=>ok(q.result);t.onerror=()=>no(t.error);});}
function reloadFresh(){history.replaceState(null,'',location.pathname+location.search);location.reload();}
async function startNewPlayer(){
  if(!runInfo()){// first run: back up the real save. A second tap during a run never backs up the test data over it.
    const all={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);all[k]=localStorage.getItem(k);}
    await backupDo('readwrite',st=>st.put({at:Date.now(),all},'save'));const back=await backupDo('readonly',st=>st.get('save'));
    if(!back?.all||Object.keys(back.all).length!==Object.keys(all).length||Object.entries(all).some(([k,v])=>back.all[k]!==v))throw new Error('The backup check failed. Nothing was changed.');}
  for(const k of Object.keys(localStorage))if(!KEEP_RE.test(k))localStorage.removeItem(k);
  try{for(const k of Object.keys(sessionStorage))if(k.startsWith('trottville'))sessionStorage.removeItem(k);}catch{}
  try{const d=JSON.parse(localStorage.getItem(DEV_KEY))||{};localStorage.setItem(DEV_KEY,JSON.stringify({...d,open:false}));}catch{}// a new player sees no dev panel
  localStorage.setItem(RUN_KEY,JSON.stringify({t:Date.now(),steps:[]}));reloadFresh();}
async function endNewPlayer(){const back=await backupDo('readonly',st=>st.get('save'));if(!back?.all)throw new Error('No backup found on this device.');
  for(const k of Object.keys(localStorage))if(!(k in back.all))localStorage.removeItem(k);
  for(const [k,v] of Object.entries(back.all))localStorage.setItem(k,v);
  try{for(const k of Object.keys(sessionStorage))if(k.startsWith('trottville'))sessionStorage.removeItem(k);}catch{}
  reloadFresh();}// the backup stays in IndexedDB until the next run replaces it
const clock=ms=>{const s=Math.max(0,Math.round(ms/1000));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
function runBar(){if(document.querySelector('.np-bar'))return;
  const css=document.createElement('style');css.textContent=`.np-bar{position:fixed;top:max(6px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:10002;width:min(440px,calc(100vw - 12px));background:#3a2a22f0;color:#fffaf0;border-radius:14px;box-shadow:0 4px 16px #0005;font:600 13px system-ui,sans-serif}
.np-bar .np-top{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:6px 6px 6px 12px}.np-bar .np-top b{flex:1 1 150px}.np-bar .np-btns{display:flex;gap:6px;margin-left:auto}.np-bar .np-t{font-variant-numeric:tabular-nums;color:#ffcf3a}
.np-bar button{min-height:44px;border:2px solid #ffcf3a;border-radius:10px;background:none;color:#fffaf0;font:700 12px system-ui;padding:0 8px;cursor:pointer}.np-bar button.np-end{background:#ffcf3a;color:#3a2a22}
.np-bar ol{margin:0;padding:4px 12px 10px 32px;max-height:40vh;overflow:auto;border-top:1px solid #fff3}.np-bar li{padding:3px 0}.np-bar li small{color:#ffcf3a;font-variant-numeric:tabular-nums;margin-left:6px}.np-bar .np-msg{padding:0 12px 8px;color:#ffcf3a}`;
  document.head.append(css);const bar=document.createElement('div');bar.className='np-bar';bar.setAttribute('role','region');bar.setAttribute('aria-label','New-player test (only you see this)');
  bar.innerHTML='<div class="np-top"><b>🐣 New-player test <span class="np-t"></span></b><span class="np-btns"><button type="button" data-np="steps" aria-expanded="false">Steps</button><button type="button" data-np="again">Start over</button><button type="button" class="np-end" data-np="end">Back to my save</button></span></div><ol hidden></ol><p class="np-msg" hidden></p>';
  document.body.append(bar);const ol=bar.querySelector('ol'),t=bar.querySelector('.np-t'),msg=bar.querySelector('.np-msg');let armed=null,timer=0;
  const say=x=>{msg.textContent=x;msg.hidden=!x;};
  const mark=(id,label)=>{const i=runInfo();if(!i||i.steps.some(s=>s[0]===id))return;i.steps.push([id,label,Date.now()-i.t]);try{localStorage.setItem(RUN_KEY,JSON.stringify(i));}catch{}paint();if(ol.hidden){say('✓ '+label);clearTimeout(timer);timer=setTimeout(()=>{if(!armed)say('');},3000);}};
  function paint(){const i=runInfo();if(!i)return;const done=i.steps.find(s=>s[0]==='horse');t.textContent=done?'· first horse in '+clock(done[2]):'· '+clock(Date.now()-i.t);
    ol.innerHTML=i.steps.map(([,l,ms])=>`<li>${l.replace(/[<&]/g,c=>c==='<'?'&lt;':'&amp;')}<small>${clock(ms)}</small></li>`).join('')||'<li>Waiting for the first screen…</li>';}
  // Steps are read off the page every half second, so the game itself needs no test hooks.
  const look=()=>{const st=document.getElementById('start'),open=st&&!st.hidden&&!st.classList.contains('gone');
    if(open&&!st.querySelector('.start-choices')?.hidden)mark('choices','Saw Play / Sign in to save');
    if(open&&!st.querySelector('.start-info')?.hidden)mark('info','Opened “What do guests miss?”');
    let choice=null;try{choice=localStorage.getItem('trottville-start-choice');}catch{}
    if(choice==='guest')mark('guest','Tapped Play (guest)');if(choice==='signin')mark('signin','Tapped Sign in (sign-in is off in tests)');
    const route=location.hash.slice(1)||'';if(!open&&route)mark('route:'+route,'Opened '+route);
    if(!open&&document.getElementById('rn-name'))mark('starter','Starter horse page');
    let herd=null;try{herd=JSON.parse(localStorage.getItem(RANCH_KEY)||'null')?.herd;}catch{}
    if(herd?.length)mark('horse','Got the first horse: '+herd[0].name);
    if(herd?.length&&route==='home')mark('home','Home with the horse');paint();};
  look();setInterval(look,500);addEventListener('hashchange',look);
  bar.addEventListener('click',async e=>{const b=e.target.closest('[data-np]');if(!b)return;const k=b.dataset.np;
    if(k==='steps'){ol.hidden=!ol.hidden;b.setAttribute('aria-expanded',String(!ol.hidden));return;}
    if(armed!==k){clearTimeout(timer);armed=k;say(k==='end'?'Tap “Back to my save” again to end the test and put your save back.':'Tap “Start over” again to clear the test horse and begin again.');timer=setTimeout(()=>{armed=null;say('');},4000);return;}
    armed=null;clearTimeout(timer);say(k==='end'?'Putting your save back…':'Starting over…');
    try{if(k==='end')await endNewPlayer();else await startNewPlayer();}catch(err){say(err.message||'Something went wrong. Nothing was changed.');}});}
