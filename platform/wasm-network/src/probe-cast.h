/* Original discovery-only foreground probe. No media target, account, callback
   URL, phone identity, request body or header enters UI/diagnostic IPC; SOAP
   bytes are read only by the owning local Worker through scoped native getters. */
#ifndef BILISOFA_PROBE_CAST_H
#define BILISOFA_PROBE_CAST_H
#ifndef BILISOFA_CAST_PORT
#define BILISOFA_CAST_PORT 40325
#endif
#ifndef BILISOFA_CAST_SSDP_PORT
#define BILISOFA_CAST_SSDP_PORT 1900
#endif
#define CAST_RESOURCES 6
static int cast_tcp=-1,cast_udp=-1,cast_joined=0,cast_unconfirmed=0,cast_connections=0,cast_replies=0,cast_started=0;
static struct ip_mreq cast_group;
static char cast_ip[16],cast_uuid[37],cast_token[33],cast_location[160];
static const char *cast_types[CAST_RESOURCES]={NULL,"upnp:rootdevice","urn:schemas-upnp-org:device:MediaRenderer:1","urn:schemas-upnp-org:service:AVTransport:1","urn:schemas-upnp-org:service:RenderingControl:1","urn:schemas-upnp-org:service:ConnectionManager:1"};
static unsigned int cast_seen[7];
static int cast_rpc_enabled=0;
static char cast_rpc_response[6145];
static double cast_deadline,cast_announce;
struct cast_client { int fd,ready,connection_id,rpc_id,rpc_service; uint32_t peer_key; size_t used,size,sent,body_start,body_size; double deadline; char action[256],request[8193],response[8192]; };
static struct cast_client cast_clients[2]={{.fd=-1},{.fd=-1}};
struct cast_reply { int active,kind; double at; struct sockaddr_in peer; };
static struct cast_reply cast_queue[16];
#include "probe-cast-source.h"
static int cast_private(struct in_addr address) {
  uint32_t a=ntohl(address.s_addr);
#ifdef BILISOFA_CAST_HOST_FIXTURE
  if (a==0x7f000001) return 1;
#endif
  return (a>>24)==10 || (a>>20)==0xac1 || (a>>16)==0xc0a8;
}
static int cast_multicast_begin(struct in_addr address) {
  memset(&cast_group,0,sizeof(cast_group));
  cast_group.imr_multiaddr.s_addr=inet_addr("239.255.255.250");
  cast_group.imr_interface=address;
  unsigned char ttl=1;
  /* Samsung's supported options omit IP_MULTICAST_IF. Keep the explicitly
     selected receive membership; outbound discovery uses the TV's IPv4 route.
     The destination and TTL remain fixed to this local-link probe. */
  if(setsockopt(cast_udp,IPPROTO_IP,IP_MULTICAST_TTL,&ttl,sizeof(ttl))<0)return 131;
  if(setsockopt(cast_udp,IPPROTO_IP,IP_ADD_MEMBERSHIP,&cast_group,sizeof(cast_group))<0)return 132;
  cast_joined=1;
  return 0;
}
static void cast_note(int kind) { if (cast_seen[kind]<999) cast_seen[kind]++; if(cast_seen[kind]==1){printf("CAST:seen:%d\n",kind);fflush(stdout);} }
static void cast_drop(struct cast_client *c) { if(c->fd>=0 && close(c->fd)<0)cast_unconfirmed=1;memset(c,0,sizeof(*c));c->fd=-1; }
static int cast_packet(char *out,size_t capacity,int kind,int notify,int bye) {
  char uuid[48],usn[160];snprintf(uuid,sizeof(uuid),"uuid:%s",cast_uuid);
  const char *type=kind==0?uuid:cast_types[kind];
  if(kind==0)snprintf(usn,sizeof(usn),"%s",uuid);else snprintf(usn,sizeof(usn),"%s::%s",uuid,type);
  if(notify && bye)return snprintf(out,capacity,"NOTIFY * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nNT: %s\r\nNTS: ssdp:byebye\r\nUSN: %s\r\n\r\n",type,usn);
  if(notify)return snprintf(out,capacity,"NOTIFY * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nCACHE-CONTROL: max-age=60\r\nLOCATION: %s\r\nNT: %s\r\nNTS: ssdp:alive\r\nSERVER: BiliSofa/0.0.28 UPnP/1.0 DiscoveryProbe/1\r\nUSN: %s\r\n\r\n",cast_location,type,usn);
  return snprintf(out,capacity,"HTTP/1.1 200 OK\r\nCACHE-CONTROL: max-age=60\r\nEXT:\r\nLOCATION: %s\r\nSERVER: BiliSofa/0.0.28 UPnP/1.0 DiscoveryProbe/1\r\nST: %s\r\nUSN: %s\r\n\r\n",cast_location,type,usn);
}
static void cast_advertise(int bye) {
#ifndef BILISOFA_CAST_HOST_FIXTURE
  struct sockaddr_in peer;memset(&peer,0,sizeof(peer));peer.sin_family=AF_INET;peer.sin_port=htons(1900);peer.sin_addr.s_addr=inet_addr("239.255.255.250");
  for(int i=0;i<CAST_RESOURCES;i++){char packet[1024];int n=cast_packet(packet,sizeof(packet),i,1,bye);if(n>0 && (size_t)n<sizeof(packet))sendto(cast_udp,packet,(size_t)n,0,(struct sockaddr *)&peer,sizeof(peer));}
#else
  (void)bye;
#endif
}
BILISOFA_GUEST_EXPORT void cast_stop(void) {
  int was_started=cast_started;cast_started=0;
  if(bridge_external_loop && (bridge_fd>=0 || bridge_multi || bridge_global))bridge_stop();
  if(bridge_unconfirmed)cast_unconfirmed=1;
  cast_source_stop();
  if(was_started && cast_udp>=0)cast_advertise(1);
  for(int i=0;i<2;i++)cast_drop(&cast_clients[i]);
  if(cast_joined && setsockopt(cast_udp,IPPROTO_IP,IP_DROP_MEMBERSHIP,&cast_group,sizeof(cast_group))<0)cast_unconfirmed=1;
  if(cast_tcp>=0 && close(cast_tcp)<0)cast_unconfirmed=1;
  if(cast_udp>=0 && close(cast_udp)<0)cast_unconfirmed=1;
  cast_tcp=cast_udp=-1;cast_joined=0;memset(cast_queue,0,sizeof(cast_queue));
  cast_rpc_enabled=0;memset(cast_rpc_response,0,sizeof(cast_rpc_response));
  memset(cast_ip,0,sizeof(cast_ip));memset(cast_uuid,0,sizeof(cast_uuid));memset(cast_token,0,sizeof(cast_token));memset(cast_location,0,sizeof(cast_location));
#ifdef __EMSCRIPTEN__
  emscripten_cancel_main_loop();
#endif
  if(cast_unconfirmed)puts("CAST:failed:17");else if(was_started)printf("CAST:closed:%u:%u:%u:%u:%u:%u:%u\n",cast_seen[0],cast_seen[1],cast_seen[2],cast_seen[3],cast_seen[4],cast_seen[5],cast_seen[6]);fflush(stdout);
}
/* One datagram, not an HTTP stream. Ignore unknown searches without fetching
   their locations; only a validated private source receives bounded replies. */
