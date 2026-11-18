// The VRoid rider (2026-11-11): one anime girl for every person in the game, coloured per look (skin, eyes, hair, outfit
// colours) so riders still look different. Built in the rider lab (rider-lab/vroid: vbuild.py → rider_v.glb, the hair
// from CGTrader 'hair_m1', placed by Yoshi in maker5.html). Same interface as the old chibi character
// (chibi-character.js): {root, hands, legs, arms, update(dt,{pose,fast,speed,air}), seatOffset(), dispose()...}.
// The model loads once (async) and is cloned per person; until it has loaded, root is an empty group.
// Root origin is between the feet, facing +z. Poses are bone rotations about the model's own axes (VRoid rest axes
// are aligned with the world, see rot()).
import {GLTFLoader} from './vendor/three-0.180.0/addons/loaders/GLTFLoader.js';
import {normalizeLook,outfitOf} from './character-looks.mjs';

const SIZE=1.25;            // game units per metre: the old chibi stood ≈2.0 units, the girl is 1.6 m
const AGE=14;               // everyone is 14 for now (the lab has an 8–20 slider)
const HAIR_FIT={x:1.8,y:9.8,z:-0.9,rx:0,ry:-57,rz:0,s:0.78};   // Yoshi's placement, head-bone space (cm, degrees)
const HGT={8:1.28,9:1.33,10:1.38,11:1.44,12:1.51,13:1.57,14:1.60,15:1.62,16:1.62,17:1.63,18:1.63,19:1.63,20:1.63};

// Riding: thighs spread over the barrel, shins hug it (degrees); seat lifts the hips above the saddle.
export const RIDE={tx:-30,tz:55,sx:35,sz:-25,seat:.08};
let assets=null;
function load(){
  if(!assets){const L=new GLTFLoader();
    const get=async f=>{const b64=(await import('./assets/rider/'+f+'-model.js')).default,bin=atob(b64),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);return new Promise((res,rej)=>L.parse(u8.buffer,'',res,rej));};
    assets=Promise.all([get('rider'),get('hair_m1')]).then(([g,h])=>{
      // rest rotations in model space (root at identity), shared by every clone
      g.scene.updateMatrixWorld(true);const rest={};
      g.scene.traverse(o=>{if(o.isBone)rest[o.name]={q:o.quaternion.clone(),w:o.getWorldQuaternion(new THREE_Q())};});
      return {g,h,rest};});}
  return assets;}
let THREE_Q=null;
export const preloadRider=T=>{THREE_Q=THREE_Q||T.Quaternion;return load();};

// Clone a skinned scene: Object3D.clone keeps the old skeleton, so rebind each skinned mesh to the cloned bones.
function cloneSkinned(T,src){const c=src.clone(true),a=[],b=[];src.traverse(o=>a.push(o));c.traverse(o=>b.push(o));const map=new Map(a.map((o,i)=>[o,b[i]]));
  a.forEach((o,i)=>{if(o.isSkinnedMesh){const n=b[i];n.bind(new T.Skeleton(o.skeleton.bones.map(x=>map.get(x)),o.skeleton.boneInverses),o.bindMatrix);}});return c;}

const TOP={jacket:'jacket',silks:'jacket',armor:'jacket',robe:'longtee',bomber:'longtee',hoodie:'longtee',tunic:'tee',dress:'tee',sailor:'tee',overalls:'tee'};
const BOTTOM={jodhpurs:'breeches',breeches:'breeches',tights:'breeches',pants:'jeans',joggers:'jeans',shorts:'shorts',skirt:'shorts'};
const SHOES={tall:'tallboots',boots:'paddock',sneakers:'sneakers',shoes:'sneakers'};

