import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseWatchLaterRequest,parseWatchLaterResult,parseWatchLaterPage} from '../../packages/contracts/src/watch-later.ts';
import {parseWatchLaterBody} from '../../packages/bili-client/src/watch-later.ts';
import {accountRuntime} from '../../apps/tv/src/platform/account-runtime.ts';
import {accountKernel} from './fake-public-kernel.ts';
const account={schema:1 as const,id:'bili_123',uid:'123',name:'合成账号',expiresAt:Date.now()+3600000,cookieLines:'.bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\tsynthetic\n'};
const scope={accountId:account.id,generation:1,mediaSessionId:'none',requestId:'r1'};
const request={version:1,operation:'watch-later-read',scope,query:{page:1},account};
const raw=(list:unknown[]=[])=>JSON.stringify({code:0,data:{has_more:false,count:list.length,list}});
test('F05 private IPC binds account/scope/page, returns only bounded display DTOs after confirmed close',()=>{
 assert.equal(parseWatchLaterRequest(request).account.id,account.id);
 for(const v of [{...request,url:'https://outside.invalid/'},{...request,scope:{...scope,accountId:'guest'}},{...request,scope:{...scope,accountId:'bili_456'}},{...request,query:{page:26}},{...request,query:{page:1,cookie:'synthetic'}}])assert.throws(()=>parseWatchLaterRequest(v));
 const page=parseWatchLaterBody(raw(),1),result={version:1,operation:'watch-later-read',scope,closed:true,kind:'ok',page};assert.equal(parseWatchLaterResult(result).kind,'ok');
 for(const v of [{...result,closed:false},{...result,account},{...result,page:{...page,cookie:'synthetic'}},{...result,page:{...page,items:Array(5).fill({title:'合成',kind:'ugc',availability:'available',partCount:1})}}])assert.throws(()=>parseWatchLaterResult(v));
});
test('F05 current official watch-later fields distinguish invalid/deleted/unknown cards and discard IDs/URLs',()=>{
 const page=parseWatchLaterBody(raw([{is_pgc:0,arc_info:{title:'<img src=x>合成',state:0,pages:[{}],cookie:'synthetic'},url:'https://outside.invalid/'},{is_pgc:1,arc_info:{title:'已失效',state:-4,pages:[]}},{arc_info:null}]),1);
 assert.deepEqual(page.items.map(c=>c.availability),['available','unavailable','unknown']);assert.equal(page.items[0]!.title,'<img src=x>合成');assert.equal(page.items[1]!.kind,'pgc');assert.equal(page.items[2]!.title,'未提供标题');assert.doesNotMatch(JSON.stringify(page),/cookie|outside.invalid/);assert.equal(parseWatchLaterPage(page).items.length,3);
 for(const input of ['x',' '.repeat(524289),raw(Array(5).fill({})),raw([{is_pgc:5}]),raw([{arc_info:{state:1.5}}]),JSON.stringify({code:0,data:{list:[],count:0,has_more:'false'}})])assert.throws(()=>parseWatchLaterBody(input,1));
 assert.throws(()=>parseWatchLaterBody('{"code":-101}',1),{code:'login'});assert.throws(()=>parseWatchLaterBody('{"code":-352}',1),{code:'network'});
});
test('F05 runtime owns private payload; cancelling stops only that transfer on the account kernel, and close closes the kernel',async()=>{
 const {kernel,workers}=accountKernel(()=>undefined);
 const runtime=accountRuntime(account,kernel),controller=new AbortController(),pending=runtime.readWatchLater!({page:1},scope,controller.signal);await new Promise(r=>setImmediate(r));
 assert.equal(workers[0]!.file,'account-read-kernel-worker.js');const sent=workers[0]!.held!.request as unknown as typeof request;assert.equal(sent.account.id,account.id);assert.deepEqual(sent.query,{page:1});
 controller.abort();await assert.rejects(pending,{code:'cancelled'});await new Promise(r=>setImmediate(r));assert.equal(workers[0]!.stops,1);assert.equal(workers[0]!.terminated,false);
 assert.deepEqual(await runtime.close(),{closed:true});assert.equal(workers[0]!.closes,1);await assert.rejects(runtime.readWatchLater!({page:1},scope,new AbortController().signal),{code:'cancelled'});
});
test('ADR-108 watch later reads 20-row batches and serves four-card pages; page 1 always reads again',async()=>{
 const rows=(n:number,from:number)=>Array.from({length:n},(_,i)=>({bvid:'BV'+String(from+i).padStart(10,'0'),is_pgc:false,arc_info:{title:'合成'+(from+i),state:0,pages:[{}]}}));
 const {kernel,requests}=accountKernel(q=>{const r=q as unknown as typeof request;const n=r.query.page===1?20:5;return {version:1,operation:'watch-later-read',scope:r.scope,closed:true,kind:'ok',page:parseWatchLaterBody(JSON.stringify({code:0,data:{has_more:r.query.page===1,count:25,list:rows(n,(r.query.page-1)*20)}}),r.query.page,20)};});
 const runtime=accountRuntime(account,kernel),signal=new AbortController().signal;
 const first=await runtime.readWatchLater!({page:1},scope,signal);assert.equal(first.items.length,4);assert.equal(first.total,25);assert.equal(first.noMore,false);
 for(let page=2;page<=5;page++)assert.equal((await runtime.readWatchLater!({page},scope,signal)).items[0]!.bvid,'BV'+String((page-1)*4).padStart(10,'0'));
 assert.equal(requests().length,1,'pages 2-5 come from the first batch');
 const last=await runtime.readWatchLater!({page:7},scope,signal);assert.equal(last.items.length,1);assert.equal(last.noMore,true);assert.equal(requests().length,2);
 await runtime.readWatchLater!({page:1},scope,signal);assert.equal(requests().length,3,'entering again re-reads the first batch');
 await runtime.close();
});
