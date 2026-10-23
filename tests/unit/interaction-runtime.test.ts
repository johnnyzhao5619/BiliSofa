import {test} from 'node:test';import assert from 'node:assert/strict';
import {InteractionRuntime} from '../../apps/tv/src/platform/interaction-runtime.ts';
import {InteractionWrites} from '../../packages/bili-client/src/interaction-writes.ts';
import {LocalInteractionJournal} from '../../apps/tv/src/platform/interaction-journal.ts';
import {LocalWriteJournal} from '../../apps/tv/src/platform/write-journal.ts';
import type {InteractionRequest,InteractionState,InteractionValue} from '../../packages/contracts/src/video-interactions.ts';
import type {PrivateAccount} from '../../packages/contracts/src/private-account.ts';
const initial={bvid:'BV0000000001',aid:'123',ownerId:'202',title:'合成视频',owner:'合成UP',liked:false,followed:false,followMode:0,watchLater:false,coins:0,coinLimit:2,balance:10,folders:[{id:'456',title:'合成夹',selected:false}]} satisfies InteractionState;
const account:PrivateAccount={schema:1,id:'bili_101',uid:'101',name:'合成',expiresAt:Date.now()+3600000,cookieLines:'.bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\t'+'a'.repeat(32)+'\n'};
function fixture(){
 const original=globalThis.Worker,requests:InteractionRequest[]=[],workers:Fake[]=[];let state:InteractionState=structuredClone(initial),mode='normal';
 const values=new Map<string,string>(),storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}},store=new LocalInteractionJournal(storage),writes=new InteractionWrites(store,new LocalWriteJournal(storage));
 class Fake{onmessage:((event:{data:unknown})=>void)|null=null;onerror:(()=>void)|null=null;request!:InteractionRequest;stops=0;dead=false;constructor(){workers.push(this);}postMessage(raw:InteractionRequest|{control:string}){
  if('control'in raw){this.stops++;queueMicrotask(()=>this.reply(undefined));return;}this.request=raw;requests.push(raw);
  if(mode==='login'){queueMicrotask(()=>this.onmessage?.({data:{version:1,operation:'video-interactions',scope:this.request.scope,closed:true,kind:'error',code:'login'}}));return;}if(mode==='error'){queueMicrotask(()=>this.onerror?.());return;}if(mode==='hold')return;
  const q=raw.command;if(mode==='api-rejected'&&q.kind==='write'){queueMicrotask(()=>this.reply({kind:'write',ack:'unknown',apiCode:-352}));return;}let value:InteractionValue;if(q.kind==='state')value={kind:'state',state:{...structuredClone(state),bvid:q.bvid}};else{const i=q.intent;if(i.kind==='like')state.liked=i.on;if(i.kind==='follow'){state.followed=i.on;state.followMode=i.on?2:0;}if(i.kind==='watch-later')state.watchLater=i.on;if(i.kind==='favorite')state.folders![0]!.selected=i.on;if(i.kind==='coin')state.coins!+=i.quantity;value={kind:'write',ack:mode==='unknown'&&i.kind==='coin'?'unknown':'accepted'};}queueMicrotask(()=>this.reply(value));
 }reply(value?:InteractionValue){this.onmessage?.({data:{version:1,operation:'video-interactions',scope:this.request.scope,closed:true,...(value?{kind:'ok',value}:{kind:'error',code:'cancelled'})}});}terminate(){this.dead=true;}}
 globalThis.Worker=Fake as unknown as typeof Worker;return{requests,workers,writes,store,runtime:new InteractionRuntime(account,writes,true),mode:(s:string)=>{mode=s;},state:(s:InteractionState)=>{state=s;},async until(n:number){for(let i=0;i<100&&workers.length<n;i++)await new Promise(r=>setTimeout(r,1));assert.equal(workers.length,n);return workers[n-1]!;},restore(){globalThis.Worker=original;}};
}
const signal=()=>new AbortController().signal;
test('F11 public capability exposes opaque folder keys, private exact binding and one-use preview grant; no confirmation or old token dispatch',async()=>{
 const f=fixture();try{const a=f.runtime.access(initial.bvid),s=await a.read(signal());assert.equal('ownerId'in s,false);assert.equal('id'in s.folders![0]!,false);assert.equal(s.folders![0]!.key,'f0');
 await assert.rejects(a.submit(s.token,{kind:'like',on:true},false,signal()),{code:'permission'});await assert.rejects(a.submit('wrong',{kind:'like',on:true},true,signal()),{code:'permission'});const result=await a.submit(s.token,{kind:'favorite',folder:'f0',on:true},true,signal());assert.equal(result.state,'confirmed');const write=f.requests.find(q=>q.command.kind==='write')!;assert.equal(write.command.kind==='write'&&write.command.intent.folderId,'456');await assert.rejects(a.submit(s.token,{kind:'like',on:true},true,signal()),{code:'permission'});assert.equal(f.requests.filter(q=>q.command.kind==='write').length,1);await f.runtime.close();assert.equal((f.runtime as unknown as {account?:PrivateAccount}).account,undefined);assert.throws(()=>f.runtime.access(initial.bvid),{code:'cancelled'});assert.ok(account.cookieLines.includes('synthetic')); }finally{f.restore();}
});
test('F14 exact triple independently journals and reads three steps; partial unknown coin cannot auto-finish or become a new coin grant',async()=>{
 for(const unknown of [false,true]){const f=fixture();try{const a=f.runtime.access(initial.bvid),s=await a.read(signal());if(unknown)f.mode('unknown');const value=await a.submit(s.token,{kind:'triple',folder:'f0',quantity:1},true,signal());assert.equal(value.state,unknown?'partial':'confirmed');assert.deepEqual(f.requests.filter(q=>q.command.kind==='write').map(q=>q.command.kind==='write'&&q.command.intent.kind),unknown?['like','coin']:['like','coin','favorite']);assert.equal(f.store.read().value.entries.length,unknown?2:3);if(unknown){const current=await a.read(signal());assert.equal(current.coinLocked,true);await assert.rejects(a.submit(current.token,{kind:'coin',quantity:1},true,signal()),{code:'permission'});}await f.runtime.close();}finally{f.restore();}}
});
test('F11 new read revokes old preview, 120-second preview expires, double in-flight confirmation is refused',async()=>{
 const f=fixture();try{const a=f.runtime.access(initial.bvid),old=await a.read(signal()),current=await a.read(signal());await assert.rejects(a.submit(old.token,{kind:'like',on:true},true,signal()),{code:'permission'});const clock=Date.now;try{Date.now=()=>clock()+120001;await assert.rejects(a.submit(current.token,{kind:'like',on:true},true,signal()),{code:'permission'});}finally{Date.now=clock;}
 const refreshed=await a.read(signal());f.mode('hold');const p=a.submit(refreshed.token,{kind:'like',on:true},true,signal());const settled=Promise.allSettled([p]);await f.until(4);await assert.rejects(a.submit(refreshed.token,{kind:'like',on:true},true,signal()),{code:'permission'});await f.runtime.reset();await settled;assert.equal(f.store.read().value.entries[0]!.state,'unknown');await f.runtime.close();}finally{f.restore();}
});
test('F11 source reset invalidates old grant and stale reader close cannot cancel new source; real close ACK is drained before replacement',async()=>{
 const f=fixture();try{const old=f.runtime.access(initial.bvid),s=await old.read(signal());await f.runtime.reset();const current=f.runtime.access('BV0000000002');f.mode('hold');const p=current.read(signal()),settled=Promise.allSettled([p]),worker=await f.until(2);await old.close();assert.equal(worker.stops,0);await assert.rejects(old.submit(s.token,{kind:'like',on:true},true,signal()),{code:'cancelled'});await f.runtime.reset();await settled;assert.equal(worker.stops,1);assert.equal(worker.dead,true);await f.runtime.close();}finally{f.restore();}
});
test('F11 poisoned optional Worker cannot produce another read/POST or fake cleanup success',async()=>{
 const f=fixture();try{const a=f.runtime.access(initial.bvid);f.mode('error');await assert.rejects(a.read(signal()),{code:'unknown'});await assert.rejects(a.read(signal()),{code:'unknown'});assert.equal(f.workers.length,1);await assert.rejects(f.runtime.close(),{code:'unknown'});}finally{f.restore();}
});

