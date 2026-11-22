# 피그마에서 고친 컷을 툴에 반영: rough/cuts-fixed/ 아래 같은 경로·같은 이름의 jpg가 있으면 index.json에 fixed로 기록
# 사용: python3 tools/apply_fixed.py
import json,os
root=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','rough')
p=os.path.join(root,'cuts','index.json');d=json.load(open(p,encoding='utf-8'));n=0
for it in d['items']:
    f=os.path.join(root,'cuts-fixed',it['file'])
    if os.path.exists(f):it['fixed']=it['file'];n+=1
    else:it.pop('fixed',None)
json.dump(d,open(p,'w',encoding='utf-8'),ensure_ascii=False)
print('수정본',n,'장 반영')
