import {publicArtwork} from './public-artwork.ts';
import { DomainError, finite, record, text, type PopularCard } from '../../contracts/src/index.ts';
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
export function parseSearchBody(raw:string,page:number,rows:4|20=4):{apiCode:number;items:PopularCard[];noMore:boolean} {
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
  const items=list.filter(item=>{issue='rows';const v=record(item);issue='type';if(typeof v.type!=='string'||!/^[a-z_]{1,32}$/.test(v.type))throw new DomainError('invalid');return v.type==='video';}).map(item=>{
    issue='rows';const v=record(item);
    issue='identity';const bvid=text(v.bvid,12);
    if(!/^BV[A-Za-z0-9]{10}$/.test(bvid)||seen.has(bvid))throw new DomainError('invalid');seen.add(bvid);
    issue='duration';const duration=text(v.duration,10);
    // Official search SSR uses both 5:8 and 5:08. Seconds remain strictly 0–59.
    if(!/^\d{1,4}:[0-5]?\d$/.test(duration))throw new DomainError('invalid');
    const [minutes,seconds]=duration.split(':').map(Number),durationSec=minutes!*60+seconds!;
    if(durationSec>86400)throw new DomainError('invalid');
    issue='views';const views=finite(v.play,0,Number.MAX_SAFE_INTEGER);
    if(!Number.isInteger(views))throw new DomainError('invalid');
    issue='text';
    const title=searchTitle(v.title);if(!title.length)throw new DomainError('invalid');
    const cover=publicArtwork(v.pic);return {bvid,title,owner:text(v.author,128).slice(0,48),durationSec,views,...(cover?{cover}:{})};
  });
  return {apiCode,items,noMore:page>=Math.min(pages,rows===4?10:5)||list.length===0};
  } catch { throw new SearchBodyError(issue); }
}
