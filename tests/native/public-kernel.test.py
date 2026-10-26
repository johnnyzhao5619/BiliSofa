"""ADR-108 HOST public kernel against local TLS: connection reuse, every route, bounds, stop and close.
Remapping (CONNECT_TO/CAINFO) exists only in this test's prepare hook."""
from pathlib import Path
import http.server, ssl, threading, tempfile, subprocess, json, time, unittest
ROOT = Path(__file__).resolve().parents[2]
AGENT = 'Mozilla/5.0 (SMART-TV; LINUX; Tizen 8.0) AppleWebKit/537.36 (KHTML, like Gecko) Version/8.0 TV Safari/537.36'
VISITOR = 'AB12CD34-EF56-7890-ABCD-EF1234567890infoc|0F1E2D3C-4B5A-6978-8796-A5B4C3D2E1F012345-102300000-abc%3D%3D|1761200000'
COOKIE = 'buvid3=AB12CD34-EF56-7890-ABCD-EF1234567890infoc; buvid4=0F1E2D3C-4B5A-6978-8796-A5B4C3D2E1F012345-102300000-abc%3D%3D; b_nut=1761200000'
SOURCE = r'''
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <curl/curl.h>
static const char *test_ca; static int test_port; static struct curl_slist *test_map;
static int test_prepare(CURL *easy) {
  if (!test_map) {
    char a[96], b[96]; snprintf(a, sizeof(a), "api.bilibili.com:443:127.0.0.1:%d", test_port); snprintf(b, sizeof(b), "s.search.bilibili.com:443:127.0.0.1:%d", test_port);
    test_map = curl_slist_append(NULL, a); if (!test_map || !curl_slist_append(test_map, b)) return 0;
  }
  return curl_easy_setopt(easy, CURLOPT_CONNECT_TO, test_map) == CURLE_OK && curl_easy_setopt(easy, CURLOPT_CAINFO, test_ca) == CURLE_OK;
}
#define KERNEL_TEST_PREPARE(easy) test_prepare(easy)
#define PUBLIC_KERNEL_NO_MAIN
#include "public-kernel.c"
static double test_now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec * 1000.0 + t.tv_nsec / 1e6; }
static void input(const char *value) { memset(kernel_input, 0, sizeof(kernel_input)); strncpy(kernel_input, value, KERNEL_INPUT_CAP); }
/* Runs one request to completion; prints "<op> <http> <curl> <bytes> <reject>". */
static int request(int op, const char *value) {
  input(value); if (!kernel_begin(op)) { printf("refused %d\n", op); return 0; }
  while (kernel_active >= 0 && kernel_live) { kernel_tick(); struct timespec w = {0, 1000000}; nanosleep(&w, NULL); }
  printf("%d %d %d %u %d\n", op, kernel_http_status(), kernel_curl_status(), kernel_body_length(), kernel_reject_reason()); return 1;
}
static const char *KEYS = "7cd084941338484aae1ad9425b84077c|4932caff0ff746eab6f01bf08b70ac45";
int main(int argc, char **argv) {
  if (argc != 4) return 1; test_ca = argv[2]; test_port = atoi(argv[3]);
  if (!kernel_start()) return 2;
  const char *mode = argv[1]; char line[512]; long epoch = (long)time(NULL);
  if (!strcmp(mode, "reuse")) {
    for (int i = 0; i < 200; i++) { char page[2] = { (char)('1' + i % 5), 0 }; if (!request(KERNEL_POPULAR, page)) return 3; }
    printf("connections %d\n", kernel_connections());
  } else if (!strcmp(mode, "routes")) {
    input(AGENT_VALUE); if (!kernel_set_agent()) return 4;
    request(KERNEL_POPULAR, "3"); request(KERNEL_RANKING, "");
    input(VISITOR_VALUE); if (!kernel_set_visitor()) return 5; request(KERNEL_CATEGORY, "1005");
    input(""); kernel_set_visitor(); request(KERNEL_PGC_RANKING, "4|7"); request(KERNEL_PGC_INDEX, "1|2");
    input(VISITOR_VALUE); kernel_set_visitor(); request(KERNEL_UP, "12345|2");
    input(""); kernel_set_visitor(); request(KERNEL_VISITOR, ""); request(KERNEL_SEARCH_NAV, "");
    snprintf(line, sizeof(line), "0|2|%s|%ld|原神 a|b", KEYS, epoch);
    request(KERNEL_SEARCH, line);
    snprintf(line, sizeof(line), "1|1|%s|%ld|up", KEYS, epoch); request(KERNEL_SEARCH, line);
    snprintf(line, sizeof(line), "2|5|%s|%ld|番剧", KEYS, epoch); request(KERNEL_SEARCH, line);
    request(KERNEL_HOT, ""); request(KERNEL_VIEW, "BV1xx411c7mD");
  } else if (!strcmp(mode, "viewbig")) {
    request(KERNEL_VIEW, "BV1xx411c7mD"); request(KERNEL_POPULAR, "1");
  } else if (!strcmp(mode, "invalid")) {
    const char *popular[] = {"", "0", "6", "10", "1&ps=50", "a"};
    for (size_t i = 0; i < sizeof(popular) / sizeof(*popular); i++) if (request(KERNEL_POPULAR, popular[i])) return 6;
    if (request(KERNEL_RANKING, "x") || request(KERNEL_CATEGORY, "9999") || request(KERNEL_CATEGORY, "1005&x") || request(KERNEL_PGC_RANKING, "2|3") || request(KERNEL_PGC_INDEX, "4|6") || request(KERNEL_UP, "0|1") || request(KERNEL_UP, "12|51") || request(KERNEL_HOT, "x") || request(KERNEL_SEARCH_NAV, "x")) return 7;
    snprintf(line, sizeof(line), "3|1|%s|%ld|live", KEYS, epoch); if (request(KERNEL_SEARCH, line)) return 8;
    snprintf(line, sizeof(line), "0|6|%s|%ld|page", KEYS, epoch); if (request(KERNEL_SEARCH, line)) return 9;
    snprintf(line, sizeof(line), "0|1|%s|%ld|stale", KEYS, epoch - 120); if (request(KERNEL_SEARCH, line)) return 10;
    snprintf(line, sizeof(line), "0|1|XYZ|%s|%ld|key", "4932caff0ff746eab6f01bf08b70ac45", epoch); if (request(KERNEL_SEARCH, line)) return 11;
    if (request(0, "") || request(KERNEL_MAX_OPERATION + 1, "") || request(KERNEL_VIEW, "BV1xx411c7m") || request(KERNEL_VIEW, "av170001") || request(KERNEL_VIEW, "BV1xx411c7mD&x=1")) return 12;
    input(VISITOR_VALUE); if (!kernel_set_visitor() || request(KERNEL_VISITOR, "")) return 13;
    input("bad;visitor"); if (kernel_set_visitor() || catalog_visitor[0]) return 14;
    input("short"); if (kernel_set_agent() || kernel_agent[0]) return 15;
    input("Mozilla/5.0\r\nCookie: x=1"); if (kernel_set_agent() || kernel_agent[0]) return 16;
    printf("invalid ok\n");
  } else if (!strcmp(mode, "stop")) {
    input("1"); if (!kernel_begin(KERNEL_POPULAR)) return 17;
    double started = test_now(); while (test_now() - started < 300) { kernel_tick(); struct timespec w = {0, 1000000}; nanosleep(&w, NULL); }
    double before = test_now(); if (!kernel_stop() || kernel_active >= 0) return 18;
    printf("stopped %d\n", test_now() - before < 50 ? 1 : 0);
    request(KERNEL_POPULAR, "2");
  } else if (!strcmp(mode, "timeout")) {
    request(KERNEL_POPULAR, "1");
  } else if (!strcmp(mode, "close")) {
    request(KERNEL_POPULAR, "1"); kernel_close();
    if (request(KERNEL_POPULAR, "1")) return 19;
    printf("closed %d\n", kernel_live ? 0 : 1); return 0;
  } else request(KERNEL_POPULAR, "1");
  kernel_close(); return 0;
}
'''


class PublicKernelTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(); folder = Path(cls.tmp.name)
        host = json.loads((ROOT / '.local/host-network/manifest.json').read_text()); prefix = Path(host['opensslPrefix'])
        cls.cert = folder / 'ca.pem'; cls.wrong = folder / 'wrong.pem'; key = folder / 'key.pem'; cls.exe = folder / 'kernel'
        for cert, names in [(cls.cert, 'DNS:api.bilibili.com,DNS:s.search.bilibili.com'), (cls.wrong, 'DNS:outside.invalid')]:
            r = subprocess.run([str(prefix / 'bin/openssl'), 'req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:P-256', '-noenc', '-keyout', str(key), '-out', str(cert), '-days', '1', '-subj', '/CN=fixture', '-addext', 'subjectAltName=' + names], capture_output=True)
            if r.returncode: raise RuntimeError('Fixture certificate generation failed')
            key.chmod(0o600)
            if cert == cls.cert: goodkey = key.read_bytes()
        source = folder / 'main.c'
        source.write_text(SOURCE.replace('AGENT_VALUE', json.dumps(AGENT)).replace('VISITOR_VALUE', json.dumps(VISITOR)))
        args = ['clang', '-std=c11', '-D_DARWIN_C_SOURCE', '-D_POSIX_C_SOURCE=200809L', '-Wall', '-Wextra', '-Werror', '-Wno-deprecated-declarations',
                '-I' + str(ROOT / 'platform/wasm-network/src'), '-I' + str(ROOT / '.local/host-network/prefix/include'), '-I' + str(prefix / 'include'),
                str(source), str(ROOT / '.local/host-network/prefix/lib/libcurl.a'), '-L' + str(prefix / 'lib'), '-lssl', '-lcrypto', '-lldap', '-llber', '-framework', 'SystemConfiguration', '-framework', 'CoreFoundation', '-o', str(cls.exe)]
        r = subprocess.run(args, capture_output=True)
        if r.returncode: raise RuntimeError('HOST public kernel compilation failed: ' + r.stderr.decode())
        keyfile = folder / 'goodkey.pem'; keyfile.write_bytes(goodkey); keyfile.chmod(0o600)
        cls.context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER); cls.context.load_cert_chain(cls.cert, keyfile)

    @classmethod
    def tearDownClass(cls): cls.tmp.cleanup()

    def run_case(self, mode, delay=0.0, body=b'{"code":0,"data":{"list":[]}}', ca=None):
        seen = []; peers = set()
        class Handler(http.server.BaseHTTPRequestHandler):
            protocol_version = 'HTTP/1.1'
            def log_message(self, *args): pass
            def do_GET(self):
                seen.append((self.headers.get('Host'), self.path, self.headers.get('User-Agent'), self.headers.get('Cookie'), self.headers.get('Referer')))
                peers.add(self.client_address)
                if delay: time.sleep(delay)
                try:
                    self.send_response(200); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
                except OSError: pass
        class Server(http.server.ThreadingHTTPServer):
            daemon_threads = True
            def handle_error(self, *args): pass
        server = Server(('127.0.0.1', 0), Handler); server.socket = self.context.wrap_socket(server.socket, server_side=True)
        thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
        try: r = subprocess.run([str(self.exe), mode, str(ca or self.cert), str(server.server_port)], capture_output=True, timeout=60)
        finally: server.shutdown(); server.server_close(); thread.join()
        self.assertEqual(r.returncode, 0, r.stdout.decode() + r.stderr.decode())
        return [line for line in r.stdout.decode().splitlines() if not line.startswith('KERNEL:response:')], seen, peers

    def test_two_hundred_requests_reuse_one_connection(self):
        out, seen, peers = self.run_case('reuse')
        self.assertEqual(out[0], 'KERNEL:ready'); self.assertEqual(len(seen), 200)
        self.assertEqual(out[-2], 'connections 1'); self.assertEqual(len(peers), 1)
        self.assertEqual(out[-1], 'KERNEL:closed')
        self.assertTrue(all(line == '1 200 0 29 0' for line in out[1:-2]))

    def test_every_route_destination_agent_and_cookie(self):
        out, seen, _ = self.run_case('routes')
        self.assertNotIn('refused', ' '.join(out))
        paths = [path for _, path, _, _, _ in seen]
        self.assertEqual(paths[:8], ['/x/web-interface/popular?ps=20&pn=3', '/x/web-interface/ranking/v2?rid=0&type=all', '/x/web-interface/ranking/v2?rid=1005&type=all',
                                     '/pgc/web/rank/list?day=7&season_type=4', '/pgc/season/index/result?season_type=1&type=1&order=3&sort=0&page=2&pagesize=20',
                                     '/x/series/recArchivesByKeywords?mid=12345&keywords=&ps=30&pn=2', '/x/frontend/finger/spi', '/x/web-interface/nav'])
        searches = paths[8:11]
        for path, page, kind in zip(searches, ['2', '1', '5'], ['video', 'bili_user', 'media_bangumi']):
            self.assertTrue(path.startswith('/x/web-interface/wbi/search/type?keyword='), path)
            self.assertIn(f'&page={page}&page_size=20&search_type={kind}&wts=', path); self.assertRegex(path, r'&w_rid=[0-9a-f]{32}$')
        self.assertIn('keyword=%E5%8E%9F%E7%A5%9E%20a%7Cb&', searches[0])
        self.assertEqual(seen[11][:2], ('s.search.bilibili.com', '/main/hotword'))
        # ADR-110: the public video view only, with the video page as referer.
        self.assertEqual(seen[12][:2], ('api.bilibili.com', '/x/web-interface/view?bvid=BV1xx411c7mD')); self.assertEqual(seen[12][4], 'https://www.bilibili.com/video/BV1xx411c7mD')
        self.assertTrue(all(host == 'api.bilibili.com' for host, *_ in seen[:11]))
        # ADR-104: the runtime string only on catalog reads; ADR-106: the visitor cookie only on category and UP reads.
        agents = [agent for _, _, agent, _, _ in seen]
        self.assertEqual(agents, ['BiliSofa-W01-Probe/0.0.15'] + [AGENT] * 6 + ['BiliSofa-W01-Probe/0.0.15'] * 6)
        self.assertEqual([cookie for *_, cookie, _ in seen], [None, None, COOKIE, None, None, COOKIE] + [None] * 7)
        self.assertEqual(seen[8][4], 'https://search.bilibili.com/'); self.assertIsNone(seen[0][4])

    def test_invalid_arguments_never_reach_the_network(self):
        out, seen, _ = self.run_case('invalid')
        self.assertEqual(seen, []); self.assertIn('invalid ok', out)

    def test_stop_cancels_only_the_current_request(self):
        out, seen, _ = self.run_case('stop', delay=1.0)
        self.assertIn('stopped 1', out); self.assertIn('1 200 0 29 0', out); self.assertEqual(out[-1], 'KERNEL:closed')

    def test_slow_response_times_out(self):
        out, _, _ = self.run_case('timeout', delay=10.0)
        self.assertEqual(out[1], '1 0 28 0 0')

    def test_untrusted_certificate_fails_before_http(self):
        out, seen, _ = self.run_case('tls', ca=self.wrong)
        status, transport, size = out[1].split()[1:4]
        self.assertEqual(status, '0'); self.assertNotEqual(transport, '0'); self.assertEqual(size, '0'); self.assertEqual(seen, [])

    def test_body_cap(self):
        out, _, _ = self.run_case('body', body=b'x' * 524289)
        _, _, transport, size, reject = out[1].split()
        self.assertNotEqual(transport, '0'); self.assertLessEqual(int(size), 524288); self.assertEqual(reject, '1')

    def test_view_takes_a_body_larger_than_the_list_buffer(self):
        out, _, _ = self.run_case('viewbig', body=b'{"code":0,"data":{"x":"' + b'y' * 700000 + b'"}}')
        view, popular = out[1].split(), out[2].split()
        self.assertEqual(view[1:], ['200', '0', str(700000 + len(b'{"code":0,"data":{"x":""}}')), '0'])
        self.assertNotEqual(popular[2], '0', 'the 512 KiB list buffer still rejects the same body'); self.assertEqual(popular[4], '1')

    def test_close_releases_the_session(self):
        out, _, _ = self.run_case('close')
        self.assertIn('KERNEL:closed', out); self.assertIn('refused 1', out); self.assertEqual(out[-1], 'closed 1')


if __name__ == '__main__':
    unittest.main()
