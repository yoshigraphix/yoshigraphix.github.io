// Cloudstep in 3D: the mountain's own fine mesh (the streamed ground sinks out of sight under it), its water, the
// trail furniture, the summit lookout and a ring of clouds round its shoulders. Every shape and height comes from
// world-cloudstep.mjs, so what you see is exactly what you ride on.
import {CLOUDSTEP as C,cloudstepAt,trailPoint,trailRadius,trailHeight,TRAIL_END,FALLS,STREAM} from './world-cloudstep.mjs?v=161';
import {terrainHeight,POND} from './world-content.mjs?v=161';

const TAU=Math.PI*2;
// The mountain is a landmark from the whole valley, so fog only reaches it at a fraction of the real distance.
function distant(T,m,k=.55){m.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <fog_fragment>',T.ShaderChunk.fog_fragment.replaceAll('vFogDepth','(vFogDepth*'+k.toFixed(2)+')'));};m.customProgramCacheKey=()=>'distant'+k;return m;}
function lcg(seed){let s=seed>>>0;return ()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);}

export function buildCloudstep({T,outdoors,label,simple=false,ground=null}){
  const group=new T.Group();outdoors.add(group);const owned=[],own=o=>(owned.push(o),o),rand=lcg(7177);
  const color=new T.Color(),tmp=new T.Color();
  const lift=(x,z)=>terrainHeight(x,z);

  // ---- The mountain: a polar grid from the summit out to the foot ring, coloured by what each spot is ----
  const A=simple?120:360,R=simple?50:145,cols=A+1,rows=R+1;
  const pos=new Float32Array(cols*rows*3),rgb=new Float32Array(cols*rows*3);
  // Outer edge of the polar grid. The spiral trail's radius jumps a whole turn where the grid wraps round (t = 0 vs
  // t = 2π: ~71 m vs 64 m), which left a wedge-shaped opening in the mountain where it twists round (Yoshi
  // 2026-11-16). Ease the last stretch out to meet the first column so the two edges of the wrap are the same.
  const footRaw=t=>Math.min(trailRadius(t-TAU),C.R0-C.W),seamGap=footRaw(1e-4)-footRaw(TAU-1e-4);
  const footR=t=>{const u=Math.min(1,Math.max(0,(t-(TAU-.5))/.5));return footRaw(t)+seamGap*u*u*(3-2*u);};
  const paint=(x,z,h,s)=>{
    const n=Math.sin(x*1.7+z*.9)*.5+Math.sin(x*.37-z*.61)*.5;// -1 … 1, gentle mottling
    switch(s.region){
      case 'ledge':case 'foot':{const off=Math.abs(s.r-trailRadius(s.t+TAU*Math.max(0,s.k)));// worn centre, grassy or snowy edges
        const high=h>80;color.set(high?'#e7ddca':'#cdb486');if(off>C.W*.62)color.lerp(tmp.set(high?'#f4f6f8':h>40?'#9aa58a':'#86a868'),.75);
        if(s.region==='foot')color.set('#86a868');break;}
      case 'summit':{color.set('#8fb26a');const d=Math.hypot(x-C.rock.x,z-C.rock.z);if(d<3.6)color.lerp(tmp.set('#9a958c'),Math.min(1,(3.6-d)/1.4));break;}
      case 'pool':color.set('#5d7f78');break;
      case 'alcove':color.set('#6c6f6a').lerp(tmp.set('#4f6b5e'),.35);break;
      default:{// rock: warm strata by height, green low down, snow on the heights
        const band=Math.sin(h*.85+n*1.6)*.5+.5;color.set('#8f8a80').lerp(tmp.set('#b0a796'),band*.6);
        if(h<16)color.lerp(tmp.set('#78965c'),Math.min(1,(16-h)/9)*.85);
        if(h>74)color.lerp(tmp.set('#f3f5f7'),Math.min(1,(h-74)/9)*(.55+.45*band));}
    }
    color.offsetHSL(0,0,n*.03);return color;};
  for(let j=0;j<cols;j++){const t=Math.min(TAU-1e-4,Math.max(1e-4,j/A*TAU)),a=C.theta0+t,ca=Math.cos(a),sa=Math.sin(a),out=footR(t);
    for(let i=0;i<rows;i++){const r=out*i/R,x=C.cx+ca*r,z=C.cz+sa*r,s=cloudstepAt(x,z)||{region:'foot',r,t,k:-1},h=lift(x,z),o=(j*rows+i)*3;
      pos[o]=x;pos[o+1]=h;pos[o+2]=z;const c=paint(x,z,h,s);rgb[o]=c.r;rgb[o+1]=c.g;rgb[o+2]=c.b;}}
  const index=[];for(let j=0;j<A;j++)for(let i=0;i<R;i++){const a=j*rows+i,b=(j+1)*rows+i;index.push(a,b,a+1,b,b+1,a+1);}
  const mountainGeometry=own(new T.BufferGeometry());mountainGeometry.setAttribute('position',new T.BufferAttribute(pos,3));mountainGeometry.setAttribute('color',new T.BufferAttribute(rgb,3));
  mountainGeometry.setIndex(index);mountainGeometry.computeVertexNormals();
  const rockMaterial=own(distant(T,new T.MeshStandardMaterial({vertexColors:true,roughness:.96,metalness:0,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})));
  // v149: the same real-ground shader as the land round it (world-terrain.js addTerrain), passed in by world.js.
  if(ground){const b=rockMaterial.onBeforeCompile;rockMaterial.onBeforeCompile=sh=>{b(sh);ground(sh);};rockMaterial.customProgramCacheKey=()=>'distant-ter';}
  const mountain=new T.Mesh(mountainGeometry,rockMaterial);mountain.receiveShadow=true;mountain.castShadow=!simple;group.add(mountain);

  // ---- Water: one streaky texture, scrolled at different speeds for stream, falls and pools ----
  const cv=document.createElement('canvas');cv.width=64;cv.height=128;{const g=cv.getContext('2d');g.fillStyle='#86c9d6';g.fillRect(0,0,64,128);
    for(let i=0;i<90;i++){g.fillStyle=`rgba(255,255,255,${(.12+rand()*.5).toFixed(2)})`;g.fillRect(rand()*64,rand()*128,1+rand()*2.5,5+rand()*20);}}
  const baseTexture=own(new T.CanvasTexture(cv));baseTexture.colorSpace=T.SRGBColorSpace;baseTexture.wrapS=baseTexture.wrapT=T.RepeatWrapping;
  const flows=[];
  function waterMaterial(speed,{opacity=.9,tint='#ffffff',repeat=[1,1],side=T.FrontSide}={}){const map=own(baseTexture.clone());map.needsUpdate=true;map.repeat.set(...repeat);
    const m=own(distant(T,new T.MeshLambertMaterial({map,color:tint,transparent:true,opacity,depthWrite:false,side,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4})));flows.push({map,speed});return m;}
  // A strip laid over the ground along a list of points; v runs along it (in metres / 4).
  function ribbon(points,width,raise,material,widthAt=()=>1){const v=[],uv=[],ix=[];let run=0;
    points.forEach((p,i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1,nx=-dz/l,nz=dx/l,w=width*widthAt(i/(points.length-1))/2;
      if(i)run+=Math.hypot(p.x-points[i-1].x,p.z-points[i-1].z);
      for(const side of [-1,1]){const x=p.x+nx*w*side,z=p.z+nz*w*side;v.push(x,Math.max(lift(x,z),p.y??-1e9)+raise,z);uv.push(side<0?0:1,run/4);}
      if(i){const k=(i-1)*2;ix.push(k,k+1,k+2,k+1,k+3,k+2);}});
    const g=own(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();
    const m=new T.Mesh(g,material);m.renderOrder=2;group.add(m);return m;}
  const streamMaterial=waterMaterial(-.55,{opacity:.88,side:T.DoubleSide});
  ribbon(STREAM.upper,1.3,.22,streamMaterial);
  ribbon(STREAM.lower,1.6,.16,streamMaterial,u=>1+u*.6);

  // The waterfall: leaves the lip level and curves down (x ∝ √drop) into the pool, widening as it falls.
  const out=FALLS.out,tx=-out.z,tz=out.x,reach=FALLS.land-FALLS.lip;
  function sheet(material,widen,shift){const v=[],uv=[],ix=[],n=simple?14:30;
    for(let k=0;k<=n;k++){const u=k/n,h=reach*Math.sqrt(u)+shift,y=FALLS.top.y+.08-(FALLS.top.y-FALLS.bottom.y)*u,cx=FALLS.top.x+out.x*h,cz=FALLS.top.z+out.z*h,w=(1.25+widen*u);
      for(const side of [-1,1])v.push(cx+tx*w*side,y,cz+tz*w*side),uv.push(side<0?0:1,u*FALLS.drop/5);
      if(k){const a=(k-1)*2;ix.push(a,a+1,a+2,a+1,a+3,a+2);}}
    const g=own(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();
    const m=new T.Mesh(g,material);m.renderOrder=3;group.add(m);return m;}
  sheet(waterMaterial(-1.6,{opacity:.85,tint:'#f4fbff',side:T.DoubleSide,repeat:[1.6,1]}),.9,0);
  if(!simple)sheet(waterMaterial(-2.3,{opacity:.45,tint:'#ffffff',side:T.DoubleSide,repeat:[2.4,1.3]}),1.3,.35);
  // Pools: the basin halfway up and the pond on the plain.
  const pool=C.pool,disc=own(new T.CircleGeometry(1,40));
  const poolWater=new T.Mesh(disc,waterMaterial(-.05,{opacity:.92,tint:'#9fd3dc',repeat:[2,2]}));poolWater.rotation.x=-Math.PI/2;poolWater.scale.setScalar(pool.r);poolWater.position.set(pool.x,pool.y-.25,pool.z);poolWater.renderOrder=2;group.add(poolWater);
  const pondWater=new T.Mesh(disc,waterMaterial(-.04,{opacity:.92,tint:'#9fd3dc',repeat:[2.5,2.5]}));pondWater.rotation.x=-Math.PI/2;pondWater.scale.setScalar(POND.r+.6);pondWater.position.set(POND.x,POND.y,POND.z);pondWater.renderOrder=2;group.add(pondWater);
  // Foam and drifting spray where the falls land.
  const whiteMaterial=own(distant(T,new T.MeshLambertMaterial({color:'#ffffff',transparent:true,opacity:.7,depthWrite:false})));
  const foam=new T.Mesh(disc,whiteMaterial);foam.rotation.x=-Math.PI/2;foam.position.set(FALLS.bottom.x,pool.y-.18,FALLS.bottom.z);foam.scale.setScalar(2.3);foam.renderOrder=4;group.add(foam);
  const puff=own(new T.IcosahedronGeometry(1,1)),mistMaterial=own(distant(T,new T.MeshLambertMaterial({color:'#ffffff',transparent:true,opacity:.28,depthWrite:false})));
  const mist=[];for(let i=0;i<(simple?3:7);i++){const m=new T.Mesh(puff,mistMaterial);m.userData={a:i*2.4,r:.8+rand()*1.6,s:1+rand()*1.3};m.renderOrder=5;group.add(m);mist.push(m);}

  // ---- Rocks, pines and stepping stones (instanced) ----
  const stoneGeometry=own(new T.DodecahedronGeometry(1,0)),stoneMaterial=own(distant(T,new T.MeshStandardMaterial({color:'#ffffff',roughness:.95,flatShading:true})));
  // (The no-WebGL fallback renderer can't draw instances, so it goes without the rocks and pines.)
  function instanced(geometry,material,list,{shadow=false}={}){if(!list.length||simple)return null;const mesh=new T.InstancedMesh(geometry,material,list.length),m=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler();
    list.forEach((o,i)=>{e.set(o.rx||0,o.ry||0,o.rz||0);q.setFromEuler(e);m.compose(new T.Vector3(o.x,o.y,o.z),q,new T.Vector3(...o.s));mesh.setMatrixAt(i,m);mesh.setColorAt(i,color.set(o.c));});
    mesh.castShadow=shadow;mesh.receiveShadow=true;group.add(mesh);return mesh;}
  const nearWater=(x,z)=>{const dx=x-C.cx,dz=z-C.cz,along=dx*out.x+dz*out.z,side=Math.abs(dx*tx+dz*tz);return along>0&&side<3.2;};
  const stones=[];
  // Boulders line the outer edge of every lap (a low guard rail you can see from far off) and dot the cliff foot.
  for(let phi=.6;phi<TRAIL_END-.25;){const r=trailRadius(phi),y=trailHeight(phi),a=C.theta0+phi;
    for(const [edge,keep] of [[C.W-.35,1],[-C.W+.45,.35]]){if(rand()>keep)continue;const rr=r+edge,x=C.cx+Math.cos(a)*rr,z=C.cz+Math.sin(a)*rr;if(nearWater(x,z))continue;
      const s=.32+rand()*.5;stones.push({x,y:y+s*.35,z,s:[s*1.2,s*.8,s],ry:rand()*3,c:['#9b958a','#a9a397','#8c877e'][(rand()*3)|0]});}
    phi+=(simple?7:4.2)/r;}
  // Stepping stones where the trail fords the stream (twice).
  for(const phi of [pool.phi,pool.phi+TAU]){const r=trailRadius(phi),y=trailHeight(phi);
    for(const dr of [-1.9,-.6,.7,2])for(const dt of [-.75,.75]){const x=C.cx+out.x*(r+dr)+tx*dt*(Math.abs(dr)<1?.6:1),z=C.cz+out.z*(r+dr)+tz*dt*(Math.abs(dr)<1?.6:1);stones.push({x,y:y+.1,z,s:[.55,.14,.45],ry:rand()*3,c:'#b9b3a6'});}}
  // The pond's rim.
  for(let i=0;i<9;i++){const a=i/9*TAU+rand()*.3,r=POND.r+.9+rand()*.6,x=POND.x+Math.cos(a)*r,z=POND.z+Math.sin(a)*r,s=.4+rand()*.5;stones.push({x,y:lift(x,z)+s*.2,z,s:[s*1.3,s*.7,s],ry:rand()*3,c:'#a5a093'});}
  // The lookout: a broad flat slab on the summit's rock mound, and a little cairn.
  {const y=lift(C.rock.x,C.rock.z);stones.push({x:C.rock.x,y:y-.15,z:C.rock.z,s:[2.1,.5,1.7],ry:C.view,c:'#a8a294'});
    const cx=C.cx-Math.cos(C.view)*1.5+Math.sin(C.view)*4.4,cz=C.cz-Math.sin(C.view)*1.5-Math.cos(C.view)*4.4,cy=lift(cx,cz);
    [[.75,.32],[.6,.82],[.46,1.25],[.3,1.6]].forEach(([s,h],i)=>stones.push({x:cx,y:cy+h*.9,z:cz,s:[s,s*.55,s*.9],ry:i,c:i%2?'#b5ae9f':'#9f998d'}));}
  instanced(stoneGeometry,stoneMaterial,stones,{shadow:!simple});
  // Pines on the lower slopes, thinning out as the mountain climbs.
  const pines=[];for(let tries=0,want=simple?55:150;tries<want*8&&pines.length<want;tries++){const t=rand()*TAU,a=C.theta0+t,r=24+rand()*(C.R0-24),x=C.cx+Math.cos(a)*r,z=C.cz+Math.sin(a)*r,s=cloudstepAt(x,z);
    if(!s||s.region!=='skirt'&&s.region!=='cliff')continue;const h=lift(x,z);if(h>38||rand()<h/45||nearWater(x,z))continue;const k=.8+rand()*.7;pines.push({x,y:h+k*1.55,z,s:[k*1.15,k*3.3,k*1.15],ry:rand()*3,c:['#4e7a4f','#5b8756','#456f49'][(rand()*3)|0]});}
  instanced(own(new T.ConeGeometry(1,1,7)),own(distant(T,new T.MeshStandardMaterial({color:'#ffffff',roughness:1,flatShading:true}))),pines,{shadow:!simple});

  // ---- The trailhead arch, lap markers and the summit flag ----
  const wood=own(distant(T,new T.MeshStandardMaterial({color:'#8a6a4a',roughness:.9}))),cloth=own(distant(T,new T.MeshStandardMaterial({color:'#c96f52',roughness:.8,side:T.DoubleSide}))),post=own(new T.BoxGeometry(1,1,1));
  const block=(parent,m,x,y,z,sx,sy,sz)=>{const b=new T.Mesh(post,m);b.position.set(x,y,z);b.scale.set(sx,sy,sz);b.castShadow=!simple;parent.add(b);return b;};
  const ARCH=.35;{const p=trailPoint(ARCH),a=C.theta0+ARCH,arch=new T.Group();arch.position.set(p.x,p.y,p.z);arch.rotation.y=Math.atan2(-Math.sin(a),Math.cos(a));
    for(const side of [-1,1]){block(arch,stoneMaterial,side*(C.W+.35),2.1,0,.7,4.2,.7);block(arch,wood,side*(C.W+.35),4.35,0,.95,.3,.95);}
    block(arch,wood,0,4.6,0,C.W*2+1.8,.42,.5);block(arch,cloth,0,3.95,.02,C.W*1.25,.75,.06);group.add(arch);
    const sign=label('CLOUDSTEP CLIMB',p.x,p.y+6,p.z,5.2);group.add(sign);}
  for(const lap of [1,2]){const phi=lap*TAU+.15,p=trailPoint(phi),a=C.theta0+phi,r=trailRadius(phi)-C.W+.5,x=C.cx+Math.cos(a)*r,z=C.cz+Math.sin(a)*r;
    block(group,wood,x,p.y+.8,z,.22,1.6,.22);group.add(label('LAP '+(lap+1)+' OF 3 · '+Math.round(p.y)+' M',x,p.y+2.3,z,3.4));}
  let summitFlag;{const side=C.view+Math.PI/2,fx=C.cx+Math.cos(side)*4.6,fz=C.cz+Math.sin(side)*4.6,fy=lift(fx,fz);block(group,wood,fx,fy+3,fz,.16,6,.16);
    const flag=block(group,cloth,fx,fy+5.4,fz,0,0,0);flag.scale.set(1.8,1.05,.04);flag.position.set(fx+Math.cos(C.view+Math.PI/2)*.9,fy+5.4,fz+Math.sin(C.view+Math.PI/2)*.9);flag.rotation.y=Math.atan2(-Math.sin(C.view+Math.PI/2),Math.cos(C.view+Math.PI/2));summitFlag=flag;group.add(label('CLOUDSTEP SUMMIT · 100 M',fx,fy+7.2,fz,4.2));}

  // ---- Clouds round the mountain's shoulders (below the summit, so the top stands above them). They drift to and
  // fro but never into the lookout's line of sight to the stable. ----
  const cloudMaterial=own(new T.MeshLambertMaterial({color:'#ffffff',transparent:true,opacity:.94,fog:false,depthWrite:true}));
  const ring=new T.Group();ring.position.set(C.cx,0,C.cz);group.add(ring);const clouds=[];
  for(let i=0,n=simple?12:28;i<n;i++){const g=new T.Group(),parts=simple?3:4+(i%3);
    for(let j=0;j<parts;j++){const m=new T.Mesh(puff,cloudMaterial);m.position.set((j-parts/2)*4.6+rand()*1.5,Math.sin(j*1.9)*1.1,(rand()-.5)*4);m.scale.set(4.2+rand()*2.4,2.2+rand()*1.3,3.6+rand()*1.6);g.add(m);}
    let a=i/n*TAU+rand()*.4,r=56+rand()*100,y=56+rand()*20;const off=Math.atan2(Math.sin(a-C.view),Math.cos(a-C.view));if(Math.abs(off)<.42)a=C.view+Math.sign(off||1)*(.42+rand()*.2);while(r<160&&terrainHeight(C.cx+Math.cos(a)*r,C.cz+Math.sin(a)*r)>y-8)r+=6;
    g.position.set(Math.cos(a)*r,y,Math.sin(a)*r);g.rotation.y=-a;g.userData={y,a,r,phase:rand()*TAU};ring.add(g);clouds.push(g);}

  const obstacles=[{kind:'lake',x:POND.x,z:POND.z,rx:POND.r+.4,rz:POND.r+.4,height:100}];
  let last=0;
  function tick(time){const dt=last?Math.min(.1,(time-last)/1000):0;last=time;
    for(const f of flows)f.map.offset.y=(f.map.offset.y+f.speed*dt)%1;
    const pulse=Math.sin(time*.004);foam.scale.setScalar(2.2+pulse*.2);whiteMaterial.opacity=.6+pulse*.1;
    for(const m of mist){const u=m.userData,k=((time*.00035+u.a)%1);m.position.set(FALLS.bottom.x+Math.cos(u.a+time*.0004)*u.r,pool.y+.4+k*3.2,FALLS.bottom.z+Math.sin(u.a+time*.0004)*u.r);m.scale.setScalar(u.s*(.6+k));}
    summitFlag.rotation.z=Math.sin(time*.003)*.06;
    for(const c of clouds){const u=c.userData,a=u.a+Math.sin(time*.00004+u.phase)*.12;c.position.set(Math.cos(a)*u.r,u.y+Math.sin(time*.0002+u.phase)*1.2,Math.sin(a)*u.r);}}
  return {group,mesh:mountain,obstacles,tick,dispose(){outdoors.remove(group);owned.forEach(o=>o.dispose?.());}};
}
