import {LOCATIONS,MAP_PATHS,RACE_GATES,SERVICES,terrainHeight,RIVERS,BRIDGES,MOUNTAINS,FIELDS,MILLS,TOWN2,SKYGATE,PASTURE,FARMS,riverWaterY,bridgeFloor,onBridge,mountainLift,COBBLE_SQUARE,COBBLE_STREETS,COBBLE_HALF} from './world-content.mjs?v=160';
import {buildBarnInterior} from './barn-interior.js?v=160';
import {R} from './world-regions.mjs?v=160';
import {waterize} from './world-sky.js?v=160';
import {realMat,realUV} from './world-tudor.js?v=160';
export function buildExpansion({T,outdoors,geo,mat,box,ico,label,tree,path}){
 const smoothTree=tree;   // v113: farm trees use the world's smooth, swaying trees (world.js tree)
 const addBox=(parent,c,x,y,z,sx,sy,sz)=>box(parent,c,x,y,z,sx,sy,sz,true);
 const sign=(parent,text,x,y,z,w=4)=>{const s=label(text,x,y,z,w);parent.add(s);return s;};
 const obstacles=[],lit=new T.Group(),litObs=[];let hoofhaven=null;
 function hut(x,z,color='#c98e77',size=1,parent=lit,obs=litObs){const g=new T.Group();addBox(g,color,0,1.8,0,5,3.6,4);const roof=new T.Mesh(geo(new T.ConeGeometry(4.1,2.8,4)),mat('#527b73'));roof.position.y=4.6;roof.rotation.y=Math.PI/4;g.add(roof);addBox(g,'#f5e0b9',0,1.2,2.05,1.2,2.4,.12);for(const dx of [-1.5,1.5])addBox(g,'#ceded5',dx,2.2,2.06,.8,.9,.1);g.scale.setScalar(size);g.position.set(x,terrainHeight(x,z),z);parent.add(g);obs.push({kind:'box',x,z,hx:2.5*size,hz:2*size,height:5*size});return g;}
 MAP_PATHS.routes.forEach(points=>outdoors.add(path(points,3)));
 const mill=hut(-55,-12,'#ded1b0',.9);const wheel=new T.Group();wheel.position.set(0,5,2.5);for(let i=0;i<4;i++){const blade=addBox(wheel,'#e9daba',0,1.8,0,.5,3.6,.12);blade.rotation.z=i*Math.PI/2;blade.position.set(Math.sin(i*Math.PI/2)*1.6,Math.cos(i*Math.PI/2)*1.6,0);}mill.add(wheel);
 // (Bramble Village's cottages became the walk-in shops round the fountain square: world-town.mjs.)
 const market=new T.Group();for(const x of [-3,3]){addBox(market,'#9e805c',x,1.1,0,4,1.9,2);addBox(market,'#d7b971',x,3.2,0,4.5,.3,3);for(const dx of [-1.8,1.8])addBox(market,'#8a7753',x+dx,2,0,.12,2.4,.12);for(let i=0;i<5;i++)ico(market,i%2?'#c9854e':'#d89a56',x-1.5+i*.6,2.2,.1,.2,.3,.2);}market.position.set(-64,terrainHeight(-64,32),32);lit.add(market);
 const track=path(MAP_PATHS.track,4);outdoors.add(track);const raceFlags=[];RACE_GATES.forEach((g,i)=>{const group=new T.Group();for(const dx of [-2.4,2.4])addBox(group,'#e5d8b7',dx,2.3,0,.2,4.6,.2);addBox(group,i===3?'#cd9d82':'#96af84',0,4.5,0,5,.5,.2);group.position.set(g.x,terrainHeight(g.x,g.z),g.z);outdoors.add(group);raceFlags.push(group);sign(outdoors,i===3?'START / FINISH':String(i+1),g.x,5.1,g.z,3.3);});
 for(let i=0;i<3;i++){const x=18+i*4,z=46+i*2;addBox(lit,'#c89680',x,terrainHeight(x,z)+.8,z,3,.16,.18);for(const dx of [-1.5,1.5])addBox(lit,'#e7d7b3',x+dx,terrainHeight(x,z)+.65,z,.15,1.3,.15);litObs.push({kind:'box',x,z,hx:1.6,hz:.2,height:.9});}
 const picnic=new T.Group();addBox(picnic,'#cfad83',0,1.2,0,4.5,.22,2);for(const x of [-1.7,1.7])addBox(picnic,'#a98b62',x,.6,0,.2,1.2,1.8);for(const z of [-1.5,1.5])addBox(picnic,'#c9a67a',0,.65,z,4.5,.18,.65);picnic.position.set(-20,terrainHeight(-20,50),50);lit.add(picnic);lit.add(tree(-24,49,'pink',1.2));
 const shore=new T.Mesh(geo(new T.CircleGeometry(1,36)),mat('#dfd6ad'));shore.rotation.x=-Math.PI/2;shore.scale.set(29,22,1);shore.position.set(-65,.03,82);lit.add(shore);const sea=new T.Mesh(geo(new T.PlaneGeometry(61,35)),mat('#7cbbb9'));sea.rotation.x=-Math.PI/2;sea.position.set(-66,.06,94);lit.add(sea);litObs.push({kind:'lake',x:-66,z:93,rx:31,rz:15,height:100});
 // (Rosewater Lighthouse is a walk-in now, its tower on the keeper's room: world-town.mjs.)
 for(let row=0;row<5;row++)for(let i=0;i<12;i++){const x=-2+i*1.2,z=60+row*1.8;ico(lit,row%2?'#c3a5c6':'#b39abe',x,terrainHeight(x,z)+.55,z,.3,.65,.3);}
 for(let i=0;i<10;i++){const angle=i*.7;lit.add(tree(60+Math.sin(angle)*8,-35+Math.cos(angle)*7,i%3===0?'gold':'green',1.05));}
 for(const [x,y,z,s] of [[37,3,-66,4],[44,5,-68,5],[40,9,-70,4]])ico(lit,'#a4b4a7',x,terrainHeight(x,z)+y,z,s,y,s*.7);addBox(lit,'#b8e1da',40,6,-65,2.3,12,.17);addBox(lit,'#8fc3bb',40,.15,-61,8,.15,6);
 const ruins=new T.Group();for(const x of [-3,3]){addBox(ruins,'#aeb6a2',x,2.4,0,1.4,4.8,1.5);ico(ruins,'#c2c8b3',x,4.9,0,1.2,.7,1.1);}addBox(ruins,'#b8bea8',0,5.4,0,7.8,1,1.7);ruins.position.set(-78,terrainHeight(-78,-25),-25);lit.add(ruins);
 // (Cloudstep Summit's sign hangs on its flag instead, out of the lookout's view: world-cloudstep-3d.js.)
 LOCATIONS.forEach((l,i)=>{if(i<6||l.id==='summit')return;const y=terrainHeight(l.x,l.z)+4;sign(outdoors,l.name.toUpperCase(),l.x,y,l.z,Math.min(7,3+l.name.length*.1));});
 // The barn interior lives in barn-interior.js (hall, stalls, tack room, Hazel's shop, the big doors).
 const barn=buildBarnInterior({T,geo,mat,box,ico,label});const {interior,floor,walls,indoorObstacles}=barn;
 sign(outdoors,matchMedia('(pointer: coarse)').matches?'ENTER THE BARN':'ENTER THE BARN (F)',-13,2.6,1.5,4.5);
 // Hoofhaven: a huge barn; walk in through the doors (v95: the market hall is in barn-interior.js),
 // you just know a lot of horses are in there.
 // (Willowbrook Vet is a walk-in now, built with the village shops: world-town.mjs.)
 // v102 (Yoshi: "door is on the far side and there's trees in the way… prettier architecture"): a red sale barn with a
 // gambrel roof, a cupola + horse weathervane, a front cross-gable over big X-braced sliding doors, a painted hanging
 // sign, shuttered windows with flower boxes, door lanterns, a hitching rail and hay bales. Built facing +z, then turned
 // round so the doors face the meadow loop path (-z); a short gravel path (MAP_PATHS) leads from the loop to the doors.
 // Window glass and lanterns use #f6e7b0, which world-lanterns.js lights up at night.
 {const s=SERVICES[1],g=new T.Group(),W=18,D=12,H=6,F=D/2,RED='#b5553f',TRIM='#f2e6cc',ROOF='#4e6b5a',GLOW='#f6e7b0';
  const ext=(pts,depth,color)=>{const sh=new T.Shape();sh.moveTo(pts[0][0],pts[0][1]);for(const q of pts.slice(1))sh.lineTo(q[0],q[1]);const m=new T.Mesh(geo(new T.ExtrudeGeometry(sh,{depth,bevelEnabled:false})),mat(color));m.castShadow=m.receiveShadow=true;return m;};
  const slab=(c,x,y,z,sx,sy,sz,rx=0,rz=0)=>{const m=addBox(g,c,x,y,z,sx,sy,sz);m.rotation.x=rx;m.rotation.z=rz;return m;};
  // body, stone base, corner boards, eave band
  addBox(g,RED,0,H/2,0,W,H,D);addBox(g,'#8a7764',0,.35,0,W+.2,.7,D+.2);
  for(const x of [-1,1])for(const z of [-1,1])addBox(g,TRIM,x*(W/2-.05),H/2,z*(F-.05),.4,H,.4);
  addBox(g,TRIM,0,H+.05,0,W+.3,.3,D+.3);
  // gambrel: solid gable ends (one extrusion along x) + four roof slabs
  {const gab=ext([[-F,0],[F,0],[F/2,2.6],[0,3.8],[-F/2,2.6]],W,RED);gab.rotation.y=Math.PI/2;gab.position.set(-W/2,H,0);g.add(gab);}
  for(const sd of [-1,1]){const lo=Math.hypot(F/2+.5,2.6),up=Math.hypot(F/2,1.2);
    slab(ROOF,0,H+1.3-.05,sd*(F*.75+.25),W+1,.4,lo+.25,sd*Math.atan2(2.6,F/2+.5));
    slab(ROOF,0,H+3.2,sd*F/4,W+1,.4,up+.3,sd*Math.atan2(1.2,F/2));}
  addBox(g,'#3f574a',0,H+3.85,0,W+1,.25,.5);
  // cupola + weathervane on the ridge
  {const y0=H+3.8;addBox(g,TRIM,0,y0+.75,0,1.7,1.5,1.7);for(const r of [0,Math.PI/2]){const l=addBox(g,'#6d4a33',0,y0+.85,0,1.75,.9,.9);l.rotation.y=r;}
   const cap=new T.Mesh(geo(new T.ConeGeometry(1.45,1.2,4)),mat(ROOF));cap.position.set(0,y0+2.1,0);cap.rotation.y=Math.PI/4;cap.castShadow=true;g.add(cap);
   addBox(g,'#3b3530',0,y0+3.2,0,.08,1.6,.08);addBox(g,'#3b3530',0,y0+3.3,0,1.3,.06,.06);
   const vane=new T.Group();vane.position.set(0,y0+3.95,0);addBox(vane,'#3b3530',0,0,0,.9,.32,.06);addBox(vane,'#3b3530',.5,.28,0,.22,.5,.06);addBox(vane,'#3b3530',.66,.48,0,.32,.16,.06);for(const lx of [-.32,.3])addBox(vane,'#3b3530',lx,-.3,0,.07,.3,.06);addBox(vane,'#3b3530',-.52,.06,0,.24,.07,.06);g.add(vane);}
  // front cross-gable over the doors
  const E=1.2,ew=3.6;addBox(g,RED,0,(H+.6)/2,F+E/2,ew*2,H+.6,E);
  {const tri=ext([[-ew-.2,0],[ew+.2,0],[0,2.7]],E+.2,RED);tri.position.set(0,H+.6,F-.1);g.add(tri);}
  for(const sd of [-1,1])slab(ROOF,sd*(ew+.2)/2,H+.6+1.35+.12,F+E/2+.15,Math.hypot(ew+.2,2.7)+.5,.35,E+1.5,0,-sd*Math.atan2(2.7,ew+.2));
  addBox(g,TRIM,0,H+.62,F+E+.02,ew*2+.3,.25,.12);
  // hay-loft door + round window in the gable
  addBox(g,TRIM,0,H+1.35,F+E+.12,1.5,1.25,.08);addBox(g,'#7a3324',0,H+1.35,F+E+.17,1.25,1.05,.08);
  // sliding doors: track, two X-braced panels slid a little apart, warm light in the gap
  const dz=F+E+.04;addBox(g,'#3e3a36',0,4.75,dz+.12,7.4,.16,.12);addBox(g,GLOW,0,2.15,dz-.02,1.4,4.2,.06);
  for(const sd of [-1,1]){const cx=sd*1.75;addBox(g,'#7a3324',cx,2.2,dz+.1,2.5,4.3,.12);
    addBox(g,TRIM,cx,4.27,dz+.18,2.5,.18,.06);addBox(g,TRIM,cx,.13,dz+.18,2.5,.18,.06);addBox(g,TRIM,cx-1.16,2.2,dz+.18,.18,4.3,.06);addBox(g,TRIM,cx+1.16,2.2,dz+.18,.18,4.3,.06);addBox(g,TRIM,cx,2.2,dz+.18,2.4,.14,.06);
    for(const yy of [1.17,3.23]){const a=Math.atan2(2.0,2.3);for(const r of [a,-a]){const xb=addBox(g,TRIM,cx,yy,dz+.2,Math.hypot(2.3,2.0)-.15,.13,.05);xb.rotation.z=r;}}
    for(const hy of [4.6])addBox(g,'#3e3a36',cx-.6*sd,hy,dz+.2,.12,.35,.08);}
  // painted hanging sign (canvas) under the cross-gable
  {const c=document.createElement('canvas');c.width=512;c.height=160;const x=c.getContext('2d');x.fillStyle='#f6ead0';x.fillRect(0,0,512,160);x.strokeStyle='#6b4a2e';x.lineWidth=12;x.strokeRect(6,6,500,148);
   x.lineWidth=13;x.strokeStyle='#8a5a2c';x.lineCap='round';x.beginPath();x.arc(70,78,30,Math.PI*.82,Math.PI*2.18,false);x.stroke();x.fillStyle='#6b4a2e';for(const t of [-.55,-.25,.25,.55])x.fillRect(70+Math.sin(t*2.6)*30-3,78-Math.cos(t*2.6)*30-3,6,6);
   x.textAlign='center';x.textBaseline='middle';x.font='800 50px Georgia, serif';x.fillText('HOOFHAVEN',318,62);x.font='700 28px system-ui, sans-serif';x.fillStyle='#b5553f';x.fillText('HORSE MARKET',318,116);
   const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;tx.anisotropy=4;const sm=new T.MeshStandardMaterial({map:tx,roughness:.9});
   const board=new T.Mesh(geo(new T.BoxGeometry(5.2,1.62,.14)),[mat('#6b4a2e'),mat('#6b4a2e'),mat('#6b4a2e'),mat('#6b4a2e'),sm,mat('#6b4a2e')]);board.position.set(0,5.55,dz+.35);board.castShadow=true;g.add(board);
   for(const sx of [-1.9,1.9])addBox(g,'#3e3a36',sx,6.45,dz+.35,.06,.2,.06);}
  // windows: glass (lit at night), white frame, green shutters, flower boxes on the front
  const win=(x,y,z,face,box=true)=>{const o=new T.Group();o.position.set(x,y,z);o.rotation.y=face;g.add(o);addBox(o,TRIM,0,0,.04,1.5,1.3,.08);addBox(o,GLOW,0,0,.1,1.15,.95,.06);addBox(o,TRIM,0,0,.14,.1,.95,.04);addBox(o,TRIM,0,0,.14,1.15,.1,.04);
    for(const sd of [-1,1])addBox(o,'#5d7f5a',sd*1.05,0,.08,.55,1.3,.08);
    if(box){addBox(o,'#7a5634',0,-.85,.25,1.7,.35,.4);for(let i=0;i<6;i++)ico(o,['#e98aa8','#f6d36b','#ffffff','#c9a0e8'][i%4],-.65+i*.26,-.6,.28,.13,.13,.13);for(let i=0;i<4;i++)ico(o,'#6f9d58',-.55+i*.36,-.68,.33,.16,.1,.12);}};
  for(const x of [-6.6,6.6])win(x,2.7,F,0);
  for(const x of [-6.6,0,6.6])win(x,2.9,-F,Math.PI,false);
  for(const sd of [-1,1])for(const z of [-3.2,0,3.2])win(sd*W/2,2.9,z,sd*Math.PI/2,false);
  // lanterns either side of the doors
  for(const sd of [-1,1]){const lx=sd*(ew+.55);addBox(g,'#3e3a36',lx,3.55,F+.25,.12,.12,.5);addBox(g,'#3e3a36',lx,3.25,F+.5,.46,.1,.46);addBox(g,GLOW,lx,2.98,F+.5,.34,.48,.34);addBox(g,'#3e3a36',lx,2.7,F+.5,.42,.08,.42);}
  // half-barrel planters by the doors, a hitching rail and hay bales out front
  const out=[];const plant=(x,z)=>{const b=new T.Mesh(geo(new T.CylinderGeometry(.55,.45,.6,10)),mat('#7a5634'));b.position.set(x,.3,z);b.castShadow=true;g.add(b);for(let i=0;i<7;i++)ico(g,['#e98aa8','#f6d36b','#ffffff','#6f9d58','#6f9d58'][i%5],x+Math.cos(i*.9)*.3,.72+(i%2)*.12,z+Math.sin(i*.9)*.3,.17,.17,.17);out.push([x,z,.6,.6]);};
  plant(-ew-.7,F+E+.7);plant(ew+.7,F+E+.7);
  {const rx=-6.8,rz=F+4.2;for(const px of [-1.5,1.5])addBox(g,'#8a6a48',rx+px,.6,rz,.22,1.2,.22);addBox(g,'#8a6a48',rx,1.12,rz,3.4,.16,.18);out.push([rx,rz,1.8,.3]);}
  {const hx=6.9,hz=F+2.6;addBox(g,'#dcbc62',hx,.42,hz,1.5,.84,.95);addBox(g,'#dcbc62',hx+1.2,.42,hz+.3,1.5,.84,.95);const top=addBox(g,'#e6c970',hx+.55,1.26,hz+.15,1.5,.84,.95);top.rotation.y=.35;for(const bx of [hx,hx+1.2])addBox(g,'#b9963f',bx,.42,hz+(bx>hx?.3:0),1.52,.86,.08);out.push([hx+.6,hz+.15,1.5,.8]);}
  // turn round to face the path (-z) and register obstacles in world coordinates
  g.rotation.y=Math.PI;g.position.set(s.x,terrainHeight(s.x,s.z),s.z);outdoors.add(g);
  obstacles.push({kind:'box',x:s.x,z:s.z,hx:W/2+.3,hz:D/2+.3,height:H+5});obstacles.push({kind:'box',x:s.x,z:s.z-F-E/2,hx:ew+.3,hz:E/2+.1,height:H+3});
  for(const [x,z,hx,hz] of out)obstacles.push({kind:'box',x:s.x-x,z:s.z-z,hx,hz,height:2});
  sign(outdoors,'HOOFHAVEN HORSE MARKET',s.x,terrainHeight(s.x,s.z)+H+9,s.z,7);
  hoofhaven=g;}
 // Nine regions: move each design-spot piece above to its block's place in the world (world-regions.mjs).
 for(const o of [...lit.children]){const p=R(o.position.x,o.position.z),dy=terrainHeight(p.x,p.z)-terrainHeight(o.position.x,o.position.z);o.position.set(p.x,o.position.y+dy,p.z);outdoors.add(o);}
 for(const o of litObs)obstacles.push({...o,...R(o.x,o.z)});
 const lands=buildNewLands({T,outdoors,geo,mat,sign,obstacles,smoothTree});
 return {lands,hoofhaven,interior,floor,marketFloor:barn.marketFloor,setPlate:barn.setPlate,walls,obstacles,indoorObstacles,shopGate:barn.shopGate,door:barn.door,plaque:barn.plaque,disposeBarn:barn.dispose,raceFlags,tick(time){wheel.rotation.z=time*.0003;}};
}

