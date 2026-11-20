// Home page greeting: your horse, live in 3D in YOUR STALL, and hands-on care. A brush waits on a little table
// and carrots in a basket: drag them onto the horse.
//  · Arrival: the stall draws as soon as 3D is ready; the horse's shaders compile while it waits outside, then
//    it walks in through the stall doorway (right) and settles. No timers: it starts on the compile finishing.
//  · Carrots: bring one slowly to the mouth and the horse takes it. Swoop in fast and they flinch away.
//    About 1 in 50 carrots is golden (big XP).
//  · Brush: stroke the way the coat grows (head → tail). Three good strokes = a clean shine. Brush the wrong
//    way a few times and the horse walks out of the stall; the whistle fills up and turns green, then you can call them back.
//  · Pet: touch the nose, neck or back.
//  · Decorate: tap Decorate (the stall goes FULL SCREEN; Done brings you back to the page), then a spot (＋) to put up pictures, flowers, rugs… (stall-decor.mjs rules,
//    stall-scene.js models, stall-ui.js sheets; saved on the device).
// Tired horses (lots of care in a row) lower their head and yawn; XP tapers but nothing is blocked.
// Rewards, food and XP are decided by horselandia.js (onCare); this file only draws and reports.
import * as T from './vendor/three-0.180.0/three.module.js?v=162';
import {iconHTML} from './pixel-icons.js?v=162';
import {makeSculptedHorse} from './horse-sculpt.js?v=162';
import {buildStall,paintingCanvas,PAINTING_KIND,WINDOW_AT} from './stall-scene.js?v=162';
import {makeProps} from './stall-props.js?v=162';
import {sfx,voiceRate} from './sfx.js?v=162';
import {dirtLevel,sweepsLeft,pieceCount,afterSweep,cleanAtFor,piecesFor,loadDirt,saveDirt} from './stall-dirt.mjs?v=162';
import {makeWindow} from './stall-window.js?v=162';
import {addRideTrust,rideTrustOf,trustCap,feedSpeedLimit,TRUST_GAINS,RAKE_TRUST} from './riding.mjs?v=162';
import {loadPhotos,savePhoto,clearPhoto,showPhotoView,closePhotoView} from './stall-photo.js?v=162';
import {loadStall,saveStall,openSlots,place,remove,ITEM,SLOT} from './stall-decor.mjs?v=162';
import {openSlotSheet,openStoreSheet,closeStallSheet} from './stall-ui.js?v=162';

const BURSTS={pet:['💗','💕','💖','🤍','💗'],feed:['😋','🥕','💚','✨','🥕'],groom:['✨','🌟','💫','✨','🫧'],golden:['✨','🌟','💛','⭐','✨'],shy:['💦','❗'],toss:['😣','💢'],tidy:['✨','🌾','💫','✨','💛']};

