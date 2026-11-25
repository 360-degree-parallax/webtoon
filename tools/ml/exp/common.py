"""실험 공용: 특징 불러오기, 한 작품 빼고(LOWO) 예측 확률"""
import json, pathlib, numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
ROOT = pathlib.Path(__file__).resolve().parents[3]; CACHE = ROOT / 'tools/ml/cache'
def load(name):
    z = np.load(CACHE / f'{name}.npz'); return dict(zip(z['ids'], z['X']))
def db():
    d = json.loads((ROOT / 'rough/db/db.json').read_text()); t = d['컷표']; c = t['columns']
    return d, {r[c.index('컷ID')]: r for r in t['rows']}, c.index
def matrix(names, ids=None, pca=None):
    """pca=k: 특징마다 PCA k차원으로 줄여 이어 붙임(라벨을 안 쓰는 변환이라 평가에 새지 않음, 학습 속도용)"""
    ms = [load(n) for n in names]
    if ids is None: ids = sorted(i for i in ms[0] if all(i in m for m in ms))
    parts = [np.stack([m[i] for i in ids]).astype(np.float32) for m in ms]
    if pca:
        from sklearn.decomposition import PCA
        parts = [PCA(min(pca, p.shape[1]), random_state=0).fit_transform(p) if p.shape[1] > pca else p for p in parts]
        parts = [(p - p.mean(0)) / (p.std(0) + 1e-6) for p in parts]
    return ids, np.hstack(parts)
def lowo_proba(X, y, work, C=1.0, scale=False, sw=None):
    classes = sorted(set(y)); P = np.zeros((len(y), len(classes)))
    for w in sorted(set(work)):
        tr, te = work != w, work == w; Xtr, Xte = X[tr], X[te]
        if scale: s = StandardScaler().fit(Xtr); Xtr, Xte = s.transform(Xtr), s.transform(Xte)
        m = LogisticRegression(C=C, max_iter=3000).fit(Xtr, y[tr], sample_weight=None if sw is None else sw[tr])
        P[np.ix_(np.where(te)[0], [classes.index(k) for k in m.classes_])] = m.predict_proba(Xte)
    return classes, P
