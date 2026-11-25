#!/usr/bin/env python3
"""T5 5컷 묶음 군집. 사람 라벨(연출명·리듬 분류)은 쓰지 않고 묶음 안 컷들의 모양만으로 묶은 뒤, 연출명과 얼마나 겹치는지 본다.
묶음 특징(앞에서부터 5자리로 맞춤): 컷 높이/폭, 뒤 여백/폭, 인물 수, 가장 큰 머리 크기, 밝기, + 묶음 평균 그림 임베딩(PCA 16)
결과: docs/ml/exp/bundle-clusters.md
"""
import sys, json, pathlib, collections as C, numpy as np
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import normalized_mutual_info_score, adjusted_rand_score, silhouette_score
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent)); from common import *
d, row, I = db()
meta = json.loads((ROOT / 'rough/db/cut-meta.json').read_text())['cuts']
emb = {**load('img-clip')}; dino = load('img-dino')
groups = C.OrderedDict()
for r in d['컷표']['rows']:
    if r[I('유형')] == '그림' and r[I('5컷묶음')]: groups.setdefault(r[I('5컷묶음')], []).append(r)
rh = d['5컷 리듬']; rc = rh['columns']; name = {r[rc.index('묶음')]: r[rc.index('연출명')] for r in rh['rows']}
def num(v):
    try: return float(v)
    except: return 0.0
def cutf(r):
    m = meta.get(r[I('컷ID')], {}); hd = m.get('머리') or m.get('heads') or []
    big = 0.0
    if isinstance(hd, list) and hd and isinstance(hd[0], dict): b = hd[0]; big = (b['x1'] - b['x0']) * (b['y1'] - b['y0'])
    st = m.get('그림', m)
    return [num(r[I('높이/폭')]), min(3, num(r[I('뒤여백/폭')])), min(3, num(m.get('인물 수', m.get('np', 0)) or 0)), big, num(st.get('밝기', 0.5) if isinstance(st, dict) else .5)]
keys, F, E = [], [], []
for g, rs in groups.items():
    if g not in name or not name[g]: continue
    seq = [cutf(r) for r in rs][:5]; seq += [seq[-1]] * (5 - len(seq))
    ids = [r[I('컷ID')] for r in rs if r[I('컷ID')] in emb]
    if not ids: continue
    keys.append(g); F.append(np.ravel(seq)); E.append(np.mean([np.concatenate([emb[i], dino[i]]) for i in ids], 0))
F = np.array(F); E = np.array(E); wk_ = np.array([k[:2] for k in keys])
# 화풍(작품) 차이를 빼려고 작품마다 평균을 뺌. --raw 면 그대로
if '--raw' not in sys.argv:
    for w in set(wk_): F[wk_ == w] -= F[wk_ == w].mean(0); E[wk_ == w] -= E[wk_ == w].mean(0)
E = PCA(16, random_state=0).fit_transform(E); X = StandardScaler().fit_transform(np.hstack([F, E]))
if '--shape' in sys.argv: X = StandardScaler().fit_transform(F)
lab = np.array([name[k] for k in keys])
res = []
for k in (10, 15, 20, 25, 30):
    km = KMeans(k, n_init=10, random_state=0).fit(X); res.append((k, silhouette_score(X, km.labels_), normalized_mutual_info_score(lab, km.labels_), adjusted_rand_score(lab, km.labels_), km))
best = max(res, key=lambda r: r[1])
rng = np.random.default_rng(0); null = np.mean([normalized_mutual_info_score(rng.permutation(lab), best[4].labels_) for _ in range(20)])
L = ['# T5 5컷 묶음 군집', '', f'묶음 {len(keys)}개 · 연출명 {len(set(lab))}종. 사람 라벨 없이 컷 모양·그림 임베딩만으로 KMeans.', '',
     '| k | 실루엣 | 연출명과 NMI | ARI |', '|---|---|---|---|'] + [f'| {k} | {s:.3f} | {n:.3f} | {a:.3f} |' for k, s, n, a, _ in res]
L += ['', f'무작위로 섞은 연출명과의 NMI(우연 수준): {null:.3f}', '', f'## 군집 내용 (k={best[0]})', '', '| 군집 | 묶음 수 | 많은 연출명(비율) | 작품 분포 | 순도 |', '|---|---|---|---|---|']
km = best[4]
for c in range(best[0]):
    m = km.labels_ == c; cn = C.Counter(lab[m]); wk = C.Counter(k[:2] for k, mm in zip(keys, m) if mm)
    top = ', '.join(f'{a} {b / m.sum():.0%}' for a, b in cn.most_common(3))
    L.append(f'| {c} | {m.sum()} | {top} | {", ".join(f"{a}{b}" for a, b in wk.most_common(4))} | {cn.most_common(1)[0][1] / m.sum():.0%} |')
cent = km.cluster_centers_[:, :25]
L += ['', '군집 중심(앞 5컷의 높이/폭 · 인물 수, 표준화 값):', '']
for c in range(best[0]):
    h = cent[c][0::5]; n = cent[c][2::5]
    L.append(f'- {c}: 높이 {" ".join(f"{v:+.1f}" for v in h)} · 인물 {" ".join(f"{v:+.1f}" for v in n)}')
from sklearn.metrics import normalized_mutual_info_score as nmi
L.insert(4, f'작품과의 NMI(k={best[0]}): {nmi(wk_, km.labels_):.3f} — 높을수록 화풍으로 묶였다는 뜻. 옵션: {" ".join(a for a in sys.argv[1:]) or "작품 평균 뺌"}'); L.insert(5, '')
p = ROOT / 'docs/ml/exp' / ('bundle-clusters' + ''.join(a.replace('--', '-') for a in sys.argv[1:]) + '.md'); p.parent.mkdir(parents=True, exist_ok=True); p.write_text('\n'.join(L) + '\n')
print('\n'.join(L[:12])); print('저장', p.relative_to(ROOT))
