import {DomainError,record,text} from './index.ts';
import {pgcId} from './pgc-season.ts';
import {vodInteger,vodKeys} from './vod-catalog.ts';
export interface PgcFollowQuery {type:1|2;page:number;}
export interface PgcFollowCard {seasonId:string;title:string;status:string;progress:string;}
export interface PgcFollowPage extends PgcFollowQuery {total:number;noMore:boolean;items:PgcFollowCard[];}
export type PgcFollowCommand = {kind:'list';query:PgcFollowQuery}|{kind:'state';seasonId:string}|{kind:'write';seasonId:string;follow:boolean};
export type PgcFollowValue = {kind:'list';page:PgcFollowPage}|{kind:'state';followed:'yes'|'no'|'unknown'}|{kind:'write';ack:'accepted'|'rejected';apiCode?:number};
export function parsePgcFollowQuery(value:unknown):PgcFollowQuery {const v=record(value);vodKeys(v,['type','page']);if(v.type!==1&&v.type!==2)throw new DomainError('invalid');return {type:v.type,page:vodInteger(v.page,1,25000)};}
export function parsePgcFollowPage(value:unknown):PgcFollowPage {
 const v=record(value);vodKeys(v,['type','page','total','noMore','items']);const query=parsePgcFollowQuery({type:v.type,page:v.page}),total=vodInteger(v.total,0,100000);
 if(typeof v.noMore!=='boolean'||!Array.isArray(v.items)||v.items.length>4)throw new DomainError('invalid');
 const items=v.items.map(raw=>{const e=record(raw);vodKeys(e,['seasonId','title','status','progress']);return {seasonId:pgcId(e.seasonId),title:text(e.title,160),status:e.status===''?'':text(e.status,96),progress:e.progress===''?'':text(e.progress,96)};});
 if(new Set(items.map(e=>e.seasonId)).size!==items.length||v.noMore!==(items.length<4||query.page*4>=total))throw new DomainError('invalid');return {...query,total,noMore:v.noMore,items};
}
export function parsePgcFollowCommand(value:unknown):PgcFollowCommand {
 const v=record(value);
 if(v.kind==='list'){vodKeys(v,['kind','query']);return {kind:'list',query:parsePgcFollowQuery(v.query)};}
 if(v.kind==='state'){vodKeys(v,['kind','seasonId']);return {kind:'state',seasonId:pgcId(v.seasonId)};}
 if(v.kind==='write'){vodKeys(v,['kind','seasonId','follow']);if(typeof v.follow!=='boolean')throw new DomainError('invalid');return {kind:'write',seasonId:pgcId(v.seasonId),follow:v.follow};}
 throw new DomainError('invalid');
}
export function parsePgcFollowValue(value:unknown):PgcFollowValue {
 const v=record(value);
 if(v.kind==='list'){vodKeys(v,['kind','page']);return {kind:'list',page:parsePgcFollowPage(v.page)};}
 if(v.kind==='state'){vodKeys(v,['kind','followed']);if(!['yes','no','unknown'].includes(String(v.followed)))throw new DomainError('invalid');return {kind:'state',followed:v.followed as 'yes'|'no'|'unknown'};}
 // 0.49.1: a rejected write keeps B站's integer code so the page can say what happened.
 if(v.kind==='write'){vodKeys(v,['kind','ack',...(v.apiCode===undefined?[]:['apiCode'])]);if(v.ack!=='accepted'&&v.ack!=='rejected')throw new DomainError('invalid');if(v.apiCode!==undefined&&(v.ack!=='rejected'||!Number.isSafeInteger(v.apiCode)||v.apiCode===0||Math.abs(v.apiCode as number)>2147483647))throw new DomainError('invalid');return {kind:'write',ack:v.ack,...(v.apiCode===undefined?{}:{apiCode:v.apiCode as number})};}
 throw new DomainError('invalid');
}
