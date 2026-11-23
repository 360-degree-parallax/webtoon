"""A. 묶음 판정(서사 형태·감정 곡선·연출 목적·템포·거리 흐름·주된 컷 전환) 모델. 한 작품 빼고 평가.
특징: 묶음 글 글자 n-그램 + 컷 모델 예측 흐름(샷 거리·강도·감정·역할, 모두 한 작품 빼고 만든 예측) + 인물·대사 변화.
엔진 규칙 판정과 '가장 흔한 값'과 비교. --export면 rough/bundle-model.js
사용: python3 tools/ml/train_bundle.py [--export]
"""
import sys, json, re, pathlib, collections, warnings
import numpy as np
from scipy import sparse
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.feature_extraction import DictVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import cohen_kappa_score
warnings.filterwarnings('ignore')
ROOT = pathlib.Path(__file__).resolve().parents[2]
A = sys.argv[1:]
d = json.loads((ROOT / 'rough/db/db.json').read_text()); rh = d['5컷 리듬']; rc = rh['columns']
LAB = {r[rc.index('묶음')]: r for r in rh['rows']}
FIELDS = {'narr': '서사 형태', 'curve': '감정 곡선', 'goal': '연출 목적', 'tempo': '템포', 'dist': '거리 흐름', 'trans': '주된 컷 전환'}
B = [b for b in json.load(open(ROOT / 'tools/ml/cache/bundles.json')) if b['g'] in LAB]
PS = json.load(open(ROOT / 'tools/ml/cache/preds-shot.json')); PF = json.load(open(ROOT / 'tools/ml/cache/preds-ngram.json'))
RANK = {'설정': 0, '전경': 1, '전신': 2, '중경': 3, '클로즈업': 4, '디테일': 5, '효과 배경': 2.5}
plain = lambda s: re.sub(r'\s+', ' ', re.sub(r'\{[^{}\n]*\}', ' ', str(s or '')).replace('@', '').replace('“', '"').replace('”', '"')).strip()
text = [' '.join(plain(x['text']) for x in b['beats']) for b in B]
work = np.array([b['work'] for b in B])

def seq_feats(shots, ints, emos, roles, beats):
    """컷 예측 흐름 → 특징. 브라우저(엔진 bundleFeats)와 같아야 함"""
    n = len(shots); f = {'n': n / 5}
    r = [RANK.get(s, 3) for s in shots]
    f['r_first'] = r[0] / 5; f['r_last'] = r[-1] / 5; f['r_mean'] = sum(r) / n / 5; f['r_range'] = (max(r) - min(r)) / 5
    f['r_slope'] = (r[-1] - r[0]) / 5; f['r_up'] = sum(1 for a, b in zip(r, r[1:]) if b > a) / max(1, n - 1); f['r_down'] = sum(1 for a, b in zip(r, r[1:]) if b < a) / max(1, n - 1)
    f['r_mid_dip'] = (min(r[1:-1]) if n > 2 else r[0]) / 5 - (r[0] + r[-1]) / 10; f['r_mid_peak'] = (max(r[1:-1]) if n > 2 else r[0]) / 5 - (r[0] + r[-1]) / 10
    for s in shots: f['shot=' + s] = f.get('shot=' + s, 0) + 1 / n
    f['first=' + shots[0]] = 1; f['last=' + shots[-1]] = 1
    i = ints; f['i_mean'] = sum(i) / n / 3; f['i_max'] = max(i) / 3; f['i_min'] = min(i) / 3; f['i_first'] = i[0] / 3; f['i_last'] = i[-1] / 3
    f['i_slope'] = (i[-1] - i[0]) / 2; f['i_peakpos'] = i.index(max(i)) / max(1, n - 1); f['i_flat'] = int(max(i) == min(i))
    f['i_up'] = sum(1 for a, b in zip(i, i[1:]) if b > a) / max(1, n - 1); f['i_down'] = sum(1 for a, b in zip(i, i[1:]) if b < a) / max(1, n - 1)
    for e in emos: f['emo=' + e] = f.get('emo=' + e, 0) + 1 / n
    f['emo_kinds'] = len(set(emos)) / n
    for ro in roles: f['role=' + ro] = f.get('role=' + ro, 0) + 1 / n
    f['role_first=' + roles[0]] = 1; f['role_last=' + roles[-1]] = 1
    who = [x['who'] for x in beats]; f['who_chg'] = sum(1 for a, b in zip(who, who[1:]) if a and b and a != b) / max(1, n - 1)
    f['who_kinds'] = len(set(w for w in who if w)) / n; f['no_who'] = sum(1 for w in who if not w) / n
    f['said'] = sum(1 for x in beats if x['said']) / n; f['said_alt'] = sum(1 for a, b in zip(beats, beats[1:]) if a['said'] and b['said'] and a['who'] != b['who']) / max(1, n - 1)
    f['cap'] = sum(x['cap'] for x in beats) / n; f['sfx'] = sum(x['sfx'] for x in beats) / n; f['len'] = sum(x['len'] for x in beats) / n / 60
    return f

