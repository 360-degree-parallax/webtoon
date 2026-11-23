"""컷 글 모델 설정 탐색(샷·역할·감정·강도). 한 작품 빼고 평가.
바꿔 보는 것: 어휘 수, 문맥(앞뒤 컷) 가중, C, 단어 n-그램 추가, 클래스 가중, 작품 내 위치(첫 컷 등)
사용: python3 tools/ml/tune_cut.py 샷 [역할 감정 강도]  → 표 출력
"""
import sys, json, re, pathlib, collections, itertools, warnings
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
text = [norm(r[I('내용')]) for r in rows]
work = np.array([i[:2] for i in ids]); ep = [i[:5] for i in ids]
prev = [text[k - 1] if k and ep[k - 1] == ep[k] else '' for k in range(len(ids))]
nxt = [text[k + 1] if k + 1 < len(ids) and ep[k + 1] == ep[k] else '' for k in range(len(ids))]
SHOT_MAP = {'화면 인서트': '디테일', 'SD': '중경'}
Y = {'샷': np.array([SHOT_MAP.get(r[I('샷')], r[I('샷')]) for r in rows]), '역할': np.array([r[I('역할')] for r in rows]),
     '감정': np.array([r[I('감정')] for r in rows]), '강도': np.array([str(r[I('강도')] or 1) for r in rows])}

def build(fit_idx, top, ctx, word, analyzer='char_wb', ng=(1, 3), wctx=True):
    vs = [TfidfVectorizer(analyzer=analyzer, ngram_range=ng, min_df=3, sublinear_tf=True, max_features=top).fit([text[k] for k in fit_idx])]
    if word: vs.append(TfidfVectorizer(analyzer='word', token_pattern=r'[가-힣A-Za-z0-9]+', ngram_range=(1, 2), min_df=2, sublinear_tf=True, max_features=word).fit([text[k] for k in fit_idx]))
    def F(idx):
        parts = []
        for j, v in enumerate(vs):
            parts += [v.transform([text[k] for k in idx])]
            if ctx and (j == 0 or wctx): parts += [ctx * v.transform([prev[k] for k in idx]), ctx * v.transform([nxt[k] for k in idx])]
        return sparse.hstack(parts).tocsr()
    return F

def run(name, top=4000, ctx=0.5, C=2.0, word=0, cw=None, analyzer='char_wb', ng=(1, 3), wctx=True):
    y = Y[name]; pred = np.empty_like(y); sw = WT.sample_weights(ids, name, y)
    for w in sorted(set(work)):
        tr = np.where(work != w)[0]; te = np.where(work == w)[0]; F = build(tr, top, ctx, word, analyzer, ng, wctx)
        m = LogisticRegression(C=C, max_iter=3000, class_weight=cw).fit(F(tr), y[tr], sample_weight=sw[tr]); pred[te] = m.predict(F(te))
    return round(float((pred == y).mean()), 4), round(float(cohen_kappa_score(y, pred)), 4)

if __name__ == '__main__' and '--combo' in sys.argv:
    name = sys.argv[sys.argv.index('--combo') + 1]
    for cfg in ({'top': 8000, 'word': 8000}, {'top': 8000, 'word': 8000, 'wctx': False}, {'top': 8000, 'word': 4000, 'wctx': False}, {'top': 15000, 'word': 0}):
        print(name, cfg, run(name, **cfg), flush=True)
    sys.exit()
if __name__ == '__main__':
    for name in sys.argv[1:] or ['샷']:
        base = dict(top=4000, ctx=0.5, C=2.0, word=0)
        print('##', name, '기준', base, run(name, **base), flush=True)
        for k, vals in (('C', [0.5, 1, 4, 8]), ('ctx', [0, 0.3, 0.8]), ('top', [2000, 8000, 15000]), ('word', [3000, 8000]), ('ng', [(1, 2), (2, 4)])):
            for v in vals:
                cfg = {**base, k: v}; print(' ', k, v, run(name, **cfg), flush=True)
