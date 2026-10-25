import {DomainError,finite,record,text} from '../../contracts/src/index.ts';
import {parsePgcSearchCard,type PgcSearchCard} from '../../contracts/src/pgc-search.ts';
import type {SearchResponseIssue} from '../../contracts/src/search.ts';
import {SearchBodyError,searchTitle} from './search.ts';
export function parsePgcSearchBody(raw:string,page:number,size:4|20=4):{apiCode:number;items:PgcSearchCard[];noMore:boolean}{
 let issue:SearchResponseIssue='body';
 try{
  if(!Number.isInteger(page)||page<1||page>(size===4?10:5)||new TextEncoder().encode(raw).length>524288)throw new DomainError('invalid');
  issue='json';const root=record(JSON.parse(raw));issue='envelope';const apiCode=finite(root.code,-2147483648,2147483647);if(!Number.isInteger(apiCode))throw new DomainError('invalid');
  if(apiCode!==0)return {apiCode,items:[],noMore:true};const data=record(root.data);issue='pagination';
  const pages=finite(data.numPages,0,1000000),total=finite(data.numResults,0,Number.MAX_SAFE_INTEGER);
  if(data.page!==page||data.pagesize!==size||!Number.isInteger(pages)||!Number.isInteger(total)||(total===0)!==(pages===0)||total>0&&pages<page)throw new DomainError('invalid');
  issue='rows';const rows=data.result===undefined&&total===0?[]:data.result;if(!Array.isArray(rows)||rows.length>size||total===0&&rows.length)throw new DomainError('invalid');
  const seen=new Set<string>();const items=rows.map(row=>{
   issue='rows';const v=record(row);issue='type';if(v.type!=='media_bangumi')throw new DomainError('invalid');
   issue='identity';const id=finite(v.season_id,1,Number.MAX_SAFE_INTEGER);if(!Number.isInteger(id)||seen.has(String(id)))throw new DomainError('invalid');seen.add(String(id));
   issue='text';const title=searchTitle(v.title);if(!title.length)throw new DomainError('invalid');
   issue='metadata';const label=(v:unknown,max:number)=>v===undefined||v===null||v===''?'':text(v,2048).slice(0,max);
   const category=label(v.season_type_name,16),region=label(v.areas,32),tags=label(v.styles,32),status=label(v.index_show,48);
   issue='score';let score:number|undefined;if(v.media_score!==undefined&&v.media_score!==null){const rating=record(v.media_score);if(rating.score!==undefined)score=finite(rating.score,0,10);}
   // Do not copy eps, follow flags, URLs, covers or staff/description blobs.
   return parsePgcSearchCard({seasonId:String(id),title,category,region,tags,status,...(score===undefined?{}:{score})});
  });return {apiCode,items,noMore:page>=Math.min(pages,size===4?10:5)||items.length===0};
 }catch{throw new SearchBodyError(issue);}
}
