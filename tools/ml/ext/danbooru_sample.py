#!/usr/bin/env python3
"""Danbooru2024-sfw(deepghs, 수정 MIT, 전체 연령가 g만)에서 구도 태그로 샷·앵글 라벨을 붙여 고르게 뽑고, 묶음 파일(tar)에서 그 이미지만 HTTP 범위 요청으로 받음.
사용: python3 tools/ml/ext/danbooru_sample.py [--per 400] [--tars 200]
- 메타데이터: ~/rough-ext/raw/danbooru/metadata.parquet (5.5GB, 미리 받음)
- 이미지 id % 1000 = 묶음 번호. 색인(images/NNNN.json)을 받는 양을 줄이려고 앞쪽 --tars 개 묶음에서만 고름
- 여러 칸 만화(comic·4koma·2koma·multiple_views)·샷/앵글 태그가 서로 어긋나는 이미지는 뺌
"""
import sys, json, random, pathlib, collections, urllib.request, concurrent.futures as cf, io
import pyarrow.parquet as pq
from PIL import Image
A = sys.argv[1:]; PER = int(A[A.index('--per') + 1]) if '--per' in A else 400; NT = int(A[A.index('--tars') + 1]) if '--tars' in A else 200
R = pathlib.Path('/home/user/rough-ext/raw/danbooru'); HF = 'https://huggingface.co/datasets/deepghs/danbooru2024-sfw/resolve/main/images/'
FOCUS = {'eye_focus', 'hand_focus', 'foot_focus', 'lips_focus', 'object_focus'}
EXC = {'comic', '4koma', '2koma', 'multiple_views'}
def shot(t):
    c = set()
    if 'very_wide_shot' in t or ('scenery' in t and 'no_humans' in t): c.add('설정')
    if 'wide_shot' in t: c.add('전경')
    if 'full_body' in t: c.add('전신')
    if 'cowboy_shot' in t or 'upper_body' in t: c.add('중경')
    if 'close-up' in t and t & FOCUS: c.add('디테일')
    elif 'portrait' in t or 'close-up' in t: c.add('클로즈업')
    return c.pop() if len(c) == 1 else ''
def angle(t):
    c = {v for k, v in (('from_below', '로우앵글'), ('from_above', '하이앵글'), ('straight-on', '아이레벨')) if k in t}
    return c.pop() if len(c) == 1 else ''
f = pq.ParquetFile(R / 'metadata.parquet'); pool = collections.defaultdict(list)
for i in range(f.num_row_groups):
    t = f.read_row_group(i, columns=['id', 'rating', 'tag_string', 'file_size', 'file_ext']).to_pandas().reset_index()
    t = t[(t.rating == 'g') & (t.id % 1000 < NT) & (t.file_size < 2_500_000) & t.file_ext.isin(['jpg', 'png', 'webp'])]
    for id_, s, ext in zip(t.id, t.tag_string, t.file_ext):
        tg = set(s.split())
        if tg & EXC: continue
        sh, an = shot(tg), angle(tg)
        if sh: pool['샷:' + sh].append((int(id_), ext, sh, an))
        if an: pool['앵글:' + an].append((int(id_), ext, sh, an))
random.seed(7); pick = {}
for k, v in sorted(pool.items()):
    for x in random.sample(v, min(PER, len(v))): pick[x[0]] = x
print({k: len(v) for k, v in pool.items()}, '→ 고른 이미지', len(pick))
# 묶음 색인
need = sorted({i % 1000 for i in pick}); idx = {}
def getidx(n):
    p = R / 'idx' / f'{n:04d}.json'
    if not p.exists(): p.write_bytes(urllib.request.urlopen(HF + f'{n:04d}.json', timeout=60).read())
    return n, json.loads(p.read_text())['files']
with cf.ThreadPoolExecutor(8) as ex:
    for n, fl in ex.map(getidx, need): idx[n] = fl
def fetch(x):
    id_, ext, sh, an = x; out = R / 'img' / f'db_{id_}.jpg'
    if out.exists(): return id_, sh, an, True
    e = idx[id_ % 1000].get(f'{id_}.{ext}')
    if not e: return id_, sh, an, False
    rq = urllib.request.Request(HF + f'{id_ % 1000:04d}.tar', headers={'Range': f'bytes={e["offset"]}-{e["offset"] + e["size"] - 1}'})
    try:
        im = Image.open(io.BytesIO(urllib.request.urlopen(rq, timeout=120).read())).convert('RGB'); im.thumbnail((512, 512)); im.save(out, quality=90); return id_, sh, an, True
    except Exception: return id_, sh, an, False
rows = []
with cf.ThreadPoolExecutor(12) as ex:
    for k, r in enumerate(ex.map(fetch, pick.values())):
        if r[3]: rows.append(r[:3])
        if k % 200 == 0: print(k, len(rows), flush=True)
with open(R / 'labels.csv', 'w') as fo:
    fo.write('file,샷,앵글\n'); [fo.write(f'db_{i}.jpg,{s},{a}\n') for i, s, a in rows]
print('받음', len(rows), '샷', dict(collections.Counter(r[1] for r in rows if r[1])), '앵글', dict(collections.Counter(r[2] for r in rows if r[2])))
