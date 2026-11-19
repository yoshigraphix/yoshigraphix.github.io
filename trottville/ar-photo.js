// AR photo (note #27, 2026-11-09). The phone camera opens full-screen and your own sculpted 3D horse stands over the
// live picture on a transparent WebGL layer. One finger drags the horse, two fingers pinch to size and twist to turn it
// (mouse: drag, wheel, shift+drag). Selfie camera: the horse's head sits beside your face; back camera: the horse
// stands on the lower third. The shutter saves exactly what you see (mirrored selfie included) plus a small
// "Trottville" stamp. If the camera is blocked, the horse still shows over a dark ground with the reason on a banner.
import * as T from './vendor/three-0.180.0/three.module.js?v=160';
import {makeSculptedHorse,SCULPT_COATS} from './horse-sculpt.js?v=160';
import {COATS} from './ranch.mjs?v=160';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DEFAULT_HORSE={id:'ar-default-bay',name:'Your horse',coat:{...SCULPT_COATS.willow,...COATS.bay,blaze:false,socks:[0,0,0,0]}};
let box=null,stream=null,facing='environment',kit=null,startToken=0,shot=null;

function css(){if(document.getElementById('arp-css'))return;const s=document.createElement('style');s.id='arp-css';s.textContent=`
.arp{position:absolute;inset:0;z-index:40;background:#0d120e;color:#fff;overflow:hidden;font:600 14px/1.45 system-ui,sans-serif;user-select:none;-webkit-user-select:none}
.arp video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.arp video.selfie{transform:scaleX(-1)}
.arp canvas.arp-gl{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab}
.arp canvas.arp-gl:active{cursor:grabbing}
.arp-msg{position:absolute;left:50%;top:calc(max(18px,env(safe-area-inset-top)) + 44px);transform:translateX(-50%);width:min(320px,calc(100% - 40px));padding:12px 16px;border-radius:16px;background:#1c271ee6;text-align:center;pointer-events:none}
.arp-msg b{display:block;font-size:16px;margin-bottom:4px}.arp-msg code{display:block;margin-top:8px;font-size:10px;opacity:.45;word-break:break-word}
.arp-hint{position:absolute;left:50%;bottom:calc(max(16px,env(safe-area-inset-bottom)) + 84px);transform:translateX(-50%);padding:6px 12px;border-radius:12px;background:#1c271ec2;font-size:12px;white-space:nowrap;pointer-events:none}
.arp-bar{position:absolute;left:0;right:0;bottom:max(16px,env(safe-area-inset-bottom));display:flex;justify-content:center;align-items:center;gap:26px;pointer-events:none}
.arp-bar button{pointer-events:auto}
.arp-bar .arp-side,.arp-x{width:52px;height:52px;border-radius:50%;border:0;padding:0;display:grid;place-items:center;background:#fffaf0;color:#3b2f1e;font-size:22px;box-shadow:0 4px 14px #0006;cursor:pointer}
.arp-bar .arp-side:hover,.arp-x:hover{background:#fff3d6}
.arp-bar .arp-side:active,.arp-x:active{background:#f3e3b9}
.arp-shutter{width:64px;height:64px;border-radius:50%;border:4px solid #fffaf0;background:#fffaf0;box-shadow:0 0 0 3px #0005,inset 0 0 0 3px #3b2f1e33,0 4px 14px #0006;cursor:pointer}
.arp-shutter:hover{background:#ffe9b8}
.arp-shutter:active{background:#f3d78f}
.arp-x{position:absolute;top:max(14px,env(safe-area-inset-top));right:14px;width:46px;height:46px}
.arp-tag{top:max(22px,calc(env(safe-area-inset-top) + 8px))}
.arp-bar .arp-side svg{width:28px;height:28px}.arp-x svg{width:22px;height:22px}
.arp-tag{position:absolute;top:max(18px,env(safe-area-inset-top));left:14px;max-width:calc(100% - 90px);padding:6px 11px;border-radius:12px;background:#1c271ec2;font-size:12px;pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.arp-prev{position:absolute;inset:0;z-index:2;background:#0d120ef2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:max(16px,env(safe-area-inset-top)) 16px max(16px,env(safe-area-inset-bottom))}
.arp-prev img{max-width:100%;max-height:calc(100% - 130px);border-radius:14px;box-shadow:0 8px 30px #000a;background:#000}
.arp-prev .arp-acts{display:flex;flex-wrap:wrap;justify-content:center;gap:12px}
.arp-prev .arp-acts button{min-width:104px;min-height:48px;padding:0 18px;border-radius:16px;border:0;font:700 15px system-ui,sans-serif;cursor:pointer;background:#fffaf0;color:#3b2f1e}
.arp-prev .arp-acts button.go{background:#4f9a5a;color:#fff}
.arp-prev .arp-acts button:hover{background:#fff3d6}.arp-prev .arp-acts button.go:hover{background:#5aab66}
.arp-prev .arp-acts button:active{background:#f3e3b9}.arp-prev .arp-acts button.go:active{background:#43864d}
.arp-prev .arp-status{min-height:20px;font-size:13px;opacity:.85;text-align:center}
`;document.head.append(s);}

