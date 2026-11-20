// Trottville side quests: the engine. Pure (no DOM, no Date.now, no Math.random): every call gets `now` (ms epoch)
// and returns a NEW state. The world saves the state in localStorage QUEST_KEY.
//  · Talk to a giver → talk() says what happens: offer / turnin / reminder / receive / gone / chat / needs-horse.
//  · Each giver gives at most ONE numbered quest a day. Fail, run out of time or give up → they go home for the
//    rest of today; tomorrow they ask their NEXT favour (the failed one comes back after the others).
//  · Deadlines count PLAY time: step() only runs the clock while the world is open (gaps over MAX_GAP are ignored).
//    A quest still open when the local day changes quietly ends ("they went home for the night") without
//    sending that giver home on the new day.
//  · After a giver's five, they offer one small odd job a day forever (not part of the 200).
import {GIVERS,GIVER_BY_ID,QUESTS,QUEST_BY_ID,QUESTS_BY_GIVER,QUEST_TOTAL,HINTS,QUEST_GIVERS,CORN_GATE,CORN_ENTRANCE,CORN_SIGN,CORN_MAZE,CORN_KEEP_OUT,ODD_ITEMS,ODD_LOST,ODD_PARCELS,ODD_PLACES,
  placeOf,spotNear,seeded,hashStr,rewardFor} from './quest-content.mjs?v=162';

export {GIVERS,GIVER_BY_ID,QUESTS,QUEST_BY_ID,QUEST_TOTAL,HINTS,QUEST_GIVERS,CORN_GATE,CORN_ENTRANCE,CORN_SIGN,CORN_MAZE,CORN_KEEP_OUT};
export const QUEST_KEY='trottville-quests-v1';
export const MAX_ACTIVE=3;
export const MAX_GAP=5000;          // ms of clock a single step() may advance (pauses while the world is closed)
export const PICKUP_R=2.5,ESCORT_R=3,VISIT_R=6;
const MIN=60000;

export function dayKey(now){const d=new Date(now);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}

// ---------- State ----------
// run:   active quests {id:{at,day,left,got:[i],found,follow,visited}} (numbered or odd job)
// done:  {qid:{at,day}} numbered quests finished · fails {qid:n} · failDay {qid:day}
// givers {gid:{gave:day (numbered quest accepted), gone:day, odd:day (odd job accepted)}}
// stats  {oddDone, dayKey, dayCount, bestDay, spare (best courier ms left), deliveries}
export function freshQuests(){return {v:1,run:{},done:{},fails:{},failDay:{},givers:{},stats:{oddDone:0,day:null,dayCount:0,bestDay:0,spare:0},earned:{},last:0};}
const isDay=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v);
const num=(v,lo=0,hi=Number.MAX_SAFE_INTEGER)=>{const n=Number(v);return Number.isFinite(n)?Math.min(hi,Math.max(lo,n)):lo;};
export function normalizeQuests(raw){
  const s=freshQuests();if(!raw||typeof raw!=='object'||Array.isArray(raw))return s;
  const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
  for(const [id,r] of Object.entries(obj(raw.run))){const q=getQuest(id);if(!q||!r||typeof r!=='object')continue;
    const n=q.kind==='fetch'?q.count:0;
    s.run[id]={at:num(r.at),day:isDay(r.day)?r.day:null,left:num(r.left,0,q.minutes*MIN),
      got:[...new Set((Array.isArray(r.got)?r.got:[]).filter(i=>Number.isInteger(i)&&i>=0&&i<n))],found:r.found===true,follow:r.follow===true,visited:r.visited===true};
    if(!s.run[id].day)delete s.run[id];}
  if(Object.keys(s.run).length>MAX_ACTIVE)s.run=Object.fromEntries(Object.entries(s.run).sort((a,b)=>a[1].at-b[1].at).slice(0,MAX_ACTIVE));
  for(const [id,d] of Object.entries(obj(raw.done)))if(QUEST_BY_ID[id]&&d&&typeof d==='object')s.done[id]={at:num(d.at),day:isDay(d.day)?d.day:null};
  for(const id of Object.keys(s.run))if(s.done[id])delete s.run[id];
  for(const [id,n] of Object.entries(obj(raw.fails)))if(QUEST_BY_ID[id]&&num(n,0,999)>0)s.fails[id]=Math.round(num(n,0,999));
  for(const [id,d] of Object.entries(obj(raw.failDay)))if(QUEST_BY_ID[id]&&isDay(d))s.failDay[id]=d;
  for(const [g,v] of Object.entries(obj(raw.givers)))if(GIVER_BY_ID[g]&&v&&typeof v==='object'){const o={};for(const k of ['gave','gone','odd'])if(isDay(v[k]))o[k]=v[k];s.givers[g]=o;}
  const st=obj(raw.stats);s.stats={oddDone:Math.round(num(st.oddDone,0,1e6)),day:isDay(st.day)?st.day:null,dayCount:Math.round(num(st.dayCount,0,999)),bestDay:Math.round(num(st.bestDay,0,999)),spare:num(st.spare,0,60*MIN)};
  for(const [b,t] of Object.entries(obj(raw.earned)))if(BADGE_IDS.has(b))s.earned[b]=num(t);
  s.last=num(raw.last);
  return s;
}
const clone=s=>({...s,run:Object.fromEntries(Object.entries(s.run).map(([k,r])=>[k,{...r,got:[...r.got]}])),done:{...s.done},fails:{...s.fails},failDay:{...s.failDay},
  givers:Object.fromEntries(Object.entries(s.givers).map(([k,v])=>[k,{...v}])),stats:{...s.stats},earned:{...s.earned}});

