/* W01/G4 TV-contained, loopback-only HLS relay. No remote URI in HTTP requests. */
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#include <errno.h>
#include <strings.h>
#include <stdint.h>
#include <limits.h>
#ifndef __EMSCRIPTEN__
#include <fcntl.h>
#endif
#define LIVE_RELAY
#define LIVE_NO_MAIN
#ifndef LIVE_CAP
#define LIVE_CAP 4194304
#endif
static void relay_cleanup(void);
static void relay_tick(void);
#define LIVE_EXTRA_CLEANUP relay_cleanup
#define LIVE_EXTRA_TICK relay_tick
#include "live-probe.c"
static int listen_fd=-1, client_fd=-1, client_state, request_kind, request_segment, request_head, request_count;
static char relay_token[33], client_request[4097], reply_header[256];
static size_t client_used, header_length, header_sent, body_sent, response_start, response_size;
static uint64_t relay_bytes;
static unsigned long range_start, range_end;
static int range_present, range_has_end, status_pending;
static int parsed_count, rejected_count, request_flags, last_status;
static double client_until;
static int close_fd(int *fd){int ok=*fd<0 || close(*fd)==0;*fd=-1;return ok;}
static void client_close(void){if(!close_fd(&client_fd))bad_close=1;client_state=0;client_used=0;OPENSSL_cleanse(client_request,sizeof(client_request));OPENSSL_cleanse(reply_header,sizeof(reply_header));}
static void relay_cleanup(void){client_close();if(!close_fd(&listen_fd))bad_close=1;OPENSSL_cleanse(relay_token,sizeof(relay_token));}
static int nonblocking_socket(void){
#ifdef __EMSCRIPTEN__
 return socket(AF_INET,SOCK_STREAM|SOCK_NONBLOCK,0);
#else
 int fd=socket(AF_INET,SOCK_STREAM,0);if(fd>=0 && fcntl(fd,F_SETFL,O_NONBLOCK)<0){close(fd);return -1;}return fd;
#endif
}
static int nonblocking_accept(void){
#ifdef __EMSCRIPTEN__
 return accept4(listen_fd,NULL,NULL,SOCK_NONBLOCK);
#else
 int fd=accept(listen_fd,NULL,NULL);if(fd>=0 && fcntl(fd,F_SETFL,O_NONBLOCK)<0){close(fd);return -1;}return fd;
#endif
}
LIVE_EXPORT int live_relay_start(void){
 if(!live || active>=0 || listen_fd>=0 || strlen(input)!=32 || strspn(input,"0123456789abcdef")!=32)return 0;
 memcpy(relay_token,input,33);OPENSSL_cleanse(input,sizeof(input));listen_fd=nonblocking_socket();if(listen_fd<0)return 0;
 int reuse=1;struct sockaddr_in address;memset(&address,0,sizeof(address));address.sin_family=AF_INET;address.sin_port=htons(40325);address.sin_addr.s_addr=htonl(INADDR_LOOPBACK);
 if(setsockopt(listen_fd,SOL_SOCKET,SO_REUSEADDR,&reuse,sizeof(reuse))<0 || bind(listen_fd,(struct sockaddr*)&address,sizeof(address))<0 || listen(listen_fd,4)<0){relay_cleanup();return 0;}
 until=now_ms()+100000;relay_bytes=0;request_count=parsed_count=rejected_count=request_flags=last_status=0;puts("LIVE:relay_ready");fflush(stdout);return 1;
}
LIVE_EXPORT int live_relay_segment(void){return client_fd>=0 && client_state==2 && request_kind==2?request_segment:0;}
LIVE_EXPORT int live_relay_connections(void){return request_count;}
LIVE_EXPORT int live_relay_requests(void){return parsed_count;}
LIVE_EXPORT int live_relay_rejections(void){return rejected_count;}
LIVE_EXPORT int live_relay_flags(void){return request_flags;}
LIVE_EXPORT int live_relay_status(void){return last_status;}
static void make_header(int status,const char *type,size_t size,int partial){
 last_status=partial?206:status;
 int n=partial?snprintf(reply_header,sizeof(reply_header),"HTTP/1.1 206 Partial Content\r\nContent-Type: %s\r\nContent-Length: %lu\r\nContent-Range: bytes %lu-%lu/%lu\r\nConnection: close\r\nCache-Control: no-store\r\n\r\n",type,(unsigned long)size,(unsigned long)response_start,(unsigned long)(response_start+size-1),(unsigned long)body_size):snprintf(reply_header,sizeof(reply_header),"HTTP/1.1 %d %s\r\nContent-Type: %s\r\nContent-Length: %lu\r\nConnection: close\r\nCache-Control: no-store\r\n\r\n",status,status==200?"OK":"Rejected",type,(unsigned long)size);
 if(n<0 || (size_t)n>=sizeof(reply_header)){client_close();return;}header_length=(size_t)n;header_sent=body_sent=0;client_state=3;client_until=now_ms()+5000;
}
static void reject_request(int status){if(rejected_count<INT_MAX)rejected_count++;response_start=response_size=0;status_pending=status;make_header(status,"text/plain",0,0);}
LIVE_EXPORT int live_relay_reply(int length,int kind){
 if(client_fd<0 || client_state!=2 || active>=0 || length<1 || (kind!=1 && kind!=2) || request_kind!=kind)return 0;
 if((kind==1 && length>32768) || (kind==2 && (size_t)length!=body_size) || (size_t)length>LIVE_CAP
#ifndef BILISOFA_LIVE_PRODUCT
 || (uint64_t)length>67108864UL-relay_bytes
#endif
 )return 0;
 body_size=(size_t)length;if((uint64_t)length<=UINT64_MAX-relay_bytes)relay_bytes+=(uint64_t)length;response_start=0;response_size=body_size;status_pending=200;
 if(range_present && !request_head){if(range_start>=body_size || (range_has_end && range_end<range_start)){reject_request(416);return 1;}response_start=range_start;size_t end=range_has_end && range_end<body_size?range_end:body_size-1;response_size=end-response_start+1;}
 make_header(200,kind==1?"application/vnd.apple.mpegurl":"video/mp2t",response_size,range_present && !request_head);return client_state==3;
}
static int decimal(const char **s,unsigned long *value){const char *p=*s;if(*p<'0'||*p>'9')return 0;unsigned long v=0;int count=0;while(*p>='0'&&*p<='9'){
#ifdef BILISOFA_LIVE_PRODUCT
 if(++count>10||v>(2147483647UL-(unsigned long)(*p-'0'))/10)return 0;v=v*10+(unsigned long)(*p++-'0');
#else
 if(++count>8)return 0;v=v*10+(unsigned long)(*p++-'0');if(v>LIVE_CAP)return 0;
#endif
 }*s=p;*value=v;return 1;}
