import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseLocalQueue,parseQueueItem,queueItemKey,type QueueItem} from '../../packages/contracts/src/local-queue.ts';
import {parseReturnAnchor} from '../../packages/contracts/src/navigation.ts';
import {LocalQueues} from '../../apps/tv/src/platform/local-queue-store.ts';
import {PlaybackQueue,type QueueMedia} from '../../packages/media/src/queue.ts';
import type {MediaClosure,MediaOutcome,MediaSnapshot} from '../../packages/media/src/session.ts';
const item=(n:number):QueueItem=>({bvid:'BV'+String(n).padStart(10,'0'),title:'合成队列'+n}),clean:MediaClosure={closed:true,decoderClosed:true,transportClosed:true},bad:MediaClosure={closed:false,decoderClosed:true,transportClosed:false};
test('F05 local queue schema excludes URLs/secrets, duplicates and unbounded entries',()=>{
 for(const v of [{...item(1),url:'outside'},{...item(1),bvid:'outside'}, {...item(1),title:'x\ny'}])assert.throws(()=>parseQueueItem(v));
 for(const doc of [{schema:3,continuous:false,items:[]},{schema:2,continuous:false,items:[item(1),item(1)]},{schema:2,continuous:false,items:Array.from({length:65},(_,i)=>item(i))},{schema:2,continuous:false,items:[],cookie:'synthetic'}])assert.throws(()=>parseLocalQueue(JSON.stringify(doc)));
});
test('F05 queue persists bounded order/continuous per fixed identity; target deletion preserves other identities and unknown-write journals',()=>{
 const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}},queues=new LocalQueues(storage),a=queues.profile('bili_101'),b=queues.profile('bili_202'),guest=queues.profile('guest');data.set('bilisofa.retained-writes.v1','unknown');
 assert.equal(a.add(item(1)),'saved');a.add(item(1));a.add(item(2));a.move(item(2).bvid,-1);a.continuous(true);const r=a.read();assert.equal(r.kind,'ok');if(r.kind==='ok'){assert.deepEqual(r.value.items,[item(2),item(1)]);assert.equal(r.value.continuous,true);r.value.items.pop();}assert.equal((a.read() as {kind:'ok';value:{items:QueueItem[]}}).value.items.length,2);
 b.add(item(3));guest.add(item(4));assert.equal(a.clear(),'deleted');assert.equal((b.read() as {kind:'ok';value:{items:QueueItem[]}}).value.items.length,1);assert.equal((guest.read() as {kind:'ok';value:{items:QueueItem[]}}).value.items.length,1);assert.equal(data.get('bilisofa.retained-writes.v1'),'unknown');
 for(let i=0;i<64;i++)a.add(item(i));assert.equal(a.add(item(99)),'full');assert.equal((a.read() as {kind:'ok';value:{items:QueueItem[]}}).value.items.length,64);
});
test('F05 corrupt/future queue is not overwritten, unavailable storage stays explicit, write readback mismatch stays unconfirmed',()=>{
 let raw:string|null='{"schema":3}',sets=0;const q=new LocalQueues({getItem:()=>raw,setItem:()=>{sets++;},removeItem:()=>{raw=null;}}).profile('guest');assert.equal(q.read().kind,'future');assert.equal(q.add(item(1)),'future');assert.equal(sets,0);raw='bad';assert.equal(q.add(item(1)),'corrupt');assert.equal(sets,0);q.clear();assert.equal(q.add(item(1)),'unconfirmed');assert.equal(new LocalQueues(undefined).profile('guest').add(item(1)),'unavailable');
});
function fixture(continuous=true){const media:Fake[]=[];const outcomes:{outcome:MediaOutcome;closure:MediaClosure}[]=[];
 class Fake implements QueueMedia{done!:(outcome:MediaOutcome,closure:MediaClosure)=>void;closed=false;initial=0;gate:Promise<MediaClosure>=Promise.resolve(clean);start(at=0){this.initial=at;}toggle(){}async seek(_ms:number){}snapshot():MediaSnapshot{return {state:'playing',timeMs:1000,durationMs:80000,seeking:false,acceptedRate:1};}close(){this.closed=true;return this.gate;}}
 const queue=new PlaybackQueue([item(1),item(2),item(3)],0,continuous,(_item,done)=>{const f=new Fake();f.done=done;media.push(f);return f;},(outcome,closure)=>outcomes.push({outcome,closure}));return {queue,media,outcomes};
}
const turn=()=>new Promise(r=>setImmediate(r));
test('F05 natural queue advancement waits actual native/decoder close and ignores late old completion',async()=>{
 const f=fixture();f.queue.start(12000);assert.equal(f.media[0]!.initial,12000);let release!:(v:MediaClosure)=>void;f.media[0]!.gate=new Promise(r=>{release=r;});f.media[0]!.done('ended',clean);await turn();assert.equal(f.media.length,1);assert.equal(f.queue.snapshot().moving,true);release(clean);await turn();assert.equal(f.media.length,2);assert.equal(f.queue.snapshot().index,1);assert.equal(f.media[1]!.initial,0);f.media[0]!.done('ended',clean);await turn();assert.equal(f.media.length,2);await f.queue.close();
});
test('F05 manual next closes first; Home/Back close during the wait prevents any replacement or stale completion',async()=>{
 const f=fixture();f.queue.start();let release!:(v:MediaClosure)=>void;f.media[0]!.gate=new Promise(r=>{release=r;});const next=f.queue.next();await assert.rejects(f.queue.next(),{code:'invalid'});assert.equal(f.media.length,1);const closing=f.queue.close();release(clean);await Promise.all([next,closing]);f.media[0]!.done('ended',clean);await turn();assert.equal(f.media.length,1);assert.equal(f.queue.snapshot().ended,true);
});
test('F05 default-off queue stops at natural end, failures never skip, and unknown closure remains poisoned on owner close',async()=>{
 for(const mode of ['off','failure','unknown'] as const){const f=fixture(mode!=='off');f.queue.start();if(mode==='unknown')f.media[0]!.gate=Promise.resolve(bad);f.media[0]!.done(mode==='failure'?'failed':'ended',mode==='unknown'?bad:clean);await turn();assert.equal(f.media.length,1);assert.equal(f.outcomes.length,1);assert.equal((await f.queue.close()).closed,mode!=='unknown');}
});
test('F05 manual next starts one fresh instance after close; end of queue cannot wrap or replay without another explicit run',async()=>{
 const f=fixture();f.queue.start();await f.queue.next();assert.equal(f.media.length,2);assert.equal(f.media[0]!.closed,true);await f.queue.next();assert.equal(f.media.length,3);await assert.rejects(f.queue.next(),{code:'invalid'});f.media[2]!.done('ended',clean);await turn();assert.equal(f.outcomes.length,1);assert.equal(f.media.length,3);await f.queue.close();
});
test('F05 failed reported close cannot be made successful by a later clean response, including synchronous cancellation',async()=>{
 const f=fixture();f.queue.start();f.media[0]!.done('ended',bad);const result=await f.queue.close();assert.equal(result.closed,false);assert.equal(f.media.length,1);
});