test('U4 production runtime keeps F14 paused even with an explicit token and otherwise healthy capabilities',async()=>{
 const f=fixture(),production=new InteractionRuntime(account,f.writes);try{const a=production.access(initial.bvid),s=await a.read(signal());for(const op of [{kind:'coin',quantity:1},{kind:'triple',quantity:1,folder:'f0'}] as const)await assert.rejects(a.submit(s.token,op,true,signal()),{code:'permission'});assert.equal(f.requests.filter(q=>q.command.kind==='write').length,0);assert.equal(f.store.read().value.entries.length,0);await production.close();}finally{f.restore();}
});
test('U4 runtime exposes unavailable independently, allows healthy reversal and refuses unavailable target without POST',async()=>{
 const f=fixture();try{f.state({...initial,balance:null,folders:null,unavailable:{balance:'invalid',folders:'network'}});const a=f.runtime.access(initial.bvid),s=await a.read(signal());assert.equal(s.balance,null);assert.equal(s.folders,null);assert.deepEqual(s.unavailable,{balance:'invalid',folders:'network'});const result=await a.submit(s.token,{kind:'like',on:true},true,signal());assert.equal(result.state,'confirmed');const next=await a.read(signal());await assert.rejects(a.submit(next.token,{kind:'favorite',folder:'f0',on:true},true,signal()),{code:'invalid'});assert.equal(f.requests.filter(q=>q.command.kind==='write').length,1);await f.runtime.close();}finally{f.restore();}
});

