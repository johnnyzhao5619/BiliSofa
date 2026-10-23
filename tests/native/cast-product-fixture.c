/* Exact generated product headers, local TLS fixtures only. */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <strings.h>
#include <float.h>
#include <errno.h>
#include <unistd.h>
#include <fcntl.h>
#include <poll.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#define CURL_DISABLE_DEPRECATION
#include <curl/curl.h>
#define BILISOFA_CAST_HOST_FIXTURE
#define BILISOFA_CAST_PORT 0
#define BILISOFA_CAST_SSDP_PORT 0
#define BILISOFA_BRIDGE_PORT 0
#define http_now fixture_real_now
#include "probe-http.h"
#undef http_now
static double offset;
static double http_now(void) { return fixture_real_now()+offset; }
#include "probe-guest.h"
#include "../../build/cast-product/cast-product-bridge.h"
#include "../../build/cast-product/cast-product-receiver.h"
static const char *token="0123456789abcdef0123456789abcdef";
static void url(char *out,size_t capacity) { snprintf(out,capacity,"https://fixture.bilivideo.com/upgcxcode/a.mp4?deadline=%llu",(unsigned long long)time(NULL)+7200); }
static int clean(void) { return !cast_unconfirmed && !bridge_unconfirmed && cast_tcp<0 && cast_udp<0 && bridge_fd<0 && !bridge_multi && !bridge_global && !cast_source_multi && !cast_source_easy && !cast_source_global; }
int main(int argc,char **argv) {
  if(argc!=4)return 1;
  cast_rpc_enable();cast_transition_enable();
  if(cast_begin("127.0.0.1","01234567-89ab-cdef-0123-456789abcdef",token))return 2;
  char source[256];url(source,sizeof(source));
  if(!strcmp(argv[1],"lifetime")) {
    cast_connections=2048;offset=601;cast_tick();if(!cast_started || cast_tcp<0)return 3;
    if(bridge_progressive_begin(token,source,3600,1073741824ULL))return 4;
    if(bridge_deadline-http_now()<3500 || sizeof(bridge_clients)>1048576)return 5;
    bridge_connections=2048;bridge_windows=10000;bridge_stream_bytes=256ULL*1024*1024;bridge_tick();if(bridge_fd<0 || !bridge_multi)return 6;
    for(int i=0;i<8;i++){struct bridge_client c={0};c.fd=-1;c.streaming=1;if(!bridge_retry_range(&c,28,http_now()) || !bridge_retry_range(&c,28,http_now()) || bridge_retry_range(&c,28,http_now()))return 18;}
    bridge_deadline=http_now()-1;bridge_tick();if(bridge_fd>=0 || bridge_multi)return 7;
  } else if(!strcmp(argv[1],"transitions")) {
    for(unsigned int generation=2;generation<=8;generation++) {
      if(bridge_progressive_begin(cast_media_token,source,3600,1073741824ULL))return 8;
      bridge_connections=2048;bridge_windows=10000;bridge_stream_bytes=256ULL*1024*1024;
      snprintf(cast_transition_token,sizeof(cast_transition_token),"%032x",generation);strcpy(cast_source_input,source);cast_session_until=DBL_MAX;
      if(cast_transition_begin((unsigned int)strlen(source),generation)!=1 || bridge_fd>=0 || bridge_multi || cast_media_generation!=(int)generation)return 9;
      cast_source_stop();cast_source_attempted=0;
    }
  } else if(!strcmp(argv[1],"policy")) {
    if(!cast_source_valid(source))return 10;
    const char *bad[]={"https://127.0.0.1/upgcxcode/a.mp4?deadline=9999999999","https://fixture.bilivideo.com.evil.invalid/upgcxcode/a.mp4?deadline=9999999999","http://fixture.bilivideo.com/upgcxcode/a.mp4?deadline=9999999999"};
    for(size_t i=0;i<sizeof(bad)/sizeof(bad[0]);i++)if(cast_source_valid(bad[i]))return 11;
    char body[513]={0};if(cast_source_body(body,1,513,NULL))return 12;
    struct cast_client c={0};c.fd=-1;snprintf(c.request,sizeof(c.request),"GET /%s/description.xml HTTP/1.1\r\nHost: fixture\r\n\r\n",token);c.used=strlen(c.request);cast_http(&c);
    if(!strstr(c.response,"<friendlyName>BiliSofa</friendlyName>") || strstr(c.response,"W01 Discovery"))return 13;
  } else if(!strcmp(argv[1],"bridge")) {
    if(bridge_progressive_begin(token,source,3600,8192))return 19;
    bridge_connections=2048;bridge_windows=10000;bridge_stream_bytes=256ULL*1024*1024;
    int pair[2];if(socketpair(AF_UNIX,SOCK_STREAM,0,pair))return 20;
    fcntl(pair[0],F_SETFL,O_NONBLOCK);fcntl(pair[1],F_SETFL,O_NONBLOCK);
    struct bridge_client *c=&bridge_clients[0];c->fd=pair[0];c->deadline=http_now()+10;c->request_done=1;
    snprintf(c->request,sizeof(c->request),"GET /%s/cast.mp4 HTTP/1.1\r\nHost: 127.0.0.1\r\nRange: bytes=0-511\r\n\r\n",token);c->request_size=strlen(c->request);bridge_request(c);if(!c->easy)return 21;
    char mapping[128];snprintf(mapping,sizeof(mapping),"fixture.bilivideo.com:443:127.0.0.1:%s",argv[3]);struct curl_slist *connect=curl_slist_append(NULL,mapping);
    if(curl_easy_setopt(c->easy,CURLOPT_CONNECT_TO,connect)!=CURLE_OK || curl_easy_setopt(c->easy,CURLOPT_CAINFO,argv[2])!=CURLE_OK)return 22;
    char response[2048]={0};size_t used=0;double start=http_now();
    while(http_now()-start<10){bridge_tick();ssize_t n=recv(pair[1],response+used,sizeof(response)-1-used,0);if(n>0)used+=(size_t)n;else if(!n)break;struct timespec wait={0,2000000};nanosleep(&wait,NULL);}
    close(pair[1]);curl_slist_free_all(connect);char *body=strstr(response,"\r\n\r\n");if(!strstr(response,"HTTP/1.1 206") || !body || used-(size_t)(body+4-response)!=512 || memcmp(body+8,"ftyp",4))return 23;
  } else {
    strcpy(cast_source_input,source);if(cast_source_begin((unsigned int)strlen(source))!=1)return 14;
    char mapping[128];snprintf(mapping,sizeof(mapping),"fixture.bilivideo.com:443:127.0.0.1:%s",argv[3]);struct curl_slist *connect=curl_slist_append(NULL,mapping);
    if(curl_easy_setopt(cast_source_easy,CURLOPT_CONNECT_TO,connect)!=CURLE_OK || curl_easy_setopt(cast_source_easy,CURLOPT_CAINFO,argv[2])!=CURLE_OK)return 15;
    double start=http_now();while(cast_source_multi && http_now()-start<11){cast_source_tick();struct timespec wait={0,2000000};nanosleep(&wait,NULL);}
    curl_slist_free_all(connect);
    if(cast_source_multi || cast_source_ready!=(!strcmp(argv[1],"normal")))return 16;
  }
  cast_stop();if(!clean())return 17;
  puts("PRODUCT:closed");return 0;
}
