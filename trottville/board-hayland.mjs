// Hay of the Land — a Trottville tile-laying game. Pure rules (no DOM) so node tests can play it.
// Each extra matching edge after the first scores 1 (a snug fit pays). Square tiles have four edges: g = meadow, t = trail, b = brook. A tile must touch the land and every
// touching edge must match. All same-type edges on one tile join up (a 4-way tile is a crossroads).
// Closing a trail or brook (no loose ends) scores it for whoever laid the most tiles in it; the closer
// gets a gate bonus. Horses graze at the end (+1 per tile around them, +2 more per apple tree among them).
// Three race-for-it Ribbons per game go to whoever earns them first.

export const DX=[0,1,0,-1],DY=[-1,0,1,0];            // N E S W
export const OPP=d=>(d+2)%4;
export const key=(x,y)=>x+','+y;
export const unkey=k=>k.split(',').map(Number);

export const TILES={
  meadow:{edges:'gggg',feature:null,count:2,name:'Open meadow'},
  horse:{edges:'gggg',feature:'horse',count:4,name:'Grazing horse'},
  apple:{edges:'gggg',feature:'apple',count:3,name:'Apple tree'},
  straight:{edges:'tgtg',feature:null,count:4,name:'Trail'},
  bend:{edges:'ttgg',feature:null,count:4,name:'Trail bend'},
  fork:{edges:'tttg',feature:null,count:2,name:'Trail fork'},
  cross:{edges:'tttt',feature:null,count:1,name:'Crossroads'},
  barn:{edges:'tggg',feature:'barn',count:4,name:'Barn'},
  brook:{edges:'bgbg',feature:null,count:3,name:'Brook'},
  brookbend:{edges:'bbgg',feature:null,count:3,name:'Brook bend'},
  pond:{edges:'bggg',feature:'pond',count:3,name:'Pond'},
  bridge:{edges:'tbtb',feature:'bridge',count:2,name:'Bridge'},
  ford:{edges:'ttbb',feature:null,count:2,name:'Trail by the brook'},
  mill:{edges:'btbg',feature:'barn',count:1,name:'Brookside barn'}
};
export const START={id:'gate',edges:'tgtb',feature:'pond',name:'Trottville gate'};
export const TURNS={1:30,2:32,3:33,4:36};
export const COLORS=['#e0703a','#3a7bd5','#9b59b6','#d4a017'];
export const RIBBON_PTS=5,GATE_PTS=2;
export const RIBBONS={
  loop:{name:'Bridle Loop',text:'Close a trail loop with no barn on it',icon:'⭕'},
  longride:{name:'Long Ride',text:'Close a trail 6+ tiles long',icon:'🏇'},
  brook:{name:'Babbling Brook',text:'Close a brook 4+ tiles long',icon:'💧'},
  snug:{name:'Snug Fit',text:'Lay a tile that matches on all 4 sides',icon:'🧩'},
  herd:{name:'Happy Horse',text:'A horse with 6+ tiles around it (goes to the horse’s owner)',icon:'🐴'},
  barnraise:{name:'Barn Raising',text:'Close a trail with 2+ barns on it',icon:'🏠'},
  grove:{name:'Apple Grove',text:'Join 3 apple trees side by side',icon:'🍎'}
};

