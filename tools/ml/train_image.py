#!/usr/bin/env python3
"""컷 이미지 임베딩(+컷 글 임베딩)으로 샷·감정·강도·역할을 학습하고, 한 작품을 빼고 평가한다.
사용: python3 tools/ml/train_image.py [clip|dino|both] [--text] [--C 1] [--audit 경로.csv]
--text: 컷 글 E5-base 임베딩을 이어 붙임(그림+글)
--audit: 샷 예측이 사람 라벨과 크게 어긋나는(확신 높은) 컷 목록 → 재검토 큐
"""
import sys, json, csv, pathlib, numpy as np, collections as Cn
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score, cohen_kappa_score
ROOT = pathlib.Path(__file__).resolve().parents[2]; CACHE = ROOT / 'tools' / 'ml' / 'cache'
A = sys.argv[1:]; kind = A[0] if A and not A[0].startswith('--') else 'clip'
Creg = float(A[A.index('--C') + 1]) if '--C' in A else 1.0
def load(name):
    z = np.load(CACHE / name); return dict(zip(z['ids'], z['X']))
mats = [load(f'img-{k}.npz') for k in (['clip', 'dino'] if kind == 'both' else [kind])]
if '--text' in A: mats.append(load('text-e5base.npz'))
ids = [i for i in mats[0] if all(i in m for m in mats)]; ids.sort()
X = np.hstack([np.stack([m[i] for i in ids]) for m in mats])
d = json.loads((ROOT / 'rough' / 'db' / 'db.json').read_text()); t = d['컷표']; c = t['columns']; I = c.index
row = {r[I('컷ID')]: r for r in t['rows']}
work = np.array([i[:2] for i in ids])
ORDER = ['설정', '전경', '전신', '중경', '클로즈업', '디테일']

def lowo(y, name, proba=False):
    pred = np.empty_like(y); P = None; classes = None
    for w in sorted(set(work)):
        tr, te = work != w, work == w
        m = LogisticRegression(C=Creg, max_iter=3000).fit(X[tr], y[tr]); pred[te] = m.predict(X[te])
        if proba:
            if P is None: classes = list(np.unique(y)); P = np.zeros((len(y), len(classes)))
            pp = m.predict_proba(X[te]); P[np.ix_(np.where(te)[0], [classes.index(k) for k in m.classes_])] = pp
    out = {'정확도': round(float((pred == y).mean()), 3), '가장 흔한 값': round(Cn.Counter(y).most_common(1)[0][1] / len(y), 3),
           'macro-F1': round(float(f1_score(y, pred, average='macro')), 3), 'kappa': round(float(cohen_kappa_score(y, pred)), 3),
           '작품별': {w: round(float((pred[work == w] == y[work == w]).mean()), 3) for w in sorted(set(work))}}
    if name == '샷':
        ok = [abs(ORDER.index(a) - ORDER.index(b)) <= 1 for a, b in zip(y, pred) if a in ORDER and b in ORDER]
        out['한 단계 차이까지'] = round(float(np.mean(ok)), 3)
    print(name, json.dumps(out, ensure_ascii=False)); return out, pred, P, classes

if __name__ == '__main__':
    print(f'{kind}{" + 글" if "--text" in A else ""} · 특징 {X.shape[1]} · 컷 {len(ids)} · C={Creg}')
    res = {}
    for col, name in (('샷', '샷'), ('감정', '감정'), ('강도', '강도'), ('역할', '역할'), ('앵글', '앵글')):
        y = np.array([str(row[i][I(col)]) for i in ids]); res[name] = lowo(y, name, proba=(name == '샷' and '--audit' in A))
    if '--audit' in A:  # 사람 라벨 확률이 낮고 모델 1위 확률이 높은 컷부터
        _, pred, P, classes = res['샷']; y = np.array([str(row[i][I('샷')]) for i in ids])
        rows = []
        for k, i in enumerate(ids):
            pl = P[k, classes.index(y[k])]; top = int(P[k].argmax())
            if classes[top] != y[k]: rows.append((P[k, top] - pl, i, y[k], classes[top], round(float(P[k, top]), 2), round(float(pl), 2), row[i][I('내용')]))
        rows.sort(reverse=True); p = pathlib.Path(A[A.index('--audit') + 1])
        with open(p, 'w', encoding='utf-8-sig', newline='') as f:
            w = csv.writer(f); w.writerow(['컷ID', '사람 샷', '모델 샷', '모델 확률', '사람 라벨 확률', '내용'])
            for r in rows[:300]: w.writerow(r[1:])
        print('재검토 큐', p, min(300, len(rows)), '컷')
