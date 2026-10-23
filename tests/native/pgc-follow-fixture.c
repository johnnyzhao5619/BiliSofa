/* Local TLS only, synthetic credentials. Never reads a user account or posts
 * to a public endpoint. Exercises the exact production lane, including method. */
#include <curl/curl.h>
static int inject_remove_error;
static CURLMcode fixture_remove(CURLM *multi,CURL *easy){CURLMcode result=curl_multi_remove_handle(multi,easy);return inject_remove_error?CURLM_BAD_HANDLE:result;}
#define curl_multi_remove_handle fixture_remove
#define VOD_API_NO_MAIN
#include "pgc-follow.c"
static int clean(void){return !vod_live&&!vod_api&&!vod_cdn&&!vod_multi&&!vod_current&&!vod_initialized&&!vod_added&&vod_active<0&&!vod_size&&!*vod_body&&!*vod_input&&!*vod_url&&!*follow_form&&!follow_headers;}
int main(int argc,char **argv){
 if(argc!=4||!vod_start())return 1;const char *mode=argv[1];char mapping_text[128];snprintf(mapping_text,sizeof(mapping_text),"api.bilibili.com:443:127.0.0.1:%d",atoi(argv[3]));struct curl_slist *mapping=curl_slist_append(NULL,mapping_text);
 curl_easy_setopt(vod_api,CURLOPT_CONNECT_TO,mapping);curl_easy_setopt(vod_api,CURLOPT_CAINFO,argv[2]);
 if(!strcmp(mode,"bounds")){
  const char *bad[]={"0","01","9007199254740992","1|x","1&csrf=x","https://outside.invalid/1"};
  for(unsigned i=0;i<sizeof(bad)/sizeof(bad[0]);i++){strcpy(vod_input,bad[i]);if(vod_begin(4)||vod_begin(7)||vod_begin(8))return 2;}
  const char *lists[]={"1|0|1","1|3|1","1|1|0","1|1|25001","1|1|01","1|1|1|2","1|1|1\r\nX: x"};
  for(unsigned i=0;i<sizeof(lists)/sizeof(lists[0]);i++){strcpy(vod_input,lists[i]);if(vod_begin(6))return 3;}
  const char *signed_bad[]={"101|1|1|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa|bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb|1700000000","101|1|1|AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA|bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb|1800000000","101|1|1|short|bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb|1800000000"};
  for(unsigned i=0;i<sizeof(signed_bad)/sizeof(signed_bad[0]);i++){strcpy(vod_input,signed_bad[i]);if(vod_begin(6))return 3;}
  strcpy(vod_input,"123|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaG");if(vod_begin(7)||vod_begin(8))return 4;
  strcpy(vod_input,"BV0000000001");if(vod_begin(1)||vod_begin(2)||vod_begin(3)||vod_begin(5)||vod_begin(9))return 5;
  vod_finish();curl_slist_free_all(mapping);return clean()?0:6;
 }
 strcpy(vod_input,".bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic-session\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\taaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n");if(!vod_import_cookies((int)strlen(vod_input))||!vod_begin(0))return 7;
 if(!strcmp(mode,"cancel")){vod_stop();curl_slist_free_all(mapping);return clean()?0:8;}
 if(!strcmp(mode,"deadline")){vod_request_until=vod_now()-1;vod_tick();curl_slist_free_all(mapping);return clean()?0:9;}
 if(!strcmp(mode,"unknown"))inject_remove_error=1;
 int step=0;const int operations[]={6,7,4,8,0};double until=vod_now()+15000;
 while(vod_live&&vod_now()<until){
  vod_tick();if(vod_live&&vod_active<0){if(vod_result||vod_status!=200||step==5){vod_finish();break;}
   int operation=operations[step++];vod_response_clear();
   if(operation==6)snprintf(vod_input,sizeof(vod_input),"101|2|1|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa|bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb|%lld",(long long)time(NULL));else if(operation==7||operation==8)strcpy(vod_input,"123|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");else if(operation==4)strcpy(vod_input,"123");else *vod_input=0;
   if(!vod_begin(operation))return 10;
  }struct timespec wait={0,1000000};nanosleep(&wait,NULL);
 }
 if(vod_live){vod_finish();return 11;}curl_slist_free_all(mapping);return clean()?0:12;
}
