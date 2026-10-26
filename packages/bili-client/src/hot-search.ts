import { DomainError, finite, record } from '../../contracts/src/index.ts';
import { parseHotSearchTerm, type HotSearchTerm } from '../../contracts/src/hot-search.ts';
/** Fixed public response. Ignore icons, destinations and tracking metadata. */
export function parseHotSearchBody(raw:string):{apiCode:number;items:HotSearchTerm[];skipped?:number} {
  if(new TextEncoder().encode(raw).length>65536)throw new DomainError('invalid');
  let value:unknown;try{value=JSON.parse(raw);}catch{throw new DomainError('invalid');}
  const root=record(value),apiCode=finite(root.code,-2147483648,2147483647);
  if(!Number.isInteger(apiCode))throw new DomainError('invalid');
  if(apiCode!==0)return {apiCode,items:[]};
  if(!Array.isArray(root.list)||root.list.length>10)throw new DomainError('invalid');
  // ADR-111: an unreadable, out-of-order or repeated term is skipped and counted; kept ranks stay the source's.
  const items:HotSearchTerm[]=[];let last=0,skipped=0,other=0;const seen=new Set<string>();
  for(const row of root.list){
    const v=row!==null&&typeof row==='object'?row as Record<string,unknown>:{},rank=v.pos;
    if(typeof rank!=='number'||!Number.isInteger(rank)||rank<1||rank>10||rank<=last){skipped++;continue;}
    // Non-search destinations are deliberately not actionable in this feature.
    if(v.goto_type!==0){last=rank;other++;continue;}
    let term:HotSearchTerm;try{term=parseHotSearchTerm({rank,keyword:v.keyword,label:v.show_name});}catch(error){if(!(error instanceof DomainError))throw error;skipped++;continue;}
    if(seen.has(term.keyword)){skipped++;continue;}last=rank;seen.add(term.keyword);items.push(term);
  }
  if(skipped&&!items.length&&!other)throw new DomainError('invalid');
  return {apiCode,items,...(skipped?{skipped}:{})};
}
