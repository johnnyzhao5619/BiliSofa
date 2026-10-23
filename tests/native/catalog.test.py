"""HOST production catalog against local TLS; remapping exists only in test code."""
from pathlib import Path
import http.server,ssl,threading,tempfile,subprocess,json,unittest
ROOT=Path(__file__).resolve().parents[2]
class CatalogTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory();folder=Path(cls.tmp.name);host=json.loads((ROOT/'.local/host-network/manifest.json').read_text());prefix=Path(host['opensslPrefix']);cls.cert=folder/'ca.pem';key=folder/'key.pem';cls.exe=folder/'catalog';cls.wrong=folder/'wrong.pem'
  for cert,subject in [(cls.cert,'api.bilibili.com'),(cls.wrong,'outside.invalid')]:
   r=subprocess.run([str(prefix/'bin/openssl'),'req','-x509','-newkey','ec','-pkeyopt','ec_paramgen_curve:P-256','-noenc','-keyout',str(key),'-out',str(cert),'-days','1','-subj','/CN='+subject,'-addext','subjectAltName=DNS:'+subject],capture_output=True)
   if r.returncode:raise RuntimeError('Fixture certificate generation failed')
   key.chmod(0o600)
   if cert==cls.cert:cls.goodkey=key.read_bytes()
  source=folder/'main.c';source.write_text(r'''
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <curl/curl.h>
static const char *test_ca;static int test_port,performed;
static CURLcode mapped_perform(CURL *easy){
 char route[128];snprintf(route,sizeof(route),"api.bilibili.com:443:127.0.0.1:%d",test_port);
 struct curl_slist *map=curl_slist_append(NULL,route);if(!map)return CURLE_OUT_OF_MEMORY;
 curl_easy_setopt(easy,CURLOPT_CONNECT_TO,map);curl_easy_setopt(easy,CURLOPT_CAINFO,test_ca);
 performed++;CURLcode rc=curl_easy_perform(easy);curl_slist_free_all(map);return rc;
}
#define curl_easy_perform mapped_perform
#define main catalog_main
#include "catalog.c"
#undef main
#undef curl_easy_perform
int main(int argc,char **argv){
 if(argc!=4)return 1;test_ca=argv[2];test_port=atoi(argv[3]);
 if(!strcmp(argv[1],"invalid")){char *bad[]={"catalog","https://outside.invalid/",NULL};if(catalog_main(2,bad)!=1 || performed || guest_size || guest_status)return 2;return 0;}
 if(!strcmp(argv[1],"bounds")){
  guest_reset();guest_limit=BILISOFA_GUEST_MAX;guest_size=guest_limit-1;
  if(guest_body("x",1,1,NULL)!=1 || guest_body("x",1,1,NULL) || guest_rejection!=1)return 3;
  guest_reset();if(guest_body("x",SIZE_MAX,2,NULL) || guest_rejection!=1)return 4;
  guest_reset();guest_header_size=16384;if(guest_header("x",1,1,NULL) || guest_rejection!=2)return 5;
  guest_reset();return performed?6:0;
 }
 if(!strcmp(argv[1],"category")){char *good[]={"catalog","category-ranking","1005",NULL};if(catalog_main(3,good))return 13;}
 else if(!strcmp(argv[1],"category_invalid")){
  const char *ids[]={"0","1","1005&type=all","01005","1005.0","","9999"};
  for(size_t i=0;i<sizeof(ids)/sizeof(ids[0]);i++){char *bad[]={"catalog","category-ranking",(char*)ids[i],NULL};if(catalog_main(3,bad)!=1 || performed)return 14;}
  return 0;
 }
 else catalog_ranking();
 if(performed!=1)return 7;
 if(!strcmp(argv[1],"tls"))return guest_transport!=0 && !guest_status && !guest_size?0:8;
 if(!strcmp(argv[1],"body"))return guest_transport!=0 && guest_rejection==1 && guest_size<=524288?0:9;
 if(!strcmp(argv[1],"header"))return guest_transport!=0 && guest_rejection==2?0:10;
 if(!strcmp(argv[1],"redirect"))return guest_status==302 && !guest_transport?0:11;
 return guest_status==200 && !guest_transport && guest_size>0?0:12;
}
''')
  args=['clang','-std=c11','-D_DARWIN_C_SOURCE','-D_POSIX_C_SOURCE=200809L','-Wall','-Wextra','-Werror','-Wno-deprecated-declarations','-I'+str(ROOT/'platform/wasm-network/src'),'-I'+str(ROOT/'.local/host-network/prefix/include'),'-I'+str(prefix/'include'),str(source),str(ROOT/'.local/host-network/prefix/lib/libcurl.a'),'-L'+str(prefix/'lib'),'-lssl','-lcrypto','-lldap','-llber','-framework','SystemConfiguration','-framework','CoreFoundation','-o',str(cls.exe)]
  r=subprocess.run(args,capture_output=True)
  if r.returncode:raise RuntimeError('HOST catalog compilation failed: '+r.stderr.decode())
  goodkey=folder/'goodkey.pem';goodkey.write_bytes(cls.goodkey);goodkey.chmod(0o600)
  cls.context=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);cls.context.load_cert_chain(cls.cert,goodkey)
 @classmethod
 def tearDownClass(cls):cls.tmp.cleanup()
 def run_case(self,mode):
  received=[];violations=[]
  class Handler(http.server.BaseHTTPRequestHandler):
   protocol_version='HTTP/1.1'
   def log_message(self,*args):pass
   def do_GET(self):
    received.append(self.path)
    if self.path!=('/x/web-interface/ranking/v2?rid=1005&type=all' if mode=='category' else '/x/web-interface/ranking/v2?rid=0&type=all') or self.headers.get('Host')!='api.bilibili.com' or self.headers.get('Cookie') or self.headers.get('Authorization') or self.headers.get('Range'):violations.append('scope')
    body=b'{"code":0,"data":{"list":[]}}' if mode!='body' else b'x'*524289
    try:
     self.send_response(302 if mode=='redirect' else 200)
     if mode=='redirect':self.send_header('Location','https://outside.invalid/')
     if mode=='header':
      for i in range(10):self.send_header('X-Fixture-'+str(i),'x'*2000)
     self.send_header('Content-Length',str(len(body)));self.send_header('Connection','close');self.end_headers();self.wfile.write(body)
    except OSError:pass
  class Server(http.server.ThreadingHTTPServer):
   daemon_threads=True
   def handle_error(self,*args):pass
  server=Server(('127.0.0.1',0),Handler);server.socket=self.context.wrap_socket(server.socket,server_side=True);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
  try:r=subprocess.run([str(self.exe),mode,str(self.wrong if mode=='tls' else self.cert),str(server.server_port)],capture_output=True,timeout=12)
  finally:server.shutdown();server.server_close();thread.join()
  self.assertEqual(r.returncode,0);self.assertEqual(violations,[]);self.assertEqual(r.stdout,b'' if mode=='bounds' else b'GUEST:closed\n'*(7 if mode=='category_invalid' else 1));self.assertEqual(len(received),0 if mode in ['invalid','bounds','tls','category_invalid'] else 1)
 def test_category_fixed_get_without_credentials(self):self.run_case('category')
 def test_category_invalid_ids_never_enter_curl(self):self.run_case('category_invalid')
 def test_fixed_get_without_credentials(self):self.run_case('good')
 def test_no_redirect_follow(self):self.run_case('redirect')
 def test_ca_verification_rejects_untrusted_tls_before_http(self):self.run_case('tls')
 def test_body_cap(self):self.run_case('body')
 def test_header_cap(self):self.run_case('header')
 def test_invalid_argument_never_enters_curl(self):self.run_case('invalid')
 def test_native_exact_body_header_and_overflow_bounds(self):self.run_case('bounds')
if __name__=='__main__':unittest.main()
