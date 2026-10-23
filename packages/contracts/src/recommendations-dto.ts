import type {CoverReference} from './index.ts';
export interface RecommendationCard {bvid:string;title:string;author:string;durationSeconds:number;reason:string;cover?:CoverReference;}
export interface RecommendationQuery {page:number;refresh?:true;}
export interface RecommendationPage {page:number;firstPage:number;items:RecommendationCard[];noMore:boolean;omitted:number;}
