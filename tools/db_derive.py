#!/usr/bin/env python3
"""컷표 '메모' 칸에 글로 섞여 있던 자동 판정을 따로 칸으로 나눈다(시트 밖에서 만드는 파생 칸).

메모 예: '칸: 끝까지(테두리 없음) · 사선 · 자동 말풍선 2 · 나레이션 상자 1 / 회차 첫 대형 컷'
  → 칸 형태 = 끝까지 · 사선 = 1 · 자동 말풍선 = 2 · 나레이션 상자 = 1 · 메모 = '회차 첫 대형 컷'
- 칸 형태: 끝까지(테두리 없이 화면 폭 끝까지) / 칸(테두리 있는 칸) / 여러 칸(한 그림에 여러 칸) / 칸 없음
- 자동 판정이 없는 행(그림이 아닌 컷 등)은 새 칸을 비워 둠. '/' 뒤나 판정이 아닌 메모는 메모 칸에 그대로 남김
- 여러 번 돌려도 결과가 같음(이미 나눈 사본에 다시 돌려도 됨)
사용: python3 tools/db_derive.py [db.json]   (tools/sync_db.py·reanalyse_cuts.py가 저장 전에 부름)
"""
import json, re, sys, pathlib

COLS = ['칸 형태', '사선', '자동 말풍선', '나레이션 상자']
FORM = {'끝까지(테두리 없음)': '끝까지', '끝까지': '끝까지', '칸': '칸', '여러 칸': '여러 칸', '칸 없음': '칸 없음'}
AUTO = re.compile(r'^칸:\s*([^·/]+?)\s*((?:·\s*[^·/]+?\s*)*)\s*(?:/\s*(.*))?$')


def parse(memo):
    """메모 → (칸 형태, 사선, 자동 말풍선, 나레이션 상자, 남은 메모) 또는 판정이 없으면 None"""
    if not isinstance(memo, str): return None
    m = AUTO.match(memo.strip())
    if not m or m.group(1).strip() not in FORM: return None
    parts = [p.strip() for p in (m.group(2) or '').split('·') if p.strip()]
    diag = 1 if '사선' in parts else 0
    num = lambda k: next((int(x.group(1)) for p in parts if (x := re.fullmatch(k + r'\s*(\d+)', p))), 0)
    rest = (m.group(3) or '').strip() or None
    return FORM[m.group(1).strip()], diag, num('자동 말풍선'), num('나레이션 상자'), rest


def derive(d):
    """db 사전(컷표 포함)을 그 자리에서 고침. 돌려주는 값: 나눈 행 수"""
    t = d['컷표']; c = t['columns']
    if '메모' not in c: return 0
    # 새 칸은 맨 뒤에: 시트와 같은 칸 순서(판정 큐가 시트 칸 글자 H~K로 되돌려 씀)를 흔들지 않게
    for k in COLS:
        if k not in c:
            c.append(k)
            for r in t['rows']: r.append(None)
    mi, idx = c.index('메모'), [c.index(k) for k in COLS]
    n = 0
    for r in t['rows']:
        p = parse(r[mi])
        if not p: continue
        for i, v in zip(idx, p[:4]): r[i] = v
        r[mi] = p[4]; n += 1
    return n


if __name__ == '__main__':
    P = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent.parent / 'rough' / 'db' / 'db.json'
    d = json.loads(P.read_text())
    n = derive(d)
    P.write_text(json.dumps(d, ensure_ascii=False, separators=(',', ':')))
    print(f'메모 → 칸 형태·사선·자동 말풍선·나레이션 상자: {n}행 나눔')
