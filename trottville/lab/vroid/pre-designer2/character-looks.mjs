import {normalizeStreak} from './riding.mjs';
// Character looks, the outfit catalogue and the wallet. Pure data and rules (no DOM, no Three.js), so the
// world, the steeplechase and the designer all agree, and tests can run it in Node.
// Coins are earned by playing. Stars come only from Trottville Game Cards. Real card sales are NOT switched on:
// this prototype only accepts the practice codes below, saved on this device.

// Skin: twelve tones light → deep, warm and cool. The six original values stay in the list so saved looks keep theirs.
export const SKINS=['#fff0e6','#fbe3cf','#f7d5c2','#f3cfae','#e3b48c','#d19f74','#c98f63','#ae7650','#9a6544','#7d4f36','#6e4630','#4f3122'];
// 39 hair styles: [id, name, group]. Original ids (spiky, swept, bob, ponytail, twinbuns, long, curly) are unchanged.
export const HAIR_GROUPS=[['short','Short'],['medium','Medium'],['long','Long'],['updo','Braids & updos'],['textured','Textured']];
export const HAIR_STYLES=[
  ['pixie','Pixie','short'],['buzz','Buzz cut','short'],['spiky','Spiky hero','short'],['swept','Side part','short'],['quiff','Quiff','short'],
  ['slick','Slick back','short'],['undercut','Undercut','short'],['mohawk','Mohawk','short'],['bowl','Bowl cut','short'],
  ['bob','Bob','medium'],['lob','Lob','medium'],['curtains','Curtains','medium'],['shag','Shag','medium'],['wolf','Wolf cut','medium'],['mullet','Mullet','medium'],['hime','Hime cut','medium'],
  ['long','Long straight','long'],['longwavy','Long wavy','long'],['beach','Beach waves','long'],['longbangs','Long with bangs','long'],['drills','Drill curls','long'],['halfup','Half-up','long'],
  ['ponytail','High ponytail','updo'],['lowpony','Low ponytail','updo'],['sidepony','Side ponytail','updo'],['pigtails','Pigtails','updo'],['twinbuns','Double buns','updo'],
  ['topknot','Top knot','updo'],['manbun','Man bun','updo'],['braids','Twin braids','updo'],['fishtail','Fishtail braid','updo'],['crown','Crown braid','updo'],
  ['curly','Curly','textured'],['afro','Afro','textured'],['puffs','Afro puffs','textured'],['boxbraids','Box braids','textured'],['cornrows','Cornrows','textured'],['locs','Locs','textured'],['twists','Twists','textured']];
// The 3D rider has three hair models so far (2026-11-12): every style draws the nearest one. Long styles (and the hime
// cut) → Arisa's long hair, ponytails/braids/buns → the bun, everything else → the bob.
export const hairModelOf=id=>{const g=(HAIR_STYLES.find(h=>h[0]===id)||[])[2];return g==='long'||id==='hime'?'long':g==='updo'?'bun':'bob';};
// Natural blacks, browns, auburn, blondes, greys and white, then fun colours. The first nine are the original palette.
export const HAIR_COLORS=['#5a3b2a','#2a2230','#e8c46a','#f19ab6','#d9dde6','#5b8fd6','#c4473a','#a98ad8','#7fcfb3',
  '#14121a','#3b2a22','#8a5a3a','#a8452e','#c88a4a','#f2dc9a','#9a9aa2','#f6f4ee','#f28a3a','#3fa39a','#e05a8a'];
