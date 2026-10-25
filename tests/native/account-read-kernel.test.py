"""ADR-108 P0b HOST account read kernel against local TLS with synthetic cookies only:
one session and connection for every private read, new 20-row routes, bounds, stop and session end."""
from pathlib import Path
import http.server, ssl, threading, tempfile, subprocess, json, time, unittest
ROOT = Path(__file__).resolve().parents[2]
COOKIES = '.bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic-session\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\tsynthetic-csrf\n'
SOURCE = r'''
#define ACCOUNT_KERNEL_NO_MAIN
#include "account-read-kernel.c"
static struct curl_slist *test_map; static const char *test_ca; static int test_port;
static int prepare(void) {
  if (!kernel_open()) return 0;
  if (!test_map) { char map[96]; snprintf(map, sizeof(map), "api.bilibili.com:443:127.0.0.1:%d", test_port); test_map = curl_slist_append(NULL, map); }
  return curl_easy_setopt(easy, CURLOPT_CONNECT_TO, test_map) == CURLE_OK && curl_easy_setopt(easy, CURLOPT_CAINFO, test_ca) == CURLE_OK;
}
static int import(void) { strcpy(input, COOKIES_VALUE); return auth_import_cookies((int)strlen(input)); }
static int request(int op, const char *value) {
  memset(input, 0, sizeof(input)); strcpy(input, value);
  if (!kernel_begin(op)) { printf("refused %d\n", op); return 0; }
  double until = now_ms() + 12000;
  while (live && active >= 0 && now_ms() < until) { tick(); struct timespec w = {0, 1000000}; nanosleep(&w, NULL); }
  printf("%d %ld %d %zu\n", op, http_status, result_code, body_size); auth_response_clear(); return 1;
}
static int clean(void) { return !live && !easy && !multi && !initialized && !added && active < 0 && !body_size && !*input && !*request_url; }
int main(int argc, char **argv) {
  if (argc != 4) return 1; test_ca = argv[2]; test_port = atoi(argv[3]);
  const char *mode = argv[1];
  if (!prepare() || !import()) return 2;
  if (!strcmp(mode, "session")) {
    char line[256]; snprintf(line, sizeof(line), "0|0|0||7cd084941338484aae1ad9425b84077c|4932caff0ff746eab6f01bf08b70ac45|%ld", (long)time(NULL));
    request(0, ""); request(2, "0|0|"); request(3, ""); request(5, ""); request(7, "2"); request(8, "123|3"); request(9, "1005"); request(10, "12345|2"); request(6, line);
  } else if (!strcmp(mode, "invalid")) {
    const char *batches[] = {"", "0", "6", "01", "1|2", "1&ps=50"};
    for (size_t i = 0; i < sizeof(batches) / sizeof(*batches); i++) if (request(7, batches[i])) return 3;
    const char *items[] = {"123", "0|1", "123|6", "123|0", "1&x|1", "12345678901234567|1", "1|1|1"};
    for (size_t i = 0; i < sizeof(items) / sizeof(*items); i++) if (request(8, items[i])) return 4;
    if (request(9, "9999") || request(9, "1005|1") || request(10, "0|1") || request(10, "12|51") || request(10, "9007199254740992|1")) return 5;
    if (request(1, "1") || request(4, "123|1") || request(11, "1") || request(-1, "")) return 6;
    printf("invalid ok\n");
  } else if (!strcmp(mode, "stop")) {
    strcpy(input, "1"); if (!kernel_begin(7)) return 7;
    double started = now_ms(); while (now_ms() - started < 300) { tick(); struct timespec w = {0, 1000000}; nanosleep(&w, NULL); }
    if (!kernel_stop() || !live || active >= 0) return 8;
    printf("stopped\n"); request(9, "1005");
  } else if (!strcmp(mode, "deadline")) {
    request(9, "1005"); session_until = now_ms() - 1; tick();
    if (live) return 9;
    if (!prepare()) return 10;
    request(9, "1005");  /* a new session starts with an empty jar */
  } else if (!strcmp(mode, "close")) {
    request(9, "1005"); auth_stop(); curl_slist_free_all(test_map); return clean() ? 0 : 11;
  }
  auth_stop(); curl_slist_free_all(test_map); return clean() ? 0 : 12;
}
'''


class AccountReadKernelTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(); folder = Path(cls.tmp.name)
        host = json.loads((ROOT / '.local/host-network/manifest.json').read_text()); prefix = Path(host['opensslPrefix'])
        cls.cert = folder / 'ca.pem'; key = folder / 'key.pem'; cls.exe = folder / 'kernel'
        r = subprocess.run([str(prefix / 'bin/openssl'), 'req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:P-256', '-noenc', '-keyout', str(key), '-out', str(cls.cert), '-days', '1', '-subj', '/CN=api.bilibili.com', '-addext', 'subjectAltName=DNS:api.bilibili.com'], capture_output=True)
        if r.returncode: raise RuntimeError('Fixture certificate generation failed')
        key.chmod(0o600)
        source = folder / 'main.c'; source.write_text(SOURCE.replace('COOKIES_VALUE', json.dumps(COOKIES)))
        args = ['clang', '-std=c11', '-D_DARWIN_C_SOURCE', '-D_POSIX_C_SOURCE=200809L', '-Wall', '-Wextra', '-Werror', '-Wno-unused-function', '-Wno-deprecated-declarations',
                '-I' + str(ROOT / 'platform/wasm-network/src'), '-I' + str(ROOT / '.local/host-network/prefix/include'), '-I' + str(prefix / 'include'),
                str(source), str(ROOT / '.local/host-network/prefix/lib/libcurl.a'), '-L' + str(prefix / 'lib'), '-lssl', '-lcrypto', '-lldap', '-llber', '-framework', 'SystemConfiguration', '-framework', 'CoreFoundation', '-o', str(cls.exe)]
        r = subprocess.run(args, capture_output=True)
        if r.returncode: raise RuntimeError('HOST account kernel compilation failed: ' + r.stderr.decode())
        cls.context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER); cls.context.load_cert_chain(cls.cert, key)

    @classmethod
    def tearDownClass(cls): cls.tmp.cleanup()

    def run_case(self, mode, delay=0.0):
        seen = []; peers = set()
        class Handler(http.server.BaseHTTPRequestHandler):
            protocol_version = 'HTTP/1.1'
            def log_message(self, *args): pass
            def do_GET(self):
                seen.append((self.path, self.headers.get('Cookie'), self.headers.get('Referer'))); peers.add(self.client_address)
                if delay: time.sleep(delay)
                body = b'{"code":0,"data":{}}'
                try: self.send_response(200); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
                except OSError: pass
        class Server(http.server.ThreadingHTTPServer):
            daemon_threads = True
            def handle_error(self, *args): pass
        server = Server(('127.0.0.1', 0), Handler); server.socket = self.context.wrap_socket(server.socket, server_side=True)
        thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
        try: r = subprocess.run([str(self.exe), mode, str(self.cert), str(server.server_port)], capture_output=True, timeout=60)
        finally: server.shutdown(); server.server_close(); thread.join()
        self.assertEqual(r.returncode, 0, r.stdout.decode() + r.stderr.decode())
        return [l for l in r.stdout.decode().splitlines() if not l.startswith('AUTH:response:')], seen, peers

    def test_one_session_and_connection_serve_every_private_read(self):
        out, seen, peers = self.run_case('session')
        self.assertNotIn('refused', ' '.join(out)); self.assertEqual(len(seen), 9); self.assertEqual(len(peers), 1)
        paths = [p for p, _, _ in seen]
        self.assertEqual(paths[:8], ['/x/web-interface/nav', '/x/web-interface/history/cursor?max=0&view_at=0&business=', '/x/v3/fav/folder/list4navigate',
                                     '/x/polymer/web-dynamic/v1/feed/nav?update_baseline=&offset=',
                                     '/x/v2/medialist/toview/web?mobi_app=web&ps=20&desc=true&otype=2&with_current=false&direction=false&preview=0&use_pn=true&pn=2',
                                     '/x/v2/medialist/resource/list?mobi_app=web&type=3&biz_id=123&ps=20&desc=true&sort_field=3&tid=0&otype=2&with_current=false&direction=false&preview=0&use_pn=true&pn=3',
                                     '/x/web-interface/ranking/v2?rid=1005&type=all', '/x/series/recArchivesByKeywords?mid=12345&keywords=&ps=30&pn=2'])
        self.assertTrue(paths[8].startswith('/x/web-interface/wbi/index/top/feed/rcmd?') and '&ps=12&' in paths[8])
        self.assertTrue(all(c and 'SESSDATA=synthetic-session' in c and 'bili_jct=synthetic-csrf' in c for _, c, _ in seen), 'the verified jar goes with every read')
        self.assertEqual([r for _, _, r in seen][4:8], ['https://www.bilibili.com/list/watchlater', 'https://www.bilibili.com/', 'https://www.bilibili.com/', 'https://space.bilibili.com/'])
        self.assertEqual(out[0], 'AUTH:ready'); self.assertEqual(out[-1], 'AUTH:closed')

    def test_invalid_or_retired_operations_never_reach_the_network(self):
        out, seen, _ = self.run_case('invalid')
        self.assertEqual(seen, []); self.assertIn('invalid ok', out)

    def test_stop_cancels_only_the_current_transfer(self):
        out, seen, _ = self.run_case('stop', delay=1.0)
        self.assertIn('stopped', out); self.assertIn('9 200 0 20', out)
        self.assertIn('SESSDATA=synthetic-session', seen[-1][1], 'the session and its jar survive a stop')

    def test_session_end_closes_and_a_new_session_starts_without_the_old_jar(self):
        out, seen, _ = self.run_case('deadline')
        self.assertIn('AUTH:deadline', out); self.assertIn('AUTH:closed', out)
        self.assertIsNotNone(seen[0][1]); self.assertIsNone(seen[1][1])

    def test_close_wipes_every_buffer_and_handle(self):
        out, _, _ = self.run_case('close')
        self.assertEqual(out[-1], 'AUTH:closed')


if __name__ == '__main__':
    unittest.main()
