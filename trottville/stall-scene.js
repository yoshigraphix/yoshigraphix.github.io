// The home stall in 3D: a cut-away wooden stall (back wall, partitions with bars, a straw floor, a doorway on
// the right with the stall door swung open) plus the player's decor in fixed slots (stall-decor.mjs).
// Cel/toon look matching horse-sculpt.js. The static stall is ONE merged vertex-coloured mesh plus one
// instanced mesh of straw, so it costs two draw calls; decor items are small primitive groups.
// buildStall(T) → {group, slotPoint(id), setDecor(stall,horseName), doorX, dispose()}.
// buildStall(T,{decorOnly:true}) skips the stall itself (walls, straw, door) and keeps only the decor plus a beam
// to hang beam items from, so the 3D world's barn can show the same decor in your horse's bay. The name plaque
// then sits on the front rail instead of the swung-open door.
import {SLOT,shelfHost} from './stall-decor.mjs?v=160';

// The shuttered window (stall-window.js) sits where wall-3 used to be, so wall-3/wall-4 moved right and stacked.
export const WINDOW_AT={x:1.35,y:4.2};
const WALL_Z=-3.3,PART_X=4.6,DOOR_HALF=1.5,BEAM_Y=5.9;
// Where each slot sits (world space, x/y/z) and how big things are there. Shelf slots follow the shelf.
const SLOT_AT={
  'wall-1':{p:[-3.2,3.2,WALL_Z+.11]},'wall-2':{p:[-2.75,4.75,WALL_Z+.11]},'wall-3':{p:[3.45,4.45,WALL_Z+.11]},'wall-4':{p:[3.35,2.9,WALL_Z+.11]},
  'beam-1':{p:[-2.15,BEAM_Y-.2,WALL_Z+.5]},'beam-2':{p:[2.15,BEAM_Y-.2,WALL_Z+.5]},
  'floor-1':{p:[-3.45,0,-2.45],s:1.5},'floor-2':{p:[3.4,0,-2.5],s:1.5},'floor-3':{p:[-3.0,0,2.5],s:1.5},'floor-4':{p:[3.0,0,2.6],s:1.5},
  'rug':{p:[0,.012,.25]}
};
const DOOR_HINGE=[PART_X,0,DOOR_HALF],DOOR_YAW=-.22,DOOR_W=2.9;

