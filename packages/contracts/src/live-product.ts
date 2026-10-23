import {DomainError,record,text,type MediaSource,type ErrorCode} from './index.ts';
import {pgcId} from './pgc-season.ts';
import {vodInteger,vodKeys} from './vod-catalog.ts';
import {vodNonce} from './vod-runtime.ts';
export interface LiveCard {roomId?:string;title:string;owner:string;category:string;state:'live'|'offline'|'unknown';}
export interface LiveArea {id:string;title:string;children:{id:string;title:string}[];}
export type LiveBrowseQuery = {kind:'recommend'}|{kind:'following';page:number}|{kind:'area';parentId:string;areaId:string;page:number};
/** Source batches are displayed four cards at a time. No fabricated four-item
 * API pagination: the next source batch is requested only after this one. */
export interface LiveBatch {items:LiveCard[];noMore:boolean;}
export interface LiveSelection {roomId:string;qn:number;}
export interface LiveQuality {qn:number;label:string;}
export interface LiveCatalog {id:string;roomId:string;state:'live'|'offline';selectedQn:number;qualities:LiveQuality[];width:number;height:number;video:string;audio:string ;}
export interface LiveMessage {key:string;author:string;body:string;atMs:number;}
export interface LiveMessages {roomId:string;items:LiveMessage[];}
export interface LiveSourceStatus {stage:'api'|'manifest'|'probe'|'segment'|'listener';node:number;http:number;curl:number;exhausted:boolean;}
export function parseLiveSourceStatus(value:unknown):LiveSourceStatus {
 const v=record(value);vodKeys(v,['stage','node','http','curl','exhausted']);
 if(!['api','manifest','probe','segment','listener'].includes(String(v.stage))||typeof v.exhausted!=='boolean')throw new DomainError('invalid');
 const status={stage:v.stage as LiveSourceStatus['stage'],node:vodInteger(v.node,0,3),http:vodInteger(v.http,0,599),curl:vodInteger(v.curl,-1,999),exhausted:v.exhausted};
 if((status.stage==='api')!==(status.node===0))throw new DomainError('invalid');return status;
}
export class LiveSourceError extends DomainError {readonly source:LiveSourceStatus;constructor(code:ErrorCode,source:LiveSourceStatus){super(code);this.source=parseLiveSourceStatus(source);}}
export interface LiveAccess {
  sourceStatus?():LiveSourceStatus|undefined;
  browse(query:LiveBrowseQuery,signal:AbortSignal):Promise<LiveBatch>;
  areas(signal:AbortSignal):Promise<LiveArea[]>;
  room(query:LiveSelection,signal:AbortSignal):Promise<LiveCatalog>;
  messages(roomId:string,signal:AbortSignal):Promise<LiveMessages>;
  transport(catalogId:string):{run(signal:AbortSignal,ready:(source:MediaSource)=>void):Promise<void>;close():Promise<void>};
  close():Promise<void>;
}
export class LiveReadFailure extends DomainError {constructor(code:ErrorCode,readonly apiCode?:number){super(code);if(apiCode!==undefined)vodInteger(apiCode,-2147483648,2147483647);}}
export const liveId=pgcId;
export function liveAreaId(value:unknown):string {return value==='0'?'0':liveId(value);}
export function liveCaption(value:unknown,max:number,empty=false):string {if(empty&&value==='')return '';return text(value,max);}
export function parseLiveBrowse(value:unknown):LiveBrowseQuery {
  const v=record(value);
  if(v.kind==='recommend'){vodKeys(v,['kind']);return {kind:'recommend'};}
  if(v.kind==='following'){vodKeys(v,['kind','page']);return {kind:'following',page:vodInteger(v.page,1,25000)};}
  if(v.kind==='area'){vodKeys(v,['kind','parentId','areaId','page']);return {kind:'area',parentId:liveId(v.parentId),areaId:liveAreaId(v.areaId),page:vodInteger(v.page,1,25000)};}
  throw new DomainError('invalid');
}
export function parseLiveSelection(value:unknown):LiveSelection {const v=record(value);vodKeys(v,['roomId','qn']);return {roomId:liveId(v.roomId),qn:vodInteger(v.qn,0,100000)};}
export function parseLiveCard(value:unknown):LiveCard {
  const v=record(value);vodKeys(v,['title','owner','category','state',...(v.roomId===undefined?[]:['roomId'])]);if(!['live','offline','unknown'].includes(String(v.state)))throw new DomainError('invalid');
  return {...(v.roomId===undefined?{}:{roomId:liveId(v.roomId)}),title:liveCaption(v.title,160),owner:liveCaption(v.owner,80),category:liveCaption(v.category,64,true),state:v.state as LiveCard['state']};
}
export function parseLiveBatch(value:unknown):LiveBatch {
  const v=record(value);vodKeys(v,['items','noMore']);if(!Array.isArray(v.items)||v.items.length>100||typeof v.noMore!=='boolean'||!v.noMore&&!v.items.length)throw new DomainError('invalid');
  const items=v.items.map(parseLiveCard),ids=items.flatMap(e=>e.roomId?[e.roomId]:[]);if(new Set(ids).size!==ids.length)throw new DomainError('invalid');return {items,noMore:v.noMore};
}
export function parseLiveAreas(value:unknown):LiveArea[] {
  if(!Array.isArray(value)||value.length>64)throw new DomainError('invalid');let total=0;
  const result=value.map(raw=>{const v=record(raw);vodKeys(v,['id','title','children']);if(!Array.isArray(v.children)||(total+=v.children.length)>4096)throw new DomainError('invalid');const children=v.children.map(raw=>{const c=record(raw);vodKeys(c,['id','title']);return {id:liveId(c.id),title:liveCaption(c.title,64)};});if(new Set(children.map(c=>c.id)).size!==children.length)throw new DomainError('invalid');return {id:liveId(v.id),title:liveCaption(v.title,64),children};});
  if(new Set(result.map(e=>e.id)).size!==result.length)throw new DomainError('invalid');return result;
}
export function parseLiveCatalog(value:unknown):LiveCatalog {
  const v=record(value);vodKeys(v,['id','roomId','state','selectedQn','qualities','width','height','video','audio']);if(v.state!=='live'&&v.state!=='offline'||!Array.isArray(v.qualities)||v.qualities.length>32)throw new DomainError('invalid');
  const qualities=v.qualities.map(raw=>{const q=record(raw);vodKeys(q,['qn','label']);return {qn:vodInteger(q.qn,1,100000),label:liveCaption(q.label,64)};});
  const result:LiveCatalog={id:vodNonce(v.id),roomId:liveId(v.roomId),state:v.state,selectedQn:vodInteger(v.selectedQn,0,100000),qualities,width:vodInteger(v.width,0,16384),height:vodInteger(v.height,0,8640),video:liveCaption(v.video,48,true),audio:liveCaption(v.audio,48,true)};

  if(new Set(qualities.map(q=>q.qn)).size!==qualities.length)throw new DomainError('invalid');
  if(result.state==='offline'?(result.selectedQn||qualities.length||result.width||result.height||result.video||result.audio):(!qualities.some(q=>q.qn===result.selectedQn)||!result.width||!result.height||!/^avc1\.[a-fA-F0-9]{6}$/.test(result.video)||result.audio!=='mp4a.40.2'))throw new DomainError('invalid');return result;
}
export function parseLiveMessages(value:unknown):LiveMessages {
  const v=record(value);vodKeys(v,['roomId','items']);if(!Array.isArray(v.items)||v.items.length>100)throw new DomainError('invalid');
  const items=v.items.map(raw=>{const m=record(raw);vodKeys(m,['key','author','body','atMs']);return {key:vodNonce(m.key),author:liveCaption(m.author,64),body:liveCaption(m.body,300),atMs:vodInteger(m.atMs,1700000000000,4102444800000)};});
  if(new Set(items.map(e=>e.key)).size!==items.length)throw new DomainError('invalid');return {roomId:liveId(v.roomId),items};
}
