// The "Collect coins" moment. Games, races, discoveries and care never add Trotties silently: they queue
// them (economy.mjs keeps them in the wallet, so closing a game never loses them) and this shows a card with
// a big Collect coins button. Pressing it flies coins into the Trotties counter, which ticks up to the new
// total with a clink. Any element with [data-trottcoins] (containing a <b>) is a counter.
import './pixel-icons.js?v=162';
import {log as playLog} from './play-log.js?v=162';
import {loadWallet,saveWallet,coinHTML,coinWords} from './character-looks.mjs?v=162';
import {queue,collect,pendingTotal} from './economy.mjs?v=162';
import {loadRanch,saveRanch,addFood,FOOD} from './ranch.mjs?v=162';

const fmt=n=>Math.round(n).toLocaleString('en-US');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const still=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function emit(){const w=loadWallet();window.dispatchEvent(new CustomEvent('trottcoins:change',{detail:{coins:w.coins,pending:pendingTotal(w)}}));}
export const balance=()=>loadWallet().coins;
export const pending=()=>pendingTotal(loadWallet());

// Queue coins (and food) for collection. Returns the pending entry's id.
export function queueCoins(entry){if(!(entry.coins>0)&&!Object.values(entry.food||{}).some(v=>v>0))return null;playLog('reward',{from:entry.from,coins:entry.coins||0});const w=queue(loadWallet(),entry);saveWallet(w);emit();paintChip();return w.pending.at(-1).id;}

// Overlays must live where they'll be seen: inside a fullscreen game or an open modal dialog (top layer).
const host=()=>document.fullscreenElement||[...document.querySelectorAll('dialog[open]')].at(-1)||document.body;
const shown=el=>{if(!el?.isConnected)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&getComputedStyle(el).visibility!=='hidden';};
function counters(){return [...document.querySelectorAll('[data-trottcoins]')];}
export function paintCounters(value=balance()){for(const el of counters()){const b=el.querySelector('b')||el;b.innerHTML=coinHTML(value);}}
function flyTarget(within){const list=counters().filter(el=>shown(el)&&within.contains(el));if(list.length)return {el:list.at(-1),temp:false};
  const el=document.createElement('div');el.className='tc-float';el.setAttribute('data-trottcoins','');el.innerHTML=`<span aria-hidden="true">🪙</span><b>${coinHTML(balance())}</b>`;within.append(el);return {el,temp:true};}

let audio;
function clink(i){try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();const t=audio.currentTime,o=audio.createOscillator(),g=audio.createGain();
  o.type='triangle';o.frequency.setValueAtTime(1500+(i%3)*260,t);o.frequency.exponentialRampToValueAtTime(2400+(i%3)*200,t+.05);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.14,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+.22);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+.25);}catch{}}

// Coins arc from `from` (a button) to the counter. The counter ticks up as each coin lands.
function fly(from,amount,start,within,done){const {el:target,temp}=flyTarget(within);const b=target.querySelector('b')||target;
  const a=from.getBoundingClientRect(),z=target.getBoundingClientRect(),n=Math.max(5,Math.min(16,Math.round(amount/6)));
  const finish=()=>{b.innerHTML=coinHTML(start+amount);target.classList.remove('tc-bump');void target.offsetWidth;target.classList.add('tc-bump');
    paintCounters(start+amount);if(temp)setTimeout(()=>target.classList.add('tc-float-out'),900),setTimeout(()=>target.remove(),1400);done?.();};
  if(still()||!amount){finish();return;}
  let landed=0;
  for(let i=0;i<n;i++){const c=document.createElement('span');c.className='tc-coin';c.textContent='🪙';within.append(c);
    const x0=a.left+a.width/2+(Math.random()-.5)*a.width*.6,y0=a.top+a.height/2,x1=z.left+z.width/2,y1=z.top+z.height/2,mx=(x0+x1)/2+(Math.random()-.5)*120,my=Math.min(y0,y1)-60-Math.random()*90;
    const anim=c.animate([{transform:`translate(${x0}px,${y0}px) scale(.6)`,opacity:0},{transform:`translate(${x0}px,${y0-30}px) scale(1.15)`,opacity:1,offset:.12},{transform:`translate(${mx}px,${my}px) scale(1)`,offset:.55},{transform:`translate(${x1}px,${y1}px) scale(.55)`,opacity:.9}],
      {duration:720+Math.random()*200,delay:i*70,easing:'cubic-bezier(.45,0,.35,1)',fill:'both'});
    anim.onfinish=()=>{c.remove();landed++;clink(landed);b.innerHTML=coinHTML(start+amount*landed/n);target.classList.remove('tc-tick');void target.offsetWidth;target.classList.add('tc-tick');if(landed===n)finish();};}}