export function buildStall(T,{decorOnly=false}={}){
  const ramp=new T.DataTexture(new Uint8Array([120,120,120,255,200,200,200,255,255,255,255,255]),3,1,T.RGBAFormat);
  ramp.minFilter=ramp.magFilter=T.NearestFilter;ramp.needsUpdate=true;
  const mats=new Map(),disposables=[ramp];
  const toon=(c,extra={})=>{const k=c+JSON.stringify(extra);if(!mats.has(k)){const m=new T.MeshToonMaterial({color:c,gradientMap:ramp,...extra});mats.set(k,m);disposables.push(m);}return mats.get(k);};
  const glow=c=>{const k='glow'+c;if(!mats.has(k)){const m=new T.MeshBasicMaterial({color:c,toneMapped:false});mats.set(k,m);disposables.push(m);}return mats.get(k);};
  const group=new T.Group();

  // ---- static stall: merge boxes/cylinders into one vertex-coloured geometry ----
  const parts=[],outerParts=[],m4=new T.Matrix4(),e=new T.Euler(),qq=new T.Quaternion(),one=new T.Vector3(1,1,1);
  function add(geo,color,x,y,z,rx=0,ry=0,rz=0){geo.applyMatrix4(m4.compose(new T.Vector3(x,y,z),qq.setFromEuler(e.set(rx,ry,rz)),one));(outerNow?outerParts:parts).push([geo,new T.Color(color)]);}
  let outerNow=false;const outer=f=>{outerNow=true;f();outerNow=false;};
  const box=(w,h,d,c,x,y,z,ry=0,rx=0,rz=0)=>add(new T.BoxGeometry(w,h,d),c,x,y,z,rx,ry,rz);
  const bar=(r,h,c,x,y,z)=>add(new T.CylinderGeometry(r,r,h,6),c,x,y,z);
  const WOOD=['#b8793f','#ad7038','#c0854a','#a76a35'];
  // Floors: straw in the stall and next door, packed earth/planks in the aisle past the doorway.
  const IN_Z1=11.3;// the stall floor runs from the back wall to the barn hall (world.js bay)
  box(PART_X*2+.4,.1,IN_Z1-WALL_Z,'#e9c56c',0,0,(IN_Z1+WALL_Z)/2);
  outer(()=>{box(PART_X+24,.1,30,'#e9c56c',(PART_X-24)/2,-.05,6);box(20,.1,30,'#c9a16c',PART_X+10,-.06,6);});
  // Back wall: vertical boards, a kick rail and the roof beam (decor hangs from it).
  for(let i=0,x=-24;x<24;i++,x+=.82){const c=x+.41;if(Math.abs(c)<PART_X+.2)box(.8,8.4,.22,WOOD[i%4],c,4.1,WALL_Z-.11);else outer(()=>box(.8,8.4,.22,WOOD[i%4],c,4.1,WALL_Z-.11));}
  const IW=PART_X*2+.4,OW=(48-IW)/2,OX=(IW+OW)/2;
  for(const [y,h,d,c,z] of [[2.25,.26,.12,'#8a5428',WALL_Z+.05],[.25,.26,.12,'#8a5428',WALL_Z+.05],[BEAM_Y+.1,.42,.5,'#74441f',WALL_Z+.22]]){box(IW,h,d,c,0,y,z);outer(()=>{box(OW,h,d,c,-OX,y,z);box(OW,h,d,c,OX,y,z);});}
  for(const x of [-PART_X,PART_X])box(.38,8.4,.38,'#7d4b23',x,4.1,WALL_Z+.1);
  // A little window high on the left wall with warm light coming in.
  outer(()=>{box(1.5,1.1,.06,'#ffe7a8',-PART_X-2.6,4.2,WALL_Z+.02);box(1.7,.12,.12,'#74441f',-PART_X-2.6,4.8,WALL_Z+.06);box(1.7,.12,.12,'#74441f',-PART_X-2.6,3.6,WALL_Z+.06);box(.1,1.2,.1,'#74441f',-PART_X-2.6,4.2,WALL_Z+.06);});
  // Partitions: board lower wall, top rail, bars. Right one has the doorway (z within ±DOOR_HALF).
  function partition(x,gap){const runs=gap?[[WALL_Z,-DOOR_HALF],[DOOR_HALF,3.4]]:[[WALL_Z,3.4]];
    for(const [z0,z1] of runs){const len=z1-z0,zc=(z0+z1)/2;
      for(let j=0;j<4;j++)box(.18,.6,len,WOOD[(j+(gap?1:0))%4],x,.3+j*.6,zc);
      box(.26,.16,len+.1,'#7d4b23',x,2.45,zc);box(.26,.16,len+.1,'#7d4b23',x,4.35,zc);
      for(let z=z0+.3;z<z1-.1;z+=.42)bar(.035,1.9,'#4e4a45',x,3.4,z);
      box(.32,4.5,.32,'#7d4b23',x,2.25,z1);}
    if(gap){box(.36,.4,DOOR_HALF*2+.3,'#74441f',x,4.6,0);for(const z of [-DOOR_HALF,DOOR_HALF])box(.34,4.8,.34,'#7d4b23',x,2.4,z);}}
  partition(-PART_X,false);partition(PART_X,true);
  // Feed trough in the back-left corner (fixed, so floor-1 stays free for decor in front of it).
  box(1.6,.5,.6,'#8a5428',-1.9,.85,WALL_Z+.4);box(1.5,.12,.5,'#d9b25a',-1.9,1.06,WALL_Z+.4);
  // The backdrop past the stall (wide wall, side window, aisle) is its own mesh, so the 3D barn can hide it (setBay).
  let backdrop=null;if(!decorOnly&&outerParts.length){const og=mergeColored(T,outerParts);disposables.push(og);backdrop=new T.Mesh(og,new T.MeshToonMaterial({vertexColors:true,gradientMap:ramp}));disposables.push(backdrop.material);backdrop.receiveShadow=true;group.add(backdrop);}else for(const [g] of outerParts)g.dispose();
  if(decorOnly){for(const [g] of parts)g.dispose();parts.length=0;box(11.4,.42,.5,'#74441f',0,BEAM_Y+.1,WALL_Z+.22);}
  const merged=mergeColored(T,parts);disposables.push(merged);
  const stall=new T.Mesh(merged,new T.MeshToonMaterial({vertexColors:true,gradientMap:ramp}));disposables.push(stall.material);
  stall.receiveShadow=true;group.add(stall);

  // Straw: one instanced mesh of thin sticks scattered over the stall floor.
  const strawGeo=new T.BoxGeometry(.42,.025,.05);disposables.push(strawGeo);
  const STRAW=240,straw=new T.InstancedMesh(strawGeo,toon('#ffffff'),STRAW),rnd=mulberry(7),sc=new T.Color();
  for(let i=0;i<STRAW;i++){m4.compose(new T.Vector3(-PART_X+.2+rnd()*(PART_X*2-.4),.07+rnd()*.03,WALL_Z+.3+rnd()*7),qq.setFromEuler(e.set(0,rnd()*Math.PI,(rnd()-.5)*.2)),one);straw.setMatrixAt(i,m4);
    straw.setColorAt(i,sc.set(['#f3d27a','#e2b85a','#f7e09a','#d6a94c'][i%4]));}
  straw.receiveShadow=true;if(!decorOnly)group.add(straw);

  // The stall door, swung open into the aisle on its front hinge, facing the camera.
  const door=new T.Group();door.position.set(...DOOR_HINGE);door.rotation.y=DOOR_YAW;
  const dp=(w,h,d,c,x,y,z,rz=0)=>{const g=new T.BoxGeometry(w,h,d);disposables.push(g);const ms=new T.Mesh(g,toon(c));ms.position.set(x,y,z);ms.rotation.z=rz;door.add(ms);return ms;};
  dp(DOOR_W,1.9,.14,'#c4553b',DOOR_W/2,1.05,0);dp(DOOR_W,.16,.18,'#f4ecd8',DOOR_W/2,.15,0);dp(DOOR_W,.16,.18,'#f4ecd8',DOOR_W/2,1.95,0);
  dp(.16,1.9,.18,'#f4ecd8',.08,1.05,0);dp(.16,1.9,.18,'#f4ecd8',DOOR_W-.08,1.05,0);dp(Math.hypot(DOOR_W,1.8)-.2,.14,.16,'#f4ecd8',DOOR_W/2,1.05,0,Math.atan2(1.7,DOOR_W));
  for(let z=.25;z<DOOR_W;z+=.4){const g=new T.CylinderGeometry(.03,.03,1.5,6);disposables.push(g);const ms=new T.Mesh(g,toon('#4e4a45'));ms.position.set(z,2.8,0);door.add(ms);}
  dp(DOOR_W,.14,.16,'#f4ecd8',DOOR_W/2,3.55,0);
  door.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});
  // Decor-only: an empty holder on the front rail carries the plaque (same local offset as on the door).
  if(decorOnly){for(const c of [...door.children])door.remove(c);door.position.set(-1.05,0,3.55);door.rotation.y=0;}
  group.add(door);
  group.updateMatrixWorld(true);

  // ---- decor ----
  const decor=new T.Group();group.add(decor);let decorDisposables=[];
  function slotPoint(id,stallState){
    if(id==='door')return {pos:door.localToWorld(new T.Vector3(1.05,1.35,.1)),rotY:DOOR_YAW,scale:1,parent:door,local:new T.Vector3(1.05,1.35,.1)};
    const s=SLOT[id];if(!s)return null;
    if(s.needs){const host=stallState&&shelfHost(stallState);if(!host)return null;const h=SLOT_AT[host].p;return {pos:new T.Vector3(h[0]+(id==='shelf-1'?-.48:.48),h[1]+.06,h[2]+.24),rotY:0,scale:.9};}
    const a=SLOT_AT[id];return {pos:new T.Vector3(...a.p),rotY:0,scale:a.s||1};}
  function setDecor(stallState,horseName='',photos={}){
    for(const d of decorDisposables)d.dispose();decorDisposables=[];
    for(const c of [...decor.children])decor.remove(c);for(const c of [...door.children])if(c.userData.decor)door.remove(c);
    const kit=itemKit(T,toon,glow,g=>{decorDisposables.push(g);return g;});
    for(const [slotId,itemId] of Object.entries(stallState.placed)){const at=slotPoint(slotId,stallState);if(!at)continue;
      const g=kit.make(itemId,{name:horseName,slot:SLOT[slotId].type,photo:photos[slotId]?.bitmap});if(!g)continue;g.scale.setScalar(at.scale);g.userData.decor=true;g.userData.slot=slotId;g.userData.item=itemId;
      if(at.parent){g.position.copy(at.local);at.parent.add(g);}else{g.position.copy(at.pos);g.rotation.y=at.rotY;decor.add(g);}
      g.traverse(o=>{if(o.isMesh){o.castShadow=SLOT[slotId].type==='floor';o.receiveShadow=true;}});}}
  // Loose straw follows the floor mess (home-horse.js): a raked-clean stall shows none, a messy one all of it.
  const setLooseStraw=f=>{straw.count=Math.round(STRAW*Math.max(0,Math.min(1,f)));};
  // In the 3D barn the stall stands in a bay: no backdrop, door shut along its partition.
  const setBay=on=>{if(backdrop)backdrop.visible=!on;door.rotation.y=on&&!decorOnly?Math.PI/2:decorOnly?0:DOOR_YAW;group.updateMatrixWorld(true);};
  return {group,decor,slotPoint,setDecor,setLooseStraw,setBay,doorX:PART_X,dispose(){for(const d of decorDisposables)d.dispose();for(const d of disposables)d.dispose();}};
}