// ---------- Odd jobs ----------
const oddId=(g,day)=>'odd:'+g+':'+day;
export function oddJob(giverId,day){
  const g=GIVER_BY_ID[giverId];if(!g||!isDay(day))return null;
  const rnd=seeded('odd|'+giverId+'|'+day),pick=a=>a[Math.floor(rnd()*a.length)],id=oddId(giverId,day);
  const kinds=['fetch','find','deliver','visit'],kind=kinds[Math.floor(rnd()*4)];
  const where=pick(ODD_PLACES),p=placeOf(where);
  const base={id,n:0,odd:true,giver:giverId,kind,minutes:10,mounted:false,prereq:null};
  if(kind==='fetch'){const [name,icon]=pick(ODD_ITEMS),count=3+Math.floor(rnd()*3);
    return {...base,title:'Odd job: '+name+'s',icon,item:{name,icon},count,at:where,place:p.name,radius:9,
      spots:Array.from({length:count},(_,j)=>spotNear(p.x,p.z,9*(.5+.5*j/Math.max(1,count-1)),id+':'+j)),
      ask:`Got a minute? I could use ${count} ${name.toLowerCase()}s from round ${p.name}.`,thanks:'That\'s a big help. Here\'s a little something!',reward:15+count*3};}
  if(kind==='find'){const [name,icon]=pick(ODD_LOST);
    return {...base,title:'Odd job: my '+name.toLowerCase(),icon,item:{name,icon},at:where,place:p.name,hint:`Somewhere near ${p.name}.`,spot:spotNear(p.x,p.z,9,id),
      ask:`I've put my ${name.toLowerCase()} down somewhere near ${p.name}. Keep an eye out?`,thanks:'There it is! Thank you kindly.',reward:25};}
  if(kind==='deliver'){const others=GIVERS.filter(o=>o.id!==giverId),to=others[Math.floor(rnd()*others.length)],[name,icon]=pick(ODD_PARCELS);
    const d=Math.hypot(to.x-g.x,to.z-g.z);
    return {...base,title:'Odd job: '+name.toLowerCase(),icon,item:{name,icon},to:to.id,fragile:false,
      ask:`Would you run this ${name.toLowerCase()} over to ${to.name}? Just before supper is fine.`,thanks:`From ${g.name}? How kind. Thank you!`,reward:Math.min(35,Math.max(15,Math.round((12+d*.15)/5)*5))};}
  return {...base,kind:'visit',title:'Odd job: a look at '+p.name,icon:'👀',at:where,place:p.name,label:p.name,spot:spotNear(p.x,p.z,3,id),
    seen:`${p.name} looks lovely today. All is well.`,ask:`Could you pop over to ${p.name} and tell me how it looks today?`,thanks:'All well? Lovely. Thanks for looking!',reward:20};
}
export function getQuest(id){
  if(QUEST_BY_ID[id])return QUEST_BY_ID[id];
  const m=/^odd:([a-z]+):(\d{4}-\d{2}-\d{2})$/.exec(String(id||''));return m?oddJob(m[1],m[2]):null;
}

