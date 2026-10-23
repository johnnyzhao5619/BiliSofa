"""HOST real socket/cURL tests of the ADR-101 failover bridge, not decoder/TV proof.

The primary upstream reproduces what an overseas CDN node did on the device's
title: past a byte offset it either sends no response headers and then a 504,
or sends a validated 206 prefix and stalls. The backup serves the same bytes."""
from pathlib import Path
import http.server
import runpy
import socket
import subprocess
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
TOKEN = '0123456789abcdef0123456789abcdef'
WINDOW = 2097152


class VodBridgeFailoverTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        folder = Path(cls.tmp.name)
        runpy.run_path(str(ROOT / 'tools/vod-bridge-failover-source.py'))['generate'](folder / 'vod-bridge-failover-generated.h')
        cls.payload = b'\x00\x00\x00\x20ftyp' + bytes(range(256)) * 49152
        cls.received = []
        cls.mode = 'ok'

        class Upstream(http.server.BaseHTTPRequestHandler):
            protocol_version = 'HTTP/1.1'

            def log_message(self, *_args):
                pass

            def do_GET(self):
                a, b = map(int, self.headers['Range'][6:].split('-'))
                b = min(b, len(cls.payload) - 1)
                cls.received.append((self.path, a))
                primary = self.path in ('/video', '/audio')
                if primary and a >= 2 * WINDOW and cls.mode == 'silent':
                    time.sleep(8)
                    self.send_response(504)
                    self.send_header('Content-Length', '0')
                    self.end_headers()
                    return
                body = cls.payload[a:b + 1]
                self.send_response(206)
                self.send_header('Content-Range', f'bytes {a}-{b}/{len(cls.payload)}')
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                try:
                    if primary and a >= 2 * WINDOW and cls.mode == 'stall':
                        self.wfile.write(body[:65536])
                        self.wfile.flush()
                        time.sleep(20)
                        return
                    self.wfile.write(body)
                except (BrokenPipeError, ConnectionResetError):
                    pass

        cls.upstream = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Upstream)
        cls.upstream.daemon_threads = True
        threading.Thread(target=cls.upstream.serve_forever, daemon=True).start()
        with socket.socket() as reserve:
            reserve.bind(('127.0.0.1', 0))
            cls.port = reserve.getsockname()[1]
        cls.exe = folder / 'vod-bridge-failover'
        result = subprocess.run(['clang', '-std=c11', '-D_DARWIN_C_SOURCE', '-D_DEFAULT_SOURCE', '-DBILISOFA_BRIDGE_HOST_FIXTURE',
            f'-DBILISOFA_BRIDGE_PORT={cls.port}', '-Wall', '-Wextra', '-Werror', '-I', str(folder), '-I', str(ROOT / 'platform/wasm-network/src'),
            str(ROOT / 'tests/native/vod-bridge-failover-fixture.c'), '-lcurl', '-o', str(cls.exe)], capture_output=True, text=True)
        if result.returncode:
            raise RuntimeError(result.stderr)

    @classmethod
    def tearDownClass(cls):
        cls.upstream.shutdown()
        cls.upstream.server_close()
        cls.tmp.cleanup()

    def open(self, start='0', backups='1', mode='ok'):
        type(self).received = []
        type(self).mode = mode
        self.lines = []
        self.process = subprocess.Popen([str(self.exe), str(self.upstream.server_port), start, backups], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        threading.Thread(target=lambda: self.lines.extend(line.strip() for line in self.process.stdout), daemon=True).start()
        deadline = time.time() + 5
        while 'BRIDGE:ready' not in self.lines and time.time() < deadline:
            time.sleep(.02)
        self.assertIn('BRIDGE:ready', self.lines)

    def tearDown(self):
        if getattr(self, 'process', None) and self.process.poll() is None:
            try:
                self.process.stdin.write('s')
                self.process.stdin.flush()
            except BrokenPipeError:
                pass
            self.process.wait(timeout=10)
        if getattr(self, 'process', None):
            for pipe in (self.process.stdin, self.process.stdout, self.process.stderr):
                pipe.close()
            self.assertEqual(self.process.returncode, 0)

    def fetch(self, path, headers):
        request = urllib.request.Request(f'http://127.0.0.1:{self.port}/{TOKEN}/{path}', headers=headers)
        with urllib.request.urlopen(request, timeout=45) as response:
            return response.status, response.read()

    def test_policy_accepts_only_the_bilibili_akamai_family_with_the_same_destination_rules(self):
        result = subprocess.run([str(self.exe), 'policy'], capture_output=True, timeout=5)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_silent_primary_moves_the_track_to_its_backup_and_the_bytes_stay_exact(self):
        self.open(mode='silent')
        started = time.time()
        status, body = self.fetch('video.mp4', {'Range': 'bytes=0-9437184'})
        self.assertEqual(status, 206)
        self.assertEqual(body, self.payload[:9437185])
        self.assertLess(time.time() - started, 12, 'no headers for 6 s moves on before the 15 s timeout or the 504')
        self.assertEqual(self.lines.count('BRIDGE:failover:1'), 1)
        self.assertNotIn('BRIDGE:failover:2', self.lines)
        # Sticky: after the move no later video range returns to the failing host.
        moved = [i for i, (path, _a) in enumerate(self.received) if path == '/video-backup'][0]
        self.assertNotIn('/video', [path for path, _a in self.received[moved:]])
        self.assertFalse([line for line in self.lines if line.startswith('BRIDGE:issue:')])

    def test_stalled_206_continues_from_the_first_unreceived_byte_on_the_backup(self):
        self.open(mode='stall')
        status, body = self.fetch('video.mp4', {'Range': 'bytes=0-9437184'})
        self.assertEqual(status, 206)
        self.assertEqual(body, self.payload[:9437185])
        self.assertIn(('/video-backup', 2 * WINDOW + 65536), self.received)
        self.assertEqual(self.lines.count('BRIDGE:failover:1'), 1)

    def test_start_bits_begin_a_track_on_its_backup_without_touching_the_primary(self):
        self.open(start='1', mode='silent')
        self.assertEqual(self.fetch('video.mp4', {'Range': 'bytes=0-4194303'})[1], self.payload[:4194304])
        self.assertEqual(self.fetch('audio.mp4', {'Range': 'bytes=100-611'})[1], self.payload[100:612])
        self.assertEqual({path for path, _a in self.received}, {'/video-backup', '/audio'})
        self.assertNotIn('BRIDGE:failover:1', self.lines)

    def test_without_a_backup_the_original_bounded_failure_is_unchanged(self):
        self.open(backups='0', mode='silent')
        with self.assertRaises((urllib.error.HTTPError, urllib.error.URLError, ConnectionError)):
            self.fetch('video.mp4', {'Range': f'bytes={2 * WINDOW}-{3 * WINDOW - 1}'})
        self.assertFalse([line for line in self.lines if line.startswith('BRIDGE:failover')])
        self.assertTrue({path for path, _a in self.received} <= {'/video'})

    def test_renewal_keeps_backup_presence_and_the_sticky_host(self):
        self.open(mode='silent')
        self.fetch('video.mp4', {'Range': 'bytes=0-6291455'})
        self.process.stdin.write('r')
        self.process.stdin.flush()
        deadline = time.time() + 5
        while not [line for line in self.lines if line.startswith('FIXTURE:renewed')] and time.time() < deadline:
            time.sleep(.02)
        self.assertIn('VOD:renewed', self.lines)
        self.assertIn('FIXTURE:renewed:1:0', self.lines)


if __name__ == '__main__':
    unittest.main()
