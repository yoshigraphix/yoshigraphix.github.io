// The VRoid rider (2026-11-11): one anime girl for every person in the game, coloured per look (skin, eyes, hair, outfit
// colours) so riders still look different. Built in the rider lab (rider-lab/vroid: vbuild.py → rider_v.glb, the hair
// from CGTrader 'hair_m1', placed by Yoshi in maker5.html). Same interface as the old chibi character
// (chibi-character.js): {root, hands, legs, arms, update(dt,{pose,fast,speed,air}), seatOffset(), dispose()...}.
// The model loads once (async) and is cloned per person; until it has loaded, root is an empty group.
// Root origin is between the feet, facing +z. Poses are bone rotations about the model's own axes (VRoid rest axes
// are aligned with the world, see rot()).
import {GLTFLoader} from './vendor/three-0.180.0/addons/loaders/GLTFLoader.js';
import {normalizeLook,outfitOf,drawnSkin,drawnHair,hairModelOf} from './character-looks.mjs';

const SIZE=1.25;            // game units per metre: the old chibi stood ≈2.0 units, the girl is 1.6 m
const AGE=14;               // everyone is 14 for now (the lab has an 8–20 slider)
const HAIR_FIT={x:1.8,y:9.8,z:-0.9,rx:0,ry:-57,rz:0,s:0.78};   // Yoshi's placement, head-bone space (cm, degrees)
// long + bun (2026-11-12) are built in head-bone space already (rider-lab/vroid/hairfit.py), so they sit at the origin.
const HAIR_FITS={bob:HAIR_FIT,long:{x:0,y:0,z:0,rx:0,ry:0,rz:0,s:1},bun:{x:0,y:0,z:0,rx:0,ry:0,rz:0,s:1}};
const HGT={8:1.28,9:1.33,10:1.38,11:1.44,12:1.51,13:1.57,14:1.60,15:1.62,16:1.62,17:1.63,18:1.63,19:1.63,20:1.63};

// Riding: thighs spread over the barrel, shins hug it (degrees); seat lifts the hips above the saddle.
export const HELMET_S=1.02,HELMET_UP=.018;   // 2% bigger, raised 1.8 cm so the brow shows (Yoshi 2026-11-11)
export const RIDE={tx:-30,tz:55,sx:35,sz:-25,seat:.08};
let assets=null;
function load(){
  if(!assets){const L=new GLTFLoader();
    const get=async(f,k='default')=>{const b64=(await import('./assets/rider/'+f+'-model.js'))[k],bin=atob(b64),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);return new Promise((res,rej)=>L.parse(u8.buffer,'',res,rej));};
    assets=Promise.all([get('rider'),get('hair_m1'),get('hair_m1','long').catch(()=>null),get('hair_m1','bun').catch(()=>null)]).then(([g,bob,long,bun])=>{const h={bob,long,bun};
      // rest rotations in model space (root at identity), shared by every clone
      // Helmet 2% bigger (Yoshi, 2026-11-11), scaled about its own centre once in the shared geometry.
      g.scene.traverse(o=>{if(o.isMesh&&o.material?.name==='Cloth_helmet'&&!o.geometry.userData.grown){const ge=o.geometry;ge.computeBoundingBox();const c=ge.boundingBox.getCenter(ge.boundingBox.min.clone());ge.translate(-c.x,-c.y,-c.z);ge.scale(HELMET_S,HELMET_S,HELMET_S);ge.translate(c.x,c.y+HELMET_UP,c.z);ge.userData.grown=true;}});
      markCovered(g.scene);
      g.scene.updateMatrixWorld(true);const rest={};
      g.scene.traverse(o=>{if(o.isBone)rest[o.name]={q:o.quaternion.clone(),w:o.getWorldQuaternion(new THREE_Q())};});
      return {g,h,rest};});}
  return assets;}
let THREE_Q=null;
export const preloadRider=T=>{THREE_Q=THREE_Q||T.Quaternion;return load();};

