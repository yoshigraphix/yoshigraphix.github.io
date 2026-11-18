// Shoo-In: a two-player abstract strategy game for Trottville. Pure rules + computer opponent (no DOM).
//
// The meadow is 7×7 with an apple tree in each corner. Each ranch has 3 horses; 5 skittish foals graze on the middle row; 2 hay bales sit
// where a seed puts them (always mirror-symmetric, so neither side is favoured).
// A turn: move one of your horses 1 or 2 squares in a straight line (any of 8 directions) over empty grass.
// Where it lands, every foal right next to it is SHOOED: it bolts straight away from the horse until a horse,
// foal, hay bale, tree or the fence stops it. Foals running diagonally bounce off the first fence they hit.
// A foal that bolts off the meadow through a barn door (the middle 3 columns of the top or bottom edge)
// trots into that barn. Your barn is across the meadow: player 0 starts at the bottom and its barn is at the
// top; player 1 starts at the top and its barn is at the bottom. Foals that hit a fence stop there.
// First barn to 3 foals wins. At sunset (30 moves each) most foals home wins; if level, most foals on your
// barn's half of the meadow; then it's a dead heat.
export const N=7,EMPTY=0,H0=1,H1=2,FOAL=3,HAY=4,TREE=5;
export const CORNERS=[0,6,42,48];
export const DOOR=[2,3,4],TO_WIN=3,MAX_PLY=60,HORSES=3,FOALS=5;
export const DIRS=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
const inB=(r,c)=>r>=0&&r<N&&c>=0&&c<N;
export const rc=i=>[Math.floor(i/N),i%N];
export const idx=(r,c)=>r*N+c;
const inDoor=c=>c>=2&&c<=4;

export function mulberry(seed){let a=seed>>>0;return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}

export function newGame({seed=(Math.random()*2**32)>>>0,hay=2,first=0,maxPly=MAX_PLY}={}){
  const g=new Array(N*N).fill(EMPTY);
  for(const c of [1,3,5]){g[idx(6,c)]=H0;g[idx(0,c)]=H1;}
  for(let c=1;c<=5;c++)g[idx(3,c)]=FOAL;
  for(const i of CORNERS)g[i]=TREE;
  const rnd=mulberry(seed);let placed=0,guard=0;
  while(placed<hay&&guard++<200){const r=1+Math.floor(rnd()*2),c=Math.floor(rnd()*N),i=idx(r,c),m=idx(N-1-r,N-1-c);
    if(g[i]===EMPTY&&g[m]===EMPTY){g[i]=HAY;g[m]=HAY;placed+=2;}}
  return {grid:g,turn:first,first,ply:0,barns:[0,0],over:false,winner:null,reason:null,maxPly,seed};
}
export const clone=s=>({...s,grid:s.grid.slice(),barns:s.barns.slice()});

// Moves are {from,to} cell indices.
export function legalMoves(s,player=s.turn){if(s.over)return [];const me=player===0?H0:H1,g=s.grid,out=[];
  for(let i=0;i<N*N;i++){if(g[i]!==me)continue;const r=Math.floor(i/N),c=i%N;
    for(const [dr,dc] of DIRS){let rr=r+dr,cc=c+dc;if(!inB(rr,cc)||g[idx(rr,cc)]!==EMPTY)continue;out.push({from:i,to:idx(rr,cc)});
      rr+=dr;cc+=dc;if(inB(rr,cc)&&g[idx(rr,cc)]===EMPTY)out.push({from:i,to:idx(rr,cc)});}}
  return out;}
export const isLegal=(s,m)=>!!m&&legalMoves(s).some(x=>x.from===m.from&&x.to===m.to);

