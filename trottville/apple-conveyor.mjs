// Appleoosa rules (the barn's apple game; id 'feed'): pure state, no DOM.
// The 3D board lives in apple-conveyor-3d.js and the baskets/truck yard in apple-yard-3d.js.
export const APPLE_COLORS=['green','red','orange','yellow'];
export const APPLE_COLUMNS=10,APPLE_ROWS=25,APPLE_START_ROWS=10;
const N=APPLE_COLUMNS*APPLE_ROWS;
// Points come from the size of the bundle clicked, never from basket totals: 3 = 45, 10 = 500, 25 = 3,125.
// A pair can still be picked (to clear a jam) but scores nothing, so tapping at random doesn't pay.
export const bundlePoints=count=>count>=3?5*count*count:0;
// Baskets: every picked apple carries the value its bundle earned. A basket holds 50 apples, room for one huge bundle;
// apples that do not fit bounce off the pile onto the grass. A dropped apple costs DROP_PENALTY,
// and dragging it from the grass to the truck wins that penalty back. Only red (over-full) baskets spill.
// A basket of CLEAN_HAUL_MIN+ apples that reaches the truck without dropping any earns CLEAN_HAUL_BONUS,
// which rewards many short trips over one heavy one.
export const BASKET_CAPACITY=50,TRUCK_BONUS=10,DROP_PENALTY=50,CLEAN_HAUL_BONUS=150,CLEAN_HAUL_MIN=5,ROT_PENALTY=10;
export const basketLevel=count=>count<=0?'empty':count<=16?'green':count<=33?'orange':'red';
// A shift with no apple dropped at all (bounced, spilled or later rescued) and at least SPOTLESS_MIN on the truck.
export const SPOTLESS_BONUS=10000,SPOTLESS_MIN=30,FLICK_BONUS=25;
export const dropPenalty=()=>DROP_PENALTY;
export const compostPoints=count=>-ROT_PENALTY*count;
// Shifts: each lasts SHIFT_MS of play. A day is four shifts (sunrise, noon, sunset, night), each harder
// than the last; a new day starts back at sunrise difficulty, so surviving one day means you can keep going.
export const SHIFT_MS=150000,SHIFT_SPEEDUP=.92,SHIFTS_PER_DAY=4,PHASES=['sunrise','noon','sunset','night'];
export const shiftInDay=(shift=1)=>((shift-1)%SHIFTS_PER_DAY)+1,dayOf=(shift=1)=>Math.floor((shift-1)/SHIFTS_PER_DAY)+1,phaseOf=(shift=1)=>PHASES[shiftInDay(shift)-1];
export const PHASE_NAMES={sunrise:'Sunrise',noon:'High noon',sunset:'Sunset',night:'Night'};
export const conveyorInterval=(level,shift=1)=>{const k=Math.pow(SHIFT_SPEEDUP,shiftInDay(shift)-1);return Math.max(1200*k,6500*Math.pow(.88,level-1)*k);};
// Now and then a bruised brown apple rides in. Every ROT_ROWS rows' worth of time each rotten apple turns the
// apples touching it brown; those start their own clock, so rot creeps outward about one ring per 3 rows.
// Later shifts trade speed for rot: more rotten apples arrive and they spread every 2 rows, then every row.
// With the belt stopped the rot clock runs ROT_STOPPED_RATE times faster. Brown bundles of 2+ go to compost.
export const ROTTEN='brown',ROT_CHANCE=.12,ROT_ROWS=3,ROT_STOPPED_RATE=2;
export const rotChance=(shift=1)=>Math.min(.3,ROT_CHANCE+.06*(shiftInDay(shift)-1)),rotRows=(shift=1)=>Math.max(1,ROT_ROWS-(shiftInDay(shift)-1));
const newRow=(random,rot=true,shift=1)=>{const row=Array.from({length:APPLE_COLUMNS},()=>APPLE_COLORS[Math.min(3,Math.floor(random()*4))]);if(rot&&random()<rotChance(shift))row[Math.min(APPLE_COLUMNS-1,Math.floor(random()*APPLE_COLUMNS))]=ROTTEN;return row;};
const neighbours=i=>{const row=Math.floor(i/APPLE_COLUMNS),column=i%APPLE_COLUMNS,out=[];if(row>0)out.push(i-APPLE_COLUMNS);if(row<APPLE_ROWS-1)out.push(i+APPLE_COLUMNS);if(column>0)out.push(i-1);if(column<APPLE_COLUMNS-1)out.push(i+1);return out;};
export function spreadRot(board,rot,step=1,rows=ROT_ROWS){const nextBoard=[...board],nextRot=board.map((c,i)=>c===ROTTEN?(rot[i]??0)+step:null),infected=[];
  board.forEach((c,i)=>{if(c===ROTTEN&&Math.floor(nextRot[i]/rows+1e-9)>Math.floor((rot[i]??0)/rows+1e-9))for(const j of neighbours(i))if(board[j]&&board[j]!==ROTTEN&&nextBoard[j]!==ROTTEN){nextBoard[j]=ROTTEN;nextRot[j]=0;infected.push(j);}});
  return {board:nextBoard,rot:nextRot,infected};}
