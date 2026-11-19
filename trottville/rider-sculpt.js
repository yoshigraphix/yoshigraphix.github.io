// Saddle, bridle, reins and an anime jockey for the sculpted horse (horse-sculpt.js). Same toon ramp and
// inverted-hull ink outline, so horse and rider read as one drawing. The rider sits on horse.body, so it rides the
// horse's bob and pitch for free; update() adds the jockey's forward fold and keeps the reins taut.
import {makeChibiCharacter} from './chibi-character.js?v=161';
import {lookFromSeed} from './character-looks.mjs?v=161';
// Tack Packs (#31): one small canvas texture per pattern + colour pair, shared by every horse that wears it.
const TEXC=new Map();
export function packTex(T,pat,a,b){const k=pat+a+b;if(TEXC.has(k))return TEXC.get(k);const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
  x.fillStyle=a;x.fillRect(0,0,128,128);x.fillStyle=b;
  if(pat==='stripes'){for(let i=-128;i<256;i+=32){x.beginPath();x.moveTo(i,0);x.lineTo(i+16,0);x.lineTo(i+16+128,128);x.lineTo(i+128,128);x.fill();}}
  else if(pat==='dots'){for(let i=0;i<4;i++)for(let j=0;j<4;j++){x.beginPath();x.arc(16+i*32+(j%2)*8,16+j*32,7,0,7);x.fill();}}
  else if(pat==='plaid'){x.globalAlpha=.65;for(let i=0;i<128;i+=42){x.fillRect(i+10,0,10,128);x.fillRect(0,i+10,128,10);}x.globalAlpha=1;}
  else if(pat==='stars'){const st=(cx,cy,r)=>{x.beginPath();for(let i=0;i<10;i++){const q=i*Math.PI/5-Math.PI/2,rr=i%2?r*.45:r;x.lineTo(cx+Math.cos(q)*rr,cy+Math.sin(q)*rr);}x.fill();};st(32,32,13);st(96,90,13);st(92,24,7);st(28,96,7);}
  else if(pat==='rainbow'){['#e2553c','#ffd35c','#5fae5a','#2f7dd1','#8a4fd8'].forEach((col,i)=>{x.fillStyle=col;x.fillRect(0,i*25.6,128,26);});}
  else if(pat==='crest'){const g=x.createLinearGradient(0,0,128,128);g.addColorStop(0,'#fff3b0');g.addColorStop(.4,'#f6c945');g.addColorStop(.75,'#c8901a');g.addColorStop(1,'#fff3b0');x.fillStyle=g;x.fillRect(0,0,128,128);}
  else if(pat==='bolt'){x.beginPath();[[70,8],[40,66],[62,66],[48,120],[92,52],[68,52],[86,8]].forEach(([u,v])=>x.lineTo(u,v));x.fill();}
  const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;TEXC.set(k,t);return t;}
