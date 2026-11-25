import os
HERE=os.path.dirname(os.path.abspath(__file__))
def note(n):
    return n if os.path.exists(n) else os.path.join(HERE,'notes',n)
import json,sys,numpy as np,colorsys,statistics as st,os
from collections import Counter
from itertools import groupby
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
ep=int(sys.argv[1]);stage=sys.argv[2];P=os.environ.get('P','gm');C=P.upper();NAME={'gm':'녹빛자정의 연인','hc':'함부로 친절하지 말라','hn':'하루만 네가 되고 싶어','md':'마도애를 사랑하는 법','yp':'유사품에 주의하세요'}[P]
B=json.load(open(f'{P}{ep}_seg.json'))
AB={'흰색':'흰','밝은 톤':'밝','중간 톤·회색':'회','중간 컬러·주황':'주','중간 컬러·노랑':'노','중간 컬러·붉은색':'적','중간 컬러·분홍':'분','중간 컬러·파랑':'파','중간 컬러·남색':'남','중간 컬러·보라':'보','중간 컬러·초록':'초','중간 컬러·청록':'청','어두운 톤':'어','검정':'검','강조색·붉은색':'강적','강조색·주황':'강주','강조색·초록':'강초','강조색·분홍':'강분','강조색·노랑':'강노','강조색·파랑':'강파','강조색·보라':'강보','강조색·청록':'강청','강조색·남색':'강남'}
def hname(h):
    d=h*360
    for lim,n in [(15,'붉은색'),(40,'주황'),(70,'노랑'),(160,'초록'),(195,'청록'),(235,'파랑'),(260,'남색'),(300,'보라'),(345,'분홍')]:
        if d<lim: return n
    return '붉은색'
def cls(r,g,b):
    h,s,v=colorsys.rgb_to_hsv(r,g,b)
    if v<0.12: return '검정'
    if v<0.35: return '어두운 톤'
    if v>0.9 and s<0.1: return '흰색'
    if s<0.25 and v>=0.7: return '밝은 톤'
    if s>=0.55 and v>=0.45: return '강조색·'+hname(h)
    if s<0.12: return '중간 톤·회색'
    return '중간 컬러·'+hname(h)
def parse_notes():
    out=[]
    for l in open(note(f'{P}{ep}_notes.txt')):
        l=l.strip()
        if not l: continue
        f=l.split('|');r=f[0];a,b=(r.split('-')+[r])[:2];a,b=int(a),int(b)
        out.append((a,b,f))
    cov=sorted(i for a,b,_ in out for i in range(a,b+1))
    assert cov==list(range(len(B))),('coverage',[i for i in range(len(B)) if i not in cov][:20],len(cov),len(B))
    return out
N=parse_notes()
cuts=[];k=0
for a,b,f in N:
    if f[1]=='X': continue
    k+=1;y=B[a]['y'];e=B[b]['y']+B[b]['h']
    cuts.append(dict(num=k,y=y,h=e-y,f=f,last=b))
H=Image.open(f'{P}/{ep}/strip.png').size[1]
for i,c in enumerate(cuts):
    nxt=cuts[i+1]['y'] if i+1<len(cuts) else (B[c['last']+1]['y'] if c['last']+1<len(B) else H)
    c['gap']=nxt-(c['y']+c['h'])
if stage=='groups':
    for c in cuts: print(c['num'],c['f'][1],c['f'][2],c['f'][4],c['f'][5],c['f'][12],c['f'][11][:30])
    sys.exit()
S=np.asarray(Image.open(f'{P}/{ep}/strip.png').convert('RGB')).astype(np.float32)/255;W=S.shape[1]
def mass(y,h):
    blk=S[y:y+h];nonwhite=(blk.min(2)<0.94)
    cols=np.where(nonwhite.mean(0)>0.05)[0];rows=np.where(nonwhite.mean(1)>0.05)[0]
    if len(cols)<8 or len(rows)<8: x0,x1,y0,y1=0,W,0,h
    else: x0,x1,y0,y1=cols[0],cols[-1]+1,rows[0],rows[-1]+1
    sub=blk[y0+4:max(y0+5,y1-4):4, x0+4:max(x0+5,x1-4):4].reshape(-1,3)
    c=Counter(cls(*p) for p in sub);kk,n=c.most_common(1)[0];return kk,round(100*n/len(sub))
def gapcol(y,g):
    if g<=0: return '흰색'
    m=S[y:y+g].reshape(-1,3)[::50].mean(0);return cls(*m)
SC={};
for l in open(note(f'{P}{ep}_scenes.txt')):
    p=l.rstrip('\n').split('|')
    if len(p)>=5: SC[p[0]]=p[1:]
R=[]
for c in cuts:
    f=c['f'];typ,shot,ang,role,emo,inten,det,sub,bal,dens,txt,sc=f[1:13]
    pic=typ=='그림';kk,pct=mass(c['y'],c['h'])
    R.append(dict(id=f'{C}-{ep:02d}-{c["num"]:03d}',sc=sc,scene=f'{C}-{ep:02d}-{sc} {SC[sc][0]}',typ=typ,txt=txt,mass=kk,ab=AB.get(kk,kk),shot=shot if pic else '—',ang=ang if pic else '—',role=role,emo=emo if pic else '—',inten=int(inten),det=det or None,sub=int(sub) if pic else None,bal=int(bal),dens=int(dens),pct=pct,h=c['h'],gap=c['gap'],hw=round(c['h']/W,2),gw=round(c['gap']/W,2),y=c['y'],gapc=gapcol(c['y']+c['h'],c['gap'])))
