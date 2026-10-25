import {optionalQueueBvid} from './local-queue.ts';
import {parseCoverReference,DomainError,record,text,finite,parseScope,type Scope,type ErrorCode} from './index.ts';
import {parsePrivateAccount,type PrivateAccount} from './private-account.ts';
import type { WatchLaterQuery, WatchLaterCard, WatchLaterPage } from './watch-later-dto.ts';
export type { WatchLaterQuery, WatchLaterCard, WatchLaterPage };
export interface WatchLaterRequest {version:1;operation:'watch-later-read';scope:Scope;query:WatchLaterQuery;account:PrivateAccount;}
export type WatchLaterResult = {version:1;operation:'watch-later-read';scope:Scope;closed:true} & ({kind:'ok';page:WatchLaterPage}|{kind:'error';code:ErrorCode});
export function parseWatchLaterQuery(value:unknown):WatchLaterQuery{
 const v=record(value);if(Object.keys(v).length!==1||!Number.isInteger(v.page)||Number(v.page)<1||Number(v.page)>25)throw new DomainError('invalid');return {page:Number(v.page)};
}
export function parseWatchLaterPage(value:unknown,rows:4|20=4):WatchLaterPage{
 const v=record(value),query=parseWatchLaterQuery({page:v.page});
 if(Object.keys(v).length!==4||Object.keys(v).some(k=>!['page','items','noMore','total'].includes(k))||!Array.isArray(v.items)||v.items.length>rows||typeof v.noMore!=='boolean')throw new DomainError('invalid');
 const total=finite(v.total,0,Number.MAX_SAFE_INTEGER);if(!Number.isInteger(total))throw new DomainError('invalid');
 const items=v.items.map(raw=>{const c=record(raw);if(Object.keys(c).length!==(4+(c.bvid===undefined?0:1)+(c.cover===undefined?0:1))||Object.keys(c).some(k=>!['title','kind','availability','partCount','bvid','cover'].includes(k))||!['ugc','pgc','unknown'].includes(String(c.kind))||!['available','unavailable','unknown'].includes(String(c.availability)))throw new DomainError('invalid');const partCount=finite(c.partCount,0,10000);if(!Number.isInteger(partCount))throw new DomainError('invalid');const bvid=optionalQueueBvid(c);return {...(bvid?{bvid}:{}),...(c.cover===undefined?{}:{cover:parseCoverReference(c.cover)}),title:text(c.title,120),kind:c.kind as WatchLaterCard['kind'],availability:c.availability as WatchLaterCard['availability'],partCount};});
 return {...query,items,noMore:v.noMore,total};
}
function scoped(value:unknown):Scope{const raw=record(value),s=parseScope(value);if(Object.keys(raw).length!==4||!/^bili_[1-9][0-9]{0,15}$/.test(s.accountId))throw new DomainError('invalid');return s;}
export function parseWatchLaterRequest(value:unknown):WatchLaterRequest{
 const v=record(value);if(Object.keys(v).length!==5||Object.keys(v).some(k=>!['version','operation','scope','query','account'].includes(k))||v.version!==1||v.operation!=='watch-later-read')throw new DomainError('invalid');
 const scope=scoped(v.scope),account=parsePrivateAccount(v.account);if(scope.accountId!==account.id)throw new DomainError('invalid');return {version:1,operation:'watch-later-read',scope,query:parseWatchLaterQuery(v.query),account};
}
/** `rows` 20 checks one ADR-108 account kernel batch; screen pages stay at four. */
export function parseWatchLaterResult(value:unknown,rows:4|20=4):WatchLaterResult{
 let raw:string;try{raw=JSON.stringify(value);}catch{throw new DomainError('invalid');}if(!raw||new TextEncoder().encode(raw).length>(rows===4?8192:32768))throw new DomainError('invalid');
 const v=record(value),scope=scoped(v.scope);if(Object.keys(v).length!==6||v.version!==1||v.operation!=='watch-later-read'||v.closed!==true)throw new DomainError('invalid');
 const base={version:1 as const,operation:'watch-later-read' as const,scope,closed:true as const};
 if(v.kind==='ok'&&Object.keys(v).every(k=>['version','operation','scope','closed','kind','page'].includes(k)))return {...base,kind:'ok',page:parseWatchLaterPage(v.page,rows)};
 if(v.kind==='error'&&Object.keys(v).every(k=>['version','operation','scope','closed','kind','code'].includes(k))&&['invalid','cancelled','timeout','network','login','permission','unsupported','unknown'].includes(String(v.code)))return {...base,kind:'error',code:v.code as ErrorCode};
 throw new DomainError('invalid');
}
