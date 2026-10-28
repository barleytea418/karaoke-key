"""ローカル確認用サーバー。index.htmlの配信と /api/search を受ける(本番はVercel)。
起動: python3 server.py  → http://localhost:8790/
"""
import os, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT / "api"))
from search import handler  # noqa: E402

PORT = 8790

class H(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/api/search"):
            return handler.do_GET(self)
        return super().do_GET()

if __name__ == "__main__":
    os.chdir(ROOT)
    print(f"http://localhost:{PORT}/")
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