function stop(){stream?.getTracks().forEach(t=>t.stop());stream=null;}
function onKey(e){if(e.key==='Escape'){if(shot)closePreview();else closeArPhoto();}}
export function closeArPhoto(){
  startToken++;stop();closePreview();
  if(kit){cancelAnimationFrame(kit.raf);kit.ro?.disconnect();kit.model.dispose();kit.shadowTex.dispose();kit.shadowMat.dispose();kit.shadowGeo.dispose();
    kit.renderer.dispose();kit.renderer.forceContextLoss?.();kit=null;}
  document.removeEventListener('keydown',onKey);
  box?.remove();box=null;
}

function say(title,body,detail=''){const m=box?.querySelector('.arp-msg');if(!m)return;m.hidden=false;m.innerHTML=`<b>${esc(title)}</b>${esc(body)}${detail?`<code>${esc(detail)}</code>`:''}`;}
function tag(t){const e=box?.querySelector('.arp-tag');if(e)e.textContent=t;}

async function start(){
  const token=++startToken,v=box.querySelector('video');stop();v.hidden=true;v.srcObject=null;v.classList.toggle('selfie',facing==='user');
  place();say('Opening the camera…','Your phone may ask for permission. Choose Allow.');tag(facing==='user'?'Selfie camera':'Back camera');
  const policy=document.featurePolicy?.allowsFeature?.('camera');
  if(!navigator.mediaDevices?.getUserMedia){say('Camera blocked','This browser view does not offer the camera at all. Your horse can still pose here.',`mediaDevices: ${!!navigator.mediaDevices} · secure: ${isSecureContext} · policy: ${policy}`);tag('No camera · horse only');return;}
  try{const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:facing,width:{ideal:1920},height:{ideal:1080}},audio:false});
    if(!box||token!==startToken){s.getTracks().forEach(t=>t.stop());return;}
    stream=s;v.srcObject=stream;await v.play().catch(()=>{});v.hidden=false;box.querySelector('.arp-msg').hidden=true;
    const st=stream.getVideoTracks()[0]?.getSettings?.()||{};tag(`${facing==='user'?'Selfie':'Back'} camera`);void st;
  }catch(e){
    if(!box||token!==startToken)return;
    const why={NotAllowedError:'Camera permission is off (in the browser, the phone settings or the page around the game).',NotFoundError:'No camera was found.',NotReadableError:'Another app is using the camera.',OverconstrainedError:'This camera could not be used that way.',SecurityError:'The page is not allowed to use the camera here.'}[e.name]||'The camera could not start.';
    say('Camera blocked',why+' Your horse can still pose here.',`${e.name}: ${e.message} · policy: ${policy} · secure: ${isSecureContext}`);tag('Camera blocked · horse only');}
}

