#!/usr/bin/env python3
"""브라우저용 가벼운 DB 조각을 만든다(db.json 전체 3.6MB·gzip 750KB를 받지 않게).

- rough/db/cut-text.json: 레퍼런스 패널 글 검색용 컷ID → 내용·장면(그림 컷만)
  refs.js가 먼저 이 파일을 읽고, 없으면 예전처럼 db.json을 읽음
- rough/db/review-queue-ids.json: 판정 큐 항목 id만(상단 '판정' 배지 숫자용). 큐 전체(1.5MB)는 판정 화면을 열 때만 받음
사용: python3 tools/build_db_lite.py   (tools/sync_db.py가 저장 뒤에 부름)
"""
import json, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
d = json.loads((ROOT / 'rough' / 'db' / 'db.json').read_text())
t = d['컷표']; I = t['columns'].index
rows = [[r[I('컷ID')], r[I('내용')] or '', r[I('장면')] or ''] for r in t['rows'] if r[I('유형')] == '그림' and r[I('컷ID')]]
# 장면 이름은 반복이 많아 번호로: scenes[k]
scenes = sorted({r[2] for r in rows}); si = {s: k for k, s in enumerate(scenes)}
out = {'note': '컷ID·내용·장면 번호(그림 컷만) — tools/build_db_lite.py가 db.json에서 만듦', 'revision': d.get('__meta', {}).get('revision'),
       'scenes': scenes, 'rows': [[a, b, si[c]] for a, b, c in rows]}
p = ROOT / 'rough' / 'db' / 'cut-text.json'
p.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
print(p.relative_to(ROOT), len(rows), '컷', p.stat().st_size, 'B')

q = ROOT / 'rough' / 'db' / 'review-queue.json'
if q.exists():
    Q = json.loads(q.read_text()); ids = [x['id'] for x in Q.get('items', [])]
    o = ROOT / 'rough' / 'db' / 'review-queue-ids.json'
    o.write_text(json.dumps({'made': Q.get('meta', {}).get('made'), 'ids': ids}, ensure_ascii=False, separators=(',', ':')))
    print(o.relative_to(ROOT), len(ids), '항목', o.stat().st_size, 'B')
