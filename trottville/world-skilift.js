// The Cloudstep Sky Lift (note #28, 2026-11-09): a chairlift from the summit across the whole valley to a station in
// Lavender & Bee Meadows, far south (2026-11-16). It is OFF at the start of every visit; the only switch is the lever
// at the TOP, and it stops by itself after IDLE_OFF seconds with nobody riding. Riding it, you are locked in (no steering) and free to look around from above: the camera is yours, the car is
// not. Cars alternate: a two-seat chair for riders on foot, then a railed horse platform you ride straight onto.
// Pure layout (cable heights, towers, the chair loop) is computed once from groundHeight, so the cable always clears
// the ground and the chairs at each station hang at boarding height.
const TAU=Math.PI*2;
export const LIFT_SPEED=7,HANG=3.4,LINE=1.5,DECK=.55,SEAT_Z=.14;
// The valley station: open grass between Little Leap School and the racecourse, on the summit's line (2026-11-10:
// it used to stand at (70,72), inside the corn maze, so riders arrived boxed in by corn and couldn't walk off).
import {LIFT_STATION} from './world-regions.mjs?v=162';
export const VALLEY_STATION={...LIFT_STATION};   // was (34,35): the nine regions
const IDLE_OFF=180;   // seconds running with nobody on it before it stops itself

// Cable layout along the line from `top` to `bottom`: s = metres from the top station. Returns {L,u,towers,cableY(s)}.
export function liftLayout({top,bottom,groundHeight,avoid=()=>false}){
  const dx=bottom.x-top.x,dz=bottom.z-top.z,L=Math.hypot(dx,dz),u={x:dx/L,z:dz/L};
  const at=s=>({x:top.x+u.x*s,z:top.z+u.z*s});
  const ground=s=>{const p=at(s);let g=-Infinity;for(const o of [-LINE,0,LINE])g=Math.max(g,groundHeight(p.x-u.z*o,p.z+u.x*o));return g;};
  // Low at the stations (chairs hang at boarding height), up to 16 m over open ground within ~26 m.
  const clear=s=>{const e=Math.min(s,L-s);return e<3?HANG+.9:HANG+.9+Math.min(1,(e-3)/23)*(16-HANG-.9);};
  const g0=ground(0),g1=ground(L);
  const towers=[{s:0,y:g0+HANG+.9,station:true}];
  const step=20,n=Math.max(2,Math.round(L/step));
  for(let i=1;i<n;i++){let s=L*i/n;
    // Never plant a pole on the mountain trail (or wherever `avoid` says): slide it along the line a little.
    for(let k=0;k<12&&avoid(at(s).x,at(s).z);k++)s+=(k%2?-1:1)*(k+1)*1.2;
    let y=-Infinity;for(let t=Math.max(0,s-13);t<=Math.min(L,s+13);t+=1)y=Math.max(y,ground(t)+clear(t));
    towers.push({s,y});}
  towers.push({s:L,y:g1+HANG+.9,station:true});
  towers.sort((a,b)=>a.s-b.s);
  // Straight spans must clear the ground by 5 m everywhere (convex hillsides): raise the towers until they do.
  for(let pass=0;pass<20;pass++){let ok=true;
    for(let i=0;i<towers.length-1;i++){const a=towers[i],b=towers[i+1];
      for(let t=a.s+1;t<b.s;t+=1){const f=(t-a.s)/(b.s-a.s),y=a.y+(b.y-a.y)*f,need=ground(t)+HANG+1.6;
        if(y<need){ok=false;const d=need-y+.2;if(!a.station)a.y+=d;if(!b.station)b.y+=d;if(a.station&&b.station)towers.splice(i+1,0,{s:t,y:need+.2});break;}}}
    if(ok)break;}
  const cableY=s=>{s=Math.min(L,Math.max(0,s));let i=0;while(i<towers.length-2&&towers[i+1].s<s)i++;const a=towers[i],b=towers[i+1],f=(s-a.s)/((b.s-a.s)||1);return a.y+(b.y-a.y)*f;};
  return {L,u,at,towers,cableY,ground};
}

// Where a chair is on the loop: q in [0,2L). Down line (top→bottom) on the -LINE side, up line on the +LINE side.
export function loopPoint(lay,q){const {L,u}=lay;q=((q%(2*L))+2*L)%(2*L);const down=q<L,s=down?q:2*L-q,side=down?-LINE:LINE,p=lay.at(s);
  return {x:p.x-u.z*side,z:p.z+u.x*side,y:lay.cableY(s)-HANG,s,down,yaw:down?Math.atan2(u.x,u.z):Math.atan2(-u.x,-u.z)};}

