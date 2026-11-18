# exec'd from zbuild.py after zoutfits.py. Simple anime hairstyles: smooth solid shapes (shell + bangs + tails),
# flat toon colour, no strand textures. Each piece gets a helmet copy (SHH_) squashed inside the helmet shell.
import bmesh, math
from mathutils import Vector
print('HAIRNUMS', 'c0', [round(x,3) for x in c0], 'rad', [round(x,3) for x in rad], 'brow', round(brow,3), 'nape', round(nape,3), 'ez', round(ez,3))
HELR = R.copy()
HC = Vector((c0[0], c0[1], c0[2] - .004))
HR = Vector((rad[0]*1.05, rad[1]*1.05, rad[2]*1.05))
def sm(e0, e1, x):
  t = max(0., min(1., (x-e0)/(e1-e0))); return t*t*(3-2*t)
def profile(phi, zb, scale=1., flare=.18, th0=0., tuck=0.):
  """meridian polyline at azimuth phi (0 = front/-y), from polar angle th0 down to height zb (ellipsoid, then hanging straight down)."""
  R = HR*scale; out = []
  dirx, diry = math.sin(phi), -math.cos(phi)
  for k in range(0, 61):
    th = th0 + (math.pi/2 - th0)*k/60
    out.append(Vector((HC.x + R.x*math.sin(th)*dirx, HC.y + R.y*math.sin(th)*diry, HC.z + R.z*math.cos(th))))
  eq = out[-1]
  for k in range(1, 61):
    d = .45*k/60
    a_ = abs(math.degrees(math.atan2(math.sin(phi), math.cos(phi))))
    fl = flare - tuck*(1 - sm(70, 110, a_))
    out.append(eq + Vector((dirx*d*fl, diry*d*fl, -d)))
  # cut at zb
  res = [out[0]]
  for a, b in zip(out, out[1:]):
    if b.z >= zb: res.append(b); continue
    t = (a.z - zb)/(a.z - b.z); res.append(a.lerp(b, t)); break
  return res
def resample(poly, n):
  L = [0.]
  for a, b in zip(poly, poly[1:]): L.append(L[-1] + (b-a).length)
  out = []; j = 0
  for k in range(n):
    s = L[-1]*k/(n-1)
    while j < len(L)-2 and L[j+1] < s: j += 1
    seg = L[j+1]-L[j]; t = 0 if seg == 0 else (s-L[j])/seg
    out.append(poly[j].lerp(poly[j+1], t))
  return out
def grid_mesh(name, rows, closed, cap_top):
  """rows[i] = list of NV points down the meridian at column i."""
  bm = bmesh.new(); V = [[bm.verts.new(p) for p in col] for col in rows]
  NU = len(V); NV = len(V[0])
  rng = range(NU) if closed else range(NU-1)
  for i in rng:
    i2 = (i+1) % NU
    for j in range(NV-1):
      try: bm.faces.new((V[i][j], V[i][j+1], V[i2][j+1], V[i2][j]))
      except ValueError: pass
  bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=.0004)
  bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
  me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); return me
def tooth(phi, n, amp):
  x = (phi/(2*math.pi))*n; f = x - math.floor(x); return amp*(1 - abs(2*f - 1))**1.6
def shell(style, side_z, back_z, teeth=(0, 0), flare=.18, back_from=110, tuck=.35):
  NU, NV = 64, 18; rows = []
  for i in range(NU):
    phi = 2*math.pi*i/NU; a = abs(math.degrees(math.atan2(math.sin(phi), math.cos(phi))))
    zf = brow + .028
    zs = side_z + (back_z - side_z)*sm(back_from - 25, back_from + 20, a)
    zb = zf + (zs - zf)*sm(32, 72, a)
    if teeth[0] and a > 60: zb -= tooth(phi, teeth[0], teeth[1])*sm(60, 85, a)
    rows.append(resample(profile(phi, zb, 1., flare, 0., tuck), NV))
  # close the crown: all columns start at the same pole point already (th=0)
  return grid_mesh('SH_'+style+'_shell', rows, True, True)