G=[];gi=0
for sc,rs in groupby(R,key=lambda r:r['sc']):
    pics=[r for r in rs if r['typ']=='그림']
    for i in range(0,len(pics),5):
        gi+=1;G.append(dict(gid=f'{C}-{ep:02d}-G{gi:02d}',ids=[r['id'] for r in pics[i:i+5]]))
# merge tails (<3 pics) into previous group in same scene, total <=7
scof={r['id']:r['sc'] for r in R}
M=[]
for g in G:
    if M and len(g['ids'])<3 and scof[g['ids'][0]]==scof[M[-1]['ids'][0]] and len(M[-1]['ids'])+len(g['ids'])<=7:
        M[-1]['ids']+=g['ids'];M[-1]['old'].append(g['gid'][-3:])
    else: M.append(dict(gid=g['gid'],ids=list(g['ids']),old=[g['gid'][-3:]]))
for i,g in enumerate(M): g['gid']=f'{C}-{ep:02d}-G{i+1:02d}'
G=M
if stage=='glist':
    for g in G: print(g['gid'][-3:],g['old'],' / '.join(f"{r['id'][-3:]} {r['shot']} {r['role']} {r['emo']} {r['txt'][:18]}" for r in R if r['id'] in g['ids']))
    sys.exit()
ANN={}
for l in open(note(f'{P}{ep}_annx.txt')):
    p=l.rstrip('\n').split('|')
    if len(p)==6: ANN[p[0]]=p[1:]
idx={r['id']:i for i,r in enumerate(R)};g_of={};rhythm=[]
for g in G:
    parts=[ANN[o] for o in g['old']]
    n,rh,it,vng,tr=parts[0]
    for p2 in parts[1:]:
        rh=rh+' 이어서 '+p2[1];it=it+' '+p2[2];vng=vng+'→'+p2[3];n=n or p2[0]
    n=n or None
    cs=[R[idx[i]] for i in g['ids']];a,b=idx[g['ids'][0]],idx[g['ids'][-1]]
    ab=([c['ab'] for c in cs]+[None]*5)[:5]
    names=[c['mass'] for c in cs];ch=[];prev=None;t=0
    for i,m in enumerate(names):
        if m!=prev:
            if prev is not None:t+=1
            ch.append(f'{i+1}번째 {m}');prev=m
    flow=(f'{names[0].replace("흰색","흰")} 바탕만 이어짐 (전환 0회)' if t==0 else ', '.join(ch)+f' (전환 {t}회)')
    rng=g['ids'][0] if a==b else f"{g['ids'][0]}~{g['ids'][-1][-3:]}"
    rhythm.append([ NAME,ep,g['gid'],n,rh,it]+ab+[flow,vng,'→'.join(c['shot'] for c in cs),tr,rng,st.median([c['h'] for c in cs]),max([r['gap'] for r in R[a:b]] or [0]),sum(1 for r in R[a:b+1] if r['typ']!='그림'),R[b]['y']+R[b]['h']-R[a]['y']])
    for i in range(a,b+1): g_of[R[i]['id']]=g['gid']
cut=[[NAME,ep,r['id'],r['scene'],r['typ'],r['txt'],r['mass'],r['shot'],r['ang'],r['role'],r['emo'],r['inten'],g_of.get(r['id']),None,r['dens'],r['bal'],r['det'],r['pct'],None,r['h'],r['gap'],r['hw'],r['gw'],r['y'],r['sub'],r['gapc']] for r in R]
scenes=[];band=[]
for sc in SC:
    rs=[r for r in R if r['sc']==sc];pics=[r for r in rs if r['typ']=='그림']
    ids=[int(r['id'][-3:]) for r in rs];parts=[];s=p=ids[0]
    for i in ids[1:]:
        if i!=p+1: parts.append((s,p));s=i
        p=i
    parts.append((s,p))
    rng=', '.join(f'{C}-{ep:02d}-{a:03d}~{b:03d}' if a!=b else f'{C}-{ep:02d}-{a:03d}' for a,b in parts)
    emos=Counter(r['emo'] for r in pics if r['emo']!='—')
    name,s0,s1,tp=SC[sc][:4]
    scenes.append([NAME,ep,f'{C}-{ep:02d}-{sc}',name,rng,len(pics),sum(r['sub'] or 0 for r in pics),sum(r['h']+r['gap'] for r in rs),st.median([r['h'] for r in pics]) if pics else None,max(r['gap'] for r in rs),sum(r['bal'] for r in rs),emos.most_common(1)[0][0] if emos else '—',s0,s1,f'{C}-{ep:02d}-{int(tp):03d}'])
    band.append([f'{C}-{ep:02d}-{sc} {name}']+[r['ab'] for r in rs])
n=max(len(b) for b in band);band=[b+[None]*(n-len(b)) for b in band]
json.dump(dict(cut=cut,rhythm=rhythm,scenes=scenes,band=band),open(f'{P}{ep}_write.json','w'),ensure_ascii=False)
print(len(cut),len(rhythm),len(scenes),n,Counter(r['mass'] for r in R))
