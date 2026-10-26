import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRankingBody } from '../../packages/bili-client/src/ranking.ts';
import { parseRankingRequest, parseRankingResult, type RankingRequest } from '../../packages/contracts/src/ranking.ts';
import { ContentApiError, parseContentQuery } from '../../packages/contracts/src/content.ts';
import { PublicContentRuntime } from '../../apps/tv/src/platform/content-runtime.ts';
import { withFakeKernel, flush as kernelFlush } from './fake-public-kernel.ts';
const scope={accountId:'guest',generation:1,mediaSessionId:'ranking',requestId:'r1'};
const rawCard=(i:number)=>({bvid:'BV'+String(i).padStart(10,'0'),title:'合成标题',owner:{name:'合成UP'},duration:80,stat:{view:10}});
const body=(count=100)=>JSON.stringify({code:0,data:{list:Array.from({length:count},(_,i)=>rawCard(i))}});
const result=(q:RankingRequest, count=100)=>({version:1,scope:q.scope,operation:'public-ranking',closed:true,kind:'ok',status:200,apiCode:0,code:'ranking.ok',items:parseRankingBody(body(count)).items});
test('W03 ranking response preserves 100 service-ordered safe cards; raw body stays bounded',()=>{
 const parsed=parseRankingBody(body());assert.equal(parsed.items.length,100);assert.equal(parsed.items[99]!.bvid,'BV0000000099');
 const r={...rawCard(0),title:'<script>不会执行</script>'};assert.equal(parseRankingBody(JSON.stringify({code:0,data:{list:[r]}})).items[0]!.title,r.title);
 for(const raw of [body(101),'[]','{}','invalid',' '.repeat(524289),JSON.stringify({code:0,data:{list:[{},{bvid:'x'}]}})])assert.throws(()=>parseRankingBody(raw));
 // ADR-111: a repeated row is skipped and counted; a fractional or over-24-h duration is unknown (0).
 assert.deepEqual(parseRankingBody(JSON.stringify({code:0,data:{list:[rawCard(0),rawCard(0),{...rawCard(1),duration:1.5},{...rawCard(2),duration:166242}]}})).items.map(c=>c.durationSec),[80,0,0]);
 assert.equal(parseRankingBody(JSON.stringify({code:0,data:{list:[rawCard(0),rawCard(0)]}})).skipped,1);
 assert.deepEqual(parseRankingBody('{"code":-101}'),{apiCode:-101,items:[]});
});
test('W03 ranking IPC rejects credentials, injected routes, bad closure, duplicate cards and incoherent outcomes',()=>{
 const q={version:1,scope,operation:'public-ranking'};assert.deepEqual(parseRankingRequest(q),q);
 for(const v of [{...q,url:'https://outside.invalid/'},{...q,cookie:'synthetic'},{...q,page:1},{...q,scope:{...scope,accountId:'account'}},{...q,operation:'private-ranking'}])assert.throws(()=>parseRankingRequest(v));
 const good=result(q as RankingRequest);assert.equal(parseRankingResult(good).items.length,100);
 for(const v of [{...good,closed:false},{...good,code:'ranking.failed'},{...good,status:403},{...good,items:[good.items[0],good.items[0]]},{...good,items:[{...good.items[0],url:'https://outside.invalid/'}]},{...good,padding:'x'.repeat(131073)}])assert.throws(()=>parseRankingResult(v));
});
test('W03 typed pagination is limited to 25 ranking pages and explicit first-page refresh',()=>{
 assert.equal(new ContentApiError(-352).apiCode,-352);for(const code of [0,NaN,Infinity,1.1,-2147483649])assert.throws(()=>new ContentApiError(code));
 assert.deepEqual(parseContentQuery({route:'ranking',page:25}),{route:'ranking',page:25});
 assert.deepEqual(parseContentQuery({route:'ranking',page:1,refresh:true}),{route:'ranking',page:1,refresh:true});
 // ADR-108: 刷新 renews the shared popular snapshot too, still only on the first page.
 assert.deepEqual(parseContentQuery({route:'popular',page:1,refresh:true}),{route:'popular',page:1,refresh:true});
 for(const v of [{route:'ranking',page:26},{route:'ranking',page:2,refresh:true},{route:'popular',page:2,refresh:true},{route:'ranking',page:1,refresh:false}])assert.throws(()=>parseContentQuery(v));
});
test('W03 catalog caches exactly 25 four-card pages, returns copies, and explicitly refreshes without stale fallback',async()=>{
 let mode='ok';
 await withFakeKernel(q=>mode==='ok'?result(q as RankingRequest):{...result(q as RankingRequest),kind:'api_error',apiCode:-101,code:'ranking.api_error',items:[]},async workers=>{
  const runtime=new PublicContentRuntime(),signal=new AbortController().signal,requests=()=>workers[0]?.requests.length??0;
  await assert.rejects(runtime.read({route:'ranking',page:2},signal),{code:'invalid'});assert.equal(requests(),0);
  const first=await runtime.read({route:'ranking',page:1},signal);first.items[0]!.title='mutated';assert.equal(workers[0]!.file,'public-kernel-worker.js');
  for(let page=2;page<=25;page++){const r=await runtime.read({route:'ranking',page},signal);assert.equal(r.items.length,4);assert.equal(r.items[0]!.bvid,'BV'+String((page-1)*4).padStart(10,'0'));assert.equal(r.noMore,page===25);}
  assert.equal((await runtime.read({route:'ranking',page:1},signal)).items[0]!.title,'合成标题');assert.equal(requests(),1);
  // ADR-108: another runtime (the shelf vs. its full grid) reuses the same list for five minutes.
  await new PublicContentRuntime().read({route:'ranking',page:1},signal);assert.equal(requests(),1);
  mode='fail';await assert.rejects(runtime.read({route:'ranking',page:1,refresh:true},signal),{code:'network'});await assert.rejects(runtime.read({route:'ranking',page:2},signal),{code:'invalid'});assert.equal(requests(),2);
  mode='ok';await runtime.read({route:'ranking',page:1,refresh:true},signal);assert.equal(requests(),3);assert.deepEqual(await runtime.close(),{closed:true});
 });
});
test('W03 changing public route cancels only the old transfer on the shared kernel; Home cannot refill cache',async()=>{
 await withFakeKernel(()=>undefined,async workers=>{
  const runtime=new PublicContentRuntime(),signal=new AbortController().signal;
  const old=runtime.read({route:'ranking',page:1},signal),oldCheck=assert.rejects(old,{code:'cancelled'});await kernelFlush();assert.equal(workers.length,1);
  const fresh=runtime.read({route:'popular',page:1},signal);await oldCheck;await kernelFlush();
  assert.equal(workers[0]!.stops,1);assert.equal(workers[0]!.terminated,false);assert.equal(workers.length,1,'the kernel and its connections stay');
  const held=workers[0]!.held!.request;assert.equal(held.operation,'guest-popular');
  workers[0]!.reply({...result(held as unknown as RankingRequest,0),operation:'guest-popular',code:'guest.popular_ok',noMore:true});await fresh;
  await assert.rejects(runtime.read({route:'ranking',page:2},signal),{code:'invalid'});
  const pending=runtime.read({route:'ranking',page:1},signal),pendingCheck=assert.rejects(pending,{code:'cancelled'});await kernelFlush();const closure=runtime.close();await pendingCheck;assert.deepEqual(await closure,{closed:true});
  await assert.rejects(runtime.read({route:'ranking',page:1},signal),{code:'cancelled'});
 });
});
