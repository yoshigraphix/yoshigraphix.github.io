// Hay’s for Horses, 3D edition: phone-first and portrait. The camera sits close behind the sling and wagon
// with the barn in the distance, follows each bale to the loft, holds on the landing, then glides back.
// Rules stay in hay-flinger.mjs; this file only draws, plays back flight paths and routes input.
import * as THREE from './vendor/three-0.180.0/three.module.js?v=157';
import {SLING,WALL_X,COLS,ROWS,FLOOR,CEILING,BACK,HALF,EAVE,PEAK,VANE,newFling,nextLoad,throwBale,previewArc} from './hay-flinger.mjs?v=157';
import {horsePortrait} from './apple-yard-3d.js?v=157';
import {makeSculptedHorse} from './horse-sculpt.js?v=157';
import {guestHorse} from './ranch.mjs?v=157';

const FOV=42,PULL=1.4,BALE={w:.96,h:.96,d:1.6},HOLD=900;
const V=(x,y,z)=>new THREE.Vector3(x,y,z),FRECKLES=V(-4.9,0,-.6),GUEST_AT=V(4.8,0,-6.8);
// Camera shots. Each one looks at a fixed point from a fixed direction and backs off until its key points
// fit a centred box of the screen (half-width, half-height, -1…1), then lifts so the subject sits lower.
// That way portrait phones, iPads and desktops all frame well.
const SHOTS={
  aim:{target:V(-.9,1.4,-.6),dir:V(-.8,.3,.6),points:[V(-2.6,0,-1.4),V(-2,2.9,-2.4),V(.3,SLING.y+1,1.3),V(.3,0,-1.3),V(-1.3,.3,0)],box:[.5,.4],lift:.55,shift:.4},
  loft:{target:V(WALL_X+COLS/2,FLOOR+1.7,0),dir:V(-.32,.14,1),points:[V(WALL_X-.6,FLOOR-.4,2.5),V(BACK+.6,FLOOR-.4,2.5),V(WALL_X-.6,PEAK.y,0),V(BACK+.6,EAVE,0)],box:[.86,.5],lift:.05}};
const TIPS=["Hi, I'm Freckles! Pull back anywhere on the screen to aim the sling, then let go.",
  "Fill the back of the loft first. If the front stack reaches the top, it blocks the door!",
  "Hay slides on the loft boards. A hard, flat throw skids all the way to the back.",
  "Watch the windsock. The further it sticks out, the harder the gust pushes your bale.",
  "Six level bales in a row earn a big bonus. Fill the whole loft for an even bigger one!",
  "Every spare bale left on the wagon is a bonus when the loft is full, so aim carefully.",
  "From day two the barn cat naps on the stacks. Throw there and she'll bat your bale right back!",
  "Each day the wind blows a little harder and the wagon brings fewer spare bales.",
  "That weathervane up top… I wonder what it sounds like if something hits it? Hee hee."];

