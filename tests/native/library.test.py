"""Private production C via local TLS, synthetic cookies only; no external requests."""
from pathlib import Path
import http.server,ssl,threading,tempfile,subprocess,json,unittest
ROOT=Path(__file__).resolve().parents[2]
class LibraryNative(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory();folder=Path(cls.tmp.name);m=json.loads((ROOT/'.local/host-network/manifest.json').read_text());prefix=Path(m['opensslPrefix']);cls.cert=folder/'ca.pem';key=folder/'fixture.key';cls.exe=folder/'library';cls.wrong=folder/'wrong.pem'
  for cert,host in [(cls.cert,'api.bilibili.com'),(cls.wrong,'outside.invalid')]:
   r=subprocess.run([str(prefix/'bin/openssl'),'req','-x509','-newkey','ec','-pkeyopt','ec_paramgen_curve:P-256','-noenc','-keyout',str(key),'-out',str(cert),'-days','1','-subj','/CN='+host,'-addext','subjectAltName=DNS:'+host],capture_output=True)
   if r.returncode:raise RuntimeError('Fixture TLS generation failed')
   key.chmod(0o600)
   if cert==cls.cert:goodkey=key.read_bytes()
  key.write_bytes(goodkey)
  source=folder/'main.c';source.write_text(r'''
#define AUTH_NO_MAIN
#include "library.c"
static int clean(void){return !live&&!easy&&!multi&&!initialized&&!added&&active<0&&!body_size&&!*body&&!*input&&!*request_url;}
int main(int argc,char **argv){
 if(argc!=4||!start())return 1;const char *mode=argv[1];char map[128];snprintf(map,sizeof(map),"api.bilibili.com:443:127.0.0.1:%d",atoi(argv[3]));struct curl_slist *list=curl_slist_append(NULL,map);
 curl_easy_setopt(easy,CURLOPT_CONNECT_TO,list);curl_easy_setopt(easy,CURLOPT_CAINFO,argv[2]);
 if(!strcmp(mode,"bounds")){char bytes[8193]={0};if(header_cb(bytes,1,8193,NULL)||body_cb(bytes,1,AUTH_CAP+1,NULL))return 2;finish();curl_slist_free_all(list);return clean()?0:3;}
 if(!strcmp(mode,"invalid")){const char *values[]={"0","26","01","1005&type=all","-1",""};for(size_t i=0;i<sizeof(values)/sizeof(values[0]);i++){strcpy(input,values[i]);if(auth_begin(1)||active>=0)return 4;}if(auth_begin(6)||auth_begin(-1))return 5;finish();curl_slist_free_all(list);return clean()?0:6;}
 if(!strcmp(mode,"badcursor")){const char *values[]={"", "01|0|archive", "0|1|", "1|2|outside", "1|2|archive&url=x", "18446744073709551616|0|archive", "1|4294967296|archive", "1|1|archive|x"};for(size_t i=0;i<sizeof(values)/sizeof(values[0]);i++){strcpy(input,values[i]);if(auth_begin(2)||active>=0)return 14;}finish();curl_slist_free_all(list);return clean()?0:15;}
 if(!strcmp(mode,"badfavorite")){const char *values[]={"", "1", "01|1", "0|1", "1|0", "1|26", "1|01", "1&url=x|1", "12345678901234567|1", "1|1|2"};for(size_t i=0;i<sizeof(values)/sizeof(values[0]);i++){strcpy(input,values[i]);if(auth_begin(4)||active>=0)return 16;}strcpy(input,"unexpected");if(auth_begin(3))return 17;finish();curl_slist_free_all(list);return clean()?0:18;}
 if(!strcmp(mode,"badoffset")){const char *values[]={"x y", "x\ny", "x\ry", "x\ty"};for(size_t i=0;i<sizeof(values)/sizeof(values[0]);i++){strcpy(input,values[i]);if(auth_begin(5)||active>=0)return 19;}memset(input,'a',1025);input[1025]=0;if(auth_begin(5))return 20;finish();curl_slist_free_all(list);return clean()?0:21;}
 const char *cookies=!strcmp(mode,"badcookie")?".outside.invalid\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic\n":".bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic-session\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\tsynthetic-csrf\n";strcpy(input,cookies);int imported=auth_import_cookies((int)strlen(input));
 if(!strcmp(mode,"badcookie")){finish();curl_slist_free_all(list);return !imported&&clean()?0:7;}if(!imported||*input||!auth_begin(0)||auth_begin(1))return 8;
 if(!strcmp(mode,"cancel")){auth_stop();curl_slist_free_all(list);return clean()?0:9;}
 if(!strcmp(mode,"deadline")){request_until=now_ms()-1;tick();curl_slist_free_all(list);return clean()?0:10;}
 int op=0;double until=now_ms()+12000;
 while(live&&now_ms()<until){tick();if(live&&active<0){
  if(result_code||http_status!=200){finish();break;}
  if(op==1){finish();break;}auth_response_clear();int nextop=1;if(!strcmp(mode,"updates")){input[0]=0;nextop=5;}else if(!strcmp(mode,"updates-next")){strcpy(input,"a/b?x=1&y=2");nextop=5;}else if(!strcmp(mode,"updates-max")){memset(input,'!',1024);input[1024]=0;nextop=5;}else if(!strcmp(mode,"favorites")){input[0]=0;nextop=3;}else if(!strcmp(mode,"favorite-items")){strcpy(input,"9876543210123456|25");nextop=4;}else if(!strcmp(mode,"history")){strcpy(input,"0|0|");nextop=2;}else if(!strcmp(mode,"history-next")){strcpy(input,"18446744073709551615|1700000000|article-list");nextop=2;}else strcpy(input,!strcmp(mode,"page25")?"25":"1");if(!auth_begin(nextop))return 11;op++;
 }struct timespec wait={0,1000000};nanosleep(&wait,NULL);}
 if(live){finish();return 12;}curl_slist_free_all(list);return clean()?0:13;
}
''')
  args=['clang','-std=c11','-D_DARWIN_C_SOURCE','-D_POSIX_C_SOURCE=200809L','-Wall','-Wextra','-Werror','-Wno-unused-function','-I'+str(ROOT/'platform/wasm-network/src'),'-I'+str(ROOT/'.local/host-network/prefix/include'),'-I'+str(prefix/'include'),str(source),str(ROOT/'.local/host-network/prefix/lib/libcurl.a'),'-L'+str(prefix/'lib'),'-lssl','-lcrypto','-lldap','-llber','-framework','SystemConfiguration','-framework','CoreFoundation','-o',str(cls.exe)]
  r=subprocess.run(args,capture_output=True)
  if r.returncode:raise RuntimeError(r.stderr.decode())
  cls.context=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);cls.context.load_cert_chain(cls.cert,key)
 @classmethod
 def tearDownClass(cls):cls.tmp.cleanup()
 def run_case(self,mode):
  received=[];violations=[]
  class Handler(http.server.BaseHTTPRequestHandler):
   protocol_version='HTTP/1.1'
   def log_message(self,*args):pass
   def do_GET(self):
    received.append(self.path);page='25' if mode=='page25' else '1';allowed=['/x/web-interface/nav','/x/v2/medialist/toview/web?mobi_app=web&ps=4&desc=true&otype=2&with_current=false&direction=false&preview=0&use_pn=true&pn='+page]
    if mode in ['updates','updates-next','updates-max']:allowed[1]='/x/polymer/web-dynamic/v1/feed/nav?update_baseline=&offset='+('' if mode=='updates' else 'a%2Fb%3Fx%3D1%26y%3D2' if mode=='updates-next' else '%21'*1024)
    if mode=='favorites':allowed[1]='/x/v3/fav/folder/list4navigate'
    if mode=='favorite-items':allowed[1]='/x/v2/medialist/resource/list?mobi_app=web&type=3&biz_id=9876543210123456&ps=4&desc=true&sort_field=3&tid=0&otype=2&with_current=false&direction=false&preview=0&use_pn=true&pn=25'
    if mode in ['history','history-next']:allowed[1]='/x/web-interface/history/cursor?max='+('0&view_at=0&business=' if mode=='history' else '18446744073709551615&view_at=1700000000&business=article-list')
    if self.path not in allowed or self.headers.get('Host')!='api.bilibili.com' or self.headers.get('Cookie')!='SESSDATA=synthetic-session; bili_jct=synthetic-csrf' and self.headers.get('Cookie')!='bili_jct=synthetic-csrf; SESSDATA=synthetic-session' or self.headers.get('Authorization'):violations.append('scope')
    body=b'{"code":0,"data":{}}' if mode!='body' else b'x'*524289
    try:
     self.send_response(302 if mode=='redirect' else 200)
     if mode=='redirect':self.send_header('Location','https://outside.invalid/')
     if mode=='header':
      for i in range(5):self.send_header('X-Fixture-'+str(i),'x'*2000)
     self.send_header('Content-Length',str(len(body)));self.send_header('Connection','close');self.end_headers();self.wfile.write(body)
    except OSError:pass
  class Server(http.server.ThreadingHTTPServer):
   daemon_threads=True
   def handle_error(self,*args):pass
  server=Server(('127.0.0.1',0),Handler);server.socket=self.context.wrap_socket(server.socket,server_side=True);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
  try:r=subprocess.run([str(self.exe),mode,str(self.wrong if mode=='tls' else self.cert),str(server.server_port)],capture_output=True,timeout=15)
  finally:server.shutdown();server.server_close();thread.join()
  self.assertEqual(r.returncode,0,r.stderr.decode());self.assertEqual(violations,[]);self.assertNotRegex(r.stdout.decode(),r'synthetic|SESSDATA|bili_jct|127\.0\.0\.1');self.assertIn(b'AUTH:closed',r.stdout)
  self.assertEqual(len(received),0 if mode in ['bounds','invalid','badcursor','badfavorite','badoffset','badcookie','cancel','deadline','tls'] else 1 if mode in ['redirect','body','header'] else 2)
 def test_follow_initial_fixed_get(self):self.run_case('updates')
 def test_follow_offset_percent_encoded_single_parameter(self):self.run_case('updates-next')
 def test_follow_maximum_encoded_offset_fits_scoped_url(self):self.run_case('updates-max')
 def test_follow_invalid_offset_rejected_before_network(self):self.run_case('badoffset')
 def test_favorite_navigation_fixed_get(self):self.run_case('favorites')
 def test_favorite_items_fixed_collection_and_page(self):self.run_case('favorite-items')
 def test_favorite_invalid_id_page_no_request(self):self.run_case('badfavorite')
 def test_history_initial_two_verified_gets(self):self.run_case('history')
 def test_history_canonical_max_cursor_exact_route(self):self.run_case('history-next')
 def test_history_invalid_cursor_never_network(self):self.run_case('badcursor')
 def test_fixed_two_gets_same_synthetic_private_jar(self):self.run_case('good')
 def test_last_allowed_page(self):self.run_case('page25')
 def test_invalid_page_and_operation_never_network(self):self.run_case('invalid')
 def test_invalid_cookie_import_never_network(self):self.run_case('badcookie')
 def test_cancel_wipes_private_state(self):self.run_case('cancel')
 def test_deadline_wipes_private_state(self):self.run_case('deadline')
 def test_exact_bounds(self):self.run_case('bounds')
 def test_tls_verified_before_credentials(self):self.run_case('tls')
 def test_no_redirect_or_cookie_forward(self):self.run_case('redirect')
 def test_body_cap(self):self.run_case('body')
 def test_header_cap(self):self.run_case('header')
if __name__=='__main__':unittest.main()
