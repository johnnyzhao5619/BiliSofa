declare const BILISOFA_PRODUCT_SEASON:boolean;
/** 0.49.0 product season page, one-press 追番, 热门番剧 and rate probe v2 (ADR-096); older variants keep their frozen behaviour. */
export const PRODUCT_SEASON=typeof BILISOFA_PRODUCT_SEASON!=='undefined'&&BILISOFA_PRODUCT_SEASON;
declare const BILISOFA_SEASON_STATUS_READ:boolean;
/** 0.49.1: read the per-user follow status when the season page opens and word read-back mismatches. */
export const SEASON_STATUS_READ=typeof BILISOFA_SEASON_STATUS_READ!=='undefined'&&BILISOFA_SEASON_STATUS_READ;
