// Horse shows (Yoshi 2026-11-08, note #18): show jumping in an arena or through a wood. Follow the numbered jumps
// in order; higher jumps need more speed (the highest needs a full gallop). Judged on clean jumps and time, not just
// speed: a knocked rail or a refusal is 4 faults, and every second over the time allowed is 1 more.
// Entry needs the Show Jacket, an upgraded saddle, and a horse of the show's level. Same seed, same course.
// Built to the steeplechase's course interface (fences, checkpoints, ground, obstacles) so the riding is shared.
import {rng,hashSeed,weekKey} from './steeple-course.mjs?v=157';

export const SHOWS={
  clover:{id:'clover',name:'Clover Cup',level:3,kind:'arena',jumps:8,crowd:10,size:[64,104],fee:150,prize:[1500,900,500,200],
    blurb:'A friendly first show in the little arena, with a handful of fans on the bleachers.'},
  forest:{id:'forest',name:'Willow Wood Classic',level:6,kind:'forest',jumps:10,crowd:30,size:[150,300],fee:400,prize:[4000,2500,1500,500],
    blurb:'Logs, brush and stone walls on a winding trail through the trees. Watch the arrow!'},
  grand:{id:'grand',name:'Grand Valley Championship',level:10,kind:'arena',jumps:12,crowd:240,size:[84,140],fee:1000,prize:[12000,7000,4000,1500],
    blurb:'The big one: a long course, a full grandstand, and the toughest heights.'}};
export const SHOW_LIST=Object.values(SHOWS);
export const SHOW_OUTFIT='show',SHOW_OUTFIT_PRICE=1500;

// Jump heights: what it takes to clear them. need = ground speed in world units/s (mph ≈ 2×).
export const HEIGHTS={low:{h:.8,need:8.5,label:'low'},mid:{h:1.05,need:10.5,label:'medium'},high:{h:1.35,need:13,label:'high'}};
const ARENA_STYLES=['vertical','oxer','wall','flowers','vertical','oxer'],FOREST_STYLES=['log','brush','stonewall','log'];
const STYLE_NAME={vertical:'vertical',oxer:'oxer',wall:'painted wall',flowers:'flower box',log:'log pile',brush:'brush fence',stonewall:'stone wall'};

// Levelling (ranch.mjs level = floor(sqrt(xp/40))+1). Roughly 40–60 XP a day from care and games.
export const xpForLevel=l=>(l-1)*(l-1)*40;
export const daysToLevel=(xp,l,perDay=45)=>Math.max(0,Math.ceil((xpForLevel(l)-(xp||0))/perDay));

// What stands between this rider and a show (empty list = can enter).
// Entry fees (#34): paid each try until you've won that show's prize today; after that, rides are free practice.
// The prize pays once a day per show. Horses 15 and over are too tired to enter (riding.mjs COMPETE_MAX).
export function entryNeeds(show,{level=1,upgradedSaddle=false,hasOutfit=false,tooOld=false}={}){const out=[];
  if(tooOld)out.push({id:'age',text:'A horse under 15 years old (older horses tire too quickly for shows)'});
  if(!hasOutfit)out.push({id:'outfit',text:`Show Jacket (${SHOW_OUTFIT_PRICE.toLocaleString('en-US')} 🪙)`});
  if(!upgradedSaddle)out.push({id:'saddle',text:'An upgraded saddle on your horse'});
  if(level<show.level)out.push({id:'level',text:`Horse level ${show.level} (now ${level})`});
  return out;}

// ---------- Scoring ----------
export const timeFaults=(t,allowed)=>t>allowed?Math.ceil(t-allowed):0;
export function score({time,allowed,knockdowns=0,refusals=0}){const tf=timeFaults(time,allowed),faults=4*(knockdowns+refusals)+tf;
  return {faults,timeFaults:tf,stars:faults===0?3:faults<=4?2:faults<=8?1:0,clear:faults===0};}
// The other riders in the class (simulated, seeded per course): faults then time decide the placings.
const FIELD_NAMES=['Rosie on Biscuit','Buck on Atlas','Juniper on Comet','Dash on Pepper','Hazel on Moss','Quinn on Toffee','Ivy on Nova','Theo on Rowan','Mia on Jasper'];
export function field(show,seed,allowed){const R=rng(seed^0x5eed),n=7;let s0=0;const hard={clover:.6,forest:.9,grand:1.2}[show.id]||1,out=[];
  for(let i=0;i<n;i++){const r=R();const k=r<.42?0:r<.72?1:r<.9?2:3,knock=Math.min(3,Math.round(k*hard)),time=allowed*(.86+R()*.2);
    const pick=Math.floor(R()*FIELD_NAMES.length);if(i===0)s0=pick;// v137: one start, then in order: never the same rider twice (same random sequence as before)
    out.push({name:FIELD_NAMES[(s0+i)%FIELD_NAMES.length],...score({time,allowed,knockdowns:knock}),time});}
  return out;}
