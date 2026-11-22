# 전체 그림 컷을 처리해 rough/cuts-clean/(같은 경로·같은 이름)에 말풍선 제거본을 쓰고 rough/cuts/index.json에 quad·frame·balloons_removed를 기록
# 사용: python3 tools/batch_clean.py  (opencv-python-headless, numpy 필요)
import cv2,json,os,numpy as np
exec(open(__file__.replace('batch_clean.py','declutter.py')).read().split("if __name__")[0])
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','rough','cuts-clean')+'/'
idx=json.load(open(BASE+'index.json'));n=0;removed=0
for it in idx['items']:
    img=cv2.imread(BASE+it['file']);q,fr=frame_quad(img,it['art']);m,f=balloon_mask(img,q)
    clean=fill_flat(img,m) if m.any() else img
    p=OUT+it['file'];os.makedirs(os.path.dirname(p),exist_ok=True)
    cv2.imwrite(p,clean,[cv2.IMWRITE_JPEG_QUALITY,88])
    it['quad']=q;it['frame']=fr;it['clean']=it['file'];it['balloons_removed']=len(f)
    n+=1;removed+=bool(f)
idx['note']=('네이버 원본 컷(권리자 허락 하에 비상업 공개). cuts/=원본(말풍선 있음), cuts-clean/=같은 경로·같은 이름의 말풍선 자동 제거본(러프용). '
 'art=그림 영역 상자, quad=칸 모양 네 꼭짓점, frame=rect|slant, fit=ok|partial|multi, balloons_removed=자동으로 지운 말풍선 수. 모두 자동 판정.')
json.dump(idx,open(BASE+'index.json','w',encoding='utf-8'),ensure_ascii=False)
from collections import Counter
print(n,'with removal',removed,Counter(i['frame'] for i in idx['items']),Counter((i['fit'],i['frame']) for i in idx['items']))
