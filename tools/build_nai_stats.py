#!/usr/bin/env python3
"""연출 DB(rough/db/db.json)의 감정별 색 분포로 NovelAI 빛·색 태그 근거표(rough/nai-stats.js)를 만든다.

- 감정마다 그림 컷의 '덩어리 색' 비율을 세고, 흰색을 뺀 가장 많은 색이 15% 이상이면 그 색을 태그로 쓴다.
- '효과 배경' 샷은 따로 세어 배경색 태그(예: pink background)를 고른다.
사용: python3 tools/build_nai_stats.py
"""
import json, collections, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
DB = ROOT / 'rough' / 'db' / 'db.json'
OUT = ROOT / 'rough' / 'nai-stats.js'
MIN_SHARE = 0.15
MIN_FX = 6  # 효과 배경 표본이 이보다 적으면 배경색은 고르지 않음

d = json.loads(DB.read_text())
t = d['컷표']; c = t['columns']
ix = {k: c.index(k) for k in ('유형', '샷', '감정', '덩어리 색', '작품')}
by = collections.defaultdict(collections.Counter)
fx = collections.defaultdict(collections.Counter)
works = set()
for r in t['rows']:
    if r[ix['유형']] != '그림' or not r[ix['감정']] or not r[ix['덩어리 색']]:
        continue
    works.add(r[ix['작품']])
    by[r[ix['감정']]][r[ix['덩어리 색']]] += 1
    if r[ix['샷']] == '효과 배경':
        fx[r[ix['감정']]][r[ix['덩어리 색']]] += 1

emo = {}
for e, cn in by.items():
    n = sum(cn.values())
    tone = next(((k, v / n) for k, v in cn.most_common() if k != '흰색'), None)
    row = {'n': n, 'white': round(cn['흰색'] / n, 2)}
    if tone and tone[1] >= MIN_SHARE:
        row['tone'] = tone[0]; row['share'] = round(tone[1], 2)
    f = fx.get(e)
    if f and sum(f.values()) >= MIN_FX:
        top = next(((k, v / sum(f.values())) for k, v in f.most_common() if k.startswith(('중간 컬러', '강조색', '검정', '어두운 톤', '밝은 톤'))), None)
        if top and top[1] >= 0.25:
            row['fx'] = top[0]; row['fxShare'] = round(top[1], 2); row['fxN'] = sum(f.values())
    emo[e] = row

meta = {'source': 'rough/db/db.json', 'revision': d.get('__meta', {}).get('revision'), 'works': sorted(works),
        'cuts': sum(r['n'] for r in emo.values())}
js = ('/* 자동 생성: tools/build_nai_stats.py — 손으로 고치지 마세요. 연출 DB 감정별 덩어리 색 분포 */\n'
      '(function (S) { Object.assign(S, ' + json.dumps({'meta': meta, 'emo': emo}, ensure_ascii=False) + '); })'
      "(typeof module !== 'undefined' ? module.exports : (window.RoughNAIStats = {}));\n")
OUT.write_text(js)
print(OUT, meta)
for e, r in sorted(emo.items(), key=lambda x: -x[1]['n']):
    print(' ', e, r)