function mergeColored(T,parts){let n=0;const flat=parts.map(([g,c])=>{const ng=g.index?g.toNonIndexed():g;if(ng!==g)g.dispose();n+=ng.attributes.position.count;return [ng,c];});
  const pos=new Float32Array(n*3),nor=new Float32Array(n*3),col=new Float32Array(n*3);let o=0;
  for(const [g,c] of flat){const p=g.attributes.position.array,nm=g.attributes.normal.array;pos.set(p,o*3);nor.set(nm,o*3);for(let i=0;i<g.attributes.position.count;i++){col[(o+i)*3]=c.r;col[(o+i)*3+1]=c.g;col[(o+i)*3+2]=c.b;}o+=g.attributes.position.count;g.dispose();}
  const out=new T.BufferGeometry();out.setAttribute('position',new T.BufferAttribute(pos,3));out.setAttribute('normal',new T.BufferAttribute(nor,3));out.setAttribute('color',new T.BufferAttribute(col,3));out.computeBoundingSphere();return out;}
const PAINT={
    meadow(c,w,h){const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#8fd0f0');g.addColorStop(1,'#d9f1fb');c.fillStyle=g;c.fillRect(0,0,w,h);c.fillStyle='#ffd84a';c.beginPath();c.arc(w*.78,h*.25,12,0,7);c.fill();
      c.fillStyle='#7cc46a';c.beginPath();c.ellipse(w*.25,h*1.05,w*.55,h*.45,0,0,7);c.fill();c.fillStyle='#5aa857';c.beginPath();c.ellipse(w*.85,h*1.1,w*.5,h*.5,0,0,7);c.fill();
      c.strokeStyle='#fff';c.lineWidth=2;for(let x=8;x<w;x+=14){c.beginPath();c.moveTo(x,h*.82);c.lineTo(x,h*.95);c.stroke();}c.beginPath();c.moveTo(0,h*.86);c.lineTo(w,h*.86);c.stroke();},
    sunset(c,w,h){const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#5b4fa0');g.addColorStop(.5,'#f07b5a');g.addColorStop(1,'#ffd27a');c.fillStyle=g;c.fillRect(0,0,w,h);c.fillStyle='#ffe9a0';c.beginPath();c.arc(w*.5,h*.72,18,0,7);c.fill();
      c.fillStyle='#4a2f55';c.beginPath();c.ellipse(w*.3,h*1.05,w*.6,h*.32,0,0,7);c.fill();c.beginPath();c.ellipse(w*.95,h*1.02,w*.4,h*.3,0,0,7);c.fill();c.fillRect(w*.8,h*.5,4,h*.3);c.beginPath();c.arc(w*.81,h*.48,11,0,7);c.fill();},
    night(c,w,h){c.fillStyle='#1d2a5a';c.fillRect(0,0,w,h);c.fillStyle='#fff7cf';for(let i=0;i<26;i++){c.fillRect((i*53)%w,(i*29)%(h*.6),2,2);}c.beginPath();c.arc(w*.75,h*.25,13,0,7);c.fill();c.fillStyle='#1d2a5a';c.beginPath();c.arc(w*.79,h*.22,11,0,7);c.fill();
      c.fillStyle='#2e4a35';c.fillRect(0,h*.82,w,h*.18);c.fillStyle='#b7473a';c.beginPath();c.moveTo(w*.2,h*.82);c.lineTo(w*.2,h*.6);c.lineTo(w*.33,h*.48);c.lineTo(w*.46,h*.6);c.lineTo(w*.46,h*.82);c.fill();c.fillStyle='#ffd27a';c.fillRect(w*.3,h*.66,7,7);},
    portrait(c,w,h){c.fillStyle='#f1e4c8';c.fillRect(0,0,w,h);c.fillStyle='#e2cfa6';c.beginPath();c.ellipse(w/2,h/2,w*.38,h*.44,0,0,7);c.fill();
      c.fillStyle='#9a5b34';c.beginPath();c.moveTo(w*.3,h);c.quadraticCurveTo(w*.32,h*.45,w*.5,h*.3);c.lineTo(w*.56,h*.12);c.lineTo(w*.62,h*.3);c.quadraticCurveTo(w*.85,h*.42,w*.82,h*.62);c.lineTo(w*.7,h*.64);c.quadraticCurveTo(w*.58,h*.62,w*.58,h);c.fill();
      c.fillStyle='#4e2e1c';c.beginPath();c.moveTo(w*.31,h);c.quadraticCurveTo(w*.33,h*.45,w*.52,h*.28);c.lineTo(w*.48,h*.42);c.quadraticCurveTo(w*.38,h*.6,w*.4,h);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(w*.64,h*.4,3,0,7);c.fill();}
  };
