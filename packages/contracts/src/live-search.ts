import {DomainError,boundedMessage,finite,popularScope,text,type Scope} from './index.ts';
import {parseSearchRequest,parseSearchOutcome,type PublicSearchOutcome} from './search.ts';
export type LiveRoomState='live'|'unknown';
/** Public search snapshot, not a playback URI or a verified current player state. */
export interface LiveSearchCard {roomId:string;title:string;owner:string;category:string;tags:string;popularity:number;state:LiveRoomState;}
export interface LiveSearchRequest {version:1;scope:Scope;operation:'public-live-search';keyword:string;page:number;}
export interface LiveSearchResult extends PublicSearchOutcome {version:1;scope:Scope;operation:'public-live-search';closed:true;items:LiveSearchCard[];noMore:boolean;}
export function parseLiveSearchCard(value:unknown):LiveSearchCard {
 const v=boundedMessage(value),roomId=text(v.roomId,16),title=text(v.title,120),owner=text(v.owner,48),popularity=finite(v.popularity,0,Number.MAX_SAFE_INTEGER);
 if(Object.keys(v).some(k=>!['roomId','title','owner','category','tags','popularity','state'].includes(k))||!/^\d{1,16}$/.test(roomId)||roomId.startsWith('0')||BigInt(roomId)>9007199254740991n||!Number.isInteger(popularity)||!['live','unknown'].includes(String(v.state)))throw new DomainError('invalid');
 const optional=(v:unknown,max:number)=>v===''?'':text(v,max);
 return {roomId,title,owner,category:optional(v.category,32),tags:optional(v.tags,32),popularity,state:v.state as LiveRoomState};
}
export function parseLiveSearchRequest(value:unknown):LiveSearchRequest {
 const v=boundedMessage(value);if(v.operation!=='public-live-search')throw new DomainError('invalid');
 return {...parseSearchRequest({...v,operation:'public-video-search'}),operation:'public-live-search'};
}
export function parseLiveSearchResult(value:unknown):LiveSearchResult {
 const v=boundedMessage(value),outcome=parseSearchOutcome(v,'live');
 if(Object.keys(v).some(k=>!['version','scope','operation','closed','kind','status','apiCode','code','items','noMore'].includes(k))||v.version!==1||v.operation!=='public-live-search'||v.closed!==true||!Array.isArray(v.items)||v.items.length>4||typeof v.noMore!=='boolean'||v.kind!=='ok'&&(v.items.length||!v.noMore))throw new DomainError('invalid');
 const items=v.items.map(parseLiveSearchCard);if(new Set(items.map(i=>i.roomId)).size!==items.length)throw new DomainError('invalid');
 return {version:1,scope:popularScope(v.scope),operation:'public-live-search',closed:true,...outcome,items,noMore:v.noMore};
}
