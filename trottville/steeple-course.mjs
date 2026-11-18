// Seeded steeplechase course. The same seed always builds the same course, so the weekly ranked course is
// shared by everyone while practice runs get a fresh seed. A course is a chain of sections; forks split into
// two routes that rejoin at the section's exit. Units match the sculpted horse (about 0.9 m each).

export const TRACK_W=7;
// need = speed (units/s) the horse must be moving to take off; h = visual height.
export const FENCES={low:{h:.72,need:9},high:{h:1.05,need:11.5}};

export function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function hashSeed(str){let h=2166136261;for(const c of String(str)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
// ISO week, e.g. "2026-W45": the ranked course changes when this does.
export function weekKey(d=new Date()){
  const t=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));const day=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-day);
  const y=t.getUTCFullYear(),w=Math.ceil(((t-Date.UTC(y,0,1))/864e5+1)/7);return `${y}-W${String(w).padStart(2,'0')}`;
}

// Heading 0 faces +z; heading grows toward +x. f = forward, r = the lateral axis used by local v.
const fwd=h=>({x:Math.sin(h),z:Math.cos(h)}),lat=h=>({x:Math.cos(h),z:-Math.sin(h)});
function frameTo(F,u,v){const f=fwd(F.h),r=lat(F.h);return {x:F.x+f.x*u+r.x*v,z:F.z+f.z*u+r.z*v};}
// Catmull-Rom through local control points, with phantom ends on the u axis so every route leaves and
// rejoins straight along the section heading. Sampled about every 2 units.
function spline(F,ctrl){
  const P=[[-10,0],...ctrl,[ctrl[ctrl.length-1][0]+10,0]],out=[];
  for(let i=1;i<P.length-2;i++){
    const [p0,p1,p2,p3]=[P[i-1],P[i],P[i+1],P[i+2]],len=Math.hypot(p2[0]-p1[0],p2[1]-p1[1]),n=Math.max(1,Math.round(len/2));
    for(let k=0;k<n;k++){const t=k/n,t2=t*t,t3=t2*t,c=(a,b,c2,d)=>.5*(2*b+(-a+c2)*t+(2*a-5*b+4*c2-d)*t2+(-a+3*b-3*c2+d)*t3);
      out.push(frameTo(F,c(p0[0],p1[0],p2[0],p3[0]),c(p0[1],p1[1],p2[1],p3[1])));}
  }
  const e=ctrl[ctrl.length-1];out.push(frameTo(F,e[0],e[1]));return out;
}
function nearestIndex(pts,p){let best=0,bd=1e9;pts.forEach((q,i)=>{const d=(q.x-p.x)**2+(q.z-p.z)**2;if(d<bd){bd=d;best=i;}});return best;}
function fenceAt(route,F,u,v,type){
  const pts=route.pts,i=Math.min(pts.length-2,Math.max(1,nearestIndex(pts,frameTo(F,u,v)))),a=pts[i-1],b=pts[i+1],L=Math.hypot(b.x-a.x,b.z-a.z);
  const f={x:pts[i].x,z:pts[i].z,tx:(b.x-a.x)/L,tz:(b.z-a.z)/L,hw:TRACK_W/2+.6,type,...FENCES[type],index:i};
  route.fences.push(f);return f;
}

