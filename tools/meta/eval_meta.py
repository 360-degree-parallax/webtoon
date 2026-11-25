#!/usr/bin/env python3
"""컷 메타데이터(rough/db/cut-meta.json)가 샷·앵글·역할·감정 분류에 도움이 되는지: 한 작품 빼고 학습 → 뺀 작품 평가.
비교: 그림 임베딩(CLIP+DINOv2) / 메타만 / 그림+메타. 메타는 표준화한 숫자 특징(인물·머리 크기·위치, 그림 통계)."""
import sys, json, pathlib, numpy as np, collections as Cn
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import f1_score, recall_score
ROOT = pathlib.Path(__file__).resolve().parents[2]; sys.path.insert(0, str(ROOT / 'tools' / 'ml')); import weights as WT
C = ROOT / 'tools' / 'ml' / 'cache'
def load(n): z = np.load(C / n); return dict(zip(z['ids'], z['X']))
M = json.loads((ROOT / 'rough' / 'db' / 'cut-meta.json').read_text())['cuts']
d = json.loads((ROOT / 'rough' / 'db' / 'db.json').read_text()); t = d['컷표']; I = t['columns'].index; row = {r[I('컷ID')]: r for r in t['rows']}
E = [load('img-clip.npz'), load('img-dino.npz')]
ids = sorted(i for i in E[0] if i in E[1] and i in row and i in M); work = np.array([i[:2] for i in ids])
def feat(m):
    W, H = m['크기']; f = m.get('얼굴') or []; fh = (f[0]['y1'] - f[0]['y0']) if f else 0; fw = (f[0]['x1'] - f[0]['x0']) if f else 0
    mc = m.get('주인공') or {}
    v = [m['얼굴 수'], m['머리 수'], m['인물 수'], m.get('머리 높이 비', 0), m.get('머리 폭 비', 0), m.get('머리 위 여백', 1), m.get('인물 높이 비', 0), m.get('인물 면적 비', 0),
         fh, fw, fh * H / W if f else 0, m.get('머리 폭 비', 0) * 1.0, mc.get('cx', .5), mc.get('cy', .5), float(bool(m.get('머리'))), float(bool(m.get('인물'))),
         m['밝기'], m['명암 대비'], m['채도'], float(m['흑백']), m['흰 바탕'], m['선 밀도'], m['가로선'], m['세로선'], m['사선'], np.log(H / W)]
    return v
Xm = np.array([feat(M[i]) for i in ids], dtype=np.float32); Xm = (Xm - Xm.mean(0)) / (Xm.std(0) + 1e-6)
Xi = np.hstack([np.stack([e[i] for i in ids]) for e in E])
def lowo(X, y, sw, model='lr'):
    pred = np.empty_like(y)
    for w in sorted(set(work)):
        tr, te = work != w, work == w
        m = LogisticRegression(max_iter=4000).fit(X[tr], y[tr], sample_weight=sw[tr]) if model == 'lr' else HistGradientBoostingClassifier(max_iter=300, learning_rate=.06).fit(X[tr], y[tr], sample_weight=sw[tr])
        pred[te] = m.predict(X[te])
    return pred
if __name__ == '__main__':
    print('컷', len(ids))
    for field in ('샷', '앵글', '역할', '감정'):
        y = np.array([str(row[i][I(field)]) for i in ids]); sw = WT.sample_weights(ids, field, y)
        for name, X, mdl in (('그림', Xi, 'lr'), ('메타만', Xm, 'gb'), ('그림+메타', np.hstack([Xi, Xm * .35]), 'lr')):
            p = lowo(X, y, sw, mdl); out = {'정확도': round(float((p == y).mean()), 3), 'macro-F1': round(float(f1_score(y, p, average='macro')), 3)}
            if field == '앵글': out['재현율'] = {c: round(float(recall_score(y, p, labels=[c], average='macro', zero_division=0)), 2) for c in ('로우앵글', '하이앵글')}
            print(field, name, json.dumps(out, ensure_ascii=False), flush=True)
