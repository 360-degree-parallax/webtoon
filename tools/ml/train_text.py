#!/usr/bin/env python3
"""컷 글 임베딩(tools/ml/embed_text.py)으로 감정(14종)·강도(1~3)를 학습하고, 한 작품을 빼고 맞히는 방식으로 평가한다.

특징: 이 컷 임베딩 + 같은 화 앞 컷·뒤 컷 임베딩(문맥). 모델: 로지스틱 회귀(다항)
사용: python3 tools/ml/train_text.py [small|base] [--ctx 0|1] [--C 2] [--export]
--export: 전체 데이터로 학습해 rough/emotion-head.json(선형 머리 가중치) 저장 → 브라우저에서 같은 E5 ONNX로 임베딩해 씀
"""
import sys, json, pathlib, numpy as np, collections as Cn
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score, cohen_kappa_score
ROOT = pathlib.Path(__file__).resolve().parents[2]
A = sys.argv[1:]
size = A[0] if A and not A[0].startswith('--') else 'small'
ctx = int(A[A.index('--ctx') + 1]) if '--ctx' in A else 1
Creg = float(A[A.index('--C') + 1]) if '--C' in A else 2.0
z = np.load(ROOT / 'tools' / 'ml' / 'cache' / f'text-e5{size}.npz'); ids = list(z['ids']); X0 = z['X']
d = json.loads((ROOT / 'rough' / 'db' / 'db.json').read_text()); t = d['컷표']; c = t['columns']; I = c.index
row = {r[I('컷ID')]: r for r in t['rows']}
emo = np.array([row[i][I('감정')] for i in ids]); inten = np.array([int(row[i][I('강도')] or 1) for i in ids])
work = np.array([i[:2] for i in ids]); ep = [i[:5] for i in ids]

def features(X):
    if not ctx: return X
    P = np.zeros_like(X); N = np.zeros_like(X)
    for k in range(len(ids)):
        if k > 0 and ep[k - 1] == ep[k]: P[k] = X[k - 1]
        if k + 1 < len(ids) and ep[k + 1] == ep[k]: N[k] = X[k + 1]
    return np.hstack([X, 0.5 * P, 0.5 * N])
X = features(X0)

def lowo(y, name):
    pred = np.empty_like(y); per = {}
    for w in sorted(set(work)):
        tr, te = work != w, work == w
        m = LogisticRegression(C=Creg, max_iter=2000).fit(X[tr], y[tr]); pred[te] = m.predict(X[te])
        per[w] = (pred[te] == y[te]).mean()
    acc = (pred == y).mean(); maj = Cn.Counter(y).most_common(1)[0][1] / len(y)
    out = {'정확도': round(float(acc), 3), '가장 흔한 값': round(maj, 3), 'macro-F1': round(float(f1_score(y, pred, average='macro')), 3),
           'kappa': round(float(cohen_kappa_score(y, pred)), 3), '작품별': {k: round(float(v), 3) for k, v in per.items()}}
    if name == '강도': out['MAE'] = round(float(np.abs(pred.astype(int) - y.astype(int)).mean()), 3)
    print(name, json.dumps(out, ensure_ascii=False)); return out, pred

if __name__ == '__main__':
    print(f'E5-{size} · 문맥 {ctx} · C={Creg} · 컷 {len(ids)}')
    r1, p1 = lowo(emo, '감정'); r2, p2 = lowo(inten, '강도')
    if '--preds' in A:  # 한 작품 빼고 학습한 예측(엔진 평가용)
        pp = pathlib.Path(A[A.index('--preds') + 1]); pp.write_text(json.dumps({i: {'emo': str(e), 'i': int(k)} for i, e, k in zip(ids, p1, p2)}, ensure_ascii=False)); print('예측 저장', pp)
    if '--export' in A:
        heads = {}
        for name, y in (('emo', emo), ('int', inten)):
            m = LogisticRegression(C=Creg, max_iter=3000).fit(X, y)
            heads[name] = {'classes': [str(k) for k in m.classes_], 'W': np.round(m.coef_, 4).tolist(), 'b': np.round(m.intercept_, 4).tolist()}
        meta = {'model': f'Xenova/multilingual-e5-{size}', 'onnx': 'onnx/model_quantized.onnx', 'prefix': 'query: ', 'pool': 'mean+l2', 'ctx': ctx, 'dim': int(X0.shape[1]),
                'eval': {'감정': r1, '강도': r2}, 'revision': d.get('__meta', {}).get('revision'), 'cuts': len(ids)}
        p = ROOT / 'rough' / 'emotion-head.json'; p.write_text(json.dumps({'meta': meta, **heads}, ensure_ascii=False, separators=(',', ':')))
        print('저장', p, round(p.stat().st_size / 1024), 'KB')
