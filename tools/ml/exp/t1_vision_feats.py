#!/usr/bin/env python3
"""T1 사전학습 비전 모델 특징(깊이·포즈·애니 인물 검출)을 더하면 샷·앵글이 나아지나. 한 작품 빼고(9작품) 평가.
특징 묶음: 기본(CLIP+DINO+글, PCA 128씩) / 메타(cut-meta: 인물·머리·얼굴 상자, 밝기, 선 방향) / 깊이(feat-depth) / 포즈(feat-pose)
앵글은 아이레벨 쏠림이 커서 class_weight=balanced, macro-F1과 '로우·하이 점수 상위 5%에 실제가 몇 %'로 봄
결과: docs/ml/exp/vision-feats.md
"""
import sys, json, pathlib, collections as C, numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent)); from common import *
d, row, I = db()
ids, B = matrix(['img-clip', 'img-dino', 'text-e5base'], pca=128)
meta = json.loads((ROOT / 'rough/db/cut-meta.json').read_text())['cuts']
def mf(i):
    m = meta.get(i, {}); W, H = m.get('크기', [690, 400]); out = [min(m.get(k, 0) or 0, 5) for k in ('얼굴 수', '머리 수', '인물 수', '말풍선 수')]
    for k in ('얼굴', '머리', '인물'):
        b = (m.get(k) or [None])[0]
        out += [0, 0, 0, 0, 0] if not b else [(b['x1'] - b['x0']) * (b['y1'] - b['y0']), (b['x0'] + b['x1']) / 2, (b['y0'] + b['y1']) / 2, b['y0'], (b['y1'] - b['y0']) * H / W]
    out += [m.get(k, 0) or 0 for k in ('밝기', '명암 대비', '채도', '흰 바탕', '선 밀도', '가로선', '세로선', '사선')] + [H / W]
    return out
z = lambda a: (a - a.mean(0)) / (a.std(0) + 1e-6)
Mt = z(np.array([mf(i) for i in ids], np.float32))
dep = load('feat-depth'); Dp = z(np.stack([dep[i] for i in ids]))
pz = load('feat-pose') if (CACHE / 'feat-pose.npz').exists() else None
Po = z(np.stack([pz[i] for i in ids])) if pz else None
work = np.array([i[:2] for i in ids])
def evalf(X, y, bal=False):
    classes = sorted(set(y)); P = np.zeros((len(y), len(classes)))
    for w in sorted(set(work)):
        tr, te = work != w, work == w
        m = LogisticRegression(C=0.05, max_iter=3000, class_weight='balanced' if bal else None).fit(X[tr], y[tr])
        P[np.ix_(np.where(te)[0], [classes.index(k) for k in m.classes_])] = m.predict_proba(X[te])
    pred = np.array(classes)[P.argmax(1)]; return classes, P, pred
combos = [('기본', [B]), ('기본+메타', [B, Mt]), ('기본+깊이', [B, Dp]), ('기본+메타+깊이', [B, Mt, Dp])]
if Po is not None: combos += [('기본+포즈', [B, Po]), ('기본+메타+깊이+포즈', [B, Mt, Dp, Po]), ('메타+깊이+포즈(그림 임베딩 없이)', [Mt, Dp, Po])]
L = ['# T1 사전학습 비전 특징', '', f'그림 컷 {len(ids)}개, 한 작품 빼고 9작품. 포즈 특징 {"있음" if Po is not None else "없음"}.', '',
     '| 특징 | 샷 정확도 | 샷 한 단계 차이까지 | 앵글 macro-F1 | 로우 상위5% 정밀도 | 하이 상위5% 정밀도 |', '|---|---|---|---|---|---|']
ORDER = ['설정', '전경', '전신', '중경', '클로즈업', '디테일']
ys = np.array([str(row[i][I('샷')]) for i in ids]); ya = np.array([str(row[i][I('앵글')]) for i in ids])
for name, parts in combos:
    X = np.hstack(parts); _, _, ps = evalf(X, ys)
    near = np.mean([abs(ORDER.index(a) - ORDER.index(b)) <= 1 for a, b in zip(ys, ps) if a in ORDER and b in ORDER])
    cl, P, pa = evalf(X, ya, bal=True); k = int(len(ya) * .05)
    pr = {c: (ya[np.argsort(-P[:, cl.index(c)])[:k]] == c).mean() for c in ('로우앵글', '하이앵글')}
    L.append(f'| {name} | {(ps == ys).mean():.1%} | {near:.1%} | {f1_score(ya, pa, average="macro"):.3f} | {pr["로우앵글"]:.0%} | {pr["하이앵글"]:.0%} |'); print(L[-1], flush=True)
L += ['', f'참고: 로우앵글 {(ya == "로우앵글").mean():.1%}, 하이앵글 {(ya == "하이앵글").mean():.1%}(전체 비율 = 무작위로 골랐을 때 정밀도)']
p = ROOT / 'docs/ml/exp/vision-feats.md'; p.write_text('\n'.join(L) + '\n'); print('저장', p.relative_to(ROOT))
