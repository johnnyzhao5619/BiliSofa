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
static int multi_stub,easy_stub,global_live,easy_live,multi_live,added,done=1,failed_setopt=0,failed_remove=0,failed_cleanup=0;
static int peer=-1,host=-1,follow=-1,protocol=-1,redir=-1,timeout=-1,connect_budget=-1,proxy=-1,ca=-1,ranged=-1,result_code=0;
static long http_status=206;
static CURLcode mock_global(long flags){(void)flags;global_live=1;return CURLE_OK;}
static void mock_global_cleanup(void){global_live=0;}
static CURL *mock_easy(void){easy_live=1;return (CURL *)&easy_stub;}
static CURLM *mock_multi(void){multi_live=1;return (CURLM *)&multi_stub;}
static void mock_easy_cleanup(CURL *c){(void)c;easy_live=0;}
static CURLMcode mock_multi_cleanup(CURLM *m){(void)m;multi_live=0;return failed_cleanup?CURLM_BAD_HANDLE:CURLM_OK;}
static CURLMcode mock_add(CURLM *m,CURL *c){(void)m;(void)c;added=1;return CURLM_OK;}
static CURLMcode mock_remove(CURLM *m,CURL *c){(void)m;(void)c;added=0;return failed_remove?CURLM_BAD_HANDLE:CURLM_OK;}
static int pump_case,pump_calls;static void pump_update(void);
static CURLMcode mock_perform(CURLM *m,int *running){(void)m;if(pump_case){pump_calls++;pump_update();*running=1;}else *running=0;return CURLM_OK;}
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
#define http_now real_http_now
#include "probe-http.h"
#undef http_now
static double clock_offset=0;
static double http_now(void){return real_http_now()+clock_offset;}
#include "probe-guest.h"
#include "probe-bridge.h"
#include "probe-cast.h"
static void pump_update(void){if(pump_case!=2)bridge_stream_bytes+=16384;if(pump_case==3)clock_offset+=.004;if(pump_case==4)bridge_forwarded+=1048576;}
static unsigned int source_lifetime=3600;
static const char *source_host="fixture.bilivideo.com";
static int begin(void){char url[240];snprintf(url,sizeof(url),"https://%s/upgcxcode/fixture.mp4?deadline=%llu",source_host,(unsigned long long)time(NULL)+source_lifetime);strcpy((char *)cast_source_buffer(),url);return cast_source_begin((unsigned int)strlen(url));}
static int clean(void){return !global_live && !multi_live && !easy_live && !added && !cast_source_multi && !cast_source_easy && !*cast_source_input && !cast_source_size;}
int main(int argc,char **argv){
 (void)bridge_begin;(void)http_probe;(void)guest_popular;(void)guest_video;(void)cast_begin;(void)cast_tick;(void)cast_multicast_begin;
 if(argc!=2)return 1;cast_started=cast_rpc_enabled=1;
 int transition=!strncmp(argv[1],"transition-",11);if(transition){cast_transition_enabled=1;strcpy(cast_media_token,"0123456789abcdef0123456789abcdef");}
 if(!strncmp(argv[1],"pump-",5)){
  pump_case=atoi(argv[1]+5);if(pump_case<1 || pump_case>5)return 60;
  bridge_progressive=pump_case!=5;bridge_progressive_total=1048576;
  if(bridge_listen())return 61;bridge_deadline=http_now()+60;done=0;bridge_tick();
  int expected=pump_case==1?8:pump_case==3?3:1;
  if(pump_calls!=expected)return 62;
  if(bridge_burst_noted!=(pump_case==1 || pump_case==3))return 63;
  bridge_stop();if(bridge_fd>=0 || bridge_multi || global_live || multi_live)return 64;
  puts("PUMP_BOUNDED_OK");return 0;
 }
 if(!strcmp(argv[1],"init-size")){
  unsigned char b[512]={0};b[3]=32;memcpy(b+4,"ftyp",4);unsigned int n=43183732;
  for(int i=0;i<4;i++)b[32+i]=(unsigned char)(n>>(24-i*8));memcpy(b+36,"moov",4);
  if(cast_source_moov_mib(b,512,1487053789ULL)!=42)return 50;
  if(cast_source_moov_mib(b,39,1487053789ULL) || cast_source_moov_mib(b,512,1024))return 51;
  b[32]=8;b[33]=0;b[34]=0;b[35]=0;if(cast_source_moov_mib(b,512,1487053789ULL)!=128)return 52;
  b[35]=1;if(cast_source_moov_mib(b,512,1487053789ULL)!=129)return 53;
  memcpy(b+36,"mdat",4);if(cast_source_moov_mib(b,512,1487053789ULL))return 54;
  b[32]=b[33]=b[34]=0;b[35]=1;memcpy(b+36,"moov",4);memset(b+40,0,8);b[44]=2;b[45]=147;b[46]=240;b[47]=116;
  if(cast_source_moov_mib(b,512,1487053789ULL)!=42)return 55;
  puts("INIT_SIZE_OK");return 0;
 }
 if(!strcmp(argv[1],"layout")){
  unsigned char b[512]={0};b[3]=24;memcpy(b+4,"ftyp",4);b[26]=16;memcpy(b+28,"mdat",4);
  if(strcmp(cast_source_layout(b,512,8192),"mdat_first"))return 30;
  memcpy(b+28,"moov",4);if(strcmp(cast_source_layout(b,512,8192),"moov_first"))return 31;
  memcpy(b+28,"moof",4);if(strcmp(cast_source_layout(b,512,8192),"fragmented"))return 32;
  memcpy(b+28,"free",4);if(strcmp(cast_source_layout(b,512,8192),"prefix_exhausted"))return 33;
  b[26]=0;b[27]=1;b[38]=16;memcpy(b+28,"mdat",4);if(strcmp(cast_source_layout(b,512,8192),"mdat_first"))return 34;
  memset(b+32,255,8);if(strcmp(cast_source_layout(b,512,8192),"invalid"))return 35;
  if(strcmp(cast_source_layout(b,31,8192),"prefix_exhausted"))return 36;
  b[27]=7;if(strcmp(cast_source_layout(b,512,8192),"invalid"))return 37;
  puts("LAYOUT_OK");return 0;
 }
 if(!strcmp(argv[1],"policy")){
  char good[256];snprintf(good,sizeof(good),"https://fixture.bilivideo.com/upgcxcode/a.mp4?deadline=%llu",(unsigned long long)time(NULL)+300);if(!cast_source_valid(good))return 2;
  snprintf(good,sizeof(good),"https://upos-hz-mirrorakam.akamaized.net/upgcxcode/a.mp4?deadline=%llu",(unsigned long long)time(NULL)+300);if(!cast_source_valid(good))return 76;
  const char *hosts[]={"akamaized.net","other.akamaized.net","x.upos-hz-mirrorakam.akamaized.net","upos-hz-mirrorakam.akamaized.net.evil.invalid","upos-hz-mirrorakam.akamaized.net.","user@upos-hz-mirrorakam.akamaized.net","upos-hz-mirrorakam.akamaized.net:443"};
  for(size_t i=0;i<sizeof(hosts)/sizeof(hosts[0]);i++){snprintf(good,sizeof(good),"https://%s/upgcxcode/a.mp4?deadline=%llu",hosts[i],(unsigned long long)time(NULL)+300);if(cast_source_valid(good))return 77;}
  const char *paths[]={"outside/a.mp4","upgcxcode/a.m4s","upgcxcode/a.m3u8"};
  for(size_t i=0;i<sizeof(paths)/sizeof(paths[0]);i++){snprintf(good,sizeof(good),"https://upos-hz-mirrorakam.akamaized.net/%s?deadline=%llu",paths[i],(unsigned long long)time(NULL)+300);if(cast_source_valid(good))return 78;}
  snprintf(good,sizeof(good),"https://upos-hz-mirrorakam.akamaized.net/upgcxcode/a.mp4?deadline=%llu",(unsigned long long)time(NULL)+30);if(cast_source_valid(good))return 79;
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
 if(!strcmp(argv[1],"signed-lease"))source_lifetime=90;
 if(!strcmp(argv[1],"akam"))source_host="upos-hz-mirrorakam.akamaized.net";
 int started=begin();
 if(failed_setopt)return started==-1 && clean() && !cast_unconfirmed?0:11;
 if(started!=1 || peer!=1 || host!=2 || follow!=0 || protocol!=CURLPROTO_HTTPS || redir!=CURLPROTO_HTTPS || timeout!=8000 || connect_budget!=4000 || proxy!=1 || ca!=1 || ranged!=1 || *cast_source_input)return 12;
 if(!strcmp(argv[1],"cancel") || !strcmp(argv[1],"cleanup")){failed_remove=!strcmp(argv[1],"cleanup");cast_stop();return clean() && cast_unconfirmed==failed_remove?0:13;}
 char body[512]={0};memcpy(body+4,"ftyp",4);cast_source_body(body,1,512,NULL);char range[]="Content-Range: bytes 0-511/12345\r\n";cast_source_header(range,1,strlen(range),NULL);
 if(!strcmp(argv[1],"media"))cast_source_bytes[4]='x';
 if(!strcmp(argv[1],"http"))http_status=403;
 if(!strcmp(argv[1],"tls"))result_code=60;
 cast_source_tick();if(!clean())return 14;
 if(transition || !strcmp(argv[1],"approved") || !strcmp(argv[1],"expired") || !strcmp(argv[1],"declined") || !strcmp(argv[1],"lease") || !strcmp(argv[1],"signed-lease")){
  if(!cast_source_ready || !*cast_source_retained || bridge_fd>=0 || bridge_multi || global_live)return 21;
  if(!strcmp(argv[1],"expired")){cast_source_expires=http_now()-1;cast_source_tick();if(cast_source_ready || *cast_source_retained || cast_media_begin()!=0 || bridge_fd>=0)return 22;return 0;}
  if(!strcmp(argv[1],"declined")){cast_stop();return !*cast_source_retained && !cast_source_ready && bridge_fd<0 && clean()?0:23;}
  strcpy(cast_token,"0123456789abcdef0123456789abcdef");
  if(cast_media_begin()!=1 || cast_source_ready || *cast_source_retained || bridge_fd<0 || bridge_progressive_total!=12345 || cast_source_verified_total || !bridge_progressive || !bridge_external_loop || !global_live || bridge_deadline>http_now()+300 || strncmp(bridge_urls[0],"https://fixture.bilivideo.com/upgcxcode/",37))return 24;
  if(transition){
   double original_until=bridge_deadline;char url[240];snprintf(url,sizeof(url),"https://%s/upgcxcode/next.mp4?deadline=%llu",!strcmp(argv[1],"transition-akam")?"upos-hz-mirrorakam.akamaized.net":"fixture.bilivideo.com",(unsigned long long)time(NULL)+3600);
   strcpy(cast_source_input,url);strcpy(cast_transition_token,"abcdef0123456789abcdef0123456789");
   bridge_stream_bytes=1234;bridge_windows=7;bridge_connections=6;bridge_retry_count=2;
   if(!strcmp(argv[1],"transition-expired"))cast_session_until=http_now()+5;
   if(!strcmp(argv[1],"transition-budget"))bridge_stream_bytes=BRIDGE_STREAM_BUDGET;
   if(!strcmp(argv[1],"transition-stale")){if(cast_transition_begin((unsigned int)strlen(url),3)!=0 || bridge_fd<0)return 70;cast_stop();return 0;}
   if(!strcmp(argv[1],"transition-closed-unknown"))failed_cleanup=1;
   int changed=cast_transition_begin((unsigned int)strlen(url),2);
   if(!strcmp(argv[1],"transition-expired") || !strcmp(argv[1],"transition-budget")){if(changed!=0 || bridge_fd<0)return 71;cast_stop();return 0;}
   if(!strcmp(argv[1],"transition-closed-unknown")){if(changed!=-1 || !cast_unconfirmed || cast_source_easy || cast_source_multi)return 72;cast_stop();return 0;}
   if(changed!=1 || bridge_fd>=0 || bridge_multi || cast_media_generation!=2 || !cast_source_multi)return 73;
   done=1;cast_source_body(body,1,512,NULL);cast_source_header(range,1,strlen(range),NULL);cast_source_tick();
   if(!cast_source_ready || cast_media_begin()!=1 || bridge_fd<0 || bridge_deadline>original_until+.001 || bridge_stream_bytes!=1234 || bridge_windows!=7 || bridge_connections!=6 || bridge_retry_count!=2)return 74;
   struct bridge_client old;memset(&old,0,sizeof(old));old.fd=-1;snprintf(old.request,sizeof(old.request),"GET /0123456789abcdef0123456789abcdef/cast.mp4 HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n");bridge_request(&old);if(!strstr(old.header,"HTTP/1.1 404"))return 75;
   cast_stop();puts("TRANSITION_OK");return 0;
  }
  if(!strcmp(argv[1],"lease") || !strcmp(argv[1],"signed-lease")){
   int short_lease=!strcmp(argv[1],"signed-lease");double left=bridge_deadline-http_now();
   if(short_lease?(left<83 || left>85):(left<299 || left>300))return 40;
   clock_offset=short_lease?80:181;bridge_tick();if(bridge_fd<0 || !global_live)return 41;
   clock_offset=short_lease?86:301;bridge_tick();
   if(bridge_fd>=0 || bridge_multi || *bridge_urls[0] || global_live || !bridge_limit_seen)return 42;
   cast_stop();return clean()?0:43;
  }
  if(cast_media_begin()!=0 || bridge_fd<0)return 25;
  cast_stop();return bridge_fd<0 && !bridge_multi && !*bridge_urls[0] && clean()?0:26;
 }
 if(strcmp(argv[1],"good") && strcmp(argv[1],"akam") && (*cast_source_retained || cast_source_ready))return 27;
 if(begin()!=0 || !clean())return 15;return 0;
}
''')
  compiled=subprocess.run(['clang','-std=c11','-D_DARWIN_C_SOURCE','-D_DEFAULT_SOURCE','-DBILISOFA_CAST_HOST_FIXTURE',f'-DBILISOFA_BRIDGE_PORT={port}','-Wall','-Wextra','-Werror','-Wno-deprecated-declarations','-I',str(ROOT/'platform/wasm-network/src'),str(src),'-lcurl','-o',str(cls.exe)],capture_output=True)
  if compiled.returncode:raise RuntimeError(compiled.stderr.decode())
 @classmethod
 def tearDownClass(cls):cls.tmp.cleanup()
 def check_mode(self,mode,expected):
  r=subprocess.run([str(self.exe),mode],capture_output=True,timeout=5);self.assertEqual(r.returncode,0,r.stderr.decode());self.assertIn(expected,r.stdout.decode());self.assertNotIn('https://',r.stdout.decode());self.assertNotIn('fixture',r.stdout.decode());return r.stdout.decode()
 def test_bounded_mp4_atom_prefix_layout_sizes_order_and_overflow(self):self.check_mode('layout','LAYOUT_OK')
 def test_destination_and_invalid_native_input_never_start_network(self):self.check_mode('policy','CAST:source:invalid_request')
 def test_range_body_header_encoding_and_length_bounds(self):self.check_mode('bounds','')
 def test_https_options_range_proof_cleanup_and_one_attempt(self):self.check_mode('good','CAST:source:pass')
 def test_exact_bili_akam_node_keeps_https_verification_range_and_one_attempt(self):self.check_mode('akam','CAST:source:pass')
 def test_bili_akam_transition_keeps_close_ack_old_token_rejection_budget_and_expiry(self):self.check_mode('transition-akam','TRANSITION_OK')
 def test_unapproved_or_missing_candidate_cannot_open_loopback(self):self.check_mode('no-approval','CAST:media:unavailable')
 def test_verified_candidate_requires_explicit_action_then_moves_privately_to_bounded_bridge(self):self.check_mode('approved','BRIDGE:ready')
 def test_media_survives_old_three_minute_boundary_then_closes_at_five_minute_lease(self):self.check_mode('lease','BRIDGE:limit:lease')
 def test_signed_destination_deadline_shortens_media_lease_and_still_cleans_up(self):self.check_mode('signed-lease','BRIDGE:limit:lease')
 def test_candidate_expires_and_is_wiped_without_opening_bridge(self):self.check_mode('expired','CAST:media:expired')
 def test_back_without_approval_wipes_verified_candidate(self):self.check_mode('declined','CAST:closed:')
 def test_bad_media_never_passes(self):self.check_mode('media','CAST:source:invalid_media')
 def test_http_rejection_never_passes(self):self.check_mode('http','CAST:source:failed:403:0')
 def test_tls_failure_never_falls_back(self):self.check_mode('tls','CAST:source:failed:206:60')
 def test_unsupported_tls_option_fails_closed(self):self.check_mode('setopt','CAST:source:failed:0:2')
 def test_cancel_closes_native_handles_before_ack(self):self.assertNotIn('source:pass',self.check_mode('cancel','CAST:closed:'))
 def test_unknown_cleanup_prevents_successful_ack(self):self.assertNotIn('CAST:closed:',self.check_mode('cleanup','CAST:failed:17'))
 def test_large_moov_prefix_size_is_bounded_without_loading_its_payload(self):self.check_mode('init-size','INIT_SIZE_OK')
 def test_progressing_pump_yields_after_eight_rounds(self):self.check_mode('pump-1','PUMP_BOUNDED_OK')
 def test_idle_pump_does_not_busy_spin(self):self.check_mode('pump-2','PUMP_BOUNDED_OK')
 def test_pump_yields_at_ten_millisecond_quantum(self):self.check_mode('pump-3','PUMP_BOUNDED_OK')
 def test_pump_yields_at_one_mib_forwarding_budget(self):self.check_mode('pump-4','PUMP_BOUNDED_OK')
 def test_legacy_dash_keeps_one_round(self):self.check_mode('pump-5','PUMP_BOUNDED_OK')
 def test_transition_closes_before_new_probe_preserves_budget_expiry_and_rejects_old_token(self):self.check_mode('transition-good','TRANSITION_OK')
 def test_transition_rejects_out_of_order_generation_without_closing_current(self):self.check_mode('transition-stale','CAST:closed:')
 def test_transition_never_renews_expired_session(self):self.check_mode('transition-expired','CAST:closed:')
 def test_transition_never_resets_exhausted_byte_budget(self):self.check_mode('transition-budget','CAST:closed:')
 def test_transition_unknown_native_close_never_starts_the_new_source(self):self.check_mode('transition-closed-unknown','CAST:failed:17')
if __name__=='__main__':unittest.main()
