// Legends of the valley (note #19, built 2026-11-09): the wild unicorn and the pegasus. Pure rules + device storage;
// the 3D side is world-legends.js.
//  · RAINBOW CARROT: after rain or a storm clears in daylight, a rainbow touches down somewhere in the valley. Dig at
//    its end (on foot) for a rainbow carrot. One rainbow a day at most.
//  · UNICORN: only on moonlit (clear or partly cloudy) nights, and not every night. Any breed. Get off your horse and
//    walk slowly: riding or running near it scares it away for the night. Close up, offer the rainbow carrot.
//    No carrot in your pocket = it bolts and vanishes.
//  · PEGASUS: rarer still. At night, look up at the stars and find the Pegasus constellation: that rolls a d200, once a
//    night. On a 200 it flies down in front of you. It only eats a SALAD of five things: carrot, apple, flowers (four
//    easy ones, from the market, orchard, Lavender Fields), mint (Lily Lake) and a ZUCCHINI, the hard one: a seed
//    found once at Buttercup Picnic, planted in the garden bed by the stable and watered 7 days in a row.
// Rarity only really holds once this lives on the server; on a device it can be edited (flagged to Yoshi).
import {rng,BREEDS,makeCoat,newHorse,COATS} from './ranch.mjs?v=161';

import {R} from './world-regions.mjs?v=161';
export const LEGENDS_KEY='trottville-legends-v1';
export const UNICORN_ODDS=8,PEGASUS_DIE=200,ZUCCHINI_DAYS=7;
export const SALAD=[{id:'carrot',icon:'🥕',name:'Carrot',where:'Carrot Market basket'},{id:'apple',icon:'🍎',name:'Apple',where:'the orchard'},
  {id:'flowers',icon:'💐',name:'Flowers',where:'Lavender Fields'},{id:'mint',icon:'🌿',name:'Mint',where:'by the Lily Lake'},
  {id:'zucchini',icon:'🥒',name:'Zucchini',where:'your garden bed (7 days of watering)'}];
// Calm, open spots for a unicorn to graze (near named places, offset into the grass).
export const MEADOWS=[[5,65,9,6],[29,-22,-8,-7],[30,4,6,10],[60,-35,-9,-6],[-20,50,-7,8],[13,15,10,-9],[22,45,-9,-7],[-48,32,16,10]].map(([x,z,ox,oz])=>{const p=R(x,z);return [p.x,p.z,ox,oz];});
export const GARDEN={x:-4.5,z:-6.5};
export const MOON_KINDS=new Set(['clear','partly','windy']);

export function freshLegends(){return {version:1,rainbow:0,seed:false,garden:{planted:null,streak:0,lastWatered:null},zucchini:0,mint:{day:null,n:0},
  rainbowEnd:null,unicorn:{night:null,gone:false},stars:{night:null,roll:null},pegasus:{night:null,gone:false},caught:[]};}
export function loadLegends(){try{const o=JSON.parse(localStorage.getItem(LEGENDS_KEY)||'null');return o&&o.version===1?{...freshLegends(),...o}:freshLegends();}catch{return freshLegends();}}
export function saveLegends(l){try{localStorage.setItem(LEGENDS_KEY,JSON.stringify(l));}catch{}}

const pad=n=>String(n).padStart(2,'0');
export const dayKey=(d=new Date())=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
// One game night per real hour (the day cycle runs once an hour): the night of 3 pm on the 10th is '2026-11-10-15'.
export function nightKey(d=new Date()){return dayKey(d)+'-'+pad(d.getHours());}
const dayNumber=key=>Math.round(Date.parse(key+'T12:00:00')/86400000);

// Is there a unicorn tonight, and where? (Same answer for the whole night; null on most nights.)
export function unicornTonight(night,{odds=UNICORN_ODDS}={}){const r=rng('unicorn:'+night);if(r()*odds>=1)return null;
  const [x,z,ox,oz]=MEADOWS[Math.floor(r()*MEADOWS.length)];return {x:x+ox,z:z+oz,seed:'unicorn-'+night};}
// The d200 for one night's stargazing (one roll per night; `salt` keeps two players' nights different).
export function starRoll(night,salt=''){return 1+Math.floor(rng('pegasus:'+night+':'+salt)()*PEGASUS_DIE);}
export const pegasusHit=roll=>roll===PEGASUS_DIE;
// Where today's rainbow touches down (a meadow, different each day).
export function rainbowSpot(day){const r=rng('rainbow:'+day),[x,z,ox,oz]=MEADOWS[Math.floor(r()*MEADOWS.length)];return {x:x-oz*.8,z:z+ox*.8,day};}

