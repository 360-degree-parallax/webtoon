#!/usr/bin/env python3
"""연출 DB 사본(rough/db/db.json) 값 검사. 오류가 있으면 종료 코드 1.

- 정해진 값: 컷표 유형·샷·앵글·역할·감정·덩어리 색, 5컷 리듬 연출명·주된 컷 전환·템포·VNG 기호가 코드표 목록 안에 있는지
- 파생 칸: 칸 형태(끝까지·칸·여러 칸·칸 없음)·사선(0/1)·자동 말풍선·나레이션 상자(0 이상 정수)
- 일관성: 컷ID 중복·형식, 5컷 리듬 묶음이 컷표에 있는지, VNG 칸 수 = 그 묶음 그림 컷 수,
  리듬 유형 = '거리 흐름 · 템포 · 서사 형태', 연출명 빈칸은 그림 2컷 이하만, 장면 컷 범위의 컷이 있는지,
  작품 정보의 컷 수·묶음 수·장면 수·화수가 실제 행과 같은지
사용: python3 tools/validate_db.py [db.json 경로] [--quiet]
"""
import json, re, sys, collections as C, pathlib
P = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else pathlib.Path(__file__).resolve().parent.parent / 'rough' / 'db' / 'db.json'
d = json.loads(P.read_text())
err, warn = [], []
code = C.defaultdict(set)
for r in d['코드표']['rows']:
    if r[0] and r[1]:
        code[r[0]].add(r[1])
        if r[0] == 'VNG 서사 구조' and r[2]: code['VNG'].add(r[2])
code['템포'] = {'빠름', '보통', '느림'}

def T(name):
    t = d[name]; c = t['columns']; return t['rows'], (lambda k: c.index(k)), c

# 컷표
R, I, cc = T('컷표')
# 메모에서 나눈 파생 칸(tools/db_derive.py): 값 범위, 그리고 메모에 판정 글이 다시 남아 있지 않은지
if '칸 형태' in cc:
    for r in R:
        cid = r[I('컷ID')]; f = r[I('칸 형태')]
        if f not in (None, '끝까지', '칸', '여러 칸', '칸 없음'): err.append(f'컷표 {cid}: 칸 형태 값 "{f}"')
        if f is not None and r[I('사선')] not in (0, 1): err.append(f'컷표 {cid}: 사선 값 "{r[I("사선")]}"')
        for k in ('자동 말풍선', '나레이션 상자'):
            if f is not None and not (isinstance(r[I(k)], int) and r[I(k)] >= 0): err.append(f'컷표 {cid}: {k} 값 "{r[I(k)]}"')
        if str(r[I('메모')] or '').startswith('칸:'): warn.append(f'컷표 {cid}: 메모에 칸 판정 글이 남아 있음(tools/db_derive.py로 나누기)')
ids = C.Counter(r[I('컷ID')] for r in R)
for k, n in ids.items():
    if n > 1: err.append(f'컷표: 컷ID 중복 {k} ({n}번)')
    if not re.fullmatch(r'[A-Z]{2}-\d{2}-\d{3}', str(k)): err.append(f'컷표: 컷ID 형식 {k}')
for r in R:
    cid = r[I('컷ID')]
    for col, cat in (('유형', '유형'), ('샷', '샷'), ('앵글', '앵글'), ('역할', '역할'), ('감정', '감정'), ('덩어리 색', '덩어리 색')):
        v = r[I(col)]
        if v in (None, '') and (col in ('유형', '덩어리 색') or r[I('유형')] == '그림'):
            err.append(f'컷표 {cid}: {col} 빈칸')
        elif v not in (None, '') and v not in code[cat]:
            err.append(f'컷표 {cid}: {col} 값 "{v}"이 코드표에 없음')
pics = C.Counter(r[I('5컷묶음')] for r in R if r[I('유형')] == '그림')
groups_in_cut = set(r[I('5컷묶음')] for r in R if r[I('5컷묶음')])

