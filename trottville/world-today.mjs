// "Today" on the valley map: the things you can do right now to earn Trotties or food, pinned where they happen.
// Pure (no DOM): world.js passes what it knows (today's done list, places found, where you are) and the map draws
// the result as a list plus glowing pins. Every activity rides/jumps to its nearest map place (`anchor`), so the
// map card's Ride / Jump buttons work unchanged.
import {LOCATIONS} from './world-content.mjs?v=158';
import {R} from './world-regions.mjs?v=158';

export const dayKey=(d=new Date())=>d.toISOString().slice(0,10);// same day key as adventure.daily
// Finished-today marks live in their own small key so the barn games, the herding pen and the steeplechase frame
// (a separate page) can all tick an activity off.
const KEY='trottville-today';
export function loadDone(store=globalThis.localStorage,day=dayKey()){try{const v=JSON.parse(store.getItem(KEY));return v?.day===day?v.done:[];}catch{return [];}}
export function markDone(id,store=globalThis.localStorage,day=dayKey()){try{const done=loadDone(store,day);if(!done.includes(id))store.setItem(KEY,JSON.stringify({day,done:[...done,id]}));}catch{}}

// Fixed activities. x/z are where they happen in the world (stations from world-stations.js).
const ACTS=[
  {id:'feed',icon:'🍎',px:'game-apples',title:'Appleoosa',reward:'+20 🪙 and apples',coins:20,x:17,z:-32,how:'Sort apples at the orchard rig.'},
  {id:'fling',icon:'🌾',px:'game-fling',title:'Hay’s for Horses',reward:'+20 🪙',coins:20,x:-29,z:0,how:'Fling hay up to the barn loft.'},
  {id:'herd',icon:'🍇',px:'game-herd',title:'Pen the foals',reward:'up to +30 🪙',coins:30,x:-42,z:9.5,how:'Herd the foals into the Grapevine Paddock pen.'},
  {id:'race',icon:'🏁',px:'game-steeple',title:'Steeplechase',reward:'+10 🪙 a race',coins:10,x:45,z:25,how:'Race the countryside steeplechase from Clover Racecourse.'},
  {id:'carrots',icon:'🥕',px:'carrot',title:'Carrot basket',reward:'free carrots',coins:0,x:-64,z:32,supply:'carrots',how:'Collect the Carrot Market’s daily basket.'},
  {id:'apples',icon:'🧺',px:'apple',title:'Apple picking',reward:'free apples',coins:0,x:3,z:-26,supply:'apples',how:'Gather today’s apples in the orchard.'},
];
// 2026-11-15 playtest: these are design-layout spots; the nine regions moved the stations (world-stations.js runs R() on them),
// so the list sent Appleoosa / Steeplechase / apples / carrots to old places. Move them the same way.
for(const a of ACTS)Object.assign(a,R(a.x,a.z));
const near=(x,z)=>LOCATIONS.filter(l=>l.id!=='summit').reduce((b,l)=>{const d=Math.hypot(l.x-x,l.z-z);return d<b.d?{l,d}:b;},{l:LOCATIONS[0],d:Infinity}).l;

// daily: adventure.daily ({'apples:2026-11-09':1, …}); done: loadDone(); visited: place ids found;
// player: {x,z}. Returns not-done first (nearest first), then done.
export function todayActivities({daily={},done=[],visited=[],player={x:0,z:0},day=dayKey()}={}){
  const out=ACTS.map(a=>({...a,anchor:near(a.x,a.z).id,done:!!(a.supply?daily[a.supply+':'+day]:done.includes(a.id))}));
  // The nearest place you haven't found yet: +25 the first time you get there.
  const unseen=LOCATIONS.filter(l=>!visited.includes(l.id)).sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z))[0];
  if(unseen)out.push({id:'explore',icon:'🗺️',px:'map',title:'Discover '+unseen.name,reward:'+25 🪙',coins:25,x:unseen.x,z:unseen.z,anchor:unseen.id,how:'Each new place pays once.',done:false});
  const d=a=>Math.hypot(a.x-player.x,a.z-player.z);
  return out.sort((a,b)=>(a.done-b.done)||(b.coins>0)-(a.coins>0)||d(a)-d(b));
}
