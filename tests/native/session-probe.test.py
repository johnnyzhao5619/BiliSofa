"""Real HOST loopback/cURL exchanges. Synthetic data only; no TV/TLS/account proof."""
from pathlib import Path
import subprocess,tempfile,unittest,socket
ROOT=Path(__file__).resolve().parents[2]
class SessionWireTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory();folder=Path(cls.tmp.name);source=folder/'session.c';cls.exe=folder/'session'
  with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
  source.write_text(r'''#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <stdint.h>
#include <errno.h>
#include <unistd.h>
#include <fcntl.h>
#include <poll.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <curl/curl.h>
#define BILISOFA_GUEST_EXPORT
#include "probe-http.h"
#include "probe-session.h"
static size_t missing_header(char *data,size_t size,size_t count,void *ctx){size_t n=session_header(data,size,count,ctx);session_header_seen=0;return n;}
static int clean(void){return !session_live && session_fd<0 && session_client<0 && !session_multi && !session_jars[0] && !session_jars[1] && !session_global && !session_added && !*session_token && !*session_url && !*session_request && !*session_response;}
int main(int argc,char **argv){
 (void)http_probe;if(argc!=2)return 1;const char *mode=argv[1];
 if(!strcmp(mode,"bounds")){
  char data[8193]={0};if(session_header(data,1,8193,NULL) || session_body(data,1,129,NULL))return 2;
  if(session_header(data,1,8192,NULL)!=8192 || session_header(data,1,1,NULL))return 3;
  session_header_bytes=0;if(session_body(data,1,128,NULL)!=128 || session_body(data,1,1,NULL))return 4;
  puts("BOUNDS_OK");return 0;
 }
 if(!strcmp(mode,"invalid")){int r=session_begin("../not-a-token");return r==16 && clean()?0:5;}
 if(session_begin("0123456789abcdef0123456789abcdef"))return 6;
 if(!strcmp(mode,"cancel")){session_probe_stop();return clean()?0:7;}
 if(!strcmp(mode,"busy")){if(session_begin("0123456789abcdef0123456789abcdef")!=17)return 8;session_probe_stop();return clean()?0:9;}
 if(!strcmp(mode,"close-error")){close(session_fd);session_probe_stop();return session_bad && clean()?0:10;}
 if(!strcmp(mode,"timeout"))session_until=http_now()-1;
 if(!strcmp(mode,"foreign-cookie"))curl_easy_setopt(session_jars[1],CURLOPT_COOKIELIST,"Set-Cookie: bilisofa_probe=WRONG; domain=127.0.0.1; path=/");
 if(!strcmp(mode,"follow"))curl_easy_setopt(session_jars[0],CURLOPT_FOLLOWLOCATION,1L);
 if(!strcmp(mode,"header"))curl_easy_setopt(session_jars[0],CURLOPT_HEADERFUNCTION,missing_header);
 if(!strcmp(mode,"oversized") || !strcmp(mode,"cancel-active")){
  int fd=socket(AF_INET,SOCK_STREAM,0);struct sockaddr_in a={0};a.sin_family=AF_INET;a.sin_addr.s_addr=htonl(INADDR_LOOPBACK);a.sin_port=htons(BILISOFA_SESSION_PORT);
  if(connect(fd,(struct sockaddr *)&a,sizeof(a)))return 11;
  if(!strcmp(mode,"cancel-active")){
   if(send(fd,"GET /",5,0)!=5)return 16;
   for(int i=0;session_live && session_used<5 && i<100;i++){session_tick();usleep(1000);}
   if(!session_live || session_client<0 || session_used!=5 || !session_added)return 17;
   session_probe_stop();char b[8];if(recv(fd,b,sizeof(b),0)!=0)return 18;close(fd);
   int check=socket(AF_INET,SOCK_STREAM,0);int connected=connect(check,(struct sockaddr *)&a,sizeof(a));close(check);
   return clean() && connected<0?0:19;
  }
  char bytes[2048];memset(bytes,'x',sizeof(bytes));if(send(fd,bytes,sizeof(bytes),0)!=sizeof(bytes))return 12;
  for(int i=0;session_live && i<100;i++){session_tick();usleep(1000);}close(fd);return clean()?0:13;
 }
 for(int i=0;session_live && i<10000;i++){session_tick();usleep(1000);}
 if(session_live){session_probe_stop();return 14;}
 return clean()?0:15;
}
''')
  p=subprocess.run(['clang','-std=c11','-D_DARWIN_C_SOURCE','-D_DEFAULT_SOURCE','-Wall','-Wextra','-Werror','-Wno-deprecated-declarations',f'-DBILISOFA_SESSION_PORT={port}','-I',str(ROOT/'platform/wasm-network/src'),str(source),'-lcurl','-o',str(cls.exe)],capture_output=True)
  if p.returncode:raise RuntimeError(p.stderr.decode())
 @classmethod
 def tearDownClass(cls):cls.tmp.cleanup()
 def run_mode(self,mode,expected):
  p=subprocess.run([str(self.exe),mode],capture_output=True,timeout=12);self.assertEqual(p.returncode,0,p.stderr.decode());s=p.stdout.decode();self.assertIn(expected,s);self.assertNotIn('0123456789abcdef',s);self.assertNotIn('Cookie:',s);self.assertNotIn('127.0.0.1',s);return s
 def test_nine_real_http_exchanges_prove_two_cookie_jars_headers_clear_and_no_redirect(self):
  s=self.run_mode('good','SESSION:pass');self.assertEqual(s.splitlines(),['SESSION:ready','SESSION:headers','SESSION:isolation','SESSION:redirect','SESSION:clear','SESSION:pass'])
 def test_invalid_token_opens_no_listener(self):self.run_mode('invalid','SESSION:failed:16')
 def test_callback_header_and_body_bounds(self):self.run_mode('bounds','BOUNDS_OK')
 def test_explicit_stop_cleans_all_handles_and_wipes_owned_data(self):self.run_mode('cancel','SESSION:cancelled')
 def test_stop_with_active_multi_and_partial_client_closes_listener_before_process_exit(self):self.run_mode('cancel-active','SESSION:cancelled')
 def test_second_begin_cannot_overlap_owned_listener(self):self.run_mode('busy','SESSION:cancelled')
 def test_cookie_leakage_into_other_jar_fails_wire_verification(self):self.assertNotIn('SESSION:pass',self.run_mode('foreign-cookie','SESSION:failed:18'))
 def test_accidental_redirect_following_is_detected_not_tolerated(self):self.assertNotIn('SESSION:pass',self.run_mode('follow','SESSION:failed:18'))
 def test_missing_readable_response_header_fails(self):self.assertNotIn('SESSION:pass',self.run_mode('header','SESSION:failed:19'))
 def test_deadline_closes_before_any_success(self):self.assertNotIn('SESSION:pass',self.run_mode('timeout','SESSION:failed:20'))
 def test_oversized_incoming_request_closes_bounded_listener(self):self.assertNotIn('SESSION:pass',self.run_mode('oversized','SESSION:failed:18'))
 def test_uncertain_close_never_emits_success_or_cancel_ack(self):
  s=self.run_mode('close-error','SESSION:failed:17');self.assertNotIn('SESSION:pass',s);self.assertNotIn('SESSION:cancelled',s)
if __name__=='__main__':unittest.main()
