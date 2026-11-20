// Valley life (2026-11-10, Yoshi: "this is supposed to be a land filled with horses"). Pure rules, no Three.js;
// world-life.js draws and moves them.
//  · HERDS graze in open pastures all over the valley: mares, geldings and the odd foal at its mother's side. They
//    wander, graze with their heads down, and now and then the whole herd trots or canters off together. At night
//    they doze.
//  · TRAIL RIDERS ride loops between the places by day (they go home at night).
//  · THE NOON DERBY: every game day at high noon (real :15 past each hour) six horses race four laps of Clover
//    Racecourse. They walk out to the start a minute early; riders nearby hear about it.
import {rng,BREEDS,makeCoat,newHorse} from './ranch.mjs?v=162';
import {R} from './world-regions.mjs?v=162';
import {inWater} from './world-content.mjs?v=162';

// Open grass checked against the world's obstacles (radius 9+ clear, away from places, the maze and Cloudstep).
export const PASTURES=[
  {id:'clover',name:'Clover Meadow',x:60,z:-6,r:12,n:5},
  {id:'sunset',name:'Sunset Fields',x:-12,z:-54,r:12,n:5},
  {id:'willow',name:'Willow Flats',x:-78,z:24,r:11,n:4},
  {id:'north',name:'North Pasture',x:36,z:72,r:10,n:4},
  {id:'range',name:'Eastern Range',x:140,z:212,r:13,n:6},
  {id:'shore',name:'Seaglass Grass',x:-96,z:251,r:9,n:3},
  {id:'orchard',name:'Orchard Run',x:18,z:-68,r:9,n:3},
];
export const SIMPLE_PASTURES=4;// phones on simple graphics get the first four herds

// Trail loops (waypoints near places; world-life.js routes between them round fences and buildings).
export const TRAILS=[
  [{x:13,z:19},{x:26,z:-16},{x:4,z:-21},{x:-16,z:-6},{x:-21,z:24}],
  [{x:24,z:40},{x:9,z:60},{x:-18,z:45},{x:-44,z:28},{x:-60,z:36},{x:-34,z:40}],
];
export const RIDERS=[{trail:0,at:0,gait:'walk'},{trail:0,at:.5,gait:'trot'},{trail:1,at:0,gait:'trot'},{trail:1,at:.45,gait:'walk'}];
export const SPEED={stand:0,walk:1.7,trot:3.8,canter:7.5,gallop:10.5};

// Clover Racecourse: the same four gates the lap races use, run anticlockwise.
export const TRACK=[{x:45,z:25},{x:68,z:25},{x:68,z:50},{x:45,z:50}].map(p=>R(p.x,p.z));   // moved to Clover Downs
const seg=TRACK.map((a,i)=>{const b=TRACK[(i+1)%TRACK.length];return {a,b,len:Math.hypot(b.x-a.x,b.z-a.z)};});
export const TRACK_LEN=seg.reduce((s,q)=>s+q.len,0);
const TRACK_C={x:TRACK.reduce((s,p)=>s+p.x,0)/4,z:TRACK.reduce((s,p)=>s+p.z,0)/4};
// A point d metres round the track, `lane` metres outside the gate line (lane 0 = on it).
export function trackPoint(d,lane=0){d=((d%TRACK_LEN)+TRACK_LEN)%TRACK_LEN;let i=0;while(d>seg[i].len){d-=seg[i].len;i++;}
  const {a,b,len}=seg[i],f=d/len,x=a.x+(b.x-a.x)*f,z=a.z+(b.z-a.z)*f,ux=(b.x-a.x)/len,uz=(b.z-a.z)/len;
  let nx=uz,nz=-ux;if((x-TRACK_C.x)*nx+(z-TRACK_C.z)*nz<0){nx=-nx;nz=-nz;}// outward normal
  return {x:x+nx*lane,z:z+nz*lane,yaw:Math.atan2(ux,uz)};}

export const DERBY={laps:4,runners:6,minute:15,parade:1,cooldown:3};// starts at :15, walk-out a minute before
const SILKS=[['#c8423b','#f6d55c'],['#2f6fb0','#ffffff'],['#2f8f4e','#f2b632'],['#7b4bb3','#f3e6ff'],['#e07b2a','#2b2b2b'],['#e6e1d3','#c8423b']];
const DERBY_NAMES=['Clover Comet','Buttercup Blaze','Moonpie','Thunder Hooves','Sir Gallops','Daisy Dash','Pepper Jack','Whirlwind Wren','Maple Rocket','Biscuit','Lucky Lark','Copper Penny'];

