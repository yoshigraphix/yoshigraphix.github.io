// Trottville Quest Log (the book) + markup for the world's Talk dialog and badge celebrations.
// Original design: a stitched leather notebook with a ribbon, warm paper pages and stamp-like tiles.
// Buttons use data-ql-* / data-quest-action only (horselandia.js listens globally for data-tab/route/action/…).
import {activeList,log,badges,GIVER_BY_ID,QUEST_BY_ID,QUEST_TOTAL} from './quests.mjs?v=158';
import {iconHTML} from './pixel-icons.js?v=158';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mmss=s=>Math.floor(Math.max(0,s)/60)+':'+String(Math.max(0,s)%60).padStart(2,'0');

// Adds quest-log.css once (relative to this module).
export function ensureQuestLogCss(){
  if(typeof document==='undefined'||document.querySelector('link[data-ql-css]'))return;
  const l=document.createElement('link');l.rel='stylesheet';l.href=new URL('./quest-log.css',import.meta.url).href;l.dataset.qlCss='1';document.head.appendChild(l);
}

function activeHTML(state,now){
  const list=activeList(state,now);
  if(!list.length)return `<div class="ql-empty"><p class="ql-empty-big">No favours on the go.</p><p>Ride up to someone with a <span class="ql-mark">!</span> over their head and tap Talk.</p></div>`;
  return `<ul class="ql-active">${list.map(a=>`<li class="ql-card${a.ready?' is-ready':''}${a.secondsLeft<=60?' is-hurry':''}">
    <span class="ql-card-icon" aria-hidden="true">${iconHTML(a.icon,a.px)}</span>
    <div class="ql-card-body">
      <p class="ql-card-num">${a.odd?'Odd job':'No. '+a.n} · for ${esc(a.giverName)}</p>
      <h3>${esc(a.title)}</h3>
      <p class="ql-todo">${esc(a.todo)}</p>
      ${a.progress?`<div class="ql-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${a.progress.need}" aria-valuenow="${a.progress.have}"><i style="width:${Math.round(a.progress.have/a.progress.need*100)}%"></i></div>`:''}
      <p class="ql-meta"><span class="ql-time" data-ql-left="${a.secondsLeft}">⏳ ${mmss(a.secondsLeft)}</span><span>🪙 ${a.reward}</span>${a.mounted?'<span class="ql-tag">🐴 on horseback</span>':''}</p>
    </div>
    ${a.target?`<button type="button" class="ql-pin" data-ql-pin="${esc(a.id)}">📍 Show on map</button>`:''}
  </li>`).join('')}</ul>`;
}
function doneHTML(state,now){
  const L=log(state,now);
  return `<p class="ql-sub">${L.done} of ${L.total} favours done${L.oddDone?` · ${L.oddDone} odd job${L.oddDone===1?'':'s'}`:''}</p>
  <ol class="ql-grid">${L.entries.map(e=>e.status==='done'
    ?`<li class="ql-tile is-done" title="${esc(e.title)} · ${esc(e.giverName)}"><span class="ql-tile-n">${e.n}</span><span class="ql-tile-icon" aria-hidden="true">${iconHTML(e.icon,e.px)}</span><span class="ql-tile-t">${esc(e.title)}</span></li>`
    :`<li class="ql-tile is-${e.status}" aria-label="Favour ${e.n}: ${e.status==='active'?'on the go':e.status==='failed-today'?'try again another day':'not found yet'}"><span class="ql-tile-n">${e.n}</span><span class="ql-tile-icon" aria-hidden="true">${e.status==='active'?'✎':'?'}</span></li>`).join('')}</ol>`;
}
function badgesHTML(state){
  return `<ul class="ql-badges">${badges(state).map(b=>`<li class="ql-badge${b.earned?' is-earned':''}${b.big?' is-big':''}">
    <span class="ql-badge-icon" aria-hidden="true">${iconHTML(b.icon,b.px)}</span><h3>${esc(b.name)}</h3><p>${esc(b.about)}</p>
    <p class="ql-badge-count">${b.earned?'Earned!':`${b.have} / ${b.need}`}</p></li>`).join('')}</ul>`;
}

