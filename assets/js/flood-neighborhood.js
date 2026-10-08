import * as THREE from '../vendor/three.module.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { FEET_PER_METER, waterMetrics } from './flood-math.mjs';
const DETAIL_RADIUS=1609.344 * .33;
const $=id=>document.getElementById(id), canvas=$('terrain');
let renderer,scene,camera,orbit,data,water,river,base,riverBase,scenery,frame=0;
const fmt=v=>`${Math.round(v).toLocaleString()} ft`;
function render(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;renderer?.render(scene,camera);});}
function ground(x,z){
 const n=data.size,u=Math.max(0,Math.min(n-1,(x/data.radiusMeters+1)/2*(n-1))),v=Math.max(0,Math.min(n-1,(z/data.radiusMeters+1)/2*(n-1)));
 const a=Math.min(n-2,Math.floor(u)),b=Math.min(n-2,Math.floor(v)),du=u-a,dv=v-b,h=data.heights;
 return h[b*n+a]*(1-du)*(1-dv)+h[b*n+a+1]*du*(1-dv)+h[(b+1)*n+a]*(1-du)*dv+h[(b+1)*n+a+1]*du*dv-base;
}
function mesh(geometry,color,parent=scene){const m=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({color,side:THREE.DoubleSide}));parent.add(m);return m;}
function label(text,x,y,z){
 const c=document.createElement('canvas');c.width=512;c.height=80;const g=c.getContext('2d');g.fillStyle='#101c20dd';g.fillRect(0,0,512,80);g.fillStyle='#ffffff';g.textAlign='center';g.font='30px system-ui';g.fillText(text,256,51);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false}));s.position.set(x,y,z);s.scale.set(130,20,1);s.renderOrder=5;scene.add(s);
}
function updateWater(){
 if(!data||!water)return;
 const b=Number($('baseline').value),r=Number($('rise').value);
 if($('baseline').value.trim()===''||!Number.isFinite(b)||Math.abs(b)>50000){water.visible=false;['water-elevation','threshold','difference'].forEach(id=>$(id).textContent='—');$('status').textContent='Enter a reference elevation between −50,000 and 50,000 feet.';render();return;}
 const m=waterMetrics(data.heights[(data.heights.length-1)/2],b,r);
 $('rise-value').textContent=r.toFixed(1);$('water-elevation').textContent=fmt(m.water);$('ground-elevation').textContent=fmt(m.ground);$('threshold').textContent=m.threshold>0?`+${fmt(m.threshold)}`:'Reference already at/above ground';$('difference').textContent=`${fmt(Math.abs(m.difference))} ${m.difference>=0?'above':'below'} ground`;
 water.position.y=m.water/FEET_PER_METER-base;water.visible=true;
 if (river) river.position.y = Number($('rise').value) / FEET_PER_METER;
 $('status').textContent='Drag to rotate · Scroll / pinch to zoom · Right-drag to pan · True vertical scale · Reference is not an observed river level.';render();
}
function setView(close=false){
 if(!orbit)return;
 orbit.target.set(close?95:0,close?ground(95,-75):25,close?-75:0);
 const distance=close?680:3700,az=Number($('rotation').value)*Math.PI/180,el=Number($('tilt').value)*Math.PI/180;
 camera.position.copy(orbit.target).add(new THREE.Vector3(Math.sin(az)*Math.cos(el)*distance,Math.sin(el)*distance,Math.cos(az)*Math.cos(el)*distance));orbit.update();render();
}
async function loadJson(path){const r=await fetch(path);if(!r.ok)throw new Error('Data unavailable');return r.json();}
async function init(){try{
 const loaded=await Promise.all([loadJson('../assets/data/flood-terrain.json'),loadJson('../assets/data/neighborhood-osm.json'),loadJson('../assets/data/illustrative-scenery.json'),new THREE.TextureLoader().loadAsync('../assets/data/neighborhood-aerial.jpg')]);
 data=loaded[0];const osm=loaded[1],objects=loaded[2],texture=loaded[3];
 if(data.heights.length!==data.size**2||!data.heights.every(Number.isFinite))throw new Error('Invalid terrain');
 base=Math.min(...data.heights);scene=new THREE.Scene();scene.background=new THREE.Color('#172820');
 camera=new THREE.PerspectiveCamera(45,1,1,15000);renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
 scene.add(new THREE.HemisphereLight(0xffffff,0x607040,2.2));const sun=new THREE.DirectionalLight(0xfff0d6,2.1);sun.position.set(-600,1200,400);scene.add(sun);
 orbit=new OrbitControls(camera,canvas);orbit.minDistance=100;orbit.maxDistance=6400;orbit.maxPolarAngle=Math.PI*.48;orbit.minPolarAngle=.05;orbit.addEventListener('change',render);
 const positions=[],uv=[],indices=[],n=data.size,R=data.radiusMeters;
 for(let r=0;r<n;r++)for(let c=0;c<n;c++){positions.push((c/(n-1)*2-1)*R,data.heights[r*n+c]-base,(r/(n-1)*2-1)*R);uv.push(c/(n-1),1-r/(n-1));}
 for(let r=0;r<n-1;r++)for(let c=0;c<n-1;c++){const i=r*n+c;for(const tri of [[i,i+n,i+1],[i+1,i+n,i+n+1]])if(tri.every(j=>Math.hypot(positions[j*3],positions[j*3+2])<=R))indices.push(...tri);}
 const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geom.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geom.setIndex(indices);geom.computeVertexNormals();texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
 scene.add(new THREE.Mesh(geom,new THREE.MeshLambertMaterial({map:texture,side:THREE.DoubleSide})));
 // The water disk intersects the terrain by depth testing; it is independent of scenery.
 water=new THREE.Mesh(new THREE.CircleGeometry(R,192),new THREE.MeshPhongMaterial({color:0x48a9d1,transparent:true,opacity:.68,side:THREE.DoubleSide,shininess:90,depthWrite:false}));water.rotation.x=-Math.PI/2;water.renderOrder=2;scene.add(water);
 const toLocal=p=>({x:(p.lon-data.center[1])*111320*Math.cos(data.center[0]*Math.PI/180),z:(data.center[0]-p.lat)*111320});
 // A separate channel follows the mapped river and slopes gently downstream.
 // Its width and slope are visual approximations, not hydraulic measurements.
 const riverFeature=osm.elements.find(f=>f.tags.waterway==='river' && f.geometry.length>2);
 if (riverFeature) {
  let pts=riverFeature.geometry.map(toLocal).filter(p=>Math.hypot(p.x,p.z)<R+40);
  // Orient the centerline toward the lower endpoint so the visual slope runs
  // downstream even when the source geometry was authored in reverse order.
  if (pts.length>2 && ground(pts.at(-1).x,pts.at(-1).z)>ground(pts[0].x,pts[0].z)) pts=pts.reverse();
  let distance=0; const samples=[];
  for(let i=0;i<pts.length;i++){if(i) distance+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].z-pts[i-1].z);samples.push({...pts[i],distance});}
  riverBase=Math.min(...samples.map(p=>ground(p.x,p.z)))+.45;
  const verts=[], width=15, slope=.0007;
  for(let i=0;i<samples.length;i++){const p=samples[i],prev=samples[Math.max(0,i-1)],next=samples[Math.min(samples.length-1,i+1)],dx=next.x-prev.x,dz=next.z-prev.z,len=Math.hypot(dx,dz)||1,nx=-dz/len*width/2,nz=dx/len*width/2,y=riverBase+p.distance*slope;verts.push(p.x+nx,y,p.z+nz,p.x-nx,y,p.z-nz);}
  const idx=[];for(let i=0;i<samples.length-1;i++)idx.push(i*2,i*2+1,i*2+2,i*2+2,i*2+1,i*2+3);
  const rg=new THREE.BufferGeometry();rg.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));rg.setIndex(idx);rg.computeVertexNormals();river=new THREE.Mesh(rg,new THREE.MeshPhongMaterial({color:0x277f9d,transparent:true,opacity:.88,side:THREE.DoubleSide,shininess:100,depthWrite:false}));river.renderOrder=3;scene.add(river);
 }
 scenery=new THREE.Group();scene.add(scenery);
 // Roads are subdivided so that their ribbons follow the elevation grid.
 const named=new Set();
 for(const feature of osm.elements){
  if(!feature.tags.highway)continue;
  const pts=feature.geometry.map(toLocal),bridge=feature.tags.bridge==='yes';
  const width=bridge?9:feature.tags.highway==='tertiary'?7:feature.tags.highway==='service'?3:5;
  const deck=bridge?Math.max(ground(pts[0].x,pts[0].z),ground(pts.at(-1).x,pts.at(-1).z))+1:null;
  const pos=[];
  for(let i=1;i<pts.length;i++){
   const a=pts[i-1],b=pts[i],dx=b.x-a.x,dz=b.z-a.z,L=Math.hypot(dx,dz);if(!L)continue;
   const steps=Math.ceil(L/8),nx=-dz/L*width/2,nz=dx/L*width/2;
   for(let j=0;j<steps;j++){
    const ax=a.x+dx*j/steps,az=a.z+dz*j/steps,bx=a.x+dx*(j+1)/steps,bz=a.z+dz*(j+1)/steps;
    if(Math.hypot(ax,az)>DETAIL_RADIUS-10||Math.hypot(bx,bz)>DETAIL_RADIUS-10)continue;
    const q=[[ax+nx,az+nz],[ax-nx,az-nz],[bx+nx,bz+nz],[bx-nx,bz-nz]].map(([x,z])=>[x,deck??ground(x,z)+.5,z]);
    for(const k of [0,1,2,2,1,3])pos.push(...q[k]);
   }
  }
  if(pos.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();mesh(g,bridge?0xd8cbb4:0x777b78,scenery);}
  if(bridge&&pos.length){const p=pts[Math.floor(pts.length/2)];label('Wildwood Bridge · approx.',p.x,deck+20,p.z);}
  const name=feature.tags.name;
  if(name&&['Samuel Circle','Cave Mill Road','Franklin Hill Boulevard','Wildwood Road'].includes(name)&&!named.has(name)){
   const p=pts.find(p=>Math.hypot(p.x,p.z)<DETAIL_RADIUS);if(p){named.add(name);label(name,p.x,ground(p.x,p.z)+24,p.z);}
  }
 }
 const roofColors=[0x74766e,0x957460,0x8d908c,0x59636a];
 objects.houses.forEach((h,i)=>{
  if(Math.hypot(h.x,h.z)>DETAIL_RADIUS-20)return;
  const home=new THREE.Group();home.position.set(h.x,ground(h.x,h.z),h.z);home.rotation.y=h.angle;scenery.add(home);
  const wall=mesh(new THREE.BoxGeometry(h.width,h.height,h.depth),[0xd7cbb6,0xe2ded0,0xb8bcb6][i%3],home);wall.position.y=h.height/2;
  const roof=mesh(new THREE.ConeGeometry(1,3,4),roofColors[i%4],home);roof.scale.set(h.width/Math.SQRT2+1,1,h.depth/Math.SQRT2+1);roof.rotation.y=Math.PI/4;roof.position.y=h.height+1.5;
 });
 const ring=[];for(let i=0;i<=256;i++){const a=i/256*Math.PI*2,x=Math.cos(a)*(R-10),z=Math.sin(a)*(R-10);ring.push(new THREE.Vector3(x,ground(x,z)+1,z));}scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ring),new THREE.LineBasicMaterial({color:0xc4d9be,transparent:true,opacity:.55})));
 const marker=mesh(new THREE.CylinderGeometry(1,1,24,8),0xffdc9a);marker.position.set(0,ground(0,0)+12,0);label('Supplied center',0,ground(0,0)+35,0);label('N',0,ground(0,-R+30)+30,-R+30);
 $('baseline').value=(Math.min(...data.heights.filter((_,i)=>Math.hypot(positions[i*3],positions[i*3+2])<=R))*FEET_PER_METER).toFixed(1);$('baseline').disabled=false;$('rise').disabled=false;
 $('location-detail').textContent=`Center: ${data.center.map(v=>v.toFixed(6)).join(', ')} · One-mile radius · ~20 m terrain grid · 3D models within 0.33 miles only · No generated trees. Vertical datum unverified.`;
 new ResizeObserver(()=>{const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();render();}).observe(canvas);
 setView(true);updateWater();
}catch(error){$('status').textContent='The 3D scene could not load. WebGL2 and a local web server are required. Reload to retry.';console.error(error);}}
['rise','baseline'].forEach(id=>$(id).addEventListener('input',updateWater));
['rotation','tilt'].forEach(id=>$(id).addEventListener('input',()=>setView(true)));
$('reset-view').addEventListener('click',()=>{$('rotation').value=-25;$('tilt').value=40;setView(true);});
$('neighborhood-view').addEventListener('click',()=>setView(true));$('overview').addEventListener('click',()=>setView(false));
$('scenery').addEventListener('change',()=>{if(scenery){scenery.visible=$('scenery').checked;render();}});
canvas.addEventListener('keydown',e=>{if(!orbit)return;const offset=camera.position.clone().sub(orbit.target);if(e.key==='+'||e.key==='=')offset.multiplyScalar(.85);else if(e.key==='-')offset.multiplyScalar(1.15);else if(e.key==='ArrowLeft'||e.key==='ArrowRight')offset.applyAxisAngle(new THREE.Vector3(0,1,0),e.key==='ArrowLeft'?-.1:.1);else return;e.preventDefault();offset.clampLength(100,6400);camera.position.copy(orbit.target).add(offset);orbit.update();render();});
init();
