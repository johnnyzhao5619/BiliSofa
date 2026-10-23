/* Read-only legacy/current player API comparison. No heartbeat/POST program. */
static void readback_wipe(void);
#define AUTH_EXTRA_CLEANUP readback_wipe
#define AUTH_NO_MAIN
#define auth_begin auth_begin_legacy
#include "account-probe.c"
#undef auth_begin
#include <openssl/evp.h>
static char readback_url[384];
static int readback_prepared;
static void readback_wipe(void){OPENSSL_cleanse(readback_url,sizeof(readback_url));readback_prepared=0;}
AUTH_EXPORT int auth_readback_prepare(int length){
 if(!live||active>=0||length<1||length>100||input[length]||memchr(input,0,(size_t)length))return 0;
 char copy[101],joined[65]={0},mix[33]={0},query[128]={0},signed_query[161]={0},hex[33]={0};unsigned char sum[EVP_MAX_MD_SIZE];unsigned int size=0;int ok=0;
 memcpy(copy,input,(size_t)length+1);OPENSSL_cleanse(input,sizeof(input));char *save=NULL,*parts[4]={0};int count=0;
 for(char *v=strtok_r(copy,"\n",&save);v&&count<4;v=strtok_r(NULL,"\n",&save))parts[count++]=v;
 if(count!=3||strlen(parts[0])!=32||strspn(parts[0],"0123456789abcdef")!=32||strlen(parts[1])!=32||strspn(parts[1],"0123456789abcdef")!=32||strlen(parts[2])!=10||strspn(parts[2],"0123456789")!=10)goto done;
 long long epoch=strtoll(parts[2],NULL,10),clock=(long long)time(NULL);if(epoch<1700000000LL||epoch>4102444800LL||epoch<clock-30||epoch>clock+30)goto done;
 snprintf(joined,sizeof(joined),"%s%s",parts[0],parts[1]);
 const unsigned char indices[32]={46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13};for(int i=0;i<32;i++)mix[i]=joined[indices[i]];
 int n=snprintf(query,sizeof(query),"aid=117400733288351&cid=42548528128&wts=%s",parts[2]);if(n<0||(size_t)n>=sizeof(query))goto done;
 n=snprintf(signed_query,sizeof(signed_query),"%s%s",query,mix);if(n<0||(size_t)n>=sizeof(signed_query)||EVP_Digest(signed_query,(size_t)n,sum,&size,EVP_md5(),NULL)!=1||size!=16)goto done;
 for(int i=0;i<16;i++)snprintf(hex+i*2,3,"%02x",sum[i]);
 n=snprintf(readback_url,sizeof(readback_url),"https://api.bilibili.com/x/player/wbi/v2?%s&w_rid=%s",query,hex);if(n<0||(size_t)n>=sizeof(readback_url))goto done;
 readback_prepared=ok=1;
done:
 OPENSSL_cleanse(copy,sizeof(copy));OPENSSL_cleanse(joined,sizeof(joined));OPENSSL_cleanse(mix,sizeof(mix));OPENSSL_cleanse(query,sizeof(query));OPENSSL_cleanse(signed_query,sizeof(signed_query));OPENSSL_cleanse(hex,sizeof(hex));OPENSSL_cleanse(sum,sizeof(sum));if(!ok)readback_wipe();return ok;
}
AUTH_EXPORT int auth_begin(int operation){
 if(operation!=5)return auth_begin_legacy(operation);
 if(!live||active>=0||!readback_prepared||now_ms()<0||now_ms()>=session_until)return 0;
 readback_prepared=0;wipe_response();header_size=0;http_status=0;result_code=-1;
 if(curl_easy_setopt(easy,CURLOPT_URL,readback_url)!=CURLE_OK||curl_easy_setopt(easy,CURLOPT_HTTPGET,1L)!=CURLE_OK||curl_multi_add_handle(multi,easy)!=CURLM_OK)return 0;
 active=5;added=1;request_until=now_ms()+9000;return 1;
}
#ifndef READBACK_NO_MAIN
int main(void){if(!start())return 1;
#ifdef __EMSCRIPTEN__
 emscripten_set_main_loop(tick,40,0);
#else
 while(live){tick();struct timespec wait={0,10000000};nanosleep(&wait,NULL);}
#endif
 return 0;}
#endif