function strawTexture(){
  const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.fillStyle='#dcbc62';g.fillRect(0,0,128,128);let seed=7;const rnd=()=>((seed=seed*16807%2147483647)/2147483647);
  for(let k=0;k<260;k++){const x=rnd()*128,y=rnd()*128,l=6+rnd()*18,a=(rnd()-.5)*.7;g.strokeStyle=['#f0d78a','#c9a44c','#e8cb74','#b8913f'][k%4];g.lineWidth=1+rnd()*1.4;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke();}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function skyTexture(){
  const c=document.createElement('canvas');c.width=2;c.height=256;const g=c.getContext('2d'),grad=g.createLinearGradient(0,0,0,256);grad.addColorStop(0,'#86c3e8');grad.addColorStop(.62,'#cfe9f2');grad.addColorStop(1,'#f3efd8');g.fillStyle=grad;g.fillRect(0,0,2,256);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

export function mountHayFlinger(root,{onMilestone=()=>{},storageKey='guest'}={}){
  let state=newFling(),paused=false,disposed=false,leaving=null,raf=0,last=performance.now(),best=0,milestone=false,flight=null,drag=null,aimShown=0,aim={power:.7,angle:.95},overlayKey='',view='aim',holdUntil=0,newCell=null;
  const bestKey='trottville-hay-best-v1:'+storageKey;try{best=Math.max(0,Number(localStorage.getItem(bestKey))||0);}catch{}
  root.innerHTML=`<div class="hay-game">
    <div class="hay-top"><button class="hay-pause" id="hay-pause" aria-label="Pause"><i></i><i></i></button><b class="hay-score" id="hay-score">0</b><span class="hay-left" id="hay-bales"><i aria-hidden="true"></i><b></b></span><span class="hay-wind" id="hay-wind"><small>WIND</small><b></b></span></div>
    <div class="hay-map" id="hay-map" role="img"><div class="hay-map-grid"></div><small><span>◂ DOOR</span><span>BACK ▸</span></small></div>
    <div class="hay-overlay" id="hay-overlay" hidden></div>
    <div class="hay-feedback" id="hay-feedback" role="status" aria-live="polite"></div>
    <div class="hay-rotate" aria-hidden="true"><b>↻</b><span>Turn your phone upright to play</span></div></div>`;
  const $=s=>root.querySelector(s),stage=$('.hay-game'),overlay=$('#hay-overlay'),mapGrid=$('.hay-map-grid');
  mapGrid.innerHTML=Array.from({length:COLS*ROWS},()=>'<i></i>').join('');

  let renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}
  catch{stage.insertAdjacentHTML('beforeend','<p class="hay-nogl">This game needs 3D graphics (WebGL), which this browser has turned off.</p>');return {requestExit(go){go();},pause(){},dispose(){}};}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const canvas=renderer.domElement;canvas.className='hay-canvas';canvas.tabIndex=0;canvas.setAttribute('role','application');canvas.setAttribute('aria-label','Hay’s for Horses. Drag back from anywhere to aim the sling and release to throw. Arrow keys aim, Space throws.');stage.prepend(canvas);

  const disposables=[],keep=x=>(disposables.push(x),x),mat=(color,extra={})=>keep(new THREE.MeshStandardMaterial({color,roughness:.85,...extra}));
  const scene=new THREE.Scene();scene.background=keep(skyTexture());scene.fog=new THREE.Fog('#dfeee9',40,95);
  const camera=new THREE.PerspectiveCamera(FOV,9/16,.3,200);
  scene.add(new THREE.HemisphereLight('#fff8e6','#7a8f55',1.6));
  const sun=new THREE.DirectionalLight('#fff2d4',2.2);sun.position.set(2,22,16);sun.target.position.set(9,3,0);sun.castShadow=true;sun.shadow.mapSize.set(2048,1024);
  Object.assign(sun.shadow.camera,{left:-10,right:24,top:16,bottom:-6,near:4,far:60});sun.shadow.bias=-.0012;scene.add(sun,sun.target);
  const box=(w,h,d,material,x,y,z,parent=scene)=>{const m=new THREE.Mesh(keep(new THREE.BoxGeometry(w,h,d)),material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
  const UP=new THREE.Vector3(0,1,0);
  const between=(mesh,a,b)=>{const d=new THREE.Vector3().subVectors(b,a),len=d.length()||1e-4;mesh.position.copy(a).addScaledVector(d,.5);mesh.scale.set(1,len,1);mesh.quaternion.setFromUnitVectors(UP,d.divideScalar(len));};

  // Meadow, hills, trees and drifting clouds.
  const ground=new THREE.Mesh(keep(new THREE.PlaneGeometry(240,120)),mat('#8fbf5a',{roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.set(9,0,-30);ground.receiveShadow=true;scene.add(ground);
  const hillGeo=keep(new THREE.IcosahedronGeometry(1,2));
  for(const [x,z,sx,sy,c] of [[-14,-42,22,7,'#7fae55'],[10,-50,30,10,'#88b55f'],[34,-44,24,8,'#76a64f'],[58,-56,30,12,'#83b05a'],[-36,-54,26,9,'#8bb763']]){const h=new THREE.Mesh(hillGeo,mat(c,{flatShading:true,roughness:1}));h.position.set(x,0,z);h.scale.set(sx,sy,10);scene.add(h);}
  const trunk=mat('#7a5a3c'),leaf=mat('#5f9446',{flatShading:true}),coneGeo=keep(new THREE.ConeGeometry(1,2.4,7)),stemGeo=keep(new THREE.CylinderGeometry(.18,.24,1.2,6));
  for(const [x,z,s] of [[-8,-9,1.3],[-5.5,-14,1],[24,-8,1.4],[27,-13,1.1],[21.5,-16,.9],[3,-20,1.2]]){const t=new THREE.Group();const st=new THREE.Mesh(stemGeo,trunk);st.position.y=.6;const top=new THREE.Mesh(coneGeo,leaf);top.position.y=2.2;st.castShadow=top.castShadow=true;t.add(st,top);t.position.set(x,0,z);t.scale.setScalar(s);scene.add(t);}
  const cloudMat=mat('#ffffff',{roughness:1,flatShading:true}),puff=keep(new THREE.IcosahedronGeometry(1,1)),clouds=[];
  for(const [x,y,s] of [[-6,15,1.6],[12,17,2],[30,14.5,1.4]]){const c=new THREE.Group();for(const [dx,dy,r] of [[0,0,1],[1.1,.2,.8],[-1,.1,.75],[.4,.6,.7]]){const p=new THREE.Mesh(puff,cloudMat);p.position.set(dx,dy,0);p.scale.set(r*1.3,r*.8,r);c.add(p);}c.position.set(x,y,-30);c.scale.setScalar(s);scene.add(c);clouds.push(c);}

  // The barn: red ground floor, the loft cut away on our side so the stacks show, door gap in the near wall.
  const red=mat('#b8483a'),redIn=mat('#8e3a30'),white=mat('#f4efe2'),wood=mat('#a98257'),roofMat=mat('#6f4b3a');
  box(COLS,FLOOR,5,red,WALL_X+COLS/2,FLOOR/2,0);
  const doors=new THREE.Group();doors.position.set(WALL_X+COLS/2,1.75,2.52);scene.add(doors);box(3.2,3.4,.06,mat('#a63d31'),0,0,0,doors);
  for(const [w,h,x,y,rz] of [[3.3,.18,0,1.7,0],[3.3,.18,0,-1.7,0],[.18,3.4,-1.6,0,0],[.18,3.4,1.6,0,0],[.18,3.4,0,0,0],[.14,4.6,-.8,0,.76],[.14,4.6,-.8,0,-.76],[.14,4.6,.8,0,.76],[.14,4.6,.8,0,-.76]]){const m=box(w,h,.08,white,x,y,.04,doors);m.rotation.z=rz;if(Math.abs(rz)>0){m.scale.y=.74;}}
  box(COLS+.4,.2,5.2,wood,WALL_X+COLS/2,FLOOR-.1,0);
  box(COLS,EAVE-FLOOR,.2,redIn,WALL_X+COLS/2,(FLOOR+EAVE)/2,-2.4);
  box(.3,EAVE-FLOOR,5,red,BACK+.15,(FLOOR+EAVE)/2,0);
  box(.3,EAVE-FLOOR,1.4,red,WALL_X-.15,(FLOOR+EAVE)/2,-1.8);
  box(.4,EAVE-CEILING,5.2,white,WALL_X-.15,(CEILING+EAVE)/2,0);
  for(const x of [WALL_X-.15,BACK+.15])box(.32,EAVE-FLOOR,.32,white,x,(FLOOR+EAVE)/2,2.36);
  box(COLS+.3,.22,.3,wood,WALL_X+COLS/2,CEILING+.11,2.3);box(COLS+.3,.22,.3,wood,WALL_X+COLS/2,CEILING+.11,-2.2);
  const gable=new THREE.Shape();gable.moveTo(WALL_X-.4,EAVE);gable.lineTo(PEAK.x,PEAK.y);gable.lineTo(BACK+.4,EAVE);gable.closePath();
  const gableMesh=new THREE.Mesh(keep(new THREE.ShapeGeometry(gable)),redIn);gableMesh.position.z=-2.45;scene.add(gableMesh);
  for(const side of [-1,1]){const x0=side<0?WALL_X-.4:BACK+.4,dx=PEAK.x-x0,dy=PEAK.y-EAVE,len=Math.hypot(dx,dy)+.5,slab=box(len,.26,5.8,roofMat,x0+dx/2,EAVE+dy/2+.13,0);slab.rotation.z=side*-Math.atan2(dy,Math.abs(dx));}
  // Horse weathervane on the peak: points where the wind blows, spins when something rings it.
  const iron=mat('#3c3a36',{metalness:.5,roughness:.5});box(.08,VANE.y-PEAK.y+.2,.08,iron,PEAK.x,(PEAK.y+VANE.y)/2-.1,0);
  const vane=new THREE.Group();vane.position.set(VANE.x,VANE.y,0);scene.add(vane);
  box(1.5,.06,.06,iron,0,-.18,0,vane);const arrow=new THREE.Mesh(keep(new THREE.ConeGeometry(.1,.26,4)),iron);arrow.rotation.z=-Math.PI/2;arrow.position.set(.85,-.18,0);vane.add(arrow);
  for(const [w,h,x,y,rz] of [[.62,.24,0,.12,0],[.14,.36,.3,.34,-.5],[.24,.12,.42,.5,0],[.06,.28,-.22,-.06,0],[.06,.28,.22,-.06,0],[.08,.3,-.38,.12,.9]])box(w,h,.06,iron,x,y,0,vane).rotation.z=rz;
  // Windsock by the wagon.
  box(.1,3.4,.1,mat('#e9e3d2'),-5.2,1.7,-3.4);
  const sock=new THREE.Group();sock.position.set(-5.2,3.3,-3.4);scene.add(sock);
  const sockGeo=keep(new THREE.CylinderGeometry(.16,.3,1.6,10,1,true));sockGeo.rotateZ(Math.PI/2);sockGeo.translate(.8,0,0);
  const sockMesh=new THREE.Mesh(sockGeo,mat('#ee7a3a',{side:THREE.DoubleSide}));sockMesh.castShadow=true;sock.add(sockMesh);
  const band=new THREE.Mesh(keep(new THREE.CylinderGeometry(.24,.24,.3,10,1,true).rotateZ(Math.PI/2).translate(.85,0,0)),mat('#ffffff',{side:THREE.DoubleSide}));sock.add(band);

  // Hay wagon and the Y sling.
  const wagon=new THREE.Group();wagon.position.set(-2.3,0,-2.4);scene.add(wagon);
  box(3.2,.25,2,wood,0,.95,0,wagon);box(3.2,.5,.1,wood,0,1.3,1,wagon);box(3.2,.5,.1,wood,0,1.3,-1,wagon);box(.1,.5,2,wood,-1.6,1.3,0,wagon);
  const wheelGeo=keep(new THREE.CylinderGeometry(.55,.55,.14,14));wheelGeo.rotateX(Math.PI/2);const wheelMat=mat('#5e4630');
  for(const [x,z] of [[-1,1.08],[1,1.08],[-1,-1.08],[1,-1.08]]){const w=new THREE.Mesh(wheelGeo,wheelMat);w.position.set(x,.55,z);w.castShadow=true;wagon.add(w);}
  const strawMap=keep(strawTexture()),strawMat=mat('#ffffff',{map:strawMap,roughness:.95}),twine=mat('#8a6638'),baleGeo=keep(new THREE.BoxGeometry(BALE.w,BALE.h,BALE.d)),bandGeo=keep(new THREE.BoxGeometry(BALE.w+.03,BALE.h+.03,.07));
  const makeBale=()=>{const g=new THREE.Group(),b=new THREE.Mesh(baleGeo,strawMat);b.castShadow=b.receiveShadow=true;g.add(b);for(const z of [-.42,.42]){const t=new THREE.Mesh(bandGeo,twine);t.position.z=z;g.add(t);}return g;};
  const wagonBales=[[-.9,1.56,.35],[0,1.56,.35],[-.9,1.56,-.5],[0,1.56,-.5],[-.45,2.52,0],[.85,1.56,0]].map(([x,y,z])=>{const b=makeBale();b.position.set(x,y,z);b.rotation.y=Math.PI/2;b.scale.setScalar(.82);wagon.add(b);return b;});
  const slingMat=mat('#8d6a45');const post=new THREE.Mesh(keep(new THREE.CylinderGeometry(.15,.19,1,8)),slingMat);post.position.set(SLING.x+.2,.5,0);post.castShadow=true;scene.add(post);
  const prongGeo=keep(new THREE.CylinderGeometry(.09,.11,1,8)),prongTips=[new THREE.Vector3(SLING.x+.2,SLING.y+.75,1.15),new THREE.Vector3(SLING.x+.2,SLING.y+.75,-1.15)];
  for(const end of prongTips){const p=new THREE.Mesh(prongGeo,slingMat);p.castShadow=true;between(p,new THREE.Vector3(SLING.x+.2,.95,0),end);scene.add(p);}
  const bandMat=mat('#7a3b2a'),bandGeoSling=keep(new THREE.CylinderGeometry(.035,.035,1,6)),bands=prongTips.map(()=>{const m=new THREE.Mesh(bandGeoSling,bandMat);scene.add(m);return m;});
  const ready=makeBale();scene.add(ready);
  const dotMat=keep(new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.85})),dotGeo=keep(new THREE.SphereGeometry(.09,8,6)),dots=Array.from({length:9},()=>{const d=new THREE.Mesh(dotGeo,dotMat);d.visible=false;scene.add(d);return d;});

  // The barn cat: an orange tabby napping on a stack.
  const cat=new THREE.Group(),fur=mat('#e2964a'),furDark=mat('#b9692e');scene.add(cat);cat.visible=false;
  const sphere=keep(new THREE.SphereGeometry(1,14,10));const part=(m,sx,sy,sz,x,y,z)=>{const p=new THREE.Mesh(sphere,m);p.scale.set(sx,sy,sz);p.position.set(x,y,z);p.castShadow=true;cat.add(p);return p;};
  part(fur,.36,.2,.24,0,.2,0);part(fur,.19,.17,.17,.33,.26,.04);part(furDark,.06,.2,.2,-.05,.32,0);part(furDark,.06,.17,.2,.12,.3,0);
  for(const z of [-.08,.12]){const ear=new THREE.Mesh(keep(new THREE.ConeGeometry(.06,.13,4)),fur);ear.position.set(.36,.44,z);cat.add(ear);}
  const tail=new THREE.Group();tail.position.set(-.34,.16,0);cat.add(tail);const tailMesh=new THREE.Mesh(keep(new THREE.CylinderGeometry(.04,.05,.5,6)),furDark);tailMesh.rotation.z=1.2;tailMesh.position.set(-.22,.08,0);tail.add(tailMesh);

  const loft=[],resting=[];
  function clearLoft(){for(const b of loft.splice(0))scene.remove(b);}
  function placeLoft(){clearLoft();state.stacks.forEach((h,c)=>{for(let r=0;r<h;r++){const b=makeBale();b.position.set(WALL_X+c+.5,FLOOR+r+HALF+.03,0);scene.add(b);loft.push(b);}});}

  // Today's guest horse (a pricey breed from ranch.guestHorse) watches from the grass: tap it to meet it, and it
  // jumps for joy at square rows and a full loft. The same sculpted horse as the world.
  const g=guestHorse('hay'),guest=makeSculptedHorse(THREE,g,{geometry:keep});guest.setGait('stand');guest.root.position.copy(GUEST_AT);guest.root.rotation.y=-.55;
  guest.root.traverse(o=>{if(o.isMesh)o.castShadow=true;});scene.add(guest.root);const guestHits=[];guest.root.traverse(o=>{if(o.isMesh)guestHits.push(o);});
  const article=/^[AEIOU]/i.test(g.breed)?'an':'a',GUEST=[`Hi! I'm ${g.name}, ${article} ${g.breed} from ${g.origin}. I came to watch the hay go up!`,`Did you know? ${g.fact}`,
    `${article[0].toUpperCase()+article.slice(1)} ${g.breed} like me costs about ${g.coins.toLocaleString('en-US')} Trotties at the horse market. Look me up in the Breed guide!`];
  let guestLine=-1;const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
  const guestHit=event=>{const r=canvas.getBoundingClientRect();ndc.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);return ray.intersectObjects(guestHits,false).length>0;};

  // Freckles stands by the wagon with tips; no rules text on screen.
  const horse=document.createElement('button');horse.type='button';horse.className='hay-horse';horse.setAttribute('aria-label','Freckles the horse: tips');const portrait=horsePortrait();if(portrait)horse.innerHTML=`<img src="${portrait}" alt="">`;stage.appendChild(horse);
  const bubble=document.createElement('div');bubble.className='hay-bubble';bubble.setAttribute('role','status');bubble.hidden=true;stage.appendChild(bubble);
  let tip=-1,bubbleTimer=0;const tmpV=new THREE.Vector3();
  function say(text,{auto=0,who='horse'}={}){bubble.classList.toggle('guest',who==='guest');
    if(who==='guest'){guest.head.getWorldPosition(tmpV);const at=tmpV.project(camera);stage.style.setProperty('--guest-x',Math.round((at.x+1)/2*stage.clientWidth-60)+'px');stage.style.setProperty('--guest-y',Math.round((1-at.y)/2*stage.clientHeight)+'px');}
    bubble.innerHTML=`<p>${text}</p>${auto?'':who==='guest'?`<small>${guestLine+1}/${GUEST.length} · tap ${g.name} for more</small>`:`<small>${tip+1}/${TIPS.length} · tap Freckles for more</small>`}<button class="hay-bubble-close" aria-label="Close">×</button>`;bubble.hidden=false;bubble.querySelector('button').onclick=()=>{bubble.hidden=true;};clearTimeout(bubbleTimer);if(auto)bubbleTimer=setTimeout(()=>{bubble.hidden=true;},auto);}
  horse.onclick=()=>{tip=(tip+1)%TIPS.length;say(TIPS[tip]);horse.classList.remove('nod');void horse.offsetWidth;horse.classList.add('nod');};
  const hintKey='trottville-hay-willow-hint-v1';try{if(!localStorage.getItem(hintKey)){localStorage.setItem(hintKey,'1');setTimeout(()=>{if(!disposed&&bubble.hidden)say('Psst! Tap me for tips.',{auto:5000});},1500);}}catch{}

  const toStage=(x,y,z=0)=>{const v=new THREE.Vector3(x,y,z).project(camera);return {x:(v.x+1)/2*stage.clientWidth,y:(1-v.y)/2*stage.clientHeight};};
  function popup(x,y,text,kind=''){const at=toStage(x,y,.8),el=document.createElement('div');el.className='hay-points '+kind;el.textContent=text;Object.assign(el.style,{left:at.x+'px',top:at.y+'px'});stage.appendChild(el);el.addEventListener('animationend',()=>el.remove());}
  function storeBest(){if(state.score>best){best=state.score;try{localStorage.setItem(bestKey,String(best));}catch{}}}
  const windText=w=>Math.abs(w)<.15?'calm':(w>0?'→':'←').repeat(Math.min(4,Math.ceil(Math.abs(w)/.75)));
  const leaveTo=sel=>()=>root.closest('dialog')?.querySelector(sel)?.click();
  // Only score, bales and wind while playing, plus the small loft map so the back-first plan stays in view.
  function paintStats(){
    $('#hay-score').textContent=state.score.toLocaleString();
    const left=$('#hay-bales');left.querySelector('b').textContent='×'+state.bales;left.setAttribute('aria-label',state.bales+' bales left');
    const w=$('#hay-wind');w.querySelector('b').textContent=windText(state.wind);w.classList.toggle('calm',Math.abs(state.wind)<.15);w.setAttribute('aria-label',Math.abs(state.wind)<.15?'Calm':`Wind ${state.wind>0?'toward':'away from'} the barn, strength ${Math.abs(state.wind).toFixed(1)}`);
    $('#hay-feedback').textContent=state.message||'';$('#hay-pause').disabled=state.over||state.loadDone;
    [...mapGrid.children].forEach((cell,i)=>{const r=ROWS-1-Math.floor(i/COLS),c=i%COLS;cell.className=state.stacks[c]>r?(newCell&&newCell.c===c&&newCell.r===r?'hay new':'hay'):state.cat&&state.cat.col===c&&state.stacks[c]===r?'cat':'';});
    $('#hay-map').setAttribute('aria-label',`Loft: ${state.stacks.reduce((a,b)=>a+b,0)} of ${COLS*ROWS} bales stacked${state.cat?', the cat is napping on a stack':''}`);
    wagonBales.forEach((b,i)=>{b.visible=i<state.bales-(flight?0:1);});
    if(state.cat){cat.visible=true;cat.position.set(WALL_X+state.cat.col+.5,FLOOR+state.stacks[state.cat.col],.55);}else cat.visible=false;
    paintOverlay();}
  function paintOverlay(){
    const settled=!flight&&view!=='hold',key=leaving?'leave':state.over&&settled?'over':state.loadDone&&settled?'load':paused?'pause':'';if(key===overlayKey)return;overlayKey=key;overlay.hidden=!key;overlay.className='hay-overlay '+key;
    if(key==='leave')overlay.innerHTML=`<b>Leave Hay’s for Horses?</b><span>Your run ends here with ${state.score.toLocaleString()} points.</span><div class="hay-overlay-actions"><button class="primary" data-act="stay">Keep playing</button><button class="secondary" data-act="leave">Leave</button></div>`;
    else if(key==='over')overlay.innerHTML=`<small>DAY ${state.day} · GAME OVER</small><b>${state.message}</b><strong>${state.score.toLocaleString()}<em>points</em></strong><span>Device best ${Math.max(best,state.score).toLocaleString()}</span><div class="hay-overlay-actions"><button class="primary" data-act="again">Play again</button><button class="secondary" data-act="other">Other barn games</button></div>`;
    else if(key==='load'){const full=state.last?.bonus?.find(b=>b.kind==='loft');overlay.innerHTML=`<small>DAY ${state.day} DONE</small><b>Loft full!</b><span>+${(full?.points||0).toLocaleString()} bonus${full?.spare?` · ${full.spare} spare bale${full.spare>1?'s':''}`:''}</span><strong>${state.score.toLocaleString()}<em>points</em></strong><div class="hay-overlay-actions"><button class="primary" data-act="next">Next load · day ${state.day+1}</button></div>`;}
    else if(key==='pause')overlay.innerHTML=`<b>Paused</b><div class="hay-overlay-actions"><button class="primary" data-act="resume">Resume</button><button class="secondary" data-act="again">New game</button><button class="secondary" data-act="other">Other games</button><button class="secondary" data-act="quit">Leave</button></div><span>Day ${state.day} · tap Freckles for tips.</span>`;
    overlay.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>{const act=b.dataset.act;
      if(act==='stay'){leaving=null;paused=false;}else if(act==='leave'){const go=leaving;leaving=null;go?.();return;}
      else if(act==='other'){leaveTo('#other')();return;}else if(act==='quit'){leaveTo('[data-close]')();return;}
      else if(act==='again')restart();else if(act==='next'){state=nextLoad(state);newCell=null;placeLoft();view='aim';}else if(act==='resume')paused=false;
      last=performance.now();paintStats();canvas.focus();});
    overlay.querySelector('button')?.focus();}

  function fire(){if(flight||paused||leaving||state.over||state.loadDone||state.bales<=0)return;const {state:next,path,result}=throwBale(state,aim.power,aim.angle);if(!result)return;
    let points=path.map(q=>({...q}));
    // A bale the cat bats back hops out of the door and drops onto the grass.
    if(result.reason==='cat'){const end=points.at(-1);for(let k=1;k<=24;k++){const u=k/24;points.push({x:end.x+(WALL_X-2.2-end.x)*u,y:end.y+(HALF-end.y)*u+2.4*Math.sin(Math.PI*u)*(1-u*.4),t:end.t+.9*u});}}
    const mesh=makeBale();scene.add(mesh);flight={path:points,result,next,mesh,start:performance.now(),events:[...result.events],landT:result.t};drag=null;aimShown=0;view='fly';bubble.hidden=true;paintStats();}
  function finishFlight(){const {result,next,mesh}=flight;flight=null;const end=mesh.position;newCell=null;
    if(result.kind==='land'){mesh.rotation.set(0,0,0);loft.push(mesh);newCell={c:result.col,r:result.row};popup(end.x,end.y+.7,'+'+(result.points-(result.bonus||[]).reduce((n,b)=>n+(b.kind==='ding'?0:b.points),0)).toLocaleString());
      if((result.bonus||[]).some(b=>b.kind==='row'||b.kind==='loft'))guest.jump();
      for(const b of result.bonus||[])if(b.kind==='row')setTimeout(()=>!disposed&&popup(WALL_X+COLS/2,FLOOR+b.row+1.2,'Square row! +'+b.points.toLocaleString(),'big'),250);}
    else{resting.push({mesh,life:2.6});if(result.reason==='cat')popup(WALL_X+next.stacks.length/2,CEILING,'Mrrow!','cat');}
    // Hold on the landing (the loft for a landing, wherever the bale fell for a miss), then glide home.
    hold.target.copy(result.kind==='land'?shots.loft.target:end);hold.pos.copy(result.kind==='land'?shots.loft.pos:camPos);if(result.kind!=='land')hold.target.lerp(camTarget,.4);
    view='hold';holdUntil=performance.now()+HOLD*(next.over||next.loadDone?1.6:1);
    state=next;storeBest();if(state.loadDone&&!milestone){milestone=true;onMilestone(state.score);}paintStats();}

  // Drag back from anywhere to aim; the dots show the first part of the arc (without the wind).
  const reach=()=>Math.max(90,Math.min(170,Math.min(stage.clientWidth,stage.clientHeight)*.3));
  const aimFrom=(event)=>{const dx=drag.x-event.clientX,dy=event.clientY-drag.y,len=Math.hypot(dx,dy);aim={power:Math.min(1,len/reach()),angle:Math.max(-.2,Math.min(1.45,Math.atan2(dy,Math.max(dx,.001))))};};
  canvas.addEventListener('pointerdown',event=>{if(flight||paused||leaving||state.over||state.loadDone)return;
    if(view==='aim'&&guestHit(event)){guestLine=(guestLine+1)%GUEST.length;guest.jump();say(GUEST[guestLine],{who:'guest'});return;}
    drag={x:event.clientX,y:event.clientY,id:event.pointerId};canvas.setPointerCapture(event.pointerId);aim={power:0,angle:aim.angle};view='aim';bubble.hidden=true;});
  canvas.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.id)return;aimFrom(event);aimShown=1;});
  const release=event=>{if(!drag||event.pointerId!==drag.id)return;aimFrom(event);drag=null;if(aim.power>=.08)fire();else aimShown=0;};
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',()=>{drag=null;aimShown=0;});
  canvas.addEventListener('keydown',event=>{const k=event.key;
    if(k==='ArrowUp'||k==='ArrowDown'){event.preventDefault();view='aim';aim.angle=Math.max(-.2,Math.min(1.45,aim.angle+(k==='ArrowUp'?.02:-.02)));aimShown=performance.now()+2500;}
    else if(k==='ArrowLeft'||k==='ArrowRight'){event.preventDefault();view='aim';aim.power=Math.max(.08,Math.min(1,aim.power+(k==='ArrowRight'?.02:-.02)));aimShown=performance.now()+2500;}
    else if(k===' '||k==='Enter'){event.preventDefault();fire();}});

  function restart(){if(flight){scene.remove(flight.mesh);flight=null;}for(const r of resting.splice(0))scene.remove(r.mesh);state=newFling();paused=false;leaving=null;newCell=null;view='aim';placeLoft();last=performance.now();paintStats();}
  function togglePause(){if(state.over||state.loadDone)return;paused=!paused;drag=null;last=performance.now();paintStats();}
  function visibility(){if(document.hidden&&!state.over&&!state.loadDone){paused=true;paintStats();}}
  $('#hay-pause').onclick=togglePause;document.addEventListener('visibilitychange',visibility);

  // The follow camera: shots are refitted on resize; each frame the camera eases toward the shot for the moment.
  const probe=new THREE.PerspectiveCamera(FOV,1,.3,200),shots={},hold={pos:V(0,0,0),target:V(0,0,0)},camPos=V(0,0,0),camTarget=V(0,0,0),wantPos=V(0,0,0),wantTarget=V(0,0,0),pan=V(0,0,0);
  // Back off until every key point fits a centred box, then lift and shift the camera so the subject sits lower and to the left.
  function fitShot({target,dir,points,box,lift=0,shift=0}){const d=dir.clone().normalize(),inside=dist=>{probe.position.copy(target).addScaledVector(d,dist);probe.lookAt(target);probe.updateMatrixWorld();
      return points.every(p=>{const v=p.clone().project(probe);return v.z<1&&Math.abs(v.x)<=box[0]&&Math.abs(v.y)<=box[1];});};
    let lo=2,hi=120;for(let k=0;k<26;k++){const mid=(lo+hi)/2;if(inside(mid))hi=mid;else lo=mid;}
    inside(hi);const half=hi*Math.tan(FOV*Math.PI/360),up=V(0,1,0).applyQuaternion(probe.quaternion).multiplyScalar(lift*half).add(V(1,0,0).applyQuaternion(probe.quaternion).multiplyScalar(shift*half*probe.aspect));
    return {pos:target.clone().addScaledVector(d,hi).add(up),target:target.clone().add(up)};}
  let fitted=false;
  const fit=()=>{const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=probe.aspect=w/h;camera.updateProjectionMatrix();probe.updateProjectionMatrix();
    for(const k in SHOTS)shots[k]=fitShot(SHOTS[k]);
    // Freckles stands on the grass just left of the wagon in the aiming shot (kept on screen on narrow phones).
    probe.position.copy(shots.aim.pos);probe.lookAt(shots.aim.target);probe.updateMatrixWorld();const foot=FRECKLES.clone().project(probe),hw=horse.offsetWidth||140;
    stage.style.setProperty('--horse-x',Math.round(Math.max(4,Math.min(w-hw-4,(foot.x+1)/2*w-hw/2)))+'px');if(!fitted||(view==='aim'&&!drag)){fitted=true;camPos.copy(shots.aim.pos);camTarget.copy(shots.aim.target);}};
  const resize=new ResizeObserver(fit);resize.observe(stage);
  const smooth=u=>u*u*(3-2*u);
  function steer(now,dt){
    if(view==='hold'&&now>=holdUntil){view='aim';paintStats();}
    let rate=3.2;
    if(view==='fly'&&flight){const b=flight.mesh.position,u=smooth(Math.max(0,Math.min(1,(b.x-SLING.x)/(WALL_X+1-SLING.x))));
      wantPos.lerpVectors(shots.aim.pos,shots.loft.pos,u);wantTarget.lerpVectors(shots.aim.target,shots.loft.target,u);
      pan.subVectors(b,wantTarget).multiplyScalar(.45*(1-u*.6));wantPos.add(pan);wantTarget.add(pan);rate=5;}
    else if(view==='hold'){wantPos.copy(hold.pos);wantTarget.copy(hold.target);rate=4;}
    else{wantPos.copy(shots.aim.pos);wantTarget.copy(shots.aim.target);rate=view==='aim'&&drag?6:2.6;}
    const k=1-Math.exp(-rate*dt);camPos.lerp(wantPos,k);camTarget.lerp(wantTarget,k);}

  const sockDir={a:0};let vaneSpin=0,vaneAngle=0;
  function frame(now){if(disposed)return;raf=requestAnimationFrame(frame);const dt=Math.min(.1,(now-last)/1000);last=now;const time=now/1000;guest.update(dt);
    if(!paused&&!leaving&&flight){const t=(now-flight.start)/1000,path=flight.path;
      while(flight.events.length&&flight.events[0].t<=t){const e=flight.events.shift();if(e.kind==='ding'){vaneSpin=14;popup(VANE.x,VANE.y+.6,'Ding! +300','big');}}
      let k=1;while(k<path.length-1&&path[k].t<t)k++;const a=path[k-1],b=path[k],u=Math.max(0,Math.min(1,(t-a.t)/((b.t-a.t)||1e-3)));
      flight.mesh.position.set(a.x+(b.x-a.x)*u,a.y+(b.y-a.y)*u,0);flight.mesh.rotation.z=t<flight.landT?-t*5.5:Math.round(flight.mesh.rotation.z/(Math.PI/2))*(Math.PI/2);
      if(t>=path.at(-1).t)finishFlight();}
    else if(flight&&(paused||leaving))flight.start+=dt*1000;
    if(view==='hold'&&(paused||leaving))holdUntil+=dt*1000;
    if(!paused&&!leaving)steer(now,dt);
    camera.position.copy(camPos);camera.lookAt(camTarget);
    // Sling, bands, aiming dots.
    const showAim=!flight&&!state.over&&!state.loadDone&&state.bales>0&&(drag||aimShown>now||aimShown===1);
    const dir=new THREE.Vector3(Math.cos(aim.angle),Math.sin(aim.angle),0),pull=drag||aimShown?aim.power*PULL:0;
    ready.visible=!flight&&!state.over&&!state.loadDone&&state.bales>0;ready.position.set(SLING.x-dir.x*pull,SLING.y-dir.y*pull,0);ready.rotation.z=aim.angle*.3;
    const pocket=flight&&(now-flight.start)<120?new THREE.Vector3(SLING.x,SLING.y,0):ready.visible?ready.position.clone().addScaledVector(dir,-.45):new THREE.Vector3(SLING.x,SLING.y,0);
    bands.forEach((m,i)=>between(m,prongTips[i],pocket));
    const arc=showAim?previewArc(aim.power,aim.angle):[];dots.forEach((d,i)=>{d.visible=!!arc[i];if(arc[i])d.position.set(arc[i].x,arc[i].y,0);d.material.opacity=.85;});
    // Wind: the sock lifts with the gust and the vane swings to point downwind.
    const strength=Math.min(1,Math.abs(state.wind)/3);sockDir.a+=((state.wind>=0?0:Math.PI)-sockDir.a)*Math.min(1,dt*4);sock.rotation.y=sockDir.a;sock.rotation.z=-(1-strength)*1.25+Math.sin(time*7)*.04*(.3+strength);
    vaneAngle+=((state.wind>=0?0:Math.PI)-vaneAngle)*Math.min(1,dt*3);vaneSpin=Math.max(0,vaneSpin-dt*6);vane.rotation.y=vaneAngle+(vaneSpin>0?time*vaneSpin:0);
    tail.rotation.z=Math.sin(time*2.2)*.35;cat.scale.y=1+Math.sin(time*1.6)*.03;
    for(const c of clouds){c.position.x+=dt*(.25+state.wind*.15);if(c.position.x>44)c.position.x=-24;if(c.position.x<-26)c.position.x=42;}
    for(let i=resting.length-1;i>=0;i--){const r=resting[i];r.life-=dt;if(r.life<.6)r.mesh.scale.setScalar(Math.max(.01,r.life/.6));if(r.life<=0){scene.remove(r.mesh);resting.splice(i,1);}}
    renderer.render(scene,camera);}
  placeLoft();fit();paintStats();raf=requestAnimationFrame(frame);
  // On phones, take the whole screen and hold portrait (Android Chrome; iPhone Safari ignores this quietly).
  const dialog=root.closest('dialog');try{if(dialog&&document.fullscreenEnabled&&!document.fullscreenElement&&matchMedia('(pointer:coarse)').matches)dialog.requestFullscreen({navigationUI:'hide'}).then(()=>screen.orientation?.lock?.('portrait')).catch(()=>{});}catch{}

  // Leaving mid-run asks first (in-game, never a browser dialog); a finished or untouched run just leaves.
  function requestExit(go){if(state.over||!state.thrown){go();return;}leaving=go;paintStats();}
  function pause(){if(!paused&&!state.over&&!state.loadDone){paused=true;drag=null;paintStats();}}
  return {requestExit,pause,stats:()=>({score:state.score,rows:state.rows||0}),dispose(){disposed=true;cancelAnimationFrame(raf);guest.dispose();storeBest();clearTimeout(bubbleTimer);try{if(document.fullscreenElement===dialog)document.exitFullscreen().catch(()=>{});}catch{}resize.disconnect();document.removeEventListener('visibilitychange',visibility);for(const x of disposables)x.dispose?.();renderer.dispose();renderer.forceContextLoss?.();}};
}