def feats(b):
    cids = [t['id'] for t in b['truth']][:len(b['beats'])]
    shots = [PS.get(c, {}).get('shot', '중경') for c in cids]; roles = [PS.get(c, {}).get('role', '전개') for c in cids]
    emos = [PF.get(c, {}).get('emo', '평온') for c in cids]; ints = [int(PF.get(c, {}).get('i', 1)) for c in cids]
    return seq_feats(shots, ints, emos, roles, b['beats'][:len(cids)])
F = [feats(b) for b in B]

def run(field, C=1.0, tw=1.0, top=3000, use_text=True, use_seq=True):
    y = np.array([LAB[b['g']][rc.index(FIELDS[field])] or '' for b in B]); ok = y != ''
    pred = np.array([''] * len(y), dtype=object)
    for w in sorted(set(work)):
        tr = np.where((work != w) & ok)[0]; te = np.where((work == w) & ok)[0]; parts_tr, parts_te = [], []
        if use_text:
            v = TfidfVectorizer(analyzer='char_wb', ngram_range=(1, 3), min_df=3, sublinear_tf=True, max_features=top).fit([text[k] for k in tr])
            parts_tr.append(tw * v.transform([text[k] for k in tr])); parts_te.append(tw * v.transform([text[k] for k in te]))
        if use_seq:
            dv = DictVectorizer().fit([F[k] for k in tr]); parts_tr.append(dv.transform([F[k] for k in tr])); parts_te.append(dv.transform([F[k] for k in te]))
        m = LogisticRegression(C=C, max_iter=4000).fit(sparse.hstack(parts_tr).tocsr(), y[tr]); pred[te] = m.predict(sparse.hstack(parts_te).tocsr())
    yy, pp = y[ok], pred[ok]
    eng = np.array([b['an'][field] for b in B])[ok]
    return {'모델': round(float((pp == yy).mean()), 3), 'κ': round(float(cohen_kappa_score(yy, pp)), 3), '엔진': round(float((eng == yy).mean()), 3),
            '가장 흔한 값': round(collections.Counter(yy).most_common(1)[0][1] / len(yy), 3), 'n': int(ok.sum())}

if __name__ == '__main__' and '--export' not in A:
    for f in FIELDS:
        res = {}
        for cfg in ({'use_text': False}, {'use_seq': False}, {}, {'C': 0.3}, {'C': 3}, {'tw': 0.5}, {'tw': 2}):
            res[json.dumps(cfg)] = run(f, **cfg)
        best = max(res.items(), key=lambda kv: kv[1]['모델'])
        print(FIELDS[f], json.dumps({k: v['모델'] for k, v in res.items()}), '최선', best[0], best[1], flush=True)