// ---------- Helpers ----------
const G=(s,g)=>s.givers[g]||(s.givers[g]={});
const activeIds=s=>Object.keys(s.run).sort((a,b)=>s.run[a].at-s.run[b].at);
const doneCount=s=>Object.keys(s.done).filter(id=>QUEST_BY_ID[id]&&!HINTS[QUEST_BY_ID[id].giver]).length;
function isReady(q,r){
  if(!q||!r)return false;
  if(q.kind==='fetch')return r.got.length>=q.count;
  if(q.kind==='find')return r.found;
  if(q.kind==='escort')return r.follow;
  if(q.kind==='visit')return r.visited;
  return false;
}
function giverActive(s,g){return activeIds(s).find(id=>getQuest(id)?.giver===g)||null;}
// The numbered quest this giver would ask next (ignores today's limit), or null.
function nextNumbered(s,g,today){
  const list=QUESTS_BY_GIVER[g]||[];
  const open=list.filter(q=>!s.done[q.id]&&!s.run[q.id]&&(!q.prereq||s.done[q.prereq])&&(q.kind!=='deliver'||s.givers[q.to]?.gone!==today));
  open.sort((a,b)=>((s.fails[a.id]||0)-(s.fails[b.id]||0))||a.n-b.n);
  return open[0]||null;
}
const allFive=(s,g)=>(QUESTS_BY_GIVER[g]||[]).every(q=>s.done[q.id]);
// What the giver offers right now (honours the daily limits), with why not.
export function offerFor(state,giverId,now){
  const s=state,today=dayKey(now),gv=s.givers[giverId]||{};
  if(!GIVER_BY_ID[giverId])return {quest:null,why:'unknown'};
  if(HINTS[giverId])return {quest:null,why:'hints'};   // note #41: hint people chat and give clues
  if(giverActive(s,giverId))return {quest:null,why:'active'};
  if(gv.gone===today)return {quest:null,why:'gone'};
  if(gv.gave!==today){const q=nextNumbered(s,giverId,today);if(q)return {quest:q,why:null};}
  if(allFive(s,giverId)){if(gv.odd===today)return {quest:null,why:'tomorrow'};const q=oddJob(giverId,today);if(q.kind==='deliver'&&s.givers[q.to]?.gone===today)return {quest:null,why:'tomorrow'};return {quest:q,why:null};}
  if(gv.gave===today)return {quest:null,why:'tomorrow'};
  return {quest:null,why:'waiting'};   // remaining quests wait on someone else's story
}

