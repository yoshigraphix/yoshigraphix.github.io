// Your ranch: the herd (1 free starter horse, room for 100), food, tiredness, the vet and the horse market.
// Pure logic, no DOM: horselandia.js, home-horse.js and ranch-ui.js call these and keep one ranch per device
// in localStorage. Prices follow docs/economy-plan.md (10 Trotties ≈ one minute of play).
export const DAY=86400000,HOUR=3600000,MAX_HERD=100;
export const dayNo=(ms=Date.now())=>Math.floor(ms/DAY);

// Tiny seeded random, so a seed always makes the same horse / the same market day.
export function rng(seed){let h=2166136261;for(const c of String(seed))h=Math.imul(h^c.charCodeAt(0),16777619);
  return ()=>{h=Math.imul(h^h>>>15,2246822507);h=Math.imul(h^h>>>13,3266489909);return ((h^=h>>>16)>>>0)/4294967296;};}
import {BREED_LIST} from './breeds.mjs?v=162';
import {safeName,horseNameProblem} from './friends-logic.mjs?v=162';
export {horseNameProblem};
import {addTrust,STARTER_TRUST,TAME_AT,ageMonths,ageBand} from './riding.mjs?v=162';
export {ageMonths,ageBand};
const pick=(r,list)=>list[Math.floor(r()*list.length)];

export const TIERS={starter:{coins:1500,stars:400,label:'Starter breed'},common:{coins:1500,stars:400,label:'Common'},uncommon:{coins:4000,stars:1000,label:'Uncommon'},special:{coins:10000,stars:2500,label:'Special'},rare:{coins:25000,stars:6250,label:'Rare'},legendary:{coins:100000,stars:25000,label:'Legendary'},longears:{coins:1500,stars:400,label:'Rare long-ears'},wild:{coins:0,stars:0,label:'Lives free'}};

// Base coat colours. Keys match the sculpted horse's palette (horse-sculpt.js).
export const COATS={
  chestnut:{coat:'#b37854',belly:'#cc9a72',muzzle:'#dcb08c',mane:'#5e3f31',ink:'#3b2519',iris:'#6b4430',hoof:'#4f4a42'},
  sorrel:{coat:'#c0703f',belly:'#d79566',muzzle:'#e2b089',mane:'#e3b77c',ink:'#4a2614',iris:'#6b4430',hoof:'#5a4a3c'},
  bay:{coat:'#8a5230',belly:'#a86d47',muzzle:'#5a3a2a',mane:'#2a2020',ink:'#24160f',iris:'#5a3a26',hoof:'#3a332e'},
  black:{coat:'#3a3434',belly:'#4a4343',muzzle:'#2e2929',mane:'#1f1b1b',ink:'#121010',iris:'#5a4030',hoof:'#2e2a28'},
  grey:{coat:'#a9b8b5',belly:'#cfd9d2',muzzle:'#7f8a87',mane:'#66787a',ink:'#2f3b3a',iris:'#4b5a63',hoof:'#555f5a'},
  white:{coat:'#ece8de',belly:'#f6f3ea',muzzle:'#c9b9b0',mane:'#f4f1e6',ink:'#5b5650',iris:'#4b5a63',hoof:'#8a8279'},
  palomino:{coat:'#d8b56e',belly:'#efd697',muzzle:'#f0d9aa',mane:'#f7ecd2',ink:'#5a4320',iris:'#7a4f2a',hoof:'#7b6a4c'},
  buckskin:{coat:'#cfa66a',belly:'#e0c08c',muzzle:'#4a3a2e',mane:'#2a2220',ink:'#3e2c18',iris:'#5a3a26',hoof:'#3a332e'},
  dun:{coat:'#c2a47c',belly:'#d8c2a0',muzzle:'#6a5644',mane:'#4a3a2e',ink:'#3e2f22',iris:'#5a3a26',hoof:'#4a4038'},
  grulla:{coat:'#8f8678',belly:'#aaa292',muzzle:'#4a443c',mane:'#2e2a26',ink:'#24201b',iris:'#4b4036',hoof:'#3a3632'},
  roan:{coat:'#9a6c5c',belly:'#b8988a',muzzle:'#4e3a32',mane:'#2e2220',ink:'#2a1a16',iris:'#5a3a26',hoof:'#3a332e'},
  golden:{coat:'#e0b25a',belly:'#f0cf86',muzzle:'#c99a52',mane:'#b8863a',ink:'#5a3e14',iris:'#7a4f2a',hoof:'#6a5a3c',shine:true},
  silver:{coat:'#c9ced2',belly:'#e2e5e8',muzzle:'#9aa0a6',mane:'#8a9098',ink:'#3a4046',iris:'#4b5a63',hoof:'#6a6e72',shine:true},
  cream:{coat:'#e6d3a8',belly:'#f1e3c2',muzzle:'#e3c3ad',mane:'#f5ead2',ink:'#6a5530',iris:'#8a7a5a',hoof:'#9a8a70'},
  donkeygrey:{coat:'#968d82',belly:'#ddd7cc',muzzle:'#ebe6dc',mane:'#4a433c',ink:'#2e2924',iris:'#4a3a2e',hoof:'#4a443e'},
  donkeybrown:{coat:'#6f5747',belly:'#cbbba8',muzzle:'#e4d9c9',mane:'#2e241e',ink:'#241a14',iris:'#4a3a2e',hoof:'#3a332e'},
  chocolate:{coat:'#5c3b2c',belly:'#74503d',muzzle:'#4a2f24',mane:'#e8dcc0',ink:'#2a1a14',iris:'#5a3a26',hoof:'#3a332e'}
};

// Every breed lives in breeds.mjs (136 breeds, facts for the breed guide, real-world price → Trotties).
// Starter breeds list the colours each breed really comes in; `freeCoat` is the one solid colour a free starter
// gets. The rest show on the sign-up screen as locked, future store upgrades. Wild breeds are guide-only.
export const BREEDS=BREED_LIST;
const BY_ID=new Map(BREEDS.map(b=>[b.id,b]));
export const breedOf=id=>BY_ID.get(id)||BREEDS[0];
export const STARTERS=BREEDS.filter(b=>b.tier==='starter');

const NAMES=['Maple','Biscuit','Juniper','Pepper','Clover','Hazel','Ember','Willow','Sunny','Atlas','Nutmeg','Poppy','Rowan','Blue','Daisy','Comet','Fable','Honey','Indigo','Jasper','Koda','Luna','Moss','Nova','Olive','Pip','Quill','Rosie','Sage','Toffee','Umber','Velvet','Wren','Ziggy','Bramble','Cocoa','Dusty','Fern','Ginger','Hollis','Iris','Jolly','Kit','Lark','Mabel','Noodle','Otis','Pickle','Rue','Scout'];

// A coat for one horse: the breed's colour range, then markings. `seed` keeps it the same forever.
export function makeCoat(breedId,seed){const b=breedOf(breedId),r=rng('coat:'+seed),name=pick(r,b.coats),c={...COATS[name],white:'#f5ecd6',coatName:name};
  const has=m=>b.marks.includes(m);
  c.blaze=has('blaze')||has('feathers')?r()<.7:r()<.2;
  c.socks=has('feathers')?[1,1,1,1]:[0,1,2,3].map(()=>has('socks')&&r()<.4?1:0);
  if(has('dapple')&&(name==='grey'||name==='white'))c.dapple=true;
  if(has('spots')){c.spots=1;c.blanket=.35+r()*.5;}
  if(has('patches')&&r()<.85)c.patches=.15+r()*.35;
  c.pattern=Math.floor(r()*1e6);
  if(b.ears){c.ears=b.ears;c.blaze=false;c.socks=[0,0,0,0];}
  return c;}
