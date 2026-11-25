#!/usr/bin/env python3
"""외부 이미지(~/rough-ext/data/img) 임베딩 — 컷 임베딩(embed_image.py)과 같은 모델·전처리(흰 여백 정사각형 → 224px)
사용: python3 tools/ml/ext/embed_ext.py [clip|dino] [--gray]
--gray: 흑백으로 바꿔서(웹툰 흑백·톤 컷과 그림체 차이 줄이기 실험)
결과: ~/rough-ext/data/emb-<model>[-gray].npz (저장소 밖)
"""
import sys, csv, pathlib, numpy as np, onnxruntime as ort
from PIL import Image, ImageOps
from huggingface_hub import hf_hub_download
A = sys.argv[1:]; kind = A[0] if A and not A[0].startswith('--') else 'clip'; gray = '--gray' in A
D = pathlib.Path('/home/user/rough-ext/data')
CFG = {'clip': ('Xenova/clip-vit-base-patch32', 'onnx/vision_model.onnx', [0.4815, 0.4578, 0.4082], [0.2686, 0.2613, 0.2758]),
       'dino': ('Xenova/dinov2-small', 'onnx/model.onnx', [0.485, 0.456, 0.406], [0.229, 0.224, 0.225])}
rid, f, mean, std = CFG[kind]
so = ort.SessionOptions(); so.intra_op_num_threads = 4
sess = ort.InferenceSession(hf_hub_download(rid, f), so, providers=['CPUExecutionProvider'])
iname = sess.get_inputs()[0].name; onames = [o.name for o in sess.get_outputs()]
def prep(path):
    im = Image.open(path).convert('RGB')
    if gray: im = ImageOps.grayscale(im).convert('RGB')
    w, h = im.size; s = max(w, h)
    sq = Image.new('RGB', (s, s), (255, 255, 255)); sq.paste(im, ((s - w) // 2, (s - h) // 2))
    a = np.asarray(sq.resize((224, 224), Image.BICUBIC), dtype=np.float32) / 255.0
    return ((a - mean) / std).transpose(2, 0, 1)
def run(batch):
    out = sess.run(None, {iname: np.stack(batch).astype(np.float32)})
    if kind == 'clip': v = out[onames.index('image_embeds')] if 'image_embeds' in onames else out[0]
    else: h = out[0]; v = np.concatenate([h[:, 0], h[:, 1:].mean(1)], 1)
    return v / np.linalg.norm(v, axis=1, keepdims=True)
rows = list(csv.DictReader(open(D / 'labels.csv')))
ids, X, batch, bid = [], [], [], []
for k, r in enumerate(rows):
    batch.append(prep(D / 'img' / r['id'])); bid.append(r['id'])
    if len(batch) == 32 or k == len(rows) - 1:
        X.append(run(batch)); ids += bid; batch, bid = [], []
X = np.concatenate(X).astype(np.float32); out = D / f'emb-{kind}{"-gray" if gray else ""}.npz'
np.savez_compressed(out, ids=np.array(ids), X=X); print('저장', out, X.shape)
