#!/usr/bin/env python3
"""요소별 레이어 기본 크기·위치를 연출 DB 실측으로: 샷마다 주인물(가장 큰 인물 상자)의 칸 대비 높이·아래끝·가로 중심,
두 명 이상 컷은 큰 두 사람의 왼쪽·오른쪽 가로 중심과 높이(중앙값). → rough/layer-fit.js (window.RoughLayerFit)
입력: rough/db/db.json(샷), rough/db/cut-meta.json(인물 상자, 그림 있는 컷)
사용: python3 tools/build_layer_fit.py
"""
import json, pathlib, statistics as S, collections as C
ROOT = pathlib.Path(__file__).resolve().parents[1]
d = json.loads((ROOT / 'rough/db/db.json').read_text()); t = d['컷표']; I = t['columns'].index
m = json.loads((ROOT / 'rough/db/cut-meta.json').read_text())['cuts']
one, two = C.defaultdict(list), C.defaultdict(list)
area = lambda b: (b['x1'] - b['x0']) * (b['y1'] - b['y0'])
for r in t['rows']:
    c = m.get(r[I('컷ID')]); sh = r[I('샷')]
    if not c or not c.get('인물') or sh in (None, '—'): continue
    ps = sorted([b for b in c['인물'] if b['s'] > .5] or c['인물'], key=area, reverse=True)
    p = ps[0]; one[sh].append((p['y1'] - p['y0'], p['y1'], (p['x0'] + p['x1']) / 2))
    if len(ps) >= 2:
        a, b = sorted(ps[:2], key=lambda q: q['x0'] + q['x1'])
        two[sh].append(((a['x0'] + a['x1']) / 2, (b['x0'] + b['x1']) / 2, (a['y1'] - a['y0'] + b['y1'] - b['y0']) / 2, max(a['y1'], b['y1'])))
med = lambda xs: round(S.median(xs), 3)
out = {}
for sh, v in one.items():
    if len(v) < 20: continue
    o = {'n': len(v), 'h': med([x[0] for x in v]), 'bottom': med([x[1] for x in v]), 'x': med([x[2] for x in v])}
    w = two.get(sh, [])
    if len(w) >= 15: o['pair'] = {'n': len(w), 'left': med([x[0] for x in w]), 'right': med([x[1] for x in w]), 'h': med([x[2] for x in w]), 'bottom': med([x[3] for x in w])}
    out[sh] = o
(ROOT / 'rough/layer-fit.js').write_text('// 자동 생성: tools/build_layer_fit.py — 요소별 레이어 기본 크기·위치(연출 DB 샷별 인물 상자 실측 중앙값, 칸 대비 비율)\nwindow.RoughLayerFit=' + json.dumps(out, ensure_ascii=False) + ';\n')
print('rough/layer-fit.js', {k: (v['h'], v['bottom'], v.get('pair', {}).get('left'), v.get('pair', {}).get('right')) for k, v in out.items()})
