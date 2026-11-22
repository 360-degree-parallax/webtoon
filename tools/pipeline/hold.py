import os
HERE=os.path.dirname(os.path.abspath(__file__))
def note(n):
    return n if os.path.exists(n) else os.path.join(HERE,'notes',n)
# 옛 묶음(장면 안 그림 컷 5개씩) 목록: 묶음번호 / 컷번호 샷 내용
import os,sys
from itertools import groupby
P=os.environ.get('P','hc');ep=sys.argv[1];rows=[];k=0
for l in open(note(f'{P}{ep}_notes.txt')):
    f=l.strip().split('|')
    if not l.strip() or f[1]=='X':continue
    k+=1;rows.append((k,f))
g=0
for sc,rs in groupby(rows,key=lambda r:r[1][12]):
    pics=[r for r in rs if r[1][1]=='그림']
    for i in range(0,len(pics),5):
        g+=1;print(f'G{g:02d}',' / '.join(f'{n:03d} {f[2]} {f[11][:14]}' for n,f in pics[i:i+5]))
