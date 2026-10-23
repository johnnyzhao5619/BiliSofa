#define _GNU_SOURCE
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
static int inject_close_error;
static int fixture_close(int fd) {
  int result = close(fd);
  if (inject_close_error) { errno = EIO; return -1; }
  return result;
}
#define close fixture_close
#define VOD_BRIDGE_NO_MAIN
#include "vod-bridge.c"

static const char *metadata = "7200000,1920,1080,5000000,192000,31,9437184,31,6144,12582920,12582920,avc1.640028,ec-3";
int main(int argc, char **argv) {
  (void)http_probe; (void)bridge_progressive_begin; (void)bridge_range;
  if (argc != 2) return 2;
  if (!strcmp(argv[1], "policy")) {
    if (vod_lease(7200000, 7200, 7100) != 7100 || vod_lease(12000, 3600, 3500) != 3500 || vod_lease(1, -1, 300) != 0) return 3;
    if (sizeof(bridge_clients) > 1048576) return 4;
    strcpy(bridge_token, "0123456789abcdef0123456789abcdef");
    if (!vod_manifest(metadata)) return 5;
    char malformed[512]; snprintf(malformed, sizeof(malformed), "0%s", metadata);
    if (vod_manifest(malformed) || vod_manifest("7200000,1920,1080,5000000,192000,31,9437184,31,6144,12582920,12582920,avc1.640028,mp4a.40.2\"<>")) return 6;
    if (!vod_codec("hev1.1.6.L150.90", 0) || !vod_codec("av01.0.08M.08", 0) || vod_codec("avc1.bad", 0) || vod_codec("ec-3\"", 1)) return 7;
    return 0;
  }
  char url[256], renewed[256];
  snprintf(url, sizeof(url), "https://fixture.bilivideo.com/a.m4s?deadline=%llu", (unsigned long long)time(NULL) + 3600);
  if (bridge_begin("BV0000000001", "0123456789abcdef0123456789abcdef", url, url, metadata)) return 8;
  snprintf(bridge_urls[0], sizeof(bridge_urls[0]), "http://127.0.0.1:%d/video", atoi(argv[1]));
  snprintf(bridge_urls[1], sizeof(bridge_urls[1]), "http://127.0.0.1:%d/audio", atoi(argv[1]));
  double started = http_now();
  while (bridge_fd >= 0 && http_now() - started < 30) {
    bridge_tick();
    struct pollfd input = { 0, POLLIN, 0 };
    if (poll(&input, 1, 0) > 0 && input.revents & POLLIN) {
      char command; if (read(0, &command, 1) != 1) break;
      if (command == 'b') {
        bridge_connections = 512; bridge_windows = 256; bridge_stream_bytes = 128ULL * 1024 * 1024;
        puts("FIXTURE:old_budgets"); fflush(stdout); continue;
      }
      if (command == 'r') {
        double old = bridge_deadline;
        snprintf(renewed, sizeof(renewed), "https://fixture.bilivideo.com/a.m4s?deadline=%llu", (unsigned long long)time(NULL) + 7200);
        if (!vod_renew(renewed, renewed, metadata) || bridge_deadline <= old) return 9;
        if (vod_renew(renewed, renewed, "changed") || vod_renew("http://127.0.0.1/private", renewed, metadata)) return 10;
        /* Only a test fixture can overwrite the private production destinations. */
        snprintf(bridge_urls[0], sizeof(bridge_urls[0]), "http://127.0.0.1:%d/video", atoi(argv[1]));
        snprintf(bridge_urls[1], sizeof(bridge_urls[1]), "http://127.0.0.1:%d/audio", atoi(argv[1]));
        continue;
      }
      if (command == 'e') inject_close_error = 1;
      if (command == 't') { bridge_deadline = http_now() - 1; continue; }
      break;
    }
    struct timespec wait = { 0, 2000000 }; nanosleep(&wait, NULL);
  }
  if (bridge_fd >= 0) bridge_stop();
  if (vod_renew(url, url, metadata)) return 11;
  puts("FIXTURE:closed_alive"); fflush(stdout);
  struct timespec wait = { 1, 0 }; nanosleep(&wait, NULL);
  return bridge_unconfirmed ? 12 : 0;
}
