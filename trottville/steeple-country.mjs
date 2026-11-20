// Open-country steeplechase: get from the village to the church steeple any way you like. A seeded countryside of
// rolling hills, a village of cottages, farms, woods, a stream with two bridges, lanes, and farm fences (rail fences,
// stone walls, hedges) dividing the fields. No fixed track: grass is full speed, lanes are a touch faster, crops,
// ploughed fields, woods and water are slower. Same seed, same countryside (the weekly ranked course).
import {rng,segDist} from './steeple-course.mjs?v=162';
export {hashSeed,weekKey} from './steeple-course.mjs?v=162';

export const W=420,LEN=780;
export const FENCE_TYPES={rail:{h:.95,need:9.5,name:'rail fence'},wall:{h:.8,need:9,name:'stone wall'},hedge:{h:1.25,need:11.5,name:'hedge'}};
export const FIELD_SPEED={pasture:1,meadow:1,crop:.85,plough:.75,village:1,yard:1};
const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};

function catmull(ctrl,step=2){
  const P=[ctrl[0],...ctrl,ctrl[ctrl.length-1]],out=[];
  for(let i=1;i<P.length-2;i++){const [p0,p1,p2,p3]=[P[i-1],P[i],P[i+1],P[i+2]],n=Math.max(1,Math.round(Math.hypot(p2.x-p1.x,p2.z-p1.z)/step));
    for(let k=0;k<n;k++){const t=k/n,t2=t*t,t3=t2*t,c=(a,b,c2,d)=>.5*(2*b+(-a+c2)*t+(2*a-5*b+4*c2-d)*t2+(-a+3*b-3*c2+d)*t3);
      out.push({x:c(p0.x,p1.x,p2.x,p3.x),z:c(p0.z,p1.z,p2.z,p3.z)});}}
  out.push({...ctrl[ctrl.length-1]});return out;
}
// Where segment ab crosses segment cd: t along ab, or null.
export function segX(ax,az,bx,bz,cx,cz,dx,dz){
  const rx=bx-ax,rz=bz-az,sx=dx-cx,sz=dz-cz,den=rx*sz-rz*sx;if(Math.abs(den)<1e-9)return null;
  const t=((cx-ax)*sz-(cz-az)*sx)/den,u=((cx-ax)*rz-(cz-az)*rx)/den;return t>=0&&t<=1&&u>=0&&u<=1?t:null;
}
// Bucketed lookup so physics only tests what's nearby.
function hash(cell){
  const m=new Map(),key=(i,j)=>i*100003+j;
  return {add(item,x0,z0,x1,z1){for(let i=Math.floor(x0/cell);i<=Math.floor(x1/cell);i++)for(let j=Math.floor(z0/cell);j<=Math.floor(z1/cell);j++){const k=key(i,j);let a=m.get(k);if(!a)m.set(k,a=[]);a.push(item);}},
    near(x,z,r){const out=new Set();for(let i=Math.floor((x-r)/cell);i<=Math.floor((x+r)/cell);i++)for(let j=Math.floor((z-r)/cell);j<=Math.floor((z+r)/cell);j++){const a=m.get(key(i,j));if(a)for(const it of a)out.add(it);}return out;}};
}