export function placings(show,seed,allowed,me){const all=[...field(show,seed,allowed),{...me,name:'You',me:true}].sort((a,b)=>a.faults-b.faults||a.time-b.time);
  const place=all.findIndex(r=>r.me)+1;return {all,place,prize:show.prize[place-1]||0};}  // only the top 4 win money (#34: fees make a sure prize for last place wrong)
export const showSeed=id=>hashSeed(`show-${id}-${weekKey()}`);

// ---------- Course ----------
function hash(cell){const m=new Map(),key=(i,j)=>i*100003+j;
  return {add(it,x0,z0,x1,z1){for(let i=Math.floor(x0/cell);i<=Math.floor(x1/cell);i++)for(let j=Math.floor(z0/cell);j<=Math.floor(z1/cell);j++){const k=key(i,j);(m.get(k)||m.set(k,[]).get(k)).push(it);}},
    near(x,z,r){const out=new Set();for(let i=Math.floor((x-r)/cell);i<=Math.floor((x+r)/cell);i++)for(let j=Math.floor((z-r)/cell);j<=Math.floor((z+r)/cell);j++)for(const it of m.get(key(i,j))||[])out.add(it);return out;}};}
function catmull(ctrl,step=1.5,closed=false){const P=closed?[ctrl.at(-1),...ctrl,ctrl[0],ctrl[1]]:[ctrl[0],...ctrl,ctrl.at(-1)],out=[];
  for(let i=1;i<P.length-2;i++){const [a,b,c,d]=[P[i-1],P[i],P[i+1],P[i+2]],n=Math.max(1,Math.round(Math.hypot(c.x-b.x,c.z-b.z)/step));
    for(let k=0;k<n;k++){const t=k/n,t2=t*t,t3=t2*t,f=(p0,p1,p2,p3)=>.5*(2*p1+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3);out.push({x:f(a.x,b.x,c.x,d.x),z:f(a.z,b.z,c.z,d.z)});}}
  if(!closed)out.push({...ctrl.at(-1)});return out;}
const turnAt=(P,i,k=6)=>{const a=P[Math.max(0,i-k)],b=P[i],c=P[Math.min(P.length-1,i+k)];let d=Math.atan2(c.x-b.x,c.z-b.z)-Math.atan2(b.x-a.x,b.z-a.z);return Math.abs(Math.atan2(Math.sin(d),Math.cos(d)));};

// Arena route: one of three classic ring shapes, every turn wide enough to ride at a canter (radius ≥ 9 m):
// a figure of eight, a big loop that spirals in, or a serpentine. Mirrored at random.
function arenaRoute(show,R){const [w,l]=show.size,zc=40+l/2,hx=w/2-8,hz=l/2-9,flip=R()<.5?-1:1,j=()=>(R()-.5)*2.4,pts=[];
  const kind=Math.floor(R()*3),E=a=>({x:flip*hx*.84*Math.sin(a),z:zc-hz*.86*Math.cos(a)});
  if(kind===0)for(let k=0;k<=24;k++){const t=k/24*Math.PI*2;pts.push({x:flip*hx*.82*Math.sin(2*t)+j()*.4,z:zc-hz*.86*Math.cos(t)});}
  else if(kind===1)for(let k=0;k<=30;k++){const u=k/30,a=-.3+u*Math.PI*2*1.45,r=.92-u*.42;pts.push({x:flip*hx*r*Math.sin(a),z:zc-hz*r*Math.cos(a)});}// a big loop spiralling in
  else for(let k=0;k<=26;k++){const u=k/26,z=zc-hz*.86+u*hz*1.72;pts.push({x:flip*hx*.8*Math.sin(u*Math.PI*2.5),z});}
  const p0=pts[0],p1=pts[1],d0=Math.hypot(p1.x-p0.x,p1.z-p0.z),q0=pts.at(-1),q1=pts.at(-2),d1=Math.hypot(q0.x-q1.x,q0.z-q1.z);
  const start={x:p0.x-(p1.x-p0.x)/d0*12,z:p0.z-(p1.z-p0.z)/d0*12},end={x:q0.x+(q0.x-q1.x)/d1*10,z:q0.z+(q0.z-q1.z)/d1*10};
  const clampP=p=>({x:Math.max(-w/2+3,Math.min(w/2-3,p.x)),z:Math.max(40-10,Math.min(40+l-3,p.z))});
  return {start:clampP(start),path:catmull([clampP(start),...pts,clampP(end)],1.2),kind:['figure of eight','big loop','serpentine'][kind]};}
