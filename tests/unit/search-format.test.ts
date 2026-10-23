import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSearchBody,SearchBodyError} from '../../packages/bili-client/src/search.ts';
import {parseSearchResult,SEARCH_RESPONSE_ISSUES} from '../../packages/contracts/src/search.ts';
const row={type:'video',bvid:'BV0000000000',title:'合成视频',author:'合成UP',duration:'5:8',play:10};
const data={page:1,pagesize:4,numPages:1,numResults:1,result:[row]};
const body=(patch:Record<string,unknown>={})=>JSON.stringify({code:0,data:{...data,result:[{...row,...patch}]}});
test('W03 search parses official unpadded seconds without relaxing bounds or unrelated field types',()=>{
 for(let seconds=0;seconds<60;seconds++){
  assert.equal(parseSearchBody(body({duration:'5:'+seconds}),1).items[0]!.durationSec,300+seconds);
  assert.equal(parseSearchBody(body({duration:'5:'+String(seconds).padStart(2,'0')}),1).items[0]!.durationSec,300+seconds);
 }
 assert.equal(parseSearchBody(body({duration:'1440:0'}),1).items[0]!.durationSec,86400);
 for(const duration of ['5:60','5:99','5:008','5:','5:-1','5:1.5','5:1x','5: 8','5:8 ','1:2:3','1440:1','99999:1',308])assert.throws(()=>parseSearchBody(body({duration}),1),e=>e instanceof SearchBodyError&&e.issue==='duration');
});
test('W03 search malformed fields retain fixed categories without leaking outside values',()=>{
 const cases:[string,string][]=[['{','json'],['{}','envelope'],[JSON.stringify({code:0,data:{...data,page:2}}),'pagination'],[JSON.stringify({code:0,data:{...data,result:'outside'}}),'rows'],[body({type:'live'}),'type'],[body({bvid:'outside'}),'identity'],[body({duration:'outside'}),'duration'],[body({play:'outside'}),'views'],[body({title:null}),'text'],['x'.repeat(524289),'body']];
 for(const [raw,issue]of cases)assert.throws(()=>parseSearchBody(raw,1),e=>e instanceof SearchBodyError&&e.issue===issue&&!JSON.stringify(e).includes('outside'));
});
test('W03 field error IPC allows only the closed fixed vocabulary; raw suffixes and mismatched outcomes reject',()=>{
 const value={version:1,scope:{accountId:'guest',generation:1,requestId:'r1',mediaSessionId:'search'},operation:'public-video-search',closed:true,kind:'invalid_response',status:200,code:'search.invalid_response',items:[],noMore:true};
 for(const issue of SEARCH_RESPONSE_ISSUES)assert.equal(parseSearchResult({...value,code:'search.invalid_response_'+issue}).kind,'invalid_response');
 for(const code of ['search.invalid_response_raw_payload','search.invalid_response_duration_cookie=secret','search.invalid_response_http_412'])assert.throws(()=>parseSearchResult({...value,code}));
 assert.throws(()=>parseSearchResult({...value,code:'search.invalid_response_duration',apiCode:0}));assert.throws(()=>parseSearchResult({...value,kind:'http_error',status:412,code:'search.invalid_response_duration'}));
});
