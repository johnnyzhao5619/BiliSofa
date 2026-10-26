import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHotSearchBody} from '../../packages/bili-client/src/hot-search.ts';
import {parseHotSearchRequest,parseHotSearchResult} from '../../packages/contracts/src/hot-search.ts';
const scope={accountId:'guest',generation:1,mediaSessionId:'search-hot',requestId:'r1'};
const rows=()=>Array.from({length:10},(_,i)=>({pos:i+1,keyword:'关键词'+i,show_name:'热词显示'+i,goto_type:0,icon:'https://outside.invalid/',goto_value:'ignored',stat_datas:{unneeded:true}}));
const body=(list:unknown=rows())=>JSON.stringify({code:0,list,seid:'not retained',top_list:[{url:'https://outside.invalid/'}]});
test('hot words retain only ranked search terms and ignore remote destinations and tracking',()=>{
 const value=parseHotSearchBody(body());assert.equal(value.apiCode,0);assert.equal(value.items.length,10);assert.deepEqual(value.items[0],{rank:1,keyword:'关键词0',label:'热词显示0'});
 const list=rows();list[0]!.goto_type=1;assert.equal(parseHotSearchBody(body(list)).items[0]!.rank,2);
 assert.deepEqual(parseHotSearchBody(body([])),{apiCode:0,items:[]});assert.deepEqual(parseHotSearchBody('{"code":-352,"message":"outside"}'),{apiCode:-352,items:[]});
});
// ADR-111: a malformed, repeated or out-of-order term is skipped and counted; kept ranks stay the source's.
test('hot words reject oversized or wholly malformed data and skip single bad, repeated or unordered terms',()=>{
 for(const value of ['{',body('no'),body([...rows(),rows()[0]]),'x'.repeat(65537),'{"code":0.5}',body([{pos:0}]),body([{pos:1,keyword:'',show_name:'x',goto_type:0}])])assert.throws(()=>parseHotSearchBody(value));
 for(const patch of [{keyword:'x'.repeat(33)},{keyword:'x\u0000'},{show_name:'x'.repeat(81)},{show_name:''},{pos:0},{pos:1.5}]){const list=rows();Object.assign(list[0]!,patch);const v=parseHotSearchBody(body(list));assert.equal(v.items.length,9);assert.equal(v.items[0]!.rank,2);assert.equal(v.skipped,1);}
 const repeated=rows();repeated[1]!.keyword=repeated[0]!.keyword;assert.deepEqual(parseHotSearchBody(body(repeated)).items.map(t=>t.rank).slice(0,2),[1,3]);
 const reversed=parseHotSearchBody(body(rows().reverse()));assert.deepEqual(reversed.items.map(t=>t.rank),[10]);assert.equal(reversed.skipped,9);
});
test('hot-search IPC accepts no route, URL, credentials or payload and remains anonymous',()=>{
 const value={version:1,scope,operation:'public-search-hot'};assert.deepEqual(parseHotSearchRequest(value),value);
 for(const extra of [{url:'https://outside.invalid/'},{keyword:'x'},{page:1},{cookie:'x'},{payload:null}])assert.throws(()=>parseHotSearchRequest({...value,...extra}));
 assert.throws(()=>parseHotSearchRequest({...value,scope:{...scope,accountId:'account-a'}}));
});
test('hot-search terminal frames require native closure, bounded normalized terms and truthful status',()=>{
 const value={version:1,scope,operation:'public-search-hot',closed:true,kind:'ok',status:200,apiCode:0,code:'hot.ok',items:parseHotSearchBody(body()).items};assert.deepEqual(parseHotSearchResult(value),value);
 for(const patch of [{closed:false},{status:206},{apiCode:-1},{kind:'http_error'},{items:[...value.items,value.items[0]]},{items:[{...value.items[0],url:'https://outside.invalid/'}]},{code:'hot.url_secret'}])assert.throws(()=>parseHotSearchResult({...value,...patch}));
 for(const failure of [{kind:'http_error',status:412,code:'hot.http_412'},{kind:'transport_error',status:0,code:'hot.transport_28'},{kind:'cancelled',status:0,code:'hot.cancelled'},{kind:'api_error',status:200,apiCode:-352,code:'hot.api_error'}]){
  const {apiCode:_,...base}=value;assert.doesNotThrow(()=>parseHotSearchResult({...base,items:[],...failure}));
 }
 assert.throws(()=>parseHotSearchResult({...value,kind:'http_error',status:412,apiCode:undefined,code:'hot.http_412'}));
});
