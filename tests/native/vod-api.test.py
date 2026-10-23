"""Production read lane against local TLS, synthetic credentials only."""
from pathlib import Path
import hashlib
import http.server
import json
import ssl
import subprocess
import tempfile
import threading
import unittest
import urllib.parse

ROOT = Path(__file__).resolve().parents[2]


class VodApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        folder = Path(cls.tmp.name)
        host = json.loads((ROOT / '.local/host-network/manifest.json').read_text())
        prefix = Path(host['opensslPrefix'])
        cls.cert = folder / 'ca.pem'; key = folder / 'fixture.key'; cls.wrong = folder / 'wrong.pem'
        for cert, names in [(cls.cert, getattr(cls,'names','DNS:api.bilibili.com,DNS:fixture.bilivideo.com')), (cls.wrong, 'DNS:outside.invalid')]:
            result = subprocess.run([str(prefix / 'bin/openssl'), 'req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:P-256', '-noenc',
                '-keyout', str(key), '-out', str(cert), '-days', '1', '-subj', '/CN=synthetic', '-addext', 'subjectAltName=' + names], capture_output=True)
            if result.returncode:
                raise RuntimeError('Fixture certificate generation failed')
            key.chmod(0o600)
            if cert == cls.cert:
                good_key = key.read_bytes()
        key.write_bytes(good_key)
        cls.exe = folder / 'vod-api'
        command = ['clang', '-std=c11', '-D_DARWIN_C_SOURCE', '-D_POSIX_C_SOURCE=200809L', '-Wall', '-Wextra', '-Werror', '-Wno-unused-function',
            '-I' + str(ROOT / 'platform/wasm-network/src'), '-I' + str(ROOT / '.local/host-network/prefix/include'), '-I' + str(prefix / 'include'),
            str(ROOT / getattr(cls, 'fixture', 'tests/native/vod-api-fixture.c')), str(ROOT / '.local/host-network/prefix/lib/libcurl.a'), '-L' + str(prefix / 'lib'),
            '-lssl', '-lcrypto', '-lldap', '-llber', '-framework', 'SystemConfiguration', '-framework', 'CoreFoundation', '-o', str(cls.exe)]
        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode:
            raise RuntimeError(result.stderr)
        cls.context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        cls.context.load_cert_chain(cls.cert, key)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def case(self, mode, extra_api_paths=()):
        requests = []; violations = []

        class Handler(http.server.BaseHTTPRequestHandler):
            protocol_version = 'HTTP/1.1'

            def log_message(self, *_args):
                pass

            def do_GET(self):
                requests.append(self.path)
                is_cdn = self.headers['Host'] == 'fixture.bilivideo.com'
                cookie = self.headers.get('Cookie', '')
                if self.headers.get('Authorization') or is_cdn and cookie:
                    violations.append('credential-destination')
                if is_cdn:
                    if self.headers.get('Range') != 'bytes=0-511' or not self.path.startswith('/a.m4s?deadline='):
                        violations.append('range-shape')
                else:
                    if self.headers['Host'] != 'api.bilibili.com' or 'bili_jct=synthetic-csrf' not in cookie or 'SESSDATA=synthetic-' not in cookie:
                        violations.append('api-jar')
                    if self.path.startswith('/x/player/wbi/playurl?'):
                        raw = self.path.split('?', 1)[1]
                        params = urllib.parse.parse_qs(raw)
                        expected_keys = {'bvid', 'cid', 'fnval', 'fnver', 'fourk', 'qn', 'wts', 'w_rid'}
                        query, sep, signature = raw.rpartition('&w_rid=')
                        joined = 'a' * 32 + 'b' * 32
                        indices = [46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13]
                        mix = ''.join(joined[i] for i in indices)
                        if not sep or set(params) != expected_keys or hashlib.md5((query + mix).encode()).hexdigest() != signature:
                            violations.append('wbi-signature')
                    elif self.path not in ['/x/web-interface/nav', '/x/web-interface/view?bvid=BV0000000001', *extra_api_paths]:
                        violations.append('api-path')
                body = b'\x00\x00\x00\x20ftyp' + b'v' * 504 if is_cdn else b'{"code":0,"data":{}}'
                if mode == 'body':
                    body = b'x' * 16385
                try:
                    self.send_response(302 if mode == 'redirect' else 206 if is_cdn else 200)
                    if mode == 'redirect':
                        self.send_header('Location', 'https://outside.invalid/private')
                    if is_cdn:
                        self.send_header('Content-Range', 'bytes 0-511/8192' if mode != 'bad-range' else 'bytes 1-512/8192')
                        self.send_header('Set-Cookie', 'cdn=not-retained; Domain=.bilivideo.com; Secure; Path=/')
                        if mode == 'encoding':
                            self.send_header('Content-Encoding', 'gzip')
                    else:
                        self.send_header('Set-Cookie', 'SESSDATA=synthetic-updated; Domain=' + ('.outside.invalid' if mode == 'cookie-domain' else '.bilibili.com') + '; Secure; Path=/')
                    self.send_header('Content-Length', str(len(body)))
                    self.end_headers(); self.wfile.write(body)
                except (BrokenPipeError, ConnectionResetError, ssl.SSLError):
                    pass

        server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        server.socket = self.context.wrap_socket(server.socket, server_side=True)
        thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
        try:
            result = subprocess.run([str(self.exe), mode, str(self.wrong if mode == 'wrong-ca' else self.cert), str(server.server_port)], capture_output=True, timeout=18)
        finally:
            server.shutdown(); server.server_close(); thread.join(timeout=2)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(violations, [])
        self.assertNotIn(b'synthetic-session', result.stdout)
        self.assertNotIn(b'deadline=', result.stdout)
        self.assertIn(b'VODAPI:unclosed' if mode == 'unknown' else b'VODAPI:closed', result.stdout)
        return requests, result.stdout

    def test_verified_api_jar_wbi_and_two_anonymous_cdn_reads(self):
        requests, output = self.case('normal')
        self.assertEqual(len(requests), 5)
        self.assertEqual(output.count(b'VODAPI:response:3'), 2)

    def test_invalid_input_and_resource_bounds_do_not_request(self):
        self.assertEqual(self.case('bounds')[0], [])

    def test_rejected_cookie_import_never_opens_a_request(self):
        self.assertEqual(self.case('badcookie')[0], [])

    def test_redirect_is_not_followed(self):
        self.assertEqual(self.case('redirect')[0], ['/x/web-interface/nav'])

    def test_wrong_ca_remains_a_tls_failure(self):
        self.assertEqual(self.case('wrong-ca')[0], [])

    def test_bad_response_cookie_domain_is_rejected(self):
        self.assertEqual(self.case('cookie-domain')[0], ['/x/web-interface/nav'])

    def test_oversized_nav_body_is_rejected(self):
        self.assertEqual(self.case('body')[0], ['/x/web-interface/nav'])

    def test_invalid_cdn_range_or_encoding_cannot_certify_source(self):
        for mode in ['bad-range', 'encoding']:
            self.assertEqual(len(self.case(mode)[0]), 4)

    def test_cancel_and_deadline_clean_before_request_transfer(self):
        for mode in ['cancel', 'deadline']:
            self.assertEqual(self.case(mode)[0], [])

    def test_uncertain_remove_never_emits_successful_close(self):
        _requests, output = self.case('unknown')
        self.assertNotIn(b'VODAPI:closed', output)


if __name__ == '__main__':
    unittest.main()
