/* ADR-105: signed-in reads of two public lists through the bounded account lane.
 * vod-api.c (TLS, two cookie jars, exact-identity nav, bounded close) is included
 * unchanged; only operations 0 (nav), 4 (one category ranking) and 5 (one page of
 * an UP's uploads) are allowed. No write, CDN, playurl or caller URL route. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "vod-source-policy.h"
#include "catalog-categories.h"
static int public_digits(const char *s, size_t max) {
  size_t n = s ? strlen(s) : 0;
  return n && n <= max && s[0] != '0' && strspn(s, "0123456789") == n;
}
static int public_extra_read(int operation, char *input, char *url, size_t capacity) {
  int n;
  if (operation == 4) {
    int id = catalog_category_id(input);
    if (!id) return 0;
    n = snprintf(url, capacity, "https://api.bilibili.com/x/web-interface/ranking/v2?rid=%d&type=all", id);
  } else if (operation == 5) {
    char *separator = strchr(input, '|');
    if (!separator || strchr(separator + 1, '|')) return 0;
    *separator++ = 0;
    if (!public_digits(input, 16) || strtoull(input, NULL, 10) > 9007199254740991ULL || !public_digits(separator, 2) || atoi(separator) > 50) return 0;
    n = snprintf(url, capacity, "https://api.bilibili.com/x/series/recArchivesByKeywords?mid=%s&keywords=&ps=30&pn=%s", input, separator);
  } else return 0;
  return n > 0 && (size_t)n < capacity;
}
#define BILISOFA_MAX_READ_OPERATION 5
#define BILISOFA_EXTRA_READ public_extra_read
#define BILISOFA_OPERATION_ALLOWED(operation) ((operation) == 0 || (operation) == 4 || (operation) == 5)
#include "vod-api.c"