// Foals next to cell `at` BOLT straight away from it until something stops them (a horse, foal, hay bale, corner
// tree or the fence). A foal running DIAGONALLY bounces off the first fence it meets (a trick shot) and keeps
// running; the second fence stops it. A foal that runs off the top or bottom edge through a barn door (the
// middle 3 columns) trots into that barn. Foals bolt one at a time in DIRS order on a working copy of the
// grid, so the result is deterministic.
// Each entry: {from,to,path,barn,bounce,dr,dc}; to===null when it went into barn 0/1; path = cells passed;
// bounce = index in path after which it changed direction (or -1).
export function shoosFrom(grid,at){const [r,c]=rc(at),out=[],g=grid.slice();
  for(const [dr,dc] of DIRS){const fr=r+dr,fc=c+dc;if(!inB(fr,fc)||g[idx(fr,fc)]!==FOAL)continue;
    let cr=fr,cc=fc,vr=dr,vc=dc,bounced=false,bounce=-1,barn=null;const path=[];
    for(let guard=0;guard<40;guard++){const nr=cr+vr,nc=cc+vc;
      if(inB(nr,nc)){if(g[idx(nr,nc)]!==EMPTY)break;cr=nr;cc=nc;path.push(idx(cr,cc));continue;}
      if((nr===-1||nr===N)&&nc>=0&&nc<N&&inDoor(nc)){barn=nr===-1?0:1;break;}
      if(vr&&vc&&!bounced){bounced=true;bounce=path.length-1;if(nr<0||nr>=N)vr=-vr;if(nc<0||nc>=N)vc=-vc;continue;}
      break;}
    const from=idx(fr,fc);
    if(barn!==null){g[from]=EMPTY;out.push({from,to:null,path,barn,bounce,dr,dc});}
    else if(path.length){g[from]=EMPTY;const to=path.at(-1);g[to]=FOAL;out.push({from,to,path,barn:null,bounce,dr,dc});}}
  return out;}

function finishAtSunset(s){const [a,b]=s.barns;s.over=true;
  if(a!==b){s.winner=a>b?0:1;s.reason='sunset';return;}
  let h0=0,h1=0;for(let i=0;i<N*N;i++)if(s.grid[i]===FOAL){const r=Math.floor(i/N);if(r<3)h0++;else if(r>3)h1++;}
  if(h0!==h1){s.winner=h0>h1?0:1;s.reason='half';}else{s.winner='draw';s.reason='draw';}}

// Returns {state, events:{move, player, shoos, passed}}. Throws on an illegal move.
export function applyMove(s,m,{check=true}={}){if(check&&!isLegal(s,m))throw new Error('Illegal move '+JSON.stringify(m));
  const n=clone(s),g=n.grid,p=n.turn;g[m.to]=g[m.from];g[m.from]=EMPTY;
  const shoos=shoosFrom(g,m.to);
  for(const f of shoos){g[f.from]=EMPTY;if(f.to!==null)g[f.to]=FOAL;else n.barns[f.barn]++;}
  n.ply++;let passed=false;
  if(n.barns[0]>=TO_WIN||n.barns[1]>=TO_WIN){n.over=true;n.winner=n.barns[0]>=TO_WIN&&n.barns[1]>=TO_WIN?p:(n.barns[0]>=TO_WIN?0:1);n.reason='barn';}
  else if(n.ply>=n.maxPly)finishAtSunset(n);
  else{n.turn=1-p;if(!legalMoves(n).length){passed=true;n.turn=p;if(!legalMoves(n).length)finishAtSunset(n);}}
  return {state:n,events:{move:m,player:p,shoos,passed}};}

// ---------- Computer opponent ----------
const W=[64,32,17,9,5,2,0];
function doorF(c,d){if(inDoor(c))return 1;if(c===1||c===5)return d<=1?.55:.85;return d<=1?.3:.7;}
// Static value from player 0's point of view.
export function evaluate(s){if(s.over)return s.winner===0?1e5-s.ply:s.winner===1?-1e5+s.ply:0;
  const g=s.grid;let v=(s.barns[0]-s.barns[1])*400;
  const h0=[],h1=[];for(let i=0;i<N*N;i++){if(g[i]===H0)h0.push(i);else if(g[i]===H1)h1.push(i);}
  const near=(hs,r,c)=>{let best=9;for(const h of hs){const hr=Math.floor(h/N),hc=h%N,d=Math.max(Math.abs(hr-r),Math.abs(hc-c));if(d<best)best=d;}return best;};
  for(let i=0;i<N*N;i++){if(g[i]!==FOAL)continue;const r=Math.floor(i/N),c=i%N;
    const a=W[r]*doorF(c,r),b=W[N-1-r]*doorF(c,N-1-r);v+=a-b;
    // A horse ready behind a foal (one move from the square that shoos it home) adds a share of its value.
    if(r+1<N&&g[idx(r+1,c)]===EMPTY){const d=near(h0,r+1,c);if(d===0)v+=a*.25;else if(d<=2)v+=a*.4;}
    if(r-1>=0&&g[idx(r-1,c)]===EMPTY){const d=near(h1,r-1,c);if(d===0)v-=b*.25;else if(d<=2)v-=b*.4;}}
  return v;}

