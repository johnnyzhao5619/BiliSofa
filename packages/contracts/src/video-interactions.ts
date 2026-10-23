import {DomainError,record,text,parseScope,type Scope,type ErrorCode} from './index.ts';
import {vodBvid,vodInteger,vodKeys} from './vod-catalog.ts';
import {parsePrivateAccount,type PrivateAccount} from './private-account.ts';
import type {VideoOperation,InteractionStage,InteractionIssues,InteractionReadFamily} from './video-interactions-dto.ts';
export type {InteractionStage,InteractionIssues} from './video-interactions-dto.ts';
export type InteractionPhase=InteractionStage|'identity'|'video'|'write';
export class InteractionReadError extends DomainError{constructor(readonly phase:InteractionPhase,code:ErrorCode){super(code);}}
export type InteractionAction = 'like'|'favorite'|'watch-later'|'follow'|'coin';
export interface InteractionState {bvid:string;aid:string;ownerId:string;title:string;owner:string;liked:boolean|null;followed:boolean|null;followMode:number|null;watchLater:boolean|null;coins:number|null;coinLimit:1|2;balance:number|null;folders:{id:string;title:string;selected:boolean}[]|null;unavailable?:InteractionIssues;}
export interface InteractionIntent {kind:InteractionAction;on:boolean;folderId:string;quantity:number;}
export type InteractionCommand = {kind:'state';bvid:string;family?:InteractionReadFamily}|{kind:'write';bvid:string;expected:InteractionState;intent:InteractionIntent};
export type InteractionValue = {kind:'state';state:InteractionState}|{kind:'write';ack:'accepted'|'unknown'|'not-sent';apiCode?:number;reason?:'target_changed'|'unavailable'|'state_changed'|'coin_precondition'};
export interface InteractionRequest {version:1;operation:'video-interactions';scope:Scope;account:PrivateAccount;command:InteractionCommand;}
export type InteractionResult = {version:1;operation:'video-interactions';scope:Scope;closed:true}&({kind:'ok';value:InteractionValue}|{kind:'error';code:ErrorCode;phase?:InteractionPhase});
export function interactionId(value:unknown):string{const id=text(value,16);if(!/^[1-9][0-9]{0,15}$/.test(id)||!Number.isSafeInteger(Number(id)))throw new DomainError('invalid');return id;}
export function interactionBool(value:unknown):boolean{if(typeof value!=='boolean')throw new DomainError('invalid');return value;}
export function parseVideoOperation(raw:unknown):VideoOperation{
 const v=record(raw);if(v.kind==='coin'||v.kind==='triple'){vodKeys(v,['kind','quantity',...(v.kind==='triple'?['folder']:[])]);if(v.quantity!==1&&v.quantity!==2)throw new DomainError('invalid');return v.kind==='coin'?{kind:'coin',quantity:v.quantity}:{kind:'triple',quantity:v.quantity,folder:folderKey(v.folder)};}
 if(v.kind!=='like'&&v.kind!=='follow'&&v.kind!=='watch-later'&&v.kind!=='favorite')throw new DomainError('invalid');vodKeys(v,['kind','on',...(v.kind==='favorite'?['folder']:[])]);return v.kind==='favorite'?{kind:'favorite',on:interactionBool(v.on),folder:folderKey(v.folder)}:{kind:v.kind,on:interactionBool(v.on)};
}
function folderKey(raw:unknown):string{const s=text(raw,8);if(!/^f[0-9]{1,2}$/.test(s))throw new DomainError('invalid');return s;}
export function parseInteractionState(raw:unknown):InteractionState{
 const v=record(raw);vodKeys(v,['bvid','aid','ownerId','title','owner','liked','followed','followMode','watchLater','coins','coinLimit','balance','folders',...('unavailable'in v?['unavailable']:[])]);
 if(v.coinLimit!==1&&v.coinLimit!==2)throw new DomainError('invalid');
 const unavailable:InteractionIssues={};
 if('unavailable'in v){const issues=record(v.unavailable);for(const [stage,code]of Object.entries(issues)){
  if(!['like','coins','follow','watch-later','folders','balance'].includes(stage)||!['invalid','permission','network','unsupported'].includes(String(code)))throw new DomainError('invalid');
  unavailable[stage as InteractionStage]=code as ErrorCode;
 }}
 // Null is an explicit unread capability, never a fabricated negative state.
 for(const [stage,fields]of Object.entries({like:['liked'],coins:['coins'],follow:['followed','followMode'],'watch-later':['watchLater'],folders:['folders'],balance:['balance']})){
  if(fields.some(key=>unavailable[stage as InteractionStage]?v[key]!==null:v[key]===null))throw new DomainError('invalid');
 }
 const balance=v.balance===null?null:typeof v.balance==='number'&&Number.isFinite(v.balance)&&v.balance>=0&&v.balance<=1e9?v.balance:undefined;
 if(balance===undefined||v.folders!==null&&(!Array.isArray(v.folders)||v.folders.length>100))throw new DomainError('invalid');
 if(v.followMode!==null&&(![0,1,2,6,128].includes(Number(v.followMode))||typeof v.followMode!=='number'||v.followed!==[1,2,6].includes(v.followMode)))throw new DomainError('invalid');
 const folders=v.folders===null?null:(v.folders as unknown[]).map(raw=>{const f=record(raw);vodKeys(f,['id','title','selected']);return{id:interactionId(f.id),title:text(f.title,160),selected:interactionBool(f.selected)};});
 if(folders&&new Set(folders.map(f=>f.id)).size!==folders.length)throw new DomainError('invalid');
 return{bvid:vodBvid(v.bvid),aid:interactionId(v.aid),ownerId:interactionId(v.ownerId),title:text(v.title,240),owner:text(v.owner,128),liked:v.liked===null?null:interactionBool(v.liked),followed:v.followed===null?null:interactionBool(v.followed),followMode:v.followMode as number|null,watchLater:v.watchLater===null?null:interactionBool(v.watchLater),coins:v.coins===null?null:vodInteger(v.coins,0,v.coinLimit),coinLimit:v.coinLimit,balance,folders,...(Object.keys(unavailable).length?{unavailable}:{})};
}
/** Required proof is local to the requested family, including its preview baseline. */
export function interactionReady(s:InteractionState,intent:InteractionIntent):boolean{
 return intent.kind==='coin'?s.coins!==null&&s.balance!==null:intent.kind==='like'?s.liked!==null:intent.kind==='follow'?s.followed!==null&&s.followMode!==null:intent.kind==='watch-later'?s.watchLater!==null:!!s.folders?.some(f=>f.id===intent.folderId);
}

