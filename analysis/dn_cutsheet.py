import json,sys
from PIL import Image,ImageDraw,ImageFont
Image.MAX_IMAGE_PIXELS=None
cuts=json.load(open('cuts.json'))
ep=int(sys.argv[1]); ids=sys.argv[2].split(',') if len(sys.argv)>2 and sys.argv[2] else None
out=sys.argv[3] if len(sys.argv)>3 else 'sheet.jpg'
S=Image.open(f'dn/{ep}/strip.png')
P=json.load(open('pos.json'))
sel=[c for c in cuts if c['화']==ep and c['유형']=='그림' and (not ids or c['컷ID'] in ids)]
TW=230; tiles=[]
try: font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',16)
except: font=None
for c in sel:
    y,y1,_=P[c['컷ID']];h=y1-y
    im=S.crop((0,max(0,y),S.width,min(S.height,y+h)))
    s=TW/im.width; th=min(int(im.height*s),700); im=im.resize((TW,max(1,int(im.height*s))))
    im=im.crop((0,0,TW,th))
    t=Image.new('RGB',(TW,th+20),'white');t.paste(im,(0,20));ImageDraw.Draw(t).text((2,1),c['컷ID'][-6:],fill='red',font=font);tiles.append(t)
# pack into columns
cols=6;W=cols*(TW+6);colh=[0]*cols;pos=[]
for t in tiles:
    i=colh.index(min(colh));pos.append((i*(TW+6),colh[i]));colh[i]+=t.height+6
O=Image.new('RGB',(W,max(colh)),'#888')
for t,p in zip(tiles,pos):O.paste(t,p)
O.save(out,quality=80);print(out,O.size,len(tiles))
