// Painted valley map: a full-screen overlay over the 3D world. The land is painted once from the same height field,
// paths and obstacles the world uses; pins, labels and "you are here" are redrawn on top while you pan and pinch.
// Tapping a pin opens a card with two ways to get there: ride (earns trust) or jump (5 free a day, then one every 20 min; never costs trust).
import {LOCATIONS,MAP_PATHS,PASTURE,FARMS,RIVERS,BRIDGES,FIELDS,MILLS,TOWN2,terrainHeight,fogBits,fogHas,FOG_N,FOG_CELL} from './world-content.mjs?v=157';
import {cloudstepAt,onCloudstep,STREAM} from './world-cloudstep.mjs?v=157';
import {PX_NAMES,pxSrc,iconHTML} from './pixel-icons.js?v=157';
import {REGIONS,R as regionPt,offsetOf,HALF,regionAt} from './world-regions.mjs?v=157';

const EXTENT=HALF,PX=2,SIZE=EXTENT*2*PX; // world x,z in [-300,300] (nine regions); 2 px per metre on the painted sheet
// Design spots of painted features → world (world-regions.mjs blocks).
const OF=id=>offsetOf(id),CO=OF('coast'),FL=OF('flowers'),OR=OF('orchard'),RC=OF('race'),FO=OF('forest');
const KIND={secret:'#4b4f63',barn:'#c8553d',gate:'#e2a93b',pond:'#3f8fc4',lookout:'#d9734e',orchard:'#c94a4a',trail:'#9a7b4f',mill:'#b98a3e',farm:'#b8402f',village:'#d4709a',market:'#e07b39',
  race:'#3c8c4f',jump:'#7a5cc4',picnic:'#e3a23f',beach:'#2ea3a8',lighthouse:'#d2586a',flowers:'#8f62c9',forest:'#2f7d4a',falls:'#3b86c9',mountain:'#7c7f99',summit:'#5c5f7c',ruins:'#8d8a7a'};
// Pixel icons for each place (assets/icons, 2026-11-10); ICON stays as the emoji fallback.
const PLACE_PX={stable:'place-stables',gate:'place-gate',pond:'place-pond',ridge:'place-ridge',orchard:'place-orchard',home:'place-trail',mill:'place-windmill',village:'place-village',market:'place-market',race:'place-race',jump:'place-school',picnic:'place-picnic',beach:'place-shore',lighthouse:'place-lighthouse',flowers:'place-lavender',forest:'place-grove',falls:'place-falls',mountain:'place-trailhead',summit:'place-summit',ruins:'place-arch'};
// Canvas pins draw the pixel icon once its image has loaded (the map redraws every frame), the emoji until then.
const PIMG=new Map();
function pinIcon(ctx,name,emoji,x,y,size){let im=PIMG.get(name);if(name&&!im&&PX_NAMES.has(name)){im=new Image();im.src=pxSrc(name);PIMG.set(name,im);}
  if(im&&im.complete&&im.naturalWidth){ctx.imageSmoothingEnabled=false;ctx.drawImage(im,x-size/2,y-size/2,size,size);ctx.imageSmoothingEnabled=true;}else ctx.fillText(emoji||'📍',x,y);}
const ICON={farm:'🐷',stable:'🐴',gate:'✨',pond:'🪷',ridge:'🌅',orchard:'🍎',home:'🥾',mill:'🌾',village:'🏘️',market:'🥕',race:'🏁',jump:'🏇',picnic:'🧺',beach:'🐚',lighthouse:'🗼',flowers:'💐',forest:'🌲',falls:'💧',mountain:'⛰️',summit:'🚩',ruins:'🏛️'};
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
// The valley is drawn as an island: a rounded-square coast with a gently wobbling edge (1 = the shoreline).
const coast=(x,z)=>{const u=x/(HALF-8),v=z/(HALF-8),a=Math.atan2(v,u);return Math.pow(u**4+v**4,.25)+.03*Math.sin(5*a)+.02*Math.sin(9*a+1)+.015*Math.sin(13*a+2);};
const sx=x=>(x+EXTENT)*PX,sz=z=>(z+EXTENT)*PX;

function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

