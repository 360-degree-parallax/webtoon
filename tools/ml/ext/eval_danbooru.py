#!/usr/bin/env python3
"""Danbooru 샘플(애니·일러스트, 태그 라벨)을 섞었을 때 웹툰 컷 정확도: eval_ext.py와 같은 평가(한 작품 빼고 학습 → 뺀 작품 웹툰 컷)
+ 외부만 학습해 웹툰 컷을 예측한 교차표(라벨 기준이 맞는지)"""
import sys, csv, json, pathlib, numpy as np, collections as Cn
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent)); import eval_ext as E
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score, recall_score, precision_score
D = pathlib.Path('/home/user/rough-ext/raw/danbooru')
lab = {r['file']: r for r in csv.DictReader(open(D / 'labels.csv'))}
Z = [E.load(D / 'emb-clip.npz'), E.load(D / 'emb-dino.npz')]; eids = sorted(Z[0]); Xd = np.hstack([np.stack([m[i] for i in eids]) for m in Z])
def run(field, w, remap=None):
    y = np.array([str(E.row[i][E.I(field)]) for i in E.ids]); sw = E.WT.sample_weights(E.ids, field, y)
    ye = np.array([(remap or {}).get(lab[i][field], lab[i][field]) for i in eids]); k = ye != ''; Xe, ye = Xd[k], ye[k]
    pred = np.empty_like(y)
    for wk in sorted(set(E.work)):
        tr, te = E.work != wk, E.work == wk
        X = np.vstack([E.Xw[tr], Xe]) if w else E.Xw[tr]; Y = np.concatenate([y[tr], ye]) if w else y[tr]; S = np.concatenate([sw[tr], np.full(len(ye), w)]) if w else sw[tr]
        pred[te] = LogisticRegression(max_iter=3000).fit(X, Y, sample_weight=S).predict(E.Xw[te])
    foc = ['로우앵글', '하이앵글', '탑뷰'] if field == '앵글' else ['설정', '전경', '전신', '중경', '클로즈업', '디테일']
    return {'정확도': round(float((pred == y).mean()), 3), 'macro-F1': round(float(f1_score(y, pred, average='macro')), 3),
            '재현율': {c: round(float(recall_score(y, pred, labels=[c], average='macro', zero_division=0)), 2) for c in foc},
            '정밀도': {c: round(float(precision_score(y, pred, labels=[c], average='macro', zero_division=0)), 2) for c in foc}, '외부': int(len(ye)) if w else 0}
if __name__ == '__main__':
    import pandas as pd
    for field, C6 in (('샷', ['설정', '전경', '전신', '중경', '클로즈업', '디테일']), ('앵글', ['아이레벨', '하이앵글', '로우앵글'])):
        ye = np.array([lab[i][field] for i in eids]); k = ye != ''
        m = LogisticRegression(max_iter=3000).fit(Xd[k], ye[k]); y = np.array([str(E.row[i][E.I(field)]) for i in E.ids]); sel = np.isin(y, C6)
        print(pd.crosstab(pd.Series(y[sel], name='웹툰 라벨'), pd.Series(m.predict(E.Xw[sel]), name='Danbooru만 학습한 예측')).to_string(), flush=True)
    for field in ('샷', '앵글'):
        for w in (0, .25, .5, 1):
            print(field, w, json.dumps(run(field, w), ensure_ascii=False), flush=True)
