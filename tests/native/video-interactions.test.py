"""Exact production C with synthetic credentials and localhost TLS. No public POST."""
from pathlib import Path
import http.server,importlib.util,ssl,subprocess,threading,unittest,urllib.parse
spec=importlib.util.spec_from_file_location('vod_tests',Path(__file__).with_name('vod-api.test.py'));base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
class InteractionTest(unittest.TestCase):
 fixture='tests/native/video-interactions-fixture.c'
 setUpClass=classmethod(base.VodApiTest.setUpClass.__func__)
 tearDownClass=classmethod(base.VodApiTest.tearDownClass.__func__)
 def case(self,mode):
  requests=[];violations=[]
  class Handler(http.server.BaseHTTPRequestHandler):
   protocol_version='HTTP/1.1'
   def log_message(self,*_args):pass
   def respond(self,method):
    raw=self.rfile.read(int(self.headers.get('Content-Length','0')));requests.append((method,self.path,raw))
    if self.headers.get('Host')!='api.bilibili.com' or 'SESSDATA=synthetic-session' not in self.headers.get('Cookie','') or self.headers.get('Authorization'):violations.append('jar')
    posts={'/x/web-interface/archive/like':{'aid','like','csrf'},'/x/v3/fav/resource/deal':{'rid','type','csrf'},'/x/v2/history/toview/add':{'aid','csrf'},'/x/v2/history/toview/del':{'aid','csrf'},'/x/relation/modify':{'fid','act','re_src','csrf'},'/x/web-interface/coin/add':{'aid','multiply','select_like','csrf'}}
    if method=='POST':
     params=urllib.parse.parse_qs(raw.decode());keys=posts.get(self.path,set());keys=keys|({'add_media_ids'} if 'add_media_ids' in params else {'del_media_ids'}) if self.path=='/x/v3/fav/resource/deal' else keys
     if set(params)!=keys or params.get('csrf')!=['a'*32] or self.headers.get('Content-Type')!='application/x-www-form-urlencoded':violations.append('shape')
     for key,value in params.items():
      if key in ['aid','rid'] and value!=['123'] or key=='fid' and value!=['202'] or key in ['like','multiply'] and value[0] not in ['1','2'] or key=='act' and value[0] not in ['1','2','4'] or key in ['add_media_ids','del_media_ids'] and value!=['456'] or key=='type' and value!=['2'] or key=='select_like' and value!=['0'] or key=='re_src' and value!=['14']:violations.append('fields')
    elif raw or self.path not in ['/x/web-interface/nav','/x/web-interface/view?bvid=BV0000000001','/x/web-interface/archive/relation?aid=123','/x/v3/fav/folder/created/list-all?type=2&rid=123&up_mid=101','/x/relation?fid=202','/x/v2/history/toview']:violations.append('read')
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
  self.assertEqual(result.returncode,0,result.stderr);self.assertEqual(violations,[]);self.assertNotIn(b'synthetic-session',result.stdout);self.assertNotIn(b'csrf=',result.stdout);self.assertIn(b'VODAPI:unclosed' if mode=='unknown' else b'VODAPI:closed',result.stdout);return requests
 def test_exact_routes_both_directions_quantities_and_get_reset(self):
  requests=self.case('normal');posts=[(p,urllib.parse.parse_qs(b.decode())) for m,p,b in requests if m=='POST'];self.assertEqual(len(posts),11);self.assertEqual(len(requests),27);self.assertEqual([p[1]['multiply'] for p in posts if p[0].endswith('/coin/add')],[['1'],['2']])
 def test_input_and_forbidden_operations(self):self.assertEqual(self.case('bounds'),[])
 def test_redirect_wrong_ca(self):
  self.assertEqual(len(self.case('redirect')),1);self.assertEqual(self.case('wrong-ca'),[])
 def test_cookie_and_body_bounds(self):
  for mode in ['cookie-domain','body']:self.assertEqual(len(self.case(mode)),1)
 def test_cancel_deadline_unknown_close(self):
  for mode in ['cancel','deadline']:self.assertEqual(self.case(mode),[])
  self.assertEqual(len(self.case('unknown')),1)
 def test_post_error_never_retries(self):self.assertEqual(sum(m=='POST' for m,_,_ in self.case('post-error')),1)
if __name__=='__main__':unittest.main()
