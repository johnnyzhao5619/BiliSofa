import {DomainError,boundedMessage,finite,popularScope,text,type Scope} from './index.ts';
import {parseSearchRequest,parseSearchOutcome,type PublicSearchOutcome} from './search.ts';
/** Search summaries only; no source URL, entitlement, followed state or episode list. */
export interface PgcSearchCard {seasonId:string;title:string;category:string;region:string;tags:string;status:string;score?:number;}
export interface PgcSearchRequest {version:1;scope:Scope;operation:'public-pgc-search';keyword:string;page:number;}
export interface PgcSearchResult extends PublicSearchOutcome {version:1;scope:Scope;operation:'public-pgc-search';closed:true;items:PgcSearchCard[];noMore:boolean;}
export function parsePgcSearchCard(value:unknown):PgcSearchCard {
 const v=boundedMessage(value),seasonId=text(v.seasonId,16),title=text(v.title,120);
 if(Object.keys(v).some(k=>!['seasonId','title','category','region','tags','status','score'].includes(k))||!/^\d{1,16}$/.test(seasonId)||seasonId.startsWith('0')||BigInt(seasonId)>9007199254740991n)throw new DomainError('invalid');
 const optional=(v:unknown,max:number)=>v===''?'':text(v,max);
 const score=v.score===undefined?undefined:finite(v.score,0,10);
 return {seasonId,title,category:optional(v.category,16),region:optional(v.region,32),tags:optional(v.tags,32),status:optional(v.status,48),...(score===undefined?{}:{score})};
}
export function parsePgcSearchRequest(value:unknown):PgcSearchRequest {
 const v=boundedMessage(value);if(v.operation!=='public-pgc-search')throw new DomainError('invalid');
 return {...parseSearchRequest({...v,operation:'public-video-search'}),operation:'public-pgc-search'};
}
export function parsePgcSearchResult(value:unknown):PgcSearchResult {
 const v=boundedMessage(value),outcome=parseSearchOutcome(v,'pgc');
 if(Object.keys(v).some(k=>!['version','scope','operation','closed','kind','status','apiCode','code','items','noMore'].includes(k))||v.version!==1||v.operation!=='public-pgc-search'||v.closed!==true||!Array.isArray(v.items)||v.items.length>4||typeof v.noMore!=='boolean'||v.kind!=='ok'&&(v.items.length||!v.noMore))throw new DomainError('invalid');
 const items=v.items.map(parsePgcSearchCard);if(new Set(items.map(i=>i.seasonId)).size!==items.length)throw new DomainError('invalid');
 return {version:1,scope:popularScope(v.scope),operation:'public-pgc-search',closed:true,...outcome,items,noMore:v.noMore};
}
