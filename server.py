"""Serve the Bitrix24 iframe, accepting callback POST without retaining tokens."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, unquote
import os
import json

PUBLIC = Path(__file__).parent / 'public'
class Handler(SimpleHTTPRequestHandler):
    counters = {'get': 0, 'post': 0}
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.mjs': 'text/javascript'}
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC), **kwargs)
    def translate_path(self, path):
        clean = unquote(urlsplit(path).path)
        if clean.startswith('/canoni/'):
            clean = clean[len('/canoni'):]
        if clean in ('/', '/canoni', '/install', '/install.html'):
            clean = '/index.html'
        return super().translate_path(clean)
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Security-Policy', "frame-ancestors https://test.kenovy.it; object-src 'none'; base-uri 'self'")
        super().end_headers()
    def do_GET(self):
        if urlsplit(self.path).path in ('/healthz', '/canoni/healthz'):
            payload=json.dumps({'ok':True, **Handler.counters}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers();self.wfile.write(payload);return
        Handler.counters['get'] += 1
        super().do_GET()
    def do_POST(self):
        Handler.counters['post'] += 1
        length=int(self.headers.get('Content-Length','0'))
        if length > 131072:
            self.send_error(413); return
        self.rfile.read(length)  # Authorization remains transient; never logged or saved.
        self.do_GET()
    def log_message(self, format, *args):
        # Query strings may contain authorization/context; do not log requests.
        pass

if __name__=='__main__':
    ThreadingHTTPServer(('0.0.0.0', int(os.getenv('PORT','8080'))), Handler).serve_forever()
