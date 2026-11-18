import {makeChibiCharacter} from './chibi-character.js?v=157';import {setPeopleLight,resetPeopleLight} from './vroid-character.js?v=157';
import {loadLook,saveLook,lookFromSeed} from './character-looks.mjs?v=157';
import {queueCoins,showCollect,paintCounters} from './coin-collect.js?v=157';
import {openDesigner} from './character-designer.js?v=157';
import {watchReturn} from './star-shop.js?v=157';
import {log as playLog} from './play-log.js?v=157';
import {makeSculptedHorse} from './horse-sculpt.js?v=157';
import {addTackAndRider} from './rider-sculpt.js?v=157';
import {buildExpansion,buildSkyWorld,SKY} from './world-expansion.js?v=157';
import {SQUARE} from './world-regions.mjs?v=157';
import {buildTown,doorNear,SHOP_PARTS,FOUNTAIN,PLAZA_R,buildActivities,ACTIVITIES,ACTIVITY_BY_ID,HOSTS,LOOKOUTS,FISHING,PUMPKINS,lakeStone,STONES,startRun,stepRun,runStatus,runAbandoned,pickFish,inSnow,ARENA,ARENA_POST,ARENA_STEWARD,ARENA_CLASSES,arenaCourse,arenaRivals,startRound,stepRound,roundStatus,inArena,PRACTICE,crossed,judgeJump,PLACE_NAME,ROSETTE} from './world-town.mjs?v=157';
// The walk-in shops on the map (they open from the village square; the vet is its own place by the home trail).
// The step 3 activities on the map; fast travel takes you to the nearest named place.
const nearestLoc=(x,z)=>LOCATIONS.reduce((b,l)=>Math.hypot(l.x-x,l.z-z)<Math.hypot(b.x-x,b.z-z)?l:b).id;
const ACT_PINS=[{id:'act-arena',name:'Clover Downs Show Ring',x:ARENA.x,z:ARENA.z,kind:'activity',icon:'🎀',go:nearestLoc(ARENA_POST.x,ARENA_POST.z),seen:true,description:'Show jumping, open to all: ride in on your horse and jump the numbered fences in order for a rosette. Practice fences beside the ring.'},...ACTIVITIES.map(a=>{const p=a.host?HOSTS.find(h=>h.id===a.host):a.start;return {id:'act-'+a.id,name:a.name,x:p.x,z:p.z,kind:'activity',icon:a.icon,go:nearestLoc(p.x,p.z),seen:true,description:a.how+(a.night?' (after dark)':'')};}),
  {id:'act-stones',name:'Lily Lake stepping-stones',x:STONES[0].x,z:STONES[0].z,kind:'activity',icon:'🪨',go:'pond',seen:true,description:'Hop across the lake on foot, stone to stone.'},
  {id:'act-fish',name:'Fishing dock',x:FISHING.x,z:FISHING.z,kind:'activity',icon:'🎣',go:'pond',seen:true,description:'Cast off the end of the dock and tap when the float dips.'},
  {id:'act-tree',name:'Treehouse camp',x:LOOKOUTS[0].x,z:LOOKOUTS[0].z,kind:'activity',icon:'🌳',go:'forest',seen:true,description:'Climb the ladder for a view over Mosswood.'}];
const SHOP_PINS=SHOP_PARTS.map(({shop:s})=>({id:'shop-'+s.id,name:s.name,x:s.x,z:s.z,kind:'village',icon:{bakery:'🥐',post:'✉️',hall:'🏛️',store:'🛒',vet:'🩺',hut:'🛖',dairy:'🐄',lighthouse:'🗼'}[s.kind]||'🏠',go:s.id==='vet'?'home':'village',seen:true,description:'Walk in on foot; your horse waits at the rail outside.'}));
import {createAdventureUI} from './adventure-ui.js?v=157';
import {buildStations} from './world-stations.js?v=157';
import {BOARD_GAMES} from './board-games.mjs?v=157';
import {VALLEY_GAMES} from './valley-games.mjs?v=157';
import {createWorldQuests} from './world-quests.js?v=157';
import {R,REGIONS,regionAt} from './world-regions.mjs?v=157';
import {createHud} from './world-hud.js?v=157';
import {cornLayout,CORN,inMaze} from './world-cornmaze.mjs?v=157';
import {createCornMaze} from './world-cornmaze-3d.js?v=157';
import {createWorldMap} from './world-map.js?v=157';
import {todayActivities,loadDone,markDone} from './world-today.mjs?v=157';
import {createWorldNetwork,roomError} from './world-network.js?v=157';
import {openFriends,openProfile,openInvite} from './friends.js?v=157';
import {testOn,TEST_ME} from './test-friends.js?v=157';
import {sfx,hoofLoop,voiceRate,ambLoop,ambStop,npcVoice} from './sfx.js?v=157';
import {want as wantMusic} from './music.js?v=157';
import * as G from './riding.mjs?v=157';
import * as RanchUI from './ranch-ui.js?v=157';
import {newHorse,condition,level as horseLevel,marketStock,dayNo as dayNumber,makeCoat,breedOf,COATS} from './ranch.mjs?v=157';
import {isMidnight,isSighting} from './legends.mjs?v=157';
import {entryNeeds} from './show-course.mjs?v=157';
import {loadWallet,saveWallet,buyOutfit,OUTFITS,outfitOf,buyGear,GEAR_ITEMS,coinWords,WINTER_GEAR} from './character-looks.mjs?v=157';
import {BAYS,inStore,DOOR,COUNTER,KEEPER,STORE,HALL_X,MARKET,inMarketHall} from './barn-interior.js?v=157';
import {SHOPKEEPER,greeting as shopGreeting,tip as shopTip,pitch as shopPitch,chatter as shopChatter,NO_HORSES} from './shop-talk.mjs?v=157';
import {RACES,raceName,racePhase,standings,ordinal,raceTime,steepleSeed,safeName} from './friends-logic.mjs?v=157';
import {FIELDS,RIVERS,riverAt,bridgeFloor,SKYGATE,TOWN2,FARMS,terrainHeight as farmGround,LOCATIONS,MAP_PATHS,BARN_GAMES,INDOOR_GAMES,RACE_GATES,SERVICES,normalizeAdventure,questList,fogBits,fogString,fogMark,onBridge,onCobbles} from './world-content.mjs?v=157';
import {CLOUDSTEP,cloudstepAt,onCloudstep,trailPhi,climbRoute,trailPoint,trailRadius,START as CLIMB_START,TRAIL_END} from './world-cloudstep.mjs?v=157';
import {terrainTextures,addTerrain,createGrass} from './world-terrain.js?v=157';
import {buildCloudstep} from './world-cloudstep-3d.js?v=157';
import {buildSkiLift,VALLEY_STATION} from './world-skilift.js?v=157';
import {createValleyLife} from './world-life.js?v=157';
import {createLegends} from './world-legends.js?v=157';
import * as T from './vendor/three-0.180.0/three.module.js?v=157';
import {MARKERS,OBSTACLES,groundHeight,movementVector,moveActor,blocked,normalizeStamps,collectMarkers,followCameraPosition,tooSteep,slopeAt,solidBlocked} from './world-logic.mjs?v=157';
import {SoftwareRenderer} from './world-renderer.js?v=157';
import {findGroundPath,steeringStep} from './world-navigation.mjs?v=157';
import {createChunks,bakeTree,treeGeometry,treeOut,TREE_PALS} from './world-chunks.js?v=157';
import {createLanterns} from './world-lanterns.js?v=157';
import {buildTudorShop,detailTextures,detailKind,addDetail,squareProps,forestLogs} from './world-tudor.js?v=157';
import {BIOMES,biomeAt,wildness,roadDistance,ROAD_HALF} from './world-wild.mjs?v=157';
import {createSky,createGlow,createMotes,waterize,WATER_TIME,WATER_NIGHT} from './world-sky.js?v=157';
import {buildStall} from './stall-scene.js?v=157';
import {createHomeHorse} from './home-horse.js?v=157';
// What each collect activity calls the things you find (v106: it said “Owl” for everything).
const FOUND_WORDS={owls:['Owl','Hoo-hoo.'],sheaves:['Sheaf',''],posies:['Posy',''],lanterns:['Lantern','It glows.'],eggs:['Egg','Careful, don’t drop it!'],piglets:['Piglet','It trots off home. Oink!']};
import {loadStall} from './stall-decor.mjs?v=157';
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
  const _pl=new T.Color();const sun=new T.DirectionalLight('#fff0d0',3.1);sun.position.set(-18,36,20);sun.castShadow=true;
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
        if(k>0.){vec2 p=mod(floor(gl_FragCoord.xy),4.);float b=mod(p.x*8.+p.y*4.+mod(p.x,2.)*2.+mod(p.y,2.)*1.,16.)/16.;if(b<k*.85)discard;}}}`);
    if(m.userData.det)addDetail(sh,m.userData.det,DT[m.userData.det],detU);};
    m.customProgramCacheKey=()=>'sight'+(m.userData.det||'');return m;}
  // v147 detail layer (world-tudor.js): plain colours get grain / stone / leaf / paint, following ✨ Pretty effects.
  const DT=detailTextures(T),detU={value:(()=>{try{return localStorage.getItem('trottville-gfx')==='lite'||localStorage.getItem('trottville-detail-off')?0:1;}catch{return 1;}})()};
  const mat=(color,extra={})=>{const key=color+JSON.stringify(extra,(k,v)=>v?.isTexture?v.uuid:v);if(!materials.has(key)){const m=new T.MeshStandardMaterial({color,roughness:1,flatShading:true,...extra});
    if(!extra.map&&!extra.transparent&&!extra.emissive&&!extra.alphaMap&&!extra.vertexColors&&typeof color==='string'){const k=detailKind(T,color);if(k)m.userData.det=k;}
    materials.set(key,seeThrough(m));}return materials.get(key);};
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
  const TER=terrainTextures(T),groundMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:1});groundMaterial.onBeforeCompile=sh=>{addSnow(sh);addTerrain(sh,TER,detU);};groundMaterial.customProgramCacheKey=()=>'snow-ground-ter';materials.set('grass',groundMaterial);
  // v111 tree leaves: smooth shading, vertex colours, a gentle wind sway (attribute sway × uWind time), see-through + snow.
  const windU={uWind:{value:0}};
  const treeMaterial=seeThrough(new T.MeshStandardMaterial({vertexColors:true,roughness:.92}));{const base=treeMaterial.onBeforeCompile;treeMaterial.onBeforeCompile=sh=>{base(sh);sh.uniforms.uWind=windU.uWind;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float sway;uniform float uWind;').replace('#include <begin_vertex>','#include <begin_vertex>\n{vec4 wp=modelMatrix*vec4(position,1.);float ph=wp.x*.21+wp.z*.17;transformed.x+=sway*(sin(uWind*1.3+ph)*.09+sin(uWind*3.1+ph*2.3)*.025);transformed.z+=sway*cos(uWind*1.1+ph*1.2)*.07;}');
    // v147: bark furrows on trunks/branches (dark brown vertex colours), little-leaf clumping on the crowns.
    sh.uniforms.uDetail=detU;sh.uniforms.uBarkTex={value:DT.bark};sh.uniforms.uLeafTex={value:DT.leaf};
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vTN;').replace('#include <project_vertex>','#include <project_vertex>\nvTN=normalize(mat3(modelMatrix)*objectNormal);');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vTN;uniform sampler2D uBarkTex;uniform sampler2D uLeafTex;uniform float uDetail;').replace('#include <color_fragment>',`#include <color_fragment>
      if(uDetail>0.){vec3 c=vColor.rgb;if(c.r>c.g&&c.g>c.b*1.2&&c.r<.42){float t=texture2D(uBarkTex,vec2((vSightW.x+vSightW.z)*.9,vSightW.y*.35)).r;diffuseColor.rgb*=mix(1.,t*1.9,.7*uDetail);}
        else{vec3 an=abs(vTN);vec2 dc=an.y>max(an.x,an.z)?vSightW.xz:(an.x>an.z?vSightW.zy:vSightW.xy);float t=texture2D(uLeafTex,dc*.75).r;diffuseColor.rgb*=mix(1.,t*1.9,.55*uDetail);}}`);};
    treeMaterial.customProgramCacheKey=()=>'sight-tree';materials.set('tree-leaves',treeMaterial);}
  const propMaterial=seeThrough(groundMaterial.clone());materials.set('wild-props',propMaterial);propMaterial.flatShading=true;const chunks=createChunks({T,scene,simple:!!renderer.simpleGraphics,material:groundMaterial,propMaterial,treeMaterial});
  // v149 grass blades (world-terrain.js createGrass): off paths, roads, rivers, buildings, fields, farmyards and squares.
  const grassPathD=(x,z)=>{let d=1e9;for(const l of MAP_PATHS.routes||[])for(let k=0;k+1<l.length;k++){const [ax,az]=l[k],[bx,bz]=l[k+1],L=(bx-ax)**2+(bz-az)**2||1,t=Math.max(0,Math.min(1,((x-ax)*(bx-ax)+(z-az)*(bz-az))/L));d=Math.min(d,Math.hypot(x-ax-t*(bx-ax),z-az-t*(bz-az)));if(d<2)return d;}return d;};
  const grassOK=(x,z)=>Math.hypot(x,z)>22&&Math.hypot(x-TOWN2.x,z-TOWN2.z)>32&&LOCATIONS.every(l=>Math.hypot(l.x-x,l.z-z)>(l.id==='village'?40:14))
    &&FARMS.every(f=>Math.hypot(f.house.x-x,f.house.z-z)>42)&&!FIELDS.some(f=>{const dx=x-f.x,dz=z-f.z,c=Math.cos(f.rot),s=Math.sin(f.rot);return Math.abs(dx*c+dz*s)<f.w/2+1.5&&Math.abs(-dx*s+dz*c)<f.d/2+1.5;})
    &&roadDistance(x,z)>ROAD_HALF+1.5&&grassPathD(x,z)>2&&!solidBlocked(x,z,.4,0,outdoorObstacles);
  const grass=createGrass({T,scene,ok:grassOK,base:(x,z)=>chunks.grassBase(x,z),height:(x,z)=>chunks.surfaceHeight(x,z),tex:TER,uTer:detU,windU,simple:!!renderer.simpleGraphics});chunks.update(0,9.7,true);const lawn=chunks.ground;
  function path(points,width=2.8){const curve=new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,0,z)));const vertices=[],indices=[];const samples=150;
    for(let i=0;i<=samples;i++){const p=curve.getPoint(i/samples),t=curve.getTangent(i/samples);for(const side of [-1,1]){const x=p.x+t.z*width*.5*side,z=p.z-t.x*width*.5*side;vertices.push(x,Math.max(groundHeight(x,z),chunks.surfaceHeight(x,z))+.06,z);}if(i<samples){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}}
    const g=geo(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();const m=new T.Mesh(g,mat('#e4d5ad',{side:T.DoubleSide}));m.receiveShadow=true;m.renderOrder=-9;scene.add(m);return m;
  }
  path(MAP_PATHS.loop,3.3);
  path(MAP_PATHS.yard,2.4);
  // (The toy mountains that framed the first paddock went when the world grew to nine regions: the real wild ranges are out past the edge now.)
  // Clouds, sun, moon and weather live in world-sky.js (created below, once the fences have placed the morning glories).

  // v111: one smooth mesh per tree (bakeTree in world-chunks.js), was four flat blobs.
  const petalTrees=[],treeCrowns=[];
  function tree(x,z,type='green',size=1,fruit=null){treeCrowns.push({x,z,s:size});if(type==='pink'||type==='gold')petalTrees.push({x,z,s:size,color:type==='pink'?'#f2b3c0':'#e8c45a'});const group=new T.Group(),out=treeOut(),pal=type==='pink'?TREE_PALS[2]:type==='gold'?TREE_PALS[1]:TREE_PALS[0];
    bakeTree(T,out,0,0,0,size,pal,random()*9,'round',fruit||(type==='apple'?'#cc4b3c':null));const m=new T.Mesh(geo(treeGeometry(T,out)),treeMaterial);m.castShadow=true;m.receiveShadow=true;group.add(m);place(group,x,z);return group;
  }
  const trees=[];
  for(let i=0;i<(renderer.simpleGraphics?55:95);i++){const x=(random()-.5)*113,z=(random()-.5)*105;if(Math.abs(x)<27&&z>-15&&z<27)continue;if(((x-22)/15)**2+((z+7)/12)**2<1)continue;if(Math.hypot(x+38,z-4)<21||Math.hypot(x+29,z)<6||Math.hypot(x+10,z-47)<7||Math.hypot(x-17,z+32)<8)continue;/* keep the paddock and game stations clear */if(MARKERS.some(m=>Math.hypot(x-m.x,z-m.z)<5))continue;{const p=R(x,z);if(Math.hypot(p.x-SQUARE.x,p.z-SQUARE.z)<42)continue;}trees.push([x,z]);}
  trees.forEach(([x,z],i)=>tree(x,z,i%9===0?'pink':i%7===0?'gold':'green',.8+random()*.45));
  [[-3,-23],[3,-31],[9,-30],[-3,-31],[-9,-25],[-9,-31]].forEach(([x,z])=>tree(x,z,'apple',.95));
  tree(-20,8,'pink',1.3);tree(-4,31,'pink',1.1);/* v102: was (8,18), right in front of Hoofhaven's new doors */tree(30,13,'gold',1.2);tree(14,-21,'pink',1.2);
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
  const sky=createSky({T,scene,camera,sun,hemi,simple:!!renderer.simpleGraphics,glorySpots});const motes=createMotes({T,scene,simple:!!renderer.simpleGraphics});let petalNear=null,petalAt=0;
  // v111 sun flare: soft glow + a few coloured ghosts along the line from the sun through the screen centre, on clear
  // days with Pretty effects on. A ray checks every 0.4 s that nothing (a tree, a roof) stands in front of the sun.
  const flare=document.createElement('div');flare.className='world-flare';flare.innerHTML='<i></i><i></i><i></i><i></i><i></i>';view.appendChild(flare);
  const flareBits=[...flare.children],FLARE=[[0,1],[.45,.22],[.8,.12],[1.25,.3],[1.7,.16]],_fs=new T.Vector3(),_fd=new T.Vector3(),flareRay=new T.Raycaster();let flareAt=0,flareSeen=1,flareK=0;
  // Cheap sun check (a full raycast costs ~190 ms): march 2 m steps toward the sun against hills, the collision boxes
  // of buildings and fences, and the valley trees' crowns. Stops once it is well above everything.
  function sunBlocked(d){const c=camera.position;for(let t=2;t<70;t+=2){const x=c.x+d.x*t,y=c.y+d.y*t,z=c.z+d.z*t,g=groundY(x,z),h=y-g;if(h<0)return true;if(h>16)return false;
      for(const o of outdoorObstacles)if(o.kind!=='lake'&&h<o.height&&Math.abs(x-o.x)<o.hx&&Math.abs(z-o.z)<o.hz)return true;
      for(const tc of treeCrowns){const dx=x-tc.x,dz=z-tc.z;if(dx*dx+dz*dz<(2.4*tc.s)**2&&h>1.6*tc.s&&h<5.6*tc.s)return true;}}return false;}
  function flareStep(now,dt){let want=0;const night=skyNight;if(pretty&&area==='outdoor'&&night<.2&&(sky.kind==='clear'||sky.kind==='partly')){_fd.subVectors(sun.position,sun.target.position).normalize();
      if(_fd.y>.03){_fs.copy(camera.position).addScaledVector(_fd,150).project(camera);if(_fs.z<1&&Math.abs(_fs.x)<1.15&&Math.abs(_fs.y)<1.15){
        if(now-flareAt>400){flareAt=now;flareSeen=sunBlocked(_fd)?0:1;}
        want=flareSeen*(1-night*5)*(sky.kind==='partly'?.55:1)*(1-Math.min(1,Math.hypot(_fs.x,_fs.y)/1.4)*.5);}}}
    flareK+=(want-flareK)*Math.min(1,dt*5);flare.style.opacity=flareK.toFixed(3);if(flareK<.01)return;
    const r=view.getBoundingClientRect(),sx=(_fs.x+1)/2*r.width,sy=(1-_fs.y)/2*r.height,cx=r.width/2,cy=r.height/2;
    FLARE.forEach(([t],i)=>{const x=sx+(cx-sx)*t*2*(i?1:0),y=sy+(cy-sy)*t*2*(i?1:0);flareBits[i].style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`;});}let glow=null,glowK=0;if(!renderer.simpleGraphics&&renderer.capabilities?.isWebGL2){try{glow=createGlow({T,renderer});}catch(err){console.warn('night glow unavailable',err);}}const skyKids=new Set(scene.children.filter(c=>!skyBefore.has(c)));
  const trough=new T.Group();box(trough,'#a48560',0,.45,0,2.7,.9,1.2);box(trough,'#82b9b2',0,.94,0,2.4,.035,.9);place(trough,-19,7);
  const hay=new T.Group();box(hay,'#d1b96b',0,.55,0,1.6,1.1,1.1);box(hay,'#b39b58',-.48,.55,0,.09,1.13,1.13);box(hay,'#b39b58',.48,.55,0,.09,1.13,1.13);place(hay,-20,1);
  // A shallow pond with lily pads, a dock and a small footbridge on the bank.
  const lake=new T.Mesh(geo(new T.CircleGeometry(1,48)),waterize(new T.MeshStandardMaterial({color:'#5fa7a8',roughness:.12,metalness:.05})));lake.rotation.x=-Math.PI/2;lake.renderOrder=-8;lake.position.set(22,.15,-7);lake.scale.set(11.3,8.1,1);scene.add(lake);
  const pondBank=new T.Mesh(geo(new T.RingGeometry(.97,1.09,48)),mat('#c4c48f',{side:T.DoubleSide}));pondBank.rotation.x=-Math.PI/2;pondBank.scale.set(11.4,8.2,1);pondBank.renderOrder=-8;pondBank.position.set(22,.14,-7);scene.add(pondBank);
  for(let i=0;i<13;i++){const x=18+random()*8,z=-11+random()*7;const pad=new T.Mesh(geo(new T.CircleGeometry(.2+random()*.3,7)),mat('#89b577'));pad.rotation.x=-Math.PI/2;pad.position.set(x,.18,z);scene.add(pad);if(i%3===0)ico(scene,'#ebc3c2',x,.28,z,.15,.12,.15);}
  const dock=new T.Group();for(let i=0;i<8;i++)box(dock,'#c3a378',0,.25,-i*.55,2.6,.18,.48);for(const x of [-1.15,1.15])for(const z of [0,-3.8])box(dock,'#937858',x,0,z,.18,1.5,.18);place(dock,22,2);
  label('LILY LAKE',31,3,-5,5.5);label('APPLE ORCHARD',1,4,-31,6.7);label('SUNSET RIDGE',28,4,-26,6.5);
  const log=new T.Group();const beam=mesh(log,cylinderGeometry,'#9b7958',0,.45,0,.45,5.6,.45,true);beam.rotation.z=Math.PI/2;place(log,13,7);label('A LITTLE JUMP',13,2.7,7,5.2);

  const modelKit={geometry:geo,material:mat,detail:renderer.simpleGraphics?0:1};
  // Same sculpted horse, tack and jockey as the steeplechase. The jockey only shows while you ride; on foot you are the chibi avatar.
  let look=loadLook(),winterNow=null;
  // ---- Tack Packs (#31): a Trotties sink. Otis sells sealed packs of collectible horse gear (trading-card style);
  // per-card odds are shown on every pack and a Shiny is an honest 1 in 10,000. Earned Trotties only, never Stars.
  // Doubles become pack dust (400 dust makes a missing non-Shiny item). Equipped gear shows on your horses
  // (rider-sculpt opt.packs) and the stable item hangs under your stall's name plate.
  const TP=(()=>{const KEY='trottville-packs-v1';let o={};try{o=JSON.parse(localStorage.getItem(KEY))||{};}catch{}o.owned||={};o.equip||={};o.dust||=0;o.serial||=0;o.opened||=0;
    const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(o));}catch{}};
    const RN={c:'Common',r:'Rare',e:'Epic',s:'Shiny'},CATS=[['flag','Flags'],['blanket','Saddle pads'],['face','Face'],['legs','Leg wraps'],['tail','Tail'],['stable','Stable wall']];
    const ITEMS=[['flag','Meadow Pennant','c','#5fae5a','#fff','plain'],['flag','Clover Banner','c','#2d6a3e','#f3e9b5','dots'],['flag','Sunrise Standard','r','#f08a3c','#ffd35c','stripes'],['flag','Thunder Flag','e','#3b2f7a','#ffe14d','bolt'],['flag','Golden Crest Flag','s','#f6c945','#fff3b0','crest'],
      ['blanket','Plaid Saddle Pad','c','#c0453a','#f4e2c0','plaid'],['blanket','Daisy Pad','c','#8fc7e8','#fff','dots'],['blanket','Show Quilt','r','#2f5d8a','#f6f1df','stripes'],['blanket','Starry Night Rug','e','#24205a','#ffe680','stars'],['blanket','Golden Parade Rug','s','#f6c945','#fff8d6','crest'],
      ['face','Ribbon Browband','c','#e86a9a','#fff','plain'],['face','Fluffy Noseband','c','#f4f1e8','#c9b99a','plain'],['face','Knit Ear Bonnet','r','#7cc4a4','#fff','stripes'],['face','Crystal Browband','e','#b58bf0','#e9e1ff','stars'],['face','Golden Blinders','s','#f6c945','#fff3b0','crest'],
      ['legs','Striped Wraps','c','#2f7dd1','#fff','stripes'],['legs','Polka Wraps','c','#e2553c','#fff','dots'],['legs','Fleece Boots','r','#f1e6cf','#c9a978','plain'],['legs','Comet Wraps','e','#1e2a4a','#9ad6ff','stars'],
      ['tail','Tail Bow','c','#e2553c','#fff','plain'],['tail','Braid Ribbons','r','#2f7dd1','#ffd35c','stripes'],['tail','Rainbow Streamers','e','#8a4fd8','#ffd35c','rainbow'],
      ['stable','Bronze Name Plaque','c','#b07a3a','#f1d3a5','plain'],['stable','Blue Rosette','r','#2f7dd1','#fff','plain'],['stable','Trophy Shelf','e','#8a4fd8','#f6c945','stars'],['stable','Golden Horseshoe','s','#f6c945','#fff3b0','crest']
    ].map(([cat,name,rar,a,b,pat],id)=>({id,cat,name,rar,a,b,pat}));
    const ODDS={s:.0001,e:.0799,r:.22},DUST={c:5,r:20,e:80},CRAFT=400,RANK='cres';
    const PACKS=[{id:'hay',name:'Hay Bale Pack',cards:3,price:500,min:null,color:'#c9a23e',blurb:'3 cards. Pocket money.'},
      {id:'show',name:'Show Pack',cards:5,price:5000,min:'r',color:'#2f5d8a',blurb:'5 cards. One is Rare or better.'},
      {id:'gold',name:'Gold Bar Pack',cards:10,price:100000,min:'e',color:'#d9a21b',blurb:'10 cards. One is Epic or better.'}];
    const roll=(min,rnd=Math.random)=>{const x=rnd();let r=x<ODDS.s?'s':x<ODDS.s+ODDS.e?'e':x<ODDS.s+ODDS.e+ODDS.r?'r':'c';if(min&&RANK.indexOf(r)<RANK.indexOf(min))r=min;return r;};
    const draw=(p,force)=>{const out=[];for(let i=0;i<p.cards;i++){const last=i===p.cards-1,rar=force&&last?force:roll(last?p.min:null),pool=ITEMS.filter(it=>it.rar===rar);out.push(pool[Math.floor(Math.random()*pool.length)]);}return out.sort((a,b)=>RANK.indexOf(a.rar)-RANK.indexOf(b.rar));};
    function gear(){const g={};for(const [c] of CATS){const id=o.equip[c];if(id!=null&&o.owned[id]&&c!=='stable')g[c]=ITEMS[id];}g.shiny=Object.values(o.equip).some(id=>ITEMS[id]?.rar==='s');return g;}
    // ---- card art (SVG, same drawings as the mockup) ----
    let uid=0;
    function pat(id,p,a,b){if(p==='stripes')return `<pattern id="${id}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="8" height="8" fill="${a}"/><rect width="4" height="8" fill="${b}"/></pattern>`;
      if(p==='dots')return `<pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="${a}"/><circle cx="5" cy="5" r="2.2" fill="${b}"/></pattern>`;
      if(p==='plaid')return `<pattern id="${id}" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="${a}"/><rect width="12" height="3" y="4" fill="${b}" opacity=".7"/><rect width="3" height="12" x="4" fill="${b}" opacity=".7"/></pattern>`;
      if(p==='stars')return `<pattern id="${id}" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="${a}"/><path d="M7 2l1.3 3 3.2.2-2.5 2 .8 3.1L7 8.6 4.2 10.3 5 7.2 2.5 5.2l3.2-.2z" fill="${b}"/></pattern>`;
      if(p==='rainbow')return `<linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e2553c"/><stop offset=".25" stop-color="#ffd35c"/><stop offset=".5" stop-color="#5fae5a"/><stop offset=".75" stop-color="#2f7dd1"/><stop offset="1" stop-color="#8a4fd8"/></linearGradient>`;
      if(p==='crest')return `<linearGradient id="${id}" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".4" stop-color="#f6c945"/><stop offset=".75" stop-color="#c8901a"/><stop offset="1" stop-color="#fff3b0"/></linearGradient>`;
      return `<pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="${a}"/></pattern>`;}
    function icon(it){const id='tpp'+(uid++),f=`url(#${id})`,d=`<defs>${pat(id,it.pat,it.a,it.b)}</defs>`,k='stroke="#1f3a2a" stroke-width="2.5" stroke-linejoin="round"',n=it.name;
      const v={flag:`<rect x="18" y="8" width="4" height="72" rx="2" fill="#8a5a2b"/><circle cx="20" cy="8" r="4" fill="#f6c945"/><path d="M22 12 Q44 6 58 14 T80 14 L80 46 Q66 40 52 46 T22 44Z" fill="${f}" ${k}/>${it.pat==='bolt'?'<path d="M50 18 L42 32 L50 32 L44 44 L58 28 L50 28 L56 18Z" fill="#ffe14d"/>':''}`,
        blanket:`<path d="M10 22 Q50 8 90 22 L84 66 Q50 76 16 66Z" fill="${f}" ${k}/><path d="M16 60 Q50 70 84 60" fill="none" stroke="${it.b}" stroke-width="3" stroke-dasharray="4 4"/>`,
        face:/Blinders/.test(n)?`<path d="M30 14 Q50 6 70 14 L66 80 Q50 88 34 80Z" fill="#a0673a" ${k}/><rect x="16" y="34" width="20" height="18" rx="6" fill="${f}" ${k}/><rect x="64" y="34" width="20" height="18" rx="6" fill="${f}" ${k}/><rect x="30" y="24" width="40" height="7" rx="3" fill="${f}" ${k}/>`
          :/Bonnet/.test(n)?`<path d="M28 40 L34 8 L46 34Z M72 40 L66 8 L54 34Z" fill="${f}" ${k}/><path d="M24 40 Q50 26 76 40 L72 52 Q50 44 28 52Z" fill="${f}" ${k}/><path d="M34 54 Q50 48 66 54 L62 84 Q50 90 38 84Z" fill="#a0673a" ${k}/>`
          :/Noseband/.test(n)?`<path d="M30 10 Q50 4 70 10 L66 80 Q50 88 34 80Z" fill="#a0673a" ${k}/><rect x="28" y="56" width="44" height="14" rx="7" fill="${f}" ${k}/>`
          :`<path d="M30 14 Q50 6 70 14 L66 80 Q50 88 34 80Z" fill="#a0673a" ${k}/><rect x="24" y="26" width="52" height="10" rx="5" fill="${f}" ${k}/>${it.pat==='stars'?'<circle cx="50" cy="31" r="5" fill="#fff" stroke="#b58bf0" stroke-width="2"/>':''}`,
        legs:`<rect x="26" y="8" width="18" height="40" rx="5" fill="#a0673a"/><rect x="56" y="8" width="18" height="40" rx="5" fill="#a0673a"/><rect x="22" y="40" width="26" height="34" rx="7" fill="${f}" ${k}/><rect x="52" y="40" width="26" height="34" rx="7" fill="${f}" ${k}/><rect x="24" y="74" width="22" height="9" rx="3" fill="#3a2a1a"/><rect x="54" y="74" width="22" height="9" rx="3" fill="#3a2a1a"/>`,
        tail:`<path d="M50 10 Q66 40 58 70 Q54 86 40 88 Q50 60 42 30Z" fill="#5a3a22" ${k}/><path d="M50 22 L30 12 L32 32Z M50 22 L70 12 L68 32Z" fill="${f}" ${k}/><circle cx="50" cy="22" r="5" fill="${it.b}" ${k}/>${it.pat==='rainbow'?`<path d="M46 26 Q40 56 30 80 M54 26 Q60 56 70 80" stroke="${f}" stroke-width="5" fill="none"/>`:''}`,
        stable:/Rosette/.test(n)?`<path d="M38 52 L30 88 L42 80 L48 90 L50 54Z M62 52 L70 88 L58 80 L52 90 L50 54Z" fill="${it.a}" ${k}/><circle cx="50" cy="38" r="26" fill="${f}" ${k}/><circle cx="50" cy="38" r="14" fill="${it.b}" ${k}/>`
          :/Horseshoe/.test(n)?`<path d="M26 18 Q26 84 50 84 Q74 84 74 18 L62 18 Q62 70 50 70 Q38 70 38 18Z" fill="${f}" ${k}/>`
          :/Trophy/.test(n)?`<rect x="10" y="70" width="80" height="8" rx="2" fill="#8a5a2b"/><path d="M34 20 L66 20 Q66 50 50 54 Q34 50 34 20Z" fill="${f}" ${k}/><rect x="44" y="54" width="12" height="10" fill="${it.b}" ${k}/><rect x="36" y="62" width="28" height="8" rx="2" fill="${it.a}" ${k}/>`
          :`<rect x="12" y="26" width="76" height="44" rx="8" fill="${f}" ${k}/><rect x="22" y="40" width="56" height="5" rx="2" fill="#7a4a1a" opacity=".6"/><rect x="28" y="52" width="44" height="4" rx="2" fill="#7a4a1a" opacity=".45"/>`}[it.cat];
      return `<svg viewBox="0 0 100 92" aria-hidden="true">${d}${v}</svg>`;}
    function packArt(p,big){const id='tpg'+(uid++);return `<svg viewBox="0 0 96 120" ${big?'width="170" height="212"':'width="80" height="100"'} aria-hidden="true"><defs><linearGradient id="${id}" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".35" stop-color="${p.color}"/><stop offset="1" stop-color="${p.color}"/></linearGradient></defs><path d="M8 10 L14 4 L20 10 L26 4 L32 10 L38 4 L44 10 L50 4 L56 10 L62 4 L68 10 L74 4 L80 10 L86 4 L90 10 L90 112 Q48 118 6 112Z" fill="url(#${id})" stroke="#1f3a2a" stroke-width="3" stroke-linejoin="round"/><ellipse cx="48" cy="58" rx="28" ry="24" fill="#fffdf4" stroke="#1f3a2a" stroke-width="2.5"/><path d="M38 70 Q36 50 46 42 L44 34 L50 40 L54 34 L54 42 Q64 48 62 64 Q58 56 52 58 L52 70Z" fill="#a0673a" stroke="#1f3a2a" stroke-width="2"/><text x="48" y="100" text-anchor="middle" font-family="Georgia,serif" font-size="13" fill="#fff" stroke="#1f3a2a" stroke-width=".6">${p.cards} cards</text>${p.id==='gold'?'<rect x="34" y="16" width="28" height="11" rx="2" fill="#f6c945" stroke="#7a520c" stroke-width="1.5"/>':''}</svg>`;}
    let css=false;function style(){if(css)return;css=true;const st=document.createElement('style');st.textContent=`
.tp-tabs{display:flex;gap:6px;margin:0 0 12px}.tp-tabs button{flex:1;min-height:44px;border-radius:12px;border:2px solid #d8d2bf;background:#fffdf4;font-weight:800;color:#5b6b60}.tp-tabs button[aria-selected=true]{background:#2d6a3e;border-color:#2d6a3e;color:#fff}
.tp-pack{display:grid;grid-template-columns:80px 1fr;gap:12px;align-items:center;background:#e9efe2;border-radius:16px;padding:10px;margin-bottom:10px}.tp-pack svg{width:80px!important;height:100px!important;max-width:none}.tp-big svg{width:170px!important;height:212px!important;max-width:none}.tp-pack h3{margin:0;font-size:1.05rem}.tp-pack p{margin:2px 0 8px;font-size:.88rem;color:#5b6b60}
.tp-odds{font-size:.84rem;color:#5b6b60;border:1px solid #dfe3d6;border-radius:12px;padding:8px 12px}.tp-odds summary{min-height:32px;font-weight:800;cursor:pointer;color:#1f3a2a}.tp-odds td{padding:3px 8px 3px 0}
.tp-pill{display:inline-block;font-size:.68rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;padding:1px 7px;border-radius:999px;color:#fff;background:#7f8f84}.tp-pill.r{background:#2f7dd1}.tp-pill.e{background:#8a4fd8}.tp-pill.s{background:linear-gradient(90deg,#c8901a,#f6c945,#fff3b0,#f6c945,#c8901a);background-size:200% 100%;color:#4d3608;animation:tp-sheen 2.4s linear infinite}
@keyframes tp-sheen{to{background-position:-200% 0}}
.tp-dust{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:12px;background:#efe9fb;margin-bottom:6px}.tp-dust .m{height:10px;border-radius:5px;background:#ddd;overflow:hidden}.tp-dust .m i{display:block;height:100%;background:#8a4fd8}
.tp-cat{margin:12px 0 6px;font-weight:800;font-size:.76rem;letter-spacing:.08em;text-transform:uppercase;color:#5b6b60}
.tp-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.tp-tile{position:relative;aspect-ratio:3/4;min-height:44px;border-radius:12px;border:2px solid #7f8f84;background:#fffdf4;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px;text-align:center;color:#1f3a2a}
.tp-tile svg{width:78%;height:auto}.tp-tile b{font-size:.62rem;line-height:1.1}.tp-tile.r{border-color:#2f7dd1}.tp-tile.e{border-color:#8a4fd8}.tp-tile.s{border-color:#d9a21b;background:linear-gradient(160deg,#fff8d6,#fff)}
.tp-tile.miss svg{filter:brightness(0) opacity(.16)}.tp-tile.miss b{color:#8a958d}.tp-tile .n{position:absolute;top:3px;right:5px;font-size:.62rem;font-weight:800;color:#5b6b60}.tp-tile.on{box-shadow:0 0 0 3px #2d6a3e;background:#e9efe2}
.tp-stage{display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;padding:6px 0;min-height:300px;justify-content:center;background:radial-gradient(circle at 50% 40%,#2c4a36,#0f1a13 75%);border-radius:16px;color:#fff;position:relative;overflow:hidden}
.tp-stage p{margin:0;color:#cfe0d2}.tp-big{border:0;background:none;padding:0;cursor:pointer}.tp-big.shake{animation:tp-shake .5s ease-in-out}.tp-big.burst{animation:tp-burst .4s ease-in forwards}
@keyframes tp-shake{20%,60%{transform:rotate(-6deg)}40%,80%{transform:rotate(6deg)}}@keyframes tp-burst{to{transform:scale(1.5);opacity:0}}
.tp-cards{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;padding:0 8px}.tp-card{width:96px;aspect-ratio:3/4;perspective:700px;border:0;background:none;padding:0;cursor:pointer}
.tp-card .in{display:block;position:relative;width:100%;height:100%;transition:transform .5s cubic-bezier(.3,1.4,.5,1);transform-style:preserve-3d}.tp-card.flip .in{transform:rotateY(180deg)}
.tp-card .bk,.tp-card .fc{position:absolute;inset:0;border-radius:12px;backface-visibility:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:5px;text-align:center}
.tp-card .bk{background:repeating-linear-gradient(45deg,#2d6a3e 0 9px,#347a48 9px 18px);border:3px solid #ffffff44;color:#fff;font:700 14px Georgia,serif}
.tp-card .fc{transform:rotateY(180deg);background:#fffdf4;color:#1f3a2a;border:4px solid #7f8f84}.tp-card .fc svg{width:78%;height:auto}.tp-card .fc b{font-size:.68rem;line-height:1.15}.tp-card .fc small{font-size:.62rem}
.tp-card.r .fc{border-color:#2f7dd1;box-shadow:0 0 14px #2f7dd199}.tp-card.e .fc{border-color:#8a4fd8;box-shadow:0 0 22px #8a4fd8cc}.tp-card.s .fc{border-color:#d9a21b;background:linear-gradient(160deg,#fff3b0,#fffdf4 45%,#f6e3a0);box-shadow:0 0 34px #f6c945}
.tp-card .tag{font-size:.6rem;font-weight:800;color:#8a4fd8}.tp-card .tag.new{color:#e2553c}
.tp-spark{position:absolute;pointer-events:none;width:8px;height:8px;border-radius:50%;background:#fff3b0;box-shadow:0 0 10px #f6c945;animation:tp-spark 1.1s ease-out forwards}@keyframes tp-spark{to{transform:translate(var(--dx),var(--dy)) scale(.2);opacity:0}}
.tp-btns{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;padding-bottom:6px}.tp-btns button{min-height:44px;padding:0 16px;border-radius:12px;border:0;font-weight:800;background:#fff;color:#1f3a2a}.tp-btns button.sec{background:#ffffff26;color:#fff}
@media (prefers-reduced-motion:reduce){.tp-card .in,.tp-big{transition:none!important;animation:none!important}.tp-spark,.tp-pill.s{animation:none!important}}`;document.head.append(st);}
    // ---- dialog ----
    let tab='packs',cur=null;
    const price=n=>n>=100000&&n%100000===0?`${n/100000} gold bar`:`${n.toLocaleString('en-US')} 🪙`;
    function open(t){style();if(t)tab=t;const w=loadWallet();
      const tabs=`<div class="tp-tabs" role="tablist">${[['packs','Packs'],['book','Collection']].map(([k,l])=>`<button type="button" role="tab" aria-selected="${tab===k}" data-tpt="${k}">${l}</button>`).join('')}</div>`;
      let body='';
      if(tab==='packs')body=`<p class="small">You have 🪙 ${coinWords(w.coins)}. Packs hold horse gear to collect: flags, saddle pads, face pieces, leg wraps, tail bows and stable trophies. Your horses wear what you pick.</p>
        ${PACKS.map(p=>`<div class="tp-pack">${packArt(p)}<div><h3>${p.name}</h3><p>${p.blurb}</p><button type="button" class="primary full" data-tpb="${p.id}"${w.coins<p.price?' disabled':''}>Buy · ${price(p.price)}</button></div></div>`).join('')}
        <details class="tp-odds"><summary>What’s the chance? (per card, every pack)</summary><table><tr><td><span class="tp-pill">Common</span></td><td>70 in 100</td></tr><tr><td><span class="tp-pill r">Rare</span></td><td>22 in 100</td></tr><tr><td><span class="tp-pill e">Epic</span></td><td>8 in 100</td></tr><tr><td><span class="tp-pill s">Shiny</span></td><td>1 in 10,000</td></tr></table>
        <p>Every card uses these odds, except the last card in a Show Pack is always Rare or better and the last card in a Gold Bar Pack is always Epic or better. Only Trotties you earn buy packs, never Stars. Doubles turn into pack dust. Every Shiny gets a serial number.</p></details>`;
      else{const have=Object.keys(o.owned).length;
        body=`<p class="small">${have} of ${ITEMS.length} found. Tap an item you own to put it on your horses (tap again to take it off).</p>
        <div class="tp-dust"><span aria-hidden="true">✨</span><div style="flex:1"><div style="font-size:.8rem;font-weight:700">Pack dust ${o.dust} / ${CRAFT}</div><div class="m"><i style="width:${Math.min(100,o.dust/CRAFT*100)}%"></i></div></div><button type="button" class="secondary" id="tp-craft"${o.dust<CRAFT?' disabled':''}>Make one</button></div>
        ${CATS.map(([c,l])=>`<div class="tp-cat">${l}</div><div class="tp-grid">${ITEMS.filter(i=>i.cat===c).map(i=>{const n=o.owned[i.id],on=o.equip[c]===i.id;return n?`<button type="button" class="tp-tile ${i.rar}${on?' on':''}" data-tpe="${i.id}" aria-pressed="${on}" aria-label="${escapeHTML(i.name)}, ${RN[i.rar]}">${n.count>1?`<span class="n">×${n.count}</span>`:''}${icon(i)}<b>${escapeHTML(i.name)}${n.serial?`<br>#${String(n.serial).padStart(4,'0')}`:''}</b></button>`:`<div class="tp-tile miss ${i.rar==='s'?'s':''}">${icon(i)}<b>${i.rar==='s'?'Shiny ???':'???'}</b></div>`;}).join('')}</div>`).join('')}`;}
      adventureUI.open('Tack Packs',tabs+body);const d=adventureUI.dialog;
      d.querySelectorAll('[data-tpt]').forEach(b=>b.onclick=()=>open(b.dataset.tpt));
      d.querySelectorAll('[data-tpb]').forEach(b=>b.onclick=()=>buy(b.dataset.tpb));
      d.querySelectorAll('[data-tpe]').forEach(b=>b.onclick=()=>equip(+b.dataset.tpe));
      d.querySelector('#tp-craft')?.addEventListener('click',craft);}
    function equip(id){const it=ITEMS[id];if(!it||!o.owned[id])return;if(o.equip[it.cat]===id)delete o.equip[it.cat];else o.equip[it.cat]=id;save();redress();sfx('pop');
      tell(o.equip[it.cat]===id?(it.cat==='stable'?`${it.name} now hangs in your stall.`:`${it.name} is on your horses.`):`${it.name} taken off.`,2.5);open('book');}
    function craft(){if(o.dust<CRAFT)return;const miss=ITEMS.filter(i=>i.rar!=='s'&&!o.owned[i.id]);if(!miss.length){tell('You have every non-Shiny item already!',3);return;}
      const it=miss.sort((a,b)=>RANK.indexOf(b.rar)-RANK.indexOf(a.rar))[0];o.dust-=CRAFT;o.owned[it.id]={count:1};save();sfx('sparkle');tell(`✨ Made ${it.name} from pack dust.`,3);open('book');}
    function buy(pid,force){const p=PACKS.find(x=>x.id===pid),w=loadWallet();if(!p)return;if(w.coins<p.price){tell('Not enough Trotties for that pack yet. Odd jobs and races pay!',3);return;}
      saveWallet({...w,coins:w.coins-p.price});paintCounters();sfx('buy');o.opened++;
      const cards=draw(p,force),res=cards.map(it=>{const had=o.owned[it.id];if(!had){o.owned[it.id]={count:1};if(it.rar==='s')o.owned[it.id].serial=++o.serial;return {it,tag:'NEW'};}
        had.count++;if(it.rar==='s')return {it,tag:'Another Shiny!'};o.dust+=DUST[it.rar];return {it,tag:`Double: +${DUST[it.rar]} dust`};});
      save();cur={p,res,flipped:0};reveal();return cards.map(c=>c.id);}
    function reveal(){const {p}=cur;adventureUI.open(p.name,`<div class="tp-stage"><p>Tap the pack to open it</p><button type="button" class="tp-big" id="tp-big" aria-label="Open the ${p.name}">${packArt(p,true)}</button></div>`);
      const d=adventureUI.dialog,bp=d.querySelector('#tp-big');bp.focus();
      bp.onclick=()=>{if(bp.classList.contains('shake'))return;sfx('pop');if(reducedMotion){showCards();return;}bp.classList.add('shake');bp.addEventListener('animationend',()=>{bp.classList.remove('shake');bp.classList.add('burst');bp.addEventListener('animationend',showCards,{once:true});},{once:true});};}
    function showCards(){const {p,res}=cur,d=adventureUI.dialog,st=d.querySelector('.tp-stage');
      st.innerHTML=`<p id="tp-hint">Tap each card to turn it over</p><div class="tp-cards">${res.map(({it,tag},i)=>{const ser=o.owned[it.id].serial;return `<button type="button" class="tp-card ${it.rar}" data-i="${i}" aria-label="Card ${i+1}, face down"><span class="in"><span class="bk">Trottville</span><span class="fc">${icon(it)}<b>${escapeHTML(it.name)}</b><small><span class="tp-pill ${it.rar}">${RN[it.rar]}</span>${it.rar==='s'&&ser?` #${String(ser).padStart(4,'0')}`:''}</small><span class="tag${tag==='NEW'?' new':''}">${tag}</span></span></span></button>`;}).join('')}</div><div class="tp-btns" id="tp-btns"><button type="button" class="sec" id="tp-all">Turn all</button></div>`;
      st.querySelectorAll('.tp-card').forEach(c=>c.onclick=()=>flip(c));st.querySelector('#tp-all').onclick=()=>st.querySelectorAll('.tp-card:not(.flip)').forEach(flip);st.querySelector('.tp-card').focus();}
    function flip(c){if(c.classList.contains('flip'))return;c.classList.add('flip');const {it}=cur.res[+c.dataset.i],st=adventureUI.dialog.querySelector('.tp-stage');c.setAttribute('aria-label',`${it.name}, ${RN[it.rar]}`);
      if((it.rar==='s'||it.rar==='e')&&!reducedMotion){const r=c.getBoundingClientRect(),sr=st.getBoundingClientRect();for(let i=0;i<(it.rar==='s'?28:12);i++){const s=document.createElement('i');s.className='tp-spark';s.style.left=r.left-sr.left+r.width/2+'px';s.style.top=r.top-sr.top+r.height/2+'px';
        const a=Math.random()*Math.PI*2,dd=50+Math.random()*(it.rar==='s'?120:60);s.style.setProperty('--dx',Math.cos(a)*dd+'px');s.style.setProperty('--dy',Math.sin(a)*dd+'px');if(it.rar==='e')s.style.background='#d9c6ff';s.addEventListener('animationend',()=>s.remove());st.append(s);}}
      if(it.rar==='s')sfx('fanfare');else if(it.rar==='e')sfx('sparkle');
      if(++cur.flipped===cur.res.length){const best=cur.res.at(-1).it,b=st.querySelector('#tp-btns'),w=loadWallet();if(best.rar==='s')st.querySelector('#tp-hint').textContent='A SHINY! Only about 1 in 10,000 cards is one.';
        b.innerHTML=`<button type="button" class="sec" id="tp-book">See collection</button><button type="button" id="tp-done">Done</button>`;
        b.querySelector('#tp-book').onclick=()=>open('book');b.querySelector('#tp-done').onclick=()=>open('packs');}}
    // ---- the stall trophy: a small 3D piece under your stall's name plate ----
    let wall=null,wallAt=null;
    function paintStall(at){if(at)wallAt=at;if(!wallAt)return;if(wall){wall.parent?.remove(wall);wall.traverse(m=>{m.geometry?.dispose();m.material?.dispose?.();});wall=null;}
      const id=o.equip.stable;if(id==null||!o.owned[id])return;const it=ITEMS[id],g=new T.Group(),M=c=>new T.MeshStandardMaterial({color:c,roughness:it.rar==='s'?.25:.6,metalness:it.rar==='s'?.6:.1}),add=(geo,c,x,y,z,rx=0)=>{const m=new T.Mesh(geo,M(c));m.position.set(x,y,z);m.rotation.x=rx;g.add(m);return m;};
      if(/Rosette/.test(it.name)){add(new T.CylinderGeometry(.3,.3,.04,24),it.a,0,0,0,Math.PI/2);add(new T.CylinderGeometry(.16,.16,.06,20),it.b,0,0,.02,Math.PI/2);for(const s of [-1,1]){const r=add(new T.BoxGeometry(.12,.42,.02),it.a,s*.09,-.36,-.01);r.rotation.z=s*.18;}}
      else if(/Horseshoe/.test(it.name)){const m=add(new T.TorusGeometry(.26,.07,10,24,Math.PI*1.25),it.a,0,0,0);m.rotation.z=-Math.PI*.125+Math.PI;}
      else if(/Trophy/.test(it.name)){add(new T.BoxGeometry(.9,.06,.26),'#8a5a2b',0,-.3,.1);add(new T.CylinderGeometry(.17,.08,.3,16),it.b,0,-.05,.12);add(new T.CylinderGeometry(.05,.05,.14,8),it.b,0,-.22,.12);add(new T.BoxGeometry(.24,.06,.18),it.a,0,-.26,.12);}
      else{add(new T.BoxGeometry(.8,.36,.05),it.a,0,0,0);add(new T.BoxGeometry(.6,.05,.06),'#7a4a1a',0,.04,.01);add(new T.BoxGeometry(.44,.04,.06),'#7a4a1a',0,-.07,.01);}
      g.scale.setScalar(.6);g.position.set(wallAt.x,wallAt.y,wallAt.z);g.rotation.y=wallAt.face;wallAt.parent.add(g);wall=g;}
    function redress(){try{companions.forEach(dress);}catch{}paintStall();}
    return {gear,open,buy,paintStall,info:()=>({owned:Object.keys(o.owned).length,dust:o.dust,equip:{...o.equip},serial:o.serial,opened:o.opened,items:ITEMS.length,stall:!!wall}),
      _set(v){Object.assign(o,v);save();redress();},_draw:(pid,n=1)=>{const p=PACKS.find(x=>x.id===pid),c={c:0,r:0,e:0,s:0};for(let i=0;i<n;i++)for(const it of draw(p))c[it.rar]++;return c;}};})();
  function makeHorse(h,index){const model=makeSculptedHorse(T,h,{geometry:geo}),tack=addTackAndRider(T,model,tackLook(h));tack.rider.visible=false;tack.saddleGroup.visible=!!G.tackOf(h).saddle;const starts=[[-4,5],[3,4],[-3,9],[4,10],[-6,1.5],[6.5,6.5],[0,13.5],[-8,8]],start=starts[index%starts.length].map((v,k)=>v+(index>=starts.length?(k?2.6:-2.6)*Math.floor(index/starts.length):0));place(model.root,start[0],start[1]);model.root.rotation.y=[.7,-.6,1.1,-1.4,2.2,-2.4,.2,1.8][index%8];const name=label(h.name,start[0],4.5*model.scale,start[1],2.5);return {...model,model,tack,data:h,name,area:'outdoor'};}
  const companions=horses.map(makeHorse);
  // You on foot: the same chibi character as the jockey. root stays put when the look changes; only the figure inside is swapped.
  function figure(l){const c=makeChibiCharacter(T,l);c.root.traverse(o=>{if(o.isMesh)o.castShadow=true;});return c;}
  function makeAvatar(){const root=new T.Group(),me={root,char:figure(look),update(dt,o){me.char.update(dt,o);},setLook(l){me.char.dispose();me.char=figure(l);root.add(me.char.root);}};root.add(me.char.root);place(root,0,9.7);return me;}
  function applyLook(l){look=l;avatar.setLook(l);companions.forEach(dress);try{WN.reset();}catch{}}
  // Saddle and bridle colours from riding.mjs: plain tan for the free tack, the chosen colour once upgraded; no saddle until it's on.
  function tackLook(data){const t=G.tackOf(data);return {look:winterNow?{...look,winter:winterNow}:look,saddle:G.tackColor(t.saddle),bridle:G.tackColor(t.bridle),packs:TP.gear()};}
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
  // v106: Gus's donkeys Pepper and Pickle in the Bramblewick paddock, and Hattie's mule Clementine in the Puddlebrook yard.
  const farmEquids=[['pepper','Pepper','donkey',FARMS[1].donkeys,-1.5,1,.6],['pickle','Pickle','minidonkey',FARMS[1].donkeys,1.6,-1.4,2.6],['clem','Clementine','mule',{x:272,z:229},0,0,-1.9]].map(([id,name,breed,c,ox,oz,ry])=>{
    const m=makeSculptedHorse(T,{id:'farm-'+id,name,breedId:breed,coat:makeCoat(breed,'farm-'+id),size:breedOf(breed).size},{geometry:geo});m.setGait?.('stand');const x=c.x+ox,z=c.z+oz;
    m.root.position.set(x,farmGround(x,z),z);m.root.rotation.y=ry;m.root.traverse(o=>{if(o.isMesh)o.castShadow=true;});outdoors.add(m.root);return m;});
  // Bramble Village square: the fountain and the walk-in shops (world-town.mjs).
  const town=buildTown({T,outdoors,geo,mat,box,ico,plaque:expansion.plaque,groundY:(x,z)=>chunks.surfaceHeight(x,z),tudor:buildTudorShop,real:squareProps(T,geo,mat)});let inShop=null,shopCam=0,doorTold=null;
  // Step 3: something new in every region (world-town.mjs: courses, owls, pumpkins, Snowy Pines, stones, fishing).
  const acts=buildActivities({T,outdoors,geo,mat,box,ico,label,groundY:(x,z)=>chunks.surfaceHeight(x,z)});let run=null,vista=null,vistaK=0,stoneRun=null,fishing=null;
  const vistaPos=new T.Vector3(),vistaLook=new T.Vector3();
  const hostFigs=HOSTS.map(h=>{const f=figure(lookFromSeed('host-'+h.id));const a=ACTIVITY_BY_ID[h.activity],fx=a?a.points[0]:TOWN2.clock;f.root.position.set(h.x,chunks.surfaceHeight(h.x,h.z),h.z);f.root.rotation.y=Math.atan2(fx.x-h.x,fx.z-h.z)+Math.PI;outdoors.add(f.root);return {h,f};});
  {const h={id:'steward',x:ARENA_STEWARD.x,z:ARENA_STEWARD.z},f=figure(lookFromSeed('host-steward'));f.root.position.set(h.x,chunks.surfaceHeight(h.x,h.z),h.z);f.root.rotation.y=Math.atan2(-6,-10)+Math.PI;outdoors.add(f.root);hostFigs.push({h,f});}   // Marigold, the show ring steward
  // Your horse's own stall (the back one on the left of the hall) shows the same decor you placed in the home stall,
  // so the world and the home page are one stable. The others fill the stalls after it. Horses face the hall (+x).
  const myIndex=Math.max(0,companions.findIndex(c=>c.data.id===preferredHorse));
  const bay=i=>BAYS[i===myIndex?0:Math.min(BAYS.length-1,i<myIndex?i+1:i)];
  // v92: no separate decor-only copy any more. The real home stall (below) stands in your bay all the time, so walking
  // off and back changes nothing on the walls; only its wide backdrop and its own lights are care-only.
  // One world (2026-11-12): your barn stall IS the home stall. Care (brush, carrots, pet, rake, whistle) runs here
  // with the fixed stall camera (home-horse.js world mode); Walk or any move key hands back to the normal camera,
  // and F / Interact inside the stall brings it back. The care root sits where the decor stall does, unscaled.
  const careRoot=new T.Group();careRoot.position.set(-15.9,0,-10);careRoot.rotation.y=Math.PI/2;expansion.interior.add(careRoot);
  // While you care, the barn around your bay is hidden and the full home stall (walls, window, trough, door) stands in
  // with its own warm lights, so the view is exactly the old home stall. Walking off swaps back to the barn bay.
  const homeStall=buildStall(T);careRoot.add(homeStall.group);homeStall.setBay(true);
  // The barn's own bucket and hay net for that bay would sit inside the home stall; it has its own trough.
  for(const o of expansion.interior.children)if(o.position.x<-17.5&&o.position.z<-5&&o.position.z>-15&&o.position.y>.5&&o.position.y<3)o.visible=false;
  try{homeStall.setDecor(loadStall(),companions[myIndex]?.data.name||'');}catch{}
  let hiddenForCare=[];
  function careSet(on){homeStall.setBay(!on);
    if(on){hiddenForCare=expansion.interior.children.filter(o=>o!==careRoot&&o.visible);hiddenForCare.forEach(o=>o.visible=false);}
    else{hiddenForCare.forEach(o=>o.visible=true);hiddenForCare=[];}}
  let care=null,caring=false,careMix=0;// careMix: 0 barn light … 1 stall light, ramped in frame over the camera glide (v93)
  try{const me=companions[myIndex],cb=window.TrottCare||{};if(me)care=createHomeHorse({horse:me.data,onCare:cb.onCare,basket:cb.basket,drawCarrot:cb.drawCarrot,rest:()=>cb.rest?cb.rest(me.data):100,world:{root:careRoot,camera,stall:homeStall,onLeave:()=>leaveCare()}});
    if(care){care.setActive(false);view.append(care.el);}}catch(err){console.warn('stall care unavailable',err);care=null;}
  // v96 (Yoshi): your horse stands in its stall at the same spot and angle as the care view, not square to the hall.
  function standHome(h,i){if(i===myIndex&&care){const hw=care.horseWorld();h.root.position.set(hw.pos.x,0,hw.pos.z);h.root.rotation.y=hw.yaw;return;}const b=bay(i);h.root.position.set(b.x,0,b.z);h.root.rotation.y=Math.PI/2;}
  {const me=companions[myIndex];if(me&&me.area==='barn'&&me!==mounted)standHome(me,myIndex);}
  const inMarket=()=>area==='barn'&&inMarketHall(position.x,position.z);
  const inMyStall=()=>area==='barn'&&!mounted&&position.x<-4.4&&Math.abs(position.z+10)<4.2;
  function enterCare(){const me=companions[myIndex];if(!care||caring||area!=='barn'||mounted||!me||me.area!=='barn')return false;
    caring=true;cancelWalk();keys.clear();me.root.visible=false;avatar.root.visible=false;host.classList.add('world-caring');careSet(true);care.setActive(true);try{updateHUD();}catch{}return true;}
  // Leaving glides the camera (careBlend, in frame) from the stall view to the follow view. Saddle (ride) turns the
  // horse to face the hall, mounts, and lifts the camera to a high view over the stall front, ready to ride out.
  let careBlend=null,careLook=new T.Vector3();const _cbP=new T.Vector3(),_cbL=new T.Vector3();
  function leaveCare({ride=false}={}){if(!caring)return;caring=false;const me=companions[myIndex],hw=care.horseWorld();care.setActive(false);careSet(false);
    careBlend=reducedMotion?null:{pos:camera.position.clone(),look:careLook.clone(),fov:camera.fov,t:0};if(!careBlend){camera.fov=58;camera.updateProjectionMatrix();}
    if(me){me.root.position.set(hw.pos.x,0,hw.pos.z);me.root.rotation.y=ride?Math.PI/2:hw.yaw;}avatar.root.visible=true;host.classList.remove('world-caring');
    if(ride&&me){yaw=-Math.PI/2;pitch=.8;mount(me);}else{try{updateHUD();}catch{}}}
  // A painted name plate over each stall front for the horse that lives there (no floating tags indoors).
  companions.forEach((h,i)=>{const b=bay(i);if(b.x<-14)return;expansion.plaque(h.data.name,-HALL_X+.12,4.6,b.z,{face:Math.PI/2,w:2.2,h:.5,wood:'#5a3a22',ink:'#f6dfa2'});});
  {const b=bay(myIndex);TP.paintStall({x:-HALL_X+.16,y:3.75,z:b.z,face:Math.PI/2,parent:expansion.interior});}
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
  const cloudstep=buildCloudstep({T,outdoors,label,simple:!!renderer.simpleGraphics,ground:sh=>addTerrain(sh,TER,detU)});
  // Smugglers' Grotto (note #29; moved 2026-11-13): a cave mouth at the foot of Cloudstep on the side away from the
  // trailhead, so you have to ride round the mountain to find it. It sits on the flat foot ring and opens outward;
  // the mountain's lowest slope rises behind it (on the trail, the grass slope above clipped the mouth). On foot only.
  const CAVE=(()=>{const a=CLOUDSTEP.theta0+Math.PI,cx=Math.cos(a),cz=Math.sin(a),foot=Math.min(trailRadius(Math.PI-Math.PI*2),CLOUDSTEP.R0-CLOUDSTEP.W),rr=foot-CLOUDSTEP.W+.6;
    const ux=-cx,uz=-cz,x=CLOUDSTEP.cx+cx*rr,z=CLOUDSTEP.cz+cz*rr,p={x,z,y:groundHeight(x,z)},d=0,g=new T.Group();g.position.set(x,p.y-.05,z);g.rotation.y=Math.atan2(-ux,-uz);outdoors.add(g);
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
  function enterCave(){if(!adventure.grotto){adventure.grotto=1;saveAdventure();}if(mounted){tell('Hop down first. Your horse will wait for you outside the cave.',5);sfx('bonk');return;}openSteeple('cave.html?in=world',"Smugglers' Grotto",'Back out at the foot of Cloudstep.');}
  // The Cloudstep Sky Lift (note #28): summit station → valley station in the far north-east corner.
  // Lift towers keep clear of buildings, fences and stations placed so far (blocked = world-logic's footprint test).
  const liftAvoid=[...OBSTACLES,...town.obstacles,...acts.obstacles,...expansion.obstacles,...stations.obstacles,...cloudstep.obstacles];
  const skiLift=(()=>{const dir=Math.atan2(VALLEY_STATION.z-CLOUDSTEP.cz,VALLEY_STATION.x-CLOUDSTEP.cx);return buildSkiLift({T,outdoors,groundHeight,stage:host,top:{x:CLOUDSTEP.cx-Math.cos(dir)*3.5,z:CLOUDSTEP.cz-Math.sin(dir)*3.5},bottom:VALLEY_STATION,
    avoid:(x,z)=>{const s=cloudstepAt(x,z);return !!s&&(s.region==='ledge'||s.region==='summit')||blocked(x,z,2.6,0,liftAvoid);},onToggle:(v,why)=>{sfx(v?'creak':'thud',{vol:.6});tell(v?'The sky lift hums to life. It stops by itself when nobody has ridden it for a few minutes.':why==='idle'?'Nobody’s riding, so the sky lift has stopped. The lever is at the top.':'The sky lift slows to a stop.',4);}});})();
  // The corn maze (note #26, world-cornmaze*.js): a fresh maze every day; jumps can only be cleared on horseback.
  const cornDay=(d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'))(new Date());
  const corn=createCornMaze({T,scene:outdoors,layout:cornLayout('corn-'+cornDay),groundY:(x,z)=>chunks.surfaceHeight(x,z),prepMaterial:seeThrough,quality:renderer.simpleGraphics?'simple':'full'});
  const CORN_KEY='trottville-cornmaze-v1';let cornSave;try{cornSave=JSON.parse(localStorage.getItem(CORN_KEY))||{};}catch{cornSave={};}if(cornSave.day!==cornDay)cornSave={day:cornDay,home:false,golden:false};
  let cornLoot=0,cornTold=false,cornActive=true,cornCam=0,talkK=0,restFor=0;const talkPos=new T.Vector3(),talkLook=new T.Vector3(),_talkAt=new T.Vector3();const CORN_PAY={apple:2,horseshoe:5,golden:25};
  // Legends (note #19): garden bed, rainbow's end, moonlit unicorn, stargazing, pegasus. Callbacks read live state.
  let skyNight=0;
  // v111 "Pretty effects" (✨ switch beside Sounds/Music; localStorage trottville-gfx = 'full' | 'lite'): the bloom +
  // colour grade pass. Left unset, it is on, and if the phone can't keep ~30 fps for 5 s it switches itself off once.
  const GFX='trottville-gfx',gfxPref=()=>{try{return localStorage.getItem(GFX);}catch{return null;}};let pretty=gfxPref()!=='lite',gfxT=0,gfxN=0,gfxLast=0;
  const onGfx=e=>{pretty=!!e.detail?.on;detU.value=pretty?1:0;};window.addEventListener('trottville:gfx',onGfx);listeners.push(()=>window.removeEventListener('trottville:gfx',onGfx));
  function gfxWatch(now){const dt=gfxLast?now-gfxLast:0;gfxLast=now;if(!pretty||!glow||gfxPref()||dt<=0||dt>250)return;gfxT+=dt;gfxN++;
    if(gfxT>5000){const avg=gfxT/gfxN;gfxT=0;gfxN=0;if(avg>34){pretty=false;try{localStorage.setItem(GFX,'lite');}catch{}window.dispatchEvent(new CustomEvent('trottville:gfx',{detail:{on:false}}));tell('Pretty effects switched off to keep riding smooth. Turn them back on with ✨ in the menu.',6);}}}
  const legendsWorld=createLegends({T,outdoors,stage:host,groundHeight,tell:(t,s)=>tell(t,s),sfx:(n,o)=>sfx(n,o),
    addHorse:h=>{const r=RanchUI.get();if(r)RanchUI.set({...r,herd:[...r.herd,h]});},
    ranchFood:()=>RanchUI.get()?.food||{},useFood:k=>{const r=RanchUI.get();if(r&&(r.food[k]||0)>0)RanchUI.set({...r,food:{...r.food,[k]:r.food[k]-1}});},
    supplies:()=>adventure?.supplies||{},useSupply:k=>{if((adventure.supplies[k]||0)>0){adventure.supplies[k]--;saveAdventure();}},salt:storageKey,
    bestTrust:()=>bestTrust()});
  // 2026-11-15 playtest: an 8-tap barn game paid 20 every time (200+/min). First finish of each game a day pays 20, replays 5.
  function barnPayFirst(id){const day=new Date().toISOString().slice(0,10),k='trottville-barnpay';let v;try{v=JSON.parse(localStorage.getItem(k));}catch{}if(v?.day!==day)v={day,ids:[]};if(v.ids.includes(id))return false;v.ids.push(id);try{localStorage.setItem(k,JSON.stringify(v));}catch{}return true;}
  const legendCtx=()=>({x:position.x,z:position.z,mounted:!!mounted,speed:moveSpeed,night:skyNight,kind:sky.kind,area,place:nearestPlace,heading:(mounted?mounted.root:avatar.root).rotation.y});
  const outdoorObstacles=[...OBSTACLES,...town.obstacles,...acts.obstacles,...expansion.obstacles,...stations.obstacles,...cloudstep.obstacles,...corn.obstacles,...skiLift.obstacles,...legendsWorld.obstacles];
  // Riding: the shop doorways are shut to horses too (you walk in on foot; your horse waits at the rail).
  const _lanternDir=new T.Vector3();
  // ===== Wave A (note #42, v113): natural jumps + combos, blossom speed lanes, wind gusts, ghost rider =====
  const WA=(()=>{const rnd=(i,s)=>{let h=Math.imul(i+1,374761393)^Math.imul(s+7,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
    const pathD=(x,z)=>{let d=1e9;for(const l of MAP_PATHS.routes||[])for(let k=0;k+1<l.length;k++){const [ax,az]=l[k],[bx,bz]=l[k+1],L=(bx-ax)**2+(bz-az)**2||1,t=Math.max(0,Math.min(1,((x-ax)*(bx-ax)+(z-az)*(bz-az))/L));d=Math.min(d,Math.hypot(x-ax-t*(bx-ax),z-az-t*(bz-az)));}return d;};
    const ok=(x,z,r)=>Math.abs(x)<285&&Math.abs(z)<285&&!blocked(x,z,r,0,outdoorObstacles)&&(r=>!r.r||r.d>(r.r.w||7)+5)(riverAt(x,z))&&pathD(x,z)>5&&LOCATIONS.every(l=>Math.hypot(l.x-x,l.z-z)>24)&&Math.hypot(x-TOWN2.x,z-TOWN2.z)>48&&Math.hypot(x,z)>40&&slopeAt(x,z).g<.35;
    const KINDS=[['log','#7a5432'],['hedge','#3f6b35'],['brush','#8a7a45']];
    // Natural jumps: clusters of 3 low obstacles in a line, solid until you jump them (height .75 < a leap).
    const jumps=[],grp=new T.Group();outdoors.add(grp);
    const gLog=new T.CylinderGeometry(.32,.36,1,9),gHedge=new T.BoxGeometry(1,1,1),gBrush=new T.ConeGeometry(.6,1,7),gLeaf=(()=>{const g=new T.SphereGeometry(.5,14,8);const P=g.attributes.position;for(let i=0;i<P.count;i++){const x=P.getX(i),y=P.getY(i),z=P.getZ(i),n=1+.12*Math.sin(x*23+z*17)*Math.cos(y*19+x*7);P.setXYZ(i,x*n,Math.max(-.2,y)*n,z*n);}g.computeVertexNormals();return g;})();
    const mats=Object.fromEntries(KINDS.map(([k,c])=>[k,new T.MeshStandardMaterial({color:c,roughness:.9})]));
    for(let c=0,tries=0;c<26&&tries<900;tries++){const x=-280+rnd(tries,1)*560,z=-280+rnd(tries,2)*560,alongX=rnd(tries,3)<.5,kind=KINDS[Math.floor(rnd(tries,4)*3)][0];
      const pts=[0,1,2].map(i=>({x:x+(alongX?i*9:0),z:z+(alongX?0:i*9)}));if(!pts.every(p=>ok(p.x,p.z,3)))continue;c++;
      for(const p of pts){const o={kind:'box',x:p.x,z:p.z,hx:alongX?.35:2,hz:alongX?2:.35,height:.75,natural:kind,alongX,t:0};outdoorObstacles.push(o);jumps.push(o);}}
    // Meshes wait for the first frame: groundY isn't ready while the world is still being set up.
    let built=false;function build(){built=true;for(const o of jumps){const p=o,kind=o.natural,alongX=o.alongX;
        const y=groundY(p.x,p.z),m=kind==='log'?new T.Mesh(gLog,mats.log):kind==='hedge'?new T.Mesh(gHedge,mats.hedge):new T.Group();
        if(kind==='log'){m.scale.set(1,4,1);m.rotation[alongX?'x':'z']=Math.PI/2;m.position.set(p.x,y+.36,p.z);}
        else if(kind==='hedge'){m.geometry=gLeaf;m.scale.set(alongX?.8:4.2,.85,alongX?4.2:.8);m.position.set(p.x,y+.3,p.z);}
        else{for(let k=0;k<5;k++){const b=new T.Mesh(gBrush,mats.brush);b.scale.set(.9,.8,.9);const u=(k-2)*.85;b.position.set(alongX?0:u,.4,alongX?u:0);m.add(b);}m.position.set(p.x,y,p.z);}
        grp.add(m);}
      for(const [c,pts] of lanes.entries())buildLane(c,pts);}
    let chain=[],chainPay=0,payAt=0;const DAY_CAP=60;
    function jumpStep(now){if(!mounted||area!=='outdoor')return;const air=jump>.2;
      for(const j of jumps){if(Math.abs(j.x-position.x)>4||Math.abs(j.z-position.z)>4)continue;const along=j.alongX?Math.abs(position.x-j.x):Math.abs(position.z-j.z),lat=j.alongX?Math.abs(position.z-j.z):Math.abs(position.x-j.x);
        if(air&&along<.9&&lat<2.2&&now-j.t>3000){j.t=now;chain=chain.filter(t=>now-t<6000);chain.push(now);const n=chain.length;
          const d=actSave.wa?.day===today()?actSave.wa:(actSave.wa={day:today(),coins:0}),pay=Math.max(0,Math.min(Math.min(n,5),DAY_CAP-d.coins));d.coins+=pay;chainPay+=pay;payAt=now+2600;saveActs();
          sfx(n>1?'chime':'pop',{vol:.7});tell(n>1?`🌿 ${n}× jump combo!${pay?' +'+pay+' 🪙':''}`:`🌿 Clean jump over the ${j.natural}!${pay?' +'+pay+' 🪙':''}`,2);
          if(pretty)motes.emit('sparkle',position.x,groundY(position.x,position.z)+1,position.z,8);}}
      if(chainPay&&now>payAt){queueCoins({from:'Natural jumps',coins:chainPay,lines:['Jumps and combos · '+chainPay+' 🪙']});chainPay=0;}}
    // Blossom lanes: glowing petal-lined strips across open country. Ride along one for a burst of speed.
    const lanes=[],petalGeo=new T.SphereGeometry(.16,6,4),petalMat=new T.MeshStandardMaterial({color:'#f6b8d0',emissive:'#f08cb4',emissiveIntensity:.5,roughness:.6}),goldMat=new T.MeshStandardMaterial({color:'#f4d27a',emissive:'#e8b84a',emissiveIntensity:.6});
    for(let c=0,tries=0;c<9&&tries<900;tries++){const x=-260+rnd(tries,11)*520,z=-260+rnd(tries,12)*520,a=rnd(tries,13)*Math.PI*2,bend=(rnd(tries,14)-.5)*.5;
      const pts=[];let px=x,pz=z,h=a;for(let i=0;i<7;i++){pts.push({x:px,z:pz});h+=bend;px+=Math.sin(h)*11;pz+=Math.cos(h)*11;}
      if(!pts.every(p=>ok(p.x,p.z,2.5)))continue;c++;lanes.push(pts);}
    function buildLane(c,pts){
      const n=Math.round(66*6/2),inst=new T.InstancedMesh(petalGeo,c%2?petalMat:goldMat,n*2),m4=new T.Matrix4();let k=0;
      for(let i=0;i+1<pts.length;i++){const A=pts[i],B=pts[i+1],L=Math.hypot(B.x-A.x,B.z-A.z),nx=-(B.z-A.z)/L,nz=(B.x-A.x)/L;
        for(let s=0;s<L&&k<n*2-1;s+=1.6){const t=s/L,x0=A.x+(B.x-A.x)*t,z0=A.z+(B.z-A.z)*t;for(const side of [-1.9,1.9]){const xx=x0+nx*side,zz=z0+nz*side;m4.makeTranslation(xx,groundY(xx,zz)+.22,zz);inst.setMatrixAt(k++,m4);}}}
      inst.count=k;inst.instanceMatrix.needsUpdate=true;grp.add(inst);}
    let boostUntil=0,laneTold=0;
    function onLane(){for(const pts of lanes)for(let i=0;i+1<pts.length;i++){const A=pts[i],B=pts[i+1],L=(B.x-A.x)**2+(B.z-A.z)**2,t=Math.max(0,Math.min(1,((position.x-A.x)*(B.x-A.x)+(position.z-A.z)*(B.z-A.z))/L));
      if(Math.hypot(position.x-A.x-t*(B.x-A.x),position.z-A.z-t*(B.z-A.z))<2.4)return true;}return false;}
    // Wind gusts: every minute or two outside a gust sweeps across the valley. Ride with it for a boost, into it and you slow a little.
    let gust=null,nextGust=performance.now()+45000;const DIRS=['north','north-east','east','south-east','south','south-west','west','north-west'];
    function speedFactor(now,heading){let f=1;if(!mounted||area!=='outdoor')return f;
      if(moveSpeed>3&&onLane()){if(now>boostUntil&&now-laneTold>20000){laneTold=now;tell('🌸 Blossom lane! Speed burst!',2);sfx('whoosh',{vol:.5});}boostUntil=now+1600;}
      if(now<boostUntil){f*=1.3;if(pretty&&Math.random()<.35)motes.emit('sparkle',position.x,groundY(position.x,position.z)+.6,position.z,1);}
      if(gust&&heading!=null){const al=Math.cos(heading-gust.a);f*=al>0?1+.16*al:1+.07*al;}
      return f;}
    function gustStep(now){if(area!=='outdoor'){gust=null;return;}if(!gust&&now>nextGust){const a=Math.random()*Math.PI*2;gust={a,until:now+9000};nextGust=now+70000+Math.random()*60000;
        const from=DIRS[Math.round(((a+Math.PI)%(Math.PI*2))/(Math.PI/4))%8];sfx('whoosh',{vol:.8});tell(`💨 A gust of wind from the ${from}!${mounted?' Ride with it for a boost.':''}`,3);}
      if(gust){if(now>gust.until){gust=null;return;}if(pretty)for(let i=0;i<2;i++){const r=4+Math.random()*10,b=Math.random()*Math.PI*2,x=position.x+Math.cos(b)*r,z=position.z+Math.sin(b)*r;motes.emit('petal',x,groundY(x,z)+1+Math.random()*3,z,1);}}}
    // Ghost rider: your best ridden run of each course plays back as a pale horse to race against.
    let rec=null,ghost=null,ghostPath=null,ghostT0=0,recAt=0;
    function ghostModel(){if(ghost)return ghost;const m=makeSculptedHorse(T,{id:'ghost',coat:{...COATS.silver,white:'#ffffff',dapple:false,socks:[0,0,0,0]}},{});
      m.root.traverse(o=>{if(o.material)o.material=[].concat(o.material).map(mm=>{const c=mm.clone();c.transparent=true;c.opacity=.38;c.depthWrite=false;if(c.emissive){c.emissive.set('#9fb4ff');c.emissiveIntensity=.6;}return c;}).at(0);});
      m.setGait('gallop');outdoors.add(m.root);ghost=m;return m;}
    function ghostStart(a){rec=a.mounted&&a.kind==='course'?[]:null;recAt=0;ghostPath=a.mounted&&actSave.ghost?.[a.id]||null;ghostT0=performance.now();if(ghostPath){ghostModel().root.visible=true;tell('👻 Your ghost rider joins you: beat your best run!',3);}}
    function ghostStop(){ghostPath=null;rec=null;if(ghost)ghost.root.visible=false;}
    function ghostSave(a,fresh){if(fresh&&rec&&rec.length>4){actSave.ghost||={};actSave.ghost[a.id]=rec.length>500?rec.filter((_,i)=>i%Math.ceil(rec.length/500)===0):rec;saveActs();}}
    function ghostStep(now,delta){if(rec&&now-recAt>200){recAt=now;rec.push([Math.round(position.x*10)/10,Math.round(position.z*10)/10,Math.round(now-ghostT0)]);}
      if(!ghostPath||!ghost)return;const t=now-ghostT0;let i=ghostPath.findIndex(p=>p[2]>t);if(i<0){ghost.root.visible=false;return;}if(i===0)i=1;
      const A=ghostPath[i-1],B=ghostPath[i],k=(t-A[2])/Math.max(1,B[2]-A[2]),x=A[0]+(B[0]-A[0])*k,z=A[1]+(B[1]-A[1])*k;
      ghost.root.position.set(x,groundY(x,z),z);ghost.root.rotation.y=Math.atan2(B[0]-A[0],B[1]-A[1]);ghost.update(delta);}
    return {ok,step(_n,delta){const now=performance.now();if(!built)build();jumpStep(now);gustStep(now);ghostStep(now,delta);},speedFactor,ghostStart,ghostStop,ghostSave,info:()=>({jumps:jumps.length,lanes:lanes.length,gust:!!gust,lanePts:lanes.map(l=>l[0]),jumpPts:jumps.filter((_,i)=>i%3===0).map(j=>[j.x,j.z])}),gustNow(){nextGust=0;}};})();
  // ===== Wave B (note #42, v113): 100 lost horseshoes, wildflower book, message bottles + treasure map, bug jar, scrapbook =====
  const WB=(()=>{const KEY='trottville-collect-v1';let c={};try{c=JSON.parse(localStorage.getItem(KEY))||{};}catch{}
    c.shoes||=[];c.flowers||={};c.bottles||=[];c.treasure||=false;c.bugs||={};c.bugDay||={};c.photos||={};
    const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(c));}catch{const k=Object.keys(c.photos);if(k.length>8){for(const x of k.slice(0,k.length-8))delete c.photos[x];try{localStorage.setItem(KEY,JSON.stringify(c));}catch{}}}};
    const rnd=(i,s)=>{let h=Math.imul(i+11,2654435761)^Math.imul(s+3,1597334677);h=Math.imul(h^(h>>>15),2246822519);return ((h^(h>>>13))>>>0)/4294967296;};
    const spots=(n,salt,r=1.2)=>{const out=[];for(let t=0;out.length<n&&t<9000;t++){const x=-282+rnd(t,salt)*564,z=-282+rnd(t,salt+1)*564;if(WA.ok(x,z,r)&&out.every(p=>Math.hypot(p.x-x,p.z-z)>18))out.push({x:Math.round(x*10)/10,z:Math.round(z*10)/10});}return out;};
    const grp=new T.Group();outdoors.add(grp);const m4=new T.Matrix4(),q=new T.Quaternion(),one=new T.Vector3(1,1,1),zero=new T.Vector3(0,0,0),v3=new T.Vector3();
    // 100 lost horseshoes (+3 each, +25 every tenth, +200 for all 100).
    const SHOES=spots(100,101);let shoeMesh=null;
    // Wildflowers: twelve kinds, three patches each; walk up on foot to press one into the book.
    const FLOWERS=[['bluebell','Bluebell','#5b6fd6'],['poppy','Poppy','#e2483d'],['buttercup','Buttercup','#f2cf3a'],['foxglove','Foxglove','#c25aa8'],['daisy','Ox-eye daisy','#fbfbf4'],['cornflower','Cornflower','#3d6fe0'],
      ['primrose','Primrose','#f5e27a'],['lavender','Wild lavender','#9b7fd1'],['marigold','Marsh marigold','#f2a23a'],['forgetmenot','Forget-me-not','#7fb2f0'],['rose','Wild rose','#f19bb3'],['orchid','Bee orchid','#d58fd0']];
    const FSP=spots(36,202,1);const fpatch=FSP.map((p,i)=>({...p,f:FLOWERS[i%12]}));
    // Message bottles: eight on the river banks. Four hold a piece of a treasure map.
    const BOTTLES=[];{const lines=RIVERS.flatMap(r=>{const L=r.line||[];return [.15,.35,.6,.85].map(f=>{const i=Math.floor(f*(L.length-2)),[ax,az]=L[i],[bx,bz]=L[i+1],len=Math.hypot(bx-ax,bz-az)||1;const o=(r.w||7)/2+1.4;return {x:Math.round((ax-(bz-az)/len*o)*10)/10,z:Math.round((az+(bx-ax)/len*o)*10)/10};});});
      for(const p of lines)if(BOTTLES.length<8&&!blocked(p.x,p.z,.6,0,outdoorObstacles))BOTTLES.push(p);}
    const NOTES=['“Whoever finds this: the smugglers hid more than old coins in the mountain.” — S.','“Day 40 at sea. I dream of golden carrots and green fields.”','“A map, torn in four. Find the others and the X is yours.”','“The moon wears the clock tower like a hat at midnight. Look up!”',
      '“I planted a golden seed once. The rabbits got it. Build a fence!”','“The treetop folk of Mosswood know more than they say.”','“Two pieces down, two to go. Keep following the river.”','“The last piece! Hold the map up and look for the X.”'];
    const MAPPED=[2,4,6,7],X=spots(1,909,2)[0]||{x:180,z:-180};
    const nearName=(x,z)=>{let b=null,d=1e9;for(const l of LOCATIONS){const k=Math.hypot(l.x-x,l.z-z);if(k<d){d=k;b=l;}}const a=Math.atan2(x-b.x,z-b.z),dir=['south','south-east','east','north-east','north','north-west','west','south-west'][((Math.round(a/(Math.PI/4))%8)+8)%8];return `${Math.round(d)} m ${dir} of ${b.name}`;};
    // Butterflies by day, fireflies after dark: ten meadows. Walk through on foot to catch one kind a day there.
    const BUGS=[['monarch','Monarch','#e8892b'],['morpho','Blue morpho','#3a7be0'],['brimstone','Brimstone','#e6e04a'],['peacock','Peacock','#b8432f'],['white','Cabbage white','#f4f4ee'],['admiral','Red admiral','#c23a2a']];
    const MEAD=spots(10,303,2).map((p,i)=>({...p,b:BUGS[i%6],s:[]}));
    function bugTex(col){const cv=document.createElement('canvas');cv.width=cv.height=64;const x=cv.getContext('2d');x.fillStyle=col;for(const s of [-1,1]){x.beginPath();x.ellipse(32+s*14,26,14,11,s*.5,0,7);x.fill();x.beginPath();x.ellipse(32+s*11,44,9,8,-s*.4,0,7);x.fill();}x.fillStyle='#2b2018';x.fillRect(30,18,4,32);return new T.CanvasTexture(cv);}
    let built=false;function build(){built=true;
      shoeMesh=new T.InstancedMesh(new T.TorusGeometry(.24,.065,6,14,Math.PI*1.3),new T.MeshStandardMaterial({color:'#f2c04a',emissive:'#c78f1a',emissiveIntensity:.55,metalness:.6,roughness:.35}),SHOES.length);
      SHOES.forEach((p,i)=>{q.setFromEuler(new T.Euler(-.3,rnd(i,5)*6,Math.PI*.85));m4.compose(v3.set(p.x,groundY(p.x,p.z)+.3,p.z),q,c.shoes.includes(i)?zero:one);shoeMesh.setMatrixAt(i,m4);});grp.add(shoeMesh);
      const head=new T.SphereGeometry(.13,6,4);for(const f of FLOWERS){const list=fpatch.filter(p=>p.f===f);const im=new T.InstancedMesh(head,new T.MeshStandardMaterial({color:f[2],emissive:f[2],emissiveIntensity:.18,roughness:.7}),list.length*7);let k=0;
        for(const p of list)for(let j=0;j<7;j++){const a=j*.9,r=j?.45+rnd(j,k)*.4:0,x=p.x+Math.cos(a)*r,z=p.z+Math.sin(a)*r;m4.makeTranslation(x,groundY(x,z)+.32+(j%3)*.05,z);im.setMatrixAt(k++,m4);}grp.add(im);}
      const bg=new T.CylinderGeometry(.09,.12,.42,8),bm=new T.MeshStandardMaterial({color:'#7fc0a8',transparent:true,opacity:.75,roughness:.15,metalness:.1});
      BOTTLES.forEach((p,i)=>{const b=new T.Mesh(bg,bm);b.rotation.z=1.3;b.position.set(p.x,groundY(p.x,p.z)+.12,p.z);b.visible=!c.bottles.includes(i);b.userData.i=i;grp.add(b);p.mesh=b;});
      for(const m of MEAD){const mat=new T.SpriteMaterial({map:bugTex(m.b[2]),transparent:true,depthWrite:false});for(let k=0;k<4;k++){const s=new T.Sprite(mat);s.scale.setScalar(.45);grp.add(s);m.s.push(s);}}
      chest=new T.Group();{const wood=new T.MeshStandardMaterial({color:'#7a4a24',roughness:.8}),gold=new T.MeshStandardMaterial({color:'#e2b443',metalness:.7,roughness:.3});const b=new T.Mesh(new T.BoxGeometry(1,.6,.7),wood);b.position.y=.3;const l=new T.Mesh(new T.CylinderGeometry(.35,.35,1,10,1,false,0,Math.PI),wood);l.rotation.z=Math.PI/2;l.position.y=.6;const s=new T.Mesh(new T.BoxGeometry(1.04,.1,.74),gold);s.position.y=.45;chest.add(b,l,s);}
      chest.position.set(X.x,groundY(X.x,X.z),X.z);chest.visible=mapPieces()>=4&&!c.treasure;grp.add(chest);}
    let chest=null;const mapPieces=()=>c.bottles.filter(i=>MAPPED.includes(i)).length;
    const pay=(from,coins,line)=>queueCoins({from,coins,lines:[line+' · '+coins+' 🪙']});
    let photoAt=0,bugT=0;
    function step(now,delta){if(!built)build();if(area!=='outdoor')return;const px=position.x,pz=position.z;
      // horseshoes
      for(let i=0;i<SHOES.length;i++){const p=SHOES[i];if(Math.abs(p.x-px)>2.2||Math.abs(p.z-pz)>2.2||c.shoes.includes(i))continue;c.shoes.push(i);save();const n=c.shoes.length;
        m4.compose(v3.set(0,-99,0),q,zero);shoeMesh.setMatrixAt(i,m4);shoeMesh.instanceMatrix.needsUpdate=true;sfx('coin');if(pretty)motes.emit('sparkle',p.x,groundY(p.x,p.z)+.6,p.z,10);
        const bonus=n===100?200:n%10===0?25:0;pay('Lost horseshoes',3+bonus,n===100?'All 100 lost horseshoes!':`Lost horseshoe ${n}/100`);tell(n===100?'🧲 ALL 100 lost horseshoes! You are the luckiest rider in Trottville!':`🧲 A lost horseshoe! ${n}/100${bonus?' · bonus +'+bonus+' 🪙':''}`,3);}
      // wildflowers (on foot)
      if(!mounted)for(const p of fpatch){if(Math.abs(p.x-px)>1.8||Math.abs(p.z-pz)>1.8||c.flowers[p.f[0]])continue;c.flowers[p.f[0]]=Date.now();save();const n=Object.keys(c.flowers).length;sfx('sparkle');
        tell(`🌼 You pressed a ${p.f[1]} into your flower book (${n}/12).`,4);pay('Wildflower book',n===12?60:5,n===12?'All twelve wildflowers':'Pressed a '+p.f[1]);}
      // bottles
      for(const p of BOTTLES){const i=BOTTLES.indexOf(p);if(c.bottles.includes(i)||Math.abs(p.x-px)>2||Math.abs(p.z-pz)>2)continue;c.bottles.push(i);save();if(p.mesh)p.mesh.visible=false;sfx('pop');
        const piece=MAPPED.includes(i),n=mapPieces();adventureUI.open('🍾 A message in a bottle',`<p style="font-style:italic">${escapeHTML(NOTES[i])}</p>${piece?`<p><b>🗺️ A torn piece of a treasure map! (${n}/4)</b></p>${n>=4?`<p>The pieces fit together. The X is about <b>${escapeHTML(nearName(X.x,X.z))}</b>.</p>`:''}`:''}<button type="button" class="primary full" id="wb-ok">Keep it</button>`);
        adventureUI.dialog.querySelector('#wb-ok').onclick=()=>adventureUI.close();if(n>=4&&chest)chest.visible=!c.treasure;}
      if(chest?.visible&&!c.treasure&&Math.hypot(X.x-px,X.z-pz)<2.6){c.treasure=true;save();chest.visible=false;sfx('fanfare');pay('Treasure chest',150,'Found the treasure');tell('💰 You found the treasure! 150 Trotties!',5);}
      // butterflies / fireflies
      bugT+=delta;const night=skyNight>.5;
      for(const m of MEAD){const d=Math.hypot(m.x-px,m.z-pz);const vis=d<70;for(let k=0;k<m.s.length;k++){const s=m.s[k];s.visible=vis&&!night;if(!s.visible)continue;const a=bugT*(.6+k*.13)+k*1.7;
          s.position.set(m.x+Math.cos(a)*(1.2+k*.5),groundY(m.x,m.z)+.7+Math.abs(Math.sin(bugT*7+k))*.5+k*.15,m.z+Math.sin(a*1.3)*(1.2+k*.4));s.scale.set(.45*Math.abs(Math.cos(bugT*14+k))+.12,.4,1);}
        if(night&&vis&&pretty&&Math.random()<.08)motes.emit('sparkle',m.x+(Math.random()-.5)*5,groundY(m.x,m.z)+.8+Math.random(),m.z+(Math.random()-.5)*5,1);
        if(!mounted&&d<2.6){const key=MEAD.indexOf(m),day=today();if(c.bugDay[key]===day)continue;c.bugDay[key]=day;const kind=night?'firefly':m.b[0];c.bugs[kind]=(c.bugs[kind]||0)+1;save();sfx('sparkle');
          tell(night?'✨ You caught a firefly in your jar! It glows softly.':`🦋 You caught a ${m.b[1]} in your jar! (let it go any time)`,4);}}
      // scrapbook: the first visit to each named place snaps a photo
      if(now-photoAt>4000&&!document.querySelector('dialog[open], .tc-sheet'))for(const l of LOCATIONS){if(c.photos[l.id]||Math.hypot(l.x-px,l.z-pz)>10)continue;photoAt=now;snap(l);break;}}
    function snap(l){try{renderer.render(scene,camera);const src=renderer.domElement,w=200,h=Math.round(w*src.height/src.width),cv=document.createElement('canvas');cv.width=w;cv.height=h;cv.getContext('2d').drawImage(src,0,0,w,h);
        c.photos[l.id]={at:Date.now(),name:l.name,img:cv.toDataURL('image/jpeg',.55)};save();sfx('tap');const fl=document.createElement('div');fl.style.cssText='position:absolute;inset:0;background:#fff;opacity:.85;pointer-events:none;transition:opacity .5s;z-index:40';view.append(fl);requestAnimationFrame(()=>fl.style.opacity='0');setTimeout(()=>fl.remove(),600);
        tell('📷 Snap! '+l.name+' is in your scrapbook.',3);}catch(e){console.warn('scrapbook',e);}}
    function open(){const fl=FLOWERS.map(f=>`<li style="opacity:${c.flowers[f[0]]?1:.45}"><i style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${c.flowers[f[0]]?f[2]:'#ccc'};margin-right:6px"></i>${c.flowers[f[0]]?escapeHTML(f[1]):'???'}</li>`).join('');
      const bugs=[...BUGS.map(b=>[b[0],b[1]]),['firefly','Firefly']].map(([k,n])=>`<li style="opacity:${c.bugs[k]?1:.45}">${c.bugs[k]?escapeHTML(n)+' ×'+c.bugs[k]:'???'}</li>`).join('');
      const ph=Object.values(c.photos).map(p=>`<figure style="margin:0"><img src="${p.img}" alt="${escapeHTML(p.name)}" style="width:100%;border-radius:8px;display:block"><figcaption style="font-size:12px">${escapeHTML(p.name)}</figcaption></figure>`).join('');
      const n=mapPieces();
      adventureUI.open('📖 Collections',`<h3>🧲 Lost horseshoes · ${c.shoes.length}/100</h3><p class="small">Golden horseshoes lie all over Trottville. Every tenth pays a bonus.</p>
        <h3>🌼 Wildflower book · ${Object.keys(c.flowers).length}/12</h3><p class="small">Walk up to a flower patch on foot to press one.</p><ul style="columns:2;padding-left:0;list-style:none;margin:0">${fl}</ul>
        <h3>🍾 Bottles · ${c.bottles.length}/8 · 🗺️ map ${n}/4</h3><p class="small">${c.treasure?'You found the treasure!':n>=4?'The X is about '+escapeHTML(nearName(X.x,X.z))+'.':'Bottles wash up on the river banks.'}</p>
        <h3>🫙 Bug jar</h3><p class="small">Butterflies by day, fireflies after dark. Walk through a meadow on foot.</p><ul style="columns:2;padding-left:0;list-style:none;margin:0">${bugs}</ul>
        <h3>📷 Scrapbook · ${Object.keys(c.photos).length}/${LOCATIONS.length}</h3>${ph?`<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">${ph}</div>`:'<p class="small">Visit a named place to snap its photo.</p>'}
        <button type="button" class="text-button" id="wb-x" style="margin-top:10px">Close</button>`);adventureUI.dialog.querySelector('#wb-x').onclick=()=>adventureUI.close();}
    window.addEventListener('trottville:collections',open);listeners.push(()=>window.removeEventListener('trottville:collections',open));
    function nearest(px,pz){let b=null,bd=1e9;const see=(x,z)=>{const d=Math.hypot(x-px,z-pz);if(d<bd&&d>3&&d<220){bd=d;b={x,z};}};SHOES.forEach((p,i)=>{if(!c.shoes.includes(i))see(p.x,p.z);});fpatch.forEach(p=>{if(!c.flowers[p.f[0]])see(p.x,p.z);});BOTTLES.forEach((p,i)=>{if(!c.bottles.includes(i))see(p.x,p.z);});return b;}
    return {step,open,nearest,info:()=>({shoes:SHOES.length,flowers:fpatch.length,bottles:BOTTLES.length,meadows:MEAD.length,first:{shoe:SHOES[0],flower:fpatch[0],bottle:BOTTLES[0],mead:MEAD[0],x:X},got:{shoes:c.shoes.length,fl:Object.keys(c.flowers).length,photos:Object.keys(c.photos).length}})};})();
    // ===== Wave C (note #42, v114): rabbits, fox guide, rare foal, market wagon, shooting stars, fair days, campfires =====
  const WC=(()=>{const KEY='trottville-life-v1';let c={};try{c=JSON.parse(localStorage.getItem(KEY))||{};}catch{}c.wish||={};const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(c));}catch{}};
    const rnd=(i,s)=>{let h=Math.imul(i+5,2246822519)^Math.imul(s+9,3266489917);h=Math.imul(h^(h>>>16),2654435761);return ((h^(h>>>15))>>>0)/4294967296;};
    const spots=(n,salt,gap=30)=>{const o=[];for(let t=0;o.length<n&&t<9000;t++){const x=-275+rnd(t,salt)*550,z=-275+rnd(t,salt+1)*550;if(WA.ok(x,z,2)&&FIELDS.every(f=>Math.abs(x-f.x)>f.w/2+8||Math.abs(z-f.z)>f.d/2+8)&&FARMS.every(f=>Math.hypot(x-f.house.x,z-f.house.z)>70)&&o.every(p=>Math.hypot(p.x-x,p.z-z)>gap))o.push({x,z});}return o;};
    const grp=new T.Group();outdoors.add(grp);const M=(c,o={})=>new T.MeshStandardMaterial({color:c,roughness:.8,...o});
    // Rabbits: hop about the meadows and bolt when you come close.
    const RAB=spots(28,401,25).map((p,i)=>({hx:p.x,hz:p.z,x:p.x,z:p.z,vx:0,vz:0,t:rnd(i,7)*5,g:null,col:i%3?'#a07a58':'#f2efe8'}));
    // Campfires: sit by one after dark (on foot) for a story.
    const CAMPS=spots(5,505,90);const STORIES=['Old Wilf says the moon wears the clock tower like a hat at midnight.','They say a golden seed only sprouts for someone patient, and only inside a fence.','Sven swears there’s a stone arch on the far side of Cloudstep, where the smugglers came and went.',
      'In Mosswood Grove the oldest tree has a lantern at the very top that never goes out.','Bottles wash up on the river banks. Some say four of them hold a treasure map.','Somewhere a silver-spotted foal runs with the wild herds. Walk up gently and it might follow you home.'];
    // Market wagon: parks at a different road stop every game day.
    const STOPS=[[30,-40],[-60,70],[120,40],[-140,-60],[60,150]].map(([x,z])=>{let b=null;for(let r=0;r<40&&!b;r+=4)for(let a=0;a<6.28&&!b;a+=.5){const X=x+Math.cos(a)*r,Z=z+Math.sin(a)*r;if(!blocked(X,Z,2.5,0,outdoorObstacles))b={x:X,z:Z};}return b||{x,z};});
    const fair=()=>{const d=new Date().getDay();return d===0||d===6;};
    let built=false,wagon=null,fox=null,foal=null,star=null,balloons=null,fires=[];
    function build(){built=true;
      const body=new T.BoxGeometry(.38,.3,.55),ear=new T.BoxGeometry(.07,.22,.05),bm={};
      for(const r of RAB){const g=new T.Group(),m=bm[r.col]||(bm[r.col]=M(r.col));const b=new T.Mesh(body,m);b.position.y=.18;const h=new T.Mesh(new T.BoxGeometry(.24,.22,.24),m);h.position.set(0,.36,.28);for(const s of [-1,1]){const e=new T.Mesh(ear,m);e.position.set(s*.06,.55,.26);g.add(e);}g.add(b,h);r.g=g;grp.add(g);}
      for(const p of CAMPS){const g=new T.Group(),y=groundY(p.x,p.z);for(let k=0;k<5;k++){const l=new T.Mesh(new T.CylinderGeometry(.09,.1,1.1,6),M('#5d3d24'));l.rotation.set(Math.PI/2.6,k*1.25,0);l.position.y=.25;g.add(l);}
        for(let k=0;k<6;k++){const s=new T.Mesh(new T.DodecahedronGeometry(.18),M('#8d8a84'));s.position.set(Math.cos(k)*.75,.1,Math.sin(k)*.75);g.add(s);}
        const fl=new T.Mesh(new T.ConeGeometry(.28,.8,7),new T.MeshBasicMaterial({color:'#ffb347',transparent:true,opacity:.9}));fl.position.y=.6;g.add(fl);
        for(const s of [-1,1]){const lg=new T.Mesh(new T.CylinderGeometry(.22,.22,1.6,8),M('#6b4a30'));lg.rotation.z=Math.PI/2;lg.position.set(s*1.8,.22,0);lg.rotation.y=s*.4;g.add(lg);}
        g.position.set(p.x,y,p.z);grp.add(g);fires.push({...p,fl});}
      wagon=new T.Group();{const wood=M('#8a5a32'),can=M('#e8dcc0'),red=M('#b8423a');const b=new T.Mesh(new T.BoxGeometry(2.2,1,3.4),wood);b.position.y=1;const top=new T.Mesh(new T.CylinderGeometry(1.25,1.25,3.4,12,1,false,0,Math.PI),can);top.rotation.set(Math.PI/2,0,Math.PI/2);top.position.y=1.5;
        const st=new T.Mesh(new T.BoxGeometry(2.3,.1,.5),red);st.position.set(0,2.75,1.75);wagon.add(b,top,st);for(const [x,z] of [[-1.15,1.1],[1.15,1.1],[-1.15,-1.1],[1.15,-1.1]]){const w=new T.Mesh(new T.TorusGeometry(.45,.07,5,12),wood);w.rotation.y=Math.PI/2;w.position.set(x,.5,z);wagon.add(w);}}
      grp.add(wagon);
      fox=new T.Group();{const o=M('#d9752e'),wh=M('#f4ede2');const b=new T.Mesh(new T.BoxGeometry(.32,.3,.8),o);b.position.y=.42;const h=new T.Mesh(new T.ConeGeometry(.2,.42,4),o);h.rotation.x=Math.PI/2;h.position.set(0,.55,.58);const t=new T.Mesh(new T.ConeGeometry(.13,.6,5),o);t.rotation.x=-1.1;t.position.set(0,.5,-.6);const tt=new T.Mesh(new T.SphereGeometry(.09,6,4),wh);tt.position.set(0,.36,-.86);
        for(const s of [-1,1]){const e=new T.Mesh(new T.ConeGeometry(.06,.16,4),o);e.position.set(s*.1,.74,.5);fox.add(e);}for(const [x,z] of [[-.1,.25],[.1,.25],[-.1,-.25],[.1,-.25]]){const l=new T.Mesh(new T.BoxGeometry(.07,.3,.07),M('#3a2a20'));l.position.set(x,.15,z);fox.add(l);}fox.add(b,h,t,tt);}
      fox.visible=false;grp.add(fox);
      foal=makeSculptedHorse(T,{id:'rare-foal',ageMonths:6,coat:{...COATS.silver,white:'#ffffff',dapple:true,socks:[1,1,1,1]}},{});foal.root.scale.setScalar(.62);foal.root.visible=false;grp.add(foal.root);
      star=new T.Mesh(new T.CylinderGeometry(.08,.0,14,5),new T.MeshBasicMaterial({color:'#fffbe6',transparent:true,opacity:0,fog:false,depthWrite:false}));star.visible=false;scene.add(star);
      balloons=new T.Group();{const cols=['#e85b5b','#f2c94c','#5fa8e8','#7cc46a','#c77ce0'];for(let k=0;k<14;k++){const a=k/14*Math.PI*2,r=9+(k%2)*2,b=new T.Mesh(new T.SphereGeometry(.45,10,8),M(cols[k%5],{roughness:.35}));b.scale.y=1.2;b.position.set(SQUARE.x+Math.cos(a)*r,groundY(SQUARE.x,SQUARE.z)+4+(k%3)*.6,SQUARE.z+Math.sin(a)*r);balloons.add(b);
        const s=new T.Mesh(new T.CylinderGeometry(.01,.01,3.6),M('#eee'));s.position.set(b.position.x,b.position.y-2.1,b.position.z);balloons.add(s);}}grp.add(balloons);}
    let foxMode=null,foxUntil=0,nextFox=performance.now()+120000,foalDay='',foalPos=null,starT=0,nextStar=performance.now()+20000,wishBtn=null,fairTold='',campTold=0,wagonTold=0;
    function foxSummon(now){foxMode='lead';foxUntil=now+60000;const fw=camera.getWorldDirection(new T.Vector3());fox.position.set(position.x+fw.x*8,groundY(position.x+fw.x*8,position.z+fw.z*8),position.z+fw.z*8);fox.visible=true;sfx('pop');tell('🦊 A fox pops out of the grass and looks back at you. Follow it!',4);}
    function step(now,delta){if(!built)build();const out=area==='outdoor',px=position.x,pz=position.z,night=skyNight>.5;
      // rabbits
      for(const r of RAB){const d=Math.hypot(r.x-px,r.z-pz);r.g.visible=out&&d<90;if(!r.g.visible)continue;r.t+=delta;
        if(d<8&&(moveSpeed>2||mounted)){const k=1/Math.max(d,.1);r.vx=(r.x-px)*k*6;r.vz=(r.z-pz)*k*6;}else if(r.t>3){r.t=0;const a=Math.random()*6.28;r.vx=Math.cos(a)*1.2;r.vz=Math.sin(a)*1.2;if(Math.hypot(r.x-r.hx,r.z-r.hz)>12){r.vx=(r.hx-r.x)*.2;r.vz=(r.hz-r.z)*.2;}}
        const nx=r.x+r.vx*delta,nz=r.z+r.vz*delta;if(!blocked(nx,nz,.3,0,outdoorObstacles)){r.x=nx;r.z=nz;}r.vx*=.96;r.vz*=.96;const hop=Math.hypot(r.vx,r.vz)>.3?Math.abs(Math.sin(now/120))*.25:0;
        r.g.position.set(r.x,groundY(r.x,r.z)+hop,r.z);if(Math.hypot(r.vx,r.vz)>.05)r.g.rotation.y=Math.atan2(r.vx,r.vz);}
      // fox guide: now and then (or from the wagon's whistle) it leads you to something you haven't found yet
      if(out&&!foxMode&&now>nextFox){nextFox=now+240000+Math.random()*180000;if(WB.nearest(px,pz))foxSummon(now);}
      if(foxMode&&fox){const tg=WB.nearest(px,pz);if(!tg||now>foxUntil||!out){fox.visible=false;foxMode=null;}else{const df=Math.hypot(fox.position.x-px,fox.position.z-pz),dt=Math.hypot(tg.x-fox.position.x,tg.z-fox.position.z);
          let sp=df<9?(mounted?7:3.6):df>16?0:1.5;if(dt<1.5){sp=0;if(Math.hypot(tg.x-px,tg.z-pz)<4){fox.visible=false;foxMode=null;tell('🦊 The fox sniffs the spot, flicks its tail and trots away.',3);}}
          if(sp){const k=sp*delta/Math.max(dt,.01);fox.position.x+=(tg.x-fox.position.x)*k;fox.position.z+=(tg.z-fox.position.z)*k;fox.rotation.y=Math.atan2(tg.x-fox.position.x,tg.z-fox.position.z);}else fox.rotation.y=Math.atan2(px-fox.position.x,pz-fox.position.z);
          fox.position.y=groundY(fox.position.x,fox.position.z)+(sp?Math.abs(Math.sin(now/90))*.08:0);}}
      // rare foal: one silver-spotted foal wanders a different meadow each day until you befriend it
      if(foal&&!c.foal){const d=today();if(foalDay!==d){foalDay=d;const s=spots(12,600+[...d].reduce((a,ch)=>a+ch.charCodeAt(0),0),20);foalPos=s[[...d].reduce((a,ch)=>a*31+ch.charCodeAt(0),7)%s.length];}
        const fd=Math.hypot(foalPos.x-px,foalPos.z-pz);foal.root.visible=out&&fd<120;if(foal.root.visible){const a=now/4000;const fx=foalPos.x+Math.cos(a)*3,fz=foalPos.z+Math.sin(a)*3;foal.root.position.set(fx,groundY(fx,fz),fz);foal.root.rotation.y=a+Math.PI/2;foal.setGait?.('walk');foal.update(delta);
          if(pretty&&Math.random()<.1)motes.emit('sparkle',fx,groundY(fx,fz)+1,fz,1);
          if(!mounted&&Math.hypot(fx-px,fz-pz)<3){c.foal=Date.now();save();foal.root.visible=false;const rr=RanchUI.get();if(rr){const h=newHorse({breed:'andalusian',name:'Star',seed:'rare-foal-'+Date.now(),ageMonths:6,coat:{...COATS.silver,white:'#ffffff',coatName:'silver',dapple:true,socks:[1,1,1,1]}});h.bio='A silver-spotted wild foal who followed you home.';RanchUI.set({...rr,herd:[...rr.herd,h]});}sfx('fanfare');tell('✨ The silver-spotted foal nuzzles you and follows you home! Look for Star in your herd.',6);}}}
      else if(foal)foal.root.visible=false;
      // market wagon
      if(wagon){const s=STOPS[Math.floor(Date.now()/3600000)%STOPS.length];wagon.position.set(s.x,groundY(s.x,s.z),s.z);wagon.visible=out&&Math.hypot(s.x-px,s.z-pz)<150;
        if(out&&Math.hypot(s.x-px,s.z-pz)<4.5&&now-wagonTold>30000&&!document.querySelector('dialog[open]')){wagonTold=now;openWagon(now);}}
      // shooting stars after dark: tap ✨ Wish while it streaks
      if(out&&night&&now>nextStar&&star){nextStar=now+35000+Math.random()*40000;starT=now;const a=Math.random()*6.28;star.userData={a,x:px+Math.cos(a)*60,z:pz+Math.sin(a)*60};star.visible=true;showWish(now);}
      if(star?.visible){const k=(now-starT)/1400;if(k>1){star.visible=false;}else{const u=star.userData;star.position.set(u.x+Math.cos(u.a+1.6)*(k-.5)*80,70-k*18,u.z+Math.sin(u.a+1.6)*(k-.5)*80);star.rotation.set(0,0,Math.PI/2+.3);star.lookAt(camera.position);star.rotateX(Math.PI/2);star.material.opacity=Math.sin(k*Math.PI);}}
      // fair days (Saturday and Sunday): balloons round the village fountain, activities pay double
      if(balloons){balloons.visible=fair()&&out;if(balloons.visible){balloons.children.forEach((b,i)=>{if(i%2===0)b.position.y+=Math.sin(now/700+i)*.002;});if(Math.hypot(SQUARE.x-px,SQUARE.z-pz)<30&&fairTold!==today()){fairTold=today();sfx('fanfare',{vol:.5});tell('🎪 It’s Fair Day in Bramble Village! Every activity pays double today.',6);}}}
      // campfires
      for(const f of fires){f.fl.visible=night;if(night){f.fl.scale.set(1,1+Math.sin(now/90+f.x)*.15,1);if(pretty&&Math.random()<.15)motes.emit('sparkle',f.x,groundY(f.x,f.z)+1.1,f.z,1);}
        if(out&&night&&!mounted&&Math.hypot(f.x-px,f.z-pz)<3&&now-campTold>45000){campTold=now;tell('🔥 You warm your hands by the fire. A traveller’s tale: “'+STORIES[Math.floor(Math.random()*STORIES.length)]+'”',9);}}}
    function showWish(now){if(wishBtn)wishBtn.remove();if(c.wish[today()]>=5)return;wishBtn=document.createElement('button');wishBtn.type='button';wishBtn.textContent='🌠 Make a wish!';
      wishBtn.style.cssText='position:absolute;left:50%;top:22%;transform:translateX(-50%);min-height:48px;padding:0 22px;border-radius:24px;border:0;background:#fff8e6;color:#3a2a22;font:700 17px system-ui,sans-serif;box-shadow:0 6px 18px #0005;z-index:35';
      wishBtn.onclick=()=>{c.wish[today()]=(c.wish[today()]||0)+1;save();wishBtn.remove();wishBtn=null;sfx('sparkle');queueCoins({from:'Shooting star',coins:5,lines:['Wished on a shooting star · 5 🪙']});tell('🌠 You made a wish! +5 🪙',3);};
      view.append(wishBtn);setTimeout(()=>{wishBtn?.remove();wishBtn=null;},4000);}
    function openWagon(now){const w=loadWallet();
      adventureUI.open('🛒 Travelling market',`<div class="hazel-talk"><span class="hazel-face" aria-hidden="true">🧺</span><p class="hazel-line">Roll up, roll up! I’m only here till the next bell, then I’m off down the road.</p></div><p class="small">You have 🪙 ${coinWords(w.coins)}</p>
        <button type="button" class="primary full" data-wg="carrot">🥕 Five carrots · 20 🪙</button><button type="button" class="secondary full" data-wg="fox" style="margin-top:10px">🦊 Fox whistle · 15 🪙 (a fox leads you to a hidden find)</button>
        <button type="button" class="secondary full" data-wg="hint" style="margin-top:10px">🧭 Pedlar’s tip · 10 🪙</button><button type="button" class="text-button" data-wg="" style="margin-top:10px">Bye!</button>`);
      adventureUI.dialog.querySelectorAll('[data-wg]').forEach(b=>b.onclick=()=>{const k=b.dataset.wg;if(!k){adventureUI.close();return;}const cost={carrot:20,fox:15,hint:10}[k],wl=loadWallet();
        if(wl.coins<cost){tell('Not enough Trotties for that.',2);return;}saveWallet({...wl,coins:wl.coins-cost});paintCounters();sfx('buy');adventureUI.close();
        if(k==='carrot'){const rr=RanchUI.get();if(rr)RanchUI.set({...rr,food:{...rr.food,carrot:(rr.food.carrot||0)+5}});tell('🥕 Five crunchy carrots are in your pantry.',3);}
        else if(k==='fox')foxSummon(performance.now());else tell('🧭 The pedlar whispers: “'+STORIES[Math.floor(Math.random()*STORIES.length)]+'”',8);});}
    return {step,fair,foxSummon:()=>foxSummon(performance.now()),info:()=>({rabbits:RAB.length,camps:CAMPS,stop:STOPS[Math.floor(Date.now()/3600000)%STOPS.length],foal:foalPos,fair:fair()}),starNow(){nextStar=0;}};})();

    // ===== Treetop village + golden seed chain (note #42, v115) =====
  // Glowmoss Hollow: acorn-roofed homes on round platforms in Mosswood Grove, joined by rope bridges, lantern strings
  // everywhere. Keeper Wren Thistledown lives at the very top of the great tree, under a lantern that never goes out.
  // Chain: Wren → golden seed by the smugglers' arch (far side of Cloudstep) → plant it in any open meadow → fence it
  // (rabbits!) → water on 3 different days → harvest a Moon Carrot (legendsWorld.addMoonCarrot) → clock tower at midnight.
  const TT=(()=>{const KEY='trottville-gold-v1';let g={stage:0,seed:false,plant:null};try{g={...g,...JSON.parse(localStorage.getItem(KEY))};}catch{}const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(g));}catch{}};
    const day=()=>new Date().toISOString().slice(0,10),FENCE=25,WATERS=3;
    const MW=LOCATIONS.find(l=>l.id==='forest')||{x:185,z:-165};
    // Village centre: the most open ground near the grove.
    let C={x:MW.x,z:MW.z},best=1e9;for(let dx=-36;dx<=36;dx+=6)for(let dz=-36;dz<=36;dz+=6){const x=MW.x+dx,z=MW.z+dz;if(riverAt(x,z).d<14)continue;let n=0;
      for(let a=0;a<6.28;a+=.7)for(const r of [3,8,13])if(blocked(x+Math.cos(a)*r,z+Math.sin(a)*r,.8,0,outdoorObstacles))n++;n+=Math.hypot(dx,dz)*.02;if(n<best){best=n;C={x,z};}}
    const PODS=[0,1,2,3,4].map(i=>{const a=i/5*Math.PI*2+.3;return {x:C.x+Math.cos(a)*12,z:C.z+Math.sin(a)*12,h:7.5+(i%2)*2.5};});
    const LADDER={x:C.x,z:C.z+2.6};
    for(const p of [{x:C.x,z:C.z,r:1.9},...PODS.map(p=>({...p,r:1.1}))])outdoorObstacles.push({kind:'box',x:p.x,z:p.z,hx:p.r,hz:p.r,height:30});
    LOOKOUTS.push({id:'treetop',name:'Glowmoss Hollow',x:LADDER.x,z:LADDER.z,reach:2.6,pos:[C.x+2.4,groundHeight(C.x,C.z)+23.5,C.z+2.4],look:[C.x+40,groundHeight(C.x,C.z)+6,C.z+30],
      line:'Up in Glowmoss Hollow, the treetop village! Wren the keeper waves from her lantern.'});
    // v118 (Yoshi: "it should be deep forest of many trees and the village in the middle"): a thick old wood ~85 m round
    // the village. One obstacle for all of it (a 'lake' whose pass() asks a 6 m grid of trees), so collisions stay cheap.
    const WOOD_R=85,CLEAR=21;const WOOD=[],GRID=new Map(),gk=(x,z)=>Math.floor(x/6)+','+Math.floor(z/6);
    {const segs=[];const add=l=>{for(let i=1;i<l.length;i++)segs.push([l[i-1],l[i]]);};add(MAP_PATHS.loop);add(MAP_PATHS.yard);MAP_PATHS.routes.forEach(add);
      const segD=(x,z,[a,b])=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);};
      let h=1234567;const rr=()=>((h=Math.imul(h^(h>>>15),2246822519)+1013904223|0)>>>0)/4294967296;
      for(let gx=-WOOD_R;gx<=WOOD_R;gx+=5.2)for(let gz=-WOOD_R;gz<=WOOD_R;gz+=5.2){const x=C.x+gx+(rr()-.5)*3.6,z=C.z+gz+(rr()-.5)*3.6,d=Math.hypot(x-C.x,z-C.z),edge=(WOOD_R-d)/14;
        if(d<CLEAR||d>WOOD_R||rr()>Math.min(1,.35+edge))continue;if(segs.some(sg=>segD(x,z,sg)<4.5))continue;if(riverAt(x,z).d<6||blocked(x,z,1.4,0,outdoorObstacles))continue;
        const t={x,z,r:.28+rr()*.22,h:11+rr()*11,kind:rr()<.55?0:1,s:.8+rr()*.6,rot:rr()*6.28};WOOD.push(t);const k=gk(x,z);if(!GRID.has(k))GRID.set(k,[]);GRID.get(k).push(t);}}
    const treeHit=(x,z,rad)=>{const cx=Math.floor(x/6),cz=Math.floor(z/6);for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const l=GRID.get((cx+i)+','+(cz+j));if(l)for(const t of l)if(Math.hypot(x-t.x,z-t.z)<t.r+rad)return true;}return false;};
    outdoorObstacles.push({kind:'lake',x:C.x,z:C.z,rx:WOOD_R+2,rz:WOOD_R+2,height:30,pass:(x,z,rad)=>!treeHit(x,z,rad)});
    // v119 (Yoshi: "bushes too like brush weeds logs fallen trees you have to jump"): fallen trunks and brush piles
    // lie ACROSS the forest paths every ~16 m (jump them, mounted or on foot), more windfalls lie among the trees, and
    // bushes + weeds fill the floor. Jumpables are segments in a second wood-wide obstacle, height .75 like Wave A's.
    const LOGS=[];{let h=7654321;const rr=()=>((h=Math.imul(h^(h>>>15),2246822519)+1013904223|0)>>>0)/4294967296;
      const lines=[MAP_PATHS.loop,MAP_PATHS.yard,...MAP_PATHS.routes];
      for(const l of lines)for(let i=1;i<l.length;i++){const [ax,az]=l[i-1],[bx,bz]=l[i],len=Math.hypot(bx-ax,bz-az);if(!len)continue;const ux=(bx-ax)/len,uz=(bz-az)/len;
        for(let t=8;t<len-4;t+=16){const x=ax+ux*t,z=az+uz*t,d=Math.hypot(x-C.x,z-C.z);if(d<CLEAR+4||d>WOOD_R-4||riverAt(x,z).d<5)continue;if(LOGS.some(g=>Math.hypot(g.x-x,g.z-z)<10))continue;
          const half=4.3,kind=rr()<.7?'log':'brush';LOGS.push({x,z,x1:x-uz*half,z1:z+ux*half,x2:x+uz*half,z2:z-ux*half,r:kind==='log'?.42:.55,kind,path:true,t:0});}}
      for(let n=0,k=0;n<55&&k<900;k++){const a=rr()*6.28,rad=CLEAR+3+rr()*(WOOD_R-CLEAR-6),x=C.x+Math.cos(a)*rad,z=C.z+Math.sin(a)*rad,ang=rr()*3.14,half=2.5+rr()*3,dx=Math.cos(ang)*half,dz=Math.sin(ang)*half;
        if(treeHit(x,z,1.2)||treeHit(x+dx,z+dz,.8)||treeHit(x-dx,z-dz,.8)||riverAt(x,z).d<5)continue;if(LOGS.some(g=>Math.hypot(g.x-x,g.z-z)<6))continue;
        LOGS.push({x,z,x1:x-dx,z1:z-dz,x2:x+dx,z2:z+dz,r:.3+rr()*.2,kind:'log',path:false,t:0});n++;}}
    const LGRID=new Map();for(const g of LOGS)for(let k=0;k<=4;k++){const x=g.x1+(g.x2-g.x1)*k/4,z=g.z1+(g.z2-g.z1)*k/4,key=gk(x,z);if(!LGRID.has(key))LGRID.set(key,new Set());LGRID.get(key).add(g);}
    const segDist=(x,z,g)=>{const dx=g.x2-g.x1,dz=g.z2-g.z1,t=Math.max(0,Math.min(1,((x-g.x1)*dx+(z-g.z1)*dz)/(dx*dx+dz*dz)));return Math.hypot(x-g.x1-dx*t,z-g.z1-dz*t);};
    const logNear=(x,z,rad)=>{const cx=Math.floor(x/6),cz=Math.floor(z/6);for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const l=LGRID.get((cx+i)+','+(cz+j));if(l)for(const g of l)if(segDist(x,z,g)<g.r+rad)return g;}return null;};
    outdoorObstacles.push({kind:'lake',x:C.x,z:C.z,rx:WOOD_R+2,rz:WOOD_R+2,height:.75,pass:(x,z,rad)=>!logNear(x,z,rad)});
    const SEED=(()=>{const k=Math.hypot(CAVE.x-CLOUDSTEP.cx,CAVE.z-CLOUDSTEP.cz)||1,ux=(CAVE.x-CLOUDSTEP.cx)/k,uz=(CAVE.z-CLOUDSTEP.cz)/k;for(const [o,s] of [[8,5],[8,-5],[10,0],[6,7],[6,-7],[12,3]]){const x=CAVE.x+ux*o+uz*s,z=CAVE.z+uz*o-ux*s;if(!blocked(x,z,.6,0,outdoorObstacles))return {x,z};}return {x:CAVE.x+ux*8,z:CAVE.z+uz*8};})();
    let built=false,seedMesh=null,sprout=null,fenceG=null,crown=null,lanterns=[],told=false,vistaSeen=false,woodGroup=null;
    function build(){built=true;const grp=new T.Group();outdoors.add(grp);const y0=groundY(C.x,C.z);
      const bark=new T.MeshStandardMaterial({color:'#6f5137',roughness:1,flatShading:true}),plank=new T.MeshStandardMaterial({color:'#b48a5a',roughness:.9}),moss=new T.MeshStandardMaterial({color:'#5f9a4a',roughness:1,flatShading:true}),
        cap=new T.MeshStandardMaterial({color:'#8a5a2e',roughness:.85,flatShading:true}),shell=new T.MeshStandardMaterial({color:'#d6a866',roughness:.7}),glow=new T.MeshBasicMaterial({color:'#ffd27a'}),rope=new T.MeshStandardMaterial({color:'#cdb88e',roughness:1});
      const trunk=(x,z,r,h)=>{const t=new T.Mesh(new T.CylinderGeometry(r*.75,r*1.25,h,9),bark);t.position.set(x,groundY(x,z)+h/2,z);t.castShadow=true;grp.add(t);for(let k=0;k<5;k++){const rt=new T.Mesh(new T.ConeGeometry(r*.5,r*1.6,5),bark);const a=k*1.26;rt.position.set(x+Math.cos(a)*r*1.1,groundY(x,z)+r*.5,z+Math.sin(a)*r*1.1);rt.rotation.set(Math.sin(a)*.9,0,-Math.cos(a)*.9);grp.add(rt);}};
      const crownAt=(x,y,z,s)=>{for(let k=0;k<6;k++){const b=new T.Mesh(new T.IcosahedronGeometry(s*(.7+.3*Math.sin(k*2.1)),0),moss);b.position.set(x+Math.cos(k)*s*.9,y+(k%2)*s*.5,z+Math.sin(k)*s*.9);b.castShadow=true;grp.add(b);}};
      const deck=(x,y,z,r)=>{const d=new T.Mesh(new T.CylinderGeometry(r,r,.35,18),plank);d.position.set(x,y,z);d.receiveShadow=true;grp.add(d);for(let k=0;k<14;k++){const a=k/14*Math.PI*2,p=new T.Mesh(new T.CylinderGeometry(.06,.06,1),plank);p.position.set(x+Math.cos(a)*r*.96,y+.6,z+Math.sin(a)*r*.96);grp.add(p);}
        const rail=new T.Mesh(new T.TorusGeometry(r*.96,.05,4,24),rope);rail.rotation.x=Math.PI/2;rail.position.set(x,y+1.1,z);grp.add(rail);};
      const acorn=(x,y,z,s)=>{const b=new T.Mesh(new T.SphereGeometry(s,14,10),shell);b.scale.y=1.15;b.position.set(x,y+s*1.05,z);grp.add(b);const c=new T.Mesh(new T.SphereGeometry(s*1.12,14,8,0,Math.PI*2,0,Math.PI/2.1),cap);c.position.set(x,y+s*1.5,z);grp.add(c);
        const st=new T.Mesh(new T.CylinderGeometry(.08,.12,.6,6),cap);st.position.set(x,y+s*2.55,z);grp.add(st);const door=new T.Mesh(new T.CircleGeometry(s*.38,12),new T.MeshStandardMaterial({color:'#5b3a22'}));door.position.set(x,y+s*.6,z+s*.98);grp.add(door);
        const win=new T.Mesh(new T.CircleGeometry(s*.16,10),glow);win.position.set(x+s*.55,y+s*1.25,z+s*.8);win.lookAt(x+s*2,y+s*1.25,z+s*3);grp.add(win);lanterns.push(win);};
      const lamp=(x,y,z)=>{const m=new T.Mesh(new T.SphereGeometry(.16,8,6),glow);m.position.set(x,y,z);grp.add(m);lanterns.push(m);};
      const bridge=(a,b)=>{const n=12,dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz);for(let i=1;i<n;i++){const t=i/n,sag=Math.sin(t*Math.PI)*1.1,y=a.y+(b.y-a.y)*t-sag;
          const pl=new T.Mesh(new T.BoxGeometry(1.3,.08,len/n*.8),plank);pl.position.set(a.x+dx*t,y,a.z+dz*t);pl.rotation.y=yaw;grp.add(pl);if(i%3===0)lamp(a.x+dx*t,y+1.25,a.z+dz*t);}
        for(const s of [-1,1]){const pts=[];for(let i=0;i<=n;i++){const t=i/n;pts.push(new T.Vector3(a.x+dx*t+Math.cos(yaw)*s*.68,a.y+(b.y-a.y)*t-Math.sin(t*Math.PI)*1.1+1,a.z+dz*t-Math.sin(yaw)*s*.68));}
          grp.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),16,.035,4),rope));}};
      // the great tree
      trunk(C.x,C.z,1.9,26);crownAt(C.x,y0+27,C.z,5);deck(C.x,y0+9,C.z,4.2);deck(C.x,y0+16,C.z,3.4);deck(C.x,y0+22.5,C.z,3);
      acorn(C.x+2.2,y0+9.2,C.z-1.6,1.3);acorn(C.x-2,y0+16.2,C.z+1.2,1.1);
      crown=new T.Mesh(new T.SphereGeometry(.55,12,10),new T.MeshBasicMaterial({color:'#fff1b8'}));crown.position.set(C.x,y0+24.4,C.z);grp.add(crown);
      const halo=new T.Sprite(new T.SpriteMaterial({map:glowTexture(),color:'#ffd27a',transparent:true,depthWrite:false,blending:T.AdditiveBlending}));halo.scale.setScalar(6);halo.position.copy(crown.position);grp.add(halo);
      // ladder up the great tree (front)
      for(let k=0;k<44;k++){const r=new T.Mesh(new T.BoxGeometry(.9,.07,.07),plank);r.position.set(LADDER.x,y0+.4+k*.5,C.z+1.95);grp.add(r);}for(const s of [-.45,.45]){const sr=new T.Mesh(new T.BoxGeometry(.07,22.5,.07),plank);sr.position.set(LADDER.x+s,y0+11.25,C.z+1.95);grp.add(sr);}
      // the pods
      for(const p of PODS){const yb=groundY(p.x,p.z);trunk(p.x,p.z,1.05,p.h+6);crownAt(p.x,yb+p.h+7,p.z,3);deck(p.x,yb+p.h,p.z,2.6);acorn(p.x,yb+p.h+.2,p.z,1.15);
        const k=Math.hypot(p.x-C.x,p.z-C.z),ux=(C.x-p.x)/k,uz=(C.z-p.z)/k;bridge({x:p.x+ux*2.5,y:yb+p.h+.2,z:p.z+uz*2.5},{x:C.x-ux*4.1,y:y0+9.2,z:C.z-uz*4.1});}
      for(let i=0;i<PODS.length;i++){const a=PODS[i],b=PODS[(i+1)%PODS.length];if(i%2)continue;const ya=groundY(a.x,a.z)+a.h+.2,yb=groundY(b.x,b.z)+b.h+.2,k=Math.hypot(b.x-a.x,b.z-a.z),ux=(b.x-a.x)/k,uz=(b.z-a.z)/k;bridge({x:a.x+ux*2.5,y:ya,z:a.z+uz*2.5},{x:b.x-ux*2.5,y:yb,z:b.z-uz*2.5});}
      // spiral stair from deck 1 → 2 → 3 on the great tree
      for(let k=0;k<26;k++){const a=k*.48,yy=y0+9.3+k*.5;const st=new T.Mesh(new T.BoxGeometry(1.1,.12,.5),plank);st.position.set(C.x+Math.cos(a)*2.4,yy,C.z+Math.sin(a)*2.4);st.rotation.y=-a;grp.add(st);}
      label('GLOWMOSS HOLLOW',C.x,y0+4.2,C.z+3.6,7);
      // the deep wood: tall firs and mossy oaks (instanced), ferns underneath, glow-moss on some trunks
      {const n=[0,0];WOOD.forEach(t=>n[t.kind]++);const m4=new T.Matrix4(),q=new T.Quaternion(),v=new T.Vector3(),sc=new T.Vector3(),e=new T.Euler();
        const trunkM=new T.MeshStandardMaterial({color:'#8a6a4c',emissive:'#2a1c12',roughness:1,flatShading:true}),fir=new T.MeshStandardMaterial({color:'#3f7d4a',emissive:'#10301a',roughness:1,flatShading:true}),oak=new T.MeshStandardMaterial({color:'#62a04c',emissive:'#183a14',roughness:1,flatShading:true}),fern=new T.MeshStandardMaterial({color:'#5a9a44',emissive:'#14320f',roughness:1,flatShading:true,side:T.DoubleSide});
        const trunks=new T.InstancedMesh(new T.CylinderGeometry(.7,1,1,7).translate(0,.5,0),trunkM,WOOD.length);
        const firG=new T.ConeGeometry(1,1,7);const fA=new T.InstancedMesh(firG,fir,n[0]*3),oA=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),oak,n[1]*3),ferns=new T.InstancedMesh(new T.ConeGeometry(.7,.6,5,1,true),fern,WOOD.length);
        let ti=0,fi=0,oi=0;for(const t of WOOD){const y=groundY(t.x,t.z);m4.compose(v.set(t.x,y-.3,t.z),q.identity(),sc.set(t.r*2,t.h*(t.kind?.55:.75),t.r*2));trunks.setMatrixAt(ti,m4);
          m4.compose(v.set(t.x+1.2,y+.2,t.z+.8),q.setFromEuler(e.set(0,t.rot,0)),sc.set(t.s,t.s*.9,t.s));ferns.setMatrixAt(ti++,m4);
          if(t.kind===0)for(let k=0;k<3;k++){const w=(3.4-k*.9)*t.s;m4.compose(v.set(t.x,y+t.h*(.35+k*.2)+w*.6,t.z),q.identity(),sc.set(w,w*1.5,w));fA.setMatrixAt(fi++,m4);}
          else for(let k=0;k<3;k++){const a=t.rot+k*2.1,w=(2.6+k*.4)*t.s;m4.compose(v.set(t.x+Math.cos(a)*1.6*t.s,y+t.h*.55+k*1.1,t.z+Math.sin(a)*1.6*t.s),q.setFromEuler(e.set(k,a,0)),sc.set(w,w*.8,w));oA.setMatrixAt(oi++,m4);}}
        for(const im of [trunks,fA,oA,ferns]){im.castShadow=im!==ferns;im.receiveShadow=true;im.instanceMatrix.needsUpdate=true;im.computeBoundingSphere();grp.add(im);}
        const moss=new T.MeshBasicMaterial({color:'#9dffb0',transparent:true,opacity:.55,depthWrite:false});for(let k=0;k<WOOD.length;k+=7){const t=WOOD[k],gl=new T.Mesh(new T.SphereGeometry(.22,6,4),moss);gl.position.set(t.x+t.r,groundY(t.x,t.z)+1+(k%3)*.7,t.z);grp.add(gl);lanterns.push(gl);}
        woodGroup=grp;
        // fallen trunks (with a root plate and a few broken branches), brush piles, bushes and weeds
        const bark=new T.MeshStandardMaterial({color:'#7a5a3e',emissive:'#22160c',roughness:1,flatShading:true}),root=new T.MeshStandardMaterial({color:'#6a4e36',emissive:'#1a1209',roughness:1,flatShading:true}),
          twig=new T.MeshStandardMaterial({color:'#8c7448',emissive:'#20180a',roughness:1,flatShading:true}),bushM=new T.MeshStandardMaterial({color:'#4f8f3e',emissive:'#132e0e',roughness:1,flatShading:true}),
          weedM=new T.MeshStandardMaterial({color:'#7aa84a',emissive:'#1a2e0c',roughness:1,flatShading:true,side:T.DoubleSide});
        // v147: real logs (world-tudor.js forestLogs): bark, ringed cut ends, moss, roots; all merged per material.
        const FL=forestLogs(T,geo,mat);let li=0;
        for(const g of LOGS){const len=Math.hypot(g.x2-g.x1,g.z2-g.z1),yaw=Math.atan2(g.x2-g.x1,g.z2-g.z1),y=groundY(g.x,g.z);li++;
          if(g.kind==='log')FL.log(g.x,y+g.r*.85,g.z,yaw,len,g.r,li);
          else{for(let k=0;k<14;k++){const u=(k/13-.5)*len;FL.twig(g.x+u*Math.sin(yaw),y+.35+(k%3)*.18,g.z+u*Math.cos(yaw),yaw+(k%2?.9:-.9),1.6+((k*7)%5)*.2,(k%5)*.6,(k%4)*.5);}
            const pile=new T.Group();for(let k=0;k<4;k++){const l=new T.Mesh(new T.IcosahedronGeometry(.55,0),bushM);const u=(k/3-.5)*len*.8;l.position.set(u*Math.sin(yaw),.4,u*Math.cos(yaw));pile.add(l);}pile.position.set(g.x,y,g.z);grp.add(pile);}}
        FL.flush(grp);
        {let h=99;const rr=()=>((h=Math.imul(h^(h>>>15),2246822519)+1013904223|0)>>>0)/4294967296;const bushes=[],weeds=[];
          for(let k=0;k<2600&&(bushes.length<520||weeds.length<1100);k++){const a=rr()*6.28,rad=CLEAR-2+rr()*(WOOD_R-CLEAR+2),x=C.x+Math.cos(a)*rad,z=C.z+Math.sin(a)*rad;if(riverAt(x,z).d<4||treeHit(x,z,.6))continue;
            if(rr()<.35&&bushes.length<520)bushes.push([x,z,.6+rr()*.9,rr()*6.28]);else if(weeds.length<1100)weeds.push([x,z,.5+rr()*.7,rr()*6.28]);}
          const bI=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),bushM,bushes.length),wI=new T.InstancedMesh(new T.ConeGeometry(.35,1,4,1,true).translate(0,.5,0),weedM,weeds.length);
          bushes.forEach(([x,z,s,a],i)=>{m4.compose(v.set(x,groundY(x,z)+s*.35,z),q.setFromEuler(e.set(0,a,0)),sc.set(s*1.3,s*.8,s*1.1));bI.setMatrixAt(i,m4);});
          weeds.forEach(([x,z,s,a],i)=>{m4.compose(v.set(x,groundY(x,z)-.05,z),q.setFromEuler(e.set((a%1)*.3,a,0)),sc.set(s,s*1.4,s));wI.setMatrixAt(i,m4);});
          for(const im of [bI,wI]){im.receiveShadow=true;im.castShadow=im===bI;im.instanceMatrix.needsUpdate=true;im.computeBoundingSphere();grp.add(im);}}}
      // golden seed by the smugglers' arch
      seedMesh=new T.Group();{const s=new T.Mesh(new T.SphereGeometry(.22,12,10),new T.MeshStandardMaterial({color:'#f5c542',emissive:'#a8741a',emissiveIntensity:.8,metalness:.6,roughness:.3}));s.scale.y=1.4;s.position.y=.45;seedMesh.add(s);
        const h=new T.Sprite(new T.SpriteMaterial({map:glowTexture(),color:'#ffe08a',transparent:true,depthWrite:false,blending:T.AdditiveBlending}));h.scale.setScalar(1.8);h.position.y=.45;seedMesh.add(h);}
      seedMesh.position.set(SEED.x,groundY(SEED.x,SEED.z),SEED.z);outdoors.add(seedMesh);
      sprout=new T.Group();{const stem=new T.Mesh(new T.CylinderGeometry(.03,.05,1,6),new T.MeshStandardMaterial({color:'#6fae3a'}));stem.position.y=.5;sprout.add(stem);for(const s of [-1,1]){const lf=new T.Mesh(new T.SphereGeometry(.2,8,6),new T.MeshStandardMaterial({color:'#e9c44a',emissive:'#6b4f10',emissiveIntensity:.5}));lf.scale.set(1,.3,.5);lf.position.set(s*.16,.75,0);lf.rotation.z=s*.5;sprout.add(lf);}
        const top=new T.Mesh(new T.ConeGeometry(.18,.6,8),new T.MeshStandardMaterial({color:'#ffcf3a',emissive:'#c98a10',emissiveIntensity:.7,metalness:.4}));top.rotation.x=Math.PI;top.position.y=.15;top.name='carrot';sprout.add(top);}
      sprout.visible=false;outdoors.add(sprout);
      fenceG=new T.Group();for(let k=0;k<10;k++){const a=k/10*Math.PI*2,p=new T.Mesh(new T.BoxGeometry(.1,.7,.1),plank);p.position.set(Math.cos(a)*1.3,.35,Math.sin(a)*1.3);fenceG.add(p);}
      for(const y of [.25,.55]){const r=new T.Mesh(new T.TorusGeometry(1.3,.03,4,20),plank);r.rotation.x=Math.PI/2;r.position.y=y;fenceG.add(r);}fenceG.visible=false;outdoors.add(fenceG);}
    let glowTex=null;function glowTexture(){if(glowTex)return glowTex;const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),gr=x.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,64,64);glowTex=new T.CanvasTexture(c);return glowTex;}
    const plantState=()=>{const p=g.plant;if(!p)return null;const n=p.waters.length;return n>=WATERS?'ripe':p.waters.includes(day())?'watered':'thirsty';};
    function paint(){if(!built)return;seedMesh.visible=g.stage>=1&&!g.seed&&!g.plant&&area==='outdoor';const p=g.plant;sprout.visible=!!p&&area==='outdoor';fenceG.visible=!!p?.fence&&area==='outdoor';
      if(p){const y=groundY(p.x,p.z),n=Math.min(p.waters.length,WATERS);sprout.position.set(p.x,y,p.z);sprout.scale.setScalar(.45+n/WATERS*.75);sprout.getObjectByName('carrot').visible=n>=WATERS;fenceG.position.set(p.x,y,p.z);}}
    function keeper(){const st=plantState(),mc=legendsWorld.moonCarrots(),caught=legendsWorld.moonCaught();
      const line=caught?'You did it! The moon pegasus is home with you. I saw it from up here, a silver streak across the moon.':mc>0?'A Moon Carrot! Take it to the clock tower at midnight and hold it up. The pegasus circles the moon right above the tower.':
        st==='ripe'?'Your golden carrot is ready! Go and pull it up.':g.plant?`Your golden sprout is growing. ${g.plant.fence?'':'Fence it, quick! Rabbits adore gold. '}Water it on ${WATERS} different days (${g.plant.waters.length}/${WATERS} so far).`:
        g.seed?'You found the golden seed! Plant it in any open meadow. Stand where you like and press the button.':g.stage>=1?'The golden seed is on the far side of Cloudstep, a little way from the old smugglers’ arch. It glows, you can’t miss it.':
        'Welcome up, rider! I’m Wren Thistledown, keeper of the lantern. You’ve heard of the moon pegasus? It only comes down for a Moon Carrot, grown from a golden seed. One fell on the far side of Cloudstep, by the old smugglers’ arch. Fetch it, plant it, fence it and water it on three different days.';
      if(!g.stage){g.stage=1;save();}
      adventureUI.open('🏮 Wren Thistledown',`<div class="hazel-talk"><span class="hazel-face" aria-hidden="true">🦉</span><p class="hazel-line">${escapeHTML(line)}</p></div><button type="button" class="primary full" data-tt="x">Thank you, Wren!</button>`);
      adventureUI.dialog.querySelector('[data-tt]').onclick=()=>adventureUI.close();paint();}
    function prompt(ctx){if(ctx.area!=='outdoor')return null;if(g.stage>=1&&!g.seed&&!g.plant&&Math.hypot(SEED.x-ctx.x,SEED.z-ctx.z)<2.6)return ctx.mounted?'Hop off first':'Pick up the golden seed';
      const p=g.plant;if(p&&Math.hypot(p.x-ctx.x,p.z-ctx.z)<2.6)return ctx.mounted?'Hop off first':({ripe:'Pull up the golden carrot',watered:'Golden sprout',thirsty:p.fence?'Water the golden sprout':'Golden sprout · fence it'})[plantState()];
      if(g.seed&&!ctx.mounted&&WA.ok(ctx.x,ctx.z,1.5))return 'Plant the golden seed';return null;}
    function interact(ctx){const pr=prompt(ctx);if(!pr)return false;if(ctx.mounted){tell('Hop off first. This needs careful hands.',3);return true;}
      if(pr==='Pick up the golden seed'){g.seed=true;save();paint();sfx('sparkle');tell('🌟 The golden seed! It’s warm in your hand. Plant it in any open meadow.',6);return true;}
      if(pr==='Plant the golden seed'){g.seed=false;g.plant={x:ctx.x,z:ctx.z,day:day(),waters:[],fence:false};save();paint();sfx('pop');tell('🌱 Planted! A golden shoot pokes up already. Fence it before the rabbits find it, then water it.',7);return true;}
      const p=g.plant,st=plantState();
      if(st==='ripe'){g.plant=null;g.stage=3;save();paint();legendsWorld.addMoonCarrot();sfx('fanfare');
        adventureUI.open('✨🥕 A Moon Carrot!',`<p>It glows like a little moon. The pegasus that circles the clock tower at midnight can’t resist one.</p><p class="small">Ride to the clock tower, climb up at midnight and hold it up.</p><button type="button" class="primary full" data-tt="x">Brilliant!</button>`);adventureUI.dialog.querySelector('[data-tt]').onclick=()=>adventureUI.close();return true;}
      const w=loadWallet();
      adventureUI.open('🌱 Golden sprout',`<p>${p.fence?'Safe behind its little fence.':'A rabbit is watching it from the long grass…'} Watered ${p.waters.length} of ${WATERS} days.</p>
        ${p.fence?'':`<button type="button" class="primary full" data-tt="fence">🪵 Build a fence · ${FENCE} 🪙</button><p class="small">You have 🪙 ${coinWords(w.coins)}</p>`}
        ${st==='thirsty'&&p.fence?'<button type="button" class="primary full" data-tt="water">💧 Water it</button>':st==='watered'?'<p class="small">Watered today. Come back tomorrow.</p>':''}
        <button type="button" class="text-button" data-tt="x" style="margin-top:10px">Close</button>`);
      adventureUI.dialog.querySelectorAll('[data-tt]').forEach(b=>b.onclick=()=>{const k=b.dataset.tt;if(k==='fence'){const wl=loadWallet();if(wl.coins<FENCE){tell('You need '+FENCE+' Trotties for the fence. Activities and odd jobs pay!',4);return;}saveWallet({...wl,coins:wl.coins-FENCE});paintCounters();p.fence=true;save();paint();sfx('buy');tell('🪵 A snug little fence. No rabbits getting in now!',4);}
        else if(k==='water'){p.waters.push(day());save();paint();sfx('splash');tell(p.waters.length>=WATERS?'💧 It’s glowing! Something golden is ready under the leaves.':'💧 Watered! '+(WATERS-p.waters.length)+' more day'+(WATERS-p.waters.length===1?'':'s')+' to go.',5);}
        adventureUI.close();});return true;}
    const _p=legendsWorld.prompt,_i=legendsWorld.interact;legendsWorld.prompt=ctx=>prompt(ctx)||_p(ctx);legendsWorld.interact=ctx=>interact(ctx)||_i(ctx);
    function step(now){if(!built){build();paint();}crown.scale.setScalar(1+Math.sin(now/600)*.06);if(woodGroup)woodGroup.visible=area==='outdoor'&&Math.hypot(position.x-C.x,position.z-C.z)<WOOD_R+260;
      if(area==='outdoor'&&jump>.2&&Math.hypot(position.x-C.x,position.z-C.z)<WOOD_R){const g=logNear(position.x,position.z,.6);if(g&&now-g.t>4000){g.t=now;sfx('pop',{vol:.6});tell(g.kind==='log'?'🪵 Up and over the fallen tree!':'🌿 Over the brush pile!',2);}}
      if(seedMesh.visible)seedMesh.rotation.y=now/700;
      // unfenced sprout overnight: the rabbits nibble it back to nothing (the seed survives)
      const p=g.plant;if(p&&!p.fence&&p.day!==day()){g.plant=null;g.seed=true;save();paint();tell('🐰 Oh no! Rabbits nibbled your golden sprout overnight. You saved the seed. Plant it again and fence it this time!',8);}
      if(vista?.id==='treetop'&&vistaK>.85&&!vistaSeen){vistaSeen=true;keeper();}if(!vista)vistaSeen=false;}
    return {step,paint,info:()=>({C,SEED,ladder:LADDER,g,state:plantState(),built,trees:WOOD.length,logs:LOGS.length,pathLogs:LOGS.filter(l=>l.path).map(l=>[Math.round(l.x),Math.round(l.z)]),kids:built?crown.parent.children.length:0}),keeper,_set(o){g={...g,...o};save();paint();}};})();

  // ===== Wave D: the wild corners (v116) =====
  // Surf + tide pools on Seaglass Shore, the hidden ledge behind Silver Ribbon Falls, the honey tree in the bee
  // meadows, mountain goats + an eagle nest on Cloudstep, the frozen pond in Snowy Pines (build a snowman), and
  // scarecrows whose eyes glow at night and who whisper a hint if you stop to listen.
  const WD=(()=>{const KEY='trottville-wild-v1';let w={};try{w=JSON.parse(localStorage.getItem(KEY))||{};}catch{}w.pool||={};w.glass||={};w.snow||={day:'',parts:0,built:0};
    const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(w));}catch{}};const day=()=>new Date().toISOString().slice(0,10);
    const M=(c,o={})=>new T.MeshStandardMaterial({color:c,roughness:.8,...o}),B=c=>new T.MeshBasicMaterial({color:c});
    const DIRS=['south','south-east','east','north-east','north','north-west','west','south-west'];
    const dirTo=(fx,fz,tx,tz)=>DIRS[(Math.round(Math.atan2(tx-fx,tz-fz)/(Math.PI/4))+8)%8];
    const free=(tx,tz,r,reach=40)=>{for(let k=0;k<=reach;k+=3)for(let a=0;a<6.28;a+=.4){const x=tx+Math.cos(a)*k,z=tz+Math.sin(a)*k;if(!blocked(x,z,r,0,outdoorObstacles)&&WA.ok(x,z,r))return {x,z};}return {x:tx,z:tz};};
    const coins=(from,n,line)=>queueCoins({from,coins:n,lines:[line+' · '+n+' 🪙']});
    // --- places (decided at load so their trunks block like everything else) ---
    const POOLS=[[-222,193.5],[-211,192],[-199,193],[-187,192.5]].map(([x,z],i)=>({x,z,i,r:.9+(i%2)*.35}));
    const FALL={x:215,z:-235.7},GROTTO={x:215,z:-236.6};
    const HONEY=free(28,232,3.2);outdoorObstacles.push({kind:'box',x:HONEY.x,z:HONEY.z,hx:1.1,hz:1.1,height:12});
    const ICE=free(-205,-205,10,60),ICE_R=8,SNOW_SPOT={x:ICE.x,z:ICE.z+ICE_R+2.6};
    const GOATS=[.14,.28,.42,.56,.68].map((u,i)=>({u,i,ph:u*TRAIL_END,jump:0,from:0,to:0,t:Math.random()*6}));
    const goatPos=ph=>{const p=trailPoint(ph),k=Math.hypot(p.x-CLOUDSTEP.cx,p.z-CLOUDSTEP.cz)||1,x=p.x+(p.x-CLOUDSTEP.cx)/k*.9,z=p.z+(p.z-CLOUDSTEP.cz)/k*.9;return {x,z,y:groundHeight(x,z)};};
    const NEST=goatPos(.82*TRAIL_END);
    const SCARE=[...FIELDS.filter(f=>f.kind==='wheat').map(f=>{const c=Math.cos(f.rot),s=Math.sin(f.rot);return {x:f.x+f.w*.3*c,z:f.z-f.w*.3*s,y:2.15,rot:f.rot};}),
      ...FARMS.filter(f=>f.veg).map(f=>({x:f.veg.x+f.veg.w/2-1.5,z:f.veg.z+f.veg.d/2-1,y:2.3,rot:0}))];
    let built=false,foam=[],pools=[],bees=[],goats=[],eagle=null,eggs=null,eyes=[],snowmen=[],buildMan=null,mist=null,crystals=[];
    function snowman(x,z,s=1,parts=4){const g=new T.Group(),sn=M('#f7f9fb',{roughness:.95});const y=groundY(x,z);
      const balls=[[.8,.75],[2,.58],[2.95,.42]];balls.forEach(([h,r],k)=>{const b=new T.Mesh(new T.SphereGeometry(r*s,14,10),sn);b.position.y=h*s;b.visible=k<parts;b.name='p'+k;g.add(b);});
      const nose=new T.Mesh(new T.ConeGeometry(.07*s,.4*s,6),M('#f07a2a'));nose.rotation.x=Math.PI/2;nose.position.set(0,2.95*s,.42*s+.15);nose.name='p3';
      const face=new T.Group();face.name='p3b';for(const e of [-1,1]){const c=new T.Mesh(new T.SphereGeometry(.05*s,6,4),M('#222'));c.position.set(e*.14*s,3.07*s,.38*s);face.add(c);}
      const hat=new T.Mesh(new T.CylinderGeometry(.26*s,.28*s,.4*s,10),M('#2a2a30'));hat.position.y=3.45*s;hat.name='p3c';
      for(const o of [nose,face,hat]){o.visible=parts>=4;g.add(o);}g.position.set(x,y,z);return g;}
    function build(){built=true;const grp=new T.Group();outdoors.add(grp);
      // surf: three foam lines wash up the sand and slide back
      for(let k=0;k<3;k++){const f=new T.Mesh(new T.PlaneGeometry(54-k*6,.7),new T.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.0,depthWrite:false}));f.rotation.x=-Math.PI/2;f.position.set(-206,.1,196.4);grp.add(f);foam.push(f);}
      // tide pools
      const rock=M('#8f8a80',{flatShading:true}),water=M('#3f8fa6',{roughness:.15,metalness:.1,transparent:true,opacity:.85});
      for(const p of POOLS){const y=Math.max(groundY(p.x,p.z),.04);const d=new T.Mesh(new T.CircleGeometry(p.r,18),water);d.rotation.x=-Math.PI/2;d.position.set(p.x,y+.05,p.z);grp.add(d);
        for(let k=0;k<7;k++){const a=k/7*Math.PI*2,s=new T.Mesh(new T.DodecahedronGeometry(.22+(k%3)*.08),rock);s.position.set(p.x+Math.cos(a)*(p.r+.15),y+.08,p.z+Math.sin(a)*(p.r+.15));grp.add(s);}
        const star=new T.Group();for(let k=0;k<5;k++){const arm=new T.Mesh(new T.ConeGeometry(.07,.3,4),M(['#e8743a','#d9548a','#f2b33d','#9b6ad6'][p.i]));arm.rotation.set(Math.PI/2,0,0);arm.rotation.z=0;arm.position.set(Math.cos(k*1.2566)*.14,0,Math.sin(k*1.2566)*.14);arm.lookAt(Math.cos(k*1.2566)*2,0,Math.sin(k*1.2566)*2);arm.rotateX(Math.PI/2);star.add(arm);}
        star.position.set(p.x+.2,y+.03,p.z-.15);grp.add(star);pools.push({...p,y,star});}
      // behind Silver Ribbon Falls: a mossy ledge of stepping stones and a grotto that glows through the water
      {const st=M('#7d8a80',{flatShading:true});for(let k=0;k<6;k++){const s=new T.Mesh(new T.CylinderGeometry(.55,.6,.25,7),st);const x=209.5+k*1.1,z=-233.6-Math.sin(k/5*Math.PI)*2.2;s.position.set(x,groundY(x,z)+.12,z);grp.add(s);}
        const mouth=new T.Mesh(new T.CircleGeometry(1.4,16,0,Math.PI),B('#141a1c'));mouth.position.set(GROTTO.x,groundY(GROTTO.x,GROTTO.z)+.02,GROTTO.z);grp.add(mouth);
        for(let k=0;k<5;k++){const c=new T.Mesh(new T.OctahedronGeometry(.18+(k%2)*.08),new T.MeshBasicMaterial({color:k%2?'#9fe8ff':'#c9a8ff'}));c.scale.y=1.8;c.position.set(GROTTO.x-.9+k*.45,groundY(GROTTO.x,GROTTO.z)+.3+(k%3)*.35,GROTTO.z-.15);grp.add(c);crystals.push(c);}
        mist=new T.Group();for(let k=0;k<6;k++){const m=new T.Mesh(new T.SphereGeometry(.7,8,6),new T.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.18,depthWrite:false}));m.position.set(FALL.x-1.5+k*.6,.6,FALL.z+1.6);mist.add(m);}grp.add(mist);}
      // the honey tree: a fat old oak with a hive on a low branch
      {const y=groundY(HONEY.x,HONEY.z),bark=M('#6a4a30',{flatShading:true}),leaf=M('#5f9e45',{flatShading:true});const t=new T.Mesh(new T.CylinderGeometry(.8,1.2,6,9),bark);t.position.set(HONEY.x,y+3,HONEY.z);t.castShadow=true;grp.add(t);
        const br=new T.Mesh(new T.CylinderGeometry(.18,.3,3.2,6),bark);br.rotation.z=Math.PI/2.6;br.position.set(HONEY.x+1.8,y+4.4,HONEY.z);grp.add(br);
        for(let k=0;k<7;k++){const b=new T.Mesh(new T.IcosahedronGeometry(2.4+(k%3)*.5,0),leaf);b.position.set(HONEY.x+Math.cos(k)*2.6,y+7+(k%2)*1.2,HONEY.z+Math.sin(k)*2.6);b.castShadow=true;grp.add(b);}
        const hive=new T.Group();for(let k=0;k<4;k++){const r=new T.Mesh(new T.TorusGeometry(.42-k*.07,.17,6,14),M('#e0a83a',{roughness:.5}));r.rotation.x=Math.PI/2;r.position.y=-k*.26;hive.add(r);}const dr=new T.Mesh(new T.CircleGeometry(.1,8),B('#2a1a0a'));dr.position.set(0,-.4,.42);hive.add(dr);
        hive.position.set(HONEY.x+2.6,y+3.9,HONEY.z);grp.add(hive);for(let k=0;k<12;k++){const b=new T.Mesh(new T.SphereGeometry(.06,5,4),B(k%2?'#2a2a2a':'#f2c230'));grp.add(b);bees.push({m:b,a:k*.52,r:.8+(k%4)*.35,c:hive.position});}
        label('HONEY TREE',HONEY.x,y+1.6,HONEY.z+1.6,4.5);}
      // mountain goats on the Cloudstep ledges
      const gw=M('#f1ede4'),gb=M('#7a5a40'),hn=M('#5a4a3a');
      for(const g of GOATS){const m=new T.Group();const body=new T.Mesh(new T.BoxGeometry(.42,.42,.85),g.i%2?gb:gw);body.position.y=.7;const head=new T.Mesh(new T.BoxGeometry(.26,.3,.36),g.i%2?gb:gw);head.position.set(0,1.05,.5);
        for(const s of [-1,1]){const h=new T.Mesh(new T.ConeGeometry(.04,.32,5),hn);h.position.set(s*.08,1.3,.42);h.rotation.x=-.6;m.add(h);}const beard=new T.Mesh(new T.ConeGeometry(.05,.18,4),gw);beard.rotation.x=Math.PI;beard.position.set(0,.84,.62);
        for(const [x,z] of [[-.14,.3],[.14,.3],[-.14,-.3],[.14,-.3]]){const l=new T.Mesh(new T.BoxGeometry(.09,.5,.09),hn);l.position.set(x,.25,z);m.add(l);}m.add(body,head,beard);grp.add(m);goats.push(m);}
      // eagle + nest
      eagle=new T.Group();{const br=M('#5a3a22'),wh=M('#f4f0e8');const b=new T.Mesh(new T.ConeGeometry(.35,1.5,6),br);b.rotation.x=Math.PI/2;const h=new T.Mesh(new T.SphereGeometry(.26,8,6),wh);h.position.z=.85;eagle.add(b,h);
        for(const s of [-1,1]){const wg=new T.Mesh(new T.BoxGeometry(2.2,.06,.7),br);wg.position.x=s*1.2;wg.name='w'+s;eagle.add(wg);}eagle.scale.setScalar(1.3);}grp.add(eagle);
      {const n=new T.Mesh(new T.TorusGeometry(.6,.25,6,14),M('#7a5a3a',{flatShading:true}));n.rotation.x=Math.PI/2;n.position.set(NEST.x,NEST.y+.25,NEST.z);grp.add(n);eggs=new T.Group();
        for(const s of [-.15,.18]){const e=new T.Mesh(new T.SphereGeometry(.16,10,8),M('#e9e2d0'));e.scale.y=1.3;e.position.set(s,.3,0);eggs.add(e);}eggs.position.set(NEST.x,NEST.y,NEST.z);grp.add(eggs);}
      // the frozen pond
      {const y=groundY(ICE.x,ICE.z);const ice=new T.Mesh(new T.CircleGeometry(ICE_R,32),M('#cfe8f2',{roughness:.08,metalness:.15}));ice.rotation.x=-Math.PI/2;ice.position.set(ICE.x,y+.06,ICE.z);ice.receiveShadow=true;grp.add(ice);
        const rim=new T.Mesh(new T.TorusGeometry(ICE_R+.3,.45,6,40),M('#f4f8fb',{roughness:.95}));rim.rotation.x=Math.PI/2;rim.scale.z=.45;rim.position.set(ICE.x,y+.1,ICE.z);grp.add(rim);
        for(const [a,s] of [[2.3,1.1],[2.7,.8],[3,.55]]){const m=snowman(ICE.x+Math.cos(a)*(ICE_R+2),ICE.z+Math.sin(a)*(ICE_R+2),s);m.rotation.y=-a-Math.PI/2;grp.add(m);}
        for(let k=0;k<6;k++){const a=.35+k*.32,m=snowman(ICE.x+Math.cos(a)*(ICE_R+2.4),ICE.z+Math.sin(a)*(ICE_R+2.4),.8);m.rotation.y=Math.PI-a+Math.PI/2;m.visible=false;grp.add(m);snowmen.push(m);}
        buildMan=snowman(SNOW_SPOT.x,SNOW_SPOT.z,.9,0);grp.add(buildMan);label('FROZEN POND',ICE.x,y+1.2,ICE.z-ICE_R-1.5,4.5);}
      // scarecrow eyes (front and back: nobody knows which way a scarecrow is really looking)
      for(const s of SCARE){const y=groundY(s.x,s.z)+s.y,fx=Math.sin(s.rot),fz=Math.cos(s.rot);for(const side of [-1,1])for(const e of [-1,1]){const m=new T.Mesh(new T.SphereGeometry(.07,8,6),B('#ffb02e'));m.position.set(s.x+fx*.4*side+fz*.14*e,y+.05,s.z+fz*.4*side-fx*.14*e);m.visible=false;grp.add(m);eyes.push(m);}}
      paintSnow();}
    function paintSnow(){if(!built)return;snowmen.forEach((m,i)=>m.visible=i<Math.min(w.snow.built,6));const p=w.snow.day===day()?w.snow.parts:0;
      for(let k=0;k<3;k++)buildMan.getObjectByName('p'+k).visible=k<p;for(const n of ['p3','p3b','p3c'])buildMan.getObjectByName(n).visible=p>=4;}
    // --- prompts + taps (chained in front of the legends, like the treetop village) ---
    const near=(ctx,p,r)=>Math.hypot(p.x-ctx.x,p.z-ctx.z)<r;
    function prompt(ctx){if(ctx.area!=='outdoor')return null;
      const pool=POOLS.find(p=>near(ctx,p,p.r+1.6));if(pool)return ctx.mounted?'Hop off to peek in the tide pool':'Peek in the tide pool';
      if(near(ctx,FALL,2.6))return ctx.mounted?'Hop off to slip behind the falls':'Slip behind the falls';
      if(near(ctx,HONEY,3.4))return ctx.mounted?'Bzzz! Hop off first':w.honey===day()?'Honey tree':'Collect honey';
      if(near(ctx,NEST,2.6))return 'Look in the eagle nest';
      if(near(ctx,SNOW_SPOT,2.6))return ctx.mounted?'Hop off to build a snowman':(w.snow.day===day()&&w.snow.parts>=4)?'Your snowman':'Build a snowman';
      if(skyNight>.5&&SCARE.some(s=>near(ctx,s,3)))return ctx.mounted?'Hop off and listen':'Listen to the scarecrow';return null;}
    const FINDS=[['starfish','⭐ A little starfish clings to a rock.'],['crab','🦀 A hermit crab tiptoes out of its shell.'],['glass-green','💚 A piece of green sea glass!'],['glass-blue','💙 A piece of blue sea glass!'],['shell','🐚 A spiral shell, pink inside.'],['glass-purple','💜 Rare purple sea glass!']];
    function interact(ctx){const pr=prompt(ctx);if(!pr)return false;if(ctx.mounted&&!/eagle/.test(pr)){tell(/Bzzz/.test(pr)?'🐝 The bees buzz round your horse’s ears. Hop off to get closer.':'Hop off first.',3);return true;}
      if(pr==='Peek in the tide pool'){const p=POOLS.find(q=>near(ctx,q,q.r+1.6)),k=day()+':'+p.i;sfx('splash');if(w.pool[k]){tell('🌊 The water ripples. Come back when the tide turns tomorrow.',3);return true;}
        const roll=Math.random(),f=roll<.06?FINDS[5]:FINDS[Math.floor(roll*5)%5];w.pool[k]=1;w.glass[f[0]]=(w.glass[f[0]]||0)+1;for(const q in w.pool)if(!q.startsWith(day()))delete w.pool[q];save();
        const n=Object.values(w.glass).reduce((a,b)=>a+b,0);coins('Tide pool',f[0]==='glass-purple'?15:3,'Tide pool find');tell(f[1]+` (${n} sea treasures found)`,5);return true;}
      if(pr==='Slip behind the falls'){sfx('whoosh');const first=!w.falls;w.falls=(w.falls||0)+1;save();if(first)coins('Hidden grotto',25,'Found the path behind the falls');
        adventureUI.open('💧 Behind the falls',`<p>${first?'You edge along the wet stones and slip behind the curtain of water. There’s a hidden grotto back here, its walls full of glowing crystals!':'The roar of the water fills the little grotto. The crystals glow blue and violet.'}</p>
          <p class="small">${first?'+25 🪙 for finding the secret path. Shh, not many riders know about it.':'You’ve been back here '+w.falls+' times.'}</p><button type="button" class="primary full" data-wd="x">Back out into the sunshine</button>`);
        adventureUI.dialog.querySelector('[data-wd]').onclick=()=>adventureUI.close();return true;}
      if(pr==='Honey tree'){tell('🍯 The bees are busy making more. Come back tomorrow.',3);return true;}
      if(pr==='Collect honey'){w.honey=day();save();sfx('pop');const rr=RanchUI.get();if(rr)RanchUI.set({...rr,food:{...rr.food,apple:(rr.food.apple||0)+3}});coins('Honey tree',5,'Honey from the old oak');
        tell('🍯 You scoop a little honey (the bees don’t mind sharing). Three honey-dipped apples go into your pantry.',6);return true;}
      if(pr==='Look in the eagle nest'){sfx('chime');if(!w.feather){w.feather=Date.now();save();coins('Eagle nest',20,'A golden eagle feather');tell('🪶 Two warm eggs, and tucked beside them a golden eagle feather! The eagle circles overhead, watching. +20 🪙',7);}
        else tell('🦅 The eggs are safe and warm. High above, the eagle keeps watch.',4);return true;}
      if(/snowman/.test(pr)){if(w.snow.day!==day())w.snow={...w.snow,day:day(),parts:0};if(w.snow.parts>=4){tell('⛄ Your snowman looks very pleased with himself. Build another tomorrow!',4);return true;}
        w.snow.parts++;sfx(w.snow.parts>=4?'fanfare':'pop');
        if(w.snow.parts>=4){w.snow.built++;coins('Frozen pond',8,'Built a snowman');tell('⛄ Carrot nose, coal eyes, a little hat: done! He joins the snowman row by the pond. +8 🪙',6);}
        else tell(['⚪ You roll a big snowball for the bottom.','⚪ A middle ball, packed tight.','⚪ A head! Tap once more to give him a face.'][w.snow.parts-1],3);save();paintSnow();return true;}
      if(pr==='Listen to the scarecrow'){sfx('whoosh');const t=WB.nearest(ctx.x,ctx.z),f=WC.info().foal;let line;
        if(t)line=`Psst… I see everything from up here. Something worth finding lies about ${Math.round(Math.hypot(t.x-ctx.x,t.z-ctx.z)/10)*10} m to the ${dirTo(ctx.x,ctx.z,t.x,t.z)}.`;
        else if(f)line=`Psst… a silver-spotted foal is out in a meadow tonight, to the ${dirTo(ctx.x,ctx.z,f.x,f.z)}. Walk up gently.`;else line='Psst… you’ve found every secret I know. Now go to bed!';
        tell('🎃 The scarecrow’s eyes flicker: “'+line+'”',8);return true;}
      return false;}
    const _p=legendsWorld.prompt,_i=legendsWorld.interact;legendsWorld.prompt=ctx=>prompt(ctx)||_p(ctx);legendsWorld.interact=ctx=>interact(ctx)||_i(ctx);
    let iceTold=0,goatTold=0;
    function step(now,delta){if(!built)build();const out=area==='outdoor',px=position.x,pz=position.z,t=now/1000;
      const coast=out&&Math.hypot(px+206,pz-200)<70;foam.forEach((f,k)=>{f.visible=coast;if(coast){const ph=(t*.35+k/3)%1;f.position.z=196.4-ph*3.2;f.material.opacity=Math.sin(ph*Math.PI)*.75;f.scale.x=1+ph*.08;}});
      for(const p of pools)p.star.visible=out;
      if(mist){mist.visible=out&&Math.hypot(px-FALL.x,pz-FALL.z)<80;if(mist.visible)mist.children.forEach((m,k)=>{m.position.y=.5+((t*.4+k*.17)%1)*1.6;m.material.opacity=.22*(1-((t*.4+k*.17)%1));});crystals.forEach((c,k)=>c.rotation.y=t*.6+k);}
      for(const b of bees){b.m.visible=out;b.a+=delta*(2+b.r);b.m.position.set(b.c.x+Math.cos(b.a)*b.r,b.c.y-.2+Math.sin(b.a*1.7)*.3,b.c.z+Math.sin(b.a)*b.r);}
      const onMt=out&&Math.hypot(px-CLOUDSTEP.cx,pz-CLOUDSTEP.cz)<140;
      GOATS.forEach((g,i)=>{const m=goats[i];m.visible=onMt;if(!onMt)return;g.t+=delta;
        if(!g.jump&&g.t>4+i){g.t=0;g.jump=1;g.from=g.ph;g.to=Math.max(.05,Math.min(.78,g.u+(Math.random()-.5)*.06))*TRAIL_END;}
        if(g.jump){g.jump=Math.min(2,g.jump+delta*1.4);const k=g.jump-1;g.ph=g.from+(g.to-g.from)*Math.min(1,k);if(g.jump>=2)g.jump=0;}
        const p=goatPos(g.ph),hop=g.jump?Math.sin(Math.min(1,g.jump-1)*Math.PI)*.8:0;m.position.set(p.x,p.y+hop,p.z);const q=goatPos(g.ph+.02);m.rotation.y=Math.atan2(q.x-p.x,q.z-p.z)+(g.jump?0:Math.PI/2);
        if(Math.hypot(p.x-px,p.z-pz)<5&&now-goatTold>60000){goatTold=now;sfx('bonk',{vol:.3});tell('🐐 A mountain goat stares at you, chewing. “Maaa!” It hops up the cliff like it’s nothing.',4);}});
      if(eagle){eagle.visible=onMt;if(onMt){const a=t*.25;eagle.position.set(NEST.x+Math.cos(a)*22,NEST.y+16+Math.sin(t*.7)*2,NEST.z+Math.sin(a)*22);eagle.rotation.set(0,-a,0);eagle.rotateZ(-.25);
        const f=Math.sin(t*3)*.25;eagle.getObjectByName('w-1').rotation.z=f;eagle.getObjectByName('w1').rotation.z=-f;}}
      if(eggs)eggs.visible=out;
      const night=out&&skyNight>.5;for(const e of eyes){e.visible=night;if(night)e.scale.setScalar(.85+Math.sin(t*4+e.position.x)*.15);}
      if(out&&Math.hypot(px-ICE.x,pz-ICE.z)<ICE_R&&moveSpeed>1&&now-iceTold>90000){iceTold=now;tell('⛸️ Wheee! The ice is slippery. '+(mounted?mounted.data.name+' steps very carefully.':'You slide the last few steps.'),3);}}
    return {step,prompt,tap:interact,info:()=>({POOLS,FALL,HONEY,ICE,SNOW_SPOT,NEST,SCARE,w,built}),_set(o){w={...w,...o};save();paintSnow();}};})();

  // ===== Winter land (#37, v117) =====
  // Snowy Pines (the north-west region) gets colder the deeper you go: a thermometer shows while you're up there.
  // Too cold for what you're wearing (2026-11-16, Yoshi: no invisible wall): a few seconds of shivering to turn back, then
  // a circle wipe carries you (and the horse you're riding) back to the last warm-enough spot you stood on, or the
  // nearest warm open ground toward the valley. Nothing is lost. Blizzards roll in for
  // two minutes in every nine and make it 5° colder. Frostline Outfitters at the edge sells four puffy pieces; you
  // wear them automatically in the snow (on foot and as the jockey). Deep in the corner: the Frostpeak ice palace,
  // with a crystal for whoever makes it, and northern lights after dark.
  const WN=(()=>{const KEY='trottville-winter-v1';let o={};try{o=JSON.parse(localStorage.getItem(KEY))||{};}catch{}const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(o));}catch{}};
    const inNW=(x,z)=>x<-100&&z<-100,depth=(x,z)=>Math.max(0,Math.min(-100-x,-100-z));
    const blizzard=()=>{const m=Math.floor(Date.now()/60000)%9;return m<2;};
    const tempAt=(x,z)=>3-depth(x,z)*.08-(blizzard()?5:0);
    const owned=()=>WINTER_GEAR.filter(g=>o[g.id]),warmth=()=>owned().reduce((a,g)=>a+g.warmth,0),FULL=WINTER_GEAR.reduce((a,g)=>a+g.warmth,0);
    const limit=()=>warmth()>=FULL?-Infinity:-6-warmth();
    const SHOP=(()=>{for(const [x,z] of [[-112,-112],[-110,-118],[-118,-110],[-108,-108],[-120,-120]]){const p={x,z};let ok=true;for(let a=0;a<6.28;a+=.8)if(blocked(x+Math.cos(a)*3,z+Math.sin(a)*3,.6,0,outdoorObstacles))ok=false;if(ok)return p;}return {x:-112,z:-112};})();
    const PALACE=(()=>{for(let r=0;r<40;r+=4)for(let a=0;a<6.28;a+=.5){const x=-262+Math.cos(a)*r,z=-262+Math.sin(a)*r;if(!blocked(x,z,3,0,outdoorObstacles))return {x,z};}return {x:-262,z:-262};})();
    outdoorObstacles.push({kind:'box',x:SHOP.x,z:SHOP.z-1.5,hx:2.2,hz:1.4,height:4});
    let built=false,gauge=null,storm=null,aurora=null,palace=null,warmSpot=null,coldSince=0,carrying=false,stormWas=false,applied='',inside=false;const SHIVER=4000;
    function build(){built=true;const grp=new T.Group();outdoors.add(grp);const M=(c,x={})=>new T.MeshStandardMaterial({color:c,roughness:.85,...x});
      // the outfitter's log cabin (door faces +z, you talk to Tove on the porch)
      {const y=groundY(SHOP.x,SHOP.z),g=new T.Group();const logs=M('#7a5434',{flatShading:true});const b=new T.Mesh(new T.BoxGeometry(4.4,2.6,2.8),logs);b.position.set(0,1.3,-1.5);g.add(b);
        const roof=new T.Mesh(new T.CylinderGeometry(.01,2.9,1.6,4,1),M('#f4f8fb',{roughness:.95}));roof.rotation.y=Math.PI/4;roof.scale.set(1.15,1,.75);roof.position.set(0,3.4,-1.5);g.add(roof);
        const door=new T.Mesh(new T.BoxGeometry(.9,1.7,.08),M('#4a3020'));door.position.set(0,.85,-.06);g.add(door);for(const s of [-1,1]){const w=new T.Mesh(new T.PlaneGeometry(.7,.6),new T.MeshBasicMaterial({color:'#ffd27a'}));w.position.set(s*1.4,1.5,-.08);g.add(w);}
        for(const [s,c] of [[-1,'#d8443c'],[1,'#2f4a6b']]){const coat=new T.Mesh(new T.CapsuleGeometry(.28,.5,4,8),M(c,{roughness:.6}));coat.position.set(s*1.9,1.2,.25);g.add(coat);}
        g.position.set(SHOP.x,y,SHOP.z);grp.add(g);label('FROSTLINE OUTFITTERS',SHOP.x,y+4.6,SHOP.z,6.5);}
      // Frostpeak: ice spires round a frozen courtyard, a crystal on a plinth in the middle
      palace=new T.Group();{const ice=M('#bfe6f5',{roughness:.12,metalness:.1,transparent:true,opacity:.82}),deep=M('#8fd0ea',{roughness:.1,transparent:true,opacity:.85});const y=groundY(PALACE.x,PALACE.z);
        for(let k=0;k<9;k++){const a=k/9*Math.PI*2,h=6+(k%3)*3.5,s=new T.Mesh(new T.ConeGeometry(1.1+(k%2)*.5,h,6),k%2?ice:deep);s.position.set(Math.cos(a)*9,y+h/2,Math.sin(a)*9);palace.add(s);
          outdoorObstacles.push({kind:'box',x:PALACE.x+Math.cos(a)*9,z:PALACE.z+Math.sin(a)*9,hx:1,hz:1,height:h});}
        const tall=new T.Mesh(new T.ConeGeometry(2,16,6),ice);tall.position.set(0,y+8,-12);palace.add(tall);
        const floor=new T.Mesh(new T.CircleGeometry(8,32),M('#e3f4fb',{roughness:.05,metalness:.2}));floor.rotation.x=-Math.PI/2;floor.position.y=y+.05;palace.add(floor);
        const pl=new T.Mesh(new T.CylinderGeometry(.5,.7,1.1,8),ice);pl.position.y=y+.55;palace.add(pl);const cr=new T.Mesh(new T.OctahedronGeometry(.42),new T.MeshBasicMaterial({color:'#bff4ff'}));cr.scale.y=1.6;cr.position.y=y+1.75;cr.name='crystal';palace.add(cr);}
      palace.position.set(PALACE.x,0,PALACE.z);palace.children.forEach(c=>{});grp.add(palace);label('FROSTPEAK',PALACE.x,groundY(PALACE.x,PALACE.z)+3.4,PALACE.z+9.5,4.5);
      // northern lights: soft green-violet curtains high over the north-west, only after dark
      aurora=new T.Group();{const c=document.createElement('canvas');c.width=8;c.height=64;const x=c.getContext('2d'),gr=x.createLinearGradient(0,0,0,64);gr.addColorStop(0,'rgba(170,120,255,0)');gr.addColorStop(.35,'rgba(150,110,255,.55)');gr.addColorStop(.7,'rgba(90,255,170,.8)');gr.addColorStop(1,'rgba(90,255,170,0)');x.fillStyle=gr;x.fillRect(0,0,8,64);
        const tex=new T.CanvasTexture(c);for(let k=0;k<4;k++){const m=new T.Mesh(new T.PlaneGeometry(180,40,24,1),new T.MeshBasicMaterial({map:tex,transparent:true,opacity:.5,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,fog:false}));
          m.position.set(-230+k*12,95+k*6,-300+k*14);m.rotation.y=.6+k*.12;m.userData.base=m.geometry.attributes.position.array.slice();aurora.add(m);}}aurora.visible=false;scene.add(aurora);
      // HUD: thermometer pill + blizzard overlay
      gauge=document.createElement('div');gauge.setAttribute('role','status');gauge.style.cssText='position:absolute;right:12px;top:142px;z-index:30;display:none;padding:8px 14px;border-radius:20px;background:#eef7fbee;color:#1d3a4a;font:700 15px system-ui,sans-serif;box-shadow:0 4px 14px #0003;pointer-events:none';view.append(gauge);
      storm=document.createElement('div');storm.style.cssText='position:absolute;inset:0;z-index:4;pointer-events:none;opacity:0;transition:opacity 2s;background:radial-gradient(circle at 20% 30%,#fff 1.5px,transparent 2px) 0 0/38px 38px,radial-gradient(circle at 70% 60%,#fff 2px,transparent 2.5px) 0 0/55px 55px,radial-gradient(circle at 40% 80%,#fffc 1px,transparent 1.5px) 0 0/27px 27px,linear-gradient(#e8f2f8aa,#f4f8fbcc);animation:wn-snow 1.4s linear infinite';
      if(!document.getElementById('wn-style')){const st=document.createElement('style');st.id='wn-style';st.textContent='@keyframes wn-snow{to{background-position:-30px 38px,-44px 55px,-20px 27px,0 0}}';document.head.append(st);}view.append(storm);}
    const fmt=t=>(t<0?'−':'')+Math.abs(Math.round(t))+'°C';
    function wear(){const p=inside&&owned().length?Object.fromEntries(WINTER_GEAR.map(g=>[g.id,!!o[g.id]])):null,key=p?JSON.stringify(p):'';if(key===applied)return;applied=key;winterNow=p;avatar.setLook(p?{...look,winter:p}:look);companions.forEach(dress);}
    function shop(){const w=loadWallet();
      adventureUI.open('🧥 Frostline Outfitters',`<div class="hazel-talk"><span class="hazel-face" aria-hidden="true">🧣</span><p class="hazel-line">Brr, come in, come in! I’m Tove. Up in Snowy Pines it gets colder every step. Bundle up and you’ll get all the way to Frostpeak.</p></div>
        <p class="small">You have 🪙 ${coinWords(w.coins)} · Warmth ${warmth()} of ${FULL}${warmth()>=FULL?' · Ready for anything!':''}</p>
        ${WINTER_GEAR.map(g=>o[g.id]?`<button type="button" class="secondary full" disabled style="margin-top:8px">${g.icon} ${g.name} ✓ yours</button>`:`<button type="button" class="primary full" data-wn="${g.id}" style="margin-top:8px">${g.icon} ${g.name} · ${g.price} 🪙 (+${g.warmth} warmth)</button>`).join('')}
        <button type="button" class="text-button" data-wn="" style="margin-top:10px">Thanks, Tove!</button>`);
      adventureUI.dialog.querySelectorAll('[data-wn]').forEach(b=>b.onclick=()=>{const id=b.dataset.wn;if(!id){adventureUI.close();return;}const g=WINTER_GEAR.find(x=>x.id===id),wl=loadWallet();
        if(wl.coins<g.price){tell('Not enough Trotties for that yet. Odd jobs and races pay!',3);return;}saveWallet({...wl,coins:wl.coins-g.price});paintCounters();o[id]=Date.now();save();sfx('buy');applied='x';wear();
        tell(`${g.icon} ${g.name}! You’ll wear it whenever you’re up in Snowy Pines.`+(warmth()>=FULL?' You’re fully bundled up now: nothing’s too cold!':''),5);shop();});}
    function prompt(ctx){if(ctx.area!=='outdoor')return null;if(Math.hypot(ctx.x-SHOP.x,ctx.z-SHOP.z)<3.6)return 'Frostline Outfitters';
      if(Math.hypot(ctx.x-PALACE.x,ctx.z-PALACE.z)<2.6)return o.crystal?'The Frostpeak crystal':'Take the Frostpeak crystal';return null;}
    function interact(ctx){const pr=prompt(ctx);if(!pr)return false;if(pr==='Frostline Outfitters'){shop();return true;}
      if(!o.crystal){o.crystal=Date.now();save();sfx('fanfare');queueCoins({from:'Frostpeak',coins:50,lines:['Reached the Frostpeak ice palace · 50 🪙']});
        adventureUI.open('❄️ Frostpeak',`<p>You made it to the ice palace at the top of the world! The crystal hums and glows in your hands. Tove will never believe it.</p><p class="small">+50 🪙. After dark, look up: the northern lights dance right over Frostpeak.</p><button type="button" class="primary full" data-wn2>Wow!</button>`);
        adventureUI.dialog.querySelector('[data-wn2]').onclick=()=>adventureUI.close();}
      else tell('❄️ The crystal sings softly. The whole of Snowy Pines glitters below you.',4);return true;}
    const _p=legendsWorld.prompt,_i=legendsWorld.interact;legendsWorld.prompt=ctx=>prompt(ctx)||_p(ctx);legendsWorld.interact=ctx=>interact(ctx)||_i(ctx);
    // Where to go when it's too cold: the last warm spot you stood on, else walk the map toward the valley (+x/+z)
    // until it's a degree warmer than you need and open.
    function warmGround(x,z){if(warmSpot&&tempAt(warmSpot.x,warmSpot.z)>=limit()&&!isBlocked(warmSpot.x,warmSpot.z,.8))return warmSpot;
      for(let k=1;k<80;k++){const nx=x+k*3,nz=z+k*3;if(tempAt(nx,nz)>=limit()+1||!inNW(nx,nz))for(let r=0;r<10;r+=2)for(let a=0;a<6.28;a+=.8){const px=nx+Math.cos(a)*r,pz=nz+Math.sin(a)*r;if(!isBlocked(px,pz,.8)&&(tempAt(px,pz)>=limit()+1||!inNW(px,pz)))return {x:px,z:pz};}}
      return {x:-90,z:-90};}
    function step(now){if(!built)build();const out=area==='outdoor',x=position.x,z=position.z;inside=out&&inNW(x,z);wear();
      const t=tempAt(x,z),bz=blizzard();
      // too cold: shiver for SHIVER ms (turn back and it stops), then the circle wipe carries you to warm ground
      const cold=inside&&t<limit();
      if(out&&!cold&&!carrying)warmSpot={x,z};
      if(!cold)coldSince=0;
      else if(!carrying){if(!coldSince){coldSince=now;sfx('bonk',{vol:.3});tell(`🥶 Brrr! ${fmt(t)} is too cold for what you’re wearing. Turn back to warmer ground!${bz?' (A blizzard is making it colder.)':''}`,4);}
        else if(now-coldSince>SHIVER){carrying=true;const to=warmGround(x,z);
          iris(()=>{moveTo(to.x,to.z);coldSince=0;carrying=false;sfx('whoosh');
            tell(`🥶 Too cold up there! You headed back to warmer ground. ${owned().length?'More winter clothes':'Winter clothes'} from Frostline Outfitters will get you further${bz?', or wait for the blizzard to pass':''}.`,7);});}}
      if(gauge){gauge.style.display=inside?'block':'none';if(inside){const ok=t>=limit();gauge.textContent=`🌡️ ${fmt(t)}${bz?' · 🌨️ Blizzard':''} · ${owned().map(g=>g.icon).join('')||'no winter clothes'}`;gauge.style.background=ok?'#eef7fbee':'#ffe3e0ee';}}
      const sh=inside&&bz;if(storm)storm.style.opacity=sh?Math.min(.9,.45+depth(x,z)/300):0;if(sh&&!stormWas){sfx('whoosh');tell('🌨️ A blizzard is rolling in! It’s 5° colder until it blows over.',5);}stormWas=sh;
      if(aurora){aurora.visible=out&&skyNight>.5&&x<0&&z<0;if(aurora.visible)aurora.children.forEach((m,k)=>{const p=m.geometry.attributes.position,b=m.userData.base;for(let i=0;i<p.count;i++)p.array[i*3+2]=b[i*3+2]+Math.sin(b[i*3]*.05+now/1600+k)*6;p.needsUpdate=true;});}
      if(palace){palace.visible=out;const c=palace.getObjectByName('crystal');if(c)c.rotation.y=now/800;}}
    return {step,info:()=>({SHOP,PALACE,o,temp:tempAt(position.x,position.z),limit:limit(),warmth:warmth(),blizzard:blizzard(),inside,applied}),reset(){applied='x';},_set(v){o={...o,...v};save();applied='x';},tap:interact,prompt};})();

  // ===== Region gates (#38, v118) =====
  // Every wild region keeps one place you can't reach without something. Snowy Pines' is the cold (WN above). The rest:
  // a ring you can't cross until you have/do the thing; once inside you can always walk out. Each holds a chest (+30 once).
  const GT=(()=>{const KEY='trottville-gates-v1';let o={};try{o=JSON.parse(localStorage.getItem(KEY))||{};}catch{}o.chest||={};const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(o));}catch{}};
    const lowTide=()=>Math.floor(Date.now()/60000)%10<4,tideWait=()=>10-Math.floor(Date.now()/60000)%10;
    const DEF=[
      {id:'dell',region:'ne',name:'Fern Dell',at:[258,-250],R:8,kind:'rocks',need:'On foot only',ok:()=>!mounted,
        no:'🪨 Too rocky to ride. Hop off and scramble over the boulders on foot.'},
      {id:'ledge',region:'n',name:'Misty Ledge',at:[-70,-150],R:8,kind:'mist',need:'An eagle feather',ok:()=>!!WD.info().w.feather,
        no:'🌫️ Thick mist hides the way. Only someone carrying an eagle feather can find the path (the nest is high on Cloudstep).'},
      {id:'glade',region:'w',name:'Moonlit Glade',at:[-215,-70],R:8,kind:'bramble',need:'Night time',ok:()=>skyNight>.5,
        no:'🌙 The brambles are wound tight. They only part when the moon is up. Come back after dark.'},
      {id:'cave',region:'sw',name:'Smugglers’ Sea Cave',at:[-240,165],R:7,kind:'tide',need:'Low tide',ok:lowTide,
        no:()=>`🌊 The tide is in and the cave mouth is underwater. Low tide in about ${tideWait()} minute${tideWait()===1?'':'s'}.`},
      {id:'meadow',region:'s',name:'Queen Bee Meadow',at:[-45,255],R:8,kind:'hives',need:'A bee veil',ok:()=>!!o.veil,
        no:'🐝 A cloud of bees guards the meadow. You need a bee veil (the beekeeper’s box by the gate sells one).'},
      {id:'paddock',region:'e',name:'Champion’s Paddock',at:[235,45],R:8,kind:'hedge',need:'Jump the hedge on horseback',ok:()=>false,
        no:'🌿 A tall hedge all round. Ride at it and jump!'},
      {id:'cellar',region:'se',name:'Old Orchard Cellar',at:[150,250],R:6,kind:'fence',need:'5 horseshoes found',ok:()=>WB.info().got.shoes>=5,
        no:'🧲 The cellar gate has five horseshoe-shaped locks. Find 5 lucky horseshoes out in the valley and they’ll open.'},
    ];
    // spot: the nearest open ground to the wanted point (nothing solid in the ring)
    const G=DEF.map(d=>{let best=null;for(let r=0;r<50&&!best;r+=3)for(let a=0;a<6.28&&!best;a+=.45){const x=d.at[0]+Math.cos(a)*r,z=d.at[1]+Math.sin(a)*r;let ok=riverAt(x,z).d>d.R+4;
        for(let k=0;k<12&&ok;k++){const b=k/12*6.28;if(blocked(x+Math.cos(b)*(d.R+1),z+Math.sin(b)*(d.R+1),.8,0,outdoorObstacles)||blocked(x+Math.cos(b)*d.R*.5,z+Math.sin(b)*d.R*.5,.8,0,outdoorObstacles))ok=false;}
        if(ok&&!blocked(x,z,1,0,outdoorObstacles))best={x,z};}return {...d,x:(best||{x:d.at[0]}).x,z:(best||{z:d.at[1]}).z,inside:false};});
    for(const g of G){if(g.kind==='hedge'){for(let k=0;k<28;k++){const a=k/28*6.28;outdoorObstacles.push({kind:'box',x:g.x+Math.cos(a)*g.R,z:g.z+Math.sin(a)*g.R,hx:1.05,hz:1.05,height:1.1});}continue;}
      outdoorObstacles.push({kind:'lake',x:g.x,z:g.z,rx:g.R+.6,rz:g.R+.6,height:30,pass:(x,z)=>{if(g.inside||Math.hypot(x-g.x,z-g.z)<g.R-1.4)return true;try{return g.ok();}catch{return true;}}});}
    let built=false,toldAt=0;const fx=[];
    function build(){built=true;const grp=new T.Group();outdoors.add(grp);const M=(c,x={})=>new T.MeshStandardMaterial({color:c,roughness:.9,flatShading:true,...x});
      for(const g of G){const y0=groundY(g.x,g.z),ring=n=>[...Array(n)].map((_,k)=>{const a=k/n*6.28,x=g.x+Math.cos(a)*g.R,z=g.z+Math.sin(a)*g.R;return {a,x,z,y:groundY(x,z)};});
        if(g.kind==='rocks')for(const p of ring(22)){const m=new T.Mesh(new T.DodecahedronGeometry(1.1+(p.a*7%1)*.7),M('#8e8a80'));m.position.set(p.x,p.y+.5,p.z);m.rotation.set(p.a,p.a*3,0);grp.add(m);}
        if(g.kind==='hedge'){const hm=M('#3f7d3a');for(const p of ring(28)){const m=new T.Mesh(new T.BoxGeometry(2.3,1.3,1),hm);m.position.set(p.x,p.y+.65,p.z);m.rotation.y=-p.a+Math.PI/2;grp.add(m);}}
        if(g.kind==='bramble'){const bm=M('#4a3a2e'),lm=M('#2f5a2c');for(const p of ring(26)){const m=new T.Mesh(new T.TorusKnotGeometry(.6,.12,30,4),bm);m.position.set(p.x,p.y+.8,p.z);m.rotation.set(p.a,p.a*2,0);grp.add(m);const l=new T.Mesh(new T.IcosahedronGeometry(.7,0),lm);l.position.set(p.x,p.y+1.2,p.z);grp.add(l);fx.push({g,m,l,kind:'bramble'});}}
        if(g.kind==='mist'){const mm=new T.MeshBasicMaterial({color:'#f2f6f8',transparent:true,opacity:.75,depthWrite:false});for(const p of ring(18)){const m=new T.Mesh(new T.SphereGeometry(1.8,10,8),mm);m.position.set(p.x,p.y+1.2,p.z);grp.add(m);fx.push({g,m,kind:'mist'});}}
        if(g.kind==='tide'){const rock=M('#6f6a64');for(const p of ring(14)){const m=new T.Mesh(new T.DodecahedronGeometry(1.3),rock);m.position.set(p.x,p.y+.7,p.z);grp.add(m);}const arch=new T.Mesh(new T.TorusGeometry(2.6,.8,6,12,Math.PI),rock);arch.position.set(g.x,y0,g.z-g.R*.4);grp.add(arch);
          const wat=new T.Mesh(new T.RingGeometry(g.R-1.6,g.R+1.6,32),new T.MeshStandardMaterial({color:'#3f8fa6',transparent:true,opacity:.8,roughness:.1}));wat.rotation.x=-Math.PI/2;wat.position.set(g.x,y0+.25,g.z);grp.add(wat);fx.push({g,m:wat,kind:'tide'});}
        if(g.kind==='hives'){for(const p of ring(10)){const h=new T.Mesh(new T.CylinderGeometry(.45,.55,1,8),M('#e8c86a'));h.position.set(p.x,p.y+.5,p.z);grp.add(h);}
          const sw=new T.Group();for(let k=0;k<40;k++){const b=new T.Mesh(new T.SphereGeometry(.07,4,3),new T.MeshBasicMaterial({color:k%2?'#222':'#f2c230'}));sw.add(b);}grp.add(sw);fx.push({g,m:sw,kind:'bees'});
          const box=new T.Mesh(new T.BoxGeometry(.8,.9,.6),M('#b88a52'));const bx=g.x,bz=g.z+g.R+2.2;box.position.set(bx,groundY(bx,bz)+.45,bz);grp.add(box);g.box={x:bx,z:bz};}
        if(g.kind==='fence'){const fm=M('#6b4a32');for(const p of ring(20)){const m=new T.Mesh(new T.BoxGeometry(.18,1.6,.18),fm);m.position.set(p.x,p.y+.8,p.z);grp.add(m);}for(const h of [.5,1.2]){const r=new T.Mesh(new T.TorusGeometry(g.R,.06,4,40),fm);r.rotation.x=Math.PI/2;r.position.set(g.x,y0+h,g.z);grp.add(r);}
          const door=new T.Mesh(new T.BoxGeometry(2,1.2,.6),M('#7a5a3a'));door.rotation.x=-.25;door.position.set(g.x,y0+.5,g.z);grp.add(door);}
        // the chest in the middle
        const ch=new T.Group();const b=new T.Mesh(new T.BoxGeometry(1,.6,.7),M('#8a5a2e'));b.position.y=.3;const lid=new T.Mesh(new T.CylinderGeometry(.35,.35,1,10,1,false,0,Math.PI),M('#9a6a36'));lid.rotation.z=Math.PI/2;lid.position.y=.6;lid.name='lid';
        const band=new T.Mesh(new T.BoxGeometry(1.05,.08,.75),M('#e8c040',{metalness:.6,roughness:.3}));band.position.y=.45;ch.add(b,lid,band);const cx=g.kind==='fence'?g.x+2:g.x,cz=g.z+(g.kind==='tide'?1:0);ch.position.set(cx,groundY(cx,cz),cz);grp.add(ch);g.chest={x:cx,z:cz,m:ch};
        label(g.name.toUpperCase(),g.x,y0+3.4,g.z+g.R+1.5,5);label('🔒 '+g.need,g.x,y0+2.6,g.z+g.R+1.5,5);}
      paint();}
    function paint(){if(!built)return;for(const g of G){const open=!!o.chest[g.id];g.chest.m.getObjectByName('lid').rotation.x=open?-1.1:0;}}
    const nearG=(ctx,r)=>G.find(g=>Math.hypot(ctx.x-g.x,ctx.z-g.z)<g.R+r);
    function prompt(ctx){if(ctx.area!=='outdoor')return null;
      const c=G.find(g=>Math.hypot(ctx.x-g.chest.x,ctx.z-g.chest.z)<2.2);if(c)return o.chest[c.id]?c.name+' (chest empty)':'Open the chest';
      const v=G.find(g=>g.box&&Math.hypot(ctx.x-g.box.x,ctx.z-g.box.z)<2.2);if(v&&!o.veil)return 'Buy a bee veil · 20 🪙';
      const g=nearG(ctx,3);if(g&&!g.inside&&Math.hypot(ctx.x-g.x,ctx.z-g.z)>g.R-1&&!g.ok())return '🔒 '+g.name;return null;}
    function interact(ctx){const pr=prompt(ctx);if(!pr)return false;
      if(pr==='Open the chest'){const g=G.find(x=>Math.hypot(ctx.x-x.chest.x,ctx.z-x.chest.z)<2.2);o.chest[g.id]=Date.now();save();paint();sfx('fanfare');queueCoins({from:g.name,coins:30,lines:['Found the chest at '+g.name+' · 30 🪙']});
        tell(`🗝️ You made it into ${g.name}! The old chest creaks open: 30 Trotties.`+` (${Object.keys(o.chest).length} of ${G.length+1} secret places)`,6);return true;}
      if(/chest empty/.test(pr)){tell('The chest is empty now, but it’s a lovely spot.',3);return true;}
      if(/bee veil/.test(pr)){const w=loadWallet();if(w.coins<20){tell('You need 20 Trotties for the veil.',3);return true;}saveWallet({...w,coins:w.coins-20});paintCounters();o.veil=Date.now();save();sfx('buy');tell('🐝 You put on the bee veil. The bees let you through now!',4);return true;}
      const g=nearG(ctx,3);tell(typeof g.no==='function'?g.no():g.no,6);return true;}
    const _p=legendsWorld.prompt,_i=legendsWorld.interact;legendsWorld.prompt=ctx=>prompt(ctx)||_p(ctx);legendsWorld.interact=ctx=>interact(ctx)||_i(ctx);
    function step(now){if(!built)build();const out=area==='outdoor',px=position.x,pz=position.z,t=now/1000;
      for(const g of G){const d=Math.hypot(px-g.x,pz-g.z);g.inside=out&&d<g.R+.2&&(g.inside||d<g.R-1.4||g.ok()||g.kind==='hedge');
        if(out&&!g.inside&&d<g.R+1.2&&d>g.R-.5&&g.kind!=='hedge'&&!g.ok()&&now-toldAt>8000){toldAt=now;tell(typeof g.no==='function'?g.no():g.no,6);}}
      for(const f of fx){const ok=f.g.ok();if(f.kind==='mist'){f.m.material.opacity=ok?.18:.75;f.m.position.y+=Math.sin(t+f.m.position.x)*.003;}
        if(f.kind==='bramble'){const s=ok?.35:1;f.m.scale.setScalar(s);f.l.scale.setScalar(s);}
        if(f.kind==='tide')f.m.visible=!ok;
        if(f.kind==='bees'){f.m.visible=out;f.m.children.forEach((b,k)=>{const a=t*(1.5+k%5*.3)+k;b.position.set(f.g.x+Math.cos(a)*(f.g.R+Math.sin(k)*1.2),groundY(f.g.x,f.g.z)+1+Math.sin(a*2+k)*.8,f.g.z+Math.sin(a)*(f.g.R+Math.cos(k)*1.2));});}}}
    return {step,info:()=>({gates:G.map(g=>({id:g.id,x:g.x,z:g.z,ok:g.ok(),inside:g.inside,chest:!!o.chest[g.id]})),veil:!!o.veil}),_set(v){o={...o,...v};save();paint();},tap:interact,prompt};})();

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
  const groundY=(x,z)=>area==='barn'?0:Math.max(chunks.surfaceHeight(x,z),acts.floor(x,z),bridgeFloor(x,z));   // Lily Lake's stepping-stones and dock stand above the water
  const stampKey='horselandia-world-stamps-v1:'+storageKey;let stamps={};try{stamps=JSON.parse(localStorage.getItem(stampKey))||{};}catch{}
  stamps=normalizeStamps(stamps,horses.map(h=>h.id));
  let hoofDist=0,mounted=null,called=companions.find(h=>h.data.id===preferredHorse)||companions[0],yaw=Math.PI*.22,pitch=.26,cameraDistance=11,canter=false,jump=0,jumpVelocity=0,phase=0,totalDistance=0,disposed=false,raf=0,lastTime=performance.now(),lastHUD=0,lastRender=0,messageUntil=0;
  const keys=new Set(),position={x:0,z:9.7},cameraTarget=new T.Vector3(position.x,1.5,position.z),aim=new T.Vector3(),cameraRay=new T.Raycaster(),cameraDirection=new T.Vector3();
  let hoofHold=0,stepHold=0,ride=null,walkPath=[],walkGoal=null,walkStalled=0,mountOnArrival=null,doOnArrival=null,moveSpeed=0,stick=null;
  const groundRay=new T.Raycaster(),tapPoint=new T.Vector2();
  const destination=new T.Mesh(geo(new T.RingGeometry(.40,.61,32)),mat('#f3d58d',{side:T.DoubleSide,depthWrite:false}));
  destination.rotation.x=-Math.PI/2;destination.visible=false;destination.renderOrder=3;scene.add(destination);
  function cancelWalk(){mapTrip=null;mountOnArrival=null;doOnArrival=null;walkPath=[];walkGoal=null;walkStalled=0;destination.visible=false;$('#world-walk-stop').hidden=true;host.dataset.walking='false';}
  let touchy=matchMedia('(pointer: coarse)').matches;const keyHint=t=>String(t).replace(/ · ([A-Z])$/,touchy?'':' ($1)');document.querySelectorAll('.world-keys-help').forEach(e=>e.hidden=touchy);host.classList.toggle('is-touch',touchy);const setTouchy=v=>{if(v===touchy)return;touchy=v;host.classList.toggle('is-touch',v);pillText='';document.querySelectorAll('.world-keys-help').forEach(e=>e.hidden=v);try{updateHUD();updateAdventureHUD();}catch{}};
  addEventListener('pointerdown',e=>setTouchy(e.pointerType!=='mouse'),{capture:true,passive:true});addEventListener('keydown',()=>setTouchy(false),{capture:true,passive:true});
  function setButtonLabel(id,text){text=keyHint(text);const button=$(id);button.setAttribute('aria-label',text);button.title=text;const caption=button.querySelector('.world-icon-caption');if(caption&&id==='#world-mount')caption.textContent=text.startsWith('Dismount')?'Dismount':text.startsWith('Mount')?'Mount':text.startsWith('Ride')?'Ride':text.startsWith('Back')?'Back':'Call';if(caption&&id==='#world-interact'){const w=(text.match(/^[A-Za-z]+/)||['Use'])[0];caption.textContent=w.length<=8?w:'Use';}const tooltip=button.querySelector('.world-tooltip');if(tooltip)tooltip.textContent=text;}
  function closeCompactPanels(){for(const [panel,toggle]of [['#world-camera-panel','#world-camera-toggle'],['#world-companions-panel','#world-companions-toggle']]){$(panel).hidden=true;$(toggle).setAttribute('aria-expanded','false');}}
  // ---- v102 tap-to-act ----
  // Each target: a point (x,z), the reach interact() uses there, an optional stand spot to walk to, and an optional object
  // (a building or a horse): tapping anywhere on it counts. Otherwise a tap counts when it lands on a thing (not bare
  // ground) within reach of the point, or on the ground within 1.5 m of it.
  function tapTargets(){const L=[],add=(x,z,reach,stand=null,obj=null)=>L.push({x,z,reach,stand,obj});
    if(inMarket()){add(MARKET.x,MARKET.z+MARKET.door.z,MARKET.door.reach,{x:MARKET.x,z:MARKET.z+MARKET.door.z-MARKET.door.reach*.5});
      add(MARKET.x+MARKET.book.x,MARKET.z+MARKET.book.z,2.4);
      for(const m of marketHorses)add(MARKET.x+m.side*(MARKET.front-.6),MARKET.z+MARKET.stallZ(m.row),2.6,{x:MARKET.x+m.side*(MARKET.front-2.2),z:MARKET.z+MARKET.stallZ(m.row)},m.model.root);
      return L;}
    if(area==='barn'){for(const g of INDOOR_GAMES)add(g.x,g.z,5);return L;}
    if(area!=='outdoor')return L;
    for(const s of SERVICES)add(s.x,s.z,s.id==='hoofhaven'?14:8,s.id==='hoofhaven'?hoofDoor():null,s.id==='hoofhaven'?expansion.hoofhaven:null);
    for(const l of LOCATIONS)add(l.x,l.z,6,l.id==='stable'?{x:0,z:9.7}:null,l.id==='stable'?barn:null);
    for(const s of stations.list)add(s.x,s.z,s.reach);
    add(CAVE.x,CAVE.z,4.2);add(FISHING.x,FISHING.z,FISHING.reach);add(ARENA_POST.x,ARENA_POST.z,4);
    for(const l of LOOKOUTS)add(l.x,l.z,l.reach);for(const h of HOSTS)add(h.x,h.z,3.4);for(const a of ACTIVITIES)if(!a.host)add(a.start.x,a.start.z,4);
    return L;}
  const inside=(o,root)=>{while(o){if(o===root)return true;o=o.parent;}return false;};
  const _ha=new T.Vector3(),_hb=new T.Vector3();
  function hostPick(cx,cy,rect){let best=null,bd=1e9;for(const h of HOSTS){if(Math.hypot(h.x-camera.position.x,h.z-camera.position.z)>40)continue;const y=groundY(h.x,h.z);
      _ha.set(h.x,y+.15,h.z).project(camera);_hb.set(h.x,y+1.9,h.z).project(camera);if(_ha.z>1||_hb.z>1)continue;
      const ax=rect.left+(_ha.x+1)/2*rect.width,ay=rect.top+(1-_ha.y)/2*rect.height,bx=rect.left+(_hb.x+1)/2*rect.width,by=rect.top+(1-_hb.y)/2*rect.height;
      const L=Math.hypot(bx-ax,by-ay)||1,t=Math.max(0,Math.min(1,((cx-ax)*(bx-ax)+(cy-ay)*(by-ay))/(L*L))),d=Math.hypot(cx-ax-(bx-ax)*t,cy-ay-(by-ay)*t),lim=Math.max(46,L*.5);
      if(d<lim&&d/lim<bd){bd=d/lim;best=h;}}return best;}
  function tapTarget(){const L=tapTargets();if(!L.length)return null;
    const grounds=new Set(area==='barn'?[expansion.floor,expansion.marketFloor]:[...lawn.children,cloudstep.mesh]);let hit=null;
    for(const h of groundRay.intersectObjects(area==='barn'?[expansion.interior]:[outdoors,lawn,cloudstep.mesh,...(L.some(t=>t.obj)?[]:[])],true)){if(h.distance>240)break;if(h.object.isSprite||h.object.isPoints)continue;let o=h.object,vis=true;while(o){if(!o.visible){vis=false;break;}o=o.parent;}if(vis){hit=h;break;}}
    if(!hit)return null;const P=hit.point,onGround=grounds.has(hit.object);
    for(const t of L)if(t.obj&&inside(hit.object,t.obj))return t;
    let best=null,bd=Infinity;for(const t of L){const d=Math.hypot(t.x-P.x,t.z-P.z),lim=onGround?1.5:Math.max(Math.min(t.reach,6),2.5);if(d<lim&&d/lim<bd){bd=d/lim;best=t;}}
    return best;}
  function actOn(t){pulseAt(t.stand||t);if(Math.hypot(t.x-position.x,t.z-position.z)<t.reach*.85&&!(t.stand&&Math.hypot(t.stand.x-position.x,t.stand.z-position.z)>t.reach)){interact();return;}
    let s=t.stand;if(!s){const d=Math.hypot(position.x-t.x,position.z-t.z)||1,k=Math.min(t.reach*.6,d)/d;s={x:t.x+(position.x-t.x)*k,z:t.z+(position.z-t.z)*k};}
    if(walkTo(s,true)){doOnArrival=interact;}else tell('Get a little closer, then tap it again.',2.5);}
  // A ring pulses where you tapped (colour + fade, it only grows), and a soft ring breathes under the nearest tappable thing.
  const tapRing=new T.Mesh(geo(new T.RingGeometry(.9,1.15,40)),mat('#ffd36b',{side:T.DoubleSide,depthWrite:false,transparent:true,opacity:0}));tapRing.rotation.x=-Math.PI/2;tapRing.visible=false;scene.add(tapRing);
  const hintRing=new T.Mesh(geo(new T.RingGeometry(.75,.92,40)),mat('#fff4cf',{side:T.DoubleSide,depthWrite:false,transparent:true,opacity:0}));hintRing.rotation.x=-Math.PI/2;hintRing.visible=false;scene.add(hintRing);
  let tapAge=9,hintAt=0,hintT=null;
  function pulseAt(p){tapAge=0;tapRing.position.set(p.x,(area==='outdoor'?groundY(p.x,p.z):0)+.08,p.z);tapRing.visible=true;}
  function tickTapRings(dt){if(tapRing.visible){tapAge+=dt;const k=Math.min(1,tapAge/.6);tapRing.scale.setScalar(1+k*.8);tapRing.material.opacity=.95*(1-k);if(k>=1)tapRing.visible=false;}
    const now=performance.now();if(now-hintAt>300){hintAt=now;hintT=null;if(!mounted?.loaner||true){let bd=12;for(const t of tapTargets()){const p=t.stand||t,d=Math.hypot(p.x-position.x,p.z-position.z);if(d<bd&&d>1.2){bd=d;hintT=p;}}}}
    if(hintT&&!caring&&!irisBusy){hintRing.visible=true;hintRing.position.set(hintT.x,(area==='outdoor'?groundY(hintT.x,hintT.z):0)+.06,hintT.z);hintRing.material.opacity=.35+.25*Math.sin(now/420);}else hintRing.visible=false;}
  function requestWalk(clientX,clientY){
    if(adventureUI?.dialog.open)return;
    closeCompactPanels();const rect=renderer.domElement.getBoundingClientRect();
    tapPoint.set((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1);
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);groundRay.setFromCamera(tapPoint,camera);
    // Tapping another rider or their horse opens their profile (friends.js): username, level, races, the horse they ride.
    {const list=[...peers.values()].filter(p=>p.group.visible),hit=list.length&&groundRay.intersectObjects(list.map(p=>p.group),true)[0];
      if(hit){const inside=root=>{let o=hit.object;while(o){if(o===root)return true;o=o.parent;}return false;},p=list.find(q=>inside(q.group));
        if(p){if(network?.v2)openProfile(p.name,{focus:p.mounted&&!inside(p.person.root)?'horse':'rider'});else tell('That’s '+p.name+(p.mounted?' on their horse':'')+'.',3);return;}}}
    // v110 (Yoshi): while riding, tap your rider to hop down, or the horse's head for a whinny mid-stride.
    if(mounted&&mounted.root.visible){const part=ridePart(clientX,clientY,rect);
      if(part==='rider'){dismount();return;}
      if(part==='head'){if(!mounted.model.whinnying){window.TrottStats?.add('whinnies',1);mounted.model.whinny();sfx('whinny',{vol:.9,rate:voiceRate(mounted.data.size)});tell('🐴 '+mounted.data.name+' whinnies!',2);}return;}}
    // In the barn: tap the big doors to ride out, or tap Hazel to talk.
    if(area==='barn'){const d=groundRay.intersectObjects(expansion.door.meshes,false)[0];
      if(d){if(nearDoor()){openDoors();return;}if(walkTo({x:0,z:12.2})){doOnArrival=openDoors;tell(mounted?'Riding to the big doors.':'Walking to the big doors.',2);}return;}
      const o=groundRay.intersectObject(saddler.root,true)[0];
      if(o){if(nearSaddler()){talkToOtis();return;}if(mounted){tell('Otis: Hop down and come in on foot, the tack room is a squeeze for horses.',4);return;}if(walkTo(TACK_SPOT))doOnArrival=()=>talkToOtis();return;}
      const k=keeper&&groundRay.intersectObject(keeper.root,true)[0];
      if(k){if(nearKeeper()){talkToHazel();return;}if(mounted){tell(NO_HORSES[0],3);return;}if(walkTo({x:COUNTER.x-1.6,z:COUNTER.z}))doOnArrival=()=>talkToHazel();return;}}
    // Tapping a quest giver: talk when close, otherwise go over to them first.
    if(area==='outdoor'&&quests){const g=quests.hit(groundRay)||quests.pick(clientX,clientY,rect);if(g){const d=Math.hypot(g.x-position.x,g.z-position.z),talkNow=()=>quests.talk(g.id,{x:position.x,z:position.z,mounted:!!mounted});if(d<3.4){talkNow();return;}const k=1.9/Math.max(d,.01);if(walkTo({x:g.x+(position.x-g.x)*k,z:g.z+(position.z-g.z)*k})){doOnArrival=talkNow;tell((mounted?'Riding':'Walking')+' over to '+g.name+'.',2);}return;}}
    // v107: farm and town hosts get the same easy screen-space tap as quest givers.
    if(area==='outdoor'){const h=hostPick(clientX,clientY,rect);if(h){actOn({x:h.x,z:h.z,reach:3.4});return;}}
    // Tapping a horse (its saddle, or anywhere on it) mounts it: right away when it is beside you, otherwise you walk over first.
    // Easier tap (2026-11-14): a miss within a fingertip (56 px) of a nearby horse's saddle still counts.
    {const tapped=companions.filter(h=>h!==mounted&&h.root.visible&&h.area===area),horseHit=groundRay.intersectObjects(tapped.map(h=>h.root),true)[0];
      const near=!horseHit&&(()=>{let best=null,bd=56;for(const c of tapped){if(Math.hypot(c.root.position.x-position.x,c.root.position.z-position.z)>26)continue;
        const v=new T.Vector3(0,1.25*(c.root.scale.y||1),0).add(c.root.position).project(camera);if(v.z>1)continue;
        const d=Math.hypot((v.x+1)/2*rect.width+rect.left-clientX,(1-v.y)/2*rect.height+rect.top-clientY);if(d<bd){bd=d;best=c;}}return best;})();
      if(horseHit||near){const h=near||tapped.find(c=>{let o=horseHit.object;while(o){if(o===c.root)return true;o=o.parent;}return false;});
        if(h){if(mounted){tell('Dismount first, then tap '+h.data.name+' to ride.',3);return;}
          if(Math.hypot(h.root.position.x-position.x,h.root.position.z-position.z)<3.6){mount(h);return;}
          const a=Math.atan2(position.x-h.root.position.x,position.z-h.root.position.z),spot=[0,.8,-.8,1.6,-1.6,Math.PI].map(t=>({x:h.root.position.x+Math.sin(a+t)*2,z:h.root.position.z+Math.cos(a+t)*2})).find(p=>!isBlocked(p.x,p.z,.4));
          if(spot&&walkTo(spot)){mountOnArrival=h;tell('Walking over to '+h.data.name+'.',2);}return;}}}
    // v102 (Yoshi: "just tap the person to talk or tap the door to enter"): tapping a thing does its action, walking or
    // riding over first when it is out of reach (doOnArrival → interact(), which acts on whatever is beside you).
    {const t=tapTarget();if(t){actOn(t);return;}}
    const hit=groundRay.intersectObjects(area==='barn'?[expansion.floor,expansion.marketFloor]:[...lawn.children,cloudstep.mesh],false)[0];
    if(!hit){cancelWalk();tell('Tap a patch of ground to walk there.',2.5);return;}
    if(walkTo({x:hit.point.x,z:hit.point.z}))tell(mounted?'Riding to the golden marker.':'Walking to the golden marker.',2);
  }
  // Which part of the horse you ride was tapped: 'rider', 'head' or null. Mesh hit first; then a finger-sized
  // screen-space check (rider torso, horse head) so small on-screen targets are still easy on a phone.
  const _rp=new T.Vector3(),_hp=new T.Vector3();
  function ridePart(cx,cy,rect){const h=mounted,inside=(o,root)=>{while(o){if(o===root)return true;o=o.parent;}return false;};
    const hit=groundRay.intersectObject(h.root,true).find(x=>x.object.visible&&x.object.isMesh);
    if(hit){if(inside(hit.object,h.tack.rider))return 'rider';if(inside(hit.object,h.head))return 'head';}
    const scr=v=>{v.project(camera);return v.z<1?{x:rect.left+(v.x+1)/2*rect.width,y:rect.top+(1-v.y)/2*rect.height}:null;};
    h.anchor.getWorldPosition(_rp);_rp.y+=.75*(h.scale||1);h.head.localToWorld(_hp.set(0,-.25,.38));
    const r=scr(_rp),hd=scr(_hp),dr=r?Math.hypot(r.x-cx,r.y-cy):1e9,dh=hd?Math.hypot(hd.x-cx,hd.y-cy):1e9;
    if(hit&&!inside(hit.object,h.tack.rider)&&!inside(hit.object,h.head))return dh<56?'head':null;
    if(Math.min(dr,dh)>48)return null;return dr<=dh?'rider':'head';}
  // Nine regions: a trip can span 600 m. Short trips plan on the 1 m grid; long ones on a 2 m grid over a box that holds both ends.
  function navOpts(a,b){const half=Math.max(Math.abs(a.x-b.x),Math.abs(a.z-b.z))/2+24,center={x:(a.x+b.x)/2,z:(a.z+b.z)/2};return half<=104?{bounds:104,center}:{bounds:half,center,step:2,maxNodes:90000};}
  // Plans a route to a ground point and starts following it; false if there is no way there.
  function walkTo(goal,quiet=false){const radius=mounted?.76:.4;
    const canWalk=(x,z)=>!isBlocked(x,z,radius)&& (area==='barn'?(inMarket()?Math.abs(x-MARKET.x)<12.6&&z>MARKET.z-20.6&&z<MARKET.z+24.6:Math.abs(x)<18.5&&Math.abs(z)<14.6):groundHeight(x,z)<2.6||wildness(x,z)>0||onCloudstep(x,z));
    const ground=(a,b)=>findGroundPath(a,b,canWalk,area==='barn'?(inMarket()?{bounds:26,center:{x:MARKET.x,z:MARKET.z+2}}:{bounds:19}):navOpts(a,b));
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
    adventureUI.open('Racing needs riding gear',`<p>Riders need the <b>Trail Rider</b> outfit to race: boots, helmet and gloves. It’s yours for good once you buy it.</p><p class="small">You have 🪙 ${coinWords(w.coins)}.</p><button type="button" class="primary full" id="gear-buy">Buy &amp; wear · ${price} 🪙</button><button type="button" class="secondary full" id="gear-later" style="margin-top:10px">Not now</button>`);
    const d=adventureUI.dialog;d.querySelector('#gear-later').onclick=()=>adventureUI.close();
    d.querySelector('#gear-buy').onclick=()=>{const res=buyOutfit(loadWallet(),G.RACE_OUTFIT);if(!res.ok){tell(`You need ${res.short} more Trotties for the Trail Rider outfit. Play a few games and come back!`,6);adventureUI.close();return;}
      saveWallet(res.wallet);paintCounters();const l={...look,outfit:G.RACE_OUTFIT};saveLook(l);applyLook(l);adventureUI.close();tell('Trail Rider outfit on. You’re ready to race!',4);then();};}
  function nearest(){const nearby=companions.filter(h=>Math.hypot(h.root.position.x-position.x,h.root.position.z-position.z)<3.6);return nearby.find(h=>h===called)||nearby.sort((a,b)=>Math.hypot(a.root.position.x-position.x,a.root.position.z-position.z)-Math.hypot(b.root.position.x-position.x,b.root.position.z-position.z))[0];}
  function updateStamps(){const values=mounted?(stamps[mounted.data.id]||[]):[];host.querySelectorAll('[data-stamp]').forEach((el,i)=>{el.classList.toggle('done',values.includes(i));el.textContent=values.includes(i)?'✓':String(i+1);});$('#world-stamps').setAttribute('aria-label',`${values.length} of 5 meadow markers visited`);$('#world-quest-title').textContent=values.length===5?'A lovely loop. A closer friendship.':'Ride the five meadow markers';$('#world-quest-hint').textContent=mounted&&area!=='outdoor'?'Ride out through the big barn doors to the meadow.':mounted?(values.length===5?'Loop complete! Switch companions or explore at your own pace.':`Visit the golden rings with ${mounted.data.name}. ${values.length} of 5 found.`):'Call a companion, then saddle up.';}
  function updateHUD(){const nearby=nearest();$('#world-riding').textContent=mounted?'Riding '+mounted.data.name:'Exploring on foot';setButtonLabel('#world-mount',(caring&&companions[myIndex]?'Ride '+companions[myIndex].data.name:mounted?.loaner?'Back to the stable':mounted?'Dismount '+mounted.data.name:nearby?'Mount '+nearby.data.name:'Call '+called.data.name)+' · E');$('#world-distance').textContent=Math.round(totalDistance)+' m explored';host.querySelectorAll('[data-call-horse]').forEach(el=>el.classList.toggle('active',el.dataset.callHorse===(mounted||called).data.id));hud?.horse((mounted||called).data,!!mounted);
    $('#world-location').textContent=inMarket()?'Hoofhaven Horse Market':area==='barn'?'Inside your barn':nearestPlace&&nearestPlace.distance<12?nearestPlace.name:position.x>-24&&position.x<9&&position.z>-11&&position.z<14?'The stable yard':'Meadow paths';updateStamps();}
  function dismount(){if(skyRide)return false;cancelWalk();if(!mounted)return;/* v98 (Yoshi): no hopping down on a test ride; Back to the stable ends it */if(mounted.loaner){tell('This is a test ride. Tap ↩ Back to the stable when you are done.',3);return false;}if(chair){tell('Stay in the saddle until the platform reaches the station.',3);return false;}const old=mounted;const options=[[2,0],[-2,0],[0,3],[0,-3]];let spot=options.map(([x,z])=>({x:position.x+x,z:position.z+z})).find(p=>!isBlocked(p.x,p.z,.4));if(!spot){tell('Find an open patch before dismounting.');return false;}scene.attach(avatar.root);avatar.root.scale.setScalar(1);position.x=spot.x;position.z=spot.z;avatar.root.position.set(position.x,groundY(position.x,position.z),position.z);avatar.root.rotation.set(0,old.root.rotation.y,0);avatar.root.visible=true;old.tack.rider.visible=false;mounted=null;canter=false;jump=0;jumpVelocity=0;old.name.visible=true;if(old.loaner){endLoan(false);updateHUD();return true;}tell('Back on foot. '+old.data.name+' is right here.');updateHUD();return true;}
  function callHorse(id){cancelWalk();closeCompactPanels();if(area==='barn'&&inStore(position.x,position.z)){tell(SHOPKEEPER.name+': '+NO_HORSES[1],3);return;}if(mounted&&!dismount())return;called=companions.find(h=>h.data.id===id)||called;const offsets=[[2.2,1.4],[-2.2,1.4],[0,-2.8],[0,2.8]];const spot=offsets.map(([x,z])=>({x:position.x+x,z:position.z+z})).find(p=>!isBlocked(p.x,p.z,.8));if(!spot){tell('Step into an open space to call your companion.');return;}whistle();called.area=area;called.root.visible=true;
    // Outdoors the horse starts just out of sight and canters in; indoors (or with no clear way in) it is simply there.
    const from=area==='outdoor'?offCameraStart(called):null;
    if(from){called.root.position.set(from.x,groundY(from.x,from.z),from.z);called.root.rotation.y=Math.atan2(position.x-from.x,position.z-from.z);called.arriving={gait:'trot',t:0,fade:0};horseFade(called,0);tell(called.data.name+' heard you and is on the way!',3);}
    else{called.arriving=null;called.root.position.set(spot.x,groundY(spot.x,spot.z),spot.z);called.root.rotation.y=Math.atan2(position.x-spot.x,position.z-spot.z);{const why=rideBlockMsg(called);tell(why?called.data.name+' is beside you. '+why:called.data.name+' is beside you. Tap '+called.data.name+' to ride.',why?7:undefined);}}
    updateHUD();}
  // A spot 14–30 m away, outside the camera's view (2026-11-16, Yoshi: he must ALWAYS come from off screen, never pop in).
  // Prefer a clear straight line to you; failing that any open off-screen spot (arrive() steers round things).
  function offCameraStart(h){const cx=camera.position.x-position.x,cz=camera.position.z-position.z,base=Math.atan2(cx,cz),v=new T.Vector3();let fallback=null;
    for(const dist of [24,19,30,14])for(let k=0;k<16;k++){const turn=(k%2?-1:1)*Math.ceil(k/2)*.4,a=base+turn,x=position.x+Math.sin(a)*dist,z=position.z+Math.cos(a)*dist;
      if(isBlocked(x,z,.9))continue;v.set(x,groundY(x,z)+2,z).project(camera);if(v.z<1&&Math.abs(v.x)<1.15&&Math.abs(v.y)<1.15)continue;
      let clear=true;for(let j=1;j<dist-2&&clear;j+=1){const t=j/dist;clear=!isBlocked(x+(position.x-x)*t,z+(position.z-z)*t,.8);}if(clear)return {x,z};fallback||={x,z};}
    return fallback;}
  // Fade a horse in (0 → 1) while it trots up, as if from far away. Its meshes get their own material copies once.
  function horseFade(h,f){h.root.traverse(o=>{if(!o.isMesh||!o.material)return;const list=Array.isArray(o.material)?o.material:[o.material];
    if(!o.userData.fadeOwn){o.material=Array.isArray(o.material)?list.map(m=>m.clone()):list[0].clone();o.userData.fadeOwn=list.map(m=>({t:m.transparent,o:m.opacity,dw:m.depthWrite}));}
    (Array.isArray(o.material)?o.material:[o.material]).forEach((m,i)=>{const was=o.userData.fadeOwn[i]||o.userData.fadeOwn[0];const solid=f>=1;
      m.transparent=solid?was.t:true;m.opacity=was.o*Math.min(1,f);m.depthWrite=solid?was.dw:f>.6;m.needsUpdate=m.needsUpdate||solid;});});
    h.name.visible=f>=1&&h.name.visible;}
  // Moves an arriving horse toward you each frame; it keeps coming if you walk away, and fades in as it trots up from off screen, steers round fences, and only after 25 s is it simply beside you.
  // Idle horses outdoors (2026-11-13: Yoshi found several stood inside each other, not moving): each grazes where it
  // was left, now and then strolls a few metres round that spot, and they never stand inside each other or you.
  function idleHorse(h,delta){const r=h.root;h.home=h.home||{x:r.position.x,z:r.position.z};const w=h.wander||(h.wander={wait:1+Math.random()*5,to:null,t:0});
    if(w.to){const dx=w.to.x-r.position.x,dz=w.to.z-r.position.z,d=Math.hypot(dx,dz);w.t+=delta;
      if(d<.25||w.t>9){w.to=null;w.wait=4+Math.random()*10;}
      else{const step=Math.min(d,1.25*delta),nx=r.position.x+dx/d*step,nz=r.position.z+dz/d*step;if(isBlocked(nx,nz,.8)){w.to=null;w.wait=2;}else r.position.set(nx,groundY(nx,nz),nz);
        const turn=Math.atan2(dx,dz)-r.rotation.y;r.rotation.y+=Math.atan2(Math.sin(turn),Math.cos(turn))*Math.min(1,delta*2.5);}}
    else if((w.wait-=delta)<=0){w.wait=3;for(let k=0;k<6;k++){const a=Math.random()*Math.PI*2,dd=1.5+Math.random()*3.5,x=h.home.x+Math.sin(a)*dd,z=h.home.z+Math.cos(a)*dd;
      if(Math.hypot(x-r.position.x,z-r.position.z)>1.2&&!isBlocked(x,z,.9)&&Math.hypot(x-position.x,z-position.z)>2.6){w.to={x,z};w.t=0;break;}}}
    return w.to?'walk':'stand';}
  function spreadHorses(delta){const out=companions.filter(h=>h.area==='outdoor'&&area==='outdoor'&&h.root.visible);
    for(let a=0;a<out.length;a++)for(let b=a+1;b<out.length;b++){const A=out[a],B=out[b],pa=A.root.position,pb=B.root.position;let dx=pb.x-pa.x,dz=pb.z-pa.z,d=Math.hypot(dx,dz);
      const need=2.7*Math.max(A.scale||1,B.scale||1);if(d>=need)continue;if(d<.01){const k=a*7+b;dx=Math.sin(k);dz=Math.cos(k);d=1;}
      const free=[A,B].filter(h=>h!==mounted&&!h.arriving);if(!free.length)continue;const push=(need-Math.min(need,d))*Math.min(1,delta*3)/free.length;
      for(const h of free){const sg=h===A?-1:1,p=h.root.position,nx=p.x+dx/d*push*sg,nz=p.z+dz/d*push*sg;if(!isBlocked(nx,nz,.8)){p.set(nx,groundY(nx,nz),nz);if(h.home){h.home.x+=dx/d*push*sg;h.home.z+=dz/d*push*sg;}}}}
    // …and they step aside from you on foot.
    if(!mounted)for(const h of out){if(h.arriving)continue;const p=h.root.position,dx=p.x-position.x,dz=p.z-position.z,d=Math.hypot(dx,dz)||1,need=1.6*(h.scale||1);if(d>=need)continue;
      const push=(need-d)*Math.min(1,delta*3),nx=p.x+dx/d*push,nz=p.z+dz/d*push;if(!isBlocked(nx,nz,.8))p.set(nx,groundY(nx,nz),nz);}}
  function arrive(h,delta){const dx=position.x-h.root.position.x,dz=position.z-h.root.position.z,d=Math.hypot(dx,dz);h.arriving.t+=delta;
    if(h.arriving.fade!=null){h.arriving.fade=Math.min(1,h.arriving.fade+delta/1.8);horseFade(h,h.arriving.fade);if(h.arriving.fade>=1)h.arriving.fade=null;}
    if(h.area!==area||mounted===h){if(h.arriving.fade!=null)horseFade(h,1);h.arriving=null;return;}
    if(d<2.6||h.arriving.t>25){if(h.arriving.fade!=null)horseFade(h,1);h.arriving=null;if(d>=2.6){const a=Math.atan2(dx,dz);h.root.position.set(position.x-Math.sin(a)*2.4,0,position.z-Math.cos(a)*2.4);h.root.position.y=groundY(h.root.position.x,h.root.position.z);}const tv=h.data.loaner?null:addTrust(h.data.id,G.TRUST_GAINS.whistle,'whistle');{const why=rideBlockMsg(h);tell(h.data.name+' came to your whistle'+(tv!=null?' · Trust '+tv:'')+'. '+(why||'Tap '+h.data.name+' to ride.'),why?7:3);}return;}
    h.arriving.gait=d>7?'trot':'walk';const speed=d>7?6:2.4,step=Math.min(d-2.4,speed*delta);
    // Straight at you if it can; otherwise the first clear heading that still closes in (no walking through fences).
    let ux=dx/d,uz=dz/d;for(const turn of [0,.5,-.5,1,-1,1.4,-1.4]){const c=Math.cos(turn),sn=Math.sin(turn),tx=ux*c-uz*sn,tz=ux*sn+uz*c;
      if(!isBlocked(h.root.position.x+tx*Math.max(.9,step),h.root.position.z+tz*Math.max(.9,step),.7)){ux=tx;uz=tz;break;}}
    const nx=h.root.position.x+ux*step,nz=h.root.position.z+uz*step;
    h.root.position.set(nx,groundY(nx,nz),nz);const turn=Math.atan2(ux,uz)-h.root.rotation.y;h.root.rotation.y+=Math.atan2(Math.sin(turn),Math.cos(turn))*Math.min(1,delta*6);}
  // A two-note rider's whistle, made on the fly (no sound file).
  let audio=null;
  function whistle(){window.TrottStats?.add('whistles',1);try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();audio.resume?.();const t0=audio.currentTime;
    for(const [start,f0,f1,len] of [[0,1500,2300,.22],[.3,1700,2700,.38]]){const o=audio.createOscillator(),g=audio.createGain(),lfo=audio.createOscillator(),lg=audio.createGain();
      o.type='sine';o.frequency.setValueAtTime(f0,t0+start);o.frequency.exponentialRampToValueAtTime(f1,t0+start+len*.6);o.frequency.exponentialRampToValueAtTime(f1*.94,t0+start+len);
      lfo.frequency.value=22;lg.gain.value=28;lfo.connect(lg).connect(o.frequency);
      g.gain.setValueAtTime(0,t0+start);g.gain.linearRampToValueAtTime(.18,t0+start+.03);g.gain.setValueAtTime(.18,t0+start+len-.07);g.gain.linearRampToValueAtTime(0,t0+start+len);
      o.connect(g).connect(audio.destination);o.start(t0+start);lfo.start(t0+start);o.stop(t0+start+len+.02);lfo.stop(t0+start+len+.02);}}catch{}}
  // Why this horse can't be ridden yet ('' = it can). Tack comes first, then taming.
  function rideBlockMsg(target){if(target.loaner)return null;const live=RanchUI.horse(target.data.id);if(live)target.data={...target.data,...live};const block=G.rideBlock(target.data);
    if(block==='foal'){const left=G.RIDE_AT-G.ageMonths(target.data);return `${target.data.name} is a foal: too young to ride until 2 years old (${left} ${left===1?'day':'days'} to go).`;}
    if(block==='untamed')return `${target.data.name} isn’t tamed yet. Taming ${G.tamePct(target.data)}%: pet, brush and feed them in the stall, or work with them in the Taming Corral.`;
    if(block==='tack'){const miss=G.missingTack(target.data).map(G.pieceName);return `${target.data.name} needs tack before riding: ${miss.join(', ').replace(/, ([^,]*)$/,' and $1')}. Buy the 🎒 Starter Kit (all three) from Otis at the Tack Room counter in the barn.`;}
    return '';}
  function mount(chosen){if(skyRide){tell('Not up here! Tap “Fly home” to land first.',3);return;}if(caring&&!chosen){const me=companions[myIndex],msg=me&&rideBlockMsg(me);if(msg){tell(msg,7);return;}leaveCare({ride:true});return;}cancelWalk();closeCompactPanels();if(chair){tell(mounted?'Stay in the saddle until the platform reaches the station.':'Sit tight! The chair lets you off at the station.',3);return;}if(mounted){if(mounted.loaner){backToStall();return;}dismount();return;}const target=chosen||nearest();if(!target){callHorse(called.data.id);return;}
    // Tack comes first (Otis's counter in the barn's tack room), then taming.
    {const msg=rideBlockMsg(target);if(msg){tell(msg,7);return;}}
    ride=startRide(target.data);sfx('saddle');sfx('nicker',{delay:.6,rate:voiceRate(target.data.size)});mounted=target;called=target;target.arriving=null;horseFade(target,1);/* v150: mounting mid fade-in left the horse see-through */position.x=target.root.position.x;position.z=target.root.position.z;target.anchor.add(avatar.root);avatar.root.position.set(0,-.70,0);avatar.root.rotation.set(0,0,0);target.name.visible=false;avatar.root.visible=false;target.tack.rider.visible=true;target.area=area;jump=0;jumpVelocity=0;{const got=(stamps[target.data.id]||[]).length;tell(area!=='outdoor'?'You & '+target.data.name+'. Ride out through the big barn doors!':got<5?'You & '+target.data.name+'. Find the golden meadow rings! ('+got+' of 5)':'You & '+target.data.name+'. Happy riding!',5);};updateHUD();view.focus({preventScroll:true});}
  function doJump(){if(chair)return;if(jump<=.001){if(mounted&&!mounted.loaner)window.TrottStats?.add('jumps',1);sfx('whoosh',{vol:mounted?1:.6});jumpVelocity=mounted?5.7:4.4;mounted?.model.jump();tell(mounted?called.data.name+' takes a little leap!':'A little hop!',1.4);}}
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
  on(renderer.domElement,'webglcontextlost',event=>{event.preventDefault();clearInput();tell('Graphics paused. Reload the page to keep playing.',30);});
  function resize(){const width=view.clientWidth,height=view.clientHeight;renderer.setSize(width,height,false);camera.aspect=width/Math.max(1,height);camera.updateProjectionMatrix();motes?.resize(height*Math.min(window.devicePixelRatio||1,1.5));}
  const observer=new ResizeObserver(resize);observer.observe(view);resize();
  function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  let fogB=null,fogSrc=null,fogDirty=false,fogSaved=0;
  // The map asks for the fog as it opens, so cells marked since the last save show at once.
  const mapFog=()=>{if(fogB&&fogDirty){fogDirty=false;fogSaved=performance.now();adventure.fog=fogSrc=fogString(fogB);saveAdventure();}return adventure.fog;};
  // Dev panel test tools (test-friends.js, owner only): reset the map clouds to just where you stand, reveal them all,
  // or put back what was there. Returns the old fog + regions for Undo. Places you have found are kept.
  // v139 owner test tools: put a legend right in front of you (test-friends.js "Legends (test)").
  globalThis.__trottDevLegend=kind=>{if(area!=='outdoor')return 'Go out into the valley first, then try again.';
    const a=(mounted?mounted.root:avatar.root).rotation.y,at=d=>[position.x+Math.sin(a)*d,position.z+Math.cos(a)*d];
    if(kind==='unicorn'){legendsWorld.debugSpawn('unicorn',...at(mounted?32:14));return mounted?'Unicorn placed 32 m ahead. Hop off and walk up to it.':'Unicorn placed 14 m ahead. Walk up and press Interact.';}
    if(kind==='pegasus'){legendsWorld.debugSpawn('pegasus',...at(mounted?24:8));return mounted?'Pegasus landed 24 m ahead. Hop off and walk up to it.':'Pegasus landed 8 m ahead. Walk up and press Interact.';}
    if(kind==='moon'){if(legendsWorld.moonCaught())return 'The moon pegasus is already caught on this device (once ever).';
      legendsWorld.devMoonReset();
      setArea('outdoor');moveTo(TOWN2.x,TOWN2.z+8);yaw=0;pitch=.3;moonAsked=false;return 'Midnight in Thimbleford square. Look up at the clock tower.';}
    if(kind==='treats'){legendsWorld.devTreats();return '+1 rainbow carrot, +1 Moon Carrot, +1 mint, +1 zucchini.';}
    return '';};
  globalThis.__trottDevFog=(kind,prev)=>{const before={fog:adventure.fog,regions:[...adventure.regions]};
    if(kind==='restore'&&prev){adventure.fog=prev.fog;adventure.regions=[...prev.regions];}
    else if(kind==='reveal'){const b=fogBits('');b.fill(255);adventure.fog=fogString(b);adventure.regions=REGIONS.map(r=>r.id);}
    else if(kind==='reset'){const b=fogBits('');fogMark(b,position.x,position.z);adventure.fog=fogString(b);adventure.regions=[...new Set(['c',regionAt(position.x,position.z).id])];try{localStorage.setItem('horselandia-map-fog-shown',adventure.fog);}catch{}}
    fogB=null;fogSrc=null;fogDirty=false;saveAdventure();if(worldMap?.isOpen){worldMap.close();worldMap.open();}return before;};
  function saveAdventure(){try{localStorage.setItem(adventureKey,JSON.stringify(adventure));}catch{tell('Your adventure will last for this visit; device storage is unavailable.');}network?.saveProgress(adventure);}
  function moveTo(x,z){cancelWalk();position.x=x;position.z=z;jump=0;jumpVelocity=0;const actor=mounted?mounted.root:avatar.root;actor.position.set(x,groundY(x,z),z);cameraTarget.set(x,groundY(x,z)+(mounted?3.1:1.45),z);network?.teleported();}
  function setArea(next){cancelWalk();if(next!=='barn'&&caring)leaveCare();if(next!=='outdoor'&&loaner)endLoan(true);if(next!==area){companions.forEach((h,i)=>{if(next==='barn'){h.outdoorPose={x:h.root.position.x,y:h.root.position.y,z:h.root.position.z,yaw:h.root.rotation.y};h.area='barn';if(h!==mounted)standHome(h,i);}else{h.area='outdoor';if(h!==mounted&&h.outdoorPose){const p=h.outdoorPose;h.root.position.set(p.x,p.y,p.z);h.root.rotation.y=p.yaw;}}});}if(next==='barn')expansion.door.shut();area=next;outdoors.visible=area==='outdoor';expansion.interior.visible=area==='barn';if(mounted)mounted.area=area;scene.background.set(area==='barn'?'#e8d9bc':'#c8e6e5');scene.fog.color.copy(scene.background);host.dataset.area=area;climb=null;localRace=null;}
  // The world opens inside the barn, standing in your horse's stall beside them (like the home page), not out in the yard.
  function startInStall(){setArea('barn');const h=companions[myIndex];yaw=-1.2;pitch=.4;moveTo(-8.4,-8.6);
    startNote=h?(rideBlockMsg(h)?`You’re in ${h.data.name}’s stall. ${rideBlockMsg(h)}`:`You’re in ${h.data.name}’s stall. Tap ${h.data.name} to ride, then tap the big doors at the end of the hall.`):'';}
  let startNote='';
  // v93: cartoon iris wipe between the barn and the valley. A black circle closes on you, the area swaps while it is
  // black, and once the new view has drawn (two frames, not a timer) a small circle opens out from you again.
  const irisEl=document.createElement('div');irisEl.className='world-iris';irisEl.hidden=true;view.appendChild(irisEl);let irisBusy=false,irisNext=null,irisKind='circle';const _ir=new T.Vector3();
  function irisSet(r){const w=view.clientWidth,h=view.clientHeight;(avatar.root.visible?avatar.root:companions[myIndex]?.root||avatar.root).getWorldPosition(_ir);_ir.y+=1.1;_ir.project(camera);
    const on=Math.abs(_ir.x)<.8&&Math.abs(_ir.y)<.8&&_ir.z<1,x=on?(_ir.x+1)/2*w:w/2,y=on?(1-_ir.y)/2*h:h*.55;/* off screen (camera not settled yet): the middle */irisEl.style.background=irisKind==='fade'?`rgba(250,238,212,${Math.max(0,Math.min(1,1-r/Math.hypot(w,h)))})`:`radial-gradient(circle at ${x}px ${y}px,transparent ${r}px,#000 ${r+1.5}px)`;}
  function irisRun(from,to,ms,done){const t0=performance.now(),step=now=>{const k=Math.min(1,(now-t0)/ms),e=k*k*(3-2*k);irisSet(from+(to-from)*e);if(k<1)requestAnimationFrame(step);else done();};requestAnimationFrame(step);}
  /* v98 (Yoshi: 'transition is always black circle'): the black circle is kept for the barn doors only; the market and
     test rides use a short warm fade. fn may return a promise (e.g. the market horses loading): the reveal waits for it. */
  function iris(fn,kind='circle'){if(reducedMotion||!view.clientWidth){fn();return;}if(irisBusy){irisNext=[fn,kind];return;}/* a tap mid-wipe waits its turn */irisBusy=true;irisKind=kind;cancelWalk();keys.clear();const R=Math.hypot(view.clientWidth,view.clientHeight);irisEl.hidden=false;
    irisRun(R,0,kind==='fade'?380:520,()=>{irisEl.style.background=kind==='fade'?'rgb(250,238,212)':'#000';/* v96: an error inside fn must never leave the screen black and every door dead */let ret;try{ret=fn();}catch(err){console.error('iris step',err);}
      Promise.resolve(ret).catch(()=>{}).then(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>irisRun(0,R,kind==='fade'?480:700,()=>{irisEl.hidden=true;irisBusy=false;if(irisNext){const [f,k]=irisNext;irisNext=null;iris(f,k);}}))));});}
  function leaveBarn(){iris(()=>{setArea('outdoor');yaw=.6;pitch=.3;moveTo(-12,4.5);tell('Out into the valley. The barn is right behind you.',4);});}
  function enterBarn(){sfx('doorOpen',{vol:.8});iris(()=>{markVisit(LOCATIONS[0]);setArea('barn');sfx('doorClose',{delay:.15});yaw=0;pitch=.28;moveTo(0,12.4);tell('Welcome inside. Stalls on the left, the tack room and Hazel’s shop on the right.',5);});}
  // v95 Hoofhaven Horse Market: walk in through the doors (iris) to one huge room of 20 stalls. Each horse stands
  // with its head over its half door; walk up and press F for its card (free test ride for anyone, keep it when signed
  // in). The book by the entrance is the old list. A test ride borrows the horse as a loaner companion outside the
  // doors; hopping down (or going indoors) sends it back. Loaners never earn trust or stamps.
  let marketHorses=[],marketKey='',loaner=null,loanStall=null,keepOffer=null;const loanBtn=v=>{const b=$('#world-loan');if(b)b.hidden=!v;};const hoof=SERVICES.find(s=>s.id==='hoofhaven');
  const hoofOut=()=>({x:hoof.x,z:hoof.z-9.6});const hoofDoor=()=>({x:hoof.x,z:hoof.z-8.4});
  const nearMarketDoor=()=>inMarket()&&position.z>MARKET.z+MARKET.door.z-MARKET.door.reach&&Math.abs(position.x-MARKET.x)<4.5;
  const nearMarketBook=()=>inMarket()&&Math.hypot(position.x-MARKET.x-MARKET.book.x,position.z-MARKET.z-MARKET.book.z)<2.4;
  function nearStallHorse(){if(!inMarket())return null;let best=null,bd=2.6;for(const m of marketHorses){const d=Math.hypot(position.x-(MARKET.x+m.side*(MARKET.front-.6)),position.z-(MARKET.z+MARKET.stallZ(m.row)));if(d<bd){bd=d;best=m;}}return best;}
  function fillMarket(){return import('./ranch-ui.js?v=157').then(m=>{if(disposed)return;const r=m.get(),{shelf}=marketStock(dayNumber(),r?.bought||[]),key=dayNumber()+':'+shelf.map(l=>l.id).join(',');if(key===marketKey)return;marketKey=key;
      for(const h of marketHorses){h.model.root.parent?.remove(h.model.root);h.model.dispose?.();}marketHorses=[];
      for(let i=0;i<20;i++){const l=shelf[i],side=i<10?-1:1,row=i%10;expansion.setPlate(i,l?l.name:'');if(!l)continue;
        const model=makeSculptedHorse(T,{id:l.id,name:l.name,breedId:l.breedId,coat:l.coat,size:l.size},{geometry:geo});model.setGait?.('stand');
        model.root.position.set(MARKET.x+side*(MARKET.front+2.3),0,MARKET.z+MARKET.stallZ(row));model.root.rotation.y=side<0?Math.PI/2:-Math.PI/2;expansion.interior.add(model.root);
        marketHorses.push({model,listing:l,side,row});}}).catch(err=>console.warn('market horses',err));}
  function enterMarket(){if(mounted?.loaner){backToStall();return;}if(mounted){tell('Hop down first: horses stay outside the market. Your horse will wait here.',5);return;}
    iris(()=>{setArea('barn');yaw=0;pitch=.22;moveTo(MARKET.x,MARKET.z+18);tell('Welcome to Hoofhaven! Walk up to any horse: test rides are free.',6);return fillMarket();},'fade');}
  function leaveMarket(){iris(()=>{setArea('outdoor');yaw=0;pitch=.3;const o=hoofOut();moveTo(o.x,o.z);tell('Back in the valley, outside Hoofhaven.',3);},'fade');}
  function openStall(st){if(st.listing.id===keepOffer)keepOffer=null;import('./ranch-ui.js?v=157').then(m=>{clearInput();m.openListing(st.listing.id);}).catch(()=>tell('The market is closed right now. Try again in a moment.'));}
  function startTestRide(id){const st=marketHorses.find(m=>m.listing.id===id);if(!st||loaner)return;const l=st.listing;
    iris(()=>{setArea('outdoor');const o=hoofOut();yaw=0;pitch=.3;moveTo(o.x,o.z);/* v102: the doors face the path (-z) now */
      const h=makeHorse({id:'loan-'+l.id,name:l.name,breedId:l.breedId,coat:l.coat,months:l.months,size:l.size},companions.length);h.loaner=true;h.tack.saddleGroup.visible=true;
      place(h.root,o.x+1.6,o.z);h.root.rotation.y=Math.PI;companions.push(h);loaner=h;loanStall={side:st.side,row:st.row,name:l.name,id:l.id};loanBtn(true);mount(h);
      loanLeft=60;loanShown='';tell(`One-minute test ride on ${l.name}! Tap ↩ Back to the stable any time.`,6);},'fade');}
  function endLoan(forced){const h=loaner;if(!h)return;loaner=null;loanBtn(false);
    if(mounted===h){scene.attach(avatar.root);avatar.root.scale.setScalar(1);avatar.root.position.set(position.x,groundY(position.x,position.z),position.z);avatar.root.visible=true;h.tack.rider.visible=false;mounted=null;canter=false;jump=0;jumpVelocity=0;}
    const i=companions.indexOf(h);if(i>=0)companions.splice(i,1);if(called===h)called=companions[myIndex]||companions[0];
    h.root.parent?.remove(h.root);h.name.parent?.remove(h.name);h.model.dispose?.();
    if(!forced)tell(`${h.data.name} trots back to Hoofhaven. To keep ${h.data.name}, visit the market (sign in to adopt).`,6);}
  // v96 (Yoshi): a button during a test ride takes you straight back to that horse's stall in the hall.
  function backToStall(timeUp=false){const st=loanStall;if(!loaner||!st)return;cancelWalk();loanLeft=null;
    iris(()=>{setArea('barn');/* setArea ends the loan */yaw=st.side<0?Math.PI/2+.7:-Math.PI/2-.7;pitch=.3;/* looks along the aisle so the far row never blocks the camera */moveTo(MARKET.x+st.side*(MARKET.front-2.2),MARKET.z+MARKET.stallZ(st.row));
      keepOffer=st.id;tell(`${timeUp?'Test ride over! ':''}${st.name} is back in the stall. Want to keep ${st.name}? ${touchy?'Tap':'Click'} “Keep ${st.name}?”${touchy?'':' or press F'}.`,7);return fillMarket();},'fade');}
  // v98 (Yoshi): a test ride lasts 1 minute of riding, then you are brought back. The clock runs in the frame loop only
  // while you sit on the loaner and no wipe is showing, so it starts once the ride view is up and pauses with the app.
  let loanLeft=null,loanShown='',loanAt=0;function tickLoan(){const now=performance.now(),gap=(now-loanAt)/1000;loanAt=now;if(loanLeft===null||!loaner||mounted!==loaner||irisBusy)return;
    /* real seconds, so slow phones still get one minute; a gap over 1 s means the app was in the background: paused */loanLeft=Math.max(0,loanLeft-(gap>1?0:gap));
    const sec=Math.ceil(loanLeft),txt=`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;if(txt!==loanShown){loanShown=txt;const b=$('#world-loan');if(b){b.querySelector('b').textContent=txt;b.classList.toggle('is-ending',sec<=10);}}
    if(loanLeft<=0)backToStall(true);}
  const onTestRide=e=>startTestRide(e.detail);window.addEventListener('ranch:testride',onTestRide);
  // The big doors: they swing open (on the animation's own end, not a timer) and then you're out in the valley.
  function openDoors(){if(area!=='barn'||expansion.door.opening)return;cancelWalk();sfx('barnSlide');expansion.door.open(()=>{if(area==='barn')leaveBarn();});tell('The big doors swing open…',2);}
  const nearDoor=()=>Math.hypot(position.x-DOOR.x,position.z-(DOOR.z-1))<DOOR.reach;
  const nearSaddler=()=>area==='barn'&&Math.hypot(position.x-TACK_SPOT.x,position.z-TACK_SPOT.z)<3;
  const nearKeeper=()=>inStore(position.x,position.z)&&Math.hypot(position.x-COUNTER.x,position.z-COUNTER.z)<4.2;
  const indoorList=()=>mounted?[...expansion.indoorObstacles,expansion.shopGate]:expansion.indoorObstacles;
  // Hazel's shop: talk at the counter. Lines from shop-talk.mjs; visits remembered on this device.
  const HAZEL_KEY='trottville-hazel';let hazel={visits:0,tip:0,chat:0};try{hazel={...hazel,...JSON.parse(localStorage.getItem(HAZEL_KEY))};}catch{}
  const saveHazel=()=>{try{localStorage.setItem(HAZEL_KEY,JSON.stringify(hazel));}catch{}};
  // Otis sells tack: pick a horse, then the tack sheet (ranch-ui openTack) shows the Starter Kit (note #43) and, once you own one, the upgrades.
  const OTIS_HI=['Mornin’! Every horse needs a saddle and a bridle that fit. Who are we kitting out?','Saddles, bridles, shoes. If it buckles, I sell it. Which horse?','Ah, a customer! Tell me which horse and I’ll fetch their size.'];
  function talkToOtis(){const herd=(RanchUI.get()?.herd||[]).filter(h=>!h.retired);sfx('pop');npcVoice('man','greet',{rate:.94});
    const rows=herd.map(h=>{const miss=G.missingTack(h);return `<button type="button" class="${miss.length?'primary':'secondary'} full" data-otis="${escapeHTML(h.id)}" style="margin-top:10px">${escapeHTML(h.name)}${miss.length?` · needs ${escapeHTML(miss.map(G.pieceName).join(', '))}`:' · all tacked up'}</button>`;}).join('');
    adventureUI.open('Otis · Tack Room',`<div class="hazel-talk"><span class="hazel-face" aria-hidden="true">🐴</span><p class="hazel-line">${escapeHTML(OTIS_HI[Math.floor(Math.random()*OTIS_HI.length)])}</p></div>${rows||'<p>No horses to fit yet.</p>'}<button type="button" class="secondary full" id="otis-packs" style="margin-top:10px">🎴 Tack Packs · collect horse gear</button><button type="button" class="text-button" id="otis-bye" style="margin-top:10px">Bye, Otis!</button>`);
    const d=adventureUI.dialog;d.querySelectorAll('[data-otis]').forEach(b=>b.onclick=()=>{adventureUI.close();RanchUI.openTack(b.dataset.otis);});d.querySelector('#otis-packs').onclick=()=>TP.open('packs');d.querySelector('#otis-bye').onclick=()=>adventureUI.close();}
  function talkToHazel(line){const w=loadWallet();npcVoice('woman',line?'happy':'greet');
    if(!line)line=shopGreeting({hours:sky.hours,weather:sky.kind,visits:hazel.visits+1,outfit:outfitOf(look).name});
    adventureUI.open(SHOPKEEPER.shop,`<div class="hazel-talk"><span class="hazel-face" aria-hidden="true">🧵</span><p class="hazel-line">${escapeHTML(line)}</p></div>
      <p class="small">You have 🪙 ${coinWords(w.coins)}</p>
      <button type="button" class="primary full" id="hz-shop">Show me the outfits</button>
      <button type="button" class="${hasPoncho?'secondary':'primary'} full" id="hz-poncho" style="margin-top:10px"${hasPoncho?' disabled':''}>${hasPoncho?'✓ You own a Rain Poncho':`Rain Poncho · ${PONCHO.price} 🪙`}</button>
      <button type="button" class="secondary full" id="hz-buy" style="margin-top:10px">What should I buy?</button>
      <button type="button" class="secondary full" id="hz-tip" style="margin-top:10px">Any riding tips?</button>
      <button type="button" class="secondary full" id="hz-chat" style="margin-top:10px">How’s business?</button>
      <button type="button" class="text-button" id="hz-bye" style="margin-top:10px">Bye, ${SHOPKEEPER.name}!</button>`);
    const d=adventureUI.dialog;
    // Kit first (note #43 A): until you own a Starter Kit, Hazel sends you to Otis before selling clothes.
    const kitFirst=()=>{if(RanchUI.kitDone?.())return false;talkToHazel('Before clothes, your horse needs tack! Otis sells a 🎒 Starter Kit in the Tack Room next door: saddle, bridle and horseshoes. Come back after!');return true;};
    d.querySelector('#hz-shop').onclick=()=>{if(kitFirst())return;adventureUI.close();$('#world-style')?.click();};
    d.querySelector('#hz-poncho').onclick=()=>{if(!hasPoncho&&!kitFirst())buyPoncho();};
    d.querySelector('#hz-buy').onclick=()=>talkToHazel(shopPitch({coins:loadWallet().coins,owned:loadWallet().owned,outfits:OUTFITS}));
    d.querySelector('#hz-tip').onclick=()=>{const t=shopTip(hazel.tip++);saveHazel();talkToHazel(t);};
    d.querySelector('#hz-chat').onclick=()=>{const t=shopChatter(hazel.chat++);saveHazel();talkToHazel(t);};
    d.querySelector('#hz-bye').onclick=()=>adventureUI.close();}
  let wasInShop=false,lastNoHorse=0;
  // v132 ambience inputs for world-sky: how deep in the woods you are (Mosswood Grove round Glowmoss Hollow, or the wild
  // Whispering Pines biome), and where Silver Ribbon Falls roars.
  const SILVER_FALLS={x:215,z:-235.7},GROVE=LOCATIONS.find(l=>l.id==='forest')||{x:185,z:-165};
  const forestAt=(x,z,b)=>b==='forest'?1:Math.max(0,Math.min(1,(95-Math.hypot(x-GROVE.x,z-GROVE.z))/20));
  // Rain gear (v71). hasPoncho is cached: the wallet is only read again after a purchase.
  const isRaining=()=>area==='outdoor'&&(sky.kind==='rain'||sky.kind==='storm');
  const PONCHO=GEAR_ITEMS.find(g=>g.id==='poncho');let hasPoncho=loadWallet().owned.includes('poncho');
  function buyPoncho(){const w=loadWallet(),r=buyGear(w,'poncho');
    if(!r.ok){sfx('pop');talkToHazel(`A poncho is ${PONCHO.price} Trotties, love. You’re ${r.short} short. Come back after a quest or two.`);return;}
    saveWallet(r.wallet);hasPoncho=true;paintCounters();sfx('coin');
    talkToHazel('There you go! It’s yours. It goes on by itself whenever it rains, and the hood folds down so your helmet still fits.');}
  // Trust: riding together builds it, jumping across the map spends it. Starts from each horse's steeplechase Trust.
  // Kept on this device beside the adventure save (not in the shared cloud progress).
  // v124: one trust curve for every horse (riding.mjs addTrustAt: slow start, ~80 after a week, free horse tops at 99).
  const trustKey=adventureKey+':trust';
  const trustHorse=id=>(mounted?.data?.id===id?mounted.data:null)||RanchUI.get()?.herd?.find(h=>h.id===id)||companions.find(c=>c.data.id===id)?.data||null;
  const trustOf=id=>G.trustAt(trustKey,id);
  function addTrust(id,n,source=null){return G.addTrustAt(trustKey,id,n,{cap:G.trustCap(trustHorse(id)),source});}
  function bestTrust(){const herd=RanchUI.get()?.herd||companions.map(c=>c.data);let best=null;for(const h of herd){if(h.loaner)continue;const t=trustOf(h.id);if(!best||t>best.t)best={t,name:h.name,free:!!h.free};}return best;}
  // Every 60 m ridden together: +1 trust.
  function rodeFor(distance){if(mounted?.loaner)return;rideMeters+=distance;if(rideMeters<60)return;rideMeters-=60;window.TrottStats?.add('rideMeters',60);if(skyNight>.6)window.TrottStats?.add('nightMeters',60);const h=mounted.data,was=trustOf(h.id),v=addTrust(h.id,G.TRUST_GAINS.ride);if(!walkGoal&&v>was)tell(h.name+' trusts you a little more · Trust '+v,2.5);}
  function mapSpot(place){const wanted=place.id==='stable'?{x:0,z:9.7}:place,offsets=[...(place.kind==='skygate'?[[0,4],[3,3],[-3,3]]:[]),[0,7],[7,0],[-7,0],[0,-7],[6,6],[-6,6],[0,4],[0,0]];return offsets.map(([dx,dz])=>({x:wanted.x+dx,z:wanted.z+dz})).find(p=>!isBlocked(p.x,p.z,mounted?.8:.4))||null;}
  function mapInfo(place){const h=(mounted||called).data,summit=place.id==='summit';
    // v134 (Yoshi 2026-11-15): no trust loss, just waits. 5 jumps a day, then one jump every 20 minutes.
    const p=loadPasses(),left=G.passesLeft(p),wait=G.jumpWait(p),mins=Math.max(1,Math.ceil(wait/60000));
    return {ride:mounted?(summit?'Ride to the trailhead':'Ride there'):(summit?'Walk to the trailhead':'Walk there'),jump:wait?null:(summit?'Jump to trailhead':'Jump there')+(left?` · ${left} left today`:' · then wait 20 min'),
      trust:(mounted?`Riding there together earns trust with ${h.name} (now ${trustOf(h.id)}).`:`Ride a horse there to earn trust.`)+(left?` You have ${left} free ${left===1?'jump':'jumps'} left today. After that, one jump every 20 minutes.`:wait?` Next jump in ${mins} min. Riding there is always free.`:` Free jumps are used up today: you can jump now, then wait 20 minutes for the next.`)};}
  function rideTo(id){let place=LOCATIONS.find(l=>l.id===id);if(place.id==='summit')place=LOCATIONS.find(l=>l.id==='mountain');
    if(area==='barn'){setArea('outdoor');moveTo(-13,3);}
    const spot=mapSpot(place);tracked=place.id;
    if(!spot||!walkTo(spot,true)){tell('No way through from here. Try another spot, or jump there.',4);return;}
    mapTrip={place,horse:mounted?.data.id||null};
    tell(mounted?'Riding to '+place.name+' with '+mounted.data.name+'. Trust grows on the way.':'Walking to '+place.name+'. Ride a horse to earn trust on the way.',4);}
  // v107: the quest card's “Ride to Tilly”: go right up to the person (or spot), then talk to them when you get there.
  function goToQuest(t){if(area!=='outdoor'){if(area==='barn'){setArea('outdoor');moveTo(-13,3);}else return;}
    const spot=[[0,2],[2,0],[-2,0],[0,-2],[1.6,1.6],[-1.6,1.6],[1.6,-1.6],[-1.6,-1.6],[0,4],[4,0],[-4,0]].map(([dx,dz])=>({x:t.x+dx,z:t.z+dz})).find(p=>!isBlocked(p.x,p.z,mounted?.8:.4));
    if(!spot||!walkTo(spot,true)){tell('No way through from here. Open the map to jump or pick another way.',4);return;}
    doOnArrival=()=>{const g=quests?.near(position.x,position.z);if(g)quests.talk(g.id,{x:position.x,z:position.z,mounted:!!mounted});};
    tell((mounted?'Riding':'Walking')+' to '+(t.label||'the spot')+'.',3);}
  function arrived(trip){if(!trip){tell('Here we are. Tap another spot to keep exploring.',2);return;}
    if(trip.horse&&mounted?.data.id===trip.horse){const v=addTrust(trip.horse,2);queueCoins({from:'Ride to '+trip.place.name,coins:5,lines:['Rode to '+trip.place.name+' · 5 🪙']});arriveAt(trip.place,'You made it to '+trip.place.name+' together! +2 trust with '+mounted.data.name+' · Trust '+v+' · 5 🪙 to collect');}
    else arriveAt(trip.place,'Welcome to '+trip.place.name+'.');}
  const loadPasses=()=>{try{return JSON.parse(localStorage.getItem(G.JUMP_KEY));}catch{return null;}};
  function jumpTo(id){const j=G.useJump(loadPasses());if(!j.ok){tell(`Next jump in ${Math.max(1,Math.ceil(j.wait/60000))} min. Ride there instead, or wait a little.`,4);return;}try{localStorage.setItem(G.JUMP_KEY,JSON.stringify(j.passes));}catch{}
    const place=LOCATIONS.find(l=>l.id===id);travel(id);const dest=place.id==='summit'?LOCATIONS.find(l=>l.id==='mountain'):place;
    arriveAt(dest,'You jumped to '+dest.name+(j.free?' · '+j.left+' free '+(j.left===1?'jump':'jumps')+' left today':' · next jump in 20 min'));}
  function travel(id){playLog('place',{id,how:'jump'});let destination=LOCATIONS.find(l=>l.id===id)||LOCATIONS[0];if(destination.id==='summit')destination=LOCATIONS.find(l=>l.id==='mountain');setArea('outdoor');const wanted=destination.id==='stable'?{x:0,z:9.7}:destination;const offsets=[...(destination.kind==='skygate'?[[0,4],[3,3],[-3,3]]:[]),[0,7],[7,0],[-7,0],[0,-7],[6,6],[-6,6],[0,4],[0,0]],spot=offsets.map(([dx,dz])=>({x:wanted.x+dx,z:wanted.z+dz})).find(p=>!isBlocked(p.x,p.z,mounted?.8:.4))||{x:0,z:16};moveTo(spot.x,spot.z);tracked=destination.id;clearInput();tell('Welcome to '+destination.name+'. '+destination.description,6);}
  function markVisit(location){if(!adventure.visited.includes(location.id)){playLog('place',{id:location.id,first:true});adventure.visited.push(location.id);saveAdventure();queueCoins({from:'Discovered '+location.name,coins:25,lines:['Discovered '+location.name+' · 25 🪙']});tell('Discovered '+location.name+' · 25 🪙 to collect · '+adventure.visited.length+'/'+LOCATIONS.length+' places'+(trustNote?'. '+trustNote:''),trustNote?6:4);trustNote='';}}
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
  function openService(id){import('./ranch-ui.js?v=157').then(m=>{if(!m.get()?.herd.length){tell('Choose your first horse on the home page, then come back.',5);return;}clearInput();({vet:m.openVet,hoofhaven:m.openMarket,store:m.openStore})[id]?.();}).catch(()=>tell('That shop is closed right now. Try again in a moment.'));}
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
  function raceReady(fn){if(mounted&&!racer(mounted)){tell(`${mounted.data.name} doesn’t race${mounted.data.retired?' now they’re retired':G.tooOldToCompete(RanchUI.horse(mounted.data.id)||mounted.data)?' any more: at 15 the stamina just isn’t there':' yet'}. Hop off and pick another horse.`,6);return;}fn();}
  function pickHorseThen(fn){if(mounted?.loaner){backToStall();return;}if(mounted&&racer(mounted)){fn();return;}if(mounted)dismount();
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
    if(r?.me?.racer&&(r.phase==='countdown'||r.phase==='running')||localRace||climb)return wantMusic('race');
    if(steeple)return wantMusic('games');if(area==='barn')return wantMusic('stall');
    let flying=false,wild='valley';try{flying=!!skyRide;wild=wildBiome;}catch{}   // declared further down; may not exist yet
    wantMusic(flying?'sky':night?'night':areaTune(position.x,position.z,wild));}
  // Which tune the ground you're on gets: Glowmoss, the town squares (holiday tune if one is on), then the land.
  function areaTune(x,z,wild){const near=(p,d)=>Math.hypot(x-p.x,z-p.z)<d;
    if(near(GROVE,30))return 'glowmoss';if(near(TOWN2,40)||near(SQUARE,40))return 'town';
    const inMap=Math.abs(x)<=310&&Math.abs(z)<=310,b=inMap?regionAt(x,z).biome:wild;
    if(b==='snow'||wild==='snow')return 'winter';if(wild==='desert')return 'desert';
    if(b==='forest'||wild==='forest'||forestAt(x,z,wild)>.3)return 'forest';if(b==='coast')return 'beach';return 'valley';}
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
    else if(ev.type==='whinny'){sfx('nicker',{pan:ev.pan,vol:.35+ev.vol*.75,rate:voiceRate(.6)});const f=corn.foalPosition(),a=Math.atan2(f.x-position.x,f.z-position.z)-(yaw+Math.PI),s=Math.sin(a),c=Math.cos(a);
      tell('🐴 A whinny '+(c>.5?'up ahead':c<-.5?'behind you':s>0?'to your left':'to your right')+(ev.dist<12?', very close!':ev.dist<25?', not far.':', far off.'),3);}
    else if(ev.type==='found'){sfx('sparkle');sfx('nicker',{delay:.3,rate:voiceRate(.6)});tell('You found the foal! Lead it back out of the gate. It will follow you, jumps and all.',6);}
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
    tell(end==='top'?'Welcome to Lavender & Bee Meadows! Follow the paths north to ride home.':'Cloudstep Summit! The lookout rock has the best view.',5);}
  // ---- Step 3 activities: start, finish (Trotties once a day, best time kept), lookouts, fishing ----
  const actKey='trottville-activities-v1:'+storageKey;let actSave;try{actSave=JSON.parse(localStorage.getItem(actKey)||'null')||{};}catch{actSave={};}actSave.best||={};actSave.daily||={};actSave.fish||={};
  const saveActs=()=>{try{localStorage.setItem(actKey,JSON.stringify(actSave));}catch{}};
  const today=()=>new Date().toISOString().slice(0,10);
  function beginActivity(a){cancelWalk();if(a.mounted&&!mounted){tell(a.name+': saddle up first! This one is ridden.',4);sfx('bonk');return;}
    if(a.night&&skyNight<.5){tell(a.id==='owls'?'The owls are still asleep. Come back after dark for the '+a.name+'.':a.name+' starts after dark. Come back when the lamps are lit.',5);return;}
    if(a.kind==='hunt'){run=startRun(a,performance.now(),position);tell(a.icon+' '+a.how,6);return;}
    run=startRun(a,performance.now(),position);acts.setTarget(run);WA.ghostStart(a);sfx('whistle');tell(a.icon+' '+a.name+'! '+a.how,6);}
  function endRun(note){if(note)tell(note,4);run=null;WA.ghostStop();acts.setTarget(null);$('#world-quest-hint').textContent='';}
  function finishRun(a,ms){const s=(ms/1000).toFixed(1),best=actSave.best[a.id],fresh=best==null||ms<best;if(fresh)actSave.best[a.id]=ms;const paid=actSave.daily[a.id]===today();actSave.daily[a.id]=today();WA.ghostSave(a,fresh);saveActs();
    endRun(null);sfx('cheer');markDone?.(a.id);
    const line=a.kind==='hunt'?'Found the golden pumpkin in '+s+' s':a.name+' in '+s+' s'+(fresh?' · new best!':' · best '+(best/1000).toFixed(1)+' s');
    if(!paid){const cid=queueCoins({from:a.name,coins:a.reward*(WC.fair()?2:1),lines:[line+' · '+a.reward*(WC.fair()?2:1)+' 🪙'+(WC.fair()?' (Fair Day ×2)':'')]});if(cid){showCollect({title:a.icon+' '+a.name+'!',ids:[cid]});return;}}
    tell(line+(paid?' (today’s Trotties already paid; try again tomorrow).':''),6);}
  function openVista(l){vista=l;vistaPos.set(...l.pos);vistaLook.set(...l.look);moonAsked=false;
    if(moonTonight(l))vistaLook.copy(vistaPos).addScaledVector(MOON_DIR,60),tell('Midnight! Bong… bong… Look up at the moon!',5);else tell(l.line+' Move to climb back down.',6);
    if(!actSave.daily['look-'+l.id]){actSave.daily['look-'+l.id]=1;saveActs();const cid=queueCoins({from:l.name,coins:5,lines:['A view from '+l.name+' · 5 🪙']});if(cid)showCollect({title:'What a view!',ids:[cid]});}}
  // v106: the moon pegasus (legends.mjs). From the clock tower at midnight a silver pegasus circles the moon; the lure card
  // opens once the camera has arrived at the view (vistaK), and if you hold up a carrot it glides down into the square.
  const MOON_DIR=new T.Vector3(.35,.72,.6).normalize(),moonU=new T.Vector3().crossVectors(MOON_DIR,new T.Vector3(0,1,0)).normalize(),moonV=new T.Vector3().crossVectors(moonU,MOON_DIR).normalize();
  let moonPeg=null,moonAsked=false;const _mp=new T.Vector3();
  const moonTonight=l=>l?.id==='clocktower'&&area==='outdoor'&&isMidnight(sky.hours)&&!legendsWorld.moonCaught();
  function moonModel(){if(moonPeg)return moonPeg;const m=makeSculptedHorse(T,{id:'moon-peg',legend:'pegasus',coat:{...COATS.silver,white:'#f7f9ff',dapple:true,socks:[0,0,0,0],pattern:7}},{});
    m.root.traverse(o=>{if(o.material){for(const mm of [].concat(o.material)){mm.fog=false;if(mm.emissive){mm.emissive.set('#c8d4f0');mm.emissiveIntensity=.55;}}}});m.setGait('gallop');
    const hc=document.createElement('canvas');hc.width=hc.height=64;{const x=hc.getContext('2d'),gr=x.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(230,238,255,.55)');gr.addColorStop(1,'rgba(230,238,255,0)');x.fillStyle=gr;x.fillRect(0,0,64,64);}
    const halo=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(hc),transparent:true,depthWrite:false,fog:false,opacity:1}));halo.scale.setScalar(9);halo.position.y=2.2;m.root.add(halo);
    outdoors.add(m.root);moonPeg={m,halo,state:'circle',t:0,a:0};return moonPeg;}
  // Note #40: anyone near Thimbleford sees it circle the clock tower at midnight; from the square, look up at it to tempt it.
  const CLOCK_TOP=new T.Vector3(TOWN2.clock.x,0,TOWN2.clock.z);let moonNight='';
  const sightingNow=()=>area==='outdoor'&&isSighting(sky.hours)&&!legendsWorld.moonCaught()&&Math.hypot(position.x-TOWN2.x,position.z-TOWN2.z)<160;
  function moonStep(delta){const tower=moonTonight(vista),far=!tower&&sightingNow(),show=tower||far||moonPeg&&(moonPeg.state==='descend'||moonPeg.state==='landed');
    if(!isSighting(sky.hours)&&!isMidnight(sky.hours)){moonAsked=false;if(moonPeg)moonPeg.told=false;}
    if(!show){if(moonPeg&&moonPeg.m.root.visible)moonPeg.m.root.visible=false;if(moonPeg?.state==='landed')moonPeg.state='gone';return;}
    const P=moonModel();P.m.root.visible=P.state!=='gone';if(P.state==='gone'){P.state='circle';}P.t+=delta;P.m.update(delta);
    if(P.state==='circle'&&far){P.a+=delta*.45;const cy=groundY(CLOCK_TOP.x,CLOCK_TOP.z)+15.5,x=CLOCK_TOP.x+Math.cos(P.a)*7.5,z=CLOCK_TOP.z-1+Math.sin(P.a)*4,y=cy+Math.sin(P.a*2)*1.6;
      const vx=x-P.m.root.position.x,vz=z-P.m.root.position.z;P.m.root.position.set(x,y,z);if(Math.hypot(vx,vz)>1e-4)P.m.root.rotation.y=Math.atan2(vx,vz);P.m.root.scale.setScalar(1.3);
      // In the square with it in view (looking up at the clock tower) → the lure card, once a night.
      const fw=camera.getWorldDirection(new T.Vector3()),ahead=_mp.copy(P.m.root.position).sub(camera.position).dot(fw)>0,sp=_mp.copy(P.m.root.position).project(camera),inView=ahead&&sp.z<1&&Math.abs(sp.x)<.7&&sp.y>-.2&&sp.y<.92;
      if(!moonAsked&&!legendsWorld.moonAskedTonight()&&Math.hypot(position.x-TOWN2.x,position.z-TOWN2.z)<30&&inView&&!document.querySelector('.tc-sheet,.lg-card')){moonAsked=true;legendsWorld.markMoonAsked();
        legendsWorld.moonLure({onCaught:()=>{P.state='descend';P.t=0;P.from=P.m.root.position.clone();}});}
      else if(!moonAsked&&!P.told&&Math.hypot(position.x-TOWN2.x,position.z-TOWN2.z)<26){P.told=true;tell('Bong… bong… It’s midnight in Thimbleford. Look up at the clock tower!',5);}}
    else if(P.state==='circle'){P.a+=delta*.55;const c=_mp.copy(vistaPos).addScaledVector(MOON_DIR,40);const x=c.x+moonU.x*Math.cos(P.a)*4.5+moonV.x*Math.sin(P.a)*2.4,y=c.y+moonU.y*Math.cos(P.a)*4.5+moonV.y*Math.sin(P.a)*2.4-1.2,z=c.z+moonU.z*Math.cos(P.a)*4.5+moonV.z*Math.sin(P.a)*2.4;
      const vx=x-P.m.root.position.x,vz=z-P.m.root.position.z;P.m.root.position.set(x,y,z);if(Math.hypot(vx,vz)>1e-4)P.m.root.rotation.y=Math.atan2(vx,vz);P.m.root.scale.setScalar(1);
      if(vistaK>.95&&!moonAsked&&!legendsWorld.moonAskedTonight()&&!document.querySelector('.tc-sheet')){moonAsked=true;legendsWorld.markMoonAsked();legendsWorld.moonLure({
        onCaught:()=>{P.state='descend';P.t=0;P.from=P.m.root.position.clone();vista=null;}});}}
    else if(P.state==='descend'){const k=Math.min(1,P.t/4),e=k*k*(3-2*k),tx=-90,tz=63,ty=groundY(tx,tz);const x=P.from.x+(tx-P.from.x)*e,z=P.from.z+(tz-P.from.z)*e,y=P.from.y+(ty-P.from.y)*e+Math.sin(e*Math.PI)*4;
      P.m.root.rotation.y=Math.atan2(tx-P.from.x,tz-P.from.z);P.m.root.position.set(x,y,z);P.halo.material.opacity=1-e;if(k>=1){P.state='landed';P.m.setGait('stand');sfx('nicker');}}
    else if(P.state==='landed'&&Math.hypot(position.x+90,position.z-63)>70){P.state='gone';P.m.root.visible=false;}}
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
    const h=HOSTS.find(h=>d(h.x,h.z)<3.4);if(h)return {kind:'host',h,label:h.activity?ACTIVITY_BY_ID[h.activity].name+' with '+h.name:'Talk to '+h.name};
    const a=ACTIVITIES.find(a=>!a.host&&d(a.start.x,a.start.z)<4);if(a)return {kind:'start',a,label:(run?.id===a.id?'Restart ':'')+a.name};
    const p=PUMPKINS.findIndex(p=>d(p.x,p.z)<1.9);if(p>=0)return {kind:'pumpkin',p,label:'Check this pumpkin'};
    return null;};
  // ---- Clover Downs Show Ring (v72): entries at the steward, rounds judged fence by fence, practice fences, rosettes ----
  const arenaSave=(actSave.arena||={best:{},paid:{},today:{},rosettes:[0,0,0,0],clears:0});
  let round=null,practicePrev=null,practiceSaid=0,sprintK=1;
  function showArenaClass(id){const c=arenaCourse(today(),id);acts.arena.setCourse(c);paintArenaBoard(c);return c;}
  function paintArenaBoard(c){const t=arenaSave.today.day===today()?arenaSave.today[c.cls.id]:null,rows=arenaRivals(c).map(r=>({name:r.name,faults:r.faults,time:r.time}));
    if(t&&t.place)rows.push({name:'You',me:true,faults:t.faults,time:t.time});rows.sort((a,b)=>a.faults-b.faults||a.time-b.time);
    acts.arena.drawBoard({title:c.cls.name.toUpperCase(),sub:`${c.jumps} fences · ${c.allowed} s allowed · ${c.plan}`,rows:rows.map((r,i)=>({place:PLACE_NAME[i+1],name:r.name,me:r.me,score:`${r.faults} flt · ${r.time.toFixed(1)}s`}))});}
  function arenaNeeds(cls){if(!cls.show)return [];const h=(mounted||called)?.data;return entryNeeds(cls.show,{tooOld:!!h&&G.tooOldToCompete(RanchUI.horse(h.id)||h),level:h?horseLevel(h.xp):0,upgradedSaddle:!!h&&G.upgraded(G.tackOf(h).saddle),hasOutfit:G.canShow(loadWallet())});}
  const ARENA_CSS='<style>.ar-cls{border:2px solid #e3cf9f;border-radius:14px;padding:10px 12px;margin:10px 0;display:grid;gap:6px}.ar-cls b{font-size:17px}.ar-cls span{font-size:14px;line-height:1.35}.ar-lock{color:#8a5a3c}.ar-shelf{font-weight:700;text-align:center}.ar-ros{--a:#2f6fb5;--b:#7fb0e8;--ink:#fff;width:124px;height:124px;margin:6px auto 30px;border-radius:50%;background:repeating-conic-gradient(var(--a) 0 10deg,var(--b) 10deg 20deg);display:grid;place-items:center;position:relative}.ar-ros span{width:74px;height:74px;border-radius:50%;background:var(--a);color:var(--ink);display:grid;place-items:center;font:800 20px system-ui,sans-serif;border:3px solid #ffffffaa;z-index:1}.ar-ros:before,.ar-ros:after{content:"";position:absolute;top:96px;width:28px;height:50px;background:var(--a);clip-path:polygon(0 0,100% 0,100% 100%,50% 82%,0 100%)}.ar-ros:before{left:34px;transform:rotate(14deg)}.ar-ros:after{right:34px;transform:rotate(-14deg)}.ar-tab{width:100%;border-collapse:collapse;font-size:15px}.ar-tab td{padding:6px 4px;border-bottom:1px solid #eadfca}.ar-tab tr.me td{font-weight:800;background:#fff3cf}.ar-tab td:last-child{text-align:right}</style>';
  function openArena(){const d=today(),t=arenaSave.today.day===d?arenaSave.today:{},c=arenaCourse(d,'open'),ros=arenaSave.rosettes;
    const rows=ARENA_CLASSES.map(k=>{const needs=arenaNeeds(k),r=t[k.id],cc=arenaCourse(d,k.id),paid=arenaSave.paid[k.id]===d;
      return `<div class="ar-cls"><b>${k.icon} ${k.name}</b><span>${k.blurb} ${cc.allowed} s allowed. Prizes ${k.prize.join(' / ')} 🪙${paid?' (today’s prize already won)':''}.</span>${r?`<span>Your best today: ${PLACE_NAME[r.place]} · ${r.faults} faults · ${r.time.toFixed(1)} s</span>`:''}${needs.length?`<span class="ar-lock">🔒 Needs ${needs.map(n=>n.id==='outfit'?'a '+n.text:n.text[0].toLowerCase()+n.text.slice(1)).join(', ')}</span>`:`<button class="primary full" data-cls="${k.id}">${round?.course.cls.id===k.id?'Start again':'Enter the '+k.name}${k.fee?(paid?' · free practice':` · ${k.fee.toLocaleString('en-US')} 🪙`):''}</button>`}</div>`;}).join('');
    adventureUI.open('Clover Downs Show Ring',`${ARENA_CSS}<p>Marigold, the ring steward: “Today’s course is ${c.plan}. Jump the numbered fences in order, and tap Jump just before each one. The higher the fence, the faster you need to go. A rail down or a stop costs 4 faults, and each second over the time costs 1 more. Three stops and you’re out!”</p>${rows}<p class="ar-shelf">Rosettes: 🔵 ${ros[0]} · 🔴 ${ros[1]} · ⚪ ${ros[2]} · 🟡 ${ros[3]} · Clear rounds: ${arenaSave.clears}</p>`);
    adventureUI.dialog.querySelectorAll('[data-cls]').forEach(b=>b.onclick=()=>{adventureUI.close();enterClass(b.dataset.cls);});}
  function enterClass(id){if(!mounted){tell('The show ring is ridden. Saddle up and come back to Marigold!',4);sfx('bonk');return;}
    {const k=ARENA_CLASSES.find(x=>x.id===id);if(k?.show&&arenaNeeds(k).length){tell(`Marigold: Not today. Needs ${arenaNeeds(k).map(n=>n.text).join(', ')}.`,5);sfx('bonk');return;}
      if(k?.fee&&arenaSave.paid[id]!==today()){const w=loadWallet();if(w.coins<k.fee){tell(`The ${k.name} costs ${k.fee.toLocaleString('en-US')} Trotties to enter. Win it and the prize is ${k.prize[0].toLocaleString('en-US')}!`,5);sfx('bonk');return;}
        saveWallet({...w,coins:w.coins-k.fee});paintCounters();sfx('buy');tell(`Entry paid: ${k.fee.toLocaleString('en-US')} 🪙. Good luck!`,2.5);}}
    if(run)endRun(null);const c=showArenaClass(id);acts.arena.resetRails();round=startRound(c,performance.now());round.prev={x:position.x,z:position.z};acts.arena.setNext(0);sfx('chime');
    tell(`${c.cls.icon} ${c.cls.name}: ${c.jumps} fences, ${c.allowed} s allowed. Ride in through the gate. The clock starts at the flags!`,6);}
  function endRound(note){round=null;acts.arena.setNext(-1);$('#world-quest-hint').textContent='';if(note)tell(note,5);}
  const paceWord=f=>f.need>7?'a full gallop':f.need>5?'a canter':'a trot';
  let practiceRefused=null,settleUntil=0;
  function arenaTick(now){
    if(round){if(area!=='outdoor'||!mounted){endRound('Round stopped: you got off your horse.');return;}
      if(!round.started&&!inArena(position.x,position.z,60)){endRound('Entry cancelled: you rode away from the show ring.');return;}
      const ev=stepRound(round,{x:position.x,z:position.z,air:jump>.25,speed:moveSpeed},now);if(ev)arenaEvent(ev);return;}
    // Practice fences: judged either way, with a tip. Only on horseback.
    const here={x:position.x,z:position.z};
    if(mounted&&area==='outdoor'&&practicePrev&&Math.abs(here.x-PRACTICE[0].x)<10)for(const f of PRACTICE){const s=crossed(f,practicePrev,here);if(!s)continue;let how=judgeJump(f,{air:jump>.25,speed:moveSpeed});const name=mounted.data.name;
      // v124: at speed and in the air, a horse that doesn't trust you yet may still stop. First approach only, never twice running.
      // v134: instead of losing trust, a horse that refused needs a 30-second breather before it takes any practice fence.
      const settle=Math.ceil((settleUntil-Date.now())/1000);
      if(settle>0){how='settle';}
      else if(how!=='refusal'&&!mounted.loaner&&practiceRefused!==f&&Math.random()<G.refusalChance(trustOf(mounted.data.id))){how='refusal';practiceRefused=f;settleUntil=Date.now()+30000;}
      else if(how!=='refusal'&&how!=='settle')practiceRefused=null;
      if(how==='settle'){moveTo(f.x,f.z-s*4);moveSpeed=0;sfx('snort',{rate:voiceRate(mounted?.data?.size)});tell(`${name} is still settling after that stop. Walk a little circle: ready in ${settle} s.`,3);here.x=position.x;here.z=position.z;}
      else if(how==='refusal'){moveTo(f.x,f.z-s*4);moveSpeed=0;sfx('snort',{rate:voiceRate(mounted?.data?.size)});tell(practiceRefused===f?`${name} wasn’t sure and stopped at the ${f.label} fence. Give them 30 seconds to settle, then try again.`:`${name} stopped at the ${f.label} fence. Tap Jump just before the rails!`,3);here.x=position.x;here.z=position.z;}
      else if(how==='rail'){sfx('wood');tell(`Rail down! The ${f.label} fence needs ${paceWord(f)}.`,3);}
      else{sfx('sparkle');tell(`Clean over the ${f.label} fence!`,2);}break;}
    practicePrev=here;}
  function arenaEvent(ev){const name=(mounted||called).data.name;
    if(ev.type==='go'){sfx('go');tell('The clock is running! Follow the gold arrow to fence 1.',3);return;}
    if(ev.type==='retired'){sfx('bonk');endRound('You rode out of the ring, so the judges retired you. See Marigold to try again.');return;}
    if(ev.type==='clear'){sfx('sparkle');acts.arena.cheer();if(!ev.result)tell(`Clear over fence ${ev.f.n}!`,1.6);}
    else if(ev.type==='rail'){sfx('wood');acts.arena.knock(ev.f.n-1);tell(`Rail down at fence ${ev.f.n}: 4 faults. The ${ev.f.label} ones need ${paceWord(ev.f)}.`,3);}
    else{sfx('snort',{rate:voiceRate(mounted?.data?.size)});moveTo(ev.back.x,ev.back.z);moveSpeed=0;round.prev={...ev.back};if(ev.type==='refusal')tell(`${name} stopped at fence ${ev.f.n}! That’s a refusal: 4 faults. Circle round and tap Jump just before the rails.`,4);}
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
    if(n.kind==='host'){if(!n.h.activity){n.h.k=(n.h.k??-1)+1;tell(n.h.name+': '+n.h.lines[n.h.k%n.h.lines.length],6);return;}tell(n.h.name+': '+n.h.lines[Math.floor(Date.now()/9000)%n.h.lines.length],4);beginActivity(ACTIVITY_BY_ID[n.h.activity]);return;}
    if(n.kind==='start'){beginActivity(n.a);return;}
    if(n.kind==='arena'){openArena();return;}
    if(n.kind==='pumpkin'){const a=ACTIVITY_BY_ID.pumpkins,g=acts.golden(today());if(n.p===g){finishRun(a,run?.id==='pumpkins'?performance.now()-run.t0:0);return;}
      const gp=PUMPKINS[g],me=PUMPKINS[n.p],dist=Math.hypot(gp.x-me.x,gp.z-me.z);tell(dist<6?'Just orange… but you’re very warm!':dist<14?'Plain orange. Warmer…':'Just a pumpkin. Colder!',3);sfx('bonk');}}
  // ---- v104: flying above the clouds on a pegasus (your own horse, with wings), from Pegasus Perch ----
  let lastChime=null;
  let skyWorld=null,skyRide=null;const skyHold={up:false,down:false};let skyUI=null;
  function skyPanel(){if(skyUI)return skyUI;skyUI=document.createElement('div');skyUI.className='sky-ui';skyUI.hidden=true;
    skyUI.innerHTML='<p class="sky-count" aria-live="polite"></p><div class="sky-alt"><button type="button" data-sky="up" aria-label="Fly up">▲</button><button type="button" data-sky="down" aria-label="Fly down">▼</button></div><button type="button" class="sky-land" data-sky="land">Fly home</button>';
    for(const b of skyUI.querySelectorAll('[data-sky]')){const k=b.dataset.sky;if(k==='land'){b.onclick=()=>leaveSky();continue;}
      const on=e=>{e.preventDefault();skyHold[k]=true;b.classList.add('is-on');},off=()=>{skyHold[k]=false;b.classList.remove('is-on');};
      b.addEventListener('pointerdown',on);for(const ev of ['pointerup','pointercancel','pointerleave'])b.addEventListener(ev,off);}
    host.appendChild(skyUI);return skyUI;}
  function skyCount(){const r=skyRide;if(!r)return;const b=actSave.best?.skyrings;skyPanel().querySelector('.sky-count').textContent=`💫 Rings ${r.ring}/${SKY.rings} · ⭐ ${r.stars}/${SKY.stars}`+(b?` · best ${(b/1000).toFixed(0)} s`:'');}
  function enterSky(){
    if(!mounted){tell('Ride your horse into Pegasus Perch: under the dome, horses grow wings.',6);return;}
    if(mounted.loaner){tell('Test-ride horses stay on the ground. Bring your own horse to Pegasus Perch.',5);return;}
    cancelWalk();if(run)endRun(null);
    if(!skyWorld){skyWorld=buildSkyWorld({T,geo,mat,label});scene.add(skyWorld.group);}
    const h=mounted,wings=skyWorld.wings(h.scale||1);h.root.add(wings);
    skyRide={h,wings,parent:h.root.parent,x:SKY.start.x,y:SKY.start.y,z:SKY.start.z,heading:Math.PI,speed:4,climb:0,bank:0,pitchA:0,ring:0,stars:0,t:0,cam:new T.Vector3(SKY.start.x,SKY.start.y+6,SKY.start.z+14),look:new T.Vector3(SKY.start.x,SKY.start.y,SKY.start.z),order:h.root.rotation.order,paid:actSave.daily.skyrings===today()};
    skyWorld.group.add(h.root);h.root.rotation.order='YXZ';
    skyWorld.rings.forEach((r,i)=>{r.mesh.visible=true;r.next=i===0;});skyWorld.stars.forEach(st=>st.mesh.visible=true);if(skyWorld.goldCarrot)skyWorld.goldCarrot.mesh.visible=actSave.daily.skycarrot!==today();
    outdoors.visible=false;skyWorld.group.visible=true;host.classList.add('is-sky');
    scene.background.set('#9fd2f3');scene.fog.color.set('#e4f0fa');scene.fog.near=170;scene.fog.far=1200;camera.far=1600;camera.updateProjectionMatrix();
    skyRide.light={sun:sun.intensity,hemi:hemi.intensity};sun.intensity=3.1;hemi.intensity=2.4;
    skyPanel().hidden=false;skyCount();sfx('whoosh');
    tell('Wings! '+h.data.name+' carries you up above the clouds. Steer with the stick, ▲ ▼ to climb and dive. Fly through the gold rings in order and gather the stars.',8);}
  function leaveSky(){const r=skyRide;if(!r)return;skyRide=null;const h=r.h;ambLoop('skyfalls',null);
    h.root.remove(r.wings);r.wings.traverse(o=>o.geometry?.dispose?.());h.root.rotation.set(0,Math.PI,0);h.root.rotation.order=r.order;(r.parent||outdoors).add(h.root);
    skyWorld.group.visible=false;host.classList.remove('is-sky');skyPanel().hidden=true;skyHold.up=skyHold.down=false;
    sun.intensity=r.light.sun;hemi.intensity=r.light.hemi;
    setArea('outdoor');moveTo(SKYGATE.x,SKYGATE.z+8);yaw=0;pitch=.35;
    tell(h.data.name+' glides down and lands softly at Pegasus Perch. The wings fold away… until next time.',6);}
  const _skyV=new T.Vector3();
  // v135: the sky island's waterfall (world-expansion islands[3]: x 90, y 66, z -230, r 18) roars as you fly near it.
  const SKY_FALL={x:107.1,z:-230,top:64,bottom:-2};
  function skyFallSound(r){const dy=r.y>SKY_FALL.top?r.y-SKY_FALL.top:r.y<SKY_FALL.bottom?SKY_FALL.bottom-r.y:0,d=Math.hypot(r.x-SKY_FALL.x,r.z-SKY_FALL.z,dy);
    ambLoop('skyfalls','falls',Math.max(0,1-(d-10)/90)**2*.9);}
  function skyStep(delta,now,sx,sz,paused){const r=skyRide,h=r.h;r.t+=delta;skyFallSound(r);
    if(!paused){const up=(skyHold.up||keys.has(' ')?1:0)-(skyHold.down||keys.has('q')||keys.has('c')?1:0);
      r.heading-=sx*1.25*delta;const want=Math.max(5,Math.min(24,13+sz*10));r.speed+=(want-r.speed)*Math.min(1,delta*1.2);
      r.climb+=(up*9-r.climb)*Math.min(1,delta*3);r.y=Math.max(SKY.minY,Math.min(SKY.maxY,r.y+r.climb*delta));
      if(Math.hypot(r.x,r.z)>SKY.edge){const back=Math.atan2(-r.x,-r.z),d=Math.atan2(Math.sin(back-r.heading),Math.cos(back-r.heading));r.heading+=d*Math.min(1,delta*.9);}
      r.x+=Math.sin(r.heading)*r.speed*delta;r.z+=Math.cos(r.heading)*r.speed*delta;
      r.bank+=(sx*.42-r.bank)*Math.min(1,delta*3);r.pitchA+=(-r.climb*.045-r.pitchA)*Math.min(1,delta*3);
      // the next ring, then the stars
      const ring=skyWorld.rings[r.ring];if(ring&&Math.hypot(ring.x-r.x,ring.y-r.y,ring.z-r.z)<6.2){ring.mesh.visible=false;ring.next=false;r.ring++;if(r.ring===1)r.t0=r.t;const nx=skyWorld.rings[r.ring];if(nx)nx.next=true;sfx('chime');skyCount();
        if(r.ring>=SKY.rings){sfx('fanfare');{const ms=Math.round((r.t-r.t0)*1000),best=actSave.best.skyrings,fresh=best==null||ms<best;if(fresh)actSave.best.skyrings=ms;saveActs();tell('Rings done in '+(ms/1000).toFixed(1)+' s'+(fresh?' · new best!':' · best '+(best/1000).toFixed(1)+' s'),6);}if(!r.paid){r.paid=true;actSave.daily.skyrings=today();saveActs();const cid=queueCoins({from:'Pegasus Perch',coins:30,lines:['All twelve sky rings · 30 🪙']});if(cid)showCollect({title:'🪽 Sky rings!',ids:[cid]});else tell('All twelve rings!',5);}else tell('All twelve rings! (Today’s Trotties already paid.)',5);}
        else tell('Ring '+r.ring+' of '+SKY.rings+'!',2);}
      {const gc=skyWorld.goldCarrot;if(gc?.mesh.visible&&Math.hypot(gc.x-r.x,gc.mesh.position.y-r.y-1,gc.z-r.z)<2.8){gc.mesh.visible=false;actSave.daily.skycarrot=today();saveActs();const rr=RanchUI.get();if(rr)RanchUI.set({...rr,food:{...rr.food,golden:(rr.food.golden||0)+1}});sfx('chime');tell('✨🥕 A golden carrot, right on the tip of the spire! It’s in your pantry now. They say the moon pegasus can’t resist one…',8);}}
      for(const st of skyWorld.stars)if(st.mesh.visible&&Math.hypot(st.x-r.x,st.mesh.position.y-r.y-1,st.z-r.z)<3.4){st.mesh.visible=false;r.stars++;sfx('sparkle');skyCount();if(r.stars===SKY.stars){if(actSave.daily.skystars!==today()){actSave.daily.skystars=today();saveActs();const cid=queueCoins({from:'Pegasus Perch',coins:10,lines:['Every star in the sky · 10 🪙']});if(cid)showCollect({title:'⭐ All twenty stars!',ids:[cid]});}else tell('Every star in the sky is yours! ⭐',5);}}}
    h.root.position.set(r.x,r.y,r.z);h.root.rotation.set(r.pitchA,r.heading,r.bank);
    if(h.model.gait!=='canter')h.model.setGait('canter');h.model.update(delta*(.5+r.speed/30));h.tack?.update?.(delta,{jumpT:0,speed:.7});r.wings.userData.flap(r.t,.6+r.climb/18);
    skyWorld.tick(delta,r.t);
    // camera: behind and a little above, eased; drag to look turns it round the pegasus
    _skyV.set(r.x-Math.sin(r.heading)*11,r.y+3.6-r.climb*.12,r.z-Math.cos(r.heading)*11);r.cam.lerp(_skyV,Math.min(1,delta*3));r.look.lerp(_skyV.set(r.x+Math.sin(r.heading)*6,r.y+1.2,r.z+Math.cos(r.heading)*6),Math.min(1,delta*5));
    camera.position.copy(r.cam);camera.lookAt(r.look);
    if(!paused&&(!renderer.simpleGraphics||now-lastRender>=60)){renderer.render(scene,camera);lastRender=now;}
    if(now-lastHUD>180){lastHUD=now;if(now>messageUntil)$('#world-message').classList.add('quiet');}}
  function interact(){cancelWalk();if(adventureUI.dialog.open)return;if(inMyStall()&&enterCare())return;if(chair){tell(mounted?'Stay in the saddle until the platform reaches the station.':'Sit tight! The chair lets you off at the station.',3);return;}
    if(area==='outdoor'){const ls=skiLift.near(position.x,position.z);if(ls){skiLift.openPanel(ls,{mounted:mounted?.data.name||null,onRide:()=>boardLift(ls)});return;}}
    if(nearCave()){enterCave();return;}
    if(area==='outdoor'&&mounted){const d=doorNear(position.x,position.z);if(d){const name=mounted.data.name;if(dismount()!==false)tell('You hop down at '+d.shop.name+'. '+name+' waits by the rail. Walk on in!',5);return;}}
    if(legendsWorld.interact(legendCtx()))return;
if(inMarket()){if(nearMarketDoor()){leaveMarket();return;}if(nearMarketBook()){openService('hoofhaven');return;}const st=nearStallHorse();if(st){openStall(st);return;}tell('Walk up to a stall to meet a horse, or read the book by the door.',4);return;}
if(area==='barn'){if(nearDoor()){openDoors();return;}if(nearKeeper()){talkToHazel();return;}if(nearSaddler()&&!mounted){talkToOtis();return;}const station=INDOOR_GAMES.map(g=>({...g,distance:Math.hypot(g.x-position.x,g.z-position.z)})).sort((a,b)=>a.distance-b.distance)[0];if(station.distance<5)adventureUI.showGame(station.id);else adventureUI.showBarn();return;}
    {const n=nearAct();if(n){actInteract(n);return;}}
    {const g=quests?.near(position.x,position.z);if(g){quests.talk(g.id,{x:position.x,z:position.z,mounted:!!mounted});return;}}
    const station=nearStation();if(station){enterStation(station);return;}
    const service=SERVICES.map(s=>({...s,distance:Math.hypot(s.x-position.x,s.z-position.z)-(s.id==='hoofhaven'?9:3)})).sort((a,b)=>a.distance-b.distance)[0];
    if(service.distance<5){if(service.id==='hoofhaven')enterMarket();else openService(service.id);return;}
    if((!nearestPlace||nearestPlace.distance>6)&&legendsWorld.stargaze(legendCtx()))return;
    if(!nearestPlace||nearestPlace.distance>6){tell('Move closer to a named place, or open the map to find your next stop.');return;}const place=nearestPlace;markVisit(place);if(place.id==='stable'){enterBarn();return;}if(place.id==='mountain'){beginClimb();return;}if(place.id==='race'){raceMenu();return;}if(place.id==='perch'){enterSky();return;}if(place.id==='puddlebrook'||place.id==='bramblewick'){const pb=place.id==='puddlebrook',key='farm-'+place.id+':'+new Date().toISOString().slice(0,10);
      if(adventure.daily[key]){tell(pb?'Hattie waves from the porch: “Come back tomorrow! And mind the goats.”':'Gus tips his hat: “Pepper and Pickle say hello. See you tomorrow!”',5);return;}adventure.daily[key]=true;saveAdventure();
      const cid=queueCoins({from:place.name,coins:5,food:pb?{carrot:3,apple:1}:{apple:3,hay:1},lines:[pb?'A basket of carrots from Hattie’s garden':'Apples from Gus’s orchard tree, and a hay net','Helping on the farm · 5 🪙']});
      if(cid){showCollect({title:pb?'🐷 Puddlebrook Farm':'🐄 Bramblewick Farm',ids:[cid]});return;}tell('Thanks for visiting the farm!',4);return;}
    if(place.id==='thimbleford'){const key='bun:'+new Date().toISOString().slice(0,10);if(adventure.daily[key]){tell('The baker waves: “Fresh buns again tomorrow!” Ottilie by the clock tower has a lantern walk after dark.',5);return;}adventure.daily[key]=true;saveAdventure();const cid=queueCoins({from:'Thimbleford Bakery',coins:0,food:{carrot:2,apple:1},lines:['Warm carrot buns and an apple from the bakery']});if(cid){showCollect({title:'🥐 Thimbleford Bakery',ids:[cid]});return;}tell('The baker hands you warm carrot buns.',4);return;}
    const supply={orchard:'apples',market:'carrots',flowers:'flowers'}[place.id];if(supply){const day=new Date().toISOString().slice(0,10),key=supply+':'+day;if(adventure.daily[key]){tell('You gathered today’s '+supply+'. Come back tomorrow.');return;}adventure.daily[key]=true;adventure.supplies[supply]+=3;saveAdventure();const food={apples:{apple:3},carrots:{carrot:3}}[supply];if(food){const cid=queueCoins({from:place.name,coins:0,food,lines:['Today’s basket from '+place.name]});if(cid)showCollect({title:'A basket of '+supply+'!',ids:[cid],onDone:()=>{if(place.id==='market')openService('store');}});}else tell('Gathered 3 '+supply+' for your adventure basket!');return;}
    if(place.id==='market'){openService('store');return;}tell(place.name+' · '+place.description,6);
  }
  function updateAdventure(delta,now){expansion.tick(now);if(area==='outdoor')expansion.lands?.tick(delta,sky.hours);if(area==='outdoor'){const hh=Math.floor(sky.hours);if(lastChime!==hh){if(lastChime!=null&&Math.hypot(position.x-TOWN2.x,position.z-TOWN2.z)<80){sfx('chime');tell('Bong! The Thimbleford clock strikes '+((hh+11)%12+1)+'.',3);}lastChime=hh;}}inShop=town.tick(now,{x:position.x,z:position.z,delta,outdoor:area==='outdoor'});
    // Step 3 activities: the running course, the stepping-stones, the fishing float, owls by night, the sleigh.
    if(run&&run.id!=='pumpkins'){const a=ACTIVITY_BY_ID[run.id];if(area!=='outdoor'||(a.mounted&&!mounted))endRun(a.name+' stopped: '+(a.mounted?'you got off your horse.':'you went inside.'));
      else if(runAbandoned(run,position))endRun(a.name+' stopped: you rode too far away.');
      else{const ev=stepRun(run,position,now);if(ev?.type==='next'){acts.setTarget(run);sfx('pop');}else if(ev?.type==='found'){acts.setTarget(run);const w=FOUND_WORDS[a.id]||['Found',''];sfx(a.id==='piglets'?'snort':'sparkle');tell(a.icon+' '+w[0]+' '+ev.n+' of '+a.points.length+'!'+(w[1]?' '+w[1]:''),3);}else if(ev?.type==='done')finishRun(a,ev.ms);}}
    arenaTick(now);
    if(area==='outdoor'){const i=lakeStone(position.x,position.z);if(i>=0&&!mounted){stoneRun||={lo:i,hi:i};stoneRun.lo=Math.min(stoneRun.lo,i);stoneRun.hi=Math.max(stoneRun.hi,i);
        if(stoneRun.lo===0&&stoneRun.hi===STONES.length-1&&!stoneRun.done){stoneRun.done=true;sfx('sparkle');if(actSave.daily.stones!==today()){actSave.daily.stones=today();saveActs();const cid=queueCoins({from:'Lily Lake',coins:10,lines:['Across the stepping-stones · 10 🪙']});if(cid)showCollect({title:'Across Lily Lake without a splash!',ids:[cid]});}else tell('Across the stepping-stones again! Not a single splash.',3);}}
      else if(stoneRun&&Math.hypot(position.x+209,position.z-3)>14)stoneRun=null;}
    fishing?.tick(now);if(fishing&&Math.hypot(position.x-FISHING.x,position.z-FISHING.z)>4)fishing.close();
    acts.golden(new Date().toISOString().slice(0,10));
    acts.tick(now,{x:position.x,z:position.z,night:skyNight>.5,sleighOn:run?.id==='sleigh',horse:mounted?{x:mounted.root.position.x,z:mounted.root.position.z,yaw:mounted.root.rotation.y}:null,delta});
    for(const {f,h} of hostFigs)if(Math.hypot(h.x-position.x,h.z-position.z)<60)f.update(delta,{pose:'stand'});
    for(const m of farmEquids)if(Math.hypot(m.root.position.x-position.x,m.root.position.z-position.z)<70)m.update(delta);
    moonStep(delta);
    // Rain gear (v71): hosts carry umbrellas, your poncho goes on by itself outdoors (not inside a shop).
    {const wet=isRaining();for(const {f} of hostFigs)f.setGear?.({umbrella:wet,color:'#3f6fb3'});avatar.char.setGear?.({poncho:wet&&!inShop&&hasPoncho});mounted?.tack.character?.setGear?.({poncho:wet&&hasPoncho});}
    if(area==='outdoor'&&mounted){const d=doorNear(position.x,position.z,4);if(d&&doorTold!==d){doorTold=d;tell(d.shop.name+': horses wait outside. Press Interact to hop down.',4);}if(!d)doorTold=null;}
    cloudstep.tick(now);skiLift.tick(delta);legendsWorld.update(delta,legendCtx());valleyLife.update(delta,{x:position.x,z:position.z,area,night:skyNight,rain:isRaining()});
    if(area==='outdoor'){
      nearestPlace=LOCATIONS.map(l=>({...l,distance:Math.hypot(l.x-position.x,l.z-position.z)})).sort((a,b)=>a.distance-b.distance)[0];
      if(nearestPlace.distance<5&&(nearestPlace.id!=='summit'||adventure.summit))markVisit(nearestPlace);
      {const rg=regionAt(position.x,position.z);if(Math.abs(position.x)<=310&&Math.abs(position.z)<=310&&!adventure.regions.includes(rg.id)){adventure.regions.push(rg.id);saveAdventure();playLog('region',{id:rg.id});sfx('chime',{vol:.7});tell('☁️ '+rg.name+' explored ('+adventure.regions.length+' of 9)! The map clouds clear wherever you ride.',6);}}
      // Map fog: mark the 10 m cell you are in; saved at most every 3 s while you ride (world-map.js clears round each).
      {if(fogSrc!==adventure.fog){fogB=fogBits(adventure.fog);fogSrc=adventure.fog;}if(fogMark(fogB,position.x,position.z))fogDirty=true;if(fogDirty&&performance.now()-fogSaved>3000){fogDirty=false;fogSaved=performance.now();adventure.fog=fogSrc=fogString(fogB);saveAdventure();}}
      {const st=nearStation();if(st&&st.id!==nearStationId&&!herd.active)tell(st.icon+' '+st.name+' · press Interact to '+(st.kind==='herd'?'start herding (ride in)':'play')+'.',4);nearStationId=st?.id||null;}
      if(herd.round){const r=herd.update(delta,{x:position.x,z:position.z,mounted:!!mounted},(x,z,rad)=>blocked(x,z,rad,0,outdoorObstacles));
        if(r?.done){markDone('herd');const first=barnPayFirst('herd'),pay=first?r.reward:Math.max(3,Math.round(r.reward/4));const cid=queueCoins({from:'Grapevine Paddock',coins:pay,lines:['All foals penned in '+r.seconds.toFixed(1)+' s · '+pay+' 🪙'+(first?'':' (full pay again tomorrow)')]});tell('All foals penned in '+r.seconds.toFixed(1)+' seconds!'+(r.fresh?' New best!':' Best '+r.best.toFixed(1)+' s.'),7);if(cid)showCollect({title:'Foals safely home!',ids:[cid]});}
        else if(r)tell(r.penned+' of 4 foals in the pen',3);
        else if(Math.hypot(position.x-stations.paddock.x,position.z-stations.paddock.z)>stations.paddock.r+25){const was=herd.active;herd.stop();if(was)tell('You rode away, so the foals went back to grazing.',4);}}
      {const sv=SERVICES.find(s=>Math.hypot(s.x-position.x,s.z-position.z)-(s.id==='hoofhaven'?9:3)<5);if(sv&&sv.id!==nearService)tell(sv.icon+' '+sv.name+(touchy?' · tap it to go in.':' · click it or press F to go in.'),4);nearService=sv?.id||null;}
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
  // v101 (Yoshi on Android: "Press f but on phone? What is f?"): touch vs keyboard follows pointer:coarse at start, then
  // whatever was used last (a touch/pen tap = touch, a key or a mouse click = keyboard). Touch never sees a key name:
  // the pill IS the button. On a keyboard the key shows after the words as "(F)".
  let pillText='';
  function paintPrompt(text){const pill=$('#world-prompt');if(!pill)return;const plain=/^(Explore|Explore nearby)( · F)?$/.test(text)||talkingNow();
    const words=keyHint(text).replace(/^Cave · hop down first/,'Hop down to enter the cave');pill.classList.toggle('is-keep',/^Keep /.test(words));
    if(plain){pill.hidden=true;pillText='';return;}
    if(words!==pillText){pillText=words;pill.querySelector('span').textContent=words;pill.classList.toggle('is-muted',/hop down|first/i.test(words));pill.hidden=false;pill.classList.remove('pop');void pill.offsetWidth;pill.classList.add('pop');pill.setAttribute('aria-label',words);}}
  const talkingNow=()=>!!quests?.isTalking?.();
  function updateAdventureHUD(){const qlist=questList(adventure),done=qlist.filter(q=>q.have>=q.goal).length;$('#world-journal-count').textContent=done+'/'+qlist.length;$('#world-map-count').textContent=adventure.visited.length+'/'+LOCATIONS.length;
    let prompt=area==='barn'?'Barn games · F':'Explore · F';if(inMarket()){const st=nearStallHorse();prompt=nearMarketDoor()?'Back to the valley · F':nearMarketBook()?'Read the market book · F':st?(st.listing.id===keepOffer?'Keep '+st.listing.name+'? · F':st.listing.name+'’s clipboard · stats & test ride · F'):'Walk up to a horse';}else if(area==='barn'){if(inMyStall()&&companions[myIndex]?.area==='barn')prompt='Care for '+companions[myIndex].data.name+' · F';else if(nearDoor())prompt='Open the doors · F';else if(nearKeeper())prompt='Talk to '+SHOPKEEPER.name+' · F';else{const station=INDOOR_GAMES.find(g=>Math.hypot(g.x-position.x,g.z-position.z)<5);if(station)prompt=station.name+' · F';}}else if(nearestPlace?.distance<6)prompt=(nearestPlace.id==='stable'?'Enter barn':nearestPlace.id==='mountain'?'Cloudstep Climb':nearestPlace.id==='race'?'Race':nearestPlace.name)+' · F';if(area==='outdoor'){const lp=legendsWorld.prompt(legendCtx())||(nearestPlace?.distance<6?null:legendsWorld.stargazePrompt(legendCtx()));if(lp)prompt=lp+' · F';if(nearCave())prompt=(mounted?'Cave · hop down first':'Enter the cave')+' · F';}
    // What Interact will do here, spelled out (same order interact() checks): ski lift, cave, quest giver, game station, service.
    if(area==='outdoor'&&!nearCave()){if(skiLift.near(position.x,position.z))prompt='Ride the sky lift · F';else if(!legendsWorld.prompt(legendCtx())){const qg=quests?.near(position.x,position.z),st=!qg&&nearStation(),sv=!qg&&!st&&SERVICES.find(s=>Math.hypot(s.x-position.x,s.z-position.z)-(s.id==='hoofhaven'?9:3)<5);
      if(qg)prompt='Talk to '+qg.name+' · F';else if(st)prompt=(st.kind==='game'?'Play ':'')+st.name+' · F';else if(sv)prompt=(sv.id==='hoofhaven'?(mounted?.loaner?mounted.data.name+' · test ride':mounted?'Hop down to go in':'Enter Hoofhaven'):sv.name)+' · F';}
      if(mounted&&doorNear(position.x,position.z))prompt='Hop down to go in · F';{const n=nearAct();if(n)prompt=n.label+' · F';}}
    setButtonLabel('#world-interact',prompt);paintPrompt(prompt);
    if(inMarket())$('#world-location').textContent='Hoofhaven Horse Market';else if(area==='barn')$('#world-location').textContent='Inside your barn';else if(inShop)$('#world-location').textContent='Inside '+inShop.shop.name;else if(area==='outdoor'&&Math.hypot(position.x-FOUNTAIN.x,position.z-FOUNTAIN.z)<PLAZA_R+16)$('#world-location').textContent='Bramble Village';else if(area==='outdoor'&&inSnow(position.x,position.z)&&!(nearestPlace?.distance<12))$('#world-location').textContent='Snowy Pines';else if(nearestPlace?.distance<12)$('#world-location').textContent=nearestPlace.name;else if(wildBiome&&wildBiome!=='valley')$('#world-location').textContent=BIOMES[wildBiome].name;
    if(tracked){const target=LOCATIONS.find(l=>l.id===tracked),dist=Math.round(Math.hypot(target.x-position.x,target.z-position.z));$('#world-track').hidden=false;$('#world-track').textContent=target.name+' · '+dist+' m';
      // Compass arrow: the target's direction as seen through the camera (screen up = straight ahead).
      if(hud){camera.updateMatrixWorld();const a=_hudA.set(target.x,0,target.z).applyMatrix4(camera.matrixWorldInverse),b=_hudB.set(position.x,0,position.z).applyMatrix4(camera.matrixWorldInverse);hud.track(target.name,dist,Math.atan2(a.x-b.x,-(a.z-b.z)));}}
    else if(round&&hud){const c=round.course,t=round.started?c.fences[Math.min(round.i,c.jumps-1)]:{x:ARENA.x+ARENA.gateU,z:ARENA.z+ARENA.startV},dist=Math.round(Math.hypot(t.x-position.x,t.z-position.z));$('#world-track').hidden=true;   // the show ring: clock, faults and a compass to the next fence
      camera.updateMatrixWorld();const a=_hudA.set(t.x,0,t.z).applyMatrix4(camera.matrixWorldInverse),b=_hudB.set(position.x,0,position.z).applyMatrix4(camera.matrixWorldInverse);hud.track(roundStatus(round,position,performance.now()),dist,Math.atan2(a.x-b.x,-(a.z-b.z)));}
    // v108: nothing else to follow? The arrow points at your quest (the place to search, or who to take it back to).
    else if(area==='outdoor'&&hud&&quests?.activeTarget()){const t=quests.activeTarget(),dist=Math.round(Math.hypot(t.x-position.x,t.z-position.z));$('#world-track').hidden=true;
      camera.updateMatrixWorld();const a=_hudA.set(t.x,0,t.z).applyMatrix4(camera.matrixWorldInverse),b=_hudB.set(position.x,0,position.z).applyMatrix4(camera.matrixWorldInverse);hud.track(dist<10?(t.label||'Quest')+' · here!':(t.label||'Quest'),dist,Math.atan2(a.x-b.x,-(a.z-b.z)));}
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
    network=createWorldNetwork({getState(){/* the room server (202611110001) takes the nine regions (±310) and y≤110; v2 takes the wild land and the 100 m summit */const actor=mounted?mounted.root:avatar.root,wide=network?.v2,edge=v=>wide?Math.max(-19999,Math.min(19999,v)):Math.max(-309,Math.min(309,v));return {x:edge(position.x),z:edge(position.z),y:wide?Math.max(-20,Math.min(130,actor.position.y)):Math.max(-5,Math.min(109,actor.position.y)),yaw:actor.rotation.y,area,horseId:mounted?.data.id||null,horseName:safeName(mounted?.data.name||'',mounted?breedOf(mounted.data.breedId).name:'')};},onUpdate:renderPeers,onNotice(list){for(const n of list.slice(-3))tell(`👋 ${String(n.name||'A friend').slice(0,24)} joined you!`,5);sfx('chime');},onStatus(status,message){if(status==='connected'){$('#world-room-status').textContent=message;if(!roomConnected){let pj=null;try{pj=sessionStorage.getItem('trott-join-friend');sessionStorage.removeItem('trott-join-friend');}catch{}if(pj){roomConnected=true;void worldAPI.joinFriend(pj);return;}const others=(network.snapshot?.actors?.length||1)-1;tell(network.room?.public?(others?`${others} other rider${others===1?' is':'s are'} out in the valley. Tap one to see who they are.`:'You’re in the valley. Other riders show up here when they’re online.'):'Riding room connected.',5);}roomConnected=true;}else if(status==='solo'){roomConnected=false;$('#world-room-status').textContent='Solo playtest';}else if(status==='name'){if(!nameNagged){nameNagged=true;tell('Pick a username (Friends button) to meet other riders.',6);}}else if(status==='reconnecting')$('#world-room-status').textContent='Reconnecting…';},onProgress(remote){Object.assign(adventure,normalizeAdventure(remote));saveAdventure();}});
    // My valley (202611160002): friends.js calls these (Join on a friend, the valley switch, Explore, ride on your own).
    const dropNear=near=>{setArea('outdoor');if(!near||near.area==='barn'||!Number.isFinite(near.x)){moveTo(0,16);return;}
      for(const r of [4,6,8,10,12])for(let k=0;k<8;k++){const a=k/8*Math.PI*2,x=near.x+Math.cos(a)*r,z=near.z+Math.sin(a)*r;if(!isBlocked(x,z,mounted?.8:.4)){moveTo(x,z);return;}}moveTo(near.x,near.z);};
    const valleyError=e=>{const m=String(e?.message||e);return /HL_FRIEND_NOT_IN_WORLD/.test(m)?'They’re not riding in the valley right now.':/HL_ROOM_FULL/.test(m)?'Their valley is full (20 riders). Try again soon.':/HL_FRIEND_NOT_FRIENDS/.test(m)?'You can only join friends.':/HL_NO_OPEN_VALLEYS/.test(m)?'No open valleys right now. Try again later!':/HL_HOST_ONLY/.test(m)?'Only the valley’s owner can change that.':/HL_UNKNOWN_ACTION/.test(m)?'This needs a game server update that’s on its way.':roomError(e);};
    Object.assign(worldAPI,{
      valley:()=>{const r=network?.room;return r&&r.public?{name:r.name,privacy:r.privacy||'open',mine:!!r.mine,riders:network.snapshot?.actors?.length||1}:null;},
      async joinFriend(name){try{const data=await network.joinFriend(name);dropNear(data.near);tell(`You joined ${String(name).slice(0,24)}! 🐴`,5);return true;}catch(e){tell(valleyError(e),5);return false;}},
      async explore(){try{await network.explore();moveTo(0,16);tell('Welcome to '+(network.room?.name||'a new valley')+'!',5);return true;}catch(e){tell(valleyError(e),5);return false;}},
      async rideOwn(){try{await network.rideOwn();tell('Back in your own valley.',4);return true;}catch(e){tell(valleyError(e),5);return false;}},
      async setPrivacy(open){try{await network.setPrivacy(open);tell(open?'Your valley is open: other riders can find it (up to 20).':'Friends only: just your friends can join now.',5);return true;}catch(e){tell(valleyError(e),5);return false;}},
      friendsHere:()=>network?.friendsHere()||Promise.resolve([])});
    // friends.js reads this: invites need the world open; the race you're nearest is the default pick.
    window.TrottWorld=worldAPI;
    worldMap=createWorldMap(host,{obstacles:outdoorObstacles.filter(o=>!o.maze),visited:()=>adventure.visited,regions:()=>adventure.regions,fog:mapFog,player:()=>({x:position.x,z:position.z,h:(mounted?mounted.root:avatar.root).rotation.y}),info:mapInfo,quests:()=>quests?.mapPins()||[],today:()=>todayActivities({daily:adventure.daily||{},done:loadDone(),visited:adventure.visited,player:{x:position.x,z:position.z}}),snow:()=>({cover:sky.snowCover,fall:area==='outdoor'?sky.snowFall:0}),onRide:rideTo,onJump:jumpTo,onGo:goToQuest,onOpen:()=>{cancelWalk();closeCompactPanels();if(adventureUI?.dialog.open)adventureUI.close();quests?.endTalk();quests?.closeLog?.();},onClose:clearInput,
      // Smugglers' Grotto has no place of its own: its pin takes you to the Cloudstep Trailhead; then ride round the foot.
      extraPins:()=>[...SHOP_PINS,...ACT_PINS,{id:'grotto',name:"Smugglers' Grotto",x:CAVE.x,z:CAVE.z,kind:'secret',icon:'🕳️',go:'mountain',seen:!!adventure.grotto,description:'A smugglers’ cave in the cliff just past the Old Stone Arch. Hop down and walk in on foot.'}]});
    adventureUI=createAdventureUI(host,{progress:adventure,horses,preferred:preferredHorse,storageKey,area:()=>area,onTrack:id=>tracked=id,onTravel:travel,onEnterBarn:enterBarn,onShowMap:g=>worldMap.open(R(g.x,g.z))/* design-layout spots → nine-regions spots (Appleoosa is at the orchard now) */,onChange:saveAdventure,onGameComplete(id){const action={hay:'feed',water:'feed',feed:'feed',fling:'feed',groom:'groom',muck:'groom',tack:'bond'}[id];if(id==='hay')horses.forEach(h=>onBarnCare(h.id,action));else onBarnCare((mounted||called).data.id,action);if(id!=='feed'&&id!=='fling'){const first=barnPayFirst(id),coins=first?20:5;const cid=queueCoins({from:'Barn game',coins,lines:[first?'Barn game finished · 20 🪙':'Played again today · 5 🪙 (20 again tomorrow)']});if(cid)showCollect({title:'Lovely work!',ids:[cid]});}tell('Lovely work! Daily '+action+' care is shared with your web stable.');},onClose:clearInput});
    // Side quests (note #26, world-quests.js): givers around the valley, Talk, the Quest Log and the quest clock.
    quests=createWorldQuests({T,outdoors,groundY:(x,z)=>chunks.surfaceHeight(x,z),prep:seeThrough,tell,adventureUI,host:$('#world-stage')||host,camera,storageKey,onAccept:()=>{tracked=null;},onPin:a=>{const t=a.target||a;if(t&&t.x!=null)worldMap.open({x:t.x,z:t.z,quest:{title:a.title,todo:a.todo,label:t.label,icon:a.icon,px:a.px,left:a.secondsLeft}});else worldMap.open();}});
    hud=createHud({stage:$('#world-stage')||host});updateHUD();
    {const ib=$('#world-interact'),pl=document.createElement('button');pl.type='button';pl.id='world-prompt';pl.className='world-prompt';pl.hidden=true;const ic=ib.querySelector('.px-ic');pl.innerHTML=(ic?ic.outerHTML:'')+'<span></span>';ib.after(pl);on(pl,'click',()=>ib.click());const lb=document.createElement('button');lb.type='button';lb.id='world-loan';lb.className='world-prompt world-loan';lb.hidden=true;lb.innerHTML='<span>↩ Back to the stable</span><b class="world-loan-t" aria-label="time left">1:00</b>';pl.after(lb);on(lb,'click',()=>backToStall());}
    const tool=fn=>()=>{cancelWalk();closeCompactPanels();fn();};on($('#world-map'),'click',tool(()=>worldMap.open()));on($('#world-style'),'click',tool(()=>{designer=openDesigner(host,{horse:(mounted||companions.find(h=>h.root.visible)||companions[0])?.data||null,onSave(l,reverted){applyLook(l);tell(reverted?reverted+' is still locked, so you kept your last outfit. Earn Trotties in barn games and rides.':'Looking good! Your rider wears this on every horse.',5);},onClose(){designer=null;clearInput();view.focus({preventScroll:true});}});}));on($('#world-journal'),'click',tool(adventureUI.showQuests));on($('#world-barn'),'click',tool(adventureUI.showBarn));on($('#world-friends'),'click',tool(showFriends));on($('#world-interact'),'click',interact);
    on($('#world-race-start'),'click',startRoomRace);
    const fullButton=$('#world-fullscreen');
    function fullLabel(){const active=document.fullscreenElement===host||host.classList.contains('world-fullscreen');setButtonLabel('#world-fullscreen',active?'Exit browser fullscreen':'Enter browser fullscreen');document.body.classList.toggle('has-world-fullscreen',active);}
    on(fullButton,'click',async()=>{if(document.fullscreenElement===host){await document.exitFullscreen();}else if(host.classList.contains('world-fullscreen'))host.classList.remove('world-fullscreen');else{try{if(!host.requestFullscreen)throw Error();await host.requestFullscreen();}catch{host.classList.add('world-fullscreen');}}fullLabel();});on(document,'fullscreenchange',fullLabel);
    // On phones the world goes properly full screen as it opens (the tap that opened it still counts as a gesture); quietly skipped if refused.
    if(matchMedia('(pointer:coarse)').matches&&!document.fullscreenElement&&host.requestFullscreen)host.requestFullscreen({navigationUI:'hide'}).then(fullLabel,()=>{});on(window,'keydown',event=>{if(event.key==='Escape'&&host.classList.contains('world-fullscreen')){host.classList.remove('world-fullscreen');fullLabel();}});
    paintCounters();host.__world={npcs:()=>quests?.life?.()||[],callHorse:id=>callHorse(id),horses:()=>companions.map(h=>{let op=1;h.root.traverse(o=>{if(o.isMesh&&o.material&&!Array.isArray(o.material))op=Math.min(op,o.material.opacity);});return {id:h.data.id,vis:h.root.visible,arr:h.arriving?.gait||null,fade:h.arriving?.fade??null,op:+op.toFixed(2),d:+Math.hypot(h.root.position.x-position.x,h.root.position.z-position.z).toFixed(1)};}),tp:()=>TP.info(),tpSet:o=>TP._set(o),tpOpen:t=>TP.open(t),tpBuy:(id,f)=>TP.buy(id,f),tpDraw:(id,n)=>TP._draw(id,n),wb:()=>WB.info(),wc:()=>WC.info(),tt:()=>TT.info(),wd:()=>WD.info(),wn:()=>WN.info(),gt:()=>GT.info(),gtSet:o=>GT._set(o),gtTap:c=>({p:GT.prompt(c),r:GT.tap(c)}),wnSet:o=>WN._set(o),wnTap:c=>({p:WN.prompt(c),r:WN.tap(c)}),wnGo:(x,z)=>{position.x=x;position.z=z;},wdTap:c=>({p:WD.prompt(c),r:WD.tap(c)}),wdSet:o=>WD._set(o),ttKeeper:()=>TT.keeper(),ttSet:o=>TT._set(o),wcStar:()=>WC.starNow(),wcFox:()=>WC.foxSummon(),collections:()=>WB.open(),wa:()=>WA.info(),gust:()=>WA.gustNow(),moon:()=>moonPeg&&{state:moonPeg.state,t:moonPeg.t,vis:moonPeg.m.root.visible,p:moonPeg.m.root.position.toArray().map(v=>+v.toFixed(1))},state:()=>({area,mounted:mounted?.data.name,pos:{...position},horse:mounted?{...mounted.root.position,vis:mounted.root.visible,parent:mounted.root.parent?.type}:null,yaw,pitch}),market:(x,z,y,p)=>{if(caring)leaveCare();setArea("barn");moveTo(MARKET.x+x,MARKET.z+z);yaw=y;pitch=p;fillMarket();},barn:(x,z,y,p)=>{if(caring)leaveCare();setArea("barn");moveTo(x,z);yaw=y;pitch=p;},loanLeft:v=>{if(v!=null)loanLeft=v;return loanLeft;},enterMarket:()=>enterMarket(),dismount:()=>dismount(),backToStall:()=>backToStall(),interact:()=>interact(),companions:()=>companions.map(c=>c.data.name),testRide:id=>startTestRide(id??marketHorses[0]?.listing.id),vista:id=>openVista(LOOKOUTS.find(l=>l.id===id)),view:(x,z,y,p)=>{setArea("outdoor");moveTo(x,z);yaw=y;pitch=p;},leaveBarn:()=>leaveBarn(),enterBarn:()=>enterBarn(),outdoorsGroup:outdoors,arenaDemo(rails=[]){if(!round)return null;const c=round.course,go=(x,z,o,t)=>{const ev=stepRound(round,{x,z,...o},t);if(ev)arenaEvent(ev);return ev;};go(ARENA.x+ARENA.gateU,ARENA.z+ARENA.startV-1,{},0);go(ARENA.x+ARENA.gateU,ARENA.z+ARENA.startV+1,{},performance.now()-30000);let last;for(const f of c.fences.slice(0,c.jumps)){if(!round)break;const o={air:true,speed:rails.includes(f.n)?f.need-1:9};go(f.x-f.dx*.5,f.z-f.dz*.5,o,0);last=go(f.x+f.dx*.5,f.z+f.dz*.5,o,performance.now());}return last?.result||null;},setHours(h){sky.preview.hours=h;},advance(steps=1,dt=1/30){for(let i=0;i<steps;i++){const t=performance.now();lastTime=t-dt*1000;frame(t);cancelAnimationFrame(raf);}},snap(){renderer.render(scene,camera);return renderer.domElement.toDataURL('image/jpeg',.7);},legends:legendsWorld,sky,actorObj:()=>mounted?mounted.root:avatar.root,mountCalled:()=>{const h=called;h.root.position.set(position.x+1.5,groundY(position.x+1.5,position.z),position.z);mount(h);return mounted?.data.id||null;},walkTo:(x,z)=>walkTo({x,z}),tap:(x,y)=>requestWalk(x,y),gfxInfo:()=>{renderer.info.autoReset=false;renderer.info.reset();renderer.render(scene,camera);const i=renderer.info.render;renderer.info.autoReset=true;return {calls:i.calls,tris:i.triangles,pretty};},rideParts(){if(!mounted)return null;const r=renderer.domElement.getBoundingClientRect(),h=mounted,sc=v=>{v.project(camera);return {x:Math.round(r.left+(v.x+1)/2*r.width),y:Math.round(r.top+(1-v.y)/2*r.height)};};const a=new T.Vector3();h.anchor.getWorldPosition(a);a.y+=.75*(h.scale||1);return {rider:sc(a),head:sc(h.head.localToWorld(new T.Vector3(0,-.25,.38))),whinnying:h.model.whinnying};},walking:()=>!!walkGoal,enterSky:()=>enterSky(),skyTo:(x,y,z)=>{if(skyRide){skyRide.x=x;skyRide.y=y;skyRide.z=z;}},skyRings:()=>skyWorld?.rings.map(r=>[r.x,r.y,r.z]),leaveSky:()=>leaveSky(),skyState:()=>skyRide&&{x:+skyRide.x.toFixed(1),y:+skyRide.y.toFixed(1),z:+skyRide.z.toFixed(1),ring:skyRide.ring,stars:skyRide.stars},camera,cam:()=>({x:+camera.position.x.toFixed(1),y:+camera.position.y.toFixed(1),z:+camera.position.z.toFixed(1)}),teleport:(x,z,y)=>{setArea('outdoor');moveTo(x,z);if(y!=null)yaw=y;},cave:CAVE,blocked:(x,z,r=.6)=>isBlocked(x,z,r),life:valleyLife,lift:()=>({on:skiLift.isOn(),chair:chair?{end:chair.end,p:+chair.ride.progress().toFixed(3),y:+chairY.toFixed(1)}:null,near:skiLift.near(position.x,position.z),L:skiLift.layout.L}),skiLift,boardLift,actor(){const a=mounted?mounted.root:avatar.root;return {y:+a.position.y.toFixed(2),g:+groundY(position.x,position.z).toFixed(2),x:+position.x.toFixed(1),z:+position.z.toFixed(1),yaw:+yaw.toFixed(2),area,climb:!!climb,phi:climbPhi};},race:()=>raceClimb(),probe(x,z){const rc=new T.Raycaster(new T.Vector3(x,400,z),new T.Vector3(0,-1,0));rc.camera=camera;const hits=rc.intersectObjects(scene.children,true).filter(h=>h.object.isMesh&&h.object.visible&&!h.object.isSprite).slice(0,3).map(h=>({y:+h.point.y.toFixed(2),n:h.object.name||h.object.parent?.name||h.object.geometry?.type}));return {g:+groundY(x,z).toFixed(2),hits};},moveTo,interact,outdoor:()=>setArea('outdoor'),barnDoor:()=>expansion.door,sliding:()=>!!slide,look:(y,p)=>{yaw=y;if(p!=null)pitch=p;},riding:()=>mounted?.data.id||null,motion:()=>({speed:+moveSpeed.toFixed(2),gait:(mounted||called).model.gait,stick:!!stick,x:+position.x.toFixed(1),z:+position.z.toFixed(1)}),peerOnScreen(name){const p=[...peers.values()].find(q=>q.name===name&&q.group.visible);if(!p)return null;const r=renderer.domElement.getBoundingClientRect(),v=new T.Vector3(p.group.position.x,p.group.position.y+(p.mounted?1.6:1),p.group.position.z).project(camera);return {x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height};},horseOnScreen(id){const h=companions.find(c=>c.data.id===id)||called,r=renderer.domElement.getBoundingClientRect(),v=new T.Vector3(h.root.position.x,h.root.position.y+1.9*h.scale,h.root.position.z).project(camera);return {x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height,id:h.data.id};}};markVisit(LOCATIONS[0]);startInStall();if(enterCare())startNote='';void network.loadProgress(adventure);{let pending=null;try{pending=JSON.parse(sessionStorage.getItem('trottville-join')||'null');sessionStorage.removeItem('trottville-join');}catch{}if(pending&&Date.now()-pending.at<120000)void joinRace(pending);else void network.resume();}updateAdventureHUD();if(intent){const [kind,id]=intent.split(':');if(kind==='game'){const g=BARN_GAMES.find(x=>x.id===id);if(g?.where==='outdoor')worldMap.open({x:g.x,z:g.z});else adventureUI.showGame(id);}else if(kind==='map')worldMap.open();else if(kind==='me')$('#world-style').click();else if(kind==='tackroom'){if(walkTo(TACK_SPOT)){doOnArrival=()=>talkToOtis();tell('Walking to Otis in the Tack Room.',3);}}else if(kind==='steeple')openSteeple();else if(kind==='barn')adventureUI.showBarn();}
  }

  // The wild lands: keep chunks loaded around you, move the sun (and its shadows) with you, tint the sky to
  // the biome and say its name when you cross into a new one.
  let wildBiome='valley',wildCheck=0,leftValley=false,cameraLift=0,altitude=0;
  function updateWild(delta,now){chunks.update(position.x,position.z,false,altitude>.5?1:0);grass.update(position.x,position.z);
    if(now-wildCheck>500){wildCheck=now;const b=biomeAt(position.x,position.z);if(b!==wildBiome){if(b!=='valley'){if(!leftValley){leftValley=true;tell('You left the valley. The land goes on forever; the map always brings you home.',6);}else tell(BIOMES[b].name,3.5);}else tell('Back in the valley.',3);wildBiome=b;}}
    }
  function frame(now){if(disposed)return;raf=requestAnimationFrame(frame);const delta=Math.max(0,Math.min((now-lastTime)/1000,.05));lastTime=Math.max(lastTime,now);if(document.hidden)return;
    const paused=!!adventureUI?.dialog.open||!!steeple||!!worldMap?.isOpen||!!designer;
    if(!paused){if(keys.has('arrowleft'))yaw+=delta*1.6;if(keys.has('arrowright'))yaw-=delta*1.6;if(keys.has('arrowup'))pitch=Math.max(.08,pitch-delta*.8);if(keys.has('arrowdown'))pitch=Math.min(.8,pitch+delta*.8);}
    const horizontal=paused?0:(keys.has('d')?1:0)-(keys.has('a')?1:0);
    const forward=paused?0:(keys.has('w')?1:0)-(keys.has('s')?1:0);
    // Speed builds up naturally: the thumbstick sets it by how far you drag, a tapped route by how far is left to go.
    let sx=horizontal,sz=forward,target=0;
    if(sx||sz)target=keys.has('shift')?(mounted?9:7.2):(mounted?5.2:3.25);
    else if(stick&&!paused){const len=Math.hypot(stick.dx,stick.dy);if(len>14){const m=Math.min(1,(len-14)/96);sx=stick.dx/len;sz=-stick.dy/len;target=mounted?2.2+m*7.6:1.4+m*5.8;}}
    if(skyRide){if(stick&&!paused){const len=Math.hypot(stick.dx,stick.dy);if(len>14){const m=Math.min(1,(len-14)/96);sx=stick.dx/len*m;sz=-stick.dy/len*m;}}skyStep(delta,now,sx,sz,paused);return;}
    else if(walkGoal){let left=walkPath.length?Math.hypot(walkPath[0].x-position.x,walkPath[0].z-position.z):0;for(let i=1;i<walkPath.length;i++)left+=Math.hypot(walkPath[i].x-walkPath[i-1].x,walkPath[i].z-walkPath[i-1].z);target=mounted?(left>18?9.4:left>7?5.4:2.6):(left>14?7.2:3.25);}
    if(!mounted&&target>3.2&&area==='outdoor'&&legendsWorld.hush?.(position.x,position.z))target=3.2;   // v139: tiptoe near a shy legend
    if(mounted&&ride)target=G.allowedSpeed(target,ride.stamina,ride.stats);
    if(target>0&&mounted)target*=WA.speedFactor(performance.now(),ride?.heading??mounted.root.rotation.y);
    if(target>0&&mounted&&!mounted.loaner)target*=G.trustSpeed(trustOf(mounted.data.id));   // v124: a trusting horse goes a touch faster
    if(target>0)moveSpeed=Math.max(moveSpeed,mounted?1.8:1.2);moveSpeed+=(target-moveSpeed)*(1-Math.exp(-delta*(target>moveSpeed?(mounted?1.5:2.6):4)));
    const fast=moveSpeed>(mounted?7:4.4);let speed=moveSpeed*(area==='outdoor'?G.gripSpeed(sky.fx.speed,mounted&&ride?ride.shoes.grip:0):1),v=movementVector(sx,sz,yaw);
    // v150 (Yoshi: "horse running should be pretty fast"): free-roam gallop covers 40% more ground. Timed runs, rounds,
    // the steeplechase and the corn maze keep the old pace (race times, jump timing and saddle balance unchanged).
    sprintK=mounted&&moveSpeed>7&&area==='outdoor'&&!run&&!round&&!steepleRace&&!inMaze(position.x,position.z)?1+.4*Math.min(1,(moveSpeed-7)/2):1;speed*=sprintK;
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
      // Cloudstep (2026-11-13, Yoshi: "if you walk off the path ... slide down to the level below, making it risky"):
      // stepping over the outer edge of a ledge sends you skidding down the cliff to the ledge (or foot) below.
      // The cliff above you still stops you.
      const here=cloudstepAt(position.x,position.z),ahead=cloudstepAt(ax,az);
      if(here&&ahead&&here.h!=null&&ahead.h!=null&&(here.region==='ledge'||here.region==='summit'||here.region==='cap')&&['cliff','skirt','cap'].includes(ahead.region)&&ahead.r>here.r&&ahead.h<here.h-.2){
        const ox=position.x-CLOUDSTEP.cx,oz=position.z-CLOUDSTEP.cz,ol=Math.hypot(ox,oz)||1;slide={ledge:true,t:0,speed:Math.max(9,speed),x:ox/ol,z:oz/ol,fromH:here.h};moveSpeed*=.2;canter=false;cancelWalk();
        adventure.mountainFalls=(adventure.mountainFalls||0)+1;saveAdventure();sfx('bonk');tell(`Whoa! ${mounted?mounted.data.name+' slips':'You slip'} off the trail and slide${mounted?'s':''} down the mountain!`,4);}
      else       if(tooSteep(ax,az)){const up=groundHeight(ax,az)>groundHeight(position.x,position.z);slide={up,t:0,speed:up?Math.max(4,speed*.8):Math.max(5,speed*.9),x:0,z:0,from:{x:ax,z:az}};moveSpeed*=.3;cancelWalk();
        if(now>steepToldAt){steepToldAt=now+6000;tell(up?`Too steep to climb! ${mounted?mounted.data.name+' slid':'You slid'} back down.`:`Whoa! ${mounted?mounted.data.name+' skids':'You skid'} down the slope.`,3);}}}
    if(slide?.ledge){slide.t+=delta;const s0=cloudstepAt(position.x,position.z);
      const landed=!s0||s0.h==null||((s0.region==='ledge'||s0.region==='foot'||s0.region==='outside')&&slide.t>.15&&s0.h<slide.fromH-.5);
      if(landed||slide.t>7||area!=="outdoor"){if(landed&&slide.t<=7)tell('Phew, safe on the ledge below. Stay on the trail!',3);slide=null;}
      else{const ox=position.x-CLOUDSTEP.cx,oz=position.z-CLOUDSTEP.cz,ol=Math.hypot(ox,oz)||1;slide.x=ox/ol;slide.z=oz/ol;const step=slide.speed*Math.min(delta,.05),before={x:position.x,z:position.z};
        position.x+=slide.x*step;position.z+=slide.z*step;distance+=Math.hypot(position.x-before.x,position.z-before.z);dust.emit(position.x,groundY(position.x,position.z),position.z,delta,1.4);}}
    else     if(slide){slide.t+=delta;const at=slide.t<.05&&slide.up?slide.from:position,g=slopeAt(at.x,at.z),l=Math.hypot(g.gx,g.gz)||1;
      if(slide.t<.05||tooSteep(position.x,position.z)){slide.x=-g.gx/l;slide.z=-g.gz/l;}
      const steepHere=tooSteep(position.x,position.z),k=steepHere?1:Math.max(0,1-(slide.t-(slide.flatAt??slide.t))/.5);if(!steepHere&&slide.flatAt==null)slide.flatAt=slide.t;
      const step=slide.speed*k*Math.min(delta,.05),nx=position.x+slide.x*step,nz=position.z+slide.z*step,r=mounted?.7:.36;
      const before={x:position.x,z:position.z};if(!solidBlocked(nx,position.z,r,0,outdoorObstacles))position.x=nx;if(!solidBlocked(position.x,nz,r,0,outdoorObstacles))position.z=nz;
      distance+=Math.hypot(position.x-before.x,position.z-before.z);dust.emit(position.x,groundY(position.x,position.z),position.z,delta,.4+k);
      if(k<=0||slide.t>8||area!=='outdoor')slide=null;}
    dust.update(delta);
    // v111: hoof dust at a gallop, splashes through rivers, pollen and petals in the air (motes, world-sky.js).
    if(area==='outdoor'&&!skyRide){const gy=groundY(position.x,position.z),fast=mounted&&moveSpeed>6&&jump<=0;
      if(moveSpeed>2.5){const rv=riverAt(position.x,position.z);if(rv.r&&rv.d<rv.r.w/2+.2&&!bridgeFloor(position.x,position.z)){if(Math.random()<delta*(mounted?26:12))motes.emit('splash',position.x,gy+.15,position.z,3);}
        else if(fast)dust.emit(position.x,gy,position.z,delta,.18*Math.min(1.6,(moveSpeed-6)/5+.4));}
      if(now-petalAt>600){petalAt=now;let best=null,bd=18;for(const t of petalTrees){const d=Math.hypot(t.x-position.x,t.z-position.z);if(d<bd){bd=d;best=t;}}petalNear=best;}
      const sunny=sky.kind==='clear'?1:sky.kind==='partly'?.6:0,pt=petalNear;
      motes.update(delta,pretty?{x:position.x,y:gy,z:position.z,sunny,night:skyNight,petal:pt?.color||null,px:pt&&pt.x+(Math.random()-.5)*3*pt.s,py:pt&&groundY(pt.x,pt.z)+3.2*pt.s,pz:pt&&pt.z+(Math.random()-.5)*3*pt.s}:null);}
    else motes.update(delta,null);
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
    if(!paused)spreadHorses(delta);
    companions.forEach((h,i)=>{if(h.arriving&&!paused)arrive(h,delta);const isRiding=h===mounted,isMoving=isRiding&&distance>.001,idle=!isRiding&&!h.arriving&&h.area==='outdoor'&&area==='outdoor'&&h.root.visible&&!paused;if(!idle){h.home=null;if(h.wander)h.wander.to=null;}const gait=h.arriving?h.arriving.gait:idle?idleHorse(h,delta):isMoving?(moveSpeed>7?'canter':moveSpeed>3.6?'trot':'walk'):'stand';if(h.model.gait!==gait)h.model.setGait(gait);let steerK=0;if(isRiding){const yw=h.root.rotation.y,py=h._py??yw;h._py=yw;const rate=Math.atan2(Math.sin(yw-py),Math.cos(yw-py))/Math.max(delta,1e-3);h._st=(h._st||0)+((Math.max(-1,Math.min(1,rate/1.6))*(isMoving?1:.5))-(h._st||0))*Math.min(1,delta*8);steerK=h._st;}else h._py=null;h.model.steer?.(steerK);if(h.root.visible){h.model.update(isRiding&&gait==='gallop'&&sprintK>1?delta*1.2:delta);h.tack.update(delta,{jumpT:h.model.jumpT,speed:{stand:0,walk:.2,trot:.4,canter:.7,gallop:1}[gait],steer:isRiding?steerK:0});}h.root.visible=h.area===area&&!(caring&&i===myIndex);h.name.visible=h.root.visible&&h!==mounted&&area!=='barn'&&h.arriving?.fade==null;h.name.position.set(h.root.position.x,h.root.position.y+4.5*h.scale,h.root.position.z);});
    // v151: left alone on foot outdoors for 25 s, your rider sits down on the grass; any move gets her up.
    restFor=(moving||mounted||chair||area!=='outdoor'||talkK>.05)?0:restFor+delta;
    if(!mounted)avatar.update(delta,{pose:chair?'sit':moving?'walk':'stand',fast:fast&&moving,speed:moveSpeed,act:restFor>25?'grass':null});
    // v132: your footsteps on foot (recorded loops, speed follows yours): wood in the barn and on bridges, stone on
    // Thimbleford's cobbles, snow on snowy ground, grass/dirt everywhere else. Quieter than hooves.
    {const walking=!mounted&&!chair&&!skyRide&&!paused&&moving&&distance>.001&&jump<=.001&&!climb;stepHold=walking?.2:stepHold-delta;
     const surf=area==='barn'?'stepWood':onBridge(position.x,position.z,.2)?'stepWood':onCobbles(position.x,position.z)?'stepStone':(sky.snowCover>.4||wildBiome==='snow')?'stepSnow':'stepGrass';
     ambLoop('steps',stepHold>0?surf:null,fast?1:.8,Math.max(.75,Math.min(1.5,moveSpeed/3.25)));}
    // Hoofbeats: one beat per stride (walk 1, trot 2, canter 3 quick hits), on boards in the barn, turf outside.
    // v129: outdoors, trot and canter play a recorded hoofbeat loop (sfx.js hoofLoop) whose speed follows moveSpeed; a short hold
    // stops it flickering on a still frame. Walk, the barn boards and the moments before the clip decodes keep the synth hits.
    // v130: walking on a wooden bridge or Thimbleford's cobbles plays its own recorded walk loop (rate = moveSpeed/2.6).
    const walkSurf=mounted&&mounted.model.gait==='walk'&&area==='outdoor'?(onBridge(position.x,position.z,.2)?'bridge':onCobbles(position.x,position.z)?'cobble':null):null;
    const gaitLoop=mounted&&!paused&&area!=='barn'&&jump<=.001&&({trot:'trot',canter:'canter'}[mounted.model.gait]||walkSurf);
    hoofHold=gaitLoop&&distance>.001?.25:hoofHold-delta;
    const looping=hoofLoop(gaitLoop&&hoofHold>0?gaitLoop:null,gaitLoop==='canter'?moveSpeed/9:gaitLoop==='trot'?moveSpeed/5.2:moveSpeed/2.6);
    if(mounted&&distance>.001&&jump<=.001&&!paused&&!looping){hoofDist+=distance;const g=mounted.model.gait,stride={walk:1.25,trot:2,canter:3.1}[g];
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
    {const tv=area==='outdoor'&&quests?.isTalking()?quests.talkView([...companions.filter(h=>h.root.visible).map(h=>({x:h.root.position.x,z:h.root.position.z,r:1.6*h.scale})),].filter(o=>!mounted||Math.hypot(o.x-position.x,o.z-position.z)>.5),{x:position.x,z:position.z,y:groundY(position.x,position.z),mounted:!!mounted,scale:mounted?.scale||1}):null;if(tv){talkPos.copy(tv.pos);talkLook.copy(tv.look);if(!moving){const a=Math.atan2(tv.face.x-position.x,tv.face.z-position.z),d=Math.atan2(Math.sin(a-actor.rotation.y),Math.cos(a-actor.rotation.y));actor.rotation.y+=d*Math.min(1,delta*6);}}
      talkK+=((tv?1:0)-talkK)*(reducedMotion?1:1-Math.exp(-delta*3.2));if(talkK<.002)talkK=0;
      if(talkK){const k=talkK*talkK*(3-2*talkK);_talkAt.copy(cameraTarget).lerp(talkLook,k);camera.position.lerp(talkPos,k);camera.lookAt(_talkAt);sightU.uSightA.value.copy(camera.position);sightU.uSightB.value.copy(_talkAt);}}
    // A lookout (treehouse, lighthouse lamp): the camera climbs up for the view; any movement brings it back down.
    {if(vista&&moving)vista=null;vistaK+=((vista?1:0)-vistaK)*(reducedMotion?1:1-Math.exp(-delta*2.4));if(vistaK<.002)vistaK=0;
      if(vistaK){const k=vistaK*vistaK*(3-2*vistaK);_talkAt.copy(cameraTarget).lerp(vistaLook,k);camera.position.lerp(vistaPos,k);camera.lookAt(_talkAt);sightU.uSightA.value.copy(camera.position);sightU.uSightB.value.copy(_talkAt);}}
    // The barn: the doors' swing, Hazel's greeting as you walk into the shop, and no horses past the shop door.
      if(inMarket())for(const m of marketHorses)m.model.update(delta);tickLoan();tickTapRings(delta);
      if(area==='barn'){expansion.door.update(delta);keeper?.update(delta,{pose:'stand'});
        const shop=inStore(position.x,position.z);if(shop!==wasInShop&&!mounted)sfx(shop?'doorOpen':'doorClose',{vol:.7});if(shop&&!wasInShop&&!mounted){npcVoice('woman','greet',{delay:.4});tell(SHOPKEEPER.name+': '+shopGreeting({hours:sky.hours,weather:sky.kind,visits:hazel.visits,outfit:outfitOf(look).name}),5);hazel.visits++;saveHazel();}wasInShop=shop;
        if(mounted&&position.x>HALL_X-1.4&&Math.abs(position.z-STORE.doorZ)<2.1&&performance.now()/1000-lastNoHorse>6){lastNoHorse=performance.now()/1000;tell(SHOPKEEPER.name+': '+NO_HORSES[Math.floor(lastNoHorse)%NO_HORSES.length],4);}}
      const skyNow=sky.update(delta,{x:position.x,y:area==='outdoor'?groundY(position.x,position.z):0,z:position.z,biome:wildBiome==='valley'?'meadow':wildBiome,tint:wildBiome==='valley'?null:BIOMES[wildBiome].sky,outdoors:area==='outdoor',forest:forestAt(position.x,position.z,wildBiome),falls:Math.hypot(position.x-SILVER_FALLS.x,position.z-SILVER_FALLS.z)});
      // People are unlit toon: give them the sky's light (full by day, moonlit blue at night; barn light inside).
      {const L=Math.min(1,Math.max(.3,(hemi.intensity+sun.intensity*.5)/3.75));_pl.setRGB(1,1,1).lerp(hemi.color,(1-L)*.55).multiplyScalar(L);setPeopleLight(_pl);}skyNight=skyNow.night??0;glowK=area==='outdoor'?skyNow.glow||0:0;
      // v93: the barn's daylight and the stall's warm lights cross-fade over the camera glide (no jump in wall colour).
      {const goal=caring&&area==="barn"?1:0;if(careMix!==goal)careMix=reducedMotion?goal:Math.max(0,Math.min(1,careMix+Math.sign(goal-careMix)*delta/1.2));const e=careMix*careMix*(3-2*careMix);
       sun.intensity*=1-e;hemi.intensity*=1-e;sun.visible=hemi.visible=e<1;renderer.toneMappingExposure=1.38-.18*e;care?.lightMix(e);}snowU.uSnow.value=area==='outdoor'?skyNow.cover:0;
    // High on Cloudstep the haze thins and the view opens out over the valley (and the ground streams further).
    altitude=area==='outdoor'?Math.min(1,Math.max(0,cameraTarget.y-12)/70):0;scene.fog.near+=altitude*70;scene.fog.far+=altitude*140;camera.far=260+altitude*150;camera.updateProjectionMatrix();
    if(cornActive!==(area==='outdoor')){cornActive=area==='outdoor';corn.setActive(cornActive);}
    if(cornActive)for(const ev of corn.update(delta,{x:position.x,z:position.z,y:groundY(position.x,position.z)+jump,heading:(mounted?mounted.root:avatar.root).rotation.y,mounted:!!mounted,jump},0))cornEvent(ev);
    quests?.update(delta,{x:position.x,z:position.z,mounted:!!mounted,speed:moveSpeed,area,rain:isRaining()});
    {const fw=camera.getWorldDirection(_lanternDir);lanterns.update(skyNow.night??0,{x:position.x,y:area==='outdoor'?groundY(position.x,position.z):0,z:position.z,outdoors:area==='outdoor',fx:fw.x,fz:fw.z,h:mounted?2.05:1.05,t:now/1000});}
    if(skyNow.labelChanged)$('#world-weather').textContent=skyNow.label;if(skyNow.changed&&!paused)tell(WEATHER_NEWS[skyNow.kind],6);
    if(morph)stepMorph(delta);
    if(!caring)care?.idle(now);
    if(caring){if(stick||['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].some(k=>keys.has(k)))leaveCare();else{const look=care.tick(now);careLook.copy(look);sightU.uSightA.value.copy(camera.position);sightU.uSightB.value.copy(look);}}
    else if(careBlend){careBlend.t=Math.min(1,careBlend.t+delta/1.3);const t=careBlend.t,e=t*t*(3-2*t);_cbP.copy(camera.position);
      // Swing round the horse (angle, radius and height eased separately) so the camera never passes through it.
      {const T0=cameraTarget,sx=careBlend.pos.x-T0.x,sz=careBlend.pos.z-T0.z,ex=_cbP.x-T0.x,ez=_cbP.z-T0.z,a0=Math.atan2(sx,sz);let da=Math.atan2(ex,ez)-a0;da=Math.atan2(Math.sin(da),Math.cos(da));
        const r=Math.hypot(sx,sz)+(Math.hypot(ex,ez)-Math.hypot(sx,sz))*e,a=a0+da*e;camera.position.set(T0.x+Math.sin(a)*r,careBlend.pos.y+(_cbP.y-careBlend.pos.y)*e,T0.z+Math.cos(a)*r);/* v99: the swing stays inside the barn's back wall */if(area==='barn')camera.position.x=Math.max(camera.position.x,-18.7);}
      _cbL.lerpVectors(careBlend.look,cameraTarget,e);camera.lookAt(_cbL);const f=careBlend.fov+(58-careBlend.fov)*e;if(Math.abs(camera.fov-f)>.01){camera.fov=f;camera.updateProjectionMatrix();}
      sightU.uSightA.value.copy(camera.position);sightU.uSightB.value.copy(_cbL);if(t>=1)careBlend=null;}
    if((!paused||morph?.phase==='fade')&&(!renderer.simpleGraphics||now-lastRender>=100)){flareStep(now,delta);WA.step(now,delta);WB.step(performance.now(),delta);WC.step(performance.now(),delta);TT.step(performance.now());WD.step(performance.now(),delta);WN.step(performance.now());GT.step(performance.now());windU.uWind.value=WATER_TIME.value=now/1000;WATER_NIGHT.value=skyNight;gfxWatch(now);if(glow&&(pretty||glowK>.02)){try{glow.render(scene,camera,{night:area==='outdoor'?skyNight:0,moon:glowK});}catch(err){console.warn('night glow off',err);glow=null;renderer.setRenderTarget(null);renderer.render(scene,camera);}}else renderer.render(scene,camera);lastRender=now;}
    if(now-lastHUD>180){lastHUD=now;updateHUD();updateAdventureHUD();if(now>messageUntil)$('#world-message').classList.add('quiet');}
  }
  installAdventure();updateHUD();if(!caring)tell(startNote?startNote+' Drag to steer · two fingers to look.':'Tap to go · Press and drag to steer · Two fingers to look.',startNote?8:5);frame(performance.now());
  // ready: the first frame has been drawn (drawing it compiles every visible shader), so the shell can drop its
  // cover onto a finished picture. Two animation frames = frame() has rendered at least once.
  const ready=new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  return {ready,dispose(){disposed=true;hoofLoop(null);ambStop();resetPeopleLight();for(const m of farmEquids)m.dispose?.();window.removeEventListener('ranch:testride',onTestRide);for(const h of marketHorses)h.model.dispose?.();try{glow?.dispose();}catch{}try{care?.dispose();}catch{}lanterns.dispose();quests?.dispose();hud?.dispose();corn.dispose();skiLift.dispose();legendsWorld.dispose();valleyLife.dispose();worldAPI.open=false;if(window.TrottWorld===worldAPI)window.TrottWorld=null;window.TrottActivity='roaming';if(document.fullscreenElement===host)document.exitFullscreen?.().catch(()=>{});sky.dispose();homeStall.dispose();expansion.disposeBarn?.();expansion.lands?.dispose();skyWorld?.dispose();keeper.dispose?.();mannequins.forEach(m=>m.dispose?.());try{audio?.close();}catch{}document.body.classList.remove('has-world-fullscreen');if(document.fullscreenElement===host)document.exitFullscreen().catch(()=>{});cancelAnimationFrame(raf);observer.disconnect();adventureUI?.dispose();network?.dispose();listeners.forEach(remove=>remove());chunks.dispose();stations.dispose();cloudstep.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}};
}
