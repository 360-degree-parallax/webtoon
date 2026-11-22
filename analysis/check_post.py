import json,sys
# 사용: python3 check_post.py 시작행 컷표읽기결과.json [더...]
# 읽기결과: 시트 readCells 응답(JSON). 로컬 {p}{화}_write.json 과 한 칸씩 대조
import os
P=os.environ.get('WORK_CODE','GM').lower()
rows={}
START=int(sys.argv[1])
for f in sys.argv[2:]:
    a=json.load(open(f));t=''.join(x['text'] for x in a);t=t[t.index('{'):]
    d=json.JSONDecoder().raw_decode(t)[0]['value'];rows.update({int(k):v for k,v in d['rows'].items()})
loc=[]
for ep in range(1,8): loc+=json.load(open(f'{P}{ep}_write.json'))['cut']
bad=0
def norm(v):
    if isinstance(v,float) and v.is_integer(): return int(v)
    return v
for i,r in enumerate(loc):
    s=rows.get(START+i)
    if s is None: print('행 없음',START+i);bad+=1;continue
    for j,(a,b) in enumerate(zip(r,s)):
        if norm(a)!=norm(b) and not (a is None and b in (None,'')):
            bad+=1
            if bad<10: print(START+i,j,repr(a),repr(b))
extra=[k for k in rows if k>=START+len(loc) and any(v not in (None,'') for v in rows[k])]
print('비교',len(loc),'행, 불일치',bad,'건, 뒤에 남은 행',extra)
