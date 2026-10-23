import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseContentQuery } from '../../packages/contracts/src/content.ts';
import { PublicContentRuntime } from '../../apps/tv/src/platform/content-runtime.ts';
import type { PopularRequest } from '../../packages/contracts/src/index.ts';
test('W02 typed content route rejects arbitrary URL, credentials, private route and unbounded pagination',()=>{
 for(const value of [{route:'popular',page:0},{route:'popular',page:11},{route:'popular',page:1.1},{route:'popular',page:1,url:'https://private.invalid/'},{route:'popular',page:1,cookie:'private'},{route:'history',page:1}])assert.throws(()=>parseContentQuery(value));
 assert.deepEqual(parseContentQuery({route:'popular',page:2}),{route:'popular',page:2});
});
test('W02 actual public adapter keeps guest scope, maps errors, cancels obsolete pages and confirms Worker closure',async()=>{
 const original=globalThis.Worker,workers:FakeWorker[]=[];let mode='ok',automatic=true;
 class FakeWorker {
  onmessage:((event:{data:unknown})=>void)|undefined;onerror:(()=>void)|undefined;request:PopularRequest|undefined;terminated=false;
  constructor(public file:string){workers.push(this);}
  postMessage(request:PopularRequest & {control?:string}){if(request.control==='stop'){this.reply('cancelled');return;}this.request=request;if(automatic)queueMicrotask(()=>this.reply(mode));}
  reply(kind:string){const q=this.request!;if(!q)return;const error=kind!=='ok';this.onmessage?.({data:{version:1,scope:q.scope,operation:'guest-popular',closed:true,kind:kind==='ok'?'ok':kind==='cancelled'?'cancelled':kind==='invalid'?'invalid_response':'api_error',status:kind==='cancelled'?0:200,...(kind==='invalid'||kind==='cancelled'?{}:{apiCode:error?-101:0}),code:kind==='ok'?'guest.popular_ok':kind==='cancelled'?'guest.cancelled':kind==='invalid'?'guest.invalid_response':'guest.api_error',items:[],noMore:true}});}
  terminate(){this.terminated=true;}
 }
 globalThis.Worker=FakeWorker as unknown as typeof Worker;
 try{
  const runtime=new PublicContentRuntime();assert.deepEqual(await runtime.read({route:'popular',page:1},new AbortController().signal),{items:[],noMore:true});assert.equal(workers[0]!.request!.scope.accountId,'guest');assert.equal(workers[0]!.file,'guest-worker.js');assert.equal(workers[0]!.terminated,true);
  mode='api';await assert.rejects(runtime.read({route:'popular',page:1},new AbortController().signal),{code:'network'});mode='invalid';await assert.rejects(runtime.read({route:'popular',page:1},new AbortController().signal),{code:'invalid',detail:'guest.invalid_response'});
  automatic=false;const abort=new AbortController(),old=runtime.read({route:'popular',page:1},abort.signal);await new Promise<void>(yes=>setImmediate(yes));abort.abort();await assert.rejects(old,{code:'cancelled'});
  const fresh=runtime.read({route:'popular',page:2},new AbortController().signal);await new Promise<void>(yes=>setImmediate(yes));workers.at(-1)!.reply('ok');await fresh;
  const pending=runtime.read({route:'popular',page:3},new AbortController().signal);await new Promise<void>(yes=>setImmediate(yes));const closing=runtime.close();await assert.rejects(pending,{code:'cancelled'});assert.deepEqual(await closing,{closed:true});await assert.rejects(runtime.read({route:'popular',page:1},new AbortController().signal),{code:'cancelled'});
 }finally{globalThis.Worker=original;}
});

test('F05 popular failure retains only the validated terminal classification instead of a generic network error',async()=>{
 const {PopularReadError}=await import('../../packages/contracts/src/content.ts');
 const base={version:1,scope:{accountId:'guest',generation:1,mediaSessionId:'m',requestId:'r'},operation:'guest-popular',closed:true,items:[],noMore:true};
 for(const [kind,status,detail,domain] of [['transport_error',0,'guest.transport_28','network'],['http_error',412,'guest.http_412','network'],['invalid_response',200,'guest.invalid_response','invalid'],['transport_error',0,'guest.native_unavailable','unsupported']] as const){
  const e=new PopularReadError({...base,kind,status,code:detail});assert.equal(e.code,domain);assert.equal(e.detail,detail);
 }
 assert.throws(()=>new PopularReadError({...base,kind:'transport_error',status:0,code:'guest.transport_28 private payload'}));
 assert.throws(()=>new PopularReadError({...base,kind:'http_error',status:412,code:'guest.http_403'}));
 assert.throws(()=>new PopularReadError({...base,kind:'ok',status:200,apiCode:0,code:'guest.popular_ok'}));
});