test('U4 interaction authentication loss revokes secret and all previous grants; later reads cannot silently reuse the failed session',async()=>{
 const f=fixture();try{const a=f.runtime.access(initial.bvid),s=await a.read(signal());f.mode('login');await assert.rejects(a.read(signal()),{code:'login'});assert.equal((f.runtime as unknown as {account?:PrivateAccount}).account,undefined);f.mode('normal');await assert.rejects(a.read(signal()),{code:'login'});await assert.rejects(a.submit(s.token,{kind:'like',on:true},true,signal()),{code:'login'});assert.equal(f.requests.length,2);assert.equal(f.requests.filter(q=>q.command.kind==='write').length,0);await f.runtime.close();}finally{f.restore();}
});

test('U4 failed real-shaped write response preserves safe API code through journal/readback without automatic retry',async()=>{
 const f=fixture();try{const a=f.runtime.access(initial.bvid),s=await a.read(signal());f.mode('api-rejected');const r=await a.submit(s.token,{kind:'like',on:true},true,signal());assert.equal(r.state,'not-applied');assert.deepEqual(r.diagnostics,['interaction.write.api_-352']);assert.equal(f.requests.filter(q=>q.command.kind==='write').length,1);assert.equal(f.store.read().value.entries[0]!.state,'not-applied');await f.runtime.close();}finally{f.restore();}
});

test('U4 reopen captures unresolved reversible action before reconciliation, first read issues no write and next read clears query-only indication',async()=>{
 const f=fixture();try{await f.writes.submit(account.id,initial,{kind:'like',on:true,folderId:'',quantity:0},true,signal(),async()=>{throw Error();},async()=>{throw Error();});const a=f.runtime.access(initial.bvid);const first=await a.read(signal());assert.deepEqual(first.reconciled,['like']);assert.equal(first.liked,false);assert.equal(f.requests.filter(q=>q.command.kind==='write').length,0);assert.equal(f.store.read().value.entries[0]!.state,'not-applied');assert.equal((await a.read(signal())).reconciled,undefined);await f.runtime.close();}finally{f.restore();}
});
