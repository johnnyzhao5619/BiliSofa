/* ADR-112: the video and audio 512-byte source checks run at the same time.
 * Included after vod-api.c (built with VOD_API_NO_MAIN), which stays unchanged.
 * Two anonymous CDN handles with their own state sit on their own multi handle;
 * the wrapper's tick drives them next to vod_tick. One check pair at a time,
 * never while a vod_begin transfer is active. Both legs finish, then one fixed
 * "VODAPI:pair" frame; each leg's integers are read through the exports below. */
#ifndef BILISOFA_VOD_SOURCE_PAIR_H
#define BILISOFA_VOD_SOURCE_PAIR_H
typedef struct {
  CURL *easy; int added, done, result, range_header; long status;
  size_t size, headers; unsigned long long total;
  unsigned char body[513]; char url[3072];
} vod_pair_leg;
static vod_pair_leg vod_pair[2];
static CURLM *vod_pair_multi;
static int vod_pair_active, vod_pair_ready[2];
static double vod_pair_until;
static void vod_pair_reset(vod_pair_leg *leg) {
  OPENSSL_cleanse(leg->body, sizeof(leg->body)); leg->size = 0; leg->headers = 0; leg->status = 0; leg->result = -1;
  leg->range_header = 0; leg->total = 0; leg->done = 0;
}
static void vod_pair_cleanup(void) {
  for (int i = 0; i < 2; i++) {
    vod_pair_leg *leg = &vod_pair[i];
    if (leg->added && vod_pair_multi && curl_multi_remove_handle(vod_pair_multi, leg->easy) != CURLM_OK) vod_bad_close = 1;
    leg->added = 0;
    if (leg->easy) curl_easy_cleanup(leg->easy);
    leg->easy = NULL; vod_pair_reset(leg); OPENSSL_cleanse(leg->url, sizeof(leg->url)); vod_pair_ready[i] = 0;
  }
  if (vod_pair_multi && curl_multi_cleanup(vod_pair_multi) != CURLM_OK) vod_bad_close = 1;
  vod_pair_multi = NULL; vod_pair_active = 0;
}
static size_t vod_pair_body_cb(char *bytes, size_t unit, size_t count, void *context) {
  vod_pair_leg *leg = context;
  if (unit && count > 512 / unit) return 0;
  size_t n = unit * count;
  if (n > 512 - leg->size) return 0;
  memcpy(leg->body + leg->size, bytes, n); leg->size += n; leg->body[leg->size] = 0; return n;
}
/* Same rules as vod_header_cb for the 512-byte check (operation 3): exact Content-Range, identity encoding only. */
static size_t vod_pair_header_cb(char *bytes, size_t unit, size_t count, void *context) {
  vod_pair_leg *leg = context;
  if (unit && count > 16384 / unit) return 0;
  size_t n = unit * count;
  if (n > 16384 - leg->headers || memchr(bytes, 0, n)) return 0;
  leg->headers += n;
  if (n >= 14 && !strncasecmp(bytes, "Content-Range:", 14)) {
    char line[128]; int end = 0; unsigned long long total = 0;
    if (n >= sizeof(line) || leg->range_header) return 0;
    memcpy(line, bytes, n); line[n] = 0;
    if (sscanf(line + 14, " bytes 0-511/%13llu%n", &total, &end) != 1 || strcmp(line + 14 + end, "\r\n") || total < 512 || total > 1099511627776ULL) return 0;
    leg->range_header = 1; leg->total = total;
  }
  if (n >= 17 && !strncasecmp(bytes, "Content-Encoding:", 17) && (n != 28 || strncasecmp(bytes + 17, " identity\r\n", 11))) return 0;
  return n;
}
static int vod_pair_open(void) {
  if (vod_pair_multi) return 1;
  vod_pair_multi = curl_multi_init();
  if (!vod_pair_multi) return 0;
  for (int i = 0; i < 2; i++) {
    CURL *easy = curl_easy_init(); vod_pair[i].easy = easy;
    if (!easy) return 0;
#define VOD_PAIR_SET(option,value) do { if (curl_easy_setopt(easy, option, value) != CURLE_OK) return 0; } while (0)
    VOD_PAIR_SET(CURLOPT_FOLLOWLOCATION, 0L); VOD_PAIR_SET(CURLOPT_PROTOCOLS_STR, "https"); VOD_PAIR_SET(CURLOPT_REDIR_PROTOCOLS_STR, "https");
    VOD_PAIR_SET(CURLOPT_PROXY, ""); VOD_PAIR_SET(CURLOPT_NOPROXY, "*"); VOD_PAIR_SET(CURLOPT_USERAGENT, "BiliSofa/0.0.0"); VOD_PAIR_SET(CURLOPT_REFERER, "https://www.bilibili.com/");
    VOD_PAIR_SET(CURLOPT_SSL_VERIFYPEER, 1L); VOD_PAIR_SET(CURLOPT_SSL_VERIFYHOST, 2L); VOD_PAIR_SET(CURLOPT_CAINFO, "/cacert.pem");
    VOD_PAIR_SET(CURLOPT_CONNECTTIMEOUT_MS, 4000L); VOD_PAIR_SET(CURLOPT_TIMEOUT_MS, 8000L); VOD_PAIR_SET(CURLOPT_NOSIGNAL, 1L); VOD_PAIR_SET(CURLOPT_HTTPGET, 1L);
    VOD_PAIR_SET(CURLOPT_RANGE, "0-511");
    VOD_PAIR_SET(CURLOPT_WRITEFUNCTION, vod_pair_body_cb); VOD_PAIR_SET(CURLOPT_WRITEDATA, &vod_pair[i]);
    VOD_PAIR_SET(CURLOPT_HEADERFUNCTION, vod_pair_header_cb); VOD_PAIR_SET(CURLOPT_HEADERDATA, &vod_pair[i]);
#ifdef BILISOFA_PAIR_PREPARE
    if (!BILISOFA_PAIR_PREPARE(easy)) return 0;
#endif
#undef VOD_PAIR_SET
  }
  return 1;
}
/* Takes the CDN address in vod_input for leg 0 (video) or 1 (audio); same destination rule as operation 3. */
VOD_EXPORT int vod_pair_set(int leg) {
  size_t n = strnlen(vod_input, sizeof(vod_input));
  if (!vod_live || vod_active >= 0 || vod_pair_active || (leg != 0 && leg != 1) || n > VOD_INPUT_CAP || n >= sizeof(vod_pair[0].url) || !guest_cdn_valid(vod_input)) { OPENSSL_cleanse(vod_input, sizeof(vod_input)); return 0; }
  memcpy(vod_pair[leg].url, vod_input, n + 1); OPENSSL_cleanse(vod_input, sizeof(vod_input)); vod_pair_ready[leg] = 1; return 1;
}
VOD_EXPORT int vod_pair_begin(void) {
  if (!vod_live || vod_active >= 0 || vod_pair_active || !vod_pair_ready[0] || !vod_pair_ready[1] || vod_now() < 0 || vod_now() >= vod_session_until) return 0;
  if (!vod_pair_open()) { vod_pair_cleanup(); return 0; }
  for (int i = 0; i < 2; i++) {
    vod_pair_leg *leg = &vod_pair[i]; vod_pair_reset(leg);
    if (curl_easy_setopt(leg->easy, CURLOPT_URL, leg->url) != CURLE_OK || curl_multi_add_handle(vod_pair_multi, leg->easy) != CURLM_OK) {
      // A half-started pair never stays attached: detach the first leg and refuse.
      for (int j = 0; j < i; j++) { if (curl_multi_remove_handle(vod_pair_multi, vod_pair[j].easy) != CURLM_OK) vod_bad_close = 1; vod_pair[j].added = 0; }
      vod_pair_ready[0] = vod_pair_ready[1] = 0; return 0;
    }
    leg->added = 1;
  }
  vod_pair_ready[0] = vod_pair_ready[1] = 0;
  vod_pair_active = 1; vod_pair_until = vod_now() + 9000; return 1;
}
VOD_EXPORT int vod_pair_http(int leg) { return leg == 0 || leg == 1 ? (int)vod_pair[leg].status : -1; }
VOD_EXPORT int vod_pair_curl(int leg) { return leg == 0 || leg == 1 ? vod_pair[leg].result : -1; }
VOD_EXPORT double vod_pair_total(int leg) { return leg == 0 || leg == 1 ? (double)vod_pair[leg].total : 0; }
VOD_EXPORT int vod_pair_valid(int leg) {
  if (leg != 0 && leg != 1) return 0;
  vod_pair_leg *l = &vod_pair[leg];
  return l->done && l->result == 0 && l->status == 206 && l->range_header && l->size == 512 && !memcmp(l->body + 4, "ftyp", 4);
}
VOD_EXPORT void vod_pair_clear(void) { for (int i = 0; i < 2; i++) { OPENSSL_cleanse(vod_pair[i].body, sizeof(vod_pair[i].body)); OPENSSL_cleanse(vod_pair[i].url, sizeof(vod_pair[i].url)); } }
static void vod_pair_tick(void) {
  vod_tick();
  if (!vod_live || !vod_pair_active) return;
  double now = vod_now();
  if (now < 0 || now >= vod_session_until || now >= vod_pair_until) { vod_emit("VODAPI:deadline"); vod_finish(); return; }
  int running = 0;
  if (curl_multi_perform(vod_pair_multi, &running) != CURLM_OK) { vod_emit("VODAPI:transport"); vod_finish(); return; }
  int left; CURLMsg *message;
  while ((message = curl_multi_info_read(vod_pair_multi, &left))) {
    vod_pair_leg *leg = message->easy_handle == vod_pair[0].easy ? &vod_pair[0] : message->easy_handle == vod_pair[1].easy ? &vod_pair[1] : NULL;
    if (message->msg != CURLMSG_DONE || !leg || leg->done) { vod_emit("VODAPI:transport"); vod_finish(); return; }
    leg->result = (int)message->data.result;
    if (curl_easy_getinfo(leg->easy, CURLINFO_RESPONSE_CODE, &leg->status) != CURLE_OK) leg->status = 0;
    if (curl_multi_remove_handle(vod_pair_multi, leg->easy) != CURLM_OK) { vod_bad_close = 1; vod_finish(); return; }
    leg->added = 0; leg->done = 1;
  }
  if (vod_pair[0].done && vod_pair[1].done) { vod_pair_active = 0; vod_emit("VODAPI:pair"); }
}
#ifndef VOD_PAIR_NO_MAIN
int main(void) {
  if (!vod_start()) return 1;
#ifdef __EMSCRIPTEN__
  emscripten_set_main_loop(vod_pair_tick, 40, 0);
#else
  while (vod_live) { vod_pair_tick(); struct timespec wait = {0, 1000000}; nanosleep(&wait, NULL); }
#endif
  return 0;
}
#endif
#endif
