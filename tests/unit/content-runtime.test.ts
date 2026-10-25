import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseContentQuery } from '../../packages/contracts/src/content.ts';
import { PublicContentRuntime } from '../../apps/tv/src/platform/content-runtime.ts';
import type { PopularRequest } from '../../packages/contracts/src/index.ts';
import { withFakeKernel, flush as kernelFlush } from './fake-public-kernel.ts';
import type { KernelRequest } from '../../packages/contracts/src/public-kernel.ts';
test('W02 typed content route rejects arbitrary URL, credentials, private route and unbounded pagination',()=>{
 for(const value of [{route:'popular',page:0},{route:'popular',page:26},{route:'popular',page:1.1},{route:'popular',page:1,url:'https://private.invalid/'},{route:'popular',page:1,cookie:'private'},{route:'history',page:1}])assert.throws(()=>parseContentQuery(value));
 assert.deepEqual(parseContentQuery({route:'popular',page:2}),{route:'popular',page:2});
});
test('W02 actual public adapter keeps guest scope, maps errors, cancels obsolete pages and shares one kernel (ADR-108)',async()=>{
 let mode='ok',automatic=true;const signal=()=>new AbortController().signal;
 const batch=(q:KernelRequest)=>({version:1,scope:q.scope,operation:'guest-popular',closed:true,kind:mode==='ok'?'ok':mode==='invalid'?'invalid_response':'api_error',status:200,...(mode==='ok'?{apiCode:0,code:'guest.popular_ok'}:mode==='invalid'?{code:'guest.invalid_response'}:{apiCode:-352,code:'guest.api_error'}),items:[],noMore:true});
 await withFakeKernel(q=>automatic?batch(q):undefined,async workers=>{
  const runtime=new PublicContentRuntime();
  assert.deepEqual(await runtime.read({route:'popular',page:1},signal()),{items:[],noMore:true});
  const sent=workers[0]!.requests[0]!.request as PopularRequest;assert.equal(workers[0]!.file,'public-kernel-worker.js');assert.equal(sent.scope.accountId,'guest');assert.equal(sent.page,1);
  // The (empty) snapshot is reused; 刷新 asks the kernel again.
  await runtime.read({route:'popular',page:1},signal());assert.equal(workers[0]!.requests.length,1);
  mode='api';await assert.rejects(runtime.read({route:'popular',page:1,refresh:true},signal()),{code:'network'});
  mode='invalid';await assert.rejects(runtime.read({route:'popular',page:1,refresh:true},signal()),{code:'invalid',detail:'guest.invalid_response'});
  automatic=false;const abort=new AbortController(),old=runtime.read({route:'popular',page:1,refresh:true},abort.signal);await kernelFlush();abort.abort();await assert.rejects(old,{code:'cancelled'});await kernelFlush();assert.equal(workers[0]!.stops,1);
  const fresh=runtime.read({route:'popular',page:1,refresh:true},signal());await kernelFlush();mode='ok';workers[0]!.reply(batch(workers[0]!.held!.request));await fresh;
  const pending=runtime.read({route:'popular',page:1,refresh:true},signal());await kernelFlush();const closing=runtime.close();await assert.rejects(pending,{code:'cancelled'});assert.deepEqual(await closing,{closed:true});
  assert.equal(workers.length,1);assert.equal(workers[0]!.terminated,false,'cancelling a page never replaces the kernel');
 });
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
