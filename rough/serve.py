"""러프 툴을 로컬에서 연다. cuts/ 서브모듈이 있으면 참고 원본 컷도 함께 보인다.

    python3 rough/serve.py            # http://localhost:8000/rough/
    python3 rough/serve.py --port 9000

저장소 루트를 서버 루트로 써서 페이지가 ../cuts/ 경로로 이미지를 읽는다.
서버는 이 컴퓨터(127.0.0.1)에서만 열린다.

/nai-proxy/ai/generate-image: 브라우저가 NovelAI를 바로 부르지 못할 때(CORS) 이 서버가 대신 image.novelai.net에 보냄.
토큰은 브라우저가 보낸 Authorization 헤더를 그대로 넘기기만 하고 저장하지 않는다.
"""
import argparse
import functools
import http.server
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent


NAI = {"/nai-proxy/ai/generate-image": "https://image.novelai.net/ai/generate-image"}


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        url = NAI.get(self.path)
        if not url:
            self.send_error(404)
            return
        body = self.rfile.read(int(self.headers.get("Content-Length") or 0))
        req = urllib.request.Request(url, data=body, method="POST", headers={
            "Content-Type": "application/json", "Authorization": self.headers.get("Authorization", ""),
            "Origin": "https://novelai.net", "Referer": "https://novelai.net/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"})
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                code, ctype, data = r.status, r.headers.get("Content-Type", "application/zip"), r.read()
        except urllib.error.HTTPError as e:
            code, ctype, data = e.code, e.headers.get("Content-Type", "text/plain"), e.read()
        except Exception as e:  # 네트워크 오류
            code, ctype, data = 502, "text/plain; charset=utf-8", f"NovelAI에 닿지 못했어요: {e}".encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


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
    handler = functools.partial(Handler, directory=str(REPO))
    http.server.ThreadingHTTPServer(("127.0.0.1", a.port), handler).serve_forever()


if __name__ == "__main__":
    main()
