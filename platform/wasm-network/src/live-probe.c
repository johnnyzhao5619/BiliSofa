/* W01/G4 anonymous fixed-room HLS preflight. No cookies, POST, redirects or proxy. */
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <time.h>
#include <curl/curl.h>
#include <openssl/crypto.h>
#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#define LIVE_EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define LIVE_EXPORT
#endif
#ifndef LIVE_CAP
#define LIVE_CAP 131072
#endif
static CURL *easy; static CURLM *multi;
static int initialized, live, active=-1, added, bad_close, result_code;
static long http_status; static size_t body_size, header_size;
#ifdef BILISOFA_LIVE_PRODUCT
static int product_range_header; static unsigned long long product_range_total;
#endif
static unsigned char body[LIVE_CAP+1]; static char input[2049];
static double until, request_until;
static double now_ms(void){struct timespec t;if(clock_gettime(CLOCK_MONOTONIC,&t))return -1;return t.tv_sec*1000.0+t.tv_nsec/1000000.0;}
static int allowed(const char *url, const char *extension){
 size_t n=strlen(url);if(n>2048 || strncmp(url,"https://",8))return 0;
 for(size_t i=0;i<n;i++)if((unsigned char)url[i]<33 || (unsigned char)url[i]>126 || url[i]=='\\' || url[i]=='#')return 0;
 const char *host=url+8,*slash=strchr(host,'/');if(!slash || slash==host || slash-host>253)return 0;
 for(const char *p=host;p<slash;p++)if(!((*p>='a'&&*p<='z')||(*p>='0'&&*p<='9')||*p=='-'||*p=='.'))return 0;
#ifdef BILISOFA_LIVE_PRODUCT
 const char *label=host;for(const char *p=host;p<slash;p++){if(*p=='.'){if(p==label||p[-1]=='-'||p-label>63)return 0;label=p+1;}else if(*p=='-'&&p==label)return 0;}if(label==slash||slash[-1]=='-'||slash-label>63)return 0;
#endif
 int ok=0;const char *suffixes[]={".bilivideo.com",".bilivideo.cn"};
 for(int i=0;i<2;i++){size_t m=strlen(suffixes[i]);if((size_t)(slash-host)>m && !memcmp(slash-m,suffixes[i],m))ok=1;}
 const char *end=strchr(slash,'?');if(!end)end=url+n;size_t m=strlen(extension);
 return ok && (size_t)(end-slash)>m && !memcmp(end-m,extension,m);
}
static void finish(void){
 live=0;if(added && curl_multi_remove_handle(multi,easy)!=CURLM_OK)bad_close=1;added=0;active=-1;
#ifdef LIVE_EXTRA_CLEANUP
 LIVE_EXTRA_CLEANUP();
#endif
 if(easy)curl_easy_cleanup(easy);easy=NULL;if(multi && curl_multi_cleanup(multi)!=CURLM_OK)bad_close=1;multi=NULL;
 if(initialized)curl_global_cleanup();initialized=0;OPENSSL_cleanse(input,sizeof(input));OPENSSL_cleanse(body,sizeof(body));body_size=0;
#ifdef __EMSCRIPTEN__
 emscripten_cancel_main_loop();
#endif
 puts(bad_close?"LIVE:unclosed":"LIVE:closed");fflush(stdout);
}
static size_t body_cb(char *data,size_t unit,size_t count,void *ctx){
 (void)ctx;size_t cap=active==0?131072:active==1?32768:active==2?512:LIVE_CAP;
 if(unit && count>cap/unit)return 0;size_t n=unit*count;if(n>cap-body_size)return 0;
 memcpy(body+body_size,data,n);body_size+=n;body[body_size]=0;return n;
}
static size_t header_cb(char *data,size_t unit,size_t count,void *ctx){(void)data;(void)ctx;if(unit && count>8192/unit)return 0;size_t n=unit*count;if(n>8192-header_size)return 0;header_size+=n;
#ifdef BILISOFA_LIVE_PRODUCT
 if(memchr(data,0,n))return 0;
 if(n>=17&&!strncasecmp(data,"Content-Encoding:",17)&&(n!=28||strncasecmp(data+17," identity\r\n",11)))return 0;
 if(active==2&&n>=14&&!strncasecmp(data,"Content-Range:",14)){
  char line[128];int end=0;unsigned long long total=0;if(n>=sizeof(line)||product_range_header)return 0;memcpy(line,data,n);line[n]=0;
  if(sscanf(line+14," bytes 0-511/%13llu%n",&total,&end)!=1||strcmp(line+14+end,"\r\n")||total<512||total>LIVE_CAP)return 0;product_range_header=1;product_range_total=total;
 }
#endif
 return n;}
