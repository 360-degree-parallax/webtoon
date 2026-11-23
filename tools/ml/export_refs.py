"""B. 레퍼런스 고르기용 글 색인: 레퍼런스 후보 컷(fit=ok)마다 글 TF-IDF 상위 K개 조각(다시 l2 정규화)을 rough/ref-text.js로.
엔진 suggestRef = 꼬리표 점수 + LAM × 글 코사인. 평가는 tools/ml/eval_refs.py(꼬리표만 CLIP 0.737 → 꼬리표+글 0.754, 지금 패턴 컷 0.722)
사용: python3 tools/ml/export_refs.py [--k 40] [--eval]
"""
import sys, json, re, pathlib, numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import eval_refs as E
A = sys.argv[1:]; K = int(A[A.index('--k') + 1]) if '--k' in A else 40; LAM = 4.0; TOP = 8000

def topk(X, k):
    X = X.tocsr().copy()
    for r in range(X.shape[0]):
        s, e = X.indptr[r], X.indptr[r + 1]
        if e - s > k:
            d = X.data[s:e]; cut = np.sort(np.abs(d))[-k]; d[np.abs(d) < cut] = 0
        n = np.sqrt((X.data[s:e] ** 2).sum()) or 1; X.data[s:e] /= n
    X.eliminate_zeros(); return X

def evaluate(k):
    cl, dn, sh = [], [], []
    for w in sorted(set(E.work)):
        te = np.where(E.work == w)[0]; cand = np.where((E.work != w) & E.refok)[0]
        v = TfidfVectorizer(analyzer='char_wb', ngram_range=(1, 3), min_df=2, sublinear_tf=True, max_features=TOP).fit([E.text[j] for j in np.where(E.work != w)[0]])
        Tc = topk(v.transform([E.text[j] for j in cand]), k) if k else v.transform([E.text[j] for j in cand]); S = (v.transform([E.text[j] for j in te]) @ Tc.T).toarray()
        for qi, q_ in enumerate(te):
            q = {'shot': E.PS[E.ids[q_]]['shot'], 'ang': '아이레벨', 'role': E.PS[E.ids[q_]]['role'], 'emo': E.PF[E.ids[q_]]['emo']}
            sc = np.array([E.tag_score(q, j) for j in cand]) + LAM * S[qi]; j = cand[int(sc.argmax())]
            cl.append(float(E.CLIP[j] @ E.CLIP[q_])); dn.append(float(E.DINO[j] @ E.DINO[q_])); sh.append(E.rshot[j] == E.truth_shot[q_])
    return round(np.mean(cl), 4), round(np.mean(dn), 4), round(float(np.mean(sh)), 4)

if __name__ == '__main__':
    if '--eval' in A:
        for k in (0, 20, 40, 80): print('K', k or '전부', evaluate(k), flush=True)
        sys.exit()
    idx = np.where(E.refok)[0]
    v = TfidfVectorizer(analyzer='char_wb', ngram_range=(1, 3), min_df=2, sublinear_tf=True, max_features=TOP).fit(E.text)
    X = topk(v.transform([E.text[j] for j in idx]), K)
    refs = {E.ids[j]: [x for t in range(X.indptr[r], X.indptr[r + 1]) for x in (int(X.indices[t]), round(float(X.data[t]), 3))] for r, j in enumerate(idx)}
    model = {'meta': {'k': K, 'lam': LAM, 'refs': len(refs), 'vocab': len(v.vocabulary_)}, 'vocab': list(v.get_feature_names_out()), 'idf': np.round(v.idf_, 4).tolist(), 'refs': refs}
    js = ('/* 자동 생성: tools/ml/export_refs.py — 레퍼런스 컷 글 색인(글 유사도로 레퍼런스 고르기). 손으로 고치지 마세요. */\n'
          '(function (M) { Object.assign(M, ' + json.dumps(model, ensure_ascii=False, separators=(',', ':')) + '); })'
          "(typeof module !== 'undefined' ? module.exports : (window.RoughRefText = {}));\n")
    p = E.ROOT / 'rough/ref-text.js'; p.write_text(js); print('저장', p, round(len(js.encode()) / 1024), 'KB')
