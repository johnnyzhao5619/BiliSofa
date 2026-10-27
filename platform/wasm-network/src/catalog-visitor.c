#include "service-config.h"
/* ADR-106: catalog-ua plus Bilibili's own visitor identity for anonymous reads.
 * A browser receives buvid3/buvid4 from x/frontend/finger/spi on its first visit
 * and sends them (with b_nut) with every request; the guest lane now does the same.
 * catalog-ua.c (and catalog-up.c, catalog.c, probe-guest.h) stay frozen: this entry
 * adds the fixed `visitor-id` route and a validated `--visitor=<b3>|<b4>|<nut>`
 * that becomes the only Cookie of the anonymous request. Nothing else changes. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <curl/curl.h>
static char catalog_visitor[256];
#ifdef curl_easy_perform
#define CATALOG_VISITOR_OUTER_PERFORM
#pragma push_macro("curl_easy_perform")
#undef curl_easy_perform
#endif
static CURLcode catalog_visitor_perform(CURL *easy);
#define curl_easy_perform catalog_visitor_perform
#ifdef main
#define CATALOG_VISITOR_OUTER_MAIN
#pragma push_macro("main")
#undef main
#endif
#define main catalog_ua_main
#include "catalog-ua.c"
#undef main
#ifdef CATALOG_VISITOR_OUTER_MAIN
#pragma pop_macro("main")
#endif
#undef curl_easy_perform
#ifdef CATALOG_VISITOR_OUTER_PERFORM
#pragma pop_macro("curl_easy_perform")
#endif
static CURLcode catalog_visitor_perform(CURL *easy) {
  if (catalog_visitor[0] && curl_easy_setopt(easy, CURLOPT_COOKIE, catalog_visitor) != CURLE_OK) return CURLE_FAILED_INIT;
  return curl_easy_perform(easy);
}
static int catalog_visitor_part(const char *s, size_t n, size_t min, size_t max, const char *allowed) {
  return n >= min && n <= max && strspn(s, allowed) >= n;
}
/* <buvid3>|<buvid4>|<b_nut>: buvid3 16-64 of [A-Za-z0-9-]; buvid4 16-128 of [A-Za-z0-9%-] (URL-encoded); b_nut 10 digits. */
static int catalog_visitor_set(const char *value) {
  const char *a = strchr(value, '|'), *b = a ? strchr(a + 1, '|') : NULL;
  if (!a || !b || strchr(b + 1, '|')) return 0;
  const char *alnum = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-";
  const char *encoded = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-%";
  size_t n3 = (size_t)(a - value), n4 = (size_t)(b - a - 1), nn = strlen(b + 1);
  if (!catalog_visitor_part(value, n3, 16, 64, alnum) || !catalog_visitor_part(a + 1, n4, 16, 128, encoded) || nn != 10 || strspn(b + 1, "0123456789") != 10) return 0;
  int size = snprintf(catalog_visitor, sizeof(catalog_visitor), "buvid3=%.*s; buvid4=%.*s; b_nut=%s", (int)n3, value, (int)n4, a + 1, b + 1);
  return size > 0 && (size_t)size < sizeof(catalog_visitor);
}
static void catalog_visitor_id(void) {
  guest_reset(); guest_limit = 8192;
  guest_get(SERVICE_ADDRESS_A_C22C56A99CED, SERVICE_ADDRESS_A_B12964D8C1B1, 0);
}
int main(int argc, char **argv) {
  if (argc >= 2 && !strncmp(argv[1], "--visitor=", 10)) {
    if (!catalog_visitor_set(argv[1] + 10)) { memset(catalog_visitor, 0, sizeof(catalog_visitor)); guest_reset(); puts("GUEST:closed"); fflush(stdout); return 1; }
    argv[1] = argv[0]; argc--; argv++;
  }
  /* visitor-id takes the same optional runtime User-Agent, never a visitor cookie of its own. */
  int at = 1;
  if (argc >= 2 && !strncmp(argv[1], "--ua=", 5)) { if (!catalog_agent_valid(argv[1] + 5)) { guest_reset(); puts("GUEST:closed"); fflush(stdout); return 1; } at = 2; }
  if (argc == at + 1 && !strcmp(argv[at], "visitor-id")) {
    if (catalog_visitor[0]) { guest_reset(); puts("GUEST:closed"); fflush(stdout); return 1; }
    if (at == 2) catalog_agent = argv[1] + 5;
    catalog_visitor_id(); return 0;
  }
  return catalog_ua_main(argc, argv);
}
