// Original, rounded chibi assets. Scenery keeps its own low-poly materials.
// Builders share geometry within each character and register every allocation
// with the world's disposer; no textures or external character assets are used.
function kit(T,{geometry,material,detail=1}){
  const smooth={flatShading:false,roughness:.87};
  const round=geometry(new T.SphereGeometry(1,detail?12:7,detail?8:4));
  const small=geometry(new T.SphereGeometry(1,detail?8:5,detail?6:3));
  const hero=detail?geometry(new T.SphereGeometry(1,16,10)):round;
  const parts=[];
  function ball(parent,color,x,y,z,sx,sy,sz,{tiny=false,shadow=true,feature=false}={}){
    const mesh=new T.Mesh(feature?hero:tiny?small:round,material(color,smooth));
    mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);
    mesh.castShadow=shadow;mesh.receiveShadow=true;parent.add(mesh);parts.push(mesh);return mesh;
  }
  function stroke(parent,color,points,radius=.025,segments=8){
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    const mesh=new T.Mesh(geometry(new T.TubeGeometry(curve,detail?segments:Math.max(4,Math.ceil(segments*2/3)),radius,detail?7:4,false)),material(color,smooth));
    mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);parts.push(mesh);return mesh;
  }
  function stats(root){let triangles=0;for(const mesh of parts)triangles+=(mesh.geometry.index?.count||mesh.geometry.attributes.position.count)/3;root.userData.characterAsset={meshes:parts.length,triangles,style:'original rounded chibi'};}
  return {ball,stroke,stats};
}

