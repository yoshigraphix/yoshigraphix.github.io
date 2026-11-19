// Endless ground: the land is built in 64-unit chunks around the player and dropped behind them, so the
// world never ends. Each chunk is two meshes: faceted ground (vertex colours) and everything standing on it
// (trees, cacti, snowmen, rocks, road ribbons), baked into one geometry so a phone draws few objects.
// The valley's own scenery still lives in world.js / world-expansion.js; chunks only add ground there.
import {groundHeight} from './world-logic.mjs?v=161';
import {BIOMES,biomeAt,wildness,mountainMask,roadDistance,roadX,roadZ,ROAD_EVERY,ROAD_HALF,rng,noise} from './world-wild.mjs?v=161';
import {cloudstepAt,CLOUDSTEP,trailRadius} from './world-cloudstep.mjs?v=161';
import {POND,riverAt,mountainLift} from './world-content.mjs?v=161';
import {LAKE,inSnow} from './world-town.mjs?v=161';
import {gridNormals} from './world-terrain.js?v=161';
// Cloudstep has its own finer mesh (world-cloudstep-3d.js): chunk ground there sinks out of sight, and nothing is scattered on it.
const onMountain=(x,z)=>{const s=cloudstepAt(x,z);return !!s&&s.h!=null&&s.region!=='foot';};
// Where Cloudstep's own mesh reaches (its foot ring, as world-cloudstep-3d.js builds it). Chunk ground only sinks
// where that mesh covers the vertex and every neighbour, or the sunk slope shows as a pit (2026-11-13: a hole by
// the trailhead you could ride into).
const covered=(x,z)=>{const dx=x-CLOUDSTEP.cx,dz=z-CLOUDSTEP.cz,TAU=Math.PI*2;let t=(Math.atan2(dz,dx)-CLOUDSTEP.theta0)%TAU;if(t<0)t+=TAU;return Math.hypot(dx,dz)<Math.min(trailRadius(t-TAU),CLOUDSTEP.R0-CLOUDSTEP.W)-.3;};
const nearMountain=(x,z)=>Math.hypot(x-CLOUDSTEP.cx,z-CLOUDSTEP.cz)<CLOUDSTEP.R0+8;

export const CHUNK=64;
// v111 (Yoshi: "less low poly, a little more realistic"): prettier trees. Smooth, lumpy leaf clumps shaded darker
// underneath and inside, lighter on top, with leafy dapple; a tapered trunk with a root flare and two branches; a
// sway weight per vertex (0 at the roots → 1 at the crown top) for the wind shader. bakeTree() appends to plain arrays
// so many trees merge into one smooth mesh (treeGeometry). kind: 'round' (6 clumps) | 'wild' (4, for far chunks).
let _tk=null;
function treeKit(T){if(_tk)return _tk;const ico=new T.IcosahedronGeometry(1,1),fruit=new T.IcosahedronGeometry(1,0);
  const trunk=new T.CylinderGeometry(.22,.32,1,7,3).toNonIndexed(),branch=new T.CylinderGeometry(.07,.12,1,5,1).toNonIndexed();
  const arr=g=>({p:g.attributes.position.array,n:g.attributes.normal.array});_tk={ico:arr(ico),fruit:arr(fruit),trunk:arr(trunk),branch:arr(branch)};return _tk;}
const _c1={r:0,g:0,b:0},_c2={r:0,g:0,b:0};
function hexRGB(hex,o){const n=parseInt(hex.slice(1),16);o.r=((n>>16)&255)/255;o.g=((n>>8)&255)/255;o.b=(n&255)/255;o.r*=o.r;o.g*=o.g;o.b*=o.b;return o;}
const TREE_CLUMPS=(()=>{const mk=(n,top)=>{const L=[[0,3.55,0,1.55]];for(let k=0;k<n;k++){const a=k/n*Math.PI*2+.4;L.push([Math.cos(a)*1.3,3.05+.35*Math.sin(a*2.3),Math.sin(a)*1.3,1.12+.12*Math.cos(a*3)]);}
  for(let k=0;k<top;k++){const a=k/top*Math.PI*2+1.1;L.push([Math.cos(a)*.6,4.35+.2*k%2,Math.sin(a)*.6,1.0]);}return L;};return {round:mk(6,3),wild:mk(4,1)};})();
