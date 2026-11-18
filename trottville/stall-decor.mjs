// Your horse's stall, decorated (Animal Crossing style, kept simple). Pure data + rules: no DOM, no Three.js.
// The stall has fixed SLOTS (wall, beam, floor, rug, door, and two shelf-top slots that only open once a
// shelf hangs on a wall). You own at most one of each decor item; placing an item that is already up
// somewhere moves it. A few items are free starters; the rest cost Trotties (the wallet in character-looks.mjs).
// Saved on the device under STALL_KEY. stall-scene.js draws it, home-horse.js wires the sheets.

export const STALL_KEY='trottville-stall-v1';

// fits: slot types the item can go in. price 0 = free starter (owned from the start).
export const CATALOG=[
  {id:'meadow-painting',name:'Meadow painting',icon:'🖼️',fits:['wall'],price:0,text:'Green hills and a sunny sky.'},
  {id:'sunset-painting',name:'Sunset painting',icon:'🌅',fits:['wall'],price:60,text:'Warm evening colours over the paddock.'},
  {id:'horse-portrait',name:'Horse portrait',icon:'🐴',fits:['wall'],price:90,text:'A framed portrait of a proud horse.'},
  {id:'night-painting',name:'Starry night painting',icon:'🌌',fits:['wall'],price:110,text:'A moon and stars over the barn.'},
  {id:'horseshoe',name:'Lucky horseshoe',icon:'🍀',fits:['wall','door'],price:0,text:'Hang it points-up to keep the luck in.'},
  {id:'rosette-blue',name:'Blue rosette',icon:'🎗️',fits:['wall','door'],price:40,text:'First place ribbon.'},
  {id:'rosette-gold',name:'Champion rosette',icon:'🏅',fits:['wall','door'],price:120,text:'A big gold champion ribbon.'},
  {id:'shelf',name:'Wooden shelf',icon:'🪵',fits:['wall'],price:80,text:'Hang it on a wall, then put little things on top.'},
  {id:'name-plaque',name:'Name plaque',icon:'🪧',fits:['door'],price:0,text:'Your horse’s name on the stall door.'},
  {id:'wreath',name:'Flower wreath',icon:'💐',fits:['door','wall'],price:50,text:'A ring of wildflowers.'},
  {id:'bunting',name:'Bunting',icon:'🎏',fits:['beam'],price:45,text:'A string of little coloured flags.'},
  {id:'fairy-lights',name:'Fairy lights',icon:'✨',fits:['beam'],price:110,text:'Twinkly warm lights along the beam.'},
  {id:'hanging-lantern',name:'Hanging lantern',icon:'🏮',fits:['beam'],price:70,text:'A warm glow from above.'},
  {id:'daisy-pot',name:'Daisy pot',icon:'🌼',fits:['floor','shelf'],price:0,text:'A clay pot of happy daisies.'},
  {id:'fern-pot',name:'Potted fern',icon:'🪴',fits:['floor'],price:30,text:'Big leafy green.'},
  {id:'sunflower-vase',name:'Sunflower vase',icon:'🌻',fits:['floor'],price:55,text:'Tall sunflowers in a blue vase.'},
  {id:'tulip-vase',name:'Tulip vase',icon:'🌷',fits:['shelf','floor'],price:40,text:'Pink tulips in a little vase.'},
  {id:'hay-bale',name:'Hay bale seat',icon:'🌾',fits:['floor'],price:25,text:'Somewhere to sit and chat.'},
  {id:'bench',name:'Garden bench',icon:'🪑',fits:['floor'],price:120,text:'A painted wooden bench.'},
  {id:'horse-ball',name:'Horse play ball',icon:'⚽',fits:['floor'],price:60,text:'A big bouncy toy ball.'},
  {id:'rug-check',name:'Checked rug',icon:'🟥',fits:['rug'],price:70,text:'Red and cream checks under the straw.'},
  {id:'rug-round',name:'Round blue rug',icon:'🔵',fits:['rug'],price:90,text:'A cosy round rug.'},
  {id:'rug-braided',name:'Braided rag rug',icon:'🧶',fits:['rug'],price:80,text:'Rings of soft, colourful braids.'},
  {id:'rug-runner',name:'Striped runner',icon:'🟦',fits:['rug'],price:75,text:'A long rug in blue, gold and red stripes.'},
  {id:'rug-teddy',name:'Teddy bear rug',icon:'🧸',fits:['rug'],price:130,text:'A smiling brown bear face. Very huggable.'},
  {id:'rug-polar',name:'Polar bear rug',icon:'🐻‍❄️',fits:['rug'],price:150,text:'A snowy-white bear face with a big smile.'},
  {id:'candle-jar',name:'Candle jar',icon:'🕯️',fits:['shelf'],price:25,text:'A safe little glass candle.'},
  {id:'trophy',name:'Golden trophy',icon:'🏆',fits:['shelf'],price:150,text:'For the shelf of champions.'},
  {id:'tiny-cactus',name:'Tiny cactus',icon:'🌵',fits:['shelf'],price:20,text:'Small, spiky, very low care.'}
];
// Pixel icon per item (assets/icons, 2026-11-10); icon stays as the emoji fallback.
const DECOR_PX={'meadow-painting':'decor-meadow','sunset-painting':'decor-sunset','horse-portrait':'decor-portrait','night-painting':'decor-starry',horseshoe:'decor-horseshoe','rosette-blue':'decor-rosette-blue','rosette-gold':'decor-rosette-gold',shelf:'decor-shelf','name-plaque':'decor-plaque',wreath:'decor-wreath',bunting:'decor-bunting','fairy-lights':'decor-fairy','hanging-lantern':'decor-lantern','daisy-pot':'decor-daisy','fern-pot':'decor-fern','sunflower-vase':'decor-sunflower','tulip-vase':'decor-tulip','hay-bale':'decor-hayseat',bench:'decor-bench','horse-ball':'decor-ball','rug-check':'decor-rug-check','rug-round':'decor-rug-round','rug-braided':'decor-rug-braided','rug-runner':'decor-rug-runner','rug-teddy':'decor-rug-teddy','rug-polar':'decor-rug-polar','candle-jar':'decor-candle',trophy:'trophy','tiny-cactus':'decor-cactus'};
CATALOG.forEach(i=>{i.px=DECOR_PX[i.id];});
export const ITEM=Object.fromEntries(CATALOG.map(i=>[i.id,i]));
export const STARTERS=CATALOG.filter(i=>!i.price).map(i=>i.id);

