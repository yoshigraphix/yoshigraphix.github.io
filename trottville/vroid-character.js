// The VRoid rider (2026-11-11): one anime girl for every person in the game, coloured per look (skin, eyes, hair, outfit
// colours) so riders still look different. Built in the rider lab (rider-lab/vroid: vbuild.py → rider_v.glb, the hair
// from CGTrader 'hair_m1', placed by Yoshi in maker5.html). Same interface as the old chibi character
// (chibi-character.js): {root, hands, legs, arms, update(dt,{pose,fast,speed,air}), seatOffset(), dispose()...}.
// The model loads once (async) and is cloned per person; until it has loaded, root is an empty group.
// Root origin is between the feet, facing +z. Poses are bone rotations about the model's own axes (VRoid rest axes
// are aligned with the world, see rot()).
import {GLTFLoader} from './vendor/three-0.180.0/addons/loaders/GLTFLoader.js?v=161';
import {normalizeLook,outfitOf,drawnSkin,drawnHair,hairModelOf} from './character-looks.mjs?v=161';

const SIZE=1.25;            // game units per metre: the old chibi stood ≈2.0 units, the girl is 1.6 m
const AGE=14;               // default age; look.height (−1…1) moves it 11…16 (the Me designer's Height slider)
const ageOf=l=>{const h=+l.height||0;return AGE+(h<0?3*h:2*h);};
const hgtAt=a=>{const lo=Math.floor(a),hi=Math.min(20,lo+1),t=a-lo;return HGT[lo]+(HGT[hi]-HGT[lo])*t;};
const HAIR_FIT={x:1.8,y:9.8,z:-0.9,rx:0,ry:-57,rz:0,s:0.78};   // Yoshi's placement, head-bone space (cm, degrees)
// long + bun (2026-11-12) are built in head-bone space already (rider-lab/vroid/hairfit.py), so they sit at the origin.
const HAIR_FITS={bob:HAIR_FIT,long:{x:0,y:1.6,z:0,rx:0,ry:0,rz:0,s:1},   // long raised ~an eye's height (Yoshi 2026-11-12)
  bun:{x:0,y:0,z:0,rx:0,ry:0,rz:0,s:1}};
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
      g.scene.updateMatrixWorld(true);const rest={};
      g.scene.traverse(o=>{if(o.isBone)rest[o.name]={q:o.quaternion.clone(),w:o.getWorldQuaternion(new THREE_Q())};});
      markCovered(g.scene,rest);
      return {g,h,rest};});}
  return assets;}
let THREE_Q=null,THREE_T=null;
export const preloadRider=T=>{THREE_Q=THREE_Q||T.Quaternion;THREE_T=THREE_T||T;return load();};

// Skin poking through clothes (Yoshi 2026-11-12: shoulders through tops, hips through shorts when riding): body skin that
// every top (tee, long tee, jacket) or every bottom (breeches, jeans, shorts) covers is not drawn. Once per load, in the shared
// rest geometry: a body vertex is inside a garment when the nearest garment vertex is within 3.5 cm and the body vertex lies
// behind that vertex's normal. Near a garment's open edges (collar, hem, cuffs, waist) it stays drawn unless the other
// group covers it too (the waist overlap), so nothing opens up at a seam. Arms (|x|>.16 m in the T pose) are never dropped:
// you can see into the sleeves. Stored as the aCover attribute; skin and outline shaders drop fully covered triangles.
function markCovered(scene,rest){let body=null;const groups={top:[],bottom:[]};
  scene.traverse(o=>{if(!o.isMesh)return;const n=o.material?.name||'';if(/Body_00_SKIN/.test(n))body=o;else if(/^Cloth_(tee|longtee|jacket)$/.test(n))groups.top.push(o);else if(/^Cloth_(breeches|jeans|shorts)$/.test(n))groups.bottom.push(o);});
  if(!body||body.geometry.getAttribute('aCover')||body.geometry.getAttribute('position').isInterleavedBufferAttribute)return;
  const rbp=body.geometry.getAttribute('position'),N=rbp.count,C=.02,key=(x,y,z)=>Math.floor(x/C)+','+Math.floor(y/C)+','+Math.floor(z/C);
  const test=(list,margin,out=0,G=m=>m.geometry)=>{const inside=new Uint8Array(N).fill(list.length?1:0),edgy=new Uint8Array(N),bp=G(body).getAttribute('position');
    for(const t of list){const g=G(t),p=g.getAttribute('position'),nr=g.getAttribute('normal'),ix=g.index;
      const vk=i=>Math.round(p.getX(i)*2000)+'_'+Math.round(p.getY(i)*2000)+'_'+Math.round(p.getZ(i)*2000),ec=new Map();
      if(ix)for(let f=0;f<ix.count;f+=3)for(let e=0;e<3;e++){const a=vk(ix.getX(f+e)),b=vk(ix.getX(f+(e+1)%3)),k=a<b?a+'|'+b:b+'|'+a;ec.set(k,(ec.get(k)||0)+1);}
      const open=new Set();for(const [k,c] of ec)if(c===1)k.split('|').forEach(v=>open.add(v));
      const grid=new Map(),edge=new Map();
      for(let i=0;i<p.count;i++){const k=key(p.getX(i),p.getY(i),p.getZ(i));(grid.get(k)||grid.set(k,[]).get(k)).push(i);if(open.has(vk(i)))(edge.get(k)||edge.set(k,[]).get(k)).push(i);}
      const near=(m,x,y,z,r)=>{let best=-1,bd=r*r;const cx=Math.floor(x/C),cy=Math.floor(y/C),cz=Math.floor(z/C),s=Math.ceil(r/C);
        for(let a=-s;a<=s;a++)for(let b=-s;b<=s;b++)for(let c=-s;c<=s;c++){const l=m.get((cx+a)+','+(cy+b)+','+(cz+c));if(l)for(const i of l){const d=(p.getX(i)-x)**2+(p.getY(i)-y)**2+(p.getZ(i)-z)**2;if(d<bd){bd=d;best=i;}}}return best;};
      for(let v=0;v<N;v++){if(!inside[v])continue;const x=bp.getX(v),y=bp.getY(v),z=bp.getZ(v),rx=rbp.getX(v),ry=rbp.getY(v);
        if(Math.abs(rx)>(ry>1.2?.24:.16)){inside[v]=0;continue;}// v93: shoulder tops (above the armpit) count too; they poked through the tee
        const i=near(grid,x,y,z,.035),dp=i<0?1:(x-p.getX(i))*nr.getX(i)+(y-p.getY(i))*nr.getY(i)+(z-p.getZ(i))*nr.getZ(i);
        // v84: torso skin poking just out through the garment (the lower back under a tee) counts as covered too
        if(i<0||dp>(Math.abs(rx)<.11&&ry<1.15&&ry>.95?out:0)){inside[v]=0;continue;}
        if(near(edge,x,y,z,margin(ry))>=0)edgy[v]=1;}}
    return {inside,edgy};};
  // v84: covered only if covered both in the T pose (as modelled) and standing with the arms down, where the collar and
  // shoulders shift; skin the shirt uncovers when posed stays skin instead of a hole.
  const both=(a,b)=>({inside:a.inside.map((v,i)=>v&&b.inside[i]?1:0),edgy:a.edgy.map((v,i)=>v||b.edgy[i]?1:0)});
  const P=posedGeometries(scene,rest,[body,...groups.top,...groups.bottom]),G=m=>P.get(m)||m.geometry;
  const mT=y=>y>1.2?.004:.025,mB=()=>.02;
  const t1=test(groups.top,mT,.02),t2=test(groups.top,mT,.02,G);const T=both(t1,t2),Bt=both(test(groups.bottom,mB),test(groups.bottom,mB,0,G)),cover=new Float32Array(N);
  // aCover 1 = covered; aBot 1 = by the bottoms, not the top (two flags: one 0/1/2 value blended through 'top' at a hem) (v84: drawn in that garment's colour, not cut away, so a gap never shows through)
  const bot=new Float32Array(N);for(let v=0;v<N;v++){const t=T.inside[v]&&(!T.edgy[v]||Bt.inside[v]),b=Bt.inside[v]&&(!Bt.edgy[v]||T.inside[v]);cover[v]=t||b?1:0;bot[v]=!t&&b?1:0;}
  body.geometry.setAttribute('aCover',new rbp.constructor(cover,1));body.geometry.setAttribute('aBot',new rbp.constructor(bot,1));}

