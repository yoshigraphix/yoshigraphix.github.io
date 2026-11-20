// The wild lands: endless terrain beyond the hand-made valley. Pure functions (no Three.js), shared by the
// 3D world (chunk streaming in world.js), movement/collision (world-logic.mjs) and tests.
//  · The valley (|x|,|z| < 100) is unchanged; from 100 to 130 it blends into the wild.
//  · Biomes come from two slow noise fields (warmth, dryness): meadow, pine forest, snowland, desert.
//  · Mountain ranges rise where a third field is high. Their steep slopes are blocked, so you go round
//    them or take a road: every road cuts a low pass straight through.
//  · Roads run north–south and east–west every 180 units with a gentle wobble. Four leave the valley.
// Everything is seeded by position, so the same hill is always in the same place.
import {CLOUDSTEP} from './world-cloudstep.mjs?v=162';
export const VALLEY=300,/* was 100: the nine regions (world-regions.mjs) */BLEND=30,ROAD_EVERY=180,ROAD_HALF=2.6;

function hash(ix,iz,s=0){let h=Math.imul(ix|0,374761393)^Math.imul(iz|0,668265263)^Math.imul(s|0,1442695041);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;}
const fade=t=>t*t*(3-2*t);
export function noise(x,z,s=0){const ix=Math.floor(x),iz=Math.floor(z),fx=fade(x-ix),fz=fade(z-iz);
  const a=hash(ix,iz,s),b=hash(ix+1,iz,s),c=hash(ix,iz+1,s),d=hash(ix+1,iz+1,s);return a+(b-a)*fx+(c-a)*fz+(a-b-c+d)*fx*fz;}
function fbm(x,z,s,oct=3){let v=0,amp=.5,f=1,sum=0;for(let i=0;i<oct;i++){v+=noise(x*f,z*f,s+i*17)*amp;sum+=amp;amp*=.5;f*=2.03;}return v/sum;}
const smooth=(a,b,v)=>{const t=Math.min(1,Math.max(0,(v-a)/(b-a)));return t*t*(3-2*t);};
// Seeded random numbers for one chunk (props).
export function rng(...seed){let h=seed.reduce((a,v,i)=>Math.imul(a^(Math.round(v)+i*977),2654435761)>>>0,2166136261)||1;return ()=>{h^=h<<13;h>>>=0;h^=h>>>17;h^=h<<5;h>>>=0;return h/4294967296;};}

// 0 inside the valley, 1 in the full wild.
export function wildness(x,z){return smooth(VALLEY,VALLEY+BLEND,Math.max(Math.abs(x),Math.abs(z)));}

// Roads: x = k·180 + wobble(z) and z = k·180 + wobble(x). Distance to the nearest one.
const wobble=(t,k)=>22*Math.sin(t*.011+k*1.7)+8*Math.sin(t*.031+k*.6);
export function roadX(k,z){return k*ROAD_EVERY+wobble(z,k);}
export function roadZ(k,x){return k*ROAD_EVERY+wobble(x,k+40);}
export function roadDistance(x,z){const kx=Math.round(x/ROAD_EVERY),kz=Math.round(z/ROAD_EVERY);let d=Infinity;
  for(let k=kx-1;k<=kx+1;k++)d=Math.min(d,Math.abs(x-roadX(k,z))*.92);
  for(let k=kz-1;k<=kz+1;k++)d=Math.min(d,Math.abs(z-roadZ(k,x))*.92);
  return d;}

// Biome weights at a point (they sum to 1); `biomeAt` picks the strongest.
export const BIOMES={
  meadow:{name:'Rolling Meadows',ground:['#93c27a','#9bc77e','#a3ca83','#8db975'],sky:'#c8e6e5'},
  forest:{name:'Whispering Pines',ground:['#6fa15f','#78aa66','#699a5a','#7fae6a'],sky:'#bfdcd6'},
  snow:{name:'Frostfall Snowlands',ground:['#eef3f6','#e4ecf1','#f6f8fa','#dbe6ee'],sky:'#dde9f1'},
  desert:{name:'Sunbaked Dunes',ground:['#e6cf98','#ecd7a4','#dfc48a','#f0dcae'],sky:'#f1e2c4'}
};
export function climate(x,z){return {warm:fbm(x*.0021+311,z*.0021-57,3,3),dry:fbm(x*.0024-93,z*.0024+141,9,3)};}
export function biomeAt(x,z){if(wildness(x,z)<.5)return 'valley';const {warm,dry}=climate(x,z);
  if(warm<.4)return 'snow';if(warm>.58&&dry>.52)return 'desert';if(dry<.44)return 'forest';return 'meadow';}

// Mountain strength 0..1 (ranges), shrinking to nothing along roads so every road is a pass.
export function mountainMask(x,z){const w=wildness(x,z);if(!w)return 0;const m=smooth(.56,.74,fbm(x*.0042+17,z*.0042-29,5,3));
  // No wild range crowds Cloudstep: it stands alone above the plain.
  return m*w*smooth(6,34,roadDistance(x,z))*smooth(CLOUDSTEP.R0+15,CLOUDSTEP.R0+90,Math.hypot(x-CLOUDSTEP.cx,z-CLOUDSTEP.cz));}
function ridge(x,z){const n=fbm(x*.016,z*.016,21,3);return 1-Math.abs(2*n-1);}
// Height of the wild land (before blending with the valley).
export function wildHeight(x,z){const b=biomeAt(x,z),hills=(fbm(x*.011,z*.011,33,3)-.5)*7,dunes=b==='desert'?Math.sin(x*.07+Math.sin(z*.03)*2)*1.1:0;
  const road=smooth(2,12,roadDistance(x,z)),m=mountainMask(x,z);
  return (hills+dunes)*(.25+.75*road)+m*(6+34*ridge(x,z));}
// Blocked: the steep part of a mountain (feet and horses stay on the lower slopes).
export function wildBlocked(x,z){return mountainMask(x,z)>.45;}
// Blend helper for terrainHeight(): valley height inside, wild height outside.
export function blendHeight(valleyHeight,x,z){const w=wildness(x,z);return w?valleyHeight*(1-w)+wildHeight(x,z)*w:valleyHeight;}
