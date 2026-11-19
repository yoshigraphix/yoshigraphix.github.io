// v159 (Yoshi: "How do you actually climb up the clock or into the trees… I wanted to actually be able to explore"):
// raised floors you can really walk on: treetop decks, rope bridges, spiral stairs, the clock tower's lookout gallery.
// Pure logic (no three.js) so the tests can walk it.
//
// A surface is one of:
//   {kind:'disc',x,z,r,y,hole?,gap?}               a round deck (hole: the trunk through it; gap [a0,a1]: a stairwell)
//   {kind:'rect',x,z,hx,hz,y}                       a room's floor (axis-aligned)
//   {kind:'ring',x,z,hx,hz,inner,y}                 a square gallery round a tower: inside hx×hz, outside inner×inner
//   {kind:'strip',ax,az,ay,bx,bz,by,w,sag?,pad?}    a bridge/ramp from a to b, w wide; sag dips the middle (rope bridge)
//   {kind:'helix',x,z,r0,r1,a0,a1,y0,y1}            a spiral stair round a trunk, angle a0→a1 (radians, a1>a0)
// Each may carry `block:[{x,z,r}]` (a little house on the deck, furniture) and an id; `foot:true` = you can step onto it
// from the ground (a doorstep ramp).
// at(x,z,cur) picks the surface under (x,z) whose height is within STEP of cur (the highest, if several).

export const STEP=.65;

// pad: metres the walkable strip reaches past each end (onto the deck it joins), level with that end.
function stripH(s,x,z){const dx=s.bx-s.ax,dz=s.bz-s.az,L2=dx*dx+dz*dz||1,L=Math.sqrt(L2),e=(s.pad||0)/L,t=((x-s.ax)*dx+(z-s.az)*dz)/L2;if(t<-e||t>1+e)return null;
  const px=s.ax+dx*t,pz=s.az+dz*t;if(Math.hypot(x-px,z-pz)>s.w/2)return null;const u=Math.max(0,Math.min(1,t));return s.ay+(s.by-s.ay)*u-(s.sag||0)*Math.sin(u*Math.PI);}
const inArc=(a,[a0,a1])=>{let u=a-a0;u-=Math.floor(u/(Math.PI*2))*Math.PI*2;return u<=a1-a0;};

// All heights this surface has at (x,z) (a helix can pass over the same spot more than once).
export function surfaceHeights(s,x,z){
  if(s.block)for(const b of s.block)if(Math.hypot(x-b.x,z-b.z)<b.r)return [];
  if(s.kind==='disc'){const d=Math.hypot(x-s.x,z-s.z);if(d>s.r||d<(s.hole||0))return [];if(s.gap&&inArc(Math.atan2(z-s.z,x-s.x),s.gap))return [];return [s.y];}
  if(s.kind==='rect')return Math.abs(x-s.x)<=s.hx&&Math.abs(z-s.z)<=s.hz?[s.y]:[];
  if(s.kind==='ring'){const ax=Math.abs(x-s.x),az=Math.abs(z-s.z);return ax<=s.hx&&az<=s.hz&&(ax>s.inner||az>s.inner)?[s.y]:[];}
  if(s.kind==='strip'){const h=stripH(s,x,z);return h==null?[]:[h];}
  if(s.kind==='helix'){const d=Math.hypot(x-s.x,z-s.z);if(d<s.r0||d>s.r1)return [];const out=[],a=Math.atan2(z-s.z,x-s.x);
    for(let k=-3;k<=6;k++){const t=a+k*Math.PI*2;if(t>=s.a0-.02&&t<=s.a1+.02)out.push(s.y0+(s.y1-s.y0)*(Math.min(s.a1,Math.max(s.a0,t))-s.a0)/(s.a1-s.a0));}return out;}
  return [];}

export function createHeights(){
  const surfaces=[];
  // cur: the walker's height now. Returns {y,s} or null.
  // Where two floors overlap within a step (the foot of a stair on a deck), the higher one wins: you step up onto it.
  function at(x,z,cur,step=STEP){let best=null;for(const s of surfaces)for(const h of surfaceHeights(s,x,z)){if(Math.abs(h-cur)<=step&&(!best||h>best.y))best={y:h,s};}return best;}
  return {surfaces,add(s){surfaces.push(s);return s;},at,
    // One walking step while up. ground(x,z) is the terrain height. Tries the full step, then each axis alone (so you
    // slide along a rail instead of sticking). Steps off the bottom of a stair onto the ground when the ground is level
    // with you. Returns {x,z,y,down} (down: you are back on the ground).
    step(pos,cur,nx,nz,ground){
      for(const [x,z] of [[nx,nz],[nx,pos.z],[pos.x,nz]]){if(x===pos.x&&z===pos.z)continue;
        const hit=at(x,z,cur);if(hit)return {x,z,y:hit.y,s:hit.s,down:false};
        const g=ground(x,z);if(Math.abs(g-cur)<.35)return {x,z,y:g,down:true};}
      return {x:pos.x,z:pos.z,y:cur,down:false,stuck:true};},
    // From the ground: is there a stair foot here, level with the ground?
    foot(x,z,groundY){const hit=at(x,z,groundY,.3);return hit&&hit.s.foot?hit:null;}};
}
