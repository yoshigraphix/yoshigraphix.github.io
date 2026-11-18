# Rig + render every finished image-to-3D GLB, then write the Rider Lab manifest.
# python3 process.py   (idempotent: skips models already rigged unless the source is newer)
import glob, json, os, subprocess
OUT = '/Users/ysakaguchi/claudecode-media/personal/workflows/comfy/output/3d/trottville'
LAB = '/Users/ysakaguchi/claudecode-media/personal/trottville/rider-lab'
HERE = os.path.dirname(os.path.abspath(__file__))
BL = '/Applications/Blender.app/Contents/MacOS/Blender'
MODELS = [('trellis', 'TRELLIS 2'), ('pixal', 'Pixal3D'), ('hunyuan', 'Hunyuan3D 2.1')]
OUTFITS = [('ride', 'riding', 'Riding'), ('casual', 'casual', 'Casual'), ('base', 'base', 'Base layer')]
os.makedirs(LAB, exist_ok=True); os.makedirs(f'{HERE}/renders', exist_ok=True)
man_path = f'{LAB}/lab.json'
man = json.load(open(man_path)) if os.path.exists(man_path) else {}
facts = man.get('facts', {})
for mid, _ in MODELS:
    for src_tag, oid, _ in OUTFITS:
        found = sorted(glob.glob(f'{OUT}/{mid}_{src_tag}_*.glb'), key=os.path.getmtime)
        if not found: continue
        src = found[-1]; dst = f'{LAB}/{mid}_{oid}.glb'; info = f'{LAB}/{mid}_{oid}.json'
        if os.path.exists(dst) and os.path.getmtime(dst) > os.path.getmtime(src) and os.path.exists(info):
            facts[f'{mid}_{oid}'] = json.load(open(info)); continue
        r = subprocess.run([BL, '-b', '-P', f'{HERE}/rig.py', '--', src, dst, info], capture_output=True, text=True)
        line = [l for l in r.stdout.splitlines() if l.startswith('RIG')]
        print(mid, oid, line[0] if line else 'RIG FAILED\n' + (r.stdout + r.stderr)[-1500:])
        if not os.path.exists(info): continue
        f = json.load(open(info)); f['textured'] = mid != 'hunyuan'; f['source'] = os.path.basename(src)
        json.dump(f, open(info, 'w'), indent=1); facts[f'{mid}_{oid}'] = f
        subprocess.run([BL, '-b', '-P', f'{HERE}/render_views.py', '--', src, f'{HERE}/renders/{mid}_{oid}'], capture_output=True, text=True)
man.update(models=[{'id': m, 'name': n} for m, n in MODELS],
           outfits=[{'id': o, 'name': n} for _, o, n in OUTFITS if any(k.endswith('_' + o) for k in facts)],
           facts=facts)
json.dump(man, open(man_path, 'w'), indent=1)
print('manifest', len(facts), 'models:', sorted(facts))
