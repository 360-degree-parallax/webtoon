"""⑤ 감정 다시 정의: DB 감정 14종은 그대로 두고, 흔들림이 큰 경계를 묶은 '감정 묶음'을 만들어 학습·엔진에 씀.
- 사람끼리 일치: 14종 52%(κ 0.47) → 긍정·부정·중립 3계열 69% (36절 A6). 혼동이 많은 경계: 의아↔평온, 냉담↔평온, 의아↔긴장, 개그↔당황
- 이 스크립트: 묶음안 몇 가지를 글자 n-그램 모델로 한 작품 빼고 평가하고, 세부 감정을 '묶음 확률 × 세부 확률'로 고르면 세부 정확도가 어떻게 되는지 잼
사용: python3 tools/ml/train_emo_group.py [--export]  (--export: rough/feel-model.js에 묶음 머리 추가)
"""
import sys, json, re, pathlib, collections, warnings
import numpy as np
from scipy import sparse
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import cohen_kappa_score
warnings.filterwarnings('ignore')
ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/ml')); import weights as WT
d = json.loads((ROOT / 'rough/db/db.json').read_text()); t = d['컷표']; c = t['columns']; I = c.index
rows = [r for r in t['rows'] if r[I('유형')] == '그림']; ids = [r[I('컷ID')] for r in rows]
norm = lambda s: re.sub(r'\s+', ' ', re.sub(r'[①-⑳]', ' ', str(s or '')).replace('“', '"').replace('”', '"')).strip()
text = [norm(r[I('내용')]) for r in rows]; emo = np.array([r[I('감정')] for r in rows])
work = np.array([i[:2] for i in ids]); ep = [i[:5] for i in ids]
prev = [text[k - 1] if k and ep[k - 1] == ep[k] else '' for k in range(len(ids))]
nxt = [text[k + 1] if k + 1 < len(ids) and ep[k + 1] == ep[k] else '' for k in range(len(ids))]

SCHEMES = {
  '6묶음': {'따뜻함': ['기쁨', '설렘', '다정'], '가벼움': ['개그'], '고요함': ['평온', '회상'], '서늘함': ['냉담', '쓸쓸'], '긴장': ['긴장', '분노', '결의'], '동요': ['놀람', '당황', '의아']},
  '3계열': {'긍정': ['기쁨', '설렘', '다정', '개그'], '부정': ['긴장', '분노', '쓸쓸', '냉담', '결의'], '중립': ['평온', '회상', '의아', '놀람', '당황']},
  '8묶음': {'기쁨': ['기쁨', '개그'], '설렘': ['설렘', '다정'], '평온': ['평온', '회상'], '냉담': ['냉담'], '쓸쓸': ['쓸쓸'], '긴장': ['긴장', '결의'], '분노': ['분노'], '동요': ['놀람', '당황', '의아']},
}
def gmap(S): return {e: g for g, es in S.items() for e in es}

def vecs(fit_idx):
    v = TfidfVectorizer(analyzer='char_wb', ngram_range=(1, 3), min_df=3, sublinear_tf=True, max_features=4000).fit([text[k] for k in fit_idx])
    f = v.transform
    return v, lambda idx: sparse.hstack([f([text[k] for k in idx]), 0.5 * f([prev[k] for k in idx]), 0.5 * f([nxt[k] for k in idx])]).tocsr()

def lowo_proba(y, C=4.0):
    P = None; classes = sorted(set(y)); sw = WT.sample_weights(ids, '감정', emo)
    P = np.zeros((len(y), len(classes)))
    for w in sorted(set(work)):
        tr = np.where(work != w)[0]; te = np.where(work == w)[0]; v, F = vecs(tr)
        m = LogisticRegression(C=C, max_iter=3000).fit(F(tr), y[tr], sample_weight=sw[tr])
        P[np.ix_(te, [classes.index(k) for k in m.classes_])] = m.predict_proba(F(te))
    return classes, P

def evaluate():
    out = {}
    fc, FP = lowo_proba(emo)
    fine_pred = np.array(fc)[FP.argmax(1)]
    out['세부 14종'] = {'정확도': round(float((fine_pred == emo).mean()), 3), '가장 흔한 값': round(collections.Counter(emo).most_common(1)[0][1] / len(emo), 3), 'kappa': round(float(cohen_kappa_score(emo, fine_pred)), 3)}
    for name, S in SCHEMES.items():
        G = gmap(S); gy = np.array([G[e] for e in emo]); gc, GP = lowo_proba(gy)
        gp = np.array(gc)[GP.argmax(1)]
        # 세부 감정을 '묶음 확률^b × 세부 확률'로
        res = {'묶음 정확도': round(float((gp == gy).mean()), 3), '묶음 가장 흔한 값': round(collections.Counter(gy).most_common(1)[0][1] / len(gy), 3), '묶음 kappa': round(float(cohen_kappa_score(gy, gp)), 3),
               '세부 감정을 고른 묶음에서 뽑은 것과 같은 묶음 비율': round(float((np.array([G[e] for e in fine_pred]) == gy).mean()), 3)}
        for b in (1.0, 2.0):
            sc = FP * np.array([[GP[i, gc.index(G[f])] ** b for f in fc] for i in range(len(emo))])
            hp = np.array(fc)[sc.argmax(1)]
            res[f'세부(묶음 결합 b={b:g})'] = round(float((hp == emo).mean()), 3)
            res[f'세부의 묶음 일치(b={b:g})'] = round(float((np.array([G[e] for e in hp]) == gy).mean()), 3)
        out[name] = res
    return out

if __name__ == '__main__':
    print(json.dumps(evaluate(), ensure_ascii=False, indent=1))
