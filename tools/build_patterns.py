#!/usr/bin/env python3
"""연출 DB 사본(rough/db/db.json)에서 콘티 엔진용 패턴(rough/patterns.json)을 만든다.

패턴 하나 = 5컷 리듬 한 행(연출명·거리·템포·서사 형태 등) + 그 묶음에 속한 컷표 행들(구조 값만).
작품 내용·대사는 넣지 않는다.
사용: python3 tools/build_patterns.py [--check]   (--check: 지금 patterns.json과 같은 작품 범위를 비교만)
"""
import json, sys, pathlib, collections

ROOT = pathlib.Path(__file__).resolve().parent.parent
DB = ROOT / 'rough' / 'db' / 'db.json'
OUT = ROOT / 'rough' / 'patterns.json'

d = json.loads(DB.read_text())
code = {r[0]: r[1] for r in d['작품 정보']['rows']}  # 작품명 → 코드
cut = d['컷표']; cc = cut['columns']
rh = d['5컷 리듬']; rc = rh.columns if hasattr(rh, 'columns') else rh['columns']
ci = {k: cc.index(k) for k in ('작품', '컷ID', '유형', '샷', '앵글', '역할', '감정', '강도', '5컷묶음', '말풍선', '블록 내 컷', '높이/폭', '뒤여백/폭')}
ri = {k: rc.index(k) for k in ('작품', '묶음', '연출명', '거리 흐름', '템포', '서사 형태', '정보 흐름', '색 흐름', '감정 곡선', '연출 목적', '서사 구조(VNG)', '주된 컷 전환')}

def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0

by = collections.defaultdict(list)
for r in cut['rows']:
    g = r[ci['5컷묶음']]
    if g:
        by[g].append(r)

pats = []
for r in rh['rows']:
    gid = r[ri['묶음']]; rows = by.get(gid, [])
    if not rows:
        continue
    src = gid.split('-')[0]
    cuts = [{'t': x[ci['유형']], 'shot': x[ci['샷']], 'ang': x[ci['앵글']], 'role': x[ci['역할']], 'emo': x[ci['감정']],
             'i': num(x[ci['강도']]), 'h': num(x[ci['높이/폭']]), 'gap': num(x[ci['뒤여백/폭']]), 'b': num(x[ci['말풍선']]),
             'sub': num(x[ci['블록 내 컷']]) if x[ci['블록 내 컷']] is not None else None, 'id': x[ci['컷ID']]} for x in rows]
    pats.append({'src': src, 'id': gid[len(src) + 1:], 'name': r[ri['연출명']], 'dist': r[ri['거리 흐름']], 'tempo': r[ri['템포']],
                 'narr': r[ri['서사 형태']], 'info': r[ri['정보 흐름']], 'color': r[ri['색 흐름']], 'curve': r[ri['감정 곡선']],
                 'goal': r[ri['연출 목적']], 'vng': r[ri['서사 구조(VNG)']], 'trans': r[ri['주된 컷 전환']], 'cuts': cuts})

works = collections.Counter(p['src'] for p in pats)
if '--check' in sys.argv:
    old = json.loads(OUT.read_text())['patterns']
    mine = [p for p in pats if p['src'] in {o['src'] for o in old}]
    same = sum(1 for a, b in zip(old, mine) if a == b)
    print('기존', len(old), '재생성(같은 작품)', len(mine), '완전히 같은 패턴', same)
    for a, b in zip(old, mine):
        if a != b:
            ks = [k for k in a if a[k] != b.get(k)]
            print(' 첫 차이', a['src'], a['id'], ks, (a['cuts'][0], b['cuts'][0]) if 'cuts' in ks else '')
            break
    sys.exit()
names = {v: k for k, v in code.items()}
note = (f"{len(works)}개 작품({', '.join(f'{names.get(k, k)} {v}' for k, v in works.items())}) 5컷 묶음 {len(pats)}개의 구조 통계. "
        "작품 내용·대사는 포함하지 않음. h·gap은 컷 높이·뒤 여백을 화면 폭 대비 비율로 표시")
OUT.write_text(json.dumps({'version': 2, 'note': note, 'patterns': pats}, ensure_ascii=False, separators=(',', ':')))
print(OUT, len(pats), dict(works))
