# blender -b -P garments.py -- base_rigged.glb dressed_raw.glb set(riding|casual) outdir
# Cut clothing pieces out of a dressed (fused) image-to-3D mesh, fit them over the rigged skin-tight base body,
# copy the body's skin weights onto them and export each piece as its own skinned GLB on the SAME skeleton.
import bpy, bmesh, sys, json, math, mathutils, os
import numpy as np
from mathutils.bvhtree import BVHTree
argv = sys.argv[sys.argv.index('--') + 1:]
base_glb, dressed_glb, SET, outdir = argv[:4]
GAP = .006  # how far a garment must sit outside the skin (m)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=base_glb)
rig = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
body = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
B = {b.name: b for b in rig.data.bones}
W = rig.matrix_world
def head(n): return np.array((W @ B[n].head_local)[:])
def tail(n): return np.array((W @ B[n].tail_local)[:])
H = max((body.matrix_world @ mathutils.Vector(c)).z for c in body.bound_box)
neck_z = head('neck')[2]; chest_z = head('chest')[2]; hips_z = head('hips')[2]
crotch_z = hips_z - .02 * H
knee_z = (head('shin.L')[2] + head('shin.R')[2]) / 2; ankle_z = (head('foot.L')[2] + head('foot.R')[2]) / 2
wrist = {s: head(f'hand.{s}') for s in 'LR'}; shoulder = {s: head(f'upper_arm.{s}') for s in 'LR'}

# body BVH in world space
dg = bpy.context.evaluated_depsgraph_get()
bm = bmesh.new(); bm.from_mesh(body.data); bm.transform(body.matrix_world); bm.normal_update()
bvh = BVHTree.FromBMesh(bm)

# --- dressed mesh: import, join, normalise onto the base by matching the crotch and neck heights
before = set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=dressed_glb)
new = [o for o in bpy.context.scene.objects if o not in before]
dm = [o for o in new if o.type == 'MESH']
darm = next((o for o in new if o.type == 'ARMATURE'), None)   # dressed GLB already rigged by rig.py = same scale/landmarks
dshift = 0.0
if darm:
    dB = {b.name: b for b in darm.data.bones}
    dshift = np.mean([(W @ B[n].head_local).y - (darm.matrix_world @ dB[n].head_local).y for n in ('upper_arm.L', 'upper_arm.R', 'thigh.L', 'thigh.R') if n in dB])
    for o in dm:
        mw_ = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw_
        for m_ in list(o.modifiers): o.modifiers.remove(m_)
bpy.ops.object.select_all(action='DESELECT')
for o in dm: o.select_set(True)
bpy.context.view_layer.objects.active = dm[0]
if len(dm) > 1: bpy.ops.object.join()
D = bpy.context.view_layer.objects.active
for o in new:
    if o is not D and o.name in bpy.data.objects and o.type != 'MESH': bpy.data.objects.remove(o)
D.parent = None; bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=1e-5); bpy.ops.object.mode_set(mode='OBJECT')
P = np.array([v.co[:] for v in D.data.vertices])

def landmarks(P, H):
    x, z = P[:, 0], P[:, 2]
    def band(z0, z1, xmax=None):
        m = (z >= z0) & (z < z1)
        if xmax is not None: m &= np.abs(x) < xmax
        return P[m]
    def cl(pts, bw):
        xs = np.sort(pts[:, 0]); out = [[xs[0], xs[0]]]
        for a in xs[1:]:
            if a - out[-1][1] > bw: out.append([a, a])
            else: out[-1][1] = a
        return out
    best = None
    for zz in np.arange(.74 * H, .86 * H, .005 * H):
        b = band(zz, zz + .01 * H, xmax=.12 * H)
        if len(b) < 10: continue
        c = [q for q in cl(b, .004 * H) if q[0] < 0 < q[1]]
        if c and (best is None or c[0][1] - c[0][0] < best[0]): best = (c[0][1] - c[0][0], zz)
    neck = best[1] + .005 * H
    crotch = .45 * H
    for zz in np.arange(.52 * H, .38 * H, -.004 * H):
        b = band(zz, zz + .008 * H, xmax=.12 * H)
        if len(b) >= 6 and not np.any(np.abs(b[:, 0]) < .006 * H) and np.any(b[:, 0] < 0) and np.any(b[:, 0] > 0): crotch = zz; break
    return neck, crotch

if darm:
    P[:, 1] += dshift
