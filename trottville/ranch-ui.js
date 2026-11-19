// Ranch screens: pick your free starter horse, the herd (1 to 100 horses), feed store, vet, horse market and
// the bell. Logic lives in ranch.mjs; this file draws it. horselandia.js loads it once and asks it for page
// HTML; buttons here use data-ranch="…" (never data-action / data-route / data-tab, which horselandia's
// global click handler owns). Device-only for now: the shared market and coins move to Supabase later.
import * as R from './ranch.mjs?v=160';
import {iconHTML} from './pixel-icons.js?v=160';
import * as Coins from './coin-collect.js?v=160';
import {loadWallet,saveWallet,coinHTML} from './character-looks.mjs?v=160';
import * as F from './friends.js?v=160';
import {GROUPS,sizeLabel,wikiUrl,searchText} from './breeds.mjs?v=160';
import {horsePortrait} from './horse-portrait.js?v=160';
import {horseLook} from './horse-sculpt.js?v=160';
import * as G from './riding.mjs?v=160';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.round(n).toLocaleString('en-US');
const toast=m=>window.TrottToast?window.TrottToast(m):console.log(m);
let ranch=R.loadRanch();
export {R,Coins};
export const get=()=>ranch;
export function set(r,{quiet=false}={}){const before=new Set((ranch?.herd||[]).filter(h=>G.isTamed(h)).map(h=>h.id)),had=new Set((ranch?.herd||[]).map(h=>h.id));ranch=r;R.saveRanch(r);
  // Care just won a horse's trust: tell the player, the saddle lesson waits in the 3D world.
  for(const h of r.herd)if(h.tamed===true&&!before.has(h.id)&&had.has(h.id)&&ranch){toast(`${h.name} is tamed! Head to the 3D world and saddle up.`);addStat('tamedHorses',1);}
  if(!quiet)window.dispatchEvent(new CustomEvent('ranch:change'));else queueSave();shareCard();}
// #11: friends feed this device herd from its visiting card; their meals arrive as notes with the bell.
function shareCard(){try{if(ranch?.herd?.length)F.shareHerd({...R.herdCard(ranch),badges:R.topBadges(stats(),8),barn:ranch.barnLevel||0,...(ranch.pet?{pet:{id:ranch.pet.id,name:R.horseNameProblem(ranch.pet.name)?'':ranch.pet.name}}:{})});}catch{}}
window.addEventListener('friends:change',()=>{if(!ranch?.herd?.length)return;pullTames();const res=R.applyFriendMeals(ranch,F.friendNotes());
  if(res.ranch!==ranch){set(res.ranch);if(res.fed.length)toast(`${res.fed.join(', ')} ${res.fed.length>1?'have':'has'} had today’s meal from a friend 🥕`);}
  else shareCard();});
export const horse=id=>ranch?.herd.find(h=>h.id===id)||null;
function spend(coins){const w=loadWallet();if(w.coins<coins)return false;saveWallet({...w,coins:w.coins-coins});Coins.paintCounters();return true;}
function spendStars(stars){const w=loadWallet();if(w.stars<stars)return false;saveWallet({...w,stars:w.stars-stars});return true;}

