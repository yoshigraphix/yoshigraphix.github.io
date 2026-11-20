// Maize Runner in 3D: the corn maze, its jumps, the gate arch, the scarecrow, the pick-ups and the lost foal.
// Rules and layout live in world-cornmaze.mjs (pure). No top-level side effects: importing this file only defines
// createCornMaze. Everything moves from update(dt), never from timers.
//
// Draw calls (the foal aside): corn stalks (1 InstancedMesh) + floor (1) + props (1 merged: corn cores, jumps,
// gate arch, scarecrow, hidden-corner picnic) + apples (1) + horseshoes (1) + glows (1) + gate plaque (1) + sign
// plaque (1) = 8, plus a shadow pass for the props/items. The foal is the project's sculpted horse (its own
// meshes, like any world horse).
import {CORN,JUMP_H,cellCenter,inMaze,wallTiles,tileSpan,cornObstacles,foalStep,newFoal,whinny,FOUND_R} from './world-cornmaze.mjs?v=162';
import {terrainHeight} from './world-content.mjs?v=162';
import {makeSculptedHorse} from './horse-sculpt.js?v=162';

const FOAL_COAT={coat:'#b8683e',belly:'#cf8f62',muzzle:'#e3b38c',mane:'#7a3b22',white:'#f7ecd6',hoof:'#5a4a3c',ink:'#3e2214',iris:'#5b3a26',blaze:true,socks:[0,0,1,1]};
const lcg=seed=>{let s=seed>>>0||1;return ()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);};
const hashText=t=>{let h=2166136261;for(const c of String(t))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};

