import os
HERE=os.path.dirname(os.path.abspath(__file__))
import os;P=os.environ.get('P','hc')
import os,sys,subprocess,re
ep=sys.argv[1];out=subprocess.run(['python3',os.path.join(HERE,'hpipe.py'),ep,'glist'],capture_output=True,text=True,env={**os.environ,'P':P}).stdout
for l in out.splitlines():
    g,rest=l.split(' ',1);old=re.match(r"\[(.*?)\]",rest).group(1);parts=rest[rest.index(']')+2:].split(' / ')
    ids=[p.split()[0] for p in parts]
    print(g,old,len(ids),' '.join(ids))
