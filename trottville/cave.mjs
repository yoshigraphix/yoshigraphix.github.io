// Smugglers' Grotto (note #29): the cave inside Cloudstep, entered on foot at the old stone arch.
// Pure rules + level data, no Three.js. A side-on (2.5D) platformer: the rider runs along a course `s` (metres)
// that curls round the cave wall and then out along an old timber beam over the lake, with height `y`.
// Ropes to climb, ropes to swing on, and a long rope that lowers you onto the pirate ship on the island.
// Tested in tests/cave-check.mjs.

export const R=20;              // course radius round the cave (centre = the island)
export const BEND=62;           // s where the course leaves the wall and runs out along the beam
export const WATER=-6;          // lake surface; deep, so falling in = back to the last checkpoint
export const DECK=-3.5;         // pirate ship deck height
export const G=22,RUN=4.6,JUMP=7.6,CLIMB=2.6,COYOTE=.12;
export const MAX_FALL=6.5;      // landing after a drop taller than this hurts: back to the checkpoint

// Platforms: [s0,s1,top,checkpoint?]. Gaps ≤2.6 m and steps ≤1.1 m are plain jumps.
export const PLATFORMS=[
  [-4,6,0,true],          // cave mouth ledge
  [8,10.6,.4],
  [12.8,15,1.2],
  [17.2,20.2,.8,true],
  [21.4,25,5,true],       // reached by the climbing rope
  [27,28.4,5.5],
  [30.6,32,4.9],
  [34,37,5,true],         // swing gap ahead
  [45,49,5,true],         // second swing (two ropes) ahead
  [58,63,4.5,true],       // corner: the beam leaves the wall here
  [65,68,4.5],
  [70.4,73,4.9],
  [75.2,78,4.5,true],     // end of the beam, high over the ship
  [70,92,DECK,false,'deck'] // pirate ship deck (only reachable down the rope)
];
// Climbing ropes: s, bottom y, top y. Push up/down to climb; jump to let go.
export const CLIMBS=[{id:'wall',s:20.75,y0:1.1,y1:5.6},{id:'dangle',s:78.7,y0:DECK+.4,y1:5.2,long:true}];
// Swinging ropes: pivot (s,y), length. Grab one in the air; it swings; jump to let go.
export const SWINGS=[{id:'s1',s:39.4,y:11.5,L:5.6},{id:'s2',s:50.4,y:11.5,L:5.6},{id:'s3',s:55.2,y:12,L:5.6}];
export const CABIN={s:90,door:89.2};   // walk into the cabin door on the deck
export const COURSE_END=92;

// Course → cave XZ. Clockwise round the wall (so the camera, outside the ring, keeps the lake behind you),
// then straight in toward the island along the beam.
const A0=0;
export function coursePoint(s){
  if(s<=BEND){const a=A0-s/R;return {x:Math.cos(a)*R,z:Math.sin(a)*R,tx:Math.sin(a),tz:-Math.cos(a)};}
  const a=A0-BEND/R,d=s-BEND,ox=Math.cos(a),oz=Math.sin(a);
  return {x:ox*(R-d),z:oz*(R-d),tx:-ox,tz:-oz};
}
// Side the camera sits on (left of travel, so +s runs left-to-right on screen).
export const sideOf=p=>({x:-p.tz,z:p.tx});

const platAt=(s,tol=0)=>PLATFORMS.filter(p=>s>=p[0]-tol&&s<=p[1]+tol);
export function groundUnder(s,y){let best=null;for(const p of platAt(s,.18))if(p[2]<=y+.05&&(best==null||p[2]>best))best=p[2];return best;}
function wallBlock(s0,s1,y){// moving from s0 to s1: stopped by the side of a platform whose top is above our feet
  for(const p of PLATFORMS){if(p[2]<=y+.05||p[4]==='deck')continue;
    if(s0<=p[0]-.18&&s1>p[0]-.18)return p[0]-.2;if(s0>=p[1]+.18&&s1<p[1]+.18)return p[1]+.2;}
  return null;}

export function newRun(checkpoint=0){const p=PLATFORMS.filter(q=>q[3])[checkpoint]||PLATFORMS[0];
  return {s:Math.min(p[1]-.6,p[0]+1.2),y:p[2],vs:0,vy:0,mode:'ground',face:1,cp:checkpoint,air:0,peak:p[2],rope:null,theta:0,omega:0,grabLock:0,falls:0,t:0,done:false,events:[]};}
const cpIndex=top=>PLATFORMS.filter(q=>q[3]).indexOf(top);

