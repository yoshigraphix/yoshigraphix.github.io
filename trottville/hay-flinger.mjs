// Hay’s for Horses rules: fling hay bales from a slingshot through the barn's loft door.
// Side view in metres: the sling is on the left, the barn's door wall at WALL_X, the loft a grid of
// COLS columns × ROWS bales behind it. Bales land on the stack under them, always onto a grid cell,
// so the back has to be filled first: a full front column blocks the door. Pure and deterministic
// (wind comes from the random source), so the board UI simply plays back the returned path.
export const SLING={x:0,y:1.6},WALL_X=12,COLS=6,ROWS=3,FLOOR=5,CEILING=FLOOR+ROWS,BACK=WALL_X+COLS,HALF=.45,G=9.8;
export const EAVE=8.4,PEAK={x:WALL_X+COLS/2,y:11},VANE={x:WALL_X+COLS/2,y:12.1,r:.75};
export const SLIDE_FRICTION=1.1;
export const BALE_POINTS=100,ROW_BONUS=600,LOFT_BONUS=1500,SPARE_BONUS=200,VANE_BONUS=300,CAT_FROM_DAY=2;
export const balesForDay=day=>Math.max(COLS*ROWS+1,COLS*ROWS+5-day);
export const windMax=day=>Math.min(3,.5+.6*(day-1));
export const launchVelocity=(power,angle)=>{const p=Math.max(0,Math.min(1,power)),a=Math.max(-.2,Math.min(1.45,angle)),v=8+9*p;return {vx:v*Math.cos(a),vy:v*Math.sin(a)};};
// The roof slopes up from each eave to the peak; anything below that line above the loft is roof.
export const roofLine=x=>{const run=PEAK.x-(WALL_X-.4);return x<=PEAK.x?EAVE+(x-(WALL_X-.4))*(PEAK.y-EAVE)/run:EAVE+((BACK+.4)-x)*(PEAK.y-EAVE)/run;};
const newWind=(day,random)=>Math.round((random()*2-1)*windMax(day)*10)/10;
const fresh=(day,random)=>({day,stacks:Array(COLS).fill(0),bales:balesForDay(day),wind:newWind(day,random),cat:null,loadDone:false,over:false,last:null});
export function newFling(random=Math.random){return {...fresh(1,random),score:0,thrown:0,landed:0,missed:0,dings:0,rows:0,lofts:0,message:'Pull back on the sling and let go.'};}
// The next load: an empty loft, a few fewer spare bales and stronger gusts. The score carries over.
export function nextLoad(s,random=Math.random){if(!s.loadDone)return s;return {...s,...fresh(s.day+1,random),message:`Day ${s.day+1}: the wind picks up.`};}
export const loftFull=stacks=>stacks.every(h=>h>=ROWS);

