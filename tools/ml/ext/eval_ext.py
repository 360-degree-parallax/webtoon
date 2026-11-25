#!/usr/bin/env python3
"""외부 데이터를 섞었을 때 웹툰 컷 정확도가 오르는지: 한 작품 빼고 학습(웹툰 4작품 + 외부) → 뺀 작품 웹툰 컷으로 평가.
특징은 그림만(CLIP+DINOv2) — 외부 데이터에는 컷 글이 없어서. 외부 가중치·흑백·가슴 위 샷 처리 방식을 바꿔 가며 비교
"""
import sys, json, csv, pathlib, numpy as np, collections as Cn
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score, recall_score, precision_score
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1])); import weights as WT
ROOT = pathlib.Path(__file__).resolve().parents[3]; C = ROOT / 'tools' / 'ml' / 'cache'; D = pathlib.Path('/home/user/rough-ext/data')
def load(p): z = np.load(p); return dict(zip(z['ids'], z['X']))
W = [load(C / 'img-clip.npz'), load(C / 'img-dino.npz')]
d = json.loads((ROOT / 'rough' / 'db' / 'db.json').read_text()); t = d['컷표']; I = t['columns'].index; row = {r[I('컷ID')]: r for r in t['rows']}
ids = sorted(i for i in W[0] if i in W[1] and i in row); Xw = np.hstack([np.stack([m[i] for i in ids]) for m in W]); work = np.array([i[:2] for i in ids])
lab = {r['id']: r for r in csv.DictReader(open(D / 'labels.csv'))}
def ext(gray):
    E = [load(D / f'emb-clip{"-gray" if gray else ""}.npz'), load(D / f'emb-dino{"-gray" if gray else ""}.npz')]
    eids = sorted(E[0]); return eids, np.hstack([np.stack([m[i] for i in eids]) for m in E])
# 매핑 v2: 웹툰 라벨이 영화 라벨보다 한 단계 넓게 붙는 것을 반영(외부만 학습한 모델로 웹툰 컷을 예측해 본 교차표 근거)
REMAP2 = {'fullShot': '전경', 'Medium Wide': '전경', 'mediumCloseUp': '', 'Medium Close Up': '', 'Wide': '전경', 'longShot': '전경'}
def run(field, w_ext, gray=False, mcu='중경', C_=1.0, v2=False):
    y = np.array([str(row[i][I(field)]) for i in ids]); sw = WT.sample_weights(ids, field, y)
    eids, Xe = ext(gray); ye = []
    for i in eids:
        v = lab[i][field]
        if field == '샷' and lab[i]['mcu'] == '1': v = {'중경': '중경', '클로즈업': '클로즈업', 'drop': ''}[mcu] if v == '중경' else v
        if field == '샷' and v2:
            r = json.loads(lab[i]['raw']); src = r.get('shot size') or r.get('shot_scale')
            if src in REMAP2: v = REMAP2[src]
        ye.append(v)
    ye = np.array(ye); ke = ye != ''; Xe, ye = Xe[ke], ye[ke]
    pred = np.empty_like(y)
    for wk in sorted(set(work)):
        tr, te = work != wk, work == wk
        X = np.vstack([Xw[tr], Xe]) if w_ext else Xw[tr]; Y = np.concatenate([y[tr], ye]) if w_ext else y[tr]
        S = np.concatenate([sw[tr], np.full(len(ye), w_ext)]) if w_ext else sw[tr]
        pred[te] = LogisticRegression(C=C_, max_iter=3000).fit(X, Y, sample_weight=S).predict(Xw[te])
    out = {'정확도': round(float((pred == y).mean()), 3), 'macro-F1': round(float(f1_score(y, pred, average='macro')), 3)}
    focus = ['로우앵글', '하이앵글', '탑뷰'] if field == '앵글' else ['설정', '전경', '전신', '중경', '클로즈업', '디테일']
    out['재현율'] = {k: round(float(recall_score(y, pred, labels=[k], average='macro', zero_division=0)), 2) for k in focus}
    out['정밀도'] = {k: round(float(precision_score(y, pred, labels=[k], average='macro', zero_division=0)), 2) for k in focus}
    out['외부'] = int(len(ye)) if w_ext else 0
    return out
if __name__ == '__main__':
    print('웹툰 컷', len(ids), '· 분포 샷', dict(Cn.Counter(str(row[i][I('샷')]) for i in ids).most_common()), '앵글', dict(Cn.Counter(str(row[i][I('앵글')]) for i in ids).most_common()))
    for field in ('샷', '앵글'):
        cfgs = [dict(w_ext=0), dict(w_ext=.25), dict(w_ext=.5), dict(w_ext=1), dict(w_ext=.5, gray=True), dict(w_ext=1, gray=True)] + ([dict(w_ext=.5, mcu='클로즈업'), dict(w_ext=.5, mcu='drop')] if field == '샷' else [])
        if '--v2' in sys.argv: cfgs = [dict(w_ext=0)] + [dict(w_ext=w, v2=True) for w in (.25, .5, 1, 2)] if field == '샷' else []
        for cfg in cfgs:
            print(field, json.dumps(cfg, ensure_ascii=False), json.dumps(run(field, **cfg), ensure_ascii=False), flush=True)