export function addTackAndRider(T,horse,opt={}){
  const silk=opt.silk||'#2f6b3a',trim=opt.trim||'#f2b632',skin=opt.skin||'#f3cfae',hair=opt.hair||'#5a3b2a',
    leather='#5a3825',cloth='#fffaf0',breeches='#f1ebdc',boot='#2e2622',
    saddle=opt.saddle||leather,bridle=opt.bridle||leather;// tack colours (riding.mjs): plain tan for the free tack, the chosen colour once upgraded
  const ramp=new T.DataTexture(new Uint8Array([120,120,120,255,200,200,200,255,255,255,255,255]),3,1,T.RGBAFormat);
  ramp.minFilter=ramp.magFilter=T.NearestFilter;ramp.needsUpdate=true;
  const mats=new Map(),toon=c=>{if(!mats.has(c))mats.set(c,new T.MeshToonMaterial({color:c,gradientMap:ramp}));return mats.get(c);};
  const basic=c=>{const k='b'+c;if(!mats.has(k))mats.set(k,new T.MeshBasicMaterial({color:c}));return mats.get(k);};
  const ink=new T.MeshBasicMaterial({color:'#2b2420',side:T.BackSide});
  ink.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n  transformed += normal * 0.016;');};
  ink.customProgramCacheKey=()=>'rider-ink';
  const geos=[],added=[];
  function part(parent,geo,color,{p=[0,0,0],r=[0,0,0],s=[1,1,1],outline=true,flat=false}={}){
    geos.push(geo);const m=new T.Mesh(geo,flat?basic(color):toon(color));m.position.set(...p);m.rotation.set(...r);m.scale.set(...s);
    m.castShadow=!flat;parent.add(m);if(outline)m.add(new T.Mesh(geo,ink));return m;
  }
  // A capsule from a to b (local coords of parent).
  const up=new T.Vector3(0,1,0);
  function limb(parent,a,b,rad,color){const A=new T.Vector3(...a),B=new T.Vector3(...b),d=B.clone().sub(A),len=d.length();
    const m=part(parent,new T.CapsuleGeometry(rad,Math.max(.01,len),4,10),color,{p:A.clone().add(B).multiplyScalar(.5).toArray()});
    m.quaternion.setFromUnitVectors(up,d.normalize());return m;}
  const tube=(parent,pts,rad,color,outline=false)=>part(parent,new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(q=>new T.Vector3(...q))),16,rad,6),color,{outline});
  const sphere=new T.SphereGeometry(1,20,14);

  // ---- Saddle: partial cylinders hugging the barrel (barrel axis runs along z, centre y ≈ 1.6) ----
  const B=horse.body,tack=new T.Group();B.add(tack);added.push(tack);
  // thetaStart puts the arc on top after the geometry is turned to run along z.
  const shell=(r,len,arc,color,z)=>{const g=new T.CylinderGeometry(r,r,len,28,1,true,Math.PI-arc/2,arc);g.rotateX(Math.PI/2);
    return part(tack,g,color,{p:[0,1.6,z],outline:false});};
  shell(.565,1.02,2.5,trim,-.12);shell(.569,.9,2.3,cloth,-.12);shell(.588,.62,1.5,saddle,-.1);
  part(tack,new T.CapsuleGeometry(.07,.36,4,8),saddle,{p:[0,2.17,.22],r:[0,0,Math.PI/2]});
  part(tack,new T.CapsuleGeometry(.09,.4,4,8),saddle,{p:[0,2.21,-.42],r:[0,0,Math.PI/2]});
  part(tack,new T.TorusGeometry(.548,.035,8,32),saddle,{p:[0,1.6,.26],outline:false});

  // ---- Bridle on the head (head-local = sculpt coords minus the poll pivot HP) ----
  const HP=[0,3,1.32],L=p=>[p[0]-HP[0],p[1]-HP[1],p[2]-HP[2]],H=horse.head;
  const ring=(parent,centre,axis,rad,tubeR,color)=>{const m=part(parent,new T.TorusGeometry(rad,tubeR,6,28),color,{p:L(centre),outline:false});
    m.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(...axis).normalize());return m;};
  ring(H,[0,2.69,1.97],[0,-.19,.34],.268,.024,bridle);
  ring(H,[0,3.07,1.27],[0,-.3,.6],.335,.026,bridle);
  tube(H,[[-.22,3.22,1.47],[0,3.27,1.54],[.22,3.22,1.47]].map(L),.024,trim);
  const bits=[];
  for(const s of [-1,1]){
    tube(H,[[s*.31,3.07,1.3],[s*.395,2.92,1.58],[s*.3,2.72,1.9],[s*.23,2.55,2.04]].map(L),.022,bridle);
    part(H,new T.TorusGeometry(.048,.013,6,12),'#c9ccd0',{p:L([s*.235,2.52,2.06]),r:[0,Math.PI/2,0],outline:false});
    const b=new T.Object3D();b.position.set(...L([s*.235,2.52,2.06]));H.add(b);bits.push(b);
  }


  // ---- Tack Packs gear (#31): saddle pad, flag on a pole, face piece, leg wraps, tail bow, shiny sparkle ----
  const P=opt.packs||{},gearUpd=[];
  const tmat=it=>{const k='t'+it.pat+it.a+it.b;if(!mats.has(k))mats.set(k,new T.MeshToonMaterial({map:packTex(T,it.pat,it.a,it.b),gradientMap:ramp,side:T.DoubleSide,emissive:it.rar==='s'?'#5a4410':'#000'}));return mats.get(k);};
  const tpart=(parent,geo,it,{p=[0,0,0],r=[0,0,0],s=[1,1,1]}={})=>{geos.push(geo);const m=new T.Mesh(geo,tmat(it));m.position.set(...p);m.rotation.set(...r);m.scale.set(...s);m.castShadow=true;parent.add(m);added.push(m);return m;};
  const zAx=new T.Vector3(0,0,1);
  if(P.blanket){const g=new T.CylinderGeometry(.576,.576,1.28,28,1,true,Math.PI-1.52,3.04);g.rotateX(Math.PI/2);tpart(tack,g,P.blanket,{p:[0,1.6,-.12]});
    const hem=new T.CylinderGeometry(.58,.58,1.3,28,1,true,Math.PI-1.53,.08);hem.rotateX(Math.PI/2);const hm=new T.MeshToonMaterial({color:P.blanket.b,gradientMap:ramp,side:T.DoubleSide});mats.set('hem'+Math.random(),hm);
    for(const sd of [0,1]){geos.push(hem);const m=new T.Mesh(hem,hm);m.position.set(0,1.6,-.12);m.rotation.z=sd?2.96:0;tack.add(m);added.push(m);}}
  if(P.flag){part(tack,new T.CylinderGeometry(.022,.026,1.75,6),'#8a5a2b',{p:[0,2.88,-.64],outline:false});part(tack,new T.SphereGeometry(.06,10,8),'#f6c945',{p:[0,3.78,-.64],outline:false});
    const g=new T.PlaneGeometry(.78,.5,12,2);g.translate(.39,0,0);g.rotateY(Math.PI/2);const fl=tpart(tack,g,P.flag,{p:[0,3.47,-.64]});
    const pos=g.attributes.position,base=Float32Array.from(pos.array);
    gearUpd.push((t,speed)=>{const amp=.03+.05*Math.min(1,speed/6),f=6+speed*.8;for(let i=0;i<pos.count;i++){const z=base[i*3+2];pos.array[i*3]=Math.sin(z*7-t*f)*amp*(-z/.78)*3;}pos.needsUpdate=true;});}
  if(P.face){const it=P.face,n=it.name||'';
    if(/Blinders/.test(n))for(const s of [-1,1]){tpart(H,new T.BoxGeometry(.035,.19,.24),it,{p:L([s*.43,3.04,1.56]),r:[0,s*.38,0]});}
    if(/Bonnet/.test(n))for(const s of [-1,1]){tpart(H,new T.ConeGeometry(.115,.42,12,1,true),it,{p:L([s*.17+s*.035,3.5,1.42]),r:[0,0,-s*.18]});}
    if(/Noseband/.test(n)){const m=tpart(H,new T.TorusGeometry(.272,.062,8,28),it,{p:L([0,2.69,1.97])});m.quaternion.setFromUnitVectors(zAx,new T.Vector3(0,-.19,.34).normalize());}
    else{const g=new T.TubeGeometry(new T.CatmullRomCurve3([[-.25,3.2,1.44],[0,3.27,1.545],[.25,3.2,1.44]].map(q=>new T.Vector3(...L(q)))),16,.05,8);tpart(H,g,it);
      if(it.pat==='stars')tpart(H,new T.OctahedronGeometry(.06),{pat:'plain',a:'#e9e1ff',b:'#fff',rar:'e'},{p:L([0,3.27,1.6])});}}
  if(P.legs)for(const lg of horse.legs||[]){tpart(lg.joint,new T.CylinderGeometry(.098,.104,.3,14,1,true),P.legs,{p:[0,-.28,0]});}
  if(P.tail&&horse.tail){const it=P.tail,tl=horse.tail;
    for(const s of [-1,1])tpart(tl,new T.ConeGeometry(.12,.3,10),it,{p:[s*.19,0,-.22],r:[0,0,s*Math.PI/2]});
    tpart(tl,new T.SphereGeometry(.09,10,8),{...it,pat:'plain',a:it.b},{p:[0,0,-.22]});
    if(it.pat==='rainbow'||it.pat==='stripes')for(const s of [-1,0,1]){const g=new T.TubeGeometry(new T.CatmullRomCurve3([[s*.08,-.05,-.26],[s*.2,-.45,-.56],[s*.18,-.95,-.66]].map(q=>new T.Vector3(...q))),12,.03,5);tpart(tl,g,it);}}
  if(P.shiny){const n=26,pts=new Float32Array(n*3);for(let i=0;i<n;i++){const a=i*2.4,r=.7+(i%5)*.12;pts.set([Math.cos(a)*r,1.2+((i*37)%17)/10,Math.sin(a)*r*1.4],i*3);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pts,3));geos.push(g);const m=new T.PointsMaterial({color:'#fff3b0',size:.11,transparent:true,depthWrite:false});mats.set('spk',m);
    const sp=new T.Points(g,m);horse.body.add(sp);added.push(sp);gearUpd.push(t=>{m.opacity=.45+.45*Math.sin(t*3.1);sp.rotation.y=t*.4;});}

  // ---- Rider: the player's own chibi character, seated with its hips on the saddle ----
  // The rider is one size on every horse: undo the horse's scale, so a small pony makes the rider look big
  // (cute) instead of shrinking them. On bigger horses keep the full width so the legs still clear the barrel.
  const hs=horse.scale||1,rider=new T.Group();rider.position.set(0,2.2,-.12);rider.scale.set(Math.max(1,hs)/hs,1/hs,1/hs);B.add(rider);added.push(rider);
  const RS=.98,character=makeChibiCharacter(T,opt.look||lookFromSeed('rider'),{outline:.016,fullLight:!!opt.fullLight});
  character.root.scale.setScalar(RS);character.root.position.y=character.seatOffset()*RS;rider.add(character.root);
  const hands=character.hands;
  // ---- Reins: two thin rods re-aimed every frame from the bit rings to the hands ----
  const reinGeo=new T.CylinderGeometry(.014,.014,1,5);geos.push(reinGeo);
  const reins=[0,1].map(()=>{const m=new T.Mesh(reinGeo,toon(bridle));horse.root.add(m);added.push(m);return m;});
  const a=new T.Vector3(),b=new T.Vector3();

  let clock=0;
  function update(dt,{jumpT=-1,speed=0,steer=0}={}){
    clock+=dt;for(const f of gearUpd)f(clock,speed);
    // Two-point seat: more fold at speed, deepest over the fence.
    const air=jumpT>=0?Math.sin(Math.PI*Math.min(1,jumpT/.8)):0;
    character.update(dt,{pose:'ride',speed,air,steer});rider.position.y=2.2+.05*air/hs;
    horse.root.updateMatrixWorld(true);
    for(let i=0;i<2;i++){
      horse.root.worldToLocal(hands[i].getWorldPosition(a));horse.root.worldToLocal(bits[i].getWorldPosition(b));
      const m=reins[i],d=b.clone().sub(a),len=d.length();m.position.copy(a).add(b).multiplyScalar(.5);m.scale.set(1,len,1);m.quaternion.setFromUnitVectors(up,d.normalize());
    }
  }
  function dispose(){character.dispose();for(const o of added)o.parent?.remove(o);geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());ink.dispose();ramp.dispose();}
  update(0);
  // saddleGroup: hidden on a horse with no saddle on yet (its head straps then read as a halter).
  return {rider,character,update,dispose,saddleGroup:tack};
}
