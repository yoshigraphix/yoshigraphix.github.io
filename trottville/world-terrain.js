// Real ground (v149, 2026-11-17; Yoshi picked "A) ground and mountains" after asking for a more realistic world).
// The ground keeps its vertex colours (biome, sand, snow, rock bands) and this shader patch makes them read as real
// land: deeper grass tones in big dry/lush patches, bare dirt patches, blade-and-clover texture near you, grain on
// sand and snow, and rock (strata + cracks, projected from the side) wherever the slope is steep. All textures are
// drawn on canvases at runtime (no files). The amount follows ✨ Pretty effects (uTer = the detail switch).
function rand(seed){let a=seed|0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function canvas(n){const c=document.createElement('canvas');c.width=c.height=n;return [c,c.getContext('2d')];}
const wrap9=(N,f)=>{for(const ox of [-N,0,N])for(const oy of [-N,0,N])f(ox,oy);};
let TEX=null;
export function terrainTextures(T){if(TEX)return TEX;
  const tex=(c,mip=true)=>{const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;t.generateMipmaps=mip;return t;};
  const out={};
  {const N=512,[c,g]=canvas(N),r=rand(201);g.fillStyle='rgb(128,128,128)';g.fillRect(0,0,N,N);   // grass: blades, clover, shadow gaps
    for(let i=0;i<900;i++){const x=r()*N,y=r()*N,rad=4+r()*22,v=r()<.5?70+r()*40:160+r()*50;g.fillStyle=`rgba(${v},${v},${v},${.05+r()*.08})`;wrap9(N,(ox,oy)=>{g.beginPath();g.arc(x+ox,y+oy,rad,0,7);g.fill();});}
    g.lineCap='round';for(let i=0;i<9000;i++){const x=r()*N,y=r()*N,a=r()*Math.PI*2,l=3+r()*9,v=r()<.42?40+r()*50:165+r()*80;g.strokeStyle=`rgba(${v},${v},${v},${.35+r()*.45})`;g.lineWidth=.6+r()*1.3;
      wrap9(N,(ox,oy)=>{if(x+ox<-12||x+ox>N+12||y+oy<-12||y+oy>N+12)return;g.beginPath();g.moveTo(x+ox,y+oy);g.quadraticCurveTo(x+ox+Math.cos(a)*l*.5+(r()-.5)*3,y+oy+Math.sin(a)*l*.5,x+ox+Math.cos(a)*l,y+oy+Math.sin(a)*l);g.stroke();});}
    for(let i=0;i<120;i++){const x=r()*N,y=r()*N,v=175+r()*60;g.fillStyle=`rgba(${v},${v},${v},.5)`;for(let k=0;k<3;k++){const a=k*2.1+r(),px=x+Math.cos(a)*2.4,py=y+Math.sin(a)*2.4;wrap9(N,(ox,oy)=>{g.beginPath();g.arc(px+ox,py+oy,2.2,0,7);g.fill();});}}
    out.grass=tex(c);}
  {const N=256,[c,g]=canvas(N),r=rand(202);g.fillStyle='rgb(128,128,128)';g.fillRect(0,0,N,N);   // dirt: clods + pebbles (r), fine grain (g)
    for(let i=0;i<1400;i++){const x=r()*N,y=r()*N,rad=1+r()*7,v=r()<.5?55+r()*45:170+r()*60;g.fillStyle=`rgba(${v},${v},${v},${.12+r()*.25})`;wrap9(N,(ox,oy)=>{g.beginPath();g.ellipse(x+ox,y+oy,rad,rad*(.5+r()*.5),r()*3,0,7);g.fill();});}
    for(let i=0;i<260;i++){const x=r()*N,y=r()*N,rad=1.2+r()*2.6;wrap9(N,(ox,oy)=>{g.fillStyle='rgba(40,40,40,.45)';g.beginPath();g.ellipse(x+ox+.8,y+oy+.9,rad,rad*.8,0,0,7);g.fill();g.fillStyle=`rgba(${200+r()*50|0},${200+r()*50|0},${200+r()*50|0},.8)`;g.beginPath();g.ellipse(x+ox,y+oy,rad,rad*.8,0,0,7);g.fill();});}
    const id=g.getImageData(0,0,N,N),d=id.data;for(let i=0;i<d.length;i+=4){d[i+1]=128+(r()-.5)*120;}g.putImageData(id,0,0);out.dirt=tex(c);}
  {const N=512,[c,g]=canvas(N),r=rand(203);g.fillStyle='rgb(120,120,120)';g.fillRect(0,0,N,N);   // rock: strata along u, cracks, lichen-free mottling
    for(let i=0;i<70;i++){const y0=r()*N,h=2+r()*26,v=r()<.5?60+r()*50:150+r()*70;g.fillStyle=`rgba(${v},${v},${v},${.18+r()*.3})`;
      for(const oy of [-N,0,N]){g.beginPath();g.moveTo(0,y0+oy);for(let x=0;x<=N;x+=16)g.lineTo(x,y0+oy+Math.sin(x/N*Math.PI*2*(1+(i%3))+i)*4);for(let x=N;x>=0;x-=16)g.lineTo(x,y0+oy+h+Math.sin(x/N*Math.PI*2*(1+(i%2))+i*1.7)*3);g.closePath();g.fill();}}
    for(let i=0;i<1100;i++){const x=r()*N,y=r()*N,rad=2+r()*14,v=r()<.5?50+r()*50:170+r()*60;g.fillStyle=`rgba(${v},${v},${v},${.05+r()*.12})`;wrap9(N,(ox,oy)=>{g.beginPath();g.ellipse(x+ox,y+oy,rad*1.6,rad*.6,(r()-.5)*.4,0,7);g.fill();});}
    for(let i=0;i<60;i++){let x=r()*N,y=r()*N;const vert=r()<.6;g.strokeStyle=`rgba(25,25,25,${.4+r()*.4})`;g.lineWidth=.8+r()*1.8;g.beginPath();g.moveTo(x,y);for(let k=0;k<10;k++){x+=vert?(r()-.5)*10:6+r()*10;y+=vert?5+r()*12:(r()-.5)*6;g.lineTo(x,y);}g.stroke();}
    out.rock=tex(c);}
  {const N=256,c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d'),id=g.createImageData(N,N),d=id.data;   // macro: three tileable value noises
    const layer=(cells,seed)=>{const r=rand(seed),G=Array.from({length:cells*cells},r),at=(i,j)=>G[((j%cells+cells)%cells)*cells+((i%cells+cells)%cells)];
      return (x,y)=>{const fx=x/N*cells,fy=y/N*cells,i=Math.floor(fx),j=Math.floor(fy),u=fx-i,v=fy-j,s=u*u*(3-2*u),t=v*v*(3-2*v);return (at(i,j)*(1-s)+at(i+1,j)*s)*(1-t)+(at(i,j+1)*(1-s)+at(i+1,j+1)*s)*t;};};
    const L=[[layer(4,1),layer(9,2),layer(21,3)],[layer(5,4),layer(11,5),layer(25,6)],[layer(6,7),layer(13,8),layer(29,9)]];
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){const o=(y*N+x)*4;for(let k=0;k<3;k++)d[o+k]=Math.round((L[k][0](x,y)*.55+L[k][1](x,y)*.3+L[k][2](x,y)*.15)*255);d[o+3]=255;}
    g.putImageData(id,0,0);out.macro=tex(c);}
  return TEX=out;}

