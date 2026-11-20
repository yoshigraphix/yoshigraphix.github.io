// Appleoosa, 3D edition: a top-down Three.js belt of rounded apples.
// Rules stay in apple-conveyor.mjs; this file only draws, animates and routes input.
import * as THREE from './vendor/three-0.180.0/three.module.js?v=162';
import {ROTTEN,APPLE_COLORS,APPLE_COLUMNS as C,APPLE_ROWS as R,newConveyor,appleGroup,collectApples,advanceConveyor,conveyorInterval,dropFromBasket,deliverBasket,recoverApple,toggleBelt,shakeBelt,startShift,squirrelTakes,moveApple,isLoneTop,flickRot,isLoneRot,FLICK_BONUS,SPOTLESS_BONUS,phaseOf,dayOf,shiftInDay,PHASE_NAMES,SHIFTS_PER_DAY,STOP_MS,BASKET_CAPACITY,TRUCK_BONUS} from './apple-conveyor.mjs?v=162';
import {createYard,appleParts,APPLE_TINTS as TINTS} from './apple-yard-3d.js?v=162';
import {createScoreRun,leaderboardHtml} from './scores.js?v=162';

const TOP=-2.2,LIP=-1,BOTTOM=R+.15,LEFT=-.45,RIGHT=C+.45,CENTER_Y=.42,G=46,FOV=24;
export const STAGE_ASPECT=(RIGHT-LEFT)/(BOTTOM-TOP);
const SVG_FILL={green:'#89af54',red:'#ce5a49',orange:'#e2913f',yellow:'#e2c650',brown:'#7d5634'};
const appleSVG=color=>`<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 11c-7-7-17-1-15 10 1 8 7 15 12 13 2-1 4-1 6 0 5 2 11-5 12-13 2-11-8-17-15-10z" fill="${SVG_FILL[color]}" stroke="#4f57243d" stroke-width=".7"/><path d="M20 11c-1-5 0-7 3-9" fill="none" stroke="#6f5839" stroke-width="2.5" stroke-linecap="round"/><path d="M22 8c1-6 7-6 10-5-1 5-5 7-10 5" fill="#65874b"/><path d="M11 17c0-3 2-4 4-4" fill="none" stroke="#fff7d6" stroke-opacity=".65" stroke-width="2.2" stroke-linecap="round"/>${color===ROTTEN?'<g fill="#3e2716" opacity=".7"><ellipse cx="14" cy="24" rx="4" ry="3"/><ellipse cx="25" cy="19" rx="3" ry="2.4"/><ellipse cx="24" cy="29" rx="2.5" ry="2"/></g>':''}</svg>`;

function bruiseTexture(){
  const c=document.createElement('canvas');c.width=256;c.height=128;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,256,128);let seed=11;const rnd=()=>((seed=seed*16807%2147483647)/2147483647);
  for(let k=0;k<26;k++){const x=rnd()*256,y=18+rnd()*96,r=5+rnd()*14,grad=g.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,'#4a3220');grad.addColorStop(.6,'#7b5a3c');grad.addColorStop(1,'#ffffff00');g.fillStyle=grad;for(const dx of [-256,0,256]){g.beginPath();g.ellipse(x+dx,y,r*1.3,r,0,0,Math.PI*2);g.fill();}}
  const t=new THREE.CanvasTexture(c);t.wrapS=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t;
}
function beltTexture(){
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const g=canvas.getContext('2d');
  g.fillStyle='#8f9a78';g.fillRect(0,0,64,64);g.fillStyle='#7c8a69';g.fillRect(0,56,64,8);g.fillStyle='#a3ad8c';g.fillRect(0,0,64,3);
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;texture.repeat.set(1,R+4);return texture;
}
const randomLook=color=>({color,orig:color,rotT:1,rotY:Math.random()*Math.PI*2,tiltX:(Math.random()-.5)*.36,tiltZ:(Math.random()-.5)*.36,scale:.95+Math.random()*.09,shade:.9+Math.random()*.16,off:0,vel:0,wait:0,wob:0,wobT:0});

