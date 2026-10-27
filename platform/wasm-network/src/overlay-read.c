#include "service-config.h"
/* W05 fixed signed player/segment reads and anonymous scoped subtitle JSON.
 * No write endpoint, caller-supplied API URL or redirect following. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <curl/curl.h>
#include <openssl/evp.h>
#include <openssl/crypto.h>
#include "vod-source-policy.h"
static int overlay_subtitle_url(const char *s) {
  const char *hosts[] = { SERVICE_ADDRESS_A_2991B09DB4DC, SERVICE_ADDRESS_A_2F0868A1CB64, SERVICE_ADDRESS_A_E54F9A20E06B, SERVICE_ADDRESS_A_11BBB9115CC0 };
  const char *path = NULL;
  if (!s || strlen(s) > 2048) return 0;
  for (unsigned i = 0; i < sizeof(hosts) / sizeof(hosts[0]); i++) if (!strncmp(s, hosts[i], strlen(hosts[i]))) path = s + strlen(hosts[i]) - 1;
  if (!path || (strncmp(path, "/bfs/subtitle/", 14) && strncmp(path, "/bfs/ai_subtitle/", 17)) || strstr(path, "/../") || strstr(path, "/./")) return 0;
  const char *query = strchr(path, '?'), *end = query ? query : path + strlen(path);
  /* CC files end in .json; AI subtitle files are a bare id under /bfs/ai_subtitle/ (0.47.2). */
  int ai = !strncmp(path, "/bfs/ai_subtitle/", 17);
  if (ai ? end - path <= 17 || end[-1] == '/' : end - path < 6 || strncmp(end - 5, ".json", 5)) return 0;
  for (const char *p = path; p < end; p++) if (!((*p >= 'A' && *p <= 'Z') || (*p >= 'a' && *p <= 'z') || (*p >= '0' && *p <= '9') || strchr("/_.-", *p))) return 0;
  for (const char *p = s; *p; p++) if ((unsigned char)*p < 33 || (unsigned char)*p > 126 || strchr("\\#<>\"", *p)) return 0;
  return 1;
}
static int overlay_wbi(int operation, char *input, char *url, size_t capacity) {
  char *parts[6] = { input }; int fields = 1, expected = operation == 4 ? 5 : 6;
  for (char *p = input; *p; p++) if (*p == '|') { if (fields >= expected) return 0; *p = 0; parts[fields++] = p + 1; }
  if (fields != expected) return 0;
  if (operation == 4 ? (!guest_bvid_valid(parts[0]) || !guest_cid_valid(parts[1])) : (!guest_cid_valid(parts[0]) || !guest_cid_valid(parts[1]) || !*parts[2] || strlen(parts[2]) > 4 || strspn(parts[2], "0123456789") != strlen(parts[2]) || atoi(parts[2]) < 1 || atoi(parts[2]) > 1680 /* ADR-115: seven days of six-minute segments */ || parts[2][0] == '0')) return 0;
  int key_at = operation == 4 ? 2 : 3;
  if (strlen(parts[key_at]) != 32 || strlen(parts[key_at + 1]) != 32 || strspn(parts[key_at], "0123456789abcdef") != 32 || strspn(parts[key_at + 1], "0123456789abcdef") != 32 || strlen(parts[key_at + 2]) != 10 || strspn(parts[key_at + 2], "0123456789") != 10) return 0;
  long long epoch = strtoll(parts[key_at + 2], NULL, 10), now = (long long)time(NULL);
  if (now < 1700000000LL || now > 4102444800LL || epoch < now - 30 || epoch > now + 30) return 0;
  const unsigned char indices[32] = {46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13};
  char joined[65], mix[33] = {0}, query[512], signing[545], hex[33];
  snprintf(joined, sizeof(joined), "%s%s", parts[key_at], parts[key_at + 1]);
  for (int i = 0; i < 32; i++) mix[i] = joined[indices[i]];
  int n = operation == 4 ? snprintf(query, sizeof(query), "bvid=%s&cid=%s&wts=%s", parts[0], parts[1], parts[4]) : snprintf(query, sizeof(query), "oid=%s&pid=%s&segment_index=%s&type=1&wts=%s", parts[0], parts[1], parts[2], parts[5]);
  if (n < 1 || (size_t)n >= sizeof(query)) return 0;
  n = snprintf(signing, sizeof(signing), "%s%s", query, mix); unsigned char digest[EVP_MAX_MD_SIZE]; unsigned length = 0;
  int good = n > 0 && (size_t)n < sizeof(signing) && EVP_Digest(signing, (size_t)n, digest, &length, EVP_md5(), NULL) == 1 && length == 16;
  OPENSSL_cleanse(joined, sizeof(joined)); OPENSSL_cleanse(mix, sizeof(mix)); OPENSSL_cleanse(signing, sizeof(signing));
  if (!good) return 0;
  for (int i = 0; i < 16; i++) snprintf(hex + i * 2, 3, "%02x", digest[i]);
  n = snprintf(url, capacity, SERVICE_ADDRESS_A_BAB388FB4F51, operation == 4 ? "/x/player/wbi/v2" : "/x/v2/dm/wbi/web/seg.so", query, hex);
  return n > 0 && (size_t)n < capacity;
}
static int overlay_extra_read(int operation, char *input, char *url, size_t capacity) {
  if (operation == 4 || operation == 6) return overlay_wbi(operation, input, url, capacity);
  if (operation == 5) { if (!overlay_subtitle_url(input)) return 0; int n = snprintf(url, capacity, "%s", input); return n > 0 && (size_t)n < capacity; }
  if (operation == 7) { if (!guest_cid_valid(input)) return 0; int n = snprintf(url, capacity, SERVICE_ADDRESS_A_A51D128366E2, input); return n > 0 && (size_t)n < capacity; }
  return 0;
}
static int overlay_prepare(CURL *easy, int operation) { return operation != 5 || curl_easy_setopt(easy, CURLOPT_RANGE, NULL) == CURLE_OK; }
#define BILISOFA_MAX_READ_OPERATION 7
#define BILISOFA_EXTRA_READ overlay_extra_read
#define BILISOFA_BINARY_READ(operation) ((operation) == 6)
#define BILISOFA_ANONYMOUS_READ(operation) ((operation) == 5)
#define BILISOFA_OPERATION_ALLOWED(operation) ((operation) != 2 && (operation) != 3)
#define BILISOFA_PREPARE_OPERATION overlay_prepare
#include "vod-api.c"