test('F05 v2 preserves v1 bytes and rollback snapshot, reads legacy first-P without a write and deduplicates by BV plus P',()=>{
 const data=new Map<string,string>(),old=JSON.stringify({schema:1,continuous:true,items:[item(1)]});data.set('bilisofa.queue.v1.guest',old);let sets=0;
 const q=new LocalQueues({getItem:k=>data.get(k)??null,setItem(k,v){sets++;data.set(k,v);},removeItem:k=>{data.delete(k);}}).profile('guest');
 assert.deepEqual(q.read(),{kind:'ok',value:{schema:2,continuous:true,items:[item(1)]}});assert.equal(sets,0);q.add({...item(1),part:1});q.add({...item(1),part:2});q.add({...item(1),part:2});
 const read=q.read();assert.equal(read.kind,'ok');if(read.kind==='ok')assert.deepEqual(read.value.items,[item(1),{...item(1),part:2}]);assert.equal(data.get('bilisofa.queue.v1.guest'),old);
 q.move(item(1).bvid,-1,2);const moved=q.read();if(moved.kind==='ok')assert.equal(moved.value.items[0]!.part,2);q.remove(item(1).bvid,1);const kept=q.read();if(kept.kind==='ok')assert.deepEqual(kept.value.items,[{...item(1),part:2}]);
 assert.equal(q.clear(),'deleted');assert.equal(data.has('bilisofa.queue.v1.guest'),false);assert.equal(data.has('bilisofa.queue.v2.guest'),false);assert.deepEqual(q.read(),{kind:'ok',value:{schema:2,continuous:false,items:[]}});
});
test('F05 current v2 failure never falls back to legacy data, and partially failed deletion cannot resurrect stale v1',()=>{
 const old=JSON.stringify({schema:1,continuous:false,items:[item(1)]}),current=JSON.stringify({schema:2,continuous:false,items:[{...item(1),part:2}]});const data=new Map([['bilisofa.queue.v1.guest',old],['bilisofa.queue.v2.guest',current]]);
 let blockOld=true;const q=new LocalQueues({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{if(k.endsWith('v1.guest')&&blockOld)return;data.delete(k);}}).profile('guest');
 assert.equal(q.clear(),'unconfirmed');assert.equal(data.get('bilisofa.queue.v2.guest'),current);blockOld=false;data.set('bilisofa.queue.v2.guest','{"schema":3}');assert.equal(q.read().kind,'future');assert.equal(q.add(item(2)),'future');data.set('bilisofa.queue.v2.guest','bad');assert.equal(q.read().kind,'corrupt');assert.equal(q.clear(),'deleted');
});
test('F05 part boundary accepts only bounded integers; legacy documents cannot smuggle part identity and v2 duplicate spellings collide',()=>{
 for(const part of [0,-1,1.5,10001,'2',null,undefined])assert.throws(()=>parseQueueItem({...item(1),part}));
 assert.equal(parseQueueItem({...item(1),part:10000}).part,10000);assert.throws(()=>parseLocalQueue(JSON.stringify({schema:1,continuous:false,items:[{...item(1),part:2}]}),true));
 assert.throws(()=>parseLocalQueue(JSON.stringify({schema:2,continuous:false,items:[item(1),{...item(1),part:1}]})));
 assert.equal(parseLocalQueue(JSON.stringify({schema:2,continuous:false,items:[item(1),{...item(1),part:2}]})).items.length,2);
});
test('F05 playback snapshot keeps two parts of the same BV distinct, closes before changing part and preserves recorded identity',async()=>{
 const seen:QueueItem[]=[],callbacks:((o:MediaOutcome,c:MediaClosure)=>void)[]=[];let closes=0;
 const queue=new PlaybackQueue([{...item(1),part:1},{...item(1),part:2}],0,true,(entry,done)=>{seen.push(entry);callbacks.push(done);return {start(){},toggle(){},async seek(){},snapshot:()=>({state:'playing',timeMs:0,durationMs:8000,seeking:false}),async close(){closes++;return clean;}};},()=>{});
 queue.start();await queue.next();assert.deepEqual(seen.map(i=>i.part),[1,2]);assert.equal(closes,1);callbacks[0]!('ended',clean);await turn();assert.equal(seen.length,2);assert.equal(queue.snapshot().item.part,2);await queue.close();
});

test('F05 same-BV different-P queue return anchors satisfy the shared navigation contract',()=>{
 const ids=[1,2,10000].map(part=>'queue-'+queueItemKey({...item(1),part}));for(const focusId of ids)assert.equal(parseReturnAnchor({focusId,scrollTop:0}).focusId,focusId);assert.equal(new Set(ids).size,3);
});
