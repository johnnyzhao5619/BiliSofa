/* Original isolated W01 network validation. Fixed anonymous GETs only. */
#include <stdio.h>
#include <string.h>
#include <time.h>
#include <curl/curl.h>
#include <openssl/crypto.h>
#include <openssl/rand.h>
#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#endif
static CURL *easy;
static CURLM *multi;
static int stage, failed, live, added, initialized;
static size_t body_bytes, header_bytes;
static char error_buffer[CURL_ERROR_SIZE];
static double deadline;
static const char *const urls[] = { "https://api.bilibili.com/x/web-interface/nav", "https://expired.badssl.com/", "https://wrong.host.badssl.com/", "https://self-signed.badssl.com/" };
static const char *const names[] = { "positive", "expired", "hostname", "selfsigned" };
static double clock_ms(void) { struct timespec t; if (clock_gettime(CLOCK_MONOTONIC, &t)) return -1; return t.tv_sec * 1000.0 + t.tv_nsec / 1000000.0; }
static void line(const char *value) { puts(value); fflush(stdout); }
static size_t discard(char *data, size_t size, size_t count, void *opaque) {
  (void)data; size_t *total = opaque, limit = total == &header_bytes ? 8192 : 65536;
  if (size && count > limit / size) return 0;
  size_t n = size * count; if (*total > limit - n) return 0; *total += n; return n;
}
static int release_easy(void) {
  if (added && curl_multi_remove_handle(multi, easy) != CURLM_OK) return 0;
  added = 0; if (easy) curl_easy_cleanup(easy); easy = NULL; OPENSSL_cleanse(error_buffer, sizeof(error_buffer)); return 1;
}
static void finish(const char *result) {
  live = 0; int closed = release_easy();
  if (multi) { if (curl_multi_cleanup(multi) != CURLM_OK) closed = 0; multi = NULL; }
  if (initialized) { curl_global_cleanup(); initialized = 0; }
  OPENSSL_cleanup();
#ifdef __EMSCRIPTEN__
  emscripten_cancel_main_loop();
#endif
  line(closed ? result : "NET:unclosed");
}
static int begin_case(void) {
  body_bytes = header_bytes = 0; memset(error_buffer, 0, sizeof(error_buffer)); easy = curl_easy_init(); if (!easy) return 0;
#define SET(option,value) do { if (curl_easy_setopt(easy,option,value) != CURLE_OK) return 0; } while (0)
  SET(CURLOPT_URL, urls[stage]); SET(CURLOPT_PROXY, ""); SET(CURLOPT_NOPROXY, "*");
  SET(CURLOPT_USERAGENT, "BiliSofa-W01-Network/0.0.1"); SET(CURLOPT_PROTOCOLS_STR, "https"); SET(CURLOPT_REDIR_PROTOCOLS_STR, "https");
  SET(CURLOPT_SSL_VERIFYPEER, 1L); SET(CURLOPT_SSL_VERIFYHOST, 2L); SET(CURLOPT_CAINFO, "/cacert.pem"); SET(CURLOPT_FOLLOWLOCATION, 0L);
  SET(CURLOPT_CONNECTTIMEOUT_MS, 4000L); SET(CURLOPT_TIMEOUT_MS, 8000L); SET(CURLOPT_NOSIGNAL, 1L);
  SET(CURLOPT_ERRORBUFFER, error_buffer);
  SET(CURLOPT_WRITEFUNCTION, discard); SET(CURLOPT_WRITEDATA, &body_bytes); SET(CURLOPT_HEADERFUNCTION, discard); SET(CURLOPT_HEADERDATA, &header_bytes);
#undef SET
  if (curl_multi_add_handle(multi, easy) != CURLM_OK) return 0; added = 1; return 1;
}
static void tick(void) {
  if (!live) return;
  double now = clock_ms(); if (now < 0 || now >= deadline) { finish("NET:failed"); return; }
  int running; if (curl_multi_perform(multi, &running) != CURLM_OK) { finish("NET:failed"); return; }
  int left; CURLMsg *message;
  while ((message = curl_multi_info_read(multi, &left))) {
    if (message->msg != CURLMSG_DONE || message->easy_handle != easy) { finish("NET:failed"); return; }
    long status = 0, verify = 0; CURLcode rc = message->data.result;
    int info_ok = curl_easy_getinfo(easy, CURLINFO_RESPONSE_CODE, &status) == CURLE_OK && curl_easy_getinfo(easy, CURLINFO_SSL_VERIFYRESULT, &verify) == CURLE_OK;
    int valid = stage == 0 ? rc == CURLE_OK && status == 200 && verify == 0 && body_bytes > 0 :
      rc == CURLE_PEER_FAILED_VERIFICATION && status == 0 && body_bytes == 0 && (stage == 1 ? verify == 10 : stage == 2 ? strstr(error_buffer, "SSL: no alternative certificate subject name matches target hostname ") != NULL : verify == 18 || verify == 19);
    valid = valid && info_ok; if (!valid) failed = 1;
    printf("NET:tls:%s:%d:%d:%ld\n", names[stage], valid ? 0 : 1, (int)rc >= 0 && (int)rc <= 127 ? (int)rc : 127, verify >= 0 && verify <= 999 ? verify : 999); fflush(stdout);
    if (!release_easy()) { finish("NET:unclosed"); return; }
    if (++stage == 4) { finish(failed ? "NET:failed" : "NET:pass"); return; }
    if (!begin_case()) { finish("NET:failed"); return; }
  }
}
#ifdef __EMSCRIPTEN__
EMSCRIPTEN_KEEPALIVE
#endif
void network_validation_stop(void) { if (live) finish("NET:cancelled"); }
int main(void) {
  const curl_version_info_data *v = curl_version_info(CURLVERSION_NOW);
  if (!v || strcmp(v->version, "8.23.0") || !v->ssl_version || strncmp(v->ssl_version, "OpenSSL/3.5.9", 13) || strncmp(OpenSSL_version(OPENSSL_VERSION), "OpenSSL 3.5.9 ", 14)) { finish("NET:failed"); return 1; }
  line("NET:versions");
  unsigned char random[64] = {0}; int random_ok = RAND_bytes(random, sizeof(random)) == 1 && RAND_status() == 1;
  int nonzero = 0; for (size_t i = 0; i < sizeof(random); i++) nonzero |= random[i];
  random_ok = random_ok && nonzero && memcmp(random, random + 32, 32); OPENSSL_cleanse(random, sizeof(random));
  if (!random_ok) { finish("NET:failed"); return 1; } line("NET:random");
  if (curl_global_init(CURL_GLOBAL_DEFAULT) != CURLE_OK) { finish("NET:failed"); return 1; } initialized = 1;
  multi = curl_multi_init(); double now = clock_ms();
  if (!multi || now < 0 || !begin_case()) { finish("NET:failed"); return 1; }
  deadline = now + 36000; live = 1; line("NET:ready");
#ifdef __EMSCRIPTEN__
  emscripten_set_main_loop(tick, 20, 0);
#else
  while (live) { tick(); struct timespec pause = {0, 10000000}; nanosleep(&pause, NULL); }
#endif
  return 0;
}
