#!/usr/bin/env python3
"""깊이 추정(Depth-Anything-V2-Small, Apache-2.0)으로 컷마다 깊이 특징을 뽑는다. 로컬 실행, 이미지를 밖으로 보내지 않음.
특징: 8x8 평균 깊이 격자(64) + 위·가운데·아래 / 왼·오른 평균, 세로 기울기(깊이~y 상관), 표준편차, 가까운 영역 비율
사용: python3 tools/ml/exp/feat_depth.py [--limit N]  → tools/ml/cache/feat-depth.npz
"""
import sys, csv, pathlib, time, numpy as np, torch
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForDepthEstimation
ROOT = pathlib.Path(__file__).resolve().parents[3]; A = sys.argv[1:]
lim = int(A[A.index('--limit') + 1]) if '--limit' in A else None
torch.set_num_threads(4)
rid = 'depth-anything/Depth-Anything-V2-Small-hf'
proc = AutoImageProcessor.from_pretrained(rid); model = AutoModelForDepthEstimation.from_pretrained(rid).eval()
rows = [r for r in csv.DictReader(open(ROOT / 'rough/cuts/manifest.csv', encoding='utf-8-sig')) if r['type'] == '그림']
if lim: rows = rows[:lim]
OUT = ROOT / 'tools/ml/cache/feat-depth.npz'
ids, X = [], []; t0 = time.time()
def feat(d):
    d = (d - d.min()) / (d.max() - d.min() + 1e-6)  # 클수록 가까움(상대 깊이)
    H, W = d.shape; g = np.asarray(Image.fromarray(d.astype(np.float32)).resize((8, 8), Image.BOX)).ravel()
    th = [d[:H // 3].mean(), d[H // 3:2 * H // 3].mean(), d[2 * H // 3:].mean()]
    lr = [d[:, :W // 2].mean(), d[:, W // 2:].mean()]
    y = np.repeat(np.linspace(0, 1, H)[:, None], W, 1)
    corr = np.corrcoef(y.ravel(), d.ravel())[0, 1] if d.std() > 1e-4 else 0
    return np.concatenate([g, th, lr, [corr, d.std(), (d > .7).mean(), th[2] - th[0]]]).astype(np.float32)
B = 8
for k in range(0, len(rows), B):
    batch = rows[k:k + B]; ims = []
    for r in batch:
        im = Image.open(ROOT / 'rough/cuts' / r['file']).convert('RGB'); w, h = im.size; s = 252 / max(w, h)
        ims.append(im.resize((max(14, round(w * s)), max(14, round(h * s)))))
    for r, im in zip(batch, ims):
        inp = proc(images=im, return_tensors='pt', size={'height': 336, 'width': 336})
        with torch.no_grad(): d = model(**inp).predicted_depth[0].numpy()
        ids.append(r['cut_id']); X.append(feat(d))
    if k % 400 == 0: print(k, len(rows), f'{time.time() - t0:.0f}s', flush=True)
np.savez(OUT, ids=np.array(ids), X=np.stack(X)); print('저장', OUT, len(ids), f'{time.time() - t0:.0f}s')
