// Ground-only, collision-aware navigation shared by walking and riding.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function clearSegment(a,b,canWalk,spacing=.22){
  const steps=Math.max(1,Math.ceil(distance(a,b)/spacing));
  for(let i=0;i<=steps;i++){const t=i/steps;if(!canWalk(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))return false;}
  return true;
}
class Heap{
  values=[];
  push(value){let i=this.values.length;this.values.push(value);while(i){const p=(i-1)>>1;if(this.values[p].f<=value.f)break;this.values[i]=this.values[p];i=p;}this.values[i]=value;}
  pop(){const first=this.values[0],last=this.values.pop();if(this.values.length){let i=0;while(i*2+1<this.values.length){let c=i*2+1;if(c+1<this.values.length&&this.values[c+1].f<this.values[c].f)c++;if(this.values[c].f>=last.f)break;this.values[i]=this.values[c];i=c;}this.values[i]=last;}return first;}
}
// `bounds` is a half-width around `center` (the valley centre by default; the wild lands pass the walker's position).
export function findGroundPath(start,goal,canWalk,{step=1,bounds=104,maxNodes=48000,center={x:0,z:0}}={}){
  const inside=q=>Math.abs(q.x-center.x)<=bounds&&Math.abs(q.z-center.z)<=bounds;
  if(![start.x,start.z,goal.x,goal.z].every(Number.isFinite)||!canWalk(goal.x,goal.z))return null;
  if(distance(start,goal)<.12)return [];
  if(clearSegment(start,goal,canWalk))return [{...goal}];
  const key=(x,z)=>x+','+z,point=(x,z)=>({x:x*step,z:z*step});
  function snap(p){const cx=Math.round(p.x/step),cz=Math.round(p.z/step),choices=[];for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){const q=point(cx+dx,cz+dz);if(inside(q)&&canWalk(q.x,q.z)&&clearSegment(p,q,canWalk))choices.push({x:cx+dx,z:cz+dz,d:distance(p,q)});}return choices.sort((a,b)=>a.d-b.d)[0];}
  const from=snap(start),to=snap(goal);if(!from||!to)return null;
  const nodes=new Map(),heap=new Heap(),target=key(to.x,to.z),heuristic=(x,z)=>Math.hypot(x-to.x,z-to.z)*step;
  const first={x:from.x,z:from.z,g:0,f:heuristic(from.x,from.z),parent:null};nodes.set(key(first.x,first.z),first);heap.push(first);
  let expanded=0,end=null;
  while(heap.values.length&&expanded<maxNodes){const current=heap.pop();if(current.closed)continue;current.closed=true;expanded++;if(key(current.x,current.z)===target){end=current;break;}
    const a=point(current.x,current.z);
    for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const x=current.x+dx,z=current.z+dz,b=point(x,z);if(!inside(b)||!canWalk(b.x,b.z))continue;
      // Check the whole edge, including diagonal corners and thin fence rails.
      if(dx&&dz&&(!canWalk(a.x+dx*step,a.z)||!canWalk(a.x,a.z+dz*step)))continue;
      if(!clearSegment(a,b,canWalk))continue;const id=key(x,z),g=current.g+Math.hypot(dx,dz)*step,old=nodes.get(id);if(old&&g>=old.g)continue;
      const node={x,z,g,f:g+heuristic(x,z),parent:current};nodes.set(id,node);heap.push(node);
    }
  }
  if(!end)return null;
  const raw=[{...goal}];for(let n=end;n;n=n.parent)raw.push(point(n.x,n.z));raw.push({...start});raw.reverse();
  const smooth=[];let index=0;while(index<raw.length-1){let next=raw.length-1;while(next>index+1&&!clearSegment(raw[index],raw[next],canWalk))next--;smooth.push(raw[next]);index=next;}return smooth;
}
export function steeringStep(position,path,speed,delta){
  while(path.length&&distance(position,path[0])<.09)path.shift();
  if(!path.length)return {vector:{x:0,z:0},speed:0};
  const target=path[0],d=distance(position,target);return {vector:{x:(target.x-position.x)/d,z:(target.z-position.z)/d},speed:Math.min(speed,d/Math.max(.001,Math.min(delta,.05)))};
}
