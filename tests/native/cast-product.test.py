"""Production receiver policy plus real pinned-library TLS against loopback only."""
from pathlib import Path
import importlib.util,http.server,ssl,subprocess,threading,unittest
spec=importlib.util.spec_from_file_location('vod_host',Path(__file__).with_name('vod-api.test.py'));base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
class CastProduct(unittest.TestCase):
 fixture='tests/native/cast-product-fixture.c'
 @classmethod
 def setUpClass(cls):
  subprocess.run(['python3','tools/cast-product-source.py','build/cast-product'],cwd=base.ROOT,check=True)
  base.VodApiTest.setUpClass.__func__(cls)
 @classmethod
 def tearDownClass(cls):base.VodApiTest.tearDownClass.__func__(cls)
 def run_case(self,mode):
  requests=[];violations=[]
  class Handler(http.server.BaseHTTPRequestHandler):
   def log_message(self,*_args):pass
   def do_GET(self):
    requests.append(self.path)
    if self.headers.get('Range')!='bytes=0-511' or self.headers.get('Cookie') or self.headers.get('Authorization') or self.headers.get('Host')!='fixture.bilivideo.com':violations.append('headers')
    body=b'\0\0\0\x20ftyp'+b'v'*504
    self.send_response(302 if mode=='redirect' else 206)
    if mode=='redirect':self.send_header('Location','https://outside.invalid/private')
    self.send_header('Content-Range','bytes 1-512/8192' if mode=='bad-range' else 'bytes 0-511/8192');self.send_header('Content-Length',str(len(body)));self.end_headers()
    try:self.wfile.write(body)
    except (BrokenPipeError,ConnectionResetError,ssl.SSLError):pass
  server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler);server.socket=self.context.wrap_socket(server.socket,server_side=True);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
  try:r=subprocess.run([str(self.exe),mode,str(self.wrong if mode=='wrong-ca' else self.cert),str(server.server_port)],capture_output=True,timeout=15)
  finally:server.shutdown();server.server_close();thread.join(timeout=2)
  self.assertEqual(r.returncode,0,(r.returncode,r.stdout,r.stderr));self.assertEqual(violations,[]);self.assertIn(b'PRODUCT:closed',r.stdout);self.assertNotIn(b'deadline=',r.stdout)
  return requests,r.stdout
 def test_no_cumulative_listener_or_bridge_quotas_but_signed_deadline_still_closes(self):self.assertEqual(self.run_case('lifetime')[0],[])
 def test_generation_eight_closes_previous_bridge_and_revalidates_new_source(self):self.assertEqual(self.run_case('transitions')[0],[])
 def test_product_identity_destination_and_parser_bounds(self):self.assertEqual(self.run_case('policy')[0],[])
 def test_verified_tls_anonymous_512_byte_source(self):self.assertEqual(len(self.run_case('normal')[0]),1)
 def test_an_actual_bridge_range_still_transfers_after_old_cumulative_budgets(self):self.assertEqual(len(self.run_case('bridge')[0]),1)
 def test_wrong_ca_is_still_rejected(self):self.assertEqual(self.run_case('wrong-ca')[0],[])
 def test_redirect_and_invalid_range_cannot_open_media(self):
  for mode in ['redirect','bad-range']:
   with self.subTest(mode=mode):self.assertEqual(len(self.run_case(mode)[0]),1)
if __name__=='__main__':unittest.main()