let deadline=Infinity,timedOut=false,nodes=0;
function negamax(s,depth,alpha,beta){
  if(++nodes%512===0&&Date.now()>deadline){timedOut=true;}
  if(timedOut)return 0;
  const sign=s.turn===0?1:-1;
  if(depth===0||s.over)return sign*evaluate(s);
  let moves=legalMoves(s);
  if(depth>=2)moves=order(s,moves);
  let best=-Infinity;
  for(const m of moves){const {state}=applyMove(s,m,{check:false});
    const v=state.turn===s.turn?negamax(state,depth-1,alpha,beta):-negamax(state,depth-1,-beta,-alpha);
    if(v>best)best=v;if(v>alpha)alpha=v;if(alpha>=beta)break;}
  return best;}
function order(s,moves){const sign=s.turn===0?1:-1;
  return moves.map(m=>({m,k:sign*evaluate(applyMove(s,m,{check:false}).state)})).sort((x,y)=>y.k-x.k).map(x=>x.m);}

// Scores every root move to `depth`. Returns [{m,v}] best first (v from the mover's point of view).
export function rootSearch(s,depth){const out=[];let alpha=-Infinity;
  for(const m of order(s,legalMoves(s))){const {state}=applyMove(s,m,{check:false});
    const v=state.turn===s.turn?negamax(state,depth-1,alpha,Infinity):-negamax(state,depth-1,-Infinity,-alpha);
    if(timedOut)break;out.push({m,v});if(v>alpha)alpha=v;}
  return out.sort((a,b)=>b.v-a.v);}

export const LEVELS={
  easy:{name:'Daisy',label:'Easy',blurb:'A gentle pony who mostly plays for fun'},
  medium:{name:'Biscuit',label:'Medium',blurb:'A clever cob who looks a move ahead'},
  hard:{name:'Duchess',label:'Hard',blurb:'A champion who thinks several moves deep'}
};
// Picks a legal move for s.turn. level: easy | medium | hard. timeMs bounds the hard search.
export function chooseMove(s,level='medium',rng=Math.random,{timeMs=650}={}){
  const moves=legalMoves(s);if(!moves.length)return null;if(moves.length===1)return moves[0];
  deadline=Infinity;timedOut=false;nodes=0;
  if(level==='easy'){if(rng()<.4)return moves[Math.floor(rng()*moves.length)];
    const scored=rootSearch(s,1).map(x=>({m:x.m,v:x.v+(rng()-.5)*40})).sort((a,b)=>b.v-a.v);return scored[0].m;}
  if(level==='medium'){const scored=rootSearch(s,rng()<.2?1:2),top=scored[0].v,pool=scored.filter(x=>Math.abs(top)>5e4?x.v===top:x.v>=top-8);return pool[Math.floor(rng()*pool.length)].m;}
  // hard: iterative deepening inside a time budget; keeps the deepest finished answer.
  const start=Date.now();let best=rootSearch(s,2);
  deadline=start+timeMs;
  for(let d=3;d<=7;d++){const r=rootSearch(s,d);if(timedOut||!r.length)break;best=r;if(Math.abs(best[0].v)>5e4)break;if(Date.now()-start>timeMs*.45)break;}
  deadline=Infinity;timedOut=false;
  const top=best[0].v,pool=best.filter(x=>Math.abs(top)>5e4?x.v===top:x.v>=top-2);return pool[Math.floor(rng()*pool.length)].m;}

// ---------- Rewards ----------
// About 10 Trotties per minute of real play (gaps over 30 s don't count, so idling pays nothing), more for a
// harder rival and for winning. Only ever called for a finished game.
export const REWARD={perMinute:10,maxMinutes:12,cap:200,mult:{easy:1,medium:1.4,hard:1.9,friend:.6},winBonus:{easy:5,medium:12,hard:25,friend:0},result:{win:1,draw:.75,loss:.5}};
export function activeMs(stamps,gapCap=30000){let t=0;for(let i=1;i<stamps.length;i++)t+=Math.max(0,Math.min(gapCap,stamps[i]-stamps[i-1]));return t;}
export function rewardFor({result,level,ms,moves=0}){if(!['win','loss','draw'].includes(result)||!REWARD.mult[level]||moves<4)return {coins:0,lines:[]};
  const mins=Math.min(REWARD.maxMinutes,Math.max(0,ms)/60000),play=Math.round(REWARD.perMinute*mins*REWARD.mult[level]*REWARD.result[result]);
  const bonus=result==='win'?REWARD.winBonus[level]:0,coins=Math.min(REWARD.cap,Math.max(3,play+bonus));
  const lab=level==='friend'?'Friendly match':LEVELS[level].label+' rival';
  return {coins,lines:[`${lab} · ${Math.max(1,Math.round(mins))} min · ${coins-bonus} 🪙`,bonus?`Win bonus · ${bonus} 🪙`:null].filter(Boolean)};}
