// Daily streak, taming, tack and stamina (pure; tested in tests/riding-check.mjs). Agreed with Yoshi 2026-11-08 (note #16).
// - Streak: a small gift each day you visit, a big one on day 7 in a row. Miss a day and it starts again at day 1.
// - New horses arrive untamed in a halter: care for them (pet, brush, feed) to build trust before you can ride.
// - Every tamed horse can wear the Free Saddle and Free Bridle: you can ride everywhere, just slower and clumsier.
//   ONE upgrade per horse (pick a colour; every colour is the same): the saddle gives full speed, the bridle full control.
//   No super tier, so nobody is overpowered: races are won by riding well and managing stamina.
// - Age (Yoshi 2026-11-08: stats + retirement): foals can't be ridden until 2, young horses tire a little sooner,
//   seniors are a touch slower but get their breath back well. At 20 a horse can retire to the pasture: still yours
//   to visit and care for, grazing so no meals needed, but retired horses don't race. Never death.
// - Stamina: galloping drains it; push to empty and the horse overheats and can only trot until it has recovered.
//   Easing off brings it back. A fed, happy, well-bonded horse lasts longer.
const DAY=86400000;
export const dayNo=(ms=Date.now())=>Math.floor(ms/DAY);

// ---------- Daily streak ----------
export const STREAK_GIFTS=[25,30,40,50,60,75,500];
export const STREAK_GOLDEN_DAY=7;
// state {last: day number claimed, count: days in a row, best}. Returns what today's visit gives (or already gave).
export function streakToday(state,now=Date.now()){const d=dayNo(now),s=state||{last:null,count:0,best:0};
  if(s.last===d)return {claimable:false,day:((s.count-1)%7)+1,count:s.count};
  const count=s.last===d-1?s.count+1:1,day=((count-1)%7)+1;
  return {claimable:true,day,count,coins:STREAK_GIFTS[day-1],golden:day===STREAK_GOLDEN_DAY,broke:s.count>0&&s.last!==d-1};}
export function claimStreak(state,now=Date.now()){const t=streakToday(state,now);if(!t.claimable)return {ok:false,...t,state};
  const best=Math.max(state?.best||0,t.count);return {ok:true,...t,state:{last:dayNo(now),count:t.count,best}};}
export function normalizeStreak(raw){if(!raw||typeof raw!=='object')return {last:null,count:0,best:0};
  const n=v=>Math.max(0,Math.floor(Number(v)||0));return {last:Number.isFinite(raw.last)?Math.floor(raw.last):null,count:n(raw.count),best:n(raw.best)};}

// ---------- Age ----------
// 1 real day = 1 horse month (the stable page has always said so). Horses without a birthday (cloud/sample) count as prime.
export const ageMonths=(h,now=Date.now())=>h?.bornAt==null?60:Math.max(0,Math.floor((now-h.bornAt)/DAY));
export function ageBand(m){return m<24?'foal':m<48?'young':m<180?'prime':'senior';}
export const RIDE_AT=24,RETIRE_AT=240;
export const AGE_RIDE={foal:{speed:1,drain:1,recover:1},young:{speed:1,drain:1.12,recover:1.1},prime:{speed:1,drain:1,recover:1},senior:{speed:.94,drain:1.25,recover:1.15}};
export const ageRide=(h,now=Date.now())=>AGE_RIDE[ageBand(ageMonths(h,now))];
export const canRetire=(h,now=Date.now())=>!!h&&!h.retired&&h.bornAt!=null&&ageMonths(h,now)>=RETIRE_AT;
export const retire=(h,now=Date.now())=>canRetire(h,now)?{...h,retired:true,retiredAt:now}:h;
// Competing (Yoshi #34, 2026-11-12): from 15 (senior) a horse's stamina is too weak for races and shows. They can still be ridden.
export const COMPETE_MAX=180;
export const tooOldToCompete=(h,now=Date.now())=>!!h&&!h.retired&&ageMonths(h,now)>=COMPETE_MAX;
export const competeYearsLeft=(h,now=Date.now())=>Math.max(0,Math.ceil((COMPETE_MAX-Math.max(RIDE_AT,ageMonths(h,now)))/12));
// Racing: not retired, old enough to ride and not yet a senior.
export const canRaceHorse=(h,now=Date.now())=>!!h&&!h.retired&&ageMonths(h,now)>=RIDE_AT&&ageMonths(h,now)<COMPETE_MAX;

