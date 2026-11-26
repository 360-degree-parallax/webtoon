#!/usr/bin/env python3
"""로우앵글 재검수 큐: 균형 가중 앵글 모델(CLIP+DINO+글 PCA, 한 작품 빼고)의 로우·하이 점수 상위 5%씩.
이미 Claude·사용자가 확인한 앵글 컷은 뺌. 결과: 스크래치 JSON(컷, 지금 라벨, 모델 1위, 로우/하이 확률)"""
import sys, json, pathlib, numpy as np
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent)); from common import *
from sklearn.linear_model import LogisticRegression
d, row, I = db(); ids, X = matrix(['img-clip', 'img-dino', 'text-e5base'], pca=128)
y = np.array([str(row[i][I('앵글')]) for i in ids]); work = np.array([i[:2] for i in ids]); cl = sorted(set(y)); P = np.zeros((len(y), len(cl)))
for w in sorted(set(work)):
    tr, te = work != w, work == w; m = LogisticRegression(C=0.05, max_iter=3000, class_weight='balanced').fit(X[tr], y[tr])
    P[np.ix_(np.where(te)[0], [cl.index(k) for k in m.classes_])] = m.predict_proba(X[te])
ver = {x['cut'] for x in json.loads((ROOT / 'rough/db/verified.json').read_text())['labels'] if x['field'] == '앵글'}
k = int(len(y) * .05); out = {}
for c in ('로우앵글', '하이앵글'):
    for j in np.argsort(-P[:, cl.index(c)])[:k]:
        if ids[j] in ver or ids[j] in out: continue
        out[ids[j]] = {'cut': ids[j], 'old': y[j], 'top': cl[int(P[j].argmax())], 'low': round(float(P[j, cl.index('로우앵글')]), 2), 'high': round(float(P[j, cl.index('하이앵글')]), 2), 'q': c}
L = sorted(out.values(), key=lambda r: (r['q'], -max(r['low'], r['high'])))
json.dump(L, open(sys.argv[1], 'w'), ensure_ascii=False); import collections
print(len(L), collections.Counter((r['q'], r['old']) for r in L))
