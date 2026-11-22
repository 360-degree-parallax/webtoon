#!/usr/bin/env python3
"""컷 이미지(rough/cuts/작품/화/*.jpg)의 목록용 WebP 썸네일을 rough/cuts/thumbs/에 만든다.

- 240×360 상자 안에 비율을 유지해 줄이고 WebP 품질 62로 저장(레티나 화면의 120px 안팎 목록용).
- 이미 있고 원본보다 새 썸네일은 건너뜀. 원본이 없어진 썸네일은 지움.
사용: python3 tools/build_thumbs.py [-j 프로세스 수]
"""
import os, sys, pathlib
from concurrent.futures import ProcessPoolExecutor
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent / 'rough' / 'cuts'
OUT = ROOT / 'thumbs'
BOX = (240, 360)
Q = 62

def job(src):
    src = pathlib.Path(src)
    dst = OUT / src.relative_to(ROOT).with_suffix('.webp')
    if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
        return 0
    dst.parent.mkdir(parents=True, exist_ok=True)
    im = Image.open(src).convert('RGB')
    im.thumbnail(BOX, Image.LANCZOS)
    im.save(dst, 'WEBP', quality=Q, method=6)
    return 1

def main():
    j = int(sys.argv[sys.argv.index('-j') + 1]) if '-j' in sys.argv else os.cpu_count()
    srcs = sorted(str(p) for p in ROOT.glob('[A-Z][A-Z]/[0-9][0-9]/*.jpg'))
    with ProcessPoolExecutor(j) as ex:
        made = sum(ex.map(job, srcs, chunksize=32))
    keep = {str((OUT / pathlib.Path(s).relative_to(ROOT)).with_suffix('.webp')) for s in srcs}
    gone = [p for p in OUT.rglob('*.webp') if str(p) not in keep]
    for p in gone:
        p.unlink()
    size = sum(p.stat().st_size for p in OUT.rglob('*.webp'))
    print(f'원본 {len(srcs)}장 · 새로 만듦 {made} · 지움 {len(gone)} · 썸네일 합계 {size / 2**20:.1f}MB')

if __name__ == '__main__':
    main()
