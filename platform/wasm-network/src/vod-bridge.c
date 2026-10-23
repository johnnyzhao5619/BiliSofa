/* Original production DASH bridge entry. Upstream addresses come exclusively
 * from the private media Worker; the loopback server has no URL input route. */
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
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
#include "vod-source-policy.h"
#include "vod-bridge-generated.h"

#ifndef VOD_BRIDGE_NO_MAIN
int main(int argc, char **argv) {
  (void)http_probe;
  (void)bridge_progressive_begin; (void)bridge_range;
  if (argc == 5 && !strcmp(argv[1], "renew")) {
    if (!vod_renew(argv[2], argv[3], argv[4])) { puts("VOD:renew_rejected"); fflush(stdout); }
    return 0;
  }
  if (argc != 7 || strcmp(argv[1], "bridge")) {
    puts("BRIDGE:failed:16"); fflush(stdout); return 1;
  }
  int result = bridge_begin(argv[2], argv[3], argv[4], argv[5], argv[6]);
  if (result) { printf("BRIDGE:failed:%d\n", result); fflush(stdout); return 1; }
#ifdef __EMSCRIPTEN__
  emscripten_set_main_loop(bridge_tick, 20, 0);
#else
  while (bridge_fd >= 0) { bridge_tick(); struct timespec wait = { 0, 2000000 }; nanosleep(&wait, NULL); }
#endif
  return 0;
}
#endif
