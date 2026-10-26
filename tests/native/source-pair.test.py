"""ADR-112 parallel source checks: the inherited VOD/PGC read-lane and Akamai checks against the
new source entries, plus the pair itself (parallel timing, separate leg state, failures, cancel)."""
from pathlib import Path
import http.server
import importlib.util
import ssl
import subprocess
import threading
import time
import unittest


def load(name):
    spec = importlib.util.spec_from_file_location(name.replace('-', '_').replace('.', '_'), Path(__file__).with_name(name + '.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


vod, pgc, failover = load('vod-api.test'), load('pgc-read.test'), load('source-failover.test')


class VodPairEntryTest(failover.AkamaiCheck, vod.VodApiTest):
    fixture = 'tests/native/vod-source-pair-entry-fixture.c'


class PgcPairEntryTest(failover.AkamaiCheck, pgc.PgcReadTest):
    fixture = 'tests/native/pgc-source-pair-entry-fixture.c'


class PairTest(unittest.TestCase):
    # Same local CA and clang build as the inherited suites, without inheriting their tests.
    fixture = 'tests/native/vod-source-pair-fixture.c'
    setUpClass = classmethod(vod.VodApiTest.setUpClass.__func__)
    tearDownClass = classmethod(vod.VodApiTest.tearDownClass.__func__)

    def pair(self, mode):
        requests, violations = [], []

        class Handler(http.server.BaseHTTPRequestHandler):
            protocol_version = 'HTTP/1.1'

            def log_message(self, *_args):
                pass

            def do_GET(self):
                path = self.path.split('?', 1)[0]; requests.append(path)
                if self.headers['Host'] != 'fixture.bilivideo.com' or self.headers.get('Cookie') or self.headers.get('Authorization') or self.headers.get('Range') != 'bytes=0-511':
                    violations.append('cdn-shape')
                if path.startswith('/slow-'):
                    time.sleep(0.7)
                try:
                    if path == '/missing.m4s':
                        self.send_response(404); self.send_header('Content-Length', '0'); self.end_headers(); return
                    full = path == '/full.m4s'
                    body = b'\x00\x00\x00\x20ftyp' + b'v' * (592 if full else 504)
                    self.send_response(200 if full else 206)
                    if not full:
                        self.send_header('Content-Range', 'bytes 0-511/' + ('4096' if path.endswith('-a.m4s') else '8192'))
                    self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
                except (BrokenPipeError, ConnectionResetError, ssl.SSLError):
                    pass

        server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        server.socket = self.context.wrap_socket(server.socket, server_side=True)
        thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
        try:
            result = subprocess.run([str(self.exe), mode, str(self.cert), str(server.server_port)], capture_output=True, timeout=18)
        finally:
            server.shutdown(); server.server_close(); thread.join(timeout=2)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(violations, [])
        self.assertNotIn(b'deadline=', result.stdout)
        self.assertIn(b'VODAPI:closed', result.stdout)
        return requests, result.stdout

    def test_both_checks_run_at_the_same_time_with_separate_results(self):
        requests, out = self.pair('pair')
        self.assertEqual(sorted(requests[:2]), ['/slow-a.m4s', '/slow-v.m4s']); self.assertEqual(sorted(requests[2:]), ['/a.m4s', '/v.m4s'])
        elapsed = int(out.split(b'elapsed=')[1].split(b'\n')[0])
        self.assertLess(elapsed, 1300, 'two 700 ms checks in series would take about 1400 ms')
        self.assertEqual(out.count(b'VODAPI:pair'), 2)

    def test_one_failing_or_non_range_leg_keeps_the_other_result(self):
        self.pair('one-fails'); self.pair('not-range')

    def test_no_second_transfer_while_a_pair_runs_and_cancel_or_deadline_close_everything(self):
        _requests, out = self.pair('busy'); self.assertEqual(out.count(b'VODAPI:pair'), 1)
        self.pair('cancel')
        _requests, out = self.pair('deadline'); self.assertIn(b'VODAPI:deadline', out)

    def test_destinations_follow_the_source_check_rule(self):
        requests, _out = self.pair('bounds'); self.assertEqual(requests, [])


class PgcPairTest(PairTest):
    fixture = 'tests/native/pgc-source-pair-fixture.c'


if __name__ == '__main__':
    unittest.main(defaultTest=['VodPairEntryTest', 'PgcPairEntryTest', 'PairTest', 'PgcPairTest'])
