/* Original W01 loopback-only synthetic HTTP cookie exchange. Not account/TLS proof. */
#ifndef BILISOFA_PROBE_SESSION_H
#define BILISOFA_PROBE_SESSION_H
#ifndef BILISOFA_SESSION_PORT
#define BILISOFA_SESSION_PORT 40326
#endif
static CURL *session_jars[2], *session_easy;
static CURLM *session_multi;
static int session_fd=-1,session_client=-1,session_global,session_added,session_live,session_bad,session_stage;
static int session_header_seen,session_cookie_seen,session_server_seen;
static double session_until,session_stage_until,session_client_until;
static char session_token[33],session_request[2049],session_response[1024],session_url[160];
static size_t session_used,session_size,session_sent,session_body_bytes,session_header_bytes;
static const char *session_paths[]={"set-a","empty","check-a","set-b","check-b","check-a","redirect","empty","check-b"};
static const char *session_cookies[]={"","","bilisofa_probe=A","","bilisofa_probe=B","bilisofa_probe=A","bilisofa_probe=A","","bilisofa_probe=B"};
static const int session_owner[]={0,1,0,1,1,0,0,0,1};
static size_t session_body(char *data,size_t size,size_t count,void *ctx) {
  (void)data;(void)ctx;if(size && count>128/size)return 0;size_t n=size*count;
  if(n>128-session_body_bytes)return 0;session_body_bytes+=n;return n;
}
static size_t session_header(char *data,size_t size,size_t count,void *ctx) {
  (void)ctx;if(size && count>8192/size)return 0;size_t n=size*count;
  if(n>8192-session_header_bytes)return 0;session_header_bytes+=n;
  if(n==24 && !memcmp(data,"X-BiliSofa-Probe: wire\r\n",24))session_header_seen=1;
  if(n>=11 && !strncasecmp(data,"Set-Cookie:",11))session_cookie_seen++;
  return n;
}
static void session_drop_client(void) {
  if(session_client>=0 && close(session_client)<0)session_bad=1;
  session_client=-1;session_used=session_size=session_sent=0;
  memset(session_request,0,sizeof(session_request));memset(session_response,0,sizeof(session_response));
}
static void session_cleanup(void) {
  session_live=0;
  if(session_added && curl_multi_remove_handle(session_multi,session_easy)!=CURLM_OK)session_bad=1;
  session_added=0;session_easy=NULL;
  for(int i=0;i<2;i++)if(session_jars[i]) {
    if(curl_easy_setopt(session_jars[i],CURLOPT_COOKIELIST,"ALL")!=CURLE_OK)session_bad=1;
    curl_easy_cleanup(session_jars[i]);session_jars[i]=NULL;
  }
  if(session_multi && curl_multi_cleanup(session_multi)!=CURLM_OK)session_bad=1;
  session_multi=NULL;session_drop_client();
  if(session_fd>=0 && close(session_fd)<0)session_bad=1;session_fd=-1;
  if(session_global)curl_global_cleanup();session_global=0;
  memset(session_token,0,sizeof(session_token));memset(session_url,0,sizeof(session_url));
}
static void session_finish(int error,int cancelled) {
  session_cleanup();
  if(session_bad)puts("SESSION:failed:17");
  else if(cancelled)puts("SESSION:cancelled");
  else if(error)printf("SESSION:failed:%d\n",error);
  else puts("SESSION:pass");
  fflush(stdout);
#ifdef __EMSCRIPTEN__
  emscripten_cancel_main_loop();
#endif
}
BILISOFA_GUEST_EXPORT void session_probe_stop(void) { if(session_live)session_finish(0,1); }
static int session_exchange_begin(void) {
  session_easy=session_jars[session_owner[session_stage]];
  session_header_seen=session_cookie_seen=session_server_seen=0;session_body_bytes=session_header_bytes=0;
  if(session_stage==7 && curl_easy_setopt(session_easy,CURLOPT_COOKIELIST,"ALL")!=CURLE_OK)return 16;
  snprintf(session_url,sizeof(session_url),"http://127.0.0.1:%d/%s/%s",BILISOFA_SESSION_PORT,session_token,session_paths[session_stage]);
  if(curl_easy_setopt(session_easy,CURLOPT_URL,session_url)!=CURLE_OK || curl_multi_add_handle(session_multi,session_easy)!=CURLM_OK)return 16;
  session_added=1;session_stage_until=http_now()+3;return 0;
}
static int session_begin(const char *token) {
  if(session_live || session_fd>=0 || session_multi || session_bad)return 17;
  if(!token || strlen(token)!=32 || strspn(token,"0123456789abcdef")!=32){puts("SESSION:failed:16");fflush(stdout);return 16;}
  strcpy(session_token,token);session_stage=0;session_live=1;
  int error=0;
  if(curl_global_init(CURL_GLOBAL_DEFAULT)!=CURLE_OK){error=10;goto done;}session_global=1;
  session_multi=curl_multi_init();session_fd=http_server_socket();
  if(!session_multi || session_fd<0){error=10;goto done;}
  int reuse=1;struct sockaddr_in local;memset(&local,0,sizeof(local));local.sin_family=AF_INET;local.sin_addr.s_addr=htonl(INADDR_LOOPBACK);local.sin_port=htons(BILISOFA_SESSION_PORT);
  if(setsockopt(session_fd,SOL_SOCKET,SO_REUSEADDR,&reuse,sizeof(reuse))<0 || bind(session_fd,(struct sockaddr *)&local,sizeof(local))<0 || listen(session_fd,1)<0){error=12;goto done;}
  for(int i=0;i<2;i++) {
    CURL *c=session_jars[i]=curl_easy_init();if(!c){error=10;goto done;}
#define SESSION_SET(option,value) do {if(curl_easy_setopt(c,option,value)!=CURLE_OK){error=16;goto done;}} while(0)
    SESSION_SET(CURLOPT_COOKIEFILE,"");SESSION_SET(CURLOPT_FOLLOWLOCATION,0L);
    SESSION_SET(CURLOPT_PROTOCOLS,CURLPROTO_HTTP);SESSION_SET(CURLOPT_REDIR_PROTOCOLS,CURLPROTO_HTTP);
    SESSION_SET(CURLOPT_PROXY,"");SESSION_SET(CURLOPT_NOSIGNAL,1L);SESSION_SET(CURLOPT_CONNECTTIMEOUT_MS,1000L);SESSION_SET(CURLOPT_TIMEOUT_MS,2500L);
    SESSION_SET(CURLOPT_WRITEFUNCTION,session_body);SESSION_SET(CURLOPT_WRITEDATA,NULL);
    SESSION_SET(CURLOPT_HEADERFUNCTION,session_header);SESSION_SET(CURLOPT_HEADERDATA,NULL);
#undef SESSION_SET
  }
  session_until=http_now()+20;if(http_now()<0){error=14;goto done;}
  error=session_exchange_begin();
done:
  if(error)session_finish(error,0);else {puts("SESSION:ready");fflush(stdout);}return error;
}
static int session_make_response(void) {
  char first[160],cookie[80]="";int seen_cookie=0,fields=0;
  char *end=strstr(session_request,"\r\n");if(!end || end-session_request>159)return 0;
  memcpy(first,session_request,(size_t)(end-session_request));first[end-session_request]=0;
  char expected[160];snprintf(expected,sizeof(expected),"GET /%s/%s HTTP/1.1",session_token,session_paths[session_stage]);
  if(strcmp(first,expected))return 0;
  for(char *line=end+2;*line && strncmp(line,"\r\n",2);){
    char *stop=strstr(line,"\r\n"),*colon=strchr(line,':');if(!stop || !colon || colon>=stop || stop-line>512 || ++fields>16)return 0;
    if(colon-line==6 && !strncasecmp(line,"Cookie",6)){
      if(seen_cookie++)return 0;char *v=colon+1;while(v<stop && (*v==' ' || *v=='\t'))v++;
      if(stop-v>=80)return 0;memcpy(cookie,v,(size_t)(stop-v));cookie[stop-v]=0;
    }
    line=stop+2;
  }
  if(strcmp(cookie,session_cookies[session_stage]) || session_server_seen)return 0;
  session_server_seen=1;
  const char *extra=session_stage==0?"Set-Cookie: bilisofa_probe=A; Path=/; HttpOnly; SameSite=Lax\r\n":session_stage==3?"Set-Cookie: bilisofa_probe=B; Path=/; HttpOnly; SameSite=Lax\r\n":"";
  char redirect[160]="";if(session_stage==6)snprintf(redirect,sizeof(redirect),"Location: http://127.0.0.1:%d/%s/must-not-follow\r\n",BILISOFA_SESSION_PORT,session_token);
  int n=snprintf(session_response,sizeof(session_response),"HTTP/1.1 %s\r\nContent-Length: 2\r\nX-BiliSofa-Probe: wire\r\n%s%sConnection: close\r\n\r\nok",session_stage==6?"302 Found":"200 OK",extra,redirect);
  if(n<=0 || (size_t)n>=sizeof(session_response))return 0;session_size=(size_t)n;return 1;
}
static void session_tick(void) {
  if(!session_live)return;double now=http_now();
  if(now<0 || now>=session_until || now>=session_stage_until){session_finish(20,0);return;}
  if(session_client<0) {
    int fd=http_accept(session_fd);if(fd>=0){session_client=fd;session_client_until=now+2;
#ifdef SO_NOSIGPIPE
      int no_signal=1;setsockopt(fd,SOL_SOCKET,SO_NOSIGPIPE,&no_signal,sizeof(no_signal));
#endif
    }
  }
  if(session_client>=0) {
    if(now>=session_client_until){session_finish(20,0);return;}
    if(!session_size){ssize_t n=recv(session_client,session_request+session_used,2048-session_used,0);
      if(n>0){if(memchr(session_request+session_used,0,(size_t)n)){session_finish(18,0);return;}session_used+=(size_t)n;session_request[session_used]=0;
        if(strstr(session_request,"\r\n\r\n")){if(!session_make_response()){session_finish(18,0);return;}}
        else if(session_used==2048){session_finish(18,0);return;}
      }else if(n==0 || (errno!=EAGAIN && errno!=EWOULDBLOCK && errno!=EINTR)){session_finish(18,0);return;}
    }
    if(session_size){int flags=0;
#ifdef MSG_NOSIGNAL
      flags=MSG_NOSIGNAL;
#endif
      ssize_t n=send(session_client,session_response+session_sent,session_size-session_sent,flags);
      if(n>0)session_sent+=(size_t)n;else if(n==0 || (errno!=EAGAIN && errno!=EWOULDBLOCK && errno!=EINTR)){session_finish(18,0);return;}
      if(session_sent==session_size)session_drop_client();
    }
  }
  if(session_bad){session_finish(17,0);return;}
  int running=0;if(curl_multi_perform(session_multi,&running)!=CURLM_OK){session_finish(19,0);return;}
  int queued=0;CURLMsg *msg;
  while((msg=curl_multi_info_read(session_multi,&queued)))if(msg->msg==CURLMSG_DONE && msg->easy_handle==session_easy){
    long status=0;CURLcode result=msg->data.result;
    int info=curl_easy_getinfo(session_easy,CURLINFO_RESPONSE_CODE,&status)==CURLE_OK;
    if(curl_multi_remove_handle(session_multi,session_easy)!=CURLM_OK){session_bad=1;session_finish(17,0);return;}session_added=0;
    if(!info || result!=CURLE_OK || status!=(session_stage==6?302:200) || !session_server_seen || !session_header_seen || session_cookie_seen!=(session_stage==0 || session_stage==3) || session_body_bytes!=2){session_finish(19,0);return;}
    if(session_stage==0)puts("SESSION:headers");
    if(session_stage==5)puts("SESSION:isolation");
    if(session_stage==6)puts("SESSION:redirect");
    if(++session_stage==9){puts("SESSION:clear");session_finish(0,0);return;}
    int next=session_exchange_begin();if(next)session_finish(next,0);fflush(stdout);return;
  }
}
#endif