export function makeChibiHorse(T,horse,options){
  const {ball,stroke,stats}=kit(T,options);
  const colors={
    willow:{coat:'#b37854',light:'#ca9066',muzzle:'#ddb58e',mane:'#654636',blaze:'#f3e4c3',hoof:'#575348'},
    atlas:{coat:'#aebdba',light:'#c9d5cb',muzzle:'#d9ddd0',mane:'#718583',blaze:'#faf2da',hoof:'#59645e'},
    sunny:{coat:'#d8b56e',light:'#edd08a',muzzle:'#f1dca5',mane:'#f5e5ba',blaze:'#fff2d2',hoof:'#817253'},
    appaloosa:{coat:'#f3f1ec',light:'#faf8f3',muzzle:'#d4c5c3',mane:'#7a7672',blaze:'#ffffff',hoof:'#5d5a55'}
  };
  const c=colors[horse.id]||colors.willow;
  const root=new T.Group(),body=new T.Group();root.add(body);
  // Shorter body and legs, a generous head, and softly rounded shoulders.
  ball(body,c.coat,0,1.65,0,.77,.69,1.3,{feature:true});
  ball(body,c.light,0,1.69,.83,.65,.65,.62);
  ball(body,c.coat,0,1.64,-.9,.71,.67,.66);
  const neck=ball(body,c.coat,0,2.13,.93,.49,.82,.51);neck.rotation.x=.36;
  ball(body,c.light,0,2.08,1.2,.41,.59,.37);

  const head=new T.Group();head.position.set(0,2.78,1.36);body.add(head);
  ball(head,c.light,0,0,0,.68,.66,.66,{feature:true});
  ball(head,c.coat,0,-.2,.45,.57,.42,.57);
  ball(head,c.muzzle,0,-.34,.69,.56,.31,.43);
  // A broad, readable blaze rather than a tiny texture detail.
  ball(head,c.blaze,0,.02,.614,.12,.43,.062,{tiny:true,shadow:false});
  ball(head,c.blaze,0,-.25,.92,.13,.18,.065,{tiny:true,shadow:false});
  for(const side of [-1,1]){
    const ear=ball(head,c.coat,side*.42,.67,-.08,.19,.43,.19);ear.rotation.z=-side*.21;
    const inside=ball(head,'#d8a99a',side*.42,.68,.067,.105,.29,.035,{tiny:true,shadow:false});inside.rotation.z=-side*.21;
    ball(head,'#fff7e5',side*.405,.095,.486,.21,.24,.13,{tiny:true,shadow:false});
    ball(head,'#35483e',side*.414,.09,.59,.133,.17,.066,{tiny:true,shadow:false});
    ball(head,'#fffdf2',side*.383,.153,.648,.043,.05,.019,{tiny:true,shadow:false});
    ball(head,'#fffdf2',side*.449,.035,.65,.019,.021,.012,{tiny:true,shadow:false});
    ball(head,'#8f6e59',side*.295,-.31,1.066,.066,.045,.025,{tiny:true,shadow:false});
    ball(head,'#d6a38d',side*.52,-.18,.76,.085,.052,.018,{tiny:true,shadow:false});
  }
  stroke(head,'#96755a',[[-.18,-.49,1.02],[0,-.515,1.047],[.18,-.49,1.02]],.015,6);
  // Three generous forelock curls give a soft silhouette at a distance.
  const forelock=ball(head,c.mane,-.17,.44,.39,.32,.22,.28);forelock.rotation.z=-.3;
  ball(head,c.mane,.17,.43,.35,.28,.23,.26).rotation.z=.27;
  ball(head,c.mane,.04,.34,.57,.17,.26,.15).rotation.z=-.25;
  stroke(body,c.mane,[[0,3.28,1.08],[0,2.94,.76],[0,2.52,.52],[0,2.12,.36]],.24,12);

  const legs=[];
  for(const side of [-1,1])for(const front of [-1,1]){
    const pivot=new T.Group();pivot.position.set(side*.48,1.34,front*.82);body.add(pivot);
    ball(pivot,c.coat,0,-.31,0,.235,.47,.25);
    ball(pivot,front===1?c.light:c.coat,0,-.78,.012,.19,.35,.21);
    ball(pivot,c.blaze,0,-.98,.035,.185,.14,.21,{tiny:true});
    ball(pivot,c.hoof,0,-1.17,.095,.255,.17,.32);
    legs.push({pivot,phase:side*front});
  }
  const tail=new T.Group();tail.position.set(0,1.98,-1.2);body.add(tail);
  stroke(tail,c.mane,[[0,0,0],[0,-.25,-.35],[.06,-.7,-.6],[.12,-1.12,-.48]],.23,12);
  ball(tail,c.mane,.12,-1.08,-.49,.25,.31,.26);
  if(horse.id==='atlas'){
    for(const side of [-1,1])for(const [y,z,size] of [[1.84,-.42,.12],[1.61,-.68,.1],[1.69,.12,.14]]){
      ball(body,'#d3ded6',side*.736,y,z,.025,size,size*1.12,{tiny:true,shadow:false});
    }
  }
  // Appaloosa: a white coat with grey leopard spots, heaviest over the rump, none on the face.
  if(horse.id==='appaloosa'){
    let seed=19;const rnd=()=>((seed=seed*16807%2147483647)/2147483647),v=new T.Vector3(),turn=new T.Euler();
    const spots=(parent,[cx,cy,cz],[rx,ry,rz],n,size,{tiltX=0,skip=()=>false}={})=>{turn.set(tiltX,0,0);
      for(let k=0;k<n;k++){const d=new T.Vector3(rnd()*2-1,rnd()*2-1,rnd()*2-1);if(d.lengthSq()>1||d.lengthSq()<.05||(d.normalize(),d.y<-.55||skip(d)))continue;
        const r=size*(.6+rnd()*.7);v.set(d.x*rx*.96,d.y*ry*.96,d.z*rz*.96).applyEuler(turn);ball(parent,'#8b8d93',cx+v.x,cy+v.y,cz+v.z,r,r,r,{tiny:true,shadow:false});}};
    spots(body,[0,1.64,-.9],[.71,.67,.66],40,.1);
    spots(body,[0,1.65,0],[.77,.69,1.3],30,.085);
    spots(body,[0,2.13,.93],[.49,.82,.51],14,.065,{tiltX:.36,skip:d=>d.z>.5});
    spots(head,[0,0,0],[.68,.66,.66],12,.055,{skip:d=>d.z>.2||d.y>.75});
  }
  // Rounded saddle pieces avoid returning the character to a blocky shape.
  ball(body,'#5a837b',0,2.29,-.08,.78,.085,.73);
  ball(body,'#8a6042',0,2.4,-.08,.54,.14,.57);
  ball(body,'#a2754e',0,2.47,.43,.53,.13,.14);
  ball(body,'#9b6d48',0,2.48,-.55,.52,.14,.14);
  const anchor=new T.Group();anchor.position.set(0,2.49,-.1);body.add(anchor);
  const scale=horse.id==='sunny'?.8:horse.id==='atlas'?1.08:1;root.scale.setScalar(scale);
  stats(root);
  return {root,body,head,legs,tail,anchor,scale};
}

