"""C. 앵글: 아이레벨 91% 쏠림. 엔진 규칙(감정→로우/하이)은 로우 정밀도 4.5%, 하이 7.4%로 오히려 틀린 앵글을 넣음.
글 모델로 하이·로우를 '확신할 때만' 고르게 하고(문턱), 정밀도·재현율로 평가. 한 작품 빼고.
사용: python3 tools/ml/train_angle.py [--export]   (--export: rough/angle-model.js, 문턱 포함)
"""
import sys, json, re, pathlib, collections, warnings
import numpy as np
from scipy import sparse
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
warnings.filterwarnings('ignore')
ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/ml')); import weights as WT
A = sys.argv[1:]
d = json.loads((ROOT / 'rough/db/db.json').read_text()); t = d['컷표']; c = t['columns']; I = c.index
rows = [r for r in t['rows'] if r[I('유형')] == '그림']; ids = [r[I('컷ID')] for r in rows]
norm = lambda s: re.sub(r'\s+', ' ', re.sub(r'[①-⑳]', ' ', str(s or '')).replace('“', '"').replace('”', '"')).strip()
text = [norm(r[I('내용')]) for r in rows]
work = np.array([i[:2] for i in ids]); ep = [i[:5] for i in ids]
prev = [text[k - 1] if k and ep[k - 1] == ep[k] else '' for k in range(len(ids))]
nxt = [text[k + 1] if k + 1 < len(ids) and ep[k + 1] == ep[k] else '' for k in range(len(ids))]
y = np.array([{'탑뷰': '하이앵글'}.get(r[I('앵글')], r[I('앵글')]) for r in rows])  # 탑뷰 12컷은 하이로 합쳐 학습
C = float(A[A.index('--C') + 1]) if '--C' in A else 1.0

def vecs(fit_idx, ctx=0.3):
    v = TfidfVectorizer(analyzer='char_wb', ngram_range=(1, 3), min_df=3, sublinear_tf=True, max_features=4000).fit([text[k] for k in fit_idx])
    f = v.transform
    return v, lambda idx: sparse.hstack([f([text[k] for k in idx]), ctx * f([prev[k] for k in idx]), ctx * f([nxt[k] for k in idx])]).tocsr()

def lowo_proba(cw='balanced'):
    P = np.zeros((len(y), 3)); cls = ['로우앵글', '아이레벨', '하이앵글']; sw = WT.sample_weights(ids, '앵글', y)
    for w in sorted(set(work)):
        tr = np.where(work != w)[0]; te = np.where(work == w)[0]; v, F = vecs(tr)
        m = LogisticRegression(C=C, max_iter=3000, class_weight=cw).fit(F(tr), y[tr], sample_weight=sw[tr])
        m.coef_[np.abs(m.coef_) < 0.2] = 0  # 내보내는 모델과 같게 가지치기한 채로 평가
        P[np.ix_(te, [cls.index(k) for k in m.classes_])] = m.predict_proba(F(te))
    return cls, P

def at(P, cls, th):
    pred = np.array(['아이레벨'] * len(y), dtype=object)
    for j, name in enumerate(cls):
        if name == '아이레벨': continue
        pick = (P[:, j] >= th) & (P[:, j] == P.max(1)); pred[pick] = name
    out = {'정확도': round(float((pred == y).mean()), 4)}
    for name in ('로우앵글', '하이앵글'):
        tp = int(((pred == name) & (y == name)).sum()); pp = int((pred == name).sum()); ap = int((y == name).sum())
        out[name] = {'고른 수': pp, '정밀도': round(tp / pp, 3) if pp else None, '재현율': round(tp / ap, 3)}
    return out

if __name__ == '__main__':
    print('항상 아이레벨', round(float((y == '아이레벨').mean()), 4))
    cls, P = lowo_proba()
    for th in (0.5, 0.6, 0.7, 0.8, 0.9):
        print('문턱', th, json.dumps(at(P, cls, th), ensure_ascii=False), flush=True)
    if '--export' in A:
        TH = float(A[A.index('--th') + 1]) if '--th' in A else 0.8
        allidx = np.arange(len(ids)); v, F = vecs(allidx); X = F(allidx); nv = len(v.vocabulary_)
        m = LogisticRegression(C=C, max_iter=4000, class_weight='balanced').fit(X, y, sample_weight=WT.sample_weights(ids, '앵글', y))
        m.coef_[np.abs(m.coef_) < 0.2] = 0; W = np.round(m.coef_, 2)
        sp = lambda row: [x for k in np.nonzero(row)[0] for x in (int(k), float(row[k]))]
        ev = at(P, cls, TH)
        P2 = m.predict_proba(X[:200]); chk = []
        for row in P2:
            k = int(row.argmax()); chk.append(m.classes_[k] if m.classes_[k] != '아이레벨' and row[k] >= TH else '아이레벨')
        model = {'meta': {'kind': 'char_wb 1-3gram, tf 1+log, idf, l2 + logistic(balanced), 문턱 넘을 때만 하이·로우', 'C': C, 'ctx': 0.3, 'th': TH, 'eval': ev, '항상 아이레벨': round(float((y == '아이레벨').mean()), 4)},
                 'vocab': list(v.get_feature_names_out()), 'idf': np.round(v.idf_, 4).tolist(),
                 'ang': {'classes': list(m.classes_), 'b': np.round(m.intercept_, 3).tolist(), 'S': [[sp(W[c, s * nv:(s + 1) * nv]) for c in range(W.shape[0])] for s in range(3)]},
                 'check': chk, 'checkText': [[text[k], prev[k], nxt[k]] for k in range(200)]}
        js = ('/* 자동 생성: tools/ml/train_angle.py — 컷 글로 하이·로우 앵글을 확신할 때만 고르는 모델. 손으로 고치지 마세요. */\n'
              '(function (M) { Object.assign(M, ' + json.dumps(model, ensure_ascii=False, separators=(',', ':')) + '); })'
              "(typeof module !== 'undefined' ? module.exports : (window.RoughAngle = {}));\n")
        p = ROOT / 'rough/angle-model.js'; p.write_text(js); print('저장', p, round(len(js.encode()) / 1024), 'KB')