// A bigger copy of a painting for the full-screen viewer (the paintings are drawn at 128×96).
export function paintingCanvas(itemId,scale=6){const kind=PAINTING_KIND[itemId];if(!kind)return null;const c=document.createElement('canvas');c.width=128*scale;c.height=96*scale;
  const x=c.getContext('2d');x.scale(scale,scale);PAINT[kind](x,128,96);return c;}
export const PAINTING_KIND={'meadow-painting':'meadow','sunset-painting':'sunset','night-painting':'night','horse-portrait':'portrait'};
function mulberry(a){return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}

// ---- the decor items: tiny procedural toon models. Wall/door items face +z from z=0; floor items stand on y=0;
// beam items hang below y=0 and span about x ±1.9. ----
function itemKit(T,toon,glow,keep){
  const G=()=>new T.Group();
  const mesh=(geo,mat,parent,x=0,y=0,z=0,rx=0,ry=0,rz=0)=>{const m=new T.Mesh(keep(geo),mat);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);parent.add(m);return m;};
  const box=(p,w,h,d,c,x,y,z,rz=0)=>mesh(new T.BoxGeometry(w,h,d),toon(c),p,x,y,z,0,0,rz);
  const cyl=(p,rt,rb,h,c,x,y,z,seg=10,rx=0,rz=0)=>mesh(new T.CylinderGeometry(rt,rb,h,seg),typeof c==='string'?toon(c):c,p,x,y,z,rx,0,rz);
  const ball=(p,r,c,x,y,z,sx=1,sy=1,sz=1)=>{const m=mesh(new T.SphereGeometry(r,10,8),typeof c==='string'?toon(c):c,p,x,y,z);m.scale.set(sx,sy,sz);return m;};
  function canvasTex(w,h,draw){const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d'),w,h);const t=keep(new T.CanvasTexture(cv));t.colorSpace=T.SRGBColorSpace;return t;}
  const picMat=tex=>{const m=new T.MeshBasicMaterial({map:tex,color:'#efe6d6'});keep(m);return m;};
  // photo: the player's own picture for this frame (stall-photo.js), cover-cropped to the canvas.
  function painting(kind,frame,photo){const g=G();box(g,1.55,1.2,.08,frame,0,0,.04);
    const tex=photo?canvasTex(520,384,(c,w,h)=>{const k=Math.max(w/photo.width,h/photo.height),pw=photo.width*k,ph=photo.height*k;c.drawImage(photo,(w-pw)/2,(h-ph)/2,pw,ph);}):canvasTex(128,96,PAINT[kind]);
    const m=picMat(tex);if(photo)m.color.set('#ffffff');mesh(new T.PlaneGeometry(1.3,.96),m,g,0,0,.085);return g;}
  function rosette(c1,c2,big){const g=G(),s=big?1.3:1;for(const k of [-1,1])box(g,.14*s,.55*s,.03,c1,k*.09*s,-.32*s,.02,k*.25);
    cyl(g,.26*s,.26*s,.05,c1,0,0,.05,14,Math.PI/2);cyl(g,.15*s,.15*s,.06,c2,0,0,.08,12,Math.PI/2);return g;}
  function flowerHead(p,c,x,y,z,r=.07){for(let i=0;i<5;i++){const a=i/5*Math.PI*2;ball(p,r*.6,c,x+Math.cos(a)*r*.8,y+Math.sin(a)*r*.8,z,1,1,.4);}ball(p,r*.45,'#f2b632',x,y,z+.02);}
  // A flat, smiling bear face on the floor (front = +z, toward the camera).
  function bearRug(g,{fur,ear,muzzle,nose}){const disc=(r,c,x,z,y,sx=1,sz=1)=>{const m=cyl(g,r,r,.02,c,x,y,z,24);m.scale.set(sx,1,sz);return m;};
    for(const s of [-1,1]){disc(.5,fur,s*1.0,-.95,0);disc(.28,ear,s*1.0,-.95,.004);}
    disc(1.45,fur,0,0,.002,1.12,1);disc(.62,muzzle,0,.42,.006,1.15,.85);disc(.2,nose,0,.22,.01,1.25,.9);
    for(const s of [-1,1]){disc(.13,nose,s*.48,-.25,.008);disc(.045,'#ffffff',s*.45,-.29,.012);}
    mesh(new T.TorusGeometry(.18,.025,4,12,Math.PI),toon(nose),g,0,.014,.4,Math.PI/2,0,0);return g;}
  function pot(p,c,r=.24,h=.32){cyl(p,r,r*.75,h,c,0,h/2,0,10);cyl(p,r*1.06,r*1.06,.06,c,0,h,0,10);cyl(p,r*.92,r*.92,.02,'#6b4a2e',0,h+.02,0,10);return h;}
  const B={
    'meadow-painting':o=>painting('meadow','#c9a24a',o.photo),
    'sunset-painting':o=>painting('sunset','#8a5a35',o.photo),
    'night-painting':o=>painting('night','#3d3a52',o.photo),
    'horse-portrait':o=>painting('portrait','#d8b04a',o.photo),
    'horseshoe':()=>{const g=G();mesh(new T.TorusGeometry(.26,.065,6,14,Math.PI*1.45),toon('#a9b2b8'),g,0,0,.07,0,0,Math.PI*.775);ball(g,.035,'#6d757a',0,.3,.04);return g;},
    'rosette-blue':()=>rosette('#3f76c9','#f4ecd8'),
    'rosette-gold':()=>rosette('#e3a92b','#fff1b8',true),
    'shelf':()=>{const g=G();box(g,1.9,.1,.5,'#9c6534',0,0,.25);for(const k of [-1,1])box(g,.08,.4,.4,'#7d4b23',k*.7,-.22,.2);return g;},
    'name-plaque':({name})=>{const g=G();box(g,1.25,.42,.06,'#7d4b23',0,0,.03);mesh(new T.PlaneGeometry(1.12,.32),picMat(canvasTex(256,72,(c,w,h)=>{c.fillStyle='#f4e3bf';c.fillRect(0,0,w,h);c.fillStyle='#4a2c16';c.textAlign='center';c.textBaseline='middle';let fs=46;c.font=`700 ${fs}px Georgia,serif`;const t=String(name||'My horse').slice(0,18);while(c.measureText(t).width>w-20&&fs>18){fs-=2;c.font=`700 ${fs}px Georgia,serif`;}c.fillText(t,w/2,h/2+2);})),g,0,0,.065);return g;},
    'wreath':()=>{const g=G();mesh(new T.TorusGeometry(.32,.09,6,14),toon('#4f9a4a'),g,0,0,.08);['#f06a8a','#ffd84a','#ffffff','#b48be0','#f06a8a','#ffd84a'].forEach((c,i)=>{const a=i/6*Math.PI*2;flowerHead(g,c,Math.cos(a)*.32,Math.sin(a)*.32,.16,.06);});box(g,.2,.12,.04,'#e0525e',0,-.36,.14);return g;},
    'bunting':()=>{const g=G();cyl(g,.015,.015,3.9,'#f4ecd8',0,0,0,4,0,Math.PI/2);['#e0525e','#ffd84a','#4fa3d9','#6cbf5a','#f08ac0'].forEach((c,i,a)=>{for(let k=0;k<2;k++){const x=-1.75+(i+k*5)*.39;const t=mesh(new T.CircleGeometry(.2,3),toon(c,{side:T.DoubleSide}),g,x,-.13,0,0,0,-Math.PI/2);t.scale.y=.8;}});return g;},
    'fairy-lights':()=>{const g=G(),n=14;for(let i=0;i<=n;i++){const t=i/n,x=-1.9+t*3.8,y=-.28*Math.sin(Math.PI*t);ball(g,.06,glow(['#ffe28a','#ffd0a0','#fff3c0'][i%3]),x,y,.05);}
      const curve=new T.CatmullRomCurve3(Array.from({length:9},(_,i)=>{const t=i/8;return new T.Vector3(-1.9+t*3.8,-.28*Math.sin(Math.PI*t)+.04,.05);}));mesh(new T.TubeGeometry(curve,24,.012,4),toon('#3c4a3a'),g);return g;},
    'hanging-lantern':()=>{const g=G();cyl(g,.015,.015,.7,'#4e4a45',0,-.35,0,4);cyl(g,.05,.22,.16,'#3e3a36',0,-.76,0,8);cyl(g,.15,.15,.36,glow('#ffcf6a'),0,-1.0,0,8);
      for(const k of [[1,1],[1,-1],[-1,1],[-1,-1]])box(g,.03,.4,.03,'#3e3a36',k[0]*.14,-1.0,k[1]*.14);cyl(g,.2,.2,.05,'#3e3a36',0,-1.21,0,8);return g;},
    'daisy-pot':()=>{const g=G(),h=pot(g,'#c8694a');for(let i=0;i<5;i++){const a=i*1.3,r=.12,x=Math.cos(a)*r,z=Math.sin(a)*r*.6,y=h+.18+(i%2)*.1;cyl(g,.012,.012,y-h,'#4f9a4a',x,h+(y-h)/2,z,4);flowerHead(g,'#ffffff',x,y,z+.05,.08);}return g;},
    'fern-pot':()=>{const g=G(),h=pot(g,'#b9a089',.26,.34);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const m=mesh(new T.ConeGeometry(.08,.75,5),toon(i%2?'#4e9a47':'#5fb257'),g,Math.cos(a)*.14,h+.3,Math.sin(a)*.14);m.rotation.set(Math.sin(a)*.7,0,-Math.cos(a)*.7);}return g;},
    'sunflower-vase':()=>{const g=G();cyl(g,.15,.22,.55,'#4f7fc4',0,.275,0,10);cyl(g,.12,.15,.08,'#4f7fc4',0,.58,0,10);[[-.12,1.15,.0],[.1,1.3,.05],[.02,1.0,.1]].forEach(([x,y,z])=>{cyl(g,.015,.015,y-.55,'#4f9a4a',x*.5,.55+(y-.55)/2,z*.5,4);
      const hd=G();hd.position.set(x,y,z+.03);hd.rotation.x=-.25;g.add(hd);for(let i=0;i<10;i++){const a=i/10*Math.PI*2;ball(hd,.06,'#ffcf2a',Math.cos(a)*.15,Math.sin(a)*.15,0,1,1,.35);}cyl(hd,.1,.1,.05,'#6b3e1c',0,0,.02,10,Math.PI/2);});return g;},
    'tulip-vase':()=>{const g=G();cyl(g,.1,.14,.32,'#f4ecd8',0,.16,0,10);cyl(g,.07,.09,.08,'#f4ecd8',0,.34,0,10);[[-.06,.66,'#f06a8a'],[.07,.72,'#ff9fb8'],[0,.58,'#e0525e']].forEach(([x,y,c])=>{cyl(g,.012,.012,y-.34,'#4f9a4a',x/2,.34+(y-.34)/2,0,4);ball(g,.07,c,x,y,0,1,1.35,1);});return g;},
    'hay-bale':()=>{const g=G();box(g,1.0,.48,.55,'#e3c35c',0,.24,0);for(const x of [-.25,.25])box(g,.05,.5,.57,'#a8823a',x,.24,0);return g;},
    'bench':()=>{const g=G(),c='#5d9a8b';box(g,1.4,.08,.42,c,0,.46,0);for(const x of [-.6,.6])for(const z of [-.15,.15])box(g,.07,.46,.07,'#3f6e62',x,.23,z);
      for(const y of [.66,.84])box(g,1.4,.1,.05,c,0,y,-.2);for(const x of [-.6,.6])box(g,.07,.5,.06,'#3f6e62',x,.7,-.2);return g;},
    'horse-ball':()=>{const g=G();ball(g,.38,'#e0525e',0,.38,0);mesh(new T.TorusGeometry(.38,.05,6,20),toon('#f4ecd8'),g,0,.38,0,0,.5,0);return g;},
    'rug-check':()=>{const g=G();mesh(new T.BoxGeometry(4.2,.02,2.6),new T.MeshToonMaterial({map:canvasTex(64,40,(c,w,h)=>{c.fillStyle='#f4ecd8';c.fillRect(0,0,w,h);c.fillStyle='#c84a3e';for(let x=0;x<w;x+=8)for(let y=0;y<h;y+=8)if(((x+y)/8)%2===0)c.fillRect(x,y,8,8);c.strokeStyle='#8a2e26';c.lineWidth=3;c.strokeRect(1,1,w-2,h-2);})}),g);g.children[0].material=keep(g.children[0].material);return g;},
    'rug-round':()=>{const g=G();cyl(g,1.7,1.7,.02,'#4f7fc4',0,0,0,24);cyl(g,1.3,1.3,.025,'#8ab4e6',0,.002,0,24);cyl(g,.8,.8,.03,'#4f7fc4',0,.004,0,20);return g;},
    // 2026-11-09 rugs: a braided rag oval, a striped runner, and two friendly bear-FACE rugs (cartoon faces, not pelts).
    'rug-braided':()=>{const g=G();['#c86b4a','#e8c46a','#6f9f7a','#e9dcc0','#c86b4a','#8a6bb0'].forEach((c,i)=>{const m=cyl(g,1.8-i*.28,1.8-i*.28,.02+i*.003,c,0,i*.002,0,28);m.scale.set(1.35,1,1);});return g;},
    'rug-runner':()=>{const g=G();mesh(new T.BoxGeometry(4.4,.02,1.5),new T.MeshToonMaterial({map:canvasTex(80,24,(c,w,h)=>{const s=['#2f6b8a','#f4ecd8','#e0a63a','#f4ecd8','#c84a3e','#f4ecd8'];for(let x=0;x<w;x+=4){c.fillStyle=s[(x/4)%s.length];c.fillRect(x,0,4,h);}c.fillStyle='#2f6b8a';c.fillRect(0,0,w,2);c.fillRect(0,h-2,w,2);})}),g);g.children[0].material=keep(g.children[0].material);return g;},
    'rug-teddy':()=>bearRug(G(),{fur:'#9a6a43',ear:'#d9a679',muzzle:'#e8c9a0',nose:'#3a2618'}),
    'rug-polar':()=>bearRug(G(),{fur:'#f6f4ee',ear:'#cfd9e2',muzzle:'#ffffff',nose:'#3c4a5a'}),
    'candle-jar':()=>{const g=G();cyl(g,.1,.1,.22,'#cfe6ee',0,.11,0,10);cyl(g,.085,.085,.14,'#f4ecd8',0,.08,0,10);mesh(new T.ConeGeometry(.03,.08,6),glow('#ffb84a'),g,0,.2,0);return g;},
    'trophy':()=>{const g=G(),gold='#e3b02b';box(g,.26,.08,.26,'#6b4a2e',0,.04,0);cyl(g,.03,.05,.16,gold,0,.16,0,8);cyl(g,.16,.06,.24,gold,0,.36,0,12);for(const k of [-1,1])mesh(new T.TorusGeometry(.06,.015,5,10),toon(gold),g,k*.17,.38,0);return g;},
    'tiny-cactus':()=>{const g=G(),h=pot(g,'#e08a5a',.1,.14);mesh(new T.CapsuleGeometry(.06,.16,3,8),toon('#5fa15a'),g,0,h+.14,0);mesh(new T.CapsuleGeometry(.035,.06,3,6),toon('#5fa15a'),g,.07,h+.16,0,0,0,-.8);ball(g,.025,'#f06a8a',0,h+.27,0);return g;}
  };
  return {make(id,opts={}){const f=B[id];return f?f(opts):null;}};
}