export function createCornMaze({T,scene,layout,groundY=terrainHeight,prepMaterial=m=>m,quality='full'}={}){
  const simple=quality==='simple';
  const group=new T.Group();group.name='corn-maze';scene.add(group);
  const owned=[];const own=o=>(owned.push(o),o);
  const swayU={value:0};
  // ---- Materials (every lit one goes through the world's prepMaterial: see-through dither + snow) ----
  const lit=extra=>prepMaterial(own(new T.MeshStandardMaterial({vertexColors:true,roughness:.95,flatShading:true,...extra})));
  const cornMat=lit({side:T.DoubleSide});addSway(cornMat);
  const propMat=lit({});
  const floorMat=lit({polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2});
  const itemMat=lit({roughness:.45,emissive:new T.Color('#3a2408'),flatShading:false});
  const glowTex=own(radialTexture(T));
  const glowMat=own(new T.MeshBasicMaterial({map:glowTex,color:'#ffe9a8',transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));
  function addSway(m){const prev=m.onBeforeCompile,prevKey=m.customProgramCacheKey?.bind(m);
    m.onBeforeCompile=(sh,r)=>{if(prev)prev.call(m,sh,r);sh.uniforms.uCornTime=swayU;
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float uCornTime;').replace('#include <begin_vertex>',`#include <begin_vertex>
#ifdef USE_INSTANCING
  vec2 cornP=instanceMatrix[3].xz;
#else
  vec2 cornP=vec2(0.);
#endif
  float cornK=max(position.y,0.)/2.8;cornK*=cornK;
  float cornS=sin(uCornTime*1.3+cornP.x*.31+cornP.y*.23)+.45*sin(uCornTime*2.1+cornP.x*.71-cornP.y*.4);
  transformed.x+=cornS*.07*cornK;transformed.z+=cornS*.045*cornK;`);};
    m.customProgramCacheKey=()=>(prevKey?prevKey():'')+'|corn-sway';}

  // ---- A tiny geometry merger: primitives → one vertex-coloured, non-indexed BufferGeometry ----
  function merger(){const P=[],Nn=[],C=[],m4=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),v=new T.Vector3(),n=new T.Vector3(),nm=new T.Matrix3(),col=new T.Color();
    return {
      add(g,{x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1}={},color='#ffffff',shade){const src=g.index?g.toNonIndexed():g;
        m4.compose(new T.Vector3(x,y,z),q.setFromEuler(e.set(rx,ry,rz)),new T.Vector3(sx,sy,sz));nm.getNormalMatrix(m4);
        const p=src.attributes.position,nr=src.attributes.normal;col.set(color);
        for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const ly=v.y;v.applyMatrix4(m4);P.push(v.x,v.y,v.z);
          n.fromBufferAttribute(nr,i).applyMatrix3(nm).normalize();Nn.push(n.x,n.y,n.z);
          const c=shade?shade(ly,col):col;C.push(c.r,c.g,c.b);}
        if(src!==g)src.dispose();g.dispose();},
      box(c,x,y,z,sx,sy,sz,ry=0,rx=0,rz=0){this.add(new T.BoxGeometry(1,1,1),{x,y,z,sx,sy,sz,ry,rx,rz},c);},
      build(){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('normal',new T.Float32BufferAttribute(Nn,3));g.setAttribute('color',new T.Float32BufferAttribute(C,3));g.computeBoundingSphere();return g;},
      get count(){return P.length/9;}};}

  // ---- One corn stalk (local, standing at the origin): stalk, leaves, tassel, a cob on the full build ----
  function stalkGeometry(){const M=merger(),lo=new T.Color('#6f8a34'),hi=new T.Color('#c2b45a'),tmp=new T.Color();
    M.add(new T.CylinderGeometry(.034,.056,2.5,simple?4:5,1,true),{y:1.25},'#7d9438',(ly)=>tmp.copy(lo).lerp(hi,(ly+1.25)/2.5));
    const leaves=simple?2:3;
    for(let k=0;k<leaves;k++){const g=leafGeometry(T,simple?2:3);M.add(g,{y:.55+k*.62,ry:k*2.2+.4},'#8daa42',(ly)=>tmp.set('#86a43c').lerp(hi,Math.min(1,Math.abs(ly)*1.6+.15)));}
    M.add(new T.ConeGeometry(.09,.55,4,1,true),{y:2.74},'#e4c35f');
    if(!simple)M.add(new T.CylinderGeometry(.065,.045,.36,3,1,false),{x:.08,y:1.35,rz:-.35},'#d8c56a');
    return M.build();}

  // ---- State ----
  let L=null,stalks=null,floor=null,props=null,apples=null,shoes=null,glows=null,plaques=[],textures=[];
  const obstacles=[];
  let foal=null,foalModel=null,state='lost',collected=new Set(),active=true,clock=0,runClock=0,inside=false,whinnyIn=1.5,footArmed=true,jumpSide={},wander=0;

  // ---- Build / rebuild everything that depends on the layout ----
  function build(layout){
    clearLayout();L=layout;
    obstacles.length=0;obstacles.push(...cornObstacles(L));
    const rand=lcg(hashText(L.seed));
    // Corn stalks on every wall tile.
    const {U,V,t}=wallTiles(L.open),spots=[];
    const gateX=CORN.gate.x,archHalf=CORN.corridor/2+.25;
    const spacing=simple?.82:.5;
    for(let v=0;v<V;v++)for(let u=0;u<U;u++){if(!t[v*U+u])continue;const [xa,xb]=tileSpan(u,CORN.x0),[za,zb]=tileSpan(v,CORN.z0),w=xb-xa,d=zb-za;
      const longX=w>=d,len=Math.max(w,d),across=simple?[0]:[-.24,.24],n=Math.max(1,Math.round(len/spacing));
      for(let k=0;k<n;k++)for(const off of (len<1.2&&!simple?[0,0]:across)){
        const a=(k+.5)/n*len+(rand()-.5)*.14,b=off+(rand()-.5)*.16;const x=longX?xa+a:(xa+xb)/2+b,z=longX?(za+zb)/2+b:za+a;
        if(Math.abs(z-CORN.gate.z)<.9&&Math.abs(Math.abs(x-gateX)-archHalf)<.5)continue;// arch posts stand here
        spots.push([x,z]);}}
    const sg=stalkGeometry();stalks=new T.InstancedMesh(sg,cornMat,spots.length);stalks.name='corn-stalks';
    const m4=new T.Matrix4(),q=new T.Quaternion(),up=new T.Vector3(0,1,0),c=new T.Color();
    spots.forEach(([x,z],i)=>{const s=.92+rand()*.24;q.setFromAxisAngle(up,rand()*Math.PI*2);m4.compose(new T.Vector3(x,groundY(x,z)-.05,z),q,new T.Vector3(s,s*(.95+rand()*.12),s));stalks.setMatrixAt(i,m4);
      c.setHSL(.13+rand()*.05,.25+rand()*.2,.48+rand()*.12).multiplyScalar(1.9);stalks.setColorAt(i,c);});
    stalks.instanceMatrix.needsUpdate=true;if(stalks.instanceColor)stalks.instanceColor.needsUpdate=true;
    stalks.castShadow=false;stalks.receiveShadow=!simple;stalks.computeBoundingSphere?.();group.add(stalks);

    // Floor: a dirt sheet over the footprint and a short lane out through the gate, draped on groundY.
    {const F=[],Cc=[],I=[],col=new T.Color(),dirt=new T.Color('#c4a273'),dark=new T.Color('#9c7d55'),straw=new T.Color('#d8bf86');
      const sheet=(x0,z0,x1,z1,step,paint)=>{const nx=Math.ceil((x1-x0)/step),nz=Math.ceil((z1-z0)/step),base=F.length/3;
        for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const x=x0+(x1-x0)*i/nx,z=z0+(z1-z0)*j/nz;F.push(x,groundY(x,z)+.035,z);paint(x,z,i,j);Cc.push(col.r,col.g,col.b);}
        for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=base+j*(nx+1)+i,b=a+1,cc=a+nx+1,d=cc+1;I.push(a,cc,b,b,cc,d);}};
      sheet(CORN.x0-.2,CORN.z0-.2,CORN.x1+.2,CORN.z1+.2,simple?1.6:1.05,(x,z)=>{const n=Math.sin(x*1.9+z*.7)*.5+Math.sin(x*.43-z*1.3)*.5;col.copy(dirt).lerp(dark,.25+n*.2);});
      sheet(CORN.gate.x-2,CORN.z0-6.4,CORN.gate.x+2,CORN.z0-.1,1,(x,z)=>{col.copy(straw).lerp(dirt,Math.min(1,(z-(CORN.z0-6.4))/6));});
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(F,3));g.setAttribute('color',new T.Float32BufferAttribute(Cc,3));g.setIndex(I);g.computeVertexNormals();
      floor=new T.Mesh(g,floorMat);floor.name='corn-floor';floor.receiveShadow=true;group.add(floor);}

    // Props: corn cores (keep the walls solid to the eye between stalks), jumps, gate, scarecrow, hidden corner.
    {const M=merger(),gy=groundY;
      for(let v=0;v<V;v++)for(let u=0;u<U;u++){if(!t[v*U+u])continue;const [xa,xb]=tileSpan(u,CORN.x0),[za,zb]=tileSpan(v,CORN.z0),x=(xa+xb)/2,z=(za+zb)/2;
        const h=simple?2.35:2.05;M.add(new T.BoxGeometry(1,1,1),{x,y:gy(x,z)-.2+h/2,z,sx:Math.max(.35,xb-xa-.42),sy:h+.2,sz:Math.max(.35,zb-za-.42)},'#5f7a2e',(ly,base)=>c.copy(base).lerp(new T.Color('#9aa447'),ly+.5));}
      L.jumps.forEach(j=>buildJump(M,j));
      buildGate(M);buildScarecrow(M);buildHidden(M);boards(M);
      props=new T.Mesh(M.build(),propMat);props.name='corn-props';props.castShadow=true;props.receiveShadow=true;group.add(props);}

    // Pick-ups: apples and horseshoes (the golden one too), floating, with a soft additive glow behind each.
    {const items=L.items,A=items.filter(i=>i.kind==='apple'),H=items.filter(i=>i.kind!=='apple');
      const AM=merger();AM.add(new T.IcosahedronGeometry(.24,1),{y:0,sy:.92},'#d9473a');AM.add(new T.CylinderGeometry(.02,.025,.16,4),{y:.25,rz:.25},'#6a4a2a');AM.box('#5f9c45',.08,.27,0,.16,.03,.08,0,0,.5);
      apples=new T.InstancedMesh(AM.build(),itemMat,Math.max(1,A.length));apples.count=A.length;apples.userData.items=A;
      const HM=merger();HM.add(new T.TorusGeometry(.24,.06,5,12,Math.PI*1.45),{rz:-Math.PI*.225},'#dfe2e8');
      shoes=new T.InstancedMesh(HM.build(),itemMat,Math.max(1,H.length));shoes.count=H.length;shoes.userData.items=H;
      H.forEach((it,i)=>shoes.setColorAt(i,new T.Color(it.kind==='golden'?'#ffc93a':'#ffffff')));A.forEach((it,i)=>apples.setColorAt(i,new T.Color('#ffffff')));
      glows=new T.InstancedMesh(own(new T.PlaneGeometry(1,1)),glowMat,items.length);glows.userData.items=items;glows.renderOrder=2;
      for(const m of [apples,shoes]){m.castShadow=true;m.frustumCulled=false;group.add(m);}glows.frustumCulled=false;group.add(glows);
      placeItems(0,{x:CORN.gate.x,z:CORN.z0-10});}

    // Painted plaques (wooden boards with canvas lettering), never floating white tags.
    for(const b of BOARDS())plaques.push(plaque(b.text,b.x,b.y,b.z,{face:Math.PI,w:b.w,h:b.h,ink:b.ink}));

    // The foal.
    if(!foalModel){foalModel=makeSculptedHorse(T,{id:'maize-foal',coat:FOAL_COAT,size:.55},{});foalModel.root.traverse(o=>{if(o.isMesh)o.castShadow=true;});foalModel.setGait('stand');group.add(foalModel.root);}
    resetQuest();}

  function clearLayout(){for(const m of [stalks,floor,props,apples,shoes,glows]){if(!m)continue;m.removeFromParent();m.geometry.dispose();if(m.dispose&&m.isInstancedMesh)m.dispose();}
    stalks=floor=props=apples=shoes=glows=null;for(const p of plaques)p.removeFromParent();plaques=[];textures.forEach(t=>t.dispose());textures=[];}

  // ---- Jumps (local: the fence spans local x across the corridor; you ride along local z) ----
  function buildJump(M,j){const x0=j.x,z0=j.z,y0=groundY(x0,z0),ry=j.axis==='x'?Math.PI/2:0,ca=Math.cos(ry),sa=Math.sin(ry);
    const half=CORN.corridor/2;
    const put=(c,lx,ly,lz,sx,sy,sz,rx=0,rz=0)=>M.box(c,x0+lx*ca+lz*sa,y0+ly,z0-lx*sa+lz*ca,sx,sy,sz,ry,rx,rz);
    const geo=(g,lx,ly,lz,o,c)=>M.add(g,{x:x0+lx*ca+lz*sa,y:y0+ly,z:z0-lx*sa+lz*ca,ry,...o},c);
    // Direction a→b along local z: water lands on b's side.
    const toB=j.axis==='x'?Math.sign((cellCenter(j.b.i,j.b.j).x-x0))*1:Math.sign(cellCenter(j.b.i,j.b.j).z-z0);
    const wings=(c1,c2)=>{for(const s of [-1,1]){put(c1,s*(half-.1),.68,0,.16,1.36,.16);put(s<0?'#ffffff':'#d8443a',s*(half-.1),1.42,.12*s,.03,.2,.28);}put(c2,0,.04,0,half*2,.08,.32);};
    const rails=(c1,c2,ys,lz=0)=>{for(const y of ys)for(let k=0;k<6;k++){const w=(half*2-.3)/6;put(k%2?c2:c1,-half+.15+w*(k+.5),y,lz,w,.09,.09);}};
    switch(j.kind){
      case 'rail':wings('#f4f1ea','#9ab65c');rails('#ffffff','#d8443a',[.42,.86]);break;
      case 'oxer':wings('#f4f1ea','#9ab65c');for(const s of [-1,1])put('#f4f1ea',s*(half-.1),.6,.5,.14,1.2,.14);rails('#ffffff','#3e7cc9',[.5,.9],-.18);rails('#ffffff','#3e7cc9',[.62,.95],.42);break;
      case 'bales':{const bale=(lx,ly,lz)=>{put('#e6c35c',lx,ly,lz,1.12,.42,.56);put('#b8963f',lx-.3,ly,lz,.05,.44,.58);put('#b8963f',lx+.3,ly,lz,.05,.44,.58);};
        for(const lx of [-1.14,0,1.14])bale(lx,.22,0);for(const lx of [-.57,.57])bale(lx,.65,0);put('#d8443a',-half+.12,1.0,0,.06,.32,.06);put('#d8443a',half-.12,1.0,0,.06,.32,.06);break;}
      case 'log':{geo(new T.CylinderGeometry(.36,.4,half*2-.2,7),0,.42,0,{rz:Math.PI/2},'#8a5a34');for(const s of [-1,1]){geo(new T.CylinderGeometry(.3,.3,.04,7),s*(half-.1),.42,0,{rz:Math.PI/2},'#d9b783');put('#6f4628',s*(half-.5),.18,0,.14,.36,.9);}
        put('#5d8f3a',-.6,.86,.05,.5,.18,.3);break;}
      case 'water':{wings('#f4f1ea','#9ab65c');rails('#ffffff','#3e7cc9',[.86]);put('#4f8a3a',0,.22,0,half*2-.3,.44,.34);
        put('#5fb6d9',0,.035,toB*1.05,half*2-.4,.05,1.3);put('#a7e3f2',0,.06,toB*1.05,half*2-1.4,.02,.5);break;}}}

  // The two painted boards (both read from outside, facing -z): the arch name and the sign by the lane.
  const BOARDS=()=>[{text:'Maize Runner',x:CORN.gate.x,y:groundY(CORN.gate.x,CORN.gate.z)+4.3,z:CORN.gate.z-.2,w:3.9,h:.8,wood:'#8a4f2b',ink:'#ffe7a3'},
    {text:'Lost foal! Ride in',x:CORN.sign.x,y:groundY(CORN.sign.x,CORN.sign.z)+1.55,z:CORN.sign.z-.08,w:1.9,h:.62,wood:'#6f4a2c',ink:'#f6e6c4'}];
  function boards(M){for(const b of BOARDS()){M.box(b.wood,b.x,b.y,b.z+.03,b.w,b.h,.06);M.box('#5a3a22',b.x,b.y,b.z+.05,b.w+.1,b.h+.1,.04);}}
  function buildGate(M){const gx=CORN.gate.x,gz=CORN.gate.z,y=groundY(gx,gz),s=CORN.corridor/2+.25;
    for(const sx of [-1,1]){M.add(new T.CylinderGeometry(.2,.24,4.2,6),{x:gx+sx*s,y:y+2.1,z:gz},'#7a5232');M.add(new T.CylinderGeometry(.2,.2,.1,6),{x:gx+sx*s,y:y+4.24,z:gz},'#5a3a22');
      M.add(new T.IcosahedronGeometry(.36,1),{x:gx+sx*(s+.75),y:y+.3,z:gz-1.1,sy:.75},'#e8892f');M.add(new T.CylinderGeometry(.04,.05,.14,4),{x:gx+sx*(s+.75),y:y+.6,z:gz-1.1},'#5b7a2c');
      M.add(new T.ConeGeometry(.42,1.6,6),{x:gx+sx*(s+.6),y:y+.8,z:gz-.2},'#d6bd6a');}
    M.box('#7a5232',gx,y+3.85,gz,s*2+.9,.3,.34);M.box('#5a3a22',gx,y+3.6,gz,s*2+.5,.12,.26);
    for(const sx of [-1,1])M.box('#7a5232',gx+sx*(s-.45),y+3.35,gz,.14,.8,.14,0,0,sx*.75);
    // Sign post for the second plaque.
    const p=CORN.sign,py=groundY(p.x,p.z);M.box('#6b4a2c',p.x,py+.75,p.z,.12,1.5,.12);}

  function buildScarecrow(M){const {x,z}=CORN.scarecrow,y=groundY(x,z),ry=-.5;
    M.add(new T.CylinderGeometry(.05,.06,2.3,5),{x,y:y+1.15,z},'#7a5232');M.box('#7a5232',x,y+1.65,z,1.7,.08,.08,ry);
    M.box('#c4473a',x,y+1.5,z,.62,.72,.34,ry);M.box('#8a3a30',x,y+1.62,z,.64,.06,.36,ry);M.box('#4f6fa8',x,y+1.02,z,.56,.4,.3,ry);
    for(const s of [-1,1]){const ax=x+Math.cos(ry)*s*.66,az=z-Math.sin(ry)*s*.66;M.box('#c4473a',ax,y+1.62,az,.5,.22,.24,ry);M.add(new T.ConeGeometry(.12,.3,4),{x:x+Math.cos(ry)*s*.98,y:y+1.62,z:z-Math.sin(ry)*s*.98,rz:s*Math.PI/2,ry},'#e6c35c');}
    M.add(new T.IcosahedronGeometry(.27,1),{x,y:y+2.08,z},'#d9bf8c');M.add(new T.CylinderGeometry(.5,.5,.05,8),{x,y:y+2.3,z},'#d8b45a');M.add(new T.ConeGeometry(.26,.38,8),{x,y:y+2.5,z},'#d8b45a');
    M.box('#3b2a20',x-.08*Math.cos(ry)+.0,y+2.12,z-.26,.05,.05,.02,ry);M.box('#3b2a20',x+.08,y+2.12,z-.26,.05,.05,.02,ry);
    M.add(new T.ConeGeometry(.08,.3,4),{x:x,y:y+.7,z,rx:Math.PI},'#e6c35c');}

  function buildHidden(M){const h=L.hidden,y=groundY(h.x,h.z);
    for(let i=0;i<4;i++)M.box(i%2?'#ffffff':'#d8443a',h.x-.45+(i%2)*.9,y+.05,h.z+.7-(i>>1)*.9,.9,.03,.9);
    M.add(new T.CylinderGeometry(.03,.04,1.3,4),{x:h.x+1.2,y:y+.65,z:h.z+1.1},'#5f8a36');M.add(new T.CylinderGeometry(.26,.26,.06,10),{x:h.x+1.2,y:y+1.34,z:h.z+1.05,rx:1.2},'#f2c230');
    M.add(new T.CylinderGeometry(.11,.11,.08,8),{x:h.x+1.2,y:y+1.36,z:h.z+1.0,rx:1.2},'#6b4220');M.add(new T.IcosahedronGeometry(.18,0),{x:h.x-.6,y:y+.2,z:h.z+.2},'#d9473a');}

  function plaque(text,x,y,z,{face=0,w=2.6,h=.55,ink='#f3e6c8'}={}){// lettering only: the wooden board is in the merged props (boards())
    const g=new T.Group();g.position.set(x,y,z);g.rotation.y=face;group.add(g);
    if(typeof document!=='undefined'&&document.createElement){const c=document.createElement('canvas');c.width=512;c.height=Math.round(512*h/w);const x2=c.getContext('2d');
      if(x2){let size=Math.round(c.height*.62);x2.font=`700 ${size}px Georgia,serif`;while(x2.measureText(text).width>470&&size>10)x2.font=`700 ${--size}px Georgia,serif`;
        x2.fillStyle=ink;x2.textAlign='center';x2.textBaseline='middle';x2.fillText(text,256,c.height/2+2);
        const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;textures.push(t);
        const mt=new T.MeshBasicMaterial({map:t,transparent:true,toneMapped:false});textures.push(mt);
        const m=new T.Mesh(own(new T.PlaneGeometry(w*.94,h*.86)),mt);m.position.z=.005;g.add(m);}}
    return g;}

  // ---- Items each frame: bob, spin, glow faces the player; collected ones vanish ----
  const im4=new T.Matrix4(),iq=new T.Quaternion(),iy=new T.Vector3(0,1,0),ip=new T.Vector3(),is=new T.Vector3();
  function placeItems(time,player){
    for(const mesh of [apples,shoes]){mesh.userData.items.forEach((it,i)=>{const gone=collected.has(it.id),k=it.kind==='golden'?1.45:1;
      ip.set(it.x,groundY(it.x,it.z)+1.45+Math.sin(time*2.1+i*1.7)*.13,it.z);iq.setFromAxisAngle(iy,time*1.6+i);is.setScalar(gone?0:k);im4.compose(ip,iq,is);mesh.setMatrixAt(i,im4);});
      mesh.instanceMatrix.needsUpdate=true;}
    glows.userData.items.forEach((it,i)=>{const gone=collected.has(it.id),s=(it.kind==='golden'?1.9:1.25)*(1+Math.sin(time*3+i)*.08);
      ip.set(it.x,groundY(it.x,it.z)+1.45+Math.sin(time*2.1+i*1.7)*.13,it.z);iq.setFromAxisAngle(iy,Math.atan2(player.x-it.x,player.z-it.z));is.set(gone?0:s,gone?0:s,1);im4.compose(ip,iq,is);glows.setMatrixAt(i,im4);});
    glows.instanceMatrix.needsUpdate=true;}

  // ---- Quest ----
  function resetQuest(){state='lost';collected=new Set();runClock=0;inside=false;whinnyIn=1.5;footArmed=true;jumpSide={};wander=0;
    foal=newFoal(L.foal.x,L.foal.z,Math.PI);placeFoal(0);}
  function placeFoal(dt){if(!foalModel)return;const y=groundY(foal.x,foal.z)+foal.hop;foalModel.root.position.set(foal.x,y,foal.z);
    const d=Math.atan2(Math.sin(foal.heading-foalModel.root.rotation.y),Math.cos(foal.heading-foalModel.root.rotation.y));foalModel.root.rotation.y+=d*Math.min(1,dt*8);
    const gait=foal.speed>6.5?'canter':foal.speed>2.6?'trot':foal.speed>.25?'walk':'stand';if(foalModel.gait!==gait)foalModel.setGait(gait);foalModel.update(dt);}
  const walls=()=>obstacles.filter(o=>o.maze==='corn');
  let wallCache=null;
  const blockedFoal=(x,z)=>{wallCache||=walls();return wallCache.some(o=>Math.abs(x-o.x)<o.hx+.3&&Math.abs(z-o.z)<o.hz+.3);};
  function steerTo(tx,tz,speed,dt){const dx=tx-foal.x,dz=tz-foal.z,d=Math.hypot(dx,dz);
    foal.speed+=((d>.3?speed:0)-foal.speed)*Math.min(1,dt*3);if(d>.05){const s=Math.min(d,foal.speed*dt);foal.x+=dx/d*s;foal.z+=dz/d*s;foal.heading=Math.atan2(dx,dz);}}

  function update(dt,player,time){
    const events=[];if(!active||!L||!player)return events;dt=Math.min(Math.max(dt||0,0),.1);clock+=dt;swayU.value=clock;
    const px=player.x,pz=player.z,mounted=!!player.mounted,jumpH=player.jump||0;
    // Enter / leave.
    const nowIn=inMaze(px,pz);if(nowIn!==inside){inside=nowIn;events.push({type:nowIn?'enter':'leave'});}
    if(nowIn||state==='following')runClock+=dt;
    // Pick-ups.
    for(const it of L.items){if(collected.has(it.id))continue;if(Math.hypot(px-it.x,pz-it.z)<1.6){collected.add(it.id);events.push({type:'collect',kind:it.kind,id:it.id,x:it.x,z:it.z,left:L.items.length-collected.size});}}
    // Jumps: cleared (crossed from one side to the other), or touched on foot.
    let nearAny=false;
    for(const j of L.jumps){const along=j.axis==='x'?px-j.x:pz-j.z,acrossD=j.axis==='x'?Math.abs(pz-j.z):Math.abs(px-j.x),acrossH=j.axis==='x'?j.hz:j.hx;
      if(acrossD<acrossH&&Math.abs(along)<3.5){const side=Math.sign(along)||1;if(jumpSide[j.id]&&jumpSide[j.id]!==side)events.push({type:'jump',id:j.id,kind:j.kind,mandatory:j.mandatory,height:jumpH});jumpSide[j.id]=side;}else delete jumpSide[j.id];
      const r=mounted?.7:.36;if(Math.abs(px-j.x)<j.hx+r+.15&&Math.abs(pz-j.z)<j.hz+r+.15){nearAny=true;if(!mounted&&footArmed){footArmed=false;events.push({type:'blocked-foot',id:j.id,kind:j.kind});}}
      else if(Math.abs(px-j.x)<j.hx+2.5&&Math.abs(pz-j.z)<j.hz+2.5)nearAny=true;}
    if(!nearAny)footArmed=true;
    // The foal.
    if(state==='lost'){wander+=dt;const tx=L.foal.x+Math.sin(wander*.37)*.9,tz=L.foal.z+Math.cos(wander*.29)*.9,grazing=Math.sin(wander*.21)>.35;
      steerTo(tx,tz,grazing?0:.7,dt);
      if(nowIn){whinnyIn-=dt;if(whinnyIn<=0){whinnyIn=8;events.push({type:'whinny',...whinny(player,foal)});}}
      if(Math.hypot(px-foal.x,pz-foal.z)<FOUND_R){state='following';foal.trail=[];events.push({type:'found',x:foal.x,z:foal.z});}}
    else if(state==='following'){const r=foalStep(foal,player,dt,{blocked:blockedFoal,jumps:L.jumps});if(r.hopped)foalModel?.jump();
      if(Math.hypot(px-foal.x,pz-foal.z)>45){state='lost';foal=newFoal(L.foal.x,L.foal.z,Math.PI);events.push({type:'lost'});}
      else if(!inMaze(px,pz)&&Math.hypot(px-CORN.gate.outside.x,pz-CORN.gate.outside.z)<9&&Math.hypot(px-foal.x,pz-foal.z)<5.5){state='home';events.push({type:'home',seconds:Math.round(runClock),collected:collected.size});}}
    else if(state==='home'){steerTo(CORN.farmer.x+1.2,CORN.farmer.z-.6,1.6,dt);}
    placeFoal(dt);placeItems(clock,player);
    return events;}

  build(layout);
  return {group,obstacles,update,
    get layout(){return L;},
    get foalFound(){return state!=='lost';},get foalFollowing(){return state==='following';},get foalHome(){return state==='home';},
    foalPosition(){return {x:foal.x,y:groundY(foal.x,foal.z)+foal.hop,z:foal.z};},
    get collected(){return [...collected];},
    reset(next){wallCache=null;if(next&&next!==L)build(next);else resetQuest();return obstacles;},
    setActive(on){active=!!on;group.visible=active;},
    dispose(){clearLayout();foalModel?.dispose();foalModel?.root.removeFromParent();group.removeFromParent();owned.forEach(o=>o.dispose?.());},
    debug:{get state(){return state;},get foal(){return foal;},stats(){let draws=0,tris=0,foalDraws=0,foalTris=0;foalModel?.root.traverse(o=>{if(o.isMesh){foalDraws++;const g=o.geometry;foalTris+=(g.index?g.index.count:g.attributes.position.count)/3;}});
      group.traverse(o=>{if(!o.isMesh||!o.visible)return;draws++;const g=o.geometry,t=(g.index?g.index.count:g.attributes.position.count)/3;tris+=t*(o.isInstancedMesh?o.count:1);});
      return {draws:draws-foalDraws,tris:Math.round(tris-foalTris),foalDraws,foalTris:Math.round(foalTris),stalks:stalks?.count||0,obstacles:obstacles.length};},
      teleportFoal(x,z){foal.x=x;foal.z=z;},clock:()=>clock}};
}

// A leaf: a tapering strip that arcs out and droops, in local space leaving the stalk along +x.
function leafGeometry(T,segs){const P=[],I=[],len=.85;
  for(let k=0;k<=segs;k++){const t=k/segs,x=.03+t*len,y=Math.sin(t*Math.PI*.8)*.28-t*t*.25,w=.07*(1-t)+.008;P.push(x,y,-w,x,y,w);}
  for(let k=0;k<segs;k++){const a=k*2;I.push(a,a+1,a+2,a+1,a+3,a+2);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setIndex(I);g.computeVertexNormals();return g;}
// Soft round glow without a canvas (works anywhere).
function radialTexture(T){const n=32,d=new Uint8Array(n*n*4);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const r=Math.hypot(x-n/2+.5,y-n/2+.5)/(n/2),a=Math.max(0,1-r);const o=(y*n+x)*4;d[o]=255;d[o+1]=255;d[o+2]=255;d[o+3]=Math.round(255*a*a*.85);}
  const t=new T.DataTexture(d,n,n,T.RGBAFormat);t.needsUpdate=true;t.magFilter=t.minFilter=T.LinearFilter;return t;}