export function coatLabel(c){return [c.coatName,c.dapple&&'dapple',c.spots&&'spotted',c.patches&&'patches',c.blaze&&'blaze'].filter(Boolean).join(' · ');}

// Age: 1 real day = 1 horse month (the stable page has always said so).
// ageMonths / ageBand live in riding.mjs (riding uses them too) and are re-exported above.
export const AGE_PRICE={foal:1.2,young:1.1,prime:1,senior:.5};
export const ageText=m=>`${Math.floor(m/12)}y ${m%12}m`;

export function newHorse({breed,name,seed,ageMonths:months=48,free=false,now=Date.now(),coat,xp=0,size}){const b=breedOf(breed);
  return fromPlain({id:'h-'+String(seed).replace(/[^a-z0-9]/gi,'').slice(-12)+'-'+Math.floor(now%1e6).toString(36),name:name||NAMES[Math.floor(rng('name:'+seed)()*NAMES.length)],breedId:b.id,breed:b.name,
    coat:coat||makeCoat(b.id,seed),size:size||b.size,bornAt:now-months*DAY,acquiredDay:dayNo(now),lastFed:dayNo(now),lastVet:null,free,
    xp,rest:100,restAt:now,trait:b.trait,bio:`${/^[aeiou]/i.test(b.name)?'An':'A'} ${b.name} who is still getting to know you.`,bond:40,energy:80,happiness:60,baseMonths:months,
    // Arrives in a halter: untamed, no saddle or bridle (riding.mjs). Care builds trust.
    tamed:false,trust:0,tack:{saddle:null,bridle:null}});}
// Plain objects only for storage (the color getter is re-added on load).
export function toPlain(h){const o={...h};delete o.color;return o;}
export function fromPlain(o){const h={...o};Object.defineProperty(h,'color',{get(){return (this.coat?.coatName||'bay').replace(/^./,x=>x.toUpperCase());},enumerable:false});return h;}

// Sign-up: the free starter gets one solid colour (no white markings). The breed's other colours, and
// markings, are shown locked: upgrades for the store later, not sold yet.
// Today's guest horse in a barn game: a pricey breed (specials twice as likely) you can meet and tap before you
// can afford one. The same guest all day for each game, a new one tomorrow.
export function guestHorse(game,day=dayNo()){const pool=BREEDS.filter(b=>['uncommon','special','rare','legendary'].includes(b.tier)).flatMap(b=>b.tier==='uncommon'?[b]:[b,b]),r=rng(`guest:${game}:${day}`);
  const b=pool[Math.floor(r()*pool.length)],seed=`guest:${game}:${day}`;
  return {id:'guest-'+game,breedId:b.id,breed:b.name,name:NAMES[Math.floor(rng('guestname:'+seed)()*NAMES.length)],coat:makeCoat(b.id,seed),size:b.size,coins:b.coins,fact:b.fact,origin:/^(Netherlands|Czech Republic|USA|UK|United|Philippines)/.test(b.origin)?'the '+b.origin:b.origin};}
export function solidCoat(name){return {...COATS[name],white:'#f5ecd6',coatName:name,blaze:false,socks:[0,0,0,0],pattern:0};}
export const starterCoat=breedId=>solidCoat(breedOf(breedId).freeCoat||breedOf(breedId).coats[0]);
export function lockedCoats(breedId){const b=breedOf(breedId);return [...b.coats.filter(c=>c!==b.freeCoat).map(c=>({id:c,label:c,coat:solidCoat(c)})),
  {id:'markings',label:'white markings',coat:{...solidCoat(b.freeCoat),blaze:true,socks:[1,1,1,1]}}];}

// --- Food & condition --------------------------------------------------------------------------------
export const FOOD={carrot:{name:'Carrot',icon:'🥕'},apple:{name:'Apple',icon:'🍎'},hay:{name:'Hay',icon:'🌾'},golden:{name:'Golden carrot',icon:'✨🥕'}};
export const BUNDLES=[{n:1,price:10},{n:10,price:90},{n:50,price:400},{n:100,price:750}];
export const FREE_BASKET=5,GOLDEN_ODDS=50,VET_COST=150,SICK_DAY=3;
// v135: the vet stings but never empties the bank: at most half your Trotties (free if you have none).
export const vetFee=(base,coins)=>Math.max(0,Math.min(base,Math.floor((Number(coins)||0)/2)));
// Helping with the checkup always halves whatever the vet would charge (so it's cheaper even when the cap applies).
export const vetHelpFee=coins=>Math.floor(vetFee(VET_COST,coins)/2);

// Days without a meal → how the horse feels. Never death: the worst is "unwell, needs the vet".
export function condition(h,now=Date.now()){if(h.retired)return {id:'fed',days:0,label:'Grazing in the pasture',icon:'🌾',xp:1};const last=Math.max(h.lastFed??h.acquiredDay,h.lastVet??-Infinity),days=dayNo(now)-last;
  if(days<=0)return {id:'fed',days,label:'Fed today',icon:'💚',xp:1};
  // v135 (Yoshi 2026-11-15: hungry horses CAN get sick, after a day or more): hungry day 1, run-down day 2, unwell day 3.
  if(days<2)return {id:'hungry',days,label:'Hungry',icon:'🥕',xp:1};
  if(days<3)return {id:'rundown',days,label:'Run-down',icon:'😟',xp:.5};
  return {id:'unwell',days,label:'Unwell · needs the vet',icon:'🩺',xp:0};}
export const totalFood=f=>(f.carrot||0)+(f.apple||0)+(f.hay||0);

// Take one meal from the pantry (carrots first, then apples, then hay), or a specific item.
export function takeFood(food,item){const order=item?[item]:['carrot','apple','hay'];for(const k of order)if((food[k]||0)>0)return {food:{...food,[k]:food[k]-1},item:k};return null;}

// --- Tiredness ---------------------------------------------------------------------------------------
// rest 100 = lively. Each activity uses some; it comes back at 12 an hour. Below 60 the XP from care tapers
// (never below 20%), and the horse shows it: lower head, yawns. No pop-ups.
export const REST_PER_HOUR=12;
export const restNow=(h,now=Date.now())=>Math.min(100,(h.rest??100)+Math.max(0,now-(h.restAt??now))/HOUR*REST_PER_HOUR);
export const xpFactor=rest=>rest>=60?1:Math.max(.2,rest/60);
export function mood(rest){return rest>=60?{id:'lively',label:'Lively'}:rest>=30?{id:'sleepy',label:'Getting sleepy'}:{id:'tired',label:'Tired · resting soon'};}
export const CARE={pet:{xp:4,cost:3},feed:{xp:10,cost:4},groom:{xp:12,cost:7},tidy:{xp:10,cost:6},golden:{xp:100,cost:0},game:{xp:15,cost:10}};
// Spend rest on an activity; returns the XP earned and the updated horse.
export function careXP(h,kind,now=Date.now()){const c=CARE[kind],rest=restNow(h,now),cond=condition(h,now);
  const xp=kind==='golden'?c.xp:Math.max(1,Math.round(c.xp*xpFactor(rest)*cond.xp));
  return {xp,horse:addTrust({...h,rest:Math.max(0,rest-c.cost),restAt:now,xp:(h.xp||0)+xp,bond:Math.min(100,(h.bond||0)+(xp>=8?2:1))},xp>=8?2:1,now)};}