// The Collect card. `ids` limits it to some pending entries (a game's own result); default = everything waiting.
let open=null;
export function showCollect({title='Lovely work!',ids,onDone}={}){const w=loadWallet(),items=(w.pending||[]).filter(p=>!ids||ids.includes(p.id));
  if(!items.length){onDone?.();return null;}
  open?.remove();const within=host(),coins=items.reduce((s,p)=>s+p.coins,0),food={};for(const p of items)for(const [k,v] of Object.entries(p.food||{}))if(v>0)food[k]=(food[k]||0)+v;
  const lines=items.flatMap(p=>p.lines?.length?p.lines.map(l=>({from:p.from,l})):[{from:p.from,l:`${p.coins} 🪙`}]);
  const sheet=document.createElement('div');sheet.className='tc-sheet';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-label','Collect your Trotties');
  sheet.innerHTML=`<div class="tc-card"><div class="tc-burst" aria-hidden="true">🪙</div><h2>${esc(title)}</h2>
    <ul class="tc-lines">${lines.map(x=>{const m=/^(.*?)\s*·\s*\+?([\d,]+)\s*🪙\s*$/u.exec(x.l)||(/^\+?([\d,]+)\s*🪙$/u.test(x.l)?[0,x.from||'Trotties',x.l.replace(/\D/g,'')]:null),t=m?m[1]:x.l,src=x.from&&!t.includes(x.from)&&!t.includes(x.from.replace(/^Ride to/,'Rode to'))?x.from:'';
      return `<li><span class="tc-l">${src?`<small>${esc(src)}</small>`:''}<b>${esc(t)}</b></span>${m?`<span class="tc-n">+${esc(m[2])} <i aria-hidden="true">🪙</i></span>`:''}</li>`;}).join('')}${Object.entries(food).map(([k,v])=>`<li class="tc-food"><span class="tc-l"><small>Food for your horses</small><b>${esc(FOOD[k]?.name||k)}${v>1&&k!=='hay'?'s':''}</b></span><span class="tc-n">+${v} <i aria-hidden="true">${FOOD[k]?.icon||''}</i></span></li>`).join('')}</ul>
    <div class="tc-total"><span>Your total</span><span class="tc-total-n" data-trottcoins><b>${coinHTML(w.coins)}</b></span><span class="tc-plus">+${fmt(coins)} 🪙</span></div>
    <button type="button" class="tc-collect">${coins?`Collect ${fmt(coins)} Trotties`:'Collect'}</button></div>`;
  within.append(sheet);open=sheet;const btn=sheet.querySelector('.tc-collect');requestAnimationFrame(()=>{sheet.classList.add('in');btn.focus({preventScroll:true});});
  btn.addEventListener('click',()=>{if(btn.disabled)return;btn.disabled=true;btn.textContent='Collecting…';
    const res=collect(loadWallet(),items.map(p=>p.id));saveWallet(res.wallet);
    if(Object.keys(res.food).length){const r=loadRanch();if(r)saveRanch(addFood(r,res.food));}
    fly(btn,res.coins,w.coins,sheet,()=>{emit();paintChip();setTimeout(()=>{sheet.classList.remove('in');sheet.classList.add('out');setTimeout(()=>{sheet.remove();if(open===sheet)open=null;paintChip();onDone?.(res);},260);},500);});});
  return sheet;}

// Coins waiting never pop up on their own: every Trotties counter gets a small "+25" badge, and tapping the
// counter opens the Collect card (the header counter's own handler in horselandia.js does the same).
const noChip=()=>document.documentElement.hasAttribute('data-no-chip');// game pages collect at the end of a round instead
export function paintChip(){if(noChip())return;const p=pending();
  for(const el of counters()){if(el.closest('.tc-sheet'))continue;
    if(p>0&&!open){el.dataset.pending='+'+fmt(p);el.classList.add('tc-has-pending');el.setAttribute('title',`${fmt(p)} Trotties waiting. Tap to collect.`);}
    else if(el.classList.contains('tc-has-pending')){delete el.dataset.pending;el.classList.remove('tc-has-pending');el.removeAttribute('title');}}}
document.addEventListener('click',e=>{const el=e.target.closest?.('.tc-has-pending');if(!el||el.id==='tc-counter'||open)return;
  e.preventDefault();e.stopPropagation();showCollect({title:'Trotties waiting for you'});},true);
// Counters drawn later (a game's top bar, the world HUD) get their badge as soon as they appear.
if(!noChip())new MutationObserver(()=>{if(pending()>0&&counters().some(el=>!el.classList.contains('tc-has-pending')&&!el.closest('.tc-sheet')))paintChip();}).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('storage',e=>{if(e.key==='trottville-wallet-v1'){paintCounters();paintChip();}});
