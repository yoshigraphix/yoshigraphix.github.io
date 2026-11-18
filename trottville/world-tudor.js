// Tudor shop fronts (look upgrade, 2026-11-16; Yoshi: "Tudor styles is welcome" + "texture to make it look real vs
// cartoon"). First building: Bea's Bakery. Same room, walls, doorway and collision as every walk-in shop (world-town.mjs);
// only the look changes:
//  · ground floor: lime plaster on a coursed stone plinth, dark oak frame (sill, wall plate, close studding, corner
//    braces), leaded diamond-pane windows with oak mullions and stone sills, a heavy oak door frame;
//  · a jettied upper storey on the roof group (it lifts away with the roof when you walk in): bressummer beam,
//    joist ends under the overhang, studs + chevron braces, an oriel window over the door;
//  · a steep clay-tile roof with the gable to the square, bargeboards, a finial and a brick chimney with two pots.
// Textures are drawn once on canvases at runtime (no image files: the artifact is capped at 512 files). Every part
// is merged into one mesh per material per group, so a whole building is ~8 draw calls (phones).
// Window glass is mat('#3e4a52'): dark by day like real leaded glass; world-lanterns.js lights it amber after dusk.

let TEX=null;
function rand(seed){let a=seed|0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function canvas(n){const c=document.createElement('canvas');c.width=c.height=n;return [c,c.getContext('2d')];}
// Draw at the 9 wrap offsets so blobs crossing an edge tile seamlessly.
const wrap9=(n,f)=>{for(const ox of [-n,0,n])for(const oy of [-n,0,n])f(ox,oy);};
const rgb=(r,g,b,a=1)=>`rgba(${r|0},${g|0},${b|0},${a})`;

function makeTextures(T){
  const tex=(c,srgb=true)=>{const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;if(srgb)t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;};
  const out={};
  // Lime plaster: warm cream, soft cloudy patches, trowel sweeps and fine grit.
  {const N=256,[c,g]=canvas(N),r=rand(11);g.fillStyle='#eadcc0';g.fillRect(0,0,N,N);
    for(let i=0;i<900;i++){const x=r()*N,y=r()*N,rad=3+r()*20,l=r()<.5;g.fillStyle=l?rgb(255,250,236,.05+r()*.05):rgb(150,128,96,.035+r()*.04);
      wrap9(N,(ox,oy)=>{g.beginPath();g.ellipse(x+ox,y+oy,rad,rad*(.4+r()*.6),r()*3,0,7);g.fill();});}
    for(let i=0;i<60;i++){const x=r()*N,y=r()*N,len=20+r()*50;g.strokeStyle=rgb(255,252,240,.12);g.lineWidth=1+r()*2;
      wrap9(N,(ox,oy)=>{g.beginPath();g.arc(x+ox,y+oy,len,r()*6,r()*6+.6);g.stroke();});}
    for(let i=0;i<5000;i++){const v=r();g.fillStyle=v<.5?rgb(110,92,70,.12):rgb(255,255,250,.14);g.fillRect(r()*N,r()*N,1,1);}
    out.plaster=tex(c);}
  // Weathered oak: near-black brown, grain running along u, a few knots.
  {const N=256,[c,g]=canvas(N),r=rand(23);g.fillStyle='#43301f';g.fillRect(0,0,N,N);
    for(let i=0;i<110;i++){const y0=r()*N,amp=1+r()*4,k=1+(r()*3|0),ph=r()*6,d=r()<.6;g.strokeStyle=d?rgb(24,15,9,.25+r()*.3):rgb(120,90,60,.12+r()*.18);g.lineWidth=.6+r()*1.8;
      for(const oy of [-N,0,N]){g.beginPath();for(let x=0;x<=N;x+=4){const y=y0+oy+Math.sin(x/N*Math.PI*2*k+ph)*amp;x?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();}}
    for(let i=0;i<4;i++){const x=r()*N,y=r()*N;for(let k=6;k>0;k--){g.strokeStyle=rgb(20,12,6,.35);g.lineWidth=1;wrap9(N,(ox,oy)=>{g.beginPath();g.ellipse(x+ox,y+oy,k*3.2,k*1.2,0,0,7);g.stroke();});}}
    for(let i=0;i<3000;i++){g.fillStyle=rgb(0,0,0,.15);g.fillRect(r()*N,r()*N,1,2);}
    out.oak=tex(c);}
  // Clay roof tiles: 8 × 8 per tile, rows staggered, each tile its own red-brown, a dark lip at the bottom, moss.
  {const N=256,[c,g]=canvas(N),[cb,gb]=canvas(N),r=rand(37),tw=32,th=32;g.fillStyle='#3a1c12';g.fillRect(0,0,N,N);gb.fillStyle='#000';gb.fillRect(0,0,N,N);
    for(let row=0;row<N/th;row++)for(let k=-1;k<=N/tw;k++){const x=k*tw+(row%2?tw/2:0)+1,y=row*th,R=150+r()*45-20,G=70+r()*25-8,B=44+r()*18-8;
      const gr=g.createLinearGradient(0,y,0,y+th);gr.addColorStop(0,rgb(R*.82,G*.82,B*.82));gr.addColorStop(.75,rgb(R,G,B));gr.addColorStop(1,rgb(R*.55,G*.5,B*.5));
      g.fillStyle=gr;g.fillRect(x,y,tw-2,th-1);const gb2=gb.createLinearGradient(0,y,0,y+th);gb2.addColorStop(0,'#555');gb2.addColorStop(.85,'#fff');gb2.addColorStop(1,'#222');gb.fillStyle=gb2;gb.fillRect(x,y,tw-2,th-1);
      for(let s=0;s<40;s++){g.fillStyle=rgb(30,10,5,.15);g.fillRect(x+r()*(tw-2),y+r()*th,1,1);}}
    for(let i=0;i<26;i++){const x=r()*N,y=r()*N,rad=2+r()*7;g.fillStyle=rgb(90+r()*30,105+r()*30,55,.35+r()*.25);wrap9(N,(ox,oy)=>{g.beginPath();g.ellipse(x+ox,y+oy,rad,rad*.6,0,0,7);g.fill();});}
    out.tiles=tex(c);out.tilesBump=tex(cb,false);}
  // Coursed stone (plinth, sills): rows of differing height, blocks of differing length, pale mortar.
  {const N=256,[c,g]=canvas(N),[cb,gb]=canvas(N),r=rand(51);g.fillStyle='#a49a88';g.fillRect(0,0,N,N);gb.fillStyle='#000';gb.fillRect(0,0,N,N);
    const rows=[];let y=0;while(y<N){let h=26+r()*22|0;if(N-y-h<24)h=N-y;rows.push([y,h]);y+=h;}
    for(const [y0,h] of rows){let x=r()*N,end=x+N;while(x<end){let w=34+r()*48|0;if(end-x-w<28)w=end-x;const v=132+r()*44,R=v+10,G=v+4,B=v-10;
      for(const ox of [-N,0]){g.fillStyle=rgb(R,G,B);g.fillRect(x+ox+2,y0+2,w-4,h-4);gb.fillStyle='#ddd';gb.fillRect(x+ox+2,y0+2,w-4,h-4);gb.fillStyle='#fff';gb.fillRect(x+ox+5,y0+5,w-10,h-10);
        for(let s=0;s<w*h/18;s++){g.fillStyle=r()<.5?rgb(70,64,54,.18):rgb(235,228,210,.16);g.fillRect(x+ox+2+r()*(w-4),y0+2+r()*(h-4),1+r()*2,1+r()*2);}}x+=w;}}
    out.stone=tex(c);out.stoneBump=tex(cb,false);}
  // Brick (chimney): stretcher bond, soft red, lime mortar.
  {const N=256,[c,g]=canvas(N),[cb,gb]=canvas(N),r=rand(67),bh=16,bw=64;g.fillStyle='#b9ab95';g.fillRect(0,0,N,N);gb.fillStyle='#000';gb.fillRect(0,0,N,N);
    for(let row=0;row<N/bh;row++)for(let k=-1;k<=N/bw;k++){const x=k*bw+(row%2?bw/2:0),y=row*bh,R=150+r()*45,G=70+r()*25,B=52+r()*20;
      g.fillStyle=rgb(R,G,B);g.fillRect(x+2,y+2,bw-3,bh-3);gb.fillStyle='#fff';gb.fillRect(x+2,y+2,bw-3,bh-3);
      for(let s=0;s<50;s++){g.fillStyle=rgb(40,15,10,.2);g.fillRect(x+2+r()*(bw-4),y+2+r()*(bh-4),1,1);}}
    out.brick=tex(c);out.brickBump=tex(cb,false);}
  // Slate: small blue-grey rectangles, staggered, with dark gaps.
  {const N=256,[c,g]=canvas(N),[cb,gb]=canvas(N),r=rand(41),tw=32,th=24;g.fillStyle='#22262b';g.fillRect(0,0,N,N);gb.fillStyle='#000';gb.fillRect(0,0,N,N);
    for(let row=0;row<Math.ceil(N/th)+1;row++)for(let k=-1;k<=N/tw;k++){const x=k*tw+(row%2?tw/2:0)+1,y=row*th,v=78+r()*30,b=v+8+r()*10;
      for(const oy of [0,-N]){g.fillStyle=rgb(v,v+4,b);g.fillRect(x,y+oy,tw-2,th-1);g.fillStyle=rgb(20,22,26,.35);g.fillRect(x,y+oy+th-4,tw-2,3);gb.fillStyle='#fff';gb.fillRect(x,y+oy,tw-2,th-4);}
      for(let q=0;q<30;q++){g.fillStyle=rgb(200,205,215,.08);g.fillRect(x+r()*(tw-2),y+r()*th,1,1);}}
    out.slate=tex(c);out.slateBump=tex(cb,false);}
  // Ashlar: dressed stone in even courses (town hall ground floor).
  {const N=256,[c,g]=canvas(N),[cb,gb]=canvas(N),r=rand(43),bh=42.67;g.fillStyle='#b9b09d';g.fillRect(0,0,N,N);gb.fillStyle='#000';gb.fillRect(0,0,N,N);
    for(let row=0;row<6;row++){let x=(row%2)*40,end=x+N;while(x<end){const w=Math.min(end-x,70+(r()*40|0)),v=168+r()*26;
      for(const ox of [-N,0]){g.fillStyle=rgb(v+6,v,v-14);g.fillRect(x+ox+2,row*bh+2,w-3,bh-3);gb.fillStyle='#fff';gb.fillRect(x+ox+3,row*bh+3,w-5,bh-5);
        for(let q=0;q<w*bh/12;q++){g.fillStyle=r()<.5?rgb(90,84,72,.12):rgb(240,234,220,.12);g.fillRect(x+ox+2+r()*(w-4),row*bh+2+r()*(bh-4),1,1);}}x+=w;}}
    out.ashlar=tex(c);out.ashlarBump=tex(cb,false);}
  // Bark: furrows running along v (the trunk), ridges, lichen.
  {const N=256,[c,g]=canvas(N),[cb,gb]=canvas(N),r=rand(81);g.fillStyle='#4e3a2a';g.fillRect(0,0,N,N);gb.fillStyle='#808080';gb.fillRect(0,0,N,N);
    for(let i=0;i<70;i++){const x0=r()*N,w=3+r()*9,v=r();const col=v<.5?rgb(110+r()*30,88+r()*20,66+r()*14,.7):rgb(38,27,19,.75);
      for(const ox of [-N,0,N]){g.strokeStyle=col;g.lineWidth=w;gb.strokeStyle=v<.5?'#e0e0e0':'#202020';gb.lineWidth=w;
        for(const [G2] of [[g],[gb]]){G2.beginPath();for(let y=-8;y<=N+8;y+=8){const x=x0+ox+Math.sin(y/N*Math.PI*2*(1+(i%3))+i)*4+(r()-.5)*2;y>-8?G2.lineTo(x,y):G2.moveTo(x,y);}G2.stroke();}}}
    for(let i=0;i<30;i++){const x=r()*N,y=r()*N,rad=2+r()*7;g.fillStyle=rgb(150+r()*40,160+r()*30,120,.35);wrap9(N,(ox,oy)=>{g.beginPath();g.ellipse(x+ox,y+oy,rad,rad*1.4,0,0,7);g.fill();});}
    out.bark=tex(c);out.barkBump=tex(cb,false);}
  // Cut log end: growth rings, radial cracks, a bark edge.
  {const N=256,[c,g]=canvas(N),r=rand(83);g.fillStyle='#3b2a1d';g.fillRect(0,0,N,N);const cx=N/2+(r()-.5)*14,cy=N/2+(r()-.5)*14;
    g.fillStyle='#c9a476';g.beginPath();g.arc(N/2,N/2,N/2-12,0,7);g.fill();
    for(let k=1;k<26;k++){g.strokeStyle=k%4?rgb(150,112,72,.45):rgb(110,78,46,.6);g.lineWidth=1+r()*1.5;g.beginPath();g.ellipse(cx,cy,k*4.4+r()*2,k*4.2+r()*2,r(),0,7);g.stroke();}
    for(let k=0;k<5;k++){const a=r()*7,l=40+r()*60;g.strokeStyle='rgba(50,32,20,.6)';g.lineWidth=1.5;g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+Math.cos(a)*l,cy+Math.sin(a)*l);g.stroke();}
    out.rings=tex(c);}
  // Leaded lights: diamond cames (white = lead) for an alpha map in front of the glass.
  {const N=128,[c,g]=canvas(N);g.fillStyle='#000';g.fillRect(0,0,N,N);g.strokeStyle='#fff';g.lineWidth=4;
    for(let k=-4;k<=4;k++){g.beginPath();g.moveTo(k*32,0);g.lineTo(k*32+N,N);g.stroke();g.beginPath();g.moveTo(k*32+N,0);g.lineTo(k*32,N);g.stroke();}
    out.lattice=tex(c,false);}
  return out;}

// Merge everything added under one group into one mesh per material (positions baked from each part's transform).
export function kit(T,geo){
  const parts=new Map(),M=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),p=new T.Vector3(),s=new T.Vector3(1,1,1);let seed=1;
  const push=(m,g)=>{if(!parts.has(m))parts.set(m,[]);parts.get(m).push(g.index?g.toNonIndexed():g);};
  return {
    // A box whose texture keeps its real size (tile = metres per texture repeat). grain: 'u' keeps the texture's u
    // along the longest side of each face (oak grain runs down posts and along beams); 'z' lays rows along local z.
    box(m,x,y,z,sx,sy,sz,{tile=1,grain=null,rx=0,ry=0,rz=0}={}){const gm=new T.BoxGeometry(sx,sy,sz),uv=gm.attributes.uv,dims=[[sz,sy],[sz,sy],[sx,sz],[sx,sz],[sx,sy],[sx,sy]];
      const r=rand(seed++),ou=r(),ov=r();
      for(let f=0;f<6;f++){const [du,dv]=dims[f],sw=grain==='u'?dv>du:grain==='z'?(f===2||f===3):false;
        for(let i=f*4;i<f*4+4;i++){const u=uv.getX(i),v=uv.getY(i);sw?uv.setXY(i,v*dv/tile+ou,u*du/tile+ov):uv.setXY(i,u*du/tile+ou,v*dv/tile+ov);}}
      M.compose(p.set(x,y,z),q.setFromEuler(e.set(rx,ry,rz)),s);gm.applyMatrix4(M);push(m,gm);},
    // Any geometry (uv already in metres/tile), placed by position + rotation.
    put(m,gm,x,y,z,rx=0,ry=0,rz=0){M.compose(p.set(x,y,z),q.setFromEuler(e.set(rx,ry,rz)),s);gm.applyMatrix4(M);push(m,gm);},
    flush(parent,{shadow=true}={}){for(const [m,list] of parts){const pos=[],nor=[],uv=[];
        for(const g of list){pos.push(...g.attributes.position.array);nor.push(...g.attributes.normal.array);
          if(g.attributes.uv)uv.push(...g.attributes.uv.array);else for(let i=0;i<g.attributes.position.count;i++)uv.push(0,0);g.dispose();}
        const bg=new T.BufferGeometry();bg.setAttribute('position',new T.Float32BufferAttribute(pos,3));bg.setAttribute('normal',new T.Float32BufferAttribute(nor,3));bg.setAttribute('uv',new T.Float32BufferAttribute(uv,2));bg.computeBoundingSphere();
        const mesh=new T.Mesh(geo(bg),m);mesh.castShadow=shadow&&!m.alphaMap;mesh.receiveShadow=true;parent.add(mesh);}parts.clear();}};
}

