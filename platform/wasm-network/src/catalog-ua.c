/* ADR-104: catalog-up with the TV web runtime's own User-Agent. B站 risk control
 * answers category rankings with -352 for the custom probe identifier; the Tizen
 * runtime string (what this TV's browser engine itself sends) is accepted.
 * catalog-up.c (and catalog.c, probe-guest.h) stay frozen: this entry only
 * substitutes the CURLOPT_USERAGENT value when `--ua=<value>` comes first.
 * The value is validated here (8-400 printable ASCII); anything else is refused. */
#define CURL_DISABLE_TYPECHECK
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <curl/curl.h>
static const char *catalog_agent;
/* The real function is called through (curl_easy_setopt)(...), which no function-like macro expands. */
#undef curl_easy_setopt
#define curl_easy_setopt(handle, option, value) ((option) == CURLOPT_USERAGENT && catalog_agent ? (curl_easy_setopt)(handle, option, catalog_agent) : (curl_easy_setopt)(handle, option, value))
#ifdef main
#define CATALOG_UA_OUTER_MAIN
#pragma push_macro("main")
#undef main
#endif
#define main catalog_up_main
#include "catalog-up.c"
#undef main
#ifdef CATALOG_UA_OUTER_MAIN
#pragma pop_macro("main")
#endif
static int catalog_agent_valid(const char *s) {
  size_t n = s ? strlen(s) : 0;
  if (n < 8 || n > 400) return 0;
  for (size_t i = 0; i < n; i++) if ((unsigned char)s[i] < 0x20 || (unsigned char)s[i] > 0x7e) return 0;
  return 1;
}
int main(int argc, char **argv) {
  if (argc >= 2 && !strncmp(argv[1], "--ua=", 5)) {
    if (!catalog_agent_valid(argv[1] + 5)) { guest_reset(); puts("GUEST:closed"); fflush(stdout); return 1; }
    catalog_agent = argv[1] + 5; argv[1] = argv[0];
    return catalog_up_main(argc - 1, argv + 1);
  }
  return catalog_up_main(argc, argv);
}
