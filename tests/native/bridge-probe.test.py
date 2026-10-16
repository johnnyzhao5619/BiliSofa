"""HOST sockets/cURL-multi only. Anonymous fixture branch never ships on TV."""
from pathlib import Path
import http.server,http.client,json,socket,subprocess,tempfile,threading,time,unittest,urllib.request,urllib.error
ROOT=Path(__file__).resolve().parents[2]
TOKEN='0123456789abcdef0123456789abcdef'
class BridgeTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory();folder=Path(cls.tmp.name);cls.exe=folder/'bridge'
  cls.payload=b'\x00\x00\x00\x20ftyp'+bytes(range(256))*12288
  cls.received=[];cls.bad=False;cls.attempts={}
  class Upstream(http.server.BaseHTTPRequestHandler):
   def log_message(self,*args):pass
   def do_HEAD(self):
    self.send_response(200);self.send_header('Content-Length',str(len(cls.payload)));self.end_headers()
   def do_GET(self):
    cls.received.append(dict(self.headers));a,b=map(int,self.headers['Range'][6:].split('-'));b=min(b,len(cls.payload)-1);body=cls.payload[a:b+1]
    cls.attempts[self.headers['Range']]=cls.attempts.get(self.headers['Range'],0)+1
    if cls.bad=='preheader-always' or cls.bad=='preheader-once' and cls.attempts[self.headers['Range']]==1 or cls.bad=='preheader-then-stall' and len(cls.received)==1:
     time.sleep(.75);self.close_connection=True;return
    self.send_response(200 if cls.bad is True else 206);self.send_header('Content-Range',f'bytes {a}-{b}/{len(cls.payload)+(1 if cls.bad=="total" or cls.bad=="partial-bad-total" and len(cls.received)>1 else 0)}');self.send_header('Content-Length',str(len(body)+(1 if cls.bad=='length' else 0)));
    if cls.bad=='encoding':self.send_header('Content-Encoding','gzip')
    self.send_header('X-Fixture','anonymous');self.send_header('Set-Cookie','synthetic=never-forward');self.end_headers()
    try:
     if cls.bad=='stall' or cls.bad=='stall-once' and len(cls.received)==1 or cls.bad=='preheader-then-stall' and len(cls.received)==2:time.sleep(1.5)
     if cls.bad in ['partial-once','partial-large','partial-bad-total'] and len(cls.received)==1:
      prefix=65659 if cls.bad=='partial-large' else 123
      self.wfile.write(body[:prefix]);self.wfile.flush();time.sleep(1.5);return
     self.wfile.write(body)
    except (BrokenPipeError,ConnectionResetError):pass
  cls.upstream=http.server.ThreadingHTTPServer(('127.0.0.1',0),Upstream);cls.thread=threading.Thread(target=cls.upstream.serve_forever,daemon=True);cls.thread.start()
  with socket.socket() as reserve:reserve.bind(('127.0.0.1',0));cls.port=reserve.getsockname()[1]
  source=folder/'bridge.c'
  source.write_text('''#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <strings.h>
#include <errno.h>
#include <unistd.h>
#include <fcntl.h>
#include <poll.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <curl/curl.h>
static int inject_close_error=0;
static int bridge_test_close(int fd) { int rc=close(fd); if(inject_close_error){errno=EIO;return -1;}return rc; }
#define close bridge_test_close
#include "probe-http.h"
#include "probe-guest.h"
static double fixture_offset=0;
static double fixture_now(void){return http_now()+fixture_offset;}
#define http_now fixture_now
static int fixture_accept(int listener){int fd=http_accept(listener);if(fd>=0){int bytes=16384;setsockopt(fd,SOL_SOCKET,SO_SNDBUF,&bytes,sizeof(bytes));}return fd;}
#define http_accept fixture_accept
#include "probe-bridge.h"
int main(int argc,char **argv) {
 (void)bridge_progressive_begin;(void)http_probe;(void)guest_popular;(void)guest_video;
 if(argc<2)return 2;
 if(!strcmp(argv[1],"lease")) {
  if(bridge_probe_lease(12000,3600,3600)!=180 || bridge_probe_lease(264000,3600,3600)!=324 || bridge_probe_lease(536000,3600,3600)!=596 || bridge_probe_lease(7200000,3600,3600)!=900)return 10;
  if(bridge_probe_lease(264000,75,3600)!=75 || bridge_probe_lease(264000,3600,55)!=55)return 11;
  return 0;
 }
 char url[256];snprintf(url,sizeof(url),"https://fixture.bilivideo.com/a.m4s?deadline=%llu",(unsigned long long)time(NULL)+3600);
 if(argc>2){if(bridge_progressive_begin("0123456789abcdef0123456789abcdef",url,300,3145736ULL))return 12;}
 else if(bridge_begin("BV0000000001","0123456789abcdef0123456789abcdef",url,url,"12000,640,360,500000,66000,914,6546,836,6348,avc1.64001E"))return 3;
 snprintf(bridge_urls[0],sizeof(bridge_urls[0]),"http://127.0.0.1:%d/video",atoi(argv[1]));snprintf(bridge_urls[1],sizeof(bridge_urls[1]),"http://127.0.0.1:%d/audio",atoi(argv[1]));
 double start=http_now();
 while(http_now()-start<150 && bridge_fd>=0) {
  bridge_tick();struct pollfd input={0,POLLIN,0};if(poll(&input,1,0)>0 && (input.revents&POLLIN)){char c;read(0,&c,1);if(c=='p'){int paused=0;for(int i=0;i<BRIDGE_CLIENTS;i++)paused+=bridge_clients[i].paused;puts(paused?"FIXTURE:paused":"FIXTURE:reading");fflush(stdout);continue;}if(c=='a'){fixture_offset+=21;puts("FIXTURE:advanced");fflush(stdout);continue;}if(c=='b'){bridge_stream_bytes=BRIDGE_STREAM_BUDGET-256;puts("FIXTURE:budget");fflush(stdout);continue;}if(c=='w'){bridge_windows=256;puts("FIXTURE:windows");fflush(stdout);continue;}if(c=='t'){bridge_deadline=http_now()-1;continue;}if(c=='e')inject_close_error=1;break;}
  struct timespec delay={0,2000000};nanosleep(&delay,NULL);
 }
 bridge_stop();puts("CLOSED_WHILE_PROCESS_ALIVE");fflush(stdout);struct timespec alive={1,0};nanosleep(&alive,NULL);return bridge_unconfirmed?4:0;
}
''')
  subprocess.run(['clang','-std=c11','-D_DARWIN_C_SOURCE','-D_DEFAULT_SOURCE','-DBILISOFA_BRIDGE_HOST_FIXTURE',f'-DBILISOFA_BRIDGE_PORT={cls.port}','-Wall','-Wextra','-Werror','-I',str(ROOT/'platform/wasm-network/src'),str(source),'-lcurl','-o',str(cls.exe)],check=True,capture_output=True)
 @classmethod
 def tearDownClass(cls):cls.upstream.shutdown();cls.upstream.server_close();cls.tmp.cleanup()
 def setUp(self):
  type(self).bad=False;type(self).received=[];type(self).attempts={};self.observations=[]
  self.process=subprocess.Popen([str(self.exe),str(self.upstream.server_port)],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
  self.assertEqual(self.line().strip(),'BRIDGE:ready')
 def line(self):
  for _ in range(10):
   line=self.process.stdout.readline()
   if line.startswith('BRIDGE:flow:') or line.startswith('BRIDGE:limit:') or line.startswith('BRIDGE:retry:') or line.startswith('BRIDGE:resume:'):
    self.observations.append(line.strip());continue
   return line
  self.fail('too many bounded snapshot frames')
 def tearDown(self):
  if self.process.poll() is None:self.process.stdin.write('s');self.process.stdin.flush()
  self.process.communicate(timeout=5)
 def fetch(self,path='manifest.mpd',headers=None,method='GET'):
  request=urllib.request.Request(f'http://127.0.0.1:{self.port}/{TOKEN}/{path}',headers=headers or {},method=method)
  with urllib.request.urlopen(request,timeout=5) as response:return response.status,response.headers,response.read()
 def progressive(self):
  self.process.stdin.write('s');self.process.stdin.flush();self.process.communicate(timeout=5)
  self.process=subprocess.Popen([str(self.exe),str(self.upstream.server_port),'progressive'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
  self.assertEqual(self.line().strip(),'BRIDGE:ready')
 def test_progressive_cast_route_serves_head_and_single_ranges_without_manifest_or_audio_routes(self):
  self.progressive();self.assertEqual(self.fetch('cast.mp4',method='HEAD')[2],b'')
  status,headers,body=self.fetch('cast.mp4',{'Range':'bytes=64-575'});self.assertEqual(status,206);self.assertEqual(body,self.payload[64:576]);self.assertEqual(headers['Content-Type'],'video/mp4')
  for path in ['manifest.mpd','video.mp4','audio.mp4','cast.mp4?url=outside']:
   with self.assertRaises(urllib.error.HTTPError):self.fetch(path,{'Range':'bytes=0-511'})
  self.assertEqual(len(self.received),1);self.assertEqual(self.received[0]['Referer'],'https://www.bilibili.com/');self.assertNotIn('Cookie',self.received[0])
 def test_progressive_open_range_remains_bounded_and_preserves_bytes_under_backpressure(self):
  self.progressive();status,headers,body=self.fetch('cast.mp4',{'Range':'bytes=0-'});self.assertEqual(status,206);self.assertEqual(body,self.payload);self.assertEqual(headers['Content-Length'],str(len(self.payload)));self.assertEqual(headers['Content-Range'],f'bytes 0-{len(self.payload)-1}/{len(self.payload)}');self.assertEqual(len(self.received),2);self.assertTrue(all(int(h['Range'].split('-')[1])-int(h['Range'][6:].split('-')[0])+1<=2097152 for h in self.received))
 def test_progressive_full_get_returns_200_and_the_complete_body_through_two_bounded_upstream_ranges(self):
  self.progressive();status,headers,body=self.fetch('cast.mp4');self.assertEqual(status,200);self.assertEqual(body,self.payload);self.assertEqual(headers['Content-Length'],str(len(self.payload)));self.assertIsNone(headers['Content-Range']);self.assertEqual(len(self.received),2)
  self.assertEqual([h['Range'] for h in self.received],[f'bytes=0-{2097152-1}',f'bytes=2097152-{len(self.payload)-1}'])
 def test_progressive_suffix_and_oversized_end_return_the_exact_satisfiable_interval(self):
  self.progressive()
  for value,start in [('bytes=-512',len(self.payload)-512),(f'bytes={len(self.payload)-512}-99999999',len(self.payload)-512)]:
   status,headers,body=self.fetch('cast.mp4',{'Range':value});self.assertEqual(status,206);self.assertEqual(body,self.payload[start:]);self.assertEqual(headers['Content-Range'],f'bytes {start}-{len(self.payload)-1}/{len(self.payload)}')
 def test_progressive_head_is_local_and_bodyless_even_when_upstream_would_fail(self):
  self.progressive();type(self).bad=True;status,headers,body=self.fetch('cast.mp4',method='HEAD');self.assertEqual(status,200);self.assertEqual(body,b'');self.assertEqual(headers['Content-Length'],str(len(self.payload)));self.assertEqual(self.received,[])
 def test_progressive_head_ignores_range_headers_instead_of_treating_head_as_a_range_get(self):
  self.progressive()
  for value in ['bytes=-512','bytes=bad','bytes=0-1,4-5']:
   status,headers,body=self.fetch('cast.mp4',{'Range':value},'HEAD');self.assertEqual(status,200);self.assertEqual(body,b'');self.assertEqual(headers['Content-Length'],str(len(self.payload)));self.assertIsNone(headers['Content-Range'])
  self.assertEqual(self.received,[])
 def test_progressive_rejects_zero_suffix_unsatisfiable_or_multi_range_without_fetching(self):
  self.progressive()
  for value in ['bytes=-0',f'bytes={len(self.payload)}-','bytes=5-4','bytes=0-1,4-5','bytes=-18446744073709551615']:
   with self.assertRaises(urllib.error.HTTPError) as error:self.fetch('cast.mp4',{'Range':value})
   self.assertEqual(error.exception.code,416);self.assertEqual(error.exception.headers['Content-Range'],f'bytes */{len(self.payload)}')
  self.assertEqual(self.received,[])
 def test_progressive_accepts_only_one_empty_content_length_and_never_a_request_body(self):
  self.progressive();status,headers,body=self.fetch('cast.mp4',{'Content-Length':'0','Range':'bytes=0-511'});self.assertEqual(status,206);self.assertEqual(body,self.payload[:512])
  for fields in ['Content-Length: 0\r\nContent-Length: 0','Content-Length: 1','Transfer-Encoding: chunked']:
   with socket.create_connection(('127.0.0.1',self.port),timeout=2) as client:
    client.sendall((f'GET /{TOKEN}/cast.mp4 HTTP/1.1\r\n{fields}\r\n\r\n').encode());self.assertIn(b'400',client.recv(512))
  self.assertEqual(len(self.received),1)
 def test_progressive_next_range_total_mismatch_cannot_be_sent_as_contiguous_content(self):
  self.progressive();type(self).bad='total'
  with self.assertRaises(urllib.error.HTTPError) as error:self.fetch('cast.mp4',{'Range':'bytes=0-511'})
  self.assertEqual(error.exception.code,502)
 def test_progressive_aggregate_byte_budget_aborts_without_forwarding_extra_media(self):
  self.progressive();self.process.stdin.write('b');self.process.stdin.flush();self.assertEqual(self.line().strip(),'FIXTURE:budget')
  with self.assertRaises(urllib.error.HTTPError) as error:self.fetch('cast.mp4',{'Range':'bytes=0-511'})
  self.assertEqual(error.exception.code,502)
 def test_progressive_upstream_window_budget_refuses_before_a_new_request(self):
  self.progressive();self.process.stdin.write('w');self.process.stdin.flush();self.assertEqual(self.line().strip(),'FIXTURE:windows')
  with self.assertRaises(urllib.error.HTTPError) as error:self.fetch('cast.mp4',{'Range':'bytes=0-511'})
  self.assertEqual(error.exception.code,429);self.assertEqual(self.received,[])
 def test_progressive_cancel_with_active_media_closes_listener_and_transfer_while_process_lives(self):
  self.progressive();client=socket.create_connection(('127.0.0.1',self.port),timeout=2);client.sendall(f'GET /{TOKEN}/cast.mp4 HTTP/1.1\r\n\r\n'.encode());self.assertIn(b'200 OK',client.recv(512))
  self.process.stdin.write('s');self.process.stdin.flush()
  for _ in range(16):
   line=self.line();self.assertTrue(line,'process ended without closure ACK')
   if line.strip()=='BRIDGE:stopped':break
  else:self.fail('closure ACK not found among bounded progress lines')
  self.assertEqual(self.line().strip(),'CLOSED_WHILE_PROCESS_ALIVE');self.assertIsNone(self.process.poll())
  with socket.socket() as s:self.assertNotEqual(s.connect_ex(('127.0.0.1',self.port)),0)
  client.close()
 def paused_client(self):
  client=socket.create_connection(('127.0.0.1',self.port),timeout=5);client.sendall(f'GET /{TOKEN}/cast.mp4 HTTP/1.1\r\n\r\n'.encode())
  for _ in range(40):
   time.sleep(.05);self.process.stdin.write('p');self.process.stdin.flush();line=self.line().strip()
   while line.startswith('BRIDGE:request:'):line=self.line().strip()
   if line=='FIXTURE:paused':return client
   self.assertEqual(line,'FIXTURE:reading')
  client.close();self.fail('fixture failed to apply real socket backpressure')
 def test_progressive_pause_exceeds_old_transfer_and_client_deadlines_then_resumes_without_losing_bytes(self):
  self.progressive();client=self.paused_client()
  try:
   # Real 16 seconds exercises libcurl's former 15-second total timeout.
   time.sleep(16);self.process.stdin.write('a');self.process.stdin.flush();self.assertEqual(self.line().strip(),'FIXTURE:advanced')
   # Advancing the bridge clock also crosses the former 20-second local idle limit.
   with client.makefile('rb') as stream:
    self.assertIn(b'200 OK',stream.readline())
    while stream.readline()!=b'\r\n':pass
    body=stream.read()
   self.assertEqual(body,self.payload);self.assertEqual(self.line().strip(),'BRIDGE:served:1')
   # A backward seek is a new smaller range from the already-read representation.
   status,headers,body=self.fetch('cast.mp4',{'Range':'bytes=512-4095'});self.assertEqual(status,206);self.assertEqual(body,self.payload[512:4096])
  finally:client.close()
 def test_progressive_repeated_valid_206_stall_exhausts_two_retries_then_fails(self):
  self.progressive();type(self).bad='stall'
  with self.begin_range() as client:
   response=http.client.HTTPResponse(client);response.begin();self.assertEqual(response.status,206)
   for i in range(3):
    self.wait_requests(i+1);time.sleep(.03);self.advance_timeout()
   self.assertEqual(self.line().strip(),'BRIDGE:issue:206:28')
   with self.assertRaises(http.client.IncompleteRead):response.read()
  self.assertEqual(len(self.received),3);self.assertEqual([v for v in self.observations if v.startswith('BRIDGE:resume:')],['BRIDGE:resume:1','BRIDGE:resume:2'])
 def test_progressive_valid_206_header_without_body_can_resume_without_duplicate_headers(self):
  self.progressive();type(self).bad='stall-once'
  with self.begin_range() as client:
   response=http.client.HTTPResponse(client);response.begin();self.assertEqual(response.status,206);self.advance_timeout();self.assertEqual(response.read(),self.payload[:512])
  self.assertEqual([h['Range'] for h in self.received],['bytes=0-511']*2);self.assertEqual(self.line().strip(),'BRIDGE:served:1');self.assertIn('BRIDGE:resume:1',self.observations)
 def test_progressive_partial_body_resume_starts_after_owned_prefix_and_keeps_exact_response(self):
  self.progressive();type(self).bad='partial-once'
  with self.begin_range() as client:
   response=http.client.HTTPResponse(client);response.begin();prefix=response.read(123);self.assertEqual(prefix,self.payload[:123]);self.advance_timeout();self.assertEqual(prefix+response.read(),self.payload[:512])
  self.assertEqual([h['Range'] for h in self.received],['bytes=0-511','bytes=123-511']);self.assertEqual(self.line().strip(),'BRIDGE:served:1');self.assertIn('BRIDGE:resume:1',self.observations)
 def test_progressive_partial_large_window_resume_preserves_original_window_end_and_next_window(self):
  self.progressive();type(self).bad='partial-large'
  with socket.create_connection(('127.0.0.1',self.port),timeout=5) as client:
   client.sendall(f'GET /{TOKEN}/cast.mp4 HTTP/1.1\r\n\r\n'.encode());response=http.client.HTTPResponse(client);response.begin();self.assertEqual(response.status,200);prefix=response.read(65659);self.advance_timeout();self.assertEqual(prefix+response.read(),self.payload)
  self.assertEqual([h['Range'] for h in self.received],['bytes=0-2097151','bytes=65659-2097151',f'bytes=2097152-{len(self.payload)-1}']);self.assertEqual(self.line().strip(),'BRIDGE:served:1')
 def test_progressive_unanswered_retry_and_valid_206_continuation_share_one_budget(self):
  self.progressive();type(self).bad='preheader-then-stall'
  with self.begin_range() as client:
   self.wait_requests(1);self.advance_timeout();response=http.client.HTTPResponse(client);response.begin();self.assertEqual(response.status,206);self.advance_timeout();self.assertEqual(response.read(),self.payload[:512])
  self.assertEqual([h['Range'] for h in self.received],['bytes=0-511']*3);self.assertEqual(self.line().strip(),'BRIDGE:served:1');self.assertIn('BRIDGE:retry:1',self.observations);self.assertIn('BRIDGE:resume:2',self.observations)
 def test_progressive_resumed_wrong_representation_length_is_final_without_replaying_prefix(self):
  self.progressive();type(self).bad='partial-bad-total'
  with self.begin_range() as client:
   response=http.client.HTTPResponse(client);response.begin();self.assertEqual(response.read(123),self.payload[:123]);self.advance_timeout()
   with self.assertRaises(http.client.IncompleteRead):response.read()
  self.assertEqual(len(self.received),2);self.assertEqual(self.received[1]['Range'],'bytes=123-511');self.assertEqual(self.line().strip(),'BRIDGE:issue:206:23')
 def wait_requests(self,count):
  for _ in range(200):
   if len(self.received)>=count:return
   time.sleep(.005)
  self.fail('upstream request not observed')
 def advance_timeout(self):
  self.process.stdin.write('a');self.process.stdin.flush()
  for _ in range(8):
   if self.line().strip()=='FIXTURE:advanced':return
  self.fail('clock advance ACK missing')
 def begin_range(self,index=0):
  client=socket.create_connection(('127.0.0.1',self.port),timeout=3)
  client.sendall(f'GET /{TOKEN}/cast.mp4 HTTP/1.1\r\nRange: bytes={index*512}-{index*512+511}\r\n\r\n'.encode());return client
 def test_progressive_no_header_timeout_reconnects_same_range_once_without_duplicating_bytes(self):
  self.progressive();type(self).bad='preheader-once'
  with self.begin_range() as client:
   self.wait_requests(1);self.advance_timeout();response=http.client.HTTPResponse(client);response.begin();self.assertEqual(response.status,206);self.assertEqual(response.read(),self.payload[:512])
  self.assertEqual(self.line().strip(),'BRIDGE:served:1');self.assertEqual([h['Range'] for h in self.received],['bytes=0-511']*2);self.assertEqual([v for v in self.observations if v.startswith('BRIDGE:retry:')],['BRIDGE:retry:1'])
 def test_progressive_third_no_header_timeout_is_final_and_never_retries_forever(self):
  self.progressive();type(self).bad='preheader-always'
  with self.begin_range() as client:
   self.wait_requests(1);self.advance_timeout();self.wait_requests(2);self.advance_timeout();self.wait_requests(3);self.advance_timeout();response=http.client.HTTPResponse(client);response.begin();self.assertEqual(response.status,502);self.assertEqual(response.read(),b'')
  self.assertEqual(self.line().strip(),'BRIDGE:issue:0:28');self.assertEqual(len(self.received),3);self.assertEqual([v for v in self.observations if v.startswith('BRIDGE:retry:')],['BRIDGE:retry:1','BRIDGE:retry:2'])
 def test_progressive_reconnects_have_a_shared_three_attempt_lease_budget(self):
  self.progressive();type(self).bad='preheader-once'
  for i in range(4):
   with self.begin_range(i) as client:
    self.wait_requests(2*i+1);self.advance_timeout();response=http.client.HTTPResponse(client);response.begin();self.assertEqual(response.status,206 if i<3 else 502);self.assertEqual(response.read(),self.payload[i*512:i*512+512] if i<3 else b'')
   if i==0:self.assertEqual(self.line().strip(),'BRIDGE:served:1')
  self.assertEqual(self.line().strip(),'BRIDGE:issue:0:28');self.assertEqual(len(self.received),7);self.assertEqual([v for v in self.observations if v.startswith('BRIDGE:retry:')],['BRIDGE:retry:1','BRIDGE:retry:2','BRIDGE:retry:3'])
 def test_progressive_stop_during_reconnect_backoff_never_opens_a_late_request(self):
  self.progressive();type(self).bad='preheader-always'
  with self.begin_range() as client:
   self.wait_requests(1);self.advance_timeout();self.assertEqual(self.process.stdout.readline().strip(),'BRIDGE:retry:1');self.process.stdin.write('s');self.process.stdin.flush();self.assertEqual(self.line().strip(),'BRIDGE:stopped');self.assertEqual(self.line().strip(),'CLOSED_WHILE_PROCESS_ALIVE');self.assertEqual(len(self.received),1)
 def test_progressive_abandoned_read_and_backward_range_do_not_poison_new_request(self):
  self.progressive();client=self.paused_client();client.close()
  status,headers,body=self.fetch('cast.mp4',{'Range':'bytes=0-511'});self.assertEqual(status,206);self.assertEqual(body,self.payload[:512])
  self.assertEqual(self.line().strip(),'BRIDGE:request:get_range');self.assertEqual(self.line().strip(),'BRIDGE:served:1')
 def test_progressive_hard_lease_still_closes_backpressured_client(self):
  self.progressive();client=self.paused_client()
  try:
   self.process.stdin.write('t');self.process.stdin.flush();self.assertEqual(self.line().strip(),'BRIDGE:stopped')
   with socket.socket() as check:self.assertNotEqual(check.connect_ex(('127.0.0.1',self.port)),0)
  finally:client.close()
 def test_progressive_error_and_stop_snapshots_are_coarse_bounded_and_preserve_budget_reason(self):
  import re
  self.progressive();self.process.stdin.write('b');self.process.stdin.flush();self.assertEqual(self.line().strip(),'FIXTURE:budget')
  with self.assertRaises(urllib.error.HTTPError):self.fetch('cast.mp4',{'Range':'bytes=0-511'})
  self.process.stdin.write('s');self.process.stdin.flush()
  for _ in range(8):
   if self.line().strip()=='BRIDGE:stopped':break
  self.assertIn('BRIDGE:limit:bytes',self.observations)
  flow=[line for line in self.observations if line.startswith('BRIDGE:flow:')];self.assertEqual(len(flow),2)
  for line in flow:
   self.assertRegex(line,r'^BRIDGE:flow:[es]:[0-4]:[0-4]:[0-9]{1,3}:128:[0-6]$');self.assertNotIn(TOKEN,line)
 def test_progressive_lease_snapshot_distinguishes_expiry_from_user_stop(self):
  self.progressive();self.process.stdin.write('t');self.process.stdin.flush();self.assertEqual(self.line().strip(),'BRIDGE:stopped')
  self.assertIn('BRIDGE:limit:lease',self.observations);self.assertTrue(any(line.endswith(':0') and line.startswith('BRIDGE:flow:s:') for line in self.observations))
 def test_progressive_expiry_closes_listener_before_process_exit(self):
  self.progressive();self.process.stdin.write('t');self.process.stdin.flush();self.assertEqual(self.line().strip(),'BRIDGE:stopped')
  with socket.socket() as s:self.assertNotEqual(s.connect_ex(('127.0.0.1',self.port)),0)
 def test_manifest_is_loopback_only_and_head_has_no_body(self):
  import xml.etree.ElementTree as ET
  status,headers,body=self.fetch();self.assertEqual(status,200);xml=ET.fromstring(body)
  urls=[e.text for e in xml.findall('.//{urn:mpeg:dash:schema:mpd:2011}BaseURL')]
  self.assertEqual(urls,[f'http://127.0.0.1:{self.port}/{TOKEN}/video.mp4',f'http://127.0.0.1:{self.port}/{TOKEN}/audio.mp4'])
  self.assertNotIn(b'bilivideo',body);self.assertNotIn(b'deadline',body);self.assertEqual(self.fetch(method='HEAD')[2],b'');self.assertEqual(self.received,[])
 def test_probe_lease_allows_short_video_completion_but_never_outlives_either_signature_or_fifteen_minutes(self):
  r=subprocess.run([str(self.exe),'lease'],capture_output=True,timeout=5);self.assertEqual(r.returncode,0);self.assertEqual(r.stdout,b'')
 def test_exact_range_and_no_upstream_cookie_header_forwarding(self):
  status,headers,body=self.fetch('video.mp4',{'Range':'bytes=100-611'});self.assertEqual(status,206);self.assertEqual(body,self.payload[100:612]);self.assertEqual(headers['Content-Range'],f'bytes 100-611/{len(self.payload)}');self.assertIsNone(headers['Set-Cookie']);self.assertEqual(self.line().strip(),'BRIDGE:served:1')
  self.assertNotIn('Cookie',self.received[-1]);self.assertEqual(self.received[-1]['Referer'],'https://www.bilibili.com/video/BV0000000001')
 def test_open_range_is_bounded_and_backpressure_preserves_every_byte(self):
  status,headers,body=self.fetch('audio.mp4',{'Range':'bytes=0-'});self.assertEqual(status,206);self.assertEqual(body,self.payload[:2097152]);self.assertEqual(headers['Content-Length'],'2097152')
 def test_unknown_token_path_methods_and_multi_ranges_never_reach_upstream(self):
  for path,method,range_value in [('video.mp4','GET',None),('unknown.mp4','GET',None),('video.mp4','POST',None),('video.mp4','GET','bytes=0-1,4-5'),('video.mp4','GET','bytes=-512'),('video.mp4?url=outside','GET',None)]:
   with self.assertRaises(urllib.error.HTTPError):self.fetch(path,{'Range':range_value} if range_value else {},method)
  with socket.create_connection(('127.0.0.1',self.port),timeout=2) as client:
   client.sendall(b'GET /wrong/manifest.mpd HTTP/1.1\r\n\r\n');self.assertIn(b'404',client.recv(512))
  self.assertEqual(self.received,[])
 def test_upstream_ignored_range_never_becomes_success(self):
  type(self).bad=True
  with self.assertRaises(urllib.error.HTTPError) as error:self.fetch('video.mp4',{'Range':'bytes=0-511'})
  self.assertEqual(error.exception.code,502);self.assertEqual(self.line().strip(),'BRIDGE:issue:200:23')
 def test_upstream_wrong_length_or_encoding_is_not_forwarded_as_media(self):
  for mode in ['length','encoding']:
   type(self).bad=mode
   with self.assertRaises(urllib.error.HTTPError) as error:self.fetch('video.mp4',{'Range':'bytes=0-511'})
   self.assertEqual(error.exception.code,502)
 def test_stop_closes_listener_while_process_alive_with_partial_client(self):
  client=socket.create_connection(('127.0.0.1',self.port),timeout=2);client.sendall(b'GET /')
  self.process.stdin.write('s');self.process.stdin.flush();self.assertEqual(self.line().strip(),'BRIDGE:stopped');self.assertEqual(self.line().strip(),'CLOSED_WHILE_PROCESS_ALIVE');self.assertIsNone(self.process.poll())
  with self.assertRaises(OSError):socket.create_connection(('127.0.0.1',self.port),timeout=.2)
  self.assertEqual(client.recv(512),b'');client.close()
 def test_uncertain_close_never_emits_a_successful_stop_ack(self):
  self.process.stdin.write('e');self.process.stdin.flush();self.assertEqual(self.line().strip(),'BRIDGE:failed:17');self.assertEqual(self.line().strip(),'CLOSED_WHILE_PROCESS_ALIVE');self.process.communicate(timeout=3);self.assertEqual(self.process.returncode,4)
if __name__=='__main__' :unittest.main()