// Paint the land once: grass shaded by slope, mountain rock and snow, sand and sea, ponds, paths, groves, buildings.
function paintSheet(obstacles){
  const c=document.createElement('canvas');c.width=c.height=SIZE;const g=c.getContext('2d'),img=g.createImageData(SIZE,SIZE),d=img.data;
  const H=(x,z)=>terrainHeight(x,z),grassLo=[150,201,110],grassHi=[118,176,92],rock=[164,160,178],snow=[248,248,252],sand=[236,221,170];
  for(let py=0;py<SIZE;py++)for(let px=0;px<SIZE;px++){
    const x=px/PX-EXTENT,z=py/PX-EXTENT,h=H(x,z),hx=H(x+.5,z)-h,hz=H(x,z+.5)-h,light=Math.max(-.35,Math.min(.35,(-hx-hz)*1.6));
    const mountain=Math.max(0,Math.min(1,(h-1.2)/6)),cs=cloudstepAt(x,z);
    let col=mix(grassLo,grassHi,Math.max(0,Math.min(1,(h+.6)/1.2)));
    col=mix(col,rock,mountain);if(h>74)col=mix(col,snow,Math.min(1,(h-74)/8));
    // Cloudstep's spiral trail shows as a cream ledge, its summit meadow green.
    if(cs?.region==='ledge')col=h>80?[240,236,226]:[232,214,170];else if(cs?.region==='summit')col=grassHi;else if(cs?.region==='pool')col=[88,169,207];
    const shore=Math.hypot((x+65-CO.x)/29,(z-82-CO.z)/22);if(shore<1)col=mix(col,sand,Math.min(1,(1-shore)*4));
    const cl=regionPt(-61,-65);let f=1+light*(Math.hypot(x-cl.x,z-cl.z)<31?.25:1);if(h>2&&(h%8)<.5&&cs?.region!=='ledge')f*=.88;
    const k=(py*SIZE+px)*4;d[k]=Math.min(255,col[0]*f);d[k+1]=Math.min(255,col[1]*f);d[k+2]=Math.min(255,col[2]*f);d[k+3]=255;
  }
  g.putImageData(img,0,0);
  const R=rng(7);
  // Soft field patches so the meadows read as farmland, not flat green.
  for(let i=0;i<520;i++){const x=-(HALF-5)+R()*(HALF-5)*2,z=-(HALF-5)+R()*(HALF-5)*2;if(H(x,z)>1.2||coast(x,z)>.9||Math.hypot((x+65-CO.x)/29,(z-82-CO.z)/22)<1.1)continue;
    g.save();g.translate(sx(x),sz(z));g.rotate(R()*Math.PI);g.fillStyle=['#a9d47f','#c3dc86','#9ccf8a','#d7d98e'][i%4];g.globalAlpha=.35;
    g.beginPath();g.roundRect((-30-R()*40)/2,(-20-R()*30)/2,(60+R()*80)/2,(40+R()*50)/2,9);g.fill();g.restore();}
  // Sea: deep water with a lighter shallow band and little wave strokes.
  const water=(x,z,rx,rz,deep,shallow)=>{g.save();g.translate(sx(x),sz(z));g.scale(rx*PX,rz*PX);
    g.fillStyle=shallow;g.beginPath();g.arc(0,0,1.08,0,Math.PI*2);g.fill();g.fillStyle=deep;g.beginPath();g.arc(0,0,1,0,Math.PI*2);g.fill();g.restore();};
  g.fillStyle='#5fb2c6';g.beginPath();g.ellipse(sx(-66+CO.x),sz(102+CO.z),38*PX,25*PX,0,0,Math.PI*2);g.fill();
  g.fillStyle='#4aa0bb';g.beginPath();g.ellipse(sx(-66+CO.x),sz(97+CO.z),40*PX,14*PX,0,0,Math.PI*2);g.fill();
  for(const o of obstacles)if(o.kind==='lake'&&o.rx<25)water(o.x,o.z,o.rx,o.rz,'#58a9cf','#a6dbe6');
  g.strokeStyle='#ffffffaa';g.lineWidth=3;g.lineCap='round';
  for(let i=0;i<26;i++){const x=sx(-95+CO.x+R()*60),y=sz(85+CO.z+R()*22);g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+8,y-6,x+16,y);g.stroke();}
  // Lavender rows and the orchard grid.
  g.fillStyle='#a888cf';for(let r=0;r<5;r++)g.fillRect(sx(-3+FL.x),sz(59.4+FL.z+r*1.8),14.5*PX,1.1*PX);
  for(let i=0;i<5;i++)for(let j=0;j<4;j++){const x=-6+OR.x+i*4.5,z=-32+OR.z+j*4;g.fillStyle='#4f9a4f';g.beginPath();g.arc(sx(x),sz(z),3,0,7);g.fill();g.fillStyle='#d94b4b';g.beginPath();g.arc(sx(x)+1,sz(z)-.5,1,0,7);g.fill();}
  // Racecourse infield.
  g.fillStyle='#b9e08f';g.fillRect(sx(47+RC.x),sz(27+RC.z),19*PX,21*PX);
  // Paths: a darker edge under a cream ribbon.
  const stroke=(pts,w)=>{const s=smooth(pts);for(const [col,extra] of [['#b89a68',2.4],['#f3e6c4',0]]){g.strokeStyle=col;g.lineWidth=w*PX+extra;g.lineJoin=g.lineCap='round';g.beginPath();s.forEach(([x,z],i)=>i?g.lineTo(sx(x),sz(z)):g.moveTo(sx(x),sz(z)));g.stroke();}};
  // The Cloudstep stream: from the spring, over the falls, down to its pond.
  for(const part of [STREAM.upper,STREAM.lower]){g.strokeStyle='#58a9cf';g.lineWidth=1.6*PX;g.lineCap='round';g.beginPath();part.forEach((q,i)=>i?g.lineTo(sx(q.x),sz(q.z)):g.moveTo(sx(q.x),sz(q.z)));g.stroke();}
  // v103: fields (wheat in gold furrows, flowers in coloured stripes), the two rivers and their ponds.
  for(const f of FIELDS){g.save();g.translate(sx(f.x),sz(f.z));g.rotate(-f.rot);const W2=f.w*PX,D2=f.d*PX;g.fillStyle=f.kind==='wheat'?'#e2bd52':f.kind==='sunflower'?'#4f8a3a':'#5f8f4a';g.fillRect(-W2/2,-D2/2,W2,D2);
    const cols=['#e84a6f','#f6c945','#ffffff','#b26ad6','#ff8a3d','#f49ac1'];for(let k=0,y=-D2/2;y<D2/2;y+=1.25*PX,k++){g.fillStyle=f.kind==='wheat'?(k%2?'#d4a940':'#eccb63'):f.kind==='sunflower'?(k%2?'#f2c230':'#4f8a3a'):cols[k%cols.length];g.fillRect(-W2/2,y,W2,.6*PX);}
    g.strokeStyle='#8a6a3a';g.lineWidth=1.5;g.strokeRect(-W2/2,-D2/2,W2,D2);g.restore();}
  for(const r of RIVERS){for(const [col,extra] of [['#3f87ad',2],['#58a9cf',0]]){g.strokeStyle=col;g.lineWidth=r.w*PX+extra;g.lineJoin=g.lineCap='round';g.beginPath();r.line.forEach(([x,z],i)=>i?g.lineTo(sx(x),sz(z)):g.moveTo(sx(x),sz(z)));g.stroke();}
    g.fillStyle='#58a9cf';g.beginPath();g.arc(sx(r.pond.x),sz(r.pond.z),r.pond.r*PX,0,7);g.fill();}
  g.fillStyle='#a9d48a';g.strokeStyle='#8a6a3a';g.lineWidth=2;g.beginPath();g.arc(sx(PASTURE.x),sz(PASTURE.z),(PASTURE.r+2.5)*PX,0,7);g.fill();g.stroke();for(let k=0;k<9;k++){g.fillStyle='#fffdf4';g.beginPath();g.arc(sx(PASTURE.x+Math.cos(k*2.4)*PASTURE.r*.55),sz(PASTURE.z+Math.sin(k*2.4)*PASTURE.r*.55),1.6*PX,0,7);g.fill();}
  // v106: the farms (pens in green with rails, the barn red, the farmhouse white, the pond blue)
  for(const F of FARMS){const rect=(c,fill,line='#8a6a3a')=>{const w=c.w||c.r*2,d=c.d||c.r*2;g.fillStyle=fill;g.fillRect(sx(c.x-w/2),sz(c.z-d/2),w*PX,d*PX);g.strokeStyle=line;g.lineWidth=1.5;g.strokeRect(sx(c.x-w/2),sz(c.z-d/2),w*PX,d*PX);};
    for(const k of ['cows','goats','donkeys'])if(F[k])rect(F[k],'#a9d48a');if(F.pigs)rect(F.pigs,'#9a7a58');if(F.veg)rect(F.veg,'#7a5a3a');
    if(F.pond){g.fillStyle='#58a9cf';g.beginPath();g.arc(sx(F.pond.x),sz(F.pond.z),F.pond.r*PX,0,7);g.fill();}
    if(F.barn)rect({x:F.barn.x,z:F.barn.z,w:12,d:9.4},'#b8402f','#6e3a30');rect({x:F.house.x,z:F.house.z,w:6,d:8},'#f4efe4','#6e3a30');}
  // Thimbleford's cobbled square
  g.fillStyle='#b8b0a2';g.fillRect(sx(TOWN2.x-18),sz(TOWN2.z-15),36*PX,30*PX);
  stroke(MAP_PATHS.track,4);MAP_PATHS.routes.forEach(r=>stroke(r,3));stroke(MAP_PATHS.loop,3.3);stroke(MAP_PATHS.yard,2.4);
  for(const b of BRIDGES){g.save();g.translate(sx(b.x),sz(b.z));g.rotate(-b.ang);g.fillStyle=b.river==='willow'?'#a99a7e':'#8a6440';g.fillRect(-b.w*PX/2-1,-b.len*PX/2,b.w*PX+2,b.len*PX);g.fillStyle=b.river==='willow'?'#cdbfa3':'#b98a5a';g.fillRect(-b.w*PX/2+1,-b.len*PX/2+1,b.w*PX-2,b.len*PX-2);g.restore();}
  {const T2=TOWN2,hs=[...[-113,-104,-95,-86,-77,-68].map(x=>[x,T2.z-24,7.8,7]),...[-112,-103,-77,-68].map(x=>[x,T2.z+26,7.8,7]),...[T2.z-14,T2.z+14].flatMap(z=>[[T2.x-28,z,7,7.4],[T2.x+28,z,7,7.4]])];
    for(const [x,z,w,d] of hs){g.fillStyle='#5a3e2c';g.fillRect(sx(x-w/2)-1,sz(z-d/2)-1,w*PX+2,d*PX+2);g.fillStyle='#8a5a3c';g.fillRect(sx(x-w/2),sz(z-d/2),w*PX,d*PX);g.fillStyle='#6b4a34';g.fillRect(sx(x-w/2),sz(z)-.5,w*PX,1);}
    g.fillStyle='#59606a';g.fillRect(sx(T2.clock.x-2.5),sz(T2.clock.z-2.5),5*PX,5*PX);g.fillStyle='#fbf6e8';g.beginPath();g.arc(sx(T2.clock.x),sz(T2.clock.z),1.6*PX,0,7);g.fill();}
  for(const m of MILLS){const X=sx(m.x),Y=sz(m.z);g.fillStyle=m.kind==='wind'?'#efe6d2':'#cdbfa3';g.strokeStyle='#5a3e2c';g.lineWidth=1.5;g.beginPath();g.arc(X,Y,(m.kind==='wind'?2.6:3.4)*PX,0,7);g.fill();g.stroke();if(m.kind==='wind'){g.strokeStyle='#6b4f3a';g.lineWidth=2;g.beginPath();for(const a of [.6,2.17,3.74,5.31]){g.moveTo(X,Y);g.lineTo(X+Math.cos(a)*6*PX,Y+Math.sin(a)*6*PX);}g.stroke();}}
  // Groves and scattered trees, kept off paths, water and the mountain.
  const nearPath=(x,z)=>[MAP_PATHS.loop,MAP_PATHS.track,...MAP_PATHS.routes].some(r=>r.some(([a,b],i)=>{const n=r[i+1];if(!n)return false;const dx=n[0]-a,dz=n[1]-b,t=Math.max(0,Math.min(1,((x-a)*dx+(z-b)*dz)/(dx*dx+dz*dz)));return Math.hypot(a+dx*t-x,b+dz*t-z)<5;}));
  const treeAt=(x,z,s=1,gold=false)=>{const X=sx(x),Y=sz(z),r=(5+R()*3)*s*PX/4;g.fillStyle='#00000022';g.beginPath();g.ellipse(X+2,Y+3,r,r*.7,0,0,7);g.fill();
    g.fillStyle=gold?'#d8b13f':R()<.5?'#3f8f4c':'#4d9c56';g.beginPath();g.arc(X,Y,r,0,7);g.fill();g.fillStyle='#ffffff30';g.beginPath();g.arc(X-r*.3,Y-r*.3,r*.45,0,7);g.fill();};
  for(let i=0;i<14;i++){const a=i*.45;treeAt(60+FO.x+Math.sin(a)*(5+i%3*3),-35+FO.z+Math.cos(a)*(5+i%3*3),1.2,i%3===0);}
  for(let i=0;i<2000;i++){const x=-(HALF-4)+R()*(HALF-4)*2,z=-(HALF-4)+R()*(HALF-4)*2;if(H(x,z)>1||coast(x,z)>.93||nearPath(x,z)||Math.hypot((x+65-CO.x)/31,(z-82-CO.z)/24)<1.1||Math.hypot(x+13,z-2)<24)continue;
    if(obstacles.some(o=>o.kind==='lake'?Math.hypot((x-o.x)/(o.rx+3),(z-o.z)/(o.rz+3))<1:Math.abs(x-o.x)<o.hx+3&&Math.abs(z-o.z)<o.hz+3))continue;
    if(x>-4+FL.x&&x<13+FL.x&&z>57+FL.z&&z<70+FL.z)continue;if(x>44+RC.x&&x<69+RC.x&&z>24+RC.z&&z<51+RC.z)continue;treeAt(x,z,.8+R()*.4);}
  // Buildings and fences from the world's own collision boxes.
  for(const o of obstacles){if(o.kind!=='box')continue;const w=o.hx*2*PX,h=o.hz*2*PX,X=sx(o.x)-w/2,Y=sz(o.z)-h/2;
    if(o.hx<.6||o.hz<.6){g.fillStyle='#fff6e0';g.fillRect(X,Y,Math.max(w,2),Math.max(h,2));continue;}
    g.fillStyle='#00000026';g.fillRect(X+3,Y+4,w,h);g.fillStyle=o.height>6?'#c8553d':'#e7b9a0';g.fillRect(X,Y,w,h);g.fillStyle='#ffffff44';g.fillRect(X,Y,w,h*.45);}
  // The sea all round, with a sandy beach, painted over the edges last.
  const sea=g.createImageData(SIZE,SIZE),sd=sea.data,shallow=[143,211,220],deep=[74,160,187],beach=[238,224,176];
  for(let py=0;py<SIZE;py++)for(let px=0;px<SIZE;px++){const r=coast(px/PX-EXTENT,py/PX-EXTENT);if(r<.965||onCloudstep(px/PX-EXTENT,py/PX-EXTENT))continue;const k=(py*SIZE+px)*4;
    const col=r<1?beach:mix(shallow,deep,Math.min(1,(r-1)*9));sd[k]=col[0];sd[k+1]=col[1];sd[k+2]=col[2];sd[k+3]=r<.975?160:255;}
  const layer=document.createElement('canvas');layer.width=layer.height=SIZE;layer.getContext('2d').putImageData(sea,0,0);g.drawImage(layer,0,0);
  g.strokeStyle='#ffffffb0';g.lineWidth=3;
  for(let i=0;i<90;i++){const x=-HALF+R()*HALF*2,z=-HALF+R()*HALF*2;if(coast(x,z)<1.03)continue;const X=sx(x),Y=sz(z);g.beginPath();g.moveTo(X,Y);g.quadraticCurveTo(X+8,Y-6,X+16,Y);g.stroke();}
  // The nine regions: dashed borders along the tile edges, on land only (names are drawn live on top, see draw()).
  g.save();g.setLineDash([10,8]);g.lineWidth=3;g.strokeStyle='#fffdf4b0';g.lineCap='round';
  for(const k of [-100,100])for(let t=-HALF;t<HALF;t+=6){if(coast(k,t)<.97&&coast(k,t+6)<.97){g.beginPath();g.moveTo(sx(k),sz(t));g.lineTo(sx(k),sz(t+6));g.stroke();}if(coast(t,k)<.97&&coast(t+6,k)<.97){g.beginPath();g.moveTo(sx(t),sz(k));g.lineTo(sx(t+6),sz(k));g.stroke();}}
  g.restore();
  const v=g.createRadialGradient(SIZE/2,SIZE/2,SIZE*.35,SIZE/2,SIZE/2,SIZE*.75);v.addColorStop(0,'#0000');v.addColorStop(1,'#1d4a5a40');g.fillStyle=v;g.fillRect(0,0,SIZE,SIZE);
  return c;
}
// The same sheet under snow: land (not water) turns white, keeping its shading so hills, paths and groves still read.
function snowSheet(sheet){const c=document.createElement('canvas');c.width=c.height=SIZE;const g=c.getContext('2d');g.drawImage(sheet,0,0);
  const img=g.getImageData(0,0,SIZE,SIZE),d=img.data;
  for(let k=0;k<d.length;k+=4){const r=d[k],gg=d[k+1],b=d[k+2];if(b>r+25&&b>=gg-10)continue;// sea, ponds, streams stay blue
    const lum=(r*.3+gg*.55+b*.15)/255,f=.86+(lum-.62)*.45,kk=.84;
    d[k]=r+(236*f-r)*kk;d[k+1]=gg+(241*f-gg)*kk;d[k+2]=b+(250*f-b)*kk;}
  g.putImageData(img,0,0);return c;}
