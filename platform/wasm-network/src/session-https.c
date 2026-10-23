/* Original bounded, on-TV-only synthetic HTTPS fixture. No external targets or credentials. */
#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif
#include <stdio.h>
#include <string.h>
#include <strings.h>
#include <stdint.h>
#include <errno.h>
#include <unistd.h>
#include <fcntl.h>
#include <poll.h>
#include <time.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <curl/curl.h>
#include <openssl/ssl.h>
#include <openssl/rand.h>
#include <openssl/err.h>
#include <openssl/x509v3.h>
#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#endif
#ifndef HTTPS_SESSION_PORT
#define HTTPS_SESSION_PORT 40327
#endif
#ifndef HTTPS_PLAIN_PORT
#define HTTPS_PLAIN_PORT 40328
#endif
static CURL *jars[2], *current;
static CURLM *multi;
static struct curl_slist *resolve_hosts;
static SSL_CTX *tls;
static SSL *peer;
static int server=-1, plain=-1, client=-1, handshake, phase, live, initialized, added, bad_close, observed, header_seen, cookie_seen;
static double deadline, phase_until, client_until;
static char token[33], secrets[2][33], request[4097], response[1024], url[256];
static size_t used, size_out, sent, header_bytes, body_bytes;
static const char *const paths[]={"auth/set-a","auth/empty","auth/check-a","auth/set-b","auth/check-b","auth/check-a","auth/redirect","auth/plain","auth/cdn","outside","auth/empty","auth/check-b"};
static const int owners[]={0,1,0,1,1,0,0,0,0,0,0,1};
static const int cookies[]={-1,-1,0,-1,1,0,0,-1,-1,-1,-1,1};
static double now_ms(void) { struct timespec t; if(clock_gettime(CLOCK_MONOTONIC,&t))return -1;return t.tv_sec*1000.0+t.tv_nsec/1000000.0; }
static void emit(const char *line) { puts(line);fflush(stdout); }
static int create_socket(void) {
#if defined(__EMSCRIPTEN__) || defined(__linux__)
  return socket(AF_INET,SOCK_STREAM|SOCK_NONBLOCK,0);
#else
  int fd=socket(AF_INET,SOCK_STREAM,0);if(fd>=0 && fcntl(fd,F_SETFL,O_NONBLOCK)<0){close(fd);return -1;}return fd;
#endif
}
static int accept_peer(int fd) {
#if defined(__EMSCRIPTEN__) || defined(__linux__)
  return accept4(fd,NULL,NULL,SOCK_NONBLOCK);
#else
  int result=accept(fd,NULL,NULL);if(result>=0 && fcntl(result,F_SETFL,O_NONBLOCK)<0){close(result);return -1;}return result;
#endif
}
static int bind_local(int port) {
  int fd=create_socket(),reuse=1;if(fd<0)return -1;
  struct sockaddr_in a;memset(&a,0,sizeof(a));a.sin_family=AF_INET;a.sin_addr.s_addr=htonl(INADDR_LOOPBACK);a.sin_port=htons(port);
  if(setsockopt(fd,SOL_SOCKET,SO_REUSEADDR,&reuse,sizeof(reuse))<0 || bind(fd,(struct sockaddr *)&a,sizeof(a))<0 || listen(fd,1)<0){close(fd);return -1;}return fd;
}
static void drop_peer(void) {
  if(peer)SSL_free(peer);peer=NULL;
  if(client>=0 && close(client)<0)bad_close=1;client=-1;handshake=0;
  OPENSSL_cleanse(request,sizeof(request));OPENSSL_cleanse(response,sizeof(response));used=size_out=sent=0;
}
static void finish(int code) {
  live=0;
  if(added && curl_multi_remove_handle(multi,current)!=CURLM_OK)bad_close=1;added=0;current=NULL;
  for(int i=0;i<2;i++)if(jars[i]){if(curl_easy_setopt(jars[i],CURLOPT_COOKIELIST,"ALL")!=CURLE_OK)bad_close=1;curl_easy_cleanup(jars[i]);jars[i]=NULL;}
  if(multi && curl_multi_cleanup(multi)!=CURLM_OK)bad_close=1;multi=NULL;
  curl_slist_free_all(resolve_hosts);resolve_hosts=NULL;drop_peer();
  if(server>=0 && close(server)<0)bad_close=1;server=-1;
  if(plain>=0 && close(plain)<0)bad_close=1;plain=-1;
  if(tls)SSL_CTX_free(tls);tls=NULL;
  if(initialized)curl_global_cleanup();initialized=0;
  OPENSSL_cleanse(secrets,sizeof(secrets));OPENSSL_cleanse(token,sizeof(token));OPENSSL_cleanse(url,sizeof(url));
#ifdef __EMSCRIPTEN__
  emscripten_cancel_main_loop();
#endif
  if(bad_close)emit("HSESSION:unclosed");
  else if(code<0)emit("HSESSION:cancelled");
  else if(code) { printf("HSESSION:failed:%d\n",code);fflush(stdout); }
  else emit("HSESSION:pass");
}
static int random_hex(char out[33]) {
  unsigned char raw[16];if(RAND_bytes(raw,sizeof(raw))!=1)return 0;
  static const char hex[]="0123456789abcdef";for(size_t i=0;i<sizeof(raw);i++){out[i*2]=hex[raw[i]>>4];out[i*2+1]=hex[raw[i]&15];}out[32]=0;OPENSSL_cleanse(raw,sizeof(raw));return 1;
}
/* Ephemeral public certificate only; the private key is never serialized. */
static int create_tls(BIO **public_pem) {
  EVP_PKEY *key=NULL;EVP_PKEY_CTX *k=EVP_PKEY_CTX_new_id(EVP_PKEY_EC,NULL);X509 *cert=X509_new();BIO *pem=NULL;int ok=0;
  if(!k || !cert || EVP_PKEY_keygen_init(k)<=0 || EVP_PKEY_CTX_set_ec_paramgen_curve_nid(k,NID_X9_62_prime256v1)<=0 || EVP_PKEY_keygen(k,&key)<=0)goto done;
  unsigned char serial[16];if(RAND_bytes(serial,sizeof(serial))!=1)goto done;serial[0]&=0x7f;serial[0]|=1;
  BIGNUM *bn=BN_bin2bn(serial,sizeof(serial),NULL);OPENSSL_cleanse(serial,sizeof(serial));
  if(!bn || !BN_to_ASN1_INTEGER(bn,X509_get_serialNumber(cert))){BN_free(bn);goto done;}BN_free(bn);
  X509_NAME *name=X509_get_subject_name(cert);
  if(!X509_set_version(cert,2) || !X509_gmtime_adj(X509_getm_notBefore(cert),-300) || !X509_gmtime_adj(X509_getm_notAfter(cert),3600) ||
     !X509_NAME_add_entry_by_txt(name,"CN",MBSTRING_ASC,(const unsigned char *)"BiliSofa ephemeral fixture",-1,-1,0) || !X509_set_issuer_name(cert,name) || !X509_set_pubkey(cert,key))goto done;
  const int nids[]={NID_basic_constraints,NID_key_usage,NID_ext_key_usage,NID_subject_alt_name};
  const char *values[]={"critical,CA:FALSE","critical,digitalSignature","serverAuth","DNS:account.bilisofa.invalid,DNS:cdn.bilisofa.invalid"};
  for(int i=0;i<4;i++){X509_EXTENSION *ext=X509V3_EXT_conf_nid(NULL,NULL,nids[i],(char *)values[i]);if(!ext)goto done;int good=X509_add_ext(cert,ext,-1);X509_EXTENSION_free(ext);if(!good)goto done;}
  if(!X509_sign(cert,key,EVP_sha256()))goto done;
  tls=SSL_CTX_new(TLS_server_method());pem=BIO_new(BIO_s_mem());
  if(!tls || !pem || !SSL_CTX_set_min_proto_version(tls,TLS1_2_VERSION) || !SSL_CTX_set_max_proto_version(tls,TLS1_2_VERSION) || !SSL_CTX_use_certificate(tls,cert) || !SSL_CTX_use_PrivateKey(tls,key) || !SSL_CTX_check_private_key(tls) || !PEM_write_bio_X509(pem,cert))goto done;
  SSL_CTX_set_session_cache_mode(tls,SSL_SESS_CACHE_OFF);SSL_CTX_set_options(tls,SSL_OP_NO_TICKET);
  *public_pem=pem;pem=NULL;ok=1;
done:
  BIO_free(pem);X509_free(cert);EVP_PKEY_free(key);EVP_PKEY_CTX_free(k);return ok;
}
static size_t body_cb(char *data,size_t unit,size_t count,void *opaque) {
  (void)opaque;if(unit && count>2/unit)return 0;size_t n=unit*count;
  if(n>2-body_bytes || memcmp(data,&"ok"[body_bytes],n))return 0;body_bytes+=n;return n;
}
static size_t header_cb(char *data,size_t unit,size_t count,void *opaque) {
  (void)opaque;if(unit && count>8192/unit)return 0;size_t n=unit*count;
  if(n>8192-header_bytes)return 0;header_bytes+=n;
  if(n==24 && !memcmp(data,"X-BiliSofa-Probe: wire\r\n",24))header_seen++;
  if(n>=11 && !strncasecmp(data,"Set-Cookie:",11))cookie_seen++;
  return n;
}
static int begin_phase(void) {
  current=jars[owners[phase]];observed=header_seen=cookie_seen=0;body_bytes=header_bytes=0;
  if(phase==10 && curl_easy_setopt(current,CURLOPT_COOKIELIST,"ALL")!=CURLE_OK)return 16;
  int n=snprintf(url,sizeof(url),"%s://%s:%d/%s/%s",phase==7?"http":"https",phase==8?"cdn.bilisofa.invalid":"account.bilisofa.invalid",phase==7?HTTPS_PLAIN_PORT:HTTPS_SESSION_PORT,token,paths[phase]);
  if(n<=0 || (size_t)n>=sizeof(url))return 16;
  if(curl_easy_setopt(current,CURLOPT_PROTOCOLS_STR,phase==7?"http":"https")!=CURLE_OK || curl_easy_setopt(current,CURLOPT_URL,url)!=CURLE_OK || curl_multi_add_handle(multi,current)!=CURLM_OK)return 16;
  added=1;phase_until=now_ms()+4000;return 0;
}
static int build_response(void) {
  char wanted[256],cookie[128]="",host[96]="";int cookie_count=0,host_count=0,fields=0;
  char *end=strstr(request,"\r\n");if(!end)return 0;
  snprintf(wanted,sizeof(wanted),"GET /%s/%s HTTP/1.1",token,paths[phase]);
  if((size_t)(end-request)!=strlen(wanted) || memcmp(request,wanted,strlen(wanted)))return 0;
  for(char *line=end+2;*line && strncmp(line,"\r\n",2);){
    char *stop=strstr(line,"\r\n"),*colon=strchr(line,':');if(!stop || !colon || colon>=stop || stop-line>1024 || ++fields>24)return 0;
    char *value=colon+1;while(value<stop && (*value==' ' || *value=='\t'))value++;
    if(colon-line==6 && !strncasecmp(line,"Cookie",6)){if(cookie_count++ || stop-value>=128)return 0;memcpy(cookie,value,(size_t)(stop-value));}
    if(colon-line==4 && !strncasecmp(line,"Host",4)){if(host_count++ || stop-value>=96)return 0;memcpy(host,value,(size_t)(stop-value));}
    if(colon-line==13 && !strncasecmp(line,"Authorization",13))return 0;
    line=stop+2;
  }
  snprintf(wanted,sizeof(wanted),"%s:%d",phase==8?"cdn.bilisofa.invalid":"account.bilisofa.invalid",phase==7?HTTPS_PLAIN_PORT:HTTPS_SESSION_PORT);
  if(host_count!=1 || strcmp(host,wanted) || observed)return 0;
  wanted[0]=0;if(cookies[phase]>=0)snprintf(wanted,sizeof(wanted),"bilisofa_probe=%s",secrets[cookies[phase]]);
  if(strcmp(cookie,wanted))return 0;observed=1;
  char extra[256]="";
  if(phase==0 || phase==3)snprintf(extra,sizeof(extra),"Set-Cookie: bilisofa_probe=%s; Path=/%s/auth; Secure; HttpOnly; SameSite=Lax\r\n",secrets[phase==0?0:1],token);
  if(phase==6)snprintf(extra,sizeof(extra),"Location: https://cdn.bilisofa.invalid:%d/%s/must-not-follow\r\n",HTTPS_SESSION_PORT,token);
  int n=snprintf(response,sizeof(response),"HTTP/1.1 %s\r\nContent-Length: 2\r\nX-BiliSofa-Probe: wire\r\n%sConnection: close\r\n\r\nok",phase==6?"302 Found":"200 OK",extra);
  OPENSSL_cleanse(cookie,sizeof(cookie));OPENSSL_cleanse(wanted,sizeof(wanted));OPENSSL_cleanse(extra,sizeof(extra));
  if(n<=0 || (size_t)n>=sizeof(response))return 0;size_out=(size_t)n;return 1;
}
static int ssl_pending(int result) { int e=SSL_get_error(peer,result);return e==SSL_ERROR_WANT_READ || e==SSL_ERROR_WANT_WRITE; }
static int serve(void) {
  if(client<0){int fd=accept_peer(phase==7?plain:server);if(fd<0)return errno==EAGAIN || errno==EWOULDBLOCK || errno==EINTR;
    client=fd;client_until=now_ms()+3000;
#ifdef SO_NOSIGPIPE
    int no_signal=1;setsockopt(client,SOL_SOCKET,SO_NOSIGPIPE,&no_signal,sizeof(no_signal));
#endif
    if(phase!=7){peer=SSL_new(tls);if(!peer || !SSL_set_fd(peer,client))return 0;}else handshake=1;
  }
  if(now_ms()>=client_until)return 0;
  if(!handshake){ERR_clear_error();int r=SSL_accept(peer);if(r==1)handshake=1;else return ssl_pending(r);}
  if(!size_out){ERR_clear_error();int r=peer?SSL_read(peer,request+used,(int)(4096-used)):(int)recv(client,request+used,4096-used,0);
    if(r>0){if(memchr(request+used,0,(size_t)r))return 0;used+=(size_t)r;request[used]=0;if(strstr(request,"\r\n\r\n")){if(!build_response())return 0;}else if(used==4096)return 0;}
    else return peer?ssl_pending(r):r<0 && (errno==EAGAIN || errno==EWOULDBLOCK || errno==EINTR);
  }
  if(size_out){int r;
    if(peer){ERR_clear_error();r=SSL_write(peer,response+sent,(int)(size_out-sent));}
    else {int flags=0;
#ifdef MSG_NOSIGNAL
      flags=MSG_NOSIGNAL;
#endif
      r=(int)send(client,response+sent,size_out-sent,flags);
    }
    if(r>0)sent+=(size_t)r;
    else return peer?ssl_pending(r):r<0 && (errno==EAGAIN || errno==EWOULDBLOCK || errno==EINTR);
    if(sent==size_out)drop_peer();
  }return 1;
}
static int cookie_attributes(void) {
  struct curl_slist *list=NULL;if(curl_easy_getinfo(current,CURLINFO_COOKIELIST,&list)!=CURLE_OK)return 0;
  char wanted[256];snprintf(wanted,sizeof(wanted),"#HttpOnly_account.bilisofa.invalid\tFALSE\t/%s/auth\tTRUE\t0\tbilisofa_probe\t%s",token,secrets[phase==0?0:1]);
  int valid=list && !list->next && !strcmp(list->data,wanted);curl_slist_free_all(list);OPENSSL_cleanse(wanted,sizeof(wanted));return valid;
}
static void tick(void) {
  if(!live)return;double now=now_ms();if(now<0 || now>=deadline || now>=phase_until){finish(20);return;}
  if(!serve()){finish(18);return;}
  if(bad_close){finish(17);return;}
  int running=0;if(curl_multi_perform(multi,&running)!=CURLM_OK){finish(19);return;}
  int left;CURLMsg *m;
  while((m=curl_multi_info_read(multi,&left))){
    if(m->msg!=CURLMSG_DONE || m->easy_handle!=current){finish(19);return;}
    long status=0,verify=0;int valid=curl_easy_getinfo(current,CURLINFO_RESPONSE_CODE,&status)==CURLE_OK && curl_easy_getinfo(current,CURLINFO_SSL_VERIFYRESULT,&verify)==CURLE_OK && m->data.result==CURLE_OK && verify==0 && status==(phase==6?302:200) && observed==1 && header_seen==1 && cookie_seen==(phase==0 || phase==3) && body_bytes==2;
    if(phase==0 || phase==3)valid=valid && cookie_attributes();
    if(!valid){finish(19);return;}
    if(curl_multi_remove_handle(multi,current)!=CURLM_OK){bad_close=1;finish(17);return;}added=0;current=NULL;
    if(phase==0){emit("HSESSION:tls");emit("HSESSION:cookie");}
    if(phase==5)emit("HSESSION:isolation");
    if(phase==6)emit("HSESSION:redirect");
    if(phase==9)emit("HSESSION:scope");
    if(++phase==12){emit("HSESSION:clear");finish(0);return;}
    int error=begin_phase();if(error)finish(error);return;
  }
}
#ifdef __EMSCRIPTEN__
EMSCRIPTEN_KEEPALIVE
#endif
void https_session_stop(void) { if(live)finish(-1); }
#if defined(HTTPS_SESSION_HOST_TEST) && defined(__EMSCRIPTEN__)
#error HOST fixture version exception must never be used for TV
#endif
static int start(void) {
  if(live || multi || server>=0 || plain>=0 || bad_close)return 17;
  const curl_version_info_data *v=curl_version_info(CURLVERSION_NOW);
  if(!v || strcmp(v->version,"8.23.0") || !v->ssl_version)return 10;
#ifdef HTTPS_SESSION_HOST_TEST
  if(strncmp(v->ssl_version,"OpenSSL/3.",10))return 10;
#else
  if(strncmp(v->ssl_version,"OpenSSL/3.5.9",13) || strncmp(OpenSSL_version(OPENSSL_VERSION),"OpenSSL 3.5.9 ",14))return 10;
#endif
  if(curl_global_init(CURL_GLOBAL_DEFAULT)!=CURLE_OK)return 10;initialized=1;
  BIO *pem=NULL;int error=10;
  if(!random_hex(token) || !random_hex(secrets[0]) || !random_hex(secrets[1]) || !strcmp(secrets[0],secrets[1]) || !create_tls(&pem))goto failed;
  server=bind_local(HTTPS_SESSION_PORT);plain=bind_local(HTTPS_PLAIN_PORT);multi=curl_multi_init();
  if(server<0 || plain<0 || !multi)goto failed;
  char address[128];const char *hosts[]={"account.bilisofa.invalid","cdn.bilisofa.invalid"};
  for(int i=0;i<3;i++){snprintf(address,sizeof(address),"%s:%d:127.0.0.1",hosts[i==1?1:0],i==2?HTTPS_PLAIN_PORT:HTTPS_SESSION_PORT);struct curl_slist *next=curl_slist_append(resolve_hosts,address);if(!next)goto failed;resolve_hosts=next;}
  char *pub;long pub_size=BIO_get_mem_data(pem,&pub);if(pub_size<=0 || pub_size>4096)goto failed;
  struct curl_blob trust={pub,(size_t)pub_size,CURL_BLOB_COPY};
  for(int i=0;i<2;i++){
    CURL *c=jars[i]=curl_easy_init();if(!c)goto failed;
#define SET(option,value) do {if(curl_easy_setopt(c,option,value)!=CURLE_OK){error=16;goto failed;}} while(0)
    SET(CURLOPT_COOKIEFILE,"");SET(CURLOPT_FOLLOWLOCATION,0L);SET(CURLOPT_PROTOCOLS_STR,"https");SET(CURLOPT_REDIR_PROTOCOLS_STR,"https");
    SET(CURLOPT_RESOLVE,resolve_hosts);SET(CURLOPT_PROXY,"");SET(CURLOPT_NOPROXY,"*");SET(CURLOPT_HTTP_VERSION,CURL_HTTP_VERSION_1_1);
    SET(CURLOPT_SSL_VERIFYPEER,1L);SET(CURLOPT_SSL_VERIFYHOST,2L);SET(CURLOPT_CAINFO_BLOB,&trust);SET(CURLOPT_CAINFO,NULL);SET(CURLOPT_CAPATH,NULL);
    SET(CURLOPT_CONNECTTIMEOUT_MS,2000L);SET(CURLOPT_TIMEOUT_MS,3500L);SET(CURLOPT_NOSIGNAL,1L);
    SET(CURLOPT_WRITEFUNCTION,body_cb);SET(CURLOPT_HEADERFUNCTION,header_cb);SET(CURLOPT_FORBID_REUSE,1L);
#undef SET
  }
  BIO_free(pem);pem=NULL;phase=0;deadline=now_ms()+45000;live=1;
  if(now_ms()<0){error=20;goto failed;}
  error=begin_phase();if(error)goto failed;
  emit("HSESSION:ready");return 0;
failed:
  BIO_free(pem);finish(error);return error;
}
#ifndef HTTPS_SESSION_NO_MAIN
int main(void) {
  int error=start();if(error)return 1;
#ifdef __EMSCRIPTEN__
  emscripten_set_main_loop(tick,40,0);
#else
  while(live){tick();struct timespec wait={0,1000000};nanosleep(&wait,NULL);}
#endif
  return 0;
}
#endif
