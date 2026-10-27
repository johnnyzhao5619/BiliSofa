#include "service-config.h"
/* Original bounded, credential-free popular GET. No caller URL/headers/cookies. */
#ifndef BILISOFA_PROBE_GUEST_H
#define BILISOFA_PROBE_GUEST_H
#include <stdint.h>
#include <time.h>
#include <strings.h>
#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#define BILISOFA_GUEST_EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define BILISOFA_GUEST_EXPORT
#endif
#define BILISOFA_GUEST_MAX 524288
#define BILISOFA_GUEST_JSON 131072
static unsigned char guest_bytes[BILISOFA_GUEST_MAX];
static size_t guest_size = 0, guest_header_size = 0;
static long guest_status = 0;
static int guest_transport = 2, guest_range_header = 0;
static size_t guest_limit = BILISOFA_GUEST_JSON;
/* Fixed local rejection reasons: body budget, header budget, malformed range. */
static int guest_rejection = 0;
BILISOFA_GUEST_EXPORT int guest_reject_reason(void) { return guest_rejection; }
BILISOFA_GUEST_EXPORT int guest_range_valid(void) { return guest_status == 206 && guest_range_header && guest_size == 512 && !memcmp(guest_bytes + 4, "ftyp", 4); }
BILISOFA_GUEST_EXPORT uintptr_t guest_response_ptr(void) { return (uintptr_t)guest_bytes; }
BILISOFA_GUEST_EXPORT unsigned int guest_response_length(void) { return (unsigned int)guest_size; }
BILISOFA_GUEST_EXPORT int guest_http_status(void) { return (int)guest_status; }
BILISOFA_GUEST_EXPORT int guest_curl_status(void) { return guest_transport; }
static size_t guest_body(char *data, size_t size, size_t count, void *context) {
  (void)context;
  if (size && count > BILISOFA_GUEST_MAX / size) { guest_rejection = 1; return 0; }
  size_t bytes = size * count;
  if (bytes > guest_limit || guest_size > guest_limit - bytes) { guest_rejection = 1; return 0; }
  memcpy(guest_bytes + guest_size, data, bytes); guest_size += bytes; return bytes;
}
static size_t guest_header(char *data, size_t size, size_t count, void *context) {
  (void)context;
  if (size && count > 16384 / size) { guest_rejection = 2; return 0; }
  size_t bytes = size * count;
  if (guest_header_size > 16384 - bytes) { guest_rejection = 2; return 0; }
  guest_header_size += bytes;
  if (bytes >= 14 && !strncasecmp(data, "Content-Range:", 14)) {
    char line[128]; if (bytes >= sizeof(line) || guest_range_header) { guest_rejection = 3; return 0; }
    memcpy(line, data, bytes); line[bytes] = 0;
    unsigned long long total = 0; int used = 0;
    if (sscanf(line + 14, " bytes 0-511/%llu%n", &total, &used) != 1 || total < 512 || total > 1099511627776ULL || strcmp(line + 14 + used, "\r\n")) { guest_rejection = 3; return 0; }
    guest_range_header = 1;
  }
  return bytes;
}
static int guest_bvid_valid(const char *bvid) {
  return bvid && strlen(bvid) == 12 && !strncmp(bvid, "BV", 2) && strspn(bvid + 2, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789") == 10;
}
static int guest_cid_valid(const char *cid) {
  if (!cid || !*cid || *cid == '0' || strlen(cid) > 16 || strspn(cid, "0123456789") != strlen(cid)) return 0;
  return strtoull(cid, NULL, 10) <= 9007199254740991ULL;
}
static int guest_cdn_valid(const char *url) {
  if (!url || strlen(url) > 2048 || strncmp(url, "https://", 8)) return 0;
  const char *end = strchr(url + 8, '/'); if (!end || end == url + 8 || end - (url + 8) > 253) return 0;
  size_t length = (size_t)(end - (url + 8)); const char *suffix = SERVICE_ADDRESS_A_CB591C9E9306;
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
static void guest_reset(void) { guest_size = guest_header_size = 0; guest_status = 0; guest_transport = 2; guest_range_header = guest_rejection = 0; guest_limit = BILISOFA_GUEST_JSON; }
static void guest_get(const char *url, const char *referer, int range) {
  if (curl_global_init(CURL_GLOBAL_DEFAULT) != CURLE_OK) goto done;
  CURL *curl = curl_easy_init();
  if (!curl) { curl_global_cleanup(); goto done; }
  struct curl_slist *headers = curl_slist_append(NULL, "Accept: application/json");
  if (!headers) { curl_easy_cleanup(curl); curl_global_cleanup(); goto done; }
  if (range) guest_limit = 512;
  curl_easy_setopt(curl, CURLOPT_URL, url);
  if (referer) curl_easy_setopt(curl, CURLOPT_REFERER, referer);
  if (range) curl_easy_setopt(curl, CURLOPT_RANGE, "0-511");
  curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
  curl_easy_setopt(curl, CURLOPT_USERAGENT, "BiliSofa-W01-Probe/0.0.15");
  curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 1L);
  curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 2L);
  curl_easy_setopt(curl, CURLOPT_CAINFO, "/cacert.pem");
  curl_easy_setopt(curl, CURLOPT_PROTOCOLS, CURLPROTO_HTTPS);
  curl_easy_setopt(curl, CURLOPT_REDIR_PROTOCOLS, CURLPROTO_HTTPS);
  curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 0L);
  curl_easy_setopt(curl, CURLOPT_CONNECTTIMEOUT_MS, 4000L);
  curl_easy_setopt(curl, CURLOPT_TIMEOUT_MS, 8000L);
  curl_easy_setopt(curl, CURLOPT_NOSIGNAL, 1L);
  curl_easy_setopt(curl, CURLOPT_PROXY, "");
  curl_easy_setopt(curl, CURLOPT_MAXFILESIZE_LARGE, (curl_off_t)guest_limit);
  curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, guest_body);
  curl_easy_setopt(curl, CURLOPT_WRITEDATA, NULL);
  curl_easy_setopt(curl, CURLOPT_HEADERFUNCTION, guest_header);
  curl_easy_setopt(curl, CURLOPT_HEADERDATA, NULL);
  // No cookie engine/jar, credential header, redirect or persistent connection reuse.
  guest_transport = (int)curl_easy_perform(curl);
  if (guest_transport == CURLE_FILESIZE_EXCEEDED) guest_rejection = 1;
  curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &guest_status);
  curl_slist_free_all(headers); curl_easy_cleanup(curl); curl_global_cleanup();