export function mountAppleConveyor(root,{initial,onMilestone=()=>{},storageKey='guest'}={}){
  let state=initial||newConveyor(),leaving=null,paused=false,disposed=false,raf=0,last=performance.now(),milestone=false,best=0,selection=new Set(),cursor=-1,overAt=0,overlayShown=false;
  let slots=[],spills=[],inFlight={green:0,red:0,orange:0,yellow:0},hauledAt=0;
  const bestKey='trottville-apple-best-v1:'+storageKey;try{best=Math.max(0,Number(localStorage.getItem(bestKey))||0);}catch{}
  // Shared leaderboard: posted at each shift end, on game over and when a scored run is left or restarted.
  const scores=createScoreRun('appleoosa');scores.start();
  const scored=()=>state.collected>0||state.score!==0;
  function postScore(final){if(scores.posted||!scored())return;scores.submit(state.score,{shift:state.shift,collected:state.collected,delivered:state.delivered||0,dropped:state.dropped||0,bundle:state.best||0},{final}).then(()=>{if(!disposed)paintStats();});}
  // Phone-first, portrait: the belt runs the full height on the left with the basket column beside it on the right.
  // Pulling the lever (or pausing) slides the belt off to the left while the yard camera pans right to the truck,
  // then it all slides back when the belt restarts.
  root.innerHTML=`<div class="apple-game">
    <div class="apple-yard" id="apple-yard" aria-label="Apple baskets and farm truck"></div>
    <div class="apple-slide" id="apple-slide"><div class="apple-play"><div class="apple-rig"><div class="apple-machine"><div class="apple-stage" id="apple-stage" style="--ratio:${STAGE_ASPECT}"><div class="apple-limit"><span>KEEP BELOW THIS LINE</span></div></div></div><div class="apple-rail"><div class="apple-shaker" id="apple-shaker" role="button" tabindex="0" aria-label="Belt handle"><i></i></div><button class="apple-lever" id="apple-valve" data-belt="on" aria-label="Belt lever, on"><i class="apple-lever-plate" aria-hidden="true"><em>ON</em><em>OFF</em></i><i class="apple-lever-arm" aria-hidden="true"></i></button></div></div></div></div>
    <div class="apple-top"><button class="apple-pause" id="apple-pause" aria-label="Pause"><i></i><i></i></button><b class="apple-score" id="apple-score">0</b><div class="apple-clock"><span id="apple-sky" data-phase="sunrise">Sunrise</span><b id="apple-time">2:30</b></div></div>
    <div class="apple-break" id="apple-break" hidden><i></i></div>
    <div class="apple-feedback" id="apple-feedback" role="status" aria-live="polite"></div>
    <div class="apple-overlay" id="apple-overlay" hidden></div>
    <div class="apple-rotate" aria-hidden="true"><b>↻</b><span>Turn your phone upright to play</span></div></div>`;
  const $=s=>root.querySelector(s),game=$('.apple-game'),stage=$('#apple-stage'),overlay=$('#apple-overlay'),slide=$('#apple-slide'),play=$('.apple-play'),limit=$('.apple-limit');let reveal=0,unitPx=24;

  let renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}
  catch{stage.insertAdjacentHTML('beforeend','<p class="apple-nogl">This game needs 3D graphics (WebGL), which this browser has turned off.</p>');return {dispose(){}};}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const canvas=renderer.domElement;canvas.className='apple-canvas';canvas.tabIndex=0;canvas.setAttribute('role','application');canvas.setAttribute('aria-label',`Appleoosa belt, ${C} columns and ${R} rows. Arrow keys move, Enter picks a bundle.`);stage.prepend(canvas);
  const pt=(c,at)=>{const g=game.getBoundingClientRect();return {x:at.x-g.left,y:at.y-g.top};};
  const yard=createYard($('#apple-yard'),{canDrag:()=>!paused&&!state.over&&!state.shiftOver&&state.belt!=='on',focus:yardFocus,
    onSquirrel(id,at){state=squirrelTakes(state,id);popup(pt(null,{x:Math.max(40,Math.min(innerWidth-40,at.x)),y:at.y}),'Squirrel!','loss');paintStats();},
    onSpill(color,n,at){const before=state.score;state=dropFromBasket(state,color,n);popup(pt(color,at),'−'+(before-state.score).toLocaleString(),'loss');paintStats();return state.lastDrop?.ids||[];},
    onRecover(id,at){const before=state.score;state=recoverApple(state,id);if(state.score!==before)popup(pt(null,at),'+'+(state.score-before).toLocaleString()+' back','bank');storeBest();paintStats();},
    onDeliver(color,n,at,{clean}={}){hauledAt=performance.now();state=deliverBasket(state,color,n,{clean});storeBest();checkMilestone();popup(pt(color,at),'+'+(n*TRUCK_BONUS).toLocaleString()+' loaded','bank');if(state.lastHaul){const p=pt(color,at);setTimeout(()=>{if(!disposed)popup({x:p.x,y:p.y-34},'Clean haul! +'+state.lastHaul,'bank haul');},280);}paintStats();}});

  const scene=new THREE.Scene();scene.background=new THREE.Color('#5d8f3e');
  const camera=new THREE.PerspectiveCamera(FOV,STAGE_ASPECT,1,400);camera.up.set(0,0,-1);
  const hemi=new THREE.HemisphereLight('#fff6df','#6d5a3d',1.5);scene.add(hemi);const HEMI_SKY=new THREE.Color('#fff6df'),HEMI_GROUND=new THREE.Color('#6d5a3d'),SUN_COLOR=new THREE.Color('#fff3d6');
  const sun=new THREE.DirectionalLight('#fff3d6',2.3);sun.position.set(C/2-6,30,R/2+8);sun.target.position.set(C/2,0,R/2);sun.castShadow=true;sun.shadow.mapSize.set(1024,2048);
  Object.assign(sun.shadow.camera,{left:-9,right:9,top:17,bottom:-17,near:5,far:70});sun.shadow.bias=-.0015;sun.shadow.radius=3;scene.add(sun,sun.target);
  const disposables=[];const keep=x=>(disposables.push(x),x);

  // Belt, rails, end roller and the barn floor the apples spill onto.
  const texture=keep(beltTexture());
  const belt=new THREE.Mesh(keep(new THREE.PlaneGeometry(C+.2,R+4)),keep(new THREE.MeshStandardMaterial({map:texture,roughness:.95})));belt.rotation.x=-Math.PI/2;belt.position.set(C/2,0,LIP+(R+4)/2);belt.receiveShadow=true;scene.add(belt);
  const wood=keep(new THREE.MeshStandardMaterial({color:'#b89a6c',roughness:.8}));
  for(const x of [-.32,C+.32]){const rail=new THREE.Mesh(keep(new THREE.BoxGeometry(.3,.5,R+4)),wood);rail.position.set(x,.2,LIP+(R+4)/2-.2);rail.castShadow=rail.receiveShadow=true;scene.add(rail);}
  const roller=new THREE.Mesh(keep(new THREE.CylinderGeometry(.22,.22,C+.5,20)),keep(new THREE.MeshStandardMaterial({color:'#6f7a5c',roughness:.6,metalness:.2})));roller.rotation.z=Math.PI/2;roller.position.set(C/2,-.2,LIP);roller.receiveShadow=true;scene.add(roller);
  // Under the spill end: the compost bin, so dropped and spilled apples land somewhere real.
  const floor=new THREE.Mesh(keep(new THREE.PlaneGeometry(40,20)),keep(new THREE.MeshStandardMaterial({color:'#5a3f27',roughness:1})));floor.rotation.x=-Math.PI/2;floor.position.set(C/2,-3,LIP-8);floor.receiveShadow=true;scene.add(floor);
  const plank=keep(new THREE.MeshStandardMaterial({color:'#7d6346',roughness:.9,flatShading:true})),slat=(w,h,d,x,y,z)=>{const b=new THREE.Mesh(keep(new THREE.BoxGeometry(w,h,d)),plank);b.position.set(x,y,z);b.castShadow=b.receiveShadow=true;scene.add(b);};
  slat(C+1.6,.3,.3,C/2,-1.7,TOP-.2);for(let k=0;k<6;k++)slat(.5,.1,1.1,(k+.5)*C/6,-2.92,TOP+.5+(k%2)*.3);
  // Beyond the near end: the picker bin, heaped with fresh apples, feeding new rows onto the belt.
  {const binZ=R+.75,depth=6;slat(C+1.1,.7,.32,C/2,.5,binZ);for(const x of [-.55,C+.55])slat(.32,.7,depth,x,.5,binZ+depth/2);
    const n=C*12,heap=new THREE.InstancedMesh(appleParts().map(keep)[0],keep(new THREE.MeshPhysicalMaterial({roughness:.5,clearcoat:.2})),n),hm=new THREE.Matrix4(),hq=new THREE.Quaternion(),he=new THREE.Euler(),hv=new THREE.Vector3(),hs=new THREE.Vector3(),hc=new THREE.Color();
    for(let k=0;k<n;k++){const layer=k%2,x=(Math.floor(k/2)%C)+.5+layer*.5+(Math.random()-.5)*.25,z=binZ+.65+Math.floor(k/(2*C))*.9+layer*.45+(Math.random()-.5)*.2;he.set((Math.random()-.5)*.8,Math.random()*6.3,(Math.random()-.5)*.8);hq.setFromEuler(he);hs.setScalar(.9+Math.random()*.12);
      hm.compose(hv.set(Math.min(C-.1,x),layer*.32-.05,z),hq,hs);heap.setMatrixAt(k,hm);heap.setColorAt(k,hc.set(TINTS[APPLE_COLORS[Math.floor(Math.random()*4)]]).multiplyScalar(.82+Math.random()*.12));}
    heap.castShadow=heap.receiveShadow=true;scene.add(heap);}
  const line=new THREE.Mesh(keep(new THREE.PlaneGeometry(C+.1,.07)),keep(new THREE.MeshBasicMaterial({color:'#c4564a',transparent:true,opacity:.75})));line.rotation.x=-Math.PI/2;line.position.set(C/2,.012,0);scene.add(line);

  // Apples: three instanced meshes (body, stem, leaf) share one transform per apple.
  const MAX=C*(R+1)+C*2;
  const [bodyGeo,stemGeo,leafGeo]=appleParts().map(keep);
  const bodies=new THREE.InstancedMesh(bodyGeo,keep(new THREE.MeshPhysicalMaterial({roughness:.42,clearcoat:.35,clearcoatRoughness:.4})),MAX);
  const stems=new THREE.InstancedMesh(stemGeo,keep(new THREE.MeshStandardMaterial({color:'#6b4f31',roughness:.9})),MAX);
  const leaves=new THREE.InstancedMesh(leafGeo,keep(new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.7,side:THREE.DoubleSide})),MAX);
  // Rotten apples use their own body mesh with a bruise texture; the colour still fades from fresh to brown as rot sets in.
  const rotBodies=new THREE.InstancedMesh(bodyGeo,keep(new THREE.MeshStandardMaterial({map:keep(bruiseTexture()),roughness:.85})),MAX);
  // Flies: a couple of 1-pixel specks circling each rotten apple.
  const FLIES=2,flyPos=new Float32Array((MAX+1)*FLIES*3),flyGeo=keep(new THREE.BufferGeometry());flyGeo.setAttribute('position',new THREE.BufferAttribute(flyPos,3));
  const flies=new THREE.Points(flyGeo,keep(new THREE.PointsMaterial({color:'#1e1a14',size:Math.max(2,1.4*(devicePixelRatio||1)),sizeAttenuation:false})));flies.frustumCulled=false;scene.add(flies);let clock=0;
  for(const mesh of [bodies,stems,leaves,rotBodies]){mesh.castShadow=true;mesh.receiveShadow=mesh===bodies||mesh===rotBodies;mesh.frustumCulled=false;scene.add(mesh);}
  const base=Object.fromEntries([...APPLE_COLORS.map(c=>[c,new THREE.Color(TINTS[c])]),[ROTTEN,new THREE.Color('#8a5d36')]]),leafFresh=new THREE.Color('#5f8f3e'),leafRot=new THREE.Color('#6a5630'),white=new THREE.Color('#fffbe8'),tmpColor=new THREE.Color(),m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(0,0,0,'YXZ'),p=new THREE.Vector3(),sc=new THREE.Vector3();

  function rebuildSlots(){slots=state.board.concat(state.next).map(c=>c?randomLook(c):null);spills=[];}
  const cellX=i=>i%C+.5,cellZ=i=>Math.floor(i/C)+.5;
  let nAll=0,nRot=0;
  function place(look,x,y,z,extraTilt=0,glow=0){
    e.set(look.tiltX+extraTilt,look.rotY,look.tiltZ);q.setFromEuler(e);p.set(x,y,z);sc.setScalar(look.scale);m.compose(p,q,sc);
    stems.setMatrixAt(nAll,m);leaves.setMatrixAt(nAll,m);
    const rotten=look.color===ROTTEN,t=rotten?Math.min(1,look.rotT):0;
    tmpColor.copy(base[look.orig]).lerp(base[look.color],t*t*(3-2*t)).multiplyScalar(look.shade);if(glow)tmpColor.lerp(white,glow);
    if(rotten){rotBodies.setMatrixAt(nRot,m);rotBodies.setColorAt(nRot++,tmpColor);if(t>=1)for(let f=0;f<FLIES;f++){const k=nRot*FLIES+f,a=clock*(5+f*2.3)+look.rotY*3+f*2.1;flyPos.set([x+Math.cos(a)*(.42+.12*Math.sin(clock*3+f)),y+.75+.25*Math.sin(clock*7+f*4+look.rotY),z+Math.sin(a*1.3)*(.42+.1*Math.cos(clock*2+f))],k*3);}}
    else{bodies.setMatrixAt(nAll-nRot,m);bodies.setColorAt(nAll-nRot,tmpColor);}
    leaves.setColorAt(nAll,tmpColor.copy(leafFresh).lerp(leafRot,t));nAll++;
  }
  function draw(){
    nAll=0;nRot=0;flyPos.fill(-999);
    slots.forEach((look,i)=>{if(!look)return;if(held&&held.moved&&i===held.i){place(look,held.x,.9,held.z,0,.12);return;}const lifted=selection.has(i);place(look,cellX(i)+(look.offX||0),lifted?.1:0,cellZ(i)+look.off-state.progress,look.wob*Math.sin(look.wobT*26),lifted?.32:0);});
    for(const s of spills)place(s.look,s.x,s.y,s.z,s.spin);
    for(const mesh of [stems,leaves]){mesh.count=nAll;mesh.instanceMatrix.needsUpdate=true;}bodies.count=nAll-nRot;rotBodies.count=nRot;
    for(const mesh of [bodies,rotBodies,leaves]){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
    flyGeo.setDrawRange(FLIES,nRot*FLIES);flyGeo.attributes.position.needsUpdate=true;
    texture.offset.y=1-(state.rowsAdded+state.progress)%1;roller.rotation.x=-(state.rowsAdded+state.progress)*2.2;
    renderer.render(scene,camera);
  }
  // Gravity: each apple falls from its old cell, bounces a little, and always comes to rest exactly on its grid cell.
  function simulate(dt){
    clock+=dt;
    for(const look of slots){if(!look)continue;if(look.rotT<1)look.rotT+=dt/1.6;if(look.offX){look.offX*=Math.exp(-dt*11);if(Math.abs(look.offX)<.01)look.offX=0;}
      if(look.off<0||look.vel){if(look.wait>0){look.wait-=dt;continue;}look.vel+=G*dt;look.off+=look.vel*dt;if(look.off>=0){look.off=0;if(look.vel>3){look.wob=Math.min(.35,look.vel*.025);look.wobT=0;look.vel=-look.vel*.2;}else look.vel=0;}}
      if(look.wob){look.wobT+=dt;look.wob*=Math.exp(-dt*7);if(look.wob<.004)look.wob=0;}}
    for(const s of spills){s.z+=s.vz*dt;if(s.z<LIP-.1||s.y<0){s.vy-=22*dt;s.vz*=Math.exp(-dt*.6);}s.y+=s.vy*dt;s.spin+=s.vs*dt;if(s.y<-3+CENTER_Y*.6){s.y=-3+CENTER_Y*.6;s.vy=Math.abs(s.vy)>2?-s.vy*.3:0;s.vz*=.5;s.vs*=.6;}}
  }

  // The belt fills the stage's width with the spill end at the top; any spare height below shows the picker bin feeding it.
  function fit(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;const t=Math.tan(THREE.MathUtils.degToRad(FOV/2)),halfH=Math.max((BOTTOM-TOP)/2,(RIGHT-LEFT)/2/camera.aspect),d=halfH/t,cz=TOP+halfH;
    camera.position.set((LEFT+RIGHT)/2,CENTER_Y+d,cz);camera.lookAt((LEFT+RIGHT)/2,0,cz);camera.updateProjectionMatrix();unitPx=h/(2*halfH);p.set(C/2,CENTER_Y,0).project(camera);limit.style.top=((1-p.y)/2*100).toFixed(2)+'%';draw();}
  const resize=new ResizeObserver(fit);resize.observe(stage);

  // Picking: the ray meets the plane through apple centres, then snaps to the grid.
  const ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),-CENTER_Y),hit=new THREE.Vector3(),ndc=new THREE.Vector2();
  function cellAt(event){const r=canvas.getBoundingClientRect();ndc.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);if(!ray.ray.intersectPlane(plane,hit))return -1;const col=Math.floor(hit.x),row=Math.floor(hit.z+state.progress);return col>=0&&col<C&&row>=0&&row<R?row*C+col:-1;}
  function highlight(index){const group=index>=0?appleGroup(state.board,index):[];selection=new Set(group.length>=2?group:index>=0&&state.board[index]&&cursor===index?[index]:[]);}
  function toScreen(x,z){const r=canvas.getBoundingClientRect(),g=game.getBoundingClientRect();p.set(x,CENTER_Y,z).project(camera);return {x:r.left-g.left+(p.x+1)/2*r.width,y:r.top-g.top+(1-p.y)/2*r.height};}

  // A picked bundle hops off the belt and drops into its basket; baskets count apples as they land.
  function flyToBasket(cells,color,groundIds=[]){const overflow=groundIds.length;
    const g=game.getBoundingClientRect(),size=unitPx*1.12,mouth=yard.mouth(color),endSize=yard.appleSize();
    const end={x:mouth.x-g.left,y:mouth.y-g.top};let cx=0,cy=0;
    [...cells].sort((a,c)=>c-a).forEach((i,k)=>{const look=slots[i],start=toScreen(cellX(i),cellZ(i)-state.progress);cx+=start.x;cy+=start.y;const bounces=k>=cells.length-overflow;
      const el=document.createElement('div');el.className='apple-flyer';el.innerHTML=appleSVG(color);Object.assign(el.style,{width:size+'px',height:size+'px',left:-size/2+'px',top:-size/2+'px'});game.appendChild(el);
      const hop=30+Math.random()*30,spin=(look?look.rotY*57:0),turn=spin+(Math.random()-.5)*540,shrink=Math.min(1,endSize/size),frames=[];
      for(let s=0;s<=14;s++){const t=s/14,x=start.x+(end.x-start.x)*t,y=start.y+(end.y-start.y)*t*t-hop*4*t*(1-t)*.9;frames.push({transform:`translate(${x}px,${y}px) rotate(${spin+(turn-spin)*t}deg) scale(${1+(shrink-1)*t})`,opacity:t>.95?0:1});}
      inFlight[color]++;
      const anim=el.animate(frames,{duration:620+Math.hypot(end.x-start.x,end.y-start.y)*.5,delay:k*28,easing:'cubic-bezier(.35,0,.6,1)',fill:'both'});
      anim.onfinish=()=>{el.remove();if(disposed)return;inFlight[color]--;if(bounces){yard.bounce(color,groundIds[k-(cells.length-overflow)]);return;}if(!yard.land(color)){state=dropFromBasket(state,color,1);yard.bounce(color,state.lastDrop?.ids?.[0]);paintStats();}};
    });
    return {x:cx/cells.length,y:cy/cells.length};
  }
  // Rotten bundles don't go in a basket: they puff away to the compost.
  function compost(cells){const size=unitPx*1.12;let cx=0,cy=0;
    cells.forEach((i,k)=>{const start=toScreen(cellX(i),cellZ(i)-state.progress);cx+=start.x;cy+=start.y;const el=document.createElement('div');el.className='apple-flyer';el.innerHTML=appleSVG(ROTTEN);Object.assign(el.style,{width:size+'px',height:size+'px',left:-size/2+'px',top:-size/2+'px'});game.appendChild(el);
      const drift=(Math.random()-.5)*30;el.animate([{transform:`translate(${start.x}px,${start.y}px) scale(1)`,opacity:1,filter:'none'},{transform:`translate(${start.x+drift*.3}px,${start.y-6}px) scale(1.18)`,opacity:1,offset:.3},{transform:`translate(${start.x+drift}px,${start.y-26}px) scale(.2) rotate(${drift*6}deg)`,opacity:0,filter:'blur(2px)'}],{duration:620,delay:k*18,easing:'ease-out',fill:'both'}).onfinish=()=>el.remove();});
    return {x:cx/cells.length,y:cy/cells.length};}
  function popup(at,text,kind=''){const el=document.createElement('div');el.className='apple-points '+kind;el.textContent=text;Object.assign(el.style,{left:at.x+'px',top:at.y+'px'});game.appendChild(el);el.addEventListener('animationend',()=>el.remove());}
  function pointsPopup(at,last){const el=document.createElement('div');el.className='apple-points'+(last.points<0?' loss':last.count>=25?' massive':last.count>=10?' huge':'');el.textContent=(last.points<0?'−':'+')+Math.abs(last.points).toLocaleString();Object.assign(el.style,{left:at.x+'px',top:at.y+'px'});game.appendChild(el);el.addEventListener('animationend',()=>el.remove());}

  function collect(index){
    if(paused||state.over||state.shiftOver||index<0)return;const before=state;state=collectApples(state,index);const lastPick=state.last;if(!lastPick){paintStats();return;}
    const at=lastPick.rotten?compost(lastPick.cells):flyToBasket(lastPick.cells,lastPick.color,lastPick.groundIds);pointsPopup(at,lastPick);if(lastPick.overflow)setTimeout(()=>{if(!disposed){const mo=yard.mouth(lastPick.color),g=game.getBoundingClientRect();popup({x:mo.x-g.left,y:mo.y-g.top},'−'+lastPick.penalty.toLocaleString(),'loss');}},700);
    settle(lastPick.cells,lastPick.moves);selection=new Set();storeBest();checkMilestone(before);paintStats();
  }
  // Apples above cleared cells fall to their new cells, the lowest landing first.
  function settle(cells,moves){for(const i of cells)slots[i]=null;
    const next=slots.slice(),lowest={};for(const {from}of moves)next[from]=null;
    for(const {to}of moves){const col=to%C;lowest[col]=Math.max(lowest[col]??-1,Math.floor(to/C));}
    for(const {from,to}of moves){const look=slots[from];if(!look)continue;const rows=Math.floor(to/C)-Math.floor(from/C);look.off-=rows;look.wait=Math.max(look.wait,(lowest[to%C]-Math.floor(to/C))*.035);next[to]=look;}
    slots=next;}
  // Dragging: a lone apple on top of its column lifts onto another column's top; a lone rotten apple is dragged off the belt.
  let held=null,skipClickUntil=0;
  function planeAt(event){const r=canvas.getBoundingClientRect();ndc.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);return ray.ray.intersectPlane(plane,hit)?{x:hit.x,z:hit.z}:null;}
  function grabApple(event){if(paused||state.over||state.shiftOver||held)return;const i=cellAt(event);if(i<0||!slots[i])return;const kind=isLoneTop(state.board,i)?'move':isLoneRot(state.board,i)?'rot':null;if(!kind)return;
    held={i,kind,look:slots[i],id:event.pointerId,sx:event.clientX,sy:event.clientY,moved:false,x:cellX(i),z:cellZ(i)-state.progress};try{canvas.setPointerCapture(event.pointerId);}catch{}}
  function dragApple(event){if(!held||event.pointerId!==held.id)return;if(!held.moved&&Math.hypot(event.clientX-held.sx,event.clientY-held.sy)>8){held.moved=true;selection=new Set();}if(!held.moved)return;const w=planeAt(event);if(w){held.x=w.x;held.z=w.z;}}
  function dropApple(event){if(!held||event.pointerId!==held.id)return;const h=held;held=null;if(!h.moved)return;skipClickUntil=performance.now()+400;
    if(slots[h.i]!==h.look||paused||state.over||state.shiftOver)return;
    if(h.kind==='move'){state=moveApple(state,h.i,Math.floor(h.x));const mv=state.moved;if(mv&&mv.from===h.i){const look=slots[mv.from];slots[mv.from]=null;slots[mv.to]=look;look.offX=h.x-cellX(mv.to);look.off=Math.min(0,h.z+state.progress-cellZ(mv.to));look.vel=0;look.wait=0;state={...state,moved:null};}paintStats();return;}
    const off=h.x<-.15||h.x>C+.15||h.z<-.3||h.z+state.progress>R+.3;if(!off)return;
    state=flickRot(state,h.i);const fl=state.flick;if(!fl||fl.index!==h.i)return;state={...state,flick:null};
    const at=toScreen(h.x,h.z);puff(at);popup({x:at.x,y:at.y-20},`Caught early! +${FLICK_BONUS}`,'bank');settle([h.i],fl.moves);storeBest();checkMilestone();paintStats();}
  function puff(start){const size=unitPx*1.12,el=document.createElement('div');el.className='apple-flyer';el.innerHTML=appleSVG(ROTTEN);Object.assign(el.style,{width:size+'px',height:size+'px',left:-size/2+'px',top:-size/2+'px'});game.appendChild(el);
    el.animate([{transform:`translate(${start.x}px,${start.y}px) scale(1.1)`,opacity:1},{transform:`translate(${start.x}px,${start.y-24}px) scale(.2) rotate(140deg)`,opacity:0,filter:'blur(2px)'}],{duration:520,easing:'ease-out',fill:'both'}).onfinish=()=>el.remove();}
  function onPush(){const top=slots.slice(0,C);if(held){held.i-=C;if(held.i<0)held=null;}slots=slots.slice(C).concat(state.next.map(randomLook));for(let i=0;i<C*R;i++){const look=slots[i];if(look&&state.board[i]===ROTTEN&&look.color!==ROTTEN){look.orig=look.color;look.color=ROTTEN;look.rotT=0;}}
    if(state.over){top.forEach((look,col)=>{if(look)spills.push({look,x:col+.5,z:LIP+.3,y:0,vz:-3.2-Math.random(),vy:1.5+Math.random()*1.5,spin:0,vs:(Math.random()-.5)*14});});overAt=performance.now();selection=new Set();}}

  function storeBest(){if(state.score>best){best=state.score;try{localStorage.setItem(bestKey,String(best));}catch{}}}
  function checkMilestone(){if(!milestone&&state.score>=500){milestone=true;state={...state,message:state.message+' · Barn activity complete!'};onMilestone();}}
  // Only the score and the clock while playing; everything else waits for the end of the run.
  const leaveTo=sel=>()=>root.closest('dialog')?.querySelector(sel)?.click();
  function paintStats(){
    $('#apple-score').textContent=state.score.toLocaleString();$('#apple-feedback').textContent=state.message;paintClock();paintValve();$('#apple-pause').disabled=state.over;
    const showOver=state.over&&overlayShown,showShift=state.shiftOver&&!state.over;overlay.hidden=!paused&&!showOver&&!leaving&&!showShift;
    const banked=()=>APPLE_COLORS.reduce((n,c)=>n+state.baskets[c].length,0);
    if(leaving&&!showOver){overlay.className='apple-overlay card';overlay.innerHTML=`<b>Leave this belt?</b><span>Your run ends here with ${state.score.toLocaleString()} points.</span><div class="apple-overlay-actions"><button class="primary" id="apple-stay">Keep playing</button><button class="secondary" id="apple-leave">Leave</button></div>`;overlay.querySelector('#apple-stay').onclick=()=>{leaving=null;togglePause();};overlay.querySelector('#apple-leave').onclick=()=>{const go=leaving;leaving=null;go();};return;}
    if(showShift){const left=banked()+(state.ground||[]).length,next=state.shift+1,newDay=shiftInDay(next)===1;overlay.className='apple-overlay shift';
      overlay.innerHTML=`<small>DAY ${dayOf(state.shift)} · ${PHASE_NAMES[phaseOf(state.shift)].toUpperCase()} COMPLETE</small><b>${newDay?'What a day!':'Clock out!'}</b>${state.spotless?`<span class="apple-spotless">Spotless shift! Not one apple dropped · +${SPOTLESS_BONUS.toLocaleString()}</span>`:''}<strong>${(state.score-state.shiftStart).toLocaleString()}<em>points this shift</em></strong>${left?`<span>${left} apples weren't on the truck</span>`:''}${leaderboardHtml(scores,{title:'Appleoosa leaderboard'})}<button class="primary" id="apple-next-shift">${newDay?`Start day ${dayOf(next)} · sunrise`:`Start ${PHASE_NAMES[phaseOf(next)].toLowerCase()}`}</button>`;overlay.querySelector('button').onclick=nextShift;return;}
    if(showOver){overlay.className='apple-overlay lost';const rows=[['Day',`${dayOf(state.shift)} · ${PHASE_NAMES[phaseOf(state.shift)]}`],['Apples picked',state.collected],['Biggest bundle',state.best||0],['On the truck',state.delivered],['Composted',state.composted||0],['Rotten caught early',state.flicked||0],['Clean hauls',state.cleanHauls||0],['Spotless shifts',state.spotlessShifts||0],['Dropped',state.dropped],['Rescued from the grass',state.recovered||0],['Taken by squirrels',state.stolen||0],['Device best',Math.max(best,state.score).toLocaleString()]];
      overlay.innerHTML=`<small>GAME OVER</small><b>You lose!</b><span>The apples spilled off the belt.</span><strong>${state.score.toLocaleString()}<em>total points</em></strong><dl class="apple-tally">${rows.map(([k,v])=>`<div><dt>${k}</dt><dd>${typeof v==='number'?v.toLocaleString():v}</dd></div>`).join('')}</dl>${leaderboardHtml(scores,{title:'Appleoosa leaderboard'})}<div class="apple-overlay-actions"><button class="primary" id="apple-again">Try a fresh belt</button><button class="secondary" id="apple-other">Other barn games</button></div>`;
      overlay.querySelector('#apple-again').onclick=restart;overlay.querySelector('#apple-other').onclick=leaveTo('#other');return;}
    if(paused){overlay.className='apple-overlay pause';overlay.innerHTML=`<b>Paused</b><div class="apple-overlay-actions"><button class="primary" id="apple-resume">Resume</button><button class="secondary" id="apple-new">New belt</button><button class="secondary" id="apple-other">Other games</button><button class="secondary" id="apple-quit">Leave</button></div><span>Tap Freckles for tips.</span>`;
      overlay.querySelector('#apple-resume').onclick=togglePause;overlay.querySelector('#apple-new').onclick=restart;overlay.querySelector('#apple-other').onclick=leaveTo('#other');overlay.querySelector('#apple-quit').onclick=leaveTo('[data-close]');}
  }
  let clockText='';
  function paintClock(){const sec=Math.ceil(Math.max(0,state.shiftLeft)/1000),text=`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`,ph=phaseOf(state.shift);if(text!==clockText){clockText=text;$('#apple-time').textContent=text;const clock=$('.apple-clock');clock.classList.toggle('late',sec<=20);clock.classList.toggle('urgent',sec<=10);}
    // The whole screen flashes red at the edges in the last 20 seconds, faster and stronger in the last 10.
    const live=!paused&&!state.over&&!state.shiftOver;game.classList.toggle('late',live&&sec<=20);game.classList.toggle('urgent',live&&sec<=10);
    const sky=$('#apple-sky');if(sky.dataset.phase!==ph||sky.dataset.day!==String(dayOf(state.shift))){sky.dataset.phase=ph;sky.dataset.day=String(dayOf(state.shift));sky.textContent=`Day ${dayOf(state.shift)} · ${PHASE_NAMES[ph]}`;}}
  function paintValve(){const v=$('#apple-valve');v.dataset.belt=state.belt;v.disabled=state.over||state.shiftOver;v.setAttribute('aria-label',state.belt==='on'?'Belt lever, on':'Belt lever, off');}
  function valve(){if(paused||state.over||state.shiftOver)return;state=toggleBelt(state);paintStats();}
  function nextShift(){state=startShift(state);yard.setPhase(phaseOf(state.shift));inFlight={green:0,red:0,orange:0,yellow:0};yard.reset();game.querySelectorAll('.apple-flyer,.apple-points').forEach(el=>el.remove());rebuildSlots();last=performance.now();paintStats();canvas.focus({preventScroll:true});}
  // Shake handle: each change of direction while wiggling is one shake; tall columns tumble onto lower neighbours.
  const shaker=$('#apple-shaker'),machine=$('.apple-machine');let shakeGrip=null,lastShake=0,jiggle=0;
  function shake(dir=1){const now=performance.now();if(paused||state.over||state.shiftOver||now-lastShake<70)return;lastShake=now;
    machine.style.transform=`translate(${dir*3}px,${(Math.random()-.5)*2}px) rotate(${dir*.25}deg)`;clearTimeout(jiggle);jiggle=setTimeout(()=>machine.style.transform='',90);
    for(const look of slots)if(look&&Math.random()<.35){look.wob=Math.max(look.wob,.12);look.wobT=Math.random();}
    state=shakeBelt(state,Math.random,1);
    for(const {from,to}of state.shook||[]){const look=slots[from];if(!look)continue;slots[from]=null;slots[to]=look;look.offX=(from%C)-(to%C);look.off+=Math.floor(from/C)-Math.floor(to/C);look.vel=0;look.wait=0;}}
  shaker.addEventListener('pointerdown',event=>{event.preventDefault();try{shaker.setPointerCapture(event.pointerId);}catch{}shakeGrip={id:event.pointerId,x:event.clientX,dir:0,travel:0};shaker.classList.add('held');});
  shaker.addEventListener('pointermove',event=>{if(!shakeGrip||event.pointerId!==shakeGrip.id)return;const dx=event.clientX-shakeGrip.x;shakeGrip.x=event.clientX;if(!dx)return;const dir=Math.sign(dx);shaker.style.transform=`translateX(${Math.max(-6,Math.min(6,(shaker._x=(shaker._x||0)*.6+dx)))}px)`;if(dir!==shakeGrip.dir){if(shakeGrip.travel>5)shake(dir);shakeGrip.dir=dir;shakeGrip.travel=0;}shakeGrip.travel+=Math.abs(dx);});
  const letGo=()=>{shakeGrip=null;shaker.classList.remove('held');shaker.style.transform='';shaker._x=0;};shaker.addEventListener('pointerup',letGo);shaker.addEventListener('pointercancel',letGo);
  shaker.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();shake(Math.random()<.5?-1:1);}});
  $('#apple-valve').onclick=valve;
  root.addEventListener('keydown',event=>{if(event.target.closest('input,textarea'))return;if(event.key==='v'||event.key==='V'){event.preventDefault();valve();}else if(event.key==='s'||event.key==='S'){event.preventDefault();shake(Math.random()<.5?-1:1);}});
  // Freckles keeps the rules: click her for a tip; the shake handle stays a hint, for players to discover.
  const TIPS=["Hi, I'm Freckles! Tap 2 or more touching apples of the same colour to pick them.",
    "Bigger bundles are worth way more! A pair scores nothing, 4 apples is 80, but 25 is 3,125. Clear the other colours so one colour joins up.",
    "A lone apple sitting on top of its stack? Drag it onto another column to help a colour join up.",
    "Pull the lever and the belt rolls one more row, then rests 5 seconds. That's your chance to carry baskets over to the truck!",
    "Watch the baskets beside the belt: white is empty, green is easy, orange is tall, red is wobbly-danger! A basket holds 50.",
    "Green and orange baskets never spill. Red ones wobble and drop apples, so haul them before they turn red!",
    "Get a basket of 5 or more to the truck without dropping a single apple for a clean-haul bonus. Lots of quick trips pay best!",
    "Every dropped apple costs 50 points. Drag them off the grass into the truck to win the points back… if nobody else gets them first.",
    "Rotten apples spread to their neighbours, twice as fast while the belt rests. Clearing a bunch costs 10 points each, but drag a lone rotten apple off the belt and you get a bonus!",
    "At night a raccoon wanders the yard. Steer your basket around it, or tap it to shoo it away.",
    "Empty every basket and the belt starts again right away. No waiting!",
    "Finish a whole shift without dropping a single apple and you get a giant bonus. Spotless!",
    "A day has four shifts: sunrise, noon, sunset and night. Each one is trickier, but every new day starts gentle again.",
    "When the edges get too tall… sometimes a machine just needs a good jiggle. Hee hee."];
  let tip=-1,bubbleTimer=0;const bubble=document.createElement('div');bubble.className='apple-bubble';bubble.setAttribute('role','status');bubble.hidden=true;game.appendChild(bubble);
  // Today's guest horse (a breed most players can't afford yet) introduces itself when tapped.
  const g=yard.guest,coinsText=g.coins.toLocaleString('en-US'),article=/^[AEIOU]/i.test(g.breed)?'an':'a';
  const GUEST=[`Hi! I'm ${g.name}, ${article} ${g.breed} from ${g.origin}. I'm visiting the orchard today.`,`Did you know? ${g.fact}`,`${article[0].toUpperCase()+article.slice(1)} ${g.breed} like me costs about ${coinsText} Trotties at the horse market. Look me up in the Breed guide!`];
  let speaker='horse',guestLine=-1;
  function say(text,{auto=0,who='horse'}={}){speaker=who;bubble.innerHTML=`<p>${text}</p>${auto?'':who==='guest'?`<small>${guestLine+1}/${GUEST.length} · tap ${g.name} for more</small>`:`<small>${tip+1}/${TIPS.length} · tap Freckles for more</small>`}<button class="apple-bubble-close" aria-label="Close">×</button>`;bubble.hidden=false;bubble.querySelector('button').onclick=()=>{bubble.hidden=true;};clearTimeout(bubbleTimer);if(auto)bubbleTimer=setTimeout(()=>{bubble.hidden=true;},auto);}
  yard.onHorse(()=>{tip=(tip+1)%TIPS.length;say(TIPS[tip]);yard.react('cheer');});
  yard.onGuest(()=>{guestLine=(guestLine+1)%GUEST.length;say(GUEST[guestLine],{who:'guest'});});
  const hintKey='trottville-appleoosa-freckles-hint-v1';let hinted=true;try{hinted=!!localStorage.getItem(hintKey);}catch{}
  function firstPeek(){if(hinted)return;hinted=true;try{localStorage.setItem(hintKey,'1');}catch{}setTimeout(()=>{if(!disposed&&bubble.hidden&&reveal>.9)say('Psst! Tap me for tips.',{auto:3500});},500);}
  function restart(){storeBest();postScore(true);scores.start();state=newConveyor();yard.setPhase('sunrise');leaving=null;paused=false;milestone=false;overlayShown=false;inFlight={green:0,red:0,orange:0,yellow:0};yard.reset();game.querySelectorAll('.apple-flyer,.apple-points').forEach(el=>el.remove());rebuildSlots();last=performance.now();paintStats();canvas.focus({preventScroll:true});}
  function togglePause(){if(state.over||state.shiftOver)return;paused=!paused;if(paused)yard.cancelDrag();last=performance.now();paintStats();}
  function visibility(){if(document.hidden&&!state.over){paused=true;paintStats();}}

  canvas.addEventListener('pointerdown',grabApple);canvas.addEventListener('pointerup',dropApple);canvas.addEventListener('pointercancel',dropApple);
  canvas.addEventListener('pointermove',event=>{dragApple(event);if(event.pointerType==='mouse'&&!held?.moved)highlight(cellAt(event));});
  canvas.addEventListener('pointerleave',()=>{selection=new Set();});
  canvas.addEventListener('click',event=>{if(performance.now()<skipClickUntil)return;collect(cellAt(event));});
  canvas.addEventListener('keydown',event=>{const moves={ArrowLeft:-1,ArrowRight:1,ArrowUp:-C,ArrowDown:C};
    if(moves[event.key]){event.preventDefault();if(cursor<0)cursor=(R-1)*C;const n=cursor+moves[event.key];if(n>=0&&n<R*C&&!(Math.abs(moves[event.key])===1&&Math.floor(n/C)!==Math.floor(cursor/C)))cursor=n;highlight(cursor);}
    else if(event.key==='Enter'||event.key===' '){event.preventDefault();collect(cursor);highlight(cursor);}});
  canvas.addEventListener('blur',()=>{selection=new Set();});
  $('#apple-pause').onclick=togglePause;document.addEventListener('visibilitychange',visibility);
  // The yard owns the column right of the belt (its upper part; the lever and handle sit below), growing to the
  // whole screen as the belt slides away.
  function yardFocus(t=0){const g=game.getBoundingClientRect(),w=g.width,h=g.height,top=$('.apple-top').offsetHeight,right=play.offsetLeft+play.offsetWidth+4,colH=(h-top)*.58,mix=(a,b)=>a+(b-a)*t;
    return {x:mix(right,0),y:top,w:Math.max(1,mix(w-right,w)),h:Math.max(1,mix(colH,h-top))};}
  // Belt lights lean a little toward the yard's sky, but stay bright enough to read apple colours at night.
  function lightBelt(){const L=yard.lighting();hemi.color.copy(HEMI_SKY).lerp(L.sky,.35);hemi.groundColor.copy(HEMI_GROUND).lerp(L.ground,.35);hemi.intensity=1.5*.65+L.hemi*.35;sun.color.copy(SUN_COLOR).lerp(L.sun,.3);sun.intensity=2.3*.7+L.sunI*.3;}
  function slideTo(dt){const want=paused||state.belt!=='on'&&!state.over&&!state.shiftOver?1:0;if(reveal!==want){const step=dt/.45;reveal=want>reveal?Math.min(want,reveal+step):Math.max(want,reveal-step);const t=reveal*reveal*(3-2*reveal);slide.style.transform=`translateX(${(-t*(play.offsetLeft+play.offsetWidth+80)).toFixed(1)}px)`;game.dataset.reveal=reveal>.5?'1':'0';yard.setReveal(t);if(reveal>=1)firstPeek();}
    if(reveal<.9&&!bubble.hidden)bubble.hidden=true;if(!bubble.hidden){const a=speaker==='guest'?yard.guestAnchor():yard.horseAnchor(),half=bubble.offsetWidth/2+8;bubble.style.left=Math.max(half,Math.min(game.clientWidth-half,a.x))+'px';bubble.style.top=Math.max(bubble.offsetHeight+70,a.y)+'px';}
    const br=$('#apple-break');const resting=state.belt==='off'&&!paused&&!state.over;br.hidden=!resting;if(resting)br.firstChild.style.transform=`scaleX(${Math.max(0,state.stoppedLeft/STOP_MS)})`;}

  function frame(now){if(disposed)return;raf=requestAnimationFrame(frame);const elapsed=Math.min(250,now-last);last=now;
    if(!paused&&!state.over&&!document.hidden){const before=state;state=advanceConveyor(state,elapsed);for(let k=before.rowsAdded;k<state.rowsAdded;k++)onPush();
      // Rot creeps on its own clock (even with the belt stopped): fade newly rotted apples to brown.
      for(const i of state.rotted||[]){const look=slots[i];if(look&&look.color!==ROTTEN){look.orig=look.color;look.color=ROTTEN;look.rotT=0;}}
      if(before.level!==state.level||before.over!==state.over||before.belt!==state.belt||before.shiftOver!==state.shiftOver){if(state.shiftOver)yard.cancelDrag();if(state.over!==before.over||state.shiftOver&&!before.shiftOver)postScore(state.over);storeBest();paintStats();}else if(before.rowsAdded!==state.rowsAdded)paintStats();else{paintClock();if(state.belt!=='on')paintValve();}}
    // Auto-return: once this break's hauling has emptied every basket, the belt restarts without waiting out the break.
    if(state.belt==='on')hauledAt=0;
    else if(state.belt==='off'&&hauledAt&&!paused&&now-hauledAt>650&&APPLE_COLORS.every(c=>!state.baskets[c].length&&!inFlight[c])&&!yard.busy()){hauledAt=0;state={...toggleBelt(state),message:'Baskets empty: back to the belt!'};paintStats();}
    if(state.over&&!overlayShown&&now-overAt>1500){yard.cancelDrag();overlayShown=true;paintStats();}
    slideTo(elapsed/1000);lightBelt();simulate(elapsed/1000);draw();yard.frame(elapsed/1000,{active:reveal>.9&&!paused&&!state.over&&!state.shiftOver});}
  yard.setPhase(phaseOf(state.shift),true);rebuildSlots();paintStats();fit();raf=requestAnimationFrame(frame);
  // On phones, take the whole screen and hold portrait (Android Chrome; iPhone Safari ignores this quietly).
  const dialog=root.closest('dialog');try{if(dialog&&document.fullscreenEnabled&&!document.fullscreenElement&&matchMedia('(pointer:coarse)').matches)dialog.requestFullscreen({navigationUI:'hide'}).then(()=>screen.orientation?.lock?.('portrait')).catch(()=>{});}catch{}
  // Leaving mid-run asks first (in-app, never a browser dialog); an empty or finished belt just leaves.
  function requestExit(go){if(state.over||(!state.collected&&!state.score)){go();return;}leaving=go;if(!paused){paused=true;yard.cancelDrag();last=performance.now();}paintStats();}
  function pause(){if(!state.over&&!paused){paused=true;yard.cancelDrag();paintStats();}}
  return {requestExit,pause,stats:()=>({score:state.score,delivered:state.delivered||0}),dispose(){disposed=true;cancelAnimationFrame(raf);storeBest();postScore(true);bubble.remove();try{if(document.fullscreenElement===dialog)document.exitFullscreen().catch(()=>{});}catch{}resize.disconnect();yard.dispose();document.removeEventListener('visibilitychange',visibility);for(const x of disposables)x.dispose?.();for(const mesh of [bodies,stems,leaves]){mesh.material.dispose();mesh.dispose();}renderer.dispose();renderer.forceContextLoss?.();}};
}