export function bakeTree(T,out,x,y,z,s,pal,seed=0,kind='round',fruitHex=null){const K=treeKit(T),P=out.p,N=out.n,C=out.c,W=out.w;
  const rot=seed*2.399,cr=Math.cos(rot),sr=Math.sin(rot),rx=(px,pz)=>[px*cr-pz*sr,px*sr+pz*cr];
  const dark=hexRGB(pal[0],_c1),light=hexRGB(pal[pal.length-1],_c2);
  const put=(px,py,pz,nx,ny,nz,r,g,b,w)=>{P.push(px,py,pz);N.push(nx,ny,nz);C.push(r,g,b);W.push(w);};
  // trunk: root flare at the bottom, darker toward the ground
  {const a=K.trunk,H=2.9*s;for(let i=0;i<a.p.length;i+=3){let px=a.p[i],py=a.p[i+1],pz=a.p[i+2];const t=py+.5,fl=1+.7*Math.max(0,.3-t)/.3;px*=fl*s;pz*=fl*s;
      const k=.62+.38*t+.05*Math.sin(px*40+py*23);put(x+px,y+t*H,z+pz,a.n[i],a.n[i+1]*.3,a.n[i+2],.36*k,.24*k,.15*k,0);}}
  // two branches reaching up and out into the crown
  for(const [ang,h,len] of [[.6,1.9,1.7],[3.6,2.2,1.5]]){const a=K.branch,A=ang+rot,ca=Math.cos(A),sa=Math.sin(A),tilt=.75,ct=Math.cos(tilt),st=Math.sin(tilt);
    for(let i=0;i<a.p.length;i+=3){const lx=a.p[i]*s,ly=(a.p[i+1]+.5)*len*s,lz=a.p[i+2]*s;const yx=lx,yy=ly*ct-lz*st,yz=ly*st+lz*ct;const wx=yx*ca+yz*sa,wz=-yx*sa+yz*ca;
      put(x+wx,y+h*s+yy,z+wz,a.n[i],a.n[i+1],a.n[i+2],.33,.22,.14,.25+.4*(a.p[i+1]+.5));}}
  // leaf clumps
  const clumps=TREE_CLUMPS[kind]||TREE_CLUMPS.round,a=K.ico,sd=seed*1.7+.3;
  clumps.forEach(([ox,oy,oz,r],ci)=>{const [cx,cz]=rx(ox*s,oz*s),cy=oy*s,R=r*s,ol=Math.hypot(ox,oy-3.5,oz)||1;
    for(let i=0;i<a.p.length;i+=3){const dx=a.p[i],dy=a.p[i+1],dz=a.p[i+2];
      const n1=Math.sin(dx*3.1+sd+ci)*Math.sin(dy*2.7+sd*1.3)*Math.sin(dz*3.3+sd*.7),n2=Math.sin(dx*7.3+dz*5.1+sd*2+ci*1.7);
      const rr=R*(1+.2*n1+.08*n2),px=cx+dx*rr,py=cy+dy*rr*.9,pz=cz+dz*rr;
      const inward=(dx*ox+(dy)*(oy-3.5)+dz*oz)/ol;let t=.5+.5*dy;t=t*t*(3-2*t);t=Math.min(1,Math.max(0,t*.85+.02+.18*inward+.12*n2));
      const dap=.92+.16*Math.sin(dx*13+dy*11+dz*17+sd*5);
      put(x+px,y+py,z+pz,dx+.15*n1,dy+.1,dz+.15*n2,(dark.r+(light.r-dark.r)*t)*dap,(dark.g+(light.g-dark.g)*t)*dap,(dark.b+(light.b-dark.b)*t)*dap,Math.min(1,Math.max(.2,(py/s-2.2)/2.6)));}});
  if(fruitHex){const f=hexRGB(fruitHex,{r:0,g:0,b:0}),b=K.fruit;for(let k=0;k<7;k++){const ang=k*.9+rot,fr=1.5*s,fx=Math.cos(ang)*fr,fz=Math.sin(ang)*fr,fy=(2.9+(k%3)*.55)*s;
    for(let i=0;i<b.p.length;i+=3)put(x+fx+b.p[i]*.16,y+fy+b.p[i+1]*.16,z+fz+b.p[i+2]*.16,b.n[i],b.n[i+1],b.n[i+2],f.r,f.g,f.b,.8);}}}