// Map fog (2026-11-13): soft, drifting cloud puffs over everywhere you have not been. Each 10 m cell you have
// ridden through (world-content fog) punches a lumpy soft hole ~38 m across into a small fog mask (0.4 px per metre);
// the puffs and a thin haze are drawn at half resolution, cut by the mask, so the sea and land peek through the gaps.
const MS=240,MPX=MS/(EXTENT*2),CLEAR_R=38;
const FOG_BRUSH=[0,1,2,3].map(v=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),r=rng(91+v*13);
  const core=g.createRadialGradient(32,32,0,32,32,26);core.addColorStop(0,'#000');core.addColorStop(.55,'#000');core.addColorStop(1,'#0000');g.fillStyle=core;g.fillRect(0,0,64,64);
  for(let i=0;i<9;i++){const a=i/9*Math.PI*2+r()*.5,d=17+r()*7,x=32+Math.cos(a)*d,y=32+Math.sin(a)*d,rad=7+r()*6,gr=g.createRadialGradient(x,y,0,x,y,rad);gr.addColorStop(0,'#000c');gr.addColorStop(1,'#0000');g.fillStyle=gr;g.beginPath();g.arc(x,y,rad,0,7);g.fill();}
  return c;});
const PUFF_TEX=[0,1,2].map(v=>{const c=document.createElement('canvas');c.width=192;c.height=144;const g=c.getContext('2d'),r=rng(301+v*7),puffs=[];
  for(let i=0;i<13;i++){const a=r()*Math.PI*2,d=Math.sqrt(r())*36;puffs.push([96+Math.cos(a)*d*1.3,74+Math.sin(a)*d*.75,22+r()*16]);}
  const blob=(x,y,rad,inner,outer)=>{const gr=g.createRadialGradient(x-rad*.3,y-rad*.35,rad*.05,x,y,rad);gr.addColorStop(0,inner);gr.addColorStop(.7,outer);gr.addColorStop(1,'rgba(214,224,238,0)');g.fillStyle=gr;g.beginPath();g.arc(x,y,rad,0,7);g.fill();};
  for(const [x,y,rad] of puffs)blob(x+2,y+8,rad,'rgba(190,203,222,.9)','rgba(196,208,226,.75)');
  for(const [x,y,rad] of puffs)blob(x,y,rad,'#ffffff','rgba(240,245,251,.95)');
  return c;});
