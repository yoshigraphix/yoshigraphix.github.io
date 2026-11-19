// Canvas compatibility renderer for browsers without a WebGL context.
// It projects the same Three.js meshes, camera and animation into real 3D;
// shadows and material effects are reduced to keep this path lightweight.
import {Matrix4,Vector3,Color} from './vendor/three-0.180.0/three.module.js?v=160';
export function clipNear(vertices,near){
  const output=[];
  for(let i=0;i<vertices.length;i++){const a=vertices[i],b=vertices[(i+1)%vertices.length],insideA=a.z<=-near,insideB=b.z<=-near;if(insideA)output.push(a);if(insideA!==insideB){const t=(-near-a.z)/(b.z-a.z);output.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:-near});}}
  return output;
}
export class SoftwareRenderer {
  constructor(){
    this.domElement=document.createElement('canvas');this.context=this.domElement.getContext('2d',{alpha:false});
    if(!this.context)throw Error('Canvas graphics unavailable');
    this.shadowMap={};this.ratio=1;this.simpleGraphics=true;this.colorCache=new Map();
  }
  setPixelRatio(value){this.ratio=Math.min(value,1);}
  setSize(width,height){this.width=width;this.height=height;this.domElement.width=Math.max(1,Math.round(width*this.ratio));this.domElement.height=Math.max(1,Math.round(height*this.ratio));}
  render(scene,camera){
    scene.updateMatrixWorld();camera.updateMatrixWorld();
    const ctx=this.context,w=this.domElement.width,h=this.domElement.height,projection=new Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse),sun=new Vector3(-.4,.8,.5).normalize(),items=[];
    ctx.fillStyle=scene.background.getStyle();ctx.fillRect(0,0,w,h);
    const color=(r,g,b,light)=>{const key=[r,g,b,Math.round(light*12)].join(',');let style=this.colorCache.get(key);if(!style){style=new Color().setRGB(r*light,g*light,b*light).getStyle();if(this.colorCache.size>16000)this.colorCache.clear();this.colorCache.set(key,style);}return style;};
    scene.traverseVisible(object=>{
      if(object.isSprite){const worldPosition=object.getWorldPosition(new Vector3()),depth=-worldPosition.clone().applyMatrix4(camera.matrixWorldInverse).z;if(depth<camera.near||depth>camera.far)return;const center=worldPosition.applyMatrix4(projection),scale=object.getWorldScale(new Vector3()),divisor=camera.isPerspectiveCamera?depth:1;items.push({sprite:object.material.map?.image,x:(center.x+1)*w*.5,y:(1-center.y)*h*.5,width:scale.x*camera.projectionMatrix.elements[0]*w/(2*divisor),height:scale.y*camera.projectionMatrix.elements[5]*h/(2*divisor),z:depth-.01});return;}
      if(!object.isMesh)return;const geometry=object.geometry,position=geometry.attributes.position,index=geometry.index,material=object.material;if(!position||!material?.color)return;
      const matrix=new Matrix4().multiplyMatrices(projection,object.matrixWorld),viewMatrix=new Matrix4().multiplyMatrices(camera.matrixWorldInverse,object.matrixWorld),world=object.matrixWorld,vertices=[],worldVertices=[],viewVertices=[];
      for(let i=0;i<position.count;i++){const local=new Vector3(position.getX(i),position.getY(i),position.getZ(i));vertices.push(local.clone().applyMatrix4(matrix));viewVertices.push(local.clone().applyMatrix4(viewMatrix));worldVertices.push(local.applyMatrix4(world));}
      const count=index?index.count:position.count,attribute=geometry.attributes.color;
      for(let i=0;i<count;i+=3){const ia=index?index.getX(i):i,ib=index?index.getX(i+1):i+1,ic=index?index.getX(i+2):i+2,a=vertices[ia],b=vertices[ib],c=vertices[ic];
        const viewTriangle=[viewVertices[ia],viewVertices[ib],viewVertices[ic]],crossesNear=viewTriangle.some(v=>v.z>-camera.near);
        if(viewTriangle.every(v=>v.z>-camera.near)||viewTriangle.every(v=>v.z<-camera.far))continue;
        if(!crossesNear&&((a.x<-1.1&&b.x<-1.1&&c.x<-1.1)||(a.x>1.1&&b.x>1.1&&c.x>1.1)||(a.y<-1.1&&b.y<-1.1&&c.y<-1.1)||(a.y>1.1&&b.y>1.1&&c.y>1.1)))continue;
        const normal=new Vector3().subVectors(worldVertices[ib],worldVertices[ia]).cross(new Vector3().subVectors(worldVertices[ic],worldVertices[ia])).normalize();
        if(material.side!==2&&normal.dot(new Vector3().subVectors(camera.position,worldVertices[ia]))<=0)continue;
        const light=.73+Math.max(0,normal.dot(sun))*.37;let r=material.color.r,g=material.color.g,bColor=material.color.b;
        if(material.vertexColors&&attribute){r=(attribute.getX(ia)+attribute.getX(ib)+attribute.getX(ic))/3;g=(attribute.getY(ia)+attribute.getY(ib)+attribute.getY(ic))/3;bColor=(attribute.getZ(ia)+attribute.getZ(ib)+attribute.getZ(ic))/3;}
        const polygon=crossesNear?clipNear(viewTriangle,camera.near):viewTriangle;
        if(polygon.length<3)continue;
        const points=[];for(const v of polygon){const projected=new Vector3(v.x,v.y,v.z).applyMatrix4(camera.projectionMatrix);points.push((projected.x+1)*w*.5,(1-projected.y)*h*.5);}
        items.push({order:object.renderOrder,points,fill:color(r,g,bColor,light),z:-polygon.reduce((sum,v)=>sum+v.z,0)/polygon.length});
      }
    });
    items.sort((a,b)=>(a.order||0)-(b.order||0)||b.z-a.z);
    for(const item of items){if(item.sprite){ctx.drawImage(item.sprite,item.x-item.width*.5,item.y-item.height*.5,item.width,item.height);continue;}const p=item.points;ctx.fillStyle=item.fill;ctx.beginPath();ctx.moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)ctx.lineTo(p[i],p[i+1]);ctx.closePath();ctx.fill();}
  }
  dispose(){this.colorCache.clear();}
  forceContextLoss(){}
}
