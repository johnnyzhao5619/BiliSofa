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
#include <time.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <curl/curl.h>
#define VOD_BRIDGE_NO_MAIN
#include "vod-bridge-failover.c"

static const char *metadata = "7200000,1920,1080,5000000,192000,31,9437184,31,6144,12582920,12582920,avc1.640028,ec-3";
static void destination(char *out, size_t size, const char *host, long long offset) {
  snprintf(out, size, "https://%s/a.m4s?deadline=%llu", host, (unsigned long long)(time(NULL) + offset));
}
/* argv: <port> <start 0-3> <backups: 1 both, 0 none> */
int main(int argc, char **argv) {
  (void)http_probe; (void)bridge_progressive_begin; (void)bridge_range;
  char primary[256], backup[256], url[256];
  if (argc == 2 && !strcmp(argv[1], "policy")) {
    destination(url, sizeof(url), "upos-hz-mirrorakam.akamaized.net", 3600); if (!vod_cdn_valid(url)) return 3;
    destination(url, sizeof(url), "fixture.bilivideo.com", 3600); if (!vod_cdn_valid(url)) return 4;
    const char *hosts[] = { "mirrorakam.akamaized.net", "evil-mirrorakam.akamaized.net", "upos-hz-mirrorakam.akamaized.net.example.com", "upos-HZ-mirrorakam.akamaized.net",
      "upos--mirrorakam.akamaized.net", "upos-hz-mirrorakam.akamaized.net:8443", "upos-0123456789abcdefg-mirrorakam.akamaized.net", "upos-hz.akamaized.net" };
    for (size_t i = 0; i < sizeof(hosts) / sizeof(hosts[0]); i++) { destination(url, sizeof(url), hosts[i], 3600); if (vod_cdn_valid(url)) return 5; }
    destination(url, sizeof(url), "upos-hz-mirrorakam.akamaized.net", 10); if (vod_cdn_valid(url)) return 6;
    if (vod_cdn_valid("http://upos-hz-mirrorakam.akamaized.net/a.m4s?deadline=9999999999") || vod_cdn_valid("https://upos-hz-mirrorakam.akamaized.net/a.mp4?deadline=9999999999")) return 7;
    destination(primary, sizeof(primary), "fixture.bilivideo.com", 3600); destination(backup, sizeof(backup), "upos-hz-mirrorakam.akamaized.net", 3600);
    if (vod_failover_begin("BV0000000001", "0123456789abcdef0123456789abcdef", primary, primary, metadata, "-", backup, "1") != 16) return 8;
    if (vod_failover_begin("BV0000000001", "0123456789abcdef0123456789abcdef", primary, primary, metadata, backup, backup, "4") != 16) return 9;
    if (vod_failover_begin("BV0000000001", "0123456789abcdef0123456789abcdef", primary, primary, metadata, "http://127.0.0.1/x", "-", "0") != 16) return 10;
    return 0;
  }
  if (argc != 4) return 2;
  int port = atoi(argv[1]), backups = atoi(argv[3]);
  destination(primary, sizeof(primary), "fixture.bilivideo.com", 3600); destination(backup, sizeof(backup), "upos-hz-mirrorakam.akamaized.net", 1800);
  double before = http_now();
  if (vod_failover_begin("BV0000000001", "0123456789abcdef0123456789abcdef", primary, primary, metadata, backups ? backup : "-", backups ? backup : "-", argv[2])) return 11;
  /* A backup can only shorten the lease. */
  if (backups && bridge_deadline - before > 1800) return 12;
  /* Only a test fixture can overwrite the private production destinations. */
  snprintf(bridge_urls[0], sizeof(bridge_urls[0]), "http://127.0.0.1:%d/video", port);
  snprintf(bridge_urls[1], sizeof(bridge_urls[1]), "http://127.0.0.1:%d/audio", port);
  if (backups) {
    snprintf(vod_alternates[0], sizeof(vod_alternates[0]), "http://127.0.0.1:%d/video-backup", port);
    snprintf(vod_alternates[1], sizeof(vod_alternates[1]), "http://127.0.0.1:%d/audio-backup", port);
  }
  double started = http_now();
  while (bridge_fd >= 0 && http_now() - started < 60) {
    bridge_tick();
    struct pollfd input = { 0, POLLIN, 0 };
    if (poll(&input, 1, 0) > 0 && input.revents & POLLIN) {
      char command; if (read(0, &command, 1) != 1) break;
      if (command == 'r') {
        char renewed[256], renewed_backup[256];
        destination(renewed, sizeof(renewed), "fixture.bilivideo.com", 7200); destination(renewed_backup, sizeof(renewed_backup), "upos-hz-mirrorakam.akamaized.net", 7200);
        /* Backup presence cannot change underneath an active decoder. */
        if (vod_failover_renew(renewed, renewed, metadata, backups ? "-" : renewed_backup, "-")) return 13;
        if (!vod_failover_renew(renewed, renewed, metadata, backups ? renewed_backup : "-", backups ? renewed_backup : "-")) return 14;
        snprintf(bridge_urls[0], sizeof(bridge_urls[0]), "http://127.0.0.1:%d/video", port);
        snprintf(bridge_urls[1], sizeof(bridge_urls[1]), "http://127.0.0.1:%d/audio", port);
        if (backups) {
          snprintf(vod_alternates[0], sizeof(vod_alternates[0]), "http://127.0.0.1:%d/video-backup", port);
          snprintf(vod_alternates[1], sizeof(vod_alternates[1]), "http://127.0.0.1:%d/audio-backup", port);
        }
        printf("FIXTURE:renewed:%d:%d\n", vod_on_alternate[0], vod_on_alternate[1]); fflush(stdout);
        continue;
      }
      break;
    }
    struct timespec wait = { 0, 2000000 }; nanosleep(&wait, NULL);
  }
  if (bridge_fd >= 0) bridge_stop();
  if (vod_alternates[0][0] || vod_alternates[1][0] || vod_on_alternate[0] || vod_on_alternate[1]) return 15;
  return bridge_unconfirmed ? 16 : 0;
}
