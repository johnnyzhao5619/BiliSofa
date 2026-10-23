/* Original W01 candidate self-test. No network, account data or entropy output. */
#include <stdio.h>
#include <string.h>
#include <curl/curl.h>
#include <openssl/crypto.h>
#include <openssl/rand.h>

int main(void) {
  const curl_version_info_data *v = curl_version_info(CURLVERSION_NOW);
  int protocols = 0;
  if (!v || strcmp(v->version, "8.23.0") || !v->ssl_version ||
      strncmp(v->ssl_version, "OpenSSL/3.5.9", 13) ||
      strncmp(OpenSSL_version(OPENSSL_VERSION), "OpenSSL 3.5.9 ", 14)) return 1;
  for (const char * const *p = v->protocols; p && *p; p++) {
    if (strcmp(*p, "http") && strcmp(*p, "https")) return 2;
    protocols++;
  }
  if (protocols != 2) return 3;
  puts("DEPS:versions_protocols_pass"); fflush(stdout);
  unsigned char bytes[64] = {0};
  if (RAND_bytes(bytes, sizeof(bytes)) != 1 || RAND_status() != 1) return 4;
  int nonzero = 0;
  for (size_t i = 0; i < sizeof(bytes); i++) nonzero |= bytes[i];
  int repeated = !memcmp(bytes, bytes + 32, 32);
  OPENSSL_cleanse(bytes, sizeof(bytes));
  if (!nonzero || repeated) return 5;
  /* Sanity and fail-closed plumbing only, not a statistical randomness proof. */
  puts("DEPS:crypto_random_pass"); fflush(stdout);
  if (curl_global_init(CURL_GLOBAL_DEFAULT) != CURLE_OK) return 6;
  CURL *a = curl_easy_init(), *b = curl_easy_init();
  CURLM *multi = curl_multi_init();
  int ok = a && b && multi;
  if (ok) ok = curl_easy_setopt(a, CURLOPT_PROXY, "") == CURLE_OK &&
      curl_easy_setopt(a, CURLOPT_COOKIEFILE, "") == CURLE_OK &&
      curl_easy_setopt(b, CURLOPT_COOKIEFILE, "") == CURLE_OK &&
      curl_easy_setopt(a, CURLOPT_PROTOCOLS_STR, "https") == CURLE_OK &&
      curl_easy_setopt(a, CURLOPT_REDIR_PROTOCOLS_STR, "https") == CURLE_OK &&
      curl_easy_setopt(a, CURLOPT_FOLLOWLOCATION, 0L) == CURLE_OK;
  if (ok) { puts("DEPS:scoped_options_pass"); fflush(stdout); }
  if (a) curl_easy_cleanup(a);
  if (b) curl_easy_cleanup(b);
  if (multi && curl_multi_cleanup(multi) != CURLM_OK) ok = 0;
  curl_global_cleanup(); OPENSSL_cleanup();
  if (!ok) return 7;
  puts("DEPS:selftest_complete_no_network"); fflush(stdout);
  return 0;
}
