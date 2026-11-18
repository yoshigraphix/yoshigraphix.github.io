# Qwen Image Edit 2511 (local ComfyUI): turn a dressed view of the rider into the plain base body that
# every outfit and hair style sits on. usage: python3 basebody.py <image.png> <name> <seed> [view]
import json, sys, urllib.request, uuid, os
HOST = 'http://127.0.0.1:8188'
img, name, seed = sys.argv[1], sys.argv[2], int(sys.argv[3])
view = sys.argv[4] if len(sys.argv) > 4 else 'front'

def upload(path):
    b = uuid.uuid4().hex; data = open(path, 'rb').read()
    body = (f'--{b}\r\nContent-Disposition: form-data; name="image"; filename="{os.path.basename(path)}"\r\nContent-Type: image/png\r\n\r\n').encode() + data + \
           (f'\r\n--{b}\r\nContent-Disposition: form-data; name="overwrite"\r\n\r\ntrue\r\n--{b}--\r\n').encode()
    return json.load(urllib.request.urlopen(urllib.request.Request(HOST + '/upload/image', body, {'Content-Type': f'multipart/form-data; boundary={b}'})))['name']

PROMPT = ("Keep exactly the same girl: same face, same eyes, same skin tone, same body proportions, same height, "
          f"same {view} view, same A-pose with arms slightly out, same soft 3D animated film render style and lighting. "
          "Remove every piece of clothing and accessory: no helmet, no jacket, no shirt, no gloves, no breeches, no boots. "
          "Instead she wears a plain light grey SKIN-TIGHT base layer that hugs the body like a second skin, with no folds or loose fabric: a skin-tight short-sleeve crew-neck top and skin-tight knee-length shorts (like a gymnastics or swim base layer, not underwear), "
          "bare forearms and hands, bare lower legs, bare feet standing flat. "
          "Cover all of her hair with a smooth, snug light grey swim cap that shows the natural head shape, keep her ears, eyebrows and eyelashes. "
          "Plain light grey studio background, full body, nothing cropped.")
NEG = "hair, ponytail, helmet, hat, jacket, boots, shoes, gloves, belt, logo, pattern, extra limbs, cropped, text"

P = {}
def N(i, cls, **inp): P[str(i)] = {'class_type': cls, 'inputs': inp}; return str(i)
L = lambda i, s=0: [str(i), s]
N(1, 'UnetLoaderGGUF', unet_name='qwen-image-edit-2511-Q8_0.gguf')
N(2, 'ModelSamplingAuraFlow', model=L(1), shift=3.1)
N(3, 'CFGNorm', model=L(2), strength=1.0)
N(4, 'CLIPLoader', clip_name='qwen_2.5_vl_7b.safetensors', type='qwen_image')
N(5, 'VAELoader', vae_name='qwen_image_vae.safetensors')
N(6, 'LoadImage', image=upload(img))
N(7, 'ImageScaleToTotalPixels', image=L(6), upscale_method='lanczos', megapixels=1.0, resolution_steps=16)
N(8, 'TextEncodeQwenImageEditPlus', clip=L(4), vae=L(5), prompt=PROMPT, image1=L(7))
N(9, 'TextEncodeQwenImageEditPlus', clip=L(4), vae=L(5), prompt=NEG, image1=L(7))
N(10, 'VAEEncode', pixels=L(7), vae=L(5))
N(11, 'KSampler', model=L(3), seed=seed, steps=24, cfg=4.0, sampler_name='euler', scheduler='simple',
  positive=L(8), negative=L(9), latent_image=L(10), denoise=1.0)
N(12, 'VAEDecode', samples=L(11), vae=L(5))
N(13, 'SaveImage', images=L(12), filename_prefix=f'3d/trottville/{name}')
r = urllib.request.Request(HOST + '/prompt', json.dumps({'prompt': P, 'client_id': 'trottville-3d', 'front': True}).encode(), {'Content-Type': 'application/json'})
try: print(name, json.load(urllib.request.urlopen(r)).get('prompt_id'))
except urllib.error.HTTPError as e: print('ERROR', e.read().decode()[:2000]); sys.exit(1)