export const level=xp=>Math.floor(Math.sqrt((xp||0)/40))+1;
export const levelFloor=l=>(l-1)*(l-1)*40;

// --- Horse market --------------------------------------------------------------------------------------
// One shelf for everyone: each day's arrivals come from that day's seed, so every player sees the same
// horses. Until the market lives on the server, "sold to another rider" is simulated with the same seed
// (each day a listing has a set chance to go); a horse you buy disappears for you at once.
const SELL={longears:.3,starter:.22,common:.22,uncommon:.18,special:.3,rare:.35,legendary:.4},STAY=14;
export function arrivals(d){const r=rng('market:'+d),out=[];
  const add=(tier,n)=>{for(let i=0;i<n;i++){const list=BREEDS.filter(b=>tier==='common'?b.tier==='common'||b.tier==='starter':b.tier===tier),b=pick(r,list);
    const roll=r(),months=roll<.3?3+Math.floor(r()*18):roll<.55?24+Math.floor(r()*24):roll<.9?48+Math.floor(r()*120):180+Math.floor(r()*80);
    out.push({id:`m${d}-${out.length}`,breedId:b.id,tier:b.tier==='starter'?'common':b.tier,arrived:d,months,name:NAMES[Math.floor(r()*NAMES.length)],seed:`m${d}-${out.length}`});}};
  add('common',3);add('uncommon',r()<.5?2:1);if(r()<3/7)add('special',1);
  // Rare about once a week, legendary about once every three weeks.
  if(r()<1/7)add('rare',1);if(r()<1/21)add('legendary',1);
  // A donkey or a mule wanders in about once every eight days (rolled last so older days keep their horses).
  if(r()<1/8)add('longears',1);return out;}
// Every horse is its own size: the breed sets the middle, each horse varies about ±14% (seeded, so everyone sees the
// same horse), and young ones are smaller. Only the horse scales; the rider stays one size on every horse.
export function listingSize(l){const b=breedOf(l.breedId),x=rng('size:'+l.seed)(),m=l.months??48;
  const young=m<12?.72:m<24?.86:m<36?.95:1;return Math.round(b.size*(.86+.28*x)*young*100)/100;}
export function soldBy(listing,d){for(let j=listing.arrived+1;j<=d;j++)if(rng(listing.id+':'+j)()<SELL[listing.tier])return j;return null;}
// Price for a breed (its real-world price on the Trotties curve, see breeds.mjs) or, for older callers, a tier.
// Age changes it (foals cost a little more, seniors half). 1 star ≈ 4 coins.
// #34: younger horses last longer, so within the bands the price slides too: 1.15 at 2 years, 1.1 at 4, 1.0 at
// 8 years 4 months, down to .75 at the end of prime (15). Foals 1.2, seniors half price.
export function ageFactor(months){const b=ageBand(months);if(b!=='young'&&b!=='prime')return AGE_PRICE[b];
  if(months<48)return 1.15-.05*(months-24)/24;if(months<=100)return 1.1-.1*(months-48)/52;return 1-.25*(months-100)/80;}
export function price(breedOrTier,months){const m=ageFactor(months);
  if(TIERS[breedOrTier])return {coins:Math.round(TIERS[breedOrTier].coins*m/50)*50,stars:Math.round(TIERS[breedOrTier].stars*m/25)*25};
  const coins=Math.round(breedOf(breedOrTier).coins*m/50)*50;return {coins,stars:Math.round(coins/4/25)*25};}
// v124 (note #45): every market horse shows how tamed it is. Fully tamed costs more (someone put the time in);
// wild (0%) costs less and goes to the Taming Corral. Legendary horses always arrive wild.
export const TAME_STEPS=[[0,.3],[25,.15],[50,.2],[75,.15],[100,.2]];
export function listingTame(l){if(l.tier==='legendary')return 0;const x=rng('tame:'+l.seed)();let acc=0;for(const [v,w] of TAME_STEPS){acc+=w;if(x<acc)return v;}return 100;}
export const tamePrice=t=>.6+.6*t/100;
export function marketStock(d=dayNo(),bought=[]){const shelf=[],recent=[];
  for(let k=0;k<STAY;k++){const a=d-k;for(const l of arrivals(a)){if(bought.includes(l.id))continue;const sold=soldBy(l,d),months=l.months+(d-a);
    const tame=listingTame(l),base=price(l.breedId,months),f=tamePrice(tame);
    const item={...l,months,daysLeft:STAY-k,coat:makeCoat(l.breedId,l.seed),size:listingSize({...l,months:l.months}),tame,price:{coins:Math.round(base.coins*f/50)*50,stars:Math.round(base.stars*f/25)*25},isNew:k===0};
    if(sold===null)shelf.push(item);else if(sold>=d-1)recent.push({...item,soldDay:sold});}}
  const order={legendary:-2,rare:-1,longears:-.5,special:0,uncommon:1,common:2};shelf.sort((a,b)=>order[a.tier]-order[b.tier]||a.daysLeft-b.daysLeft);
  return {shelf,recent:recent.slice(0,4)};}

// --- The ranch ---------------------------------------------------------------------------------------
export function freshRanch(){return {version:1,herd:[],food:{carrot:0,apple:0,hay:0,golden:0},basket:{day:-1,left:0},bought:[],careDay:{},createdAt:Date.now()};}
export function normalizeRanch(raw){const r=freshRanch();if(!raw||typeof raw!=='object'||raw.version!==1)return r;
  r.herd=(Array.isArray(raw.herd)?raw.herd:[]).filter(h=>h&&h.id&&h.coat).slice(0,MAX_HERD).map(fromPlain);
  for(const k of Object.keys(r.food))r.food[k]=Math.max(0,Math.floor(Number(raw.food?.[k])||0));
  r.basket=raw.basket&&typeof raw.basket==='object'?{day:Number(raw.basket.day)||-1,left:Math.max(0,Number(raw.basket.left)||0)}:r.basket;
  r.bought=Array.isArray(raw.bought)?raw.bought.filter(x=>typeof x==='string').slice(-500):[];
  r.careDay=raw.careDay&&typeof raw.careDay==='object'?raw.careDay:{};r.createdAt=raw.createdAt||r.createdAt;
  r.friendMeals=Array.isArray(raw.friendMeals)?raw.friendMeals.filter(Number.isFinite).slice(-80):[];
  r.barnLevel=Math.max(0,Math.min(BARNS.length-1,Math.floor(Number(raw.barnLevel)||0)));
  if(raw.pet&&typeof raw.pet==='object'&&PETS.some(p=>p.id===raw.pet.id))r.pet={id:raw.pet.id,name:String(raw.pet.name||'').slice(0,20)||PETS.find(p=>p.id===raw.pet.id).name,since:Number(raw.pet.since)||Date.now(),lastPat:Number(raw.pet.lastPat)||0};
  r.lastBreed=Number(raw.lastBreed)||0;r.shows=raw.shows&&typeof raw.shows==='object'?raw.shows:{};
  return fitStalls(r);}

