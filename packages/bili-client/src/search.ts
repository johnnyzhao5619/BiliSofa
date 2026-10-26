import {publicArtwork} from './public-artwork.ts';
import { DomainError, finite, record, text, type PopularCard } from '../../contracts/src/index.ts';
import { clockSeconds, eachRow, line } from './list-rows.ts';
import type { SearchResponseIssue } from '../../contracts/src/search.ts';
/** A fixed field category, never outside text, data values or parser messages. */
export class SearchBodyError extends DomainError {
  constructor(readonly issue:SearchResponseIssue){super('invalid');}
}
/** Exact known highlight tags only; all remaining markup is inert display text. */
export function searchTitle(value:unknown):string {
  return text(value,1024).replace(/<em class="keyword">|<\/em>/g,'').slice(0,120);
}
/** `rows` is the requested page_size: 4, or 20 for an ADR-108 kernel batch (pages 1-5). */
export function parseSearchBody(raw:string,page:number,rows:4|20=4):{apiCode:number;items:PopularCard[];noMore:boolean;skipped?:number} {
  let issue:SearchResponseIssue='body';
  try {
  if(!Number.isInteger(page)||page<1||page>(rows===4?10:5)||new TextEncoder().encode(raw).length>524288)throw new DomainError('invalid');
  issue='json';
  let parsed:unknown;try{parsed=JSON.parse(raw);}catch{throw new DomainError('invalid');}
  issue='envelope';
  const root=record(parsed),apiCode=finite(root.code,-2147483648,2147483647);if(!Number.isInteger(apiCode))throw new DomainError('invalid');
  if(apiCode!==0)return {apiCode,items:[],noMore:true};
  const data=record(root.data);issue='pagination';
  const pages=finite(data.numPages,0,1000000),total=finite(data.numResults,0,Number.MAX_SAFE_INTEGER);
  if(data.page!==page || data.pagesize!==rows || !Number.isInteger(pages)||!Number.isInteger(total) || (total===0)!==(pages===0) || total>0&&pages<page)throw new DomainError('invalid');
  // Public service may omit result only for the explicit zero-result response.
  const list=data.result===undefined&&total===0?[]:data.result;
  issue='rows';
  if(!Array.isArray(list)||list.length>rows||total===0&&list.length)throw new DomainError('invalid');
  const seen=new Set<string>();
  // Video search mixes in other row kinds (e.g. paid courses, type "ketang", without a BV id).
  // They are skipped, not fatal: failing the page made common short keywords look empty.
  // ADR-111: a row with an unreadable type, identity or title is skipped and counted; a malformed or
  // over-24-h duration shows as unknown (0); unreadable views show as none.
  let malformed=0;
  const videos=list.filter(item=>{const v=item!==null&&typeof item==='object'?item as Record<string,unknown>:undefined;if(!v||typeof v.type!=='string'||!/^[a-z_]{1,32}$/.test(v.type)){malformed++;return false;}return v.type==='video';});
  if(malformed&&malformed===list.length)throw new DomainError('invalid');
  const {items,skipped}=eachRow(videos,item=>{
    const v=record(item),bvid=v.bvid;
    if(typeof bvid!=='string'||!/^BV[A-Za-z0-9]{10}$/.test(bvid)||seen.has(bvid))return undefined;
    const title=searchTitle(line(v.title,1024)),owner=line(v.author,48);if(!title.length||!owner)return undefined;seen.add(bvid);
    const views=Number.isSafeInteger(v.play)&&(v.play as number)>=0?v.play as number:0;
    const cover=publicArtwork(v.pic);return {bvid,title,owner,durationSec:clockSeconds(v.duration),views,...(cover?{cover}:{})};
  });
  issue='rows';
  return {apiCode,items,noMore:page>=Math.min(pages,rows===4?10:5)||list.length===0,...(skipped+malformed?{skipped:skipped+malformed}:{})};
  } catch { throw new SearchBodyError(issue); }
}
