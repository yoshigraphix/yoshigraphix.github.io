// Night lighting for the 3D world (Yoshi 2026-11-08: "truly dark + lanterns"). After sunset the valley goes properly
// dark (world-weather.mjs night keyframes); these lights show the way:
// - a warm lantern that travels with you (on foot or riding), a real light so the ground round your horse glows;
// - lamp posts along the valley paths: glowing lamps for every post, and real light from the two nearest to you;
// - lit cottage and Hoofhaven windows.
// All three lights exist from the start (intensity 0 by day), so dusk never triggers a shader recompile.
import {MAP_PATHS,terrainHeight,inWater,onBridge} from './world-content.mjs?v=161';
import {blocked} from './world-logic.mjs?v=161';

const SPACING=24,SIDE=2.9;
const WINDOW_COLORS=['#ceded5','#f6e7b0','#3e4a52'];// hut windows, Hoofhaven windows (world-expansion.js), Tudor shop glass (world-tudor.js)

// Posts sit beside each path every SPACING units, alternating sides, never on an obstacle or the yard.
export function lanternSpots(obstacles){const spots=[],paths=[MAP_PATHS.loop,MAP_PATHS.yard,...MAP_PATHS.routes];let side=1;
  for(const pts of paths){let carry=SPACING*.5;for(let i=0;i<pts.length-1;i++){const [ax,az]=pts[i],[bx,bz]=pts[i+1],len=Math.hypot(bx-ax,bz-az);if(!len)continue;
    const nx=-(bz-az)/len,nz=(bx-ax)/len;for(let d=carry;d<len;d+=SPACING){const t=d/len,x=ax+(bx-ax)*t+nx*SIDE*side,z=az+(bz-az)*t+nz*SIDE*side;side=-side;
      if(blocked(x,z,1.4,0,obstacles)||inWater(x,z,2.5)||onBridge(x,z,3)||spots.some(s=>Math.hypot(s.x-x,s.z-z)<SPACING*.6))continue;spots.push({x,z});}
    carry=(carry-len)%SPACING;if(carry<0)carry+=SPACING;}}
  return spots;}

function glowTexture(T){const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);
  r.addColorStop(0,'rgba(255,236,190,1)');r.addColorStop(.25,'rgba(255,196,110,.55)');r.addColorStop(1,'rgba(255,170,80,0)');g.fillStyle=r;g.fillRect(0,0,64,64);
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;}

export function createLanterns({T,scene,outdoors,materials,obstacles}){
  const spots=lanternSpots(obstacles),n=spots.length,m4=new T.Matrix4();
  const postGeo=new T.BoxGeometry(.22,3.2,.22),lampGeo=new T.BoxGeometry(.55,.6,.55),capGeo=new T.ConeGeometry(.5,.35,4);
  const postMat=new T.MeshStandardMaterial({color:'#5b4632',roughness:1,flatShading:true});
  const lampMat=new T.MeshStandardMaterial({color:'#f3dca2',emissive:'#ffc46a',emissiveIntensity:0,roughness:1,flatShading:true});
  const posts=new T.InstancedMesh(postGeo,postMat,n),lamps=new T.InstancedMesh(lampGeo,lampMat,n),caps=new T.InstancedMesh(capGeo,postMat,n);
  const glowPos=new Float32Array(n*3);
  spots.forEach((s,i)=>{const y=terrainHeight(s.x,s.z);s.y=y;m4.makeTranslation(s.x,y+1.6,s.z);posts.setMatrixAt(i,m4);m4.makeTranslation(s.x,y+3.45,s.z);lamps.setMatrixAt(i,m4);
    m4.makeRotationY(Math.PI/4).setPosition(s.x,y+3.92,s.z);caps.setMatrixAt(i,m4);glowPos.set([s.x,y+3.45,s.z],i*3);
    obstacles.push({kind:'box',x:s.x,z:s.z,hx:.3,hz:.3,height:3.6});});
  for(const mesh of [posts,lamps,caps]){mesh.castShadow=mesh===posts;mesh.instanceMatrix.needsUpdate=true;outdoors.add(mesh);}
  const glowGeo=new T.BufferGeometry();glowGeo.setAttribute('position',new T.BufferAttribute(glowPos,3));
  const glows=new T.Points(glowGeo,new T.PointsMaterial({map:glowTexture(T),size:3.4,sizeAttenuation:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:0}));
  glows.visible=false;outdoors.add(glows);
  // Your lantern, plus the two nearest lamp posts as real lights (three lights in all, whatever the map size).
  const mine=new T.PointLight('#ffc27a',0,14,1.4),near=[0,1].map(()=>new T.PointLight('#ffbf6e',0,15,1.6));scene.add(mine,...near);
  // v113 (note #35): you HOLD the lantern now: it swings at hand height in front of you, and its beam (a spot light)
  // points wherever you look, so you can aim it at things. Light count stays constant day and night (no shader rebuilds).
  const beam=new T.SpotLight('#ffd9a0',0,30,.55,.6,1.2);scene.add(beam,beam.target);
  const held=new T.Group();{const glass=new T.Mesh(new T.CylinderGeometry(.09,.09,.2,8),new T.MeshBasicMaterial({color:'#ffd27a'})),cap=new T.Mesh(new T.ConeGeometry(.12,.08,8),new T.MeshStandardMaterial({color:'#3b3027'})),ring=new T.Mesh(new T.TorusGeometry(.06,.012,4,10),cap.material);
    cap.position.y=.14;ring.position.y=.22;held.add(glass,cap,ring);}held.visible=false;scene.add(held);
  const windows=()=>WINDOW_COLORS.map(c=>materials.get(c+'{}')).filter(Boolean);
  let shownNight=-1;
  let sw=0;
  function update(night,{x,y,z,outdoors:isOut=true,fx=0,fz=1,h=1.1,t=0}){const k=isOut?Math.max(0,Math.min(1,(night-.1)/.6)):0;
    const L=Math.hypot(fx,fz)||1;fx/=L;fz/=L;sw=Math.sin(t*3.1)*.04;const hx=x+fx*.55+fz*.32,hz=z+fz*.55-fx*.32;
    mine.intensity=k*9;mine.position.set(hx,y+h+.2,hz);held.visible=k>0;held.position.set(hx,y+h+sw,hz);held.rotation.z=sw*2;
    beam.intensity=k*26;beam.position.set(hx,y+h+.3,hz);beam.target.position.set(x+fx*14,y,z+fz*14);
    if(k>0&&n){const order=spots.map((s,i)=>[Math.hypot(s.x-x,s.z-z),i]).sort((a,b)=>a[0]-b[0]);
      near.forEach((l,j)=>{const hit=order[j];if(!hit||hit[0]>60){l.intensity=0;return;}const s=spots[hit[1]];l.position.set(s.x,s.y+3.3,s.z);l.intensity=k*9;});}
    else near.forEach(l=>l.intensity=0);
    const q=Math.round(k*20)/20;if(q===shownNight)return;shownNight=q;
    lampMat.emissiveIntensity=q*2.4;glows.visible=q>0;glows.material.opacity=q*.9;
    for(const w of windows()){w.emissive.set('#ffc46a');w.emissiveIntensity=q*1.6;}}
  function dispose(){scene.remove(mine,beam,beam.target,held,...near);for(const o of [posts,lamps,caps,glows]){o.parent?.remove(o);o.geometry.dispose();}postMat.dispose();lampMat.dispose();glows.material.map.dispose();glows.material.dispose();}
  return {update,dispose,count:n,spots};}