// ---------- Taming ----------
// Trust grows with care, at most TRUST_PER_DAY a day, so a new horse takes about three days; the starter arrives
// already part of the way (one good session tames it, then the saddle lesson).
export const TAME_AT=20,TRUST_PER_DAY=8,STARTER_TRUST=12;
// Horses from before taming existed (no `tamed` field) and cloud/sample horses count as tamed with free tack on.
export const isTamed=h=>h?.tamed!==false;
export function addTrust(h,amount,now=Date.now()){if(isTamed(h))return h;const d=dayNo(now),today=h.trustDay===d?(h.trustToday||0):0;
  const gain=Math.max(0,Math.min(amount,TRUST_PER_DAY-today));if(!gain)return h;
  const trust=Math.min(TAME_AT,(h.trust||0)+gain),tamed=trust>=TAME_AT;
  return {...h,trust,trustDay:d,trustToday:today+gain,...(tamed?{tamed:true,tamedAt:now}:{})};}
// Riding Trust (0–100, the number the 3D world shows): kept on this device per player, beside the adventure save.
// world.js reads and writes the same key; the stall adds to it too (a spotless stall, 2026-11-12).
// One trust curve (notes #44/#47, Yoshi 2026-11-15): a new horse starts LOW; about 7 days of feeding, cleaning and
// riding brings it to ~80; the last 20 creeps up over weeks. The FREE starter horse tops out at 99: only a horse
// bought at the market can reach 100, and catching a legendary needs a 100-trust horse.
// Gains below 80 count up to TRUST_FAST_DAY a day; above 80 they shrink to SLOW_RATE and stop at TRUST_SLOW_DAY a day.
// Losses (rushing, refusals, map jumps) always apply. `source` makes a gain once a day per horse (feed, groom…).
export const RIDE_TRUST_BASE={willow:68,atlas:81,sunny:54},RAKE_TRUST=3;
export const TRUST_START=8,TRUST_FAST_TO=80,TRUST_FAST_DAY=11,TRUST_SLOW_DAY=.6,SLOW_RATE=.15,FREE_TRUST_CAP=99,LEGEND_TRUST=100;
export const TRUST_GAINS={feed:3,groom:2,pet:1,tidy:RAKE_TRUST,vet:5,whistle:1,lantern:1,streak:1,trip:2,ride:1,lead:1,clean:1,gentle:1};
export const trustCap=h=>h?.free?FREE_TRUST_CAP:100;
export const rideTrustKey=who=>'horselandia-adventure-v1:'+who+':trust';
const readJSON=(store,k)=>{try{return JSON.parse(store.getItem(k))||{};}catch{return {};}};
const writeJSON=(store,k,v)=>{try{store.setItem(k,JSON.stringify(v));}catch{}};
export const trustBase=id=>RIDE_TRUST_BASE[id]??TRUST_START;
export function trustAt(key,id,store=globalThis.localStorage){const t=readJSON(store,key);return Math.round(t[id]??trustBase(id));}
// Pure step: cur value, raw change, today's record {fast,slow} → {value,day}.
export function trustStep(cur,raw,{cap=100,day={}}={}){let v=cur,fast=day.fast||0,slow=day.slow||0;
  // v133 (Yoshi 2026-11-15): trust never goes down anywhere in the game. Negative amounts change nothing.
  if(!(raw>0))return {value:v,day:{...day,fast,slow}};
  let left=raw;
  if(v<TRUST_FAST_TO&&left>0){const g=Math.min(left,TRUST_FAST_TO-v,Math.max(0,TRUST_FAST_DAY-fast));v+=g;fast+=g;left-=g;if(v<TRUST_FAST_TO)left=0;}
  if(v>=TRUST_FAST_TO&&left>0){const g=Math.min(left*SLOW_RATE,Math.max(0,TRUST_SLOW_DAY-slow));v+=g;slow+=g;}
  return {value:Math.max(cur,Math.min(cap,Math.round(v*100)/100)),day:{...day,fast,slow}};}
