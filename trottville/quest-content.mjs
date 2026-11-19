// Trottville side quests: the people of the valley and the 200 favours they ask. Pure data (no DOM), built once
// from compact tables below. quests.mjs is the engine; quest-log.js draws the book and the talk dialog.
//  · 40 GIVERS stand round the valley (+4 on the roads just outside it). Each asks five numbered QUESTS, one a day.
//  · Quest numbers run in rounds: q001–q040 are everybody's first favour, q041–q080 their second, and so on,
//    so the 1–200 grid in the Quest Log fills evenly as you meet people.
//  · Spawn spots (things to pick up, lost kids, places to check) are worked out here, deterministically, and are
//    never on blocked ground (QUEST_SOLIDS = the world's obstacles as of 2026-11-09, see below).
import {LOCATIONS,SERVICES,POND} from './world-content.mjs?v=160';
import {R,offsetOf,HALF} from './world-regions.mjs?v=160';
import {OBSTACLES,blocked} from './world-logic.mjs?v=160';
import {PEN_FENCES} from './world-herding.mjs?v=160';
import {TOWN_SOLIDS,INDOOR_SPOTS,ACT_SOLIDS,CAMP} from './world-town.mjs?v=160';

// The corn maze (built separately, positions final 2026-11-09): centred at (74,78), corn covers x 55.5..92.5,
// z 59.5..96.5. Farmer Clem stands at CORN_GATE; the gate entrance is CORN_ENTRANCE; the sign post is at CORN_SIGN.
// Nothing else (givers, spawns) may sit in CORN_KEEP_OUT, and other givers stay 6 m clear of the sign post.
// (Numbers below are the design positions; the 'corn' block of world-regions.mjs moves them to Harvest Farms.)
const CO=offsetOf('corn'),cmv=o=>({...o,...(o.x!=null?{x:o.x+CO.x,z:o.z+CO.z}:{}),...(o.x0!=null?{x0:o.x0+CO.x,x1:o.x1+CO.x,z0:o.z0+CO.z,z1:o.z1+CO.z}:{})});
export const CORN_MAZE=cmv({x:74,z:78,x0:55.5,x1:92.5,z0:59.5,z1:96.5});
export const CORN_GATE=cmv({x:73.25,z:56.3});
export const CORN_ENTRANCE=cmv({x:76.25,z:57.5});
export const CORN_SIGN=cmv({x:79.45,z:57.9});
export const CORN_KEEP_OUT=cmv({x0:52,x1:96,z0:50,z1:100});

// Everything solid the 3D world adds at runtime (world-expansion.js huts/Hoofhaven/jump bars/sea, world-stations.js
// Hay's for Horses/Appleoosa rig/Grapevine pen/Games Gazebo, the Cloudstep pond), plus a few soft no-go zones
// (lighthouse tower, falls rocks, the corn maze footprint). Quest spots are kept off all of these.
const hut=(x,z,s=1)=>({kind:'box',...R(x,z),hx:2.5*s,hz:2*s,height:5*s});
const mv=o=>({...o,...R(o.x,o.z)});   // design → world for the literal entries below
export const QUEST_SOLIDS=[...OBSTACLES,
  hut(-55,-12,.9),...TOWN_SOLIDS,   // the village square's shops and fountain, and the walk-in vet (world-town.mjs)
  {kind:'box',x:SERVICES[1].x,z:SERVICES[1].z,hx:9.3,hz:6.3,height:10},
  ...[...[0,1,2].map(i=>({kind:'box',x:18+i*4,z:46+i*2,hx:1.6,hz:.2,height:.9})),
  {kind:'lake',x:-66,z:93,rx:31,rz:15,height:100},
  {kind:'box',x:-29,z:0,hx:1.6,hz:2.4,height:2.6},{kind:'box',x:-26.3,z:-2.6,hx:1.4,hz:1.2,height:2},
  {kind:'box',x:17,z:-32,hx:5.4,hz:1.7,height:3},{kind:'box',x:17,z:-35,hx:.8,hz:.8,height:1.2},{kind:'box',x:23.4,z:-32,hx:2.4,hz:1.4,height:2.4}].map(mv),
  ...PEN_FENCES,{kind:'box',x:-10,z:47,hx:1.3,hz:1.3,height:1.1},
  {kind:'lake',x:POND.x,z:POND.z,rx:POND.r+.4,rz:POND.r+.4,height:100},
  ...ACT_SOLIDS,   // step 3: cross-country fences, the treehouse camp, the beehive, the sleigh shed
  ...[{kind:'box',x:40.5,z:-67.5,hx:5,hz:3,height:9}].map(mv),
  {kind:'box',x:(CORN_KEEP_OUT.x0+CORN_KEEP_OUT.x1)/2,z:(CORN_KEEP_OUT.z0+CORN_KEEP_OUT.z1)/2,hx:(CORN_KEEP_OUT.x1-CORN_KEEP_OUT.x0)/2,hz:(CORN_KEEP_OUT.z1-CORN_KEEP_OUT.z0)/2,height:3},
  // Clover Racecourse track lines (45,25)-(68,25)-(68,50)-(45,50): keep spawns off the racing line.
  ...[{kind:'box',x:56.5,z:25,hx:12,hz:.9,height:.1},{kind:'box',x:56.5,z:50,hx:12,hz:.9,height:.1},
  {kind:'box',x:45,z:37.5,hx:.9,hz:13,height:.1},{kind:'box',x:68,z:37.5,hx:.9,hz:13,height:.1}].map(o=>({...o,x:o.x+offsetOf('race').x,z:o.z+offsetOf('race').z}))
];
export const WORLD_LIMIT=HALF-4;   // was 128 before the nine regions
export function spotOk(x,z,r=.8){return Math.abs(x)<=WORLD_LIMIT&&Math.abs(z)<=WORLD_LIMIT&&!blocked(x,z,r,0,QUEST_SOLIDS);}

