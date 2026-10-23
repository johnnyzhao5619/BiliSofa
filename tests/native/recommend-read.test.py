"""Fixed authenticated recommendation GET and WBI against local TLS only."""
from pathlib import Path
import hashlib,http.server,importlib.util,ssl,subprocess,threading,unittest,urllib.parse
spec=importlib.util.spec_from_file_location('vod_host',Path(__file__).with_name('vod-api.test.py'));base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
class Recommend(unittest.TestCase):
 fixture='tests/native/recommend-fixture.c'
 @classmethod
 def setUpClass(cls):base.VodApiTest.setUpClass.__func__(cls)
 @classmethod
 def tearDownClass(cls):base.VodApiTest.tearDownClass.__func__(cls)
 def run_case(self,mode):
  requests=[];violations=[]
  class Handler(http.server.BaseHTTPRequestHandler):
   def log_message(self,*_args):pass
   def do_GET(self):
    requests.append(self.path)
    if self.headers.get('Host')!='api.bilibili.com' or 'SESSDATA=synthetic-session'not in self.headers.get('Cookie','') or self.headers.get('Authorization'):violations.append('jar')
    if self.path!='/x/web-interface/nav':
     if not self.path.startswith('/x/web-interface/wbi/index/top/feed/rcmd?'):violations.append('route')
     raw=self.path.split('?',1)[1];query,_,signature=raw.rpartition('&w_rid=');params=urllib.parse.parse_qs(raw,keep_blank_values=True);joined='a'*32+'b'*32;idx=[46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13];mix=''.join(joined[i]for i in idx)
     expected={'brush','feed_version','fetch_row','fresh_idx','fresh_idx_1h','fresh_type','homepage_ver','last_showlist','ps','web_location','wts','w_rid'}
     if set(params)!=expected or hashlib.md5((query+mix).encode()).hexdigest()!=signature or params['fresh_type']!=['5'if mode=='refresh'else'4'] or params['last_showlist']!=['av_1,av_2'] or params['ps']!=['12'] or self.headers.get('Referer')!='https://www.bilibili.com/':violations.append('signature-or-query')
    body=b'x'*524289 if mode=='body'else b'{"code":0,"data":{}}';self.send_response(302 if mode=='redirect'else 200)
    if mode=='redirect':self.send_header('Location','https://outside.invalid/private')
    self.send_header('Content-Length',str(len(body)));self.end_headers()
    try:self.wfile.write(body)
    except (OSError,ssl.SSLError):pass
  server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler);server.socket=self.context.wrap_socket(server.socket,server_side=True);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
  try:r=subprocess.run([str(self.exe),mode,str(self.wrong if mode=='tls'else self.cert),str(server.server_port)],capture_output=True,timeout=16)
  finally:server.shutdown();server.server_close();thread.join(timeout=2)
  self.assertEqual(r.returncode,0,(r.returncode,r.stdout,r.stderr));self.assertEqual(violations,[]);self.assertNotRegex(r.stdout.decode(),r'synthetic|SESSDATA|bili_jct|deadline=|w_rid=');self.assertIn(b'AUTH:unclosed'if mode=='unknown'else b'AUTH:closed',r.stdout)
  self.assertEqual(len(requests),0 if mode in ['bounds','tls','cancel','deadline']else 1 if mode in ['redirect','body']else 2)
 def test_signed_next_and_refresh_are_fixed_gets_same_private_jar(self):
  for mode in ['normal','refresh']:self.run_case(mode)
 def test_bounds_fail_before_any_request(self):self.run_case('bounds')
 def test_tls_and_redirect_are_not_bypassed(self):
  for mode in ['tls','redirect']:self.run_case(mode)
 def test_oversized_response_stops_without_second_request(self):self.run_case('body')
 def test_cancel_and_deadline_close_before_transfer(self):
  for mode in ['cancel','deadline']:self.run_case(mode)
 def test_unknown_close_is_not_success(self):self.run_case('unknown')
if __name__=='__main__':unittest.main()