// World mode (2026-11-12, one world): pass world:{root,camera,stall} and the same care runs inside the 3D barn.
// root is a Group in the world scene placed like the home stall (local +z faces the hall); the world renders and
// calls api.tick(now) each frame while care is active; stall is the world's decor-only stall (shared, not owned).
export function createHomeHorse({horse,onCare,basket=()=>({left:5,golden:0}),drawCarrot=()=>'carrot',rest=()=>100,world:W=null}){
  const el=document.createElement('div');el.className='home-horse'+(W?' hh-world':'');
  el.innerHTML=`${W?'':`<canvas aria-label="${horse.name}, your horse, in their stall. Touch to pet."></canvas>`}<div class="home-horse-fx" aria-hidden="true"></div>
  <div class="hh-hint" role="status" aria-live="polite"></div>
  <div class="hh-slots" hidden></div>
  <div class="hh-decobar" hidden><span>🪴 Tap a spot</span><button type="button" class="hh-store">🛍️ Store</button><button type="button" class="hh-done" aria-label="Done decorating, back to the page">✓ Done</button></div>
  <button type="button" class="hh-deco" aria-label="Decorate your stall"><img class="px-ic px-lg" src="assets/icons/table.webp" alt="" aria-hidden="true" draggable="false"><b>Decorate</b></button>
  <div class="hh-tray"><button type="button" class="hh-table" aria-label="Brush on the table. Drag it along the back, head to tail."></button>
  <button type="button" class="hh-whistle" hidden disabled aria-label="Whistle. Fills up while your horse takes a moment."><img class="px-ic px-lg" src="assets/icons/whistle.webp" alt="" aria-hidden="true" draggable="false"><b>Whistle</b></button>
  <button type="button" class="hh-basket" aria-label="Carrot pail. Drag a carrot slowly to the mouth."><b class="hh-count"></b></button></div>
  <button type="button" class="hh-rake" aria-label="Rake. Drag it across the floor to sweep up the mess."></button>
  <div class="hh-held" hidden></div>${W?'<button type="button" class="hh-leave" aria-label="Walk around the barn"><img class="px-ic px-lg" src="assets/icons/horse-head.webp" alt="" aria-hidden="true" draggable="false"><b>Walk</b></button>':''}`;
  const $=s=>el.querySelector(s),canvas=$('canvas'),fx=$('.home-horse-fx'),hint=$('.hh-hint'),held=$('.hh-held'),whistleBtn=$('.hh-whistle'),decoBtn=$('.hh-deco'),slotsEl=$('.hh-slots'),decoBar=$('.hh-decobar');
  let renderer=null;if(!W){try{renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true});}catch{return null;}}
  if(renderer){renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;}
  const scene=W?W.root:new T.Scene(),camera=W?W.camera:new T.PerspectiveCamera(30,1,.1,90);if(!W)scene.background=new T.Color('#5a3a22');
  // World mode: local (root) ↔ world points. Rays come in world space; everything we place lives in root.
  const toL=p=>W?W.root.worldToLocal(p):p,toW=p=>W?W.root.localToWorld(p.clone()):p;
  // Warm barn light: a low "late sun through the door" key light (only the horse and floor decor cast shadows) and a warm fill.
  const sun=new T.DirectionalLight('#ffe2b4',2.7);sun.position.set(-4,9,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.bias=-.0006;
  Object.assign(sun.shadow.camera,{left:-6,right:6,top:6,bottom:-3,near:1,far:30});const hemi=new T.HemisphereLight('#fff0d6','#9a7040',1.9);scene.add(sun,hemi);if(W)scene.add(sun.target);
  const stall3d=W?W.stall:buildStall(T);if(!W)scene.add(stall3d.group);
  // Window (time of day + weather) and the ceiling lamp drive the room light; see stall-window.js.
  // (The world's stall is the full home stall, so it gets the same window and lights, switched on while you care.)
  const win=makeWindow(T,{x:WINDOW_AT.x,y:WINDOW_AT.y});scene.add(win.group);
  const lampLight=new T.PointLight('#ffcf8a',0,16,1.4);lampLight.position.set(-.05,5.0,.8);scene.add(lampLight);
  const winLight=new T.DirectionalLight('#e4f0ff',0);winLight.position.set(WINDOW_AT.x,WINDOW_AT.y,-3);winLight.target.position.set(-.5,0,3);scene.add(winLight,winLight.target);
  // Lightning lights the whole room for a blink (plus a pale flash over the picture).
  let mixW=W?0:1;// world: how much of the stall's own light is on (world.js fades it with the camera glide)
  function lightMix(m){mixW=m;for(const o of [sun,hemi,lampLight,winLight])o.visible=m>0;}
  function light(dt){const L=win.update(dt),m=mixW;sun.intensity=2.7*L.room*m;hemi.intensity=(1.9*(.3+.7*L.room)+L.flash*7)*m;lampLight.intensity=L.lamp*9*m;winLight.intensity=(L.win*3+L.flash*6)*m;el.style.setProperty('--flash',(L.flash*.45).toFixed(3));}
  // The brush table and carrot pail, standing under their (invisible) buttons.
  const props=makeProps(T);props.table.visible=props.pail.visible=false;scene.add(props.table,props.pail);
  const heldBrush=props.brush(),heldCarrot=props.carrot(false),heldGold=props.carrot(true);const floorBrush=props.brush();floorBrush.visible=false;floorBrush.scale.setScalar(1.45);scene.add(floorBrush);
  for(const o of [heldBrush,heldCarrot,heldGold]){o.visible=false;o.scale.setScalar(o===heldBrush?1.6:2.3);scene.add(o);}
  const heldRake=props.rake();heldRake.visible=false;scene.add(heldRake);
  // The rake leans against the back wall, just left of the horseshoe slot (wall-4), top resting on the boards.
  props.tableRake.position.set(2.35,0,-2.78);props.tableRake.rotation.set(-.24,-.3,0);scene.add(props.tableRake);
  // Floor mess (stall-dirt.mjs): builds up over the day, three rake sweeps clear it.
  const messGroup=new T.Group();scene.add(messGroup);let dirtMap=loadDirt(),dirt=0,messBits=[],flying=[];
  // Loose straw goes with the mess: none once the floor is spotless, more as it gets messy (stall-scene setLooseStraw).
  const paintStraw=()=>stall3d.setLooseStraw?.(sweepsLeft(dirt)?Math.max(.3,dirt):0);
  function paintMess(){for(const b of messBits)messGroup.remove(b.obj);messBits=[];dirt=dirtLevel(dirtMap[current.id]);paintStraw();
    for(const q of piecesFor(current.id).slice(0,pieceCount(dirt))){const o=props.mess(q.kind);o.position.set(q.x,0,q.z);o.rotation.y=q.yaw;o.scale.setScalar(q.size);messGroup.add(o);messBits.push({obj:o,q});}}
  function setDirt(level){dirt=level;dirtMap={...loadDirt(),[current.id]:cleanAtFor(level)};saveDirt(dirtMap);}
  let photos={};
  let stallState=loadStall();
  const turn=new T.Group();scene.add(turn);
  const HOME_YAW=-.62;turn.rotation.y=HOME_YAW;
  let model=null,current=null,first=true,compiling=null;
  // Off-screen spot past the doorway, far enough that the horse is out of view whatever the screen shape.
  // World: the horse wanders to the stall door on the hall side (local +z) and waits there.
  const AX=W?'z':'x',OUT_YAW=W?0:Math.PI/2,IN_YAW=W?Math.PI:-Math.PI/2;
  function offX(){if(W)return 7.2;const halfW=Math.tan(camera.fov*Math.PI/360)*Math.max(8,camera.position.z)*camera.aspect;return Math.max(stall3d.doorX+3.5,halfW+3);}
  function setHorse(h){if(model){turn.remove(model.root);model.dispose();}model=makeSculptedHorse(T,h,{style:'cel'});model.root.traverse(o=>{if(o.isMesh)o.castShadow=true;});turn.add(model.root);model.setGait('stand');current=h;
    canvas?.setAttribute('aria-label',`${h.name}, your horse, in their stall. Touch to pet.`);whistleBtn.hidden=true;decoBtn.hidden=false;el.classList.remove('hh-away');paintBasket();paintMess();
    if(stallState.placed.door==='name-plaque')stall3d.setDecor(stallState,h.name,photos);
    // Walk in from outside the doorway. The first time, wait for the shaders to finish compiling (a real load event).
    if(W){turn.position.set(0,0,0);turn.rotation.y=HOME_YAW;away=null;first=false;el.classList.remove('hh-away');return;}
    turn.position.x=offX();turn.rotation.y=-Math.PI/2;away={phase:'enter',t:0,ready:!first};
    if(first){first=false;const go=()=>{if(away?.phase==='enter'){away.ready=true;}};compiling=(renderer.compileAsync?renderer.compileAsync(scene,camera):Promise.resolve()).then(go,go);}}
  let fit=1,camGoal=null;const camPos=new T.Vector3(),camLook=new T.Vector3(),lookNow=new T.Vector3();
  function camTarget(){const a=camera.aspect,tan=Math.tan(camera.fov*Math.PI/360);
    if(decorating){const look=new T.Vector3(.55,2.8,-.7),d=Math.max(5.5/(tan*a),3.9/tan);return {pos:new T.Vector3(look.x+.2,look.y+.32*d,look.z+d*.95),look};}
    // World: the barn stall's open front is ~11 m from the horse, so the camera stands INSIDE it with a wider lens
    // (same framing as the home stall's 30° lens from 12.5 m: the offset shrinks by tan15°/tan(CARE_FOV/2)).
    if(W){const look=new T.Vector3(.2,2.45,0),k=Math.tan(15*Math.PI/180)/Math.tan(CARE_FOV*Math.PI/360),pos=new T.Vector3(.6,3.4,12.5*fit).sub(look).multiplyScalar(k).add(look);return {pos:toW(pos),look:toW(look)};}
    return {pos:new T.Vector3(.6,3.4,12.5*fit),look:new T.Vector3(.2,2.45,0)};}
  // The wall-2 picture hangs up-left, clear of the horse; on a narrow phone it moves in (and up, over the ears) to stay on screen.
  let narrow=false;function fitWall(){
    for(const g of stall3d.decor.children)if(g.userData.slot==='wall-2'){g.position.x=narrow?-1.22:-2.75;g.position.y=narrow?4.72:4.75;}}
  function resize(){const r=el.getBoundingClientRect();if(!r.width)return;narrow=r.width/r.height<.9;if(W){fit=Math.min(1.45,Math.max(1,.95/(r.width/r.height)));camGoal=camTarget();return;}renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;
    fit=Math.min(1.45,Math.max(1,.95/camera.aspect));camGoal=camTarget();if(!camPos.lengthSq()){camPos.copy(camGoal.pos);lookNow.copy(camGoal.look);}camera.position.copy(camPos);camera.lookAt(lookNow);camera.updateProjectionMatrix();}
  const ro=new ResizeObserver(resize);ro.observe(el);
  // World: glide from wherever the world camera was (and its wide lens) to the stall view and the stall's 30° lens.
  let fovNow=30;const CARE_FOV=30;
  function updateCamera(dt){if(!camGoal)return;const k=1-Math.exp(-dt*(W?3.2:5));camPos.lerp(camGoal.pos,k);lookNow.lerp(camGoal.look,k);camera.position.copy(camPos);camera.lookAt(lookNow);
    if(W){fovNow+=(CARE_FOV-fovNow)*k;if(Math.abs(camera.fov-fovNow)>.01){camera.fov=fovNow;camera.updateProjectionMatrix();}}}

  // ---- helpers: screen positions of the horse's parts ----
  const v=new T.Vector3(),q=new T.Quaternion();
  const rect=()=>el.getBoundingClientRect();
  function screen(p,cam=camera){const s=p.clone().project(cam),r=rect();return {x:(s.x+1)/2*r.width,y:(1-s.y)/2*r.height,behind:s.z>1};}
  const fwd=()=>new T.Vector3(0,0,1).applyQuaternion(model.root.getWorldQuaternion(q));
  const sc=()=>model.root.scale.y;
  function muzzle(){model.head.getWorldPosition(v);return screen(v.clone().addScaledVector(fwd(),.9*sc()).add(new T.Vector3(0,-.5*sc(),0)));}
  function headPt(){model.head.getWorldPosition(v);return screen(v.clone().add(new T.Vector3(0,.2*sc(),0)));}
  function neckPt(){model.neck.getWorldPosition(v);return screen(v.clone().addScaledVector(fwd(),.25*sc()).add(new T.Vector3(0,.55*sc(),0)));}
  // The back line runs from the withers to the rump; brushing works near it (the side of the body counts too).
  function backLine(){model.body.getWorldPosition(v);const f=fwd(),up=new T.Vector3(0,1,0),s=sc();
    return {a:screen(v.clone().addScaledVector(f,.85*s).addScaledVector(up,.55*s)),b:screen(v.clone().addScaledVector(f,-1.05*s).addScaledVector(up,.55*s)),c:screen(v.clone())};}
  const dist=(p,q2)=>Math.hypot(p.x-q2.x,p.y-q2.y);
  const ray=new T.Raycaster(),ndc=new T.Vector2(),FLOOR=new T.Plane(new T.Vector3(0,1,0),0),HOLD=new T.Plane(new T.Vector3(0,0,1),-1.9),hitP=new T.Vector3();
  function rayAt(x,y,cam=camera){const r=rect();ndc.set(x/r.width*2-1,-(y/r.height)*2+1);ray.setFromCamera(ndc,cam);return ray;}
  // The camera where it is heading (its goal), not where it is mid-glide. Props are placed against this so they stay
  // put on the floor while the camera settles on first load (2026-11-13: the table and pail slid across the stall).
  const goalCam=camera.clone();function settledCam(){if(!camGoal)return camera;goalCam.copy(camera);goalCam.position.copy(camGoal.pos);goalCam.lookAt(camGoal.look);
    if(W)goalCam.fov=CARE_FOV;goalCam.updateProjectionMatrix();goalCam.updateMatrixWorld(true);return goalCam;}
  // Stand a prop on the floor under the bottom middle of its button, sized to the button.
  // On wide screens the corners land behind the stall's side partitions: keep the prop inside the stall
  // (in front of the partitions it can go anywhere) and slide its button over it.
  const EXIT_CLEAR=2.25,PROP_SCALE=1.15;
  function placeProp(obj,btn,modelW){const r=rect(),bb=btn.getBoundingClientRect(),cam=settledCam();if(!bb.width||!r.height){obj.visible=false;return;}
    const ox=+btn.dataset.dx||0,oy=+btn.dataset.dy||0,b={left:bb.left-ox,width:bb.width,bottom:bb.bottom-oy};
    if(!rayAt(b.left-r.left+b.width/2,b.bottom-r.top-8,cam).ray.intersectPlane(FLOOR,hitP)){obj.visible=false;return;}toL(hitP);
    const lim=stall3d.doorX*(W?.88:1)-.95;if((W||hitP.z<3.7)&&Math.abs(hitP.x)>lim){hitP.x=Math.sign(hitP.x)*lim;}
    // Keep out of the lane the horse walks to the doorway (z≈0 toward +x): slide down against the wall below the door.
    if(!W&&hitP.x>-1&&hitP.z<EXIT_CLEAR){hitP.z=EXIT_CLEAR;for(let i=0;i<40&&hitP.x>0&&screen(hitP,cam).x+b.width/2>r.width-6;i++)hitP.x-=.1;}
    const sp=screen(toW(hitP)),dx=Math.round(sp.x-(b.left-r.left+b.width/2)),dy=Math.round(sp.y-(b.bottom-r.top-8));
    if(dx!==ox||dy!==oy){btn.dataset.dx=dx;btn.dataset.dy=dy;btn.style.transform=dx||dy?`translate(${dx}px,${dy}px)`:'';}
    const d=toW(hitP).distanceTo(cam.position),perPx=2*Math.tan(cam.fov*Math.PI/360)*d/r.height;
    // Props are room-sized (2026-11-10: fixed-pixel buttons made them tiny next to the horse on desktop). The
    // button grows to match, capped so a narrow phone screen still has room for the horse.
    let sc=PROP_SCALE,w=modelW*sc/perPx/.95;const cap=r.width*.3;if(w>cap){w=cap;sc=w*.95*perPx/modelW;}
    if(!btn.dataset.ar)btn.dataset.ar=(bb.height/bb.width).toFixed(3);w=Math.max(64,Math.round(w));
    if(Math.abs(w-bb.width)>1){btn.style.width=w+'px';btn.style.height=Math.round(w*+btn.dataset.ar)+'px';}
    obj.position.copy(hitP);obj.position.y+=obj.userData.hop||0;obj.scale.setScalar(sc);
    const cl=W?toL(camera.position.clone()):camera.position;obj.rotation.y=Math.atan2(cl.x-hitP.x,cl.z-hitP.z)*.6;obj.visible=!decorating;}
  // What a tap at (x,y) lands on: the window, a framed picture, or nothing (the horse wins when it's in front).
  function tapTarget(x,y){const rc=rayAt(x,y),list=[...win.targets,...stall3d.decor.children.filter(g=>PAINTING_KIND[g.userData.item])];if(model)list.push(model.root);
    const hit=rc.intersectObjects(list,true)[0];if(!hit)return null;let o=hit.object;while(o&&!o.userData.item&&!win.targets.includes(o)&&o!==model?.root)o=o.parent;
    if(!o||o===model?.root)return null;return win.targets.includes(o)?{kind:'window'}:{kind:'picture',slot:o.userData.slot,item:o.userData.item};}
  function onHorse(p){if(!model)return false;const pad=8*(rect().width/400);
    return [[0,0],[pad,0],[-pad,0],[0,pad],[0,-pad]].some(([dx,dy])=>rayAt(p.x+dx,p.y+dy).intersectObject(model.root,true).some(h=>h.object.visible&&!h.object.material?.transparent));}
  function segDist(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));return {d:Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t),t};}

  // ---- effects ----
  let hintUntil=0;
  // Hints sit where the page heading is (top left, which fades out meanwhile), never over the horse.
  function say(text,secs=3){hint.textContent=text;const h=hero(),c=!decorating&&!el.classList.contains('hh-full')&&h?.querySelector('.hero-copy');
    if(c){const r=rect(),b=c.getBoundingClientRect();hint.style.left=Math.max(10,b.left-r.left)+'px';hint.style.top=Math.max(10,b.top-r.top)+'px';hint.classList.remove('hh-hint-top');h.classList.add('hh-hinting');}
    else{hint.style.left=hint.style.top='';hint.classList.add('hh-hint-top');}
    hint.classList.add('on');hintUntil=performance.now()+secs*1000;}
  function unsay(){hint.classList.remove('on');hero()?.classList.remove('hh-hinting');hintUntil=0;}
  function burst(kind,at,n=5+Math.floor(Math.random()*6)){if(!Number.isFinite(at?.x)||!Number.isFinite(at?.y)){const r=rect();at={x:r.width/2,y:r.height*.45};}const list=BURSTS[kind];
    for(let i=0;i<n;i++){const s=document.createElement('span');s.textContent=list[i%list.length];
      s.style.cssText=`left:${at.x+(Math.random()-.5)*70}px;top:${at.y+(Math.random()-.5)*30}px;--dx:${(Math.random()-.5)*90}px;--rise:${110+Math.random()*90}px;--rot:${(Math.random()-.5)*40}deg;--size:${20+Math.random()*14}px;animation-delay:${i*90}ms;animation-duration:${1700+Math.random()*700}ms`;
      s.addEventListener('animationend',()=>s.remove());fx.append(s);}}
  function floatText(text,at,cls=''){if(!Number.isFinite(at?.x)||!Number.isFinite(at?.y)){const r=rect();at={x:r.width/2,y:r.height*.45};}const s=document.createElement('b');s.className='hh-float '+cls;s.textContent=text;s.style.left=at.x+'px';s.style.top=at.y+'px';s.addEventListener('animationend',()=>s.remove());fx.append(s);}
  function sparkle(at){const s=document.createElement('span');s.className='hh-spark';s.textContent='✦';s.style.left=at.x+'px';s.style.top=at.y+'px';s.addEventListener('animationend',()=>s.remove());fx.append(s);}
  // v127 (Yoshi): a horse that walked off has lost its trust in you for one game hour (2.5 real minutes; a game day is
  // a real hour). You can still feed it if it's hungry, but brushing, petting and feeding earn no XP or trust until then.
  const SULK_MS=150000,sulkKey=id=>'trottville-sulk:'+id;
  function sulkLeft(){try{return Math.max(0,Number(localStorage.getItem(sulkKey(current?.id)))-Date.now());}catch{return 0;}}
  function sulkSay(kind){const m=Math.max(1,Math.ceil(sulkLeft()/60000));
    say(kind==='feed'?`${current.name} eats, but hasn’t forgiven you yet. No XP for about ${m} more minute${m>1?'s':''}.`:`${current.name} still remembers that. No brushing XP for about ${m} more minute${m>1?'s':''} (one game hour).`,4);}
  function report(kind,at,info={}){const sulk=sulkLeft()>0;if(sulk&&kind!=='feed'&&kind!=='golden'&&kind!=='tidy'){sulkSay(kind);return {sulk:true};}
    if(sulk)info={...info,noXp:true};const res=onCare?.(kind,current,info)||{};if(sulk&&res.ok!==false)sulkSay('feed');if(res.ok===false){if(res.reason)say(res.reason,4);return res;}
    if(res.xp)floatText(`+${res.xp} XP`,{x:at.x,y:at.y-30},kind==='golden'||info.item==='golden'?'gold':'');
    const r=rest();if(r<35&&Math.random()<.4){setTimeout(()=>burst('pet',headPt(),0),0);floatText('🥱',headPt());if(!sleepyTold){sleepyTold=true;say(`${current.name} is getting sleepy. Care still helps; XP comes back as they rest.`,5);}}
    return res;}
  let sleepyTold=false;
  // v124 trust (riding.mjs one curve): care earns it once a day per kind; rushing the carrot or brushing the wrong way costs 1.
  const trustWho=()=>globalThis.MeadowCloud?.active?globalThis.MeadowCloud.user.id:'guest';
  const trustNow=()=>current?rideTrustOf(trustWho(),current.id):0;
  function earnTrust(n,source,at){if(!current||current.loaner)return 0;if(n>0&&sulkLeft()>0)return 0;const was=trustNow(),v=addRideTrust(trustWho(),current.id,n,globalThis.localStorage,{cap:trustCap(current),source});
    if(at&&v!==was)floatText(`${v>was?'+':''}${v-was} trust`,{x:at.x+40,y:at.y-50},v>was?'':'warn');return v-was;}

  // ---- reactions: extra poses layered on the idle ----
  let act=null;
  // Each reaction has its sound (sfx.js): crunching carrots, a shine sparkle, a snort when startled, a soft nicker.
  // v131: horse voices (nicker/snort/whinny/happy/grumpy) are pitched to the horse's size (sfx.js voiceRate); a toss is grumpy.
  const REACT_SFX={feed:['crunch','nicker',.7],groom:['sparkle'],shy:['snort'],toss:['grumpy'],pet:['heart'],nuzzle:['nicker']};
  const VOICES=new Set(['nicker','snort','whinny','happy','grumpy']);
  const voice=(name,o={})=>sfx(name,VOICES.has(name)?{...o,rate:voiceRate(current?.size)}:o);
  function react(kind,len){const s=REACT_SFX[kind];if(s){voice(s[0]);if(s[1]&&(kind!=='pet'||Math.random()<.3))voice(s[1],{delay:s[2]||.25});}act={kind,t:0,len:len||({feed:2.2,groom:1.8,shy:1.3,toss:1.1,pet:1.4,nuzzle:1.4})[kind]||1.4};}
  function pose(dt){if(!model)return;const r=rest(),sleepy=Math.max(0,(60-r)/60);model.neck.rotation.x+=.28*sleepy;
    if(!act)return;act.t+=dt;if(act.t>=act.len){act=null;return;}const e=Math.max(0,Math.min(1,act.t/.25,(act.len-act.t)/.35));
    if(act.kind==='pet'){model.neck.rotation.x+=.18*e;model.head.rotation.y+=.35*e*Math.sin(act.t*2.2);model.head.rotation.z=.12*e*Math.sin(act.t*3);}
    if(act.kind==='nuzzle'){model.neck.rotation.x+=.3*e;model.head.rotation.x+=.15*e*Math.sin(act.t*6);}
    if(act.kind==='feed'){model.neck.rotation.x+=.45*e;model.head.rotation.x+=.12*e*Math.sin(act.t*20);}
    if(act.kind==='groom'){model.body.rotation.z=.035*e*Math.sin(act.t*16);model.neck.rotation.x-=.12*e;}
    // Flinch: head up and away from the carrot.
    if(act.kind==='shy'){model.neck.rotation.x-=.45*e;model.head.rotation.y-=.6*e;model.neck.rotation.y=(model.neck.rotation.y||0)-.25*e;}
    if(act.kind==='toss'){model.neck.rotation.x-=.3*e*Math.abs(Math.sin(act.t*9));model.head.rotation.z=.25*e*Math.sin(act.t*14);}}

  // ---- arriving, walking out of the stall and coming back (all through the doorway on the right) ----
  // away.phase: 'enter' (arrival), 'out', 'wait' (whistle filling), 'back'. null = home.
  const AWAY_SECS=9,WALK=3,FRONT=4.5;let away=null;
  function walkOff(){if(away)return;try{localStorage.setItem(sulkKey(current.id),String(Date.now()+SULK_MS));}catch{}away={phase:'out',t:0};drop();model.setGait('walk');react('toss');burst('toss',headPt(),3);
    say(W?`${current.name} has had enough of that and wanders off to the stall door. No XP from them for one game hour; the whistle turns green when they’re ready.`:`${current.name} has had enough of that and walks away. No saddling up until you whistle them back, and no XP from them for one game hour.`,6);
    whistleBtn.hidden=false;decoBtn.hidden=true;whistleBtn.disabled=true;whistleBtn.classList.remove('ready');whistleBtn.style.setProperty('--fill','0');el.classList.add('hh-away');}
  // v126 (Yoshi): while the horse has walked off you can't just saddle up: the saddle (Go out) waits for the whistle.
  const saddleLock=e=>{if(!away||away.phase==='enter'||!el.isConnected)return;const a=e.target.closest?.('.h3-main,a[href="#world"]');if(!a)return;e.preventDefault();e.stopPropagation();
    say(away.phase==='wait'&&!whistleBtn.disabled?`${current.name} is waiting for your whistle before you can saddle up.`:`${current.name} doesn’t want to be ridden right now. Wait for the whistle, then call them back.`,4);};
  document.addEventListener('click',saddleLock,true);
  function whistleSound(){try{const a=new (window.AudioContext||window.webkitAudioContext)(),t=a.currentTime;[[1320,0],[1760,.2]].forEach(([f,d])=>{const o=a.createOscillator(),g=a.createGain();o.frequency.value=f;g.gain.setValueAtTime(.0001,t+d);g.gain.exponentialRampToValueAtTime(.18,t+d+.03);g.gain.exponentialRampToValueAtTime(.0001,t+d+.18);o.connect(g).connect(a.destination);o.start(t+d);o.stop(t+d+.2);});setTimeout(()=>a.close(),800);}catch{}}
  whistleBtn.addEventListener('click',()=>{if(!away||away.phase!=='wait'||whistleBtn.disabled)return;whistleSound();away={phase:'back',t:0};turn.position[AX]=offX();turn.rotation.y=IN_YAW;model.setGait('walk');whistleBtn.hidden=true;say(`${current.name} heard you and walks back in.`,3);});
  const turnTo=(goal,dt,rate)=>{turn.rotation.y+=(goal-turn.rotation.y)*Math.min(1,dt*rate);return Math.abs(goal-turn.rotation.y)<.02;};
  function updateAway(dt){if(!away)return;away.t+=dt;
    // v126 (Yoshi): at home the horse first walks toward you, then turns and leaves off the side of the screen.
    if(away.phase==='out'&&!W&&away.step!=='side'){turnTo(0,dt,5);if(away.t>.3)turn.position.z+=dt*WALK;if(turn.position.z>=FRONT){turn.position.z=FRONT;away.step='side';}}
    else if(away.phase==='out'){turnTo(OUT_YAW,dt,4);if(W?away.t>.35:Math.abs(turn.rotation.y-OUT_YAW)<.5)turn.position[AX]+=dt*WALK;if(turn.position[AX]>offX()){away={phase:'wait',t:0};model.setGait('stand');}}
    else if(away.phase==='wait'){const k=Math.min(1,away.t/AWAY_SECS);whistleBtn.style.setProperty('--fill',String(k));if(k>=1&&whistleBtn.disabled){whistleBtn.disabled=false;whistleBtn.classList.add('ready');say(`Whistle for ${current.name}!`,4);}}
    else if(away.phase==='back'||away.phase==='enter'){if(away.phase==='enter'&&!away.ready)return;
      if(turn.position[AX]>0){if(model.gait!=='walk')model.setGait('walk');if(W)turnTo(IN_YAW,dt,4);turn.position[AX]=Math.max(0,turn.position[AX]-dt*WALK);return;}
      if(!W&&turn.position.z>0){if(model.gait!=='walk')model.setGait('walk');if(!turnTo(-Math.PI,dt,5)&&Math.abs(turn.rotation.y+Math.PI)>.5)return;turn.position.z=Math.max(0,turn.position.z-dt*WALK);return;}
      model.setGait('stand');if(!turnTo(HOME_YAW,dt,3))return;turn.rotation.y=HOME_YAW;
      if(away.phase==='back'){wrong=0;react('nuzzle');burst('pet',headPt(),4);}
      else{react('nuzzle');say(`Drag the brush or a carrot to ${current.name}.`,3.5);}
      away=null;el.classList.remove('hh-away');decoBtn.hidden=!!W;}}

  // ---- basket ----
  function paintBasket(){const b=basket(current)||{left:0};/* v100: no "N free" note; the pail shows the carrots themselves (up to 5). A number only appears for a bought pantry bigger than the pail. */const cnt=$('.hh-count');cnt.textContent=!b.free&&b.left>5?String(b.left):'';cnt.hidden=!cnt.textContent;$('.hh-basket').setAttribute('aria-label',`Carrot pail, ${b.left} ${b.left===1?'carrot':'carrots'}${b.free?' (free today)':''}. Drag a carrot slowly to the mouth.`);
    props.setCarrots(Math.min(5,b.left),b.golden);$('.hh-basket').classList.toggle('empty',!b.left&&!b.golden);}

  // ---- dragging: brush, carrot, or a petting hand ----
  let drag=null,wrong=0,lastPet=0,goodRun=0,lastHappy=0;
  // The brush and carrots are held as 3D models just in front of the horse; the petting hand stays a ✋.
  let held3d=null;
  function holdAt(x,y){held.style.transform=`translate(${x}px,${y}px)`;
    if(held3d===heldRake){if(rayAt(x,y).ray.intersectPlane(FLOOR,hitP)){toL(hitP);hitP.x=Math.max(-4,Math.min(4,hitP.x));hitP.z=Math.max(-2.6,Math.min(6,hitP.z));heldRake.position.copy(hitP);}heldRake.rotation.set(.62,0,0);return;}
    if(held3d&&rayAt(x,y).ray.intersectPlane(W?HOLD.clone().applyMatrix4(W.root.matrixWorld):HOLD,hitP)){held3d.position.copy(toL(hitP));
      if(held3d!==heldBrush&&model){const m=muzzle(),dx=m.x-x,dy=m.y-y;if(Math.hypot(dx,dy)>8)held3d.rotation.set(0,0,Math.atan2(dx,dy));}else held3d.rotation.set(.35,.5,-.12);}}
  function drop(){if(!drag)return;held.hidden=true;held.className='hh-held';el.classList.remove('hh-dragging');
    if(drag.kind==='brush')settleBrush(drag.last);else props.lift(drag.kind,false);
    if(held3d){held3d.visible=false;held3d=null;}drag=null;}
  // Let go of the brush over the table and it goes back (tidy!); anywhere else it falls on the floor and
  // stays there until you pick it up again.
  let brushFall=null,brushOnFloor=false;
  function overTable(p){const r=rect(),b=$('.hh-table').getBoundingClientRect();return p.x>b.left-r.left-24&&p.x<b.right-r.left+24&&p.y>b.top-r.top-40&&p.y<b.bottom-r.top+16;}
  function settleBrush(p){if(!p||overTable(p)||decorating){props.lift('brush',false);brushOnFloor=false;floorBrush.visible=false;
      if(p&&!decorating){floatText('Tidy!',{x:p.x,y:p.y-24});}return;}
    const from=heldBrush.position.clone(),to=new T.Vector3(Math.max(-4,Math.min(4,from.x)),0,from.z);
    brushOnFloor=true;brushFall={t:0,from,to,yaw:(Math.random()-.5)*1.2,rx:heldBrush.rotation.x,rz:heldBrush.rotation.z};floorBrush.visible=true;floorBrush.position.copy(from);
    say('Oops, the brush fell on the floor. Pick it up and put it back on the table.',4);}
  function updateBrushFall(dt){if(!brushFall)return;const f=brushFall;f.t=Math.min(1,f.t+dt/.45);const e=f.t*f.t;
    floorBrush.position.lerpVectors(f.from,f.to,f.t);floorBrush.position.y=f.from.y+(f.to.y-f.from.y)*e+(f.t>=1?0:Math.sin(f.t*Math.PI)*.05);
    floorBrush.rotation.set(f.rx*(1-f.t),.5+f.yaw*f.t,f.rz*(1-f.t)+(f.t>.85?Math.sin((f.t-.85)*40)*.08*(1-f.t)*6:0));if(f.t>=1){brushFall=null;floorBrush.rotation.set(0,.5+f.yaw,0);}}
  function nearFloorBrush(p){if(!brushOnFloor)return false;const s=screen(toW(floorBrush.position.clone().add(new T.Vector3(0,.2,0))));return dist(p,s)<50*(rect().width/400);}
  function propAt(p){const pad=14*(rect().width/400);
    for(const [dx,dy] of [[0,0],[pad,0],[-pad,0],[0,pad],[0,-pad]]){const hit=rayAt(p.x+dx,p.y+dy).intersectObjects([props.table,props.pail,props.tableRake],true).find(h=>!h.object.material?.transparent);
      if(hit){let o=hit.object;for(let q=o;q;q=q.parent)if(q===props.tableRake&&q.visible)return 'rake';while(o&&o!==props.table&&o!==props.pail)o=o.parent;if(o===props.table&&!brushOnFloor)return 'brush';if(o===props.pail)return 'carrot';}}
    return null;}
  function start(kind,e){if(decorating)return;
    if(away){say(away.phase==='enter'?`${current.name} is on the way in…`:`${current.name} is taking a moment. Wait for the whistle.`,3);return;}
    const r=rect(),p={x:e.clientX-r.left,y:e.clientY-r.top};
    if(kind==='brush'&&brushOnFloor){say('The brush is on the floor. Pick it up from there.',3);return;}
    if(kind==='hand'&&nearFloorBrush(p)){kind='brush';brushOnFloor=false;brushFall=null;floorBrush.visible=false;}
    // Taps on the 3D props themselves count too: the whole brush (handle and all) and the table, the pail and its
    // carrots, plus a few pixels round them for fingers, not only the invisible buttons behind them.
    if(kind==='hand'){const k=propAt(p);if(k)kind=k;}
    if(kind==='carrot'){const item=drawCarrot(current);if(!item){say('The carrot pail is empty. Play Appleoosa for apples or visit the feed store.',4);return;}
      drag={kind,item,p,last:p,lt:performance.now(),speed:0,near:0,shyAt:0};held3d=item==='golden'?heldGold:heldCarrot;
      if(item==='golden')say('A golden carrot! Bring it nice and slowly…',3);}
    else if(kind==='brush'){drag={kind,p,last:p,good:0,bad:0,strokes:0};held3d=heldBrush;}
    else if(kind==='rake'){drag={kind,p,last:p,path:0,stroke:[]};held3d=heldRake;
      say(sweepsLeft(dirt)?`Rake back and forth across the floor: ${sweepsLeft(dirt)} strokes to go.`:'The floor is spotless! Sweep anyway if you like.',3);}
    else{drag={kind:'hand',p,last:p,moved:0};held.innerHTML='<span>✋</span>';held.className='hh-held hand';}
    if(held3d){held3d.visible=true;props.lift(kind,true);}else held.hidden=false;el.classList.add('hh-dragging');holdAt(p.x,p.y);el.setPointerCapture?.(e.pointerId);e.preventDefault();}
  $('.hh-table').addEventListener('pointerdown',e=>start('brush',e));
  $('.hh-basket').addEventListener('pointerdown',e=>start('carrot',e));
  $('.hh-rake').addEventListener('pointerdown',e=>start('rake',e));
  $('.hh-rake').addEventListener('click',()=>{if(!drag&&!decorating)say(sweepsLeft(dirt)?`Drag the rake back and forth across the floor: ${sweepsLeft(dirt)} strokes to go.`:'The floor is spotless today.',4);});
  (W?el:canvas).addEventListener('pointerdown',e=>{if(W&&e.target!==el)return;start('hand',e);});
  if(W){decoBtn.remove();$('.hh-leave').addEventListener('click',()=>{drop();W.onLeave?.();});}
  // Keyboard / tap fallback: a click without a drag explains what to do.
  $('.hh-table').addEventListener('click',()=>{if(!drag&&!decorating)say(`Drag the brush along ${current.name}’s back, from the neck toward the tail.`,4);});
  $('.hh-basket').addEventListener('click',()=>{if(!drag&&!decorating)say(`Drag a carrot slowly to ${current.name}’s mouth.`,4);});
  el.addEventListener('pointermove',e=>{if(!drag)return;const r=rect(),p={x:e.clientX-r.left,y:e.clientY-r.top},now=performance.now(),dx=p.x-drag.last.x,dy=p.y-drag.last.y,dt=Math.max(1,now-(drag.lt||now))/1000;
    holdAt(p.x,p.y);
    if(drag.kind==='carrot'){const sp=Math.hypot(dx,dy)/dt;drag.speed=drag.speed*.7+sp*.3;const m=muzzle(),d=dist(p,m),k=rect().width/400;
      if(d<130*k&&drag.speed>feedSpeedLimit(trustNow())&&now-drag.shyAt>1500){drag.shyAt=now;react('shy');burst('shy',headPt(),2);globalThis.TrottStats?.add('rushes',1);say(`Whoa, too fast! ${current.name} startles. Bring it slowly. The more ${current.name} trusts you, the faster you can bring food.`,3.5);}
      if(d<55*k&&drag.speed<450&&now-drag.shyAt>900){drag.near+=dt;if(drag.near>.25){const item=drag.item;drop();react('feed');const res=report(item==='golden'?'golden':'feed',m,{item});
        if(res.ok!==false){earnTrust(TRUST_GAINS.feed,'feed',m);globalThis.TrottStats?.add('meals',1);globalThis.TrottStats?.add('gentle',1);if(item==='golden')globalThis.TrottStats?.add('golden',1);burst(item==='golden'?'golden':'feed',m,item==='golden'?14:undefined);if(item==='golden'){sfx('chime');floatText('Golden carrot!',{x:m.x,y:m.y-70},'gold big');}paintBasket();}return;}}else drag.near=0;}
    if(drag.kind==='brush'){const line=backLine(),s=segDist(p,line.a,line.b),k=rect().width/400;
      if(s.d<60*k||dist(p,line.c)<70*k){const gx=line.b.x-line.a.x,gy=line.b.y-line.a.y,gl=Math.hypot(gx,gy)||1,along=(dx*gx+dy*gy)/gl;
        if(along>0){drag.good+=along;if(Math.random()<.35)sparkle(p);if(drag.good>110*k){drag.good=0;drag.strokes++;sfx('brush');wrong=Math.max(0,wrong-1);floatText(['Nice!','Lovely!','Shiny!'][drag.strokes%3],{x:p.x,y:p.y-20});
          if(drag.strokes>=3){drag.strokes=0;react('groom');burst('groom',line.c,10);const gr=report('groom',line.c);earnTrust(TRUST_GAINS.groom,'groom',line.c);globalThis.TrottStats?.add('grooms',1);if(!gr.sulk)say(`${current.name} gleams. What a shine!`,3);
            // v131: a good streak (2 shines running, no wrong strokes) gets one happy sound; 20 s cooldown; not while sulking.
            goodRun++;if(goodRun>=2&&!gr.sulk&&now-lastHappy>20000){goodRun=0;lastHappy=now;voice('happy',{delay:.5});}}}}
        else{drag.bad+=-along;if(drag.bad>100*k){drag.bad=0;wrong++;goodRun=0;
          if(wrong===1){react('toss',.8);say('Brush the way the hair grows: from the head toward the tail.',4);}
          else if(wrong===2){react('toss');burst('toss',headPt(),2);say(`${current.name} pins their ears. They really don’t like that.`,4);}
          else walkOff();}}}}
    if(drag.kind==='rake'){const fp=heldRake.position.clone(),prev=drag.stroke[drag.stroke.length-1];
      if(!prev||fp.distanceTo(prev)>.08){if(prev)drag.path+=fp.distanceTo(prev);drag.stroke.push(fp);if(drag.stroke.length>40)drag.stroke.shift();
        for(const b of messBits)if(!b.gone&&Math.hypot(b.obj.position.x-fp.x,b.obj.position.z-fp.z)<.45)b.obj.position.addScaledVector(fp.clone().sub(prev||fp).setY(0),.6);}
      // One stroke = one push of the rake: it counts when you pull back the other way (back and forth), or after a
      // long straight push. Each stroke takes a little of the mess; ten clean a full floor.
      const mv=prev?fp.clone().sub(prev).setY(0):null;
      if(mv&&mv.lengthSq()>1e-5){mv.normalize();if(drag.dir&&mv.dot(drag.dir)<-.3&&drag.path>=.45){sweep(p);drag.dir=mv;}else drag.dir=drag.dir?drag.dir.lerp(mv,.35).normalize():mv;}
      if(drag.path>=1.8)sweep(p);}
    if(!drag)return;// walking off drops the brush
    if(drag.kind==='hand')drag.moved+=Math.hypot(dx,dy);
    drag.last=p;drag.lt=now;});
  // One full sweep: the third of the mess nearest the rake's path is swept away; the last one leaves it spotless.
  function sweep(p){sfx('rake');const d=drag;d.path=0;const left=sweepsLeft(dirt),stroke=d.stroke.slice();d.stroke=[d.stroke[d.stroke.length-1]];
    if(!left){floatText('Swish!',{x:p.x,y:p.y-24});return;}
    const live=messBits.filter(b=>!b.gone),take=Math.ceil(live.length/left);
    const near=b=>Math.min(...stroke.map(s=>Math.hypot(s.x-b.obj.position.x,s.z-b.obj.position.z)));
    const dir=stroke.length>1?stroke[stroke.length-1].clone().sub(stroke[0]).setY(0).normalize():new T.Vector3(1,0,0);
    for(const b of live.sort((a,c)=>near(a)-near(c)).slice(0,take)){b.gone=true;flying.push({obj:b.obj,t:0,from:b.obj.position.clone(),dir,s:b.obj.scale.x});}
    setDirt(afterSweep(dirt));paintStraw();const now=sweepsLeft(dirt);burst('tidy',p,3);
    if(now){floatText(now===1?'Almost!':now+' more',{x:p.x,y:p.y-24});return;}
    drop();react('nuzzle');const h=headPt();burst('tidy',h,12);const res=report('tidy',h);if(res&&res.ok!==false){const was=trustNow();res.trustNow=addRideTrust(trustWho(),current.id,RAKE_TRUST,globalThis.localStorage,{cap:trustCap(current),source:'tidy'});res.trust=res.trustNow-was;}floatText(res?.trust?`Spotless! +${res.trust} trust`:'Spotless!',{x:h.x,y:h.y-60},'big');say(`Spotless! ${current.name} loves a clean stall.`+(res?.trust?` +${res.trust} trust (Trust ${res.trustNow}).`:''),5);}
  function updateFlying(dt){flying=flying.filter(f=>{f.t=Math.min(1,f.t+dt/.5);f.obj.position.copy(f.from).addScaledVector(f.dir,f.t*1.4);f.obj.position.y=Math.sin(f.t*Math.PI)*.15;f.obj.scale.setScalar(f.s*(1-f.t));
    if(f.t>=1){messGroup.remove(f.obj);messBits=messBits.filter(b=>b.obj!==f.obj);return false;}return true;});}
  // The rake button sits over the 3D rake leaning on the back wall.
  function placeRakeBtn(){const b=$('.hh-rake'),r=rect();props.tableRake.position.x=camera.aspect<1?1.9:2.8;if(!props.tableRake.visible||decorating){b.style.visibility='hidden';return;}
    const top=screen(props.tableRake.localToWorld(new T.Vector3(0,2.2,0))),foot=screen(props.tableRake.localToWorld(new T.Vector3(0,0,0)));
    const h=Math.max(64,foot.y-top.y),w=Math.max(44,Math.min(64,h*.45));b.style.visibility='';
    b.style.transform=`translate(${Math.round((top.x+foot.x)/2-w/2)}px,${Math.round(Math.min(top.y,foot.y-64))}px)`;b.style.width=w+'px';b.style.height=h+'px';}
  el.addEventListener('pointerup',e=>{if(!drag)return;const d=drag;const r=rect(),p={x:e.clientX-r.left,y:e.clientY-r.top};drop();
    if(d.kind==='hand'){
      // A tap on the window or a picture opens it (the 3D ray decides what is in front); petting only counts when
      // the hand actually touches the horse model (a few px of finger slack), never the wall beside its head.
      if(d.moved<14){const t=tapTarget(p.x,p.y);if(t?.kind==='window'){toggleWindow();return;}if(t?.kind==='picture'){openPicture(t.slot,t.item);return;}}
      if(!onHorse(p)&&!onHorse(d.p))return;
      const m=muzzle(),n=neckPt(),bl=backLine(),onBack=segDist(p,bl.a,bl.b).d<60*(r.width/400);
      const spot=dist(p,m)<60*(r.width/400)?'nose':dist(p,n)<70*(r.width/400)?'neck':onBack||dist(p,bl.c)<80*(r.width/400)?'back':dist(p,headPt())<60*(r.width/400)?'head':'back';
      if(performance.now()-lastPet<700)return;lastPet=performance.now();
      if(spot==='nose'){react('nuzzle');burst('pet',m,4);say(`Boop! ${current.name} nuzzles your hand.`,2.5);}
      else if(spot==='neck'){react('pet');burst('pet',n,d.moved>40?10:6);say(d.moved>40?`${current.name} loves a good neck scratch.`:`A gentle pat on the neck.`,2.5);}
      else{react('pet');burst('pet',p,5);}
      report('pet',p);earnTrust(TRUST_GAINS.pet,'pet',p);}
    else if(d.kind==='carrot'&&d.item)say(d.item==='golden'?'The golden carrot goes back in the basket. Try again slowly!':`Back in the basket. Bring it right to ${current.name}’s mouth.`,3);});
  el.addEventListener('pointercancel',drop);

  // ---- decorating: Decorate → tap a spot marker → pick from your items (or the Decor store) ----
  let decorating=false,markers=[];
  const hero=()=>el.closest('.hero');
  function setStall(next){stallState=next;saveStall(next);stall3d.setDecor(next,current?.name,photos);buildMarkers();}
  function buildMarkers(){slotsEl.innerHTML='';markers=openSlots(stallState).map(s=>{const b=document.createElement('button');b.type='button';b.className='hh-slot';b.dataset.slot=s.id;
    const it=ITEM[stallState.placed[s.id]];b.classList.toggle('filled',!!it);b.innerHTML=it?iconHTML(it.icon,it.px):'+';b.setAttribute('aria-label',`${s.label}: ${it?it.name+'. Tap to change.':'empty. Tap to add something.'}`);
    b.addEventListener('click',()=>openSlot(s.id));slotsEl.append(b);return {b,id:s.id};});placeMarkers();}
  function placeMarkers(){const r=rect();for(const m of markers){const at=stall3d.slotPoint(m.id,stallState);if(!at){m.b.classList.add('off');continue;}const t=SLOT[m.id].type,p=at.pos.clone();
    if(t==='floor')p.y+=.3*at.scale;else if(t==='beam')p.y+=.15;else if(t==='shelf'){p.y+=.6;p.x+=m.id==='shelf-1'?-.35:.35;}else if(t==='rug'){p.z+=1.3;}else if(t==='wall'&&stallState.placed[m.id]==='shelf')p.y-=.45;
    const s=screen(p);m.b.classList.toggle('off',!!s.behind);if(s.behind)continue;
    // Spots just outside the view (the door on a narrow phone) are pinned to the nearest edge so they stay tappable.
    const x=Math.max(26,Math.min(r.width-26,s.x)),y=Math.max(80,Math.min(r.height-26,s.y));m.b.classList.toggle('edge',x!==s.x||y!==s.y);m.b.style.transform=`translate(${x}px,${y}px)`;}}
  function openSlot(id){openSlotSheet({stall:stallState,slotId:id,
    onPlace:item=>{const res=place(stallState,id,item);if(!res.ok){window.TrottToast?.(res.reason);return;}setStall(res.stall);closeStallSheet();},
    onRemove:()=>{const res=remove(stallState,id);if(res.ok)setStall(res.stall);closeStallSheet();},
    onShop:type=>openStore(type,id)});}
  function openStore(type='all',forSlot=null){openStoreSheet({stall:stallState,type,forSlot,onBought:(next,item,slot)=>{if(slot){const res=place(next,slot,item);
    // A painting hung in a frame replaces your own photo there (the photo stays on the device until you pick a new one).
    if(res.ok&&photos[slot]){clearPhoto(slot).catch(()=>{});const ph={...photos};delete ph[slot];photos=ph;}setStall(res.ok?res.stall:next);}else setStall(next);}});}
  // Decorating and the store fill the screen: real fullscreen where the browser allows it (Android), else the
  // stall is lifted out of the page into a fixed full-viewport layer (iPhone). Done (or the back gesture) returns.
  let homeSlot=null,ownFull=false;
  function goFull(on){if(on){if(el.classList.contains('hh-full'))return;homeSlot=el.parentNode;document.body.append(el);el.classList.add('hh-full');document.body.classList.add('hh-full-open');
      if(el.requestFullscreen&&!document.fullscreenElement)el.requestFullscreen({navigationUI:'hide'}).then(()=>{ownFull=true;},()=>{});}
    else{if(!el.classList.contains('hh-full'))return;el.classList.remove('hh-full');document.body.classList.remove('hh-full-open');if(ownFull&&document.fullscreenElement===el)document.exitFullscreen?.().catch(()=>{});ownFull=false;
      if(homeSlot?.isConnected)homeSlot.append(el);homeSlot=null;}
    requestAnimationFrame(resize);}
  const onFsChange=()=>{if(ownFull&&document.fullscreenElement!==el){ownFull=false;if(decorating){setDecorating(false);}}};
  document.addEventListener('fullscreenchange',onFsChange);
  function setDecorating(on){if(on&&away){say(away.phase==='enter'?`Let ${current.name} settle in first.`:`Whistle ${current.name} back first.`,3);return;}
    decorating=on;goFull(on);drop();el.classList.toggle('hh-decorating',on);hero()?.classList.toggle('hh-decorating',on);decoBar.hidden=!on;slotsEl.hidden=!on;
    if(on){buildMarkers();unsay();}else{closeStallSheet();markers=[];slotsEl.innerHTML='';}
    camGoal=camTarget();}
  decoBtn.addEventListener('click',()=>setDecorating(true));
  $('.hh-done').addEventListener('click',()=>{setDecorating(false);say(`${current.name} loves the new look!`,2.5);react('nuzzle');});
  $('.hh-store').addEventListener('click',()=>openStore());

  // ---- the window and the framed pictures ----
  function toggleWindow(){const open=win.toggle();sfx('creak');say(open?`${win.label()}`:'Shutters closed.',open?4:2);}
  function openPicture(slot,item){const ph=photos[slot],name=ITEM[item]?.name||'Picture';
    let image=null;if(ph){image=URL.createObjectURL(ph.blob);}else image=paintingCanvas(item);
    const layer=showPhotoView({title:ph?'Your picture':name,image,hasPhoto:!!ph,
      onShop:()=>{closePhotoView();openStore('wall',slot);},
      onPick:async f=>{const res=await savePhoto(slot,f);photos={...photos,[slot]:res};stall3d.setDecor(stallState,current?.name,photos);setTimeout(()=>openPicture(slot,item),600);return Math.round(res.size/1024);},
      onReset:async()=>{try{await clearPhoto(slot);}catch{}const next={...photos};delete next[slot];photos=next;stall3d.setDecor(stallState,current?.name,photos);openPicture(slot,item);}});
    if(typeof image==='string')layer.addEventListener('hh-close',()=>URL.revokeObjectURL(image));}
  loadPhotos().then(ph=>{if(!Object.keys(ph).length)return;photos=ph;stall3d.setDecor(stallState,current?.name,photos);});

  // play(kind): the "Things to do" buttons point at the right prop.
  function play(kind){if(decorating)setDecorating(false);if(kind==='feed')props.nudge('pail');else if(kind==='groom')props.nudge('table');
    say(kind==='feed'?`Drag a carrot slowly to ${current.name}’s mouth.`:kind==='groom'?`Drag the brush along ${current.name}’s back, head to tail.`:`Touch ${current.name}’s nose, neck or back.`,4);}

  let raf=0,last=performance.now(),visible=true;
  const io=W?null:new IntersectionObserver(([en])=>{visible=en.isIntersecting;});io?.observe(el);
  // World mode: the world's frame calls this (it renders); returns where the camera looks (for its see-through walls).
  function tick(now){const dt=Math.min(.1,Math.max(0,(now-last)/1000));last=now;if(!model)return lookNow;if(!camGoal)resize();
    model.update(dt);model.body.rotation.z=0;model.head.rotation.z=0;model.neck.rotation.y=0;updateAway(dt);pose(dt);updateCamera(dt);camera.updateMatrixWorld(true);// lookAt leaves the matrix a rotation behind
    props.update(dt);updateBrushFall(dt);placeProp(props.table,$('.hh-table'),1.3);placeProp(props.pail,$('.hh-basket'),.9);placeRakeBtn();updateFlying(dt);light(dt);fitWall();
    if(hintUntil&&now>hintUntil)unsay();return lookNow;}
  function loop(now){const dt=Math.min(.1,(now-last)/1000);last=now;
    if(!camGoal)resize();// created off-page: size up on the first frame we're attached
    if(visible&&model){model.update(dt);model.body.rotation.z=0;model.head.rotation.z=0;model.neck.rotation.y=0;updateAway(dt);pose(dt);updateCamera(dt);
      light(dt);fitWall();props.update(dt);updateBrushFall(dt);placeProp(props.table,$('.hh-table'),1.3);placeProp(props.pail,$('.hh-basket'),.9);placeRakeBtn();updateFlying(dt);if(decorating){placeMarkers();const h=hero();if(h&&!h.classList.contains('hh-decorating'))h.classList.add('hh-decorating');}renderer.render(scene,camera);}
    if(hintUntil&&now>hintUntil)unsay();
    raf=requestAnimationFrame(loop);}
  // Draw the stall right away (first frame = stall, no horse yet), then bring the horse in on the next frame.
  let started=false;
  if(W){stall3d.setDecor(stallState,horse.name,photos);el.classList.add('hh-ready');current=horse;setHorse(horse);started=true;}
  else{stall3d.setDecor(stallState,horse.name,photos);resize();renderer.render(scene,camera);el.classList.add('hh-ready');
  current=horse;paintBasket();
  raf=requestAnimationFrame(t=>{last=t;started=true;setHorse(current);raf=requestAnimationFrame(loop);});}
  // Test hook (like the steeplechase's race.freeze()): screen points of the mouth / back, and state.
  // World: show/hide the stall care. Entering starts the camera glide from wherever the world camera is.
  function setActive(on){el.hidden=!on;turn.visible=on;
    // World mode (v92): the window and the floor mess are part of the stall, so they stay when you walk off; the care
    // tools and the stall's own lights come and go with care.
    if(W)win.group.visible=true;/* v96 (Yoshi): the brush table, carrot pail and rake stay in the stall when you walk off, so it is the same room */for(const o of [props.table,props.pail,props.tableRake,messGroup,floorBrush])o.visible=(on||!!W)&&(o!==floorBrush||brushOnFloor);
    if(on){camPos.copy(camera.position);fovNow=camera.fov;camera.getWorldDirection(lookNow).multiplyScalar(10).add(camera.position);last=performance.now();resize();say(`Brush ${current.name}, bring a carrot, or tap Walk to look around.`,4);}
    else{drop();unsay();}}
  // Where the care horse stands (world), so the world can put its own horse model in the same spot.
  function horseWorld(){const p=new T.Vector3();turn.getWorldPosition(p);const qq=new T.Quaternion();turn.getWorldQuaternion(qq);return {pos:p,yaw:new T.Euler().setFromQuaternion(qq,'YXZ').y};}
  // While you walk the barn, the window keeps following the clock and weather (world.js calls this each frame).
  let idleLast=0;function idle(now){const dt=idleLast?Math.min(.1,(now-idleLast)/1000):0;idleLast=now;if(el.hidden){if(mixW>0)light(dt);else win.update(dt);}}
  const api={el,play,tick,idle,lightMix,setActive,horseWorld,store:()=>openStore(),setHorse(h){if(started)setHorse(h);else{current=h;paintBasket();}},refresh:paintBasket,get horse(){return current;},decorate:setDecorating,
    debug:{camera,cam:()=>({pos:camera.position.toArray().map(x=>+x.toFixed(2)),fov:camera.fov,aspect:camera.aspect,goal:camGoal?.pos.toArray().map(x=>+x.toFixed(2)),look:lookNow.toArray().map(x=>+x.toFixed(2)),fit}),burst,brushOnFloor:()=>brushOnFloor,floorBrush,backLine,neckPt,muzzle,walkOff,care:k=>report(k,headPt()),toggleWindow,openPicture,tapTarget,window:win,props,away:()=>away&&away.phase,wrong:()=>wrong,stall:()=>stallState,decorating:()=>decorating,horseX:()=>turn.position.x},
    dispose(){cancelAnimationFrame(raf);document.removeEventListener('click',saddleLock,true);document.removeEventListener('fullscreenchange',onFsChange);if(el.classList.contains('hh-full'))goFull(false);ro.disconnect();io?.disconnect();
      if(W){closePhotoView();el.remove();for(const o of [turn,props.table,props.pail,props.tableRake,messGroup,floorBrush,heldBrush,heldCarrot,heldGold,heldRake])o.parent?.remove(o);for(const o of [sun,sun.target,hemi,lampLight,winLight,winLight.target,win.group])o.parent?.remove(o);const free=()=>{model?.dispose();props.dispose();win.dispose();};compiling?compiling.then(free):free();return;}closeStallSheet();hero()?.classList.remove('hh-decorating');el.remove();
      // three.js keeps polling materials until compileAsync settles, so free them only after it has.
      closePhotoView();const free=()=>{model?.dispose();stall3d.dispose();props.dispose();win.dispose();renderer.dispose();};compiling?compiling.then(free):free();}};
  el.__hh=api;return api;
}
