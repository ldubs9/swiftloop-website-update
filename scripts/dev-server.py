#!/usr/bin/env python3
# ============================================================
# SwiftLoop — static dev server
#
#   python3 scripts/dev-server.py [port]
#
# Plain `python3 -m http.server` sends only Last-Modified, with no
# Cache-Control and no ETag. Browsers apply a HEURISTIC freshness
# lifetime to that and will happily serve a module straight from
# cache without revalidating — so an edited js/css file silently
# keeps running the old code, and you end up debugging a build
# that is not the one on disk. Last-Modified also has one-second
# granularity, so quick successive edits can 304 as unchanged.
#
# This serves the same tree with caching turned off.
# ============================================================

import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def send_head(self):
        # strip the conditions so development never answers a request with 304
        del self.headers["If-Modified-Since"]
        del self.headers["If-None-Match"]
        return super().send_head()

    def log_message(self, fmt, *args):
        if len(args) > 1 and str(args[1]).startswith(("4", "5")):
            super().log_message(fmt, *args)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8743
    handler = partial(NoCacheHandler, directory=str(ROOT))
    with ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print(f"swiftloop dev server → http://127.0.0.1:{port}  (no-store)")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
