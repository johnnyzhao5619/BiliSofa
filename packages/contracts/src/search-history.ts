import { DomainError, record } from './index.ts';
import { parseSearchKeyword } from './search.ts';
import type { LocalIssue, LocalWrite } from './local-profile.ts';
export interface SearchHistory {schema:1;enabled:boolean;terms:string[];}
export type SearchHistoryRead={kind:'ok';value:SearchHistory}|{kind:LocalIssue};
export interface SearchHistoryStore {read():SearchHistoryRead;remember(keyword:string):LocalWrite;recording(enabled:boolean):LocalWrite;forgetAll():LocalWrite;clear():LocalWrite;}
export function searchHistoryDefaults():SearchHistory{return {schema:1,enabled:true,terms:[]};}
export function parseSearchHistory(raw:string):SearchHistory {
  if(new TextEncoder().encode(raw).length>4096)throw new DomainError('invalid');
  const v=record(JSON.parse(raw));if(v.schema!==1)throw new DomainError('unsupported');
  if(Object.keys(v).length!==3||Object.keys(v).some(k=>!['schema','enabled','terms'].includes(k))||typeof v.enabled!=='boolean'||!Array.isArray(v.terms)||v.terms.length>12)throw new DomainError('invalid');
  const terms=v.terms.map(parseSearchKeyword);if(new Set(terms).size!==terms.length)throw new DomainError('invalid');
  return {schema:1,enabled:v.enabled,terms};
}