# ---------- 내보내기: 엔진보다 정보(κ)가 확실히 많은 항목만(서사 형태·감정 곡선은 엔진 규칙이 나음) ----------
USE = {'goal': {'use_seq': False, 'C': 1.0}, 'tempo': {'C': 0.3}, 'dist': {'C': 0.3}, 'trans': {'use_seq': False, 'C': 1.0}}
PRUNE = 0.05
def fit_field(field, idx, cfg, v):
    y = np.array([LAB[B[k]['g']][rc.index(FIELDS[field])] or '' for k in idx]); keep = y != ''; idx = np.array(idx)[keep]; y = y[keep]
    parts = [cfg.get('tw', 1.0) * v.transform([text[k] for k in idx])]; dv = None
    if cfg.get('use_seq', True): dv = DictVectorizer().fit([F[k] for k in idx]); parts.append(dv.transform([F[k] for k in idx]))
    m = LogisticRegression(C=cfg.get('C', 1.0), max_iter=4000).fit(sparse.hstack(parts).tocsr(), y)
    m.coef_[np.abs(m.coef_) < PRUNE] = 0
    return m, dv
def predict_field(m, dv, v, cfg, idx):
    parts = [cfg.get('tw', 1.0) * v.transform([text[k] for k in idx])]
    if dv is not None: parts.append(dv.transform([F[k] for k in idx]))
    return m.predict(sparse.hstack(parts).tocsr())
if '--export' in A:
    res = {}
    for field, cfg in USE.items():  # 내보낼 설정 그대로(가지치기 포함) 한 작품 빼고 다시 평가
        y = np.array([LAB[b['g']][rc.index(FIELDS[field])] or '' for b in B]); pred = np.array([''] * len(B), dtype=object)
        for w in sorted(set(work)):
            tr = list(np.where(work != w)[0]); te = list(np.where(work == w)[0])
            v = TfidfVectorizer(analyzer='char_wb', ngram_range=(1, 3), min_df=3, sublinear_tf=True, max_features=3000).fit([text[k] for k in tr])
            m, dv = fit_field(field, tr, cfg, v); pred[te] = predict_field(m, dv, v, cfg, te)
        ok = y != ''; eng = np.array([b['an'][field] for b in B])
        res[field] = {'모델': round(float((pred[ok] == y[ok]).mean()), 3), 'κ': round(float(cohen_kappa_score(y[ok], pred[ok])), 3), '엔진': round(float((eng[ok] == y[ok]).mean()), 3), '가장 흔한 값': round(collections.Counter(y[ok]).most_common(1)[0][1] / ok.sum(), 3)}
        print(FIELDS[field], res[field], flush=True)
    allidx = list(range(len(B))); v = TfidfVectorizer(analyzer='char_wb', ngram_range=(1, 3), min_df=3, sublinear_tf=True, max_features=3000).fit(text); nv = len(v.vocabulary_)
    fields = {}; chk = {}
    for field, cfg in USE.items():
        m, dv = fit_field(field, allidx, cfg, v); W = np.round(m.coef_, 3)
        Wt = W[:, :nv]; Wf = W[:, nv:] if dv is not None else None
        fields[field] = {'classes': [str(c) for c in m.classes_], 'b': np.round(m.intercept_, 3).tolist(), 'tw': cfg.get('tw', 1.0),
                         'St': [[x for k in np.nonzero(r)[0] for x in (int(k), float(r[k]))] for r in Wt],
                         'Wf': [{n: float(w) for n, w in zip(dv.feature_names_, r) if w} for r in Wf] if Wf is not None else [{} for _ in m.classes_]}
        chk[field] = [str(x) for x in predict_field(m, dv, v, cfg, allidx[:60])]
    model = {'meta': {'kind': '묶음 글 char_wb 1-3gram + 컷 예측 흐름 특징 → logistic', 'eval': res, 'fields_kept_by_engine': ['narr', 'curve'], 'bundles': len(B)},
             'vocab': list(v.get_feature_names_out()), 'idf': np.round(v.idf_, 4).tolist(), 'fields': fields, 'check': chk}
    js = ('/* 자동 생성: tools/ml/train_bundle.py — 묶음 판정(연출 목적·템포·거리 흐름·주된 컷 전환) 모델. 손으로 고치지 마세요. */\n'
          '(function (M) { Object.assign(M, ' + json.dumps(model, ensure_ascii=False, separators=(',', ':')) + '); })'
          "(typeof module !== 'undefined' ? module.exports : (window.RoughBundle = {}));\n")
    p = ROOT / 'rough/bundle-model.js'; p.write_text(js); print('저장', p, round(len(js.encode()) / 1024), 'KB')
