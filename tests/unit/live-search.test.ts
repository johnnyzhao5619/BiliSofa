import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLiveSearchCard,parseLiveSearchRequest,parseLiveSearchResult,type LiveSearchRequest} from '../../packages/contracts/src/live-search.ts';
import {parseLiveSearchBody} from '../../packages/bili-client/src/live-search.ts';
import {SearchBodyError} from '../../packages/bili-client/src/search.ts';
import {LiveSearchWorker} from '../../apps/tv/src/platform/live-search-worker.ts';
const scope={accountId:'guest',generation:1,mediaSessionId:'live-search',requestId:'r1'};
const row=(i=0)=>({type:'live_room',roomid:100+i,title:'<em class="keyword">音乐</em>直播',uname:'合成主播',cate_name:'音乐',tags:'轻松,流行',online:12345,live_status:1,uid:321,short_id:1,cover:'https://outside.invalid/',url:'https://outside.invalid/',live_time:'ignored',attentions:123});
const body=(rows:unknown[]=Array.from({length:4},(_,i)=>row(i)),patch={})=>JSON.stringify({code:0,data:{page:1,pagesize:4,numPages:2,numResults:8,result:rows,...patch}});
const result=()=>({version:1,scope,operation:'public-live-search',closed:true,kind:'ok',status:200,code:'live.ok',...parseLiveSearchBody(body(),1)});
test('Live search requests bind anonymous scope, keyword/page only and reject destinations/credentials',()=>{
 const q={version:1,scope,operation:'public-live-search',keyword:'音乐',page:1};assert.deepEqual(parseLiveSearchRequest(q),q);
 for(const patch of [{operation:'public-pgc-search'},{url:'https://outside.invalid/'},{cookie:'outside'},{roomId:'1'},{page:11},{scope:{...scope,accountId:'another'}}])assert.throws(()=>parseLiveSearchRequest({...q,...patch}));
});
test('Live actual room shape normalizes canonical room identity and snapshot; links, images and aliases never cross IPC',()=>{
 const r=parseLiveSearchBody(body(),1);assert.deepEqual(r.items[0],{roomId:'100',title:'音乐直播',owner:'合成主播',category:'音乐',tags:'轻松,流行',popularity:12345,state:'live'});assert.equal(r.items.length,4);assert.equal(r.noMore,false);assert.equal(JSON.stringify(r).includes('outside'),false);assert.equal(JSON.stringify(r).includes('short_id'),false);
 for(const live_status of [undefined,null,0,2])assert.equal(parseLiveSearchBody(body([{...row(),live_status,cate_name:null,tags:''}]),1).items[0]!.state,'unknown');
 assert.deepEqual(parseLiveSearchBody('{"code":-352}',1),{apiCode:-352,items:[],noMore:true});assert.deepEqual(parseLiveSearchBody(body([],{numResults:0,numPages:0}),1),{apiCode:0,items:[],noMore:true});
});
test('Live malformed identity, count, state, text, metadata and pages reject with fixed categories',()=>{
 for(const[patch,issue]of [[{type:'video'},'type'],[{roomid:'100'},'identity'],[{roomid:9007199254740992},'identity'],[{roomid:0},'identity'],[{title:''},'text'],[{uname:''},'text'],[{tags:['outside']},'metadata'],[{online:'1万'},'counts'],[{online:-1},'counts'],[{live_status:'1'},'state'],[{live_status:3},'state']]as const)assert.throws(()=>parseLiveSearchBody(body([{...row(),...patch}]),1),e=>e instanceof SearchBodyError&&e.issue===issue);
 assert.throws(()=>parseLiveSearchBody(body([row(),row()]),1));assert.throws(()=>parseLiveSearchBody(body(),2));assert.throws(()=>parseLiveSearchBody('x'.repeat(524289),1));
});
test('Live full four-card metadata with maximum valid scope fits original 4KiB IPC',()=>{
 const items=Array.from({length:4},(_,i)=>({roomId:String(9007199254740991-i),title:'中'.repeat(120),owner:'播'.repeat(48),category:'类'.repeat(32),tags:'签'.repeat(32),popularity:Number.MAX_SAFE_INTEGER,state:'unknown'}));const v={...result(),scope:{...scope,generation:Number.MAX_SAFE_INTEGER,mediaSessionId:'x'.repeat(64),requestId:'y'.repeat(64)},items};assert.ok(new TextEncoder().encode(JSON.stringify(v)).length<=4096);assert.equal(parseLiveSearchResult(v).items[0]!.title,items[0]!.title);
});
test('Live normalized IPC rejects extra payloads, duplicate rooms, cross-operation codes and wrong outcomes',()=>{
 const v=result();assert.equal(parseLiveSearchResult(v).items.length,4);
 for(const patch of [{operation:'public-user-search'},{code:'pgc.ok'},{closed:false},{url:'https://outside.invalid/'},{items:[v.items[0],v.items[0]]},{items:[{...v.items[0],uid:'123'}]},{kind:'http_error',status:412,code:'live.http_412'}])assert.throws(()=>parseLiveSearchResult({...v,...patch}));
 assert.throws(()=>parseLiveSearchCard({...v.items[0],roomId:'01'}));assert.throws(()=>parseLiveSearchCard({...v.items[0],state:'playing'}));
});
test('Live real parent adapter dispatches only fixed room-search operation and confirms Worker closure',async()=>{
 const original=globalThis.Worker;const requests:LiveSearchRequest[]=[];
 class Fake{onmessage:((e:{data:unknown})=>void)|undefined;onerror:(()=>void)|undefined;constructor(file:string){assert.equal(file,'search-worker.js');}postMessage(q:LiveSearchRequest){requests.push(q);queueMicrotask(()=>this.onmessage?.({data:{...result(),scope:q.scope}}));}terminate(){}}
 globalThis.Worker=Fake as unknown as typeof Worker;try{const worker=new LiveSearchWorker();assert.equal((await worker.run({version:1,scope,operation:'public-live-search',keyword:'音乐',page:1},new AbortController().signal)).items.length,4);assert.equal(requests[0]!.operation,'public-live-search');await worker.dispose();}finally{globalThis.Worker=original;}
});
