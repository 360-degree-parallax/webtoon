import json,statistics as st
from collections import Counter
# 5컷 리듬 표를 분류 코드로 바꿈
# 사용: python3 taxonomy.py rhythm_rows.json cuts.json > 결과는 taxo.json
#  rhythm_rows.json: 5컷 리듬 시트 A:T 행(머리행 포함) 리스트
#  cuts.json: [{"group":묶음ID,"type":유형,"intensity":강도,"mass":덩어리색,"role":역할}, ...]
import sys
_all=json.load(open(sys.argv[1]));hdr=_all[0];G=_all[1:]
_cuts=json.load(open(sys.argv[2]))
# per-cut data
cut={}
for c in _cuts: cut.setdefault(c['group'],[]).append((c['type'],c['intensity'],c['mass'],c['role']))
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
dens=[]
for g in G:
    pics=[c for c in cut.get(g[2],[]) if c[0]=='그림'] or [1]
    w=700 if g[2].startswith('DN') else 690  # 작품별 원본 폭
    dens.append(g[19]/len(pics)/w)
q1,q2=st.quantiles(dens,n=3)
out=[];cnt={k:Counter() for k in '거리 템포 서사 정보 색 감정 목적'.split()}
for g,dn in zip(G,dens):
    cs=cut.get(g[2],[]);pics=[c for c in cs if c[0]=='그림']
    d=dist(g[13].split('→'));tp='빠름' if dn<q1 else '느림' if dn>q2 else '보통'
    nr=narr(g[12]);roles=[c[3] for c in pics]
    if g[3] in NAMEINFO: info=NAMEINFO[g[3]]
    elif '공개' in roles:
        i=roles.index('공개');info='즉시 공개' if i<=len(roles)//2 else '지연 공개'
    else: info='흐름 유지'
    cf=colorflow([c[2] for c in cs]);cv=curve([c[1] for c in pics])
    goal=NAMEGOAL.get(g[3]) or ('장면 전환' if g[14]=='장면 전환' else '정보 전달')
    for k,v in zip(cnt,[d,tp,nr,info,cf,cv,goal]): cnt[k][v]+=1
    out.append(g[:4]+[f'{d} · {tp} · {nr}',d,tp,nr,info,cf,cv,goal]+g[6:11]+[g[12],g[13],g[14],g[15],g[16],g[17],g[18],g[19],g[4],g[5]])
H=hdr[:4]+['리듬 유형','거리 흐름','템포','서사 형태','정보 흐름','색 흐름','감정 곡선','연출 목적']+hdr[6:11]+[hdr[12],hdr[13],hdr[14],hdr[15],hdr[16],hdr[17],hdr[18],hdr[19],'메모: 리듬(원문)','메모: 의도(원문)']
json.dump(dict(H=H,rows=out,q=[q1,q2]),open('taxo.json','w'),ensure_ascii=False)
print(len(out),len(H),'템포 경계',round(q1,2),round(q2,2))
for k,c in cnt.items(): print(k,dict(c))
print('리듬 유형 조합 수',len(Counter(r[4] for r in out)))
