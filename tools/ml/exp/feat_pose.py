#!/usr/bin/env python3
"""포즈 추정(ViTPose-base, Apache-2.0)으로 인물이 화면에 어디까지 보이는지 특징을 뽑는다. 로컬 실행.
인물 상자: rough/db/cut-meta.json(애니용 인물 검출). 가장 큰 인물 1명만. 인물이 없으면 0 벡터 + '인물 없음' 표시
특징(19): 인물 없음, 상자 면적 비율, 17개 관절 중 보이는 비율, 머리·어깨·엉덩이·무릎·발목이 보이는지, 머리-발목 세로 길이/컷 높이, 어깨 기울기,
          머리 대비 어깨 폭, 몸통 세로/가로, 머리 위치 y, 발목 위치 y(없으면 1.2), 코-엉덩이 길이/컷 높이, 보이는 관절 평균 신뢰도
사용: python3 tools/ml/exp/feat_pose.py [--limit N]  → tools/ml/cache/feat-pose.npz
"""
import sys, csv, json, pathlib, time, numpy as np, torch
from PIL import Image
from transformers import AutoProcessor, VitPoseForPoseEstimation
ROOT = pathlib.Path(__file__).resolve().parents[3]; A = sys.argv[1:]
lim = int(A[A.index('--limit') + 1]) if '--limit' in A else None
torch.set_num_threads(4)
rid = 'usyd-community/vitpose-base-simple'
proc = AutoProcessor.from_pretrained(rid); model = VitPoseForPoseEstimation.from_pretrained(rid).eval()
meta = json.loads((ROOT / 'rough/db/cut-meta.json').read_text())['cuts']
rows = [r for r in csv.DictReader(open(ROOT / 'rough/cuts/manifest.csv', encoding='utf-8-sig')) if r['type'] == '그림']
if lim: rows = rows[:lim]
ids, X = [], []; t0 = time.time(); TH = .3
for n, r in enumerate(rows):
    m = meta.get(r['cut_id'], {}); ps = m.get('인물') or []
    f = np.zeros(19, np.float32)
    if not ps: f[0] = 1
    else:
        im = Image.open(ROOT / 'rough/cuts' / r['file']).convert('RGB'); W, H = im.size; b = ps[0]
        box = [b['x0'] * W, b['y0'] * H, (b['x1'] - b['x0']) * W, (b['y1'] - b['y0']) * H]
        inp = proc(im, boxes=[[box]], return_tensors='pt')
        with torch.no_grad(): out = model(**inp)
        res = proc.post_process_pose_estimation(out, boxes=[[box]])[0][0]
        kp = res['keypoints'].numpy(); sc = res['scores'].numpy(); v = sc > TH
        y = kp[:, 1] / H; x = kp[:, 0] / W
        vis = lambda idx: float(v[idx].any())
        head = [0, 1, 2, 3, 4]; sh = [5, 6]; hip = [11, 12]; kn = [13, 14]; an = [15, 16]
        top = y[v].min() if v.any() else 0; bot = y[v].max() if v.any() else 0
        shw = abs(x[5] - x[6]) if v[5] and v[6] else 0; hx = x[:5][v[:5]]; hw = (hx.max() - hx.min()) if len(hx) >= 2 else 0
        tilt = abs(y[5] - y[6]) / (shw + 1e-3) if v[5] and v[6] else 0
        torso = (abs(np.mean(y[hip]) - np.mean(y[sh])) / (shw + 1e-3)) if v[sh].all() and v[hip].all() else 0
        f[:] = [0, (b['x1'] - b['x0']) * (b['y1'] - b['y0']), v.mean(), vis(head), vis(sh), vis(hip), vis(kn), vis(an), bot - top, min(tilt, 3),
                (shw / (hw + 1e-3)) if hw else 0, min(torso, 5), y[:5][v[:5]].mean() if v[:5].any() else 0, y[an][v[an]].mean() if v[an].any() else 1.2,
                abs(np.mean(y[hip]) - y[0]) if v[0] and v[hip].any() else 0, sc[v].mean() if v.any() else 0, 0, 0, 0]
    ids.append(r['cut_id']); X.append(f)
    if n % 500 == 0: print(n, len(rows), f'{time.time() - t0:.0f}s', flush=True)
np.savez(ROOT / 'tools/ml/cache/feat-pose.npz', ids=np.array(ids), X=np.stack(X)); print('저장', len(ids), f'{time.time() - t0:.0f}s')
