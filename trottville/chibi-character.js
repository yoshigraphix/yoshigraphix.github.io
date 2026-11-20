// Anime character (2026-11-07 v2): a properly proportioned person about 4.7 heads tall, with a slightly large head so
// the big glossy eyes, brows, nose and mouth read. The body is lofted, not stacked balls: every limb is one tapered,
// continuous shape whose rounded ends share the joint centre with the next limb, so elbows and knees bend without a
// visible bead. Clothes are colour bands on those shapes (sleeves, trouser legs, boot shafts) plus thin shells that
// follow the body (skirts, jacket hems, bibs, breastplates, capes). Toon ramp + inverted-hull ink line like the
// sculpted horses. One model for the walking avatar in the world, the rider on every horse (world + steeplechase)
// and the designer preview. Built from look data (character-looks.mjs). Root origin is between the feet (soles on
// y=0); the character faces +z. update(dt,{pose:'stand'|'walk'|'ride',fast,speed,air}) animates. In 'ride' the hips
// are the seat point: put root at the saddle with seatOffset() so the pelvis sits on it.
import {normalizeLook,outfitOf} from './character-looks.mjs?v=162';
import {makeVroidCharacter} from './vroid-character.js?v=162';
// 2026-11-11: every person in the game is the VRoid girl (vroid-character.js). opt.chibi keeps the old figure.
export const USE_VROID=true;

// Body landmarks (world units, standing). Total height ≈ 2.0 to the top of the hair, head ≈ .43 chin to crown.
// The 'classic' body is built in these heights. The 'tall' frame (2026-11-10, ~6½ heads like Yoshi's turnaround sheet)
// and the height slider remap every standing height through M() below, so outfits and hair carry over unchanged.
const R=.43; // the head is drawn at radius R and scaled by HK (classic skull radius ≈ .215)
const OLD_Y=[0,.075,.46,.88,1.09,1.385,1.45];
// Torso cross-sections from crotch to neck: [y, half-width, half-depth, forward offset].
const TORSO=[[.8,0,0,-.005],[.815,.075,.06,-.008],[.85,.14,.105,-.012],[.9,.165,.12,-.014],[.96,.165,.118,-.012],[1.03,.15,.108,-.005],
  [1.09,.138,.1,0],[1.15,.142,.102,.004],[1.22,.158,.11,.01],[1.29,.172,.116,.012],[1.35,.178,.112,.008],[1.4,.17,.1,0],[1.44,.135,.085,-.005],[1.47,.075,.062,-.005],[1.48,0,0,-.005]];
const WAIST=1.09;

export function makeChibiCharacter(T,rawLook,opt={}){
  if(USE_VROID&&!opt.chibi)return makeVroidCharacter(T,rawLook,{...opt,fallback:()=>makeChibiClassic(T,rawLook,opt)});
  return makeChibiClassic(T,rawLook,opt);}
