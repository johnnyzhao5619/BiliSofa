"""HOST production search against local TLS; remapping exists only in test code."""
from pathlib import Path
import http.server,ssl,threading,tempfile,subprocess,json,unittest,urllib.parse,hashlib,time
ROOT=Path(__file__).resolve().parents[2]
class SearchTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory();folder=Path(cls.tmp.name);host=json.loads((ROOT/'.local/host-network/manifest.json').read_text());prefix=Path(host['opensslPrefix']);cls.cert=folder/'ca.pem';key=folder/'key.pem';cls.exe=folder/'search';cls.wrong=folder/'wrong.pem'
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
#define main search_main
#include "search.c"
#undef main
#undef curl_easy_perform
int main(int argc,char **argv){
 if(argc!=4)return 1;test_ca=argv[2];test_port=atoi(argv[3]);
 const char *img="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",*sub="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";char epoch[16];snprintf(epoch,sizeof(epoch),"%lld",(long long)time(NULL));
 if(!strcmp(argv[1],"invalid")){char *bad[]={"search","https://outside.invalid/",NULL};if(search_main(2,bad)!=1 || performed || guest_size || guest_status)return 2;return 0;}
 if(!strcmp(argv[1],"keyword")){
  const char *bad[]={""," x","x ","\x01","\xc0\xaf","\xed\xa0\x80","\xf4\x90\x80\x80","abcdefghijklmnopqrstuvwxyz0123456"};
  for(size_t i=0;i<sizeof(bad)/sizeof(bad[0]);i++){if(search_keyword_valid(bad[i]))return 20;search_video(bad[i],"1",img,sub,epoch);if(performed)return 21;}
  if(!search_keyword_valid("你好&x=1") || search_page_valid("01") || search_page_valid("11") || search_page_valid("1&x"))return 22;
  char edge[133];for(int i=0;i<32;i++)memcpy(edge+4*i,"\xf0\x9f\x98\x80",4);edge[128]=0;
  if(!search_keyword_valid(edge))return 23;memcpy(edge+128,"\xf0\x9f\x98\x80",4);edge[132]=0;if(search_keyword_valid(edge))return 24;
  return 0;
 }
 if(!strcmp(argv[1],"wbi")){
  search_video("x","1","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",sub,epoch);
  search_video("x","1",img,"short",epoch);
  search_video("x","1",img,sub,"1700000000");
  search_video("!'()*","1",img,sub,epoch);
  search_video("x","01",img,sub,epoch);
  return performed?25:0;
 }
 if(!strncmp(argv[1],"nav",3)){
  search_public_nav();if(performed!=1)return 26;
  if(!strcmp(argv[1],"navbody"))return guest_transport!=0&&guest_rejection==1&&guest_size<=16384?0:27;
  return guest_transport==0&&guest_status==200?0:28;
 }
 if(!strcmp(argv[1],"bounds")){
  guest_reset();guest_limit=BILISOFA_GUEST_MAX;guest_size=guest_limit-1;
  if(guest_body("x",1,1,NULL)!=1 || guest_body("x",1,1,NULL) || guest_rejection!=1)return 3;
  guest_reset();if(guest_body("x",SIZE_MAX,2,NULL) || guest_rejection!=1)return 4;
  guest_reset();guest_header_size=16384;if(guest_header("x",1,1,NULL) || guest_rejection!=2)return 5;
  guest_reset();return performed?6:0;
 }
 if(!strcmp(argv[1],"live"))search_live("你好&x=1!()'*","2",img,sub,epoch);
 else if(!strcmp(argv[1],"pgc"))search_pgc("你好&x=1!()'*","2",img,sub,epoch);
 else if(!strcmp(argv[1],"users"))search_users("你好&x=1!()'*","2",img,sub,epoch);
 else search_video("你好&x=1!()'*","2",img,sub,epoch);
 if(performed!=1)return 7;
 if(!strcmp(argv[1],"tls"))return guest_transport==CURLE_PEER_FAILED_VERIFICATION && !guest_status && !guest_size?0:8;
 if(!strcmp(argv[1],"body"))return guest_transport!=0 && guest_rejection==1 && guest_size<=524288?0:9;
 if(!strcmp(argv[1],"header"))return guest_transport!=0 && guest_rejection==2?0:10;
 if(!strcmp(argv[1],"redirect"))return guest_status==302 && !guest_transport?0:11;
 return guest_status==200 && !guest_transport && guest_size>0?0:12;
}
''')
  args=['clang','-std=c11','-D_DARWIN_C_SOURCE','-D_POSIX_C_SOURCE=200809L','-Wall','-Wextra','-Werror','-Wno-deprecated-declarations','-I'+str(ROOT/'platform/wasm-network/src'),'-I'+str(ROOT/'.local/host-network/prefix/include'),'-I'+str(prefix/'include'),str(source),str(ROOT/'.local/host-network/prefix/lib/libcurl.a'),'-L'+str(prefix/'lib'),'-lssl','-lcrypto','-lldap','-llber','-framework','SystemConfiguration','-framework','CoreFoundation','-o',str(cls.exe)]
  r=subprocess.run(args,capture_output=True)
  if r.returncode:raise RuntimeError('HOST search compilation failed: '+r.stderr.decode())
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
    if self.headers.get('Host')!='api.bilibili.com' or self.headers.get('Cookie') or self.headers.get('Authorization') or self.headers.get('Range') or self.headers.get('Referer')!='https://search.bilibili.com/':violations.append('scope')
    if mode.startswith('nav'):
     if self.path!='/x/web-interface/nav':violations.append('nav')
    else:
     route=urllib.parse.urlsplit(self.path);params=urllib.parse.parse_qs(route.query)
     if route.path!='/x/web-interface/wbi/search/type' or set(params)!={'keyword','page','page_size','search_type','wts','w_rid'} or any(len(v)!=1 for v in params.values()):violations.append('route')
     else:
      query='keyword=%E4%BD%A0%E5%A5%BD%26x%3D1&page=2&page_size=4&search_type='+('live_room' if mode=='live' else 'media_bangumi' if mode=='pgc' else 'bili_user' if mode=='users' else 'video')+'&wts='+params['wts'][0]
      joined='a'*32+'b'*32;indices=[46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13];mix=''.join(joined[i] for i in indices)
      expected=hashlib.md5((query+mix).encode()).hexdigest()
      if route.query!=query+'&w_rid='+expected or abs(int(params['wts'][0])-int(time.time()))>30:violations.append('signature')
    body=b'x'*16385 if mode=='navbody' else b'{"code":0,"data":{"list":[]}}' if mode!='body' else b'x'*524289
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
  self.assertEqual(r.returncode,0);self.assertEqual(violations,[]);self.assertEqual(r.stdout,b'' if mode=='bounds' else b'GUEST:closed\n'*8 if mode=='keyword' else b'GUEST:closed\n'*5 if mode=='wbi' else b'GUEST:closed\n');self.assertEqual(len(received),0 if mode in ['invalid','bounds','keyword','tls','wbi'] else 1)
 def test_keyword_utf8_length_and_native_pagination_rejected_before_network(self):self.run_case('keyword')
 def test_live_search_fixed_type_signature_and_no_credentials(self):self.run_case('live')
 def test_pgc_search_fixed_type_signature_and_no_credentials(self):self.run_case('pgc')
 def test_user_search_fixed_type_signature_and_no_credentials(self):self.run_case('users')
 def test_public_nav_fixed_get_without_credentials(self):self.run_case('nav')
 def test_public_nav_has_16k_body_budget(self):self.run_case('navbody')
 def test_wbi_key_epoch_and_filtered_empty_reject_before_network(self):self.run_case('wbi')
 def test_fixed_get_without_credentials(self):self.run_case('good')
 def test_no_redirect_follow(self):self.run_case('redirect')
 def test_ca_verification_rejects_untrusted_tls_before_http(self):self.run_case('tls')
 def test_body_cap(self):self.run_case('body')
 def test_header_cap(self):self.run_case('header')
 def test_invalid_argument_never_enters_curl(self):self.run_case('invalid')
 def test_native_exact_body_header_and_overflow_bounds(self):self.run_case('bounds')
if __name__=='__main__':unittest.main()
