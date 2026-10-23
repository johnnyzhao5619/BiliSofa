"""Production overlay TLS/signature/body/jar/close checks with synthetic accounts."""
from pathlib import Path
import hashlib
import http.server
import importlib.util
import ssl
import subprocess
import threading
import unittest
import urllib.parse

spec = importlib.util.spec_from_file_location('vod_api_fixture_tests', Path(__file__).with_name('vod-api.test.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class CommentsReadTest(module.VodApiTest):
    fixture = 'tests/native/comments-read-fixture.c'
    names = 'DNS:api.bilibili.com'

    def case(self, mode, extra_api_paths=()):
        paths, violations = [], []

        class Handler(http.server.BaseHTTPRequestHandler):
            protocol_version = 'HTTP/1.1'

            def log_message(self, *_args):
                pass

            def do_GET(self):
                paths.append(self.path)
                cookie = self.headers.get('Cookie', '')
                if self.headers['Host'] != 'api.bilibili.com' or self.headers.get('Authorization') or self.headers.get('Range'):
                    violations.append('destination-or-header')
                if 'SESSDATA=synthetic-session' not in cookie or 'bili_jct=synthetic-csrf' not in cookie:
                    violations.append('wrong-api-jar')
                path, _, query = self.path.partition('?')
                if path == '/x/v2/reply/wbi/main':
                    params = urllib.parse.parse_qs(query)
                    expected = {'mode','oid','pagination_str','plat','seek_rpid','type','web_location','wts','w_rid'}
                    unsigned, sep, signature = query.rpartition('&w_rid=')
                    joined='a'*32+'b'*32
                    indices=[46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13]
                    mix=''.join(joined[i] for i in indices)
                    if set(params)!=expected or not sep or hashlib.md5((unsigned+mix).encode()).hexdigest()!=signature or params['mode'][0] not in ['2','3']:
                        violations.append('bad-signature')
                elif self.path not in ['/x/web-interface/nav','/x/web-interface/view?bvid=BV0000000001','/x/v2/reply/reply?oid=123&pn=2&ps=10&root=99999999999999999999&type=1']:
                    violations.append('unexpected-route')
                body = b'\x00' if mode == 'json-nul' and path == '/x/v2/reply/wbi/main' else b'{"code":0}'
                if mode == 'body': body=b'x'*16385
                try:
                    self.send_response(302 if mode == 'redirect' else 200)
                    if mode == 'redirect':
                        self.send_header('Location', 'https://outside.invalid/private')
                    self.send_header('Content-Length', str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                except (BrokenPipeError, ConnectionResetError, ssl.SSLError):
                    pass

        server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        server.socket = self.context.wrap_socket(server.socket, server_side=True)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            result = subprocess.run([str(self.exe), mode, str(self.wrong if mode == 'wrong-ca' else self.cert), str(server.server_port)], capture_output=True, timeout=18)
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(violations, [])
        self.assertNotIn(b'auth_key=', result.stdout)
        self.assertNotIn(b'synthetic-session', result.stdout)
        return paths, result.stdout

    def test_fixed_comment_jar_wbi_modes_and_reply_route(self):
        paths,output=self.case('normal')
        self.assertEqual(len(paths),5)
        self.assertTrue(paths[2].startswith('/x/v2/reply/wbi/main?mode=3&'))
        self.assertTrue(paths[3].startswith('/x/v2/reply/wbi/main?mode=2&'))
        self.assertIn(b'VODAPI:closed',output)

    def test_fixed_comments_reject_url_injection_page_sort_and_other_operations(self):
        self.assertEqual(self.case('bounds')[0],[])

    def test_comment_json_nul_never_becomes_a_success_body(self):
        self.assertEqual(len(self.case('json-nul')[0]),3)


if __name__ == '__main__':
    # Include only this lane's own cases plus the shared wrong-CA, redirect,
    # cancellation/body and unknown-close invariants under their actual names.
    names = [name for name in dir(CommentsReadTest) if name.startswith('test_') and name not in dir(module.VodApiTest)]
    names += ['test_wrong_ca_remains_a_tls_failure', 'test_redirect_is_not_followed', 'test_oversized_nav_body_is_rejected', 'test_cancel_and_deadline_clean_before_request_transfer', 'test_uncertain_remove_never_emits_successful_close']
    suite = unittest.TestSuite(CommentsReadTest(name) for name in dict.fromkeys(names))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    raise SystemExit(0 if result.wasSuccessful() else 1)
