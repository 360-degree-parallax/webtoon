import os
HERE=os.path.dirname(os.path.abspath(__file__))
import os;P=os.environ.get('P','hc')
# 사용: python3 hc_taxo.py 화  → hc{화}_write.json 의 rhythm을 5컷 리듬 시트(27열) 형식으로 바꿈
import json,sys,statistics as st
from collections import Counter
ep=int(sys.argv[1]);WJ=f'{P}{ep}_write.json';W=json.load(open(WJ))
q1,q2=json.load(open(os.path.join(HERE,'taxo.json')))['q']
RANK={'설정':0,'전경':1,'전신':2,'중경':3,'클로즈업':4,'디테일':5}
def dist(seq):
    r=[RANK[s] for s in seq if s in RANK]
    if len(r)<2: return '단일'
    if max(r)-min(r)<=1: return '유지·넓게' if st.mean(r)<=2 else '유지·좁게'
    steps=[b-a for a,b in zip(r,r[1:]) if b!=a];sg=[1 if s>0 else -1 for s in steps]
    ch=sum(1 for x,y in zip(sg,sg[1:]) if x!=y)
    if ch>=2:
        if r[-1]-r[0]>=2: return '좁혀감'
        if r[0]-r[-1]>=2: return '넓혀감'
        return '교차'
    if ch==0: return '좁혀감' if sg[0]>0 else '넓혀감'
    return '좁혔다 넓힘' if sg[0]>0 else '넓혔다 좁힘'
def narr(v):
    v=v.split('→');ps=[i for i,x in enumerate(v) if x=='P'];n=len(v)
    if not ps: return '무정점'
    if len(ps)>=3: return '정점 연속'
    if ps[0]==0: return '정점 선행'
    if ps[-1]==n-1 and (n==1 or ps[0]>=(n-1)*0.6): return '끝 정점'
    return '중간 정점'
NAMEINFO={'Fragmented Reveal':'조각 공개','Delayed Reveal':'지연 공개','Dramatic Irony':'독자 선행','Reaction Framing':'즉시 공개'}
NAMEGOAL={'Push-in':'몰입 유도','Pull-out':'여운','Hold':'감정 지속','Fragmented Reveal':'궁금증 유발','Delayed Reveal':'궁금증 유발','Reaction Framing':'충격 강조','Dramatic Irony':'긴장 고조','Insert':'정보 강조','Shot / Reverse Shot':'관계 대비','POV':'시점 동일시','Stretch':'감정 지속','Bridge':'장면 전환','Walk and Talk':'관계 대비','Montage':'시간 압축','Color Shock':'충격 강조'}
TONE=lambda m:'L' if m in('흰색','밝은 톤') else 'D' if m in('검정','어두운 톤','흰→검 전환') else 'A' if m.startswith('강조색') else 'M'
def colorflow(ms):
    t=sum(1 for a,b in zip(ms,ms[1:]) if a!=b)
    if t==0: return '유지'
    if any(TONE(m)=='A' for m in ms): return '강조 출현'
    if any({TONE(a),TONE(b)}=={'L','D'} for a,b in zip(ms,ms[1:])): return '명암 급변'
    if t>=3: return '교대'
    return '점진 변화'
def curve(iv):
    if not iv or max(iv)==min(iv): return '평탄'
    f,l=iv[0],iv[-1];mx=max(iv);mn=min(iv)
    if mx>max(f,l) : return '산형'
    if mn<min(f,l): return '골형'
    return '상승' if l>f else '하강' if l<f else '평탄'

if len(W['rhythm'][0])==27:sys.exit('이미 변환됨')
cut={}
for r in W['cut']:
    if r[12]: cut.setdefault(r[12],[]).append((r[4],r[11],r[6],r[9]))
out=[]
for g in W['rhythm']:
    cs=cut.get(g[2],[]);pics=[c for c in cs if c[0]=='그림'];dn=g[19]/max(1,len(pics))/690
    d=dist(g[13].split('→'));tp='빠름' if dn<q1 else '느림' if dn>q2 else '보통'
    nr=narr(g[12]);roles=[c[3] for c in pics]
    if g[3] in NAMEINFO: info=NAMEINFO[g[3]]
    elif '공개' in roles:
        i=roles.index('공개');info='즉시 공개' if i<=len(roles)//2 else '지연 공개'
    else: info='흐름 유지'
    cf=colorflow([c[2] for c in cs]);cv=curve([c[1] for c in pics])
    goal=NAMEGOAL.get(g[3]) or ('장면 전환' if g[14]=='장면 전환' else '정보 전달')
    out.append(g[:4]+[f'{d} · {tp} · {nr}',d,tp,nr,info,cf,cv,goal]+g[6:11]+[g[12],g[13],g[14],g[15],g[16],g[17],g[18],g[19],g[4],g[5]])
W['rhythm']=out;json.dump(W,open(WJ,'w'),ensure_ascii=False)
print(len(out),'묶음',Counter(o[4] for o in out).most_common(5))