// Streak: a care day right after the last one adds a bonus (+1 a day in a row, at most +3); a missed day just resets it.
export function addTrustAt(key,id,n,{store=globalThis.localStorage,cap=100,source=null,now=Date.now()}={}){
  const t=readJSON(store,key),days=readJSON(store,key+'day'),d=dayNo(now);let rec=days[id];if(!rec||rec.d!==d)rec={d,fast:0,slow:0,src:{},streak:rec?.d===d-1?(rec.streak||0):0,last:rec?.d??null,careDay:rec?.careDay??null};
  if(source&&rec.src[source]){return Math.round(t[id]??trustBase(id));}
  let raw=n;if(source&&n>0&&rec.careDay!==d){rec.streak=rec.careDay===d-1?Math.min(3,(rec.streak||0)+1):0;rec.careDay=d;raw+=rec.streak*TRUST_GAINS.streak;}
  const cur=t[id]??trustBase(id),res=trustStep(cur,raw,{cap,day:rec});rec={...res.day};if(source)rec.src={...rec.src,[source]:1};
  t[id]=res.value;days[id]=rec;writeJSON(store,key,t);writeJSON(store,key+'day',days);
  if(Math.round(res.value)!==Math.round(cur))try{globalThis.dispatchEvent?.(new CustomEvent('trust:change',{detail:{id,value:Math.round(res.value),was:Math.round(cur)}}));}catch{}
  return Math.round(res.value);}
export function rideTrustOf(who,id,store=globalThis.localStorage){return trustAt(rideTrustKey(who),id,store);}
export function addRideTrust(who,id,n,store=globalThis.localStorage,opts={}){return addTrustAt(rideTrustKey(who),id,n,{store,...opts});}
// What trust does: a little more speed, fewer refusals at fences, and a horse that lets you bring food faster.
export const trustSpeed=t=>.94+.08*Math.max(0,Math.min(100,t))/100;
export const refusalChance=t=>Math.max(.02,Math.min(.35,.35-.0035*Math.max(0,t)));
export const feedSpeedLimit=t=>1000+12*Math.max(0,Math.min(100,t));
export const trustWord=t=>t>=100?'Complete trust':t>=95?'Devoted':t>=80?'Trusts you deeply':t>=50?'Trusts you':t>=25?'Getting to know you':'Wary';
// The player sees this as "Taming" (Yoshi 2026-11-08): the 3D world's riding number keeps the name Trust.
export const tamePct=h=>isTamed(h)?100:Math.max(0,Math.min(99,Math.floor((h?.trust||0)/TAME_AT*100)));
export const trustText=h=>isTamed(h)?'Tamed':`Taming ${tamePct(h)}%`;
// v124 Taming Corral (note #45): wild horses from the market are tamed by playing the corral game, about 10% per
// 10 minutes of calm work. It is separate from daily care, so it ignores TRUST_PER_DAY.
export const CORRAL_PCT_PER_MIN=1;
export function tameBy(h,pct,now=Date.now()){if(!h||isTamed(h)||!(pct>0))return h;const trust=Math.min(TAME_AT,(h.trust||0)+pct/100*TAME_AT),tamed=trust>=TAME_AT-1e-9;
  return {...h,trust:tamed?TAME_AT:Math.round(trust*1000)/1000,...(tamed?{tamed:true,tamedAt:now}:{})};}

// ---------- Tack ----------
export const TACK={
  saddle:{name:'Saddle',free:'Basic saddle',price:800,gives:'full speed',icon:'🏇',px:'saddle'},
  bridle:{name:'Bridle',free:'Basic bridle',price:400,gives:'full control',icon:'🪢',px:'bridle'}};
// Horseshoes: only the free starter horse gets a Complimentary set (Yoshi 2026-11-09, note #23); it never wears out.
// Otis also sells three tiers for ANY horse (note #20). Shoes are optional for other horses. They give grip: rain,
// snow and storms slow you less, and galloping tires the horse a little less. Paid shoes wear out after their days;
// buying the same or a better tier again while they're on adds the days. When they wear out the free horse falls
// back to its Complimentary set. tack.shoes = null | 'free' | {tier, until}.
export const SHOES={name:'Horseshoes',free:'Basic horseshoes',icon:'🧲',px:'shoes-studded'};
export const SHOE_TIERS=[
  {id:'steel',name:'Steel shoes',price:300,days:30,grip:.4,drain:.97,blurb:'Lasts a month'},
  {id:'studded',name:'Studded shoes',price:900,days:120,grip:.65,drain:.94,blurb:'Lasts 4 months'},
  {id:'champion',name:'Champion shoes',price:2500,days:365,grip:.9,drain:.9,blurb:'Lasts a whole year'}];
