"""HOST loopback/TLS fixture for the TV-contained relay; no external services."""
from pathlib import Path
import http.server,ssl,threading,tempfile,subprocess,json,unittest,socket,time,urllib.request,urllib.error,select
ROOT=Path(__file__).resolve().parents[2]
TOKEN='a'*32
class RelayNativeTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory();folder=Path(cls.tmp.name);prefix=Path(json.loads((ROOT/'.local/host-network/manifest.json').read_text())['opensslPrefix']);cls.cert=folder/'ca.pem';key=folder/'fixture.key';cls.exe=folder/'relay'
  p=subprocess.run([str(prefix/'bin/openssl'),'req','-x509','-newkey','ec','-pkeyopt','ec_paramgen_curve:P-256','-noenc','-keyout',str(key),'-out',str(cls.cert),'-days','1','-subj','/CN=BiliSofa fixture','-addext','subjectAltName=DNS:live-fixture.bilivideo.com'],capture_output=True)
  if p.returncode:raise RuntimeError('Fixture TLS generation failed')
  key.chmod(0o600);source=folder/'main.c';source.write_text(r'''
#define LIVE_RELAY_NO_MAIN
#include "live-relay.c"
#include <poll.h>
int main(int argc,char **argv){
 if(argc!=3 || !start())return 1;char mapping[160];snprintf(mapping,sizeof(mapping),"live-fixture.bilivideo.com:443:127.0.0.1:%s",argv[2]);struct curl_slist *list=curl_slist_append(NULL,mapping);
 if(curl_easy_setopt(easy,CURLOPT_CAINFO,argv[1])!=CURLE_OK || curl_easy_setopt(easy,CURLOPT_CONNECT_TO,list)!=CURLE_OK)return 2;
 strcpy(input,"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");if(!live_relay_start())return 3;
 puts("HOST:ready");fflush(stdout);int fetching=0;
 while(live){tick();if(!live)break;
  if(client_state==2 && active<0){if(!fetching){
   if(request_kind==2 && request_segment!=1){reject_request(404);continue;}
   strcpy(input,request_kind==1?"https://live-fixture.bilivideo.com/live.m3u8":"https://live-fixture.bilivideo.com/segment.ts");if(!live_begin(request_kind==1?1:3))return 4;fetching=1;
  }else{
   if(result_code || http_status!=200){puts("HOST:upstream_rejected");finish();break;}
   if(!live_relay_reply((int)body_size,request_kind))return 5;fetching=0;
  }}
  struct pollfd p={0,POLLIN,0};if(poll(&p,1,0)>0 && (p.revents&POLLIN)){char b;if(read(0,&b,1)>0)live_stop();}
  struct timespec wait={0,1000000};nanosleep(&wait,NULL);
 }
 curl_slist_free_all(list);return !easy && !multi && !initialized && !added && !body_size && !*body && !*input && !*relay_token && client_fd<0 && listen_fd<0 && !bad_close?0:6;
}
''')
  command=['clang','-std=c11','-D_DARWIN_C_SOURCE','-D_POSIX_C_SOURCE=200809L','-Wall','-Wextra','-Werror','-Wno-unused-function','-I'+str(ROOT/'platform/wasm-network/src'),'-I'+str(ROOT/'.local/host-network/prefix/include'),'-I'+str(prefix/'include'),str(source),str(ROOT/'.local/host-network/prefix/lib/libcurl.a'),'-L'+str(prefix/'lib'),'-lssl','-lcrypto','-lldap','-llber','-framework','SystemConfiguration','-framework','CoreFoundation','-o',str(cls.exe)]
  p=subprocess.run(command,capture_output=True)
  if p.returncode:raise RuntimeError(p.stderr.decode())
  cls.context=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);cls.context.load_cert_chain(cls.cert,key)
 @classmethod
 def tearDownClass(cls):cls.tmp.cleanup()
 def run_case(self,action,variant='good'):
  requests=[];violations=[];entered=threading.Event()
  ts=b''.join(bytes([0x47])+bytes(187) for _ in range(6));manifest=b'#EXTM3U\n#EXT-X-TARGETDURATION:3\n#EXT-X-MEDIA-SEQUENCE:1\n#EXTINF:3,\ns1.ts\n'
  class Handler(http.server.BaseHTTPRequestHandler):
   def log_message(self,*args):pass
   def do_GET(self):
    requests.append(self.path)
    if self.headers.get('Cookie') or self.headers.get('Authorization') or self.headers.get('Range'):violations.append('unexpected_headers')
    entered.set()
    if variant=='delay':time.sleep(1)
    body=manifest if self.path.endswith('m3u8') else ts
    if variant=='oversize' and self.path.endswith('ts'):body=b'x'*4194305
    try:
     self.send_response(302 if variant=='redirect' else 200);self.send_header('Content-Length',str(len(body)));self.send_header('Location','https://outside.invalid/never');self.send_header('Set-Cookie','synthetic=never-forward; Secure; Path=/');self.end_headers();self.wfile.write(body)
    except OSError:pass
  class Server(http.server.ThreadingHTTPServer):
   daemon_threads=True
   def handle_error(self,*args):pass
  server=Server(('127.0.0.1',0),Handler);server.socket=self.context.wrap_socket(server.socket,server_side=True);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
  p=subprocess.Popen([str(self.exe),str(self.cert),str(server.server_port)],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
  try:
   deadline=time.monotonic()+5;out=b''
   while b'HOST:ready\n' not in out and time.monotonic()<deadline:
    if select.select([p.stdout],[],[],.1)[0]:out+=__import__('os').read(p.stdout.fileno(),4096)
   self.assertIn(b'HOST:ready',out)
   action(entered,ts,manifest)
   if p.poll() is None:p.stdin.write(b's');p.stdin.flush()
   tail,err=p.communicate(timeout=10);out+=tail;self.assertEqual(p.returncode,0,err.decode());self.assertIn(b'LIVE:closed',out);self.assertNotIn(b'synthetic',out);self.assertEqual(violations,[])
   with socket.socket() as check:self.assertNotEqual(check.connect_ex(('127.0.0.1',40325)),0)
   return requests,out
  finally:
   if p.poll() is None:p.kill();p.communicate()
   server.shutdown();server.server_close();thread.join()
 def get(self,resource,method='GET',headers=None):
  opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
  return opener.open(urllib.request.Request('http://127.0.0.1:40325/'+TOKEN+'/'+resource,method=method,headers=headers or {}),timeout=5)
 def test_manifest_full_ts_head_single_range_and_socket_cleanup(self):
  def action(_entered,ts,manifest):
   with self.get('index.m3u8',headers={'Range':'bytes=0-','Content-Length':'0'}) as r:self.assertEqual(r.status,206);self.assertEqual(r.read(),manifest);self.assertEqual(r.headers['Content-Range'],'bytes 0-'+str(len(manifest)-1)+'/'+str(len(manifest)))
   with self.get('s1.ts') as r:self.assertEqual(r.read(),ts)
   with self.get('s1.ts',headers={'Range':'bytes=188-375'}) as r:self.assertEqual(r.status,206);self.assertEqual(r.read(),ts[188:376]);self.assertEqual(r.headers['Content-Range'],'bytes 188-375/1128')
   with self.get('s1.ts',method='HEAD',headers={'Range':'bytes=188-375','Content-Length':'0'}) as r:self.assertEqual(r.status,200);self.assertEqual(r.read(),b'');self.assertEqual(r.headers['Content-Length'],'1128')
  requests,_=self.run_case(action);self.assertEqual(len(requests),4)
 def test_unknown_uri_wrong_token_and_invalid_range_never_choose_an_upstream_url(self):
  def action(_entered,_ts,_manifest):
   for resource in ['s2.ts','index.m3u8?url=https://outside.invalid','../outside','s0.ts','s1025.ts']:
    with self.assertRaises(urllib.error.HTTPError):self.get(resource)
   with self.assertRaises(urllib.error.HTTPError):self.get('s1.ts',headers={'Range':'bytes=1-2,3-4'})
   with self.assertRaises(urllib.error.HTTPError):self.get('index.m3u8',headers={'Content-Length':'1'})
   with socket.create_connection(('127.0.0.1',40325),timeout=3) as s:
    s.sendall(b'GET /wrong/index.m3u8 HTTP/1.1\r\nHost: loopback\r\n\r\n');self.assertIn(b'404',s.recv(256))
  requests,_=self.run_case(action);self.assertEqual(requests,[])
 def test_upstream_redirect_and_oversize_close_without_success(self):
  for variant,resource in [('redirect','index.m3u8'),('oversize','s1.ts')]:
   with self.subTest(variant=variant):
    def action(_entered,_ts,_manifest):
     with self.assertRaises((OSError,__import__('http.client').client.RemoteDisconnected)):self.get(resource)
    requests,out=self.run_case(action,variant);self.assertEqual(len(requests),1);self.assertIn(b'HOST:upstream_rejected',out)
 def test_cancellation_during_upstream_read_releases_active_curl_and_client(self):
  def action(entered,_ts,_manifest):
   self.pending=socket.create_connection(('127.0.0.1',40325),timeout=3);self.pending.sendall(('GET /'+TOKEN+'/s1.ts HTTP/1.1\r\nHost: loopback\r\n\r\n').encode());self.assertTrue(entered.wait(3))
  try:requests,_=self.run_case(action,'delay');self.assertEqual(len(requests),1)
  finally:self.pending.close()
if __name__=='__main__':unittest.main()
