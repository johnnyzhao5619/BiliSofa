"""Production follow lane against a local TLS server; no real account writes."""
from pathlib import Path
import http.server, importlib.util, ssl, subprocess, threading, unittest, urllib.parse, hashlib
spec=importlib.util.spec_from_file_location('vod_tests',Path(__file__).with_name('vod-api.test.py'))
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
class PgcFollowTest(unittest.TestCase):
    fixture='tests/native/pgc-follow-fixture.c'
    setUpClass=classmethod(base.VodApiTest.setUpClass.__func__)
    tearDownClass=classmethod(base.VodApiTest.tearDownClass.__func__)
    def case(self,mode):
        requests=[];violations=[]
        class Handler(http.server.BaseHTTPRequestHandler):
            protocol_version='HTTP/1.1'
            def log_message(self,*_args):pass
            def respond(self,method):
                raw=self.rfile.read(int(self.headers.get('Content-Length','0')))
                is_list=self.path.startswith('/x/space/bangumi/follow/list?')
                requests.append((method,self.path.split('?')[0] if is_list else self.path))
                if self.headers.get('Host')!='api.bilibili.com' or 'SESSDATA=synthetic-session' not in self.headers.get('Cookie','') or 'bili_jct=' not in self.headers.get('Cookie','') or self.headers.get('Authorization'):violations.append('jar')
                if method=='POST':
                    if self.path not in ['/pgc/web/follow/add','/pgc/web/follow/del'] or raw!=b'season_id=123&csrf=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' or self.headers.get('Content-Type')!='application/x-www-form-urlencoded':violations.append('post-shape')
                elif is_list:
                    query,_,signature=self.path.split('?',1)[1].rpartition('&w_rid=');params=urllib.parse.parse_qs(query);joined='a'*32+'b'*32;indices=[46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13];mix=''.join(joined[i] for i in indices)
                    if raw or set(params)!={'follow_status','playform','pn','ps','type','vmid','wts'} or any(params.get(k)!=[v] for k,v in {'follow_status':'0','playform':'web','pn':'1','ps':'4','type':'2','vmid':'101'}.items()) or signature!=hashlib.md5((query+mix).encode()).hexdigest():violations.append('wbi-list')
                elif raw or self.path not in ['/x/web-interface/nav','/pgc/view/web/season?season_id=123']:violations.append('read-shape')
                body=b'x'*16385 if mode=='body' else b'{"code":0,"data":{}}'
                try:
                    self.send_response(302 if mode=='redirect' else 503 if mode=='post-error' and method=='POST' else 200)
                    if mode=='redirect':self.send_header('Location','https://outside.invalid/private')
                    if mode=='cookie-domain':self.send_header('Set-Cookie','x=y; Domain=.outside.invalid; Secure; Path=/')
                    self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
                except (BrokenPipeError,ConnectionResetError,ssl.SSLError):pass
            def do_GET(self):self.respond('GET')
            def do_POST(self):self.respond('POST')
        server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler);server.socket=self.context.wrap_socket(server.socket,server_side=True);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        try:result=subprocess.run([str(self.exe),mode,str(self.wrong if mode=='wrong-ca' else self.cert),str(server.server_port)],capture_output=True,timeout=18)
        finally:server.shutdown();server.server_close();thread.join(timeout=2)
        self.assertEqual(result.returncode,0,result.stderr);self.assertEqual(violations,[]);self.assertNotIn(b'synthetic-session',result.stdout);self.assertNotIn(b'csrf=',result.stdout)
        self.assertIn(b'VODAPI:unclosed' if mode=='unknown' else b'VODAPI:closed',result.stdout);return requests
    def test_exact_fixed_methods_body_and_get_reset(self):
        self.assertEqual(self.case('normal'),[('GET','/x/web-interface/nav'),('GET','/x/space/bangumi/follow/list'),('POST','/pgc/web/follow/add'),('GET','/pgc/view/web/season?season_id=123'),('POST','/pgc/web/follow/del'),('GET','/x/web-interface/nav')])
    def test_rejected_inputs_open_no_requests(self):self.assertEqual(self.case('bounds'),[])
    def test_redirect_not_followed(self):self.assertEqual(self.case('redirect'),[('GET','/x/web-interface/nav')])
    def test_wrong_ca_no_http(self):self.assertEqual(self.case('wrong-ca'),[])
    def test_cookie_domain_and_nav_body_bounds(self):
        for mode in ['cookie-domain','body']:self.assertEqual(self.case(mode),[('GET','/x/web-interface/nav')])
    def test_cancel_deadline_and_unknown_close(self):
        for mode in ['cancel','deadline']:self.assertEqual(self.case(mode),[])
        self.assertEqual(self.case('unknown'),[('GET','/x/web-interface/nav')])
    def test_failed_post_never_retries(self):
        requests=self.case('post-error');self.assertEqual(len(requests),3);self.assertEqual(sum(method=='POST' for method,_ in requests),1)
if __name__=='__main__':unittest.main()