// Forest trail: wanders forward through the wood in long, easy bends.
function forestRoute(show,R){const [w,l]=show.size,ctrl=[];let x=0;for(let k=0;k<=9;k++){x=Math.max(-w/2+24,Math.min(w/2-24,x+(R()-.5)*36));ctrl.push({x,z:44+k*(l-40)/9});}
  return {start:{x:ctrl[0].x,z:30},path:catmull([{x:ctrl[0].x,z:30},...ctrl],1.2),kind:'woodland trail'};}
// Tightest turn on a route, as a radius in metres (for tests and course checks).
export function minRadius(path){let r=1e9;for(let i=4;i<path.length-4;i++){const a=turnAt(path,i,3),len=Math.hypot(path[i+3].x-path[i-3].x,path[i+3].z-path[i-3].z);if(a>.02)r=Math.min(r,len/a);}return r;}

export function buildShow(showId,seed){const show=typeof showId==='object'?showId:SHOWS[showId]||SHOWS.clover,R=rng(seed),forest=show.kind==='forest';
  const {start,path,kind:shape}=forest?forestRoute(show,R):arenaRoute(show,R);
  const len=[0];for(let i=1;i<path.length;i++)len.push(len[i-1]+Math.hypot(path[i].x-path[i-1].x,path[i].z-path[i-1].z));const total=len.at(-1);
  // Jumps sit on straight bits, evenly spread, never close to another part of the route (so crossings stay open).
  const C={show,seed,kind:show.kind,shape,fences:[],checkpoints:[],path,start:{...start,h:Math.atan2(path[2].x-start.x,path[2].z-start.z)},jumps:[]};
  const clearOfRoute=(p,i)=>path.every((q,k)=>Math.abs(len[k]-len[i])<14||Math.hypot(q.x-p.x,q.z-p.z)>7.5);
  // Every straight, open spot is a candidate; then pick jumps spread evenly along the route (at least 12 m apart).
  const cand=[];for(let i=0;i<path.length-4;i++)if(len[i]>16&&len[i]<total-10&&turnAt(path,i,8)<=.28&&clearOfRoute(path[i],i))cand.push(i);
  const picks=[];for(let n=0;n<show.jumps;n++){const want=16+(total-26)*(n+.5)/show.jumps;let best=-1,bd=1e9;
    for(const i of cand){const d=Math.abs(len[i]-want);if(d<bd&&picks.every(k=>Math.abs(len[k]-len[i])>=12&&Math.hypot(path[k].x-path[i].x,path[k].z-path[i].z)>=9)){bd=d;best=i;}}
    if(best>=0)picks.push(best);}
  picks.sort((a,b)=>a-b).forEach((best,n)=>{
    const p=path[best],q=path[best+2],h=Math.atan2(q.x-p.x,q.z-p.z);
    // Run-up: straight route length before the jump decides how high it can be (high needs a long gallop in).
    let run=0;for(let k=best;k>0&&turnAt(path,k,4)<.3;k--)run=len[best]-len[k];
    const r=R(),height=run>=22&&r<.45?'high':run>=12&&r<.75?'mid':'low',style=(forest?FOREST_STYLES:ARENA_STYLES)[Math.floor(R()*4+n)%(forest?4:6)];
    const half=forest?2.8:2.3,nx=Math.cos(h),nz=-Math.sin(h);
    const f={ax:p.x-nx*half,az:p.z-nz*half,bx:p.x+nx*half,bz:p.z+nz*half,line:'j'+n,type:'show',style,height,...HEIGHTS[height],num:n+1,name:`${STYLE_NAME[style]} (${HEIGHTS[height].label})`,x:p.x,z:p.z,dir:h,pi:best};
    C.fences.push(f);C.jumps.push(f);
    const after=path[Math.min(path.length-1,best+3)];C.checkpoints.push({x:after.x,z:after.z,r:2.6,name:`Jump ${n+1}`,fence:f});});
  // Finish line after the last jump.
  const end=path.at(-1);C.checkpoints.push({x:end.x,z:end.z,r:4,name:'Finish',finish:true});
  // Time allowed: the route at a good canter, plus a little.
  C.length=total;C.timeAllowed=Math.round(total/9.2+show.jumps*.6);
  const fenceHash=hash(8);for(const f of C.fences)fenceHash.add(f,Math.min(f.ax,f.bx),Math.min(f.az,f.bz),Math.max(f.ax,f.bx),Math.max(f.az,f.bz));C.fencesNear=(x,z,r)=>fenceHash.near(x,z,r);
  // Solid things: the arena rail, wing stands beside each jump, trees in the wood. Decoration that isn't in the way is soft.
  const obs=hash(8),O=[];const add=o=>{O.push(o);const r=o.r||Math.max(o.w,o.l)/2;obs.add(o,o.x-r,o.z-r,o.x+r,o.z+r);return o;};
  for(const f of C.fences)for(const s of [-1,1])add({x:f.x+Math.cos(f.dir)*s*(forest?3.4:2.9),z:f.z-Math.sin(f.dir)*s*(forest?3.4:2.9),r:.55,kind:'wing'});
  C.deco={flowers:[],bushes:[],trees:[],planters:[]};
  for(const f of C.fences){if(forest)continue;for(const s of [-1,1]){const d=forest?4.4:3.9;C.deco.planters.push({x:f.x+Math.cos(f.dir)*s*d,z:f.z-Math.sin(f.dir)*s*d,dir:f.dir});}
    C.deco.flowers.push({x:f.x,z:f.z,dir:f.dir,w:4.2});}
  if(forest){const [w,l]=show.size;for(let n=0;n<520;n++){const x=(R()-.5)*w,z=10+R()*(l+20);if(path.some(q=>Math.hypot(q.x-x,q.z-z)<7))continue;const s=.8+R()*.7;
      C.deco.trees.push(add({x,z,r:.8*s,s,conifer:R()<.45,kind:'tree'}));}
    for(let n=0;n<120;n++){const k=Math.floor(R()*path.length),q=path[k],sd=R()<.5?-1:1,o=6+R()*3,x=q.x+sd*o,z=q.z+(R()-.5)*3;C.deco.bushes.push({x,z,r:.7+R()*.6,s:R()});}
    C.bounds={minX:-w/2,maxX:w/2,minZ:4,maxZ:l+30};}
  else{const [w,l]=show.size,z0=40,cx=0;C.bounds={minX:cx-w/2,maxX:cx+w/2,minZ:z0-14,maxZ:z0+l};
    // The arena rail: four long solid boxes (h = heading of the box's long side).
    add({x:cx,z:z0-12,h:Math.PI/2,w:.6,l:w,kind:'rail'});add({x:cx,z:z0+l,h:Math.PI/2,w:.6,l:w,kind:'rail'});
    add({x:cx-w/2,z:z0+l/2-6,h:0,w:.6,l:l+12,kind:'rail'});add({x:cx+w/2,z:z0+l/2-6,h:0,w:.6,l:l+12,kind:'rail'});
    for(let n=0;n<16;n++){const s=n%2?-1:1,z=z0+R()*l;C.deco.bushes.push({x:cx+s*(w/2-1.6),z,r:.8+R()*.5,s:R()});}}
  C.obstacles=O;C.obstaclesNear=(x,z,r)=>obs.near(x,z,r);
  // Spectators: bleachers beside the arena (or a clearing near the finish in the wood).
  {const n=show.crowd,stands=[];if(forest){const q=path[Math.floor(path.length*.82)];stands.push({x:q.x+12,z:q.z,dir:-Math.PI/2,rows:2,seats:Math.ceil(n/2)});}
   else{const [w,l]=show.size,z0=40;const per=n>40?Math.ceil(n/2):n;stands.push({x:w/2+7,z:z0+l/2,dir:-Math.PI/2,rows:n>40?8:2,seats:Math.ceil(per/(n>40?8:2))});if(n>40)stands.push({x:-w/2-7,z:z0+l/2,dir:Math.PI/2,rows:8,seats:Math.ceil(per/8)});}
   C.crowd={count:n,stands};}
  C.height=forest?(x,z)=>Math.sin(x*.035)*.9+Math.cos(z*.028)*1.1:()=>0;
  C.ground=(x,z)=>({y:C.height(x,z),factor:forest?.97:1,water:false,surface:forest?'trail':'sand'});
  C.church=C.checkpoints.at(-1);// the menu fly-over looks at the finish
  return C;}