// Remove expired quests (time used up, or left over from an earlier day). Mutates s; returns events.
function sweep(s,now){
  const today=dayKey(now),ev=[];
  for(const id of activeIds(s)){const r=s.run[id],q=getQuest(id);
    if(r.day!==today||r.left<=0){const goneDay=r.day!==today?r.day:today;delete s.run[id];
      if(q&&!q.odd){s.fails[id]=(s.fails[id]||0)+1;s.failDay[id]=goneDay;}
      if(q)G(s,q.giver).gone=goneDay;ev.push({type:'expired',quest:id,overnight:r.day!==today});}}
  return ev;
}
function finish(s,id,now){
  const q=getQuest(id),r=s.run[id],today=dayKey(now);if(!q)return {reward:0,badges:[]};
  const before=earnedSet(s);
  delete s.run[id];
  if(q.odd)s.stats.oddDone++;else s.done[id]={at:now,day:today};
  if(s.stats.day!==today){s.stats.day=today;s.stats.dayCount=0;}
  s.stats.dayCount++;s.stats.bestDay=Math.max(s.stats.bestDay,s.stats.dayCount);
  if(q.kind==='courier'&&r)s.stats.spare=Math.max(s.stats.spare,r.left);
  const fresh=badges(s).filter(b=>b.earned&&!before.has(b.id));
  for(const b of fresh)s.earned[b.id]=now;
  return {reward:q.reward,badges:fresh.map(b=>({...b,earnedAt:now}))};
}
const mmss=ms=>{const t=Math.max(0,Math.ceil(ms/1000));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');};
export function progressText(q,r){
  if(!q)return '';
  const to=GIVER_BY_ID[q.to]?.name,giver=GIVER_BY_ID[q.giver]?.name;
  if(isReady(q,r))return q.kind==='escort'?`Bring ${q.follower.name} back to ${giver}.`:q.kind==='visit'?`Go back and tell ${giver}.`:`Take it back to ${giver}.`;
  switch(q.kind){
    case 'deliver':return `Take the ${q.item.name.toLowerCase()} to ${to}.`;
    case 'fetch':return `Collect ${q.item.name.toLowerCase()}s near ${q.place}: ${r?r.got.length:0} / ${q.count}.`;
    case 'find':return `Look for the ${q.item.name.toLowerCase()} near ${q.place}. ${q.hint}`;
    case 'escort':return `Find ${q.follower.name} near ${q.place}.`;
    case 'visit':return `Ride to ${q.place} and take a look.`;
    case 'courier':return `Get to ${q.place} before the time runs out!`;
    case 'maze':return q.lost&&q.lost.name!==q.foal?`Find ${q.foal} and ${q.lost.kind==='lamb'?q.lost.name+' the lamb':'the '+q.lost.name.toLowerCase()} in the corn maze and lead them out.`:`Find ${q.foal} in the corn maze and lead the foal out.`;
  }
  return '';
}
const greet=(g,now)=>g.greeting[hashStr(g.id+dayKey(now))%g.greeting.length];

// ---------- Talk ----------
// ctx {mounted,x,z}. Completing talks (turnin/receive) return reward + badges and the new state.
export function talk(state,giverId,now,ctx={}){
  const s=clone(state),g=GIVER_BY_ID[giverId];
  if(!g)return {state,kind:'chat',quest:null,giver:null,lines:['…'],actions:['ok']};
  const events=sweep(s,now),out=(kind,quest,lines,extra={})=>({state:s,kind,quest,giver:g,lines,actions:kind==='offer'?['accept','later']:['ok'],events,...extra});
  // 1. Delivering something TO this person.
  const incoming=activeIds(s).find(id=>{const q=getQuest(id);return q?.kind==='deliver'&&q.to===giverId;});
  if(incoming){const q=getQuest(incoming),f=finish(s,incoming,now);return out('receive',q,[q.thanks],{reward:f.reward,badges:f.badges});}
  // 2. Their own quest is under way.
  const mine=giverActive(s,giverId);
  if(mine){const q=getQuest(mine),r=s.run[mine];
    if(isReady(q,r)){const f=finish(s,mine,now);return out('turnin',q,[q.kind==='visit'?q.seen:null,q.thanks].filter(Boolean),{reward:f.reward,badges:f.badges});}
    return out('reminder',q,[progressText(q,r),`Time left: ${mmss(r.left)}.`],{secondsLeft:Math.ceil(r.left/1000)});}
  // 3. Gone home, or nothing more today.
  const off=offerFor(s,giverId,now);
  if(off.why==='gone')return out('gone',null,[g.goneHome]);
  if(off.why==='hints'){const gv=G(s,giverId),n=gv.hint||0;gv.hint=n+1;return out('chat',null,[greet(g,now),HINTS[giverId][n%HINTS[giverId].length]],{hint:true});}
  if(off.why==='tomorrow')return out('gone',null,[greet(g,now),'Thanks for today! See you tomorrow.'],{tomorrow:true});
  if(!off.quest)return out('chat',null,[greet(g,now)]);
  const q=off.quest;
  if(q.mounted&&!ctx.mounted)return out('needs-horse',q,[greet(g,now),q.ask,"You'll need your horse for this one. Come back riding!"]);
  if(Object.keys(s.run).length>=MAX_ACTIVE)return out('chat',q,[greet(g,now),`You've got your hands full already! Come back when you have a free hand (${MAX_ACTIVE} jobs at a time).`],{full:true});
  return out('offer',q,[greet(g,now),q.ask]);
}
export function accept(state,questId,now,ctx={}){
  const q=getQuest(questId);if(!q)return {state,ok:false,reason:'unknown'};
  const s=clone(state);sweep(s,now);
  const off=offerFor(s,q.giver,now);
  if(!off.quest||off.quest.id!==q.id)return {state,ok:false,reason:off.why||'not-offered'};
  if(Object.keys(s.run).length>=MAX_ACTIVE)return {state,ok:false,reason:'full'};
  if(q.mounted&&ctx.mounted===false)return {state,ok:false,reason:'needs-horse'};
  const today=dayKey(now);
  s.run[q.id]={at:now,day:today,left:q.minutes*MIN,got:[],found:false,follow:false,visited:false};
  if(q.odd)G(s,q.giver).odd=today;else G(s,q.giver).gave=today;
  if(!s.last)s.last=now;
  return {state:s,ok:true,quest:q};
}
// Give up: counts as failing (that giver goes home for today).
export function abandon(state,questId,now){
  if(!state.run[questId])return {state,ok:false};
  const s=clone(state),q=getQuest(questId),today=dayKey(now);delete s.run[questId];
  if(q){G(s,q.giver).gone=today;if(!q.odd){s.fails[questId]=(s.fails[questId]||0)+1;s.failDay[questId]=today;}}
  return {state:s,ok:true};
}
// World-reported completion (the corn maze, or anything the world decides is done).
export function complete(state,questId,now){
  const s=clone(state);sweep(s,now);if(!s.run[questId])return {state:s,ok:false,reward:0,badges:[]};
  const q=getQuest(questId),f=finish(s,questId,now);return {state:s,ok:true,quest:q,reward:f.reward,badges:f.badges};
}

// ---------- Step (call every frame or a few times a second while the world is open) ----------
export function step(state,now,ctx={}){
  if(!Object.keys(state.run).length){return state.last===now?{state,events:[]}:{state:{...state,last:now},events:[]};}
  const s=clone(state),dt=Math.min(MAX_GAP,Math.max(0,now-(s.last||now)));s.last=now;
  for(const id of Object.keys(s.run))s.run[id].left-=dt;
  const events=sweep(s,now),x=Number(ctx.x),z=Number(ctx.z),here=Number.isFinite(x)&&Number.isFinite(z);
  if(here)for(const id of activeIds(s)){const q=getQuest(id),r=s.run[id];if(!q)continue;const near=(p,d)=>Math.hypot(p.x-x,p.z-z)<=d,was=isReady(q,r);
    if(q.kind==='fetch')q.spots.forEach((p,i)=>{if(!r.got.includes(i)&&near(p,PICKUP_R)){r.got.push(i);events.push({type:'picked',quest:id,item:q.item,index:i,have:r.got.length,need:q.count});}});
    else if(q.kind==='find'&&!r.found&&near(q.spot,PICKUP_R)){r.found=true;events.push({type:'found',quest:id,item:q.item});}
    else if(q.kind==='escort'&&!r.follow&&near(q.spot,ESCORT_R)){r.follow=true;events.push({type:'follow',quest:id,follower:{...q.follower,id:id+':f',x:q.spot.x,z:q.spot.z}});}
    else if(q.kind==='visit'&&!r.visited&&near(q.spot,VISIT_R)&&(!q.mounted||ctx.mounted)){r.visited=true;events.push({type:'visited',quest:id,seen:q.seen});}
    else if(q.kind==='courier'&&near(q.spot,VISIT_R)&&(!q.mounted||ctx.mounted)){const spare=r.left,f=finish(s,id,now);events.push({type:'done',quest:id,reward:f.reward,spare:Math.ceil(spare/1000),lines:[q.thanks]});for(const b of f.badges)events.push({type:'badge',badge:b});continue;}
    if(!was&&isReady(q,r))events.push({type:'ready',quest:id,giver:q.giver});}
  return {state:s,events};
}

// ---------- What to draw ----------
export function giverState(state,giverId,now){
  const today=dayKey(now);
  if(activeIds(state).some(id=>{const q=getQuest(id);return q?.kind==='deliver'&&q.to===giverId;}))return 'turnin';
  const mine=giverActive(state,giverId);if(mine)return isReady(getQuest(mine),state.run[mine])?'turnin':'active';
  if((state.givers[giverId]||{}).gone===today)return 'gone';
  return offerFor(state,giverId,now).quest?'offer':'none';
}
export function targetOf(q,r){
  if(!q)return null;const g=GIVER_BY_ID[q.giver];
  if(isReady(q,r))return {x:g.x,z:g.z,label:g.name};
  if(q.kind==='deliver'){const t=GIVER_BY_ID[q.to];return {x:t.x,z:t.z,label:t.name};}
  if(q.kind==='visit'||q.kind==='courier'||q.kind==='maze')return {x:q.spot.x,z:q.spot.z,label:q.label||q.place};
  if(q.kind==='fetch'){const left=q.spots.filter((_,i)=>!r?.got.includes(i));const p=placeOf(q.at);return left.length?{x:p.x,z:p.z,label:q.place}:{x:g.x,z:g.z,label:g.name};}
  const p=placeOf(q.at);return {x:p.x,z:p.z,label:q.place};   // find / escort: point at the area, not the exact spot
}
export function markers(state,now){
  const out=[];
  for(const id of activeIds(state)){const q=getQuest(id),r=state.run[id];if(!q)continue;
    if(q.kind==='fetch')q.spots.forEach((p,i)=>{if(!r.got.includes(i))out.push({type:'pickup',quest:id,id:id+':'+i,x:p.x,z:p.z,icon:q.item.icon,px:q.item.px,name:q.item.name});});
    if(q.kind==='find'&&!r.found)out.push({type:'pickup',quest:id,id:id+':find',x:q.spot.x,z:q.spot.z,icon:q.item.icon,px:q.item.px,name:q.item.name,hidden:true});
    if(q.kind==='escort')out.push({type:'follower',quest:id,id:id+':f',x:q.spot.x,z:q.spot.z,name:q.follower.name,kind:q.follower.kind,seed:q.follower.seed,following:r.follow});
    const t=targetOf(q,r);if(t)out.push({type:'target',quest:id,x:t.x,z:t.z,label:t.label});}
  for(const g of GIVERS)out.push({type:'giver',giverId:g.id,x:g.x,z:g.z,state:giverState(state,g.id,now)});
  return out;
}
export function activeList(state,now){
  return activeIds(state).map(id=>{const q=getQuest(id),r=state.run[id],g=GIVER_BY_ID[q.giver];
    return {id,n:q.n,odd:!!q.odd,title:q.title,icon:q.icon,px:q.px,kind:q.kind,giver:q.giver,giverName:g.name,reward:q.reward,mounted:q.mounted,
      todo:progressText(q,r),ready:isReady(q,r),progress:q.kind==='fetch'?{have:r.got.length,need:q.count}:null,secondsLeft:Math.max(0,Math.ceil(r.left/1000)),target:targetOf(q,r)};});
}
export function log(state,now=0){
  const today=dayKey(now);
  const entries=QUESTS.map(q=>{let status='unknown';
    if(state.done[q.id])status='done';else if(state.run[q.id])status='active';else if(state.failDay[q.id]===today)status='failed-today';
    return {n:q.n,id:q.id,title:q.title,icon:q.icon,px:q.px,kind:q.kind,giver:q.giver,giverName:GIVER_BY_ID[q.giver].name,reward:q.reward,status,doneAt:state.done[q.id]?.at||null};});
  return {done:doneCount(state),total:QUEST_TOTAL,oddDone:state.stats.oddDone,entries};
}

// ---------- Badges ----------
const kindTotal=k=>QUESTS.filter(q=>k.includes(q.kind)).length;
const kindDone=(s,k)=>Object.keys(s.done).filter(id=>k.includes(QUEST_BY_ID[id]?.kind)&&!HINTS[QUEST_BY_ID[id]?.giver]).length;
export const BADGES=[
  {id:'q1',px:'badge-first',name:'First Favour',icon:'🌱',about:'Finish your first side quest.',need:1,have:s=>doneCount(s)},
  {id:'q10',px:'badge-hooves',name:'Helping Hooves',icon:'🐾',about:'Finish 10 side quests.',need:10,have:s=>doneCount(s)},
  {id:'q25',px:'badge-friendly',name:'Friendly Face',icon:'😊',about:'Finish 25 side quests.',need:25,have:s=>doneCount(s)},
  {id:'q50',px:'badge-regular',name:'Valley Regular',icon:'🏡',about:'Finish 50 side quests.',need:50,have:s=>doneCount(s)},
  {id:'q100',px:'badge-treasure',name:'Town Treasure',icon:'💛',about:'Finish 75 side quests.',need:75,have:s=>doneCount(s)},
  {id:'q150',px:'badge-legend',name:'Legend of the Lanes',icon:'🌟',about:'Finish 90 side quests.',need:90,have:s=>doneCount(s)},
  {id:'q200',px:'badge-quest',name:'The Quest Badge',icon:'🏆',about:`Finish all ${QUEST_TOTAL} side quests. Everyone in Trottville knows your name!`,need:QUEST_TOTAL,have:s=>doneCount(s),big:true},
  {id:'post',px:'badge-saddlebags',name:'Swift Saddlebags',icon:'📦',about:'Make every delivery.',need:kindTotal(['deliver']),have:s=>kindDone(s,['deliver'])},
  {id:'lost',px:'badge-finder',name:'Finder of Lost Things',icon:'🔍',about:'Find every lost thing and lost friend.',need:kindTotal(['find','escort']),have:s=>kindDone(s,['find','escort'])},
  {id:'busy',px:'badge-bee',name:'Busy Bee',icon:'🐝',about:'Finish 5 quests in one day.',need:5,have:s=>s.stats.bestDay},
  {id:'zoom',px:'badge-lightning',name:'Lightning Hooves',icon:'⚡',about:'Finish a race-the-clock errand with over 2 minutes to spare.',need:1,have:s=>s.stats.spare>2*MIN?1:0},
  {id:'odd',px:'badge-oddjob',name:'Odd Job Ace',icon:'🧰',about:'Do 10 odd jobs.',need:10,have:s=>s.stats.oddDone},
  {id:'all40',px:'badge-neighbour',name:'Good Neighbour',icon:'🤝',about:'Help every quest giver in the valley at least once.',need:QUEST_GIVERS.length,have:s=>QUEST_GIVERS.filter(g=>QUESTS_BY_GIVER[g.id].some(q=>s.done[q.id])).length}
];
const BADGE_IDS=new Set(BADGES.map(b=>b.id));
export function badges(state){return BADGES.map(b=>{const have=Math.min(b.need,b.have(state));return {id:b.id,name:b.name,icon:b.icon,px:b.px,about:b.about,big:!!b.big,need:b.need,have,earned:have>=b.need,earnedAt:state.earned?.[b.id]||null};});}
const earnedSet=s=>new Set(badges(s).filter(b=>b.earned).map(b=>b.id));
export function newBadges(prev,next){const had=earnedSet(prev);return badges(next).filter(b=>b.earned&&!had.has(b.id));}
