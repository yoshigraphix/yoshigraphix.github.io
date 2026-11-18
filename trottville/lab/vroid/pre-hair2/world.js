import {makeChibiCharacter} from './chibi-character.js';
import {loadLook,saveLook,lookFromSeed} from './character-looks.mjs';
import {queueCoins,showCollect,paintCounters} from './coin-collect.js';
import {openDesigner} from './character-designer.js';
import {watchReturn} from './star-shop.js';
import {log as playLog} from './play-log.js';
import {makeSculptedHorse} from './horse-sculpt.js';
import {addTackAndRider} from './rider-sculpt.js';
import {buildExpansion} from './world-expansion.js';
import {SQUARE} from './world-regions.mjs';
import {buildTown,doorNear,SHOP_PARTS,FOUNTAIN,PLAZA_R,buildActivities,ACTIVITIES,ACTIVITY_BY_ID,HOSTS,LOOKOUTS,FISHING,PUMPKINS,lakeStone,STONES,startRun,stepRun,runStatus,runAbandoned,pickFish,inSnow,ARENA,ARENA_POST,ARENA_STEWARD,ARENA_CLASSES,arenaCourse,arenaRivals,startRound,stepRound,roundStatus,inArena,PRACTICE,crossed,judgeJump,PLACE_NAME,ROSETTE} from './world-town.mjs';
// The walk-in shops on the map (they open from the village square; the vet is its own place by the home trail).
// The step 3 activities on the map; fast travel takes you to the nearest named place.
const nearestLoc=(x,z)=>LOCATIONS.reduce((b,l)=>Math.hypot(l.x-x,l.z-z)<Math.hypot(b.x-x,b.z-z)?l:b).id;
const ACT_PINS=[{id:'act-arena',name:'Clover Downs Show Ring',x:ARENA.x,z:ARENA.z,kind:'activity',icon:'🎀',go:nearestLoc(ARENA_POST.x,ARENA_POST.z),seen:true,description:'Show jumping, open to all: ride in on your horse and jump the numbered fences in order for a rosette. Practice fences beside the ring.'},...ACTIVITIES.map(a=>{const p=a.host?HOSTS.find(h=>h.id===a.host):a.start;return {id:'act-'+a.id,name:a.name,x:p.x,z:p.z,kind:'activity',icon:a.icon,go:nearestLoc(p.x,p.z),seen:true,description:a.how+(a.night?' (after dark)':'')};}),
  {id:'act-stones',name:'Lily Lake stepping-stones',x:STONES[0].x,z:STONES[0].z,kind:'activity',icon:'🪨',go:'pond',seen:true,description:'Hop across the lake on foot, stone to stone.'},
  {id:'act-fish',name:'Fishing dock',x:FISHING.x,z:FISHING.z,kind:'activity',icon:'🎣',go:'pond',seen:true,description:'Cast off the end of the dock and tap when the float dips.'},
  {id:'act-tree',name:'Treehouse camp',x:LOOKOUTS[0].x,z:LOOKOUTS[0].z,kind:'activity',icon:'🌳',go:'forest',seen:true,description:'Climb the ladder for a view over Mosswood.'}];
const SHOP_PINS=SHOP_PARTS.map(({shop:s})=>({id:'shop-'+s.id,name:s.name,x:s.x,z:s.z,kind:'village',icon:{bakery:'🥐',post:'✉️',hall:'🏛️',store:'🛒',vet:'🩺'}[s.kind],go:s.id==='vet'?'home':'village',seen:true,description:'Walk in on foot; your horse waits at the rail outside.'}));
import {createAdventureUI} from './adventure-ui.js';
import {buildStations} from './world-stations.js';
import {BOARD_GAMES} from './board-games.mjs';
import {VALLEY_GAMES} from './valley-games.mjs';
import {createWorldQuests} from './world-quests.js';
import {R,REGIONS,regionAt} from './world-regions.mjs';
import {createHud} from './world-hud.js';
import {cornLayout,CORN,inMaze} from './world-cornmaze.mjs';
import {createCornMaze} from './world-cornmaze-3d.js';
import {createWorldMap} from './world-map.js';
import {todayActivities,loadDone,markDone} from './world-today.mjs';
import {createWorldNetwork,roomError} from './world-network.js';
import {openFriends,openProfile,openInvite} from './friends.js';
import {testOn,TEST_ME} from './test-friends.js';
import {sfx} from './sfx.js';
import {want as wantMusic} from './music.js';
import * as G from './riding.mjs';
import * as RanchUI from './ranch-ui.js';
import {condition,level as horseLevel} from './ranch.mjs';
import {entryNeeds} from './show-course.mjs';
import {loadWallet,saveWallet,buyOutfit,OUTFITS,outfitOf,buyGear,GEAR_ITEMS} from './character-looks.mjs';
import {BAYS,inStore,DOOR,COUNTER,KEEPER,STORE,HALL_X} from './barn-interior.js';
import {SHOPKEEPER,greeting as shopGreeting,tip as shopTip,pitch as shopPitch,chatter as shopChatter,NO_HORSES} from './shop-talk.mjs';
import {RACES,raceName,racePhase,standings,ordinal,raceTime,steepleSeed} from './friends-logic.mjs';
import {LOCATIONS,MAP_PATHS,BARN_GAMES,INDOOR_GAMES,RACE_GATES,SERVICES,normalizeAdventure,questList} from './world-content.mjs';
import {CLOUDSTEP,cloudstepAt,onCloudstep,trailPhi,climbRoute,trailPoint,START as CLIMB_START} from './world-cloudstep.mjs';
import {buildCloudstep} from './world-cloudstep-3d.js';
import {buildSkiLift,VALLEY_STATION} from './world-skilift.js';
import {createValleyLife} from './world-life.js';
import {createLegends} from './world-legends.js';
import * as T from './vendor/three-0.180.0/three.module.js';
import {MARKERS,OBSTACLES,groundHeight,movementVector,moveActor,blocked,normalizeStamps,collectMarkers,followCameraPosition,tooSteep,slopeAt,solidBlocked} from './world-logic.mjs';
import {SoftwareRenderer} from './world-renderer.js';
import {findGroundPath,steeringStep} from './world-navigation.mjs';
import {createChunks} from './world-chunks.js';
import {createLanterns} from './world-lanterns.js';
import {BIOMES,biomeAt,wildness} from './world-wild.mjs';
import {createSky} from './world-sky.js';
import {buildStall} from './stall-scene.js';
import {loadStall} from './stall-decor.mjs';
const WEATHER_NEWS={clear:'The sky is clearing. Lovely riding weather.',partly:'The clouds are breaking up.',overcast:'Clouds are rolling in.',fog:'Fog is settling over the valley. Stay close to the paths.',rain:'Rain is rolling in. The trails are muddy, so you go a little slower.',storm:'A thunderstorm! Mud slows you down and the gusts push you about.',windy:'The wind is picking up. Gusts nudge you sideways.',snow:'Snow is falling. Deep snow slows you down a little.'};

