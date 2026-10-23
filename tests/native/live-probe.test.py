"""HOST TLS transport fixture; never contacts Bilibili or uses a real account."""
from pathlib import Path
import http.server,ssl,threading,tempfile,subprocess,json,unittest
ROOT=Path(__file__).resolve().parents[2]
class LiveNativeTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory();folder=Path(cls.tmp.name);prefix=Path(json.loads((ROOT/'.local/host-network/manifest.json').read_text())['opensslPrefix']);cls.cert=folder/'ca.pem';key=folder/'fixture.key';cls.exe=folder/'live'
  p=subprocess.run([str(prefix/'bin/openssl'),'req','-x509','-newkey','ec','-pkeyopt','ec_paramgen_curve:P-256','-noenc','-keyout',str(key),'-out',str(cls.cert),'-days','1','-subj','/CN=BiliSofa fixture','-addext','subjectAltName=DNS:api.live.bilibili.com,DNS:live-fixture.bilivideo.com'],capture_output=True)
  if p.returncode:raise RuntimeError('Fixture TLS generation failed')
  key.chmod(0o600);source=folder/'main.c';source.write_text(r'''
#define LIVE_NO_MAIN
#include "live-probe.c"
static int clean(void){return !live && !easy && !multi && !initialized && !added && active<0 && !body_size && !*body && !*input;}
int main(int argc,char **argv){
 if(argc!=4 || !start())return 1;
 if(!strcmp(argv[1],"policy")){
  if(!allowed("https://live-fixture.bilivideo.com/a.m3u8?sign=synthetic",".m3u8") || allowed("https://127.0.0.1/a.ts",".ts") || allowed("https://live-fixture.bilivideo.com:443/a.ts",".ts") || allowed("https://live-fixture.bilivideo.com.evil.invalid/a.ts",".ts") || allowed("https://u@live-fixture.bilivideo.com/a.ts",".ts"))return 2;
  active=1;if(body_cb("x",32769,1,NULL) || header_cb("x",8193,1,NULL))return 3;active=-1;finish();return clean()?0:4;
 }
 char mapping[160];struct curl_slist *list=NULL;
 snprintf(mapping,sizeof(mapping),"api.live.bilibili.com:443:127.0.0.1:%s",argv[3]);list=curl_slist_append(list,mapping);
 snprintf(mapping,sizeof(mapping),"live-fixture.bilivideo.com:443:127.0.0.1:%s",argv[3]);list=curl_slist_append(list,mapping);
 if(curl_easy_setopt(easy,CURLOPT_CAINFO,argv[2])!=CURLE_OK || curl_easy_setopt(easy,CURLOPT_CONNECT_TO,list)!=CURLE_OK || !live_begin(0) || live_begin(1))return 5;
 if(!strcmp(argv[1],"cancel")){live_stop();curl_slist_free_all(list);return clean()?0:6;}
 if(!strcmp(argv[1],"deadline")){request_until=now_ms()-1;tick();curl_slist_free_all(list);return clean()?0:7;}
 int op=0;double deadline=now_ms()+15000;
 while(live && now_ms()<deadline){tick();if(live && active<0){
  if(result_code || http_status!=(op==2?206:200)){puts("HOST:rejected");finish();break;}
  if(op==2){if(body_size!=512 || body[0]!=0x47)return 8;puts("HOST:complete");finish();break;}
  strcpy(input,op==0?"https://live-fixture.bilivideo.com/live.m3u8":"https://live-fixture.bilivideo.com/segment.ts");if(!live_begin(++op))return 9;
 }struct timespec wait={0,1000000};nanosleep(&wait,NULL);}
 if(live)finish();curl_slist_free_all(list);return clean()?0:10;
}
''')
  command=['clang','-std=c11','-D_DARWIN_C_SOURCE','-D_POSIX_C_SOURCE=200809L','-Wall','-Wextra','-Werror','-Wno-unused-function','-I'+str(ROOT/'platform/wasm-network/src'),'-I'+str(ROOT/'.local/host-network/prefix/include'),'-I'+str(prefix/'include'),str(source),str(ROOT/'.local/host-network/prefix/lib/libcurl.a'),'-L'+str(prefix/'lib'),'-lssl','-lcrypto','-lldap','-llber','-framework','SystemConfiguration','-framework','CoreFoundation','-o',str(cls.exe)]
  p=subprocess.run(command,capture_output=True)
  if p.returncode:raise RuntimeError(p.stderr.decode())
  cls.context=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);cls.context.load_cert_chain(cls.cert,key)
 @classmethod
 def tearDownClass(cls):cls.tmp.cleanup()
 def run_case(self,mode='good',variant='good'):
  requests=[];violations=[]
  class Handler(http.server.BaseHTTPRequestHandler):
   def log_message(self,*args):pass
   def do_GET(self):
    path=self.path.split('?')[0];requests.append(path)
    if self.headers.get('Cookie') or self.headers.get('Authorization') or self.headers.get('Referer'):violations.append('credentials')
    if variant=='redirect' and path.endswith('m3u8'):
     self.send_response(302);self.send_header('Location','https://outside.invalid/private');self.end_headers();return
    body=b'{"code":0}' if path.startswith('/xlive/') else b'#EXTM3U\n' if path.endswith('m3u8') else bytes([0x47])+bytes(511)
    if variant=='oversize' and path.endswith('m3u8'):body=b'x'*32769
    if path.endswith('.ts') and self.headers.get('Range')!='bytes=0-511':violations.append('range')
    try:
     self.send_response(206 if path.endswith('.ts') else 200);self.send_header('Content-Length',str(len(body)));self.send_header('Set-Cookie','synthetic=must-not-be-forwarded; Secure; Path=/');self.end_headers();self.wfile.write(body)
    except OSError:pass
  class Server(http.server.ThreadingHTTPServer):
   daemon_threads=True
   def handle_error(self,*args):pass
  server=Server(('127.0.0.1',0),Handler);server.socket=self.context.wrap_socket(server.socket,server_side=True);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
  try:p=subprocess.run([str(self.exe),mode,str(self.cert),str(server.server_port)],capture_output=True,timeout=20)
  finally:server.shutdown();server.server_close();thread.join()
  self.assertEqual(p.returncode,0,p.stderr.decode());self.assertEqual(violations,[]);self.assertNotIn('synthetic',p.stdout.decode());self.assertIn('LIVE:closed',p.stdout.decode());return p.stdout.decode(),requests
 def test_three_gets_tls_range_no_credentials_and_release(self):
  out,paths=self.run_case();self.assertIn('HOST:complete',out);self.assertEqual(len(paths),3)
 def test_redirect_not_followed(self):
  out,paths=self.run_case(variant='redirect');self.assertIn('HOST:rejected',out);self.assertEqual(len(paths),2)
 def test_manifest_oversize_rejected(self):
  out,paths=self.run_case(variant='oversize');self.assertIn('HOST:rejected',out);self.assertEqual(len(paths),2)
 def test_cancel_deadline_and_destination_bounds_without_http(self):
  for mode in ['cancel','deadline','policy']:
   with self.subTest(mode=mode):self.assertEqual(self.run_case(mode)[1],[])
if __name__=='__main__':unittest.main()
