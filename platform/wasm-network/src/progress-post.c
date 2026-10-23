/* Original single-intent G3 progress candidate. Default account-probe has no POST. */
static void progress_wipe(void);
#define AUTH_EXTRA_CLEANUP progress_wipe
#define AUTH_NO_MAIN
#include "account-probe.c"
#include <openssl/evp.h>
static char progress_url[1024],progress_form[1024];
static int progress_prepared,progress_attempted;
static struct curl_slist *progress_headers;
static void progress_wipe(void){
 OPENSSL_cleanse(progress_url,sizeof(progress_url));OPENSSL_cleanse(progress_form,sizeof(progress_form));
 curl_slist_free_all(progress_headers);progress_headers=NULL;progress_prepared=0;
}
static int progress_csrf(char out[33]){
 struct curl_slist *list=NULL;if(curl_easy_getinfo(easy,CURLINFO_COOKIELIST,&list)!=CURLE_OK)return 0;int count=0;
 for(struct curl_slist *p=list;p;p=p->next){
  if(strlen(p->data)>2048)continue;char copy[2049];strcpy(copy,p->data);char *parts[7]={copy};int fields=1;
  for(char *q=copy;*q;q++)if(*q=='\t'&&fields<7){*q=0;parts[fields++]=q+1;}
  char *domain=parts[0];if(!strncmp(domain,"#HttpOnly_",10))domain+=10;
  if(fields==7&&domain_allowed(domain)&&!strcmp(parts[2],"/")&&!strcmp(parts[5],"bili_jct")&&strlen(parts[6])==32&&strspn(parts[6],"0123456789abcdef")==32){strcpy(out,parts[6]);count++;}
  OPENSSL_cleanse(copy,sizeof(copy));
 }
 for(struct curl_slist *p=list;p;p=p->next)OPENSSL_cleanse(p->data,strlen(p->data));curl_slist_free_all(list);return count==1;
}
AUTH_EXPORT int progress_prepare(int length){
 if(!live||active>=0||progress_attempted||length<1||length>160||input[length]||memchr(input,0,(size_t)length))return 0;
 char copy[161],csrf[33]={0},mix[33]={0},joined[65]={0},query[768],signed_query[801],hex[33];unsigned char sum[EVP_MAX_MD_SIZE];unsigned int size=0;int ok=0;
 memcpy(copy,input,(size_t)length+1);OPENSSL_cleanse(input,sizeof(input));char *save=NULL,*parts[5]={0};int count=0;
 for(char *v=strtok_r(copy,"\n",&save);v&&count<5;v=strtok_r(NULL,"\n",&save))parts[count++]=v;
 if(count!=4||strlen(parts[0])<1||strlen(parts[0])>16||parts[0][0]=='0'||strspn(parts[0],"0123456789")!=strlen(parts[0])||strlen(parts[1])!=32||strspn(parts[1],"0123456789abcdef")!=32||strlen(parts[2])!=32||strspn(parts[2],"0123456789abcdef")!=32||strlen(parts[3])!=10||strspn(parts[3],"0123456789")!=10)goto done;
 long long epoch=strtoll(parts[3],NULL,10),clock=(long long)time(NULL);if(epoch<1700000000LL||epoch>4102444800LL||epoch<clock-30||epoch>clock+30||!progress_csrf(csrf))goto done;
 snprintf(joined,sizeof(joined),"%s%s",parts[1],parts[2]);
 const unsigned char indices[32]={46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13};
 for(int i=0;i<32;i++)mix[i]=joined[indices[i]];
 int n=snprintf(query,sizeof(query),"w_aid=117400733288351&w_dt=2&w_last_play_progress_time=15&w_mid=%s&w_played_time=15&w_real_played_time=0&w_realtime=0&w_start_ts=%s&w_video_duration=95&wts=%s",parts[0],parts[3],parts[3]);
 if(n<0||(size_t)n>=sizeof(query))goto done;n=snprintf(signed_query,sizeof(signed_query),"%s%s",query,mix);if(n<0||(size_t)n>=sizeof(signed_query)||EVP_Digest(signed_query,(size_t)n,sum,&size,EVP_md5(),NULL)!=1||size!=16)goto done;
 for(int i=0;i<16;i++)snprintf(hex+i*2,3,"%02x",sum[i]);
 n=snprintf(progress_url,sizeof(progress_url),"https://api.bilibili.com/x/click-interface/web/heartbeat?%s&w_rid=%s",query,hex);if(n<0||(size_t)n>=sizeof(progress_url))goto done;
 n=snprintf(progress_form,sizeof(progress_form),"aid=117400733288351&cid=42548528128&mid=%s&type=3&dt=2&play_type=4&played_time=15&last_play_progress_time=15&max_play_progress_time=15&video_duration=95&realtime=0&real_played_time=0&start_ts=%s&csrf=%s",parts[0],parts[3],csrf);if(n<0||(size_t)n>=sizeof(progress_form))goto done;
 progress_prepared=ok=1;
done:
 OPENSSL_cleanse(copy,sizeof(copy));OPENSSL_cleanse(csrf,sizeof(csrf));OPENSSL_cleanse(mix,sizeof(mix));OPENSSL_cleanse(joined,sizeof(joined));OPENSSL_cleanse(query,sizeof(query));OPENSSL_cleanse(signed_query,sizeof(signed_query));OPENSSL_cleanse(sum,sizeof(sum));OPENSSL_cleanse(hex,sizeof(hex));if(!ok)progress_wipe();return ok;
}
AUTH_EXPORT int progress_attempt(void){
 if(!live||active>=0||!progress_prepared||progress_attempted||now_ms()<0||now_ms()>=session_until)return 0;
 progress_attempted=1;struct curl_slist *next=curl_slist_append(NULL,"Content-Type: application/x-www-form-urlencoded");if(!next)return 0;progress_headers=next;
 next=curl_slist_append(progress_headers,"Origin: https://www.bilibili.com");if(!next)return 0;progress_headers=next;
 wipe_response();header_size=0;http_status=0;result_code=-1;
#define POST_SET(option,value) do{if(curl_easy_setopt(easy,option,value)!=CURLE_OK)return 0;}while(0)
 POST_SET(CURLOPT_URL,progress_url);POST_SET(CURLOPT_REFERER,"https://www.bilibili.com/video/BV14GHy6bE9n/");POST_SET(CURLOPT_HTTPHEADER,progress_headers);POST_SET(CURLOPT_POSTFIELDS,progress_form);POST_SET(CURLOPT_POSTFIELDSIZE,(long)strlen(progress_form));
 POST_SET(CURLOPT_FRESH_CONNECT,1L);POST_SET(CURLOPT_FORBID_REUSE,1L);POST_SET(CURLOPT_HTTP_VERSION,(long)CURL_HTTP_VERSION_1_1);
#undef POST_SET
 if(curl_multi_add_handle(multi,easy)!=CURLM_OK)return 0;active=5;added=1;request_until=now_ms()+9000;return 1;
}
#ifndef PROGRESS_NO_MAIN
int main(void){if(!start())return 1;
#ifdef __EMSCRIPTEN__
 emscripten_set_main_loop(tick,40,0);
#else
 while(live){tick();struct timespec wait={0,10000000};nanosleep(&wait,NULL);}
#endif
 return 0;}
#endif
