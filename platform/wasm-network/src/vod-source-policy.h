/* Original independent native destination validation, shared by W04 read/bridge
 * modules. Derived from the verified BiliSofa probe policy without GET routines.
 * Native checks stay independent of TypeScript/UI validation. */
#ifndef BILISOFA_VOD_SOURCE_POLICY_H
#define BILISOFA_VOD_SOURCE_POLICY_H
#include <stdint.h>
#include <time.h>
#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#define BILISOFA_GUEST_EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define BILISOFA_GUEST_EXPORT
#endif
static inline int guest_bvid_valid(const char *bvid) {
  return bvid && strlen(bvid) == 12 && !strncmp(bvid, "BV", 2) && strspn(bvid + 2, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789") == 10;
}
static inline int guest_cid_valid(const char *cid) {
  if (!cid || !*cid || *cid == '0' || strlen(cid) > 16 || strspn(cid, "0123456789") != strlen(cid)) return 0;
  return strtoull(cid, NULL, 10) <= 9007199254740991ULL;
}
static inline int guest_cdn_valid(const char *url) {
  if (!url || strlen(url) > 2048 || strncmp(url, "https://", 8)) return 0;
  const char *end = strchr(url + 8, '/'); if (!end || end == url + 8 || end - (url + 8) > 253) return 0;
  size_t length = (size_t)(end - (url + 8)); const char *suffix = ".bilivideo.com";
  if (length <= strlen(suffix) || strncmp(end - strlen(suffix), suffix, strlen(suffix))) return 0;
  const char *label = url + 8;
  for (const char *c = label; c < end; c++) {
    if (*c == '.') { if (c == label || c[-1] == '-' || c - label > 63) return 0; label = c + 1; }
    else if (!((*c >= 'a' && *c <= 'z') || (*c >= '0' && *c <= '9') || (*c == '-' && c > label))) return 0;
  }
  if (label == end || end[-1] == '-' || end - label > 63) return 0;
  for (const unsigned char *c = (const unsigned char *)end; *c; c++) if (*c < 33 || *c > 126 || *c == '\\' || *c == '#') return 0;
  const char *query = strchr(end, '?'); if (!query || query - end < 4 || strncmp(query - 4, ".m4s", 4)) return 0;
  const char *deadline = strstr(query, "?deadline="); if (!deadline) deadline = strstr(query, "&deadline=");
  if (!deadline) return 0;
  deadline += 10; const char *stop = deadline;
  while (*stop >= '0' && *stop <= '9') stop++;
  if (stop - deadline != 10 || (*stop && *stop != '&') || strstr(stop, "&deadline=")) return 0;
  unsigned long long expires = strtoull(deadline, NULL, 10), now = (unsigned long long)time(NULL);
  return expires >= now + 60 && expires <= now + 86400;
}
#endif
