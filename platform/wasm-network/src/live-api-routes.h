#include "service-config.h"
/* Original fixed live reads. This lane accepts IDs, never caller API URLs or
 * POSTs. Signed area queries match the current official browser middleware. */
#ifndef BILISOFA_LIVE_API_ROUTES_H
#define BILISOFA_LIVE_API_ROUTES_H
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <openssl/evp.h>
#include <openssl/crypto.h>
#include "vod-source-policy.h"
static int live_api_zero_id(const char *s) {return !strcmp(s,"0")||guest_cid_valid(s);}
static int live_api_page(const char *s) {return guest_cid_valid(s)&&strlen(s)<=5&&strtol(s,NULL,10)<=25000;}
static int live_area_signed(char *input,char *url,size_t capacity) {
  char *parts[6]={input};int count=1;
  for(char *p=input;*p;p++)if(*p=='|'){if(count>=6)return 0;*p=0;parts[count++]=p+1;}
  if(count!=6||!guest_cid_valid(parts[0])||!live_api_zero_id(parts[1])||!live_api_page(parts[2])||strlen(parts[3])!=32||strlen(parts[4])!=32||strspn(parts[3],"0123456789abcdef")!=32||strspn(parts[4],"0123456789abcdef")!=32||strlen(parts[5])!=10||strspn(parts[5],"0123456789")!=10)return 0;
  long long epoch=strtoll(parts[5],NULL,10),now=(long long)time(NULL);if(now<1700000000LL||now>4102444800LL||epoch<now-30||epoch>now+30)return 0;
  const unsigned char indices[32]={46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13};
  char joined[65],mix[33]={0},query[256],signed_query[289],hex[33];snprintf(joined,sizeof(joined),"%s%s",parts[3],parts[4]);for(int i=0;i<32;i++)mix[i]=joined[indices[i]];
  int n=snprintf(query,sizeof(query),"area_id=%s&page=%s&parent_area_id=%s&platform=web&sort_type=&vajra_business_key=&wts=%s",parts[1],parts[2],parts[0],parts[5]);if(n<1||(size_t)n>=sizeof(query))return 0;
  n=snprintf(signed_query,sizeof(signed_query),"%s%s",query,mix);unsigned char digest[EVP_MAX_MD_SIZE];unsigned length=0;
  if(n<1||(size_t)n>=sizeof(signed_query)||EVP_Digest(signed_query,(size_t)n,digest,&length,EVP_md5(),NULL)!=1||length!=16)return 0;
  for(int i=0;i<16;i++)snprintf(hex+i*2,3,"%02x",digest[i]);
  n=snprintf(url,capacity,SERVICE_ADDRESS_A_0A40BBD53142,query,hex);
  OPENSSL_cleanse(joined,sizeof(joined));OPENSSL_cleanse(mix,sizeof(mix));OPENSSL_cleanse(signed_query,sizeof(signed_query));return n>0&&(size_t)n<capacity;
}
static int live_api_route(int operation,char *input,char *url,size_t capacity) {
  int n;
  if(operation==9||operation==10||operation==15){
    if(*input)return 0;const char *route=operation==9?"/xlive/web-interface/v1/index/getList?platform=web":operation==10?"/room/v1/area/getList":"/xlive/web-ucenter/user/get_user_info";
    n=snprintf(url,capacity,SERVICE_ADDRESS_A_6E614EA5EDD1,route);
  } else if(operation==11)return live_area_signed(input,url,capacity);
  else if(operation==12){if(!live_api_page(input))return 0;n=snprintf(url,capacity,SERVICE_ADDRESS_A_A86E487A28DF,input);}
  else if(operation==13){if(!guest_cid_valid(input))return 0;n=snprintf(url,capacity,SERVICE_ADDRESS_A_82FBB9942B62,input);}
  else if(operation==14){
    char *qn=strchr(input,'|');if(!qn||strchr(qn+1,'|'))return 0;*qn++=0;
    if(!guest_cid_valid(input)||!live_api_zero_id(qn)||strlen(qn)>6||strtol(qn,NULL,10)>100000)return 0;
    n=snprintf(url,capacity,SERVICE_ADDRESS_A_6E3E23F54C2E,input,!strcmp(qn,"0")?"80":qn);
  } else return 0;
  return n>0&&(size_t)n<capacity;
}
#define BILISOFA_MAX_READ_OPERATION 15
#define BILISOFA_OPERATION_ALLOWED(operation) ((operation)==0||((operation)>=9&&(operation)<=15))
#define BILISOFA_EXTRA_READ live_api_route
#define BILISOFA_EXTRA_COOKIE_DOMAIN(s) (!strcasecmp((s),SERVICE_ADDRESS_A_CAA0A0BADD0B))
#endif
