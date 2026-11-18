# Queue image-to-3D jobs on the local ComfyUI: TRELLIS 2, Pixal3D (both textured) and Hunyuan3D 2.1 (shape only).
# usage: python3 run3d.py <model: trellis|pixal|hunyuan> <image.png> <name> [faces]
import json, sys, urllib.request, uuid, os
HOST = 'http://127.0.0.1:8188'
model, img, name = sys.argv[1], sys.argv[2], sys.argv[3]
FACES = int(sys.argv[4]) if len(sys.argv) > 4 else 24000

def upload(path):
    b = uuid.uuid4().hex
    data = open(path, 'rb').read()
    body = (f'--{b}\r\nContent-Disposition: form-data; name="image"; filename="{os.path.basename(path)}"\r\nContent-Type: image/png\r\n\r\n').encode() + data + \
           (f'\r\n--{b}\r\nContent-Disposition: form-data; name="overwrite"\r\n\r\ntrue\r\n--{b}--\r\n').encode()
    r = urllib.request.Request(HOST + '/upload/image', body, {'Content-Type': f'multipart/form-data; boundary={b}'})
    return json.load(urllib.request.urlopen(r))['name']

P = {}
def N(i, cls, **inp): P[str(i)] = {'class_type': cls, 'inputs': inp}; return str(i)
L = lambda i, s=0: [str(i), s]

N(1, 'LoadImage', image=upload(img))
N(2, 'LoadBackgroundRemovalModel', bg_removal_name='birefnet.safetensors')
N(3, 'RemoveBackground', bg_removal_model=L(2), image=L(1, 0))
N(4, 'ImageCropToMask', images=L(1, 0), masks=L(3), width=1024, height=1024, pad_factor=1.1, grow_mask=0,
  background='#ffffff' if model == 'hunyuan' else '#000000')
prefix = f'3d/trottville/{name}'

def game_mesh(src, i):
    """Clean watertight remesh -> decimate to the game budget -> smooth normals -> UV unwrap."""
    if model == 'hunyuan':  # RemeshMesh works in a fixed [-0.5,0.5] cube (TRELLIS scale) and would clip Hunyuan's [-1,1] mesh
        N(i + 1, 'DecimateMesh', mesh=src, target_face_count=FACES, placement_mode='midpoint')
        N(i + 2, 'MeshSmoothNormals', mesh=L(i + 1), crease_angle=180.0)
        N(i + 3, 'UnwrapMesh', mesh=L(i + 2), segmenter='pec', resolution=2048, padding=1, weld_distance=0.0002)
        return L(i + 3), src
    N(i, 'RemeshMesh', mesh=src, resolution=768, sign_mode='solid', **{'sign_mode.fill': 20.0, 'sign_mode.qef': False},
      band=1.0, project_back=0.0, fix_poles=False, smooth_iters=20, drop_small_components=0.01, precluster_max_verts=20000000)
    N(i + 1, 'DecimateMesh', mesh=L(i), target_face_count=FACES, placement_mode='midpoint')
    N(i + 2, 'MeshSmoothNormals', mesh=L(i + 1), crease_angle=180.0)
    N(i + 3, 'UnwrapMesh', mesh=L(i + 2), segmenter='pec', resolution=2048, padding=1, weld_distance=0.0002)
    return L(i + 3), L(i)  # low poly, high poly

