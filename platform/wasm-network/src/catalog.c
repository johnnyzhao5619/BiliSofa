/* Original public catalog lane. No caller URL/header/authentication surface. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <curl/curl.h>
#include "probe-guest.h"
#include "catalog-categories.h"
static void catalog_ranking(void) {
  guest_reset(); guest_limit = BILISOFA_GUEST_MAX;
  guest_get("https://api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all", "https://www.bilibili.com/", 0);
}
static void catalog_category(int id) {
  char url[128];
  snprintf(url, sizeof(url), "https://api.bilibili.com/x/web-interface/ranking/v2?rid=%d&type=all", id);
  guest_reset(); guest_limit = BILISOFA_GUEST_MAX;
  guest_get(url, "https://www.bilibili.com/", 0);
}
#ifndef CATALOG_NO_MAIN
int main(int argc, char **argv) {
  /* Referenced only to keep shared-header HOST warning checks meaningful.
     The optimized production WASM drops these uncalled static functions. */
  (void)guest_popular; (void)guest_video;
  if (argc == 2 && !strcmp(argv[1], "ranking")) { catalog_ranking(); return 0; }
  if (argc == 3 && !strcmp(argv[1], "category-ranking")) {
    int id = catalog_category_id(argv[2]);
    if (id) { catalog_category(id); return 0; }
  }
  guest_reset(); puts("GUEST:closed"); fflush(stdout); return 1;
}
#endif
