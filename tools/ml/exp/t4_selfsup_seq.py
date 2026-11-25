#!/usr/bin/env python3
"""T4 자기지도 순서 모델: 라벨 없이 '회차 = 컷이 이어지는 문장'으로 배움.
입력(컷마다): 그림 임베딩 CLIP+DINO(PCA 128씩) + 컷 높이/폭, 뒤 여백/폭. 회차마다 그림 컷 순서대로.
A. 양방향(가린 컷 맞히기): 15% 컷을 가리고 앞뒤 컷으로 그 컷 임베딩을 맞힘 → 문맥 표현
   평가: 컷 표현에 문맥 표현을 붙였을 때 샷·역할·감정·강도 선형 분류(한 작품 빼고)가 오르나
B. 단방향(다음 컷 맞히기): t까지 보고 t+1 임베딩을 맞힘 → t의 숨은 상태로 '다음 컷 샷' 분류
   비교: t 컷 그림만 / t 컷 사람 샷 라벨 / 숨은 상태
라벨은 평가 단계에서만 씀. 결과: docs/ml/exp/selfsup-seq.md
"""
import sys, pathlib, collections as C, numpy as np, torch, torch.nn as nn
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent)); from common import *
from sklearn.linear_model import LogisticRegression
torch.manual_seed(0); torch.set_num_threads(4)
d, row, I = db()
ids, E = matrix(['img-clip', 'img-dino'], pca=128)
pos = {i: k for k, i in enumerate(ids)}
def num(v):
    try: return float(v)
    except: return 0.0
lay = np.array([[min(4, num(row[i][I('높이/폭')])), min(3, num(row[i][I('뒤여백/폭')]))] for i in ids], np.float32)
F = np.hstack([E, (lay - lay.mean(0)) / lay.std(0)]).astype(np.float32); D = F.shape[1]
eps = C.OrderedDict()
for i in ids: eps.setdefault(i[:5], []).append(i)
seqs = [[pos[i] for i in sorted(v)] for v in eps.values()]
class M(nn.Module):
    def __init__(s, causal):
        super().__init__(); s.causal = causal; s.inp = nn.Linear(D, 128); s.pe = nn.Embedding(256, 128); s.mask = nn.Parameter(torch.zeros(128))
        s.enc = nn.TransformerEncoder(nn.TransformerEncoderLayer(128, 4, 256, 0.1, batch_first=True), 2); s.out = nn.Linear(128, D)
    def forward(s, x, m=None):
        h = s.inp(x)
        if m is not None: h = torch.where(m[..., None], s.mask.expand_as(h), h)
        h = h + s.pe(torch.arange(x.shape[1]))[None]
        am = nn.Transformer.generate_square_subsequent_mask(x.shape[1]) if s.causal else None
        z = s.enc(h, mask=am, is_causal=s.causal); return z, s.out(z)
def train(causal, epochs=60):
    m = M(causal); opt = torch.optim.AdamW(m.parameters(), 1e-3, weight_decay=1e-2); rng = np.random.default_rng(0)
    for ep in range(epochs):
        m.train(); tot = 0
        for k in rng.permutation(len(seqs)):
            x = torch.tensor(F[seqs[k]])[None][:, :256]
            if causal: _, y = m(x); loss = 1 - nn.functional.cosine_similarity(y[0, :-1], x[0, 1:]).mean()
            else:
                mk = torch.tensor(rng.random(x.shape[1]) < .15)[None]
                if not mk.any(): continue
                _, y = m(x, mk); loss = 1 - nn.functional.cosine_similarity(y[mk], x[mk]).mean()
            opt.zero_grad(); loss.backward(); opt.step(); tot += loss.item()
        if ep % 20 == 19: print(('단방향' if causal else '양방향'), ep + 1, round(tot / len(seqs), 4), flush=True)
    m.eval(); H = np.zeros((len(ids), 128), np.float32)
    with torch.no_grad():
        for s in seqs: H[s[:256]] = m(torch.tensor(F[s])[None][:, :256])[0][0].numpy()
    return H
work = np.array([i[:2] for i in ids])
def acc(X, y):
    p = np.empty_like(y)
    for w in sorted(set(work)):
        tr, te = work != w, work == w; p[te] = LogisticRegression(C=0.05, max_iter=2000).fit(X[tr], y[tr]).predict(X[te])
    return (p == y).mean()
z = lambda a: (a - a.mean(0)) / (a.std(0) + 1e-6)
Hb = z(train(False)); L = ['# T4 자기지도 순서 모델', '', f'회차 {len(seqs)}개 · 그림 컷 {len(ids)}개. 라벨 없이 학습, 평가만 라벨 사용(한 작품 빼고 9작품).', '',
    '## A. 가린 컷 맞히기 → 문맥 표현을 붙이면', '', '| 분야 | 컷 그림만 | 그림+문맥 표현 | 차이 |', '|---|---|---|---|']
for f in ('샷', '역할', '감정', '강도'):
    y = np.array([str(row[i][I(f)]) for i in ids]); a, b = acc(F, y), acc(np.hstack([F, Hb]), y)
    L.append(f'| {f} | {a:.1%} | {b:.1%} | {(b - a) * 100:+.1f}%p |'); print(L[-1], flush=True)
Hc = z(train(True)); nxt = [(s[k], s[k + 1]) for s in seqs for k in range(len(s) - 1)]
a_ = np.array([p for p, _ in nxt]); b_ = np.array([q for _, q in nxt])
ys = np.array([str(row[ids[q]][I('샷')]) for q in b_]); cur = np.array([str(row[ids[p]][I('샷')]) for p in a_])
oh = np.array([[c == k for k in sorted(set(cur))] for c in cur], np.float32)
work_s = work.copy(); work = work_s[a_]
r1, r2, r3, r4 = acc(F[a_], ys), acc(oh, ys), acc(np.hstack([F[a_], Hc[a_]]), ys), acc(np.hstack([oh, F[a_], Hc[a_]]), ys)
base = C.Counter(ys).most_common(1)[0][1] / len(ys)
L += ['', '## B. 다음 컷 샷 맞히기(지금 컷까지만 보고)', '', f'- 가장 흔한 값: {base:.1%}', f'- 지금 컷 그림만: {r1:.1%}', f'- 지금 컷 사람 샷 라벨: {r2:.1%}',
      f'- 지금 컷 그림 + 단방향 숨은 상태(앞 컷들 문맥): {r3:.1%}', f'- 사람 샷 라벨 + 그림 + 숨은 상태: {r4:.1%}']
print('\n'.join(L[-6:]))
p = ROOT / 'docs/ml/exp/selfsup-seq.md'; p.write_text('\n'.join(L) + '\n'); print('저장', p.relative_to(ROOT))
