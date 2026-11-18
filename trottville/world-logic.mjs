import {terrainHeight,inWater,mountainLift} from './world-content.mjs?v=157';
import {mountainMask,VALLEY} from './world-wild.mjs?v=157';
import {R} from './world-regions.mjs?v=157';
import {cloudstepBlocked} from './world-cloudstep.mjs?v=157';
import {stonePass} from './world-town.mjs?v=157';
// The Meadow Loop stays round the stables (its places moved out to the regions, so its stamps are named for the loop itself).
export const MARKERS=[{x:13,z:15,name:'The meadow gate'},{x:30,z:4,name:'The willow bend'},{x:29,z:-22,name:'The hilltop'},{x:3,z:-26,name:'The old oak'},{x:-19,z:20,name:'The home trail'}];
export const OBSTACLES=[
  {kind:'box',x:-13,z:-6,hx:7.3,hz:4.3,height:7},
  {kind:'box',x:-23,z:2,hx:.22,hz:11,height:1.5},
  {kind:'box',x:8,z:1,hx:.22,hz:12,height:1.5},
  {kind:'box',x:-13,z:13,hx:10,hz:.22,height:1.5},
  {kind:'box',x:5.5,z:13,hx:2.5,hz:.22,height:1.5},
  {kind:'box',x:-7.5,z:-10,hx:15.5,hz:.22,height:1.5},
  {kind:'lake',x:22,z:-7,rx:10.8,rz:7.6,height:100,pass:stonePass},   // Lily Lake: open along its stepping-stones, on foot
  {kind:'box',x:13,z:7,hx:2.8,hz:.35,height:.62}
].map(o=>({...o,...R(o.x,o.z)}));   // design → world (the pond moved west)
export const groundHeight=terrainHeight;
// Wild mountains are walked by steepness, not by an invisible wall: ground up to CLIMB (rise per metre, about 40°)
// can be walked or ridden up; anything steeper can't be climbed, and pushing into it slides you back down
// (world.js plays the skid and the dirt). Only the wild ranges count: Cloudstep has its own ledges and cliffs.
export const CLIMB=.85;
export function slopeAt(x,z,e=.6){const h=terrainHeight,gx=(h(x+e,z)-h(x-e,z))/(2*e),gz=(h(x,z+e)-h(x,z-e))/(2*e);return {g:Math.hypot(gx,gz),gx,gz};}
export function tooSteep(x,z){return ((Math.abs(x)>VALLEY||Math.abs(z)>VALLEY)&&mountainMask(x,z)>.02||mountainLift(x,z)>.3)&&slopeAt(x,z).g>CLIMB;}   // v103: the valley's new mountains too
export function followCameraPosition(target,yaw,pitch,distance){
  const elevation=Math.min(.8,Math.max(.08,pitch)),radius=Math.min(20,Math.max(5,distance)),horizontal=Math.cos(elevation)*radius;
  return {x:target.x+Math.sin(yaw)*horizontal,y:target.y+Math.sin(elevation)*radius,z:target.z+Math.cos(yaw)*horizontal};
}
export function movementVector(horizontal,forward,yaw){
  const length=Math.hypot(horizontal,forward);if(!length)return {x:0,z:0};
  horizontal/=Math.max(1,length);forward/=Math.max(1,length);
  return {x:horizontal*Math.cos(yaw)-forward*Math.sin(yaw),z:-horizontal*Math.sin(yaw)-forward*Math.cos(yaw)};
}
export function blocked(x,z,radius,jump=0,obstacles=OBSTACLES){
  // No edge to the world: past the valley only ground too steep to climb stops you.
  return tooSteep(x,z)||solidBlocked(x,z,radius,jump,obstacles);}
// Everything except steepness: what a slide down a steep slope still can't pass through.
export function solidBlocked(x,z,radius,jump=0,obstacles=OBSTACLES){
  // Cloudstep: only its ledges, foot and summit can be walked; the cliffs and the waterfall pool cannot.
  if(cloudstepBlocked(x,z))return true;
  // v103: rivers can only be crossed on their bridges (no jumping them either).
  if(Math.abs(x)<310&&Math.abs(z)<310&&inWater(x,z,radius*.5))return true;
  return obstacles.some(o=>{if(jump>o.height+.15)return false;if(o.kind==='lake')return o.pass?.(x,z,radius)?false:((x-o.x)/(o.rx+radius))**2+((z-o.z)/(o.rz+radius))**2<1;return Math.abs(x-o.x)<o.hx+radius&&Math.abs(z-o.z)<o.hz+radius;});
}
export function moveActor(position,vector,speed,delta,radius,jump=0,obstacles=OBSTACLES){
  const dt=Math.min(Math.max(delta,0),.05),next={x:position.x,z:position.z};
  const nx=next.x+vector.x*speed*dt;if(!blocked(nx,next.z,radius,jump,obstacles))next.x=nx;
  const nz=next.z+vector.z*speed*dt;if(!blocked(next.x,nz,radius,jump,obstacles))next.z=nz;
  return next;
}
export function normalizeStamps(value,horseIds){
  const result={};
  for(const id of horseIds){const list=value&&typeof value==='object'?value[id]:null;result[id]=Array.isArray(list)?[...new Set(list.filter(i=>Number.isInteger(i)&&i>=0&&i<MARKERS.length))]:[];}
  return result;
}
export function collectMarkers(position,visited){
  const result=[...visited];
  MARKERS.forEach((m,i)=>{if(!result.includes(i)&&Math.hypot(position.x-m.x,position.z-m.z)<2.25)result.push(i);});
  return result;
}