// A triangle (gable) in the x–y plane, extruded `depth` toward +z, with uvs in metres/tile.
function gableGeo(T,base,rise,depth,tile){const sh=new T.Shape();sh.moveTo(-base/2,0);sh.lineTo(base/2,0);sh.lineTo(0,rise);sh.closePath();
  const g=new T.ExtrudeGeometry(sh,{depth,bevelEnabled:false});const uv=g.attributes.uv,pa=g.attributes.position;
  for(let i=0;i<uv.count;i++)uv.setXY(i,pa.getX(i)/tile,pa.getY(i)/tile);g.translate(0,0,-depth/2);return g;}

// s: the SHOPS entry; walls/roof: the shop's groups (walls drop to waist height inside, roof hides); up: floor level.
export function buildTudorShop({T,geo,mat,walls,roof,g:outside,s,up,WALL_H,WALL_T,DOOR_W,plaque}){
  TEX??=makeTextures(T);
  const V=s.tudor||{},ground=V.ground||'plaster';
  const P=mat(V.tint||'#ffffff',{map:TEX.plaster,roughness:.95}),O=mat('#ffffff',{map:TEX.oak,roughness:.85}),
    S=mat('#ffffff',{map:TEX.stone,bumpMap:TEX.stoneBump,bumpScale:2,roughness:.95}),
    Ti=V.roof==='slate'?mat('#ffffff',{map:TEX.slate,bumpMap:TEX.slateBump,bumpScale:2,roughness:.6}):mat(V.roofTint||'#ffffff',{map:TEX.tiles,bumpMap:TEX.tilesBump,bumpScale:2.5,roughness:.8}),
    Ash=mat('#ffffff',{map:TEX.ashlar,bumpMap:TEX.ashlarBump,bumpScale:2,roughness:.95}),
    Br=mat('#ffffff',{map:TEX.brick,bumpMap:TEX.brickBump,bumpScale:2,roughness:.9}),
    G=mat('#3e4a52'),L=mat('#2e2a26',{alphaMap:TEX.lattice,alphaTest:.5,side:T.DoubleSide,roughness:.4,metalness:.3}),
    Pot=mat('#a5583a',{roughness:.8});
  const hw=s.w/2,hd=s.d/2,t=WALL_T/2,H=WALL_H+up,side=hw-DOOR_W/2,fz=hd+t,bz=-hd-t,sx=hw+t;
  const A=kit(T,geo);   // ground floor (walls group)
  // Walls: plaster both sides (same five slabs + lintel as every shop, so collision is unchanged).
  const GW=ground==='brick'?Br:ground==='stone'?Ash:P,gt=ground==='brick'?1.1:ground==='stone'?1.8:2.2;
  const wall=(u,v,su,sv)=>A.box(GW,u,H/2,v,su,H,sv,{tile:gt});
  wall(0,-hd,s.w+WALL_T,WALL_T);wall(-hw,0,WALL_T,s.d);wall(hw,0,WALL_T,s.d);wall(-hw+side/2,hd,side+WALL_T,WALL_T);wall(hw-side/2,hd,side+WALL_T,WALL_T);
  A.box(GW,0,up+3.05+(WALL_H-3.05)/2,hd,DOOR_W,WALL_H-3.05,WALL_T,{tile:gt});
  // Stone plinth, a little proud of the walls, up to the sill beam.
  const ph=ground==='plaster'?up+.78:ground==='brick'?up+.45:0,pt=WALL_T+.14;if(ph>0){
  A.box(S,0,ph/2,-hd,s.w+pt,ph,pt,{tile:1.6});for(const sd of [-1,1]){A.box(S,sd*hw,ph/2,0,pt,ph,s.d+pt,{tile:1.6});A.box(S,sd*(hw-side/2+.07),ph/2,hd,side+pt-.14,ph,pt,{tile:1.6});}}
  // Oak on a face. face: 'f' front, 'b' back, 'l' / 'r' sides. a = along the face, y = height, la × ly the beam,
  // rot tilts it in the face's plane. Beams sit just proud of the plaster.
  const off=.06,bd=.13;
  const beam=(K,face,a,y,la,ly,rot=0,out=0)=>{if(face==='f')K.box(O,a,y,fz+off+out,la,ly,bd,{grain:'u',rz:rot});else if(face==='b')K.box(O,-a,y,bz-off-out,la,ly,bd,{grain:'u',rz:-rot});
    else{const sg=face==='r'?1:-1;K.box(O,sg*(sx+off+out),y,face==='r'?-a:a,bd,ly,la,{grain:'u',rx:rot*(face==='r'?1:-1)});}};
  const brace=(K,face,a0,y0,a1,y1,w=.16)=>beam(K,face,(a0+a1)/2,(y0+y1)/2,Math.hypot(a1-a0,y1-y0),w,Math.atan2(y1-y0,a1-a0));
  // Windows: oak surround + mullions + transom, glass through the wall, lead cames both sides, stone sill.
  const win=(K,face,a,y,w,h,{mull=2,depth=WALL_T,sill=true,out=0}={})=>{
    const n=face==='f'||face==='b',sg=face==='b'||face==='l'?-1:1,cz=face==='f'?fz-t+out:face==='b'?bz+t-out:0,cx=face==='r'?sx-t+out:face==='l'?-sx+t-out:0;
    const at=(da,dy)=>n?[face==='b'?-(a+da):a+da,y+dy,cz]:[cx,y+dy,face==='r'?-(a+da):a+da];
    const gl=(da,ww)=>{const [X,Y,Z]=at(da,0);n?K.box(G,X,Y,Z,ww,h,depth+.04):K.box(G,X,Y,Z,depth+.04,h,ww);n?K.box(L,X,Y,Z,ww,h,depth+.1,{tile:.7}):K.box(L,X,Y,Z,depth+.1,h,ww,{tile:.7});};
    gl(0,w);
    const fr=(K2,da,dy,la,ly)=>{if(face==='f'||face==='b')beam(K2,face,face==='b'?a+da:a+da,y+dy,la,ly,0,out);else beam(K2,face,a+da,y+dy,la,ly,0,out);};
    fr(K,0,h/2+.08,w+.36,.18);fr(K,0,-h/2-.06,w+.3,.14);for(const e of [-1,1])fr(K,e*(w/2+.08),0,.16,h+.3);
    for(let k=1;k<=mull;k++)fr(K,-w/2+k*w/(mull+1),0,.09,h);if(h>1.2)fr(K,0,h/2-h*.3,w,.08);
    if(sill){const [X,Y,Z]=at(0,-h/2-.2);n?K.box(S,X,Y,Z+sg*(.12+out),w+.5,.14,.36,{tile:1.6}):K.box(S,X+sg*(.12+out),Y,Z,.36,.14,w+.5,{tile:1.6});}};
  // ---- ground floor ----
  const sill=up+.88,plate=H-.16;
  const timberGround=ground==='plaster';
  for(const f of ['f','b','l','r']){const half=f==='f'||f==='b'?sx:hd+t;if(!timberGround){beam(A,f,0,plate+.04,2*half+.2,.26);continue;}
    beam(A,f,0,sill,2*half+.2,.2);beam(A,f,0,plate,2*half+.2,.32);for(const e of [-1,1])beam(A,f,e*(half-.06),(sill+plate)/2,.24,plate-sill);}
  // Front: two wide leaded shop windows either side of the door, studs between, braces at the corners.
  const fw=2.5,fh=1.55,fy=up+1.95,fx=DOOR_W/2+1.95;
  for(const e of [-1,1])win(A,'f',e*fx,fy,fw,fh,{mull:3});
  const studs=(K,f,from,to,y0,y1,step,skip)=>{const n=Math.max(1,Math.round((to-from)/step));for(let i=1;i<n;i++){const a=from+(to-from)*i/n;if(skip.some(([l,r])=>a>l&&a<r))continue;beam(K,f,a,(y0+y1)/2,.18,y1-y0);}};
  if(timberGround)studs(A,'f',-sx,sx,sill,plate,.62,[[-DOOR_W/2-.3,DOOR_W/2+.3],[-fx-fw/2-.25,-fx+fw/2+.25],[fx-fw/2-.25,fx+fw/2+.25]]);
  if(timberGround)for(const e of [-1,1]){beam(A,'f',e*(fx),fy+fh/2+.42,.16,plate-(fy+fh/2+.26));beam(A,'f',e*(fx),(sill+fy-fh/2)/2,.16,fy-fh/2-sill);}
  // Door: a heavy oak frame, a cambered head beam and two carved spandrel braces.
  for(const e of [-1,1]){A.box(O,e*(DOOR_W/2+.1),(up+3.2)/2,hd,.3,up+3.2,WALL_T+.2,{grain:'u'});brace(A,'f',e*(DOOR_W/2-.05),up+2.62,e*(DOOR_W/2-.55),up+3.08,.13);}
  A.box(O,0,up+3.2,hd,DOOR_W+.7,.3,WALL_T+.22,{grain:'u'});A.box(S,0,up+.06,hd+.35,DOOR_W+.6,.12,.7,{tile:1.6});
  // Sides and back: posts, a mid rail, one leaded window per side (where the old ones were), long corner braces.
  for(const f of ['l','r','b']){const half=f==='b'?sx:hd+t,wins=f==='b'?[-hw/2,hw/2]:(s.d>9.5?[-2,2]:[0]);
    for(const a of wins)win(A,f,a,up+2.2,f==='b'?1.3:1.6,1.2,{mull:f==='b'?1:2});
    if(!timberGround)continue;studs(A,f,-half,half,sill,plate,1.25,wins.map(a=>[a-1.1,a+1.1]));beam(A,f,0,up+1.45,2*half,.14);
    for(const e of [-1,1])brace(A,f,e*(half-.1),plate-.1,e*(half-1.3),up+1.5);}
  // Flower boxes under the front windows (oak, bright flowers).
  for(const e of [-1,1]){A.box(O,e*fx,up+.95,fz+.32,fw+.2,.32,.4,{grain:'u'});}
  A.flush(walls);
  for(const e of [-1,1])for(let k=0;k<7;k++){const m=new T.Mesh(geo(new T.IcosahedronGeometry(.17,0)),mat(['#e84a6f','#f6c945','#ffffff','#b26ad6','#ff8a3d','#f49ac1','#e84a6f'][k]));m.position.set(e*fx-fw/2+.3+k*(fw-.6)/6,up+1.2,fz+.32);walls.add(m);
    const lf=new T.Mesh(geo(new T.IcosahedronGeometry(.2,0)),mat('#4f7f42'));lf.position.set(m.position.x+.12,up+1.12,fz+.4);walls.add(lf);}

  // ---- upper storey (roof group: it lifts away when you walk in) ----
  const B=kit(T,geo),J=.62,uh=2.75,y0=H,y1=H+uh,ufz=fz+J,uz=(bz+ufz)/2,ud=ufz-bz;
  B.box(P,0,y0+uh/2,uz,2*sx,uh,ud,{tile:2.2});
  B.box(P,0,y0+.04,fz+J/2,2*sx,.08,J,{tile:2.2});                       // soffit under the jetty
  for(let a=-sx+.2;a<=sx-.1;a+=.46)B.box(O,a,y0-.02,fz+J/2,.14,.16,J+.02,{grain:'u'});   // joist ends
  B.box(O,0,y0+.2,ufz+.07,2*sx+.24,.36,.18,{grain:'u'});               // bressummer
  const uf=(a,y,la,ly,rot=0)=>B.box(O,a,y,ufz+.06,la,ly,bd,{grain:'u',rz:rot});
  uf(0,y1-.14,2*sx+.2,.28);uf(0,y0+1.35,2*sx,.14);for(const e of [-1,1])uf(e*(sx-.08),y0+uh/2,.24,uh);
  // Oriel window over the door: projects .55 m on carved brackets, leaded on three sides, its own little tile roof.
  const ow=3.1,oh=1.25,oy=y0+1.55,oz=ufz+.32;
  const oriel=V.oriel!==false;if(oriel){
  B.box(G,0,oy,oz,ow,oh,.62);B.box(L,0,oy,oz,ow+.02,oh,.66,{tile:.7});
  for(const e of [-1,1]){B.box(O,e*(ow/2+.04),oy,oz,.14,oh+.2,.7,{grain:'u'});B.box(O,e*ow/6,oy,oz+.31,.08,oh,.06,{grain:'u'});
    B.box(O,e*(ow/2-.3),oy-oh/2-.38,ufz+.25,.14,.6,.14,{grain:'u',rx:-.65});}
  B.box(O,0,oy-oh/2-.08,oz,ow+.3,.16,.78,{grain:'u'});B.box(O,0,oy+oh/2+.06,oz,ow+.3,.12,.78,{grain:'u'});
  B.box(Ti,0,oy+oh/2+.32,oz+.05,ow+.5,.1,1.0,{tile:2,grain:'z',rx:.42});}else{B.box(G,0,oy,ufz-.1,1.6,.95,.3);B.box(L,0,oy,ufz-.1,1.62,.95,.34,{tile:.7});uf(0,oy+.55,1.9,.14);uf(0,oy-.55,1.9,.12);for(const k of [-1,1])uf(k*.88,oy,.13,1.15);uf(0,oy,.08,.95);}
  // Studs + chevrons: close studs on the front, herringbone braces in the panels under the side windows.
  const uw=1.25,uwy=y0+1.6,ux=sx-1.35;
  for(let a=-sx+.5;a<sx-.3;a+=.5){if(Math.abs(a)<(oriel?ow/2+.25:1.15))continue;if(Math.abs(Math.abs(a)-ux)<uw/2+.2&&true){uf(a,y0+.3+(1.35-.3)/2,.15,1.05);continue;}uf(a,(y0+.3+y1-.28)/2,.15,y1-.28-y0-.3);}
  for(const e of [-1,1]){const a0=e*ux;B.box(G,a0,uwy,ufz-.1,uw,.85,.3);B.box(L,a0,uwy,ufz-.1,uw+.02,.85,.34,{tile:.7});
    uf(a0,uwy+.5,uw+.3,.14);uf(a0,uwy-.5,uw+.3,.12);for(const k of [-1,1])uf(a0+k*(uw/2+.07),uwy,.13,1.05);uf(a0,uwy,.08,.85);
    uf(a0,y1-.5,.14,.3);}
  // Upper sides and back: posts, rails, a small window each, corner braces.
  const side2=(f,half)=>{const n=f==='b'?bz-off:0;
    const bm=(a,y,la,ly,rot=0)=>{if(f==='b')B.box(O,-a,y,n-.0,la,ly,bd,{grain:'u',rz:-rot});else{const sg=f==='r'?1:-1;B.box(O,sg*(sx+off),y,uz+(f==='r'?-a:a),bd,ly,la,{grain:'u',rx:rot*(f==='r'?1:-1)});}};
    bm(0,y0+.14,2*half,.26);bm(0,y1-.14,2*half,.28);bm(0,y0+1.3,2*half,.14);
    for(let a=-half+.06;a<=half;a+=(2*half-.12)/Math.max(2,Math.round(2*half/1.2))){if(Math.abs(a)<.8)continue;bm(a,y0+uh/2,.18,uh);}
    for(const e of [-1,1]){const a0=e*(half-.1),a1=e*(half-1.2),dy=1.05;bm((a0+a1)/2,y0+.3+dy/2,Math.hypot(1.1,dy),.15,Math.atan2(dy,a1-a0)*(e>0?-1:1));}
    if(f==='b'){B.box(G,0,y0+1.7,bz+.05,1.1,.8,.3);B.box(L,0,y0+1.7,bz+.05,1.12,.8,.34,{tile:.7});}else{const sg=f==='r'?1:-1;B.box(G,sg*(sx-.05),y0+1.7,uz,.3,.8,1.1);B.box(L,sg*(sx-.05),y0+1.7,uz,.34,.8,1.12,{tile:.7});}
    bm(0,y0+2.14,1.4,.12);bm(0,y0+1.26,1.4,.12);for(const k of [-.7,.7])bm(k,y0+1.7,.12,.95);};
  side2('l',ud/2);side2('r',ud/2);side2('b',sx);
  // ---- roof: steep gable to the square, clay tiles, ridge, bargeboards, finial ----
  const hs=sx+.45,rise=4.4,th=Math.atan2(rise,hs),rl=ud+.9,rz=uz+.12;
  for(const e of [-1,1]){const w=Math.hypot(hs,rise)+.12;B.box(Ti,e*(hs/2-.02),y1+rise/2+.14,rz,w,.2,rl,{tile:2,grain:'z',rz:-e*th});}
  B.put(Ti,new T.CylinderGeometry(.2,.2,rl+.1,10,1),0,y1+rise+.2,rz,Math.PI/2,0,0);
  const gb=2*sx,gr=rise*(sx/hs);
  B.put(P,gableGeo(T,gb,gr,.2,2.2),0,y1,ufz-.1);B.put(P,gableGeo(T,gb,gr,.2,2.2),0,y1,bz+.1);
  for(const [z,bzz,sgn] of [[ufz+.17,ufz+.5,1],[bz-.17,bz-.3,-1]]){
    for(const e of [-1,1])B.box(O,e*hs/2,y1+rise/2+.02,bzz,Math.hypot(hs,rise)+.2,.42,.12,{grain:'u',rz:-e*th});   // bargeboards
    B.box(O,0,y1+gr/2,z,.2,gr,.14,{grain:'u'});B.box(O,0,y1+gr*.42,z,gb*.58,.16,.14,{grain:'u'});                  // king post, collar
    for(const e of [-1,1])B.box(O,e*gb*.17,y1+gr*.21,z,.14,gr*.42,.14,{grain:'u'});                                  // queen posts
    B.box(G,0,y1+gr*.62,z-sgn*.1,.95,.7,.24);B.box(L,0,y1+gr*.62,z-sgn*.1,.97,.7,.3,{tile:.7});
    for(const e of [-1,1]){B.box(O,0+e*.55,y1+gr*.62,z,.12,.9,.14,{grain:'u'});}B.box(O,0,y1+gr*.62+.42,z,1.25,.12,.14,{grain:'u'});B.box(O,0,y1+gr*.62-.42,z,1.25,.12,.14,{grain:'u'});}
  B.box(O,0,y1+rise+.55,ufz+.5,.16,1.1,.16,{grain:'u'});B.put(O,new T.SphereGeometry(.17,8,6),0,y1+rise+1.15,ufz+.5);
  // Chimney: brick stack through the right slope near the back, corbelled top, two clay pots.
  const cx=(V.chimney==='l'?-1:1)*(sx-1.1),cz=bz+1.9,ctop=y1+rise+.7,cb=y1-.4;
  B.box(Br,cx,(cb+ctop)/2,cz,1.0,ctop-cb,1.5,{tile:1.1});B.box(Br,cx,ctop-.2,cz,1.2,.14,1.7,{tile:1.1});B.box(Br,cx,ctop,cz,1.12,.26,1.62,{tile:1.1});
  for(const k of [-.35,.35])B.put(Pot,new T.CylinderGeometry(.15,.21,.62,10,1),cx,ctop+.42,cz+k);
  // Town hall: a louvred bell cupola on the ridge with a weather vane.
  if(V.cupola){const cy=y1+rise-.3,cz2=uz;B.box(P,0,cy+.7,cz2,1.3,1.4,1.3,{tile:2.2});for(const e of [-1,1]){B.box(O,e*.62,cy+.9,cz2,.14,1.8,1.42,{grain:'u'});B.box(O,0,cy+.9,cz2+e*.62,1.42,1.8,.14,{grain:'u'});}
    for(let k=0;k<4;k++){B.box(O,0,cy+1.25+k*.14,cz2+.66,1.0,.06,.1,{rx:-.5});B.box(O,0,cy+1.25+k*.14,cz2-.66,1.0,.06,.1,{rx:.5});}
    B.put(Ti,new T.ConeGeometry(1.25,1.4,4,1),0,cy+2.5,cz2,0,Math.PI/4,0);B.put(mat('#c9a24a',{metalness:.6,roughness:.35}),new T.CylinderGeometry(.03,.03,1.2,6),0,cy+3.6,cz2);
    B.put(mat('#2b2622',{metalness:.5,roughness:.5}),new T.BoxGeometry(.9,.06,.04),0,cy+3.9,cz2);B.put(mat('#2b2622',{metalness:.5,roughness:.5}),new T.ConeGeometry(.1,.25,4),.5,cy+3.9,cz2,0,0,-Math.PI/2);}
  B.flush(roof);
  // Outside extras (static: they stay put when you walk in).
  if(outside){const C=kit(T,geo);
    if(V.postbox){const PB=mat('#b3241e',{roughness:.45,metalness:.15}),dark=mat('#1d1a18',{roughness:.6});const x=-hw-.1,z=hd+1.2;
      C.box(S,x,up+.06,z,.8,.12,.8,{tile:1.6});C.put(PB,new T.CylinderGeometry(.3,.32,1.25,16),x,up+.75,z);C.put(PB,new T.CylinderGeometry(.36,.36,.12,16),x,up+1.42,z);C.put(PB,new T.SphereGeometry(.33,16,8,0,Math.PI*2,0,Math.PI/2),x,up+1.48,z);
      C.put(dark,new T.BoxGeometry(.34,.06,.05),x,up+1.15,z+.31);C.put(mat('#f4e7c4'),new T.BoxGeometry(.22,.16,.02),x,up+.9,z+.32);}
    if(V.awning){const cv=document.createElement('canvas');cv.width=64;cv.height=8;const cg=cv.getContext('2d');for(let i=0;i<8;i++){cg.fillStyle=i%2?'#f2ead6':V.awning;cg.fillRect(i*8,0,8,8);}
      const at=new T.CanvasTexture(cv);at.colorSpace=T.SRGBColorSpace;at.wrapS=at.wrapT=T.RepeatWrapping;const AW=mat('#ffffff',{map:at,roughness:.9,side:T.DoubleSide});
      for(const e of [-1,1]){const gm=new T.BoxGeometry(fw+.5,.05,1.15),uv=gm.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,uv.getX(i)*(fw+.5)/.9);C.put(AW,gm,e*fx,fy+fh/2+.55,fz+.55,.38,0,0);
        const vg=new T.BoxGeometry(fw+.5,.22,.03),vu=vg.attributes.uv;for(let i=0;i<vu.count;i++)vu.setX(i,vu.getX(i)*(fw+.5)/.9);C.put(AW,vg,e*fx,fy+fh/2+.25,fz+1.08);
        for(const k of [-1,1])C.put(mat('#2b2622',{metalness:.5,roughness:.5}),new T.CylinderGeometry(.02,.02,1.2,5),e*fx+k*(fw/2+.15),fy+fh/2+.55,fz+.55,1.2,0,0);}}
    if(V.crates){const fruit=['#c8372d','#e8a33a','#7fae3c','#d8c24a'];for(const [k,e] of [[0,-1],[1,1]]){const x=e*fx,z=fz+.75;
        for(const [dx,dy] of [[-.45,0],[.45,0],[0,.62]]){C.box(O,x+dx,up+.31+dy,z,.82,.58,.6,{grain:'u'});C.box(mat('#2a1d13'),x+dx,up+.58+dy,z,.7,.06,.5);
          for(let a=0;a<6;a++)C.put(mat(fruit[(a+k*2+(dy?1:0))%4],{roughness:.5}),new T.IcosahedronGeometry(.11,1),x+dx-.22+(a%3)*.22,up+.66+dy,z-.1+(a>2?.2:0));}}}
    C.flush(outside);}
  // Sign on the plaster between the door head and the wall plate (it rides on the roof group like every shop's).
  plaque(s.sign,0,up+3.62,fz+.16,{w:Math.min(DOOR_W+1.4,1.2+s.sign.length*.3),h:.52,wood:'#3a2a1d',ink:'#f5e3b8',parent:roof});
}

