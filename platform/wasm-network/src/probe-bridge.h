/* Original bounded loopback media bridge candidate. No credential forwarding. */
#ifndef BILISOFA_PROBE_BRIDGE_H
#define BILISOFA_PROBE_BRIDGE_H
#ifndef BILISOFA_BRIDGE_PORT
#define BILISOFA_BRIDGE_PORT 40324
#endif
#define BRIDGE_CLIENTS 4
#define BRIDGE_BUFFER 65536
#define BRIDGE_RANGE 2097152ULL
struct bridge_client {
  int fd, kind, head, request_done, header_done, paused, done, status, valid_range, length_seen, streaming, next_window, upstream_ready, whole, retries, resume_window, body_forwarded;
  CURL *easy;
  char request[4097], header[512];
  size_t request_size, header_size, header_sent, used, sent, upstream_headers;
  unsigned char buffer[BRIDGE_BUFFER];
  unsigned long long start, end, actual_end, total, received, length, announced_length, response_start, response_end, response_length;
  double deadline, upstream_deadline, retry_at, body_forwarded_at;
};
static struct bridge_client bridge_clients[BRIDGE_CLIENTS] = { {.fd=-1}, {.fd=-1}, {.fd=-1}, {.fd=-1} };
static int bridge_fd = -1, bridge_unconfirmed = 0, bridge_connections = 0, bridge_global = 0;
static CURLM *bridge_multi = NULL;
static char bridge_token[33], bridge_urls[2][2049], bridge_referer[80], bridge_mpd[2048];
static double bridge_deadline;
static unsigned long long bridge_progressive_total,bridge_stream_bytes;
static unsigned int bridge_windows,bridge_request_seen[5];
#define BRIDGE_STREAM_BUDGET (128ULL*1024*1024)
static void bridge_request_note(int kind) {
  const char *names[]={"get_full","get_open","get_range","get_suffix","head"};
  if(kind>=0 && kind<5 && !bridge_request_seen[kind]){bridge_request_seen[kind]=1;printf("BRIDGE:request:%s\n",names[kind]);fflush(stdout);}
}
static unsigned int bridge_duration_ms;
static int bridge_seen[3], bridge_error_noted, bridge_progressive, bridge_external_loop;
static unsigned int bridge_flow_seen,bridge_limit_seen,bridge_retry_count,bridge_burst_noted,bridge_read_mib_noted,bridge_timeout_isolated;
static unsigned long long bridge_forwarded;
static void bridge_flow_snapshot(char phase) {
  unsigned int bit=phase=='e'?1:2;if(!bridge_progressive || !bridge_progressive_total || (bridge_flow_seen&bit))return;
  bridge_flow_seen|=bit;unsigned int active=0,paused=0;
  for(int i=0;i<BRIDGE_CLIENTS;i++){if(bridge_clients[i].fd>=0)active++;if(bridge_clients[i].fd>=0 && bridge_clients[i].paused)paused++;}
  unsigned long long mib=(bridge_stream_bytes+1048575)/1048576;if(mib>128)mib=128;
  double remaining=bridge_deadline-http_now();unsigned int lease=remaining<=0?0:remaining>=180?6:(unsigned int)(remaining/30);
  if(remaining>0 && remaining<180 && remaining>(double)lease*30)lease++;
  printf("BRIDGE:flow:%c:%u:%u:%u:%llu:%u\n",phase,active,paused,bridge_windows>256?256:bridge_windows,mib,lease);fflush(stdout);
}
static void bridge_limit_note(const char *reason) {
  if(!bridge_progressive || bridge_limit_seen)return;bridge_limit_seen=1;printf("BRIDGE:limit:%s\n",reason);fflush(stdout);
}
static void bridge_note_error(int status, int curl_code) {
  if (bridge_error_noted) return;
  bridge_flow_snapshot('e');
  bridge_error_noted=1; printf("BRIDGE:issue:%d:%d\n",status,curl_code); fflush(stdout);
}
static int bridge_drop(struct bridge_client *c) {
  int confirmed = 1;
  if (c->easy) {
    if (curl_multi_remove_handle(bridge_multi, c->easy) != CURLM_OK) confirmed = 0;
    curl_easy_cleanup(c->easy); c->easy = NULL;
  }
  if (c->fd >= 0 && close(c->fd) < 0) confirmed = 0;
  memset(c, 0, sizeof(*c)); c->fd = -1;
  if (!confirmed) bridge_unconfirmed = 1;
  return confirmed;
}
BILISOFA_GUEST_EXPORT void bridge_stop(void) {
  if(bridge_fd>=0)bridge_flow_snapshot('s');
  for (int i = 0; i < BRIDGE_CLIENTS; i++) bridge_drop(&bridge_clients[i]);
  if (bridge_fd >= 0 && close(bridge_fd) < 0) bridge_unconfirmed = 1;
  bridge_fd = -1;
  if (bridge_multi && curl_multi_cleanup(bridge_multi) != CURLM_OK) bridge_unconfirmed = 1;
  bridge_multi = NULL;
  if (bridge_global) curl_global_cleanup();
  bridge_global = 0; bridge_progressive_total=bridge_stream_bytes=0;bridge_windows=0;memset(bridge_request_seen,0,sizeof(bridge_request_seen));
  memset(bridge_urls, 0, sizeof(bridge_urls)); memset(bridge_token, 0, sizeof(bridge_token));
  memset(bridge_referer,0,sizeof(bridge_referer));memset(bridge_mpd,0,sizeof(bridge_mpd));
#ifdef __EMSCRIPTEN__
  if (!bridge_external_loop) emscripten_cancel_main_loop();
#endif
  puts(bridge_unconfirmed ? "BRIDGE:failed:17" : "BRIDGE:stopped"); fflush(stdout);
}
static int bridge_manifest(const char *metadata) {
  unsigned int ms,w,h,vb,ab,vi,vx,ai,ax; char codec[12], canonical[256]; int end = 0;
  if (!metadata || strlen(metadata) > 255 || sscanf(metadata,"%u,%u,%u,%u,%u,%u,%u,%u,%u,%11[a-zA-Z0-9.]%n",&ms,&w,&h,&vb,&ab,&vi,&vx,&ai,&ax,codec,&end) != 10 || metadata[end]) return 0;
  if (!ms || ms > 86400000 || !w || w > 640 || !h || h > 640 || !vb || vb > 3000000 || !ab || ab > 256000 || vi < 8 || vx <= vi || vx > 1048576 || ai < 8 || ax <= ai || ax > 1048576 || strlen(codec) != 11 || strncmp(codec,"avc1.",5) || strspn(codec+5,"0123456789ABCDEFabcdef") != 6) return 0;
  snprintf(canonical,sizeof(canonical),"%u,%u,%u,%u,%u,%u,%u,%u,%u,%s",ms,w,h,vb,ab,vi,vx,ai,ax,codec);
  if (strcmp(canonical,metadata)) return 0;
  int n = snprintf(bridge_mpd,sizeof(bridge_mpd),"<?xml version=\"1.0\" encoding=\"UTF-8\"?><MPD xmlns=\"urn:mpeg:dash:schema:mpd:2011\" type=\"static\" profiles=\"urn:mpeg:dash:profile:isoff-on-demand:2011\" mediaPresentationDuration=\"PT%u.%03uS\" minBufferTime=\"PT1.5S\"><Period start=\"PT0S\"><AdaptationSet contentType=\"video\" mimeType=\"video/mp4\"><Representation id=\"v1\" bandwidth=\"%u\" codecs=\"%s\" width=\"%u\" height=\"%u\"><BaseURL>http://127.0.0.1:%d/%s/video.mp4</BaseURL><SegmentBase indexRange=\"%u-%u\"><Initialization range=\"0-%u\"/></SegmentBase></Representation></AdaptationSet><AdaptationSet contentType=\"audio\" mimeType=\"audio/mp4\"><Representation id=\"a1\" bandwidth=\"%u\" codecs=\"mp4a.40.2\"><BaseURL>http://127.0.0.1:%d/%s/audio.mp4</BaseURL><SegmentBase indexRange=\"%u-%u\"><Initialization range=\"0-%u\"/></SegmentBase></Representation></AdaptationSet></Period></MPD>",ms/1000,ms%1000,vb,codec,w,h,BILISOFA_BRIDGE_PORT,bridge_token,vi+1,vx,vi,ab,BILISOFA_BRIDGE_PORT,bridge_token,ai+1,ax,ai);
  bridge_duration_ms=ms;
  return n > 0 && (size_t)n < sizeof(bridge_mpd);
}
/* Internal probe budget: duration + setup/pause allowance, at most 15 minutes.
   The two signed destinations can only shorten this lease. Not URL renewal. */
