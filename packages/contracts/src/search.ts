import { DomainError, boundedMessage, finite, popularScope, parsePopularCard, type Scope, type PopularCard, type PopularResult } from './index.ts';
export function parseSearchKeyword(value: unknown): string {
  if(typeof value!=='string' || !value.length || value.trim()!==value || Array.from(value).length>32 || new TextEncoder().encode(value).length>128 || /[\u0000-\u001f\u007f-\u009f\ud800-\udfff]/u.test(value))throw new DomainError('invalid');
  return value;
}
export interface SearchRequest { version:1; scope:Scope; operation:'public-video-search'; keyword:string; page:number; }
export const SEARCH_RESPONSE_ISSUES=['body','json','envelope','pagination','rows','type','identity','duration','views','text','native','utf8','public_keys','signing_keyword','counts','preview','metadata','score','state'] as const;
export type SearchResponseIssue=typeof SEARCH_RESPONSE_ISSUES[number];
export interface SearchResult { version:1; scope:Scope; operation:'public-video-search'; closed:true; kind:PopularResult['kind']; status:number; apiCode?:number; code:string; items:PopularCard[]; noMore:boolean; }
export function parseSearchRequest(value:unknown):SearchRequest {
  const v=boundedMessage(value),page=finite(v.page,1,10);
  if(Object.keys(v).length!==5 || Object.keys(v).some(k=>!['version','scope','operation','keyword','page'].includes(k)) || v.version!==1 || v.operation!=='public-video-search' || !Number.isInteger(page))throw new DomainError('invalid');
  return {version:1,scope:popularScope(v.scope),operation:'public-video-search',keyword:parseSearchKeyword(v.keyword),page};
}
export type PublicSearchOutcome=Pick<SearchResult,'kind'|'status'|'apiCode'|'code'>;
export function parseSearchOutcome(v:Record<string,unknown>,prefix:'search'|'up'|'pgc'|'live'):PublicSearchOutcome {
  const status=finite(v.status,0,599);
  if(!Number.isInteger(status)||status!==0&&status<100||!['ok','http_error','api_error','invalid_response','transport_error','cancelled'].includes(String(v.kind))||typeof v.code!=='string')throw new DomainError('invalid');
  const apiCode=v.apiCode===undefined?undefined:finite(v.apiCode,-2147483648,2147483647);if(apiCode!==undefined&&!Number.isInteger(apiCode))throw new DomainError('invalid');
  if(v.kind==='ok'&&(status!==200||apiCode!==0||v.code!==prefix+'.ok'))throw new DomainError('invalid');
  if(v.kind==='http_error'&&(status===0||status===200||apiCode!==undefined||![`${prefix}.http_${status}`,`${prefix}.nav_http_${status}`].includes(v.code)))throw new DomainError('invalid');
  if(v.kind==='api_error'&&(status!==200||apiCode===undefined||apiCode===0||v.code!==prefix+'.api_error'))throw new DomainError('invalid');
  if(v.kind==='invalid_response'&&(apiCode!==undefined||v.code!==prefix+'.invalid_response'&&!(SEARCH_RESPONSE_ISSUES as readonly string[]).some(issue=>v.code===`${prefix}.invalid_response_${issue}`)))throw new DomainError('invalid');
  if(v.kind==='transport_error'&&(apiCode!==undefined||!v.code.startsWith(prefix+'.')||!/^((nav_)?transport_[0-9]{1,3}|native_unavailable)$/.test(v.code.slice(prefix.length+1))))throw new DomainError('invalid');
  if(v.kind==='cancelled'&&(status!==0||apiCode!==undefined||v.code!==prefix+'.cancelled'))throw new DomainError('invalid');
  return {kind:v.kind as SearchResult['kind'],status,...(apiCode===undefined?{}:{apiCode}),code:v.code};
}
export function parseSearchResult(value:unknown):SearchResult {
  const v=boundedMessage(value),outcome=parseSearchOutcome(v,'search');
  if(Object.keys(v).some(k=>!['version','scope','operation','closed','kind','status','apiCode','code','items','noMore'].includes(k))||v.version!==1||v.operation!=='public-video-search'||v.closed!==true)throw new DomainError('invalid');
  if(!Array.isArray(v.items)||v.items.length>4||typeof v.noMore!=='boolean'||v.kind!=='ok'&&(v.items.length||!v.noMore))throw new DomainError('invalid');
  const items=v.items.map(parsePopularCard);if(new Set(items.map(v=>v.bvid)).size!==items.length)throw new DomainError('invalid');
  return {version:1,scope:popularScope(v.scope),operation:'public-video-search',closed:true,...outcome,items,noMore:v.noMore};
}
/** Detail is taken only from a checked terminal frame, never outside messages. */
export class SearchReadError extends DomainError {
  readonly detail: string;
  constructor(value:unknown){
    const result=parseSearchResult(value);
    if(result.kind==='ok')throw new DomainError('invalid');
    super(result.kind==='cancelled'?'cancelled':result.kind==='invalid_response'?'invalid':result.code==='search.native_unavailable'?'unsupported':'network');
    this.detail=result.code;
  }
}