export function createWorld(host,{horses,storageKey='guest',preferredHorse='willow',onBarnCare=()=>{},intent=null}){
  const $=s=>host.querySelector(s),view=$('#world-canvas');
  let renderer;
  try{renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}
  catch{renderer=new SoftwareRenderer();host.querySelector('.world-location small').textContent='SOLO PLAYTEST · SIMPLE GRAPHICS';}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.38;
  view.appendChild(renderer.domElement);
  const scene=new T.Scene();scene.background=new T.Color('#c8e6e5');scene.fog=new T.Fog('#c8e6e5',75,170);
  const camera=new T.PerspectiveCamera(58,1,.25,210),_hudA=new T.Vector3(),_hudB=new T.Vector3();
  const sun=new T.DirectionalLight('#fff0d0',3.1);sun.position.set(-18,36,20);sun.castShadow=true;
  Object.assign(sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45,near:1,far:110});sun.shadow.mapSize.set(1024,1024);sun.shadow.normalBias=.06;sun.shadow.bias=-.0004;
  const hemi=new T.HemisphereLight('#effbff','#91ac67',2.2);scene.add(sun,sun.target,hemi);
  const materials=new Map(),geometries=new Set(),textures=new Set(),listeners=[];
  // See-through view: anything standing between the camera and you (trees, buildings, props) fades to a soft
  // dither inside a narrow tube along the line of sight, so it never hides your character. Shadows are unaffected.
  const sightU={uSightA:{value:new T.Vector3()},uSightB:{value:new T.Vector3()},uSightR:{value:2.5}};
  // Snow cover: upward-facing surfaces outdoors (ground, paths, roofs, treetops) blend to snow by uSnow (0–1,
  // set each frame from the sky's snow cover; 0 inside the barn). Walls and steep faces stay their own colour.
  const snowU={uSnow:{value:0}};
  function addSnow(sh){sh.uniforms.uSnow=snowU.uSnow;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying float vSnowUp;varying vec2 vSnowXZ;').replace('#include <project_vertex>','#include <project_vertex>\nvSnowUp=inverseTransformDirection(transformedNormal,viewMatrix).y;\n#ifdef USE_INSTANCING\nvSnowXZ=(modelMatrix*instanceMatrix*vec4(transformed,1.0)).xz;\n#else\nvSnowXZ=(modelMatrix*vec4(transformed,1.0)).xz;\n#endif');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying float vSnowUp;varying vec2 vSnowXZ;uniform float uSnow;').replace('#include <color_fragment>',`#include <color_fragment>
      if(uSnow>0.){float n=fract(sin(dot(floor(vSnowXZ*1.4),vec2(12.9898,78.233)))*43758.5453);
        float k=uSnow*smoothstep(.3,.75,vSnowUp)*(.82+.18*n);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.93,.95,.99),k);}`);}
  function seeThrough(m){m.onBeforeCompile=sh=>{addSnow(sh);Object.assign(sh.uniforms,sightU);
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vSightW;').replace('#include <project_vertex>','#include <project_vertex>\n#ifdef USE_INSTANCING\nvSightW=(modelMatrix*instanceMatrix*vec4(transformed,1.0)).xyz;\n#else\nvSightW=(modelMatrix*vec4(transformed,1.0)).xyz;\n#endif');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vSightW;uniform vec3 uSightA;uniform vec3 uSightB;uniform float uSightR;').replace('void main() {',`void main() {
      {vec3 ab=uSightB-uSightA;float len=length(ab);vec3 dir=ab/max(len,1e-3);float t=dot(vSightW-uSightA,dir);
       if(t>.3&&t<len-1.3){float d=length(vSightW-(uSightA+dir*t));float k=1.-smoothstep(uSightR*.55,uSightR,d);k*=smoothstep(len-1.3,len-2.6,t);
        if(k>0.){vec2 p=mod(floor(gl_FragCoord.xy),4.);float b=mod(p.x*8.+p.y*4.+mod(p.x,2.)*2.+mod(p.y,2.)*1.,16.)/16.;if(b<k*.85)discard;}}}`);};
    m.customProgramCacheKey=()=>'sight';return m;}
  const mat=(color,extra={})=>{const key=color+JSON.stringify(extra);if(!materials.has(key))materials.set(key,seeThrough(new T.MeshStandardMaterial({color,roughness:1,flatShading:true,...extra})));return materials.get(key);};
  const geo=g=>(geometries.add(g),g);
  const boxGeometry=geo(new T.BoxGeometry(1,1,1)),icoGeometry=geo(new T.IcosahedronGeometry(1,0)),softGeometry=geo(new T.IcosahedronGeometry(1,1));
  const coneGeometry=geo(new T.ConeGeometry(1,1,7)),cylinderGeometry=geo(new T.CylinderGeometry(1,1,1,7));
  function mesh(parent,geometry,color,x,y,z,sx=1,sy=1,sz=1,shadow=false){const m=new T.Mesh(geometry,mat(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=shadow;m.receiveShadow=true;parent.add(m);return m;}
  const box=(p,c,x,y,z,sx,sy,sz,shadow=false)=>mesh(p,boxGeometry,c,x,y,z,sx,sy,sz,shadow);
  const ico=(p,c,x,y,z,sx,sy,sz,shadow=false)=>mesh(p,icoGeometry,c,x,y,z,sx,sy,sz,shadow);
  let randomSeed=814;
  function random(){randomSeed=(randomSeed*1664525+1013904223)>>>0;return randomSeed/4294967296;}
  // Floating names (UI pass 2026-11-10): no white box. Lettering in cream with a soft dark edge, a little translucent,
  // and they fade with distance: names (mixed case) only show near you, place signs (ALL CAPS / numbers) from further off.
  function label(text,x,y,z,width=6){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=112;const ctx=canvas.getContext('2d');const sign=!/[a-z]/.test(text);let size=sign?44:46;const font=()=>`${sign?800:700} ${size}px system-ui,sans-serif`;ctx.font=font();if(sign)ctx.letterSpacing='3px';while(ctx.measureText(text).width>470&&size>18){size--;ctx.font=font();}ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.shadowColor='rgba(20,30,18,.45)';ctx.shadowBlur=10;ctx.lineWidth=9;ctx.strokeStyle='rgba(38,50,34,.62)';ctx.strokeText(text,256,58);ctx.shadowBlur=0;ctx.fillStyle='#fffaf0';ctx.fillText(text,256,58);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;textures.add(texture);const material=new T.SpriteMaterial({map:texture,depthWrite:false,transparent:true,opacity:.92});materials.set('label'+textures.size,material);const sprite=new T.Sprite(material);sprite.position.set(x,y,z);const k=sign?.88:.78;sprite.scale.set(width*k,width*k*112/512,1);const near=sign?45:16,far=sign?85:30,at=new T.Vector3();sprite.onBeforeRender=(r,s,cam)=>{const d=cam.position.distanceTo(at.setFromMatrixPosition(sprite.matrixWorld));material.opacity=.92*Math.max(0,Math.min(1,(far-d)/(far-near)));};scene.add(sprite);return sprite;}
  function place(group,x,z){group.position.set(x,groundHeight(x,z),z);scene.add(group);return group;}
  // Dirt kicked up while sliding down a slope that's too steep: a small pool of puffs that rise, swell and fade.
  // Snow kicks up white powder, sand kicks up pale sand, everywhere else it's brown dirt.
  const DUST={snow:['#ffffff','#e6eef4'],desert:['#ecd5a0','#d9bd84']};
  const dust=(()=>{const geo=new T.IcosahedronGeometry(.22,0),pool=[];let next=0,acc=0;
    for(let i=0;i<28;i++){const m=new T.Mesh(geo,new T.MeshLambertMaterial({color:'#a98a62',transparent:true,opacity:0,depthWrite:false}));m.visible=false;scene.add(m);pool.push({m,t:0,vx:0,vy:0,vz:0});}
    return {emit(x,y,z,dt,k=1){acc+=dt*20*k;const tint=DUST[biomeAt(x,z)]||['#a98a62','#8a6e4b'];while(acc>=1){acc--;const p=pool[next++%pool.length],a=Math.random()*Math.PI*2,r=.3+Math.random()*.6;p.m.material.color.set(tint[next%2]);
        p.m.position.set(x+Math.cos(a)*r,y+.1,z+Math.sin(a)*r);p.vx=Math.cos(a)*(.6+Math.random());p.vz=Math.sin(a)*(.6+Math.random());p.vy=.5+Math.random()*.7;p.t=.9;p.m.visible=true;}},
      update(dt){for(const p of pool){if(p.t<=0)continue;p.t-=dt;const u=1-Math.max(0,p.t)/.9;p.m.position.x+=p.vx*dt;p.m.position.y+=p.vy*dt;p.m.position.z+=p.vz*dt;p.vy-=1.6*dt;
        p.m.scale.setScalar(.6+u*1.2);p.m.material.opacity=.6*(1-u);if(p.t<=0)p.m.visible=false;}}};})();
  let slide=null,steepToldAt=0,chair=null,chairY=0;

  // Faceted ground, streamed in chunks around the player: the valley, then endless wild lands (world-chunks.js).
  const groundMaterial=new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:1});groundMaterial.onBeforeCompile=addSnow;groundMaterial.customProgramCacheKey=()=>'snow-ground';materials.set('grass',groundMaterial);
  const propMaterial=seeThrough(groundMaterial.clone());materials.set('wild-props',propMaterial);const chunks=createChunks({T,scene,simple:!!renderer.simpleGraphics,material:groundMaterial,propMaterial});chunks.update(0,9.7,true);const lawn=chunks.ground;
  function path(points,width=2.8){const curve=new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,0,z)));const vertices=[],indices=[];const samples=150;
    for(let i=0;i<=samples;i++){const p=curve.getPoint(i/samples),t=curve.getTangent(i/samples);for(const side of [-1,1]){const x=p.x+t.z*width*.5*side,z=p.z-t.x*width*.5*side;vertices.push(x,Math.max(groundHeight(x,z),chunks.surfaceHeight(x,z))+.06,z);}if(i<samples){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}}
    const g=geo(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();const m=new T.Mesh(g,mat('#e4d5ad',{side:T.DoubleSide}));m.receiveShadow=true;m.renderOrder=-9;scene.add(m);return m;
  }
  path(MAP_PATHS.loop,3.3);
  path(MAP_PATHS.yard,2.4);
  // (The toy mountains that framed the first paddock went when the world grew to nine regions: the real wild ranges are out past the edge now.)
  // Clouds, sun, moon and weather live in world-sky.js (created below, once the fences have placed the morning glories).

  function tree(x,z,type='green',size=1){const group=new T.Group();const trunk=box(group,'#9a7955',0,1.2,0,.5,2.4,.48);trunk.castShadow=true;const palette=type==='pink'?['#dca1a1','#e7b1ac','#efc1b1']:type==='gold'?['#d7b95e','#e0c473','#d2b562']:['#6c9c61','#82b46c','#94be76'];
    ico(group,palette[0],0,3.4,0,1.9,2.2,1.9);ico(group,palette[1],-.9,3,.5,1.45,1.7,1.5);ico(group,palette[2],1,3.3,.15,1.3,1.65,1.3);group.scale.setScalar(size);place(group,x,z);
    if(type==='apple'){for(let i=0;i<6;i++)ico(group,'#cc6c52',(random()-.5)*2,2.6+random()*1.4,(random()-.5)*2,.13,.13,.13);}
    return group;
  }
  const trees=[];
  for(let i=0;i<(renderer.simpleGraphics?55:95);i++){const x=(random()-.5)*113,z=(random()-.5)*105;if(Math.abs(x)<27&&z>-15&&z<27)continue;if(((x-22)/15)**2+((z+7)/12)**2<1)continue;if(Math.hypot(x+38,z-4)<21||Math.hypot(x+29,z)<6||Math.hypot(x+10,z-47)<7||Math.hypot(x-17,z+32)<8)continue;/* keep the paddock and game stations clear */if(MARKERS.some(m=>Math.hypot(x-m.x,z-m.z)<5))continue;{const p=R(x,z);if(Math.hypot(p.x-SQUARE.x,p.z-SQUARE.z)<42)continue;}trees.push([x,z]);}
  trees.forEach(([x,z],i)=>tree(x,z,i%9===0?'pink':i%7===0?'gold':'green',.8+random()*.45));
  [[-3,-23],[3,-31],[9,-30],[-3,-31],[-9,-25],[-9,-31]].forEach(([x,z])=>tree(x,z,'apple',.95));
  tree(-20,8,'pink',1.3);tree(8,18,'pink',1.1);tree(30,13,'gold',1.2);tree(14,-21,'pink',1.2);
  // Wildflower patches and small rocks supply detail without external assets.
  for(let i=0;i<(renderer.simpleGraphics?50:120);i++){const x=(random()-.5)*83,z=(random()-.5)*80;if(blocked(x,z,.5)||MARKERS.some(m=>Math.hypot(x-m.x,z-m.z)<3))continue;const color=['#e7cc86','#f5e8cd','#dab0ba'][i%3];ico(scene,color,x,groundHeight(x,z)+.17,z,.12,.18,.12);}
  [[-26,18,2],[33,-19,1.6],[12,-20,1.3],[-15,-22,2.3],[39,9,1.7]].forEach(([x,z,s])=>ico(scene,'#a9b2a0',x,groundHeight(x,z)+s*.35,z,s,s*.7,s*.85));

  // A starter wing, not a promise of a three-horse inventory cap.
  const barn=new T.Group();box(barn,'#bc765d',0,2.6,0,14,5.2,8,true);
  for(let i=0;i<15;i++)box(barn,i%2?'#bd775e':'#c98568',-6.7+i*.96,2.6,4.02,.12,5.15,.08);
  const roofGeo=geo(new T.BufferGeometry());roofGeo.setAttribute('position',new T.Float32BufferAttribute([-7.7,5,-4.6,7.7,5,-4.6,0,8,-4.6,-7.7,5,4.6,7.7,5,4.6,0,8,4.6],3));roofGeo.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,2,5,4,2,4,1,0,1,4,0,4,3]);roofGeo.computeVertexNormals();const roof=new T.Mesh(roofGeo,mat('#4e7d77'));roof.castShadow=true;barn.add(roof);
  [-4.5,0,4.5].forEach(x=>{box(barn,'#4a4f3b',x,1.7,4.09,2.7,3.4,.13);box(barn,'#e9d8af',x,3.5,4.2,3.1,.22,.2);[-1.5,1.5].forEach(s=>box(barn,'#e9d8af',x+s,1.7,4.2,.17,3.6,.2));box(barn,'#94704d',x,.85,4.28,2.65,1.7,.15);const brace=box(barn,'#d5b88a',x,.85,4.38,.11,3.05,.09);brace.rotation.z=-1.0;});
  box(barn,'#ecdfbe',0,5.9,4.63,3.7,.9,.1);place(barn,-13,-6);label('THE STABLES',-13,6.25,-1.25,5);
  const glorySpots=[];
  function fence(x1,z1,x2,z2){const length=Math.hypot(x2-x1,z2-z1),steps=Math.ceil(length/3);const group=new T.Group();
    // Morning glories climb the rails here and there (clusters, both sides).
    const along=Math.atan2(x2-x1,z2-z1);for(let d=.8;d<length-.5;d+=1.3){if(random()<.42)continue;const t=d/length,side=random()<.5?1:-1,x=x1+(x2-x1)*t+Math.cos(along)*.13*side,z=z1+(z2-z1)*t-Math.sin(along)*.13*side;glorySpots.push({x,z,y:groundHeight(x,z)+(random()<.5?.62:1.25)+(random()-.5)*.25,rot:along+Math.PI/2*side,tilt:1.15,size:.8+random()*.35});}
    for(let i=0;i<=steps;i++){const t=i/steps,x=x1+(x2-x1)*t,z=z1+(z2-z1)*t;box(group,'#f1dfb9',x,groundHeight(x,z)+.86,z,.24,1.72,.24,true);}
    const midx=(x1+x2)/2,midz=(z1+z2)/2;for(const y of [.62,1.25]){const rail=box(group,'#e8d4a9',midx,groundHeight(midx,midz)+y,midz,length,.15,.15);rail.rotation.y=-Math.atan2(z2-z1,x2-x1);}scene.add(group);
  }
  fence(-23,-10,-23,13);fence(-23,13,-3,13);fence(3,13,8,13);fence(8,13,8,-10);fence(-23,-10,8,-10);
  for(const [cx,cz] of [[-9,-1.5],[-17,-1.5],[12,-1],[13,-14],[31,-2],[-4,16]])for(let i=0;i<6;i++){const x=cx+(random()-.5)*2.4,z=cz+(random()-.5)*2.4;glorySpots.push({x,z,y:groundHeight(x,z)+.22+random()*.3,ground:groundHeight(x,z),rot:random()*6.3,tilt:.55,size:.8+random()*.3});}
  // Nine regions: the base scenery here is drawn at its design spot and moved to its block afterwards (see `outdoors` below);
  // the morning glories are placed by the sky, so their spots move now.
  for(const g of glorySpots){const p=R(g.x,g.z),dy=groundHeight(p.x,p.z)-groundHeight(g.x,g.z);g.x=p.x;g.z=p.z;g.y+=dy;if(g.ground!=null)g.ground+=dy;}
  const skyBefore=new Set(scene.children);
  const sky=createSky({T,scene,camera,sun,hemi,simple:!!renderer.simpleGraphics,glorySpots});const skyKids=new Set(scene.children.filter(c=>!skyBefore.has(c)));
  const trough=new T.Group();box(trough,'#a48560',0,.45,0,2.7,.9,1.2);box(trough,'#82b9b2',0,.94,0,2.4,.035,.9);place(trough,-19,7);
  const hay=new T.Group();box(hay,'#d1b96b',0,.55,0,1.6,1.1,1.1);box(hay,'#b39b58',-.48,.55,0,.09,1.13,1.13);box(hay,'#b39b58',.48,.55,0,.09,1.13,1.13);place(hay,-20,1);
  // A shallow pond with lily pads, a dock and a small footbridge on the bank.
  const lake=new T.Mesh(geo(new T.CircleGeometry(1,48)),mat('#6caeaa',{roughness:.4,metalness:.08}));lake.rotation.x=-Math.PI/2;lake.renderOrder=-8;lake.position.set(22,.15,-7);lake.scale.set(11.3,8.1,1);scene.add(lake);
  const pondBank=new T.Mesh(geo(new T.RingGeometry(.97,1.09,48)),mat('#c4c48f',{side:T.DoubleSide}));pondBank.rotation.x=-Math.PI/2;pondBank.scale.set(11.4,8.2,1);pondBank.renderOrder=-8;pondBank.position.set(22,.14,-7);scene.add(pondBank);
  for(let i=0;i<13;i++){const x=18+random()*8,z=-11+random()*7;const pad=new T.Mesh(geo(new T.CircleGeometry(.2+random()*.3,7)),mat('#89b577'));pad.rotation.x=-Math.PI/2;pad.position.set(x,.18,z);scene.add(pad);if(i%3===0)ico(scene,'#ebc3c2',x,.28,z,.15,.12,.15);}
  const dock=new T.Group();for(let i=0;i<8;i++)box(dock,'#c3a378',0,.25,-i*.55,2.6,.18,.48);for(const x of [-1.15,1.15])for(const z of [0,-3.8])box(dock,'#937858',x,0,z,.18,1.5,.18);place(dock,22,2);
  label('LILY LAKE',31,3,-5,5.5);label('APPLE ORCHARD',1,4,-31,6.7);label('SUNSET RIDGE',28,4,-26,6.5);
  const log=new T.Group();const beam=mesh(log,cylinderGeometry,'#9b7958',0,.45,0,.45,5.6,.45,true);beam.rotation.z=Math.PI/2;place(log,13,7);label('A LITTLE JUMP',13,2.7,7,5.2);

  const modelKit={geometry:geo,material:mat,detail:renderer.simpleGraphics?0:1};
  // Same sculpted horse, tack and jockey as the steeplechase. The jockey only shows while you ride; on foot you are the chibi avatar.
  let look=loadLook();
  function makeHorse(h,index){const model=makeSculptedHorse(T,h,{geometry:geo}),tack=addTackAndRider(T,model,tackLook(h));tack.rider.visible=false;tack.saddleGroup.visible=!!G.tackOf(h).saddle;const starts=[[-4,5],[3,4],[-3,9]],start=starts[index%3];place(model.root,start[0],start[1]);model.root.rotation.y=[.7,-.6,1.1][index%3];const name=label(h.name,start[0],4.5*model.scale,start[1],2.5);return {...model,model,tack,data:h,name,area:'outdoor'};}
  const companions=horses.map(makeHorse);
  // You on foot: the same chibi character as the jockey. root stays put when the look changes; only the figure inside is swapped.
  function figure(l){const c=makeChibiCharacter(T,l);c.root.traverse(o=>{if(o.isMesh)o.castShadow=true;});return c;}
  function makeAvatar(){const root=new T.Group(),me={root,char:figure(look),update(dt,o){me.char.update(dt,o);},setLook(l){me.char.dispose();me.char=figure(l);root.add(me.char.root);}};root.add(me.char.root);place(root,0,9.7);return me;}
  function applyLook(l){look=l;avatar.setLook(l);companions.forEach(dress);}
  // Saddle and bridle colours from riding.mjs: plain tan for the free tack, the chosen colour once upgraded; no saddle until it's on.
  function tackLook(data){const t=G.tackOf(data);return {look,saddle:G.tackColor(t.saddle),bridle:G.tackColor(t.bridle)};}
  function dress(h){const shown=h.tack.rider.visible;h.tack.dispose?.();h.tack.rider.parent?.remove(h.tack.rider);h.tack=addTackAndRider(T,h.model,tackLook(h.data));h.tack.rider.visible=shown;h.tack.saddleGroup.visible=!!G.tackOf(h.data).saddle;}
  const avatar=makeAvatar();
  const ringGeometry=geo(new T.TorusGeometry(.94,.075,7,32));
  const gates=MARKERS.map((point,i)=>{const group=new T.Group();const ring=mesh(group,ringGeometry,'#e5b45f',0,2,0);box(group,'#aa8a56',-1.2,.8,0,.13,1.6,.13);box(group,'#aa8a56',1.2,.8,0,.13,1.6,.13);place(group,point.x,point.z);const number=label(String(i+1),point.x,3.6,point.z,1.2);return {group,ring,number};});

  const outdoors=new T.Group();const keep=new Set([avatar.root,...companions.flatMap(h=>[h.root,h.name])]);
  [...scene.children].filter(child=>!child.isLight&&!keep.has(child)).forEach(child=>outdoors.add(child));scene.add(outdoors,sun.target);
  // Move the base scenery (built above at design spots) to its block in the nine-region world. Chunks, sky and the
  // dust pool place themselves; anything at the origin (paths, fences, the yard) stays.
  for(const c of outdoors.children){if(c===chunks.ground||c===chunks.props||skyKids.has(c))continue;const q=c.position;if(Math.abs(q.x)+Math.abs(q.z)<.01)continue;const p=R(q.x,q.z);if(p.x===q.x&&p.z===q.z)continue;q.y+=groundHeight(p.x,p.z)-groundHeight(q.x,q.z);q.x=p.x;q.z=p.z;}
  const expansion=buildExpansion({T,outdoors,geo,mat,box,ico,label,tree,path});scene.add(expansion.interior);
  // Bramble Village square: the fountain and the walk-in shops (world-town.mjs).
  const town=buildTown({T,outdoors,geo,mat,box,ico,plaque:expansion.plaque,groundY:(x,z)=>chunks.surfaceHeight(x,z)});let inShop=null,shopCam=0,doorTold=null;
  // Step 3: something new in every region (world-town.mjs: courses, owls, pumpkins, Snowy Pines, stones, fishing).
  const acts=buildActivities({T,outdoors,geo,mat,box,ico,label,groundY:(x,z)=>chunks.surfaceHeight(x,z)});let run=null,vista=null,vistaK=0,stoneRun=null,fishing=null;
  const vistaPos=new T.Vector3(),vistaLook=new T.Vector3();
  const hostFigs=HOSTS.map(h=>{const f=figure(lookFromSeed('host-'+h.id));const a=ACTIVITY_BY_ID[h.activity];f.root.position.set(h.x,chunks.surfaceHeight(h.x,h.z),h.z);f.root.rotation.y=Math.atan2(a.points[0].x-h.x,a.points[0].z-h.z)+Math.PI;outdoors.add(f.root);return {h,f};});
  {const h={id:'steward',x:ARENA_STEWARD.x,z:ARENA_STEWARD.z},f=figure(lookFromSeed('host-steward'));f.root.position.set(h.x,chunks.surfaceHeight(h.x,h.z),h.z);f.root.rotation.y=Math.atan2(-6,-10)+Math.PI;outdoors.add(f.root);hostFigs.push({h,f});}   // Marigold, the show ring steward
  // Your horse's own stall (the back one on the left of the hall) shows the same decor you placed in the home stall,
  // so the world and the home page are one stable. The others fill the stalls after it. Horses face the hall (+x).
  const myIndex=Math.max(0,companions.findIndex(c=>c.data.id===preferredHorse));
  const bay=i=>BAYS[i===myIndex?0:Math.min(BAYS.length-1,i<myIndex?i+1:i)];
  const myStall=buildStall(T,{decorOnly:true});myStall.group.position.set(-15.9,0,-10);myStall.group.rotation.y=Math.PI/2;myStall.group.scale.set(.88,1,.85);
  try{myStall.setDecor(loadStall(),companions[myIndex]?.data.name||'');}catch{}
  expansion.interior.add(myStall.group);
  // A painted name plate over each stall front for the horse that lives there (no floating tags indoors).
  companions.forEach((h,i)=>{const b=bay(i);if(b.x<-14)return;expansion.plaque(h.data.name,-HALL_X+.12,4.6,b.z,{face:Math.PI/2,w:2.2,h:.5,wood:'#5a3a22',ink:'#f6dfa2'});});
  // Hazel behind her counter (the dress forms in her window are in barn-interior.js).
  const keeper=figure({...lookFromSeed('hazel-riding-togs'),hair:'topknot',hairColor:'#c4473a',outfit:'orchard'});keeper.root.position.set(KEEPER.x,0,KEEPER.z);keeper.root.rotation.y=-Math.PI/2;expansion.interior.add(keeper.root);
  // Otis's tack counter at the back of the tack room (note #24): tack is bought here by walking up, not from a Store icon.
  const TACK_DESK={x:9.5,z:-11.4},TACK_SPOT={x:9.5,z:-9.6};
  box(expansion.interior,'#8d5a36',TACK_DESK.x,.55,TACK_DESK.z,3.2,1.1,.8,true);box(expansion.interior,'#c58a52',TACK_DESK.x,1.15,TACK_DESK.z,3.4,.1,1);
  box(expansion.interior,'#8a4b2a',TACK_DESK.x-.8,1.34,TACK_DESK.z,.9,.28,.62);box(expansion.interior,'#2f6b3a',TACK_DESK.x+.7,1.25,TACK_DESK.z+.1,.5,.08,.36);
  expansion.indoorObstacles.push({kind:'box',x:TACK_DESK.x,z:TACK_DESK.z,hx:1.8,hz:.6,height:1.3});
  expansion.plaque('Otis’s Saddlery',TACK_DESK.x,.68,TACK_DESK.z+.42,{face:0,w:2.6,h:.5,wood:'#5a3a22',ink:'#f6dfa2'});
  const saddler=figure({...lookFromSeed('otis-tack-room'),hairColor:'#7a7470'});saddler.root.position.set(TACK_DESK.x,0,TACK_DESK.z-1.25);expansion.interior.add(saddler.root);
  const mannequins=[];
  const stations=buildStations({T,outdoors,box,ico,mat,geo,label,groundHeight});
  // Cloudstep, the grand mountain (world-cloudstep-3d.js): its own mesh, water, trail furniture and clouds.
  const cloudstep=buildCloudstep({T,outdoors,label,simple:!!renderer.simpleGraphics});
  // Smugglers' Grotto (note #29): a cave mouth in the cliff just past the stone arch. On foot only; the cave is its own page (cave.html).
  const CAVE=(()=>{const p=trailPoint(.56),dx=CLOUDSTEP.cx-p.x,dz=CLOUDSTEP.cz-p.z,L=Math.hypot(dx,dz),ux=dx/L,uz=dz/L,d=CLOUDSTEP.W+.55;
    const x=p.x+ux*d,z=p.z+uz*d,g=new T.Group();g.position.set(x,p.y-.05,z);g.rotation.y=Math.atan2(-ux,-uz);outdoors.add(g);
    const dark=new T.MeshBasicMaterial({color:'#0a0c10'}),stone=new T.MeshStandardMaterial({color:'#7d746c',roughness:1,flatShading:true});
    const hole=new T.Mesh(new T.CircleGeometry(2.3,20,0,Math.PI),dark);hole.position.set(0,0,-.3);g.add(hole);
    const tunnel=new T.Mesh(new T.CylinderGeometry(2.3,2.3,2.4,16,1,true,-Math.PI/2,Math.PI),new T.MeshBasicMaterial({color:'#121418',side:T.BackSide}));tunnel.rotation.x=Math.PI/2;tunnel.position.z=-1.4;g.add(tunnel);
    for(let i=0;i<=10;i++){const a=i/10*Math.PI,r=2.85+(i%2)*.15,b=new T.Mesh(new T.DodecahedronGeometry(.55+(i%3)*.1,0),stone);b.position.set(Math.cos(a)*r,Math.sin(a)*r,.05);b.rotation.set(i,i*2,0);g.add(b);}
    const hood=new T.Mesh(new T.DodecahedronGeometry(2.4,0),stone);hood.scale.set(1.5,.7,1.1);hood.position.set(0,3.9,-1.2);g.add(hood);
    const post=new T.Mesh(new T.BoxGeometry(.12,1.5,.12),new T.MeshStandardMaterial({color:'#5a3e26'}));post.position.set(3.7,.75,.6);g.add(post);
    const glow=new T.Mesh(new T.BoxGeometry(.36,.42,.36),new T.MeshStandardMaterial({color:'#ffcf7a',emissive:'#ff9f2a',emissiveIntensity:1.8}));glow.position.set(3.7,1.7,.6);g.add(glow);
    g.add(label("SMUGGLERS' GROTTO",0,5.4,.4,4.2));
    return {x:p.x+ux*(d-1.6),z:p.z+uz*(d-1.6)};})();
  const nearCave=()=>area==='outdoor'&&Math.hypot(position.x-CAVE.x,position.z-CAVE.z)<4.2;
  function enterCave(){if(!adventure.grotto){adventure.grotto=1;saveAdventure();}if(mounted){tell('Hop down first. Your horse will wait for you outside the cave.',5);sfx('bonk');return;}openSteeple('cave.html?in=world',"Smugglers' Grotto",'Back out by the old stone arch.');}
  // The Cloudstep Sky Lift (note #28): summit station → valley station in the far north-east corner.
  const skiLift=(()=>{const dir=Math.atan2(VALLEY_STATION.z-CLOUDSTEP.cz,VALLEY_STATION.x-CLOUDSTEP.cx);return buildSkiLift({T,outdoors,groundHeight,stage:host,top:{x:CLOUDSTEP.cx-Math.cos(dir)*3.5,z:CLOUDSTEP.cz-Math.sin(dir)*3.5},bottom:VALLEY_STATION,
    avoid:(x,z)=>{const s=cloudstepAt(x,z);return !!s&&(s.region==='ledge'||s.region==='summit');},onToggle:v=>{sfx(v?'creak':'thud',{vol:.6});tell(v?'The sky lift hums to life. It runs until someone switches it off.':'The sky lift slows to a stop.',4);}});})();
  // The corn maze (note #26, world-cornmaze*.js): a fresh maze every day; jumps can only be cleared on horseback.
  const cornDay=(d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'))(new Date());
  const corn=createCornMaze({T,scene:outdoors,layout:cornLayout('corn-'+cornDay),groundY:(x,z)=>chunks.surfaceHeight(x,z),prepMaterial:seeThrough,quality:renderer.simpleGraphics?'simple':'full'});
  const CORN_KEY='trottville-cornmaze-v1';let cornSave;try{cornSave=JSON.parse(localStorage.getItem(CORN_KEY))||{};}catch{cornSave={};}if(cornSave.day!==cornDay)cornSave={day:cornDay,home:false,golden:false};
  let cornLoot=0,cornTold=false,cornActive=true,cornCam=0,talkK=0;const talkPos=new T.Vector3(),talkLook=new T.Vector3(),_talkAt=new T.Vector3();const CORN_PAY={apple:2,horseshoe:5,golden:25};
  // Legends (note #19): garden bed, rainbow's end, moonlit unicorn, stargazing, pegasus. Callbacks read live state.
  let skyNight=0;
  const legendsWorld=createLegends({T,outdoors,stage:host,groundHeight,tell:(t,s)=>tell(t,s),sfx:(n,o)=>sfx(n,o),
    addHorse:h=>{const r=RanchUI.get();if(r)RanchUI.set({...r,herd:[...r.herd,h]});},
    ranchFood:()=>RanchUI.get()?.food||{},useFood:k=>{const r=RanchUI.get();if(r&&(r.food[k]||0)>0)RanchUI.set({...r,food:{...r.food,[k]:r.food[k]-1}});},
    supplies:()=>adventure?.supplies||{},useSupply:k=>{if((adventure.supplies[k]||0)>0){adventure.supplies[k]--;saveAdventure();}},salt:storageKey});
  const legendCtx=()=>({x:position.x,z:position.z,mounted:!!mounted,speed:moveSpeed,night:skyNight,kind:sky.kind,area,place:nearestPlace,heading:(mounted?mounted.root:avatar.root).rotation.y});
  const outdoorObstacles=[...OBSTACLES,...town.obstacles,...acts.obstacles,...expansion.obstacles,...stations.obstacles,...cloudstep.obstacles,...corn.obstacles,...skiLift.obstacles,...legendsWorld.obstacles];
  // Riding: the shop doorways are shut to horses too (you walk in on foot; your horse waits at the rail).
  const ridingObstacles=[...outdoorObstacles,...town.gates],outdoorList=()=>mounted?ridingObstacles:outdoorObstacles;
  // Valley life (world-life.js): herds in the pastures, trail riders, practice gallops and the noon Derby.
  const valleyLife=createValleyLife({T,scene:outdoors,groundY:(x,z)=>chunks.surfaceHeight(x,z),simple:!!renderer.simpleGraphics,tell:(t,s)=>tell(t,s),sfx:(n,o)=>sfx(n,o),
    route:(a,b)=>findGroundPath(a,b,(x,z)=>!blocked(x,z,.9,0,ridingObstacles)&&groundHeight(x,z)<2.6,navOpts(a,b))});
  const lanterns=createLanterns({T,scene,outdoors,materials,obstacles:outdoorObstacles});
  const adventureKey='horselandia-adventure-v1:'+storageKey;let adventure;try{adventure=normalizeAdventure(JSON.parse(localStorage.getItem(adventureKey)||'null'));}catch{adventure=normalizeAdventure(null);}
  let area='outdoor',tracked=null,designer=null,trustNote='',mapTrip=null,worldMap=null,quests=null,hud=null,rideMeters=0,climb=null,climbPhi=null,lookoutSeen=false,localRace=null,serverClockOffset=0,nearestPlace=null;
  const peers=new Map();let network,adventureUI;
  const isBlocked=(x,z,r,j=0)=>blocked(x,z,r,j,area==='barn'?indoorList():outdoorList());
  // Feet and hooves stand on the ground as drawn (chunks.surfaceHeight), which matters on dunes and ridges.
  const groundY=(x,z)=>area==='barn'?0:Math.max(chunks.surfaceHeight(x,z),acts.floor(x,z));   // Lily Lake's stepping-stones and dock stand above the water
  const stampKey='horselandia-world-stamps-v1:'+storageKey;let stamps={};try{stamps=JSON.parse(localStorage.getItem(stampKey))||{};}catch{}
  stamps=normalizeStamps(stamps,horses.map(h=>h.id));
  let hoofDist=0,mounted=null,called=companions.find(h=>h.data.id===preferredHorse)||companions[0],yaw=Math.PI*.22,pitch=.26,cameraDistance=11,canter=false,jump=0,jumpVelocity=0,phase=0,totalDistance=0,disposed=false,raf=0,lastTime=performance.now(),lastHUD=0,lastRender=0,messageUntil=0;
  const keys=new Set(),position={x:0,z:9.7},cameraTarget=new T.Vector3(position.x,1.5,position.z),aim=new T.Vector3(),cameraRay=new T.Raycaster(),cameraDirection=new T.Vector3();
  let ride=null,walkPath=[],walkGoal=null,walkStalled=0,mountOnArrival=null,doOnArrival=null,moveSpeed=0,stick=null;
  const groundRay=new T.Raycaster(),tapPoint=new T.Vector2();
  const destination=new T.Mesh(geo(new T.RingGeometry(.40,.61,32)),mat('#f3d58d',{side:T.DoubleSide,depthWrite:false}));
  destination.rotation.x=-Math.PI/2;destination.visible=false;destination.renderOrder=3;scene.add(destination);
  function cancelWalk(){mapTrip=null;mountOnArrival=null;doOnArrival=null;walkPath=[];walkGoal=null;walkStalled=0;destination.visible=false;$('#world-walk-stop').hidden=true;host.dataset.walking='false';}
  function setButtonLabel(id,text){const button=$(id);button.setAttribute('aria-label',text);button.title=text;const caption=button.querySelector('.world-icon-caption');if(caption&&id==='#world-mount')caption.textContent=text.startsWith('Dismount')?'Dismount':text.startsWith('Mount')?'Mount':'Call';if(caption&&id==='#world-interact'){const w=(text.match(/^[A-Za-z]+/)||['Use'])[0];caption.textContent=w.length<=8?w:'Use';}const tooltip=button.querySelector('.world-tooltip');if(tooltip)tooltip.textContent=text;}
  function closeCompactPanels(){for(const [panel,toggle]of [['#world-camera-panel','#world-camera-toggle'],['#world-companions-panel','#world-companions-toggle']]){$(panel).hidden=true;$(toggle).setAttribute('aria-expanded','false');}}
  function requestWalk(clientX,clientY){
    if(adventureUI?.dialog.open)return;
    closeCompactPanels();const rect=renderer.domElement.getBoundingClientRect();
    tapPoint.set((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1);
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);groundRay.setFromCamera(tapPoint,camera);
    // Tapping another rider or their horse opens their profile (friends.js): username, level, races, the horse they ride.
    {const list=[...peers.values()].filter(p=>p.group.visible),hit=list.length&&groundRay.intersectObjects(list.map(p=>p.group),true)[0];
      if(hit){const inside=root=>{let o=hit.object;while(o){if(o===root)return true;o=o.parent;}return false;},p=list.find(q=>inside(q.group));
        if(p){if(network?.v2)openProfile(p.name,{focus:p.mounted&&!inside(p.person.root)?'horse':'rider'});else tell('That’s '+p.name+(p.mounted?' on their horse':'')+'.',3);return;}}}
    // In the barn: tap the big doors to ride out, or tap Hazel to talk.
    if(area==='barn'){const d=groundRay.intersectObjects(expansion.door.meshes,false)[0];
      if(d){if(nearDoor()){openDoors();return;}if(walkTo({x:0,z:12.2})){doOnArrival=openDoors;tell(mounted?'Riding to the big doors.':'Walking to the big doors.',2);}return;}
      const o=groundRay.intersectObject(saddler.root,true)[0];
      if(o){if(nearSaddler()){talkToOtis();return;}if(mounted){tell('Otis: Hop down and come in on foot, the tack room is a squeeze for horses.',4);return;}if(walkTo(TACK_SPOT))doOnArrival=()=>talkToOtis();return;}
      const k=keeper&&groundRay.intersectObject(keeper.root,true)[0];
      if(k){if(nearKeeper()){talkToHazel();return;}if(mounted){tell(NO_HORSES[0],3);return;}if(walkTo({x:COUNTER.x-1.6,z:COUNTER.z}))doOnArrival=()=>talkToHazel();return;}}
    // Tapping a quest giver: talk when close, otherwise go over to them first.
    if(area==='outdoor'&&quests){const g=quests.hit(groundRay);if(g){const d=Math.hypot(g.x-position.x,g.z-position.z),talkNow=()=>quests.talk(g.id,{x:position.x,z:position.z,mounted:!!mounted});if(d<3.4){talkNow();return;}const k=1.9/Math.max(d,.01);if(walkTo({x:g.x+(position.x-g.x)*k,z:g.z+(position.z-g.z)*k})){doOnArrival=talkNow;tell((mounted?'Riding':'Walking')+' over to '+g.name+'.',2);}return;}}
    // Tapping a horse (its saddle, or anywhere on it) mounts it: right away when it is beside you, otherwise you walk over first.
    {const tapped=companions.filter(h=>h!==mounted&&h.root.visible&&h.area===area),horseHit=groundRay.intersectObjects(tapped.map(h=>h.root),true)[0];
      if(horseHit){const h=tapped.find(c=>{let o=horseHit.object;while(o){if(o===c.root)return true;o=o.parent;}return false;});
        if(h){if(mounted){tell('Dismount first, then tap '+h.data.name+' to ride.',3);return;}
          if(Math.hypot(h.root.position.x-position.x,h.root.position.z-position.z)<3.6){mount(h);return;}
          const a=Math.atan2(position.x-h.root.position.x,position.z-h.root.position.z),spot=[0,.8,-.8,1.6,-1.6,Math.PI].map(t=>({x:h.root.position.x+Math.sin(a+t)*2,z:h.root.position.z+Math.cos(a+t)*2})).find(p=>!isBlocked(p.x,p.z,.4));
          if(spot&&walkTo(spot)){mountOnArrival=h;tell('Walking over to '+h.data.name+'.',2);}return;}}}
    const hit=groundRay.intersectObjects(area==='barn'?[expansion.floor]:[...lawn.children,cloudstep.mesh],false)[0];
    if(!hit){cancelWalk();tell('Tap a patch of ground to walk there.',2.5);return;}
    if(walkTo({x:hit.point.x,z:hit.point.z}))tell(mounted?'Riding to the golden marker.':'Walking to the golden marker.',2);
  }
  // Nine regions: a trip can span 600 m. Short trips plan on the 1 m grid; long ones on a 2 m grid over a box that holds both ends.
  function navOpts(a,b){const half=Math.max(Math.abs(a.x-b.x),Math.abs(a.z-b.z))/2+24,center={x:(a.x+b.x)/2,z:(a.z+b.z)/2};return half<=104?{bounds:104,center}:{bounds:half,center,step:2,maxNodes:90000};}
  // Plans a route to a ground point and starts following it; false if there is no way there.
  function walkTo(goal,quiet=false){const radius=mounted?.76:.4;
    const canWalk=(x,z)=>!isBlocked(x,z,radius)&& (area==='barn'?Math.abs(x)<18.5&&Math.abs(z)<14.6:groundHeight(x,z)<2.6||wildness(x,z)>0||onCloudstep(x,z));
    const ground=(a,b)=>findGroundPath(a,b,canWalk,area==='barn'?{bounds:19}:navOpts(a,b));
    // On Cloudstep a route follows the spiral ledge; from the plain it goes by the trailhead.
    const upA=area==='outdoor'&&trailPhi(position.x,position.z)!=null,upB=area==='outdoor'&&trailPhi(goal.x,goal.z)!=null,gate={x:CLIMB_START.x,z:CLIMB_START.z};let route;
    if(upA&&upB)route=climbRoute(position,goal);
    else if(upB){const a=ground(position,gate),b=a&&climbRoute(gate,goal);route=a&&b?[...a,...b]:null;}
    else if(upA){const a=climbRoute(position,gate),b=a&&ground(gate,goal);route=a&&b?[...a,...b]:null;}
    else route=ground(position,goal);
    if(!route){cancelWalk();if(!quiet)tell(onCloudstep(goal.x,goal.z)?'Stay on the mountain trail. Tap a spot along the ledge.':'That spot is blocked. Try an open patch of ground.',3);return false;}
    cancelWalk();if(!route.length)return true;walkPath=route;walkGoal=goal;
    destination.position.set(goal.x,groundY(goal.x,goal.z)+.12,goal.z);destination.visible=true;
    $('#world-walk-stop').hidden=false;setButtonLabel('#world-walk-stop',mounted?'Stop riding':'Stop walking');host.dataset.walking='true';return true;
  }
  avatar.root.rotation.y=yaw+Math.PI;
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  watchReturn((kind,n)=>tell(kind==='cancel'?'No card bought. Nothing was charged.':n?'Game Card added: +'+n.toLocaleString()+' stars! Spend them in Me → Outfits.':'Thanks! Your stars are on their way. Open Me → Card shop in a moment to collect them.',7));
  function tell(text,seconds=4){$('#world-message').textContent=text;$('#world-message').classList.remove('quiet');messageUntil=performance.now()+seconds*1000;}
  // ---------- Riding: tack, stamina, race gear (riding.mjs, note #16) ----------
  // Stamina comes from how the horse is looked after at home; cloud and sample horses ride as well-kept horses.
  function startRide(data){let cond='fed';try{if(data.acquiredDay!=null)cond=condition(data).id;}catch{}
    const shoes=G.shoesOf(data),care=G.staminaCare({condition:cond,bond:data.bond??50,happiness:data.happiness??60,age:G.ageRide(data)});
    return {stamina:G.freshStamina(),care:{...care,drain:care.drain*shoes.drain},shoes,stats:G.rideStats(data),warned:false};}
  function paintStamina(){const bar=$('#world-stamina');if(!bar)return;bar.hidden=!mounted||!ride;if(bar.hidden)return;const s=ride.stamina;
    bar.classList.toggle('hot',s.overheated);bar.classList.toggle('low',!s.overheated&&s.value<30);bar.querySelector('b').style.width=s.value.toFixed(1)+'%';}
  // Racing needs the Trail Rider outfit (bought once). Buying it here also puts it on.
  function needGear(then){const w=loadWallet();if(G.canRace(w)){then();return;}const price=300;
    adventureUI.open('Racing needs riding gear',`<p>Riders need the <b>Trail Rider</b> outfit to race: boots, helmet and gloves. It’s yours for good once you buy it.</p><p class="small">You have ${w.coins.toLocaleString('en-US')} 🪙.</p><button type="button" class="primary full" id="gear-buy">Buy &amp; wear · ${price} 🪙</button><button type="button" class="secondary full" id="gear-later" style="margin-top:10px">Not now</button>`);
    const d=adventureUI.dialog;d.querySelector('#gear-later').onclick=()=>adventureUI.close();
    d.querySelector('#gear-buy').onclick=()=>{const res=buyOutfit(loadWallet(),G.RACE_OUTFIT);if(!res.ok){tell(`You need ${res.short} more Trotties for the Trail Rider outfit. Play a few games and come back!`,6);adventureUI.close();return;}
      saveWallet(res.wallet);paintCounters();const l={...look,outfit:G.RACE_OUTFIT};saveLook(l);applyLook(l);adventureUI.close();tell('Trail Rider outfit on. You’re ready to race!',4);then();};}
  function nearest(){const nearby=companions.filter(h=>Math.hypot(h.root.position.x-position.x,h.root.position.z-position.z)<3.6);return nearby.find(h=>h===called)||nearby.sort((a,b)=>Math.hypot(a.root.position.x-position.x,a.root.position.z-position.z)-Math.hypot(b.root.position.x-position.x,b.root.position.z-position.z))[0];}
  function updateStamps(){const values=mounted?(stamps[mounted.data.id]||[]):[];host.querySelectorAll('[data-stamp]').forEach((el,i)=>{el.classList.toggle('done',values.includes(i));el.textContent=values.includes(i)?'✓':String(i+1);});$('#world-stamps').setAttribute('aria-label',`${values.length} of 5 meadow markers visited`);$('#world-quest-title').textContent=values.length===5?'A lovely loop. A closer friendship.':'Ride the five meadow markers';$('#world-quest-hint').textContent=mounted?(values.length===5?'Loop complete! Switch companions or explore at your own pace.':`Visit the golden rings with ${mounted.data.name}. ${values.length} of 5 found.`):'Call a companion, then saddle up.';}
  function updateHUD(){const nearby=nearest();$('#world-riding').textContent=mounted?'Riding '+mounted.data.name:'Exploring on foot';setButtonLabel('#world-mount',(mounted?'Dismount '+mounted.data.name:nearby?'Mount '+nearby.data.name:'Call '+called.data.name)+' · E');$('#world-distance').textContent=Math.round(totalDistance)+' m explored';host.querySelectorAll('[data-call-horse]').forEach(el=>el.classList.toggle('active',el.dataset.callHorse===(mounted||called).data.id));hud?.horse((mounted||called).data,!!mounted);
    $('#world-location').textContent=area==='barn'?'Inside your barn':nearestPlace&&nearestPlace.distance<12?nearestPlace.name:position.x>-24&&position.x<9&&position.z>-11&&position.z<14?'The stable yard':'Meadow paths';updateStamps();}
  function dismount(){cancelWalk();if(!mounted)return;if(chair){tell('Stay in the saddle until the platform reaches the station.',3);return false;}const old=mounted;const options=[[2,0],[-2,0],[0,3],[0,-3]];let spot=options.map(([x,z])=>({x:position.x+x,z:position.z+z})).find(p=>!isBlocked(p.x,p.z,.4));if(!spot){tell('Find an open patch before dismounting.');return false;}scene.attach(avatar.root);avatar.root.scale.setScalar(1);position.x=spot.x;position.z=spot.z;avatar.root.position.set(position.x,groundY(position.x,position.z),position.z);avatar.root.rotation.set(0,old.root.rotation.y,0);avatar.root.visible=true;old.tack.rider.visible=false;mounted=null;canter=false;jump=0;jumpVelocity=0;old.name.visible=true;tell('Back on foot. '+old.data.name+' is right here.');updateHUD();return true;}
  function callHorse(id){cancelWalk();closeCompactPanels();if(area==='barn'&&inStore(position.x,position.z)){tell(SHOPKEEPER.name+': '+NO_HORSES[1],3);return;}if(mounted&&!dismount())return;called=companions.find(h=>h.data.id===id)||called;const offsets=[[2.2,1.4],[-2.2,1.4],[0,-2.8],[0,2.8]];const spot=offsets.map(([x,z])=>({x:position.x+x,z:position.z+z})).find(p=>!isBlocked(p.x,p.z,.8));if(!spot){tell('Step into an open space to call your companion.');return;}whistle();called.area=area;called.root.visible=true;
    // Outdoors the horse starts just out of sight and canters in; indoors (or with no clear way in) it is simply there.
    const from=area==='outdoor'?offCameraStart(called):null;
    if(from){called.root.position.set(from.x,groundY(from.x,from.z),from.z);called.root.rotation.y=Math.atan2(position.x-from.x,position.z-from.z);called.arriving={gait:'canter',t:0};tell(called.data.name+' heard you and is on the way!',3);}
    else{called.arriving=null;called.root.position.set(spot.x,groundY(spot.x,spot.z),spot.z);called.root.rotation.y=Math.atan2(position.x-spot.x,position.z-spot.z);tell(called.data.name+' is beside you. Tap '+called.data.name+' to ride.');}
    updateHUD();}
  // A spot 18–26 m away, outside the camera's view, with a clear straight line to you.
  function offCameraStart(h){const cx=camera.position.x-position.x,cz=camera.position.z-position.z,base=Math.atan2(cx,cz),v=new T.Vector3();
    for(const dist of [24,19])for(const turn of [0,.45,-.45,.9,-.9,1.35,-1.35]){const a=base+turn,x=position.x+Math.sin(a)*dist,z=position.z+Math.cos(a)*dist;
      if(isBlocked(x,z,.9))continue;v.set(x,groundY(x,z)+2,z).project(camera);if(v.z<1&&Math.abs(v.x)<1.15&&Math.abs(v.y)<1.15)continue;
      let clear=true;for(let k=1;k<dist-2&&clear;k+=1){const t=k/dist;clear=!isBlocked(x+(position.x-x)*t,z+(position.z-z)*t,.8);}if(clear)return {x,z};}
    return null;}
  // Moves an arriving horse toward you each frame; it keeps coming if you walk away, and gives up after 15 s by trotting the last bit.
  function arrive(h,delta){const dx=position.x-h.root.position.x,dz=position.z-h.root.position.z,d=Math.hypot(dx,dz);h.arriving.t+=delta;
    if(h.area!==area||mounted===h){h.arriving=null;return;}
    if(d<2.6||h.arriving.t>15){h.arriving=null;if(d>=2.6){const a=Math.atan2(dx,dz);h.root.position.set(position.x-Math.sin(a)*2.4,0,position.z-Math.cos(a)*2.4);h.root.position.y=groundY(h.root.position.x,h.root.position.z);}tell(h.data.name+' is beside you. Tap '+h.data.name+' to ride.',3);return;}
    h.arriving.gait=d>7?'canter':'walk';const speed=d>7?8.5:2.4,step=Math.min(d-2.4,speed*delta),nx=h.root.position.x+dx/d*step,nz=h.root.position.z+dz/d*step;
    h.root.position.set(nx,groundY(nx,nz),nz);const turn=Math.atan2(dx,dz)-h.root.rotation.y;h.root.rotation.y+=Math.atan2(Math.sin(turn),Math.cos(turn))*Math.min(1,delta*6);}
  // A two-note rider's whistle, made on the fly (no sound file).
  let audio=null;
  function whistle(){try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();audio.resume?.();const t0=audio.currentTime;
    for(const [start,f0,f1,len] of [[0,1500,2300,.22],[.3,1700,2700,.38]]){const o=audio.createOscillator(),g=audio.createGain(),lfo=audio.createOscillator(),lg=audio.createGain();
      o.type='sine';o.frequency.setValueAtTime(f0,t0+start);o.frequency.exponentialRampToValueAtTime(f1,t0+start+len*.6);o.frequency.exponentialRampToValueAtTime(f1*.94,t0+start+len);
      lfo.frequency.value=22;lg.gain.value=28;lfo.connect(lg).connect(o.frequency);
      g.gain.setValueAtTime(0,t0+start);g.gain.linearRampToValueAtTime(.18,t0+start+.03);g.gain.setValueAtTime(.18,t0+start+len-.07);g.gain.linearRampToValueAtTime(0,t0+start+len);
      o.connect(g).connect(audio.destination);o.start(t0+start);lfo.start(t0+start);o.stop(t0+start+len+.02);lfo.stop(t0+start+len+.02);}}catch{}}
  function mount(chosen){cancelWalk();closeCompactPanels();if(chair){tell(mounted?'Stay in the saddle until the platform reaches the station.':'Sit tight! The chair lets you off at the station.',3);return;}if(mounted){dismount();return;}const target=chosen||nearest();if(!target){callHorse(called.data.id);return;}
    // Tack comes first (Otis's counter in the barn's tack room), then taming.
    const live=RanchUI.horse(target.data.id);if(live)target.data={...target.data,...live};const block=G.rideBlock(target.data);
    if(block==='foal'){const left=G.RIDE_AT-G.ageMonths(target.data);tell(`${target.data.name} is a foal: too young to ride until 2 years old (${left} ${left===1?'day':'days'} to go).`,6);return;}
    if(block==='untamed'){tell(`${target.data.name} isn’t tamed yet. Taming ${target.data.trust||0}/${G.TAME_AT}: pet, brush and feed them at home.`,6);return;}
    if(block==='tack'){const miss=G.missingTack(target.data).map(G.pieceName);tell(`${target.data.name} needs tack before riding: ${miss.join(', ').replace(/, ([^,]*)$/,' and $1')}. Otis has them at the Tack Room counter in the barn (Complimentary).`,7);return;}
    ride=startRide(target.data);sfx('buckle');sfx('nicker',{delay:.35});mounted=target;called=target;target.arriving=null;position.x=target.root.position.x;position.z=target.root.position.z;target.anchor.add(avatar.root);avatar.root.position.set(0,-.70,0);avatar.root.rotation.set(0,0,0);target.name.visible=false;avatar.root.visible=false;target.tack.rider.visible=true;target.area=area;jump=0;jumpVelocity=0;tell('You & '+target.data.name+'. Find the five golden meadow rings!',5);updateHUD();view.focus({preventScroll:true});}
  function doJump(){if(chair)return;if(jump<=.001){sfx('whoosh',{vol:mounted?1:.6});jumpVelocity=mounted?5.7:4.4;mounted?.model.jump();tell(mounted?called.data.name+' takes a little leap!':'A little hop!',1.4);}}
  function on(target,event,fn,options){target.addEventListener(event,fn,options);listeners.push(()=>target.removeEventListener(event,fn,options));}
  on($('#world-mount'),'click',()=>mount());
  on($('#world-sky-time'),'change',e=>{sky.preview.hours=e.target.value===''?null:+e.target.value;});on($('#world-sky-weather'),'change',e=>{sky.preview.weather=e.target.value||null;});
  const paintSound=()=>{$('#world-sound').setAttribute('aria-pressed',String(!sky.muted));$('#world-sound').textContent=sky.muted?'🔇 Sounds off':'🔊 Sounds on';};paintSound();on($('#world-sound'),'click',()=>{sky.setMuted(!sky.muted);paintSound();});on($('#world-jump'),'click',doJump);
  host.querySelectorAll('[data-call-horse]').forEach(b=>on(b,'click',()=>callHorse(b.dataset.callHorse)));
  on($('#world-camera-left'),'click',()=>yaw-=Math.PI/4);on($('#world-camera-right'),'click',()=>yaw+=Math.PI/4);
  on($('#world-zoom-in'),'click',()=>cameraDistance=Math.max(5,cameraDistance-2));on($('#world-zoom-out'),'click',()=>cameraDistance=Math.min(20,cameraDistance+2));
  on($('#world-reset'),'click',()=>{closeCompactPanels();travel('stable');view.focus({preventScroll:true});});
  for(const [panel,toggle]of [['#world-camera-panel','#world-camera-toggle'],['#world-companions-panel','#world-companions-toggle']]){
    on($(toggle),'click',()=>{const open=$(panel).hidden;closeCompactPanels();cancelWalk();$(panel).hidden=!open;$(toggle).setAttribute('aria-expanded',String(open));});
  }
  host.querySelectorAll('[data-close-world-panel]').forEach(button=>on(button,'click',()=>{closeCompactPanels();view.focus({preventScroll:true});}));
  on($('#world-walk-stop'),'click',()=>{cancelWalk();tell('Stopped. Tap another spot whenever you’re ready.',2);});
  on(window,'keydown',event=>{if(event.key==='Escape')closeCompactPanels();});
  const cameraPointers=new Map();let pinchDistance=0,pinchMid=null;
  // Press-and-drag thumbstick (touch/pen): appears where you pressed; drag further to go faster. Mouse drag still looks around.
  const stickEl=document.createElement('div');stickEl.className='world-stick';stickEl.hidden=true;stickEl.innerHTML='<i></i>';host.append(stickEl);
  function endStick(){stick=null;stickEl.hidden=true;}
  function clearInput(){keys.clear();cameraPointers.clear();pinchDistance=0;endStick();cancelWalk();}
  on(window,'keydown',event=>{if(event.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;const key=event.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','shift','e','f'].includes(key)){if((key===' '||key==='e')&&event.target.closest?.('button,a'))return;event.preventDefault();keys.add(key);if(!event.repeat){if(key==='e')mount();if(key==='f')interact();if(key===' ')doJump();if(!adventureUI?.dialog.open){if(key==='arrowleft')yaw+=.1;if(key==='arrowright')yaw-=.1;if(key==='arrowup')pitch=Math.max(.08,pitch-.07);if(key==='arrowdown')pitch=Math.min(.8,pitch+.07);if(['w','a','s','d'].includes(key)){cancelWalk();closeCompactPanels();}}}}});
  on(window,'keyup',e=>keys.delete(e.key.toLowerCase()));on(window,'blur',clearInput);on(document,'visibilitychange',clearInput);
  on(renderer.domElement,'pointerdown',event=>{
    if(event.button!==0)return;event.preventDefault();view.focus({preventScroll:true});
    cameraPointers.set(event.pointerId,{x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,dragged:false,suppressed:false,touch:event.pointerType!=='mouse'});renderer.domElement.setPointerCapture(event.pointerId);
    if(cameraPointers.size>1){endStick();for(const p of cameraPointers.values())p.suppressed=true;const [a,b]=[...cameraPointers.values()];pinchDistance=Math.hypot(a.x-b.x,a.y-b.y);pinchMid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};}
  });
  on(renderer.domElement,'pointermove',event=>{
    const previous=cameraPointers.get(event.pointerId);if(!previous)return;const dx=event.clientX-previous.x,dy=event.clientY-previous.y;
    previous.x=event.clientX;previous.y=event.clientY;if(Math.hypot(previous.x-previous.startX,previous.y-previous.startY)>7)previous.dragged=true;
    if(cameraPointers.size>=2){const [a,b]=[...cameraPointers.values()],gap=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance>0&&gap>0)cameraDistance=Math.min(20,Math.max(5,cameraDistance*pinchDistance/gap));pinchDistance=gap;
      const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};if(pinchMid){yaw-=(mid.x-pinchMid.x)*.006;pitch=Math.min(.8,Math.max(.08,pitch+(mid.y-pinchMid.y)*.004));}pinchMid=mid;}
    else if(previous.dragged&&previous.touch&&!previous.suppressed){if(!stick){cancelWalk();closeCompactPanels();stickEl.style.left=previous.startX+'px';stickEl.style.top=previous.startY+'px';stickEl.hidden=false;}
      stick={id:event.pointerId,dx:previous.x-previous.startX,dy:previous.y-previous.startY};const len=Math.hypot(stick.dx,stick.dy),k=Math.min(1,60/Math.max(1,len));stickEl.firstChild.style.transform=`translate(${stick.dx*k}px,${stick.dy*k}px)`;}
    else if(previous.dragged&&!previous.touch){yaw-=dx*.006;pitch=Math.min(.8,Math.max(.08,pitch+dy*.004));}
  });
  const releaseCamera=event=>{const p=cameraPointers.get(event.pointerId);cameraPointers.delete(event.pointerId);pinchDistance=0;pinchMid=null;if(stick?.id===event.pointerId)endStick();if(event.type==='pointerup'&&p&&!p.dragged&&!p.suppressed&&Math.hypot(event.clientX-p.startX,event.clientY-p.startY)<=7)requestWalk(event.clientX,event.clientY);};
  on(renderer.domElement,'pointerup',releaseCamera);on(renderer.domElement,'pointercancel',releaseCamera);on(renderer.domElement,'lostpointercapture',releaseCamera);
  on(renderer.domElement,'wheel',event=>{event.preventDefault();cameraDistance=Math.min(20,Math.max(5,cameraDistance+event.deltaY*.012));},{passive:false});
  on(renderer.domElement,'contextmenu',event=>event.preventDefault());
  on(renderer.domElement,'webglcontextlost',event=>{event.preventDefault();clearInput();tell('Graphics paused. Return to your stable and reopen the meadow.',30);});
  function resize(){const width=view.clientWidth,height=view.clientHeight;renderer.setSize(width,height,false);camera.aspect=width/Math.max(1,height);camera.updateProjectionMatrix();}
  const observer=new ResizeObserver(resize);observer.observe(view);resize();
  function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function saveAdventure(){try{localStorage.setItem(adventureKey,JSON.stringify(adventure));}catch{tell('Your adventure will last for this visit; device storage is unavailable.');}network?.saveProgress(adventure);}
  function moveTo(x,z){cancelWalk();position.x=x;position.z=z;jump=0;jumpVelocity=0;const actor=mounted?mounted.root:avatar.root;actor.position.set(x,groundY(x,z),z);cameraTarget.set(x,groundY(x,z)+(mounted?3.1:1.45),z);network?.teleported();}
  function setArea(next){cancelWalk();if(next!==area){companions.forEach((h,i)=>{if(next==='barn'){h.outdoorPose={x:h.root.position.x,y:h.root.position.y,z:h.root.position.z,yaw:h.root.rotation.y};h.area='barn';if(h!==mounted){const b=bay(i);h.root.position.set(b.x,0,b.z);h.root.rotation.y=Math.PI/2;}}else{h.area='outdoor';if(h!==mounted&&h.outdoorPose){const p=h.outdoorPose;h.root.position.set(p.x,p.y,p.z);h.root.rotation.y=p.yaw;}}});}if(next==='barn')expansion.door.shut();area=next;outdoors.visible=area==='outdoor';expansion.interior.visible=area==='barn';if(mounted)mounted.area=area;scene.background.set(area==='barn'?'#e8d9bc':'#c8e6e5');scene.fog.color.copy(scene.background);host.dataset.area=area;climb=null;localRace=null;}
  // The world opens inside the barn, standing in your horse's stall beside them (like the home page), not out in the yard.
  function startInStall(){setArea('barn');const h=companions[myIndex];yaw=-1.2;pitch=.4;moveTo(-8.4,-8.6);
    startNote=h?`You’re in ${h.data.name}’s stall. Tap ${h.data.name} to ride, then tap the big doors at the end of the hall.`:'';}
  let startNote='';
  function leaveBarn(){setArea('outdoor');yaw=.6;pitch=.3;moveTo(-12,4.5);tell('Out into the valley. The barn is right behind you.',4);}
  function enterBarn(){markVisit(LOCATIONS[0]);setArea('barn');yaw=0;pitch=.28;moveTo(0,12.4);tell('Welcome inside. Stalls on the left, the tack room and Hazel’s shop on the right.',5);}
  // The big doors: they swing open (on the animation's own end, not a timer) and then you're out in the valley.
  function openDoors(){if(area!=='barn'||expansion.door.opening)return;cancelWalk();sfx('creak');sfx('creak',{delay:.3,pan:.4});expansion.door.open(()=>{if(area==='barn')leaveBarn();});tell('The big doors swing open…',2);}
  const nearDoor=()=>Math.hypot(position.x-DOOR.x,position.z-(DOOR.z-1))<DOOR.reach;
  const nearSaddler=()=>area==='barn'&&Math.hypot(position.x-TACK_SPOT.x,position.z-TACK_SPOT.z)<3;
  const nearKeeper=()=>inStore(position.x,position.z)&&Math.hypot(position.x-COUNTER.x,position.z-COUNTER.z)<4.2;
  const indoorList=()=>mounted?[...expansion.indoorObstacles,expansion.shopGate]:expansion.indoorObstacles;
  // Hazel's shop: talk at the counter. Lines from shop-talk.mjs; visits remembered on this device.
  const HAZEL_KEY='trottville-hazel';let hazel={visits:0,tip:0,chat:0};try{hazel={...hazel,...JSON.parse(localStorage.getItem(HAZEL_KEY))};}catch{}
  const saveHazel=()=>{try{localStorage.setItem(HAZEL_KEY,JSON.stringify(hazel));}catch{}};
  // Otis sells tack: pick a horse, then the tack sheet (ranch-ui openTack) shows its Complimentary set and upgrades.
  const OTIS_HI=['Mornin’! Every horse needs a saddle and a bridle that fit. Who are we kitting out?','Saddles, bridles, shoes. If it buckles, I sell it. Which horse?','Ah, a customer! Tell me which horse and I’ll fetch their size.'];
  function talkToOtis(){const herd=(RanchUI.get()?.herd||[]).filter(h=>!h.retired);sfx('pop');
    const rows=herd.map(h=>{const miss=G.missingTack(h);return `<button type="button" class="${miss.length?'primary':'secondary'} full" data-otis="${escapeHTML(h.id)}" style="margin-top:10px">${escapeHTML(h.name)}${miss.length?` · needs ${escapeHTML(miss.map(G.pieceName).join(', '))}`:' · all tacked up'}</button>`;}).join('');
    adventureUI.open('Otis · Tack Room',`<div class="hazel-talk"><span class="hazel-face" aria-hidden="true">🐴</span><p class="hazel-line">${escapeHTML(OTIS_HI[Math.floor(Math.random()*OTIS_HI.length)])}</p></div>${rows||'<p>No horses to fit yet.</p>'}<button type="button" class="text-button" id="otis-bye" style="margin-top:10px">Bye, Otis!</button>`);
    const d=adventureUI.dialog;d.querySelectorAll('[data-otis]').forEach(b=>b.onclick=()=>{adventureUI.close();RanchUI.openTack(b.dataset.otis);});d.querySelector('#otis-bye').onclick=()=>adventureUI.close();}
  function talkToHazel(line){const w=loadWallet();
    if(!line)line=shopGreeting({hours:sky.hours,weather:sky.kind,visits:hazel.visits+1,outfit:outfitOf(look).name});
    adventureUI.open(SHOPKEEPER.shop,`<div class="hazel-talk"><span class="hazel-face" aria-hidden="true">🧵</span><p class="hazel-line">${escapeHTML(line)}</p></div>
      <p class="small">You have ${w.coins.toLocaleString('en-US')} 🪙</p>
      <button type="button" class="primary full" id="hz-shop">Show me the outfits</button>
      <button type="button" class="${hasPoncho?'secondary':'primary'} full" id="hz-poncho" style="margin-top:10px"${hasPoncho?' disabled':''}>${hasPoncho?'✓ You own a Rain Poncho':`Rain Poncho · ${PONCHO.price} 🪙`}</button>
      <button type="button" class="secondary full" id="hz-buy" style="margin-top:10px">What should I buy?</button>
      <button type="button" class="secondary full" id="hz-tip" style="margin-top:10px">Any riding tips?</button>
      <button type="button" class="secondary full" id="hz-chat" style="margin-top:10px">How’s business?</button>
      <button type="button" class="text-button" id="hz-bye" style="margin-top:10px">Bye, ${SHOPKEEPER.name}!</button>`);
    const d=adventureUI.dialog;
    d.querySelector('#hz-shop').onclick=()=>{adventureUI.close();$('#world-style')?.click();};
    d.querySelector('#hz-poncho').onclick=()=>{if(!hasPoncho)buyPoncho();};
    d.querySelector('#hz-buy').onclick=()=>talkToHazel(shopPitch({coins:loadWallet().coins,owned:loadWallet().owned,outfits:OUTFITS}));
    d.querySelector('#hz-tip').onclick=()=>{const t=shopTip(hazel.tip++);saveHazel();talkToHazel(t);};
    d.querySelector('#hz-chat').onclick=()=>{const t=shopChatter(hazel.chat++);saveHazel();talkToHazel(t);};
    d.querySelector('#hz-bye').onclick=()=>adventureUI.close();}
  let wasInShop=false,lastNoHorse=0;
  // Rain gear (v71). hasPoncho is cached: the wallet is only read again after a purchase.
  const isRaining=()=>area==='outdoor'&&(sky.kind==='rain'||sky.kind==='storm');
  const PONCHO=GEAR_ITEMS.find(g=>g.id==='poncho');let hasPoncho=loadWallet().owned.includes('poncho');
  function buyPoncho(){const w=loadWallet(),r=buyGear(w,'poncho');
    if(!r.ok){sfx('pop');talkToHazel(`A poncho is ${PONCHO.price} Trotties, love. You’re ${r.short} short. Come back after a quest or two.`);return;}
    saveWallet(r.wallet);hasPoncho=true;paintCounters();sfx('coin');
    talkToHazel('There you go! It’s yours. It goes on by itself whenever it rains, and the hood folds down so your helmet still fits.');}
  // Trust: riding together builds it, jumping across the map spends it. Starts from each horse's steeplechase Trust.
  // Kept on this device beside the adventure save (not in the shared cloud progress).
  const trustKey=adventureKey+':trust',BASE_TRUST={willow:68,atlas:81,sunny:54};let trust={};
  try{trust=JSON.parse(localStorage.getItem(trustKey))||{};}catch{}
  const trustOf=id=>Math.round(trust[id]??BASE_TRUST[id]??50);
  function addTrust(id,n){trust[id]=Math.max(0,Math.min(100,trustOf(id)+n));try{localStorage.setItem(trustKey,JSON.stringify(trust));}catch{}return trust[id];}
  // Every 60 m ridden together: +1 trust.
  function rodeFor(distance){rideMeters+=distance;if(rideMeters<60)return;rideMeters-=60;const h=mounted.data,v=addTrust(h.id,1);if(!walkGoal)tell(h.name+' trusts you a little more · Trust '+v,2.5);}
  function mapSpot(place){const wanted=place.id==='stable'?{x:0,z:9.7}:place,offsets=[[0,7],[7,0],[-7,0],[0,-7],[6,6],[-6,6],[0,4],[0,0]];return offsets.map(([dx,dz])=>({x:wanted.x+dx,z:wanted.z+dz})).find(p=>!isBlocked(p.x,p.z,mounted?.8:.4))||null;}
  function mapInfo(place){const h=(mounted||called).data,summit=place.id==='summit';
    const left=G.passesLeft(loadPasses()),jumpCost=left?`free pass (${left} left today)`:'−3 trust';
    return {ride:mounted?(summit?'Ride to the trailhead':'Ride there'):(summit?'Walk to the trailhead':'Walk there'),jump:(summit?'Jump to trailhead':'Jump there')+' · '+jumpCost,
      trust:(mounted?`Riding there together earns trust with ${h.name} (now ${trustOf(h.id)}).`:`Ride a horse there to earn trust.`)+(left?` You have ${left} free ${left===1?'jump':'jumps'} left today; after that a jump costs ${h.name} 3 trust.`:` No free jumps left today: jumping costs ${h.name} 3 trust (now ${trustOf(h.id)}).`)};}
  function rideTo(id){let place=LOCATIONS.find(l=>l.id===id);if(place.id==='summit')place=LOCATIONS.find(l=>l.id==='mountain');
    if(area==='barn'){setArea('outdoor');moveTo(-13,3);}
    const spot=mapSpot(place);tracked=place.id;
    if(!spot||!walkTo(spot,true)){tell('No way through from here. Try another spot, or jump there.',4);return;}
    mapTrip={place,horse:mounted?.data.id||null};
    tell(mounted?'Riding to '+place.name+' with '+mounted.data.name+'. Trust grows on the way.':'Walking to '+place.name+'. Ride a horse to earn trust on the way.',4);}
  function arrived(trip){if(!trip){tell('Here we are. Tap another spot to keep exploring.',2);return;}
    if(trip.horse&&mounted?.data.id===trip.horse){const v=addTrust(trip.horse,2);queueCoins({from:'Ride to '+trip.place.name,coins:5,lines:['Rode to '+trip.place.name+' · 5 🪙']});arriveAt(trip.place,'You made it to '+trip.place.name+' together! +2 trust with '+mounted.data.name+' · Trust '+v+' · 5 🪙 to collect');}
    else arriveAt(trip.place,'Welcome to '+trip.place.name+'.');}
  const loadPasses=()=>{try{return JSON.parse(localStorage.getItem(G.JUMP_KEY));}catch{return null;}};
  function jumpTo(id){const h=(mounted||called).data,j=G.useJump(loadPasses());try{localStorage.setItem(G.JUMP_KEY,JSON.stringify(j.passes));}catch{}
    const place=LOCATIONS.find(l=>l.id===id);travel(id);const dest=place.id==='summit'?LOCATIONS.find(l=>l.id==='mountain'):place;
    if(j.free){arriveAt(dest,'You jumped to '+dest.name+' with a free pass · '+j.left+' left today');return;}
    const v=addTrust(h.id,-G.JUMP_TRUST);arriveAt(dest,'You jumped to '+dest.name+'. No passes left today, so '+h.name+' lost '+G.JUMP_TRUST+' trust · Trust '+v);}
  function travel(id){playLog('place',{id,how:'jump'});let destination=LOCATIONS.find(l=>l.id===id)||LOCATIONS[0];if(destination.id==='summit')destination=LOCATIONS.find(l=>l.id==='mountain');setArea('outdoor');const wanted=destination.id==='stable'?{x:0,z:9.7}:destination;const offsets=[[0,7],[7,0],[-7,0],[0,-7],[6,6],[-6,6],[0,4],[0,0]],spot=offsets.map(([dx,dz])=>({x:wanted.x+dx,z:wanted.z+dz})).find(p=>!isBlocked(p.x,p.z,mounted?.8:.4))||{x:0,z:16};moveTo(spot.x,spot.z);tracked=destination.id;clearInput();tell('Welcome to '+destination.name+'. '+destination.description,6);}
  function markVisit(location){if(!adventure.visited.includes(location.id)){playLog('place',{id:location.id,first:true});adventure.visited.push(location.id);saveAdventure();queueCoins({from:'Discovered '+location.name,coins:25,lines:['Discovered '+location.name+' · 25 🪙']});tell('Discovered '+location.name+' · 25 🪙 to collect · '+adventure.visited.length+'/20 places'+(trustNote?'. '+trustNote:''),trustNote?6:4);trustNote='';}}
  // Arriving by map: discovering the place and the trust change share one message.
  function arriveAt(place,note){const fresh=!adventure.visited.includes(place.id);trustNote=note;markVisit(place);if(!fresh)tell(note,5);trustNote='';}
  // The Cloudstep climb: the clock starts as you ride under the stone arch and stops on the summit.
  const ARCH_PHI=.35,climbBest=()=>adventure.bestClimb?' Your best is '+(adventure.bestClimb/1000).toFixed(1)+' s.':'';
  function toTrailhead(){setArea('outdoor');const p=trailPoint(.02),q=trailPoint(-.12);moveTo(q.x,q.z);yaw=Math.atan2(q.x-p.x,q.z-p.z)+Math.PI;clearInput();tracked='summit';}
  function beginClimb(){tracked='summit';tell('Cloudstep Climb · ride the spiral trail three times round to the summit. The clock starts under the stone arch.'+climbBest(),8);}
  function raceClimb(){localRace=null;toTrailhead();tell('At the Cloudstep trailhead. Ride under the arch to start the clock, then race to the top!'+climbBest(),7);}
  function startPractice(){if(!mounted){tell('Mount your companion first, then begin your lap.');return;}setArea('outdoor');moveTo(RACE_GATES[3].x,RACE_GATES[3].z);yaw=-Math.PI/2;localRace={start:performance.now()+3000,index:0};tell('Practice lap · 3, 2, 1… Follow the four race gates in order.',5);}
  // The countryside steeplechase is its own page; it plays in a frame over the world so leaving it lands you back here.
  // Board games (board-*.html) use the same frame; 'trottville:close-board' brings you back to the gazebo.
  let steeple=null,steepleBack='Back at Clover Racecourse.';
  function openSteeple(src='steeplechase.html?in=world',title='Clover Steeplechase',back='Back at Clover Racecourse.'){if(steeple)return;clearInput();steepleBack=back;steeple=document.createElement('iframe');steeple.className='world-subgame';steeple.title=title;steeple.src=src;host.append(steeple);steeple.focus();}
  function closeSteeple(){if(!steeple)return;steeple.remove();steeple=null;tell(steepleBack,3);}
  on(window,'message',event=>{if(event.source!==steeple?.contentWindow)return;if(event.data==='trottville:close-steeple'||event.data==='trottville:close-board')closeSteeple();else if(event.data?.type==='trottville:steeple-finish'){const r=roomRace();if(r?.race.kind==='steeple'&&r.me?.racer&&r.me.finishMs==null&&r.phase==='running')network.finishRace(event.data.ms).catch(error=>tell(roomError(error),6));}});
  function boardMenu(){if(!BOARD_GAMES.length){tell('The game table is being set up. Come back soon!',4);return;}
    adventureUI.open('Games Gazebo',`<p>Pull up a stool. Pick a board game to play against the computer riders.</p><div class="board-shelf">${BOARD_GAMES.map(g=>`<button type="button" class="board-pick" data-board="${g.id}" style="--c:${g.color}"><span class="board-pick-icon" aria-hidden="true">${g.icon}</span><b>${g.name}</b><small>${g.blurb}</small></button>`).join('')}</div><h3 class="board-shelf-h">Valley games</h3><div class="board-shelf">${VALLEY_GAMES.map(g=>`<button type="button" class="board-pick" data-board="${g.id}" style="--c:${g.color}"><span class="board-pick-icon" aria-hidden="true">${g.icon}</span><b>${g.name}</b><small>${g.blurb}</small></button>`).join('')}</div>`);
    adventureUI.dialog.querySelectorAll('[data-board]').forEach(b=>b.onclick=()=>{const g=[...BOARD_GAMES,...VALLEY_GAMES].find(x=>x.id===b.dataset.board);adventureUI.close();openSteeple(g.file+'?in=world',g.name,'Back at the Games Gazebo.');});}
  // Vet, horse market and feed store screens come from ranch-ui.js (the same ones the website uses).
  let nearService=null;
  function openService(id){import('./ranch-ui.js').then(m=>{if(!m.get()?.herd.length){tell('Choose your first horse on the home page, then come back.',5);return;}clearInput();({vet:m.openVet,hoofhaven:m.openMarket,store:m.openStore})[id]?.();}).catch(()=>tell('That shop is closed right now. Try again in a moment.'));}
  function raceMenu(){adventureUI.open('A little friendly competition',`<p>Jump farm fences across open countryside, or ride the racecourse checkpoints.</p><button class="primary full" id="steeple-race">Countryside steeplechase</button><button class="secondary full" id="practice-race" style="margin-top:12px">Start practice lap</button><button class="secondary full" id="climb-race" style="margin-top:12px">Race to Cloudstep Summit</button><button class="primary full" id="friends-race" style="margin-top:12px">Race with friends</button>`);const gated=fn=>()=>{adventureUI.close();if(!mounted){tell('Races are on horseback. Ride here on your horse, then come back.',5);sfx('bonk');return;}needGear(()=>raceReady(fn));};adventureUI.dialog.querySelector('#steeple-race').onclick=gated(()=>openSteeple());adventureUI.dialog.querySelector('#practice-race').onclick=gated(startPractice);adventureUI.dialog.querySelector('#climb-race').onclick=gated(raceClimb);adventureUI.dialog.querySelector('#friends-race').onclick=gated(()=>{if(!network.v2){showFriends();return;}openInvite({race:'lap'});});}
  // ---------- Friends races: invites, Join, countdown, results for every race kind (friends.js, docs/friends-races-plan.md) ----------
  const myId=()=>testOn()?TEST_ME:window.MeadowCloud?.user?.id;
  let steepleRace=null,resultsShown=null,lastPhase='none',startedRace=null,lastBeep=0;
  function roomRace(){const s=network?.snapshot,race=s?.race;if(!race?.kind||!s.actors)return null;
    return {race,actors:s.actors,me:s.actors.find(a=>a.id===myId()),host:s.room?.hostId===myId(),phase:racePhase(race,s.actors,Date.now()+serverClockOffset)};}
  // The start line: Cloudstep's trailhead, or Clover's lap start. The steeplechase starts in its own scene.
  function toRaceStart(kind){if(kind==='summit'){climb=null;toTrailhead();}else if(kind==='lap'){setArea('outdoor');moveTo(RACE_GATES[3].x,RACE_GATES[3].z);yaw=-Math.PI/2;}localRace=null;}
  // Joining (or hosting) needs a horse: pick one, it appears beside you and you mount up.
  // Retired horses and foals don't race (riding.mjs canRaceHorse).
  const racer=h=>G.canRaceHorse(RanchUI.horse(h.data.id)||h.data);
  function raceReady(fn){if(mounted&&!racer(mounted)){tell(`${mounted.data.name} doesn’t race${mounted.data.retired?' now they’re retired':' yet'}. Hop off and pick another horse.`,6);return;}fn();}
  function pickHorseThen(fn){if(mounted&&racer(mounted)){fn();return;}if(mounted)dismount();
    if(!companions.some(racer)){tell('None of your horses can race right now.',6);return;}
    adventureUI.open('Pick your horse',`<p>Who are you racing on?</p>${companions.map((h,i)=>racer(h)?`<button class="secondary full" data-pick="${i}" style="margin-top:10px">${escapeHTML(h.data.name)}</button>`:'').join('')}`);
    adventureUI.dialog.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{adventureUI.close();const h=companions[+b.dataset.pick];setArea('outdoor');const x=position.x+1.6,z=position.z;h.area='outdoor';h.root.position.set(x,groundY(x,z),z);mount(h);if(mounted===h)fn();});}
  function joinRace(detail){needGear(()=>void joinRoomRace(detail));}
  async function joinRoomRace({roomId,race}){try{await network.adopt(roomId);}catch(error){tell(roomError(error),6);return;}
    closeSteeple();pickHorseThen(()=>{if(race!=='steeple')toRaceStart(race);tell(`You joined the ${raceName(race)}! Wait at the start for the countdown.`,7);});}
  async function startRoomRace(){const r=roomRace();if(!r)return;const button=$('#world-race-start');button.disabled=true;
    try{await network.startRace();}catch(error){tell(roomError(error),6);}finally{button.disabled=false;}}
  function showResults(r){sfx('fanfare');const order=standings(r.actors),info=RACES[r.race.kind];
    adventureUI.open(info.icon+' '+info.name,`<ol class="world-results">${order.map(a=>`<li${a.id===myId()?' class="me"':''}><b>${a.place?ordinal(a.place):'—'}</b><span>${escapeHTML(a.name)}</span><small>${a.finishMs!=null?raceTime(a.finishMs):'didn’t finish'}</small></li>`).join('')}</ol>${r.host?'<p class="adventure-fine">Tap Race again to rematch everyone at the start.</p>':''}`);}
  // Runs with the HUD (every ~180 ms): tells friends what you're doing, drives the start button, countdown and results.
  function updateRoomRace(){chooseMusic();const r=roomRace(),button=$('#world-race-start'),racing=r?.me?.racer&&(r.phase==='countdown'||r.phase==='running');
    window.TrottActivity=racing?'race':steeple||adventureUI?.dialog.open?'game':'roaming';
    if(!r||!r.me?.racer){button.hidden=true;lastPhase='none';return;}
    const racers=r.actors.filter(a=>a.racer),info=RACES[r.race.kind]||RACES.lap,now=Date.now()+serverClockOffset,s=(now-(r.race.startAt||now))/1000,hint=$('#world-quest-hint');
    // One pill for everyone (the quest panel is hidden on phones): the host's Start/Race again button, otherwise the race status.
    const canStart=r.host&&(r.phase==='gathering'||r.phase==='done'),hostName=r.actors.find(a=>a.id===network.snapshot.room?.hostId)?.name||'the host';
    let text=r.phase==='gathering'?(r.host?(racers.length<2?'Waiting for friends…':`Start race · ${racers.length} riders`):`${info.icon} Waiting for ${hostName} to start`)
      :r.phase==='countdown'?`${info.icon} Starts in ${Math.ceil(-s)}…`
      :r.phase==='running'?(r.me.finishMs!=null?`Finished · ${raceTime(r.me.finishMs)}`:r.race.kind==='steeple'?`Steeplechase · ${Math.floor(s)} s`:`${info.icon} ${s.toFixed(0)} s · ${r.me.raceIndex||0}/${info.goal}`)
      :r.host?`Race again · ${racers.length} riders`:'Race over';
    button.hidden=false;button.textContent=text;button.disabled=!canStart||racers.length<2;button.classList.toggle('status',!canStart);
    hint.textContent=r.phase==='running'&&r.race.kind!=='steeple'&&r.me.finishMs==null?`${info.name} ${s.toFixed(1)} s · ${r.me.raceIndex||0}/${info.goal} ${info.unit}`:text;
    // Everyone goes back to the start line when a race (or rematch) is started.
    if(r.phase==='countdown'&&startedRace!==r.race.id){startedRace=r.race.id;const ready=()=>tell(`${info.name}! Get ready…`,4);if(r.race.kind!=='steeple')pickHorseThen(()=>{toRaceStart(r.race.kind);ready();});else ready();}
    // The steeplechase is its own scene: it opens for every racer as the countdown ends, all on the same course.
    if(r.race.kind==='steeple'&&r.phase==='running'&&r.me.finishMs==null&&steepleRace!==r.race.id){steepleRace=r.race.id;closeSteeple();openSteeple(`steeplechase.html?in=world&race=${steepleSeed(r.race.id)}`,'Steeplechase race','Back from the steeplechase race.');}
    if(r.phase==='done'&&(lastPhase==='running'||lastPhase==='countdown')&&resultsShown!==r.race.id&&!steeple){resultsShown=r.race.id;showResults(r);}
    // Countdown beeps (3, 2, 1) and GO.
    if(r.phase==='countdown'){const left=Math.ceil(-s);if(left!==lastBeep&&left<=3){lastBeep=left;sfx('beep');}}else if(r.phase==='running'&&lastBeep>0){lastBeep=0;sfx('go');}
    if(r.phase!=='done'||!steeple)lastPhase=r.phase;}
  // Music by place (music.js): racing, a game page open, the barn, night or day out in the valley.
  function chooseMusic(){const r=roomRace(),h=sky.hours,night=h<5.75||h>=20.5;
    wantMusic(r?.me?.racer&&(r.phase==='countdown'||r.phase==='running')||localRace||climb?'race':steeple?'games':area==='barn'?'stall':night?'night':'valley');}
  on(window,'friends:join',event=>void joinRace(event.detail));
  on(window,'friends:invited',event=>needGear(()=>void invitedRace(event)));
  async function invitedRace(event){const kind=event.detail.race;/* a busy valley gives your race its own room */if(event.detail.roomId&&event.detail.roomId!==network.room?.id){try{await network.adopt(event.detail.roomId);}catch(error){tell(roomError(error),6);return;}}pickHorseThen(()=>{if(kind!=='steeple')toRaceStart(kind);tell(event.detail.count?'Invites sent! Wait here; tap Start race once your friends arrive.':'None of those friends could be invited right now.',7);});}
  on(window,'friends:named',()=>{if(network&&!network.room)void network.valley();});
  // Walk-up stations (world-stations.js): the camera glides to the station, the world fades, then the game opens.
  // When the game closes the camera glides back. The herding game plays here in the world instead.
  let morph=null,nearStationId=null;const herd=stations.herd;
  function nearStation(){if(area!=='outdoor')return null;return stations.list.find(s=>Math.hypot(s.x-position.x,s.z-position.z)<s.reach)||null;}
  function enterStation(s){if(s.kind==='boards'){boardMenu();return;}if(s.kind==='herd'){if(herd.active){herd.stop();tell('Round ended. The foals wander back to graze.',4);return;}if(!mounted){tell('Mount your horse first: foals only move for a rider. Then press Interact here.',6);return;}herd.start(Date.now(),(x,z,rad)=>blocked(x,z,rad,0,outdoorObstacles));tell('Herd the 4 foals into the pen! Ride round behind them; they trot away from you. Interact here to stop.',8);return;}
    clearInput();morph={station:s,t:0,phase:'in',from:camera.position.clone(),fromLook:cameraTarget.clone()};host.classList.add('world-morphing');}
  function stepMorph(delta){const m=morph,s=m.station,ease=t=>t*t*(3-2*t);
    if(m.phase==='in'){m.t=Math.min(1,m.t+delta/.9);const k=ease(m.t);camera.position.lerpVectors(m.from,new T.Vector3(...s.view.pos),k);const look=m.fromLook.clone().lerp(new T.Vector3(...s.view.look),k);camera.lookAt(look);
      if(m.t>=1){m.phase='fade';host.classList.add('world-morph-fade');}return true;}
    if(m.phase==='fade'){camera.position.set(...s.view.pos);camera.lookAt(...s.view.look);if(!m.opened){m.opened=true;requestAnimationFrame(()=>{adventureUI.showGame(s.id);m.phase='playing';});}return true;}
    if(m.phase==='playing'){camera.position.set(...s.view.pos);camera.lookAt(...s.view.look);if(!adventureUI.dialog.open){m.phase='out';m.t=0;host.classList.remove('world-morph-fade');}return true;}
    if(m.phase==='out'){m.t=Math.min(1,m.t+delta/.8);const k=ease(m.t);camera.position.lerpVectors(new T.Vector3(...s.view.pos),camera.position,k);camera.lookAt(new T.Vector3(...s.view.look).lerp(cameraTarget,k));if(m.t>=1){morph=null;host.classList.remove('world-morphing');}return true;}
    return false;}
  // Corn maze events: the foal's whinny (panned, plus words for players with sound off), finds, jumps and bringing it home.
  function cornEvent(ev){const heading=(mounted?mounted.root:avatar.root).rotation.y;
    if(ev.type==='enter'&&!cornTold){cornTold=true;tell(mounted?'The corn is taller than you. Listen for the foal’s whinny!':'The corn is taller than you, and the jumps inside are too high on foot. Better bring your horse!',6);}
    else if(ev.type==='whinny'){sfx('nicker',{pan:ev.pan,vol:.35+ev.vol*.75});const f=corn.foalPosition(),a=Math.atan2(f.x-position.x,f.z-position.z)-(yaw+Math.PI),s=Math.sin(a),c=Math.cos(a);
      tell('🐴 A whinny '+(c>.5?'up ahead':c<-.5?'behind you':s>0?'to your left':'to your right')+(ev.dist<12?', very close!':ev.dist<25?', not far.':', far off.'),3);}
    else if(ev.type==='found'){sfx('sparkle');sfx('nicker',{delay:.3});tell('You found the foal! Lead it back out of the gate. It will follow you, jumps and all.',6);}
    else if(ev.type==='collect'){const k=ev.kind==='golden'&&cornSave.golden?0:CORN_PAY[ev.kind]||0;if(ev.kind==='golden'){cornSave.golden=true;try{localStorage.setItem(CORN_KEY,JSON.stringify(cornSave));}catch{}}cornLoot+=k;sfx(ev.kind==='golden'?'chime':'coin');tell({apple:'🍎 An apple',horseshoe:'🧲 A lucky horseshoe',golden:'✨ The golden horseshoe!'}[ev.kind]+(k?' · +'+k+' 🪙':''),2.5);}
    else if(ev.type==='blocked-foot'){sfx('bonk',{vol:.6});tell('Too high to jump on foot. Fetch your horse to get through the corn maze!',4);}
    else if(ev.type==='lost'){tell('The foal lost sight of you and ran back into the corn.',4);}
    else if(ev.type==='leave'||ev.type==='home'){if(cornLoot>0){queueCoins({from:'Corn maze finds',coins:cornLoot,lines:['Corn maze finds · '+cornLoot+' 🪙']});cornLoot=0;}
      if(ev.type==='home'){sfx('fanfare');const q=quests?.isActive('maze')?quests.complete('maze'):null;
        if(q)tell('The foal is home! Quest done: '+q.title+'.',6);else if(!cornSave.home){queueCoins({from:'Corn maze',coins:20,lines:['Brought the lost foal home · 20 🪙']});tell('The foal is home safe · 20 🪙 to collect. The farmer by the gate may have a quest for you.',6);}else tell('The foal is home again. A new maze grows tomorrow!',5);
        cornSave.home=true;try{localStorage.setItem(CORN_KEY,JSON.stringify(cornSave));}catch{}playLog('cornmaze',{secs:ev.seconds,found:ev.collected?.length||0});}}}
  // Sky lift: on foot you sit in a chair; riding, you walk your horse onto the next railed horse platform and stay up.
  function boardLift(end){if(chair)return;const ride=skiLift.board(end,mounted?'horse':'seat');if(!ride)return;
    chair={ride,end};cancelWalk();moveSpeed=0;jump=0;jumpVelocity=0;slide=null;canter=false;
    sfx('buckle',{vol:.6});tell(mounted?(end==='top'?mounted.data.name+' steps onto the horse platform. Down over the valley!':mounted.data.name+' steps onto the horse platform. Up above the clouds!'):(end==='top'?'Off you go! Look around as you glide down over the valley.':'Up you go! The summit is above the clouds.'),5);}
  function leaveLift(){const end=chair.end;chair=null;skiLift.leave();let spot=skiLift.exitSpot(end);
    // Step off onto open ground (nudge round the station if something stands there).
    if(isBlocked(spot.x,spot.z,.6)){for(let r=1;r<8&&isBlocked(spot.x,spot.z,.6);r++)for(let k=0;k<8;k++){const p={x:spot.x+Math.cos(k*Math.PI/4)*r,z:spot.z+Math.sin(k*Math.PI/4)*r};if(!isBlocked(p.x,p.z,.6)){spot=p;break;}}}
    position.x=spot.x;position.z=spot.z;const actor=mounted?mounted.root:avatar.root;actor.position.set(position.x,groundY(position.x,position.z),position.z);
    tell(end==='top'?'Welcome to the valley station, between Little Leap School and the racecourse.':'Cloudstep Summit! The lookout rock has the best view.',5);}
  // ---- Step 3 activities: start, finish (Trotties once a day, best time kept), lookouts, fishing ----
  const actKey='trottville-activities-v1:'+storageKey;let actSave;try{actSave=JSON.parse(localStorage.getItem(actKey)||'null')||{};}catch{actSave={};}actSave.best||={};actSave.daily||={};actSave.fish||={};
  const saveActs=()=>{try{localStorage.setItem(actKey,JSON.stringify(actSave));}catch{}};
  const today=()=>new Date().toISOString().slice(0,10);
  function beginActivity(a){cancelWalk();if(a.mounted&&!mounted){tell(a.name+': saddle up first! This one is ridden.',4);sfx('bonk');return;}
    if(a.night&&skyNight<.5){tell('The owls are still asleep. Come back after dark for the '+a.name+'.',5);return;}
    if(a.kind==='hunt'){run=startRun(a,performance.now(),position);tell(a.icon+' '+a.how,6);return;}
    run=startRun(a,performance.now(),position);acts.setTarget(run);sfx('whistle');tell(a.icon+' '+a.name+'! '+a.how,6);}
  function endRun(note){if(note)tell(note,4);run=null;acts.setTarget(null);$('#world-quest-hint').textContent='';}
  function finishRun(a,ms){const s=(ms/1000).toFixed(1),best=actSave.best[a.id],fresh=best==null||ms<best;if(fresh)actSave.best[a.id]=ms;const paid=actSave.daily[a.id]===today();actSave.daily[a.id]=today();saveActs();
    endRun(null);sfx('cheer');markDone?.(a.id);
    const line=a.kind==='hunt'?'Found the golden pumpkin in '+s+' s':a.name+' in '+s+' s'+(fresh?' · new best!':' · best '+(best/1000).toFixed(1)+' s');
    if(!paid){const cid=queueCoins({from:a.name,coins:a.reward,lines:[line+' · '+a.reward+' 🪙']});if(cid){showCollect({title:a.icon+' '+a.name+'!',ids:[cid]});return;}}
    tell(line+(paid?' (today’s Trotties already paid; try again tomorrow).':''),6);}
  function openVista(l){vista=l;vistaPos.set(...l.pos);vistaLook.set(...l.look);tell(l.line+' Move to climb back down.',6);
    if(!actSave.daily['look-'+l.id]){actSave.daily['look-'+l.id]=1;saveActs();const cid=queueCoins({from:l.name,coins:5,lines:['A view from '+l.name+' · 5 🪙']});if(cid)showCollect({title:'What a view!',ids:[cid]});}}
  // Fishing at the end of Lily Lake's dock: cast, wait for the bobber to dip, tap in time. Ten paying fish a day.
  function openFishing(){if(fishing)return;const d=today();actSave.fish[d]||=0;
    const box=document.createElement('div');box.className='fish-box';box.innerHTML=`<style>.fish-box{position:absolute;left:50%;bottom:calc(120px + env(safe-area-inset-bottom));transform:translateX(-50%);width:min(340px,calc(100% - 32px));background:#fffaf0;border:3px solid #c89a64;border-radius:18px;padding:14px;text-align:center;font:600 16px system-ui,sans-serif;color:#3a2a22;z-index:30;box-shadow:0 8px 24px #0004}.fish-box p{margin:0 0 10px}.fish-box .bob{font-size:34px;line-height:44px;transition:transform .15s}.fish-box .bob.dip{transform:translateY(10px) scale(1.15)}.fish-box button{min-height:44px;min-width:44px;padding:0 18px;margin:4px;border-radius:12px;border:0;font:700 16px system-ui,sans-serif;background:#4f7d5a;color:#fff}.fish-box button.ghost{background:#e9dcc0;color:#3a2a22}</style><div class="bob" aria-hidden="true">🎣</div><p class="msg">Cast your line into Lily Lake.</p><button type="button" class="go">Cast</button><button type="button" class="ghost shut">Done</button>`;
    host.appendChild(box);const msg=box.querySelector('.msg'),go=box.querySelector('.go'),bob=box.querySelector('.bob');let state='idle',wait=0,bite=0;
    const close=()=>{fishing=null;box.remove();};box.querySelector('.shut').onclick=close;
    go.onclick=()=>{if(state==='idle'){state='wait';wait=performance.now()+1500+Math.random()*3000;bob.textContent='🪝';msg.textContent='Waiting for a bite…';go.textContent='Reel in';}
      else if(state==='bite'){state='idle';bob.classList.remove('dip');const f=pickFish(Math.random()),n=actSave.fish[d];bob.textContent=f.coins>=25?'🌟':f.coins?'🐟':'👢';
        const pays=f.coins>0&&n<10;if(f.coins>0)actSave.fish[d]=n+1;saveActs();msg.textContent=(f.coins?'You caught a '+f.name+'!':'An old boot. Ha!')+(pays?' +'+f.coins+' 🪙':f.coins?' (ten paying fish a day; this one swims free)':'');
        if(pays)queueCoins({from:'Lily Lake',coins:f.coins,lines:[f.name+' · '+f.coins+' 🪙']});sfx(f.coins?'cheer':'bonk');go.textContent='Cast again';}
      else{state='idle';bob.textContent='🎣';msg.textContent='Too soon! The fish swam off.';go.textContent='Cast again';}};
    fishing={tick(now){if(state==='wait'&&now>wait){state='bite';bite=now+900;bob.classList.add('dip');bob.textContent='🐟';msg.textContent='A bite! Tap Reel in!';sfx('splash');}
      else if(state==='bite'&&now>bite){state='idle';bob.classList.remove('dip');bob.textContent='🎣';msg.textContent='It got away. Cast again?';go.textContent='Cast again';}},close};}
  const nearAct=()=>{if(area!=='outdoor')return null;const x=position.x,z=position.z,d=(a,b)=>Math.hypot(a-x,b-z);
    const look=!mounted&&LOOKOUTS.find(l=>d(l.x,l.z)<l.reach);if(look)return {kind:'look',look,label:'Climb up to '+look.name};
    if(!mounted&&d(FISHING.x,FISHING.z)<FISHING.reach)return {kind:'fish',label:'Fish off the dock'};
    if(d(ARENA_POST.x,ARENA_POST.z)<4||d(ARENA_STEWARD.x,ARENA_STEWARD.z)<3.6)return {kind:'arena',label:'Show ring entries'};
    const h=HOSTS.find(h=>d(h.x,h.z)<3.4);if(h)return {kind:'host',h,label:ACTIVITY_BY_ID[h.activity].name+' with '+h.name};
    const a=ACTIVITIES.find(a=>!a.host&&d(a.start.x,a.start.z)<4);if(a)return {kind:'start',a,label:(run?.id===a.id?'Restart ':'')+a.name};
    const p=PUMPKINS.findIndex(p=>d(p.x,p.z)<1.9);if(p>=0)return {kind:'pumpkin',p,label:'Check this pumpkin'};
    return null;};
  // ---- Clover Downs Show Ring (v72): entries at the steward, rounds judged fence by fence, practice fences, rosettes ----
  const arenaSave=(actSave.arena||={best:{},paid:{},today:{},rosettes:[0,0,0,0],clears:0});
  let round=null,practicePrev=null,practiceSaid=0;
  function showArenaClass(id){const c=arenaCourse(today(),id);acts.arena.setCourse(c);paintArenaBoard(c);return c;}
  function paintArenaBoard(c){const t=arenaSave.today.day===today()?arenaSave.today[c.cls.id]:null,rows=arenaRivals(c).map(r=>({name:r.name,faults:r.faults,time:r.time}));
    if(t&&t.place)rows.push({name:'You',me:true,faults:t.faults,time:t.time});rows.sort((a,b)=>a.faults-b.faults||a.time-b.time);
    acts.arena.drawBoard({title:c.cls.name.toUpperCase(),sub:`${c.jumps} fences · ${c.allowed} s allowed · ${c.plan}`,rows:rows.map((r,i)=>({place:PLACE_NAME[i+1],name:r.name,me:r.me,score:`${r.faults} flt · ${r.time.toFixed(1)}s`}))});}
  function arenaNeeds(cls){if(!cls.show)return [];const h=(mounted||called)?.data;return entryNeeds(cls.show,{level:h?horseLevel(h.xp):0,upgradedSaddle:!!h&&G.upgraded(G.tackOf(h).saddle),hasOutfit:G.canShow(loadWallet())});}
  const ARENA_CSS='<style>.ar-cls{border:2px solid #e3cf9f;border-radius:14px;padding:10px 12px;margin:10px 0;display:grid;gap:6px}.ar-cls b{font-size:17px}.ar-cls span{font-size:14px;line-height:1.35}.ar-lock{color:#8a5a3c}.ar-shelf{font-weight:700;text-align:center}.ar-ros{--a:#2f6fb5;--b:#7fb0e8;--ink:#fff;width:124px;height:124px;margin:6px auto 30px;border-radius:50%;background:repeating-conic-gradient(var(--a) 0 10deg,var(--b) 10deg 20deg);display:grid;place-items:center;position:relative}.ar-ros span{width:74px;height:74px;border-radius:50%;background:var(--a);color:var(--ink);display:grid;place-items:center;font:800 20px system-ui,sans-serif;border:3px solid #ffffffaa;z-index:1}.ar-ros:before,.ar-ros:after{content:"";position:absolute;top:96px;width:28px;height:50px;background:var(--a);clip-path:polygon(0 0,100% 0,100% 100%,50% 82%,0 100%)}.ar-ros:before{left:34px;transform:rotate(14deg)}.ar-ros:after{right:34px;transform:rotate(-14deg)}.ar-tab{width:100%;border-collapse:collapse;font-size:15px}.ar-tab td{padding:6px 4px;border-bottom:1px solid #eadfca}.ar-tab tr.me td{font-weight:800;background:#fff3cf}.ar-tab td:last-child{text-align:right}</style>';
  function openArena(){const d=today(),t=arenaSave.today.day===d?arenaSave.today:{},c=arenaCourse(d,'open'),ros=arenaSave.rosettes;
    const rows=ARENA_CLASSES.map(k=>{const needs=arenaNeeds(k),r=t[k.id],cc=arenaCourse(d,k.id),paid=arenaSave.paid[k.id]===d;
      return `<div class="ar-cls"><b>${k.icon} ${k.name}</b><span>${k.blurb} ${cc.allowed} s allowed. Prizes ${k.prize.join(' / ')} 🪙${paid?' (today’s prize already won)':''}.</span>${r?`<span>Your best today: ${PLACE_NAME[r.place]} · ${r.faults} faults · ${r.time.toFixed(1)} s</span>`:''}${needs.length?`<span class="ar-lock">🔒 Needs ${needs.map(n=>n.id==='outfit'?'a '+n.text:n.text[0].toLowerCase()+n.text.slice(1)).join(', ')}</span>`:`<button class="primary full" data-cls="${k.id}">${round?.course.cls.id===k.id?'Start again':'Enter the '+k.name}</button>`}</div>`;}).join('');
    adventureUI.open('Clover Downs Show Ring',`${ARENA_CSS}<p>Marigold, the ring steward: “Today’s course is ${c.plan}. Jump the numbered fences in order, and tap Jump just before each one. The higher the fence, the faster you need to go. A rail down or a stop costs 4 faults, and each second over the time costs 1 more. Three stops and you’re out!”</p>${rows}<p class="ar-shelf">Rosettes: 🔵 ${ros[0]} · 🔴 ${ros[1]} · ⚪ ${ros[2]} · 🟡 ${ros[3]} · Clear rounds: ${arenaSave.clears}</p>`);
    adventureUI.dialog.querySelectorAll('[data-cls]').forEach(b=>b.onclick=()=>{adventureUI.close();enterClass(b.dataset.cls);});}
  function enterClass(id){if(!mounted){tell('The show ring is ridden. Saddle up and come back to Marigold!',4);sfx('bonk');return;}
    if(run)endRun(null);const c=showArenaClass(id);acts.arena.resetRails();round=startRound(c,performance.now());round.prev={x:position.x,z:position.z};acts.arena.setNext(0);sfx('chime');
    tell(`${c.cls.icon} ${c.cls.name}: ${c.jumps} fences, ${c.allowed} s allowed. Ride in through the gate. The clock starts at the flags!`,6);}
  function endRound(note){round=null;acts.arena.setNext(-1);$('#world-quest-hint').textContent='';if(note)tell(note,5);}
  const paceWord=f=>f.need>7?'a full gallop':f.need>5?'a canter':'a trot';
  function arenaTick(now){
    if(round){if(area!=='outdoor'||!mounted){endRound('Round stopped: you got off your horse.');return;}
      if(!round.started&&!inArena(position.x,position.z,60)){endRound('Entry cancelled: you rode away from the show ring.');return;}
      const ev=stepRound(round,{x:position.x,z:position.z,air:jump>.25,speed:moveSpeed},now);if(ev)arenaEvent(ev);return;}
    // Practice fences: judged either way, with a tip. Only on horseback.
    const here={x:position.x,z:position.z};
    if(mounted&&area==='outdoor'&&practicePrev&&Math.abs(here.x-PRACTICE[0].x)<10)for(const f of PRACTICE){const s=crossed(f,practicePrev,here);if(!s)continue;const how=judgeJump(f,{air:jump>.25,speed:moveSpeed}),name=mounted.data.name;
      if(how==='refusal'){moveTo(f.x,f.z-s*4);moveSpeed=0;sfx('snort');tell(`${name} stopped at the ${f.label} fence. Tap Jump just before the rails!`,3);here.x=position.x;here.z=position.z;}
      else if(how==='rail'){sfx('wood');tell(`Rail down! The ${f.label} fence needs ${paceWord(f)}.`,3);}
      else{sfx('sparkle');tell(`Clean over the ${f.label} fence!`,2);}break;}
    practicePrev=here;}
  function arenaEvent(ev){const name=(mounted||called).data.name;
    if(ev.type==='go'){sfx('go');tell('The clock is running! Follow the gold arrow to fence 1.',3);return;}
    if(ev.type==='retired'){sfx('bonk');endRound('You rode out of the ring, so the judges retired you. See Marigold to try again.');return;}
    if(ev.type==='clear'){sfx('sparkle');acts.arena.cheer();if(!ev.result)tell(`Clear over fence ${ev.f.n}!`,1.6);}
    else if(ev.type==='rail'){sfx('wood');acts.arena.knock(ev.f.n-1);tell(`Rail down at fence ${ev.f.n}: 4 faults. The ${ev.f.label} ones need ${paceWord(ev.f)}.`,3);}
    else{sfx('snort');moveTo(ev.back.x,ev.back.z);moveSpeed=0;round.prev={...ev.back};if(ev.type==='refusal')tell(`${name} stopped at fence ${ev.f.n}! That’s a refusal: 4 faults. Circle round and tap Jump just before the rails.`,4);}
    if(ev.result){finishRound(ev.result);return;}acts.arena.setNext(round.i);}
  function finishRound(res){const c=round.course,cls=c.cls,d=today();endRound(null);
    if(arenaSave.today.day!==d)arenaSave.today={day:d};const prev=arenaSave.today[cls.id],beats=(a,b)=>!b||!b.place||a.faults<b.faults||(a.faults===b.faults&&a.time<b.time);
    if(!res.eliminated&&beats(res,prev))arenaSave.today[cls.id]={place:res.place,faults:res.faults,time:res.time};
    const best=arenaSave.best[cls.id],fresh=!res.eliminated&&(!best||res.faults<best.faults||(res.faults===best.faults&&res.time<best.time));if(fresh)arenaSave.best[cls.id]={faults:res.faults,time:res.time,day:d};
    if(res.place)arenaSave.rosettes[res.place-1]++;if(res.clear&&!res.eliminated)arenaSave.clears++;
    const pay=res.place&&res.prize>0&&arenaSave.paid[cls.id]!==d;if(pay)arenaSave.paid[cls.id]=d;saveActs();paintArenaBoard(c);
    const cid=pay?queueCoins({from:cls.name,coins:res.prize,lines:[`${PLACE_NAME[res.place]} in the ${cls.name} · ${res.prize} 🪙`]}):null;
    if(res.eliminated)sfx('bonk');else{sfx('fanfare');acts.arena.cheer();}
    const [ca,cb]=ROSETTE[res.place],ink=res.place===3?'#3a2a22':'#fff';
    const table=res.all.map((r,i)=>`<tr class="${r.me?'me':''}"><td>${r.eliminated?'–':PLACE_NAME[i+1]}</td><td>${r.name}</td><td>${r.eliminated?'out':r.faults+(r.faults===1?' fault · ':' faults · ')+r.time.toFixed(1)+' s'}</td></tr>`).join('');
    const parts=[res.knock?`${res.knock} rail${res.knock>1?'s':''} down`:'',res.refuse?`${res.refuse} refusal${res.refuse>1?'s':''}`:'',res.timeFaults?`${res.timeFaults} time fault${res.timeFaults>1?'s':''}`:''].filter(Boolean).join(' · ');
    adventureUI.open(res.eliminated?'Eliminated':res.clear?'Clear round! 🏅':PLACE_NAME[res.place]+' place!',`${ARENA_CSS}<div class="ar-ros" style="--a:${ca};--b:${cb};--ink:${ink}"><span>${res.eliminated?'Out':PLACE_NAME[res.place]}</span></div>
      <p style="text-align:center">${res.eliminated?`${(mounted||called).data.name} stopped three times. Practise on the fences beside the ring and try again!`:`${cls.name} · ${res.time.toFixed(1)} s (${res.allowed} s allowed) · ${res.faults} faults${parts?' ('+parts+')':''}${fresh?' · your best ever!':''}`}</p>
      <table class="ar-tab">${table}</table>${pay?`<button class="primary full" id="ar-collect" style="margin-top:14px">Collect ${res.prize} Trotties</button>`:res.place&&res.prize?'<p style="text-align:center">You already won today’s prize in this class. Come back tomorrow!</p>':''}<button class="secondary full" id="ar-again" style="margin-top:10px">Go again</button>`);
    adventureUI.dialog.querySelector('#ar-again').onclick=()=>{adventureUI.close();enterClass(cls.id);};
    const col=adventureUI.dialog.querySelector('#ar-collect');if(col)col.onclick=()=>{adventureUI.close();if(cid)showCollect({title:`${cls.icon} ${PLACE_NAME[res.place]} in the ${cls.name}!`,ids:[cid]});};}
  showArenaClass('open');
  function actInteract(n){if(n.kind==='look'){openVista(n.look);return;}if(n.kind==='fish'){openFishing();return;}
    if(n.kind==='host'){tell(n.h.name+': '+n.h.lines[Math.floor(Date.now()/9000)%n.h.lines.length],4);beginActivity(ACTIVITY_BY_ID[n.h.activity]);return;}
    if(n.kind==='start'){beginActivity(n.a);return;}
    if(n.kind==='arena'){openArena();return;}
    if(n.kind==='pumpkin'){const a=ACTIVITY_BY_ID.pumpkins,g=acts.golden(today());if(n.p===g){finishRun(a,run?.id==='pumpkins'?performance.now()-run.t0:0);return;}
      const gp=PUMPKINS[g],me=PUMPKINS[n.p],dist=Math.hypot(gp.x-me.x,gp.z-me.z);tell(dist<6?'Just orange… but you’re very warm!':dist<14?'Plain orange. Warmer…':'Just a pumpkin. Colder!',3);sfx('bonk');}}
  function interact(){cancelWalk();if(adventureUI.dialog.open)return;if(chair){tell(mounted?'Stay in the saddle until the platform reaches the station.':'Sit tight! The chair lets you off at the station.',3);return;}
    if(area==='outdoor'){const ls=skiLift.near(position.x,position.z);if(ls){skiLift.openPanel(ls,{mounted:mounted?.data.name||null,onRide:()=>boardLift(ls)});return;}}
    if(nearCave()){enterCave();return;}
    if(area==='outdoor'&&mounted){const d=doorNear(position.x,position.z);if(d){const name=mounted.data.name;if(dismount()!==false)tell('You hop down at '+d.shop.name+'. '+name+' waits by the rail. Walk on in!',5);return;}}
    if(legendsWorld.interact(legendCtx()))return;
if(area==='barn'){if(nearDoor()){openDoors();return;}if(nearKeeper()){talkToHazel();return;}if(nearSaddler()&&!mounted){talkToOtis();return;}const station=INDOOR_GAMES.map(g=>({...g,distance:Math.hypot(g.x-position.x,g.z-position.z)})).sort((a,b)=>a.distance-b.distance)[0];if(station.distance<5)adventureUI.showGame(station.id);else adventureUI.showBarn();return;}
    {const n=nearAct();if(n){actInteract(n);return;}}
    {const g=quests?.near(position.x,position.z);if(g){quests.talk(g.id,{x:position.x,z:position.z,mounted:!!mounted});return;}}
    const station=nearStation();if(station){enterStation(station);return;}
    const service=SERVICES.map(s=>({...s,distance:Math.hypot(s.x-position.x,s.z-position.z)-(s.id==='hoofhaven'?9:3)})).sort((a,b)=>a.distance-b.distance)[0];
    if(service.distance<5){openService(service.id);return;}
    if((!nearestPlace||nearestPlace.distance>6)&&legendsWorld.stargaze(legendCtx()))return;
    if(!nearestPlace||nearestPlace.distance>6){tell('Move closer to a named place, or open the map to find your next stop.');return;}const place=nearestPlace;markVisit(place);if(place.id==='stable'){enterBarn();return;}if(place.id==='mountain'){beginClimb();return;}if(place.id==='race'){raceMenu();return;}
    const supply={orchard:'apples',market:'carrots',flowers:'flowers'}[place.id];if(supply){const day=new Date().toISOString().slice(0,10),key=supply+':'+day;if(adventure.daily[key]){tell('You gathered today’s '+supply+'. Come back tomorrow.');return;}adventure.daily[key]=true;adventure.supplies[supply]+=3;saveAdventure();const food={apples:{apple:3},carrots:{carrot:3}}[supply];if(food){const cid=queueCoins({from:place.name,coins:0,food,lines:['Today’s basket from '+place.name]});if(cid)showCollect({title:'A basket of '+supply+'!',ids:[cid],onDone:()=>{if(place.id==='market')openService('store');}});}else tell('Gathered 3 '+supply+' for your adventure basket!');return;}
    if(place.id==='market'){openService('store');return;}tell(place.name+' · '+place.description,6);
  }
  function updateAdventure(delta,now){expansion.tick(now);inShop=town.tick(now,{x:position.x,z:position.z,delta,outdoor:area==='outdoor'});
    // Step 3 activities: the running course, the stepping-stones, the fishing float, owls by night, the sleigh.
    if(run&&run.id!=='pumpkins'){const a=ACTIVITY_BY_ID[run.id];if(area!=='outdoor'||(a.mounted&&!mounted))endRun(a.name+' stopped: '+(a.mounted?'you got off your horse.':'you went inside.'));
      else if(runAbandoned(run,position))endRun(a.name+' stopped: you rode too far away.');
      else{const ev=stepRun(run,position,now);if(ev?.type==='next'){acts.setTarget(run);sfx('pop');}else if(ev?.type==='found'){sfx('sparkle');tell(a.icon+' Owl '+ev.n+' of '+a.points.length+'! Hoo-hoo.',3);}else if(ev?.type==='done')finishRun(a,ev.ms);}}
    arenaTick(now);
    if(area==='outdoor'){const i=lakeStone(position.x,position.z);if(i>=0&&!mounted){stoneRun||={lo:i,hi:i};stoneRun.lo=Math.min(stoneRun.lo,i);stoneRun.hi=Math.max(stoneRun.hi,i);
        if(stoneRun.lo===0&&stoneRun.hi===STONES.length-1&&!stoneRun.done){stoneRun.done=true;sfx('sparkle');if(actSave.daily.stones!==today()){actSave.daily.stones=today();saveActs();const cid=queueCoins({from:'Lily Lake',coins:10,lines:['Across the stepping-stones · 10 🪙']});if(cid)showCollect({title:'Across Lily Lake without a splash!',ids:[cid]});}else tell('Across the stepping-stones again! Not a single splash.',3);}}
      else if(stoneRun&&Math.hypot(position.x+209,position.z-3)>14)stoneRun=null;}
    fishing?.tick(now);if(fishing&&Math.hypot(position.x-FISHING.x,position.z-FISHING.z)>4)fishing.close();
    acts.golden(new Date().toISOString().slice(0,10));
    acts.tick(now,{x:position.x,z:position.z,night:skyNight>.5,sleighOn:run?.id==='sleigh',horse:mounted?{x:mounted.root.position.x,z:mounted.root.position.z,yaw:mounted.root.rotation.y}:null,delta});
    for(const {f,h} of hostFigs)if(Math.hypot(h.x-position.x,h.z-position.z)<60)f.update(delta,{pose:'stand'});
    // Rain gear (v71): hosts carry umbrellas, your poncho goes on by itself outdoors (not inside a shop).
    {const wet=isRaining();for(const {f} of hostFigs)f.setGear?.({umbrella:wet,color:'#3f6fb3'});avatar.char.setGear?.({poncho:wet&&!inShop&&hasPoncho});mounted?.tack.character?.setGear?.({poncho:wet&&hasPoncho});}
    if(area==='outdoor'&&mounted){const d=doorNear(position.x,position.z,4);if(d&&doorTold!==d){doorTold=d;tell(d.shop.name+': horses wait outside. Press Interact to hop down.',4);}if(!d)doorTold=null;}
    cloudstep.tick(now);skiLift.tick(delta);legendsWorld.update(delta,legendCtx());valleyLife.update(delta,{x:position.x,z:position.z,area,night:skyNight,rain:isRaining()});
    if(area==='outdoor'){
      nearestPlace=LOCATIONS.map(l=>({...l,distance:Math.hypot(l.x-position.x,l.z-position.z)})).sort((a,b)=>a.distance-b.distance)[0];
      if(nearestPlace.distance<5&&(nearestPlace.id!=='summit'||adventure.summit))markVisit(nearestPlace);
      {const st=nearStation();if(st&&st.id!==nearStationId&&!herd.active)tell(st.icon+' '+st.name+' · press Interact to '+(st.kind==='herd'?'start herding (ride in)':'play')+'.',4);nearStationId=st?.id||null;}
      if(herd.round){const r=herd.update(delta,{x:position.x,z:position.z,mounted:!!mounted},(x,z,rad)=>blocked(x,z,rad,0,outdoorObstacles));
        if(r?.done){markDone('herd');const cid=queueCoins({from:'Grapevine Paddock',coins:r.reward,lines:['All foals penned in '+r.seconds.toFixed(1)+' s · '+r.reward+' 🪙']});tell('All foals penned in '+r.seconds.toFixed(1)+' seconds!'+(r.fresh?' New best!':' Best '+r.best.toFixed(1)+' s.'),7);if(cid)showCollect({title:'Foals safely home!',ids:[cid]});}
        else if(r)tell(r.penned+' of 4 foals in the pen',3);
        else if(Math.hypot(position.x-stations.paddock.x,position.z-stations.paddock.z)>stations.paddock.r+25){const was=herd.active;herd.stop();if(was)tell('You rode away, so the foals went back to grazing.',4);}}
      {const sv=SERVICES.find(s=>Math.hypot(s.x-position.x,s.z-position.z)-(s.id==='hoofhaven'?9:3)<5);if(sv&&sv.id!==nearService)tell(sv.icon+' '+sv.name+' · press Interact to go in.',4);nearService=sv?.id||null;}
      {const phi=trailPhi(position.x,position.z),spot=phi==null?null:cloudstepAt(position.x,position.z);
        if(!climb&&climbPhi!=null&&phi!=null&&climbPhi<ARCH_PHI&&phi>=ARCH_PHI&&phi<ARCH_PHI+.4){climb={start:now};tell('The clock is running! Ride the spiral to the summit.',3);}
        if(climb&&(phi==null||phi<ARCH_PHI-.3)){climb=null;tell('You left the trail, so the climb clock stopped.',4);}
        if(spot?.region==='summit'){
          if(!adventure.summit){adventure.summit=true;saveAdventure();}markVisit(LOCATIONS.find(l=>l.id==='summit'));
          if(climb){sfx('fanfare');const ms=Math.round(now-climb.start),best=!adventure.bestClimb||ms<adventure.bestClimb;if(best)adventure.bestClimb=ms;saveAdventure();climb=null;tell('Cloudstep Summit in '+(ms/1000).toFixed(1)+' s!'+(best?' A new best!':climbBest())+' Stand on the lookout rock for the view.',8);}
          if(!lookoutSeen&&Math.hypot(position.x-CLOUDSTEP.rock.x,position.z-CLOUDSTEP.rock.z)<2){lookoutSeen=true;tell('From the lookout rock the whole valley is below you. That little barn far away is your stable.',8);}}
        else if(phi==null||phi<CLOUDSTEP.TURNS*Math.PI*2-.6)lookoutSeen=false;
        climbPhi=phi;}
      if(localRace&&now>=localRace.start&&mounted){const gate=RACE_GATES[localRace.index];if(gate&&Math.hypot(gate.x-position.x,gate.z-position.z)<4){localRace.index++;tell('Race checkpoint '+localRace.index+'/4');if(localRace.index===4){const elapsed=Math.round(now-localRace.start);adventure.bestLap=adventure.bestLap?Math.min(adventure.bestLap,elapsed):elapsed;saveAdventure();tell('Lap complete! '+(elapsed/1000).toFixed(1)+' seconds. Your best is '+(adventure.bestLap/1000).toFixed(1)+' seconds.',8);localRace=null;}}}
    }else nearestPlace=null;
    for(const peer of peers.values()){peer.group.visible=peer.area===area&&Date.now()-peer.seen<16000;if(!peer.group.visible)continue;peer.group.position.lerp(peer.target,1-Math.exp(-delta*10));const difference=Math.atan2(Math.sin(peer.yaw-peer.group.rotation.y),Math.cos(peer.yaw-peer.group.rotation.y));peer.group.rotation.y+=difference*Math.min(1,delta*10);peer.label.position.set(peer.group.position.x,peer.group.position.y+(peer.mounted?5.3:2.8),peer.group.position.z);peer.label.visible=peer.group.visible;if(peer.mounted){const m=peer.horses.get(peer.mounted);if(m){m.update(delta);m.tack.update(delta,{jumpT:m.jumpT,speed:.4});}}}
  }
  // The action pill: the Interact button is icon-only, so a small pill above it says what it will do here ("Talk to Clem",
  // "Enter the cave"). Hidden when there's nothing special to do; tapping it is the same as tapping the button.
  // Touch screens drop the "· F" key hint; blocked actions ("hop down first") show muted.
  const touchOnly=matchMedia('(hover: none)').matches;let pillText='';
  function paintPrompt(text){const pill=$('#world-prompt');if(!pill)return;const plain=/^(Explore|Explore nearby)( · F)?$/.test(text)||talkingNow();
    const words=(touchOnly?text.replace(/ · F$/,''):text).replace(/^Cave · hop down first/,'Hop down to enter the cave');
    if(plain){pill.hidden=true;pillText='';return;}
    if(words!==pillText){pillText=words;pill.querySelector('span').textContent=words;pill.classList.toggle('is-muted',/hop down|first/i.test(words));pill.hidden=false;pill.classList.remove('pop');void pill.offsetWidth;pill.classList.add('pop');pill.setAttribute('aria-label',words);}}
  const talkingNow=()=>!!quests?.isTalking?.();
  function updateAdventureHUD(){const qlist=questList(adventure),done=qlist.filter(q=>q.have>=q.goal).length;$('#world-journal-count').textContent=done+'/'+qlist.length;$('#world-map-count').textContent=adventure.visited.length+'/20';
    let prompt=area==='barn'?'Barn games · F':'Explore · F';if(area==='barn'){if(nearDoor())prompt='Open the doors · F';else if(nearKeeper())prompt='Talk to '+SHOPKEEPER.name+' · F';else{const station=INDOOR_GAMES.find(g=>Math.hypot(g.x-position.x,g.z-position.z)<5);if(station)prompt=station.name+' · F';}}else if(nearestPlace?.distance<6)prompt=(nearestPlace.id==='stable'?'Enter barn':nearestPlace.id==='mountain'?'Cloudstep Climb':nearestPlace.id==='race'?'Race':nearestPlace.name)+' · F';if(area==='outdoor'){const lp=legendsWorld.prompt(legendCtx())||(nearestPlace?.distance<6?null:legendsWorld.stargazePrompt(legendCtx()));if(lp)prompt=lp+' · F';if(nearCave())prompt=(mounted?'Cave · hop down first':'Enter the cave')+' · F';}
    // What Interact will do here, spelled out (same order interact() checks): ski lift, cave, quest giver, game station, service.
    if(area==='outdoor'&&!nearCave()){if(skiLift.near(position.x,position.z))prompt='Ride the sky lift · F';else if(!legendsWorld.prompt(legendCtx())){const qg=quests?.near(position.x,position.z),st=!qg&&nearStation(),sv=!qg&&!st&&SERVICES.find(s=>Math.hypot(s.x-position.x,s.z-position.z)-(s.id==='hoofhaven'?9:3)<5);
      if(qg)prompt='Talk to '+qg.name+' · F';else if(st)prompt=(st.kind==='game'?'Play ':'')+st.name+' · F';else if(sv)prompt=sv.name+' · F';}
      if(mounted&&doorNear(position.x,position.z))prompt='Hop down to go in · F';{const n=nearAct();if(n)prompt=n.label+' · F';}}
    setButtonLabel('#world-interact',prompt);paintPrompt(prompt);
    if(area==='barn')$('#world-location').textContent='Inside your barn';else if(inShop)$('#world-location').textContent='Inside '+inShop.shop.name;else if(area==='outdoor'&&Math.hypot(position.x-FOUNTAIN.x,position.z-FOUNTAIN.z)<PLAZA_R+16)$('#world-location').textContent='Bramble Village';else if(area==='outdoor'&&inSnow(position.x,position.z)&&!(nearestPlace?.distance<12))$('#world-location').textContent='Snowy Pines';else if(nearestPlace?.distance<12)$('#world-location').textContent=nearestPlace.name;else if(wildBiome&&wildBiome!=='valley')$('#world-location').textContent=BIOMES[wildBiome].name;
    if(tracked){const target=LOCATIONS.find(l=>l.id===tracked),dist=Math.round(Math.hypot(target.x-position.x,target.z-position.z));$('#world-track').hidden=false;$('#world-track').textContent=target.name+' · '+dist+' m';
      // Compass arrow: the target's direction as seen through the camera (screen up = straight ahead).
      if(hud){camera.updateMatrixWorld();const a=_hudA.set(target.x,0,target.z).applyMatrix4(camera.matrixWorldInverse),b=_hudB.set(position.x,0,position.z).applyMatrix4(camera.matrixWorldInverse);hud.track(target.name,dist,Math.atan2(a.x-b.x,-(a.z-b.z)));}}
    else if(round&&hud){const c=round.course,t=round.started?c.fences[Math.min(round.i,c.jumps-1)]:{x:ARENA.x+ARENA.gateU,z:ARENA.z+ARENA.startV},dist=Math.round(Math.hypot(t.x-position.x,t.z-position.z));$('#world-track').hidden=true;   // the show ring: clock, faults and a compass to the next fence
      camera.updateMatrixWorld();const a=_hudA.set(t.x,0,t.z).applyMatrix4(camera.matrixWorldInverse),b=_hudB.set(position.x,0,position.z).applyMatrix4(camera.matrixWorldInverse);hud.track(roundStatus(round,position,performance.now()),dist,Math.atan2(a.x-b.x,-(a.z-b.z)));}
    else{$('#world-track').hidden=true;hud?.track(null);}
    if(climb)$('#world-quest-hint').textContent='Cloudstep climb '+((performance.now()-climb.start)/1000).toFixed(1)+' s'+(adventure.bestClimb?' · best '+(adventure.bestClimb/1000).toFixed(1)+' s':'');
    if(localRace){const seconds=(performance.now()-localRace.start)/1000;$('#world-quest-hint').textContent=seconds<0?'Race begins in '+Math.ceil(-seconds)+'…':'Practice lap '+seconds.toFixed(1)+' s · '+localRace.index+'/4 gates';}
    if(run&&run.id!=='pumpkins')$('#world-quest-hint').textContent=runStatus(run,position,performance.now());else if(round)$('#world-quest-hint').textContent=roundStatus(round,position,performance.now());
    updateRoomRace();
  }
  function renderPeers(data){serverClockOffset=(data.serverNow||Date.now())-Date.now();const seenIds=new Set();for(const actor of data.actors||[]){if(actor.id===myId())continue;seenIds.add(actor.id);let peer=peers.get(actor.id);if(!peer){const group=new T.Group(),person=figure(lookFromSeed(actor.id));group.add(person.root);scene.add(group);peer={group,person,horses:new Map(),target:new T.Vector3(),yaw:0,label:label(actor.name,0,3,0,2.5),area:'outdoor',seen:Date.now(),mounted:null};peers.set(actor.id,peer);}peer.name=actor.name;
      const state=actor.state||{},horseId=state.horseId;peer.area=state.area;peer.seen=Date.now();peer.target.set(Number(state.x)||0,Number(state.y)||0,Number(state.z)||0);peer.yaw=Number(state.yaw)||0;
      if(horseId){if(!peer.horses.has(horseId)){const model=makeSculptedHorse(T,{id:horseId},{geometry:geo});model.tack=addTackAndRider(T,model,{look:lookFromSeed(actor.id)});model.setGait('trot');peer.horses.set(horseId,model);peer.group.add(model.root);}const horse=peer.horses.get(horseId);horse.anchor.add(peer.person.root);peer.person.root.position.set(0,-.70,0);peer.person.root.visible=false;}else{peer.group.add(peer.person.root);peer.person.root.visible=true;peer.person.root.position.set(0,0,0);}peer.mounted=horseId||null;peer.horses.forEach((model,id)=>model.root.visible=id===horseId);
    }for(const [id,peer]of peers)if(!seenIds.has(id)){peer.group.visible=false;peer.label.visible=false;}
  }
  function showFriends(){const cloud=window.MeadowCloud;/* v2: usernames + invites replace room codes */if(network.v2||!network.available){openFriends();return;}if(!network.available){adventureUI.open('Bring a friend along',`<p>Sign in to a game account to host or join a private room.</p><a class="primary" href="#account">Open your account</a><p class="adventure-fine">Google sign-in needs provider setup. Email accounts require confirmation and working email delivery. Your friend also needs access to this private site; a room code alone does not grant it.</p>`);return;}
    const room=network.room;adventureUI.open('Your private riding room',room?`<p><b>${escapeHTML(room.name)}</b> · Up to eight riders</p><label>Room code<input readonly value="${room.code}" id="room-code"></label><button class="secondary" id="copy-room">Copy room code</button><div class="room-roster">${(network.snapshot?.actors||[]).map(a=>`<p>● ${escapeHTML(a.name)} ${a.id===room.hostId?'· Host':''} ${a.finishMs?'· '+(a.finishMs/1000).toFixed(1)+' s':network.snapshot?.race?.id?'· '+a.raceIndex+'/4 gates':''}</p>`).join('')}</div><button class="primary full" id="room-race">Start shared race · Host only</button><button class="secondary full" id="room-leave" style="margin-top:10px">Leave room${room.hostId===cloud.user.id?' & close it':''}</button><p class="adventure-fine">Give the code to an approved private-site viewer. Gather mounted at Clover Racecourse before starting. Casual playtest races have no currency or prizes.</p>`:`<p>Create a room or join one using its invite code. Your game account identifies you.</p><label>Rider name<input id="room-name" maxlength="24" value="${escapeHTML(cloud.displayName)}"></label><button class="primary full" id="room-create">Host a private valley</button><label style="margin-top:20px">Room code<input id="room-join-code" maxlength="12" placeholder="12-character invite code"></label><button class="secondary full" id="room-join">Join a friend</button><p class="adventure-fine">The site stays private. Your friend must have site access and a working game sign-in before joining.</p>`);
    const message=document.createElement('p');message.className='game-feedback';message.setAttribute('role','status');adventureUI.dialog.querySelector('.adventure-body').append(message);
    const run=async action=>{try{message.textContent='Connecting…';await action();adventureUI.close();tell(network.room?'Connected to your private room.':'You left the private room.');}catch(error){message.textContent=roomError(error);}};
    if(room){adventureUI.dialog.querySelector('#copy-room').onclick=async()=>{try{await navigator.clipboard.writeText(room.code);message.textContent='Room code copied.';}catch{adventureUI.dialog.querySelector('#room-code').select();message.textContent='Select and copy this room code.';}};adventureUI.dialog.querySelector('#room-race').onclick=()=>run(()=>network.startRace());adventureUI.dialog.querySelector('#room-leave').onclick=()=>run(()=>network.leave());}
    else{adventureUI.dialog.querySelector('#room-create').onclick=()=>run(()=>network.create(adventureUI.dialog.querySelector('#room-name').value));adventureUI.dialog.querySelector('#room-join').onclick=()=>run(()=>network.join(adventureUI.dialog.querySelector('#room-join-code').value,adventureUI.dialog.querySelector('#room-name').value));}
  }
  const worldAPI={open:true,groundY:(x,z)=>chunks.surfaceHeight(x,z),defaultRace:()=>nearestPlace?.id==='race'&&nearestPlace.distance<30?'lap':'summit'};
  function installAdventure(){
    let roomConnected=false,nameNagged=false;
    network=createWorldNetwork({getState(){/* the room server (202611110001) takes the nine regions (±310) and y≤110; v2 takes the wild land and the 100 m summit */const actor=mounted?mounted.root:avatar.root,wide=network?.v2,edge=v=>wide?Math.max(-19999,Math.min(19999,v)):Math.max(-309,Math.min(309,v));return {x:edge(position.x),z:edge(position.z),y:wide?Math.max(-20,Math.min(130,actor.position.y)):Math.max(-5,Math.min(109,actor.position.y)),yaw:actor.rotation.y,area,horseId:mounted?.data.id||null,horseName:mounted?.data.name||''};},onUpdate:renderPeers,onStatus(status,message){if(status==='connected'){$('#world-room-status').textContent=message;if(!roomConnected){const others=(network.snapshot?.actors?.length||1)-1;tell(network.room?.public?(others?`${others} other rider${others===1?' is':'s are'} out in the valley. Tap one to see who they are.`:'You’re in the valley. Other riders show up here when they’re online.'):'Riding room connected.',5);}roomConnected=true;}else if(status==='solo'){roomConnected=false;$('#world-room-status').textContent='Solo playtest';}else if(status==='name'){if(!nameNagged){nameNagged=true;tell('Pick a username (Friends button) to meet other riders.',6);}}else if(status==='reconnecting')$('#world-room-status').textContent='Reconnecting…';},onProgress(remote){Object.assign(adventure,normalizeAdventure(remote));saveAdventure();}});
    // friends.js reads this: invites need the world open; the race you're nearest is the default pick.
    window.TrottWorld=worldAPI;
    worldMap=createWorldMap(host,{obstacles:outdoorObstacles.filter(o=>!o.maze),visited:()=>adventure.visited,player:()=>({x:position.x,z:position.z,h:(mounted?mounted.root:avatar.root).rotation.y}),info:mapInfo,quests:()=>quests?.mapPins()||[],today:()=>todayActivities({daily:adventure.daily||{},done:loadDone(),visited:adventure.visited,player:{x:position.x,z:position.z}}),snow:()=>({cover:sky.snowCover,fall:area==='outdoor'?sky.snowFall:0}),onRide:rideTo,onJump:jumpTo,onClose:clearInput,
      // Smugglers' Grotto has no place of its own: its pin rides/jumps you to the Old Stone Arch next to it.
      extraPins:()=>[...SHOP_PINS,...ACT_PINS,{id:'grotto',name:"Smugglers' Grotto",x:CAVE.x,z:CAVE.z,kind:'secret',icon:'🕳️',go:'ruins',seen:!!adventure.grotto,description:'A smugglers’ cave in the cliff just past the Old Stone Arch. Hop down and walk in on foot.'}]});
    adventureUI=createAdventureUI(host,{progress:adventure,horses,preferred:preferredHorse,storageKey,area:()=>area,onTrack:id=>tracked=id,onTravel:travel,onEnterBarn:enterBarn,onShowMap:g=>worldMap.open({x:g.x,z:g.z}),onChange:saveAdventure,onGameComplete(id){const action={hay:'feed',water:'feed',feed:'feed',fling:'feed',groom:'groom',muck:'groom',tack:'bond'}[id];if(id==='hay')horses.forEach(h=>onBarnCare(h.id,action));else onBarnCare((mounted||called).data.id,action);if(id!=='feed'&&id!=='fling'){const cid=queueCoins({from:'Barn game',coins:20,lines:['Barn game finished · 20 🪙']});if(cid)showCollect({title:'Lovely work!',ids:[cid]});}tell('Lovely work! Daily '+action+' care is shared with your web stable.');},onClose:clearInput});
    // Side quests (note #26, world-quests.js): givers around the valley, Talk, the Quest Log and the quest clock.
    quests=createWorldQuests({T,outdoors,groundY:(x,z)=>chunks.surfaceHeight(x,z),prep:seeThrough,tell,adventureUI,host:$('#world-stage')||host,camera,storageKey,onPin:a=>{const t=a.target||a;if(t&&t.x!=null)worldMap.open({x:t.x,z:t.z});else worldMap.open();}});
    hud=createHud({stage:$('#world-stage')||host});updateHUD();
    {const ib=$('#world-interact'),pl=document.createElement('button');pl.type='button';pl.id='world-prompt';pl.className='world-prompt';pl.hidden=true;const ic=ib.querySelector('.px-ic');pl.innerHTML=(ic?ic.outerHTML:'')+'<span></span>';ib.after(pl);on(pl,'click',()=>ib.click());}
    const tool=fn=>()=>{cancelWalk();closeCompactPanels();fn();};on($('#world-map'),'click',tool(()=>worldMap.open()));on($('#world-style'),'click',tool(()=>{designer=openDesigner(host,{onSave(l,reverted){applyLook(l);tell(reverted?reverted+' is still locked, so you kept your last outfit. Earn Trotties in barn games and rides.':'Looking good! Your rider wears this on every horse.',5);},onClose(){designer=null;clearInput();view.focus({preventScroll:true});}});}));on($('#world-journal'),'click',tool(adventureUI.showQuests));on($('#world-barn'),'click',tool(adventureUI.showBarn));on($('#world-friends'),'click',tool(showFriends));on($('#world-interact'),'click',interact);
    on($('#world-race-start'),'click',startRoomRace);
    const fullButton=$('#world-fullscreen');
    function fullLabel(){const active=document.fullscreenElement===host||host.classList.contains('world-fullscreen');setButtonLabel('#world-fullscreen',active?'Exit browser fullscreen':'Enter browser fullscreen');document.body.classList.toggle('has-world-fullscreen',active);}
    on(fullButton,'click',async()=>{if(document.fullscreenElement===host){await document.exitFullscreen();}else if(host.classList.contains('world-fullscreen'))host.classList.remove('world-fullscreen');else{try{if(!host.requestFullscreen)throw Error();await host.requestFullscreen();}catch{host.classList.add('world-fullscreen');}}fullLabel();});on(document,'fullscreenchange',fullLabel);
    // On phones the world goes properly full screen as it opens (the tap that opened it still counts as a gesture); quietly skipped if refused.
    if(matchMedia('(pointer:coarse)').matches&&!document.fullscreenElement&&host.requestFullscreen)host.requestFullscreen({navigationUI:'hide'}).then(fullLabel,()=>{});on(window,'keydown',event=>{if(event.key==='Escape'&&host.classList.contains('world-fullscreen')){host.classList.remove('world-fullscreen');fullLabel();}});
    paintCounters();host.__world={outdoorsGroup:outdoors,arenaDemo(rails=[]){if(!round)return null;const c=round.course,go=(x,z,o,t)=>{const ev=stepRound(round,{x,z,...o},t);if(ev)arenaEvent(ev);return ev;};go(ARENA.x+ARENA.gateU,ARENA.z+ARENA.startV-1,{},0);go(ARENA.x+ARENA.gateU,ARENA.z+ARENA.startV+1,{},performance.now()-30000);let last;for(const f of c.fences.slice(0,c.jumps)){if(!round)break;const o={air:true,speed:rails.includes(f.n)?f.need-1:9};go(f.x-f.dx*.5,f.z-f.dz*.5,o,0);last=go(f.x+f.dx*.5,f.z+f.dz*.5,o,performance.now());}return last?.result||null;},setHours(h){sky.preview.hours=h;},advance(steps=1,dt=1/30){for(let i=0;i<steps;i++){const t=performance.now();lastTime=t-dt*1000;frame(t);cancelAnimationFrame(raf);}},snap(){renderer.render(scene,camera);return renderer.domElement.toDataURL('image/jpeg',.7);},legends:legendsWorld,sky,actorObj:()=>mounted?mounted.root:avatar.root,mountCalled:()=>{const h=called;h.root.position.set(position.x+1.5,groundY(position.x+1.5,position.z),position.z);mount(h);return mounted?.data.id||null;},walkTo:(x,z)=>walkTo({x,z}),teleport:(x,z,y)=>{setArea('outdoor');moveTo(x,z);if(y!=null)yaw=y;},cave:CAVE,blocked:(x,z,r=.6)=>isBlocked(x,z,r),life:valleyLife,lift:()=>({on:skiLift.isOn(),chair:chair?{end:chair.end,p:+chair.ride.progress().toFixed(3),y:+chairY.toFixed(1)}:null,near:skiLift.near(position.x,position.z),L:skiLift.layout.L}),skiLift,boardLift,actor(){const a=mounted?mounted.root:avatar.root;return {y:+a.position.y.toFixed(2),g:+groundY(position.x,position.z).toFixed(2),x:+position.x.toFixed(1),z:+position.z.toFixed(1),yaw:+yaw.toFixed(2),area,climb:!!climb,phi:climbPhi};},race:()=>raceClimb(),probe(x,z){const rc=new T.Raycaster(new T.Vector3(x,400,z),new T.Vector3(0,-1,0));rc.camera=camera;const hits=rc.intersectObjects(scene.children,true).filter(h=>h.object.isMesh&&h.object.visible&&!h.object.isSprite).slice(0,3).map(h=>({y:+h.point.y.toFixed(2),n:h.object.name||h.object.parent?.name||h.object.geometry?.type}));return {g:+groundY(x,z).toFixed(2),hits};},moveTo,interact,outdoor:()=>setArea('outdoor'),barnDoor:()=>expansion.door,sliding:()=>!!slide,look:(y,p)=>{yaw=y;if(p!=null)pitch=p;},riding:()=>mounted?.data.id||null,motion:()=>({speed:+moveSpeed.toFixed(2),gait:(mounted||called).model.gait,stick:!!stick,x:+position.x.toFixed(1),z:+position.z.toFixed(1)}),peerOnScreen(name){const p=[...peers.values()].find(q=>q.name===name&&q.group.visible);if(!p)return null;const r=renderer.domElement.getBoundingClientRect(),v=new T.Vector3(p.group.position.x,p.group.position.y+(p.mounted?1.6:1),p.group.position.z).project(camera);return {x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height};},horseOnScreen(id){const h=companions.find(c=>c.data.id===id)||called,r=renderer.domElement.getBoundingClientRect(),v=new T.Vector3(h.root.position.x,h.root.position.y+1.9*h.scale,h.root.position.z).project(camera);return {x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height,id:h.data.id};}};markVisit(LOCATIONS[0]);startInStall();void network.loadProgress(adventure);{let pending=null;try{pending=JSON.parse(sessionStorage.getItem('trottville-join')||'null');sessionStorage.removeItem('trottville-join');}catch{}if(pending&&Date.now()-pending.at<120000)void joinRace(pending);else void network.resume();}updateAdventureHUD();if(intent){const [kind,id]=intent.split(':');if(kind==='game'){const g=BARN_GAMES.find(x=>x.id===id);if(g?.where==='outdoor')worldMap.open({x:g.x,z:g.z});else adventureUI.showGame(id);}else if(kind==='map')worldMap.open();else if(kind==='me')$('#world-style').click();else if(kind==='tackroom'){if(walkTo(TACK_SPOT)){doOnArrival=()=>talkToOtis();tell('Walking to Otis in the Tack Room.',3);}}else if(kind==='steeple')openSteeple();else if(kind==='barn')adventureUI.showBarn();}
  }

  // The wild lands: keep chunks loaded around you, move the sun (and its shadows) with you, tint the sky to
  // the biome and say its name when you cross into a new one.
  let wildBiome='valley',wildCheck=0,leftValley=false,cameraLift=0,altitude=0;
  function updateWild(delta,now){chunks.update(position.x,position.z,false,altitude>.5?1:0);
    if(now-wildCheck>500){wildCheck=now;const b=biomeAt(position.x,position.z);if(b!==wildBiome){if(b!=='valley'){if(!leftValley){leftValley=true;tell('You left the valley. The land goes on forever; the map always brings you home.',6);}else tell(BIOMES[b].name,3.5);}else tell('Back in the valley.',3);wildBiome=b;}}
    }
  function frame(now){if(disposed)return;raf=requestAnimationFrame(frame);const delta=Math.max(0,Math.min((now-lastTime)/1000,.05));lastTime=Math.max(lastTime,now);if(document.hidden)return;
    const paused=!!adventureUI?.dialog.open||!!steeple||!!worldMap?.isOpen||!!designer;
    if(!paused){if(keys.has('arrowleft'))yaw+=delta*1.6;if(keys.has('arrowright'))yaw-=delta*1.6;if(keys.has('arrowup'))pitch=Math.max(.08,pitch-delta*.8);if(keys.has('arrowdown'))pitch=Math.min(.8,pitch+delta*.8);}
    const horizontal=paused?0:(keys.has('d')?1:0)-(keys.has('a')?1:0);
    const forward=paused?0:(keys.has('w')?1:0)-(keys.has('s')?1:0);
    // Speed builds up naturally: the thumbstick sets it by how far you drag, a tapped route by how far is left to go.
    let sx=horizontal,sz=forward,target=0;
    if(sx||sz)target=keys.has('shift')?(mounted?9:5.2):(mounted?5.2:3.25);
    else if(stick&&!paused){const len=Math.hypot(stick.dx,stick.dy);if(len>14){const m=Math.min(1,(len-14)/96);sx=stick.dx/len;sz=-stick.dy/len;target=mounted?2.2+m*7.6:1.4+m*3.9;}}
    else if(walkGoal){let left=walkPath.length?Math.hypot(walkPath[0].x-position.x,walkPath[0].z-position.z):0;for(let i=1;i<walkPath.length;i++)left+=Math.hypot(walkPath[i].x-walkPath[i-1].x,walkPath[i].z-walkPath[i-1].z);target=mounted?(left>18?9.4:left>7?5.4:2.6):(left>14?5.2:3.25);}
    if(mounted&&ride)target=G.allowedSpeed(target,ride.stamina,ride.stats);
    if(target>0)moveSpeed=Math.max(moveSpeed,mounted?1.8:1.2);moveSpeed+=(target-moveSpeed)*(1-Math.exp(-delta*(target>moveSpeed?1.5:4)));
    const fast=moveSpeed>(mounted?7:4.4);let speed=moveSpeed*(area==='outdoor'?G.gripSpeed(sky.fx.speed,mounted&&ride?ride.shoes.grip:0):1),v=movementVector(sx,sz,yaw);
    if(sx||sz)cancelWalk();
    else if(!paused&&walkGoal&&!chair){const steering=steeringStep(position,walkPath,speed,delta);v=steering.vector;speed=steering.speed;if(!walkPath.length){const trip=mapTrip,horse=mountOnArrival,then=doOnArrival;cancelWalk();arrived(trip);then?.();if(horse){if(Math.hypot(horse.root.position.x-position.x,horse.root.position.z-position.z)<3.6)mount(horse);else tell(horse.data.name+' wandered off. Tap them again.',3);}}}
    // The Free Bridle answers the reins more slowly: when you steer yourself, the heading swings round instead of snapping.
    if(mounted&&ride&&!walkGoal&&(v.x||v.z)){const want=Math.atan2(v.x,v.z),len=Math.hypot(v.x,v.z);if(ride.heading==null)ride.heading=mounted.root.rotation.y;
      ride.heading+=Math.atan2(Math.sin(want-ride.heading),Math.cos(want-ride.heading))*Math.min(1,delta*ride.stats.turn);v={x:Math.sin(ride.heading)*len,z:Math.cos(ride.heading)*len};}
    else if(ride)ride.heading=null;
    if(chair)v={x:0,z:0};
    const moving=!!(v.x||v.z);
    if(jumpVelocity||jump){jumpVelocity-=12*delta;jump=Math.max(0,jump+jumpVelocity*delta);if(jump===0){if(jumpVelocity<-1)sfx(mounted?'thud':'thump',{vol:mounted?.9:.5});jumpVelocity=0;}}
    const next=slide?{x:position.x,z:position.z}:moveActor(position,v,speed,delta,mounted?.7:.36,jump,area==='barn'?indoorList():outdoorList());let distance=Math.hypot(next.x-position.x,next.z-position.z);totalDistance+=distance;Object.assign(position,next);
    // Too steep (world-logic tooSteep): you never walk through a mountain. Pushing up a slope that's too steep skids you
    // back down it; stepping off the top of one slides you down it. Either way you go downhill in a spray of dirt until
    // the ground is gentle again, and the slide can't pass anything solid.
    if(area==='outdoor'&&moving&&!slide&&distance<speed*Math.min(delta,.05)*.5){const ax=position.x+v.x*1.2,az=position.z+v.z*1.2;
      if(tooSteep(ax,az)){const up=groundHeight(ax,az)>groundHeight(position.x,position.z);slide={up,t:0,speed:up?Math.max(4,speed*.8):Math.max(5,speed*.9),x:0,z:0,from:{x:ax,z:az}};moveSpeed*=.3;cancelWalk();
        if(now>steepToldAt){steepToldAt=now+6000;tell(up?`Too steep to climb! ${mounted?mounted.data.name+' slid':'You slid'} back down.`:`Whoa! ${mounted?mounted.data.name+' skids':'You skid'} down the slope.`,3);}}}
    if(slide){slide.t+=delta;const at=slide.t<.05&&slide.up?slide.from:position,g=slopeAt(at.x,at.z),l=Math.hypot(g.gx,g.gz)||1;
      if(slide.t<.05||tooSteep(position.x,position.z)){slide.x=-g.gx/l;slide.z=-g.gz/l;}
      const steepHere=tooSteep(position.x,position.z),k=steepHere?1:Math.max(0,1-(slide.t-(slide.flatAt??slide.t))/.5);if(!steepHere&&slide.flatAt==null)slide.flatAt=slide.t;
      const step=slide.speed*k*Math.min(delta,.05),nx=position.x+slide.x*step,nz=position.z+slide.z*step,r=mounted?.7:.36;
      const before={x:position.x,z:position.z};if(!solidBlocked(nx,position.z,r,0,outdoorObstacles))position.x=nx;if(!solidBlocked(position.x,nz,r,0,outdoorObstacles))position.z=nz;
      distance+=Math.hypot(position.x-before.x,position.z-before.z);dust.emit(position.x,groundY(position.x,position.z),position.z,delta,.4+k);
      if(k<=0||slide.t>8||area!=='outdoor')slide=null;}
    dust.update(delta);
    // Strong wind (windy days, thunderstorms) nudges you sideways while you move.
    if(moving&&area==='outdoor'&&sky.fx.wind>.6){const push=moveActor(position,{x:sky.fx.windX,z:sky.fx.windZ},(sky.fx.wind-.5)*1.6,delta,mounted?.7:.36,jump,outdoorList());Object.assign(position,push);}
    if(mounted&&ride&&!paused){const was=ride.stamina.overheated,low=ride.stamina.value<25;ride.stamina=G.staminaStep(ride.stamina,distance/Math.max(delta,1e-4),delta,ride.care);
      if(!was&&ride.stamina.overheated)tell(`${mounted.data.name} is overheating! Slow to a walk and let them cool down.`,6);
      else if(was&&!ride.stamina.overheated)tell(`${mounted.data.name} has their breath back.`,3);
      else if(!low&&ride.stamina.value<25&&!ride.stamina.overheated&&!ride.warned){ride.warned=true;tell('Stamina is getting low. Ease off before your horse overheats.',4);}
      if(ride.stamina.value>60)ride.warned=false;}
    paintStamina();
    if(mounted&&area==='outdoor'&&distance>0)rodeFor(distance);phase+=delta*(moving?(mounted?(fast?13:9):8):1.7);
    if(walkGoal&&!paused){walkStalled=distance<.0001?walkStalled+delta:0;if(walkStalled>.7){cancelWalk();tell('The way is blocked. Try another patch of ground.',3);}}
    if(chair&&!paused){const pt=chair.ride.point();position.x=pt.x;position.z=pt.z;chairY=pt.seatY;(mounted?mounted.root:avatar.root).rotation.y=pt.yaw;if(chair.ride.done)leaveLift();}
    updateAdventure(delta,now);if(area==='outdoor')updateWild(delta,now);
    const actor=mounted?mounted.root:avatar.root;actor.position.set(position.x,chair?(mounted?chairY:chairY+(avatar.char.seatOffset?.()??-.88)*(avatar.char.root.scale.y||1)):groundY(position.x,position.z)+(mounted?0:jump),position.z);
    if(moving&&!chair){let angle=Math.atan2(v.x,v.z),difference=Math.atan2(Math.sin(angle-actor.rotation.y),Math.cos(angle-actor.rotation.y));actor.rotation.y+=difference*Math.min(1,delta*12);}
    // Follow camera: while you steer with the thumbstick or follow a tapped route, the camera swings round behind your heading,
    // so you rarely need two fingers to look. Holding the stick to one side keeps turning that way; running back toward the camera doesn't spin it.
    if(moving&&(stick||walkGoal)&&!pinchMid){const behind=actor.rotation.y-Math.PI,d=Math.atan2(Math.sin(behind-yaw),Math.cos(behind-yaw));if(Math.abs(d)<2.3)yaw+=d*Math.min(1,delta*(stick?.85:1.6))*Math.min(1,speed/2.5);}
    companions.forEach((h,i)=>{if(h.arriving&&!paused)arrive(h,delta);const isRiding=h===mounted,isMoving=isRiding&&distance>.001,gait=h.arriving?h.arriving.gait:isMoving?(moveSpeed>7?'canter':moveSpeed>3.6?'trot':'walk'):'stand';if(h.model.gait!==gait)h.model.setGait(gait);if(h.root.visible){h.model.update(delta);h.tack.update(delta,{jumpT:h.model.jumpT,speed:{stand:0,walk:.2,trot:.4,canter:.7,gallop:1}[gait]});}h.root.visible=h.area===area;h.name.visible=h.root.visible&&h!==mounted&&area!=='barn';h.name.position.set(h.root.position.x,h.root.position.y+4.5*h.scale,h.root.position.z);});
    if(!mounted)avatar.update(delta,{pose:chair?'sit':moving?'walk':'stand',fast:fast&&moving});
    // Hoofbeats: one beat per stride (walk 1, trot 2, canter 3 quick hits), on boards in the barn, turf outside.
    if(mounted&&distance>.001&&jump<=.001&&!paused){hoofDist+=distance;const g=mounted.model.gait,stride={walk:1.25,trot:2,canter:3.1}[g];
      if(stride&&hoofDist>=stride){hoofDist=0;const kind=area==='barn'?'wood':'thump',hits={walk:[0],trot:[0,.09],canter:[0,.07,.15]}[g];hits.forEach((d,i)=>sfx(kind,{delay:d,vol:.55+i*.1,pan:i%2?.15:-.15}));}}
    if(area==='outdoor'&&mounted&&distance>.001){const previous=stamps[mounted.data.id]||[],list=collectMarkers(position,previous);const changed=list.length>previous.length;if(changed){const marker=MARKERS[list.at(-1)];tell(list.length===5?'All five found! A complete meadow loop with '+mounted.data.name+'.':'Meadow stamp '+list.length+' of 5 · '+marker.name,5);}if(changed){stamps[mounted.data.id]=list;try{localStorage.setItem(stampKey,JSON.stringify(stamps));}catch{tell('Stamp collected for this visit. Device storage is unavailable.');}updateStamps();}}
    const currentStamps=mounted?(stamps[mounted.data.id]||[]):[];gates.forEach((g,i)=>{const done=currentStamps.includes(i);g.ring.material=mat(done?'#96b882':'#e5b45f');if(!reducedMotion)g.ring.rotation.y=now*.0006;g.number.visible=!done;});
    // In the corn maze the camera drops below the corn tops (0→1 over ~1 s), so you can't see over the walls.
    cornCam+=((area==='outdoor'&&inMaze(position.x,position.z)?1:0)-cornCam)*(1-Math.exp(-delta*3));shopCam+=((inShop?1:0)-shopCam)*(1-Math.exp(-delta*3));
    aim.set(position.x,(chair?chairY+(mounted?0:.9):groundY(position.x,position.z))+(mounted?(3.1-1.15*cornCam)*mounted.scale:1.45-.15*cornCam)+jump*.65,position.z);cameraTarget.lerp(aim,reducedMotion?1:1-Math.exp(-delta*8));
    const camPitch=pitch+(Math.min(pitch,.08)-pitch)*cornCam+Math.max(0,.62-pitch)*shopCam,camDist=((cameraDistance+(mounted?2:0))*(1-cornCam)+Math.min(cameraDistance,4.5)*cornCam+(chair?6:0))*(1-shopCam)+Math.min(cameraDistance,8)*shopCam;
    const desired=followCameraPosition(cameraTarget,yaw,camPitch,camDist);cameraDirection.set(desired.x-cameraTarget.x,desired.y-cameraTarget.y,desired.z-cameraTarget.z);const radius=cameraDirection.length();cameraDirection.normalize();cameraRay.set(cameraTarget,cameraDirection);cameraRay.far=radius;barn.updateMatrixWorld(true);const obstruction=cameraRay.intersectObjects(area==='barn'?expansion.walls:[barn],true)[0];let safeDistance=obstruction?Math.max(1.8,obstruction.distance-.55):radius;if(area==='outdoor'&&(wildness(position.x,position.z)>0||onCloudstep(position.x,position.z))){/* wild hills: tilt the camera up (smoothly) until the hillside behind you no longer hides you, then pull in if still needed */
      const hits=(dir,len)=>{for(let d=1;d<len;d+=.8)if(groundHeight(cameraTarget.x+dir.x*d,cameraTarget.z+dir.z*d)+.5>cameraTarget.y+dir.y*d)return d;return 0;},look=p=>{const alt=followCameraPosition(cameraTarget,yaw,p,cameraDistance+(mounted?2:0));return cameraDirection.set(alt.x-cameraTarget.x,alt.y-cameraTarget.y,alt.z-cameraTarget.z).normalize();};
      let need=0;while(pitch+need<.8&&hits(look(pitch+need),safeDistance))need+=.06;cameraLift+=(need-cameraLift)*(1-Math.exp(-delta*5));look(pitch+cameraLift);const hit=hits(cameraDirection,safeDistance);if(hit)safeDistance=Math.max(1.8,hit-.4);}else cameraLift=0;camera.position.copy(cameraTarget).addScaledVector(cameraDirection,safeDistance);sightU.uSightA.value.copy(camera.position);sightU.uSightB.value.copy(cameraTarget);camera.position.y=Math.max(camera.position.y,(area==='barn'?0:groundHeight(camera.position.x,camera.position.z))+.65);camera.lookAt(cameraTarget);
    // Talking to someone: glide in to a close-up of their face (and back out when it ends); you turn to face them.
    {const tv=area==='outdoor'&&quests?.isTalking()?quests.talkView([...companions.filter(h=>h.root.visible).map(h=>({x:h.root.position.x,z:h.root.position.z,r:1.6*h.scale})),...(mounted?[]:[{x:position.x,z:position.z,r:.5}])]):null;if(tv){talkPos.copy(tv.pos);talkLook.copy(tv.look);if(!moving){const a=Math.atan2(tv.face.x-position.x,tv.face.z-position.z),d=Math.atan2(Math.sin(a-actor.rotation.y),Math.cos(a-actor.rotation.y));actor.rotation.y+=d*Math.min(1,delta*6);}}
      talkK+=((tv?1:0)-talkK)*(reducedMotion?1:1-Math.exp(-delta*3.2));if(talkK<.002)talkK=0;
      if(talkK){const k=talkK*talkK*(3-2*talkK);_talkAt.copy(cameraTarget).lerp(talkLook,k);camera.position.lerp(talkPos,k);camera.lookAt(_talkAt);sightU.uSightA.value.copy(camera.position);sightU.uSightB.value.copy(_talkAt);}}
    // A lookout (treehouse, lighthouse lamp): the camera climbs up for the view; any movement brings it back down.
    {if(vista&&moving)vista=null;vistaK+=((vista?1:0)-vistaK)*(reducedMotion?1:1-Math.exp(-delta*2.4));if(vistaK<.002)vistaK=0;
      if(vistaK){const k=vistaK*vistaK*(3-2*vistaK);_talkAt.copy(cameraTarget).lerp(vistaLook,k);camera.position.lerp(vistaPos,k);camera.lookAt(_talkAt);sightU.uSightA.value.copy(camera.position);sightU.uSightB.value.copy(_talkAt);}}
    // The barn: the doors' swing, Hazel's greeting as you walk into the shop, and no horses past the shop door.
      if(area==='barn'){expansion.door.update(delta);keeper?.update(delta,{pose:'stand'});
        const shop=inStore(position.x,position.z);if(shop&&!wasInShop&&!mounted){tell(SHOPKEEPER.name+': '+shopGreeting({hours:sky.hours,weather:sky.kind,visits:hazel.visits,outfit:outfitOf(look).name}),5);hazel.visits++;saveHazel();}wasInShop=shop;
        if(mounted&&position.x>HALL_X-1.4&&Math.abs(position.z-STORE.doorZ)<2.1&&performance.now()/1000-lastNoHorse>6){lastNoHorse=performance.now()/1000;tell(SHOPKEEPER.name+': '+NO_HORSES[Math.floor(lastNoHorse)%NO_HORSES.length],4);}}
      const skyNow=sky.update(delta,{x:position.x,y:area==='outdoor'?groundY(position.x,position.z):0,z:position.z,biome:wildBiome==='valley'?'meadow':wildBiome,tint:wildBiome==='valley'?null:BIOMES[wildBiome].sky,outdoors:area==='outdoor'});skyNight=skyNow.night??0;snowU.uSnow.value=area==='outdoor'?skyNow.cover:0;
    // High on Cloudstep the haze thins and the view opens out over the valley (and the ground streams further).
    altitude=area==='outdoor'?Math.min(1,Math.max(0,cameraTarget.y-12)/70):0;scene.fog.near+=altitude*70;scene.fog.far+=altitude*140;camera.far=260+altitude*150;camera.updateProjectionMatrix();
    if(cornActive!==(area==='outdoor')){cornActive=area==='outdoor';corn.setActive(cornActive);}
    if(cornActive)for(const ev of corn.update(delta,{x:position.x,z:position.z,y:groundY(position.x,position.z)+jump,heading:(mounted?mounted.root:avatar.root).rotation.y,mounted:!!mounted,jump},0))cornEvent(ev);
    quests?.update(delta,{x:position.x,z:position.z,mounted:!!mounted,speed:moveSpeed,area,rain:isRaining()});
    lanterns.update(skyNow.night??0,{x:position.x,y:area==='outdoor'?groundY(position.x,position.z):0,z:position.z,outdoors:area==='outdoor'});
    if(skyNow.labelChanged)$('#world-weather').textContent=skyNow.label;if(skyNow.changed&&!paused)tell(WEATHER_NEWS[skyNow.kind],6);
    if(morph)stepMorph(delta);
    if((!paused||morph?.phase==='fade')&&(!renderer.simpleGraphics||now-lastRender>=100)){renderer.render(scene,camera);lastRender=now;}
    if(now-lastHUD>180){lastHUD=now;updateHUD();updateAdventureHUD();if(now>messageUntil)$('#world-message').classList.add('quiet');}
  }
  installAdventure();updateHUD();tell(startNote?startNote+' Drag to steer · two fingers to look.':'Tap to go · Press and drag to steer · Two fingers to look.',startNote?8:5);frame(performance.now());
  return {dispose(){disposed=true;lanterns.dispose();quests?.dispose();hud?.dispose();corn.dispose();skiLift.dispose();legendsWorld.dispose();valleyLife.dispose();worldAPI.open=false;if(window.TrottWorld===worldAPI)window.TrottWorld=null;window.TrottActivity='roaming';if(document.fullscreenElement===host)document.exitFullscreen?.().catch(()=>{});sky.dispose();myStall.dispose();expansion.disposeBarn?.();keeper.dispose?.();mannequins.forEach(m=>m.dispose?.());try{audio?.close();}catch{}document.body.classList.remove('has-world-fullscreen');if(document.fullscreenElement===host)document.exitFullscreen().catch(()=>{});cancelAnimationFrame(raf);observer.disconnect();adventureUI?.dispose();network?.dispose();listeners.forEach(remove=>remove());chunks.dispose();stations.dispose();cloudstep.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}};
}
