#!/usr/bin/env python3
"""rough/cuts의 컷 이미지(사이트에 올라가는 사본)를 같은 크기(폭 690)로 다시 압축해 용량을 줄인다.

- JPEG 품질 72 · 4:2:0 · progressive · optimize. 파일 이름·경로·해상도는 그대로(컷 경로는 ID에서 계산)
- 이미 줄인 파일은 JPEG 주석 'rough-q72'로 알아보고 건너뜀(여러 번 돌려도 화질이 더 떨어지지 않음)
- 새 파일이 더 크면 원래 파일을 둠. 원본 고화질은 비공개 cuts/ 서브모듈에 있음
사용: python3 tools/shrink_cuts.py [--dry]
"""
import sys, io, glob, os, pathlib
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parent.parent / 'rough' / 'cuts'
MARK = b'rough-q72'; dry = '--dry' in sys.argv
before = after = n = skip = 0
for f in sorted(glob.glob(str(ROOT / '*' / '*' / '*.jpg'))):
    size = os.path.getsize(f); before += size
    im = Image.open(f)
    if im.info.get('comment') == MARK: after += size; skip += 1; continue
    b = io.BytesIO(); im.convert('RGB').save(b, 'JPEG', quality=72, optimize=True, progressive=True, subsampling=2, comment=MARK)
    if b.tell() < size:
        if not dry: open(f, 'wb').write(b.getvalue())
        after += b.tell(); n += 1
    else: after += size
print(f'컷 이미지 {n}장 다시 압축 · 건너뜀 {skip} · {before // 2**20}MB → {after // 2**20}MB' + (' (시험)' if dry else ''))
