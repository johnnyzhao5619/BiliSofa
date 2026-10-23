import {DomainError} from '../../../../packages/contracts/src/index.ts';
import {localOwner} from '../../../../packages/contracts/src/local-profile.ts';
import {parseLocalQueue,parseQueueItem,queueDefaults,queueItemKey,type QueueStore,type QueueRead,type QueueWrite,type LocalQueue} from '../../../../packages/contracts/src/local-queue.ts';
type StorageApi=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
/** Separate ordinary identity partition; no enumeration, automatic overwrite or credential access. */
export class LocalQueues{
 constructor(private readonly storage:StorageApi|undefined){}
 profile(owner:string):QueueStore{
  const fixed=localOwner(owner),key='bilisofa.queue.v2.'+fixed,oldKey='bilisofa.queue.v1.'+fixed,storage=this.storage;
  const read=():QueueRead=>{if(!storage)return {kind:'unavailable'};let raw:string|null,legacy=false;try{raw=storage.getItem(key);if(raw===null){raw=storage.getItem(oldKey);legacy=true;}}catch{return {kind:'unavailable'};}if(raw===null)return {kind:'ok',value:queueDefaults()};try{return {kind:'ok',value:parseLocalQueue(raw,legacy)};}catch(e){return {kind:e instanceof DomainError&&e.code==='unsupported'?'future':'corrupt'};}};
  const write=(change:(doc:LocalQueue)=>'full'|void):QueueWrite=>{const result=read();if(result.kind!=='ok')return result.kind;if(change(result.value)==='full')return 'full';const raw=JSON.stringify(result.value);parseLocalQueue(raw);try{storage!.setItem(key,raw);return storage!.getItem(key)===raw?'saved':'unconfirmed';}catch{return 'unconfirmed';}};
  const id=(bvid:string,part=1)=>queueItemKey(parseQueueItem({bvid,title:'id',part}));
  return {read,add(value){const item=parseQueueItem(value);return write(doc=>{if(doc.items.some(i=>queueItemKey(i)===queueItemKey(item)))return;if(doc.items.length===64)return 'full';doc.items.push(item);});},
   remove(bvid,part){const target=id(bvid,part);return write(doc=>{doc.items=doc.items.filter(i=>queueItemKey(i)!==target);});},
   move(bvid,direction,part){const target=id(bvid,part);if(direction!==-1&&direction!==1)throw new DomainError('invalid');return write(doc=>{const at=doc.items.findIndex(i=>queueItemKey(i)===target),to=at+direction;if(at<0)throw new DomainError('invalid');if(to<0||to>=doc.items.length)return;[doc.items[at],doc.items[to]]=[doc.items[to]!,doc.items[at]!];});},
   continuous(value){if(typeof value!=='boolean')throw new DomainError('invalid');return write(doc=>{doc.continuous=value;});},
   clear(){if(!storage)return 'unavailable';try{storage.removeItem(oldKey);if(storage.getItem(oldKey)!==null)return 'unconfirmed';storage.removeItem(key);return storage.getItem(key)===null&&storage.getItem(oldKey)===null?'deleted':'unconfirmed';}catch{return 'unconfirmed';}}
  };
 }
}
export function localQueues():LocalQueues{try{return new LocalQueues(globalThis.localStorage);}catch{return new LocalQueues(undefined);}}
