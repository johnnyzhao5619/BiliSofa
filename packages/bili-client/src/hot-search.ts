import { DomainError, finite, record } from '../../contracts/src/index.ts';
import { parseHotSearchTerm, type HotSearchTerm } from '../../contracts/src/hot-search.ts';
/** Fixed public response. Ignore icons, destinations and tracking metadata. */
export function parseHotSearchBody(raw:string):{apiCode:number;items:HotSearchTerm[]} {
  if(new TextEncoder().encode(raw).length>65536)throw new DomainError('invalid');
  let value:unknown;try{value=JSON.parse(raw);}catch{throw new DomainError('invalid');}
  const root=record(value),apiCode=finite(root.code,-2147483648,2147483647);
  if(!Number.isInteger(apiCode))throw new DomainError('invalid');
  if(apiCode!==0)return {apiCode,items:[]};
  if(!Array.isArray(root.list)||root.list.length>10)throw new DomainError('invalid');
  const items:HotSearchTerm[]=[];let last=0;const seen=new Set<string>();
  for(const row of root.list){
    const v=record(row),rank=finite(v.pos,1,10);
    if(!Number.isInteger(rank)||rank<=last)throw new DomainError('invalid');last=rank;
    // Non-search destinations are deliberately not actionable in this feature.
    if(v.goto_type!==0)continue;
    const term=parseHotSearchTerm({rank,keyword:v.keyword,label:v.show_name});
    if(seen.has(term.keyword))throw new DomainError('invalid');seen.add(term.keyword);items.push(term);
  }
  return {apiCode,items};
}
