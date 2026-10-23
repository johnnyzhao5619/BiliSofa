import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePgcSearchCard,parsePgcSearchRequest,parsePgcSearchResult,type PgcSearchRequest} from '../../packages/contracts/src/pgc-search.ts';
import {parsePgcSearchBody} from '../../packages/bili-client/src/pgc-search.ts';
import {SearchBodyError} from '../../packages/bili-client/src/search.ts';
import {PgcSearchWorker} from '../../apps/tv/src/platform/pgc-search-worker.ts';
const scope={accountId:'guest',generation:1,mediaSessionId:'pgc-search',requestId:'r1'};
const row=(i=0)=>({type:'media_bangumi',season_id:28747+i,title:'<em class="keyword">凡人</em>修仙传',season_type_name:'国创',areas:'中国大陆',styles:'小说改/玄幻/热血/励志',index_show:'更新至第196话',ep_size:197,media_score:{score:9.7,user_count:492292},eps:[{id:1,url:'https://outside.invalid/'}],cover:'https://outside.invalid/',is_follow:1});
const body=(rows:unknown[]=Array.from({length:4},(_,i)=>row(i)),patch={})=>JSON.stringify({code:0,data:{page:1,pagesize:4,numPages:2,numResults:8,result:rows,...patch}});
const result=()=>({version:1,scope,operation:'public-pgc-search',closed:true,kind:'ok',status:200,code:'pgc.ok',...parsePgcSearchBody(body(),1)});
test('PGC scoped request rejects caller routes, credentials, foreign identity and unsupported pages',()=>{
 const q={version:1,scope,operation:'public-pgc-search',keyword:'凡人',page:1};assert.deepEqual(parsePgcSearchRequest(q),q);
 for(const patch of [{operation:'public-user-search'},{url:'https://outside.invalid/'},{cookie:'outside'},{seasonId:'28747'},{page:11},{scope:{...scope,accountId:'another'}}])assert.throws(()=>parsePgcSearchRequest({...q,...patch}));
});
test('PGC actual public row shape normalizes bounded summary without episodes, follow state or URLs',()=>{
 const r=parsePgcSearchBody(body(),1);assert.deepEqual(r.items[0],{seasonId:'28747',title:'凡人修仙传',category:'国创',region:'中国大陆',tags:'小说改/玄幻/热血/励志',status:'更新至第196话',score:9.7});assert.equal(r.items.length,4);assert.equal(r.noMore,false);assert.equal(JSON.stringify(r).includes('outside'),false);assert.equal(JSON.stringify(r).includes('is_follow'),false);
 const optional=parsePgcSearchBody(body([{type:'media_bangumi',season_id:1,title:'未提供元数据'}]),1).items[0]!;assert.deepEqual(optional,{seasonId:'1',title:'未提供元数据',category:'',region:'',tags:'',status:''});
 assert.deepEqual(parsePgcSearchBody('{"code":-352}',1),{apiCode:-352,items:[],noMore:true});assert.deepEqual(parsePgcSearchBody(body([],{numResults:0,numPages:0}),1),{apiCode:0,items:[],noMore:true});
});
test('PGC fixed format errors distinguish identity, metadata, rating and pagination without outside values',()=>{
 for(const[patch,issue]of [[{type:'video'},'type'],[{season_id:'28747'},'identity'],[{season_id:9007199254740992},'identity'],[{season_id:0},'identity'],[{title:''},'text'],[{areas:['outside']},'metadata'],[{index_show:'x\noutside'},'metadata'],[{media_score:{score:'9.7'}},'score'],[{media_score:{score:11}},'score']]as const)assert.throws(()=>parsePgcSearchBody(body([{...row(),...patch}]),1),e=>e instanceof SearchBodyError&&e.issue===issue);
 assert.throws(()=>parsePgcSearchBody(body([row(),row()]),1));assert.throws(()=>parsePgcSearchBody(body(),2));assert.throws(()=>parsePgcSearchBody('x'.repeat(524289),1));
});
test('PGC full four-card summary and maximum valid scope fit unchanged 4KiB IPC',()=>{
 const items=Array.from({length:4},(_,i)=>({seasonId:String(9007199254740991-i),title:'中'.repeat(120),category:'类'.repeat(16),region:'地'.repeat(32),tags:'材'.repeat(32),status:'更'.repeat(48),score:9.999999999999998}));const v={...result(),scope:{...scope,generation:Number.MAX_SAFE_INTEGER,mediaSessionId:'x'.repeat(64),requestId:'y'.repeat(64)},items};assert.ok(new TextEncoder().encode(JSON.stringify(v)).length<=4096);assert.equal(parsePgcSearchResult(v).items[0]!.title,items[0]!.title);
});
test('PGC normalized messages reject extra payloads, duplicates, cross-operation codes and mismatched outcomes',()=>{
 const v=result();assert.equal(parsePgcSearchResult(v).items.length,4);
 for(const patch of [{operation:'public-video-search'},{code:'up.ok'},{closed:false},{url:'https://outside.invalid/'},{items:[v.items[0],v.items[0]]},{items:[{...v.items[0],eps:[]}]},{kind:'http_error',status:412,code:'pgc.http_412'}])assert.throws(()=>parsePgcSearchResult({...v,...patch}));
 assert.throws(()=>parsePgcSearchCard({...v.items[0],seasonId:'01'}));
});
test('PGC real parent adapter dispatches only its scoped fixed operation and waits for confirmed closure',async()=>{
 const original=globalThis.Worker;const requests:PgcSearchRequest[]=[];
 class Fake{onmessage:((e:{data:unknown})=>void)|undefined;onerror:(()=>void)|undefined;constructor(file:string){assert.equal(file,'search-worker.js');}postMessage(q:PgcSearchRequest){requests.push(q);queueMicrotask(()=>this.onmessage?.({data:{...result(),scope:q.scope}}));}terminate(){}}
 globalThis.Worker=Fake as unknown as typeof Worker;try{const worker=new PgcSearchWorker();assert.equal((await worker.run({version:1,scope,operation:'public-pgc-search',keyword:'凡人',page:1},new AbortController().signal)).items.length,4);assert.equal(requests[0]!.operation,'public-pgc-search');await worker.dispose();}finally{globalThis.Worker=original;}
});
