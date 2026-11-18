// Your own herd in the countryside steeplechase (pure; tested in tests/steeple-herd-check.mjs).
// Who can race uses riding.mjs as is: canRaceHorse (not retired, old enough) then rideBlock (foal, tack, taming).
// Stats: riding.mjs raceStats (care, bond, age, today's condition) with full tack, then tack applies as in the 3D
// world: the Complimentary saddle holds top speed to 86% (rideStats, the world's 9.4 × .86), the Complimentary
// bridle turns slower. Trust is the 3D world's riding trust for that horse when there is one.
import * as G from './riding.mjs?v=157';

// Free bridle in the race: turning at 80% (the world's 3.5 vs 9 is too harsh for a timed course).
export const FREE_BRIDLE_TURN=.8;
const clamp=v=>Math.round(Math.max(20,Math.min(95,v)));

// Why a horse can't race (or null), as a short chip.
export function raceBlock(h,now=Date.now()){
  if(h?.retired)return {id:'retired',chip:'Retired'};
  const b=G.rideBlock(h,now);
  if(b==='foal')return {id:'foal',chip:'Foal'};
  if(b==='tack')return {id:'tack',chip:'Needs tack'};
  if(b==='untamed')return {id:'untamed',chip:G.trustText(h)};
  if(G.tooOldToCompete(h,now))return {id:'senior',chip:'Too old to race'};
  if(!G.canRaceHorse(h,now))return {id:'foal',chip:'Foal'};
  return null;
}

// The 3D world keeps riding trust per horse at 'horselandia-adventure-v1:<guest|user id>:trust'. Prefer the signed-in
// player's (Supabase session key 'meadowgate-auth-*'), then the guest's, then any one found. → {id: 0–100} or null
export function readWorldTrust(storage){
  try{
    const keys=[];for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k)keys.push(k);}
    const trustKeys=keys.filter(k=>/^horselandia-adventure-v1:.*:trust$/.test(k));if(!trustKeys.length)return null;
    let uid=null;for(const k of keys)if(k.startsWith('meadowgate-auth-')){try{const s=JSON.parse(storage.getItem(k));uid=s?.user?.id||s?.currentSession?.user?.id||null;}catch{}}
    const want=[uid&&`horselandia-adventure-v1:${uid}:trust`,'horselandia-adventure-v1:guest:trust'].filter(Boolean);
    const key=want.find(k=>trustKeys.includes(k))||trustKeys[0],map=JSON.parse(storage.getItem(key));
    return map&&typeof map==='object'?map:null;
  }catch{return null;}
}

// No world trust yet: taming trust (0–20, full once tamed) scaled to about the world's starting 50, nudged by bond.
export function fallbackTrust(h){const frac=G.isTamed(h)?1:Math.min(1,(h?.trust||0)/G.TAME_AT);return clamp(55*frac+((h?.bond??50)-50)*.3);}

// One of your horses ready for the race: {name, stats, cap:{speed, turn}, notes, horse, mine}.
export function raceEntry(h,{cond='fed',trust=null,now=Date.now()}={}){
  const t=G.tackOf(h),full={...h,tack:{...t,saddle:G.upgraded(t.saddle)?t.saddle:'black',bridle:G.upgraded(t.bridle)?t.bridle:'black'}};
  const stats=G.raceStats(full,cond,now),w=trust?.[h.id];
  stats.trust=Number.isFinite(Number(w))&&w!=null?clamp(Number(w)):fallbackTrust(h);
  const speed=G.rideStats(h,now).speed/G.ageRide(h,now).speed,turn=G.upgraded(t.bridle)?1:FREE_BRIDLE_TURN,notes=[];
  if(speed<1)notes.push(`${t.saddle==='loan'?'Loaned':'Basic'} saddle: top speed held to ${Math.round(speed*100)}%. A bought saddle gives full speed.`);
  if(turn<1)notes.push(`${t.bridle==='loan'?'Loaned':'Basic'} bridle: turns ${Math.round(turn*100)}% as tight. A bought bridle gives full control.`);
  if(cond!=='fed')notes.push({hungry:'A little hungry today, so a touch slower.',rundown:'Run-down today: feed and rest for a better race.',unwell:'Unwell today: a vet visit would help a lot.'}[cond]||'');
  return {name:h.name,stats,cap:{speed,turn},notes:notes.filter(Boolean),horse:h,mine:true};
}

// The whole herd for the picker. → {ready:[{id, entry}], blocked:[{id, name, chip}]}
export function herdRoster(herd,{condOf=()=>'fed',trust=null,now=Date.now()}={}){
  const ready=[],blocked=[];
  for(const h of herd||[]){if(!h?.id)continue;const b=raceBlock(h,now);
    if(b)blocked.push({id:h.id,name:h.name,chip:b.chip,why:b.id,...(b.id==='tack'?{missing:G.missingTack(h,now)}:{})});else ready.push({id:h.id,entry:raceEntry(h,{cond:condOf(h),trust,now})});}
  return {ready,blocked};
}

// Short friendly reason when nobody can race.
export function noneReadyText(blocked){
  if(!blocked.length)return 'You have no horses yet.';
  const has=id=>blocked.some(b=>b.why===id);
  // v137: a horse that only needs new shoes is told so (not 'buy the Starter Kit').
  const tackB=blocked.filter(b=>b.why==='tack'),shoesOnly=tackB.length&&tackB.every(b=>b.missing?.length&&b.missing.every(p=>p==='shoes'));
  const bits=[has('tack')&&(shoesOnly?'get new horseshoes from Otis in the Tack Room':'buy the Starter Kit from Otis in the Tack Room'),has('untamed')&&'keep caring for your new horse until it’s tamed',
    has('foal')&&'foals can race from age 2'].filter(Boolean);
  return bits.length?`To race, ${bits.join('; ')}.`:'Retired horses enjoy the pasture now. A younger horse can race for you.';
}
