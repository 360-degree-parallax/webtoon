"""컷 글(+앞뒤 컷) → 샷·역할. 글자 1~3그램 TF-IDF + 로지스틱 회귀, 한 작품 빼고 평가.
엔진 샷(패턴 컷 샷 + 규칙)은 23%로 '가장 흔한 값'(34%)보다 낮았음 → 이 모델로 바꿈.
사용: python3 tools/ml/train_shot.py [--C 2] [--export]   (--export: rough/shot-model.js)
"""
import sys, json, re, pathlib, collections, warnings
import numpy as np
from scipy import sparse
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import cohen_kappa_score, f1_score
warnings.filterwarnings('ignore')
ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/ml')); import weights as WT
A = sys.argv[1:]
C = float(A[A.index('--C') + 1]) if '--C' in A else 2.0
TOP = 4000
d = json.loads((ROOT / 'rough/db/db.json').read_text()); t = d['컷표']; c = t['columns']; I = c.index
rows = [r for r in t['rows'] if r[I('유형')] == '그림']; ids = [r[I('컷ID')] for r in rows]
norm = lambda s: re.sub(r'\s+', ' ', re.sub(r'[①-⑳]', ' ', str(s or '')).replace('“', '"').replace('”', '"')).strip()
text = [norm(r[I('내용')]) for r in rows]
work = np.array([i[:2] for i in ids]); ep = [i[:5] for i in ids]
prev = [text[k - 1] if k and ep[k - 1] == ep[k] else '' for k in range(len(ids))]
nxt = [text[k + 1] if k + 1 < len(ids) and ep[k + 1] == ep[k] else '' for k in range(len(ids))]
# 엔진이 쓰는 샷 7종으로(화면 인서트·SD는 엔진에 없음 → 가까운 값으로)
SHOT_MAP = {'화면 인서트': '디테일', 'SD': '중경'}
Y = {'샷': np.array([SHOT_MAP.get(r[I('샷')], r[I('샷')]) for r in rows]), '역할': np.array([r[I('역할')] for r in rows])}

def vecs(fit_idx):
    v = TfidfVectorizer(analyzer='char_wb', ngram_range=(1, 3), min_df=3, sublinear_tf=True, max_features=TOP).fit([text[k] for k in fit_idx])
    f = v.transform
    return v, lambda idx: sparse.hstack([f([text[k] for k in idx]), 0.5 * f([prev[k] for k in idx]), 0.5 * f([nxt[k] for k in idx])]).tocsr()

def lowo(name):
    y = Y[name]; pred = np.empty_like(y); sw = WT.sample_weights(ids, name, y)
    for w in sorted(set(work)):
        tr = np.where(work != w)[0]; te = np.where(work == w)[0]; v, F = vecs(tr)
        m = LogisticRegression(C=C, max_iter=3000).fit(F(tr), y[tr], sample_weight=sw[tr]); pred[te] = m.predict(F(te))
    out = {'정확도': round(float((pred == y).mean()), 3), '가장 흔한 값': round(collections.Counter(y).most_common(1)[0][1] / len(y), 3),
           'macro-F1': round(float(f1_score(y, pred, average='macro')), 3), 'kappa': round(float(cohen_kappa_score(y, pred)), 3)}
    if name == '샷':
        RANK = {'설정': 0, '전경': 1, '전신': 2, '중경': 3, '클로즈업': 4, '디테일': 5}
        ok = [abs(RANK[a] - RANK[b]) <= 1 for a, b in zip(pred, y) if a in RANK and b in RANK]; out['한 단계 차이까지'] = round(sum(ok) / len(ok), 3)
    return out, pred

if __name__ == '__main__':
    res = {}; preds = {}
    for name in ('샷', '역할'):
        res[name], preds[name] = lowo(name); print(name, json.dumps(res[name], ensure_ascii=False))
    if '--preds' in A:  # 한 작품 빼고 예측: 엔진 평가(eval_engine --shot-preds)용
        pathlib.Path(A[A.index('--preds') + 1]).write_text(json.dumps({i: {'shot': str(s), 'role': str(r)} for i, s, r in zip(ids, preds['샷'], preds['역할'])}, ensure_ascii=False))
    if '--export' in A:
        allidx = np.arange(len(ids)); v, F = vecs(allidx); X = F(allidx); voc = v.get_feature_names_out(); nv = len(voc); heads = {}
        for key, name in (('shot', '샷'), ('role', '역할')):
            y = Y[name]; m = LogisticRegression(C=C, max_iter=4000).fit(X, y, sample_weight=WT.sample_weights(ids, name, y)); W = m.coef_
            heads[key] = {'classes': [str(k) for k in m.classes_], 'b': np.round(m.intercept_, 3).tolist(), 'W': [np.round(W[:, s * nv:(s + 1) * nv], 2).tolist() for s in range(3)],
                          'check': [str(x) for x in m.predict(X[:40])]}
        model = {'meta': {'kind': 'char_wb 1-3gram, tf 1+log, idf, l2 + logistic(multinomial)', 'vocab': nv, 'C': C, 'ctx': 0.5, 'eval': res, 'cuts': len(ids)},
                 'vocab': list(voc), 'idf': np.round(v.idf_, 4).tolist(), **heads, 'checkText': [[text[k], prev[k], nxt[k]] for k in range(40)]}
        js = ('/* 자동 생성: tools/ml/train_shot.py — 컷 글(+앞뒤 컷)로 샷·역할을 매기는 가벼운 모델. 손으로 고치지 마세요. */\n'
              '(function (M) { Object.assign(M, ' + json.dumps(model, ensure_ascii=False, separators=(',', ':')) + '); })'
              "(typeof module !== 'undefined' ? module.exports : (window.RoughShot = {}));\n")
        p = ROOT / 'rough/shot-model.js'; p.write_text(js); print('저장', p, round(len(js.encode()) / 1024), 'KB')
