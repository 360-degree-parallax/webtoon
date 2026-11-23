#!/usr/bin/env python3
"""컷 이미지(rough/cuts) 임베딩. 세로로 긴 컷도 구도가 남게 흰 여백으로 정사각형을 만든 뒤 224px로 줄임(가운데 자르기 안 함).
사용: python3 tools/ml/embed_image.py [clip|dino] [--limit N]
- clip: Xenova/clip-vit-base-patch32 vision_model(fp32 ONNX) → image_embeds 512 (MIT)
- dino: Xenova/dinov2-small(fp32 ONNX) → CLS + 패치 평균 768 (Apache-2.0)
결과: tools/ml/cache/img-<model>.npz (ids, X) — 학습·평가는 tools/ml/train_image.py
"""
import sys, csv, pathlib, numpy as np, onnxruntime as ort
from PIL import Image
from huggingface_hub import hf_hub_download
ROOT = pathlib.Path(__file__).resolve().parents[2]
A = sys.argv[1:]; kind = A[0] if A and not A[0].startswith('--') else 'clip'
lim = int(A[A.index('--limit') + 1]) if '--limit' in A else None
CFG = {'clip': ('Xenova/clip-vit-base-patch32', 'onnx/vision_model.onnx', [0.4815, 0.4578, 0.4082], [0.2686, 0.2613, 0.2758]),
       'dino': ('Xenova/dinov2-small', 'onnx/model.onnx', [0.485, 0.456, 0.406], [0.229, 0.224, 0.225])}
rid, f, mean, std = CFG[kind]
so = ort.SessionOptions(); so.intra_op_num_threads = 4
sess = ort.InferenceSession(hf_hub_download(rid, f), so, providers=['CPUExecutionProvider'])
iname = sess.get_inputs()[0].name; onames = [o.name for o in sess.get_outputs()]
def prep(path):
    im = Image.open(path).convert('RGB'); w, h = im.size; s = max(w, h)
    sq = Image.new('RGB', (s, s), (255, 255, 255)); sq.paste(im, ((s - w) // 2, (s - h) // 2))
    a = np.asarray(sq.resize((224, 224), Image.BICUBIC), dtype=np.float32) / 255.0
    return ((a - mean) / std).transpose(2, 0, 1)
def run(batch):
    out = sess.run(None, {iname: np.stack(batch).astype(np.float32)})
    if kind == 'clip':
        v = out[onames.index('image_embeds')] if 'image_embeds' in onames else out[0]
    else:
        h = out[0]; v = np.concatenate([h[:, 0], h[:, 1:].mean(1)], 1)
    return v / np.linalg.norm(v, axis=1, keepdims=True)
rows = [r for r in csv.DictReader(open(ROOT / 'rough' / 'cuts' / 'manifest.csv', encoding='utf-8-sig')) if r['type'] == '그림']
if lim: rows = rows[:lim]
ids, X, batch, bid = [], [], [], []
for k, r in enumerate(rows):
    p = ROOT / 'rough' / 'cuts' / r['file']
    if not p.exists(): continue
    batch.append(prep(p)); bid.append(r['cut_id'])
    if len(batch) == 32 or k == len(rows) - 1:
        X.append(run(batch)); ids += bid; batch, bid = [], []
        print(f'\r{len(ids)}/{len(rows)}', end='', file=sys.stderr)
X = np.concatenate(X).astype(np.float32); out = ROOT / 'tools' / 'ml' / 'cache' / f'img-{kind}.npz'
np.savez_compressed(out, ids=np.array(ids), X=X); print('\n저장', out, X.shape)
