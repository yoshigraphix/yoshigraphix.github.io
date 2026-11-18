// Maize Runner: the corn maze out in the valley's south-east corner, with a lost foal somewhere inside.
// Pure rules (no DOM, no Three.js), shared by the 3D builder (world-cornmaze-3d.js) and tests.
//  · The outer footprint and the gate never move; the paths inside are re-cut every day from a seed (a date string).
//  · Corridors are 3.5 m wide between 1 m corn walls (height 99: never jumpable).
//  · Jumps (rail, hay bales, log, water, oxer) stand ACROSS corridors. Three or more of them stand on cuts of the
//    gate→foal route (every way to the foal crosses them), so the foal can only be reached on horseback.
//    A jump is a thin box of height JUMP_H: world-logic lets an actor through when jump > JUMP_H + .15, which a
//    mounted horse (5.7 m/s take-off) clears with a forgiving window and a person on foot (4.4 m/s, peak ≈ .81 m)
//    never does.
//  · Grid: cell (i,j), i along +x (0..COLS-1), j along +z (0..ROWS-1). j=0 is the front row, where the gate opens
//    to the north (towards the racecourse). Edge bits: N=1 (j-1), E=2 (i+1), S=4 (j+1), W=8 (i-1).

export const N=1,E=2,S=4,W=8;
const DIRS=[[N,0,-1,S],[E,1,0,W],[S,0,1,N],[W,-1,0,E]];
// JUMP_H .8 (not .95): pass height .95. On foot peaks at ≈.81 (never passes); mounted peaks ≈1.35 at 60 fps but only
// ≈1.21 at the world's slowest step (dt .05, a struggling phone), which would barely clear a .95 jump (pass 1.10).
export const JUMP_H=.8,JUMP_HALF=.18,CORN_H=99;
export const CORN=(()=>{
  const cols=8,rows=8,pitch=4.5,wall=1,size=cols*pitch+wall,cx=215,cz=235,/* was (74,78): world-regions 'corn' block */x0=cx-size/2,z0=cz-size/2,gateCol=4;
  const gx=x0+wall+gateCol*pitch+(pitch-wall)/2;
  return {cx,cz,cols,rows,cell:pitch,pitch,wall,corridor:pitch-wall,size,x0,z0,x1:x0+size,z1:z0+size,
    cornHeight:2.8,gateCol,
    // The gate opening in the north wall, the point just outside it, and the clear apron in front (farmer + sign).
    gate:{x:gx,z:z0+wall/2,outside:{x:gx,z:z0-2},face:Math.PI},
    apron:{x:gx,z:z0-3,hx:5,hz:3},
    farmer:{x:gx-3,z:z0-3.2,face:Math.PI*.85},
    sign:{x:gx+3.2,z:z0-1.6},
    scarecrow:{x:gx+4.4,z:z0-4.2}};
})();

