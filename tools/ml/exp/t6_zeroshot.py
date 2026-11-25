#!/usr/bin/env python3
"""T6 제로샷: 우리 라벨로 학습하지 않고, 이미 학습된 그림-글 모델에 글로 물어서 판정.
A. CLIP(같은 ONNX 모델의 글 쪽) 프롬프트: 샷·앵글 클래스마다 영어 문장 몇 개 → 그림 임베딩과 유사도 최댓값
B. 소형 VLM(SmolVLM-256M-Instruct, Apache-2.0) 표본 컷에 질문(--vlm N). 전부 이 컨테이너 안에서 실행, 이미지를 밖으로 보내지 않음
결과: docs/ml/exp/zeroshot.md
"""
import sys, csv, json, pathlib, collections as C, numpy as np, onnxruntime as ort
from tokenizers import Tokenizer
from huggingface_hub import hf_hub_download
from sklearn.metrics import f1_score, confusion_matrix
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent)); from common import *
d, row, I = db(); A = sys.argv[1:]
img = load('img-clip'); ids = sorted(img); Xi = np.stack([img[i] for i in ids]); Xi /= np.linalg.norm(Xi, axis=1, keepdims=True)
rid = 'Xenova/clip-vit-base-patch32'
tok = Tokenizer.from_file(hf_hub_download(rid, 'tokenizer.json')); tok.enable_padding(pad_id=49407, length=77); tok.enable_truncation(77)
ts = ort.InferenceSession(hf_hub_download(rid, 'onnx/text_model.onnx'), providers=['CPUExecutionProvider'])
def temb(texts):
    enc = tok.encode_batch(texts); ii = np.array([e.ids for e in enc], np.int64); am = np.array([e.attention_mask for e in enc], np.int64)
    feeds = {'input_ids': ii}
    if 'attention_mask' in [x.name for x in ts.get_inputs()]: feeds['attention_mask'] = am
    out = dict(zip([o.name for o in ts.get_outputs()], ts.run(None, feeds)))
    e = out.get('text_embeds', list(out.values())[0]); return e / np.linalg.norm(e, axis=1, keepdims=True)
P = {'샷': {'설정': ['an establishing shot of a building exterior', 'a wide landscape view with no people', 'a city or sky background scene'],
           '전경': ['a long shot with small figures in a wide room', 'people seen from far away in a large space'],
           '전신': ['a full body shot of a person from head to toe', 'a standing character shown full length'],
           '중경': ['a medium shot of a person from the waist up', 'two people talking, shown from the chest up'],
           '클로즈업': ['a close-up of a face', 'a close-up portrait of a character\'s head and shoulders'],
           '디테일': ['an extreme close-up of eyes', 'an extreme close-up of a hand or an object', 'a detail shot of lips'],
           '효과 배경': ['an abstract background with speed lines or sparkles', 'a plain colored panel with effect lines'],
           'SD': ['a chibi super-deformed cute cartoon character', 'a small funny cartoon character with a big head'],
           '화면 인서트': ['a phone screen with text messages', 'a screenshot of a user interface']},
     '앵글': {'아이레벨': ['an eye-level shot of a character', 'a straight-on view at eye level'],
             '로우앵글': ['a low angle shot looking up at a towering character', 'a worm\'s-eye view looking up'],
             '하이앵글': ['a high angle shot looking down at a character', 'looking down at a person from above'],
             '탑뷰': ['a top-down bird\'s-eye view from directly overhead']}}
L = ['# T6 제로샷 판정', '', f'그림 컷 {len(ids)}개. 우리 라벨로 학습하지 않음(사전학습 모델에 글로 질문).', '']
for f, cls in P.items():
    y = np.array([str(row[i][I(f)]) for i in ids]); keep = np.isin(y, list(cls))
    names = list(cls); S = np.stack([(Xi @ temb(cls[k]).T).max(1) for k in names], 1); pred = np.array(names)[S.argmax(1)]
    acc = (pred[keep] == y[keep]).mean(); mf = f1_score(y[keep], pred[keep], average='macro'); base = C.Counter(y[keep]).most_common(1)[0][1] / keep.sum()
    L += [f'## A. CLIP 프롬프트 · {f}', '', f'- 정확도 {acc:.1%} (가장 흔한 값 {base:.1%}), macro-F1 {mf:.3f}', '- 클래스별 재현율: ' + ', '.join(f'{k} {(pred[keep][y[keep] == k] == k).mean():.0%}({(y[keep] == k).sum()})' for k in names if (y[keep] == k).any())]
    if f == '앵글':  # 앵글은 쏠림이 심해 순위로 봄: 로우앵글 점수 상위 5%에 실제 로우앵글이 얼마나
        for k in ('로우앵글', '하이앵글'):
            sc = S[:, names.index(k)] - S[:, names.index('아이레벨')]; top = np.argsort(-sc)[:int(len(sc) * .05)]
            L.append(f'- {k} 점수 상위 5%({len(top)}컷) 중 실제 {k}: {(y[top] == k).mean():.0%} (전체 비율 {(y == k).mean():.1%})')
    L.append(''); print('\n'.join(L[-5:]), flush=True)
if '--vlm' in A:
    import torch, re
    from transformers import AutoProcessor, AutoModelForImageTextToText
    from PIL import Image
    n = int(A[A.index('--vlm') + 1]); vid = 'HuggingFaceTB/SmolVLM-256M-Instruct'; torch.set_num_threads(4)
    proc = AutoProcessor.from_pretrained(vid); vm = AutoModelForImageTextToText.from_pretrained(vid, torch_dtype=torch.float32).eval()
    man = {r['cut_id']: r['file'] for r in csv.DictReader(open(ROOT / 'rough/cuts/manifest.csv', encoding='utf-8-sig'))}
    rng = np.random.default_rng(0); MAP = {'establishing': '설정', 'wide': '전경', 'long': '전경', 'full': '전신', 'medium': '중경', 'close': '클로즈업', 'extreme': '디테일', 'detail': '디테일'}
    sample = [ids[k] for k in rng.choice(len(ids), n, replace=False)]; got = []
    q = 'What kind of camera shot is this comic panel? Answer with one of: establishing shot, wide shot, full shot, medium shot, close-up, extreme close-up.'
    for i in sample:
        im = Image.open(ROOT / 'rough/cuts' / man[i]).convert('RGB'); im.thumbnail((512, 512))
        msg = [{'role': 'user', 'content': [{'type': 'image'}, {'type': 'text', 'text': q}]}]
        inp = proc(text=proc.apply_chat_template(msg, add_generation_prompt=True), images=[im], return_tensors='pt')
        with torch.no_grad(): o = vm.generate(**inp, max_new_tokens=8, do_sample=False)
        ans = proc.batch_decode(o[:, inp['input_ids'].shape[1]:], skip_special_tokens=True)[0].strip().lower()
        lab = next((v for k, v in sorted(MAP.items(), key=lambda kv: -len(kv[0])) if k in ans), '?'); got.append((i, str(row[i][I('샷')]), lab, ans))
    ok = [g for g in got if g[1] in MAP.values()]; acc = np.mean([g[1] == g[2] for g in ok]); cnt = C.Counter(g[2] for g in got)
    L += ['## B. 소형 VLM(SmolVLM-256M) 표본', '', f'- 무작위 {n}컷 중 6개 샷 클래스 {len(ok)}컷 정확도 {acc:.1%}', f'- 답 분포: {dict(cnt)}', '']
    print('\n'.join(L[-4:]))
p = ROOT / 'docs/ml/exp/zeroshot.md'; p.write_text('\n'.join(L) + '\n'); print('저장', p.relative_to(ROOT))
