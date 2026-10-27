#include "service-config.h"
/* ADR-105: signed-in reads of two public lists through the bounded account lane.
 * vod-api.c (TLS, two cookie jars, exact-identity nav, bounded close) is included
 * unchanged; only operations 0 (nav), 4 (one category ranking), 5 (one page of
 * an UP's uploads) and 6 (the 全站排行, input `all`; 0.65.0 ADR-117) are allowed.
 * No write, CDN, playurl or caller URL route. */
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
    n = snprintf(url, capacity, SERVICE_ADDRESS_A_4FA2082A8383, id);
  } else if (operation == 5) {
    char *separator = strchr(input, '|');
    if (!separator || strchr(separator + 1, '|')) return 0;
    *separator++ = 0;
    if (!public_digits(input, 16) || strtoull(input, NULL, 10) > 9007199254740991ULL || !public_digits(separator, 2) || atoi(separator) > 50) return 0;
    n = snprintf(url, capacity, SERVICE_ADDRESS_A_B6F25B647450, input, separator);
  } else if (operation == 6) {
    if (strcmp(input, "all")) return 0;
    n = snprintf(url, capacity, SERVICE_ADDRESS_A_E61A02296C1E);
  } else return 0;
  return n > 0 && (size_t)n < capacity;
}
#define BILISOFA_MAX_READ_OPERATION 6
#define BILISOFA_EXTRA_READ public_extra_read
#define BILISOFA_OPERATION_ALLOWED(operation) ((operation) == 0 || (operation) == 4 || (operation) == 5 || (operation) == 6)
#include "vod-api.c"
