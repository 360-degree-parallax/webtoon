import json,sys,numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
cuts=json.load(open('cuts.json'));res={}
for ep in range(1,8):
    S=np.asarray(Image.open(f'dn/{ep}/strip.png').convert('L'));H=S.shape[0]
    occ=(S<235).mean(1)>0.02
    sel=[c for c in cuts if c['화']==ep]
    L=int(max(c['시작y']+c['높이px'] for c in sel))+10
    ref=np.zeros(L,bool)
    for c in sel: ref[int(c['시작y']):int(c['시작y']+c['높이px'])]=True
    best=None
    for sc in np.arange(0.975,0.995,0.0005):
      for off in range(-400,401,2):
        j=(np.arange(H)/sc).astype(int)+off; m=(j>=0)&(j<L)
        s=((occ[m]==ref[j[m]]).sum())/H
        if best is None or s>best[0]: best=(float(s),float(sc),off)
    res[ep]=best;print(ep,H,L,best,flush=True)
json.dump(res,open('align.json','w'))
