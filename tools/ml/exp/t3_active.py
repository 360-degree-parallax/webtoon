#!/usr/bin/env python3
"""T3 능동 학습 시뮬레이션: 라벨을 조금씩 붙여 나갈 때, 무작위로 고르는 것과 모델이 헷갈리는 컷부터 고르는 것 중 어느 쪽이 적은 라벨로 빨리 오르나.
- 새 작품을 처음 판정하는 상황: 한 작품(평가용)을 빼고, 나머지에서 라벨 풀을 만듦. 처음 100컷 → 100컷씩 추가, 최대 1,500컷
- 고르는 법: 무작위 / 불확실도(1·2위 확률 차이가 작은 것) / 불확실도+다양성(후보 상위 500 중 군집별 하나씩)
- 분야: 샷, 역할. 특징: 그림 CLIP+DINO+글(PCA 128씩). 평가: 빼둔 작품 정확도, 9작품 평균. 3번 반복 평균
결과: docs/ml/exp/active-learning.md
"""
import sys, pathlib, numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.cluster import KMeans
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent)); from common import *
d, row, I = db()
ids, X = matrix(['img-clip', 'img-dino', 'text-e5base'], pca=128)
work = np.array([i[:2] for i in ids]); W = sorted(set(work))
STEPS = list(range(100, 1501, 100))
def fit(Xa, ya):
    return LogisticRegression(C=0.05, max_iter=2000).fit(Xa, ya)
def run(y, strat, seed):
    out = np.zeros(len(STEPS))
    for w in W:
        pool = np.where(work != w)[0]; te = np.where(work == w)[0]; rng = np.random.default_rng(seed)
        lab = list(rng.choice(pool, STEPS[0], replace=False))
        for si, n in enumerate(STEPS):
            if si:
                rest = np.setdiff1d(pool, lab); k = n - len(lab)
                if strat == 'random': add = rng.choice(rest, k, replace=False)
                else:
                    P = m.predict_proba(X[rest]); s = np.sort(P, 1); marg = s[:, -1] - s[:, -2]
                    order = rest[np.argsort(marg)]
                    if strat == 'margin': add = order[:k]
                    else:
                        cand = order[:500]; km = KMeans(k, n_init=1, random_state=seed).fit(X[cand])
                        add = np.array([cand[np.where(km.labels_ == c)[0][0]] for c in range(k) if (km.labels_ == c).any()])
                lab += list(add)
            m = fit(X[lab], y[lab])
            out[si] += (m.predict(X[te]) == y[te]).mean() / len(W)
    return out
L = ['# T3 능동 학습 시뮬레이션', '', '빼둔 작품 정확도(9작품 평균, 3번 반복). 라벨 수는 나머지 8작품에서 고른 컷 수.', '']
for field in ('샷', '역할'):
    y = np.array([str(row[i][I(field)]) for i in ids]); full = 0
    for w in W:
        tr, te = work != w, work == w; full += (fit(X[tr], y[tr]).predict(X[te]) == y[te]).mean() / len(W)
    res = {s: np.mean([run(y, s, sd) for sd in range(3)], 0) for s in ('random', 'margin', 'margin+div')}
    L += [f'## {field} (전체 라벨 {int((work != W[0]).sum())}컷 안팎으로 학습하면 {full:.1%})', '', '| 라벨 수 | 무작위 | 불확실도 | 불확실도+다양성 |', '|---|---|---|---|']
    L += [f'| {n} | {res["random"][i]:.1%} | {res["margin"][i]:.1%} | {res["margin+div"][i]:.1%} |' for i, n in enumerate(STEPS) if n in (100, 200, 300, 500, 800, 1000, 1500)]
    for s in ('margin', 'margin+div'):
        tgt = res['random'][-1]; hit = next((n for n, v in zip(STEPS, res[s]) if v >= tgt), None)
        L.append(f'- {s}: 무작위 1,500컷 점수({tgt:.1%})에 닿는 라벨 수 {hit or "1,500 안에 못 닿음"}')
    L.append(''); print('\n'.join(L[-14:]), flush=True)
p = ROOT / 'docs/ml/exp/active-learning.md'; p.write_text('\n'.join(L) + '\n'); print('저장', p.relative_to(ROOT))