// Slot positions live in stall-scene.js; here only ids, types and labels. Shelf slots need a placed shelf.
export const SLOTS=[
  {id:'wall-1',type:'wall',label:'Wall · far left'},
  {id:'wall-2',type:'wall',label:'Wall · left'},
  {id:'wall-3',type:'wall',label:'Wall · right'},
  {id:'wall-4',type:'wall',label:'Wall · far right'},
  {id:'beam-1',type:'beam',label:'Beam · left'},
  {id:'beam-2',type:'beam',label:'Beam · right'},
  {id:'door',type:'door',label:'Stall door'},
  {id:'floor-1',type:'floor',label:'Floor · back left'},
  {id:'floor-2',type:'floor',label:'Floor · back right'},
  {id:'floor-3',type:'floor',label:'Floor · front left'},
  {id:'floor-4',type:'floor',label:'Floor · front right'},
  {id:'rug',type:'rug',label:'Rug'},
  {id:'shelf-1',type:'shelf',label:'Shelf · left',needs:'shelf'},
  {id:'shelf-2',type:'shelf',label:'Shelf · right',needs:'shelf'}
];
export const SLOT=Object.fromEntries(SLOTS.map(s=>[s.id,s]));

// A new stall: starters owned and already up, so it looks lived-in from the first visit.
export function freshStall(){return {v:1,owned:[...STARTERS],placed:{'wall-2':'meadow-painting','door':'name-plaque','floor-1':'daisy-pot','wall-4':'horseshoe'}};}

