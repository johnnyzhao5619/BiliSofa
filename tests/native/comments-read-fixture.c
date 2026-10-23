#include <curl/curl.h>
static int inject_remove_error;
static CURLMcode fixture_remove(CURLM *multi,CURL *easy){CURLMcode rc=curl_multi_remove_handle(multi,easy);return inject_remove_error?CURLM_BAD_HANDLE:rc;}
#define curl_multi_remove_handle fixture_remove
#define VOD_API_NO_MAIN
#include "comments-read.c"
static int clean(void){return !vod_live&&!vod_api&&!vod_cdn&&!vod_multi&&!vod_current&&!vod_initialized&&!vod_added&&vod_active<0&&!vod_size&&!*vod_body&&!*vod_input&&!*vod_url;}
int main(int argc,char **argv){
 if(argc!=4||!vod_start())return 2;const char *mode=argv[1];
 if(!strcmp(mode,"bounds")){
  const char *bad[]={"123|4|%7B%7D|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa|bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb|1700000000","123|3|%XX|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa|bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb|1700000000","123|3|offset&url=evil|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa|bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb|1700000000","123|3|%7B%7D|bad|bad|1700000000"};
  for(unsigned i=0;i<sizeof(bad)/sizeof(bad[0]);i++){strcpy(vod_input,bad[i]);char *stamp=strrchr(vod_input,'|')+1;snprintf(stamp,sizeof(vod_input)-(size_t)(stamp-vod_input),"%lld",(long long)time(NULL));if(vod_begin(4))return 3;}
  strcpy(vod_input,"123|456|51");if(vod_begin(5))return 4;
  snprintf(vod_input,sizeof(vod_input),"BV0000000001|222|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa|bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb|%lld",(long long)time(NULL));if(vod_begin(2))return 4;
  snprintf(vod_input,sizeof(vod_input),"https://fixture.bilivideo.com/a.m4s?deadline=%lld",(long long)time(NULL)+3600);if(!guest_cdn_valid(vod_input)||vod_begin(3)||vod_begin(6))return 4;
  vod_finish();return clean()?0:5;
 }
 char api[128];snprintf(api,sizeof(api),"api.bilibili.com:443:127.0.0.1:%d",atoi(argv[3]));struct curl_slist *mapping=curl_slist_append(NULL,api);curl_easy_setopt(vod_api,CURLOPT_CONNECT_TO,mapping);curl_easy_setopt(vod_api,CURLOPT_CAINFO,argv[2]);
 const char *cookies=".bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic-session\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\tsynthetic-csrf\n";strcpy(vod_input,cookies);if(!vod_import_cookies((int)strlen(cookies)))return 6;
 *vod_input=0;if(!vod_begin(0))return 7;
 if(!strcmp(mode,"cancel")){vod_stop();curl_slist_free_all(mapping);return clean()?0:8;}
 if(!strcmp(mode,"deadline")){vod_request_until=vod_now()-1;vod_tick();curl_slist_free_all(mapping);return clean()?0:8;}
 if(!strcmp(mode,"unknown"))inject_remove_error=1;
 int step=0;double until=vod_now()+15000;while(vod_live&&vod_now()<until){vod_tick();if(vod_live&&vod_active<0){
  if(vod_result||vod_status!=200){vod_finish();break;}vod_response_clear();step++;
  int op=0;if(step==1){op=1;strcpy(vod_input,"BV0000000001");}
  else if(step==2||step==3){op=4;snprintf(vod_input,sizeof(vod_input),"123|%d|%%7B%%22offset%%22%%3A%%22%s%%22%%7D|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa|bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb|%lld",step==2?3:2,step==2?"":"next",(long long)time(NULL));}
  else if(step==4){op=5;strcpy(vod_input,"123|99999999999999999999|2");}else{vod_finish();break;}if(!vod_begin(op))return 9;
 }struct timespec wait={0,1000000};nanosleep(&wait,NULL);}
 if(vod_live){vod_finish();return 10;}curl_slist_free_all(mapping);return clean()?0:11;
}