const moveRot=(rot,moves,size)=>{const next=Array(size).fill(null),moved=new Set(moves.map(m=>m.from));rot.forEach((age,i)=>{if(age!=null&&!moved.has(i))next[i]=age;});for(const {from,to}of moves)next[to]=rot[from]??null;return next;};
const freshBelt=(random,shift=1)=>({board:[...Array(APPLE_COLUMNS*(APPLE_ROWS-APPLE_START_ROWS)).fill(null),...Array.from({length:APPLE_START_ROWS},()=>newRow(random,false)).flat()],rot:Array(N).fill(null),next:newRow(random,true,shift),rowsAdded:0,level:1,progress:0,belt:'on',brake:0,baskets:{green:[],red:[],orange:[],yellow:[]},ground:[]});
export function newConveyor(random=Math.random){return {...freshBelt(random),score:0,buckets:{green:0,red:0,orange:0,yellow:0},delivered:0,dropped:0,recovered:0,collected:0,composted:0,nextId:1,shift:1,shiftLeft:SHIFT_MS,shiftOver:false,shiftStart:0,shiftDropStart:0,shiftDeliverStart:0,spotless:false,spotlessShifts:0,flicked:0,over:false,spilled:[],groups:0,best:0,message:'Tap touching groups of 2+ matching apples.',last:null};}
// The next shift: a fresh, faster belt. Apples left in baskets or on the grass are not banked.
export function startShift(s,random=Math.random){if(!s.shiftOver||s.over)return s;return {...s,...freshBelt(random,s.shift+1),shift:s.shift+1,shiftLeft:SHIFT_MS,shiftOver:false,shiftStart:s.score,shiftDropStart:s.dropped,shiftDeliverStart:s.delivered,spotless:false,last:null,message:shiftInDay(s.shift+1)===1?`Day ${dayOf(s.shift+1)}: a fresh sunrise.`:`${PHASE_NAMES[phaseOf(s.shift+1)]}: the belt runs faster.`};}
export function appleGroup(board,index){if(!Number.isInteger(index)||index<0||index>=board.length||!board[index])return [];const color=board[index],found=new Set(),pending=[index];while(pending.length){const i=pending.pop();if(found.has(i)||board[i]!==color)continue;found.add(i);for(const j of neighbours(i))pending.push(j);}return [...found];}
// Gravity pulls every column down onto the belt; apples always come to rest on a grid cell.
export function settleApples(board){const next=Array(board.length).fill(null),moves=[];for(let column=0;column<APPLE_COLUMNS;column++){let target=APPLE_ROWS-1;for(let row=APPLE_ROWS-1;row>=0;row--){const i=row*APPLE_COLUMNS+column;if(!board[i])continue;const j=target*APPLE_COLUMNS+column;next[j]=board[i];if(i!==j)moves.push({from:i,to:j});target--;}}return {board:next,moves};}
const toGround=(s,color,values)=>{let id=s.nextId||1;const items=values.map(value=>({id:id++,color,value,penalty:dropPenalty(value)}));return {items,nextId:id};};
export function collectApples(s,index){if(s.over||s.shiftOver)return s;const group=appleGroup(s.board,index);if(group.length<2)return {...s,last:null,message:s.board[index]===ROTTEN?'Drag a lone rotten apple off the belt!':'That apple needs a matching neighbor. Groups touch up, down, left or right.'};const color=s.board[index],points=bundlePoints(group.length),value=Math.round(points/group.length),cleared=[...s.board],clearedRot=[...(s.rot||Array(N).fill(null))];for(const i of group){cleared[i]=null;clearedRot[i]=null;}const {board,moves}=settleApples(cleared),rot=moveRot(clearedRot,moves,N);
  if(color===ROTTEN){const cost=compostPoints(group.length);return {...s,board,rot,score:s.score+cost,collected:s.collected+group.length,composted:(s.composted||0)+group.length,groups:s.groups+1,best:Math.max(s.best||0,group.length),last:{color,count:group.length,points:cost,value:0,overflow:0,penalty:0,groundIds:[],cells:group,moves,rotten:true},message:`${group.length} rotten apples to the compost · −${(-cost).toLocaleString()} points`};}
  const basket=s.baskets[color],fits=Math.max(0,Math.min(group.length,BASKET_CAPACITY-basket.length)),overflow=group.length-fits,{items,nextId}=toGround(s,color,Array(overflow).fill(value)),penalty=items.reduce((n,a)=>n+a.penalty,0);
  return {...s,board,rot,nextId,ground:(s.ground||[]).concat(items),score:s.score+points-penalty,collected:s.collected+group.length,buckets:{...s.buckets,[color]:s.buckets[color]+group.length},baskets:{...s.baskets,[color]:basket.concat(Array(fits).fill(value))},dropped:s.dropped+overflow,groups:s.groups+1,best:Math.max(s.best||0,group.length),last:{color,count:group.length,points,value,overflow,penalty,groundIds:items.map(a=>a.id),cells:group,moves},message:`${group.length} ${color} apples · ${points?`+${points.toLocaleString()} points`:'no points for a pair'}${overflow?` · ${overflow} bounced off the full basket −${penalty.toLocaleString()}`:group.length>=25?' · Massive bundle!':group.length>=10?' · Huge harvest!':group.length>=5?' · Lovely bundle!':''}`};}
