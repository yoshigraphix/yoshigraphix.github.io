// Sculpted chibi horse (sample, 2026-11-06). Replaces the sphere-built makeChibiHorse look with
// lofted shapes: one barrel body, an arched neck, a big anime head and jointed legs
// (shoulder/hip → knee/hock → fetlock → hoof). Markings are vertex colours, the anime line is an
// inverted-hull ink outline, and the gaits are procedural. No textures or external assets.
// Returns makeChibiHorse's handles (root, body, head, legs, tail, anchor, scale) plus
// update(dt), setGait(name), jump() and setStyle('cel'|'soft').

export const SCULPT_COATS={
  willow:{coat:'#b37854',belly:'#cc9a72',muzzle:'#dcb08c',mane:'#5e3f31',white:'#f5e8cb',hoof:'#4f4a42',ink:'#3b2519',iris:'#6b4430',blaze:true,socks:[0,0,1,1]},
  atlas:{coat:'#a9b8b5',belly:'#cfd9d2',muzzle:'#7f8a87',mane:'#66787a',white:'#f4f1e6',hoof:'#555f5a',ink:'#2f3b3a',iris:'#4b5a63',dapple:true,socks:[0,0,0,0]},
  sunny:{coat:'#d8b56e',belly:'#efd697',muzzle:'#f0d9aa',mane:'#f7ecd2',white:'#fff6e2',hoof:'#7b6a4c',ink:'#5a4320',iris:'#7a4f2a',blaze:true,socks:[1,1,0,0]}
};

// Leg phase offsets are fractions of one stride. Keys: L/R = the horse's left (+x) / right, F/H = front / hind.
const GAITS={
  stand:{freq:0,s:.6,A:0,K:0,bob:0,pitch:0,nod:0,tail:0,ph:{LF:0,RF:0,LH:0,RH:0}},
  walk:{freq:.95,s:.62,A:.26,K:.6,bob:.025,pitch:.015,nod:.07,tail:.1,ph:{LH:0,LF:.25,RH:.5,RF:.75}},
  trot:{freq:1.45,s:.45,A:.36,K:.95,bob:.07,pitch:.02,nod:.04,tail:.25,ph:{LF:0,RH:0,RF:.5,LH:.5}},
  canter:{freq:1.65,s:.4,A:.5,K:1.1,bob:.11,pitch:.08,nod:.12,tail:.4,ph:{RH:0,LH:.28,RF:.28,LF:.5}},
  gallop:{freq:2.15,s:.32,A:.66,K:1.3,bob:.13,pitch:.1,nod:.14,tail:.55,ph:{RH:0,LH:.12,RF:.44,LF:.56}}
};
// Jump keyframes: t, body pitch (nose up < 0), lift, front swing (forward > 0), knee tuck, hind swing, hock tuck.
// Hind legs fold like a real jumper: femur forward, stifle + hock tucked, so the hock rides high behind and the
// cannon points down-forward, never forward-up.
const JUMP=[[0,0,0,.2,.6,-.2,.3],[.16,-.38,.08,.9,2.05,-.45,.05],[.36,-.1,.98,.85,2.25,.45,1.35],[.56,.2,.88,.45,1.5,.35,1.2],
  [.76,.32,.12,.32,.05,-.35,.35],[.9,.1,0,-.15,.35,.05,.45],[1,0,0,.2,.6,-.2,.3]];

// Per-horse looks, so two horses of the same breed and colour still come out as individuals: eye size and shape,
// blush, forelock, mane length, tail fullness and small markings. A new horse stores its look (horse.look); older
// horses get one seeded from their id, so a horse looks the same on every screen. White marks stay small: a full
// white-markings coat is a store upgrade.
export const LOOK_OPTIONS={eyeShape:['round','almond','narrow'],forelock:['none','short','long'],mane:['short','classic','flowing'],
  tail:['slim','classic','puffy'],face:['none','star','snip','patch'],body:['none','saddle','white']};
export function horseLook(seed){let h=2166136261;for(const ch of String(seed))h=Math.imul(h^ch.charCodeAt(0),16777619);
  const r=()=>{h=Math.imul(h^h>>>15,2246822507);h=Math.imul(h^h>>>13,3266489909);return ((h^=h>>>16)>>>0)/4294967296;};
  const pick=(a,w)=>{if(!w)return a[Math.floor(r()*a.length)];let x=r()*w.reduce((t,v)=>t+v,0);for(let i=0;i<a.length;i++)if((x-=w[i])<0)return a[i];return a[0];};
  const O=LOOK_OPTIONS;
  return {eye:Math.round((.86+r()*.32)*100)/100,eyeShape:pick(O.eyeShape),blush:r()<.6,forelock:pick(O.forelock),mane:pick(O.mane),
    tail:pick(O.tail),face:pick(O.face,[3,2,2,2]),body:pick(O.body,[4,3,2])};}

