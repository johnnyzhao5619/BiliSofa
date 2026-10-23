import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseFollowOffset,parseFollowUpdatesQuery,parseFollowUpdatesRequest,parseFollowUpdatesResult,type FollowUpdatesRequest} from '../../packages/contracts/src/follow-updates.ts';
import {parseFollowUpdatesBody} from '../../packages/bili-client/src/follow-updates.ts';
import {accountRuntime} from '../../apps/tv/src/platform/account-runtime.ts';
const account={schema:1 as const,id:'bili_123',uid:'123',name:'合成账号',expiresAt:Date.now()+600000,cookieLines:'.bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\tsynthetic\n'},scope={accountId:account.id,generation:1,mediaSessionId:'none',requestId:'updates1'};
const body=(count=5,next='opaque/a?x=1',more=true)=>JSON.stringify({code:0,data:{items:Array.from({length:count},(_,i)=>({id_str:'999',title:'合成更新'+i,type:i===1?64:8,author:{name:'合成作者',mid:123},pub_time:'刚刚',cover:'https://outside.invalid/',jump_url:'https://outside.invalid/',desc:'not-a-full-post'})),has_more:more,offset:next,update_baseline:'not-exported'}});
test('F04 follow IPC bounds private opaque offset/account scope; URL characters are text for native percent encoding',()=>{
 assert.equal(parseFollowOffset('a/b?x=1&y=2'),'a/b?x=1&y=2');assert.equal(parseFollowOffset(''),'');for(const v of ['a\nb','x y','中','x'.repeat(1025),1])assert.throws(()=>parseFollowOffset(v));
 const q={version:1,operation:'follow-updates-read',scope,account,offset:''};assert.equal(parseFollowUpdatesRequest(q).operation,'follow-updates-read');for(const v of [{...q,url:'outside'},{...q,scope:{...scope,accountId:'bili_456'}},{...q,offset:'a\rb'}])assert.throws(()=>parseFollowUpdatesRequest(v));for(const v of [{page:26},{page:2,refresh:true},{page:1,offset:'x'}])assert.throws(()=>parseFollowUpdatesQuery(v));
});
test('F04 follow source maps current header fields as plain summary only, stops on has_more=false and rejects cursor stalls',()=>{
 const batch=parseFollowUpdatesBody(body(),'');assert.equal(batch.items.length,5);assert.equal(batch.items[1]!.kind,'article');assert.equal(batch.items[0]!.author,'合成作者');assert.equal(batch.next,'opaque/a?x=1');assert.doesNotMatch(JSON.stringify(batch),/outside|mid|id_str|baseline|full-post/);assert.deepEqual(parseFollowUpdatesBody(body(0,'',false),''),{items:[]});assert.equal(parseFollowUpdatesBody(body(1,'ignored',false),'').next,undefined);
 for(const raw of ['x',' '.repeat(524289),body(51),body(0),body(1,''),JSON.stringify({code:0,data:{has_more:true,items:[{title:'x',type:'8'}],offset:'new'}})])assert.throws(()=>parseFollowUpdatesBody(raw,''));assert.throws(()=>parseFollowUpdatesBody(body(),'opaque/a?x=1'));assert.throws(()=>parseFollowUpdatesBody('{"code":-101}',''),{code:'login'});
});
test('F04 follow closed result rejects secret extras, unconfirmed cleanup and oversized batch',()=>{
 const r={version:1,operation:'follow-updates-read',scope,closed:true,kind:'ok',batch:parseFollowUpdatesBody(body(),'')};assert.equal(parseFollowUpdatesResult(r).kind,'ok');for(const bad of [{...r,account},{...r,closed:false},{...r,batch:{...r.batch,items:Array(51).fill(r.batch.items[0])}},{...r,batch:{...r.batch,url:'outside'}}])assert.throws(()=>parseFollowUpdatesResult(bad));
});
test('F04 follow batches keep short pages and private cursors cached; refresh and account mismatch cannot reuse snapshots',async()=>{
 const original=globalThis.Worker,requests:FollowUpdatesRequest[]=[];let mode='normal';
 class FakeWorker{onmessage:((e:{data:unknown})=>void)|undefined;onerror:(()=>void)|undefined;constructor(_file:string){}postMessage(q:FollowUpdatesRequest){requests.push(q);const batch=parseFollowUpdatesBody(q.offset===''?body():body(2,'',false),q.offset);queueMicrotask(()=>this.onmessage?.({data:mode==='normal'?{version:1,operation:q.operation,scope:q.scope,closed:true,kind:'ok',batch}:{version:1,operation:q.operation,scope:q.scope,closed:true,kind:'error',code:'network'}}));}terminate(){}}
 globalThis.Worker=FakeWorker as unknown as typeof Worker;
 try{const runtime=accountRuntime(account),signal=new AbortController().signal,a=await runtime.readFollowUpdates!({page:1},scope,signal);a.items[0]!.title='mutation';assert.equal((await runtime.readFollowUpdates!({page:2},scope,signal)).items.length,1);assert.equal(requests.length,1);assert.equal((await runtime.readFollowUpdates!({page:1},scope,signal)).items[0]!.title,'合成更新0');const third=await runtime.readFollowUpdates!({page:3},scope,signal);assert.equal(third.items.length,2);assert.equal(third.noMore,true);assert.equal(requests.length,2);assert.doesNotMatch(JSON.stringify(third),/opaque|offset/);
  await assert.rejects(runtime.readFollowUpdates!({page:1},{...scope,accountId:'bili_456'},signal),{code:'invalid'});mode='error';await assert.rejects(runtime.readFollowUpdates!({page:1,refresh:true},scope,signal),{code:'network'});await assert.rejects(runtime.readFollowUpdates!({page:2},scope,signal),{code:'invalid'});assert.deepEqual(await runtime.close(),{closed:true});
 }finally{globalThis.Worker=original;}
});
test('F04 public video IDs are bounded, same-origin and never inferred from titles, article IDs or an arbitrary URL',()=>{
 const one=(extra:object,type=8)=>JSON.stringify({code:0,data:{items:[{type,title:'x',author:{name:'y'},pub_time:'now',...extra}],has_more:false}});
 assert.equal(parseFollowUpdatesBody(one({bvid:'BV0000000001'}),'').items[0]!.bvid,'BV0000000001');
 assert.equal(parseFollowUpdatesBody(one({uri:'https://www.bilibili.com/video/BV0000000001/?x=1'}),'').items[0]!.bvid,'BV0000000001');
 for(const value of [{uri:'https://evil.invalid/video/BV0000000001'},{uri:'https://www.bilibili.com.evil.invalid/video/BV0000000001'},{uri:'javascript:BV0000000001'},{bvid:'BV0000000001',uri:'https://www.bilibili.com/video/BV0000000002'}])assert.equal(parseFollowUpdatesBody(one(value),'').items[0]!.bvid,undefined);
 assert.equal(parseFollowUpdatesBody(one({bvid:'BV0000000001'},64),'').items[0]!.bvid,undefined);
});
