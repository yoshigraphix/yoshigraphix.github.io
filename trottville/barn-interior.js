// Inside your barn (2026-11-09 redesign, Yoshi): one hall runs from the back of the barn to the big double doors.
// Left of the hall: three horse stalls (yours at the back, with your home-stall decor). Right of the hall: the tack
// room (Tack Match) at the back and Hazel's Riding Togs, a rider-clothes shop, at the front. Horses never go in the
// shop. The doors stay shut until you tap them (or press F nearby); they swing open and you ride out.
// Barn space: x −19…19, z −15 (back) … 15 (doors). The hall is x −4.6…4.6.
import {INDOOR_GAMES} from './world-content.mjs?v=160';
import {OUTFITS} from './character-looks.mjs?v=160';

export const HALL_X=4.6,STORE={x0:HALL_X,x1:19,z0:0,z1:15,doorZ:8},TACK={doorZ:-7};
export const DOOR={x:0,z:15,half:3,reach:4.2};
export const COUNTER={x:15,z:8.5},KEEPER={x:16.9,z:8.5};
// Stall spots for horses: yours first, then the others. Horses stand facing the hall (+x).
export const BAYS=[{x:-12.5,z:-10},{x:-12.5,z:0},{x:-12.5,z:10},{x:-16,z:2.6},{x:-16,z:12.4},{x:-16,z:-2.6}];
export const SHOP_GATE={kind:'box',x:HALL_X+.1,z:STORE.doorZ,hx:.6,hz:2.1,height:8};
export const inStore=(x,z)=>x>HALL_X-.1&&x<STORE.x1&&z>STORE.z0&&z<STORE.z1;
// v95 Hoofhaven Horse Market (Yoshi 2026-11-13): a stable you walk into; inside, one huge room with 20 stalls in two
// rows of 10, a horse's head over each half door, and the market book on a stand by the entrance. It is built with the
// barn's interior (same indoor light, floor and walls) but far off at x≈200, so it never shows from the barn.
// Local room: x −13…13, z −21 (back) … 25 (entrance). Stall fronts at x = ±5; stall i centres at z = −17.2 + 3.6·i.
export const MARKET={x:200,z:0,front:5,door:{z:25,reach:4},book:{x:-3.4,z:14.2},stallZ:i=>-17.2+3.6*i,rows:10};
export const inMarketHall=(x,z)=>x>MARKET.x-14&&x<MARKET.x+14&&z>MARKET.z-22&&z<MARKET.z+26;