export function treeGeometry(T,out){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(out.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(out.n,3));g.normalizeNormals();
  g.setAttribute('color',new T.Float32BufferAttribute(out.c,3));g.setAttribute('sway',new T.Float32BufferAttribute(out.w,1));g.computeBoundingSphere();return g;}
export const treeOut=()=>({p:[],n:[],c:[],w:[]});
const SNOW_GROUND=['#eef2f4','#e4eaee','#f4f6f7','#dde5ea'];   // Snowy Pines (world-town.mjs SNOW)
const VALLEY_GRASS=['#8fba76','#94bf7b','#9bc77e','#a3ca83','#8db975'];

export const TREE_PALS=[['#2f5a33','#5a8c4a','#8fbd62'],['#8a6424','#c49a3e','#e2c062'],['#94505f','#cc7f8c','#e8a6a8']];
export function createChunks({T,scene,simple=false,material,propMaterial=material,treeMaterial=null}){
  const SEGS=simple?10:28,RING=simple?2:3;
  const ground=new T.Group(),props=new T.Group();scene.add(ground,props);
  const chunks=new Map(),col=new T.Color(),mtx=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),v=new T.Vector3(),sc=new T.Vector3(),pos=new T.Vector3();
  const shapes={box:new T.BoxGeometry(1,1,1),ico:new T.IcosahedronGeometry(1,0),soft:new T.IcosahedronGeometry(1,1),cone:new T.ConeGeometry(1,1,7),cone4:new T.ConeGeometry(1,1,4),cyl:new T.CylinderGeometry(1,1,1,7),disc:new T.CircleGeometry(1,14).rotateX(-Math.PI/2)};
  const raw=Object.fromEntries(Object.entries(shapes).map(([k,g])=>[k,g.toNonIndexed().attributes.position.array]));
  const colour=(hex,arr)=>{col.set(hex);arr.push(col.r,col.g,col.b);};

  // ---- ground ----
  function groundColour(x,z,y,r){const w=wildness(x,z);
    {const rv=riverAt(x,z);if(rv.r&&rv.d<rv.r.w/2+1.7)return ['#cdbb8e','#c4b183','#d6c79f'][Math.floor(r()*3)];const lift=mountainLift(x,z);if(lift>2.5)return y>21+noise(x*.1,z*.1,5)*3?'#f5f7f9':lift>14?['#a4a698','#9a9d90','#aeb0a2'][Math.floor(r()*3)]:['#7fa06a','#86a872','#789862'][Math.floor(r()*3)];}
    if(w<.5)return y>3?'#a4af96':inSnow(x,z)?SNOW_GROUND[Math.floor(r()*SNOW_GROUND.length)]:VALLEY_GRASS[Math.floor(r()*VALLEY_GRASS.length)];
    const b=biomeAt(x,z),m=mountainMask(x,z);
    if(y>19+noise(x*.1,z*.1,5)*4)return b==='desert'?'#efe3cf':'#f5f7f9';
    if(m>.32)return b==='desert'?['#c99a72','#bf8f69'][Math.floor(r()*2)]:b==='snow'?['#c9d2d8','#d9e1e6'][Math.floor(r()*2)]:['#a4a698','#9a9d90','#aeb0a2'][Math.floor(r()*3)];
    const g=BIOMES[b].ground;return g[Math.floor(r()*g.length)];}
  // The valley pond is carved a little lower than its water.
  // v149 grass blades: the grass colour under (x,z) without the per-vertex speckle, or null where the ground is not
  // grass (sand banks, rock, snow, desert, Cloudstep, the highland).
  function grassBase(x,z){if(nearMountain(x,z)&&onMountain(x,z))return null;const w=wildness(x,z),y=groundHeight(x,z);
    {const rv=riverAt(x,z);if(rv.r&&rv.d<rv.r.w/2+2.5)return null;const lift=mountainLift(x,z);if(lift>2.5)return lift>12||y>19?null:'#82a36d';}
    if(w<.5)return y>3||inSnow(x,z)?null:'#96c17b';
    const b=biomeAt(x,z);if(b==='snow'||b==='desert'||mountainMask(x,z)>.28||y>17)return null;return BIOMES[b].ground[1];}
  const sinks=(x,z)=>{if(!onMountain(x,z))return false;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)if(!covered(x+a*CELL,z+b*CELL))return false;return true;};
  const vertexHeight=(x,z)=>((x-LAKE.x)/11.4)**2+((z-LAKE.z)/8.2)**2<1?Math.min(groundHeight(x,z),groundHeight(LAKE.x,LAKE.z))-.5:sinks(x,z)?groundHeight(x,z)-8:Math.hypot(x-POND.x,z-POND.z)<POND.r+1.2?Math.min(groundHeight(x,z),POND.y-.45):groundHeight(x,z);
  // Height of the ground as drawn: the same grid and triangle split as buildGround's PlaneGeometry, so feet and
  // hooves sit on the faceted surface you see (groundHeight alone cuts through it on sharp dunes and ridges).
  const CELL=CHUNK/SEGS;
  function surfaceHeight(x,z){if(nearMountain(x,z)&&onMountain(x,z))return groundHeight(x,z);const fx=x/CELL,fz=z/CELL,ix=Math.floor(fx),iz=Math.floor(fz),u=fx-ix,v=fz-iz,X=ix*CELL,Z=iz*CELL;
    const hb=vertexHeight(X,Z+CELL),hd=vertexHeight(X+CELL,Z);
    if(u+v<=1){const ha=vertexHeight(X,Z);return ha+(hd-ha)*u+(hb-ha)*v;}
    const hc=vertexHeight(X+CELL,Z+CELL);return hc+(hb-hc)*(1-u)+(hd-hc)*(1-v);}
  function buildGround(cx,cz){const g=new T.PlaneGeometry(CHUNK,CHUNK,SEGS,SEGS);g.rotateX(-Math.PI/2);
    const p=g.attributes.position,colors=[],r=rng(cx,cz,7),x0=cx*CHUNK+CHUNK/2,z0=cz*CHUNK+CHUNK/2;
    for(let i=0;i<p.count;i++){const x=p.getX(i)+x0,z=p.getZ(i)+z0;
      // The valley pond is carved a little lower than its water.
      const y=vertexHeight(x,z);p.setX(i,x);p.setY(i,y);p.setZ(i,z);colour(groundColour(x,z,y,r),colors);}
    g.setAttribute('color',new T.Float32BufferAttribute(colors,3));gridNormals(g,vertexHeight,CELL);g.computeBoundingSphere();
    const m=new T.Mesh(g,material);m.receiveShadow=true;m.renderOrder=-10;return m;}

  // ---- props: everything baked into one mesh per chunk ----
  function propsFor(cx,cz){const P=[],C=[],TO=treeOut(),r=rng(cx,cz,3),X0=cx*CHUNK,Z0=cz*CHUNK;
    const add=(shape,hex,x,y,z,sx,sy,sz,ry=0,rx=0,rz=0)=>{const a=raw[shape];mtx.compose(pos.set(x,y,z),q.setFromEuler(e.set(rx,ry,rz)),sc.set(sx,sy,sz));col.set(hex);
      for(let i=0;i<a.length;i+=3){v.set(a[i],a[i+1],a[i+2]).applyMatrix4(mtx);P.push(v.x,v.y,v.z);C.push(col.r,col.g,col.b);}};
    const H=(x,z)=>groundHeight(x,z);
    const kit={
      tree(x,z,s){const y=H(x,z),pal=TREE_PALS[r()<.82?0:r()<.6?1:2];if(treeMaterial){bakeTree(T,TO,x,y,z,s,pal,r()*9,'wild');return;}
        add('box','#9a7955',x,y+1.2*s,z,.5*s,2.4*s,.48*s);add('ico',pal[0],x,y+3.4*s,z,1.9*s,2.2*s,1.9*s,r()*3);add('ico',pal[1],x-.9*s,y+3*s,z+.5*s,1.45*s,1.7*s,1.5*s);add('ico',pal[2],x+s,y+3.3*s,z+.15*s,1.3*s,1.65*s,1.3*s);},
      pine(x,z,s,snowy){const y=H(x,z),g=snowy?['#3f6b52','#4a7a5c']:['#4f7d55','#5c8c5d'];add('box','#7d5f43',x,y+.8*s,z,.45*s,1.6*s,.45*s);
        [[2.2,1.9],[1.75,3.2],[1.25,4.4]].forEach(([w,h],i)=>{add('cone',g[i%2],x,y+h*s,z,w*s,2.3*s,w*s,r()*3);if(snowy)add('cone','#f4f7f8',x,y+(h+.62)*s,z,w*.55*s,1.1*s,w*.55*s);});},
      cactus(x,z,s){const y=H(x,z),g='#6f9a5a';add('cyl',g,x,y+1.6*s,z,.36*s,3.2*s,.36*s);add('ico',g,x,y+3.2*s,z,.36*s,.3*s,.36*s);
        for(const sd of [-1,1])if(r()<.75){const hh=(1.1+r()*.9)*s,ry=r()*3;const ox=Math.cos(ry)*sd,oz=-Math.sin(ry)*sd;add('box',g,x+ox*.55*s,y+hh,z+oz*.55*s,.6*s,.26*s,.26*s,ry);add('cyl',g,x+ox*.82*s,y+hh+.5*s,z+oz*.82*s,.2*s,1*s,.2*s);}},
      rock(x,z,s,hex){const y=H(x,z);add('ico',hex,x,y+s*.3,z,s,s*.7,s*.85,r()*3);},
      bush(x,z,s,hex){const y=H(x,z);add('ico',hex,x,y+s*.4,z,s,s*.6,s,r()*3);},
      flowers(x,z){const hex=['#e7cc86','#f5e8cd','#dab0ba','#c3a5c6'][Math.floor(r()*4)];for(let i=0;i<5;i++){const fx=x+(r()-.5)*2.4,fz=z+(r()-.5)*2.4;add('ico',hex,fx,H(fx,fz)+.17,fz,.13,.18,.13);}},
      snowman(x,z){const y=H(x,z);add('soft','#f7f9fb',x,y+.8,z,.95,.85,.95);add('soft','#f7f9fb',x,y+2,z,.7,.65,.7);add('soft','#f7f9fb',x,y+2.95,z,.48,.46,.48);
        add('cone','#e0874a',x,y+2.95,z+.55,.1,.5,.1,0,Math.PI/2);add('box','#3b3434',x-.17,y+3.08,z+.42,.08,.08,.04);add('box','#3b3434',x+.17,y+3.08,z+.42,.08,.08,.04);add('box','#c85a5a',x,y+2.48,z,.85,.16,.85);},
      igloo(x,z){const y=H(x,z);add('soft','#eef4f8',x,y,z,3.2,2.6,3.2);add('box','#dfe8ee',x,y+.75,z+2.9,1.5,1.5,1.4);add('box','#8aa3b3',x,y+.7,z+3.62,.9,1.2,.05);},
      cabin(x,z,snowy){const y=H(x,z),ry=r()*6;const f=(dx,dz)=>[x+Math.cos(ry)*dx+Math.sin(ry)*dz,z-Math.sin(ry)*dx+Math.cos(ry)*dz];
        add('box','#8e6a4b',x,y+1.5,z,5,3,4,ry);add('cone4',snowy?'#f2f5f7':'#a3564a',x,y+4.2,z,4.3,2.5,4.3,ry+Math.PI/4);const [dx,dz]=f(0,2.03);add('box','#5d4330',dx,y+1.1,dz,1.1,2.2,.1,ry);
        const [cx2,cz2]=f(1.4,-.8);add('box','#9a958c',cx2,y+4.6,cz2,.6,1.6,.6,ry);},
      oasis(x,z){const y=H(x,z);add('disc','#dcc68f',x,y+.04,z,5.2,1,4.2);add('disc','#7cbbb9',x,y+.08,z,3.8,1,3);
        for(const [dx,dz] of [[-3.6,1.5],[3.2,-2]]){const px=x+dx,pz=z+dz,py=H(px,pz),lean=.18;add('cyl','#a9845c',px,py+2.2,pz,.22,4.4,.22,0,0,lean);
          for(let i=0;i<6;i++){const a=i/6*Math.PI*2;add('box','#5f9a55',px+.8+Math.cos(a)*1.1,py+4.35,pz+Math.sin(a)*1.1,2.3,.08,.55,-a,0,-.35);}}},
      campfire(x,z){const y=H(x,z);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;add('ico','#9a9d90',x+Math.cos(a)*1.1,y+.2,z+Math.sin(a)*1.1,.35,.25,.35);}
        add('box','#7d5f43',x,y+.25,z,1.3,.18,.18,.6);add('box','#7d5f43',x,y+.28,z,1.3,.18,.18,-.6);add('cone','#f0a14a',x,y+.6,z,.35,.8,.35);
        for(const [dx,dz] of [[2.4,0],[-2.2,.8]])add('box','#9a7955',x+dx,y+.3,z+dz,1.6,.4,.5,dx);},
      sign(x,z){const y=H(x,z);add('box','#8e6a4b',x,y+1.3,z,.22,2.6,.22);add('box','#e9d6ae',x+.2,y+2.2,z,1.8,.5,.12,.4);add('box','#e9d6ae',x-.2,y+1.65,z,1.6,.45,.12,-1.2);}
    };
    // Scatter by biome. The valley (inside 108) keeps its own hand-placed scenery.
    const tries=simple?14:34;
    for(let i=0;i<tries;i++){const x=X0+r()*CHUNK,z=Z0+r()*CHUNK;if(wildness(x,z)<.25||nearMountain(x,z)||Math.hypot(x-POND.x,z-POND.z)<POND.r+3)continue;const rd=roadDistance(x,z);if(rd<ROAD_HALF+2.2)continue;
      const b=biomeAt(x,z),m=mountainMask(x,z),s=.75+r()*.6,roll=r();
      if(m>.45){if(roll<.35)kit.rock(x,z,1+r()*2.2,b==='desert'?'#bf8f69':b==='snow'?'#d9e1e6':'#9a9d90');else if(roll<.55&&b!=='desert')kit.pine(x,z,s*.9,b==='snow'||H(x,z)>14);continue;}
      if(b==='forest'){if(roll<.78)kit.pine(x,z,s*1.1,false);else if(roll<.88)kit.tree(x,z,s);else kit.bush(x,z,.7,'#5f8f55');}
      else if(b==='snow'){if(roll<.55)kit.pine(x,z,s,true);else if(roll<.7)kit.rock(x,z,.8+r(),'#d9e1e6');else if(roll<.75)kit.snowman(x,z);else kit.bush(x,z,.6,'#f2f6f8');}
      else if(b==='desert'){if(roll<.3)kit.cactus(x,z,s);else if(roll<.5)kit.rock(x,z,.6+r()*1.4,'#c99a72');else if(roll<.62)kit.bush(x,z,.5,'#b59a62');}
      else{if(roll<.42)kit.tree(x,z,s);else if(roll<.72)kit.flowers(x,z);else if(roll<.82)kit.rock(x,z,.6+r(),'#a9b2a0');else if(roll<.9)kit.bush(x,z,.7,'#7fae6a');}}
    // One landmark in about every fifth wild chunk, away from roads and mountains.
    {const x=X0+12+r()*40,z=Z0+12+r()*40,b=biomeAt(x,z);if(r()<.2&&wildness(x,z)>.9&&roadDistance(x,z)>10&&mountainMask(x,z)<.1){
      if(b==='desert')kit.oasis(x,z);else if(b==='snow')(r()<.5?kit.igloo(x,z):kit.cabin(x,z,true));else if(b==='forest')(r()<.5?kit.cabin(x,z,false):kit.campfire(x,z));else kit.campfire(x,z);}}
    // Road ribbons: each road piece belongs to the chunk its centre line passes through.
    const ribbon=(pts)=>{for(let i=0;i<pts.length-1;i++){const [ax,az]=pts[i],[bx,bz]=pts[i+1],dx=bx-ax,dz=bz-az,l=Math.hypot(dx,dz)||1,nx=-dz/l*ROAD_HALF,nz=dx/l*ROAD_HALF;
      const c=[[ax+nx,az+nz],[ax-nx,az-nz],[bx+nx,bz+nz],[bx-nx,bz-nz]].map(([x,z])=>[x,H(x,z)+.07,z]);
      for(const k of [0,2,1,1,2,3]){P.push(...c[k]);colour(((i>>1)%2)?'#e4d5ad':'#e0d0a6',C);}}};
    const STEP=2;
    for(let k=Math.floor(X0/ROAD_EVERY)-1;k<=Math.floor((X0+CHUNK)/ROAD_EVERY)+1;k++){let run=[];
      for(let z=Z0;z<=Z0+CHUNK+.01;z+=STEP){const x=roadX(k,z);if(x>=X0&&x<X0+CHUNK&&wildness(x,z)>.02&&!nearMountain(x,z))run.push([x,z]);else{if(run.length>1)ribbon(run);run=[];}}if(run.length>1)ribbon(run);}
    for(let k=Math.floor(Z0/ROAD_EVERY)-1;k<=Math.floor((Z0+CHUNK)/ROAD_EVERY)+1;k++){let run=[];
      for(let x=X0;x<=X0+CHUNK+.01;x+=STEP){const z=roadZ(k,x);if(z>=Z0&&z<Z0+CHUNK&&wildness(x,z)>.02&&!nearMountain(x,z))run.push([x,z]);else{if(run.length>1)ribbon(run);run=[];}}if(run.length>1)ribbon(run);}
    // A signpost where two roads cross.
    for(let kx=Math.floor(X0/ROAD_EVERY)-1;kx<=Math.floor((X0+CHUNK)/ROAD_EVERY)+1;kx++)for(let kz=Math.floor(Z0/ROAD_EVERY)-1;kz<=Math.floor((Z0+CHUNK)/ROAD_EVERY)+1;kz++){
      let x=kx*ROAD_EVERY,z=kz*ROAD_EVERY;for(let i=0;i<4;i++){x=roadX(kx,z);z=roadZ(kz,x);}if(x>=X0&&x<X0+CHUNK&&z>=Z0&&z<Z0+CHUNK&&wildness(x,z)>.5)kit.sign(x+ROAD_HALF+1.2,z+ROAD_HALF+1.2);}
    let m=null;if(P.length){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('color',new T.Float32BufferAttribute(C,3));g.computeVertexNormals();g.computeBoundingSphere();
      m=new T.Mesh(g,propMaterial);m.castShadow=!simple;m.receiveShadow=true;}
    if(TO.p.length){const t=new T.Mesh(treeGeometry(T,TO),treeMaterial);t.castShadow=!simple;t.receiveShadow=true;if(!m){m=new T.Group();m.geometry={dispose(){}};}m.add(t);m.userData.trees=t;}
    return m;}

  function build(cx,cz){const c={ground:buildGround(cx,cz),props:propsFor(cx,cz)};ground.add(c.ground);if(c.props)props.add(c.props);chunks.set(cx+','+cz,c);}
  function drop(key){const c=chunks.get(key);ground.remove(c.ground);c.ground.geometry.dispose();if(c.props){props.remove(c.props);c.props.geometry.dispose();c.props.userData.trees?.geometry.dispose();}chunks.delete(key);}
  // Keep a square of chunks around (x, z). `all` builds every missing one now (first load); otherwise one
  // per frame, nearest first, so walking never stutters. Chunks well behind you are dropped.
  // `extra` widens the square for a while (high on Cloudstep the view reaches much further).
  function update(x,z,all=false,extra=0){const pcx=Math.floor(x/CHUNK),pcz=Math.floor(z/CHUNK),want=[],ring=RING+extra;
    for(const key of [...chunks.keys()]){const [a,b]=key.split(',').map(Number);if(Math.abs(a-pcx)>ring+1||Math.abs(b-pcz)>ring+1)drop(key);}
    for(let dx=-ring;dx<=ring;dx++)for(let dz=-ring;dz<=ring;dz++)if(!chunks.has((pcx+dx)+','+(pcz+dz)))want.push([pcx+dx,pcz+dz,dx*dx+dz*dz]);
    want.sort((a,b)=>a[2]-b[2]);for(const [a,b] of all?want:want.slice(0,1))build(a,b);return want.length;}
  return {ground,props,update,surfaceHeight,grassBase,get count(){return chunks.size;},dispose(){for(const k of [...chunks.keys()])drop(k);Object.values(shapes).forEach(g=>g.dispose());ground.removeFromParent();props.removeFromParent();}};
}
