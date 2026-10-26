/* ADR-112 parallel source checks: two anonymous CDN legs with their own state, driven by the pair tick. */
#include <curl/curl.h>
static struct curl_slist *pair_mapping;
static const char *pair_ca;
#define BILISOFA_PAIR_PREPARE(easy) (curl_easy_setopt(easy, CURLOPT_CONNECT_TO, pair_mapping) == CURLE_OK && curl_easy_setopt(easy, CURLOPT_CAINFO, pair_ca) == CURLE_OK)
#define VOD_PAIR_NO_MAIN
#ifdef BILISOFA_PGC_FIXTURE
#include "pgc-read-pair.c"
#else
#include "vod-api-pair.c"
#endif
static int clean(void) {
  return !vod_live && !vod_api && !vod_cdn && !vod_multi && !vod_pair_multi && !vod_pair[0].easy && !vod_pair[1].easy && !vod_pair_active &&
    !vod_pair_ready[0] && !vod_pair_ready[1] && !*vod_pair[0].url && !*vod_pair[1].url && !vod_pair[0].size && !vod_pair[1].size && !*vod_input;
}
static void url(const char *path) { snprintf(vod_input, sizeof(vod_input), "https://fixture.bilivideo.com/%s.m4s?deadline=%lld", path, (long long)time(NULL) + 3600); }
static int set(const char *video, const char *audio) { url(video); if (!vod_pair_set(0)) return 0; url(audio); return vod_pair_set(1); }
/* Runs the pair until its frame; returns the elapsed milliseconds, or -1 if the session ended instead. */
static double run(void) {
  double start = vod_now(), until = start + 15000;
  while (vod_live && vod_pair_active && vod_now() < until) { vod_pair_tick(); struct timespec wait = {0, 1000000}; nanosleep(&wait, NULL); }
  return vod_live && !vod_pair_active ? vod_now() - start : -1;
}
int main(int argc, char **argv) {
  if (argc != 4 || !vod_start()) return 1;
  const char *mode = argv[1]; char map[128];
  snprintf(map, sizeof(map), "fixture.bilivideo.com:443:127.0.0.1:%d", atoi(argv[3]));
  pair_mapping = curl_slist_append(NULL, map); pair_ca = argv[2];
  int code = 0;
  if (!strcmp(mode, "bounds")) {
    const char *bad[] = { "http://fixture.bilivideo.com/a.m4s?deadline=9999999999", "https://127.0.0.1/a.m4s?deadline=9999999999", "https://fixture.bilivideo.com/a.m4s?deadline=0", "https://outside.invalid/a.m4s?deadline=9999999999", "" };
    for (unsigned i = 0; i < sizeof(bad) / sizeof(bad[0]); i++) { strcpy(vod_input, bad[i]); if (vod_pair_set(0) || *vod_input) code = 2; }
    if (vod_pair_set(2) || vod_pair_set(-1)) code = 3;
    url("a"); if (!vod_pair_set(0) || vod_pair_begin()) code = 4;  /* one leg set is not a pair */
    snprintf(vod_input, sizeof(vod_input), "https://upos-hz-mirrorakam.akamaized.net/a.m4s?deadline=%lld", (long long)time(NULL) + 3600);
    if (!vod_pair_set(1)) code = 5;  /* the ADR-102 backup family stays admitted */
  } else if (!strcmp(mode, "pair")) {
    /* Each leg waits 700 ms at the server: in parallel the pair ends near 700 ms, in series near 1400 ms. */
    if (!set("slow-v", "slow-a") || !vod_pair_begin()) code = 6;
    double elapsed = run(); printf("elapsed=%d\n", (int)elapsed);
    if (elapsed < 0 || !vod_pair_valid(0) || !vod_pair_valid(1) || vod_pair_total(0) != 8192 || vod_pair_total(1) != 4096 || vod_pair_http(0) != 206 || vod_pair_curl(1) != 0) code = 7;
    vod_pair_clear();
    /* The same handles serve a second pair in the same session. */
    if (!code && (!set("v", "a") || !vod_pair_begin() || run() < 0 || !vod_pair_valid(0) || !vod_pair_valid(1))) code = 8;
  } else if (!strcmp(mode, "one-fails")) {
    if (!set("v", "missing") || !vod_pair_begin() || run() < 0) code = 9;
    else if (!vod_pair_valid(0) || vod_pair_valid(1) || vod_pair_http(1) != 404 || vod_pair_curl(1) != 0) code = 10;
  } else if (!strcmp(mode, "not-range")) {
    if (!set("full", "a") || !vod_pair_begin() || run() < 0) code = 11;
    else if (vod_pair_valid(0) || !vod_pair_valid(1) || vod_pair_curl(0) == 0) code = 12;
  } else if (!strcmp(mode, "busy")) {
    if (!set("slow-v", "slow-a") || !vod_pair_begin()) code = 13;
    strcpy(vod_input, "BV0000000001"); if (vod_begin(1)) code = 14;
    url("v"); if (vod_pair_set(0) || vod_pair_begin()) code = 15;
    if (!code && run() < 0) code = 16;
  } else if (!strcmp(mode, "cancel")) {
    if (!set("slow-v", "slow-a") || !vod_pair_begin()) code = 17;
    vod_stop(); curl_slist_free_all(pair_mapping); return code ? code : clean() ? 0 : 18;
  } else if (!strcmp(mode, "deadline")) {
    if (!set("slow-v", "slow-a") || !vod_pair_begin()) code = 19;
    vod_pair_until = vod_now() - 1; vod_pair_tick(); curl_slist_free_all(pair_mapping); return code ? code : clean() ? 0 : 20;
  } else code = 21;
  vod_finish(); curl_slist_free_all(pair_mapping);
  return code ? code : clean() ? 0 : 22;
}
