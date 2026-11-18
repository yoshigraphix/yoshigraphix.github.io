// Hazel, who runs the rider-clothes shop inside your barn (Hazel's Riding Togs). Pure lines, no DOM: the world
// asks for a greeting when you walk in, and the talk dialog asks for tips, a shopping nudge or a bit of chatter.
// Every tip is true to the game as built (see CLAUDE.md); keep them that way when rules change.
export const SHOPKEEPER={name:'Hazel',shop:'Hazel’s Riding Togs'};

// pick(list, n): the n-th line, wrapping, so callers can step through without repeats until the list runs out.
const pick=(list,n)=>list[((n%list.length)+list.length)%list.length];

export function greeting({hours=12,weather='clear',visits=0,outfit='',name=''}={}){
  const h=((hours%24)+24)%24,you=name?`, ${name}`:'';
  const time=h<5||h>=21?[`Burning the midnight oil${you}? Come in, come in.`,`Late visitor! The lanterns are on, have a look round.`]
    :h<11?[`Morning${you}! Fresh stock folded and ready.`,`Good morning! The early rider gets first pick.`]
    :h<17?[`Afternoon${you}! Mind the boots by the door.`,`Hello again! Come in out of the yard.`]
    :[`Evening${you}! Just tidying the racks, browse away.`,`Golden hour already? Lovely light for trying things on.`];
  const sky={rain:'Shake off that rain! Don’t drip on the silks, mind.',storm:'Goodness, that thunder! Stay in here till it passes.',snow:'Brr! Stamp the snow off your boots, love.',
    fog:'Couldn’t see the paddock for fog this morning.',windy:'Hold on to your hat out there, the wind’s up.'}[weather];
  const first=visits===0?['Welcome to Hazel’s Riding Togs! Horses wait outside, people come in.']:[];
  const looking=outfit?[`That ${outfit} suits you, by the way.`]:[];
  const lines=[...first,...(sky?[sky]:[]),...time,...looking];
  return visits===0?lines[0]:pick(lines,visits);
}

// How to play, in Hazel's voice. In order of usefulness for a new rider.
export const TIPS=[
  'Tap your horse to hop on. Riding somewhere together earns trust. You get 5 free map jumps a day; after that a jump costs 3 trust.',
  'Open the map and look for the gold pins: that’s today’s list of things that pay Trotties.',
  'Every new place you discover pays 25 Trotties, once. Worth a wander!',
  'The Carrot Market gives away a free basket of carrots every day.',
  'Apples are free in the orchard each day, and Appleoosa at the apple rig pays you to sort them.',
  'See the hay wagon by the barn loft? Hay’s for Horses: fling bales up through the loft door.',
  'The foals in Grapevine Paddock always need penning. Good pay if you’re quick.',
  'To race the steeplechase you’ll want proper gear. The Trail Rider outfit counts, and it’s yours for good.',
  'Rain and storms turn the trails muddy, and snow’s deep; you’ll ride a little slower till it clears.',
  'Nights are properly dark out there. Stick near the lanterns on the paths.',
  'The stalls out in the hall have chores: hay, water, mucking out. Your horse loves the grooming box.',
  'Tack Match is in the tack room across the hall. A good memory test on a rainy day.',
  'Cloudstep, the big mountain, has a spiral trail all the way up. The view from the summit!',
  'Racing friends? Host a private room and share the code with them.',
  'They say a rainbow comes down somewhere in the valley after the rain clears. Dig where it ends!',
  'On clear moonlit nights folks swear they see a unicorn grazing. Walk, don’t ride, and don’t run.',
  'Look up on a clear night and find Pegasus in the stars. Make a wish. Bring a salad, mind: it’s fussy.',
  'Lost something at Buttercup Picnic? People are always finding little treasures under that blanket.',
  'There’s a garden bed by the stable. A zucchini needs a week of watering, every single day.',
  'The sky lift runs from the top of Cloudstep right across the valley. Pull the lever to start it.',
];
export const tip=n=>pick(TIPS,n);

// A shopping nudge from what you own and what you can afford. outfits: OUTFITS from character-looks.mjs.
export function pitch({coins=0,owned=[],outfits=[]}={}){
  const forSale=outfits.filter(o=>o.tier==='coins'&&!owned.includes(o.id)).sort((a,b)=>a.price-b.price);
  if(!forSale.length)return 'You’ve bought every outfit I make with Trotties! The fancy ones on the top shelf come with Game Cards.';
  const race=forSale.find(o=>o.races&&o.id==='trail');
  if(race&&coins>=race.price)return `You’ve got ${coins} Trotties. Trail Rider’s ${race.price}, and it gets you into races. Just saying!`;
  const can=forSale.filter(o=>o.price<=coins);
  if(can.length){const o=can[can.length-1];return `With ${coins} Trotties you could walk out in the ${o.name} today. It’s ${o.price}.`;}
  const next=forSale[0];
  return `The ${next.name} is ${next.price} Trotties; you’ve ${coins}. A few barn chores and you’re there.`;
}

// Small talk when you just want to chat.
export const CHATTER=[
  'I used to ride the steeplechase myself. Fell in the water jump. Twice.',
  'Clover Racecourse is busy this week. Everyone wants new silks.',
  'I sew everything here. That cape took me three evenings.',
  'If you hear a rooster at dawn, that’s Gerald. He thinks he runs the farm.',
  'Folks say there’s something magical about moonlit nights in the valley. I wouldn’t know. Or would I?',
  'The lighthouse keeper buys a scarf every winter. Never the same colour.',
  'Boots by the door, please! Straw gets everywhere.',
  'Your horse gave me a look through the window. I think they approve.',
];
export const chatter=n=>pick(CHATTER,n);

// When a rider tries to bring a horse inside.
export const NO_HORSES=['Whoa there! Horses wait outside the shop. Hop off first.','Not on horseback, love! Leave them at the door.','The racks won’t survive a horse. Hop off and come in.'];