static int cast_search(char *packet,size_t length,int *mx) {
  if(length>=2048 || length<4 || packet[length-1]!='\n' || memchr(packet,0,length))return 0;
  for(size_t i=0;i<length;i++)if((unsigned char)packet[i]>126 || ((unsigned char)packet[i]<32 && packet[i]!='\r' && packet[i]!='\n' && packet[i]!='\t'))return 0;
  if(length<4 || strcmp(packet+length-4,"\r\n\r\n"))return 0;
  char *line=strstr(packet,"\r\n");if(!line)return 0;*line=0;if(strcmp(packet,"M-SEARCH * HTTP/1.1"))return 0;
  char st[160]="";int host=0,man=0,mx_seen=0,headers=0;
  for(line+=2;*line && strcmp(line,"\r\n");){char *end=strstr(line,"\r\n"),*colon=strchr(line,':');if(!end || !colon || colon>=end || end-line>256 || ++headers>24)return 0;*end=0;*colon=0;char *value=colon+1;while(*value==' ' || *value=='\t')value++;char *tail=end;while(tail>value && (tail[-1]==' ' || tail[-1]=='\t'))*--tail=0;
    if(!strcasecmp(line,"HOST")){if(host++ || (strcmp(value,"239.255.255.250:1900") && strcmp(value,"239.255.255.250")))return 0;}
    else if(!strcasecmp(line,"MAN")){if(man++ || strcmp(value,"\"ssdp:discover\""))return 0;}
    else if(!strcasecmp(line,"MX")){if(mx_seen++ || strlen(value)!=1 || value[0]<'1' || value[0]>'5')return 0;*mx=value[0]-'0';}
    else if(!strcasecmp(line,"ST")){if(*st || !*value || strlen(value)>=sizeof(st))return 0;strcpy(st,value);}
    line=end+2;
  }
  if(!host || !man || !mx_seen || !*st)return 0;
  int mask=0;char uuid[48];snprintf(uuid,sizeof(uuid),"uuid:%s",cast_uuid);
  for(int i=0;i<CAST_RESOURCES;i++)if(!strcmp(st,"ssdp:all") || !strcmp(st,i==0?uuid:cast_types[i]))mask|=1<<i;
  return mask?mask:-1;
}
static void cast_make_response(struct cast_client *c,int status,const char *body,int head) {
  int n=snprintf(c->response,sizeof(c->response),"HTTP/1.1 %d %s\r\nContent-Type: text/xml; charset=utf-8\r\nContent-Length: %zu\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n%s",status,status==200?"OK":status==500?"Internal Server Error":"Error",strlen(body),head?"":body);
  if(n<=0 || (size_t)n>=sizeof(c->response)){cast_drop(c);return;}c->ready=1;c->size=(size_t)n;
}
static struct cast_client *cast_rpc_find(int id) {
  for(int i=0;i<2;i++)if(cast_clients[i].fd>=0 && cast_clients[i].rpc_id==id && id>0)return &cast_clients[i];
  return NULL;
}
BILISOFA_GUEST_EXPORT void cast_rpc_enable(void) { cast_rpc_enabled=1; }
BILISOFA_GUEST_EXPORT uintptr_t cast_rpc_body(int id) { struct cast_client *c=cast_rpc_find(id);return c?(uintptr_t)(c->request+c->body_start):0; }
BILISOFA_GUEST_EXPORT unsigned int cast_rpc_body_size(int id) { struct cast_client *c=cast_rpc_find(id);return c?(unsigned int)c->body_size:0; }
BILISOFA_GUEST_EXPORT uintptr_t cast_rpc_action(int id) { struct cast_client *c=cast_rpc_find(id);return c?(uintptr_t)c->action:0; }
BILISOFA_GUEST_EXPORT int cast_rpc_service(int id) { struct cast_client *c=cast_rpc_find(id);return c?c->rpc_service:0; }
BILISOFA_GUEST_EXPORT unsigned int cast_rpc_peer(int id) { struct cast_client *c=cast_rpc_find(id);return c?c->peer_key:0; }
BILISOFA_GUEST_EXPORT uintptr_t cast_rpc_buffer(void) { return (uintptr_t)cast_rpc_response; }
BILISOFA_GUEST_EXPORT int cast_rpc_reply(int id,int status,unsigned int length) {
  struct cast_client *c=cast_rpc_find(id);
  if(!c){memset(cast_rpc_response,0,sizeof(cast_rpc_response));return 0;}
  if((status!=200 && status!=500) || !length || length>6144 || memchr(cast_rpc_response,0,length)){memset(cast_rpc_response,0,sizeof(cast_rpc_response));return -1;}
  cast_rpc_response[length]=0;c->rpc_id=0;
  if(status==500)cast_note(4);
  cast_make_response(c,status,cast_rpc_response,0);
  memset(cast_rpc_response,0,sizeof(cast_rpc_response));memset(c->request,0,sizeof(c->request));memset(c->action,0,sizeof(c->action));c->used=c->body_start=c->body_size=0;
  return 1;
}
static void cast_http(struct cast_client *c) {
  char *end=strstr(c->request,"\r\n\r\n");if(!end)return;
  size_t head_bytes=(size_t)(end+4-c->request);if(head_bytes>4096){cast_make_response(c,431,"",0);return;}
  char method[16],path[160],version[16];int used=0;char *first=strstr(c->request,"\r\n");if(!first){cast_drop(c);return;}
  char saved=*first;*first=0;int valid=sscanf(c->request,"%15s %159s %15s%n",method,path,version,&used)==3 && !c->request[used];*first=saved;
  if(!valid || (strcmp(version,"HTTP/1.1") && strcmp(version,"HTTP/1.0") && strcmp(version,"NVA/1.0"))){cast_make_response(c,400,"",0);return;}
  size_t body=0;int cl=0,fields=0;char action[256]="";
  for(char *line=first+2;line<end;){char *stop=strstr(line,"\r\n"),*colon=strchr(line,':');if(!stop || !colon || colon>=stop || stop-line>1024 || ++fields>32){cast_make_response(c,400,"",0);return;}
    if((size_t)(colon-line)==14 && !strncasecmp(line,"Content-Length",14)){char *v=colon+1;while(*v==' ' || *v=='\t')v++;char *z=v;while(*z>='0' && *z<='9')z++;while(*z==' ' || *z=='\t')z++;if(cl++ || z!=stop || z==v || z-v>8){cast_make_response(c,400,"",0);return;}body=(size_t)strtoul(v,NULL,10);}
    if((size_t)(colon-line)==10 && !strncasecmp(line,"SOAPAction",10)){char *v=colon+1;while(*v==' ' || *v=='\t')v++;char *z=stop;while(z>v && (z[-1]==' ' || z[-1]=='\t'))z--;if(*action || z==v || (size_t)(z-v)>=sizeof(action)){cast_make_response(c,400,"",0);return;}memcpy(action,v,(size_t)(z-v));action[z-v]=0;}
    if((size_t)(colon-line)==17 && !strncasecmp(line,"Transfer-Encoding",17)){cast_make_response(c,400,"",0);return;}
    line=stop+2;
  }
  if(body>4096){cast_make_response(c,413,"",0);return;}
  if(c->used<head_bytes+body)return;
  if(c->used!=head_bytes+body){cast_make_response(c,400,"",0);return;}
  char expected[192],xml[6144];snprintf(expected,sizeof(expected),"/%s/description.xml",cast_token);
  int head=!strcmp(method,"HEAD"),get=!strcmp(method,"GET");
  if((head || get) && body){cast_make_response(c,400,"",head);return;}
  if((get || head) && !strcmp(path,expected)){
    int n=snprintf(xml,sizeof(xml),"<?xml version=\"1.0\"?><root xmlns=\"urn:schemas-upnp-org:device-1-0\"><specVersion><major>1</major><minor>0</minor></specVersion><device><deviceType>urn:schemas-upnp-org:device:MediaRenderer:1</deviceType><friendlyName>BiliSofa W01 Discovery</friendlyName><manufacturer>BiliSofa contributors</manufacturer><modelDescription>Discovery only; media control unavailable in this probe</modelDescription><modelName>BiliSofa W01 Probe</modelName><UDN>uuid:%s</UDN><serviceList>",cast_uuid);
    for(int i=3;i<6 && n>0 && (size_t)n<sizeof(xml);i++){const char *name=i==3?"AVTransport":i==4?"RenderingControl":"ConnectionManager";int more=snprintf(xml+n,sizeof(xml)-(size_t)n,"<service><serviceType>%s</serviceType><serviceId>urn:upnp-org:serviceId:%s</serviceId><SCPDURL>/%s/%s.xml</SCPDURL><controlURL>/%s/control/%s</controlURL><eventSubURL>/%s/event/%s</eventSubURL></service>",cast_types[i],name,cast_token,name,cast_token,name,cast_token,name);if(more<0){n=-1;break;}n+=more;}
    if(n<=0 || (size_t)n+40>=sizeof(xml)){cast_drop(c);return;}strcpy(xml+n,"</serviceList></device></root>");cast_make_response(c,200,xml,head);if(get)cast_note(2);return;
  }
  for(int i=3;i<6;i++){const char *name=i==3?"AVTransport":i==4?"RenderingControl":"ConnectionManager";snprintf(expected,sizeof(expected),"/%s/%s.xml",cast_token,name);
    if((get || head) && !strcmp(path,expected)){const char *scpd=i==5?"<?xml version=\"1.0\"?><scpd xmlns=\"urn:schemas-upnp-org:service-1-0\"><specVersion><major>1</major><minor>0</minor></specVersion><actionList><action><name>GetProtocolInfo</name><argumentList><argument><name>Source</name><direction>out</direction><relatedStateVariable>SourceProtocolInfo</relatedStateVariable></argument><argument><name>Sink</name><direction>out</direction><relatedStateVariable>SinkProtocolInfo</relatedStateVariable></argument></argumentList></action></actionList><serviceStateTable><stateVariable sendEvents=\"no\"><name>SourceProtocolInfo</name><dataType>string</dataType></stateVariable><stateVariable sendEvents=\"no\"><name>SinkProtocolInfo</name><dataType>string</dataType></stateVariable></serviceStateTable></scpd>":"<?xml version=\"1.0\"?><scpd xmlns=\"urn:schemas-upnp-org:service-1-0\"><specVersion><major>1</major><minor>0</minor></specVersion><actionList/><serviceStateTable/></scpd>";cast_make_response(c,200,scpd,head);if(get)cast_note(3);return;}
    snprintf(expected,sizeof(expected),"/%s/control/%s",cast_token,name);if(!strcmp(method,"POST") && !strcmp(path,expected)){
      if(cast_rpc_enabled){c->rpc_id=c->connection_id;c->rpc_service=i;c->body_start=head_bytes;c->body_size=body;strcpy(c->action,action);printf("CAST:rpc:%d\n",c->rpc_id);fflush(stdout);return;}
      if(i==5 && !strcmp(action,"\"urn:schemas-upnp-org:service:ConnectionManager:1#GetProtocolInfo\"")){cast_note(6);cast_make_response(c,200,"<?xml version=\"1.0\"?><s:Envelope xmlns:s=\"http://schemas.xmlsoap.org/soap/envelope/\"><s:Body><u:GetProtocolInfoResponse xmlns:u=\"urn:schemas-upnp-org:service:ConnectionManager:1\"><Source></Source><Sink>http-get:*:video/mp4:*</Sink></u:GetProtocolInfoResponse></s:Body></s:Envelope>",0);return;}cast_note(4);cast_make_response(c,500,"<?xml version=\"1.0\"?><s:Envelope xmlns:s=\"http://schemas.xmlsoap.org/soap/envelope/\"><s:Body><s:Fault><faultcode>s:Client</faultcode><faultstring>UPnPError</faultstring><detail><UPnPError xmlns=\"urn:schemas-upnp-org:control-1-0\"><errorCode>401</errorCode><errorDescription>Invalid Action</errorDescription></UPnPError></detail></s:Fault></s:Body></s:Envelope>",0);return;}
  }
  if(!strcmp(method,"SETUP") && !strcmp(path,"/projection")){cast_note(5);cast_make_response(c,501,"",0);return;}
  cast_make_response(c,get || head?404:405,"",head);
}
static int cast_begin(const char *ip,const char *uuid,const char *token) {
  if(cast_unconfirmed || cast_tcp>=0 || cast_udp>=0)return 17;
  struct in_addr address;char canonical[16];
  if(!ip || strlen(ip)>15 || inet_pton(AF_INET,ip,&address)!=1 || !cast_private(address) || !inet_ntop(AF_INET,&address,canonical,sizeof(canonical)) || strcmp(ip,canonical) || !uuid || strlen(uuid)!=36 || !token || strlen(token)!=32 || strspn(token,"0123456789abcdef")!=32)return 16;
  for(int i=0;i<36;i++)if(i==8 || i==13 || i==18 || i==23){if(uuid[i]!='-')return 16;}else if(!strchr("0123456789abcdef",uuid[i]))return 16;
  cast_source_attempted=cast_media_attempted=0;cast_source_forget();
  strcpy(cast_ip,ip);strcpy(cast_uuid,uuid);strcpy(cast_token,token);memset(cast_seen,0,sizeof(cast_seen));memset(cast_queue,0,sizeof(cast_queue));cast_connections=cast_replies=0;
  for(int i=0;i<2;i++){memset(&cast_clients[i],0,sizeof(cast_clients[i]));cast_clients[i].fd=-1;}
  snprintf(cast_location,sizeof(cast_location),"http://%s:%d/%s/description.xml",ip,BILISOFA_CAST_PORT,token);
  cast_tcp=http_server_socket();
#if defined(__EMSCRIPTEN__) || defined(__linux__)
  cast_udp=socket(AF_INET,SOCK_DGRAM|SOCK_NONBLOCK,0);
#else
  cast_udp=socket(AF_INET,SOCK_DGRAM,0);if(cast_udp>=0 && fcntl(cast_udp,F_SETFL,O_NONBLOCK)<0){close(cast_udp);cast_udp=-1;}
#endif
  int result=0,reuse=1;
  struct sockaddr_in local;memset(&local,0,sizeof(local));local.sin_family=AF_INET;local.sin_addr=address;local.sin_port=htons(BILISOFA_CAST_PORT);
  if(cast_tcp<0 || cast_udp<0)result=10;
  else if(setsockopt(cast_tcp,SOL_SOCKET,SO_REUSEADDR,&reuse,sizeof(reuse))<0 || setsockopt(cast_udp,SOL_SOCKET,SO_REUSEADDR,&reuse,sizeof(reuse))<0)result=11;
  else if(bind(cast_tcp,(struct sockaddr *)&local,sizeof(local))<0 || listen(cast_tcp,2)<0)result=12;
  local.sin_addr.s_addr=htonl(INADDR_ANY);local.sin_port=htons(BILISOFA_CAST_SSDP_PORT);
  if(!result && bind(cast_udp,(struct sockaddr *)&local,sizeof(local))<0)result=12;
#ifndef BILISOFA_CAST_HOST_FIXTURE
  if(!result)result=cast_multicast_begin(address);
#endif
  double now=http_now();if(now<0)result=14;
  if(result){cast_stop();return cast_unconfirmed?17:result;}
  char seed[9];memcpy(seed,token,8);seed[8]=0;srand((unsigned int)strtoul(seed,NULL,16));cast_deadline=now+300;cast_announce=now+0.3+(double)(rand()%1000000)/1000000;cast_started=1;
  puts("CAST:ready");fflush(stdout);return 0;
}
static void cast_tick(void) {
  if(cast_tcp<0)return;
  double now=http_now();if(now<0 || now>=cast_deadline || cast_connections>=128 || cast_unconfirmed){cast_stop();return;}
  cast_source_tick();
  if(bridge_external_loop && bridge_fd>=0)bridge_tick();
  if(bridge_unconfirmed)cast_unconfirmed=1;
  if(cast_unconfirmed){cast_stop();return;}
  if(now>=cast_announce){cast_advertise(0);cast_announce=now+30;}
  for(int n=0;n<4;n++){char packet[2049];struct sockaddr_in peer;socklen_t size=sizeof(peer);ssize_t got=recvfrom(cast_udp,packet,2048,0,(struct sockaddr *)&peer,&size);if(got<0)break;if(got>=2048 || size!=sizeof(peer) || !cast_private(peer.sin_addr) || ntohs(peer.sin_port)<1024)continue;packet[got]=0;int mx=0,mask=cast_search(packet,(size_t)got,&mx);memset(packet,0,sizeof(packet));if(!mask)continue;cast_note(0);if(mask<0)continue;
    for(int i=0;i<CAST_RESOURCES;i++)if(mask&(1<<i))for(int q=0;q<16;q++)if(!cast_queue[q].active){cast_queue[q].active=1;cast_queue[q].kind=i;cast_queue[q].peer=peer;cast_queue[q].at=now+(double)(rand()%1000000)/1000000*mx;break;}
  }
  for(int q=0;q<16;q++)if(cast_queue[q].active && now>=cast_queue[q].at){struct cast_reply *r=&cast_queue[q];if(cast_replies<64){char packet[1024];int n=cast_packet(packet,sizeof(packet),r->kind,0,0);if(n>0 && (size_t)n<sizeof(packet) && sendto(cast_udp,packet,(size_t)n,0,(struct sockaddr *)&r->peer,sizeof(r->peer))==n){cast_replies++;cast_note(1);}}memset(r,0,sizeof(*r));}
  for(int i=0;i<2;i++){struct cast_client *c=&cast_clients[i];if(c->fd<0){int fd=http_accept(cast_tcp);if(fd<0)continue;struct sockaddr_in peer;socklen_t size=sizeof(peer);if(getpeername(fd,(struct sockaddr *)&peer,&size)<0 || size!=sizeof(peer) || !cast_private(peer.sin_addr)){if(close(fd)<0)cast_unconfirmed=1;continue;}c->fd=fd;c->peer_key=ntohl(peer.sin_addr.s_addr);c->deadline=now+5;c->connection_id=++cast_connections;
#ifdef SO_NOSIGPIPE
    int no_signal=1;setsockopt(fd,SOL_SOCKET,SO_NOSIGPIPE,&no_signal,sizeof(no_signal));
#endif
    }
    if(now>=c->deadline){cast_drop(c);continue;}
    if(!c->ready && !c->rpc_id){ssize_t n=recv(c->fd,c->request+c->used,8192-c->used,0);if(n>0){if(memchr(c->request+c->used,0,(size_t)n)){cast_drop(c);continue;}c->used+=(size_t)n;c->request[c->used]=0;cast_http(c);if(c->fd>=0 && c->used==8192 && !c->ready && !c->rpc_id)cast_make_response(c,413,"",0);}else if(n==0 || (errno!=EAGAIN && errno!=EWOULDBLOCK && errno!=EINTR)){cast_drop(c);continue;}}
    if(c->ready){int flags=0;
#ifdef MSG_NOSIGNAL
      flags=MSG_NOSIGNAL;
#endif
      ssize_t n=send(c->fd,c->response+c->sent,c->size-c->sent,flags);if(n>0)c->sent+=(size_t)n;else if(n==0 || (errno!=EAGAIN && errno!=EWOULDBLOCK && errno!=EINTR)){cast_drop(c);continue;}if(c->sent==c->size)cast_drop(c);}
  }
}
#endif