// Flies one bale. Returns {state,path,result}: path is [{x,y,t}] at 60 fps for the board to play back.
export function throwBale(s,power,angle,random=Math.random){
  if(s.over||s.loadDone||s.bales<=0)return {state:s,path:[],result:null};
  let {vx,vy}=launchVelocity(power,angle),x=SLING.x,y=SLING.y,t=0,inside=false,over=false,col=-1,dinged=false,outcome=null,free=false;
  const dt=1/120,stacks=s.stacks,path=[{x,y,t:0}],events=[],ax=s.wind;
  const top=c=>FLOOR+stacks[c];
  const finish=(kind,extra={})=>{outcome={kind,x,y,t,...extra};};
  for(let step=1;step<=900&&!(outcome&&!free);step++){
    const px=x;vx+=ax*dt;vy-=G*dt;x+=vx*dt;y+=vy*dt;t+=dt;
    if(free){if(y<=HALF){y=HALF;path.push({x,y,t});break;}if(step%2===0)path.push({x,y,t});continue;}
    if(!dinged&&Math.hypot(x-VANE.x,y-VANE.y)<VANE.r){dinged=true;events.push({kind:'ding',x,y,t});vx=-vx*.4;vy=Math.abs(vy)*.3;}
    if(y<=HALF&&!inside){y=HALF;finish('miss',{reason:'ground'});break;}
    // The door wall: through the opening, over the eave, or a bounce off the boards.
    if(!inside&&!over&&px+HALF<WALL_X&&x+HALF>=WALL_X){
      if(y-HALF>=FLOOR-.1&&y+HALF<=CEILING+.1){if(y-HALF<top(0)-.05){finish('miss',{reason:stacks[0]?'stack':'wall'});free=true;vx=-Math.abs(vx)*.3;vy=Math.max(vy,1);}else{inside=true;col=0;}}
      else if(y-HALF>EAVE)over=true;
      else{finish('miss',{reason:y<FLOOR?'wall':'eave'});free=true;vx=-Math.abs(vx)*.3;}}
    if(inside){
      const c=Math.max(0,Math.min(COLS-1,Math.floor(x-WALL_X)));
      if(y+HALF>CEILING){y=CEILING-HALF;vy=-Math.abs(vy)*.2;}
      if(c>col){if(y-HALF<top(c)-.05){col=c-1;finish('land',{col});break;}col=c;}
      if(x+HALF>=BACK){finish('land',{col:COLS-1});break;}
      if(vy<=0&&y-HALF<=top(c)){finish('land',{col:c});break;}}
    else if(x>WALL_X-.4&&x<BACK+.4&&y-HALF<roofLine(x)&&y>EAVE-.5){finish('miss',{reason:'roof'});free=true;vx=Math.sign(vx||1)*2;vy=1.5;}
    if(!outcome&&(x>BACK+12||x<-8)){finish('miss',{reason:'away'});break;}
    if(step%2===0)path.push({x,y,t});}
  if(!outcome)finish('miss',{reason:'away'});
  // Land the bale onto its grid cell, unless the barn cat is napping there.
  let next={...s,thrown:s.thrown+1,bales:s.bales-1,stacks:[...stacks],score:s.score,last:null},points=0,bonus=[];
  if(dinged){next.dings=(s.dings||0)+1;points+=VANE_BONUS;bonus.push({kind:'ding',points:VANE_BONUS});}
  if(outcome.kind==='land'&&s.cat&&s.cat.col===outcome.col){outcome={...outcome,kind:'miss',reason:'cat'};events.push({kind:'cat',x,y,t});}
  if(outcome.kind==='land'){
    // Hay slides on the boards: leftover speed carries it back over stacks no taller than its own.
    let c=outcome.col,slide=Math.max(0,vx)**2/(2*SLIDE_FRICTION*G)-(WALL_X+c+.5-x),at=t+.08;
    path.push({x:WALL_X+c+.5,y:FLOOR+stacks[c]+HALF+.03,t:at});
    while(slide>=.5&&c<COLS-1&&stacks[c+1]<=stacks[c]){slide-=1;c++;at+=.12;path.push({x:WALL_X+c+.5,y:FLOOR+stacks[c]+HALF+.03,t:at});}
    if(s.cat&&s.cat.col===c){outcome={...outcome,col:c,kind:'miss',reason:'cat'};events.push({kind:'cat',x:WALL_X+c+.5,y:FLOOR+stacks[c],t:at});}
    else outcome={...outcome,col:c};}
  if(outcome.kind==='land'){const c=outcome.col,row=next.stacks[c]++;outcome.row=row;next.landed=s.landed+1;points+=BALE_POINTS;
    if(next.stacks.every(h=>h>row)){points+=ROW_BONUS;next.rows=(s.rows||0)+1;bonus.push({kind:'row',row,points:ROW_BONUS});}
    if(loftFull(next.stacks)){const spare=next.bales*SPARE_BONUS;points+=LOFT_BONUS+spare;next.loadDone=true;next.lofts=(s.lofts||0)+1;bonus.push({kind:'loft',points:LOFT_BONUS+spare,spare:next.bales});}}
  else next.missed=s.missed+1;
  next.score=s.score+points;
  // The cat naps on a stack for three throws; from day 2 it may wander in after any throw.
  let cat=s.cat?{...s.cat,left:s.cat.left-1}:null;if(cat&&cat.left<=0)cat=null;
  if(!cat&&!next.loadDone&&s.day>=CAT_FROM_DAY&&random()<.25){const open=next.stacks.map((h,i)=>h<ROWS?i:-1).filter(i=>i>=0);if(open.length)cat={col:open[Math.floor(random()*open.length)],left:3};}
  next.cat=cat;next.wind=newWind(s.day,random);
  if(!next.loadDone&&next.stacks[0]>=ROWS){next.over=true;next.message='The door is blocked! Fill the back of the loft first.';}
  else if(!next.loadDone&&next.bales<=0){next.over=true;next.message='Out of bales!';}
  else next.message=next.loadDone?'Loft full!':outcome.kind==='land'?`+${points.toLocaleString()}`:outcome.reason==='cat'?'Mrrow! The cat sent it back.':'Missed the door.';
  const result={...outcome,points,bonus,events};next.last=result;
  return {state:next,path,result};}

// A short dotted guide for aiming: the first part of the arc with no wind.
export function previewArc(power,angle,seconds=.42,count=9){let {vx,vy}=launchVelocity(power,angle);const out=[];for(let k=1;k<=count;k++){const t=seconds*k/count;out.push({x:SLING.x+vx*t,y:SLING.y+vy*t-G*t*t/2});}return out;}
