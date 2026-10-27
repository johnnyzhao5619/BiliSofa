#include "service-config.h"
/* Original fixed read-only VOD lane. API cookie jar and anonymous CDN easy
 * handles are separate. No caller URL except the independently scoped CDN GET. */
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <strings.h>
#include <time.h>
#include <curl/curl.h>
#include <openssl/crypto.h>
#include <openssl/evp.h>
#include "vod-source-policy.h"
#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#define VOD_EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define VOD_EXPORT
#endif
#define VOD_BODY_CAP 4194304
#define VOD_INPUT_CAP 4096
#ifndef BILISOFA_BINARY_READ
#define BILISOFA_BINARY_READ(operation) 0
#endif
#ifndef BILISOFA_ANONYMOUS_READ
#define BILISOFA_ANONYMOUS_READ(operation) 0
#endif
static CURL *vod_api, *vod_cdn, *vod_current;
static CURLM *vod_multi;
static int vod_live, vod_initialized, vod_active = -1, vod_added, vod_bad_close, vod_result = -1;
static long vod_status;
static unsigned char vod_body[VOD_BODY_CAP + 1];
static char vod_input[VOD_INPUT_CAP + 1], vod_url[3072];
static size_t vod_size, vod_headers, vod_limit;
static double vod_session_until, vod_request_until;
static unsigned long long vod_range_total;
static int vod_range_header;