const FREE_SHOES={id:'free',name:'Basic horseshoes',grip:.25,drain:1};
const LOAN_SHOES={id:'loan',name:'Loaned horseshoes',grip:.15,drain:1};
const NO_SHOES={id:'none',name:'No shoes',grip:0,drain:1};
// What the horse is wearing right now: {id, name, grip 0–1, drain multiplier, until, daysLeft}.
export function shoesOf(h,now=Date.now()){const s=tackOf(h).shoes;
  if(s&&typeof s==='object'){const tier=SHOE_TIERS.find(t=>t.id===s.tier);if(tier&&s.until>now)return {...tier,until:s.until,daysLeft:Math.ceil((s.until-now)/864e5)};}
  if(s==='loan')return LOAN_SHOES;if(s==='free'||(s&&typeof s==='object'&&h?.free))return FREE_SHOES;return NO_SHOES;}
// Weather slows you by its speed multiplier; grip takes back part of that.
export const gripSpeed=(weatherSpeed,grip)=>1-(1-weatherSpeed)*(1-Math.max(0,Math.min(1,grip)));
// Buying shoes: a new tier replaces the old one; the same tier (or a better one) while worn adds its days on top.
export function buyShoes(h,tierId,coins,now=Date.now()){const tier=SHOE_TIERS.find(t=>t.id===tierId);if(!tier)return {ok:false,reason:'Unknown shoes'};
  if(coins<tier.price)return {ok:false,reason:'Not enough Trotties',short:tier.price-coins};
  const cur=shoesOf(h,now),rank=id=>SHOE_TIERS.findIndex(t=>t.id===id),keep=cur.until&&rank(tierId)>=rank(cur.id);
  const until=(keep?cur.until:now)+tier.days*864e5;
  return {ok:true,cost:tier.price,horse:{...h,tack:{...tackOf(h),shoes:{tier:tier.id,until}}}};}
// Pieces a horse must have on before you can ride out, and which of them come Complimentary (0 Trotties).
export const tackPieces=h=>h?.free?['saddle','bridle','shoes']:['saddle','bridle'];
export const pieceName=p=>p==='shoes'?SHOES.free:TACK[p].free;
export const TACK_COLORS=[['black','Black','#2b2522'],['red','Cherry red','#b8322f'],['blue','Royal blue','#2f5fae'],['green','Forest green','#2f7a4a'],
  ['purple','Purple','#6d4aa8'],['pink','Pink','#e07aa6'],['gold','Gold','#d6a33a'],['white','Snow white','#efeae0']];
export const FREE_TACK_COLOR='#9a7a55';// plain tan leather
// tack {saddle, bridle, shoes}: null = not got yet, 'free' (Complimentary), or for saddle/bridle a colour id from
// TACK_COLORS (the one upgrade). You can collect the Complimentary set before the horse is tamed.
export function tackOf(h){const t=h?.tack;if(!t)return h&&h.tamed===undefined?{saddle:'free',bridle:'free',shoes:'free'}:{saddle:null,bridle:null,shoes:null};
  return {saddle:t.saddle??null,bridle:t.bridle??null,shoes:t.shoes??null};}
