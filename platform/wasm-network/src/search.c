#include "service-config.h"
/* Original bounded public video search. No URL/header/cookie argument. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <curl/curl.h>
#include <openssl/evp.h>
#include "probe-guest.h"
static int search_keyword_valid(const char *s) {
  if(!s || !*s || strlen(s)>128 || s[0]==' ' || s[strlen(s)-1]==' ')return 0;
  const unsigned char *p=(const unsigned char*)s;unsigned count=0;
  while(*p){
    unsigned cp=*p++,extra=0,min=0;
    if(cp>=0xc2&&cp<=0xdf){cp&=31;extra=1;min=0x80;}
    else if(cp>=0xe0&&cp<=0xef){cp&=15;extra=2;min=0x800;}
    else if(cp>=0xf0&&cp<=0xf4){cp&=7;extra=3;min=0x10000;}
    else if(cp>=0x80)return 0;
    while(extra--){if((*p&0xc0)!=0x80)return 0;cp=(cp<<6)|(*p++&63);}
    if(cp<min || cp<32 || (cp>=127&&cp<=159) || (cp>=0xd800&&cp<=0xdfff) || cp>0x10ffff || ++count>32)return 0;
  }
  return 1;
}
static int search_page_valid(const char *s){return s && *s && strlen(s)<=2 && s[0]!='0' && strspn(s,"0123456789")==strlen(s) && atoi(s)>=1 && atoi(s)<=10;}
static void search_public_nav(void){
  guest_reset();guest_limit=16384;
  guest_get(SERVICE_ADDRESS_A_34A874714ED0,SERVICE_ADDRESS_A_51DF6D39D2D6,0);
}
static int search_key_valid(const char *s){return s&&strlen(s)==32&&strspn(s,"0123456789abcdef")==32;}
static int search_epoch_valid(const char *s){
  if(!s||strlen(s)!=10||strspn(s,"0123456789")!=10)return 0;
  long long epoch=strtoll(s,NULL,10),now=(long long)time(NULL);
  return now>=1700000000LL&&now<=4102444800LL&&epoch>=now-30&&epoch<=now+30;
}
static void search_typed(const char *keyword,const char *page,const char *img,const char *sub,const char *epoch,int mode){
  guest_reset();guest_limit=BILISOFA_GUEST_MAX;
  if(mode<0||mode>3||!search_keyword_valid(keyword)||!search_page_valid(page)||!search_key_valid(img)||!search_key_valid(sub)||!search_epoch_valid(epoch))goto reject;
  char filtered[129],joined[65],mix[33]={0},query[640],signed_query[673],hex[33],url[800];size_t used=0;
  for(const char *p=keyword;*p;p++)if(!strchr("!'()*",*p))filtered[used++]=*p;filtered[used]=0;
  if(!used)goto reject;
  char *encoded=curl_easy_escape(NULL,filtered,(int)used);if(!encoded)goto reject;
  snprintf(joined,sizeof(joined),"%s%s",img,sub);
  /* Public WBI permutation, already used by the isolated progress implementation. */
  const unsigned char indices[32]={46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13};
  for(int i=0;i<32;i++)mix[i]=joined[indices[i]];
  const char *format=mode==3?"keyword=%s&page=%d&page_size=4&search_type=live_room&wts=%s":mode==2?"keyword=%s&page=%d&page_size=4&search_type=media_bangumi&wts=%s":mode==1?"keyword=%s&page=%d&page_size=4&search_type=bili_user&wts=%s":"keyword=%s&page=%d&page_size=4&search_type=video&wts=%s";
  int size=snprintf(query,sizeof(query),format,encoded,atoi(page),epoch);curl_free(encoded);
  if(size<1||(size_t)size>=sizeof(query))goto reject;
  size=snprintf(signed_query,sizeof(signed_query),"%s%s",query,mix);if(size<1||(size_t)size>=sizeof(signed_query))goto reject;
  unsigned char digest[EVP_MAX_MD_SIZE];unsigned int length=0;
  if(EVP_Digest(signed_query,(size_t)size,digest,&length,EVP_md5(),NULL)!=1||length!=16)goto reject;
  for(int i=0;i<16;i++)snprintf(hex+i*2,3,"%02x",digest[i]);
  size=snprintf(url,sizeof(url),SERVICE_ADDRESS_A_8102263D41AA,query,hex);
  if(size<1||(size_t)size>=sizeof(url))goto reject;
  guest_get(url,SERVICE_ADDRESS_A_51DF6D39D2D6,0);return;
reject:puts("GUEST:closed");fflush(stdout);
}
static void search_video(const char *keyword,const char *page,const char *img,const char *sub,const char *epoch){search_typed(keyword,page,img,sub,epoch,0);}
static void search_users(const char *keyword,const char *page,const char *img,const char *sub,const char *epoch){search_typed(keyword,page,img,sub,epoch,1);}
static void search_pgc(const char *keyword,const char *page,const char *img,const char *sub,const char *epoch){search_typed(keyword,page,img,sub,epoch,2);}
static void search_live(const char *keyword,const char *page,const char *img,const char *sub,const char *epoch){search_typed(keyword,page,img,sub,epoch,3);}
#ifndef SEARCH_NO_MAIN
int main(int argc,char **argv){
  (void)guest_popular;(void)guest_video;
  if(argc==2&&!strcmp(argv[1],"search-public-nav")){search_public_nav();return 0;}
  if(argc!=7||(strcmp(argv[1],"video-search-wbi")&&strcmp(argv[1],"user-search-wbi")&&strcmp(argv[1],"pgc-search-wbi")&&strcmp(argv[1],"live-search-wbi"))){guest_reset();puts("GUEST:closed");fflush(stdout);return 1;}
  if(!strcmp(argv[1],"video-search-wbi"))search_video(argv[2],argv[3],argv[4],argv[5],argv[6]);
  else if(!strcmp(argv[1],"user-search-wbi"))search_users(argv[2],argv[3],argv[4],argv[5],argv[6]);
  else if(!strcmp(argv[1],"pgc-search-wbi"))search_pgc(argv[2],argv[3],argv[4],argv[5],argv[6]);
  else search_live(argv[2],argv[3],argv[4],argv[5],argv[6]);return 0;
}
#endif
