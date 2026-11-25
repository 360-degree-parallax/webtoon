#!/usr/bin/env python3
"""웹툰 컷(그림) 이미지에서 기계로 잴 수 있는 메타데이터를 뽑아 rough/db/cut-meta.json 에 저장.
- 인물·머리·얼굴 검출(imgutils, 애니·만화용 YOLO ONNX): 개수, 가장 큰 얼굴·머리·인물 상자의 크기 비율·위치
- 구도: 주인공(가장 큰 머리/인물) 중심의 가로·세로 위치(3분할), 머리 위 여백, 인물 좌우 치우침
- 그림: 밝기·채도·흑백 여부·흰 바탕 비율·선 밀도(엣지)·가로/세로/사선 선 방향 비율
사용: ~/.venv-meta/bin/python tools/meta/extract_cut_meta.py [--limit N]   (imgutils는 별도 가상환경: numpy 2 필요)
"""
import sys, csv, json, pathlib, time, numpy as np
from PIL import Image, ImageFilter
from imgutils.detect import detect_faces, detect_heads, detect_person
ROOT = pathlib.Path(__file__).resolve().parents[2]; A = sys.argv[1:]
lim = int(A[A.index('--limit') + 1]) if '--limit' in A else None
OUT = ROOT / 'rough' / 'db' / 'cut-meta.json'
old = json.loads(OUT.read_text()) if OUT.exists() else {'cuts': {}}
rows = [r for r in csv.DictReader(open(ROOT / 'rough' / 'cuts' / 'manifest.csv', encoding='utf-8-sig')) if r['type'] == '그림']
if lim: rows = rows[:lim]
def boxes(res, W, H, th=.35):
    out = [{'x0': round(b[0] / W, 3), 'y0': round(b[1] / H, 3), 'x1': round(b[2] / W, 3), 'y1': round(b[3] / H, 3), 's': round(float(s), 2)} for b, _, s in res if s >= th]
    return sorted(out, key=lambda b: -(b['x1'] - b['x0']) * (b['y1'] - b['y0']))
def third(v): return '왼쪽' if v < 1 / 3 else '오른쪽' if v > 2 / 3 else '가운데'
def vthird(v): return '위' if v < 1 / 3 else '아래' if v > 2 / 3 else '가운데'
def stats(im):
    g = np.asarray(im.convert('L'), dtype=np.float32) / 255; hsv = np.asarray(im.convert('HSV'), dtype=np.float32) / 255
    e = np.asarray(im.convert('L').filter(ImageFilter.FIND_EDGES), dtype=np.float32) / 255
    gy, gx = np.gradient(g); mag = np.hypot(gx, gy); m = mag > .08; ang = (np.degrees(np.arctan2(gy[m], gx[m])) + 180) % 180
    hor = float(((ang > 67.5) & (ang < 112.5)).mean()) if m.any() else 0  # 기울기 방향이 세로 → 선은 가로
    ver = float(((ang < 22.5) | (ang > 157.5)).mean()) if m.any() else 0
    return {'밝기': round(float(g.mean()), 3), '명암 대비': round(float(g.std()), 3), '채도': round(float(hsv[..., 1].mean()), 3),
            '흑백': bool(hsv[..., 1].mean() < .06), '흰 바탕': round(float((g > .94).mean()), 3), '선 밀도': round(float((e > .15).mean()), 3),
            '가로선': round(hor, 3), '세로선': round(ver, 3), '사선': round(max(0.0, 1 - hor - ver), 3)}
res = old['cuts']; t0 = time.time()
for k, r in enumerate(rows):
    cid = r['cut_id']
    if cid in res: continue
    p = ROOT / 'rough' / 'cuts' / r['file']
    if not p.exists(): continue
    im = Image.open(p).convert('RGB'); W, H = im.size
    f, h, ps = boxes(detect_faces(im), W, H), boxes(detect_heads(im), W, H), boxes(detect_person(im), W, H)
    main = (h or ps or f or [None])[0]
    d = {'크기': [W, H], '얼굴 수': len(f), '머리 수': len(h), '인물 수': len(ps), '얼굴': f[:4], '머리': h[:4], '인물': ps[:4]}
    if main:
        cx, cy = (main['x0'] + main['x1']) / 2, (main['y0'] + main['y1']) / 2
        d['주인공'] = {'가로': third(cx), '세로': vthird(cy), 'cx': round(cx, 3), 'cy': round(cy, 3)}
    if h: d['머리 높이 비'] = round(h[0]['y1'] - h[0]['y0'], 3); d['머리 위 여백'] = round(h[0]['y0'], 3); d['머리 폭 비'] = round(h[0]['x1'] - h[0]['x0'], 3)
    if ps: d['인물 높이 비'] = round(ps[0]['y1'] - ps[0]['y0'], 3); d['인물 면적 비'] = round((ps[0]['y1'] - ps[0]['y0']) * (ps[0]['x1'] - ps[0]['x0']), 3)
    d.update(stats(im.resize((max(1, W // 2), max(1, H // 2)))))
    res[cid] = d
    if k % 100 == 0:
        OUT.write_text(json.dumps({'cuts': res}, ensure_ascii=False, separators=(',', ':'))); print(f'{len(res)}/{len(rows)} {time.time() - t0:.0f}s', flush=True)
meta = {'made': time.strftime('%Y-%m-%d'), 'how': 'imgutils detect_faces/heads/person(점수≥0.35, 좌표는 컷 크기 대비 0~1) + 픽셀 통계', 'count': len(res)}
OUT.write_text(json.dumps({'meta': meta, 'cuts': res}, ensure_ascii=False, separators=(',', ':'))); print('저장', OUT, len(res))
