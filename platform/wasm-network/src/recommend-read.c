#include "service-config.h"
/* New fixed read-only route; reuse the audited isolated jar/cleanup engine. */
#define AUTH_NO_MAIN
#include "library.c"
#include <openssl/evp.h>
static int recommend_digits(const char *s){size_t n=strlen(s);return n>0&&n<=7&&strspn(s,"0123456789")==n&&(n==1||*s!='0')&&strtoul(s,NULL,10)<=1000000;}
AUTH_EXPORT int recommend_begin(void){
 if(!live||active>=0||now_ms()<0||now_ms()>=session_until)return 0;
 char copy[4097];const char *end=memchr(input,0,sizeof(input));if(!end){OPENSSL_cleanse(input,sizeof(input));return 0;}size_t n=(size_t)(end-input);if(!n||n>4096)return 0;memcpy(copy,input,n+1);char *part[7]={copy};int count=1;
 for(char *p=copy;*p;p++)if(*p=='|'){if(count>=7)goto invalid;*p=0;part[count++]=p+1;}
 if(count!=7||!recommend_digits(part[0])||!recommend_digits(part[1])||!recommend_digits(part[2])||(strcmp(part[0],"0")&&strcmp(part[0],"4")&&strcmp(part[0],"5")))goto invalid;
 if(strlen(part[3])>3000||strspn(part[3],"abcdefghijklmnopqrstuvwxyz_0123456789,")!=strlen(part[3]))goto invalid;
 for(int i=4;i<=5;i++)if(strlen(part[i])!=32||strspn(part[i],"0123456789abcdef")!=32)goto invalid;
 if(strlen(part[6])!=10||strspn(part[6],"0123456789")!=10||llabs(strtoll(part[6],NULL,10)-(long long)time(NULL))>30)goto invalid;
 char joined[65],mix[33]={0},query[3800],signed_query[3840],hex[33];snprintf(joined,sizeof(joined),"%s%s",part[4],part[5]);const unsigned char indices[32]={46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13};for(int i=0;i<32;i++)mix[i]=joined[indices[i]];
 char *shown=curl_easy_escape(easy,part[3],0);if(!shown)goto invalid;
 int length=snprintf(query,sizeof(query),"brush=%s&feed_version=V8&fetch_row=%lu&fresh_idx=%s&fresh_idx_1h=%s&fresh_type=%s&homepage_ver=1&last_showlist=%s&ps=12&web_location=1430650&wts=%s",part[2],1+3*strtoul(part[1],NULL,10),part[1],part[1],part[0],shown,part[6]);curl_free(shown);if(length<1||(size_t)length>=sizeof(query))goto invalid;
 length=snprintf(signed_query,sizeof(signed_query),"%s%s",query,mix);if(length<1||(size_t)length>=sizeof(signed_query))goto invalid;
 unsigned char digest[EVP_MAX_MD_SIZE];unsigned int size=0;if(EVP_Digest(signed_query,(size_t)length,digest,&size,EVP_md5(),NULL)!=1||size!=16)goto invalid;for(int i=0;i<16;i++)snprintf(hex+i*2,3,"%02x",digest[i]);
 length=snprintf(request_url,sizeof(request_url),SERVICE_ADDRESS_A_A0EB0D5362E6,query,hex);if(length<1||(size_t)length>=sizeof(request_url))goto invalid;
 OPENSSL_cleanse(copy,sizeof(copy));OPENSSL_cleanse(input,sizeof(input));wipe_response();header_size=0;http_status=0;result_code=-1;
 if(curl_easy_setopt(easy,CURLOPT_HTTPGET,1L)!=CURLE_OK||curl_easy_setopt(easy,CURLOPT_REFERER,SERVICE_ADDRESS_A_B12964D8C1B1)!=CURLE_OK||curl_easy_setopt(easy,CURLOPT_URL,request_url)!=CURLE_OK||curl_multi_add_handle(multi,easy)!=CURLM_OK)return 0;
 active=6;added=1;request_until=now_ms()+9000;return 1;
invalid:OPENSSL_cleanse(copy,sizeof(copy));OPENSSL_cleanse(input,sizeof(input));return 0;
}
#ifndef RECOMMEND_NO_MAIN
int main(void){if(!start())return 1;
#ifdef __EMSCRIPTEN__
 emscripten_set_main_loop(tick,40,0);
#else
 while(live){tick();struct timespec wait={0,10000000};nanosleep(&wait,NULL);}
#endif
 return 0;}
#endif
