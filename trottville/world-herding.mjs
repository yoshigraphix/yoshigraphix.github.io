// Herd It Through the Grapevine: ride your horse to steer skittish foals into a small pen. Pure rules (no
// Three.js), shared by the 3D world (world-stations.js) and tests. Foals graze and wander; when you come close
// they trot away from you, so you herd by riding round behind them. The pen is open on its east side; a foal
// that walks in stays in (the gate swings shut behind it).
export const PADDOCK={x:-36,z:4,r:22};
export const PEN={x0:-50,x1:-44,z0:0,z1:8};
export const FOALS=4,SCARE=8,FLEE_SPEED=5.6,WANDER_SPEED=1.1;
// The pen's three fences as world-logic box obstacles (the east side stays open).
export const PEN_FENCES=[{kind:'box',x:(PEN.x0+PEN.x1)/2,z:PEN.z1,hx:(PEN.x1-PEN.x0)/2+.2,hz:.2,height:1.4},{kind:'box',x:(PEN.x0+PEN.x1)/2,z:PEN.z0,hx:(PEN.x1-PEN.x0)/2+.2,hz:.2,height:1.4},{kind:'box',x:PEN.x0,z:(PEN.z0+PEN.z1)/2,hx:.2,hz:(PEN.z1-PEN.z0)/2,height:1.4}];
export const inPen=(x,z,m=0)=>x>PEN.x0+m&&x<PEN.x1-m&&z>PEN.z0+m&&z<PEN.z1-m;

// Foals start in open grass only (Yoshi 2026-11-12: one spawned wedged between the hay bales and a cart, where you
// couldn't get it out): a spot is used only if a rider could ride all the way round it (ROOM metres clear).
export const ROOM=1.8;
const nearPen=(x,z)=>x>PEN.x0-1&&x<PEN.x1+4&&z>PEN.z0-2&&z<PEN.z1+2;
// ...and on the pen's side of every fence: a 1 m grid flood-filled from the pen mouth with a rider's width, so a foal
// never starts behind a fence you would have to herd it round.
export function reachable(blocked){const g=1,R=PADDOCK.r+8,n=Math.ceil(R*2/g),ok=new Uint8Array(n*n),cell=(x,z)=>{const i=Math.round((x-PADDOCK.x+R)/g),j=Math.round((z-PADDOCK.z+R)/g);return i>=0&&j>=0&&i<n&&j<n?j*n+i:-1;};
  const start=cell(PEN.x1+3,(PEN.z0+PEN.z1)/2),q=[start];ok[start]=1;
  while(q.length){const c=q.pop(),i=c%n,j=(c/n)|0;for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=i+di,b=j+dj;if(a<0||b<0||a>=n||b>=n)continue;const k=b*n+a;if(ok[k])continue;
    const x=PADDOCK.x-R+a*g,z=PADDOCK.z-R+b*g;if(blocked(x,z,.7)||inPen(x,z,-.5))continue;ok[k]=1;q.push(k);}}
  return (x,z)=>{const c=cell(x,z);return c>=0&&ok[c]===1;};}
export function newRound(rand=Math.random,blocked=()=>false){const foals=[],reach=reachable(blocked);
  for(let i=0;i<FOALS;i++){let x,z;for(let k=0;k<40;k++){const a=-1.1+i*.75+(rand()-.5)*(.3+k*.08),d=9+rand()*8;x=PADDOCK.x+4+Math.cos(a)*d;z=PADDOCK.z+Math.sin(a)*d*.8;
      if(!inPen(x,z,-1)&&!blocked(x,z,ROOM)&&reach(x,z)&&foals.every(f=>Math.hypot(f.x-x,f.z-z)>2.5))break;}
    foals.push({id:i,x,z,heading:rand()*Math.PI*2,speed:0,penned:false,wander:rand()*3});}
  return {foals,time:0,done:false};}

// One step for one foal. blocked(x,z,r) is the world's collision test (fences, buildings, rocks).
export function stepFoal(f,player,dt,rand=Math.random,blocked=()=>false){
  if(f.penned){// Inside: mill about gently, never leave.
    f.wander-=dt;if(f.wander<0){f.heading+=(rand()-.5)*2.4;f.wander=1+rand()*2;}f.speed=.5;
    f.x=Math.min(PEN.x1-.7,Math.max(PEN.x0+.7,f.x+Math.sin(f.heading)*f.speed*dt));f.z=Math.min(PEN.z1-.7,Math.max(PEN.z0+.7,f.z+Math.cos(f.heading)*f.speed*dt));return f;}
  const dx=f.x-player.x,dz=f.z-player.z,d=Math.hypot(dx,dz);let want=f.heading,speed;
  if(player.mounted&&d<SCARE){want=Math.atan2(dx,dz);speed=FLEE_SPEED*(1-d/SCARE*.45);}// trot away from you
  else{f.wander-=dt;if(f.wander<0){f.heading+=(rand()-.5)*1.8;f.wander=1.5+rand()*3;}want=f.heading;speed=f.wander>1.2?WANDER_SPEED:0;}// graze and amble
  // Stay in the paddock: lean back toward the middle near its edge.
  const cx=PADDOCK.x-f.x,cz=PADDOCK.z-f.z;
  // Only while grazing: when you're herding a foal it goes where you push it (Yoshi: "almost like they had a hard
  // radius they couldnt move beyond"); it only turns back if pushed far out of the paddock.
  const edge=d<SCARE&&player.mounted?PADDOCK.r*1.5:PADDOCK.r*.8;
  if(Math.hypot(cx,cz)>edge){const home=Math.atan2(cx,cz),k=Math.min(1,(Math.hypot(cx,cz)-edge)/(PADDOCK.r*.2));want=blend(want,home,k*.9);}
  // Find a free direction near the one wanted (round fences, never through them).
  for(const turn of [0,.5,-.5,1,-1,1.6,-1.6,2.4,-2.4,Math.PI]){const h=want+turn,nx=f.x+Math.sin(h)*speed*dt,nz=f.z+Math.cos(h)*speed*dt;
    // Away from the pen, a foal keeps out of tight corners (hay stacks, carts, buildings) that a rider couldn't get
    // behind; one already in a tight spot may move anywhere free, so it can always come back out.
    if(!blocked(nx,nz,.45)&&(nearPen(nx,nz)||!blocked(nx,nz,1.2)||blocked(f.x,f.z,1.2))){f.heading=h;f.x=nx;f.z=nz;break;}}
  f.speed=speed;if(inPen(f.x,f.z,.4))f.penned=true;return f;}
const blend=(a,b,t)=>{const d=Math.atan2(Math.sin(b-a),Math.cos(b-a));return a+d*t;};

export function stepRound(r,player,dt,rand=Math.random,blocked){if(r.done)return r;r.time+=dt;for(const f of r.foals)stepFoal(f,player,dt,rand,blocked);r.done=r.foals.every(f=>f.penned);return r;}
export const pennedCount=r=>r.foals.filter(f=>f.penned).length;
// Trotties: about 10 a minute of play; a quick round pays more (max 2×), never less than 10.
export function herdReward(seconds){return Math.max(10,Math.min(40,Math.round(20*60/Math.max(30,seconds)/5)*5));}
