#!/usr/bin/env python3
"""사람이 고를 판정 큐(rough/db/review-queue.json)를 만든다.

한 작품을 빼고 학습한 모델 확률로, 모델이 사람 라벨과 크게 어긋난다고 본 컷을 뽑는다.
선택지는 4개: 지금 라벨 + 모델 확률이 높은 라벨들(확률 순). 이미 본 컷(docs/ml/shot-audit.csv 앞 300컷 등)은 뺌
사용: python3 tools/ml/make_review_queue.py [--shot 300] [--emo 150] [--role 150] [--keep]
--keep: 지금 큐의 항목(이미 판정한 컷 포함)은 그대로 두고 모자란 만큼 새로 채움(브라우저에 남은 판정 결과가 그대로 맞물림)
항목마다 앞뒤 컷·다른 DB 값·상세 설명을, meta.examples에 라벨마다 대표 컷 3개를 넣어 판정 화면에서 보여 줌
필요: tools/ml/cache/img-clip.npz, img-dino.npz, text-e5base.npz (embed_image.py·embed_text.py)
"""
import sys, json, csv, pathlib, datetime, numpy as np
from sklearn.linear_model import LogisticRegression
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent)); import weights as WT  # 사람이 확인한 라벨: 학습 가중치↑, 큐에서는 뺌
ROOT = pathlib.Path(__file__).resolve().parents[2]; C = ROOT / 'tools' / 'ml' / 'cache'
A = sys.argv[1:]
N = {k: int(A[A.index('--' + k) + 1]) if '--' + k in A else v for k, v in (('shot', 300), ('emo', 150), ('role', 150))}
def load(n): z = np.load(C / n); return dict(zip(z['ids'], z['X']))
M = {k: load(f) for k, f in (('clip', 'img-clip.npz'), ('dino', 'img-dino.npz'), ('text', 'text-e5base.npz'))}
d = json.loads((ROOT / 'rough' / 'db' / 'db.json').read_text()); t = d['컷표']; c = t['columns']; I = c.index
row = {r[I('컷ID')]: r for r in t['rows']}
files = {r['cut_id']: r['file'] for r in csv.DictReader(open(ROOT / 'rough' / 'cuts' / 'manifest.csv', encoding='utf-8-sig'))}
seen = set()
p = ROOT / 'docs' / 'ml' / 'shot-audit.csv'
if p.exists(): seen |= {r['컷ID'] for r in csv.DictReader(open(p, encoding='utf-8-sig'))}
# 컷 메타(tools/meta/eval_meta.py의 숫자 특징): 샷 판정 모델에 더해 머리 크기·인물 수와 라벨이 어긋나는 컷을 더 잘 잡음
META = {}
if (ROOT / 'rough' / 'db' / 'cut-meta.json').exists():
    sys.path.insert(0, str(ROOT / 'tools' / 'meta')); _argv = sys.argv; sys.argv = sys.argv[:1]; import eval_meta as EMT; sys.argv = _argv
    META = {i: EMT.Xm[k] * .35 for k, i in enumerate(EMT.ids)}; M['meta'] = META
CM = json.loads((ROOT / 'rough' / 'db' / 'cut-meta.json').read_text())['cuts'] if META else {}
TASKS = [('shot', '샷', ['clip', 'dino', 'text'] + (['meta'] if META else [])), ('emo', '감정', ['clip', 'text']), ('role', '역할', ['clip', 'dino', 'text'])]
KEEP = '--keep' in A
oldq = json.loads((ROOT / 'rough' / 'db' / 'review-queue.json').read_text()) if KEEP and (ROOT / 'rough' / 'db' / 'review-queue.json').exists() else {'items': []}
old_ids = {x['id'] for x in oldq['items']}
# 앞뒤 컷: 같은 작품·화 안에서 DB 순서
CORDER = [r[I('컷ID')] for r in t['rows']]; pos = {k: n for n, k in enumerate(CORDER)}
def near(i, d):
    n = pos.get(i)
    if n is None: return None
    j = n + d
    if 0 <= j < len(CORDER) and CORDER[j][:5] == i[:5]: return {'cut': CORDER[j], 'file': files.get(CORDER[j], ''), 'text': str(row[CORDER[j]][I('내용')] or '')[:80]}
    return None