// One physics step. input = {x:-1..1 (along the course), y:-1..1 (climb up/down), jump:bool (pressed this step)}
export function step(st,input,dt){
  dt=Math.min(dt,.05);st.t+=dt;st.events=[];const ix=Math.max(-1,Math.min(1,input.x||0)),iy=Math.max(-1,Math.min(1,input.y||0));
  if(ix)st.face=ix>0?1:-1;st.grabLock=Math.max(0,st.grabLock-dt);
  if(st.done)return st;
  if(st.mode==='climb'){const r=st.rope;st.y=Math.max(r.y0,Math.min(r.y1,st.y+iy*CLIMB*dt));st.s=r.s;
    if(input.jump){st.mode='air';st.vy=JUMP*.75;st.vs=(ix||st.face)*RUN;st.grabLock=.35;st.peak=st.y;st.rope=null;st.events.push('jump');return st;}
    // top of the wall rope: step onto the ledge you push toward
    if(st.y>=r.y1-.05&&ix){const top=groundUnder(r.s+ix*.9,st.y+.4);if(top!=null&&top<=st.y+.5){st.mode='ground';st.y=top;st.s=r.s+ix*.9;st.rope=null;st.peak=top;land(st,top);return st;}}
    // bottom of the long rope: drop onto the deck
    if(st.y<=r.y0+.01&&iy<0){const top=groundUnder(r.s,st.y);if(top!=null){st.mode='ground';st.y=top;st.rope=null;st.peak=top;land(st,top);}}
    return st;}
  if(st.mode==='swing'){const r=st.rope;st.omega+=(-(G/r.L)*Math.sin(st.theta)+ix*1.6*Math.cos(st.theta))*dt;st.omega*=1-.12*dt;st.theta+=st.omega*dt;
    st.theta=Math.max(-1.25,Math.min(1.25,st.theta));st.s=r.s+Math.sin(st.theta)*r.L;st.y=r.y-Math.cos(st.theta)*r.L;
    if(input.jump){const v=st.omega*r.L;st.mode='air';st.vs=Math.cos(st.theta)*v*1.05;st.vy=Math.sin(st.theta)*v+JUMP*.55;st.grabLock=.4;st.peak=st.y;st.rope=null;st.events.push('release');}
    return st;}
  // ground / air
  const target=ix*RUN;
  if(st.mode==='ground'){st.vs=target;st.air=0;
    if(input.jump){st.mode='air';st.vy=JUMP;st.peak=st.y;st.events.push('jump');}}
  else{st.air+=dt;// air control: steer toward the stick, but keep swing momentum
    const k=Math.abs(st.vs)>RUN?1.2:7;st.vs+=(target-st.vs)*Math.min(1,k*dt);
    if(input.jump&&st.air<COYOTE&&st.vy<=0){st.vy=JUMP;st.events.push('jump');}
    st.vy-=G*dt;}
  let ns=st.s+st.vs*dt;const wb=wallBlock(st.s,ns,st.y);if(wb!=null){ns=wb;st.vs=0;}
  ns=Math.max(-3.6,Math.min(COURSE_END-.4,ns));
  if(st.mode==='ground'){const top=groundUnder(ns,st.y);if(top==null||top<st.y-.05){st.mode='air';st.vy=0;st.air=0;st.peak=st.y;}else st.y=top;st.s=ns;}
  else{const ny=st.y+st.vy*dt;st.peak=Math.max(st.peak,ny);
    if(st.vy<=0){const top=groundUnder(ns,st.y);if(top!=null&&ny<=top){st.s=ns;st.y=top;st.vy=0;st.mode='ground';land(st,top);return st;}}
    st.s=ns;st.y=ny;
    if(!st.grabLock){// grab a rope we pass through
      for(const c of CLIMBS)if(Math.abs(st.s-c.s)<.45&&st.y>=c.y0-.3&&st.y<=c.y1+.9){st.mode='climb';st.rope=c;st.vy=0;st.vs=0;st.y=Math.max(c.y0,Math.min(c.y1,st.y));st.events.push('grab');return st;}
      for(const w of SWINGS){const dx=st.s-w.s,dy=w.y-st.y,d=Math.hypot(dx,dy);
        if(d<=w.L+.25&&d>=w.L*.45&&Math.abs(dx)<1.1){st.mode='swing';st.rope=w;st.theta=Math.atan2(dx,dy);st.omega=st.vs/w.L*.9;st.events.push('grab');return st;}}}
    if(st.y<WATER+.2){st.events.push('splash');respawn(st);}}
  if(st.mode==='ground'&&Math.abs(st.s-CABIN.door)<.5&&st.y<=DECK+.1){st.done=true;st.events.push('cabin');}
  return st;
}
function land(st,top){const drop=st.peak-top;
  if(drop>MAX_FALL){st.events.push('ouch');respawn(st);return;}
  st.events.push('land');const p=PLATFORMS.find(q=>q[3]&&q[2]===top&&st.s>=q[0]-.2&&st.s<=q[1]+.2);
  if(p){const i=cpIndex(p);if(i>st.cp){st.cp=i;st.events.push('checkpoint');}}}
function respawn(st){const n=newRun(st.cp);n.falls=st.falls+1;n.t=st.t;n.events=st.events;Object.assign(st,n);}

// Reward: the ship's chest holds 100 Trotties once a day (the treasure "washes back in" overnight).
export const REWARD=100,CAVE_KEY='trottville-cave-v1';
export function normalizeCave(raw){const r=raw&&typeof raw==='object'?raw:{};
  return {paidOn:typeof r.paidOn==='string'?r.paidOn:'',finds:Math.max(0,Math.floor(+r.finds||0)),best:Number.isFinite(+r.best)&&+r.best>0?+r.best:null};}
export function openChest(cave,dateKey,seconds){const c=normalizeCave(cave);
  const best=c.best==null||seconds<c.best?Math.round(seconds*10)/10:c.best;
  if(c.paidOn===dateKey)return {coins:0,cave:{...c,best},already:true};
  return {coins:REWARD,cave:{paidOn:dateKey,finds:c.finds+1,best},already:false};}
