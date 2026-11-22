#!/usr/bin/env python3
"""저장된 그림 컷 전체에 칸·말풍선 자동 판정을 다시 돌려 rough/cuts/index.json을 갱신하고, 컷표 '메모' 열 값을 만든다.

- HC·HN·MD처럼 이 파이프라인으로 만든 컷: 그림 상자·칸 모양·말풍선·레퍼런스 사용 여부(fit)를 모두 새로 계산
- DN·GM처럼 이전 방식으로 그림 상자를 잡은 컷: 그림 상자(art·quad·cov)와 수정본(fixed)은 그대로 두고
  칸 모양·말풍선·덮는 비율만 더한 뒤, 말풍선이 그림의 25% 이상을 덮으면 레퍼런스에서 뺌(fit='partial')
- 메모: '칸: 끝까지(테두리 없음) · 사선 · 자동 말풍선 2 · 나레이션 상자 1' (기존 메모가 다른 내용이면 뒤에 붙임)
사용: python3 tools/pipeline/reanalyse_cuts.py [--memo 출력.json]
"""
import os, sys, json, collections as C
import cv2, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from panels import analyse
ROOT = os.path.join(HERE, '..', '..', 'rough')
CUTS = os.path.join(ROOT, 'cuts'); DB = os.path.join(ROOT, 'db', 'db.json')
KIND = {'single': '칸', 'bleed': '끝까지(테두리 없음)', 'multi': '여러 칸', 'none': '칸 없음'}
OLD_STYLE = {'DN', 'GM'}

idx = json.load(open(os.path.join(CUTS, 'index.json')))
d = json.load(open(DB)); t = d['컷표']; c = t['columns']; MI = c.index('메모')
memo = {}; stat = C.Counter(); before = C.Counter(i['fit'] for i in idx['items'])
for it in idx['items']:
    cid = it['source_cut']; im = cv2.imread(os.path.join(CUTS, it['file']))
    if im is None:
        continue
    a = analyse(im); sp = [b for b in a['balloons'] if len(b) == 4]; cap = [b for b in a['balloons'] if len(b) == 5]
    it.update(panel=a['panel'], balloons=[[float(v) for v in b[:4]] + b[4:] for b in a['balloons']], balloon_cover=float(a.get('balloon_cover',0)))
    if cid[:2] in OLD_STYLE:
        if it['fit'] == 'ok' and not it.get('fixed') and it['balloon_cover'] >= 0.25:
            it['fit'] = 'partial'
    else:
        it.update(art=a['art'], quad=[[float(v) for v in p] for p in a['quad']], frame=a['frame'], cov=float(a['cov']), blocks=a['panels'])
        if not it.get('fixed'):
            it['fit'] = 'partial' if (a.get('balloon_cover',0) >= 0.25 or a['cov'] < 0.4) else ('multi' if a['panel'] == 'multi' and a['cov'] < 0.35 else 'ok')
    shape = KIND[a['panel']] + (' · 사선' if it.get('frame') == 'slant' and a['panel'] != 'none' else '')
    memo[cid] = f"칸: {shape} · 자동 말풍선 {len(sp)}" + (f" · 나레이션 상자 {len(cap)}" if cap else '')
    stat[(cid[:2], it['fit'])] += 1
json.dump(idx, open(os.path.join(CUTS, 'index.json'), 'w'), ensure_ascii=False)
# 컷표 메모 열 전체(그림 컷은 새 판정, 다른 내용이 있던 메모는 보존)
col = []
for r in t['rows']:
    old = r[MI] or ''; new = memo.get(r[c.index('컷ID')])
    if new is None: col.append(old or None); continue
    keep = ' / '.join(x for x in str(old).split(' / ') if x and not x.startswith('칸:'))
    col.append(new + (' / ' + keep if keep else ''))
out = sys.argv[sys.argv.index('--memo') + 1] if '--memo' in sys.argv else None
if out:
    json.dump(col, open(out, 'w'), ensure_ascii=False)
for i, r in enumerate(t['rows']):
    r[MI] = col[i]
json.dump(d, open(DB, 'w'), ensure_ascii=False, separators=(',', ':'))
print('fit 전', dict(before)); print('fit 후', dict(C.Counter(i['fit'] for i in idx['items'])))
print(dict(sorted(stat.items())))
