#!/usr/bin/env python3
"""연출 DB 시트(Claude Sheets 「웹툰 연출 DB」)에서 내려받은 .xlsx로 러프 툴의 DB 사본과 파생 파일을 다시 만든다.

1. 시트 페이지에서 다운로드 → .xlsx (모든 시트가 들어 있어도 됨)
2. python3 tools/sync_db.py 내려받은.xlsx --revision 173
   - 컷표·작품 정보·작업 방법·5컷 리듬·장면·코드표만 읽어 rough/db/db.json으로(명경 시험 시트·요약·컬러 띠·썸네일은 제외)
   - 작품 정보의 집계 칸(수식)은 값이 없으면 행을 세어 채움
   - 값 검사(tools/validate_db.py) → 통과하면 patterns.json·nai-stats.js 다시 생성
   - --check: 파일을 바꾸지 않고 지금 사본과 다른 점만 보고
사용: python3 tools/sync_db.py <xlsx> [--revision N] [--check] [--no-build]
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
        out[s] = {'columns': cols, 'rows': body}
    return out

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
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args: sys.exit(__doc__)
    rev = sys.argv[sys.argv.index('--revision') + 1] if '--revision' in sys.argv else None
    new = read(args[0]); fill_counts(new)
    old = json.loads(OUT.read_text()) if OUT.exists() else {}
    diff = []
    for s in SHEETS:
        a = old.get(s, {'columns': [], 'rows': []}); b = new[s]
        if a.get('columns') != b['columns']: diff.append(f'{s}: 열 바뀜 {len(a.get("columns", []))}→{len(b["columns"])}')
        key = lambda r: json.dumps([int(v) if isinstance(v, float) and v.is_integer() else v for v in r], ensure_ascii=False)  # 2와 2.0은 같은 값
        ka = C.Counter(key(r) for r in a.get('rows', [])); kb = C.Counter(key(r) for r in b['rows'])
        add, rem = sum((kb - ka).values()), sum((ka - kb).values())
        if add or rem: diff.append(f'{s}: 행 {len(a.get("rows", []))}→{len(b["rows"])} (바뀐·새 행 {add}, 없어진·바뀌기 전 행 {rem})')
    print('바뀐 점:' if diff else '바뀐 점 없음'); [print('  ', x) for x in diff]
    if '--check' in sys.argv: return
    meta = {'source': 'Claude Sheets 「웹툰 연출 DB」', 'revision': int(rev) if rev else old.get('__meta', {}).get('revision'),
            'exported': datetime.date.today().isoformat(), 'sheets': SHEETS}
    tmp = OUT.with_suffix('.new.json')
    tmp.write_text(json.dumps({'__meta': meta, **new}, ensure_ascii=False, separators=(',', ':')))
    v = subprocess.run([sys.executable, str(ROOT / 'tools' / 'validate_db.py'), str(tmp)], capture_output=True, text=True)
    print(v.stdout.strip())
    if v.returncode:
        print(f'검사 실패: 사본을 바꾸지 않았어요. 검사한 파일은 {tmp} 에 남겨 두었어요.'); sys.exit(1)
    tmp.replace(OUT); print('저장', OUT.relative_to(ROOT))
    if '--no-build' in sys.argv: return
    for s in ('build_patterns.py', 'build_nai_stats.py'):
        r = subprocess.run([sys.executable, str(ROOT / 'tools' / s)], capture_output=True, text=True); print((r.stdout.strip().splitlines() or [''])[0])
        if r.returncode: print(r.stderr); sys.exit(1)

if __name__ == '__main__':
    main()
