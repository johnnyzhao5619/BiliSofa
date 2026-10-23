/* Original fixed anonymous hot-word GET. No caller-controlled URL or headers. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <curl/curl.h>
#include "probe-guest.h"
static void search_hot(void){
  guest_reset();guest_limit=65536u;
  guest_get("https://s.search.bilibili.com/main/hotword","https://search.bilibili.com/",0);
}
#ifndef HOT_SEARCH_NO_MAIN
int main(int argc,char **argv){
  (void)guest_popular;(void)guest_video;
  if(argc!=2||strcmp(argv[1],"search-hot")){guest_reset();puts("GUEST:closed");fflush(stdout);return 1;}
  search_hot();return 0;
}
#endif
