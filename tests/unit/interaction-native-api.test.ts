import {test} from 'node:test';import assert from 'node:assert/strict';
import {InteractionNativeApi} from '../../platform/wasm-network/src/interaction-native-api.ts';
import type {VodApiNative} from '../../platform/wasm-network/src/vod-native-api.ts';
import type {PrivateAccount} from '../../packages/contracts/src/private-account.ts';
import type {InteractionState,InteractionIntent} from '../../packages/contracts/src/video-interactions.ts';
const state={bvid:'BV0000000001',aid:'123',ownerId:'202',title:'合成视频',owner:'合成UP',liked:false,followed:false,followMode:0,watchLater:false,coins:0,coinLimit:2,balance:10,folders:[{id:'456',title:'合成夹',selected:false}]} satisfies InteractionState;
const account:PrivateAccount={schema:1,id:'bili_101',uid:'101',name:'合成',expiresAt:Date.now()+3600000,cookieLines:'.bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\t'+'a'.repeat(32)+'\n'};
function fixture(mode='normal'){
 const heap=new Uint8Array(65536),calls:number[]=[],inputs:string[]=[];let api!:InteractionNativeApi,length=0,currentOp=-1;
 const native:VodApiNative={HEAPU8:heap,callMain(){api.receive('VODAPI:ready');},_vod_input_ptr:()=>0,_vod_input_capacity:()=>4096,_vod_body_ptr:()=>8192,_vod_body_length:()=>length,_vod_http_status:()=>mode==='folders-network'&&currentOp===5?0:200,_vod_curl_status:()=>mode==='folders-network'&&currentOp===5?28:0,_vod_response_clear(){heap.fill(0,8192);length=0;},_vod_import_cookies(){heap.fill(0,0,4097);return 1;},_vod_source_valid:()=>0,_vod_source_total:()=>0,
 _vod_begin(operation){currentOp=operation;calls.push(operation);inputs.push(new TextDecoder().decode(heap.subarray(0,heap.indexOf(0))));if(mode==='hold'&&operation>=8||mode==='hold-read'&&operation===4)return 1;if(mode==='reject-read'&&operation===4)return 0;
 const data=operation===0?{isLogin:true,mid:mode==='identity'?102:101,money:mode==='balance-invalid'?undefined:10,wbi_img:{img_url:'https://i0.hdslb.com/bfs/wbi/'+'a'.repeat(32)+'.png',sub_url:'https://i0.hdslb.com/bfs/wbi/'+'b'.repeat(32)+'.png'}}:operation===1?{bvid:state.bvid,aid:123,owner:{mid:mode==='up'?303:202,name:state.owner},title:state.title,copyright:mode==='coin-over-limit'?2:1}:operation===4?{like:mode==='changed',coin:mode==='coin-over-limit'?2:mode==='coins-invalid'?undefined:mode==='coin-changed'?1:0}:operation===5?{count:1,list:[{id:456,title:'合成夹',fav_state:mode==='folders-invalid'?undefined:0}]}:operation===6?{mid:202,attribute:mode==='follow-invalid'?3:mode==='quiet'?1:0}:operation===7?{count:0,list:[]}:{};
 const bytes=new TextEncoder().encode(JSON.stringify({code:mode==='watch-login'&&operation===7?-101:mode==='nonzero'&&operation>=8?-352:0,data}));heap.set(bytes,8192);length=bytes.length;api.receive('VODAPI:response:'+operation);return 1;},_vod_stop(){heap.fill(0);length=0;api.receive(mode==='unclosed'?'VODAPI:unclosed':'VODAPI:closed');}};
 api=new InteractionNativeApi(native,40);return{api,calls,inputs,heap};
}
const signal=()=>new AbortController().signal;
test('F11 exact Nav/view/UP/folder/membership read is independent of POST and returns bounded state without cookies',async()=>{const f=fixture();assert.deepEqual(await f.api.execute({kind:'state',bvid:state.bvid},account,signal()),{kind:'state',state});assert.deepEqual(f.calls,[0,1,4,6,7,5]);assert.ok(f.heap.every(n=>n===0));});
test('F11/F14 every write rechecks identity and target, uses exact private CSRF once, and API0 is acknowledgement only',async()=>{
 for(const [kind,op]of [['like',8],['favorite',9],['watch-later',10],['follow',11],['coin',12]]as const){const f=fixture(),intent:InteractionIntent={kind,on:true,folderId:kind==='favorite'?'456':'',quantity:kind==='coin'?2:0};assert.deepEqual(await f.api.execute({kind:'write',bvid:state.bvid,expected:state,intent},account,signal()),{kind:'write',ack:'accepted',apiCode:0});assert.equal(f.calls.at(-1),op);assert.equal(f.calls.filter(n=>n>=8).length,1);assert.equal(f.inputs.at(-1),`${kind==='follow'?'202':'123'}|${kind==='coin'?2:1}|${kind==='favorite'?'456':'0'}|${'a'.repeat(32)}`);assert.ok(f.heap.every(n=>n===0));}
});
test('F11 stale identity/UP/state/coin baseline never dispatches and never silently changes the requested direction or quantity',async()=>{
 for(const mode of ['identity','up','changed','coin-changed']){const f=fixture(mode),intent:InteractionIntent={kind:mode==='coin-changed'?'coin':'like',on:true,folderId:'',quantity:mode==='coin-changed'?1:0};if(mode==='identity')await assert.rejects(f.api.execute({kind:'write',bvid:state.bvid,expected:state,intent},account,signal()),{code:'login'});else assert.deepEqual(await f.api.execute({kind:'write',bvid:state.bvid,expected:state,intent},account,signal()),{kind:'write',ack:'not-sent',reason:mode==='up'?'target_changed':mode==='coin-changed'?'coin_precondition':'state_changed'});assert.ok(f.calls.every(n=>n<8));}
});
test('F11 unknown/nonzero and cancelled POST do not retry; a failed real close cannot return success',async()=>{
 const intent:InteractionIntent={kind:'like',on:true,folderId:'',quantity:0},f=fixture('nonzero');assert.deepEqual(await f.api.execute({kind:'write',bvid:state.bvid,expected:state,intent},account,signal()),{kind:'write',ack:'unknown',apiCode:-352});assert.equal(f.calls.filter(n=>n>=8).length,1);
 const hold=fixture('hold'),c=new AbortController(),pending=hold.api.execute({kind:'write',bvid:state.bvid,expected:state,intent},account,c.signal);while(!hold.calls.includes(8))await new Promise(r=>setTimeout(r,2));c.abort();await assert.rejects(pending);assert.equal(hold.calls.filter(n=>n>=8).length,1);
 const broken=fixture('unclosed');await assert.rejects(broken.api.execute({kind:'state',bvid:state.bvid},account,signal()),{code:'unknown'});
});

