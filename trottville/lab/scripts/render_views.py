# blender -b -P render_views.py -- model.glb out_prefix
# Renders FRONT / SIDE / 3/4 on a light grey ground like the reference sheet, and prints the mesh stats.
import bpy, sys, math, mathutils
argv = sys.argv[sys.argv.index('--') + 1:]
glb, out = argv[0], argv[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)
objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs)
verts = sum(len(o.data.vertices) for o in objs)
# bounds
mn = mathutils.Vector((1e9,) * 3); mx = -mn
for o in objs:
    for c in o.bound_box:
        w = o.matrix_world @ mathutils.Vector(c); mn = mathutils.Vector(map(min, mn, w)); mx = mathutils.Vector(map(max, mx, w))
ctr = (mn + mx) / 2; size = mx - mn
print(f'STATS tris={tris} verts={verts} size={tuple(round(s, 3) for s in size)}')
sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE_NEXT'
sc.render.resolution_x, sc.render.resolution_y = 512, 768
sc.world = bpy.data.worlds.new('w'); sc.world.use_nodes = True
sc.world.node_tree.nodes['Background'].inputs[0].default_value = (0.93, 0.92, 0.92, 1); sc.world.node_tree.nodes['Background'].inputs[1].default_value = 1.0
sc.view_settings.view_transform = 'Standard'
for e, rot in [(3.0, (50, 0, 30)), (1.2, (60, 0, -120))]:
    l = bpy.data.lights.new('sun', 'SUN'); l.energy = e; lo = bpy.data.objects.new('sun', l); lo.rotation_euler = [math.radians(a) for a in rot]; sc.collection.objects.link(lo)
cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'
H = max(size.x, size.y, size.z)
cam.ortho_scale = H * 1.12
co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
# glTF is Y-up -> Blender Z-up; the character faces -Y in Blender after import (front = +Z in glTF).
up = 2 if size.z >= size.y else 1
for tag, ang in [('front', 0), ('side', 90), ('34', 35)]:
    a = math.radians(ang); d = H * 3
    if up == 2:
        co.location = (ctr.x + d * math.sin(a), ctr.y - d * math.cos(a), ctr.z)
    else:
        co.location = (ctr.x + d * math.sin(a), ctr.y, ctr.z + d * math.cos(a))
    co.rotation_euler = (co.location - ctr).to_track_quat('Z', 'Y' if up == 2 else 'Y').to_euler()
    sc.render.filepath = f'{out}_{tag}.png'
    bpy.ops.render.render(write_still=True)