// Opens the book. Returns {close, update(state,now)}. Escape or × closes. onPin(questId) for "Show on map".
export function openQuestLog({state,now,onPin,onClose,tab='active',host}={}){
  ensureQuestLogCss();
  const root=document.createElement('div');root.className='ql-root';
  root.innerHTML=`<div class="ql-scrim" data-ql-close></div>
  <section class="ql-book" role="dialog" aria-modal="true" aria-labelledby="ql-title">
    <span class="ql-ribbon" aria-hidden="true"></span>
    <header class="ql-head"><h2 id="ql-title">Quest Log <span class="ql-count"></span></h2><button type="button" class="ql-x" data-ql-close aria-label="Close">×</button></header>
    <nav class="ql-tabs" role="tablist">${[['active','On the go'],['done','Done'],['badges','Badges']].map(([id,l])=>`<button type="button" role="tab" data-ql-tab="${id}">${l}</button>`).join('')}</nav>
    <div class="ql-page" role="tabpanel"></div>
  </section>`;
  let cur={state,now},open=true,ticker=null;
  const page=root.querySelector('.ql-page'),count=root.querySelector('.ql-count');
  function render(){
    count.textContent=`· ${Object.keys(cur.state.done||{}).length} / ${QUEST_TOTAL}`;
    root.querySelectorAll('[data-ql-tab]').forEach(b=>{const on=b.dataset.qlTab===tab;b.setAttribute('aria-selected',on);b.classList.toggle('is-on',on);});
    page.innerHTML=tab==='active'?activeHTML(cur.state,cur.now):tab==='done'?doneHTML(cur.state,cur.now):badgesHTML(cur.state);
  }
  function close(){if(!open)return;open=false;clearInterval(ticker);document.removeEventListener('keydown',onKey,true);root.remove();onClose?.();}
  function onKey(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}}
  root.addEventListener('click',e=>{
    const t=e.target.closest('[data-ql-tab],[data-ql-close],[data-ql-pin]');if(!t)return;
    if(t.dataset.qlTab){tab=t.dataset.qlTab;render();page.scrollTop=0;}
    else if('qlClose' in t.dataset)close();
    else if(t.dataset.qlPin){onPin?.(t.dataset.qlPin);}
  });
  // Count the time-left labels down between updates (display only; the engine owns the clock).
  ticker=setInterval(()=>{if(tab!=='active')return;page.querySelectorAll('[data-ql-left]').forEach(el=>{const v=Math.max(0,Number(el.dataset.qlLeft)-1);el.dataset.qlLeft=v;el.textContent='⏳ '+mmss(v);});},1000);
  document.addEventListener('keydown',onKey,true);
  (host||document.body).appendChild(root);render();root.querySelector('.ql-x').focus({preventScroll:true});
  return {close,update(state,now){cur={state,now};if(open)render();},get open(){return open;}};
}

// Body markup for the world's Talk dialog. result = quests.talk(...) output; giver = GIVER_BY_ID[...] (optional).
export function talkHTML(result,giver=result?.giver){
  const g=giver||{name:'Someone'},q=result?.quest,kind=result?.kind||'chat';
  const lines=(result?.lines||[]).map(l=>`<p>${esc(l)}</p>`).join('');
  const to=q?.kind==='deliver'?GIVER_BY_ID[q.to]?.name:null;
  const showCard=q&&['offer','needs-horse','turnin','receive','reminder'].includes(kind);
  const card=showCard?`<div class="ql-qcard${kind==='turnin'||kind==='receive'?' is-done':''}">
    <span class="ql-qcard-icon" aria-hidden="true">${iconHTML(q.icon,q.px)}</span>
    <div><p class="ql-qcard-num">${q.odd?'Odd job':'Favour No. '+q.n}</p><h3>${esc(q.title)}</h3>
    <p class="ql-meta"><span>🪙 ${result.reward??q.reward}</span>${kind==='offer'||kind==='needs-horse'?`<span>⏳ ${q.minutes} min</span>`:''}${q.mounted?'<span class="ql-tag">🐴 needs your horse</span>':''}${q.fragile?'<span class="ql-tag">🥚 fragile</span>':''}${to?`<span>→ ${esc(to)}</span>`:''}</p></div></div>`:'';
  const done=(kind==='turnin'||kind==='receive')&&result.reward?`<p class="ql-paid">+${result.reward} 🪙 Trotties</p>`:'';
  const btns=kind==='offer'
    ?`<button type="button" class="ql-btn is-main" data-quest-action="accept" data-quest="${esc(q.id)}">I'll help!</button><button type="button" class="ql-btn" data-quest-action="later" data-quest="${esc(q.id)}">Maybe later</button>`
    :`<button type="button" class="ql-btn is-main" data-quest-action="ok"${q?` data-quest="${esc(q.id)}"`:''}>${kind==='turnin'||kind==='receive'?'Hooray!':'OK'}</button>`;
  return `<div class="ql-talk is-${esc(kind)}"><div class="ql-bubble"><p class="ql-who">${esc(g.name)}</p>${lines}</div>${card}${done}<div class="ql-actions">${btns}</div></div>`;
}

// Celebration popup for a freshly earned badge.
export function badgeToastHTML(badge){
  return `<div class="ql-toast${badge?.big?' is-big':''}" role="status"><span class="ql-toast-icon" aria-hidden="true">${iconHTML(badge?.icon,badge?.px)}</span><div><p class="ql-toast-kicker">New badge!</p><p class="ql-toast-name">${esc(badge?.name)}</p><p class="ql-toast-about">${esc(badge?.about||'')}</p></div></div>`;
}
export {QUEST_BY_ID};
