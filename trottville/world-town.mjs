// Bramble Village square (2026-11-11, step 2 of the nine regions; Yoshi: "a village center with a fountain and
// buildings that you would want to walk into without your horse to meet people ... they should be more spread out..
// you shouldnt see more than 1 per angle"). Pure data + maths (no DOM), shared by the 3D world, quests and tests.
//  · The fountain sits on the east spoke, where the road crosses the village. Four shops stand round it, each in
//    its own direction (Town Hall north, the Carrot Market stall north-east, Post Office south-east, General Store
//    south, Bakery west), about 28 m out, doors facing the fountain. Willowbrook Vet stays where it was and also
//    becomes a walk-in.
//  · Walk-in = a real room in the world, no loading: walls with a doorway, a counter, the shopkeeper behind it.
//    On foot only: a gate across each doorway stops horses (it is only solid while you ride).
//  · Walls are axis-aligned boxes (world-logic blocked() has no rotation), so a door faces n, s, e or w.
import {SQUARE,regionAt} from './world-regions.mjs?v=158';
import {SERVICES,terrainHeight,BRIDGES,FIELDS,TOWN2} from './world-content.mjs?v=158';
import {SHOWS,field,score,timeFaults} from './show-course.mjs?v=158';
import {rng,hashSeed} from './steeple-course.mjs?v=158';

export const FOUNTAIN={x:SQUARE.x,z:SQUARE.z,r:3.4},PLAZA_R=15;
const vet=SERVICES.find(s=>s.id==='vet');
// face: the side the door is on. w × d is the room (w along the door wall).
export const SHOPS=[
  {id:'townhall',name:'Town Hall',sign:'TOWN HALL',giver:'dottie',x:60,z:-50,face:'s',w:15,d:10,wall:'#ece2cf',trim:'#8a6f55',roof:'#5f7896',floor:'#c9b28d',kind:'hall',style:'tudor',tudor:{ground:'stone',roof:'slate',cupola:true,tint:'#f4efe6',oriel:true}},
  {id:'post',name:'Post Office',sign:'POST OFFICE',giver:'percy',x:82,z:-2,face:'n',w:12,d:9,wall:'#d9e3ec',trim:'#b5483d',roof:'#b5483d',floor:'#cdb48c',kind:'post',style:'tudor',tudor:{ground:'brick',postbox:true,tint:'#f1e6d6',chimney:'l'}},
  {id:'store',name:"Sunita's General Store",sign:'GENERAL STORE',giver:'sunita',x:55,z:6,face:'n',w:13,d:10,wall:'#efe0b8',trim:'#4f7d5a',roof:'#4f7d5a',floor:'#bfa27a',kind:'store',style:'tudor',tudor:{awning:'#3f6b4a',crates:true,tint:'#efe3c8',oriel:false,roofTint:'#d9b8a4'}},
  {id:'bakery',name:"Bea's Bakery",sign:"BEA'S BAKERY",giver:'bea',x:35,z:-36,face:'e',w:12,d:9,wall:'#f3d9cf',trim:'#9c5a3c',roof:'#c98a5a',floor:'#d6bd96',kind:'bakery',style:'tudor'},
  {id:'vet',name:'Willowbrook Vet',sign:'WILLOWBROOK VET',giver:'jo',x:vet.x,z:vet.z,face:'s',w:12,d:9,wall:'#f4f1e8',trim:'#5d9a6a',roof:'#5d9a6a',floor:'#d9d3c3',kind:'vet',style:'tudor',tudor:{roof:'slate',tint:'#f7f4ec',oriel:false,chimney:'l'}},
  // Step 3 walk-ins out in the regions (same rules: on foot, keeper behind the counter).
  {id:'hut',name:'Cloudstep Mountain Hut',sign:'MOUNTAIN HUT',giver:'sven',x:72,z:-132,face:'w',w:11,d:9,wall:'#9b6b43',trim:'#5b3d27',roof:'#4a5a52',floor:'#b48a5e',kind:'hut'},
  {id:'dairy',name:"Ingrid's Dairy Barn",sign:'DAIRY BARN',giver:'ingrid',x:272,z:170,face:'w',w:14,d:10,wall:'#b5553f',trim:'#f2e6cc',roof:'#5a6b5e',floor:'#c9b083',kind:'dairy'},
  {id:'lighthouse',name:'Rosewater Lighthouse',sign:'LIGHTHOUSE',giver:'agnes',x:-213,z:191,face:'n',w:8,d:8,wall:'#e9c7bb',trim:'#b9786a',roof:'#638b7b',floor:'#d8cbb0',kind:'lighthouse'}
];
export const WALL_H=4.2,WALL_T=.35,DOOR_W=3.4;
// Local frame: u along the door wall, v from the back (−d/2) to the door (+d/2). → world.
export function toWorld(s,u,v){switch(s.face){case 's':return {x:s.x+u,z:s.z+v};case 'n':return {x:s.x-u,z:s.z-v};case 'e':return {x:s.x+v,z:s.z-u};default:return {x:s.x-v,z:s.z+u};}}
const ew=s=>s.face==='e'||s.face==='w';
// A local box (centre u,v, half sizes hu,hv) → a world obstacle.
export function boxOf(s,u,v,hu,hv,height){const p=toWorld(s,u,v);return {kind:'box',x:p.x,z:p.z,hx:ew(s)?hv:hu,hz:ew(s)?hu:hv,height};}
export function shopParts(s){
  const hw=s.w/2,hd=s.d/2,t=WALL_T/2,side=(hw-DOOR_W/2)/2;
  const walls=[boxOf(s,0,-hd,hw+t,t,WALL_H),boxOf(s,-hw,0,t,hd,WALL_H),boxOf(s,hw,0,t,hd,WALL_H),
    boxOf(s,-hw+side,hd,side+t,t,WALL_H),boxOf(s,hw-side,hd,side+t,t,WALL_H)];
  const counter=boxOf(s,0,-hd+3.1,Math.min(3.4,hw-2.2),.45,1.15);
  const gate={...boxOf(s,0,hd+.2,DOOR_W/2,.55,8),gate:true};
  return {walls,counter,gate,solids:[...walls,counter],keeper:toWorld(s,0,-hd+1.8),customer:toWorld(s,0,-hd+4.6),
    door:toWorld(s,0,hd+.9),inside:(x,z)=>Math.abs(x-s.x)<(ew(s)?hd:hw)&&Math.abs(z-s.z)<(ew(s)?hw:hd)};
}
export const SHOP_PARTS=SHOPS.map(s=>({shop:s,...shopParts(s)}));
// Everything solid the square adds (shop walls + counters, the fountain basin). Gates are separate: riding only.
export const TOWN_SOLIDS=[...SHOP_PARTS.flatMap(p=>p.solids),{kind:'lake',x:FOUNTAIN.x,z:FOUNTAIN.z,rx:FOUNTAIN.r,rz:FOUNTAIN.r,height:1.2}];
export const TOWN_GATES=SHOP_PARTS.map(p=>p.gate);
// Indoor shopkeepers: giver id → the spot behind their counter.
export const INDOOR_SPOTS=Object.fromEntries(SHOP_PARTS.map(p=>[p.shop.giver,{...p.keeper,look:p.customer}]));
export const shopAt=(x,z)=>SHOP_PARTS.find(p=>p.inside(x,z))||null;
export const doorNear=(x,z,r=3.2)=>SHOP_PARTS.find(p=>Math.hypot(p.door.x-x,p.door.z-z)<r)||null;

// ---------------------------------------------------------------------------------------------------------------
// The square in 3D (three.js is passed in, so this module stays importable by the node tests). A paved plaza round a splashing fountain, four
// walk-in shops facing it (and the walk-in vet down by the home trail). Low-poly boxes like the rest of the valley.
// Walk in through a doorway: once you're inside, that shop's roof lifts away and its walls drop to waist height, so
// the camera can see you, the counter and whoever runs the place. Horses wait outside (TOWN_GATES, riding only).