// Skin poking through clothes (Yoshi 2026-11-12: shoulders through tops, hips through shorts when riding): body skin that
// every top (tee, long tee, jacket) or every bottom (breeches, jeans, shorts) covers is not drawn. Once per load, in the shared
// rest geometry: a body vertex is inside a garment when the nearest garment vertex is within 3.5 cm and the body vertex lies
// behind that vertex's normal. Near a garment's open edges (collar, hem, cuffs, waist) it stays drawn unless the other
// group covers it too (the waist overlap), so nothing opens up at a seam. Arms (|x|>.16 m in the T pose) are never dropped:
// you can see into the sleeves. Stored as the aCover attribute; skin and outline shaders drop fully covered triangles.
function markCovered(scene){let body=null;const groups={top:[],bottom:[]};
  scene.traverse(o=>{if(!o.isMesh)return;const n=o.material?.name||'';if(/Body_00_SKIN/.test(n))body=o;else if(/^Cloth_(tee|longtee|jacket)$/.test(n))groups.top.push(o);else if(/^Cloth_(breeches|jeans|shorts)$/.test(n))groups.bottom.push(o);});
  if(!body||body.geometry.getAttribute('aCover')||body.geometry.getAttribute('position').isInterleavedBufferAttribute)return;
  const bp=body.geometry.getAttribute('position'),N=bp.count,C=.02,key=(x,y,z)=>Math.floor(x/C)+','+Math.floor(y/C)+','+Math.floor(z/C);
  const test=(list,margin)=>{const inside=new Uint8Array(N).fill(list.length?1:0),edgy=new Uint8Array(N);
    for(const t of list){const g=t.geometry,p=g.getAttribute('position'),nr=g.getAttribute('normal'),ix=g.index;
      const vk=i=>Math.round(p.getX(i)*2000)+'_'+Math.round(p.getY(i)*2000)+'_'+Math.round(p.getZ(i)*2000),ec=new Map();
      if(ix)for(let f=0;f<ix.count;f+=3)for(let e=0;e<3;e++){const a=vk(ix.getX(f+e)),b=vk(ix.getX(f+(e+1)%3)),k=a<b?a+'|'+b:b+'|'+a;ec.set(k,(ec.get(k)||0)+1);}
      const open=new Set();for(const [k,c] of ec)if(c===1)k.split('|').forEach(v=>open.add(v));
      const grid=new Map(),edge=new Map();
      for(let i=0;i<p.count;i++){const k=key(p.getX(i),p.getY(i),p.getZ(i));(grid.get(k)||grid.set(k,[]).get(k)).push(i);if(open.has(vk(i)))(edge.get(k)||edge.set(k,[]).get(k)).push(i);}
      const near=(m,x,y,z,r)=>{let best=-1,bd=r*r;const cx=Math.floor(x/C),cy=Math.floor(y/C),cz=Math.floor(z/C),s=Math.ceil(r/C);
        for(let a=-s;a<=s;a++)for(let b=-s;b<=s;b++)for(let c=-s;c<=s;c++){const l=m.get((cx+a)+','+(cy+b)+','+(cz+c));if(l)for(const i of l){const d=(p.getX(i)-x)**2+(p.getY(i)-y)**2+(p.getZ(i)-z)**2;if(d<bd){bd=d;best=i;}}}return best;};
      for(let v=0;v<N;v++){if(!inside[v])continue;const x=bp.getX(v),y=bp.getY(v),z=bp.getZ(v);
        if(Math.abs(x)>.16){inside[v]=0;continue;}
        const i=near(grid,x,y,z,.035);if(i<0||(x-p.getX(i))*nr.getX(i)+(y-p.getY(i))*nr.getY(i)+(z-p.getZ(i))*nr.getZ(i)>0){inside[v]=0;continue;}
        if(near(edge,x,y,z,margin(y))>=0)edgy[v]=1;}}
    return {inside,edgy};};
  const T=test(groups.top,y=>y>1.2?.006:.025),Bt=test(groups.bottom,()=>.02),cover=new Float32Array(N);
  for(let v=0;v<N;v++)cover[v]=(T.inside[v]&&(!T.edgy[v]||Bt.inside[v]))||(Bt.inside[v]&&(!Bt.edgy[v]||T.inside[v]))?1:0;
  body.geometry.setAttribute('aCover',new bp.constructor(cover,1));}

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
  const U={uSkin:{value:new T.Color(drawnSkin(look.skin))},uRefSkin:{value:new T.Color(1,1,1)},uHair:{value:new T.Color(drawnHair(look.skin,look.hairColor))},uEye:{value:new T.Color(look.eyeColor)},uRefEye:{value:new T.Color(1,1,1)},
    uLight:{value:new T.Vector3(.45,.75,.5).normalize()},uCut:{value:9}};   // uCut: hair above this head-local height is clipped (helmet on)
  const wear={top:TOP[outfit.top]||'tee',bottom:BOTTOM[outfit.bottom]||'breeches',shoes:SHOES[outfit.boots]||'sneakers'};
  const col={top:new T.Color(C.top),bottom:new T.Color(C.bottom),shoes:new T.Color(C.boots||'#2b2220'),helmet:new T.Color(C.hat||(outfit.hat==='helmet'?C.top:'#2b2b2b'))};
  const mats=[],face=[],cloth={};let B=null,rest=null,model=null,hair=null,hairKey=hairModelOf(look.hair),helmetOn=false,disposed=false,AGE_S=HGT[AGE]/1.58;
  const hipY=.87*AGE_S*SIZE;
  let fb=null,pose='stand',phase=0,wk=0,clock=0,blinkAt=2+Math.random()*3,blink=0,lastP={},tk=0,syl=0,vow=0,mouth=0,gest=0,gestAt=0,gL=0,gR=0,tgL=0,tgR=0;const VOW=['Fcl_MTH_A','Fcl_MTH_I','Fcl_MTH_U','Fcl_MTH_E','Fcl_MTH_O'];

  load().then(({g,h,rest:R})=>{if(disposed)return;rest=R;model=cloneSkinned(T,g.scene);
    const meshes=[];model.traverse(o=>{if(o.isMesh)meshes.push(o);});
    for(const o of meshes){const mn=o.material.name,map=o.material.map;o.frustumCulled=false;o.castShadow=true;
      if(o.morphTargetDictionary?.Fcl_EYE_Close!=null){o.morphTargetInfluences=o.morphTargetInfluences.slice();face.push(o);}
      if(mn.startsWith('Cloth_')){const id=mn.slice(6),slot=id==='helmet'?'helmet':id==='undertop'?'top':id==='underbottom'?'bottom':Object.entries({top:['tee','longtee','jacket'],bottom:['breeches','jeans','shorts'],shoes:['tallboots','paddock','sneakers']}).find(([,l])=>l.includes(id))?.[0];
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
    // hair: a tinted, alpha-cut clone of the chosen hair model (bob = CGTrader, long = Arisa, bun = hair1) on the head bone
    if(!h[hairKey])hairKey='bob';   // a stale cached hair file without the new styles still gets a rider
    hair=new T.Group();const hs=h[hairKey].scene.clone(true);hs.traverse(o=>{if(o.isMesh){const map=o.material.map;map.colorSpace=T.SRGBColorSpace;o.material=hairMat(map);o.frustumCulled=false;o.castShadow=true;}});
    hair.add(hs);const d=Math.PI/180,F=HAIR_FITS[hairKey];hair.position.set(F.x/100,F.y/100,F.z/100);hair.rotation.set(F.rx*d,F.ry*d,F.rz*d,'YXZ');hair.scale.setScalar(F.s);B.head.add(hair);
    B.handL?.add(hands[0]);B.handR?.add(hands[1]);hands.forEach(x=>x.position.set(0,0,0));
    dress();root.add(model);update(0);}).catch(e=>{console.warn('VRoid rider failed to load; using the old figure',e);if(disposed||!opt.fallback)return;fb=opt.fallback();root.add(fb.root);
    fb.hands.forEach((h,i)=>{hands[i].parent?.remove(hands[i]);hands[i]=h;});});

  function dress(){for(const id in cloth){const o=cloth[id],on=id==='undertop'?true:id==='underbottom'?false:id==='helmet'?helmetOn:wear.top===id||wear.bottom===id||wear.shoes===id;o.visible=on;if(o.userData.ol)o.userData.ol.visible=on;}
    if(hair)hair.scale.setScalar(HAIR_FITS[hairKey].s*(helmetOn?.94:1));
    // the bun's knot pokes through the helmet shell: under a helmet, drop what sits above the skull (hidden anyway)
    U.uCut.value=helmetOn&&hairKey==='bun'?.2:9;}

  function avg(t){const im=t?.image;if(!im)return new T.Color(1,1,1);const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d');x.drawImage(im,0,0,32,32);const p=x.getImageData(0,0,32,32).data;let r=0,g=0,b=0,n=0;
    for(let i=0;i<p.length;i+=4){if(p[i+3]<200)continue;const mx=Math.max(p[i],p[i+1],p[i+2]);if(mx<40||mx>250&&Math.min(p[i],p[i+1],p[i+2])>240)continue;r+=p[i];g+=p[i+1];b+=p[i+2];n++;}
    return n?new T.Color().setRGB(r/n/255,g/n/255,b/n/255,T.SRGBColorSpace):new T.Color(1,1,1);}
  const cel=`float ndl=dot(normalize(vN),uLight);float lit=smoothstep(.02,.12,ndl);`;
  function toon(kind,map,c){const tr=/^(iris|over|brow)$/.test(kind);
    const m=new T.ShaderMaterial({transparent:tr,depthWrite:!tr,uniforms:Object.assign({uMap:{value:map||null},uCol:{value:c||new T.Color()}},U),
      vertexShader:`#include <common>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
attribute float aCover;varying float vC;
varying vec3 vN;varying vec3 vB;varying vec2 vUv;
void main(){vUv=uv;vB=position;vC=aCover;
#include <morphinstance_vertex>
#include <beginnormal_vertex>
#include <morphnormal_vertex>
#include <skinbase_vertex>
#include <skinnormal_vertex>
#include <begin_vertex>
#include <morphtarget_vertex>
#include <skinning_vertex>
vN=normalize(normalMatrix*objectNormal);gl_Position=projectionMatrix*modelViewMatrix*vec4(transformed,1.);}`,
      fragmentShader:`uniform sampler2D uMap;uniform vec3 uCol,uSkin,uRefSkin,uHair,uEye,uRefEye,uLight;varying vec3 vN;varying vec3 vB;varying vec2 vUv;varying float vC;
void main(){vec3 c;float a=1.;${kind==='skin'?'if(vC>.99)discard;':''}
${kind==='skin'||kind==='face'?`${cel} vec4 t=texture2D(uMap,vUv);if(t.a<.5)discard;vec3 b=t.rgb*uSkin/uRefSkin;c=${kind==='face'?'b*mix(.93,1.,smoothstep(-.4,.6,ndl))':'mix(b*vec3(.86,.78,.80),b,lit)'};`:''}
${kind==='cloth'?`${cel} vec3 b=uCol;if(vB.y<.028)b*=.45; c=mix(b*vec3(.74,.72,.82),b,lit);`:''}
${kind==='white'?`vec4 t=texture2D(uMap,vUv);if(t.a<.5)discard;c=t.rgb;`:''}
${kind==='iris'?`vec4 t=texture2D(uMap,vUv);c=t.rgb*uEye/uRefEye;a=t.a;`:''}
${kind==='over'?`vec4 t=texture2D(uMap,vUv);c=t.rgb;a=t.a;`:''}
${kind==='brow'?`vec4 t=texture2D(uMap,vUv);c=mix(uHair*.45,t.rgb,.25);a=t.a;`:''}
gl_FragColor=vec4(c,a);
#include <colorspace_fragment>
}`});mats.push(m);return m;}
  function hairMat(map){const m=new T.ShaderMaterial({side:T.DoubleSide,uniforms:{uMap:{value:map},uHair:U.uHair,uLight:U.uLight,uCut:U.uCut},
    vertexShader:`varying vec3 vN;varying vec2 vUv;varying float vY;void main(){vUv=uv;vY=position.y;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform sampler2D uMap;uniform vec3 uHair,uLight;uniform float uCut;varying vec3 vN;varying vec2 vUv;varying float vY;
void main(){if(vY>uCut)discard;vec4 t=texture2D(uMap,vUv);if(t.a<.5)discard;vec3 n=gl_FrontFacing?vN:-vN;float ndl=dot(normalize(n),uLight);float lit=smoothstep(.02,.12,ndl);
vec3 b=uHair*min(t.rgb*1.12,vec3(1.));gl_FragColor=vec4(mix(b*vec3(.74,.70,.80),b,lit),1.);
#include <colorspace_fragment>
}`});mats.push(m);return m;}
  const OUT=new T.Color(.18,.03,.03);
  function outline(src,w){const m=new T.ShaderMaterial({side:T.BackSide,uniforms:{uC:{value:OUT},uW:{value:w}},
    vertexShader:`#include <common>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
attribute float aCover;varying float vC;uniform float uW;void main(){vC=aCover;
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
    fragmentShader:`uniform vec3 uC;varying float vC;void main(){if(vC>.99)discard;gl_FragColor=vec4(uC,1.);
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
  function update(dt,{pose:p=pose,fast=false,speed=0,air=0,talk=0}={}){pose=p;clock+=dt;blinkAt-=dt;if(blinkAt<0){blink=.13;blinkAt=2.5+Math.random()*3.5;}blink=Math.max(0,blink-dt);
    if(fb){fb.update(dt,{pose:p,fast,speed,air});return;}
    if(!B)return;
    // Talking: tk eases in/out; a syllable every ~0.11 s picks a vowel shape and opens the mouth, with little gaps between words.
    tk+=((talk>0?1:0)-tk)*Math.min(1,dt*6);syl-=dt;if(syl<0){const gap=talk>.5&&Math.random()<.16;syl=gap?.16+Math.random()*.12:.08+Math.random()*.07;vow=gap?-1:Math.floor(Math.random()*5);}
    mouth+=(((talk>.5&&vow>=0)?.55+.4*Math.sin(Math.min(1,1-syl/.12)*Math.PI):0)-mouth)*Math.min(1,dt*22);
    for(const o of face){const d=o.morphTargetDictionary,m=o.morphTargetInfluences;if(d.Fcl_EYE_Close!=null)m[d.Fcl_EYE_Close]=blink>0?1:0;
      VOW.forEach((n,i)=>{if(d[n]!=null)m[d[n]]=i===vow?mouth*tk:m[d[n]]*.6;});if(d.Fcl_MTH_Fun!=null)m[d.Fcl_MTH_Fun]=.35*tk*(1-mouth);}
    const wantHelmet=pose==='ride'||outfit.hat==='helmet';if(wantHelmet!==helmetOn){helmetOn=wantHelmet;dress();}
    for(const b of Object.values(B))b.quaternion.copy(rest[b.name].q);
    const P={'upper_arm.L':[[Z,-72]],'upper_arm.R':[[Z,72]],'forearm.L':[[Z,-8]],'forearm.R':[[Z,8]]};   // VRoid rests in a T pose
    const add=(k,l)=>{P[k]=[...(P[k]||[]),...l];};let bob=0;
    // Walk weight (2026-11-12): the walk eases in from a neutral stance (phase restarts at 0) and eases out, instead of
    // snapping the legs to mid-stride on the first frame.
    const wkT=pose==='walk'?1:0;wk+=(wkT-wk)*Math.min(1,dt*(wkT?8:6));if(pose==='ride'||pose==='sit')wk=0;if(!wkT&&wk<.01){wk=0;phase=0;}
    if(wk>0){phase+=dt*(fast?11:7.5);const s=Math.sin(phase),c=Math.cos(phase),k=(fast?1.25:1)*wk,sl=Math.sin(phase-.45),c2=Math.cos(2*phase);
      add('thigh.L',[[X,-26*s*k]]);add('thigh.R',[[X,26*s*k]]);add('shin.L',[[X,Math.max(0,32*c*k)]]);add('shin.R',[[X,Math.max(0,-32*c*k)]]);
      add('foot.L',[[X,-10*Math.max(0,-c)*k]]);add('foot.R',[[X,-10*Math.max(0,c)*k]]);
      // arms swing from the shoulder with the elbows bending on the forward swing and the hands trailing a beat behind
      add('upper_arm.L',[[X,22*s*k]]);add('upper_arm.R',[[X,-22*s*k]]);add('shoulder.L',[[X,4*s*k]]);add('shoulder.R',[[X,-4*s*k]]);
      add('forearm.L',[[Y,-(12+22*Math.max(0,-sl))*k]]);add('forearm.R',[[Y,(12+22*Math.max(0,sl))*k]]);
      add('hand.L',[[Z,-6*k],[X,8*Math.sin(phase-.9)*k]]);add('hand.R',[[Z,6*k],[X,-8*Math.sin(phase-.9)*k]]);
      // body: hips turn and drop with each step, chest counter-turns, head stays on target with a little nod
      add('hips',[[Y,4*s*wk],[Z,2.5*s*wk]]);add('spine',[[Z,-1.5*s*wk],[X,(fast?4:2)*wk]]);add('chest',[[Y,-6*s*wk]]);add('neck',[[X,-1.5*c2*wk]]);add('head',[[Y,2*s*wk],[Z,-1*s*wk]]);
      bob=Math.abs(Math.sin(phase))*.012*wk;}
    if(pose==='ride'){const fold=8+16*Math.min(1,speed)+20*air;
      add('thigh.L',[[X,RIDE.tx],[Z,RIDE.tz]]);add('thigh.R',[[X,RIDE.tx],[Z,-RIDE.tz]]);add('shin.L',[[X,RIDE.sx],[Z,RIDE.sz]]);add('shin.R',[[X,RIDE.sx],[Z,-RIDE.sz]]);add('foot.L',[[X,-10]]);add('foot.R',[[X,-10]]);
      add('spine',[[X,fold*.5]]);add('chest',[[X,fold*.5]]);add('neck',[[X,-fold*.6]]);
      add('upper_arm.L',[[X,-30]]);add('upper_arm.R',[[X,-30]]);add('forearm.L',[[Y,-80],[X,22]]);add('forearm.R',[[Y,80],[X,22]]);}
    else if(pose==='sit'){add('thigh.L',[[X,-85]]);add('thigh.R',[[X,-85]]);add('shin.L',[[X,85]]);add('shin.R',[[X,85]]);
      add('upper_arm.L',[[X,-25]]);add('upper_arm.R',[[X,-25]]);add('forearm.L',[[X,-20]]);add('forearm.R',[[X,-20]]);}
    else{const iw=1-wk,br=Math.sin(clock*1.9);   // idle: breathing, soft elbows, a slow weight shift and glances around
      add('upper_arm.L',[[X,Math.sin(clock*1.6)*2*iw],[Z,-1.2*br*iw]]);add('upper_arm.R',[[X,-Math.sin(clock*1.6)*2*iw],[Z,1.2*br*iw]]);add('chest',[[X,br*1.4*iw]]);
      add('forearm.L',[[Y,-10*iw]]);add('forearm.R',[[Y,10*iw]]);add('shoulder.L',[[Z,.8*br*iw]]);add('shoulder.R',[[Z,-.8*br*iw]]);
      const ws=Math.sin(clock*.45);add('hips',[[Z,1.6*ws*iw]]);add('spine',[[Z,-1*ws*iw]]);
      add('head',[[Y,(7*Math.sin(clock*.31)+3*Math.sin(clock*.83))*iw*(1-tk)],[X,1.5*Math.sin(clock*.57)*iw]]);
      if(tk>.01){// talking: weight shifts hip to hip, head nods and tilts, hands come up to gesture now and then
        gestAt-=dt;if(gestAt<0){gestAt=talk>.5?.9+Math.random()*1.6:2.5;const r=Math.random();tgL=talk>.5&&r<.45?.4+Math.random()*.6:r<.6?.15:0;tgR=talk>.5&&r>.3?.4+Math.random()*.6:0;}
        gL+=(tgL-gL)*Math.min(1,dt*3.5);gR+=(tgR-gR)*Math.min(1,dt*3.5);
        const w=Math.sin(clock*.9),k=tk;
        add('hips',[[Z,4*w*k],[Y,3*Math.sin(clock*.45)*k]]);add('spine',[[Z,-2.5*w*k]]);add('chest',[[Z,-2*w*k],[X,-2*k]]);
        add('thigh.L',[[Z,-3*w*k]]);add('thigh.R',[[Z,-3*w*k]]);add('shin.L',[[X,Math.max(0,w)*7*k]]);add('shin.R',[[X,Math.max(0,-w)*7*k]]);
        add('neck',[[X,(Math.sin(clock*3.1)*3+Math.sin(clock*7.3)*mouth*1.5)*k],[Z,3*Math.sin(clock*.7)*k]]);add('head',[[Z,-4*w*k],[Y,4*Math.sin(clock*.53)*k]]);
        const wv=Math.sin(clock*4.2)*6,wv2=Math.sin(clock*3.6+1)*6;
        add('upper_arm.L',[[Z,18*gL*k],[X,-(18+wv*.4)*gL*k]]);add('forearm.L',[[Y,-(60+wv)*gL*k]]);add('hand.L',[[X,-10*gL*k]]);
        add('upper_arm.R',[[Z,-18*gR*k],[X,-(18+wv2*.4)*gR*k]]);add('forearm.R',[[Y,(60+wv2)*gR*k]]);add('hand.R',[[X,-10*gR*k]]);}}
    // Fingers (2026-11-12): relaxed curl at rest and walking, a loose fist on the reins. Fingers lie along ±x in the
    // T pose with the palm down, so curling is a turn about z (left hand negative, right positive).
    {const g=pose==='ride'?1:pose==='sit'?.45:.3+.08*Math.sin(clock*.7);
      for(const sd of 'LR'){const sg=sd==='L'?-1:1;
        ['Index','Middle','Ring','Little'].forEach((f,i)=>{const e=1+i*.12;P['J_Bip_'+sd+'_'+f+'1']=[[Z,sg*(18+52*g)*e]];P['J_Bip_'+sd+'_'+f+'2']=[[Z,sg*(22+68*g)*e]];P['J_Bip_'+sd+'_'+f+'3']=[[Z,sg*(14+46*g)*e]];});
        P['J_Bip_'+sd+'_Thumb2']=[[Y,-sg*(10+20*g)]];P['J_Bip_'+sd+'_Thumb3']=[[Y,-sg*(8+22*g)]];}}
    // Rain gear (v71): an umbrella is held up in the right hand, like a rein hand (same angles as the ride pose).
    if(gear.umbrella&&pose!=='ride'&&pose!=='sit'){P['upper_arm.R']=[[Z,72],[X,-34]];P['forearm.R']=[[Z,8],[Y,84],[X,26]];delete P['hand.R'];}
    // caller overrides (cave ropes): stand-in rotations in radians
    arms.forEach((a,i)=>{if(a.rotation.x||a.rotation.z){const s=i?'R':'L';P['upper_arm.'+s]=[[Z,i?72:-72],[X,a.rotation.x*R2D],[Z,-a.rotation.z*R2D*(i?-1:1)]];}a.rotation.set(0,0,0);});
    legs.forEach((l,i)=>{if(l.rotation.x){add('thigh.'+(i?'R':'L'),[[X,l.rotation.x*R2D]]);}l.rotation.set(0,0,0);});
    for(const k in P)rot(k,P[k]);
    if(gearDirty)applyGear();
    if(gearObj.umbrella?.visible){let q=qa.copy(B.handR.quaternion),o=B.handR.parent;while(o&&o!==model){q.premultiply(o.quaternion);o=o.parent;}gearObj.umbrella.quaternion.copy(q).invert();}
    model.position.y=bob*SIZE;}
  // In 'ride' the hips sit on the saddle: place root at seat + seatOffset().
  const seatOffset=()=>fb?fb.seatOffset():-hipY+RIDE.seat;
  // setGear({umbrella, poncho, color}): rain gear in metres on the bones (hand.R, chest). Built on first use.
  let gear={umbrella:false,poncho:false,color:'#d0453c'},gearDirty=false;const gearObj={};
  function setGear(g={}){const n={umbrella:!!g.umbrella,poncho:!!g.poncho,color:g.color||gear.color};
    if(n.umbrella===gear.umbrella&&n.poncho===gear.poncho&&n.color===gear.color)return;gear=n;gearDirty=true;if(fb)fb.setGear?.(g);}
  function applyGear(){if(!B?.handR||!B?.chest)return;gearDirty=false;
    if(gear.umbrella&&!gearObj.umbrella){gearObj.umbrella=makeUmbrella(T,gear.color);B.handR.add(gearObj.umbrella);}
    if(gearObj.umbrella){gearObj.umbrella.visible=gear.umbrella;gearObj.umbrella.userData.tint(gear.color);}
    if(gear.poncho&&!gearObj.poncho){gearObj.poncho=makePoncho(T);const inv=rest[B.chest.name].w.clone().invert();gearObj.poncho.quaternion.copy(inv);gearObj.poncho.position.applyQuaternion(inv);B.chest.add(gearObj.poncho);}
    if(gearObj.poncho)gearObj.poncho.visible=gear.poncho;}
  function dispose(){disposed=true;fb?.dispose();root.parent?.remove(root);mats.forEach(m=>m.dispose());}
  return {root,body:root,hips:root,torso:root,neck:root,head:root,legs,knees:[],feet:[],arms,elbows:[],hands,look,update,setPose,seatOffset,dispose,setGear,vroid:true};
}

// Rain gear meshes (v71), in metres. Shared geometry; one material per umbrella colour.
const GEAR={};
function gearGeo(T){if(GEAR.T===T)return GEAR;GEAR.T=T;
  GEAR.canopy=new T.ConeGeometry(.56,.2,8,1,true);GEAR.canopy.translate(0,-.1,0);
  GEAR.pole=new T.CylinderGeometry(.012,.012,.98,6);GEAR.pole.translate(0,.4,0);
  GEAR.tip=new T.SphereGeometry(.025,6,4);GEAR.hook=new T.TorusGeometry(.04,.012,5,8,Math.PI);
  GEAR.cape=new T.ConeGeometry(.44,.72,12,1,true);GEAR.cape.translate(0,-.36,0);
  GEAR.hood=new T.SphereGeometry(.13,10,6,0,Math.PI*2,0,Math.PI*.55);
  GEAR.dark=new T.MeshLambertMaterial({color:'#3a3230'});GEAR.mats=new Map();
  GEAR.slicker=new T.MeshLambertMaterial({color:'#f2c230',side:T.DoubleSide});return GEAR;}
function makeUmbrella(T,color){const G=gearGeo(T),g=new T.Group();g.name='umbrella';
  const mat=c=>{if(!G.mats.has(c))G.mats.set(c,new T.MeshLambertMaterial({color:c,side:T.DoubleSide}));return G.mats.get(c);};
  const lean=new T.Group();lean.rotation.set(-.22,0,.12);g.add(lean);
  const pole=new T.Mesh(G.pole,G.dark),top=new T.Mesh(G.canopy,mat(color)),tip=new T.Mesh(G.tip,G.dark),hook=new T.Mesh(G.hook,G.dark);
  top.position.y=1.0;tip.position.y=1.0;hook.position.y=-.08;hook.rotation.z=Math.PI;top.castShadow=true;
  lean.add(pole,top,tip,hook);g.userData.tint=c=>{top.material=mat(c);};return g;}
// A yellow rain poncho: a flared cone from the collar, the hood down at the back so a riding helmet still fits.
function makePoncho(T){const G=gearGeo(T),g=new T.Group();g.name='poncho';
  const cape=new T.Mesh(G.cape,G.slicker),hood=new T.Mesh(G.hood,G.slicker);
  g.position.set(0,.25,0);cape.scale.set(1,1,.82);hood.position.set(0,-.06,-.12);hood.rotation.x=-1.9;hood.scale.set(1,.7,.9);
  cape.castShadow=true;g.add(cape,hood);return g;}
