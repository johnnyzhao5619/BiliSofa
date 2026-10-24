"""HOST production catalog against local TLS; remapping exists only in test code."""
from pathlib import Path
import http.server,ssl,threading,tempfile,subprocess,json,unittest
ROOT=Path(__file__).resolve().parents[2]
class CatalogTest(unittest.TestCase):
 entry='catalog.c'
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
#include "__ENTRY__"
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
 else if(!strcmp(argv[1],"pgc")){char *good[]={"catalog","pgc-ranking",NULL};if(catalog_main(2,good))return 15;}
 else if(!strcmp(argv[1],"pgc_guoman")){char *good[]={"catalog","pgc-ranking","4","7",NULL};if(catalog_main(4,good))return 17;}
 else if(!strcmp(argv[1],"pgc_index")){char *good[]={"catalog","pgc-index","4","2",NULL};if(catalog_main(4,good))return 18;}
 else if(!strcmp(argv[1],"pgc_invalid")){
  const char *bad[][3]={{"pgc-ranking","2","3"},{"pgc-ranking","1","30"},{"pgc-ranking","1","1"},{"pgc-ranking","01","3"},{"pgc-index","4","6"},{"pgc-index","4","0"},{"pgc-index","4","12"},{"pgc-index","1&x","1"}};
  for(size_t i=0;i<sizeof(bad)/sizeof(bad[0]);i++){char *args[]={"catalog",(char*)bad[i][0],(char*)bad[i][1],(char*)bad[i][2],NULL};if(catalog_main(4,args)!=1 || performed)return 19;}
  return 0;
 }
 else if(!strcmp(argv[1],"ua")){char *good[]={"catalog","--ua=Mozilla/5.0 (SMART-TV; LINUX; Tizen 8.0) AppleWebKit/537.36 (KHTML, like Gecko) Version/8.0 TV Safari/537.36","category-ranking","1005",NULL};if(catalog_main(4,good))return 22;}
 else if(!strcmp(argv[1],"ua_invalid")){
  const char *bad[]={"--ua=","--ua=short","--ua=Mozilla/5.0\r\nCookie: x=1","--ua=Mozilla/5.0 \x01 control"};
  for(size_t i=0;i<sizeof(bad)/sizeof(bad[0]);i++){char *args[]={"catalog",(char*)bad[i],"category-ranking","1005",NULL};if(catalog_main(4,args)!=1 || performed)return 23;}
  return 0;
 }
 else if(!strcmp(argv[1],"visitor")){char *good[]={"catalog","--visitor=AB12CD34-EF56-7890-ABCD-EF1234567890infoc|0F1E2D3C-4B5A-6978-8796-A5B4C3D2E1F012345-102300000-abc%3D%3D|1761200000","--ua=Mozilla/5.0 (SMART-TV; LINUX; Tizen 8.0) AppleWebKit/537.36 (KHTML, like Gecko) Version/8.0 TV Safari/537.36","category-ranking","1005",NULL};if(catalog_main(5,good))return 24;}
 else if(!strcmp(argv[1],"visitor_id")){char *good[]={"catalog","--ua=Mozilla/5.0 (SMART-TV; LINUX; Tizen 8.0) AppleWebKit/537.36 (KHTML, like Gecko) Version/8.0 TV Safari/537.36","visitor-id",NULL};if(catalog_main(3,good))return 25;}
 else if(!strcmp(argv[1],"visitor_invalid")){
  const char *bad[][3]={{"--visitor=","category-ranking","1005"},{"--visitor=short|0F1E2D3C-4B5A-6978-8796|1761200000","category-ranking","1005"},{"--visitor=AB12CD34-EF56-7890-ABCD|0F1E2D3C-4B5A-6978-8796|176120000","category-ranking","1005"},{"--visitor=AB12CD34-EF56-7890-ABCD;x=1|0F1E2D3C-4B5A-6978-8796|1761200000","category-ranking","1005"},{"--visitor=AB12CD34-EF56-7890-ABCD|0F1E2D3C 4B5A-6978-8796|1761200000","category-ranking","1005"},{"--visitor=AB12CD34-EF56-7890-ABCD|0F1E2D3C-4B5A-6978-8796|1761200000|x","category-ranking","1005"},{"--visitor=AB12CD34-EF56-7890-ABCD|0F1E2D3C-4B5A-6978-8796\r\nX: 1|1761200000","category-ranking","1005"},{"--visitor=AB12CD34-EF56-7890-ABCD|0F1E2D3C-4B5A-6978-8796|1761200000","visitor-id",NULL}};
  for(size_t i=0;i<sizeof(bad)/sizeof(bad[0]);i++){char *args[]={"catalog",(char*)bad[i][0],(char*)bad[i][1],(char*)bad[i][2],NULL};if(catalog_main(bad[i][2]?4:3,args)!=1 || performed)return 26;}
  return 0;
 }
 else if(!strcmp(argv[1],"up")){char *good[]={"catalog","up-archives","12345","2",NULL};if(catalog_main(4,good))return 20;}
 else if(!strcmp(argv[1],"up_invalid")){
  const char *bad[][2]={{"0","1"},{"012","1"},{"12345678901234567","1"},{"9007199254740992","1"},{"12&x=1","1"},{"123","0"},{"123","51"},{"123","01"},{"123","2&ps=100"}};
  for(size_t i=0;i<sizeof(bad)/sizeof(bad[0]);i++){char *args[]={"catalog","up-archives",(char*)bad[i][0],(char*)bad[i][1],NULL};if(catalog_main(4,args)!=1 || performed)return 21;}
  return 0;
 }
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
'''.replace('__ENTRY__',cls.entry))
  args=['clang','-std=c11','-D_DARWIN_C_SOURCE','-D_POSIX_C_SOURCE=200809L','-Wall','-Wextra','-Werror','-Wno-deprecated-declarations','-I'+str(ROOT/'platform/wasm-network/src'),'-I'+str(ROOT/'.local/host-network/prefix/include'),'-I'+str(prefix/'include'),str(source),str(ROOT/'.local/host-network/prefix/lib/libcurl.a'),'-L'+str(prefix/'lib'),'-lssl','-lcrypto','-lldap','-llber','-framework','SystemConfiguration','-framework','CoreFoundation','-o',str(cls.exe)]
  r=subprocess.run(args,capture_output=True)
  if r.returncode:raise RuntimeError('HOST catalog compilation failed: '+r.stderr.decode())
  goodkey=folder/'goodkey.pem';goodkey.write_bytes(cls.goodkey);goodkey.chmod(0o600)
  cls.context=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);cls.context.load_cert_chain(cls.cert,goodkey)
 @classmethod
 def tearDownClass(cls):cls.tmp.cleanup()
 def run_case(self,mode):
  received=[];violations=[];agents=[];cookies=[]
  class Handler(http.server.BaseHTTPRequestHandler):
   protocol_version='HTTP/1.1'
   def log_message(self,*args):pass
   def do_GET(self):
    received.append(self.path);agents.append(self.headers.get('User-Agent'));cookies.append(self.headers.get('Cookie'))
    if self.path!=('/x/frontend/finger/spi' if mode=='visitor_id' else '/x/series/recArchivesByKeywords?mid=12345&keywords=&ps=30&pn=2' if mode=='up' else '/x/web-interface/ranking/v2?rid=1005&type=all' if mode in ('category','ua','visitor') else '/pgc/web/rank/list?day=3&season_type=1' if mode=='pgc' else '/pgc/web/rank/list?day=7&season_type=4' if mode=='pgc_guoman' else '/pgc/season/index/result?season_type=4&type=1&order=3&sort=0&page=2&pagesize=20' if mode=='pgc_index' else '/x/web-interface/ranking/v2?rid=0&type=all') or self.headers.get('Host')!='api.bilibili.com' or (mode!='visitor' and self.headers.get('Cookie')) or self.headers.get('Authorization') or self.headers.get('Range'):violations.append('scope')
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
  self.assertEqual(r.returncode,0);self.assertEqual(violations,[]);self.assertEqual(r.stdout,b'' if mode=='bounds' else b'GUEST:closed\n'*(7 if mode=='category_invalid' else 8 if mode=='pgc_invalid' else 9 if mode=='up_invalid' else 4 if mode=='ua_invalid' else 8 if mode=='visitor_invalid' else 1));self.assertEqual(len(received),0 if mode in ['invalid','bounds','tls','category_invalid','pgc_invalid','up_invalid','ua_invalid','visitor_invalid'] else 1)
  # ADR-104: the TV runtime string replaces the probe identifier only when passed; otherwise it is unchanged.
  self.assertEqual(agents,['Mozilla/5.0 (SMART-TV; LINUX; Tizen 8.0) AppleWebKit/537.36 (KHTML, like Gecko) Version/8.0 TV Safari/537.36'] if mode in ('ua','visitor','visitor_id') else ['BiliSofa-W01-Probe/0.0.15']*len(agents))
  # ADR-106: the B站 visitor identity is the only Cookie, and only when passed; visitor-id itself carries none.
  self.assertEqual(cookies,['buvid3=AB12CD34-EF56-7890-ABCD-EF1234567890infoc; buvid4=0F1E2D3C-4B5A-6978-8796-A5B4C3D2E1F012345-102300000-abc%3D%3D; b_nut=1761200000'] if mode=='visitor' else [None]*len(cookies))
 def test_category_fixed_get_without_credentials(self):self.run_case('category')
 def test_pgc_ranking_fixed_get_without_credentials(self):self.run_case('pgc')
 def test_pgc_guoman_week_ranking_route(self):self.run_case('pgc_guoman')
 def test_pgc_index_route_and_page(self):self.run_case('pgc_index')
 def test_pgc_invalid_type_window_or_page_never_enters_curl(self):self.run_case('pgc_invalid')
 def test_category_invalid_ids_never_enter_curl(self):self.run_case('category_invalid')
 def test_fixed_get_without_credentials(self):self.run_case('good')
 def test_no_redirect_follow(self):self.run_case('redirect')
 def test_ca_verification_rejects_untrusted_tls_before_http(self):self.run_case('tls')
 def test_body_cap(self):self.run_case('body')
 def test_header_cap(self):self.run_case('header')
 def test_invalid_argument_never_enters_curl(self):self.run_case('invalid')
 def test_native_exact_body_header_and_overflow_bounds(self):self.run_case('bounds')
if __name__=='__main__':unittest.main()
