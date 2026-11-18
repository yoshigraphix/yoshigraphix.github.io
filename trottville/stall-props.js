// The hands-on care props in the home stall, as little 3D toon models: a side table with a body brush
// (bottom left) and a wooden pail piled with carrots (bottom right). home-horse.js keeps invisible buttons
// over them for touch and screen readers, and stands each prop on the floor under its button every frame.
// makeProps(T) → {table, pail, brush(), carrot(golden), rake(), tableRake, mess(kind), setCarrots(n,golden), lift(kind,on), nudge(kind), update(dt), dispose()}
// The rake (tableRake) leans on the back wall; mess(kind) is one bit of floor mess ('straw' or 'muck') for stall-dirt.mjs.
export function makeProps(T){
  const ramp=new T.DataTexture(new Uint8Array([120,120,120,255,200,200,200,255,255,255,255,255]),3,1,T.RGBAFormat);
  ramp.minFilter=ramp.magFilter=T.NearestFilter;ramp.needsUpdate=true;
  const own=[ramp],mats=new Map();
  const toon=(c,extra={})=>{const k=c+JSON.stringify(extra);if(!mats.has(k)){const m=new T.MeshToonMaterial({color:c,gradientMap:ramp,...extra});mats.set(k,m);own.push(m);}return mats.get(k);};
  const ink=new T.MeshBasicMaterial({color:'#3a2414',side:T.BackSide});own.push(ink);
  ink.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n  transformed += normal * 0.022;');};ink.customProgramCacheKey=()=>'props-ink';
  function mesh(p,geo,c,x=0,y=0,z=0,rx=0,ry=0,rz=0,line=true){own.push(geo);const m=new T.Mesh(geo,typeof c==='string'?toon(c):c);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=true;p.add(m);if(line)m.add(new T.Mesh(geo,ink));return m;}
  const box=(p,w,h,d,c,x,y,z,rx=0,ry=0,rz=0,line)=>mesh(p,new T.BoxGeometry(w,h,d),c,x,y,z,rx,ry,rz,line);
  const cyl=(p,rt,rb,h,c,x,y,z,seg=14,rx=0,rz=0,line)=>mesh(p,new T.CylinderGeometry(rt,rb,h,seg),c,x,y,z,rx,0,rz,line);
  // Soft dark blob under a prop (the props stand in front of the shadow camera's range).
  const blobTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,2,32,32,31);g.addColorStop(0,'#000a');g.addColorStop(1,'#0000');x.fillStyle=g;x.fillRect(0,0,64,64);const t=new T.CanvasTexture(c);own.push(t);return t;})();
  const blobMat=new T.MeshBasicMaterial({map:blobTex,transparent:true,depthWrite:false});own.push(blobMat);
  const blob=(p,w,d)=>{const g=new T.PlaneGeometry(w,d);own.push(g);const m=new T.Mesh(g,blobMat);m.rotation.x=-Math.PI/2;m.position.y=.015;p.add(m);};

  // ---- brush: a wooden back, a strap handle on top and pale bristles; long axis along x ----
  function brush(){const g=new T.Group();
    box(g,.66,.13,.26,'#a8703e',0,.17,0);
    cyl(g,.035,.035,.42,'#c58a52',0,.3,0,8,0,Math.PI/2);for(const x of [-.2,.2])box(g,.05,.12,.05,'#c58a52',x,.25,0,0,0,0,false);
    box(g,.6,.11,.22,'#efe2c6',0,.055,0);return g;}
  // ---- carrot: an orange cone with a green top; tip along -y ----
  function carrot(golden=false){const g=new T.Group(),c=golden?toon('#ffcf3a',{emissive:'#a86a00',emissiveIntensity:.55}):'#f07d22';
    mesh(g,new T.ConeGeometry(.075,.5,10),c,0,0,0,Math.PI,0,0);
    for(let i=0;i<3;i++)mesh(g,new T.ConeGeometry(.03,.2,6),golden?'#c9d84a':'#4f9a3a',Math.sin(i*2.1)*.03,.33,Math.cos(i*2.1)*.03,0,0,(i-1)*.45,false);
    return g;}

  // ---- rake: a wide bow rake (2026-11-10, Yoshi: the old one "looks like a fork"). Origin at the middle of the
  //      head on the floor, handle up +y, tines toward +z. About 2.2 tall: a real rake next to the horse. ----
  function rake(){const g=new T.Group();
    box(g,1.02,.07,.09,'#6d7278',0,.13,0);
    for(let i=0;i<13;i++)box(g,.03,.15,.03,'#8a8f96',-.45+i*.075,.05,.035,.3,0,0,false);
    const ang=Math.atan2(.42,.28),len=Math.hypot(.42,.28);
    for(const sx of [-1,1])box(g,.032,len,.032,'#6d7278',sx*.21,.16+.14,0,0,0,-sx*ang,false);
    box(g,.09,.1,.09,'#6d7278',0,.46,0,0,0,0,false);
    cyl(g,.04,.04,1.8,'#c58a52',0,1.36,0,8);cyl(g,.05,.05,.12,'#8d6238',0,2.22,0,8,0,0,false);
    return g;}
  // ---- floor mess: a trampled straw clump or a little muck pile, origin on the floor ----
  function mess(kind){const g=new T.Group();
    if(kind==='muck'){for(const [x,y,z,r] of [[-.07,.05,0,.11],[.08,.05,.03,.1],[0,.12,.01,.085]]){const m=mesh(g,new T.SphereGeometry(r,10,7),'#6a4a2c',x,y,z);m.scale.y=.75;m.castShadow=false;}}
    else{for(let i=0;i<7;i++){const m=box(g,.42,.025,.035,i%3?'#a9853f':'#7d6232',(Math.random()-.5)*.2,.02+i*.008,(Math.random()-.5)*.2,0,Math.random()*Math.PI,0,false);m.castShadow=false;}
      const d=mesh(g,new T.CircleGeometry(.2,12),'#8a6a3a',0,.006,0,-Math.PI/2,0,0,false);d.castShadow=false;}
    return g;}

  // ---- side table (origin at floor centre, ~1.25 wide) with the brush on top ----
  const table=new T.Group();blob(table,1.7,1.1);
  box(table,1.25,.1,.72,'#b98a5a',0,.78,0);box(table,1.14,.12,.62,'#8d6238',0,.67,0,0,0,0,false);
  for(const x of [-.5,.5])for(const z of [-.25,.25])box(table,.09,.66,.09,'#8d6238',x,.33,z);
  box(table,1.0,.06,.06,'#8d6238',0,.2,.25,0,0,0,false);
  // The rake leans on the back wall by the horseshoe (home-horse.js adds it to the scene and places it).
  const tableRake=rake();
  const tableBrush=brush();tableBrush.scale.setScalar(1.25);tableBrush.position.set(.02,.83,.04);tableBrush.rotation.y=.25;table.add(tableBrush);

  // ---- pail: wooden staves, two iron hoops, a bail handle and a pile of carrots ----
  const pail=new T.Group();blob(pail,1.3,1.0);
  // Staves: stripes painted on the body.
  const staveTex=(()=>{const c=document.createElement('canvas');c.width=128;c.height=8;const x=c.getContext('2d');for(let i=0;i<16;i++){x.fillStyle=i%2?'#c9954f':'#b07a3c';x.fillRect(i*8,0,8,8);x.fillStyle='#7a5228';x.fillRect(i*8,0,1,8);}const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;own.push(t);return t;})();
  // Hollow (Yoshi 2026-11-12: "make it hollow? right now it looks like theres a lid"): an open wall, a darker inside, a
  // rim, and a floor near the bottom; the carrots stand in it with their leafy tops above the rim.
  mesh(pail,new T.CylinderGeometry(.39,.33,.6,24,1,true),new T.MeshToonMaterial({map:staveTex,gradientMap:ramp}),0,.3,0);own.push(pail.children[pail.children.length-1].material);
  {const inner=new T.MeshToonMaterial({color:'#8a5d2e',gradientMap:ramp,side:T.BackSide});own.push(inner);mesh(pail,new T.CylinderGeometry(.365,.31,.59,24,1,true),inner,0,.305,0,0,0,0,false);}
  {const rim=mesh(pail,new T.TorusGeometry(.378,.016,6,32),'#a8743a',0,.6,0,Math.PI/2,0,0,false);rim.castShadow=false;}
  cyl(pail,.31,.31,.03,'#6b4a2e',0,.06,0,20,0,0,false);
  for(const [y,r] of [[.12,.36],[.5,.405]]){const t=mesh(pail,new T.TorusGeometry(r,.025,6,24),'#5d5a55',0,y,0,Math.PI/2,0,0,false);t.castShadow=false;}
  const bail=mesh(pail,new T.TorusGeometry(.42,.018,6,24,Math.PI),'#5d5a55',0,.55,0,0,0,0,false);bail.rotation.set(-.5,0,0);
  const pile=new T.Group();pile.position.y=.38;pail.add(pile);
  let shown=-1,shownGold=-1;
  // Carrots stand in the pail tips-down (leaves up), leaning out against the rim; up to 5 (+ the golden one).
  function setCarrots(n,golden=0){n=Math.max(0,Math.min(5,n));golden=golden?1:0;if(n===shown&&golden===shownGold)return;shown=n;shownGold=golden;
    for(const c of [...pile.children])pile.remove(c);
    // v100: a fan across the pail (left to right as you face it) and a little higher, so each carrot reads on its own and
    // you can count today's carrots at a glance (the "N free" note is gone).
    const spots=[[0,.0,0],[-.13,.03,.1],[.13,-.02,-.1],[-.24,.0,.2],[.24,.03,-.2]];
    for(let i=0;i<n;i++){const [x,z,lean]=spots[i],c=carrot(false);c.position.set(x,.08+(i%2)*.03,z);c.rotation.set(-.12,0,-x*1.9+lean*.2);pile.add(c);}
    if(golden){const c=carrot(true);c.position.set(0,.1,.02);c.rotation.set(.12,0,.15);pile.add(c);}}

  // Little hop when "Things to do" points at a prop, and the brush leaves the table while you hold it.
  const hop={table:0,pail:0};
  function nudge(kind){hop[kind==='table'?'table':'pail']=1.8;}
  function lift(kind,on){if(kind==='brush')tableBrush.visible=!on;if(kind==='rake')tableRake.visible=!on;if(kind==='carrot'){const top=pile.children[pile.children.length-1];if(top)top.visible=!on;}}
  function update(dt){for(const k of ['table','pail']){const g=k==='table'?table:pail;if(hop[k]>0){hop[k]=Math.max(0,hop[k]-dt);g.userData.hop=.18*Math.abs(Math.sin((1.8-hop[k])*Math.PI/.6));}else g.userData.hop=0;}}
  function dispose(){own.forEach(o=>o.dispose());}
  return {table,pail,brush,carrot,rake,tableRake,mess,setCarrots,lift,nudge,update,dispose};
}
