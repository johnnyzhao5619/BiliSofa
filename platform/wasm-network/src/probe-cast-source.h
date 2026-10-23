/* Original W01 HTTPS-only, one-attempt 512-byte source test and TV-approved media handoff. No
   credentials, redirects, HTTP fallback or raw request/response diagnostics. */
#ifndef BILISOFA_PROBE_CAST_SOURCE_H
#define BILISOFA_PROBE_CAST_SOURCE_H
static CURLM *cast_source_multi=NULL;
static CURL *cast_source_easy=NULL;
static int cast_source_global=0,cast_source_attempted=0,cast_source_range=0,cast_source_length=0;
static char cast_source_input[2049],cast_source_retained[2049];
static int cast_source_ready=0,cast_media_attempted=0;
static double cast_source_expires=0;
static unsigned long long cast_source_total=0,cast_source_verified_total=0;
static unsigned char cast_source_bytes[512];
static size_t cast_source_size=0,cast_source_headers=0;
static double cast_source_until=0;
static int cast_transition_enabled=0,cast_media_generation=1;
static double cast_session_until=0;
static char cast_media_token[33],cast_transition_token[33];
static unsigned long long cast_carry_bytes=0;
static unsigned int cast_carry_windows=0,cast_carry_retries=0;
static int cast_carry_connections=0;
BILISOFA_GUEST_EXPORT void cast_transition_enable(void) { if(!cast_started)cast_transition_enabled=1; }
BILISOFA_GUEST_EXPORT uintptr_t cast_transition_buffer(void) { return (uintptr_t)cast_transition_token; }
static int cast_source_valid(const char *url) {
  if(!url || strlen(url)>2048 || strncmp(url,"https://",8))return 0;
  const char *end=strchr(url+8,'/');if(!end || end-(url+8)>253)return 0;
  const char *suffix=".bilivideo.com";size_t n=(size_t)(end-(url+8));
  const char *akam="upos-hz-mirrorakam.akamaized.net";
  int bili_akam=n==strlen(akam) && !strncmp(url+8,akam,n);
  if(!bili_akam && (n<=strlen(suffix) || strncmp(end-strlen(suffix),suffix,strlen(suffix))))return 0;
  const char *label=url+8;
  for(const char *c=label;c<end;c++) {
    if(*c=='.'){if(c==label || c[-1]=='-' || c-label>63)return 0;label=c+1;}
    else if(!((*c>='a' && *c<='z') || (*c>='0' && *c<='9') || (*c=='-' && c>label)))return 0;
  }
  if(label==end || end[-1]=='-' || end-label>63 || strncmp(end,"/upgcxcode/",10))return 0;
  for(const unsigned char *c=(const unsigned char *)end;*c;c++)if(*c<33 || *c>126 || *c=='\\' || *c=='#')return 0;
  const char *query=strchr(end,'?');if(!query || query-end<4 || strncmp(query-4,".mp4",4))return 0;
  const char *d=strstr(query,"?deadline=");if(!d)d=strstr(query,"&deadline=");if(!d)return 0;
  d+=10;const char *stop=d;while(*stop>='0' && *stop<='9')stop++;
  if(stop-d!=10 || (*stop && *stop!='&') || strstr(stop,"&deadline="))return 0;
  unsigned long long expiry=strtoull(d,NULL,10),now=(unsigned long long)time(NULL);
  return expiry>=now+60 && expiry<=now+86400;
}
static size_t cast_source_body(char *data,size_t size,size_t count,void *context) {
  (void)context;if(size && count>512/size)return 0;size_t n=size*count;
  if(n>512-cast_source_size)return 0;
  memcpy(cast_source_bytes+cast_source_size,data,n);cast_source_size+=n;return n;
}
static size_t cast_source_header(char *data,size_t size,size_t count,void *context) {
  (void)context;if(size && count>16384/size)return 0;size_t n=size*count;
  if(n>16384-cast_source_headers)return 0;cast_source_headers+=n;
  if(n>=14 && !strncasecmp(data,"Content-Range:",14)) {
    char line[128];int used=0;unsigned long long total=0;
    if(n>=sizeof(line) || cast_source_range)return 0;memcpy(line,data,n);line[n]=0;
    if(sscanf(line+14," bytes 0-511/%13llu%n",&total,&used)!=1 || total<512 || total>1099511627776ULL || strcmp(line+14+used,"\r\n"))return 0;
    cast_source_range=1;cast_source_total=total;
  }
  if(n>=15 && !strncasecmp(data,"Content-Length:",15)) {
    char line[80];int used=0;unsigned int length=0;
    if(n>=sizeof(line) || cast_source_length)return 0;memcpy(line,data,n);line[n]=0;
    if(sscanf(line+15," %3u%n",&length,&used)!=1 || length!=512 || strcmp(line+15+used,"\r\n"))return 0;
    cast_source_length=1;
  }
  if(n>=17 && !strncasecmp(data,"Content-Encoding:",17)) {
    if(n!=28 || strncasecmp(data+17," identity\r\n",11))return 0;
  }
  return n;
}
static void cast_source_close_transfer(void) {
  if(cast_source_easy) {
    if(cast_source_multi && curl_multi_remove_handle(cast_source_multi,cast_source_easy)!=CURLM_OK)cast_unconfirmed=1;
    curl_easy_cleanup(cast_source_easy);cast_source_easy=NULL;
  }
  if(cast_source_multi && curl_multi_cleanup(cast_source_multi)!=CURLM_OK)cast_unconfirmed=1;
  cast_source_multi=NULL;
  if(cast_source_global)curl_global_cleanup();cast_source_global=0;
  memset(cast_source_input,0,sizeof(cast_source_input));memset(cast_source_bytes,0,sizeof(cast_source_bytes));
  cast_source_size=cast_source_headers=0;cast_source_range=cast_source_length=0;cast_source_until=0;cast_source_total=0;
}
static void cast_source_forget(void) {
  memset(cast_source_retained,0,sizeof(cast_source_retained));cast_source_ready=0;cast_source_expires=0;cast_source_verified_total=0;
}
static void cast_source_stop(void) { cast_source_close_transfer();cast_source_forget(); }
/* Bounded top-level ISO BMFF prefix classification; no atom payload parsing,
   offsets/brands/raw bytes in logs, extra fetches or assumptions about codecs. */
