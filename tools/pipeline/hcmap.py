import os
HERE=os.path.dirname(os.path.abspath(__file__))
def note(n):
    return n if os.path.exists(n) else os.path.join(HERE,'notes',n)
import os;P=os.environ.get('P','hc')
import sys,json
ep=int(sys.argv[1]);k=0;m={}
B=json.load(open(f'{P}{ep}_seg.json'));cov=[]
for l in open(note(f'{P}{ep}_notes.txt')):
    f=l.strip().split('|')
    if not l.strip():continue
    a,b=(f[0].split('-')+[f[0]])[:2];cov+=list(range(int(a),int(b)+1))
    if f[1]=='X':continue
    k+=1;m[int(a)]=k
miss=[i for i in range(len(B)) if i not in cov];dup=len(cov)-len(set(cov))
print('컷',k,'빠진 블록',miss,'중복',dup)
print({b:m.get(b) for b in map(int,sys.argv[2:])})