// ---------- v124 stalls, pasture and bigger barns (note #45) ----------
// You start with a cosy 3-stall barn. Horses that don't fit wait in the pasture behind it (still need their meal);
// swap one in from the stable page. Bigger barns cost Trotties: a goal worth saving for. Only stalled horses come
// out in the 3D world.
export const BARNS=[{stalls:3,name:'Cosy barn',price:0,icon:'🏠'},{stalls:6,name:'Big barn',price:2500,icon:'🏡'},{stalls:10,name:'Grand stable',price:8000,icon:'🏘️'},{stalls:20,name:'Royal stables',price:20000,icon:'🏰'}];
export const barnOf=r=>BARNS[Math.max(0,Math.min(BARNS.length-1,r?.barnLevel||0))];
// v135 (Yoshi 2026-11-15): a foal born here stays in its mum's stall for its first FOAL_WITH_MUM days, then gets
// its own free stall (each home-born foal adds one stall on top of the barn's).
export const FOAL_WITH_MUM=2;
export const withMum=(h,now=Date.now())=>!!(h?.parents?.length&&!h.loaner&&now-(h.bornAt||0)<FOAL_WITH_MUM*DAY);
export const foalStalls=(r,now=Date.now())=>(r?.herd||[]).filter(h=>h.parents?.length&&!h.loaner&&!withMum(h,now)).length;
export const stallCap=(r,now=Date.now())=>barnOf(r).stalls+foalStalls(r,now);
export function fitStalls(r,now=Date.now()){const cap=stallCap(r,now);let n=0;
  const herd=r.herd.map(h=>{if(h.loaner||withMum(h,now))return h;const inStall=!h.pasture&&n<cap;if(inStall)n++;return inStall===!h.pasture?h:fromPlain({...toPlain(h),pasture:!inStall});});
  if(n<cap)for(let i=0;i<herd.length&&n<cap;i++)if(herd[i].pasture&&!herd[i].loaner&&!withMum(herd[i],now)){herd[i]=fromPlain({...toPlain(herd[i]),pasture:false});n++;}
  // A foal with its mum goes wherever she is (stall or pasture).
  for(let i=0;i<herd.length;i++)if(withMum(herd[i],now)){const mum=herd.find(x=>x.id===herd[i].parents[0]),pa=!!mum?.pasture;if(!!herd[i].pasture!==pa)herd[i]=fromPlain({...toPlain(herd[i]),pasture:pa});}
  return {...r,herd};}
export const stalled=(r,now=Date.now())=>(r?.herd||[]).filter(h=>!h.pasture&&!h.loaner&&!withMum(h,now));
export const pastured=(r,now=Date.now())=>(r?.herd||[]).filter(h=>h.pasture&&!h.loaner&&!withMum(h,now));
export function swapStall(r,inId,outId){const a=r.herd.find(h=>h.id===inId),b=r.herd.find(h=>h.id===outId);if(a&&withMum(a))return {ok:false,reason:`${a.name} stays with mum for now.`};if(b&&withMum(b))return {ok:false,reason:'Pick a grown horse to swap out.'};if(!a||!a.pasture)return {ok:false,reason:'That horse is already in a stall.'};
  if(stalled(r).length<stallCap(r)){return {ok:true,ranch:{...r,herd:r.herd.map(h=>h.id===inId?fromPlain({...toPlain(h),pasture:false}):h)}};}
  if(!b||b.pasture)return {ok:false,reason:'Pick a stalled horse to swap out.'};
  return {ok:true,ranch:{...r,herd:r.herd.map(h=>h.id===inId?fromPlain({...toPlain(h),pasture:false}):h.id===outId?fromPlain({...toPlain(h),pasture:true}):h)}};}
export function upgradeBarn(r,coins){const next=BARNS[(r.barnLevel||0)+1];if(!next)return {ok:false,reason:'You already have the biggest barn.'};if(coins<next.price)return {ok:false,reason:'Not enough Trotties',short:next.price-coins};
  return {ok:true,cost:next.price,barn:next,ranch:fitStalls({...r,barnLevel:(r.barnLevel||0)+1})};}

// ---------- v124 barn pets (note #48) ----------
// A barn dog or cat to pat once a day (silly badge "Barn Buddy"); it naps in your stall and greets friends who visit.
export const PETS=[{id:'dog',icon:'🐕',name:'Biscuit',kind:'Barn dog',price:600},{id:'cat',icon:'🐈',name:'Whiskers',kind:'Barn cat',price:600},{id:'goat',icon:'🐐',name:'Pip',kind:'Pygmy goat',price:900},{id:'hen',icon:'🐔',name:'Clucky',kind:'Barn hen',price:300}];
export function adoptPet(r,id,coins,name=''){const p=PETS.find(x=>x.id===id);if(!p)return {ok:false,reason:'Unknown pet'};if(coins<p.price)return {ok:false,reason:'Not enough Trotties',short:p.price-coins};
  return {ok:true,cost:p.price,ranch:{...r,pet:{id,name:String(name||p.name).slice(0,20),since:Date.now(),lastPat:0}}};}
export function patPet(r,now=Date.now()){if(!r.pet)return {ok:false};const first=dayNo(r.pet.lastPat||0)!==dayNo(now);return {ok:true,first,ranch:{...r,pet:{...r.pet,lastPat:now}}};}

// #11 friends (2026-11-14): the herd lives on this device, so friends feed from a small "visiting card"
// (hl_friends 'herd': up to 12 horses, public looks only, fed today or not). The chosen horse first, then by level.
export function herdCard(r,{first=null,now=Date.now()}={}){const d=dayNo(now);
  const list=(r?.herd||[]).filter(h=>!h.loaner).slice().sort((a,b)=>(b.id===first)-(a.id===first)||(b.xp||0)-(a.xp||0)).slice(0,12);
  const coat=c=>{if(!c||typeof c!=='object')return undefined;const o={};for(const [k,v] of Object.entries(c))if(['string','number','boolean'].includes(typeof v)||Array.isArray(v)&&v.length<=4)o[k]=v;
    return JSON.stringify(o).length<=400?o:undefined;};
  return {horses:list.map(h=>({id:String(h.id).slice(0,64),name:safeName(String(h.name||'Horse').slice(0,40)||'Horse',breedOf(h.breedId).name.slice(0,40)),breed:breedOf(h.breedId).name.slice(0,40),
      color:(h.coat?.coatName||'bay').replace(/^./,x=>x.toUpperCase()),coat:coat(h.coat),size:Number(h.size)||1,
      baseMonths:Math.max(0,Math.round((now-(h.bornAt||now))/DAY)),trait:String(h.trait||'').slice(0,24)||undefined,fed:(h.lastFed??-1)>=d,
      tame:h.tamed===false?Math.max(0,Math.min(99,Math.floor((h.trust||0)/TAME_AT*100))):100,tameOpen:h.tameOpen!==false})),
    herdSize:Math.min(100,(r?.herd||[]).length),points:Math.min(1e8,(r?.herd||[]).reduce((n,h)=>n+(h.xp||0),0))};}

// A friend's meal note (server day 'YYYY-MM-DD', UTC like dayNo) counts as that horse's meal for that day,
// once per note id, and only for today. Returns {ranch, fed:[names]}.
export function applyFriendMeals(r,notes,now=Date.now()){const d=dayNo(now),done=new Set(r.friendMeals||[]);let herd=r.herd,fed=[],ids=[...done];
  for(const n of notes||[]){if(!n||!n.meal||!Number.isFinite(n.id)||done.has(n.id))continue;const nd=dayNo(Date.parse(String(n.day)+'T00:00:00Z'));
    if(nd!==d)continue;done.add(n.id);ids.push(n.id);const h=herd.find(x=>x.id===n.horseId);if(!h||(h.lastFed??-1)>=d)continue;
    const out=fromPlain({...h,lastFed:d,happiness:Math.min(100,(h.happiness||0)+7),energy:Math.min(100,(h.energy||0)+15)});herd=herd.map(x=>x.id===h.id?out:x);fed.push(h.name);}
  if(ids.length===(r.friendMeals||[]).length)return {ranch:r,fed};
  return {ranch:{...r,herd,friendMeals:ids.slice(-80)},fed};}