// ---------- Seeds ----------
export function hashSeed(seed){let h=2166136261;for(const ch of String(seed??''))h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0||1;}
export function rng(seed){let a=hashSeed(seed);return ()=>{a=a+0x6D2B79F5>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}

// ---------- Geometry helpers ----------
export const cellCenter=(i,j)=>({x:CORN.x0+CORN.wall+i*CORN.pitch+CORN.corridor/2,z:CORN.z0+CORN.wall+j*CORN.pitch+CORN.corridor/2});
export function inMaze(x,z,margin=0){return x>CORN.x0-margin&&x<CORN.x1+margin&&z>CORN.z0-margin&&z<CORN.z1+margin;}
// The corridor cell under (x,z), or null (outside, or standing in a corn wall / gap between cells).
export function cellAt(x,z){const fx=x-CORN.x0-CORN.wall,fz=z-CORN.z0-CORN.wall;if(fx<0||fz<0)return null;
  const i=Math.floor(fx/CORN.pitch),j=Math.floor(fz/CORN.pitch);if(i>=CORN.cols||j>=CORN.rows)return null;
  if(fx-i*CORN.pitch>CORN.corridor||fz-j*CORN.pitch>CORN.corridor)return null;return {i,j};}
// Nearest cell even when standing in a gap between two cells.
export function nearestCell(x,z){const i=Math.round((x-CORN.x0-CORN.wall-CORN.corridor/2)/CORN.pitch),j=Math.round((z-CORN.z0-CORN.wall-CORN.corridor/2)/CORN.pitch);
  return {i:Math.max(0,Math.min(CORN.cols-1,i)),j:Math.max(0,Math.min(CORN.rows-1,j))};}
const idx=(i,j)=>j*CORN.cols+i;
const dirOf=bit=>DIRS.find(d=>d[0]===bit);

// ---------- Layout ----------
// A fresh maze for a seed (the world passes today's date). Deterministic: same seed, same maze.
export function cornLayout(seed='maize'){
  for(let attempt=0;attempt<40;attempt++){const L=tryLayout(String(seed)+(attempt?'#'+attempt:''));if(L){L.seed=String(seed);return L;}}
  throw new Error('corn maze: no layout');
}
function tryLayout(seedText){
  const {cols,rows}=CORN,rand=rng(seedText),open=new Uint8Array(cols*rows);
  const pick=a=>a[Math.floor(rand()*a.length)];
  const carve=(i,j,bit)=>{const d=dirOf(bit);open[idx(i,j)]|=bit;open[idx(i+d[1],j+d[2])]|=d[3];};
  const uncarve=(i,j,bit)=>{const d=dirOf(bit);open[idx(i,j)]&=~bit;open[idx(i+d[1],j+d[2])]&=~d[3];};
  const inside=(i,j)=>i>=0&&j>=0&&i<cols&&j<rows;
  // Depth-first carve with a lean towards going straight on, so there are straight runs to gallop at the jumps.
  {const seen=new Uint8Array(cols*rows),stack=[[CORN.gateCol,0,0]];seen[idx(CORN.gateCol,0)]=1;
    while(stack.length){const top=stack[stack.length-1],[i,j,last]=top;
      const next=DIRS.filter(d=>inside(i+d[1],j+d[2])&&!seen[idx(i+d[1],j+d[2])]);
      if(!next.length){stack.pop();continue;}
      let d=next.find(n=>n[0]===last);if(!d||rand()>.5)d=pick(next);
      carve(i,j,d[0]);seen[idx(i+d[1],j+d[2])]=1;stack.push([i+d[1],j+d[2],d[0]]);}}
  const gate={i:CORN.gateCol,j:0};
  // The foal: the cell furthest from the gate, in the back half.
  let dist=bfs(open,gate);let foalI=-1;
  for(let k=0;k<dist.length;k++){if(Math.floor(k/cols)<rows/2)continue;if(foalI<0||dist[k]>dist[foalI])foalI=k;}
  const foal={i:foalI%cols,j:Math.floor(foalI/cols)};
  let path=routeCells(open,gate,foal);if(path.length<12)return null;
  // Mandatory jumps: one per third of the route, on the straightest edge in that third.
  const straight=(p,k)=>{// edge k joins p[k] and p[k+1]; count straight cells before and after along the route
    const dx=p[k+1].i-p[k].i,dz=p[k+1].j-p[k].j;let before=0,after=0;
    for(let m=k;m>0&&p[m].i-p[m-1].i===dx&&p[m].j-p[m-1].j===dz;m--)before++;
    for(let m=k+1;m<p.length-1&&p[m+1].i-p[m].i===dx&&p[m+1].j-p[m].j===dz;m++)after++;
    return {before,after,score:Math.min(before,2)*2+Math.min(after,2)+rand()*.5};};
  const mandatoryEdges=[],E2=path.length-1;
  for(let third=0;third<3;third++){const a=Math.max(1,Math.floor(E2*third/3)),b=Math.min(E2-2,Math.floor(E2*(third+1)/3)-1);let best=null;
    for(let k=a;k<=b;k++){if(mandatoryEdges.some(m=>Math.abs(m-k)<3))continue;const s=straight(path,k);if(!best||s.score>best.s)best={k,s:s.score};}
    if(!best)return null;mandatoryEdges.push(best.k);}
  const edgeKey=(a,b)=>{const lo=a.j*cols+a.i<b.j*cols+b.i?a:b,hi=lo===a?b:a;return lo.i+','+lo.j+'>'+hi.i+','+hi.j;};
  const mandatory=mandatoryEdges.map(k=>({a:path[k],b:path[k+1]}));
  const cutsAll=()=>mandatory.every(m=>!routeCells(open,gate,foal,[edgeKey(m.a,m.b)]).length);
  // A few loops so there are real choices, but never round a mandatory jump and never a 2×2 open square.
  const loops=[],wantLoops=4+Math.floor(rand()*3);
  for(let tries=0;tries<200&&loops.length<wantLoops;tries++){
    const i=Math.floor(rand()*cols),j=Math.floor(rand()*rows),d=pick([DIRS[1],DIRS[2]]);const ni=i+d[1],nj=j+d[2];
    if(!inside(ni,nj)||open[idx(i,j)]&d[0])continue;
    carve(i,j,d[0]);
    if(makesSquare(open,i,j)||makesSquare(open,ni,nj)||!cutsAll()){uncarve(i,j,d[0]);continue;}
    loops.push({a:{i,j},b:{i:ni,j:nj}});}
  path=routeCells(open,gate,foal);
  dist=bfs(open,gate);
  // Optional jumps: on loop edges (shortcuts) first, then on straight side corridors; never two on one cell.
  const used=new Set();const mark=e=>{used.add(e.a.i+','+e.a.j);used.add(e.b.i+','+e.b.j);};
  mandatory.forEach(mark);used.add(gate.i+','+gate.j);used.add(foal.i+','+foal.j);
  const free=e=>!used.has(e.a.i+','+e.a.j)&&!used.has(e.b.i+','+e.b.j);
  const onPath=new Set(path.map(c=>c.i+','+c.j));
  const lineScore=e=>{// straight neighbours on both sides along the travel axis
    const dx=e.b.i-e.a.i,dz=e.b.j-e.a.j,bit=dx>0?E:dx<0?W:dz>0?S:N,back=dirOf(bit)[3];
    return ((open[idx(e.a.i,e.a.j)]&back)?1:0)+((open[idx(e.b.i,e.b.j)]&bit)?1:0);};
  const optional=[];const wantOptional=4+Math.floor(rand()*3);
  for(const e of shuffle(loops,rand))if(optional.length<2&&free(e)){optional.push(e);mark(e);}
  const sideEdges=[];for(let j=0;j<rows;j++)for(let i=0;i<cols;i++)for(const d of [DIRS[1],DIRS[2]]){const ni=i+d[1],nj=j+d[2];
    if(!inside(ni,nj)||!(open[idx(i,j)]&d[0]))continue;const e={a:{i,j},b:{i:ni,j:nj}};
    if(onPath.has(i+','+j)&&onPath.has(ni+','+nj))continue;sideEdges.push({e,s:lineScore(e)+rand()*.9});}
  sideEdges.sort((x,y)=>y.s-x.s);
  for(const {e} of sideEdges){if(optional.length>=wantOptional)break;if(free(e)){optional.push(e);mark(e);}}
  // Kinds: varied, with at least one log and one water jump.
  const kinds=shuffle(['rail','bales','log','water','oxer','rail','bales','log','water','oxer'],rand);
  const all=[...mandatory.map(e=>({...e,mandatory:true})),...optional.map(e=>({...e,mandatory:false}))];
  if(!kinds.slice(0,all.length).includes('water'))kinds[all.length-1]='water';
  if(!kinds.slice(0,all.length).includes('log'))kinds[all.length-2]='log';
  const jumps=all.map((e,n)=>jumpBox(e,kinds[n],n));
  // Pick-ups in dead ends away from the route; the deepest one is the hidden corner with a golden horseshoe.
  const fromPath=bfsMulti(open,path);
  const ends=[];for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const k=idx(i,j),deg=bits(open[k]);
    if(onPath.has(i+','+j)||(i===gate.i&&j===gate.j))continue;ends.push({i,j,deg,far:fromPath[k],r:rand()});}
  ends.sort((a,b)=>(a.deg===1)-(b.deg===1)?(b.deg===1)-(a.deg===1):b.far-a.far||a.r-b.r);
  const deadEnds=ends.filter(c=>c.deg===1);const hiddenCell=(deadEnds[0]||ends[0]);
  const rest=ends.filter(c=>c!==hiddenCell),spots=[];
  for(const c of [...rest.filter(c=>c.deg===1),...shuffle(rest.filter(c=>c.deg!==1),rand)]){if(spots.length>=6)break;
    if(spots.some(s=>Math.abs(s.i-c.i)+Math.abs(s.j-c.j)<2))continue;spots.push(c);}
  if(spots.length<5)return null;
  const items=spots.map((c,n)=>({id:'item'+n,kind:n%2?'horseshoe':'apple',i:c.i,j:c.j,...cellCenter(c.i,c.j)}));
  const hidden={i:hiddenCell.i,j:hiddenCell.j,...cellCenter(hiddenCell.i,hiddenCell.j)};
  items.push({id:'golden',kind:'golden',i:hidden.i,j:hidden.j,x:hidden.x,z:hidden.z});
  const layout={seed:seedText,cols,rows,open,gate:{...gate,...CORN.gate},foal:{...foal,...cellCenter(foal.i,foal.j)},
    path,loops,jumps,items,hidden,walls:[]};
  layout.walls=wallBoxes(open);
  return layout;
}
const bits=v=>(v&1)+(v>>1&1)+(v>>2&1)+(v>>3&1);
function shuffle(a,rand){const r=[...a];for(let i=r.length-1;i>0;i--){const k=Math.floor(rand()*(i+1));[r[i],r[k]]=[r[k],r[i]];}return r;}
function makesSquare(open,i,j){// any 2×2 block containing (i,j) with all four inner edges open
  for(const [ai,aj] of [[i-1,j-1],[i,j-1],[i-1,j],[i,j]]){if(ai<0||aj<0||ai+1>=CORN.cols||aj+1>=CORN.rows)continue;
    if((open[idx(ai,aj)]&E)&&(open[idx(ai,aj)]&S)&&(open[idx(ai+1,aj)]&S)&&(open[idx(ai,aj+1)]&E))return true;}return false;}
