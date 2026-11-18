# Fit Arisa's hair + hair1's bun onto the Trottville VRoid rider's head; export head-bone-local, unskinned, grey-tintable GLBs.
import bpy,sys,json,struct,bmesh,os
import numpy as np
from mathutils import Matrix,Vector,Quaternion
a=sys.argv[sys.argv.index('--')+1:];RIDER,ARISA,HAIR1,OUT=a[:4];RATIO=float(os.environ.get('RATIO','.38'))
def gltf_head_world(path):
  d=open(path,'rb').read();n=struct.unpack('<I',d[12:16])[0];j=json.loads(d[20:20+n]);nodes=j['nodes'];par={}
  for i,nd in enumerate(nodes):
    for c in nd.get('children',[]):par[c]=i
  i=[k for k,nd in enumerate(nodes) if nd.get('name')=='head'][0];M=Matrix.Identity(4)
  while i is not None:
    nd=nodes[i];t=nd.get('translation',[0,0,0]);r=nd.get('rotation',[0,0,0,1]);s=nd.get('scale',[1,1,1])
    L=Matrix.Translation(t)@Quaternion((r[3],r[0],r[1],r[2])).to_matrix().to_4x4()@Matrix.Diagonal((*s,1));M=L@M;i=par.get(i)
  return M
C=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))   # glTF -> Blender
HW=C@gltf_head_world(RIDER)@C.inverted()                  # head bone rest, Blender world
def load(p):bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=p)
def mat_verts(o,test):
  s=set()
  for p in o.data.polygons:
    m=o.data.materials[p.material_index]
    if m and test(m.name):s.update(p.vertices)
  return sorted(s)
def W(o,idx):mw=o.matrix_world;return np.array([(mw@o.data.vertices[i].co)[:] for i in idx])
def headbox(face,body,hz):
  F=W(face,mat_verts(face,lambda n:'Face_00_SKIN' in n));Bv=W(body,mat_verts(body,lambda n:'Body_00_SKIN' in n));Bv=Bv[Bv[:,2]>hz+.012]
  E=W(face,mat_verts(face,lambda n:'EyeWhite' in n));P=np.concatenate([F,Bv])
  return dict(cx=(P[:,0].min()+P[:,0].max())/2,w=P[:,0].max()-P[:,0].min(),cy=(P[:,1].min()+P[:,1].max())/2,d=P[:,1].max()-P[:,1].min(),ez=E[:,2].mean(),top=P[:,2].max())
# ---- ours
load(RIDER);arm=[o for o in bpy.data.objects if o.type=='ARMATURE'][0];hz=(arm.matrix_world@arm.data.bones['head'].head_local).z
OURS=headbox(bpy.data.objects['Face'],bpy.data.objects['Body'],hz);print('OURS',OURS)
# ---- arisa
load(ARISA);arm=[o for o in bpy.data.objects if o.type=='ARMATURE'][0];hz=(arm.matrix_world@arm.data.bones['J_Bip_C_Head'].head_local).z
body=bpy.data.objects['Body'];ARI=headbox(bpy.data.objects['Face'],body,hz);print('ARISA',ARI)
HB_A=W(body,mat_verts(body,lambda n:'HairBack' in n))
def A2O(P):   # Arisa world -> our world: turn 180 (she faces +y, ours -y), then per-axis fit of the head box
  q=np.stack([-(P[:,0]-ARI['cx']),-(P[:,1]-ARI['cy']),P[:,2]-ARI['ez']],1)
  s=np.array([OURS['w']/ARI['w'],OURS['d']/ARI['d'],(OURS['top']-OURS['ez'])/(ARI['top']-ARI['ez'])])
  return q*s+np.array([OURS['cx'],OURS['cy'],OURS['ez']])
print('fit scales',OURS['w']/ARI['w'],OURS['d']/ARI['d'],(OURS['top']-OURS['ez'])/(ARI['top']-ARI['ez']))
def keep_only(o,test):
  bm=bmesh.new();bm.from_mesh(o.data);mats=o.data.materials
  bmesh.ops.delete(bm,geom=[f for f in bm.faces if not test(mats[f.material_index].name)],context='FACES')
  bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS');bm.to_mesh(o.data);bm.free()
  used={p.material_index for p in o.data.polygons}
  for i in reversed(range(len(o.data.materials))):
    if i not in used:o.active_material_index=i;bpy.context.view_layer.objects.active=o;bpy.ops.object.material_slot_remove()