static double bridge_probe_lease(unsigned int ms, double remaining_video, double remaining_audio) {
  double lease=(double)ms/1000+60;
  if (lease<180) lease=180;
  if (lease>900) lease=900;
  if (remaining_video<lease) lease=remaining_video;
  if (remaining_audio<lease) lease=remaining_audio;
  return lease;
}
static size_t bridge_body(char *data, size_t size, size_t count, void *context) {
  struct bridge_client *c = context;
  if (size && count > BRIDGE_BUFFER / size) return 0;
  size_t n = size * count;
  if (!(c->streaming?c->upstream_ready:c->header_done) || c->head || c->received + n > c->length) return 0;
  if(c->streaming && n>BRIDGE_STREAM_BUDGET-bridge_stream_bytes){bridge_limit_note("bytes");bridge_flow_snapshot('e');return 0;}
  if (n > BRIDGE_BUFFER - c->used) { c->paused = 1; return CURL_WRITEFUNC_PAUSE; }
  c->upstream_deadline=http_now()+15;
  memcpy(c->buffer + c->used, data, n); c->used += n; c->received += n;if(c->streaming){bridge_stream_bytes+=n;unsigned int mib=(unsigned int)(bridge_stream_bytes/4194304)*4;if(mib>bridge_read_mib_noted){bridge_read_mib_noted=mib;printf("BRIDGE:read_mib:%u\n",mib);fflush(stdout);}}return n;
}
static size_t bridge_header(char *data, size_t size, size_t count, void *context) {
  struct bridge_client *c = context; char line[4097];
  if (size && count > 4096 / size) return 0;
  size_t n = size * count;
  if (n > 4096 || c->upstream_headers > 16384 - n) return 0;
  c->upstream_deadline=http_now()+15;
  c->upstream_headers += n; memcpy(line,data,n); line[n]=0;
  if (!strncmp(line,"HTTP/",5)) {
    int status = 0; if (sscanf(line,"HTTP/%*s %d",&status) != 1 || status < 100 || status > 599) return 0;
    c->status = status; c->valid_range = 0; c->length = 0; c->length_seen = 0;c->upstream_ready=0;return n;
  }
  if (!strncasecmp(line,"Content-Range:",14)) {
    int used=0; unsigned long long a,b,total;
    if (c->valid_range || sscanf(line+14," bytes %13llu-%13llu/%13llu%n",&a,&b,&total,&used) != 3 || strcmp(line+14+used,"\r\n") || a != c->start || b < a || b > c->end || total <= b || total > 1099511627776ULL || b-a+1 > BRIDGE_RANGE) return 0;
    if(c->streaming && (b!=c->end || total!=bridge_progressive_total))return 0;
    c->valid_range=1; c->actual_end=b; c->total=total; c->length=b-a+1;
  }
  if (!strncasecmp(line,"Content-Encoding:",17) && strcasecmp(line+17," identity\r\n")) return 0;
  if (!strncasecmp(line,"Content-Length:",15)) {
    int used=0; unsigned long long length=0;
    if (c->length_seen || sscanf(line+15," %13llu%n",&length,&used)!=1 || strcmp(line+15+used,"\r\n") || !length || length>1099511627776ULL) return 0;
    c->announced_length=length; c->length_seen=1;
    if (c->head) c->length=length;
  }
  if (!strcmp(line,"\r\n") && c->status >= 200) {
    if (c->head ? c->status != 200 || !c->length : c->status != 206 || !c->valid_range || (c->length_seen && c->announced_length != c->length)) return 0;
    c->upstream_ready=1;
    if(c->header_done)return n;
    int written;
    const char *mime=c->kind==1 ? "video/mp4" : "audio/mp4";
    if(c->streaming && c->whole) written=snprintf(c->header,sizeof(c->header),"HTTP/1.1 200 OK\r\nContent-Type: video/mp4\r\nContent-Length: %llu\r\nAccept-Ranges: bytes\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n",c->response_length);
    else if(c->streaming) written=snprintf(c->header,sizeof(c->header),"HTTP/1.1 206 Partial Content\r\nContent-Type: video/mp4\r\nContent-Length: %llu\r\nContent-Range: bytes %llu-%llu/%llu\r\nAccept-Ranges: bytes\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n",c->response_length,c->response_start,c->response_end,bridge_progressive_total);
    else if (c->head) written=snprintf(c->header,sizeof(c->header),"HTTP/1.1 200 OK\r\nContent-Type: %s\r\nContent-Length: %llu\r\nAccept-Ranges: bytes\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n",mime,c->length);
    else written=snprintf(c->header,sizeof(c->header),"HTTP/1.1 206 Partial Content\r\nContent-Type: %s\r\nContent-Length: %llu\r\nContent-Range: bytes %llu-%llu/%llu\r\nAccept-Ranges: bytes\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n",mime,c->length,c->start,c->actual_end,c->total);
    if (written <= 0 || (size_t)written >= sizeof(c->header)) return 0;
    c->header_size=(size_t)written; c->header_done=1;
  }
  return n;
}
static void bridge_error(struct bridge_client *c, int status) {
  if (status != 502) bridge_note_error(status,0);
  if (c->easy) { if (curl_multi_remove_handle(bridge_multi,c->easy)!=CURLM_OK) bridge_unconfirmed=1; curl_easy_cleanup(c->easy); c->easy=NULL; }
  if (c->header_sent) { bridge_drop(c); return; }
  c->next_window=0;c->used=c->sent=0; c->header_size=(size_t)snprintf(c->header,sizeof(c->header),"HTTP/1.1 %d Error\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",status);
  if(status==416 && bridge_progressive)c->header_size=(size_t)snprintf(c->header,sizeof(c->header),"HTTP/1.1 416 Range Not Satisfiable\r\nContent-Range: bytes */%llu\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",bridge_progressive_total);
  c->header_done=1; c->done=1;
}
static int bridge_range(const char *value, unsigned long long *start, unsigned long long *end) {
  if (strncasecmp(value,"bytes=",6)) return 0;
  const char *p=value+6, *dash=strchr(p,'-');
  if (!dash || dash==p || dash-p>13 || strspn(p,"0123456789")!=(size_t)(dash-p)) return 0;
  *start=strtoull(p,NULL,10); if (*start>1099511627776ULL) return 0;
  p=dash+1;
  if (!strcmp(p,"\r\n")) *end=*start+BRIDGE_RANGE-1;
  else {
    const char *stop=p; while (*stop>='0' && *stop<='9') stop++;
    if (stop==p || stop-p>13 || strcmp(stop,"\r\n")) return 0;
    *end=strtoull(p,NULL,10); if (*end<*start || *end>1099511627776ULL) return 0;
    if (*end-*start+1>BRIDGE_RANGE) *end=*start+BRIDGE_RANGE-1;
  }
  return 1;
}
static void bridge_transfer(struct bridge_client *c) {
  int fresh=c->retry_at>0;c->retry_at=0;
  if(c->streaming){
    if(++bridge_windows>256 || bridge_stream_bytes>=BRIDGE_STREAM_BUDGET){bridge_limit_note(bridge_windows>256?"windows":"bytes");bridge_error(c,429);return;}
    if(!c->resume_window)c->end=c->response_end-c->start>=BRIDGE_RANGE?c->start+BRIDGE_RANGE-1:c->response_end;
    c->resume_window=0;
  }
  c->received=c->upstream_headers=0;c->valid_range=c->length_seen=c->upstream_ready=0;c->status=0;c->upstream_deadline=http_now()+15;
  c->easy=curl_easy_init(); if (!c->easy) { bridge_note_error(0,2);bridge_error(c,502); return; }
  CURL *easy=c->easy; char range[64]; snprintf(range,sizeof(range),"%llu-%llu",c->start,c->end);
#define BRIDGE_SET(option,value) do { CURLcode option_result=curl_easy_setopt(easy,option,value); if (option_result!=CURLE_OK) { bridge_note_error(0,(int)option_result);curl_easy_cleanup(c->easy); c->easy=NULL; bridge_error(c,502); return; } } while(0)
  BRIDGE_SET(CURLOPT_URL,bridge_urls[c->kind-1]);
  BRIDGE_SET(CURLOPT_USERAGENT,"BiliSofa-W01-Probe/0.0.29"); BRIDGE_SET(CURLOPT_REFERER,bridge_referer);
  BRIDGE_SET(CURLOPT_SSL_VERIFYPEER,1L); BRIDGE_SET(CURLOPT_SSL_VERIFYHOST,2L); BRIDGE_SET(CURLOPT_CAINFO,"/cacert.pem");
  BRIDGE_SET(CURLOPT_PROTOCOLS,CURLPROTO_HTTPS); BRIDGE_SET(CURLOPT_REDIR_PROTOCOLS,CURLPROTO_HTTPS); BRIDGE_SET(CURLOPT_FOLLOWLOCATION,0L); BRIDGE_SET(CURLOPT_PROXY,"");
#ifdef BILISOFA_BRIDGE_HOST_FIXTURE
  /* Host tests compile this isolated branch; shipping builds never accept HTTP. */
  BRIDGE_SET(CURLOPT_PROTOCOLS,CURLPROTO_HTTP);
#endif
  BRIDGE_SET(CURLOPT_NOSIGNAL,1L); BRIDGE_SET(CURLOPT_CONNECTTIMEOUT_MS,4000L); /* Wall-clock transfer time includes player backpressure. Progressive reads
     instead use a non-paused upstream inactivity deadline and the hard lease. */
  BRIDGE_SET(CURLOPT_TIMEOUT_MS,c->streaming?0L:15000L);
  BRIDGE_SET(CURLOPT_FRESH_CONNECT,fresh?1L:0L);
  BRIDGE_SET(CURLOPT_HTTP_VERSION,CURL_HTTP_VERSION_1_1);
  if (c->head) BRIDGE_SET(CURLOPT_NOBODY,1L); else BRIDGE_SET(CURLOPT_RANGE,range);
  BRIDGE_SET(CURLOPT_WRITEFUNCTION,bridge_body); BRIDGE_SET(CURLOPT_WRITEDATA,c); BRIDGE_SET(CURLOPT_HEADERFUNCTION,bridge_header); BRIDGE_SET(CURLOPT_HEADERDATA,c); BRIDGE_SET(CURLOPT_PRIVATE,c);
#undef BRIDGE_SET
  if (curl_multi_add_handle(bridge_multi,easy)!=CURLM_OK) { bridge_note_error(0,2);curl_easy_cleanup(c->easy); c->easy=NULL; bridge_error(c,502); }
}
/* Timed-out anonymous GET only: retry an unanswered range, or continue a
   completely validated 206 at the first byte not yet received. Keep buffered
   bytes and downstream headers, never replay an already received prefix.
   Two attempts per downstream client, three across the original bounded lease. */