export function makeChibiClassic(T,rawLook,opt={}){
  const look=normalizeLook(rawLook),outfit=outfitOf(look),C=outfit.colors,keep=opt.geometry||(g=>g);
  const tall=(opt.frame||look.frame)==='tall';
  // ---- Body plan: landmark heights, limb lengths, widths ----
  const hgt=1+.05*look.height,NEW_Y=(tall?[0,.075,.53,1.0,1.22,1.53,1.6]:OLD_Y).map((y,i)=>i<2?y:.075+(y-.075)*hgt);
  const M=y=>{if(y<=0)return y;for(let i=0;i+1<OLD_Y.length;i++)if(y<=OLD_Y[i+1])return NEW_Y[i]+(y-OLD_Y[i])*(NEW_Y[i+1]-NEW_Y[i])/(OLD_Y[i+1]-OLD_Y[i]);return y-OLD_Y[6]+NEW_Y[6];};
  const Minv=y=>{if(y<=0)return y;for(let i=0;i+1<NEW_Y.length;i++)if(y<=NEW_Y[i+1])return OLD_Y[i]+(y-NEW_Y[i])*(OLD_Y[i+1]-OLD_Y[i])/(NEW_Y[i+1]-NEW_Y[i]);return y-NEW_Y[6]+OLD_Y[6];};
  const bw=1+.12*look.build,shW=1+.1*look.shoulders,hpW=1+.1*look.hips,limbW=(1+.1*look.build)*(tall?.94:1);
  const HIP=M(.88),KNEE=M(.46),ANKLE=.075,NECK=M(1.45),THIGH=HIP-KNEE,SHIN=KNEE-ANKLE;
  const armK=(tall?1.17:1)*hgt,UPPER=.27*armK,FORE=.245*armK,ku=.27/UPPER,kf=.245/FORE;
  const SHOULDER=[.185*bw*shW*(tall?.93:1),M(1.385)-(tall?.05:0)],HIPX=.085*bw*hpW;
  const HK=tall?.4:.5;
  // Soft shading for the tall frame (a smooth ramp, like the sheet's gentle 3D); the classic keeps hard toon bands.
  const ramp=tall?new T.DataTexture(new Uint8Array([118,118,118,255,168,168,168,255,222,222,222,255,255,255,255,255]),4,1,T.RGBAFormat)
    :new T.DataTexture(new Uint8Array([125,125,125,255,205,205,205,255,255,255,255,255]),3,1,T.RGBAFormat);
  ramp.minFilter=ramp.magFilter=tall?T.LinearFilter:T.NearestFilter;ramp.needsUpdate=true;
  const mats=new Map(),geos=[];
  const toon=(c,double=false)=>{const k='t'+c+double;if(!mats.has(k))mats.set(k,new T.MeshToonMaterial({color:c,gradientMap:ramp,side:double?T.DoubleSide:T.FrontSide}));return mats.get(k);};
  const banded=(double=false)=>{const k='v'+double;if(!mats.has(k))mats.set(k,new T.MeshToonMaterial({vertexColors:true,gradientMap:ramp,side:double?T.DoubleSide:T.FrontSide}));return mats.get(k);};
  const flat=(c,o=1)=>{const k='f'+c+o;if(!mats.has(k))mats.set(k,new T.MeshBasicMaterial({color:c,transparent:o<1,opacity:o,depthWrite:o>=1,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));return mats.get(k);};
  const line=opt.outline??(tall?.006:.014);
  // The ink pushes each vertex out along its normal in the mesh's own units, so the scaled-down head gets a wider push.
  const makeInk=w=>{const m=new T.MeshBasicMaterial({color:tall?'#4a3530':'#2b2026',side:T.BackSide});
    m.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n  transformed += normal * '+w.toFixed(4)+';');};
    m.customProgramCacheKey=()=>'chibi-ink-'+w.toFixed(4);return m;};
  const ink=makeInk(line),inkHead=makeInk(line/HK*.8);let inkNow=ink;
  const G=g=>{geos.push(g);return keep(g);};
  // double: an open shell (cape, hair sheet, shirt front) seen from both sides, with no ink hull to show through the opening.
  function part(parent,geo,color,{p=[0,0,0],r=[0,0,0],s=[1,1,1],outline=true,face=false,opacity=1,double=false,mat=null}={}){
    const m=new T.Mesh(G(geo),mat||(face?flat(color,opacity):toon(color,double)));m.position.set(...p);m.rotation.set(...r);m.scale.set(...s);
    m.castShadow=!face;if(outline&&!face&&!double)m.add(new T.Mesh(m.geometry,inkNow));parent.add(m);return m;}
  const up=new T.Vector3(0,1,0);
  const capsule=(parent,a,b,rad,color,outline=true,seg=8)=>{const A=new T.Vector3(...a),B=new T.Vector3(...b),d=B.clone().sub(A),len=d.length();
    const m=part(parent,new T.CapsuleGeometry(rad,Math.max(.001,len),3,seg),color,{p:A.clone().add(B).multiplyScalar(.5).toArray(),outline});m.quaternion.setFromUnitVectors(up,d.normalize());return m;};
  const tint=(hex,f)=>'#'+new T.Color(hex).multiplyScalar(f).getHexString();
  const lerp=(a,b,t)=>a+(b-a)*t;

  // ---- Loft: rings of ellipses stacked along y, joined into one smooth surface ----
  // ring {y,rx,rz,cx,cz,col,a}: a ring with rx=rz=0 is a pole (one vertex); `a` (half-angle, radians from the front)
  // makes an open front panel instead of a full ring. Normals face outward when rings run bottom → top; a profile that
  // doubles back (down the inside, across the hem, up the outside) makes a closed shell with thickness. Two rings at
  // the same place with different colours give a hard colour edge (a hem, a cuff, a boot top).
  function loftGeo(rings,S){
    const pos=[],col=[],idx=[],starts=[],c=new T.Color(),open=rings.some(r=>r.a!=null);
    for(const r of rings){starts.push(pos.length/3);c.set(r.col||'#ffffff');const cx=r.cx||0,cz=r.cz||0;
      if(!r.rx&&!r.rz){pos.push(cx,r.y,cz);col.push(c.r,c.g,c.b);continue;}
      const n=open?S+1:S,a=r.a??Math.PI;
      for(let j=0;j<n;j++){const t=open?-a+2*a*j/S:j/S*Math.PI*2;pos.push(cx+r.rx*Math.sin(t),r.y,cz+r.rz*Math.cos(t));col.push(c.r,c.g,c.b);}}
    const same=(A,B)=>A.y===B.y&&A.rx===B.rx&&A.rz===B.rz&&(A.cx||0)===(B.cx||0)&&(A.cz||0)===(B.cz||0);
    for(let i=0;i+1<rings.length;i++){const A=rings[i],B=rings[i+1];if(same(A,B))continue;const pa=!A.rx&&!A.rz,pb=!B.rx&&!B.rz;if(pa&&pb)continue;
      const a0=starts[i],b0=starts[i+1],w=j=>open?j+1:(j+1)%S;
      for(let j=0;j<S;j++){
        if(pa)idx.push(a0,b0+w(j),b0+j);else if(pb)idx.push(a0+j,a0+w(j),b0);
        else idx.push(a0+j,a0+w(j),b0+j,a0+w(j),b0+w(j),b0+j);}}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));
    g.setIndex(idx);g.computeVertexNormals();return g;}
  const loft=(parent,rings,S,o={})=>part(parent,loftGeo(rings,S),null,{mat:banded(o.double),...o});

  // A limb hanging from its joint (local y 0) down to the next joint (y -len): rounded ends of radius r0 / r1 centred
  // on the joints, a tapering profile [[t 0..1, r]] between them, and paint(y) → {col, add} for clothing bands.
  // Colour edges go at paint.cuts (local y), where the radius may also step out a little for cloth thickness.
  function limbRings(len,r0,r1,profile,paint,cuts=[],{sz=1,cap=2}={}){
    const base=[];
    for(let k=0;k<=cap;k++){const f=k/cap*Math.PI/2;base.push([r0*Math.cos(f),r0*Math.sin(f)]);}
    for(const [t,r] of profile)base.push([-t*len,r]);
    for(let k=cap;k>=0;k--){const f=k/cap*Math.PI/2;base.push([-len-r1*Math.cos(f),r1*Math.sin(f)]);}
    const rAt=y=>{for(let i=0;i+1<base.length;i++){const [y0,a]=base[i],[y1,b]=base[i+1];if(y<=y0&&y>=y1)return y0===y1?b:lerp(a,b,(y0-y)/(y0-y1));}return 0;};
    const list=base.map(([y])=>({y,p:paint(y)}));
    for(const y of cuts)if(y<base[0][0]&&y>base[base.length-1][0])list.push({y,p:paint(y+1e-4),cut:1},{y,p:paint(y-1e-4),cut:2});
    list.sort((A,B)=>B.y-A.y||(A.cut||0)-(B.cut||0));
    // Pole rings stay poles (no cloth bump) so the ends close.
    return list.map(({y,p},i)=>{const r=rAt(y),pole=i===0||i===list.length-1;const rr=pole?0:r+(p.add||0);return {y,rx:rr,rz:rr*sz,col:p.col};}).reverse();}

  const smw=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
  // Width at an (old-space) height: build overall, hips below the waist, shoulders across the chest.
  const widthAt=y=>bw*lerp(hpW,1,smw(.95,1.12,y))*lerp(1,shW,smw(1.2,1.38,y))*(tall?lerp(.96,1,smw(1.15,1.35,y)):1);
  const torsoAt=y=>{for(let i=0;i+1<TORSO.length;i++){const a=TORSO[i],b=TORSO[i+1];if(y>=a[0]&&y<=b[0]){const t=(y-a[0])/(b[0]-a[0]),w=widthAt(y);return {rx:lerp(a[1],b[1],t)*w,rz:lerp(a[2],b[2],t)*(1+(bw-1)*.8),cz:lerp(a[3],b[3],t)};}}return {rx:0,rz:0,cz:0};};
  const skin=look.skin;

  const root=new T.Group(),body=new T.Group();root.add(body);
  const hips=new T.Group();hips.position.y=HIP;body.add(hips);
  const Y=y=>M(y)-HIP; // torso and hip children are placed by (classic) standing heights, remapped, minus the hip pivot

  // ---- Legs: hip pivot → thigh → knee pivot → shin → ankle pivot → shoe ----
  const B=outfit.bottom,boots=outfit.boots;
  const legPaint=absY=>{let col=B==='skirt'?skin:B==='shorts'?(absY>.66?C.bottom:skin):C.bottom,add=0;
    if(B==='joggers'){add=absY<.14?.014:.007;if(absY<.14)col=tint(C.bottom,.82);}
    if(B==='breeches')add=Math.max(0,.01*(1-Math.abs(absY-.7)/.16));
    if(B==='shorts'&&absY>.66)add=.012;
    if(B==='jodhpurs')add=Math.max(0,.024*(1-Math.abs(absY-.72)/.14));
    if(outfit.extras.includes('puffylegs'))add+=.022;
    if(B==='pants'&&boots==='shoes'&&absY<.15)add=.01;
    if(boots==='tall'&&absY<.44){col=absY>.405?tint(C.boots,1.35):C.boots;add=absY>.405?.018:.01;}
    if(boots==='boots'&&absY<.18){col=absY>.155?tint(C.boots,1.3):C.boots;add=absY>.155?.014:.008;}
    return {col,add};};
  const legCuts=[...(B==='shorts'?[.66]:[]),...(B==='joggers'?[.14]:[]),...(boots==='tall'?[.44,.405]:[]),...(boots==='boots'?[.18,.155]:[]),...(B==='pants'&&boots==='shoes'?[.15]:[])];
  const legs=[],knees=[],feet=[];
  // Shoe: lofted from heel to toe, then turned so the loft axis points forward.
  const shoeRings=[[-.07,0,0,.048],[-.064,.026,.026,.048],[-.05,.04,.04,.05],[-.015,.045,.05,.055],[.035,.046,.043,.047],[.085,.044,.032,.035],[.125,.037,.026,.028],[.148,.022,.018,.023],[.155,0,0,.022]]
    .map(([z,rx,rz,h],i)=>({y:z,rx,rz,cz:-h,col:boots==='sneakers'&&(i<=1||i>=6)?C.accent||C.boots:C.boots}));
  const shoeGeo=loftGeo(shoeRings,10);shoeGeo.rotateX(Math.PI/2);shoeGeo.translate(0,-ANKLE,0);
  for(const s of [-1,1]){
    const hip=new T.Group();hip.position.set(s*HIPX,0,0);hips.add(hip);legs.push(hip);const L=limbW;
    loft(hip,limbRings(THIGH,.082*L*hpW,.054*L,[[.15,.08*L*hpW],[.5,.068*L],[.82,.057*L]],y=>legPaint(Minv(HIP+y)),legCuts.filter(c=>c<.88&&c>.46).map(c=>M(c)-HIP),{sz:1.04}),10);
    const knee=new T.Group();knee.position.y=-THIGH;hip.add(knee);knees.push(knee);
    loft(knee,limbRings(SHIN,.054*L,.033*L,[[.25,.058*L],[.55,.047*L],[.85,.036*L]],y=>legPaint(Minv(KNEE+y)),legCuts.filter(c=>c<.46).map(c=>M(c)-KNEE)),10);
    const foot=new T.Group();foot.position.y=-SHIN;knee.add(foot);feet.push(foot);
    part(foot,shoeGeo,null,{mat:banded()});
    if(boots==='sneakers')part(foot,new T.BoxGeometry(.088,.022,.215),'#f7f3ea',{p:[0,-ANKLE+.011,.045],outline:false});
  }

  // ---- Torso (pivot at the hips, so a rider can fold forward) ----
  const torso=new T.Group();hips.add(torso);
  const top=outfit.top,long=['robe','dress','tunic'].includes(top);
  const lowerCol=long&&top!=='tunic'?C.top:C.bottom,shirtCol=top==='jacket'?C.top:C.top;
  const torsoCol=y=>{if(y<WAIST&&!long)return top==='overalls'?C.bottom:lowerCol;if(top==='dress'&&y>1.425)return skin;return shirtCol;};
  {const rings=[];let prev=null;
    for(const [y] of TORSO){const {rx,rz,cz}=torsoAt(y),col=torsoCol(y);
      if(prev&&prev.col!==col){const cutY=y<=WAIST+.001&&prev.y<WAIST?WAIST:y>1.425&&prev.y<1.425?1.425:null;
        if(cutY!=null){const t=torsoAt(cutY);rings.push({y:Y(cutY),rx:t.rx,rz:t.rz,cz:t.cz,col:prev.col},{y:Y(cutY),rx:t.rx,rz:t.rz,cz:t.cz,col});}}
      rings.push({y:Y(y),rx,rz,cz,col});prev={y,col};}
    rings.sort((a,b)=>a.y-b.y);loft(torso,rings,18);}
  // A closed band hugging the torso between two heights (belts, hems, breastplates), `out` beyond the skin.
  const band=(y0,y1,out,col,{thick=.012,steps=2,flare=0}={})=>{const rings=[],ys=[];for(let k=0;k<=steps;k++)ys.push(lerp(y0,y1,k/steps));
    const at=(y,o)=>{const t=torsoAt(y);return {y:Y(y),rx:t.rx+o,rz:t.rz+o,cz:t.cz,col};};
    ys.slice().reverse().forEach(y=>rings.push(at(y,out-thick)));ys.forEach((y,k)=>rings.push(at(y,out+flare*(1-k/steps))));
    // inner (top → bottom) then outer (bottom → top): a solid ring
    return loft(torso,rings,18);};
  // A skirt shell from the waist (yTop) down to yBot, flaring to (fx, fz) at the hem with an optional trim band.
  const skirts=new T.Group();torso.add(skirts);
  const skirt=(yTop,yBot,fx,fz,col,trimC,{back=0}={})=>{const t0=torsoAt(yTop),N=4,th=.014,rings=[];
    const outer=[];for(let k=0;k<=N;k++){const t=k/N,e=1-(1-t)*(1-t);outer.push({y:Y(lerp(yTop,yBot,t)),rx:lerp(t0.rx+.008,fx,e),rz:lerp(t0.rz+.008,fz,e),cz:lerp(t0.cz,-back,t)});}
    // inside going down, across the hem, outside going up
    outer.forEach(r=>rings.push({...r,rx:r.rx-th,rz:r.rz-th,col}));
    const hem=outer[N],trimH=trimC?Math.min(.035,(yTop-yBot)*.18):0;
    rings.push({...hem,col:trimC||col});
    if(trimC){const yy=hem.y+trimH,t=(yy-hem.y)/(outer[N-1].y-hem.y),mid={y:yy,rx:lerp(hem.rx,outer[N-1].rx,t),rz:lerp(hem.rz,outer[N-1].rz,t),cz:lerp(hem.cz,outer[N-1].cz,t)};
      rings.push({...mid,col:trimC},{...mid,col});}
    for(let k=N-1;k>=0;k--)rings.push({...outer[k],col});
    return loft(skirts,rings,20);};
  // An open panel laid on the front of the torso (shirt fronts, bibs), half-angle a0 at the bottom → a1 at the top.
  const panel=(y0,y1,a0,a1,out,col,steps=3)=>{const rings=[];for(let k=0;k<=steps;k++){const y=lerp(y0,y1,k/steps),t=torsoAt(y);rings.push({y:Y(y),rx:t.rx+out,rz:t.rz+out,cz:t.cz,col,a:lerp(a0,a1,k/steps)});}
    return loft(torso,rings,6,{double:true,outline:false});};
  const box=(w,h,d,col,p,r=[0,0,0],outline=false)=>part(torso,new T.BoxGeometry(w,h,d),col,{p:[p[0],Y(p[1]),p[2]],r,outline});
  const frontZ=(y,out=0)=>{const t=torsoAt(y);return t.cz+t.rz+out;};

  switch(top){
    case 'tunic':skirt(1.07,.7,.21,.17,C.top,C.trim);break;
    case 'dress':skirt(1.1,.5,.3,.26,C.top,C.trim);band(1.08,1.12,.006,C.trim);break;
    case 'robe':skirt(1.1,.1,.32,.28,C.top,C.trim);panel(1.1,1.42,.12,.22,.004,C.trim,2);break;
    case 'jacket':// Shirt (trim colour) showing down the open front, jacket tails over the hips. A show jacket ('lapels')
      // buttons up to the chest, so only a V of shirt shows.
      if(outfit.extras.includes('lapels'))panel(1.24,1.45,.04,.46,.003,C.trim);else panel(1.0,1.45,.16,.5,.003,C.trim);skirt(1.06,tall?.86:.84,(tall?.165:.2)*bw*hpW,(tall?.125:.15)*bw,C.top,null);
      for(const s of [-1,1])box(.035,.2,.012,tint(C.top,.85),[s*.065,1.33,frontZ(1.33,.004)],[-.15,0,s*.35]);break;
    case 'bomber':// Open bomber over a tee: ribbed hem and collar a shade darker.
      panel(1.0,1.44,.24,.42,.003,C.trim);band(.99,1.05,.012,tint(C.top,.8),{thick:.022});
      part(torso,new T.TorusGeometry(.078,.022,8,16),tint(C.top,.8),{p:[0,Y(1.445),-.01],r:[Math.PI/2.2,0,0]});
      for(const s of [-1,1])box(.012,.32,.008,tint(C.top,.86),[s*.07,1.22,frontZ(1.22,.006)],[0,0,s*.12]);break;
    case 'hoodie':band(.95,1.0,.008,tint(C.top,.9),{thick:.02});
      part(torso,new T.TorusGeometry(.085,.035,8,16),C.top,{p:[0,Y(1.455),-.045],r:[Math.PI/2.4,0,0]});
      box(.17,.07,.012,tint(C.top,.9),[0,1.06,frontZ(1.06,.006)]);
      for(const s of [-1,1])capsule(torso,[s*.03,Y(1.4),frontZ(1.4,.008)],[s*.035,Y(1.31),frontZ(1.31,.01)],.006,C.trim,false,6);break;
    case 'silks':part(torso,new T.TorusGeometry(1,.022,6,28),C.trim,{p:[0,Y(1.24),.008],r:[Math.PI/2,.55,0],s:[.168,.118,1],outline:false});
      box(.06,.06,.01,C.trim,[0,1.32,frontZ(1.32,.004)],[0,0,Math.PI/4]);break;
    case 'overalls':panel(WAIST-.01,1.3,.72,.62,.006,C.bottom,2);
      // Straps run from the bib up over the shoulders and down the back.
      for(const s of [-1,1]){part(torso,new T.TubeGeometry(new T.CatmullRomCurve3([[s*.075,1.29,frontZ(1.29,.006)],[s*.09,1.4,frontZ(1.4,.008)],[s*.1,1.445,0],[s*.09,1.38,-frontZ(1.38,.004)+.0],[s*.07,1.2,-frontZ(1.2,.004)]].map(([x,y,z])=>new T.Vector3(x,Y(y),z))),10,.012,4),C.bottom,{outline:false,s:[1,1,1]});
        box(.03,.03,.014,'#e8d48a',[s*.075,1.29,frontZ(1.29,.014)]);}
      band(WAIST-.02,WAIST+.02,.008,C.bottom);break;
    case 'sailor':part(torso,new T.BoxGeometry(.26,.14,.012),C.trim,{p:[0,Y(1.4),-.1],r:[.35,0,0],outline:false});
      for(const s of [-1,1])box(.04,.11,.01,C.trim,[s*.05,1.39,frontZ(1.39,.004)],[-.2,0,s*.6]);
      part(torso,new T.ConeGeometry(.03,.07,4),C.boots,{p:[0,Y(1.33),frontZ(1.33,.012)],r:[Math.PI,0,0],outline:false});break;
    case 'armor':band(1.1,1.43,.022,C.top,{thick:.02,steps:3});band(1.08,1.11,.03,C.trim,{thick:.02,steps:1});skirt(1.08,.76,.21,.17,C.bottom,C.trim);break;
  }
  if(B==='skirt')skirt(1.1,.66,.27,.23,C.bottom,null);
  const sway=[];
  for(const x of outfit.extras){
    if(x==='buttons')for(const y of [1.07,1.14,1.21])part(torso,new T.SphereGeometry(.011,8,6),'#c9ccd4',{p:[.012,Y(y),frontZ(y,.012)],outline:false});
    if(x==='lapels'){for(const s of [-1,1]){box(.05,.17,.01,tint(C.top,.82),[s*.055,1.34,frontZ(1.34,.006)],[-.12,0,s*.42]);box(.04,.035,.01,C.trim,[s*.035,1.44,frontZ(1.44,.002)],[-.3,0,s*.9]);}
      for(const s of [-1,1])box(.07,.012,.03,tint(C.top,.85),[s*.1,.98,frontZ(.98,.01)]);}
    if(x==='puffy'){for(let y=1.0;y<1.42;y+=.085)band(y,y+.075,.03,C.top,{thick:.032,steps:2});}
    if(x==='belt'){band(1.05,1.09,.01,'#5a3825',{thick:.014,steps:1});box(.04,.035,.012,C.trim,[0,1.07,frontZ(1.07,.014)]);}
    if(x==='satchel'){part(torso,new T.TorusGeometry(1,.01,5,28),'#5a3825',{p:[0,Y(1.22),0],r:[Math.PI/2,-.62,0],s:[.18,.13,1],outline:false});box(.1,.085,.045,'#8a5a36',[-.17,.98,.05],[0,0,0],true);}
    if(x==='pauldrons')for(const s of [-1,1])part(torso,new T.SphereGeometry(.075,12,6,0,Math.PI*2,0,Math.PI/2),C.trim,{p:[s*SHOULDER[0],Y(SHOULDER[1]+.02),0],s:[1.15,.55,1.1],r:[0,0,-s*.4]});
    if(x==='scarf'){part(torso,new T.TorusGeometry(.065,.026,8,18),C.scarf,{p:[0,Y(1.455),-.002],r:[Math.PI/2,0,0]});
      const tail=new T.Group();tail.position.set(.04,Y(1.45),-.06);torso.add(tail);sway.push(tail);
      capsule(tail,[0,0,0],[.02,-.06,-.1],.02,C.scarf);capsule(tail,[-.035,0,0],[-.04,-.09,-.08],.018,C.scarf);}
    if(x==='cape'){const cape=new T.Group();cape.position.set(0,Y(1.43),-.04);torso.add(cape);sway.push(cape);
      part(cape,new T.CylinderGeometry(.17,.29,.92,16,1,true,Math.PI*.55,Math.PI*.9),C.cape||C.top,{p:[0,-.46,-.02],s:[1,1,.72],double:true});
      part(cape,new T.TorusGeometry(.075,.018,6,14),C.trim,{p:[0,0,.03],r:[Math.PI/2,0,0],outline:false});}
  }

  // ---- Arms: shoulder → upper arm → elbow → forearm → wrist → mitten hand ----
  const sleeve={bomber:'long',tunic:'elbow',dress:'puff',robe:'bell',jacket:'long',hoodie:'long',silks:'long',overalls:'short',sailor:'short',armor:'gauntlet'}[top]||'long';
  const sleeveCol=top==='armor'?C.bottom:C.top,cuffCol=top==='bomber'?tint(C.top,.8):outfit.extras.includes('gloves')?C.top:top==='jacket'||top==='silks'||top==='hoodie'?C.trim:top==='sailor'||top==='dress'?C.trim:tint(sleeveCol,.9);
  // paint for upper arm (u) and forearm (f) in local y (0 at the joint, negative downwards)
  const upperPaint=y=>{if(sleeve==='short'||sleeve==='puff')return y>-.1?{col:sleeveCol,add:sleeve==='puff'?.018:.008}:y>-.125?{col:cuffCol,add:.012}:{col:skin};
    if(top==='silks'&&y<-.1&&y>-.14)return {col:C.trim,add:.006};
    if(sleeve==='elbow')return y<-.215?{col:cuffCol,add:.012}:{col:sleeveCol,add:.006};
    return {col:sleeveCol,add:top==='bomber'?.016:.006};};
  const upperCuts=sleeve==='short'||sleeve==='puff'?[-.1,-.125]:sleeve==='elbow'?[-.215]:top==='silks'?[-.1,-.14]:[];
  const forePaint=y=>{if(['short','puff','elbow'].includes(sleeve))return {col:skin};
    if(sleeve==='gauntlet')return y>-.08?{col:sleeveCol,add:.006}:y>-.1?{col:C.trim,add:.02}:{col:C.top,add:.016};
    if(top==='bomber')return y<-.185?{col:cuffCol,add:.012}:{col:sleeveCol,add:.016};
    return y<-.2?{col:cuffCol,add:sleeve==='bell'?.006:.012}:y<-.205?{col:skin}:{col:sleeveCol,add:.006};};
  const foreCuts=sleeve==='gauntlet'?[-.08,-.1]:['short','puff','elbow'].includes(sleeve)?[]:top==='bomber'?[-.185]:[-.2];
  const handCol=outfit.extras.includes('gloves')?C.gloves||'#5a3b2c':skin;
  const handRings=[[.004,0,0],[-.005,.024,.027],[-.03,.025,.037],[-.058,.026,.044],[-.084,.024,.043],[-.103,.019,.035],[-.117,.011,.021],[-.123,0,0]]
    .reverse().map(([y,rx,rz])=>({y,rx,rz,cz:.004,col:handCol}));
  const handGeo=loftGeo(handRings,10);
  const arms=[],elbows=[],hands=[];
  for(const s of [-1,1]){
    const sh=new T.Group();sh.position.set(s*SHOULDER[0],Y(SHOULDER[1]),0);torso.add(sh);arms.push(sh);
    const A=limbW;loft(sh,limbRings(UPPER,.056*A,.039*A,[[.25,.05*A],[.6,.043*A]],y=>upperPaint(y*ku),upperCuts.map(c=>c/ku)),10);
    const el=new T.Group();el.position.y=-UPPER;sh.add(el);elbows.push(el);
    loft(el,limbRings(FORE,.039*A,.027*A,[[.2,.041*A],[.6,.035*A]],y=>forePaint(y*kf),foreCuts.map(c=>c/kf)),10);
    if(sleeve==='bell'){const r0=.05,r1=.085,y0=-.12/kf,y1=-.235/kf,th=.01;
      loft(el,[{y:y0,rx:r0-th,rz:r0-th,col:C.top},{y:y1,rx:r1-th,rz:r1-th,col:C.top},{y:y1,rx:r1,rz:r1,col:C.trim},{y:y1+.025,rx:r1-.008,rz:r1-.008,col:C.trim},{y:y1+.025,rx:r1-.008,rz:r1-.008,col:C.top},{y:y0,rx:r0,rz:r0,col:C.top}],12);}
    const wrist=new T.Group();wrist.position.y=-FORE;el.add(wrist);
    part(wrist,handGeo,null,{mat:banded(),s:[1,1,1]});
    capsule(wrist,[-s*.012,-.035,.03],[-s*.016,-.07,.05],.012,handCol,true,6);
    const h=new T.Object3D();h.position.set(0,-.06,.01);wrist.add(h);hands.push(h);
  }

  // ---- Neck and head ----
  const neck=new T.Group();neck.position.y=Y(NECK);torso.add(neck);
  const nk=tall?.95:1;loft(neck,limbRings(.16,.044*nk,.046*nk,[[.5,.043*nk]],()=>({col:skin})).map(r=>({...r,y:r.y+.16})),10);
  const headPivot=new T.Group();headPivot.position.set(0,(tall?.035:.093)+R*HK*1.03,.012);neck.add(headPivot);
  const head=new T.Group();head.scale.setScalar(HK);headPivot.add(head);inkNow=inkHead;
  // Face shape: a sphere whose lower half narrows towards the chin (round < soft < heart).
  const chin={round:.16,soft:.24,heart:.36}[look.face],stretch=look.face==='soft'?1.08:1.02;
  const shape=(x,y,z)=>{const f=y<0?1-chin*y*y:1;return [x*1.02*f,y*(y<0?stretch:1),z*f];};
  const hg=new T.SphereGeometry(R,24,16),hp=hg.attributes.position;
  for(let i=0;i<hp.count;i++){const [x,y,z]=shape(hp.getX(i)/R,hp.getY(i)/R,hp.getZ(i)/R);hp.setXYZ(i,x*R,y*R,z*R);}
  hg.computeVertexNormals();part(head,hg,skin);
  for(const s of [-1,1])part(head,new T.SphereGeometry(.07,10,8),skin,{p:[s*R*.99,-.04,-.01],s:[.5,1,.75]});
  // A point and outward normal on the face at yaw a / pitch b (radians from straight ahead).
  const at=(a,b,lift=0)=>{const d=[Math.sin(a)*Math.cos(b),Math.sin(b),Math.cos(a)*Math.cos(b)],[x,y,z]=shape(...d),n=new T.Vector3(x,y,z).normalize();
    return {p:new T.Vector3(x*R,y*R,z*R).addScaledVector(n,lift),n};};
  // Face details are laid flat, then every vertex is pushed back onto the curved head (plus a hair's lift), so they
  // hug the face from any angle instead of floating off its side.
  const surface=new T.Vector3();
  const decal=(parent,geo,color,a,b,lift,{roll=0,s=[1,1,1],o=1,dx=0,dy=0}={})=>{const {p,n}=at(a,b,0);const o3=new T.Object3D();
    o3.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),n);o3.rotateZ(roll);o3.translateX(dx);o3.translateY(dy);o3.position.add(p);o3.scale.set(...s);o3.updateMatrix();
    const g=geo.clone().applyMatrix4(o3.matrix),pos=g.attributes.position;
    for(let i=0;i<pos.count;i++){surface.fromBufferAttribute(pos,i);const d=surface.clone().normalize(),[x,y,z]=shape(d.x,d.y,d.z),r=Math.hypot(x,y,z)*R;surface.copy(d).multiplyScalar(r+lift);pos.setXYZ(i,surface.x,surface.y,surface.z);}
    const m=new T.Mesh(G(g),flat(color,o));m.renderOrder=2;parent.add(m);return m;};
  const disc=new T.CircleGeometry(1,14);

  // Eyes: white, iris, a lighter lower iris, pupil, two catch-lights and a thick upper lash line.
  const E={round:{w:.1,h:.125,roll:0,lid:0},gentle:{w:.098,h:.11,roll:.1,lid:.12},sharp:{w:.092,h:.095,roll:-.2,lid:.22},sleepy:{w:.096,h:.1,roll:.05,lid:.42},sparkle:{w:.104,h:.13,roll:0,lid:0}}[look.eyes];
  const eyes=new T.Group();head.add(eyes);
  for(const s of [-1,1]){
    const a=s*.37,b=-.1,roll=-s*E.roll,g=new T.Group();eyes.add(g);
    decal(g,disc,'#ffffff',a,b,.004,{roll,s:[E.w*1.12,E.h*1.06,1]});
    decal(g,disc,look.eyeColor,a,b,.007,{roll,s:[E.w*.86,E.h*.92,1],dy:-E.h*.04});
    decal(g,disc,tint(look.eyeColor,1.45),a,b,.008,{roll,s:[E.w*.6,E.h*.38,1],dy:-E.h*.42});
    decal(g,disc,tint(look.eyeColor,.45),a,b,.009,{roll,s:[E.w*.42,E.h*.5,1],dy:E.h*.02});
    decal(g,disc,'#ffffff',a,b,.011,{s:[E.w*.3,E.w*.34,1],dx:-E.w*.28,dy:E.h*.32});
    decal(g,disc,'#ffffff',a,b,.011,{s:[E.w*.14,E.w*.14,1],dx:E.w*.3,dy:-E.h*.3});
    if(look.eyes==='sparkle')for(const [dx,dy,r] of [[.32,.35,.12],[-.2,-.42,.08]]){decal(g,new T.CircleGeometry(1,4,Math.PI/4),'#ffffff',a,b,.012,{s:[E.w*r,E.w*r*1.8,1],dx:E.w*dx,dy:E.h*dy});}
    if(E.lid)decal(g,new T.CircleGeometry(1,12,0,Math.PI),skin,a,b,.012,{roll,s:[E.w*1.25,E.h*1.15,1],dy:E.h*(1-2*E.lid)});
    // Base lash line; eyeliner makes it bolder (soft) or adds a flick (winged).
    const lid0=E.lid?E.h*(1-2*E.lid):0,liner=look.liner;
    if(look.eyeshadow!=='none')decal(g,new T.CircleGeometry(1,12,0,Math.PI),look.eyeshadow,a,b,.0035,{roll,s:[E.w*1.75,E.h*(E.lid?.9:1.3),1],dy:lid0-E.h*.15,o:.75});
    const lash=new T.TorusGeometry(1,liner==='none'?.13:.165,3,14,Math.PI*.95);
    decal(g,lash,'#2b2026',a,b,.013,{roll:roll+Math.PI*.025,s:[E.w*1.1,E.h*(E.lid?.5:1.02),1],dy:lid0});
    if(liner!=='none')decal(g,new T.TorusGeometry(1,.08,3,10,Math.PI*.5),'#5a3a3a',a,b,.012,{roll:roll+Math.PI*1.25,s:[E.w*.95,E.h*.9,1],o:.75});
    if(liner==='winged')decal(g,new T.CapsuleGeometry(.012,.05,3,6),'#2b2026',a,b,.013,{roll:roll-s*1.0,dx:s*E.w*1.15,dy:lid0+E.h*.4});
    if(look.eyes==='sharp')decal(g,new T.CapsuleGeometry(.01,.04,3,6),'#2b2026',a,b,.013,{roll:roll+s*1.2,dx:s*E.w*1.05,dy:E.h*.55});
    // Brow in the hair colour.
    decal(head,new T.CapsuleGeometry(.013,.065,3,6),tint(look.hairColor,.85),s*.36,.2,.012,{roll:Math.PI/2+s*(look.eyes==='sharp'?.22:-.08)});
  }
  if(look.blush!=='none')for(const s of [-1,1])decal(head,disc,look.blush,s*.6,-.32,.006,{s:[.055,.028,1],o:.55});
  if(look.freckles)for(const s of [-1,1])for(const [da,db] of [[0,0],[.08,.03],[-.07,.04],[.04,-.06],[-.03,-.05]])decal(head,disc,tint(skin,.66),s*(.55+da),-.27+db,.0065,{s:[.009,.009,1],o:.8});
  if(look.mole)decal(head,disc,'#5a3a32',-.55,-.4,.0065,{s:[.009,.009,1]});
  // Nose, in three sizes.
  const ns={s:.72,m:1,l:1.4}[look.noseSize];
  if(look.nose==='dot')decal(head,disc,tint(skin,.72),0,-.32,.006,{s:[.013*ns,.011*ns,1]});
  if(look.nose==='button'){const {p}=at(0,-.32,.004);part(head,new T.SphereGeometry(.026*ns,10,8),skin,{p:p.toArray(),outline:false});}
  if(look.nose==='line')decal(head,new T.CapsuleGeometry(.006,.028*ns,3,6),tint(skin,.7),.02,-.3,.006);
  // Mouth, tinted by lip colour when chosen.
  const lip=look.lips!=='none'?look.lips:null,mouthDark=lip?'#'+new T.Color('#7a2f36').lerp(new T.Color(lip),.55).getHexString():'#7a2f36';
  if(lip&&['smile','cat','smirk'].includes(look.mouth))decal(head,disc,lip,look.mouth==='smirk'?.03:0,-.505,.0055,{s:[.036,.015,1],o:.7});
  if(look.mouth==='smile')decal(head,new T.TorusGeometry(.045,.01,5,16,Math.PI*.8),mouthDark,0,-.5,.006,{roll:Math.PI*1.1});
  if(look.mouth==='grin'){decal(head,new T.CircleGeometry(.05,16,Math.PI,Math.PI),mouthDark,0,-.47,.006);decal(head,new T.CircleGeometry(.028,12,Math.PI,Math.PI),lip||'#f28b9a',0,-.5,.008);}
  if(look.mouth==='cat')for(const s of [-1,1])decal(head,new T.TorusGeometry(.024,.009,5,12,Math.PI),mouthDark,0,-.5,.006,{roll:Math.PI,dx:s*.024});
  if(look.mouth==='o')decal(head,disc,mouthDark,0,-.5,.006,{s:[.022,.028,1]});
  if(look.mouth==='smirk')decal(head,new T.TorusGeometry(.04,.01,5,14,Math.PI*.6),mouthDark,.04,-.49,.006,{roll:Math.PI*1.25});

  // ---- Hair (39 styles) ----
  // Toolkit in head units (radius R): cap = scalp cover, lock = tapered cone, fall = curtain sheet, strand = tube,
  // braid = chain of crossed beads, puff = bumpy ball. Optional ombré tips fade every lock/sheet/strand to look.hairTip.
  const hair=look.hairColor,hairDark=tint(hair,.82),hat=outfit.hat,high=hat==='helmet',tipC=look.hairTip!=='none'?look.hairTip:null;
  const sm=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
  const cA=new T.Color(),cB=new T.Color(),cM=new T.Color();
  function paintTips(g,color,tOf,from=.5){const n=g.attributes.position.count,col=new Float32Array(n*3);cA.set(color);cB.set(tipC||color);
    for(let i=0;i<n;i++){cM.copy(cA).lerp(cB,sm(from,1,tOf(i)));col[i*3]=cM.r;col[i*3+1]=cM.g;col[i*3+2]=cM.b;}g.setAttribute('color',new T.BufferAttribute(col,3));return g;}
  const lockGeo=new T.ConeGeometry(1,1,8,1);lockGeo.translate(0,.5,0);
  const lockTip=new Map(),lockG=c=>{if(!tipC)return lockGeo;if(!lockTip.has(c)){const g=lockGeo.clone();paintTips(g,c,i=>g.attributes.position.getY(i),.3);lockTip.set(c,g);}return lockTip.get(c);};
  const v=(a,b,r)=>{const d=new T.Vector3(Math.sin(a)*Math.cos(b),Math.sin(b),Math.cos(a)*Math.cos(b));return d.multiplyScalar(r);};
  const V=(x,y,z)=>new T.Vector3(x,y,z);
  // A tapered lock from `from` (wide end) to `to` (tip), flattened along the head's surface normal.
  function lock(from,to,width,flatness=.5,color=hair){const dir=to.clone().sub(from),len=dir.length();dir.normalize();
    let n=from.clone().normalize();n.addScaledVector(dir,-n.dot(dir)).normalize();const x=new T.Vector3().crossVectors(dir,n).normalize();
    const m=part(head,lockG(color),color,{mat:tipC?banded():null});m.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x,dir,n));m.position.copy(from);m.scale.set(width,len,width*flatness);return m;}
  // Cap tilted back so the hairline sits high at the front and low at the nape; the bangs then hang over bare forehead.
  const cap=(theta=.56,tilt=-.75,scale=1.08,{color=hair,shine=true}={})=>{part(head,new T.SphereGeometry(R*scale,20,10,0,Math.PI*2,0,Math.PI*theta),color,{r:[tilt,0,0],s:[1.03,1,1]});
    if(shine&&!high)part(head,new T.TorusGeometry(R*scale*.86,.014,5,24,Math.PI*.7),tint(color,1.4),{p:[0,R*.52,R*.12],r:[-Math.PI/2+.62,0,Math.PI*.15],s:[1.03,1,1],outline:false});};
  const tight=(color=hair)=>cap(.6,-.62,1.016,{color,shine:false});
  const bangs=list=>list.forEach(([a,b0,a1,b1,w])=>lock(v(a,b0+.18,R*1.05),v(a1,b1,R*1.09),w*1.25,.42));
  const F={side:[[-.62,.55,-.3,.08,.11],[-.3,.62,.05,.12,.12],[0,.66,.38,.1,.12],[.32,.62,.66,.05,.11],[.6,.5,.85,.0,.09]],
    straight:[[-.6,.55,-.62,.12,.1],[-.36,.6,-.37,.16,.1],[-.12,.64,-.12,.18,.1],[.12,.64,.12,.18,.1],[.36,.6,.37,.16,.1],[.6,.55,.62,.12,.1]],
    curtain:[[-.14,.66,-.5,.14,.12],[-.4,.6,-.78,.02,.11],[.14,.66,.5,.14,.12],[.4,.6,.78,.02,.11]],
    messy:[[-.58,.55,-.7,.12,.1],[-.28,.63,-.18,.18,.11],[.04,.66,.16,.1,.11],[.34,.62,.44,.16,.11],[.62,.52,.78,.06,.1]],
    wisp:[[-.42,.6,-.24,.3,.1],[-.1,.66,.14,.3,.11],[.26,.62,.46,.26,.1]],
    spiky:[[-.62,.55,-.78,.02,.1],[-.3,.62,-.38,.12,.11],[0,.66,.04,.16,.11],[.3,.62,.4,.12,.11],[.62,.55,.78,.02,.1]]};
  const sides=(b1,w=.08,a=1.06)=>{for(const s of [-1,1])lock(v(s*a,.22,R*1.04),v(s*(a+.03),b1,R*1.06),w,.45);};
  const nape=(len=-.45,color=hairDark)=>{for(const a of [2.75,Math.PI,-2.75])lock(v(a,-.05,R*1.02),v(a,len,R*1.12),.1,.6,color);};
  // A sheet of hair from fn(u across, v down) → [x,y,z]; open, so seen from both sides with no ink hull.
  function sheet(fn,cols=14,rows=8,{color=hair,from=.45}={}){const pos=[],idx=[];for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++)pos.push(...fn(i/cols,j/rows));
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+1,c=a+cols+1,d=c+1;idx.push(a,c,b,b,c,d);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
    if(tipC)paintTips(g,color,i=>Math.floor(i/(cols+1))/rows,from);
    return part(head,g,color,{double:true,mat:tipC?banded(true):null});}
  // A curtain of hair around angle c (π = the back), half-width A, from y0 down to y1, radius r0 → r1, with waves w and an end flick.
  const fall=(y0,y1,r0,r1,{c=Math.PI,A=1.6,w=0,k=2.5,z=-.03,flick=0,color=hair,rows=8}={})=>sheet((u,q)=>{const th=c+(u*2-1)*A,e=q*q*(3-2*q);
    const r=lerp(r0,r1,e)+flick*sm(.7,1,q)+w*Math.sin(q*k*Math.PI*2+u*A*5)*sm(0,.25,q);return [Math.sin(th)*r*1.02,lerp(y0,y1,q),Math.cos(th)*r+z];},Math.max(6,Math.round(A*7)),rows,{color});
  // A tube of hair along points, tapering to `taper` × radius at the end.
  function strand(pts,rad,{color=hair,seg=10,rs=5,taper=.7,closed=false}={}){const cur=new T.CatmullRomCurve3(pts,closed),g=new T.TubeGeometry(cur,seg,rad,rs,closed),q=g.attributes.position,uv=g.attributes.uv,c=new T.Vector3(),p=new T.Vector3();
    for(let i=0;i<q.count;i++){const t=uv.getX(i);cur.getPointAt(Math.min(1,t),c);p.fromBufferAttribute(q,i).sub(c).multiplyScalar(lerp(1,taper,t)).add(c);q.setXYZ(i,p.x,p.y,p.z);}
    g.computeVertexNormals();if(tipC)paintTips(g,color,i=>uv.getX(i),.45);return part(head,g,color,{mat:tipC?banded():null});}
  const beadGeo=new T.SphereGeometry(1,7,5);
  // A braid: beads along a curve, tilted alternately so the strands seem to cross.
  function braid(pts,rad,{color=hair,n=10,flat=.75,closed=false,tie=true}={}){const cur=new T.CatmullRomCurve3(pts,closed),L=cur.getLength();
    for(let i=0;i<n;i++){const t=(i+.5)/n,p=cur.getPointAt(t),d=cur.getTangentAt(t),r=rad*(closed?1:1-.3*t);
      const m=part(head,beadGeo,tipC&&!closed&&t>.6?tipC:color);m.position.copy(p);m.quaternion.setFromUnitVectors(up,d);m.rotateZ(i%2?.45:-.45);m.scale.set(r,L/n*.7,r*flat);}
    if(tie&&!closed){const p=cur.getPointAt(1),d=cur.getTangentAt(1);const m=part(head,new T.TorusGeometry(rad*.55,rad*.22,5,10),C.trim,{outline:false});m.position.copy(p);m.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),d);
      lock(p,p.clone().addScaledVector(d,rad*2.4),rad*.9,.7);}}
  function puff(p,r,{s=[1,1,1],color=hair,bump=.07,ws=12,hs=9}={}){const g=new T.SphereGeometry(r,ws,hs),q=g.attributes.position;
    for(let i=0;i<q.count;i++){const x=q.getX(i),y=q.getY(i),z=q.getZ(i),f=1+bump*Math.sin(x/r*7.3+1)*Math.sin(y/r*6.1+2)*Math.sin(z/r*6.7);q.setXYZ(i,x*f,y*f,z*f);}
    g.computeVertexNormals();return part(head,g,color,{p:p.toArray(),s});}
  const tie=(p,dir,r=.05)=>{const m=part(head,new T.TorusGeometry(r,r*.4,6,12),C.trim,{outline:false});m.position.copy(p);m.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),dir.clone().normalize());};
  const horiz=a=>V(Math.sin(a),0,Math.cos(a));
  // A ponytail from a tie point: two overlapping locks for volume.
  const tail=(t0,end,w=.15)=>{lock(t0,end,w,.75);lock(t0.clone().add(V(0,-.02,-.02)),end.clone().add(V(.03,.12,-.02)),w*.8,.75,hairDark);tie(t0,end.clone().sub(t0),.055);};
  const slickTop=()=>{cap(.6,-.78,1.05);for(const a of [-.6,-.3,0,.3,.6])lock(v(a,.48,R*1.03),v(a*.7,1.45,R*1.07),.15,.35);};
  const longBack=(y1=-1.25,o={})=>{fall(.15,y1,R*1.06,R*1.22,{A:1.75,...o});for(let i=0;i<5;i++){const a=Math.PI+(i-2)*.55,h=horiz(a);lock(h.clone().multiplyScalar(R*1.2).add(V(0,y1+.2,-.03)),h.clone().multiplyScalar(R*1.26).add(V(0,y1-.04,-.03)),.12,.5);}};
  const frontLocks=(y1=-1.0,w=.1)=>{for(const s of [-1,1])lock(v(s*1.06,.2,R*1.05),v(s*1.0,-.9,R*1.0).add(V(0,y1+.78,.04)),w,.5);};
  switch(look.hair){
    // ----- Short -----
    case 'pixie':cap(.56,-.62,1.06);bangs(F.wisp);sides(-.15,.07);nape(-.3);break;
    case 'buzz':cap(.56,-.7,1.018,{shine:false});break;
    case 'spiky':cap(.56,-.5);
      if(!high)for(const [a,b,len,w] of [[.75,.8,1.9,.15],[-.75,.8,1.9,.15],[1.35,.6,1.85,.15],[-1.35,.6,1.85,.15],[2,.55,1.8,.15],[-2,.55,1.8,.15],[2.6,.45,1.75,.14],[-2.6,.45,1.75,.14],[Math.PI,.5,1.75,.14],[.2,1.1,1.85,.16],[-.35,1.15,1.8,.15]])
        lock(v(a,b,R*.9),v(a*1.08,b+.3,R*len*.86),w,.7);
      for(const [a,b] of [[2.6,.1],[-2.6,.1],[Math.PI,.05]])lock(v(a,b+.2,R*1),v(a,b-.25,R*1.4),.12,.7);
      bangs(F.spiky);sides(-.5,.09,1.05);break;
    case 'swept':cap();bangs(F.side);nape();sides(-.25);break;
    case 'quiff':cap(.56,-.6,1.05);if(!high)for(const a of [-.45,-.15,.15,.45])lock(v(a,.45,R*1.0),v(a*.4,1.35,R*1.32),.26,.38);sides(-.1,.06);nape(-.3);break;
    case 'slick':slickTop();nape(-.35);break;
    case 'undercut':tight(tint(hair,.72));cap(.36,-.4,1.08);bangs(F.side.slice(1));break;
    case 'mohawk':tight(tint(hair,.72));if(!high)for(let i=0;i<8;i++){const b=.55+i*.3,f=v(0,b,R*.98);lock(f,f.clone().multiplyScalar(1.5),.13,.45);}break;
    case 'bowl':cap(.5,-.35,1.12);bangs(F.straight);break;
    // ----- Medium -----
    case 'bob':cap(.56,-.35);part(head,new T.SphereGeometry(R*1.14,18,8,Math.PI/2+.95,Math.PI*2-1.9,Math.PI*.3,Math.PI*.36),hair,{s:[1.04,1.02,1.02],double:true});bangs(F.straight);break;
    case 'lob':cap(.56,-.4);bangs(F.side);fall(.1,-.72,R*1.1,R*1.24,{A:1.95,flick:.03});frontLocks(-.62,.11);break;
    case 'curtains':cap(.56,-.45);bangs(F.curtain);sides(-.4,.09);fall(.05,-.38,R*1.07,R*1.15,{A:1.7});break;
    case 'shag':cap(.56,-.5,1.08);bangs(F.messy);fall(.05,-.6,R*1.08,R*1.18,{A:1.8,w:.03});
      for(const a of [1.7,2.2,2.7,Math.PI,-2.7,-2.2,-1.7])lock(v(a,-.05,R*1.06),horiz(a).multiplyScalar(R*1.38).add(V(0,-.5,-.03)),.11,.55);break;
    case 'wolf':cap(.56,-.5,1.08);bangs(F.messy);if(!high)for(const a of [-.9,-.3,.3,.9,1.6,-1.6])lock(v(a,.9,R*.95),v(a*1.1,1.15,R*1.32),.13,.6);
      fall(.0,-.78,R*1.07,R*1.12,{A:1.3,w:.025});for(const a of [2.6,Math.PI,-2.6])lock(v(a,-.4,R*1.1),v(a,-1.0,R*1.08),.11,.55);sides(-.45,.08);break;
    case 'mullet':cap(.56,-.62,1.06);bangs(F.wisp);sides(-.1,.06);fall(-.05,-.95,R*1.05,R*1.12,{A:1.05,w:.02});break;
    case 'hime':cap(.58,-.35);bangs(F.straight);longBack(-1.25);for(const s of [-1,1])fall(.18,-.5,R*1.07,R*1.08,{c:s*1.2,A:.28,z:0,rows:4});break;
    // ----- Long -----
    case 'long':cap(.58,-.4);bangs(F.side.slice(0,4));longBack();frontLocks();break;
    case 'longwavy':cap(.58,-.4);bangs(F.messy);longBack(-1.25,{w:.05});frontLocks(-.95,.11);break;
    case 'beach':cap(.58,-.45);bangs(F.curtain);longBack(-1.15,{w:.07,k:2});frontLocks(-.9,.12);break;
    case 'longbangs':cap(.58,-.35);bangs(F.straight);longBack();frontLocks();break;
    case 'drills':cap(.58,-.35);bangs(F.straight);fall(.1,-.6,R*1.07,R*1.16,{A:1.6});
      for(const s of [-1,1]){const top=v(s*1.3,.05,R*1.06),bot=V(s*R*1.3,-1.05,-.02),pts=[];for(let k=0;k<=36;k++){const t=k/36,a=t*4.5*Math.PI*2,hr=.075*(1-.35*t)+.015;pts.push(top.clone().lerp(bot,t).add(V(Math.cos(a)*hr*s,0,Math.sin(a)*hr)));}
        strand(pts,.04,{seg:48,taper:.55});tie(top.clone().add(V(0,-.02,0)),V(0,1,0),.06);}break;
    case 'halfup':cap(.58,-.4);bangs(F.side);longBack(-1.15);frontLocks(-.85);if(!high){const b=v(Math.PI,.55,R*1.08);puff(b,.1,{bump:.04});tie(b.clone().multiplyScalar(.93),b,.06);}break;
    // ----- Braids & updos -----
    case 'ponytail':cap(.56,-.4);bangs(F.side);sides(-.45,.08,1.02);
      if(!high){const t0=v(Math.PI,.62,R*1.0);lock(t0,t0.clone().add(V(0,0,-.2)),.11,.8);const t1=t0.clone().add(V(0,0,-.18));tail(t1,t1.clone().add(V(0,-.85,-.1)),.16);}break;
    case 'lowpony':cap(.56,-.45);bangs(F.side);sides(-.4,.07,1.02);{const t0=v(Math.PI,-.15,R*1.02);tail(t0,t0.clone().add(V(0,-.85,-.06)),.14);}break;
    case 'sidepony':cap(.56,-.45);bangs(F.side);{const t0=v(1.75,.15,R*1.06);tail(t0,t0.clone().add(V(.12,-.9,.14)),.15);}break;
    case 'pigtails':cap(.56,-.4);bangs(F.straight);for(const s of [-1,1]){const t0=v(s*1.7,.35,R*1.05);tail(t0,t0.clone().add(V(s*.16,-.82,-.06)),.15);}break;
    case 'twinbuns':cap(.56,-.4);bangs(F.side.slice(0,4));
      if(!high)for(const s of [-1,1]){const b=v(s*1.25,.85,R*1.04);puff(b,.15,{bump:.03});tie(v(s*1.25,.85,R*.98),b.clone().normalize(),.07);lock(b.clone().add(V(0,-.08,-.04)),b.clone().add(V(s*.04,-.5,-.1)),.08,.7);}
      sides(-.4,.075,1.0);break;
    case 'topknot':slickTop();if(!high){const b=V(0,R*1.12,-.06);puff(b,.17,{bump:.03});tie(V(0,R*1.0,-.05),V(0,1,0),.07);}sides(-.1,.05);break;
    case 'manbun':slickTop();if(!high){const b=v(Math.PI,.75,R*1.08);puff(b,.15,{bump:.04});tie(v(Math.PI,.75,R*.98),b.clone().normalize(),.065);}for(const s of [-1,1])lock(v(s*.75,.5,R*1.05),v(s*.8,-.15,R*1.1),.07,.45);break;
    case 'braids':cap(.56,-.42);bangs(F.side);for(const s of [-1,1]){const p0=v(s*1.55,.0,R*1.06);braid([p0,p0.clone().add(V(s*.04,-.3,.06)),p0.clone().add(V(s*.0,-.65,.16)),p0.clone().add(V(-s*.04,-.95,.2))],.085);}break;
    case 'fishtail':cap(.56,-.45);bangs(F.curtain);{const p0=v(-1.9,.0,R*1.06);braid([p0,p0.clone().add(V(-.06,-.3,.12)),p0.clone().add(V(-.02,-.7,.3)),p0.clone().add(V(.04,-1.05,.36))],.11,{n:12,flat:.55});}break;
    case 'crown':cap(.56,-.4);bangs(F.side.slice(1,4));if(!high){const pts=[];for(let i=0;i<12;i++){const a=i/12*Math.PI*2;pts.push(v(a,.5+.12*Math.cos(a),R*1.09));}braid(pts,.075,{n:20,closed:true});}nape(-.3);break;
    // ----- Textured -----
    case 'curly':cap(.5,-.4,1.06);for(let i=0;i<26;i++){const a=(i%9-4)*.55+(i>17?Math.PI:0),b=.3+Math.floor(i/9)*.32;part(head,new T.SphereGeometry(.1+((i*7)%3)*.012,7,5),i%3?hair:hairDark,{p:v(a+(i>8&&i<18?.27:0),b,R*1.06).toArray()});}
      for(let i=0;i<6;i++)part(head,new T.SphereGeometry(.07,6,4),hair,{p:v(-.6+i*.24,.55,R*1.07).toArray()});break;
    case 'afro':cap(.56,-.5,1.06);
      if(high)fall(.05,-.45,R*1.16,R*1.32,{A:1.85,w:.04});
      else sheet((u,q)=>{const th=u*Math.PI*2,pmax=Math.PI*lerp(.74,.3,sm(-.2,1,Math.cos(th))),p=q*pmax,r=R*1.42*(1+.05*Math.sin(th*9)*Math.sin(p*7));
        return [Math.sin(p)*Math.sin(th)*r*1.1,.1+Math.cos(p)*r,Math.sin(p)*Math.cos(th)*r-.06];},22,10,{from:.6});break;
    case 'puffs':cap(.58,-.5,1.03,{shine:false});lock(v(0,.6,R*1.035),v(0,1.5,R*1.04),.012,.3,tint(hair,.6));
      if(!high)for(const s of [-1,1]){const b=v(s*.95,1.05,R*1.12);puff(b,.22,{bump:.08});tie(v(s*.95,1.05,R*.99),b.clone().normalize(),.08);}break;
    case 'boxbraids':cap(.58,-.45,1.05);bangs(F.wisp.slice(0,2));
      for(let i=0;i<16;i++){const a=Math.PI+(i-7.5)*.24,h=horiz(a),p0=v(a,.25,R*1.0),y1=-1.2+(i%3)*.06;
        strand([p0,h.clone().multiplyScalar(R*1.12).add(V(0,-.1,-.03)),h.clone().multiplyScalar(R*1.2).add(V(0,-.6,-.03)),h.clone().multiplyScalar(R*1.24).add(V(0,y1,-.03))],.024,{color:i%2?hair:hairDark,taper:.8});
        if(i%4===1){const c=h.clone().multiplyScalar(R*1.235).add(V(0,y1+.12,-.03));tie(c,V(0,1,0),.03);}}break;
    case 'cornrows':cap(.6,-.62,1.012,{color:tint(hair,.8),shine:false});
      for(const xo of [-.3,-.18,-.06,.06,.18,.3]){const pts=[];for(let k=0;k<=8;k++){const f=lerp(.75,Math.PI+.55,k/8),d=V(xo*(1-.3*Math.abs(Math.cos(f))),Math.sin(f),Math.cos(f)).normalize();pts.push(V(d.x*R*1.03*1.02,d.y*R*1.03,d.z*R*1.03));}
        strand(pts,.026,{seg:12,rs:4,taper:1});const e=pts[pts.length-1];strand([e,e.clone().add(V(0,-.2,-.05)),e.clone().add(V(0,-.45,-.04))],.024,{rs:4,seg:4});}break;
    case 'locs':cap(.58,-.45,1.05);
      for(let i=0;i<15;i++){const a=(i-7)*.4+Math.PI,h=horiz(a),p0=v(a,.3,R*.98),y1=-.95+(i%2)*.1,wob=Math.sin(i*2.3)*.04;
        strand([p0,h.clone().multiplyScalar(R*1.14).add(V(0,-.05,-.02)),h.clone().multiplyScalar(R*1.22).add(V(wob,-.45,-.02)),h.clone().multiplyScalar(R*1.24).add(V(-wob,y1,-.02))],.046,{color:i%3?hair:hairDark,taper:.75});}
      for(const s of [-1,1])strand([v(s*.5,.62,R*1.0),v(s*.85,.3,R*1.15),v(s*1.0,-.2,R*1.14)],.044,{taper:.75});break;
    case 'twists':cap(.58,-.45,1.05);
      for(let i=0;i<14;i++){const a=(i-6.5)*.44+Math.PI,h=horiz(a),p0=v(a,.35,R*1.0),y1=-.48+(i%3)*.05,base=[p0,h.clone().multiplyScalar(R*1.15).add(V(0,-.05,-.02)),h.clone().multiplyScalar(R*1.2).add(V(0,y1,-.02))];
        const cur=new T.CatmullRomCurve3(base);for(const ph of [0,Math.PI]){const pts=[];for(let k=0;k<=10;k++){const t=k/10,c=cur.getPointAt(t),side=V(h.z,0,-h.x),a2=t*Math.PI*5+ph;pts.push(c.add(side.multiplyScalar(Math.cos(a2)*.018)).add(h.clone().multiplyScalar(Math.sin(a2)*.018)));}
          strand(pts,.023,{color:ph?hairDark:hair,seg:8,rs:4,taper:.8});}}
      bangs(F.wisp);break;
  }
  if(hat==='helmet'){const HC=C.hat||C.top;part(head,new T.SphereGeometry(R*1.16,20,8,0,Math.PI*2,0,Math.PI*.42),HC,{r:[-.35,0,0],s:[1.03,1,1]});
    part(head,new T.CylinderGeometry(.2,.22,.02,16,1,false,-Math.PI/2.4,Math.PI/1.2),HC,{p:[0,.3,.36],r:[.35,0,0]});
    if(C.hat)for(const s of [-1,1])capsule(head,v(s*1.42,.12,R*1.12).toArray(),[s*.16,-R*1.08,R*.42],.013,'#2a2420',false,5);
    part(head,new T.SphereGeometry(.035,8,6),C.trim,{p:v(0,1.25,R*1.13).toArray(),outline:false});
    part(head,new T.TorusGeometry(R*1.07,.022,5,32),C.trim,{p:[0,.17,-.06],r:[Math.PI/2-.35,0,0],s:[1.03,1,1],outline:false});}
  if(hat==='beret')part(head,new T.SphereGeometry(R*.9,16,8),C.trim,{p:[.06,R*.92,-.02],r:[0,0,-.25],s:[1.08,.32,1]});
  if(hat==='circlet'){part(head,new T.TorusGeometry(R*1.1,.016,5,36),'#e0b84a',{p:[0,.12,-.04],r:[Math.PI/2-.3,0,0],s:[1.03,1,1],outline:false});
    const g=v(0,.42,R*1.12);part(head,new T.OctahedronGeometry(.032),'#8fd8f0',{p:g.toArray(),outline:false});}
  inkNow=ink;

  // ---- Animation ----
  const down=new T.Vector3(0,-1,0),dir=new T.Vector3(),qInv=new T.Quaternion();
  let pose='stand',phase=0,clock=0,blinkAt=2+Math.random()*3,blink=0;
  function setPose(p){pose=p;}
  function update(dt,{pose:p=pose,fast=false,speed=0,air=0}={}){
    pose=p;clock+=dt;blinkAt-=dt;if(blinkAt<0){blink=.13;blinkAt=2.5+Math.random()*3.5;}blink=Math.max(0,blink-dt);
    eyes.scale.y=blink>0?.12:1;
    const sw=Math.sin(clock*2.2)*.04;sway.forEach((g,i)=>g.rotation.x=.08+sw+(pose==='walk'?.12:pose==='ride'?.25+.2*speed:0)+i*.02);
    if(pose==='ride'){
      body.position.y=0;
      // Thighs run out and forward over the saddle; each shin hangs down the horse's side, heel under the hip, toes forward.
      legs.forEach((l,i)=>{const s=i?1:-1;l.position.x=s*HIPX;l.quaternion.setFromUnitVectors(down,dir.set(s*.44,-.2,.15).normalize());qInv.copy(l.quaternion).invert();
        knees[i].quaternion.setFromUnitVectors(down,dir.set(s*.36,-.92,-.08).normalize().applyQuaternion(qInv));
        feet[i].quaternion.copy(l.quaternion).multiply(knees[i].quaternion).invert();});
      // Long skirts drape over the saddle instead of cutting into the horse.
      skirts.scale.set(1.5,.55,1.25);
      const fold=.12+.28*Math.min(1,speed)+.35*air;torso.rotation.x=fold;neck.rotation.x=-fold*.8;
      arms.forEach((a,i)=>{const s=i?1:-1;a.rotation.set(-.7+fold*.3,0,s*.18);});elbows.forEach(e=>e.rotation.x=-1.05);
      return;}
    if(pose==='sit'){
      // A chair (ski lift, bench): thighs straight forward, shins hanging down, hands resting on the knees.
      body.position.y=0;
      legs.forEach((l,i)=>{const s=i?1:-1;l.position.x=s*.1;l.quaternion.setFromUnitVectors(down,dir.set(s*.08,-.05,1).normalize());qInv.copy(l.quaternion).invert();
        knees[i].quaternion.setFromUnitVectors(down,dir.set(0,-1,.06).normalize().applyQuaternion(qInv));
        feet[i].quaternion.copy(l.quaternion).multiply(knees[i].quaternion).invert();});
      skirts.scale.set(1.25,.6,1.4);torso.rotation.x=-.06;neck.rotation.x=.04;
      arms.forEach((a,i)=>{const s=i?1:-1;a.rotation.set(-.55,0,s*.12);});elbows.forEach(e=>e.rotation.x=-.6);
      return;}
    skirts.scale.set(1,1,1);
    legs.forEach((l,i)=>l.position.x=i?HIPX:-HIPX);torso.rotation.x=0;neck.rotation.x=0;feet.forEach(f=>f.rotation.set(0,0,0));knees.forEach(k=>k.rotation.set(0,0,0));
    if(pose==='walk'){phase+=dt*(fast?11:8);
      legs.forEach((l,i)=>{const t=Math.sin(phase+i*Math.PI);l.rotation.set(-t*.5,0,0);knees[i].rotation.x=Math.max(0,-Math.cos(phase+i*Math.PI))*.85;feet[i].rotation.x=t*.2;});
      arms.forEach((a,i)=>{const s=i?1:-1;a.rotation.set(Math.sin(phase+i*Math.PI)*.45,0,s*.12);});elbows.forEach(e=>e.rotation.x=-.3);
      body.position.y=Math.abs(Math.cos(phase))*.03;}
    else{legs.forEach(l=>l.rotation.set(0,0,0));knees.forEach(k=>k.rotation.x=0);
      arms.forEach((a,i)=>{const s=i?1:-1;a.rotation.set(Math.sin(clock*1.6)*.03,0,s*.13);});elbows.forEach(e=>e.rotation.x=-.14);
      body.position.y=0;torso.scale.y=1+Math.sin(clock*2)*.006;}
  }
  // In 'ride' the hips sit on the saddle: place root at seat + seatOffset() (in the character's own scale).
  const seatOffset=()=>-HIP;
  function dispose(){root.parent?.remove(root);geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());ink.dispose();inkHead.dispose();ramp.dispose();}
  update(0);
  return {root,body,hips,torso,neck,head,legs,knees,feet,arms,elbows,hands,look,update,setPose,seatOffset,dispose};
}