// The meshes as skinned standing with the arms down (the idle pose), as plain geometries with fresh normals.
function posedGeometries(scene,rest,meshes){const out=new Map();if(!rest||!THREE_T)return out;const T=THREE_T,bones={};scene.traverse(o=>{if(o.isBone)bones[o.name]=o;});
  const Z=new T.Vector3(0,0,1),q=new T.Quaternion();
  for(const [n,deg] of [['upper_armL',-72],['upper_armR',72],['forearmL',-8],['forearmR',8]]){const b=bones[n],R=rest[n];if(!b||!R)continue;
    q.setFromAxisAngle(Z,deg*Math.PI/180);b.quaternion.copy(R.q).multiply(R.w.clone().invert().multiply(q).multiply(R.w));}
  scene.updateMatrixWorld(true);const v=new T.Vector3();
  for(const m of meshes){if(!m?.isSkinnedMesh)continue;const src=m.geometry,n=src.getAttribute('position').count,a=new Float32Array(n*3);
    for(let i=0;i<n;i++){m.getVertexPosition(i,v);a[i*3]=v.x;a[i*3+1]=v.y;a[i*3+2]=v.z;}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(a,3));if(src.index)g.setIndex(src.index);g.computeVertexNormals();out.set(m,g);}
  for(const n in rest)if(bones[n])bones[n].quaternion.copy(rest[n].q);scene.updateMatrixWorld(true);return out;}

// Clone a skinned scene: Object3D.clone keeps the old skeleton, so rebind each skinned mesh to the cloned bones.
function cloneSkinned(T,src){const c=src.clone(true),a=[],b=[];src.traverse(o=>a.push(o));c.traverse(o=>b.push(o));const map=new Map(a.map((o,i)=>[o,b[i]]));
  a.forEach((o,i)=>{if(o.isSkinnedMesh){const n=b[i];n.bind(new T.Skeleton(o.skeleton.bones.map(x=>map.get(x)),o.skeleton.boneInverses),o.bindMatrix);}});return c;}

const TOP={jacket:'jacket',silks:'jacket',armor:'jacket',robe:'longtee',bomber:'longtee',hoodie:'longtee',tunic:'tee',dress:'tee',sailor:'tee',overalls:'tee'};
const BOTTOM={jodhpurs:'breeches',breeches:'breeches',tights:'breeches',pants:'jeans',joggers:'jeans',shorts:'shorts',skirt:'shorts'};
const SHOES={tall:'tallboots',boots:'paddock',sneakers:'sneakers',shoes:'sneakers'};

