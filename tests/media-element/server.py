"""Local synthetic media only; never contacts Bilibili or proxies arbitrary URLs."""
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import hashlib, json, re

root = Path(__file__).resolve().parents[2]
media = root / 'build/media-probe'
manifest = json.loads((media / 'manifest.json').read_text())
for name, digest in manifest['files'].items():
    if not re.fullmatch(r'probe\.(mp4|mpd)|init-[01]\.mp4|segment-[01]-[0-9]{5}\.m4s', name):
        raise SystemExit('Unexpected synthetic fixture name')
    path = media / name
    if path.is_symlink() or hashlib.sha256(path.read_bytes()).hexdigest() != digest:
        raise SystemExit('Synthetic fixture integrity mismatch')


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def do_HEAD(self):
        self.serve(False)

    def do_GET(self):
        self.serve(True)

    def serve(self, body):
        # a/manifest.mpd intentionally serves muxed MP4 to isolate adapter and
        # rate behavior from DASH support. b/manifest.mpd is actual DASH.
        route = self.path
        if route == '/':
            data, content_type = b'<!doctype html><title>Local media adapter bench</title><body>Original synthetic media; desktop evidence only</body>', 'text/html'
        elif route == '/adapter.js':
            data, content_type = (root / 'build/element-video-bench/adapter.js').read_bytes(), 'text/javascript'
        elif route == '/' + 'a' * 32 + '/manifest.mpd':
            data, content_type = (media / 'probe.mp4').read_bytes(), 'video/mp4'
        elif route == '/' + 'b' * 32 + '/manifest.mpd':
            data, content_type = (media / 'probe.mpd').read_bytes(), 'application/dash+xml'
        elif re.fullmatch('/' + 'b' * 32 + r'/(init-[01]\.mp4|segment-[01]-[0-9]{5}\.m4s)', route):
            name = route.rsplit('/', 1)[1]
            if name not in manifest['files']:
                self.send_error(404)
                return
            data, content_type = (media / name).read_bytes(), 'video/mp4'
        else:
            self.send_error(404)
            return
        total = len(data)
        range_value = self.headers.get('Range')
        bounds = re.fullmatch(r'bytes=([0-9]{1,9})-([0-9]{0,9})', range_value or '')
        if range_value:
            if not bounds:
                self.send_error(416)
                return
            first = int(bounds[1]); last = min(int(bounds[2]) if bounds[2] else total - 1, total - 1)
            if first > last:
                self.send_error(416)
                return
            self.send_response(206)
            self.send_header('Content-Range', f'bytes {first}-{last}/{total}')
            data = data[first:last + 1]
        else:
            self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Content-Security-Policy', "default-src 'none'; script-src 'self'; media-src 'self'; connect-src 'self'; style-src 'unsafe-inline'")
        self.end_headers()
        if body:
            self.wfile.write(data)


ThreadingHTTPServer(('127.0.0.1', 40324), Handler).serve_forever()