// Puffs on a jittered 46 m grid a little past the coast; each drifts with the wind (wrapping round), bobs and breathes.
const PUFFS=(()=>{const r=rng(2026),out=[];for(let z=-EXTENT-20;z<=EXTENT+20;z+=46)for(let x=-EXTENT-60;x<EXTENT+60;x+=46)
  out.push({x:x+r()*34,z:z+r()*34,r:36+r()*22,a:.86+r()*.14,v:Math.floor(r()*3),p1:r()*7,p2:r()*7,p3:r()*7,f1:.18+r()*.2,f2:.25+r()*.25,f3:.2+r()*.3});return out;})();
const WRAP=EXTENT*2+120;
// Region names wrap to fit their tile ("Lily Lake / & Western Woods").
function wrapName(ctx,name,max){const words=name.split(' '),lines=[];let cur='';for(const w of words){const t=cur?cur+' '+w:w;if(cur&&ctx.measureText(t).width>max){lines.push(cur);cur=w;}else cur=t;}lines.push(cur);return lines;}
function smooth(pts){const out=[];for(let i=0;i<pts.length-1;i++){const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(pts.length-1,i+2)];
  for(let t=0;t<1;t+=.1){const t2=t*t,t3=t2*t;out.push([0,1].map(k=>.5*(2*p1[k]+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t3)));}}
  out.push(pts.at(-1));return out;}

