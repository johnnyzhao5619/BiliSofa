/** Per-track CDN failover to Bilibili's own playurl backup (ADR-101) and its candidate order (ADR-102).
 * Bilibili's Akamai mirror family exactly as returned in playurl backup_url; no other third-party host. */
export const AKAMAI_BACKUP_HOST=/^upos-[a-z0-9]{1,16}-mirrorakam\.akamaized\.net$/;
/** Fixed CDN host classes; the only host fact that leaves the media Worker. */
export const CDN_CLASSES=['upos','akamai','edge'] as const;
export type CdnClass=typeof CDN_CLASSES[number];
export const cdnClassBit=(c:CdnClass)=>1<<CDN_CLASSES.indexOf(c);