// What's still missing before riding out (empty = ready).
export const missingTack=(h,now=Date.now())=>{const t=tackOf(h);return tackPieces(h).filter(p=>p==='shoes'?shoesOf(h,now).id==='none':!t[p]);};
export const upgraded=v=>!!v&&v!=='free'&&v!=='loan';
export const tackColor=v=>v==='loan'?'#7d776d':v==='free'||!v?FREE_TACK_COLOR:(TACK_COLORS.find(c=>c[0]===v)?.[2]||FREE_TACK_COLOR);
export const tackName=(piece,v)=>!v?'None':v==='loan'?'Loaned '+TACK[piece].name.toLowerCase():v==='free'?TACK[piece].free:`${TACK_COLORS.find(c=>c[0]===v)?.[1]||''} ${TACK[piece].name.toLowerCase()}`;
// Why you can't ride this horse yet (or null): a foal (under 2), untamed, or no saddle/bridle on.
export function rideBlock(h,now=Date.now()){if(ageMonths(h,now)<RIDE_AT)return 'foal';if(missingTack(h).length)return 'tack';if(!isTamed(h))return 'untamed';return null;}
// Getting one Complimentary piece in the store (0 Trotties). → {ok, horse} or {ok:false, reason}
export function getComplimentary(h,piece){if(!tackPieces(h).includes(piece))return {ok:false,reason:piece==='shoes'?'Complimentary horseshoes come with your free horse only.':'Unknown item'};
  const t=tackOf(h);if(t[piece])return {ok:false,reason:'Already got it.'};return {ok:true,horse:{...h,tack:{...t,[piece]:'free'}}};}
// Starter Kit (note #43, 2026-11-14): Otis SELLS the basic saddle, bridle and horseshoes together, so a new player
// practises buying. It replaces the old Complimentary set; tack already collected that way stays (value 'free').
export const STARTER_KIT={name:'Starter Kit',price:150,icon:'🎒',blurb:'Everything you need to ride out.'};
// What the kit would add to this horse (pieces that are missing or only loaned).
export function kitNeeds(h){const t=tackOf(h);const out=['saddle','bridle'].filter(p=>!t[p]||t[p]==='loan');
  if(t.shoes==='loan'||shoesOf(h).id==='none')out.push('shoes');return out;}
export function buyStarterKit(h,coins){const need=kitNeeds(h);if(!need.length)return {ok:false,reason:`${h?.name||'This horse'} already has its tack.`};
  if(coins<STARTER_KIT.price)return {ok:false,reason:'Not enough Trotties',short:STARTER_KIT.price-coins};
  const t={...tackOf(h)};for(const p of need)t[p]='free';return {ok:true,cost:STARTER_KIT.price,horse:{...h,tack:t}};}
// Safety net (note #43 C): short on Trotties and no tack? Otis lends his old set: you can ride, just slower (LOAN_SPEED).
export function borrowTack(h){const t={...tackOf(h)},miss=missingTack(h);if(!miss.length)return {ok:false,reason:'Already tacked up.'};
  for(const p of miss)t[p]='loan';return {ok:true,horse:{...h,tack:t}};}
// Odd jobs for Otis when you can't afford the kit: a few small paid chores a day.
export const ODD_JOB={pay:20,perDay:4};
// All the missing basic pieces at once (old saves / tests).
export function putOnFreeTack(h){let out=h;for(const p of missingTack(h))out=getComplimentary(out,p).horse||out;return out;}
// Buying the upgrade for one horse (or recolouring an upgrade you already own, free).
export function buyTack(h,piece,color,coins){if(!TACK[piece]||!TACK_COLORS.some(c=>c[0]===color))return {ok:false,reason:'Unknown item'};
  if(!isTamed(h))return {ok:false,reason:`${h.name} isn’t tamed yet.`};
  const t=tackOf(h),cost=upgraded(t[piece])?0:TACK[piece].price;
  if(coins<cost)return {ok:false,reason:'Not enough Trotties',short:cost-coins};
  return {ok:true,cost,horse:{...h,tack:{...t,[piece]:color}}};}

// What tack does while riding: the Free Saddle tops out lower, the Free Bridle turns slower.
export function rideStats(h,now=Date.now()){const t=tackOf(h);return {speed:(upgraded(t.saddle)?1:t.saddle==='loan'?LOAN_SPEED:.86)*ageRide(h,now).speed,turn:upgraded(t.bridle)?9:t.bridle==='loan'?3:3.5};}
export const LOAN_SPEED=.75;

// ---------- Stamina ----------
// care: how the horse is looked after (condition id from ranch.condition, bond 0–100, happiness 0–100).
export function staminaCare({condition='fed',bond=50,happiness=60,age=AGE_RIDE.prime}={}){
  const drain={fed:1,hungry:1.15,rundown:1.5,unwell:2}[condition]??1,recover={fed:1,hungry:.9,rundown:.6,unwell:.4}[condition]??1;
  const bonus=(bond>=70?.9:1)*(happiness>=70?.95:1);return {drain:drain*bonus*age.drain,recover:recover/bonus*age.recover};}