// ---- v103 new lands: rivers + bridges, mountains' pines, wheat and flower fields, water mills and windmills,
// Thimbleford (a cobbled Tudor town square with a clock tower) and Pegasus Perch. Data: world-content.mjs.
// Static pieces are baked by colour (one mesh per colour, so a phone draws few objects); moving parts (wheels, sails,
// clock hands, water) stay separate and turn in tick(dt,hours).
function buildNewLands({T,outdoors,geo,mat,sign,obstacles,smoothTree}){
 const g=new T.Group();g.name='new-lands';outdoors.add(g);const own=[];
 const H=(x,z)=>terrainHeight(x,z);
 // -- baker --
 const prism=(()=>{const sh=new T.Shape();sh.moveTo(-.5,0);sh.lineTo(.5,0);sh.lineTo(0,1);sh.lineTo(-.5,0);const e=new T.ExtrudeGeometry(sh,{depth:1,bevelEnabled:false});e.translate(0,0,-.5);return e.index?e.toNonIndexed():e;})();
 const NI=g0=>g0.index?g0.toNonIndexed():g0;
 const P={box:new T.BoxGeometry(1,1,1).toNonIndexed(),cyl:new T.CylinderGeometry(.5,.5,1,10).toNonIndexed(),cyl6:new T.CylinderGeometry(.5,.5,1,6).toNonIndexed(),cone4:new T.ConeGeometry(.5*Math.SQRT2,1,4).rotateY(Math.PI/4).toNonIndexed(),cone:new T.ConeGeometry(.5,1,8).toNonIndexed(),ico:new T.IcosahedronGeometry(.5,0),prism,taper:new T.CylinderGeometry(.36,.5,1,8).toNonIndexed(),half:new T.SphereGeometry(.5,12,6,0,Math.PI*2,0,Math.PI/2).toNonIndexed()};
 for(const k in P)own.push(P[k]);
 const bins=new Map(),M=new T.Matrix4(),F=new T.Matrix4(),q=new T.Quaternion(),eu=new T.Euler(),sv=new T.Vector3(),pv=new T.Vector3(),v=new T.Vector3(),n=new T.Vector3(),NM=new T.Matrix3();
 let frame=null;
 const at=(x,y,z,ry=0)=>{frame=new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(0,ry,0)),new T.Vector3(1,1,1));};
 const world=()=>{frame=null;};
 function add(hex,shape,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0){M.compose(pv.set(x,y,z),q.setFromEuler(eu.set(rx,ry,rz)),sv.set(sx,sy,sz));if(frame)M.premultiply(frame);NM.getNormalMatrix(M);
   const rk=REAL&&REAL[hex],key=rk?'R:'+rk+':'+hex:hex;
   let b=bins.get(key);if(!b)bins.set(key,b={p:[],n:[],uv:rk?[]:null,kind:rk,hex});const src=P[shape],pa=src.attributes.position.array,na=src.attributes.normal.array;
   for(let i=0;i<pa.length;i+=3){v.set(pa[i],pa[i+1],pa[i+2]).applyMatrix4(M);b.p.push(v.x,v.y,v.z);n.set(na[i],na[i+1],na[i+2]).applyMatrix3(NM).normalize();b.n.push(n.x,n.y,n.z);
     if(rk)b.uv.push(...realUV(rk,pa[i]*sx+x*0,pa[i+1]*sy,pa[i+2]*sz,na[i],na[i+1],na[i+2],sx,sy,sz));}}
 // v147: while REAL is set (Thimbleford), these colours bake with real textures (world-tudor.js), tinted by the colour.
 let REAL=null;const REAL_TINT={plaster:h=>'#'+new T.Color(h).lerp(new T.Color('#fff8ee'),.65).getHexString(),tiles:h=>({'#6b4f3a':'#e6cfc0','#7c5b3f':'#f3dccb','#8a5a3c':'#ffffff'})[h]||'#ffffff',ashlar:()=>'#fff6ea',stone:()=>'#fff4e6'};
 function bake(){for(const [hex,b] of bins){const bg=new T.BufferGeometry();bg.setAttribute('position',new T.Float32BufferAttribute(b.p,3));bg.setAttribute('normal',new T.Float32BufferAttribute(b.n,3));if(b.uv)bg.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));bg.computeBoundingSphere();const m=new T.Mesh(geo(bg),b.kind?realMat(T,mat,b.kind,REAL_TINT[b.kind]?.(b.hex)??'#ffffff'):mat(hex));m.castShadow=m.receiveShadow=true;g.add(m);}bins.clear();}
 const solid=(x,z,hx,hz,height=6)=>obstacles.push({kind:'box',x,z,hx,hz,height});
 let seed=1031;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 const GLOW='#f6e7b0',TIMBER='#4a3426',STONE='#cdbfa3',STONE2='#a99a7e',SLATE='#59606a';
 const canvasTex=(w,h,draw,rep=[1,1])=>{const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rep[0],rep[1]);t.anisotropy=4;own.push(t);return t;};

 // ======== rivers, ponds, bridges ========
 const ripple=canvasTex(128,128,(x,w,h)=>{x.fillStyle='#5aa6cf';x.fillRect(0,0,w,h);for(let i=0;i<70;i++){const px=Math.random()*w,py=Math.random()*h,l=6+Math.random()*16;x.strokeStyle=i%3?'#8fcbe6':'#ffffffb0';x.lineWidth=1.4;x.beginPath();x.moveTo(px,py);x.quadraticCurveTo(px+l/2,py-2,px+l,py);x.stroke();}});
 const waterMat=waterize(new T.MeshStandardMaterial({color:'#b9d4dc',map:ripple,transparent:true,opacity:.9,roughness:.14,metalness:.05,side:T.DoubleSide,depthWrite:false}),{amp:.1});own.push(waterMat);
 for(const r of RIVERS){const L=r.line.filter((_,i)=>i%2===0||i===r.line.length-1),pos=[],uv=[],idx=[];let acc=0;
   for(let i=0;i<L.length;i++){const a=L[Math.max(0,i-1)],b=L[Math.min(L.length-1,i+1)],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz)||1,nx=-dz/len,nz=dx/len,hw=r.w/2+.35,[x,z]=L[i];
     if(i)acc+=Math.hypot(L[i][0]-L[i-1][0],L[i][1]-L[i-1][1]);
     for(const s of [-1,1]){const X=x+nx*hw*s,Z=z+nz*hw*s;pos.push(X,riverWaterY(x,z),Z);uv.push(s<0?0:r.w/7,acc/7);}
     if(i){const k=(i-1)*2;idx.push(k,k+2,k+1,k+1,k+2,k+3);}}
   const bg=new T.BufferGeometry();bg.setAttribute('position',new T.Float32BufferAttribute(pos,3));bg.setAttribute('uv',new T.Float32BufferAttribute(uv,2));bg.setIndex(idx);bg.computeVertexNormals();
   const m=new T.Mesh(geo(bg),waterMat);m.receiveShadow=true;g.add(m);
   const p=r.pond,pm=new T.Mesh(geo(new T.CircleGeometry(p.r+.4,28).rotateX(-Math.PI/2)),waterMat);pm.position.set(p.x,riverWaterY(p.x,p.z),p.z);g.add(pm);
   obstacles.push({kind:'lake',x:p.x,z:p.z,rx:p.r-.6,rz:p.r-.6,height:100});
   // reeds and pebbles along the banks
   for(let i=8;i<r.line.length-4;i+=9){const [x,z]=r.line[i],[x2,z2]=r.line[i+1],dx=x2-x,dz=z2-z,len=Math.hypot(dx,dz)||1,nx=-dz/len,nz=dx/len,s=(i/9)%2?1:-1,bx=x+nx*(r.w/2+.9)*s,bz=z+nz*(r.w/2+.9)*s;
     if(onBridge(bx,bz,2))continue;const y=H(bx,bz);
     if(rnd()<.6)for(let k=0;k<4;k++)add(k%2?'#5f8a4a':'#6f9a52','cone',bx+(rnd()-.5)*1.2,y+.5,bz+(rnd()-.5)*1.2,.12,1.1+rnd()*.5,.12);
     else add('#a9a497','ico',bx,y+.15,bz,.7+rnd()*.5,.4,.6+rnd()*.4);}}
 for(const b of BRIDGES){const stone=b.river==='willow',top=x=>x;at(b.x,0,b.z,b.ang);const half=b.len/2+.6,N=8;
   for(let i=0;i<N;i++){const t0=-half+i*2*half/N,t1=t0+2*half/N,tm=(t0+t1)/2,wx=b.x+Math.sin(b.ang)*tm,wz=b.z+Math.cos(b.ang)*tm,y=bridgeFloor(wx,wz),y0=bridgeFloor(b.x+Math.sin(b.ang)*t0,b.z+Math.cos(b.ang)*t0),y1=bridgeFloor(b.x+Math.sin(b.ang)*t1,b.z+Math.cos(b.ang)*t1),tilt=Math.atan2(y1-y0,t1-t0);
     add(stone?STONE:'#9a7452','box',0,y-.2,tm,b.w,.4,2*half/N+.06,-tilt);
     for(const sd of [-1,1]){if(stone)add(STONE2,'box',sd*(b.w/2-.18),y+.35,tm,.36,.9,2*half/N+.06,-tilt);else{add('#7a5634','box',sd*(b.w/2-.12),y+.95,tm,.12,.12,2*half/N+.06,-tilt);if(i%2===0)add('#7a5634','box',sd*(b.w/2-.12),y+.5,t0+.1,.16,1,.16);}}}
   if(stone){const yb=riverWaterY(b.x,b.z);for(const sd of [-1,1]){add(STONE2,'box',0,yb-.1,sd*(b.len/2-1.6),b.w+.6,1.1,1.6);for(const sx of [-1,1])add(STONE,'box',sx*(b.w/2+.15),yb+1.3,sd*(half-.2),.6,1.2,.6);}}
   else for(const t of [-1.2,1.2])add('#6b4a30','box',0,riverWaterY(b.x,b.z)-.1,t,b.w-.6,.6,.3);
   world();}

 // ======== mountains: pines on the lower slopes, snow from the chunk colours ========
 for(const m of MOUNTAINS){for(let i=0;i<46;i++){const a=rnd()*Math.PI*2,d=m.r*(.35+rnd()*.6),x=m.x+Math.cos(a)*d,z=m.z+Math.sin(a)*d;if(Math.abs(x)>298||Math.abs(z)>298)continue;const y=H(x,z),lift=mountainLift(x,z);if(lift<2||lift>m.h*.62)continue;const s=.8+rnd()*.7;
   add('#6d5a44','box',x,y+.6*s,z,.3*s,1.2*s,.3*s);add(rnd()<.5?'#3f6b4a':'#4d7b52','cone',x,y+2.4*s,z,2.2*s,3.4*s,2.2*s);if(m.snow&&lift>m.h*.4)add('#f4f6f8','cone',x,y+3.6*s,z,1*s,1.1*s,1*s);}}

 // ======== fields ========
 const fieldPts=(f,step,fn)=>{const c=Math.cos(f.rot),s=Math.sin(f.rot);for(let u=-f.w/2+step/2;u<f.w/2;u+=step)for(let w=-f.d/2+step/2;w<f.d/2;w+=step){const ju=u+(rnd()-.5)*step*.5,jw=w+(rnd()-.5)*step*.5;fn(f.x+ju*c+jw*s,f.z-ju*s+jw*c,u,w);}};
 const swayU={value:0};
 const swayMat=(color)=>{const m=new T.MeshStandardMaterial({color,roughness:.9,flatShading:true});m.onBeforeCompile=sh=>{sh.uniforms.uSway=swayU;sh.vertexShader='uniform float uSway;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n  #ifdef USE_INSTANCING\n  float sw=sin(uSway*1.7+instanceMatrix[3].x*.31+instanceMatrix[3].z*.23)*.16*max(0.,position.y);transformed.x+=sw;transformed.z+=sw*.5;\n  #endif');};m.customProgramCacheKey=()=>'sway-v1';own.push(m);return m;};
 {const stalk=new T.ConeGeometry(.07,1.15,4),head=new T.IcosahedronGeometry(.13,0).scale(1,1.9,1).translate(0,.62,0),parts=[];
   for(const [dx,dz] of [[0,0],[.28,.12],[-.22,.2],[.08,-.27]]){parts.push(stalk.clone().translate(dx,.57,dz).toNonIndexed(),head.clone().translate(dx,.57,dz));}
   const merged=new T.BufferGeometry(),arr=[];for(const p of parts)arr.push(...p.attributes.position.array);merged.setAttribute('position',new T.Float32BufferAttribute(arr,3));merged.computeVertexNormals();own.push(stalk,head,merged);
   const wheat=FIELDS.filter(f=>f.kind==='wheat'),spots=[];for(const f of wheat)fieldPts(f,1.25,(x,z)=>spots.push([x,z]));
   const im=new T.InstancedMesh(merged,swayMat('#ffffff'),spots.length),mm=new T.Matrix4(),cc=new T.Color();spots.forEach(([x,z],i)=>{const s=.85+rnd()*.35;mm.compose(pv.set(x,H(x,z),z),q.setFromEuler(eu.set(0,rnd()*6.28,0)),sv.set(s,s*(.9+rnd()*.25),s));im.setMatrixAt(i,mm);im.setColorAt(i,cc.set(['#e2bd52','#d9b247','#eccb63','#d4a940'][i%4]));});
   im.castShadow=false;im.receiveShadow=true;g.add(im);
   for(const f of wheat){const c=Math.cos(f.rot),s=Math.sin(f.rot);for(const [u,w] of [[-1,-1],[1,-1],[1,1],[-1,1]]){}
     // a stook or two and a scarecrow
     const sx=f.x+f.w*.3*c,sz=f.z-f.w*.3*s,y=H(sx,sz);add('#7a5634','box',sx,y+1.1,sz,.14,2.2,.14);add('#7a5634','box',sx,y+1.6,sz,1.8,.12,.12,0,f.rot);add('#c96a4a','box',sx,y+1.45,sz,.6,.8,.35,0,f.rot);add('#e9d39a','ico',sx,y+2.15,sz,.42,.46,.42);add('#b78a3c','cone',sx,y+2.5,sz,.9,.3,.9);
     for(let k=0;k<4;k++){const hx=f.x+(k-1.5)*f.w*.18*c+f.d*.42*s,hz=f.z-(k-1.5)*f.w*.18*s+f.d*.42*c,hy=H(hx,hz);add('#d9b247','cone',hx,hy+.6,hz,.9,1.3,.9);add('#c79f3e','box',hx,hy+.55,hz,.95,.12,.95);}}}
 {const flowers=FIELDS.filter(f=>f.kind==='flowers'),spots=[],COLS=['#e84a6f','#f6c945','#ffffff','#b26ad6','#ff8a3d','#f49ac1','#5b8de0'];
   for(const [fi,f] of flowers.entries()){const c=Math.cos(f.rot),s=Math.sin(f.rot);for(let w=-f.d/2+.6,row=0;w<f.d/2;w+=1.25,row++){const col=COLS[(row+fi*2)%COLS.length];
     {const x=f.x+w*s,z=f.z+w*c,y=H(x,z);add('#4f7f42','box',x,y+.08,z,f.w,.16,.7,0,f.rot);}
     for(let u=-f.w/2+.4;u<f.w/2;u+=.62){const jx=(rnd()-.5)*.25,x=f.x+(u+jx)*c+w*s,z=f.z-(u+jx)*s+w*c;spots.push([x,z,col]);}}}
   const head=new T.IcosahedronGeometry(.24,0).translate(0,.42,0);const stem=new T.CylinderGeometry(.03,.03,.4,3).translate(0,.2,0);const merged=new T.BufferGeometry();merged.setAttribute('position',new T.Float32BufferAttribute([...head.attributes.position.array,...stem.toNonIndexed().attributes.position.array],3));merged.computeVertexNormals();own.push(head,stem,merged);
   const im=new T.InstancedMesh(merged,swayMat('#ffffff'),spots.length),mm=new T.Matrix4(),cc=new T.Color();spots.forEach(([x,z,col],i)=>{const sc=.8+rnd()*.5;mm.compose(pv.set(x,H(x,z)+.1,z),q.setFromEuler(eu.set(0,rnd()*6,0)),sv.set(sc,sc,sc));im.setMatrixAt(i,mm);im.setColorAt(i,cc.set(col));});g.add(im);}

 // ======== mills ========
 const turning=[];
 for(const m of MILLS){const y=H(m.x,m.z);
   if(m.kind==='wind'){add('#efe6d2','taper',m.x,y+5,m.z,4.4,10,4.4);add('#8a7764','cyl6',m.x,y+.4,m.z,5,.8,5);add('#6b4f3a','cone',m.x,y+11.2,m.z,4.6,2.6,4.6);add('#5b3a24','box',m.x,y+1.2,m.z+2.05,1.1,2.2,.2);
     for(const yy of [4,7.2])add(GLOW,'box',m.x,y+yy,m.z+1.95,.8,.9,.12);add('#4a3426','box',m.x,y+2.6,m.z+2.4,3,.18,1);
     const hub=new T.Group();hub.position.set(m.x,y+10,m.z+2.6);g.add(hub);const sails=new T.Group();hub.add(sails);
     for(let k=0;k<4;k++){const arm=new T.Group();arm.rotation.z=k*Math.PI/2;sails.add(arm);const beam=new T.Mesh(geo(new T.BoxGeometry(.25,7,.2)),mat('#6b4f3a'));beam.position.y=3.5;arm.add(beam);
       const sail=new T.Mesh(geo(new T.BoxGeometry(1.5,5.4,.08)),mat('#f6efe0'));sail.position.set(.85,4,0);arm.add(sail);for(const sy of [2,3.4,4.8,6.2]){const bar=new T.Mesh(geo(new T.BoxGeometry(1.7,.08,.12)),mat('#6b4f3a'));bar.position.set(.85,sy,.06);arm.add(bar);}}
     const cap=new T.Mesh(geo(new T.CylinderGeometry(.45,.45,.8,8)),mat('#4a3426'));cap.rotation.x=Math.PI/2;hub.add(cap);turning.push({o:sails,axis:'z',speed:.55});solid(m.x,m.z,2.4,2.4,12);}
   else{const r=RIVERS.find(rv=>rv.id===m.river);let best=null,bd=1e9;for(const p of r.line){const d=Math.hypot(p[0]-m.x,p[1]-m.z);if(d<bd){bd=d;best=p;}}
     const toR=Math.atan2(best[0]-m.x,best[1]-m.z);at(m.x,y,m.z,toR);
     add(STONE,'box',0,1.5,0,7,3,6);add('#f4ecd8','box',0,4.1,0,7,2.2,6);for(const xx of [-3.4,0,3.4])add(TIMBER,'box',xx,4.1,3.02,.22,2.2,.06);add(TIMBER,'box',0,3.05,3.04,7,.2,.06);add(TIMBER,'box',0,5.15,3.04,7,.2,.06);
     add(SLATE,'prism',0,5.2,0,7.8,2.6,6.8,0,Math.PI/2);add('#9a5b45','box',2.4,6.6,-1.2,.8,2,.8);for(const xx of [-1.8,1.8]){add(GLOW,'box',xx,1.8,-3.03,1,1,.08);add(GLOW,'box',xx,4.1,-3.03,1,.9,.08);}add('#5b3a24','box',0,1.1,-3.05,1.2,2.2,.1);
     add(TIMBER,'box',0,1,3.6,.4,.4,1.4);world();
     const wheel=new T.Group(),wy=riverWaterY(best[0],best[1])+.9,wx=m.x+Math.sin(toR)*(bd-r.w/2+.6),wz=m.z+Math.cos(toR)*(bd-r.w/2+.6);wheel.position.set(wx,wy,wz);wheel.rotation.y=toR+Math.PI/2;g.add(wheel);const spin=new T.Group();wheel.add(spin);
     const wood=mat('#7a5634');for(let k=0;k<12;k++){const a=k/12*Math.PI*2,pad=new T.Mesh(geo(new T.BoxGeometry(.18,.7,1.3)),wood);pad.position.set(Math.cos(a)*2.1,Math.sin(a)*2.1,0);pad.rotation.z=a;spin.add(pad);}
     for(let k=0;k<6;k++){const sp=new T.Mesh(geo(new T.BoxGeometry(4.2,.14,.14)),wood);sp.rotation.z=k*Math.PI/6;spin.add(sp);}const rim=new T.Mesh(geo(new T.TorusGeometry(2.1,.09,4,24)),wood);spin.add(rim);
     turning.push({o:spin,axis:'z',speed:-.7});const cx=m.x,cz=m.z;solid(cx,cz,Math.abs(Math.cos(toR))*3.6+Math.abs(Math.sin(toR))*3.2,Math.abs(Math.sin(toR))*3.6+Math.abs(Math.cos(toR))*3.2,7);}
   if(!LOCATIONS.some(l=>Math.hypot(l.x-m.x,l.z-m.z)<12))sign(g,m.name.toUpperCase(),m.x,y+(m.kind==='wind'?15.5:9),m.z,5.5);}

 // ======== Thimbleford: cobbled square, clock tower, Tudor houses, gardens ========
 const TW=TOWN2,PX=TW.x,PZ=TW.z,PW=COBBLE_SQUARE.w,PD=COBBLE_SQUARE.d;
 const cobble=canvasTex(256,256,(x,w,h)=>{x.fillStyle='#8f8a80';x.fillRect(0,0,w,h);const r=(a)=>Math.floor(Math.random()*a);for(let row=0;row<16;row++)for(let col=0;col<11;col++){const cx=(col+(row%2)*.5)*24,cy=row*16+8,cw=19+r(4),ch=12+r(3);x.fillStyle=['#b8b0a2','#a9a193','#c4bcae','#9f988b','#b2a99a'][r(5)];x.beginPath();x.roundRect(cx-cw/2,cy-ch/2,cw,ch,5);x.fill();x.fillStyle='#ffffff22';x.beginPath();x.roundRect(cx-cw/2+2,cy-ch/2+2,cw*.5,ch*.35,3);x.fill();}},[1,1]);
 const cobMat=new T.MeshStandardMaterial({map:cobble,roughness:.95});own.push(cobMat);
 const drape=(geoP)=>{const p=geoP.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,H(p.getX(i),p.getZ(i))+.09);p.needsUpdate=true;geoP.computeVertexNormals();return geoP;};
 {const pl=new T.PlaneGeometry(PW,PD,18,15).rotateX(-Math.PI/2).translate(PX,0,PZ);const uv=pl.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*PW/6,uv.getY(i)*PD/6);const m=new T.Mesh(geo(drape(pl)),cobMat);m.receiveShadow=true;m.renderOrder=-5;g.add(m);}
 for(const route of COBBLE_STREETS){const pts=[];const [a,b]=route,len=Math.hypot(b[0]-a[0],b[1]-a[1]),N=Math.ceil(len/2);for(let i=0;i<=N;i++)pts.push([a[0]+(b[0]-a[0])*i/N,a[1]+(b[1]-a[1])*i/N]);
   const pos=[],uv=[],idx=[],dx=(b[0]-a[0])/len,dz=(b[1]-a[1])/len,nx=-dz,nz=dx,hw=COBBLE_HALF;pts.forEach(([x,z],i)=>{if(onBridge(x,z,1.5)){}for(const s of [-1,1]){const X=x+nx*hw*s,Z=z+nz*hw*s;pos.push(X,Math.max(H(X,Z),bridgeFloor(X,Z)-.25)+.1,Z);uv.push(s<0?0:.7,i*2/6);}if(i){const k=(i-1)*2;idx.push(k,k+2,k+1,k+1,k+2,k+3);}});
   const bg=new T.BufferGeometry();bg.setAttribute('position',new T.Float32BufferAttribute(pos,3));bg.setAttribute('uv',new T.Float32BufferAttribute(uv,2));bg.setIndex(idx);bg.computeVertexNormals();const m=new T.Mesh(geo(bg),cobMat);m.receiveShadow=true;m.renderOrder=-5;g.add(m);}
 // v147: Thimbleford in real materials (oak, lime plaster in each house's colour, dressed stone, slate, clay tiles).
 REAL={[TIMBER]:'oak','#5b3a24':'oak',[STONE]:'ashlar',[STONE2]:'stone',[SLATE]:'slate','#f4ecd8':'plaster','#efe2c4':'plaster','#f6efe0':'plaster','#e9dcc0':'plaster','#f1e4cf':'plaster',
   '#6b4f3a':'tiles','#7c5b3f':'tiles','#8a5a3c':'tiles','#5a5f68':'slate','#9a5b45':'brick','#7b4637':'brick'};
 // the clock tower
 const C=TW.clock,cy=H(C.x,C.z);
 add(STONE,'box',C.x,cy+5,C.z,4.6,10,4.6);for(const [sx,sz] of [[-1,-1],[1,-1],[1,1],[-1,1]])for(let k=0;k<10;k++)add(STONE2,'box',C.x+sx*2.25,cy+.5+k,C.z+sz*2.25,.5,.5,.5,0,k%2?0:.0);
 add(STONE2,'box',C.x,cy+.3,C.z,5.2,.6,5.2);add('#5b3a24','box',C.x,cy+1.3,C.z+2.32,1.4,2.6,.1);add(STONE2,'box',C.x,cy+2.7,C.z+2.36,1.8,.25,.14);
 add('#f4ecd8','box',C.x,cy+12,C.z,4.3,4,4.3);for(const s of [-1,1]){for(const yy of [10.1,13.9])add(TIMBER,'box',C.x,cy+yy,C.z+s*2.17,4.4,.22,.08);for(const yy of [10.1,13.9])add(TIMBER,'box',C.x+s*2.17,cy+yy,C.z,.08,.22,4.4);for(const xx of [-2.05,2.05]){add(TIMBER,'box',C.x+xx,cy+12,C.z+s*2.17,.22,4,.08);add(TIMBER,'box',C.x+s*2.17,cy+12,C.z+xx,.08,4,.22);}}
 // v159 (Yoshi: "get to the top of the clock tower and have a nice lookout point"): an open lookout gallery above the
 // clock, under a raised slate roof. Floor top at cy+14.25 (world.js walks it: TOWER_DECK); oak corner posts, a waist-high
 // balustrade, a bell under the roof and a stair hatch in the middle. The spire moved up 3.2 m with it.
 add(STONE2,'box',C.x,cy+14.1,C.z,6.2,.3,6.2);add(STONE2,'box',C.x,cy+13.85,C.z,5.4,.25,5.4);
 for(const [sx,sz] of [[-1,-1],[1,-1],[1,1],[-1,1]])add(TIMBER,'box',C.x+sx*2.9,cy+15.75,C.z+sz*2.9,.32,3,.32);
 for(const s of [-1,1]){add(TIMBER,'box',C.x,cy+15.3,C.z+s*2.95,5.9,.14,.16);add(TIMBER,'box',C.x+s*2.95,cy+15.3,C.z,.16,.14,5.9);add(TIMBER,'box',C.x,cy+14.35,C.z+s*2.95,5.9,.12,.16);add(TIMBER,'box',C.x+s*2.95,cy+14.35,C.z,.16,.12,5.9);
   for(let k=-5;k<=5;k++){if(Math.abs(k)===5)continue;add(TIMBER,'box',C.x+k*.52,cy+14.82,C.z+s*2.95,.09,.85,.09);add(TIMBER,'box',C.x+s*2.95,cy+14.82,C.z+k*.52,.09,.85,.09);}}
 add(TIMBER,'box',C.x,cy+17.3,C.z,6.4,.22,6.4);
 // stair hatch: a low oak kerb round a dark opening, a handrail on two sides
 add('#2b2117','box',C.x,cy+14.26,C.z,1.3,.02,1.3);for(const s of [-1,1]){add(TIMBER,'box',C.x,cy+14.32,C.z+s*.7,1.5,.12,.12);add(TIMBER,'box',C.x+s*.7,cy+14.32,C.z,.12,.12,1.5);}
 for(const s of [-1,1]){add(TIMBER,'box',C.x+s*.72,cy+14.75,C.z,.08,.08,1.45);for(const t of [-1,1])add(TIMBER,'box',C.x+s*.72,cy+14.55,C.z+t*.68,.08,.5,.08);}
 add('#b8892f','half',C.x,cy+16.3,C.z,1.1,1.1,1.1);add('#8a6420','box',C.x,cy+16.9,C.z,.12,.9,.12);
 add(SLATE,'cone4',C.x,cy+20.4,C.z,6.9,6.4,6.9);add('#c9a24a','box',C.x,cy+24.2,C.z,.1,1.6,.1);add('#c9a24a','ico',C.x,cy+23.8,C.z,.45,.45,.45);
 for(const [k,yy] of [[0,8.1],[1,8.1],[2,8.1],[3,8.1]]){const a=k*Math.PI/2;add(GLOW,'box',C.x+Math.sin(a)*2.32,cy+yy,C.z+Math.cos(a)*2.32,.8,1.2,.08,0,a);}
 solid(C.x,C.z,2.7,2.7,22);
 const hands=[];{const faceM=mat('#fbf6e8'),rimM=mat('#c9a24a'),handM=mat('#2b2622');
   for(let k=0;k<4;k++){const a=k*Math.PI/2,face=new T.Group();face.position.set(C.x+Math.sin(a)*2.2,cy+12,C.z+Math.cos(a)*2.2);face.rotation.y=a;g.add(face);
     const disc=new T.Mesh(geo(new T.CylinderGeometry(1.45,1.45,.12,24)),rimM);disc.rotation.x=Math.PI/2;face.add(disc);const disc2=new T.Mesh(geo(new T.CylinderGeometry(1.25,1.25,.14,24)),faceM);disc2.rotation.x=Math.PI/2;disc2.position.z=.02;face.add(disc2);
     for(let t=0;t<12;t++){const tick=new T.Mesh(geo(new T.BoxGeometry(.08,t%3?.16:.3,.04)),handM);const ta=t/12*Math.PI*2;tick.position.set(Math.sin(ta)*1.05,Math.cos(ta)*1.05,.1);tick.rotation.z=-ta;face.add(tick);}
     const hr=new T.Group(),mn=new T.Group();hr.position.z=mn.position.z=.12;face.add(hr,mn);const hb=new T.Mesh(geo(new T.BoxGeometry(.13,.65,.05)),handM);hb.position.y=.3;hr.add(hb);const mb=new T.Mesh(geo(new T.BoxGeometry(.08,.95,.05)),handM);mb.position.y=.45;mn.position.z=.15;mn.add(mb);hands.push({hr,mn});}}
 // Tudor houses: plaster and dark timber, a jettied upper floor, a steep gable to the street, chimney, leaded windows
 const PLASTER=['#f4ecd8','#efe2c4','#f6efe0','#e9dcc0','#f1e4cf'],ROOFS=['#6b4f3a','#7c5b3f','#5a5f68','#8a5a3c'],DOORS=['#5b3a24','#2f5d50','#7a2e2a','#34506e'];
 const HOUSES=[];   // v159: world.js makes each one walk-in (world-houses.js)
 function house(x,z,yaw,w=7.6,d=6.4,i=0){const y=H(x,z),h1=3,h2=2.7,j=.55,pl=PLASTER[i%PLASTER.length];at(x,y,z,yaw);HOUSES.push({i,x,z,yaw,w,d,j,y,plaster:pl,door:DOORS[i%DOORS.length]});
   add(STONE2,'box',0,.25,0,w+.2,.5,d+.2);add(pl,'box',0,h1/2+.25,0,w,h1,d);add(pl,'box',0,h1+.25+h2/2,j/2,w,h2,d+j);
   const fz=d/2+.03,fz2=d/2+j+.03;
   for(const xx of [-w/2+.1,-w/6,w/6,w/2-.1]){add(TIMBER,'box',xx,h1/2+.25,fz,.24,h1,.08);add(TIMBER,'box',xx,h1+.25+h2/2,fz2,.24,h2,.08);}
   for(const yy of [.4,h1+.25])add(TIMBER,'box',0,yy,fz,w,.24,.1);add(TIMBER,'box',0,h1+.25+.1,fz2,w,.24,.1);add(TIMBER,'box',0,h1+h2+.2,fz2,w,.24,.1);
   for(const k of [-1,0,1]){const cx=k*w/3,br=Math.atan2(h2-.5,w/3-.3);add(TIMBER,'box',cx,h1+.25+h2/2,fz2+.01,Math.hypot(w/3-.3,h2-.5),.18,.06,0,0,(k%2?1:-1)*br);}
   for(const s of [-1,1]){add(TIMBER,'box',s*(w/2+.02),h1/2+.25,0,.08,h1,.24);add(TIMBER,'box',s*(w/2+.02),h1+.25+h2/2,0,.08,h2,.24);add(TIMBER,'box',s*(w/2+.02),h1+.25,0,.1,.24,d);}
   const rh=3.4;add(ROOFS[i%ROOFS.length],'prism',0,h1+h2+.25,j/2,w+.7,rh,d+j+.8);
   add(pl,'prism',0,h1+h2+.25,fz2-.12,w-.1,rh-.25,.2);add(TIMBER,'box',0,h1+h2+.25+(rh-.4)/2,fz2+.02,.2,rh-.4,.06);for(const s of [-1,1]){const a=Math.atan2(rh-.3,w/2);add(TIMBER,'box',s*w/4,h1+h2+.25+(rh-.3)/2,fz2+.02,Math.hypot(w/2,rh-.3)*.98,.2,.06,0,0,s*-a);}
   add('#9a5b45','box',w/2-1.1,h1+h2+rh*.7,-d/4,.9,rh+1.2,.9);add('#7b4637','box',w/2-1.1,h1+h2+rh*.7+(rh+1.2)/2,-d/4,1.05,.2,1.05);
   for(const xx of [-w/3,w/3]){add(GLOW,'box',xx,1.9,fz+.02,1.1,.95,.06);add(TIMBER,'box',xx,1.9,fz+.06,1.1,.06,.04);add(TIMBER,'box',xx,1.9,fz+.06,.06,.95,.04);add('#7a5634','box',xx,1.25,fz+.25,1.3,.3,.4);for(let f=0;f<4;f++)add(['#e84a6f','#f6c945','#ffffff','#b26ad6'][(f+i)%4],'ico',xx-.45+f*.3,1.48,fz+.28,.22,.22,.22);}
   for(const xx of [-w/3,0,w/3]){add(GLOW,'box',xx,h1+.25+h2/2+.1,fz2+.02,.95,.85,.06);add(TIMBER,'box',xx,h1+.25+h2/2+.1,fz2+.06,.95,.05,.04);}
   {const bz=-d/2-.03;for(const xx of [-w/2+.1,0,w/2-.1])add(TIMBER,'box',xx,(h1+h2)/2+.25,bz,.24,h1+h2,.08);for(const yy of [.4,h1+.25,h1+h2+.2])add(TIMBER,'box',0,yy,bz,w,.24,.1);for(const xx of [-w/4,w/4]){add(GLOW,'box',xx,1.9,bz-.02,1,.9,.06);add(GLOW,'box',xx,h1+.25+h2/2,bz-.02,.9,.8,.06);}add(pl,'prism',0,h1+h2+.25,-d/2+.1,w-.1,rh-.25,.2);}
   add(DOORS[i%DOORS.length],'box',0,1.3,fz+.02,1.05,2.1,.08);add(STONE2,'box',0,.3,fz+.5,1.6,.2,.8);
   world();const c=Math.abs(Math.cos(yaw))>.5;solid(x,z,(c?w:d+j)/2+.2,(c?d+j:w)/2+.2,9);}
 let hi=0;for(const x of [-113,-104,-95,-86,-77,-68])house(x,PZ-24,0,7.8,6.4,hi++);
 for(const x of [-112,-103,-77,-68])house(x,PZ+26,Math.PI,7.8,6.4,hi++);
 for(const z of [PZ-14,PZ+14]){house(PX-28,z,Math.PI/2,7.4,6.4,hi++);house(PX+28,z,-Math.PI/2,7.4,6.4,hi++);}
 // gardens: hedged beds round the tower and in two corners of the square, benches and a well
 const bed=(x,z,w,d)=>{const y=H(x,z);add('#3f6b3a','box',x,y+.35,z,w,.7,.35);add('#3f6b3a','box',x,y+.35,z+d,w,.7,.35);add('#3f6b3a','box',x-w/2,y+.35,z+d/2,.35,.7,d);add('#3f6b3a','box',x+w/2,y+.35,z+d/2,.35,.7,d);add('#6b4e34','box',x,y+.12,z+d/2,w-.3,.2,d-.3);solid(x,z+d/2,w/2+.2,d/2+.2,.8);
   for(let a=0;a<w*d*1.4;a++){const fx=x-w/2+.5+rnd()*(w-1),fz=z+.5+rnd()*(d-1);add(['#e84a6f','#f6c945','#ffffff','#b26ad6','#ff8a3d','#f49ac1'][a%6],'ico',fx,y+.42+rnd()*.15,fz,.3,.3,.3);if(a%3===0)add('#4f7f42','ico',fx+.2,y+.3,fz+.1,.4,.3,.4);}};
 bed(C.x-6,C.z+3.6,4,3);bed(C.x+6,C.z+3.6,4,3);bed(PX-14,PZ+7,6,5);bed(PX+14,PZ+7,6,5);
 for(const [bx,bz,r] of [[PX-6,PZ+4,0],[PX+6,PZ+4,0],[PX-14,PZ+4.2,0],[PX+14,PZ+4.2,0]]){const y=H(bx,bz);add('#7a5634','box',bx,y+.5,bz,2,.12,.55);add('#7a5634','box',bx,y+.85,bz-.25,2,.5,.1);for(const s of [-.85,.85])add('#3e3a36','box',bx+s,y+.25,bz,.1,.5,.5);solid(bx,bz,1.05,.35,1);}
 {const wx=PX,wz=PZ+8,y=H(wx,wz);add(STONE2,'cyl',wx,y+.5,wz,2.2,1,2.2);add('#2f5f80','cyl',wx,y+1.01,wz,1.7,.04,1.7);for(const s of [-1,1])add(TIMBER,'box',wx+s*.95,y+1.6,wz,.14,2.2,.14);add(ROOFS[0],'prism',wx,y+2.6,wz,2.6,1,1.4,0,Math.PI/2);solid(wx,wz,1.2,1.2,2);}

 REAL=null;
 // ======== Pegasus Perch: a white pavilion on a little mound, under a rainbow, wrapped in cloud ========
 {const S=SKYGATE,y=H(S.x,S.z);add('#f4f1ea','cyl',S.x,y+.25,S.z,8.4,.5,8.4);add('#ece7dc','cyl',S.x,y+.6,S.z,7.4,.3,7.4);
   for(let k=0;k<8;k++){const a=k/8*Math.PI*2;add('#f8f6f0','cyl',S.x+Math.cos(a)*3.1,y+2.6,S.z+Math.sin(a)*3.1,.5,4,.5);}
   add('#f4f1ea','cyl',S.x,y+4.75,S.z,7.2,.5,7.2);add('#ffffff','half',S.x,y+4.95,S.z,6.4,4.2,6.4);add('#c9a24a','ico',S.x,y+7.2,S.z,.5,.5,.5);
   for(let k=0;k<26;k++){const a=rnd()*Math.PI*2,d=4.6+rnd()*2.2,s=.8+rnd()*1.1;add('#ffffff','ico',S.x+Math.cos(a)*d,y+.3+rnd()*.5,S.z+Math.sin(a)*d,s*1.5,s,s*1.3);}
   const RB=['#e8574f','#f2994a','#f2c94c','#6fcf97','#56a7e0','#9b7bd9'];for(let b=0;b<6;b++){const arc=new T.Mesh(geo(new T.TorusGeometry(10-b*.5,.26,6,48,Math.PI)),mat(RB[b],{emissive:RB[b],emissiveIntensity:.25}));arc.position.set(S.x,y-.4,S.z-3);arc.scale.y=.9;g.add(arc);}
   for(let k=0;k<8;k++){const a=k/8*Math.PI*2;obstacles.push({kind:'box',x:S.x+Math.cos(a)*3.1,z:S.z+Math.sin(a)*3.1,hx:.3,hz:.3,height:5});}
   }
 // ======== v105: life and little things (ideas 1–20, see CLAUDE.md) ========
 // vertex-coloured parts: one mesh per animal/balloon instead of one per colour
 const vcMat=new T.MeshStandardMaterial({vertexColors:true,roughness:.85,flatShading:true});own.push(vcMat);
 const _c=new T.Color();
 function vc(list){const pos=[],nor=[],col=[];for(const [hex,shape,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0] of list){M.compose(pv.set(x,y,z),q.setFromEuler(eu.set(rx,ry,rz)),sv.set(sx,sy,sz));NM.getNormalMatrix(M);_c.set(hex);const src=P[shape],pa=src.attributes.position.array,na=src.attributes.normal.array;
   for(let i=0;i<pa.length;i+=3){v.set(pa[i],pa[i+1],pa[i+2]).applyMatrix4(M);pos.push(v.x,v.y,v.z);n.set(na[i],na[i+1],na[i+2]).applyMatrix3(NM).normalize();nor.push(n.x,n.y,n.z);col.push(_c.r,_c.g,_c.b);}}
   const bg=new T.BufferGeometry();bg.setAttribute('position',new T.Float32BufferAttribute(pos,3));bg.setAttribute('normal',new T.Float32BufferAttribute(nor,3));bg.setAttribute('color',new T.Float32BufferAttribute(col,3));bg.computeBoundingSphere();own.push(bg);return bg;}
 const segs=[MAP_PATHS.loop,MAP_PATHS.track,MAP_PATHS.yard,...MAP_PATHS.routes];
 const roadDist=(x,z)=>{let best=1e9;for(const r of segs)for(let i=0;i<r.length-1;i++){const [ax,az]=r[i],[bx,bz]=r[i+1],dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1)));best=Math.min(best,Math.hypot(ax+dx*t-x,az+dz*t-z));}return best;};
 const night=h=>h!=null&&(h<6||h>=20.5);
 const life=[];   // tick(dt,t,hours) for each moving thing

 // 1–2. ducks paddling up and down both rivers, swans circling the ponds
 const duckG=vc([['#8a6a4a','ico',0,.25,0,.62,.4,.95],['#f4f1ea','ico',0,.32,-.05,.5,.18,.6],['#2f7a4a','ico',0,.62,.34,.34,.34,.36],['#f2a93b','box',0,.58,.58,.14,.06,.2],['#3a2e26','ico',0,.3,-.48,.3,.2,.3]]);
 const swanG=vc([['#ffffff','ico',0,.38,0,.95,.6,1.5],['#ffffff','ico',0,.55,-.45,.7,.5,.7],['#ffffff','box',0,1.05,.55,.16,1,.16,-.25],['#ffffff','ico',0,1.6,.72,.3,.28,.42],['#f2843b','box',0,1.56,.98,.12,.09,.26],['#222222','box',0,1.6,.86,.13,.12,.06]]);
 for(const r of RIVERS){const L=r.line;for(let k=0;k<6;k++){const m=new T.Mesh(geo(duckG),vcMat);g.add(m);const d={s:20+(k/6)*(L.length-40),dir:k%2?1:-1,off:(rnd()-.5)*r.w*.5,sp:.6+rnd()*.5,ph:rnd()*6};
   life.push((dt,t)=>{d.s+=d.dir*d.sp*dt;if(d.s<8||d.s>L.length-10)d.dir*=-1;const i=Math.floor(d.s),a=L[i],b=L[Math.min(L.length-1,i+1)],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz)||1,nx=-dz/len,nz=dx/len;
     const x=a[0]+nx*d.off,z=a[1]+nz*d.off;m.position.set(x,riverWaterY(x,z)-.12+Math.sin(t*2+d.ph)*.04,z);m.rotation.y=Math.atan2(dx*d.dir,dz*d.dir);});}
   const p=r.pond;for(let k=0;k<2;k++){const m=new T.Mesh(geo(swanG),vcMat);g.add(m);const a0=k*Math.PI;life.push((dt,t)=>{const a=a0+t*.07,rr=p.r*.5;const x=p.x+Math.cos(a)*rr,z=p.z+Math.sin(a)*rr;m.position.set(x,riverWaterY(p.x,p.z)-.15+Math.sin(t*1.4+k)*.03,z);m.rotation.y=Math.atan2(-Math.sin(a),Math.cos(a));});}
   // 3. a rowing boat at a little jetty on each pond
   {const wy=riverWaterY(p.x,p.z),jx=p.x+p.r-1.5,jz=p.z;for(let k=0;k<6;k++)add('#9a7452','box',jx+k*1,wy+.45,jz,.9,.12,2.2);for(const sd of [-1,1])for(let k=0;k<6;k+=2)add('#6b4a30','box',jx+k,wy-.2,jz+sd*1.05,.2,1.5,.2);
     at(p.x+p.r-4.2,wy,p.z+2.6,.3);add('#b5553f','box',0,.15,0,1.3,.4,3.2);add('#8a5a3a','box',0,.22,0,1,.3,2.8);add('#d9c7a2','box',0,.3,.3,1,.08,.4);add('#d9c7a2','box',0,.3,-.8,1,.08,.4);for(const sd of [-1,1])add('#7a5634','box',sd*.9,.38,0,1.6,.06,.1,0,sd*.5,.25*sd);world();}}

 // 4. butterflies over the flower and sunflower fields
 {const flowerFields=FIELDS.filter(f=>f.kind!=='wheat'),N=14*flowerFields.length;const bf=vc([['#ffffff','box',-.17,0,0,.32,.02,.28,0,0,-.2],['#ffffff','box',.17,0,0,.32,.02,.28,0,0,.2],['#2b2622','box',0,0,0,.05,.05,.3]]);
   const bm=new T.MeshStandardMaterial({vertexColors:true,roughness:.6,side:T.DoubleSide});own.push(bm);const im=new T.InstancedMesh(bf,bm,N);const cc=new T.Color(),B=[];
   for(let i=0;i<N;i++){const f=flowerFields[i%flowerFields.length];B.push({f,ph:rnd()*20,sp:.15+rnd()*.15,ax:f.w*.4,az:f.d*.4});im.setColorAt(i,cc.set(['#f6c945','#f49ac1','#9fd0f5','#ffffff','#ff8a3d','#b26ad6'][i%6]));}
   im.frustumCulled=false;g.add(im);const m4=new T.Matrix4();
   life.push((dt,t)=>{B.forEach((b,i)=>{const u=t*b.sp+b.ph,x=b.f.x+Math.sin(u)*b.ax,z=b.f.z+Math.sin(u*1.7)*b.az,du=Math.cos(u)*b.ax,dz=Math.cos(u*1.7)*1.7*b.az,flap=.25+.75*Math.abs(Math.sin(t*14+i));
     m4.compose(pv.set(x,H(x,z)+1+Math.sin(u*3)*.35,z),q.setFromEuler(eu.set(0,Math.atan2(du,dz),0)),sv.set(flap,1,1));im.setMatrixAt(i,m4);});im.instanceMatrix.needsUpdate=true;});}

 // 5. fireflies along the rivers after dark
 {const spots=[];for(const r of RIVERS)for(let i=10;i<r.line.length-10;i+=7){const [x,z]=r.line[i];for(let k=0;k<2;k++)spots.push({x:x+(rnd()-.5)*(r.w+8),z:z+(rnd()-.5)*(r.w+8),ph:rnd()*9});}
   const fm=new T.MeshBasicMaterial({color:'#fff6a0'});own.push(fm);const fg=new T.SphereGeometry(.07,6,4);own.push(fg);const im=new T.InstancedMesh(fg,fm,spots.length);im.frustumCulled=false;im.visible=false;g.add(im);const m4=new T.Matrix4();let frame=0;
   life.push((dt,t,hours)=>{im.visible=night(hours);if(!im.visible||(frame++%2))return;spots.forEach((s,i)=>{const on=Math.sin(t*2.2+s.ph)>-.2;m4.compose(pv.set(s.x+Math.sin(t*.5+s.ph)*1.2,H(s.x,s.z)+.8+Math.sin(t*.9+s.ph)*.5,s.z+Math.cos(t*.4+s.ph)*1.2),q.identity(),sv.setScalar(on?1:.01));im.setMatrixAt(i,m4);});im.instanceMatrix.needsUpdate=true;});}

 // 6. hot-air balloons drifting high over the valley
 {const stripes=[['#e8574f','#f6c945'],['#56a7e0','#ffffff'],['#9b7bd9','#6fcf97']];stripes.forEach(([a,b],k)=>{const sg=new T.SphereGeometry(4,16,12).toNonIndexed(),pa=sg.attributes.position,col=[];const ca=new T.Color(a),cb=new T.Color(b);for(let i=0;i<pa.count;i+=3){const cx=(pa.getX(i)+pa.getX(i+1)+pa.getX(i+2))/3,cz=(pa.getZ(i)+pa.getZ(i+1)+pa.getZ(i+2))/3,sec=Math.floor((Math.atan2(cz,cx)+Math.PI)/(Math.PI/4))%2,c=sec?ca:cb;for(let j=0;j<3;j++)col.push(c.r,c.g,c.b);}
   sg.setAttribute('color',new T.Float32BufferAttribute(col,3));sg.scale(1,1.2,1);own.push(sg);const bal=new T.Group();const env=new T.Mesh(sg,vcMat);env.position.y=7;bal.add(env);
   const bask=new T.Mesh(geo(vc([['#8a6a4a','box',0,0,0,1.6,1.1,1.6],['#5a3e2c','box',0,.6,0,1.7,.15,1.7],['#4a3426','box',-.7,1.6,-.7,.06,2.2,.06],['#4a3426','box',.7,1.6,-.7,.06,2.2,.06],['#4a3426','box',-.7,1.6,.7,.06,2.2,.06],['#4a3426','box',.7,1.6,.7,.06,2.2,.06]])),vcMat);bal.add(bask);g.add(bal);
   const R0=110+k*55,y0=48+k*8,a0=k*2.1,sp=.012+k*.004;life.push((dt,t)=>{const a=a0+t*sp;bal.position.set(Math.cos(a)*R0,y0+Math.sin(t*.2+k)*2,Math.sin(a)*R0*.85);bal.rotation.y=t*.05;});});}

 // 7. sheep grazing in Ewe Meadow, inside a little post-and-rail fence
 {const P0=PASTURE;for(let k=0;k<26;k++){const a=k/26*Math.PI*2,x=P0.x+Math.cos(a)*(P0.r+2.5),z=P0.z+Math.sin(a)*(P0.r+2.5),y=H(x,z);add('#7a5634','box',x,y+.6,z,.18,1.2,.18);const a2=(k+1)/26*Math.PI*2,x2=P0.x+Math.cos(a2)*(P0.r+2.5),z2=P0.z+Math.sin(a2)*(P0.r+2.5),len=Math.hypot(x2-x,z2-z);
     if(k%13!==6)for(const yy of [.5,.95])add('#9a7452','box',(x+x2)/2,y+yy,(z+z2)/2,.08,.1,len,0,Math.atan2(x2-x,z2-z));}
   const sheepG=vc([['#f4f1ea','ico',0,.75,0,1.1,.85,1.4],['#f8f6f0','ico',0,1.05,-.2,.8,.5,.9],['#3a3330','box',0,.95,.72,.36,.42,.5],['#3a3330','box',-.22,1.05,.62,.22,.08,.12],['#3a3330','box',.22,1.05,.62,.22,.08,.12],
     ['#3a3330','box',-.3,.25,.4,.14,.5,.14],['#3a3330','box',.3,.25,.4,.14,.5,.14],['#3a3330','box',-.3,.25,-.4,.14,.5,.14],['#3a3330','box',.3,.25,-.4,.14,.5,.14]]);
   for(let k=0;k<9;k++){const m=new T.Mesh(geo(sheepG),vcMat);m.castShadow=true;g.add(m);const s={x:P0.x+(rnd()-.5)*P0.r,z:P0.z+(rnd()-.5)*P0.r,tx:0,tz:0,wait:rnd()*6,yaw:rnd()*6};s.tx=s.x;s.tz=s.z;
     life.push((dt,t)=>{if(s.wait>0){s.wait-=dt;m.rotation.x=Math.sin(t*3+k)*.04+.06;}else{const dx=s.tx-s.x,dz=s.tz-s.z,d=Math.hypot(dx,dz);if(d<.2){s.wait=3+rnd()*8;const a=rnd()*6.28,rr=Math.sqrt(rnd())*P0.r*.85;s.tx=P0.x+Math.cos(a)*rr;s.tz=P0.z+Math.sin(a)*rr;}else{s.x+=dx/d*.7*dt;s.z+=dz/d*.7*dt;s.yaw=Math.atan2(dx,dz);m.rotation.x=0;}}
       m.position.set(s.x,H(s.x,s.z),s.z);m.rotation.y=s.yaw;});}
   sign(g,P0.name.toUpperCase(),P0.x,H(P0.x,P0.z)+5,P0.z-P0.r-3,4.5);}

 // 8. sunflowers (taller than you), turning their faces south
 {const f=FIELDS.find(ff=>ff.kind==='sunflower'),spots=[];fieldPts(f,1.15,(x,z)=>spots.push([x,z]));
   const stem=new T.CylinderGeometry(.045,.06,2,5).translate(0,1,0),head=new T.CylinderGeometry(.42,.42,.08,12).rotateX(Math.PI/2).translate(0,2.05,.12),eye=new T.CylinderGeometry(.22,.22,.1,10).rotateX(Math.PI/2).translate(0,2.05,.17),leaf=new T.BoxGeometry(.6,.03,.22).translate(.28,1.1,0);own.push(stem,head,eye,leaf);
   const stemLeaf=new T.BufferGeometry();stemLeaf.setAttribute('position',new T.Float32BufferAttribute([...stem.toNonIndexed().attributes.position.array,...leaf.toNonIndexed().attributes.position.array],3));stemLeaf.computeVertexNormals();own.push(stemLeaf);
   const m4=new T.Matrix4();for(const [gm,col] of [[stemLeaf,'#4f8a3a'],[head,'#f2c230'],[eye,'#5a3a1e']]){const im=new T.InstancedMesh(gm,swayMat(col),spots.length);spots.forEach(([x,z],i)=>{const s=.85+((i*7919)%100)/300;m4.compose(pv.set(x,H(x,z),z),q.setFromEuler(eu.set(0,((i*31)%20-10)*.02,0)),sv.set(s,s,s));im.setMatrixAt(i,m4);});im.receiveShadow=true;g.add(im);}}

 // 9. cherry blossom trees along Bramble Brook
 {const r=RIVERS.find(rv=>rv.id==='bramble');for(let i=12;i<r.line.length-12;i+=13){const [x,z]=r.line[i],[x2,z2]=r.line[i+1],dx=x2-x,dz=z2-z,len=Math.hypot(dx,dz)||1,s=(i/13|0)%2?1:-1,tx=x+(-dz/len)*(r.w/2+5.5)*s,tz=z+(dx/len)*(r.w/2+5.5)*s;
   if(roadDist(tx,tz)<5||onBridge(tx,tz,8)||mountainLift(tx,tz)>.3)continue;const y=H(tx,tz),sc=.9+rnd()*.4;add('#6b4a3a','box',tx,y+1.4*sc,tz,.45*sc,2.8*sc,.45*sc);
   for(const [ox,oy,oz,rs] of [[0,3.6,0,2.6],[-1.1,3.1,.6,1.8],[1.1,3.3,-.5,1.9],[.2,4.4,.3,1.6]])add(['#f7c6d9','#f2a7c8','#fbd8e5'][Math.floor(rnd()*3)],'ico',tx+ox*sc,y+oy*sc,tz+oz*sc,rs*sc,rs*.8*sc,rs*sc);
   for(let k=0;k<6;k++)add('#f7c6d9','box',tx+(rnd()-.5)*4,y+.03,tz+(rnd()-.5)*4,.25,.02,.25,0,rnd()*3);solid(tx,tz,.35,.35,4);}}

 // 10. signposts: a post and a painted board a few steps off the road near each new place
 for(const [name,px,pz,rad] of [['THIMBLEFORD',-90,76,30],['PEGASUS PERCH',-58,-93,16],['GOLDENSHEAF',45,117,16],['BRAMBLE MILL',86,160,16],['EWE MEADOW',-195,95,26],['SUNFLOWERS',-62,158,20]]){let best=null,bs=1e9;
   for(let k=0;k<48;k++){const a=k/48*Math.PI*2,x=px+Math.cos(a)*rad,z=pz+Math.sin(a)*rad,rd=roadDist(x,z);if(mountainLift(x,z)>.2||onBridge(x,z,3)||Math.abs(x-PX)<22&&Math.abs(z-PZ)<20)continue;const sc=Math.abs(rd-3.2);if(sc<bs){bs=sc;best=[x,z];}}
   if(!best)continue;const [x,z]=best,y=H(x,z),face=Math.atan2(px-x,pz-z);add('#7a5634','box',x,y+1.3,z,.18,2.6,.18);at(x,y,z,face);add('#e5c76b','box',.7,2.2,0,1.6,.45,.08);add('#e5c76b','prism',1.62,2.2,0,.45,.3,.08,0,0,-Math.PI/2);world();sign(g,name,x,y+3.1,z,Math.min(5,1.6+name.length*.2));solid(x,z,.25,.25,3);}

 // 11–12. Thimbleford: market stalls with striped awnings, and bunting across the square
 for(const [sx,sz,yaw,goods] of [[-104,64,Math.PI/2,['#e8574f','#f2c94c','#6fcf97']],[-76,64,-Math.PI/2,['#f49ac1','#ffffff','#b26ad6']],[-98,79,Math.PI,['#d9a25a','#c98a45','#f0d39a']]]){const y=H(sx,sz);at(sx,y,sz,yaw);
   // v159: each post reaches up to the sloping awning (the back ones used to poke through it, the front ones stopped short)
   for(const [px,pz] of [[-1.5,-.9],[1.5,-.9],[-1.5,.9],[1.5,.9]]){const top=2.55+(pz-.15)*Math.sin(.25)-.05;add(TIMBER,'box',px,top/2,pz,.14,top,.14);}add('#9a7452','box',0,.9,.75,3.1,.12,.7);add('#7a5634','box',0,.45,.75,3,.9,.1);
   for(let k=0;k<6;k++)add(k%2?'#ffffff':['#c0392b','#2f6b9a','#2f7a4a'][Math.abs(Math.round(yaw*2))%3],'box',-1.35+k*.54,2.55,.15,.54,.08,2.2,-.25);
   for(let k=0;k<9;k++)add(goods[k%3],'ico',-1.2+(k%5)*.6,1.08,.55+(k>4?.3:0),.3,.26,.3);world();solid(sx,sz,Math.abs(Math.cos(yaw))*1.7+Math.abs(Math.sin(yaw))*1.1,Math.abs(Math.sin(yaw))*1.7+Math.abs(Math.cos(yaw))*1.1,3);}
 {const FL=['#e8574f','#f2c94c','#56a7e0','#6fcf97','#f49ac1','#ffffff'];for(const bz of [PZ,PZ+10]){const x0=PX-17.5,x1=PX+17.5;for(const xx of [x0,x1]){const y=H(xx,bz);add(TIMBER,'box',xx,y+3.5,bz,.2,7,.2);solid(xx,bz,.2,.2,7);}
   const y0=H(PX,bz)+6.6,N=26;for(let k=0;k<N;k++){const u=(k+.5)/N,x=x0+(x1-x0)*u,yy=y0-Math.sin(u*Math.PI)*1.2;add(FL[k%FL.length],'prism',x,yy-.02,bz,.55,.55,.04,Math.PI,0,0);}   // v159: the flag's top edge on the string (it hung .55 below it)
   for(let k=0;k<20;k++){const u=k/20,u2=(k+1)/20,xa=x0+(x1-x0)*u,xb=x0+(x1-x0)*u2,ya=y0-Math.sin(u*Math.PI)*1.2,yb=y0-Math.sin(u2*Math.PI)*1.2;add('#efe6d2','box',(xa+xb)/2,(ya+yb)/2,bz,Math.hypot(xb-xa,yb-ya),.04,.04,0,0,Math.atan2(yb-ya,xb-xa));}}}

 // ======== v106: farms (Yoshi 2026-11-14: "Farms can have pigs and cows. Go crazy") ========
 // Puddlebrook Farm (big red barn, farmhouse, silo, pigs in mud, cows, hens, goats on a rock pile, duck pond, a
 // vegetable garden, a tractor) and Bramblewick Farm (a thatched cottage, a pig sty, shaggy Highland cows and a donkey
 // paddock; world.js puts the sculpted donkeys in it). Animals of one kind share an InstancedMesh (one draw call each).
 {const RED='#b8402f',DRED='#8e2f22',WHITE='#f4efe4',ROOFR='#6e3a30',POST='#7a5634',RAIL='#9a7452',HAY='#e2bf62',MUD='#6e4e34',SOIL='#7a5a3a';
  P.gambrel=(()=>{const sh=new T.Shape(),pts=[[-.5,0],[.5,0],[.5,.62],[.28,.87],[0,1],[-.28,.87],[-.5,.62]];sh.moveTo(...pts[0]);for(const p of pts.slice(1))sh.lineTo(...p);sh.lineTo(...pts[0]);
    const e=new T.ExtrudeGeometry(sh,{depth:1,bevelEnabled:false});e.translate(0,0,-.5);return NI(e);})();own.push(P.gambrel);
  const rail=(x1,z1,x2,z2,y)=>{const len=Math.hypot(x2-x1,z2-z1),ry=Math.atan2(x2-x1,z2-z1);for(const yy of [.5,.95])add(RAIL,'box',(x1+x2)/2,y+yy,(z1+z2)/2,.08,.1,len,0,ry,0);};
  // A post-and-rail pen with a 3 m gate gap in the middle of one side (n s e w); each side is a solid for riders.
  const pen=(c,gate)=>{const x0=c.x-c.w/2,x1=c.x+c.w/2,z0=c.z-c.d/2,z1=c.z+c.d/2;
    const side=(ax,az,bx,bz,open)=>{const len=Math.hypot(bx-ax,bz-az),parts=open?[[0,.5-1.6/len],[.5+1.6/len,1]]:[[0,1]];
      for(const [u0,u1] of parts){const sx=ax+(bx-ax)*u0,sz=az+(bz-az)*u0,ex=ax+(bx-ax)*u1,ez=az+(bz-az)*u1,m=Math.max(1,Math.round(Math.hypot(ex-sx,ez-sz)/2.4));
        for(let k=0;k<=m;k++){const x=sx+(ex-sx)*k/m,z=sz+(ez-sz)*k/m,y=H(x,z);add(POST,'box',x,y+.6,z,.18,1.2,.18);if(k<m){const x2=sx+(ex-sx)*(k+1)/m,z2=sz+(ez-sz)*(k+1)/m;rail(x,z,x2,z2,(y+H(x2,z2))/2);}}
        solid((sx+ex)/2,(sz+ez)/2,Math.abs(ex-sx)/2+.12,Math.abs(ez-sz)/2+.12,1.4);}};
    side(x0,z0,x1,z0,gate==='n');side(x0,z1,x1,z1,gate==='s');side(x0,z0,x0,z1,gate==='w');side(x1,z0,x1,z1,gate==='e');};
  const sq=c=>({x:c.x,z:c.z,w:c.w||c.r*2,d:c.d||c.r*2});
  // -- animal shapes, all facing +z --
  const legs=(col,hx,hz,h,t=.2)=>[-1,1].flatMap(a=>[-1,1].map(b=>[col,'box',a*hx,h/2,b*hz,t,h,t]));
  const PIG=vc([['#f4a9b4','ico',0,.62,0,.95,.78,1.35],['#f4a9b4','ico',0,.72,.62,.66,.62,.6],['#e98c99','cyl',0,.66,.95,.32,.14,.32,Math.PI/2],['#c46a78','box',-.07,.68,1.03,.05,.07,.02],['#c46a78','box',.07,.68,1.03,.05,.07,.02],
    ['#2d2a28','box',-.17,.86,.86,.07,.09,.03],['#2d2a28','box',.17,.86,.86,.07,.09,.03],['#e98c99','prism',-.22,.98,.55,.22,.22,.08,-.3,0,.4],['#e98c99','prism',.22,.98,.55,.22,.22,.08,-.3,0,-.4],...legs('#e98c99',.25,.38,.34,.16),['#e98c99','ico',0,.75,-.68,.13,.13,.13]]);
  const MUDPIG=vc([['#f4a9b4','ico',0,.62,0,.95,.78,1.35],['#7a5a3a','ico',.3,.55,-.2,.45,.4,.6],['#7a5a3a','ico',-.28,.45,.25,.4,.3,.5],['#f4a9b4','ico',0,.72,.62,.66,.62,.6],['#e98c99','cyl',0,.66,.95,.32,.14,.32,Math.PI/2],
    ['#2d2a28','box',-.17,.86,.86,.07,.09,.03],['#2d2a28','box',.17,.86,.86,.07,.09,.03],['#e98c99','prism',-.22,.98,.55,.22,.22,.08,-.3,0,.4],['#e98c99','prism',.22,.98,.55,.22,.22,.08,-.3,0,-.4],...legs('#7a5a3a',.25,.38,.34,.16)]);
  const cow=(base,patch,muzzle,{horns='#efe6cf',shaggy=false}={})=>vc([[base,'box',0,1.25,0,1.15,.95,1.6],[base,'ico',0,1.25,.7,1.18,1,.9],[base,'ico',0,1.25,-.7,1.18,1,.9],
    [base,'box',0,1.6,1.3,.56,.6,.7],[muzzle,'box',0,1.42,1.7,.5,.34,.24],['#3a3330','box',-.1,1.45,1.83,.07,.06,.02],['#3a3330','box',.1,1.45,1.83,.07,.06,.02],['#1f1b1b','box',-.29,1.72,1.45,.04,.1,.12],['#1f1b1b','box',.29,1.72,1.45,.04,.1,.12],
    [base,'box',-.42,1.78,1.18,.3,.12,.18],[base,'box',.42,1.78,1.18,.3,.12,.18],...(shaggy?[[horns,'box',-.5,1.98,1.15,.7,.1,.1,0,0,-.35],[horns,'box',.5,1.98,1.15,.7,.1,.1,0,0,.35],[patch,'ico',0,1.85,1.45,.62,.32,.4],[patch,'ico',0,1.05,0,1.3,.5,2.2]]
      :[[horns,'box',-.22,1.98,1.18,.08,.22,.08,0,0,.4],[horns,'box',.22,1.98,1.18,.08,.22,.08,0,0,-.4]]),
    ...legs(base,.4,.72,.85,.25),...legs('#3a3330',.4,.72,.14,.27),['#f0b0b0','ico',0,.8,-.45,.45,.28,.5],[base,'box',0,1.1,-1.18,.07,1.05,.07,.12],['#3a3330','ico',0,.55,-1.24,.16,.24,.16],
    ...(patch!==base&&!shaggy?[[patch,'ico',.46,1.4,.3,.35,.55,.75],[patch,'ico',-.5,1.15,-.5,.3,.5,.65],[patch,'ico',0,1.72,-.25,.62,.12,.7],[patch,'box',0,1.75,1.25,.58,.3,.45],[patch,'ico',-.45,1.5,.6,.3,.35,.4]]:[])]);
  const HOLSTEIN=cow('#f6f3ec','#26221f','#f0b8b0'),JERSEY=cow('#b9824e','#b9824e','#3a3330',{horns:'#e6dccb'}),HIGHLAND=cow('#c4682f','#d27a3a','#3a3330',{horns:'#efe6cf',shaggy:true});
  const hen=(body,tail)=>vc([[body,'ico',0,.32,0,.34,.3,.42],[body,'ico',0,.55,.15,.2,.22,.2],['#e2423a','box',0,.7,.15,.04,.1,.15],['#e2423a','box',0,.46,.26,.04,.08,.05],['#f2a93b','box',0,.55,.28,.06,.05,.1],
    ['#1f1b1b','box',-.09,.58,.2,.02,.04,.04],['#1f1b1b','box',.09,.58,.2,.02,.04,.04],[tail,'prism',0,.42,-.2,.24,.26,.06,-.6],['#f2a93b','box',-.07,.09,0,.03,.18,.03],['#f2a93b','box',.07,.09,0,.03,.18,.03]]);
  const ROOSTER=vc([['#c8562e','ico',0,.4,0,.4,.36,.48],['#e8a040','ico',0,.68,.17,.24,.28,.24],['#e2423a','box',0,.88,.17,.05,.16,.22],['#e2423a','box',0,.56,.3,.05,.12,.06],['#f2a93b','box',0,.68,.32,.07,.05,.12],
    ['#1f1b1b','box',-.11,.72,.24,.02,.04,.04],['#1f1b1b','box',.11,.72,.24,.02,.04,.04],['#1e5a4a','prism',0,.62,-.25,.32,.5,.06,-.4],['#2f2a6a','prism',0,.58,-.3,.26,.42,.06,-.8],['#f2a93b','box',-.08,.11,0,.04,.22,.04],['#f2a93b','box',.08,.11,0,.04,.22,.04]]);
  const goat=(c,c2)=>vc([[c,'ico',0,.85,0,.6,.58,1.05],[c2,'box',0,1.2,.56,.3,.34,.42,-.3],[c2,'box',-.2,1.25,.46,.22,.07,.1],[c2,'box',.2,1.25,.46,.22,.07,.1],['#8a7a66','box',-.08,1.45,.44,.06,.26,.06,-.6],['#8a7a66','box',.08,1.45,.44,.06,.26,.06,-.6],
    ['#1f1b1b','box',-.15,1.27,.66,.03,.05,.05],['#1f1b1b','box',.15,1.27,.66,.03,.05,.05],[c2,'box',0,.96,.74,.07,.2,.06],...legs(c,.18,.33,.62,.1),['#3a3330','box',-.18,.04,-.33,.11,.08,.11],[c,'prism',0,1.08,-.52,.12,.18,.05,.6]]);
  const GOATS=[goat('#f3efe6','#f3efe6'),goat('#8a5a3a','#2e2622'),goat('#2e2a28','#f3efe6')];
  const DUCK=vc([['#ffffff','ico',0,.25,0,.62,.4,.95],['#ffffff','ico',0,.6,.32,.32,.32,.34],['#f2a93b','box',0,.56,.54,.14,.06,.2],['#1f1b1b','box',-.12,.64,.42,.02,.05,.05],['#1f1b1b','box',.12,.64,.42,.02,.05,.05]]);
  const herdsM=new T.Matrix4(),e2=new T.Euler();
  // herd(shape, n, area, opts): wanders inside a rect pen {x,z,w,d} or a circle {x,z,r}; pause → graze / peck / root.
  function herd(shape,n,area,{speed=.6,pause=[3,9],scale=1,peck=0,water=null,perch=null,lie=0}={}){const im=new T.InstancedMesh(geo(shape),vcMat,n);im.castShadow=true;im.frustumCulled=false;g.add(im);
    const pick=()=>{if(area.r){const a=rnd()*6.28,rr=Math.sqrt(rnd())*area.r*.85;return [area.x+Math.cos(a)*rr,area.z+Math.sin(a)*rr];}return [area.x+(rnd()-.5)*(area.w-2.4),area.z+(rnd()-.5)*(area.d-2.4)];};
    const st=Array.from({length:n},(_,i)=>{const [x,z]=pick();return {x,z,tx:x,tz:z,y:0,wait:rnd()*6,yaw:rnd()*6.28,s:scale*(.92+rnd()*.16),lying:i<lie,ph:rnd()*9};});
    const ground=(x,z)=>{let y=water!=null?water:H(x,z);if(perch&&Math.hypot(x-perch.x,z-perch.z)<perch.r)y+=perch.h;return y;};
    st.forEach(s=>{s.y=ground(s.x,s.z);});
    life.push((dt,t)=>{st.forEach((s,i)=>{let pitch=0,roll=0,lift=0;
      if(s.lying){roll=1.35+Math.sin(t*.7+s.ph)*.08;lift=.15;}
      else if(s.wait>0){s.wait-=dt;pitch=peck?(Math.sin(t*peck+s.ph)>.3?.5:0):.06+Math.sin(t*1.3+s.ph)*.03;}
      else{const dx=s.tx-s.x,dz=s.tz-s.z,d=Math.hypot(dx,dz);if(d<.25){s.wait=pause[0]+rnd()*(pause[1]-pause[0]);[s.tx,s.tz]=pick();}else{const k=Math.min(d,speed*dt);s.x+=dx/d*k;s.z+=dz/d*k;let dy=Math.atan2(dx,dz)-s.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));s.yaw+=dy*Math.min(1,dt*4);s.y=ground(s.x,s.z);lift=Math.abs(Math.sin(t*speed*9+s.ph))*.05;}}
      herdsM.compose(pv.set(s.x,s.y+lift+(water!=null?Math.sin(t*1.5+s.ph)*.03:0),s.z),q.setFromEuler(e2.set(pitch,s.yaw,roll,'YXZ')),sv.setScalar(s.s));im.setMatrixAt(i,herdsM);});im.instanceMatrix.needsUpdate=true;});
    return im;}
  const tractor=(x,z,ry)=>{const y=H(x,z);at(x,y,z,ry);add('#3f8a3a','box',0,1.15,.2,1.3,.9,2.4);add('#3f8a3a','box',0,1.0,1.55,1.0,.7,1.1);add('#3a3330','box',0,1.0,2.15,.9,.5,.08);add('#cfe6ef','box',0,2.15,-.35,1.25,1.2,1.1);add('#3f8a3a','box',0,2.8,-.35,1.45,.12,1.35);
    for(const s of [-1,1]){add('#2d2a28','cyl',s*.85,.85,-.4,1.7,.45,1.7,0,0,Math.PI/2);add('#f2c94c','cyl',s*1.09,.85,-.4,.8,.04,.8,0,0,Math.PI/2);add('#2d2a28','cyl',s*.75,.5,1.55,1,.32,1,0,0,Math.PI/2);add('#f2c94c','cyl',s*.92,.5,1.55,.5,.04,.5,0,0,Math.PI/2);}
    add('#5a5550','cyl',.4,2.1,1.4,.12,1.2,.12);world();solid(x,z,1.5,1.8,3);};
  const haystack=(x,z,s=1)=>{const y=H(x,z);add(HAY,'ico',x,y+1.1*s,z,3.2*s,2.6*s,3.2*s);add('#d4ad52','ico',x+.3*s,y+2.1*s,z-.2*s,1.8*s,1.2*s,1.8*s);solid(x,z,1.3*s,1.3*s,2.5*s);};
  const bales=(x,z,ry)=>{const y=H(x,z);at(x,y,z,ry);for(const [bx,by,bz] of [[-.65,.35,0],[.65,.35,0],[0,1.05,0],[1.95,.35,0]]){add('#dcbc63','box',bx,by,bz,1.25,.7,.8);add('#b89a4a','box',bx,by,bz,1.27,.08,.82);}world();solid(x+Math.cos(ry)*.6,z-Math.sin(ry)*.6,1.6,1.6,1.4);};
  const trough=(x,z,ry,fill='#5fa8c8')=>{const y=H(x,z);at(x,y,z,ry);add('#7a5634','box',0,.35,0,2.2,.5,.7);add(fill,'box',0,.58,0,2,.04,.5);world();};
  const tree=(x,z,s=1,fruit=null)=>{smoothTree(x,z,'green',s*1.1,fruit);solid(x,z,.35,.35,4);};
  const gateArch=(x,z,ry,text)=>{const y=H(x,z);at(x,y,z,ry);for(const s of [-2.2,2.2])add(POST,'box',s,1.8,0,.3,3.6,.3);add('#e5c76b','box',0,3.6,0,5,.6,.15);world();sign(g,text,x,y+4.6,z,Math.min(6,2+text.length*.2));solid(x+Math.cos(ry)*2.2,z-Math.sin(ry)*2.2,.2,.2,4);solid(x-Math.cos(ry)*2.2,z+Math.sin(ry)*2.2,.2,.2,4);};
  // -- Puddlebrook --
  {const F=FARMS[0];
   // farmhouse: white weatherboard, red roof, porch, chimney, window boxes; faces west to the farmyard
   {const {x,z}=F.house,y=H(x,z);at(x,y,z,-Math.PI/2);add(WHITE,'box',0,1.7,0,8,3.4,6);add(ROOFR,'prism',0,3.4,0,6.9,2.4,8.8,0,Math.PI/2);add('#9a5040','box',2.4,4.6,-.8,.8,2.2,.8);
     add('#9a7452','box',0,.18,3.8,8,.25,1.7);for(const s of [-3.7,-1,1,3.7])add(WHITE,'box',s,1.4,4.5,.16,2.6,.16);add(ROOFR,'box',0,2.8,3.95,8.4,.14,2.1,.25);
     add('#4e7a9a','box',0,1.15,3.02,1.1,2.1,.08);for(const s of [-2.6,2.6]){add('#cfe6ef','box',s,1.9,3.02,1.3,1,.06);add(WHITE,'box',s,1.9,3.05,1.5,.12,.06);add('#7a5634','box',s,1.25,3.15,1.4,.25,.3);for(let k=0;k<4;k++)add(['#e8574f','#f2c94c','#f49ac1','#ffffff'][k],'ico',s-.5+k*.33,1.47,3.15,.22,.2,.22);}
     for(const s of [-2.6,0,2.6])add('#cfe6ef','box',s,1.9,-3.02,1.2,1,.06);world();solid(x,z,3.2,4.2,5);}
   // big red barn with a gambrel roof, white X doors and a hay loft; the silo beside it
   {const {x,z}=F.barn,y=H(x,z);at(x,y,z,-Math.PI/2);add(RED,'gambrel',0,0,0,9.4,8,12);
     for(const sd of [-1,1]){add(ROOFR,'box',sd*3.75,5.95,0,3.1,.25,12.6,0,0,-sd*.76);add(ROOFR,'box',sd*1.35,7.55,0,2.85,.25,12.6,0,0,-sd*.367);}
     add(DRED,'box',0,1.9,6.02,3.4,3.8,.08);add(WHITE,'box',0,1.9,6.07,3.6,.16,.06);add(WHITE,'box',0,3.8,6.07,3.6,.16,.06);for(const s of [-1.75,0,1.75])add(WHITE,'box',s,1.9,6.07,.16,3.8,.06);
     for(const s of [-1,1])add(WHITE,'box',s*.87,1.9,6.08,.12,4,.05,0,0,s*.75);add(DRED,'box',0,5.6,6.02,1.6,1.4,.08);add(WHITE,'box',0,5.6,6.07,1.8,1.6,.04);add(HAY,'box',0,5.4,6.1,1.4,.6,.1);
     add(WHITE,'box',0,6.6,6.08,.1,.1,.1);world();solid(x,z,6.2,4.8,8);
     const s=F.silo,sy=H(s.x,s.z);add('#c9c3b8','cyl',s.x,sy+5.5,s.z,4.4,11,4.4);for(const yy of [2,5,8,10.6])add('#9a948a','cyl',s.x,sy+yy,s.z,4.5,.18,4.5);add('#7d8f9c','half',s.x,sy+11,s.z,4.6,2.6,4.6);solid(s.x,s.z,2.2,2.2,12);}
   // pig pen: mud wallow, a feeding trough, an A-frame pig hut; 4 pigs (two muddy, one rolling) and 4 piglets
   {const c=F.pigs;pen(c,'n');const y=H(c.x,c.z);add(MUD,'cyl',c.x+1.5,y+.04,c.z+1.5,7.5,.06,5.5);add('#5a3e2a','cyl',c.x+2,y+.06,c.z+2,3,.05,2.2);trough(c.x-4.5,c.z-4,0,'#c9b37a');
     at(c.x-4.5,H(c.x-4.5,c.z+3.5),c.z+3.5,0);add('#9a6a4a','prism',0,0,0,3.2,2.2,3);add('#3a2a1e','prism',0,0,1.52,1.4,1.2,.06);world();solid(c.x-4.5,c.z+3.5,1.6,1.5,2.2);
     herd(PIG,2,c,{speed:.5,pause:[3,9],peck:2.5});herd(MUDPIG,2,{...c,x:c.x+1.5,z:c.z+1.5,w:7,d:5},{speed:.4,pause:[6,14],lie:1});herd(PIG,4,c,{speed:.9,pause:[1,4],scale:.5,peck:5});}
   // hen house on legs with a ramp; hens and a rooster scratch round it
   {const c=F.coop,hx=c.x+2.6,hz=c.z-2.4,y=H(hx,hz);at(hx,y,hz,Math.PI/4);for(const a of [-1,1])for(const b of [-1,1])add('#6b4a30','box',a*1,.5,b*.8,.14,1,.14);add(RED,'box',0,1.7,0,2.4,1.4,2);add(ROOFR,'prism',0,2.4,0,2.6,1,2.4);
     add(WHITE,'box',0,1.6,1.02,.6,.7,.04);add('#9a7452','box',0,.6,1.75,.6,.08,1.8,.55);world();solid(hx,hz,1.3,1.3,3);
     herd(hen('#fbf7ee','#efe6d6'),5,c,{speed:1.1,pause:[1,4],peck:9});herd(hen('#b0683a','#6e3a20'),4,c,{speed:1.1,pause:[1,4],peck:9});herd(ROOSTER,1,c,{speed:.9,pause:[2,6],peck:6});}
   // cow field: Holsteins, Jerseys and a calf, a water trough and a hay rack, a shade tree
   {const c=sq(F.cows);pen(c,'n');trough(c.x+8,c.z-9,0);trough(c.x-9,c.z+6,Math.PI/2,HAY);tree(c.x+8,c.z+8,1.1,null);
     herd(HOLSTEIN,3,c,{speed:.45,pause:[5,14]});herd(JERSEY,2,c,{speed:.45,pause:[5,14]});herd(HOLSTEIN,1,c,{speed:.7,pause:[2,8],scale:.6});}
   // goat pen with a rock pile and a plank they love to stand on
   {const c=F.goats;pen(c,'w');const rx=c.x+.5,rz=c.z,y=H(rx,rz);for(const [ox,oy,oz,s] of [[0,.6,0,2.6],[.6,1.4,.4,1.6],[-.5,1.1,-.6,1.4],[.2,2,0,1]])add('#9a9a8e','ico',rx+ox,y+oy,rz+oz,s,s*.8,s);
     add('#9a7452','box',c.x-1.5,y+.9,c.z+4,2.4,.15,.9);add(POST,'box',c.x-1.5,y+.42,c.z+4,.15,.84,.15);
     herd(GOATS[0],2,c,{speed:.8,pause:[2,7],perch:{x:rx,z:rz,r:1.3,h:2.1}});herd(GOATS[1],1,c,{speed:.8,pause:[2,7],perch:{x:rx,z:rz,r:1.3,h:2.1}});herd(GOATS[2],1,c,{speed:.8,pause:[2,7],scale:.65,perch:{x:rx,z:rz,r:1.3,h:2.1}});}
   // duck pond with reeds, lily pads and stones (shallow: you can paddle in)
   {const c=F.pond,y=H(c.x,c.z);add('#5fa8c8','cyl',c.x,y+.06,c.z,c.r*2,.05,c.r*2);for(let k=0;k<18;k++){const a=k/18*6.28;add('#a9a99a','ico',c.x+Math.cos(a)*c.r,y+.12,c.z+Math.sin(a)*c.r,.7,.35,.6);}
     for(let k=0;k<6;k++){const a=rnd()*6.28,d=rnd()*c.r*.7;add('#5f9a4a','cyl',c.x+Math.cos(a)*d,y+.1,c.z+Math.sin(a)*d,.8,.02,.8);}for(let k=0;k<10;k++){const a=2+k*.12;add('#6f8f3a','box',c.x+Math.cos(a)*(c.r-.6),y+.6,c.z+Math.sin(a)*(c.r-.6),.06,1.2,.06,(rnd()-.5)*.3);}
     herd(DUCK,4,{x:c.x,z:c.z,r:c.r-1.2},{speed:.5,pause:[1,5],water:y+.02,scale:.7});}
   // vegetable garden: cabbages, carrots and pumpkins in rows, and a scarecrow
   {const c=F.veg,y0=H(c.x,c.z);for(let r=0;r<4;r++){const zz=c.z-c.d/2+1.2+r*2.2;add(SOIL,'box',c.x,y0+.08,zz,c.w-1,.16,1.1);for(let k=0;k<8;k++){const xx=c.x-c.w/2+1.2+k*1.35;
       if(r===0)add('#7fb24a','ico',xx,y0+.38,zz,.62,.5,.62);else if(r===1){add('#e8762d','box',xx,y0+.2,zz,.12,.2,.12);add('#4f8a3a','cone',xx,y0+.5,zz,.3,.5,.3);}else if(r===2)add('#e8762d','ico',xx,y0+.42,zz,.75,.58,.75);else add('#5f9a4a','ico',xx,y0+.4,zz,.5,.55,.5);}}
     const sx=c.x+c.w/2-1.5,sz=c.z+c.d/2-1;add(POST,'box',sx,y0+1.2,sz,.14,2.4,.14);add(POST,'box',sx,y0+1.7,sz,1.8,.12,.12);add('#4f7fb8','box',sx,y0+1.6,sz,.8,.9,.4);add('#efd9a8','ico',sx,y0+2.3,sz,.45,.45,.45);add('#c9a35a','cyl',sx,y0+2.55,sz,1,.08,1);add('#c9a35a','cone',sx,y0+2.75,sz,.5,.4,.5);
     for(const s of [-1,1])add(HAY,'box',sx+s*.95,y0+1.65,sz,.2,.25,.2);solid(sx,sz,.3,.3,3);}
   // farmyard: haystacks, bales, the tractor, an apple tree, a wheelbarrow, the gate arch and Hattie's milk churns
   {const h=F.hay;haystack(h.x,h.z,1);haystack(h.x+5,h.z+5,.8);bales(h.x-4,h.z+9,.3);tractor(h.x+8,h.z-6,Math.PI*.8);tree(296,268,1,'#d9433b');tree(244,252,1.1,'#d9433b');
     for(const [cx,cz] of [[262,206.5],[263,207.4],[261.2,207.6]]){const y=H(cx,cz);add('#b9c0c4','cyl',cx,y+.45,cz,.5,.9,.5);add('#8f989d','cyl',cx,y+.95,cz,.32,.12,.32);}
     gateArch(258,212,Math.PI/2,'PUDDLEBROOK FARM');}
  }
  // -- Bramblewick --
  {const F=FARMS[1];
   {const {x,z}=F.house,y=H(x,z);at(x,y,z,-Math.PI/2);add(STONE,'box',0,1.5,0,7,3,5.4);add('#c9a35a','prism',0,3,0,6.6,2.6,7.8,0,Math.PI/2);add('#b8934a','box',0,4.4,0,.4,.3,7.9);add(STONE2,'box',-2.8,4.2,0,.8,1.8,.8);
     add('#4e7a3a','box',0,1.05,2.72,1,2,.08);for(const s of [-2,2]){add('#cfe6ef','box',s,1.8,2.72,1,.9,.06);add(TIMBER,'box',s,1.8,2.76,1.12,.1,.04);}for(let k=0;k<10;k++)add(['#f49ac1','#ffffff','#b26ad6','#f6c945'][k%4],'ico',-3+k*.66,.3,3.2,.4,.4,.4);world();solid(x,z,2.8,3.6,4);}
   {const c=F.pigs;pen(c,'e');const y=H(c.x,c.z);add(MUD,'cyl',c.x,y+.04,c.z+1,6,.06,4);at(c.x-3,H(c.x-3,c.z-2.6),c.z-2.6,0);add(STONE2,'box',0,.8,0,3,1.6,2.2);add(SLATE,'prism',0,1.6,0,3.4,.9,2.6,0,Math.PI/2);add('#2a2420','box',0,.6,1.12,1,1.1,.04);world();solid(c.x-3,c.z-2.6,1.6,1.2,2);
     trough(c.x+2.5,c.z-3,0,'#c9b37a');herd(PIG,1,c,{speed:.5,pause:[3,9],peck:2.5});herd(MUDPIG,1,c,{speed:.4,pause:[6,14],lie:1});herd(PIG,2,c,{speed:.9,pause:[1,4],scale:.5,peck:5});}
   {const c=sq(F.cows);pen(c,'e');trough(c.x+5,c.z-6,Math.PI/2);tree(c.x-6,c.z+6,1.2,null);herd(HIGHLAND,4,c,{speed:.4,pause:[6,15]});herd(HIGHLAND,1,c,{speed:.6,pause:[3,9],scale:.6});}
   {const c=F.donkeys;pen(c,'w');trough(c.x+3.2,c.z+3.5,0,HAY);const y=H(c.x+3,c.z-3);at(c.x+3,y,c.z-3,0);for(const a of [-1,1])for(const b of [-1,1])add(POST,'box',a*1.4,1.1,b*1,.15,2.2,.15);add('#9a6a4a','box',0,2.3,0,3.4,.15,2.6,.12);world();}
   {const h=F.hay;haystack(h.x,h.z,.8);bales(h.x-4,h.z+7,-.4);tree(190,249,1,'#d9433b');tree(156,226,1,'#f2c94c');gateArch(191,206,Math.PI/2,'BRAMBLEWICK FARM');}
  }
 }
 bake();let lifeT=0;
 return {group:g,houses:HOUSES,tick(dt,hours){lifeT+=dt;for(const f of life)f(dt,lifeT,hours);ripple.offset.y-=dt*.22;swayU.value+=dt;for(const t of turning)t.o.rotation[t.axis]+=t.speed*dt;
   if(hours!=null){const h=((hours%12)+12)%12,mi=(hours%1)*60;for(const k of hands){k.hr.rotation.z=-h/12*Math.PI*2;k.mn.rotation.z=-mi/60*Math.PI*2;}}},
   dispose(){for(const o of own)o.dispose?.();}};
}

