/* Original F05 private read-only lane; one verified account per native lifetime. */
#include <stdio.h>
#include <string.h>
#include <strings.h>
#include <stdlib.h>
#include <time.h>
#include <curl/curl.h>
#include <openssl/crypto.h>
#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#define AUTH_EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define AUTH_EXPORT
#endif
#define AUTH_CAP 524288
#define AUTH_PRIVATE_CAP 4096
static CURL *easy;
static CURLM *multi;
static int initialized, live, active=-1, added, bad_close, result_code;
static long http_status;
static char body[AUTH_CAP+1], input[AUTH_PRIVATE_CAP+1], request_url[4096];
static size_t body_size, header_size;
static double session_until, request_until;
static const char *const fixed_urls[]={
 "https://api.bilibili.com/x/web-interface/nav"
};
static double now_ms(void){struct timespec t;if(clock_gettime(CLOCK_MONOTONIC,&t))return -1;return t.tv_sec*1000.0+t.tv_nsec/1000000.0;}
static void emit(const char *s){puts(s);fflush(stdout);}
static void wipe_response(void){OPENSSL_cleanse(body,sizeof(body));body_size=0;}
static void finish(void){
 live=0;
 if(added && curl_multi_remove_handle(multi,easy)!=CURLM_OK)bad_close=1;added=0;active=-1;
 if(easy){if(curl_easy_setopt(easy,CURLOPT_COOKIELIST,"ALL")!=CURLE_OK)bad_close=1;curl_easy_cleanup(easy);}easy=NULL;
 if(multi && curl_multi_cleanup(multi)!=CURLM_OK)bad_close=1;multi=NULL;
 if(initialized)curl_global_cleanup();initialized=0;
#ifdef AUTH_EXTRA_CLEANUP
 AUTH_EXTRA_CLEANUP();
#endif
 wipe_response();OPENSSL_cleanse(input,sizeof(input));OPENSSL_cleanse(request_url,sizeof(request_url));
#ifdef __EMSCRIPTEN__
 emscripten_cancel_main_loop();
#endif
 emit(bad_close?"AUTH:unclosed":"AUTH:closed");
}
static size_t body_cb(char *data,size_t unit,size_t count,void *ctx){
 (void)ctx;if(unit && count>AUTH_CAP/unit)return 0;size_t n=unit*count;if(n>AUTH_CAP-body_size || memchr(data,0,n))return 0;
 memcpy(body+body_size,data,n);body_size+=n;body[body_size]=0;return n;
}
static int domain_allowed(const char *s){return !strcasecmp(s,".bilibili.com") || !strcasecmp(s,"bilibili.com") || !strcasecmp(s,"api.bilibili.com") || !strcasecmp(s,"passport.bilibili.com");}
static size_t header_cb(char *data,size_t unit,size_t count,void *ctx){
 (void)ctx;if(unit && count>8192/unit)return 0;size_t n=unit*count;if(n>8192-header_size)return 0;header_size+=n;
 if(n>=11 && !strncasecmp(data,"Set-Cookie:",11)){
  if(n>2048 || n<13 || memchr(data,0,n))return 0;
  char copy[2049];memcpy(copy,data,n);copy[n]=0;
  char *save=NULL;for(char *part=strtok_r(copy,";\r\n",&save);part;part=strtok_r(NULL,";\r\n",&save)){
   while(*part==' ' || *part=='\t')part++;
   if(!strncasecmp(part,"domain=",7)){
    char *value=part+7;size_t length=strlen(value);while(length && (value[length-1]==' ' || value[length-1]=='\t'))value[--length]=0;
    if(!domain_allowed(value)){OPENSSL_cleanse(copy,sizeof(copy));return 0;}
   }
  }OPENSSL_cleanse(copy,sizeof(copy));
 }
 return n;
}
static int cookie_line(char *line){
 if(!line || strlen(line)>2048)return 0;
 if(!strncmp(line,"#HttpOnly_",10))line+=10;
 char *parts[7]={line};int fields=1;
 for(char *p=line;*p;p++){if(*p=='\t'){if(fields>=7)return 0;*p=0;parts[fields++]=p+1;}else if((unsigned char)*p<33 || (unsigned char)*p>126)return 0;}
 if(fields!=7 || !domain_allowed(parts[0]) || (strcmp(parts[1],"TRUE") && strcmp(parts[1],"FALSE")) || strcmp(parts[2],"/") || (strcmp(parts[3],"TRUE") && strcmp(parts[3],"FALSE")) || !*parts[4] || strlen(parts[4])>12 || strspn(parts[4],"0123456789")!=strlen(parts[4]))return 0;
 if(strcmp(parts[5],"SESSDATA") && strcmp(parts[5],"bili_jct") && strcmp(parts[5],"DedeUserID") && strcmp(parts[5],"DedeUserID__ckMd5"))return 0;
 if(!*parts[6] || strlen(parts[6])>1536 || strchr(parts[6],';'))return 0;return 1;
}
AUTH_EXPORT int auth_input_ptr(void){return (int)(size_t)input;}
AUTH_EXPORT int auth_input_capacity(void){return AUTH_PRIVATE_CAP;}
AUTH_EXPORT int auth_body_ptr(void){return (int)(size_t)body;}
AUTH_EXPORT int auth_body_length(void){return (int)body_size;}
AUTH_EXPORT int auth_http_status(void){return (int)http_status;}
AUTH_EXPORT int auth_curl_status(void){return result_code;}
AUTH_EXPORT void auth_response_clear(void){wipe_response();}
AUTH_EXPORT int auth_import_cookies(int length){
 if(!live || active>=0 || length<1 || length>AUTH_PRIVATE_CAP || input[length]!=0 || memchr(input,0,(size_t)length))return 0;
 char copy[AUTH_PRIVATE_CAP+1];memcpy(copy,input,(size_t)length+1);int count=0,valid=1;char *save=NULL;
 for(char *line=strtok_r(copy,"\n",&save);line;line=strtok_r(NULL,"\n",&save)){
  char checked[2049];size_t n=strlen(line);if(n>=sizeof(checked)){valid=0;break;}memcpy(checked,line,n+1);int good=cookie_line(checked);OPENSSL_cleanse(checked,sizeof(checked));
  if(!good || ++count>4 || curl_easy_setopt(easy,CURLOPT_COOKIELIST,line)!=CURLE_OK){valid=0;break;}
 }
 OPENSSL_cleanse(copy,sizeof(copy));OPENSSL_cleanse(input,sizeof(input));if(count<2)valid=0;
 if(!valid)curl_easy_setopt(easy,CURLOPT_COOKIELIST,"ALL");return valid;
}
AUTH_EXPORT int auth_begin(int operation){
 if(!live || active>=0 || operation<0 || operation>5 || now_ms()<0 || now_ms()>=session_until)return 0;
 const char *url=fixed_urls[0];
 if(operation==1){
  size_t n=strlen(input);if(n<1 || n>2 || strspn(input,"0123456789")!=n || input[0]=='0')return 0;
  int page=atoi(input);if(page<1 || page>25)return 0;
  snprintf(request_url,sizeof(request_url),"https://api.bilibili.com/x/v2/medialist/toview/web?mobi_app=web&ps=4&desc=true&otype=2&with_current=false&direction=false&preview=0&use_pn=true&pn=%d",page);url=request_url;
 }
 if(operation==2){
  char cursor[64];size_t length=strlen(input);if(length<4 || length>=sizeof(cursor))return 0;memcpy(cursor,input,length+1);
  char *first=strchr(cursor,'|');if(!first)return 0;*first++=0;char *second=strchr(first,'|');if(!second || strchr(second+1,'|'))return 0;*second++=0;
  size_t m=strlen(cursor),t=strlen(first);if(m<1 || m>20 || t<1 || t>10 || strspn(cursor,"0123456789")!=m || strspn(first,"0123456789")!=t || (m>1&&cursor[0]=='0') || (t>1&&first[0]=='0') || (m==20&&strcmp(cursor,"18446744073709551615")>0) || (t==10&&strcmp(first,"4294967295")>0))return 0;
  if(!*second){if(strcmp(cursor,"0")||strcmp(first,"0"))return 0;}
  else if(strcmp(second,"archive")&&strcmp(second,"pgc")&&strcmp(second,"live")&&strcmp(second,"article")&&strcmp(second,"article-list")&&strcmp(second,"cheese"))return 0;
  snprintf(request_url,sizeof(request_url),"https://api.bilibili.com/x/web-interface/history/cursor?max=%s&view_at=%s&business=%s",cursor,first,second);url=request_url;
  OPENSSL_cleanse(cursor,sizeof(cursor));
 }
 if(operation==3){if(*input)return 0;url="https://api.bilibili.com/x/v3/fav/folder/list4navigate";}
 if(operation==4){
  char value[24];size_t length=strlen(input);if(length<3 || length>=sizeof(value))return 0;memcpy(value,input,length+1);
  char *part=strchr(value,'|');if(!part || strchr(part+1,'|'))return 0;*part++=0;
  size_t n=strlen(value),m=strlen(part);if(n<1 || n>16 || value[0]=='0' || strspn(value,"0123456789")!=n || m<1 || m>2 || part[0]=='0' || strspn(part,"0123456789")!=m)return 0;
  int page=atoi(part);if(page<1 || page>25)return 0;
  snprintf(request_url,sizeof(request_url),"https://api.bilibili.com/x/v2/medialist/resource/list?mobi_app=web&type=3&biz_id=%s&ps=4&desc=true&sort_field=3&tid=0&otype=2&with_current=false&direction=false&preview=0&use_pn=true&pn=%d",value,page);url=request_url;
  OPENSSL_cleanse(value,sizeof(value));
 }
 if(operation==5){
  size_t length=strlen(input);if(length>1024)return 0;for(size_t i=0;i<length;i++)if((unsigned char)input[i]<33 || (unsigned char)input[i]>126)return 0;
  char *offset=curl_easy_escape(easy,input,(int)length);if(!offset)return 0;
  int size=snprintf(request_url,sizeof(request_url),"https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/nav?update_baseline=&offset=%s",offset);curl_free(offset);if(size<0 || (size_t)size>=sizeof(request_url))return 0;url=request_url;
 }
 OPENSSL_cleanse(input,sizeof(input));wipe_response();header_size=0;http_status=0;result_code=-1;
 if(curl_easy_setopt(easy,CURLOPT_REFERER,operation==2?"https://www.bilibili.com/account/history":operation>=3?"https://www.bilibili.com/":"https://www.bilibili.com/list/watchlater")!=CURLE_OK || curl_easy_setopt(easy,CURLOPT_URL,url)!=CURLE_OK || curl_multi_add_handle(multi,easy)!=CURLM_OK)return 0;
 active=operation;added=1;request_until=now_ms()+9000;return 1;
}
AUTH_EXPORT void auth_stop(void){if(live)finish();}
static void tick(void){
 if(!live)return;double now=now_ms();if(now<0 || now>=session_until || (active>=0 && now>=request_until)){emit("AUTH:deadline");finish();return;}
 if(active<0)return;int running=0;if(curl_multi_perform(multi,&running)!=CURLM_OK){emit("AUTH:transport");finish();return;}
 int left;CURLMsg *message;
 while((message=curl_multi_info_read(multi,&left))){
  if(message->msg!=CURLMSG_DONE || message->easy_handle!=easy){emit("AUTH:transport");finish();return;}
  result_code=(int)message->data.result;
  if(curl_easy_getinfo(easy,CURLINFO_RESPONSE_CODE,&http_status)!=CURLE_OK)http_status=0;
  if(curl_multi_remove_handle(multi,easy)!=CURLM_OK){bad_close=1;finish();return;}added=0;int operation=active;active=-1;
  printf("AUTH:response:%d\n",operation);fflush(stdout);return;
 }
}
static int start(void){
 if(live || easy || multi || bad_close)return 0;
 if(curl_global_init(CURL_GLOBAL_DEFAULT)!=CURLE_OK)return 0;initialized=1;easy=curl_easy_init();multi=curl_multi_init();if(!easy || !multi){finish();return 0;}
#define SET(option,value) do {if(curl_easy_setopt(easy,option,value)!=CURLE_OK){finish();return 0;}} while(0)
 SET(CURLOPT_COOKIEFILE,"");SET(CURLOPT_FOLLOWLOCATION,0L);SET(CURLOPT_PROTOCOLS_STR,"https");SET(CURLOPT_REDIR_PROTOCOLS_STR,"https");
 SET(CURLOPT_PROXY,"");SET(CURLOPT_NOPROXY,"*");SET(CURLOPT_USERAGENT,"BiliSofa/0.0.0");SET(CURLOPT_REFERER,"https://www.bilibili.com/list/watchlater");
 SET(CURLOPT_SSL_VERIFYPEER,1L);SET(CURLOPT_SSL_VERIFYHOST,2L);SET(CURLOPT_CAINFO,"/cacert.pem");
 SET(CURLOPT_CONNECTTIMEOUT_MS,4000L);SET(CURLOPT_TIMEOUT_MS,8000L);SET(CURLOPT_NOSIGNAL,1L);SET(CURLOPT_HTTPGET,1L);
 SET(CURLOPT_WRITEFUNCTION,body_cb);SET(CURLOPT_HEADERFUNCTION,header_cb);
#undef SET
 live=1;session_until=now_ms()+20000;if(now_ms()<0){finish();return 0;}emit("AUTH:ready");return 1;
}
#ifndef AUTH_NO_MAIN
int main(void){
 if(!start())return 1;
#ifdef __EMSCRIPTEN__
 emscripten_set_main_loop(tick,40,0);
#else
 while(live){tick();struct timespec wait={0,10000000};nanosleep(&wait,NULL);}
#endif
 return 0;
}
#endif
