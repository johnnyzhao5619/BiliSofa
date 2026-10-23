#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif
/* Standalone foreground receiver entry. No probe main, accounts or write API. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <errno.h>
#include <unistd.h>
#include <fcntl.h>
#include <poll.h>
#include <float.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <curl/curl.h>
#include "probe-http.h"
#include "probe-guest.h"
#include "cast-product-bridge.h"
#include "cast-product-receiver.h"
#ifndef BILISOFA_CAST_PRODUCT_NO_MAIN
int main(int argc,char **argv){
 if(argc!=5||strcmp(argv[1],"cast"))return 1;
 int result=cast_begin(argv[2],argv[3],argv[4]);
 if(result){printf("CAST:failed:%d\n",result);fflush(stdout);}
#ifdef __EMSCRIPTEN__
 else emscripten_set_main_loop(cast_tick,20,0);
#endif
 return result;
}
#endif
