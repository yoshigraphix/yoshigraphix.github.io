import math,json,urllib.request,io
from pathlib import Path
from PIL import Image
lat,lon=35.80216497959991,-83.88476899315108
radius=1609.344
n=161
z=14
cache={}
sources=[]
def sample(east,north):
    la=lat+north/111320
    lo=lon+east/(111320*math.cos(math.radians(lat)))
    x=(lo+180)/360*2**z*256
    y=(1-math.asinh(math.tan(math.radians(la)))/math.pi)/2*2**z*256
    # Decode before bilinear interpolation: encoded RGB is not continuous across carries.
    def pixel(px,py):
        tile=(px//256,py//256)
        if tile not in cache:
            url=f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{tile[0]}/{tile[1]}.png'
            cache[tile]=Image.open(io.BytesIO(urllib.request.urlopen(url,timeout=30).read())).convert('RGB')
            sources.append(url)
        r,g,b=cache[tile].getpixel((px%256,py%256))
        return r*256+g+b/256-32768
    x0,y0=math.floor(x),math.floor(y)
    dx,dy=x-x0,y-y0
    return round(sum(pixel(x0+i,y0+j)*(dx if i else 1-dx)*(dy if j else 1-dy) for i in (0,1) for j in (0,1)),3)
heights=[sample((c/(n-1)*2-1)*radius,(1-r/(n-1)*2)*radius) for r in range(n) for c in range(n)]
data=dict(center=[lat,lon],radiusMeters=radius,size=n,spacingMeters=2*radius/(n-1),heights=heights,accessed='2026-10-08',sources=sources,attribution='Mapzen Terrain Tiles on AWS. United States 3DEP and global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological Survey.',method='Bilinearly sampled decoded Terrarium elevations; local east/north approximation; no source accuracy claim.',verticalDatum='Not verified for this crop; do not mix with gauge elevations without datum reconciliation.')
(Path(__file__).resolve().parents[1] / 'assets/data/flood-terrain.json').write_text(json.dumps(data,separators=(',',':'))+'\n')
print({'tiles':len(cache),'minMeters':min(heights),'maxMeters':max(heights),'centerMeters':heights[len(heights)//2]})
