/* Fixed official PGC read routes. Shares the bounded TLS/two-jar/close engine;
 * this translation unit adds no account write, DRM or generic URL entry. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "vod-source-policy.h"
static int pgc_extra_read(int operation, char *input, char *url, size_t capacity) {
  int n;
  if (operation == 4) {
    if (!guest_cid_valid(input)) return 0;
    n = snprintf(url, capacity, "https://api.bilibili.com/pgc/view/web/season?season_id=%s", input);
  } else if (operation == 5) {
    char *separator = strchr(input, '|');
    if (!separator || strchr(separator + 1, '|')) return 0;
    *separator++ = 0;
    if (!guest_cid_valid(input) || !guest_cid_valid(separator)) return 0;
    n = snprintf(url, capacity, "https://api.bilibili.com/pgc/player/web/playurl?cid=%s&ep_id=%s&fnval=4048&fnver=0&fourk=1&qn=127", separator, input);
  } else return 0;
  return n > 0 && (size_t)n < capacity;
}
#define BILISOFA_MAX_READ_OPERATION 5
#define BILISOFA_EXTRA_READ pgc_extra_read
#include "vod-api.c"