const YAW={s:0,n:Math.PI,e:Math.PI/2,w:-Math.PI/2};
export function buildTown({T,outdoors,geo,mat,box,ico,plaque,groundY,tudor=null,real=null}){
  const root=new T.Group();root.name='village-square';outdoors.add(root);
  const B=(p,c,x,y,z,sx,sy,sz,sh=false)=>box(p,c,x,y,z,sx,sy,sz,sh);
  // A flat shape that follows the ground (plaza, shop floors): a subdivided plane, each vertex lifted to the terrain.
  function drape(geometry,cx,cz,lift,color,order){geometry.rotateX(-Math.PI/2);const a=geometry.attributes.position;
    for(let i=0;i<a.count;i++){const x=a.getX(i)+cx,z=a.getZ(i)+cz;a.setXYZ(i,x,groundY(x,z)+lift,z);}geometry.computeVertexNormals();
    const m=new T.Mesh(geo(geometry),color?.isMaterial?color:mat(color));m.receiveShadow=true;m.renderOrder=order;root.add(m);return m;}

  // ---- the plaza and its fountain ----
  // v147: real flagstones and a dressed-stone kerb (world-tudor.js squareProps), uvs in metres.
  const uvs=(g,k)=>{const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*k,uv.getY(i)*k);return g;};
  drape(real?uvs(new T.CircleGeometry(PLAZA_R,48,0,Math.PI*2),2*PLAZA_R/3.6):new T.CircleGeometry(PLAZA_R,40,0,Math.PI*2),FOUNTAIN.x,FOUNTAIN.z,.07,real?real.pave:'#ddd1b6',-10);
  drape(real?uvs(new T.RingGeometry(PLAZA_R-.5,PLAZA_R+.25,64,1),2*PLAZA_R/1.4):new T.RingGeometry(PLAZA_R-.5,PLAZA_R+.25,40,1),FOUNTAIN.x,FOUNTAIN.z,.08,real?real.kerb:'#b9ab8d',-10);
  const fy=groundY(FOUNTAIN.x,FOUNTAIN.z),fountain=new T.Group();fountain.position.set(FOUNTAIN.x,fy,FOUNTAIN.z);root.add(fountain);
  const cyl=(c,r0,r1,h,y,seg=18,extra)=>{const m=new T.Mesh(geo(new T.CylinderGeometry(r0,r1,h,seg)),mat(c,extra));m.position.y=y;m.castShadow=true;m.receiveShadow=true;fountain.add(m);return m;};
  if(real){real.fountain(fountain);for(const [r,y] of [[3.0,.62],[1.36,3.0],[.5,3.9]]){const w=cyl('#86cbd3',r,r,.04,y,32,{roughness:.12,metalness:.1});w.castShadow=false;}}
  else{cyl('#c9c1b0',FOUNTAIN.r,FOUNTAIN.r+.25,.85,.25,22);cyl('#b3aa97',FOUNTAIN.r+.1,FOUNTAIN.r+.1,.12,.72,22);
  const pool=cyl('#86cbd3',FOUNTAIN.r-.25,FOUNTAIN.r-.25,.06,.6,22,{roughness:.25});pool.castShadow=false;
  cyl('#c9c1b0',.45,.6,2.2,1.5,10);cyl('#d3cbb9',1.45,.55,.45,2.75,14);cyl('#86cbd3',1.3,1.3,.05,2.98,14,{roughness:.25});
  cyl('#c9c1b0',.22,.3,.9,3.3,8);cyl('#d3cbb9',.65,.3,.25,3.8,10);}
  // Water: a little jet on top and four arcs falling into the basin; they bob gently (driven by the frame clock).
  const water=mat('#cfeef2',{transparent:true,opacity:.75,roughness:.2});const jets=[];
  {const j=new T.Mesh(geo(new T.ConeGeometry(.16,1.1,8)),water);j.position.y=4.4;fountain.add(j);jets.push(j);}
  for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4,j=new T.Mesh(geo(new T.CylinderGeometry(.07,.12,1.3,6)),water);j.position.set(Math.sin(a)*1.55,2.15,Math.cos(a)*1.55);j.rotation.set(Math.cos(a)*.35,0,-Math.sin(a)*.35);fountain.add(j);jets.push(j);}
  const ripple=new T.Mesh(geo(new T.RingGeometry(.9,1.05,24)),mat('#e8f8fa',{transparent:true,opacity:.6,side:T.DoubleSide}));ripple.rotation.x=-Math.PI/2;ripple.position.y=.66;fountain.add(ripple);
  // Benches facing the fountain, lamp posts and flower tubs round the edge.
  for(let i=0;i<4;i++){const a=i*Math.PI/2+.4,x=FOUNTAIN.x+Math.sin(a)*7,z=FOUNTAIN.z+Math.cos(a)*7,g=new T.Group();g.position.set(x,groundY(x,z),z);g.rotation.y=a+Math.PI;root.add(g);
    if(real)real.bench(g);else{B(g,'#9a6b45',0,.5,0,2.2,.12,.6,true);B(g,'#9a6b45',0,.9,-.28,2.2,.5,.1);for(const dx of [-.9,.9])B(g,'#5b4636',dx,.25,0,.12,.5,.5);}}
  for(let i=0;i<6;i++){const a=i*Math.PI/3+.15,x=FOUNTAIN.x+Math.sin(a)*(PLAZA_R-1.6),z=FOUNTAIN.z+Math.cos(a)*(PLAZA_R-1.6),g=new T.Group();g.position.set(x,groundY(x,z),z);root.add(g);
    if(i%2){if(real)real.lamp(g);else{B(g,'#3f4a46',0,1.6,0,.16,3.2,.16);B(g,'#3f4a46',0,3.25,0,.5,.12,.5);ico(g,'#ffe3a1',0,3.55,0,.28,.32,.28);}}
    else{const fy=real?.66:.85;if(real)real.tub(g);else B(g,'#9c7a5c',0,.35,0,1.2,.7,1.2,true);for(let k=0;k<(real?9:5);k++)ico(g,['#e58fa6','#f2c45d','#b48be0','#f39a6b','#ffffff'][k%5],((k%3)-1)*.3+(k>4?.12:0),fy+(k>4?.12:0),(k>2?.2:-.18)-(k>5?.15:0),.2,.2,.2);if(real)for(let k=0;k<5;k++)ico(g,'#4f7f42',Math.sin(k*1.3)*.32,.62,Math.cos(k*1.3)*.32,.26,.18,.26);}}

  // ---- the shops ----
  const shops=[];
  for(const part of SHOP_PARTS){const s=part.shop,hw=s.w/2,hd=s.d/2;
    // Ground under the room varies a little: walls start from the lowest corner, the floor follows the terrain.
    const corners=[[-hw,-hd],[hw,-hd],[-hw,hd],[hw,hd],[0,0]].map(([u,v])=>{const p=toWorld(s,u,v);return groundY(p.x,p.z);}),low=Math.min(...corners)-.25,base=groundY(s.x,s.z);
    const g=new T.Group();g.position.set(s.x,low,s.z);g.rotation.y=YAW[s.face];root.add(g);
    const walls=new T.Group(),roof=new T.Group();g.add(walls,roof);const up=base-low;   // floor level inside the group
    const ew=s.face==='e'||s.face==='w';drape(new T.PlaneGeometry(ew?s.d:s.w,ew?s.w:s.d,8,8),s.x,s.z,.05,s.floor,-8);
    const H=WALL_H+up,side=(hw-DOOR_W/2);
    // v146: Tudor shops (world-tudor.js, passed in by the world) build their own walls, upper storey and roof.
    if(s.style==='tudor'&&tudor)tudor({T,geo,mat,walls,roof,g,s,up,WALL_H,WALL_T,DOOR_W,plaque});else{
    // Walls (outside colour, a trim band at the bottom), the lintel over the doorway, windows on the sides.
    const wall=(u,v,su,sv)=>{B(walls,s.wall,u,H/2,v,su,H,sv,true);B(walls,s.trim,u,up+.35,v,su+.04,.7,sv+.04);};
    wall(0,-hd,s.w+WALL_T,WALL_T);wall(-hw,0,WALL_T,s.d);wall(hw,0,WALL_T,s.d);wall(-hw+side/2,hd,side+WALL_T,WALL_T);wall(hw-side/2,hd,side+WALL_T,WALL_T);
    B(walls,s.wall,0,up+3.05+(WALL_H-3.05)/2,hd,DOOR_W,WALL_H-3.05,WALL_T);B(walls,s.trim,0,up+3.05,hd,DOOR_W+.3,.18,WALL_T+.08);
    for(const sd of [-1,1]){B(walls,s.trim,sd*(DOOR_W/2+.08),up+1.5,hd,.16,3.05,WALL_T+.1);
      for(const v of (s.d>9.5?[-2,2]:[0])){B(walls,'#cfe6ee',sd*hw,up+2.2,v,WALL_T+.06,1.2,1.6);B(walls,s.trim,sd*hw,up+2.2,v,WALL_T+.1,1.36,.1);}
      B(walls,'#cfe6ee',sd*(DOOR_W/2+1.9),up+2.2,hd,1.5,1.2,WALL_T+.06);B(walls,s.trim,sd*(DOOR_W/2+1.9),up+1.55,hd+.25,1.8,.12,.5);}
    // Roof: a hip roof (4-sided cone) over the room, eaves just past the walls; the sign sits on the roof group so it
    // lifts away with it when you walk in.
    if(s.kind==='lighthouse')lighthouseTower(roof,H,s,{T,geo,mat,B});else{const cone=new T.Mesh(geo(new T.ConeGeometry(1,1,4)),mat(s.roof));cone.rotation.y=Math.PI/4;cone.scale.set((s.w+1.4)*.72,2.6,(s.d+1.4)*.72);cone.position.y=H+1.3;cone.castShadow=true;roof.add(cone);}
    B(roof,s.trim,0,H+.08,0,s.w+.9,.16,s.d+.9);
    plaque(s.sign,0,H-.5,hd+WALL_T/2+.06,{w:Math.min(s.w-3,1.2+s.sign.length*.32),h:.75,wood:s.trim,ink:'#fff4dc',parent:roof});
    }
    // Inside: the counter, shelves on the back wall, a rug, a warm lamp.
    const cw=Math.min(3.4,hw-2.2)*2,cv=-hd+3.1,inside=new T.Group();inside.position.y=up;g.add(inside);
    B(inside,'#8b5e3c',0,.55,cv,cw,1.1,.85,true);B(inside,'#c89a64',0,1.13,cv,cw+.2,.08,1.05);
    for(const y of [1.1,1.9,2.7])B(inside,'#9c7350',0,y,-hd+.45,s.w-2.4,.08,.55);
    B(inside,'#b8574a',0,.02,cv+2.3,3.2,.03,2.2);B(inside,'#e6c56f',0,.03,cv+2.3,2.6,.03,1.6);
    for(const u of [-hw+1.8,hw-1.8]){ico(inside,'#ffe6ad',u,3.4,0,.3,.36,.3);B(inside,'#3f3a34',u,3.85,0,.04,.6,.04);}   // lamps to the sides, never between you and the keeper
    const shelfItems=(colors,n=9)=>{for(const y of [1.1,1.9,2.7])for(let i=0;i<n;i++){const u=-(s.w-3.4)/2+i*(s.w-3.4)/(n-1);B(inside,colors[(i+y*3|0)%colors.length],u,y+.22,-hd+.45,.4,.36,.36);}};
    decorate(s.kind,{inside,B,ico,hw,hd,cv,cw,shelfItems,s,T,geo,mat});
    // Outside: a hitching rail by the door (your horse waits here) and two flower boxes under the front windows.
    {const hx=hw+1.6;B(g,'#7a5638',hx,up+.6,hd+1.4,.14,1.2,.14);B(g,'#7a5638',hx,up+.6,hd+3.4,.14,1.2,.14);B(g,'#8d6644',hx,up+1.05,hd+2.4,.12,.12,2.2);}
    shops.push({part,group:g,walls,roof,cut:0});}

  // Cut-away: the shop you're standing in drops its walls to waist height and loses its roof (smoothly).
  function tick(time,{x,z,delta=1/30,outdoor=true}){
    for(const j of jets)j.scale.y=1+Math.sin(time*.006+j.position.x)*.08;ripple.scale.setScalar(1+((time*.0008)%1)*2.1);ripple.material.opacity=.6*(1-((time*.0008)%1));
    const here=outdoor?shopAt(x,z):null;
    for(const sh of shops){const want=sh.part===here?1:0;if(Math.abs(sh.cut-want)<.002&&sh.cut===want)continue;sh.cut+=(want-sh.cut)*Math.min(1,delta*7);if(Math.abs(sh.cut-want)<.01)sh.cut=want;
      sh.walls.scale.y=1-.78*sh.cut;sh.roof.visible=sh.cut<.5;}
    return here;}
  return {root,obstacles:TOWN_SOLIDS,gates:TOWN_GATES,tick,shopAt};
}

