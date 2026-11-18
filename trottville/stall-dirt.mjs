// How messy the home stall floor is, per horse. Pure, no DOM: home-horse.js draws the mess and the rake.
// The floor fills up over DIRT_HOURS after a clean; ten rake strokes clear a full floor (fewer when it's
// only a bit messy). One number is saved per horse: the time the floor was last spotless, so a half-raked
// floor keeps its progress (each sweep moves that time forward).
export const DIRT_KEY='trottville-stall-dirt';
// Raking is ten back-and-forth strokes for a full floor (Yoshi 2026-11-12: "rake cleans the floor instantly.. i want
// it to be back and forth maybe 10 times"); each stroke takes a little of the mess away.
export const DIRT_HOURS=18,MAX_PIECES=12,SWEEPS=10;
const HOUR=36e5;
// A brand-new stall starts a bit messy so there's something to rake on day one.
export const FIRST_LEVEL=.6;

export function dirtLevel(cleanAt,now=Date.now()){if(!Number.isFinite(cleanAt))return FIRST_LEVEL;return Math.max(0,Math.min(1,(now-cleanAt)/(DIRT_HOURS*HOUR)));}
// Strokes still needed: 0 when clean, otherwise 1–10.
export const sweepsLeft=level=>level<.05?0:Math.min(SWEEPS,Math.ceil(level*SWEEPS-1e-9));
export const pieceCount=level=>sweepsLeft(level)?Math.max(2,Math.round(MAX_PIECES*sweepsLeft(level)/SWEEPS)):0;
// After one stroke: a tenth of a full floor less (never below clean).
export function afterSweep(level){const left=sweepsLeft(level)-1;return left<=0?0:left/SWEEPS;}
// The cleanAt that gives `level` right now.
export const cleanAtFor=(level,now=Date.now())=>now-level*DIRT_HOURS*HOUR;

// Where the mess lies: seeded by the horse id so it doesn't jump around between visits. Kind 'straw' (a
// trampled clump) or 'muck' (a little pile). x/z in stall floor units, in front of the horse and on screen
// even on a narrow phone.
export function piecesFor(seed='',n=MAX_PIECES){let s=0;for(const c of String(seed))s=(s*31+c.charCodeAt(0))>>>0;s=s||7;
  const rnd=()=>((s=(s*1664525+1013904223)>>>0)/4294967296),out=[];
  for(let i=0;i<n;i++){let x,z,tries=0;do{x=-1.8+rnd()*3.6;z=.9+rnd()*3.2;tries++;}while(tries<20&&out.some(p=>Math.hypot(p.x-x,p.z-z)<.55));
    out.push({x,z,kind:i%3===2?'muck':'straw',yaw:rnd()*Math.PI*2,size:.8+rnd()*.45});}
  return out;}

export function loadDirt(store=globalThis.localStorage){try{const v=JSON.parse(store.getItem(DIRT_KEY));return v&&typeof v==='object'?v:{};}catch{return {};}}
export function saveDirt(map,store=globalThis.localStorage){try{store.setItem(DIRT_KEY,JSON.stringify(map));return true;}catch{return false;}}
