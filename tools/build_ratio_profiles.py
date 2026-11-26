#!/usr/bin/env python3
"""상용 웹툰 컷 비율 기준(rough/ratio-profiles.js)을 만든다.
컷 블록 전체가 아니라 실제 그림이 그려진 상자(index.json art)의 높이/폭을 잰다(말풍선·여백 빼고).
작품별·전체로, 샷마다 10·50·90% 값. 엔진은 고른 기준의 샷별 중앙값 둘레로 칸 길이를 맞춤
사용: python3 tools/build_ratio_profiles.py
"""
import json, pathlib, collections
ROOT = pathlib.Path(__file__).resolve().parent.parent
items = json.loads((ROOT / 'rough/cuts/index.json').read_text())['items']
def q(a):
    a = sorted(a); n = len(a); return [round(a[int(n * p)], 2) for p in (.1, .5, .9)]
by = collections.defaultdict(lambda: collections.defaultdict(list))
for it in items:
    a = it.get('art')
    if not a or not it.get('w') or (a[2] - a[0]) * it['w'] < 50: continue
    r = (a[3] - a[1]) * it['h'] / ((a[2] - a[0]) * it['w'])
    for k in (it['work'], '__all'): by[k][it.get('shot') or '?'].append(r); by[k]['__all'].append(r)
out = {}
for w, d in by.items():
    allv = d['__all']; shots = {s: q(v) for s, v in d.items() if s != '__all' and len(v) >= 15}
    out[w] = {'n': len(allv), 'all': q(allv), 'shot': shots}
p = ROOT / 'rough/ratio-profiles.js'
p.write_text('/* 자동 생성: tools/build_ratio_profiles.py — 상용 웹툰 그림 상자 높이/폭(10·50·90%) */\nwindow.RoughRatio=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
for w, v in out.items(): print(w, v['n'], v['all'])
