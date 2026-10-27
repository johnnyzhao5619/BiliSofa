#include "service-config.h"
#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif
/* BiliSofa original W01 probe. No account writes, raw response/headers or addresses in output. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <errno.h>
#include <unistd.h>
#include <fcntl.h>
#include <poll.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <curl/curl.h>
#include "probe-http.h"
#include "probe-media.h"
#include "probe-service.h"
#include "probe-guest.h"
#include "probe-bridge.h"
#include "probe-cast.h"
#include "probe-session.h"

static void outcome(const char *id, int result) { printf("PROBE:%s:%d\n", id, result); fflush(stdout); }
static int readable(int fd) {
  struct pollfd item = { fd, POLLIN, 0 };
  int rc = poll(&item, 1, 1500);
  return rc > 0 && (item.revents & POLLIN);
}
static int tcp_probe(void) {
  int server = -1, client = -1, accepted = -1, result = 1;
  struct sockaddr_in address; memset(&address, 0, sizeof(address));
  address.sin_family = AF_INET; address.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
  socklen_t size = sizeof(address); char buffer[16];
  server = socket(AF_INET, SOCK_STREAM, 0); if (server < 0) goto done;
  if (bind(server, (struct sockaddr *)&address, sizeof(address)) < 0 || listen(server, 1) < 0) goto done;
  if (getsockname(server, (struct sockaddr *)&address, &size) < 0) goto done;
  client = socket(AF_INET, SOCK_STREAM, 0); if (client < 0) goto done;
  if (connect(client, (struct sockaddr *)&address, size) < 0 || !readable(server)) goto done;
  accepted = accept(server, NULL, NULL); if (accepted < 0) goto done;
  if (send(client, "BiliProbe", 9, 0) != 9 || !readable(accepted)) goto done;
  if (recv(accepted, buffer, sizeof(buffer), 0) != 9 || memcmp(buffer, "BiliProbe", 9)) goto done;
  result = 0;
done:
  if (accepted >= 0) close(accepted);
  if (client >= 0) close(client);
  if (server >= 0) close(server);
  return result;
}
static int udp_probe(void) {
  int receiver = -1, sender = -1, result = 1;
  struct sockaddr_in address; memset(&address, 0, sizeof(address));
  address.sin_family = AF_INET; address.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
  socklen_t size = sizeof(address); char buffer[16];
  receiver = socket(AF_INET, SOCK_DGRAM, 0); sender = socket(AF_INET, SOCK_DGRAM, 0);
  if (receiver < 0 || sender < 0) goto done;
  if (bind(receiver, (struct sockaddr *)&address, size) < 0 || getsockname(receiver, (struct sockaddr *)&address, &size) < 0) goto done;
  if (sendto(sender, "BiliProbe", 9, 0, (struct sockaddr *)&address, size) != 9 || !readable(receiver)) goto done;
  if (recvfrom(receiver, buffer, sizeof(buffer), 0, NULL, NULL) == 9 && !memcmp(buffer, "BiliProbe", 9)) result = 0;
done:
  if (receiver >= 0) close(receiver);
  if (sender >= 0) close(sender);
  return result;
}
static int multicast_probe(void) {
  int fd = -1, result = 1, joined = 0;
  struct sockaddr_in address; memset(&address, 0, sizeof(address));
  address.sin_family = AF_INET; address.sin_port = htons(39871); address.sin_addr.s_addr = htonl(INADDR_ANY);
  struct ip_mreq group; memset(&group, 0, sizeof(group));
  group.imr_multiaddr.s_addr = inet_addr("239.255.42.99"); group.imr_interface.s_addr = htonl(INADDR_ANY);
  char buffer[16]; int reuse = 1; unsigned char ttl = 1, loop = 1;
  fd = socket(AF_INET, SOCK_DGRAM, 0); if (fd < 0) goto done;
  if (setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse)) < 0) goto done;
  if (bind(fd, (struct sockaddr *)&address, sizeof(address)) < 0) goto done;
  if (setsockopt(fd, IPPROTO_IP, IP_ADD_MEMBERSHIP, &group, sizeof(group)) < 0) goto done;
  joined = 1;
  if (setsockopt(fd, IPPROTO_IP, IP_MULTICAST_TTL, &ttl, sizeof(ttl)) < 0 || setsockopt(fd, IPPROTO_IP, IP_MULTICAST_LOOP, &loop, sizeof(loop)) < 0) goto done;
  address.sin_addr = group.imr_multiaddr;
  if (sendto(fd, "BiliProbe", 9, 0, (struct sockaddr *)&address, sizeof(address)) != 9 || !readable(fd)) goto done;
  if (recvfrom(fd, buffer, sizeof(buffer), 0, NULL, NULL) == 9 && !memcmp(buffer, "BiliProbe", 9)) result = 0;
done:
  if (joined) setsockopt(fd, IPPROTO_IP, IP_DROP_MEMBERSHIP, &group, sizeof(group));
  if (fd >= 0) close(fd);
  return result;
}
struct response { size_t bytes, header_bytes; int set_cookie_seen; };
static size_t discard_body(char *data, size_t size, size_t count, void *context) {
  (void)data;
  struct response *response = context;
  if (size && count > 65536 / size) return 0;
  size_t bytes = size * count;
  if (response->bytes > 65536 - bytes) return 0;
  response->bytes += bytes; return bytes;
}
static size_t discard_header(char *data, size_t size, size_t count, void *context) {
  struct response *response = context;
  if (size && count > 8192 / size) return 0;
  size_t bytes = size * count;
  if (response->header_bytes > 8192 - bytes) return 0;
  response->header_bytes += bytes;
  if (bytes >= 11 && !strncasecmp(data, "Set-Cookie:", 11)) response->set_cookie_seen = 1;
  return bytes;
}
static int https_probe(void) {
  CURL *curl = curl_easy_init(); if (!curl) return 1;
  struct response response = {0, 0, 0}; long status = 0;
  struct curl_slist *headers = NULL;
  headers = curl_slist_append(headers, "Accept: application/json");
  curl_easy_setopt(curl, CURLOPT_URL, SERVICE_ADDRESS_A_34A874714ED0);
  curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
  curl_easy_setopt(curl, CURLOPT_USERAGENT, "BiliSofa-W01-Probe/0.0.1");
  curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 1L);
  curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 2L);
  curl_easy_setopt(curl, CURLOPT_CAINFO, "/cacert.pem");
  curl_easy_setopt(curl, CURLOPT_PROTOCOLS, CURLPROTO_HTTPS);
  curl_easy_setopt(curl, CURLOPT_REDIR_PROTOCOLS, CURLPROTO_HTTPS);
  curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 0L); /* Redirect cannot forward credentials. */
  curl_easy_setopt(curl, CURLOPT_CONNECTTIMEOUT_MS, 4000L);
  curl_easy_setopt(curl, CURLOPT_TIMEOUT_MS, 8000L);
  curl_easy_setopt(curl, CURLOPT_NOSIGNAL, 1L);
  curl_easy_setopt(curl, CURLOPT_PROXY, "");
  curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, discard_body);
  curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
  curl_easy_setopt(curl, CURLOPT_HEADERFUNCTION, discard_header);
  curl_easy_setopt(curl, CURLOPT_HEADERDATA, &response);
  CURLcode rc = curl_easy_perform(curl);
  curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &status);
  int result = (rc == CURLE_OK && status == 200 && response.bytes > 0) ? 0 : 1;
  /* No body/status/header/cookies logged. No cookie storage or real account login. */
  curl_slist_free_all(headers); curl_easy_cleanup(curl); return result;
}
static int cookie_isolation_probe(void) {
  CURL *a = curl_easy_init(), *b = curl_easy_init();
  int result = 1; struct curl_slist *ca = NULL, *cb = NULL;
  if (!a || !b) goto done;
  curl_easy_setopt(a, CURLOPT_COOKIEFILE, ""); curl_easy_setopt(b, CURLOPT_COOKIEFILE, "");
  /* Synthetic-only local cookie engine checks: never sent to a real host. */
  if (curl_easy_setopt(a, CURLOPT_COOKIELIST, "Set-Cookie: probe=A; domain=synthetic.invalid; path=/; Secure") != CURLE_OK) goto done;
  curl_easy_getinfo(a, CURLINFO_COOKIELIST, &ca); curl_easy_getinfo(b, CURLINFO_COOKIELIST, &cb);
  if (!ca || cb) goto done;
  if (curl_easy_setopt(b, CURLOPT_COOKIELIST, "Set-Cookie: probe=B; domain=synthetic.invalid; path=/; Secure") != CURLE_OK) goto done;
  curl_slist_free_all(cb); cb = NULL;
  curl_easy_getinfo(b, CURLINFO_COOKIELIST, &cb);
  if (cb && strstr(ca->data, "\tA") && strstr(cb->data, "\tB")) result = 0;
done:
  curl_slist_free_all(ca); curl_slist_free_all(cb);
  if (a) curl_easy_cleanup(a);
  if (b) curl_easy_cleanup(b);
  return result;
}
int main(int argc, char **argv) {
#ifdef __EMSCRIPTEN__
  if(argc==3 && !strcmp(argv[1],"session-wire")) {
    if(!session_begin(argv[2]))emscripten_set_main_loop(session_tick,20,0);
    return 0;
  }
  if(argc==5 && !strcmp(argv[1],"cast")) {
    int result=cast_begin(argv[2],argv[3],argv[4]);
    if(result){printf("CAST:failed:%d\n",result);fflush(stdout);}else emscripten_set_main_loop(cast_tick,20,0);
    return 0;
  }
  if (argc == 7 && !strcmp(argv[1], "bridge")) {
    int result = bridge_begin(argv[2],argv[3],argv[4],argv[5],argv[6]);
    if (result) { printf("BRIDGE:failed:%d\n",result); fflush(stdout); }
    else emscripten_set_main_loop(bridge_tick,20,0);
    return 0;
  }
#else
  (void)bridge_begin; (void)bridge_tick; (void)cast_begin; (void)cast_tick;(void)session_begin;(void)session_tick;
#endif
  if (argc == 3 && !strcmp(argv[1], "guest-view")) { guest_video(argv[2], NULL, NULL); return 0; }
  if (argc == 4 && !strcmp(argv[1], "guest-playurl")) { guest_video(argv[2], argv[3], NULL); return 0; }
  if (argc == 4 && !strcmp(argv[1], "guest-range")) { guest_video(argv[2], NULL, argv[3]); return 0; }
  if (argc == 3 && !strcmp(argv[1], "guest-popular")) { guest_popular(argv[2]); return 0; }
#ifdef __EMSCRIPTEN__
  if ((argc == 2 && !strcmp(argv[1], "mpd")) || (argc == 3 && !strcmp(argv[1], "http"))) {
    int kind = argc == 2 ? 2 : 1;
    int result = service_begin(kind, kind == 1 ? argv[2] : NULL);
    if (result) { printf("%s:failed:%d\n", kind == 1 ? "HTTP" : "MPD", result); fflush(stdout); }
    else emscripten_set_main_loop(service_tick, 20, 0);
    return 0;
  }
#else
  (void)service_begin; (void)service_tick;
#endif
  if (argc == 2 && !strcmp(argv[1], "mpd")) {
    int result = media_probe();
    if (result == 2) puts("MPD:closed"); else printf("MPD:failed:%d\n", result);
    fflush(stdout); return 0;
  }
  if (argc == 3 && !strcmp(argv[1], "http")) {
    int result = http_probe(argv[2]);
    if (result == 0) puts("HTTP:served");
    else if (result == 2) puts("HTTP:timeout");
    else printf("HTTP:failed:%d\n", result);
    fflush(stdout); return 0;
  }
  outcome("tcp_loopback", tcp_probe());
  outcome("udp_loopback", udp_probe());
  outcome("multicast_self", multicast_probe());
  if (curl_global_init(CURL_GLOBAL_DEFAULT) != CURLE_OK) {
    outcome("https_guest", 1); outcome("cookie_synthetic", 1);
  } else {
    outcome("https_guest", https_probe()); outcome("cookie_synthetic", cookie_isolation_probe()); curl_global_cleanup();
  }
  puts("PROBE_COMPLETE"); fflush(stdout); return 0;
}
