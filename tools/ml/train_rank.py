"""① 연출명(패턴) 추천: 묶음 글(컷 글 이어 붙임) → 연출명 확률. 글자 1~3그램 TF-IDF + 로지스틱 회귀, 한 작품 빼고 평가.
엔진은 '연출명 확률 순'으로 고르고, 같은 연출명 안에서는 기존 규칙 점수로 가장 닮은 패턴을 고름(대안은 연출명이 겹치지 않게).
엔진 해석 특징(서사 형태·VNG 등)을 더하면 오히려 떨어져서(과적합) 글만 씀. E5 임베딩은 21%/48%로 조금 낫지만 브라우저에 못 넣음.
사용: python3 tools/ml/train_rank.py [--C 0.5] [--top 3000] [--export]
"""
import json, re, sys, pathlib, collections, warnings
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer
warnings.filterwarnings('ignore')
ROOT = pathlib.Path(__file__).resolve().parents[2]
A = sys.argv[1:]
C = float(A[A.index('--C') + 1]) if '--C' in A else 0.5
TOP = int(A[A.index('--top') + 1]) if '--top' in A else 3000
B = [b for b in json.load(open(ROOT / 'tools/ml/cache/bundles.json')) if b['name']]

def plain(s):  # 엔진 rankText와 같게: {연출} 빼고 @ 빼고 줄바꿈·공백 정리
    s = re.sub(r'\{[^{}\n]*\}', ' ', str(s or '')).replace('@', '').replace('“', '"').replace('”', '"')
    return re.sub(r'\s+', ' ', s).strip()
text = [' '.join(plain(x['text']) for x in b['beats']) for b in B]
y = np.array([b['name'] for b in B]); work = np.array([b['work'] for b in B])
vec = lambda: TfidfVectorizer(analyzer='char_wb', ngram_range=(1, 3), min_df=3, sublinear_tf=True, max_features=TOP)

def lowo():
    h1 = h3 = 0
    for w in sorted(set(work)):
        tr = np.where(work != w)[0]; te = np.where(work == w)[0]
        v = vec().fit([text[k] for k in tr]); m = LogisticRegression(C=C, max_iter=3000).fit(v.transform([text[k] for k in tr]), y[tr])
        P = m.predict_proba(v.transform([text[k] for k in te]))
        for k, p in zip(te, P):
            o = m.classes_[np.argsort(-p)]; h1 += o[0] == y[k]; h3 += y[k] in o[:3]
    return round(h1 / len(y), 3), round(h3 / len(y), 3)

def rule():
    h1 = h3 = 0
    for b in B:
        names = [r['name'] for r in b['ranked'][:3]]; h1 += names[0] == b['name']; h3 += b['name'] in names
    return round(h1 / len(B), 3), round(h3 / len(B), 3)

def freq():
    h1 = h3 = 0
    for w in sorted(set(work)):
        o = [n for n, _ in collections.Counter(y[work != w]).most_common()]
        for k in np.where(work == w)[0]: h1 += o[0] == y[k]; h3 += y[k] in o[:3]
    return round(h1 / len(y), 3), round(h3 / len(y), 3)

if __name__ == '__main__':
    ev = {'모델': lowo(), '규칙 엔진': rule(), '빈도만': freq()}
    print(json.dumps(ev, ensure_ascii=False))
    if '--export' in A:
        v = vec().fit(text); m = LogisticRegression(C=C, max_iter=4000).fit(v.transform(text), y)
        model = {'meta': {'kind': 'char_wb 1-3gram, tf 1+log, idf, l2 + logistic(multinomial)', 'C': C, 'vocab': len(v.vocabulary_), 'bundles': len(B),
                          'eval': {k: {'1위': a, '3위 안': b} for k, (a, b) in ev.items()}},
                 'vocab': list(v.get_feature_names_out()), 'idf': np.round(v.idf_, 4).tolist(), 'classes': list(m.classes_),
                 'b': np.round(m.intercept_, 3).tolist(), 'W': np.round(m.coef_, 3).tolist(),
                 'check': [{'t': text[k], 'top': str(m.predict(v.transform([text[k]]))[0])} for k in range(0, len(text), 37)]}
        js = ('/* 자동 생성: tools/ml/train_rank.py — 씬 글로 연출명(패턴 종류) 확률을 매기는 가벼운 모델. 손으로 고치지 마세요. */\n'
              '(function (M) { Object.assign(M, ' + json.dumps(model, ensure_ascii=False, separators=(',', ':')) + '); })'
              "(typeof module !== 'undefined' ? module.exports : (window.RoughRank = {}));\n")
        p = ROOT / 'rough' / 'rank-model.js'; p.write_text(js); print('저장', p, round(len(js.encode()) / 1024), 'KB')