static double vod_now(void) {
  struct timespec t;
  if (clock_gettime(CLOCK_MONOTONIC, &t)) return -1;
  return t.tv_sec * 1000.0 + t.tv_nsec / 1000000.0;
}
static void vod_emit(const char *line) { puts(line); fflush(stdout); }
static void vod_wipe(void) { OPENSSL_cleanse(vod_body, sizeof(vod_body)); vod_size = 0; }
static void vod_finish(void) {
  vod_live = 0;
  if (vod_added && curl_multi_remove_handle(vod_multi, vod_current) != CURLM_OK) vod_bad_close = 1;
  vod_added = 0; vod_active = -1; vod_current = NULL;
  if (vod_api) {
    if (curl_easy_setopt(vod_api, CURLOPT_COOKIELIST, "ALL") != CURLE_OK) vod_bad_close = 1;
    curl_easy_cleanup(vod_api);
  }
  vod_api = NULL;
  if (vod_cdn) curl_easy_cleanup(vod_cdn);
  vod_cdn = NULL;
  if (vod_multi && curl_multi_cleanup(vod_multi) != CURLM_OK) vod_bad_close = 1;
  vod_multi = NULL;
#ifdef BILISOFA_EXTRA_CLEANUP
  BILISOFA_EXTRA_CLEANUP();
#endif
  if (vod_initialized) curl_global_cleanup();
  vod_initialized = 0;
  vod_wipe(); OPENSSL_cleanse(vod_input, sizeof(vod_input)); OPENSSL_cleanse(vod_url, sizeof(vod_url));
#ifdef __EMSCRIPTEN__
  emscripten_cancel_main_loop();
#endif
  vod_emit(vod_bad_close ? "VODAPI:unclosed" : "VODAPI:closed");
}
static size_t vod_body_cb(char *bytes, size_t unit, size_t count, void *context) {
  (void)context;
  if (unit && count > vod_limit / unit) return 0;
  size_t n = unit * count;
  if (n > vod_limit - vod_size || (vod_active != 3 && !BILISOFA_BINARY_READ(vod_active) && memchr(bytes, 0, n))) return 0;
  memcpy(vod_body + vod_size, bytes, n); vod_size += n; vod_body[vod_size] = 0; return n;
}
static int vod_domain(const char *s) {
  return !strcasecmp(s, SERVICE_ADDRESS_A_0F551371E9F1) || !strcasecmp(s, SERVICE_ADDRESS_A_4727900DD5EC) || !strcasecmp(s, SERVICE_ADDRESS_A_518E98F60A28) || !strcasecmp(s, SERVICE_ADDRESS_A_68B73A5F5B0A)
#ifdef BILISOFA_EXTRA_COOKIE_DOMAIN
    || BILISOFA_EXTRA_COOKIE_DOMAIN(s)
#endif
    ;
}
static size_t vod_header_cb(char *bytes, size_t unit, size_t count, void *context) {
  (void)context;
  if (unit && count > 16384 / unit) return 0;
  size_t n = unit * count;
  if (n > 16384 - vod_headers || memchr(bytes, 0, n)) return 0;
  vod_headers += n;
  if (vod_active == 3 && n >= 14 && !strncasecmp(bytes, "Content-Range:", 14)) {
    char line[128]; int end = 0; unsigned long long total = 0;
    if (n >= sizeof(line) || vod_range_header) return 0;
    memcpy(line, bytes, n); line[n] = 0;
    if (sscanf(line + 14, " bytes 0-511/%13llu%n", &total, &end) != 1 || strcmp(line + 14 + end, "\r\n") || total < 512 || total > 1099511627776ULL) return 0;
    vod_range_header = 1; vod_range_total = total;
  }
  if (vod_active == 3 && n >= 17 && !strncasecmp(bytes, "Content-Encoding:", 17) && (n != 28 || strncasecmp(bytes + 17, " identity\r\n", 11))) return 0;
  if (vod_active != 3 && !BILISOFA_ANONYMOUS_READ(vod_active) && n >= 11 && !strncasecmp(bytes, "Set-Cookie:", 11)) {
    char copy[2049];
    if (n > 2048) return 0;
    memcpy(copy, bytes, n); copy[n] = 0;
    char *save = NULL;
    for (char *p = strtok_r(copy, ";\r\n", &save); p; p = strtok_r(NULL, ";\r\n", &save)) {
      while (*p == ' ' || *p == '\t') p++;
      if (!strncasecmp(p, "domain=", 7)) {
        char *v = p + 7; size_t len = strlen(v);
        while (len && (v[len - 1] == ' ' || v[len - 1] == '\t')) v[--len] = 0;
        if (!vod_domain(v)) { OPENSSL_cleanse(copy, sizeof(copy)); return 0; }
      }
    }
    OPENSSL_cleanse(copy, sizeof(copy));
  }
  return n;
}
static int vod_cookie(char *line) {
  if (!line || strlen(line) > 2048) return 0;
  if (!strncmp(line, "#HttpOnly_", 10)) line += 10;
  char *fields[7] = { line }; int count = 1;
  for (char *p = line; *p; p++) {
    if (*p == '\t') { if (count >= 7) return 0; *p = 0; fields[count++] = p + 1; }
    else if ((unsigned char)*p < 33 || (unsigned char)*p > 126) return 0;
  }
  if (count != 7 || !vod_domain(fields[0]) || (strcmp(fields[1], "TRUE") && strcmp(fields[1], "FALSE")) || strcmp(fields[2], "/") ||
      strcmp(fields[3], "TRUE") || !*fields[4] || strlen(fields[4]) > 12 || strspn(fields[4], "0123456789") != strlen(fields[4]) ||
      (strcmp(fields[5], "SESSDATA") && strcmp(fields[5], "bili_jct") && strcmp(fields[5], "DedeUserID") && strcmp(fields[5], "DedeUserID__ckMd5")) ||
      !*fields[6] || strlen(fields[6]) > 1536 || strchr(fields[6], ';')) return 0;
  return 1;
}
VOD_EXPORT int vod_input_ptr(void) { return (int)(size_t)vod_input; }
VOD_EXPORT int vod_input_capacity(void) { return VOD_INPUT_CAP; }
VOD_EXPORT int vod_body_ptr(void) { return (int)(size_t)vod_body; }
VOD_EXPORT int vod_body_length(void) { return (int)vod_size; }
VOD_EXPORT int vod_http_status(void) { return (int)vod_status; }
VOD_EXPORT int vod_curl_status(void) { return vod_result; }
VOD_EXPORT void vod_response_clear(void) { vod_wipe(); }
VOD_EXPORT double vod_source_total(void) { return (double)vod_range_total; }
VOD_EXPORT int vod_source_valid(void) { return vod_result == 0 && vod_status == 206 && vod_range_header && vod_size == 512 && !memcmp(vod_body + 4, "ftyp", 4); }
VOD_EXPORT int vod_import_cookies(int length) {
  if (!vod_live || vod_active >= 0 || length < 1 || length > VOD_INPUT_CAP || vod_input[length] || memchr(vod_input, 0, (size_t)length)) return 0;
  char copy[VOD_INPUT_CAP + 1]; memcpy(copy, vod_input, (size_t)length + 1);
  int count = 0, valid = 1; char *save = NULL;
  for (char *line = strtok_r(copy, "\n", &save); line; line = strtok_r(NULL, "\n", &save)) {
    char checked[2049]; size_t n = strlen(line);
    if (n >= sizeof(checked)) { valid = 0; break; }
    memcpy(checked, line, n + 1); int good = vod_cookie(checked); OPENSSL_cleanse(checked, sizeof(checked));
    if (!good || ++count > 4 || curl_easy_setopt(vod_api, CURLOPT_COOKIELIST, line) != CURLE_OK) { valid = 0; break; }
  }
  OPENSSL_cleanse(copy, sizeof(copy)); OPENSSL_cleanse(vod_input, sizeof(vod_input));
  if (count < 2) valid = 0;
  if (!valid) curl_easy_setopt(vod_api, CURLOPT_COOKIELIST, "ALL");
  return valid;
}
static int vod_playurl(char *value) {
  char *parts[5] = { value }; int fields = 1;
  for (char *p = value; *p; p++) if (*p == '|') { if (fields >= 5) return 0; *p = 0; parts[fields++] = p + 1; }
  if (fields != 5 || !guest_bvid_valid(parts[0]) || !guest_cid_valid(parts[1]) || strlen(parts[2]) != 32 || strlen(parts[3]) != 32 ||
      strspn(parts[2], "0123456789abcdef") != 32 || strspn(parts[3], "0123456789abcdef") != 32 || strlen(parts[4]) != 10 || strspn(parts[4], "0123456789") != 10) return 0;
  long long epoch = strtoll(parts[4], NULL, 10), now = (long long)time(NULL);
  if (now < 1700000000LL || now > 4102444800LL || epoch < now - 30 || epoch > now + 30) return 0;
  char joined[65], mix[33] = {0}, query[256], signed_query[289], hex[33];
  snprintf(joined, sizeof(joined), "%s%s", parts[2], parts[3]);
  const unsigned char indices[32] = {46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13};
  for (int i = 0; i < 32; i++) mix[i] = joined[indices[i]];
  int n = snprintf(query, sizeof(query), "bvid=%s&cid=%s&fnval=4048&fnver=0&fourk=1&qn=127&wts=%s", parts[0], parts[1], parts[4]);
  if (n < 1 || (size_t)n >= sizeof(query)) return 0;
  n = snprintf(signed_query, sizeof(signed_query), "%s%s", query, mix);
  unsigned char digest[EVP_MAX_MD_SIZE]; unsigned length = 0;
  if (n < 1 || (size_t)n >= sizeof(signed_query) || EVP_Digest(signed_query, (size_t)n, digest, &length, EVP_md5(), NULL) != 1 || length != 16) return 0;
  for (int i = 0; i < 16; i++) snprintf(hex + i * 2, 3, "%02x", digest[i]);
  n = snprintf(vod_url, sizeof(vod_url), SERVICE_ADDRESS_A_2CA411709600, query, hex);
  OPENSSL_cleanse(joined, sizeof(joined)); OPENSSL_cleanse(mix, sizeof(mix)); OPENSSL_cleanse(signed_query, sizeof(signed_query));
  return n > 0 && (size_t)n < sizeof(vod_url);
}
#ifndef BILISOFA_MAX_READ_OPERATION
#define BILISOFA_MAX_READ_OPERATION 3
#define BILISOFA_EXTRA_READ(operation,input,url,capacity) 0
#endif
#ifndef BILISOFA_OPERATION_ALLOWED
#define BILISOFA_OPERATION_ALLOWED(operation) 1
#endif
#ifndef BILISOFA_PREPARE_OPERATION
#define BILISOFA_PREPARE_OPERATION(easy,operation) 1
#endif
VOD_EXPORT int vod_begin(int operation) {
  if (!vod_live || vod_active >= 0 || operation < 0 || operation > BILISOFA_MAX_READ_OPERATION || !BILISOFA_OPERATION_ALLOWED(operation) || vod_now() < 0 || vod_now() >= vod_session_until) return 0;
  size_t n = strnlen(vod_input, sizeof(vod_input));
  if (n > VOD_INPUT_CAP) return 0;
  if (operation == 0) { if (n) return 0; strcpy(vod_url, SERVICE_ADDRESS_A_34A874714ED0); }
  else if (operation == 1) { if (!guest_bvid_valid(vod_input)) return 0; snprintf(vod_url, sizeof(vod_url), SERVICE_ADDRESS_A_37538D7FE65A, vod_input); }
  else if (operation == 2) { char copy[VOD_INPUT_CAP + 1]; memcpy(copy, vod_input, n + 1); int valid = vod_playurl(copy); OPENSSL_cleanse(copy, sizeof(copy)); if (!valid) return 0; }
  else if (operation == 3) { if (!guest_cdn_valid(vod_input)) return 0; strcpy(vod_url, vod_input); }
  else if (!BILISOFA_EXTRA_READ(operation, vod_input, vod_url, sizeof(vod_url))) return 0;
  OPENSSL_cleanse(vod_input, sizeof(vod_input)); vod_wipe(); vod_headers = 0; vod_status = 0; vod_result = -1; vod_range_header = 0; vod_range_total = 0;
  vod_limit = operation == 3 ? 512 : operation == 0 ? 16384 : VOD_BODY_CAP;
  vod_current = operation == 3 || BILISOFA_ANONYMOUS_READ(operation) ? vod_cdn : vod_api;
  if (!BILISOFA_PREPARE_OPERATION(vod_current, operation) || curl_easy_setopt(vod_current, CURLOPT_URL, vod_url) != CURLE_OK || curl_multi_add_handle(vod_multi, vod_current) != CURLM_OK) return 0;
  vod_active = operation; vod_added = 1; vod_request_until = vod_now() + 9000; return 1;
}
VOD_EXPORT void vod_stop(void) { if (vod_live) vod_finish(); }
static void vod_tick(void) {
  if (!vod_live) return;
  double now = vod_now();
  if (now < 0 || now >= vod_session_until || (vod_active >= 0 && now >= vod_request_until)) { vod_emit("VODAPI:deadline"); vod_finish(); return; }
  if (vod_active < 0) return;
  int running = 0;
  if (curl_multi_perform(vod_multi, &running) != CURLM_OK) { vod_emit("VODAPI:transport"); vod_finish(); return; }
  int left; CURLMsg *message;
  while ((message = curl_multi_info_read(vod_multi, &left))) {
    if (message->msg != CURLMSG_DONE || message->easy_handle != vod_current) { vod_emit("VODAPI:transport"); vod_finish(); return; }
    vod_result = (int)message->data.result;
    if (curl_easy_getinfo(vod_current, CURLINFO_RESPONSE_CODE, &vod_status) != CURLE_OK) vod_status = 0;
    if (curl_multi_remove_handle(vod_multi, vod_current) != CURLM_OK) { vod_bad_close = 1; vod_finish(); return; }
    vod_added = 0; int operation = vod_active; vod_active = -1; vod_current = NULL;
    printf("VODAPI:response:%d\n", operation); fflush(stdout); return;
  }
}
static int vod_start(void) {
  if (vod_live || vod_api || vod_cdn || vod_multi || vod_bad_close) return 0;
  if (curl_global_init(CURL_GLOBAL_DEFAULT) != CURLE_OK) return 0;
  vod_initialized = 1; vod_api = curl_easy_init(); vod_cdn = curl_easy_init(); vod_multi = curl_multi_init();
  if (!vod_api || !vod_cdn || !vod_multi) { vod_finish(); return 0; }
  for (int i = 0; i < 2; i++) {
    CURL *easy = i ? vod_cdn : vod_api;
#define VOD_SET(option,value) do { if (curl_easy_setopt(easy, option, value) != CURLE_OK) { vod_finish(); return 0; } } while (0)
    VOD_SET(CURLOPT_FOLLOWLOCATION, 0L); VOD_SET(CURLOPT_PROTOCOLS_STR, "https"); VOD_SET(CURLOPT_REDIR_PROTOCOLS_STR, "https");
    VOD_SET(CURLOPT_PROXY, ""); VOD_SET(CURLOPT_NOPROXY, "*"); VOD_SET(CURLOPT_USERAGENT, "BiliSofa/0.0.0"); VOD_SET(CURLOPT_REFERER, SERVICE_ADDRESS_A_B12964D8C1B1);
    VOD_SET(CURLOPT_SSL_VERIFYPEER, 1L); VOD_SET(CURLOPT_SSL_VERIFYHOST, 2L); VOD_SET(CURLOPT_CAINFO, "/cacert.pem");
    VOD_SET(CURLOPT_CONNECTTIMEOUT_MS, 4000L); VOD_SET(CURLOPT_TIMEOUT_MS, 8000L); VOD_SET(CURLOPT_NOSIGNAL, 1L); VOD_SET(CURLOPT_HTTPGET, 1L);
    VOD_SET(CURLOPT_WRITEFUNCTION, vod_body_cb); VOD_SET(CURLOPT_HEADERFUNCTION, vod_header_cb);
    if (i) { VOD_SET(CURLOPT_RANGE, "0-511"); } else { VOD_SET(CURLOPT_COOKIEFILE, ""); }
#undef VOD_SET
  }
  vod_live = 1; vod_session_until = vod_now() + 90000;
  if (vod_now() < 0) { vod_finish(); return 0; }
  vod_emit("VODAPI:ready"); return 1;
}
#ifndef VOD_API_NO_MAIN
int main(void) {
  if (!vod_start()) return 1;
#ifdef __EMSCRIPTEN__
  emscripten_set_main_loop(vod_tick, 40, 0);
#else
  while (vod_live) { vod_tick(); struct timespec wait = {0, 1000000}; nanosleep(&wait, NULL); }
#endif
  return 0;
}
#endif