export function makeVroidCharacter(T,rawLook,opt={}){
  THREE_Q=THREE_Q||T.Quaternion;
  const look=normalizeLook(rawLook),outfit=outfitOf(look),C=outfit.colors;
  const root=new T.Group();root.name='rider';
  const hands=[new T.Object3D(),new T.Object3D()];hands[0].position.set(-.45,1.1,0);hands[1].position.set(.45,1.1,0);root.add(...hands);
  // Stand-ins so callers that poke limbs (cave ropes) still work: their rotations are added on top of the pose.
  const arms=[new T.Object3D(),new T.Object3D()],legs=[new T.Object3D(),new T.Object3D()];
  const U={uSkin:{value:new T.Color(look.skin)},uRefSkin:{value:new T.Color(1,1,1)},uHair:{value:new T.Color(look.hairColor)},uEye:{value:new T.Color(look.eyeColor)},uRefEye:{value:new T.Color(1,1,1)},
    uLight:{value:new T.Vector3(.45,.75,.5).normalize()}};
  const wear={top:TOP[outfit.top]||'tee',bottom:BOTTOM[outfit.bottom]||'breeches',shoes:SHOES[outfit.boots]||'sneakers'};
  const col={top:new T.Color(C.top),bottom:new T.Color(C.bottom),shoes:new T.Color(C.boots||'#2b2220'),helmet:new T.Color(C.hat||(outfit.hat==='helmet'?C.top:'#2b2b2b'))};
  const mats=[],face=[],cloth={};let B=null,rest=null,model=null,hair=null,helmetOn=false,disposed=false,AGE_S=HGT[AGE]/1.58;
  const hipY=.87*AGE_S*SIZE;
  let fb=null,pose='stand',phase=0,clock=0,blinkAt=2+Math.random()*3,blink=0,lastP={};

  load().then(({g,h,rest:R})=>{if(disposed)return;rest=R;model=cloneSkinned(T,g.scene);
    const meshes=[];model.traverse(o=>{if(o.isMesh)meshes.push(o);});
    for(const o of meshes){const mn=o.material.name,map=o.material.map;o.frustumCulled=false;o.castShadow=true;
      if(o.morphTargetDictionary?.Fcl_EYE_Close!=null){o.morphTargetInfluences=o.morphTargetInfluences.slice();face.push(o);}
      if(mn.startsWith('Cloth_')){const id=mn.slice(6),slot=id==='helmet'?'helmet':Object.entries({top:['tee','longtee','jacket'],bottom:['breeches','jeans','shorts'],shoes:['tallboots','paddock','sneakers']}).find(([,l])=>l.includes(id))?.[0];
        cloth[id]=o;o.material=toon('cloth',null,slot?col[slot]:new T.Color(look.skin).multiplyScalar(.9));o.material.side=T.DoubleSide;o.userData.ol=outline(o,/^under/.test(id)?.0025:.0032);}
      else if(/Body_00_SKIN/.test(mn)){U.uRefSkin.value.copy(avg(map));o.material=toon('skin',map);outline(o,.0036);}
      else if(/Face_00_SKIN|FaceMouth/.test(mn)){o.material=toon('face',map);if(/Mouth/.test(mn))o.renderOrder=1;}
      else if(/EyeWhite/.test(mn)){o.material=toon('white',map);o.renderOrder=1;}
      else if(/EyeIris/.test(mn)){U.uRefEye.value.copy(avg(map));o.material=toon('iris',map);o.renderOrder=2;}
      else if(/EyeHighlight|FaceEyeline/.test(mn)){o.material=toon('over',map);o.renderOrder=/High/.test(mn)?4:3;}
      else if(/FaceBrow/.test(mn)){o.material=toon('brow',map);o.renderOrder=3;}
      else o.visible=false;}
    B={};model.traverse(o=>{if(o.isBone)B[o.name.replace(/\./g,'')]=o;});
    // age 14: the lab's setAge()
    const ch=1-Math.min(1,Math.max(0,(AGE-9)/7)),kc=ch*ch*(3-2*ch);
    model.traverse(o=>{const d=o.morphTargetDictionary;if(d&&d.Child!=null){o.morphTargetInfluences=o.morphTargetInfluences||[];o.morphTargetInfluences[d.Child]=kc;}});
    model.scale.setScalar(AGE_S*SIZE);const hr=AGE>=16?1:.90+.10*(AGE-8)/8;B.head.scale.setScalar(hr/AGE_S);
    // hair: a tinted, alpha-cut clone of the CGTrader model on the head bone
    hair=new T.Group();const hs=h.scene.clone(true);hs.traverse(o=>{if(o.isMesh){const map=o.material.map;map.colorSpace=T.SRGBColorSpace;o.material=hairMat(map);o.frustumCulled=false;o.castShadow=true;}});
    hair.add(hs);const d=Math.PI/180,F=HAIR_FIT;hair.position.set(F.x/100,F.y/100,F.z/100);hair.rotation.set(F.rx*d,F.ry*d,F.rz*d,'YXZ');hair.scale.setScalar(F.s);B.head.add(hair);
    B.handL?.add(hands[0]);B.handR?.add(hands[1]);hands.forEach(x=>x.position.set(0,0,0));
    dress();root.add(model);update(0);}).catch(e=>{console.warn('VRoid rider failed to load; using the old figure',e);if(disposed||!opt.fallback)return;fb=opt.fallback();root.add(fb.root);
    fb.hands.forEach((h,i)=>{hands[i].parent?.remove(hands[i]);hands[i]=h;});});

  function dress(){for(const id in cloth){const o=cloth[id],on=id==='undertop'?false:id==='underbottom'?false:id==='helmet'?helmetOn:wear.top===id||wear.bottom===id||wear.shoes===id;o.visible=on;if(o.userData.ol)o.userData.ol.visible=on;}
    if(hair)hair.scale.setScalar(HAIR_FIT.s*(helmetOn?.94:1));}

  function avg(t){const im=t?.image;if(!im)return new T.Color(1,1,1);const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d');x.drawImage(im,0,0,32,32);const p=x.getImageData(0,0,32,32).data;let r=0,g=0,b=0,n=0;
    for(let i=0;i<p.length;i+=4){if(p[i+3]<200)continue;const mx=Math.max(p[i],p[i+1],p[i+2]);if(mx<40||mx>250&&Math.min(p[i],p[i+1],p[i+2])>240)continue;r+=p[i];g+=p[i+1];b+=p[i+2];n++;}
    return n?new T.Color().setRGB(r/n/255,g/n/255,b/n/255,T.SRGBColorSpace):new T.Color(1,1,1);}
  const cel=`float ndl=dot(normalize(vN),uLight);float lit=smoothstep(.02,.12,ndl);`;
  function toon(kind,map,c){const tr=/^(iris|over|brow)$/.test(kind);
    const m=new T.ShaderMaterial({transparent:tr,depthWrite:!tr,uniforms:Object.assign({uMap:{value:map||null},uCol:{value:c||new T.Color()}},U),
      vertexShader:`#include <common>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
varying vec3 vN;varying vec3 vB;varying vec2 vUv;
void main(){vUv=uv;vB=position;
#include <morphinstance_vertex>
#include <beginnormal_vertex>
#include <morphnormal_vertex>
#include <skinbase_vertex>
#include <skinnormal_vertex>
#include <begin_vertex>
#include <morphtarget_vertex>
#include <skinning_vertex>
vN=normalize(normalMatrix*objectNormal);gl_Position=projectionMatrix*modelViewMatrix*vec4(transformed,1.);}`,
      fragmentShader:`uniform sampler2D uMap;uniform vec3 uCol,uSkin,uRefSkin,uHair,uEye,uRefEye,uLight;varying vec3 vN;varying vec3 vB;varying vec2 vUv;
void main(){vec3 c;float a=1.;
${kind==='skin'||kind==='face'?`${cel} vec4 t=texture2D(uMap,vUv);if(t.a<.5)discard;vec3 b=t.rgb*uSkin/uRefSkin;c=${kind==='face'?'b*mix(.93,1.,smoothstep(-.4,.6,ndl))':'mix(b*vec3(.86,.78,.80),b,lit)'};`:''}
${kind==='cloth'?`${cel} vec3 b=uCol;if(vB.y<.028)b*=.45; c=mix(b*vec3(.74,.72,.82),b,lit);`:''}
${kind==='white'?`vec4 t=texture2D(uMap,vUv);if(t.a<.5)discard;c=t.rgb;`:''}
${kind==='iris'?`vec4 t=texture2D(uMap,vUv);c=t.rgb*uEye/uRefEye;a=t.a;`:''}
${kind==='over'?`vec4 t=texture2D(uMap,vUv);c=t.rgb;a=t.a;`:''}
${kind==='brow'?`vec4 t=texture2D(uMap,vUv);c=mix(uHair*.45,t.rgb,.25);a=t.a;`:''}
gl_FragColor=vec4(c,a);
#include <colorspace_fragment>
}`});mats.push(m);return m;}
  function hairMat(map){const m=new T.ShaderMaterial({side:T.DoubleSide,uniforms:{uMap:{value:map},uHair:U.uHair,uLight:U.uLight},
    vertexShader:`varying vec3 vN;varying vec2 vUv;void main(){vUv=uv;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform sampler2D uMap;uniform vec3 uHair,uLight;varying vec3 vN;varying vec2 vUv;
void main(){vec4 t=texture2D(uMap,vUv);if(t.a<.5)discard;vec3 n=gl_FrontFacing?vN:-vN;float ndl=dot(normalize(n),uLight);float lit=smoothstep(.02,.12,ndl);
vec3 b=uHair*min(t.rgb*1.12,vec3(1.));gl_FragColor=vec4(mix(b*vec3(.74,.70,.80),b,lit),1.);
#include <colorspace_fragment>
}`});mats.push(m);return m;}
  const OUT=new T.Color(.18,.03,.03);
  function outline(src,w){const m=new T.ShaderMaterial({side:T.BackSide,uniforms:{uC:{value:OUT},uW:{value:w}},
    vertexShader:`#include <common>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
uniform float uW;void main(){
#include <morphinstance_vertex>
#include <skinbase_vertex>
#include <beginnormal_vertex>
#include <morphnormal_vertex>
#include <skinnormal_vertex>
#include <begin_vertex>
#include <morphtarget_vertex>
transformed+=normalize(objectNormal)*uW;
#include <skinning_vertex>
gl_Position=projectionMatrix*modelViewMatrix*vec4(transformed,1.);}`,
    fragmentShader:`uniform vec3 uC;void main(){gl_FragColor=vec4(uC,1.);
#include <colorspace_fragment>
}`});mats.push(m);
    const o=new T.SkinnedMesh(src.geometry,m);o.bind(src.skeleton,src.bindMatrix);o.bindMode=src.bindMode;src.parent.add(o);o.position.copy(src.position);o.quaternion.copy(src.quaternion);o.scale.copy(src.scale);o.frustumCulled=false;
    if(src.morphTargetInfluences){o.morphTargetInfluences=src.morphTargetInfluences;o.morphTargetDictionary=src.morphTargetDictionary;}return o;}

  // ---- poses (degrees about the model's X/Y/Z, same as the lab's POSES) ----
  const X=new T.Vector3(1,0,0),Y=new T.Vector3(0,1,0),Z=new T.Vector3(0,0,1),qa=new T.Quaternion(),qb=new T.Quaternion();
  function rot(n,list){const b=B[n.replace(/\./g,'')];if(!b)return;const R=rest[b.name];const q=qb.identity();for(const [ax,deg] of list)if(deg)q.premultiply(qa.setFromAxisAngle(ax,deg*Math.PI/180));
    const wi=R.w.clone().invert();b.quaternion.copy(R.q).multiply(wi.multiply(q).multiply(R.w));}
  const R2D=180/Math.PI;
  function setPose(p){pose=p;}
  function update(dt,{pose:p=pose,fast=false,speed=0,air=0}={}){pose=p;clock+=dt;blinkAt-=dt;if(blinkAt<0){blink=.13;blinkAt=2.5+Math.random()*3.5;}blink=Math.max(0,blink-dt);
    if(fb){fb.update(dt,{pose:p,fast,speed,air});return;}
    if(!B)return;
    for(const o of face){const d=o.morphTargetDictionary;if(d.Fcl_EYE_Close!=null)o.morphTargetInfluences[d.Fcl_EYE_Close]=blink>0?1:0;}
    const wantHelmet=pose==='ride'||outfit.hat==='helmet';if(wantHelmet!==helmetOn){helmetOn=wantHelmet;dress();}
    for(const b of Object.values(B))b.quaternion.copy(rest[b.name].q);
    const P={'upper_arm.L':[[Z,-72]],'upper_arm.R':[[Z,72]],'forearm.L':[[Z,-8]],'forearm.R':[[Z,8]]};   // VRoid rests in a T pose
    const add=(k,l)=>{P[k]=[...(P[k]||[]),...l];};let bob=0;
    if(pose==='walk'){phase+=dt*(fast?11:7.5);const s=Math.sin(phase),c=Math.cos(phase),k=fast?1.25:1;
      add('thigh.L',[[X,-26*s*k]]);add('thigh.R',[[X,26*s*k]]);add('shin.L',[[X,Math.max(0,32*c*k)]]);add('shin.R',[[X,Math.max(0,-32*c*k)]]);
      add('upper_arm.L',[[X,22*s*k]]);add('upper_arm.R',[[X,-22*s*k]]);add('hips',[[Y,4*s]]);add('chest',[[Y,-6*s]]);bob=Math.abs(Math.sin(phase))*.012;}
    else if(pose==='ride'){const fold=8+16*Math.min(1,speed)+20*air;
      add('thigh.L',[[X,RIDE.tx],[Z,RIDE.tz]]);add('thigh.R',[[X,RIDE.tx],[Z,-RIDE.tz]]);add('shin.L',[[X,RIDE.sx],[Z,RIDE.sz]]);add('shin.R',[[X,RIDE.sx],[Z,-RIDE.sz]]);add('foot.L',[[X,-10]]);add('foot.R',[[X,-10]]);
      add('spine',[[X,fold*.5]]);add('chest',[[X,fold*.5]]);add('neck',[[X,-fold*.6]]);
      add('upper_arm.L',[[X,-30]]);add('upper_arm.R',[[X,-30]]);add('forearm.L',[[Y,-80],[X,22]]);add('forearm.R',[[Y,80],[X,22]]);}
    else if(pose==='sit'){add('thigh.L',[[X,-85]]);add('thigh.R',[[X,-85]]);add('shin.L',[[X,85]]);add('shin.R',[[X,85]]);
      add('upper_arm.L',[[X,-25]]);add('upper_arm.R',[[X,-25]]);add('forearm.L',[[X,-20]]);add('forearm.R',[[X,-20]]);}
    else{add('upper_arm.L',[[X,Math.sin(clock*1.6)*2]]);add('upper_arm.R',[[X,-Math.sin(clock*1.6)*2]]);add('chest',[[X,Math.sin(clock*2)*.8]]);}
    // caller overrides (cave ropes): stand-in rotations in radians
    arms.forEach((a,i)=>{if(a.rotation.x||a.rotation.z){const s=i?'R':'L';P['upper_arm.'+s]=[[Z,i?72:-72],[X,a.rotation.x*R2D],[Z,-a.rotation.z*R2D*(i?-1:1)]];}a.rotation.set(0,0,0);});
    legs.forEach((l,i)=>{if(l.rotation.x){add('thigh.'+(i?'R':'L'),[[X,l.rotation.x*R2D]]);}l.rotation.set(0,0,0);});
    for(const k in P)rot(k,P[k]);
    model.position.y=bob*SIZE;}
  // In 'ride' the hips sit on the saddle: place root at seat + seatOffset().
  const seatOffset=()=>fb?fb.seatOffset():-hipY+RIDE.seat;
  function dispose(){disposed=true;fb?.dispose();root.parent?.remove(root);mats.forEach(m=>m.dispose());}
  return {root,body:root,hips:root,torso:root,neck:root,head:root,legs,knees:[],feet:[],arms,elbows:[],hands,look,update,setPose,seatOffset,dispose,vroid:true};
}