export const freeHorse=r=>r.herd.find(h=>h.free)||null;

// The free horse's basket refills each day; other horses eat from the pantry.
export function basketFor(r,h,now=Date.now()){const d=dayNo(now);
  if(h.free){const left=r.basket.day===d?r.basket.left:FREE_BASKET;return {free:true,left};}
  return {free:false,left:(r.food.carrot||0)+(r.food.apple||0)+(r.food.hay||0)};}

// One carrot from the basket: 1 in 50 is golden (it can't be bought).
export function drawCarrot(r,h,random=Math.random,now=Date.now()){const b=basketFor(r,h,now);
  if((r.food.golden||0)>0&&random()<.5)return {item:'golden',fromGolden:true};
  if(b.left<=0)return null;return {item:random()<1/GOLDEN_ODDS?'golden':'carrot'};}

// Feeding: uses the basket/pantry, marks the meal, and once a day per horse pays 10 Trotties (care coins).
export function feed(r,id,{item='carrot',fromGolden=false,now=Date.now()}={}){const h=r.herd.find(x=>x.id===id);if(!h)return {ok:false,reason:'No such horse'};
  const cond=condition(h,now);if(cond.id==='unwell')return {ok:false,reason:`${h.name} is unwell. A vet visit comes first.`,vet:true};
  const d=dayNo(now);let food=r.food,basket=r.basket;
  if(fromGolden){if(!(food.golden>0))return {ok:false,reason:'No golden carrot'};food={...food,golden:food.golden-1};}
  else if(h.free){const left=basket.day===d?basket.left:FREE_BASKET;if(left<=0)return {ok:false,reason:'Today’s free basket is empty. More tomorrow, or use the pantry.',empty:true};basket={day:d,left:left-1};}
  else{const t=takeFood(food,item==='golden'?null:undefined);if(!t)return {ok:false,reason:'Out of food. Play a game or visit the feed store.',empty:true};food=t.food;}
  const firstMeal=(h.lastFed??-1)<d;const {xp,horse}=careXP({...h,lastFed:d},item==='golden'?'golden':'feed',now);
  const out=fromPlain({...horse,happiness:Math.min(100,(h.happiness||0)+(item==='golden'?20:5)),energy:Math.min(100,(h.energy||0)+(firstMeal?15:3))});
  return {ok:true,xp,firstMeal,golden:item==='golden',ranch:{...r,food,basket,herd:r.herd.map(x=>x.id===id?out:x)},horse:out};}

// "Feed everyone who's hungry" for big herds: one meal each from the pantry. Free horse uses its basket.
export function feedAll(r,now=Date.now()){let next=r,fed=0,short=0;const d=dayNo(now);
  for(const h of r.herd){if((h.lastFed??-1)>=d||condition(h,now).id==='unwell')continue;const res=feed(next,h.id,{now});if(res.ok){next=res.ranch;fed++;}else short++;}
  return {ranch:next,fed,short};}

// Care actions (pet / groom) once a day per horse earn care coins; XP every time (tapering with tiredness).
export function careOnce(r,id,kind,now=Date.now()){const key=`${dayNo(now)}:${id}:${kind}`;const first=!r.careDay[key];
  const careDay=Object.fromEntries(Object.entries(r.careDay).filter(([k])=>Number(k.split(':')[0])>=dayNo(now)-1));careDay[key]=true;return {first,ranch:{...r,careDay}};}
export function care(r,id,kind,now=Date.now()){const h=r.herd.find(x=>x.id===id);if(!h)return null;const {xp,horse}=careXP(h,kind,now);
  const {first,ranch}=careOnce(r,id,kind,now);const out=fromPlain({...horse,happiness:Math.min(100,(h.happiness||0)+(kind==='tidy'?6:kind==='pet'?4:3))});
  return {xp,first,horse:out,ranch:{...ranch,herd:ranch.herd.map(x=>x.id===id?out:x)}};}

export function vet(r,id,now=Date.now()){const h=r.herd.find(x=>x.id===id);if(!h)return null;const d=dayNo(now);
  const out=fromPlain({...h,lastVet:d,lastFed:d,rest:100,restAt:now,happiness:Math.max(h.happiness||0,70),energy:Math.max(h.energy||0,80)});return {ranch:{...r,herd:r.herd.map(x=>x.id===id?out:x)},horse:out};}

export function addFood(r,food){const f={...r.food};for(const [k,v] of Object.entries(food||{}))if(k in f)f[k]+=Math.max(0,Math.floor(v));return {...r,food:f};}
export function buyBundle(r,coins,n){const b=BUNDLES.find(x=>x.n===n);if(!b)return {ok:false,reason:'Unknown bundle'};if(coins<b.price)return {ok:false,reason:'Not enough Trotties',short:b.price-coins};
  return {ok:true,cost:b.price,ranch:addFood(r,{carrot:n})};}

export function adopt(r,listing,now=Date.now()){if(r.herd.length>=MAX_HERD)return {ok:false,reason:`Your ranch is full (${MAX_HERD} horses).`};
  const h=newHorse({breed:listing.breedId,name:listing.name,seed:listing.seed,ageMonths:listing.months,now,coat:listing.coat,xp:marketXp(listing),size:listing.size});
  const tame=listing.tame??listingTame(listing);if(tame>=100){h.tamed=true;h.trust=TAME_AT;h.tamedAt=now;}else h.trust=tame/100*TAME_AT;
  return {ok:true,horse:h,ranch:{...r,herd:[...r.herd,h],bought:[...r.bought,listing.id]}};}
// look: the per-horse look chosen on the starter page (horse-sculpt horseLook), stored so it never changes.
export function startRanch(breedId,coat,name,now=Date.now(),look=null){const r=freshRanch();const h=newHorse({breed:breedId,name,seed:'starter-'+now,ageMonths:60,free:true,now,coat});
  if(look)h.look={...look};h.bond=55;h.happiness=70;h.trust=STARTER_TRUST;r.herd=[h];r.basket={day:dayNo(now),left:FREE_BASKET};return r;}

// What needs doing, for the bell and the stable page.
export function alerts(r,now=Date.now()){const out=[];const by=id=>r.herd.filter(h=>condition(h,now).id===id);
  const unwell=by('unwell'),down=by('rundown'),hungry=by('hungry');
  if(unwell.length)out.push({id:'vet',icon:'🩺',text:unwell.length===1?`${unwell[0].name} is unwell and needs the vet.`:`${unwell.length} horses are unwell and need the vet.`});
  if(down.length)out.push({id:'rundown',icon:'😟',text:down.length===1?`${down[0].name} is run-down. A meal will help.`:`${down.length} horses are run-down. Meals will help.`});
  if(hungry.length)out.push({id:'hungry',icon:'🥕',text:hungry.length===1?`${hungry[0].name} is hungry.`:`${hungry.length} horses are hungry today.`});
  const need=r.herd.filter(h=>!h.free&&!h.retired&&(h.lastFed??-1)<dayNo(now)).length;
  if(need>totalFood(r.food))out.push({id:'food',icon:'🧺',text:`You need ${need-totalFood(r.food)} more meals for today. Play a game or visit the feed store.`});
  return out;}

