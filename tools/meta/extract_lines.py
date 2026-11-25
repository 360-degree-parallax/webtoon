#!/usr/bin/env python3
"""앵글 단서: 컷 그림의 직선(LSD)으로 원근 특징을 잼 → rough/db/cut-lines.json
- 세로선 수렴(conv): 세로에 가까운 선이 위로 모이면 +(올려다봄·로우앵글), 아래로 모이면 −(내려다봄·하이앵글)
- 소실점 높이(vp_y): 세로선 쌍의 교점 높이 중앙값(컷 높이 대비, 위가 음수)
- 가로선 기울기(tilt): 가로에 가까운 선의 길이 가중 평균 각도(기울어진 앵글)
- 대각 수렴 방향(diag_up/down): 가로·세로가 아닌 선들의 소실점이 위/아래 중 어디에 많은지
사용: ~/.venv-meta/bin/python tools/meta/extract_lines.py
"""
import csv, json, pathlib, numpy as np, cv2
ROOT = pathlib.Path(__file__).resolve().parents[2]
rows = [r for r in csv.DictReader(open(ROOT / 'rough' / 'cuts' / 'manifest.csv', encoding='utf-8-sig')) if r['type'] == '그림']
lsd = cv2.createLineSegmentDetector(cv2.LSD_REFINE_STD); out = {}
for k, r in enumerate(rows):
    p = ROOT / 'rough' / 'cuts' / r['file']
    if not p.exists(): continue
    g = cv2.imread(str(p), cv2.IMREAD_GRAYSCALE); H, W = g.shape; s = 512 / max(H, W)
    if s < 1: g = cv2.resize(g, (int(W * s), int(H * s)), interpolation=cv2.INTER_AREA); H, W = g.shape
    L = lsd.detect(g)[0]; L = L.reshape(-1, 4) if L is not None else np.zeros((0, 4))
    x1, y1, x2, y2 = L.T; dx, dy = x2 - x1, y2 - y1; ln = np.hypot(dx, dy); keep = ln > .06 * max(H, W)
    x1, y1, x2, y2, dx, dy, ln = x1[keep], y1[keep], x2[keep], y2[keep], dx[keep], dy[keep], ln[keep]
    ang = np.degrees(np.arctan2(dy, dx)) % 180  # 0=가로, 90=세로
    ver = np.abs(ang - 90) < 25; hor = (ang < 20) | (ang > 160)
    d = {'n': int(len(ln)), 'nv': int(ver.sum()), 'nh': int(hor.sum())}
    if ver.sum() >= 2:
        # 위쪽 끝 기준 기울기: 위로 갈수록 x가 얼마나 움직이나
        top_x = np.where(y1 < y2, x1, x2); bot_x = np.where(y1 < y2, x2, x1); lean = (top_x - bot_x) / np.maximum(np.abs(dy), 1)
        cx = ((x1 + x2) / 2 - W / 2) / W
        w = ln[ver]; d['conv'] = round(float(-np.sum(cx[ver] * lean[ver] * w) / np.sum(w) * 10), 4)
        d['lean_abs'] = round(float(np.sum(np.abs(lean[ver]) * w) / np.sum(w)), 4)
        # 세로선 쌍 교점 높이(평행에 가까운 쌍 제외)
        idx = np.where(ver)[0][:60]; ys = []
        for a in range(len(idx)):
            for b in range(a + 1, len(idx)):
                i, j = idx[a], idx[b]; A = np.array([[dy[i], -dx[i]], [dy[j], -dx[j]]]); det = np.linalg.det(A)
                if abs(det) < 1e-3 * ln[i] * ln[j]: continue
                c = np.array([dy[i] * x1[i] - dx[i] * y1[i], dy[j] * x1[j] - dx[j] * y1[j]]); X, Y = np.linalg.solve(A, c)
                if -3 * W < X < 4 * W: ys.append(Y / H)
        if len(ys) >= 3: d['vp_y'] = round(float(np.clip(np.median(ys), -20, 20)), 3); d['vp_up'] = round(float(np.mean(np.array(ys) < 0)), 3)
    if hor.sum():
        a2 = np.where(ang[hor] > 90, ang[hor] - 180, ang[hor]); d['tilt'] = round(float(np.sum(a2 * ln[hor]) / np.sum(ln[hor])), 2)
    diag = ~ver & ~hor
    if diag.sum() >= 2:
        # 대각선의 연장선이 위로 모이는지: 선 방향의 기울기 부호와 x 위치
        cxd = ((x1 + x2) / 2 - W / 2)[diag]; sl = (dy / np.where(np.abs(dx) < 1e-6, 1e-6, dx))[diag]
        d['diag_up'] = round(float(np.mean(np.sign(cxd) * np.sign(sl) < 0)), 3)
    out[r['cut_id']] = d
    if k % 500 == 0: print(k, len(out), flush=True)
(ROOT / 'rough' / 'db' / 'cut-lines.json').write_text(json.dumps({'how': 'cv2 LSD(긴 변 512px, 길이 6% 이상)', 'cuts': out}, ensure_ascii=False, separators=(',', ':'))); print('저장', len(out))