// ---------- 3D horse layer ----------
const FOV=30,DIST=20;
function setup3d(horse){
  const cv=box.querySelector('canvas.arp-gl');
  const renderer=new T.WebGLRenderer({canvas:cv,antialias:true,alpha:true,preserveDrawingBuffer:true});
  renderer.setClearColor(0x000000,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  const scene=new T.Scene(),cam=new T.PerspectiveCamera(FOV,1,.1,100);cam.position.set(0,0,DIST);cam.lookAt(0,0,0);
  scene.add(new T.HemisphereLight('#fff7e2','#8b7350',2.1));const sun=new T.DirectionalLight('#fff1d2',2.3);sun.position.set(4,7,6);scene.add(sun);
  const model=makeSculptedHorse(T,{...horse,size:1},{style:'cel',idle:true});model.setGait('stand');
  const pose=new T.Group();pose.add(model.root);scene.add(pose);
  // Soft contact shadow so the horse reads as standing on the floor in back-camera shots.
  const sc=document.createElement('canvas');sc.width=sc.height=128;const g=sc.getContext('2d'),rg=g.createRadialGradient(64,64,4,64,64,62);
  rg.addColorStop(0,'rgba(0,0,0,.45)');rg.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=rg;g.fillRect(0,0,128,128);
  const shadowTex=new T.CanvasTexture(sc),shadowMat=new T.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false}),shadowGeo=new T.PlaneGeometry(2.6,4.4);
  const shadow=new T.Mesh(shadowGeo,shadowMat);shadow.rotation.x=-Math.PI/2;shadow.position.y=.01;pose.add(shadow);
  // Rest measurements at scale 1, unrotated.
  pose.updateMatrixWorld(true);const hb=new T.Box3().setFromObject(model.head),bb=new T.Box3().setFromObject(model.root);
  const headSize=hb.getSize(new T.Vector3()),bodySize=bb.getSize(new T.Vector3());
  kit={renderer,scene,cam,model,pose,shadow,shadowTex,shadowMat,shadowGeo,headSize,bodySize,w:1,h:1,raf:0,last:0};
  const resize=()=>{if(!kit||!box)return;const w=Math.max(1,box.clientWidth),h=Math.max(1,box.clientHeight);if(w===kit.w&&h===kit.h)return;
    const first=kit.w===1&&kit.h===1;kit.w=w;kit.h=h;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();if(first||!kit.moved)place();};
  kit.ro=new ResizeObserver(resize);kit.ro.observe(box);resize();
  const loop=t=>{if(!kit)return;kit.raf=requestAnimationFrame(loop);const dt=kit.last?Math.min(.1,(t-kit.last)/1000):0;kit.last=t;model.update(dt);renderer.render(scene,cam);};
  kit.raf=requestAnimationFrame(loop);
  gestures(cv);
}

// Screen point (CSS px in the box) → world point on the plane z = zPlane.
function screenToWorld(sx,sy,zPlane){const {cam,w,h}=kit;const v=new T.Vector3(sx/w*2-1,-(sy/h*2-1),.5).unproject(cam);
  const dir=v.sub(cam.position).normalize(),t=(zPlane-cam.position.z)/dir.z;return cam.position.clone().addScaledVector(dir,t);}
const pxToWorld=()=>2*DIST*Math.tan(T.MathUtils.degToRad(FOV/2))/kit.h;

// Auto-placement. Selfie: head beside the face (right of frame, upper-middle, about face size), turned toward you.
// Back camera: whole horse standing on the lower third, medium size, three-quarter view.
function place(){
  if(!kit)return;const {pose,model,headSize,bodySize,w,h}=kit,k=pxToWorld(),visH=h*k,visW=w*k,selfie=facing==='user';
  pose.position.set(0,0,0);
  if(selfie){pose.rotation.y=-.7;pose.scale.setScalar(Math.min(.27*visH/headSize.y,.4*visW/Math.max(headSize.x,headSize.z)));kit.shadow.visible=false;}
  else{pose.rotation.y=-1.05;pose.scale.setScalar(Math.min(.42*visH/bodySize.y,.78*visW/bodySize.z));kit.shadow.visible=true;}
  pose.updateMatrixWorld(true);
  let at,target;
  if(selfie){at=new T.Box3().setFromObject(model.head).getCenter(new T.Vector3());target=screenToWorld(w*.77,h*.42,at.z);}
  else{const b=new T.Box3().setFromObject(model.root),c=b.getCenter(new T.Vector3());at=new T.Vector3(c.x,b.min.y,c.z);target=screenToWorld(w*.5,h*.8,at.z);}
  pose.position.x+=target.x-at.x;pose.position.y+=target.y-at.y;kit.moved=false;
}