// A legend joins your herd as any breed, with its own coat. Wild, so it still needs taming.
const NAMES={unicorn:['Moonbeam','Stardust','Opaline','Lumen','Silverlight','Nightbloom','Glimmer','Wishmere'],pegasus:['Skylark','Zephyr','Celestia','Nimbus','Aurora','Cirrus','Starwing','Halcyon']};
export function legendHorse(kind,seed,now=Date.now()){const r=rng('legend:'+kind+':'+seed),b=BREEDS[Math.floor(r()*BREEDS.length)],name=NAMES[kind][Math.floor(r()*NAMES[kind].length)];
  const h=newHorse({breed:b.id,name,seed:kind+'-'+seed,ageMonths:48+Math.floor(r()*48),now,coat:makeCoat(b.id,kind+seed)});
  return Object.assign(h,{legend:kind,trust:8,bio:kind==='unicorn'?`A wild ${b.name.toLowerCase()} unicorn you found on a moonlit night.`:`A ${b.name.toLowerCase()} pegasus that flew down from the stars for you.`});}

// v106 (Yoshi 2026-11-14): the MOON PEGASUS. At midnight, from the top of Thimbleford's clock tower, a silver pegasus
// circles the moon. Hold up a rainbow carrot (this file's pocket) or a golden carrot (the ranch pantry; one hides on the
// cloud castle's tallest spire, above the clouds) and it glides down and joins your herd. Once ever.
export const MOON_NAMES=['Moonwing','Selene','Lunaris','Silvermist','Nocturne','Moonpetal'];
export const isMidnight=h=>h>=23.5||h<1;
// Note #40 (2026-11-14): SEEING it is easy. From game midnight to 1:15 am (real :45 to about :48 every hour) the moon
// pegasus circles above Thimbleford's clock tower, lined up with the moon from the town square. TAMING it is hard: it
// only comes down for a Moon Carrot grown from the golden seed (the Mosswood treetop quest).
export const isSighting=h=>h>=23.9||h<1.25;
export function moonHorse(seed,now=Date.now()){const r=rng('moon:'+seed),name=MOON_NAMES[Math.floor(r()*MOON_NAMES.length)];
  const coat={...makeCoat('andalusian','moon-'+seed),...COATS.silver,white:'#f7f9ff',coatName:'moon silver',dapple:true,blaze:false,socks:[0,0,0,0],spots:0,patches:0};
  const h=newHorse({breed:'andalusian',name,seed:'moon-'+seed,ageMonths:60,now,coat});
  return Object.assign(h,{legend:'pegasus',moon:true,trust:12,bio:`A silver moon pegasus who glided down to Thimbleford’s clock tower at midnight.`});}

// ---- The garden bed: plant once, water every day; 7 days in a row ripens a zucchini (then it grows another). ----
export function gardenState(l,today=dayKey()){const g=l.garden;if(!l.seed&&g.planted==null)return {id:'empty'};if(g.planted==null)return {id:'seed'};
  const gap=g.lastWatered?dayNumber(today)-dayNumber(g.lastWatered):99;
  if(g.streak>=ZUCCHINI_DAYS)return {id:'ripe'};
  if(gap===0)return {id:'watered',streak:g.streak};
  return {id:'thirsty',streak:gap===1?g.streak:0,reset:gap>1&&g.streak>0};}
export function gardenAct(l,today=dayKey()){const st=gardenState(l,today),g={...l.garden};
  if(st.id==='empty')return {l,msg:'An empty garden bed. Maybe a seed will turn up somewhere.'};
  if(st.id==='seed'){g.planted=today;g.streak=0;g.lastWatered=null;return {l:{...l,seed:false,garden:g},msg:'You planted the zucchini seed. Water it 7 days in a row.',sound:'pop'};}
  if(st.id==='ripe'){g.streak=0;g.lastWatered=null;return {l:{...l,zucchini:l.zucchini+1,garden:g},msg:'A big shiny zucchini! The plant will grow another if you keep watering it.',sound:'chime'};}
  if(st.id==='watered')return {l,msg:`Already watered today (${st.streak}/${ZUCCHINI_DAYS} days). Come back tomorrow.`};
  g.streak=st.streak+1;g.lastWatered=today;const left=ZUCCHINI_DAYS-g.streak;
  return {l:{...l,garden:g},msg:(st.reset?'It wilted a little after the missed days, so the count starts again. ':'')+(left?`Watered! Day ${g.streak}/${ZUCCHINI_DAYS}. ${left} more ${left===1?'day':'days'} in a row.`:'Watered! Day 7/7. The zucchini is ripe: pick it!'),sound:'splash'};}

// ---- Salad ----
export function saladParts(l,{food={},supplies={}}={}){const have={carrot:(food.carrot||0)>0,apple:(food.apple||0)>0,flowers:(supplies.flowers||0)>0,mint:l.mint.n>0,zucchini:l.zucchini>0};
  return SALAD.map(s=>({...s,have:have[s.id]}));}
export const saladReady=parts=>parts.every(p=>p.have);
