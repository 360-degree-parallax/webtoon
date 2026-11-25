#!/usr/bin/env python3
"""앵글: 그림 임베딩 + 컷 메타 + 원근선 특징(cut-lines.json). 한 작품 빼고 평가, 로우·하이 F1·재현율·정밀도.
균형 가중치(class_weight)와 문턱(아이레벨이 아니면 고르는 확률 기준)도 같이 비교"""
import sys, json, pathlib, numpy as np, collections as Cn
sys.argv = sys.argv[:1]; sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent)); import eval_meta as EM
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score, recall_score, precision_score
ROOT = EM.ROOT; LN = json.loads((ROOT / 'rough' / 'db' / 'cut-lines.json').read_text())['cuts']
def lf(d): return [d.get('n', 0) / 50, d.get('nv', 0) / 20, d.get('nh', 0) / 20, d.get('conv', 0), d.get('lean_abs', 0), np.tanh(d.get('vp_y', 0) / 3), d.get('vp_up', .5), d.get('tilt', 0) / 10, abs(d.get('tilt', 0)) / 10, d.get('diag_up', .5), float('conv' in d)]
Xl = np.array([lf(LN.get(i, {})) for i in EM.ids], dtype=np.float32); Xl = (Xl - Xl.mean(0)) / (Xl.std(0) + 1e-6)
y = np.array([str(EM.row[i][EM.I('앵글')]) for i in EM.ids]); sw0 = EM.WT.sample_weights(EM.ids, '앵글', y)
print('라벨별 원근 특징 평균(conv: +위로 모임, vp_up: 소실점이 위에 있는 비율)')
for a in ('로우앵글', '아이레벨', '하이앵글', '탑뷰'):
    m = y == a; v = [LN.get(i, {}) for i, ok in zip(EM.ids, m) if ok]
    print(' ', a, m.sum(), 'conv', round(float(np.mean([d.get('conv', 0) for d in v])), 3), 'vp_up', round(float(np.mean([d.get('vp_up', .5) for d in v])), 3), 'lean', round(float(np.mean([d.get('lean_abs', 0) for d in v])), 3))
def run(X, balanced=False, th=None, C=1.0):
    P = np.zeros((len(y), 0)); pred = np.empty_like(y); classes = sorted(set(y))
    for w in sorted(set(EM.work)):
        tr, te = EM.work != w, EM.work == w; sw = sw0.copy()
        if balanced:
            cnt = Cn.Counter(y[tr]); sw = sw * np.array([len(y[tr]) / (len(cnt) * cnt[c]) for c in y]) ** .5
        m = LogisticRegression(max_iter=4000, C=C).fit(X[tr], y[tr], sample_weight=sw[tr]); pp = m.predict_proba(X[te]); cl = list(m.classes_)
        if th is None: pred[te] = m.predict(X[te])
        else:
            eye = cl.index('아이레벨'); p2 = pp.copy(); p2[:, eye] = 0; alt = np.array(cl)[p2.argmax(1)]
            pred[te] = np.where(p2.max(1) >= th, alt, '아이레벨')
    f = lambda c: round(float(f1_score(y, pred, labels=[c], average='macro', zero_division=0)), 3)
    return {'정확도': round(float((pred == y).mean()), 3), '로우 F1': f('로우앵글'), '하이 F1': f('하이앵글'),
            '로우 재현/정밀': [round(float(recall_score(y, pred, labels=['로우앵글'], average='macro', zero_division=0)), 2), round(float(precision_score(y, pred, labels=['로우앵글'], average='macro', zero_division=0)), 2)],
            '하이 재현/정밀': [round(float(recall_score(y, pred, labels=['하이앵글'], average='macro', zero_division=0)), 2), round(float(precision_score(y, pred, labels=['하이앵글'], average='macro', zero_division=0)), 2)]}
if __name__ == '__main__':
    base = EM.Xi; full = np.hstack([EM.Xi, EM.Xm * .35, Xl * .5])
    for name, X in (('그림', base), ('그림+메타+원근', full), ('원근만', Xl)):
        for kw in ({}, {'balanced': True}, {'balanced': True, 'th': .35}, {'balanced': True, 'th': .5}):
            print(name, json.dumps(kw, ensure_ascii=False), json.dumps(run(X, **kw), ensure_ascii=False), flush=True)
