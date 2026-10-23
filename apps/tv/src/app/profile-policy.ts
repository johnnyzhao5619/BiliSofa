declare const BILISOFA_PRODUCT_PROFILES:boolean;
/** 0.50.0 launch account chooser and 热门番剧 filters (ADR-098/099); older variants keep their frozen behaviour. */
export const PRODUCT_PROFILES=typeof BILISOFA_PRODUCT_PROFILES!=='undefined'&&BILISOFA_PRODUCT_PROFILES;
declare const BILISOFA_PROFILES_FIX:boolean;
/** 0.50.1 labels the build; its chooser style and failure note ride on PRODUCT_PROFILES. */
export const PROFILES_FIX=typeof BILISOFA_PROFILES_FIX!=='undefined'&&BILISOFA_PROFILES_FIX;