// A lone apple (no matching neighbour) on top of its column can be lifted onto the top of another column.
export const isLoneTop=(board,i)=>!!board[i]&&board[i]!==ROTTEN&&(i<APPLE_COLUMNS||!board[i-APPLE_COLUMNS])&&appleGroup(board,i).length===1;
export function moveApple(s,from,column){if(s.over||s.shiftOver||!isLoneTop(s.board,from)||!Number.isInteger(column)||column<0||column>=APPLE_COLUMNS||column===from%APPLE_COLUMNS||s.board[column])return s;
  let h=0;while(s.board[(APPLE_ROWS-1-h)*APPLE_COLUMNS+column])h++;const to=(APPLE_ROWS-1-h)*APPLE_COLUMNS+column,board=[...s.board];board[to]=board[from];board[from]=null;
  return {...s,board,last:null,moved:{from,to},message:'Moved a lone apple.'};}
// A lone rotten apple can't be tapped away; dragging it off the belt removes it for a small bonus before it spreads.
export const isLoneRot=(board,i)=>board[i]===ROTTEN&&appleGroup(board,i).length===1;
export function flickRot(s,index){if(s.over||s.shiftOver||!isLoneRot(s.board,index))return s;const cleared=[...s.board],clearedRot=[...(s.rot||Array(N).fill(null))];cleared[index]=null;clearedRot[index]=null;
  const {board,moves}=settleApples(cleared),rot=moveRot(clearedRot,moves,N);
  return {...s,board,rot,score:s.score+FLICK_BONUS,flicked:(s.flicked||0)+1,last:null,flick:{index,moves,points:FLICK_BONUS},message:`Caught it early! +${FLICK_BONUS}`};}