// What each shop has inside (local coords: u across, v towards the door, y from the floor).
function decorate(kind,{inside,B,ico,hw,hd,cv,cw,shelfItems,T,geo,mat}){
  if(kind==='bakery'){
    shelfItems(['#c8894a','#e0b071','#b5733a','#f0d39b']);
    for(let i=0;i<5;i++)ico(inside,i%2?'#c8894a':'#dba566',-cw/2+.6+i*(cw-1.2)/4,1.32,cv,.32,.2,.22);
    const cake=new T.Mesh(geo(new T.CylinderGeometry(.42,.42,.4,14)),mat('#f6c9d4'));cake.position.set(cw/2-.6,1.37,cv+.1);inside.add(cake);ico(inside,'#d8455b',cw/2-.6,1.62,cv+.1,.09,.09,.09);
    B(inside,'#a35a42',-hw+1.3,1.1,-hd+1.4,2,2.2,1.8,true);B(inside,'#3a2620',-hw+1.3,.9,-hd+2.32,1,.8,.06);B(inside,'#f4a14d',-hw+1.3,.75,-hd+2.34,.7,.3,.04);
    for(const u of [hw-1.6,hw-3.2]){B(inside,'#9a6b45',u,.75,hd-2.4,1.1,.08,1.1);B(inside,'#5b4636',u,.37,hd-2.4,.12,.75,.12);}}
  else if(kind==='post'){
    for(let r=0;r<4;r++)for(let c=0;c<8;c++)B(inside,(r+c)%3?'#efe6d2':'#d9cdb3',-2.8+c*.8,1.4+r*.42,-hd+.5,.7,.36,.4);
    for(let i=0;i<6;i++)B(inside,['#c9a46b','#b88c55','#d8b67e'][i%3],hw-1.4-(i%2)*.6,.3+Math.floor(i/2)*.5,-hd+1.5+(i%2)*.3,.8,.5,.6);
    for(let i=0;i<3;i++)B(inside,'#f3eee2',-cw/2+.7+i*.5,1.17,cv,.42,.02,.3);
    B(inside,'#c0392b',-hw+1.2,.75,hd-1.4,.7,1.5,.7,true);B(inside,'#2b2b2b',-hw+1.2,1.25,hd-1.04,.4,.06,.04);}
  else if(kind==='hall'){
    for(const sd of [-1,1]){B(inside,'#6b5644',sd*(hw-1.2),1.6,-hd+1.2,.08,3.2,.08);B(inside,sd<0?'#4f7fb8':'#d9a441',sd*(hw-1.2)+.5,2.7,-hd+1.2,.9,.6,.04);}
    B(inside,'#7a5a3e',0,2.5,-hd+.22,2.6,1.7,.08);B(inside,'#9cc3d9',0,2.6,-hd+.27,2.2,.9,.04);B(inside,'#8bb172',0,2.2,-hd+.28,2.2,.5,.04);
    for(const v of [hd-3.2,hd-1.8])for(const sd of [-1,1]){B(inside,'#8d6644',sd*3,.5,v,3.4,.1,.55);B(inside,'#8d6644',sd*3,.85,v-.25,3.4,.6,.08);}
    ico(inside,'#2f4f7f',-.4,1.25,cv,.2,.08,.16);B(inside,'#f3eee2',.5,1.17,cv,.5,.02,.36);}
  else if(kind==='store'){
    shelfItems(['#e2a14a','#c8553d','#6f9b4f','#e8d27a','#8e5a9c']);
    for(let i=0;i<4;i++){const u=-hw+1.3,v=-hd+3+i*1.5;B(inside,'#a8814f',u,.35,v,1,.7,1.1,true);for(let k=0;k<4;k++)ico(inside,['#e8762d','#d1453b','#7cae4a','#e6c34a'][i],u-.25+(k%2)*.5,.78,v-.25+(k>1?.5:0),.2,.2,.2);}
    for(const v of [hd-2.4,hd-3.6]){const b=new T.Mesh(geo(new T.CylinderGeometry(.45,.5,1,10)),mat('#8b6a45'));b.position.set(hw-1.3,.5,v);inside.add(b);}
    B(inside,'#2e3a33',cw/2-.5,1.32,cv,.6,.35,.4);}
  else if(kind==='hut'){
    B(inside,'#8d8a83',-hw+1.4,1.2,-hd+1.2,2.2,2.4,1.6,true);B(inside,'#3a2a22',-hw+1.4,.7,-hd+2.02,1.2,.9,.06);ico(inside,'#f39a4b',-hw+1.4,.55,-hd+1.9,.32,.28,.2);
    B(inside,'#e8dcc0',hw-2.2,2.4,-hd+.24,2.4,1.6,.04);B(inside,'#7aa0b8',hw-2.4,2.5,-hd+.27,1.2,.7,.03);B(inside,'#8a9a6a',hw-1.8,2.2,-hd+.27,.8,.5,.03);
    for(let i=0;i<3;i++)B(inside,['#c8553d','#4f7fb8','#e2a14a'][i],hw-.5,1.5,-1+i*.7,.08,3,.12);
    for(const v of [hd-2.2,hd-3.4])B(inside,'#7a5638',-hw+1.2,.45,v,1,.1,1);ico(inside,'#b08d5b',hw-1.2,.4,hd-2.2,.45,.35,.45);}
  else if(kind==='dairy'){
    for(let i=0;i<5;i++){const c=new T.Mesh(geo(new T.CylinderGeometry(.15,.19,.5,10)),mat('#c9ced2'));c.position.set((i<2?-1:1)*(cw/2-.3-(i%2)*.45),1.4,cv);inside.add(c);}
    for(const sd of [-1,1]){const u=sd*(hw-1.8),v=hd-3.6;B(inside,'#8d6644',u,.6,v-1.4,2.6,1.2,.1);
      const cow=new T.Group();cow.position.set(u,0,v);cow.rotation.y=sd<0?Math.PI/2:-Math.PI/2;inside.add(cow);
      B(cow,'#f4f1ea',0,1,0,.9,.8,1.8,true);B(cow,'#2d2a28',.3,1.15,.3,.35,.4,.6);B(cow,'#2d2a28',-.2,1.05,-.45,.4,.35,.4);B(cow,'#f4f1ea',0,1.25,1.05,.55,.55,.55);B(cow,'#e7a7a1',0,1.12,1.35,.4,.25,.12);
      for(const [a,b] of [[-.3,-.7],[.3,-.7],[-.3,.7],[.3,.7]])B(cow,'#f4f1ea',a,.35,b,.18,.7,.18);}
    for(let i=0;i<3;i++)B(inside,'#e2c46a',hw-1.4,.45+i*.0,-hd+1.4+i*1.4,1.6,.9,1.1,true);}
  else if(kind==='lighthouse'){
    const pole=new T.Mesh(geo(new T.CylinderGeometry(.18,.18,4.2,8)),mat('#7b7f86'));pole.position.set(hw-1.6,2.1,-hd+1.6);inside.add(pole);
    for(let i=0;i<14;i++){const a=i*.62,st=B(inside,'#b9786a',hw-1.6+Math.cos(a)*.8,.15+i*.29,-hd+1.6+Math.sin(a)*.8,1.1,.08,.42);st.rotation.y=-a;}
    B(inside,'#2e3a44',-hw+1.4,1.25,-hd+1.2,.18,.18,1);B(inside,'#7b7f86',-hw+1.4,.6,-hd+1.2,.06,1.2,.06);
    B(inside,'#d9eef0',0,1.32,cv,.5,.3,.25);B(inside,'#6b4a2e',0,1.25,cv,.12,.12,.12);}
  else if(kind==='vet'){
    shelfItems(['#ffffff','#9fd4b1','#e8eef0','#c7e2f2']);
    B(inside,'#cfd8dc',-hw+2,.45,-hd+3.6,2.2,.9,1.2,true);B(inside,'#9fd4b1',-hw+2,.92,-hd+3.6,2.1,.06,1.1);
    B(inside,'#5d9a6a',0,2.4,-hd+.24,.9,.28,.04);B(inside,'#5d9a6a',0,2.4,-hd+.25,.28,.9,.04);
    B(inside,'#f4f1e8',hw-1.2,1,-hd+2,1,2,.6,true);for(let i=0;i<4;i++)B(inside,['#e57373','#64b5f6','#81c784','#ffd54f'][i],hw-1.5+i*.2,2.1,-hd+2,.14,.24,.14);}
}
// The lighthouse's tower stands on its little keeper's room (it lifts away with the roof when you walk in).
function lighthouseTower(roof,H,s,{T,geo,mat,B}){
  const cyl=(c,r0,r1,h,y,seg=12,extra)=>{const m=new T.Mesh(geo(new T.CylinderGeometry(r0,r1,h,seg)),mat(c,extra));m.position.y=y;m.castShadow=true;roof.add(m);return m;};
  B(roof,s.trim,0,H+.1,0,s.w+.6,.2,s.d+.6);
  cyl('#e9c7bb',2.1,2.9,10,H+5.1);cyl('#f5ece0',2.2,2.4,1.2,H+3.2);cyl('#f5ece0',2.12,2.2,1.2,H+7.2);
  cyl('#eddcbb',3,3,.4,H+10.3);B(roof,'#2e3a44',0,H+10.9,0,4.6,.08,.08);B(roof,'#2e3a44',0,H+10.9,0,.08,.08,4.6);
  cyl('#fff2b8',1.5,1.5,1.5,H+11.3,10,{emissive:'#f6d36a',emissiveIntensity:.7});cyl('#638b7b',1.9,.2,1.7,H+12.9,10);
}

