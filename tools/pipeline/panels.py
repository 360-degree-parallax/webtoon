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

def balloons_v1(img,open_k=5,min_glyph=3,solid=0.86):
    # 첫 버전(HC·HN·MD 처음 판정에 사용). 비교용으로 남김
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

def _glyph_holes(comp,c,dark_or_light):
    filled=np.zeros_like(comp);cv2.drawContours(filled,[c],-1,1,-1)
    holes=(filled>0)&(comp==0)&(dark_or_light>0)
    return filled,holes

def _count_split(filled,holes,fa):
    # 붙은 말풍선: 찰흙처럼 깎아(열림 연산) 두 덩어리 이상 남고, 덩어리마다 글자가 있으면 따로 셈
    bw,bh=filled.shape[1],filled.shape[0];r=max(7,int(0.11*min(bw,bh)))
    k=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*r+1,2*r+1))
    core=cv2.morphologyEx(filled.astype(np.uint8),cv2.MORPH_OPEN,k)
    n,lab,st,_=cv2.connectedComponentsWithStats(core,8)
    parts=0
    for j in range(1,n):
        if st[j,4]<0.12*fa:continue
        reg=cv2.dilate((lab==j).astype(np.uint8),k)>0
        if (holes&reg).sum()>=12:parts+=1
    return max(1,parts)

def _text_clusters(comp,glyph,hsv,x,y,w,h,minc=4):
    # 바깥 흰 여백과 이어진 큰 흰 영역 안의 글자 덩어리(테두리 없는 대사·여백에 걸친 말풍선)를 하나씩 셈
    cs,_=cv2.findContours(comp,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    filled=np.zeros_like(comp);cv2.drawContours(filled,cs,-1,1,-1)
    holes=((filled>0)&(comp==0)&(glyph>0)).astype(np.uint8)
    ng,gl,gs,_=cv2.connectedComponentsWithStats(holes,8)
    small=np.zeros_like(holes)
    for j in range(1,ng):
        a=gs[j,4];gw,gh=gs[j,2],gs[j,3]
        if 3<=a<=0.0015*w*h and gw<0.08*w and gh<0.06*h:small[gl==j]=1
    if small.sum()==0:return []
    hv=hsv[small>0]
    if ((hv[:,1]<90)&(hv[:,2]<110)).mean()<0.6:return []
    k=max(9,int(0.022*w))
    blob=cv2.dilate(small,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(k,k)))
    nb,bl,bs,_=cv2.connectedComponentsWithStats(blob,8)
    out=[]
    for j in range(1,nb):
        bx,by,bw2,bh2,_a=bs[j]
        n=cv2.connectedComponentsWithStats((small&(bl==j)).astype(np.uint8),8)[0]-1
        if n<minc or bw2<0.06*w:continue
        if bw2>0.9*w and bh2<0.03*h:continue   # 가로로 긴 한 줄 무늬 등
        out.append([round((x+bx)/w,3),round((y+by)/h,3),round((x+bx+bw2)/w,3),round((y+by+bh2)/h,3)])
    return out

def balloons_v2(img,white_v=228,white_s=36,open_k=7,min_glyph=2,solid=0.8,min_w=20,min_h=14,inverse=True,split=True,edge_v=240,pure=0.06,ink=0.4,clusters=False,hue_r=0.9):
    h,w=img.shape[:2];hsv=cv2.cvtColor(img,cv2.COLOR_BGR2HSV)
    V,S=hsv[...,2],hsv[...,1]
    out=[]
    def scan(mask,glyph,kind):
        if open_k:mask=cv2.morphologyEx(mask,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(open_k,open_k)))
        n,lab,st,_=cv2.connectedComponentsWithStats(mask,8)
        for i in range(1,n):
            x,y,bw,bh,a=st[i]
            if a<0.002*w*h or bw<min_w or bh<min_h:continue
            comp=(lab[y:y+bh,x:x+bw]==i).astype(np.uint8)
            if a>0.35*w*h or (x<=1 and x+bw>=w-1):
                if kind=='w' and clusters:out.extend(_text_clusters(comp,glyph[y:y+bh,x:x+bw],hsv[y:y+bh,x:x+bw],x,y,w,h))
                continue
            cs,_=cv2.findContours(comp,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
            c=max(cs,key=cv2.contourArea);fa=cv2.contourArea(c);ha=cv2.contourArea(cv2.convexHull(c))
            if ha<=0 or fa/ha<(solid if kind=='w' else 0.8):continue
            filled,holes=_glyph_holes(comp,c,glyph[y:y+bh,x:x+bw])
            txt=holes.sum()/max(1,fa)
            if not 0.005<txt<0.32:continue
            # 말풍선 안은 바탕색과 글자뿐: 그 밖의 중간 톤(피부·옷 음영)이 많으면 말풍선 아님
            near=cv2.dilate(glyph[y:y+bh,x:x+bw],np.ones((3,3),np.uint8),iterations=2)
            mid=((filled>0)&(comp==0)&(near==0)).sum()/max(1,fa)
            if mid>pure:continue
            ng,_,gs,_=cv2.connectedComponentsWithStats(holes.astype(np.uint8),8)
            glyphs=sum(1 for j in range(1,ng) if 3<=gs[j,4]<0.05*fa)
            if glyphs<min_glyph:continue
            if kind=='k' and glyphs<4:continue
            # 글자는 먹색(무채색): 눈·입처럼 색이 있는 조각이 많으면 얼굴 등으로 봄
            if kind=='w' and ink:
                hv=hsv[y:y+bh,x:x+bw][holes];
                if len(hv) and ((hv[:,1]<90)&(hv[:,2]<110)).mean()<ink:
                    # 색 글씨(예: 초록 대사)는 한 가지 색으로 고르게: 색상 퍼짐이 작고 글자 조각이 많으면 인정
                    col=hv[hv[:,1]>=90]
                    if glyphs<5 or len(col)<0.6*len(hv):continue
                    ang=col[:,0].astype(float)*np.pi/90;R_=np.hypot(np.cos(ang).mean(),np.sin(ang).mean())
                    if R_<hue_r:continue
            n2=_count_split(filled,holes,fa) if split else 1
            box=[round(x/w,3),round(y/h,3),round((x+bw)/w,3),round((y+bh)/h,3)]
            rect=fa/float(bw*bh)>0.9 and fa/ha>0.97
            if rect:out.append(box+['c'])   # 네모 상자 = 나레이션(덮는 비율에는 넣고, 말풍선 수에서는 뺌)
            else:out.extend([box]*n2)
    white=((V>white_v)&(S<white_s)).astype(np.uint8)
    scan(white,(V<130).astype(np.uint8),'w')
    if inverse:
        black=(V<45).astype(np.uint8)
        scan(black,((V>200)&(S<60)).astype(np.uint8),'k')
    return out

# 2026-11-22 개선판: 뾰족·집중선 말풍선(볼록도 0.8), 검은 바탕 흰 글씨, 작은 말풍선, 붙은 말풍선 나눠 세기,
# 얼굴 오검출 제거(글자 먹색·고른 색 검사, 안쪽 중간 톤 검사), 네모 나레이션 상자는 'c'로 표시(덮는 비율에는 포함)
# 손 판정 3,668컷 기준 말풍선 수 정확 69.9% → 73.4%, ±1 91.9% → 94.6% (docs/rough-plan.md 36절)
balloons=balloons_v2

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