static int bridge_retry_range(struct bridge_client *c,int code,double now) {
  int unanswered=!c->status && !c->received && !c->upstream_headers;
  int resumable=c->status==206 && c->upstream_ready && c->valid_range && c->received<c->length;
  if(!c->streaming || c->head || code!=CURLE_OPERATION_TIMEDOUT || (!unanswered && !resumable) || c->retries>=2 || bridge_retry_count>=3 || bridge_unconfirmed || now<0 || now+.25>=bridge_deadline || bridge_windows>=256 || bridge_stream_bytes>=BRIDGE_STREAM_BUDGET)return 0;
  if(c->easy){if(curl_multi_remove_handle(bridge_multi,c->easy)!=CURLM_OK){bridge_unconfirmed=1;return 0;}curl_easy_cleanup(c->easy);c->easy=NULL;}
  if(resumable){c->start+=c->received;c->resume_window=1;}
  c->retries++;c->paused=c->next_window=0;c->retry_at=now+.25;
  printf(resumable?"BRIDGE:resume:%u\n":"BRIDGE:retry:%u\n",++bridge_retry_count);fflush(stdout);return 1;
}
/* One failed range is not a whole-player failure when a different validated
   range is actively supplying body bytes. Close only that failed request; no
   extra retry or deadline extension. Decoder errors and all other failures keep
   their existing fatal path. At most one such isolation per media source. */
