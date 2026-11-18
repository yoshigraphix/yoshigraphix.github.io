// The nine regions (2026-11-11, Yoshi: "this world is very tiny.. tripple it so if this is 1 rectangle, then lets
// grow it to 9 total regions. and spread out activities"). Pure data + maths, no imports, so every module can use it.
//
//  · The world is a 3×3 grid of 200 m tiles: 600 × 600, centred on the stables. Past it the endless wild lands
//    begin (world-wild.mjs VALLEY = 300).
//  · The old valley was drawn in "design" coordinates (all of it inside ±100). Each place moved out to its region
//    as ONE BLOCK, with its people, props and quest spots, by a single offset: R(x,z) maps a design point to the
//    world. Points in no block stay where they were (the stables, the paddocks, the home trail, the vet, Hoofhaven).
//  · Order matters: the first block that contains a point wins.
//  · North is -z (Cloudstep is north, the coast south-west), the same as the map.
export const TILE=200,HALF=300;
export const REGIONS=[
  {id:'nw',name:'Snowy Pines',      cx:-200,cz:-200,biome:'snow'},
  {id:'n', name:'Cloudstep Highlands',cx:0,cz:-200,biome:'meadow'},
  {id:'ne',name:'Mosswood & Silver Falls',cx:200,cz:-200,biome:'forest'},
  {id:'w', name:'Lily Lake & Western Woods',cx:-200,cz:0,biome:'forest'},
  {id:'c', name:'Trottville',         cx:0,cz:0,biome:'valley'},
  {id:'e', name:'Clover Downs',       cx:200,cz:0,biome:'meadow'},
  {id:'sw',name:'Seaglass Coast',     cx:-200,cz:200,biome:'coast'},
  {id:'s', name:'Lavender & Bee Meadows',cx:0,cz:200,biome:'meadow'},
  {id:'se',name:'Harvest Farms',      cx:200,cz:200,biome:'farm'},
];
export function regionAt(x,z){const i=Math.max(-1,Math.min(1,Math.round(x/TILE))),j=Math.max(-1,Math.min(1,Math.round(z/TILE)));return REGIONS[(j+1)*3+(i+1)];}
export const inWorld=(x,z)=>Math.abs(x)<=HALF&&Math.abs(z)<=HALF;

// Design-space blocks → their offset into the world. rect: [x0,x1,z0,z1]; circle: [cx,cz,r].
const B=(id,shape,d)=>({id,...(shape.length===4?{rect:shape}:{circle:shape}),dx:d[0],dz:d[1]});
export const BLOCKS=[
  B('mill',     [-64,-47,-22,-4.5],[295,185]),   // Willow Windmill, Bart, Ingrid → Harvest Farms
  B('cloudstep',[-92,-96,90],     [92,-109]),   // the mountain, its trailhead, the Old Stone Arch, Sven, Edda → north
  B('forest',   [60,-35,16],       [125,-130]),  // Mosswood Grove, Ranger Elsie, Arlo → north-east
  B('falls',    [40,-65,14],       [175,-170]),  // Silver Ribbon Falls, Nils → north-east
  B('ridge',    [29,-21,8],        [-229,-29]),  // Sunset Ridge, Orla → west
  B('pond',     [25,-2,14.9],        [-225,10]),   // Lily Pond (now Lily Lake), Wendell, Lulu → west
  B('orchard',  [-12,27,-40,-16],  [172,186]),   // Apple Orchard, Appleoosa, Farmer Abe, Kiki → Harvest Farms
  B('race',     [40,72,18,54],     [140,-38]),   // Clover Racecourse, Dex, Granny Flo → Clover Downs
  B('jump',     [25,46,10],        [150,0]),     // Little Leap School, Coach Ramona, Ollie → Clover Downs
  B('corn',     [50,98,50,100],    [141,157]),   // the corn maze and Farmer Clem → Harvest Farms
  B('flowers',  [5,65,12],         [-5,135]),    // Lavender Fields, Petra, Barnaby → south
  B('picnic',   [-20,50,8],        [-25,140]),   // Buttercup Picnic, Auntie Vi, Benny → south
  B('coast',    [-100,-44,52,115], [-140,120]),  // Seaglass Shore, the lighthouse, the sea, Cora, Hal, Agnes → south-west
  B('village',  [-59,-35,21,43],   [108,-72]),   // Bramble Village → east side of Trottville (step 2 adds the square)
  B('market',   [-73,-59,21,43],   [144,-74]),   // Carrot Market → the north-east side of the village square
];
const inside=(b,x,z)=>b.rect?x>=b.rect[0]&&x<=b.rect[1]&&z>=b.rect[2]&&z<=b.rect[3]:Math.hypot(x-b.circle[0],z-b.circle[1])<=b.circle[2];
export function blockOf(x,z){for(const b of BLOCKS)if(inside(b,x,z))return b;return null;}
// Design point → world point.
export function R(x,z){const b=blockOf(x,z);return b?{x:x+b.dx,z:z+b.dz}:{x,z};}
export const Rx=(x,z)=>R(x,z).x,Rz=(x,z)=>R(x,z).z;
// Move {x,z} objects (returns a new object, other fields kept).
export const moveXZ=o=>({...o,...R(o.x,o.z)});
export const offsetOf=id=>{const b=BLOCKS.find(q=>q.id===id);return {x:b.dx,z:b.dz};};

// Sky lift meadow station (world coords, 2026-11-16, Yoshi: "from the top of the mountain to far south Lavender & Bee
// Meadows"): open, level grass in the south region, picked headless for a clear line (~420 m). Was (8,-48).
export const LIFT_STATION={x:-48,z:215};
// The village square's fountain (step 2, world-town.mjs): on the east spoke where it crosses Bramble Village.
export const SQUARE={x:60,z:-22};
