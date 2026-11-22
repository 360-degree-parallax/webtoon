import json,sys,numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
def segment(path,thr=16,sliver=40,maxgap=15,mode="new"):
    S=np.asarray(Image.open(path).convert('RGB')).astype(np.int16);H=S.shape[0]
    sd=S.std(1).mean(1);blank=sd<thr
    blocks=[];i=0
    while i<H:
        j=i
        while j<H and blank[j]==blank[i]: j+=1
        if not blank[i]:
            if blocks and i-blocks[-1][1]<12: blocks[-1][1]=j
            else: blocks.append([i,j])
        i=j
    blocks=[b for b in blocks if b[1]-b[0]>=12]
    if mode=='new':
        # merge slivers (balloon fragments, gradient strips) into nearer neighbour if gap small
        changed=True
        while changed:
            changed=False
            for k,b in enumerate(blocks):
                if b[1]-b[0]<sliver:
                    gp=b[0]-blocks[k-1][1] if k>0 else 1e9
                    gn=blocks[k+1][0]-b[1] if k+1<len(blocks) else 1e9
                    if min(gp,gn)<=maxgap:
                        if gp<=gn: blocks[k-1][1]=b[1]
                        else: blocks[k+1][0]=b[0]
                        del blocks[k];changed=True;break
    return blocks
def score(blocks,cuts):
    starts=np.array([b[0] for b in blocks]);hit=0
    for c in cuts:
        if np.abs(starts-c[0]).min()<=25: hit+=1
    return hit/len(cuts),len(blocks)/len(cuts)
if __name__=='__main__':
    for mode in ['old','new']:
        tot=[]
        for ep in range(1,8):
            W=json.load(open(f'gm{ep}_write.json'));cuts=[(int(r[23]),int(r[19])) for r in W['cut']]
            b=segment(f'gm/{ep}/strip.png',mode=mode);h,ratio=score(b,cuts);tot.append((h,ratio))
            print(mode,ep,f'경계일치 {h:.0%} 블록/컷 {ratio:.2f}')
        print(mode,'평균',f'{np.mean([t[0] for t in tot]):.0%}',f'{np.mean([t[1] for t in tot]):.2f}')