// People light (2026-11-12, v83): the VRoid shaders are unlit toon, so at night they glowed. Every material multiplies by
// one shared colour the 3D world sets from the sky each frame (setPeopleLight); the character designer passes
// opt.fullLight to keep its preview at full brightness.
const PEOPLE={light:null,full:null};
export function setPeopleLight(c){if(PEOPLE.light)PEOPLE.light.value.copy(c);}
export function resetPeopleLight(){if(PEOPLE.light)PEOPLE.light.value.setRGB(1,1,1);CROWD.clear();}
// v158: every person's skinned meshes are frustumCulled=false (a skinned mesh's box doesn't follow its pose), so everyone in the
// whole world was drawn, and drawn again into the shadow map, every frame. The 3D world calls cullPeople once a frame: people
// off screen or far away are hidden and skip their animation. Close ones behind the camera stay, their shadows can fall in view.
const CROWD=new Set();const CULL={far:85,near:14,r:3,detail:32};let cullF=null,cullM=null,cullS=null;
export function cullPeople(camera,scene){if(!THREE_T||!CROWD.size)return;if(!cullF){cullF=new THREE_T.Frustum();cullM=new THREE_T.Matrix4();cullS=new THREE_T.Sphere();}
  camera.updateMatrixWorld();cullF.setFromProjectionMatrix(cullM.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));const c=camera.matrixWorld.elements;
  for(const p of CROWD){let top=p.root;while(top.parent)top=top.parent;if(top!==scene){p.hide(false);p.far(false);continue;}const e=p.root.matrixWorld.elements,d=Math.hypot(e[12]-c[12],e[13]-c[13],e[14]-c[14]);
    cullS.center.set(e[12],e[13]+1,e[14]);cullS.radius=CULL.r;p.hide(d>CULL.far||(d>CULL.near&&!cullF.intersectsSphere(cullS)));p.far(d>CULL.detail);}}
