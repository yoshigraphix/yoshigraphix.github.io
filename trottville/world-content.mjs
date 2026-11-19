import {blendHeight,roadX,roadZ} from './world-wild.mjs?v=160';
import {R,HALF,SQUARE,REGIONS,regionAt} from './world-regions.mjs?v=160';
import {cloudstepHeight,CLOUDSTEP,START,STREAM} from './world-cloudstep.mjs?v=160';
const places=[
['stable','The Stables',-13,2,'barn','⌂','Step into the barn for six hands-on care games.'],
['gate','Meadow Gate',13,15,'gate','✦','The first golden marker on the Meadow Loop.'],
['pond','Lily Lake',30,4,'pond','≈','A quiet waterside stop with lily pads and a wooden dock.'],
['ridge','Sunset Ridge',29,-22,'lookout','△','Take in the hills from the eastern ridge.'],
['orchard','Apple Orchard',3,-26,'orchard','●','Gather apples for your companions.'],
['home','The Home Trail',-19,20,'trail','⌁','An easy route back to the stable yard.'],
['mill','Willow Windmill',-55,-12,'mill','✳','A windmill above the western fields.'],
['village','Bramble Village',-48,32,'village','⌂','A fountain square with a bakery, post office, town hall and general store to walk into.'],
['market','Carrot Market',-64,32,'market','▥','Collect the market’s daily carrot basket.'],
['race','Clover Racecourse',45,25,'race','⚑','Run a timed lap or gather friends for a race.'],
['jump','Little Leap School',22,45,'jump','↟','Practice your horse’s careful little jumps.'],
['picnic','Buttercup Picnic',-20,50,'picnic','❀','A shaded picnic spot in the warm grass.'],
['beach','Seaglass Shore',-58,66,'beach','≈','Follow the sand to a turquoise shoreline.'],
['lighthouse','Rosewater Lighthouse',-72,67,'lighthouse','♜','A rose-colored beacon above the coast.'],
['flowers','Lavender Fields',5,65,'flowers','❁','Pick a small bouquet from the garden.'],
['forest','Mosswood Grove',60,-35,'forest','♣','A cool grove beneath green and golden canopies.'],
['falls','Silver Ribbon Falls',40,-65,'falls','≋','Find the waterfall between the rocks.'],
['mountain','Cloudstep Trailhead',-46,-46,'mountain','△','Ride the spiral trail three times round the mountain to the summit. Pass the stone arch to time your climb.'],
['summit','Cloudstep Summit',CLOUDSTEP.cx,CLOUDSTEP.cz,'summit','⚑','Above the clouds, with the whole valley below. Fast travel stops at the trailhead.'],
['ruins','Old Stone Arch',-84,-15,'ruins','∩','Ancient stones at the edge of the woods.']
];
// Riding paths, shared by the 3D world (drawn as ribbons) and the map. Points are [x,z] in world coordinates.
// Nine regions (world-regions.mjs): the meadow loop and the yard stay round the stables; a RING ROAD circles
// Trottville through the inner edge of the eight outer regions, four SPOKES join it to the loop, BRANCHES lead to each
// place, and four EXITS meet the wild roads at the world's edge.
const ring=[[-150,-110],[-75,-114],[0,-111],[75,-115],[150,-110],[166,-50],[165,0],[164,60],[150,120],[75,135],[0,131],[-75,135],[-150,120],[-164,60],[-165,0],[-166,-50],[-150,-110]];
const ex=(x,z)=>[Math.round(x*10)/10,Math.round(z*10)/10];
export const MAP_PATHS={
  loop:[[0,8],[0,15],[13,15],[30,4],[35,-10],[29,-22],[3,-26],[-16,-19],[-29,-3],[-27,13],[-19,20],[0,15]],
  yard:[[-13,-1],[-12,4],[-4,7],[0,9]],
  routes:[ring,
    [[3,-26],[2,-70],[0,-111]],                                   // north spoke
    [[35,-10],[60,-22],[88,-24],[122,-8],[165,0]],                // east spoke, past the village
    [[-19,20],[-22,56],[-8,96],[0,131]],                          // south spoke, past the vet and the gazebo
    [[13,15],[11.5,20],[10,24.8]],                                // v102: from the loop to Hoofhaven's doors
    [[-22,56],[-50,63],[-72,66]],[[-108,66],[-140,62],[-164,60]],   // v103: Thimbleford's high street, east to the south spoke, west over the Willowrush to the ring road
    [[-58,-112],[-58,-100]],                                       // v103: the ring road's spur to Pegasus Perch (the sky gate)
    [[-29,-3],[-45,-14],[-82,-13],[-122,-5],[-165,0]],            // west spoke
    [[0,-111],[Math.round(START.x),Math.round(START.z)]],          // Cloudstep trailhead
    [[150,-110],[172,-140],[183,-158],[204,-200],[211,-226]],     // Mosswood Grove, Silver Ribbon Falls
    [[165,0],[181,-6]],[[164,60],[170,47]],                        // racecourse, jump school
    [[150,120],[168,150],[175,157],[205,168],[236,172]],          // orchard, windmill
    [[168,150],[198,190],[217,208]],                              // corn maze gate
    [[0,131],[0,186]],[[0,131],[-30,162],[-44,184]],              // lavender fields, picnic
    [[-150,120],[-180,152],[-196,180],[-210,183]],                // beach, lighthouse
    [[-165,0],[-186,4]],[[-166,-50],[-186,-46]],                  // lake, ridge
    [[-150,-110],[-185,-150],[-200,-190]],                        // into Snowy Pines
    [[165,0],[230,0],ex(HALF,roadZ(0,HALF))],[[-165,0],[-230,0],ex(-HALF,roadZ(0,-HALF))],   // east, west exits
    [[0,131],[30,200],[15,260],ex(roadX(0,HALF),HALF)],[[150,-110],[156,-200],ex(roadX(1,-HALF),-HALF)]   // south, north exits
  ],
  track:[[45,25],[68,25],[68,50],[45,50],[45,25]].map(([x,z])=>{const p=R(x,z);return [p.x,p.z];})
};
// Ranch services (not part of the 20 places to discover): walk up and press Interact.
export const SERVICES=[{id:'vet',name:'Willowbrook Vet',x:-34,z:44,icon:'🩺'},{id:'hoofhaven',name:'Hoofhaven Horse Market',x:10,z:33,icon:'🐴'}].map(s=>({...s,...R(s.x,s.z)}));
// Each place moves with its block (world-regions.mjs); the summit is already in world coordinates (CLOUDSTEP).
// Bramble Village is its fountain square now (world-town.mjs).
// v103: new places, already in world coordinates (not moved by R()).
const NEW_PLACES=[
  {id:'thimbleford',name:'Thimbleford',x:-90,z:76,kind:'village',icon:'🕰️',description:'A cobbled Tudor town square round an old clock tower. Climb the tower for the view.'},
  {id:'perch',name:'Pegasus Perch',x:-58,z:-93,kind:'skygate',icon:'🪽',description:'A white pavilion under a rainbow. Ride your horse in: under the dome, horses grow wings and fly you up above the clouds.'},
  {id:'goldensheaf',name:'Goldensheaf Windmill',x:45,z:117,kind:'mill',icon:'🌾',description:'A windmill turning over the golden wheat fields.'},
  {id:'bramblemill',name:'Bramble Mill',x:86,z:160,kind:'mill',icon:'🛞',description:'A water wheel turning in Bramble Brook.'},
  // v106: two farms in Harvest Farms
  {id:'puddlebrook',name:'Puddlebrook Farm',x:270,z:206,kind:'farm',icon:'🐷',description:'A busy farm: pigs in the mud, cows in the field, hens, goats, ducks and a big red barn. Farmer Hattie has lost her eggs again.'},
  {id:'bramblewick',name:'Bramblewick Farm',x:178,z:216,kind:'farm',icon:'🐄',description:'A little farm with shaggy Highland cows, a pig sty and two donkeys. Farmer Gus’s piglets keep escaping.'}];