// Skin vs hair on the 3D rider (Yoshi 2026-11-12: "dark skin and dark hair looks horrible"). The hair shader darkens
// the chosen colour, so brown or auburn hair on a deep skin tone melts into the face. Only what is DRAWN changes (the
// saved look keeps the colour picked): when skin is deep and the hair is a brown of a similar depth (reds, ginger and caramel stay as picked), the hair
// is drawn as a cool, near-black version of itself; the very deepest skin is drawn a touch lighter so even black hair
// stands apart from the face.
const rgbOf=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),hexOf=c=>'#'+c.map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')).join('');
const linC=c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;};
export const lumaOf=h=>{const [r,g,b]=rgbOf(h).map(linC);return .2126*r+.7152*g+.0722*b;};
const contrastOf=(a,b)=>{const x=lumaOf(a),y=lumaOf(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
const mixHex=(a,b,t)=>{const p=rgbOf(a),q=rgbOf(b);return hexOf(p.map((v,i)=>v+(q[i]-v)*t));};
export function drawnSkin(skin){return lumaOf(skin)<.06?mixHex(skin,'#7a5038',.4):skin;}
export function drawnHair(skin,hair){const s=drawnSkin(skin),[r,g,b]=rgbOf(hair),warm=r>=g&&g>=b-8&&r-b>18&&(r-b)/r<.6&&lumaOf(hair)<.2;
  if(lumaOf(s)>=.25||!warm||lumaOf(hair)>lumaOf(s)*2.2)return hair;
  // Darken towards a cool black until the hair (as the shader draws it, about 70% of the colour) is well apart.
  for(let t=.35;t<=1.001;t+=.05){const c=mixHex(hair,'#121019',t);if(contrastOf(s,mixHex(c,'#000000',.3))>=2.4)return c;}
  return '#121019';}
// Optional second colour on the hair tips (ombré): none, or any hair colour.
export const HAIR_TIPS=['none',...HAIR_COLORS];
export const EYE_SHAPES=[['round','Round'],['gentle','Gentle'],['sharp','Sharp'],['sleepy','Sleepy'],['sparkle','Sparkle']];
export const EYE_COLORS=['#6b4430','#3d6fb8','#3f8a55','#8a5ac8','#c0473a','#d9a227','#2a2230'];
export const NOSES=[['dot','Dot'],['button','Button'],['line','Line'],['none','None']];
export const NOSE_SIZES=[['s','Small'],['m','Medium'],['l','Large']];
export const MOUTHS=[['smile','Smile'],['grin','Grin'],['cat','Cat'],['o','Oh!'],['smirk','Smirk']];
// Makeup: subtle anime touches, all free. 'none' switches each one off.
export const BLUSHES=['none','#f4a0a6','#f7b3c2','#f2a07a','#e88a9a','#d98aa8'];
export const EYESHADOWS=['none','#c9a0dc','#f2b8c6','#e8c48a','#9fc8e8','#a8d8b0','#c79a7a'];
export const LIPS=['none','#e86a7a','#d9506a','#f29a8a','#c0607a','#b8505a'];
export const LINERS=[['none','None'],['soft','Soft'],['winged','Winged']];
export const FACES=[['round','Round'],['soft','Soft oval'],['heart','Heart']];

// Outfits. tier: free | coins | card (stars). Colours: top, trim, bottom, boots. Parts drive the 3D model.
export const OUTFITS=[
  {id:'stablehand',name:'Stable Hand',tier:'free',price:0,top:'tunic',bottom:'pants',boots:'boots',extras:['belt'],colors:{top:'#5f9a5a',trim:'#f2d38a',bottom:'#d9c7a2',boots:'#6b4a32'}},
  {id:'meadow',name:'Meadow Dress',tier:'free',price:0,top:'dress',bottom:'tights',boots:'shoes',extras:[],colors:{top:'#f2a3b8',trim:'#fff6e2',bottom:'#fff0e6',boots:'#c96a7f'}},
  {id:'trail',name:'Trail Rider',tier:'coins',price:300,races:true,top:'jacket',bottom:'jodhpurs',boots:'tall',extras:[],colors:{top:'#4f7bc4',trim:'#f4efe2',bottom:'#efe4cc',boots:'#3a2c26'}},
  {id:'show',name:'Show Jacket',tier:'coins',price:1500,races:true,shows:true,top:'jacket',bottom:'jodhpurs',boots:'tall',extras:['belt'],hat:'helmet',colors:{top:'#1f2a44',trim:'#ffffff',bottom:'#f8f6f0',boots:'#1d1a18'}},
  {id:'showrider',name:'Show Rider',tier:'free',price:0,races:true,shows:true,top:'jacket',bottom:'breeches',boots:'tall',extras:['gloves','buttons','lapels'],hat:'helmet',colors:{top:'#2b3553',trim:'#f4efe2',bottom:'#c4a27a',boots:'#4f3226',gloves:'#5a3b2c',hat:'#273049'}},
  {id:'casual',name:'Bomber & Joggers',tier:'free',price:0,top:'bomber',bottom:'joggers',boots:'sneakers',extras:[],colors:{top:'#7d9460',trim:'#efe6d6',bottom:'#5c3346',boots:'#efe9da',accent:'#7d9460'}},
  {id:'hoodie',name:'Comfy Hoodie',tier:'free',price:0,top:'hoodie',bottom:'shorts',boots:'shoes',extras:[],colors:{top:'#f2b632',trim:'#fff6e2',bottom:'#5a6a8a',boots:'#f4f1e6'}},
  {id:'silks',name:'Racing Silks',tier:'coins',price:150,top:'silks',bottom:'jodhpurs',boots:'tall',extras:[],hat:'helmet',colors:{top:'#2f6b3a',trim:'#f2b632',bottom:'#f4efe2',boots:'#2e2622'}},
  {id:'ranger',name:'Ranger Cape',tier:'coins',price:300,top:'tunic',bottom:'pants',boots:'tall',extras:['cape','belt','satchel'],colors:{top:'#6b8a3a',trim:'#c9a24a',bottom:'#5a4632',boots:'#4a3424',cape:'#3f6a3a'}},
  {id:'starlight',name:'Starlight Scarf',tier:'coins',price:400,top:'tunic',bottom:'pants',boots:'boots',extras:['scarf','belt'],colors:{top:'#2f3f6e',trim:'#e8c46a',bottom:'#3a3a4a',boots:'#2a2230',scarf:'#d0453c'}},
  {id:'orchard',name:'Orchard Overalls',tier:'coins',price:250,top:'overalls',bottom:'pants',boots:'boots',extras:[],colors:{top:'#f4efe2',trim:'#d9534a',bottom:'#4f7bc4',boots:'#7a5236'}},
  {id:'sailor',name:'Lighthouse Sailor',tier:'coins',price:350,top:'sailor',bottom:'skirt',boots:'shoes',extras:[],hat:'beret',colors:{top:'#f8f6f0',trim:'#2f4f8a',bottom:'#2f4f8a',boots:'#c94a4a'}},
  {id:'knight',name:'Royal Knight',tier:'card',price:900,top:'armor',bottom:'pants',boots:'tall',extras:['cape','pauldrons','belt'],hat:'circlet',colors:{top:'#c9d1dc',trim:'#e0b84a',bottom:'#3a4a7a',boots:'#5a6478',cape:'#2f4fa8'}},
  {id:'mage',name:'Crystal Mage',tier:'card',price:1200,top:'robe',bottom:'tights',boots:'shoes',extras:['scarf','pauldrons'],hat:'circlet',colors:{top:'#f4f1fb',trim:'#7c5cd6',bottom:'#e6def8',boots:'#7c5cd6',scarf:'#9fd8f0'}},
  {id:'skypirate',name:'Sky Pirate',tier:'card',price:1000,top:'jacket',bottom:'pants',boots:'tall',extras:['scarf','belt','satchel'],colors:{top:'#7a2f3a',trim:'#e0b84a',bottom:'#2a2a34',boots:'#3a2a22',scarf:'#f2e6c8'}},
  {id:'moonlit',name:'Moonlit Dancer',tier:'card',price:1100,top:'dress',bottom:'tights',boots:'shoes',extras:['cape'],hat:'circlet',colors:{top:'#3a3f8a',trim:'#d9dde6',bottom:'#2a2e5a',boots:'#d9dde6',cape:'#8fa6e8'}},
  {id:'champion',name:'Golden Champion',tier:'card',price:2000,top:'silks',bottom:'jodhpurs',boots:'tall',extras:['cape','pauldrons'],hat:'helmet',colors:{top:'#e0b84a',trim:'#fff6e2',bottom:'#fff6e2',boots:'#3a2a22',cape:'#c4473a'}}
];

// Gear (v71): cheap useful things, not outfits. Bought with Trotties, kept in wallet.owned beside outfits.
// The poncho goes on by itself when it rains outdoors (world.js), over any outfit; its hood stays down so a helmet fits.
export const GEAR_ITEMS=[{id:'poncho',name:'Rain Poncho',price:40}];
const knownItem=id=>OUTFITS.some(o=>o.id===id)||GEAR_ITEMS.some(g=>g.id===id);
export function buyGear(w,id){const g=GEAR_ITEMS.find(x=>x.id===id);if(!g)return {ok:false,reason:'Unknown item'};if(w.owned.includes(id))return {ok:true,wallet:w};
  if(w.coins<g.price)return {ok:false,reason:'Not enough Trotties',short:g.price-w.coins,purse:'coins'};
  return {ok:true,wallet:{...w,coins:w.coins-g.price,owned:[...w.owned,id]}};}

// Game Cards: the face value in dollars and the stars it adds (1 star = 1¢). Bigger cards carry a bonus.
// Must match the server's list in supabase/functions/_shared/cards.js (tests/payments-check.mjs checks).
export const GAME_CARDS=[{id:'card5',dollars:5,stars:500,bonus:''},{id:'card10',dollars:10,stars:1000,bonus:''},{id:'card25',dollars:25,stars:2500,bonus:''},{id:'card50',dollars:50,stars:5500,bonus:'+10% bonus'},{id:'card100',dollars:100,stars:12000,bonus:'+20% bonus'}];
// Practice codes for this prototype only (no money involved). A real system validates codes on the server.
const PRACTICE_CODES={'TROT-PLAY-0025':2500,'TROT-PLAY-0050':5500,'TROT-PLAY-0100':12000};

export const DEFAULT_LOOK={face:'round',skin:'#f3cfae',hair:'swept',hairColor:HAIR_COLORS[0],hairTip:'none',eyes:'round',eyeColor:EYE_COLORS[0],nose:'dot',noseSize:'m',mouth:'smile',
  blush:'#f4a0a6',eyeshadow:'none',lips:'none',liner:'none',freckles:false,mole:false,outfit:'stablehand',
  frame:'classic',height:0,build:0,shoulders:0,hips:0};
// Body (2026-11-10 prototype, Yoshi's turnaround sheet): frame 'tall' is the new ~6½-heads-tall anime body; 'classic' is
// the original. height, build, shoulders and hips are sliders from -1 to 1 (0 = average).
export const FRAMES=[['classic','Classic'],['tall','Tall (new)']];
export const LOOK_KEY='trottville-look-v1',WALLET_KEY='trottville-wallet-v1';

const pick=(v,list,fallback)=>list.some(x=>(Array.isArray(x)?x[0]:x)===v)?v:fallback;
export function normalizeLook(raw){const l=raw&&typeof raw==='object'?raw:{};const d=DEFAULT_LOOK;
  const flag=(v,f)=>v===true||v==='true'?true:v===false||v==='false'?false:f;
  return {face:pick(l.face,FACES,d.face),skin:pick(l.skin,SKINS,d.skin),hair:pick(l.hair,HAIR_STYLES,d.hair),hairColor:pick(l.hairColor,HAIR_COLORS,d.hairColor),hairTip:pick(l.hairTip,HAIR_TIPS,d.hairTip),
    eyes:pick(l.eyes,EYE_SHAPES,d.eyes),eyeColor:pick(l.eyeColor,EYE_COLORS,d.eyeColor),nose:pick(l.nose,NOSES,d.nose),noseSize:pick(l.noseSize,NOSE_SIZES,d.noseSize),mouth:pick(l.mouth,MOUTHS,d.mouth),
    blush:pick(l.blush,BLUSHES,d.blush),eyeshadow:pick(l.eyeshadow,EYESHADOWS,d.eyeshadow),lips:pick(l.lips,LIPS,d.lips),liner:pick(l.liner,LINERS,d.liner),
    freckles:flag(l.freckles,d.freckles),mole:flag(l.mole,d.mole),
    outfit:OUTFITS.some(o=>o.id===l.outfit)?l.outfit:d.outfit,
    frame:pick(l.frame,FRAMES,d.frame),height:slide(l.height),build:slide(l.build),shoulders:slide(l.shoulders),hips:slide(l.hips)};}
const slide=v=>{const n=Number(v);return Number.isFinite(n)?Math.max(-1,Math.min(1,Math.round(n*20)/20)):0;};
export const outfitOf=look=>OUTFITS.find(o=>o.id===look.outfit)||OUTFITS[0];

// A stable "random" look from any string (other riders, the computer rival).
export function lookFromSeed(seed){let h=2166136261;for(const c of String(seed))h=Math.imul(h^c.charCodeAt(0),16777619);const r=()=>((h=Math.imul(h^h>>>15,2246822507)>>>0)%1000)/1000;
  const one=list=>{const x=list[Math.floor(r()*list.length)];return Array.isArray(x)?x[0]:x;};
  // Makeup and tips show up now and then, not on everyone.
  const some=(list,p)=>r()<p?one(list.filter(x=>x!=='none')):'none';
  return normalizeLook({face:one(FACES),skin:one(SKINS),hair:one(HAIR_STYLES),hairColor:one(HAIR_COLORS),hairTip:some(HAIR_TIPS,.15),eyes:one(EYE_SHAPES),eyeColor:one(EYE_COLORS),
    nose:one(NOSES),noseSize:one(NOSE_SIZES),mouth:one(MOUTHS),blush:some(BLUSHES,.7),eyeshadow:some(EYESHADOWS,.25),lips:some(LIPS,.25),liner:r()<.3?one(LINERS.slice(1)):'none',
    freckles:r()<.2,mole:r()<.1,outfit:one(OUTFITS.filter(o=>o.tier!=='card').map(o=>o.id))});}

export function freshWallet(){return {coins:200,stars:0,owned:OUTFITS.filter(o=>o.tier==='free').map(o=>o.id),redeemed:[],pending:[],playLog:null,streak:normalizeStreak(null)};}
export function normalizeWallet(raw){const w=freshWallet();if(!raw||typeof raw!=='object')return w;
  w.coins=Math.max(0,Math.floor(Number(raw.coins)||0));w.stars=Math.max(0,Math.floor(Number(raw.stars)||0));
  w.owned=[...new Set([...w.owned,...(Array.isArray(raw.owned)?raw.owned:[]).filter(knownItem)])];
  w.redeemed=Array.isArray(raw.redeemed)?raw.redeemed.filter(c=>typeof c==='string'):[];
  w.pending=Array.isArray(raw.pending)?raw.pending.filter(p=>p&&typeof p.id==='string'&&Number.isFinite(p.coins)).slice(-50):[];
  w.playLog=raw.playLog&&typeof raw.playLog==='object'&&raw.playLog.games?raw.playLog:null;w.streak=normalizeStreak(raw.streak);return w;}
export const owns=(w,id)=>w.owned.includes(id);
export function buyOutfit(w,id){const o=OUTFITS.find(x=>x.id===id);if(!o)return {ok:false,reason:'Unknown outfit'};if(owns(w,id))return {ok:true,wallet:w};
  const purse=o.tier==='card'?'stars':'coins';if(w[purse]<o.price)return {ok:false,reason:purse==='stars'?'Not enough stars':'Not enough Trotties',short:o.price-w[purse],purse};
  return {ok:true,wallet:{...w,[purse]:w[purse]-o.price,owned:[...w.owned,id]}};}
export const earnCoins=(w,n)=>({...w,coins:w.coins+Math.max(0,Math.floor(n))});
export function redeemCard(w,raw){const code=String(raw||'').toUpperCase().replace(/\s+/g,'').replace(/[^A-Z0-9-]/g,'');
  if(!PRACTICE_CODES[code])return {ok:false,reason:'That code isn’t recognised. Check the letters and dashes on the back of the card.'};
  if(w.redeemed.includes(code))return {ok:false,reason:'This card has already been used.'};
  return {ok:true,stars:PRACTICE_CODES[code],wallet:{...w,stars:w.stars+PRACTICE_CODES[code],redeemed:[...w.redeemed,code]}};}

// Device storage helpers (the steeplechase and world share them). Never throw: storage can be blocked.
export function loadLook(){try{return normalizeLook(JSON.parse(localStorage.getItem(LOOK_KEY)));}catch{return normalizeLook(null);}}
export function saveLook(look){try{localStorage.setItem(LOOK_KEY,JSON.stringify(normalizeLook(look)));}catch{}}
export function loadWallet(){try{return normalizeWallet(JSON.parse(localStorage.getItem(WALLET_KEY)));}catch{return freshWallet();}}
export function saveWallet(w){try{localStorage.setItem(WALLET_KEY,JSON.stringify(w));}catch{}}
export function addCoins(n){const w=earnCoins(loadWallet(),n);saveWallet(w);return w;}
