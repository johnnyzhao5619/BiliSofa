import {DomainError} from '../../../../packages/contracts/src/index.ts';
import {localOwner,type LocalWrite} from '../../../../packages/contracts/src/local-profile.ts';
import {parseSearchKeyword} from '../../../../packages/contracts/src/search.ts';
import {parseSearchHistory,searchHistoryDefaults,type SearchHistoryRead,type SearchHistoryStore} from '../../../../packages/contracts/src/search-history.ts';
type StorageApi=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
/** Fixed ordinary-data partition, separate from protected sessions and journals. */
export class SearchHistories {
  constructor(private readonly storage:StorageApi|undefined){}
  profile(owner:string):SearchHistoryStore {
    const key='bilisofa.search.v1.'+localOwner(owner),storage=this.storage;
    const read=():SearchHistoryRead=>{
      if(!storage)return {kind:'unavailable'};
      let raw:string|null;try{raw=storage.getItem(key);}catch{return {kind:'unavailable'};}
      if(raw===null)return {kind:'ok',value:searchHistoryDefaults()};
      try{return {kind:'ok',value:parseSearchHistory(raw)};}catch(e){return {kind:e instanceof DomainError&&e.code==='unsupported'?'future':'corrupt'};}
    };
    const write=(change:(doc:Extract<SearchHistoryRead,{kind:'ok'}>['value'])=>void):LocalWrite=>{
      const result=read();if(result.kind!=='ok')return result.kind;change(result.value);const raw=JSON.stringify(result.value);parseSearchHistory(raw);
      try{storage!.setItem(key,raw);return storage!.getItem(key)===raw?'saved':'unconfirmed';}catch{return 'unconfirmed';}
    };
    return {
      read,
      remember(value){const keyword=parseSearchKeyword(value);const current=read();if(current.kind!=='ok')return current.kind;if(!current.value.enabled||current.value.terms[0]===keyword)return 'saved';return write(doc=>{if(doc.enabled)doc.terms=[keyword,...doc.terms.filter(t=>t!==keyword)].slice(0,12);});},
      recording(value){if(typeof value!=='boolean')throw new DomainError('invalid');return write(doc=>{doc.enabled=value;});},
      forgetAll(){return write(doc=>{doc.terms=[];});},
      clear(){if(!storage)return 'unavailable';try{storage.removeItem(key);return storage.getItem(key)===null?'deleted':'unconfirmed';}catch{return 'unconfirmed';}},
    };
  }
}
export function searchHistories():SearchHistories{try{return new SearchHistories(globalThis.localStorage);}catch{return new SearchHistories(undefined);}}