// Where you step off at the far station: in front of the deck, beside the line, clear of the posts.
export function exitSpot(lay,st,back){const {u}=lay,side={x:-u.z,z:u.x};return {x:st.x-u.x*back*1.5+side.x*4.4,z:st.z-u.z*back*1.5+side.z*4.4};}

import {kit as mkKit,realMat} from './world-tudor.js?v=162';
export function buildSkiLift({T,outdoors,groundHeight,stage,top,bottom,avoid,onToggle}){
  const lay=liftLayout({top,bottom,groundHeight,avoid});
  const group=new T.Group();outdoors.add(group);
  const mats=[],geos=[];const M=(c,o={})=>{const m=new T.MeshStandardMaterial({color:c,roughness:.75,flatShading:true,...o});mats.push(m);return m;};
  const G=g=>{geos.push(g);return g;};
  const boxG=G(new T.BoxGeometry(1,1,1)),cylG=G(new T.CylinderGeometry(1,1,1,8)),cableG=G(new T.CylinderGeometry(1,1,1,6).rotateX(Math.PI/2));
  const steel=M('#7f8b93',{metalness:.35,roughness:.5}),dark=M('#4a5258',{metalness:.3}),wood=M('#9a7048'),woodD=M('#7a5434'),roofM=M('#b5523f'),seatM=M('#2f6f9e'),seatB=M('#e3a23f'),cream=M('#f4e7c6');
  // v147 real look: oak (textured), clay tiles, galvanised steel, concrete footings.
  const RM=(c,o)=>M(c,o),oakM=realMat(T,RM,'oak','#e2c29c'),oakD=realMat(T,RM,'oak','#ffffff'),tileM=realMat(T,RM,'tiles'),concM=realMat(T,RM,'stone','#d8d4cc'),
    galv=M('#9aa3a8',{metalness:.65,roughness:.38}),seatSteel=M('#3d4448',{metalness:.55,roughness:.4});
  const seg=(K,m,a,b,t)=>{const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len=Math.hypot(dx,dy,dz),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(dx/len,dy/len,dz/len)),e=new T.Euler().setFromQuaternion(q);
    K.put(m,new T.BoxGeometry(t,len,t),(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,e.x,e.y,e.z);};
  const lampOff=M('#5a3b33'),lampOn=M('#7ee08a',{emissive:'#3fd35e',emissiveIntensity:1.4});
  const add=(parent,geo,mat,x,y,z,sx,sy,sz,shadow=true)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=shadow;m.receiveShadow=true;parent.add(m);return m;};
  const obstacles=[];
  const {u}=lay,side={x:-u.z,z:u.x},yawAlong=Math.atan2(u.x,u.z);

  // ---- Towers: a steel pole, a crossbar carrying both lines, little sheaves ----
  for(const t of lay.towers){if(t.station)continue;const p=lay.at(t.s),g=lay.ground(t.s),gHere=groundHeight(p.x,p.z),h=t.y-gHere+.3;
    const tw=new T.Group();tw.position.set(p.x,gHere,p.z);tw.rotation.y=yawAlong;group.add(tw);
    // v147: a tapering lattice tower (4 legs, X-braced every 2.4 m) on a concrete footing, a cross-arm with sheave trains.
    {const K=mkKit(T,G),h0=.8,h1=.3,hw=y=>h0+(h1-h0)*(y/h),L4=[[-1,-1],[1,-1],[1,1],[-1,1]];
      K.box(concM,0,.2,0,2.1,.6,2.1,{tile:1.6});
      for(const [a,b] of L4)seg(K,galv,[a*h0,.4,b*h0],[a*h1,h,b*h1],.1);
      for(let y=.5;y<h-.8;y+=2.4){const y2=Math.min(h-.2,y+2.4);for(let f=0;f<4;f++){const [a1,b1]=L4[f],[a2,b2]=L4[(f+1)%4];
        seg(K,galv,[a1*hw(y),y,b1*hw(y)],[a2*hw(y2),y2,b2*hw(y2)],.05);seg(K,galv,[a2*hw(y),y,b2*hw(y)],[a1*hw(y2),y2,b1*hw(y2)],.05);seg(K,galv,[a1*hw(y),y,b1*hw(y)],[a2*hw(y),y,b2*hw(y)],.06);}}
      K.box(galv,0,h,0,LINE*2+1,.3,.3);K.box(galv,0,h+.22,0,LINE*2+.6,.08,.18);
      for(const s of [-1,1]){K.box(dark,s*LINE,h-.12,0,.12,.12,1.6);for(const z of [-.55,-.18,.18,.55])K.put(dark,new T.CylinderGeometry(.13,.13,.06,12).rotateZ(Math.PI/2),s*LINE,h-.22,z);}
      for(let y=1;y<h-.5;y+=.4)K.box(galv,h0*.4,y,0,.03,.03,.35);
      K.flush(tw);}
    if(!avoid?.(p.x,p.z))obstacles.push({kind:'box',x:p.x,z:p.z,hx:.55,hz:.55,height:Math.min(h,6)});}

  // ---- Cables: thin stretched boxes, one per span per line ----
  for(const sgn of [-1,1])for(let i=0;i<lay.towers.length-1;i++){const a=lay.towers[i],b=lay.towers[i+1],pa=lay.at(a.s),pb=lay.at(b.s);
    const ax=pa.x+side.x*LINE*sgn,az=pa.z+side.z*LINE*sgn,bx=pb.x+side.x*LINE*sgn,bz=pb.z+side.z*LINE*sgn,len=Math.hypot(bx-ax,b.y-a.y,bz-az);
    const c=new T.Mesh(cableG,dark);c.scale.set(.045,.045,len);c.position.set((ax+bx)/2,(a.y+b.y)/2,(az+bz)/2);c.lookAt(bx,b.y,bz);group.add(c);}

  // ---- Stations: a deck, a shelter, the turning bullwheel, the lever with its lamp, a painted wooden sign ----
  function sign(text){const cv=document.createElement('canvas');cv.width=512;cv.height=128;const x=cv.getContext('2d');
    x.fillStyle='#8a5e38';x.fillRect(0,0,512,128);x.fillStyle='#6f4a2b';for(let i=0;i<5;i++)x.fillRect(0,i*26+20,512,3);
    x.fillStyle='#f6e7c3';let size=50;x.font=`800 ${size}px system-ui`;while(x.measureText(text).width>470&&size>20)x.font=`800 ${--size}px system-ui`;x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,66);
    const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;const m=new T.MeshStandardMaterial({map:tex,roughness:.8});mats.push(m);m.userData.tex=tex;return m;}
  const stations={};
  for(const [id,p,s0,title] of [['top',top,0,'SKY LIFT · TO THE VALLEY'],['bottom',bottom,lay.L,'SKY LIFT · TO THE SUMMIT']]){
    const gy=groundHeight(p.x,p.z),st=new T.Group();st.position.set(p.x,gy,p.z);st.rotation.y=yawAlong;group.add(st);
    const back=id==='top'?-1:1; // the wheel sits at the far end, away from the line
    // v147: a timber station: plank deck on a stone footing, oak posts with knee braces, a pitched clay-tile roof.
    {const K=mkKit(T,G);K.box(concM,0,.06,0,6.8,.12,7.4,{tile:1.6});K.box(oakM,0,.2,0,6.4,.16,7,{tile:1.2,grain:'u'});
      for(let i=-3.3;i<=3.3;i+=.3)K.box(oakD,0,.285,i,6.4,.012,.02);
      for(const [x,z] of [[-3,-3.2],[3,-3.2],[-3,3.2],[3,3.2]]){K.box(oakD,x,2.65,z,.26,4.9,.26,{grain:'u'});K.box(oakD,x*.86,4.6,z,.14,.9,.14,{grain:'u',rz:x>0?.75:-.75});}
      for(const x of [-3,3])K.box(oakD,x,5.1,0,.3,.3,7.2,{grain:'u'});
      const hs=3.75,rise=1.3,th=Math.atan2(rise,hs);for(const e of [-1,1])K.box(tileM,e*hs/2,5.25+rise/2+.05,0,Math.hypot(hs,rise)+.15,.16,7.9,{tile:2,grain:'z',rz:-e*th});
      K.put(tileM,new T.CylinderGeometry(.16,.16,7.95,8),0,5.32+rise,0,Math.PI/2,0,0);
      K.flush(st);}
    const wheelY=lay.cableY(s0)-gy,wheel=new T.Group();wheel.position.set(0,wheelY,back*2.2);st.add(wheel);
    {const rim=new T.Mesh(G(new T.TorusGeometry(LINE+.1,.09,8,40)),galv);rim.rotation.x=Math.PI/2;wheel.add(rim);}add(wheel,cylG,dark,0,0,0,.3,.5,.3);for(let k=0;k<4;k++){const sp=add(wheel,boxG,dark,0,0,0,LINE*2,.08,.12);sp.rotation.y=k*Math.PI/4;}
    add(st,cylG,dark,0,(wheelY+.3)/2,back*2.2,.22,wheelY-.3,.22);
    // Lever + lamp on the side of the deck you walk up to.
    const lev=new T.Group();lev.position.set(2.7,.3,-back*2.4);st.add(lev);add(lev,boxG,dark,0,.55,0,.4,1.1,.4);
    const handle=new T.Group();handle.position.set(0,1.1,0);lev.add(handle);add(handle,boxG,M('#c84e3c'),0,.45,0,.09,.9,.09);add(handle,boxG,cream,0,.92,0,.2,.2,.2);
    const lamp=add(lev,boxG,lampOff,0,1.25,.25,.22,.22,.12,false);
    const sg=new T.Mesh(G(new T.PlaneGeometry(4.4,1.1)),sign(title));sg.position.set(0,4.5,-back*3.95);sg.rotation.y=back>0?Math.PI:0;st.add(sg);
    const sgB=sg.clone();sgB.rotation.y+=Math.PI;sgB.position.z-=back*.02;st.add(sgB);
    obstacles.push({kind:'box',x:p.x+u.x*back*2.2,z:p.z+u.z*back*2.2,hx:1.1,hz:1.1,height:2});
    stations[id]={id,x:p.x,z:p.z,y:gy,wheel,handle,lamp};}

  // ---- Chairs: a hanger, a seat, a back rest and a safety bar, evenly round the loop ----
  // Even cars are chairs, odd cars are horse platforms (an even count keeps them alternating all the way round).
  const n=2*Math.max(4,Math.round(lay.L/16)),spacing=2*lay.L/n,chairs=[];
  const railM=M('#e3a23f'),deckM=M('#a77a4c');
  for(let i=0;i<n;i++){const c=new T.Group();group.add(c);const sway=new T.Group();c.add(sway);
    // 2026-11-16: the hanger comes down BEHIND the back rest (it used to run through the rider); the seat sits SEAT_Z in
    // front of the cable, and point() moves the rider there too.
    if(i%2===0){add(sway,boxG,dark,0,-HANG/2+.4,0,.07,HANG-.8,.07,false);add(sway,boxG,dark,0,-HANG+.86,0,1.7,.07,.07,false);
      for(const sx of [-.82,.82])add(sway,boxG,dark,sx,-HANG+.47,0,.06,.8,.06,false);
      {const K=mkKit(T,G);for(let k=0;k<5;k++)K.box(oakM,0,-HANG+.04,SEAT_Z-.03+k*.13,1.6,.05,.11,{grain:'u'});
        for(let k=0;k<3;k++)K.box(oakM,0,-HANG+.25+k*.2,.07,1.6,.14,.04,{grain:'u'});
        for(const sx of [-.78,.78]){K.box(seatSteel,sx,-HANG-.02,SEAT_Z+.24,.05,.05,.72);K.box(seatSteel,sx,-HANG+.4,.04,.05,.82,.05);}
        K.box(seatSteel,0,-HANG-.03,SEAT_Z+.58,1.62,.04,.04);K.box(seatSteel,0,-HANG-.42,SEAT_Z+.62,1.2,.04,.18);
        for(const sx of [-.4,.4])K.box(seatSteel,sx,-HANG-.22,SEAT_Z+.6,.04,.4,.04);
        K.box(seatSteel,0,-.05,0,.22,.18,.3);K.flush(sway);}
      const bar=add(sway,boxG,dark,0,-HANG+.6,SEAT_Z+.67,1.5,.06,.06,false);
      chairs.push({group:c,sway,bar,kind:'seat'});continue;}
    // Horse platform: a short hanger, a wide yoke over the rider's head, two arms down to a railed wooden deck.
    const d=-HANG-DECK,W=1.15,Lh=1.7;
    add(sway,boxG,dark,0,-.25,0,.08,.5,.08,false);add(sway,boxG,dark,0,-.5,0,W*2+.1,.1,.1,false);
    for(const sx of [-W,W])add(sway,boxG,dark,sx,(-.5+d)/2,0,.08,-.5-d,.08,false);
    {const K=mkKit(T,G);K.box(oakM,0,d,0,W*2,.15,Lh*2,{tile:1.2,grain:'u'});for(let k=-3;k<=3;k++)K.box(oakD,0,d+.076,k*.48,W*2,.006,.02);K.flush(sway);}
    for(const sx of [-W,W])for(const sz of [-Lh,0,Lh])add(sway,boxG,railM,sx,d+.5,sz*.97,.09,1,.09,false);
    for(const sx of [-W,W])for(const h of [.55,1])add(sway,boxG,railM,sx,d+h,0,.07,.07,Lh*2,false);
    for(const sz of [-Lh,Lh])for(const h of [.55,1])add(sway,boxG,railM,0,d+h,sz*.97,W*2,.07,.07,false);
    chairs.push({group:c,sway,bar:null,kind:'horse'});}
  let on=false,idle=0;   // never remembered between visits
  let phase=0,speed=0,clock=0,ride=null;

  function place(){for(let i=0;i<n;i++){const c=chairs[i],q=phase+i*spacing,pt=loopPoint(lay,q);c.group.position.set(pt.x,pt.y+HANG,pt.z);c.group.rotation.y=pt.yaw;
      const mine=ride&&ride.index===i;c.sway.rotation.x=(mine?.02:.04)*Math.sin(clock*1.3+i)*Math.min(1,speed/LIFT_SPEED);
      // Safety bar down while someone rides; up at the stations.
      if(c.bar)c.bar.position.y=-HANG+(mine?.6:1.05);}}
  function paint(){for(const st of Object.values(stations)){st.lamp.material=on?lampOn:lampOff;st.handle.rotation.x=on?-.7:.7;}}
  paint();place();

  // ---- The station panel (in-app, never a native dialog) ----
  let panel=null;
  function closePanel(){panel?.remove();panel=null;}
  function css(){if(document.getElementById('skl-css'))return;const s=document.createElement('style');s.id='skl-css';s.textContent=`
.skl{position:absolute;inset:0;z-index:30;display:flex;align-items:flex-end;justify-content:center;background:#0b120c55;padding:16px;padding-bottom:max(16px,env(safe-area-inset-bottom))}
.skl-card{width:min(360px,100%);background:#fffaf0;color:#3b2f1e;border-radius:22px;padding:16px;box-shadow:0 10px 30px #0006;font:600 14px/1.4 system-ui,sans-serif}
.skl-card header{display:flex;align-items:center;gap:12px;margin-bottom:12px}.skl-card header i{font-style:normal;font-size:30px;width:48px;height:48px;display:grid;place-items:center;border-radius:14px;background:#e8f1f7}
.skl-card header b{display:block;font-size:17px}.skl-card header small{color:#6d5d45;font-weight:600}
.skl-state{display:inline-flex;align-items:center;gap:6px;font-size:12px;padding:3px 9px;border-radius:999px;background:#eee4d0}.skl-state.on{background:#d9f3dd;color:#1f6a35}
.skl-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.skl-row button{min-height:64px;border:0;border-radius:16px;font:700 14px system-ui;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;background:#f1e6cf;color:#3b2f1e}
.skl-row button svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}.skl-card header i svg{width:30px;height:30px;fill:none;stroke:#2f6f9e;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.skl-row button.go{background:#2f6f9e;color:#fff}.skl-row button.go:active{background:#255a80}.skl-row button:active{background:#e4d4b1}
.skl-row button:disabled{opacity:1;background:#f3eee3;color:#a99a7f;cursor:default}.skl-row button:not(.go):not(:disabled):hover{background:#eadcbd}.skl-row button.go:hover{background:#2a6590}.skl-note{margin:10px 2px 0;font-size:12px;color:#6d5d45;text-align:center}
.skl-x{position:absolute;right:10px;top:10px;width:44px;height:44px;border:0;border-radius:50%;background:transparent;font-size:22px;color:#6d5d45;cursor:pointer}.skl-card{position:relative}
`;document.head.append(s);}
  function openPanel(end,{mounted=null,onRide}={}){closePanel();css();
    const down=end==='top',dest=down?'Lavender & Bee Meadows':'the summit';
    panel=document.createElement('div');panel.className='skl';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Sky lift');
    panel.innerHTML=`<div class="skl-card"><button type="button" class="skl-x" aria-label="Close">×</button>
      <header><i aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M3 7l26-4"/><path d="M16 5v6"/><rect x="8" y="11" width="16" height="15" rx="3.5"/><path d="M8 18h16"/><path d="M12 14.5h3M17 14.5h3"/></svg></i><div><b>Cloudstep Sky Lift</b><small>${down?'Summit':'Meadow'} station · <span class="skl-state ${on?'on':''}">${on?'● Running':'○ Off'}</span></small></div></header>
      <div class="skl-row"><button type="button" class="${on?'go':''}" data-skl="ride" ${on?'':'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${down?'M12 4v15M6 13l6 6 6-6':'M12 20V5M6 11l6-6 6 6'}"/></svg>Ride to ${down?'valley':'summit'}</button>
      <button type="button" class="${on||!down?'':'go'}" data-skl="lever" ${down?'':'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5v8"/><path d="M7 6.6a7 7 0 1 0 10 0"/></svg>${on?'Switch off':'Switch on'}</button></div>
      <p class="skl-note">${on?(mounted?`Ride ${mounted} onto a horse platform. About ${Math.round(lay.L/LIFT_SPEED)} seconds to ${dest}.`:`About ${Math.round(lay.L/LIFT_SPEED)} seconds to ${dest}. Look around as you go.`):(down?'Pull the lever to start the lift. It stops by itself when nobody has ridden it for a few minutes.':'The lift is switched off. The lever is at the top of the mountain.')}</p></div>`;
    stage.append(panel);
    panel.addEventListener('click',e=>{if(e.target===panel||e.target.closest('.skl-x')){closePanel();return;}
      const b=e.target.closest('[data-skl]');if(!b)return;
      if(b.dataset.skl==='lever'){if(!down)return;setOn(!on);openPanel(end,{mounted,onRide});return;}
      if(b.dataset.skl==='ride'&&on){closePanel();onRide?.();}});}
  function setOn(v,why){on=!!v;idle=0;paint();onToggle?.(on,why);}

  // Board at a station: the loop shifts so a chair is waiting right there (nobody sees it jump, the panel was up).
  // kind 'seat' (on foot) takes a chair, 'horse' (mounted) a platform; seatY is the seat top or the deck top.
  function board(end,kind='seat'){if(!on)return null;const q0=end==='top'?0:lay.L,i=kind==='horse'?1:0;phase=((q0-i*spacing)%(2*lay.L)+2*lay.L)%(2*lay.L);ride={index:i,travelled:0,end,kind};place();
    return {kind,get done(){return !ride||ride.travelled>=lay.L;},point(){const pt=loopPoint(lay,phase+i*spacing),f=kind==='horse'?0:SEAT_Z+.2;   // hips just in front of the back rest
      return {...pt,x:pt.x+Math.sin(pt.yaw)*f,z:pt.z+Math.cos(pt.yaw)*f,seatY:kind==='horse'?pt.y-DECK+.075:pt.y+.08};},progress(){return ride?ride.travelled/lay.L:1;}};}
  function leave(){ride=null;}

  return {obstacles,layout:lay,stations,isOn:()=>on,setOn,openPanel,closePanel,board,leave,
    near(x,z,r=5.5){for(const st of Object.values(stations))if(Math.hypot(st.x-x,st.z-z)<r)return st.id;return null;},
    exitSpot(end){return exitSpot(lay,end==='top'?bottom:top,end==='top'?-1:1);},
    tick(delta){clock+=delta;if(on&&!ride){idle+=delta;if(idle>IDLE_OFF)setOn(false,'idle');}else idle=0;const want=on?LIFT_SPEED:0;speed+=(want-speed)*Math.min(1,delta*(on?.8:1.6));if(speed<.01&&!on)speed=0;
      const d=speed*delta;phase+=d;if(ride)ride.travelled+=d;
      for(const st of Object.values(stations))st.wheel.rotation.y+=(st.id==='top'?1:-1)*d/(LINE+.15);
      if(group.visible)place();},
    setVisible(v){group.visible=v;},
    dispose(){closePanel();group.removeFromParent();geos.forEach(g=>g.dispose());mats.forEach(m=>{m.userData.tex?.dispose();m.dispose();});}};
}