// Spills while carrying lose the newest apples off the top of the pile onto the grass.
export function dropFromBasket(s,color,count=1){const basket=s.baskets[color],n=Math.max(0,Math.min(count,basket.length));if(!n)return s;const {items,nextId}=toGround(s,color,basket.slice(basket.length-n)),penalty=items.reduce((sum,a)=>sum+a.penalty,0);return {...s,nextId,ground:(s.ground||[]).concat(items),score:s.score-penalty,baskets:{...s.baskets,[color]:basket.slice(0,basket.length-n)},dropped:s.dropped+n,last:null,lastDrop:{color,count:n,penalty,ids:items.map(a=>a.id)},message:`Dropped ${n} ${color} apple${n>1?'s':''} · −${penalty.toLocaleString()} points`};}
// Dragging a dropped apple from the grass into the truck wins its penalty back.
// A squirrel ran off with a dropped apple: it is gone for good (its penalty stays).
export function squirrelTakes(s,id){if(!(s.ground||[]).some(a=>a.id===id))return s;return {...s,ground:s.ground.filter(a=>a.id!==id),stolen:(s.stolen||0)+1,last:null,message:'A squirrel ran off with an apple!'};}
export function recoverApple(s,id){const item=(s.ground||[]).find(a=>a.id===id);if(!item)return s;return {...s,ground:s.ground.filter(a=>a.id!==id),score:s.score+item.penalty,recovered:(s.recovered||0)+1,delivered:s.delivered+1,last:null,message:`Rescued a ${item.color} apple · +${item.penalty.toLocaleString()} back`};}
// Loading the truck banks the oldest apples in the basket (ones still in the air land in the empty basket afterwards).
export function deliverBasket(s,color,count=s.baskets[color].length,{clean=false}={}){const basket=s.baskets[color],n=Math.max(0,Math.min(count,basket.length));if(!n)return s;const haul=clean&&n>=CLEAN_HAUL_MIN?CLEAN_HAUL_BONUS:0,bonus=n*TRUCK_BONUS+haul;return {...s,score:s.score+bonus,baskets:{...s.baskets,[color]:basket.slice(n)},delivered:s.delivered+n,cleanHauls:(s.cleanHauls||0)+(haul?1:0),last:null,lastHaul:haul,message:`${n} ${color} apples loaded onto the truck · +${bonus.toLocaleString()}${haul?' · Clean haul!':''}`};}
// Shutoff valve: stopping takes one full row of coasting, so stopping with the top row full still loses.
// Once stopped, the belt rests STOP_MS (the shift clock keeps running), then restarts by itself.
export const STOP_MS=5000;
export function toggleBelt(s){if(s.over||s.shiftOver)return s;if(s.belt==='on')return {...s,belt:'stopping',brake:1,message:'Belt stopping · it coasts one more row.'};return {...s,belt:'on',brake:0,stoppedLeft:0,message:'Belt running.'};}
// Shake: apples on a column at least two higher than its neighbour tumble sideways, landing on a grid cell.
export function shakeBelt(s,random=Math.random,tumbles=1){if(s.over||s.shiftOver)return s;const board=[...s.board],rot=[...(s.rot||Array(N).fill(null))],height=Array.from({length:APPLE_COLUMNS},(_,c)=>{let h=0;while(h<APPLE_ROWS&&board[(APPLE_ROWS-1-h)*APPLE_COLUMNS+c])h++;return h;}),moves=[];
  for(let t=0;t<tumbles;t++){const options=[];for(let c=0;c<APPLE_COLUMNS;c++)for(const n of [c-1,c+1])if(n>=0&&n<APPLE_COLUMNS&&height[c]-height[n]>=2)options.push({c,n,weight:height[c]-height[n]});if(!options.length)break;
    const total=options.reduce((sum,o)=>sum+o.weight,0);let pick=random()*total,o=options[0];for(const option of options){pick-=option.weight;if(pick<=0){o=option;break;}}
    const from=(APPLE_ROWS-height[o.c])*APPLE_COLUMNS+o.c,to=(APPLE_ROWS-1-height[o.n])*APPLE_COLUMNS+o.n;board[to]=board[from];rot[to]=rot[from];board[from]=null;rot[from]=null;height[o.c]--;height[o.n]++;moves.push({from,to});}
  return moves.length?{...s,board,rot,last:null,shook:moves}:{...s,shook:[]};}
