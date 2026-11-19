// A small 3D stage for one horse: the same cel-shaded sculpted horse as the home page, slowly turning on a
// patch of grass. Used by the sign-up screen (pick your first horse). snapshot(h) renders another horse
// into a still image with the same renderer (breed cards), so the page needs only one WebGL context.
import * as T from './vendor/three-0.180.0/three.module.js?v=158';
import {makeSculptedHorse} from './horse-sculpt.js?v=158';
import {addTackAndRider} from './rider-sculpt.js?v=158';

// rider: a plain grey rider sits in the saddle to show the horse's real size (the rider is one size on every horse,
// see rider-sculpt.js), so a pony reads as small. setRider(false) takes it off. Stills never include it.
export function createHorseViewer({horse,label='Your horse',rider:showRider=true}={}){
  const el=document.createElement('div');el.className='horse-viewer';
  el.innerHTML=`<canvas role="img" aria-label="${label}"></canvas>`;
  const canvas=el.querySelector('canvas');
  let renderer;try{renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true});}catch{return null;}
  renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(30,1,.1,80);
  const sun=new T.DirectionalLight('#fff1d6',3.2);sun.position.set(-5,9,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-6,right:6,top:5,bottom:-2,near:1,far:30});scene.add(sun,new T.HemisphereLight('#f2fbff','#93b26a',2));
  const grass=new T.Mesh(new T.CircleGeometry(4.2,48),new T.MeshStandardMaterial({color:'#a8d486',roughness:1}));grass.rotation.x=-Math.PI/2;grass.receiveShadow=true;scene.add(grass);
  const turn=new T.Group();scene.add(turn);
  const YAW=-.62;let model=null,current=null,spin=0,raf=0,last=performance.now(),visible=true;
  function build(h,idle=false){const m=makeSculptedHorse(T,h,{style:'cel',idle});m.root.traverse(o=>{if(o.isMesh)o.castShadow=true;});m.setGait('stand');return m;}
  const ghost=new T.MeshBasicMaterial({color:'#8a928e'}),ghostInk=new T.MeshBasicMaterial({color:'#4a514e',side:T.BackSide});
  let tack=null;
  function dress(){tack?.dispose();tack=null;if(!model||!showRider)return;
    tack=addTackAndRider(T,model,{});
    for(const g of [tack.rider,tack.saddleGroup,...model.root.children.filter(o=>o.isMesh&&o.geometry?.type==='CylinderGeometry')])g.traverse(o=>{if(!o.isMesh)return;
      const line=o.material?.side===T.BackSide;o.material=line?ghostInk:ghost;o.castShadow=!line;});}
  function setHorse(h){tack?.dispose();tack=null;if(model){turn.remove(model.root);model.dispose();}model=build(h,true);turn.add(model.root);current=h;dress();canvas.setAttribute('aria-label',label);}
  function setRider(on){showRider=!!on;dress();}
  function frame(w,h,zoom=1){renderer.setSize(w,h,false);camera.aspect=w/h;const fit=Math.max(1,1.05/camera.aspect);camera.position.set(.4,3.2,12*fit/zoom);camera.lookAt(.1,2.2,0);camera.updateProjectionMatrix();}
  function resize(){const r=el.getBoundingClientRect();if(r.width)frame(r.width,r.height);}
  const ro=new ResizeObserver(resize);ro.observe(el);
  const io=new IntersectionObserver(([e])=>{visible=e.isIntersecting;});io.observe(el);
  // Drag to turn the horse yourself; it drifts back to a slow spin when you let go.
  let dragX=null;
  canvas.addEventListener('pointerdown',e=>{dragX=e.clientX;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(dragX==null)return;spin+=(e.clientX-dragX)*.012;dragX=e.clientX;});
  const up=()=>{dragX=null;};canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  function loop(now){const dt=Math.min(.1,(now-last)/1000);last=now;
    if(visible&&model){if(dragX==null)spin+=dt*.35;turn.rotation.y=YAW+Math.sin(spin)*.9;model.update(dt);tack?.update(dt);renderer.render(scene,camera);}
    raf=requestAnimationFrame(loop);}
  // A still of another horse (same stage, square), for the breed cards.
  function snapshot(h,size=256){if(tack)tack.rider.visible=tack.saddleGroup.visible=false;const keep=model,keepSize=renderer.getSize(new T.Vector2()),keepYaw=turn.rotation.y;
    if(keep)turn.remove(keep.root);const m=build(h);turn.add(m.root);turn.rotation.y=YAW;m.update(0);
    renderer.setPixelRatio(1);frame(size,size,1.45);renderer.render(scene,camera);const url=canvas.toDataURL('image/png');
    turn.remove(m.root);m.dispose();if(keep)turn.add(keep.root);turn.rotation.y=keepYaw;
    renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));if(keepSize.x)frame(keepSize.x,keepSize.y);if(tack)tack.rider.visible=tack.saddleGroup.visible=true;return url;}
  if(horse)setHorse(horse);resize();raf=requestAnimationFrame(loop);
  return {el,setHorse,setRider,snapshot,get horse(){return current;},get rider(){return showRider;},dispose(){cancelAnimationFrame(raf);tack?.dispose();ghost.dispose();ghostInk.dispose();ro.disconnect();io.disconnect();model?.dispose();grass.geometry.dispose();grass.material.dispose();renderer.dispose();el.remove();}};
}
