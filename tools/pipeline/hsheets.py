import os
HERE=os.path.dirname(os.path.abspath(__file__))
import os;P=os.environ.get('P','hc')
import subprocess,json,sys
ep=int(sys.argv[1]);B=json.load(open(f'{P}{ep}_seg.json'));n=len(B)
parts=[];s=0;acc=0
for i,b in enumerate(B):
    acc+=b['h']+60
    if acc>26000:parts.append((s,i));s=i;acc=b['h']+60
parts.append((s,n))
for k,(a,b) in enumerate(parts):
    subprocess.run(['python3',os.path.join(HERE,'bsheet.py'),f'{P}/{ep}/strip.png',f'{P}{ep}_seg.json',str(a),str(b),f'{P}{ep}_sheet_{k}.jpg'],capture_output=True)
print(ep,n,parts)
