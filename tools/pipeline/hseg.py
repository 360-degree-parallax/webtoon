import os
HERE=os.path.dirname(os.path.abspath(__file__))
import os;P=os.environ.get('P','hc')
import json,sys
sys.argv=sys.argv;ep=int(sys.argv[1])
exec(open(os.path.join(HERE,'seg2.py')).read().split("if __name__")[0])
b=segment(f'{P}/{ep}/strip.png');json.dump([dict(y=s,h=e-s) for s,e in b],open(f'{P}{ep}_seg.json','w'));print(ep,len(b))