static int bridge_isolate_timeout(struct bridge_client *c,int code,double now) {
  if(!bridge_progressive || bridge_timeout_isolated || bridge_unconfirmed || !c->streaming || c->head || code!=CURLE_OPERATION_TIMEDOUT || c->status!=206 || !c->upstream_ready || !c->valid_range || now<0)return 0;
  for(int i=0;i<BRIDGE_CLIENTS;i++) {
    struct bridge_client *other=&bridge_clients[i];
    if(other==c || other->fd<0 || !other->streaming || other->head || other->kind!=c->kind || other->status!=206 || !other->upstream_ready || !other->valid_range || !other->body_forwarded || now<other->body_forwarded_at || now-other->body_forwarded_at>2)continue;
    bridge_timeout_isolated=1;puts("BRIDGE:request_timeout:1");fflush(stdout);return 1;
  }
  return 0;
}
/* A progressive response describes the whole selected interval; each upstream
   transfer remains at most 2 MiB. No unsolicited 206 for a full GET. */
static int bridge_progressive_range(const char *value,unsigned long long *start,unsigned long long *end,int *kind) {
  if(strncasecmp(value,"bytes=",6) || !bridge_progressive_total)return 0;
  const char *p=value+6;char *stop=NULL;unsigned long long a,b;
  if(*p=='-'){
    p++;size_t n=strspn(p,"0123456789");if(!n || n>13 || strcmp(p+n,"\r\n"))return 0;
    a=strtoull(p,&stop,10);if(!a || a>1099511627776ULL)return 0;
    *start=a>=bridge_progressive_total?0:bridge_progressive_total-a;*end=bridge_progressive_total-1;*kind=3;return 1;
  }
  size_t n=strspn(p,"0123456789");if(!n || n>13 || p[n]!='-')return 0;
  a=strtoull(p,&stop,10);if(a>=bridge_progressive_total)return 0;p+=n+1;
  if(!strcmp(p,"\r\n")){b=bridge_progressive_total-1;*kind=1;}
  else {n=strspn(p,"0123456789");if(!n || n>13 || strcmp(p+n,"\r\n"))return 0;b=strtoull(p,&stop,10);if(b<a || b>1099511627776ULL)return 0;if(b>=bridge_progressive_total)b=bridge_progressive_total-1;*kind=2;}
  *start=a;*end=b;return 1;
}
static void bridge_request(struct bridge_client *c) {
  char method[8], path[128], version[16]; int used=0;
  char *first=strstr(c->request,"\r\n"); if (!first) { bridge_error(c,400); return; }
  *first=0;
  if (sscanf(c->request,"%7s %127s %15s%n",method,path,version,&used)!=3 || c->request[used] || (strcmp(method,"GET") && strcmp(method,"HEAD")) || (strcmp(version,"HTTP/1.1") && strcmp(version,"HTTP/1.0"))) { bridge_error(c,400); return; }
  c->head=!strcmp(method,"HEAD"); char expected[128]; c->kind=-1;
  const char *names[]={"manifest.mpd","video.mp4","audio.mp4"};
  if (bridge_progressive) { snprintf(expected,sizeof(expected),"/%s/cast.mp4",bridge_token); if (!strcmp(path,expected)) c->kind=1; }
  else for (int i=0;i<3;i++) { snprintf(expected,sizeof(expected),"/%s/%s",bridge_token,names[i]); if (!strcmp(path,expected)) c->kind=i; }
  if (c->kind<0) { bridge_error(c,404); return; }
  int ranged=0,range_kind=0,body_length=0;c->start=0;c->end=bridge_progressive?bridge_progressive_total-1:BRIDGE_RANGE-1;
  for (char *line=first+2; *line && strcmp(line,"\r\n");) {
    char *stop=strstr(line,"\r\n"); if (!stop) { bridge_error(c,400); return; }
    char saved=stop[2]; stop[2]=0;
    if (!strncasecmp(line,"Range:",6) && !(bridge_progressive && c->head)) {
      char *value=line+6; while (*value==' ' || *value=='\t') value++;
      if (ranged++ || !(bridge_progressive?bridge_progressive_range(value,&c->start,&c->end,&range_kind):bridge_range(value,&c->start,&c->end))) { stop[2]=saved; bridge_error(c,416); return; }
    }
    if (!strncasecmp(line,"Content-Length:",15)) {
      char *value=line+15;while(*value==' ' || *value=='\t')value++;
      if(!bridge_progressive || body_length++ || strcmp(value,"0\r\n")){stop[2]=saved;bridge_error(c,400);return;}
    }
    if (!strncasecmp(line,"Transfer-Encoding:",18)) { stop[2]=saved;bridge_error(c,400);return; }
    stop[2]=saved; line=stop+2;
  }
  if (c->kind==0) {
    if (ranged) { bridge_error(c,416); return; }
    size_t length=strlen(bridge_mpd); memcpy(c->buffer,bridge_mpd,length); c->used=c->head ? 0:length;
    c->header_size=(size_t)snprintf(c->header,sizeof(c->header),"HTTP/1.1 200 OK\r\nContent-Type: application/dash+xml\r\nContent-Length: %zu\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n",length);
    c->header_done=1; c->done=1; c->status=200; return;
  }
  if(bridge_progressive){
    bridge_request_note(c->head?4:range_kind);
    if(c->head){c->header_size=(size_t)snprintf(c->header,sizeof(c->header),"HTTP/1.1 200 OK\r\nContent-Type: video/mp4\r\nContent-Length: %llu\r\nAccept-Ranges: bytes\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n",bridge_progressive_total);c->header_done=c->done=1;c->status=200;return;}
    c->streaming=1;c->whole=!ranged;c->response_start=c->start;c->response_end=c->end;c->response_length=c->end-c->start+1;
  }
  else if (!c->head && !ranged) { bridge_error(c,400); return; }
  bridge_transfer(c);
}
static int bridge_listen(void) {
  if (curl_global_init(CURL_GLOBAL_DEFAULT)!=CURLE_OK) { memset(bridge_urls,0,sizeof(bridge_urls));memset(bridge_token,0,sizeof(bridge_token));return 10; }
  bridge_global=1; bridge_multi=curl_multi_init(); bridge_fd=http_server_socket();
  if (!bridge_multi || bridge_fd<0) { bridge_stop(); return bridge_unconfirmed ? 17 : 10; }
  int reuse=1; struct sockaddr_in address; memset(&address,0,sizeof(address)); address.sin_family=AF_INET; address.sin_addr.s_addr=htonl(INADDR_LOOPBACK); address.sin_port=htons(BILISOFA_BRIDGE_PORT);
  if (setsockopt(bridge_fd,SOL_SOCKET,SO_REUSEADDR,&reuse,sizeof(reuse))<0 || bind(bridge_fd,(struct sockaddr *)&address,sizeof(address))<0 || listen(bridge_fd,4)<0) { bridge_stop(); return bridge_unconfirmed ? 17 : 12; }
  bridge_connections=0; memset(bridge_seen,0,sizeof(bridge_seen)); bridge_error_noted=0;bridge_flow_seen=bridge_limit_seen=bridge_retry_count=bridge_burst_noted=bridge_read_mib_noted=bridge_timeout_isolated=0;bridge_forwarded=0;
  return 0;
}
static int bridge_begin(const char *bvid,const char *token,const char *video,const char *audio,const char *metadata) {
  if (bridge_unconfirmed || bridge_fd>=0 || bridge_multi) return 17;
  if (!guest_bvid_valid(bvid) || !token || strlen(token)!=32 || strspn(token,"0123456789abcdef")!=32 || !guest_cdn_valid(video) || !guest_cdn_valid(audio)) return 16;
  for (int i=0;i<BRIDGE_CLIENTS;i++) { memset(&bridge_clients[i],0,sizeof(bridge_clients[i])); bridge_clients[i].fd=-1; }
  bridge_progressive=bridge_external_loop=0;
  strcpy(bridge_token,token); if (!bridge_manifest(metadata)) return 16;
  strcpy(bridge_urls[0],video); strcpy(bridge_urls[1],audio); snprintf(bridge_referer,sizeof(bridge_referer),"https://www.bilibili.com/video/%s",bvid);
  int opened=bridge_listen(); if (opened) return opened;
  double remaining[2];
  for (int i=0;i<2;i++) {
    const char *deadline=strstr(bridge_urls[i],"?deadline="); if (!deadline) deadline=strstr(bridge_urls[i],"&deadline=");
    remaining[i]=(double)strtoull(deadline+10,NULL,10)-(double)time(NULL)-5;
  }
  bridge_deadline=http_now()+bridge_probe_lease(bridge_duration_ms,remaining[0],remaining[1]);
  puts("BRIDGE:ready"); fflush(stdout); return 0;
}
/* Only the native verified-candidate owner calls this. No URL is accepted from
   parent IPC or the local HTTP route. Source has finished before curl reopens. */
