/* Production new lane, synthetic isolated cookie jar and local TLS only. */
#include <curl/curl.h>
static int unknown_close;
static CURLMcode fixture_remove(CURLM *m,CURL *e){CURLMcode rc=curl_multi_remove_handle(m,e);return unknown_close?CURLM_BAD_HANDLE:rc;}
static CURLMcode fixture_cleanup(CURLM *m){CURLMcode rc=curl_multi_cleanup(m);return unknown_close?CURLM_BAD_HANDLE:rc;}
#define curl_multi_cleanup fixture_cleanup
#define curl_multi_remove_handle fixture_remove
#define RECOMMEND_NO_MAIN
#include "recommend-read.c"
static int clean(void){return !live&&!easy&&!multi&&!initialized&&!added&&active<0&&!body_size&&!*body&&!*input&&!*request_url;}
static void query(const char *mode){snprintf(input,sizeof(input),"%s|2|1|av_1,av_2|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa|bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb|%llu",!strcmp(mode,"refresh")?"5":"4",(unsigned long long)time(NULL));}
int main(int argc,char **argv){
 if(argc!=4||!start())return 1;const char *mode=argv[1];char map[128];snprintf(map,sizeof(map),"api.bilibili.com:443:127.0.0.1:%s",argv[3]);struct curl_slist *connect=curl_slist_append(NULL,map);curl_easy_setopt(easy,CURLOPT_CONNECT_TO,connect);curl_easy_setopt(easy,CURLOPT_CAINFO,argv[2]);
 if(!strcmp(mode,"bounds")){memset(input,'x',sizeof(input));if(recommend_begin())return 11;const char *bad[]={"", "4|2|1|a&url=x|a|b|0", "1|2|1||aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa|bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb|0", "4|01|0||aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa|bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb|0"};for(size_t i=0;i<sizeof(bad)/sizeof(bad[0]);i++){strcpy(input,bad[i]);if(recommend_begin())return 2;}char b[8193]={0};if(header_cb(b,1,8193,NULL)||body_cb(b,1,AUTH_CAP+1,NULL))return 3;finish();curl_slist_free_all(connect);return clean()?0:4;}
 strcpy(input,".bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic-session\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\tsynthetic-csrf\n");if(!auth_import_cookies((int)strlen(input))||!auth_begin(0))return 5;
 if(!strcmp(mode,"cancel")){auth_stop();curl_slist_free_all(connect);return clean()?0:6;}
 if(!strcmp(mode,"deadline")){request_until=now_ms()-1;tick();curl_slist_free_all(connect);return clean()?0:7;}
 int stage=0;double until=now_ms()+13000;
 while(live&&now_ms()<until){tick();if(live&&active<0){if(result_code||http_status!=200){finish();break;}if(stage){if(!strcmp(mode,"unknown"))unknown_close=1;finish();break;}auth_response_clear();query(mode);if(!recommend_begin()||recommend_begin())return 8;stage++;}struct timespec wait={0,1000000};nanosleep(&wait,NULL);}
 if(live){finish();return 9;}curl_slist_free_all(connect);return clean()&&bad_close==!strcmp(mode,"unknown")?0:10;
}