export function makeChibiAvatar(T,options){
  const {ball,stroke,stats}=kit(T,options);
  const root=new T.Group(),body=new T.Group();root.add(body);
  const skin='#e2b596',shirt='#b57683',hair='#635044',helmet='#3e685f';
  ball(body,shirt,0,.99,0,.34,.36,.24);
  ball(body,'#985d6b',0,.76,0,.31,.08,.235);
  ball(body,'#ead9b7',0,1.29,.02,.16,.075,.15,{tiny:true});
  ball(body,'#d8b884',0,.94,.228,.035,.035,.025,{tiny:true,shadow:false});
  ball(body,'#d8b884',0,1.07,.229,.035,.035,.025,{tiny:true,shadow:false});

  // Oversized round face, wide eyes and a little riding helmet.
  ball(body,hair,0,1.72,-.095,.46,.43,.43);
  ball(body,skin,0,1.7,.015,.445,.445,.415,{feature:true});
  for(const side of [-1,1]){
    ball(body,skin,side*.435,1.68,.015,.095,.13,.1,{tiny:true});
    ball(body,'#35483f',side*.147,1.72,.4,.067,.096,.034,{tiny:true,shadow:false});
    ball(body,'#fff8e9',side*.132,1.754,.431,.023,.028,.011,{tiny:true,shadow:false});
    ball(body,'#d99a94',side*.271,1.56,.341,.074,.044,.021,{tiny:true,shadow:false});
    ball(body,hair,side*.339,1.91,.2,.13,.18,.16).rotation.z=-side*.37;
  }
  ball(body,skin,0,1.62,.43,.067,.058,.06,{tiny:true,shadow:false});
  stroke(body,'#9f6d63',[[-.075,1.49,.372],[0,1.466,.399],[.075,1.49,.372]],.011,6);
  const cap=new T.Mesh(options.geometry(new T.SphereGeometry(1,options.detail===0?7:14,options.detail===0?4:7,0,Math.PI*2,0,Math.PI/2)),options.material(helmet,{flatShading:false,roughness:.85}));
  cap.position.set(0,1.92,-.01);cap.scale.set(.49,.34,.465);cap.castShadow=true;cap.receiveShadow=true;body.add(cap);
  ball(body,helmet,0,1.925,.06,.5,.055,.52);
  ball(body,'#8eb3a5',0,2.17,.25,.105,.06,.075,{tiny:true});
  ball(body,'#c6ae83',0,1.02,-.245,.25,.29,.16);

  const legs=[],arms=[];
  for(const side of [-1,1]){
    const leg=new T.Group();leg.position.set(side*.18,.74,0);body.add(leg);
    ball(leg,'#e4d8ba',0,-.265,0,.15,.33,.17);
    ball(leg,'#576452',0,-.58,.065,.18,.16,.25);
    ball(leg,'#78816a',0,-.47,.03,.17,.1,.18,{tiny:true});
    legs.push(leg);
    const arm=new T.Group();arm.position.set(side*.365,1.17,0);body.add(arm);
    ball(arm,shirt,0,-.17,0,.135,.245,.15);
    ball(arm,skin,0,-.386,.01,.115,.125,.12,{tiny:true});
    arms.push(arm);
  }
  stats(root);root.userData.characterAsset.meshes+=1;root.userData.characterAsset.triangles+=(cap.geometry.index?.count||cap.geometry.attributes.position.count)/3;
  return {root,body,legs,arms};
}