export const fits=(itemId,slotId)=>!!ITEM[itemId]&&!!SLOT[slotId]&&ITEM[itemId].fits.includes(SLOT[slotId].type);
// Where the shelf hangs (its wall slot), or null.
export const shelfHost=stall=>Object.keys(stall.placed).find(k=>stall.placed[k]==='shelf')||null;
// Slots you can use right now (shelf-top slots only while a shelf is up). Each has {host} for shelf slots.
export function openSlots(stall){const host=shelfHost(stall);return SLOTS.filter(s=>!s.needs||host).map(s=>s.needs?{...s,host}:s);}
export const owns=(stall,itemId)=>stall.owned.includes(itemId);
export const slotOf=(stall,itemId)=>Object.keys(stall.placed).find(k=>stall.placed[k]===itemId)||null;

// Clean anything loaded from storage: unknown items/slots dropped, starters always owned, one slot per item,
// only owned items that fit, shelf-top items cleared when there's no shelf.
export function normalizeStall(raw){const s=freshStall();if(!raw||typeof raw!=='object')return s;
  const owned=[...new Set([...STARTERS,...(Array.isArray(raw.owned)?raw.owned:[]).filter(id=>typeof id==='string'&&ITEM[id])])];
  const placed={},used=new Set();
  const src=raw.placed&&typeof raw.placed==='object'&&!Array.isArray(raw.placed)?raw.placed:s.placed;
  for(const sl of SLOTS){const id=src[sl.id];if(typeof id==='string'&&owned.includes(id)&&fits(id,sl.id)&&!used.has(id)){placed[sl.id]=id;used.add(id);}}
  const out={v:1,owned,placed};
  if(!shelfHost(out))for(const sl of SLOTS)if(sl.needs)delete out.placed[sl.id];
  return out;}

// Owned items that fit a slot (whether or not they're up somewhere else), store order.
export function itemsForSlot(stall,slotId){return CATALOG.filter(i=>owns(stall,i.id)&&fits(i.id,slotId));}
// Items in the store that would fit a slot type but you don't own yet.
export function shopFor(stall,type){return CATALOG.filter(i=>!owns(stall,i.id)&&(!type||i.fits.includes(type)));}

// Buy with Trotties. Returns {ok,stall,cost} or {ok:false,reason,short}. The caller takes the coins.
export function buy(stall,coins,itemId){const it=ITEM[itemId];if(!it)return {ok:false,reason:'That item isn’t in the store'};
  if(owns(stall,itemId))return {ok:false,reason:`You already have the ${it.name.toLowerCase()}`};
  const have=Math.max(0,Math.floor(Number(coins)||0));if(have<it.price)return {ok:false,reason:'Not enough Trotties',short:it.price-have};
  return {ok:true,cost:it.price,stall:{...stall,owned:[...stall.owned,itemId],placed:{...stall.placed}}};}

// Put an owned item in a slot. If it's already up elsewhere it moves; whatever was in the slot comes down.
export function place(stall,slotId,itemId){const sl=SLOT[slotId];if(!sl)return {ok:false,reason:'No such spot'};
  if(!owns(stall,itemId))return {ok:false,reason:'You don’t own that yet'};
  if(!fits(itemId,slotId))return {ok:false,reason:`The ${ITEM[itemId].name.toLowerCase()} doesn’t go there`};
  if(sl.needs&&!shelfHost(stall))return {ok:false,reason:'Hang a shelf first'};
  const placed={...stall.placed},from=slotOf(stall,itemId);if(from)delete placed[from];placed[slotId]=itemId;
  return {ok:true,moved:from,stall:normalizeStall({...stall,placed})};}

export function remove(stall,slotId){if(!stall.placed[slotId])return {ok:false,reason:'Nothing there'};
  const placed={...stall.placed};delete placed[slotId];return {ok:true,stall:normalizeStall({...stall,placed})};}

export function loadStall(store=globalThis.localStorage){try{return normalizeStall(JSON.parse(store.getItem(STALL_KEY)));}catch{return freshStall();}}
export function saveStall(stall,store=globalThis.localStorage){try{store.setItem(STALL_KEY,JSON.stringify(stall));return true;}catch{return false;}}