else:
  mn, mx = P.min(0), P.max(0)
  P = (P - np.array([(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, mn[2]])) * (H / (mx[2] - mn[2]))
  dn, dc = landmarks(P, H)
  bn, bc = landmarks(np.array([(body.matrix_world @ v.co)[:] for v in body.data.vertices]), H)
  k = (bn - bc) / max(1e-6, dn - dc)            # stretch so crotch and neck line up with the base body
  P[:, 2] = bc + (P[:, 2] - dc) * k
  P[:, 0] *= (1 + k) / 2; P[:, 1] *= (1 + k) / 2
for v, p in zip(D.data.vertices, P): v.co = mathutils.Vector(p.tolist())
D.data.update()

# --- colour per vertex from the base-colour texture (if any)
col = np.full((len(P), 3), .5)
mat = D.active_material
img = None
if mat and mat.use_nodes:
    for n in mat.node_tree.nodes:
        if n.type == 'TEX_IMAGE' and n.image: img = n.image; break
if img:
    w, h = img.size; px = np.array(img.pixels[:]).reshape(h, w, 4)
    uv = D.data.uv_layers.active.data; acc = np.zeros((len(P), 3)); cnt = np.zeros(len(P))
    for poly in D.data.polygons:
        for li in poly.loop_indices:
            vi = D.data.loops[li].vertex_index; u, vv = uv[li].uv
            c = px[min(h - 1, max(0, int(vv * h))), min(w - 1, max(0, int(u * w))), :3]; acc[vi] += c; cnt[vi] += 1
    col = acc / np.maximum(1, cnt)[:, None]
r, g, b = col[:, 0], col[:, 1], col[:, 2]
lum = .3 * r + .59 * g + .11 * b
skin = (r > g) & (g > b) & (r - b > .08) & (lum > .38) & (r > .45)
bluish = (b >= r - .02)
x, y, z = P[:, 0], P[:, 1], P[:, 2]

def along_arm(s):
    """0 at the shoulder, 1 at the wrist, >1 into the hand, for vertices out on side s."""
    a, w_ = shoulder[s], wrist[s]; d = w_ - a; L = np.dot(d, d)
    return ((P - a) @ d) / L
side = np.where(x > 0, 'L', 'R')
tL, tR = along_arm('L'), along_arm('R'); t_arm = np.where(x > 0, tL, tR)
torso_half = abs(shoulder['L'][0]) * .95
is_arm = (np.abs(x) > torso_half * .9) & (z < neck_z) & (z > crotch_z) & (t_arm > .05)
is_hand = is_arm & (t_arm > 1.0)
is_head = z > neck_z - .01 * H

brow_z = neck_z + .62 * (H - neck_z)
hp = P[z > neck_z]; head_cy = (hp[:, 1].min() + hp[:, 1].max()) / 2 if len(hp) else 0
is_face = (z > neck_z - .01 * H) & (z < brow_z) & (y < head_cy) & (np.abs(x) < .045 * H)
pieces = {}
if SET == 'riding':
    boot_top = knee_z + .02 * H
    if img:  # first height (going up the shin) where the colour turns light (tan breeches)
        for zz in np.arange(ankle_z, crotch_z, .01 * H):
            m = (z > zz) & (z < zz + .012 * H) & ~is_arm
            if m.sum() > 20 and lum[m].mean() > .42: boot_top = zz; break
    pieces['helmet'] = is_head & (bluish | (lum < .22)) & (z > neck_z + .06 * H)
    pieces['hair'] = is_head & ~pieces['helmet'] & ~skin & (z > neck_z - .01 * H) & (y > -.02 * H)  # ponytail behind
    pieces['gloves'] = is_hand
    pieces['jacket'] = ((z > hips_z - .07 * H) & (z <= neck_z + .01 * H) & ~is_hand & ~is_head) | (is_arm & ~is_hand)
    pieces['breeches'] = (z > boot_top) & (z <= hips_z - .07 * H) & ~is_arm
    pieces['boots'] = (z <= boot_top) & ~is_arm
else:
    shoe_top = ankle_z + .025 * H
    pieces['hair'] = is_head & ~skin & (z > neck_z - .02 * H)
    pieces['bomber'] = ((z > hips_z - .05 * H) & (z <= neck_z + .01 * H) & ~is_head) | is_arm
    pieces['bomber'] &= ~is_hand
    pieces['joggers'] = (z > shoe_top) & (z <= hips_z - .05 * H) & ~is_arm
    pieces['sneakers'] = (z <= shoe_top) & ~is_arm
# one owner per vertex (first wins in this order)
for n in ('hair', 'helmet'):
    if n in pieces: pieces[n] &= ~is_face
foot_top = boot_top if SET == 'riding' else shoe_top
order = list(pieces)
taken = np.zeros(len(P), bool)
for n in order: pieces[n] &= ~taken; taken |= pieces[n]
label = np.full(len(P), -1)
for i, n in enumerate(order): label[pieces[n]] = i
face_label = []
for poly in D.data.polygons:
    ls = [label[v] for v in poly.vertices if label[v] >= 0]
    face_label.append(max(set(ls), key=ls.count) if ls else -1)
face_label = np.array(face_label)

# --- build each piece: copy D, keep faces whose vertices are all in the piece, push out of the body, transfer weights
report = {}
for n in order:
    sel = pieces[n]; fi = order.index(n)
    if (face_label == fi).sum() < 30: report[n] = 'skipped (too few vertices)'; continue
    ob = D.copy(); ob.data = D.data.copy(); ob.name = f'{SET}_{n}'; bpy.context.scene.collection.objects.link(ob)
    bm2 = bmesh.new(); bm2.from_mesh(ob.data); bm2.verts.ensure_lookup_table()
    bm2.faces.ensure_lookup_table()
    kill = [f for f in bm2.faces if face_label[f.index] != fi]
    bmesh.ops.delete(bm2, geom=kill, context='FACES')
    loose = [v for v in bm2.verts if not v.link_faces]; bmesh.ops.delete(bm2, geom=loose, context='VERTS')
    # keep only sizeable islands (drop specks)
    pushed = 0
    for v in bm2.verts:
        hit = bvh.find_nearest(v.co)
        if hit[0] is None: continue
        loc, nrm = hit[0], hit[1]; d = (v.co - loc).dot(nrm)
        if d < GAP: v.co = loc + nrm * GAP; pushed += 1
    bm2.to_mesh(ob.data); bm2.free(); ob.data.update()
    # skin weights from the body
    for g in list(ob.vertex_groups): ob.vertex_groups.remove(g)
    for g in body.vertex_groups: ob.vertex_groups.new(name=g.name)
    m = ob.modifiers.new('wt', 'DATA_TRANSFER'); m.object = body; m.use_vert_data = True
    m.data_types_verts = {'VGROUP_WEIGHTS'}; m.vert_mapping = 'POLYINTERP_NEAREST'
    m.layers_vgroup_select_src = 'ALL'; m.layers_vgroup_select_dst = 'NAME'
    bpy.context.view_layer.objects.active = ob; bpy.ops.object.modifier_apply(modifier='wt')
    am = ob.modifiers.new('rig', 'ARMATURE'); am.object = rig; ob.parent = rig
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True)
    bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
    tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    report[n] = {'tris': tris, 'pushed_out': pushed}
    # export this piece with the skeleton
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); rig.select_set(True)
    hidden = [o for o in bpy.context.scene.objects if o not in (ob, rig)]
    bpy.ops.export_scene.gltf(filepath=f'{outdir}/swap_{SET}_{n}.glb', export_format='GLB', export_skins=True,
                              export_animations=False, use_selection=True, export_yup=True)