// The horse's portrait: the same sculpted 3D horse as the world, photographed in its own colours
// (horse-portrait.js). The painted SVG below is only a fallback for devices without WebGL.
const cache=new Map();
const TIER_BG={starter:'#e9eee5',common:'#eef0e4',uncommon:'#e6eef3',special:'#f6ecd8',rare:'#efe3f4',legendary:'#fbefc8',wild:'#e9eee5',longears:'#efe6da'};
export function portrait(h,{w=256,h:tall=w}={}){const c=h.coat||{},key=h.id+(c.coatName||'')+(c.pattern||'')+(w!==256||tall!==256?`@${w}x${tall}`:'');if(cache.has(key))return cache.get(key);
  const bg=TIER_BG[R.breedOf(h.breedId).tier]||'#e9eee5',shot=horsePortrait({id:h.id,coat:h.coat},{bg,w,h:tall,key:'rn|'+key});
  if(shot){cache.set(key,shot);return shot;}
  const white=c.white||'#f5ecd6';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${bg}"/><circle cx="58" cy="60" r="40" fill="#fff" opacity=".5"/>
<path d="M24 100C21 74 27 54 41 39C45 29 51 21 56 17L57 6L63 15C71 16 79 23 85 33C91 41 95 49 93 55C91 61 83 61 77 57C71 55 67 57 63 63C59 71 61 86 65 100Z" fill="${c.coat}" stroke="${c.ink}" stroke-width="2.4" stroke-linejoin="round"/>
${c.patches?`<path d="M30 100C30 84 36 74 46 70C54 68 58 78 56 100Z" fill="${white}" opacity=".95"/>`:''}${c.dapple?`<g fill="${c.belly}" opacity=".7"><circle cx="40" cy="70" r="4"/><circle cx="50" cy="82" r="3.5"/><circle cx="36" cy="88" r="3"/><circle cx="47" cy="56" r="3"/></g>`:''}${c.spots?`<g fill="${c.mane}"><circle cx="38" cy="78" r="2.4"/><circle cx="46" cy="88" r="2"/><circle cx="33" cy="92" r="2.2"/><circle cx="52" cy="76" r="1.8"/></g>`:''}
<path d="M41 39C35 47 29 61 27 81L24 100L18 98C16 72 24 50 39 35C44 26 50 18 56 14L58 20C52 25 46 31 41 39Z" fill="${c.mane}" stroke="${c.ink}" stroke-width="2" stroke-linejoin="round"/>
${c.blaze?`<path d="M72 25C77 33 83 42 88 51" stroke="${white}" stroke-width="5.5" stroke-linecap="round" fill="none"/>`:''}
<ellipse cx="88" cy="53" rx="6" ry="4.5" fill="${c.muzzle}" opacity=".85"/><circle cx="68" cy="30" r="4.6" fill="${c.ink}"/><circle cx="69.6" cy="28.6" r="1.6" fill="#fff"/></svg>`;
  const url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);cache.set(key,url);return url;}

const chip=(h,now=Date.now())=>{const c=R.condition(h,now);return `<span class="rn-cond rn-${c.id}">${c.icon} ${esc(c.label)}</span>`;};
function xpBar(h){const l=R.level(h.xp),a=R.levelFloor(l),b=R.levelFloor(l+1),p=Math.round(((h.xp||0)-a)/(b-a)*100);
  return `<div class="rn-xp" aria-label="Level ${l}, ${p}% to level ${l+1}"><b>Lv ${l}</b><i><s style="width:${p}%"></s></i><small>${fmt(h.xp||0)} XP</small></div>`;}
function restLine(h){const rest=R.restNow(h),m=R.mood(rest);return `<span class="rn-rest rn-${m.id}" title="Rest comes back at ${R.REST_PER_HOUR} an hour">${m.id==='lively'?'⚡':m.id==='sleepy'?'🥱':'💤'} ${esc(m.label)}</span>`;}

// ---------- Starter pick (a brand-new account) ----------
// The horse is the same live 3D horse as the home page (horse-viewer.js). Free starters come in one solid
// colour; the breed's other real colours (and white markings) show greyed out with a lock: you can preview
// them on the horse, but they are store upgrades for later and can't be picked yet.
// v153 (2026-11-17, Yoshi): no "New look" shuffle for players. The game shuffles ONCE when someone first arrives and keeps
// that draw on the device, so coming back (or reloading) shows the very same three horses.
const SEED_KEY='trottville-starter-seed';
const pickSeed=(()=>{try{let v=localStorage.getItem(SEED_KEY);if(!v){v=String(Date.now())+'-'+Math.floor(Math.random()*1e6);localStorage.setItem(SEED_KEY,v);}return v;}catch{return String(Date.now());}})();
let pickBreed=R.STARTERS[0].id,pickLook=null,pickName='';
let viewer=null,viewerLoading=null,showRider=true;const NAME_HINT=[...pickSeed].reduce((n,c)=>n+c.charCodeAt(0),0)%5;const shots=new Map();
const lookCoat=()=>pickLook?R.lockedCoats(pickBreed).find(l=>l.id===pickLook)?.coat||R.starterCoat(pickBreed):R.starterCoat(pickBreed);
// Each breed gets its own look from the page's seed; "New look" draws a fresh seed. The chosen look is stored on the horse.
const starterLook=breedId=>horseLook(pickSeed+':'+breedId);
const starterHorse=(breedId,coat)=>({id:'starter-'+breedId,name:'Your horse',breedId,coat,size:R.breedOf(breedId).size,look:starterLook(breedId)});
const shotKey=id=>id+':'+pickSeed;
// v154: five stat bars (ranch.mjs horseStats). Low to start; they grow with levels and trust.
function statBars(st,cls=''){return `<div class="rn-sbars ${cls}" aria-label="Stats">${R.STAT_NAMES.map(([k,label])=>`<div class="rn-stat"><span>${label}</span><div class="rn-stat-bar" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${st[k]}"><i class="rn-st-${k}" style="width:${st[k]}%"></i></div><b>${st[k]}</b></div>`).join('')}</div>`;}
// v154: the (i) on each first-horse card: a short read about that breed.
function openBreedInfo(id){const b=R.breedOf(id),st=R.horseStats({breedId:id,xp:0},{bond:G.STARTER_TRUST/G.TAME_AT*100});
  openSheet(`About the ${b.name}`,`<div class="rn-binfo"><p class="rn-binfo-trait">${esc(b.trait)}</p><p>${esc(b.fact)}</p>
  <dl><dt>Comes from</dt><dd>${esc(b.origin)}</dd><dt>Size</dt><dd>${esc(sizeLabel(b.size))}</dd><dt>Real horses cost</dt><dd>about $${fmt(b.usd)}</dd></dl>
  <h3>Starting stats</h3>${statBars(st)}<p class="small">Every stat grows as your horse levels up and trusts you more.</p>
  <div class="rn-binfo-go"><button type="button" class="primary" data-ranch="breedpick" data-v="${esc(id)}">Pick the ${esc(b.name)}</button><a href="${wikiUrl(b)}" target="_blank" rel="noopener noreferrer" class="text-button">Read more on Wikipedia ↗</a></div></div>`,'rn-binfo-sheet');}
export function starterPage(){const b=R.breedOf(pickBreed),free=R.starterCoat(pickBreed),hint=['Maple','Biscuit','Juniper','Clover','Hazel'][NAME_HINT];
  // v153: one calm screen for a brand-new player (Yoshi: "I was so lost"). No app bars (body.rn-adopt), no locked colours,
  // no rider switch, no shuffle. Pick (3 cards) → name → one button.
  return `<section class="rn-starter rn-adopt-page"><header class="rn-ad-head"><h1>Meet your first horse</h1><p>Tap a horse to pick it. Your first horse is free, and so is their food.</p></header>
  <div class="rn-pick-3d" id="rn-viewer-slot"><span class="rn-pick-wait" aria-hidden="true"></span></div>
  <div class="rn-ad-name"><div><b>${esc(b.name)}</b><small>${esc(free.coatName)} · ${esc(R.STARTERS.find(x=>x.id===pickBreed)?.trait||'')}</small></div><span aria-hidden="true">↻ Drag to turn</span></div>
  ${statBars(R.horseStats({breedId:pickBreed,xp:0},{bond:G.STARTER_TRUST/G.TAME_AT*100}),'rn-ad-stats')}
  <div class="rn-ad-step"><i>1</i>Pick your horse</div>
  <div class="rn-breeds" role="radiogroup" aria-label="Pick your horse">${R.STARTERS.map(s=>`<div class="rn-breed-card"><button type="button" role="radio" aria-checked="${s.id===pickBreed}" data-ranch="breed" data-v="${s.id}"><img data-shot="${s.id}" src="${shots.get(shotKey(s.id))||BLANK}" alt=""><b>${esc(s.name)}</b></button><button type="button" class="rn-info" data-ranch="breedinfo" data-v="${s.id}" aria-label="About the ${esc(s.name)}">i</button></div>`).join('')}</div>
  <label class="rn-ad-step rn-name" for="rn-name"><span><i>2</i>Give them a name</span><input id="rn-name" maxlength="20" value="${esc(pickName)}" placeholder="${esc(hint)}" autocomplete="off" enterkeyhint="done"></label>
  <button type="button" class="primary rn-big" data-ranch="start" data-hint="${esc(hint)}">Bring ${esc(pickName.trim()||hint)} home</button></section>`;}
// Called after the starter page is drawn: put the live 3D horse in its slot (kept across re-draws).
// Until the 3D stage is ready the slots show a soft empty card (never the flat painted horse).
const BLANK='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
export function mountStarter(){const slot=document.getElementById('rn-viewer-slot');if(!slot)return;
  const show=()=>{if(!viewer)return;slot.querySelector('.rn-pick-wait')?.remove();slot.prepend(viewer.el);
    const h=starterHorse(pickBreed,lookCoat()),cur=viewer.horse;
    if(!cur||cur.breedId!==h.breedId||JSON.stringify(cur.coat)!==JSON.stringify(h.coat)||JSON.stringify(cur.look)!==JSON.stringify(h.look))viewer.setHorse(h);
    if(viewer.rider!==true)viewer.setRider(true);
    for(const s of R.STARTERS)if(!shots.has(shotKey(s.id))){shots.set(shotKey(s.id),viewer.snapshot(starterHorse(s.id,R.starterCoat(s.id))));}
    document.querySelectorAll('[data-shot]').forEach(img=>{img.src=shots.get(shotKey(img.dataset.shot));});};
  if(viewer)return show();
  if(!viewerLoading)viewerLoading=import('./horse-viewer.js?v=160').then(m=>{viewer=m.createHorseViewer({horse:starterHorse(pickBreed,lookCoat()),label:'Your first horse. Drag to turn.'});viewerLoading=null;}).catch(()=>{viewerLoading=null;});
  viewerLoading?.then(()=>{if(document.getElementById('rn-viewer-slot'))mountStarter();});}
export function disposeStarter(){viewer?.dispose();viewer=null;}

// ---------- Stable: the whole herd ----------
let filter='all',search='';
export function stablePage(){const now=Date.now(),w=loadWallet(),herd=ranch.herd,alerts=R.alerts(ranch,now),food=ranch.food,free=R.freeHorse(ranch);
  const hungry=herd.filter(h=>(h.lastFed??-1)<R.dayNo(now)&&R.condition(h,now).id!=='unwell').length;
  let list=herd;if(filter==='hungry')list=herd.filter(h=>R.condition(h,now).id!=='fed');if(filter==='vet')list=herd.filter(h=>R.condition(h,now).id==='unwell');
  if(search)list=list.filter(h=>(h.name+' '+h.breed).toLowerCase().includes(search.toLowerCase()));
  return `<section class="page-title"><div class="eyebrow">YOUR RANCH</div><h1>Your stable</h1>
  <p>${herd.length===1?'One horse and a whole lot of love.':`${herd.length} horses. Each one needs a meal a day; ${free?esc(free.name)+'’s':'your first horse’s'} food is free.`}</p></section>
  ${alerts.length?`<div class="rn-alerts">${alerts.map(a=>`<div class="rn-alert"><span>${a.icon}</span>${esc(a.text)}${a.id==='vet'?'<button type="button" data-ranch="vet">Visit the vet</button>':a.id==='food'?'<button type="button" data-ranch="store">Feed store</button>':''}</div>`).join('')}</div>`:''}
  <div class="rn-pantry"><div class="rn-pantry-items" aria-label="Your pantry">${['carrot','apple','hay','golden'].filter(k=>k!=='golden'||food.golden).map(k=>`<span title="${R.FOOD[k].name}">${R.FOOD[k].icon} <b>${fmt(food[k]||0)}</b></span>`).join('')}${pantryDays(now)}${free?`<span class="rn-free" title="Refills every day">🧺 ${esc(free.name)}: <b>${R.basketFor(ranch,free).left}</b> free</span>`:''}</div>
  <div class="rn-pantry-actions">${hungry>1?`<button type="button" class="primary" data-ranch="feedall">Feed everyone (${hungry})</button>`:''}<div class="rn-stools">${[['store','🥕','Food','Feed store','carrot'],['market','🐴','Market','Horse market','place-horsemarket'],['vet','🩺','Vet','Vet','place-vet'],['breeds','📖','Breeds','Breed guide','book'],['badges','🏅','Badges','Badges','badge'],['foal','🍼','Foal','Breed a foal','item-foal'],...(R.currentShow()?[['show',R.currentShow().icon,'Show',R.currentShow().name,'rosette']]:[])].map(([k,i,l,a,px])=>`<button type="button" class="rn-stool" data-ranch="${k}" aria-label="${a}"><span aria-hidden="true">${iconHTML(i,px,'px-lg')}</span>${l}</button>`).join('')}</div></div></div>
  ${herd.length>6?`<div class="rn-filters"><div role="group" aria-label="Show">${[['all','All'],['hungry','Needs food'],['vet','Needs the vet']].map(([k,l])=>`<button type="button" data-ranch="filter" data-v="${k}" aria-pressed="${filter===k}">${l}</button>`).join('')}</div>${herd.length>12?`<input type="search" id="rn-search" placeholder="Find a horse" value="${esc(search)}" aria-label="Find a horse">`:''}</div>`:''}
  ${barnPanel(now)}
  <div class="rn-herd">${list.map(h=>`<article class="rn-card"><button type="button" class="rn-card-main" data-horse="${esc(h.id)}" aria-label="Visit ${esc(h.name)}"><img src="${portrait(h)}" alt=""><div><b>${esc(h.name)}${h.free?' <span class="rn-tag">Free</span>':''}${R.withMum(h,now)?' <span class="rn-tag">🍼 With mum</span>':h.pasture?' <span class="rn-tag rn-tag-pasture">🌾 Pasture</span>':''}</b><small>${esc(h.breed)} · ${R.ageText(R.ageMonths(h,now))}</small>${chip(h,now)}${G.isTamed(h)?(h.loaner?'':`<span class="rn-cond rn-trust" title="${G.trustWord(trustOfHorse(h.id))}">💞 Trust ${trustOfHorse(h.id)}%</span>`):`<span class="rn-cond rn-trust">🤝 Taming ${G.tamePct(h)}%</span>`}${h.retired?'<span class="rn-cond rn-age">🌾 Retired</span>':R.ageMonths(h,now)<G.RIDE_AT?'<span class="rn-cond rn-age">🍼 Foal</span>':''}</div></button>
    ${statBars(R.horseStats(h,{bond:G.isTamed(h)?trustOfHorse(h.id):G.tamePct(h),tamed:G.isTamed(h)}),'rn-card-stats')}<div class="rn-card-foot">${h.pasture&&!R.withMum(h,now)?`<button type="button" class="rn-mini" data-ranch="stallin" data-v="${esc(h.id)}">🏠 Bring into a stall</button>`:''}${xpBar(h)}${restLine(h)}${R.condition(h,now).id==='unwell'?`<button type="button" class="rn-mini" data-ranch="vet" data-v="${esc(h.id)}">🩺 Vet</button>`:(h.lastFed??-1)<R.dayNo(now)?`<button type="button" class="rn-mini" data-ranch="feed" data-v="${esc(h.id)}">🥕 Feed</button>`:''}</div></article>`).join('')||'<p class="small">No horses match.</p>'}</div>
  <p class="local-label">Horse time moves faster here: 1 real day = 1 horse month. A horse left without food gets hungry, then run-down, and after 3 days needs the vet. Your herd, food and Trotties are saved on this device for now. <button type="button" class="text-button muted" data-ranch="reset">Start over as a new player</button></p>`;}

export function profileExtras(h){const now=Date.now(),c=R.condition(h,now),b=R.breedOf(h.breedId);
  return `<div class="rn-profile"><div class="rn-profile-row">${chip(h,now)}${restLine(h)}<span class="rn-tier rn-t-${b.tier}">${esc(R.TIERS[b.tier].label)}</span></div>${xpBar(h)}
  <p class="small">${esc(R.coatLabel(h.coat))} · ${R.ageText(R.ageMonths(h,now))} (${R.ageBand(R.ageMonths(h,now))})</p>
  ${tackBlock(h)}${ageBlock(h,now)}
  <div class="rn-profile-actions">${h.retired?'<span class="rn-cond rn-age">🌾 Grazing: no meals needed</span>':c.id==='unwell'?`<button type="button" class="primary" data-ranch="vet" data-v="${esc(h.id)}">🩺 Take ${esc(h.name)} to the vet</button>`:`<button type="button" class="primary" data-ranch="feed" data-v="${esc(h.id)}" ${(h.lastFed??-1)>=R.dayNo(now)?'disabled':''}>${(h.lastFed??-1)>=R.dayNo(now)?'✓ Fed today':'🥕 Give today’s meal'}</button>`}<a class="secondary" href="#home" data-ranch="carehome" data-v="${esc(h.id)}">Pet, brush & treats at home</a><button type="button" class="secondary" data-ranch="breeds" data-v="${esc(b.id)}">📖 About the ${esc(b.name)}</button></div></div>`;}

// ---------- Age and retirement (riding.mjs) ----------
function ageBlock(h,now){const m=R.ageMonths(h,now);
  if(h.retired)return `<div class="rn-tack rn-age-box"><b>🌾 Retired to the pasture</b><small>${esc(h.name)} grazes the pasture, so no meals are needed. Pet, brush and give treats any time. Retired horses don’t race.</small></div>`;
  if(m<G.RIDE_AT){const d=G.RIDE_AT-m;return `<div class="rn-tack rn-age-box"><b>🍼 Foal</b><small>Too young to ride until 2 years old: ${d} ${d===1?'day':'days'} to go. Caring for ${esc(h.name)} now builds taming for later.</small></div>`;}
  if(G.canRetire(h,now))return `<div class="rn-tack rn-age-box"><b>🌟 Senior · ${Math.floor(m/12)} years old</b><small>A touch slower now, but gets their breath back well. ${esc(h.name)} can retire to the pasture whenever you like.</small><button type="button" class="secondary" data-ranch="retire" data-v="${esc(h.id)}">Retire to the pasture</button></div>`;
  if(R.ageBand(m)==='senior')return `<div class="rn-tack rn-age-box"><b>🌟 Senior</b><small>A touch slower now, but gets their breath back well. Too tired for races and shows from 15. At 20 they can retire to the pasture.</small></div>`;
  const y=G.competeYearsLeft(h,now);if(y<=3)return `<div class="rn-tack rn-age-box"><b>🏆 ${y} ${y===1?'year':'years'} of shows left</b><small>From 15 a horse is too tired for races and shows (that’s ${G.COMPETE_MAX-m} real days). Enter the big ones while you can!</small></div>`;
  return '';}
export function openRetire(id){const h=horse(id);if(!h||!G.canRetire(h))return;
  const s=openSheet(`Retire ${h.name}?`,`<p>${esc(h.name)} will live in the pasture: still yours to visit, pet, brush and treat. They graze, so they never need meals again. Retired horses don’t race, and retiring can’t be undone.</p><button type="button" class="primary full" data-ranch="retirego" data-v="${esc(id)}">Retire ${esc(h.name)}</button><button type="button" class="secondary full" data-ranch="retireno" style="margin-top:10px">Not now</button>`);s.dataset.kind='retire';}
function retireNow(id){const h=horse(id);if(!h||!G.canRetire(h))return;set({...ranch,herd:ranch.herd.map(x=>x.id===id?R.fromPlain(G.retire(x)):x)});closeSheet();toast(`${h.name} is enjoying the pasture. Visit any time.`);}

// ---------- Taming and tack (riding.mjs) ----------
// v124 social row on the horse page: friend taming on/off (untamed horses, on by default) and "Offer to a friend".
const tackBlock=h=>tackCore(h)+socialRow(h);
function socialRow(h){if(!F.isSignedIn())return '';const bits=[];
  if(!G.isTamed(h))bits.push(`<label class="rn-tameopen"><input type="checkbox" data-ranch-tameopen="${esc(h.id)}" ${h.tameOpen!==false?'checked':''}> Friends can help tame ${esc(h.name)}</label>`);
  if(R.canTrade(h))bits.push(`<button type="button" class="secondary" data-ranch="tradepick" data-v="${esc(h.id)}">🔁 Offer to a friend</button>`);
  return bits.length?`<div class="rn-social">${bits.join('')}</div>`:'';}
function tackCore(h){if(!G.isTamed(h)){const t=G.tamePct(h);
    return `<div class="rn-tack rn-taming"><b>🤝 Taming ${t}%</b><div class="rn-trustbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${t}"><i style="width:${t}%"></i></div><small>Pet, brush and feed ${esc(h.name)} at home (a little each day), or work with them in the Taming Corral. Then you can saddle up.</small><button type="button" class="primary" data-ranch="corral" data-v="${esc(h.id)}">🪢 Taming Corral</button></div>`;}
  const t=G.tackOf(h),row=p=>`<div><span>${iconHTML(G.TACK[p].icon,G.TACK[p].px)} ${esc(G.TACK[p].name)}</span><b><i class="rn-swatch" style="background:${G.tackColor(t[p])}"></i>${esc(G.tackName(p,t[p]))}</b><small>${G.upgraded(t[p])?esc(G.TACK[p].gives):t[p]?'Upgrade for '+esc(G.TACK[p].gives):'Starter Kit · from Otis in the Tack Room'}</small></div>`;
  const sh=G.shoesOf(h),shoes=`<div><span>${iconHTML(G.SHOES.icon,G.SHOES.px)} ${G.SHOES.name}</span><b>${esc(sh.name)}</b><small>${sh.daysLeft?`${sh.daysLeft} ${sh.daysLeft===1?'day':'days'} left · better grip in rain and snow`:sh.id==='free'?'Basic set from the Starter Kit':sh.id==='loan'?'On loan from Otis':h.free?'Starter Kit · from Otis in the Tack Room':'Optional · grip in rain and snow'}</small></div>`;
  return `<div class="rn-tack">${row('saddle')}${row('bridle')}${shoes}<button type="button" class="secondary" data-home-go="tackroom">Visit Otis in the Tack Room</button></div>`;}
export const missingTack=id=>{const h=horse(id);return h?G.missingTack(h):[];};
export function openTack(id){const h=horse(id);if(!h)return;const w=loadWallet(),t=G.tackOf(h),miss=G.missingTack(h),tamed=G.isTamed(h);
  const icon=p=>p==='shoes'?iconHTML(G.SHOES.icon,G.SHOES.px):iconHTML(G.TACK[p].icon,G.TACK[p].px);
  // Starter Kit (note #43): sold, not Complimentary. Until you own one, Otis shows only the kit (A); short on Trotties,
  // he lends his old tack or pays for odd jobs (C).
  const need=G.kitNeeds(h),K=G.STARTER_KIT,first=!kitDone(),broke=w.coins<K.price,jobs=jobsLeft();
  const kitList=['saddle','bridle','shoes'].map(p=>`<li><span aria-hidden="true">${icon(p)}</span><b>${esc(G.pieceName(p))}</b>${need.includes(p)?(t[p]==='loan'?'<em>On loan</em>':''):'<em>✓ On</em>'}</li>`).join('');
  const net=broke&&need.length?`<div class="rn-net"><h4>Short on Trotties?</h4><p class="small">You have ${fmt(w.coins)} 🪙. The kit is ${fmt(K.price)} 🪙.</p>
      ${miss.length?`<button type="button" class="secondary full" data-ranch="tackloan" data-v="${esc(h.id)}">🐴 Borrow Otis’s old tack · free, slower</button>`:''}
      <button type="button" class="secondary full" data-ranch="oddjob" data-v="${esc(h.id)}" ${jobs?'':'aria-disabled="true"'}>🧹 ${jobs?`Odd job for Otis · +${G.ODD_JOB.pay} 🪙 (${jobs} left today)`:'No more odd jobs today. Come back tomorrow!'}</button></div>`:'';
  const comp=need.length?`<section class="rn-tack-shop rn-comp rn-kit"><h3>${K.icon} ${K.name} <small>${fmt(K.price)} 🪙</small></h3>
    <p class="small">${esc(K.blurb)} You get all three:</p><ul class="rn-comp-list">${kitList}</ul>
    <button type="button" class="primary full" data-ranch="kitbuy" data-v="${esc(h.id)}" ${broke?`aria-disabled="true" data-why="You need ${fmt(K.price-w.coins)} more Trotties. Odd jobs and games pay Trotties."`:''}>Buy the ${K.name} · ${fmt(K.price)} 🪙</button>
    ${miss.length?`<p class="small">${esc(h.name)} needs tack before you can ride out.</p>`:''}${net}</section>`:'';
  if(first&&need.length){const s=openSheet(`Tack for ${h.name}`,`${comp}<p class="small rn-kit-first">🔒 Get your ${K.name} first. Then the rest of Otis’s shop opens: colour saddles, bridles and better horseshoes.</p>`,'rn-full');s.dataset.kind='tack';s.dataset.horse=id;enterFull();return;}
  const piece=p=>{const cur=t[p],up=G.upgraded(cur),cost=up?0:G.TACK[p].price;
    return `<section class="rn-tack-shop"><h3>${iconHTML(G.TACK[p].icon,G.TACK[p].px)} ${esc(G.TACK[p].name)} <small>${up?'Yours: change colour for free':`${fmt(cost)} 🪙 · gives ${esc(G.TACK[p].gives)}`}</small></h3>
    <p class="small">Now: <b>${esc(G.tackName(p,cur))}</b>${cur==='free'||cur==='loan'?` · you can ride everywhere, just ${p==='saddle'?'slower':'with clumsier turns'}`:''}</p>
    <div class="rn-colors">${G.TACK_COLORS.map(([c,label,hex])=>`<button type="button" data-ranch="tackbuy" data-v="${esc(h.id)}" data-p="${p}" data-c="${c}" aria-pressed="${cur===c}" ${!up&&w.coins<cost?'aria-disabled="true"':''}><i style="background:${hex}"></i>${esc(label)}</button>`).join('')}</div></section>`;};
  const ups=tamed?`${piece('saddle')}${piece('bridle')}`:`<p class="small">Saddle and bridle upgrades open once ${esc(h.name)} is tamed.</p>`;
  // Horseshoes (note #20): three tiers that wear out; buying the same or a better tier again adds the days.
  const sh=G.shoesOf(h),shoeShop=`<section class="rn-tack-shop"><h3>${iconHTML(G.SHOES.icon,G.SHOES.px)} Horseshoes <small>Now: ${esc(sh.name)}${sh.daysLeft?` · ${sh.daysLeft} days left`:''}</small></h3>
    <p class="small">Shoes grip the ground: rain, snow and storms slow ${esc(h.name)} down less, and galloping is a little less tiring. They wear out after their days.</p>
    <div class="rn-shoes">${G.SHOE_TIERS.map(s=>`<button type="button" data-ranch="shoebuy" data-v="${esc(h.id)}" data-p="${s.id}" ${w.coins<s.price?'aria-disabled="true"':''}><b>${esc(s.name)}</b><small>${esc(s.blurb)} · ${Math.round(s.grip*100)}% grip</small><span>${sh.id===s.id?'Add '+s.days+' days · ':''}${fmt(s.price)} 🪙</span></button>`).join('')}</div></section>`;
  const s=openSheet(`Tack for ${h.name}`,`${comp}<h3 class="rn-tack-up">Upgrades</h3><p>One saddle and one bridle upgrade per horse, any colour (all colours are equal). Saddle: full speed. Bridle: full control.</p>${ups}${shoeShop}`,'rn-full');s.dataset.kind='tack';s.dataset.horse=id;enterFull();}
function getCompFor(id,p){let h=horse(id);if(!h)return;const list=p==='all'?G.missingTack(h):[p];
  for(const q of list){const r=G.getComplimentary(h,q);if(!r.ok){toast(r.reason);return;}h=r.horse;}
  set({...ranch,herd:ranch.herd.map(x=>x.id===id?R.fromPlain(h):x)});
  toast(G.missingTack(h).length?`${list.map(G.pieceName).join(' and ')}: on!`:G.isTamed(h)?`${h.name} is tacked up. Ride out whenever you like!`:`${h.name} is tacked up. Keep taming them, then ride out.`);
  window.dispatchEvent(new CustomEvent('ranch:tack'));openTack(id);}
// Starter Kit helpers (note #43).
export const kitDone=()=>!!ranch?.herd.some(x=>{const t=G.tackOf(x);return t.saddle&&t.saddle!=='loan';});
const JOBS_KEY='trottville-oddjobs',today=()=>new Date().toDateString();
function jobsLeft(){let j={};try{j=JSON.parse(localStorage.getItem(JOBS_KEY))||{};}catch{}return j.day===today()?Math.max(0,G.ODD_JOB.perDay-(j.n||0)):G.ODD_JOB.perDay;}
const JOBS=['You swept the Tack Room floor.','You oiled three dusty saddles.','You hung up all the bridles.','You carried hay bales to the loft.','You mucked out an empty stall.','You polished Otis’s brass buckles.'];
function oddJob(id){const left=jobsLeft();if(!left){toast('No more odd jobs today. Come back tomorrow!');return;}
  try{localStorage.setItem(JOBS_KEY,JSON.stringify({day:today(),n:G.ODD_JOB.perDay-left+1}));}catch{}
  const w=loadWallet();saveWallet({...w,coins:w.coins+G.ODD_JOB.pay});Coins.paintCounters();window.dispatchEvent(new CustomEvent('trottcoins:change'));
  window.TrottAudio?.sfx('coin');toast(`🧹 ${JOBS[Math.floor(Math.random()*JOBS.length)]} Otis pays you ${G.ODD_JOB.pay} 🪙.`);openTack(id);}
function buyKitFor(id){const h=horse(id);const res=G.buyStarterKit(h,loadWallet().coins);if(!res.ok){toast(res.short?`${res.reason}. You need ${fmt(res.short)} more: try an odd job for Otis!`:res.reason);return;}
  spend(res.cost);set({...ranch,herd:ranch.herd.map(x=>x.id===id?R.fromPlain(res.horse):x)});window.TrottAudio?.sfx('fanfare');
  toast(G.isTamed(res.horse)?`🎒 Starter Kit on! ${h.name} has a saddle, bridle and horseshoes. Ride out whenever you like!`:`🎒 Starter Kit on! Keep taming ${h.name}, then ride out.`);
  window.dispatchEvent(new CustomEvent('ranch:tack'));openTack(id);}
function loanFor(id){const h=horse(id);const res=G.borrowTack(h);if(!res.ok){toast(res.reason);return;}
  set({...ranch,herd:ranch.herd.map(x=>x.id===id?R.fromPlain(res.horse):x)});
  toast(`Otis lends ${h.name} his old tack. It’s worn, so you’ll be slower. Buy the Starter Kit when you can!`);window.dispatchEvent(new CustomEvent('ranch:tack'));openTack(id);}
function buyShoesFor(id,tier){const h=horse(id);const res=G.buyShoes(h,tier,loadWallet().coins);if(!res.ok){toast(res.short?`${res.reason}. You need ${fmt(res.short)} more. Keep playing!`:res.reason);return;}
  spend(res.cost);set({...ranch,herd:ranch.herd.map(x=>x.id===id?R.fromPlain(res.horse):x)});const s=G.shoesOf(res.horse);
  toast(`${h.name} has ${s.name.toLowerCase()}: ${s.daysLeft} days of good grip!`);window.TrottAudio?.sfx('buy');openTack(id);}
function buyTackFor(id,p,c){const h=horse(id);const res=G.buyTack(h,p,c,loadWallet().coins);if(!res.ok){toast(res.short?`${res.reason}. You need ${fmt(res.short)} more. Keep playing!`:res.reason);return;}
  if(res.cost)spend(res.cost);set({...ranch,herd:ranch.herd.map(x=>x.id===id?R.fromPlain(res.horse):x)});
  toast(res.cost?`${h.name} has a new ${G.tackName(p,c).toLowerCase()}!`:`Colour changed.`);openTack(id);}

// ---------- Daily gift: a streak of visits (riding.mjs) ----------
let streakShown=false;
// One thing at a time: the gift waits while any other sheet, panel or friend pop-up is showing and opens once the
// screen is clear (watched with a MutationObserver, no timers). A race invite that arrives on top of the gift puts
// the gift back in the queue (friends.js dispatches 'trottville:gift-later').
const BUSY='.rn-sheet,.tc-sheet,.hp-panel,.hp-frame,.h3-sheet,.st-sheet,.pl-sheet,.fr-pop,dialog[open]';
let giftWait=null;
// v152b (2026-11-17, Yoshi picked A): a brand-new player's first day is for meeting their horse, so the gift doesn't pop up
// on its own until the day after the save was made (never opened one yet). The bell/menu can still open it by hand.
export function maybeStreak(){if(streakShown||giftWait)return;const w=loadWallet(),t=G.streakToday(w.streak);if(!t.claimable)return;
  if(w.streak?.last==null&&ranch?.createdAt&&G.dayNo(ranch.createdAt)>=G.dayNo())return;
  const tryOpen=()=>{if(streakShown||document.querySelector(BUSY))return false;giftWait?.disconnect();giftWait=null;
    if(!G.streakToday(loadWallet().streak).claimable||!/^#?(home)?$/.test(location.hash))return true;streakShown=true;openStreak();sheet?.classList.add('rn-auto');return true;};
  if(tryOpen())return;giftWait=new MutationObserver(tryOpen);giftWait.observe(document.body,{childList:true,subtree:true});}
addEventListener('trottville:gift-later',()=>{if(sheet?.dataset.kind!=='streak')return;closeSheet();streakShown=false;queueMicrotask(maybeStreak);});
export function openStreak(){const t=G.streakToday(loadWallet().streak);
  const tiles=G.STREAK_GIFTS.map((c,i)=>`<div class="rn-day${i+1<t.day?' done':i+1===t.day?' today':''}"><small>Day ${i+1}</small><b>${i===6?'🎁':'🪙'}</b><span>${fmt(c)}${i===6?' + ✨🥕':''}</span></div>`).join('');
  const s=openSheet('Daily gift',`<p>${t.claimable?(t.broke?'Welcome back! Your streak starts again today.':t.day===1?'Come back every day for a bigger gift. Seven days in a row opens the big one!':`Day ${t.day} in a row. Keep it going!`):'You’ve opened today’s gift. See you tomorrow!'}</p>
  <div class="rn-days">${tiles}</div>${t.claimable?`<button type="button" class="primary full" data-ranch="streakgo">Open today’s gift</button>`:''}<p class="small">Miss a day and the streak starts again at day 1. Your best streak: ${loadWallet().streak.best||0} days.</p>`);s.dataset.kind='streak';}
function claimStreak(){const w=loadWallet(),c=G.claimStreak(w.streak);if(!c.ok){closeSheet();return;}saveWallet({...w,streak:c.state});
  const id=Coins.queueCoins({from:`Daily gift · day ${c.day}`,coins:c.coins,food:c.golden&&ranch?{golden:1}:{},lines:c.golden?[ranch?'A golden carrot for your horse':'Day 7 bonus']:[]});
  closeSheet();Coins.showCollect({title:c.golden?'Seven days in a row! 🎁':`Day ${c.day} gift`,ids:id?[id]:undefined});}

// ---------- Sheets (feed store, vet, market, bell) ----------
let sheet=null;
// 2026-11-15 playtest: Back (a hash change) leaves the page, so it closes any ranch sheet too.
addEventListener('hashchange',()=>{if(sheet){sheetHist=false;closeSheet();vetGame=null;}});
// Round 2: Android Back should close an open sheet and stay on the page. Opening a sheet adds one history step; Back pops it.
let sheetHist=false;
addEventListener('popstate',()=>{if(sheet&&sheetHist){sheetHist=false;closeSheet();vetGame=null;}});
function openSheet(title,html,cls=''){closeSheet();sheet=document.createElement('div');sheet.className='rn-sheet '+cls;sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-label',title);
  sheet.innerHTML=`<div class="rn-sheet-card"><div class="rn-sheet-head"><h2>${esc(title)}</h2><span class="tc-counter" data-trottcoins><span aria-hidden="true">🪙</span><b>${coinHTML(loadWallet().coins)}</b></span><button type="button" class="rn-x" data-ranch="close" aria-label="Close">×</button></div><div class="rn-sheet-body">${html}</div></div>`;
  (document.fullscreenElement||[...document.querySelectorAll('dialog[open]')].at(-1)||document.body).append(sheet);requestAnimationFrame(()=>sheet?.classList.add('in'));if(!sheetHist){try{history.pushState({...(history.state||{}),rnSheet:1},'');sheetHist=true;}catch{}}return sheet;}
function closeSheet(){sheet?.remove();sheet=null;queueMicrotask(leaveFull);}
// The × (a user closing it): also take back the history step, so the next Back leaves the page as normal.
function closeByUser(){const h=sheetHist;sheetHist=false;closeSheet();if(h)history.back();}
// Shops (feed store, horse market) fill the screen: browser fullscreen where allowed, and the sheet covers the
// whole view either way. Closing the last shop sheet leaves fullscreen again (a refresh re-opens without leaving).
let ownFull=false;
function enterFull(){if(document.fullscreenElement||!document.documentElement.requestFullscreen)return;document.documentElement.requestFullscreen({navigationUI:'hide'}).then(()=>{ownFull=true;},()=>{});}
function leaveFull(){if(!ownFull||sheet?.classList.contains('rn-full'))return;ownFull=false;if(document.fullscreenElement===document.documentElement)document.exitFullscreen?.().catch(()=>{});}
const refreshSheet=()=>{if(!sheet)return;const kind=sheet.dataset.kind;if(kind==='store')openStore();else if(kind==='vet')openVet();else if(kind==='market')openMarket();else if(kind==='bell')openBell();else if(kind==='breeds')openBreeds();};

export function openStore(){const w=loadWallet(),need=ranch.herd.filter(h=>!h.free&&!h.retired).length;
  const s=openSheet('Carrot Market',`<p>One meal a day for every horse after your first (carrots, apples or hay). Bigger bundles cost less.${need?` You feed ${need} horse${need>1?'s':''} a day.`:''}</p>
  <div class="rn-bundles">${R.BUNDLES.map(b=>`<button type="button" data-ranch="buy" data-v="${b.n}" ${w.coins<b.price?'aria-disabled="true"':''}><span class="rn-b-n">🥕 ×${b.n}</span><b>${fmt(b.price)} 🪙</b><small>${(b.price/b.n).toFixed(b.n>=100?1:0)} each${b.n>1?` · save ${Math.round((1-b.price/(b.n*10))*100)}%`:''}</small></button>`).join('')}</div>
  <p class="small">Pantry: 🥕 ${ranch.food.carrot} · 🍎 ${ranch.food.apple} · 🌾 ${ranch.food.hay}. Free food: apples from Appleoosa, hay from Hay’s for Horses, and daily baskets in the 3D world.</p>`,'rn-full');s.dataset.kind='store';enterFull();}

let vetGame=null;
export function openVet(focus){const now=Date.now(),sick=ranch.herd.filter(h=>R.condition(h,now).id==='unwell'),down=ranch.herd.filter(h=>R.condition(h,now).id==='rundown');
  if(vetGame){openVetGame();return;}
  const s=openSheet('Willowbrook Vet',`<p>Horses never die here. After ${R.SICK_DAY} days without food a horse is unwell and can’t ride or race until the vet visits: ${R.VET_COST} 🪙, or half if you help. The vet never takes more than half your Trotties.</p>
  ${sick.length?`<div class="rn-vet-list">${sick.map(h=>`<article class="rn-vet${h.id===focus?' rn-focus':''}"><img src="${portrait(h)}" alt=""><div><b>${esc(h.name)}</b>${chip(h,now)}<small>${R.condition(h,now).days} days without food</small></div><div class="rn-vet-btns"><button type="button" class="primary" data-ranch="vethelp" data-v="${esc(h.id)}">Help the vet · ${R.vetHelpFee(loadWallet().coins)} 🪙</button><button type="button" class="secondary" data-ranch="vetpay" data-v="${esc(h.id)}">Just treat · ${R.vetFee(R.VET_COST,loadWallet().coins)} 🪙</button></div></article>`).join('')}</div>`:'<p class="rn-ok">💚 Nobody needs the vet right now.</p>'}
  ${down.length?`<p class="small">Run-down (a meal helps, no vet needed yet): ${down.map(h=>esc(h.name)).join(', ')}.</p>`:''}`);s.dataset.kind='vet';}
// Vet checkup mini-game: the vet calls out five checks in order; tap the right tool each time.
const CHECKS=[['heart','🩺','Listen to the heart'],['teeth','🦷','Check the teeth'],['eyes','👁️','Look at the eyes'],['temp','🌡️','Take the temperature'],['hooves','🧲','Clean the hooves']];
function openVetGame(){const h=horse(vetGame.id);if(!h){vetGame=null;return;}const step=CHECKS[vetGame.order[vetGame.i]];
  const s=openSheet('Checkup with '+h.name,`<div class="rn-checkup"><img src="${portrait(h)}" alt=""><p class="rn-callout">${vetGame.i<CHECKS.length?`Vet: “${esc(step[2])}, please.”`:''}</p>
  <div class="rn-tools">${CHECKS.map(([k,e,l])=>`<button type="button" data-ranch="tool" data-v="${k}" aria-label="${esc(l)}" class="${vetGame.done.includes(k)?'done':''}">${e}<small>${esc(l.split(' ').slice(-1)[0])}</small></button>`).join('')}</div>
  <p class="small">${vetGame.i} of ${CHECKS.length} checks${vetGame.miss?` · ${vetGame.miss} wrong tool${vetGame.miss>1?'s':''} (that’s OK)`:''}</p></div>`);s.dataset.kind='vet';}
// ---------- v124 lifetime stats + badges (note #45) ----------
const statsKey=()=>'trottville-stats-v1:'+trustWho();
export function stats(){let s={};try{s=JSON.parse(localStorage.getItem(statsKey()))||{};}catch{}
  if(ranch){s.herdSize=ranch.herd.filter(h=>!h.loaner).length;s.bestTrust=Math.max(0,...ranch.herd.filter(h=>!h.loaner).map(h=>trustOfHorse(h.id)));}return s;}
export function addStat(k,n=1){if(!(n>0))return;const before=R.badgeList(stats());let s={};try{s=JSON.parse(localStorage.getItem(statsKey()))||{};}catch{}
  s[k]=(s[k]||0)+n;try{localStorage.setItem(statsKey(),JSON.stringify(s));}catch{}checkBadges(before);}
function checkBadges(before){const after=R.badgeList(stats());for(const b of after){const was=before.find(x=>x.id===b.id);if(was&&b.tier>was.tier){toast(`${b.icon} ${b.tierName} badge: ${b.name}!`);window.TrottLog?.log('badge',{id:b.id,tier:b.tier});window.dispatchEvent(new CustomEvent('badge:earned',{detail:b}));}}}
window.TrottStats={add:(k,n)=>addStat(k,n)};
export function openBadges(){const list=R.badgeList(stats()),medal=['🔘','🥉','🥈','🥇'];
  const row=b=>`<li class="rn-badge rn-tier-${b.tier}"><span class="rn-badge-ic" aria-hidden="true">${b.icon}</span><div><b>${esc(b.name)} <span class="rn-medal">${medal[b.tier]} ${b.tierName||'Not yet'}</span></b><small>${fmtNum(b.value)} ${esc(b.unit)}${b.next!=null?` · next at ${fmtNum(b.next)}`:' · top rank!'}</small><span class="rn-bbar"><i style="width:${Math.min(100,b.next?b.value/b.next*100:100)}%"></i></span></div></li>`;
  const earned=list.filter(b=>b.tier).length;
  openSheet('Badges',`<p>${earned} of ${list.length} badges earned. Each has bronze, silver and gold. Friends see your best ones on your barn wall.</p>
    <h3 class="rn-bh">Horse skills</h3><ul class="rn-badges">${list.filter(b=>b.kind==='horse').map(row).join('')}</ul>
    <h3 class="rn-bh">Just for fun</h3><ul class="rn-badges">${list.filter(b=>b.kind==='silly').map(row).join('')}</ul>`,'rn-wide').dataset.kind='badges';}
const fmtNum=v=>v>=100||Number.isInteger(v)?Math.floor(v).toLocaleString():v.toFixed(1);

// ---------- v124 barn: stalls, pasture, upgrades, pet (notes #45/#48) ----------
// v135: how many days the pantry lasts for everyone who eats from it (the free horse has its basket).
function pantryDays(now){const mouths=ranch.herd.filter(h=>!h.free&&!h.retired&&!h.loaner).length;if(!mouths)return '';
  const meals=['carrot','apple','hay'].reduce((n,k)=>n+(ranch.food[k]||0),0),d=Math.floor(meals/mouths);
  return `<span class="rn-free"${d<2?' style="color:#b4532a"':''} title="${mouths} ${mouths===1?'horse eats':'horses eat'} from the pantry. Appleoosa apples keep it full.">📅 Pantry: ${d<1&&meals>0?`<b>under a day</b>`:`<b>${d}</b> ${d===1?'day':'days'}`}</span>`;}
function barnPanel(now){const b=R.barnOf(ranch),next=R.BARNS[(ranch.barnLevel||0)+1],inS=R.stalled(ranch).length,inP=R.pastured(ranch).length,p=ranch.pet&&R.PETS.find(x=>x.id===ranch.pet.id),patted=p&&R.dayNo(ranch.pet.lastPat||0)===R.dayNo(now);
  return `<div class="rn-barn"><div class="rn-barn-main"><span class="rn-barn-ic" aria-hidden="true">${b.icon}</span><div><b>${esc(b.name)}</b><small>Stalls ${inS}/${R.stallCap(ranch)}${R.foalStalls(ranch)?` (${R.foalStalls(ranch)} free foal ${R.foalStalls(ranch)===1?'stall':'stalls'})`:''}${inP?` · ${inP} in the pasture`:''}</small></div>
    ${next?`<button type="button" class="secondary" data-ranch="barnup">Upgrade to ${esc(next.name)} (${next.stalls} stalls) · ${fmt(next.price)} 🪙</button>`:'<span class="rn-tag">Biggest barn!</span>'}</div>
    ${inP?'<p class="small">Pasture horses graze behind the barn. They still need their meal; bring one into a stall to ride it in the world.</p>':''}
    <div class="rn-pet">${p?`<span class="rn-pet-ic" aria-hidden="true">${p.icon}</span><div><b>${esc(ranch.pet.name)}</b><small>Your ${esc(p.kind.toLowerCase())}${patted?' · patted today':''}</small></div><button type="button" class="primary" data-ranch="petpat">Pat ${esc(ranch.pet.name)}</button>`:`<span class="rn-pet-ic" aria-hidden="true">🐾</span><div><b>No barn pet yet</b><small>A dog, cat, goat or hen to keep your horses company.</small></div><button type="button" class="secondary" data-ranch="pets">Adopt a barn pet</button>`}</div></div>`;}
function stallIn(id){const h=horse(id);if(!h)return;if(R.stalled(ranch).length<R.stallCap(ranch)){const res=R.swapStall(ranch,id,null);if(res.ok){set(res.ranch);toast(`${h.name} trots into a stall.`);}return;}
  openSheet(`Bring ${h.name} in`,`<p>Your stalls are full. Who goes out to the pasture?</p><div class="rn-swap">${R.stalled(ranch).map(o=>`<button type="button" class="rn-swap-b" data-ranch="stallswap" data-in="${esc(id)}" data-v="${esc(o.id)}"><img src="${portrait(o,{w:96,h:96})}" alt=""><span>${esc(o.name)}</span></button>`).join('')}</div>`).dataset.kind='swap';}
function openPets(){const w=loadWallet();openSheet('Barn pets',`<p>A friend for your horses. Pat them once a day for a few Trotties; they greet friends who visit your barn.</p><div class="rn-pets">${R.PETS.map(p=>`<div class="rn-petcard"><span aria-hidden="true">${p.icon}</span><b>${esc(p.name)}</b><small>${esc(p.kind)}</small><button type="button" class="primary" data-ranch="petadopt" data-v="${p.id}" ${w.coins<p.price?'aria-disabled="true"':''}>${fmt(p.price)} 🪙</button></div>`).join('')}</div>`).dataset.kind='pets';}

// ---------- v124 breeding ----------
let breedPick={mother:null,father:null};
function openBreeding(){const now=Date.now(),ok=ranch.herd.filter(h=>!R.canBreed(h,now)),wait=ranch.lastBreed?R.BREED_EVERY-(R.dayNo(now)-R.dayNo(ranch.lastBreed)):0;
  if(!ok.some(h=>h.id===breedPick.mother))breedPick.mother=ok[0]?.id||null;if(!ok.some(h=>h.id===breedPick.father)||breedPick.father===breedPick.mother)breedPick.father=ok.find(h=>h.id!==breedPick.mother)?.id||null;
  const pickRow=(role,label)=>`<fieldset class="rn-bpick"><legend>${label}</legend>${ok.map(h=>`<button type="button" data-ranch="breedpick" data-role="${role}" data-v="${esc(h.id)}" aria-pressed="${breedPick[role]===h.id}" ${breedPick[role==='mother'?'father':'mother']===h.id?'disabled':''}><img src="${portrait(h,{w:72,h:72})}" alt=""><span>${esc(h.name)}</span><small>Lv ${R.level(h.xp||0)} · 💞 ${trustOfHorse(h.id)}%</small></button>`).join('')}</fieldset>`;
  const s=openSheet('Breed a foal',ok.length<2?`<p>You need two tamed horses aged 3 to 15 to breed a foal. ${ranch.herd.length<2?'Adopt a second horse at the Hoofhaven market first.':'Keep caring for your horses until they’re ready.'}</p>`
    :`<p>Two of your horses can have a foal once a week. The foal mixes both coats and gets a head start: ${Math.round(R.FOAL_XP_SHARE*100)}% of its parents’ XP and some of their trust. Vet fee ${fmt(R.BREED_FEE)} 🪙.</p>
    ${pickRow('mother','Mare (mother)')}${pickRow('father','Stallion (father)')}
    ${wait>0?`<p class="rn-note">The vet says wait ${wait} more day${wait>1?'s':''} before the next foal.</p>`:`<button type="button" class="primary rn-wide-btn" data-ranch="breedgo">🍼 Breed a foal · ${fmt(R.BREED_FEE)} 🪙</button>`}`,'rn-wide');s.dataset.kind='breed';}
function doBreed(){const trust={};for(const h of ranch.herd)trust[h.id]=trustOfHorse(h.id);const res=R.breedFoal(ranch,breedPick.mother,breedPick.father,{coins:loadWallet().coins,trust});
  if(!res.ok){toast(res.short?`${res.reason}. You need ${fmt(res.short)} more.`:res.reason);return;}spend(res.cost);
  G.addRideTrust(trustWho(),res.foal.id,res.startTrust-G.TRUST_START,globalThis.localStorage,{cap:100});set(res.ranch);addStat('foals',1);closeSheet();
  toast(`🍼 A foal is born! Say hello to ${res.foal.name}.`);window.TrottLog?.log('foal');location.hash='#horse/'+res.foal.id;}

// ---------- v124 seasonal shows ----------
function openShow(){const show=R.currentShow();if(!show){toast('No show is on right now. Shows run in spring, summer, Halloween, harvest time and winter.');return;}
  const d=R.dayNo(),entered=ranch.shows?.[show.id+':'+d],ok=ranch.herd.filter(h=>!h.loaner&&!h.retired&&h.tamed!==false);
  const s=openSheet(show.name,`<div class="rn-show-hero"><span aria-hidden="true">${show.icon}</span><p>A themed show with ${esc(show.theme)}. Enter one horse a day. You ride the jumping round yourself: time each fence well. Grooming (brush them today!), training, trust and a fed horse add extra points.</p></div>
    ${entered?`<p class="rn-note">Today you placed <b>${ordinal(entered.place)}</b> with ${esc(horse(entered.horse)?.name||'your horse')}. Come back tomorrow!</p>`
    :ok.length?`<div class="rn-swap">${ok.map(h=>`<button type="button" class="rn-swap-b" data-ranch="showgo" data-v="${esc(h.id)}"><img src="${portrait(h,{w:96,h:96})}" alt=""><span>${esc(h.name)}</span><small>${ranch.careDay?.[`${R.dayNo()}:${h.id}:groom`]?'✨ groomed today':''}</small></button>`).join('')}</div>`:'<p>Tame a horse first, then come and show off.</p>'}
    <p class="small">Prizes: ${R.PRIZES.map((p,i)=>`${ordinal(i+1)} ${p} 🪙`).join(' · ')}</p>`,'rn-wide');s.dataset.kind='show';}
const ordinal=n=>n+(['th','st','nd','rd'][(n%100>10&&n%100<14)?0:n%10]||'th');
// v125 show ring: you ride the round. The horse canters round the ring past 6 fences; tap Jump while it is in a
// fence's glowing take-off zone. Centre of the zone = perfect, edge = good, no tap or a tap too early/late = a knocked
// rail. A horse that doesn't trust you yet may refuse a fence even when you time it well. Closing the ring = no entry.
let ring=null;
function openRing(id){const h=horse(id);if(!h)return;const show=R.currentShow();if(!show){toast('No show is on right now.');return;}
  const s=openSheet(`${show.name} · ${h.name}`,`<div class="rn-corral rn-ring"><p class="small">Tap <b>Jump!</b> when ${esc(h.name)} reaches each glowing fence. Right in the middle of the glow is perfect. 6 fences, one round.</p>
    <canvas class="rn-corral-pen" width="320" height="320" aria-label="Show ring"></canvas>
    <p class="rn-corral-say" aria-live="polite">Ready when you are.</p>
    <button type="button" class="primary rn-corral-ask">Start the round</button></div>`,'rn-corral-sheet');s.dataset.kind='ring';
  const cv=s.querySelector('canvas'),ctx=cv.getContext('2d'),img=new Image();img.src=portrait(h,{w:96,h:96});const say=t=>{const el=s.querySelector('.rn-corral-say');if(el)el.textContent=t;};
  const N=6,START=-Math.PI/2,fences=Array.from({length:N},(_,i)=>START+.55+i*(2*Math.PI-.9)/N),ZONE=.2,trust=trustOfHorse(id);
  ring={id,ang:START,speed:1.15,i:0,marks:[],last:performance.now(),pops:[],air:0,done:false,go:false};
  const mark=(q,msg,pop)=>{ring.marks.push(q);ring.i++;ring.pops.push({t:0,txt:pop});say(msg);if(q>0)ring.air=.45;ring.speed=Math.min(1.7,ring.speed+.07);};
  s.querySelector('.rn-corral-ask').addEventListener('click',e=>{if(!ring||ring.done||ring.i>=N)return;if(!ring.go){ring.go=true;e.currentTarget.textContent='Jump!';say('Canter on! Head for fence 1…');return;}const d=ring.ang-fences[ring.i];
    if(d<-ZONE*2.5){say(`Wait for it… jump when ${h.name} reaches the glow.`);return;}
    if(d<-ZONE){mark(0,'Too early! Your horse took off long and the rail came down.','💥');return;}
    if(Math.random()<G.refusalChance(trust)*.5){mark(0,`${h.name} stopped at the fence! More trust will help.`,'✋');return;}
    const q=Math.abs(d)<ZONE*.4?1:.75;mark(q,q===1?['Perfect stride!','Beautiful jump!','Clear and smooth!'][ring.i%3]:'Clear, but a bit untidy.',q===1?'⭐':'✓');});
  const finish=()=>{ring.done=true;const ride=ring.marks.reduce((a,b)=>a+b,0)/N;const btn=s.querySelector('.rn-corral-ask');if(btn)btn.disabled=true;
    ring.ride=ride;};
  const tick=now=>{if(!ring||!cv.isConnected){ring=null;return;}requestAnimationFrame(tick);const dt=Math.min(.05,(now-ring.last)/1000);ring.last=now;if(document.hidden)return;
    if(ring.done){ring.pops=ring.pops.filter(p=>(p.t+=dt)<1.1);if(!ring.pops.length){const r=ring.ride;ring=null;doShow(id,r);}return;}
    if(!ring.go)ring.last=now;else ring.ang+=ring.speed*dt;ring.air=Math.max(0,ring.air-dt);
    if(ring.go&&ring.i<N&&ring.ang-fences[ring.i]>ZONE)mark(0,'Missed the take-off. A rail is down!','💥');
    if(ring.i>=N&&ring.ang>START+2*Math.PI-.15)finish();
    const W=320,c=W/2,RX=128,RY=118;ctx.clearRect(0,0,W,W);ctx.fillStyle='#7cb560';ctx.fillRect(0,0,W,W);ctx.fillStyle='#d9c28f';ctx.beginPath();ctx.ellipse(c,c,RX+22,RY+22,0,0,7);ctx.fill();
    ctx.fillStyle='#7cb560';ctx.beginPath();ctx.ellipse(c,c,RX-24,RY-24,0,0,7);ctx.fill();ctx.font='26px serif';ctx.textAlign='center';ctx.fillText('🏆',c,c+9);
    fences.forEach((a,i)=>{const x=c+Math.cos(a)*RX,y=c+Math.sin(a)*RY,next=i===ring.i;
      if(next){ctx.strokeStyle='#f5c84a';ctx.lineWidth=20;ctx.globalAlpha=.5+.3*Math.sin(now/200);ctx.beginPath();ctx.ellipse(c,c,RX,RY,0,a-ZONE,a+ZONE);ctx.stroke();ctx.globalAlpha=1;}
      ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle=i<ring.i?(ring.marks[i]>0?'#3a8a3a':'#b04030'):'#fff';ctx.fillRect(-20,-3,40,6);ctx.fillStyle='#c0392b';ctx.fillRect(-20,-3,8,6);ctx.fillRect(12,-3,8,6);ctx.restore();
      ctx.fillStyle='#24160f';ctx.font='bold 12px system-ui';ctx.fillText(String(i+1),c+Math.cos(a)*(RX-36),c+Math.sin(a)*(RY-36)+4);});
    const lift=ring.air>0?Math.sin(ring.air/.45*Math.PI)*16:0,hx=c+Math.cos(ring.ang)*RX,hy=c+Math.sin(ring.ang)*RY-lift,sz=54;
    if(img.complete){ctx.save();ctx.beginPath();ctx.arc(hx,hy,sz/2,0,7);ctx.clip();ctx.drawImage(img,hx-sz/2,hy-sz/2,sz,sz);ctx.restore();ctx.strokeStyle='#8a5a32';ctx.lineWidth=3;ctx.beginPath();ctx.arc(hx,hy,sz/2,0,7);ctx.stroke();}
    ring.pops=ring.pops.filter(p=>(p.t+=dt)<1.1);ctx.font='26px serif';for(const p of ring.pops){ctx.globalAlpha=1-p.t/1.1;ctx.fillText(p.txt,hx,hy-36-p.t*36);}ctx.globalAlpha=1;};
  requestAnimationFrame(tick);}
function doShow(id,ride=0){const h=horse(id);if(!h)return;const groomed=!!ranch.careDay?.[`${R.dayNo()}:${id}:groom`];const res=R.enterShow(ranch,h,{trust:trustOfHorse(id),groomed,ride});
  if(!res.ok){toast(res.reason);return;}set(res.ranch,{quiet:true});addStat('shows',1);if(res.prize)Coins.queueCoins({from:res.show.name,coins:res.prize,lines:[`${ordinal(res.place)} place · ${res.prize} 🪙`]});
  const ros=res.place<=3?['🥇','🥈','🥉'][res.place-1]:'🎀';
  openSheet(res.show.name,`<div class="rn-show-hero"><span aria-hidden="true">${ros}</span><h3>${esc(h.name)} placed ${ordinal(res.place)}!</h3><p>${ride>=.99?'A perfect clear round! ':ride>=.7?'A tidy round. ':ride>=.4?'A few rails down. ':'A rough round today. '}Score ${res.score}. ${res.prize?`Prize: ${res.prize} 🪙, waiting in your Trotties.`:'No prize this time, but the crowd loved it.'} ${groomed?'':'Tip: brush your horse before the show for extra points.'}</p></div>`).dataset.kind='showresult';
  window.dispatchEvent(new CustomEvent('ranch:change'));}

// v124 taming chip (market cards, listings)
const tameChip=t=>`<span class="rn-tame rn-tame-${t>=100?'full':t>0?'part':'wild'}">${t>=100?'🤝 Tamed 100%':t>0?`🪢 Taming ${t}%`:'🐎 Wild · 0%'}</span>`;

// ---------- v124 Taming Corral (note #45) ----------
// A round pen. The horse circles; tap "Ask" while it passes the glowing gate in front of you. Good timing calms it,
// bad timing spooks it. While it stays calm (meter at least half full) taming grows CORRAL_PCT_PER_MIN a minute:
// about 10% per 10 minutes, a real grind on purpose. Saved as you go. Frames come from requestAnimationFrame.
let corral=null,tameAcc=0;
// v124 friend mode (note #45): on a friend's barn visit you work THEIR horse; the server takes the minutes as taming help
// (2% a call, at most 10% per horse per day) and your friend's app adds it to the horse.
export function openCorral(id,{friend=null}={}){const h=friend?friend.horse:horse(id);if(!h)return;if(friend?h.tame>=100:G.isTamed(h)){toast(`${h.name} is already tamed.`);return;}
  const fr=friend?{...friend,base:Number(h.tame)||0,sent:0,busy:false,stop:false}:null,pct0=fr?Math.floor(fr.base):G.tamePct(h);
  const s=openSheet(`Taming Corral · ${h.name}`,`<div class="rn-corral">${fr?`<p class="rn-corral-friend">🤝 Helping <b>${esc(fr.username)}</b> tame ${esc(h.name)}. Your minutes count for them (up to 10% a day).</p>`:''}<p class="small">Tap <b>Ask</b> as ${esc(h.name)} trots past the glowing gate. Good timing calms them; rushing spooks them. Keep ${esc(h.name)} calm and taming grows (about 10% every 10 minutes).</p>
    <canvas class="rn-corral-pen" width="320" height="320" aria-label="Round pen"></canvas>
    <div class="rn-corral-meters"><label>Calm <span class="rn-calm"><i></i></span></label><label>Taming <b class="rn-cpct">${pct0}%</b><span class="rn-cbar"><i style="width:${pct0}%"></i></span></label></div>
    <p class="rn-corral-say" aria-live="polite">${esc(h.name)} watches you from across the pen…</p>
    <button type="button" class="primary rn-corral-ask">Ask</button></div>`,'rn-corral-sheet');
  s.dataset.kind='corral';const cv=s.querySelector('canvas'),ctx=cv.getContext('2d'),img=new Image();img.src=fr?F.friendHorsePic(h):portrait(h,{w:96,h:96});
  corral={id,ang:Math.random()*6.28,speed:1.1,calm:35,gained:0,spook:0,last:performance.now(),good:0,raf:0,say:s.querySelector('.rn-corral-say'),pops:[]};
  const GATE=Math.PI/2,WIN=.42;
  const sayIt=t=>{if(corral)corral.say.textContent=t;};
  s.querySelector('.rn-corral-ask').addEventListener('click',()=>{if(!corral)return;let d=((corral.ang-GATE)%6.283+6.283)%6.283;if(d>Math.PI)d-=6.283;
    if(Math.abs(d)<WIN){corral.calm=Math.min(100,corral.calm+16);corral.good++;corral.speed=Math.max(.7,corral.speed-.08);corral.pops.push({t:0,txt:['👅','💚','😌'][corral.good%3]});sayIt(['Nice and steady.','An ear turns toward you.','A soft lick and chew. Good!','Their head drops a little. Calm.'][corral.good%4]);}
    else{corral.calm=Math.max(0,corral.calm-22);corral.speed=Math.min(2.2,corral.speed+.35);corral.spook=1;corral.pops.push({t:0,txt:'💢'});sayIt('Too soon! Wait until they reach the gate.');}});
  const friendSave=(all=false)=>{if(!corral||fr.busy||fr.stop)return;const pct=Math.min(2,Math.round(corral.gained*100)/100);if(pct<(all?.1:1))return;fr.busy=true;corral.gained-=pct;
    F.social('tame',{username:fr.username,horseId:h.id,pct}).then(r=>{fr.sent+=Number(r.tamed?.pct)||0;if(!(r.tamed?.leftToday>0)){fr.stop=true;sayIt(`That’s all your help for today. ${fr.username} will see it next time they play!`);}})
      .catch(e=>{fr.stop=true;sayIt(F.friendError(e));}).finally(()=>{fr.busy=false;});};
  const save=()=>{if(fr){friendSave(true);return;}if(!corral||corral.gained<.01)return;const cur=horse(corral.id);if(!cur)return;const next=G.tameBy(cur,corral.gained);corral.gained=0;
    set({...ranch,herd:ranch.herd.map(x=>x.id===cur.id?next:x)},{quiet:true});if(G.isTamed(next)){window.TrottLog?.log('tamed',{how:'corral'});closeSheet();toast(`🎉 ${next.name} is tamed! Saddle up with the Starter Kit from Otis.`);}};
  const tick=now=>{if(!corral||!cv.isConnected){if(corral)save();corral=null;return;}corral.raf=requestAnimationFrame(tick);const dt=Math.min(.05,(now-corral.last)/1000);corral.last=now;if(document.hidden)return;
    corral.ang+=corral.speed*dt;corral.calm=Math.max(0,corral.calm-3.2*dt);corral.spook=Math.max(0,corral.spook-dt*1.5);
    if(corral.calm>=50&&!fr?.stop){corral.gained+=G.CORRAL_PCT_PER_MIN*dt/60;tameAcc+=dt;if(tameAcc>=5){addStat('tameSeconds',tameAcc);tameAcc=0;}}
    const cur=fr?{tamed:false,trust:(fr.base+fr.sent)/100*G.TAME_AT}:horse(corral.id),pct=Math.min(99.9,(cur?(cur.tamed?100:(cur.trust||0)/G.TAME_AT*100):0)+corral.gained);
    s.querySelector('.rn-calm i').style.width=corral.calm+'%';s.querySelector('.rn-cpct').textContent=pct.toFixed(1)+'%';s.querySelector('.rn-cbar i').style.width=pct+'%';
    if(fr)friendSave();else if(corral.gained>=.5)save();
    const W=320,c=W/2,R=118;ctx.clearRect(0,0,W,W);ctx.fillStyle='#d9c28f';ctx.beginPath();ctx.arc(c,c,R+26,0,7);ctx.fill();
    ctx.strokeStyle='#8a5a32';ctx.lineWidth=6;ctx.beginPath();ctx.arc(c,c,R+26,0,7);ctx.stroke();
    ctx.strokeStyle='#f5c84a';ctx.lineWidth=18;ctx.globalAlpha=.55+.25*Math.sin(now/250);ctx.beginPath();ctx.arc(c,c,R,GATE-WIN,GATE+WIN);ctx.stroke();ctx.globalAlpha=1;
    ctx.font='28px serif';ctx.textAlign='center';ctx.fillText('🧍',c,c+10);
    const hx=c+Math.cos(corral.ang)*R,hy=c+Math.sin(corral.ang)*R,sz=58+(corral.spook?6*Math.sin(now/40):0);
    if(img.complete){ctx.save();ctx.beginPath();ctx.arc(hx,hy,sz/2,0,7);ctx.clip();ctx.drawImage(img,hx-sz/2,hy-sz/2,sz,sz);ctx.restore();ctx.strokeStyle='#8a5a32';ctx.lineWidth=3;ctx.beginPath();ctx.arc(hx,hy,sz/2,0,7);ctx.stroke();}else ctx.fillText('🐎',hx,hy);
    corral.pops=corral.pops.filter(p=>(p.t+=dt)<1.2);for(const p of corral.pops){ctx.globalAlpha=1-p.t/1.2;ctx.fillText(p.txt,hx,hy-34-p.t*40);}ctx.globalAlpha=1;};
  corral.raf=requestAnimationFrame(tick);}

// v124 "save your horse" (notes #44/#47): guests' horses live only in this browser. At the moments that matter (the free
// horse reaching 50% and 80% trust, tapping Keep at the market) a sheet shows YOUR horse crying (anime tears) and offers
// a free account. Never shown to signed-in players; the trust moments show once each.
const freeHorse=()=>ranch?.herd?.find(h=>h.free&&!h.retired)||ranch?.herd?.[0]||null;
const freeName=()=>freeHorse()?.name||'';
const WARN_KEY='trottville-savewarn';
function warned(){try{return JSON.parse(localStorage.getItem(WARN_KEY))||{};}catch{return {};}}
function markWarned(k){const w=warned();w[k]=Date.now();try{localStorage.setItem(WARN_KEY,JSON.stringify(w));}catch{}}
export function saveWarning(why,{listing=null,horse:hz=null}={}){if(F.isSignedIn())return false;const h=hz||freeHorse();if(!h&&!listing)return false;
  const name=h?.name||'your horse',t=h?trustOfHorse(h.id):0;
  const lines={
    trust50:[`${esc(name)} trusts you ${t}% now!`,`That’s real work together. But ${esc(name)} lives only in this browser: clear it, or play on a new phone, and ${esc(name)} is gone forever.`],
    trust80:[`${esc(name)} trusts you ${t}%!`,`A whole week of feeding, brushing and riding. Right now all of that is saved only in this browser. One cleared browser or a new phone and ${esc(name)} is gone forever.`],
    keep:[`Keeping ${esc(listing?.name||'this horse')} needs a free account`,`Without one, nothing you own is safe. ${h?`${esc(name)}, your free horse, is saved only in this browser right now.`:''}`]}[why]||[`You could lose ${esc(name)}`,`Your horses are saved only in this browser.`];
  const img=h?portrait(h):listing?portrait({id:listing.id,breedId:listing.breedId,coat:listing.coat}):'';
  const s=openSheet(`You could lose ${name}`,`<div class="rn-cry"><div class="rn-cry-pic"><img src="${img}" alt="${esc(name)}, crying"><i class="rn-tear t1"></i><i class="rn-tear t2"></i><span class="rn-cry-sob" aria-hidden="true">😢</span></div>
    <h3>${lines[0]}</h3><p>${lines[1]}</p>
    <ul class="rn-cry-list"><li>💾 Every horse, all their trust and XP, saved for good</li><li>📱 Play on any phone or computer</li><li>👫 Friends: visit barns, feed and tame each other’s horses, race and trade</li></ul>
    <a class="primary rn-wide-btn" href="#account" data-ranch="toaccount">Create a free account</a><button type="button" class="secondary rn-wide-btn" data-ranch="savewarn-no">Not now</button><p class="small rn-cry-free">Free. No card needed.</p></div>`,'rn-cry-sheet');
  s.dataset.kind='savewarn';window.TrottLog?.log('savewarn',{why});return true;}
window.addEventListener('trust:change',e=>{const {id,value,was}=e.detail||{};if(F.isSignedIn()||!ranch)return;const h=ranch.herd.find(x=>x.id===id);if(!h||h.loaner||!h.free)return;
  const w=warned();for(const k of [80,50])if(was<k&&value>=k&&!w['trust'+k]){markWarned('trust'+k);if(k===80)markWarned('trust50');saveWarning('trust'+k,{horse:h});break;}});
// v124: whose trust map (riding.mjs): the signed-in player's, else the guest's on this device.
export const trustWho=()=>globalThis.MeadowCloud?.active?globalThis.MeadowCloud.user.id:'guest';
export const trustOfHorse=id=>G.rideTrustOf(trustWho(),id);
function treat(id,cost){const h=horse(id);if(!h)return;if(!spend(cost)){toast(`The vet costs ${cost} 🪙. You have ${fmt(loadWallet().coins)}. Play a game to earn more.`);return;}
  const res=R.vet(ranch,id);set(res.ranch);const tv=G.addRideTrust(trustWho(),id,G.TRUST_GAINS.vet,globalThis.localStorage,{cap:G.trustCap(h),source:'vet'});toast(`${h.name} is healthy again, and trusts you more for looking after them (Trust ${tv}%). Keep them fed so they stay that way.`);openVet();}

// v106: each horse is its own size (ranch.mjs listingSize).
const sizeWord=x=>!x?'':x<.62?'tiny':x<.82?'small':x<1.08?'medium':x<1.22?'big':'huge';
export function openMarket(){const d=R.dayNo(),{shelf,recent}=R.marketStock(d,ranch.bought),w=loadWallet();
  const card=l=>{const b=R.breedOf(l.breedId),band=R.ageBand(l.months);return `<article class="rn-m rn-t-${l.tier}${l.soldDay!=null?' rn-sold':''}"><img src="${portrait({id:l.id,breedId:l.breedId,coat:l.coat})}" alt=""><div class="rn-m-info"><b>${esc(l.name)}</b><small><button type="button" class="rn-breedlink" data-ranch="breeds" data-v="${b.id}" data-from="market">${esc(b.name)} ⓘ</button> · ${esc(R.coatLabel(l.coat))}</small><small>${R.ageText(l.months)} · ${band} · ${sizeWord(l.size)}${band!=='prime'?` (${band==='senior'?'half price':'+'+Math.round((R.AGE_PRICE[band]-1)*100)+'%'})`:''}</small>
    ${tameChip(l.tame)}${l.soldDay!=null?'<span class="rn-gone">Adopted by another rider</span>':`<span class="rn-left">${l.isNew?'New today · ':''}${l.daysLeft} day${l.daysLeft>1?'s':''} left here</span>`}</div>
    ${l.soldDay!=null?'':`<div class="rn-m-buy"><button type="button" class="primary" data-ranch="adopt" data-v="${l.id}" data-p="coins" ${w.coins<l.price.coins?'aria-disabled="true"':''}>${fmt(l.price.coins)} 🪙</button><button type="button" class="secondary" data-ranch="adopt" data-v="${l.id}" data-p="stars" ${w.stars<l.price.stars?'aria-disabled="true"':''}>${fmt(l.price.stars)} ⭐</button></div>`}</article>`;};
  const s=openSheet('Hoofhaven Horse Market',`<p>Everyone shops from the same horses, so when one is adopted it’s gone. New horses arrive daily; seniors are half price.</p>
  <div class="rn-m-bar"><button type="button" class="secondary" data-ranch="breeds" data-from="market">📖 All ${R.BREEDS.length} breeds</button><span class="small">🐴 ${ranch.herd.length} · ⭐ ${fmt(w.stars)} stars</span></div>
  <p class="small">Each new horse needs a meal a day (about 1 minute of play).</p>
  <div class="rn-market">${shelf.map(card).join('')}${recent.map(card).join('')}</div>
  <p class="small">Until the market moves to the server, other riders’ adoptions are simulated on this device.</p>`,'rn-wide');s.dataset.kind='market';}// v95: never full screen (Yoshi: “awkward”); in the valley it is the book by Hoofhaven’s entrance

// v95: one market horse, from its stall in the Hoofhaven hall. Anyone can take a free test ride; keeping (adopting) a
// horse needs a signed-in account. ride = whether the world can start a test ride (false on the website).
// v96 the stall clipboard: what a horse lover wants to know, plus the breed's special talent.
function clipboard(l,b){const t=R.breedTalent(b),xp=R.marketXp(l),lv=R.level(xp),ht=R.horseHeight(l.breedId,l.seed);
  const dots=n=>'<span class="rn-dots" aria-hidden="true">'+'●'.repeat(n)+'<i>'+'●'.repeat(5-n)+'</i></span>';
  const row=(k,v)=>`<dt>${k}</dt><dd>${v}</dd>`;
  return `<section class="rn-clip" aria-label="${esc(l.name)}’s clipboard"><div class="rn-talent"><span aria-hidden="true">${t.icon}</span><div><b>${esc(t.title)}</b><p>${esc(t.line)}</p></div></div>
  <div class="rn-tame-row">${tameChip(l.tame)}<small>${l.tame>=100?'Fully tamed: someone spent hours with this horse, so it costs more. Ready to saddle up.':l.tame>0?`Part tamed. Finish the job with care at home or in the Taming Corral (about 10% per 10 minutes of work).`:'Wild! Cheaper, but you’ll take this horse to the Taming Corral and work with them before anyone can ride (about 10% per 10 minutes).'}</small></div>
  <dl class="rn-stats">${row('Training',`Level ${lv} · ${xp.toLocaleString()} XP${xp?'':' (not trained yet)'}`)}${row('Age',`${R.ageText(l.months)} · ${R.ageBand(l.months)}`)}${row('Height',`about ${ht.hands} hands (${ht.cm} cm)`)}
  ${row('Breed',`${esc(b.name)} · from ${esc(b.origin)}`)}${row('Type',esc(GROUPS[b.group]||''))}${row('Coat',esc(R.coatLabel(l.coat)))}${row('Temperament',esc(b.trait))}${row('At the market',`${l.daysLeft} more day${l.daysLeft>1?'s':''}`)}</dl>
  <div class="rn-skills" aria-label="Breed strengths">${[['Speed','speed'],['Strength','strength'],['Stamina','stamina'],['Show','show']].map(([n,k])=>`<span>${n} ${dots(t.skills[k])}<span class="sr-only">${t.skills[k]} of 5</span></span>`).join('')}</div>
  <p class="rn-fact"><b>Did you know?</b> ${esc(b.fact)}</p></section>`;}
export function openListing(id,{ride=true}={}){const {shelf}=R.marketStock(R.dayNo(),ranch?.bought||[]),l=shelf.find(x=>x.id===id),w=loadWallet();
  if(!l){toast('That horse has just gone home with another rider.');return;}const b=R.breedOf(l.breedId),band=R.ageBand(l.months),me=F.isSignedIn();
  const s=openSheet(l.name,`<div class="rn-listing"><img src="${portrait({id:l.id,breedId:l.breedId,coat:l.coat})}" alt=""><div><p><b>${esc(b.name)}</b> · ${esc(R.coatLabel(l.coat))}</p><p class="small">${R.ageText(l.months)} · ${band} · ${l.daysLeft} day${l.daysLeft>1?'s':''} left at the market</p></div></div>
  ${clipboard(l,b)}
  ${ride?`<button type="button" class="primary rn-wide-btn" data-ranch="testride" data-v="${esc(l.id)}">🐎 Free test ride</button>`:''}
  ${me?`<div class="rn-m-buy"><button type="button" class="primary" data-ranch="adopt" data-v="${l.id}" data-p="coins" ${w.coins<l.price.coins?'aria-disabled="true"':''}>Keep ${esc(l.name)} · ${fmt(l.price.coins)} 🪙</button><button type="button" class="secondary" data-ranch="adopt" data-v="${l.id}" data-p="stars" ${w.stars<l.price.stars?'aria-disabled="true"':''}>${fmt(l.price.stars)} ⭐</button></div>`
     :`<div class="rn-save-cta"><p><b>Keeping ${esc(l.name)} needs a free account.</b> Test rides are free for everyone.</p><p class="small">An account saves all your work too: every horse, your Trotties, and ${freeName()?`<b>${esc(freeName())}</b>, the free horse you’ve spent so long building up XP and trust with`:'the free horse you’ve spent so long building up'}.</p><a class="primary rn-wide-btn" href="#account" data-ranch="toaccount">Create a free account</a></div>`}`);s.dataset.kind='listing';}

// Breed guide: every breed with one fact, searchable by any word (name, country, colour, “pony”, “spots”…).
// Wild breeds are guide-only. If a breed is in today's market a Buy button appears right on its card.
let breedGroup='all',breedQuery='';
export function openBreeds({focus=null,from=null}={}){const d=R.dayNo(),{shelf}=R.marketStock(d,ranch?.bought||[]),w=loadWallet();
  const inMarket=new Map();for(const l of shelf){if(!inMarket.has(l.breedId))inMarket.set(l.breedId,[]);inMarket.get(l.breedId).push(l);}
  const owned=id=>(ranch?.herd||[]).filter(h=>h.breedId===id).length;
  const list=[...R.BREEDS].sort((a,b)=>a.name.localeCompare(b.name));
  const dots=b=>b.coats.slice(0,5).map(c=>`<i style="--c:${R.COATS[c]?.coat||'#999'};--m:${R.COATS[c]?.mane||'#555'}" title="${esc(c)}"></i>`).join('');
  const status=b=>{if(b.wild)return '<span class="rn-br-free">🌿 Lives free and protected · not for sale</span>';
    const ls=(inMarket.get(b.id)||[]).sort((x,y)=>x.price.coins-y.price.coins);
    if(ls.length){const l=ls[0];return `<div class="rn-br-buy"><span class="rn-br-here">🐴 ${esc(l.name)} (${R.ageText(l.months)}, ${R.ageBand(l.months)}) is at the horse market now${ls.length>1?` (+${ls.length-1} more)`:''}</span>${!ranch?'':`<button type="button" class="primary" data-ranch="adopt" data-v="${l.id}" data-p="coins" ${w.coins<l.price.coins?'aria-disabled="true"':''}>Buy ${esc(l.name)} · ${fmt(l.price.coins)} 🪙</button>`}</div>`;}
    return '<span class="rn-br-none">Not in the horse market right now. New horses arrive every day.</span>';};
  const card=b=>`<article class="rn-br${b.id===focus?' rn-focus':''}" data-q="${esc(searchText(b))}" data-g="${b.group}" data-m="${inMarket.has(b.id)?1:0}" id="rn-br-${b.id}">
    <div class="rn-br-head"><span class="rn-br-dots" aria-hidden="true">${dots(b)}</span><div><h3>${esc(b.name)}${owned(b.id)?` <span class="rn-tag">You have ${owned(b.id)}</span>`:''}</h3><small>${esc(b.origin)} · ${esc(GROUPS[b.group])} · ${sizeLabel(b.size)}</small></div></div>
    <p class="rn-br-trait">${esc(b.trait)}</p><p class="rn-br-fact"><b>Did you know?</b> ${esc(b.fact)}</p>
    <div class="rn-br-foot">${b.wild?'':`<span class="rn-br-price" title="Real horses of this breed cost about $${fmt(b.usd)}">${b.tier==='starter'?'Free as your first horse · ':''}≈ ${fmt(b.coins)} 🪙 <small>· real horses about $${fmt(b.usd)}</small></span>`}<a href="${wikiUrl(b)}" target="_blank" rel="noopener noreferrer" class="rn-br-wiki">Read more on Wikipedia ↗</a></div>
    ${status(b)}</article>`;
  const chips=[['all','All'],...Object.entries(GROUPS),['market',`In the market (${inMarket.size})`]];
  const s=openSheet('Breed guide',`${from==='market'?'<button type="button" class="text-button" data-ranch="market">← Back to the horse market</button>':''}
  <p>${list.length} horse breeds from around the world. Search for any word: a name like Clydesdale, a country, a colour, or “spots”.</p>
  <input type="search" id="rn-breed-search" class="rn-br-search" placeholder="Search breeds" value="${esc(breedQuery)}" aria-label="Search breeds" autocomplete="off">
  <div class="rn-filters rn-br-chips" role="group" aria-label="Show">${chips.map(([k,l])=>`<button type="button" data-ranch="bgroup" data-v="${k}" aria-pressed="${breedGroup===k}">${esc(l)}</button>`).join('')}</div>
  <p class="small rn-br-count" aria-live="polite"></p><div class="rn-br-list">${list.map(card).join('')}</div>
  <p class="rn-br-empty small" hidden></p>
  <p class="small">Prices follow what real horses of each breed cost (very roughly), so a Clydesdale costs a lot more than a Shetland. Facts come from each breed’s Wikipedia article.</p>`,'rn-wide rn-full');
  s.dataset.kind='breeds';filterBreeds();
  if(focus)requestAnimationFrame(()=>s.querySelector('#rn-br-'+CSS.escape(focus))?.scrollIntoView({block:'center'}));}
function filterBreeds(){if(!sheet||sheet.dataset.kind!=='breeds')return;const words=breedQuery.toLowerCase().split(/\s+/).filter(Boolean);let n=0;
  for(const el of sheet.querySelectorAll('.rn-br')){const ok=(breedGroup==='all'||(breedGroup==='market'?el.dataset.m==='1':el.dataset.g===breedGroup))&&words.every(w=>el.dataset.q.includes(w));el.hidden=!ok;if(ok)n++;}
  sheet.querySelector('.rn-br-count').textContent=`Showing ${n} breed${n===1?'':'s'}`;
  const empty=sheet.querySelector('.rn-br-empty');empty.hidden=n>0;empty.textContent=breedQuery?`No breeds match “${breedQuery}”. Try another word.`:'No breeds here yet.';}

export function openBell(){const w=loadWallet(),alerts=ranch?R.alerts(ranch):[],p=Coins.pending();
  const s=openSheet('Notifications',`${p?`<div class="rn-bell-item rn-bell-coins"><span>🪙</span><div><b>${fmt(p)} Trotties waiting</b><small>${(w.pending||[]).slice(-4).map(x=>esc(x.from)).join(' · ')}</small></div><button type="button" class="primary" data-ranch="collect">Collect</button></div>`:''}
  ${alerts.map(a=>`<div class="rn-bell-item"><span>${a.icon}</span><div><b>${esc(a.text)}</b></div>${a.id==='vet'?'<button type="button" class="secondary" data-ranch="vet">Vet</button>':a.id==='food'?'<button type="button" class="secondary" data-ranch="store">Feed store</button>':'<button type="button" class="secondary" data-ranch="gostable">Stable</button>'}</div>`).join('')}
  ${!p&&!alerts.length&&!F.unseenCount()?'<p class="rn-ok">💚 All caught up.</p>':''}
  ${F.bellHTML()}`);s.dataset.kind='bell';F.markSeen();}
export function bellCount(){return (Coins.pending()>0?1:0)+(ranch?R.alerts(ranch).length:0)+F.unseenCount();}
// Friend notes arrive on friends.js's heartbeat: repaint the bell dot and an open bell sheet.
window.addEventListener('friends:change',()=>{const d=document.querySelector('#bell .bell-dot');if(d)d.hidden=!bellCount();if(sheet?.dataset.kind==='bell')openBell();});
export {F as Friends};

// ---------- Actions ----------
export function feedOne(id){const h=horse(id);if(!h)return;const res=R.feed(ranch,id);
  if(!res.ok){toast(res.reason);if(res.vet)openVet(id);else if(res.empty)openStore();return;}
  set(res.ranch);queueCare(res.horse,"feed");toast(`${h.name} munches happily. +${res.xp} XP`);}
// Care coins: 10 Trotties once a day per horse per kind (pet / feed / groom).
const CARE_NAME={pet:'Petting',feed:'Feeding',groom:'Brushing',tidy:'Raking the stall for'};
export function queueCare(h,kind){const key=`${R.dayNo()}:${h.id}:coin:${kind}`;if(ranch.careDay[key])return false;set({...ranch,careDay:{...ranch.careDay,[key]:true}},{quiet:true});
  Coins.queueCoins({from:`${CARE_NAME[kind]} ${h.name}`,coins:10,lines:[`${CARE_NAME[kind]} ${h.name} · 10 🪙`]});return true;}

document.addEventListener('input',e=>{if(e.target.id==='rn-name'){pickName=e.target.value;const go=document.querySelector('[data-ranch="start"]');if(go)go.textContent=`Bring ${pickName.trim()||go.dataset.hint||'them'} home`;}if(e.target.id==='rn-breed-search'){breedQuery=e.target.value;filterBreeds();}if(e.target.id==='rn-search'){search=e.target.value;const pos=e.target.selectionStart;window.dispatchEvent(new CustomEvent('ranch:change'));requestAnimationFrame(()=>{const i=document.getElementById('rn-search');if(i){i.focus();i.setSelectionRange(pos,pos);}});}});
// 2026-11-15 playtest: a fast double tap bought a food bundle twice. Anything that spends Trotties ignores a second tap within 600 ms.
const PAYING=new Set(['buy','kitbuy','vetpay','adopt','barnup','breedgo','petadopt','shoebuy','tackbuy','oddjob','collect','start','showgo','tradesend','tradeclaim','streakgo']);let lastPay=0;
document.addEventListener('click',e=>{const b=e.target.closest('[data-ranch]');if(!b)return;const k=b.dataset.ranch,v=b.dataset.v;
  if(PAYING.has(k)){const t=performance.now();if(t-lastPay<600)return;lastPay=t;}
  if(b.getAttribute('aria-disabled')==='true'&&!['adopt','buy'].includes(k)){if(b.dataset.why)toast(b.dataset.why);return;}
  if(k==='close'){closeByUser();vetGame=null;return;}
  if(k==='breed'){pickBreed=v;pickLook=null;window.dispatchEvent(new CustomEvent('ranch:change'));return;}
  if(k==='breedinfo'){openBreedInfo(v);return;}
  if(k==='breedpick'){closeSheet();pickBreed=v;pickLook=null;window.dispatchEvent(new CustomEvent('ranch:change'));return;}
  if(k==='look'){pickLook=v||null;window.dispatchEvent(new CustomEvent('ranch:change'));return;}
  if(k==='rider'){showRider=!showRider;window.dispatchEvent(new CustomEvent('ranch:change'));return;}
  if(k==='start'){const b=R.breedOf(pickBreed),name=(pickName.trim()||document.getElementById('rn-name')?.placeholder||'Maple').slice(0,20);
    {const bad=R.horseNameProblem(name);if(bad){toast(bad);const i=document.getElementById('rn-name');i?.focus();i?.select?.();return;}}
    disposeStarter();set(R.startRanch(b.id,R.starterCoat(b.id),name,Date.now(),starterLook(b.id)));toast(`Welcome home, ${name}!`);location.hash='#home';return;}
  if(k==='filter'){filter=v;window.dispatchEvent(new CustomEvent('ranch:change'));return;}
  if(k==='store'){openStore();return;}
  if(k==='market'){openMarket();return;}
  if(k==='breeds'){if(v)breedQuery='';openBreeds({focus:v||null,from:b.dataset.from||null});return;}
  if(k==='bgroup'){breedGroup=v;sheet?.querySelectorAll('[data-ranch="bgroup"]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.v===v)));filterBreeds();return;}
  if(k==='vet'){openVet(v);return;}
  if(k==='bell'){openBell();return;}
  if(k==='gostable'){closeSheet();location.hash='#stable';return;}
  if(k==='collect'){closeSheet();Coins.showCollect({title:'Trotties waiting for you'});return;}
  if(k==='feed'){feedOne(v);return;}
  if(k==='feedall'){const res=R.feedAll(ranch);set(res.ranch);toast(res.fed?`Fed ${res.fed} horse${res.fed>1?'s':''}.${res.short?` ${res.short} still hungry: you’re out of food.`:''}`:'Out of food. Visit the feed store or play Appleoosa.');if(res.short)openStore();return;}
  if(k==='buy'){const res=R.buyBundle(ranch,loadWallet().coins,Number(v));if(!res.ok){toast(`${res.reason}. ${res.short?`You need ${res.short} more.`:''}`);return;}spend(res.cost);set(res.ranch);toast(`+${v} ${+v===1?'carrot':'carrots'} in your pantry.`);refreshSheet();return;}
  if(k==='vetpay'){treat(v,R.vetFee(R.VET_COST,loadWallet().coins));return;}
  if(k==='vethelp'){const order=[0,1,2,3,4].sort(()=>Math.random()-.5);vetGame={id:v,order,i:0,done:[],miss:0};openVetGame();return;}
  if(k==='tool'&&vetGame){const want=CHECKS[vetGame.order[vetGame.i]][0];if(v===want){vetGame.done.push(v);vetGame.i++;}else vetGame.miss++;
    if(vetGame.i>=CHECKS.length){const id=vetGame.id;vetGame=null;treat(id,R.vetHelpFee(loadWallet().coins));return;}openVetGame();return;}
  if(k==='adopt'){const {shelf}=R.marketStock(R.dayNo(),ranch.bought),l=shelf.find(x=>x.id===v);if(!l){toast('Oh! Another rider just adopted that horse.');openMarket();return;}
    if(!F.isSignedIn()){saveWarning('keep',{listing:l});return;}
    const stars=b.dataset.p==='stars',cost=stars?l.price.stars:l.price.coins,have=stars?loadWallet().stars:loadWallet().coins;
    if(have<cost){toast(stars?`${l.name} costs ${fmt(cost)} ⭐. Redeem a Game Card under Me → Card shop.`:`${l.name} costs ${fmt(cost)} 🪙. You need ${fmt(cost-have)} more. Keep playing!`);return;}
    const res=R.adopt(ranch,l);if(!res.ok){toast(res.reason);return;}(stars?spendStars:spend)(cost);set(res.ranch);closeSheet();toast(`${l.name} is coming home with you! Remember: one meal a day.`);location.hash='#horse/'+res.horse.id;return;}
  if(k==='toaccount'){closeSheet();return;}
  if(k.startsWith('trade')){void tradeClick(k,v,b);return;}
  if(k==='corral'){openCorral(v);return;}
  if(k==='badges'){openBadges();return;}
  if(k==='stallin'){stallIn(v);return;}
  if(k==='stallswap'){const res=R.swapStall(ranch,b.dataset.in,v);if(!res.ok){toast(res.reason);return;}set(res.ranch);closeSheet();toast(`${horse(b.dataset.in)?.name} is in a stall now; ${horse(v)?.name} is off to the pasture.`);return;}
  if(k==='barnup'){const res=R.upgradeBarn(ranch,loadWallet().coins);if(!res.ok){toast(res.short?`${res.reason}. You need ${fmt(res.short)} more.`:res.reason);return;}spend(res.cost);set(res.ranch);toast(`${res.barn.icon} Welcome to your ${res.barn.name}! ${res.barn.stalls} stalls.`);window.TrottLog?.log('barn',{level:ranch.barnLevel});return;}
  if(k==='pets'){openPets();return;}
  if(k==='petadopt'){const res=R.adoptPet(ranch,v,loadWallet().coins);if(!res.ok){toast(res.short?`${res.reason}. You need ${fmt(res.short)} more.`:res.reason);return;}spend(res.cost);set(res.ranch);closeSheet();toast(`${R.PETS.find(p=>p.id===v).icon} ${ranch.pet.name} has moved into your barn!`);return;}
  if(k==='petpat'){const res=R.patPet(ranch);if(!res.ok)return;set(res.ranch,{quiet:true});addStat('petPats',1);const p=R.PETS.find(x=>x.id===ranch.pet.id);toast(res.first?`${p.icon} ${ranch.pet.name} wiggles with joy! (+5 🪙 for today’s first pat)`:`${p.icon} ${ranch.pet.name} loves that.`);if(res.first){Coins.queueCoins({from:'Pat '+ranch.pet.name,coins:5,lines:['Barn pet pat · 5 🪙']});}window.dispatchEvent(new CustomEvent('ranch:change'));return;}
  if(k==='foal'){openBreeding();return;}
  if(k==='breedgo'){doBreed();return;}
  if(k==='breedpick'){breedPick[b.dataset.role]=v;openBreeding();return;}
  if(k==='show'){openShow();return;}
  if(k==='showgo'){openRing(v);return;}
  if(k==='savewarn-no'){closeSheet();return;}
  if(k==='testride'){closeSheet();window.dispatchEvent(new CustomEvent('ranch:testride',{detail:v}));return;}
  if(k==='carehome'){e.preventDefault();window.dispatchEvent(new CustomEvent('ranch:carehome',{detail:v}));return;}
  if(k==='tack'){openTack(v);return;}
  if(k==='shoebuy'){buyShoesFor(v,b.dataset.p);return;}
  if(k==='retire'){openRetire(v);return;}if(k==='retirego'){retireNow(v);return;}if(k==='retireno'){closeSheet();return;}
  if(k==='tackbuy'){buyTackFor(v,b.dataset.p,b.dataset.c);return;}
  if(k==='tackcomp'){getCompFor(v,b.dataset.p);return;}
  if(k==='kitbuy'){buyKitFor(v);return;}
  if(k==='tackloan'){loanFor(v);return;}
  if(k==='oddjob'){oddJob(v);return;}
  if(k==='streakgo'){claimStreak();return;}
  if(k==='reset'){confirmReset();return;}});

// In-app confirm (native confirm() is blocked in Yoshi's browser).
function confirmReset(){const s=openSheet('Start over?',`<p>This clears your herd, food and horse market purchases on this device, so you can try the new-player start again. Your Trotties and outfits stay.</p><div class="rn-profile-actions"><button type="button" class="primary" data-ranch="resetyes">Yes, start over</button><button type="button" class="secondary" data-ranch="close">Keep my ranch</button></div>`);s.dataset.kind='reset';}
document.addEventListener('click',e=>{if(e.target.closest('[data-ranch="resetyes"]')){closeSheet();ranch=null;try{localStorage.removeItem(R.RANCH_KEY);}catch{}location.hash='#home';window.dispatchEvent(new CustomEvent('ranch:change'));}});
window.addEventListener('trottcoins:change',()=>{if(sheet)for(const el of sheet.querySelectorAll('[data-trottcoins] b'))el.innerHTML=coinHTML(loadWallet().coins);});

// ---------- v124 friends help tame your horses (note #45) ----------
// Their corral minutes arrive as rows on the server; this app adds them to the horse once, then acknowledges them.
let tamesAt=0;
async function pullTames(force=false){if(!F.socialReady()||!ranch?.herd?.length||(!force&&Date.now()-tamesAt<60000))return;tamesAt=Date.now();
  try{const rows=(await F.social('tames')).tames||[];if(!rows.length)return;let r=ranch;const by={};
    for(const t of rows){const h=r.herd.find(x=>x.id===t.horseId);if(!h||G.isTamed(h))continue;const next=G.tameBy(h,Number(t.pct)||0);r={...r,herd:r.herd.map(x=>x.id===h.id?next:x)};
      const k=t.from+'|'+h.name;by[k]=(by[k]||0)+(Number(t.pct)||0);if(G.isTamed(next))toast(`🎉 ${next.name} is tamed, thanks to ${t.from}!`);}
    if(r!==ranch)set(r);for(const [k,v] of Object.entries(by)){const [from,name]=k.split('|');toast(`🪢 ${from} helped tame ${name} (+${Math.round(v*10)/10}%)`);}
    await F.social('tames_ack',{ids:rows.map(t=>t.id)});}catch{}}
window.addEventListener('friends:helptame',e=>{const {username,horse:h}=e.detail||{};if(h)openCorral(h.id,{friend:{username,horse:h}});});
document.addEventListener('change',e=>{const id=e.target?.dataset?.ranchTameopen;if(!id)return;const h=horse(id);if(!h)return;
  set({...ranch,herd:ranch.herd.map(x=>x.id===id?R.fromPlain({...R.toPlain(x),tameOpen:e.target.checked}):x)},{quiet:true});
  toast(e.target.checked?`Friends can help tame ${h.name} now.`:`Only you can tame ${h.name} now.`);});

// ---------- v124 friends-only trades (note #48) ----------
// Offer a horse to a friend for some Trotties (or as a gift). They say yes or no; after yes there is a day to change
// your minds, then they bring the horse home (paying the Trotties) and your app hands it over and banks the price.
const PRICES=[0,100,250,500,1000,2500,5000,10000];
let tradePick=null;
function openTradePick(id,username=null){const h=id?horse(id):null;
  if(!h){const list=ranch.herd.filter(R.canTrade);if(!list.length){toast('None of your horses can be traded yet. Legendary horses and your free horse stay with you.');return;}
    tradePick={id:null,username,price:0};openSheet(username?`Offer a horse to ${username}`:'Offer a horse',`<div class="rn-swap">${list.map(x=>`<button type="button" class="rn-mini" data-ranch="tradehorse" data-v="${esc(x.id)}"><img src="${portrait(x,{w:64,h:64})}" alt=""> ${esc(x.name)}</button>`).join('')}</div>`,'rn-trade-sheet');return;}
  if(h&&!R.canTrade(h)){toast('Legendary horses and your free horse can’t be traded.');return;}
  tradePick={id,username:username||tradePick?.username||null,price:tradePick?.price||0};drawTradePick();}
function drawTradePick(){const h=horse(tradePick.id),friends=F.friendsList();if(!h)return;
  openSheet(`Offer ${h.name}`,`<div class="rn-trade"><img src="${portrait(h,{w:120,h:120})}" alt=""><p class="small">Only friends can trade. After they say yes you both have 24 hours to change your minds. Then they bring ${esc(h.name)} home.</p>
    ${friends.length?`<h3>To</h3><div class="rn-swap">${friends.map(f=>`<button type="button" class="rn-mini${tradePick.username===f.username?' on':''}" data-ranch="tradeto" data-v="${esc(f.username)}" aria-pressed="${tradePick.username===f.username}">${esc(f.username)}</button>`).join('')}</div>`
      :'<p class="rn-ok">Add a friend first (the bell → Friends).</p>'}
    <h3>Price</h3><div class="rn-swap">${PRICES.map(p=>`<button type="button" class="rn-mini${tradePick.price===p?' on':''}" data-ranch="tradeprice" data-v="${p}" aria-pressed="${tradePick.price===p}">${p?fmt(p)+' 🪙':'🎁 Gift'}</button>`).join('')}</div>
    <button type="button" class="primary full" data-ranch="tradesend" ${tradePick.username?'':'disabled'}>Send offer${tradePick.username?' to '+esc(tradePick.username):''}</button></div>`,'rn-trade-sheet');}
const tradeWhen=t=>t.readyIn?`ready in ${t.readyIn>=60?Math.ceil(t.readyIn/60)+' h':t.readyIn+' min'}`:'';
async function openTrades(){if(!F.isSignedIn()){toast('Sign in to trade with friends.');return;}openSheet('Trades','<p class="small">Looking for offers…</p>','rn-trade-sheet');
  let list;try{list=(await F.social('trades')).trades||[];}catch(e){closeSheet();toast(F.friendError(e));return;}
  // Your side of a finished trade: hand the horse over and bank the Trotties.
  for(const t of list.filter(t=>t.mine&&t.status==='collected'&&!t.settled))await settleTrade(t);
  const row=t=>{const hz=t.horse||{},who=esc(t.with),price=t.price?`${fmt(t.price)} 🪙`:'a gift';
    const act=t.mine?(t.status==='offered'?`<small>Waiting for ${who}</small><button type="button" class="text-button" data-ranch="tradecancel" data-v="${t.id}">Cancel</button>`
        :t.status==='accepted'?`<small>${who} said yes · ${tradeWhen(t)||'any moment now'}</small>${t.ready?'':`<button type="button" class="text-button" data-ranch="tradecancel" data-v="${t.id}">Cancel</button>`}`
        :`<small>${t.status==='collected'?'Traded ✓':t.status==='declined'?'They said no thanks':'Cancelled'}</small>`)
      :(t.status==='offered'?`<div class="fr-two"><button type="button" class="primary" data-ranch="tradeyes" data-v="${t.id}">Yes please</button><button type="button" class="secondary" data-ranch="tradeno" data-v="${t.id}">No thanks</button></div>`
        :t.status==='accepted'?(t.ready?`<button type="button" class="primary" data-ranch="tradeclaim" data-v="${t.id}" data-p="${t.price}">Bring ${esc(hz.name)} home${t.price?' · '+fmt(t.price)+' 🪙':''}</button>`:`<small>Coming home ${tradeWhen(t)}</small><button type="button" class="text-button" data-ranch="tradecancel" data-v="${t.id}">Cancel</button>`)
        :`<small>${t.status==='collected'?'Home with you ✓':t.status==='declined'?'You said no thanks':'Cancelled'}</small>`);
    return `<div class="fr-row rn-trade-row"><span>${t.mine?'📤':'📥'}</span><div><b>${esc(hz.name||'Horse')}</b><small>${esc(hz.breed||'')} · ${t.mine?'to':'from'} ${who} · ${price}${typeof hz.tame==='number'&&hz.tame<100?` · taming ${Math.floor(hz.tame)}%`:''}</small></div>${act}</div>`;};
  openSheet('Trades',`<p class="small">Trade horses with friends for Trotties, or give one as a gift. Legendary horses and your free horse always stay with you.</p>
    ${list.length?`<div class="fr-list">${list.map(row).join('')}</div>`:'<p class="rn-ok">No trades yet. Open one of your horses and tap “Offer to a friend”.</p>'}`,'rn-trade-sheet');}
async function settleTrade(t){try{const r=(await F.social('trade_settle',{id:t.id})).settled;const h=horse(r.horseId);
    if(h)set(R.giveTrade(ranch,h.id));if(r.price)Coins.queueCoins({from:`Trade with ${t.with}`,coins:r.price,lines:[`${t.horse?.name||'Your horse'} found a new home`]});
    toast(`${t.horse?.name||'Your horse'} went to ${t.with}${r.price?` and you got ${fmt(r.price)} 🪙`:''}. Look after each other!`);}catch{}}
window.addEventListener('friends:tradeto',e=>{tradePick={id:null,username:e.detail?.username,price:0};openTradePick(null,e.detail?.username);});
window.addEventListener('friends:trades',()=>openTrades());
async function tradeClick(k,v,b){
  if(k==='tradepick'){tradePick=null;openTradePick(v);return true;}
  if(k==='tradehorse'){openTradePick(v,tradePick?.username);return true;}
  if(k==='tradeto'){tradePick.username=v;drawTradePick();return true;}
  if(k==='tradeprice'){tradePick.price=Number(v)||0;drawTradePick();return true;}
  if(k==='tradesend'){const h=horse(tradePick.id);if(!h||!tradePick.username)return true;b.disabled=true;
    try{await F.social('trade_offer',{username:tradePick.username,horse:R.tradeSnapshot(h),price:tradePick.price});toast(`Offer sent to ${tradePick.username}. You’ll see their answer under Trades.`);tradePick=null;openTrades();}
    catch(e){toast(F.friendError(e));b.disabled=false;}return true;}
  if(['tradeyes','tradeno','tradecancel'].includes(k)){b.disabled=true;
    try{await F.social(k==='tradecancel'?'trade_cancel':'trade_answer',{id:Number(v),accept:k==='tradeyes'});toast(k==='tradeyes'?'You said yes! The horse can come home in 24 hours.':k==='tradeno'?'You said no thanks.':'Trade cancelled.');openTrades();}
    catch(e){toast(F.friendError(e));b.disabled=false;}return true;}
  if(k==='tradeclaim'){const price=Number(b.dataset.p)||0;if(loadWallet().coins<price){toast(`You need ${fmt(price-loadWallet().coins)} more 🪙 to bring this horse home.`);return true;}
    if(ranch.herd.length>=R.MAX_HERD){toast('Your ranch is full.');return true;}b.disabled=true;
    try{const c=(await F.social('trade_claim',{id:Number(v)})).collected;const res=R.receiveTrade(ranch,c.horse,c.id,'a friend');if(!res.ok){toast(res.reason);return true;}
      if(price&&!res.again)spend(price);set(res.ranch);addStat('trades',1);toast(`${res.horse.name} is home! Give them a carrot to settle in.`);openTrades();}
    catch(e){toast(F.friendError(e));b.disabled=false;}return true;}
  return false;}

// ---------- v124 your horses saved to your account (note #44; Yoshi chose "merge on sign-in") ----------
// Once the server has hl_social, a signed-in rider plays the same ranch as a guest, saved to the account (so it follows
// them to any phone). On first sign-in the guest herd, trust and badges join whatever the account already had.
var ACC={on:false,uid:null,timer:0,busy:false};window.TrottAccountRanch=ACC;
export const accountRanch=()=>ACC.on;
const TRUST_KEY=who=>`horselandia-adventure-v1:${who}:trust`;
function readJSON(k){try{return JSON.parse(localStorage.getItem(k))||{};}catch{return {};}}
function maxMerge(a,b){const o={...a};for(const [k,v] of Object.entries(b||{}))if(typeof v==='number')o[k]=Math.max(Number(o[k])||0,v);else if(!(k in o))o[k]=v;return o;}
async function accountSync(){const c=window.MeadowCloud,uid=c?.active&&c.ready?c.user?.id:null;if(uid===ACC.uid)return;ACC.uid=uid;
  if(!uid){if(ACC.on){ACC.on=false;window.dispatchEvent(new CustomEvent('ranch:change'));}return;}
  let saved;try{saved=(await F.social('load')).save;}catch{return;}// server not updated yet: keep the cloud stable
  if(ACC.uid!==uid)return;
  const device=R.loadRanch(),merged=saved?.ranch?R.mergeRanches(saved.ranch,device||{}):(device||ranch);
  if(merged){ranch=merged;R.saveRanch(merged);}
  // Trust and lifetime stats were kept under 'guest' before sign-in: carry them over (the larger value wins).
  try{localStorage.setItem(TRUST_KEY(uid),JSON.stringify(maxMerge(maxMerge(readJSON(TRUST_KEY(uid)),saved?.trust),readJSON(TRUST_KEY('guest')))));
    localStorage.setItem('trottville-stats-v1:'+uid,JSON.stringify(maxMerge(maxMerge(readJSON('trottville-stats-v1:'+uid),saved?.stats),readJSON('trottville-stats-v1:guest'))));}catch{}
  ACC.on=true;window.dispatchEvent(new CustomEvent('ranch:change'));queueSave(0);shareCard();}
function queueSave(ms=4000){if(!ACC.on)return;clearTimeout(ACC.timer);ACC.timer=setTimeout(async()=>{if(!ACC.on||!ranch)return;if(ACC.busy){queueSave(3000);return;}ACC.busy=true;
  try{await F.social('save',{ranch:R.plainRanch(ranch),stats:stats(),trust:readJSON(TRUST_KEY(ACC.uid))});}catch(e){if(/RATE/.test(e?.message||''))queueSave(6000);}finally{ACC.busy=false;}},ms);}
window.addEventListener('ranch:change',()=>queueSave());window.addEventListener('trust:change',()=>queueSave(8000));
for(const ev of ['meadow:auth','meadow:cloud','friends:change'])window.addEventListener(ev,()=>void accountSync());

export const horseNameProblem=R.horseNameProblem;
