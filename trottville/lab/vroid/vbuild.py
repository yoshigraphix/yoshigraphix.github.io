# VRoid base rider: low VRoid body+face (expressions) + our outfits, simple hairstyles, helmet. Exports one glb.
import bpy,sys,math,bmesh,os
import numpy as np
from mathutils import Vector,Matrix
a=sys.argv[sys.argv.index('--')+1:];SRC,OUT=a[0],a[1];H=float(a[2]) if len(a)>2 else 1.58
HERE=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
arm=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]
for o in list(bpy.data.objects):
  if o.type=='EMPTY' or o.name in('Hair','Icosphere'):bpy.data.objects.remove(o,do_unlink=True)
body=bpy.data.objects['Body'];face=bpy.data.objects['Face']
def delfaces(o,test):
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.delete(bm,geom=[f for f in bm.faces if test(f)],context='FACES')
  bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS');bm.to_mesh(o.data);bm.free()
hb={i for i,m in enumerate(body.data.materials) if 'HAIR' in m.name}
delfaces(body,lambda f:f.material_index in hb)
# ---- scale to rider height (data level, shape keys too)
top=max((face.matrix_world@v.co).z for v in face.data.vertices);S=H/top
for o in (body,face):o.data.transform(o.matrix_world,shape_keys=True);o.data.transform(Matrix.Scale(S,4),shape_keys=True)
bpy.context.view_layer.objects.active=arm;bpy.ops.object.mode_set(mode='EDIT')
for b in list(arm.data.edit_bones):
  if b.name.startswith('J_Sec_Hair'):arm.data.edit_bones.remove(b);continue
for b in arm.data.edit_bones:
  b.head=(arm.matrix_world@b.head)*S;b.tail=(arm.matrix_world@b.tail)*S
bpy.ops.object.mode_set(mode='OBJECT')
arm.matrix_world=Matrix.Identity(4)
for o in (body,face):o.matrix_world=Matrix.Identity(4)
for o in (body,face):o.matrix_parent_inverse=Matrix.Identity(4)
# ---- rename bones to the page's names (vertex groups follow)
REN={'J_Bip_C_Hips':'hips','J_Bip_C_Spine':'spine','J_Bip_C_Chest':'chest_lo','J_Bip_C_UpperChest':'chest','J_Bip_C_Neck':'neck','J_Bip_C_Head':'head'}
for s in 'LR':REN.update({f'J_Bip_{s}_Shoulder':'shoulder.'+s,f'J_Bip_{s}_UpperArm':'upper_arm.'+s,f'J_Bip_{s}_LowerArm':'forearm.'+s,f'J_Bip_{s}_Hand':'hand.'+s,
  f'J_Bip_{s}_UpperLeg':'thigh.'+s,f'J_Bip_{s}_LowerLeg':'shin.'+s,f'J_Bip_{s}_Foot':'foot.'+s,f'J_Bip_{s}_ToeBase':'toe.'+s})
for k,v in REN.items():arm.data.bones[k].name=v
for o in (body,face):
  for g in o.vertex_groups:
    if g.name in REN:g.name=REN[g.name]
bone=lambda n:Vector(arm.data.bones[n].head_local)
hz=bone('head').z+.012
# the Body mesh carries the back of the skull (the Face mesh is only a front mask): keep it, use it for the fit
BH=np.array([v.co[:] for v in body.data.vertices if v.co.z>hz]);print('BODY HEAD verts',len(BH))
# kid-friendly: smooth the chest detail away on the base body itself
bm=bmesh.new();bm.from_mesh(body.data);dl=bm.verts.layers.deform.active
gn=[g.name for g in body.vertex_groups];bi=[i for i,n in enumerate(gn) if 'Bust' in n]
bust=[v for v in bm.verts if sum(v[dl].get(i,0) for i in bi)>.10 and not v.is_boundary]
for _ in range(6):bmesh.ops.smooth_vert(bm,verts=bust,factor=.6,use_axis_x=True,use_axis_y=True,use_axis_z=True)
bm.to_mesh(body.data);bm.free();print('BUST SMOOTH',len(bust))
print('LANDMARKS',{n:round(bone(n).z,3) for n in ('hips','spine','chest','neck','head','thigh.L','shin.L','foot.L')},'shoulder',tuple(round(x,3) for x in bone('upper_arm.L')))
V={'shL':bone('upper_arm.L'),'shR':bone('upper_arm.R'),'wrL':bone('hand.L'),'wrR':bone('hand.R')}
# ---- head numbers for hair/helmet
fm=face.data;mi={i:m.name for i,m in enumerate(fm.materials)}
def mverts(key):
  s=set()
  for p in fm.polygons:
    if key in mi[p.material_index]:s.update(p.vertices)
  return np.array([fm.vertices[i].co[:] for i in s])