function bfs(open,from,blockedEdges){const d=new Int16Array(open.length).fill(-1),q=[idx(from.i,from.j)];d[q[0]]=0;
  for(let h=0;h<q.length;h++){const k=q[h],i=k%CORN.cols,j=Math.floor(k/CORN.cols);
    for(const [bit,dx,dz] of DIRS){if(!(open[k]&bit))continue;const n=idx(i+dx,j+dz);if(d[n]>=0)continue;
      if(blockedEdges&&blockedEdges.has(edgeId(i,j,i+dx,j+dz)))continue;d[n]=d[k]+1;q.push(n);}}return d;}
function bfsMulti(open,cells){const d=new Int16Array(open.length).fill(-1),q=cells.map(c=>idx(c.i,c.j));q.forEach(k=>d[k]=0);
  for(let h=0;h<q.length;h++){const k=q[h],i=k%CORN.cols,j=Math.floor(k/CORN.cols);
    for(const [bit,dx,dz] of DIRS){if(!(open[k]&bit))continue;const n=idx(i+dx,j+dz);if(d[n]>=0)continue;d[n]=d[k]+1;q.push(n);}}return d;}
const edgeId=(ai,aj,bi,bj)=>{const a=aj*CORN.cols+ai,b=bj*CORN.cols+bi;return a<b?ai+','+aj+'>'+bi+','+bj:bi+','+bj+'>'+ai+','+aj;};
// Cells from a to b (inclusive), or [] when there is no way. blocked: edge ids ("i,j>i,j") treated as walls.
function routeCells(open,a,b,blocked){const set=blocked?new Set(blocked):null,par=new Int16Array(open.length).fill(-1),start=idx(a.i,a.j),goal=idx(b.i,b.j);
  par[start]=start;const q=[start];
  for(let h=0;h<q.length&&par[goal]<0;h++){const k=q[h],i=k%CORN.cols,j=Math.floor(k/CORN.cols);
    for(const [bit,dx,dz] of DIRS){if(!(open[k]&bit))continue;const n=idx(i+dx,j+dz);if(par[n]>=0)continue;
      if(set&&set.has(edgeId(i,j,i+dx,j+dz)))continue;par[n]=k;q.push(n);}}
  if(par[goal]<0)return [];const out=[];for(let k=goal;;k=par[k]){out.push({i:k%CORN.cols,j:Math.floor(k/CORN.cols)});if(k===start)break;}return out.reverse();}