INFO = ['유형', '장면', '샷', '앵글', '역할', '감정', '강도', '감정(세부)']
def enrich(it):
    i = it['cut']; r = row.get(i)
    if r is None: return it
    it['prev'] = near(i, -1); it['next'] = near(i, 1)
    it['info'] = {k: r[I(k)] for k in INFO if r[I(k)] not in (None, '')}
    it['detail'] = str(r[I('상세 내용과 연출')] or '')[:220]
    m = CM.get(i)
    if m: it['meta'] = {'머리': m['머리 수'], '머리 높이': round(m['머리 높이 비'] * m['크기'][1] / m['크기'][0], 2) if '머리 높이 비' in m else None, '주인공': (m.get('주인공') or {}).get('가로'), '흑백': m['흑백']}
    return it
examples = {}
items = []
for key, col, feats in TASKS:
    ids = sorted(i for i in M['clip'] if all(i in M[f] for f in feats) and i in row)
    X = np.hstack([np.stack([M[f][i] for i in ids]) for f in feats]); y = np.array([str(row[i][I(col)]) for i in ids])
    work = np.array([i[:2] for i in ids]); classes = sorted(set(y)); P = np.zeros((len(ids), len(classes))); sw = WT.sample_weights(ids, col, y)
    done = {x['cut'] for x in WT.load()['labels'] if x['field'] == col}
    for w in sorted(set(work)):
        tr, te = work != w, work == w
        m = LogisticRegression(C=1.0, max_iter=3000).fit(X[tr], y[tr], sample_weight=sw[tr])
        P[np.ix_(np.where(te)[0], [classes.index(k) for k in m.classes_])] = m.predict_proba(X[te])
    # 라벨마다 대표 컷 3개: 사람 라벨과 모델이 모두 가장 확신하는 컷
    ex = {}
    for L in classes:
        j = classes.index(L); idx = [k for k in range(len(ids)) if y[k] == L]
        idx.sort(key=lambda k: -P[k, j]); ex[L] = [{'cut': ids[k], 'file': files.get(ids[k], '')} for k in idx[:3] if files.get(ids[k])]
    examples[col] = ex
    cand = []
    for k, i in enumerate(ids):
        if (key == 'shot' and i in seen) or i in done: continue
        cur = classes.index(y[k]); top = int(P[k].argmax())
        if top == cur: continue
        cand.append((P[k, top] - P[k, cur], k, i))
    cand.sort(reverse=True)
    keep = [enrich(x) for x in oldq['items'] if x['field'] == col]
    items.extend(keep)
    cand = [c_ for c_ in cand if f'{key}:{c_[2]}' not in old_ids]
    for gap, k, i in cand[:max(0, N[key] - len(keep))]:
        order = list(np.argsort(-P[k])); opts = [classes[j] for j in order[:4]]
        if y[k] not in opts: opts = opts[:3] + [y[k]]; opts.sort(key=lambda L: -P[k, classes.index(L)])
        items.append({'id': f'{key}:{i}', 'cut': i, 'field': col, 'col': 'HIJKLMNOPQ'[[*'샷 앵글 역할 감정'.split()].index(col)] if col in ('샷', '앵글', '역할', '감정') else '',
                      'current': y[k], 'options': [{'label': L, 'p': round(float(P[k, classes.index(L)]), 2)} for L in opts],
                      'file': files.get(i, ''), 'text': str(row[i][I('내용')] or ''), 'work': row[i][I('작품')], 'gap': round(float(gap), 2), 'new': KEEP})
        enrich(items[-1])
    print(col, '유지', len(keep), '+ 새', min(max(0, N[key] - len(keep)), len(cand)), '(후보', len(cand), ')')
meta = {'made': datetime.date.today().isoformat(), 'revision': d.get('__meta', {}).get('revision'),
        'how': '한 작품을 빼고 학습한 모델(그림 CLIP·DINOv2 + 글 E5)이 사람 라벨과 크게 어긋난다고 본 컷. 선택지는 지금 라벨 + 모델 확률 상위, 확률 순',
        'counts': {col: sum(1 for x in items if x['field'] == col) for _, col, _ in TASKS}, 'examples': examples}
out = ROOT / 'rough' / 'db' / 'review-queue.json'; out.write_text(json.dumps({'meta': meta, 'items': items}, ensure_ascii=False, separators=(',', ':')))
print('저장', out, len(items), '항목', round(out.stat().st_size / 1024), 'KB')