function gestures(cv){
  const pts=new Map();
  const move=(dx,dy)=>{const k=pxToWorld();kit.pose.position.x+=dx*k;kit.pose.position.y-=dy*k;kit.moved=true;};
  const scaleBy=f=>{const s=Math.min(60,Math.max(.05,kit.pose.scale.x*f));kit.pose.scale.setScalar(s);kit.moved=true;};
  const turn=a=>{kit.pose.rotation.y+=a;kit.moved=true;};
  cv.addEventListener('pointerdown',e=>{if(!kit)return;cv.setPointerCapture?.(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});box.querySelector('.arp-hint')?.remove();});
  cv.addEventListener('pointermove',e=>{
    if(!kit||!pts.has(e.pointerId))return;
    const before=[...pts.values()].map(p=>({...p}));pts.set(e.pointerId,{x:e.clientX,y:e.clientY});const after=[...pts.values()];
    if(pts.size===1){const dx=after[0].x-before[0].x,dy=after[0].y-before[0].y;
      if(e.shiftKey&&e.pointerType==='mouse')turn(dx*.012);else move(dx,dy);return;}
    const [a0,b0]=before,[a1,b1]=after;
    const d0=Math.hypot(b0.x-a0.x,b0.y-a0.y),d1=Math.hypot(b1.x-a1.x,b1.y-a1.y);if(d0>8)scaleBy(d1/d0);
    let da=Math.atan2(b1.y-a1.y,b1.x-a1.x)-Math.atan2(b0.y-a0.y,b0.x-a0.x);da=(da+Math.PI*3)%(Math.PI*2)-Math.PI;turn(da);
    move(((a1.x+b1.x)-(a0.x+b0.x))/2,((a1.y+b1.y)-(a0.y+b0.y))/2);
  });
  const up=e=>pts.delete(e.pointerId);
  cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);cv.addEventListener('lostpointercapture',up);
  cv.addEventListener('wheel',e=>{if(!kit)return;e.preventDefault();scaleBy(Math.exp(-e.deltaY*.0015));},{passive:false});
}

// ---------- Shutter + preview ----------
function stamp(p,W,H){
  const fs=Math.max(14,Math.round(Math.min(W,H)*.04)),pad=fs*.55,txt='Trottville';
  p.font=`800 ${fs}px system-ui,sans-serif`;const tw=p.measureText(txt).width,bw=tw+pad*2,bh=fs+pad*1.2,x=W-bw-fs*.7,y=H-bh-fs*.7,r=bh/2;
  p.fillStyle='rgba(28,39,30,.72)';p.beginPath();p.roundRect?p.roundRect(x,y,bw,bh,r):p.rect(x,y,bw,bh);p.fill();
  p.fillStyle='#fffaf0';p.textBaseline='middle';p.fillText(txt,x+pad,y+bh/2+fs*.04);
}
function capture(){
  if(!kit||!box)return;
  const v=box.querySelector('video'),live=stream&&!v.hidden&&v.videoWidth>0,bw=kit.w,bh=kit.h;
  let W,H,sx=0,sy=0,sw=0,sh=0;
  // Output at video resolution, cropped to the same "cover" view the user sees.
  if(live){const vw=v.videoWidth,vh=v.videoHeight,s=Math.max(bw/vw,bh/vh);sw=bw/s;sh=bh/s;sx=(vw-sw)/2;sy=(vh-sh)/2;W=Math.round(sw);H=Math.round(sh);}
  else{const r=Math.min(devicePixelRatio||1,2);W=Math.round(bw*r);H=Math.round(bh*r);}
  const c=document.createElement('canvas');c.width=W;c.height=H;const p=c.getContext('2d');
  if(live){p.save();if(facing==='user'){p.translate(W,0);p.scale(-1,1);}p.drawImage(v,sx,sy,sw,sh,0,0,W,H);p.restore();}
  else{p.fillStyle='#0d120e';p.fillRect(0,0,W,H);}
  kit.renderer.render(kit.scene,kit.cam);p.drawImage(kit.renderer.domElement,0,0,W,H);
  stamp(p,W,H);
  c.toBlob(blob=>{if(blob&&box)showPreview(blob);},'image/png');
}
function fileName(){const n=String(kit?.horseName||'horse').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'horse',d=new Date(),z=x=>String(x).padStart(2,'0');
  return `trottville-${n}-${d.getFullYear()}${z(d.getMonth()+1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}.png`;}
