#!/usr/bin/env python3
"""컷 메타데이터(rough/db/cut-meta.json) + 그림·메타 샷 모델 의견을 컷 목록(rough/cuts/index.json)에 열로 붙임 → 이어서 build_index_min.py
붙이는 열: np 머리(인물) 수 · hr 머리 높이(컷 폭 대비) · mx 주인공 가로 위치(L/C/R) · mono 흑백 · sp 지금 샷 라벨에 대한 그림+메타 모델 확률(한 작품 빼고 학습) · salt 모델이 더 높게 본 샷(0.5 이상일 때)
사용: python3 tools/meta/build_meta_cols.py && python3 tools/build_index_min.py
"""
import sys, json, pathlib, numpy as np
from sklearn.linear_model import LogisticRegression
ROOT = pathlib.Path(__file__).resolve().parents[2]; sys.path.insert(0, str(ROOT / 'tools' / 'meta')); sys.argv = sys.argv[:1]
import eval_meta as EM, weights as WT
M = EM.M; ids = EM.ids; X = np.hstack([EM.Xi, EM.Xm * .35])
y = np.array([str(EM.row[i][EM.I('샷')]) for i in ids]); sw = WT.sample_weights(ids, '샷', y); classes = sorted(set(y)); P = np.zeros((len(ids), len(classes)))
for w in sorted(set(EM.work)):
    tr, te = EM.work != w, EM.work == w
    m = LogisticRegression(max_iter=4000).fit(X[tr], y[tr], sample_weight=sw[tr])
    P[np.ix_(np.where(te)[0], [classes.index(k) for k in m.classes_])] = m.predict_proba(X[te])
opin = {}
for k, i in enumerate(ids):
    j = int(P[k].argmax()); opin[i] = (round(float(P[k, classes.index(y[k])]), 2), classes[j] if classes[j] != y[k] and P[k, j] >= .5 else None)
src = ROOT / 'rough' / 'cuts' / 'index.json'; d = json.loads(src.read_text()); n = 0
for x in d['items']:
    cid = x['source_cut']; m = M.get(cid)
    for k in ('np', 'hr', 'mx', 'mono', 'sp', 'salt'): x.pop(k, None)
    if not m: continue
    W, H = m['크기']; x['np'] = m['머리 수']; x['mono'] = 1 if m['흑백'] else 0
    if '머리 높이 비' in m: x['hr'] = round(m['머리 높이 비'] * H / W, 2)
    if m.get('주인공'): x['mx'] = {'왼쪽': 'L', '가운데': 'C', '오른쪽': 'R'}[m['주인공']['가로']]
    if cid in opin: x['sp'], salt = opin[cid]; x['salt'] = salt
    if x.get('salt') is None: x.pop('salt', None)
    n += 1
src.write_text(json.dumps(d, ensure_ascii=False, separators=(',', ':'))); print('붙임', n, '컷 · 모델이 다른 샷을 0.5 이상으로 본 컷', sum(1 for v in opin.values() if v[1]))
