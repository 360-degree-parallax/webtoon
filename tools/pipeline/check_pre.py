import json,sys
TYPE={'그림','말풍선','내레이션','효과음','전환','타이틀'}
SHOT={'설정','전경','전신','중경','클로즈업','디테일','효과 배경','화면 인서트','SD','—'}
ANG={'아이레벨','하이앵글','로우앵글','탑뷰','—'}
ROLE={'설정','전개','공개','반응','전환'}
EMO={'평온','개그','설렘','기쁨','다정','당황','의아','놀람','긴장','냉담','분노','쓸쓸','회상','결의','—'}
MASS={'흰색','밝은 톤','중간 톤·회색','검정','어두운 톤','흰→검 전환'}|{f'중간 컬러·{c}' for c in ['주황','노랑','붉은색','분홍','파랑','남색','보라','초록','청록']}|{'강조색·붉은색','강조색·주황','강조색·초록','강조색·분홍','강조색·파랑','강조색·노랑','강조색·남색','강조색·청록','강조색·보라'}
NAME={'Push-in','Pull-out','Hold','Fragmented Reveal','Reaction Framing','Delayed Reveal','Dramatic Irony','Insert','Shot / Reverse Shot','POV','Stretch','Bridge','Walk and Talk','Montage','Color Shock',None,''}
VNG={'E','I','Pr','P','R'};TR={'순간 전환','동작 전환','주체 전환','장면 전환','양상 전환','비약'}
def check(path):
    W=json.load(open(path));err=[];prev=0
    for r in W['cut']:
        cid=r[2];n=int(cid[-3:])
        if n!=prev+1: err.append(f'{cid} 번호 불연속')
        prev=n
        for v,s,k in [(r[4],TYPE,'유형'),(r[7],SHOT,'샷'),(r[8],ANG,'앵글'),(r[9],ROLE,'역할'),(r[10],EMO,'감정'),(r[6],MASS,'덩어리 색'),(r[25],MASS,'여백색')]:
            if v not in s: err.append(f'{cid} {k} 값 없음: {v}')
        if r[4]=='그림' and (r[7]=='—' or r[8]=='—'): err.append(f'{cid} 그림인데 샷/앵글 —')
        if r[4]!='그림' and r[7]!='—': err.append(f'{cid} 그림 아닌데 샷 있음')
    seen=set()
    for g in W['rhythm']:
        if len(g)==27: g=g[:12]+[g[17],g[18],g[19]]  # 27열 형식: VNG·샷·전환 위치만 맞춤
        else: g=g[:12]+[g[12],g[13],g[14]]
        if g[3] not in NAME: err.append(f'{g[2]} 연출명 값 없음: {g[3]}')
        if any(x not in VNG for x in g[12].split('→')): err.append(f'{g[2]} VNG 값 이상: {g[12]}')
        if g[14] not in TR: err.append(f'{g[2]} 컷 전환 값 없음: {g[14]}')
        ids=[r[2] for r in W['cut'] if r[12]==g[2]]
        if not ids: err.append(f'{g[2]} 소속 컷 없음')
        npic=sum(1 for r in W['cut'] if r[12]==g[2] and r[4]=='그림')
        if npic!=len(g[12].split('→')): err.append(f'{g[2]} VNG 칸 수 {len(g[12].split("→"))} ≠ 그림 컷 {npic}')
        if seen & set(ids): err.append(f'{g[2]} 다른 묶음과 겹침')
        seen|=set(ids)
    return err
for p in sys.argv[1:]:
    e=check(p);print(p,'OK' if not e else f'{len(e)}건');[print('  ',x) for x in e[:15]]
