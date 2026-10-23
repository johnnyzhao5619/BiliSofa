declare const BILISOFA_CDN_FAILOVER:boolean;
declare const BILISOFA_SOURCE_FAILOVER:boolean;
/** 0.50.3 per-track CDN failover to Bilibili's own playurl backup (ADR-101); older variants keep their frozen single-host behaviour. */
export const CDN_FAILOVER=typeof BILISOFA_CDN_FAILOVER!=='undefined'&&BILISOFA_CDN_FAILOVER;
/** Bilibili's Akamai mirror family exactly as returned in playurl backup_url; no other third-party host. */
export const AKAMAI_BACKUP_HOST=/^upos-[a-z0-9]{1,16}-mirrorakam\.akamaized\.net$/;
/** 0.50.4 (ADR-102): Bilibili's candidate order, source-check failover and run-level host-class avoidance. */
export const SOURCE_FAILOVER=typeof BILISOFA_SOURCE_FAILOVER!=='undefined'&&BILISOFA_SOURCE_FAILOVER;
/** Fixed CDN host classes; the only host fact that leaves the media Worker. */
export const CDN_CLASSES=['upos','akamai','edge'] as const;
export type CdnClass=typeof CDN_CLASSES[number];
export const cdnClassBit=(c:CdnClass)=>1<<CDN_CLASSES.indexOf(c);
