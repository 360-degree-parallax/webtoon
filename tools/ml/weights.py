"""사람이 확인한 라벨에 학습 가중치를 주는 공용 함수.

확인 기록: rough/db/verified.json — {"weights": {...}, "labels": [{cut, field, value, by, at}, ...]}
- by "user": 판정 화면에서 사용자가 직접 고른 값(지금 값 유지도 확인으로 침) → 가장 큰 가중치
- by "claude": Claude가 원본을 보고 검수한 값(앵글 재검수 358컷, 샷 재검수 300컷 등)
- 기록이 없는 컷은 1
라벨이 지금 DB 값과 다르면(그 뒤 다시 바뀜) 가중치를 주지 않음
"""
import json, pathlib
import numpy as np
ROOT = pathlib.Path(__file__).resolve().parents[2]
PATH = ROOT / 'rough' / 'db' / 'verified.json'
DEFAULT = {'user': 5.0, 'claude': 2.0}

def load():
    if not PATH.exists(): return {'weights': dict(DEFAULT), 'labels': []}
    d = json.loads(PATH.read_text()); d.setdefault('weights', dict(DEFAULT)); d.setdefault('labels', []); return d

def save(d):
    d['labels'].sort(key=lambda x: (x['field'], x['cut'], x.get('at', '')))
    PATH.write_text(json.dumps(d, ensure_ascii=False, indent=0, separators=(',', ':')))

def add(d, cut, field, value, by, at):
    """같은 컷·분야는 마지막 기록만 남김. 사용자(user) 기록은 Claude 기록으로 덮지 않음"""
    ex = [x for x in d['labels'] if x['cut'] == cut and x['field'] == field]
    if by != 'user' and any(x['by'] == 'user' for x in ex): return
    d['labels'] = [x for x in d['labels'] if not (x['cut'] == cut and x['field'] == field)] + [{'cut': cut, 'field': field, 'value': value, 'by': by, 'at': at}]

def sample_weights(ids, field, y):
    """ids·y(지금 라벨)와 같은 길이의 가중치 배열"""
    d = load(); W = d['weights']; best = {}
    for x in d['labels']:
        if x['field'] != field: continue
        k = x['cut']; w = W.get(x['by'], 1.0)
        if k not in best or w > best[k][0]: best[k] = (w, x['value'])
    out = np.ones(len(ids))
    for n, (i, lab) in enumerate(zip(ids, y)):
        b = best.get(i)
        if b and str(b[1]) == str(lab): out[n] = b[0]
    return out

def summary(field=None):
    d = load(); c = {}
    for x in d['labels']:
        if field and x['field'] != field: continue
        c[(x['field'], x['by'])] = c.get((x['field'], x['by']), 0) + 1
    return c
