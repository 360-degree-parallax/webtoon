"""B. 레퍼런스 고르기 평가: 컷 글로 고른 레퍼런스 그림이 실제 그 컷 그림과 얼마나 닮았나.
정답: DB 컷 그림(자기 자신). 후보: 다른 작품의 레퍼런스(fit=ok) 컷만(한 작품 빼기).
지표: 실제 컷 그림과 고른 레퍼런스의 CLIP·DINOv2 코사인 유사도(무작위 후보 평균 대비), 샷 일치
방법:
  tag   — 지금 엔진 suggestRef의 꼬리표 점수(샷·앵글·역할·감정, 같은 작품 가산 없음)
  text  — 컷 글 TF-IDF 코사인 상위
  mix   — 꼬리표 점수 + λ·글 코사인
샷·역할은 한 작품 빼고 만든 모델 예측(preds-shot), 감정은 preds-ngram을 씀(툴과 같은 조건)
사용: python3 tools/ml/eval_refs.py
"""
import json, re, pathlib, collections, warnings
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
warnings.filterwarnings('ignore')
ROOT = pathlib.Path(__file__).resolve().parents[2]
d = json.loads((ROOT / 'rough/db/db.json').read_text()); t = d['컷표']; c = t['columns']; I = c.index
rows = [r for r in t['rows'] if r[I('유형')] == '그림']; ids = [r[I('컷ID')] for r in rows]; pos = {k: i for i, k in enumerate(ids)}
norm = lambda s: re.sub(r'\s+', ' ', re.sub(r'[①-⑳]', ' ', str(s or '')).replace('“', '"').replace('”', '"')).strip()
text = [norm(r[I('내용')]) for r in rows]
ix = json.loads((ROOT / 'rough/cuts/index.min.json').read_text()); col = ix['cols']
meta = {r[0]: dict(zip(col, r)) for r in ix['rows']}
refok = np.array([meta.get(k, {}).get('fit') == 'ok' or bool(meta.get(k, {}).get('fixed')) for k in ids])
PS = json.loads((ROOT / 'tools/ml/cache/preds-shot.json').read_text()); PF = json.loads((ROOT / 'tools/ml/cache/preds-ngram.json').read_text())
work = np.array([k[:2] for k in ids])
def emb(name):
    z = np.load(ROOT / f'tools/ml/cache/img-{name}.npz', allow_pickle=True); m = dict(zip(z['ids'], z['X']))
    X = np.array([m[k] for k in ids], dtype=np.float32); return X / np.linalg.norm(X, axis=1, keepdims=True)
CLIP, DINO = emb('clip'), emb('dino')
RANKS = {'설정': 0, '전경': 1, '전신': 2, '중경': 3, '클로즈업': 4, '디테일': 5}
rshot = [meta.get(k, {}).get('shot') for k in ids]; rang = [meta.get(k, {}).get('angle') for k in ids]; rrole = [meta.get(k, {}).get('role') for k in ids]; remo = [meta.get(k, {}).get('emotion') for k in ids]
truth_shot = [r[I('샷')] for r in rows]

def tag_score(q, j):  # rough/engine.js suggestRef와 같은 점수(작품 가산 제외)
    s = 0
    if rshot[j] == q['shot']: s += 2
    elif rshot[j] in RANKS and q['shot'] in RANKS and abs(RANKS[rshot[j]] - RANKS[q['shot']]) == 1: s += 0.8
    if rang[j] == q['ang']: s += 1
    if rrole[j] == q['role']: s += 0.3
    if remo[j] == q['emo']: s += 0.2
    return s

def evaluate(lams=(0, 0.5, 1, 2, 4, 8)):
    out = collections.defaultdict(lambda: collections.defaultdict(list))
    for w in sorted(set(work)):
        te = np.where(work == w)[0]; cand = np.where((work != w) & refok)[0]
        v = TfidfVectorizer(analyzer='char_wb', ngram_range=(1, 3), min_df=2, sublinear_tf=True).fit([text[k] for k in np.where(work != w)[0]])
        Tc = v.transform([text[k] for k in cand]); Tq = v.transform([text[k] for k in te]); S = (Tq @ Tc.T).toarray()
        for qi, k in enumerate(te):
            q = {'shot': PS[ids[k]]['shot'], 'ang': '아이레벨', 'role': PS[ids[k]]['role'], 'emo': PF[ids[k]]['emo']}
            tags = np.array([tag_score(q, j) for j in cand])
            rnd = cand  # 무작위 기준: 후보 전체 평균
            out['무작위']['clip'].append(float((CLIP[rnd] @ CLIP[k]).mean())); out['무작위']['dino'].append(float((DINO[rnd] @ DINO[k]).mean()))
            out['무작위']['shot'].append(float(np.mean([rshot[j] == truth_shot[k] for j in rnd])))
            for lam in lams:
                sc = tags + lam * S[qi] + 1e-6 * np.random.RandomState(k).rand(len(cand))  # 동점은 무작위
                j = cand[int(sc.argmax())]; name = '꼬리표만' if lam == 0 else f'꼬리표+글×{lam:g}'
                out[name]['clip'].append(float(CLIP[j] @ CLIP[k])); out[name]['dino'].append(float(DINO[j] @ DINO[k])); out[name]['shot'].append(float(rshot[j] == truth_shot[k]))
            j = cand[int(S[qi].argmax())]
            out['글만']['clip'].append(float(CLIP[j] @ CLIP[k])); out['글만']['dino'].append(float(DINO[j] @ DINO[k])); out['글만']['shot'].append(float(rshot[j] == truth_shot[k]))
            # 상한: 그림으로 가장 닮은 후보(그림을 볼 수 있다면)
            j = cand[int((CLIP[cand] @ CLIP[k]).argmax())]; out['상한(그림으로 고름)']['clip'].append(float(CLIP[j] @ CLIP[k])); out['상한(그림으로 고름)']['dino'].append(float(DINO[j] @ DINO[k])); out['상한(그림으로 고름)']['shot'].append(float(rshot[j] == truth_shot[k]))
    return {n: {m: round(float(np.mean(v)), 4) for m, v in r.items()} for n, r in out.items()}

if __name__ == '__main__':
    print(json.dumps(evaluate(), ensure_ascii=False, indent=1))
