#!/usr/bin/env python3
"""외부 학습 데이터(개인용·비상업) 정리: 원본 → 라벨 매핑 → 전처리 → 통합 표.

원본·결과 이미지는 저장소 밖 개인 폴더(기본 ~/rough-ext)에만 둠. 저장소에는 이 스크립트와 매핑 규칙만.
사용: python3 tools/ml/ext/build_ext.py [--root ~/rough-ext]
출처
- whatashot: szymonrucinski/types-of-film-shots (CC BY 4.0) — 사람 라벨 863장(학습분 5.3만 행은 이미지 없이 원작자 경로만 있어 제외)
- shotbench: Vchitect/ShotBench (Apache-2.0 표기, 영화 프레임) — 샷 크기·앵글·구도·프레이밍 문항
전처리: 위아래·양옆 검은 띠(레터박스) 잘라냄 → 긴 변 512px → JPEG q90 → 지각 해시로 중복 제거(같은 그림의 라벨은 한 행으로 합침)
"""
import sys, json, csv, ast, pathlib, hashlib, collections
import numpy as np
from PIL import Image
A = sys.argv[1:]
ROOT = pathlib.Path(A[A.index('--root') + 1] if '--root' in A else '/home/user/rough-ext').expanduser()
RAW, OUT = ROOT / 'raw', ROOT / 'data'; (OUT / 'img').mkdir(parents=True, exist_ok=True)

# ---- 라벨 매핑(외부 라벨 → 우리 코드표). None은 쓰지 않음 ----
SHOT = {  # 우리: 설정/전경/전신/중경/클로즈업/디테일
    'extremeLongShot': '설정', 'longShot': '전경', 'fullShot': '전신', 'mediumShot': '중경', 'mediumCloseUp': '중경', 'closeUp': '클로즈업', 'detail': '디테일', 'ambiguous': None,
    'Extreme Wide': '설정', 'Wide': '전경', 'Medium Wide': '전신', 'Medium': '중경', 'Medium Close Up': '중경', 'Close Up': '클로즈업', 'Extreme Close Up': '디테일'}
MCU = {'mediumCloseUp', 'Medium Close Up'}  # 가슴 위: 우리 기준으로 중경·클로즈업 경계 → 표시해 두고 학습에서 비교
ANGLE = {'Low angle': '로우앵글', 'High angle': '하이앵글', 'Overhead': '탑뷰', 'Aerial': '하이앵글', 'Dutch angle': None}
COMP = {'Center': '가운데', 'Left heavy': '왼쪽 무게', 'Right heavy': '오른쪽 무게', 'Balanced': '균형', 'Symmetrical': '대칭', 'Short side': '짧은 쪽 시선'}
FRAMING = {'Insert': ('샷', '디테일'), 'Establishing shot': ('샷', '설정')}  # 프레이밍 중 샷 크기로 바로 옮길 수 있는 것만

def crop_bars(im):
    g = np.asarray(im.convert('L'), dtype=np.float32); h, w = g.shape
    rows = np.where(g.mean(1) > 18)[0]; cols = np.where(g.mean(0) > 18)[0]
    if len(rows) < h * .3 or len(cols) < w * .3: return im
    return im.crop((int(cols[0]), int(rows[0]), int(cols[-1]) + 1, int(rows[-1]) + 1))
def ahash(im):
    g = np.asarray(im.convert('L').resize((16, 16)), dtype=np.float32); return ''.join('1' if v else '0' for v in (g > g.mean()).ravel())

recs = {}  # 해시 → 행
def add(src, path, fields, raw):
    try: im = Image.open(path).convert('RGB')
    except Exception: return
    im = crop_bars(im); im.thumbnail((512, 512)); h = ahash(im)
    r = recs.get(h)
    if r is None:
        fid = f'{src}_{hashlib.md5(h.encode()).hexdigest()[:10]}.jpg'; im.save(OUT / 'img' / fid, quality=90)
        r = recs[h] = {'id': fid, 'source': src, 'orig': str(path.relative_to(RAW)), 'w': im.width, 'h': im.height, '샷': '', '앵글': '', '구도': '', 'mcu': 0, 'raw': {}}
    for k, v in fields.items():
        if v and not r[k]: r[k] = v
    r['raw'].update(raw)

# What a Shot(사람 라벨)
for row in csv.DictReader(open(RAW / 'whatashot' / 'labels.csv')):
    L = row['label']; s = SHOT.get(L)
    if s: add('was', RAW / 'whatashot' / 'img' / row['file'], {'샷': s}, {'shot_scale': L})
# ShotBench
for row in csv.DictReader(open(RAW / 'shotbench' / 'test.tsv'), delimiter='\t'):
    if row['type'] != '["image"]': continue
    ans = json.loads(row['options'])[row['answer']] if row['answer'] in json.loads(row['options']) else ''
    parts = [x.strip() for x in ans.split(',')]
    if len(parts) != 1: continue  # 답이 둘 이상이면 애매 → 뺌
    a = parts[0]; cat = row['category']; f = {}
    if cat == 'shot size': f = {'샷': SHOT.get(a)}
    elif cat == 'camera angle': f = {'앵글': ANGLE.get(a)}
    elif cat == 'composition': f = {'구도': COMP.get(a)}
    elif cat == 'shot framing' and a in FRAMING: k, v = FRAMING[a]; f = {k: v}
    else: continue
    for p in ast.literal_eval(row['path']):
        fp = RAW / 'shotbench' / p
        if fp.exists(): add('sb', fp, f, {cat: a})

# MCU 표시
for r in recs.values(): r['mcu'] = int(any(v in MCU for v in r['raw'].values()))
rows = [r for r in recs.values() if r['샷'] or r['앵글'] or r['구도']]
with open(OUT / 'labels.csv', 'w', newline='') as fo:
    w = csv.writer(fo); w.writerow(['id', 'source', '샷', '앵글', '구도', 'mcu', 'w', 'h', 'orig', 'raw'])
    for r in sorted(rows, key=lambda r: r['id']): w.writerow([r['id'], r['source'], r['샷'], r['앵글'], r['구도'], r['mcu'], r['w'], r['h'], r['orig'], json.dumps(r['raw'], ensure_ascii=False)])
cnt = {k: collections.Counter(r[k] for r in rows if r[k]) for k in ('샷', '앵글', '구도')}
summary = {'images': len(rows), 'by_source': dict(collections.Counter(r['source'] for r in rows)), 'mcu': sum(r['mcu'] for r in rows), **{k: dict(v.most_common()) for k, v in cnt.items()}}
(OUT / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=1)); print(json.dumps(summary, ensure_ascii=False, indent=1))
