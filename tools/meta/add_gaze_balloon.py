#!/usr/bin/env python3
"""메타 2차: 시선 방향과 말풍선 위치를 rough/db/cut-meta.json에 더함(검출을 다시 돌리지 않음)
- 시선: 주인공 머리 상자 안에서 얼굴 상자가 어느 쪽에 치우쳤나((얼굴 중심 − 머리 중심)/머리 폭). +0.08 넘으면 오른쪽, −0.08 아래면 왼쪽, 그 사이 정면
- 말풍선: 컷 목록(rough/cuts/index.json)의 말풍선 상자 → 개수, 위치(위/가운데/아래 × 왼/가운데/오른), 주인공 머리 기준 앞쪽(시선 쪽)인지
사용: python3 tools/meta/add_gaze_balloon.py
"""
import json, pathlib, collections
ROOT = pathlib.Path(__file__).resolve().parents[2]; P = ROOT / 'rough' / 'db' / 'cut-meta.json'
D = json.loads(P.read_text()); M = D['cuts']
idx = {x['source_cut']: x for x in json.loads((ROOT / 'rough' / 'cuts' / 'index.json').read_text())['items']}
def inside(f, h): cx, cy = (f['x0'] + f['x1']) / 2, (f['y0'] + f['y1']) / 2; return h['x0'] - .02 <= cx <= h['x1'] + .02 and h['y0'] - .02 <= cy <= h['y1'] + .02
pos3 = lambda v: '왼' if v < 1 / 3 else '오른' if v > 2 / 3 else '가운데'
vpos3 = lambda v: '위' if v < 1 / 3 else '아래' if v > 2 / 3 else '가운데'
st = collections.Counter()
for cid, m in M.items():
    for k in ('시선', '시선 값', '말풍선 수', '말풍선', '말풍선 앞쪽'): m.pop(k, None)
    h = (m.get('머리') or [None])[0]
    if h:
        f = next((f for f in m.get('얼굴') or [] if inside(f, h)), None)
        if f:
            hw = max(h['x1'] - h['x0'], 1e-3); g = ((f['x0'] + f['x1']) / 2 - (h['x0'] + h['x1']) / 2) / hw
            m['시선 값'] = round(g, 3); m['시선'] = '오른쪽' if g > .08 else '왼쪽' if g < -.08 else '정면'
    bs = (idx.get(cid) or {}).get('balloons') or []
    m['말풍선 수'] = len(bs)
    if bs:
        m['말풍선'] = [{'x': round((b[0] + b[2]) / 2, 3), 'y': round((b[1] + b[3]) / 2, 3), '자리': vpos3((b[1] + b[3]) / 2) + '·' + pos3((b[0] + b[2]) / 2)} for b in bs]
        if h and m.get('시선') in ('왼쪽', '오른쪽'):
            hx = (h['x0'] + h['x1']) / 2; front = sum(1 for b in bs if ((b[0] + b[2]) / 2 - hx) * (1 if m['시선'] == '오른쪽' else -1) > 0)
            m['말풍선 앞쪽'] = round(front / len(bs), 2); st['앞'] += front; st['뒤'] += len(bs) - front
    st[m.get('시선', '없음')] += 1
D['meta']['2차'] = '시선(얼굴-머리 상자 치우침)·말풍선 위치(index.json balloons)'
P.write_text(json.dumps(D, ensure_ascii=False, separators=(',', ':')))
print(dict(st))
