#!/usr/bin/env python3
[보류] 앵글 재검수를 미루면서 함께 멈춘 실험 도구. 검증 전이라 파이프라인에 연결하지 않음.
"""컷 이미지에서 카메라 앵글의 원근 단서를 잰다(사람 판정 감사용, 정답 아님).

단서: 세로 방향 선분(건물 모서리·기둥·문틀·창틀 등)이 어느 쪽으로 모이는지(3점 투시의 세 번째 소실점)
  - 위쪽으로 모임(소실점이 컷 위)  → 올려다봄 = 로우앵글 쪽
  - 아래쪽으로 모임(소실점이 컷 아래) → 내려다봄 = 하이앵글·탑뷰 쪽
  - 거의 평행 → 수평(아이레벨) 또는 판단할 선이 없음
방법: LSD 선분 검출 → 세로에서 35° 안쪽, 컷 높이의 6% 이상인 선분만 → RANSAC으로 공통 교점(세로 소실점)을 찾음
출력: vy = 소실점 y를 컷 높이로 나눈 값(0=위 끝, 1=아래 끝), 지지 선분 수, 판정(up/down/flat/none)
사용: python3 tools/pipeline/angle_cues.py [컷ID ...] [--all] [--out rough/db/angle_cues.json]
"""
import sys, json, math, random, pathlib, csv
import numpy as np, cv2
ROOT = pathlib.Path(__file__).resolve().parents[2]
CUTS = ROOT / 'rough' / 'cuts'

def segments(img):
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = g.shape
    s = 900 / max(h, w)
    if s < 1: g = cv2.resize(g, (int(w * s), int(h * s)), interpolation=cv2.INTER_AREA); h, w = g.shape
    lsd = cv2.createLineSegmentDetector(cv2.LSD_REFINE_STD)
    L = lsd.detect(g)[0]
    out = []
    if L is None: return out, h, w
    for x1, y1, x2, y2 in np.asarray(L).reshape(-1, 4):
        dx, dy = x2 - x1, y2 - y1; ln = math.hypot(dx, dy)
        if ln < 0.06 * h: continue
        ang = math.degrees(math.atan2(abs(dx), abs(dy)))   # 0 = 정확히 세로
        if ang > 35: continue
        out.append((x1, y1, x2, y2, ln))
    return out, h, w

def line(s):
    x1, y1, x2, y2, _ = s
    a, b = y1 - y2, x2 - x1; c = -(a * x1 + b * y1); n = math.hypot(a, b)
    return a / n, b / n, c / n

def cues(path, iters=400, seed=0):
    img = cv2.imread(str(path))
    if img is None: return None
    S, h, w = segments(img)
    res = {'n': len(S), 'h': h, 'w': w}
    if len(S) < 4: res.update(kind='none'); return res
    Ls = [line(s) for s in S]; W = np.array([s[4] for s in S])
    mids = np.array([((s[0] + s[2]) / 2, (s[1] + s[3]) / 2) for s in S])
    dirs = np.array([((s[2] - s[0]), (s[3] - s[1])) for s in S]); dirs /= np.linalg.norm(dirs, axis=1, keepdims=True)
    rnd = random.Random(seed); best = (0, None, None)
    # 무한 소실점(평행) 후보: 모든 선이 정확히 세로
    def support(vp):
        if vp is None: v = np.tile([0.0, 1.0], (len(S), 1))
        else:
            v = vp[None, :] - mids; nv = np.linalg.norm(v, axis=1, keepdims=True); nv[nv == 0] = 1; v = v / nv
        cos = np.abs((v * dirs).sum(1))
        inl = cos > math.cos(math.radians(2.0))
        return (W * inl).sum(), inl
    sc, inl = support(None); best = (sc, None, inl)
    for _ in range(iters):
        i, j = rnd.sample(range(len(S)), 2)
        a1, b1, c1 = Ls[i]; a2, b2, c2 = Ls[j]
        d = a1 * b2 - a2 * b1
        if abs(d) < 1e-9: continue
        x = (b1 * c2 - b2 * c1) / d; y = (a2 * c1 - a1 * c2) / d
        if 0 <= y <= h: continue                 # 컷 안의 교점은 세로 소실점이 아님
        sc, inl = support(np.array([x, y]))
        if sc > best[0]: best = (sc, np.array([x, y]), inl)
    sc, vp, inl = best
    k = int(inl.sum()); tot = W.sum()
    res.update(support=k, share=round(float(sc / tot), 3))
    if vp is None: res.update(kind='flat', vy=None); return res
    vy = float(vp[1] / h)
    res['vy'] = round(vy, 2)
    # 소실점이 컷 높이의 12배보다 멀면 사실상 평행
    if k < 3 or abs(vy - 0.5) > 12: res['kind'] = 'flat' if k >= 3 else 'none'
    else: res['kind'] = 'up' if vy < 0 else 'down'
    # 기울기 세기: 컷 높이 대비 소실점 거리의 역수(클수록 강한 투시)
    res['strength'] = round(1 / max(abs(vy - 0.5), 0.5), 3)
    return res

def main():
    rows = {r['cut_id']: r for r in csv.DictReader(open(CUTS / 'manifest.csv', encoding='utf-8-sig'))}
    ids = [a for a in sys.argv[1:] if not a.startswith('--') and a in rows]
    if '--all' in sys.argv: ids = [k for k, r in rows.items() if r['type'] == '그림']
    out = {}
    for n, cid in enumerate(ids):
        r = cues(CUTS / rows[cid]['file'])
        if r: out[cid] = r
        if len(ids) < 20: print(cid, r)
        elif n % 500 == 0: print(n, '/', len(ids), file=sys.stderr)
    if '--out' in sys.argv:
        p = ROOT / sys.argv[sys.argv.index('--out') + 1]; p.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':'))); print('저장', p, len(out))

if __name__ == '__main__':
    main()
