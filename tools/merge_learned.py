#!/usr/bin/env python3
"""콘티 「배운 동작」에서 내보낸 파일(rough-actions.json)을 도구 내장 사전(rough/learned-actions.json)에 합친다.
같은 한국어 낱말은 새 태그로 덮어씀. 합친 뒤 커밋하면 배포된 도구를 여는 모든 브라우저가 기본으로 씀.
장소는 kind: 'place'(Claude가 찾은 새 장소 — 장소 사전에 들어감).
사용: python3 tools/merge_learned.py 내보낸파일.json [더.json …] [--drop 낱말,낱말] [--no-check]
합칠 때 검사: 낱말마다 NAI.checkLearned(흔한 낱말·부정/바람·사전과 어긋남·태그 꼴)로 거르고,
합친 사전으로 동작·소품 시험 세트(tools/eval_actions.js·eval_props.js)를 다시 돌려 정확도가 떨어지면 되돌림
"""
import sys, json, pathlib, subprocess
ROOT = pathlib.Path(__file__).resolve().parents[1]; OUT = ROOT / 'rough' / 'learned-actions.json'
cur = json.loads(OUT.read_text()) if OUT.exists() else {'type': 'rough-actions', 'version': 1, 'items': []}
key = lambda x: (x.get('kind', ''), x['ko'])
items = {key(x): x for x in cur.get('items', [])}
args = sys.argv[1:]; drop = set(); check = '--no-check' not in args; args = [a for a in args if a != '--no-check']
NODE_CHECK = "const N=require(process.argv[1]);const L=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(JSON.stringify(L.map(x=>N.checkLearned(x.ko,x.tags,x.kind))))"
def scores():
    out = {}
    for name, flags in [('동작', ['tools/eval_actions.js']), ('동작 확인용', ['tools/eval_actions.js', '--holdout']), ('소품', ['tools/eval_props.js', '--script'])]:
        r = subprocess.run(['node', *flags, '--min', '0'], cwd=ROOT, capture_output=True, text=True)
        import re; out[name] = [float(x) for x in re.findall(r'정확도 ([\d.]+)%', r.stdout)]
    return out
before = scores() if check else None
old_text = OUT.read_text() if OUT.exists() else None
if '--drop' in args: i = args.index('--drop'); drop = set(args[i + 1].split(',')); del args[i:i + 2]
n = 0; new = []
for f in args:
    d = json.loads(pathlib.Path(f).read_text())
    assert d.get('type') == 'rough-actions', f'{f}: 배운 동작 파일이 아니에요'
    for x in d.get('items', []):
        ko, tags = str(x.get('ko', '')).strip(), str(x.get('tags', '')).strip()
        if len(ko) < 2 or not tags: continue
        new.append({'ko': ko, 'tags': tags, **({'kind': 'place'} if x.get('kind') == 'place' else {})})
skipped = []
if check and new:
    r = subprocess.run(['node', '-e', NODE_CHECK, str(ROOT / 'rough' / 'nai.js')], input=json.dumps(new, ensure_ascii=False), capture_output=True, text=True, check=True)
    for x, c in zip(new, json.loads(r.stdout)):
        if not c['ok']: skipped.append((x, c['why']))
    bad = {key(x) for x, _ in skipped}; new = [x for x in new if key(x) not in bad]
for x in new:
    k = key(x)
    if k not in items or items[k]['tags'] != x['tags']: n += 1
    items[k] = x
for k in drop: items.pop(('', k), None); items.pop(('place', k), None)
cur['items'] = sorted(items.values(), key=lambda x: (x.get('kind', ''), x['ko']))
OUT.write_text(json.dumps(cur, ensure_ascii=False, indent=1) + '\n')
for x, why in skipped: print(f'  걸러 냄: {x["ko"]} → {x["tags"]} ({" · ".join(why)})')
if check:
    after = scores(); worse = [k for k in before if any(a < b - 1e-9 for a, b in zip(after[k], before[k]))]
    if worse:
        if old_text is None: OUT.unlink()
        else: OUT.write_text(old_text)
        sys.exit(f'시험 세트 정확도가 떨어져서 되돌림: ' + ', '.join(f'{k} {before[k]}→{after[k]}' for k in worse))
print(f'내장 배운 동작 {len(cur["items"])}개 (새로·바뀜 {n}개, 뺌 {len(drop)}개) → {OUT.relative_to(ROOT)}')