export function buildCountry(seed){
  const R=rng(seed),C={seed,W,LEN,fences:[],gates:[],houses:[],barns:[],church:null,mill:null,oak:null,trees:[],bushes:[],sheep:[],rocks:[],woods:[],lanes:[],bridges:[],ponds:[],checkpoints:[],circles:[],boxes:[]};
  const ph=[...Array(6)].map(()=>R()*Math.PI*2),side=R()<.5?-1:1;
  const village={x:(R()-.5)*70,z:62},church={x:(R()-.5)*170,z:LEN-48};
  const mill={x:side*(55+R()*85),z:235+R()*45},oak={x:-side*(45+R()*95),z:545+R()*45};
  Object.assign(C,{village,start:{x:village.x,z:village.z,h:0}});

  // ---- Stream (west to east) and the height field: hills, a valley for the stream, a flat village ----
  const sz=372+R()*30,sa=16+R()*12,sf=.011+R()*.008,sp=R()*6,streamZ=x=>sz+sa*Math.sin(x*sf+sp);
  C.streamZ=streamZ;C.stream={pts:[],w:9};for(let x=-W/2-160;x<=W/2+160;x+=4)C.stream.pts.push({x,z:streamZ(x)});
  const bump=(p,h,r,x,z)=>h*Math.exp(-((x-p.x)**2+(z-p.z)**2)/(r*r));
  const rawH=(x,z)=>{
    const rolling=4.6*Math.sin(x*.016+ph[0])*Math.sin(z*.012+ph[1])+2.6*Math.sin(x*.035+z*.021+ph[2])+2*Math.sin(z*.043+ph[3])+1.2*Math.sin(x*.08+ph[4])*Math.sin(z*.07+ph[5]);
    const flat=smooth(48,115,Math.hypot(x-village.x,z-village.z));
    const hills=bump(mill,13,58,x,z)+bump(church,10,62,x,z)+bump(oak,6,42,x,z);
    const valley=-4.2*Math.exp(-(((z-streamZ(x))/15)**2));
    return 4+rolling*flat+hills+valley*(.4+.6*flat);
  };
  C.waterY=x=>rawH(x,streamZ(x))+.5;

  // ---- Lanes: a main lane village → bridge → church, a spur to the mill, and a second lane over the other bridge ----
  const bx=(R()-.5)*110,b2x=-side*(115+R()*50);
  const mainCtrl=[{x:village.x,z:village.z+6},{x:village.x+(R()-.5)*50,z:150},{x:mill.x*.3+(R()-.5)*40,z:255},{x:bx,z:streamZ(bx)-16},{x:bx,z:streamZ(bx)+16},
    {x:bx+(R()-.5)*50,z:sz+95},{x:(church.x+oak.x)*.3+(R()-.5)*40,z:590},{x:church.x,z:LEN-82}];
  const main=catmull(mainCtrl);C.lanes.push(main);
  const fork=main[main.findIndex(p=>p.z>165)]||main[10];
  C.lanes.push(catmull([fork,{x:(fork.x+mill.x)/2,z:(fork.z+mill.z)/2-12},{x:mill.x,z:mill.z-14}]));
  C.lanes.push(catmull([{x:village.x-side*12,z:village.z+10},{x:village.x-side*55,z:150},{x:b2x*.85,z:270},{x:b2x,z:streamZ(b2x)-16},{x:b2x,z:streamZ(b2x)+16},{x:(b2x+oak.x)/2,z:470},{x:oak.x,z:oak.z-14}]));
  const laneSegs=hash(20);for(const L of C.lanes)for(let i=1;i<L.length;i++){const a=L[i-1],b=L[i];laneSegs.add([a,b],Math.min(a.x,b.x),Math.min(a.z,b.z),Math.max(a.x,b.x),Math.max(a.z,b.z));}
  const laneDist=(x,z)=>{let d=1e9;for(const [a,b] of laneSegs.near(x,z,14))d=Math.min(d,segDist({x,z},a,b));return d;};
  C.laneDist=laneDist;
  for(const x of [bx,b2x]){const dz=sa*sf*Math.cos(x*sf+sp),L=Math.hypot(1,dz),tx=-dz/L,tz=1/L,z=streamZ(x);
    C.bridges.push({x,z,tx,tz,len:20,w:6.5,y:Math.max(rawH(x-tx*10,z-tz*10),rawH(x+tx*10,z+tz*10))+.25});}

  // ---- Checkpoints: the windmill, the old oak, then the church steeple (finish) ----
  C.checkpoints=[{x:mill.x,z:mill.z-15,r:11,name:'Windmill'},{x:oak.x,z:oak.z-13,r:11,name:'Old oak'},{x:church.x,z:church.z-26,r:12,name:'Church steeple',finish:true}];
  C.mill=mill;C.oak=oak;C.church=church;

  // ---- Fields: a jittered grid; every edge may carry a farm fence ----
  const z0=132,z1=LEN-116,rows=9,cols=7,cw=W/cols,rh=(z1-z0)/rows,V=[];
  for(let i=0;i<=cols;i++){V[i]=[];for(let j=0;j<=rows;j++){const edgeX=i===0||i===cols;V[i][j]={x:-W/2+i*cw+(edgeX?0:(R()-.5)*22),z:z0+j*rh+(R()-.5)*(j===0||j===rows?6:20)};}}
  const types=['pasture','pasture','pasture','meadow','crop','plough'];
  C.fields=[];for(let i=0;i<cols;i++)for(let j=0;j<rows;j++)C.fields.push({i,j,type:types[Math.floor(R()*types.length)],poly:[V[i][j],V[i+1][j],V[i+1][j+1],V[i][j+1]],ang:R()*Math.PI});
  const fieldOf=(x,z)=>{if(z<z0||z>z1)return null;const i=Math.min(cols-1,Math.max(0,Math.floor((x+W/2)/cw))),j=Math.min(rows-1,Math.max(0,Math.floor((z-z0)/rh)));return C.fields[i*rows+j];};
  C.fieldOf=fieldOf;

  const keepClear=[...C.checkpoints.map(c=>({x:c.x,z:c.z,r:16})),{x:mill.x,z:mill.z,r:12},{x:oak.x,z:oak.z,r:12},{x:church.x,z:church.z,r:34}];
  const fenceHash=hash(24);let line=0;
  const edges=[];
  for(let j=0;j<=rows;j++)for(let i=0;i<cols;i++)edges.push([V[i][j],V[i+1][j],j===0||j===rows?.95:.82]);
  for(let i=1;i<cols;i++)for(let j=0;j<rows;j++)edges.push([V[i][j],V[i][j+1],.6]);
  for(const [A,B,p] of edges){
    if(R()>p)continue;
    const L=Math.hypot(B.x-A.x,B.z-A.z),gaps=[],type=R()<.42?'rail':R()<.55?'wall':'hedge';
    // Lanes pass through open gates; the stream and the checkpoint clearings cut the fence too.
    for(const ln of C.lanes)for(let k=1;k<ln.length;k++){const t=segX(A.x,A.z,B.x,B.z,ln[k-1].x,ln[k-1].z,ln[k].x,ln[k].z);if(t!==null){gaps.push([t*L-3.4,t*L+3.4]);C.gates.push({x:A.x+(B.x-A.x)*t,z:A.z+(B.z-A.z)*t,tx:(B.x-A.x)/L,tz:(B.z-A.z)/L,w:6.8,open:true,type});}}
    for(let k=1;k<C.stream.pts.length;k++){const a=C.stream.pts[k-1],b=C.stream.pts[k],t=segX(A.x,A.z,B.x,B.z,a.x,a.z,b.x,b.z);if(t!==null)gaps.push([t*L-8,t*L+8]);}
    for(const c of keepClear){const d=segDist(c,A,B);if(d<c.r){const t=((c.x-A.x)*(B.x-A.x)+(c.z-A.z)*(B.z-A.z))/(L*L),w=Math.sqrt(c.r*c.r-d*d);gaps.push([t*L-w,t*L+w]);}}
    // A field gate somewhere along a third of the fences: the safe, slow way through.
    if(R()<.34){const t=(.2+R()*.6)*L;gaps.push([t-3.4,t+3.4]);C.gates.push({x:A.x+(B.x-A.x)*t/L,z:A.z+(B.z-A.z)*t/L,tx:(B.x-A.x)/L,tz:(B.z-A.z)/L,w:6.8,open:true,type});}
    gaps.sort((a,b)=>a[0]-b[0]);let s=0;const pieces=[];
    for(const [g0,g1] of gaps){if(g0-s>1.5)pieces.push([s,g0]);s=Math.max(s,g1);}if(L-s>1.5)pieces.push([s,L]);
    const id=line++;
    for(const [u0,u1] of pieces){const f={ax:A.x+(B.x-A.x)*u0/L,az:A.z+(B.z-A.z)*u0/L,bx:A.x+(B.x-A.x)*u1/L,bz:A.z+(B.z-A.z)*u1/L,type,line:id,...FENCE_TYPES[type]};
      C.fences.push(f);fenceHash.add(f,Math.min(f.ax,f.bx),Math.min(f.az,f.bz),Math.max(f.ax,f.bx),Math.max(f.az,f.bz));}
  }
  C.fencesNear=(x,z,r)=>fenceHash.near(x,z,r);
  // Run-up strips: every ~30 units along each fence, a clear 6-wide, 26-long strip on both sides, square to the fence.
  // Nothing solid is placed in them, so every fence can be met at speed however busy the field around it is.
  C.runways=[];const runHash=hash(20);
  for(const f of C.fences){const L=Math.hypot(f.bx-f.ax,f.bz-f.az),tx=(f.bx-f.ax)/L,tz=(f.bz-f.az)/L,nx=-tz,nz=tx;
    for(let u=Math.min(6,L/2);u<=L-Math.min(6,L/2)+.01;u+=30){const cx=f.ax+tx*u,cz=f.az+tz*u;
      for(const s of [-1,1]){const r={x:cx+nx*s*13,z:cz+nz*s*13,ux:nx,uz:nz,len:26,w:6};C.runways.push(r);runHash.add(r,r.x-14,r.z-14,r.x+14,r.z+14);}}}
  const inRunway=(x,z,m)=>{for(const r of runHash.near(x,z,m+2)){const dx=x-r.x,dz=z-r.z,u=dx*r.ux+dz*r.uz,v=dx*r.uz-dz*r.ux;if(Math.abs(u)<r.len/2+m&&Math.abs(v)<r.w/2+m)return true;}return false;};

  // ---- Obstacles: everything solid is a circle or a box in one hash ----
  const obs=hash(16);
  const addCircle=c=>{C.circles.push(c);obs.add(c,c.x-c.r,c.z-c.r,c.x+c.r,c.z+c.r);return c;};
  const addBox=b=>{C.boxes.push(b);const r=Math.hypot(b.w,b.l)/2;obs.add(b,b.x-r,b.z-r,b.x+r,b.z+r);return b;};
  C.obstaclesNear=(x,z,r)=>obs.near(x,z,r);
  const inStream=(x,z,m)=>Math.abs(z-streamZ(x))<5+m;
  const blockedAt=(x,z,m)=>{for(const o of obs.near(x,z,m+12)){if(o.w){const dx=x-o.x,dz=z-o.z,c=Math.cos(o.h),s=Math.sin(o.h),u=dx*s+dz*c,v=dx*c-dz*s;if(Math.abs(u)<o.l/2+m&&Math.abs(v)<o.w/2+m)return true;}else if(Math.hypot(o.x-x,o.z-z)<o.r+m)return true;}return false;};
  const nearFence=(x,z,m)=>{for(const f of fenceHash.near(x,z,m+2))if(segDist({x,z},{x:f.ax,z:f.az},{x:f.bx,z:f.bz})<m)return true;return false;};
  const free=(x,z,r,{lane=4,fence=1.5}={})=>Math.abs(x)<W/2-4&&z>8&&z<LEN-6&&laneDist(x,z)>r+lane&&!inStream(x,z,r)&&!C.checkpoints.some(c=>Math.hypot(c.x-x,c.z-z)<c.r+3+r)&&
    Math.hypot(x-village.x,z-village.z)>20+r&&!blockedAt(x,z,r+.6)&&!nearFence(x,z,r+fence)&&!inRunway(x,z,r);
  C.free=free;

  addCircle({x:mill.x,z:mill.z,r:4.8,kind:'mill'});addCircle({x:oak.x,z:oak.z,r:1.8,kind:'oak'});
  C.church={...church,h:0};addBox({x:church.x,z:church.z,h:0,w:12,l:26,kind:'church'});
  // Village: cottages around the green, facing in; a duck pond and a well.
  const pondA=R()*Math.PI*2;C.ponds.push({x:village.x+Math.sin(pondA)*34,z:Math.max(30,village.z+Math.cos(pondA)*34),r:7});
  for(const p of C.ponds)addCircle({x:p.x,z:p.z,r:p.r,kind:'pond',soft:true});
  const roofs=['#b5523b','#6b4a3a','#8c5a7a','#4f6f8a','#a86f3c','#c9a25a'],walls=['#f6ead2','#fff6e8','#f3d9c4','#e8eef0','#f7e6b5','#e9d6c0'];
  for(let k=0,tries=0;k<17&&tries<500;tries++){
    const a=R()*Math.PI*2,rad=30+R()*58,x=village.x+Math.sin(a)*rad,z=village.z+Math.cos(a)*rad*.9;
    if(z<12||z>z0-6||Math.abs(x)>W/2-10||laneDist(x,z)<8||blockedAt(x,z,7)||C.ponds.some(p=>Math.hypot(p.x-x,p.z-z)<p.r+8))continue;
    const h=Math.atan2(village.x-x,village.z-z);addBox({x,z,h,w:7+R()*2.5,l:6+R()*2,kind:'house',wall:walls[Math.floor(R()*walls.length)],roof:roofs[Math.floor(R()*roofs.length)]});k++;
  }
  addCircle({x:village.x+(R()<.5?-1:1)*14,z:village.z+10,r:1.3,kind:'well'});
  // Farms: a farmhouse and a red barn in a few fields.
  for(let k=0,tries=0;k<7&&tries<300;tries++){const f=C.fields[Math.floor(R()*C.fields.length)],cx=(f.poly[0].x+f.poly[2].x)/2,cz=(f.poly[0].z+f.poly[2].z)/2;
    const h=R()*Math.PI,hx=cx+Math.cos(h)*14,hz=cz-Math.sin(h)*14;if(!free(cx,cz,9,{fence:3})||!free(hx,hz,5,{fence:3}))continue;
    addBox({x:cx,z:cz,h,w:12,l:16,kind:'barn'});addBox({x:hx,z:hz,h,w:8,l:7,kind:'house',wall:walls[Math.floor(R()*walls.length)],roof:roofs[Math.floor(R()*roofs.length)]});k++;}
  // Woods: patches of trees to weave through (slower going).
  for(let k=0,tries=0;k<5&&tries<90;tries++){const x=(R()-.5)*(W-80),z=z0+30+R()*(z1-z0-60),r=24+R()*16;
    if(laneDist(x,z)<r*.6||C.checkpoints.some(c=>Math.hypot(c.x-x,c.z-z)<r+14))continue;C.woods.push({x,z,r});k++;
    for(let n=0;n<r*r*.09;n++){const a=R()*Math.PI*2,d=Math.sqrt(R())*r,tx=x+Math.sin(a)*d,tz=z+Math.cos(a)*d;if(free(tx,tz,.9,{lane:2,fence:1.2})&&!C.circles.some(t=>t.kind==='tree'&&Math.hypot(t.x-tx,t.z-tz)<5.2))
      C.trees.push(addCircle({x:tx,z:tz,r:.85,kind:'tree',conifer:R()<.5,s:.8+R()*.6}));}}
  for(let n=0;n<240;n++){const x=(R()-.5)*(W-12),z=10+R()*(LEN-20);if(free(x,z,1,{fence:2}))C.trees.push(addCircle({x,z,r:.95,kind:'tree',conifer:R()<.25,s:.9+R()*.7}));}
  // Bushes: clumps that get in the way; ride round them.
  for(let n=0;n<230;n++){const x=(R()-.5)*(W-12),z=20+R()*(LEN-40),k=2+Math.floor(R()*5);
    for(let m=0;m<k;m++){const bx2=x+(R()-.5)*7,bz=z+(R()-.5)*7,r=1.1+R()*1;if(free(bx2,bz,r,{fence:.6}))C.bushes.push(addCircle({x:bx2,z:bz,r,kind:'bush',s:R()}));}}
  for(let n=0;n<70;n++){const x=(R()-.5)*(W-12),z=20+R()*(LEN-40),r=.7+R()*.9;if(free(x,z,r))C.rocks.push(addCircle({x,z,r,kind:'rock'}));}
  // Sheep graze in the pastures (they won't move, so go round).
  for(let n=0,tries=0;n<60&&tries<800;tries++){const x=(R()-.5)*(W-20),z=z0+R()*(z1-z0),f=fieldOf(x,z);if(f?.type!=='pasture'||!free(x,z,.9))continue;C.sheep.push(addCircle({x,z,r:.9,kind:'sheep',h:R()*6.28}));n++;}

  // A hamlet of cottages along the main lane, past the stream.
  {const pts=C.lanes[0].filter(p=>p.z>sz+60&&p.z<LEN-150);
    for(let k=0,tries=0;k<6&&tries<200&&pts.length;tries++){const p=pts[Math.floor(R()*pts.length)],sd=R()<.5?-1:1,off=10+R()*10,x=p.x+sd*off,z=p.z+(R()-.5)*8;
      if(!free(x,z,6,{fence:3}))continue;addBox({x,z,h:Math.atan2(p.x-x,p.z-z),w:7+R()*2,l:6+R()*2,kind:'house',wall:walls[Math.floor(R()*walls.length)],roof:roofs[Math.floor(R()*roofs.length)]});k++;}}
  // Field ponds (wet, slow, not solid), round hay bales in rows, haystacks, fallen logs.
  for(let k=0,tries=0;k<4&&tries<80;tries++){const x=(R()-.5)*(W-60),z=z0+20+R()*(z1-z0-40),r=5+R()*4;if(!free(x,z,r,{fence:3}))continue;const p={x,z,r};C.ponds.push(p);addCircle({...p,kind:'pond',soft:true});k++;}
  C.bales=[];for(let n=0;n<28;n++){const x=(R()-.5)*(W-30),z=z0+R()*(z1-z0),a=R()*Math.PI,k=2+Math.floor(R()*4);
    for(let m=0;m<k;m++){const bx2=x+Math.sin(a)*m*2.8,bz=z+Math.cos(a)*m*2.8;if(free(bx2,bz,1.1))C.bales.push(addCircle({x:bx2,z:bz,r:1.1,kind:'bale',a}));}}
  C.stacks=[];for(let n=0;n<10;n++){const x=(R()-.5)*(W-30),z=z0+R()*(z1-z0);if(free(x,z,2.2,{fence:3}))C.stacks.push(addCircle({x,z,r:2.2,kind:'haystack'}));}
  C.logs=[];for(let n=0;n<26;n++){const x=(R()-.5)*(W-20),z=20+R()*(LEN-40),h=R()*Math.PI;if(free(x,z,3))C.logs.push(addBox({x,z,h,w:1,l:5.5+R()*2,kind:'log'}));}
  C.wells=C.circles.filter(c=>c.kind==='well');

  // ---- Ground queries ----
  const inBridge=(x,z)=>{for(const b of C.bridges){const dx=x-b.x,dz=z-b.z,u=dx*b.tx+dz*b.tz,v=dx*b.tz-dz*b.tx;if(Math.abs(u)<b.len/2&&Math.abs(v)<b.w/2)return b;}return null;};
  C.height=rawH;
  C.ground=(x,z)=>{
    const b=inBridge(x,z);if(b)return {y:b.y,factor:1.05,water:false,surface:'bridge'};
    const y=rawH(x,z);
    if(Math.abs(z-streamZ(x))<4)return {y,factor:.38,water:true,surface:'stream'};
    for(const p of C.ponds)if(Math.hypot(p.x-x,p.z-z)<p.r)return {y,factor:.45,water:true,surface:'pond'};
    if(laneDist(x,z)<3)return {y,factor:1.05,water:false,surface:'lane'};
    for(const w of C.woods)if(Math.hypot(w.x-x,w.z-z)<w.r)return {y,factor:.72,water:false,surface:'woods'};
    const f=fieldOf(x,z);return {y,factor:f?FIELD_SPEED[f.type]:1,water:false,surface:f?f.type:'grass'};
  };
  C.bounds={minX:-W/2,maxX:W/2,minZ:0,maxZ:LEN};
  // Scenery trees beyond the boundary (not solid; riders can't reach them).
  C.border=[];for(let n=0;n<220;n++){const a=R(),x=a<.5?(R()<.5?-1:1)*(W/2+8+R()*120):(R()-.5)*(W+240),z=a<.5?R()*LEN:(R()<.5?-8-R()*90:LEN+8+R()*90);C.border.push({x,z,conifer:R()<.4,s:1+R()*.8});}
  return C;
}

