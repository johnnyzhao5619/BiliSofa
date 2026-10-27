#include "service-config.h"
/* ADR-101 destination policy for the failover bridge only. Included after
 * vod-source-policy.h; the shared header and its other modules stay unchanged.
 * Adds exactly Bilibili's Akamai backup family (upos-<label>-mirrorakam.akamaized.net)
 * under the same https/.m4s/deadline rules as guest_cdn_valid. */
#ifndef BILISOFA_VOD_CDN_POLICY_H
#define BILISOFA_VOD_CDN_POLICY_H
static inline int vod_akamai_host(const char *host, size_t length) {
  const char *suffix = SERVICE_ADDRESS_A_0EA2FF007C99; size_t s = strlen(suffix);
  if (length <= 5 + s || strncmp(host, "upos-", 5) || strncmp(host + length - s, suffix, s)) return 0;
  size_t label = length - 5 - s;
  if (label < 1 || label > 16) return 0;
  for (size_t i = 5; i < 5 + label; i++) if (!((host[i] >= 'a' && host[i] <= 'z') || (host[i] >= '0' && host[i] <= '9'))) return 0;
  return 1;
}
static inline int vod_cdn_valid(const char *url) {
  if (guest_cdn_valid(url)) return 1;
  if (!url || strlen(url) > 2048 || strncmp(url, "https://", 8)) return 0;
  const char *end = strchr(url + 8, '/');
  if (!end || !vod_akamai_host(url + 8, (size_t)(end - (url + 8)))) return 0;
  /* Path/query/deadline judged by the unchanged rule on a fixed bilivideo stand-in host. */
  char checked[2049];
  int n = snprintf(checked, sizeof(checked), SERVICE_ADDRESS_A_68226DC07937, end);
  return n > 0 && (size_t)n < sizeof(checked) && guest_cdn_valid(checked);
}
#define guest_cdn_valid vod_cdn_valid
#endif
