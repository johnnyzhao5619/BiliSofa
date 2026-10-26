/* ADR-112 VOD source module: the ADR-102 failover module plus parallel video/audio
 * source checks (vod-source-pair.h). vod-api.c and vod-api-failover.c stay unchanged;
 * vod_begin refuses while a check pair runs, and the pair header brings the main loop. */
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
#include "vod-api.c"
#include "vod-source-pair.h"