// ---- Route planner for the computer rider: A* on a 4-unit grid, cost = time across the ground, fences cost extra ----
export function planRoute(C,from,to,R=Math.random){
  const S=4,GW=Math.ceil(W/S),GH=Math.ceil(LEN/S);
  if(!C._cost){
    const cost=new Float32Array(GW*GH);
    for(let j=0;j<GH;j++)for(let i=0;i<GW;i++){const x=-W/2+(i+.5)*S,z=(j+.5)*S;let blocked=false;
      for(const o of C.obstaclesNear(x,z,14)){if(o.soft)continue;if(o.w){const dx=x-o.x,dz=z-o.z,c=Math.cos(o.h),s=Math.sin(o.h),u=dx*s+dz*c,v=dx*c-dz*s;if(Math.abs(u)<o.l/2+1.8&&Math.abs(v)<o.w/2+1.8){blocked=true;break;}}
        else if(Math.hypot(o.x-x,o.z-z)<o.r+1.9){blocked=true;break;}}
      cost[j*GW+i]=blocked?Infinity:1/C.ground(x,z).factor;}
    for(const f of C.fences){const L=Math.hypot(f.bx-f.ax,f.bz-f.az),n=Math.ceil(L/1.5),seen=new Set();
      for(let k=0;k<=n;k++){const x=f.ax+(f.bx-f.ax)*k/n,z=f.az+(f.bz-f.az)*k/n,i=Math.floor((x+W/2)/S),j=Math.floor(z/S),id=j*GW+i;if(i<0||j<0||i>=GW||j>=GH||seen.has(id))continue;seen.add(id);cost[id]+=f.type==='hedge'?5:3.5;}}
    C._cost=cost;
  }
  const base=C._cost,p1=R()*6,p2=R()*6,noise=(i,j)=>1+.18*(Math.sin(i*.21+p1)+Math.sin(j*.17+p2));
  const idx=(x,z)=>Math.min(GH-1,Math.max(0,Math.floor(z/S)))*GW+Math.min(GW-1,Math.max(0,Math.floor((x+W/2)/S)));
  const start=idx(from.x,from.z),goal=idx(to.x,to.z),gi=goal%GW,gj=Math.floor(goal/GW);
  const g=new Float32Array(GW*GH).fill(Infinity),came=new Int32Array(GW*GH).fill(-1),heap=[];
  const push=(n,f)=>{heap.push([f,n]);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p][0]<=heap[i][0])break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p;}};
  const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===i)break;[heap[m],heap[i]]=[heap[i],heap[m]];i=m;}}return top;};
  const h=n=>Math.hypot(n%GW-gi,Math.floor(n/GW)-gj)*.95;
  g[start]=0;push(start,h(start));
  const D=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.414],[1,-1,1.414],[-1,1,1.414],[-1,-1,1.414]];
  while(heap.length){const [,n]=pop();if(n===goal)break;const i=n%GW,j=Math.floor(n/GW);
    for(const [di,dj,dl] of D){const a=i+di,b=j+dj;if(a<0||b<0||a>=GW||b>=GH)continue;const m=b*GW+a,c=base[m];if(c===Infinity)continue;
      const ng=g[n]+dl*c*noise(a,b);if(ng<g[m]){g[m]=ng;came[m]=n;push(m,ng+h(m));}}}
  if(came[goal]<0&&goal!==start)return null;
  const cells=[];for(let n=goal;n>=0;n=came[n]){cells.push(n);if(n===start)break;}cells.reverse();
  let pts=cells.map(n=>({x:-W/2+(n%GW+.5)*S,z:(Math.floor(n/GW)+.5)*S}));
  // Light smoothing (keeps it off obstacle corners less than a cell).
  for(let pass=0;pass<2;pass++)pts=pts.map((p,i)=>i===0||i===pts.length-1?p:{x:(pts[i-1].x+p.x*2+pts[i+1].x)/4,z:(pts[i-1].z+p.z*2+pts[i+1].z)/4});
  pts.push({x:to.x,z:to.z});return pts;
}
