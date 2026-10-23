/* Dedicated authenticated follow lane. No caller URL, playback, CDN or other
 * account write route. One explicit action per Worker; the caller journals it. */
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <time.h>
#include <curl/curl.h>
#include <openssl/crypto.h>
#include <openssl/evp.h>
#include "vod-source-policy.h"
static char follow_form[96];
static struct curl_slist *follow_headers;
static int follow_list(char *input,char *url,size_t capacity){
  char *parts[6]={input};int count=1;
  for(char *p=input;*p;p++)if(*p=='|'){if(count>=6)return 0;*p=0;parts[count++]=p+1;}
  if(count!=6||!guest_cid_valid(parts[0])||(strcmp(parts[1],"1")&&strcmp(parts[1],"2"))||!guest_cid_valid(parts[2])||strlen(parts[2])>5||strtol(parts[2],NULL,10)>25000||strlen(parts[3])!=32||strlen(parts[4])!=32||strspn(parts[3],"0123456789abcdef")!=32||strspn(parts[4],"0123456789abcdef")!=32||strlen(parts[5])!=10||strspn(parts[5],"0123456789")!=10)return 0;
  long long epoch=strtoll(parts[5],NULL,10),now=(long long)time(NULL);if(now<1700000000LL||now>4102444800LL||epoch<now-30||epoch>now+30)return 0;
  const unsigned char indices[32]={46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13};
  char joined[65],mix[33]={0},query[256],signed_query[289],hex[33];snprintf(joined,sizeof(joined),"%s%s",parts[3],parts[4]);for(int i=0;i<32;i++)mix[i]=joined[indices[i]];
  int n=snprintf(query,sizeof(query),"follow_status=0&playform=web&pn=%s&ps=4&type=%s&vmid=%s&wts=%s",parts[2],parts[1],parts[0],parts[5]);if(n<1||(size_t)n>=sizeof(query))return 0;
  n=snprintf(signed_query,sizeof(signed_query),"%s%s",query,mix);unsigned char digest[EVP_MAX_MD_SIZE];unsigned length=0;
  if(n<1||(size_t)n>=sizeof(signed_query)||EVP_Digest(signed_query,(size_t)n,digest,&length,EVP_md5(),NULL)!=1||length!=16)return 0;
  for(int i=0;i<16;i++)snprintf(hex+i*2,3,"%02x",digest[i]);
  n=snprintf(url,capacity,"https://api.bilibili.com/x/space/bangumi/follow/list?%s&w_rid=%s",query,hex);
  OPENSSL_cleanse(joined,sizeof(joined));OPENSSL_cleanse(mix,sizeof(mix));OPENSSL_cleanse(signed_query,sizeof(signed_query));return n>0&&(size_t)n<capacity;
}
static void follow_cleanup(void) {
  OPENSSL_cleanse(follow_form, sizeof(follow_form));
  curl_slist_free_all(follow_headers); follow_headers = NULL;
}
static int follow_route(int operation, char *input, char *url, size_t capacity) {
  int n;
  if (operation == 4) {
    if (!guest_cid_valid(input)) return 0;
    n = snprintf(url, capacity, "https://api.bilibili.com/pgc/view/web/season?season_id=%s", input);
  } else if (operation == 6) {
    return follow_list(input,url,capacity);
  } else if (operation == 7 || operation == 8) {
    char *csrf = strchr(input, '|');
    if (!csrf || strchr(csrf + 1, '|')) return 0; *csrf++ = 0;
    if (!guest_cid_valid(input) || strlen(csrf)!=32 || strspn(csrf,"0123456789abcdef")!=32) return 0;
    int length=snprintf(follow_form,sizeof(follow_form),"season_id=%s&csrf=%s",input,csrf);
    if(length<1 || (size_t)length>=sizeof(follow_form)) return 0;
    n=snprintf(url,capacity,"https://api.bilibili.com/pgc/web/follow/%s",operation==7?"add":"del");
  } else return 0;
  return n>0 && (size_t)n<capacity;
}
static int follow_prepare(CURL *easy, int operation) {
  if (operation==7 || operation==8) {
    if (!follow_headers) follow_headers=curl_slist_append(NULL,"Content-Type: application/x-www-form-urlencoded");
    if (!follow_headers) return 0;
    return curl_easy_setopt(easy,CURLOPT_HTTPHEADER,follow_headers)==CURLE_OK &&
      curl_easy_setopt(easy,CURLOPT_POSTFIELDS,follow_form)==CURLE_OK &&
      curl_easy_setopt(easy,CURLOPT_POSTFIELDSIZE,(long)strlen(follow_form))==CURLE_OK;
  }
  /* Reusing a lane must not turn a subsequent Nav/state read into a POST. */
  return curl_easy_setopt(easy,CURLOPT_HTTPHEADER,NULL)==CURLE_OK &&
    curl_easy_setopt(easy,CURLOPT_POSTFIELDS,NULL)==CURLE_OK &&
    curl_easy_setopt(easy,CURLOPT_HTTPGET,1L)==CURLE_OK;
}
#define BILISOFA_MAX_READ_OPERATION 8
#define BILISOFA_OPERATION_ALLOWED(operation) ((operation)==0||(operation)==4||(operation)==6||(operation)==7||(operation)==8)
#define BILISOFA_EXTRA_READ follow_route
#define BILISOFA_PREPARE_OPERATION follow_prepare
#define BILISOFA_EXTRA_CLEANUP follow_cleanup
#include "vod-api.c"
