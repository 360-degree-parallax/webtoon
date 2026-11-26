#!/usr/bin/env python3
"""rough/src/의 화면별 조각을 순서대로 이어 rough/app.js를 만든다(사이트가 싣는 파일).
고칠 때는 rough/src/*.js를 고치고 이 스크립트를 실행. --check: app.js가 조각과 같은지만 확인(다르면 종료 코드 1)
"""
import sys, pathlib
R = pathlib.Path(__file__).resolve().parents[1] / 'rough'
PARTS = ['app-core', 'app-setbook', 'app-scene', 'app-edit', 'app-edit2', 'app-views', 'app-layers']
HEAD = '// 자동 생성: tools/build_app.py — 고치지 말고 rough/src/의 조각을 고친 뒤 다시 만드세요\n// ' + ' → '.join(f'src/{p}.js' for p in PARTS) + '\n'
out = HEAD + ''.join((R / 'src' / f'{p}.js').read_text() for p in PARTS)
if '--check' in sys.argv:
    ok = (R / 'app.js').read_text() == out; print('app.js', '조각과 같음' if ok else '조각과 다름 — python3 tools/build_app.py 실행'); sys.exit(0 if ok else 1)
(R / 'app.js').write_text(out); print('app.js', len(out), '자')