D.hide_set(True)
# --- body mask for this outfit: hide body faces that clothing covers, so skin can never poke through when posed
made = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith(SET + '_')]
gbm = bmesh.new()
for o in made:
    tmp = bmesh.new(); tmp.from_mesh(o.data); tmp.transform(o.matrix_world)
    me = bpy.data.meshes.new('t'); tmp.to_mesh(me); tmp.free(); gbm.from_mesh(me); bpy.data.meshes.remove(me)
gbvh = BVHTree.FromBMesh(gbm)
mw = body.matrix_world; nm = mw.to_3x3().inverted().transposed()
covered = np.zeros(len(body.data.vertices), bool)
for v in body.data.vertices:
    p = mw @ v.co; n = (nm @ v.normal).normalized()
    hit = gbvh.ray_cast(p - n * .002, n, .08)          # clothing straight out from the skin
    near = gbvh.find_nearest(p, .05)                     # or clothing wrapped closely around it (feet in boots, puffy sleeves)
    if hit[0] is not None or (near[0] is not None and (near[0] - p).dot(n) > -.004): covered[v.index] = True
    if p.z < foot_top: covered[v.index] = True
    if p.z > neck_z - .01 * H and p.z < brow_z and n.y < -.2 and abs(p.x) < .045 * H: covered[v.index] = False
mb = body.copy(); mb.data = body.data.copy(); mb.name = f'body_{SET}'; bpy.context.scene.collection.objects.link(mb)
bm3 = bmesh.new(); bm3.from_mesh(mb.data)
kill = [f for f in bm3.faces if all(covered[v.index] for v in f.verts)]
bmesh.ops.delete(bm3, geom=kill, context='FACES_ONLY'); bm3.to_mesh(mb.data); bm3.free()
for m_ in mb.modifiers:
    if m_.type == 'ARMATURE': m_.object = rig
mb.parent = rig
bpy.ops.object.select_all(action='DESELECT'); mb.select_set(True); rig.select_set(True)
bpy.ops.export_scene.gltf(filepath=f'{outdir}/swap_{SET}_body.glb', export_format='GLB', export_skins=True,
                          export_animations=False, use_selection=True, export_yup=True)
report['body_mask'] = {'hidden_faces': len(kill), 'covered_verts': int(covered.sum())}
json.dump(report, open(f'{outdir}/swap_{SET}.json', 'w'), indent=1)
print('GARMENTS', SET, json.dumps(report))
