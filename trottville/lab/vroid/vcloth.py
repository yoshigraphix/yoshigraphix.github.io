# exec'd from vbuild.py. Garments = copies of the VRoid body cut with planes, kept by dominant bone, pushed out.
gnames=[g.name for g in body.vertex_groups]
def cat(n):
  if n.startswith('J_Bip_'):return 'hand'
  if n.startswith('J_Sec_'):return 'chest'
  return n.split('.')[0]
ARM={'upper_arm','forearm','hand'};TORSO={'hips','spine','chest_lo','chest','shoulder','neck'};LEG={'thigh','shin','foot','toe'}
def armline(side):
  s=V['shL' if side>0 else 'shR'];w=V['wrL' if side>0 else 'wrR'];return s,w-s
def along(co):
  s,d=armline(co.x);return (co-s).dot(d)/d.length_squared
NECK=lambda z0:(Vector((0,0,z0)),Vector((0,.35,1)).normalized())
def top(sleeve,hem,neck=1.27,armpit=False):
  planes=[(Vector((0,0,hem)),Vector((0,0,1))),NECK(neck)]
  for sd in (1,-1):
    s,d=armline(sd);planes.append((s+d*max(sleeve,.0),d.normalized()))
  def keep(c,d):
    if d in ARM: return along(c)<sleeve
    if d in TORSO or d=='thigh': return c.z>hem and (c-NECK(neck)[0]).dot(NECK(neck)[1])<0
    return False
  return planes,keep
def bottom(low,waist=.885):
  return [(Vector((0,0,low)),Vector((0,0,1))),(Vector((0,0,waist)),Vector((0,0,1)))],(lambda c,d: d not in ARM and low<c.z<waist and (d in LEG or d in {'hips','spine'}))
def shoe(h):
  return [(Vector((0,0,h)),Vector((0,0,1)))],(lambda c,d: c.z<h and d in LEG)
def band(lo,hi):   # sports top: torso band only
  return [(Vector((0,0,lo)),Vector((0,0,1))),(Vector((0,0,hi)),Vector((0,0,1)))],(lambda c,d: d in TORSO and lo<c.z<hi)
G=[('tee',top(.40,.84),.014),('longtee',top(.97,.84),.014),('jacket',top(.99,.74,1.29),.019),
   ('breeches',bottom(.31),.006),('jeans',bottom(.085),.008),('shorts',bottom(.62),.008),
   ('tallboots',shoe(.45),.014),('paddock',shoe(.17),.014),('sneakers',shoe(.115),.016),
   ('undertop',band(1.02,1.19),.0035),('underbottom',bottom(.745,.90),.003)]
made=[]
bodymats=len(body.data.materials)
for gid,(planes,keep),off in G:
  o=body.copy();o.data=body.data.copy();o.name='Cloth_'+gid;bpy.context.scene.collection.objects.link(o)
  bm=bmesh.new();bm.from_mesh(o.data);dl=bm.verts.layers.deform.active
  for co,no in planes:
    bmesh.ops.bisect_plane(bm,geom=bm.verts[:]+bm.edges[:]+bm.faces[:],plane_co=co,plane_no=no)
  def domf(f):
    acc={}
    for v in f.verts:
      for gi,w in v[dl].items():acc[gi]=acc.get(gi,0)+w
    return cat(gnames[max(acc,key=acc.get)]) if acc else None
  kill=[f for f in bm.faces if not keep(f.calc_center_median(),domf(f))]
  bmesh.ops.delete(bm,geom=kill,context='FACES')
  bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS')
  bmesh.ops.remove_doubles(bm,verts=bm.verts[:],dist=.0002)
  bm.normal_update()
  base={v:(v.co.copy(),v.normal.copy()) for v in bm.verts}
  bi=[i for i,n in enumerate(gnames) if 'Bust' in n]
  bust=[v for v in bm.verts if not v.is_boundary and sum(v[dl].get(i,0) for i in bi)>.15]
  for v in bm.verts: v.co+=v.normal*off
  for _ in range(3):
    bmesh.ops.smooth_vert(bm,verts=bust,factor=.5,use_axis_x=True,use_axis_y=True,use_axis_z=True)
    for v in bm.verts:   # never sink more than half the offset toward the skin
      p0,n0=base[v];dn=(v.co-p0).dot(n0)
      if dn<off*.5:v.co+=n0*(off*.5-dn)
  bm.normal_update()
  for f in bm.faces:f.material_index=0
  bm.to_mesh(o.data);bm.free()
  o.data.materials.clear();o.data.materials.append(bpy.data.materials.new('Cloth_'+gid))
  made.append((gid,len(o.data.polygons)))