// Device storage (never throws).
export const RANCH_KEY='trottville-ranch-v1';
export function loadRanch(){try{const raw=localStorage.getItem(RANCH_KEY);return raw?normalizeRanch(JSON.parse(raw)):null;}catch{return null;}}
export function saveRanch(r){try{localStorage.setItem(RANCH_KEY,JSON.stringify({...r,herd:r.herd.map(toPlain)}));}catch{}}

// --- v96 the stall clipboard (Yoshi: "xp, age, breed, anything else horse lovers want to know… and something special
// about the horse based off their breed"). Talents are breed-level facts (group default, a few breeds overridden);
// strengths are 1–5 per breed talent, not per horse. Market XP is the training a horse already has; it carries over
// when you keep the horse (adopt above).
const TALENTS={
  puller:['💪','Strong puller','Built to pull carts, wagons and logs. A gentle giant.',{speed:2,strength:5,stamina:4,show:2}],
  pony:['🧒','Kid-sized and brave','Hardy and sure-footed: a great first horse for young riders.',{speed:2,strength:3,stamina:4,show:3}],
  smooth:['🛋️','Smooth ride','Has an extra comfy gait, so long trail rides feel like gliding.',{speed:3,strength:2,stamina:4,show:4}],
  show:['🏆','Show-ring ready','Bred for show jumping and dressage.',{speed:4,strength:3,stamina:3,show:5}],
  allround:['🌄','All-rounder','Happy on trails, in the arena and helping at the ranch.',{speed:3,strength:3,stamina:3,show:3}],
  wild:['🌿','Wild spirit','Lives free in a wild herd.',{speed:3,strength:3,stamina:5,show:1}],
  racer:['🏇','Racehorse','Born to gallop: one of the fastest horses on the track.',{speed:5,strength:2,stamina:4,show:3}],
  trotter:['🏁','Harness racer','Races at a flying trot, pulling a light cart called a sulky.',{speed:5,strength:3,stamina:4,show:2}],
  sprinter:['⚡','Sprinter and ranch star','Fastest over a short sprint and clever with cattle.',{speed:5,strength:3,stamina:3,show:3}],
  endurance:['🏜️','Endurance champion','Can keep going for miles and miles across hot, dry land.',{speed:4,strength:2,stamina:5,show:3}],
  dressage:['🎭','Dressage dancer','Proud, graceful moves made for dressage and shows.',{speed:3,strength:3,stamina:3,show:5}],
  ranch:['🤠','Cattle and ranch work','Quick on its feet, calm and smart around cattle.',{speed:4,strength:3,stamina:4,show:2}],
  tolt:['✨','The tölt','Has a special fifth gait, the tölt: fast and super smooth.',{speed:3,strength:3,stamina:5,show:4}],
  carriage:['🎩','Carriage and show star','High-stepping and elegant in front of a carriage or in the ring.',{speed:3,strength:4,stamina:3,show:5}],
  strongpony:['🧺','Small but strong','Rides, carries packs and pulls little carts.',{speed:2,strength:4,stamina:4,show:3}],
  tiny:['🐾','Tiny companion','Too small to ride, perfect for cuddles and little carts.',{speed:1,strength:1,stamina:2,show:4}],
  winter:['❄️','Tough as winter','Lives outdoors through freezing winters.',{speed:3,strength:3,stamina:5,show:2}],
  jumper:['🌿','Bold jumper','Brave over hedges, walls and cross-country fences.',{speed:4,strength:3,stamina:4,show:4}],
  spots:['🎪','Spotted show-off','A crowd favourite in circuses and the show ring.',{speed:3,strength:3,stamina:3,show:5}]};
const TALENT_BY={draft:'puller',pony:'pony',gaited:'smooth',sport:'show',riding:'allround',wild:'wild',
  thoroughbred:'racer',standardbred:'trotter',orlov:'trotter',quarter:'sprinter',
  arabian:'endurance',akhal:'endurance',marwari:'endurance',turkoman:'endurance',barb:'endurance',shagya:'endurance',morab:'endurance',don:'endurance',budyonny:'endurance',dongola:'endurance',
  andalusian:'dressage',lusitano:'dressage',lipizzan:'dressage',kladruber:'dressage',friesian:'dressage',menorquin:'dressage',frederiksborg:'dressage',
  criollo:'ranch',stockhorse:'ranch',appaloosa:'ranch',paint:'ranch',azteca:'ranch',coloradoranger:'ranch',
  icelandic:'tolt',hackney:'carriage',saddlebred:'carriage',nationalshow:'carriage',gelderlander:'carriage',clevelandbay:'carriage',
  haflinger:'strongpony',fjord:'strongpony',falabella:'tiny',mini:'tiny',mongolian:'winter',yakutian:'winter',
  connemara:'jumper',irishsport:'jumper',irishdraught:'jumper',knabstrupper:'spots'};
export function breedTalent(b){const k=TALENT_BY[b.id]||TALENT_BY[b.group]||'allround',[icon,title,line,skills]=TALENTS[k];return {key:k,icon,title,line,skills};}
export function marketXp(l){if(l.months<24)return 0;const r=rng('xp:'+l.seed);return Math.min(2400,Math.round((l.months-24)*6*(.6+.8*r())));}
export function horseHeight(breedId,seed){const b=breedOf(breedId),h=4.6+11*b.size+(rng('hh:'+seed)()-.5)*.6,whole=Math.floor(h),inch=Math.min(3,Math.round((h-whole)*4));
  return {hands:`${whole}.${inch}`,cm:Math.round((whole+inch/4)*10.16)};}

