import {DomainError,finite,record} from '../../contracts/src/index.ts';
import {parsePgcSearchCard,type PgcSearchCard} from '../../contracts/src/pgc-search.ts';
import type {SearchResponseIssue} from '../../contracts/src/search.ts';
import {SearchBodyError,searchTitle} from './search.ts';
import {eachRow,line} from './list-rows.ts';
export function parsePgcSearchBody(raw:string,page:number,size:4|20=4):{apiCode:number;items:PgcSearchCard[];noMore:boolean;skipped?:number}{
 let issue:SearchResponseIssue='body';
 try{
  if(!Number.isInteger(page)||page<1||page>(size===4?10:5)||new TextEncoder().encode(raw).length>524288)throw new DomainError('invalid');
  issue='json';const root=record(JSON.parse(raw));issue='envelope';const apiCode=finite(root.code,-2147483648,2147483647);if(!Number.isInteger(apiCode))throw new DomainError('invalid');
  if(apiCode!==0)return {apiCode,items:[],noMore:true};const data=record(root.data);issue='pagination';
  const pages=finite(data.numPages,0,1000000),total=finite(data.numResults,0,Number.MAX_SAFE_INTEGER);
  if(data.page!==page||data.pagesize!==size||!Number.isInteger(pages)||!Number.isInteger(total)||(total===0)!==(pages===0)||total>0&&pages<page)throw new DomainError('invalid');
  issue='rows';const rows=data.result===undefined&&total===0?[]:data.result;if(!Array.isArray(rows)||rows.length>size||total===0&&rows.length)throw new DomainError('invalid');
  // ADR-111: an unreadable season row is skipped and counted; unreadable labels or score are left out.
  const seen=new Set<string>();const {items,skipped}=eachRow(rows,row=>{
   const v=record(row);if(v.type!=='media_bangumi')return undefined;
   const id=v.season_id;if(typeof id!=='number'||!Number.isSafeInteger(id)||id<1||seen.has(String(id)))return undefined;
   const title=searchTitle(line(v.title,1024));if(!title.length)return undefined;
   const category=line(v.season_type_name,16),region=line(v.areas,32),tags=line(v.styles,32),status=line(v.index_show,48);
   const rating=v.media_score!==null&&typeof v.media_score==='object'?(v.media_score as Record<string,unknown>).score:undefined;
   const score=typeof rating==='number'&&Number.isFinite(rating)&&rating>=0&&rating<=10?rating:undefined;
   // Do not copy eps, follow flags, URLs, covers or staff/description blobs.
   const card=parsePgcSearchCard({seasonId:String(id),title,category,region,tags,status,...(score===undefined?{}:{score})});seen.add(String(id));return card;
  });issue='rows';return {apiCode,items,noMore:page>=Math.min(pages,size===4?10:5)||items.length===0,...(skipped?{skipped}:{})};
 }catch{throw new SearchBodyError(issue);}
}