# helmet: shell over the hair shells
hv=[]
for st,objs in STY.items():
  for o in objs:
    if o.name.endswith('_shell') or o.name.endswith('_bangs'):hv+=[v.co.copy() for v in o.data.vertices]
C=Vector((0,c0[1],ez-.01));up_=[v for v in hv if v.z>brow-.02]
R=Vector((max(abs(v.x-C.x) for v in up_)*1.0,max(abs(v.y-C.y) for v in up_)*1.0,max(v.z-C.z for v in up_)*1.03))
y0,y1=C.y-R.y,C.y+R.y
def cutz(y): t=max(0,min(1,(y-y0)/(y1-y0)));t=t*t*(3-2*t);return (brow+.025)*(1-t)+(nape+.01)*t
C=C-Vector((0,0,.010))
NU,NV=48,16
def pt(th,az):return C+Vector((R.x*math.sin(th)*math.cos(az),R.y*math.sin(th)*math.sin(az),R.z*math.cos(th)))
bm=bmesh.new();rows=[]
tp=bm.verts.new(pt(0,0))
for j in range(1,NV+1):rows.append([])
for i in range(NU):
  az=2*math.pi*i/NU;lo,hi=0.,math.pi
  for _ in range(40):
    m=(lo+hi)/2;p=pt(m,az)
    if p.z>cutz(p.y):lo=m
    else:hi=m
  for j in range(1,NV+1):rows[j-1].append(bm.verts.new(pt(lo*j/NV,az)))
for i in range(NU):
  i2=(i+1)%NU;bm.faces.new((tp,rows[0][i],rows[0][i2]))
  for j in range(NV-1):bm.faces.new((rows[j][i],rows[j+1][i],rows[j+1][i2],rows[j][i2]))
bmesh.ops.recalc_face_normals(bm,faces=bm.faces[:])
pk=bmesh.new();bmesh.ops.create_uvsphere(pk,u_segments=24,v_segments=8,radius=1)
fy=C.y-R.y*.80
for v in pk.verts: v.co=Vector((v.co.x*R.x*.78,v.co.y*R.y*.50,v.co.z*.008))+Vector((0,fy,brow+.030))
bmesh.ops.delete(pk,geom=[f for f in pk.faces if f.calc_center_median().y>fy-.005],context='FACES')
tmp=bpy.data.meshes.new('pk');pk.to_mesh(tmp);pk.free();bm.from_mesh(tmp);bpy.data.meshes.remove(tmp)
hmesh=bpy.data.meshes.new('helmet');bm.to_mesh(hmesh);bm.free()
for p_ in hmesh.polygons:p_.use_smooth=True
hm=bpy.data.objects.new('Cloth_helmet',hmesh);bpy.context.scene.collection.objects.link(hm)
hm.data.materials.append(bpy.data.materials.new('Cloth_helmet'))
hm.parent=arm;g=hm.vertex_groups.new(name='head');g.add(list(range(len(hmesh.vertices))),1.0,'REPLACE')
md=hm.modifiers.new('arm','ARMATURE');md.object=arm
made.append(('helmet',len(hmesh.polygons)))
print('OUTFITS',made,'helmet R',tuple(round(x,3) for x in R))
