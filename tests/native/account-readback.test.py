"""Real HOST TLS, fixed GET-only current-player WBI route; synthetic cookies only."""
from pathlib import Path
import hashlib,http.server,json,ssl,subprocess,tempfile,threading,unittest,urllib.parse
ROOT=Path(__file__).resolve().parents[2]
class ReadbackTLS(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory();folder=Path(cls.tmp.name);m=json.loads((ROOT/'.local/host-network/manifest.json').read_text());prefix=Path(m['opensslPrefix']);cls.cert=folder/'ca.pem';key=folder/'fixture.key';cls.exe=folder/'readback'
  p=subprocess.run([str(prefix/'bin/openssl'),'req','-x509','-newkey','ec','-pkeyopt','ec_paramgen_curve:P-256','-noenc','-keyout',str(key),'-out',str(cls.cert),'-days','1','-subj','/CN=BiliSofa fixture','-addext','subjectAltName=DNS:api.bilibili.com'],capture_output=True)
  if p.returncode:raise RuntimeError('TLS fixture creation failed')
  key.chmod(0o600);source=folder/'main.c';source.write_text(r'''
#define READBACK_NO_MAIN
#include "account-readback.c"
static int clean(void){return !live&&!easy&&!multi&&!initialized&&!added&&!body_size&&!*input&&!*readback_url&&!readback_prepared;}
int main(int argc,char **argv){
 if(argc!=4||!start())return 1;char mapping[128];snprintf(mapping,sizeof(mapping),"api.bilibili.com:443:127.0.0.1:%s",argv[3]);struct curl_slist *list=curl_slist_append(NULL,mapping);
 if(!list||curl_easy_setopt(easy,CURLOPT_CONNECT_TO,list)!=CURLE_OK||curl_easy_setopt(easy,CURLOPT_CAINFO,argv[2])!=CURLE_OK)return 2;
 strcpy(input,".bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\taaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n");if(!auth_import_cookies((int)strlen(input)))return 3;
 if(auth_begin(5)||auth_begin(6))return 4;
 long long clock=(long long)time(NULL);if(!strcmp(argv[1],"clock"))clock-=100;
 snprintf(input,sizeof(input),"%s\nffffffffffffffffffffffffffffffff\n%lld\n",!strcmp(argv[1],"key")?"wrong":"00000000000000000000000000000000",clock);
 int prepared=auth_readback_prepare((int)strlen(input));
 if(!strcmp(argv[1],"key")||!strcmp(argv[1],"clock")){if(prepared||auth_begin(5))return 5;finish();curl_slist_free_all(list);return clean()?0:6;}
 if(!prepared||!auth_begin(4))return 7;if(!strcmp(argv[1],"cancel")){auth_stop();curl_slist_free_all(list);return clean()?0:8;}
 int phase=4;double until=now_ms()+10000;
 while(live&&now_ms()<until){tick();if(live&&active<0){if(result_code||http_status!=200)return 9;
  if(phase==4){phase=5;if(!auth_begin(5))return 10;}else {if(auth_begin(5))return 11;finish();break;}}
  struct timespec wait={0,1000000};nanosleep(&wait,NULL);
 }
 curl_slist_free_all(list);return clean()?0:12;
}
''')
  argv=['clang','-std=c11','-D_DARWIN_C_SOURCE','-D_POSIX_C_SOURCE=200809L','-Wall','-Wextra','-Werror','-Wno-unused-function','-I'+str(ROOT/'platform/wasm-network/src'),'-I'+str(ROOT/'.local/host-network/prefix/include'),'-I'+str(prefix/'include'),str(source),str(ROOT/'.local/host-network/prefix/lib/libcurl.a'),'-L'+str(prefix/'lib'),'-lssl','-lcrypto','-lldap','-llber','-framework','SystemConfiguration','-framework','CoreFoundation','-o',str(cls.exe)]
  p=subprocess.run(argv,capture_output=True)
  if p.returncode:raise RuntimeError(p.stderr.decode())
  cls.context=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);cls.context.load_cert_chain(cls.cert,key)
 @classmethod
 def tearDownClass(cls):cls.tmp.cleanup()
 def case(self,mode):
  paths=[];bad=[]
  class Handler(http.server.BaseHTTPRequestHandler):
   def log_message(self,*args):pass
   def do_POST(self):bad.append('unexpected_post');self.send_error(405)
   def do_GET(self):
    url=urllib.parse.urlsplit(self.path);paths.append(url.path);q=urllib.parse.parse_qs(url.query)
    if self.headers.get('Host')!='api.bilibili.com' or 'SESSDATA=synthetic' not in self.headers.get('Cookie',''):bad.append('scope')
    if url.path=='/x/player/wbi/v2':
     if set(q)!={'aid','cid','wts','w_rid'} or q.get('aid')!=['117400733288351'] or q.get('cid')!=['42548528128']:bad.append('fixed_target')
     joined='0'*32+'f'*32;indices=[46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13]
     signed=urllib.parse.urlencode(sorted((k,v[0]) for k,v in q.items() if k!='w_rid'))+''.join(joined[i] for i in indices)
     if q.get('w_rid')!=[hashlib.md5(signed.encode()).hexdigest()]:bad.append('wbi')
    elif url.path!='/x/player/v2':bad.append('route')
    body=json.dumps({'code':0,'data':{'last_play_time':15000 if 'wbi' in url.path else 0,'last_play_cid':42548528128,'login_mid':123456}}).encode();self.send_response(200);self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
  server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler);server.socket=self.context.wrap_socket(server.socket,server_side=True);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
  try:p=subprocess.run([str(self.exe),mode,str(self.cert),str(server.server_port)],capture_output=True,timeout=15)
  finally:server.shutdown();server.server_close();thread.join()
  self.assertEqual(p.returncode,0,p.stderr.decode());self.assertEqual(bad,[]);self.assertNotRegex(p.stdout.decode(),r'SESSDATA|synthetic|123456');self.assertIn('AUTH:closed',p.stdout.decode());return paths
 def test_fixed_legacy_and_signed_current_get_once(self):self.assertEqual(self.case('good'),['/x/player/v2','/x/player/wbi/v2'])
 def test_bad_public_key_no_request(self):self.assertEqual(self.case('key'),[])
 def test_wrong_timestamp_no_request(self):self.assertEqual(self.case('clock'),[])
 def test_cancel_before_multi_perform_no_request(self):self.assertEqual(self.case('cancel'),[])
if __name__=='__main__':unittest.main()
