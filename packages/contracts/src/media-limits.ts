/** ADR-115: one bound for media time everywhere (lists, detail, player, overlays, local records). Seven days covers the
 * long recordings on the site while keeping parsing bounded: the millisecond value stays below C's 32-bit unsigned
 * limit (about 49.7 days) and is a safe JS integer. Cast keeps its own 24-hour bounds (ADR-115 decision 5). */
export const MAX_MEDIA_SECONDS = 604800;
export const MAX_MEDIA_MS = MAX_MEDIA_SECONDS * 1000;
/** Danmaku segments are six minutes long, so seven days need 1680 of them. */
export const MAX_DANMAKU_SEGMENT = MAX_MEDIA_SECONDS / 360;
