"""Fixed readonly production routes through HOST TLS fixture; no external/account requests."""
from pathlib import Path
import http.server,ssl,threading,tempfile,subprocess,socket,json,unittest
ROOT=Path(__file__).resolve().parents[2]
class AccountNativeTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory();folder=Path(cls.tmp.name);m=json.loads((ROOT/'.local/host-network/manifest.json').read_text());prefix=Path(m['opensslPrefix']);cls.cert=folder/'ca.pem';key=folder/'fixture.key';cls.exe=folder/'account'
  p=subprocess.run([str(prefix/'bin/openssl'),'req','-x509','-newkey','ec','-pkeyopt','ec_paramgen_curve:P-256','-noenc','-keyout',str(key),'-out',str(cls.cert),'-days','1','-subj','/CN=BiliSofa fixture','-addext','subjectAltName=DNS:passport.bilibili.com,DNS:api.bilibili.com'],capture_output=True)
  if p.returncode:raise RuntimeError('Fixture TLS generation failed')
  key.chmod(0o600)
  source=folder/'main.c';source.write_text(r'''
#define AUTH_NO_MAIN
#include "account-probe.c"
static int clean(void){return !live && !easy && !multi && !initialized && !added && active<0 && !body_size && !cookie_size && !*body && !*input && !*cookie_output && !*request_url;}
static int configure(const char *ca,int port){
 char p[128];struct curl_slist *list=NULL;
 snprintf(p,sizeof(p),"passport.bilibili.com:443:127.0.0.1:%d",port);list=curl_slist_append(list,p);
 snprintf(p,sizeof(p),"api.bilibili.com:443:127.0.0.1:%d",port);struct curl_slist *next=curl_slist_append(list,p);if(!next)return 0;list=next;
 if(curl_easy_setopt(easy,CURLOPT_CAINFO,ca)!=CURLE_OK || curl_easy_setopt(easy,CURLOPT_CONNECT_TO,list)!=CURLE_OK)return 0;
 /* Test-process mapping only; no such remapping option exists in the production IPC. */
 return 1;
}
int main(int argc,char **argv){
 if(argc!=4)return 1;const char *mode=argv[1];if(!start() || !configure(argv[2],atoi(argv[3])))return 2;
 if(!strcmp(mode,"bounds")){char bytes[8193]={0};if(header_cb(bytes,1,8193,NULL) || body_cb(bytes,1,AUTH_CAP+1,NULL))return 3;finish();return clean()?0:4;}
 if(!strcmp(mode,"import-invalid")){const char *bad=".outside.invalid\tTRUE\t/\tTRUE\t0\tSESSDATA\twrong\n";strcpy(input,bad);if(auth_import_cookies((int)strlen(input)))return 5;finish();return clean()?0:6;}
 if(!auth_begin(0) || auth_begin(1) || auth_begin(5))return 7;
 if(!strcmp(mode,"cancel")){auth_stop();return clean()?0:8;}
 if(!strcmp(mode,"deadline")){request_until=now_ms()-1;tick();return clean()?0:9;}
 int op=0,restored=0;char saved[AUTH_PRIVATE_CAP+1]={0};double until=now_ms()+12000;
 while(live && now_ms()<until){
  tick();if(live && active<0){
   if(result_code || http_status!=200){emit("HOST:transport_rejected");finish();break;}
   if(op==1){if(!auth_export_cookies())return 10;strcpy(saved,cookie_output);auth_cookie_clear();
    if(!strcmp(mode,"restore")){finish();if(!clean() || !start() || !configure(argv[2],atoi(argv[3])))return 11;strcpy(input,saved);if(!auth_import_cookies((int)strlen(input)))return 12;restored=1;}
   }
   if(++op==5){finish();emit(restored?"HOST:restore_complete":"HOST:readonly_complete");break;}
   if(op==1)strcpy(input,"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
   if(!auth_begin(op))return 13;
  }
  struct timespec wait={0,1000000};nanosleep(&wait,NULL);
 }
 OPENSSL_cleanse(saved,sizeof(saved));if(live){finish();return 14;}return clean()?0:15;
}
''')
  argv=['clang','-std=c11','-D_DARWIN_C_SOURCE','-D_POSIX_C_SOURCE=200809L','-Wall','-Wextra','-Werror','-Wno-unused-function','-I'+str(ROOT/'platform/wasm-network/src'),'-I'+str(ROOT/'.local/host-network/prefix/include'),'-I'+str(prefix/'include'),str(source),str(ROOT/'.local/host-network/prefix/lib/libcurl.a'),'-L'+str(prefix/'lib'),'-lssl','-lcrypto','-lldap','-llber','-framework','SystemConfiguration','-framework','CoreFoundation','-o',str(cls.exe)]
  p=subprocess.run(argv,capture_output=True)
  if p.returncode:raise RuntimeError(p.stderr.decode())
  cls.context=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);cls.context.load_cert_chain(cls.cert,key)
 @classmethod
 def tearDownClass(cls):cls.tmp.cleanup()
 def run_case(self,mode='good',variant='good'):
  received=[];violations=[]
  class Handler(http.server.BaseHTTPRequestHandler):
   protocol_version='HTTP/1.1'
   def log_message(self,*args):pass
   def do_GET(self):
    path=self.path.split('?')[0];cookie=self.headers.get('Cookie','');host=self.headers.get('Host');received.append(path)
    expected_cookie=path not in ['/x/passport-login/web/qrcode/generate','/x/passport-login/web/qrcode/poll']
    if host not in ['passport.bilibili.com','api.bilibili.com'] or bool(cookie)!=expected_cookie or self.headers.get('Authorization'):violations.append('credential_scope')
    value={'code':0,'data':{}}
    headers=[]
    if path.endswith('/generate'):value['data']={'url':'fixture-not-used-by-native','qrcode_key':'a'*32}
    elif path.endswith('/poll'):
     value['data']={'code':0};domain='.outside.invalid' if variant=='domain' else '.bilibili.com'
     headers=[('Set-Cookie','SESSDATA=synthetic-session; Domain='+domain+'; Path=/; Secure; HttpOnly'),('Set-Cookie','bili_jct='+'0'*32+'; Domain='+domain+'; Path=/; Secure')]
    elif path.endswith('/nav'):value['data']={'isLogin':True,'mid':123456,'uname':'fixture-account'}
    elif path.endswith('/view'):value['data']={'bvid':'BV14GHy6bE9n','aid':117400733288351,'pages':[{'cid':42548528128,'duration':95}]}
    elif path.endswith('/v2'):value['data']={'last_play_time':52000,'last_play_cid':42548528128}
    else:violations.append('unknown_route')
    body=json.dumps(value).encode();body=b'\0'+body if variant=='nul' else body
    try:
     self.send_response(200);self.send_header('Content-Length',str(len(body)));self.send_header('Connection','close')
     for k,v in headers:self.send_header(k,v)
     self.end_headers();self.wfile.write(body)
    except OSError:pass
  class Server(http.server.ThreadingHTTPServer):
   daemon_threads=True
   def handle_error(self,*args):violations.append('server_error')
  server=Server(('127.0.0.1',0),Handler);server.socket=self.context.wrap_socket(server.socket,server_side=True);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
  try:p=subprocess.run([str(self.exe),mode,str(self.cert),str(server.server_port)],capture_output=True,timeout=15)
  finally:server.shutdown();server.server_close();thread.join()
  self.assertEqual(p.returncode,0,p.stderr.decode());out=p.stdout.decode();self.assertNotRegex(out,r'synthetic-session|bili_jct|SESSDATA|123456|127\.0\.0\.1|aaaaaaaaaaaaaaaa')
  self.assertEqual(violations,[]);return out,received
 def test_fixed_five_readonly_routes_cookie_export_and_native_cleanup(self):
  out,paths=self.run_case();self.assertIn('HOST:readonly_complete',out);self.assertEqual(len(paths),5);self.assertIn('AUTH:closed',out)
 def test_private_cookie_export_reimport_new_native_runtime_before_identity_progress_reads(self):
  out,paths=self.run_case('restore');self.assertIn('HOST:restore_complete',out);self.assertEqual(len(paths),5);self.assertEqual(out.count('AUTH:closed'),2)
 def test_outside_cookie_domain_is_rejected_no_later_identity_read(self):
  out,paths=self.run_case(variant='domain');self.assertIn('HOST:transport_rejected',out);self.assertEqual(len(paths),2)
 def test_binary_response_is_rejected(self):
  out,paths=self.run_case(variant='nul');self.assertIn('HOST:transport_rejected',out);self.assertEqual(len(paths),1)
 def test_illegal_private_import_is_rejected_without_network(self):
  out,paths=self.run_case('import-invalid');self.assertIn('AUTH:closed',out);self.assertEqual(paths,[])
 def test_cancel_before_multi_perform_closes_without_http(self):
  out,paths=self.run_case('cancel');self.assertIn('AUTH:closed',out);self.assertEqual(paths,[])
 def test_deadline_closes_without_http(self):
  out,paths=self.run_case('deadline');self.assertIn('AUTH:deadline',out);self.assertEqual(paths,[])
 def test_header_body_bounds_before_any_request(self):
  out,paths=self.run_case('bounds');self.assertIn('AUTH:closed',out);self.assertEqual(paths,[])
if __name__=='__main__':unittest.main()
