import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseWatchLaterRequest,parseWatchLaterResult,parseWatchLaterPage} from '../../packages/contracts/src/watch-later.ts';
import {parseWatchLaterBody} from '../../packages/bili-client/src/watch-later.ts';
import {accountRuntime} from '../../apps/tv/src/platform/account-runtime.ts';
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
test('F05 runtime owns private payload and waits native ACK on cancellation before another request/close',async()=>{
 const original=globalThis.Worker,workers:FakeWorker[]=[];
 class FakeWorker{onmessage:((e:{data:unknown})=>void)|undefined;onerror:(()=>void)|undefined;request:typeof request|undefined;terminated=false;constructor(file:string){assert.equal(file,'library-worker.js');workers.push(this);}postMessage(q:typeof request&{control?:string}){if(q.control==='stop')return;this.request=q;}reply(){this.onmessage?.({data:{version:1,operation:'watch-later-read',scope:this.request!.scope,closed:true,kind:'ok',page:parseWatchLaterBody(raw(),1)}});}terminate(){this.terminated=true;}}
 globalThis.Worker=FakeWorker as unknown as typeof Worker;
 try{const runtime=accountRuntime(account),controller=new AbortController(),pending=runtime.readWatchLater!({page:1},scope,controller.signal);let ended=false;const check=assert.rejects(pending,{code:'cancelled'}).then(()=>{ended=true;});await new Promise(r=>setImmediate(r));controller.abort();await new Promise(r=>setImmediate(r));assert.equal(ended,false);assert.equal(workers[0]!.terminated,false);workers[0]!.reply();await check;assert.equal(workers[0]!.terminated,true);assert.deepEqual(await runtime.close(),{closed:true});await assert.rejects(runtime.readWatchLater!({page:1},scope,new AbortController().signal),{code:'cancelled'});}finally{globalThis.Worker=original;}
});