// ---------- v124 badges (note #45) ----------
// Bronze / silver / gold for lifetime numbers kept on this device per player (ranch-ui addStat). Two kinds: horse
// skills and silly ones. `of` reads a stat (or computes one from the ranch); ranks are the three thresholds.
export const MILE=1609;
export const BADGE_DEFS=[
  {id:'rider',kind:'horse',icon:'🏇',name:'Expert Rider',unit:'miles ridden',of:s=>(s.rideMeters||0)/MILE,ranks:[1,10,100]},
  {id:'jumper',kind:'horse',icon:'🦘',name:'Expert Jumper',unit:'jumps',of:s=>s.jumps||0,ranks:[50,250,1000]},
  {id:'tamer',kind:'horse',icon:'🪢',name:'Expert Tamer',unit:'horses tamed',of:s=>s.tamedHorses||0,ranks:[1,5,20]},
  {id:'patience',kind:'horse',icon:'⏳',name:'Patient Hands',unit:'hours taming',of:s=>(s.tameSeconds||0)/3600,ranks:[1,5,20]},
  {id:'caretaker',kind:'horse',icon:'🥕',name:'Caretaker',unit:'meals given',of:s=>s.meals||0,ranks:[10,100,500]},
  {id:'groomer',kind:'horse',icon:'🪮',name:'Groomer',unit:'brushings',of:s=>s.grooms||0,ranks:[10,100,500]},
  {id:'whisperer',kind:'horse',icon:'💞',name:'Horse Whisperer',unit:'best trust (%)',of:s=>s.bestTrust||0,ranks:[50,80,100]},
  {id:'herd',kind:'horse',icon:'🐴',name:'Herd Keeper',unit:'horses in your herd (count)',of:s=>s.herdSize||0,ranks:[3,10,25]},
  {id:'breeder',kind:'horse',icon:'🍼',name:'Breeder',unit:'foals born',of:s=>s.foals||0,ranks:[1,5,20]},
  {id:'friend',kind:'horse',icon:'👫',name:'Good Neighbour',unit:'meals for friends’ horses',of:s=>s.friendMeals||0,ranks:[5,50,200]},
  {id:'helper',kind:'horse',icon:'🤝',name:'Helping Hand',unit:'friend taming sessions',of:s=>s.friendTames||0,ranks:[1,10,50]},
  {id:'shows',kind:'horse',icon:'🎀',name:'Show Star',unit:'seasonal shows entered',of:s=>s.shows||0,ranks:[1,5,20]},
  {id:'chatter',kind:'silly',icon:'🗯️',name:'Chatterbox',unit:'whinnies',of:s=>s.whinnies||0,ranks:[10,100,500]},
  {id:'whistle',kind:'silly',icon:'😗',name:'Whistle Blower',unit:'whistles',of:s=>s.whistles||0,ranks:[10,100,500]},
  {id:'owl',kind:'silly',icon:'🦉',name:'Night Owl',unit:'miles ridden after dark',of:s=>(s.nightMeters||0)/MILE,ranks:[.5,5,25]},
  {id:'golden',kind:'silly',icon:'✨',name:'Golden Touch',unit:'golden carrots fed',of:s=>s.golden||0,ranks:[1,10,50]},
  {id:'stars',kind:'silly',icon:'🔭',name:'Stargazer',unit:'nights stargazing',of:s=>s.stargaze||0,ranks:[1,10,50]},
  {id:'petpal',kind:'silly',icon:'🐾',name:'Barn Buddy',unit:'pats for your barn pet',of:s=>s.petPats||0,ranks:[10,100,500]},
  {id:'slowpoke',kind:'silly',icon:'🐢',name:'Easy Does It',unit:'carrots offered slowly',of:s=>s.gentle||0,ranks:[10,100,500]},
  {id:'oops',kind:'silly',icon:'😅',name:'Oopsie Daisy',unit:'times your horse said “too fast!”',of:s=>s.rushes||0,ranks:[5,25,100]}];
export const TIER_NAMES=['','Bronze','Silver','Gold'];
export function badgeList(stats={}){return BADGE_DEFS.map(b=>{const v=b.of(stats),tier=b.ranks.filter(r=>v>=r).length,next=b.ranks[tier]??null;
  return {id:b.id,kind:b.kind,icon:b.icon,name:b.name,unit:b.unit,value:v,tier,tierName:TIER_NAMES[tier],next,ranks:b.ranks};});}
export const badgeTier=(stats,id)=>badgeList(stats).find(b=>b.id===id)?.tier||0;
// For friends' screens: the best earned badges, gold first (at most n).
export const topBadges=(stats,n=6)=>badgeList(stats).filter(b=>b.tier).sort((a,b)=>b.tier-a.tier||BADGE_DEFS.findIndex(d=>d.id===a.id)-BADGE_DEFS.findIndex(d=>d.id===b.id)).slice(0,n).map(b=>({id:b.id,tier:b.tier}));

// ---------- v124 breeding (note #48) ----------
// Two of your tamed adult horses can have a foal, once a week, for a vet fee. The foal takes its mother's breed (or
// its father's, half the time when they differ), mixes both coats, and starts with a head start: a share of its
// parents' XP and trust (the Horseland idea of passing points down). It is born tame-ish in your own barn.
export const BREED_FEE=500,BREED_EVERY=7,FOAL_XP_SHARE=.1,FOAL_TRUST_SHARE=.15;
export function canBreed(h,now=Date.now()){if(!h||h.loaner)return 'Not your horse';if(h.retired)return 'Retired';if(h.tamed===false)return 'Not tamed yet';const m=ageMonths(h,now);if(m<36)return 'Too young (3 years)';if(m>=180)return 'Too old';return null;}
export function breedFoal(r,motherId,fatherId,{coins=0,trust={},now=Date.now(),name=''}={}){
  const a=r.herd.find(h=>h.id===motherId),b=r.herd.find(h=>h.id===fatherId);if(!a||!b||a===b)return {ok:false,reason:'Pick two different horses.'};
  for(const h of [a,b]){const why=canBreed(h,now);if(why)return {ok:false,reason:`${h.name}: ${why}.`};}
  const left=BREED_EVERY-(dayNo(now)-dayNo(r.lastBreed||0));if(r.lastBreed&&left>0)return {ok:false,reason:`The vet says wait ${left} more day${left>1?'s':''} before the next foal.`};
  if(r.herd.length>=MAX_HERD)return {ok:false,reason:'Your ranch is full.'};if(coins<BREED_FEE)return {ok:false,reason:'Not enough Trotties',short:BREED_FEE-coins};
  const seed='foal-'+a.id+'-'+b.id+'-'+now,x=rng(seed),breed=a.breedId===b.breedId||x()<.5?a.breedId:b.breedId;
  const ca=a.coat||{},cb=b.coat||{},coat={...(x()<.5?ca:cb)};for(const k of ['blaze','socks','dapple','spots','patches','mane'])if(k in ca||k in cb)coat[k]=x()<.5?ca[k]:cb[k];coat.pattern=Math.floor(x()*1e6);
  const xp=Math.round(((a.xp||0)+(b.xp||0))/2*FOAL_XP_SHARE),t0=Math.round(8+((trust[a.id]||0)+(trust[b.id]||0))/2*FOAL_TRUST_SHARE);
  const foal=newHorse({breed,name:name||undefined,seed,ageMonths:0,now,coat,xp});foal.bio=`Born in your barn to ${a.name} and ${b.name}.`;foal.parents=[a.id,b.id];foal.trust=TAME_AT/2;foal.bond=60;
  return {ok:true,cost:BREED_FEE,foal,startTrust:Math.min(40,t0),ranch:fitStalls({...r,herd:[...r.herd,foal],lastBreed:now})};}

// ---------- v124 seasonal shows (note #48) ----------
// A themed show runs for a few weeks each season. Enter one horse a day; the judges score looks (groomed today),
// training (level), trust and condition, plus a little luck. Rosettes 1st–6th against a field of 8; prizes in Trotties.
export const SHOWS=[
  {id:'spring',name:'Spring Blossom Show',icon:'🌸',from:[3,20],to:[4,20],theme:'flower crowns and pastel ribbons'},
  {id:'summer',name:'Summer Fair Show',icon:'🎡',from:[7,1],to:[7,31],theme:'bunting, lemonade and a brass band'},
  {id:'halloween',name:'Spooky Costume Show',icon:'🎃',from:[10,20],to:[11,2],theme:'pumpkins and costumes'},
  {id:'harvest',name:'Harvest Festival Show',icon:'🌾',from:[11,3],to:[11,30],theme:'hay bales, apples and autumn leaves'},
  {id:'winter',name:'Winter Wonderland Show',icon:'❄️',from:[12,10],to:[1,6],theme:'snow, bells and twinkly lights'}];
