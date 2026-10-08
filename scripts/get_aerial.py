import urllib.request,urllib.parse,json,math
from pathlib import Path
la,lo=35.80216497959991,-83.88476899315108
r=804.672
dy=r/111320;dx=dy/math.cos(math.radians(la))
p=dict(bbox=f'{lo-dx},{la-dy},{lo+dx},{la+dy}',bboxSR=4326,imageSR=4326,size='2048,2048',format='jpg',f='image',adjustAspectRatio='false')
u='https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?'+urllib.parse.urlencode(p)
b=urllib.request.urlopen(u,timeout=60).read()
assert b[:2]==b'\xff\xd8',b[:300]
Path(str(Path(__file__).resolve().parents[1])+'/assets/data/neighborhood-aerial.jpg').write_bytes(b)
Path(str(Path(__file__).resolve().parents[1])+'/assets/data/aerial-source.json').write_text(json.dumps(dict(url=u,attribution='USDA NAIP / USGS The National Map',accessed='2026-10-08',bounds=[lo-dx,la-dy,lo+dx,la+dy],note='Orthophoto draped on terrain; capture date not verified. Not Google imagery.'),indent=2))
print('Aerial bytes',len(b))
