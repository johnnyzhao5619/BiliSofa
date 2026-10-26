import type {CoverReference} from './index.ts';
export interface WatchLaterQuery {page:number;}
export interface WatchLaterCard {cover?:CoverReference;bvid?:string;title:string;kind:'ugc'|'pgc'|'unknown';availability:'available'|'unavailable'|'unknown';partCount:number;}
export interface WatchLaterPage {page:number;items:WatchLaterCard[];noMore:boolean;total:number;skipped?:number;}
