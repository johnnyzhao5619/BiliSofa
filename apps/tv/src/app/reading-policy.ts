declare const BILISOFA_PRODUCT_READING:boolean;
/** 0.47.0 search/reading/resume (ADR-092/093); older variants keep their frozen behaviour. */
export const PRODUCT_READING=typeof BILISOFA_PRODUCT_READING!=='undefined'&&BILISOFA_PRODUCT_READING;
declare const BILISOFA_READING_FIX:boolean;
/** 0.47.1 device-feedback fixes ride on PRODUCT_READING; this flag only labels the build. */
export const READING_FIX=typeof BILISOFA_READING_FIX!=='undefined'&&BILISOFA_READING_FIX;
