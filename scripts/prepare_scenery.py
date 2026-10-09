import json,random,math
from pathlib import Path
from PIL import Image
root=(Path(__file__).resolve().parents[1] / 'assets/data')
# Approximate roof centers read from the public USGS/NAIP orthophoto at a 1600px preview.
centers=[(643,891),(673,875),(697,861),(713,810),(741,778),(763,750),(795,707),(824,680),(847,648),(872,617),(901,584),(920,555),(943,545),(957,567),(947,595),(934,634),(913,667),(888,694),(852,731),(835,752),(809,775),(792,797),(794,823),(807,850),(823,873),(824,900),(858,890),(890,881),(913,853),(916,825),(936,789),(946,763),(960,723),(982,697),(997,670),(1019,639),(1047,626),(1058,603),(1084,614),(1092,582),(1076,559),(1065,538),(1050,517),(1027,507),(1008,480),(968,523),(975,600),(997,598),(973,650),(958,679),(941,690),(907,699),(903,744),(878,772),(858,796),(848,840),(686,920),(730,918),(775,910),(526,946),(577,944),(645,968)]
houses=[dict(x=(x/1600*2-1)*804.672,z=(y/1600*2-1)*804.672,width=15,depth=11,height=6,angle=.65,source='Approximate roof location interpreted from USGS NAIP aerial image; dimensions and heights illustrative') for x,y in centers]
houses=[h for h in houses if math.hypot(h['x'],h['z']) < 1609.344*.33-20]
(root/'illustrative-scenery.json').write_text(json.dumps(dict(note='Illustrative houses only within 0.33 miles. Centers read from the ORIGINAL half-mile NAIP crop; dimensions and heights illustrative. No generated trees.', houses=houses),separators=(',',':')))
print(len(houses),'illustrative houses; no trees')