// v106 (2026-11-14, Yoshi: "Farms can have pigs and cows. Go crazy"): farm layouts in world coordinates. Rect pens are
// {x,z,w,d}; round fields {x,z,r}. world-expansion.js builds them, world-map.js draws them.
export const FARMS=[
  {id:'puddlebrook',name:'Puddlebrook Farm',house:{x:285,z:194},barn:{x:285,z:222},silo:{x:293,z:236},pigs:{x:254,z:195,w:14,d:12},coop:{x:251,z:222,r:6},
    cows:{x:264,z:259,r:13},goats:{x:290,z:258,w:8,d:14},pond:{x:278,z:287,r:5},veg:{x:251,z:287,w:12,d:9},hay:{x:268,z:216}},
  {id:'bramblewick',name:'Bramblewick Farm',house:{x:183,z:196},pigs:{x:166,z:204,w:10,d:9},cows:{x:174,z:235,r:11,kind:'highland'},donkeys:{x:187,z:217,w:10,d:10},hay:{x:192,z:229}}];
export const LOCATIONS=places.map(([id,name,x,z,kind,icon,description])=>({id,name,...(id==='summit'?{x,z}:id==='village'?{x:SQUARE.x,z:SQUARE.z}:R(x,z)),kind,icon,description})).concat(NEW_PLACES);
// Barn games and where they live (barn-interior.js lays out the barn: a hall with stalls on the left, the tack room
// and Hazel's shop on the right, the big doors at the front). x/z are inside the barn. where:'outdoor' games are
// played at their stations out in the valley (world-stations.js) and have no spot in the barn; the Barn games menu
// lists them under "Out in the valley" with a map button, never a Play button (Yoshi 2026-11-09).
export const BARN_GAMES=[['muck','Muck & Tidy','♧',-2.9,2.2,'Clear eight little piles from the bedding.'],['hay','Fresh Hay Delivery','▤',2,-11.5,'Deliver fresh hay to three hungry stalls.'],['water','Water Works','◒',-3,8.2,'Stop in the green band to fill three buckets.'],['groom','Grooming Glow','✧',-6.6,-13,'Brush away the dust and help your companion shine.'],['feed','Appleoosa','●',17,-32,'Collect colorful apple bundles as the belt rises faster.','outdoor'],['tack','Tack Match','♞',12,-7,'Turn the cards and find six matching pairs.'],['fling','Hay’s for Horses','▥',-29,0,'Fling hay bales through the loft door.','outdoor']].map(([id,name,icon,x,z,description,where='barn'])=>({id,name,icon,x,z,description,where}));
export const INDOOR_GAMES=BARN_GAMES.filter(g=>g.where==='barn');
export const RACE_GATES=[{x:68,z:25},{x:68,z:50},{x:45,z:50},{x:45,z:25}].map(g=>R(g.x,g.z));
// The valley's own gentle hills; outside the valley they blend into the endless wild lands, and Cloudstep
// (world-cloudstep.mjs) rises over the south-west corner.
export function valleyHeight(x,z){return .42*Math.sin(x*.06)*Math.cos(z*.055)+.18*Math.sin(z*.11);}
// ---- v103 new lands (Yoshi 2026-11-13: "rivers that you can't cross unless you use bridges and more mountains,
// fields of wheat, pretty flower fields, flower gardens, water mills, windmills… a quaint town square with a
// clocktower and Tudor houses, cobblestone streets… a world you enter with Pegasus above the clouds") ----
// Everything below is data + maths: world-expansion.js builds the 3D, world-map.js draws it, world-logic.mjs blocks
// the water. Rivers run down from a spring at a mountain's foot to a mill pond; roads cross them on bridges, worked out
// where a MAP_PATHS route meets a river (so a new road over a river always gets one).
export const RIVERS=[
  {id:'willow',name:'Willowrush River',w:7,pond:{x:-122,z:227,r:13},pts:[[-128,-250],[-120,-218],[-128,-184],[-118,-150],[-108,-113],[-96,-84],[-104,-52],[-114,-22],[-116,8],[-126,36],[-140,62],[-147,90],[-139,118],[-126,148],[-119,182],[-121,214]]},
  {id:'bramble',name:'Bramble Brook',w:5,pond:{x:92,z:221,r:12},pts:[[124,-48],[116,-24],[112,-2],[106,26],[100,56],[104,88],[110,118],[106,148],[98,178],[94,208]]}];