export function advanceConveyor(s,elapsed,random=Math.random){if(s.over||s.shiftOver||!Number.isFinite(elapsed)||elapsed<=0)return s;
  const interval=conveyorInterval(s.level,s.shift||1),belt=s.belt||'on';let travel=0,brake=s.brake||0,nextBelt=belt,stoppedLeft=s.stoppedLeft??STOP_MS;
  if(belt==='on')travel=elapsed/interval;
  // Braking: speed falls with the square root of the distance left, so the belt coasts exactly one row.
  else if(belt==='stopping'){travel=Math.min(brake,Math.sqrt(Math.max(brake,.0004))*elapsed/interval);brake-=travel;if(brake<=.0005){travel+=brake;brake=0;nextBelt='off';stoppedLeft=STOP_MS;}}
  else if(belt==='off'){stoppedLeft-=elapsed;if(stoppedLeft<=0){stoppedLeft=0;nextBelt='on';}}
  let next={...s,belt:nextBelt,brake,stoppedLeft,progress:s.progress+travel,shiftLeft:(s.shiftLeft??SHIFT_MS)-elapsed,rotted:[]};
  while(next.progress>=1-1e-9){const top=next.board.slice(0,APPLE_COLUMNS),rowsAdded=next.rowsAdded+1,board=next.board.slice(APPLE_COLUMNS).concat(next.next),rot=(next.rot||Array(N).fill(null)).slice(APPLE_COLUMNS).concat(next.next.map(c=>c===ROTTEN?0:null));
    // A full column pushes its top apple over the end of the belt: game over.
    if(top.some(Boolean))return {...next,board,rot,next:newRow(random,true,next.shift||1),rowsAdded,progress:0,belt:'off',brake:0,over:true,last:null,spilled:top.map((color,column)=>color&&{color,column}).filter(Boolean),message:'The apples spilled off the belt!'};
    next={...next,board,rot,next:newRow(random,true,next.shift||1),rowsAdded,level:1+Math.floor((rowsAdded+Math.floor(next.collected/40))/4),progress:Math.max(0,next.progress-1),last:null};}
  const rotStep=elapsed/interval*(belt==='off'?ROT_STOPPED_RATE:1),spread=spreadRot(next.board,next.rot||Array(N).fill(null),rotStep,rotRows(next.shift||1));
  next={...next,board:spread.board,rot:spread.rot,rotted:spread.infected};
  if(next.belt==='on'&&belt==='off')next={...next,message:'Break over: the belt is running again.'};
  if(next.shiftLeft<=0){const spotless=next.dropped===(next.shiftDropStart||0)&&next.delivered-(next.shiftDeliverStart||0)>=SPOTLESS_MIN;
    next={...next,shiftLeft:0,shiftOver:true,belt:'off',brake:0,spotless,spotlessShifts:(next.spotlessShifts||0)+(spotless?1:0),score:next.score+(spotless?SPOTLESS_BONUS:0),message:spotless?`Spotless shift! +${SPOTLESS_BONUS.toLocaleString()}`:`Shift ${next.shift} is over!`};}
  return next;}
