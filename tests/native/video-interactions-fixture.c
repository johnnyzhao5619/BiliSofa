/* Real production C, local synthetic TLS only. */
#include <curl/curl.h>
static int inject_remove_error;
static CURLMcode fixture_remove(CURLM *multi,CURL *easy){CURLMcode r=curl_multi_remove_handle(multi,easy);return inject_remove_error?CURLM_BAD_HANDLE:r;}
#define curl_multi_remove_handle fixture_remove
#define VOD_API_NO_MAIN
#include "video-interactions.c"
static int clean(void){return !vod_live&&!vod_api&&!vod_cdn&&!vod_multi&&!vod_current&&!vod_initialized&&!vod_added&&vod_active<0&&!vod_size&&!*vod_body&&!*vod_input&&!*vod_url&&!*interaction_form&&!interaction_headers;}
int main(int argc,char **argv){
 if(argc!=4||!vod_start())return 1;const char *mode=argv[1];char text[128];snprintf(text,sizeof(text),"api.bilibili.com:443:127.0.0.1:%d",atoi(argv[3]));struct curl_slist *mapping=curl_slist_append(NULL,text);curl_easy_setopt(vod_api,CURLOPT_CONNECT_TO,mapping);curl_easy_setopt(vod_api,CURLOPT_CAINFO,argv[2]);
 if(!strcmp(mode,"bounds")){
  const char *bad[]={"0","01","9007199254740992","1|3|0|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","1|1|0|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaG","1|1|0|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa|extra","1&x=y|1|0|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","https://outside.invalid"};
  for(unsigned i=0;i<sizeof(bad)/sizeof(bad[0]);i++)for(int op=4;op<=12;op++){strcpy(vod_input,bad[i]);if(vod_begin(op))return 2;}
  strcpy(vod_input,"BV0000000001|123|127|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa|bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb|1700000000");if(vod_begin(2))return 3;strcpy(vod_input,"https://fixture.bilivideo.com/a.m4s?deadline=4102444800");if(vod_begin(3))return 4;
  vod_finish();curl_slist_free_all(mapping);return clean()?0:5;
 }
 strcpy(vod_input,".bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic-session\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\taaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n");if(!vod_import_cookies((int)strlen(vod_input))||!vod_begin(0))return 6;
 if(!strcmp(mode,"cancel")){vod_stop();curl_slist_free_all(mapping);return clean()?0:7;}if(!strcmp(mode,"deadline")){vod_request_until=vod_now()-1;vod_tick();curl_slist_free_all(mapping);return clean()?0:8;}if(!strcmp(mode,"unknown"))inject_remove_error=1;
 const int ops[]={1,4,5,6,7,8,4,8,4,9,5,9,5,10,7,10,7,11,6,11,6,12,4,12,11,0};
 const char *inputs[]={"BV0000000001","123","123|101","202","","123|1|0","123","123|0|0","123","123|1|456","123|101","123|0|456","123|101","123|1|0","","123|0|0","","202|1|0","202","202|0|0","202","123|1|0","123","123|2|0","202|0|1",""};
 int step=0;double until=vod_now()+15000;
 while(vod_live&&vod_now()<until){vod_tick();if(vod_live&&vod_active<0){if(vod_result||vod_status!=200||step==(int)(sizeof(ops)/sizeof(ops[0]))){vod_finish();break;}int op=ops[step];vod_response_clear();if(op>=8)snprintf(vod_input,sizeof(vod_input),"%s|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",inputs[step]);else snprintf(vod_input,sizeof(vod_input),"%s",inputs[step]);step++;if(!vod_begin(op))return 9;}struct timespec wait={0,1000000};nanosleep(&wait,NULL);}
 if(vod_live){vod_finish();return 10;}curl_slist_free_all(mapping);return clean()?0:11;
}