export function createWorldMap(host,o){
  let sheet=null,snowy=null,root=null,canvas=null,ctx=null,view={x:0,z:0,s:1},fit=1,top=0,selected=null,selAct=null,raf=0,acts=[],todayOpen=false,mask=null,maskData=null,fogStr=null,fresh=[],freshT=0,fogL=null,uncovered=0;
  const explored=()=>o.regions?.()||REGIONS.map(r=>r.id),open_=id=>explored().includes(id);
  const SHOWN_KEY='horselandia-map-fog-shown';
  // Fog mask: opaque = cloud. Cells cleared since the map was last opened (fresh) fade open as it appears.
  function buildMask(bits,fade=1){mask=mask||Object.assign(document.createElement('canvas'),{width:MS,height:MS});const g=mask.getContext('2d');
    g.globalCompositeOperation='source-over';g.globalAlpha=1;g.fillStyle='#000';g.fillRect(0,0,MS,MS);g.globalCompositeOperation='destination-out';
    const d=CLEAR_R*2*MPX;for(let k=0;k<FOG_N*FOG_N;k++){if(!fogHas(bits,k))continue;const h=(k*2654435761)>>>0,i=k%FOG_N,j=(k/FOG_N)|0;
      const x=((i+.5)*FOG_CELL+((h&15)-7.5)*.4)*MPX,y=((j+.5)*FOG_CELL+((h>>4&15)-7.5)*.4)*MPX,sc=.88+(h>>8&15)/60;
      g.globalAlpha=fresh.includes(k)?fade:1;g.save();g.translate(x,y);g.rotate((h>>12&63)/10);g.drawImage(FOG_BRUSH[h>>20&3],-d*sc/2,-d*sc/2,d*sc,d*sc);g.restore();}
    g.globalAlpha=1;{const pre=g.getImageData(0,0,MS,MS).data;let clear=0;for(let q=3;q<pre.length;q+=4)if(pre[q]<128)clear++;uncovered=clear/(MS*MS);}
    for(const [x0,y0,x1,y1] of [[0,0,14,0],[MS,0,MS-14,0],[0,0,0,14],[0,MS,0,MS-14]]){const gr=g.createLinearGradient(x0,y0,x1,y1);gr.addColorStop(0,'#000');gr.addColorStop(1,'#0000');g.fillStyle=gr;g.fillRect(0,0,MS,MS);}
    g.globalCompositeOperation='source-over';maskData=g.getImageData(0,0,MS,MS).data;}
  const head=()=>{const el=root?.querySelector('.wmap-top small');if(el)el.textContent=`${explored().length}/9 regions · ${Math.max(1,Math.round(uncovered*100))}% of the map uncovered · ${o.visited().length}/${LOCATIONS.length} places`;};
  const fogAt=(x,z)=>{if(!maskData)return 0;const i=Math.max(0,Math.min(MS-1,Math.floor((x+EXTENT)*MPX))),j=Math.max(0,Math.min(MS-1,Math.floor((z+EXTENT)*MPX)));return maskData[(j*MS+i)*4+3]/255;};
  // A pin shows once you have been within ~30 m of it (the fog mask itself fades out over open sea at the edges).
  let fogB=null;const cleared=(x,z)=>{if(!fogB)return false;const i0=Math.floor((x+EXTENT)/FOG_CELL),j0=Math.floor((z+EXTENT)/FOG_CELL);
    for(let j=j0-3;j<=j0+3;j++)for(let i=i0-3;i<=i0+3;i++){if(i<0||j<0||i>=FOG_N||j>=FOG_N||!fogHas(fogB,j*FOG_N+i))continue;if(Math.hypot((i+.5)*FOG_CELL-EXTENT-x,(j+.5)*FOG_CELL-EXTENT-z)<30)return true;}return false;};
  const pointers=new Map();let gesture=null;
  const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  // focus {x,z}: open on that spot with the nearest place picked (the Barn games menu's valley games).
  function open(focus=null){
    if(root)return;o.onOpen?.();sheet=sheet||paintSheet(o.obstacles);
    root=document.createElement('div');root.className='wmap';root.setAttribute('role','dialog');root.setAttribute('aria-label','Valley map');
    root.innerHTML=`<canvas aria-label="Map of the valley. Drag to move, pinch to zoom, tap a place."></canvas>
      <header class="wmap-top"><div><b>Trottville</b><small>${explored().length}/9 regions explored · ${o.visited().length}/${LOCATIONS.length} places</small></div><button type="button" class="wmap-close" aria-label="Close map">✕</button></header>
      <div class="wmap-zoom"><button type="button" data-z="in" aria-label="Zoom in">+</button><button type="button" data-z="out" aria-label="Zoom out">−</button><button type="button" data-z="me" aria-label="Centre on me">◎</button></div>
      <section class="wmap-today" aria-label="Things to do today"><button type="button" class="wmap-today-btn" aria-expanded="true"><span aria-hidden="true">📌</span> Today <b></b></button><ol class="wmap-today-list"></ol></section>
      <section class="wmap-card" hidden></section>`;
    host.append(root);canvas=root.querySelector('canvas');ctx=canvas.getContext('2d');
    root.querySelector('.wmap-close').onclick=close;
    // Today: what you can do now to earn Trotties or food (world-today.mjs), as a list and as pins.
    // Quest pins (world-quests.js): ❗ people with a new quest, ✅ people waiting to thank you, and each active quest's goal.
    const near=q=>[...LOCATIONS].sort((a,b)=>Math.hypot(a.x-q.x,a.z-q.z)-Math.hypot(b.x-q.x,b.z-q.z))[0].id;
    acts=[...(o.today?.()||[]),...(o.quests?.()||[]).map(q=>({...q,anchor:near(q)}))];const today=acts.filter(a=>!a.quest),left=today.filter(a=>!a.done).length,tb=root.querySelector('.wmap-today-btn'),list=root.querySelector('.wmap-today-list');
    tb.querySelector('b').textContent=left?`${left} to do`:'all done ✓';
    list.innerHTML=acts.map((a,i)=>a.quest?'':`<li><button type="button" data-act="${i}" class="${a.done?'done':''}"><span class="wmap-act-ico" aria-hidden="true">${iconHTML(a.icon,a.px)}</span><span class="wmap-act-t">${esc(a.title)}</span><span class="wmap-act-r">${a.done?'✓ done':esc(a.reward)}</span></button></li>`).join('');
    const setToday=on=>{todayOpen=on;tb.setAttribute('aria-expanded',on);list.hidden=!on;};setToday(todayOpen&&today.length>0);root.querySelector('.wmap-today').hidden=!today.length;
    tb.onclick=()=>setToday(!todayOpen);
    list.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>{const a=acts[+b.dataset.act];view.x=a.x;view.z=a.z+18/Math.max(view.s,fit*2.2);view.s=Math.max(view.s,fit*5);clamp();if(matchMedia('(max-width:700px)').matches)setToday(false);selectAct(a);});
    root.querySelectorAll('[data-z]').forEach(b=>b.onclick=()=>{const z=b.dataset.z;if(z==='me'){const p=o.player();view.x=p.x;view.z=p.z;}else zoomBy(z==='in'?1.5:1/1.5);});
    canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
    canvas.addEventListener('wheel',e=>{e.preventDefault();zoomBy(e.deltaY<0?1.15:1/1.15);},{passive:false});
    addEventListener('resize',resize);addEventListener('keydown',key);resize();
    // Open on the whole island so all nine regions show at once (zoom in with + or a pinch).
    view.x=0;view.z=0;view.s=fit;clamp();
    // Fog: rebuilt from the save each time the map opens; cells cleared since last time fade open.
    fogStr=o.fog?.()||'';const bits=fogB=fogBits(fogStr);let shown=null;try{shown=localStorage.getItem(SHOWN_KEY);}catch{}
    fresh=[];if(shown){const old=fogBits(shown);for(let k=0;k<FOG_N*FOG_N;k++)if(fogHas(bits,k)&&!fogHas(old,k))fresh.push(k);}freshT=0;buildMask(bits,fresh.length?0:1);
    try{localStorage.setItem(SHOWN_KEY,fogStr);}catch{}
    head();
    if(focus){const l=[...LOCATIONS].sort((a,b)=>Math.hypot(a.x-focus.x,a.z-focus.z)-Math.hypot(b.x-focus.x,b.z-focus.z))[0];view.x=focus.x;view.z=focus.z+18/Math.max(view.s,fit*2.2);view.s=Math.max(view.s,fit*5);clamp();setToday(false);if(focus.quest)selectQuest(focus);else select(l,null,true);}
    const loop=()=>{draw();raf=requestAnimationFrame(loop);};loop();
  }
  function close(){if(!root)return;cancelAnimationFrame(raf);removeEventListener('resize',resize);removeEventListener('keydown',key);root.remove();root=null;selected=null;selAct=null;pointers.clear();o.onClose?.();}
  function key(e){if(e.key==='Escape'){e.stopPropagation();if(selected)select(null);else close();}}
  function resize(){const r=root.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);canvas.width=r.width*dpr;canvas.height=r.height*dpr;
    // Fit the whole valley across the shorter side; zoom in up to about 4× that, never further.
    const hd=root.querySelector('.wmap-top').getBoundingClientRect();top=Math.max(0,hd.bottom-r.top);
    fit=Math.min(r.width-16,r.height-2*top-8)/(EXTENT*2);clamp();}
  const W=()=>canvas.width/Math.min(2,devicePixelRatio||1),Hh=()=>canvas.height/Math.min(2,devicePixelRatio||1);
  function clamp(){view.s=Math.max(fit*.95,Math.min(fit*10,view.s));const hw=W()/2/view.s,hh=Hh()/2/view.s;
    view.x=Math.max(-EXTENT+Math.min(hw,EXTENT),Math.min(EXTENT-Math.min(hw,EXTENT),view.x));view.z=Math.max(-EXTENT+Math.min(hh,EXTENT),Math.min(EXTENT-Math.min(hh,EXTENT),view.z));}
  function zoomBy(f,cx=W()/2,cy=Hh()/2){const before=toWorld(cx,cy);view.s*=f;clamp();const after=toWorld(cx,cy);view.x+=before.x-after.x;view.z+=before.z-after.z;clamp();}
  const toScreen=(x,z)=>({x:(x-view.x)*view.s+W()/2,y:(z-view.z)*view.s+Hh()/2});
  const toWorld=(x,y)=>({x:(x-W()/2)/view.s+view.x,z:(y-Hh()/2)/view.s+view.z});

  function down(e){if(e.isPrimary){pointers.clear();gesture=null;}canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY});
    if(pointers.size===2){const [a,b]=[...pointers.values()];gesture={d:Math.hypot(a.x-b.x,a.y-b.y),s:view.s};}}
  function move(e){const p=pointers.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
    if(pointers.size===1){view.x-=dx/view.s;view.z-=dy/view.s;clamp();}
    else if(pointers.size===2&&gesture){const [a,b]=[...pointers.values()],r=canvas.getBoundingClientRect(),d=Math.hypot(a.x-b.x,a.y-b.y);zoomBy(gesture.s*d/gesture.d/view.s,(a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top);}}
  function up(e){const p=pointers.get(e.pointerId);pointers.delete(e.pointerId);if(pointers.size<2)gesture=null;
    if(p&&pointers.size===0&&Math.hypot(p.x-p.x0,p.y-p.y0)<8){const r=canvas.getBoundingClientRect();tap(e.clientX-r.left,e.clientY-r.top);}}
  const pins=()=>{const v=o.visited();return [...LOCATIONS,...(o.extraPins?.()||[])].filter(l=>v.includes(l.id)||cleared(l.x,l.z));};
  function tap(x,y){for(const a of acts){const s=toScreen(a.x,a.z);if(Math.hypot(s.x-x,s.y-(a.quest?18:0)-y)<24){selectAct(a);return;}}let best=null,bd=26;for(const l of pins()){const s=toScreen(l.x,l.z),d=Math.hypot(s.x-x,s.y-y);if(d<bd){bd=d;best=l;}}select(best);}

  function selectAct(a){select(LOCATIONS.find(l=>l.id===a.anchor)||null,a);}
  function select(l,act=null,closeAll=false){selected=l;selAct=l?act:null;const card=root.querySelector('.wmap-card');if(!l){card.hidden=true;return;}
    const p=o.player(),dist=Math.round(Math.hypot(l.x-p.x,l.z-p.z)),seen=l.seen??o.visited().includes(l.id),info=o.info(l);
    card.innerHTML=`<div class="wmap-card-head"><span class="wmap-badge" style="--c:${KIND[l.kind]||'#5a7d4a'}">${iconHTML(ICON[l.id]||l.icon,PLACE_PX[l.id],'px-lg')}</span><div><h3>${esc(l.name)}</h3><small>${seen?'✓ Discovered':'Not discovered yet'} · ${dist<8?'You are here':dist+' m away'}</small></div><button type="button" class="wmap-x" aria-label="Close">✕</button></div>
      ${act?`<p class="wmap-act${act.done?' done':''}"><span aria-hidden="true">${iconHTML(act.icon,act.px)}</span> <b>${esc(act.title)}</b> · ${act.done?'done today ✓':esc(act.reward)}<br><small>${esc(act.how)}${act.anchor!==act.id&&act.id!=='explore'?' Ride to '+esc(l.name)+', it’s close by.':''}</small></p>`:`<p>${esc(l.description)}</p>`}${info.trust?`<p class="wmap-trust">${info.trust}</p>`:''}
      <div class="wmap-actions">${dist<8?'<button type="button" class="wmap-ride wmap-done">Close map</button>':`<button type="button" class="wmap-ride">${esc(info.ride)}</button>${info.jump?`<button type="button" class="wmap-jump">${esc(info.jump)}</button>`:''}`}</div>`;
    card.hidden=false;card.querySelector('.wmap-x').onclick=()=>closeAll?close():select(null);
    // v107: there is always a button that works. Already there? The only button closes the map.
    card.querySelector('.wmap-ride').onclick=()=>{close();if(dist>=8)o.onRide(l.go||l.id);};const j=card.querySelector('.wmap-jump');if(j)j.onclick=()=>{close();o.onJump(l.go||l.id);};}
  // v107 (Yoshi got stuck tapping the quest timer): the timer opens its own card. It says who to go back to, rides you
  // right up to them (not to the nearest named place), and ✕ closes the whole map.
  function selectQuest(f){const q=f.quest,card=root.querySelector('.wmap-card'),p=o.player(),dist=Math.round(Math.hypot(f.x-p.x,f.z-p.z));
    const place=[...LOCATIONS].sort((a,b)=>Math.hypot(a.x-f.x,a.z-f.z)-Math.hypot(b.x-f.x,b.z-f.z))[0],info=o.info(place),who=q.label||place.name;
    const left=q.left>0?` · ⏳ ${Math.floor(q.left/60)}:${String(Math.floor(q.left%60)).padStart(2,'0')} left`:'',riding=/^Ride/.test(info.ride);
    selected=place;selAct=null;
    card.innerHTML=`<div class="wmap-card-head"><span class="wmap-badge" style="--c:#c98a2b">${iconHTML(q.icon||'📜',q.px||'quest-new','px-lg')}</span><div><h3>${esc(q.title||'Quest')}</h3><small>${dist<8?'You are here':dist+' m away'}${esc(left)}</small></div><button type="button" class="wmap-x" aria-label="Close map">✕</button></div>
      <p>${esc(q.todo||('Go to '+who+'.'))}</p>${dist<8?`<p class="wmap-trust">${esc(who)} is right here. Close the map and tap them to talk.</p>`:''}
      <div class="wmap-actions">${dist<8?'<button type="button" class="wmap-ride wmap-done">Close map</button>':`<button type="button" class="wmap-ride">${esc((riding?'Ride to ':'Walk to ')+who)}</button>${info.jump?`<button type="button" class="wmap-jump">${esc(info.jump)}</button>`:''}`}</div>`;
    card.hidden=false;card.querySelector('.wmap-x').onclick=close;
    card.querySelector('.wmap-ride').onclick=()=>{close();if(dist>=8)o.onGo?.({x:f.x,z:f.z,label:who});};const j=card.querySelector('.wmap-jump');if(j)j.onclick=()=>{close();o.onJump(place.go||place.id);};}

  function drawFog(){const now=performance.now(),t=now/1000,w=W(),h=Hh(),sc=.5;
    if(fresh.length){if(!freshT)freshT=now;const f=Math.min(1,(now-freshT)/2000);buildMask(fogBits(fogStr),f*f*(3-2*f));if(f>=1){fresh=[];head();}}
    const lw=Math.max(1,Math.ceil(w*sc)),lh=Math.max(1,Math.ceil(h*sc));fogL=fogL||document.createElement('canvas');if(fogL.width!==lw||fogL.height!==lh){fogL.width=lw;fogL.height=lh;}
    const g=fogL.getContext('2d');g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='source-over';g.globalAlpha=1;g.clearRect(0,0,lw,lh);g.setTransform(sc,0,0,sc,0,0);
    // A thin haze, so even the gaps between puffs are a little milky.
    g.fillStyle='rgba(226,233,244,.56)';g.fillRect(0,0,w,h);
    for(const p of PUFFS){let x=p.x+t*1.4+Math.sin(t*p.f1+p.p1)*5;x=((x+EXTENT+60)%WRAP+WRAP)%WRAP-EXTENT-60;const z=p.z+Math.sin(t*p.f2+p.p2)*4;
      const r=p.r*(1+.08*Math.sin(t*p.f3+p.p3));
      if(fogAt(x,z)<.04&&fogAt(x+r*.7,z)<.04&&fogAt(x-r*.7,z)<.04&&fogAt(x,z+r*.6)<.04&&fogAt(x,z-r*.6)<.04)continue;
      const s=toScreen(x,z),rs=r*view.s;if(s.x+rs*1.3<0||s.x-rs*1.3>w||s.y+rs<0||s.y-rs>h)continue;
      g.globalAlpha=p.a*(.8+.2*Math.sin(t*p.f2*1.3+p.p3));g.drawImage(PUFF_TEX[p.v],s.x-rs*1.3,s.y-rs,rs*2.6,rs*1.95);}
    g.globalAlpha=1;g.globalCompositeOperation='destination-in';const tl=toScreen(-EXTENT,-EXTENT);g.imageSmoothingQuality='high';g.drawImage(mask,tl.x,tl.y,EXTENT*2*view.s,EXTENT*2*view.s);
    g.globalCompositeOperation='source-over';ctx.drawImage(fogL,0,0,w,h);}
  function draw(){const dpr=Math.min(2,devicePixelRatio||1),w=W(),h=Hh();ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle='#4aa0bb';ctx.fillRect(0,0,w,h);
    const tl=toScreen(-EXTENT,-EXTENT);ctx.imageSmoothingQuality='high';ctx.drawImage(sheet,tl.x,tl.y,EXTENT*2*view.s,EXTENT*2*view.s);
    // Snow days: the land whitens with the world's snow cover, and flakes drift over the map while it falls.
    const sn=o.snow?.()||{cover:0,fall:0};
    if(sn.cover>.01){snowy=snowy||snowSheet(sheet);ctx.globalAlpha=Math.min(1,sn.cover);ctx.drawImage(snowy,tl.x,tl.y,EXTENT*2*view.s,EXTENT*2*view.s);ctx.globalAlpha=1;}
    if(sn.fall>.05){const t=performance.now()/1000,n=Math.round(120*sn.fall);ctx.fillStyle='rgba(255,255,255,.85)';
      for(let i=0;i<n;i++){const sp=18+(i*37)%23,x=((i*97.3+t*(8+i%5*3)+Math.sin(t*.8+i)*14)%(w+20)+w+20)%(w+20)-10,y=((i*61.7+t*sp)%(h+20))-10,r=1.2+(i%4)*.6;
        ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();}}
    drawFog();
    // Region names: always on clouds; on explored land while zoomed out.
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
    for(const rg of REGIONS){const known=open_(rg.id);if(known&&view.s>fit*2.4)continue;const fs=Math.max(11,Math.min(17,view.s*200/12));
      ctx.font=`900 ${fs}px system-ui,sans-serif`;const lines=wrapName(ctx,rg.name.toUpperCase(),200*view.s*.86),lh=fs*1.15;
      const c=toScreen(rg.cx,known?rg.cz-74:rg.cz-8);let y=Math.max(top+10+lh/2,c.y-(lines.length-1)*lh/2);
      if(c.x<-120||c.x>W()+120||y>Hh()+60)continue;
      lines.forEach((t,i)=>{ctx.lineWidth=4.5;ctx.strokeStyle='#fffdf4';ctx.strokeText(t,c.x,y+i*lh);ctx.fillStyle=known?'#24402c':'#4a5872';ctx.fillText(t,c.x,y+i*lh);});
      if(!known){ctx.font=`700 ${Math.max(10,fs*.72)}px system-ui,sans-serif`;ctx.fillStyle='#5f6f8a';ctx.fillText(200*view.s>170?'☁ ride here to explore':'☁ not explored',c.x,y+lines.length*lh+2);}}
    // Pins stay the same size on screen; names show once zoomed in, or for the chosen place.
    const visited=o.visited(),showNames=view.s>fit*3.2;ctx.textAlign='center';
    for(const l of pins()){const s=toScreen(l.x,l.z);if(s.x<-40||s.y<-40||s.x>w+40||s.y>h+40)continue;const seen=l.seen??visited.includes(l.id),on=selected===l,r=on?19:15;
      ctx.fillStyle='#00000033';ctx.beginPath();ctx.ellipse(s.x,s.y+r+3,r*.7,3.5,0,0,7);ctx.fill();
      ctx.globalAlpha=seen?1:.62;ctx.fillStyle=KIND[l.kind]||'#5a7d4a';ctx.beginPath();ctx.arc(s.x,s.y,r,0,7);ctx.fill();
      ctx.lineWidth=on?4:3;ctx.strokeStyle='#fffdf4';if(!seen)ctx.setLineDash([4,3]);ctx.stroke();ctx.setLineDash([]);
      ctx.font=`${on?19:16}px system-ui,'Noto Color Emoji','Apple Color Emoji',sans-serif`;ctx.textBaseline='middle';pinIcon(ctx,PLACE_PX[l.id],ICON[l.id]||l.icon,s.x,s.y+1,on?30:24);ctx.globalAlpha=1;
      if(showNames||on){ctx.font='800 12px system-ui,sans-serif';const tw=ctx.measureText(l.name).width+12;ctx.fillStyle='#fffdf4e8';ctx.beginPath();ctx.roundRect(s.x-tw/2,s.y+r+5,tw,18,9);ctx.fill();ctx.fillStyle='#2f4a34';ctx.fillText(l.name,s.x,s.y+r+14.5);}}
    // Today's activities: a pulsing gold ring with the reward on a tag; a small green tick once done.
    const beat=(performance.now()/1100)%1;ctx.textBaseline='middle';
    for(const a of acts){const s=toScreen(a.x,a.z);if(s.x<-60||s.y<-60||s.x>w+60||s.y>h+60)continue;const on=selAct===a;
      if(a.quest){const col=a.kind==='target'?'#e0703a':a.kind==='turnin'?'#3f8f45':'#3f7fc4',r=on?15:12;
        // Zoomed out, "someone needs a hand" pins are small dots where the pin head would be (30 full pins were noise).
        if(a.kind==='offer'&&!on&&!cleared(a.x,a.z))continue;
        if(a.kind==='offer'&&!on&&!showNames){ctx.fillStyle=col;ctx.beginPath();ctx.arc(s.x,s.y-18,5.5,0,7);ctx.fill();ctx.strokeStyle='#fffdf4';ctx.lineWidth=2;ctx.stroke();continue;}
        if(a.kind==='target'){ctx.strokeStyle=`rgba(224,112,58,${1-beat})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(s.x,s.y-r,r+3+beat*10,0,7);ctx.stroke();}
        ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.arc(s.x,s.y-r-6,r,Math.PI*.78,Math.PI*.22);ctx.closePath();ctx.fill();ctx.strokeStyle='#fffdf4';ctx.lineWidth=2.5;ctx.stroke();
        ctx.font=`${on?15:12}px system-ui,'Noto Color Emoji','Apple Color Emoji',sans-serif`;pinIcon(ctx,a.px,a.icon,s.x,s.y-r-6,on?22:18);continue;}
      if(a.done){ctx.fillStyle='#2f6b3a';ctx.beginPath();ctx.arc(s.x,s.y,11,0,7);ctx.fill();ctx.strokeStyle='#fffdf4';ctx.lineWidth=2.5;ctx.stroke();ctx.fillStyle='#fffdf4';ctx.font='800 12px system-ui,sans-serif';ctx.fillText('✓',s.x,s.y+1);continue;}
      ctx.strokeStyle=`rgba(255,207,58,${1-beat})`;ctx.lineWidth=4;ctx.beginPath();ctx.arc(s.x,s.y,16+beat*14,0,7);ctx.stroke();
      ctx.fillStyle='#ffcf3a';ctx.beginPath();ctx.arc(s.x,s.y,on?18:15,0,7);ctx.fill();ctx.strokeStyle='#fffdf4';ctx.lineWidth=3;ctx.stroke();
      ctx.font="16px system-ui,'Noto Color Emoji','Apple Color Emoji',sans-serif";pinIcon(ctx,a.px,a.icon,s.x,s.y+1,on?26:22);
      const tag=a.coins?`+${a.coins}`:'free';ctx.font='800 11px system-ui,sans-serif';const tw=ctx.measureText(tag).width+12;
      ctx.fillStyle='#8a5a00';ctx.beginPath();ctx.roundRect(s.x-tw/2,s.y-36,tw,17,8.5);ctx.fill();ctx.fillStyle='#fffdf4';ctx.fillText(tag,s.x,s.y-27.5);}
    // You are here: a pulsing ring and an arrow for the way you face.
    const p=o.player(),s=toScreen(p.x,p.z),pulse=(performance.now()/900)%1;
    ctx.strokeStyle=`rgba(255,255,255,${1-pulse})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(s.x,s.y,10+pulse*16,0,7);ctx.stroke();
    ctx.save();ctx.translate(s.x,s.y);ctx.rotate(Math.PI-p.h);ctx.fillStyle='#fffdf4';ctx.beginPath();ctx.arc(0,0,11,0,7);ctx.fill();
    ctx.fillStyle='#2f6b3a';ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(6,6);ctx.lineTo(0,3);ctx.lineTo(-6,6);ctx.closePath();ctx.fill();ctx.restore();}

  return {open,close,get isOpen(){return !!root;}};
}