export function buildBarnInterior({T,geo,mat,box,ico,label}){
  const interior=new T.Group();interior.visible=false;
  const B=(c,x,y,z,sx,sy,sz,p=interior)=>box(p,c,x,y,z,sx,sy,sz,true);
  const flat=(c,x,y,z,sx,sy,sz,p=interior)=>box(p,c,x,y,z,sx,sy,sz,false);
  // Painted wooden signs fixed to the walls (not floating white tags, Yoshi 2026-11-09). face = the way it reads
  // from (rotation about y: 0 faces +z). Also used by world.js for the stall name plates.
  const textures=[];
  const plaque=(text,x,y,z,{face=0,w=2.6,h=.55,wood='#7a5232',ink='#f3e6c8',parent=interior}={})=>{
    const g=new T.Group();g.position.set(x,y,z);g.rotation.y=face;parent.add(g);
    flat(wood,0,0,-.03,w,h,.06,g);flat('#5a3a22',0,0,-.05,w+.1,h+.1,.04,g);
    const c=document.createElement('canvas');c.width=512;c.height=Math.round(512*h/w);const x2=c.getContext('2d');
    let size=Math.round(c.height*.62);x2.font=`700 ${size}px Georgia,serif`;while(x2.measureText(text).width>470&&size>10)x2.font=`700 ${--size}px Georgia,serif`;
    x2.fillStyle=ink;x2.textAlign='center';x2.textBaseline='middle';x2.fillText(text,256,c.height/2+2);
    const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;textures.push(t);
    const m=new T.Mesh(geo(new T.PlaneGeometry(w*.94,h*.86)),new T.MeshBasicMaterial({map:t,transparent:true,toneMapped:false}));textures.push(m.material);m.position.z=.005;g.add(m);return g;};
  const walls=[],obstacles=[];
  const wall=(x,z,sx,sz,h=8,c='#b89471')=>{walls.push(B(c,x,h/2,z,sx,h,sz));obstacles.push({kind:'box',x,z,hx:sx/2,hz:sz/2,height:h});};

  // ---- floor: plank hall, straw in the stalls, warm boards in the shop, a darker floor in the tack room ----
  const floor=flat('#d2b991',0,-.15,0,38,.3,30);
  for(let x=-4;x<=4;x+=1.6)flat('#c4a679',x,.005,0,.04,.02,30);
  flat('#e3cf8f',-11.8,.01,0,14.4,.02,29.6);// straw bedding
  for(let i=0;i<40;i++){const x=-18.5+((i*37)%140)/10,z=-14.5+((i*53)%290)/10;flat('#d8bf78',x,.02,z,.9,.02,.12).rotation.y=i;}
  flat('#c99a6a',11.8,.01,7.5,14.4,.02,14.8);flat('#a78058',11.8,.01,-7.5,14.4,.02,14.8);
  const rug=new T.Mesh(geo(new T.CircleGeometry(1,40)),mat('#b5524a'));rug.rotation.x=-Math.PI/2;rug.scale.set(3.4,2.6,1);rug.position.set(10,.03,8);interior.add(rug);
  const rugIn=new T.Mesh(geo(new T.CircleGeometry(1,40)),mat('#e8c46a'));rugIn.rotation.x=-Math.PI/2;rugIn.scale.set(2.6,1.9,1);rugIn.position.set(10,.035,8);interior.add(rugIn);
  // A runner down the middle of the hall to the doors.
  flat('#9a6a46',0,.02,1,2.6,.02,26);

  // ---- outer walls (door opening at the front) ----
  wall(0,-15,38,.4);/* v96: the left wall is open behind your own stall (bay 0, z -14.8…-5.2): the home stall's back wall,
  window, picture and horseshoe fill that gap, so walking past shows the same room as the care view. Still solid to walk into. */
  walls.push(B('#b89471',-19,4,-14.9,.4,8,.2));walls.push(B('#b89471',-19,4,4.9,.4,8,20.2));obstacles.push({kind:'box',x:-19,z:0,hx:.2,hz:15,height:8});
  /* v99: an invisible camera stop in that gap, just in front of the stall's back boards, so the follow camera never
     swings out through it (the saddle tap at the start left the view outside the wall) */
  {const stop=B('#000000',-19.15,4,-10,.12,8.4,10.6);stop.material=new T.MeshBasicMaterial({visible:false});textures.push(stop.material);stop.castShadow=stop.receiveShadow=false;walls.push(stop);}wall(19,0,.4,30);wall(-11,15,16,.4);wall(11,15,16,.4);
  B('#b89471',0,6.5,15,6,3,.4);// lintel over the doors
  // Board ceiling on top of the walls (2026-11-10): the background is now the real sky colour for the open doors, so
  // the roof has to be solid. It counts as a wall for the camera, which stays under it.
  walls.push(B('#9d7853',0,8.12,0,38.4,.24,30.4));
  // Roof beams across the barn and posts down the hall.
  for(const z of [-12,-6,0,6,12])B('#896e52',0,6.9,z,38,.3,.35);
  for(const z of [-5,5])B('#937453',-HALL_X,3.4,z,.35,6.8,.35);

  // ---- stalls on the left: partitions, half-height fronts with an opening, a name plate over each ----
  for(const z of [-5,5]){B('#a77e55',-11.9,1.4,z,14,2.8,.28);B('#8d6238',-11.9,2.86,z,14,.14,.36);obstacles.push({kind:'box',x:-11.9,z,hx:7,hz:.2,height:2.8});}
  for(const zc of [-10,0,10]){
    for(const s of [-1,1]){const z0=zc+s*1.75,z1=zc+s*5,cz=(z0+z1)/2,len=Math.abs(z1-z0);
      B('#b6895c',-HALL_X-.05,.75,cz,.22,1.5,len);B('#8d6238',-HALL_X-.05,1.55,cz,.32,.12,len+.1);
      for(let k=0;k<4;k++)flat('#9b7048',-HALL_X+.08,.75,z0+(z1-z0)*(k+.5)/4,.04,1.2,.08);
      obstacles.push({kind:'box',x:-HALL_X-.05,z:cz,hx:.2,hz:len/2,height:1.5});}
    B('#8d6238',-HALL_X-.05,3,zc+1.75,.18,3.4,.18);B('#8d6238',-HALL_X-.05,3,zc-1.75,.18,3.4,.18);
    B('#7a5232',-HALL_X-.05,4.6,zc,.3,.25,3.8);}
  // Water buckets and hay nets inside each stall.
  for(const zc of [-10,0,10]){const b=new T.Mesh(geo(new T.CylinderGeometry(.32,.26,.55,10)),mat('#5f8fb0'));b.position.set(-18.4,.9,zc+3.2);interior.add(b);
    ico(interior,'#d8bd6a',-18.5,2.2,zc-3,.55,.75,.5);}

  // ---- the right side: hall wall with two doorways (tack room, shop) and a shop window ----
  const segs=[[-15,TACK.doorZ-1.8],[TACK.doorZ+1.8,.8],[6,STORE.doorZ-2],[STORE.doorZ+2,15]];
  for(const [a,b] of segs)wall(HALL_X+.1,(a+b)/2,.3,b-a);
  // Shop window between z .8 and 6: low wall, glass, top wall; two mannequins stand behind the glass (world.js dresses them).
  wall(HALL_X+.1,3.4,.3,5.2,1.1,'#b89471');B('#b89471',HALL_X+.1,5.8,3.4,.3,4.4,5.2);
  const glass=new T.Mesh(geo(new T.PlaneGeometry(5.2,2.5)),mat('#cfe6ee',{transparent:true,opacity:.22,depthWrite:false,side:T.DoubleSide}));glass.rotation.y=Math.PI/2;glass.position.set(HALL_X+.1,2.35,3.4);interior.add(glass);
  for(const [y,h] of [[1.15,.14],[3.6,.14]])B('#6e4a2c',HALL_X+.1,y,3.4,.36,h,5.3);
  for(const z of [.8,6])B('#6e4a2c',HALL_X+.1,2.35,z,.36,2.6,.14);
  B('#e9dcc0',6.4,.6,3.4,2.6,.2,4.6);// display plinth
  obstacles.push({kind:'box',x:6.4,z:3.4,hx:1.4,hz:2.4,height:1});
  // Two dress forms on the plinth wearing outfits Hazel sells (Show Jacket, Trail Rider).
  for(const [i,id] of [[0,'show'],[1,'trail']]){const o=OUTFITS.find(x=>x.id===id),z=2.2+i*2.4,c=o.colors;
    B('#3b3a38',6.4,1.1,z,.06,.9,.06);const base=new T.Mesh(geo(new T.CylinderGeometry(.28,.32,.08,14)),mat('#3b3a38'));base.position.set(6.4,.74,z);interior.add(base);
    const legs=new T.Mesh(geo(new T.CylinderGeometry(.24,.2,.55,12)),mat(c.bottom));legs.position.set(6.4,1.62,z);interior.add(legs);
    const body=new T.Mesh(geo(new T.CylinderGeometry(.3,.24,.75,12)),mat(c.top));body.position.set(6.4,2.25,z);body.scale.z=.7;interior.add(body);
    const shoulders=new T.Mesh(geo(new T.SphereGeometry(.3,12,8,0,Math.PI*2,0,Math.PI/2)),mat(c.top));shoulders.position.set(6.4,2.62,z);shoulders.scale.set(1,.45,.7);interior.add(shoulders);
    B(c.trim,6.4,2.2,z,.62,.08,.44);const knob=new T.Mesh(geo(new T.SphereGeometry(.09,10,8)),mat('#d8c8a8'));knob.position.set(6.4,2.86,z);interior.add(knob);}
  // Door frames, painted green like the home stall shutters.
  for(const [zc,w] of [[TACK.doorZ,3.6],[STORE.doorZ,4]]){for(const s of [-1,1])B('#4f7a52',HALL_X+.1,2.4,zc+s*w/2,.42,4.8,.22);B('#4f7a52',HALL_X+.1,4.85,zc,.42,.22,w+.2);
    // Wall above the doorway, so the sign over it hangs on wood, not in the air (Yoshi 2026-11-10).
    walls.push(B('#b89471',HALL_X+.1,(4.96+8)/2,zc,.3,8-4.96,w));}
  // Wall between the tack room and the shop.
  wall(11.8,0,14.4,.3);
  plaque('Tack Room',HALL_X-.12,5.45,TACK.doorZ,{face:-Math.PI/2,w:2.6,h:.55});plaque('Hazel’s Riding Togs',HALL_X-.12,5.5,STORE.doorZ,{face:-Math.PI/2,w:3.8,h:.7,wood:'#4f7a52'});

  // ---- Hazel's shop: counter, racks of clothes, shelves of folded stacks, a mirror, lamps ----
  B('#8d5a36',COUNTER.x,.46,COUNTER.z,1.3,.92,5.2);B('#e8d3a8',COUNTER.x,.98,COUNTER.z,1.6,.12,5.5);for(let i=0;i<5;i++)B('#a8703e',COUNTER.x-.66,.46,COUNTER.z-2+i,.04,.7,.7);
  B('#c9a24a',COUNTER.x-.1,1.13,COUNTER.z+1.8,.5,.18,.4);// little till
  ico(interior,'#7fb07a',COUNTER.x,1.28,COUNTER.z-1.9,.28,.3,.28);// a pot plant
  obstacles.push({kind:'box',x:COUNTER.x,z:COUNTER.z,hx:.8,hz:2.75,height:1});
  const garmentColors=['#4f7bc4','#f2a3b8','#2f6b3a','#6b8a3a','#2f3f6e','#f4efe2','#d9534a','#f2b632','#7a2f3a','#3a3f8a'];
  for(const [x,z] of [[9,13],[11.5,1.6]]){
    for(const s of [-1,1])B('#6e4a2c',x+s*1.6,1.1,z,.1,2.2,.1);B('#c9a24a',x,2.15,z,3.4,.06,.06);
    for(let i=0;i<9;i++){const g=B(garmentColors[(i+Math.round(x))%garmentColors.length],x-1.4+i*.35,1.45,z,.12,1.2,.75);g.rotation.y=.12*Math.sin(i);}
    obstacles.push({kind:'box',x,z,hx:1.8,hz:.5,height:2.2});}
  // Shelves on the back wall, stacked with folded clothes.
  for(const y of [.9,1.9,2.9]){B('#7a5232',18.5,y,7.5,.8,.1,9);for(let i=0;i<8;i++)B(garmentColors[(i*3+Math.round(y))%garmentColors.length],18.4,y+.17,3.6+i*1.1,.6,.24,.75);}
  obstacles.push({kind:'box',x:18.5,z:7.5,hx:.5,hz:4.6,height:3.2});
  // A boot bench and a full-length mirror by the door.
  B('#8d5a36',7.2,.45,14.2,3,.18,.8);for(let i=0;i<3;i++)B(['#6b4a32','#3a2c26','#c96a7f'][i],6.2+i*1,.75,14.2,.35,.45,.6);obstacles.push({kind:'box',x:7.2,z:14.2,hx:1.6,hz:.5,height:.9});
  B('#c9a24a',13.5,2.1,14.75,1.6,3.6,.12);B('#dfeaf0',13.5,2.1,14.68,1.3,3.3,.06);
  // Shop walls: cream paper with a soft stripe above a green wainscot and a dado rail.
  const paper=(x,z,len,alongZ)=>{const sx=alongZ?.06:len,sz=alongZ?len:.06;
    flat('#f1e3c4',x,4.2,z,sx,7.4,sz);flat('#5f8a6a',x,.75,z,alongZ?.08:len,1.5,alongZ?len:.08);flat('#e8d3a8',x,1.55,z,alongZ?.1:len,.12,alongZ?len:.1);
    for(let i=0;i<Math.floor(len/1.2);i++){const t=-len/2+.6+i*1.2;flat('#ead2a6',alongZ?x:x+t,4.4,alongZ?z+t:z,alongZ?.07:.22,5.4,alongZ?.22:.07);}};
  paper(18.76,7.5,14.8,true);paper(11.8,14.76,13.9,false);paper(11.8,.2,13.9,false);
  // Bunting across the shop.
  for(let i=0;i<11;i++){const f=new T.Mesh(geo(new T.ConeGeometry(.22,.5,3)),mat(garmentColors[i%garmentColors.length],{side:T.DoubleSide}));f.rotation.x=Math.PI;f.position.set(5.6+i*1.25,5.7-Math.sin(i/10*Math.PI)*.5,14.3);interior.add(f);}
  // Warm pendant lamps.
  const lampMat=mat('#ffe6a8',{emissive:'#ffcf6a',emissiveIntensity:1.2});
  const lamp=(x,z,y=5.4)=>{B('#3b3a38',x,(6.9+y)/2,z,.04,6.9-y,.04);const s=new T.Mesh(geo(new T.ConeGeometry(.42,.38,12,1,true)),mat('#3f5a3c',{side:T.DoubleSide}));s.position.set(x,y,z);interior.add(s);const b=new T.Mesh(geo(new T.SphereGeometry(.14,10,8)),lampMat);b.position.set(x,y-.15,z);interior.add(b);};
  for(const [x,z] of [[10,4],[10,11],[15,8.5]])lamp(x,z);
  for(const z of [-11,-3,5,12])lamp(0,z,5.6);
  const shopLight=new T.PointLight('#ffd89a',8,16,1.6);shopLight.position.set(11,4.6,8);interior.add(shopLight);

  // ---- tack room: saddle racks, bridles on hooks, Tack Match table ----
  for(let i=0;i<4;i++){const z=-13+i*2.6;B('#6e4a2c',18.4,1.2,z,.9,.12,.12);const sd=B(['#8a4b2a','#5a3a22','#a8703e','#3a2c26'][i],18.2,1.45,z,1.1,.32,.9);sd.rotation.z=.12;}
  for(let i=0;i<5;i++){const x=7+i*2.3;B('#3b3a38',x,3.1,-14.7,.1,.1,.3);B(['#7a2f3a','#2f6b3a','#4f7bc4','#8a4b2a','#2a2230'][i],x,2.5,-14.75,.08,1.1,.06);}
  obstacles.push({kind:'box',x:18.4,z:-9,hx:.7,hz:5,height:1.8});

  // ---- the barn games, each a little prop where it happens ----
  const props={
    groom(g){B('#8d5a36',0,.5,0,1.1,1,.7,g);B('#c58a52',0,1.08,0,1.2,.16,.8,g);B('#efe2c6',-.25,1.2,0,.4,.1,.2,g);B('#a8703e',.25,1.2,.1,.35,.14,.16,g);},
    hay(g){B('#a8764e',0,.7,0,2,.2,3.2,g);for(const [x,z] of [[-.5,-1],[.5,-1],[-.5,0],[.5,0],[0,1],[0,-.5]])B('#d8bd6a',x,1.15+(z===-.5?.5:0),z,.9,.5,.9,g);
      for(const [x,z] of [[-1,-1.1],[1,-1.1],[-1,1.1],[1,1.1]]){const w=new T.Mesh(geo(new T.CylinderGeometry(.35,.35,.14,12)),mat('#5d4632'));w.rotation.z=Math.PI/2;w.position.set(x,.35,z);g.add(w);}},
    muck(g){B('#5f8a6a',0,.75,0,1.2,.5,1.6,g);B('#3f6a4a',0,.52,0,.9,.06,1.3,g);const w=new T.Mesh(geo(new T.CylinderGeometry(.3,.3,.12,12)),mat('#3b3a38'));w.rotation.z=Math.PI/2;w.position.set(0,.3,-.95);g.add(w);
      for(const s of [-1,1])B('#8d6238',s*.45,.6,.9,.08,.08,1,g);B('#c9b07a',.2,1.05,0,.7,.2,.7,g);const fork=B('#8d6238',.9,1.3,.6,.06,2.6,.06,g);fork.rotation.x=.25;},
    water(g){B('#7a8a94',0,.45,0,1,.9,2.6,g);B('#8fc3d8',0,.86,0,.8,.05,2.4,g);B('#5d5a55',0,1.3,1.4,.12,1.6,.12,g);B('#5d5a55',0,2.05,1.15,.12,.12,.5,g);},
    tack(g){B('#8d5a36',0,.9,0,2.6,.14,1.6,g);for(const s of [-1,1])for(const t of [-1,1])B('#6e4a2c',s*1.1,.42,t*.6,.12,.84,.12,g);
      for(let i=0;i<6;i++)B(i%2?'#f4efe2':'#4f7bc4',-.9+(i%3)*.9,1,-.3+Math.floor(i/3)*.6,.6,.03,.42,g);},
  };
  for(const g of INDOOR_GAMES){const grp=new T.Group();props[g.id]?.(grp);grp.position.set(g.x,0,g.z);interior.add(grp);obstacles.push({kind:'box',x:g.x,z:g.z,hx:g.id==='hay'?1.2:g.id==='tack'?1.4:.7,hz:g.id==='hay'?1.8:g.id==='tack'?.9:g.id==='water'?1.3:.9,height:1.4});}

  // ---- v95: the Hoofhaven market hall (see MARKET above) ----
  const mk=new T.Group();mk.position.set(MARKET.x,0,MARKET.z);interior.add(mk);
  const mwall=(x,z,sx,sz,h=10,c='#c9a27a')=>{walls.push(B(c,x,h/2,z,sx,h,sz,mk));obstacles.push({kind:'box',x:MARKET.x+x,z:MARKET.z+z,hx:sx/2,hz:sz/2,height:h});};
  const marketFloor=flat('#cdb088',0,-.15,2,26.4,.3,46.4,mk);
  flat('#e3cf8f',-9,.01,-1,8,.02,36.2,mk);flat('#e3cf8f',9,.01,-1,8,.02,36.2,mk);// straw in the stalls
  flat('#9a6a46',0,.02,2,3,.02,44,mk);// runner down the aisle
  for(let x=-4;x<=4;x+=1.6)flat('#bf9f72',x,.005,2,.04,.02,46,mk);
  mwall(0,-21,26.4,.4);mwall(-13,2,.4,46);mwall(13,2,.4,46);mwall(-8.5,25,9,.4);mwall(8.5,25,9,.4);B('#c9a27a',0,8,25,8,4,.4,mk);
  walls.push(B('#a8835c',0,10.12,2,26.8,.24,46.8,mk));
  for(let z=-18;z<=24;z+=6)B('#8d7154',0,9.2,z,26,.35,.4,mk);
  for(const x of [-12.6,12.6])for(let z=-15;z<=21;z+=9){B('#f4e2b0',x,7.4,z,.08,1.6,2.4,mk);B('#7a5a3a',x,7.4,z,.14,1.8,.14,mk);B('#7a5a3a',x,7.4,z,.14,.14,2.6,mk);}
  // Lanterns down the aisle.
  for(let z=-16;z<=22;z+=7.6){B('#4a3a2a',0,8.6,z,.06,1.8,.06,mk);B('#f6d68a',0,7.5,z,.5,.6,.5,mk);B('#3a2c20',0,7.85,z,.65,.12,.65,mk);}
  // Stalls: partitions, half doors on the aisle, a name plate on each door (filled in when you walk in).
  const plates=[];
  // v96 the stall clipboard: board, cream paper (the horse's name + ruled lines, redrawn by setPlate) and a metal clip.
  const drawClip=(c,name)=>{const x2=c.getContext('2d');x2.fillStyle='#fbf6e8';x2.fillRect(0,0,c.width,c.height);x2.fillStyle='#3b2f1e';x2.textAlign='center';x2.textBaseline='middle';
    let size=46;x2.font=`700 ${size}px Georgia,serif`;while(x2.measureText(name).width>220&&size>14)x2.font=`700 ${--size}px Georgia,serif`;x2.fillText(name||'',128,58);
    x2.strokeStyle='#b39a70';x2.lineWidth=3;x2.beginPath();x2.moveTo(24,92);x2.lineTo(232,92);x2.stroke();x2.strokeStyle='#d9ccb0';x2.lineWidth=2;
    for(let y=128;y<300;y+=30){x2.beginPath();x2.moveTo(28,y);x2.lineTo(name?150+((y*37)%70):228,y);x2.stroke();}};
  const clipboard=(x,y,z,face)=>{const g=new T.Group();g.position.set(x,y,z);g.rotation.y=face;g.scale.setScalar(1.3);interior.add(g);
    flat('#8a5a2b',0,0,-.03,.62,.82,.04,g);flat('#b9bec6',0,.39,0,.26,.1,.06,g);
    const c=document.createElement('canvas');c.width=256;c.height=320;drawClip(c,'');const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;textures.push(t);
    const m=new T.Mesh(geo(new T.PlaneGeometry(.54,.68)),new T.MeshLambertMaterial({map:t}));textures.push(m.material);m.position.set(0,-.03,.0);g.add(m);g.userData.clip=true;return g;};
  for(const sd of [-1,1]){const fx=sd*MARKET.front;
    for(let i=0;i<=MARKET.rows;i++){const z=MARKET.stallZ(i)-1.8;B('#a77e55',sd*9,1.3,z,8,2.6,.24,mk);B('#8d6238',sd*9,2.66,z,8,.14,.32,mk);}
    obstacles.push({kind:'box',x:MARKET.x+sd*9,z:MARKET.z-1,hx:4.2,hz:18.2,height:3});
    for(let i=0;i<MARKET.rows;i++){const z=MARKET.stallZ(i);B('#9c4a34',fx,.68,z,.2,1.36,3.3,mk);B('#f1e6cf',fx+sd*-.11,.68,z,.04,.14,3.1,mk);const xb=B('#f1e6cf',fx+sd*-.11,.68,z,.04,1.2,.14,mk);xb.rotation.x=.42;B('#8d6238',fx,1.42,z,.3,.12,3.5,mk);
      B('#6e4a2c',fx,2.25+.3,z-1.8,.22,4.5,.22,mk);
      /* v96: a clipboard on the half door, below the horse's head (Yoshi: plates up high covered their faces) */plates.push(clipboard(MARKET.x+fx+sd*-.2,.8,MARKET.z+z+.6,sd<0?Math.PI/2:-Math.PI/2));}
    B('#6e4a2c',fx,2.25+.3,MARKET.stallZ(MARKET.rows-1)+1.8,.22,4.5,.22,mk);}
  // Facing the entrance: the market's own sign; and the book on its stand.
  plaque('Hoofhaven Horse Market',MARKET.x,6.6,MARKET.z-20.75,{w:7,h:1.1});
  plaque('Back to the valley',MARKET.x,6.3,MARKET.z+24.75,{face:Math.PI,w:3.4,h:.6});
  {const b=MARKET.book;B('#6b4a2c',b.x,.55,b.z,.25,1.1,.25,mk);const top=B('#7a5232',b.x,1.15,b.z,1.1,.08,.8,mk);top.rotation.x=-.35;
   for(const s of [-1,1]){const pg=B('#f7efdc',b.x+s*.26,1.22,b.z,.5,.04,.66,mk);pg.rotation.set(-.35,0,s*-.08);}B('#a13a2c',b.x,1.2,b.z+.02,.06,.05,.68,mk);
   obstacles.push({kind:'box',x:MARKET.x+b.x,z:MARKET.z+b.z,hx:.6,hz:.5,height:1.3});}
  // The entrance doors (shut; the way out is the prompt by them).
  for(const s of [-1,1]){B('#9c4a34',s*2,2.6,24.9,3.9,5.2,.22,mk);B('#f1e6cf',s*2,2.6,24.75,3.6,.18,.06,mk);}
  obstacles.push({kind:'box',x:MARKET.x,z:MARKET.z+24.9,hx:4,hz:.3,height:8});
  const setPlate=(i,text)=>{const g=plates[i];if(!g)return;const m=g.children.find(c=>c.material?.map);if(!m)return;const c=m.material.map.image;if(g.userData.clip){drawClip(c,text);m.material.map.needsUpdate=true;return;}const x2=c.getContext('2d');x2.clearRect(0,0,c.width,c.height);
    let size=Math.round(c.height*.62);x2.font=`700 ${size}px Georgia,serif`;while(x2.measureText(text).width>470&&size>10)x2.font=`700 ${--size}px Georgia,serif`;x2.fillStyle='#f3e6c8';x2.textAlign='center';x2.textBaseline='middle';x2.fillText(text,256,c.height/2+2);m.material.map.needsUpdate=true;};

  // ---- the big double doors: shut until you tap them; they swing out, then you ride out ----
  const leaves=[],doorMeshes=[];
  for(const s of [-1,1]){const hinge=new T.Group();hinge.position.set(s*DOOR.half,0,DOOR.z-.05);interior.add(hinge);
    const leaf=new T.Group();leaf.position.x=-s*DOOR.half/2;hinge.add(leaf);
    doorMeshes.push(B('#9c4a34',0,2.5,0,DOOR.half-.05,5,.22,leaf));
    for(const y of [.6,4.4])B('#f1e6cf',0,y,.13,DOOR.half-.2,.18,.06,leaf);
    const x1=B('#f1e6cf',0,2.5,.13,.18,4.4,.06,leaf);x1.rotation.z=s*Math.atan2(3.8,DOOR.half-.4);
    B('#3b3a38',s*(DOOR.half/2-.35),2.5,-.16,.12,.5,.12,leaf);// handle
    doorMeshes.push(...leaf.children);leaves.push({hinge,s});}
  const doorBlock={kind:'box',x:0,z:DOOR.z,hx:DOOR.half,hz:.3,height:8};obstacles.push(doorBlock);
  plaque('To the valley',0,5.55,14.76,{face:Math.PI,w:2.8,h:.55});
  let open=0,target=0,onOpen=null;
  const door={meshes:doorMeshes,get isOpen(){return open>=.999;},get opening(){return target===1;},
    open(cb){if(target===1)return;target=1;onOpen=cb||null;},
    shut(){target=0;open=0;onOpen=null;setHinges();},
    update(dt){if(open===target)return;open=target>open?Math.min(1,open+dt/.8):Math.max(0,open-dt/.8);setHinges();if(open>=1&&onOpen){const f=onOpen;onOpen=null;f();}}};
  function setHinges(){const e=open*open*(3-2*open);for(const {hinge,s} of leaves)hinge.rotation.y=s*e*1.85;}

  // Horses can't go into the shop: an invisible gate across its doorway that only counts while you ride.
  const shopGate=SHOP_GATE;
  return {interior,floor,marketFloor,setPlate,walls,indoorObstacles:obstacles,shopGate,door,plaque,dispose(){textures.forEach(t=>t.dispose());}};
}