// Each builder gets the entry frame and returns routes (+ hazards). All of them end at local (L,0).
const SECTIONS={
  straight(F,R){const L=80+R()*15,w=(R()-.5)*14,r={kind:'main',pts:spline(F,[[0,0],[L*.25,w],[L*.5,0],[L,0]]),fences:[]};
    fenceAt(r,F,L*(.72+R()*.1),0,R()<.5?'low':'high');return {L,routes:[r]};},
  double(F,R){const L=115,r={kind:'main',pts:spline(F,[[0,0],[L,0]]),fences:[]};fenceAt(r,F,42,0,'low');fenceAt(r,F,88,0,'high');return {L,routes:[r]};},
  rocks(F,R){const L=85,w=(R()-.5)*10,r={kind:'main',pts:spline(F,[[0,0],[L*.35,w],[L*.7,-w],[L,0]]),fences:[]},rocks=[];
    // Staggered rows so there is always a gap to weave through.
    for(let u=16,side=R()<.5?1:-1;u<L-14;u+=9+R()*3,side*=-1){const p=r.pts[nearestIndex(r.pts,frameTo(F,u,0))],i=r.pts.indexOf(p),q=r.pts[Math.min(i+1,r.pts.length-1)],o=r.pts[Math.max(i-1,0)];
      const tx=q.x-o.x,tz=q.z-o.z,tl=Math.hypot(tx,tz)||1,off=side*(1+R()*1.6);rocks.push({x:p.x+tz/tl*off,z:p.z-tx/tl*off,r:.9+R()*.5});}
    return {L,routes:[r],rocks};},
  pond(F,R,s){const L=100,short={kind:'short',pts:spline(F,[[0,0],[25,0],[50,0],[75,0],[L,0]]),fences:[]},
      long={kind:'long',pts:spline(F,[[0,0],[18,s*12],[42,s*25],[66,s*25],[84,s*12],[L,0]]),fences:[]};
    fenceAt(long,F,56,s*25,R()<.5?'low':'high');const c=frameTo(F,50,0);return {L,routes:[short,long],ponds:[{x:c.x,z:c.z,r:7.5}]};},
  bridge(F,R,s){const L=100,short={kind:'short',pts:spline(F,[[0,0],[25,0],[42,s*9],[55,s*9],[68,s*9],[85,0],[L,0]]),fences:[]},
      long={kind:'long',pts:spline(F,[[0,0],[16,-s*11],[40,-s*22],[55,-s*22],[70,-s*22],[86,-s*11],[L,0]]),fences:[]};
    fenceAt(long,F,32,-s*19,'low');
    const stream=[];for(let v=-44;v<=44;v+=4)stream.push(frameTo(F,55+Math.sin(v*.13)*2,v));
    const f=fwd(F.h),b1=frameTo(F,55,s*9),b2=frameTo(F,55,-s*22);
    return {L,routes:[short,long],streams:[{pts:stream,w:7}],bridges:[{x:b1.x,z:b1.z,tx:f.x,tz:f.z,len:10,w:3.2},{x:b2.x,z:b2.z,tx:f.x,tz:f.z,len:10,w:6.5}]};},
  barn(F,R,s){const L=100,tight={kind:'short',pts:spline(F,[[0,0],[22,0],[32,s*10],[66,s*10],[78,0],[L,0]]),fences:[]},
      wide={kind:'long',pts:spline(F,[[0,0],[16,-s*12],[40,-s*24],[70,-s*24],[86,-s*12],[L,0]]),fences:[]};
    // The tight route's fence comes right after its turn: short, but you need to keep your speed through it.
    fenceAt(tight,F,41,s*10,'high');fenceAt(wide,F,58,-s*24,'low');
    const c=frameTo(F,50,-s*1),rocks=[];for(const [u,v] of [[30,s*14.5],[52,s*14.8],[60,s*5.8]]){const p=frameTo(F,u,v);rocks.push({x:p.x,z:p.z,r:1.1});}
    return {L,routes:[tight,wide],barns:[{x:c.x,z:c.z,h:F.h,w:12,l:20}],rocks};}
};

