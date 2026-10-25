/* ADR-108 P0b: the resident account read kernel. One WASM instance per active
 * account keeps one verified session (its own cookie jar, one connection) for
 * every private read: history, favorite folders and items, follow updates,
 * watch later, recommendations, and the signed category/UP reads (ADR-105).
 *
 * library.c and recommend-read.c stay frozen and are included unchanged: their
 * jar, cookie-line checks, Set-Cookie domain checks, body/header bounds, tick
 * and close are this kernel's engine. Operations 0 (nav), 2, 3, 5 and 6 go
 * through their own builders. New here are watch later and favorite items with
 * 20 rows per page, the two signed public lists, stop-current-only and a session
 * that lives up to ten minutes instead of twenty seconds.
 *
 * Read-only GETs only: no write, login, playback, CDN or caller URL route. */
#define RECOMMEND_NO_MAIN
#include "recommend-read.c"
#include "catalog-categories.h"
#ifndef KERNEL_SESSION_MS
#define KERNEL_SESSION_MS 600000
#endif
#define KERNEL_ROWS 20
enum { ACCOUNT_NAV = 0, ACCOUNT_HISTORY = 2, ACCOUNT_FOLDERS = 3, ACCOUNT_FOLLOW_UPDATES = 5, ACCOUNT_RECOMMEND = 6,
  ACCOUNT_WATCH_LATER = 7, ACCOUNT_FAVORITE_ITEMS = 8, ACCOUNT_CATEGORY = 9, ACCOUNT_UP = 10 };
static int account_digits(const char *s, size_t max) { size_t n = s ? strlen(s) : 0; return n && n <= max && s[0] != '0' && strspn(s, "0123456789") == n; }
static int account_batch(const char *s) { return account_digits(s, 1) && s[0] <= '5'; }
static int account_url(int operation, char *value) {
  int n = 0; char *part = strchr(value, '|');
  if (operation == ACCOUNT_WATCH_LATER) {
    if (part || !account_batch(value)) return 0;
    n = snprintf(request_url, sizeof(request_url), "https://api.bilibili.com/x/v2/medialist/toview/web?mobi_app=web&ps=%d&desc=true&otype=2&with_current=false&direction=false&preview=0&use_pn=true&pn=%s", KERNEL_ROWS, value);
  } else if (operation == ACCOUNT_FAVORITE_ITEMS) {
    if (!part || strchr(part + 1, '|')) return 0; *part++ = 0;
    if (!account_digits(value, 16) || !account_batch(part)) return 0;
    n = snprintf(request_url, sizeof(request_url), "https://api.bilibili.com/x/v2/medialist/resource/list?mobi_app=web&type=3&biz_id=%s&ps=%d&desc=true&sort_field=3&tid=0&otype=2&with_current=false&direction=false&preview=0&use_pn=true&pn=%s", value, KERNEL_ROWS, part);
  } else if (operation == ACCOUNT_CATEGORY) {
    int id = part ? 0 : catalog_category_id(value); if (!id) return 0;
    n = snprintf(request_url, sizeof(request_url), "https://api.bilibili.com/x/web-interface/ranking/v2?rid=%d&type=all", id);
  } else if (operation == ACCOUNT_UP) {
    if (!part || strchr(part + 1, '|')) return 0; *part++ = 0;
    if (!account_digits(value, 16) || strtoull(value, NULL, 10) > 9007199254740991ULL || !account_digits(part, 2) || atoi(part) > 50) return 0;
    n = snprintf(request_url, sizeof(request_url), "https://api.bilibili.com/x/series/recArchivesByKeywords?mid=%s&keywords=&ps=30&pn=%s", value, part);
  }
  return n > 0 && (size_t)n < sizeof(request_url);
}
static const char *account_referer(int operation) {
  return operation == ACCOUNT_WATCH_LATER ? "https://www.bilibili.com/list/watchlater" : operation == ACCOUNT_UP ? "https://space.bilibili.com/" : "https://www.bilibili.com/";
}
/* Opens a session (or reports that one is already open); the caller then imports the jar and verifies nav. */
AUTH_EXPORT int kernel_open(void) {
  if (live) return 1;
  if (!start()) return 0;
  session_until = now_ms() + KERNEL_SESSION_MS; return 1;
}
AUTH_EXPORT int kernel_begin(int operation) {
  if (operation == ACCOUNT_NAV || operation == ACCOUNT_HISTORY || operation == ACCOUNT_FOLDERS || operation == ACCOUNT_FOLLOW_UPDATES) return auth_begin(operation);
  if (operation == ACCOUNT_RECOMMEND) return recommend_begin();
  if (operation < ACCOUNT_WATCH_LATER || operation > ACCOUNT_UP || !live || active >= 0 || now_ms() < 0 || now_ms() >= session_until) { OPENSSL_cleanse(input, sizeof(input)); return 0; }
  char copy[AUTH_PRIVATE_CAP + 1]; const char *end = memchr(input, 0, sizeof(input));
  if (!end || end == input) { OPENSSL_cleanse(input, sizeof(input)); return 0; }
  memcpy(copy, input, (size_t)(end - input) + 1); OPENSSL_cleanse(input, sizeof(input));
  int built = account_url(operation, copy); OPENSSL_cleanse(copy, sizeof(copy));
  if (!built) return 0;
  wipe_response(); header_size = 0; http_status = 0; result_code = -1;
  if (curl_easy_setopt(easy, CURLOPT_HTTPGET, 1L) != CURLE_OK || curl_easy_setopt(easy, CURLOPT_REFERER, account_referer(operation)) != CURLE_OK ||
      curl_easy_setopt(easy, CURLOPT_URL, request_url) != CURLE_OK || curl_multi_add_handle(multi, easy) != CURLM_OK) return 0;
  active = operation; added = 1; request_until = now_ms() + 9000; return 1;
}
/* Cancels only the current transfer. The session, its jar and its connection cache stay. */
AUTH_EXPORT int kernel_stop(void) {
  if (!live || active < 0) return 0;
  if (added && curl_multi_remove_handle(multi, easy) != CURLM_OK) { bad_close = 1; finish(); return 0; }
  added = 0; active = -1; wipe_response(); OPENSSL_cleanse(input, sizeof(input)); return 1;
}
AUTH_EXPORT int kernel_live(void) { return live; }
#ifndef ACCOUNT_KERNEL_NO_MAIN
int main(void) {
  if (!kernel_open()) return 1;
#ifdef __EMSCRIPTEN__
  emscripten_set_main_loop(tick, 40, 0);
#else
  while (live) { tick(); struct timespec wait = {0, 10000000}; nanosleep(&wait, NULL); }
#endif
  return 0;
}
#endif
