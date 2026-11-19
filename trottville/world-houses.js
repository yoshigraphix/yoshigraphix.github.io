// v159 (Yoshi: "there's a door at the bottom of the clock tower and the bottom of the houses and I can't go inside.
// Nice if you could"): Thimbleford's fourteen Tudor houses are walk-in, the same dollhouse way as the shops. Walk up
// the doorstep and in: that house's upper walls and roof are cut away (world.js seeThrough: uCutA/uCutB), its doorway
// opens, and inside is a little home: plank floor, waist-high panelled walls, a fire, a table, a dresser, a rug.
// The floor is a raised surface in world-heights.mjs (the plinth is 0.5 m up), the doorstep a ramp onto it.
// Built once, all fourteen merged into a handful of meshes (one per material); only the fire glows per house.
const OWNERS=['Old Wilf','Posy and her gran','Bram the lamplighter','the Higgins twins','Ottilie the clock-keeper','Mrs Pennywhistle','the Abernathy family','Captain Ferris (retired)','Dot the baker’s sister','Mr and Mrs Ollerenshaw','Pip the chimney sweep','Granny Moss','the new family','Ned the carter'];
const LINES=['Nobody’s home, but the kettle is still warm.','It smells of fresh bread and woodsmoke.','A clock ticks somewhere. Tick, tock.','Someone left their knitting on the chair.','The fire crackles. What a cosy little room!','There’s a jigsaw half done on the table.','A cat opens one eye, then goes back to sleep.'];