test('F11 quietly followed UP uses the official cancel-whisper action, and bad CSRF never dispatches',async()=>{const f=fixture('quiet'),expected={...state,followed:true,followMode:1};assert.deepEqual(await f.api.execute({kind:'write',bvid:state.bvid,expected,intent:{kind:'follow',on:false,folderId:'',quantity:0}},account,signal()),{kind:'write',ack:'accepted',apiCode:0});assert.equal(f.inputs.at(-1),'202|0|1|'+'a'.repeat(32));const bad=fixture();await assert.rejects(bad.api.execute({kind:'write',bvid:state.bvid,expected:state,intent:{kind:'coin',on:true,folderId:'',quantity:1}},{...account,cookieLines:account.cookieLines.replace('a'.repeat(32),'bad-csrf')},signal()),{code:'login'});assert.ok(bad.calls.every(n=>n<8));});

test('U4 F11 optional balance/coin/folder/follow failures are explicit and independent; completed transport may continue, login cannot',async()=>{
 for(const [mode,stage,code]of [['balance-invalid','balance','invalid'],['coins-invalid','coins','invalid'],['coin-over-limit','coins','invalid'],['folders-invalid','folders','invalid'],['folders-network','folders','network'],['follow-invalid','follow','unsupported']]as const){
  const f=fixture(mode),read=await f.api.execute({kind:'state',bvid:state.bvid},account,signal());assert.equal(read.kind,'state');if(read.kind!=='state')continue;
  assert.equal(read.state.unavailable?.[stage],code);assert.equal(read.state.liked,false);assert.equal(read.state.watchLater,false);
  const w=fixture(mode);assert.deepEqual(await w.api.execute({kind:'write',bvid:state.bvid,expected:read.state,intent:{kind:'like',on:true,folderId:'',quantity:0}},account,signal()),{kind:'write',ack:'accepted',apiCode:0});assert.equal(w.calls.filter(n=>n>=8).length,1);
 }
 const login=fixture('watch-login');await assert.rejects(login.api.execute({kind:'state',bvid:state.bvid},account,signal()),{code:'login'});assert.ok(!login.calls.includes(5));
});
test('U4 unavailable preview/actual family cannot dispatch or turn unknown into false',async()=>{
 const f=fixture('folders-invalid'),read=await f.api.execute({kind:'state',bvid:state.bvid},account,signal());if(read.kind!=='state')assert.fail();assert.equal(read.state.folders,null);
 const write=fixture();assert.deepEqual(await write.api.execute({kind:'write',bvid:state.bvid,expected:read.state,intent:{kind:'favorite',on:true,folderId:'456',quantity:0}},account,signal()),{kind:'write',ack:'not-sent',reason:'unavailable'});assert.ok(write.calls.every(n=>n<8));
});

test('U4 native begin rejection/uncompleted timeout cannot be mistaken for an isolated parser failure',async()=>{
 for(const [mode,code]of [['hold-read','timeout'],['reject-read','invalid']]as const){const f=fixture(mode);await assert.rejects(f.api.execute({kind:'state',bvid:state.bvid},account,signal()),{code,phase:'like'});assert.deepEqual(f.calls,[0,1,4]);assert.ok(f.heap.every(n=>n===0));}
});

test('U4 targeted reversible reads and preflights fetch identity/video plus only their own proof; toolbar defers folders and balance',async()=>{
 for(const [family,operation]of [['like',4],['follow',6],['watch-later',7]]as const){const f=fixture(),result=await f.api.execute({kind:'state',bvid:state.bvid,family},account,signal());assert.deepEqual(f.calls,[0,1,operation]);assert.equal(result.kind,'state');if(result.kind==='state'){const writer=fixture();await writer.api.execute({kind:'write',bvid:state.bvid,expected:result.state,intent:{kind:family,on:true,folderId:'',quantity:0}},account,signal());assert.deepEqual(writer.calls,[0,1,operation,{like:8,follow:11,'watch-later':10}[family]]);}}
 const f=fixture();await f.api.execute({kind:'state',bvid:state.bvid,family:'toolbar'},account,signal());assert.deepEqual(f.calls,[0,1,4,6,7]);
});
