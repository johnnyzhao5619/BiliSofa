/* ADR-102 PGC source module for the failover path. pgc-read.c (and the vod-api.c
 * it includes) stay unchanged; only the CDN destination rule also admits
 * Bilibili's Akamai backup family (vod-cdn-policy.h) for the source check. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "vod-source-policy.h"
#include "vod-cdn-policy.h"
#include "pgc-read.c"