LOCKS = [-52, -27, -4, 20, 44]
def bangs(style, side=True, length=.030):
  NU, NV = 48, 12; rows = []
  amax = 82 if side else 62
  for i in range(NU+1):
    a = -amax + 2*amax*i/NU; phi = math.radians(a); aa = abs(a)
    # lock tips: pointed clumps across the forehead
    d = min(abs(a - c) for c in LOCKS); w = max(0, 1 - d/13)
    zb = brow + .022 - length*w**1.4 - .004
    if side: zb = zb + (ez - .085 - zb)*sm(56, 74, aa)*(1 - .5*sm(78, 82, aa))
    if aa > amax - 1: zb = max(zb, brow + .02)
    rows.append(resample(profile(phi, zb, 1.022, .10, .30, .75), NV))
  return grid_mesh('SH_'+style+'_bangs', rows, False, False)
def tube(name, pts, rad_fn, sides=12, flat=1., twist=0.):
  bm = bmesh.new(); rings = []; n = len(pts)
  for k, p in enumerate(pts):
    t = (pts[min(k+1, n-1)] - pts[max(k-1, 0)]).normalized()
    sx = Vector((1, 0, 0)); sx = (sx - t*sx.dot(t)).normalized(); sy = t.cross(sx)
    r = rad_fn(k/(n-1)); ring = []
    for s in range(sides):
      an = 2*math.pi*s/sides + twist*k
      ring.append(bm.verts.new(p + sx*math.cos(an)*r + sy*math.sin(an)*r*flat))
    rings.append(ring)
  for k in range(n-1):
    for s in range(sides):
      s2 = (s+1) % sides; bm.faces.new((rings[k][s], rings[k][s2], rings[k+1][s2], rings[k+1][s]))
  for ring, tip in ((rings[0], pts[0]), (rings[-1], pts[-1])):
    c = bm.verts.new(tip)
    for s in range(sides): bm.faces.new((ring[s], ring[(s+1) % sides], c))
  bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
  me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); return me
def bez(p0, p1, p2, p3, n):
  out = []
  for k in range(n):
    t = k/(n-1); u = 1-t
    out.append(p0*u**3 + p1*3*u*u*t + p2*3*u*t*t + p3*t**3)
  return out
def ellip(name, c, r, seg=20):
  bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg//2+2, radius=1)
  for v in bm.verts: v.co = Vector((v.co.x*r[0], v.co.y*r[1], v.co.z*r[2])) + c
  me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); return me
back = HC + Vector((0, HR.y, 0))     # back of the head at eye height
STY = {}
def add(style, me, solid=.0065, follow_chest=False):
  o = bpy.data.objects.new(me.name, me); bpy.context.scene.collection.objects.link(o)
  if solid:
    md = o.modifiers.new('sol', 'SOLIDIFY'); md.thickness = solid; md.offset = -1; md.use_even_offset = True
    bpy.context.view_layer.objects.active = o; bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
    bpy.ops.object.modifier_apply(modifier='sol')
  for p_ in o.data.polygons: p_.use_smooth = True
  mat = bpy.data.materials.get('Hair_'+style) or bpy.data.materials.new('Hair_'+style)
  o.data.materials.clear(); o.data.materials.append(mat)
  o.parent = arm
  gh = o.vertex_groups.new(name='head'); gc = o.vertex_groups.new(name='chest')
  for v in o.data.vertices:
    w = sm(1.36, 1.24, v.co.z) if follow_chest else 0.
    gh.add([v.index], 1-w, 'REPLACE')
    if w > 0: gc.add([v.index], w, 'REPLACE')
  md = o.modifiers.new('arm', 'ARMATURE'); md.object = arm
  STY.setdefault(style, []).append(o); return o
# ---------- trim skull poking through the shell ----------
ntr = 0
for o in hp:
  if not o.name.startswith('Head_'): continue
  bm2 = bmesh.new(); bm2.from_mesh(o.data)
  def outs(v):
    p = v.co; q = p - HC; e = ((q.x/HR.x)**2 + (q.y/HR.y)**2 + (q.z/HR.z)**2)**.5
    return e > .975 and (p.z > brow + .035 or (p.y > HC.y + .04 and p.z > ez - .10))
  kill = [f for f in bm2.faces if any(outs(v) for v in f.verts)]; ntr += len(kill)
  bmesh.ops.delete(bm2, geom=kill, context='FACES'); bm2.to_mesh(o.data); bm2.free()