const md=d=>{const t=new Date(d);return (t.getUTCMonth()+1)*100+t.getUTCDate();};
export function currentShow(now=Date.now()){const v=md(now);return SHOWS.find(s=>{const a=s.from[0]*100+s.from[1],b=s.to[0]*100+s.to[1];return a<=b?v>=a&&v<=b:v>=a||v<=b;})||null;}
export const PRIZES=[300,200,120,80,50,30];
// v125 (Yoshi: "my horse won first place and I didn't do anything"): you ride the round yourself. `ride` is how well
// you jumped (0–1, from the show-ring game in ranch-ui) and counts most; grooming, training, trust and a fed horse
// add a little; luck is tiny. A clear round on a cared-for horse wins; a sloppy one doesn't.
export function showScore(h,{trust=0,groomed=false,ride=0,now=Date.now()}={}){const lv=level(h.xp||0),c=condition(h,now).id,x=rng('show:'+h.id+':'+dayNo(now))();
  return Math.round(Math.max(0,Math.min(1,Number(ride)||0))*60+Math.min(15,lv*1.5)+Math.min(10,trust*.1)+(groomed?8:0)+(c==='fed'?7:c==='hungry'?2:0)+x*5);}
export function enterShow(r,h,{trust=0,groomed=false,ride=0,now=Date.now()}={}){const show=currentShow(now);if(!show)return {ok:false,reason:'No show is on right now.'};
  const d=dayNo(now),key=show.id+':'+d;if(r.shows?.[key])return {ok:false,reason:'You’ve entered today’s show already. Come back tomorrow!'};
  if(h.tamed===false||h.retired)return {ok:false,reason:`${h.name} can’t enter yet.`};
  const mine=showScore(h,{trust,groomed,ride,now}),x=rng('field:'+key),field=Array.from({length:7},()=>Math.round(30+x()*55)),place=1+field.filter(f=>f>mine).length;
  const prize=PRIZES[place-1]||0;return {ok:true,show,place,score:mine,prize,ranch:{...r,shows:{...(r.shows||{}),[key]:{horse:h.id,place}}}};}

// ---------- v124 friends-only trades (note #48; server: hl_social trade_*) ----------
// Legendary horses, the free starter horse and loaners never trade. A snapshot carries public facts only; the friend
// who collects it gets a new horse built from it (new id, arrives in its own halter, keeps its taming %).
export const canTrade=h=>!!h&&!h.free&&!h.loaner&&!h.legend&&breedOf(h.breedId).tier!=='legendary';
export function tradeSnapshot(h,now=Date.now()){const b=breedOf(h.breedId);
  return {id:String(h.id).slice(0,64),name:String(h.name||'Horse').slice(0,40)||'Horse',breedId:b.id,breed:b.name,tier:b.tier,coat:h.coat,size:Number(h.size)||b.size,
    months:Math.max(0,Math.round((now-(h.bornAt||now))/DAY)),xp:Math.max(0,Math.round(h.xp||0)),
    tame:h.tamed===false?Math.max(0,Math.min(99,Math.floor((h.trust||0)/TAME_AT*100))):100,trait:String(h.trait||'').slice(0,24)||undefined};}
export function horseFromTrade(snap,tradeId,from,now=Date.now()){const b=breedOf(snap?.breedId);
  const h=newHorse({breed:b.id,name:String(snap?.name||'').slice(0,40)||undefined,seed:'trade-'+tradeId,ageMonths:Math.max(0,Math.min(400,Number(snap?.months)||48)),now,
    coat:snap?.coat&&typeof snap.coat==='object'?snap.coat:undefined,xp:Math.max(0,Number(snap?.xp)||0),size:Number(snap?.size)||undefined});
  const t=Math.max(0,Math.min(100,Number(snap?.tame)||0));h.id='tr-'+tradeId+'-'+String(snap?.id||'h').replace(/[^a-z0-9-]/gi,'').slice(0,24);
  h.trust=t>=100?TAME_AT:t/100*TAME_AT;h.tamed=t>=100;if(snap?.trait)h.trait=String(snap.trait).slice(0,24);h.bio=`Traded to you by your friend ${String(from||'a friend').slice(0,16)}.`;return h;}
export function receiveTrade(r,snap,tradeId,from,now=Date.now()){if(r.herd.length>=MAX_HERD)return {ok:false,reason:`Your ranch is full (${MAX_HERD} horses).`};
  const h=horseFromTrade(snap,tradeId,from,now);if(r.herd.some(x=>x.id===h.id))return {ok:true,ranch:r,horse:r.herd.find(x=>x.id===h.id),again:true};
  return {ok:true,horse:h,ranch:fitStalls({...r,herd:[...r.herd,h]})};}
export const giveTrade=(r,horseId)=>fitStalls({...r,herd:r.herd.filter(h=>h.id!==horseId)});

// ---------- v124 account saves: merge on sign-in (note #44, Yoshi chose A) ----------
// The guest herd on this device and the herd saved to the account join together: every horse is kept once (by id);
// where both have the same horse, the one with more XP wins. Food and barn take the larger amount.
export function mergeRanches(a,b){const A=normalizeRanch(a),B=normalizeRanch(b);if(!A.herd.length)return B;if(!B.herd.length)return A;
  const byId=new Map();for(const h of [...B.herd,...A.herd]){const o=byId.get(h.id);if(!o||(h.xp||0)>(o.xp||0))byId.set(h.id,h);}
  const food={};for(const k of Object.keys(A.food))food[k]=Math.max(A.food[k]||0,B.food[k]||0);
  return fitStalls({...B,herd:[...byId.values()].slice(0,MAX_HERD),food,barnLevel:Math.max(A.barnLevel,B.barnLevel),pet:B.pet||A.pet,
    bought:[...new Set([...B.bought,...A.bought])].slice(-500),createdAt:Math.min(A.createdAt||Date.now(),B.createdAt||Date.now())});}
export const plainRanch=r=>({...r,herd:r.herd.map(toPlain)});

// v154 (2026-11-17, Yoshi: "five stats … progress bar, low to start, something to build up to"). Shown on the first-horse
// screen and on each horse card. They come from real progress: each level the horse gains adds +4 to Speed, Stamina,
// Agility and Jumping (breed sets the starting point), and Bond follows taming, then trust. Display only for now.
export const STAT_NAMES=[['speed','Speed'],['stamina','Stamina'],['agility','Agility'],['jumping','Jumping'],['bond','Bond']];
const STAT_BASE={quarter:{speed:24,stamina:16,agility:18,jumping:12},arabian:{speed:20,stamina:24,agility:16,jumping:12},welsh:{speed:12,stamina:16,agility:22,jumping:20}};
const GROUP_BASE={riding:{speed:20,stamina:18,agility:16,jumping:14},sport:{speed:20,stamina:18,agility:18,jumping:20},gaited:{speed:18,stamina:20,agility:16,jumping:10},
  pony:{speed:12,stamina:16,agility:20,jumping:18},draft:{speed:10,stamina:24,agility:10,jumping:8},longears:{speed:8,stamina:24,agility:14,jumping:6},wild:{speed:18,stamina:22,agility:18,jumping:12}};
// h: the horse ({breedId, xp}); bond: 0–100 (taming % while untamed, trust % once tamed); tamed: whether that bond is trust.
export function horseStats(h,{bond=0,tamed=false}={}){const b=breedOf(h?.breedId),base=STAT_BASE[b.id]||GROUP_BASE[b.group]||GROUP_BASE.riding;
  const gained=Math.max(0,Math.floor(Math.sqrt((h?.xp||0)/40))),grow=gained*4,cap=v=>Math.max(1,Math.min(100,Math.round(v)));
  const out={};for(const k of ['speed','stamina','agility','jumping'])out[k]=cap(base[k]+grow);
  out.jumping=cap(out.jumping+Math.max(0,Number(h?.train?.jumping)||0));   // v162: Jumping training (training.mjs) adds on top
  out.bond=cap(tamed?35+bond*.65:bond*.35);return out;}
