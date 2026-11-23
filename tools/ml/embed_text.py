#!/usr/bin/env python3
"""컷표 그림 컷의 '내용'을 다국어 E5(ONNX 양자화, 브라우저와 같은 파일)로 임베딩한다.
사용: python3 tools/ml/embed_text.py [small|base] [--out 경로.npz]
- 모델: Xenova/multilingual-e5-{small,base} onnx/model_quantized.onnx (MIT). 'query: ' 접두어, 평균 풀링, L2 정규화
- 결과: ids(컷ID), X(임베딩) — 학습·평가는 tools/ml/train_text.py
"""
import sys, json, pathlib, numpy as np, onnxruntime as ort
from tokenizers import Tokenizer
from huggingface_hub import hf_hub_download
ROOT = pathlib.Path(__file__).resolve().parents[2]
size = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else 'small'
rid = f'Xenova/multilingual-e5-{size}'
out = pathlib.Path(sys.argv[sys.argv.index('--out') + 1]) if '--out' in sys.argv else ROOT / 'tools' / 'ml' / 'cache' / f'text-e5{size}.npz'
tok = Tokenizer.from_file(hf_hub_download(rid, 'tokenizer.json')); tok.enable_truncation(128); tok.enable_padding()
sess = ort.InferenceSession(hf_hub_download(rid, 'onnx/model_quantized.onnx'), providers=['CPUExecutionProvider'])
names = [i.name for i in sess.get_inputs()]
def embed(texts, bs=64):
    outv = []
    for k in range(0, len(texts), bs):
        enc = tok.encode_batch(['query: ' + t for t in texts[k:k + bs]])
        ids = np.array([e.ids for e in enc], dtype=np.int64); am = np.array([e.attention_mask for e in enc], dtype=np.int64)
        feed = {'input_ids': ids, 'attention_mask': am}
        if 'token_type_ids' in names: feed['token_type_ids'] = np.zeros_like(ids)
        h = sess.run(None, feed)[0]; m = am[..., None]
        v = (h * m).sum(1) / m.sum(1); v /= np.linalg.norm(v, axis=1, keepdims=True); outv.append(v.astype(np.float32))
        print(f'\r{min(k + bs, len(texts))}/{len(texts)}', end='', file=sys.stderr)
    print(file=sys.stderr); return np.concatenate(outv)
if __name__ == '__main__':
    d = json.loads((ROOT / 'rough' / 'db' / 'db.json').read_text()); t = d['컷표']; c = t['columns']; I = c.index
    rows = [r for r in t['rows'] if r[I('유형')] == '그림']
    ids = [r[I('컷ID')] for r in rows]; texts = [str(r[I('내용')] or '') for r in rows]
    X = embed(texts); out.parent.mkdir(parents=True, exist_ok=True); np.savez_compressed(out, ids=np.array(ids), X=X)
    print('저장', out, X.shape)
