#!/usr/bin/env python3
"""레퍼런스 고르기에 컷 메타를 더하면 나아지나: eval_refs.py와 같은 조건(한 작품 빼기, 지금 엔진 점수 = 꼬리표 + 글×4)에
 + β·(sp−0.5): 그림+메타 모델이 이 레퍼런스의 샷 라벨을 믿는 정도(라벨이 의심스러운 레퍼런스는 덜 고름)
 + γ·[인물 수 일치]: 질문 컷의 인물 수(실제 툴에선 컷 글의 @이름 수; 여기선 그 컷의 검출 머리 수로 근사)와 레퍼런스 머리 수가 같으면"""
import sys, json, pathlib, numpy as np, collections
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / 'ml')); import eval_refs as R
from sklearn.feature_extraction.text import TfidfVectorizer
sp = np.array([R.meta.get(k, {}).get('sp', .5) for k in R.ids]); npc = np.array([min(R.meta.get(k, {}).get('np', 0), 3) for k in R.ids])
def run(beta, gamma, lam=4):
    out = collections.defaultdict(list)
    for w in sorted(set(R.work)):
        te = np.where(R.work == w)[0]; cand = np.where((R.work != w) & R.refok)[0]
        v = TfidfVectorizer(analyzer='char_wb', ngram_range=(1, 3), min_df=2, sublinear_tf=True).fit([R.text[k] for k in np.where(R.work != w)[0]])
        S = (v.transform([R.text[k] for k in te]) @ v.transform([R.text[k] for k in cand]).T).toarray()
        for qi, k in enumerate(te):
            q = {'shot': R.PS[R.ids[k]]['shot'], 'ang': '아이레벨', 'role': R.PS[R.ids[k]]['role'], 'emo': R.PF[R.ids[k]]['emo']}
            sc = np.array([R.tag_score(q, j) for j in cand]) + lam * S[qi] + beta * (sp[cand] - .5) + gamma * (npc[cand] == npc[k]) + 1e-6 * np.random.RandomState(k).rand(len(cand))
            j = cand[int(sc.argmax())]
            out['clip'].append(float(R.CLIP[j] @ R.CLIP[k])); out['dino'].append(float(R.DINO[j] @ R.DINO[k])); out['shot'].append(float(R.rshot[j] == R.truth_shot[k])); out['np'].append(float(npc[j] == npc[k]))
    return {m: round(float(np.mean(v)), 4) for m, v in out.items()}
if __name__ == '__main__':
    for b, g in ((0, 0), (.5, 0), (1, 0), (2, 0), (0, .3), (0, .6), (1, .3), (1, .6)):
        print(f'β={b} γ={g}', json.dumps(run(b, g), ensure_ascii=False), flush=True)