export function makeVroidCharacter(T,rawLook,opt={}){
  if(!PEOPLE.light){PEOPLE.light={value:new T.Color(1,1,1)};PEOPLE.full={value:new T.Color(1,1,1)};}
  THREE_Q=THREE_Q||T.Quaternion;THREE_T=THREE_T||T;
  const look=normalizeLook(rawLook);let outfit=outfitOf(look),C=outfit.colors;
  const root=new T.Group();root.name='rider';
  const hands=[new T.Object3D(),new T.Object3D()];hands[0].position.set(-.45,1.1,0);hands[1].position.set(.45,1.1,0);root.add(...hands);
  // Stand-ins so callers that poke limbs (cave ropes) still work: their rotations are added on top of the pose.
  const arms=[new T.Object3D(),new T.Object3D()],legs=[new T.Object3D(),new T.Object3D()];
  const U={uSkin:{value:new T.Color(drawnSkin(look.skin))},uRefSkin:{value:new T.Color(1,1,1)},uHair:{value:new T.Color(drawnHair(look.skin,look.hairColor))},uEye:{value:new T.Color(look.eyeColor)},uRefEye:{value:new T.Color(1,1,1)},
    uLight:{value:new T.Vector3(.45,.75,.5).normalize()},uCut:{value:9},uTop:{value:new T.Color()},uBot:{value:new T.Color()}};
  U.uDim=opt.fullLight?PEOPLE.full:PEOPLE.light;   // uCut: hair above this head-local height is clipped (helmet on)
  const wear={top:TOP[outfit.top]||'tee',bottom:BOTTOM[outfit.bottom]||'breeches',shoes:SHOES[outfit.boots]||'sneakers'};
  const col={top:U.uTop.value.set(C.top),bottom:U.uBot.value.set(C.bottom),shoes:new T.Color(C.boots||'#2b2220'),helmet:new T.Color(C.hat||(outfit.hat==='helmet'?C.top:'#2b2b2b'))};
  const mats=[],face=[],cloth={};let B=null,rest=null,model=null,hair=null,hairKey=hairModelOf(look.hair),helmetOn=false,disposed=false,AGE_S=HGT[AGE]/1.58,HA=null;
  let hipY=.87*AGE_S*SIZE;
  let fb=null,pose='stand',phase=0,wk=0,rn=0,rs=0,clock=0,blinkAt=2+Math.random()*3,blink=0,lastP={},tk=0,syl=0,vow=0,mouth=0,gest=0,gestAt=0,gL=0,gR=0,tgL=0,tgR=0,ak=0,actName=null,fidT=4+Math.random()*6,fid=null,fidP=0,wv=0;const VOW=['Fcl_MTH_A','Fcl_MTH_I','Fcl_MTH_U','Fcl_MTH_E','Fcl_MTH_O'];

  load().then(({g,h,rest:R})=>{if(disposed)return;rest=R;HA=h;model=cloneSkinned(T,g.scene);
    const meshes=[];model.traverse(o=>{if(o.isMesh)meshes.push(o);});
    for(const o of meshes){const mn=o.material.name,map=o.material.map;o.frustumCulled=false;o.castShadow=true;
      if(o.morphTargetDictionary?.Fcl_EYE_Close!=null){o.morphTargetInfluences=o.morphTargetInfluences.slice();face.push(o);}
      if(mn.startsWith('Cloth_')){const id=mn.slice(6),slot=id==='helmet'?'helmet':id==='undertop'?'top':id==='underbottom'?'bottom':Object.entries({top:['tee','longtee','jacket'],bottom:['breeches','jeans','shorts'],shoes:['tallboots','paddock','sneakers']}).find(([,l])=>l.includes(id))?.[0];
        cloth[id]=o;o.material=toon('cloth',null,slot?col[slot]:new T.Color(look.skin).multiplyScalar(.9));o.material.side=T.DoubleSide;o.userData.olw=/^under/.test(id)?.0025:.0032;o.userData.ol=outline(o,o.userData.olw);}
      else if(/Body_00_SKIN/.test(mn)){U.uRefSkin.value.copy(avg(map));o.material=toon('skin',map);outline(o,.0036);}
      else if(/Face_00_SKIN|FaceMouth/.test(mn)){o.material=toon('face',map);if(/Mouth/.test(mn))o.renderOrder=1;}
      else if(/EyeWhite/.test(mn)){o.material=toon('white',map);o.renderOrder=1;}
      else if(/EyeIris/.test(mn)){U.uRefEye.value.copy(avg(map));o.material=toon('iris',map);o.renderOrder=2;}
      else if(/EyeHighlight|FaceEyeline/.test(mn)){o.material=toon('over',map);o.renderOrder=/High/.test(mn)?4:3;}
      else if(/FaceBrow/.test(mn)){o.material=toon('brow',map);o.renderOrder=3;}
      else o.visible=false;}
    B={};model.traverse(o=>{if(o.isBone)B[o.name.replace(/\./g,'')]=o;});
    applyAge(ageOf(look));makeHair();
    B.handL?.add(hands[0]);B.handR?.add(hands[1]);hands.forEach(x=>x.position.set(0,0,0));
    dress();root.add(model);model.visible=!culled;update(0);}).catch(e=>{console.warn('VRoid rider failed to load; using the old figure',e);if(disposed||!opt.fallback)return;fb=opt.fallback();root.add(fb.root);
    fb.hands.forEach((h,i)=>{hands[i].parent?.remove(hands[i]);hands[i]=h;});});

  // Age (the lab's setAge): height, child shape and head size. Re-run live by setLook when the Height slider moves.
  // Taller half of the slider (v84): up to 5% more height and a slight chest from the side (the bust bones), shorter half unchanged.
  function applyAge(a){if(!model)return;const tall=Math.max(0,Math.min(1,+look.height||0));AGE_S=hgtAt(a)*(1+.05*tall)/1.58;hipY=.87*AGE_S*SIZE;
    for(const k of ['J_Sec_L_Bust1','J_Sec_R_Bust1'])B[k]?.scale.setScalar(1+.28*tall);
    const ch=1-Math.min(1,Math.max(0,(a-9)/7)),kc=ch*ch*(3-2*ch);
    model.traverse(o=>{const d=o.morphTargetDictionary;if(d&&d.Child!=null){o.morphTargetInfluences=o.morphTargetInfluences||[];o.morphTargetInfluences[d.Child]=kc;}});
    model.scale.setScalar(AGE_S*SIZE);const hr=a>=16?1:.90+.10*(a-8)/8;B.head.scale.setScalar(hr/AGE_S);}
  // hair: a tinted, alpha-cut clone of the chosen hair model (bob = CGTrader, long = Arisa, bun = hair1) on the head bone
  function makeHair(){if(!HA||!B)return;if(hair){hair.parent?.remove(hair);hair.traverse(o=>{if(o.isMesh){o.material.dispose();const i=mats.indexOf(o.material);if(i>=0)mats.splice(i,1);}});}
    if(!HA[hairKey])hairKey='bob';   // a stale cached hair file without the new styles still gets a rider
    hair=new T.Group();const hs=HA[hairKey].scene.clone(true);hs.traverse(o=>{if(o.isMesh){const map=o.material.map;map.colorSpace=T.SRGBColorSpace;o.material=hairMat(map);o.frustumCulled=false;o.castShadow=true;}});
    hair.add(hs);const d=Math.PI/180,F=HAIR_FITS[hairKey];hair.position.set(F.x/100,F.y/100,F.z/100);hair.rotation.set(F.rx*d,F.ry*d,F.rz*d,'YXZ');hair.scale.setScalar(F.s);B.head.add(hair);dress();}
  // setLook: change colours, outfit, hair and height in place (the designer's sliders), no rebuild.
  function setLook(raw){const L=normalizeLook(raw);if(fb){fb.setLook?.(L);return;}
    const oldAge=ageOf(look),oldHair=hairKey;Object.assign(look,L);outfit=outfitOf(look);C=outfit.colors;
    U.uSkin.value.set(drawnSkin(look.skin));U.uHair.value.set(drawnHair(look.skin,look.hairColor));U.uEye.value.set(look.eyeColor);
    wear.top=TOP[outfit.top]||'tee';wear.bottom=BOTTOM[outfit.bottom]||'breeches';wear.shoes=SHOES[outfit.boots]||'sneakers';
    col.top.set(C.top);col.bottom.set(C.bottom);col.shoes.set(C.boots||'#2b2220');col.helmet.set(C.hat||(outfit.hat==='helmet'?C.top:'#2b2b2b'));
    hairKey=hairModelOf(look.hair);if(hairKey!==oldHair)makeHair();if(ageOf(look)!==oldAge||'height' in L)applyAge(ageOf(look));
    const wantHelmet=pose==='ride'||outfit.hat==='helmet';helmetOn=wantHelmet;dress();}
  // Winter land (v117): puffy pieces swell the cloth along its normals in quilted rows; mittens sit on the hand bones.
  let mitts=null;
  function dress(){const X=outfit.extras||[],puff=id=>id===wear.top&&X.includes('puffy')?.028:id==='undertop'&&X.includes('puffy')?.024:id===wear.bottom&&X.includes('puffylegs')?.018:0;
    for(const id in cloth){const o=cloth[id],on=id==='undertop'?wear.top==='jacket':id==='underbottom'?false:id==='helmet'?helmetOn:wear.top===id||wear.bottom===id||wear.shoes===id;o.visible=on;if(o.userData.ol)o.userData.ol.visible=on;
      const p=puff(id);if(o.material.uniforms?.uPuff)o.material.uniforms.uPuff.value=p;const ou=o.userData.ol?.material?.uniforms?.uW;if(ou)ou.value=(o.userData.olw||.003)+p;}
    const wantMitts=X.includes('mittens');if(wantMitts&&!mitts&&B){mitts=hands.map((h,i)=>{const m=new T.Mesh(new T.SphereGeometry(.05,12,10),toon('cloth',null,new T.Color(C.gloves||'#5fb87a')));m.scale.set(1.75,1.1,1.35);m.position.set(i?-.058:.058,-.012,.006);h.add(m);return m;});}
    if(mitts)mitts.forEach(m=>{m.visible=wantMitts;m.material.uniforms.uCol.value.set(C.gloves||'#5fb87a');});
    if(hair)hair.scale.setScalar(HAIR_FITS[hairKey].s*(helmetOn?.94:1));
    // the bun's knot pokes through the helmet shell: under a helmet, drop what sits above the skull (hidden anyway)
    U.uCut.value=helmetOn&&hairKey==='bun'?.2:9;}

  function avg(t){const im=t?.image;if(!im)return new T.Color(1,1,1);const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d');x.drawImage(im,0,0,32,32);const p=x.getImageData(0,0,32,32).data;let r=0,g=0,b=0,n=0;
    for(let i=0;i<p.length;i+=4){if(p[i+3]<200)continue;const mx=Math.max(p[i],p[i+1],p[i+2]);if(mx<40||mx>250&&Math.min(p[i],p[i+1],p[i+2])>240)continue;r+=p[i];g+=p[i+1];b+=p[i+2];n++;}
    return n?new T.Color().setRGB(r/n/255,g/n/255,b/n/255,T.SRGBColorSpace):new T.Color(1,1,1);}
  const cel=`float ndl=dot(normalize(vN),uLight);float lit=smoothstep(.02,.12,ndl);`;
  function toon(kind,map,c){const tr=/^(iris|over|brow)$/.test(kind);
    const m=new T.ShaderMaterial({transparent:tr,depthWrite:!tr,uniforms:Object.assign({uMap:{value:map||null},uCol:{value:c||new T.Color()},uPuff:{value:0}},U),
      vertexShader:`#include <common>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
attribute float aCover,aBot;varying float vC,vBt;uniform float uPuff;
varying vec3 vN;varying vec3 vB;varying vec2 vUv;
void main(){vUv=uv;vB=position;vC=aCover;vBt=aBot;
#include <morphinstance_vertex>
#include <beginnormal_vertex>
#include <morphnormal_vertex>
#include <skinbase_vertex>
#include <skinnormal_vertex>
#include <begin_vertex>
#include <morphtarget_vertex>
transformed-=normalize(objectNormal)*step(.5,aCover)*.003;
transformed+=normalize(objectNormal)*uPuff*(.72+.28*abs(sin(position.y*95.)));
#include <skinning_vertex>
vN=normalize(normalMatrix*objectNormal);gl_Position=projectionMatrix*modelViewMatrix*vec4(transformed,1.);}`,
      fragmentShader:`uniform sampler2D uMap;uniform float uPuff;uniform vec3 uCol,uSkin,uRefSkin,uHair,uEye,uRefEye,uLight,uDim,uTop,uBot;varying vec3 vN;varying vec3 vB;varying vec2 vUv;varying float vC,vBt;
void main(){vec3 c;float a=1.;
${kind==='skin'?`${cel} if(vC>.99){vec3 b=(vBt>.5?uBot:uTop)*.8;c=mix(b*vec3(.74,.72,.82),b,lit);}else{vec4 t=texture2D(uMap,vUv);if(t.a<.5)discard;vec3 b=t.rgb*uSkin/uRefSkin;c=mix(b*vec3(.86,.78,.80),b,lit);}`:''}
${kind==='face'?`${cel} vec4 t=texture2D(uMap,vUv);if(t.a<.5)discard;vec3 b=t.rgb*uSkin/uRefSkin;c=${kind==='face'?'b*mix(.93,1.,smoothstep(-.4,.6,ndl))':'mix(b*vec3(.86,.78,.80),b,lit)'};`:''}
${kind==='cloth'?`${cel} vec3 b=uCol;if(vB.y<.028)b*=.45;if(uPuff>0.)b*=.8+.2*smoothstep(.0,.35,abs(sin(vB.y*95.))); c=mix(b*vec3(.74,.72,.82),b,lit);`:''}
${kind==='white'?`vec4 t=texture2D(uMap,vUv);if(t.a<.5)discard;c=t.rgb;`:''}
${kind==='iris'?`vec4 t=texture2D(uMap,vUv);c=t.rgb*uEye/uRefEye;a=t.a;`:''}
${kind==='over'?`vec4 t=texture2D(uMap,vUv);c=t.rgb;a=t.a;`:''}
${kind==='brow'?`vec4 t=texture2D(uMap,vUv);c=mix(uHair*.45,t.rgb,.25);a=t.a;`:''}
gl_FragColor=vec4(c*uDim,a);
#include <colorspace_fragment>
}`});mats.push(m);return m;}
  function hairMat(map){const m=new T.ShaderMaterial({side:T.DoubleSide,uniforms:{uMap:{value:map},uHair:U.uHair,uLight:U.uLight,uCut:U.uCut,uDim:U.uDim},
    vertexShader:`varying vec3 vN;varying vec2 vUv;varying float vY;void main(){vUv=uv;vY=position.y;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform sampler2D uMap;uniform vec3 uHair,uLight,uDim;uniform float uCut;varying vec3 vN;varying vec2 vUv;varying float vY;
void main(){if(vY>uCut)discard;vec4 t=texture2D(uMap,vUv);if(t.a<.5)discard;vec3 n=gl_FrontFacing?vN:-vN;float ndl=dot(normalize(n),uLight);float lit=smoothstep(.02,.12,ndl);
vec3 b=uHair*min(t.rgb*1.12,vec3(1.));gl_FragColor=vec4(mix(b*vec3(.74,.70,.80),b,lit)*uDim,1.);
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
    const o=new T.SkinnedMesh(src.geometry,m);o.bind(src.skeleton,src.bindMatrix);o.bindMode=src.bindMode;o.userData.isOutline=true;src.parent.add(o);o.position.copy(src.position);o.quaternion.copy(src.quaternion);o.scale.copy(src.scale);o.frustumCulled=false;
    if(src.morphTargetInfluences){o.morphTargetInfluences=src.morphTargetInfluences;o.morphTargetDictionary=src.morphTargetDictionary;}return o;}

  // ---- poses (degrees about the model's X/Y/Z, same as the lab's POSES) ----
  const X=new T.Vector3(1,0,0),Y=new T.Vector3(0,1,0),Z=new T.Vector3(0,0,1),qa=new T.Quaternion(),qb=new T.Quaternion();
  function rot(n,list){const b=B[n.replace(/\./g,'')];if(!b)return;const R=rest[b.name];const q=qb.identity();for(const [ax,deg] of list)if(deg)q.premultiply(qa.setFromAxisAngle(ax,deg*Math.PI/180));
    const wi=R.w.clone().invert();b.quaternion.copy(R.q).multiply(wi.multiply(q).multiply(R.w));}
  const R2D=180/Math.PI;
  function setPose(p){pose=p;}
  let culled=false,distant=false;const crowdMe=opt.fullLight?null:{root,hide(v){if(v===culled)return;culled=v;if(model)model.visible=!v;if(!v&&model)update(0);},
    far(v){if(v===distant||!model)return;distant=v;model.traverse(o=>{if(!o.isMesh)return;if(o.userData.isOutline)o.material.visible=!v;else o.castShadow=!v;});}};if(crowdMe)CROWD.add(crowdMe);
  function update(dt,{pose:p=pose,fast=false,speed=0,air=0,talk=0,steer=0,act=null,wave=0,fidget=true}={}){pose=p;clock+=dt;if(culled&&!fb)return;blinkAt-=dt;if(blinkAt<0){blink=.13;blinkAt=2.5+Math.random()*3.5;}blink=Math.max(0,blink-dt);
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
    // v151 activities (bench, garden, brush, fence, sweep, fish, grass): ak blends the activity in and out.
    const aT=act&&pose!=='ride'&&pose!=='sit'&&pose!=='walk'?1:0;if(act)actName=act;ak+=(aT-ak)*Math.min(1,dt*(aT?2.2:pose==='walk'?9:3.2));if(ak<.004){ak=0;if(!aT)actName=null;}
    const wkT=pose==='walk'?1:0;wk+=(wkT-wk)*Math.min(1,dt*(wkT?8:6));if(pose==='ride'||pose==='sit')wk=0;if(!wkT&&wk<.01){wk=0;phase=0;}
    // v150 (Yoshi: "can the walk be more elegant? like a feminine walk and can the run be faster? and feminine?"):
    // walk = light catwalk: feet land near one line (thighs swing in), more hip roll and turn, steady open shoulders,
    // arms close to the body with a soft forward swing and a relaxed wrist, chin up. run = quick light steps on the toes,
    // high knee in front, heel kick behind, forearms bent with loose hands, a small forward lean, head level.
    // rn blends walk → run; the step rate follows the real ground speed so feet don't slide.
    rn+=((fast?1:0)-rn)*Math.min(1,dt*5);if(!wk)rn=0;
    if(wk>0){const sp=speed||(fast?7.2:3.25);phase+=dt*((1-rn)*(3.1+1.0*sp)+rn*(5.6+.72*sp));
      const s=Math.sin(phase),c=Math.cos(phase),sl=Math.sin(phase-.45),c2=Math.cos(2*phase),w=wk*(1-rn),r=wk*rn,fS=Math.max(0,s),bS=Math.max(0,-s);
      // --- walk ---
      if(w>0){add('thigh.L',[[X,-24*s*w],[Z,-(3+5*fS)*w]]);add('thigh.R',[[X,24*s*w],[Z,(3+5*bS)*w]]);
        add('shin.L',[[X,Math.max(0,30*c*w)]]);add('shin.R',[[X,Math.max(0,-30*c*w)]]);
        add('foot.L',[[X,(-12*Math.max(0,-c)+4*fS)*w]]);add('foot.R',[[X,(-12*Math.max(0,c)+4*bS)*w]]);
        add('upper_arm.L',[[X,(15*s+3)*w],[Z,-7*w]]);add('upper_arm.R',[[X,(-15*s+3)*w],[Z,7*w]]);
        add('forearm.L',[[Y,-(8+12*Math.max(0,-sl))*w]]);add('forearm.R',[[Y,(8+12*Math.max(0,sl))*w]]);
        add('hand.L',[[Z,-14*w],[X,10*Math.sin(phase-.9)*w]]);add('hand.R',[[Z,14*w],[X,-10*Math.sin(phase-.9)*w]]);
        add('hips',[[Y,7*s*w],[Z,6*s*w]]);add('spine',[[Z,-3.5*s*w],[X,1*w]]);add('chest',[[Y,-4*s*w],[Z,-1.5*s*w],[X,-3*w]]);
        add('shoulder.L',[[Z,-2*w]]);add('shoulder.R',[[Z,2*w]]);add('neck',[[X,(-2.5-1*c2)*w]]);add('head',[[Y,1.5*s*w],[Z,-1.5*s*w]]);}
      // --- run ---
      if(r>0){add('thigh.L',[[X,-(34*s+16*fS)*r],[Z,-3*r]]);add('thigh.R',[[X,(34*s-16*bS)*r],[Z,3*r]]);
        add('shin.L',[[X,(20+Math.max(0,62*c))*r]]);add('shin.R',[[X,(20+Math.max(0,-62*c))*r]]);
        add('foot.L',[[X,-(14+12*Math.max(0,-c))*r]]);add('foot.R',[[X,-(14+12*Math.max(0,c))*r]]);
        add('upper_arm.L',[[X,(28*s+6)*r],[Z,-8*r]]);add('upper_arm.R',[[X,(-28*s+6)*r],[Z,8*r]]);
        add('forearm.L',[[Y,-(72+12*Math.max(0,-sl))*r]]);add('forearm.R',[[Y,(72+12*Math.max(0,sl))*r]]);
        add('hand.L',[[Z,-16*r],[X,-6*r]]);add('hand.R',[[Z,16*r],[X,-6*r]]);
        add('hips',[[Y,6*s*r],[Z,4*s*r]]);add('spine',[[X,7*r],[Z,-2*s*r]]);add('chest',[[Y,-7*s*r],[X,2*r]]);add('neck',[[X,-6*r]]);add('head',[[X,-2*r],[Z,-1*s*r]]);}
      bob=Math.abs(s)*(.007*w+.032*r);}
    if(pose==='ride'){const fold=8+16*Math.min(1,speed)+20*air;
      add('thigh.L',[[X,RIDE.tx],[Z,RIDE.tz]]);add('thigh.R',[[X,RIDE.tx],[Z,-RIDE.tz]]);add('shin.L',[[X,RIDE.sx],[Z,RIDE.sz]]);add('shin.R',[[X,RIDE.sx],[Z,-RIDE.sz]]);add('foot.L',[[X,-10]]);add('foot.R',[[X,-10]]);
      add('spine',[[X,fold*.5]]);add('chest',[[X,fold*.5]]);add('neck',[[X,-fold*.6]]);
      add('upper_arm.L',[[X,-30]]);add('upper_arm.R',[[X,-30]]);add('forearm.L',[[Y,-80],[X,22]]);add('forearm.R',[[Y,80],[X,22]]);
      // v150 rein pull: turning left (+) draws the left hand back and in, the right hand gives forward; chest and eyes
      // turn into the turn.
      rs+=(steer-rs)*Math.min(1,dt*6);const pl=Math.max(0,rs),pr=Math.max(0,-rs);
      add('upper_arm.L',[[X,(20*pl-8*pr)],[Z,-6*pl]]);add('forearm.L',[[Y,-18*pl]]);add('upper_arm.R',[[X,(20*pr-8*pl)],[Z,6*pr]]);add('forearm.R',[[Y,18*pr]]);
      add('chest',[[Y,7*rs]]);add('head',[[Y,12*rs]]);}
    else if(pose==='sit'){add('thigh.L',[[X,-85]]);add('thigh.R',[[X,-85]]);add('shin.L',[[X,85]]);add('shin.R',[[X,85]]);
      add('upper_arm.L',[[X,-25]]);add('upper_arm.R',[[X,-25]]);add('forearm.L',[[X,-20]]);add('forearm.R',[[X,-20]]);}
    else{const iw=(1-wk)*(1-ak),br=Math.sin(clock*1.9);   // idle: breathing, soft elbows, a slow weight shift and glances around
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
    // v151 (Yoshi: "give them life"): fidgets when standing still, activities, and a wave hello.
    let drop=0;
    if(pose==='stand'&&!ak&&tk<.01&&fidget){fidT-=dt;if(!fid&&fidT<0){fid=['stretch','sky','scratch','foot','look'][Math.floor(Math.random()*5)];fidP=0;}
      if(fid){fidP+=dt/(fid==='stretch'?2.6:2.2);const e=Math.sin(Math.min(1,fidP)*Math.PI),w=e*(1-wk);
        if(fid==='stretch'){add('upper_arm.L',[[Z,100*w],[X,-10*w]]);add('upper_arm.R',[[Z,-100*w],[X,-10*w]]);add('forearm.L',[[Y,10*w]]);add('forearm.R',[[Y,-10*w]]);add('spine',[[X,-6*w]]);add('chest',[[X,-6*w]]);add('neck',[[X,-8*w]]);}
        else if(fid==='sky'){add('neck',[[X,-14*w]]);add('head',[[X,-16*w]]);add('upper_arm.R',[[Z,-45*w],[X,-55*w]]);add('forearm.R',[[Y,115*w]]);add('hand.R',[[X,-20*w]]);}
        else if(fid==='scratch'){const k=Math.sin(clock*14)*6;add('upper_arm.R',[[Z,-75*w],[X,-25*w]]);add('forearm.R',[[Y,(135+k)*w]]);add('head',[[Z,8*w],[X,4*w]]);}
        else if(fid==='foot'){const k=Math.max(0,Math.sin(clock*9));add('thigh.R',[[X,-8*w]]);add('shin.R',[[X,14*w]]);add('foot.R',[[X,(18*k)*w]]);add('head',[[X,10*w]]);add('hips',[[Z,-2*w]]);}
        else{add('chest',[[Y,14*w]]);add('neck',[[Y,10*w]]);add('head',[[Y,22*w]]);add('hips',[[Y,4*w]]);}
        if(fidP>=1){fid=null;fidT=5+Math.random()*9;}}}
    else{fid=null;if(fidT<2)fidT=2+Math.random()*4;}
    if(ak>0){const a=ak,t=clock,A=AGE_S;
      if(actName==='bench'){const pg=Math.max(0,Math.sin(t*1.25))**12;
        add('thigh.L',[[X,-86*a],[Z,-4*a]]);add('thigh.R',[[X,-86*a],[Z,4*a]]);add('shin.L',[[X,84*a]]);add('shin.R',[[X,84*a]]);add('foot.L',[[X,6*a]]);add('foot.R',[[X,6*a]]);
        add('upper_arm.L',[[X,-26*a],[Z,10*a]]);add('upper_arm.R',[[X,-26*a],[Z,-10*a]]);add('forearm.L',[[Y,-88*a],[X,18*a]]);add('forearm.R',[[Y,(88+30*pg)*a],[X,18*a]]);
        add('spine',[[X,4*a]]);add('neck',[[X,10*a]]);add('head',[[X,(12+2*Math.sin(t*.6))*a],[Y,6*pg*a]]);drop=(.87*A-.5)*a;}
      else if(actName==='grass'){add('thigh.L',[[X,-90*a],[Z,-6*a]]);add('thigh.R',[[X,-122*a],[Z,10*a]]);add('shin.L',[[X,6*a]]);add('shin.R',[[X,66*a]]);add('foot.R',[[X,-8*a]]);
        add('upper_arm.L',[[X,38*a],[Z,6*a]]);add('upper_arm.R',[[X,38*a],[Z,-6*a]]);add('hand.L',[[X,-30*a]]);add('hand.R',[[X,-30*a]]);
        add('spine',[[X,-14*a]]);add('chest',[[X,-4*a]]);add('neck',[[X,8*a]]);add('head',[[X,4*a],[Y,10*Math.sin(t*.3)*a]]);drop=(.87*A-.15)*a;}
      else if(actName==='garden'){const d=Math.sin(t*2.6),d2=Math.sin(t*2.6+1.4);
        add('thigh.L',[[X,-14*a],[Z,-5*a]]);add('thigh.R',[[X,-14*a],[Z,5*a]]);add('shin.L',[[X,104*a]]);add('shin.R',[[X,104*a]]);add('foot.L',[[X,-40*a]]);add('foot.R',[[X,-40*a]]);
        add('spine',[[X,24*a]]);add('chest',[[X,14*a]]);add('neck',[[X,4*a]]);add('head',[[X,12*a]]);
        add('upper_arm.L',[[X,(-48-10*d)*a],[Z,10*a]]);add('upper_arm.R',[[X,(-48-10*d2)*a],[Z,-10*a]]);add('forearm.L',[[Y,-(24+16*Math.max(0,d))*a]]);add('forearm.R',[[Y,(24+16*Math.max(0,d2))*a]]);
        drop=(.87*A-.5*A)*a;}
      else if(actName==='brush'){const s=Math.sin(t*2.3);
        add('upper_arm.R',[[X,-58*a],[Z,(-18-16*s)*a]]);add('forearm.R',[[Y,(50+14*s)*a]]);add('hand.R',[[X,-10*a]]);
        add('upper_arm.L',[[X,-40*a],[Z,8*a]]);add('forearm.L',[[Y,-26*a]]);
        add('chest',[[Y,-6*s*a]]);add('spine',[[X,6*a]]);add('hips',[[Z,2.5*s*a]]);add('head',[[Y,-4*s*a],[X,6*a]]);}
      else if(actName==='fence'){const g=Math.sin(t*.35);
        add('spine',[[X,18*a]]);add('chest',[[X,8*a]]);add('upper_arm.L',[[X,-62*a],[Z,22*a]]);add('upper_arm.R',[[X,-62*a],[Z,-22*a]]);add('forearm.L',[[Y,-96*a]]);add('forearm.R',[[Y,96*a]]);
        add('thigh.R',[[X,-6*a],[Z,10*a]]);add('shin.R',[[X,12*a]]);add('foot.R',[[X,-24*a]]);add('hips',[[Z,-3*a],[Y,4*a]]);add('neck',[[X,-6*a]]);add('head',[[Y,18*g*a],[X,-4*a]]);}
      else if(actName==='sweep'){const s=Math.sin(t*2.1);
        add('upper_arm.L',[[X,-30*a],[Z,14*a]]);add('forearm.L',[[Y,-56*a]]);add('upper_arm.R',[[X,(-8+8*s)*a],[Z,-10*a]]);add('forearm.R',[[Y,(40+8*s)*a]]);
        add('spine',[[X,14*a],[Y,8*s*a]]);add('chest',[[Y,10*s*a]]);add('hips',[[Y,-5*s*a],[Z,2*s*a]]);add('neck',[[X,6*a]]);add('head',[[X,6*a],[Y,-6*s*a]]);}
      else if(actName==='fish'){const tw=Math.max(0,Math.sin(t*.9))**18;
        add('upper_arm.L',[[X,-34*a],[Z,12*a]]);add('upper_arm.R',[[X,-30*a],[Z,-4*a]]);add('forearm.L',[[Y,-74*a]]);add('forearm.R',[[Y,(70+14*tw)*a],[X,-10*tw*a]]);
        add('hips',[[Z,2*Math.sin(t*.4)*a]]);add('head',[[X,6*a],[Y,6*Math.sin(t*.27)*a]]);}}
    // wave hello (0..1): right arm up and wagging.
    wv+=(wave-wv)*Math.min(1,dt*6);if(wv>.01){const w=wv,k=Math.sin(clock*10);add('upper_arm.R',[[Z,-112*w],[X,-38*w]]);add('forearm.R',[[Z,-(20+22*k)*w],[Y,20*w]]);add('hand.R',[[Z,-10*k*w]]);add('head',[[Z,-5*w]]);}
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
    model.position.y=(bob-drop)*SIZE;}
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
  function dispose(){disposed=true;if(crowdMe)CROWD.delete(crowdMe);fb?.dispose();root.parent?.remove(root);mats.forEach(m=>m.dispose());}
  return {root,body:root,hips:root,torso:root,neck:root,head:root,legs,knees:[],feet:[],arms,elbows:[],hands,look,update,actState:()=>({name:actName,w:ak}),setPose,seatOffset,dispose,setGear,setLook,vroid:true};
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