function showPreview(blob){
  closePreview();const url=URL.createObjectURL(blob),name=fileName(),file=typeof File==='function'?new File([blob],name,{type:'image/png'}):null;
  let canShare=false;try{canShare=!!(file&&navigator.canShare?.({files:[file]}));}catch{}
  const el=document.createElement('div');el.className='arp-prev';el.setAttribute('role','dialog');el.setAttribute('aria-label','Your photo');
  el.innerHTML=`<img alt="Your AR photo"><div class="arp-acts">${canShare?'<button type="button" class="go" data-a="share">Share</button>':''}<button type="button" class="${canShare?'':'go'}" data-a="save">Save</button><button type="button" data-a="retake">Retake</button></div><div class="arp-status" aria-live="polite"></div>`;
  el.querySelector('img').src=url;box.append(el);shot={el,url};
  const status=t=>{el.querySelector('.arp-status').textContent=t;};
  el.querySelector('[data-a=save]').onclick=()=>{const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();status('Saved to your downloads as '+name);};
  el.querySelector('[data-a=retake]').onclick=closePreview;
  const sh=el.querySelector('[data-a=share]');
  if(sh)sh.onclick=async()=>{try{await navigator.share({files:[file],title:'Trottville photo',text:`Me and ${kit?.horseName||'my horse'} in Trottville`});status('Shared!');}
    catch(e){if(e?.name!=='AbortError')status('Sharing did not work here. Use Save instead.');}};
}
function closePreview(){if(!shot)return;shot.el.remove();URL.revokeObjectURL(shot.url);shot=null;}

export function openArPhoto({stage,horse}={}){
  closeArPhoto();css();
  const h=horse&&typeof horse==='object'?horse:DEFAULT_HORSE;
  box=document.createElement('div');box.className='arp';box.setAttribute('role','dialog');box.setAttribute('aria-label',`AR photo with ${h.name||'your horse'}`);
  box.innerHTML='<video playsinline muted hidden></video><canvas class="arp-gl" aria-label="Your horse. Drag to move, pinch to size, twist to turn."></canvas>'
    +'<span class="arp-tag">AR photo</span><div class="arp-msg" hidden></div><span class="arp-hint">Drag to move · pinch to size · twist to turn</span>'
    +'<button type="button" class="arp-x" aria-label="Close camera"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke-width="2.8"/></svg></button>'
    +'<div class="arp-bar"><button type="button" class="arp-side" data-arp="flip" aria-label="Switch camera"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5h3l1.8-2.5h7.4l1.8 2.5h3v10.5h-17z"/><path d="M9.2 12.2a3 3 0 0 1 5.3-.6M14.8 14.8a3 3 0 0 1-5.3.6"/><path d="M14.6 9.6v2.1h-2.1M9.4 17.4v-2.1h2.1"/></svg></button>'
    +'<button type="button" class="arp-shutter" data-arp="shoot" aria-label="Take photo"></button>'
    +'<button type="button" class="arp-side" data-arp="reset" aria-label="Put the horse back in place"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.6"/><path d="M4 4v4.6h4.6"/></svg></button></div>';
  (stage||document.body).append(box);
  box.querySelector('.arp-x').onclick=closeArPhoto;
  box.querySelector('[data-arp=flip]').onclick=()=>{facing=facing==='user'?'environment':'user';start();};
  box.querySelector('[data-arp=reset]').onclick=()=>place();
  box.querySelector('[data-arp=shoot]').onclick=capture;
  document.addEventListener('keydown',onKey);
  try{setup3d(h);kit.horseName=h.name||'horse';}
  catch(e){console.warn('AR photo: 3D failed',e);say('3D is not available','Your phone could not draw the horse here.',String(e?.message||e));}
  start();
}
