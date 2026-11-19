// The stall window: wooden shutters on hinges over a little window in the back wall. Tap them and they swing
// open into the room (and shut again): you see outside at the real time of day, in the same weather the 3D world
// has right now (world-weather.mjs: everyone sees the same sky on the same day), rain and thunderstorms included.
// Light follows it: by day the ceiling lamp is off and the open window brightens the stall (shut it and the
// room dims, slowly, as the shutters close); at night the lamp is on.
// makeWindow(T,{x,y,z}) → {group, lamp, targets, toggle(), isOpen(), update(dt) → {room, lamp, win, flash}, label(), dispose()}
import {gameHours,devHourNow,skyAt,weatherAt,WEATHER,skyLabel,smooth} from './world-weather.mjs?v=161';

const W=1.5,H=1.2;// window opening
export function makeWindow(T,{x=1.35,y=4.2,z=-3.3,beamY=5.9,lampX=-.05}={}){
  const ramp=new T.DataTexture(new Uint8Array([120,120,120,255,200,200,200,255,255,255,255,255]),3,1,T.RGBAFormat);
  ramp.minFilter=ramp.magFilter=T.NearestFilter;ramp.needsUpdate=true;
  const own=[ramp],mats=new Map(),toon=c=>{if(!mats.has(c)){const m=new T.MeshToonMaterial({color:c,gradientMap:ramp});mats.set(c,m);own.push(m);}return mats.get(c);};
  const box=(p,w,h,d,c,px,py,pz,rx=0,ry=0,rz=0)=>{const g=new T.BoxGeometry(w,h,d);own.push(g);const m=new T.Mesh(g,typeof c==='string'?toon(c):c);m.position.set(px,py,pz);m.rotation.set(rx,ry,rz);m.receiveShadow=true;p.add(m);return m;};
  const group=new T.Group();group.position.set(x,y,z);

  // ---- the view outside: a canvas redrawn from the clock/weather, with rain and lightning on top ----
  const cv=document.createElement('canvas');cv.width=256;cv.height=200;const cx=cv.getContext('2d');
  const base=document.createElement('canvas');base.width=256;base.height=200;const bx=base.getContext('2d');
  const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;own.push(tex);
  const viewMat=new T.MeshBasicMaterial({map:tex,toneMapped:false});own.push(viewMat);
  const viewGeo=new T.PlaneGeometry(W,H);own.push(viewGeo);const view=new T.Mesh(viewGeo,viewMat);view.position.z=.13;group.add(view);
  const css=a=>`rgb(${a.map(v=>Math.round(Math.max(0,Math.min(1,v))*255)).join(',')})`;
  const grey=(c,g)=>{const l=c[0]*.3+c[1]*.55+c[2]*.15;return c.map(v=>v+(l*.85-v)*g);};
  let sky=null,kind='clear',w=WEATHER.clear,drawnAt=-1,paintedDev=null;
  const hoursNow=()=>gameHours();
  const preview={hours:null,weather:null};// test/preview hook, like world-sky.js
  function paintBase(){const h=preview.hours??hoursNow();sky=skyAt(h);kind=preview.weather||weatherAt();w=WEATHER[kind]||WEATHER.clear;drawnAt=performance.now();paintedDev=devHourNow();
    const top=grey(sky.top,w.grey),hor=grey(sky.hor,w.grey),g=bx.createLinearGradient(0,0,0,200);g.addColorStop(0,css(top));g.addColorStop(.75,css(hor));bx.fillStyle=g;bx.fillRect(0,0,256,200);
    const night=sky.night;
    if(night>.3&&w.cloud<.9){bx.fillStyle=`rgba(255,250,220,${(night-.3)*(1-w.cloud)})`;for(let i=0;i<40;i++)bx.fillRect((i*97)%256,(i*53)%120,i%5?1:2,i%5?1:2);}
    // Sun or moon, hidden behind thick cloud.
    const show=1-smooth(.6,1,w.cloud);
    if(show>0){if(sky.elev>-4){const sy=170-Math.max(-4,sky.elev)*2.2;bx.fillStyle=`rgba(255,226,120,${show})`;bx.beginPath();bx.arc(190,Math.max(28,sy),16,0,7);bx.fill();}
      else if(night>.5){bx.fillStyle=`rgba(255,247,214,${show})`;bx.beginPath();bx.arc(70,46,13,0,7);bx.fill();bx.fillStyle=css(top);bx.beginPath();bx.arc(76,42,11,0,7);bx.fill();}}
    // Clouds.
    const cl=w.cloud,ck=grey(sky.hor.map(v=>v*.9+.1*(1-night)),.6);bx.fillStyle=css(ck.map(v=>v*(1-w.dim*.5)));
    for(let i=0;i<Math.round(cl*9);i++){const px=(i*61+20)%276-10,py=20+(i*37)%70;bx.globalAlpha=.55+cl*.4;for(const [dx,dy,r] of [[0,0,22],[20,-8,18],[38,2,20],[-18,4,15]]){bx.beginPath();bx.arc(px+dx,py+dy,r*(.7+cl*.5),0,7);bx.fill();}}
    bx.globalAlpha=1;
    // Hills and the paddock fence, lit by the time of day.
    const day=1-night,snowy=w.snow||0,shade=(c,k)=>css(c.map(v=>(v+(.95-v)*snowy*.9)*k));// snow days: white hills
    const lit=(.35+.65*day)*(1-w.dim*.45);
    bx.fillStyle=shade([.42,.7,.36],lit*.85);bx.beginPath();bx.ellipse(60,212,170,70,0,0,7);bx.fill();
    bx.fillStyle=shade([.33,.6,.32],lit);bx.beginPath();bx.ellipse(220,220,160,72,0,0,7);bx.fill();
    bx.strokeStyle=shade([.95,.92,.85],lit);bx.lineWidth=3;for(let px=10;px<256;px+=28){bx.beginPath();bx.moveTo(px,168);bx.lineTo(px,196);bx.stroke();}bx.beginPath();bx.moveTo(0,174);bx.lineTo(256,174);bx.stroke();
    if(w.fog)bx.fillStyle=`rgba(210,214,220,${w.fog*.45})`,bx.fillRect(0,0,256,200);
    composite(0);}
  const drops=Array.from({length:70},(_,i)=>({x:Math.random()*256,y:Math.random()*200,s:.8+Math.random()*.6}));
  function composite(dt){cx.drawImage(base,0,0);
    if(w.rain>0){cx.strokeStyle=sky.night>.5?'rgba(190,205,230,.55)':'rgba(230,238,248,.7)';cx.lineWidth=1.4;cx.beginPath();const n=Math.round(drops.length*w.rain),wind=4+w.wind*10;
      for(let i=0;i<n;i++){const d=drops[i];d.y+=dt*420*d.s;d.x+=dt*wind*8;if(d.y>205){d.y=-12;d.x=Math.random()*256;}if(d.x>260)d.x-=264;cx.moveTo(d.x,d.y);cx.lineTo(d.x-wind*.5,d.y-12*d.s);}cx.stroke();}
    if(w.snow>0){cx.fillStyle=sky.night>.5?'rgba(220,228,245,.85)':'rgba(255,255,255,.95)';const n=Math.round(flakes.length*w.snow),drift=4+w.wind*14;
      for(let i=0;i<n;i++){const f=flakes[i];f.p+=dt*1.6;f.y+=dt*34*f.s;f.x+=dt*(drift+Math.sin(f.p)*10);if(f.y>204){f.y=-4;f.x=Math.random()*256;}if(f.x>260)f.x-=264;
        cx.beginPath();cx.arc(f.x,f.y,1+f.s*1.1,0,7);cx.fill();}}
    if(flash>0){cx.fillStyle=`rgba(235,240,255,${flash*.75})`;cx.fillRect(0,0,256,200);
      if(flash>.6){cx.strokeStyle='#fffbe8';cx.lineWidth=2;cx.beginPath();let bx2=bolt.x,by=0;cx.moveTo(bx2,by);while(by<150){by+=14+Math.random()*12;bx2+=(Math.random()-.5)*26;cx.lineTo(bx2,by);}cx.stroke();}}
    tex.needsUpdate=true;}
  const flakes=Array.from({length:90},(_,i)=>({x:Math.random()*256,y:Math.random()*200,s:.5+Math.random(),p:Math.random()*6.3}));
  let flash=0,nextBolt=3,bolt={x:120};

  // ---- frame, sill, and the two shutters (hinged at the outer edges, louvered, painted green) ----
  const FR='#74441f';
  box(group,W+.22,.12,.2,FR,0,H/2+.06,.12);box(group,W+.22,.12,.2,FR,0,-H/2-.06,.12);
  for(const s of [-1,1])box(group,.11,H+.24,.2,FR,s*(W/2+.055),0,.12);
  box(group,.06,H,.06,FR,0,0,.15);box(group,W,.06,.06,FR,0,0,.15);
  box(group,W+.5,.1,.36,'#8a5428',0,-H/2-.16,.2);
  const shutters=[];
  for(const s of [-1,1]){const hinge=new T.Group();hinge.position.set(s*(W/2+.02),0,.25);group.add(hinge);
    const panel=new T.Group();panel.position.x=-s*W/4;hinge.add(panel);
    box(panel,W/2-.02,H+.1,.06,'#4f7a52',0,0,0);
    for(const yy of [-1,1])box(panel,W/2-.02,.1,.08,'#3e6342',0,yy*(H/2),.01);
    for(let i=0;i<7;i++)box(panel,W/2-.16,.07,.03,'#5f9162',0,-H/2+.16+i*(H-.3)/6,.05,-.5,0,0);
    for(const yy of [-.38,.38])box(panel,.12,.07,.09,'#3b3a38',s*(W/4-.04),yy,.02);
    shutters.push({hinge,s});}

  // ---- the ceiling lamp: hangs from the roof beam; glows at night ----
  const lamp=new T.Group();lamp.position.set(lampX-x,beamY-y-.05,.65);group.add(lamp);
  const cordGeo=new T.CylinderGeometry(.015,.015,.55,5);own.push(cordGeo);const cord=new T.Mesh(cordGeo,toon('#2b2420'));cord.position.y=-.28;lamp.add(cord);
  const shadeGeo=new T.ConeGeometry(.32,.26,16,1,true);own.push(shadeGeo);const shadeM=new T.MeshToonMaterial({color:'#3f5a3c',gradientMap:ramp,side:T.DoubleSide});own.push(shadeM);const shadeMesh=new T.Mesh(shadeGeo,shadeM);shadeMesh.position.y=-.62;lamp.add(shadeMesh);
  const bulbGeo=new T.SphereGeometry(.1,12,10);own.push(bulbGeo);const bulbM=new T.MeshBasicMaterial({color:'#8a8070',toneMapped:false});own.push(bulbM);const bulb=new T.Mesh(bulbGeo,bulbM);bulb.position.y=-.74;lamp.add(bulb);
  const OFF=new T.Color('#8a8070'),ON=new T.Color('#fff1c0');

  // ---- sunbeam: a soft shaft of light from the window slanting down to the right, and a bright patch on the
  // floor where it lands. Only with the sun out (no rain, storm, fog or heavy cloud) and the shutters open. ----
  const beamTex=(()=>{const c=document.createElement('canvas');c.width=8;c.height=128;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,0,128);g.addColorStop(0,'rgba(255,240,200,.55)');g.addColorStop(.1,'rgba(255,240,200,.9)');g.addColorStop(1,'rgba(255,240,200,0)');x.fillStyle=g;x.fillRect(0,0,8,128);const t=new T.CanvasTexture(c);own.push(t);return t;})();
  const beamMat=new T.MeshBasicMaterial({map:beamTex,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,toneMapped:false});own.push(beamMat);
  const from=new T.Vector3(0,0,.2),land=new T.Vector3(3.1-x,-y,4.2-z),dir=land.clone().sub(from),len=dir.length();
  // The shaft is the window opening itself carried along the sun's direction to the floor (2026-11-13: the old
  // tilted 4-sided cone was narrower than the window and skewed past its frame): four sides joining the opening's
  // corners to where those same parallel rays land, so it reads as light pouring through the window.
  const beamGeo=(()=>{const g=new T.BufferGeometry(),top=[[-W/2,H/2],[W/2,H/2],[W/2,-H/2],[-W/2,-H/2]].map(([a,b])=>new T.Vector3(a,b,from.z)),
      bot=top.map(c=>c.clone().addScaledVector(dir,(land.y-c.y)/dir.y)),pos=[],uv=[];
    for(let i=0;i<4;i++){const j=(i+1)%4,q=[top[i],top[j],bot[j],bot[i]],u0=i/4,u1=(i+1)/4;
      for(const k of [0,1,2,0,2,3]){pos.push(q[k].x,q[k].y,q[k].z);uv.push(k===1||k===2?u1:u0,k<2?1:0);}}
    g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));return g;})();own.push(beamGeo);
  const beam=new T.Mesh(beamGeo,beamMat);beam.renderOrder=5;beam.visible=false;group.add(beam);
  const patchTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,4,32,32,31);g.addColorStop(0,'rgba(255,236,190,.8)');g.addColorStop(1,'rgba(255,236,190,0)');x.fillStyle=g;x.fillRect(0,0,64,64);const t=new T.CanvasTexture(c);own.push(t);return t;})();
  const patchMat=new T.MeshBasicMaterial({map:patchTex,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});own.push(patchMat);
  const patchGeo=new T.PlaneGeometry(W*1.5,Math.max(1.4,H*Math.hypot(dir.x,dir.z)/Math.abs(dir.y)*1.3));own.push(patchGeo);const patch=new T.Mesh(patchGeo,patchMat);patch.rotation.x=-Math.PI/2;patch.position.copy(land);patch.position.y+=.03;patch.renderOrder=5;patch.visible=false;group.add(patch);

  // ---- open / close: eased over ~0.7 s ----
  let target=0,p=0,cur={room:0,lamp:0,win:0,beam:0},first=true;
  const KEY='trottville-stall-window';try{target=p=localStorage.getItem(KEY)==='open'?1:0;}catch{}
  function setHinges(){const e=p*p*(3-2*p),a=e*Math.PI*.82;for(const {hinge,s} of shutters)hinge.rotation.y=s*a;}
  setHinges();
  function toggle(){target=target?0:1;try{localStorage.setItem(KEY,target?'open':'shut');}catch{}return !!target;}
  function update(dt){if(drawnAt<0||performance.now()-drawnAt>60000||devHourNow()!==paintedDev)paintBase();
    const step=dt/.7;p=target>p?Math.min(target,p+step):Math.max(target,p-step);setHinges();
    // Lightning in a storm: a double flash every so often (seen through the window, felt in the room).
    if(kind==='storm'){nextBolt-=dt;if(nextBolt<0){flash=1;bolt.x=40+Math.random()*180;nextBolt=5+Math.random()*12;setTimeout(()=>{flash=Math.max(flash,.8);},160);}}
    flash=Math.max(0,flash-dt*2.6);
    if(p>.02)composite(dt);
    const day=(1-sky.night)*Math.min(1,sky.sunI/2.2),daylight=day*(1-w.dim*.55),open=p*p*(3-2*p);
    const sunny=(sky.elev>2?1:0)*(1-w.rain)*(1-smooth(.55,.95,w.cloud))*(1-w.fog);
    const want={room:.16+daylight*(.34+.8*open),lamp:sky.night>.45||daylight<.25?1:0,win:daylight*open,beam:sunny*open};
    // Lights fade, never snap (the first frame starts where it should be).
    const k=first?1:1-Math.exp(-dt*3);first=false;for(const key in cur)cur[key]+=(want[key]-cur[key])*k;
    bulbM.color.copy(OFF).lerp(ON,cur.lamp);
    beamMat.opacity=.32*cur.beam;patchMat.opacity=.7*cur.beam;beam.visible=patch.visible=cur.beam>.01;
    return {room:cur.room,lamp:cur.lamp,win:cur.win,flash:flash*(.45+.55*open)};}
  const label=()=>skyLabel(preview.hours??hoursNow(),kind);
  paintBase();
  return {group,preview,repaint:paintBase,targets:[...shutters.map(s=>s.hinge),view],toggle,isOpen:()=>!!target,update,label,weather:()=>kind,dispose(){own.forEach(o=>o.dispose());}};
}
