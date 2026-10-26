import test from 'node:test';
import assert from 'node:assert/strict';
import {parseUserSearchCard,parseUserSearchRequest,parseUserSearchResult,type UserSearchRequest} from '../../packages/contracts/src/user-search.ts';
import {parseUserSearchBody} from '../../packages/bili-client/src/user-search.ts';
import {SearchBodyError} from '../../packages/bili-client/src/search.ts';
import {UserSearchWorker} from '../../apps/tv/src/platform/user-search-worker.ts';
const scope={accountId:'guest',generation:1,mediaSessionId:'user-search',requestId:'r1'};
const preview=(i=0)=>({bvid:'BV'+String(i).padStart(10,'0'),title:'<em class="keyword">你好</em>投稿',duration:'2:6',play:'123',arcurl:'https://outside.invalid/',owner:'ignored'});
const row=(i=0)=>({type:'bili_user',mid:i+1,uname:'合成UP',fans:123,videos:2,upic:'https://outside.invalid/',usign:'ignored',res:[preview(i),preview(i+4),preview(i+8)]});
const body=(rows:unknown[]=Array.from({length:4},(_,i)=>row(i)),patch={})=>JSON.stringify({code:0,data:{page:1,pagesize:4,numPages:2,numResults:8,result:rows,...patch}});
const result=()=>({version:1,scope,operation:'public-user-search',closed:true,kind:'ok',status:200,code:'up.ok',...parseUserSearchBody(body(),1)});
test('UP requests remain scoped anonymous typed queries with no caller destination or credentials',()=>{
 const request={version:1,scope,operation:'public-user-search',keyword:'你好',page:1};assert.deepEqual(parseUserSearchRequest(request),request);
 for(const patch of [{operation:'public-video-search'},{url:'https://outside.invalid/'},{cookie:'outside'},{page:26},{uid:'123'},{scope:{...scope,accountId:'account-a'}}])assert.throws(()=>parseUserSearchRequest({...request,...patch}));
});
test('UP parser preserves identity/counts and one full attached card, ignoring links, signature and unused previews',()=>{
 const r=parseUserSearchBody(body(),1);assert.equal(r.items.length,4);assert.equal(r.noMore,false);assert.deepEqual(r.items[0],{uid:'1',name:'合成UP',fans:123,videos:2,preview:{bvid:'BV0000000000',title:'你好投稿',owner:'合成UP',durationSec:126,views:123}});
 assert.equal(JSON.stringify(r).includes('outside'),false);assert.equal(JSON.stringify(r).includes('ignored'),false);
 assert.equal(parseUserSearchBody(body([{...row(),res:[]}]),1).items[0]!.preview,undefined);
 assert.deepEqual(parseUserSearchBody('{"code":-352}',1),{apiCode:-352,items:[],noMore:true});assert.deepEqual(parseUserSearchBody(body([],{numResults:0,numPages:0}),1),{apiCode:0,items:[],noMore:true});
});
// ADR-111: an unusable user row is skipped and counted (a page of only unusable rows still rejects as `rows`);
// unreadable counts read as 0, an unreadable preview is dropped, a malformed preview time is unknown (0).
test('UP malformed rows are skipped, unreadable previews dropped, and all-unusable pages or bad pagination reject',()=>{
 for(const patch of [{type:'video'},{mid:9007199254740992},{mid:0},{mid:'1'},{uname:''}])assert.throws(()=>parseUserSearchBody(body([{...row(),...patch}]),1),e=>e instanceof SearchBodyError&&e.issue==='rows');
 assert.deepEqual(parseUserSearchBody(body([{...row(),fans:'1',videos:-1}]),1).items.map(c=>[c.fans,c.videos]),[[0,0]]);
 for(const res of [[{...preview(),bvid:'outside'}],Array.from({length:4},()=>preview()),[{...preview(),title:''}]])assert.equal(parseUserSearchBody(body([{...row(),res}]),1).items[0]!.preview,undefined);
 assert.deepEqual(parseUserSearchBody(body([{...row(),res:[{...preview(),duration:'2:99',play:'1万'}]}]),1).items[0]!.preview!.durationSec,0);
 const mixed=parseUserSearchBody(body([row(),row(),{...row(1),type:'video'}]),1);assert.equal(mixed.items.length,1);assert.equal(mixed.skipped,2);
 assert.equal(parseUserSearchResult({...result(),items:mixed.items,skipped:2}).skipped,2);assert.throws(()=>parseUserSearchResult({...result(),skipped:1}));
 assert.throws(()=>parseUserSearchBody(body(),2));assert.throws(()=>parseUserSearchBody('x'.repeat(524289),1));
});
test('UP four-card worst bounded text and statistics fit existing 4KiB IPC without shortening card titles',()=>{
 const name='中'.repeat(48),title='视'.repeat(120),items=Array.from({length:4},(_,i)=>({uid:String(9007199254740991-i),name,fans:Number.MAX_SAFE_INTEGER,videos:Number.MAX_SAFE_INTEGER,preview:{bvid:'BV'+String(i).padStart(10,'0'),title,owner:name,durationSec:86400,views:Number.MAX_SAFE_INTEGER}}));
 const value={...result(),scope:{...scope,generation:Number.MAX_SAFE_INTEGER,mediaSessionId:'x'.repeat(64),requestId:'y'.repeat(64)},items};assert.ok(new TextEncoder().encode(JSON.stringify(value)).length<=4096);assert.equal(parseUserSearchResult(value).items[0]!.preview!.title,title);
});
test('UP result rejects cross-operation/error-prefix, duplicate identity, extra fields and mismatched preview owner',()=>{
 const value=result();assert.equal(parseUserSearchResult(value).items.length,4);
 for(const patch of [{operation:'public-video-search'},{code:'search.ok'},{closed:false},{url:'https://outside.invalid/'},{items:[value.items[0],value.items[0]]},{items:[{...value.items[0],cookie:'outside'}]},{items:[{...value.items[0],preview:{...value.items[0]!.preview,owner:'another'}}]}])assert.throws(()=>parseUserSearchResult({...value,...patch}));
 assert.throws(()=>parseUserSearchCard({...value.items[0],uid:'01'}));assert.throws(()=>parseUserSearchCard({...value.items[0],uid:'9007199254740992'}));
});
test('UP platform port dispatches only the user operation to the shared scoped Worker and confirms close',async()=>{
 const original=globalThis.Worker;const requests:UserSearchRequest[]=[];
 class Fake{onmessage:((e:{data:unknown})=>void)|undefined;onerror:(()=>void)|undefined;constructor(file:string){assert.equal(file,'search-worker.js');}postMessage(q:UserSearchRequest){requests.push(q);queueMicrotask(()=>this.onmessage?.({data:{...result(),scope:q.scope}}));}terminate(){}}
 globalThis.Worker=Fake as unknown as typeof Worker;
 try{const worker=new UserSearchWorker();assert.equal((await worker.run({version:1,scope,operation:'public-user-search',keyword:'你好',page:1},new AbortController().signal)).items.length,4);assert.equal(requests[0]!.operation,'public-user-search');await worker.dispose();}finally{globalThis.Worker=original;}
});
