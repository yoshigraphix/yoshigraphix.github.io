# blender -b -P rig.py -- in.glb out.glb out.json [height]
# Auto-rig an A-pose image-to-3D character: find landmarks from the mesh shape, build one shared skeleton
# (same bone names for every model), skin with Blender's automatic (heat) weights, export a skinned GLB.
import bpy, sys, json, math, mathutils
import numpy as np
argv = sys.argv[sys.argv.index('--') + 1:]
src, dst, info = argv[0], argv[1], argv[2]
HEIGHT = float(argv[3]) if len(argv) > 3 else 1.6

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for o in bpy.context.scene.objects: o.select_set(o.type == 'MESH')
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1: bpy.ops.object.join()
ob = bpy.context.view_layer.objects.active
for o in list(bpy.context.scene.objects):
    if o is not ob and o.type != 'MESH': bpy.data.objects.remove(o)
ob.parent = None
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
# weld vertices split at UV seams (UVs live on face corners, so the texture is unchanged)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=1e-5); bpy.ops.object.mode_set(mode='OBJECT')

def V(): return np.array([v.co[:] for v in ob.data.vertices])
P = V()
# Blender is Z-up; glTF front (+Z) imports as -Y. Normalise: feet on z=0, centred, height = HEIGHT.
mn, mx = P.min(0), P.max(0)
s = HEIGHT / (mx[2] - mn[2])
off = np.array([-(mn[0] + mx[0]) / 2, -(mn[1] + mx[1]) / 2, -mn[2]])
for v in ob.data.vertices: v.co = mathutils.Vector(((np.array(v.co[:]) + off) * s).tolist())
ob.data.update()
P = V(); H = HEIGHT
x, y, z = P[:, 0], P[:, 1], P[:, 2]

def band(z0, z1, xmax=None):
    m = (z >= z0) & (z < z1)
    if xmax is not None: m &= np.abs(x) < xmax
    return P[m]

def clusters_x(pts, binw=.004 * H):
    """Contiguous occupied x-intervals (sorted)."""
    if len(pts) == 0: return []
    xs = np.sort(pts[:, 0]); out = [[xs[0], xs[0]]]
    for a in xs[1:]:
        if a - out[-1][1] > binw: out.append([a, a])
        else: out[-1][1] = a
    return out

# --- neck: narrowest torso band between 70% and 93% of the height
best = None
for zz in np.arange(.74 * H, .86 * H, .005 * H):
    b = band(zz, zz + .01 * H, xmax=.12 * H)
    if len(b) < 10: continue
    cl = [c for c in clusters_x(b) if c[0] < 0 < c[1]]
    if not cl: continue
    w = cl[0][1] - cl[0][0]
    if best is None or w < best[0]: best = (w, zz)
neck_z = .815 * H  # measured once on the reference sheet: every model is the same character in the same pose
measured_neck = best[1] + .005 * H if best else None
head_top = z.max()

# --- crotch: highest z (30–60%) where the centre column is empty between two legs
crotch_z = .45 * H
for zz in np.arange(.52 * H, .38 * H, -.004 * H):
    b = band(zz, zz + .008 * H, xmax=.12 * H)
    if len(b) < 6: continue
    if not np.any(np.abs(b[:, 0]) < .006 * H) and np.any(b[:, 0] < 0) and np.any(b[:, 0] > 0):
        crotch_z = zz; break

# --- torso half width at chest height (cluster containing x=0), arms are the outer clusters
chest_z = .70 * H
b = band(chest_z, chest_z + .015 * H)
tor = [c for c in clusters_x(b) if c[0] < 0 < c[1]]
half = (tor[0][1] - tor[0][0]) / 2 if tor else .1 * H
arms_separate = len(clusters_x(b)) >= 3
shoulder_z = .765 * H
shoulder_x = max(.06 * H, half * .85)
wb = band(crotch_z + .1 * H, crotch_z + .12 * H)
wc = [c for c in clusters_x(wb) if c[0] < 0 < c[1]]
waist_half = (wc[0][1] - wc[0][0]) / 2 if wc else .08 * H

