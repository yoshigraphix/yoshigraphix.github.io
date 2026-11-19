// Appleoosa's yard: one full-screen 3D scene behind the belt, set in an orchard clearing. The sorting belt's
// wooden frame runs down the left (picker bin at the near end, compost bin at the spill end), the baskets
// stand in a column beside it, and the farm truck is parked beyond them, top right, under a sky that follows
// the shift's time of day. While the belt runs the camera looks down on the basket column beside it; pulling
// the lever slides the belt off to the left and the camera pans right, so baskets are dragged up and right to the truck.
// Birds, fireflies and a squirrel with an eye for dropped apples keep it lively; Freckles the Appaloosa
// stands by the truck and gives tips, and today's guest (a pricey breed from ranch.guestHorse) waits beside her to be met.
import * as THREE from './vendor/three-0.180.0/three.module.js?v=160';
import {APPLE_COLORS,BASKET_CAPACITY,basketLevel} from './apple-conveyor.mjs?v=160';
import {makeSculptedHorse} from './horse-sculpt.js?v=160';
import {solidCoat,guestHorse} from './ranch.mjs?v=160';
import {horsePortrait as photograph} from './horse-portrait.js?v=160';

export const APPLE_TINTS={green:'#86b545',red:'#cf3f33',orange:'#ec8a2e',yellow:'#ecc843'};
export const LEVEL_COLORS={empty:'#f6f3e8',green:'#5fbf45',orange:'#f29b2c',red:'#e2402f'};
export function appleParts(){
  const v=(x,y)=>new THREE.Vector2(x,y);
  const profile=new THREE.SplineCurve([v(.001,.02),v(.22,.03),v(.45,.15),v(.56,.37),v(.53,.6),v(.4,.76),v(.2,.79),v(.07,.7),v(.001,.66)]).getPoints(30);
  const body=new THREE.LatheGeometry(profile,32);body.computeVertexNormals();
  const stem=new THREE.CylinderGeometry(.022,.034,.24,6);stem.translate(0,.12,0);stem.rotateZ(.28);stem.translate(0,.66,0);
  const leaf=new THREE.SphereGeometry(1,12,6);leaf.scale(.2,.028,.085);leaf.translate(.2,0,0);leaf.rotateZ(.25);leaf.rotateY(.5);leaf.translate(.03,.8,0);
  return [body,stem,leaf];
}

const APPLE_SCALE=.5,BASKET_H=1,BASKET_R0=.72,BASKET_R1=.98,CARRY_Y=.6,BED={x0:3.35,x1:6.45,y:.95,z:.95};
// The baskets stand in a column (first colour furthest back), the belt rig runs parallel on their left, and the
// truck is parked up and to the right. Critters enter and leave past the clearing's sides, SIDES[0] and SIDES[1].
const HOMES=[[0,-.4],[0,1.9],[0,4.2],[0,6.5]],TRUCK_AT=new THREE.Vector3(.4,0,-6.2),HORSE_AT=new THREE.Vector3(8.3,0,-3),GUEST_AT=new THREE.Vector3(6.6,0,-.2),RIG_X=-4.4,SIDES=[-2.8,11.2];
const BED_WORLD={x0:TRUCK_AT.x+BED.x0,x1:TRUCK_AT.x+BED.x1,z0:TRUCK_AT.z-1,z1:TRUCK_AT.z+1};
// Where carried baskets and dropped apples may go: the ground between the belt, the baskets and the truck.
const YARD={x0:-1.7,x1:10.2,z0:TRUCK_AT.z+1.5,z1:8.3};
// Camera poses: looking down on the basket column beside the belt (belt running) and the whole clearing with the
// truck top right (lever pulled). Each fits `half` world units across and `vhalf` up and down its focus rectangle.
const POSES={peek:{pos:new THREE.Vector3(0,13.5,8.4),look:new THREE.Vector3(0,.8,3.05),half:1.3,vhalf:4.7},yard:{pos:new THREE.Vector3(3.3,14.5,12),look:new THREE.Vector3(3.3,.4,.4),half:6.2,vhalf:0}};
// Pile layers inside the basket and then a mound above the rim: [height, ring radius, apples on ring, centre apple].
const LAYERS=[[.04,.4,6,1],[.34,.48,7,1],[.64,.56,8,1],[.94,.56,8,1],[1.22,.48,7,1],[1.48,.36,5,1],[1.72,.22,3,0],[1.94,0,0,1]];
const PILE=(()=>{const slots=[];let seed=7;const rnd=()=>((seed=seed*16807%2147483647)/2147483647);
  LAYERS.forEach(([y,r,n,c],k)=>{if(c)slots.push({x:(rnd()-.5)*.08,y,z:(rnd()-.5)*.08});for(let i=0;i<n;i++){const a=i/n*Math.PI*2+k*.55;slots.push({x:Math.cos(a)*r,y:y+(rnd()-.5)*.06,z:Math.sin(a)*r});}});
  return slots.slice(0,BASKET_CAPACITY).map(s=>({...s,rotY:rnd()*6.28,tiltX:(rnd()-.5)*.6,tiltZ:(rnd()-.5)*.6}));})();
const BED_SLOTS=(()=>{const slots=[];for(let layer=0;layer<3;layer++)for(let i=0;i<6;i++)for(let j=0;j<4;j++)slots.push({x:TRUCK_AT.x+BED.x0+.3+i*.5+(layer%2)*.22,y:BED.y+layer*.32,z:TRUCK_AT.z-.75+j*.5+(layer%2)*.2,rotY:Math.random()*6.28});return slots;})();

// The four shifts of a day. Lights, fog and sky ease between these over a few seconds.
const SKY={
  sunrise:{top:'#7aa2d8',horizon:'#ffc796',glow:'#ffab6b',glowAmount:.9,sunDir:[.55,.07,-.83],sunShow:1,sunColor:'#ffd49a',moonShow:0,stars:0,light:'#ffd9b0',lightI:1.9,sky:'#ffe7cf',ground:'#6c7b4a',hemiI:1.25,fog:'#f2cfaa',fireflies:0,lamps:0,glories:1,birds:1},
  noon:{top:'#2f86e0',horizon:'#bfe4fb',glow:'#ffffff',glowAmount:0,sunDir:[.2,.95,.25],sunShow:0,sunColor:'#ffffff',moonShow:0,stars:0,light:'#fffaf0',lightI:2.6,sky:'#eef7ff',ground:'#6f8550',hemiI:1.6,fog:'#cbe7fa',fireflies:0,lamps:0,glories:.25,birds:1},
  sunset:{top:'#4b4d92',horizon:'#ff9658',glow:'#ff6f3a',glowAmount:1,sunDir:[-.6,.05,-.8],sunShow:1,sunColor:'#ff9a52',moonShow:0,stars:.15,light:'#ffb07a',lightI:1.8,sky:'#ffcdb0',ground:'#5a4a3a',hemiI:1.05,fog:'#e88f6b',fireflies:.25,lamps:.4,glories:.08,birds:1},
  night:{top:'#081226',horizon:'#25406c',glow:'#5d7bb5',glowAmount:.35,sunDir:[.4,.42,-.81],sunShow:0,sunColor:'#ffffff',moonShow:1,stars:1,light:'#9fb7ec',lightI:.75,sky:'#5b70a3',ground:'#1d2a22',hemiI:.65,fog:'#1b2b4a',fireflies:1,lamps:1,glories:.05,birds:0}
};
const COLOR_KEYS=['top','horizon','glow','sunColor','light','sky','ground','fog'],NUM_KEYS=['glowAmount','sunShow','moonShow','stars','lightI','hemiI','fireflies','lamps','glories'];

