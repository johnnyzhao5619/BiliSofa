import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseSearchKeyword,parseSearchRequest,parseSearchResult,SearchReadError,type SearchRequest} from '../../packages/contracts/src/search.ts';
import {parseSearchBody,searchTitle} from '../../packages/bili-client/src/search.ts';
import {parseContentQuery} from '../../packages/contracts/src/content.ts';
import {PublicContentRuntime} from '../../apps/tv/src/platform/content-runtime.ts';
const scope={accountId:'guest',generation:1,mediaSessionId:'search',requestId:'r1'};
const query:SearchRequest={version:1,scope,operation:'public-video-search',keyword:'你好',page:1};
const row=(i=0)=>({type:'video',bvid:'BV'+String(i).padStart(10,'0'),title:'<em class="keyword">你好</em> &lt;世界&gt;',author:'合成UP',duration:'12:34',play:123});
const body=(page=1,list=Array.from({length:4},(_,i)=>row(i)))=>JSON.stringify({code:0,data:{page,pagesize:4,numPages:20,numResults:80,result:list}});
const result=(q=query)=>({version:1,scope:q.scope,operation:q.operation,closed:true,kind:'ok',status:200,code:'search.ok',...parseSearchBody(body(q.page),q.page)});
const flush=()=>new Promise<void>(yes=>setImmediate(yes));
test('W03 search keywords and IPC are bounded Unicode text, never credentials or a URL route',()=>{
 for(const v of ['你好','A&x=1','😀'.repeat(32),'a'.repeat(32)])assert.equal(parseSearchKeyword(v),v);
 for(const v of ['',null,' a','a ','a'.repeat(33),'\u0000','\ud800','\udfff','\u0085'])assert.throws(()=>parseSearchKeyword(v));
 assert.deepEqual(parseSearchRequest(query),query);assert.deepEqual(parseContentQuery({route:'search',page:10,keyword:'你好'}),{route:'search',page:10,keyword:'你好'});
 for(const v of [{...query,url:'https://outside.invalid/'},{...query,cookie:'secret'},{...query,page:11},{...query,scope:{...scope,accountId:'private'}},{...query,keyword:'x'.repeat(33)}])assert.throws(()=>parseSearchRequest(v));
 for(const v of [{route:'search',page:1,keyword:'你好',refresh:true},{route:'search',page:1},{route:'search',page:11,keyword:'x'}])assert.throws(()=>parseContentQuery(v));
});
test('W03 public search strips only known highlight tags and parses minutes/seconds without outside HTML execution',()=>{
 const v=parseSearchBody(body(),1);assert.equal(v.items.length,4);assert.equal(v.items[0]!.title,'你好 &lt;世界&gt;');assert.equal(v.items[0]!.durationSec,754);assert.equal(v.noMore,false);
 assert.equal(searchTitle('<script>text</script>'),'<script>text</script>');assert.equal(searchTitle('<em onclick="outside()">text</em>'),'<em onclick="outside()">text');
 assert.equal(parseSearchBody(body(10),10).noMore,true);assert.deepEqual(parseSearchBody('{"code":-352}',1),{apiCode:-352,items:[],noMore:true});
 assert.deepEqual(parseSearchBody('{"code":0,"data":{"page":1,"pagesize":4,"numResults":0,"numPages":0}}',1),{apiCode:0,items:[],noMore:true});
});
test('W03 search parser rejects unrelated types, mismatched pages, malformed time, duplicates and oversized response',()=>{
 for(const raw of [body(2),body(1,[row(0),row(0)]),body(1,[{...row(),type:'live'}]),body(1,[{...row(),duration:'1:99'}]),body(1,[{...row(),duration:'9999:59'}]),body(1,[{...row(),play:'123' as unknown as number}]),body(1,Array.from({length:5},(_,i)=>row(i))),' '.repeat(524289),'{}'])assert.throws(()=>parseSearchBody(raw,1));
});
test('W03 search result closure and failure consistency are runtime-checked',()=>{
 const v=result();assert.throws(()=>new SearchReadError(v));assert.throws(()=>new SearchReadError({...v,kind:'http_error',status:403,code:'https://outside.invalid/raw'}));assert.equal(new SearchReadError({...v,kind:'http_error',status:403,apiCode:undefined,items:[],noMore:true,code:'search.http_403'}).detail,'search.http_403');assert.equal(parseSearchResult(v).items.length,4);
 for(const bad of [{...v,closed:false},{...v,status:403},{...v,kind:'api_error',apiCode:-352},{...v,items:[{...v.items[0],url:'https://outside.invalid/'}]},{...v,noMore:undefined},{...v,code:'private.raw'}])assert.throws(()=>parseSearchResult(bad));
});
test('W03 real public content adapter dispatches keyword/page only to search Worker and maps API code without raw message',async()=>{
 const original=globalThis.Worker,requests:SearchRequest[]=[];let code=0;
 class Fake{onmessage:((v:{data:unknown})=>void)|undefined;onerror:(()=>void)|undefined;constructor(file:string){assert.equal(file,'search-worker.js');}postMessage(q:SearchRequest){requests.push(q);queueMicrotask(()=>this.onmessage?.({data:code?{...result(q),kind:'api_error',apiCode:code,code:'search.api_error',items:[],noMore:true}:result(q)}));}terminate(){}}
 globalThis.Worker=Fake as unknown as typeof Worker;
 try{const runtime=new PublicContentRuntime(),signal=new AbortController().signal;assert.equal((await runtime.read({route:'search',keyword:'你好',page:1},signal)).items.length,4);assert.equal(requests[0]!.scope.accountId,'guest');assert.equal(requests[0]!.keyword,'你好');assert.equal(requests[0]!.operation,'public-video-search');await runtime.read({route:'search',keyword:'世界',page:2},signal);assert.equal(requests[1]!.page,2);code=-352;await assert.rejects(runtime.read({route:'search',keyword:'你好',page:1},signal),{code:'network',apiCode:-352});assert.deepEqual(await runtime.close(),{closed:true});}finally{globalThis.Worker=original;}
});
test('W03 replacing an in-flight search rejects old results and closes before a new keyword; closing cancels the final read',async()=>{
 const original=globalThis.Worker,workers:Fake[]=[];
 class Fake{onmessage:((v:{data:unknown})=>void)|undefined;onerror:(()=>void)|undefined;q:SearchRequest|undefined;terminated=false;constructor(){workers.push(this);}postMessage(q:SearchRequest&{control?:string}){if(q.control==='stop'){queueMicrotask(()=>this.reply());return;}this.q=q;}reply(){this.onmessage?.({data:result(this.q!)});}terminate(){this.terminated=true;}}
 globalThis.Worker=Fake as unknown as typeof Worker;
 try{const r=new PublicContentRuntime(),signal=new AbortController().signal;const a=r.read({route:'search',keyword:'旧',page:1},signal),rejected=assert.rejects(a,{code:'cancelled'});await flush();const b=r.read({route:'search',keyword:'新',page:1},signal);await rejected;await flush();assert.equal(workers[0]!.terminated,true);assert.equal(workers[1]!.q!.keyword,'新');workers[1]!.reply();await b;const pending=r.read({route:'search',keyword:'最后',page:1},signal),check=assert.rejects(pending,{code:'cancelled'});await flush();const close=r.close();await check;assert.deepEqual(await close,{closed:true});}finally{globalThis.Worker=original;}
});
