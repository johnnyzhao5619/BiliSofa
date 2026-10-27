#include "service-config.h"
/* Fixed authenticated video interaction routes. No arbitrary URL, login, media,
 * comment, history progress or other writes. Caller durably journals each POST. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <curl/curl.h>
#include <openssl/crypto.h>
#include "vod-source-policy.h"
static char interaction_form[256];
static struct curl_slist *interaction_headers;
static void interaction_cleanup(void){OPENSSL_cleanse(interaction_form,sizeof(interaction_form));curl_slist_free_all(interaction_headers);interaction_headers=NULL;}
static int interaction_route(int op,char *input,char *url,size_t cap){
 char *p[4]={input};int count=1;for(char *c=input;*c;c++)if(*c=='|'){if(count>=4)return 0;*c=0;p[count++]=c+1;}
 int n=0;
 if(op==4||op==6){if(count!=1||!guest_cid_valid(p[0]))return 0;n=snprintf(url,cap,op==4?SERVICE_ADDRESS_A_958ADB3B5B5C:SERVICE_ADDRESS_A_FD25C8EF1E45,p[0]);}
 else if(op==5){if(count!=2||!guest_cid_valid(p[0])||!guest_cid_valid(p[1]))return 0;n=snprintf(url,cap,SERVICE_ADDRESS_A_E9D4F4A48572,p[0],p[1]);}
 else if(op==7){if(count!=1||*input)return 0;n=snprintf(url,cap,SERVICE_ADDRESS_A_D461D24DEB37);}
 else if(op>=8&&op<=12){
  if(count!=4||!guest_cid_valid(p[0])||strlen(p[3])!=32||strspn(p[3],"0123456789abcdef")!=32)return 0;
  if(op==9){if(!guest_cid_valid(p[2]))return 0;}else if(op==11){if(strcmp(p[2],"0")&&(strcmp(p[2],"1")||strcmp(p[1],"0")))return 0;}else if(strcmp(p[2],"0"))return 0;
  if(op==12){if(strcmp(p[1],"1")&&strcmp(p[1],"2"))return 0;}else if(strcmp(p[1],"0")&&strcmp(p[1],"1"))return 0;
  const int on=atoi(p[1]);int length=0;
  if(op==8){n=snprintf(url,cap,SERVICE_ADDRESS_A_8C102C057226);length=snprintf(interaction_form,sizeof(interaction_form),"aid=%s&like=%d&csrf=%s",p[0],on?1:2,p[3]);}
  if(op==9){n=snprintf(url,cap,SERVICE_ADDRESS_A_78C268044972);length=snprintf(interaction_form,sizeof(interaction_form),"rid=%s&type=2&%s_media_ids=%s&csrf=%s",p[0],on?"add":"del",p[2],p[3]);}
  if(op==10){n=snprintf(url,cap,SERVICE_ADDRESS_A_63BBC07EB963,on?"add":"del");length=snprintf(interaction_form,sizeof(interaction_form),"aid=%s&csrf=%s",p[0],p[3]);}
  if(op==11){n=snprintf(url,cap,SERVICE_ADDRESS_A_4BA371335A4D);length=snprintf(interaction_form,sizeof(interaction_form),"fid=%s&act=%d&re_src=14&csrf=%s",p[0],on?1:!strcmp(p[2],"1")?4:2,p[3]);}
  if(op==12){n=snprintf(url,cap,SERVICE_ADDRESS_A_904947AC7826);length=snprintf(interaction_form,sizeof(interaction_form),"aid=%s&multiply=%s&select_like=0&csrf=%s",p[0],p[1],p[3]);}
  if(length<1||(size_t)length>=sizeof(interaction_form))return 0;
 }else return 0;
 return n>0&&(size_t)n<cap;
}
static int interaction_prepare(CURL *easy,int op){
 if(op>=8&&op<=12){if(!interaction_headers)interaction_headers=curl_slist_append(NULL,"Content-Type: application/x-www-form-urlencoded");return interaction_headers&&curl_easy_setopt(easy,CURLOPT_HTTPHEADER,interaction_headers)==CURLE_OK&&curl_easy_setopt(easy,CURLOPT_POSTFIELDS,interaction_form)==CURLE_OK&&curl_easy_setopt(easy,CURLOPT_POSTFIELDSIZE,(long)strlen(interaction_form))==CURLE_OK;}
 OPENSSL_cleanse(interaction_form,sizeof(interaction_form));return curl_easy_setopt(easy,CURLOPT_HTTPHEADER,NULL)==CURLE_OK&&curl_easy_setopt(easy,CURLOPT_POSTFIELDS,NULL)==CURLE_OK&&curl_easy_setopt(easy,CURLOPT_HTTPGET,1L)==CURLE_OK;
}
#define BILISOFA_MAX_READ_OPERATION 12
#define BILISOFA_OPERATION_ALLOWED(op) ((op)==0||(op)==1||((op)>=4&&(op)<=12))
#define BILISOFA_EXTRA_READ interaction_route
#define BILISOFA_PREPARE_OPERATION interaction_prepare
#define BILISOFA_EXTRA_CLEANUP interaction_cleanup
#include "vod-api.c"
