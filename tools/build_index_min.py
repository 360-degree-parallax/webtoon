#!/usr/bin/env python3
"""러프 툴이 처음 열릴 때 받는 컷 목록(rough/cuts/index.min.json)을 index.json에서 만든다.

- 화면에서 쓰는 필드만 열 단위 배열로 저장(file·work는 컷 ID에서 계산)
- 칸 꼭짓점(quad)은 사선 칸만, 말풍선 상자 좌표·cov·blocks는 뺌(index.json에는 그대로 남음)
사용: python3 tools/build_index_min.py   (hc_cuts.py로 컷을 추가한 뒤 실행)
"""
import json, pathlib, gzip

ROOT = pathlib.Path(__file__).resolve().parent.parent / 'rough' / 'cuts'
SRC, OUT = ROOT / 'index.json', ROOT / 'index.min.json'
COLS = ['id', 'shot', 'angle', 'role', 'emotion', 'h_ratio', 'art', 'fit', 'w', 'h', 'frame', 'quad', 'panel', 'balloon_cover', 'fixed', 'np', 'hr', 'mx', 'mono', 'sp', 'salt']  # 뒤 6개: 컷 메타(tools/meta/build_meta_cols.py)

d = json.loads(SRC.read_text())
works, rows = {}, []
for x in d['items']:
    cid = x['source_cut']; code = cid[:2]
    assert x['file'] == f'{code}/{cid[3:5]}/{cid}.jpg', cid
    works.setdefault(code, x.get('work'))
    r = {**x, 'id': cid, 'quad': x.get('quad') if x.get('frame') == 'slant' else None}
    rows.append([r.get(k) for k in COLS])
# 끝의 빈 값(None)은 잘라 크기를 줄임
rows = [r[:max((i + 1 for i, v in enumerate(r) if v is not None), default=0)] for r in rows]
out = {'v': 1, 'note': d.get('note', ''), 'works': works, 'cols': COLS, 'rows': rows}
raw = json.dumps(out, ensure_ascii=False, separators=(',', ':')).encode()
OUT.write_bytes(raw)
a, b = SRC.stat().st_size, len(raw)
print(f'{OUT.name}: {len(rows)}컷 · {b / 1024:.0f}KB (gzip {len(gzip.compress(raw)) / 1024:.0f}KB) · index.json {a / 1024:.0f}KB (gzip {len(gzip.compress(SRC.read_bytes())) / 1024:.0f}KB)')
