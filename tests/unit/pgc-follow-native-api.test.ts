import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PgcFollowNativeApi} from '../../platform/wasm-network/src/pgc-follow-native-api.ts';
import type {VodApiNative} from '../../platform/wasm-network/src/vod-native-api.ts';
import type {PrivateAccount} from '../../packages/contracts/src/private-account.ts';
const account:PrivateAccount={schema:1,id:'bili_101',uid:'101',name:'合成',expiresAt:Date.now()+3600000,cookieLines:'.bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\t'+'a'.repeat(32)+'\n'};
function fixture(mode='normal'){
 let notifyWrite!:()=>void;const writeStarted=new Promise<void>(yes=>{notifyWrite=yes;});
 const heap=new Uint8Array(65536),calls:number[]=[],inputs:string[]=[];let api!:PgcFollowNativeApi,length=0,inNative=false;
 const native:VodApiNative={HEAPU8:heap,callMain(){inNative=true;api.receive('VODAPI:ready');inNative=false;},_vod_input_ptr:()=>0,_vod_input_capacity:()=>4096,_vod_body_ptr:()=>8192,_vod_body_length:()=>length,_vod_http_status:()=>200,_vod_curl_status:()=>0,_vod_response_clear(){heap.fill(0,8192);length=0;},_vod_import_cookies(){assert.equal(inNative,false);heap.fill(0,0,4097);return 1;},_vod_source_valid:()=>0,_vod_source_total:()=>0,
 _vod_begin(operation){assert.equal(inNative,false);calls.push(operation);inputs.push(new TextDecoder().decode(heap.subarray(0,heap.indexOf(0))));if(operation===7)notifyWrite();if(mode==='hold-write'&&operation===7)return 1;
  const value=operation===0?{code:0,data:{isLogin:true,mid:mode==='mismatch'?202:101,wbi_img:{img_url:'https://i0.hdslb.com/bfs/wbi/'+'a'.repeat(32)+'.png',sub_url:'https://i0.hdslb.com/bfs/wbi/'+'b'.repeat(32)+'.png'}}}:operation===6?{code:0,data:{total:0,list:[]}}:operation===4?{code:0,result:{season_id:123,title:'合成',user_status:{login:1,follow:mode==='no'?0:1},episodes:[]}}:{code:mode==='rejected'?-111:0};
  const bytes=new TextEncoder().encode(JSON.stringify(value));heap.set(bytes,8192);length=bytes.length;inNative=true;api.receive('VODAPI:response:'+operation);inNative=false;return 1;
 },_vod_stop(){assert.equal(inNative,false);heap.fill(0);length=0;api.receive(mode==='unclosed'?'VODAPI:unclosed':'VODAPI:closed');}};
 api=new PgcFollowNativeApi(native,mode==='hold-write'?500:30);return {api,calls,inputs,heap,writeStarted};
}
test('F17 native follow list derives private vmid only after exact-identity nav and closes/cleans before returning',async()=>{
 const f=fixture(),result=await f.api.execute({kind:'list',query:{type:2,page:7}},account,new AbortController().signal);assert.deepEqual(f.calls,[0,6]);assert.match(f.inputs[1]!,/^101\|2\|7\|a{32}\|b{32}\|[0-9]{10}$/);assert.deepEqual(result,{kind:'list',page:{type:2,page:7,total:0,noMore:true,items:[]}});assert.ok(f.heap.every(n=>n===0));
});
test('F17 native add/del use private CSRF, acknowledge only once and never claim readback or automatically retry',async()=>{
 for(const follow of [true,false]){const f=fixture();const result=await f.api.execute({kind:'write',seasonId:'123',follow},account,new AbortController().signal);assert.deepEqual(result,{kind:'write',ack:'accepted'});assert.deepEqual(f.calls,[0,follow?7:8]);assert.equal(f.inputs[1],'123|'+'a'.repeat(32));assert.ok(!JSON.stringify(result).includes('csrf'));assert.ok(f.heap.every(n=>n===0));}
 const f=fixture('rejected');assert.deepEqual(await f.api.execute({kind:'write',seasonId:'123',follow:true},account,new AbortController().signal),{kind:'write',ack:'rejected'});assert.deepEqual(f.calls,[0,7]);
});
test('F17 identity mismatch or invalid CSRF never reaches a POST',async()=>{
 for(const mode of ['mismatch','bad-csrf']){const f=fixture(mode),value=mode==='bad-csrf'?{...account,cookieLines:account.cookieLines.replace('a'.repeat(32),'synthetic-csrf')}:account;await assert.rejects(f.api.execute({kind:'write',seasonId:'123',follow:true},value,new AbortController().signal),{code:'login'});assert.deepEqual(f.calls,[0]);}
});
test('F17 actual state uses exact season/login response and returns no season payload or account secrets',async()=>{
 for(const mode of ['normal','no']){const f=fixture(mode);assert.deepEqual(await f.api.execute({kind:'state',seasonId:'123'},account,new AbortController().signal),{kind:'state',followed:mode==='no'?'no':'yes'});assert.deepEqual(f.calls,[0,4]);}
 const f=fixture();await assert.rejects(f.api.execute({kind:'state',seasonId:'124'},account,new AbortController().signal),{code:'invalid'});
});
test('F17 post cancellation drains closure without resend; unknown close permanently blocks another operation',async()=>{
 const f=fixture('hold-write'),controller=new AbortController();const pending=f.api.execute({kind:'write',seasonId:'123',follow:true},account,controller.signal);await f.writeStarted;controller.abort();await assert.rejects(pending,{code:'cancelled'});assert.deepEqual(f.calls,[0,7]);assert.ok(f.heap.every(n=>n===0));
 const broken=fixture('unclosed');await assert.rejects(broken.api.execute({kind:'state',seasonId:'123'},account,new AbortController().signal),{code:'unknown'});await assert.rejects(broken.api.execute({kind:'write',seasonId:'123',follow:true},account,new AbortController().signal),{code:'unknown'});assert.deepEqual(broken.calls,[0,4]);
});
