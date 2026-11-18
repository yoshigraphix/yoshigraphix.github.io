# exec'd from vbuild.py after the garments: a 'Child' shape key on the body and every garment (not helmet/hair).
# Narrower shoulders and hips, straighter waist, slimmer limbs; blended per vertex by bone weights so seams stay closed.
def smt(e0,e1,x):
  t=max(0.,min(1.,(x-e0)/(e1-e0)));return t*t*(3-2*t)
def W(z):   # torso width factor by height
  pts=[(.70,.90),(.80,.87),(.92,.90),(.98,.98),(1.06,.93),(1.18,.91),(1.26,.90),(1.34,.90)]
  if z<=pts[0][0]:return pts[0][1]
  for (z0,a),(z1,b) in zip(pts,pts[1:]):
    if z<=z1:return a+(b-a)*smt(z0,z1,z)
  return pts[-1][1]
def Dp(z):  # torso depth factor
  return 1-.06*smt(.75,.85,z)*(1-smt(.95,1.0,z))-.05*smt(1.0,1.08,z)*(1-smt(1.18,1.24,z))
SLIM=.88
def segs(side):
  s='.'+side
  return {'thigh':(bone('thigh'+s),bone('shin'+s)),'shin':(bone('shin'+s),bone('foot'+s)),
          'upper_arm':(bone('upper_arm'+s),bone('forearm'+s)),'forearm':(bone('forearm'+s),bone('hand'+s))}
SEG={'L':segs('L'),'R':segs('R')}
SHX=abs(bone('upper_arm.L').x);HPX=abs(bone('thigh.L').x)
def radial(p,a,b,f):
  d=b-a;t=max(0,min(1,(p-a).dot(d)/d.length_squared));c=a+d*t;return (c-p)*(1-f)*-1*-1
def disp(p,ws):
  out=Vector((0,0,0));tot=0
  side='L' if p.x>0 else 'R';sg=1 if p.x>0 else -1
  for n,w in ws:
    if w<=0:continue
    c=cat(n)
    if c in ('head',):d=Vector((0,0,0))
    elif c in ('upper_arm','forearm','hand'):
      d=Vector((sg*SHX*(W(1.26)-1),0,0))
      key=c if c!='hand' else 'forearm'
      a,b=SEG[side][key];cc=a+(b-a)*max(0,min(1,(p-a).dot(b-a)/(b-a).length_squared))
      d+=(cc-p)*(1-SLIM)*(1 if c!='hand' else .4)
    elif c in ('thigh','shin','foot','toe'):
      d=Vector((sg*HPX*(W(.86)-1),0,0))
      if c in ('thigh','shin'):
        a,b=SEG[side][c];cc=a+(b-a)*max(0,min(1,(p-a).dot(b-a)/(b-a).length_squared))
        d+=(cc-p)*(1-SLIM)
    else:   # torso, neck, bust
      d=Vector((p.x*(W(p.z)-1),(p.y-bone('spine').y)*(Dp(p.z)-1),0))
      if c=='neck':d=Vector((p.x*(.92-1),0,0))
    out+=d*w;tot+=w
  return out/tot if tot else out
nk=0
for o in [body]+[x for x in bpy.data.objects if x.type=='MESH' and x.name.startswith('Cloth_') and x.name!='Cloth_helmet']:
  me=o.data;gn=[g.name for g in o.vertex_groups]
  if not me.shape_keys:o.shape_key_add(name='Basis',from_mix=False)
  k=o.shape_key_add(name='Child',from_mix=False)
  for v in me.vertices:
    ws=[(gn[g.group],g.weight) for g in v.groups]
    k.data[v.index].co=v.co+disp(v.co,ws)
  nk+=1
print('CHILD KEYS',nk)