def side(sgn):
    S = P[np.sign(x) == sgn]
    # fingertip = the furthest-out point below the shoulders
    low = S[S[:, 2] < shoulder_z]
    tip = low[np.argmax(np.abs(low[:, 0]))]
    # arm axis: fit a line through this arm's vertices (outside the waist), follow it up to shoulder height
    A = S[(np.abs(S[:, 0]) > waist_half + .04 * H) & (S[:, 2] > tip[2] + .1 * H) & (S[:, 2] < .62 * H)]
    if len(A) > 50:
        c0 = A.mean(0); u = np.linalg.svd(A - c0)[2][0]
        if u[2] < 0: u = -u
        sh = c0 + u * (shoulder_z - c0[2]) / max(.2, u[2]); sh[0] -= sgn * .015 * H
        sh[0] = sgn * min(.10 * H, max(.075 * H, abs(sh[0])))
    else:
        sh = np.array([sgn * shoulder_x, 0, shoulder_z])
    sh[1] = np.median(band(shoulder_z - .02 * H, shoulder_z + .02 * H, xmax=abs(sh[0]))[:, 1]); sh[2] = shoulder_z
    d = sh - tip; d /= np.linalg.norm(d)
    wrist = tip + d * .085 * H
    elbow = (sh + wrist) / 2 + np.array([0, .01 * H, 0])  # tiny backward bend so the elbow knows which way to fold
    # legs
    hipz = crotch_z + .035 * H
    lb = band(crotch_z - .06 * H, crotch_z - .02 * H, xmax=.2 * H); lb = lb[np.sign(lb[:, 0]) == sgn]
    hip = np.array([np.mean(lb[:, 0]), np.mean(lb[:, 1]), hipz]) if len(lb) else np.array([sgn * .05 * H, 0, hipz])
    ankle_z = .055 * H
    kz = (hipz + ankle_z) / 2 + .01 * H
    kb = band(kz - .01 * H, kz + .01 * H, xmax=.2 * H); kb = kb[np.sign(kb[:, 0]) == sgn]
    knee = np.array([np.mean(kb[:, 0]), np.mean(kb[:, 1]) - .012 * H, kz]) if len(kb) else np.array([hip[0], 0, kz])
    ab = band(ankle_z - .01 * H, ankle_z + .01 * H, xmax=.2 * H); ab = ab[np.sign(ab[:, 0]) == sgn]
    ankle = np.array([np.mean(ab[:, 0]), np.mean(ab[:, 1]), ankle_z]) if len(ab) else np.array([knee[0], 0, ankle_z])
    fb = P[(z < .04 * H) & (np.sign(x) == sgn)]
    toe = np.array([np.mean(fb[:, 0]), fb[:, 1].min() + .01 * H, .015 * H]) if len(fb) else ankle + np.array([0, -.08 * H, -.04 * H])
    return dict(shoulder=sh, elbow=elbow, wrist=wrist, tip=tip, hip=hip, knee=knee, ankle=ankle, toe=toe)

L, R = side(1), side(-1)
cy = float(np.median(band(crotch_z, neck_z, xmax=half)[:, 1]))
J = dict(root=[0, cy, crotch_z + .02 * H], spine=[0, cy, crotch_z + .12 * H], chest=[0, cy, chest_z],
         neck=[0, cy, neck_z - .015 * H], head=[0, cy, neck_z + .01 * H], top=[0, cy, head_top])

arm = bpy.data.armatures.new('rig'); rig = bpy.data.objects.new('rig', arm); bpy.context.scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='EDIT')
E = arm.edit_bones
def bone(name, a, b, parent=None, conn=False):
    e = E.new(name); e.head = mathutils.Vector(list(map(float, a))); e.tail = mathutils.Vector(list(map(float, b)))
    if parent: e.parent = E[parent]; e.use_connect = conn
    return e
