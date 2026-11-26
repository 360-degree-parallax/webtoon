#!/usr/bin/env python3
"""연출 DB 시트(Claude Sheets 「웹툰 연출 DB」)에서 내려받은 .xlsx로 러프 툴의 DB 사본과 파생 파일을 다시 만든다.

1. 시트 페이지에서 다운로드 → .xlsx (모든 시트가 들어 있어도 됨)
2. python3 tools/sync_db.py 내려받은.xlsx --revision 173
   - 컷표·작품 정보·작업 방법·5컷 리듬·장면·코드표만 읽어 rough/db/db.json으로(명경 시험 시트·요약·컬러 띠·썸네일은 제외)
   - 작품 정보의 집계 칸(수식)은 값이 없으면 행을 세어 채움
   - 컷표 메모의 자동 판정 글을 칸 형태·사선·자동 말풍선·나레이션 상자 칸(맨 뒤)으로 나눔(tools/db_derive.py)
   - 값 검사(tools/validate_db.py) → 통과하면 저장, patterns.json·nai-stats.js·db/cut-text.json 다시 생성
   - --check: 파일을 바꾸지 않고 지금 사본과 다른 점만 보고
   - xlsx를 여러 개 주면 행을 이어 붙임(「웹툰 연출 DB」가 셀 한도에 닿아 HM·SL은 「웹툰 연출 DB 2」에 있음).
     코드표·작업 방법은 첫 파일 것을 씀. --revision은 첫 파일, --revision2는 두 번째 파일의 리비전
   - 「동작」 시트(컷ID·동작·인원·상호작용·확인, 「웹툰 연출 DB 2」)가 들어 있으면 rough/db/actions.json으로(시트에서 고친 값이 사본에 반영)
사용: python3 tools/sync_db.py <xlsx> [<xlsx2> …] [--revision N] [--revision2 M] [--check] [--no-build]
"""
import sys, json, datetime, subprocess, pathlib, collections as C
import openpyxl
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'rough' / 'db' / 'db.json'
SHEETS = ['컷표', '작품 정보', '작업 방법', '5컷 리듬', '장면', '코드표']

def cell(v):
    if isinstance(v, datetime.datetime): return v.date().isoformat()
    if isinstance(v, datetime.date): return v.isoformat()
    if isinstance(v, str):
        v = v.strip()
        return v if v != '' else None
    return v

def read(path):
    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    missing = [s for s in SHEETS if s not in wb.sheetnames]
    if missing: sys.exit(f'xlsx에 시트가 없어요: {", ".join(missing)}')
    out = {}
    for s in SHEETS:
        rows = [[cell(v) for v in r] for r in wb[s].iter_rows(values_only=True)]
        head = rows[0]; n = max(i for i, h in enumerate(head) if h not in (None, '')) + 1
        cols = [str(h) for h in head[:n]]
        body = [r[:n] + [None] * (n - len(r[:n])) for r in rows[1:]]
        body = [r for r in body if any(v not in (None, '') for v in r)]
        if s == '작품 정보' and '코드' in cols: body = [r for r in body if r[cols.index('코드')]]  # 코드 없는 행은 안내 메모
        out[s] = {'columns': cols, 'rows': body}
    return out

def read_actions(paths):
    """「동작」 시트 → rough/db/actions.json (없으면 None)"""
    for path in paths:
        wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
        if '동작' not in wb.sheetnames: continue
        rows = [[cell(v) for v in r] for r in wb['동작'].iter_rows(values_only=True)]
        h = [str(x) for x in rows[0]]; I = h.index
        num = lambda v: int(v) if isinstance(v, (int, float)) else (int(v) if str(v or '').strip().isdigit() else None)
        cuts = {r[I('컷ID')]: {'a': r[I('동작')] or '', 'n': num(r[I('인원')]), 'i': r[I('상호작용')] or '', 'q': r[I('확인')] or ''} for r in rows[1:] if r and r[I('컷ID')]}
        return {'made': datetime.date.today().isoformat(), 'how': '시트 「동작」(웹툰 연출 DB 2)', 'cuts': cuts}
    return None

