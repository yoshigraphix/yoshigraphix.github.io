// Cloudstep: the grand mountain past the valley's south-west corner. Pure functions (no Three.js), shared by the
// 3D world, movement/collision, the map and tests.
//  · One wide ledge trail spirals three times round the peak, from the start arch at the foot (facing the valley)
//    to a flat summit with a lookout rock pointed at your stable. Cliffs between the laps are blocked, so the ledge
//    is the only way up; it is wide enough to race side by side.
//  · Halfway up, a waterfall slides down an alcove in the cliff into a pool beside the trail; a stream crosses the
//    ledge, cascades down the mountain's skirt and runs out across the plain to a small pond.
//  · Heights are absolute; the outer foot blends into the valley / wild ground.
export const CLOUDSTEP={cx:0,cz:-205,   // was (-92,-96) before the nine regions (world-regions.mjs 'cloudstep' block)
  R0:74,RA:64,RB:11,TURNS:3,W:3.2,RP:8.5,TOP:100,POW:1.35};
const C=CLOUDSTEP,TAU=Math.PI*2,PHI=TAU*C.TURNS;
// The trail starts on the side facing the valley and climbs anticlockwise (seen from above, +x right, +z down).
// Angles keep the design layout (old centre -92,-96 facing the stables) so the mountain moves as one rigid block.
const DX=-92-C.cx,DZ=-96-C.cz;C.theta0=Math.atan2(-(C.cz+DZ),-(C.cx+DX));

