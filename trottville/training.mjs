// v162 (Yoshi 2026-11-19: "the faster you run the higher you can jump … a training facility … get through all the jumps
// without any errors under a certain amount of time to qualify for the show … something you work towards by training"):
// step C of note #49 = the Jumping stat made real + one training station + the Clover Cup qualifier. Pure maths, no 3D.
//
// The jump. Take-off speed and the horse's Jumping stat (0–100) set how hard it springs (v0, up). Gravity is the world's
// 12 m/s², so the jump peaks at v0²/24 m after v0/12 s and lands after v0/6 s. A fence is clear when the horse's
// height AS IT CROSSES the rails is at least 80 % of the fence (the legs tuck up; the judge reads the body).
// So: faster = higher and longer, and timing matters: too early and the horse is coming down on the rails, too late and
// it's still going up (or still on the ground: a stop). A trained jumper springs higher at the same speed, so it clears
// big fences without a flat-out gallop and its take-off window is wider.
//   A new horse (Jumping ~12) clears medium fences from a canter but can't clear a high one even at a full gallop.
//   Jumping ~35 clears high fences at a strong gallop with good timing; ~80 clears them from a canter.
export const G=12,CLEAR=.8;
const A=3.81,B=.1865;
export const jumpPower=(speed,jumping)=>A+B*Math.max(0,speed)*(.4+Math.max(0,Math.min(100,jumping||0))/100);
export const peak=v0=>v0*v0/(2*G);
export const heightAt=(v0,t)=>Math.max(0,v0*t-G/2*t*t);
export const needHeight=f=>(f.h||0)*CLEAR;
// Where to take off for the best clearance: half the airtime before the rails, at this speed.
export const idealTakeoff=(speed,jumping)=>Math.max(0,speed)*jumpPower(speed,jumping)/G;
// The slowest speed that can clear a fence of height h at all (perfect timing), or Infinity.
export function minSpeed(jumping,h){const v=Math.sqrt(2*G*h*CLEAR),s=(v-A)/(B*(.4+Math.max(0,Math.min(100,jumping||0))/100));return s<=0?0:s;}
// How long (seconds) the horse is high enough over a fence of height h: the take-off window, in time.
export function takeoffWindow(speed,jumping,h){const v0=jumpPower(speed,jumping),d=v0*v0-2*G*h*CLEAR;return d<=0?0:Math.sqrt(d)/(G/2);}
// The judge, with the real height: 'refusal' (on the ground), 'rail' (too low) or 'clear'. late: still rising.
export function judgeHeight(f,{air,height}){if(!air)return 'refusal';return height>=needHeight(f)?'clear':'rail';}

// ---------- the Jumping station (training lane) ----------
// One session = one pass down the lane over all three fences in a row. Each clear adds to the session's gain, more for
// higher fences; the gain shrinks as the stat climbs (it takes longer to get really good). Three sessions per horse per
// day: after that the horse is tired and the lane is just practice. About a week of sessions takes a new horse to 80.
export const SESSIONS_PER_DAY=3;
export const LANE_POINTS={low:1,mid:1.5,high:2.5};
export const MAX_TRAIN=100;
export function sessionGain(results,jumping){const raw=results.reduce((s,r)=>s+(r.how==='clear'?LANE_POINTS[r.height]||0:0),0);if(raw<=0)return 0;
  return Math.max(1,Math.round(raw*(1.2-Math.max(0,Math.min(100,jumping))/100*.8)));}
// A horse's training record lives on the horse: h.train = {jumping: points gained, day, n: sessions that day}.
export const trained=h=>Math.max(0,Number(h?.train?.jumping)||0);
export const sessionsLeft=(h,day)=>h?.train?.day===day?Math.max(0,SESSIONS_PER_DAY-(h.train.n||0)):SESSIONS_PER_DAY;
// jumping: the horse's Jumping stat now (base + levels + training). Returns the updated horse, or the same one.
export function addSession(h,gain,day,jumping){if(!h||sessionsLeft(h,day)<=0)return h;const t=h.train||{},room=Math.max(0,MAX_TRAIN-jumping);
  return {...h,train:{...t,jumping:trained(h)+Math.min(room,gain),day,n:(t.day===day?t.n||0:0)+1}};}

// ---------- qualifiers ----------
// A show with a qualifier needs ONE clear round (no faults at all, inside the time) in its qualifying class first.
// The horse keeps the qualification for good: h.qual = {clover: day it qualified}.
export const QUALIFIER_FOR={cupq:'clover'};
export const qualified=(h,show)=>!!h?.qual?.[show];
export const withQual=(h,show,day)=>({...h,qual:{...(h.qual||{}),[show]:day}});
