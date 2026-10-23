import {DomainError,boundedMessage,finite,popularScope,parsePopularCard,text,type Scope,type PopularCard} from './index.ts';
import {parseSearchRequest,parseSearchOutcome,type PublicSearchOutcome} from './search.ts';
export interface UserSearchCard {uid:string;name:string;fans:number;videos:number;preview?:PopularCard;}
export interface UserSearchRequest {version:1;scope:Scope;operation:'public-user-search';keyword:string;page:number;}
export interface UserSearchResult extends PublicSearchOutcome {version:1;scope:Scope;operation:'public-user-search';closed:true;items:UserSearchCard[];noMore:boolean;}
export function parseUserSearchCard(value:unknown):UserSearchCard {
  const v=boundedMessage(value),uid=text(v.uid,16),name=text(v.name,48),fans=finite(v.fans,0,Number.MAX_SAFE_INTEGER),videos=finite(v.videos,0,Number.MAX_SAFE_INTEGER);
  if(Object.keys(v).some(k=>!['uid','name','fans','videos','preview'].includes(k))||!/^\d{1,16}$/.test(uid)||uid.startsWith('0')||BigInt(uid)>9007199254740991n||!Number.isInteger(fans)||!Number.isInteger(videos))throw new DomainError('invalid');
  const preview=v.preview===undefined?undefined:parsePopularCard(v.preview);
  if(preview&&preview.owner!==name)throw new DomainError('invalid');
  return {uid,name,fans,videos,...(preview?{preview}:{})};
}
export function parseUserSearchRequest(value:unknown):UserSearchRequest {
  const v=boundedMessage(value);if(v.operation!=='public-user-search')throw new DomainError('invalid');
  return {...parseSearchRequest({...v,operation:'public-video-search'}),operation:'public-user-search'};
}
export function parseUserSearchResult(value:unknown):UserSearchResult {
  const v=boundedMessage(value),outcome=parseSearchOutcome(v,'up');
  if(Object.keys(v).some(k=>!['version','scope','operation','closed','kind','status','apiCode','code','items','noMore'].includes(k))||v.version!==1||v.operation!=='public-user-search'||v.closed!==true||!Array.isArray(v.items)||v.items.length>4||typeof v.noMore!=='boolean'||v.kind!=='ok'&&(v.items.length||!v.noMore))throw new DomainError('invalid');
  const items=v.items.map(parseUserSearchCard);if(new Set(items.map(i=>i.uid)).size!==items.length)throw new DomainError('invalid');
  return {version:1,scope:popularScope(v.scope),operation:'public-user-search',closed:true,...outcome,items,noMore:v.noMore};
}
