"""HOST real socket/cURL tests of production DASH policy, not decoder/TV proof."""
from pathlib import Path
import http.server
import json
import runpy
import socket
import subprocess
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
TOKEN = '0123456789abcdef0123456789abcdef'


class VodBridgeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        folder = Path(cls.tmp.name)
        runpy.run_path(str(ROOT / 'tools/vod-bridge-source.py'))['generate'](folder / 'vod-bridge-generated.h')
        cls.payload = b'\x00\x00\x00\x20ftyp' + bytes(range(256)) * 49152
        cls.received = []
        cls.bad = False

        class Upstream(http.server.BaseHTTPRequestHandler):
            def log_message(self, *_args):
                pass

            def do_GET(self):
                cls.received.append(dict(self.headers))
                a, b = map(int, self.headers['Range'][6:].split('-'))
                b = min(b, len(cls.payload) - 1)
                body = cls.payload[a:b + 1]
                self.send_response(200 if cls.bad is True else 206)
                self.send_header('Content-Range', f'bytes {a}-{b}/{len(cls.payload) + (1 if cls.bad == "total" else 0)}')
                self.send_header('Content-Length', str(len(body)))
                self.send_header('Set-Cookie', 'synthetic=not-forwarded')
                if cls.bad == 'encoding':
                    self.send_header('Content-Encoding', 'gzip')
                self.end_headers()
                try:
                    self.wfile.write(body)
                except (BrokenPipeError, ConnectionResetError):
                    pass

        cls.upstream = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Upstream)
        threading.Thread(target=cls.upstream.serve_forever, daemon=True).start()
        with socket.socket() as reserve:
            reserve.bind(('127.0.0.1', 0))
            cls.port = reserve.getsockname()[1]
        cls.exe = folder / 'vod-bridge'
        result = subprocess.run(['clang', '-std=c11', '-D_DARWIN_C_SOURCE', '-D_DEFAULT_SOURCE', '-DBILISOFA_BRIDGE_HOST_FIXTURE',
            f'-DBILISOFA_BRIDGE_PORT={cls.port}', '-Wall', '-Wextra', '-Werror', '-I', str(folder), '-I', str(ROOT / 'platform/wasm-network/src'),
            str(ROOT / 'tests/native/vod-bridge-fixture.c'), '-lcurl', '-o', str(cls.exe)], capture_output=True, text=True)
        if result.returncode:
            raise RuntimeError(result.stderr)

    @classmethod
    def tearDownClass(cls):
        cls.upstream.shutdown()
        cls.upstream.server_close()
        cls.tmp.cleanup()

    def setUp(self):
        type(self).received = []
        type(self).bad = False
        self.process = subprocess.Popen([str(self.exe), str(self.upstream.server_port)], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        self.assertEqual(self.line(), 'BRIDGE:ready')

    def line(self):
        for _ in range(16):
            line = self.process.stdout.readline().strip()
            if not line.startswith(('BRIDGE:read_mib:', 'BRIDGE:served:', 'BRIDGE:pump:')):
                return line
        self.fail('Unbounded diagnostics')

    def tearDown(self):
        if self.process.poll() is None:
            try:
                self.process.stdin.write('s')
                self.process.stdin.flush()
            except BrokenPipeError:
                pass
        self.process.communicate(timeout=5)

    def fetch(self, path='manifest.mpd', headers=None, method='GET'):
        request = urllib.request.Request(f'http://127.0.0.1:{self.port}/{TOKEN}/{path}', headers=headers or {}, method=method)
        with urllib.request.urlopen(request, timeout=12) as response:
            return response.status, response.headers, response.read()

    def command(self, value):
        self.process.stdin.write(value)
        self.process.stdin.flush()

    def test_production_policy_has_signature_lease_constant_memory_and_strict_metadata(self):
        result = subprocess.run([str(self.exe), 'policy'], capture_output=True, timeout=5)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_manifest_reports_actual_codec_index_duration_with_loopback_only(self):
        _status, _headers, body = self.fetch()
        xml = ET.fromstring(body)
        representations = xml.findall('.//{urn:mpeg:dash:schema:mpd:2011}Representation')
        self.assertEqual([r.attrib['codecs'] for r in representations], ['avc1.640028', 'ec-3'])
        self.assertEqual(xml.attrib['mediaPresentationDuration'], 'PT7200.000S')
        self.assertNotIn(b'fixture.bilivideo', body)
        self.assertNotIn(b'deadline=', body)
        self.assertEqual(self.fetch(method='HEAD')[2], b'')
        self.assertEqual(self.received, [])

    def test_large_index_is_complete_across_bounded_upstream_windows(self):
        status, headers, body = self.fetch('video.mp4', {'Range': 'bytes=0-9437184'})
        self.assertEqual(status, 206)
        self.assertEqual(body, self.payload[:9437185])
        self.assertEqual(headers['Content-Length'], '9437185')
        self.assertGreater(len(self.received), 4)
        for request in self.received:
            a, b = map(int, request['Range'][6:].split('-'))
            self.assertLessEqual(b - a + 1, 2097152)

    def test_old_cumulative_probe_quotas_do_not_stop_a_new_request(self):
        self.command('b')
        self.assertEqual(self.line(), 'FIXTURE:old_budgets')
        self.assertEqual(self.fetch('audio.mp4', {'Range': 'bytes=100-611'})[2], self.payload[100:612])

    def test_audio_mime_head_suffix_and_credentials_remain_correct(self):
        _status, headers, body = self.fetch('audio.mp4', {'Range': 'bytes=-512', 'Cookie': 'private=never', 'Authorization': 'private'})
        self.assertEqual(headers['Content-Type'], 'audio/mp4')
        self.assertEqual(body, self.payload[-512:])
        self.assertIsNone(headers['Set-Cookie'])
        self.assertNotIn('Cookie', self.received[-1])
        self.assertNotIn('Authorization', self.received[-1])
        _status, head, body = self.fetch('audio.mp4', method='HEAD')
        self.assertEqual(head['Content-Length'], str(len(self.payload)))
        self.assertEqual(body, b'')

    def test_renewal_keeps_listener_and_representation_but_rejects_changed_metadata_and_unsafe_origin(self):
        self.command('r')
        self.assertEqual(self.line(), 'VOD:renewed')
        self.assertEqual(self.fetch('video.mp4', {'Range': 'bytes=0-511'})[2], self.payload[:512])

    def test_wrong_range_total_encoding_and_ignored_range_never_become_media(self):
        for bad in [True, 'total', 'encoding']:
            type(self).bad = bad
            with self.assertRaises(urllib.error.HTTPError) as caught:
                self.fetch('video.mp4', {'Range': 'bytes=0-511'})
            self.assertEqual(caught.exception.code, 502)

    def test_route_method_multirange_and_url_handoff_are_rejected_before_upstream(self):
        for path, method, headers in [('outside', 'GET', {}), ('video.mp4?url=outside', 'GET', {}), ('video.mp4', 'POST', {}),
                ('video.mp4', 'GET', {'Range': 'bytes=0-1,4-5'}), ('video.mp4', 'GET', {})]:
            with self.assertRaises(urllib.error.HTTPError):
                self.fetch(path, headers, method)
        self.assertEqual(self.received, [])

    def test_stop_closes_listener_before_process_exit_and_renew_cannot_reopen_it(self):
        client = socket.create_connection(('127.0.0.1', self.port), timeout=2)
        client.sendall(b'GET /')
        self.command('s')
        self.assertEqual(self.line(), 'BRIDGE:stopped')
        self.assertEqual(self.line(), 'FIXTURE:closed_alive')
        self.assertIsNone(self.process.poll())
        self.assertEqual(client.recv(512), b'')
        client.close()
        with socket.socket() as check:
            self.assertNotEqual(check.connect_ex(('127.0.0.1', self.port)), 0)

    def test_uncertain_close_stays_unknown(self):
        self.command('e')
        self.assertEqual(self.line(), 'BRIDGE:failed:17')
        self.assertEqual(self.line(), 'FIXTURE:closed_alive')


if __name__ == '__main__':
    unittest.main()
