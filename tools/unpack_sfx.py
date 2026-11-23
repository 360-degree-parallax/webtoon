#!/usr/bin/env python3
"""효과음 소재 묶음(ZIP: 효과음-목록.csv + png/번호/A~D.png, 615종)을 사이트 기본 묶음 rough/sfx/로 풀기.
브라우저(materials.js builtin)는 rough/sfx/list.csv를 읽고, 그림은 쓸 때 하나씩 받아 옴.
사용: python3 tools/unpack_sfx.py 효과음.zip
"""
import sys, zipfile, pathlib, re, shutil
ROOT = pathlib.Path(__file__).resolve().parent.parent / 'rough' / 'sfx'
z = zipfile.ZipFile(sys.argv[1])
csv = z.read('효과음-목록.csv').decode('utf-8')
lines = csv.strip().splitlines(); rows = [l.split(',') for l in lines[1:]]
for r in rows:
    id_, word, cat, paths = r[0], r[1], r[2], r[4:]
    assert re.fullmatch(r'\d{3}', id_) and word and cat and len(paths) == 4, r
    assert [p for p in paths] == [f'png/{id_}/{v}.png' for v in 'ABCD'], r
if ROOT.exists(): shutil.rmtree(ROOT)
ROOT.mkdir(parents=True)
(ROOT / 'list.csv').write_text(csv)
n = 0
for r in rows:
    for p in r[4:]:
        out = ROOT / p; out.parent.mkdir(parents=True, exist_ok=True); out.write_bytes(z.read(p)); n += 1
size = sum(f.stat().st_size for f in ROOT.rglob('*') if f.is_file())
print(f'{len(rows)}종 · 그림 {n}장 · {size / 2**20:.1f}MB → {ROOT}')
