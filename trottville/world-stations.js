// Walk-up game stations in the valley (held note #3/#4/#5): a hay wagon and sling by the barn loft (Hay's for
// Horses), an apple sorting rig in the orchard clearing (Appleoosa) and the Grapevine Paddock, where the herding
// game plays right here in the world with your own riding controls (no second renderer).
// world.js glides the camera to a station's `view` and then opens the game, so it feels like stepping into it.
import {makeSculptedHorse} from './horse-sculpt.js?v=160';
import {solidCoat} from './ranch.mjs?v=160';
import {PADDOCK,PEN,PEN_FENCES,newRound,stepRound,pennedCount,herdReward,FOALS} from './world-herding.mjs?v=160';
import {R} from './world-regions.mjs?v=160';

export function buildStations({T,outdoors,box,ico,mat,geo,label,groundHeight}){
  const obstacles=[],cyl=geo(new T.CylinderGeometry(1,1,1,10));
  const at=(g,x,z,yaw=0)=>{g.position.set(x,groundHeight(x,z),z);g.rotation.y=yaw;outdoors.add(g);return g;};
  const wheel=(g,x,y,z,r=.55)=>{const w=new T.Mesh(cyl,mat('#7a5a3c'));w.scale.set(r,.18,r);w.rotation.z=Math.PI/2;w.position.set(x,y,z);w.castShadow=true;g.add(w);box(g,'#c9a46a',x,y,z,.22,.22,.22);};
  const bale=(g,x,y,z)=>{box(g,'#d6be6c',x,y,z,1.3,.75,.85,true);box(g,'#b39b58',x-.4,y,z,.07,.78,.88);box(g,'#b39b58',x+.4,y,z,.07,.78,.88);};

  // Hay's for Horses: a wagon heaped with bales and a wooden sling aimed at the stable's loft door.
  const hay=new T.Group();
  box(hay,'#a8764e',0,1.05,0,2.6,.25,4.2,true);for(const s of [-1,1])box(hay,'#97683f',s*1.25,1.45,0,.12,.6,4.2);box(hay,'#97683f',0,1.45,-2.05,2.6,.6,.12);
  for(const [x,z] of [[-1.3,-1.4],[1.3,-1.4],[-1.3,1.4],[1.3,1.4]])wheel(hay,x,.55,z);box(hay,'#8a6040',0,.9,2.9,.14,.14,1.6);
  for(const [x,y,z] of [[-.6,1.55,-1.2],[.6,1.55,-1.2],[-.6,1.55,0],[.6,1.55,0],[-.6,1.55,1.2],[.6,1.55,1.2],[0,2.3,-.6],[0,2.3,.6]])bale(hay,x,y,z);
  const sling=new T.Group();for(const s of [-1,1]){const post=box(sling,'#8f6a45',s*.9,1.2,0,.2,2.4,.2,true);post.rotation.z=-s*.12;}box(sling,'#c84e3c',0,2.1,0,1.9,.12,.12);box(sling,'#6b4a32',0,.12,0,2.4,.24,1.2);bale(sling,0,.55,.9);sling.position.set(3.4,0,-1.5);hay.add(sling);
  hay.add(label("HAY'S FOR HORSES",0,4.1,0,5.2));at(hay,-29,0,.35);obstacles.push({kind:'box',x:-29,z:0,hx:1.6,hz:2.4,height:2.6},{kind:'box',x:-29+3.4*Math.cos(.35)-1.5*Math.sin(.35),z:-1.5*Math.cos(.35)-3.4*Math.sin(.35),hx:1.2,hz:.7,height:2});

  // Appleoosa: a sorting rig on legs. Picker bin + hopper feed the belt, the far end tips into compost,
  // baskets wait on a bench and the truck is parked beyond them (the same left-to-right line as the game).
  const rig=new T.Group();
  box(rig,'#9c7a52',0,1.6,0,3,.2,7,true);box(rig,'#5f6b5a',0,1.74,0,2.6,.06,6.8);for(let i=0;i<9;i++)box(rig,'#4f5a4a',0,1.78,-3.2+i*.8,2.6,.03,.08);
  for(const [x,z] of [[-1.3,-3.2],[1.3,-3.2],[-1.3,3.2],[1.3,3.2],[-1.3,0],[1.3,0]])box(rig,'#7d5e3d',x,.8,z,.18,1.6,.18,true);
  const appleC=['#d9483a','#e0b23c','#7fb34a','#c43a4a'];for(let i=0;i<14;i++)ico(rig,appleC[i%4],-1+((i*37)%9)/4,1.92,-3+((i*53)%13)/2,.16,.16,.16);
  box(rig,'#8a6a45',0,2.2,3.9,2.4,1,1.2,true);box(rig,'#6e5435',0,2.75,3.9,2.6,.1,1.4);// hopper
  box(rig,'#a5824f',0,.55,5.6,2.2,1.1,1.6,true);for(let i=0;i<8;i++)ico(rig,appleC[i%3],-.7+(i%4)*.45,1.2,5.3+Math.floor(i/4)*.5,.2,.2,.2);// picker bin
  box(rig,'#6e7a4e',0,.6,-4.4,1.6,1.2,1.4,true);// compost bin
  box(rig,'#8f6c48',3,.55,0,1.2,.12,5);for(const z of [-1.6,0,1.6]){box(rig,'#c99a5a',3,.95,z,1,.7,1,true);ico(rig,appleC[(z+2)|0],3,1.35,z,.25,.2,.25);}
  const lever=box(rig,'#c84e3c',-1.7,2.2,1.5,.12,1.2,.12);lever.rotation.x=-.5;ico(rig,'#e8d4a9',-1.7,2.75,1.2,.16,.16,.16);
  const truck=new T.Group();box(truck,'#d65a4a',0,1,0,2.2,1.2,2,true);box(truck,'#cfe3ea',0,1.75,.3,1.9,.6,1,false);box(truck,'#8a6a45',0,.95,-2.4,2.3,.9,2.8,true);for(const [x,z] of [[-1.1,.5],[1.1,.5],[-1.1,-2.8],[1.1,-2.8]])wheel(truck,x,.45,z,.45);truck.position.set(6.4,0,0);rig.add(truck);
  rig.add(label('APPLEOOSA',0,4.3,0,4.2));at(rig,17,-32,Math.PI/2);obstacles.push({kind:'box',x:17,z:-32,hx:5.4,hz:1.7,height:3},{kind:'box',x:17,z:-35,hx:.8,hz:.8,height:1.2},{kind:'box',x:23.4,z:-32,hx:2.4,hz:1.4,height:2.4});

  // Grapevine Paddock: a little pen open to the east, vine rows along the west fence and a sign.
  const pen=new T.Group();const post=(x,z)=>box(pen,'#f1dfb9',x,groundHeight(x,z)+.7,z,.22,1.4,.22,true);
  const rail=(x1,z1,x2,z2)=>{const mx=(x1+x2)/2,mz=(z1+z2)/2,len=Math.hypot(x2-x1,z2-z1);for(const y of [.5,1.05]){const r=box(pen,'#e8d4a9',mx,groundHeight(mx,mz)+y,mz,len,.13,.13);r.rotation.y=-Math.atan2(z2-z1,x2-x1);}for(let i=0;i<=Math.ceil(len/2);i++){const t=i/Math.ceil(len/2);post(x1+(x2-x1)*t,z1+(z2-z1)*t);}};
  rail(PEN.x1,PEN.z1,PEN.x0,PEN.z1);rail(PEN.x0,PEN.z1,PEN.x0,PEN.z0);rail(PEN.x0,PEN.z0,PEN.x1,PEN.z0);
  const gate=new T.Group();box(gate,'#d9b77c',0,.6,PEN.z1-PEN.z0-.1,.14,.9,.14);box(gate,'#d9b77c',0,.75,(PEN.z1-PEN.z0)/2,.12,.12,PEN.z1-PEN.z0);box(gate,'#d9b77c',0,.35,(PEN.z1-PEN.z0)/2,.12,.12,PEN.z1-PEN.z0);gate.position.set(PEN.x1,groundHeight(PEN.x1,PEN.z0),PEN.z0);gate.rotation.y=-Math.PI/2.2;pen.add(gate);
  box(pen,'#a48560',(PEN.x0+PEN.x1)/2,groundHeight(-47,6)+.35,PEN.z1-1,2.2,.7,.9);box(pen,'#82b9b2',(PEN.x0+PEN.x1)/2,groundHeight(-47,6)+.71,PEN.z1-1,2,.03,.7);
  for(let row=0;row<3;row++)for(let i=0;i<6;i++){const x=-61+row*2.6,z=-4+i*2.6;box(pen,'#8a6a45',x,groundHeight(x,z)+.7,z,.12,1.4,.12);ico(pen,i%2?'#5f8f4a':'#6f9f52',x,groundHeight(x,z)+1.3,z,.7,.55,.7);if(i%2)ico(pen,'#7a4f9a',x+.3,groundHeight(x,z)+.95,z+.2,.16,.24,.16);}
  pen.add(label('GRAPEVINE PADDOCK',PEN.x1+2,groundHeight(PEN.x1+2,PEN.z1+1.5)+3.2,PEN.z1+1.5,5.4));outdoors.add(pen);obstacles.push(...PEN_FENCES);

  // Foals for the herding game: small sculpted horses, hidden until a round starts.
  const coats=['chestnut','bay','palomino','grey','dun','black'];
  const foals=Array.from({length:FOALS},(_,i)=>{const m=makeSculptedHorse(T,{id:'foal'+i,coat:solidCoat(coats[(i*2+1)%coats.length]),size:.52},{geometry:geo});m.root.traverse(o=>{if(o.isMesh)o.castShadow=true;});m.root.visible=false;outdoors.add(m.root);return m;});
  let round=null,best=null;try{best=Number(localStorage.getItem('trottville-herd-best'))||null;}catch{}
  const herd={
    get active(){return !!round&&!round.done;},
    get round(){return round;},best:()=>best,
    start(seed=Date.now(),blocked){let s=seed>>>0||1;const rand=()=>((s=Math.imul(s^s>>>15,2246822507)+1>>>0)%10000)/10000;round=newRound(rand,blocked);round.rand=rand;gate.rotation.y=-Math.PI/2.2;
      round.foals.forEach((f,i)=>{foals[i].root.visible=true;foals[i].root.position.set(f.x,groundHeight(f.x,f.z),f.z);});return round;},
    stop(){round=null;foals.forEach(m=>{m.root.visible=false;});},
    // Returns {penned, done, seconds, reward} when something changed worth telling, else null.
    update(dt,player,blocked){if(!round)return null;const before=pennedCount(round);if(!round.done)stepRound(round,player,dt,round.rand,blocked);
      round.foals.forEach((f,i)=>{const m=foals[i];m.root.position.set(f.x,groundHeight(f.x,f.z),f.z);const d=Math.atan2(Math.sin(f.heading-m.root.rotation.y),Math.cos(f.heading-m.root.rotation.y));m.root.rotation.y+=d*Math.min(1,dt*8);
        const gait=f.speed>3?'trot':f.speed>.3?'walk':'stand';if(m.gait!==gait)m.setGait(gait);m.update(dt);});
      const now=pennedCount(round);if(round.done&&!round.told){round.told=true;gate.rotation.y=0;const seconds=round.time,reward=herdReward(seconds),fresh=!best||seconds<best;if(fresh){best=seconds;try{localStorage.setItem('trottville-herd-best',String(seconds));}catch{}}return {penned:now,done:true,seconds,reward,best,fresh};}
      return now!==before?{penned:now,done:false}:null;},
    dispose(){foals.forEach(m=>m.dispose?.());}
  };

  // Games Gazebo: a round pavilion with a game table, by Buttercup Picnic. Board games open from here.
  const gz=new T.Group();const gzR=3.6;for(let i=0;i<6;i++){const a=i/6*Math.PI*2;box(gz,'#f4efe2',Math.cos(a)*gzR,1.6,Math.sin(a)*gzR,.24,3.2,.24,true);}
  {const roof=new T.Mesh(geo(new T.ConeGeometry(4.6,1.9,6)),mat('#c84e3c'));roof.position.y=4.1;roof.castShadow=true;gz.add(roof);const floor=new T.Mesh(geo(new T.CylinderGeometry(4.1,4.1,.25,6)),mat('#e6d3ad'));floor.position.y=.12;floor.receiveShadow=true;gz.add(floor);}
  box(gz,'#9c7a52',0,.95,0,2.4,.14,2.4,true);box(gz,'#7d5e3d',0,.5,0,.3,.8,.3);for(let i=0;i<8;i++)box(gz,(i+((i/4)|0))%2?'#2f6b3a':'#fffdf4',-.75+(i%4)*.5,1.04,-.25+((i/4)|0)*.5,.5,.03,.5);
  for(const [x,z,c] of [[-.4,.1,'#d9483a'],[.3,-.3,'#4f7bc4'],[.5,.35,'#e0b23c']])ico(gz,c,x,1.18,z,.12,.16,.12);
  for(const [x,z] of [[0,1.8],[0,-1.8],[1.8,0],[-1.8,0]])box(gz,'#c99a5a',x,.45,z,.8,.12,.8,true);
  gz.add(label('GAMES GAZEBO',0,5.6,0,4.6));at(gz,-10,47,0);obstacles.push({kind:'box',x:-10,z:47,hx:1.3,hz:1.3,height:1.1});

  // `view`: where the camera glides before the game opens (position + look-at, world space).
  const list=[
    {id:'fling',kind:'game',name:"Hay's for Horses",icon:'▥',x:-29,z:0,reach:5.5,view:{pos:[-33.5,3.2,4.2],look:[-20,4.5,-6]}},
    {id:'feed',kind:'game',name:'Appleoosa',icon:'●',x:17,z:-32,reach:6.5,view:{pos:[17,9.5,-26.5],look:[17,1.6,-32.5]}},
    {id:'boards',kind:'boards',name:'Games Gazebo',icon:'🎲',x:-10,z:47,reach:6,view:null},
    {id:'herd',kind:'herd',name:'Grapevine Paddock',icon:'🍇',x:PEN.x1+2,z:PEN.z1+1.5,reach:6,view:null}
  ];
  // Nine regions: everything above is drawn at its design spot; move each station with its block (Appleoosa goes to
  // Harvest Farms with the orchard; the rest stay in Trottville). The paddock and its foals stay put.
  for(const g of [hay,rig,gz]){const p=R(g.position.x,g.position.z),dy=groundHeight(p.x,p.z)-groundHeight(g.position.x,g.position.z);g.position.set(p.x,g.position.y+dy,p.z);}
  obstacles.forEach(o=>{if(!PEN_FENCES.includes(o))Object.assign(o,R(o.x,o.z));});
  list.forEach(st=>{const p=R(st.x,st.z),dx=p.x-st.x,dz=p.z-st.z;st.x=p.x;st.z=p.z;if(st.view){st.view={pos:[st.view.pos[0]+dx,st.view.pos[1],st.view.pos[2]+dz],look:[st.view.look[0]+dx,st.view.look[1],st.view.look[2]+dz]};}});
  return {list,obstacles,herd,paddock:PADDOCK,dispose(){herd.dispose();}};
}