// ---- v147 detail layer: every plain colour in the world gets a real surface ----------------------------------
// mat(color) in world.js asks detailKind(color): brown woods get grain, greys/beiges get stone, greens get leaf
// clumps, light paints get brush streaks and wear, the rest a fine grain. The texture is grey (mean ~.5) and only
// multiplies the colour, so every palette stays as it was. It is projected from the object's own axes in metres
// (no uvs needed: works on the shared unit boxes, merged and instanced meshes), with wood grain along the longest
// side. One texture sample per pixel. Strength follows ✨ Pretty effects (uDetail).
let DET=null;
export function detailTextures(T){if(DET)return DET;
  const tex=c=>{const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;t.generateMipmaps=true;return t;};
  const base=(g,N,v)=>{g.fillStyle=`rgb(${v},${v},${v})`;g.fillRect(0,0,N,N);};
  const out={};
  {const N=256,[c,g]=canvas(N),r=rand(101);base(g,N,132);   // wood: grain along u, a few knots, plank seams
    for(let i=0;i<140;i++){const y0=r()*N,amp=.6+r()*3,k=1+(r()*2|0),ph=r()*6,v=r()<.55?60+r()*50:170+r()*60;g.strokeStyle=`rgba(${v},${v},${v},${.18+r()*.3})`;g.lineWidth=.5+r()*2;
      for(const oy of [-N,0,N]){g.beginPath();for(let x=0;x<=N;x+=4){const y=y0+oy+Math.sin(x/N*Math.PI*2*k+ph)*amp;x?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();}}
    for(let i=0;i<3;i++){const x=r()*N,y=r()*N;for(let k=5;k>0;k--){g.strokeStyle='rgba(40,40,40,.3)';g.lineWidth=1;wrap9(N,(ox,oy)=>{g.beginPath();g.ellipse(x+ox,y+oy,k*3,k*1.1,0,0,7);g.stroke();});}}
    g.fillStyle='rgba(30,30,30,.55)';g.fillRect(0,0,N,2);g.fillRect(0,N/2,N,1.5);
    out.wood=tex(c);}
  {const N=256,[c,g]=canvas(N),r=rand(103);base(g,N,128);   // stone: mottled, pitted, hairline cracks
    for(let i=0;i<700;i++){const x=r()*N,y=r()*N,rad=2+r()*16,v=r()<.5?80+r()*40:170+r()*50;g.fillStyle=`rgba(${v},${v},${v},${.06+r()*.09})`;wrap9(N,(ox,oy)=>{g.beginPath();g.ellipse(x+ox,y+oy,rad,rad*(.5+r()*.5),r()*3,0,7);g.fill();});}
    for(let i=0;i<14;i++){let x=r()*N,y=r()*N;g.strokeStyle='rgba(50,50,50,.35)';g.lineWidth=.8;g.beginPath();g.moveTo(x,y);for(let k=0;k<8;k++){x+=(r()-.5)*18;y+=(r()-.5)*18;g.lineTo(x,y);}g.stroke();}
    for(let i=0;i<4000;i++){const v=r()<.5?40:230;g.fillStyle=`rgba(${v},${v},${v},.12)`;g.fillRect(r()*N,r()*N,1,1);}
    out.stone=tex(c);}
  {const N=256,[c,g]=canvas(N),r=rand(107);base(g,N,120);   // leaf: overlapping little leaves, light tops, dark gaps
    for(let i=0;i<2600;i++){const x=r()*N,y=r()*N,l=3+r()*6,v=r()<.35?60+r()*40:150+r()*90;g.fillStyle=`rgba(${v},${v},${v},${.35+r()*.4})`;const a=r()*6;wrap9(N,(ox,oy)=>{g.beginPath();g.ellipse(x+ox,y+oy,l,l*.45,a,0,7);g.fill();});}
    out.leaf=tex(c);}
  {const N=256,[c,g]=canvas(N),r=rand(109);base(g,N,134);   // paint: brush streaks along u, chips and soft grime
    for(let i=0;i<220;i++){const y=r()*N,x=r()*N,l=30+r()*120,v=r()<.5?105:165;g.strokeStyle=`rgba(${v},${v},${v},${.08+r()*.1})`;g.lineWidth=1+r()*3;for(const ox of [-N,0])for(const oy of [-N,0,N]){g.beginPath();g.moveTo(x+ox,y+oy);g.lineTo(x+ox+l,y+oy+(r()-.5)*2);g.stroke();}}
    for(let i=0;i<40;i++){const x=r()*N,y=r()*N,rad=1+r()*3;g.fillStyle='rgba(70,70,70,.35)';g.beginPath();g.ellipse(x,y,rad,rad*.6,r()*3,0,7);g.fill();}
    for(let i=0;i<300;i++){const x=r()*N,y=r()*N,rad=4+r()*20;g.fillStyle='rgba(90,90,90,.04)';wrap9(N,(ox,oy)=>{g.beginPath();g.arc(x+ox,y+oy,rad,0,7);g.fill();});}
    out.paint=tex(c);}
  {const N=128,[c,g]=canvas(N),r=rand(113);base(g,N,128);   // fine grain for everything else
    for(let i=0;i<5000;i++){const v=r()<.5?70:200;g.fillStyle=`rgba(${v},${v},${v},.13)`;g.fillRect(r()*N,r()*N,1+r(),1+r());}
    for(let i=0;i<120;i++){const x=r()*N,y=r()*N,rad=3+r()*12,v=r()<.5?100:160;g.fillStyle=`rgba(${v},${v},${v},.08)`;wrap9(N,(ox,oy)=>{g.beginPath();g.arc(x+ox,y+oy,rad,0,7);g.fill();});}
    out.grain=tex(c);}
  {const N=256,[c,g]=canvas(N),r=rand(117);base(g,N,128);   // bark: deep furrows along v (up the trunk)
    for(let i=0;i<60;i++){const x0=r()*N,w=3+r()*10,v=r()<.5?190+r()*50:40+r()*30;g.strokeStyle=`rgba(${v},${v},${v},.6)`;g.lineWidth=w;
      for(const ox of [-N,0,N]){g.beginPath();for(let y=-8;y<=N+8;y+=8){const x=x0+ox+Math.sin(y/N*Math.PI*2*(1+i%3)+i)*5;y>-8?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();}}
    for(let i=0;i<2000;i++){g.fillStyle='rgba(30,30,30,.15)';g.fillRect(r()*N,r()*N,1,2);}
    out.bark=tex(c);}
  // metres per repeat, strength
  out.cfg={wood:[1.6,.55],stone:[2.4,.5],leaf:[1.2,.55],paint:[1.8,.3],grain:[1,.28]};
  return DET=out;}
const _hsl={h:0,s:0,l:0};
const NO_DETAIL=new Set(['#3e4a52','#f6e7b0','#ceded5','#ffe3a1','#ffe6ad']);   // window glass + lamp glows (lit at night)
export function detailKind(T,color){if(NO_DETAIL.has(String(color).toLowerCase()))return null;let c;try{c=new T.Color(color);}catch{return null;}c.getHSL(_hsl,T.SRGBColorSpace);const h=_hsl.h*360,s=_hsl.s,l=_hsl.l;
  if(l<.06||l>.97)return null;
  if(h>=12&&h<=48&&s>.18&&l>.1&&l<.58)return 'wood';
  if(h>=62&&h<=170&&s>.18&&l<.7)return 'leaf';
  if(s<.2&&l>.25&&l<.88)return 'stone';
  if(l>=.72)return 'paint';
  return 'grain';}
// Shader patch (called from world.js seeThrough's onBeforeCompile when the material has userData.det).
export function addDetail(sh,kind,tex,uAmt){const [scale,amt]=DET.cfg[kind];sh.uniforms.uDetTex={value:tex};sh.uniforms.uDetail=uAmt;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vDetP;varying vec3 vDetN;varying vec3 vDetS;').replace('#include <project_vertex>',`#include <project_vertex>
    #ifdef USE_INSTANCING
    mat4 dM=modelMatrix*instanceMatrix;
    #else
    mat4 dM=modelMatrix;
    #endif
    vDetS=vec3(length(dM[0].xyz),length(dM[1].xyz),length(dM[2].xyz));vDetP=transformed*vDetS;vDetN=objectNormal;`);
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vDetP;varying vec3 vDetN;varying vec3 vDetS;uniform sampler2D uDetTex;uniform float uDetail;').replace('#include <color_fragment>',`#include <color_fragment>
    if(uDetail>0.){vec3 an=abs(vDetN);vec2 dc;
      if(an.y>=an.x&&an.y>=an.z)dc=vDetS.x>=vDetS.z?vDetP.xz:vDetP.zx;else if(an.x>=an.z)dc=vDetS.z>=vDetS.y?vDetP.zy:vDetP.yz;else dc=vDetS.x>=vDetS.y?vDetP.xy:vDetP.yx;
      float dt=texture2D(uDetTex,dc*${(1/scale).toFixed(4)}).r;diffuseColor.rgb*=mix(1.,dt*1.95,${amt.toFixed(3)}*uDetail);}`);}

// ---- v147 village square props: real versions of the bench, lamp post, planter, fountain and paving ----------
function latheGeo(T,pts,tile,seg=28){const g=new T.LatheGeometry(pts.map(([r,y])=>new T.Vector2(r,y)),seg);const uv=g.attributes.uv,pa=g.attributes.position;
  let maxR=0;for(const [r] of pts)maxR=Math.max(maxR,r);let len=0;for(let i=1;i<pts.length;i++)len+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);
  for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*Math.PI*2*maxR/tile,uv.getY(i)*len/tile);return g;}
export function squareProps(T,geo,mat){TEX??=makeTextures(T);
  if(!TEX.flags){const N=256,[c,g]=canvas(N),[cb,gb]=canvas(N),r=rand(71);g.fillStyle='#8f8676';g.fillRect(0,0,N,N);gb.fillStyle='#000';gb.fillRect(0,0,N,N);
    const rows=[];let y=0;while(y<N){let h=40+r()*36|0;if(N-y-h<36)h=N-y;rows.push([y,h]);y+=h;}
    for(const [y0,h] of rows){let x=r()*N,end=x+N;while(x<end){let w=44+r()*60|0;if(end-x-w<40)w=end-x;const v=176+r()*34;
      for(const ox of [-N,0]){g.fillStyle=rgb(v+4,v,v-10);g.fillRect(x+ox+2,y0+2,w-4,h-4);gb.fillStyle='#fff';gb.fillRect(x+ox+3,y0+3,w-6,h-6);
        for(let q=0;q<w*h/14;q++){g.fillStyle=r()<.5?rgb(110,100,86,.14):rgb(245,240,228,.12);g.fillRect(x+ox+2+r()*(w-4),y0+2+r()*(h-4),1+r()*2,1);}
        if(r()<.3){g.fillStyle=rgb(120,140,80,.22);g.fillRect(x+ox+1,y0+h-5,w-2,3);}}x+=w;}}
    const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;TEX.flags=t;const tb=new T.CanvasTexture(cb);tb.wrapS=tb.wrapT=T.RepeatWrapping;TEX.flagsBump=tb;}
  const O=mat('#ffffff',{map:TEX.oak,roughness:.8}),IRON=mat('#26282a',{roughness:.45,metalness:.55}),GOLD=mat('#c9a24a',{metalness:.6,roughness:.35}),
    STN=mat('#ffffff',{map:TEX.ashlar,bumpMap:TEX.ashlarBump,bumpScale:1.5,roughness:.9}),STN2=mat('#e9e2d4',{map:TEX.stone,roughness:.9}),
    GLASS=mat('#f6e7b0'),SOIL=mat('#3b2a1e');
  const bench=parent=>{const K=kit(T,geo);
    for(const dx of [-.92,.92]){K.box(IRON,dx,.22,.18,.06,.44,.07,{rx:.1});K.box(IRON,dx,.22,-.2,.06,.44,.07,{rx:-.12});K.box(IRON,dx,.46,0,.07,.06,.62);
      K.box(IRON,dx,.75,-.27,.06,.62,.06,{rx:-.2});K.put(IRON,new T.TorusGeometry(.12,.025,6,12,Math.PI*1.3),dx,.62,.24,0,Math.PI/2,0);K.put(IRON,new T.TorusGeometry(.09,.022,6,12,Math.PI*1.4),dx,.95,-.36,0,Math.PI/2,2);}
    for(let k=0;k<5;k++)K.box(O,0,.5,-.2+k*.105,2.2,.04,.085,{grain:'u'});
    for(let k=0;k<3;k++)K.box(O,0,.66+k*.13,-.29-k*.026,2.2,.09,.035,{grain:'u',rx:-.2});
    K.flush(parent);};
  const lamp=parent=>{const K=kit(T,geo);
    K.put(STN,new T.CylinderGeometry(.32,.38,.3,8),0,.15,0);K.put(IRON,new T.CylinderGeometry(.16,.2,.55,8),0,.55,0);K.put(IRON,new T.CylinderGeometry(.07,.09,2.2,8),0,1.9,0);
    K.put(IRON,new T.TorusGeometry(.1,.025,6,10),0,.88,0,Math.PI/2,0,0);K.box(IRON,0,2.75,0,.7,.05,.05);for(const e of [-1,1])K.put(IRON,new T.SphereGeometry(.05,6,4),e*.35,2.75,0);
    K.put(IRON,new T.CylinderGeometry(.12,.08,.12,8),0,3.05,0);
    K.put(GLASS,new T.CylinderGeometry(.24,.17,.46,4,1),0,3.34,0,0,Math.PI/4,0);
    for(let k=0;k<4;k++){const a=k*Math.PI/2+Math.PI/4;K.box(IRON,Math.sin(a)*.2,3.34,Math.cos(a)*.2,.03,.48,.03,{ry:a});}
    K.put(IRON,new T.ConeGeometry(.33,.3,4),0,3.72,0,0,Math.PI/4,0);K.put(IRON,new T.SphereGeometry(.05,6,4),0,3.92,0);K.put(IRON,new T.CylinderGeometry(.22,.24,.05,4),0,3.57,0,0,Math.PI/4,0);
    K.flush(parent);};
  const tub=parent=>{const K=kit(T,geo);const st=new T.CylinderGeometry(.58,.5,.62,18,1,true),uv=st.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getY(i)*.62/1.6,uv.getX(i)*3.4/.35);
    K.put(O,st,0,.31,0);K.put(O,new T.CircleGeometry(.5,18).rotateX(Math.PI/2),0,.01,0);
    for(const y of [.1,.52])K.put(IRON,new T.TorusGeometry(y>.3?.575:.52,.02,4,24),0,y,0,Math.PI/2,0,0);
    K.put(SOIL,new T.CircleGeometry(.55,18).rotateX(-Math.PI/2),0,.56,0);K.flush(parent);};
  const fountain=parent=>{const K=kit(T,geo);
    K.put(STN,latheGeo(T,[[3.8,-.25],[3.8,.06],[3.66,.14],[3.66,.52],[3.82,.6],[3.82,.76],[3.62,.82],[3.32,.82],[3.26,.7],[3.26,.42],[0.01,.42]],1.4,40).scale(.92,1,.92),0,0,0);
    K.put(STN2,latheGeo(T,[[0.01,.42],[.82,.42],[.82,.6],[.58,.7],[.47,.98],[.4,1.9],[.52,2.08],[.36,2.3],[.42,2.45],[1.15,2.74],[1.56,2.94],[1.56,3.08],[1.38,3.08],[1.3,2.98],[0.01,2.98]],1.2,28),0,0,0);
    K.put(STN2,latheGeo(T,[[0.01,2.98],[.26,2.98],[.2,3.38],[.29,3.55],[.66,3.84],[.67,3.95],[.5,3.95],[0.01,3.9]],1.2,20),0,0,0);
    for(let k=0;k<8;k++){const a=k/8*Math.PI*2;K.put(STN,new T.BoxGeometry(.18,.16,.5),Math.sin(a)*3.42,.68,Math.cos(a)*3.42,0,a,0);}
    K.flush(parent);};
  const PAVE=mat('#ffffff',{map:TEX.flags,bumpMap:TEX.flagsBump,bumpScale:1.2,roughness:.9}),KERB=mat('#ffffff',{map:TEX.ashlar,roughness:.9});
  return {bench,lamp,tub,fountain,pave:PAVE,kerb:KERB};}

// ---- v147: real surfaces for baked (merged) builders, e.g. Thimbleford's houses and clock tower -------------
// kind: oak | plaster | ashlar | stone | slate | tiles | brick; tint multiplies the texture (keeps each house's colour).
export function realMat(T,mat,kind,tint='#ffffff'){TEX??=makeTextures(T);
  const k={oak:{map:TEX.oak,roughness:.85},plaster:{map:TEX.plaster,roughness:.95},ashlar:{map:TEX.ashlar,bumpMap:TEX.ashlarBump,bumpScale:1.5,roughness:.92},
    stone:{map:TEX.stone,bumpMap:TEX.stoneBump,bumpScale:2,roughness:.95},slate:{map:TEX.slate,bumpMap:TEX.slateBump,bumpScale:2,roughness:.6},
    tiles:{map:TEX.tiles,bumpMap:TEX.tilesBump,bumpScale:2.5,roughness:.8},brick:{map:TEX.brick,bumpMap:TEX.brickBump,bumpScale:2,roughness:.9}}[kind];
  return mat(tint,k);}
export const REAL_TILE={oak:1,plaster:2.2,ashlar:1.8,stone:1.6,slate:2,tiles:2,brick:1.1};
// uv for one vertex of a part, from its local position (already scaled to metres) and local normal.
// Roof kinds lay their rows along local z (the ridge); everything else keeps u along the part's longest side.
export function realUV(kind,lx,ly,lz,nx,ny,nz,sx,sy,sz){const t=REAL_TILE[kind],ax=Math.abs(nx),ay=Math.abs(ny),az=Math.abs(nz);
  if(kind==='slate'||kind==='tiles'){if(az>.9)return [lx/t,ly/t];return [lz/t,(ly*1.25+Math.abs(lx)*.6)/t];}
  let u,v;if(ay>=ax&&ay>=az){[u,v]=sx>=sz?[lx,lz]:[lz,lx];}else if(ax>=az){[u,v]=sz>=sy?[lz,ly]:[ly,lz];}else{[u,v]=sx>=sy?[lx,ly]:[ly,lx];}
  if(kind!=='oak'){if(ay>=ax&&ay>=az)[u,v]=[lx,lz];else if(ax>=az)[u,v]=[lz,ly];else [u,v]=[lx,ly];}
  return [u/t,v/t];}

// ---- v147: forest logs (jump logs, windfalls) with bark, cut ends, moss and roots, merged per material --------
export function forestLogs(T,geo,mat){TEX??=makeTextures(T);
  const BARK=mat('#ffffff',{map:TEX.bark,bumpMap:TEX.barkBump,bumpScale:3,roughness:1}),END=mat('#ffffff',{map:TEX.rings,roughness:.9}),
    ROOT=mat('#ffffff',{map:TEX.bark,roughness:1}),MOSS=mat('#5d7f3a',{roughness:1}),SOIL=mat('#4a3626',{roughness:1});
  const K=kit(T,geo);
  const place=(g,x,y,z,yaw)=>g.rotateY(yaw).translate(x,y,z);
  return {log(x,y,z,yaw,len,r,seed=1){const rr=rand(seed);
      const cyl=new T.CylinderGeometry(r*.88,r,len,14,4,true),uv=cyl.attributes.uv,pa=cyl.attributes.position;
      for(let i=0;i<pa.count;i++)pa.setX(i,pa.getX(i)*(1+(rr()-.5)*.08));
      for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*Math.PI*2*r/1.2,uv.getY(i)*len/1.2);cyl.computeVertexNormals();
      K.put(BARK,place(cyl.rotateX(Math.PI/2),x,y,z,yaw),0,0,0);
      // the sawn / broken end (towards -z) shows its rings; the other end keeps its root plate
      K.put(END,place(new T.CircleGeometry(r*.88,14).rotateY(Math.PI).translate(0,0,-len/2-.005),x,y,z,yaw),0,0,0);
      const plate=new T.DodecahedronGeometry(r*2.2,1);plate.scale(1,1,.32);plate.translate(0,r*.35,len/2+r*.2);K.put(SOIL,place(plate,x,y,z,yaw),0,0,0);
      for(let k=0;k<7;k++){const a=k/7*Math.PI*2+rr()*.4,rl=r*(1.4+rr()*1.4),rt=new T.CylinderGeometry(.03,.09,rl,5).translate(0,rl/2,0).rotateX(Math.PI/2-.5+rr()*.3).rotateZ(a).translate(Math.cos(a)*r*.6,r*.3+Math.sin(a)*r*.6,len/2+r*.1);K.put(ROOT,place(rt,x,y,z,yaw),0,0,0);}
      for(let k=0;k<3;k++){const z0=-len/2+.8+k*len/3.2,b=new T.CylinderGeometry(.05,.1,.5+rr()*.6,6).translate(0,.3,0).rotateZ((k%2?-1:1)*(.6+rr()*.4)).translate(0,r*.7,z0);K.put(BARK,place(b,x,y,z,yaw),0,0,0);}
      for(let k=0;k<4;k++){const m=new T.SphereGeometry(r*(.35+rr()*.3),8,4,0,Math.PI*2,0,Math.PI/2);m.scale(1.2,.35,1.8);m.translate((rr()-.5)*r*.6,r*.85,-len/2+rr()*len);K.put(MOSS,place(m,x,y,z,yaw),0,0,0);}},
    twig(x,y,z,yaw,len,rx,rz){const b=new T.CylinderGeometry(.035,.07,len,5);const uv=b.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*.4,uv.getY(i)*len/1.2);b.rotateX(rx).rotateZ(rz);K.put(BARK,place(b,x,y,z,yaw),0,0,0);},
    flush(parent){K.flush(parent);}};}
