"""Actual production live reads + API-to-anonymous-relay engine handoff on HOST."""
from pathlib import Path
import importlib.util,http.server,ssl,subprocess,threading,unittest,urllib.parse,urllib.request,urllib.error,hashlib,socket,time,select,os
spec=importlib.util.spec_from_file_location('vod_tests',Path(__file__).with_name('vod-api.test.py'));base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
class LiveNativeTest(unittest.TestCase):
    fixture='tests/native/live-product-fixture.c'
    names='DNS:api.bilibili.com,DNS:api.live.bilibili.com,DNS:fixture.bilivideo.com'
    setUpClass=classmethod(base.VodApiTest.setUpClass.__func__)
    tearDownClass=classmethod(base.VodApiTest.tearDownClass.__func__)
    def case(self,mode,action=None):
        requests=[];violations=[];entered=threading.Event()
        ts=(b'\x47'+b'\0'*187)*6;manifest=b'#EXTM3U\n#EXT-X-TARGETDURATION:3\n#EXT-X-MEDIA-SEQUENCE:1\n#EXTINF:3,\ns2000.ts\n'
        class Handler(http.server.BaseHTTPRequestHandler):
            protocol_version='HTTP/1.1'
            def log_message(self,*_args):pass
            def do_GET(self):
                host=self.headers.get('Host');is_cdn=host=='fixture.bilivideo.com';path=self.path;requests.append((host,path));cookie=self.headers.get('Cookie','')
                if self.headers.get('Authorization') or is_cdn and cookie:violations.append('credential-destination')
                if not is_cdn and ('SESSDATA=synthetic-session' not in cookie or 'bili_jct=' not in cookie):violations.append('api-cookie')
                if host not in ['api.bilibili.com','api.live.bilibili.com','fixture.bilivideo.com']:violations.append('host')
                if path.startswith('/xlive/web-interface/v1/second/getList?'):
                    query,_,signature=path.split('?',1)[1].rpartition('&w_rid=');params=urllib.parse.parse_qs(query,keep_blank_values=True);indices=[46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13];joined='a'*32+'b'*32;mix=''.join(joined[i]for i in indices)
                    if signature!=hashlib.md5((query+mix).encode()).hexdigest() or set(params)!={'area_id','page','parent_area_id','platform','sort_type','vajra_business_key','wts'}:violations.append('wbi')
                body=manifest if path.endswith('m3u8') else ts if is_cdn else b'{"code":0,"data":{}}';status=200;range_header=self.headers.get('Range')
                if is_cdn:
                    entered.set()
                    if mode=='relay-delay':time.sleep(.5)
                    if range_header:
                        if range_header!='bytes=0-511':violations.append('cdn-range')
                        status=206;body=ts[:512]
                    if mode=='relay-oversize' and path.endswith('ts'):body=b'x'*8388609
                    if mode=='relay-large' and path.endswith('ts'):body=(b'\x47'+b'\0'*187)*30000
                if mode=='body' and not is_cdn:body=b'x'*16385
                try:
                    redirect=mode=='redirect' or mode=='relay-redirect' and is_cdn
                    self.send_response(302 if redirect else status)
                    if redirect:self.send_header('Location','https://outside.invalid/private')
                    if mode=='cookie-domain' and not is_cdn:self.send_header('Set-Cookie','x=y; Domain=.outside.invalid; Secure; Path=/')
                    if is_cdn:self.send_header('Set-Cookie','cdn=never-retained; Domain=.bilivideo.com; Secure; Path=/')
                    if range_header:self.send_header('Content-Range','bytes 188-699/1128' if mode=='range-invalid' else 'bytes 0-511/1128')
                    if mode=='range-encoding':self.send_header('Content-Encoding','gzip')
                    self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
                except (BrokenPipeError,ConnectionResetError,ssl.SSLError):pass
            def do_POST(self):violations.append('post');self.send_response(405);self.send_header('Content-Length','0');self.end_headers()
        class Server(http.server.ThreadingHTTPServer):
            daemon_threads=True
            def handle_error(self,*_args):pass
        server=Server(('127.0.0.1',0),Handler);server.socket=self.context.wrap_socket(server.socket,server_side=True);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        proc=subprocess.Popen([str(self.exe),mode,str(self.wrong if mode=='wrong-ca' else self.cert),str(server.server_port)],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE);out=b''
        try:
            if action:
                until=time.monotonic()+5
                while b'HOST:ready\n' not in out and time.monotonic()<until:
                    if select.select([proc.stdout],[],[],.1)[0]:out+=os.read(proc.stdout.fileno(),4096)
                self.assertIn(b'HOST:ready',out);action(entered,ts,manifest)
                if proc.poll() is None:proc.stdin.write(b's');proc.stdin.flush()
            tail,err=proc.communicate(timeout=18);out+=tail;self.assertEqual(proc.returncode,0,err);self.assertEqual(violations,[]);self.assertNotIn(b'synthetic-session',out);self.assertNotIn(b'csrf=',out)
            self.assertIn(b'VODAPI:unclosed' if mode=='unknown' else b'VODAPI:closed',out)
            if mode.startswith(('relay','range')):
                self.assertIn(b'LIVE:closed',out)
                with socket.socket()as check:self.assertNotEqual(check.connect_ex(('127.0.0.1',40325)),0)
            return requests,out
        finally:
            if proc.poll() is None:proc.kill();proc.communicate()
            server.shutdown();server.server_close();thread.join(timeout=2)
    def get(self,path='index.m3u8',method='GET',headers=None):
        opener=urllib.request.build_opener(urllib.request.ProxyHandler({}));return opener.open(urllib.request.Request('http://127.0.0.1:40325/'+'a'*32+'/'+path,method=method,headers=headers or {}),timeout=8)
    def test_fixed_read_routes_wbi_and_no_write_or_caller_url(self):
        requests,_=self.case('api');self.assertEqual(len(requests),8);paths=[p for _,p in requests];self.assertEqual(paths[0],'/x/web-interface/nav');self.assertEqual(paths[-1],'/xlive/web-ucenter/user/get_user_info');self.assertIn('/xlive/web-ucenter/user/following?page=1&page_size=9&ignoreRecord=1&hit_ab=false',paths);self.assertIn('/xlive/web-room/v1/dM/gethistory?roomid=123&room_type=0',paths)
    def test_invalid_ids_parameters_old_vod_operations_and_urls_never_request(self):self.assertEqual(self.case('bounds')[0],[])
    def test_tls_redirect_cookie_domain_and_body_limits(self):
        for mode,count in [('wrong-ca',0),('redirect',1),('cookie-domain',1),('body',1)]:self.assertEqual(len(self.case(mode)[0]),count)
    def test_api_cancel_deadline_and_unconfirmed_cleanup_never_start_relay(self):
        for mode in ['cancel','deadline']:self.assertEqual(self.case(mode)[0],[])
        self.assertEqual(len(self.case('unknown')[0]),1)
    def test_serial_api_cookie_cleanup_then_anonymous_cdn_beyond_old_quotas_and_ids(self):
        def action(_entered,ts,manifest):
            with self.get(headers={'Range':'bytes=0-','Content-Length':'0'})as r:self.assertEqual(r.status,206);self.assertEqual(r.read(),manifest)
            with self.get('s2000.ts')as r:self.assertEqual(r.read(),ts)
            with self.get('s1.ts')as r:self.assertEqual(r.read(),ts)
        requests,_=self.case('relay',action);self.assertEqual([h for h,_ in requests],['api.bilibili.com','fixture.bilivideo.com','fixture.bilivideo.com','fixture.bilivideo.com'])
    def test_same_runtime_restarts_anonymous_engine_only_after_first_actual_close(self):
        def action(_entered,ts,manifest):
            with self.get()as r:self.assertEqual(r.read(),manifest)
            with self.get('s1.ts')as r:self.assertEqual(r.read(),ts)
        requests,out=self.case('relay-restart',action)
        self.assertIn(b'HOST:first_relay_closed',out);self.assertEqual(len(requests),4);self.assertEqual([h for h,_ in requests][0],'api.bilibili.com')
    def test_relay_head_ranges_invalid_body_token_and_unknown_uri(self):
        def action(_entered,ts,_manifest):
            with self.get('s1.ts',headers={'Range':'bytes=188-375'})as r:self.assertEqual(r.status,206);self.assertEqual(r.read(),ts[188:376])
            with self.get('s1.ts',method='HEAD',headers={'Range':'bytes=188-375','Content-Length':'0'})as r:self.assertEqual(r.status,200);self.assertEqual(r.read(),b'');self.assertEqual(r.headers['Content-Length'],str(len(ts)))
            for path in ['s2.ts','index.m3u8?url=https://outside.invalid','../outside','s0.ts']:
                with self.assertRaises(urllib.error.HTTPError):self.get(path)
            with self.assertRaises(urllib.error.HTTPError):self.get('s1.ts',headers={'Content-Length':'1'})
        requests,_=self.case('relay',action);self.assertEqual(len(requests),3)
    def test_segment_capacity_is_per_request_and_can_exceed_old_four_mib(self):
        def action(_entered,_ts,_manifest):
            with self.get('s1.ts')as r:self.assertEqual(len(r.read()),188*30000)
        self.case('relay-large',action)
    def test_redirect_and_oversized_segment_close_both_owned_engines(self):
        for mode in ['relay-redirect','relay-oversize']:
            def action(_entered,_ts,_manifest):
                with self.assertRaises(OSError):self.get('s1.ts')
            self.case(mode,action)
    def test_cancellation_releases_inflight_curl_client_and_listener(self):
        pending=None
        def action(entered,_ts,_manifest):
            nonlocal pending
            pending=socket.create_connection(('127.0.0.1',40325),timeout=3);pending.sendall(('GET /'+'a'*32+'/s1.ts HTTP/1.1\r\nHost: loopback\r\n\r\n').encode());self.assertTrue(entered.wait(3))
        try:self.case('relay-delay',action)
        finally:
            if pending:pending.close()
    def test_ts_preflight_requires_exact_range_and_identity_encoding(self):
        for mode in ['range','range-invalid','range-encoding']:
            _requests,out=self.case(mode);self.assertEqual(b'HOST:range_valid' in out,mode=='range')
if __name__=='__main__':unittest.main()
