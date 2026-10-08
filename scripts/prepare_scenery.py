import json,random,math
from pathlib import Path
from PIL import Image
root=(Path(__file__).resolve().parents[1] / 'assets/data')
# Approximate roof centers read from the public USGS/NAIP orthophoto at a 1600px preview.
centers=[(643,891),(673,875),(697,861),(713,810),(741,778),(763,750),(795,707),(824,680),(847,648),(872,617),(901,584),(920,555),(943,545),(957,567),(947,595),(934,634),(913,667),(888,694),(852,731),(835,752),(809,775),(792,797),(794,823),(807,850),(823,873),(824,900),(858,890),(890,881),(913,853),(916,825),(936,789),(946,763),(960,723),(982,697),(997,670),(1019,639),(1047,626),(1058,603),(1084,614),(1092,582),(1076,559),(1065,538),(1050,517),(1027,507),(1008,480),(968,523),(975,600),(997,598),(973,650),(958,679),(941,690),(907,699),(903,744),(878,772),(858,796),(848,840),(686,920),(730,918),(775,910),(526,946),(577,944),(645,968)]
houses=[dict(x=(x/1600*2-1)*804.672,z=(y/1600*2-1)*804.672,width=15,depth=11,height=6,angle=.65,source='Approximate roof location interpreted from USGS NAIP aerial image; dimensions and heights illustrative') for x,y in centers]
random.seed(42);im=Image.open(root/'neighborhood-aerial.jpg').convert('RGB');trees=[]
for _ in range(12000):
 u,v=random.random(),random.random();x=(u*2-1)*804.672;z=(v*2-1)*804.672
 if math.hypot(x,z)>794:continue
 r,g,b=im.getpixel((int(u*2047),int(v*2047)))
 # Scenery placement heuristic, not tree detection or a canopy measurement.
 if 25<r<100 and g>r*1.08 and g>b*1.07 and g<125 and not any((x-h['x'])**2+(z-h['z'])**2<225 for h in houses):
  trees.append(dict(x=round(x,2),z=round(z,2),height=round(random.uniform(8,17),2),radius=round(random.uniform(3,6),2)))
(root/'illustrative-scenery.json').write_text(json.dumps(dict(note='Illustrative reconstruction, not surveyed structures or vegetation. House centers roughly read from USGS NAIP imagery. Tree positions sampled from an image-color heuristic; all object dimensions invented for display. Does not affect flood calculations.',houses=houses,trees=trees),separators=(',',':')))
print(len(houses),'houses',len(trees),'trees')
