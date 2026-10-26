import {optionalQueueBvid} from './local-queue.ts';
import {skippedCount,parseCoverReference,DomainError,record,finite,text,parseScope,type Scope,type ErrorCode} from './index.ts';
import {parsePrivateAccount,type PrivateAccount} from './private-account.ts';
import type {HistoryQuery,HistoryCard,HistoryPage} from './history-dto.ts';
export type {HistoryQuery,HistoryCard,HistoryPage};
export const HISTORY_BUSINESSES=['','archive','pgc','live','article','article-list','cheese'] as const;
/** Private transport cursor. Never a UI route, stored preference or diagnostic. */
export interface HistoryCursor {max:string;viewAtSec:number;business:typeof HISTORY_BUSINESSES[number];}
export interface HistoryBatch {items:HistoryCard[];next?:HistoryCursor;skipped?:number;}
export interface HistoryRequest {version:1;operation:'history-read';scope:Scope;account:PrivateAccount;cursor:HistoryCursor;}
export type HistoryResult={version:1;operation:'history-read';scope:Scope;closed:true}&({kind:'ok';batch:HistoryBatch}|{kind:'error';code:ErrorCode});
export function parseHistoryQuery(value:unknown):HistoryQuery{const v=record(value);if(Object.keys(v).some(k=>!['page','refresh'].includes(k))||!Number.isInteger(v.page)||Number(v.page)<1||Number(v.page)>25||('refresh'in v&&(v.refresh!==true||v.page!==1)))throw new DomainError('invalid');return {page:Number(v.page),...(v.refresh===true?{refresh:true}:{})};}
export function parseHistoryCursor(value:unknown):HistoryCursor{
 const v=record(value),raw=typeof v.max==='number'&&Number.isSafeInteger(v.max)?String(v.max):v.max;
 if(Object.keys(v).length!==3||Object.keys(v).some(k=>!['max','viewAtSec','business'].includes(k))||typeof raw!=='string'||!/^(0|[1-9][0-9]{0,19})$/.test(raw)||raw.length===20&&raw>'18446744073709551615'||!HISTORY_BUSINESSES.includes(v.business as HistoryCursor['business']))throw new DomainError('invalid');
 const viewAtSec=finite(v.viewAtSec,0,4294967295);if(!Number.isInteger(viewAtSec)||v.business===''&&(raw!=='0'||viewAtSec!==0))throw new DomainError('invalid');return {max:raw,viewAtSec,business:v.business as HistoryCursor['business']};
}
export function parseHistoryCard(value:unknown):HistoryCard{
 const v=record(value);if(Object.keys(v).length!==(6+(v.bvid===undefined?0:1)+(v.cover===undefined?0:1))||Object.keys(v).some(k=>!['title','kind','viewedAtSec','progressSec','durationSec','part','bvid','cover'].includes(k))||!['ugc','pgc','live','article','course','unknown'].includes(String(v.kind)))throw new DomainError('invalid');
 const viewedAtSec=finite(v.viewedAtSec,0,4294967295),progressSec=v.progressSec===null?null:finite(v.progressSec,-1,604800),durationSec=v.durationSec===null?null:finite(v.durationSec,0,604800),part=v.part===null?null:finite(v.part,1,10000);
 if([viewedAtSec,progressSec,durationSec,part].some(n=>n!==null&&!Number.isInteger(n)))throw new DomainError('invalid');const bvid=optionalQueueBvid(v);return {...(bvid?{bvid}:{}),...(v.cover===undefined?{}:{cover:parseCoverReference(v.cover)}),title:text(v.title,120),kind:v.kind as HistoryCard['kind'],viewedAtSec,progressSec,durationSec,part};
}
export function parseHistoryPage(value:unknown):HistoryPage{const v=record(value);if(Object.keys(v).length!==3||Object.keys(v).some(k=>!['page','items','noMore'].includes(k))||!Array.isArray(v.items)||v.items.length>4||typeof v.noMore!=='boolean')throw new DomainError('invalid');return {page:parseHistoryQuery({page:v.page}).page,items:v.items.map(parseHistoryCard),noMore:v.noMore};}
export function parseHistoryBatch(value:unknown):HistoryBatch{const v=record(value);if(Object.keys(v).some(k=>!['items','next','skipped'].includes(k))||!Array.isArray(v.items)||v.items.length>100)throw new DomainError('invalid');const items=v.items.map(parseHistoryCard),skipped=skippedCount(v.skipped,100,items.length),extra=skipped===undefined?{}:{skipped};if('next'in v){if(!items.length)throw new DomainError('invalid');return {items,next:parseHistoryCursor(v.next),...extra};}return {items,...extra};}
function scoped(value:unknown){const raw=record(value),s=parseScope(value);if(Object.keys(raw).length!==4||!/^bili_[1-9][0-9]{0,15}$/.test(s.accountId))throw new DomainError('invalid');return s;}
export function parseHistoryRequest(value:unknown):HistoryRequest{const v=record(value);if(Object.keys(v).length!==5||Object.keys(v).some(k=>!['version','operation','scope','account','cursor'].includes(k))||v.version!==1||v.operation!=='history-read')throw new DomainError('invalid');const scope=scoped(v.scope),account=parsePrivateAccount(v.account);if(scope.accountId!==account.id)throw new DomainError('invalid');return {version:1,operation:'history-read',scope,account,cursor:parseHistoryCursor(v.cursor)};}
export function parseHistoryResult(value:unknown):HistoryResult{
 let raw:string;try{raw=JSON.stringify(value);}catch{throw new DomainError('invalid');}if(!raw||new TextEncoder().encode(raw).length>196608)throw new DomainError('invalid');const v=record(value),scope=scoped(v.scope);if(Object.keys(v).length!==6||v.version!==1||v.operation!=='history-read'||v.closed!==true)throw new DomainError('invalid');const base={version:1 as const,operation:'history-read' as const,scope,closed:true as const};
 if(v.kind==='ok'&&Object.keys(v).every(k=>['version','operation','scope','closed','kind','batch'].includes(k)))return {...base,kind:'ok',batch:parseHistoryBatch(v.batch)};
 if(v.kind==='error'&&Object.keys(v).every(k=>['version','operation','scope','closed','kind','code'].includes(k))&&['invalid','cancelled','timeout','network','login','permission','unsupported','unknown'].includes(String(v.code)))return {...base,kind:'error',code:v.code as ErrorCode};throw new DomainError('invalid');
}