function grassTexture(){
  const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.fillStyle='#6fa64a';g.fillRect(0,0,256,256);let seed=3;const rnd=()=>((seed=seed*16807%2147483647)/2147483647);
  for(let k=0;k<2200;k++){const x=rnd()*256,y=rnd()*256,h=4+rnd()*9;g.strokeStyle=['#5e9a3e','#7cb553','#86bd5c','#629f42','#9ccc6a'][Math.floor(rnd()*5)];g.lineWidth=1+rnd();g.beginPath();g.moveTo(x,y);g.lineTo(x+(rnd()-.5)*4,y-h);g.stroke();}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(140,140);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
function glowTexture(){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),grad=g.createRadialGradient(64,64,0,64,64,64);grad.addColorStop(0,'#ffffffff');grad.addColorStop(.25,'#ffffffaa');grad.addColorStop(1,'#ffffff00');g.fillStyle=grad;g.fillRect(0,0,128,128);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function wickerTexture(){
  const c=document.createElement('canvas');c.width=256;c.height=128;const g=c.getContext('2d');g.fillStyle='#b88a4e';g.fillRect(0,0,256,128);
  for(let row=0;row<8;row++)for(let col=0;col<9;col++){const x=col*32+(row%2)*16-16,y=row*16;const grad=g.createLinearGradient(0,y,0,y+16);grad.addColorStop(0,'#e3bf83');grad.addColorStop(.55,'#c99b5c');grad.addColorStop(1,'#93683a');g.fillStyle=grad;g.beginPath();g.ellipse(x+16,y+8,15,6.5,0,0,Math.PI*2);g.fill();}
  g.fillStyle='#7d5630';for(let x=0;x<256;x+=32)g.fillRect(x+(x/32%2?0:16)-1,0,2,128);
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(4,1.4);t.colorSpace=THREE.SRGBColorSpace;return t;
}
// Low-poly baskets: nine flat sides with hard edges, to match the faceted trees and hills.
const SIDES_N=9;
function buildBasket(wicker,keep){
  const group=new THREE.Group();
  const shell=new THREE.Mesh(keep(new THREE.LatheGeometry([new THREE.Vector2(.001,.02),new THREE.Vector2(BASKET_R0,0),new THREE.Vector2(BASKET_R0+.06,.5),new THREE.Vector2(BASKET_R1,BASKET_H)],SIDES_N)),wicker);shell.castShadow=shell.receiveShadow=true;group.add(shell);
  const rimMat=keep(new THREE.MeshStandardMaterial({color:'#9b6f3e',roughness:.8,flatShading:true}));const rim=new THREE.Mesh(keep(new THREE.TorusGeometry(BASKET_R1,.07,4,SIDES_N)),rimMat);rim.rotation.set(Math.PI/2,0,Math.PI/2/SIDES_N);rim.position.y=BASKET_H;rim.castShadow=true;group.add(rim);
  const band=keep(new THREE.MeshStandardMaterial({color:LEVEL_COLORS.empty,roughness:.5,emissive:LEVEL_COLORS.empty,emissiveIntensity:.15,flatShading:true}));const ring=new THREE.Mesh(keep(new THREE.TorusGeometry(BASKET_R1-.02,.065,4,SIDES_N)),band);ring.rotation.set(Math.PI/2,0,Math.PI/2/SIDES_N);ring.position.y=BASKET_H+.08;group.add(ring);
  const foot=new THREE.Mesh(keep(new THREE.TorusGeometry(BASKET_R0+.02,.05,4,SIDES_N)),rimMat);foot.rotation.set(Math.PI/2,0,Math.PI/2/SIDES_N);foot.position.y=.05;group.add(foot);
  for(const side of [-1,1]){const handle=new THREE.Mesh(keep(new THREE.TorusGeometry(.17,.04,4,5,Math.PI)),rimMat);handle.position.set(side*(BASKET_R1+.02),BASKET_H-.24,0);handle.rotation.set(0,Math.PI/2,side*Math.PI/2);group.add(handle);}
  return {group,band};
}
function buildTruck(keep){
  const truck=new THREE.Group(),paint=keep(new THREE.MeshStandardMaterial({color:'#5d89a8',roughness:.55})),dark=keep(new THREE.MeshStandardMaterial({color:'#2d3439',roughness:.9})),glass=keep(new THREE.MeshStandardMaterial({color:'#9fc4d4',roughness:.15,metalness:.2})),chrome=keep(new THREE.MeshStandardMaterial({color:'#d9d6cc',roughness:.3,metalness:.6})),wood=keep(new THREE.MeshStandardMaterial({color:'#a77a4c',roughness:.85}));
  const box=(w,h,d,mat,x,y,z)=>{const m=new THREE.Mesh(keep(new THREE.BoxGeometry(w,h,d)),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;truck.add(m);return m;};
  box(6.6,.35,2.1,dark,6.4,.62,0);
  box(BED.x1-BED.x0,.12,2.0,wood,(BED.x0+BED.x1)/2,BED.y-.06,0);
  box(.12,.75,2.1,paint,BED.x0-.06,BED.y+.3,0);box(.12,.75,2.1,paint,BED.x1+.06,BED.y+.3,0);
  for(const z of [-1.02,1.02])box(BED.x1-BED.x0+.24,.75,.1,paint,(BED.x0+BED.x1)/2,BED.y+.3,z);
  box(1.9,1.55,2.0,paint,7.5,1.62,0);box(.06,.8,1.7,glass,6.53,1.95,0);box(1.5,.7,.04,glass,7.45,1.95,1.01);box(.06,.75,1.7,glass,8.47,1.92,0);
  box(1.4,.85,1.95,paint,9.15,1.25,0);box(.1,.28,2.15,chrome,9.9,.78,0);box(.06,.2,.3,chrome,9.86,1.35,.65);box(.06,.2,.3,chrome,9.86,1.35,-.65);
  for(const [x,z] of [[4.2,1],[4.2,-1],[8.7,1],[8.7,-1]]){const wheel=new THREE.Mesh(keep(new THREE.CylinderGeometry(.5,.5,.38,20)),dark);wheel.rotation.x=Math.PI/2;wheel.position.set(x,.5,z);wheel.castShadow=true;truck.add(wheel);const hub=new THREE.Mesh(keep(new THREE.CylinderGeometry(.2,.2,.4,12)),chrome);hub.rotation.x=Math.PI/2;hub.position.set(x,.5,z);truck.add(hub);}
  // Headlights glow at dusk and night.
  const lamp=keep(new THREE.MeshBasicMaterial({color:'#fff6cf'})),halo=keep(new THREE.SpriteMaterial({map:keep(glowTexture()),color:'#ffe9a6',transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));
  for(const z of [.65,-.65]){const bulb=new THREE.Mesh(keep(new THREE.SphereGeometry(.13,12,8)),lamp);bulb.position.set(9.93,1.35,z);truck.add(bulb);const s=new THREE.Sprite(halo);s.scale.set(2.2,2.2,1);s.position.set(10.1,1.35,z);truck.add(s);}
  return {truck,lamp,halo};
}
function buildSquirrel(keep){
  const g=new THREE.Group(),body=new THREE.Group(),mat=c=>keep(new THREE.MeshStandardMaterial({color:c,roughness:.9})),fur=mat('#8f5c37'),light=mat('#d8b28a'),tailFur=mat('#a46d42'),dark=mat('#241a14');
  const ball=(parent,m,x,y,z,sx,sy,sz)=>{const s=new THREE.Mesh(keep(new THREE.SphereGeometry(1,12,8)),m);s.position.set(x,y,z);s.scale.set(sx,sy,sz);s.castShadow=true;parent.add(s);return s;};
  g.add(body);ball(body,fur,0,.24,0,.2,.19,.28);ball(body,light,0,.21,.1,.13,.13,.17);
  const head=new THREE.Group();head.position.set(0,.4,.24);body.add(head);ball(head,fur,0,0,0,.14,.13,.15);ball(head,light,0,-.04,.1,.08,.06,.07);ball(head,dark,0,-.02,.17,.025,.022,.02);
  for(const s of [-1,1]){ball(head,fur,s*.07,.13,-.02,.035,.07,.03);ball(head,dark,s*.085,.04,.1,.025,.03,.02);}
  const tail=new THREE.Group();tail.position.set(0,.28,-.24);body.add(tail);[[0,.02,-.05,.1],[0,.18,-.16,.13],[0,.38,-.2,.15],[0,.56,-.13,.15],[0,.66,0,.12]].forEach(([x,y,z,r])=>ball(tail,tailFur,x,y,z,r,r*1.05,r));
  for(const [x,z] of [[-.1,.16],[.1,.16],[-.12,-.12],[.12,-.12]])ball(body,fur,x,.06,z,.05,.06,.07);
  const mouth=new THREE.Object3D();mouth.position.set(0,.36,.42);body.add(mouth);g.scale.setScalar(1.7);g.visible=false;
  return {group:g,body,head,tail,mouth};
}
// The night raccoon: grey, masked, with a ringed tail. Bigger and slower than the squirrel.
function buildRaccoon(keep){
  const g=new THREE.Group(),body=new THREE.Group(),mat=c=>keep(new THREE.MeshStandardMaterial({color:c,roughness:.92})),fur=mat('#86837d'),light=mat('#d6d1c6'),dark=mat('#2b2927');
  const ball=(parent,m,x,y,z,sx,sy,sz)=>{const s=new THREE.Mesh(keep(new THREE.SphereGeometry(1,12,8)),m);s.position.set(x,y,z);s.scale.set(sx,sy,sz);s.castShadow=true;parent.add(s);return s;};
  g.add(body);ball(body,fur,0,.3,0,.28,.25,.38);ball(body,light,0,.24,.1,.18,.16,.24);
  const head=new THREE.Group();head.position.set(0,.5,.36);body.add(head);ball(head,fur,0,0,0,.2,.17,.18);ball(head,light,0,-.05,.13,.1,.07,.1);ball(head,dark,0,-.03,.23,.035,.03,.03);
  ball(head,dark,0,.03,.12,.2,.055,.07);const shine=keep(new THREE.MeshBasicMaterial({color:'#fff1a8'}));for(const s of [-1,1]){ball(head,light,s*.08,.1,.12,.05,.03,.03);ball(head,shine,s*.075,.035,.18,.028,.028,.02);ball(head,fur,s*.12,.17,-.03,.06,.07,.035);}
  const tail=new THREE.Group();tail.position.set(0,.28,-.36);body.add(tail);for(let k=0;k<6;k++)ball(tail,k%2?dark:fur,0,.04*k,-.1-k*.1,.11-k*.006,.11-k*.006,.07);
  for(const [x,z] of [[-.14,.22],[.14,.22],[-.16,-.18],[.16,-.18]])ball(body,dark,x,.07,z,.065,.08,.08);
  g.scale.setScalar(1.9);g.visible=false;return {group:g,body,head,tail};
}
function buildBird(keep,mat){
  const g=new THREE.Group(),body=new THREE.Mesh(keep(new THREE.SphereGeometry(1,8,6)),mat);body.scale.set(.32,.14,.14);g.add(body);
  const wings=[-1,1].map(s=>{const pivot=new THREE.Group();pivot.position.set(0,.04,s*.06);const w=new THREE.Mesh(keep(new THREE.BoxGeometry(.3,.025,.5)),mat);w.position.set(0,0,s*.26);pivot.add(w);g.add(pivot);return pivot;});
  return {group:g,wings};
}

// Freckles, the barn games' tips horse: a spotted Appaloosa, the same sculpted horse as the world.
export const FRECKLES={id:'freckles',breedId:'appaloosa',coat:{...solidCoat('bay'),spots:1,blanket:.8,blaze:true}};
// Her portrait for other barn games' tips button.
export const horsePortrait=()=>photograph(FRECKLES,{shot:'body',w:360,h:320});

export function createYard(container,{onSpill=()=>[],onDeliver=()=>{},onRecover=()=>{},onSquirrel=()=>{},canDrag=()=>true,focus=()=>null}={}){
  const disposables=[],keep=x=>(disposables.push(x),x);
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const canvas=renderer.domElement;canvas.className='apple-yard-canvas';container.prepend(canvas);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,.5,.3,900);
  scene.fog=new THREE.Fog('#cbe7fa',45,330);
  const hemi=new THREE.HemisphereLight('#eef7ff','#6f8550',1.6);scene.add(hemi);
  const sun=new THREE.DirectionalLight('#fffaf0',2.6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:1,far:80});sun.shadow.bias=-.0008;sun.target.position.set(3,0,0);scene.add(sun,sun.target);

  // Sky dome with a horizon glow toward the sun, the sun or moon itself, and stars.
  const skyU={top:{value:new THREE.Color()},horizon:{value:new THREE.Color()},glow:{value:new THREE.Color()},sunDir:{value:new THREE.Vector3(0,1,0)},glowAmount:{value:0}};
  const sky=new THREE.Mesh(keep(new THREE.SphereGeometry(500,32,16)),keep(new THREE.ShaderMaterial({uniforms:skyU,side:THREE.BackSide,depthWrite:false,fog:false,
    vertexShader:'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform vec3 top,horizon,glow,sunDir;uniform float glowAmount;varying vec3 vDir;void main(){vec3 d=normalize(vDir);float h=max(d.y,0.);vec3 c=mix(horizon,top,pow(h,.5));float g=pow(max(dot(d,normalize(sunDir)),0.),5.)*glowAmount*(1.-h*.7);gl_FragColor=vec4(mix(c,glow,clamp(g,0.,1.)),1.);\n#include <colorspace_fragment>\n}'})));
  sky.renderOrder=-2;scene.add(sky);
  const glowMap=keep(glowTexture());
  const sunDisc=new THREE.Mesh(keep(new THREE.CircleGeometry(16,40)),keep(new THREE.MeshBasicMaterial({color:'#ffe2a8',fog:false,transparent:true,depthWrite:false})));
  const sunHalo=new THREE.Sprite(keep(new THREE.SpriteMaterial({map:glowMap,color:'#ffcf8a',fog:false,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending})));sunHalo.scale.set(150,150,1);
  const moonDisc=new THREE.Mesh(keep(new THREE.CircleGeometry(10,40)),keep(new THREE.MeshBasicMaterial({color:'#f3f0dc',fog:false,transparent:true,depthWrite:false})));
  const moonHalo=new THREE.Sprite(keep(new THREE.SpriteMaterial({map:glowMap,color:'#9fb5ea',fog:false,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending})));moonHalo.scale.set(90,90,1);
  for(const x of [sunDisc,sunHalo,moonDisc,moonHalo]){x.renderOrder=-1;scene.add(x);}
  const starGeo=keep(new THREE.BufferGeometry()),starPos=[];{let seed=17;const rnd=()=>((seed=seed*16807%2147483647)/2147483647);for(let k=0;k<700;k++){const a=rnd()*Math.PI*2,y=.04+rnd()*.96,r=Math.sqrt(1-y*y);starPos.push(Math.cos(a)*r*460,y*460,Math.sin(a)*r*460);}}
  starGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPos,3));const stars=new THREE.Points(starGeo,keep(new THREE.PointsMaterial({color:'#ffffff',size:1.7,sizeAttenuation:false,fog:false,transparent:true,opacity:0,depthWrite:false})));stars.renderOrder=-1;scene.add(stars);

  // Grass all the way to the horizon, tufts up close, hills, an orchard, a barn and a fence.
  const ground=new THREE.Mesh(keep(new THREE.PlaneGeometry(1200,1200)),keep(new THREE.MeshStandardMaterial({map:keep(grassTexture()),roughness:1})));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  const matOf={};const flat=c=>matOf[c]||(matOf[c]=keep(new THREE.MeshStandardMaterial({color:c,roughness:.95,flatShading:true})));
  let seed=29;const rnd=()=>((seed=seed*16807%2147483647)/2147483647);
  {const tuft=keep(new THREE.ConeGeometry(.07,.42,3));tuft.translate(0,.2,0);const n=900,tufts=new THREE.InstancedMesh(tuft,keep(new THREE.MeshStandardMaterial({roughness:1})),n),m=new THREE.Matrix4(),q=new THREE.Quaternion(),c=new THREE.Color();
    for(let k=0;k<n;k++){const x=3+(rnd()-.5)*30,z=-12+rnd()*22;q.setFromEuler(new THREE.Euler((rnd()-.5)*.5,rnd()*6,(rnd()-.5)*.5));const s=.6+rnd()*.9;m.compose(new THREE.Vector3(x,0,z),q,new THREE.Vector3(s,s*(.7+rnd()*.8),s));tufts.setMatrixAt(k,m);tufts.setColorAt(k,c.set(['#5f9b3c','#78b34f','#8cc05f','#6aa846'][k%4]));}
    tufts.receiveShadow=true;scene.add(tufts);
    const daisy=keep(new THREE.SphereGeometry(.07,6,4)),flowers=new THREE.InstancedMesh(daisy,keep(new THREE.MeshStandardMaterial({roughness:.8})),120);for(let k=0;k<120;k++){m.makeTranslation(3+(rnd()-.5)*26,.12,-11+rnd()*19);flowers.setMatrixAt(k,m);flowers.setColorAt(k,c.set(['#fffaf0','#ffe27a','#f6c4dd'][k%3]));}scene.add(flowers);}
  for(const [x,z,rx,ry,col] of [[-140,-260,150,46,'#6a9750'],[70,-300,190,62,'#5c874a'],[230,-240,140,40,'#77a258'],[-40,-200,100,26,'#83ab5d'],[150,-180,80,20,'#8cb765'],[-210,-190,90,24,'#7fa95a']]){const h=new THREE.Mesh(keep(new THREE.IcosahedronGeometry(1,3)),flat(col));h.scale.set(rx,ry,rx*.5);h.position.set(x,-ry*.15,z);scene.add(h);}
  // The orchard: rows of apple trees on the horizon and a ring of big, heavily laden trees around the clearing,
  // with windfalls in the grass beneath them.
  {const trunk=keep(new THREE.CylinderGeometry(.18,.26,1.7,6));trunk.translate(0,.85,0);const crown=keep(new THREE.IcosahedronGeometry(1.5,1)),fruit=keep(new THREE.SphereGeometry(.16,6,4));const spots=[];
    for(let row=0;row<5;row++)for(let x=-44;x<=50;x+=6.5){const px=x+(rnd()-.5)*2+(row%2)*3,pz=-22-row*8+(rnd()-.5)*2;spots.push([px,pz,.85+rnd()*.35,7]);}
    for(let z=-14;z<=12;z+=3.4){spots.push([-9.4+(rnd()-.5)*1.2,z+(rnd()-.5)*1.2,1.25+rnd()*.3,16]);spots.push([15.2+(rnd()-.5)*1.2,z+(rnd()-.5)*1.2,1.25+rnd()*.3,16]);}
    for(let x=-6;x<=13;x+=3.6)spots.push([x+(rnd()-.5)*1.2,-14.5+(rnd()-.5)*1.4,1.3+rnd()*.3,16]);
    const nFruit=spots.reduce((n,s)=>n+s[3],0),windfalls=spots.filter(s=>s[3]>7).length*3;
    const trunks=new THREE.InstancedMesh(trunk,flat('#7a5a3c'),spots.length),crowns=new THREE.InstancedMesh(crown,keep(new THREE.MeshStandardMaterial({roughness:.95,flatShading:true})),spots.length),fruits=new THREE.InstancedMesh(fruit,keep(new THREE.MeshStandardMaterial({roughness:.7,flatShading:true})),nFruit+windfalls),m=new THREE.Matrix4(),c=new THREE.Color();
    let f=0;const fruitTint=()=>c.set(['#d2463a','#c93b30','#e0563f','#9fc04e','#e8a33a'][Math.floor(rnd()*5)]);
    spots.forEach(([x,z,s,n],k)=>{m.makeScale(s,s,s).setPosition(x,0,z);trunks.setMatrixAt(k,m);m.makeScale(s*1.15,s,s*1.15).setPosition(x,2.4*s,z);crowns.setMatrixAt(k,m);crowns.setColorAt(k,c.set(['#4f8a3a','#5d9842','#46803a'][k%3]));
      for(let j=0;j<n;j++){const a=rnd()*6.28,b=rnd()*1.2-.3;m.makeTranslation(x+Math.cos(a)*1.5*s*Math.cos(b),2.4*s+Math.sin(b)*1.35*s,z+Math.sin(a)*1.5*s*Math.cos(b));fruits.setMatrixAt(f,m);fruits.setColorAt(f++,fruitTint());}
      if(n>7)for(let j=0;j<3;j++){const a=rnd()*6.28,r=.6+rnd()*1.6;m.makeTranslation(x+Math.cos(a)*r,.13,z+Math.sin(a)*r);fruits.setMatrixAt(f,m);fruits.setColorAt(f++,fruitTint());}});
    for(const mesh of [trunks,crowns,fruits])mesh.castShadow=true;scene.add(trunks,crowns,fruits);}
  // The sorting rig: the belt on a wooden frame, a picker bin of fresh apples at the near end feeding it, a
  // compost bin under the spill end, and the gear box the lever drives. The board above is this belt, seen from overhead.
  // It only shows once the real belt starts sliding away, so wide screens never see two belts side by side.
  const rig=new THREE.Group();scene.add(rig);
  {const wood=flat('#b08d64'),dark=flat('#7d6346'),beltTop=flat('#8f9a78'),z0=-7.6,z1=9.6,zc=(z0+z1)/2,len=z1-z0;
    const box=(w,h,d,mat,x,y,z)=>{const b=new THREE.Mesh(keep(new THREE.BoxGeometry(w,h,d)),mat);b.position.set(x,y,z);b.castShadow=b.receiveShadow=true;rig.add(b);return b;};
    box(5.3,.1,len,beltTop,RIG_X,1.6,zc);for(const s of [-1,1])box(.28,.42,len+.4,wood,RIG_X+s*2.78,1.62,zc);
    for(let z=z0+.5;z<=z1;z+=3.4){for(const s of [-1,1])box(.24,1.5,.24,dark,RIG_X+s*2.55,.75,z);box(5.1,.14,.14,dark,RIG_X,.45,z);}
    box(.8,.85,1.1,flat('#6d7a5a'),RIG_X+3.25,1.1,-5.2);const crank=box(.12,.7,.12,flat('#c43d2c'),RIG_X+3.7,1.6,-5.2);crank.rotation.z=-.5;
    // Compost bin under the spill end.
    for(const z of [z0-2.6,z0-.35])box(5.6,1,.16,dark,RIG_X,.5,z);for(const s of [-1,1])box(.16,1,2.3,dark,RIG_X+s*2.72,.5,z0-1.47);box(5.3,.1,2.1,flat('#5a3f27'),RIG_X,.82,z0-1.47);
    // Picker bin heaped with apples at the near end.
    const bz=z1+1.7;for(const z of [bz-1.5,bz+1.5])box(5.8,1.9,.18,wood,RIG_X,.95,z);for(const s of [-1,1])box(.18,1.9,3.2,wood,RIG_X+s*2.9,.95,bz);
    const heap=keep(new THREE.SphereGeometry(.26,7,5)),n=90,apples=new THREE.InstancedMesh(heap,keep(new THREE.MeshStandardMaterial({roughness:.6,flatShading:true})),n),m=new THREE.Matrix4(),c=new THREE.Color();
    for(let k=0;k<n;k++){const u=rnd()*2-1,v=rnd()*2-1,y=1.4+(1-Math.max(Math.abs(u),Math.abs(v)))*.7+rnd()*.15;m.makeTranslation(RIG_X+u*2.55,y,bz+v*1.25);apples.setMatrixAt(k,m);apples.setColorAt(k,c.set(APPLE_TINTS[APPLE_COLORS[k%4]]));}
    apples.castShadow=true;rig.add(apples);}
  {const barn=new THREE.Group();const red=flat('#b8473a'),white=flat('#f3ece0'),roof=flat('#5b4a46');
    const b=new THREE.Mesh(keep(new THREE.BoxGeometry(12,7,9)),red);b.position.y=3.5;barn.add(b);
    const r=new THREE.Mesh(keep(new THREE.CylinderGeometry(6.6,6.6,9.4,3,1)),roof);r.rotation.set(Math.PI/2,0,Math.PI/2);r.scale.set(1,1,.62);r.position.y=8.6;barn.add(r);
    const door=new THREE.Mesh(keep(new THREE.BoxGeometry(4,4.4,.2)),white);door.position.set(0,2.2,4.55);barn.add(door);const inner=new THREE.Mesh(keep(new THREE.BoxGeometry(3.4,3.8,.22)),red);inner.position.set(0,2.2,4.58);barn.add(inner);
    for(const s of [-1,1]){const x=new THREE.Mesh(keep(new THREE.BoxGeometry(.25,5,.24)),white);x.position.set(0,2.2,4.62);x.rotation.z=s*.7;barn.add(x);}
    const silo=new THREE.Mesh(keep(new THREE.CylinderGeometry(2.2,2.2,11,16)),flat('#c9c3b5'));silo.position.set(8.5,5.5,-1);barn.add(silo);const dome=new THREE.Mesh(keep(new THREE.SphereGeometry(2.2,16,8,0,Math.PI*2,0,Math.PI/2)),roof);dome.position.set(8.5,11,-1);barn.add(dome);
    barn.position.set(-24,0,-62);barn.rotation.y=.35;scene.add(barn);}
  // Fence behind the truck, with morning glory vines that open at sunrise.
  const glories=[];
  {const wood=flat('#b08d64'),vine=flat('#4f8a3a'),leaf=keep(new THREE.MeshStandardMaterial({color:'#5a9a44',roughness:.8,side:THREE.DoubleSide}));
    const trumpet=keep(new THREE.CylinderGeometry(.24,.03,.26,12,1,true));trumpet.rotateX(Math.PI/2);trumpet.translate(0,0,.13);const eye=keep(new THREE.CircleGeometry(.07,10));eye.translate(0,0,.05);
    const petals=['#5f74e8','#8a62de','#4f8fe6','#b06ad6'].map(c=>keep(new THREE.MeshStandardMaterial({color:c,roughness:.6,side:THREE.DoubleSide,emissive:c,emissiveIntensity:.08}))),throat=keep(new THREE.MeshStandardMaterial({color:'#fff8e8',side:THREE.DoubleSide}));
    const bloom=(x,y,z,k,size=1)=>{const f=new THREE.Group();f.position.set(x,y,z);f.rotation.set((rnd()-.5)*.6,(rnd()-.5)*.8,0);f.userData.size=size;const t=new THREE.Mesh(trumpet,petals[k%4]);const e=new THREE.Mesh(eye,throat);f.add(t,e);scene.add(f);glories.push(f);
      for(let j=0;j<2;j++){const l=new THREE.Mesh(keep(new THREE.SphereGeometry(1,8,6)),leaf);l.scale.set(.2*size,.03,.16*size);l.position.set(x+(rnd()-.5)*.6*size,y-.2*size+(rnd()-.5)*.3,z+.02);l.rotation.set(1.2,rnd()*6,0);scene.add(l);}};
    for(let x=-30;x<=30;x+=2.5){const post=new THREE.Mesh(keep(new THREE.BoxGeometry(.2,1.4,.2)),wood);post.position.set(x,.7,-11.5);post.castShadow=true;scene.add(post);
      if(Math.abs(x)<16&&rnd()<.75){const v=new THREE.Mesh(keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([0,1,2,3].map(i=>new THREE.Vector3(x+Math.sin(i*1.7)*.16,i*.42,-11.38))),12,.03,5)),vine);scene.add(v);for(let k=0;k<3;k++)bloom(x+(rnd()-.5)*.5,.45+k*.38+rnd()*.15,-11.25,Math.floor(rnd()*4),1.3);}}
    for(const y of [.55,1.1]){const rail=new THREE.Mesh(keep(new THREE.BoxGeometry(60,.12,.08)),wood);rail.position.set(0,y,-11.5);scene.add(rail);}
    // Two vines on stakes at the ends of the basket column.
    for(const [x,z] of [[1.6,8.1],[-1.5,-2.3]]){const stake=new THREE.Mesh(keep(new THREE.BoxGeometry(.08,1.3,.08)),wood);stake.position.set(x,.65,z);scene.add(stake);for(let k=0;k<5;k++)bloom(x+(rnd()-.5)*.6,.3+k*.22,z+.12,k);}}

  const wicker=keep(new THREE.MeshStandardMaterial({map:keep(wickerTexture()),roughness:.9,side:THREE.DoubleSide,flatShading:true}));
  const baskets=APPLE_COLORS.map((color,i)=>{const {group,band}=buildBasket(wicker,keep);const home=new THREE.Vector3(HOMES[i][0],0,HOMES[i][1]);group.position.copy(home);scene.add(group);
    return {color,i,group,band,count:0,home,pos:home.clone(),vel:new THREE.Vector3(),target:null,theta:0,omega:0,phi:0,omegaPhi:0,spillClock:0,dragging:false,returning:false,tipped:0,looks:PILE.map(()=>.92+Math.random()*.14)};});
  const {truck,lamp,halo}=buildTruck(keep);truck.position.copy(TRUCK_AT);scene.add(truck);
  const bedGlow=keep(new THREE.MeshBasicMaterial({color:'#fff4b0',transparent:true,opacity:0}));const glow=new THREE.Mesh(keep(new THREE.BoxGeometry(BED.x1-BED.x0,.02,1.9)),bedGlow);glow.position.set((BED.x0+BED.x1)/2,BED.y+.01,0);truck.add(glow);

  // Freckles the Appaloosa stands at the back of the truck; today's guest stands a little further along.
  const sculpt=h=>{const m=makeSculptedHorse(THREE,h,{geometry:keep});m.setGait('stand');m.root.traverse(o=>{if(o.isMesh)o.castShadow=true;});scene.add(m.root);return m;};
  const horse=sculpt(FRECKLES);horse.root.position.copy(HORSE_AT);horse.root.rotation.y=-.75;horse.root.scale.multiplyScalar(.8);
  const guestInfo=guestHorse('apple'),guest=sculpt(guestInfo);guest.root.position.copy(GUEST_AT);guest.root.rotation.y=-.35;guest.root.scale.multiplyScalar(.8);
  let horseMood=null,horseClock=0;const horseHits=[],guestHits=[];horse.root.traverse(o=>{if(o.isMesh)horseHits.push(o);});guest.root.traverse(o=>{if(o.isMesh)guestHits.push(o);});

  const MAX=APPLE_COLORS.length*BASKET_CAPACITY+BED_SLOTS.length+80;
  const [bodyGeo,stemGeo,leafGeo]=appleParts().map(keep);
  const bodies=new THREE.InstancedMesh(bodyGeo,keep(new THREE.MeshPhysicalMaterial({roughness:.42,clearcoat:.35,clearcoatRoughness:.4})),MAX),stems=new THREE.InstancedMesh(stemGeo,keep(new THREE.MeshStandardMaterial({color:'#6b4f31',roughness:.9})),MAX),leaves=new THREE.InstancedMesh(leafGeo,keep(new THREE.MeshStandardMaterial({color:'#5f8f3e',roughness:.7,side:THREE.DoubleSide})),MAX);
  for(const mesh of [bodies,stems,leaves]){mesh.castShadow=true;mesh.frustumCulled=false;scene.add(mesh);}
  const base=Object.fromEntries(APPLE_COLORS.map(c=>[c,new THREE.Color(APPLE_TINTS[c])])),tmp=new THREE.Color(),m=new THREE.Matrix4(),local=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),p=new THREE.Vector3(),one=new THREE.Vector3(APPLE_SCALE,APPLE_SCALE,APPLE_SCALE);
  let bed=[],loose=[],landing=[],hoverBed=false,time=0,live=false,reveal=0;

  // Birds in the day, fireflies at night, and a squirrel with an eye for dropped apples.
  const birdMat=keep(new THREE.MeshStandardMaterial({color:'#3c3a46',roughness:.8}));let flocks=[],nextFlock=5;
  const fireGeo=keep(new THREE.BufferGeometry()),fireN=60,fireBase=[],firePos=new Float32Array(fireN*3),fireCol=new Float32Array(fireN*3);
  for(let k=0;k<fireN;k++)fireBase.push({x:3+(rnd()-.5)*24,y:.3+rnd()*2.2,z:-10+rnd()*15,ph:rnd()*20,rate:.6+rnd()*1.4});
  fireGeo.setAttribute('position',new THREE.BufferAttribute(firePos,3));fireGeo.setAttribute('color',new THREE.BufferAttribute(fireCol,3));
  const fireflies=new THREE.Points(fireGeo,keep(new THREE.PointsMaterial({size:7,sizeAttenuation:false,vertexColors:true,map:glowMap,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false})));fireflies.frustumCulled=false;scene.add(fireflies);
  const squirrel=buildSquirrel(keep);scene.add(squirrel.group);
  const sq={mode:'off',wait:1.2,side:1,goal:new THREE.Vector3(),apple:null,carried:null,clock:0,speed:4.2,wander:false};
  // At night a raccoon ambles across the path to the truck: carried baskets bump into it and must go around.
  const raccoon=buildRaccoon(keep);scene.add(raccoon.group);const RACCOON_R=1.45;
  const rc={mode:'off',wait:2,goal:new THREE.Vector3(),speed:1.4,clock:0,bump:0};
  const raccoonGoal=()=>rc.goal.set(1.9+Math.random()*4.8,0,TRUCK_AT.z+2.3+Math.random()*7);
  function raccoonStep(dt){const g=raccoon.group;
    if(rc.mode==='off'){g.visible=false;if(!live||phase!=='night')return;rc.wait-=dt;if(rc.wait>0)return;g.position.set(SIDES[Math.random()<.5?0:1],0,TRUCK_AT.z+2.6+Math.random()*4);g.visible=true;rc.mode='walk';rc.speed=1.4;raccoonGoal();return;}
    if(phase!=='night'&&rc.mode!=='flee')shooRaccoon(false);
    const d=p.subVectors(rc.goal,g.position);d.y=0;const dist=d.length();
    if(rc.bump>0){rc.bump-=dt;raccoon.body.rotation.x=-Math.min(.45,rc.bump);}else raccoon.body.rotation.x=0;
    if(rc.mode==='sit'){rc.clock-=dt;raccoon.body.position.y=0;raccoon.tail.rotation.y=Math.sin(time*2.2)*.35;raccoon.head.rotation.y=Math.sin(time*.9)*.5;if(rc.clock<=0){rc.mode='walk';raccoonGoal();}}
    else if(dist>.2){d.multiplyScalar(Math.min(dist,rc.speed*dt)/dist);g.position.add(d);g.rotation.y=Math.atan2(d.x,d.z);raccoon.head.rotation.y=0;raccoon.body.position.y=Math.abs(Math.sin(time*(rc.mode==='flee'?15:7)))*.05;}
    else if(rc.mode==='flee'){g.visible=false;rc.mode='off';rc.wait=5+Math.random()*4;}
    else{rc.mode='sit';rc.clock=1.2+Math.random()*2.6;}}
  function shooRaccoon(cheer=true){if(rc.mode==='off'||rc.mode==='flee')return;const g=raccoon.group.position;rc.mode='flee';rc.speed=6.5;rc.goal.set(g.x<4?SIDES[0]-.4:SIDES[1]+.4,0,g.z);if(cheer)react('cheer');}

  const labels=APPLE_COLORS.map(color=>{const el=document.createElement('div');el.className='apple-basket-label';el.innerHTML=`<b>0</b><small>${color}</small>`;container.appendChild(el);return el;});
  const pileTop=b=>b.count?PILE[b.count-1].y+.42:0;
  function setLevel(b){const level=basketLevel(b.count);b.level=level;b.band.color.set(LEVEL_COLORS[level]);b.band.emissive.set(LEVEL_COLORS[level]);labels[b.i].querySelector('b').textContent=String(b.count);labels[b.i].dataset.level=level;labels[b.i].setAttribute('aria-label',`${b.color} basket, ${b.count} apples, ${level==='empty'?'empty':level==='green'?'easy to carry':level==='orange'?'getting tall':'dangerously full'}`);}
  baskets.forEach(setLevel);

  // Time of day: ease every light and colour toward the shift's sky.
  const look={};for(const k of COLOR_KEYS)look[k]=new THREE.Color(SKY.noon[k]);for(const k of NUM_KEYS)look[k]=SKY.noon[k];look.sunDir=new THREE.Vector3(...SKY.noon.sunDir).normalize();
  let from=null,to=SKY.noon,blend=1,phase='noon';
  function setPhase(name,instant=false){if(!SKY[name])return;phase=name;from={...Object.fromEntries(COLOR_KEYS.map(k=>[k,look[k].clone()])),...Object.fromEntries(NUM_KEYS.map(k=>[k,look[k]])),sunDir:look.sunDir.clone()};to=SKY[name];blend=instant?1:0;applyLook(instant?1:0);}
  function applyLook(t){const s=t*t*(3-2*t),f=from||{...look};
    for(const k of COLOR_KEYS)look[k].copy(f[k]).lerp(tmp.set(to[k]),s);for(const k of NUM_KEYS)look[k]=f[k]+(to[k]-f[k])*s;
    look.sunDir.copy(f.sunDir).lerp(p.set(...to.sunDir).normalize(),s).normalize();
    skyU.top.value.copy(look.top);skyU.horizon.value.copy(look.horizon);skyU.glow.value.copy(look.glow);skyU.glowAmount.value=look.glowAmount;skyU.sunDir.value.copy(look.sunDir);
    scene.fog.color.copy(look.fog);hemi.color.copy(look.sky);hemi.groundColor.copy(look.ground);hemi.intensity=look.hemiI;sun.color.copy(look.light);sun.intensity=look.lightI;
    const lit=p.copy(look.sunDir);lit.y=Math.max(lit.y,.5);lit.normalize();sun.position.copy(lit).multiplyScalar(30).add(sun.target.position);
    sunDisc.material.color.copy(look.sunColor);sunDisc.material.opacity=look.sunShow;sunHalo.material.color.copy(look.sunColor);sunHalo.material.opacity=look.sunShow*.8;sunDisc.visible=sunHalo.visible=look.sunShow>.01;
    moonDisc.material.opacity=look.moonShow;moonHalo.material.opacity=look.moonShow*.6;moonDisc.visible=moonHalo.visible=look.moonShow>.01;stars.material.opacity=look.stars;stars.visible=look.stars>.01;
    lamp.color.setRGB(.55+.45*look.lamps,.53+.45*look.lamps,.45+.4*look.lamps);halo.opacity=look.lamps*.9;
    for(const f of glories){const o=look.glories,s=f.userData.size;f.scale.set((.3+.7*o)*s,(.3+.7*o)*s,(1.2-.2*o)*s);}}
  function placeSkyBodies(){const c=camera.position;sky.position.copy(c);stars.position.copy(c);
    sunDisc.position.copy(c).addScaledVector(look.sunDir,440);sunDisc.lookAt(c);sunHalo.position.copy(sunDisc.position);
    const moonDir=p.set(...SKY.night.sunDir).normalize();moonDisc.position.copy(c).addScaledVector(moonDir,440);moonDisc.lookAt(c);moonHalo.position.copy(moonDisc.position);}

  // Camera: blend from the basket column beside the belt to the whole clearing, framed inside the focus
  // rectangle (the part of the screen the yard owns); the rest of the canvas simply continues the same world.
  const camLook=new THREE.Vector3();let size={w:0,h:0};
  function aim(){const w=size.w,h=size.h;if(!w||!h)return;const f=focus(reveal)||{x:0,y:0,w,h},aspect=Math.max(.15,f.w/Math.max(1,f.h)),t=reveal*reveal*(3-2*reveal),A=POSES.peek,B=POSES.yard;
    camera.position.lerpVectors(A.pos,B.pos,t);camLook.lerpVectors(A.look,B.look,t);camera.lookAt(camLook);const half=A.half+(B.half-A.half)*t,vhalf=A.vhalf+(B.vhalf-A.vhalf)*t,dist=camera.position.distanceTo(camLook);
    const tanV=Math.max(Math.tan(THREE.MathUtils.degToRad(t<.5?7:18)),half/dist/aspect,vhalf/dist);camera.fov=Math.min(100,2*THREE.MathUtils.radToDeg(Math.atan(tanV)));camera.aspect=aspect;camera.setViewOffset(f.w,f.h,-f.x,-f.y,w,h);camera.updateProjectionMatrix();}
  function resize(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;size={w,h};renderer.setSize(w,h,false);aim();draw();}

  function slotWorld(b,k,out){local.makeRotationFromEuler(e.set(PILE[k].tiltX,PILE[k].rotY,PILE[k].tiltZ));local.setPosition(PILE[k].x,PILE[k].y,PILE[k].z);return out.multiplyMatrices(b.group.matrixWorld,local);}
  function draw(){
    let n=0;const put=(matrix,color,shade=1)=>{if(n>=MAX)return;m.copy(matrix).scale(one);bodies.setMatrixAt(n,m);stems.setMatrixAt(n,m);leaves.setMatrixAt(n,m);bodies.setColorAt(n,tmp.copy(base[color]).multiplyScalar(shade));n++;};
    for(const b of baskets){b.group.position.copy(b.pos);b.group.rotation.set(b.phi,0,b.theta);b.group.updateMatrixWorld();for(let k=0;k<b.count;k++)put(slotWorld(b,k,new THREE.Matrix4()),b.color,b.looks[k]);}
    const mat=new THREE.Matrix4();
    for(let k=0;k<Math.min(bed.length,BED_SLOTS.length);k++){const s=BED_SLOTS[k];mat.makeRotationY(s.rotY).setPosition(s.x,s.y,s.z);put(mat,bed[k]);}
    for(const a of [...loose,...landing]){q.setFromEuler(e.set(a.rx,a.ry,a.rz));mat.compose(a.p,q,new THREE.Vector3(a.s??1,a.s??1,a.s??1));put(mat,a.color);}
    if(sq.carried){squirrel.group.updateMatrixWorld(true);squirrel.mouth.getWorldPosition(p);q.setFromEuler(e.set(.4,0,0));mat.compose(p,q,new THREE.Vector3(.8,.8,.8));put(mat,sq.carried.color);}
    for(const mesh of [bodies,stems,leaves]){mesh.count=n;mesh.instanceMatrix.needsUpdate=true;}if(bodies.instanceColor)bodies.instanceColor.needsUpdate=true;
    bedGlow.opacity+=((hoverBed?.55:0)-bedGlow.opacity)*.2;
    placeSkyBodies();renderer.render(scene,camera);
    const show=reveal>.85;baskets.forEach(b=>{const s=screen(b.home.x+1.2,.3,b.home.z+.2);labels[b.i].style.transform=`translate(${s.x}px,${s.y}px) translate(0,-50%)`;labels[b.i].style.opacity=show?'1':'0';});
  }
  function screen(x,y,z){const r=canvas.getBoundingClientRect(),c=container.getBoundingClientRect();p.set(x,y,z).project(camera);return {x:r.left-c.left+(p.x+1)/2*r.width,y:r.top-c.top+(1-p.y)/2*r.height};}
  function client(x,y,z){const r=canvas.getBoundingClientRect();p.set(x,y,z).project(camera);return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height};}

  function spill(b,count,burst=1){
    const n=Math.min(count,b.count);if(!n)return;b.tripDrops=(b.tripDrops||0)+n;const ids=onSpill(b.color,n,client(b.pos.x,pileTop(b)+.6,b.pos.z))||[],mat=new THREE.Matrix4(),pos=new THREE.Vector3(),rot=new THREE.Quaternion(),scl=new THREE.Vector3();
    const sideways=Math.abs(b.theta)>=Math.abs(b.phi),sx=sideways?-(Math.sign(b.theta)||(Math.random()<.5?-1:1)):(Math.random()-.5),sz=sideways?(Math.random()-.5):(Math.sign(b.phi)||1);
    for(let k=0;k<n;k++){slotWorld(b,b.count-1-k,mat).decompose(pos,rot,scl);
      loose.push({id:ids[k],color:b.color,p:pos.clone(),v:new THREE.Vector3(b.vel.x*.6+sx*(1.5+Math.random()*2)*burst,1+Math.random()*2,b.vel.z*.6+sz*(1.2+Math.random()*1.6)*burst),rx:Math.random()*6,ry:Math.random()*6,rz:Math.random()*6,spin:(Math.random()-.5)*14,life:0});}
    b.count-=n;setLevel(b);react('gasp');
  }
  // Carrying: the hand pulls the basket on a spring; its tilt (sideways and front-to-back) is a damped
  // wobble whose restoring force weakens as the pile grows, so tall piles need smooth, steady moves.
  // Baskets rise as they travel back so they clear the truck's side into the bed.
  const carryHeight=(x,z)=>{const dx=Math.max(BED_WORLD.x0-x,0,x-BED_WORLD.x1),dz=Math.max(BED_WORLD.z0-z,0,z-BED_WORLD.z1);return CARRY_Y+Math.max(0,Math.min(1,(3-Math.hypot(dx,dz))/2))*1.45;};
  function step(dt){
    time+=dt;
    for(const b of baskets){
      if(b.tipped){b.tipped-=dt;if(Math.abs(b.theta)>=Math.abs(b.phi))b.theta+=((Math.sign(b.theta)||1)*1.5-b.theta)*Math.min(1,dt*10);else b.phi+=((Math.sign(b.phi)||1)*1.5-b.phi)*Math.min(1,dt*10);if(b.tipped<=0){b.tipped=0;b.theta=b.phi=b.omega=b.omegaPhi=0;b.returning=true;b.pos.y=1.2;}continue;}
      const goal=b.dragging&&b.target?b.target:b.home;const k=b.dragging?140:60,c=2*Math.sqrt(k);
      const acc=new THREE.Vector3().subVectors(goal,b.pos).multiplyScalar(k).addScaledVector(b.vel,-c);if(!b.dragging&&b.pos.y>0)acc.y-=12;
      b.vel.addScaledVector(acc,dt);b.pos.addScaledVector(b.vel,dt);if(b.pos.y<0){b.pos.y=0;b.vel.y=Math.max(0,b.vel.y);}
      if(b.dragging&&raccoon.group.visible&&rc.mode!=='flee'){const rp=raccoon.group.position,dx=b.pos.x-rp.x,dz=b.pos.z-rp.z,dd=Math.hypot(dx,dz);
        if(dd<RACCOON_R){const nx=dd?dx/dd:0,nz=dd?dz/dd:1,vn=b.vel.x*nx+b.vel.z*nz;b.pos.x=rp.x+nx*RACCOON_R;b.pos.z=rp.z+nz*RACCOON_R;
          if(vn<0){if(rc.bump<=0&&-vn>1.2){b.omega+=nx*Math.min(4,-vn*.7);b.omegaPhi-=nz*Math.min(4,-vn*.6);rc.bump=.6;react('gasp');}b.vel.x-=vn*nx;b.vel.z-=vn*nz;}}}
      if(b.returning&&b.pos.distanceTo(b.home)<.02&&b.vel.length()<.05){b.returning=false;b.pos.copy(b.home);b.vel.set(0,0,0);}
      const h=Math.min(1,pileTop(b)/2.45),carried=b.dragging||b.returning;
      if(carried&&b.count){
        const stiffness=30*(1-1.08*h),gain=(.05+.13*h)*(b.returning?.35:1),shake=b.dragging?1:.2;
        b.omega+=(-stiffness*b.theta-4*b.omega+acc.x*gain+(Math.random()-.5)*h*h*26*shake)*dt;b.theta+=b.omega*dt;
        b.omegaPhi+=(-stiffness*b.phi-4*b.omegaPhi-acc.z*gain*.8+(Math.random()-.5)*h*h*20*shake)*dt;b.phi+=b.omegaPhi*dt;
        // Only an over-full (red) basket can spill; green and orange piles sway but always hold.
        if(b.level!=='red'){const cap=.42;b.theta=Math.max(-cap,Math.min(cap,b.theta));b.phi=Math.max(-cap,Math.min(cap,b.phi));b.spillClock=0;}
        const limit=.6-.36*h,lean=b.level==='red'?Math.max(Math.abs(b.theta),Math.abs(b.phi)):0;
        if(lean>1.1){spill(b,b.count,1.6);b.tipped=.9;b.dragging=false;b.target=null;continue;}
        if(lean>limit){b.spillClock+=dt*(1+(lean-limit)*8);while(b.spillClock>.13&&b.count){b.spillClock-=.13;spill(b,1);}}else b.spillClock=0;
      }else{b.omega+=(-40*b.theta-9*b.omega)*dt;b.theta+=b.omega*dt;b.omegaPhi+=(-40*b.phi-9*b.omegaPhi)*dt;b.phi+=b.omegaPhi*dt;}
    }
    // Dropped apples (with an id) stay on the grass until dragged to the truck, or a squirrel gets them.
    for(const a of loose){a.life+=dt;if(a.held){a.p.lerp(a.goal,Math.min(1,dt*18));a.ry+=dt*3;continue;}a.v.y-=18*dt;a.p.addScaledVector(a.v,dt);a.rx+=a.spin*dt;a.rz+=a.spin*.7*dt;
      if(a.p.y<0){a.p.y=0;a.v.y=Math.abs(a.v.y)>1.5?-a.v.y*.35:0;a.v.x*=.75;a.v.z*=.75;a.spin*=.6;if(!a.v.y){a.v.x*=Math.exp(-dt*4);a.v.z*=Math.exp(-dt*4);a.spin*=Math.exp(-dt*4);}}
      if(a.p.x<YARD.x0){a.p.x=YARD.x0;a.v.x=Math.abs(a.v.x)*.4;}if(a.p.x>YARD.x1){a.p.x=YARD.x1;a.v.x=-Math.abs(a.v.x)*.4;}if(a.p.z<YARD.z0&&a.p.y<2){a.p.z=YARD.z0;a.v.z=Math.abs(a.v.z)*.4;}if(a.p.z>YARD.z1){a.p.z=YARD.z1;a.v.z=-Math.abs(a.v.z)*.4;}
      a.s=a.id==null&&a.life>1.6?Math.max(0,1-(a.life-1.6)*2):1;}
    loose=loose.filter(a=>a.id!=null||a.life<2.1);
    for(const a of landing){a.t+=dt/a.d;const t=Math.max(0,Math.min(1,a.t));a.p.lerpVectors(a.from,a.to,t);a.p.y+=Math.sin(t*Math.PI)*1.2;a.ry+=dt*6;if(t>=1&&!a.done){a.done=true;bed.push(a.color);}}
    landing=landing.filter(a=>!a.done);
    critters(dt);
  }

  function critters(dt){
    // Birds: a small flock crosses the sky now and then while the sun is up.
    nextFlock-=dt;if(nextFlock<=0){nextFlock=12+Math.random()*20;if(to.birds){const dir=Math.random()<.5?1:-1,y=8+Math.random()*7,z=-20-Math.random()*25,n=3+Math.floor(Math.random()*4),birds=[];
      for(let k=0;k<n;k++){const b=buildBird(keep,birdMat);b.offset=new THREE.Vector3(-dir*k*1.1-Math.random()*.4,(k%2?.5:-.3)*Math.min(k,2)+Math.random()*.3,(k%2?1:-1)*k*.6);b.ph=Math.random()*6;b.group.rotation.y=dir>0?0:Math.PI;scene.add(b.group);birds.push(b);}
      flocks.push({x:-dir*45,dir,y,z,birds,speed:6+Math.random()*3});}}
    for(const f of flocks){f.x+=f.dir*f.speed*dt;for(const b of f.birds){b.group.position.set(f.x+b.offset.x,f.y+b.offset.y+Math.sin(time*1.6+b.ph)*.3,f.z+b.offset.z);const flap=Math.sin(time*11+b.ph)*.7;b.wings[0].rotation.x=flap;b.wings[1].rotation.x=-flap;}}
    flocks=flocks.filter(f=>{if(Math.abs(f.x)<55)return true;for(const b of f.birds)scene.remove(b.group);return false;});
    // Fireflies blink in the dusk and dark.
    const fa=look.fireflies;fireflies.visible=fa>.01;if(fireflies.visible){fireBase.forEach((f,k)=>{firePos[k*3]=f.x+Math.sin(time*.4+f.ph)*.8;firePos[k*3+1]=f.y+Math.sin(time*.7+f.ph*2)*.3;firePos[k*3+2]=f.z+Math.cos(time*.35+f.ph)*.6;const glow=Math.pow(Math.max(0,Math.sin(time*f.rate+f.ph)),4)*fa;fireCol[k*3]=.8*glow;fireCol[k*3+1]=glow;fireCol[k*3+2]=.35*glow;});
      fireGeo.attributes.position.needsUpdate=fireGeo.attributes.color.needsUpdate=true;}
    // Freckles: idle head bob and tail swish, a hop to cheer, a start when apples drop.
    horse.update(dt);guest.update(dt);
    horseClock+=dt;horse.head.rotation.set(.1+Math.sin(time*1.3)*.05,.2+Math.sin(time*.5)*.15,.05);horse.tail.rotation.z=Math.sin(time*2.2)*.25;
    if(horseMood==='cheer'){const t=horseClock/.6;horse.root.position.y=t<1?Math.sin(t*Math.PI)*.55:0;if(t>=1)horseMood=null;}
    else if(horseMood==='gasp'){const t=horseClock/.5;horse.head.rotation.x-=t<1?Math.sin(t*Math.PI)*.35:0;horse.root.position.x=HORSE_AT.x+(t<1?Math.sin(t*Math.PI*4)*.06:0);if(t>=1)horseMood=null;}else horse.root.position.y=0;
    raccoonStep(dt);
    // The squirrel scampers in while the yard is open, eyes up a dropped apple and runs off with it.
    if(!live)return;const g=squirrel.group,dropped=()=>loose.filter(a=>a.id!=null&&!a.held&&a.p.y<.05&&Math.abs(a.v.x)+Math.abs(a.v.z)<.5);
    if(sq.mode==='off'){sq.wait-=dt;if(sq.wait<=0){sq.wait=2+Math.random()*3;if(phase==='night'||Math.random()>(dropped().length?.55:.12))return;sq.side=Math.random()<.5?0:1;g.position.set(SIDES[sq.side],0,TRUCK_AT.z+3+Math.random()*7);g.visible=true;sq.mode='in';sq.apple=null;sq.wander=false;sq.speed=4.2;}return;}
    if(sq.mode==='in'){if(!sq.apple||!loose.includes(sq.apple)||sq.apple.held){const choices=dropped().sort((a,b)=>a.p.distanceTo(g.position)-b.p.distanceTo(g.position));sq.apple=choices[0]||null;if(sq.apple)sq.goal.copy(sq.apple.p);else if(!sq.wander){sq.wander=true;sq.goal.set(1.5+Math.random()*6,0,TRUCK_AT.z+2.5+Math.random()*8);}}else sq.goal.copy(sq.apple.p);}
    if(sq.mode==='in'||sq.mode==='out'||sq.mode==='flee'){const d=p.subVectors(sq.goal,g.position);d.y=0;const dist=d.length();
      if(dist>.35){d.multiplyScalar(Math.min(dist,sq.speed*dt)/dist);g.position.add(d);g.rotation.y=Math.atan2(d.x,d.z);squirrel.body.position.y=Math.abs(Math.sin(time*15))*.11;squirrel.tail.rotation.x=Math.sin(time*15)*.25;}
      else if(sq.mode==='in'){squirrel.body.position.y=0;sq.mode=sq.apple?'grab':'nibble';sq.clock=0;}
      if((sq.mode==='out'||sq.mode==='flee')&&(g.position.x<SIDES[0]+.2||g.position.x>SIDES[1]-.2)){if(sq.carried){onSquirrel(sq.carried.id,client(g.position.x,1,g.position.z));sq.carried=null;}g.visible=false;sq.mode='off';sq.wait=12+Math.random()*15;}}
    else{sq.clock+=dt;squirrel.body.position.y=0;
      if(sq.mode==='grab'){squirrel.head.rotation.x=Math.sin(sq.clock*10)*.3;if(sq.clock>.4){if(sq.apple&&loose.includes(sq.apple)&&!sq.apple.held){loose=loose.filter(a=>a!==sq.apple);sq.carried=sq.apple;}sq.apple=null;sq.mode='out';sq.speed=4.6;squirrel.head.rotation.x=0;sq.goal.set(g.position.x<4?SIDES[0]-.4:SIDES[1]+.4,0,g.position.z);}}
      else if(sq.mode==='nibble'){squirrel.body.rotation.x=-.5;squirrel.head.rotation.x=Math.sin(sq.clock*16)*.12;squirrel.tail.rotation.x=Math.sin(sq.clock*3)*.15;const wanted=dropped()[0];
        if(wanted||sq.clock>2.5){squirrel.body.rotation.x=0;squirrel.head.rotation.x=0;if(wanted){sq.apple=wanted;sq.mode='in';}else{sq.mode='out';sq.goal.set(SIDES[sq.side]+(sq.side?.4:-.4),0,g.position.z);}}}}
  }
  function shooSquirrel(){const g=squirrel.group;if(sq.carried){squirrel.mouth.getWorldPosition(p);loose.push({...sq.carried,p:p.clone(),v:new THREE.Vector3((Math.random()-.5)*2,2.5,(Math.random()-.5)*1.5),held:false,life:0});sq.carried=null;}
    squirrel.body.rotation.x=0;squirrel.head.rotation.x=0;sq.apple=null;sq.mode='flee';sq.speed=9;sq.goal.set(g.position.x<4?SIDES[0]-.6:SIDES[1]+.6,0,g.position.z);react('cheer');}

  const ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),hit=new THREE.Vector3();let grab=null;const horseFns=[],guestFns=[];
  function rayFrom(event){const r=canvas.getBoundingClientRect();ndc.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);}
  function pointerAt(event,y){rayFrom(event);plane.constant=-y;return ray.ray.intersectPlane(plane,hit)?hit.clone():null;}
  // Anywhere over the truck counts (a finger aimed at the raised bed meets the carry plane a little behind it).
  const inBed=(x,z)=>x>TRUCK_AT.x+2.6&&x<TRUCK_AT.x+10.4&&z>TRUCK_AT.z-3.2&&z<TRUCK_AT.z+1.9;
  const overBed=b=>{const at=b.dragging&&b.target?b.target:b.pos;return inBed(at.x,at.z);};
  function grassAt(event){const reach=Math.max(22,(client(.55,0,2).x-client(0,0,2).x)*1.4);let best=null,dist=reach;
    for(const a of loose){if(a.id==null)continue;const s=client(a.p.x,a.p.y+.2,a.p.z),d=Math.hypot(s.x-event.clientX,s.y-event.clientY);if(d<dist){dist=d;best=a;}}return best;}
  function basketAt(event){let best=null,dist=Infinity;for(const b of baskets){if(b.tipped)continue;const s=client(b.pos.x,b.pos.y+.55,b.pos.z),edge=client(b.pos.x+BASKET_R1,b.pos.y+.55,b.pos.z),reach=Math.abs(edge.x-s.x)*1.15,top=client(b.pos.x,b.pos.y+Math.max(BASKET_H,pileTop(b))+.4,b.pos.z).y,bottom=client(b.pos.x,b.pos.y,b.pos.z+BASKET_R1).y,d=Math.abs(event.clientX-s.x);
    if(d<reach&&event.clientY>top-10&&event.clientY<bottom+16&&d<dist){dist=d;best=b;}}return best;}
  const squirrelHit=event=>{if(!squirrel.group.visible||sq.mode==='flee')return false;const g=squirrel.group.position,s=client(g.x,.5,g.z),r=Math.max(30,Math.abs(client(g.x+.9,.5,g.z).x-s.x));return Math.hypot(event.clientX-s.x,event.clientY-s.y)<r;};
  const raccoonHit=event=>{if(!raccoon.group.visible||rc.mode==='flee')return false;const g=raccoon.group.position,s=client(g.x,.6,g.z),r=Math.max(36,Math.abs(client(g.x+1.2,.6,g.z).x-s.x));return Math.hypot(event.clientX-s.x,event.clientY-s.y)<r;};
  const horseHit=event=>{rayFrom(event);return ray.intersectObjects(horseHits,false).length>0;},guestHit=event=>{rayFrom(event);return ray.intersectObjects(guestHits,false).length>0;};
  canvas.addEventListener('pointerdown',event=>{if(reveal<.9)return;
    if(squirrelHit(event)){shooSquirrel();return;}
    if(raccoonHit(event)){shooRaccoon();return;}
    if(canDrag()){const apple=grassAt(event);if(apple){const w=pointerAt(event,.4);if(w){event.preventDefault();try{canvas.setPointerCapture(event.pointerId);}catch{}apple.held=true;apple.goal=new THREE.Vector3(w.x,.5,w.z);grab={apple,id:event.pointerId};canvas.classList.add('dragging');return;}}
      const b=basketAt(event);if(b){const w=pointerAt(event,CARRY_Y);if(w){event.preventDefault();try{canvas.setPointerCapture(event.pointerId);}catch{}grab={b,dx:b.pos.x-w.x,dz:b.pos.z-w.z,id:event.pointerId};b.dragging=true;b.tripDrops=0;b.returning=false;b.target=new THREE.Vector3(b.pos.x,CARRY_Y,b.pos.z);canvas.classList.add('dragging');return;}}}
    if(horseHit(event))horseFns.forEach(fn=>fn());else if(guestHit(event)){guest.jump();guestFns.forEach(fn=>fn(guestInfo));}});
  canvas.addEventListener('pointermove',event=>{
    if(grab?.apple&&event.pointerId===grab.id){const w=pointerAt(event,.4);if(w){const z=Math.max(TRUCK_AT.z-1.6,Math.min(YARD.z1,w.z)),x=Math.max(YARD.x0,Math.min(YARD.x1,w.x));grab.apple.goal.set(x,Math.max(.45,carryHeight(x,z)-.1),z);hoverBed=inBed(grab.apple.goal.x,grab.apple.goal.z);}return;}
    if(grab&&event.pointerId===grab.id){const w=pointerAt(event,CARRY_Y);if(w){const x=Math.max(YARD.x0,Math.min(YARD.x1,w.x+grab.dx)),z=Math.max(TRUCK_AT.z-1.6,Math.min(YARD.z1,w.z+grab.dz));grab.b.target.set(x,carryHeight(x,z),z);hoverBed=overBed(grab.b);}}
    else if(!grab&&event.pointerType==='mouse'&&reveal>.9)canvas.style.cursor=squirrelHit(event)||raccoonHit(event)?'pointer':grassAt(event)||basketAt(event)?'grab':horseHit(event)||guestHit(event)?'pointer':'';});
  function release(event){if(!grab||event.pointerId!==grab.id)return;
    if(grab.apple){const a=grab.apple;grab=null;canvas.classList.remove('dragging');a.held=false;const into=hoverBed;hoverBed=false;
      if(into){loose=loose.filter(x=>x!==a);const slot=BED_SLOTS[(bed.length+landing.length)%BED_SLOTS.length];landing.push({color:a.color,from:a.p.clone(),to:new THREE.Vector3(slot.x,slot.y,slot.z),p:a.p.clone(),t:0,d:.35,rx:0,ry:slot.rotY,rz:0});onRecover(a.id,client(a.p.x,a.p.y+.8,a.p.z));react('cheer');}
      else a.v.set(0,0,0);return;}
    const b=grab.b;grab=null;hoverBed=false;canvas.classList.remove('dragging');if(!b.dragging)return;const delivering=overBed(b);b.dragging=false;b.target=null;
    if(delivering&&b.count){const n=b.count,mat=new THREE.Matrix4(),pos=new THREE.Vector3(),rot=new THREE.Quaternion(),scl=new THREE.Vector3();
      for(let k=0;k<n;k++){slotWorld(b,k,mat).decompose(pos,rot,scl);const slot=BED_SLOTS[(bed.length+landing.length)%BED_SLOTS.length];landing.push({color:b.color,from:pos.clone(),to:new THREE.Vector3(slot.x,slot.y,slot.z),p:pos.clone(),t:-k*.04,d:.45,rx:0,ry:slot.rotY,rz:0});}
      b.count=0;setLevel(b);onDeliver(b.color,n,client(b.pos.x,b.pos.y+2,b.pos.z),{clean:!b.tripDrops});react('cheer');}
    b.returning=true;}
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);

  const observer=new ResizeObserver(resize);observer.observe(container);
  rig.visible=false;setPhase('sunrise',true);resize();

  function react(kind){horseMood=kind;horseClock=0;}
  return {
    // Screen point (client coordinates) of a basket mouth, for apples flying in from the belt.
    mouth(color){const b=baskets[APPLE_COLORS.indexOf(color)];return client(b.pos.x,b.pos.y+Math.max(BASKET_H,pileTop(b))+.1,b.pos.z);},
    appleSize(){const b=baskets[1],a=client(b.pos.x,1,b.pos.z),c=client(b.pos.x+.55,1,b.pos.z);return Math.abs(c.x-a.x);},
    land(color){const b=baskets[APPLE_COLORS.indexOf(color)];if(b.tipped||b.count>=BASKET_CAPACITY)return false;b.count++;setLevel(b);if(b.dragging||b.returning){b.omega+=(Math.random()-.5)*.8;b.omegaPhi+=(Math.random()-.5)*.6;}return true;},
    bounce(color,id){const b=baskets[APPLE_COLORS.indexOf(color)];react('gasp');loose.push({id,color,p:new THREE.Vector3(b.pos.x,pileTop(b)+.6,b.pos.z),v:new THREE.Vector3((Math.random()<.5?-1:1)*(1.5+Math.random()*1.5),2.5,.4+Math.random()*1.4),rx:0,ry:0,rz:0,spin:9,life:0});},
    react,setPhase,
    // 0 = only the basket rims peek in below the belt, 1 = the whole yard. The board eases this.
    setReveal(t){reveal=Math.max(0,Math.min(1,t));rig.visible=reveal>.01;if(reveal<.9)this.cancelDrag();},
    // Where Freckles' speech bubble points (container coordinates).
    horseAnchor(){horse.head.getWorldPosition(p);return screen(p.x,p.y+1.2,p.z);},
    guestAnchor(){guest.head.getWorldPosition(p);return screen(p.x,p.y+1.2,p.z);},guest:guestInfo,
    // The live light of the yard, so the belt is lit by the same sky.
    lighting(){return {sky:look.sky,ground:look.ground,hemi:look.hemiI,sun:look.light,sunI:look.lightI};},
    onHorse(fn){horseFns.push(fn);},onGuest(fn){guestFns.push(fn);},
    frame(dt,{active=true}={}){live=active;if(blend<1){blend=Math.min(1,blend+dt/2.5);applyLook(blend);}step(Math.min(dt,.05));for(const b of baskets)if(b.level==='red')b.band.emissiveIntensity=.35+.4*(.5+.5*Math.sin(time*7));else b.band.emissiveIntensity=.25;aim();draw();},
    busy(){return !!grab;},
    reset(){rc.mode='off';rc.wait=2;raccoon.group.visible=false;for(const b of baskets){b.count=0;b.pos.copy(b.home);b.vel.set(0,0,0);b.theta=b.phi=b.omega=b.omegaPhi=0;b.dragging=b.returning=false;b.tipped=0;setLevel(b);}bed=[];loose=[];landing=[];grab=null;sq.carried=null;sq.apple=null;sq.mode='off';sq.wait=1.5;squirrel.group.visible=false;},
    cancelDrag(){if(grab?.apple){grab.apple.held=false;grab=null;hoverBed=false;}else if(grab){grab.b.dragging=false;grab.b.returning=true;grab=null;hoverBed=false;}canvas.classList.remove('dragging');},
    dispose(){horse.dispose();guest.dispose();observer.disconnect();labels.forEach(l=>l.remove());for(const f of flocks)for(const b of f.birds)scene.remove(b.group);for(const x of disposables)x.dispose?.();for(const mesh of [bodies,stems,leaves]){mesh.material.dispose();mesh.dispose();}renderer.dispose();renderer.forceContextLoss?.();}
  };
}
