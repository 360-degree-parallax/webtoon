import json,sys
from PIL import Image,ImageDraw,ImageFont
Image.MAX_IMAGE_PIXELS=None
S=Image.open(sys.argv[1]);B=json.load(open(sys.argv[2]));a,b=int(sys.argv[3]),int(sys.argv[4]);out=sys.argv[5]
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',18)
TW=330;tiles=[]
for i in range(a,min(b,len(B))):
    x=B[i];im=S.crop((0,x['y'],S.width,x['y']+x['h']));s=TW/im.width;im=im.resize((TW,max(1,int(im.height*s))))
    th=min(im.height,1300);im=im.crop((0,0,TW,th))
    t=Image.new('RGB',(TW,th+22),'white');t.paste(im,(0,22));ImageDraw.Draw(t).text((2,1),f"#{i} h{x['h']}",fill='red',font=font);tiles.append(t)
cols=4;colh=[0]*cols;pos=[]
for t in tiles:
    k=colh.index(min(colh));pos.append((k*(TW+6),colh[k]));colh[k]+=t.height+6
O=Image.new('RGB',(cols*(TW+6),max(colh)),'#888')
for t,p in zip(tiles,pos):O.paste(t,p)
O.save(out,quality=82);print(out,O.size)