// One jump standing across the gap between cells a and b. axis = the direction you ride over it.
function jumpBox(e,kind,n){const {a,b}=e,ca=cellCenter(a.i,a.j),cb=cellCenter(b.i,b.j),alongX=a.j===b.j;
  const x=(ca.x+cb.x)/2,z=(ca.z+cb.z)/2,across=CORN.corridor/2+.25;
  return {id:'jump'+n,kind,mandatory:!!e.mandatory,a:{i:a.i,j:a.j},b:{i:b.i,j:b.j},edge:edgeId(a.i,a.j,b.i,b.j),
    axis:alongX?'x':'z',x,z,hx:alongX?JUMP_HALF:across,hz:alongX?across:JUMP_HALF,height:JUMP_H};}

// Corn walls as few boxes as practical: the wall tiles of a (2·cols+1)×(2·rows+1) grid (posts at even/even, walls
// between cells at even/odd and odd/even), merged into horizontal runs on the post rows and vertical runs on the
// post columns. Overlaps are harmless for collision.
export function wallTiles(open){const U=2*CORN.cols+1,V=2*CORN.rows+1,t=new Uint8Array(U*V);
  for(let v=0;v<V;v++)for(let u=0;u<U;u++){let wall=0;
    if(u%2===0&&v%2===0)wall=1;
    else if(u%2===0){const j=(v-1)/2,i=u/2;wall=(i===0||i===CORN.cols)?1:(open[idx(i-1,j)]&E)?0:1;}
    else if(v%2===0){const i=(u-1)/2,j=v/2;wall=(j===0)?(i===CORN.gateCol?0:1):(j===CORN.rows)?1:(open[idx(i,j-1)]&S)?0:1;}
    t[v*U+u]=wall;}
  return {U,V,t};}
