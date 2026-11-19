// Valley life in 3D (rules in world-life.mjs): grazing herds, trail riders, practice gallops and the noon Derby at
// Clover Racecourse. Horses are built lazily when you come near a group and are only animated within ~95 m.
import {makeSculptedHorse} from './horse-sculpt.js?v=158';
import {addTackAndRider} from './rider-sculpt.js?v=158';
import {lookFromSeed} from './character-looks.mjs?v=158';
import * as V from './world-life.mjs?v=158';

// v158 lag fix: each sculpted horse is ~20 draws. Herds show within 115 m (was 170) and only horses within 28 m cast shadows.
const BUILD_R=150,ANIM_R=95,SHOW_R=115,SHADOW_R=28,INK_R=30;   // past INK_R the black outline is dropped (half the draws)
const ease=(a,b,k)=>a+(b-a)*k;
const turn=(from,to,k)=>from+Math.atan2(Math.sin(to-from),Math.cos(to-from))*k;

export function createValleyLife({T,scene,groundY,route,simple=false,tell=()=>{},sfx=()=>{}}){
  const group=new T.Group();group.name='valley-life';scene.add(group);
  const all=[];// every built horse entity
  function makeEntity(data,{rider=null,foal=false}={}){const model=makeSculptedHorse(T,data,{});let tack=null;
    if(rider){tack=addTackAndRider(T,model,rider);tack.rider.visible=true;}
    model.root.traverse(o=>{if(o.isMesh)o.castShadow=!simple;});if(foal)model.root.scale.multiplyScalar(.62);
    group.add(model.root);const e={model,tack,x:0,z:0,yaw:0,gait:'stand',graze:0,grazeGoal:0,state:'idle',t:Math.random()*8,path:null,speed:0,near:false,cast:!simple};all.push(e);return e;}
  function place(e){e.model.root.position.set(e.x,groundY(e.x,e.z),e.z);e.model.root.rotation.y=e.yaw;}
  function setGait(e,g){if(e.gait!==g){e.gait=g;e.model.setGait(g);}}
  // Move toward (tx,tz) at `speed`; returns true on arrival.
  function stepTo(e,tx,tz,speed,dt){const dx=tx-e.x,dz=tz-e.z,d=Math.hypot(dx,dz);if(d<.4)return true;const s=Math.min(d,speed*dt);e.x+=dx/d*s;e.z+=dz/d*s;e.yaw=turn(e.yaw,Math.atan2(dx,dz),Math.min(1,dt*4));return false;}

  // ---- Herds ----
  const pastures=(simple?V.PASTURES.slice(0,V.SIMPLE_PASTURES):V.PASTURES).map(p=>({p,built:false,horses:[],runT:20+Math.random()*90,run:null}));
  function buildHerd(h){h.built=true;for(const m of V.herdHorses(h.p)){const e=makeEntity(m.data,{foal:m.foal});e.foal=m.foal;
      e.x=h.p.x+Math.cos(m.ang)*m.rad;e.z=h.p.z+Math.sin(m.ang)*m.rad;e.yaw=Math.random()*6.28;e.state='graze';e.t=2+Math.random()*10;h.horses.push(e);place(e);}}
  function herdTick(h,dt,night){const mom=h.horses[0];
    // Now and then the whole herd sets off together (not at night).
    if(!night&&!h.run){h.runT-=dt;if(h.runT<0){const to=V.pastureSpot(h.p),fast=Math.random()<.35;h.run={x:to.x,z:to.z,gait:fast?'canter':'trot'};h.runT=70+Math.random()*120;
      h.horses.forEach((e,i)=>{e.state='run';e.off={x:Math.cos(i*2.4)*2.6*(i?1:0),z:Math.sin(i*2.4)*2.6*(i?1:0)};});}}
    let running=0;
    for(const e of h.horses){e.t-=dt;
      if(e.foal&&e.state!=='run'){const fx=mom.x+Math.sin(mom.yaw+2.2)*1.8,fz=mom.z+Math.cos(mom.yaw+2.2)*1.8,d=Math.hypot(fx-e.x,fz-e.z);
        if(d>1.2){setGait(e,d>4?'trot':'walk');stepTo(e,fx,fz,d>4?V.SPEED.trot:V.SPEED.walk,dt);e.grazeGoal=0;}else{setGait(e,'stand');e.grazeGoal=night?.5:.9;e.yaw=turn(e.yaw,mom.yaw,dt);}continue;}
      if(e.state==='run'){running++;const tx=h.run.x+e.off.x,tz=h.run.z+e.off.z;setGait(e,h.run.gait);e.grazeGoal=0;
        if(stepTo(e,tx,tz,V.SPEED[h.run.gait],dt)){e.state='graze';e.t=4+Math.random()*8;setGait(e,'stand');}continue;}
      if(e.state==='walk'){setGait(e,'walk');e.grazeGoal=.25;if(stepTo(e,e.goal.x,e.goal.z,V.SPEED.walk*.8,dt)){e.state='graze';e.t=6+Math.random()*14;setGait(e,'stand');}continue;}
      // graze / doze
      setGait(e,'stand');e.grazeGoal=night?.45:.95;
      if(e.t<0){if(night){e.t=20+Math.random()*30;continue;}e.state='walk';e.goal=V.pastureSpot(h.p);}}
    if(h.run&&!running)h.run=null;}

  // ---- Trail riders + practice gallops on the racecourse ----
  const trails=V.TRAILS.map(pts=>({pts,legs:null,building:false}));
  async function legsOf(tr){// route each leg round obstacles once (spread over frames by the caller)
    if(tr.legs||tr.building)return;tr.building=true;const legs=[];
    for(let i=0;i<tr.pts.length;i++){const a=tr.pts[i],b=tr.pts[(i+1)%tr.pts.length];let r=null;try{r=route(a,b);}catch{}legs.push(r&&r.length?[a,...r]:[a,b]);await new Promise(q=>requestAnimationFrame(q));}
    const path=legs.flat();let L=0;const cum=[0];for(let i=0;i<path.length;i++){const p=path[i],q=path[(i+1)%path.length];L+=Math.hypot(q.x-p.x,q.z-p.z);cum.push(L);}
    tr.legs={path,cum,L};}
  function along(tr,d){const {path,cum,L}=tr.legs;d=((d%L)+L)%L;let i=0;while(cum[i+1]<d)i++;const p=path[i],q=path[(i+1)%path.length],f=(d-cum[i])/((cum[i+1]-cum[i])||1);
    return {x:p.x+(q.x-p.x)*f,z:p.z+(q.z-p.z)*f,yaw:Math.atan2(q.x-p.x,q.z-p.z)};}
  const riders=V.RIDERS.map((r,i)=>({...r,i,e:null,d:null,away:0}));
  const practice=[0,1].map(i=>({i,e:null,d:i*V.TRACK_LEN/2,gait:i?'canter':'trot'}));
  const riderLook=seed=>({look:lookFromSeed(seed),silk:['#3d6fb3','#b3473d','#3d8f5a','#8a5bb3','#d08a2e','#2e8f8f'][Math.floor(Math.random()*6)],trim:'#f4ecd8'});

  // ---- The noon Derby ----
  let derby=null,derbyKey=null,toldParade=null,toldResult=null;
  function buildDerby(key){if(derby)derby.forEach(r=>{r.e.model.root.visible=false;});
    const field=V.derbyField(key),result=V.derbyResult(field);derby=field.map(h=>{let e=derby?.[h.i]?.e;
      if(!e){e=makeEntity(V.npcHorse(h.seed,h.breed),{rider:{look:lookFromSeed(h.seed),silk:h.silk,trim:h.trim}});}
      return {h,e,place:result.findIndex(x=>x.i===h.i)+1};});
    derbyKey=key;}

  let lastNear={x:0,z:0},frame=0;
  let raining=false;   // v71: valley riders wear ponchos in the rain
  function update(dt,{x,z,area,night=0,rain=false,now=new Date()}){frame++;raining=rain;group.visible=area==='outdoor';if(!group.visible)return;lastNear={x,z};
    if(frame%10===0)for(const e of all){const d=Math.hypot(e.x-x,e.z-z),on=!simple&&d<SHADOW_R,ink=d<INK_R;if(on!==e.cast||ink!==e.ink){e.cast=on;e.ink=ink;e.model.root.traverse(o=>{if(!o.isMesh)return;if(o.userData.isOutline)o.visible=ink;else o.castShadow=on;});}}
    const isNight=night>.6;
    // Herds: build when near, animate when nearer.
    for(const h of pastures){const d=Math.hypot(h.p.x-x,h.p.z-z);if(!h.built&&d<BUILD_R)buildHerd(h);if(!h.built)continue;
      const show=d<SHOW_R;h.horses.forEach(e=>e.model.root.visible=show);if(!show)continue;
      herdTick(h,dt,isNight);for(const e of h.horses){place(e);if(d<ANIM_R||frame%4===0)animate(e,d<ANIM_R?dt:dt*4);}}
    // Trail riders: by day only (they ride home at dusk, out of sight).
    for(const r of riders){const tr=trails[r.trail];
      if(!tr.legs){if(!tr.building&&Math.hypot(tr.pts[0].x-x,tr.pts[0].z-z)<BUILD_R+60)legsOf(tr);continue;}
      if(!r.e){const seed='trail-rider-'+r.i;r.e=makeEntity(V.npcHorse(seed,['quarter','arabian','appaloosa','morgan'][r.i%4]),{rider:riderLook(seed)});r.d=r.at*tr.legs.L;}
      const p0=along(tr,r.d),dist=Math.hypot(p0.x-x,p0.z-z);
      r.away=ease(r.away,isNight?1:0,Math.min(1,dt*.5));const hide=isNight&&dist>40;r.e.model.root.visible=!hide&&dist<SHOW_R&&!(isNight&&r.away>.95);
      if(!r.e.model.root.visible)continue;r.d+=V.SPEED[r.gait]*dt;const p=along(tr,r.d);r.e.x=p.x;r.e.z=p.z;r.e.yaw=turn(r.e.yaw,p.yaw,Math.min(1,dt*5));setGait(r.e,r.gait);place(r.e);if(dist<ANIM_R||frame%4===0)animate(r.e,dist<ANIM_R?dt:dt*4);}
    // Racecourse: practice gallops, or the Derby around :15.
    const ph=V.derbyPhase(now),dTrack=Math.hypot(56.5-x,37.5-z);
    const derbyTime=ph.phase!=='off';
    for(const r of practice){if(!r.e&&dTrack<BUILD_R){const seed='practice-'+r.i;r.e=makeEntity(V.npcHorse(seed,r.i?'thoroughbred':'standardbred'),{rider:riderLook(seed)});}
      if(!r.e)continue;const vis=dTrack<SHOW_R&&!isNight;r.e.model.root.visible=vis;if(!vis)continue;
      if(derbyTime){// stand at the rail and watch
        const p=V.trackPoint(r.i?30:60,6+r.i);r.e.x=ease(r.e.x,p.x,Math.min(1,dt));r.e.z=ease(r.e.z,p.z,Math.min(1,dt));r.e.yaw=turn(r.e.yaw,p.yaw+Math.PI/2,dt);setGait(r.e,'stand');}
      else{r.d+=V.SPEED[r.gait]*dt;const p=V.trackPoint(r.d,3.2+r.i*1.1);r.e.x=p.x;r.e.z=p.z;r.e.yaw=turn(r.e.yaw,p.yaw,Math.min(1,dt*5));setGait(r.e,r.gait);}
      place(r.e);if(dTrack<ANIM_R||frame%4===0)animate(r.e,dTrack<ANIM_R?dt:dt*4);}
    if(derbyTime&&dTrack<BUILD_R){if(derbyKey!==ph.key)buildDerby(ph.key);
      if(ph.phase==='parade'&&toldParade!==ph.key&&dTrack<120){toldParade=ph.key;sfx('chime',{vol:.6});tell('The noon Derby at Clover Racecourse starts in a minute! Six horses, four laps.',6);}
      const goal=V.TRACK_LEN*V.DERBY.laps;
      for(const r of derby){const lane=.4+r.h.i*.9;r.e.model.root.visible=dTrack<SHOW_R;
        if(ph.phase==='parade'){const k=Math.max(0,Math.min(1,1-ph.left/60)),s=V.trackPoint(-6+k*6-(r.h.i%2)*1.2,lane);r.e.x=s.x;r.e.z=s.z;r.e.yaw=s.yaw;setGait(r.e,k<.92?'walk':'stand');}
        else{const t=ph.t,run=Math.min(goal,V.derbyDistance(r.h,t)),fin=run>=goal,over=fin?Math.min(14,(t-V.derbyFinishTime(r.h))*2.2):0,p=V.trackPoint(run+over,lane);
          r.e.x=p.x;r.e.z=p.z;r.e.yaw=turn(r.e.yaw,p.yaw,Math.min(1,dt*6));setGait(r.e,fin?(over<14?'trot':'stand'):t<1?'stand':'gallop');}
        place(r.e);if(dTrack<ANIM_R||frame%4===0)animate(r.e,dTrack<ANIM_R?dt:dt*4);}
      if(ph.phase==='race'){const win=derby.find(r=>r.place===1);if(toldResult!==ph.key&&ph.t>V.derbyFinishTime(win.h)&&dTrack<130){toldResult=ph.key;sfx('fanfare',{vol:.7});
        const order=[...derby].sort((a,b)=>a.place-b.place).slice(0,3).map(r=>r.h.name);tell(`🏆 ${order[0]} wins the noon Derby! ${order[1]} second, ${order[2]} third.`,7);}}}
    else if(derby&&!derbyTime){derby.forEach(r=>r.e.model.root.visible=false);}
  }
  // Model animation + the grazing head drop (applied after the model's own pose).
  function animate(e,dt){e.model.update(dt);e.graze=ease(e.graze,e.gait==='stand'?e.grazeGoal:0,Math.min(1,dt*1.6));
    if(e.graze>.01){e.model.neck.rotation.x+=e.graze*.95;e.model.head.rotation.x+=e.graze*.35;}
    if(e.tack)e.tack.character?.setGear?.({poncho:raining});
    if(e.tack)e.tack.update(dt,{jumpT:e.model.jumpT,speed:{stand:0,walk:.2,trot:.4,canter:.7,gallop:1}[e.gait]||0});}

  return {update,
    get count(){return all.length;},
    debug:{pastures,riders,practice,get derby(){return derby;},all},
    dispose(){group.removeFromParent();all.forEach(e=>{e.tack?.dispose?.();e.model.dispose?.();});}};
}