print('SKULL TRIM', ntr)
# ---------- styles ----------
side_short = ez - .045
back_tight = ez - .115
# 1 short: soft cap with a few points at the nape
add('short', shell('short', side_short, back_tight + .01, teeth=(22, .022), flare=.06))
add('short', bangs('short', side=False, length=.026))
# 2 bob: chin length all round, gentle flare
add('bob', shell('bob', ez - .125, ez - .125, teeth=(30, .012), flare=.22, back_from=90))
add('bob', bangs('bob', side=False, length=.032))
# 3 ponytail: tight cap, side locks, high tail
add('ponytail', shell('ponytail', side_short, back_tight, teeth=(28, .010), flare=.04))
add('ponytail', bangs('ponytail', side=True, length=.028))
p0 = back + Vector((0, -.012, .045))
pts = bez(p0, p0 + Vector((0, .09, .03)), p0 + Vector((0, .13, -.14)), p0 + Vector((0, .07, -.34)), 26)
add('ponytail', tube('SH_ponytail_tail', pts, lambda t: (.024 + .040*math.sin(min(1, t*2.2)*math.pi/2))*(1 - t)**.75 + .002, flat=.75), solid=0, follow_chest=True)
add('ponytail', tube('SH_ponytail_tie', bez(p0 + Vector((0, .008, .004)), p0 + Vector((0, .02, .008)), p0 + Vector((0, .03, .008)), p0 + Vector((0, .04, .006)), 5), lambda t: .024, flat=.8), solid=0)
# 4 braid: tight cap + one braid down the back
add('braid', shell('braid', side_short, back_tight, teeth=(28, .010), flare=.04))
add('braid', bangs('braid', side=True, length=.028))
b0 = back + Vector((0, -.035, -.10))
bp = bez(b0, b0 + Vector((0, .035, -.05)), b0 + Vector((0, .03, -.16)), b0 + Vector((0, .02, -.30)), 10)
for k in range(len(bp)-1):
  c = (bp[k] + bp[k+1])/2; off = .007*(1 if k % 2 else -1); sc = 1 - .35*k/(len(bp)-1)
  me = ellip('SH_braid_b%d' % k, c + Vector((off, 0, 0)), (.034*sc, .028*sc, .036*sc), 16)
  o = add('braid', me, solid=0, follow_chest=True)
  o.rotation_euler = (0, math.radians(18 if k % 2 else -18), 0)
add('braid', ellip('SH_braid_tie', bp[-1] + Vector((0, 0, .002)), (.014, .013, .008), 12), solid=0, follow_chest=True)
add('braid', tube('SH_braid_end', bez(bp[-1], bp[-1] + Vector((0, 0, -.02)), bp[-1] + Vector((0, 0, -.035)), bp[-1] + Vector((0, .004, -.05)), 8), lambda t: .014*(1 - t)**.8 + .001), solid=0, follow_chest=True)
# 5 bun: tight cap + low bun at the nape
add('bun', shell('bun', side_short, back_tight, teeth=(28, .010), flare=.04))
add('bun', bangs('bun', side=True, length=.028))
add('bun', ellip('SH_bun_bun', back + Vector((0, .012, -.045)), (.052, .042, .046), 22), solid=0)
# 6 long: straight to mid-back, side locks
add('long', shell('long', ez - .10, 1.10, teeth=(26, .02), flare=.16, back_from=140))
add('long', bangs('long', side=True, length=.030))
# rotated beads: bake the rotation into the mesh
for os_ in STY['braid']:
  if os_.rotation_euler.y:
    c = sum((v.co for v in os_.data.vertices), Vector())/len(os_.data.vertices)
    RM = Matrix.Translation(c) @ os_.rotation_euler.to_matrix().to_4x4() @ Matrix.Translation(-c)
    os_.data.transform(RM); os_.rotation_euler = (0, 0, 0)
# ---------- helmet copies ----------
nh = 0
for st, objs in STY.items():
  for o in objs:
    c = o.copy(); c.data = o.data.copy(); c.name = 'SHH_' + o.name[3:]; bpy.context.scene.collection.objects.link(c)
    for v in c.data.vertices:
      p = v.co.copy(); q = p - C; e = ((q.x/HELR.x)**2 + (q.y/HELR.y)**2 + (q.z/HELR.z)**2)**.5
      k = max(0, min(1, (p.z - (cutz(p.y) - .035))/.035))
      if e > .93 and k > 0:
        t = .93/e; v.co = C + q*(1 - (1-t)*k)
    nh += 1
print('SIMPLE HAIR', {k: len(v) for k, v in STY.items()}, 'helmet copies', nh)
