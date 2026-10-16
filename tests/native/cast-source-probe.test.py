"""Native policy, bounded callbacks and multi-handle ownership. Mock cURL; no network."""
from pathlib import Path
import subprocess,tempfile,unittest,socket
ROOT=Path(__file__).resolve().parents[2]
class CastSourceTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory();folder=Path(cls.tmp.name);src=folder/'source.c';cls.exe=folder/'source'
  with socket.socket() as reserve:reserve.bind(('127.0.0.1',0));port=reserve.getsockname()[1]
  src.write_text(r'''#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <stdint.h>
#include <stdarg.h>
#include <errno.h>
#include <unistd.h>
#include <fcntl.h>
#include <poll.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <curl/curl.h>
static int multi_stub,easy_stub,global_live,easy_live,multi_live,added,done=1,failed_setopt=0,failed_remove=0;
static int peer=-1,host=-1,follow=-1,protocol=-1,redir=-1,timeout=-1,connect_budget=-1,proxy=-1,ca=-1,ranged=-1,result_code=0;
static long http_status=206;
static CURLcode mock_global(long flags){(void)flags;global_live=1;return CURLE_OK;}
static void mock_global_cleanup(void){global_live=0;}
static CURL *mock_easy(void){easy_live=1;return (CURL *)&easy_stub;}
static CURLM *mock_multi(void){multi_live=1;return (CURLM *)&multi_stub;}
static void mock_easy_cleanup(CURL *c){(void)c;easy_live=0;}
static CURLMcode mock_multi_cleanup(CURLM *m){(void)m;multi_live=0;return CURLM_OK;}
static CURLMcode mock_add(CURLM *m,CURL *c){(void)m;(void)c;added=1;return CURLM_OK;}
static CURLMcode mock_remove(CURLM *m,CURL *c){(void)m;(void)c;added=0;return failed_remove?CURLM_BAD_HANDLE:CURLM_OK;}
static CURLMcode mock_perform(CURLM *m,int *running){(void)m;*running=0;return CURLM_OK;}
static CURLMsg *mock_info(CURLM *m,int *queued){(void)m;*queued=0;static CURLMsg msg;if(!done)return NULL;done=0;msg.msg=CURLMSG_DONE;msg.easy_handle=(CURL *)&easy_stub;msg.data.result=(CURLcode)result_code;return &msg;}
static CURLcode mock_getinfo(CURL *c,CURLINFO info,...){(void)c;(void)info;va_list ap;va_start(ap,info);*va_arg(ap,long *)=http_status;va_end(ap);return CURLE_OK;}
static CURLcode mock_setopt(CURL *c,CURLoption option,...){
 (void)c;va_list ap;va_start(ap,option);
 if(failed_setopt && option==CURLOPT_SSL_VERIFYPEER){va_end(ap);return CURLE_UNKNOWN_OPTION;}
 if(option<10000){long value=va_arg(ap,long);if(option==CURLOPT_SSL_VERIFYPEER)peer=(int)value;if(option==CURLOPT_SSL_VERIFYHOST)host=(int)value;if(option==CURLOPT_FOLLOWLOCATION)follow=(int)value;if(option==CURLOPT_PROTOCOLS)protocol=(int)value;if(option==CURLOPT_REDIR_PROTOCOLS)redir=(int)value;if(option==CURLOPT_TIMEOUT_MS)timeout=(int)value;if(option==CURLOPT_CONNECTTIMEOUT_MS)connect_budget=(int)value;}
 else if(option==CURLOPT_WRITEFUNCTION || option==CURLOPT_HEADERFUNCTION){(void)va_arg(ap,size_t (*)(char *,size_t,size_t,void *));}
 else if(option==CURLOPT_MAXFILESIZE_LARGE){if(va_arg(ap,curl_off_t)!=512)abort();}
 else {const char *value=va_arg(ap,const char *);if(option==CURLOPT_PROXY)proxy=value && !*value;if(option==CURLOPT_CAINFO)ca=value && !strcmp(value,"/cacert.pem");if(option==CURLOPT_RANGE)ranged=value && !strcmp(value,"0-511");}
 va_end(ap);return CURLE_OK;
}
#define curl_global_init mock_global
#define curl_global_cleanup mock_global_cleanup
#define curl_easy_init mock_easy
#define curl_easy_cleanup mock_easy_cleanup
#undef curl_easy_setopt
#define curl_easy_setopt mock_setopt
#undef curl_easy_getinfo
#define curl_easy_getinfo mock_getinfo
#define curl_multi_init mock_multi
#define curl_multi_cleanup mock_multi_cleanup
#define curl_multi_add_handle mock_add
#define curl_multi_remove_handle mock_remove
#define curl_multi_perform mock_perform
#define curl_multi_info_read mock_info
#include "probe-http.h"
#include "probe-guest.h"
#include "probe-bridge.h"
#include "probe-cast.h"
static int begin(void){char url[240];snprintf(url,sizeof(url),"https://fixture.bilivideo.com/upgcxcode/fixture.mp4?deadline=%llu",(unsigned long long)time(NULL)+300);strcpy((char *)cast_source_buffer(),url);return cast_source_begin((unsigned int)strlen(url));}
static int clean(void){return !global_live && !multi_live && !easy_live && !added && !cast_source_multi && !cast_source_easy && !*cast_source_input && !cast_source_size;}
int main(int argc,char **argv){
 (void)bridge_begin;(void)http_probe;(void)guest_popular;(void)guest_video;(void)cast_begin;(void)cast_tick;(void)cast_multicast_begin;
 if(argc!=2)return 1;cast_started=cast_rpc_enabled=1;
 if(!strcmp(argv[1],"policy")){
  char good[256];snprintf(good,sizeof(good),"https://fixture.bilivideo.com/upgcxcode/a.mp4?deadline=%llu",(unsigned long long)time(NULL)+300);if(!cast_source_valid(good))return 2;
  const char *bad[]={"http://fixture.bilivideo.com/upgcxcode/a.mp4?deadline=1800000000","https://127.0.0.1/upgcxcode/a.mp4?deadline=1800000000","https://fixture.bilivideo.com.evil.invalid/upgcxcode/a.mp4?deadline=1800000000","https://user@fixture.bilivideo.com/upgcxcode/a.mp4?deadline=1800000000","https://fixture.bilivideo.com:443/upgcxcode/a.mp4?deadline=1800000000","https://fixture..bilivideo.com/upgcxcode/a.mp4?deadline=1800000000","https://fixture.bilivideo.com/outside/a.mp4?deadline=1800000000","https://fixture.bilivideo.com/upgcxcode/a.m4s?deadline=1800000000"};
  for(size_t i=0;i<sizeof(bad)/sizeof(bad[0]);i++)if(cast_source_valid(bad[i]))return 3;
  strcpy(cast_source_input,"http://outside.invalid/");if(cast_source_begin(23)!=-1 || !clean())return 4;return 0;
 }
 if(!strcmp(argv[1],"bounds")){
  char b[513]={0};if(cast_source_body(b,1,513,NULL)!=0 || cast_source_body(b,1,511,NULL)!=511 || cast_source_body(b,1,2,NULL)!=0)return 5;
  cast_source_stop();char range[]="Content-Range: bytes 0-511/12345\r\n";if(cast_source_header(range,1,strlen(range),NULL)!=strlen(range) || cast_source_header(range,1,strlen(range),NULL)!=0)return 6;
  cast_source_stop();char bad[]="Content-Range: bytes 1-512/12345\r\n";if(cast_source_header(bad,1,strlen(bad),NULL)!=0)return 7;
  char encoding[]="Content-Encoding: gzip\r\n",length[]="Content-Length: 513\r\n";if(cast_source_header(encoding,1,strlen(encoding),NULL)!=0 || cast_source_header(length,1,strlen(length),NULL)!=0)return 8;
  cast_source_stop();char huge[]="Content-Range: bytes 0-511/18446744073709552128\r\n",wide[]="Content-Length: 4294967808\r\n";if(cast_source_header(huge,1,strlen(huge),NULL)!=0 || cast_source_header(wide,1,strlen(wide),NULL)!=0)return 16;
  cast_source_headers=16384;if(cast_source_header(b,1,1,NULL)!=0)return 9;cast_source_stop();return clean()?0:10;
 }
 if(!strcmp(argv[1],"no-approval")){if(cast_media_begin()!=0 || bridge_fd>=0 || *cast_source_retained)return 20;cast_stop();return 0;}
 if(!strcmp(argv[1],"setopt"))failed_setopt=1;
 int started=begin();
 if(failed_setopt)return started==-1 && clean() && !cast_unconfirmed?0:11;
 if(started!=1 || peer!=1 || host!=2 || follow!=0 || protocol!=CURLPROTO_HTTPS || redir!=CURLPROTO_HTTPS || timeout!=8000 || connect_budget!=4000 || proxy!=1 || ca!=1 || ranged!=1 || *cast_source_input)return 12;
 if(!strcmp(argv[1],"cancel") || !strcmp(argv[1],"cleanup")){failed_remove=!strcmp(argv[1],"cleanup");cast_stop();return clean() && cast_unconfirmed==failed_remove?0:13;}
 char body[512]={0};memcpy(body+4,"ftyp",4);cast_source_body(body,1,512,NULL);char range[]="Content-Range: bytes 0-511/12345\r\n";cast_source_header(range,1,strlen(range),NULL);
 if(!strcmp(argv[1],"media"))cast_source_bytes[4]='x';
 if(!strcmp(argv[1],"http"))http_status=403;
 if(!strcmp(argv[1],"tls"))result_code=60;
 cast_source_tick();if(!clean())return 14;
 if(!strcmp(argv[1],"approved") || !strcmp(argv[1],"expired") || !strcmp(argv[1],"declined")){
  if(!cast_source_ready || !*cast_source_retained || bridge_fd>=0 || bridge_multi || global_live)return 21;
  if(!strcmp(argv[1],"expired")){cast_source_expires=http_now()-1;cast_source_tick();if(cast_source_ready || *cast_source_retained || cast_media_begin()!=0 || bridge_fd>=0)return 22;return 0;}
  if(!strcmp(argv[1],"declined")){cast_stop();return !*cast_source_retained && !cast_source_ready && bridge_fd<0 && clean()?0:23;}
  strcpy(cast_token,"0123456789abcdef0123456789abcdef");
  if(cast_media_begin()!=1 || cast_source_ready || *cast_source_retained || bridge_fd<0 || bridge_progressive_total!=12345 || cast_source_verified_total || !bridge_progressive || !bridge_external_loop || !global_live || bridge_deadline>http_now()+180 || strncmp(bridge_urls[0],"https://fixture.bilivideo.com/upgcxcode/",37))return 24;
  if(cast_media_begin()!=0 || bridge_fd<0)return 25;
  cast_stop();return bridge_fd<0 && !bridge_multi && !*bridge_urls[0] && clean()?0:26;
 }
 if(strcmp(argv[1],"good") && (*cast_source_retained || cast_source_ready))return 27;
 if(begin()!=0 || !clean())return 15;return 0;
}
''')
  compiled=subprocess.run(['clang','-std=c11','-D_DARWIN_C_SOURCE','-D_DEFAULT_SOURCE','-DBILISOFA_CAST_HOST_FIXTURE',f'-DBILISOFA_BRIDGE_PORT={port}','-Wall','-Wextra','-Werror','-Wno-deprecated-declarations','-I',str(ROOT/'platform/wasm-network/src'),str(src),'-lcurl','-o',str(cls.exe)],capture_output=True)
  if compiled.returncode:raise RuntimeError(compiled.stderr.decode())
 @classmethod
 def tearDownClass(cls):cls.tmp.cleanup()
 def check_mode(self,mode,expected):
  r=subprocess.run([str(self.exe),mode],capture_output=True,timeout=5);self.assertEqual(r.returncode,0,r.stderr.decode());self.assertIn(expected,r.stdout.decode());self.assertNotIn('https://',r.stdout.decode());self.assertNotIn('fixture',r.stdout.decode());return r.stdout.decode()
 def test_destination_and_invalid_native_input_never_start_network(self):self.check_mode('policy','CAST:source:invalid_request')
 def test_range_body_header_encoding_and_length_bounds(self):self.check_mode('bounds','')
 def test_https_options_range_proof_cleanup_and_one_attempt(self):self.check_mode('good','CAST:source:pass')
 def test_unapproved_or_missing_candidate_cannot_open_loopback(self):self.check_mode('no-approval','CAST:media:unavailable')
 def test_verified_candidate_requires_explicit_action_then_moves_privately_to_bounded_bridge(self):self.check_mode('approved','BRIDGE:ready')
 def test_candidate_expires_and_is_wiped_without_opening_bridge(self):self.check_mode('expired','CAST:media:expired')
 def test_back_without_approval_wipes_verified_candidate(self):self.check_mode('declined','CAST:closed:')
 def test_bad_media_never_passes(self):self.check_mode('media','CAST:source:invalid_media')
 def test_http_rejection_never_passes(self):self.check_mode('http','CAST:source:failed:403:0')
 def test_tls_failure_never_falls_back(self):self.check_mode('tls','CAST:source:failed:206:60')
 def test_unsupported_tls_option_fails_closed(self):self.check_mode('setopt','CAST:source:failed:0:2')
 def test_cancel_closes_native_handles_before_ack(self):self.assertNotIn('source:pass',self.check_mode('cancel','CAST:closed:'))
 def test_unknown_cleanup_prevents_successful_ack(self):self.assertNotIn('CAST:closed:',self.check_mode('cleanup','CAST:failed:17'))
if __name__=='__main__':unittest.main()
