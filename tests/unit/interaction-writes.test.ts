import {test} from 'node:test';import assert from 'node:assert/strict';
import {InteractionWrites} from '../../packages/bili-client/src/interaction-writes.ts';
import {LocalInteractionJournal} from '../../apps/tv/src/platform/interaction-journal.ts';
import {LocalWriteJournal} from '../../apps/tv/src/platform/write-journal.ts';
import {parseInteractionJournal} from '../../packages/contracts/src/interaction-journal.ts';
import {parseInteractionIntent,parseVideoOperation,parseInteractionState,parseInteractionValue,type InteractionState,type InteractionIntent} from '../../packages/contracts/src/video-interactions.ts';
export const state={bvid:'BV0000000001',aid:'123',ownerId:'202',title:'合成视频',owner:'合成UP',liked:false,followed:false,followMode:0,watchLater:false,coins:0,coinLimit:2,balance:10,folders:[{id:'456',title:'合成夹',selected:false}]} satisfies InteractionState;
const intent=(kind:InteractionIntent['kind']='like',on=true,quantity=0):InteractionIntent=>({kind,on,quantity,folderId:kind==='favorite'?'456':''});
function fixture(){const values=new Map<string,string>();const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};const store=new LocalInteractionJournal(storage),legacy=new LocalWriteJournal(storage);return{values,storage,store,legacy,writes:new InteractionWrites(store,legacy)};}
const signal=()=>new AbortController().signal;
test('F11 journal precedes dispatch; explicit opposite directions each confirm through independent reads and preserve every consumed operation',async()=>{
 const f=fixture();let count=0;
 for(const on of [true,false,true]){const before={...state,liked:!on};f.writes.reconcile('bili_101',before);assert.equal(await f.writes.submit('bili_101',before,intent('like',on),true,signal(),async()=>{assert.equal(f.store.read().value.entries.at(-1)!.state,'pending');count++;return'accepted';},async()=>({...state,liked:on})),'confirmed');}
 assert.equal(count,3);assert.deepEqual(f.store.read().value.entries.map(e=>e.state),['not-applied','confirmed','confirmed']);assert.ok(!JSON.stringify(f.store.read().value).includes('合成夹'));
});
test('F14 API0 alone is unknown; lost response persists across reopen and cannot be unlocked by subsequent coin counts or reversible queries',async()=>{
 const f=fixture();let posts=0;const coin=intent('coin',true,1);
 assert.equal(await f.writes.submit('bili_101',state,coin,true,signal(),async()=>{posts++;return'accepted';},async()=>state),'unknown');
 const reopened=new InteractionWrites(f.store,f.legacy);reopened.reconcile('bili_101',{...state,coins:1});assert.equal(reopened.inspect('bili_101',{...state,coins:1}).coinLocked,true);
 await assert.rejects(reopened.submit('bili_101',{...state,coins:1},coin,true,signal(),async()=>{posts++;return'accepted';},async()=>({...state,coins:2})),{code:'permission'});assert.equal(posts,1);assert.deepEqual(reopened.summary('bili_101'),{total:1,unknown:1});assert.deepEqual(reopened.summary('bili_102'),{total:0,unknown:0});
});
test('F14 confirmed quantity 1 permits a separately confirmed remaining 1; never reuses the old baseline or grants',async()=>{
 const f=fixture();let posts=0;for(let coins=0;coins<2;coins++){assert.equal(await f.writes.submit('bili_101',{...state,coins},intent('coin',true,1),true,signal(),async()=>{posts++;return'accepted';},async()=>({...state,coins:coins+1})),'confirmed');}
 assert.equal(posts,2);assert.equal(f.writes.inspect('bili_101',state).coinLocked,true);assert.equal(f.store.read().value.entries.length,2);
});
test('F11 cancelled/timeout POST is not resent; only exact folder read settles an unknown reversible result',async()=>{
 const f=fixture();let posts=0;assert.equal(await f.writes.submit('bili_101',state,intent('favorite'),true,signal(),async()=>{posts++;throw Error('response lost');},async()=>{throw Error('offline');}),'unknown');
 await assert.rejects(f.writes.submit('bili_101',state,intent('favorite'),true,signal(),async()=>{posts++;return'accepted';},async()=>state),{code:'permission'});
 f.writes.reconcile('bili_101',{...state,folders:[{id:'999',title:'其他夹',selected:true}]});assert.equal(f.store.read().value.entries[0]!.state,'unknown');
 f.writes.reconcile('bili_101',{...state,folders:[{id:'456',title:'已重命名',selected:false}]});assert.equal(f.store.read().value.entries[0]!.state,'not-applied');assert.equal(posts,1);
});
test('F11 same UP through another BV reconciles the actual UP family, never another UP',async()=>{
 const f=fixture();await f.writes.submit('bili_101',state,intent('follow'),true,signal(),async()=>{throw Error();},async()=>{throw Error();});
 f.writes.reconcile('bili_101',{...state,bvid:'BV0000000002',followed:true,followMode:2});assert.equal(f.store.read().value.entries[0]!.state,'confirmed');
});
test('F11/F14 old retained coin/unknown markers remain intact and block overlapping new grants; progress is not silently imported',async()=>{
 const f=fixture();f.legacy.replace(null,{schema:1,revision:1,entries:[{accountId:'bili_101',targetId:state.bvid,action:'coin',state:'confirmed'},{accountId:'bili_101',targetId:state.bvid,action:'progress',state:'unknown'}]});const old=f.legacy.read().raw;
 assert.equal(f.writes.inspect('bili_101',state).coinLocked,true);f.writes.reconcile('bili_101',state);assert.equal(f.legacy.read().raw,old);
 assert.equal(f.writes.inspect('bili_102',state).coinLocked,false);
 const f2=fixture();f2.legacy.replace(null,{schema:1,revision:1,entries:[{accountId:'bili_101',targetId:state.bvid,action:'like',state:'unknown'}]});assert.equal(f2.writes.inspect('bili_101',state).blocked,true);
});
test('F11 no dispatch without explicit confirmation, good persistence, or live signal; corrupt/future journals fail closed',async()=>{
 for(const mode of ['confirm','cancel','corrupt','future','storage']as const){const f=fixture();let posts=0;const c=new AbortController();if(mode==='cancel')c.abort();if(mode==='corrupt')f.values.set('bilisofa.video-interactions.v1','{');if(mode==='future')f.values.set('bilisofa.video-interactions.v1','{"schema":2,"revision":0,"entries":[]}');if(mode==='storage')f.storage.setItem=()=>{throw Error();};const work=f.writes.submit('bili_101',state,intent(),mode!=='confirm',c.signal,async()=>{posts++;return'accepted';},async()=>({...state,liked:true}));if(mode==='storage')assert.equal(await work,'unknown');else await assert.rejects(work);assert.equal(posts,0);}
});
test('F11 DTOs reject extra operations, malformed targets/quantities and widened public commands; no silent normalization',()=>{
 for(const v of [{kind:'coin',quantity:0},{kind:'coin',quantity:3},{kind:'triple',quantity:1,folder:'456'},{kind:'like',on:true,csrf:'x'},{kind:'comment',on:true}])assert.throws(()=>parseVideoOperation(v));
 for(const v of [{...intent(),folderId:'99'},{...intent('coin',true,1),quantity:0},{...intent('favorite'),folderId:'1&x=y'},{...intent('coin',true,1),on:false}])assert.throws(()=>parseInteractionIntent(v));
 assert.throws(()=>parseInteractionState({...state,folders:[...state.folders,...state.folders]}));assert.throws(()=>parseInteractionJournal('{"schema":1,"revision":0,"entries":[],"reset":true}'));
});