LIVE_EXPORT int live_input_ptr(void){return (int)(size_t)input;}
LIVE_EXPORT int live_body_ptr(void){return (int)(size_t)body;}
LIVE_EXPORT int live_body_length(void){return (int)body_size;}
LIVE_EXPORT int live_http_status(void){return (int)http_status;}
LIVE_EXPORT int live_curl_status(void){return result_code;}
#ifdef BILISOFA_LIVE_PRODUCT
LIVE_EXPORT int live_product_range_valid(void){return result_code==0&&http_status==206&&product_range_header&&product_range_total>=512&&body_size==512;}
#endif
LIVE_EXPORT void live_response_clear(void){OPENSSL_cleanse(body,sizeof(body));body_size=0;}
LIVE_EXPORT void live_stop(void){if(live)finish();}
LIVE_EXPORT int live_begin(int operation){
 if(!live || active>=0 || operation<0 || operation>
#ifdef LIVE_RELAY
 3
#else
 2
#endif
 || now_ms()<0
#ifdef BILISOFA_LIVE_PRODUCT
 || operation==0
#else
 || now_ms()>=until
#endif
 )return 0;
 const char *url="https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo?room_id=6&protocol=1&format=1&codec=0&qn=80&platform=web&ptype=8";
 if(operation && !allowed(input,operation==1?".m3u8":".ts"))return 0;
 live_response_clear();header_size=0;http_status=0;result_code=-1;
#ifdef BILISOFA_LIVE_PRODUCT
 product_range_header=0;product_range_total=0;
#endif
 if(curl_easy_setopt(easy,CURLOPT_URL,operation?input:url)!=CURLE_OK || curl_easy_setopt(easy,CURLOPT_RANGE,operation==2?"0-511":NULL)!=CURLE_OK)return 0;
 OPENSSL_cleanse(input,sizeof(input));active=operation;
 if(curl_multi_add_handle(multi,easy)!=CURLM_OK){active=-1;return 0;}added=1;request_until=now_ms()+10000;return 1;
}
static void tick(void){
 if(!live)return;double now=now_ms();if(now<0 ||
#ifndef BILISOFA_LIVE_PRODUCT
 now>=until ||
#endif
 (active>=0 && now>=request_until)){puts("LIVE:deadline");finish();return;}
#ifdef LIVE_EXTRA_TICK
 LIVE_EXTRA_TICK();if(!live)return;
#endif
 if(active<0)return;int running=0;if(curl_multi_perform(multi,&running)!=CURLM_OK){finish();return;}
 int left;CURLMsg *message;while((message=curl_multi_info_read(multi,&left))){
  if(message->msg!=CURLMSG_DONE || message->easy_handle!=easy){finish();return;}
  result_code=(int)message->data.result;if(curl_easy_getinfo(easy,CURLINFO_RESPONSE_CODE,&http_status)!=CURLE_OK)http_status=0;
  if(curl_multi_remove_handle(multi,easy)!=CURLM_OK){bad_close=1;finish();return;}added=0;int operation=active;active=-1;
  printf("LIVE:response:%d\n",operation);fflush(stdout);return;
 }
}
static int start(void){
 if(live || easy || multi || bad_close)return 0;if(curl_global_init(CURL_GLOBAL_DEFAULT)!=CURLE_OK)return 0;initialized=1;
 easy=curl_easy_init();multi=curl_multi_init();if(!easy || !multi){finish();return 0;}
#define SET(option,value) do{if(curl_easy_setopt(easy,option,value)!=CURLE_OK){finish();return 0;}}while(0)
 SET(CURLOPT_FOLLOWLOCATION,0L);SET(CURLOPT_PROTOCOLS_STR,"https");SET(CURLOPT_REDIR_PROTOCOLS_STR,"https");SET(CURLOPT_PROXY,"");SET(CURLOPT_NOPROXY,"*");
 SET(CURLOPT_USERAGENT,"BiliSofa-W01-research/0.0.1");SET(CURLOPT_SSL_VERIFYPEER,1L);SET(CURLOPT_SSL_VERIFYHOST,2L);SET(CURLOPT_CAINFO,"/cacert.pem");
 SET(CURLOPT_CONNECTTIMEOUT_MS,4000L);SET(CURLOPT_TIMEOUT_MS,9000L);SET(CURLOPT_NOSIGNAL,1L);SET(CURLOPT_HTTPGET,1L);SET(CURLOPT_WRITEFUNCTION,body_cb);SET(CURLOPT_HEADERFUNCTION,header_cb);
#undef SET
 live=1;until=now_ms()+40000;if(now_ms()<0){finish();return 0;}puts("LIVE:ready");fflush(stdout);return 1;
}
#ifndef LIVE_NO_MAIN
int main(void){if(!start())return 1;
#ifdef __EMSCRIPTEN__
 emscripten_set_main_loop(tick,40,0);
#else
 while(live){tick();struct timespec wait={0,10000000};nanosleep(&wait,NULL);}
#endif
 return 0;}
#endif