bone('hips', J['root'], J['spine'])
bone('spine', J['spine'], J['chest'], 'hips', True)
bone('chest', J['chest'], J['neck'], 'spine', True)
bone('neck', J['neck'], J['head'], 'chest', True)
bone('head', J['head'], J['top'], 'neck', True)
for n, S in (('L', L), ('R', R)):
    bone(f'shoulder.{n}', J['neck'], S['shoulder'], 'chest')
    bone(f'upper_arm.{n}', S['shoulder'], S['elbow'], f'shoulder.{n}', True)
    bone(f'forearm.{n}', S['elbow'], S['wrist'], f'upper_arm.{n}', True)
    bone(f'hand.{n}', S['wrist'], S['tip'], f'forearm.{n}', True)
    bone(f'thigh.{n}', S['hip'], S['knee'], 'hips')
    bone(f'shin.{n}', S['knee'], S['ankle'], f'thigh.{n}', True)
    bone(f'foot.{n}', S['ankle'], S['toe'], f'shin.{n}', True)
for e in E: e.roll = 0
bpy.ops.object.mode_set(mode='OBJECT')

# skin: automatic (heat) weights; fall back to envelope-free nearest-bone weights if heat leaves vertices unweighted
bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active = rig
method = 'heat'
try: bpy.ops.object.parent_set(type='ARMATURE_AUTO')
except Exception as e: method = 'failed:' + str(e)[:80]
def unweighted():
    return sum(1 for v in ob.data.vertices if sum(g.weight for g in v.groups) < 1e-3)
zero = unweighted()
if zero > .005 * len(ob.data.vertices):
    # nearest-bone (distance to bone segment) weights, two closest bones blended
    method = f'distance (heat left {zero} verts unweighted)'
    for g in list(ob.vertex_groups): ob.vertex_groups.remove(g)
    segs = [(b.name, np.array(b.head_local[:]), np.array(b.tail_local[:])) for b in arm.bones]
    groups = {n: ob.vertex_groups.new(name=n) for n, _, _ in segs}
    for v in ob.data.vertices:
        p = np.array(v.co[:]); ds = []
        for n, a, b in segs:
            ab = b - a; t = np.clip(np.dot(p - a, ab) / max(1e-9, np.dot(ab, ab)), 0, 1); ds.append((np.linalg.norm(p - (a + ab * t)), n))
        ds.sort(); (d0, n0), (d1, n1) = ds[0], ds[1]
        w0 = 1 / (d0 + 1e-4) ** 3; w1 = 1 / (d1 + 1e-4) ** 3; t = w0 + w1
        groups[n0].add([v.index], w0 / t, 'REPLACE'); groups[n1].add([v.index], w1 / t, 'REPLACE')
    if not any(m.type == 'ARMATURE' for m in ob.modifiers):
        m = ob.modifiers.new('rig', 'ARMATURE'); m.object = rig
    ob.parent = rig
# limit to 4 influences per vertex (what glTF / Three.js use), normalise
bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)

# mesh facts that matter for motion
import bmesh
bm = bmesh.new(); bm.from_mesh(ob.data)
islands = 0; seen = set()
for v in bm.verts:
    if v.index in seen: continue
    islands += 1; stack = [v]
    while stack:
        q = stack.pop()
        if q.index in seen: continue
        seen.add(q.index); stack.extend(e.other_vert(q) for e in q.link_edges)
nonmanifold = sum(1 for e in bm.edges if not e.is_manifold)
bm.free()
tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
# arm/body and leg/leg separation in the rest pose (fused limbs deform badly)
def gap(z0, z1, xa, xb):
    bb = band(z0, z1); a = bb[(bb[:, 0] > xa) & (bb[:, 0] < xb)]
    return float(np.sum(np.abs(np.diff(np.sort(a[:, 0]))) > .01 * H)) if len(a) else 0
facts = dict(tris=tris, verts=len(ob.data.vertices), islands=islands, nonmanifold_edges=nonmanifold, weights=method,
             arms_separate_at_chest=bool(arms_separate), crotch_height=round(crotch_z / H, 3), neck_height=round(neck_z / H, 3),
             joints={k: [round(float(c), 3) for c in v] for k, v in {**{f'{k}.L': L[k] for k in L}, **{f'{k}.R': R[k] for k in R}, **J}.items()})
json.dump(facts, open(info, 'w'), indent=1)
print('RIG', json.dumps({k: facts[k] for k in ('tris', 'verts', 'islands', 'nonmanifold_edges', 'weights', 'arms_separate_at_chest')}))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_skins=True, export_animations=False, export_yup=True,
                          export_apply=False, use_selection=False)