test('U4 partial snapshots preserve null proof and old journal bytes, only exact available family reconciles unknown',async()=>{
 const f=fixture();const partial={...state,coins:null,balance:null,folders:null,unavailable:{coins:'invalid',balance:'invalid',folders:'network'}} as InteractionState;
 f.legacy.replace(null,{schema:1,revision:1,entries:[{accountId:'bili_101',targetId:state.bvid,action:'progress',state:'unknown'}]});const legacy=f.legacy.read().raw;
 let posts=0;assert.equal(await f.writes.submit('bili_101',partial,intent(),true,signal(),async()=>{posts++;return'accepted';},async()=>({...partial,liked:true})),'confirmed');assert.equal(posts,1);
 const saved=f.store.read().value.entries[0]!;assert.equal(saved.before.coins,null);assert.equal(saved.before.folders,null);assert.equal(saved.before.balance,null);assert.equal(saved.state,'confirmed');assert.equal(f.legacy.read().raw,legacy);
 await assert.rejects(f.writes.submit('bili_101',partial,intent('favorite'),true,signal(),async()=>{posts++;return'accepted';},async()=>state),{code:'permission'});assert.equal(posts,1);
 const g=fixture();await g.writes.submit('bili_101',state,intent(),true,signal(),async()=>{throw Error();},async()=>{throw Error();});g.writes.reconcile('bili_101',{...state,liked:null,unavailable:{like:'invalid'}});assert.equal(g.store.read().value.entries[0]!.state,'unknown');
});
test('U4 nullable contract cannot invent an unread negative or hide login/cancellation as partial',()=>{
 for(const raw of [{...state,liked:null},{...state,unavailable:{like:'invalid'}},{...state,liked:null,unavailable:{like:'login'}},{...state,coins:null,unavailable:{coins:'cancelled'}},{...state,followMode:null,unavailable:{follow:'invalid'}},{...state,unavailable:{other:'invalid'}}])assert.throws(()=>parseInteractionState(raw));
 assert.deepEqual(parseInteractionState(state),state);
});

