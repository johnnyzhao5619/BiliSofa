/* Original W02 identity-only HTTPS transport: QR generate/poll and nav GET. */
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
#define AUTH_CAP 131072
#define AUTH_PRIVATE_CAP 4096
static CURL *easy;
static CURLM *multi;
static int initialized, live, active=-1, added, bad_close, result_code;
static long http_status;
static char body[AUTH_CAP+1], input[AUTH_PRIVATE_CAP+1], cookie_output[AUTH_PRIVATE_CAP+1], request_url[256];
static size_t body_size, header_size, cookie_size;
static double session_until, request_until;
static const char *const fixed_urls[]={
 "https://passport.bilibili.com/x/passport-login/web/qrcode/generate",
 NULL,
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
 wipe_response();OPENSSL_cleanse(input,sizeof(input));OPENSSL_cleanse(cookie_output,sizeof(cookie_output));OPENSSL_cleanse(request_url,sizeof(request_url));cookie_size=0;
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
static int useful_name(const char *line){
 int tabs=0;const char *name=NULL;for(const char *p=line;*p;p++)if(*p=='\t' && ++tabs==5){name=p+1;break;}
 if(!name)return 0;const char *end=strchr(name,'\t');if(!end)return 0;
 const char *names[]={"SESSDATA","bili_jct","DedeUserID","DedeUserID__ckMd5"};
 for(int i=0;i<4;i++)if((size_t)(end-name)==strlen(names[i]) && !memcmp(name,names[i],strlen(names[i])))return 1;return 0;
}
AUTH_EXPORT int auth_input_ptr(void){return (int)(size_t)input;}
AUTH_EXPORT int auth_input_capacity(void){return AUTH_PRIVATE_CAP;}
AUTH_EXPORT int auth_body_ptr(void){return (int)(size_t)body;}
AUTH_EXPORT int auth_body_length(void){return (int)body_size;}
AUTH_EXPORT int auth_http_status(void){return (int)http_status;}
AUTH_EXPORT int auth_curl_status(void){return result_code;}
AUTH_EXPORT void auth_response_clear(void){wipe_response();}
AUTH_EXPORT int auth_cookie_ptr(void){return (int)(size_t)cookie_output;}
AUTH_EXPORT int auth_cookie_length(void){return (int)cookie_size;}
AUTH_EXPORT void auth_cookie_clear(void){OPENSSL_cleanse(cookie_output,sizeof(cookie_output));cookie_size=0;}
AUTH_EXPORT int auth_export_cookies(void){
 auth_cookie_clear();if(!live || active>=0)return 0;struct curl_slist *list=NULL;
 if(curl_easy_getinfo(easy,CURLINFO_COOKIELIST,&list)!=CURLE_OK)return 0;
 int count=0,valid=1;for(struct curl_slist *p=list;p;p=p->next)if(useful_name(p->data)){
  size_t n=strlen(p->data);char copy[2049];if(n>=sizeof(copy)){valid=0;break;}memcpy(copy,p->data,n+1);int ok=cookie_line(copy);OPENSSL_cleanse(copy,sizeof(copy));
  if(!ok || ++count>4 || n+1>AUTH_PRIVATE_CAP-cookie_size){valid=0;break;}
  memcpy(cookie_output+cookie_size,p->data,n);cookie_size+=n;cookie_output[cookie_size++]='\n';cookie_output[cookie_size]=0;
 }
 for(struct curl_slist *p=list;p;p=p->next)OPENSSL_cleanse(p->data,strlen(p->data));curl_slist_free_all(list);
 if(!valid || count<2){auth_cookie_clear();return 0;}return 1;
}
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
 if(!live || active>=0 || operation<0 || operation>2 || now_ms()<0 || now_ms()>=session_until)return 0;
 const char *url=fixed_urls[operation];
 if(operation==1){if(strlen(input)!=32 || strspn(input,"0123456789abcdef")!=32)return 0;snprintf(request_url,sizeof(request_url),"https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key=%s",input);url=request_url;}
 OPENSSL_cleanse(input,sizeof(input));wipe_response();header_size=0;http_status=0;result_code=-1;
 if(curl_easy_setopt(easy,CURLOPT_URL,url)!=CURLE_OK || curl_multi_add_handle(multi,easy)!=CURLM_OK)return 0;
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
 SET(CURLOPT_PROXY,"");SET(CURLOPT_NOPROXY,"*");SET(CURLOPT_USERAGENT,"BiliSofa/0.0.0");SET(CURLOPT_REFERER,"https://passport.bilibili.com/login");
 SET(CURLOPT_SSL_VERIFYPEER,1L);SET(CURLOPT_SSL_VERIFYHOST,2L);SET(CURLOPT_CAINFO,"/cacert.pem");
 SET(CURLOPT_CONNECTTIMEOUT_MS,4000L);SET(CURLOPT_TIMEOUT_MS,8000L);SET(CURLOPT_NOSIGNAL,1L);SET(CURLOPT_HTTPGET,1L);
 SET(CURLOPT_WRITEFUNCTION,body_cb);SET(CURLOPT_HEADERFUNCTION,header_cb);
#undef SET
 live=1;session_until=now_ms()+240000;if(now_ms()<0){finish();return 0;}emit("AUTH:ready");return 1;
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
