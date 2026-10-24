/* ADR-103: the public catalog lane plus one fixed public UP-archives read (the
 * official web series search with empty keywords: newest first, 30 per page).
 * catalog.c stays frozen; this entry repeats its route table unchanged and adds
 * `up-archives <mid> <page>` only. No caller URL/header/authentication surface. */
#define CATALOG_NO_MAIN
#include "catalog.c"
static int catalog_up_mid(const char *s) {
  size_t n = s ? strlen(s) : 0;
  if (!n || n > 16 || s[0] == '0' || strspn(s, "0123456789") != n) return 0;
  return strtoull(s, NULL, 10) <= 9007199254740991ULL;
}
static int catalog_up_page(const char *s) {
  size_t n = s ? strlen(s) : 0;
  if (!n || n > 2 || s[0] == '0' || strspn(s, "0123456789") != n) return 0;
  int page = atoi(s);
  return page >= 1 && page <= 50 ? page : 0;
}
static void catalog_up_archives(const char *mid, int page) {
  char url[160];
  snprintf(url, sizeof(url), "https://api.bilibili.com/x/series/recArchivesByKeywords?mid=%s&keywords=&ps=30&pn=%d", mid, page);
  guest_reset(); guest_limit = BILISOFA_GUEST_MAX;
  guest_get(url, "https://space.bilibili.com/", 0);
}
int main(int argc, char **argv) {
  (void)guest_popular; (void)guest_video;
  if (argc == 4 && !strcmp(argv[1], "up-archives") && catalog_up_mid(argv[2]) && catalog_up_page(argv[3])) { catalog_up_archives(argv[2], catalog_up_page(argv[3])); return 0; }
  /* Unchanged route table of catalog.c. */
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