export const MOUNTAINS=[{x:-132,z:-284,r:36,h:34,snow:true},{x:-60,z:-286,r:28,h:24},{x:-250,z:-302,r:38,h:36,snow:true},{x:-283,z:-112,r:24,h:20},
  {x:134,z:-72,r:23,h:24},{x:128,z:274,r:30,h:26},{x:-76,z:283,r:26,h:20}];
export const TOWN2={id:'thimbleford',name:'Thimbleford',x:-90,z:66,clock:{x:-90,z:54}};   // the Tudor town square
// Thimbleford's cobbles (v130): the 36×30 square round TOWN2 plus three cobbled streets 4.2 wide. world-expansion draws them;
// world.js asks onCobbles() to pick the cobblestone hoofbeats.
export const COBBLE_SQUARE={w:36,d:30},COBBLE_STREETS=[[[-50,63],[-72,66]],[[-108,66],[-140,62]],[[-90,81],[-90,98]]],COBBLE_HALF=2.1;
export function onCobbles(x,z){if(Math.abs(x-TOWN2.x)<COBBLE_SQUARE.w/2&&Math.abs(z-TOWN2.z)<COBBLE_SQUARE.d/2)return true;
  for(const [a,b] of COBBLE_STREETS){const vx=b[0]-a[0],vz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*vx+(z-a[1])*vz)/(vx*vx+vz*vz)));if(Math.hypot(x-a[0]-vx*t,z-a[1]-vz*t)<COBBLE_HALF)return true;}return false;}