export function buildHouses({T,houses,outdoors,HT,ground}){
  const root=new T.Group();root.name='house-interiors';outdoors.add(root);
  const M=(c,o={})=>new T.MeshStandardMaterial({color:c,roughness:.9,...o});
  const mats={plank:M('#a8784a'),dark:M('#5a3b24'),oak:M('#7a5634'),stone:M('#9c958a'),soot:M('#2a2420'),cloth:M('#c94f4f'),rug:M('#5b7fa8'),rug2:M('#b8863a'),cream:M('#efe3c8'),plate:M('#f4f1ea'),green:M('#5f8f4a'),cat:M('#e2a35a'),pot:M('#b4643c'),
    fire:new T.MeshBasicMaterial({color:'#ffb347'}),ember:new T.MeshBasicMaterial({color:'#ff6a2a'})};
  // one geometry list per material; parts are added in a house's local frame, then merged
  const bins=new Map(),box=new T.BoxGeometry(1,1,1).toNonIndexed(),cyl=new T.CylinderGeometry(.5,.5,1,10).toNonIndexed(),ball=new T.SphereGeometry(.5,8,6).toNonIndexed();
  const m4=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),p=new T.Vector3(),sc=new T.Vector3();let frame=new T.Matrix4();
  const wallMats=new Map();const wallMat=c=>{if(!wallMats.has(c))wallMats.set(c,M(new T.Color(c).multiplyScalar(.92).getStyle()));return wallMats.get(c);};
  function add(mat,g,x,y,z,sx,sy,sz,ry=0){m4.compose(p.set(x,y,z),q.setFromEuler(e.set(0,ry,0)),sc.set(sx,sy,sz)).premultiply(frame);const c=g.clone().applyMatrix4(m4);if(!bins.has(mat))bins.set(mat,[]);bins.get(mat).push(c);}
  const W=(h,u,v)=>{const c=Math.cos(h.yaw),s=Math.sin(h.yaw);return {x:h.x+u*c+v*s,z:h.z-u*s+v*c};};
  const fires=[],list=[];
  for(const h of houses){const Y=h.y+.5,{w,d}=h,hw=w/2-.2,hd=d/2-.2;frame=new T.Matrix4().makeRotationY(h.yaw).setPosition(h.x,Y,h.z);const flip=h.i%2?-1:1;
    // floor, and the panelled walls (waist high, with a dark oak cap) leaving the doorway open
    add(mats.plank,box,0,-.03,0,w-.3,.06,d-.3);
    const wm=wallMat(h.plaster);add(wm,box,0,.52,-hd,w-.4,1.05,.1);for(const s of [-1,1])add(wm,box,s*hw,.52,0,.1,1.05,d-.4);
    const side=(w-.4-1.3)/2;for(const s of [-1,1]){add(wm,box,s*(.65+side/2),.52,hd,side,1.05,.1);add(mats.oak,box,s*(.65+side/2),1.07,hd,side+.04,.06,.16);}
    add(mats.oak,box,0,1.07,-hd,w-.36,.06,.16);for(const s of [-1,1])add(mats.oak,box,s*hw,1.07,0,.16,.06,d-.36);
    // fireplace on the back wall, under the chimney side
    const fx=flip*(w/2-1.6),fz=-hd+.3;add(mats.stone,box,fx,.7,fz,1.7,1.4,.55);add(mats.soot,box,fx,.42,fz+.06,.95,.75,.5);add(mats.stone,box,fx,1.45,fz+.05,1.9,.12,.7);add(mats.stone,box,fx,.04,fz+.55,1.9,.08,.6);
    for(const dx of [-.22,0,.22])add(mats.oak,box,fx+dx,.14,fz+.12,.12,.1,.5,dx*2);
    const fireAt={y:Y+.32,...W(h,fx,fz+.15)};fires.push(fireAt);
    // table and two chairs
    const tx=-flip*1.1,tz=-.25;add(mats.oak,box,tx,.76,tz,1.5,.08,.95);for(const [a,b] of [[-.62,-.35],[.62,-.35],[-.62,.35],[.62,.35]])add(mats.dark,box,tx+a,.37,tz+b,.08,.74,.08);
    add(mats.cream,box,tx,.81,tz,.7,.01,.95);add(mats.plate,cyl,tx-.3,.82,tz+.1,.28,.02,.28);add(mats.pot,cyl,tx+.35,.88,tz,.22,.18,.22);
    for(const s of [-1,1]){const cx=tx+s*1.05;add(mats.oak,box,cx,.46,tz,.45,.06,.45);add(mats.oak,box,cx+s*.2,.75,tz,.06,.6,.45);for(const [a,b] of [[-.18,-.18],[.18,-.18],[-.18,.18],[.18,.18]])add(mats.dark,box,cx+a,.22,tz+b,.05,.44,.05);}
    // dresser with plates on the other side wall, a rug, a plant by the door
    const dx=-flip*(hw-.3),dz=-1.1;add(mats.oak,box,dx,.5,dz,.5,1,1.5);add(mats.dark,box,dx,1.02,dz,.56,.05,1.56);
    for(const k of [-.45,0,.45])add(mats.plate,cyl,dx+flip*.05,1.25,dz+k,.32,.32,.04);
    add(h.i%3?mats.rug:mats.rug2,box,flip*.6,.01,1,2.2,.02,1.5);
    add(mats.pot,cyl,flip*(hw-.45),.22,hd-.5,.36,.44,.36);add(mats.green,ball,flip*(hw-.45),.62,hd-.5,.6,.55,.6);
    // an armchair by the fire, and on some days a ginger cat on the rug
    const ax=flip*(w/2-1.7),az=.55;add(mats.cloth,box,ax,.32,az,.8,.4,.75);add(mats.cloth,box,ax,.7,az-.33,.8,.6,.14);for(const s of [-1,1])add(mats.cloth,box,ax+s*.36,.52,az,.12,.3,.75);
    if(h.i%3===0){add(mats.cat,ball,flip*.6,.14,1,.42,.22,.6);add(mats.cat,ball,flip*.6+.12,.2,1.3,.24,.22,.24);add(mats.cat,box,flip*.6-.15,.08,.7,.06,.06,.4,.6);}
    // walking: the floor (inside the panelling, round the furniture) and the doorstep ramp
    const C=(u,v,r)=>({...W(h,u,v),r});const rot=Math.abs(Math.sin(h.yaw))>.5;
    const floor=HT.add({kind:'rect',id:'house',house:h.i,x:h.x,z:h.z,hx:rot?hd-.38:hw-.38,hz:rot?hw-.38:hd-.38,y:Y,
      block:[C(fx,fz+.1,1.15),C(tx,tz,.95),C(tx-1.05,tz,.42),C(tx+1.05,tz,.42),C(dx,dz-.45,.5),C(dx,dz+.45,.5),C(ax,az,.6),C(flip*(hw-.45),hd-.5,.45)]});
    const out=W(h,0,d/2+1.2),inn=W(h,0,d/2-.7);HT.add({kind:'strip',id:'doorstep',house:h.i,foot:true,ax:out.x,az:out.z,ay:ground(out.x,out.z),bx:inn.x,bz:inn.z,by:Y,w:1.05});
    // the cut boxes (world space): everything above the panelling, and the doorway
    const pts=(u0,u1,v0,v1)=>[W(h,u0,v0),W(h,u1,v0),W(h,u0,v1),W(h,u1,v1)],bb=a=>({x0:Math.min(...a.map(p=>p.x)),x1:Math.max(...a.map(p=>p.x)),z0:Math.min(...a.map(p=>p.z)),z1:Math.max(...a.map(p=>p.z))});
    const A=bb(pts(-w/2-.45,w/2+.45,-d/2-.45,d/2+h.j+.5)),B=bb(pts(-.7,.7,d/2-.4,d/2+.12));
    list.push({h,floor,owner:OWNERS[h.i%OWNERS.length],line:LINES[h.i%LINES.length],door:W(h,0,d/2+1.4),
      cutA:[new T.Vector3(A.x0,Y+1.04,A.z0),new T.Vector3(A.x1,Y+30,A.z1)],cutB:[new T.Vector3(B.x0,h.y-1,B.z0),new T.Vector3(B.x1,Y+2.5,B.z1)]});}
  for(const [mat,parts] of bins){const pos=[],nor=[];for(const g of parts){pos.push(...g.attributes.position.array);nor.push(...g.attributes.normal.array);g.dispose();}
    const bg=new T.BufferGeometry();bg.setAttribute('position',new T.Float32BufferAttribute(pos,3));bg.setAttribute('normal',new T.Float32BufferAttribute(nor,3));bg.computeBoundingSphere();
    const mesh=new T.Mesh(bg,mat);mesh.castShadow=false;mesh.receiveShadow=false;root.add(mesh);}
  box.dispose();cyl.dispose();ball.dispose();
  // one flickering flame (no extra light: a point light would cost every material in the world), moved to the house you're in
  const flame=new T.Mesh(new T.ConeGeometry(.2,.55,7),mats.fire);root.add(flame);flame.visible=false;const ember=new T.Mesh(new T.ConeGeometry(.13,.34,6),mats.ember);flame.add(ember);ember.position.set(.1,-.08,.05);
  let current=null;const mid={x:houses.reduce((a,h)=>a+h.x,0)/(houses.length||1),z:houses.reduce((a,h)=>a+h.z,0)/(houses.length||1)};
  const houseAt=(x,z,upY,surf)=>surf&&(surf.id==='house'||surf.id==='doorstep')?list[surf.house]:null;
  return {list,root,
    // each frame: which house you're in (or on the doorstep of) sets the cut; the fire flickers there.
    tick(dt,t,{x,z,upY,surf},cut){const here=houseAt(x,z,upY,surf);root.visible=Math.hypot(x-mid.x,z-mid.z)<75;   // only drawn near Thimbleford
      if(here!==current){const was=current;current=here;if(here){cut.uCutALo.value.copy(here.cutA[0]);cut.uCutAHi.value.copy(here.cutA[1]);cut.uCutBLo.value.copy(here.cutB[0]);cut.uCutBHi.value.copy(here.cutB[1]);}
        else{cut.uCutALo.value.set(1,1,1);cut.uCutAHi.value.set(0,0,0);cut.uCutBLo.value.set(1,1,1);cut.uCutBHi.value.set(0,0,0);}
        if(here&&!was)return {entered:here};if(!here&&was)return {left:was};}
      if(current){const f=fires[current.h.i];flame.visible=true;flame.position.set(f.x,f.y+.12,f.z);flame.scale.set(1,1+.15*Math.sin(t*11),1);}
      else flame.visible=false;
      return null;},
    inside:()=>current};
}