// ===============================================================================================================
// Step 3 (2026-11-11): something new to do in every region. Pure data and run logic first (tests import these),
// then buildActivities() for the 3D props. world.js starts a run on Interact at its start post (or its host) and
// feeds every frame to stepRun(); a finished run pays its Trotties once a day and keeps your best time.
//  · course  — checkpoints in order. Fences are 0.8 m high and solid, and count only when you cross their line
//              (so you have to jump them); rings and flowers count when you pass within r.
//  · collect — any order (the owls; they only come out at night).
//  · hunt    — one golden pumpkin, a different one every day; it only glints gold when you're close.
// Stepping-stones and fishing are their own small things (lakeStone / FISHING), and the treehouse and the lighthouse
// lamp are LOOKOUTS: Interact for a view from the top.
const ring=(cx,cz,rx,rz,n,a0=0,dir=1)=>Array.from({length:n},(_,i)=>{const a=a0+dir*i*Math.PI*2/n;return {x:Math.round((cx+Math.sin(a)*rx)*10)/10,z:Math.round((cz-Math.cos(a)*rz)*10)/10};});
// Cross-country: a rounded rectangle of 8 fences in the open meadow north of the racecourse. axis = the way you ride
// over the fence (its long side is across that).
const XC=[{x:213,z:-68,axis:'z'},{x:230,z:-90,axis:'x'},{x:248,z:-90,axis:'x'},{x:266,z:-90,axis:'x'},{x:283,z:-68,axis:'z'},{x:266,z:-46,axis:'x'},{x:248,z:-46,axis:'x'},{x:230,z:-46,axis:'x'}].map(f=>({...f,hw:2.2,kind:'fence'}));
export const FENCE_H=.8;
export const ACTIVITIES=[
  {id:'xc',name:'Clover Downs Cross-Country',icon:'🏇',region:'e',kind:'course',mounted:true,start:{x:218,z:-40},reward:30,points:XC,
    how:'Ride round and jump all 8 fences in order. Gallop at them and tap Jump!'},
  {id:'gallop',name:'Seaglass Beach Gallop',icon:'🌊',region:'sw',kind:'course',mounted:true,start:{x:-286,z:238},reward:20,
    points:Array.from({length:9},(_,i)=>({x:-276+i*17.5,z:Math.round((238+Math.sin(i*.9)*3.5)*10)/10,r:4,kind:'ring'})),how:'Gallop the sand from ring to ring, as fast as you can.'},
  {id:'bee',name:'Bee Trail',icon:'🐝',region:'s',kind:'course',mounted:false,start:{x:-4,z:210},reward:15,
    points:[[8,222],[26,236],[14,256],[38,268],[58,254],[72,234],[88,247]].map(([x,z],i,a)=>({x,z,r:i===a.length-1?3:2.6,kind:i===a.length-1?'hive':'flower'})),how:'Follow Barnaby’s bee from flower to flower to find the hive.'},
  {id:'owls',name:'Mosswood Owl Walk',icon:'🦉',region:'ne',kind:'collect',mounted:false,night:true,start:{x:236,z:-118},reward:25,
    points:[[262,-150],[226,-178],[266,-196],[246,-250],[284,-226]].map(([x,z])=>({x,z,r:7,kind:'owl'})),how:'After dark, find the five owls in the Mosswood trees.'},
  {id:'pumpkins',name:'Golden Pumpkin Hunt',icon:'🎃',region:'se',kind:'hunt',mounted:false,start:{x:248,z:116},reward:20,how:'One pumpkin in the patch is golden today. Walk the rows; it glints when you’re close.'},
  {id:'sleigh',name:'Snowy Pines Sleigh Ride',icon:'🛷',region:'nw',kind:'course',mounted:true,start:{x:-196,z:-186},host:'magnus',reward:25,
    points:ring(-226,-216,48,40,10,Math.PI*.75,-1).map(p=>({...p,r:4.5,kind:'ring'})),how:'Your horse pulls Magnus’s sleigh through the pines. Ride through every ring.'},
  {id:'ice',name:'Frozen Pond Lap',icon:'⛸️',region:'nw',kind:'course',mounted:false,start:{x:-233,z:-150},host:'frida',reward:15,
    points:ring(-250,-150,9,9,6,Math.PI/2).map(p=>({...p,r:2.6,kind:'ring'})).concat([{x:-241,z:-150,r:2.6,kind:'ring'}]),how:'Skate one lap of the frozen pond through the six rings.'},
  // v103 (2026-11-13): the new lands. Every bridge in one ride, sheaves in the wheat, posies in the flower field.
  {id:'bridges',name:'Six Bridges Ride',icon:'🌉',region:regionAt(-128,72).id,kind:'course',mounted:true,start:{x:-128,z:72},reward:40,
    points:[[-140,62],[-137,123],[110,128],[114,-12],[-108,-112],[-115,-6]].map(([x,z])=>{const b=BRIDGES.reduce((m,q)=>Math.hypot(q.x-x,q.z-z)<Math.hypot(m.x-x,m.z-z)?q:m);return {x:Math.round(b.x*10)/10,z:Math.round(b.z*10)/10,r:4.5,kind:'ring'};}),
    how:'Cross all six bridges over the Willowrush and Bramble Brook, in order. The gold ring shows the next one.'},
  {id:'sheaves',name:'Goldensheaf Sheaf Hunt',icon:'🌾',region:regionAt(60,86).id,kind:'collect',mounted:false,start:{x:60,z:108},reward:15,
    points:[[-16,-8],[-6,6],[4,-11],[13,3],[19,-4],[-19,9]].map(([u,w])=>{const f=FIELDS[0],c=Math.cos(f.rot),sn=Math.sin(f.rot);return {x:Math.round((f.x+u*c+w*sn)*10)/10,z:Math.round((f.z-u*sn+w*c)*10)/10,r:2.4,kind:'sheaf'};}),
    how:'Six golden sheaves with red ribbons are hidden in the tall wheat. Wade in and find them all.'},
  {id:'posies',name:'Posy Picking',icon:'💐',region:regionAt(-50,-60).id,kind:'collect',mounted:false,start:{x:-50,z:-78},reward:15,
    points:[[-15,-9],[-4,8],[8,-6],[16,7],[0,-2],[-12,4],[12,-11]].map(([u,w])=>{const f=FIELDS[2],c=Math.cos(f.rot),sn=Math.sin(f.rot);return {x:Math.round((f.x+u*c+w*sn)*10)/10,z:Math.round((f.z-u*sn+w*c)*10)/10,r:2.2,kind:'posy'};}),
    how:'Pick the seven ribboned posies in the flower field. They’re a gift for the clock-keeper in Thimbleford.'},
  // v105: Ottilie's lantern walk round Thimbleford after dark, and a gallop between the two mills.
  {id:'lanterns',name:'Thimbleford Lantern Walk',icon:'🏮',region:regionAt(-90,66).id,kind:'collect',mounted:false,night:true,start:{x:-98,z:64},host:'ottilie',reward:20,
    points:[[-110,56],[-70,56],[-110,79],[-70,79],[-55,64],[-126,66],[-90,94]].map(([x,z])=>({x,z,r:3,kind:'lantern'})),how:'After dark, light the seven paper lanterns round Thimbleford: walk up to each one.'},
  {id:'millrace',name:'Mill-to-Mill Gallop',icon:'🌾',region:regionAt(86,170).id,kind:'course',mounted:true,start:{x:84,z:172},reward:20,
    points:[[80,150],[70,138],[60,128],[48,124],[38,128],[34,118]].map(([x,z])=>({x,z,r:4.5,kind:'ring'})),how:'Gallop from Bramble Mill to Goldensheaf Windmill through the six rings.'},
  // v113 (note #42 wave A): three timed ring trails across open country. Your best run comes back as a ghost rider.
  {id:'trail-west',name:'Westwind Ring Trail',icon:'💨',region:regionAt(-224,95).id,kind:'course',mounted:true,start:{x:-252,z:70},reward:20,
    points:[[-246.9,62.1],[-220.5,44.7],[-195.3,68.7],[-181.5,88],[-184.4,116.4],[-202.9,130.6],[-229.7,126.6],[-254.1,129.3],[-266.3,101.8]].map(([x,z])=>({x,z,r:4.5,kind:'ring'})),how:'Gallop the nine rings round the western meadows. Beat your ghost!'},
  {id:'trail-south',name:'Foxglove Ring Trail',icon:'🦊',region:regionAt(135,-233).id,kind:'course',mounted:true,start:{x:146,z:-206},reward:20,
    points:[[138.6,-211.6],[115.6,-208.4],[100.3,-219.8],[98.6,-239.1],[111.3,-253.1],[133.3,-269],[155.8,-255.4],[169.9,-240.5],[169.9,-222.4]].map(([x,z])=>({x,z,r:4.5,kind:'ring'})),how:'Nine rings in a loop through the far fields. Beat your ghost!'},
  {id:'trail-north',name:'Hilltop Ring Trail',icon:'⛰️',region:regionAt(-68,-186).id,kind:'course',mounted:true,start:{x:-34,z:-204},reward:20,
    points:[[-35.8,-196],[-30.5,-183.6],[-40.2,-165.9],[-60.9,-166.8],[-84.4,-164.8],[-101.4,-171.9],[-105,-189.9],[-93.9,-201.4],[-72.4,-217]].map(([x,z])=>({x,z,r:4.5,kind:'ring'})),how:'Nine rings over the rolling hills. Beat your ghost!'},
  // v106: the farms. Hattie's hens lay everywhere; Gus's piglets keep squeezing out of the sty.
  {id:'eggs',name:'Puddlebrook Egg Hunt',icon:'🥚',region:'se',kind:'collect',mounted:false,start:{x:266,z:204},host:'hattie',reward:20,
    points:[[258,227],[274,212],[277,231],[246,208],[262,240],[246,281],[285,281],[293,207]].map(([x,z])=>({x,z,r:2.4,kind:'egg'})),
    how:'Hattie’s hens have laid their eggs all over the farm again. Find all eight: try the hay, the barn, the garden and the pond.'},
  {id:'piglets',name:'Runaway Piglets',icon:'🐖',region:'se',kind:'collect',mounted:false,start:{x:176,z:214},host:'gus',reward:20,
    points:[[157,215],[190,225],[186,248],[161,246],[170,190],[196,203]].map(([x,z])=>({x,z,r:2.6,kind:'piglet'})),
    how:'Six piglets squeezed out of the sty! Walk up to each one and it trots home. They hide by fences, hay and trees.'}
];
export const ACTIVITY_BY_ID=Object.fromEntries(ACTIVITIES.map(a=>[a.id,a]));
// Two new people in Snowy Pines (activity hosts, not numbered quest givers).
export const HOSTS=[
  {id:'magnus',name:'Magnus',x:-192,z:-181,role:'Sleigh driver of Snowy Pines',activity:'sleigh',lines:['Bells on, blankets on! Fancy a sleigh ride?','The pines are prettiest from a sleigh.']},
  {id:'ottilie',name:'Ottilie',x:-98,z:64,role:'Clock-keeper of Thimbleford',activity:'lanterns',lines:['Tick, tock! The lanterns want lighting after dark.','I wind the clock every Sunday. Seven lanterns, seven streets.']},
  {id:'hattie',name:'Farmer Hattie',x:266,z:204,role:'Runs Puddlebrook Farm',activity:'eggs',lines:['Those hens! Eggs in the hay, eggs in the cabbages…','Mind the mud by the pigs. They love it.','The goats climb anything. Anything!']},
  {id:'gus',name:'Farmer Gus',x:176,z:214,role:'Keeps Bramblewick Farm',activity:'piglets',lines:['Oh no, the piglets are out again!','My Highland cows are the fluffiest in the land.','Pepper and Pickle are my donkeys. They’re best friends.']},
  {id:'frida',name:'Frida',x:-231,z:-146,role:'Skating teacher at the frozen pond',activity:'ice',lines:['The ice is perfect today. One lap?','Bend your knees and glide!']},
  // Note #41: three Thimbleford folk each hold ONE piece of the moon-pegasus clue (no activity: they just chat).
  {id:'wilf',name:'Old Wilf',x:-118,z:58,role:'Stargazer of Thimbleford',lines:['Midnight is the best hour, you know. Things fly at midnight that never fly by day.','I’ve seen white wings over Thimbleford. Only ever at midnight, mind.']},
  {id:'posy',name:'Posy',x:-64,z:76,role:'Flower seller with a basket of moon-daisies',lines:['Grandma says stand in the town square and look up at the clock tower.','At midnight the moon sits right on top of our clock tower. Grandma calls it the Moon’s Hat!']},
  {id:'bram',name:'Bram',x:-96,z:92,role:'Lamplighter of Thimbleford',lines:['When the clock tower and the moon line up, keep looking up. Don’t blink!','It only lasts a few minutes after midnight. Then it’s gone till the next night.']}
];
// Pumpkin patch: 6 rows of 8. The golden one is picked from the date (same for everyone that day).
export const PATCH={x0:254,z0:104,dx:4,dz:4,cols:8,rows:6};
export const PUMPKINS=Array.from({length:PATCH.cols*PATCH.rows},(_,i)=>({x:PATCH.x0+(i%PATCH.cols)*PATCH.dx+((i/PATCH.cols|0)%2)*1.2,z:PATCH.z0+(i/PATCH.cols|0)*PATCH.dz}));
export function goldenPumpkin(day){let h=2166136261;for(const c of day)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h%PUMPKINS.length;}
// Treehouse camp (NE) and the Mosswood owls' trees; LOOKOUTS give a view from up high.
export const CAMP={x:240,z:-118,tree:{x:252,z:-110},ladder:{x:249.6,z:-108.4}};
export const LOOKOUTS=[
  {id:'treehouse',name:'the treehouse',x:CAMP.ladder.x,z:CAMP.ladder.z,reach:2.2,pos:[252,8.2,-110],look:[214,2,-178],line:'Up in the treehouse! You can see all the way to Silver Ribbon Falls.'},
  {id:'clocktower',name:'the clock tower',x:TOWN2.clock.x,z:TOWN2.clock.z+3.8,reach:2.4,pos:[TOWN2.clock.x,16,TOWN2.clock.z+3.4],look:[TOWN2.x,0,TOWN2.z+22],line:'Up in the clock tower! All of Thimbleford’s rooftops are below you, and the river beyond.'},
  {id:'lamp',name:'the lamp',x:-210.4,z:192.6,reach:2,pos:[-213,19,191],look:[-206,0,232],line:'Up at the lamp! The whole Seaglass Coast is below you.',inside:'lighthouse'}
];
// Lily Lake (W): stepping-stones across its west side, and a fishing spot at the end of the dock.
export const LAKE={x:-203,z:3,rx:10.8,rz:7.6};
// The lake's water surface: world.js drew it at 0.15 over the old valley spot (22,-7) and moved it with the ground.
export const LAKE_WATER=.15+terrainHeight(LAKE.x,LAKE.z)-terrainHeight(22,-7);
export const STONES=Array.from({length:12},(_,i)=>({x:-209+(i%2?.38:-.38),z:Math.round((-4.6+i*1.38)*100)/100,r:.82}));
export function lakeStone(x,z){for(let i=0;i<STONES.length;i++){const s=STONES[i];if(Math.hypot(x-s.x,z-s.z)<s.r)return i;}return -1;}
// The lake lets you through only along the stones (world-logic blocked() asks o.pass).
// The old dock (world.js, moved with the lake) reaches in from the north shore: on foot you can walk out along it.
export const DOCK={x:-203,z0:8.1,z1:12.2,hw:1.2};
export const onDock=(x,z)=>Math.abs(x-DOCK.x)<DOCK.hw&&z>DOCK.z0&&z<DOCK.z1;
export const stonePass=(x,z,r)=>r<.5&&((Math.abs(x+209)<.9&&z>-5.4&&z<11.4)||(Math.abs(x-DOCK.x)<DOCK.hw-.3&&z>DOCK.z0+.3&&z<DOCK.z1+1));
export const FISHING={x:-203,z:8.8,reach:1.6};
export const FISH=[{name:'Little minnow',w:40,coins:1},{name:'Perch',w:26,coins:2},{name:'Lily carp',w:16,coins:3},{name:'Rainbow trout',w:10,coins:5},{name:'Old boot',w:6,coins:0},{name:'Golden trout',w:2,coins:25}];
export function pickFish(r){let t=r*FISH.reduce((a,f)=>a+f.w,0);for(const f of FISH){if((t-=f.w)<0)return f;}return FISH[0];}
// Snowy Pines: the region north-west of the ring road. Frozen pond for skating.
export const SNOW={x0:-300,x1:-112,z0:-300,z1:-112};
export const inSnow=(x,z)=>x<SNOW.x1&&z<SNOW.z1;
export const ICE={x:-250,z:-150,r:14};
// ===============================================================================================================
// Clover Downs Show Ring (v72, 2026-11-12; Yoshi: "a horse jump show arena? Gamified? On the map.. physically";
// plan A: at Clover Downs, open to all). A real fenced sand ring south-east of the racecourse. Ride in through the
// gate; the clock starts at the start flags; jump the numbered fences in order. Rules as show-course.mjs: a knocked
// rail or a refusal is 4 faults, every second over the time allowed is 1 more, and 3 refusals put you out.
// Higher fences need more speed (low = a trot, medium = a canter, high = a gallop), and you must be in the air as you
// reach the rails: still on the ground, the horse stops (a refusal) and you circle back for another go.
//  · Open Round: anyone, 8 fences, low and medium.
//  · Clover Cup / Grand Valley Championship: the show page's entry rules (Show Jacket, upgraded saddle, horse level).
// The course changes every day (one of three plans, styles and colours from the date; heights per class). Three
// computer riders jumped earlier that day (show-course field()), so every finished round places 1st–4th and wins a
// rosette. Trotties are paid once a day per class. Pure data + maths here; buildArena() (below) is the 3D.
export const ARENA={x:238,z:56,hw:22,hl:35,gateU:-14,gateW:6,startV:-30};
export const arenaWorld=(u,v)=>({x:ARENA.x+u,z:ARENA.z+v});
export const arenaLocal=(x,z)=>({u:x-ARENA.x,v:z-ARENA.z});
export const inArena=(x,z,m=0)=>Math.abs(x-ARENA.x)<ARENA.hw+m&&Math.abs(z-ARENA.z)<ARENA.hl+m;
export const ARENA_POST=arenaWorld(-19.5,-38),ARENA_STEWARD=arenaWorld(-9,-38.5);
// Heights in world speeds (riding.mjs TOP_SPEED 9.4; 8.1 without an upgraded saddle).
export const ARENA_HEIGHTS={low:{h:.8,need:4.2,label:'low'},mid:{h:1.05,need:5.8,label:'medium'},high:{h:1.3,need:7.4,label:'high'}};
// Three plans in ring coords (u east, v south; heading in degrees, 0 = riding south, 90 = east). Tests check them:
// fences ≥ 9 m apart, every line from one fence to the next clear of the others' rails and wings, all inside the rail.
export const ARENA_PLANS=[
  {name:'the big loop',f:[[-14,-17,0],[-14,7,0],[0,27,90],[11,9,180],[11,-15,180],[2,-26,270],[-8,-8,30],[0,9,30],[10,25,70],[18,-4,180]]},
  {name:'the serpentine',f:[[-14,-17,0],[-14,7,0],[-1,26,90],[14,10,180],[3,-1,270],[-5,-16,180],[8,-26,90],[16,-10,0],[5,12,300],[-10,24,270]]},
  {name:'the crossing diagonals',f:[[-14,-16,0],[-8,6,20],[6,24,70],[16,6,180],[16,-16,180],[4,-27,270],[-8,-25,315],[-1,-6,30],[9,12,20],[-12,24,270]]}];
