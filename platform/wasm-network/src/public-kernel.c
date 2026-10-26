/* ADR-108: the resident public read kernel. One WASM instance serves every
 * anonymous list read (popular, rankings, PGC lists, UP uploads, visitor
 * identity, WBI search, hot words and, since ADR-110, the video view) over two long-lived easy handles and one
 * multi handle, so connections and TLS sessions are reused between requests.
 *
 * The URL builders and argument checks of catalog.c, catalog-up.c, catalog-ua.c,
 * catalog-visitor.c, search.c and hot-search.c stay frozen and are included
 * unchanged: while they are compiled, `guest_get` only captures the URL that a
 * builder chose. This file then performs it on the resident handles.
 * Only popular and the WBI search are new builders, with 20 rows per batch.
 *
 * No caller URL, header or account cookie is accepted. The only cookie is the
 * validated B站 visitor identity (ADR-106), on category and UP reads only. TLS
 * verification, https-only, no redirects, no proxy and the body caps are unchanged. */
#define CURL_DISABLE_TYPECHECK
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <curl/curl.h>
#include <openssl/crypto.h>
#include <openssl/evp.h>
#include "probe-guest.h"
static void kernel_capture(const char *url, const char *referer, int range);
#define guest_get kernel_capture
#define main public_kernel_catalog_main
#include "catalog-visitor.c"
#undef main
#define SEARCH_NO_MAIN
#include "search.c"
#define HOT_SEARCH_NO_MAIN
#include "hot-search.c"
#undef guest_get

#ifdef __EMSCRIPTEN__
#define KERNEL_EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define KERNEL_EXPORT
#endif
#define KERNEL_INPUT_CAP 1024
#define KERNEL_PAGE_SIZE 20
#define KERNEL_MAX_BATCH 5
#define KERNEL_PROBE_AGENT "BiliSofa-W01-Probe/0.0.15"
enum { KERNEL_POPULAR = 1, KERNEL_RANKING, KERNEL_CATEGORY, KERNEL_PGC_RANKING, KERNEL_PGC_INDEX, KERNEL_UP, KERNEL_VISITOR, KERNEL_SEARCH_NAV, KERNEL_SEARCH, KERNEL_HOT, KERNEL_VIEW, KERNEL_MAX_OPERATION = KERNEL_VIEW };
/* ADR-110: a video view (parts, collection) can exceed the shared 512 KiB guest buffer; the playback module allows 4 MiB. */
#define KERNEL_VIEW_CAP 4194304

static CURL *kernel_api, *kernel_search_host, *kernel_current;
static CURLM *kernel_multi;
static struct curl_slist *kernel_accept;
static int kernel_live, kernel_initialized, kernel_active = -1, kernel_bad_close, kernel_captured;
static char kernel_input[KERNEL_INPUT_CAP + 1], kernel_url[1024], kernel_referer[64], kernel_agent[401];
static long kernel_connects;
static unsigned char kernel_view[KERNEL_VIEW_CAP];
static size_t kernel_view_size;
static int kernel_view_last;
static double kernel_request_until;