def fill_counts(d):
    # 작품 정보 집계 칸: 내려받은 파일에 수식 값이 없으면(None) 직접 셈
    w = d['작품 정보']; c = w['columns']; cut = d['컷표']; cc = cut['columns']
    for r in w['rows']:
        name = r[c.index('작품')]
        rows = [x for x in cut['rows'] if x[cc.index('작품')] == name]
        calc = {'분석 화수': len(set(x[cc.index('화')] for x in rows)), '컷 수': len(rows),
                '5컷 묶음 수': sum(1 for x in d['5컷 리듬']['rows'] if x[0] == name), '장면 수': sum(1 for x in d['장면']['rows'] if x[0] == name)}
        for k, v in calc.items():
            if k in c and r[c.index(k)] in (None, ''): r[c.index(k)] = v

def main():
    opt = lambda k: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else None
    rev, rev2 = opt('--revision'), opt('--revision2')
    args = [a for i, a in enumerate(sys.argv[1:], 1) if not a.startswith('--') and sys.argv[i - 1] not in ('--revision', '--revision2')]
    if not args: sys.exit(__doc__)
    new = read(args[0])
    for extra in args[1:]:
        more = read(extra)
        for s in ('컷표', '작품 정보', '5컷 리듬', '장면'):
            if more[s]['columns'] != new[s]['columns']: sys.exit(f'{extra}: {s} 열이 첫 파일과 달라요')
            new[s]['rows'] += more[s]['rows']
    fill_counts(new)
    from db_derive import derive  # 메모의 자동 판정(칸 형태·사선·말풍선 수)을 따로 칸으로
    print(f'메모 → 칸 형태·사선·자동 말풍선·나레이션 상자: {derive(new)}행')
    old = json.loads(OUT.read_text()) if OUT.exists() else {}
    diff = []
    for s in SHEETS:
        a = old.get(s, {'columns': [], 'rows': []}); b = new[s]
        # 시트 밖에서 합친 열은 비교에서 뺌
        keep = [i for i, h in enumerate(a.get('columns', [])) if h in b['columns']]
        a = {'columns': [a['columns'][i] for i in keep], 'rows': [[r[i] for i in keep] for r in a.get('rows', [])]}
        if a.get('columns') != b['columns']: diff.append(f'{s}: 열 바뀜 {len(a.get("columns", []))}→{len(b["columns"])}')
        key = lambda r: json.dumps([int(v) if isinstance(v, float) and v.is_integer() else v for v in r], ensure_ascii=False)  # 2와 2.0은 같은 값
        ka = C.Counter(key(r) for r in a.get('rows', [])); kb = C.Counter(key(r) for r in b['rows'])
        add, rem = sum((kb - ka).values()), sum((ka - kb).values())
        if add or rem: diff.append(f'{s}: 행 {len(a.get("rows", []))}→{len(b["rows"])} (바뀐·새 행 {add}, 없어진·바뀌기 전 행 {rem})')
    print('바뀐 점:' if diff else '바뀐 점 없음'); [print('  ', x) for x in diff]
    if '--check' in sys.argv: return
    om = old.get('__meta', {})
    meta = {'source': 'Claude Sheets 「웹툰 연출 DB」' + (' + 「웹툰 연출 DB 2」' if len(args) > 1 else ''),
            'revision': int(rev) if rev else om.get('revision'), 'exported': datetime.date.today().isoformat(), 'sheets': SHEETS}
    if len(args) > 1: meta['revision2'] = int(rev2) if rev2 else om.get('revision2')
    tmp = OUT.with_suffix('.new.json')
    tmp.write_text(json.dumps({'__meta': meta, **new}, ensure_ascii=False, separators=(',', ':')))
    v = subprocess.run([sys.executable, str(ROOT / 'tools' / 'validate_db.py'), str(tmp)], capture_output=True, text=True)
    print(v.stdout.strip())
    if v.returncode:
        print(f'검사 실패: 사본을 바꾸지 않았어요. 검사한 파일은 {tmp} 에 남겨 두었어요.'); sys.exit(1)
    tmp.replace(OUT); print('저장', OUT.relative_to(ROOT))
    acts = read_actions(args)
    if acts: (ROOT / 'rough' / 'db' / 'actions.json').write_text(json.dumps(acts, ensure_ascii=False)); print('동작 시트 →', len(acts['cuts']), '컷 rough/db/actions.json')
    if '--no-build' in sys.argv: return
    for s in ('build_patterns.py', 'build_nai_stats.py', 'build_db_lite.py'):
        r = subprocess.run([sys.executable, str(ROOT / 'tools' / s)], capture_output=True, text=True); print((r.stdout.strip().splitlines() or [''])[0])
        if r.returncode: print(r.stderr); sys.exit(1)

if __name__ == '__main__':
    main()
