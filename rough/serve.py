"""Serve the rough tool locally. The optional cuts/ submodule provides source panels."""
import argparse
import functools
import http.server
import json
import webbrowser
from pathlib import Path

from image_api import MAX_REQUEST, ImageRequestError, generate_panel

REPO = Path(__file__).resolve().parent.parent


class RoughHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/rough/api/panel-image":
            self.send_error(404)
            return
        port = self.server.server_port
        host = self.headers.get("Host")
        origin = self.headers.get("Origin")
        if host not in (f"localhost:{port}", f"127.0.0.1:{port}") or origin not in (None, f"http://{host}"):
            self.send_error(403)
            return
        try:
            if self.headers.get_content_type() != "application/json":
                raise ImageRequestError(415, "이미지 요청은 JSON으로 보내주세요.")
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                length = 0
            if not 0 < length <= MAX_REQUEST:
                raise ImageRequestError(413, "이미지 요청 용량을 줄여주세요.")
            try:
                payload = json.loads(self.rfile.read(length))
            except (ValueError, RecursionError):
                raise ImageRequestError(400, "컷 정보를 읽을 수 없어요.") from None
            media_type, image = generate_panel(payload)
        except ImageRequestError as error:
            self.send_data(error.status, "application/json", json.dumps({"error": str(error)}).encode())
        else:
            self.send_data(200, media_type, image)

    def send_data(self, status, media_type, data):
        self.send_response(status)
        self.send_header("Content-Type", media_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--no-browser", action="store_true")
    a = ap.parse_args()
    has = (REPO / "cuts" / "manifest.csv").exists()
    handler = functools.partial(RoughHandler, directory=str(REPO))
    with http.server.ThreadingHTTPServer(("127.0.0.1", a.port), handler) as server:
        url = f"http://localhost:{server.server_port}/rough/"
        print(f"러프 툴: {url}")
        print("참고 컷: " + ("cuts/ 서브모듈 사용" if has else "없음 (git submodule update --init --depth 1 필요, 비공개 저장소 권한 필요)"))
        if not a.no_browser:
            webbrowser.open(url)
        server.serve_forever()


if __name__ == "__main__":
    main()