export const GALLOP=7,OVERHEAT_UNTIL=40,TIRED_SPEED=3.4;
export const freshStamina=()=>({value:100,overheated:false});
// One frame: speed is the horse's ground speed (world units/s, gallop above 7, full speed ~9.4).
export function staminaStep(s,speed,dt,care=staminaCare()){let value=s.value,overheated=s.overheated;
  if(speed>GALLOP)value-=(speed-6.5)*2.2*care.drain*dt;
  else value+=(speed<3?12:speed<=5.6?7:2)*care.recover*dt;
  value=Math.max(0,Math.min(100,value));
  if(value<=0)overheated=true;else if(overheated&&value>=OVERHEAT_UNTIL)overheated=false;
  return {value,overheated};}
// The speed the rider may ask for: tack sets the top, overheating forces a trot.
export const TOP_SPEED=9.4;
export const allowedSpeed=(target,s,stats)=>Math.min(target,s.overheated?TIRED_SPEED:TOP_SPEED*stats.speed);

// ---------- Steeplechase stats ----------
// Your own horse's five steeplechase stats (0–100) from how it's looked after: level (care XP), bond, happiness,
// today's condition, age and tack. The Free Saddle costs top speed, the Free Bridle costs agility.
export function raceStats(h,cond='fed',now=Date.now()){const lvl=Math.floor(Math.sqrt((h.xp||0)/40))+1,bond=h.bond??50,happy=h.happiness??60,age=ageRide(h,now),t=tackOf(h);
  const c={fed:1,hungry:.95,rundown:.75,unwell:.5}[cond]??1,clamp=v=>Math.round(Math.max(20,Math.min(95,v)));
  return {speed:clamp((52+lvl*1.5+bond*.12)*(upgraded(t.saddle)?1:.88)*age.speed*c),stamina:clamp((48+lvl*1.5+bond*.15)/age.drain*c),
    trust:clamp(35+bond*.5),agility:clamp((50+lvl+happy*.15)*(upgraded(t.bridle)?1:.85)),heart:clamp((45+happy*.3)*age.recover)};}

// ---------- Race gear ----------
// Racing needs riding gear: the Trail Rider outfit (bought once, 300 Trotties). Other outfits are looks only.
export const RACE_OUTFIT='trail';
export const SHOW_OUTFIT='show';// Horse shows (note #18): the Show Jacket, 1,500. It counts as riding gear for races too.
export const canRace=wallet=>!!wallet?.owned?.some(id=>id===RACE_OUTFIT||id===SHOW_OUTFIT);
export const canShow=wallet=>!!wallet?.owned?.includes(SHOW_OUTFIT);

// ---------- Jump passes ----------
// Jumping on the map is free FREE_JUMPS times a day (Yoshi 2026-11-09); after that one jump every JUMP_WAIT (v134: a wait,
// never a trust cost, Yoshi 2026-11-15), so riding there stays the way to grow trust. passes: {day, used} saved on the device.
export const FREE_JUMPS=5,JUMP_TRUST=3,JUMP_KEY='trottville-jump-passes';
export const passesLeft=(p,now=Date.now())=>p?.day===dayNo(now)?Math.max(0,FREE_JUMPS-(p.used||0)):FREE_JUMPS;
// One jump: uses a pass if there is one left today. → {free, left, passes}
// v134 (Yoshi 2026-11-15: "just delays added, to slow the game down"): after the free jumps, one more jump every
// JUMP_WAIT. Nothing is lost, you just wait. → ms until the next jump is allowed (0 = jump now).
export const JUMP_WAIT=20*60000;
export function jumpWait(p,now=Date.now()){if(passesLeft(p,now))return 0;return Math.max(0,(p?.nextAt||0)-now);}
export function useJump(p,now=Date.now()){const d=dayNo(now),used=p?.day===d?(p.used||0):0;if(used<FREE_JUMPS)return {ok:true,free:true,left:FREE_JUMPS-used-1,passes:{day:d,used:used+1,nextAt:p?.nextAt||0}};
  if(jumpWait(p,now))return {ok:false,free:false,left:0,wait:jumpWait(p,now),passes:p};
  return {ok:true,free:false,left:0,passes:{day:d,used,nextAt:now+JUMP_WAIT}};}
