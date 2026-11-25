import os
HERE=os.path.dirname(os.path.abspath(__file__))
import os;P=os.environ.get('P','hc')
# 사용: python3 hc_cuts.py 화
# hc{화}_write.json 의 컷을 잘라 rough/cuts/HC/{화}/ 에 저장하고, manifest.csv · index.json 에 반영,
# 그림 컷은 칸 모양·말풍선 자동 판정을 index.json과 write.json 메모 칸에 기록
import json,sys,csv,os,io,cv2,numpy as np
from PIL import Image
import sys;sys.path.insert(0,HERE)
from panels import analyse
Image.MAX_IMAGE_PIXELS=None
ep=int(sys.argv[1]);CODE=P.upper();TID={'hc':821095,'hn':738487,'md':849913,'yp':838943}[P];NAME={'hc':'함부로 친절하지 말라','hn':'하루만 네가 되고 싶어','md':'마도애를 사랑하는 법','yp':'유사품에 주의하세요'}[P]
R=os.environ.get('ROUGH_CUTS',os.path.join(HERE,'..','..','rough','cuts'))+'/';WJ=f'{P}{ep}_write.json'
W=json.load(open(WJ));S=Image.open(f'{P}/{ep}/strip.png').convert('RGB')
os.makedirs(f'{R}{CODE}/{ep:02d}',exist_ok=True)
KIND={'single':'칸','bleed':'끝까지(테두리 없음)','multi':'여러 칸','none':'칸 없음'}
man=[];items=[]
for r in W['cut']:
    cid,typ,y,h=r[2],r[4],int(r[23]),int(r[19])
    f=f'{CODE}/{ep:02d}/{cid}.jpg';im=S.crop((0,y,690,y+h));im.save(R+f,quality=90)
    man.append([cid,CODE,ep,typ,f,y,h,690,f'comic.naver.com titleId={TID} no={ep}','네이버 원본 좌표 그대로'])
    if typ!='그림':continue
    a=analyse(cv2.cvtColor(np.asarray(im),cv2.COLOR_RGB2BGR))
    big=a['panel']=='multi'
    if a.get('balloon_cover',0)>=0.25 or a['cov']<0.4: fit='partial'
    elif big and a['cov']<0.35: fit='multi'
    else: fit='ok'
    items.append(dict(file=f,source_cut=cid,work=NAME,shot=r[7],angle=r[8],role=r[9],emotion=r[10],h_ratio=round(h/690,2),
        art=a['art'],cov=a['cov'],blocks=a['panels'],fit=fit,w=690,h=h,quad=a['quad'],frame=a['frame'],
        panel=a['panel'],balloons=a['balloons'],balloon_cover=a.get('balloon_cover',0)))
    shape=KIND[a['panel']]+(' · 사선' if a['frame']=='slant' and a['panel']!='none' else '')
    r[13]=f"칸: {shape} · 자동 말풍선 {len(a['balloons'])}"
json.dump(W,open(WJ,'w'),ensure_ascii=False)
# manifest: 같은 화 행은 갈아끼움
rows=list(csv.reader(open(R+'manifest.csv',encoding='utf-8-sig')))
hdr,body=rows[0],[x for x in rows[1:] if not x[0].startswith(f'{CODE}-{ep:02d}-')]
body+= [[str(v) for v in m] for m in man]
with open(R+'manifest.csv','w',encoding='utf-8-sig',newline='') as fp:csv.writer(fp).writerows([hdr]+body)
idx=json.load(open(R+'index.json'))
idx['items']=[i for i in idx['items'] if not i['source_cut'].startswith(f'{CODE}-{ep:02d}-')]+items
json.dump(idx,open(R+'index.json','w'),ensure_ascii=False)
from collections import Counter
print(len(man),'컷 저장,',len(items),'그림 컷',Counter(i['fit'] for i in items),Counter(i['panel'] for i in items),Counter(i['frame'] for i in items))
