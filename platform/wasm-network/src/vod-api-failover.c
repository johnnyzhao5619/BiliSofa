/* ADR-102 source module for the failover path. vod-api.c is included unchanged;
 * only the CDN destination rule also admits Bilibili's Akamai backup family
 * (vod-cdn-policy.h), so the 512-byte source check can read either line. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "vod-source-policy.h"
#include "vod-cdn-policy.h"
#include "vod-api.c"