// Small seeded helpers (no Math.random anywhere).
export function hashStr(s){let h=2166136261>>>0;for(const c of String(s)){h^=c.codePointAt(0);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
export function seeded(seed){let a=(typeof seed==='number'?seed:hashStr(seed))>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const round1=v=>Math.round(v*10)/10;
// A free spot about `dist` from (cx,cz): tries a ring of angles, then wider rings. dist 0 = the point itself if free.
export function spotNear(cx,cz,dist,seed){
  if(dist<=0&&spotOk(cx,cz))return {x:round1(cx),z:round1(cz)};
  const rnd=seeded(seed),a0=rnd()*Math.PI*2,d0=Math.max(2.5,dist);
  for(let ring=0;ring<8;ring++)for(let i=0;i<16;i++){
    const a=a0+i*Math.PI*2/16+ring*.37,d=d0*(1+ring*.22)*(.85+rnd()*.3),x=cx+Math.cos(a)*d,z=cz+Math.sin(a)*d;
    if(spotOk(x,z))return {x:round1(x),z:round1(z)};}
  throw new Error('No free spot near '+cx+','+cz);
}

// ---------- The people ----------
// [id, name, x, z, place, role, greetings, gone-home line]
const CAST=[
['tilly','Tilly',-3,6,'stable','Stable hand, twelve and very busy',["Hi! Mind the wheelbarrow, it has a wobbly wheel.","Every horse in this barn knows my pockets have treats."],"Tilly's mum called her in for supper. Back tomorrow!"],
['ned','Grandpa Ned',-24,24,'home','Retired farrier with a creaky gate and a big laugh',["Well, if it isn't my favourite rider!","Shod my first horse when I was fourteen, you know."],"Grandpa Ned has gone home for a nap in his armchair. Try tomorrow."],
['marigold','Marigold',16,19,'gate','A busy mum who is always one step behind her little boy',["Oh, hello! Have you seen a small boy with a big grin?","Never a dull moment with my Teddy."],"Marigold has taken Teddy home for his bath. See her tomorrow!"],
['wendell','Wendell',34,7,'pond','Pond fisher who throws every fish back',["Shh, the fish are listening.","Caught a fish this big once. Let it go, of course."],"Wendell has packed up his rod for the day. Back at dawn!"],
['lulu','Lulu',37,-1,'pond','Eight years old, writes a nature book about frogs',["Did you know frogs drink through their skin?","I'm a scientist. A frog scientist."],"Lulu went home to finish her frog drawings. Tomorrow!"],
['orla','Orla',32,-19,'ridge','Painter who paints the valley every single day',["The light up here! Isn't it marvellous?","Hold still, you'd make a lovely painting."],"Orla has carried her easel home for the night. Tomorrow!"],
['abe','Farmer Abe',7,-22,'orchard','Apple farmer with a hat full of leaves',["Howdy! Mind the windfalls.","An apple a day keeps the farrier away. Or something."],"Farmer Abe is home counting apples. Come back tomorrow."],
['kiki','Kiki',-1,-30,'orchard','Nine-year-old tree climber with grass-stained knees',["I can climb ANY tree. Well, most trees.","My birthday is coming up! Did you know?"],"Kiki's dad called her home. She'll be climbing again tomorrow!"],
['bart','Bart',-51,-9,'mill','The miller, dusted with flour from head to boots',["Mind the flour, it gets everywhere.","The sails are turning, so all's well."],"Bart has locked up the windmill for the night. Tomorrow!"],
['ingrid','Ingrid',-60,-5,'mill','Dairy farmer with three cows and one very naughty goat',["Morning! The cows say hello. Moo.","Have you met Turnip? Don't. She eats sleeves."],"Ingrid has gone to milk the cows. She'll be back tomorrow."],
['bea','Bea',-50,30,'village','The baker of Bramble Village, warm as her ovens',["Smell that? Cinnamon swirls!","Come in, come in, there's always a crumb to spare."],"Bea's ovens are cooling and she's gone home. Tomorrow, dear!"],
['percy','Percy',-41,32,'village','Postmaster who knows everybody\'s address by heart',["Post's in! Nothing for you... yet.","Rain or shine, the letters get through."],"The post office is shut for the day. Percy will see you tomorrow."],
['dottie','Mayor Dottie',-48,34,'village','Mayor of Bramble Village, owner of a very large hat',["Welcome, welcome! Lovely day in Bramble Village.","As mayor, I declare you excellent."],"Mayor Dottie is at a council supper. Come back tomorrow!"],
['rafi','Rafi',-37,26,'village','Kite-mad boy who checks the wind before breakfast',["Is it windy? It feels windy!","My kites have names. That one's Zoom."],"Rafi has gone home with his kites. Tomorrow!"],
['sunita','Sunita',-62,29,'market','Grocer at the Carrot Market with a laugh like a bell',["Fresh carrots! Crunchy carrots! Hello!","Your horse would like a carrot. I can tell."],"Sunita has closed her stall for today. Tomorrow!"],
['ferdinand','Ferdinand',-68,35,'market','Cheesemaker with opinions about every cheese',["Ah, a visitor! Try a little cheese?","The secret to good cheese is patience. And more cheese."],"Ferdinand has gone home to his cheese cellar. Tomorrow."],
['jo','Nurse Jo',-30,48,'vet','Vet nurse at Willowbrook Vet with pockets full of plasters',["Hello! Everyone healthy today?","A happy horse is a healthy horse."],"Nurse Jo's shift is over. She'll be back tomorrow."],
['vi','Auntie Vi',-17,54,'picnic','Everybody\'s auntie, never without a picnic basket',["Sit down, sweetheart, have a sandwich.","Picnics fix everything. That's my motto."],"Auntie Vi has packed her basket and gone home. Tomorrow!"],
['benny','Benny',-24,51,'picnic','Seven years old, best friends with a puppy called Sprocket',["This is Sprocket. He's a good boy. Mostly.","Sprocket can sit! Sometimes!"],"Benny and Sprocket went home for tea. Tomorrow!"],
['gideon','Gideon',-13,44,'picnic','Board-game fan who runs the Games Gazebo',["Fancy a game? I always win. Nearly always.","Every good day needs a good game."],"Gideon has packed away the games for tonight. Tomorrow!"],
['cora','Cora',-54,62,'beach','Shell collector who knows every rock pool',["Look! A spiral shell! Isn't it perfect?","The sea brings presents every morning."],"Cora has gone home with a pocket full of shells. Tomorrow!"],
['hal','Skipper Hal',-61,73,'beach','Old sailor with a hundred sea stories',["Ahoy, landlubber!","Did I ever tell you about the giant squid? No? Good."],"Skipper Hal has rowed home for the night. Tomorrow, matey."],
['agnes','Keeper Agnes',-68,62,'lighthouse','Lighthouse keeper who knows every ship by its sails',["Hello, dear. Lovely sea today.","Two hundred steps to the lamp. Keeps me young!"],"Keeper Agnes has climbed up to tend the lamp. Tomorrow, dear."],
['petra','Petra',9,62,'flowers','Florist who can name every flower in the valley',["Smell these! Go on!","Every flower has a meaning. That one means hello."],"Petra has gone home with an armful of flowers. Tomorrow!"],
['barnaby','Barnaby',1,69,'flowers','Beekeeper in a big floppy hat, very calm',["Bzz. Sorry, habit.","The bees are busy. So am I. Busy-ish."],"Barnaby has gone home to tuck in his bees. Tomorrow!"],
['ramona','Coach Ramona',25,42,'jump','Jump coach at Little Leap School, whistle always ready',["Heels down, chin up!","Small jumps, big hearts. That's our motto."],"Coach Ramona has locked the jump shed. Lessons tomorrow!"],
['ollie','Ollie',31,48,'jump','Eleven-year-old rider who is a bit scared of jumps',["Hi. Jumps are big, aren't they?","I'm practising being brave."],"Ollie has gone home. He'll be practising again tomorrow!"],
['dex','Dex',42,22,'race','Race announcer with the loudest voice in the valley',["AND HERE COMES A RIDER! Oh, hello.","Ready, steady... chat!"],"Dex has lost his voice for today. Back tomorrow!"],
['flo','Granny Flo',50,20,'race','Knits in the racecourse stands and cheers every horse',["Ooh, a visitor! Sit with me, dear.","Knit one, purl one, cheer one!"],"Granny Flo has gone home to put her feet up. Tomorrow, dear."],
['hank','Hank',10,43,'hoofhaven','Stable keeper at Hoofhaven Horse Market',["Howdy. Every horse here needs a good home.","Hay, water, kindness. That's the job."],"Hank has bedded down the market horses. Tomorrow!"],
['elsie','Ranger Elsie',57,-31,'forest','Mosswood Grove ranger who talks to owls',["Shh, there's a woodpecker nearby.","Leave only hoofprints, take only memories."],"Ranger Elsie is on her evening patrol. Tomorrow!"],
['arlo','Arlo',64,-39,'forest','Ten-year-old scout working on every badge at once',["Scouts are always prepared! Mostly.","I've got eleven badges. Want to see?"],"Arlo has gone back to scout camp. Tomorrow!"],
['nils','Nils',46,-60,'falls','Photographer chasing the perfect waterfall picture',["Say cheese! Or hay!","The falls look different every minute."],"Nils has gone home to look at today's photos. Tomorrow!"],
['sven','Sven',-42,-42,'mountain','Cloudstep mountain guide with very strong legs',["Hello! Ready to climb?","The mountain is big, but you are brave."],"Sven has gone up the mountain for the night. Tomorrow!"],
['edda','Professor Edda',-80,-12,'ruins','Historian studying the Old Stone Arch',["Fascinating! Oh, hello.","These stones are older than anyone knows."],"Professor Edda has gone home to read. Tomorrow!"],
['clem','Farmer Clem',CORN_GATE.x,CORN_GATE.z,'race','Corn farmer at the maze gate; something always ends up lost in his corn',["Howdy! Mind the corn, it's taller than me.","Folks get lost in there. Foals too."],"Farmer Clem has shut the maze gate for today. Tomorrow!"],
['rufus','Rufus',-14.2,-115,'orchard','Travelling tinker who fixes anything with a clank',["Pots mended! Kettles tuned! Hello!","Every broken thing has a song inside it."],"Rufus has rattled off in his cart. Tomorrow!"],
['delphine','Delphine',21.2,115,'flowers','Wandering fiddler who plays for whoever passes',["Want a tune? I know a hundred.","Every road needs a song."],"Delphine has packed her fiddle for the night. Tomorrow!"],
['tobias','Tobias',115,12,'race','Shepherd with a very large flock on the east road',["Mind the sheep, they don't mind you.","Baa. That means hello, in sheep."],"Tobias has taken the flock home. Tomorrow!"],
['wilma','Wilma',-115,-3.7,'ruins','Woodcutter of the western woods, gentle as a deer',["Hello there! Watch for falling leaves.","I only cut the trees that are ready."],"Wilma has gone home to her cabin. Tomorrow!"]
];
// Each giver moves with their place's block (world-regions.mjs). The four travellers stand by the new ring road and its exits.
const ROAD_SPOT={rufus:{x:110,z:-119},delphine:{x:40,z:139},tobias:{x:232,z:6},wilma:{x:-232,z:-6}};
// Shopkeepers stand behind their counters indoors (world-town.mjs); Rafi flies his kites on the open square.
// "One person per angle" (tests/town-check.mjs): where two people shared a place, one stands a little way off, so
// from any road no 30° slice of the view holds two people within 40 m (worked out by search, 2026-11-11).
const SPREAD={ned:{x:-28.2,z:19.8},marigold:{x:24.3,z:24.6},lulu:{x:-188,z:-5},kiki:{x:180.9,z:146.1},cora:{x:-194,z:188},hal:{x:-222.6,z:197.3},barnaby:{x:-12,z:204},ollie:{x:178.3,z:61.7},flo:{x:206,z:-18},hank:{x:18.5,z:51.5},arlo:{x:CAMP.x-6,z:CAMP.z-5}};
const OWN_SPOT={...INDOOR_SPOTS,...SPREAD,rafi:{x:69,z:-12},wendell:{x:-200,z:12}/* v151: on the Lily Lake bank so his rod reaches the water */};
export const GIVERS=CAST.map(([id,name,x,z,place,role,greeting,goneHome])=>({id,name,...(ROAD_SPOT[id]||OWN_SPOT[id]||R(x,z)),indoor:!!INDOOR_SPOTS[id],place,role,greeting,goneHome,seed:'giver-'+id}));
export const GIVER_BY_ID=Object.fromEntries(GIVERS.map(g=>[g.id,g]));

// ---------- Hint people (note #41, 2026-11-14) ----------
// Half the people no longer hand out quests: they chat and drop CLUES (never the whole answer), one line per visit.
// They still receive deliveries from other people's quests. Their old quests are retired (kept for saved progress).
// Clue threads: 🥕 a golden vegetable + the person at the top of the biggest tree in Mosswood Grove; 🏴‍☠️ treasure in
// the Smugglers' Grotto inside Cloudstep, through the stone arch on the far side; 🌄 far-off places worth the ride.
export const HINTS={
  orla:["I painted the tallest tree in Mosswood Grove. There’s a lantern right at the top that never goes out.","Some of the best views are on the FAR side of the map. Pack a sandwich!","I once painted a GOLDEN carrot from a dream. Or was it a dream?"],
  kiki:["I climbed to the second platform in Mosswood Grove! The very top is someone's house. They wouldn't let me in without a reason.","There's a tree in Mosswood so tall the clouds bump into it.","Who lives at the top of the biggest tree? Somebody very old and very clever. That's all I know!"],
  bart:["A traveller paid me for flour with a seed that shone like gold. Said it came from the far side of the land.","The best things grow slow. Flour, friendships, and certain carrots.","My gran grew something golden once. She fenced it so tight not even a mouse got in."],
  rafi:["From up on my kite hill I can see a stone arch on the far side of Cloudstep. Nobody ever goes there!","The wind always blows toward the mountain. Kites know things.","Have you ever ridden right round Cloudstep? The back side is wild."],
  ferdinand:["The secret to the best cheese is patience. The secret to the best CARROT is also patience. And a good fence.","Rabbits! Deer! Everybody loves a young sprout. Guard yours.","A traveller once paid me in golden seeds. I planted them. A goat ate them. Lesson learned."],
  benny:["Sprocket dug up an old coin by the mountain! Sven says smugglers lived inside Cloudstep long ago.","Sprocket sniffs toward the mountain every day. I think he smells treasure.","Treasure is always in a cave. Everybody knows that."],
  gideon:["A good game has clues. So does a good valley. Talk to everyone!","I once heard: 'Climb the tall tree, ask the wise one.' Sounds like a riddle to me.","Some prizes take a whole week to win. Those are the best ones."],
  cora:["The sea brought me a bottle with a map in it. It showed a mountain with a hole in its back.","Shells aren't the only treasure on this coast… but they're the prettiest.","Keeper Agnes says ships used to sail to the mountain's back door at night. Smugglers!"],
  barnaby:["My bees go wild for one flower in the far meadows. Golden pollen. Very rare.","Plant something precious? Fence it, water it, sing to it. Bees agree.","Far fields have the richest soil. Funny, that."],
  ollie:["I'm scared of heights, so I've never climbed the ladders in Mosswood Grove. Somebody braver should!","They say the top of the big tree has a lantern that never goes out.","Being brave means trying the tall ladder. Maybe tomorrow."],
  flo:["When I was a girl, someone tamed a WINGED horse. Nobody believed her. I did.","Wings at midnight, my mother used to say. Look up, dear, always look up.","A winged horse won't come for an ordinary treat. It has to be something golden."],
  arlo:["My Explorer badge says: 'Visit the far edges.' Nobody else in camp has it yet!","Up in the Mosswood treetops the scouts say there's a wise keeper who gives out real quests.","Did you know there's a stone arch behind Cloudstep? I'm saving it for my Cave badge."],
  nils:["I took a photo of the falls at night and something with WINGS was in the corner. Blurry, but still!","The best pictures are far away, where nobody goes.","There's a cave mouth behind the mountain. My flash went off inside and I saw something sparkle."],
  edda:["The Old Stone Arch isn't the only arch. There's another on the FAR side of Cloudstep, where the smugglers came and went.","Smugglers hid their treasure inside the mountain, according to my old books. Nobody has looked in a hundred years.","History lesson: the old keepers of Mosswood kept a seed that only grows for the patient."],
  tobias:["My flock won't graze near the big trees in Mosswood. Something up there keeps watch.","Go past the last fence and keep going. That's where the good stuff is.","A golden sprout? Keep my sheep away from it, then. They eat anything."],
  wilma:["I never cut the giants in Mosswood Grove. People live up there, you know.","The western woods hide many things. The far side of the map hides more.","If you ever plant something precious, build a fence first. The deer here are clever."],
  percy:["Letters to the top of the big tree in Mosswood? I deliver those by ladder. Very important person up there.","I've a letter addressed only to 'The One Who Finds the Golden Root.' Still waiting to deliver it.","Rain or shine, the post gets through. Even up a tree."],
  agnes:["From the lamp I can see ALL the way to the back of Cloudstep. There's a dark doorway in the rock.","At midnight the light from the lamp catches something white in the sky. Wings, I'd swear.","The far coast is lonely, but worth the ride."],
  vi:["Sweetheart, the best carrot I ever saw was GOLD. A wise somebody up a big tree grew it.","Patience, dear. Picnics, carrots and winged horses all need patience.","Ride far, then ride farther. Take a sandwich."],
  hank:["Every horse here needs a home. Even the ones with wings… if you can catch one.","A winged horse? You'd need something golden, and a lot of luck.","Some folk say the wise one in the Mosswood treetops knows how to grow the golden treat."]
};
export const isHinter=id=>!!HINTS[id];

const LOC=Object.fromEntries(LOCATIONS.map(l=>[l.id,l]));
const SERV=Object.fromEntries(SERVICES.map(s=>[s.id,s]));
// Where an `at` points: a location id, a service id, a giver id, 'gazebo', 'tadpoles' or {x,z}.
const EXTRA={gazebo:{x:-10,z:47,name:'the Games Gazebo'},tadpoles:{x:POND.x,z:POND.z,name:'the little pond below Cloudstep'},corner:{x:65,z:46,name:'the far corner of the racecourse'}};
export function placeOf(at){
  if(at&&typeof at==='object')return {x:at.x,z:at.z,name:at.name||'that spot'};
  if(LOC[at])return {x:LOC[at].x,z:LOC[at].z,name:LOC[at].name};
  if(SERV[at])return {x:SERV[at].x,z:SERV[at].z,name:SERV[at].name};
  if(GIVER_BY_ID[at])return {x:GIVER_BY_ID[at].x,z:GIVER_BY_ID[at].z,name:GIVER_BY_ID[at].name};
  if(EXTRA[at])return EXTRA[at];
  throw new Error('Unknown place '+at);
}

// ---------- The favours ----------
// Compact entries per giver (5 each, in the order that giver asks them). Keys:
//  k kind · t title · a ask · y thanks (for deliveries: what the person receiving it says)
//  deliver: item [name, icon], to giver id, fragile
//  fetch:   at, n, item, r (spread radius)        find: at, item, hint, d (distance from `at`)
//  escort:  at, who [name, kind], f (what they say when found), d
//  visit:   at, s (what you see there), d          courier: at, m (minutes)
//  maze:    foal, lost [name, kind] (what the foal is with)                                   all: key (chain name), pre (chain name), m (minutes), mounted
const D=(t,item,to,a,y,o={})=>({k:'deliver',t,item,to,a,y,...o});
const F=(t,at,n,item,a,y,o={})=>({k:'fetch',t,at,n,item,a,y,...o});
const L=(t,at,item,hint,a,y,o={})=>({k:'find',t,at,item,hint,a,y,...o});
const E=(t,at,who,f,a,y,o={})=>({k:'escort',t,at,who,f,a,y,...o});
const V=(t,at,s,a,y,o={})=>({k:'visit',t,at,s,a,y,...o});
const C=(t,at,m,a,y,o={})=>({k:'courier',t,at,m,a,y,...o});
const M=(t,foal,lost,a,y,o={})=>({k:'maze',t,foal,lost,a,y,mounted:true,...o});

const BOOK={
tilly:[
  F('Horseshoe Hunt','home',4,['Lost horseshoe','🧲'],"Four horseshoes popped off this week and I can't find a single one! Could you look along the Home Trail?","All four! Grandpa Ned will be so pleased. Here, for your trouble."),
  D('Saddle Soap Run',['Saddle soap','🧼'],'hank',"Hank at Hoofhaven ran out of saddle soap. Can you take him this tin?","Saddle soap! Now these old saddles will shine. Thanks, friend."),
  E('Socks the Kitten','orchard',['Socks','kitten'],"Mew! Mew mew!","Socks wandered off after a butterfly. She was last seen near the Apple Orchard!","Socks! You little explorer. Back to the hay loft with you."),
  C('Catch the Hay Wagon','bart',4,"Bart is sending out the hay wagon and he forgot our order! Hurry to the Willow Windmill and catch him!","You made it! Bart promises Tilly's hay will be on the wagon."),
  V('A Shoe at the Races','race',"It's a racer from out of town, not one of the barn horses. Phew!","Dex says a horse at Clover Racecourse lost a shoe. Can you ride over and see if it's one of ours?","Not ours? Good. Thanks for checking!")
],
ned:[
  L("Grandpa's Spectacles",'home',['Spectacles','👓'],"I sat on a log by the Home Trail to watch the swallows.","I've lost my spectacles again! I had them when I sat down by the Home Trail.","Ah, now I can see you! You've got kind eyes, you know."),
  D('Too Much Rhubarb',['Rhubarb bundle','🥬'],'bea',"My garden grew far too much rhubarb. Bea the baker will know what to do with it.","Rhubarb from Ned! That's a crumble by teatime."),
  V('The Old Arch Bell','ruins',"A little rusty bell still hangs from the arch. Ding!","When I was a boy there was a bell at the Old Stone Arch. Ride out and tell me if it's still there.","Still there after all these years. Well, I never!"),
  F('Kindling for the Stove','picnic',5,['Dry twig','🌿'],"My stove needs kindling. There are dry twigs under the trees by Buttercup Picnic.","Lovely and dry. My toes will be toasty tonight."),
  C('Book the Fiddler','delphine',5,"Delphine the fiddler is playing out on the south road. Catch her before she moves on and ask her to play at the village dance!","Delphine grins: 'Tell Ned I'll be there!'",{mounted:true})
],
marigold:[
  E("Where's Teddy?",'flowers',['Teddy','kid'],"I got lost! Do you know where my mummy is?","My little boy Teddy was right here a minute ago! He loves the lavender. Please help me find him!","Teddy! Oh, come here. Thank you, thank you, thank you!",{d:9}),
  D('The Forgotten Lunchbox',['Lunchbox','🍱'],'ollie',"My nephew Ollie forgot his lunch again. He's at Little Leap School.","My lunch! I was too hungry to jump. Thanks!"),
  F("Teddy's Marbles",'gate',5,['Marble','🔵'],"Teddy spilled his marbles all over the Meadow Gate. Could you gather five before they roll away?","Every last one. Teddy, say thank you! ...He says thank you."),
  L('The Red Mitten','pond',['Red mitten','🧤'],"Teddy was splashing at the edge of Lily Lake.","Teddy dropped one of his red mittens on the way to Lily Lake. Can you spot it?","Found it! Now his hands won't get chilly."),
  V('Pony Rides?','hank',"Hank says the little ponies are out and ready for riders.","Teddy wants a pony ride. Can you ask Hank at Hoofhaven if the ponies are out today?","Hooray! Teddy, put your boots on!")
],
wendell:[
  L('The Lucky Lure','pond',['Lucky lure','🪝'],"It flew off when I cast too hard, somewhere round the far bank.","My lucky lure is gone! I can't catch a thing without it.","That's the one! The fish had better watch out now.",{d:12}),
  D('A Trout for the Skipper',['Fresh trout','🐟'],'hal',"Skipper Hal swapped me a story for a fish. Can you take him this trout?","A trout from Wendell! He tells good fish tales, but mine are better."),
  F('Worms After Rain','gate',4,['Wiggly worm','🪱'],"The rain brought the worms up near the Meadow Gate. Four would be plenty!","Wriggly and ready. Thank you kindly."),
  V('Duckling Count','pond',"Seven fluffy ducklings! No, eight. Definitely eight.","The ducklings have hatched! Ride round the pond and count them for me.","Eight! What a big family."),
  E('Puddle the Duckling','race',['Puddle','duckling'],"Peep! Peep peep!","One duckling waddled off all the way to Clover Racecourse! Her name is Puddle.","Back to Mum you go, little Puddle.")
],
lulu:[
  F('Frog Spotting','pond',5,['Frog','🐸'],"I'm counting frogs for my nature book. Can you find five hiding around Lily Lake?","Five frogs! I'm drawing every single one."),
  E('Little Brother Mack','race',['Mack','kid'],"I saw a horse with a rainbow saddle!","My little brother Mack wanted to see the racehorses and now he's gone! Mum will be cross with ME.","Mack! You're holding my hand all the way home."),
  D('A Frog for Granny Flo',['Frog drawing','🖼️'],'flo',"I drew a frog for Granny Flo. Will you take it to her at the racecourse?","What a handsome frog! It's going right on my fridge."),
  L('My Blue Ribbon','ridge',['Blue hair ribbon','🎀'],"The wind blew it off up on Sunset Ridge.","The wind stole my blue hair ribbon on Sunset Ridge. Can you find it?","My ribbon! Now I look like a proper scientist."),
  V('Tadpole Check','tadpoles',"Wriggly tadpoles everywhere! Some have tiny legs.","Are there tadpoles in the little pond below Cloudstep? I need to know for my book!","Tiny legs! They're turning into frogs!",{d:8})
],
orla:[
  F('Purple Paint','flowers',5,['Lavender sprig','💜'],"I need lavender to mix the perfect purple. Five sprigs from Lavender Fields, please!","Smell that! This purple will be glorious."),
  D('A Painting for the Mayor',['Painting','🖼️'],'dottie',"My painting of the valley is finished! Mayor Dottie wants it for the town hall. Don't drop it!","Magnificent! It goes right above my desk.",{fragile:true}),
  L('My Favourite Brush','ridge',['Paintbrush','🖌️'],"The wind whisked it off my easel toward the grass.","My favourite brush blew away! I can't paint a single cloud without it.","Hello, old friend. Let's paint."),
  V('A Rainbow at the Falls?','falls',"A rainbow shimmers in the mist!","Is there a rainbow at Silver Ribbon Falls right now? If there is, I'm painting it!","A rainbow! Fetch my biggest canvas!"),
  C('Hold the Red Flag','lighthouse',5,"The sunset over Rosewater Lighthouse only lasts minutes! Ride there and wave so I can mark the spot.","Far away, Orla waves her brush. Perfect!",{mounted:true})
],
abe:[
  F('Windfall Apples','orchard',6,['Apple','🍎'],"The wind knocked apples off the trees last night. Could you pick up six before the deer do?","Six fine apples. One for you, one for your horse!"),
  D('Apple Juice for the Market',['Apple juice','🧃'],'sunita',"Sunita sells my apple juice at the Carrot Market, and she's nearly out!","Abe's juice! The kids will be lining up."),
  E('Truffle the Piglet','ridge',['Truffle','piglet'],"Oink! Oink oink!","Truffle the piglet squeezed under the fence again. Last I saw, he was trotting toward Sunset Ridge.","There's my little rascal. Into the pen, Truffle!"),
  V('Scarecrow Check','mill',"The scarecrow is upside down! But the crows still look scared.","Crows are bothering the far field by Willow Windmill. Is my old scarecrow still standing?","Upside down? Ha! Still doing his job."),
  C('Storm Coming!','bart',3,"A storm is rolling in! Tell Bart at the windmill to close his shutters, quick!","Bart slams the shutters just as the wind picks up. You did it!",{mounted:true})
],
kiki:[
  L('My Yo-yo','orchard',['Yo-yo','🪀'],"I was swinging from a branch and it flew!","My yo-yo flew out of my hand when I was upside down in a tree.","Walk the dog! Round the world! Thanks!"),
  F('Acorn Family','forest',5,['Acorn','🌰'],"I'm making a tiny acorn family. Can you gather five acorns in Mosswood Grove?","Mum, Dad, Grandma, baby and... a dog acorn!"),
  D('Party Invitation',['Party invitation','💌'],'benny',"It's my birthday soon! Can you give this invitation to Benny at the picnic?","A party! Can Sprocket come too? Yay!"),
  V('Treehouse Flag','ridge',"Yes! A little green flag flutters over the orchard.","Is my treehouse flag still flying? You can see it from the top of Sunset Ridge.","Still flying! My treehouse is the best."),
  E('Hiccup the Hedgehog','picnic',['Hiccup','hedgehog'],"Hic! Snuffle snuffle.","My pet hedgehog Hiccup rode to Buttercup Picnic in my backpack and hopped out!","Hiccup! No more backpack rides for you.")
],
bart:[
  F('Runaway Grain Sacks','mill',5,['Grain sack','🌾'],"A cart bumped my sacks and they rolled everywhere! Help me gather five?","All five, safe and sound. You're stronger than you look!"),
  D('Flour for Bea',['Bag of flour','🍞'],'bea',"Bea's ovens are hungry. Take her this bag of fresh flour?","Flour from Bart's mill, the softest in the valley!"),
  V('Wind Check','ridge',"Your hair whips in the breeze. Very windy up here!","Is the wind blowing on Sunset Ridge? If it is, the sails will turn by supper.","Windy! The mill will be busy tonight."),
  L('The Mill Key','orchard',['Mill key','🗝️'],"I had it when I stopped to buy apples from Abe.","I've lost the key to the mill! I had it at the Apple Orchard.","My key! I thought I'd be sleeping outside."),
  C('Catch the Post','percy',3,"The post goes out in a few minutes and my letter isn't in the bag! Race to Percy in the village!","Percy tucks Bart's letter in just in time.",{mounted:true})
],
ingrid:[
  D('Milk for the Birthday Cake',['Jug of milk','🥛'],'bea',"Bea needs this milk to bake Kiki's birthday cake! If it doesn't reach her today, there's no cake. Ride gently!","The milk! Now I can start the birthday cake. Phew!",{key:'milk',fragile:true}),
  E('Turnip the Goat','ruins',['Turnip','goat'],"Maaa! Maaaa!","Turnip has wandered off to nibble the ivy at the Old Stone Arch. Again!","Turnip, you rascal. Thank you for bringing her home."),
  F('Clover for the Cows','home',5,['Clover bunch','☘️'],"My cows are wild about the clover along the Home Trail. Pick five bunches?","Moo! That's cow for thank you."),
  D('Fresh Curds',['Fresh curds','🧀'],'ferdinand',"These curds are for Ferdinand. He's making his famous cheese!","Ingrid's curds! These will make a wonderful wheel."),
  L("Bessie's Cowbell",'mill',['Cowbell','🔔'],"It's somewhere in the long grass round the windmill.","Old Bessie lost her cowbell. It went clang... and then it didn't.","Clang! There's the sound I love.",{d:14})
],
bea:[
  F('Wild Strawberries','picnic',5,['Wild strawberry','🍓'],"Strawberry tarts today! The best wild strawberries grow near Buttercup Picnic.","Sweet as sugar. Tarts for everyone!"),
  F('Eggs for the Cake','mill',4,['Egg','🥚'],"The milk came! Now I need eggs. The hens round the windmill lay them in the funniest places.","Four perfect eggs. The batter is ready!",{key:'eggs',pre:'milk'}),
  D("Kiki's Birthday Cake",['Birthday cake','🎂'],'vi',"The cake is baked and the candles are on! Take it to Auntie Vi at the picnic. Carefully!","Oh, it's beautiful! Not one candle wobbled.",{key:'cake',pre:'candles',fragile:true}),
  C('Hot Buns!','dex',3,"Dex wants hot buns for the race crowd. They're only hot for a few minutes, so go, go, go!","Dex takes a big bite. 'Still warm! You're a champion!'",{mounted:true}),
  V('Cinnamon Check','market',"Sunita holds up a big jar of cinnamon. Yes!","Did Sunita get more cinnamon at the Carrot Market? I can't bake my swirls without it.","Cinnamon swirls are back on the menu!")
],
percy:[
  D('A Letter for the Keeper',['Letter','✉️'],'agnes',"A letter for Keeper Agnes at the lighthouse. It smells of the sea already!","A letter from my sister! Thank you, dear."),
  C('Express Parcel','tobias',5,"Express parcel news for Tobias the shepherd out on the east road! Five minutes, and it's a long ride.","Tobias tips his hat. 'Right on time!'",{mounted:true}),
  E('Stamps the Cat','market',['Stamps','kitten'],"Mrrow? Purrrr.","My post-office cat, Stamps, went to the Carrot Market and didn't come back.","Stamps! Sorting letters isn't the same without you."),
  F('Scattered Post','village',5,['Postcard','📮'],"A gust blew the postcards out of my bag! There are five scattered round the village.","Every card found. The post must go through!"),
  D('Parcel for the Ranger',['Parcel','📦'],'elsie',"This parcel is for Ranger Elsie in Mosswood Grove. It says 'binoculars' on it!","My new binoculars! Now I'll spot every owl.")
],
dottie:[
  V('The New Jump Fence','jump',"A shiny new fence with a big red bow on it.","Is Coach Ramona's new jump fence finished at Little Leap School? I'm meant to cut the ribbon!","Splendid! Fetch my giant scissors!"),
  E('My Grandson Wally','beach',['Wally','kid'],"I found three crabs! Is it lunch?","My grandson Wally went looking for crabs at Seaglass Shore. It's nearly lunch!","Wally! Sandy toes and all. Thank you!"),
  D('Games Night Notice',['Town notice','📜'],'gideon',"Please give this notice to Gideon at the Games Gazebo: Games Night is on Saturday!","Games Night! I'll polish the checkers."),
  F('Runaway Bunting','race',6,['Bunting flag','🚩'],"The wind blew away my bunting flags! They landed all round Clover Racecourse.","The fair will be the prettiest yet!"),
  C('Tell the Coach','ramona',4,"Coach Ramona is about to start the jump show and needs to know I'm coming! Hurry to Little Leap School!","Ramona blows her whistle: 'We'll wait for the Mayor!'")
],
rafi:[
  L('Kite on the Loose','flowers',['Kite','🪁'],"The string snapped and it flew toward Lavender Fields!","My kite Zoom broke free! It came down somewhere near Lavender Fields.","Zoom! You're home! I'll tie a double knot."),
  F('New Kite Tail','gate',4,['Ribbon','🎀'],"I'm making a new kite tail. The fair left loads of ribbons near the Meadow Gate. Four, please!","The longest kite tail in the valley!"),
  V('Kite Weather?','beach',"The sea breeze is strong. Perfect kite weather!","Is it windy at Seaglass Shore? That's the best kite beach in the world!","Perfect! I'm going tomorrow!"),
  D('A Kite for Arlo',['Little kite','🪁'],'arlo',"I made a spare kite for Arlo the scout. Will you take it to him in Mosswood Grove?","A kite! Scouts need kites. For... signalling!"),
  C('Race the Kite','ridge',3,"My kite is racing you to Sunset Ridge! Can you beat it there?","You beat the kite! Rafi cheers from far below.",{mounted:true})
],
sunita:[
  F('Rabbit Trouble','home',6,['Carrot','🥕'],"Rabbits dug up my carrot patch near the Home Trail! Can you save six carrots?","Six crunchy carrots. Take one for your horse!"),
  D('Nine Birthday Candles',['Box of candles','🕯️'],'bea',"Bea needs candles for Kiki's cake, nine of them! Rush them over, would you?","Nine candles! The cake is almost ready.",{key:'candles',pre:'eggs'}),
  D('Oil for the Lamp',['Lamp oil','🛢️'],'agnes',"Keeper Agnes needs oil for the lighthouse lamp. The boats count on it!","Oil! The lamp will shine bright tonight.",{pre:'polish',fragile:true}),
  E('Radish the Bunny','picnic',['Radish','bunny'],"Twitch, twitch. Hop!","Radish, my shop bunny, hopped all the way to Buttercup Picnic!","Radish! You're on carrot-guard duty, not picnic duty."),
  V('The Giant Pumpkin','flowers',"It's as big as a pony! Wow.","Barnaby says there's a giant pumpkin growing by Lavender Fields. Is it real?","As big as a pony? I need to see it!")
],
ferdinand:[
  D('Cheese for the Picnic',['Cheese wheel','🧀'],'vi',"Auntie Vi ordered my best cheese for the picnic. It's heavy, so hold on tight!","Ferdinand's cheese! Everyone will want a nibble."),
  L('The Cheese Slicer','market',['Cheese slicer','🍴'],"I was waving it about while telling a story... and it flew.","I've lost my cheese slicer! A cheesemaker without a slicer is just a man with cheese.","Ah! Now I'm a cheesemaker again."),
  F('Mushroom Hunt','forest',5,['Mushroom','🍄'],"Mushroom and cheese pie! I need five mushrooms from Mosswood Grove. The brown ones, not the spotty ones.","Perfect mushrooms. Pie for supper!"),
  V('The Cheese Cellar','ruins',"The cellar door is shut tight, and it smells VERY cheesy.","My cheeses rest in a cool cellar by the Old Stone Arch. Is the door still shut?","Shut tight! My cheeses are safe."),
  C('Toastie Express','flo',4,"Granny Flo's cheese toastie is getting cold! Race it to her at the racecourse!","Granny Flo munches happily. 'Still melty!'",{mounted:true})
],
jo:[
  F('Calming Mint','home',5,['Mint leaf','🌿'],"Mint tea calms nervous horses. Can you pick five mint leaves near the Home Trail?","Fresh mint! The horses will be calm as clouds."),
  D('Medicine for a Pony',['Medicine','💊'],'hank',"One of Hank's ponies has a tummy ache. This medicine will help, so please hurry!","That's just what the little pony needs. Thank you!",{m:8}),
  E('Scrabble the Puppy','gate',['Scrabble','puppy'],"Woof! Wag wag wag!","A puppy patient called Scrabble slipped his lead and ran toward the Meadow Gate!","Scrabble! Let's get that paw bandaged properly."),
  L('The Stethoscope','race',['Stethoscope','🩺'],"I listened to a racehorse's heart at Clover Racecourse.","I left my stethoscope at the racecourse! I can't hear a single heartbeat without it.","Ba-dum, ba-dum. Perfect!"),
  V('Wild Pony Check','falls',"A shaggy pony munching grass. Bright eyes, shiny coat. Healthy!","Someone saw a wild pony near Silver Ribbon Falls. Can you check that it looks healthy?","Healthy! That's the best news.")
],
vi:[
  F('Buttercups for the Table','picnic',5,['Buttercup','🌼'],"A picnic needs buttercups on the table! Pick me five, sweetheart.","Lovely! The table looks like sunshine."),
  D('Lemonade for Dex',['Lemonade','🍋'],'dex',"Dex is shouting himself hoarse at the racecourse. Take him this lemonade?","Ahh! My voice is back! AND THE CROWD GOES WILD!"),
  V("Kiki's Party",'kiki',"Kiki squeals and runs for the picnic!","The cake is here and the balloons are up! Ride to the orchard and tell Kiki her party is ready!","Here she comes! Happy birthday, Kiki!",{key:'party',pre:'cake',bonus:30}),
  L("Grandma's Brooch",'picnic',['Brooch','💎'],"It must have slipped off when I shook out the blanket.","My grandma's brooch is missing! It must be in the grass somewhere.","Oh, thank goodness. It's my lucky brooch.",{d:12}),
  C('Rain Warning','petra',3,"Rain clouds! Warn Petra at Lavender Fields to bring in her flower buckets!","Petra rushes the buckets inside. Just in time!",{mounted:true})
],
benny:[
  E('Sprocket Ran Off','home',['Sprocket','puppy'],"Woof woof! Lick!","My puppy Sprocket chased a squirrel and now he's lost! He likes the Home Trail.","SPROCKET! Good boy! Best boy!"),
  F('Hidden Balls','gazebo',5,['Ball','🎾'],"Sprocket hid all his balls! I think there are five round the Games Gazebo.","All five! Sprocket, where do you even FIND these?"),
  L("Sprocket's Collar",'vet',['Collar','🏷️'],"It came off when he wiggled outside the vet's.","Sprocket's collar came off at Willowbrook Vet. Can you find it?","Now everyone knows his name is Sprocket!"),
  D('A Card for Nurse Jo',['Thank-you card','💌'],'jo',"I made a card for Nurse Jo for fixing Sprocket's paw.","Aww, a drawing of Sprocket! This is going on my wall."),
  V('Dog Show?','race',"No dog show today, but a poster says next week!","Is there a dog show at the racecourse? Sprocket wants to win a rosette!","Next week! We'll practise sitting.")
],
gideon:[
  L('The Missing King','picnic',['Chess king','♟️'],"A crow flew off with it toward the picnic.","A crow stole my chess king! Can't play chess without a king.","Long live the king! Fancy a game?"),
  F('Dice Everywhere','village',5,['Die','🎲'],"Rafi borrowed my dice and dropped them all over Bramble Village. Five, please!","All five! Let's roll."),
  D('A Riddle for the Professor',['Riddle scroll','📜'],'edda',"I've written a riddle for Professor Edda. Only she can solve it!","Hmm... the answer is 'a horseshoe'! Tell Gideon I won."),
  V('Count the Stones','falls',"You count nine stepping stones across the pool.","Settle a bet! How many stepping stones cross the pool at Silver Ribbon Falls?","Nine! I win the bet. Ha!"),
  C('Chess by Post','ferdinand',4,"Ferdinand challenged me to chess. My move must reach him at the Carrot Market in four minutes!","Ferdinand gasps. 'Checkmate? Already?'")
],
cora:[
  F('Seashells','beach',6,['Seashell','🐚'],"The tide left shells all over Seaglass Shore. Can you collect six?","Spirals, stripes and a pink one! Thank you."),
  L('Message in a Bottle','beach',['Bottle','🍾'],"It's bobbing near the rocks at the end of the sand.","I saw a bottle with a note inside! It washed up somewhere along the shore.","The note says 'Hello from far away!' How exciting!",{d:12}),
  D('A Shell Necklace',['Shell necklace','📿'],'flo',"I made a shell necklace for Granny Flo, just because!","Oh my, I feel like a mermaid!"),
  E('Pinch the Hermit Crab','lighthouse',['Pinch','crab'],"Click click!","My pet hermit crab Pinch scuttled off toward the lighthouse!","Pinch! Sideways all the way home."),
  V('Tide Pools','beach',"The tide is out and the pools are full of starfish!","Is the tide out? Check the tide pools along Seaglass Shore for me.","Starfish! I'm going right now!",{d:10})
],
hal:[
  V('Is the Lamp Lit?','lighthouse',"The lamp is dark! The glass looks sooty.","Is the lighthouse lamp lit? My old eyes can't tell from here, and the boats are coming in.","Dark?! Keeper Agnes must hear about this.",{key:'lamp'}),
  F('Driftwood','beach',5,['Driftwood','🪵'],"I'm building a little boat. Bring me five bits of driftwood!","She'll be the finest little boat on the shore."),
  L("My Captain's Hat",'pond',['Captain\'s hat','🧢'],"A gust took it while I was visiting Wendell.","The wind snatched my captain's hat at Lily Lake!","Ahoy! A captain without a hat is just a man."),
  D('Sea Shanty Book',['Songbook','📖'],'delphine',"Delphine the fiddler wants my old book of sea shanties. She's out on the south road.","Sea shanties! I'll play one right now. Yo-ho-hum!"),
  C('Squall Coming!','wendell',4,"A squall is coming! Warn Wendell at Lily Lake to pull in his line!","Wendell reels in just as the wind arrives. Thank you!",{mounted:true})
],
agnes:[
  F('Soot on the Glass','beach',4,['Soft rag','🧽'],"Hal says my lamp looked dark? The glass is all sooty! Fetch me four soft rags drying on the beach.","Polished till it sparkles! Now I just need oil.",{key:'polish',pre:'lamp'}),
  D('Lighthouse Postcards',['Postcard','📮'],'percy',"Please take these lighthouse postcards to Percy at the post office.","Lovely! I'll stamp them right away."),
  L('The Spyglass','lighthouse',['Spyglass','🔭'],"I set it down on the rocks to watch the gulls.","I've put my spyglass down somewhere near the lighthouse and can't see it. Ironic!","Ah! Now I can see every ship again."),
  V('Ship Ahoy','summit',"A tiny ship with white sails, heading for the harbour!","From Cloudstep Summit you can see the whole coast. Is there a ship out there?","White sails! That'll be the Gull. Right on time.",{mounted:true}),
  E('Barnacle the Kitten','village',['Barnacle','kitten'],"Mew? Prrrt!","My kitten Barnacle stowed away in Percy's mail bag and ended up in Bramble Village!","Barnacle! No more posting yourself.")
],
petra:[
  F('Pink Blossoms','pond',4,['Pink blossom','🌸'],"I need four pink blossoms. They grow round Lily Lake.","Pink and perfect! This bouquet will be my best."),
  D('A Bouquet for the Keeper',['Bouquet','💐'],'agnes',"A bouquet for Keeper Agnes. It's her lighthouse's birthday!","For my lighthouse? How thoughtful!",{fragile:true}),
  E('Little Elodie','jump',['Elodie','kid'],"I picked you a flower! Is my auntie looking for me?","A little girl named Elodie was picking flowers with me and wandered toward Little Leap School.","Elodie! What a lovely flower. Let's stay together."),
  V('Bluebells Yet?','forest',"A carpet of bluebells, like the sky fell down!","Are the bluebells out in Mosswood Grove yet?","Bluebells! Spring is truly here."),
  C('Flowers for a Patient','jo',4,"Nurse Jo needs flowers for a poorly horse's stall. Quick, before they wilt!","Nurse Jo smiles. 'He's perking up already!'",{mounted:true})
],
barnaby:[
  L('My Bee Hat','flowers',['Beekeeper hat','👒'],"It blew into the tall lavender rows.","My bee hat blew away! The bees will think I'm a flower.","Hat on, bees calm. Thank you kindly."),
  D('Honey for a Sore Throat',['Honey jar','🍯'],'ned',"Grandpa Ned has a scratchy throat. A spoon of honey will fix him up.","Honey! Ahem. Already feeling better."),
  F('Flowers for the Bees','jump',5,['Wildflower','🌷'],"My bees want more flowers to visit. Can you pick five wildflowers near Little Leap School for my garden?","The bees are buzzing with joy. Literally."),
  V('Where Did the Bees Go?','orchard',"A buzzing ball of bees hangs from an apple tree.","My bees swarmed off toward the Apple Orchard! Can you see where they landed?","In Abe's apple tree! I'll fetch them tonight.",{key:'swarm'}),
  C('Warn Farmer Abe','abe',3,"Tell Farmer Abe my bees are in his trees, before he goes up his ladder!","Abe puts down his ladder. 'Thanks for the warning!'",{pre:'swarm',mounted:true})
],
ramona:[
  V('Ride the Jump Lane','jump',"Hop, hop, hop! Clean and careful.","Show me what you've got! Ride along the little jump lane and come back.","Lovely rhythm! You're a natural.",{mounted:true,d:6}),
  F('Marker Cones','jump',4,['Marker cone','🔶'],"The wind knocked my marker cones all over the field. Ride round and collect four!","Course is set! Thanks, rider.",{mounted:true,r:12}),
  C('Sprint to the Races','race',3,"Speed and control! Ride to Clover Racecourse in under three minutes.","Ramona's whistle rings out across the valley. Well ridden!",{mounted:true}),
  D('Rosettes for the Maze',['Rosettes','🏵️'],'clem',"Farmer Clem is holding a pony day at his corn maze. Take him these rosettes!","Rosettes! The young riders will be thrilled."),
  V('The Bumpy Trail','falls',"Rocks, roots and a splash. Your horse handled it beautifully.","The trail to Silver Ribbon Falls is bumpy: perfect practice. Ride there and back!","Steady hands make steady horses. Well done.",{mounted:true})
],
ollie:[
  F('Lucky Pebbles','jump',3,['Lucky pebble','🪨'],"I'm scared of the big jumps. Three lucky pebbles might help! The shiny ones are by the jump field.","Three lucky pebbles. I feel a tiny bit braver."),
  D('A Note for Coach',['Note','📝'],'ramona',"Can you give Coach Ramona my note? It says I'm ready to try. Sort of.","Ollie's ready? That's wonderful news!"),
  V('Show Me How','jump',"Ollie watches every hoof-step, nodding.","Could you ride the little jump lane so I can watch how it's done?","Oh! It's like a hop with a horse. I can do that!",{key:'demo',mounted:true,d:6}),
  L('My Riding Glove','hoofhaven',['Riding glove','🧤'],"I dropped it when I was patting the ponies at Hoofhaven.","I lost my riding glove at Hoofhaven! Can't jump with one cold hand.","Two gloves! Now I'm ready for anything."),
  C('I Did It!','marigold',4,"I jumped! I really jumped! Please tell my auntie Marigold at the Meadow Gate before I burst!","Marigold cheers so loudly the birds fly up. 'That's my Ollie!'",{pre:'demo',bonus:20})
],
dex:[
  F('Lost Programmes','race',5,['Race programme','📄'],"My race programmes blew all over the course! Five, quick, the crowd is waiting!","AND THE PROGRAMMES ARE BACK!"),
  V('Far Post Check','corner',"The far post is standing tall and proud.","Ride to the far corner of the track and check the post marker is still standing.","Standing! THE RACE IS ON!",{mounted:true,d:3}),
  D('A Spare Megaphone',['Megaphone','📣'],'clem',"Farmer Clem needs my spare megaphone for the corn maze. Too many lost riders!","Grand! Now I can holler directions."),
  C('Speed Test','gate',3,"Time for a speed test! Ride from here to the Meadow Gate in three minutes. GO!","A NEW VALLEY RECORD! Probably!",{mounted:true}),
  L('The Golden Stopwatch','race',['Golden stopwatch','⏱️'],"I dropped it under the stands... or was it by the far post?","My golden stopwatch is missing! Can't time races without it.","Tick tock! Back in business.",{d:13})
],
flo:[
  F('Runaway Yarn','race',5,['Yarn ball','🧶'],"My yarn balls rolled down the stands and all over the grass!","Thank you, dear. Now, where was I? Knit one...."),
  D('A Warm Scarf',['Scarf','🧣'],'sven',"I knitted a scarf for Sven the mountain guide. It's chilly up there!","Toasty! I'll wear it to the summit."),
  E('Grandson Bertie','forest',['Bertie','kid'],"I saw an owl! It went 'hoo'!","My grandson Bertie went looking for owls in Mosswood Grove and hasn't come back for tea!","Bertie! Your tea's gone cold, but your granny's heart is warm."),
  L('Knitting Needles','gate',['Knitting needles','🪡'],"I left them by the Meadow Gate when I stopped to chat.","I've lost my knitting needles! I can't sit still without them.","Click clack! Ah, that's better."),
  V('Wool on the Way?','tobias',"Hundreds of fluffy sheep. Lots of wool!","Is Tobias's flock out on the east road? I'll need wool for winter jumpers!","Lots of wool! Jumpers for everyone.",{mounted:true})
],
hank:[
  F('Spilled Treats','hoofhaven',5,['Horse treat','🍬'],"I dropped a bag of horse treats round the market barn. Five got away!","The horses thank you. Loudly."),
  E('Dot the Foal','pond',['Dot','foal'],"The foal nickers and nuzzles your pocket.","A foal named Dot slipped out of the market barn and trotted off to Lily Lake!","There's my girl. Dot, you'll find a family soon, I promise."),
  D('A New Halter',['Halter','🪢'],'tilly',"Tilly ordered a new halter for a stable pony. Take it to the barn?","It's purple! The pony is going to look so smart."),
  V('Gate Check','gate',"The Meadow Gate is shut, latch and all.","Did someone leave the Meadow Gate open? The ponies could wander out!","Shut tight. Phew!"),
  C('Pony for Ingrid','ingrid',4,"Ingrid wants to see the new pony before anyone else! Race and tell her it's ready.","Ingrid claps her hands. 'I'll be right there!'",{mounted:true})
],
elsie:[
  L('My Ranger Badge','forest',['Ranger badge','📛'],"Probably near the big mossy log.","I've lost my ranger badge in Mosswood Grove! How will the owls know I'm in charge?","Badge on! The grove is safe again.",{d:11}),
  F('Tidy the Falls','falls',5,['Litter','🥫'],"Some picnickers left litter by Silver Ribbon Falls. Help me tidy up five bits?","Spotless! The fish thank you."),
  E('A Lost Hiker','mountain',['Tamsin','kid'],"I lost my group! Are they waiting for me?","A girl called Tamsin left her hiking group at the Cloudstep Trailhead. Let's get her back safe.","Tamsin! Your group is right here. Stay close now."),
  V('The Owl Box','forest',"Two big round eyes blink at you. Hoo!","Is there an owl in my new owl box at the edge of the grove?","An owl! My first owl box tenant!",{d:12}),
  D('A Map for Wilma',['Trail map','🗺️'],'wilma',"Wilma the woodcutter needs this map of the western woods.","Now I know which trees are safe to cut. Thanks!")
],
arlo:[
  F('Feathers for a Badge','forest',4,['Feather','🪶'],"For my Nature badge I need four feathers from Mosswood Grove.","Four feathers! Badge number twelve, here I come."),
  L('My Compass','falls',['Compass','🧭'],"It fell out of my pocket near the falls somewhere.","Scouts never get lost... unless they lose their compass! It's near Silver Ribbon Falls.","North is that way! I think. Thanks!"),
  V('Lighthouse in Sight?','ridge',"Far away, a tiny pink tower: the lighthouse!","For my Map badge: can you see the lighthouse from Sunset Ridge?","Yes! I'll draw it on my map."),
  C('Scout Speed Trial','falls',3,"Scout speed trial! Get to Silver Ribbon Falls in three minutes!","Arlo's stopwatch beeps. 'That's a badge for you!'",{mounted:true}),
  E('Pocket the Puppy','ridge',['Pocket','puppy'],"Yip! Yip yip!","Our scout troop puppy, Pocket, followed a rabbit up Sunset Ridge!","Pocket! Scouts stick together!")
],
nils:[
  L('My Lens Cap','falls',['Lens cap','⚫'],"I was leaning over the pool for a close-up.","I've lost my lens cap at the falls! My camera feels naked.","Click! Back where it belongs."),
  V('Sunlight on the Arch','mountain',"Sunlight pours right through the stone arch. Picture perfect!","Is the stone arch at Cloudstep Trailhead in the sunshine right now?","Picture perfect! I'm on my way."),
  D('A Photo for the Professor',['Photograph','📷'],'edda',"A photo of an old carving I found. Professor Edda will want it!","Ooh, ancient carvings! Or... a very old doodle."),
  F('Film Rolls','ridge',4,['Film roll','🎞️'],"My bag split on Sunset Ridge and my film rolls tumbled out!","My pictures are saved! Thank you!"),
  C('Catch the Rainbow','orla',4,"There's a rainbow at the falls! Tell Orla on Sunset Ridge quickly, she'll want to paint it!","Orla grabs her brushes and runs. 'A rainbow!'",{mounted:true})
],
sven:[
  F('Trail Markers','mountain',4,['Trail marker','📍'],"Wind knocked down my trail markers near the trailhead. Bring me four?","The trail is marked. No one will get lost now."),
  V('Summit Safety Check','summit',"The lookout rock is solid as... well, a rock.","The spiral trail needs checking. Ride to Cloudstep Summit and tell me if the lookout rock is safe.","Solid! Thank you, brave rider.",{mounted:true}),
  E('Scramble the Kid Goat','mill',['Scramble','goat'],"Meh-eh-eh!","A little mountain goat followed me down and got lost by the windmill. Her name is Scramble.","Scramble! Back to the rocks with you."),
  D('Weather Report',['Weather report','🌨️'],'rufus',"Rufus the tinker is heading north. Give him the weather report!","Snow, eh? I'll pack my woolly socks."),
  L('Thermos of Cocoa','mountain',['Thermos of cocoa','☕'],"I put it down by a rock when I tied my boot.","My thermos of cocoa! I set it down near the trailhead and walked off.","Cocoa! Want a sip? It's still warm.")
],
edda:[
  L('Half a Pot','ruins',['Clay pot shard','🏺'],"Somewhere round the arch, near the old stones.","I found half an ancient pot! The other half must be nearby.","It fits! And look, there's a windmill painted on it!",{key:'pot'}),
  V('The Carved Stone','mill',"A mossy stone with a carved horseshoe!","The pot has a windmill painted on it. Is there a carved stone near Willow Windmill?","A horseshoe! The plot thickens!",{key:'carving',pre:'pot'}),
  F('Stone Fragments','ruins',4,['Carved fragment','🧩'],"The horseshoe stone matches pieces here at the arch! Find four carved fragments.","They fit together like a puzzle... it's a map!",{key:'fragments',pre:'carving'}),
  D('Notes for the Museum',['Notebook','📓'],'dottie',"My findings are ready for a little town museum. Mayor Dottie keeps the key.","A museum exhibit! Bramble Village will be famous!"),
  V('Behind the Water','falls',"Behind the falling water: a carving of a horse and rider, very old.","The map points to Silver Ribbon Falls! What's hiding behind the water?","The first riders of Trottville! What a discovery!",{pre:'fragments',bonus:30})
],
clem:[
  M('Foal in the Corn','Sprig',['Sprig','foal'],"A foal called Sprig wandered into my corn maze! You'll need your horse: the corn's taller than you are.","Sprig! Look at all that corn silk in your mane. Thank you!"),
  M('A Lamb Among the Stalks','Marble',['Puffball','lamb'],"Tobias's lamb Puffball hopped into the maze, and my foal Marble went in after her! Bring them both out?","Puffball and Marble, side by side. Best friends already!"),
  M("The Farmer's Hat",'Dumpling',['Straw hat','hat'],"The wind blew my straw hat into the maze. Dumpling the foal found it and won't let go! Lead her out, hat and all.","My hat! A bit chewed, but it's mine. Thank you, rider."),
  M('Picnic Basket Thief','Toggle',['Picnic basket','basket'],"Little Toggle trotted off into the corn with Auntie Vi's picnic basket in her teeth!","The basket's back and only one sandwich is missing. Toggle!"),
  M('The Maze at Dusk','Hopscotch',['Hopscotch','foal'],"Hopscotch ran into the maze just as the sun's going down. Quick, before it's dark!","Hopscotch! Safe and snug. You're the best maze rider around.",{bonus:20})
],
rufus:[
  L('The Runaway Cog','rufus',['Tiny cog','⚙️'],"It bounced off my cart somewhere along the road.","A cog jumped out of my music box! It's somewhere along the road.","Plink, plonk, tinkle! It plays again!",{d:10}),
  D('A Mended Kettle',['Kettle','🫖'],'ned',"I fixed Grandpa Ned's kettle. Now it whistles a tune!","Hah! It plays a polka!"),
  F('Shiny Buttons','ridge',5,['Shiny button','🔘'],"I collect shiny buttons for my music boxes. A box of them spilled on Sunset Ridge!","Shiny! They'll make lovely little bells."),
  V('Rockslide?','mountain',"Just a few pebbles. The trail is clear!","Somebody said a rockslide blocked the Cloudstep Trailhead. Can you take a look?","Clear? Good. My cart can get through."),
  C("Tinker's Bargain",'sunita',5,"Sunita wants my last music box, but the market closes soon! Tell her I'm coming!","Sunita beams. 'I'll keep the stall open!'",{mounted:true})
],
delphine:[
  F('Flying Sheet Music','flowers',5,['Sheet music','🎼'],"The wind stole my sheet music and scattered it over Lavender Fields!","My songs! Now I can play the one about the purple hills."),
  E('Banjo the Dog','jump',['Banjo','puppy'],"Aroooo! Woof!","My dog Banjo howls along to my fiddle, but he ran off toward Little Leap School!","Banjo! Shall we sing together?"),
  V('The Singing Falls','falls',"You sing 'la la la' and the falls sing 'la la la' back!","They say if you sing at Silver Ribbon Falls, it sings back. Will you try it for me?","It sings back! I'm writing a song about it."),
  D('Concert Poster',['Poster','🎻'],'percy',"Pin this concert poster up at Percy's post office, please!","Front window, right where everyone will see it!"),
  C('Encore!','vi',5,"The picnic crowd wants music! Tell Auntie Vi I'll play there tonight, before she packs up!","Auntie Vi claps. 'Music AND picnic? Wonderful!'",{mounted:true})
],
tobias:[
  E('Woolly the Lamb','race',['Woolly','lamb'],"Baa! Baa-aa!","My smallest lamb, Woolly, wandered into the valley. I think she went toward Clover Racecourse!","Woolly! Back with your mum, little one."),
  F('Wool on the Bushes','forest',5,['Wool tuft','☁️'],"My sheep left wool on every bush in Mosswood Grove. Five tufts, please!","Soft as a cloud. Thank you!"),
  D('Wool for Granny Flo',['Wool bundle','🧶'],'flo',"Granny Flo knits the best jumpers. Take her this wool!","Ooh, so soft! A jumper for you next, dear."),
  L("The Shepherd's Horn",'tobias',['Shepherd\'s horn','📯'],"I put it down by the road while I counted sheep.","My shepherd's horn is missing! The sheep only come when I toot.","Toot toot! Here they come.",{d:10}),
  V('Grass Check','flowers',"Lush, tall grass. The sheep will love it!","Is the grass long enough by Lavender Fields for my flock to graze?","Long grass! Happy sheep!",{d:8})
],
wilma:[
  F('Firewood','ruins',5,['Log','🪵'],"I need firewood for my cabin. There are fallen logs round the Old Stone Arch.","A warm fire tonight. Thank you, friend."),
  L('My Lunch Tin','wilma',['Lunch tin','🥪'],"I left it on a stump along the road.","I put down my lunch tin and now I can't find it. My tummy is rumbling!","Lunch! Want half a sandwich?",{d:10}),
  D('A Wooden Horse',['Wooden horse','🐴'],'benny',"I carved a little wooden horse for Benny. Don't tell him it's from me!","A wooden horse! I'll call him Sprocket Two!"),
  E('My Son Oskar','mill',['Oskar','kid'],"I was watching the sails go round and round!","My son Oskar went to watch the windmill turn and lost track of time.","Oskar! Home for supper, sleepy head."),
  C('Wood for the Fence','hank',5,"Hank needs wood for a new paddock fence. Tell him mine's ready before he buys some elsewhere!","Hank shakes your hand. 'Tell Wilma I'll take it all!'",{mounted:true})
]
};

// ---------- Build ----------
const DEFAULT_ICON={deliver:'📦',fetch:'🧺',find:'🔍',escort:'🧒',visit:'👀',courier:'⏱️',maze:'🌽'};
// Pixel icon names (assets/icons) for the same things; renderers use iconHTML(icon,px) from pixel-icons.js.
const DEFAULT_PX={deliver:'quest-deliver',fetch:'quest-fetch',find:'badge-finder',escort:'quest-escort',visit:'quest-visit',courier:'quest-courier',maze:'quest-maze'};
const KIND_PX={kid:'quest-escort',puppy:'item-puppy',kitten:'item-kitten',goat:'item-kid-goat',foal:'item-foal',lamb:'item-lamb',duckling:'item-duckling',piglet:'item-piglet',hedgehog:'item-hedgehog',bunny:'item-bunny',crab:'item-hermit-crab'};
const ITEM_PX={'Lost horseshoe':'horseshoe','Saddle soap':'item-saddle-soap','Spectacles':'item-spectacles','Rhubarb bundle':'item-rhubarb-bundle','Dry twig':'item-dry-twig','Lunchbox':'item-lunchbox','Marble':'item-marble','Red mitten':'item-red-mitten','Lucky lure':'item-lucky-lure','Fresh trout':'item-fresh-trout','Wiggly worm':'item-wiggly-worm','Frog':'item-frog-head','Frog drawing':'item-frog-drawing','Blue hair ribbon':'item-blue-hair-ribbon','Lavender sprig':'item-lavender-sprig','Painting':'item-painting-on-an-easel','Paintbrush':'item-paintbrush','Apple':'apple','Apple juice':'item-apple-juice-bottle','Yo-yo':'item-yo-yo','Acorn':'item-acorn','Party invitation':'item-party-invitation-card','Grain sack':'item-grain-sack','Bag of flour':'item-bag-of-flour','Mill key':'item-mill-key','Jug of milk':'item-jug-of-milk','Clover bunch':'item-clover-bunch','Fresh curds':'item-fresh-cheese-curds','Cowbell':'item-cowbell','Wild strawberry':'item-wild-strawberry','Egg':'item-egg','Birthday cake':'item-birthday-cake','Letter':'item-letter','Postcard':'item-postcard','Parcel':'item-parcel-with-stamps','Town notice':'item-town-notice-pinned-paper','Bunting flag':'item-bunting-flag','Kite':'item-kite','Ribbon':'item-ribbon-spool','Little kite':'item-little-kite','Carrot':'carrot','Box of candles':'item-box-of-candles','Lamp oil':'item-lamp-oil-can','Cheese wheel':'item-cheese-wheel','Cheese slicer':'item-cheese-slicer','Mushroom':'item-mushroom','Mint leaf':'item-mint-leaf','Medicine':'item-medicine-bottle','Stethoscope':'vet','Buttercup':'item-buttercup-flower','Lemonade':'item-lemonade-glass','Brooch':'item-brooch','Ball':'decor-ball','Collar':'item-dog-collar-with-tag','Thank-you card':'item-thank-you-card','Chess king':'item-chess-king-piece','Die':'item-die','Riddle scroll':'item-riddle-scroll','Seashell':'item-seashell','Bottle':'item-message-in-a-bottle','Shell necklace':'item-shell-necklace','Driftwood':'item-driftwood','Songbook':'item-songbook','Soft rag':'item-soft-rag','Spyglass':'item-spyglass','Pink blossom':'item-pink-blossom','Bouquet':'item-bouquet','Beekeeper hat':'item-beekeeper-hat','Honey jar':'item-honey-jar','Wildflower':'item-wildflower','Marker cone':'item-orange-marker-cone','Rosettes':'item-rosettes','Lucky pebble':'item-lucky-pebble','Note':'item-note-paper','Riding glove':'item-riding-glove','Race programme':'item-race-programme','Megaphone':'item-megaphone','Golden stopwatch':'item-golden-stopwatch','Yarn ball':'item-yarn-ball','Scarf':'item-scarf','Knitting needles':'item-knitting-needles','Horse treat':'item-horse-treat','Halter':'item-halter','Ranger badge':'item-ranger-badge','Litter':'item-litter','Trail map':'item-trail-map','Feather':'item-feather','Compass':'item-compass','Lens cap':'item-camera-lens-cap','Photograph':'item-photograph','Film roll':'item-film-roll','Trail marker':'item-trail-marker-post-with-ribbon','Weather report':'item-weather-report-paper','Thermos of cocoa':'item-thermos-of-cocoa','Clay pot shard':'item-clay-pot-shard','Carved fragment':'item-carved-stone-fragment','Notebook':'item-notebook','Tiny cog':'item-tiny-cog','Kettle':'item-kettle','Shiny button':'item-shiny-button','Sheet music':'item-sheet-music','Poster':'item-concert-poster','Wool tuft':'item-wool-tuft','Wool bundle':'item-wool-bundle','Log':'item-log','Lunch tin':'item-lunch-tin','Wooden horse':'item-wooden-toy-horse','Pinecone':'item-pinecone','Smooth pebble':'item-smooth-pebble','Hat':'item-hat','Glove':'item-glove','Basket':'item-basket','Book':'item-book','Whistle':'item-whistle','Key':'item-key','Spoon':'item-spoon','Basket of buns':'item-basket-of-buns','Jar of jam':'item-jar-of-jam','Library book':'item-library-book','Thank-you note':'item-thank-you-card','Flower pot':'item-flower-pot','Box of tea':'item-box-of-tea'};
const KIND_ICON={kid:'🧒',puppy:'🐶',kitten:'🐱',goat:'🐐',foal:'🐴',lamb:'🐑',duckling:'🐥',piglet:'🐷',hedgehog:'🦔',bunny:'🐰',crab:'🦀'};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const r5=v=>Math.round(v/5)*5;
// Rewards: ~10 Trotties a minute of play. Short errands ~30, long rides and chains up to ~110.
export function rewardFor(kind,km,extra=0){
  const base={deliver:25,fetch:28,find:30,escort:35,visit:22,courier:40,maze:80}[kind]||25;
  const per={deliver:.32,fetch:.3,find:.3,escort:.4,visit:.55,courier:.35,maze:0}[kind]||.3;
  return Math.min(120,Math.max(30,r5(base+km*per+extra)));
}
function build(){
  const quests=[],keys={};
  CAST.forEach(([gid],gi)=>{const list=BOOK[gid];if(!list||list.length!==5)throw new Error('Giver needs 5 quests: '+gid);
    list.forEach((e,i)=>{const n=i*CAST.length+gi+1,id='q'+String(n).padStart(3,'0');if(e.key)keys[e.key]=id;quests.push({n,id,gi,i,e});});});
  return quests.sort((a,b)=>a.n-b.n).map(({n,id,e})=>{
    const giver=GIVER_BY_ID[Object.keys(BOOK).find(g=>BOOK[g].includes(e))],q={id,n,giver:giver.id,kind:e.k,title:e.t,ask:e.a,thanks:e.y,
      minutes:e.m||(e.k==='courier'?4:10),mounted:!!e.mounted,prereq:e.pre?keys[e.pre]:null};
    if(e.pre&&!q.prereq)throw new Error('Unknown prereq '+e.pre);
    let km=0;
    if(e.k==='deliver'){q.item={name:e.item[0],icon:e.item[1],px:ITEM_PX[e.item[0]]};q.to=e.to;q.fragile=!!e.fragile;km=dist(giver,GIVER_BY_ID[e.to]);q.icon=q.item.icon;}
    else if(e.k==='fetch'){const p=placeOf(e.at),r=e.r||9;q.at=e.at;q.place=p.name;q.item={name:e.item[0],icon:e.item[1],px:ITEM_PX[e.item[0]]};q.count=e.n;q.radius=r;
      q.spots=Array.from({length:e.n},(_,j)=>spotNear(p.x,p.z,r*(.45+.55*((j*7+3)%e.n)/Math.max(1,e.n-1)),id+':'+j));km=dist(giver,p)*2;q.icon=q.item.icon;}
    else if(e.k==='find'){const p=placeOf(e.at);q.at=e.at;q.place=p.name;q.item={name:e.item[0],icon:e.item[1],px:ITEM_PX[e.item[0]]};q.hint=e.hint;q.spot=spotNear(p.x,p.z,e.d||9,id);km=dist(giver,p)*2;q.icon=q.item.icon;}
    else if(e.k==='escort'){const p=placeOf(e.at);q.at=e.at;q.place=p.name;q.follower={name:e.who[0],kind:e.who[1],seed:'follower-'+id,found:e.f};q.spot=spotNear(p.x,p.z,e.d||10,id);km=dist(giver,p)*2;q.icon=KIND_ICON[e.who[1]]||DEFAULT_ICON.escort;q.px=KIND_PX[e.who[1]]||DEFAULT_PX.escort;}
    else if(e.k==='visit'){const p=placeOf(e.at);q.at=e.at;q.place=p.name;q.seen=e.s;q.spot=spotNear(p.x,p.z,e.d??(GIVER_BY_ID[e.at]?0:3),id);q.label=p.name;km=dist(giver,p);q.icon=DEFAULT_ICON.visit;}
    else if(e.k==='courier'){const p=placeOf(e.at);q.at=e.at;q.place=p.name;q.minutes=e.m||4;q.spot=spotNear(p.x,p.z,GIVER_BY_ID[e.at]?0:3,id);q.label=p.name;km=dist(giver,p);q.icon=DEFAULT_ICON.courier;}
    else if(e.k==='maze'){q.foal=e.foal;q.lost={name:e.lost[0],kind:e.lost[1]};q.spot={...CORN_ENTRANCE};q.label='Corn maze';q.icon=DEFAULT_ICON.maze;}
    q.reward=rewardFor(e.k,km,e.bonus||0);
    q.icon=q.icon||DEFAULT_ICON[e.k];q.px=q.px||q.item?.px||DEFAULT_PX[e.k];
    return q;});
}
export const ALL_QUESTS=build();
export const QUEST_BY_ID=Object.fromEntries(ALL_QUESTS.map(q=>[q.id,q]));
// Live quests: hint people's quests are retired; a story step that waited on one of them no longer waits.
export const QUESTS=ALL_QUESTS.filter(q=>!HINTS[q.giver]);
for(const q of QUESTS)if(q.prereq&&HINTS[QUEST_BY_ID[q.prereq]?.giver])q.prereq=null;
export const QUEST_TOTAL=QUESTS.length;
export const QUEST_GIVERS=GIVERS.filter(g=>!HINTS[g.id]);
export const QUESTS_BY_GIVER=Object.fromEntries(GIVERS.map(g=>[g.id,QUESTS.filter(q=>q.giver===g.id).sort((a,b)=>a.n-b.n)]));
export {KIND_ICON,DEFAULT_ICON,KIND_PX,DEFAULT_PX};

// ---------- Odd jobs (after a giver's five; endless, one a day, smaller pay, not part of the 200) ----------
export const ODD_ITEMS=[['Pinecone','🌲'],['Smooth pebble','🪨'],['Wildflower','🌼'],['Apple','🍎'],['Carrot','🥕'],['Feather','🪶'],['Acorn','🌰'],['Mushroom','🍄']];
export const ODD_LOST=[['Hat','👒'],['Scarf','🧣'],['Glove','🧤'],['Basket','🧺'],['Book','📖'],['Whistle','📯'],['Key','🗝️'],['Spoon','🥄']];
export const ODD_PARCELS=[['Basket of buns','🧺'],['Jar of jam','🍓'],['Library book','📖'],['Thank-you note','💌'],['Flower pot','🪴'],['Box of tea','🫖']];
export const ODD_PLACES=['gate','pond','ridge','orchard','home','mill','village','market','race','jump','picnic','beach','lighthouse','flowers','forest','falls','mountain','ruins'];
