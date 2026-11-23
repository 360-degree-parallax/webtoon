#!/usr/bin/env python3
"""브라우저에 넣을 수 있는 가벼운 강도·감정 모델: 글자 1~3그램 TF-IDF + 로지스틱 회귀(문맥: 앞·뒤 컷 글).
한 작품을 빼고 평가하고, --export면 rough/feel-model.js(조각별 가중치 상위 N개)로 내보냄.
사용: python3 tools/ml/train_ngram.py [--top 3000] [--C 1] [--preds 경로] [--export]
"""
import sys, json, re, pathlib, numpy as np, collections as Cn
from scipy import sparse
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score, cohen_kappa_score
ROOT = pathlib.Path(__file__).resolve().parents[2]
A = sys.argv[1:]
TOP = int(A[A.index('--top') + 1]) if '--top' in A else 4000  # 어휘 수(빈도순). 내보낼 때 전부 넣어 브라우저 계산이 학습과 같게
Creg = float(A[A.index('--C') + 1]) if '--C' in A else 1.0
d = json.loads((ROOT / 'rough' / 'db' / 'db.json').read_text()); t = d['컷표']; c = t['columns']; I = c.index
rows = [r for r in t['rows'] if r[I('유형')] == '그림']
ids = [r[I('컷ID')] for r in rows]

def norm(s):  # 엔진 컷 글과 같은 모양으로: 원문자 번호·따옴표 종류 정리
    s = str(s or ''); s = re.sub(r'[①-⑳]', ' ', s); s = s.replace('“', '"').replace('”', '"')
    return re.sub(r'\s+', ' ', s).strip()
text = [norm(r[I('내용')]) for r in rows]
emo = np.array([r[I('감정')] for r in rows]); inten = np.array([int(r[I('강도')] or 1) for r in rows])
work = np.array([i[:2] for i in ids]); ep = [i[:5] for i in ids]
prev = [text[k - 1] if k and ep[k - 1] == ep[k] else '' for k in range(len(ids))]
nxt = [text[k + 1] if k + 1 < len(ids) and ep[k + 1] == ep[k] else '' for k in range(len(ids))]

def vecs(fit_idx):
    v = TfidfVectorizer(analyzer='char_wb', ngram_range=(1, 3), min_df=3, sublinear_tf=True, max_features=TOP)
    v.fit([text[k] for k in fit_idx])
    f = lambda L: v.transform(L)
    return v, lambda idx: sparse.hstack([f([text[k] for k in idx]), 0.5 * f([prev[k] for k in idx]), 0.5 * f([nxt[k] for k in idx])]).tocsr()

def lowo(y, name):
    pred = np.empty_like(y)
    for w in sorted(set(work)):
        tr = np.where(work != w)[0]; te = np.where(work == w)[0]
        v, F = vecs(tr); m = LogisticRegression(C=Creg, max_iter=3000).fit(F(tr), y[tr]); pred[te] = m.predict(F(te))
    out = {'정확도': round(float((pred == y).mean()), 3), '가장 흔한 값': round(Cn.Counter(y).most_common(1)[0][1] / len(y), 3),
           'macro-F1': round(float(f1_score(y, pred, average='macro')), 3), 'kappa': round(float(cohen_kappa_score(y, pred)), 3)}
    if name == '강도': out['MAE'] = round(float(np.abs(pred.astype(int) - y.astype(int)).mean()), 3)
    print(name, json.dumps(out, ensure_ascii=False)); return out, pred

if __name__ == '__main__':
    r1, p1 = lowo(emo, '감정'); r2, p2 = lowo(inten, '강도')
    if '--preds' in A:
        pathlib.Path(A[A.index('--preds') + 1]).write_text(json.dumps({i: {'emo': str(e), 'i': int(k)} for i, e, k in zip(ids, p1, p2)}, ensure_ascii=False))
    if '--export' in A:
        allidx = np.arange(len(ids)); v, F = vecs(allidx); X = F(allidx); voc = v.get_feature_names_out(); nv = len(voc)
        heads = {}
        for name, y in (('emo', emo), ('int', inten)):
            m = LogisticRegression(C=Creg, max_iter=4000).fit(X, y); W = m.coef_  # (클래스, 3*nv): 이 컷 · 앞 컷 · 뒤 컷
            heads[name] = {'classes': [str(k) for k in m.classes_], 'b': np.round(m.intercept_, 3).tolist(), 'W': [np.round(W[:, s * nv:(s + 1) * nv], 2).tolist() for s in range(3)]}
        meta = {'kind': "char_wb 1-3gram, tf 1+log, idf, l2 + logistic(multinomial)", 'vocab': nv, 'C': Creg, 'ctx': 0.5,
                'eval': {'감정': r1, '강도': r2}, 'revision': d.get('__meta', {}).get('revision'), 'cuts': len(ids)}
        # 브라우저 계산 확인용: 앞 60컷의 (글·앞 글·뒤 글)과 이 모델(반올림 전) 예측
        ms = {n: LogisticRegression(C=Creg, max_iter=4000).fit(X, y) for n, y in (('emo', emo), ('int', inten))}
        chk = [{'t': text[k], 'p': prev[k], 'n': nxt[k], 'emo': str(ms['emo'].predict(X[k])[0]), 'int': int(ms['int'].predict(X[k])[0])} for k in range(60)]
        model = {'meta': meta, 'vocab': list(voc), 'idf': np.round(v.idf_, 4).tolist(), **heads, 'check': chk}
        js = ('/* 자동 생성: tools/ml/train_ngram.py — 컷 글(+앞뒤 컷)로 감정·강도를 매기는 가벼운 모델. 손으로 고치지 마세요. */\n'
              '(function (M) { Object.assign(M, ' + json.dumps(model, ensure_ascii=False, separators=(',', ':')) + '); })'
              "(typeof module !== 'undefined' ? module.exports : (window.RoughFeel = {}));\n")
        p = ROOT / 'rough' / 'feel-model.js'; p.write_text(js); print('저장', p, round(len(js.encode()) / 1024), 'KB')
