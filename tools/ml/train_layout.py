"""② 칸 길이(h)·다음 컷까지 간격(gap): 컷 글의 엔진 해석 특징 → 회귀, 한 작품 빼고 평가.
목표: 연출 DB 패턴 컷의 실제 h(칸 높이 비)와 gap. 길이는 log로 학습.
사용: python3 tools/ml/train_layout.py [--export rough/layout-model.js]
"""
import json, sys, math, warnings
import numpy as np
from scipy.stats import spearmanr
from sklearn.linear_model import Ridge
from sklearn.feature_extraction import DictVectorizer
warnings.filterwarnings('ignore')

B = [b for b in json.load(open('tools/ml/cache/bundles.json'))]

def cut_feats(b, k):
    a, bs = b['an'], b['beats']; n = len(bs); x = bs[k]; nx = bs[k + 1] if k + 1 < n else None; pv = bs[k - 1] if k else None
    f = {'bias': 1, 'pos': k / max(1, n - 1), 'first': int(k == 0), 'last': int(k == n - 1), 'n': n / 5,
         'i': x['i'] / 3, 'said': int(x['said']), 'nd': min(3, x['nd']) / 3, 'cap': min(2, x['cap']), 'sfx': min(2, x['sfx']), 'len': min(120, x['len']) / 60,
         f'emo={x["emo"]}': 1, f'role={x["role"]}': 1, f'vng={x["vng"]}': 1, f'tr={x["trans"]}': 1,
         f'tempo={a["tempo"]}': 1, f'narr={a["narr"]}': 1, f'goal={a["goal"]}': 1, 'peak': int(k in a['peaks'])}
    if nx: f.update({f'nvng={nx["vng"]}': 1, f'ntr={nx["trans"]}': 1, f'nrole={nx["role"]}': 1, 'ndi': (x['i'] - nx['i']) / 2, 'nsaid': int(nx['said']), 'samewho': int(bool(x['who']) and x['who'] == nx['who'])})
    else: f['nonext'] = 1
    if pv: f.update({f'pvng={pv["vng"]}': 1, 'pdi': (x['i'] - pv['i']) / 2})
    return f

def rows():
    X, H, G, W, E = [], [], [], [], []
    for b in B:
        for k, (t, e) in enumerate(zip(b['truth'], b['eng'])):
            if t['h'] is None or t['gap'] is None or k >= len(b['beats']): continue
            X.append(cut_feats(b, k)); H.append(t['h']); G.append(t['gap']); W.append(b['work']); E.append((e['h'], e['gap']))
    return X, np.array(H), np.array(G), np.array(W), np.array(E)

def lowo(X, y, W, alpha, log=False):
    P = np.zeros(len(y))
    for w in sorted(set(W)):
        tr, te = W != w, W == w; dv = DictVectorizer(); Xt = dv.fit_transform([X[i] for i in np.where(tr)[0]])
        yt = np.log(y[tr]) if log else y[tr]; m = Ridge(alpha=alpha).fit(Xt, yt)
        p = m.predict(dv.transform([X[i] for i in np.where(te)[0]])); P[te] = np.exp(p) if log else p
    return P

def report(name, y, p):
    return f'{name}: MAE {abs(y-p).mean():.3f} · 순위상관 {spearmanr(y,p)[0]:.3f}'

def fit_all(X, y, alpha, log):
    dv = DictVectorizer(); Xt = dv.fit_transform(X); m = Ridge(alpha=alpha).fit(Xt, np.log(y) if log else y)
    return {k: round(float(v), 5) for k, v in zip(dv.feature_names_, m.coef_) if abs(v) > 1e-6}, round(float(m.intercept_), 5)

if __name__ == '__main__':
    X, H, G, W, E = rows(); print('컷', len(H))
    print(report('엔진 길이', H, E[:, 0])); print(report('중앙값 길이', H, np.full(len(H), np.median(H))))
    print(report('엔진 간격', G, E[:, 1])); print(report('중앙값 간격', G, np.full(len(G), np.median(G))))
    best = {}
    for a in (1, 3, 10, 30):
        ph = lowo(X, H, W, a, log=True); pg = lowo(X, G, W, a)
        print(f'alpha={a}', report('길이', H, ph), '|', report('간격', G, pg))
        best.setdefault('h', (9, 0)); best.setdefault('g', (9, 0))
        if abs(H - ph).mean() < best['h'][0]: best['h'] = (abs(H - ph).mean(), a)
        if abs(G - pg).mean() < best['g'][0]: best['g'] = (abs(G - pg).mean(), a)
    print('best', best)
    if '--export' in sys.argv:
        out = sys.argv[sys.argv.index('--export') + 1]
        wh, bh = fit_all(X, H, best['h'][1], True); wg, bg = fit_all(X, G, best['g'][1], False)
        ph = lowo(X, H, W, best['h'][1], log=True)
        meta = {'eval': {'모델 MAE': round(float(abs(H - ph).mean()), 3), '모델 순위상관': round(float(spearmanr(H, ph)[0]), 3),
                         '기존 엔진 MAE': round(float(abs(H - E[:, 0]).mean()), 3), '기존 엔진 순위상관': round(float(spearmanr(H, E[:, 0])[0]), 3)}, 'cuts': len(H), 'alpha': best['h'][1]}
        js = ('/* 자동 생성: tools/ml/train_layout.py — 컷 글 해석 특징 → 칸 길이(log) 선형 회귀. 간격은 글로 예측이 안 돼(순위상관 ≈ 0) 넣지 않음. */\n'
              '(function (M) { Object.assign(M, ' + json.dumps({'meta': meta, 'h': {'w': wh, 'b': bh, 'log': True}}, ensure_ascii=False, separators=(',', ':')) + '); })'
              "(typeof module !== 'undefined' ? module.exports : (window.RoughLayoutModel = {}));\n")
        open(out, 'w').write(js); print('→', out, len(js), 'bytes')
