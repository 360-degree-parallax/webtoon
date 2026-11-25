#!/usr/bin/env python3
"""T2 라벨 오류 찾기(confident learning). 한 작품 빼고 학습한 확률로, 라벨이 틀렸을 가능성이 큰 컷을 고른다.
- 클래스별 문턱 t_j = 라벨이 j인 컷들의 p_j 평균. 다른 클래스 k에서 p_k ≥ t_k 이고 p_k > p_라벨 이면 의심
- 검증: 예전 샷 재검수 300컷(docs/ml/shot-audit.csv의 '사람 샷'이 고치기 전 라벨)에서, 의심 표시가 실제 정정과 얼마나 맞는지
결과: docs/ml/exp/label-noise.csv, 요약은 표준 출력
"""
import sys, csv, pathlib, collections as C, numpy as np
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent)); from common import *
d, row, I = db()
ids, X = matrix(['img-clip', 'img-dino', 'text-e5base'])
work = np.array([i[:2] for i in ids])
out = []; summary = {}
for field in ('샷', '앵글', '역할', '감정'):
    y = np.array([str(row[i][I(field)]) for i in ids])
    classes, P = lowo_proba(X, y, work)
    li = np.array([classes.index(v) for v in y]); pl = P[np.arange(len(y)), li]
    t = np.array([P[li == j, j].mean() if (li == j).any() else 1 for j in range(len(classes))])
    flag = []
    for k in range(len(y)):
        cand = [(P[k, j], j) for j in range(len(classes)) if j != li[k] and P[k, j] >= t[j] and P[k, j] > pl[k]]
        if cand: p, j = max(cand); flag.append((p - pl[k], ids[k], y[k], classes[j], round(float(p), 2), round(float(pl[k]), 2)))
    flag.sort(reverse=True); summary[field] = (len(flag), len(y))
    out += [(field,) + f[1:] + (round(float(f[0]), 2),) for f in flag]
    if field == '샷':
        audit = list(csv.DictReader(open(ROOT / 'docs/ml/shot-audit.csv', encoding='utf-8-sig')))
        pos = {i: k for k, i in enumerate(ids)}; tp = fp = fn = tn = 0
        for a in audit:
            k = pos.get(a['컷ID'])
            if k is None: continue
            orig = a['사람 샷']; fixed = str(row[a['컷ID']][I('샷')]) != orig
            if orig not in classes: continue
            j0 = classes.index(orig); p0 = P[k, j0]
            f = any(P[k, j] >= t[j] and P[k, j] > p0 for j in range(len(classes)) if j != j0)
            tp += f and fixed; fp += f and not fixed; fn += (not f) and fixed; tn += (not f) and (not fixed)
        print(f'샷 재검수 300컷 검증: 의심 {tp + fp}컷 중 실제 정정 {tp} (정밀도 {tp / max(1, tp + fp):.0%}), 정정된 {tp + fn}컷 중 잡아냄 {tp} (재현율 {tp / max(1, tp + fn):.0%}), 의심 아님 {fn + tn}컷 중 정정 {fn} ({fn / max(1, fn + tn):.0%})')
for f, (n, m) in summary.items(): print(f'{f}: 의심 {n} / {m}컷 ({n / m:.1%})')
p = ROOT / 'docs/ml/exp/label-noise.csv'; p.parent.mkdir(parents=True, exist_ok=True)
with open(p, 'w', encoding='utf-8-sig', newline='') as fh:
    w = csv.writer(fh); w.writerow(['분야', '컷ID', '지금 라벨', '모델 제안', '제안 확률', '지금 라벨 확률', '차이']); w.writerows(out)
print('저장', p.relative_to(ROOT), len(out))