Ew=mverts('EyeWhite');ez=float(Ew[:,2].mean());brow=float(Ew[:,2].max())+.010
Sk=np.concatenate([mverts('Face_00_SKIN'),BH]);zt=float(Sk[:,2].max());rz=(zt-ez)*1.03
up=Sk[Sk[:,2]>ez+.035];yc=float((Sk[Sk[:,2]>ez][:,1].min()+Sk[Sk[:,2]>ez][:,1].max())/2)+.004
f_=np.sqrt(np.clip(1-((up[:,2]-ez)/rz)**2,.05,1))
rx=float((np.abs(up[:,0])/f_).max())*1.03
bk=Sk[(Sk[:,2]>ez-.05)&(Sk[:,1]>yc)];fb=np.sqrt(np.clip(1-((bk[:,2]-ez)/rz)**2,.05,1))
ry=max(float(((bk[:,1]-yc)/fb).max())*1.03,float((np.abs(up[:,1]-yc)/f_).max())*1.04)
NEW_C=Vector((0,yc,ez));NEW_R=Vector((rx,ry,rz))
print('HEAD new c',tuple(round(x,3) for x in NEW_C),'r',tuple(round(x,3) for x in NEW_R),'brow',round(brow,3))
# ---- simple hair, built in the old Zeze head frame then fitted onto this head
c0=np.array([0,-0.032,1.434]);rad=np.array([.177,.117,.202]);OLD_brow,OLD_ez=1.477,1.434
brow_new,ez_new=brow,ez;brow,ez=OLD_brow,OLD_ez;hp=[];R=Vector((1,1,1));nape=OLD_brow-.11
src=open(os.path.join(HERE,'zhair_src.py')).read()
p1,p2=src.split('# ---------- helmet copies ----------')
exec(p1)
OC=Vector(c0.tolist());OR=Vector(rad.tolist())
FIT=Matrix.Translation(NEW_C)@Matrix.Diagonal((NEW_R.x/OR.x,NEW_R.y/OR.y,NEW_R.z/OR.z,1))@Matrix.Translation(-OC)
for st,objs in STY.items():
  for o in objs:
    o.data.transform(FIT)
    g=o.vertex_groups.get('chest')
brow,ez=brow_new,ez_new;nape=brow-.11*NEW_R.z/OR.z
c0=np.array(NEW_C[:]);rad=np.array(NEW_R[:])
# trim skull bits poking through the hair shell
HC=NEW_C;HR=NEW_R*1.0
ski={i for i,n in mi.items() if 'Face_00_SKIN' in n}
def outs(v):
  q=v.co-HC;e=((q.x/HR.x)**2+(q.y/HR.y)**2+(q.z/HR.z)**2)**.5
  return e>.975 and (v.co.z>brow+.03 or (v.co.y>HC.y+.03 and v.co.z>ez-.06))
nk=len(fm.shape_keys.key_blocks)
delfaces(face,lambda f:f.material_index in ski and any(outs(v) for v in f.verts))
delfaces(body,lambda f:all(v.co.z>hz for v in f.verts) and any(outs(v) for v in f.verts))
print('SKULL TRIM keys before/after',nk,len(face.data.shape_keys.key_blocks))
# ---- helmet (shell over the hair), outfits
exec(open(os.path.join(HERE,'vcloth.py')).read())
exec(open(os.path.join(HERE,'vchild.py')).read())
# ---- helmet hair copies
exec(p2.replace('HELR','R'))
# tidy + export
for m in list(bpy.data.materials):
  if m.users==0:bpy.data.materials.remove(m)
bpy.ops.object.select_all(action='SELECT')
print('TRIS',sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.data.objects if o.type=='MESH'))
bpy.ops.export_scene.gltf(filepath=OUT,export_format='GLB',use_selection=True,export_yup=True,export_skins=True,export_animations=False,export_morph=True,export_morph_normal=False,export_extras=False)
