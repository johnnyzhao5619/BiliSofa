/* Fixed overlay C lane over synthetic local TLS, never real credentials. */
#include <curl/curl.h>
static int inject_remove_error;
static CURLMcode fixture_remove(CURLM *multi, CURL *easy) { CURLMcode result = curl_multi_remove_handle(multi, easy); return inject_remove_error ? CURLM_BAD_HANDLE : result; }
#define curl_multi_remove_handle fixture_remove
#define VOD_API_NO_MAIN
#include "overlay-read.c"
static int clean(void) { return !vod_live && !vod_api && !vod_cdn && !vod_multi && !vod_current && !vod_initialized && !vod_added && vod_active < 0 && !vod_size && !*vod_body && !*vod_input && !*vod_url; }
int main(int argc, char **argv) {
  if (argc != 4 || !vod_start()) return 1;
  const char *mode = argv[1];
  if (!strcmp(mode, "bounds")) {
    const char *bad[] = { "http://aisubtitle.hdslb.com/bfs/subtitle/a.json", "https://127.0.0.1/bfs/subtitle/a.json", "https://aisubtitle.hdslb.com.outside.invalid/bfs/subtitle/a.json", "https://a@aisubtitle.hdslb.com/bfs/subtitle/a.json", "https://aisubtitle.hdslb.com:443/bfs/subtitle/a.json", "https://aisubtitle.hdslb.com/bfs/subtitle/../subtitle/a.json", "https://aisubtitle.hdslb.com/bfs/subtitle/%2e/a.json", "https://aisubtitle.hdslb.com/bfs/subtitle/a.json#x", "https://aisubtitle.hdslb.com/bfs/subtitle/a", "https://aisubtitle.hdslb.com/bfs/ai_subtitle/", "https://aisubtitle.hdslb.com/bfs/ai_subtitle/prod/", "https://aisubtitle.hdslb.com/bfs/ai_subtitle/prod/a%2e", "https://aisubtitle.hdslb.com/bfs/ai_subtitle/prod/../a" };
    for (unsigned i = 0; i < sizeof(bad) / sizeof(bad[0]); i++) { strcpy(vod_input, bad[i]); if (vod_begin(5)) return 2; }
    const char *pairs[] = { "1|1|0|a|b|1", "1|1|1681|a|b|1", "1|1|10000|a|b|1", "1|1|01|a|b|1", "1|1|2|a|b|1", "https://outside.invalid|1|2|a|b|1" };
    for (unsigned i = 0; i < sizeof(pairs) / sizeof(pairs[0]); i++) { strcpy(vod_input, pairs[i]); if (vod_begin(6)) return 3; }
    /* ADR-115: seven days of six-minute segments; 1680 is the last one that signs, 1681 does not. */
    { const char *keys = "0123456789abcdef0123456789abcdef|fedcba9876543210fedcba9876543210"; char in[160], url[1024];
      snprintf(in, sizeof(in), "1|1|1680|%s|%lld", keys, (long long)time(NULL)); if (!overlay_wbi(6, in, url, sizeof(url)) || !strstr(url, "segment_index=1680&")) return 17;
      snprintf(in, sizeof(in), "1|1|1681|%s|%lld", keys, (long long)time(NULL)); if (overlay_wbi(6, in, url, sizeof(url))) return 18; }
    const char *good[] = { "https://aisubtitle.hdslb.com/bfs/ai_subtitle/prod/11337264110548526470449592b2aa?auth_key=1-synthetic-0-synthetic", "https://aisubtitle.hdslb.com/bfs/subtitle/a.json?auth_key=synthetic" };
    for (unsigned i = 0; i < sizeof(good) / sizeof(good[0]); i++) if (!overlay_subtitle_url(good[i])) return 6;
    if (vod_begin(2) || vod_begin(3) || vod_begin(8)) return 4;
    vod_finish(); return clean() ? 0 : 5;
  }
  char api[128], cdn[128]; snprintf(api, sizeof(api), "api.bilibili.com:443:127.0.0.1:%d", atoi(argv[3])); snprintf(cdn, sizeof(cdn), "aisubtitle.hdslb.com:443:127.0.0.1:%d", atoi(argv[3]));
  struct curl_slist *mapping = curl_slist_append(NULL, api); mapping = curl_slist_append(mapping, cdn);
  for (int i = 0; i < 2; i++) { CURL *easy = i ? vod_cdn : vod_api; curl_easy_setopt(easy, CURLOPT_CONNECT_TO, mapping); curl_easy_setopt(easy, CURLOPT_CAINFO, argv[2]); }
  const char *cookies = ".bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic-session\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\tsynthetic-csrf\n";
  strcpy(vod_input, cookies); if (!vod_import_cookies((int)strlen(cookies))) return 6;
  *vod_input = 0; if (!vod_begin(0)) return 7;
  if (!strcmp(mode, "cancel")) { vod_stop(); curl_slist_free_all(mapping); return clean() ? 0 : 8; }
  if (!strcmp(mode, "deadline")) { vod_request_until = vod_now() - 1; vod_tick(); curl_slist_free_all(mapping); return clean() ? 0 : 8; }
  if (!strcmp(mode, "unknown")) inject_remove_error = 1;
  int operation = 0; double until = vod_now() + 15000;
  while (vod_live && vod_now() < until) {
    vod_tick();
    if (vod_live && vod_active < 0) {
      if (vod_result || vod_status != 200) { vod_finish(); break; }
      if (operation == 6 && (vod_size != 3 || vod_body[0] != 0 || vod_body[1] != 1 || vod_body[2] != 2)) return 9;
      vod_response_clear();
      if (operation == 0) { operation = 1; strcpy(vod_input, "BV0000000001"); }
      else if (operation == 1) { operation = 4; snprintf(vod_input, sizeof(vod_input), "BV0000000001|222|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa|bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb|%lld", (long long)time(NULL)); }
      else if (operation == 4) { operation = 5; strcpy(vod_input, "https://aisubtitle.hdslb.com/bfs/subtitle/synthetic.json?auth_key=synthetic"); }
      else if (operation == 5) { operation = 6; snprintf(vod_input, sizeof(vod_input), "222|123|2|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa|bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb|%lld", (long long)time(NULL)); }
      else if (operation == 6) { operation = 7; strcpy(vod_input, "123"); }
      else { vod_finish(); break; }
      if (!vod_begin(operation)) return 10;
    }
    struct timespec wait = {0, 1000000}; nanosleep(&wait, NULL);
  }
  if (vod_live) { vod_finish(); return 11; }
  curl_slist_free_all(mapping); return clean() ? 0 : 12;
}