static const char *cast_source_layout(const unsigned char *bytes,size_t count,unsigned long long total) {
  size_t at=0;
  for(unsigned int boxes=0;boxes<32;boxes++) {
    if(at>count || count-at<8)return "prefix_exhausted";
    unsigned long long size=0;for(int i=0;i<4;i++)size=(size<<8)|bytes[at+i];
    size_t head=8;
    if(size==1){if(count-at<16)return "prefix_exhausted";size=0;for(int i=0;i<8;i++)size=(size<<8)|bytes[at+8+i];head=16;}
    else if(!size)size=total>=at?total-at:0;
    if(total<at || size<head || size>total-at)return "invalid";
    if(!memcmp(bytes+at+4,"moov",4))return "moov_first";
    if(!memcmp(bytes+at+4,"mdat",4))return "mdat_first";
    if(!memcmp(bytes+at+4,"moof",4))return "fragmented";
    if(size>count-at)return "prefix_exhausted";
    at+=(size_t)size;
  }
  return "prefix_exhausted";
}
/* Read only top-level sizes already in the 512-byte prefix. No moov allocation. */
static unsigned int cast_source_moov_mib(const unsigned char *bytes,size_t count,unsigned long long total) {
  size_t at=0;
  for(unsigned int boxes=0;boxes<32;boxes++) {
    if(at>count || count-at<8)return 0;
    unsigned long long size=0;for(int i=0;i<4;i++)size=(size<<8)|bytes[at+i];
    size_t head=8;
    if(size==1){if(count-at<16)return 0;size=0;for(int i=0;i<8;i++)size=(size<<8)|bytes[at+8+i];head=16;}
    else if(!size)size=total>=at?total-at:0;
    if(total<at || size<head || size>total-at)return 0;
    if(!memcmp(bytes+at+4,"moov",4)){unsigned long long mib=(size+1048575)/1048576;return mib>128?129:(unsigned int)mib;}
    if(!memcmp(bytes+at+4,"mdat",4) || !memcmp(bytes+at+4,"moof",4) || size>count-at)return 0;
    at+=(size_t)size;
  }
  return 0;
}
static void cast_source_finish(int code) {
  long status=0;if(cast_source_easy)curl_easy_getinfo(cast_source_easy,CURLINFO_RESPONSE_CODE,&status);
  int good=code==0 && status==206 && cast_source_range && cast_source_size==512 && !memcmp(cast_source_bytes+4,"ftyp",4);
  unsigned long long total=cast_source_total;
  const char *layout=good?cast_source_layout(cast_source_bytes,cast_source_size,total):NULL;
  unsigned int init_mib=good?cast_source_moov_mib(cast_source_bytes,cast_source_size,total):0;
  cast_source_close_transfer();
  if(good && !cast_unconfirmed) { cast_source_ready=1;cast_source_verified_total=total;cast_source_expires=http_now()+60; } else cast_source_forget();
  if(cast_unconfirmed)puts("CAST:failed:17");
  else if(good){printf("CAST:layout:%s\n",layout);if(init_mib>128)puts("CAST:init:over_128_mib");else if(init_mib)printf("CAST:init:%u\n",init_mib);puts("CAST:source:pass");}
  else if(!code && status==206)puts("CAST:source:invalid_media");
  else printf("CAST:source:failed:%ld:%d\n",status>=100 && status<=599?status:0,code>=0 && code<=999?code:2);
  fflush(stdout);
}
BILISOFA_GUEST_EXPORT uintptr_t cast_source_buffer(void) { return (uintptr_t)cast_source_input; }
BILISOFA_GUEST_EXPORT int cast_source_begin(unsigned int length) {
  if(!cast_started || !cast_rpc_enabled || cast_unconfirmed || cast_source_attempted || cast_source_multi) { memset(cast_source_input,0,sizeof(cast_source_input));return 0; }
  cast_source_attempted=1;
  if(cast_transition_enabled && !cast_session_until)cast_session_until=http_now()+300;
  if(!length || length>2048 || memchr(cast_source_input,0,length))goto invalid;
  cast_source_input[length]=0;if(!cast_source_valid(cast_source_input))goto invalid;
  if(curl_global_init(CURL_GLOBAL_DEFAULT)!=CURLE_OK)goto failed;cast_source_global=1;
  cast_source_multi=curl_multi_init();cast_source_easy=curl_easy_init();
  if(!cast_source_multi || !cast_source_easy)goto failed;
#define CAST_SOURCE_SET(option,value) do { if(curl_easy_setopt(cast_source_easy,option,value)!=CURLE_OK)goto failed; } while(0)
  CAST_SOURCE_SET(CURLOPT_URL,cast_source_input);
  CAST_SOURCE_SET(CURLOPT_RANGE,"0-511");CAST_SOURCE_SET(CURLOPT_REFERER,"https://www.bilibili.com/");
  CAST_SOURCE_SET(CURLOPT_USERAGENT,"BiliSofa-W01-Probe/0.0.28");
  CAST_SOURCE_SET(CURLOPT_SSL_VERIFYPEER,1L);CAST_SOURCE_SET(CURLOPT_SSL_VERIFYHOST,2L);CAST_SOURCE_SET(CURLOPT_CAINFO,"/cacert.pem");
  CAST_SOURCE_SET(CURLOPT_PROTOCOLS,CURLPROTO_HTTPS);CAST_SOURCE_SET(CURLOPT_REDIR_PROTOCOLS,CURLPROTO_HTTPS);CAST_SOURCE_SET(CURLOPT_FOLLOWLOCATION,0L);
  CAST_SOURCE_SET(CURLOPT_PROXY,"");CAST_SOURCE_SET(CURLOPT_NOSIGNAL,1L);
  CAST_SOURCE_SET(CURLOPT_CONNECTTIMEOUT_MS,4000L);CAST_SOURCE_SET(CURLOPT_TIMEOUT_MS,8000L);
  CAST_SOURCE_SET(CURLOPT_MAXFILESIZE_LARGE,(curl_off_t)512);
  CAST_SOURCE_SET(CURLOPT_WRITEFUNCTION,cast_source_body);CAST_SOURCE_SET(CURLOPT_WRITEDATA,NULL);
  CAST_SOURCE_SET(CURLOPT_HEADERFUNCTION,cast_source_header);CAST_SOURCE_SET(CURLOPT_HEADERDATA,NULL);
#undef CAST_SOURCE_SET
  if(curl_multi_add_handle(cast_source_multi,cast_source_easy)!=CURLM_OK)goto failed;
  strcpy(cast_source_retained,cast_source_input);
  memset(cast_source_input,0,sizeof(cast_source_input));cast_source_until=http_now()+9;
  puts("CAST:source:started");fflush(stdout);return 1;
invalid:
  cast_source_stop();puts("CAST:source:invalid_request");fflush(stdout);return -1;
failed:
  /* An easy handle not added to multi must not be removed from it. */
  if(cast_source_easy){curl_easy_cleanup(cast_source_easy);cast_source_easy=NULL;}
  cast_source_finish(2);return -1;
}
BILISOFA_GUEST_EXPORT int cast_media_begin(void) {
  if(!cast_started || !cast_rpc_enabled || cast_unconfirmed || cast_media_attempted || !cast_source_ready || http_now()<0 || http_now()>=cast_source_expires || !cast_source_valid(cast_source_retained)) {
    cast_source_forget();puts("CAST:media:unavailable");fflush(stdout);return 0;
  }
  cast_media_attempted=1;cast_source_ready=0;
  const char *d=strstr(cast_source_retained,"?deadline=");if(!d)d=strstr(cast_source_retained,"&deadline=");
  double remaining=(double)strtoull(d+10,NULL,10)-(double)time(NULL)-5;
  if(cast_transition_enabled && remaining>cast_session_until-http_now())remaining=cast_session_until-http_now();
  int result=bridge_progressive_begin(cast_transition_enabled?cast_media_token:cast_token,cast_source_retained,remaining,cast_source_verified_total);
  cast_source_forget();
  if(result){if(bridge_unconfirmed)cast_unconfirmed=1;puts("CAST:media:failed");fflush(stdout);return -1;}
  if(cast_transition_enabled){bridge_stream_bytes=cast_carry_bytes;bridge_windows=cast_carry_windows;bridge_connections=cast_carry_connections;bridge_retry_count=cast_carry_retries;}
  /* The explicit TV action may extend this bounded probe by at most 5 minutes. */
  if(cast_deadline<bridge_deadline+1)cast_deadline=bridge_deadline+1;
  return 1;
}
/* Invoked only after the scoped UI ACK that its previous decoder is closed.
   Keeps the discovery listener/owner and all cumulative media budgets alive. */
