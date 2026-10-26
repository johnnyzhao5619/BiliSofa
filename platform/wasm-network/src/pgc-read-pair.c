/* ADR-112 PGC source module: the ADR-102 failover module plus parallel video/audio
 * source checks (vod-source-pair.h). pgc-read.c, vod-api.c and pgc-read-failover.c
 * stay unchanged; vod_begin refuses while a check pair runs. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "vod-source-policy.h"
#include "vod-cdn-policy.h"
#define VOD_API_NO_MAIN
static int vod_pair_active;
static void vod_pair_cleanup(void);
#define BILISOFA_EXTRA_CLEANUP vod_pair_cleanup
#define BILISOFA_OPERATION_ALLOWED(operation) (!vod_pair_active)
#include "pgc-read.c"
#include "vod-source-pair.h"
