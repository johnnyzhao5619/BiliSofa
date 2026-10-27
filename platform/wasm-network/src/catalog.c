#include "service-config.h"
/* Original public catalog lane. No caller URL/header/authentication surface. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <curl/curl.h>
#include "probe-guest.h"
#include "catalog-categories.h"
static void catalog_ranking(void) {
  guest_reset(); guest_limit = BILISOFA_GUEST_MAX;
  guest_get(SERVICE_ADDRESS_A_E61A02296C1E, SERVICE_ADDRESS_A_B12964D8C1B1, 0);
}
/* 0.49.0 (ADR-096): public 番剧/国创 ranking. 0.50.0 (ADR-098) allows only season_type 1 (番剧) or
   4 (国创) and a 3- or 7-day window; the index lane sorts all time by followers, pages 1-5. */
static int catalog_pgc_type(const char *s) { return s && (!strcmp(s, "1") || !strcmp(s, "4")) ? s[0] - '0' : 0; }
static void catalog_pgc_ranking(int type, int day) {
  char url[128];
  snprintf(url, sizeof(url), SERVICE_ADDRESS_A_1A38FCE7AEBD, day, type);
  guest_reset(); guest_limit = BILISOFA_GUEST_MAX;
  guest_get(url, SERVICE_ADDRESS_A_B12964D8C1B1, 0);
}
static void catalog_pgc_index(int type, int page) {
  char url[192];
  snprintf(url, sizeof(url), SERVICE_ADDRESS_A_5D77BCB7DE30, type, page);
  guest_reset(); guest_limit = BILISOFA_GUEST_MAX;
  guest_get(url, SERVICE_ADDRESS_A_B12964D8C1B1, 0);
}
static void catalog_category(int id) {
  char url[128];
  snprintf(url, sizeof(url), SERVICE_ADDRESS_A_4FA2082A8383, id);
  guest_reset(); guest_limit = BILISOFA_GUEST_MAX;
  guest_get(url, SERVICE_ADDRESS_A_B12964D8C1B1, 0);
}
#ifndef CATALOG_NO_MAIN
int main(int argc, char **argv) {
  /* Referenced only to keep shared-header HOST warning checks meaningful.
     The optimized production WASM drops these uncalled static functions. */
  (void)guest_popular; (void)guest_video;
  if (argc == 2 && !strcmp(argv[1], "ranking")) { catalog_ranking(); return 0; }
  if (argc == 2 && !strcmp(argv[1], "pgc-ranking")) { catalog_pgc_ranking(1, 3); return 0; }
  if (argc == 4 && !strcmp(argv[1], "pgc-ranking") && catalog_pgc_type(argv[2]) && (!strcmp(argv[3], "3") || !strcmp(argv[3], "7"))) { catalog_pgc_ranking(catalog_pgc_type(argv[2]), argv[3][0] - '0'); return 0; }
  if (argc == 4 && !strcmp(argv[1], "pgc-index") && catalog_pgc_type(argv[2]) && strlen(argv[3]) == 1 && argv[3][0] >= '1' && argv[3][0] <= '5') { catalog_pgc_index(catalog_pgc_type(argv[2]), argv[3][0] - '0'); return 0; }
  if (argc == 3 && !strcmp(argv[1], "category-ranking")) {
    int id = catalog_category_id(argv[2]);
    if (id) { catalog_category(id); return 0; }
  }
  guest_reset(); puts("GUEST:closed"); fflush(stdout); return 1;
}
#endif
