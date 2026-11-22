"""러프 툴을 로컬에서 연다. cuts/ 서브모듈이 있으면 참고 원본 컷도 함께 보인다.

    python3 rough/serve.py            # http://localhost:8000/rough/
    python3 rough/serve.py --port 9000

저장소 루트를 서버 루트로 써서 페이지가 ../cuts/ 경로로 이미지를 읽는다.
서버는 이 컴퓨터(127.0.0.1)에서만 열린다.
"""
import argparse
import functools
import http.server
import webbrowser
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--no-browser", action="store_true")
    a = ap.parse_args()
    has = (REPO / "cuts" / "manifest.csv").exists()
    url = f"http://localhost:{a.port}/rough/"
    print(f"러프 툴: {url}")
    print("참고 컷: " + ("cuts/ 서브모듈 사용" if has else "없음 (git submodule update --init --depth 1 필요, 비공개 저장소 권한 필요)"))
    if not a.no_browser:
        webbrowser.open(url)
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(REPO))
    http.server.ThreadingHTTPServer(("127.0.0.1", a.port), handler).serve_forever()


if __name__ == "__main__":
    main()