// Ground shader patch. uTer is the shared 0/1 detail uniform (✨ Pretty effects). Call AFTER any patch that replaces
// '#include <color_fragment>' (snow), so snow still lands on top of the new ground.
export function addTerrain(sh,tex,uTer,{blades=false}={}){
  Object.assign(sh.uniforms,{uTGrass:{value:tex.grass},uTDirt:{value:tex.dirt},uTRock:{value:tex.rock},uTMacro:{value:tex.macro},uTer});
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vTW;varying vec3 vTN;').replace('#include <project_vertex>','#include <project_vertex>\nvTW=(modelMatrix*vec4(transformed,1.0)).xyz;vTN=normalize((modelMatrix*vec4(objectNormal,0.0)).xyz);');
  if(blades)sh.fragmentShader='#define TER_BLADES\n'+sh.fragmentShader;
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vTW;varying vec3 vTN;uniform sampler2D uTGrass;uniform sampler2D uTDirt;uniform sampler2D uTRock;uniform sampler2D uTMacro;uniform float uTer;').replace('#include <color_fragment>',`#include <color_fragment>
    if(uTer>0.){vec3 c0=diffuseColor.rgb,c=c0;float dist=length(vTW-cameraPosition);vec3 N=normalize(vTN);float up=N.y;
      vec4 M1=texture2D(uTMacro,vTW.xz/97.),M2=texture2D(uTMacro,vTW.xz/23.+.37);
      float grass=smoothstep(.02,.08,c0.g-max(c0.r,c0.b)),bright=min(c0.r,min(c0.g,c0.b));
      vec3 g=c0*vec3(.74,.80,.56);
      g=mix(g,g*vec3(1.32,1.10,.62),smoothstep(.40,.75,M1.r));
      g=mix(g,g*vec3(.62,.78,.70),smoothstep(.45,.8,M2.g)*.8);
      c=mix(c,g,grass);
      vec3 dT=texture2D(uTDirt,vTW.xz/2.6).rgb;float dk=grass*smoothstep(.69,.80,M1.b*.65+M2.r*.35);
      c=mix(c,vec3(.15,.105,.068)*(.55+.9*dT.r),dk*.9);
      #ifdef TER_BLADES
      if(dk>.3)discard;
      #endif
      float near=(1.-smoothstep(14.,90.,dist))*${blades?'0.':'1.'},gt=texture2D(uTGrass,vTW.xz/2.3).r*.55+texture2D(uTGrass,vTW.xz/.83).r*.45,cl=texture2D(uTMacro,vTW.xz/5.3).g;
      c*=max(.2,1.+near*grass*(1.-dk)*((gt-.5)*1.8+(cl-.5)*1.3));
      float mid=texture2D(uTMacro,vTW.xz/13.).b;c*=1.+grass*(1.-dk)*(mid-.5)*.75*(1.-smoothstep(60.,160.,dist));
      c*=mix(1.,.78+.44*dT.g*(.7+.6*dT.r),near*(1.-grass)*(1.-smoothstep(.62,.8,bright)*.6));
      float rk=${blades?'0.':'smoothstep(.83,.62,up)'};
      if(rk>0.){vec3 b=pow(abs(N),vec3(3.));b/=b.x+b.y+b.z;
        float r=texture2D(uTRock,vec2(vTW.z,vTW.y)/7.5).r*b.x+texture2D(uTRock,vTW.xz/7.5).r*b.y+texture2D(uTRock,vec2(vTW.x,vTW.y)/7.5).r*b.z;
        vec3 rc=mix(vec3(.16,.15,.135),vec3(.23,.20,.16),M2.b)*(.5+r);c=mix(c,rc,rk);}
      diffuseColor.rgb=mix(c0,c,uTer);}`);}

// Smooth normals for a chunk: heights on the chunk's grid plus a one-cell border, so neighbouring chunks agree
// at their seams (computeVertexNormals per chunk leaves a lit line along every chunk edge).
export function gridNormals(geo,heightAt,cell){const p=geo.attributes.position,n=new Float32Array(p.count*3),cache=new Map();
  const H=(x,z)=>{const k=Math.round(x/cell)+','+Math.round(z/cell);let h=cache.get(k);if(h===undefined){h=heightAt(x,z);cache.set(k,h);}return h;};
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);cache.set(Math.round(x/cell)+','+Math.round(z/cell),p.getY(i));}
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),dx=H(x-cell,z)-H(x+cell,z),dz=H(x,z-cell)-H(x,z+cell),l=Math.hypot(dx,2*cell,dz);n[i*3]=dx/l;n[i*3+1]=2*cell/l;n[i*3+2]=dz/l;}
  geo.setAttribute('normal',new p.constructor(n,3));}

// Grass blades round you (v149): tufts of real blades in 8 m tiles, 7×7 tiles round the player (about 28 m), one
// instanced mesh (one draw call). Each tuft takes the ground's grass colour and the same dry/lush patches as the ground
// shader, sways in the wind, shrinks away at the edge of the ring so nothing pops, and never grows in bare dirt
// patches. ok(x,z) keeps them off paths, roads, rivers, buildings, fields and squares. Off in lite graphics and when
// ✨ Pretty effects is off. Tiles are filled a few per frame, so a long jump never stalls a frame.
export function createGrass({T,scene,ok,base,height,tex,uTer,windU,simple}){
  if(simple)return {update(){},dispose(){},mesh:null};
  const TILE=8,R=3,PER=100,SIDE=2*R+1,MAX=SIDE*SIDE*PER,FADE=[R*TILE-6,R*TILE+2];
  const pos=[],col=[],nrm=[],gh=[],r=rand(301);
  for(let b=0;b<5;b++){const a=r()*Math.PI*2,rr=r()*.22,ox=Math.cos(a)*rr,oz=Math.sin(a)*rr,h=.16+r()*.2,w=.028+r()*.02,face=r()*Math.PI,lean=.08+r()*.2;
    const fx=Math.cos(face)*w,fz=Math.sin(face)*w,lx=Math.cos(a)*lean,lz=Math.sin(a)*lean;
    const P=[[ox-fx,0,oz-fz],[ox+fx,0,oz+fz],[ox-fx*.6+lx*.35,h*.55,oz-fz*.6+lz*.35],[ox+fx*.6+lx*.35,h*.55,oz+fz*.6+lz*.35],[ox+lx,h,oz+lz]];
    for(const t of [[0,1,3],[0,3,2],[2,3,4]])for(const k of t){pos.push(...P[k]);nrm.push(0,1,0);const y=P[k][1]/h;gh.push(P[k][1]);const v=.42+.55*y;col.push(v,v,v*.9);}}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new T.Float32BufferAttribute(nrm,3));
  geo.setAttribute('color',new T.Float32BufferAttribute(col,3));geo.setAttribute('gh',new T.Float32BufferAttribute(gh,1));
  const mat=new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide});
  const U={uFade:{value:new T.Vector2(...FADE)},uMe:{value:new T.Vector2()}};
  mat.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);sh.uniforms.uWind=windU.uWind;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float gh;uniform float uWind;uniform vec2 uFade;uniform vec2 uMe;').replace('#include <begin_vertex>',`#include <begin_vertex>
      {vec4 io=modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.);float d=distance(io.xz,uMe);transformed*=1.-smoothstep(uFade.x,uFade.y,d);
       float ph=io.x*.37+io.z*.29,k=gh*gh*4.;transformed.x+=k*(sin(uWind*1.9+ph)*.05+.035);transformed.z+=k*sin(uWind*1.4+ph*1.3)*.035;}`);
    addTerrain(sh,tex,uTer,{blades:true});};
  mat.customProgramCacheKey=()=>'grass-blades';
  const mesh=new T.InstancedMesh(geo,mat,MAX);mesh.frustumCulled=false;mesh.receiveShadow=true;mesh.castShadow=false;mesh.renderOrder=-5;
  const zero=new T.Matrix4().makeScale(0,0,0),m=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),v=new T.Vector3(),sc=new T.Vector3(),c=new T.Color();
  for(let i=0;i<MAX;i++){mesh.setMatrixAt(i,zero);mesh.setColorAt(i,c.set('#90b878'));}
  scene.add(mesh);
  const tiles=new Map(),free=Array.from({length:SIDE*SIDE},(_,i)=>i),queue=[];let last='';
  const tileRng=(ix,iz)=>rand(Math.imul(ix,73856093)^Math.imul(iz,19349663)^0x5bd1e995);
  function fill(key,slot){const [ix,iz]=key.split(',').map(Number),rr=tileRng(ix,iz);
    for(let k=0;k<PER;k++){const i=slot*PER+k,x=(ix+rr())*TILE,z=(iz+rr())*TILE,yaw=rr()*6.283,s=.8+rr()*.5;
      const hex=ok(x,z)?base(x,z):null;if(!hex){mesh.setMatrixAt(i,zero);continue;}
      m.compose(v.set(x,height(x,z)-.03,z),q.setFromEuler(e.set(0,yaw,0)),sc.set(s,s*(.8+rr()*.5),s));mesh.setMatrixAt(i,m);mesh.setColorAt(i,c.set(hex));}
    mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;}
  function update(px,pz){mesh.visible=uTer.value>0;if(!mesh.visible)return;U.uMe.value.set(px,pz);
    const cx=Math.floor(px/TILE),cz=Math.floor(pz/TILE),here=cx+','+cz;
    if(here!==last){last=here;const want=new Set();for(let a=-R;a<=R;a++)for(let b=-R;b<=R;b++)want.add((cx+a)+','+(cz+b));
      for(const [k,slot] of tiles)if(!want.has(k)){tiles.delete(k);free.push(slot);for(let i=0;i<PER;i++)mesh.setMatrixAt(slot*PER+i,zero);mesh.instanceMatrix.needsUpdate=true;}
      for(let i=queue.length-1;i>=0;i--)if(!want.has(queue[i]))queue.splice(i,1);
      // nearest tiles first
      [...want].filter(k=>!tiles.has(k)&&!queue.includes(k)).sort((a,b)=>{const [ax,az]=a.split(',').map(Number),[bx,bz]=b.split(',').map(Number);return Math.hypot(bx-cx,bz-cz)-Math.hypot(ax-cx,az-cz);}).forEach(k=>queue.push(k));}
    for(let n=0;n<4&&queue.length;n++){const k=queue.pop(),slot=free.pop();tiles.set(k,slot);fill(k,slot);}}
  function reset(){last='';for(const [k,slot] of tiles){free.push(slot);for(let i=0;i<PER;i++)mesh.setMatrixAt(slot*PER+i,zero);}tiles.clear();queue.length=0;mesh.instanceMatrix.needsUpdate=true;}
  return {mesh,update,reset,dispose(){mesh.removeFromParent();geo.dispose();mat.dispose();}};}
