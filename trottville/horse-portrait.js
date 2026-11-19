// Horse portraits: the same sculpted 3D horse as the world (horse-sculpt.js), photographed once into a
// still image for cards, profiles and buttons. One small shared renderer does every shot; results are
// cached by horse and colour, so a list of cards only renders each horse once.
// shot: 'head' = head-and-shoulders, three-quarter view (cards, profiles); 'body' = the whole horse (zoom > 1 fills more).
import * as T from './vendor/three-0.180.0/three.module.js?v=160';
import {makeSculptedHorse} from './horse-sculpt.js?v=160';

let kit=null;const cache=new Map();
function setup(){
  if(kit!==null)return kit;
  try{const renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;
    const scene=new T.Scene();scene.add(new T.HemisphereLight('#fff7e2','#8b7350',2.1));const sun=new T.DirectionalLight('#fff1d2',2.3);sun.position.set(4,7,6);scene.add(sun);
    const flat=document.createElement('canvas');
    kit={renderer,scene,cam:new T.PerspectiveCamera(24,1,.1,60),flat,pen:flat.getContext('2d')};
    renderer.domElement.addEventListener('webglcontextlost',()=>{kit=null;});
  }catch{kit=false;}
  return kit;
}
const box=new T.Box3(),v=new T.Vector3(),size=new T.Vector3();

// horse: {id, coat (a ranch/SCULPT palette), size}. Returns a data URL, or '' if WebGL isn't available.
export function horsePortrait(horse={},{shot='head',w=256,h=w,bg='',key='',zoom=1}={}){
  const k=key||[horse.id,shot,w,h,bg,zoom,JSON.stringify(horse.coat||''),JSON.stringify(horse.look||'')].join('|');if(cache.has(k))return cache.get(k);
  const K=setup();if(!K)return '';
  let model=null,url='';
  try{model=makeSculptedHorse(T,{...horse,size:1},{style:'cel',outline:.026});model.setGait('stand');
    const pose=new T.Group();pose.add(model.root);K.scene.add(pose);
    if(shot==='head'){pose.rotation.y=-.62;model.head.rotation.set(.04,-.22,.06);}else{pose.rotation.y=-1.2;model.head.rotation.set(0,-.4,0);}
    pose.updateMatrixWorld(true);
    // Frame the shot on the horse itself, so any breed size or head shape fits.
    if(shot==='head'){model.head.getWorldPosition(v);const at=v.clone().add(new T.Vector3(0,-.35,0));
      K.cam.fov=26;K.cam.aspect=w/h;const d=4.9/Math.min(1,w/h*.85);K.cam.position.set(at.x-.7,at.y+.5,at.z+d);K.cam.lookAt(at);}
    else{box.setFromObject(model.root);box.getCenter(v);box.getSize(size);const r=Math.max(size.y,size.x*.62)*1.12;
      K.cam.fov=24;K.cam.aspect=w/h;const d=r/2/Math.tan(K.cam.fov*Math.PI/360)/Math.min(1,w/h)/zoom;K.cam.position.set(v.x-.6,v.y+d*.22,v.z+d);K.cam.lookAt(v);}
    K.cam.updateProjectionMatrix();K.renderer.setSize(w,h,false);K.renderer.render(K.scene,K.cam);
    K.flat.width=w;K.flat.height=h;const p=K.pen;p.clearRect(0,0,w,h);
    if(bg){p.fillStyle=bg;p.fillRect(0,0,w,h);p.fillStyle='rgba(255,255,255,.5)';p.beginPath();p.arc(w*.58,h*.6,Math.min(w,h)*.4,0,Math.PI*2);p.fill();}
    p.drawImage(K.renderer.domElement,0,0,w,h);
    url=K.flat.toDataURL('image/webp',.9);if(!url.startsWith('data:image/webp'))url=K.flat.toDataURL('image/png');
    K.scene.remove(pose);
  }catch{url='';}
  model?.dispose();
  if(url)cache.set(k,url);return url;
}