// ---------- seeded randomness ----------
export function hashSeed(str){let h=2166136261>>>0;for(const c of String(str)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
export function mulberry(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
export function dayKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export const dailySeed=(d=new Date())=>hashSeed('hayland:'+dayKey(d));
function shuffle(a,rnd){for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function makeDeck(seed){const ids=[];for(const [id,t] of Object.entries(TILES))for(let i=0;i<t.count;i++)ids.push(id);return shuffle(ids,mulberry(seed));}
export function pickRibbons(seed){return shuffle(Object.keys(RIBBONS),mulberry(seed^0x9e3779b9)).slice(0,3);}

// ---------- tiles ----------
// r = clockwise quarter turns: the north edge moves east.
export const rotate=(edges,r)=>[0,1,2,3].map(i=>edges[(i-r+4)%4]).join('');
export const tileOf=id=>id===START.id?{...START}:{id,edges:TILES[id].edges,feature:TILES[id].feature,name:TILES[id].name};

export function fits(board,edges,x,y){if(board[key(x,y)])return false;let n=0;
  for(let d=0;d<4;d++){const nb=board[key(x+DX[d],y+DY[d])];if(!nb)continue;n++;if(nb.edges[OPP(d)]!==edges[d])return false;}
  return n>0;}
export function frontier(board){const out=new Set();for(const k in board){const [x,y]=unkey(k);
  for(let d=0;d<4;d++){const kk=key(x+DX[d],y+DY[d]);if(!board[kk])out.add(kk);}}return [...out].map(unkey);}
// Distinct rotations only (a straight trail has two, a meadow one).
export function rotationsOf(edges){const seen=new Set(),rs=[];for(let r=0;r<4;r++){const e=rotate(edges,r);if(!seen.has(e)){seen.add(e);rs.push(r);}}return rs;}
export function legalSpots(board,tile){const out=[];const rs=rotationsOf(tile.edges);
  for(const [x,y] of frontier(board)){const ok=rs.filter(r=>fits(board,rotate(tile.edges,r),x,y));if(ok.length)out.push({x,y,rots:ok});}return out;}

// A connected trail ('t') or brook ('b') through the tile at x,y.
export function region(board,x,y,kind){const start=board[key(x,y)];if(!start||!start.edges.includes(kind))return null;
  const seen=new Set([key(x,y)]),stack=[[x,y]];let open=0,barns=0,ponds=0;const owners={};
  while(stack.length){const [cx,cy]=stack.pop(),t=board[key(cx,cy)];
    if(t.feature==='barn'&&kind==='t')barns++;if(t.feature==='pond'&&kind==='b')ponds++;
    if(t.owner>=0)owners[t.owner]=(owners[t.owner]||0)+1;
    for(let d=0;d<4;d++){if(t.edges[d]!==kind)continue;const nx=cx+DX[d],ny=cy+DY[d],k=key(nx,ny);
      if(!board[k]){open++;continue;}if(!seen.has(k)){seen.add(k);stack.push([nx,ny]);}}}
  return {kind,keys:[...seen],open,barns,ponds,owners,closed:open===0};}
export const regionPoints=reg=>reg.kind==='t'?2*reg.keys.length+2*reg.barns:2*reg.keys.length+2*reg.ponds;
export function majority(owners){let best=0;for(const v of Object.values(owners))best=Math.max(best,v);
  return best?Object.keys(owners).filter(k=>owners[k]===best).map(Number):[];}
const AROUND=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
export function horseValue(board,x,y){let n=0,apples=0;for(const [dx,dy] of AROUND){const t=board[key(x+dx,y+dy)];if(t){n++;if(t.feature==='apple')apples++;}}return {n,apples,pts:n+2*apples};}
function appleGroup(board,x,y){const seen=new Set([key(x,y)]),st=[[x,y]];while(st.length){const [cx,cy]=st.pop();
  for(let d=0;d<4;d++){const k=key(cx+DX[d],cy+DY[d]);if(!seen.has(k)&&board[k]?.feature==='apple'){seen.add(k);st.push([cx+DX[d],cy+DY[d]]);}}}return seen.size;}

// ---------- game state ----------
export function newGame({players=[{name:'You'}],seed=(Math.random()*2**32)>>>0,daily=false}={}){
  const n=Math.max(1,Math.min(4,players.length));
  const s={seed,daily,players:players.slice(0,n).map((p,i)=>({name:p.name||'Player '+(i+1),bot:!!p.bot,style:p.style||'greedy',color:p.color||COLORS[i]})),
    board:{[key(0,0)]:{...START,owner:-1,turn:0}},deck:makeDeck(seed),cur:0,placed:0,limit:TURNS[n],current:null,burned:[],
    score:players.slice(0,n).map(()=>({edges:0,trails:0,brooks:0,gates:0,horses:0,ribbons:0})),
    ribbons:pickRibbons(seed).map(id=>({id,winner:-1})),log:[],over:false};
  draw(s);return s;}
// Draw the next tile that can go somewhere; tiles that fit nowhere are set aside.
export function draw(s){s.current=null;while(s.deck.length){const t=tileOf(s.deck.shift());if(legalSpots(s.board,t).length){s.current=t;return t;}s.burned.push(t.id);}
  finish(s);return null;}
export const total=sc=>sc.edges+sc.trails+sc.brooks+sc.gates+sc.horses+sc.ribbons;
export const totals=s=>s.score.map(total);

// Everything a placement would score. The tile must already be on the board (owner p).
export function eventsFor(s,x,y,p){const b=s.board,t=b[key(x,y)],ev=[];let matched=0;
  for(let d=0;d<4;d++)if(b[key(x+DX[d],y+DY[d])])matched++;
  ev.push({kind:'edges',player:p,pts:Math.max(0,matched-1),matched});
  const closes=[];
  for(const kind of ['t','b']){if(!t.edges.includes(kind))continue;const reg=region(b,x,y,kind);if(!reg.closed)continue;
    const pts=regionPoints(reg),winners=majority(reg.owners);closes.push(reg);
    ev.push({kind:'close',type:kind,keys:reg.keys,pts,winners,barns:reg.barns,ponds:reg.ponds,len:reg.keys.length});
    ev.push({kind:'gate',player:p,pts:GATE_PTS,type:kind});}
  for(const rb of s.ribbons){if(rb.winner>=0)continue;let w=-1;
    if(rb.id==='loop'&&closes.some(r=>r.kind==='t'&&r.barns===0))w=p;
    if(rb.id==='longride'&&closes.some(r=>r.kind==='t'&&r.keys.length>=6))w=p;
    if(rb.id==='brook'&&closes.some(r=>r.kind==='b'&&r.keys.length>=4))w=p;
    if(rb.id==='barnraise'&&closes.some(r=>r.kind==='t'&&r.barns>=2))w=p;
    if(rb.id==='snug'&&matched===4)w=p;
    if(rb.id==='grove'&&t.feature==='apple'&&appleGroup(b,x,y)>=3)w=p;
    if(rb.id==='herd'){const around=[[0,0],...AROUND];for(const [dx,dy] of around){const h=b[key(x+dx,y+dy)];
      if(h?.feature==='horse'&&h.owner>=0&&horseValue(b,x+dx,y+dy).n>=6){w=h.owner;break;}}}
    if(w>=0)ev.push({kind:'ribbon',id:rb.id,player:w,pts:RIBBON_PTS});}
  return ev;}
export function pointsFrom(ev,nPlayers){const pts=Array(nPlayers).fill(0);
  for(const e of ev){if(e.kind==='close')for(const w of e.winners)pts[w]+=e.pts;else pts[e.player]+=e.pts;}return pts;}

// Look ahead without changing anything (for the "+3" hint and the computer players).
export function preview(s,x,y,r,p=s.cur){const t=s.current;if(!t)return null;const edges=rotate(t.edges,r);if(!fits(s.board,edges,x,y))return null;
  const k=key(x,y);s.board[k]={...t,edges,owner:p,turn:s.placed+1};try{const ev=eventsFor(s,x,y,p);return {events:ev,pts:pointsFrom(ev,s.players.length)};}finally{delete s.board[k];}}

export function place(s,x,y,r){if(s.over||!s.current)throw new Error('game over');const t=s.current,edges=rotate(t.edges,r);
  if(!fits(s.board,edges,x,y))throw new Error('illegal placement');const p=s.cur;
  s.board[key(x,y)]={...t,edges,owner:p,turn:s.placed+1};const ev=eventsFor(s,x,y,p);
  for(const e of ev){if(e.kind==='edges')s.score[p].edges+=e.pts;
    else if(e.kind==='close')for(const w of e.winners)s.score[w][e.type==='t'?'trails':'brooks']+=e.pts;
    else if(e.kind==='gate')s.score[p].gates+=e.pts;
    else if(e.kind==='ribbon'){s.score[e.player].ribbons+=e.pts;s.ribbons.find(rb=>rb.id===e.id).winner=e.player;}}
  s.placed++;s.log.push({p,x,y,id:t.id,r});
  if(s.placed>=s.limit)finish(s);else{s.cur=(s.cur+1)%s.players.length;draw(s);}
  return {events:ev,x,y,player:p};}

// Horses graze at the end.
export function finish(s){if(s.over)return;s.over=true;s.current=null;s.horses=[];
  for(const [k,t] of Object.entries(s.board)){if(t.feature!=='horse'||t.owner<0)continue;const [x,y]=unkey(k),v=horseValue(s.board,x,y);
    s.score[t.owner].horses+=v.pts;s.horses.push({x,y,owner:t.owner,...v});}}
export function winners(s){const tt=totals(s),best=Math.max(...tt);return tt.map((v,i)=>v===best?i:-1).filter(i=>i>=0);}

// ---------- computer players ----------
// greedy: takes the biggest score now. rival: also blocks and steals trails it can win.
// casual: friendly and a little random.
export const STYLES={greedy:{others:.25,hold:.35,noise:.4},rival:{others:.7,hold:.6,noise:.4},casual:{others:.1,hold:.2,noise:2.2}};
export function botMove(s,rnd=Math.random){const t=s.current;if(!t)return null;const p=s.cur,st=STYLES[s.players[p].style]||STYLES.greedy;
  let best=null;
  for(const {x,y,rots} of legalSpots(s.board,t))for(const r of rots){const k=key(x,y),edges=rotate(t.edges,r);
    s.board[k]={...t,edges,owner:p,turn:s.placed+1};let v=0;
    try{const ev=eventsFor(s,x,y,p),pts=pointsFrom(ev,s.players.length);
      v=pts[p];for(let i=0;i<pts.length;i++)if(i!==p)v-=st.others*pts[i];
      for(const kind of ['t','b']){if(!edges.includes(kind))continue;const reg=region(s.board,x,y,kind);if(reg.closed)continue;
        const w=majority(reg.owners),pot=regionPoints(reg)/(1+reg.open*.5);
        if(w.includes(p)&&w.length===1)v+=st.hold*pot;else if(!w.includes(p))v-=st.hold*.3*pot;}
      if(t.feature==='horse')v+=1.2+.6*horseValue(s.board,x,y).pts;
      for(const [dx,dy] of AROUND){const h=s.board[key(x+dx,y+dy)];if(h?.feature!=='horse'||h.owner<0)continue;
        const g=1+(t.feature==='apple'?2:0);v+=h.owner===p?g*.9:-g*st.others;}}
    finally{delete s.board[k];}
    v+=rnd()*st.noise;if(!best||v>best.v)best={x,y,r,v};}
  return best;}