export const FIELDS=[{kind:'wheat',x:60,z:86,w:44,d:30,rot:.1},{kind:'wheat',x:-40,z:100,w:34,d:24,rot:-.08},
  {kind:'flowers',x:-50,z:-60,w:40,d:28,rot:.05},{kind:'flowers',x:55,z:170,w:38,d:22,rot:-.12},{kind:'sunflower',x:-62,z:158,w:30,d:18,rot:.06}];
export const PASTURE={x:-195,z:95,r:11,name:'Ewe Meadow'};   // v105: sheep graze here
export const MILLS=[{kind:'water',x:-115,z:29,river:'willow',name:'Thimbleford Water Mill'},{kind:'water',x:93,z:160,river:'bramble',name:'Bramble Mill'},
  {kind:'wind',x:45,z:110,name:'Goldensheaf Windmill'},{kind:'wind',x:-66,z:114,name:'Thimble Hill Windmill'}];
export const SKYGATE={x:-58,z:-93,name:'Pegasus Perch'};   // where you meet the pegasus who flies you above the clouds
const smooth01=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
// Catmull-Rom through each river's points, sampled every metre.
function curve(pts,step=1){const out=[];for(let i=0;i<pts.length-1;i++){const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(pts.length-1,i+2)],n=Math.max(2,Math.ceil(Math.hypot(p2[0]-p1[0],p2[1]-p1[1])/step));
  for(let k=0;k<n;k++){const t=k/n,t2=t*t,t3=t2*t,f=(a,b,c,d)=>.5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3);out.push([f(p0[0],p1[0],p2[0],p3[0]),f(p0[1],p1[1],p2[1],p3[1])]);}}
  out.push(pts[pts.length-1]);return out;}
