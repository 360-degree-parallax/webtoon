#!/usr/bin/env python3
"""판정 화면(DB › 판정)에서 내보낸 결과(판정-날짜.json)를 정리한다.
- 고른 값이 지금 값과 다른 컷 → 시트 컷표 수정 목록(applyEdits용 writeCells, 64개씩 나눔)과 DB 사본 반영
- 보류 컷 → 메모와 함께 목록으로(Claude가 메모를 읽고 원본 이미지를 다시 보며 해소)
사용: python3 tools/ml/apply_review.py 판정.json [--write]   (--write: rough/db/db.json·cuts/index.json에도 반영)
"""
import sys, json, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent)); import weights as WT
ROOT = pathlib.Path(__file__).resolve().parents[2]
src = json.loads(pathlib.Path(sys.argv[1]).read_text())
assert src.get('format') == 'rough-review', '판정 화면에서 내보낸 파일이 아니에요'
d = json.loads((ROOT / 'rough' / 'db' / 'db.json').read_text()); t = d['컷표']; c = t['columns']; I = c.index
pos = {r[I('컷ID')]: k for k, r in enumerate(t['rows'])}
edits, holds, stale = [], [], []
for x in src['decisions']:
    if x['hold']: holds.append(x); continue
    if not x['pick'] or x['pick'] == x['current']: continue
    k = pos[x['cut']]; now = t['rows'][k][I(x['field'])]
    if now != x['current']: stale.append((x['cut'], x['field'], x['current'], now, x['pick'])); continue  # 큐를 만든 뒤 시트가 바뀜
    edits.append({'kind': 'writeCells', 'sheet': '컷표', 'topLeft': f"{x['col']}{k + 2}", 'rows': [[x['pick']]]})
    if '--write' in sys.argv: t['rows'][k][I(x['field'])] = x['pick']
print(f"판정 {len(src['decisions'])} · 바꿀 값 {len(edits)} · 보류 {len(holds)} · 큐 이후 시트가 바뀐 컷 {len(stale)}")
for s in stale: print('  확인 필요', s)
out = pathlib.Path(sys.argv[1]).with_suffix('.edits.json')
out.write_text(json.dumps([edits[k:k + 63] for k in range(0, len(edits), 63)], ensure_ascii=False)); print('시트 수정 묶음', out)
for h in holds: print(f"  보류 {h['cut']} {h['field']} (지금 {h['current']}): {h['note'] or '(메모 없음)'}")
# 사용자가 고른 값(지금 값 유지 포함)은 확인 기록으로 → 다음 학습에서 가중치 크게
if '--write' in sys.argv:
    V = WT.load()
    for x in src['decisions']:
        if not x['hold'] and x['pick']: WT.add(V, x['cut'], x['field'], x['pick'], 'user', x['at'][:10])
    WT.save(V); print('확인 기록', WT.summary())
    (ROOT / 'rough' / 'db' / 'db.json').write_text(json.dumps(d, ensure_ascii=False, separators=(',', ':'))); print('DB 사본 반영(리비전은 시트 반영 후 맞춰 주세요)')
