#!/usr/bin/env python3
"""연출 DB 컷표의 '내용'(묘사·대사)과 사람이 붙인 감정·강도로 가벼운 감정 판정표를 학습한다.

- 글자 2~3그램 나이브 베이즈. 감정 14종, 강도 1~3(그림 컷)
- 평가: 한 작품을 빼고 나머지로 학습해 뺀 작품을 맞히는 방식(새 글에도 통하는지)
- 내보내기: rough/emotion-model.js — 감정마다 변별력 큰 조각만 남긴 점수표(엔진이 규칙 낱말이 없을 때 씀)
사용: python3 tools/train_emotion.py [--top 400]
"""
import json, math, re, sys, collections as C, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
DB = json.loads((ROOT / 'rough' / 'db' / 'db.json').read_text())
TOP = int(sys.argv[sys.argv.index('--top') + 1]) if '--top' in sys.argv else 400
t = DB['컷표']; c = t['columns']; I = c.index

def norm(s):
    s = re.sub(r'\([A-Z ]+\)', ' ', str(s or ''))          # (THUMP) 같은 영문 효과음 표기
    s = re.sub(r'[①-⑳"“”\'‘’.,~…·:;()\[\]/]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()
def feats(s):
    s = norm(s); out = set()
    for w in s.split(' '):
        w = f'^{w}$'
        for n in (2, 3):
            for k in range(len(w) - n + 1):
                g = w[k:k + n]
                if g not in ('^$',): out.add(g)
    if '!' in s: out.add('<!>')
    if '?' in s: out.add('<?>')
    return out

rows = [r for r in t['rows'] if r[I('유형')] == '그림' and r[I('감정')]]
data = [(r[0], feats(r[I('내용')]), r[I('감정')], int(r[I('강도')] or 1)) for r in rows]

def train(items, key):
    cls = C.Counter(); ff = C.defaultdict(C.Counter); bg = C.Counter()
    for it in items:
        y = it[key]; cls[y] += 1
        for f in it[1]: ff[y][f] += 1; bg[f] += 1
    return cls, ff, bg
def model(cls, ff, bg, top=None, a=1.0):
    N = sum(cls.values()); V = len(bg)
    prior = {y: math.log(n / N) for y, n in cls.items()}
    w = {}
    for y in cls:
        tot = cls[y]
        # 문서 빈도 기반 베르누이형 로그 비(그 감정에서의 등장률 / 전체 등장률)
        sc = {f: math.log((ff[y][f] + a) / (tot + 2 * a)) - math.log((bg[f] + a) / (N + 2 * a)) for f in bg if bg[f] >= 3}
        keep = sorted(sc.items(), key=lambda x: -abs(x[1]) * math.log(1 + bg[x[0]]))
        w[y] = dict(keep[:top]) if top else sc
    return prior, w
def predict(prior, w, fs, prior_k=1.0):
    return max(prior, key=lambda y: prior_k * prior[y] + sum(w[y].get(f, 0) for f in fs))

works = sorted(set(d[0] for d in data))
res = {}
for key, name in ((2, '감정'), (3, '강도')):
    ok = C.Counter(); n = C.Counter(); base = C.Counter()
    for wk in works:
        tr = [d for d in data if d[0] != wk]; te = [d for d in data if d[0] == wk]
        cls, ff, bg = train(tr, key); prior, w = model(cls, ff, bg, TOP)
        maj = cls.most_common(1)[0][0]
        for d in te:
            n[wk] += 1; ok[wk] += predict(prior, w, d[1]) == d[key]; base[wk] += maj == d[key]
    res[name] = {wk: (ok[wk] / n[wk], base[wk] / n[wk]) for wk in works}
    tot = sum(ok.values()) / sum(n.values()); tb = sum(base.values()) / sum(n.values())
    print(f'{name}: 한 작품 빼고 평가 정확도 {tot:.1%} (가장 흔한 값 {tb:.1%})', {wk[:4]: f'{v[0]:.0%}' for wk, v in res[name].items()})

# 전체로 학습해 내보내기
out = {}
for key, name in ((2, 'emo'), (3, 'int')):
    cls, ff, bg = train(data, key); prior, w = model(cls, ff, bg, TOP)
    out[name] = {'prior': {str(k): round(v, 3) for k, v in prior.items()}, 'w': {str(y): {f: round(s, 2) for f, s in ws.items()} for y, ws in w.items()}}
meta = {'source': 'rough/db/db.json', 'revision': DB.get('__meta', {}).get('revision'), 'cuts': len(data), 'top': TOP,
        'eval': {k: {wk: round(v[0], 3) for wk, v in r.items()} for k, r in res.items()}}
js = ('/* 자동 생성: tools/train_emotion.py — 연출 DB 컷 글로 학습한 감정·강도 점수표(글자 2~3그램). 손으로 고치지 마세요. */\n'
      '(function (M) { Object.assign(M, ' + json.dumps({'meta': meta, **out}, ensure_ascii=False, separators=(',', ':')) + '); })'
      "(typeof module !== 'undefined' ? module.exports : (window.RoughEmotion = {}));\n")
(ROOT / 'rough' / 'emotion-model.js').write_text(js)
print('emotion-model.js', round(len(js.encode()) / 1024), 'KB')