// The six runners for one hour's derby: names, silks, a top speed each and a finishing time, all from the hour.
export function derbyField(hourKey){const r=rng('derby:'+hourKey),names=[...DERBY_NAMES];const field=[];
  for(let i=0;i<DERBY.runners;i++){const name=names.splice(Math.floor(r()*names.length),1)[0];
    const top=10+r()*1.4,surge=r(),fast=BREEDS.filter(x=>!x.wild&&(x.group==='riding'||x.group==='sport')),b=fast[Math.floor(r()*fast.length)]||BREEDS[0];
    field.push({i,name,breed:b.id,silk:SILKS[i][0],trim:SILKS[i][1],top,surge,seed:'derby-'+hourKey+'-'+i});}
  return field;}
// Distance run after t seconds of racing: a quick start, a steady middle, each horse's own late surge.
export function derbyDistance(h,t){if(t<=0)return 0;const accel=Math.min(t,3),d0=.5*(h.top/3)*accel*accel;const base=d0+Math.max(0,t-3)*h.top*.94;
  const lateStart=TRACK_LEN*DERBY.laps*.62,late=Math.max(0,base-lateStart);return base+late*(h.surge-.5)*.16;}
export function derbyFinishTime(h){const goal=TRACK_LEN*DERBY.laps;let lo=0,hi=120;for(let k=0;k<40;k++){const m=(lo+hi)/2;if(derbyDistance(h,m)>=goal)hi=m;else lo=m;}return hi;}
export function derbyResult(field){return field.map(h=>({...h,time:derbyFinishTime(h)})).sort((a,b)=>a.time-b.time);}

// Where the derby is for a moment: 'off' | 'parade' (walking out, 1 min) | 'race' (seconds since the off) | 'done'.
export function derbyPhase(d=new Date()){const m=d.getMinutes()+d.getSeconds()/60+d.getMilliseconds()/60000;
  const key=`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}-${d.getHours()}`;
  if(m>=DERBY.minute-DERBY.parade&&m<DERBY.minute)return {phase:'parade',key,left:(DERBY.minute-m)*60};
  if(m>=DERBY.minute&&m<DERBY.minute+DERBY.cooldown)return {phase:'race',key,t:(m-DERBY.minute)*60};
  return {phase:'off',key};}

// The horses of one pasture, the same for everyone every day. One in three herds has a foal (it follows horse 0).
export function herdHorses(p){const r=rng('herd:'+p.id),out=[];const pool=BREEDS.filter(b=>!b.wild);
  for(let i=0;i<p.n;i++){const b=p.id==='range'&&r()<.5?BREEDS.find(x=>x.id==='mustang')||pool[0]:pool[Math.floor(r()*pool.length)],seed=`herd-${p.id}-${i}`;
    const h=newHorse({breed:b.id,name:'',seed,ageMonths:36+Math.floor(r()*120),coat:makeCoat(b.id,seed)});h.id='npc-'+seed;out.push({data:h,breed:b.id,foal:false,ang:r()*6.283,rad:Math.sqrt(r())*p.r*.8});}
  if(r()<.4){const mom=out[0].breed,seed=`herd-${p.id}-foal`;const h=newHorse({breed:mom,name:'',seed,ageMonths:4,coat:makeCoat(mom,seed)});h.id='npc-'+seed;out.push({data:h,breed:mom,foal:true,ang:0,rad:0});}
  return out;}

// A wandering goal inside a pasture.
export function pastureSpot(p,r=Math.random){for(let k=0;k<8;k++){const a=r()*Math.PI*2,d=Math.sqrt(r())*p.r*.85,x=p.x+Math.cos(a)*d,z=p.z+Math.sin(a)*d;if(!inWater(x,z,1.5))return {x,z};}return {x:p.x,z:p.z};}   // never a goal in a river or pond (v105)

// A seeded horse for an NPC rider (same coat every visit).
export function npcHorse(seed,breed){const h=newHorse({breed,name:'',seed,coat:makeCoat(breed,seed)});h.id='npc-'+seed;return h;}
