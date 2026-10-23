import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePublicSearchKeys,searchSigningKeyword} from '../../packages/bili-client/src/search-wbi.ts';
import {parseSearchResult} from '../../packages/contracts/src/search.ts';
const img='a'.repeat(32),sub='b'.repeat(32);
const data={isLogin:false,wbi_img:{img_url:`https://i0.hdslb.com/bfs/wbi/${img}.png`,sub_url:`https://i1.hdslb.com/bfs/wbi/${sub}.png`}};
const body=(code=-101,patch:Record<string,unknown>={})=>JSON.stringify({code,data:{...data,...patch}});
test('anonymous public nav accepts not-logged-in public material without importing identity or outside metadata',()=>{
 for(const code of [-101,0])assert.deepEqual(parsePublicSearchKeys(body(code,{mid:123,uname:'not retained',extra:'outside'})),{img,sub});
});
test('public search material rejects identity, invalid status, oversized data and any URL outside exact image-key shape',()=>{
 for(const raw of ['{','x'.repeat(16385),JSON.stringify({code:'0',data}),body(-403),body(-101,{isLogin:true}),body(-101,{isLogin:null}),body(-101,{wbi_img:null})])assert.throws(()=>parsePublicSearchKeys(raw));
 for(const url of [`http://i0.hdslb.com/bfs/wbi/${img}.png`,`https://outside.invalid/bfs/wbi/${img}.png`,`https://i0.hdslb.com.evil.invalid/bfs/wbi/${img}.png`,`https://i0.hdslb.com/bfs/wbi/${img}.png?outside=1`,`https://i0.hdslb.com/bfs/wbi/${img}.png#x`,`https://x@i0.hdslb.com/bfs/wbi/${img}.png`,`https://i0.hdslb.com:444/bfs/wbi/${img}.png`,`https://i0.hdslb.com/bfs/wbi/${img.toUpperCase()}.png`,`https://i0.hdslb.com/bfs/wbi/${img.slice(1)}.png`,null])assert.throws(()=>parsePublicSearchKeys(body(-101,{wbi_img:{...data.wbi_img,img_url:url}})));
});
test('WBI keyword filtering is explicit, bounded and preserves non-protocol punctuation and Unicode',()=>{
 assert.equal(searchSigningKeyword("你好!'()*&x=1"),'你好&x=1');assert.equal(searchSigningKeyword('😀你好'),'😀你好');
 for(const value of ['',"!'()*",' x','x ','x'.repeat(33),'\u0000'])assert.throws(()=>searchSigningKeyword(value));
});
test('public-nav errors remain distinct, closed and fixed; wrong prefixes or raw text reject',()=>{
 const base={version:1,scope:{accountId:'guest',generation:1,requestId:'r1',mediaSessionId:'search'},operation:'public-video-search',closed:true,items:[],noMore:true};
 assert.equal(parseSearchResult({...base,kind:'http_error',status:412,code:'search.nav_http_412'}).code,'search.nav_http_412');
 assert.equal(parseSearchResult({...base,kind:'transport_error',status:0,code:'search.nav_transport_60'}).code,'search.nav_transport_60');
 for(const code of ['search.nav_http_outside','search.nav_transport_60_cookie=outside','search.invalid_response_public_keys_outside'])assert.throws(()=>parseSearchResult({...base,kind:'invalid_response',status:0,code}));
});
