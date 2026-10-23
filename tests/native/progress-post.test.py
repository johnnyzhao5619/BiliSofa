"""One fixed progress POST to ephemeral HOST TLS fixture only; never a real account."""
from pathlib import Path
import hashlib,http.server,json,ssl,subprocess,tempfile,threading,time,unittest,urllib.parse
ROOT=Path(__file__).resolve().parents[2]
class ProgressPostTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory();folder=Path(cls.tmp.name);m=json.loads((ROOT/'.local/host-network/manifest.json').read_text());prefix=Path(m['opensslPrefix']);cls.cert=folder/'ca.pem';key=folder/'fixture.key';cls.exe=folder/'progress'
  r=subprocess.run([str(prefix/'bin/openssl'),'req','-x509','-newkey','ec','-pkeyopt','ec_paramgen_curve:P-256','-noenc','-keyout',str(key),'-out',str(cls.cert),'-days','1','-subj','/CN=BiliSofa progress fixture','-addext','subjectAltName=DNS:api.bilibili.com'],capture_output=True)
  if r.returncode:raise RuntimeError('fixture TLS generation failed')
  key.chmod(0o600);source=folder/'main.c';source.write_text(r'''
#define PROGRESS_NO_MAIN
#include "progress-post.c"
static int clean(void){return !live&&!easy&&!multi&&!initialized&&!added&&!body_size&&!cookie_size&&!*input&&!*cookie_output&&!*progress_url&&!*progress_form&&!progress_headers;}
int main(int argc,char **argv){
 if(argc!=4||!start())return 1;const char *mode=argv[1];char target[100];snprintf(target,sizeof(target),"api.bilibili.com:443:127.0.0.1:%s",argv[3]);struct curl_slist *mapping=curl_slist_append(NULL,target);
 if(curl_easy_setopt(easy,CURLOPT_CAINFO,argv[2])!=CURLE_OK||curl_easy_setopt(easy,CURLOPT_CONNECT_TO,mapping)!=CURLE_OK)return 2;
 const char *csrf=!strcmp(mode,"bad-csrf")?"not-a-csrf":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
 snprintf(input,sizeof(input),".bilibili.com\tTRUE\t/\tTRUE\t2000000000\tSESSDATA\tsynthetic-progress\n.bilibili.com\tTRUE\t/\tTRUE\t2000000000\tbili_jct\t%s\n",csrf);
 if(!auth_import_cookies((int)strlen(input)))return 3;
 snprintf(input,sizeof(input),"123456\n00000000000000000000000000000000\nffffffffffffffffffffffffffffffff\n%lld\n",(long long)time(NULL));
 if(!strcmp(mode,"bad-key"))input[7]='x';
 int prepared=progress_prepare((int)strlen(input));
 if(!strcmp(mode,"bad-key")||!strcmp(mode,"bad-csrf")){if(prepared)return 4;finish();curl_slist_free_all(mapping);return clean()?0:5;}
 if(!prepared)return 6;
 if(!strcmp(mode,"cancel")){auth_stop();if(progress_attempt())return 7;curl_slist_free_all(mapping);return clean()?0:8;}
 if(!strcmp(mode,"timeout"))curl_easy_setopt(easy,CURLOPT_TIMEOUT_MS,100L);
 if(!progress_attempt()||progress_attempt())return 9;
 double until=now_ms()+4000;while(active>=0&&live&&now_ms()<until){tick();struct timespec wait={0,1000000};nanosleep(&wait,NULL);}
 if(!live||active>=0||!progress_attempted||progress_attempt())return 10;
 if(!strcmp(mode,"timeout")){if(result_code!=CURLE_OPERATION_TIMEDOUT)return 11;}else if(result_code||http_status!=200)return 12;
 finish();curl_slist_free_all(mapping);return clean()?0:13;
}
''')
  args=['clang','-std=c11','-D_DARWIN_C_SOURCE','-D_POSIX_C_SOURCE=200809L','-Wall','-Wextra','-Werror','-Wno-unused-function','-I'+str(ROOT/'platform/wasm-network/src'),'-I'+str(ROOT/'.local/host-network/prefix/include'),'-I'+str(prefix/'include'),str(source),str(ROOT/'.local/host-network/prefix/lib/libcurl.a'),'-L'+str(prefix/'lib'),'-lssl','-lcrypto','-lldap','-llber','-framework','SystemConfiguration','-framework','CoreFoundation','-o',str(cls.exe)]
  r=subprocess.run(args,capture_output=True)
  if r.returncode:raise RuntimeError(r.stderr.decode())
  cls.context=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);cls.context.load_cert_chain(cls.cert,key)
 @classmethod
 def tearDownClass(cls):cls.tmp.cleanup()
 def run_case(self,mode):
  requests=[];violations=[]
  class Handler(http.server.BaseHTTPRequestHandler):
   def log_message(self,*args):pass
   def do_POST(self):
    requests.append('POST');url=urllib.parse.urlsplit(self.path);query=urllib.parse.parse_qs(url.query,strict_parsing=True);length=int(self.headers.get('Content-Length','0'));form=urllib.parse.parse_qs(self.rfile.read(min(length,2049)).decode(),strict_parsing=True)
    if url.path!='/x/click-interface/web/heartbeat' or self.headers.get('Host')!='api.bilibili.com' or length>2048:violations.append('destination')
    expected={'aid':'117400733288351','cid':'42548528128','mid':'123456','type':'3','dt':'2','play_type':'4','played_time':'15','last_play_progress_time':'15','max_play_progress_time':'15','video_duration':'95','realtime':'0','real_played_time':'0','csrf':'a'*32}
    if set(form)!=set(expected)|{'start_ts'} or any(form.get(k)!=[v] for k,v in expected.items()):violations.append('fixed_form')
    if self.headers.get('Origin')!='https://www.bilibili.com' or self.headers.get('Referer')!='https://www.bilibili.com/video/BV14GHy6bE9n/' or 'SESSDATA=synthetic-progress' not in self.headers.get('Cookie',''):violations.append('headers')
    signature=query.pop('w_rid',[]);canonical='&'.join(k+'='+query[k][0] for k in sorted(query));mix='ff00f00f0f00f0ff0f0ff0f0000f0ff0'
    if signature!=[hashlib.md5((canonical+mix).encode()).hexdigest()] or any(len(v)!=1 for v in query.values()) or query.get('w_played_time')!=['15'] or query.get('w_realtime')!=['0'] or 'csrf' in query:violations.append('dynamic_wbi')
    if mode=='timeout':time.sleep(.25)
    try:
     self.send_response(200);self.send_header('Content-Length','10');self.end_headers();self.wfile.write(b'{"code":0}')
    except OSError:pass
  class Server(http.server.ThreadingHTTPServer):
   daemon_threads=True
   def handle_error(self,*args):violations.append('server_error')
  server=Server(('127.0.0.1',0),Handler);server.socket=self.context.wrap_socket(server.socket,server_side=True);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
  try:r=subprocess.run([str(self.exe),mode,str(self.cert),str(server.server_port)],capture_output=True,timeout=6)
  finally:server.shutdown();server.server_close();thread.join()
  self.assertEqual(r.returncode,0,r.stderr.decode());self.assertEqual(violations,[]);self.assertNotRegex(r.stdout.decode(),r'synthetic-progress|bili_jct|SESSDATA|123456|127\.0\.0\.1');return requests
 def test_fixed_signed_post_on_wire_once_then_cleans_all_private_buffers(self):self.assertEqual(self.run_case('good'),['POST'])
 def test_unknown_timeout_does_not_retry_post(self):self.assertEqual(self.run_case('timeout'),['POST'])
 def test_cancel_before_post_closes_without_request(self):self.assertEqual(self.run_case('cancel'),[])
 def test_bad_public_signing_key_stops_without_request(self):self.assertEqual(self.run_case('bad-key'),[])
 def test_bad_csrf_stops_without_request(self):self.assertEqual(self.run_case('bad-csrf'),[])
if __name__=='__main__':unittest.main()