export function makeSculptedHorse(T,horse={},options={}){
  const look={...horseLook(horse.id||horse.name||'horse'),...(horse.look||{})};
  const pal=horse.coat||SCULPT_COATS[horse.id]||SCULPT_COATS.willow,longEars=pal.ears||0;
  // Donkeys and mules (coat.ears): long ears, a short upright mane, no forelock, a thin tufted tail.
  if(longEars){look.mane='short';look.forelock='none';look.tail='slim';look.body='none';if(look.face!=='none')look.face='none';}
  const C=Object.fromEntries(Object.entries(pal).filter(([,v])=>typeof v==='string'&&/^(#|rgb|hsl)/i.test(v))/* coat names like 'bay' are labels, not colours */.map(([k,v])=>[k,new T.Color(v)]));
  const keep=options.geometry||(g=>g),outlineWidth=options.outline??.032;
  const toonRamp=new T.DataTexture(new Uint8Array([120,120,120,255,200,200,200,255,255,255,255,255]),3,1,T.RGBAFormat);
  toonRamp.minFilter=toonRamp.magFilter=T.NearestFilter;toonRamp.needsUpdate=true;
  const skins={cel:new T.MeshToonMaterial({vertexColors:true,gradientMap:toonRamp}),soft:new T.MeshStandardMaterial({vertexColors:true,roughness:.78})};
  const ink=new T.MeshBasicMaterial({color:pal.ink,side:T.BackSide});
  ink.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n  transformed += normal * '+outlineWidth.toFixed(4)+';');};
  ink.customProgramCacheKey=()=>'horse-ink-'+outlineWidth;
  const skinned=[],tmp=new T.Color();
  let style=options.style||'cel';

  // A loft: rings of (centre, half-width rx along the side axis, half-depth ry along "up") joined into one smooth tube,
  // capped at both ends. "up" is tangent × sideAxis, so for a spine running along +z it is world up.
  // paint(color, {t, up, side, x, y, z}) colours each vertex; up/side are the ring angle's cosine/sine.
  function loft(parent,rings,paint,{sides=16,origin=[0,0,0],sideAxis=[1,0,0],outline=true}={}){
    const n=rings.length,pos=[],col=[],idx=[],ax=new T.Vector3(...sideAxis),tan=new T.Vector3(),up=new T.Vector3(),sd=new T.Vector3(),v=new T.Vector3();
    const P=rings.map(r=>new T.Vector3(r.p[0]-origin[0],r.p[1]-origin[1],r.p[2]-origin[2]));
    for(let i=0;i<n;i++){
      tan.subVectors(P[Math.min(n-1,i+1)],P[Math.max(0,i-1)]).normalize();up.crossVectors(tan,ax).normalize();sd.crossVectors(up,tan).normalize();
      const r=rings[i];
      for(let j=0;j<sides;j++){
        const a=j/sides*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a);
        v.copy(P[i]).addScaledVector(up,r.ry*ca*(ca<0&&r.low?r.low:1)).addScaledVector(sd,r.rx*sa);pos.push(v.x,v.y,v.z);
        paint(tmp,{t:i/(n-1),up:ca,side:sa,x:v.x+origin[0],y:v.y+origin[1],z:v.z+origin[2]});col.push(tmp.r,tmp.g,tmp.b);
      }
    }
    for(let i=0;i<n-1;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=a+sides,c=i*sides+(j+1)%sides,d=c+sides;idx.push(a,b,c,b,d,c);}
    const s0=pos.length/3;
    for(const k of [0,n-1]){pos.push(P[k].x,P[k].y,P[k].z);col.push(col[k*sides*3],col[k*sides*3+1],col[k*sides*3+2]);}
    for(let j=0;j<sides;j++){const k=(j+1)%sides,e=(n-1)*sides;idx.push(s0,j,k,s0+1,e+k,e+j);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));
    g.setIndex(idx);g.computeVertexNormals();keep(g);
    const mesh=new T.Mesh(g,skins[style]);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);skinned.push(mesh);
    if(outline){const line=new T.Mesh(g,ink);line.castShadow=false;mesh.add(line);}
    return mesh;
  }
  const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
  const mix=(c,to,k)=>c.lerp(C[to],k);
  // Grey dapples: soft light rings from a cheap 3D wave pattern.
  const dapple=(c,x,y,z)=>{if(!pal.dapple)return;const n=Math.sin(x*9.1+y*2.3)*Math.sin(y*8.3-z*1.7)*Math.sin(z*7.7+x*3.1);c.lerp(C.belly,smooth(.12,.32,n)*.85);};
  // Pinto patches: big soft white shapes from a low-frequency wave, shifted per horse by pal.pattern.
  const ps=(pal.pattern||0)%997/97;
  const patches=(c,x,y,z)=>{if(!pal.patches)return;const n=Math.sin(x*1.9+ps)*Math.sin(y*2.3-z*.9+ps*1.7)+Math.sin(z*1.3+x*.7-ps)*.6;c.lerp(C.white,smooth(.9-pal.patches*2,1.05-pal.patches*2,n));};
  // Appaloosa: a pale blanket over the hindquarters, scattered with dark spots.
  const spots=(c,x,y,z)=>{if(!pal.spots)return;const rump=smooth(.2,-1.2+pal.blanket,-z)*smooth(-.2,.4,y-1.6);if(rump<=0)return;c.lerp(C.white,rump*.85);
    const n=Math.sin(x*13.3+ps)*Math.sin(y*12.1+ps*.5)*Math.sin(z*11.7-ps);c.lerp(C.mane,smooth(.35,.5,n)*rump);};
  // Look markings: a darker saddle patch over the back, or one small white patch on a flank.
  const saddleTone=C.coat.clone().lerp(C.mane,.72);
  const bodyMark=(c,p)=>{if(look.body==='saddle'&&p.y>1.9){const edge=.08*Math.sin(p.z*7+p.x*5);c.lerp(saddleTone,smooth(.38,.52,p.up+edge)*smooth(-.85,-.7,p.z)*(1-smooth(.3,.45,p.z+edge)));}
    else if(look.body==='white'&&p.x>.2){const n=Math.hypot((p.z+.15)/.34,(p.y-1.62)/.24)+.18*Math.sin(p.z*11+p.y*7);c.lerp(C.white,1-smooth(.85,1,n));}};
  const coat=(c,p)=>{c.copy(C.coat);mix(c,'belly',smooth(-.35,-.85,p.up)*.9);dapple(c,p.x,p.y,p.z);patches(c,p.x,p.y,p.z);spots(c,p.x,p.y,p.z);bodyMark(c,p);};

  // `lift` carries the jump arc, so whoever places `root` (the 3D world puts it on the mountain) keeps their height.
  const root=new T.Group(),lift=new T.Group(),body=new T.Group();root.add(lift);lift.add(body);

  // Barrel: haunch at the back, a slight dip behind the withers, deep girth, rounded chest.
  const torso=loft(body,[
    {p:[0,1.7,-1.24],rx:.06,ry:.06},{p:[0,1.7,-1.18],rx:.3,ry:.3},{p:[0,1.68,-1.04],rx:.46,ry:.46},{p:[0,1.66,-.84],rx:.53,ry:.52},
    {p:[0,1.62,-.56],rx:.54,ry:.52},{p:[0,1.58,-.22],rx:.53,ry:.51,low:1.04},{p:[0,1.6,.14],rx:.54,ry:.53,low:1.06},{p:[0,1.65,.48],rx:.53,ry:.55,low:1.06},
    {p:[0,1.68,.78],rx:.47,ry:.53},{p:[0,1.64,1],rx:.37,ry:.43},{p:[0,1.6,1.12],rx:.22,ry:.28},{p:[0,1.58,1.17],rx:.05,ry:.05}
  ],coat,{sides:22});

  // Neck pivots at the withers so it can nod; the head pivots at the poll.
  const NP=[0,1.95,.62],HP=[0,3,1.32];
  const neck=new T.Group();neck.position.set(...NP);body.add(neck);
  loft(neck,[{p:[0,1.78,.5],rx:.38,ry:.54},{p:[0,2.2,.85],rx:.32,ry:.46},{p:[0,2.55,1.08],rx:.27,ry:.36},{p:[0,2.82,1.25],rx:.25,ry:.3},{p:[0,3,1.38],rx:.23,ry:.26},{p:[0,3.06,1.42],rx:.06,ry:.06}],coat,{sides:18,origin:NP});
  const head=new T.Group();head.position.set(HP[0]-NP[0],HP[1]-NP[1],HP[2]-NP[2]);neck.add(head);head.scale.setScalar(1.08);
  // Head axis runs down and forward; its "up" faces the forehead, so up > .7 is the blaze and the far rings are the muzzle.
  loft(head,[{p:[0,3.1,1.22],rx:.05,ry:.05},{p:[0,3.06,1.28],rx:.3,ry:.34},{p:[0,3,1.4],rx:.38,ry:.44,low:1.05},{p:[0,2.9,1.58],rx:.37,ry:.42,low:1.02},
    {p:[0,2.79,1.78],rx:.3,ry:.32},{p:[0,2.68,1.98],rx:.24,ry:.25},{p:[0,2.6,2.12],rx:.25,ry:.27},{p:[0,2.55,2.22],rx:.21,ry:.21},{p:[0,2.52,2.27],rx:.06,ry:.06}],
    (c,p)=>{c.copy(C.coat);mix(c,'muzzle',smooth(.6,.78,p.t));
      if(!pal.blaze){if(look.face==='star')mix(c,'white',smooth(.84,.92,p.up)*smooth(.2,.26,p.t)*(1-smooth(.36,.42,p.t)));
        else if(look.face==='snip')mix(c,'white',smooth(.55,.7,p.up)*smooth(.8,.86,p.t)*(1-smooth(.94,.98,p.t)));
        else if(look.face==='patch')mix(c,'white',smooth(.62,.74,p.side+.1*Math.sin(p.t*23))*smooth(.24,.3,p.t)*(1-smooth(.46,.52,p.t)));}
      if(pal.blaze){const w=.78+.08*Math.abs(p.t-.55);mix(c,'white',smooth(w,w+.06,p.up)*smooth(.12,.22,p.t)*(1-smooth(.9,.97,p.t)));}dapple(c,p.x,p.y,p.z);},{sides:22,origin:HP});

  const ears=[];
  for(const s of [-1,1]){
    const ear=new T.Group();ear.position.set(s*.17,3.32-HP[1],1.42-HP[2]);ear.rotation.z=-s*(longEars?.34:.18);head.add(ear);
    if(longEars){ear.scale.set(1.3,longEars,1.35);ear.rotation.x=-.12;}
    const tip=(c,p)=>{c.copy(C.coat);mix(c,'mane',smooth(.62,.85,p.t));};
    loft(ear,[{p:[0,-.04,0],rx:.08,ry:.06},{p:[0,.12,.0],rx:.1,ry:.07},{p:[0,.26,-.01],rx:.07,ry:.05},{p:[.0,.37,-.03],rx:.02,ry:.015}],tip,{sides:10});
    loft(ear,[{p:[0,.0,.04],rx:.05,ry:.015},{p:[0,.13,.045],rx:.065,ry:.018},{p:[0,.26,.03],rx:.035,ry:.01}],c=>c.set('#e8b4a6'),{sides:8,outline:false});
    ears.push(ear);
  }

  // Anime eyes: a dark almond with a warm iris, two catch-lights and a lid line; the group's +z faces out of the head.
  const eyes=[],eyeMat=(color,basic)=>basic?new T.MeshBasicMaterial({color}):new T.MeshStandardMaterial({color,roughness:.25});
  const dot=new T.SphereGeometry(1,16,10);keep(dot);
  for(const s of [-1,1]){
    const g=new T.Group();g.position.set(s*.335,3.02-HP[1],1.63-HP[2]);g.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(s*.9,.04,.42).normalize());head.add(g);
    const shape={round:[.98,1.14],almond:[1,1],narrow:[1.1,.74]}[look.eyeShape]||[1,1];g.scale.set(look.eye*shape[0],look.eye*shape[1],look.eye);g.userData.sy=g.scale.y;
    const part=(color,x,y,z,sx,sy,sz,basic)=>{const m=new T.Mesh(dot,eyeMat(color,basic));m.position.set(x,y,z);m.scale.set(sx,sy,sz);g.add(m);return m;};
    const front=-s;
    part(pal.ink,0,0,0,.105,.135,.03);
    part(pal.iris,front*.006,-.008,.012,.085,.112,.03);
    part('#140d0a',front*.01,-.018,.022,.05,.07,.03);
    part('#ffffff',front*.03,.045,.04,.032,.04,.015,true);
    part('#ffffff',-front*.025,-.06,.038,.014,.016,.01,true);
    const lid=new T.Mesh(keep(new T.TubeGeometry(new T.CatmullRomCurve3([[-front*.115,.06,.0],[-front*.03,.13,.03],[front*.08,.12,.035],[front*.115,.07,.02]].map(q=>new T.Vector3(...q))),12,.014,6)),eyeMat(pal.ink,true));g.add(lid);
    const lash=new T.Mesh(keep(new T.TubeGeometry(new T.CatmullRomCurve3([[-front*.11,.065,0],[-front*.16,.11,-.01],[-front*.18,.16,-.03]].map(q=>new T.Vector3(...q))),6,.011,5)),eyeMat(pal.ink,true));g.add(lash);
    // Soft cheek blush under the eye.
    const blush=new T.Mesh(dot,new T.MeshBasicMaterial({color:'#f2a6a0',transparent:true,opacity:.45,depthWrite:false}));
    blush.position.set(s*.3,2.84-HP[1],1.78-HP[2]);blush.scale.set(.025,.05,.08);blush.quaternion.setFromUnitVectors(new T.Vector3(1,0,0),new T.Vector3(s*.85,0,.5).normalize());if(look.blush)head.add(blush);
    eyes.push(g);
  }
  const snout=[];
  for(const s of [-1,1]){
    const n=new T.Mesh(dot,eyeMat('#4a3029'));n.position.set(s*.12,2.63-HP[1],2.22-HP[2]);n.scale.set(.026,.048,.02);
    n.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(s*.55,.1,.83).normalize());head.add(n);snout.push({m:n,s,p:n.position.clone(),k:n.scale.clone()});
  }
  const mouth=new T.Mesh(keep(new T.TubeGeometry(new T.CatmullRomCurve3([[-.1,2.43,2.12],[0,2.405,2.17],[.1,2.43,2.12]].map(q=>new T.Vector3(q[0],q[1]-HP[1],q[2]-HP[2]))),8,.011,5)),eyeMat(pal.ink,true));head.add(mouth);snout.push({m:mouth,s:0,p:mouth.position.clone(),k:mouth.scale.clone()});

  // Mane: chunky anime locks along the crest, mostly falling to the horse's left, plus a forelock.
  const maneColor=(c,p)=>{c.copy(C.mane);c.lerp(C.white,.22*smooth(.25,.45,p.t)*(1-smooth(.5,.7,p.t))*smooth(.2,.8,p.up));};
  const crest=new T.CatmullRomCurve3([[.53,2.46],[.82,2.74],[1.02,2.98],[1.15,3.13],[1.28,3.28]].map(([z,y])=>new T.Vector3(0,y,z)));
  const locks=[];
  for(let k=0;k<12;k++){
    const ml={short:.68,classic:1,flowing:1.8}[look.mane]||1,mw=look.mane==='flowing'?1.12:1;
    const u=k/11,r=crest.getPoint(u),s=look.mane==='flowing'?(k%2?-1:1):k%4===2?-1:1,len=(.34+.08*Math.sin(k*2.3))*ml,lock=new T.Group();
    lock.position.set(r.x-NP[0],r.y-NP[1],r.z-NP[2]);neck.add(lock);
    const tg=crest.getTangent(u);
    loft(lock,[{p:[0,.03,0],rx:.11*mw,ry:.07},{p:[s*.12,-.04,-.05],rx:.12*mw,ry:.08},{p:[s*.2,-len*.55,-.1],rx:.09*mw,ry:.065},{p:[s*.21,-len,-.06],rx:.04*mw,ry:.03},{p:[s*.19,-len-.07,0],rx:.004,ry:.004}],
      maneColor,{sides:10,sideAxis:[tg.x,tg.y,tg.z]});
    locks.push({lock,s,k});
  }
  // Forelock: none, a short tuft, or a long one that falls over the forehead to between the eyes.
  if(look.forelock!=='none')for(const s of look.forelock==='long'?[-1.4,-.5,.5,1.4]:[-1,0,1]){
    loft(head,look.forelock==='long'?[{p:[s*.06,3.36,1.42],rx:.1,ry:.045},{p:[s*.08,3.36,1.6],rx:.1,ry:.05},{p:[s*.1,3.2,1.8],rx:.085,ry:.04},{p:[s*.11,3.02,1.94],rx:.06,ry:.03},{p:[s*.1,2.9,2.02],rx:.006,ry:.006}]
      :[{p:[s*.06,3.34,1.44],rx:.09,ry:.04},{p:[s*.09,3.33,1.6],rx:.09,ry:.045},{p:[s*.12,3.18,1.75],rx:.06,ry:.03},{p:[s*.13,3.02,1.8],rx:.006,ry:.006}],
      maneColor,{sides:10,origin:HP});
  }

  // Front legs: shoulder → knee → fetlock → hoof. Hind legs follow the real skeleton: the hip joint sits high in the
  // rump, the femur runs down and FORWARD to the stifle at the flank, the gaskin (tibia) runs down and BACK to the hock,
  // and only the cannon stands straight. Stifle and hock bend together (the reciprocal apparatus). Hooves rest on y = 0.
  const legs=[];
  for(const [key,s,front] of [['LF',1,true],['RF',-1,true],['LH',1,false],['RH',-1,false]]){
    const sock=pal.socks[['LF','RF','LH','RH'].indexOf(key)],hip=new T.Group(),lower=(c,p)=>{coat(c,p);if(sock)mix(c,'white',smooth(.42,.56,p.t));};
    let stifle=null,joint;
    if(front){
      hip.position.set(s*.28,1.52,.78);body.add(hip);
      loft(hip,[{p:[0,.18,0],rx:.19,ry:.26},{p:[0,-.05,.02],rx:.18,ry:.24},{p:[0,-.35,.02],rx:.135,ry:.17},{p:[0,-.62,0],rx:.1,ry:.12},{p:[0,-.76,0],rx:.095,ry:.11},{p:[0,-.82,0],rx:.05,ry:.05}],coat,{sides:14});
      joint=new T.Group();joint.position.set(0,-.78,0);hip.add(joint);
      loft(joint,[{p:[0,.04,0],rx:.095,ry:.11},{p:[0,-.06,0],rx:.085,ry:.1},{p:[0,-.25,0],rx:.068,ry:.08},{p:[0,-.46,0],rx:.07,ry:.085},{p:[0,-.52,0],rx:.085,ry:.1},{p:[0,-.56,0],rx:.05,ry:.05}],lower,{sides:12});
    }else{
      hip.position.set(s*.3,1.74,-.8);body.add(hip);
      loft(hip,[{p:[0,.12,-.02],rx:.27,ry:.36},{p:[0,-.1,.05],rx:.26,ry:.34},{p:[0,-.35,.15],rx:.2,ry:.26},{p:[0,-.54,.25],rx:.14,ry:.16},{p:[0,-.6,.28],rx:.05,ry:.05}],coat,{sides:14});
      stifle=new T.Group();stifle.position.set(0,-.54,.25);hip.add(stifle);
      loft(stifle,[{p:[0,.06,.02],rx:.15,ry:.19},{p:[0,-.12,-.07],rx:.14,ry:.2},{p:[0,-.3,-.17],rx:.1,ry:.14},{p:[0,-.46,-.26],rx:.085,ry:.12},{p:[0,-.52,-.29],rx:.04,ry:.04}],coat,{sides:14});
      joint=new T.Group();joint.position.set(0,-.48,-.28);stifle.add(joint);
      loft(joint,[{p:[0,-.04,-.02],rx:.05,ry:.05},{p:[0,.05,-.09],rx:.055,ry:.055},{p:[0,.1,-.11],rx:.02,ry:.02}],coat,{sides:10});
      loft(joint,[{p:[0,.04,0],rx:.09,ry:.12},{p:[0,-.08,0],rx:.08,ry:.1},{p:[0,-.28,0],rx:.068,ry:.08},{p:[0,-.44,0],rx:.07,ry:.085},{p:[0,-.5,0],rx:.085,ry:.1},{p:[0,-.54,0],rx:.05,ry:.05}],lower,{sides:12});
    }
    const fet=new T.Group();fet.position.set(0,front?-.52:-.5,0);joint.add(fet);
    loft(fet,[{p:[0,.02,-.01],rx:.075,ry:.085},{p:[0,-.05,.015],rx:.068,ry:.075},{p:[0,-.1,.035],rx:.075,ry:.08},{p:[0,-.12,.04],rx:.03,ry:.03}],c=>c.copy(sock?C.white:C.coat),{sides:12});
    loft(fet,[{p:[0,-.07,.04],rx:.085,ry:.095},{p:[0,-.14,.055],rx:.105,ry:.12},{p:[0,-.21,.065],rx:.118,ry:.135},{p:[0,-.22,.065],rx:.02,ry:.02}],c=>c.copy(C.hoof),{sides:12});
    legs.push({key,front,hip,stifle,joint,fet,pivot:hip,phase:s*(front?1:-1)});
  }

  const tail=new T.Group();tail.position.set(0,2,-1.12);body.add(tail);
  const tf={slim:.72,classic:1,puffy:1.5}[look.tail]||1,tl=look.tail==='puffy'?1.06:1;
  loft(tail,[{p:[0,.02,-.02],rx:.1,ry:.1},{p:[0,-.08,-.28],rx:.16*tf,ry:.17*tf},{p:[0,-.45,-.48],rx:.19*tf,ry:.18*tf},{p:[0,-.9*tl,-.5],rx:.17*tf,ry:.15*tf},{p:[0,-1.2*tl,-.44],rx:.11*tf,ry:.09*tf},{p:[0,-1.32*tl,-.4],rx:.02,ry:.02}],maneColor,{sides:14});

  const anchor=new T.Group();anchor.position.set(0,2.2,-.05);body.add(anchor);
  const scale=horse.size||(horse.id==='sunny'?.8:horse.id==='atlas'?1.08:1);root.scale.setScalar(scale);

  // Motion state: gait parameters ease toward the target so changes blend instead of snapping.
  let gait='stand',cycle=0,clock=0,blinkAt=1.5,blink=0,twitchAt=2,twitch=null,jumpT=-1,afterJump='stand';
  // Idle (options.idle, for the showcase screens): while standing, now and then paw with one foreleg, lower the nose
  // and wiggle the snout. The whole move fades in and out over its own envelope, so it never snaps.
  let idleAt=1.2,idle=null,idleLeg=0;
  const bump=(t,a,b,ease=.35)=>smooth(a,a+ease,t)*(1-smooth(b-ease,b,t));
  const w={...GAITS.stand,ph:{...GAITS.stand.ph}};
  function legPose(L,phi){
    const st=w.s;let ang,flex,fl=0;
    if(phi<st){const u=phi/st;ang=w.A*(1-2*u);flex=0;fl=-.25*Math.sin(Math.PI*u)*Math.min(1,w.A*2);}
    else{const u=(phi-st)/(1-st),e=u*u*(3-2*u);ang=w.A*(-1+2*e);flex=w.K*Math.sin(Math.PI*u);fl=flex*.5;}
    return [ang,flex,fl];
  }
  // Hind: the stifle flexes (gaskin swings back) and the hock flexes (cannon swings forward) by linked amounts.
  function apply(L,ang,flex,fl){L.hip.rotation.x=-ang;if(L.front)L.joint.rotation.x=flex;else{L.stifle.rotation.x=flex*.85;L.joint.rotation.x=-flex;}L.fet.rotation.x=(L.front?1:.7)*fl;}
  // v110: whinny (tap the head while riding): head tossed up, a side-to-side shake, ears back, mid-gait; ~1.5 s.
  let whinT=-1;function whinny(){if(whinT<0)whinT=0;}
  // v150 (Yoshi: "if you turn left or right ... the neck turns as if you were pulling the reins"): steer(-1..1, + = left)
  // bends the neck and head into the turn and leans the body in a little at speed. Eased, so it flows.
  let st=0,stT=0;function steer(v){stT=Math.max(-1,Math.min(1,v||0));}
  function update(dt){
    dt=Math.min(dt,.1);clock+=dt;const G=GAITS[gait],k=1-Math.exp(-dt*3.5);
    for(const f of ['freq','s','A','K','bob','pitch','nod','tail'])w[f]+=(G[f]-w[f])*k;
    for(const key in w.ph){let d=(G.ph[key]-w.ph[key]+1.5)%1-.5;w.ph[key]=(w.ph[key]+d*k+1)%1;}
    cycle=(cycle+dt*(w.freq||0))%1;
    const tau=Math.PI*2,breathe=1+.012*Math.sin(clock*1.6);
    torso.scale.set(breathe,breathe,1);
    body.position.y=-w.bob*.5+w.bob*Math.abs(Math.cos(tau*cycle));body.rotation.x=w.pitch*Math.sin(tau*(cycle+.1));lift.position.y=0;
    neck.rotation.x=w.nod*Math.sin(tau*cycle*(gait==='walk'?2:1))-.05*(1-Math.min(1,w.A*3))*Math.sin(clock*.5)**2;
    head.rotation.y=gait==='stand'?.18*Math.sin(clock*.37):0;head.rotation.x=-.03+.04*Math.sin(clock*.9)*(gait==='stand'?1:0);
    st+=(stT-st)*(1-Math.exp(-dt*5));neck.rotation.y=st*.36;neck.rotation.z=-st*.07;head.rotation.y+=st*.22;body.rotation.z=-st*.075*Math.min(1,w.A*1.6);
    tail.rotation.x=-.15-w.tail*.9;tail.rotation.y=(.14+w.tail*.2)*Math.sin(clock*1.4+cycle*tau);
    locks.forEach(({lock,s,k})=>{lock.rotation.x=.05+w.bob*1.2*Math.sin(tau*cycle+k*.5);lock.rotation.z=s*(.04*Math.sin(clock*1.1+k));});
    for(const L of legs){const [a,f,fl]=legPose(L,(cycle+w.ph[L.key])%1);apply(L,a,f,fl);}
    if(jumpT>=0){
      jumpT+=dt/1.35;
      if(jumpT>=1){jumpT=-1;gait=afterJump;}
      else{
        let i=0;while(JUMP[i+1][0]<jumpT)i++;const A=JUMP[i],B=JUMP[i+1],u=(jumpT-A[0])/(B[0]-A[0]),e=u*u*(3-2*u),j=A.map((v,n)=>v+(B[n]-v)*e);
        const env=Math.min(1,jumpT/.08,(1-jumpT)/.08);
        body.rotation.x=body.rotation.x*(1-env)+j[1]*env;lift.position.y=j[2]/(root.scale.y||1);
        for(const L of legs){const lag=L.key[0]==='L'?.03:0;const [a,f]=L.front?[j[3],j[4]]:[j[5],j[6]];
          L.hip.rotation.x=L.hip.rotation.x*(1-env)+(-a-lag)*env;L.joint.rotation.x=L.joint.rotation.x*(1-env)+(L.front?f:-f)*env;
          if(L.stifle)L.stifle.rotation.x=L.stifle.rotation.x*(1-env)+f*.85*env;L.fet.rotation.x*=1-env*.6;}
        neck.rotation.x+=env*(j[1]*-.6);tail.rotation.x-=env*.5;
      }
    }
    if(whinT>=0){whinT+=dt;const t=whinT,up=bump(t,0,1.45,.25),sh=bump(t,.25,1.2,.15);
      neck.rotation.x-=.55*up;head.rotation.x-=.35*up;head.rotation.z=.2*sh*Math.sin(t*22);head.rotation.y+=.12*sh*Math.sin(t*11);body.rotation.z=.03*sh*Math.sin(t*11);
      if(t>1.45){whinT=-1;head.rotation.z=0;body.rotation.z=0;}}
    if(options.idle&&jumpT<0){
      const still=gait==='stand'&&w.A<.02;
      if(!idle&&still&&clock>idleAt){idle={t:0,paw:Math.random()<.75,leg:idleLeg^=1,sniff:Math.random()<.85};}
      if(idle){idle.t+=dt;const t=idle.t,fade=still?1:0;
        if(idle.paw){const L=legs[idle.leg],e=fade*bump(t,.2,1.9,.3),beat=.6+.4*Math.sin(Math.max(0,t-.2)*7.5-1.6);
          L.hip.rotation.x=-.5*e*beat;L.joint.rotation.x=1.85*e*beat;L.fet.rotation.x=.7*e;}
        if(idle.sniff){const e=fade*bump(t,1.5,4.9,.7),wig=fade*bump(t,2.3,4.2,.2);
          neck.rotation.x+=.62*e;head.rotation.x+=.28*e;head.rotation.y*=1-e;head.rotation.z=.035*wig*Math.sin(t*19);
          snout.forEach(({m,s,p,k})=>{m.position.set(p.x+s*.006*wig*Math.sin(t*31),p.y+.012*wig*Math.sin(t*27+s),p.z);m.scale.set(k.x*(1+.35*wig*Math.max(0,Math.sin(t*13+s))),k.y,k.z);});}
        if(t>5.1||!still){if(!still)snout.forEach(({m,p,k})=>{m.position.copy(p);m.scale.copy(k);});head.rotation.z=0;idle=null;idleAt=clock+2.5+Math.random()*3.5;}}
    }
    if(clock>blinkAt){blink=.14;blinkAt=clock+2+Math.random()*3.5;}
    blink=Math.max(0,blink-dt);const lid=blink>0?Math.max(.1,Math.abs(blink-.07)/.07):1;eyes.forEach(e=>e.scale.y=lid*e.userData.sy);
    if(clock>twitchAt){twitch={ear:ears[Math.random()<.5?0:1],t:0};twitchAt=clock+3+Math.random()*5;}
    ears.forEach((e,i)=>e.rotation.x=-.1+(whinT>=0?.55*bump(whinT,0,1.45,.2):0));
    if(twitch){twitch.t+=dt;twitch.ear.rotation.x=-.1-.5*Math.sin(Math.min(1,twitch.t/.35)*Math.PI);if(twitch.t>.35)twitch=null;}
  }
  function setGait(name){if(!GAITS[name])return;if(jumpT>=0)afterJump=name;else gait=name;}
  function jump(){if(jumpT>=0)return;afterJump=gait;if(gait==='stand'||gait==='walk')afterJump='stand';gait=gait==='stand'||gait==='walk'?'canter':gait;jumpT=0;}
  function setStyle(next){style=next==='soft'?'soft':'cel';skinned.forEach(m=>m.material=skins[style]);}
  function dispose(){root.traverse(o=>{if(o.isMesh){o.geometry.dispose?.();}});Object.values(skins).forEach(m=>m.dispose());ink.dispose();toonRamp.dispose();}
  // Legends (note #19): a unicorn wears a pearly spiral horn on its forehead; a pegasus carries feathered wings at the withers.
  let flap=null;
  if(horse.legend==='unicorn'||horse.legend==='pegasus'){
    const pearl=new T.MeshToonMaterial({color:'#fff4fb',gradientMap:toonRamp,emissive:'#b48ad8',emissiveIntensity:.45}),gold=new T.MeshToonMaterial({color:'#e8c26a',gradientMap:toonRamp});
    if(horse.legend==='unicorn'){const horn=new T.Group();horn.position.set(0,3.3-HP[1],1.5-HP[2]);horn.rotation.x=.7;head.add(horn);
      const cone=new T.Mesh(keep(new T.ConeGeometry(.11,.95,12)),pearl);cone.position.y=.47;horn.add(cone);
      for(let i=0;i<5;i++){const ring=new T.Mesh(keep(new T.TorusGeometry(.098-i*.018,.02,6,14)),gold);ring.rotation.x=Math.PI/2;ring.rotation.y=.3;ring.position.y=.1+i*.16;horn.add(ring);}
      const hInk=new T.Mesh(cone.geometry,ink);hInk.position.copy(cone.position);horn.add(hInk);}
    else{const wingCol=new T.Color(pal.coat).lerp(new T.Color('#ffffff'),.65),tip=new T.Color(pal.mane||pal.coat).lerp(new T.Color('#ffffff'),.35);
      const fm=new T.MeshToonMaterial({color:wingCol,gradientMap:toonRamp}),fm2=new T.MeshToonMaterial({color:tip,gradientMap:toonRamp}),fg=keep(new T.SphereGeometry(1,10,6));
      flap=[];for(const s of [-1,1]){const w=new T.Group();w.position.set(s*.42,2.05,.42);body.add(w);const fan=new T.Group();w.add(fan);
        for(let i=0;i<7;i++){const a=.15+i*.19,len=.85+i*.17,f=new T.Mesh(fg,i>4?fm2:fm);f.scale.set(.06,.17,len);f.position.set(s*Math.cos(a)*len*.55,Math.sin(a)*len*.62+.05,-.12-i*.06);f.rotation.set(-a*.9,0,s*(.3+a*.2));fan.add(f);
          const fi=new T.Mesh(fg,ink);fi.scale.copy(f.scale).multiplyScalar(1.06);fi.position.copy(f.position);fi.rotation.copy(f.rotation);fan.add(fi);}
        w.rotation.z=-s*.25;flap.push({w,s});}}}
  if(flap){const base=update;update=function(dt,...rest){base(dt,...rest);const t=performance.now()/1000,fast=gait==='canter'||gait==='gallop'||jumpT>=0;
    flap.forEach(({w,s})=>{w.rotation.z=-s*(fast?.45+.6*Math.sin(t*9):.55+.07*Math.sin(t*1.6));w.rotation.x=fast?-.15:0;});};}
  let triangles=0;root.traverse(o=>{if(o.isMesh&&o.material!==ink)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});
  root.userData.characterAsset={meshes:skinned.length,triangles,style:'sculpted anime chibi'};
  return {root,body,neck,head,legs,tail,anchor,scale,look,update,setGait,jump,whinny,steer,get whinnying(){return whinT>=0;},setStyle,dispose,get jumpT(){return jumpT;},get gait(){return gait;}};
}