if model in ('trellis', 'pixal'):
    N(10, 'CLIPVisionLoader', clip_name='dino_v3_L_naf_fp32.safetensors')
    if model == 'trellis':
        N(11, 'UNETLoader', unet_name='trellis_2_int8_convrot.safetensors', weight_dtype='default')
        N(12, 'Trellis2Conditioning', clip_vision_model=L(10), image=L(4))
    else:
        N(11, 'UNETLoader', unet_name='pixal3d_int8_convrot.safetensors', weight_dtype='default')
        N(13, 'LoadMoGeModel', model_name='moge_2_vitl_normal_fp16.safetensors')
        N(14, 'MoGeInference', moge_model=L(13), image=L(4), resolution_level=9, fov_x_degrees=0.0, batch_size=4,
          force_projection=True, apply_mask=True, refine_steps=3)
        N(15, 'MoGeGeometryToFOV', moge_geometry=L(14), axis='horizontal', unit='degrees')
        N(12, 'Pixal3DConditioning', clip_vision_model=L(10), image=L(4), camera_angle_x=L(15))
    N(16, 'VAELoader', vae_name='trellis_2_shape_vae_bf16.safetensors')
    N(17, 'VAELoader', vae_name='trellis_2_texture_vae_bf16.safetensors')
    # structure
    N(20, 'CFGOverride', model=L(11), cfg=1.0, start_percent=0.667, end_percent=1.0)
    N(21, 'RescaleCFG', model=L(20), multiplier=0.7)
    N(22, 'ModelSamplingSD3', model=L(21), shift=5.0)
    N(23, 'EmptyTrellis2LatentStructure', batch_size=1)
    N(24, 'KSampler', model=L(22), seed=56, steps=12, cfg=7.5, sampler_name='euler', scheduler='normal',
      positive=L(12, 0), negative=L(12, 1), latent_image=L(23), denoise=1.0)
    N(25, 'VaeDecodeStructureTrellis2', samples=L(24), vae=L(16), resolution='32')
    # shape
    N(30, 'CFGOverride', model=L(11), cfg=1.0, start_percent=0.769, end_percent=1.0)
    N(31, 'RescaleCFG', model=L(30), multiplier=0.5)
    N(32, 'Trellis2ShapeStage', positive=L(12, 0), negative=L(12, 1), voxel=L(25))
    N(33, 'KSampler', model=L(31), seed=42, steps=20, cfg=7.5, sampler_name='euler', scheduler='normal',
      positive=L(32, 0), negative=L(32, 1), latent_image=L(32, 2), denoise=1.0)
    N(34, 'Trellis2UpsampleStage', positive=L(32, 0), negative=L(32, 1), shape_latent=L(33), vae=L(16), target_resolution=1536)
    N(35, 'KSampler', model=L(31), seed=42, steps=12, cfg=7.5, sampler_name='euler', scheduler='simple',
      positive=L(34, 0), negative=L(34, 1), latent_image=L(34, 2), denoise=1.0)
    N(36, 'VaeDecodeShapeTrellis', samples=L(35), vae=L(16))
    # texture
    N(40, 'Trellis2TextureStage', positive=L(34, 0), negative=L(34, 1), shape_latent=L(35))
    N(41, 'KSampler', model=L(11), seed=43, steps=12, cfg=1.0, sampler_name='euler', scheduler='normal',
      positive=L(40, 0), negative=L(40, 1), latent_image=L(40, 2), denoise=1.0)
    N(42, 'VaeDecodeTextureTrellis', samples=L(41), vae=L(17), shape_subdivides=L(36, 1))
    low, high = game_mesh(L(36, 0), 50)
    N(60, 'BakeTextureFromVoxel', mesh=low, voxel_colors=L(42), texture_size=2048, reference_mesh=L(36, 0))
    N(61, 'BakeNormalMapFromMesh', low_poly=low, high_poly=high, resolution=2048, cage_distance=0.05, ignore_backfaces=True)
    N(62, 'ApplyTextureToMesh', mesh=low, base_color=L(60, 0), metallic=L(60, 1), roughness=L(60, 2), normal_map=L(61))
    N(63, 'MeshToFile3D', mesh=L(62))
    N(64, 'SaveGLB', mesh=L(63), filename_prefix=prefix)
    N(65, 'SaveImage', images=L(60, 0), filename_prefix=prefix + '_basecolor')
else:
    N(10, 'ImageOnlyCheckpointLoader', ckpt_name='hunyuan_3d_v2.1.safetensors')
    N(11, 'ModelSamplingAuraFlow', model=L(10, 0), shift=1.0, sampling='flow')
    N(12, 'CLIPVisionEncode', clip_vision=L(10, 1), image=L(4), crop='center')
    N(13, 'Hunyuan3Dv2Conditioning', clip_vision_output=L(12))
    N(14, 'EmptyLatentHunyuan3Dv2', resolution=4096, batch_size=1)
    N(15, 'KSampler', model=L(11), seed=56, steps=30, cfg=5.0, sampler_name='euler', scheduler='normal',
      positive=L(13, 0), negative=L(13, 1), latent_image=L(14), denoise=1.0)
    N(16, 'VAEDecodeHunyuan3D', samples=L(15), vae=L(10, 2), num_chunks=8000, octree_resolution=256)
    N(17, 'VoxelToMesh', voxel=L(16), algorithm='surface net', threshold=0.6)
    low, high = game_mesh(L(17), 50)
    N(63, 'MeshToFile3D', mesh=low)
    N(64, 'SaveGLB', mesh=L(63), filename_prefix=prefix)

r = urllib.request.Request(HOST + '/prompt', json.dumps({'prompt': P, 'client_id': 'trottville-3d', 'front': True}).encode(), {'Content-Type': 'application/json'})
try:
    print(name, json.load(urllib.request.urlopen(r)).get('prompt_id'))
except urllib.error.HTTPError as e:
    print('ERROR', name, e.read().decode()[:3000]); sys.exit(1)