export function parseInteractionIntent(raw:unknown):InteractionIntent{
 const v=record(raw);vodKeys(v,['kind','on','folderId','quantity']);if(!['like','follow','favorite','watch-later','coin'].includes(String(v.kind)))throw new DomainError('invalid');const on=interactionBool(v.on),folderId=v.kind==='favorite'?interactionId(v.folderId):v.folderId===''?'':undefined,quantity=vodInteger(v.quantity,0,2);if(folderId===undefined||(v.kind==='coin'?(!on||quantity<1||v.folderId!==''):quantity!==0))throw new DomainError('invalid');
 return{kind:v.kind as InteractionAction,on,folderId:folderId!,quantity};
}
export function parseInteractionCommand(raw:unknown):InteractionCommand{
 const v=record(raw);if(v.kind==='state'){vodKeys(v,['kind','bvid',...('family'in v?['family']:[])]);if('family'in v&&!['like','follow','watch-later','toolbar'].includes(String(v.family)))throw new DomainError('invalid');return{kind:'state',bvid:vodBvid(v.bvid),...('family'in v?{family:v.family as InteractionReadFamily}:{})};}
 if(v.kind!=='write')throw new DomainError('invalid');vodKeys(v,['kind','bvid','expected','intent']);const bvid=vodBvid(v.bvid),expected=parseInteractionState(v.expected);if(expected.bvid!==bvid)throw new DomainError('invalid');return{kind:'write',bvid,expected,intent:parseInteractionIntent(v.intent)};
}
export function parseInteractionValue(raw:unknown):InteractionValue{
 const v=record(raw);if(v.kind==='state'){vodKeys(v,['kind','state']);return{kind:'state',state:parseInteractionState(v.state)};}
 if(v.kind!=='write')throw new DomainError('invalid');vodKeys(v,['kind','ack',...('apiCode'in v?['apiCode']:[]),...('reason'in v?['reason']:[])]);if(!['accepted','unknown','not-sent'].includes(String(v.ack)))throw new DomainError('invalid');if('apiCode'in v&&(!Number.isSafeInteger(v.apiCode)||Math.abs(Number(v.apiCode))>1000000000||v.ack!==(v.apiCode===0?'accepted':'unknown')))throw new DomainError('invalid');if('reason'in v&&(v.ack!=='not-sent'||!['target_changed','unavailable','state_changed','coin_precondition'].includes(String(v.reason))))throw new DomainError('invalid');return{kind:'write',ack:v.ack as 'accepted'|'unknown'|'not-sent',...('apiCode'in v?{apiCode:Number(v.apiCode)}:{}),...('reason'in v?{reason:v.reason as 'target_changed'|'unavailable'|'state_changed'|'coin_precondition'}:{})};
}
export function parseInteractionRequest(raw:unknown):InteractionRequest{
 const v=record(raw);vodKeys(v,['version','operation','scope','account','command']);if(v.version!==1||v.operation!=='video-interactions'||Object.keys(record(v.scope)).length!==4)throw new DomainError('invalid');const scope=parseScope(v.scope),account=parsePrivateAccount(v.account);if(scope.generation<1||scope.accountId!==account.id)throw new DomainError('permission');return{version:1,operation:'video-interactions',scope,account,command:parseInteractionCommand(v.command)};
}
export function parseInteractionResult(raw:unknown):InteractionResult{
 const v=record(raw);vodKeys(v,['version','operation','scope','closed','kind',v.kind==='ok'?'value':'code',...('phase'in v?['phase']:[])]);if(v.version!==1||v.operation!=='video-interactions'||v.closed!==true||Object.keys(record(v.scope)).length!==4)throw new DomainError('invalid');const base={version:1 as const,operation:'video-interactions' as const,scope:parseScope(v.scope),closed:true as const};if('phase'in v&&(v.kind!=='error'||!['identity','video','like','coins','follow','watch-later','folders','balance','write'].includes(String(v.phase))))throw new DomainError('invalid');if(v.kind==='ok')return{...base,kind:'ok',value:parseInteractionValue(v.value)};if(v.kind!=='error'||!['invalid','login','permission','cancelled','timeout','network','unknown','unsupported'].includes(String(v.code)))throw new DomainError('invalid');return{...base,kind:'error',code:v.code as ErrorCode,...('phase'in v?{phase:v.phase as InteractionPhase}:{})};
}
/** Exact target state, never an aggregate favorite flag or total video coin count. */
export function interactionApplied(s:InteractionState,intent:InteractionIntent,before:InteractionState):boolean|undefined{
 if(s.ownerId!==before.ownerId||intent.kind!=='follow'&&(s.bvid!==before.bvid||s.aid!==before.aid))return undefined;
 if(!interactionReady(s,intent)||!interactionReady(before,intent))return undefined;
 if(intent.kind==='coin')return s.coins === before.coins!+intent.quantity;
 const current=intent.kind==='like'?s.liked:intent.kind==='follow'?s.followed:intent.kind==='watch-later'?s.watchLater:s.folders?.find(f=>f.id===intent.folderId)?.selected;
 return current===undefined||current===null?undefined:current===intent.on;
}