test('U4 journal rejects an unread baseline for its own action while preserving independent partial states',()=>{
 const entry={accountId:'bili_101',serial:1,intent:intent(),before:{...state,liked:null,unavailable:{like:'invalid'}},state:'unknown',ack:false};assert.throws(()=>parseInteractionJournal(JSON.stringify({schema:1,revision:1,entries:[entry]})));
});

test('U4 write diagnostics keep numeric API/reason fields bounded and cannot transport outside text',()=>{
 assert.deepEqual(parseInteractionValue({kind:'write',ack:'unknown',apiCode:-352}),{kind:'write',ack:'unknown',apiCode:-352});
 for(const v of [{kind:'write',ack:'accepted',apiCode:-352},{kind:'write',ack:'unknown',apiCode:1e12},{kind:'write',ack:'not-sent',reason:'https://outside.invalid'},{kind:'write',ack:'unknown',message:'private server text'}])assert.throws(()=>parseInteractionValue(v));
});

test('U4 acknowledged reversible write allows one delayed readonly cache-convergence query and still sends exactly once',async()=>{
 const f=fixture();let posts=0,queries=0;assert.equal(await f.writes.submit('bili_101',state,intent(),true,signal(),async()=>{posts++;return'accepted';},async()=>({...state,liked:++queries===2})),'confirmed');assert.equal(posts,1);assert.equal(queries,2);
 const g=fixture();let q=0;assert.equal(await g.writes.submit('bili_101',state,intent(),true,signal(),async()=>{throw Error();},async()=>{q++;return state;}),'not-applied');assert.equal(q,1);
});
const seeded=(f:ReturnType<typeof fixture>,rows:{kind:InteractionIntent['kind'];state:'confirmed'|'unknown'|'not-applied'|'not-sent'}[])=>f.store.replace(null,{schema:1,revision:rows.length,entries:rows.map((r,i)=>({accountId:'bili_101',serial:i+1,intent:intent(r.kind,true,r.kind==='coin'?1:0),before:{...state,bvid:`BV${String(i+1).padStart(10,'0')}`},state:r.state,ack:r.state==='confirmed'}))});
test('F11 a full journal evicts only the oldest settled reversible row; lifetime use never locks interactions',async()=>{
 const f=fixture();seeded(f,Array.from({length:256},(_,i)=>({kind:'like' as const,state:i%2?'confirmed' as const:'not-applied' as const})));let posts=0;
 assert.equal(await f.writes.submit('bili_101',state,intent('like'),true,signal(),async()=>{posts++;return'accepted';},async()=>({...state,liked:true})),'confirmed');
 const rows=f.store.read().value.entries;assert.equal(posts,1);assert.equal(rows.length,256);assert.equal(rows[0]!.serial,2);assert.equal(rows.at(-1)!.before.bvid,state.bvid);assert.equal(rows.at(-1)!.state,'confirmed');
});
test('F11/F14 eviction keeps unknown intents and possibly consumed coin grants; a journal full of them still refuses before any POST',async()=>{
 const f=fixture();seeded(f,[...Array.from({length:255},()=>({kind:'like' as const,state:'unknown' as const})),{kind:'coin',state:'confirmed'}]);let posts=0;
 await assert.rejects(f.writes.submit('bili_101',state,intent('watch-later'),true,signal(),async()=>{posts++;return'accepted';},async()=>({...state,watchLater:true})),{code:'invalid'});
 assert.equal(posts,0);assert.equal(f.store.read().value.entries.length,256);
 const g=fixture();seeded(g,[...Array.from({length:255},()=>({kind:'coin' as const,state:'confirmed' as const})),{kind:'coin',state:'not-sent'}]);
 assert.equal(await g.writes.submit('bili_101',state,intent('like'),true,signal(),async()=>{posts++;return'accepted';},async()=>({...state,liked:true})),'confirmed');
 const rows=g.store.read().value.entries;assert.equal(rows.filter(e=>e.intent.kind==='coin'&&e.state==='confirmed').length,255);assert.equal(rows.some(e=>e.state==='not-sent'),false);
});