// ---- v104 the sky world above the clouds: entered at Pegasus Perch, where your horse grows wings. Its own coordinates
// (the valley is hidden while you fly): a sea of cloud at y 0 to the horizon in every direction, floating islands,
// a loop of 12 golden rings to fly through in order and 20 stars to gather. world.js drives the flying (skyStep).
export const SKY={start:{x:0,y:42,z:52},minY:7,maxY:130,edge:560,rings:12,stars:20};
export function buildSkyWorld({T,geo,mat,label}){
 const g=new T.Group();g.name='sky-world';g.visible=false;const own=[];
 let seed=2203;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 // the cloud sea: a soft billowing texture on a huge disc, plus puffs standing up out of it
 const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#f3f7fb';x.fillRect(0,0,256,256);
 for(let i=0;i<140;i++){const px=Math.random()*256,py=Math.random()*256,r=10+Math.random()*34,gr=x.createRadialGradient(px,py,0,px,py,r);gr.addColorStop(0,'#ffffff');gr.addColorStop(1,'#ffffff00');x.fillStyle=gr;for(const ox of [-256,0,256])for(const oy of [-256,0,256]){x.beginPath();x.arc(px+ox,py+oy,r,0,7);x.fill();}}
 for(let i=0;i<60;i++){const px=Math.random()*256,py=Math.random()*256,r=8+Math.random()*20,gr=x.createRadialGradient(px,py,0,px,py,r);gr.addColorStop(0,'#d9e6f2aa');gr.addColorStop(1,'#d9e6f200');x.fillStyle=gr;x.beginPath();x.arc(px,py,r,0,7);x.fill();}
 const tex=new T.CanvasTexture(c);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(30,30);tex.colorSpace=T.SRGBColorSpace;own.push(tex);
 const seaM=new T.MeshStandardMaterial({color:'#ffffff',map:tex,roughness:1,emissive:'#c9d9ea',emissiveIntensity:.35});own.push(seaM);
 const sea=new T.Mesh(geo(new T.CircleGeometry(1600,64).rotateX(-Math.PI/2)),seaM);g.add(sea);
 const puffM=new T.MeshStandardMaterial({color:'#ffffff',roughness:1,flatShading:true,emissive:'#dfe9f5',emissiveIntensity:.3});own.push(puffM);
 const puffG=new T.IcosahedronGeometry(1,1);own.push(puffG);const N=520,puffs=new T.InstancedMesh(puffG,puffM,N),m4=new T.Matrix4(),q=new T.Quaternion(),v=new T.Vector3(),s=new T.Vector3();
 const puffAt=[];for(let i=0;i<N;i++){const a=rnd()*Math.PI*2,d=30+Math.sqrt(rnd())*1100,px=Math.cos(a)*d,pz=Math.sin(a)*d,sc=6+rnd()*18;puffAt.push({x:px,z:pz,sc,y:-sc*.35+rnd()*3,sy:.45+rnd()*.3});}
 const placePuffs=(t)=>{puffAt.forEach((p,i)=>{m4.compose(v.set(p.x+Math.sin(t*.03+i)*4,p.y,p.z),q.identity(),s.set(p.sc*1.4,p.sc*p.sy,p.sc));puffs.setMatrixAt(i,m4);});puffs.instanceMatrix.needsUpdate=true;};placePuffs(0);g.add(puffs);
 // floating islands: grass on top of an upside-down rock, trees, flowers; one has a white pavilion (where you start and land)
 let goldCarrot=null;
 const islands=[{x:0,y:26,z:40,r:13,home:true},{x:-140,y:48,z:-90,r:16},{x:170,y:38,z:-60,r:12},{x:90,y:66,z:-230,r:18},{x:-220,y:30,z:140,r:11},{x:230,y:56,z:180,r:15},{x:-40,y:80,z:-330,r:12},{x:-300,y:62,z:-260,r:14}];
 const B=(p,col,shape,px,py,pz,sx,sy,sz,ry=0)=>{const gg={box:()=>new T.BoxGeometry(1,1,1),cone:()=>new T.ConeGeometry(.5,1,7),cyl:()=>new T.CylinderGeometry(.5,.5,1,14),ico:()=>new T.IcosahedronGeometry(.5,0)}[shape]();const mm=new T.Mesh(geo(gg),mat(col));mm.position.set(px,py,pz);mm.scale.set(sx,sy,sz);mm.rotation.y=ry;p.add(mm);return mm;};
 for(const is of islands){const ig=new T.Group();ig.position.set(is.x,is.y,is.z);g.add(ig);is.g=ig;
   B(ig,'#7cc46a','cyl',0,0,0,is.r*2,1.2,is.r*2);B(ig,'#a0784f','cyl',0,-.9,0,is.r*2.02,.8,is.r*2.02);const rock=B(ig,'#8f7a66','cone',0,-1.3-is.r*.6,0,is.r*1.9,is.r*1.2,is.r*1.9);rock.rotation.x=Math.PI;
   for(let k=0;k<5;k++){const a=rnd()*6.28,d=is.r*(.2+rnd()*.5);B(ig,'#7d6a58','ico',Math.cos(a)*d,-is.r*(.6+rnd()*.5),Math.sin(a)*d,is.r*.35,is.r*.5,is.r*.35);}
   if(is.home){B(ig,'#f4f1ea','cyl',0,.8,0,9,.4,9);for(let k=0;k<8;k++){const a=k/8*Math.PI*2;B(ig,'#f8f6f0','cyl',Math.cos(a)*3.6,2.9,Math.sin(a)*3.6,.5,4,.5);}B(ig,'#f4f1ea','cyl',0,5,0,8.2,.5,8.2);const dome=new T.Mesh(geo(new T.SphereGeometry(3.8,16,8,0,Math.PI*2,0,Math.PI/2)),mat('#ffffff'));dome.position.y=5.2;ig.add(dome);B(ig,'#e8c45a','ico',0,9.2,0,.8,.8,.8);}
   else for(let k=0;k<Math.round(is.r/4);k++){const a=rnd()*6.28,d=is.r*(.25+rnd()*.55),tx=Math.cos(a)*d,tz=Math.sin(a)*d,ts=1+rnd()*.6;B(ig,'#8a6a4a','box',tx,1.6*ts,tz,.5*ts,2.4*ts,.5*ts);B(ig,['#f2a7c8','#7fbf6a','#f7d36b','#9fd0a0'][k%4],'ico',tx,3.7*ts,tz,3.2*ts,2.6*ts,3.2*ts);}
   for(let k=0;k<is.r*1.6;k++){const a=rnd()*6.28,d=is.r*(.3+rnd()*.62);B(ig,['#e84a6f','#f6c945','#ffffff','#b26ad6','#f49ac1'][k%5],'ico',Math.cos(a)*d,.75,Math.sin(a)*d,.45,.45,.45);}
   for(let k=0;k<8;k++){const a=rnd()*6.28,d=is.r*(.9+rnd()*.5),cs=2+rnd()*3;const cl=B(ig,'#ffffff','ico',Math.cos(a)*d,-1-rnd()*3,Math.sin(a)*d,cs*1.6,cs,cs*1.3);cl.material=puffM;}}
 // a waterfall off the big island (it falls into the clouds)
 {const is=islands[3],wf=new T.Mesh(geo(new T.PlaneGeometry(4,is.y+6)),mat('#bfe3f5',{transparent:true,opacity:.8,side:T.DoubleSide,emissive:'#bfe3f5',emissiveIntensity:.3}));wf.position.set(is.x+is.r*.95,is.y/2-2,is.z);wf.rotation.y=Math.PI/2;g.add(wf);}
 // the rainbow bridge from the home island
 {const RB=['#e8574f','#f2994a','#f2c94c','#6fcf97','#56a7e0','#9b7bd9'];for(let b=0;b<6;b++){const arc=new T.Mesh(geo(new T.TorusGeometry(46-b*1.1,.55,6,64,Math.PI)),mat(RB[b],{emissive:RB[b],emissiveIntensity:.35}));arc.position.set(-20,6,-40);arc.rotation.y=.6;g.add(arc);}}
 // rings: a loop round the islands, rising and falling
 const ringM=()=>mat('#f2c45d',{emissive:'#f2c45d',emissiveIntensity:.55});const ringG=new T.TorusGeometry(5.2,.45,8,32);own.push(ringG);
 const rings=Array.from({length:SKY.rings},(_,i)=>{const a=i/SKY.rings*Math.PI*2,R=170+Math.sin(i*1.7)*40,px=Math.sin(a)*R,pz=-60-Math.cos(a)*R*1.1,py=30+Math.sin(i*.9)*18+i%3*6,next=(i+1)/SKY.rings*Math.PI*2,heading=Math.atan2(Math.sin(next)*R-px,(-60-Math.cos(next)*R*1.1)-pz);
   const r=new T.Mesh(ringG,new T.MeshStandardMaterial({color:'#f2c45d',emissive:'#f2c45d',emissiveIntensity:.55,roughness:.4,metalness:.3}));own.push(r.material);r.position.set(px,py,pz);r.rotation.y=heading;g.add(r);return {x:px,y:py,z:pz,mesh:r};});
 // stars: little gold stars floating near islands and along the way
 const starShape=new T.Shape();for(let k=0;k<10;k++){const a=k/10*Math.PI*2-Math.PI/2,rr=k%2?.45:1;k?starShape.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):starShape.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}
 const starG=new T.ExtrudeGeometry(starShape,{depth:.3,bevelEnabled:false});starG.translate(0,0,-.15);own.push(starG);const starM=new T.MeshStandardMaterial({color:'#ffe27a',emissive:'#ffd34d',emissiveIntensity:.8,roughness:.3});own.push(starM);
 const stars=Array.from({length:SKY.stars},(_,i)=>{const is=islands[(i%(islands.length-1))+1],a=rnd()*6.28,d=is.r+6+rnd()*22,px=is.x+Math.cos(a)*d,pz=is.z+Math.sin(a)*d,py=is.y+4+rnd()*16;const st=new T.Mesh(starG,starM);st.position.set(px,py,pz);st.scale.setScalar(1.5);g.add(st);return {x:px,y:py,z:pz,mesh:st};});
 const glowG=new T.SphereGeometry(1,10,8);own.push(glowG);
 // v105: a vertex-coloured part builder for the herd and the castle (one mesh each)
 const SH={box:new T.BoxGeometry(1,1,1).toNonIndexed(),cone:new T.ConeGeometry(.5,1,10).toNonIndexed(),cyl:new T.CylinderGeometry(.5,.5,1,12).toNonIndexed(),ico:new T.IcosahedronGeometry(.5,0)};for(const k in SH)own.push(SH[k]);
 const vM=new T.MeshStandardMaterial({vertexColors:true,roughness:.8,flatShading:true});own.push(vM);
 const VC=list=>{const pos=[],nor=[],col=[],M=new T.Matrix4(),N3=new T.Matrix3(),Q=new T.Quaternion(),E=new T.Euler(),P3=new T.Vector3(),S3=new T.Vector3(),V=new T.Vector3(),C=new T.Color();
   for(const [hex,sh,px,py,pz,sx,sy,sz,rx=0,ry=0,rz=0] of list){M.compose(P3.set(px,py,pz),Q.setFromEuler(E.set(rx,ry,rz)),S3.set(sx,sy,sz));N3.getNormalMatrix(M);C.set(hex);const a=SH[sh].attributes.position.array,na=SH[sh].attributes.normal.array;
     for(let i=0;i<a.length;i+=3){V.set(a[i],a[i+1],a[i+2]).applyMatrix4(M);pos.push(V.x,V.y,V.z);V.set(na[i],na[i+1],na[i+2]).applyMatrix3(N3).normalize();nor.push(V.x,V.y,V.z);col.push(C.r,C.g,C.b);}}
   const bg=new T.BufferGeometry();bg.setAttribute('position',new T.Float32BufferAttribute(pos,3));bg.setAttribute('normal',new T.Float32BufferAttribute(nor,3));bg.setAttribute('color',new T.Float32BufferAttribute(col,3));bg.computeBoundingSphere();own.push(bg);return bg;};
 // 18. a herd of wild pegasi circling the islands (white, cream, dapple grey, palomino, rose)
 const herd=['#ffffff','#f3e9d2','#c9ccd2','#e8c98f','#f2cfd8'].map((coat,k)=>{const mane=['#e8e2d6','#d9c49a','#8f949c','#fff3d6','#c97a92'][k];
   const body=VC([[coat,'box',0,1.6,0,.9,.9,2],[coat,'box',0,2.3,1,.5,1.1,.55,-.6],[coat,'box',0,2.85,1.45,.42,.42,.8,.25],[mane,'box',0,2.55,.82,.14,1.1,.4,-.6],[mane,'box',0,1.75,-1.2,.22,.9,.25,.8],
     [coat,'box',-.3,.85,.75,.2,1,.2,-.6],[coat,'box',.3,.85,.75,.2,1,.2,-.6],[coat,'box',-.3,.85,-.75,.2,1,.2,.6],[coat,'box',.3,.85,-.75,.2,1,.2,.6],['#3a3330','box',-.13,3.05,1.2,.1,.25,.1],['#3a3330','box',.13,3.05,1.2,.1,.25,.1]]);
   const wing=sd=>VC([[coat,'box',sd*.9,0,0,1.8,.12,.7],['#ffffff','box',sd*1.8,-.02,-.25,1.6,.1,.55,0,sd*.2],['#ffffff','box',sd*2.6,-.04,-.45,1.2,.08,.45,0,sd*.35]]);
   const grp=new T.Group(),b=new T.Mesh(body,vM);grp.add(b);const wl=new T.Group(),wr=new T.Group();wl.position.set(0,2,.3);wr.position.set(0,2,.3);wl.add(new T.Mesh(wing(-1),vM));wr.add(new T.Mesh(wing(1),vM));grp.add(wl,wr);g.add(grp);
   return {grp,wl,wr,R:70+k*28,y:44+k*7,sp:.11-k*.012,a0:k*1.3,cx:k%2?-60:50,cz:k%2?-120:-60,ph:k};});
 // 19. a pastel cloud castle on the biggest island
 {const is=islands[3],T0=[];const tower=(x,z,h,r,roof)=>{T0.push(['#f7f2ea','cyl',x,h/2,z,r*2,h,r*2],[roof,'cone',x,h+r*1.3,z,r*2.5,r*2.6,r*2.5],['#9fc7e8','box',x,h*.65,z+r*.98,.5,.9,.1]);for(let k=0;k<8;k++){const a=k/8*Math.PI*2;T0.push(['#f7f2ea','box',x+Math.cos(a)*r,h+.3,z+Math.sin(a)*r,.6,.6,.6,0,-a]);}};
   tower(-6,-6,13,2.2,'#f2a7c8');tower(6,-6,13,2.2,'#9fd0f5');tower(-6,6,10,1.9,'#c9b6ef');tower(6,6,10,1.9,'#f7d36b');tower(0,0,19,2.8,'#f2a7c8');
   T0.push(['#f4ede2','box',0,3.5,-6,10,7,1.4],['#f4ede2','box',0,3,6,10,6,1.4],['#f4ede2','box',-6,3,0,1.4,6,10],['#f4ede2','box',6,3.5,0,1.4,7,10],['#b58a5a','box',0,1.8,6.75,2.6,3.6,.2],['#e8c45a','ico',0,22.6,0,.9,.9,.9]);
   const castle=new T.Mesh(VC(T0),vM);castle.position.set(-2,.6,-3);is.g.add(castle);
   // v106: a golden carrot balanced on the tip of the tallest spire (one a day): the hard-to-reach lure for the moon pegasus
   const gc=new T.Group();const gm=new T.MeshStandardMaterial({color:'#f2c230',emissive:'#f2b230',emissiveIntensity:.6,roughness:.3,metalness:.4}),lm=new T.MeshStandardMaterial({color:'#6fcf6f',emissive:'#3f9a3f',emissiveIntensity:.3});own.push(gm,lm);
   const cg=new T.ConeGeometry(.32,1.3,8);cg.rotateX(Math.PI);own.push(cg);const body=new T.Mesh(cg,gm);gc.add(body);for(let k=0;k<3;k++){const lg=new T.ConeGeometry(.1,.55,5);own.push(lg);const lf=new T.Mesh(lg,lm);lf.position.set(Math.cos(k*2.1)*.1,.85,Math.sin(k*2.1)*.1);lf.rotation.z=Math.cos(k*2.1)*.35;lf.rotation.x=Math.sin(k*2.1)*.35;gc.add(lf);}
   const halo=new T.Mesh(new T.TorusGeometry(.9,.05,6,24),new T.MeshBasicMaterial({color:'#fff1b0'}));own.push(halo.geometry,halo.material);gc.add(halo);
   gc.position.set(is.x-2,is.y+.6+25,is.z-3);g.add(gc);goldCarrot={x:gc.position.x,y:gc.position.y,z:gc.position.z,mesh:gc,halo};}
 return {group:g,islands,rings,stars,goldCarrot,home:islands[0],
   tick(dt,t){for(const h of herd){const a=h.a0+t*h.sp,x=h.cx+Math.cos(a)*h.R,z=h.cz+Math.sin(a)*h.R;h.grp.position.set(x,h.y+Math.sin(t*.8+h.ph)*3,z);h.grp.rotation.y=Math.atan2(-Math.sin(a),Math.cos(a))*(h.sp>0?1:-1);const f=Math.sin(t*4.2+h.ph)*.55;h.wl.rotation.z=f+.15;h.wr.rotation.z=-f-.15;}
if(goldCarrot?.mesh.visible){goldCarrot.mesh.rotation.y+=dt*1.4;goldCarrot.halo.rotation.x=t*1.1;goldCarrot.mesh.position.y=goldCarrot.y+Math.sin(t*1.7)*.25;}tex.offset.x+=dt*.004;tex.offset.y+=dt*.002;for(const st of stars)if(st.mesh.visible){st.mesh.rotation.y+=dt*1.6;st.mesh.position.y=st.y+Math.sin(t*1.5+st.x)*.5;}
     for(const r of rings)r.mesh.material.emissiveIntensity=r.next?.7+Math.sin(t*5)*.3:.35;if((t*10|0)%3===0)placePuffs(t);},
   wings(scale=1){const w=new T.Group();const fm=mat('#ffffff'),fm2=mat('#eef3fa');const sides=[];
     for(const sd of [-1,1]){const pivot=new T.Group();pivot.position.set(sd*.32*scale,1.72*scale,.25*scale);w.add(pivot);
       const arm=new T.Mesh(geo(new T.BoxGeometry(1,.22,.42)),fm);arm.scale.set(1.3*scale,scale,scale);arm.position.set(sd*.65*scale,.05,0);pivot.add(arm);
       for(let k=0;k<7;k++){const f=new T.Mesh(geo(new T.BoxGeometry(1,.12,.5)),k%2?fm2:fm);const L=(2.6-k*.25)*scale;f.scale.set(L,1,scale);f.position.set(sd*(L/2+.1*scale),.03*k-.05,-(.12+.3*k)*scale);f.rotation.y=sd*(k*.11-.05);pivot.add(f);}
       sides.push({pivot,sd});}
     w.userData.flap=(t,amt=1)=>{for(const {pivot,sd} of sides)pivot.rotation.z=sd*(Math.sin(t*5.5)*.5*amt+.38);};return w;},
   dispose(){for(const o of own)o.dispose?.();}};
}
