import {DomainError,record,text} from './index.ts';
/** Missing part is the legacy first-P spelling; runtime identity always includes P. */
export interface QueueItem {bvid:string;title:string;part?:number;}
export interface LocalQueue {schema:2;continuous:boolean;items:QueueItem[];}
export type QueueRead={kind:'ok';value:LocalQueue}|{kind:'unavailable'|'corrupt'|'future'};
export type QueueWrite='saved'|'deleted'|'full'|'unavailable'|'corrupt'|'future'|'unconfirmed';
export interface QueueStore {read():QueueRead;add(item:QueueItem):QueueWrite;remove(bvid:string,part?:number):QueueWrite;move(bvid:string,direction:-1|1,part?:number):QueueWrite;continuous(value:boolean):QueueWrite;clear():QueueWrite;}
export function queuePart(value:QueueItem):number{return value.part??1;}
export function queueItemKey(value:QueueItem):string{return `${value.bvid}-p${queuePart(value)}`;}
export function parseQueueItem(value:unknown):QueueItem{
 const v=record(value);if(Object.keys(v).length<2||Object.keys(v).length>3||Object.keys(v).some(k=>!['bvid','title','part'].includes(k))||typeof v.bvid!=='string'||!/^BV[A-Za-z0-9]{10}$/.test(v.bvid)||('part'in v&&(!Number.isSafeInteger(v.part)||Number(v.part)<1||Number(v.part)>10000)))throw new DomainError('invalid');
 return {bvid:v.bvid,title:text(v.title,120),...('part'in v?{part:Number(v.part)}:{})};
}
export function queueDefaults():LocalQueue{return {schema:2,continuous:false,items:[]};}
/** v1 is accepted only when explicitly reading the old, preserved storage key. */
export function parseLocalQueue(raw:string,legacy=false):LocalQueue{
 if(new TextEncoder().encode(raw).length>65536)throw new DomainError('invalid');const v=record(JSON.parse(raw));if(v.schema!==(legacy?1:2))throw new DomainError('unsupported');
 if(Object.keys(v).length!==3||Object.keys(v).some(k=>!['schema','continuous','items'].includes(k))||typeof v.continuous!=='boolean'||!Array.isArray(v.items)||v.items.length>64)throw new DomainError('invalid');
 if(legacy&&v.items.some(i=>Object.keys(record(i)).length!==2))throw new DomainError('invalid');
 const items=v.items.map(parseQueueItem);if(new Set(items.map(queueItemKey)).size!==items.length)throw new DomainError('invalid');return {schema:2,continuous:v.continuous,items};
}
/** Private-list DTO opt-in: public BV only, never a URL or numeric resource ID. */
export function optionalQueueBvid(card:Record<string,unknown>):string|undefined {
 if(card.bvid===undefined)return undefined;
 if(card.kind!=='ugc'||typeof card.bvid!=='string'||!/^BV[A-Za-z0-9]{10}$/.test(card.bvid))throw new DomainError('invalid');
 return card.bvid;
}