for(const r of RIVERS)r.line=curve(r.pts);
// Bridges: every place a route crosses a river line. The deck runs along the road; its length clears the banks.
export const BRIDGES=(()=>{const out=[],seg=(a,b,c,d)=>{const r=(b[0]-a[0])*(d[1]-c[1])-(b[1]-a[1])*(d[0]-c[0]);if(Math.abs(r)<1e-9)return null;const t=((c[0]-a[0])*(d[1]-c[1])-(c[1]-a[1])*(d[0]-c[0]))/r,u=((c[0]-a[0])*(b[1]-a[1])-(c[1]-a[1])*(b[0]-a[0]))/r;return t>=0&&t<=1&&u>=0&&u<=1?{x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t}:null;};
  for(const route of MAP_PATHS.routes)for(let i=0;i<route.length-1;i++)for(const rv of RIVERS)for(let j=0;j<rv.line.length-1;j++){const hit=seg(route[i],route[i+1],rv.line[j],rv.line[j+1]);
    if(hit&&!out.some(b=>Math.hypot(b.x-hit.x,b.z-hit.z)<6)){const ang=Math.atan2(route[i+1][0]-route[i][0],route[i+1][1]-route[i][1]);out.push({...hit,ang,len:rv.w+7,w:4.6,river:rv.id});}}
  return out;})();
// A 1 m grid over the world: distance to the nearest river line (or pond rim), in quarter metres, 255 = far.
const GN=640,G0=-320,grid=new Uint8Array(GN*GN).fill(255),owner=new Uint8Array(GN*GN);
for(const [ri,r] of RIVERS.entries()){const R2=r.w/2+9;for(const [x,z] of r.line){for(let gx=Math.floor(x-R2);gx<=x+R2;gx++)for(let gz=Math.floor(z-R2);gz<=z+R2;gz++){const i=gx-G0,j=gz-G0;if(i<0||j<0||i>=GN||j>=GN)continue;
    const d=Math.hypot(gx+.5-x,gz+.5-z);if(d<R2){const q=Math.min(254,Math.round(d*4)),k=j*GN+i;if(q<grid[k]){grid[k]=q;owner[k]=ri;}}}}
  const p=r.pond,PR=p.r+9;for(let gx=Math.floor(p.x-PR);gx<=p.x+PR;gx++)for(let gz=Math.floor(p.z-PR);gz<=p.z+PR;gz++){const i=gx-G0,j=gz-G0;const d=Math.max(0,Math.hypot(gx+.5-p.x,gz+.5-p.z)-(p.r-r.w/2));const q=Math.min(254,Math.round(d*4)),k=j*GN+i;if(q<grid[k]){grid[k]=q;owner[k]=ri;}}}
