/* Synthetic private-cookie fixture; no real account/network destination. */
#include <curl/curl.h>
static int inject_remove_error;
static CURLMcode fixture_remove(CURLM *multi, CURL *easy) {
  CURLMcode result = curl_multi_remove_handle(multi, easy);
  return inject_remove_error ? CURLM_BAD_HANDLE : result;
}
#define curl_multi_remove_handle fixture_remove
#define VOD_API_NO_MAIN
#if defined(BILISOFA_SOURCE_FAILOVER_FIXTURE) && defined(BILISOFA_PGC_FIXTURE)
#include "pgc-read-failover.c"
#elif defined(BILISOFA_SOURCE_FAILOVER_FIXTURE)
#include "vod-api-failover.c"
#elif defined(BILISOFA_PGC_FIXTURE)
#include "pgc-read.c"
#else
#include "vod-api.c"
#endif
static int clean(void) {
  return !vod_live && !vod_api && !vod_cdn && !vod_multi && !vod_current && !vod_initialized && !vod_added && vod_active < 0 && !vod_size && !*vod_body && !*vod_input && !*vod_url;
}
int main(int argc, char **argv) {
  if (argc != 4 || !vod_start()) return 1;
  const char *mode = argv[1];
  char api[128], cdn[128];
  snprintf(api, sizeof(api), "api.bilibili.com:443:127.0.0.1:%d", atoi(argv[3]));
  snprintf(cdn, sizeof(cdn), "fixture.bilivideo.com:443:127.0.0.1:%d", atoi(argv[3]));
  struct curl_slist *mapping = curl_slist_append(NULL, api); mapping = curl_slist_append(mapping, cdn);
  for (int i = 0; i < 2; i++) {
    CURL *easy = i ? vod_cdn : vod_api;
    curl_easy_setopt(easy, CURLOPT_CONNECT_TO, mapping); curl_easy_setopt(easy, CURLOPT_CAINFO, argv[2]);
  }
#ifdef BILISOFA_PGC_FIXTURE
  if (!strcmp(mode, "pgc-bounds")) {
    const char *bad[] = { "0", "01", "-1", "9007199254740992", "12?x=1", "https://outside.invalid/1", "12\r\nHost: outside.invalid" };
    for (unsigned i = 0; i < sizeof(bad) / sizeof(bad[0]); i++) { strcpy(vod_input, bad[i]); if (vod_begin(4)) return 21; }
    const char *pairs[] = { "1", "1|0", "0|1", "1|1|2", "1|01", "1|https://outside.invalid/a", "9007199254740992|1" };
    for (unsigned i = 0; i < sizeof(pairs) / sizeof(pairs[0]); i++) { strcpy(vod_input, pairs[i]); if (vod_begin(5)) return 22; }
    vod_finish(); curl_slist_free_all(mapping); return clean() ? 0 : 23;
  }
#endif
  /* ADR-102: only the failover entries admit Bilibili's Akamai backup family for the source check. */
  if (!strcmp(mode, "akamai")) {
    char url[256]; long long deadline = (long long)time(NULL) + 3600;
    snprintf(url, sizeof(url), "https://upos-hz-mirrorakam.akamaized.net/a.m4s?deadline=%lld", deadline); strcpy(vod_input, url);
    int accepted = vod_begin(3); vod_finish();
#ifdef BILISOFA_SOURCE_FAILOVER_FIXTURE
    if (!accepted) return 24;
#else
    if (accepted) return 25;
#endif
    const char *hosts[] = { "evil-mirrorakam.akamaized.net", "upos-hz-mirrorakam.akamaized.net.example.com", "upos-HZ-mirrorakam.akamaized.net", "a248.e.akamai.net" };
    for (unsigned i = 0; i < sizeof(hosts) / sizeof(hosts[0]); i++) {
      if (!vod_start()) return 26;
      snprintf(url, sizeof(url), "https://%s/a.m4s?deadline=%lld", hosts[i], deadline); strcpy(vod_input, url);
      if (vod_begin(3)) return 27;
      vod_finish();
    }
    curl_slist_free_all(mapping); return clean() ? 0 : 28;
  }
  if (!strcmp(mode, "bounds")) {
    vod_limit = VOD_BODY_CAP;
    if (vod_body_cb("x", 1, VOD_BODY_CAP + 1, NULL) || vod_header_cb("x", 1, 16385, NULL)) return 2;
    memset(vod_input, 'x', sizeof(vod_input)); if (vod_begin(1)) return 3;
    memset(vod_input, 0, sizeof(vod_input));
    const char *bad[] = { "../private", "BV000000001", "BV0000000001?x=1", "" };
    for (unsigned i = 0; i < sizeof(bad) / sizeof(bad[0]); i++) { strcpy(vod_input, bad[i]); if (vod_begin(1)) return 4; }
    const char *urls[] = { "http://fixture.bilivideo.com/a.m4s?deadline=9999999999", "https://127.0.0.1/a.m4s?deadline=9999999999", "https://fixture.bilivideo.com/a.m4s?deadline=0", "https://fixture.bilivideo.com/a.m4s?deadline=9999999999" };
    for (unsigned i = 0; i < sizeof(urls) / sizeof(urls[0]); i++) { strcpy(vod_input, urls[i]); if (vod_begin(3)) return 5; }
    strcpy(vod_input, "BV0000000001|1|x|y|1"); if (vod_begin(2) || vod_begin(4) || vod_begin(-1)) return 6;
    vod_finish(); curl_slist_free_all(mapping); return clean() ? 0 : 7;
  }
  const char *cookies = !strcmp(mode, "badcookie") ? ".outside.invalid\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic\n" :
    ".bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic-session\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\tsynthetic-csrf\n";
  strcpy(vod_input, cookies); int imported = vod_import_cookies((int)strlen(vod_input));
  if (!strcmp(mode, "badcookie")) { vod_finish(); curl_slist_free_all(mapping); return !imported && clean() ? 0 : 8; }
  if (!imported || *vod_input || !vod_begin(0) || vod_begin(0)) return 9;
  if (!strcmp(mode, "cancel")) { vod_stop(); curl_slist_free_all(mapping); return clean() ? 0 : 10; }
  if (!strcmp(mode, "deadline")) { vod_request_until = vod_now() - 1; vod_tick(); curl_slist_free_all(mapping); return clean() ? 0 : 11; }
  if (!strcmp(mode, "unknown")) inject_remove_error = 1;
  int operation = 0, repeats = 0;
  double until = vod_now() + 15000;
  while (vod_live && vod_now() < until) {
    vod_tick();
    if (vod_live && vod_active < 0) {
      if (vod_result || vod_status != (operation == 3 ? 206 : 200)) { vod_finish(); break; }
      if (operation == 3) {
        if (!vod_source_valid() || vod_source_total() != 8192) return 12;
        if (repeats++) { vod_finish(); break; }
      }
      vod_response_clear();
      if (operation == 0) {
#ifdef BILISOFA_PGC_FIXTURE
        if (!strcmp(mode, "pgc")) { operation = 4; strcpy(vod_input, "123"); }
        else
#endif
        { operation = 1; strcpy(vod_input, "BV0000000001"); }
      }
#ifdef BILISOFA_PGC_FIXTURE
      else if (operation == 4) { operation = 5; strcpy(vod_input, "456|789"); }
#endif
      else if (operation == 1) { operation = 2; snprintf(vod_input, sizeof(vod_input), "BV0000000001|123|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa|bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb|%lld", (long long)time(NULL)); }
      else { operation = 3; snprintf(vod_input, sizeof(vod_input), "https://fixture.bilivideo.com/a.m4s?deadline=%lld", (long long)time(NULL) + 3600); }
      if (!vod_begin(operation)) return 13;
    }
    struct timespec wait = {0, 1000000}; nanosleep(&wait, NULL);
  }
  if (vod_live) { vod_finish(); return 14; }
  curl_slist_free_all(mapping);
  return clean() && (strcmp(mode, "unknown") || vod_bad_close) ? 0 : 15;
}