def strip(o):
  for m in list(o.modifiers):o.modifiers.remove(m)
  if o.data.shape_keys:o.shape_key_clear()
  o.vertex_groups.clear();o.parent=None
def finish(objs,remap,name,ratio):
  # objs: mesh objects already in world space of their source; remap: Nx3 world -> our world
  for o in objs:
    strip(o);mw=o.matrix_world.copy();o.matrix_world=Matrix.Identity(4)
    P=np.array([(mw@v.co)[:] for v in o.data.vertices]);Q=remap(P)
    # a little air between hair and skull: 2% bigger about the head centre plus 4 mm outward
    c=np.array([OURS['cx'],OURS['cy'],OURS['ez']]);dv=Q-c;nr=np.linalg.norm(dv,axis=1,keepdims=True)+1e-9;Q=c+dv*float(os.environ.get('GROW','1.02'))+dv/nr*float(os.environ.get('PUSH','.004'))
    # to head-bone local
    inv=HW.inverted()
    for v,q in zip(o.data.vertices,Q):v.co=inv@Vector(q)
    # winding: a 180 turn keeps handedness; reflections would flip it (none here)
    o.data.update()
  if ratio<1:
    for o in objs:
      n0=len(o.data.polygons);m=o.modifiers.new('dec','DECIMATE');m.ratio=ratio;m.use_collapse_triangulate=True
      bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier='dec');print('DECIMATE',o.name,n0,'->',len(o.data.polygons))
  # grey, tintable textures (hair_m1 style: median ~0.75)
  for o in objs:
    for m in o.data.materials:
      for n in m.node_tree.nodes:
        if n.type=='TEX_IMAGE' and n.image and not n.image.get('grey'):
          im=n.image;w,h=im.size
          if max(w,h)>512:im.scale(min(w,512*w//max(w,h)),min(h,512*h//max(w,h)));w,h=im.size
          px=np.array(im.pixels[:]).reshape(-1,4);L=px[:,:3]@np.array([.2126,.7152,.0722]);op=px[:,3]>.5
          med=np.median(L[op]) if op.any() else .5;g=np.clip(L*(.75/max(med,1e-3)),0,1)
          px[:,0]=px[:,1]=px[:,2]=g;im.pixels[:]=px.ravel();im['grey']=1;im.file_format='PNG';print('TEX',im.name,w,h,'median',round(float(med),3))
  bpy.ops.object.select_all(action='DESELECT')
  for o in objs:o.select_set(True)
  tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objs);print('TRIS',name,tris)
  bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,name+'.glb'),use_selection=True,export_yup=True,export_skins=False,export_morph=False,export_animations=False,export_image_format='AUTO',export_materials='EXPORT')
# Arisa: Hair001 + the HairBack cap from the body
hair=bpy.data.objects['Hair001'];cap=body.copy();cap.data=body.data.copy();bpy.context.scene.collection.objects.link(cap);cap.name='HairBack'
keep_only(cap,lambda n:'HairBack' in n)
for o in list(bpy.data.objects):
  if o not in (hair,cap):bpy.data.objects.remove(o,do_unlink=True)
finish([hair,cap],A2O,'hair_long',RATIO)
# hair1: match its HairBack cap to Arisa's (same 225-vertex VRoid cap) with a similarity fit, then Arisa -> ours
load(HAIR1);o=[x for x in bpy.data.objects if x.type=='MESH'][0]
HB_1=W(o,mat_verts(o,lambda n:'HairBack' in n));print('caps',HB_1.shape,HB_A.shape)
# hair1 faces -y (bangs at -y, bun at +y), Arisa +y: turn 180, then match the cap boxes
def box(P):return (P.min(0)+P.max(0))/2,P.max(0)-P.min(0)
c1,e1=box(HB_1);cA,eA=box(HB_A);k=eA/e1;print('hair1 cap scale',k)
def H1(P):q=(P-c1)*np.array([-1,-1,1])*k;return q+cA
keep_only(o,lambda n:'HAIR' in n)
finish([o],lambda P:A2O(H1(P)),'hair_bun',1.0)