// Distance from (x,z) to the water's middle, and which river; {d:Infinity} away from every river.
export function riverAt(x,z){const i=Math.floor(x)-G0,j=Math.floor(z)-G0;if(i<0||j<0||i>=GN||j>=GN)return {d:Infinity,r:null};const k=j*GN+i,q=grid[k];return q===255?{d:Infinity,r:null}:{d:q/4,r:RIVERS[owner[k]]};}
export function onBridge(x,z,pad=0){for(const b of BRIDGES){const dx=x-b.x,dz=z-b.z,s=Math.sin(b.ang),c=Math.cos(b.ang),along=dx*s+dz*c,side=dx*c-dz*s;if(Math.abs(along)<b.len/2+pad&&Math.abs(side)<b.w/2-.3)return b;}return null;}
// In the water (not on a bridge): blocked for walking and riding, whatever the jump.
export function inWater(x,z,radius=0){const a=riverAt(x,z);if(a.d===Infinity)return false;if(a.d>a.r.w/2+radius)return false;return !onBridge(x,z);}
// The deck: a gentle arch over the water, level with the banks at each end.
export function bridgeFloor(x,z){const b=onBridge(x,z,.6);if(!b)return -Infinity;const dx=x-b.x,dz=z-b.z,along=(dx*Math.sin(b.ang)+dz*Math.cos(b.ang))/(b.len/2+.6);return baseHeight(b.x,b.z)+.35+.75*Math.cos(Math.min(1,Math.abs(along))*Math.PI/2);}
// v149 (Yoshi: "mountains look really plain"): spurs and gullies. Ridged noise carves rock ribs running down from each
// peak, strongest high up and fading out at the foot, so the paths and trees round the base stay where they were.
const _vh=(i,j)=>{let h=Math.imul(i,374761393)^Math.imul(j,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
function _vn(x,z){const i=Math.floor(x),j=Math.floor(z),u=x-i,v=z-j,a=u*u*(3-2*u),b=v*v*(3-2*v);return (_vh(i,j)*(1-a)+_vh(i+1,j)*a)*(1-b)+(_vh(i,j+1)*(1-a)+_vh(i+1,j+1)*a)*b;}
const _rid=(x,z)=>{const n1=1-Math.abs(2*_vn(x,z)-1),n2=1-Math.abs(2*_vn(x*2.3+5.1,z*2.3-3.7)-1);return n1*.7+n2*.3;};
export function mountainLift(x,z){let h=0;for(const m of MOUNTAINS){const d=Math.hypot(x-m.x,z-m.z);if(d>=m.r)continue;const t=1-d/m.r,ang=Math.atan2(z-m.z,x-m.x),ridge=1+.18*Math.sin(ang*5+m.x)*t+.1*Math.sin(x*.21+z*.17);
    const spur=_rid(ang*2.4+m.x*.01,d*.07+m.z*.01),rough=t>.2?(.2*(spur-.55)+.07*(_rid(x*.09,z*.09)-.5))*Math.min(1,(t-.2)/.35)*(1-Math.max(0,(t-.8)/.2)*.75):0;
    h+=m.h*Math.pow(t,1.6)*ridge*(1+rough*1.7);}return h;}
// The river bed: water half-width deep, sloping banks out to 3 m past the edge.
// The bed dips under the water only (no sunken banks), so a coarse phone mesh never shows water floating over a ditch.
export function riverCarve(x,z){const a=riverAt(x,z);if(a.d===Infinity)return 0;const edge=a.r.w/2+.4;return a.d<edge?1.3*(1-(a.d/edge)**2):0;}
export function riverWaterY(x,z){return baseHeight(x,z)+.05;}
function baseHeight(x,z){return blendHeight(valleyHeight(x,z)+mountainLift(x,z),x,z);}
export function terrainHeight(x,z){return cloudstepHeight(x,z,baseHeight(x,z)-riverCarve(x,z));}
// The pond the Cloudstep stream runs into: its water sits just below the lowest ground round its rim.
export const POND=(()=>{const q=STREAM.pond;let low=Infinity;for(let i=0;i<24;i++){const a=i/24*Math.PI*2;low=Math.min(low,terrainHeight(q.x+Math.cos(a)*(q.r+1),q.z+Math.sin(a)*(q.r+1)));}return {...q,y:low-.25};})();
export function freshAdventure(){return {version:1,visited:[],games:{},daily:{},supplies:{apples:0,carrots:0,flowers:0},mountainFalls:0,summit:false,bestLap:null,bestClimb:null,regions:['c'],grotto:0,fog:''};}
export function normalizeAdventure(raw){const p=freshAdventure();if(!raw||typeof raw!=='object')return p;p.visited=[...new Set((Array.isArray(raw.visited)?raw.visited:[]).filter(id=>LOCATIONS.some(l=>l.id===id)))];for(const g of BARN_GAMES)p.games[g.id]=Math.min(999,Math.max(0,Number(raw.games?.[g.id])||0));p.daily=raw.daily&&typeof raw.daily==='object'?raw.daily:{};p.supplies=Object.fromEntries(['apples','carrots','flowers'].map(k=>[k,Math.min(999,Math.max(0,Number(raw.supplies?.[k])||0))]));p.mountainFalls=Math.max(0,Number(raw.mountainFalls)||0);p.summit=raw.summit===true;p.bestLap=Number(raw.bestLap)>0?Number(raw.bestLap):null;p.bestClimb=Number(raw.bestClimb)>0?Number(raw.bestClimb):null;
  // Map clouds (2026-11-12): regions you have ridden into. Older saves count every region holding a place you found.
  p.regions=[...new Set(['c',...(Array.isArray(raw.regions)?raw.regions:[]),...p.visited.map(id=>{const l=LOCATIONS.find(q=>q.id===id);return regionAt(l.x,l.z).id;})])].filter(id=>REGIONS.some(r=>r.id===id));p.grotto=raw.grotto?1:0;
  // Map fog (2026-11-13): the 10 m cells you have actually been in. Saves from before it start from the stable yard,
  // the Home Trail and every place you have already found.
  {let b=fogBits(raw.fog);if(typeof raw.fog!=='string'||!raw.fog){for(const id of ['stable','home',...p.visited]){const l=LOCATIONS.find(q=>q.id===id);if(l)fogMark(b,l.x,l.z);}}p.fog=fogString(b);}
  return p;}
// Fog bitset: 60×60 cells of 10 m over the nine regions (±300), base64 in the save (600 characters).
export const FOG_CELL=10,FOG_N=60,FOG_BYTES=FOG_N*FOG_N/8;
export function fogBits(s){const b=new Uint8Array(FOG_BYTES);if(typeof s==='string'&&s){try{const r=atob(s);for(let i=0;i<Math.min(r.length,FOG_BYTES);i++)b[i]=r.charCodeAt(i);}catch{}}return b;}
export function fogString(b){let r='';for(let i=0;i<b.length;i++)r+=String.fromCharCode(b[i]);return btoa(r);}
export function fogCell(x,z){const i=Math.floor((x+HALF)/FOG_CELL),j=Math.floor((z+HALF)/FOG_CELL);return i<0||j<0||i>=FOG_N||j>=FOG_N?-1:j*FOG_N+i;}
export const fogHas=(b,k)=>!!(b[k>>3]&(1<<(k&7)));
export function fogMark(b,x,z){const k=fogCell(x,z);if(k<0||fogHas(b,k))return false;b[k>>3]|=1<<(k&7);return true;}
export function fogMerge(a,b){const x=fogBits(a),y=fogBits(b);for(let i=0;i<x.length;i++)x[i]|=y[i];return fogString(x);}
export function questList(p){return [{id:'visit5',title:'Find your feet',detail:'Visit five places.',have:Math.min(5,p.visited.length),goal:5},{id:'allplaces',title:'Valley explorer',detail:`Discover all ${LOCATIONS.length} locations.`,have:p.visited.length,goal:LOCATIONS.length},...BARN_GAMES.map(g=>({id:'game-'+g.id,title:g.name,detail:g.description,have:Math.min(1,p.games[g.id]||0),goal:1})),{id:'barnall',title:'A happy barn',detail:'Complete all six barn games.',have:BARN_GAMES.filter(g=>p.games[g.id]>0).length,goal:6},...['apples','carrots','flowers'].map(k=>({id:k,title:'Gather '+k,detail:'Collect three '+k+' around the valley.',have:Math.min(3,p.supplies[k]),goal:3})),{id:'summit',title:'Above the clouds',detail:'Ride the spiral trail to Cloudstep Summit.',have:p.summit?1:0,goal:1},{id:'race',title:'A lap to remember',detail:'Finish a practice race lap.',have:p.bestLap?1:0,goal:1}];}
