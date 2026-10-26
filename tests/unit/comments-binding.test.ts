import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CommentsNativeApi} from '../../platform/wasm-network/src/comments-native-api.ts';
import type {VodApiNative} from '../../platform/wasm-network/src/vod-native-api.ts';
const bvid='BV0000000001',salts={img:'a'.repeat(32),sub:'b'.repeat(32)};
const row=(n=1)=>({rpid_str:String(n),oid_str:'123',type:1,root_str:'0',member:{uname:'测试作者'},content:{message:'合成文本'},ctime:1700000000,like:2,rcount:0,invisible:false});
/** Synthetic comments module: nav, view (AID 123), then the roots page; `refuse` answers the first roots read with -352. */
function fixture(refuse=false){
 const heap=new Uint8Array(65536),calls:number[]=[],inputs:string[]=[];let api!:CommentsNativeApi,length=0,refused=false;
 const native:VodApiNative={HEAPU8:heap,callMain(){api.receive('VODAPI:ready');},_vod_input_ptr:()=>0,_vod_input_capacity:()=>4096,_vod_body_ptr:()=>8192,_vod_body_length:()=>length,
  _vod_http_status:()=>200,_vod_curl_status:()=>0,_vod_response_clear(){heap.fill(0,8192);length=0;},_vod_import_cookies:()=>1,_vod_source_valid:()=>0,_vod_source_total:()=>0,
  _vod_begin(operation){
   inputs.push(new TextDecoder().decode(heap.subarray(0,heap.indexOf(0))));calls.push(operation);
   const data=operation===0?{code:0,data:{isLogin:false,wbi_img:{img_url:'https://i0.hdslb.com/bfs/wbi/'+'c'.repeat(32)+'.png',sub_url:'https://i0.hdslb.com/bfs/wbi/'+'d'.repeat(32)+'.png'}}}:
    operation===1?{code:0,data:{aid:123,bvid}}:refuse&&!refused?(refused=true,{code:-352}):{code:0,data:{cursor:{is_end:true},replies:[row()]}};
   const bytes=new TextEncoder().encode(JSON.stringify(data));heap.set(bytes,8192);length=bytes.length;api.receive('VODAPI:response:'+operation);return 1;
  },_vod_stop(){heap.fill(0);length=0;api.receive('VODAPI:closed');}};
 api=new CommentsNativeApi(native,40);return{api,calls,inputs};
}
const roots={kind:'roots' as const,sort:'hot' as const,offset:''},binding={version:1 as const,kind:'overlay-binding' as const,bvid,part:1,cid:'222',aid:'123',...salts};
test('ADR-112 comments with the playing item\'s binding skip nav and view and sign with its salts',async()=>{
 const f=fixture(),batch=await f.api.read(bvid,roots,new AbortController().signal,undefined,binding);
 assert.equal(batch.items.length,1);assert.deepEqual(f.calls,[4]);assert.match(f.inputs[0]!,new RegExp(`^123\\|3\\|.*\\|${salts.img}\\|${salts.sub}\\|`));
});
test('ADR-112 comments without a binding, for another video, or after a refused bound read take the nav and view path',async()=>{
 const none=fixture();await none.api.read(bvid,roots,new AbortController().signal);assert.deepEqual(none.calls,[0,1,4]);
 const other=fixture();await other.api.read(bvid,roots,new AbortController().signal,undefined,{...binding,bvid:'BV0000000002'});assert.deepEqual(other.calls,[0,1,4]);
 const refused=fixture(true);assert.equal((await refused.api.read(bvid,roots,new AbortController().signal,undefined,binding)).items.length,1);assert.deepEqual(refused.calls,[4,0,1,4]);
});
