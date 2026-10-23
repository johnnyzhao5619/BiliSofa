import type {CoverReference} from './index.ts';
export interface HistoryQuery {page:number;refresh?:true;}
export interface HistoryCard {cover?:CoverReference;bvid?:string;title:string;kind:'ugc'|'pgc'|'live'|'article'|'course'|'unknown';viewedAtSec:number;progressSec:number|null;durationSec:number|null;part:number|null;}
export interface HistoryPage {page:number;items:HistoryCard[];noMore:boolean;}