static int bridge_progressive_begin(const char *token,const char *url,double remaining,unsigned long long total) {
  if (bridge_unconfirmed || bridge_fd>=0 || bridge_multi || !token || strlen(token)!=32 || strspn(token,"0123456789abcdef")!=32 || !url || strlen(url)>2048 || remaining<5 || total<512 || total>1099511627776ULL) return 16;
  for(int i=0;i<BRIDGE_CLIENTS;i++){memset(&bridge_clients[i],0,sizeof(bridge_clients[i]));bridge_clients[i].fd=-1;}
  bridge_progressive=bridge_external_loop=1;
  strcpy(bridge_token,token);strcpy(bridge_urls[0],url);bridge_urls[1][0]=bridge_mpd[0]=0;
  strcpy(bridge_referer,"https://www.bilibili.com/");
  int opened=bridge_listen();if(opened)return opened;
  bridge_progressive_total=total;bridge_stream_bytes=0;bridge_windows=0;memset(bridge_request_seen,0,sizeof(bridge_request_seen));
  /* Internal progressive-cast probe: five minutes including setup/pauses;
     the signed destination deadline can only shorten the window. */
  bridge_deadline=http_now()+(remaining<300?remaining:300);
  puts("BRIDGE:ready");fflush(stdout);return 0;
}
static void bridge_io_round(double now) {
  int running=0;
  if (curl_multi_perform(bridge_multi,&running)!=CURLM_OK) { bridge_unconfirmed=1; bridge_stop(); return; }
  int remaining=0; CURLMsg *message;
  while ((message=curl_multi_info_read(bridge_multi,&remaining))) {
    if (message->msg!=CURLMSG_DONE) continue;
    struct bridge_client *c=NULL; curl_easy_getinfo(message->easy_handle,CURLINFO_PRIVATE,&c);
    if (!c) continue;
    if (message->data.result!=CURLE_OK || !c->header_done || (c->streaming && !c->upstream_ready) || (!c->head && c->received!=c->length)) { if(bridge_retry_range(c,(int)message->data.result,now))continue;if(!bridge_isolate_timeout(c,(int)message->data.result,now))bridge_note_error(c->status,(int)message->data.result); bridge_error(c,502); continue; }
    if(c->streaming && c->actual_end<c->response_end)c->next_window=1;else c->done=1;
    if (curl_multi_remove_handle(bridge_multi,c->easy)!=CURLM_OK) bridge_unconfirmed=1;
    curl_easy_cleanup(c->easy); c->easy=NULL;
  }
  for (int i=0;i<BRIDGE_CLIENTS;i++) {
    struct bridge_client *c=&bridge_clients[i]; if (c->fd<0 || !c->header_done) continue;
    const char *bytes=NULL; size_t length=0; int header=c->header_sent<c->header_size;
    if (header) { bytes=c->header+c->header_sent; length=c->header_size-c->header_sent; }
    else if (c->used>c->sent) { bytes=(const char *)c->buffer+c->sent; length=c->used-c->sent; }
    if (length) {
      int flags=0;
#ifdef MSG_NOSIGNAL
      flags=MSG_NOSIGNAL;
#endif
      ssize_t n=send(c->fd,bytes,length,flags);
      if (n>0) { if(c->streaming){c->deadline=now+20;bridge_forwarded+=(unsigned long long)n;if(!header){c->body_forwarded=1;c->body_forwarded_at=now;}} if (header) c->header_sent+=(size_t)n; else c->sent+=(size_t)n; }
      else if (n==0 || (errno!=EAGAIN && errno!=EWOULDBLOCK && errno!=EINTR)) { bridge_drop(c); continue; }
    }
    if (c->sent==c->used) c->sent=c->used=0;
    if(c->next_window && !c->used && c->header_sent==c->header_size){c->next_window=0;c->start=c->actual_end+1;bridge_transfer(c);}
    if (c->done && c->header_sent==c->header_size && !c->used) {
      int kind=c->kind, success=!c->head && ((kind==0 && c->status==200) || (kind>0 && kind<3 && c->status==206));
      if (bridge_drop(c) && success && !bridge_seen[kind]) { bridge_seen[kind]=1; printf("BRIDGE:served:%d\n",kind); fflush(stdout); }
      continue;
    }
    if (c->paused && c->easy && BRIDGE_BUFFER-c->used>=16384) { c->paused=0;c->upstream_deadline=now+15; if (curl_easy_pause(c->easy,CURLPAUSE_CONT)!=CURLE_OK) bridge_error(c,502); }
  }
}
static void bridge_tick(void) {
  if (bridge_fd<0) return;
  double now=http_now();
  if (now<0 || now>=bridge_deadline || bridge_connections>=512 || bridge_unconfirmed) { if(now>=bridge_deadline)bridge_limit_note("lease");else if(bridge_connections>=512)bridge_limit_note("connections");bridge_stop(); return; }
  /* No waiting poll or easy_perform: each tick yields to the Worker stop owner. */
  for (int i=0;i<BRIDGE_CLIENTS;i++) {
    struct bridge_client *c=&bridge_clients[i];
    if (c->fd<0) {
      int fd=http_accept(bridge_fd); if (fd<0) continue;
      c->fd=fd; c->deadline=now+20; bridge_connections++;
#ifdef SO_NOSIGPIPE
      int no_signal=1; setsockopt(fd,SOL_SOCKET,SO_NOSIGPIPE,&no_signal,sizeof(no_signal));
#endif
    }
    if ((!c->streaming || !c->request_done) && now>=c->deadline) { bridge_drop(c); continue; }
    if(c->retry_at>0 && now>=c->retry_at)bridge_transfer(c);
    if(c->streaming && c->easy && !c->paused && now>=c->upstream_deadline){if(bridge_retry_range(c,CURLE_OPERATION_TIMEDOUT,now))continue;if(!bridge_isolate_timeout(c,CURLE_OPERATION_TIMEDOUT,now))bridge_note_error(c->status,28);bridge_error(c,502);continue;}
    if (!c->request_done) {
      ssize_t n=recv(c->fd,c->request+c->request_size,4096-c->request_size,0);
      if (n>0) {
        if (memchr(c->request+c->request_size,0,(size_t)n)) { bridge_drop(c); continue; }
        c->request_size+=(size_t)n; c->request[c->request_size]=0;
        char *end=strstr(c->request,"\r\n\r\n");
        if (end) { c->request_done=1; if (end+4!=c->request+c->request_size) bridge_error(c,400); else bridge_request(c); }
        else if (c->request_size==4096) { c->request_done=1; bridge_error(c,431); }
      } else if (n==0 || (errno!=EAGAIN && errno!=EWOULDBLOCK && errno!=EINTR)) { bridge_drop(c); continue; }
    }
  }
  /* A 50 ms main-loop interval must not cap a ready stream to one cURL read.
     Drain only while progress occurs, with fixed rounds/bytes/time budgets.
     No additional payload buffer, no busy wait, and no change to source/lease. */
  double quantum_start=now;unsigned long long sent_start=bridge_forwarded;
  for(unsigned int round=0;round<(bridge_progressive?8U:1U);round++) {
    unsigned long long before=bridge_stream_bytes+bridge_forwarded;
    bridge_io_round(now);
    if(bridge_fd<0)return;
    unsigned long long after=bridge_stream_bytes+bridge_forwarded;
    if(round && after>before && !bridge_burst_noted){bridge_burst_noted=1;puts("BRIDGE:pump:burst");fflush(stdout);}
    double next=http_now();
    if(next<0 || next>=bridge_deadline){bridge_limit_note("lease");bridge_stop();return;}
    if(after==before || bridge_forwarded-sent_start>=1048576 || next-quantum_start>=.010)break;
    now=next;
  }
}
#endif