static double kernel_now(void) {
  struct timespec t;
  if (clock_gettime(CLOCK_MONOTONIC, &t)) return -1;
  return t.tv_sec * 1000.0 + t.tv_nsec / 1000000.0;
}
static void kernel_emit(const char *line) { puts(line); fflush(stdout); }
/* Builders call guest_reset()/guest_limit, then guest_get(): only the destination is kept here. */
static void kernel_capture(const char *url, const char *referer, int range) {
  kernel_captured = 0;
  if (range || !url || (strncmp(url, "https://api.bilibili.com/", 25) && strncmp(url, "https://s.search.bilibili.com/", 30))) return;
  if (strlen(url) >= sizeof(kernel_url) || (referer && strlen(referer) >= sizeof(kernel_referer))) return;
  strcpy(kernel_url, url); strcpy(kernel_referer, referer ? referer : "");
  kernel_captured = 1;
}
static size_t kernel_view_body(char *data, size_t size, size_t count, void *context) {
  (void)context;
  if (size && count > KERNEL_VIEW_CAP / size) { guest_rejection = 1; return 0; }
  size_t bytes = size * count;
  if (bytes > KERNEL_VIEW_CAP || kernel_view_size > KERNEL_VIEW_CAP - bytes) { guest_rejection = 1; return 0; }
  memcpy(kernel_view + kernel_view_size, data, bytes); kernel_view_size += bytes; return bytes;
}
/* Only the public view of one validated BV id; never playurl, CDN or player routes. */
static void kernel_video_view(const char *bvid) {
  guest_reset(); kernel_view_size = 0;
  if (!guest_bvid_valid(bvid)) return;
  char url[96], referer[64];
  snprintf(url, sizeof(url), "https://api.bilibili.com/x/web-interface/view?bvid=%s", bvid);
  snprintf(referer, sizeof(referer), "https://www.bilibili.com/video/%s", bvid);
  kernel_capture(url, referer, 0);
}
static int kernel_page(const char *s) {
  size_t n = s ? strlen(s) : 0;
  if (n != 1 || s[0] < '1' || s[0] > '0' + KERNEL_MAX_BATCH) return 0;
  return s[0] - '0';
}
static void kernel_popular(const char *page) {
  guest_reset(); guest_limit = BILISOFA_GUEST_MAX;
  int pn = kernel_page(page); if (!pn) return;
  char url[128]; snprintf(url, sizeof(url), "https://api.bilibili.com/x/web-interface/popular?ps=%d&pn=%d", KERNEL_PAGE_SIZE, pn);
  kernel_capture(url, NULL, 0);
}
/* search.c's search_typed with 20 rows per page and pages 1-5; its checks are reused unchanged. */
static void kernel_search(int mode, const char *page, const char *img, const char *sub, const char *epoch, const char *keyword) {
  guest_reset(); guest_limit = BILISOFA_GUEST_MAX;
  if (mode < 0 || mode > 2 || !search_keyword_valid(keyword) || !kernel_page(page) || !search_key_valid(img) || !search_key_valid(sub) || !search_epoch_valid(epoch)) return;
  char filtered[129], joined[65], mix[33] = {0}, query[640], signed_query[673], hex[33], url[800]; size_t used = 0;
  for (const char *p = keyword; *p; p++) if (!strchr("!'()*", *p)) filtered[used++] = *p;
  filtered[used] = 0;
  if (!used) return;
  char *encoded = curl_easy_escape(NULL, filtered, (int)used); if (!encoded) return;
  snprintf(joined, sizeof(joined), "%s%s", img, sub);
  const unsigned char indices[32] = {46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13};
  for (int i = 0; i < 32; i++) mix[i] = joined[indices[i]];
  const char *type = mode == 2 ? "media_bangumi" : mode == 1 ? "bili_user" : "video";
  int size = snprintf(query, sizeof(query), "keyword=%s&page=%d&page_size=%d&search_type=%s&wts=%s", encoded, kernel_page(page), KERNEL_PAGE_SIZE, type, epoch); curl_free(encoded);
  if (size < 1 || (size_t)size >= sizeof(query)) return;
  size = snprintf(signed_query, sizeof(signed_query), "%s%s", query, mix); if (size < 1 || (size_t)size >= sizeof(signed_query)) return;
  unsigned char digest[EVP_MAX_MD_SIZE]; unsigned int length = 0;
  if (EVP_Digest(signed_query, (size_t)size, digest, &length, EVP_md5(), NULL) != 1 || length != 16) return;
  for (int i = 0; i < 16; i++) snprintf(hex + i * 2, 3, "%02x", digest[i]);
  size = snprintf(url, sizeof(url), "https://api.bilibili.com/x/web-interface/wbi/search/type?%s&w_rid=%s", query, hex);
  OPENSSL_cleanse(joined, sizeof(joined)); OPENSSL_cleanse(mix, sizeof(mix)); OPENSSL_cleanse(signed_query, sizeof(signed_query));
  if (size < 1 || (size_t)size >= sizeof(url)) return;
  kernel_capture(url, "https://search.bilibili.com/", 0);
}
/* Splits the input on '|' into exactly `count` fields; the last field may itself contain '|'. */
static int kernel_fields(char *value, char **parts, int count) {
  parts[0] = value; int fields = 1;
  for (char *p = value; *p && fields < count; p++) if (*p == '|') { *p = 0; parts[fields++] = p + 1; }
  return fields == count;
}
static int kernel_build(int operation, char *input) {
  char *part[6]; kernel_captured = 0;
  switch (operation) {
  case KERNEL_POPULAR: kernel_popular(input); break;
  case KERNEL_RANKING: if (!*input) catalog_ranking(); break;
  case KERNEL_CATEGORY: { int id = catalog_category_id(input); if (id) catalog_category(id); break; }
  case KERNEL_PGC_RANKING:
    if (kernel_fields(input, part, 2) && catalog_pgc_type(part[0]) && (!strcmp(part[1], "3") || !strcmp(part[1], "7"))) catalog_pgc_ranking(catalog_pgc_type(part[0]), part[1][0] - '0');
    break;
  case KERNEL_PGC_INDEX:
    if (kernel_fields(input, part, 2) && catalog_pgc_type(part[0]) && strlen(part[1]) == 1 && part[1][0] >= '1' && part[1][0] <= '5') catalog_pgc_index(catalog_pgc_type(part[0]), part[1][0] - '0');
    break;
  case KERNEL_UP: if (kernel_fields(input, part, 2) && catalog_up_mid(part[0]) && catalog_up_page(part[1])) catalog_up_archives(part[0], catalog_up_page(part[1])); break;
  case KERNEL_VISITOR: if (!*input && !catalog_visitor[0]) catalog_visitor_id(); break;
  case KERNEL_SEARCH_NAV: if (!*input) search_public_nav(); break;
  case KERNEL_SEARCH:
    if (kernel_fields(input, part, 6) && strlen(part[0]) == 1 && part[0][0] >= '0' && part[0][0] <= '2') kernel_search(part[0][0] - '0', part[1], part[2], part[3], part[4], part[5]);
    break;
  case KERNEL_HOT: if (!*input) search_hot(); break;
  case KERNEL_VIEW: kernel_video_view(input); break;
  default: break;
  }
  return kernel_captured;
}
static void kernel_detach(void) {
  if (kernel_current && curl_multi_remove_handle(kernel_multi, kernel_current) != CURLM_OK) kernel_bad_close = 1;
  kernel_current = NULL; kernel_active = -1;
}
static void kernel_finish(void) {
  kernel_live = 0; kernel_detach();
  if (kernel_api) curl_easy_cleanup(kernel_api);
  if (kernel_search_host) curl_easy_cleanup(kernel_search_host);
  kernel_api = kernel_search_host = NULL;
  if (kernel_multi && curl_multi_cleanup(kernel_multi) != CURLM_OK) kernel_bad_close = 1;
  kernel_multi = NULL;
  if (kernel_accept) curl_slist_free_all(kernel_accept);
  kernel_accept = NULL;
  if (kernel_initialized) curl_global_cleanup();
  kernel_initialized = 0;
  OPENSSL_cleanse(guest_bytes, sizeof(guest_bytes)); guest_size = 0; OPENSSL_cleanse(kernel_view, kernel_view_size); kernel_view_size = 0;
  OPENSSL_cleanse(kernel_input, sizeof(kernel_input)); OPENSSL_cleanse(kernel_url, sizeof(kernel_url)); OPENSSL_cleanse(catalog_visitor, sizeof(catalog_visitor));
#ifdef __EMSCRIPTEN__
  emscripten_cancel_main_loop();
#endif
  kernel_emit(kernel_bad_close ? "KERNEL:unclosed" : "KERNEL:closed");
}
#ifndef KERNEL_TEST_PREPARE
#define KERNEL_TEST_PREPARE(easy) 1
#endif
static int kernel_start(void) {
  /* The frozen entries reference these to keep HOST warning checks meaningful; they are never called here. */
  (void)guest_popular; (void)guest_video; (void)search_typed; (void)search_video; (void)search_users; (void)search_pgc; (void)search_live; (void)catalog_visitor_perform;
  if (kernel_live || kernel_api || kernel_search_host || kernel_multi || kernel_bad_close) return 0;
  if (curl_global_init(CURL_GLOBAL_DEFAULT) != CURLE_OK) return 0;
  kernel_initialized = 1; kernel_api = curl_easy_init(); kernel_search_host = curl_easy_init(); kernel_multi = curl_multi_init();
  kernel_accept = curl_slist_append(NULL, "Accept: application/json");
  if (!kernel_api || !kernel_search_host || !kernel_multi || !kernel_accept || curl_multi_setopt(kernel_multi, CURLMOPT_MAXCONNECTS, 4L) != CURLM_OK) { kernel_finish(); return 0; }
  for (int i = 0; i < 2; i++) {
    CURL *easy = i ? kernel_search_host : kernel_api;
#define KERNEL_SET(option,value) do { if (curl_easy_setopt(easy, option, value) != CURLE_OK) { kernel_finish(); return 0; } } while (0)
    KERNEL_SET(CURLOPT_FOLLOWLOCATION, 0L); KERNEL_SET(CURLOPT_PROTOCOLS_STR, "https"); KERNEL_SET(CURLOPT_REDIR_PROTOCOLS_STR, "https");
    KERNEL_SET(CURLOPT_PROXY, ""); KERNEL_SET(CURLOPT_NOPROXY, "*");
    KERNEL_SET(CURLOPT_SSL_VERIFYPEER, 1L); KERNEL_SET(CURLOPT_SSL_VERIFYHOST, 2L); KERNEL_SET(CURLOPT_CAINFO, "/cacert.pem");
    KERNEL_SET(CURLOPT_CONNECTTIMEOUT_MS, 4000L); KERNEL_SET(CURLOPT_TIMEOUT_MS, 8000L); KERNEL_SET(CURLOPT_NOSIGNAL, 1L); KERNEL_SET(CURLOPT_HTTPGET, 1L);
    KERNEL_SET(CURLOPT_TCP_KEEPALIVE, 1L); KERNEL_SET(CURLOPT_HTTPHEADER, kernel_accept);
    KERNEL_SET(CURLOPT_WRITEFUNCTION, guest_body); KERNEL_SET(CURLOPT_WRITEDATA, NULL);
    KERNEL_SET(CURLOPT_HEADERFUNCTION, guest_header); KERNEL_SET(CURLOPT_HEADERDATA, NULL);
#undef KERNEL_SET
    if (!KERNEL_TEST_PREPARE(easy)) { kernel_finish(); return 0; }
  }
  kernel_live = 1; kernel_emit("KERNEL:ready"); return 1;
}
KERNEL_EXPORT uintptr_t kernel_input_ptr(void) { return (uintptr_t)kernel_input; }
KERNEL_EXPORT int kernel_input_capacity(void) { return KERNEL_INPUT_CAP; }
KERNEL_EXPORT uintptr_t kernel_body_ptr(void) { return kernel_view_last ? (uintptr_t)kernel_view : guest_response_ptr(); }
KERNEL_EXPORT unsigned int kernel_body_length(void) { return kernel_view_last ? (unsigned int)kernel_view_size : guest_response_length(); }
KERNEL_EXPORT int kernel_http_status(void) { return guest_http_status(); }
KERNEL_EXPORT int kernel_curl_status(void) { return guest_curl_status(); }
KERNEL_EXPORT int kernel_reject_reason(void) { return guest_reject_reason(); }
/* New connections opened so far (CURLINFO_NUM_CONNECTS summed): reuse keeps it near one. */
KERNEL_EXPORT int kernel_connections(void) { return (int)kernel_connects; }
/* ADR-104: the runtime User-Agent for catalog reads; an empty input clears it. */
KERNEL_EXPORT int kernel_set_agent(void) {
  if (!kernel_live || kernel_active >= 0) return 0;
  size_t n = strnlen(kernel_input, sizeof(kernel_input));
  if (n && (n >= sizeof(kernel_agent) || !catalog_agent_valid(kernel_input))) { kernel_agent[0] = 0; OPENSSL_cleanse(kernel_input, sizeof(kernel_input)); return 0; }
  memcpy(kernel_agent, kernel_input, n + 1); OPENSSL_cleanse(kernel_input, sizeof(kernel_input)); return 1;
}
/* ADR-106: the visitor identity for the next category/UP read; an empty input clears it. */
KERNEL_EXPORT int kernel_set_visitor(void) {
  if (!kernel_live || kernel_active >= 0) return 0;
  size_t n = strnlen(kernel_input, sizeof(kernel_input)); int valid = 1;
  OPENSSL_cleanse(catalog_visitor, sizeof(catalog_visitor));
  if (n && !catalog_visitor_set(kernel_input)) { OPENSSL_cleanse(catalog_visitor, sizeof(catalog_visitor)); valid = 0; }
  OPENSSL_cleanse(kernel_input, sizeof(kernel_input)); return valid;
}
KERNEL_EXPORT int kernel_begin(int operation) {
  if (!kernel_live || kernel_active >= 0 || operation < KERNEL_POPULAR || operation > KERNEL_MAX_OPERATION) return 0;
  size_t n = strnlen(kernel_input, sizeof(kernel_input));
  if (n > KERNEL_INPUT_CAP) return 0;
  char copy[KERNEL_INPUT_CAP + 1]; memcpy(copy, kernel_input, n + 1); OPENSSL_cleanse(kernel_input, sizeof(kernel_input));
  int built = kernel_build(operation, copy); OPENSSL_cleanse(copy, sizeof(copy));
  if (!built) { guest_reset(); return 0; }
  int catalog = operation >= KERNEL_RANKING && operation <= KERNEL_VISITOR, visitor = (operation == KERNEL_CATEGORY || operation == KERNEL_UP) && catalog_visitor[0];
  CURL *easy = strncmp(kernel_url, "https://s.search.bilibili.com/", 30) ? kernel_api : kernel_search_host;
  int view = operation == KERNEL_VIEW; kernel_view_last = view; if (!view) kernel_view_size = 0;
  if (curl_easy_setopt(easy, CURLOPT_WRITEFUNCTION, view ? kernel_view_body : guest_body) != CURLE_OK || curl_easy_setopt(easy, CURLOPT_URL, kernel_url) != CURLE_OK || curl_easy_setopt(easy, CURLOPT_REFERER, kernel_referer[0] ? kernel_referer : NULL) != CURLE_OK ||
      curl_easy_setopt(easy, CURLOPT_USERAGENT, catalog && kernel_agent[0] ? kernel_agent : KERNEL_PROBE_AGENT) != CURLE_OK ||
      curl_easy_setopt(easy, CURLOPT_COOKIE, visitor ? catalog_visitor : NULL) != CURLE_OK ||
      curl_easy_setopt(easy, CURLOPT_MAXFILESIZE_LARGE, (curl_off_t)(view ? KERNEL_VIEW_CAP : guest_limit)) != CURLE_OK || curl_multi_add_handle(kernel_multi, easy) != CURLM_OK) { guest_reset(); return 0; }
  kernel_current = easy; kernel_active = operation; kernel_request_until = kernel_now() + 9000; return 1;
}
/* Cancels only the current transfer; the session, handles and other connections stay. */
KERNEL_EXPORT int kernel_stop(void) {
  if (!kernel_live || kernel_active < 0) return 0;
  kernel_detach(); guest_reset(); kernel_view_size = 0; guest_transport = CURLE_ABORTED_BY_CALLBACK; return 1;
}
KERNEL_EXPORT void kernel_close(void) { if (kernel_live) kernel_finish(); }
static void kernel_tick(void) {
  if (!kernel_live || kernel_active < 0) return;
  double now = kernel_now();
  if (now < 0 || now >= kernel_request_until) {
    int operation = kernel_active; kernel_detach(); guest_reset(); kernel_view_size = 0; guest_transport = CURLE_OPERATION_TIMEDOUT;
    printf("KERNEL:response:%d\n", operation); fflush(stdout); return;
  }
  int running = 0;
  if (curl_multi_perform(kernel_multi, &running) != CURLM_OK) { kernel_bad_close = 1; kernel_finish(); return; }
  int left; CURLMsg *message;
  while ((message = curl_multi_info_read(kernel_multi, &left))) {
    if (message->msg != CURLMSG_DONE || message->easy_handle != kernel_current) { kernel_bad_close = 1; kernel_finish(); return; }
    guest_transport = (int)message->data.result;
    if (guest_transport == CURLE_FILESIZE_EXCEEDED) guest_rejection = 1;
    if (curl_easy_getinfo(kernel_current, CURLINFO_RESPONSE_CODE, &guest_status) != CURLE_OK) guest_status = 0;
    long fresh = 0; if (curl_easy_getinfo(kernel_current, CURLINFO_NUM_CONNECTS, &fresh) == CURLE_OK && fresh > 0) kernel_connects += fresh;
    int operation = kernel_active; kernel_detach();
    printf("KERNEL:response:%d\n", operation); fflush(stdout); return;
  }
}
#ifndef PUBLIC_KERNEL_NO_MAIN
int main(void) {
  if (!kernel_start()) return 1;
#ifdef __EMSCRIPTEN__
  emscripten_set_main_loop(kernel_tick, 40, 0);
#else
  while (kernel_live) { kernel_tick(); struct timespec wait = {0, 1000000}; nanosleep(&wait, NULL); }
#endif
  return 0;
}
#endif