static int parse_request(void){
 char *end=strstr(client_request,"\r\n\r\n"),*line=strstr(client_request,"\r\n");if(!end || !line || (size_t)(end-client_request)+4!=client_used)return 0;
 *line=0;char path[160],version[16],extra;char method[8];
 if(sscanf(client_request,"%7s %159s %15s %c",method,path,version,&extra)!=3 || (strcmp(method,"GET") && strcmp(method,"HEAD")) || (strcmp(version,"HTTP/1.1") && strcmp(version,"HTTP/1.0")))return 0;
 request_head=!strcmp(method,"HEAD");request_flags|=request_head?2:1;char prefix[40];snprintf(prefix,sizeof(prefix),"/%s/",relay_token);size_t prefix_size=strlen(prefix);if(strncmp(path,prefix,prefix_size))return 0;
 const char *resource=path+prefix_size;request_kind=0;request_segment=0;
 if(!strcmp(resource,"index.m3u8"))request_kind=1;
 else if(resource[0]=='s'){
  const char *p=resource+1;unsigned long id;
  if(!decimal(&p,&id) || id<1 ||
#ifndef BILISOFA_LIVE_PRODUCT
 id>1024 ||
#endif
 strcmp(p,".ts")){return 0;}
  request_kind=2;request_segment=(int)id;
 }
 else return 0;
 range_present=range_has_end=0;range_start=range_end=0;
 int has_length=0;
 for(char *p=line+2;p<end;){char *next=strstr(p,"\r\n");if(!next || next>end)return 0;*next=0;
  if(!strncasecmp(p,"Range:",6)){if(range_present)return 0;const char *v=p+6;while(*v==' '||*v=='\t')v++;if(strncmp(v,"bytes=",6))return 0;v+=6;if(!decimal(&v,&range_start) || *v++!='-')return 0;if(*v){range_has_end=1;if(!decimal(&v,&range_end))return 0;}if(*v)return 0;range_present=1;}
  if(!strncasecmp(p,"Transfer-Encoding:",18))return 0;
  if(!strncasecmp(p,"Content-Length:",15)){if(has_length++)return 0;const char *v=p+15;while(*v==' '||*v=='\t')v++;if(*v++!='0')return 0;while(*v==' '||*v=='\t')v++;if(*v)return 0;request_flags|=8;}
  p=next+2;
 }
 if(range_present)request_flags|=4;return 1;
}
static int send_part(const unsigned char *data,size_t length,size_t *sent){
 size_t available=length-*sent;if(available>65536)available=65536;int flags=0;
#ifdef MSG_NOSIGNAL
 flags=MSG_NOSIGNAL;
#endif
 ssize_t n=send(client_fd,data+*sent,available,flags);if(n>0){*sent+=(size_t)n;return 1;}return n<0 && (errno==EAGAIN || errno==EWOULDBLOCK || errno==EINTR);
}
static void relay_tick(void){
 if(listen_fd<0)return;
 if(client_fd<0){
#ifndef BILISOFA_LIVE_PRODUCT
  if(request_count>=128 || relay_bytes>=67108864UL){puts("LIVE:relay_limit");finish();return;}
#endif
  client_fd=nonblocking_accept();if(client_fd<0){if(errno!=EAGAIN && errno!=EWOULDBLOCK && errno!=EINTR)finish();return;}
#ifdef SO_NOSIGPIPE
  int no_signal=1;setsockopt(client_fd,SOL_SOCKET,SO_NOSIGPIPE,&no_signal,sizeof(no_signal));
#endif
  if(request_count<INT_MAX)request_count++;client_state=1;client_used=0;client_until=now_ms()+2000;
 }
 if(now_ms()>=client_until){if(client_state==2 || active>=0){puts("LIVE:relay_client_deadline");finish();}else client_close();return;}
 if(client_state==1){
  ssize_t n=recv(client_fd,client_request+client_used,4096-client_used,0);
  if(n>0){if(memchr(client_request+client_used,0,(size_t)n)){reject_request(400);return;}client_used+=(size_t)n;client_request[client_used]=0;
   if(strstr(client_request,"\r\n\r\n")){if(!parse_request()){reject_request(404);return;}if(parsed_count<INT_MAX)parsed_count++;client_state=2;client_until=now_ms()+15000;puts(request_kind==1?"LIVE:relay_manifest":"LIVE:relay_segment");fflush(stdout);}
   else if(client_used==4096)reject_request(431);
  }else if(!n || (errno!=EAGAIN && errno!=EWOULDBLOCK && errno!=EINTR))client_close();
 }else if(client_state==3){
  if(header_sent<header_length){if(!send_part((unsigned char*)reply_header,header_length,&header_sent)){client_close();return;}}
  else if(!request_head && body_sent<response_size){if(!send_part(body+response_start,response_size,&body_sent)){client_close();return;}}
  else{if(status_pending==200){puts(request_kind==1?"LIVE:served_manifest":"LIVE:served_segment");fflush(stdout);}client_close();live_response_clear();}
 }
}
#ifndef LIVE_RELAY_NO_MAIN
int main(void){if(!start())return 1;
#ifdef __EMSCRIPTEN__
 emscripten_set_main_loop(tick,40,0);
#else
 while(live){tick();struct timespec wait={0,10000000};nanosleep(&wait,NULL);}
#endif
 return 0;}
#endif