export const ARENA_CLASSES=[
  {id:'open',name:'Open Round',icon:'🎀',jumps:8,mix:{low:5,mid:3,high:0},pace:5.6,prize:[40,25,15,8],field:'clover',blurb:'Anyone can ride. Eight low and medium fences.'},
  {id:'cup',name:SHOWS.clover.name,icon:'🏆',jumps:8,mix:{low:1,mid:5,high:2},pace:6.2,prize:SHOWS.clover.prize,fee:SHOWS.clover.fee,field:'clover',show:SHOWS.clover,blurb:'Eight fences, medium and high.'},
  {id:'grand',name:SHOWS.grand.name,icon:'👑',jumps:10,mix:{low:0,mid:4,high:6},pace:6.6,prize:SHOWS.grand.prize,fee:SHOWS.grand.fee,field:'grand',show:SHOWS.grand,blurb:'Ten fences, mostly high. The big one.'}];
export const ARENA_CLASS=Object.fromEntries(ARENA_CLASSES.map(c=>[c.id,c]));
const FENCE_STYLES=['vertical','oxer','wall','flowers'];
export const FENCE_COLORS=[['#d64541','#ffffff'],['#2f6fb5','#ffffff'],['#3c8f5a','#f2d15c'],['#e58a2e','#ffffff'],['#7b4fa8','#f4e3ff'],['#1f2a44','#f2c45d']];
export function arenaCourse(day,clsId='open'){const cls=ARENA_CLASS[clsId]||ARENA_CLASS.open,R=rng(hashSeed('arena-'+day)),plan=ARENA_PLANS[Math.floor(R()*ARENA_PLANS.length)];
  const looks=plan.f.map(()=>({style:FENCE_STYLES[Math.floor(R()*FENCE_STYLES.length)],colors:FENCE_COLORS[Math.floor(R()*FENCE_COLORS.length)]}));
  const H=rng(hashSeed('arena-'+day+'-'+cls.id)),bag=[];for(const k of ['low','mid','high'])for(let n=0;n<cls.mix[k];n++)bag.push(k);
  for(let i=bag.length-1;i>0;i--){const j=Math.floor(H()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
  if(bag[0]==='high'){const k=bag.findIndex(b=>b!=='high');if(k>0)[bag[0],bag[k]]=[bag[k],bag[0]];}   // a gentle first fence
  const fences=plan.f.map(([u,v,deg],i)=>{const a=deg*Math.PI/180,p=arenaWorld(u,v),height=i<cls.jumps?bag[i]:'low';
    return {n:i+1,x:p.x,z:p.z,u,v,dir:a,dx:Math.sin(a),dz:Math.cos(a),hw:2.3,height,...ARENA_HEIGHTS[height],...looks[i],inCourse:i<cls.jumps};});
  // Time allowed: the ridden distance (start flags, then each fence's 4 m run-in) at the class's pace.
  let len=0,prev=arenaWorld(ARENA.gateU,ARENA.startV);
  for(const f of fences.slice(0,cls.jumps)){len+=Math.hypot(f.x-f.dx*4-prev.x,f.z-f.dz*4-prev.z)*1.15+8;prev={x:f.x+f.dx*4,z:f.z+f.dz*4};}
  return {day,cls,plan:plan.name,fences,jumps:cls.jumps,length:Math.round(len),allowed:Math.ceil(len/cls.pace)};}
// The solid bits of a fence: three boxes along its rails (height = the rails, or −1 while it's the one you're
// jumping, so the judge decides) and its two wing stands (always solid).
export function fenceSolids(f){const cx=Math.cos(f.dir),cz=-Math.sin(f.dir);
  return {rails:[-1.5,0,1.5].map(o=>({kind:'box',x:f.x+cx*o,z:f.z+cz*o,hx:.55,hz:.55,height:f.h})),
    wings:[-2.9,2.9].map(o=>({kind:'box',x:f.x+cx*o,z:f.z+cz*o,hx:.3,hz:.3,height:2}))};}
// The ring itself: the rail all round (too high to hop, with a gap at the gate), the bleachers on the east side,
// the judges' box on the west side and the scoreboard at the south end.
export const ARENA_STATIC=(()=>{const {x,z,hw,hl,gateU,gateW}=ARENA,H=1.6,t=.2,out=[];
  const w0=-hw,w1=gateU-gateW/2,e0=gateU+gateW/2;
  out.push({kind:'box',x:x+(w0+w1)/2,z:z-hl,hx:(w1-w0)/2,hz:t,height:H},{kind:'box',x:x+(e0+hw)/2,z:z-hl,hx:(hw-e0)/2,hz:t,height:H},
    {kind:'box',x,z:z+hl,hx:hw,hz:t,height:H},{kind:'box',x:x-hw,z,hx:t,hz:hl,height:H},{kind:'box',x:x+hw,z,hx:t,hz:hl,height:H},
    {kind:'box',x:x+hw+4.2,z,hx:3,hz:15,height:3},     // bleachers
    {kind:'box',x:x-hw-4,z,hx:1.8,hz:1.8,height:4},     // judges' box
    {kind:'box',x,z:z+hl+3,hx:3.8,hz:.4,height:5});    // scoreboard
  return out;})();
// Practice fences beside the ring: one of each height, jumped in either direction, judged with a tip.
export const PRACTICE=[['low',40],['mid',57],['high',74]].map(([height,z],i)=>({n:i+1,x:205,z,dir:0,dx:0,dz:1,hw:2.3,height,...ARENA_HEIGHTS[height],style:'vertical',colors:FENCE_COLORS[i*2],inCourse:true}));
export const PRACTICE_SIGN={x:205,z:31};
// Which way (±1) a rider crossed a fence's line between two frames, or 0.
export function crossed(f,prev,pos,slack=.4){const a0=(prev.x-f.x)*f.dx+(prev.z-f.z)*f.dz,a1=(pos.x-f.x)*f.dx+(pos.z-f.z)*f.dz,lat=Math.abs((pos.x-f.x)*f.dz-(pos.z-f.z)*f.dx);
  return lat<f.hw+slack&&Math.sign(a0)!==Math.sign(a1)&&a1!==0?Math.sign(a1):0;}
// How a fence went: 'refusal' (still on the ground), 'rail' (in the air but too slow for its height) or 'clear'.
export const judgeJump=(f,{air,speed})=>!air?'refusal':speed<f.need?'rail':'clear';
// ---- a round ----
export function startRound(course,now){return {course,i:0,started:false,t0:now,knock:0,refuse:0,prev:null,done:false,log:[]};}
export function stepRound(r,{x,z,air,speed},now){if(r.done)return null;const prev=r.prev;r.prev={x,z};if(!prev)return null;
  const l0=arenaLocal(prev.x,prev.z),l1=arenaLocal(x,z);
  if(!r.started){if(l0.v<=ARENA.startV&&l1.v>ARENA.startV&&Math.abs(l1.u)<ARENA.hw){r.started=true;r.t0=now;return {type:'go'};}return null;}
  if(!inArena(x,z,1.5)){r.done=true;return {type:'retired'};}
  const f=r.course.fences[r.i];if(crossed(f,prev,{x,z})!==1)return null;
  const how=judgeJump(f,{air,speed});r.log.push(how);
  if(how==='refusal'){r.refuse++;const back={x:f.x-f.dx*4,z:f.z-f.dz*4};r.prev={...back};
    if(r.refuse>=3){r.done=true;return {type:'out',f,back,result:arenaResult(r,now)};}return {type:'refusal',f,back};}
  if(how==='rail')r.knock++;r.i++;const ev={type:how,f};
  if(r.i>=r.course.jumps){r.done=true;ev.result=arenaResult(r,now);}
  return ev;}
// The three riders who jumped this class earlier today (the same for everyone that day).
export const arenaRivals=c=>{const seen=new Set();return field(SHOWS[c.cls.field]||SHOWS.clover,hashSeed('arena-field-'+c.day+'-'+c.cls.id),c.allowed).filter(q=>!seen.has(q.name)&&seen.add(q.name)).slice(0,3).map(q=>({...q,eliminated:false}));};
export function arenaResult(r,now){const c=r.course,time=r.started?(now-r.t0)/1000:0,eliminated=r.refuse>=3;
  const sc=score({time,allowed:c.allowed,knockdowns:r.knock,refusals:r.refuse});
  const rivals=arenaRivals(c);
  const me={name:'You',me:true,time,...sc,eliminated},all=[...rivals,me].sort((a,b)=>(a.eliminated-b.eliminated)||a.faults-b.faults||a.time-b.time);
  const place=eliminated?0:all.indexOf(me)+1;
  return {cls:c.cls.id,time,...sc,eliminated,allowed:c.allowed,knock:r.knock,refuse:r.refuse,all,place,prize:place?c.cls.prize[place-1]||0:0};}
export function roundStatus(r,pos,now){const c=r.course;if(!r.started)return `${c.cls.icon} ${c.cls.name} · ride in past the start flags`;
  const t=(now-r.t0)/1000,f=c.fences[Math.min(r.i,c.jumps-1)],ahead=(f.x-pos.x)*f.dx+(f.z-pos.z)*f.dz,faults=4*(r.knock+r.refuse)+timeFaults(t,c.allowed);
  return `Fence ${r.i+1}/${c.jumps} · ${t.toFixed(1)} / ${c.allowed} s · ${faults} faults${ahead>0&&ahead<6.5&&Math.hypot(f.x-pos.x,f.z-pos.z)<7?' · JUMP!':''}`;}
export const PLACE_NAME=['Eliminated','1st','2nd','3rd','4th'];
export const ROSETTE=[['#9aa0a6','#c9cdd1'],['#2f6fb5','#7fb0e8'],['#d64541','#f29b97'],['#f2f2f2','#c9c9c9'],['#e8c547','#f6e39c']];   // place → colours (UK style: 1st blue, 2nd red, 3rd white, 4th yellow)

// Everything solid the activities add (quest spots stay off these; the 3D world uses the same list).
const fenceBox=f=>f.axis==='x'?{kind:'box',x:f.x,z:f.z,hx:.22,hz:f.hw,height:FENCE_H}:{kind:'box',x:f.x,z:f.z,hx:f.hw,hz:.22,height:FENCE_H};
export const ACT_SOLIDS=[...XC.map(fenceBox),...ARENA_STATIC,
  {kind:'box',x:CAMP.tree.x,z:CAMP.tree.z,hx:1.1,hz:1.1,height:12},{kind:'lake',x:CAMP.x,z:CAMP.z,rx:1.1,rz:1.1,height:.6},
  {kind:'box',x:CAMP.x-7,z:CAMP.z+4,hx:1.6,hz:1.4,height:2.2},{kind:'box',x:CAMP.x+6,z:CAMP.z+7,hx:1.6,hz:1.4,height:2.2},
  {kind:'box',x:88,z:249.5,hx:.7,hz:.7,height:1.6},                                    // the beehive
  {kind:'box',x:-186,z:-188,hx:3,hz:2.2,height:3.4}                                    // Magnus's sleigh shed
];

// ---- runs ----
export function startRun(a,now,pos){return {id:a.id,i:0,found:[],t0:now,prev:{x:pos.x,z:pos.z}};}
// One frame of a run: returns null (nothing new), {type:'next',i}, {type:'found',n} or {type:'done',ms}.
export function stepRun(run,pos,now){const a=ACTIVITY_BY_ID[run.id];let ev=null;
  if(a.kind==='course'){const p=a.points[run.i];
    let hit;if(p.kind==='fence'){const side=q=>Math.sign(p.axis==='x'?q.x-p.x:q.z-p.z),lat=p.axis==='x'?Math.abs(pos.z-p.z):Math.abs(pos.x-p.x);hit=side(run.prev)!==0&&side(pos)!==side(run.prev)&&lat<p.hw+.3;}
    else hit=Math.hypot(pos.x-p.x,pos.z-p.z)<p.r;
    if(hit){run.i++;ev=run.i>=a.points.length?{type:'done',ms:now-run.t0}:{type:'next',i:run.i};}}
  else if(a.kind==='collect'){a.points.forEach((p,k)=>{if(!run.found.includes(k)&&Math.hypot(pos.x-p.x,pos.z-p.z)<p.r){run.found.push(k);ev={type:'found',n:run.found.length};}});
    if(run.found.length>=a.points.length)ev={type:'done',ms:now-run.t0};}
  run.prev={x:pos.x,z:pos.z};return ev;}
// How far the next target is (for the HUD), or the collect count.
export function runStatus(run,pos,now){const a=ACTIVITY_BY_ID[run.id],s=((now-run.t0)/1000).toFixed(1)+' s';
  if(a.kind==='collect')return `${a.icon} ${run.found.length}/${a.points.length} · ${s}`;
  const p=a.points[Math.min(run.i,a.points.length-1)];return `${a.icon} ${run.i}/${a.points.length} · ${s} · ${Math.round(Math.hypot(p.x-pos.x,p.z-pos.z))} m`;}
// A run ends if you wander far from it (or get off the horse in a riding one: world.js checks that).
export function runAbandoned(run,pos){const a=ACTIVITY_BY_ID[run.id],pts=a.points||[];return !pts.some(p=>Math.hypot(p.x-pos.x,p.z-pos.z)<130);}

// ---------------------------------------------------------------------------------------------------------------
// The activities in 3D. Only what each one needs: fences and flags, a sand strip, flowers and a hive, owls (night
// only), the pumpkin patch, the treehouse camp, Snowy Pines (snowy pines as instanced meshes, the frozen pond, the
// sleigh shed and the sleigh that follows your horse during the ride), the stepping-stones and the dock's rod.
export function buildActivities({T,outdoors,geo,mat,box,ico,label,groundY}){
  const root=new T.Group();root.name='activities';outdoors.add(root);
  const B=(p,c,x,y,z,sx,sy,sz,sh=false)=>box(p,c,x,y,z,sx,sy,sz,sh);
  const at=(g,x,z,yaw=0)=>{g.position.set(x,groundY(x,z),z);g.rotation.y=yaw;root.add(g);return g;};
  const group=()=>new T.Group();
  function strip(points,width,color,lift=.05){const v=[],idx=[];for(let i=0;i<points.length;i++){const p=points[i],q=points[Math.min(i+1,points.length-1)],o=points[Math.max(i-1,0)],tx=q.x-o.x,tz=q.z-o.z,l=Math.hypot(tx,tz)||1;
      for(const sd of [-1,1]){const x=p.x-tz/l*width/2*sd,z=p.z+tx/l*width/2*sd;v.push(x,groundY(x,z)+lift,z);}if(i<points.length-1){const k=i*2;idx.push(k,k+2,k+1,k+1,k+2,k+3);}}
    const g=geo(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();const m=new T.Mesh(g,mat(color,{side:T.DoubleSide}));m.receiveShadow=true;m.renderOrder=-9;root.add(m);return m;}
  const post=(a)=>{const g=at(group(),a.start.x,a.start.z);B(g,'#7a5638',0,1.2,0,.16,2.4,.16);B(g,'#e5c76b',0,2.3,0,1.6,.6,.1);g.add(label(a.name.toUpperCase(),0,3.1,0,Math.min(6,2+a.name.length*.13)));return g;};
  ACTIVITIES.forEach(a=>{if(!a.host)post(a);});

  // Cross-country fences: rails and brush, flags either side.
  for(const f of XC){const g=at(group(),f.x,f.z,f.axis==='x'?Math.PI/2:0);
    for(const y of [.35,.7])B(g,'#e8dcc0',0,y,0,f.hw*2,.12,.14);B(g,'#5f8f4e',0,.3,0,f.hw*2-.2,.5,.35);for(const sd of [-1,1]){B(g,'#7a5638',sd*f.hw,.6,0,.16,1.2,.16);B(g,sd<0?'#d9534f':'#ffffff',sd*f.hw,1.4,.25,.05,.4,.5);}}
  // Beach gallop: a long strip of sand along the far shore.
  strip(Array.from({length:30},(_,i)=>({x:-292+i*5.6,z:238+Math.sin((i*5.6)/17.5*.9)*3.5})),11,'#e6dbb3',.05);
  // Bee trail: flower clumps and the hive.
  ACTIVITIES.find(a=>a.id==='bee').points.forEach((p,i,arr)=>{const g=at(group(),p.x,p.z);
    if(i===arr.length-1){B(g,'#7a5638',0,.4,0,1.1,.8,1.1,true);for(let k=0;k<3;k++)B(g,['#f2c45d','#e8b23f','#f2c45d'][k],0,.95+k*.32,0,1.2-k*.15,.3,1.2-k*.15,true);B(g,'#3a2a22',0,1.05,.62,.3,.12,.04);}
    else for(let k=0;k<7;k++)ico(g,['#f2c45d','#e58fa6','#b48be0','#ffffff'][(k+i)%4],Math.sin(k*2.4)*.8,.35,Math.cos(k*2.4)*.8,.26,.26,.26);});
  // Owls: on posts with a little roof of leaves, only visible at night.
  const owls=[];ACTIVITIES.find(a=>a.id==='owls').points.forEach(p=>{const g=at(group(),p.x,p.z);B(g,'#7a5638',0,1.8,0,.4,3.6,.4,true);ico(g,'#4f7d4a',0,4.3,0,1.6,1.3,1.6);
    const o=group();o.position.set(0,3.75,.35);g.add(o);ico(o,'#9a7a58',0,0,0,.32,.4,.28);for(const sd of [-1,1])ico(o,'#fff1b0',sd*.12,.12,.24,.07,.07,.04);ico(o,'#e2a14a',0,.04,.28,.04,.05,.04);owls.push(o);});
  // Pumpkin patch with one golden pumpkin (it looks orange until you're close).
  const pumpkins=PUMPKINS.map(p=>{const g=at(group(),p.x,p.z);const m=ico(g,'#e8762d',0,.38,0,.55,.42,.55,true);B(g,'#5f8f4e',0,.82,0,.08,.2,.08);return m;});
  for(let r=0;r<PATCH.rows;r++)strip([{x:PATCH.x0-2,z:PATCH.z0+r*PATCH.dz},{x:PATCH.x0+PATCH.cols*PATCH.dx+2,z:PATCH.z0+r*PATCH.dz}],1.6,'#8b6a45',.03);
  // Treehouse camp: a big tree with a platform and a ladder, two tents and a campfire.
  {const t=at(group(),CAMP.tree.x,CAMP.tree.z);const trunk=new T.Mesh(geo(new T.CylinderGeometry(.8,1.1,12,8)),mat('#8a6a4a'));trunk.position.y=6;trunk.castShadow=true;t.add(trunk);
    for(const [x,y,z,s] of [[0,11.5,0,4],[-2,10,1.5,3],[2.2,10.5,-1,3]])ico(t,'#5f8f4e',x,y,z,s,s*.8,s);
    B(t,'#9c7350',0,6.5,0,5,.25,5,true);for(const [x,z] of [[-2.4,0],[2.4,0],[0,-2.4],[0,2.4]])B(t,'#7a5638',x,7.1,z,x?.12:5,1,z?.12:5);B(t,'#b5553f',0,8.6,0,3,2.2,3);
    const lad=group();lad.position.set(-2.4,0,1.6);t.add(lad);for(const sd of [-.35,.35])B(lad,'#7a5638',sd,3.3,0,.1,6.6,.1);for(let i=0;i<11;i++)B(lad,'#9c7350',0,.4+i*.58,0,.8,.08,.1);}
  for(const [dx,dz,c] of [[-7,4,'#d9a441'],[6,7,'#4f7fb8']]){const g=at(group(),CAMP.x+dx,CAMP.z+dz);const tent=new T.Mesh(geo(new T.ConeGeometry(1.9,2.2,4)),mat(c));tent.position.y=1.1;tent.rotation.y=Math.PI/4;tent.castShadow=true;g.add(tent);}
  const fire=at(group(),CAMP.x,CAMP.z);for(let k=0;k<6;k++)ico(fire,'#8d8a83',Math.sin(k)*1,.15,Math.cos(k)*1,.25,.2,.25);const flame=ico(fire,'#f39a4b',0,.45,0,.35,.6,.35);
  // Snowy Pines: instanced snowy pines (3 draw calls), the frozen pond, Magnus's shed and the sleigh.
  {const spots=[];let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
    const road=[[-150,-110],[-185,-150],[-200,-190]],offRoad=(x,z)=>{for(let k=0;k<road.length-1;k++){const [ax,az]=road[k],[bx,bz]=road[k+1],dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));if(Math.hypot(ax+dx*t-x,az+dz*t-z)<7)return false;}return true;};
    const ringPts=ACTIVITIES.find(a=>a.id==='sleigh').points;
    const clear=(x,z)=>Math.hypot(x-ICE.x,z-ICE.z)>ICE.r+5&&ringPts.every(p=>Math.hypot(p.x-x,p.z-z)>9)&&HOSTS.every(h=>Math.hypot(h.x-x,h.z-z)>12)&&offRoad(x,z);
    for(let k=0;spots.length<120&&k<2000;k++){const x=SNOW.x0+6+rnd()*(SNOW.x1-SNOW.x0-12),z=SNOW.z0+6+rnd()*(SNOW.z1-SNOW.z0-12);if(x>-150&&z>-150)continue;if(clear(x,z))spots.push({x,z,s:.8+rnd()*.6});}
    const dummy=new T.Object3D(),parts=[[new T.CylinderGeometry(.25,.32,1.6,6),'#7a5a40',.8,1],[new T.ConeGeometry(1.8,3,7),'#3f6b52',2.6,1],[new T.ConeGeometry(1.3,2.2,7),'#f4f7f9',4.2,1]];
    for(const [g,c,y] of parts){const im=new T.InstancedMesh(geo(g),mat(c),spots.length);spots.forEach((p,i)=>{dummy.position.set(p.x,groundY(p.x,p.z)+y*p.s,p.z);dummy.scale.setScalar(p.s);dummy.updateMatrix();im.setMatrixAt(i,dummy.matrix);});im.castShadow=true;root.add(im);}}
  {const ice=new T.Mesh(geo(new T.CircleGeometry(ICE.r,36)),mat('#cfe8f2',{roughness:.15,metalness:.1}));ice.rotation.x=-Math.PI/2;ice.position.set(ICE.x,groundY(ICE.x,ICE.z)+.06,ICE.z);ice.renderOrder=-8;root.add(ice);
    const rim=new T.Mesh(geo(new T.RingGeometry(ICE.r,ICE.r+1.2,36)),mat('#f4f7f9'));rim.rotation.x=-Math.PI/2;rim.position.copy(ice.position);rim.position.y+=.01;rim.renderOrder=-8;root.add(rim);}
  {const g=at(group(),-186,-188);B(g,'#8a5a3a',0,1.6,0,6,3.2,4.4,true);const r=new T.Mesh(geo(new T.ConeGeometry(4.4,1.8,4)),mat('#f4f7f9'));r.rotation.y=Math.PI/4;r.scale.set(1,1,.75);r.position.y=4.1;g.add(r);g.add(label('SLEIGH RIDES',0,5.6,0,4.6));}
  const sleigh=group();{B(sleigh,'#b5303a',0,.7,0,1.6,.7,2.4,true);B(sleigh,'#b5303a',0,1.15,-.9,1.6,.9,.3);B(sleigh,'#e5c76b',0,1.12,1.25,1.7,.12,.12);for(const sd of [-.75,.75]){B(sleigh,'#e5c76b',sd,.18,0,.1,.1,2.8);B(sleigh,'#e5c76b',sd,.32,1.35,.1,.3,.1);}
    for(const sd of [-.6,.6])B(sleigh,'#6b4a2e',sd,.9,2.3,.08,.08,2.2);}
  sleigh.visible=false;root.add(sleigh);
  const parked=sleigh.clone();parked.visible=true;at(parked,-181,-184,Math.PI/2);
  // Stepping-stones and the rod on the dock.
  for(const s of STONES){const m=new T.Mesh(geo(new T.CylinderGeometry(s.r,s.r*1.12,.5,9)),mat('#a9a99a'));m.position.set(s.x,stoneTop(s)-.25,s.z);m.scale.y=Math.max(1,(stoneTop(s)-groundY(s.x,s.z)+.1)/.5);m.position.y=stoneTop(s)-.25*m.scale.y;m.castShadow=true;m.receiveShadow=true;root.add(m);}
  function stoneTop(s){return Math.max(groundY(s.x,s.z)+.18,LAKE_WATER+.3);}
  {const rod=group();rod.position.set(FISHING.x+.6,groundY(FISHING.x,FISHING.z)+.6,FISHING.z-.6);B(rod,'#7a5638',0,0,0,.05,.05,2.4);rod.rotation.x=.6;root.add(rod);}

  // v103: sheaves (a gold bundle tied with red) and posies (a little bunch on a ribboned stake) for the two new hunts.
  ACTIVITIES.find(a=>a.id==='sheaves').points.forEach(p=>{const g=at(group(),p.x,p.z);B(g,'#f0c94f',0,.75,0,.7,1.5,.7,true);ico(g,'#f6d76a',0,1.6,0,.9,.5,.9);B(g,'#c0392b',0,.85,0,.74,.16,.74);});
  const paperLanterns=ACTIVITIES.find(a=>a.id==='lanterns').points.map((p,i)=>{const g=at(group(),p.x,p.z);B(g,'#4a3426',0,1.4,0,.12,2.8,.12);B(g,'#4a3426',.35,2.75,0,.8,.08,.08);const l=ico(g,['#e8574f','#f2c94c','#f2994a','#e86fa0'][i%4],.7,2.25,0,.55,.7,.55);const glow=ico(g,'#fff1b0',.7,2.25,0,.3,.4,.3);return {l,glow};});
  ACTIVITIES.find(a=>a.id==='posies').points.forEach((p,i)=>{const g=at(group(),p.x,p.z);B(g,'#7a5638',0,.55,0,.08,1.1,.08);B(g,'#e84a6f',0,1.05,0,.3,.1,.3);for(let k=0;k<5;k++)ico(g,['#ffffff','#f6c945','#b26ad6','#f49ac1','#5b8de0'][(k+i)%5],Math.sin(k*1.3)*.22,1.25+(k%2)*.1,Math.cos(k*1.3)*.22,.2,.2,.2);});
  // v106: eggs in a little straw nest; piglets that wiggle on the spot (they trot off home once found).
  ACTIVITIES.find(a=>a.id==='eggs').points.forEach((p,i)=>{const g=at(group(),p.x,p.z);ico(g,'#d9b860',0,.1,0,.6,.16,.6);for(let k=0;k<(i%3)+1;k++)ico(g,k%2?'#e9d2b0':'#fbf7ee',(k-.5)*.22,.3,(k%2)*.15,.17,.22,.17);});
  const piglets=ACTIVITIES.find(a=>a.id==='piglets').points.map((p,i)=>{const g=at(group(),p.x,p.z,i*1.3);const b=group();g.add(b);ico(b,'#f4a9b4',0,.32,0,.36,.3,.5);ico(b,'#f4a9b4',0,.4,.38,.26,.25,.24);B(b,'#e98c99',0,.38,.6,.16,.12,.06);
    for(const sd of [-1,1]){B(b,'#e98c99',sd*.12,.6,.36,.1,.12,.05);B(b,'#2d2a28',sd*.09,.46,.58,.04,.05,.02);for(const fz of [-.22,.22])B(b,'#e98c99',sd*.15,.08,fz,.08,.16,.08);}ico(b,'#e98c99',0,.42,-.48,.08,.08,.08);return {b,i};});
  // The marker over the next target (a slowly turning gold ring), and the bee for the bee trail.
  const marker=new T.Mesh(geo(new T.TorusGeometry(1.4,.12,8,28)),mat('#f2c45d',{emissive:'#f2c45d',emissiveIntensity:.5}));marker.visible=false;root.add(marker);
  const bee=group();ico(bee,'#f2c45d',0,0,0,.18,.15,.22);B(bee,'#2d2a28',0,0,0,.37,.31,.08);for(const sd of [-1,1])ico(bee,'#ffffff',sd*.15,.12,0,.14,.04,.1);bee.visible=false;root.add(bee);
  let target=null,day='',golden=-1;
  const dockTop=terrainHeight(DOCK.x,DOCK.z1)+.34;
  const arena=buildArena({T,root,geo,mat,box,ico,label,groundY});
  return {root,obstacles:[...ACT_SOLIDS,...arena.obstacles],arena,stoneTop:i=>stoneTop(STONES[i]),
    // Standing height on the stones and the dock (−∞ elsewhere): world.js groundY takes the higher of this and the ground.
    floor(x,z){if(Math.abs(x+206)>8||Math.abs(z-3)>10)return -Infinity;if(onDock(x,z))return dockTop;const i=lakeStone(x,z);return i>=0?stoneTop(STONES[i]):-Infinity;},
    setTarget(run){const a=run&&ACTIVITY_BY_ID[run.id];const home=run?.id==='piglets'?run.found||[]:[];for(const p of piglets)p.b.parent.visible=!home.includes(p.i);target=a&&a.kind==='course'&&run.i<a.points.length?a.points[run.i]:null;marker.visible=!!target&&a.id!=='bee';bee.visible=!!target&&a.id==='bee';
      if(target){const y=groundY(target.x,target.z);marker.position.set(target.x,y+(target.kind==='fence'?2.4:2.2),target.z);marker.rotation.set(0,target.kind==='fence'&&target.axis==='z'?Math.PI/2:target.kind==='fence'?0:0,0);}},
    golden(today){if(today!==day){day=today;golden=goldenPumpkin(today);}return golden;},
    tick(now,{x,z,night,sleighOn,horse,delta}){const t=now*.001;arena.tick(now,delta);marker.rotation.y+=delta*1.2;flame.scale.y=1+Math.sin(t*9)*.15;
      for(const o of owls)o.visible=night;for(const p of piglets){p.b.rotation.y=Math.sin(t*3+p.i)*.35;p.b.position.y=Math.abs(Math.sin(t*6+p.i))*.08;}for(const p of paperLanterns){p.glow.visible=night;p.l.material=mat(night?'#ffcf6a':'#e8574f',night?{emissive:'#ffb347',emissiveIntensity:.8}:{});}
      if(bee.visible&&target){const k=Math.min(1,delta*1.6);bee.position.x+=(target.x+Math.sin(t*2)*.6-bee.position.x)*k;bee.position.z+=(target.z+Math.cos(t*2)*.6-bee.position.z)*k;bee.position.y=groundY(bee.position.x,bee.position.z)+1.2+Math.sin(t*6)*.15;}
      else if(target)bee.position.set(x,groundY(x,z)+1.5,z);
      const gi=golden;pumpkins.forEach((m,i)=>{const near=i===gi&&Math.hypot(PUMPKINS[i].x-x,PUMPKINS[i].z-z)<3.2;m.material=mat(near?'#f6d36a':'#e8762d',near?{emissive:'#f6d36a',emissiveIntensity:.4}:{});});
      sleigh.visible=!!sleighOn&&!!horse;if(sleigh.visible){const bx=horse.x-Math.sin(horse.yaw)*3.6,bz=horse.z-Math.cos(horse.yaw)*3.6;sleigh.position.set(bx,groundY(bx,bz),bz);sleigh.rotation.y=horse.yaw;}}};
}

// ---------------------------------------------------------------------------------------------------------------
// The Clover Downs Show Ring in 3D: a sand ring with a white rail, the gate arch and start flags, the numbered fences
// of today's course (rebuilt when the class changes, since heights differ), bleachers with a crowd that jumps up on a
// clear, the judges' box, a scoreboard with today's placings, corner pennants and the practice fences outside.
export function buildArena({T,root,geo,mat,box,ico,label,groundY}){
  const B=(p,c,x,y,z,sx,sy,sz,sh=false)=>box(p,c,x,y,z,sx,sy,sz,sh);
  const at=(g,x,z,yaw=0)=>{g.position.set(x,groundY(x,z),z);g.rotation.y=yaw;root.add(g);return g;};
  const {x:AX,z:AZ,hw,hl,gateU,gateW}=ARENA,W=(u,v)=>arenaWorld(u,v);
  // Sand: a subdivided plane draped over the ground.
  {const g=new T.PlaneGeometry(hw*2,hl*2,11,18);g.rotateX(-Math.PI/2);const a=g.attributes.position;
    for(let i=0;i<a.count;i++){const x=a.getX(i)+AX,z=a.getZ(i)+AZ;a.setXYZ(i,x,groundY(x,z)+.06,z);}g.computeVertexNormals();
    const m=new T.Mesh(geo(g),mat('#e3cf9f'));m.receiveShadow=true;m.renderOrder=-9;root.add(m);}
  // The rail: instanced white posts every ~3.5 m, two long rails per side (split at the gate).
  {const pts=[];const side=(u0,v0,u1,v1)=>{const n=Math.max(1,Math.round(Math.hypot(u1-u0,v1-v0)/3.5));for(let k=0;k<=n;k++)pts.push([u0+(u1-u0)*k/n,v0+(v1-v0)*k/n]);};
    side(-hw,-hl,gateU-gateW/2,-hl);side(gateU+gateW/2,-hl,hw,-hl);side(-hw,hl,hw,hl);side(-hw,-hl,-hw,hl);side(hw,-hl,hw,hl);
    const im=new T.InstancedMesh(geo(new T.BoxGeometry(.18,1.7,.18)),mat('#f4f1ea'),pts.length),d=new T.Object3D();
    pts.forEach(([u,v],i)=>{const p=W(u,v);d.position.set(p.x,groundY(p.x,p.z)+.85,p.z);d.updateMatrix();im.setMatrixAt(i,d.matrix);});im.castShadow=true;root.add(im);
    const rail=(u0,v0,u1,v1)=>{const a=W((u0+u1)/2,(v0+v1)/2),g=at(new T.Group(),a.x,a.z);const len=Math.hypot(u1-u0,v1-v0),along=u0===u1;
      for(const y of [.75,1.45])B(g,'#ffffff',0,y,0,along?.09:len,.14,along?len:.09);};
    rail(-hw,-hl,gateU-gateW/2,-hl);rail(gateU+gateW/2,-hl,hw,-hl);rail(-hw,hl,hw,hl);rail(-hw,-hl,-hw,hl);rail(hw,-hl,hw,hl);}
  // Gate arch with the ring's name, and the start flags (red on the right, white on the left, as in a real ring).
  {const p=W(gateU,-hl),g=at(new T.Group(),p.x,p.z);for(const s of [-1,1]){B(g,'#7a5638',s*(gateW/2+.3),2.2,0,.35,4.4,.35,true);B(g,'#e5c76b',s*(gateW/2+.3),4.5,0,.55,.2,.55);}
    B(g,'#2f6fb5',0,4.1,0,gateW+1.2,.9,.18,true);B(g,'#f2c45d',0,3.6,0,gateW+1.2,.1,.2);{const s=label('CLOVER DOWNS SHOW RING',0,5.6,0,8),fade=s.onBeforeRender,wp=new T.Vector3();g.add(s);s.onBeforeRender=(r,sc,cam)=>{fade(r,sc,cam);const d=cam.position.distanceTo(wp.setFromMatrixPosition(s.matrixWorld));if(d<16)s.material.opacity*=Math.max(0,(d-9)/7);};}   // fades out as you ride under it
    for(const [u,c] of [[gateU+gateW/2+1,'#d64541'],[gateU-gateW/2-1,'#ffffff']]){const q=W(u,ARENA.startV),f=at(new T.Group(),q.x,q.z);B(f,'#3f4a46',0,.9,0,.08,1.8,.08);B(f,c,.28,1.55,0,.5,.36,.04);}}
  // The entries post outside the gate (the steward stands beside it).
  {const g=at(new T.Group(),ARENA_POST.x,ARENA_POST.z);B(g,'#7a5638',0,1.2,0,.16,2.4,.16);B(g,'#2f6fb5',0,2.3,0,2,.6,.1);g.add(label('SHOW RING ENTRIES',0,3.1,0,5));}
  // Corner pennants.
  for(const [u,v] of [[-hw,-hl],[hw,-hl],[-hw,hl],[hw,hl]]){const p=W(u,v),g=at(new T.Group(),p.x,p.z);B(g,'#f4f1ea',0,2.5,0,.12,5,.12);
    ['#d64541','#2f6fb5','#f2c45d'].forEach((c,k)=>{const m=new T.Mesh(geo(new T.ConeGeometry(.28,.9,3)),mat(c));m.rotation.z=Math.PI/2;m.position.set(.45,4.7-k*.5,0);g.add(m);});}
  // Bleachers on the east side, and the crowd on them (two instanced meshes; they hop when they cheer).
  const crowd=[];let cheerT=0;const bodies=new T.InstancedMesh(geo(new T.BoxGeometry(.5,.62,.32)),new T.MeshStandardMaterial({color:'#ffffff',roughness:1,flatShading:true}),48),
    heads=new T.InstancedMesh(geo(new T.IcosahedronGeometry(.2,0)),new T.MeshStandardMaterial({color:'#ffffff',roughness:1,flatShading:true}),48);
  {const p=W(hw+4.2,0),g=at(new T.Group(),p.x,p.z);
    for(let k=0;k<4;k++){B(g,'#9a6b45',-2.2+k*1.4,.3+k*.55,0,1.4,.6+k*1.1,30,true);B(g,'#c89a64',-2.2+k*1.4,.62+k*1.1,0,1.3,.08,29.6);}
    B(g,'#2f6fb5',2.9,3.2,0,.12,2.2,30);B(g,'#d64541',2.3,4.4,0,1.6,.12,30.6);
    const SK=['#f2d3b6','#e0b48f','#c48b62','#8d5a3a','#5a3a26'],SH=['#d64541','#2f6fb5','#3c8f5a','#e58a2e','#7b4fa8','#f2c45d','#ffffff','#e58fa6'],c=new T.Color();let n=0,seed=11;const r=()=>(seed=(seed*16807)%2147483647)/2147483647;
    for(let k=0;k<4;k++)for(let s=0;s<12&&n<48;s++){if(r()<.18)continue;const lx=-2.2+k*1.4,ly=.62+k*1.1+.04,lz=-13.5+s*2.4+(r()-.5)*.8,w={x:p.x+lx,z:p.z+lz};
      crowd.push({x:w.x,y:groundY(p.x,p.z)+ly,z:w.z,ph:r()*6});bodies.setColorAt(n,c.set(SH[Math.floor(r()*SH.length)]));heads.setColorAt(n,c.set(SK[Math.floor(r()*SK.length)]));n++;}
    bodies.count=heads.count=n;root.add(bodies,heads);}
  const dummy=new T.Object3D();
  function paintCrowd(t){crowd.forEach((p,i)=>{const hop=cheerT>0?Math.max(0,Math.sin(t*11+p.ph))*.32*Math.min(1,cheerT):0;
      dummy.position.set(p.x,p.y+.31+hop,p.z);dummy.rotation.set(0,-Math.PI/2,0);dummy.updateMatrix();bodies.setMatrixAt(i,dummy.matrix);
      dummy.position.y=p.y+.82+hop;dummy.updateMatrix();heads.setMatrixAt(i,dummy.matrix);});bodies.instanceMatrix.needsUpdate=heads.instanceMatrix.needsUpdate=true;}
  paintCrowd(0);
  // Judges' box on stilts (west side, middle), looking over the ring.
  {const p=W(-hw-4,0),g=at(new T.Group(),p.x,p.z,Math.PI/2);for(const [a,b] of [[-1.4,-1.4],[1.4,-1.4],[-1.4,1.4],[1.4,1.4]])B(g,'#7a5638',a,1,b,.2,2,.2);
    B(g,'#f4f1e8',0,2.9,0,3.4,1.9,3.2,true);B(g,'#cfe6ee',0,3.1,1.62,2.6,.8,.06);const r=new T.Mesh(geo(new T.ConeGeometry(2.8,1.2,4)),mat('#2f6fb5'));r.rotation.y=Math.PI/4;r.position.y=4.45;r.castShadow=true;g.add(r);
    for(let i=0;i<5;i++)B(g,'#9a6b45',-.9,.3+i*.42,-2.2+i*.18,1,.08,.4);g.add(label('JUDGES',0,5.6,0,3.2));}
  // Scoreboard at the south end, facing into the ring: a canvas drawn with today's placings.
  const board=document.createElement('canvas');board.width=512;board.height=256;const boardTex=new T.CanvasTexture(board);boardTex.colorSpace=T.SRGBColorSpace;
  {const p=W(0,hl+3),g=at(new T.Group(),p.x,p.z,Math.PI);for(const s of [-1,1])B(g,'#3f4a46',s*3.2,1.6,0,.25,3.2,.25,true);B(g,'#1f2a44',0,3.9,0,7.6,3.9,.3,true);
    const face=new T.Mesh(geo(new T.PlaneGeometry(7.2,3.6)),new T.MeshBasicMaterial({map:boardTex}));face.position.set(0,3.9,.17);g.add(face);}
  function drawBoard({title,sub,rows=[]}){const c=board.getContext('2d');c.fillStyle='#1f2a44';c.fillRect(0,0,512,256);c.fillStyle='#f2c45d';c.font='800 30px system-ui,sans-serif';c.textAlign='center';c.fillText(title,256,40);
    c.fillStyle='#cfe0ff';c.font='600 20px system-ui,sans-serif';c.fillText(sub||'',256,70);c.textAlign='left';
    rows.slice(0,4).forEach((r,i)=>{const y=110+i*36;c.fillStyle=r.me?'#f2c45d':'#ffffff';c.font=(r.me?'800 ':'600 ')+'24px system-ui,sans-serif';c.fillText(r.place,24,y);c.fillText(r.name,84,y);c.textAlign='right';c.fillText(r.score,488,y);c.textAlign='left';});
    boardTex.needsUpdate=true;}
  drawBoard({title:'CLOVER DOWNS',sub:'Show jumping today'});
  // A fence: two wing stands, the rails (or a wall / flower box), a number on the near-left wing.
  function fence(parent,f,{number=true}={}){const g=new T.Group(),[c0,c1]=f.colors,parts={rails:[],top:null};g.position.set(f.x,groundY(f.x,f.z),f.z);g.rotation.y=f.dir;parent.add(g);
    for(const s of [-1,1]){B(g,c0,s*2.9,.9,0,.22,1.8,.22,true);B(g,c1,s*2.9,1.82,0,.3,.1,.3);B(g,c0,s*2.9,.05,0,.8,.1,.5);}
    const rail=(y,z,c)=>{const m=B(g,c,0,y,z,5.4,.12,.12,true);parts.rails.push(m);return m;};
    const n=f.height==='low'?2:f.height==='mid'?3:4,cols=[c0,c1];
    if(f.style==='wall'){B(g,c1,0,(f.h-.12)/2,0,5,f.h-.12,.45,true);for(let k=0;k<5;k++)B(g,c0,-2+k,(f.h-.12)/2,.24,.06,f.h-.12,.02);parts.top=rail(f.h,0,c0);}
    else if(f.style==='oxer'){for(let k=1;k<=n;k++)rail(f.h*.88*k/n,-.5,cols[k%2]);for(let k=1;k<=n;k++){const m=rail(f.h*k/n,.5,cols[k%2]);if(k===n)parts.top=m;}for(const s of [-1,1])B(g,c0,s*2.9,.9,1,.22,1.8,.22,true);}
    else{for(let k=1;k<=(f.style==='flowers'?Math.max(1,n-1):n);k++){const m=rail(f.h*k/(f.style==='flowers'?Math.max(1,n-1):n),0,cols[k%2]);parts.top=m;}
      if(f.style==='flowers'){B(g,'#8d6644',0,.18,-.35,4.6,.36,.5,true);for(let k=0;k<9;k++)ico(g,['#e58fa6','#f2c45d','#ffffff','#b48be0'][k%4],-2+k*.5,.45,-.35,.24,.22,.24);}}
    if(parts.top)parts.top.userData.home={y:parts.top.position.y,rz:parts.top.rotation.z};
    if(number){const s=label(String(f.n),-2.9,2.75,0,5);g.add(s);parts.num=s;}
    return {g,f,parts,fall:0};}
  // Today's course (rebuilt when the class changes), its solids, and the practice fences.
  const course=new T.Group();root.add(course);let fences=[],cur=null;
  const solids=Array.from({length:10},()=>({rails:[0,1,2].map(()=>({kind:'box',x:0,z:0,hx:.55,hz:.55,height:0})),wings:[0,1].map(()=>({kind:'box',x:0,z:0,hx:.3,hz:.3,height:2}))}));
  const obstacles=solids.flatMap(s=>[...s.rails,...s.wings]);
  function setCourse(c){cur=c;while(course.children.length)course.remove(course.children[0]);
    fences=c.fences.map(f=>fence(course,f));fences.forEach(F=>{if(F.parts.num)F.parts.num.visible=F.f.inCourse;});
    c.fences.forEach((f,i)=>{const s=fenceSolids(f);s.rails.forEach((o,k)=>Object.assign(solids[i].rails[k],o));s.wings.forEach((o,k)=>Object.assign(solids[i].wings[k],o));});setNext(-1);}
  // The fence you're jumping now is see-through for the movement code (the judge decides), the rest are solid.
  function setNext(i){solids.forEach((s,k)=>{const f=cur?.fences[k];for(const o of s.rails)o.height=k===i?-1:f?f.h:0;});arrow.visible=i>=0&&!!cur;if(arrow.visible){const f=cur.fences[i];arrow.userData.at={x:f.x,y:groundY(f.x,f.z)+f.h+1.7,z:f.z};}}
  function knock(i){const F=fences[i];if(F?.parts.top)F.fall=.001;}
  function resetRails(){for(const F of fences){F.fall=0;const t=F.parts.top;if(t?.userData.home){t.position.y=t.userData.home.y;t.rotation.z=t.userData.home.rz;}}}
  const arrow=new T.Group();{const c=new T.Mesh(geo(new T.ConeGeometry(.55,1.1,10)),mat('#f2c45d',{emissive:'#f2c45d',emissiveIntensity:.55}));c.rotation.x=Math.PI;arrow.add(c);
    const r=new T.Mesh(geo(new T.TorusGeometry(.75,.1,8,24)),mat('#f2c45d',{emissive:'#f2c45d',emissiveIntensity:.55}));r.rotation.x=Math.PI/2;r.position.y=.9;arrow.add(r);}arrow.visible=false;root.add(arrow);
  const practice=new T.Group();root.add(practice);PRACTICE.forEach(f=>fence(practice,f,{number:false}));
  {const g=at(new T.Group(),PRACTICE_SIGN.x,PRACTICE_SIGN.z);B(g,'#7a5638',0,1.2,0,.16,2.4,.16);B(g,'#e5c76b',0,2.3,0,2.2,.6,.1);g.add(label('PRACTICE FENCES',0,3.1,0,5));
    PRACTICE.forEach(f=>{const s=label(f.label.toUpperCase(),f.x+3.6,2.2,f.z,2.6);root.add(s);});}
  return {obstacles,setCourse,setNext,knock,resetRails,drawBoard,cheer(){cheerT=2.2;},
    tick(now,delta){const t=now*.001;if(arrow.visible){const a=arrow.userData.at;arrow.position.set(a.x,a.y+Math.sin(t*3)*.25,a.z);arrow.rotation.y+=delta*1.5;}
      for(const F of fences)if(F.fall>0&&F.fall<1){F.fall=Math.min(1,F.fall+delta*2.2);const tp=F.parts.top,h=tp.userData.home;tp.rotation.z=h.rz+F.fall*.5;tp.position.y=h.y-(h.y-.08)*F.fall*F.fall;}
      if(cheerT>0){cheerT-=delta;if(cheerT<=0)cheerT=0;paintCrowd(t);}}};
}
