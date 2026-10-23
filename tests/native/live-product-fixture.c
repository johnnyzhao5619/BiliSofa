/* Host-only remapping and synthetic credentials. The production module is
 * linked unchanged; never contact a real API, account or media destination. */
#include <curl/curl.h>
static int inject_remove_error;
static CURLMcode fixture_remove(CURLM *m,CURL *e){CURLMcode rc=curl_multi_remove_handle(m,e);return inject_remove_error?CURLM_BAD_HANDLE:rc;}
#define curl_multi_remove_handle fixture_remove
#define main product_api_main
#include "live-product.c"
#undef main
#include <poll.h>
static int clean_api(void){return !vod_live&&!vod_api&&!vod_cdn&&!vod_multi&&!vod_current&&!vod_initialized&&!vod_added&&!vod_size&&!*vod_body&&!*vod_input&&!*vod_url;}
static int clean_relay(void){return !live&&!easy&&!multi&&!initialized&&!added&&!body_size&&!*body&&!*input&&!*relay_token&&client_fd<0&&listen_fd<0;}
int main(int argc,char **argv){
  if(argc!=4||!vod_start())return 1;const char *mode=argv[1];char a[128],b[128],c[128];
  snprintf(a,sizeof(a),"api.bilibili.com:443:127.0.0.1:%s",argv[3]);snprintf(b,sizeof(b),"api.live.bilibili.com:443:127.0.0.1:%s",argv[3]);snprintf(c,sizeof(c),"fixture.bilivideo.com:443:127.0.0.1:%s",argv[3]);
  struct curl_slist *map=curl_slist_append(NULL,a);map=curl_slist_append(map,b);map=curl_slist_append(map,c);curl_easy_setopt(vod_api,CURLOPT_CONNECT_TO,map);curl_easy_setopt(vod_api,CURLOPT_CAINFO,argv[2]);
  if(live_product_start())return 2;
  if(!strcmp(mode,"bounds")){
    for(int op=1;op<=8;op++){strcpy(vod_input,"1");if(vod_begin(op))return 3;}
    for(int op=9;op<=15;op++){strcpy(vod_input,"https://outside.invalid/1\r\nX: value");if(vod_begin(op))return 4;}
    const char *bad[]={"0|80","01|80","9007199254740992|80","1|100001","1|01","1|80|1"};for(unsigned i=0;i<sizeof(bad)/sizeof(bad[0]);i++){strcpy(vod_input,bad[i]);if(vod_begin(14))return 5;}
    strcpy(vod_input,"1|0|1|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa|bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb|1700000000");if(vod_begin(11))return 6;
    vod_stop();curl_slist_free_all(map);return clean_api()?0:7;
  }
  strcpy(vod_input,".bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic-session\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\taaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n");if(!vod_import_cookies((int)strlen(vod_input))||!vod_begin(0))return 8;
  if(!strcmp(mode,"cancel")){vod_stop();curl_slist_free_all(map);return clean_api()?0:9;}
  if(!strcmp(mode,"deadline")){vod_request_until=vod_now()-1;vod_tick();curl_slist_free_all(map);return clean_api()?0:10;}
  if(!strcmp(mode,"unknown"))inject_remove_error=1;
  int step=0;double deadline=vod_now()+15000;
  while(vod_live&&vod_now()<deadline){
    vod_tick();if(vod_live&&vod_active<0){
      if(vod_result||vod_status!=200||step==7||!strncmp(mode,"relay",5)||!strncmp(mode,"range",5)){vod_stop();break;}
      const int ops[]={9,10,11,12,13,14,15};int op=ops[step++];*vod_input=0;
      if(op==11)snprintf(vod_input,sizeof(vod_input),"1|0|1|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa|bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb|%lld",(long long)time(NULL));
      if(op==12)strcpy(vod_input,"1");if(op==13)strcpy(vod_input,"123");if(op==14)strcpy(vod_input,"123|0");if(!vod_begin(op))return 11;
    }struct timespec wait={0,1000000};nanosleep(&wait,NULL);
  }
  if(vod_live){vod_stop();return 12;}if(!clean_api())return 13;
  if(strncmp(mode,"relay",5)&&strncmp(mode,"range",5)){curl_slist_free_all(map);return 0;}
  if(!strcmp(mode,"relay-restart")){
    if(!live_product_start())return 24;
    curl_easy_setopt(easy,CURLOPT_CONNECT_TO,map);curl_easy_setopt(easy,CURLOPT_CAINFO,argv[2]);
    strcpy(input,"https://fixture.bilivideo.com/live.m3u8");if(!live_begin(1))return 25;
    while(live&&active>=0){tick();struct timespec wait={0,1000000};nanosleep(&wait,NULL);}
    if(result_code||http_status!=200)return 26;live_stop();if(!clean_relay())return 27;
    puts("HOST:first_relay_closed");fflush(stdout);
  }
  if(!live_product_start()||product_api_main()!=1)return 14;
  curl_easy_setopt(easy,CURLOPT_CONNECT_TO,map);curl_easy_setopt(easy,CURLOPT_CAINFO,argv[2]);
  strcpy(input,"https://outside.invalid/segment.ts");if(live_begin(3))return 15;if(live_begin(0))return 16;
  if(!strncmp(mode,"range",5)){
    strcpy(input,"https://fixture.bilivideo.com/segment.ts");if(!live_begin(2))return 17;
    while(live&&active>=0){tick();struct timespec wait={0,1000000};nanosleep(&wait,NULL);}
    if(live_product_range_valid())puts("HOST:range_valid");live_stop();curl_slist_free_all(map);return clean_relay()?0:18;
  }
  strcpy(input,"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");if(!live_relay_start())return 19;
  struct sockaddr_in address;socklen_t length=sizeof(address);if(getsockname(listen_fd,(struct sockaddr*)&address,&length)||ntohl(address.sin_addr.s_addr)!=INADDR_LOOPBACK)return 20;
  request_count=128;relay_bytes=67108864;until=now_ms()-1;puts("HOST:ready");fflush(stdout);int fetching=0;
  while(live){
    tick();if(!live)break;
    if(client_state==2&&active<0){if(!fetching){
      if(request_kind==2&&request_segment!=1&&request_segment!=2000){reject_request(404);continue;}
      strcpy(input,request_kind==1?"https://fixture.bilivideo.com/live.m3u8":"https://fixture.bilivideo.com/segment.ts");if(!live_begin(request_kind==1?1:3))return 21;fetching=1;
    }else{if(result_code||http_status!=200){puts("HOST:upstream_rejected");live_stop();break;}if(!live_relay_reply((int)body_size,request_kind))return 22;fetching=0;}}
    struct pollfd p={0,POLLIN,0};if(poll(&p,1,0)>0&&(p.revents&POLLIN)){char x;if(read(0,&x,1)>0)live_stop();}struct timespec wait={0,1000000};nanosleep(&wait,NULL);
  }
  curl_slist_free_all(map);return clean_api()&&clean_relay()&&!bad_close?0:23;
}