done:
  // Only this event crosses stdout. Bounded body is read directly from WASM memory
  // by the Worker after every cURL handle has been closed, never printed/logged.
  puts("GUEST:closed"); fflush(stdout);
}

static void guest_popular(const char *page) {
  guest_reset();
  if (!page || !*page || strlen(page) > 2 || strspn(page, "0123456789") != strlen(page) || atoi(page) < 1 || atoi(page) > 10) { puts("GUEST:closed"); fflush(stdout); return; }
  char url[128]; snprintf(url, sizeof(url), SERVICE_ADDRESS_A_4312E4303E59, atoi(page));
  guest_get(url, NULL, 0);
}
static void guest_video(const char *bvid, const char *cid, const char *cdn) {
  guest_reset();
  if (!guest_bvid_valid(bvid) || (cid && !guest_cid_valid(cid)) || (cdn && !guest_cdn_valid(cdn))) { puts("GUEST:closed"); fflush(stdout); return; }
  char url[256], referer[80]; snprintf(referer, sizeof(referer), SERVICE_ADDRESS_A_6CFDA06D9480, bvid);
  if (cdn) guest_get(cdn, referer, 1);
  else {
    if (cid) snprintf(url, sizeof(url), SERVICE_ADDRESS_A_673A4BFAF0C4, bvid, cid);
    else { guest_limit = BILISOFA_GUEST_MAX; snprintf(url, sizeof(url), SERVICE_ADDRESS_A_37538D7FE65A, bvid); }
    guest_get(url, NULL, 0);
  }
}
#endif
