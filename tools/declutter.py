# 원본 컷의 말풍선 자동 제거(칸 안의 흰·미색 말풍선 + 글자 판정) · 칸 모양(사각/사선) 판정
# 사용: python3 tools/declutter.py 컷ID…  (원본|제거본을 나란히 OUT_DIR에 저장해 확인)
import cv2,numpy as np,json,sys,os
BASE=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','rough','cuts')+'/'
def balloon_mask(img,quad):
    h,w=img.shape[:2]
    hsv=cv2.cvtColor(img,cv2.COLOR_BGR2HSV);g=cv2.cvtColor(img,cv2.COLOR_BGR2GRAY)
    panel=np.zeros((h,w),np.uint8);cv2.fillPoly(panel,[np.array([[int(x*w),int(y*h)] for x,y in quad],np.int32)],1)
    e=max(5,int(min(h,w)*0.02));panel=cv2.erode(panel,np.ones((e,e),np.uint8))
    light=((hsv[...,2]>222)&(hsv[...,1]<34)).astype(np.uint8)&panel
    dark=((g<140)|((hsv[...,1]>80)&(hsv[...,2]<175))).astype(np.uint8)
    k=max(3,w//110)
    closed=cv2.morphologyEx(light,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(k,k)))&panel
    n,lab,st,_=cv2.connectedComponentsWithStats(closed,8)
    pa=max(1,int(panel.sum()));mask=np.zeros((h,w),np.uint8);found=[]
    for i in range(1,n):
        x,y,bw,bh,a=st[i]
        if a<pa*0.006 or a>pa*0.40 or bw<w*0.06 or bh<14:continue
        if bw/bh>8 or bh/bw>8:continue
        comp=(lab==i).astype(np.uint8)
        cnts,_=cv2.findContours(comp,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
        c=max(cnts,key=cv2.contourArea);ha=cv2.contourArea(cv2.convexHull(c))
        if ha<=0 or cv2.contourArea(c)/ha<0.78:continue
        filled=np.zeros((h,w),np.uint8);cv2.drawContours(filled,[c],-1,1,-1);filled&=panel
        inside=filled.astype(bool);dk=dark[inside].mean()
        if dk<0.012 or dk>0.30:continue
        # 말풍선 안은 고른 흰색·미색: 밝은 칸 비율이 높고, 글자 아닌 곳의 밝기 편차가 작아야 함
        lf=light[inside].mean();mid=((g>=140)&(g<=205)&(dark==0))[inside].mean()
        # 얼굴·옷 같은 그림은 중간 톤 음영이 많고, 말풍선은 글자 가장자리 정도만 중간 톤
        if lf<0.6 or mid>2.2*dk+0.05:continue
        pure=inside&(light>0)&(dark==0);vs=float(hsv[...,2][pure].std()) if pure.any() else 99;ss=float(hsv[...,1][pure].mean()) if pure.any() else 99
        # 말풍선 종이는 밝기·채도가 고르다(피부·옷의 음영과 구분)
        if vs>6.5 or ss>22:continue
        # 글자 확인: 안쪽 진한 점들이 작은 조각 여러 개(글자 획)로 줄지어 있어야 함
        dm=(dark&filled).astype(np.uint8);nn,_,ds,_=cv2.connectedComponentsWithStats(dm,8)
        glyphs=[d for d in ds[1:] if 3<=d[4]<=max(60,a*0.03) and d[3]<bh*0.35]
        if len(glyphs)<6:continue
        hs=sorted(d[3] for d in glyphs);mh=hs[len(hs)//2]
        if mh>max(28,bh*0.2):continue
        ring=(cv2.dilate(filled,np.ones((7,7),np.uint8))-filled)&panel
        rb=ring.astype(bool);rd=dark[rb].mean() if rb.any() else 0
        # 외곽선이 있거나, 칸 경계에 걸친 말풍선
        edge=(cv2.dilate(filled,np.ones((5,5),np.uint8))&(1-panel)).any()
        if rd<0.2 and not edge:continue
        mask|=filled;found.append((int(x),int(y),int(bw),int(bh)))
    if mask.any():mask=cv2.dilate(mask,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9)))&panel
    return mask,found
def fill_flat(img,mask):
    out=img.copy();n,lab=cv2.connectedComponents(mask)
    g=cv2.cvtColor(img,cv2.COLOR_BGR2GRAY)
    for i in range(1,n):
        m=(lab==i).astype(np.uint8);ring=(cv2.dilate(m,np.ones((19,19),np.uint8))-cv2.dilate(m,np.ones((7,7),np.uint8))).astype(bool)
        col=np.median(img[ring],axis=0) if ring.any() else np.array([235,235,235])
        out[m.astype(bool)]=col
    soft=cv2.GaussianBlur(out,(0,0),6);band=cv2.dilate(mask,np.ones((9,9),np.uint8)).astype(bool)
    out[band]=soft[band];return out
def frame_quad(img,box):
    h,w=img.shape[:2];x0,y0,x1,y1=int(box[0]*w),int(box[1]*h),int(box[2]*w),int(box[3]*h)
    hsv=cv2.cvtColor(img,cv2.COLOR_BGR2HSV);ink=((hsv[...,2]<228)|(hsv[...,1]>28)).astype(np.uint8)
    def edges(yy):
        row=ink[yy,:];xs=np.where(row>0)[0]
        return (xs[0],xs[-1]) if len(xs)>w*0.2 else None
    band=max(2,(y1-y0)//12)
    def med(rng):
        L=[edges(y) for y in rng];L=[e for e in L if e]
        if not L:return None
        a=np.array(L);return float(np.median(a[:,0])),float(np.median(a[:,1]))
    top=med(range(y0,min(h,y0+band)));bot=med(range(max(0,y1-band),y1))
    if not top or not bot:return [[box[0],box[1]],[box[2],box[1]],[box[2],box[3]],[box[0],box[3]]],'rect'
    q=[[top[0]/w,y0/h],[(top[1]+1)/w,y0/h],[(bot[1]+1)/w,y1/h],[bot[0]/w,y1/h]]
    slant=abs(q[0][0]-q[3][0])>0.03 or abs(q[1][0]-q[2][0])>0.03
    return [[round(a,3),round(b,3)] for a,b in q],('slant' if slant else 'rect')
if __name__=='__main__':
    idx=json.load(open(BASE+'index.json'));files=sys.argv[1:]
    items=[i for i in idx['items'] if not files or i['source_cut'] in files]
    for it in items:
        img=cv2.imread(BASE+it['file']);q,fr=frame_quad(img,it['art']);m,f=balloon_mask(img,q)
        clean=fill_flat(img,m) if m.any() else img
        out=os.path.join(os.environ.get('OUT_DIR','/tmp'),it['source_cut']+'.jpg')
        both=np.hstack([img,clean]);cv2.imwrite(out,both)
        print(it['source_cut'],len(f),fr)