// World range of tile index k along one axis (origin o): [start, end].
export function tileSpan(k,o){const p=CORN.pitch,w=CORN.wall;return k%2===0?[o+k/2*p,o+k/2*p+w]:[o+(k-1)/2*p+w,o+(k+1)/2*p];}
function wallBoxes(open){const {U,V,t}=wallTiles(open),out=[],covered=new Uint8Array(U*V);
  const box=(u0,u1,v0,v1)=>{const [xa]=tileSpan(u0,CORN.x0),[,xb]=tileSpan(u1,CORN.x0),[za]=tileSpan(v0,CORN.z0),[,zb]=tileSpan(v1,CORN.z0);
    out.push({kind:'box',x:(xa+xb)/2,z:(za+zb)/2,hx:(xb-xa)/2,hz:(zb-za)/2,height:CORN_H,maze:'corn'});
    for(let v=v0;v<=v1;v++)for(let u=u0;u<=u1;u++)covered[v*U+u]=1;};
  for(let v=0;v<V;v+=2){let u=0;while(u<U){if(!t[v*U+u]){u++;continue;}let e=u;while(e+1<U&&t[v*U+e+1])e++;if(e>u)box(u,e,v,v);u=e+1;}}
  for(let u=0;u<U;u+=2){let v=0;while(v<V){if(!t[v*U+u]){v++;continue;}let e=v;while(e+1<V&&t[(e+1)*U+u])e++;
    let need=false;for(let k=v;k<=e;k++)if(!covered[k*U+u])need=true;if(e>v&&need)box(u,u,v,e);v=e+1;}}
  for(let v=0;v<V;v+=2)for(let u=0;u<U;u+=2)if(t[v*U+u]&&!covered[v*U+u])box(u,u,v,v);
  return out;}

// Everything the world's collision needs: corn walls (never jumpable) + the jumps (horseback only).
export function cornObstacles(layout){return [...layout.walls.map(o=>({...o})),...layout.jumps.map(j=>({kind:'box',x:j.x,z:j.z,hx:j.hx,hz:j.hz,height:j.height,maze:'jump',id:j.id}))];}

// Route between two world points through the maze's cells (jumps passable unless jumps:false). Returns world
// waypoints (cell centres, then the goal) or null. Points outside the maze route via the gate.
export function pathFind(layout,from,to,{jumps=true}={}){
  const outside=p=>!inMaze(p.x,p.z,-.2);const g={i:CORN.gateCol,j:0};
  const a=outside(from)?g:nearestCell(from.x,from.z),b=outside(to)?g:nearestCell(to.x,to.z);
  const cells=routeCells(layout.open,a,b,jumps?null:layout.jumps.map(j=>j.edge));
  if(!cells.length)return null;const pts=[];if(outside(from))pts.push({...CORN.gate.outside});
  cells.forEach(c=>pts.push(cellCenter(c.i,c.j)));if(outside(to))pts.push({...CORN.gate.outside});pts.push({x:to.x,z:to.z});return pts;}