# 5컷 리듬
RR, J, rc = T('5컷 리듬')
seen = C.Counter(r[J('묶음')] for r in RR)
for k, n in seen.items():
    if n > 1: err.append(f'5컷 리듬: 묶음 중복 {k}')
for r in RR:
    g = r[J('묶음')]
    if g not in groups_in_cut: err.append(f'5컷 리듬 {g}: 컷표에 이 묶음의 컷이 없음')
    name = r[J('연출명')]
    if name and name not in code['연출명']: err.append(f'5컷 리듬 {g}: 연출명 "{name}"이 코드표에 없음')
    if not name and pics[g] > 2: err.append(f'5컷 리듬 {g}: 그림 {pics[g]}컷인데 연출명 빈칸')
    if r[J('주된 컷 전환')] not in code['컷 전환'] | {'—', None}: err.append(f'5컷 리듬 {g}: 주된 컷 전환 "{r[J("주된 컷 전환")]}"')
    if r[J('템포')] not in code['템포']: err.append(f'5컷 리듬 {g}: 템포 "{r[J("템포")]}"')
    vng = [x for x in str(r[J('서사 구조(VNG)')] or '').split('→') if x]
    if any(x not in code['VNG'] for x in vng): err.append(f'5컷 리듬 {g}: VNG 기호 {vng}')
    if vng and len(vng) != pics[g]: err.append(f'5컷 리듬 {g}: VNG {len(vng)}칸 ≠ 그림 {pics[g]}컷')
    want = f"{r[J('거리 흐름')]} · {r[J('템포')]} · {r[J('서사 형태')]}"
    if r[J('리듬 유형')] != want: err.append(f'5컷 리듬 {g}: 리듬 유형 "{r[J("리듬 유형")]}" ≠ "{want}"')
for g in groups_in_cut - set(seen): warn.append(f'컷표에는 있는데 5컷 리듬에 없는 묶음 {g}')

# 장면
SR, S, sc = T('장면')
for k, n in C.Counter(r[S('장면ID')] for r in SR).items():
    if n > 1: err.append(f'장면: 장면ID 중복 {k}')
for r in SR:
    parts = [x.strip() for x in str(r[S('컷 범위')] or '').split(',') if x.strip()]
    if not parts: err.append(f'장면 {r[S("장면ID")]}: 컷 범위 빈칸')
    for part in parts:   # 'GM-01-016' 한 컷, 'GM-01-047~050' 범위, 쉼표로 여러 개
        m = re.fullmatch(r'([A-Z]{2}-\d{2})-(\d{3})(?:~(\d{3}))?', part)
        if not m: err.append(f'장면 {r[S("장면ID")]}: 컷 범위 형식 "{part}"'); continue
        for n in filter(None, (m.group(2), m.group(3))):
            if f'{m.group(1)}-{n}' not in ids: err.append(f'장면 {r[S("장면ID")]}: 컷 {m.group(1)}-{n} 없음')

# 작품 정보 집계
WR, W, wc = T('작품 정보')
for r in WR:
    w = r[W('작품')]
    real = {'컷 수': sum(1 for x in R if x[I('작품')] == w), '5컷 묶음 수': sum(1 for x in RR if x[J('작품')] == w),
            '장면 수': sum(1 for x in SR if x[S('작품')] == w), '분석 화수': len(set(x[I('화')] for x in R if x[I('작품')] == w))}
    for k, v in real.items():
        try: ok = int(float(r[W(k)])) == v
        except (TypeError, ValueError): ok = False
        if not ok: err.append(f'작품 정보 {w}: {k} {r[W(k)]} ≠ 실제 {v}')

q = '--quiet' in sys.argv
print(f'검사: 컷 {len(R)} · 묶음 {len(RR)} · 장면 {len(SR)} · 작품 {len(WR)} → 오류 {len(err)} · 경고 {len(warn)}')
for e in (err if q else err + ['경고: ' + w for w in warn])[:60]: print(' ', e)
if len(err) > 60: print(f'  … 외 {len(err) - 60}개')
sys.exit(1 if err else 0)