const smooth=(a,b,v)=>{const t=Math.min(1,Math.max(0,(v-a)/(b-a)));return t*t*(3-2*t);};
function hash(ix,iz){let h=Math.imul(ix|0,374761393)^Math.imul(iz|0,668265263)^1442695041;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;}
function vnoise(x,z){const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz),a=hash(ix,iz),b=hash(ix+1,iz),c=hash(ix,iz+1),d=hash(ix+1,iz+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
const rock=(x,z)=>vnoise(x*.21,z*.21)*.65+vnoise(x*.53+7,z*.53-3)*.35-.5; // -.5 … .5

// Trail radius by spiral angle φ (0 … PHI): falls fast low down, slowly near the top, so the laps stay apart.
export function trailRadius(phi){const u=phi/PHI;if(u<0)return C.RA+(C.RA-C.RB)*C.POW*(-u);return C.RB+(C.RA-C.RB)*Math.pow(1-Math.min(1,u),C.POW);}
// Height by spiral angle: a constant grade along the trail (arc length), from the foot to the summit.
const N=1200,LEN=new Float64Array(N+1);
for(let i=1;i<=N;i++){const a=(i-1)/N*PHI,b=i/N*PHI,ra=trailRadius(a),rb=trailRadius(b);LEN[i]=LEN[i-1]+Math.hypot((ra+rb)/2*(b-a),rb-ra);}
export const TRAIL_LENGTH=LEN[N];
const BASE_Y=.6;
export function trailHeight(phi){if(phi<=0)return BASE_Y;if(phi>=PHI)return C.TOP;const f=phi/PHI*N,i=Math.floor(f),l=LEN[i]+(LEN[i+1]-LEN[i])*(f-i);return BASE_Y+(C.TOP-BASE_Y)*l/TRAIL_LENGTH;}
export const trailPoint=phi=>{const r=trailRadius(phi),a=C.theta0+phi;return {x:C.cx+Math.cos(a)*r,z:C.cz+Math.sin(a)*r,y:trailHeight(phi),r,phi};};
export const START=trailPoint(.02),SUMMIT={x:C.cx,z:C.cz,y:C.TOP};

// The pool and waterfall: on the first lap near its end, facing the valley, set into the cliff inside the ledge.
const POOL_PHI=TAU*.9,POOL_R=5.5;
{const r0=trailRadius(POOL_PHI),rc=r0-C.W-POOL_R-.4,a=C.theta0+POOL_PHI;
  C.pool={phi:POOL_PHI,x:C.cx+Math.cos(a)*rc,z:C.cz+Math.sin(a)*rc,r:POOL_R,y:trailHeight(POOL_PHI),angle:a,rc};}
// The overlook: where the stable lies from the summit.
C.view=Math.atan2(9.7-(C.cz+DZ),0-(C.cx+DX));
C.rock={x:C.cx+Math.cos(C.view)*6.2,z:C.cz+Math.sin(C.view)*6.2};

const polar=(x,z)=>{const dx=x-C.cx,dz=z-C.cz,r=Math.hypot(dx,dz);let t=(Math.atan2(dz,dx)-C.theta0)%TAU;if(t<0)t+=TAU;return {r,t};};

// Everything about one spot: where it is on the mountain and how high the mountain is there (null outside).
export function cloudstepAt(x,z){
  const {r,t}=polar(x,z);if(r>C.R0+6)return null;
  const lap=k=>{const phi=t+TAU*k;return {phi,r:trailRadius(phi),y:trailHeight(phi)};};
  const L=[lap(-1),lap(0),lap(1),lap(2)];L[0].r=Math.min(L[0].r,C.R0-C.W);
  let h,region='slope',k=-1;
  if(r>=L[0].r+C.W)return {r,t,h:null,region:'outside',k:-1,outer:smooth(L[0].r-C.W,L[0].r+C.W,r)};
  for(let i=0;i<4&&k<0;i++)if(Math.abs(r-L[i].r)<=C.W){k=i-1;region=i===0?'foot':'ledge';h=L[i].y;}
  if(k<0){
    if(r<L[3].r-C.W){// the summit cap
      const t2=Math.min(1,(L[3].r-C.W-r)/Math.max(.01,L[3].r-C.W-C.RP));
      h=r<=C.RP?C.TOP:L[3].y+(C.TOP-L[3].y)*Math.pow(t2,1.15)+rock(x,z)*Math.sin(Math.PI*t2)*2.4;region=r<=C.RP?'summit':'cap';
    }else for(let i=0;i<3;i++)if(r<L[i].r-C.W&&r>L[i+1].r+C.W){// a cliff between two laps
      const span=(L[i].r-C.W)-(L[i+1].r+C.W),u=(L[i].r-C.W-r)/span,rise=L[i+1].y-L[i].y;
      h=L[i].y+rise*Math.pow(u,1.25)+rock(x,z)*Math.sin(Math.PI*u)*Math.min(4,1+rise*.06);region=i===0?'skirt':'cliff';break;}
  }
  if(region==='summit'){const d=Math.hypot(x-C.rock.x,z-C.rock.z);h+=.3*(1-(r/C.RP)**2)+1.7*smooth(4.4,1.6,d);}
  // The pool's alcove: a bowl beside the trail, walled steeply at the back where the waterfall slides down.
  const p=C.pool,d=Math.hypot(x-p.x,z-p.z);let pool=false;
  if(d<p.r+16&&region!=='ledge'){const wall=p.y+Math.max(0,d-p.r-.8)*5.5;if(d<p.r){h=p.y-1.5*(1-(d/p.r)**2);pool=true;region='pool';}else if(wall<h){h=wall;region='alcove';}}
  return {r,t,h,region,k,pool,outer:smooth(L[0].r-C.W,L[0].r+C.W,r)};
}
// Height with the valley/wild ground underneath it (base = that ground's height here).
export function cloudstepHeight(x,z,base){const s=cloudstepAt(x,z);if(!s||s.h==null)return base;return s.region==='foot'?s.h+(base-s.h)*s.outer:s.h;}
// You can stand on the ledges, the foot and the summit; the cliffs, alcove walls and pool are blocked.
const WALK={foot:1,ledge:1,summit:1,cap:0,cliff:0,skirt:0,alcove:0,pool:0};
export function cloudstepBlocked(x,z){const s=cloudstepAt(x,z);if(!s||s.h==null)return false;
  if(s.region==='ledge')return false;if(s.region==='summit')return false;if(s.region==='foot')return false;
  // The skirt's lowest rim stays walkable so the trail start blends into the plain.
  if(s.region==='skirt'&&s.h<1.6)return false;return !WALK[s.region];}
export function onCloudstep(x,z){const s=cloudstepAt(x,z);return !!s&&s.h!=null;}

// The water: a spring high on the cliff above the second lap trickles down and across that ledge (a ford), then
// plunges off its edge as the big waterfall into the pool beside the first lap. From the pool a stream crosses
// the first ledge (another ford), cascades down the skirt and runs a short way over the plain to a little pond.
// Points run outward along the pool's ray; `fall` marks the free-falling stretch drawn as the waterfall sheet.
export const FALLS=(()=>{const p=C.pool,ox=Math.cos(p.angle),oz=Math.sin(p.angle),r1=trailRadius(POOL_PHI+TAU),y1=trailHeight(POOL_PHI+TAU);
  const lip=r1+C.W+.25,land=p.rc-p.r*.35;
  return {top:{x:C.cx+ox*lip,z:C.cz+oz*lip,y:y1},bottom:{x:C.cx+ox*land,z:C.cz+oz*land,y:p.y-.2},drop:y1-p.y,lip,land,out:{x:ox,z:oz}};})();
export const STREAM=(()=>{const p=C.pool,ox=Math.cos(p.angle),oz=Math.sin(p.angle),r1=trailRadius(POOL_PHI+TAU),pts=[];
  const spring=r1-C.W-3.5,end=C.R0+16;
  for(let r=spring;r<=end;r+=.8){if(r>FALLS.lip&&r<p.rc+p.r)continue;pts.push({x:C.cx+ox*r,z:C.cz+oz*r,r});}
  return {upper:pts.filter(q=>q.r<=FALLS.lip),lower:pts.filter(q=>q.r>=p.rc+p.r),pond:{x:C.cx+ox*(end+5),z:C.cz+oz*(end+5),r:6}};})();

// Where along the trail a spot is (its spiral angle), or null off the ledges. The summit counts as the trail's end.
export function trailPhi(x,z){const s=cloudstepAt(x,z);if(!s||s.h==null)return null;if(s.region==='summit')return PHI;if(s.region!=='ledge')return null;return s.t+TAU*s.k;}
export const TRAIL_END=PHI;
// A tapped walk on the mountain follows the ledge round (never across a cliff): trail-centre points about every
// 2.5 m from one spiral angle to the other, then the goal. Both ends must be on the trail or the summit.
export function climbRoute(start,goal){const a=trailPhi(start.x,start.z),b=trailPhi(goal.x,goal.z);if(a==null||b==null)return null;
  const pts=[],dir=b>=a?1:-1;let phi=a;
  while(dir*(b-phi)>0){phi+=dir*Math.min(dir*(b-phi),2.5/Math.max(4,trailRadius(phi)));const p=trailPoint(Math.min(phi,PHI));pts.push({x:p.x,z:p.z});}
  pts.push({x:goal.x,z:goal.z});return pts;}
