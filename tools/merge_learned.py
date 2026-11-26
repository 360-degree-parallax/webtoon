#!/usr/bin/env python3
"""콘티 「배운 동작」에서 내보낸 파일(rough-actions.json)을 도구 내장 사전(rough/learned-actions.json)에 합친다.
같은 한국어 낱말은 새 태그로 덮어씀. 합친 뒤 커밋하면 배포된 도구를 여는 모든 브라우저가 기본으로 씀.
사용: python3 tools/merge_learned.py 내보낸파일.json [더.json …] [--drop 낱말,낱말]
"""
import sys, json, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1]; OUT = ROOT / 'rough' / 'learned-actions.json'
cur = json.loads(OUT.read_text()) if OUT.exists() else {'type': 'rough-actions', 'version': 1, 'items': []}
items = {x['ko']: x for x in cur.get('items', [])}
args = sys.argv[1:]; drop = set()
if '--drop' in args: i = args.index('--drop'); drop = set(args[i + 1].split(',')); del args[i:i + 2]
n = 0
for f in args:
    d = json.loads(pathlib.Path(f).read_text())
    assert d.get('type') == 'rough-actions', f'{f}: 배운 동작 파일이 아니에요'
    for x in d.get('items', []):
        ko, tags = str(x.get('ko', '')).strip(), str(x.get('tags', '')).strip()
        if len(ko) < 2 or not tags: continue
        if ko not in items or items[ko]['tags'] != tags: n += 1
        items[ko] = {'ko': ko, 'tags': tags}
for k in drop: items.pop(k, None)
cur['items'] = sorted(items.values(), key=lambda x: x['ko'])
OUT.write_text(json.dumps(cur, ensure_ascii=False, indent=1) + '\n')
print(f'내장 배운 동작 {len(cur["items"])}개 (새로·바뀜 {n}개, 뺌 {len(drop)}개) → {OUT.relative_to(ROOT)}')