BILISOFA_GUEST_EXPORT int cast_transition_begin(unsigned int length,unsigned int generation) {
  if(!cast_transition_enabled || !cast_started || cast_unconfirmed || bridge_unconfirmed || generation!=(unsigned int)cast_media_generation+1 || generation>4 || http_now()<0 || http_now()+10>=cast_session_until || !length || length>2048 || memchr(cast_source_input,0,length) || cast_transition_token[32]!=0 || strlen(cast_transition_token)!=32 || strspn(cast_transition_token,"0123456789abcdef")!=32 || !strcmp(cast_transition_token,cast_media_token) || bridge_fd<0 || !bridge_multi || bridge_stream_bytes>=BRIDGE_STREAM_BUDGET || bridge_windows>=256 || bridge_connections>=512) {
    memset(cast_source_input,0,sizeof(cast_source_input));memset(cast_transition_token,0,sizeof(cast_transition_token));return 0;
  }
  cast_source_input[length]=0;
  if(!cast_source_valid(cast_source_input)){memset(cast_source_input,0,sizeof(cast_source_input));memset(cast_transition_token,0,sizeof(cast_transition_token));return 0;}
  char next[2049],token[33];memcpy(next,cast_source_input,length+1);memcpy(token,cast_transition_token,33);
  cast_carry_bytes=bridge_stream_bytes;cast_carry_windows=bridge_windows;cast_carry_connections=bridge_connections;cast_carry_retries=bridge_retry_count;
  if(bridge_deadline<cast_session_until)cast_session_until=bridge_deadline;
  bridge_stop();cast_source_stop();memset(cast_transition_token,0,sizeof(cast_transition_token));
  if(bridge_unconfirmed || cast_unconfirmed){cast_unconfirmed=1;memset(next,0,sizeof(next));memset(token,0,sizeof(token));return -1;}
  cast_source_attempted=cast_media_attempted=0;cast_media_generation=(int)generation;
  memcpy(cast_media_token,token,33);memset(token,0,sizeof(token));
  memcpy(cast_source_input,next,length+1);memset(next,0,sizeof(next));
  puts("CAST:transition:closed");fflush(stdout);
  return cast_source_begin(length);
}
static void cast_source_tick(void) {
  if(cast_source_ready && (http_now()<0 || http_now()>=cast_source_expires)){cast_source_forget();puts("CAST:media:expired");fflush(stdout);}
  if(!cast_source_multi)return;
  double now=http_now();if(now<0 || now>=cast_source_until){cast_source_finish(28);return;}
  int running=0;CURLMcode rc=curl_multi_perform(cast_source_multi,&running);
  if(rc!=CURLM_OK && rc!=CURLM_CALL_MULTI_PERFORM){cast_source_finish(2);return;}
  int queued=0;CURLMsg *message;
  while((message=curl_multi_info_read(cast_source_multi,&queued)))if(message->msg==CURLMSG_DONE && message->easy_handle==cast_source_easy){int result=(int)message->data.result;cast_source_finish(result);return;}
  if(!running)cast_source_finish(2);
}
#endif
