import {DomainError,record} from './index.ts';
import {parseAccountId} from './private-account.ts';
import {vodInteger,vodKeys} from './vod-catalog.ts';
import {parseInteractionIntent,parseInteractionState,interactionReady,type InteractionIntent,type InteractionState} from './video-interactions.ts';
export type InteractionMark='pending'|'unknown'|'confirmed'|'not-applied'|'not-sent';
export interface InteractionEntry {accountId:string;serial:number;intent:InteractionIntent;before:InteractionState;state:InteractionMark;ack:boolean;}
export interface InteractionJournal {schema:1;revision:number;entries:InteractionEntry[];}
export interface InteractionJournalStore {read():{raw:string|null;value:InteractionJournal};replace(expected:string|null,value:InteractionJournal):void;}
export function parseInteractionJournal(raw:string):InteractionJournal{
 if(typeof raw!=='string'||new TextEncoder().encode(raw).length>2097152)throw new DomainError('invalid');let v:Record<string,unknown>;try{v=record(JSON.parse(raw));}catch{throw new DomainError('invalid');}vodKeys(v,['schema','revision','entries']);if(v.schema!==1)throw new DomainError('unsupported');const revision=vodInteger(v.revision,0,Number.MAX_SAFE_INTEGER);if(!Array.isArray(v.entries)||v.entries.length>256)throw new DomainError('invalid');const seen=new Set<number>();
 const entries=v.entries.map(raw=>{const e=record(raw);vodKeys(e,['accountId','serial','intent','before','state','ack']);const serial=vodInteger(e.serial,1,revision);if(seen.has(serial)||typeof e.ack!=='boolean'||!['pending','unknown','confirmed','not-applied','not-sent'].includes(String(e.state)))throw new DomainError('invalid');seen.add(serial);const intent=parseInteractionIntent(e.intent),before=parseInteractionState(e.before);if(!interactionReady(before,intent))throw new DomainError('invalid');return{accountId:parseAccountId(e.accountId),serial,intent,before,state:e.state as InteractionMark,ack:e.ack};});return{schema:1,revision,entries};
}
