#include "service-config.h"
/* F10/F15 fixed API GETs only. No arbitrary destinations, CDN or account writes. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <curl/curl.h>
#include <openssl/crypto.h>
#include <openssl/evp.h>
#include "vod-source-policy.h"
static int comment_rpid(const char *s) { return s && *s && *s != '0' && strlen(s)<=20 && strspn(s,"0123456789")==strlen(s); }
static int comment_encoded(const char *s) {
 if(!s||!*s||strlen(s)>1800)return 0;
 for(const char *p=s;*p;p++)if(*p=='%'){if(!p[1]||!p[2]||!strchr("0123456789ABCDEF",p[1])||!strchr("0123456789ABCDEF",p[2]))return 0;p+=2;}else if(!((*p>='a'&&*p<='z')||(*p>='A'&&*p<='Z')||(*p>='0'&&*p<='9')||strchr("-_.~",*p)))return 0;
 return 1;
}
static int comment_extra(int operation,char *input,char *url,size_t capacity) {
 char *parts[6]={input};int count=1,expected=operation==4?6:3;
 if(operation!=4&&operation!=5)return 0;
 for(char *p=input;*p;p++)if(*p=='|'){if(count>=expected)return 0;*p=0;parts[count++]=p+1;}
 if(count!=expected||!guest_cid_valid(parts[0]))return 0;
 if(operation==5){
  if(!comment_rpid(parts[1])||!*parts[2]||strlen(parts[2])>2||strspn(parts[2],"0123456789")!=strlen(parts[2])||parts[2][0]=='0'||atoi(parts[2])>50)return 0;
  int n=snprintf(url,capacity,SERVICE_ADDRESS_A_DEC0E05D76C9,parts[0],parts[2],parts[1]);return n>0&&(size_t)n<capacity;
 }
 if((strcmp(parts[1],"2")&&strcmp(parts[1],"3"))||!comment_encoded(parts[2])||strlen(parts[3])!=32||strlen(parts[4])!=32||strspn(parts[3],"0123456789abcdef")!=32||strspn(parts[4],"0123456789abcdef")!=32||strlen(parts[5])!=10||strspn(parts[5],"0123456789")!=10)return 0;
 long long stamp=strtoll(parts[5],NULL,10),now=(long long)time(NULL);if(now<1700000000LL||now>4102444800LL||stamp<now-30||stamp>now+30)return 0;
 const unsigned char indices[32]={46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13};
 char joined[65],mix[33]={0},query[2200],signing[2240],hex[33];snprintf(joined,sizeof(joined),"%s%s",parts[3],parts[4]);for(int i=0;i<32;i++)mix[i]=joined[indices[i]];
 int n=snprintf(query,sizeof(query),"mode=%s&oid=%s&pagination_str=%s&plat=1&seek_rpid=0&type=1&web_location=1315875&wts=%s",parts[1],parts[0],parts[2],parts[5]);if(n<1||(size_t)n>=sizeof(query))return 0;
 n=snprintf(signing,sizeof(signing),"%s%s",query,mix);unsigned char digest[EVP_MAX_MD_SIZE];unsigned length=0;int okay=n>0&&(size_t)n<sizeof(signing)&&EVP_Digest(signing,(size_t)n,digest,&length,EVP_md5(),NULL)==1&&length==16;
 OPENSSL_cleanse(joined,sizeof(joined));OPENSSL_cleanse(mix,sizeof(mix));OPENSSL_cleanse(signing,sizeof(signing));if(!okay)return 0;for(int i=0;i<16;i++)snprintf(hex+i*2,3,"%02x",digest[i]);
 n=snprintf(url,capacity,SERVICE_ADDRESS_A_812EE5D42CE6,query,hex);return n>0&&(size_t)n<capacity;
}
#define BILISOFA_MAX_READ_OPERATION 5
#define BILISOFA_EXTRA_READ comment_extra
#define BILISOFA_OPERATION_ALLOWED(operation) ((operation)==0||(operation)==1||(operation)==4||(operation)==5)
#include "vod-api.c"
