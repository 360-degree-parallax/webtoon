# 컷 이미지 한 장에서 칸(패널)과 말풍선 상자를 찾음
# 칸: 흰 여백이 아닌 '면'(가는 선·글자는 열림 연산으로 지움)을 덩어리로 보고 큰 것만, 꼭짓점 4개로 근사
# 말풍선: 테두리로 닫힌 흰 영역 중 안에 글자(어두운 점)가 있는 것
import cv2,numpy as np

def _quad(cnt):
    hull=cv2.convexHull(cnt);peri=cv2.arcLength(hull,True)
    for e in (0.01,0.02,0.03,0.05,0.08):
        ap=cv2.approxPolyDP(hull,e*peri,True)
        if len(ap)==4:break
    if len(ap)!=4:ap=cv2.boxPoints(cv2.minAreaRect(cnt)).reshape(-1,1,2)
    p=ap.reshape(-1,2).astype(float)
    s=p.sum(1);d=p[:,0]-p[:,1]
    return [p[np.argmin(s)],p[np.argmax(d)],p[np.argmax(s)],p[np.argmin(d)]]  # 왼위·오른위·오른아래·왼아래


def _robust_line(t,v):
    # v = a*t + b, 바깥값(말풍선·효과음이 걸친 부분)을 반복해서 버림
    t=np.asarray(t,float);v=np.asarray(v,float)
    if len(t)<6:return None
    keep=np.ones(len(t),bool)
    for _ in range(4):
        a,b=np.polyfit(t[keep],v[keep],1);r=np.abs(v-(a*t+b));thr=max(3.0,np.percentile(r[keep],60)*2)
        nk=r<thr
        if nk.sum()<max(6,len(t)*0.3):break
        keep=nk
    return np.polyfit(t[keep],v[keep],1)

def edge_quad(mask):
    # 칸 마스크에서 네 변을 각각 직선으로 맞춰 꼭짓점 계산
    ys,xs=np.nonzero(mask);h,w=mask.shape
    x0,x1,y0,y1=xs.min(),xs.max(),ys.min(),ys.max()
    cols=np.arange(int(x0+(x1-x0)*0.15),int(x1-(x1-x0)*0.15)+1,max(1,(x1-x0)//60))
    rows=np.arange(int(y0+(y1-y0)*0.15),int(y1-(y1-y0)*0.15)+1,max(1,(y1-y0)//60))
    top=[(c,np.argmax(mask[:,c]>0)) for c in cols if mask[:,c].any()]
    bot=[(c,h-1-np.argmax(mask[::-1,c]>0)) for c in cols if mask[:,c].any()]
    lef=[(r,np.argmax(mask[r]>0)) for r in rows if mask[r].any()]
    rig=[(r,w-1-np.argmax(mask[r,::-1]>0)) for r in rows if mask[r].any()]
    L=[_robust_line(*zip(*e)) if len(e)>=6 else None for e in (top,bot,lef,rig)]
    if any(l is None for l in L):return None
    (ta,tb),(ba,bb),(la,lb),(ra,rb)=L   # top/bot: y=a*x+b, left/right: x=a*y+b
    def inter(ya,yb,xa,xb):
        y=(ya*xb+yb)/(1-ya*xa);x=xa*y+xb;return [x,y]
    q=[inter(ta,tb,la,lb),inter(ta,tb,ra,rb),inter(ba,bb,ra,rb),inter(ba,bb,la,lb)]
    return [[min(max(x,0),w),min(max(y,0),h)] for x,y in q]

def panels(img):
    h,w=img.shape[:2];hsv=cv2.cvtColor(img,cv2.COLOR_BGR2HSV)
    ink=((hsv[...,2]<236)|(hsv[...,1]>30)).astype(np.uint8)
    k=max(9,w//45)
    solid=cv2.morphologyEx(ink,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_RECT,(k,k)))
    solid=cv2.morphologyEx(solid,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_RECT,(5,5)))
    cs,_=cv2.findContours(solid,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    out=[]
    for c in cs:
        a=cv2.contourArea(c)
        if a<0.06*w*h:continue
        q=_quad(c);x,y,bw,bh=cv2.boundingRect(c)  # edge_quad는 흰 배경이 섞인 칸에서 틀어져 안 씀
        out.append(dict(area=a/(w*h),box=[x/w,y/h,(x+bw)/w,(y+bh)/h],quad=[[round(px/w,3),round(py/h,3)] for px,py in q]))
    out.sort(key=lambda p:-p['area'])
    return out

def balloons(img,open_k=5,min_glyph=3,solid=0.86):
    h,w=img.shape[:2];hsv=cv2.cvtColor(img,cv2.COLOR_BGR2HSV)
    white=((hsv[...,2]>228)&(hsv[...,1]<36)).astype(np.uint8)
    if open_k:white=cv2.morphologyEx(white,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(open_k,open_k)))  # 흰 여백과 이어진 가는 틈을 끊음
    n,lab,st,_=cv2.connectedComponentsWithStats(white,8)
    dark=(hsv[...,2]<130).astype(np.uint8)
    out=[]
    for i in range(1,n):
        x,y,bw,bh,a=st[i]
        if a<0.003*w*h or a>0.35*w*h or bw<28 or bh<18:continue
        if x<=1 and x+bw>=w-1:continue
        comp=(lab[y:y+bh,x:x+bw]==i).astype(np.uint8)
        cs,_=cv2.findContours(comp,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
        c=max(cs,key=cv2.contourArea);fa=cv2.contourArea(c);ha=cv2.contourArea(cv2.convexHull(c))
        if ha<=0 or fa/ha<solid:continue                    # 말풍선은 볼록한 덩어리
        filled=np.zeros_like(comp);cv2.drawContours(filled,[c],-1,1,-1)
        holes=(filled>0)&(comp==0)&(dark[y:y+bh,x:x+bw]>0)
        txt=holes.sum()/max(1,fa)
        if not 0.006<txt<0.3:continue
        ng,_,gs,_=cv2.connectedComponentsWithStats(holes.astype(np.uint8),8)
        glyphs=sum(1 for j in range(1,ng) if gs[j,4]<0.05*fa)
        if glyphs<min_glyph:continue                       # 글자는 작은 조각 여러 개
        out.append([round(x/w,3),round(y/h,3),round((x+bw)/w,3),round((y+bh)/h,3)])
    return out

def analyse(img):
    h,w=img.shape[:2];P=panels(img);B=balloons(img)
    if not P:
        return dict(panel='none',art=[0,0,1,1],quad=[[0,0],[1,0],[1,1],[0,1]],frame='rect',cov=0,balloons=B,panels=0)
    m=P[0];x0,y0,x1,y1=m['box']
    big=[p for p in P if p['area']>=0.18]
    kind='multi' if len(big)>=2 else ('bleed' if x0<=0.01 and x1>=0.99 else 'single')
    q=m['quad'];slant=abs(q[0][0]-q[3][0])>0.03 or abs(q[1][0]-q[2][0])>0.03 or abs(q[0][1]-q[1][1])>0.03 or abs(q[3][1]-q[2][1])>0.03
    # 그림 상자 안을 말풍선이 얼마나 덮는지
    ab=(x1-x0)*(y1-y0);bc=0
    for b in B:
        ix=max(0,min(x1,b[2])-max(x0,b[0]));iy=max(0,min(y1,b[3])-max(y0,b[1]));bc+=ix*iy
    return dict(panel=kind,art=[round(v,3) for v in m['box']],quad=q,frame='slant' if slant else 'rect',cov=round(m['area'],3),
                balloons=B,balloon_cover=round(bc/max(ab,1e-6),3),panels=len(P))
