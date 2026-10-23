import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseHistoryCursor,parseHistoryRequest,parseHistoryResult,parseHistoryQuery,type HistoryRequest} from '../../packages/contracts/src/history.ts';
import {parseHistoryBody} from '../../packages/bili-client/src/history.ts';
import {accountRuntime} from '../../apps/tv/src/platform/account-runtime.ts';
import type {WatchLaterRequest} from '../../packages/contracts/src/watch-later.ts';
const initial={max:'0',viewAtSec:0,business:''},cursor={max:'123',viewAtSec:1700000000,business:'archive'},account={schema:1 as const,id:'bili_123',uid:'123',name:'合成账号',expiresAt:Date.now()+600000,cookieLines:'.bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\tsynthetic\n'},scope={accountId:account.id,generation:1,mediaSessionId:'none',requestId:'r1'};
const row=(n:number,business='archive')=>({title:'合成记录'+n,view_at:1700000000,progress:n===0?-1:20,duration:80,history:{business,page:1,oid:123,url:'https://outside.invalid/'}});
const body=(count=6,next:unknown={max:123,view_at:1700000000,business:'archive'})=>JSON.stringify({code:0,data:{list:Array.from({length:count},(_,i)=>row(i)),cursor:next}});
test('F05 history cursor is canonical bounded private state, never arbitrary URL/header/query input',()=>{
 assert.deepEqual(parseHistoryCursor({...cursor,max:123}),cursor);assert.equal(parseHistoryCursor({...cursor,max:'18446744073709551615'}).max,'18446744073709551615');
 for(const max of ['01','-1','18446744073709551616','0&url=x',9007199254740992])assert.throws(()=>parseHistoryCursor({...cursor,max}));
 for(const c of [{...cursor,business:'archive&x=x'},{...cursor,viewAtSec:4294967296},{...cursor,url:'outside'},{...initial,max:'1'}])assert.throws(()=>parseHistoryCursor(c));
 const q={version:1,operation:'history-read',scope,account,cursor:initial};assert.equal(parseHistoryRequest(q).cursor.max,'0');
 for(const bad of [{...q,scope:{...scope,accountId:'guest'}},{...q,scope:{...scope,accountId:'bili_456'}},{...q,cookie:'synthetic'}])assert.throws(()=>parseHistoryRequest(bad));
 for(const bad of [{page:26},{page:2,refresh:true},{page:1,refresh:false},{page:1,cursor}])assert.throws(()=>parseHistoryQuery(bad));
});
test('F05 history normalizes source progress/types only, emptiness is terminal; stalled/unsafe cursor and bad raw data are rejected',()=>{
 const parsed=parseHistoryBody(body(),parseHistoryCursor(initial));assert.equal(parsed.items.length,6);assert.equal(parsed.items[0]!.progressSec,-1);assert.deepEqual(parsed.next,cursor);assert.doesNotMatch(JSON.stringify(parsed),/outside|oid/);
 const mixed=parseHistoryBody(JSON.stringify({code:0,data:{list:[row(1,'live'),row(1,'article-list'),row(1,'cheese'),row(1,'other')],cursor:{max:'9',view_at:1700000000,business:'article-list'}}}),parseHistoryCursor(initial));assert.deepEqual(mixed.items.map(c=>c.kind),['live','article','course','unknown']);assert.equal(mixed.items[0]!.progressSec,null);assert.deepEqual(parseHistoryBody('{"code":0,"data":{"list":[]}}',parseHistoryCursor(initial)),{items:[]});
 for(const bad of ['x',' '.repeat(524289),body(101),body(2,{max:0,view_at:0,business:''}),JSON.stringify({code:0,data:{list:[{...row(0),progress:-2}],cursor:{max:1,view_at:1,business:'archive'}}})])assert.throws(()=>parseHistoryBody(bad,parseHistoryCursor(initial)));
 assert.throws(()=>parseHistoryBody('{"code":-101}',parseHistoryCursor(initial)),{code:'login'});
});
test('F05 history result rejects credentials, excess batch size and unconfirmed closure',()=>{
 const good={version:1,operation:'history-read',scope,closed:true,kind:'ok',batch:parseHistoryBody(body(),parseHistoryCursor(initial))};assert.equal(parseHistoryResult(good).kind,'ok');for(const bad of [{...good,account},{...good,closed:false},{...good,batch:{...good.batch,url:'outside'}},{...good,batch:{...good.batch,items:Array(101).fill(good.batch.items[0])}}])assert.throws(()=>parseHistoryResult(bad));
});
test('F05 history caches source batches into four-card pages without cursor exposure, skips or extra backward requests; refresh removes old pages',async()=>{
 const original=globalThis.Worker,requests:HistoryRequest[]=[];let mode='normal';
 class FakeWorker{onmessage:((e:{data:unknown})=>void)|undefined;onerror:(()=>void)|undefined;constructor(_file:string){}postMessage(q:HistoryRequest){requests.push(q);const batch=parseHistoryBody(q.cursor.max==='0'?body():q.cursor.max==='123'?body(2,{max:'124',view_at:1699999900,business:'archive'}):body(0),q.cursor);queueMicrotask(()=>this.onmessage?.({data:mode==='normal'?{version:1,operation:q.operation,scope:q.scope,closed:true,kind:'ok',batch}:{version:1,operation:q.operation,scope:q.scope,closed:true,kind:'error',code:'network'}}));}terminate(){}}
 globalThis.Worker=FakeWorker as unknown as typeof Worker;
 try{const runtime=accountRuntime(account),signal=new AbortController().signal;
  const a=await runtime.readHistory!({page:1},scope,signal);a.items[0]!.title='mutated';assert.equal((await runtime.readHistory!({page:2},scope,signal)).items.length,2);assert.equal(requests.length,1);assert.equal((await runtime.readHistory!({page:1},scope,signal)).items[0]!.title,'合成记录0');
  assert.equal((await runtime.readHistory!({page:3},scope,signal)).items.length,2);assert.equal(requests.length,2);assert.equal((await runtime.readHistory!({page:4},scope,signal)).noMore,true);assert.equal((await runtime.readHistory!({page:3},scope,signal)).noMore,true);assert.equal(requests.length,3);
  await assert.rejects(runtime.readHistory!({page:1},{...scope,accountId:'bili_456'},signal),{code:'invalid'});mode='failure';await assert.rejects(runtime.readHistory!({page:1,refresh:true},scope,signal),{code:'network'});await assert.rejects(runtime.readHistory!({page:2},scope,signal),{code:'invalid'});assert.deepEqual(await runtime.close(),{closed:true});
 }finally{globalThis.Worker=original;}
});
test('F05 switching private capabilities drains the exact old Worker; its finally cannot cancel the new read',async()=>{
 const original=globalThis.Worker,workers:FakeWorker[]=[];
 class FakeWorker{onmessage:((e:{data:unknown})=>void)|undefined;onerror:(()=>void)|undefined;q:HistoryRequest|WatchLaterRequest|undefined;terminated=false;constructor(_file:string){workers.push(this);}postMessage(q:(HistoryRequest|WatchLaterRequest)&{control?:string}){if(q.control==='stop')return;this.q=q;}reply(){const q=this.q!;this.onmessage?.({data:q.operation==='history-read'?{version:1,operation:q.operation,scope:q.scope,closed:true,kind:'ok',batch:parseHistoryBody(body(),q.cursor)}:{version:1,operation:q.operation,scope:q.scope,closed:true,kind:'ok',page:{page:1,items:[],noMore:true,total:0}}});}terminate(){this.terminated=true;}}
 globalThis.Worker=FakeWorker as unknown as typeof Worker;
 try{const runtime=accountRuntime(account),signal=new AbortController().signal;const first=runtime.readHistory!({page:1},scope,signal),rejected=assert.rejects(first,{code:'cancelled'});await new Promise(r=>setImmediate(r));const second=runtime.readWatchLater!({page:1},{...scope,requestId:'r2'},signal);await new Promise(r=>setImmediate(r));assert.equal(workers.length,1);workers[0]!.reply();await rejected;await new Promise(r=>setImmediate(r));assert.equal(workers[0]!.terminated,true);assert.equal(workers.length,2);workers[1]!.reply();assert.equal((await second).items.length,0);assert.deepEqual(await runtime.close(),{closed:true});}finally{globalThis.Worker=original;}
});
