# maker5.html + rider_v.glb -> phone build (CDN three, glb inlined as base64 js). usage: python3 mkphone.py OUTDIR
import sys,base64
V=sys.argv[1];s=open('maker5.html').read()
imp='''<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/"}}</script>
<script src="rider.glb.js"></script>
<script src="hair_m1.glb.js"></script>
'''
i=s.index('<script type="module">');s=s[:i]+imp+s[i:]
s=s.replace("import * as T from '../../vendor/three-0.180.0/three.module.js';","import * as T from 'three';")
s=s.replace("import {GLTFLoader} from '../../vendor/three-0.180.0/addons/loaders/GLTFLoader.js';","import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';")
s=s.replace("const g=await new GLTFLoader().loadAsync(new URLSearchParams(location.search).get('f')||'rider_v.glb');","const g=await new Promise((res,rej)=>{const b=atob(window.__glb['rider.glb']);const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);new GLTFLoader().parse(u.buffer,'',res,rej);});")
s=s.replace("const HG=await new GLTFLoader().loadAsync('hair_m1.glb');","const HG=await new Promise((res,rej)=>{const b=atob(window.__glb['hair_m1.glb']);const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);new GLTFLoader().parse(u.buffer,'',res,rej);});")
s=s.replace("window.__z={FIT,fitApply,HM,setAge,POSES,X,Y,Z,T,cam,scene,g,","window.__z={FIT,fitApply,setAge,g,")
assert "three-0.180" not in s and "GLTFLoader().loadAsync" not in s and "__z={FIT,fitApply,setAge,g," in s
open(V+'/index.html','w').write(s)
open(V+'/rider.glb.js','w').write("window.__glb=window.__glb||{};window.__glb['rider.glb']='"+base64.b64encode(open('rider_v.glb','rb').read()).decode()+"';")
open(V+'/hair_m1.glb.js','w').write("window.__glb=window.__glb||{};window.__glb['hair_m1.glb']='"+base64.b64encode(open('hair_m1.glb','rb').read()).decode()+"';")