export function buildCourse(seed){
  const R=rng(seed),C={seed,routes:[],sections:[],checkpoints:[],fences:[],ponds:[],streams:[],bridges:[],rocks:[],barns:[]};
  let F={x:0,z:0,h:0},heading=0;
  const main=(pts)=>{const r={kind:'main',pts,fences:[]};C.routes.push(r);C.sections.push({routes:[r]});return r;};
  const straightPts=(L)=>{const pts=[];for(let u=0;u<=L;u+=2)pts.push(frameTo(F,u,0));return pts;};
  const advance=L=>{F={...frameTo(F,L,0),h:F.h};};
  main(straightPts(40));advance(40);
  // Every kind once, then a couple of extras; order shuffled by the seed.
  const kinds=['straight','pond','bridge','barn','rocks','double',...['straight','pond','barn'].sort(()=>R()-.5).slice(0,1+Math.floor(R()*2))];
  for(let i=kinds.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[kinds[i],kinds[j]]=[kinds[j],kinds[i]];}
  kinds.forEach((kind,n)=>{
    // Turn between sections; steer back toward the start heading so the course never loops into itself.
    const want=(R()*.6+.35)*(Math.abs(heading)>.9?-Math.sign(heading):(R()<.5?-1:1)),rad=32+R()*12,steps=Math.max(3,Math.round(Math.abs(want)*rad/2));
    const arc=[{x:F.x,z:F.z}];for(let k=0;k<steps;k++){F.h+=want/steps;const f=fwd(F.h);F={x:F.x+f.x*Math.abs(want)*rad/steps,z:F.z+f.z*Math.abs(want)*rad/steps,h:F.h};arc.push({x:F.x,z:F.z});}
    heading+=want;main(arc);
    const s=R()<.5?1:-1,sec=SECTIONS[kind](F,R,s);
    for(const r of sec.routes)C.routes.push(r);
    C.sections.push({kind,routes:sec.routes});
    for(const k of ['ponds','streams','bridges','rocks','barns'])if(sec[k])C[k].push(...sec[k]);
    advance(sec.L);C.checkpoints.push({x:F.x,z:F.z,tx:Math.sin(F.h),tz:Math.cos(F.h),hw:30,label:kind});
  });
  main(straightPts(46));const fin=frameTo(F,36,0);C.finish={x:fin.x,z:fin.z,tx:Math.sin(F.h),tz:Math.cos(F.h),hw:TRACK_W/2+2};
  C.checkpoints.push({x:fin.x,z:fin.z,tx:Math.sin(F.h),tz:Math.cos(F.h),hw:TRACK_W/2+8,label:'finish'});
  C.start={x:0,z:8,h:0};
  for(const r of C.routes)C.fences.push(...r.fences);
  let minX=1e9,maxX=-1e9,minZ=1e9,maxZ=-1e9;for(const r of C.routes)for(const p of r.pts){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z);}
  C.bounds={minX,maxX,minZ,maxZ};
  // Segment list for on-track tests.
  C.segments=[];for(const r of C.routes)for(let i=1;i<r.pts.length;i++)C.segments.push([r.pts[i-1],r.pts[i]]);
  // Decorative trees on the grass, kept clear of every track and hazard.
  C.trees=[];const pad=40;
  for(let tries=0;C.trees.length<240&&tries<4000;tries++){
    const p={x:minX-pad+R()*(maxX-minX+pad*2),z:minZ-pad+R()*(maxZ-minZ+pad*2)};
    if(distToTrack(C,p)<TRACK_W/2+5)continue;
    if(C.ponds.some(o=>Math.hypot(o.x-p.x,o.z-p.z)<o.r+4)||C.barns.some(b=>Math.hypot(b.x-p.x,b.z-p.z)<16))continue;
    if(C.streams.some(s=>s.pts.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<7)))continue;
    C.trees.push({x:p.x,z:p.z,r:.9,s:.8+R()*.7});
  }
  return C;
}

export function segDist(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,L=dx*dx+dz*dz||1;let t=((p.x-a.x)*dx+(p.z-a.z)*dz)/L;t=Math.max(0,Math.min(1,t));return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);}
export function distToTrack(C,p){let d=1e9;for(const [a,b] of C.segments){if(Math.abs(a.x-p.x)>d+4&&Math.abs(a.z-p.z)>d+4)continue;d=Math.min(d,segDist(p,a,b));}return d;}

// Straight run-up before a fence on its route (units), for the fairness check.
export function runUp(route,f){let len=0;for(let i=f.index;i>1;i--){const a=route.pts[i-2],b=route.pts[i-1],c=route.pts[i];
  const h1=Math.atan2(b.x-a.x,b.z-a.z),h2=Math.atan2(c.x-b.x,c.z-b.z);let d=Math.abs(h2-h1);if(d>Math.PI)d=Math.PI*2-d;
  if(d>.12)break;len+=Math.hypot(c.x-b.x,c.z-b.z);}return len;}