export function reachable(layout,a,b,{jumps=true}={}){return routeCells(layout.open,a,b,jumps?null:layout.jumps.map(j=>j.edge)).length>0;}
export function jumpsOnRoute(layout){const ids=new Set(layout.path.slice(1).map((c,k)=>edgeId(layout.path[k].i,layout.path[k].j,c.i,c.j)));return layout.jumps.filter(j=>ids.has(j.edge));}

// ---------- The foal ----------
export const FOLLOW=2.5,FOUND_R=3;
export function newFoal(x,z,heading=0){return {x,z,heading,speed:0,hop:0,hopV:0,trail:[]};}
// One step of the found foal following you. It walks your breadcrumb trail (your trail only goes where you could
// go, so it never cuts through corn), keeps ~FOLLOW m behind along that trail, trots or gallops to keep up and
// hops any jump it meets by itself. With no trail yet it walks straight at you, but opts.blocked(x,z) stops it at
// walls. opts.jumps: the jump boxes it should hop. Returns {moved, hopped}.
export function foalStep(foal,player,dt,opts={}){
  dt=Math.min(Math.max(dt,0),.1);const follow=opts.follow??FOLLOW,trail=foal.trail;let hopped=false;
  const last=trail.length?trail[trail.length-1]:foal;
  if(Math.hypot(player.x-last.x,player.z-last.z)>.5)trail.push({x:player.x,z:player.z});
  if(trail.length>320){const k=trail.length-220;foal.x=trail[k].x;foal.z=trail[k].z;trail.splice(0,k+1);}
  // How far along the trail you are.
  let along=0,px=foal.x,pz=foal.z;for(const p of trail){along+=Math.hypot(p.x-px,p.z-pz);px=p.x;pz=p.z;}along+=Math.hypot(player.x-px,player.z-pz);
  const want=Math.min(11.5,Math.max(0,(along-follow)*2.4));
  foal.speed+=(want-foal.speed)*Math.min(1,dt*(want>foal.speed?3:6));
  let budget=Math.min(foal.speed*dt,Math.max(0,along-follow)),moved=false;
  while(budget>1e-4){const target=trail[0]||player,dx=target.x-foal.x,dz=target.z-foal.z,d=Math.hypot(dx,dz);
    if(d<1e-4){if(trail.length)trail.shift();else break;continue;}
    const s=Math.min(budget,d),nx=foal.x+dx/d*s,nz=foal.z+dz/d*s;
    if(!trail.length&&opts.blocked&&opts.blocked(nx,nz)){foal.speed=0;break;}
    foal.x=nx;foal.z=nz;budget-=s;moved=true;
    const want=Math.atan2(dx,dz);foal.heading+=Math.atan2(Math.sin(want-foal.heading),Math.cos(want-foal.heading))*Math.min(1,dt*10);
    if(s>=d&&trail.length)trail.shift();else break;}
  // Little hops over the jumps.
  if(opts.jumps&&foal.hop===0&&foal.hopV===0)for(const j of opts.jumps){if(Math.abs(foal.x-j.x)<j.hx+.55&&Math.abs(foal.z-j.z)<j.hz+.55){foal.hopV=4.6;hopped=true;break;}}
  if(foal.hopV||foal.hop){foal.hopV-=12*dt;foal.hop=Math.max(0,foal.hop+foal.hopV*dt);if(foal.hop===0&&foal.hopV<0)foal.hopV=0;}
  return {moved,hopped};}
export const foalFound=(player,foal)=>Math.hypot(player.x-foal.x,player.z-foal.z)<FOUND_R;

// Where the whinny comes from: pan -1 (left) … 1 (right) relative to the way you face (heading: forward is
// (sin h, cos h), the world's convention), vol 1 close by fading to .12 far away, plus the distance.
export function whinny(player,foal){const dx=foal.x-player.x,dz=foal.z-player.z,d=Math.hypot(dx,dz);
  if(d<1e-3)return {pan:0,vol:1,dist:0};const h=player.heading||0,pan=(-dx*Math.cos(h)+dz*Math.sin(h))/d;
  return {pan:Math.max(-1,Math.min(1,pan)),vol:Math.max(.12,Math.min(1,1-(d-FOUND_R)/42)),dist:d};}
