"""Real HOST HTTPS/socket/curl; synthetic-only fixed routes. Not retail-TV evidence."""
from pathlib import Path
import hashlib,json,socket,subprocess,tempfile,unittest
ROOT=Path(__file__).resolve().parents[2]
class HttpsSessionTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory();folder=Path(cls.tmp.name);cls.exe=folder/'https'
  host=ROOT/'.local/host-network';m=json.loads((host/'manifest.json').read_text());lib=host/'prefix/lib/libcurl.a'
  if m['curlArchiveSha256']!=hashlib.sha256(lib.read_bytes()).hexdigest():raise RuntimeError('Run tools/build-host-network-fixture.py')
  ports=[]
  for _ in range(2):
   with socket.socket() as s:s.bind(('127.0.0.1',0));ports.append(s.getsockname()[1])
  source=folder/'fixture.c';source.write_text(r'''
#define HTTPS_SESSION_NO_MAIN
#define HTTPS_SESSION_HOST_TEST
#include "session-https.c"
static int clean(void){
 if(live || multi || current || jars[0] || jars[1] || tls || peer || resolve_hosts || server>=0 || plain>=0 || client>=0 || initialized || added)return 0;
 unsigned char zero[sizeof(secrets)]={0};return !memcmp(secrets,zero,sizeof(secrets)) && !*token && !*url && !*request && !*response;
}
int main(int argc,char **argv){
 if(argc!=2)return 1;const char *mode=argv[1];
 if(!strcmp(mode,"bounds")){char bytes[8193]={0};if(body_cb(bytes,1,3,NULL) || header_cb(bytes,1,8193,NULL))return 2;if(header_cb(bytes,1,8192,NULL)!=8192 || header_cb(bytes,1,1,NULL))return 3;puts("BOUNDS:pass");return 0;}
 if(start())return 4;
 if(!strcmp(mode,"busy")){if(start()!=17)return 5;https_session_stop();return clean()?0:6;}
 if(!strcmp(mode,"cancel")){https_session_stop();return clean()?0:7;}
 if(!strcmp(mode,"close-error")){close(server);https_session_stop();return clean() && bad_close?0:8;}
 if(!strcmp(mode,"timeout"))deadline=now_ms()-1;
 if(!strcmp(mode,"follow"))curl_easy_setopt(jars[0],CURLOPT_FOLLOWLOCATION,1L);
 if(!strcmp(mode,"foreign-cookie")){char c[256];snprintf(c,sizeof(c),"Set-Cookie: bilisofa_probe=WRONG; Domain=account.bilisofa.invalid; Path=/%s/auth; Secure",token);curl_easy_setopt(jars[1],CURLOPT_COOKIELIST,c);}
 if(!strcmp(mode,"untrusted")){curl_easy_setopt(jars[0],CURLOPT_CAINFO_BLOB,NULL);curl_easy_setopt(jars[0],CURLOPT_CAINFO,"/does-not-exist-bilisofa-ca.pem");}
 if(!strcmp(mode,"hostname")){
  char mapping[128];snprintf(mapping,sizeof(mapping),"wrong.bilisofa.invalid:%d:127.0.0.1",HTTPS_SESSION_PORT);resolve_hosts=curl_slist_append(resolve_hosts,mapping);curl_easy_setopt(jars[0],CURLOPT_RESOLVE,resolve_hosts);
  snprintf(url,sizeof(url),"https://wrong.bilisofa.invalid:%d/%s/auth/set-a",HTTPS_SESSION_PORT,token);curl_easy_setopt(jars[0],CURLOPT_URL,url);
 }
 int changed=0;double until=now_ms()+12000;
 while(live && now_ms()<until){
  if(!strcmp(mode,"http-leak") && phase==7 && !changed){char c[256];snprintf(c,sizeof(c),"Set-Cookie: bilisofa_probe=%s; Domain=account.bilisofa.invalid; Path=/%s/auth",secrets[0],token);curl_easy_setopt(jars[0],CURLOPT_COOKIELIST,c);changed=1;}
  tick();
  if(!strcmp(mode,"cancel-active") && peer && handshake && live){https_session_stop();break;}
  struct timespec wait={0,1000000};nanosleep(&wait,NULL);
 }
 if(live){https_session_stop();return 9;}if(!clean())return 10;
 if(!strcmp(mode,"cancel-active") && !handshake)return 0;
 return 0;
}
''')
  openssl=Path(m['opensslPrefix']);argv=['clang','-std=c11','-D_DARWIN_C_SOURCE','-Wall','-Wextra','-Werror',f'-DHTTPS_SESSION_PORT={ports[0]}',f'-DHTTPS_PLAIN_PORT={ports[1]}','-I'+str(ROOT/'platform/wasm-network/src'),'-I'+str(host/'prefix/include'),'-I'+str(openssl/'include'),str(source),str(lib),'-L'+str(openssl/'lib'),'-lssl','-lcrypto','-lldap','-llber','-framework','SystemConfiguration','-framework','CoreFoundation','-o',str(cls.exe)]
  p=subprocess.run(argv,capture_output=True)
  if p.returncode:raise RuntimeError(p.stderr.decode())
 @classmethod
 def tearDownClass(cls):cls.tmp.cleanup()
 def run_mode(self,mode,expected):
  p=subprocess.run([str(self.exe),mode],capture_output=True,timeout=15)
  self.assertEqual(p.returncode,0,p.stderr.decode());out=p.stdout.decode();self.assertIn(expected,out)
  self.assertNotRegex(out,r'Cookie:|127\.0\.0\.1|bilisofa\.invalid|[0-9a-f]{32}|BEGIN CERTIFICATE')
  if mode!='good':self.assertNotIn('HSESSION:pass',out)
  return out
 def test_twelve_real_wire_exchanges_secure_cookie_tls_isolation_scope_redirect_clear(self):
  self.assertEqual(self.run_mode('good','HSESSION:pass').splitlines(),['HSESSION:ready','HSESSION:tls','HSESSION:cookie','HSESSION:isolation','HSESSION:redirect','HSESSION:scope','HSESSION:clear','HSESSION:pass'])
 def test_cookie_jar_leak_is_rejected_by_server(self):self.run_mode('foreign-cookie','HSESSION:failed:18')
 def test_redirect_follow_attempt_never_passes(self):self.run_mode('follow','HSESSION:failed:18')
 def test_ephemeral_certificate_requires_explicit_trust(self):self.run_mode('untrusted','HSESSION:failed:')
 def test_ephemeral_certificate_still_validates_host(self):self.run_mode('hostname','HSESSION:failed:')
 def test_secure_cookie_leak_to_plaintext_fails_wire(self):self.run_mode('http-leak','HSESSION:failed:18')
 def test_body_header_limits_before_any_success(self):self.run_mode('bounds','BOUNDS:pass')
 def test_cancel_closes_listeners_handles_and_wipes_values(self):self.run_mode('cancel','HSESSION:cancelled')
 def test_cancel_with_active_tls_handshake(self):self.run_mode('cancel-active','HSESSION:cancelled')
 def test_owned_session_cannot_overlap(self):self.run_mode('busy','HSESSION:cancelled')
 def test_deadline_is_fatal(self):self.run_mode('timeout','HSESSION:failed:20')
 def test_uncertain_close_never_acknowledges_success_or_cancellation(self):
  out=self.run_mode('close-error','HSESSION:unclosed');self.assertNotIn('HSESSION:cancelled',out)
if __name__=='__main__':unittest.main()
