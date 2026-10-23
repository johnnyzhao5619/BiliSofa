import { DomainError, boundedMessage, finite, popularScope, type Scope, type PopularResult } from './index.ts';
import { parseSearchKeyword } from './search.ts';
export interface HotSearchTerm { rank:number; keyword:string; label:string; }
export interface HotSearchRequest { version:1; scope:Scope; operation:'public-search-hot'; }
export interface HotSearchResult { version:1; scope:Scope; operation:'public-search-hot'; closed:true; kind:PopularResult['kind']; status:number; apiCode?:number; code:string; items:HotSearchTerm[]; }
export function parseHotSearchTerm(value:unknown):HotSearchTerm {
  const v=boundedMessage(value),rank=finite(v.rank,1,10);
  if(Object.keys(v).length!==3||Object.keys(v).some(k=>!['rank','keyword','label'].includes(k))||!Number.isInteger(rank)||typeof v.label!=='string'||!v.label.length||Array.from(v.label).length>80||new TextEncoder().encode(v.label).length>320||/[\u0000-\u001f\u007f-\u009f\ud800-\udfff]/u.test(v.label))throw new DomainError('invalid');
  return {rank,keyword:parseSearchKeyword(v.keyword),label:v.label};
}
export function parseHotSearchRequest(value:unknown):HotSearchRequest {
  const v=boundedMessage(value);
  if(Object.keys(v).length!==3||Object.keys(v).some(k=>!['version','scope','operation'].includes(k))||v.version!==1||v.operation!=='public-search-hot')throw new DomainError('invalid');
  return {version:1,scope:popularScope(v.scope),operation:'public-search-hot'};
}
export function parseHotSearchResult(value:unknown):HotSearchResult {
  const v=boundedMessage(value),status=finite(v.status,0,599);
  if(Object.keys(v).some(k=>!['version','scope','operation','closed','kind','status','apiCode','code','items'].includes(k))||v.version!==1||v.operation!=='public-search-hot'||v.closed!==true||!Number.isInteger(status)||status!==0&&status<100||!['ok','http_error','api_error','invalid_response','transport_error','cancelled'].includes(String(v.kind))||typeof v.code!=='string'||!Array.isArray(v.items)||v.items.length>10||v.kind!=='ok'&&v.items.length)throw new DomainError('invalid');
  const items=v.items.map(parseHotSearchTerm);
  if(items.some((item,i)=>i>0&&item.rank<=items[i-1]!.rank)||new Set(items.map(i=>i.keyword)).size!==items.length)throw new DomainError('invalid');
  const apiCode=v.apiCode===undefined?undefined:finite(v.apiCode,-2147483648,2147483647);if(apiCode!==undefined&&!Number.isInteger(apiCode))throw new DomainError('invalid');
  if(v.kind==='ok'&&(status!==200||apiCode!==0||v.code!=='hot.ok'))throw new DomainError('invalid');
  if(v.kind==='http_error'&&(status===0||status===200||apiCode!==undefined||v.code!==`hot.http_${status}`))throw new DomainError('invalid');
  if(v.kind==='api_error'&&(status!==200||apiCode===undefined||apiCode===0||v.code!=='hot.api_error'))throw new DomainError('invalid');
  if(v.kind==='invalid_response'&&(apiCode!==undefined||v.code!=='hot.invalid_response'))throw new DomainError('invalid');
  if(v.kind==='transport_error'&&(apiCode!==undefined||!/^hot\.(transport_[0-9]{1,3}|native_unavailable)$/.test(v.code)))throw new DomainError('invalid');
  if(v.kind==='cancelled'&&(status!==0||apiCode!==undefined||v.code!=='hot.cancelled'))throw new DomainError('invalid');
  return {version:1,scope:popularScope(v.scope),operation:'public-search-hot',closed:true,kind:v.kind as HotSearchResult['kind'],status,...(apiCode===undefined?{}:{apiCode}),code:v.code,items};
}
