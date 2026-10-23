import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LiveRuntime} from '../../apps/tv/src/platform/live-runtime.ts';
import type {VodWorkerPort} from '../../apps/tv/src/platform/vod-runtime.ts';
import type {LiveCatalog} from '../../packages/contracts/src/live-product.ts';
const token='a'.repeat(32),signal=()=>new AbortController().signal;
const caps={video:['avc']as const,audio:['aac']as const,qualities:[16,32,64],maxWidth:1280,maxHeight:720,maxFps:30,rates:[1,2]as const};
const catalog:LiveCatalog={id:token,roomId:'123',state:'live',selectedQn:250,qualities:[{qn:250,label:'超清'}],width:1280,height:720,video:'avc1.4d401f',audio:'mp4a.40.2'};
function fixture(options:{hold?:boolean;unknown?:boolean;room?:string;extra?:boolean}={}){
 const sent:Record<string,unknown>[]=[],received:Record<string,unknown>[]=[];let terminated=0;
 const emit=(v:Record<string,unknown>)=>{const data={version:1,owner:token,...v};received.push(data);queueMicrotask(()=>port.onmessage?.({data}as MessageEvent));};
 const port:VodWorkerPort={onmessage:null,onerror:null,onmessageerror:null,terminate(){terminated++;},postMessage(raw){const v=raw as Record<string,unknown>;sent.push(v);
  if(v.kind==='init')emit({request:0,kind:'ready'});
  else if(v.kind==='close'){if(options.unknown)emit({request:0,kind:'fault',code:'unknown'});else emit({request:v.request,kind:'closed'});}
  else if(!options.hold){if(v.kind==='room')emit({request:v.request,kind:'room',result:{...catalog,roomId:options.room??'123',...(options.extra?{url:'https://never-leak.invalid/'}:{})}});else if(v.kind==='start')emit({request:v.request,kind:'started',url:'http://127.0.0.1:40325/'+token+'/index.m3u8'});else emit({request:v.request,kind:v.kind,result:{items:[],noMore:true}});}
 }};
 const runtime=new LiveRuntime(caps,undefined,file=>{assert.equal(file,'live-product-worker.js');return port;},()=>token,50,30);
 return {runtime,port,sent,received,emit,terminated:()=>terminated};
}
test('F18 live facade consumes its exact catalog once and drains a real close acknowledgement',async()=>{
 const f=fixture();assert.deepEqual(await f.runtime.room({roomId:'123',qn:0},signal()),catalog);assert.throws(()=>f.runtime.transport('b'.repeat(32)),{code:'invalid'});const transport=f.runtime.transport(token);assert.throws(()=>f.runtime.transport(token),{code:'invalid'});
 // Cancellation before readiness must never reach the decoder; this path does
 // not need a real local HTTP listener or global fetch replacement.
 const controller=new AbortController();controller.abort();await assert.rejects(transport.run(controller.signal,()=>assert.fail('cancelled decoder')),{code:'cancelled'});await transport.close();assert.equal(f.terminated(),1);assert.equal(f.sent.at(-1)!.kind,'close');assert.ok(!JSON.stringify(f.received).includes('cookie'));
});
test('F18 room mismatch or a private URL in a public DTO poisons ownership and cannot be closed as PASS',async()=>{
 for(const option of [{room:'456'},{extra:true}]){const f=fixture(option);await assert.rejects(f.runtime.room({roomId:'123',qn:0},signal()),{code:'invalid'});await assert.rejects(f.runtime.close(),{code:'unknown'});assert.equal(f.terminated(),1);}
});
test('F18 cancellation drains native close without waiting for a response, and ignores that cancelled late response',async()=>{
 const f=fixture({hold:true}),controller=new AbortController(),pending=f.runtime.browse({kind:'recommend'},controller.signal);await new Promise(resolve=>setImmediate(resolve));controller.abort();await assert.rejects(pending,{code:'cancelled'});await f.runtime.close();f.emit({request:1,kind:'browse',result:{items:[],noMore:true}});await new Promise(resolve=>setImmediate(resolve));assert.equal(f.terminated(),1);await assert.rejects(f.runtime.browse({kind:'recommend'},signal()),{code:'cancelled'});
});
test('F18 unknown close is sticky even after a later closed frame; timeout never becomes proof by termination',async()=>{
 const f=fixture({unknown:true});await f.runtime.browse({kind:'recommend'},signal());await assert.rejects(f.runtime.close(),{code:'unknown'});f.emit({request:2,kind:'closed'});await assert.rejects(f.runtime.close(),{code:'unknown'});await assert.rejects(f.runtime.browse({kind:'recommend'},signal()),{code:'unknown'});assert.equal(f.terminated(),1);
 const held=fixture({hold:true});await assert.rejects(held.runtime.browse({kind:'recommend'},signal()),{code:'timeout'});await assert.rejects(held.runtime.close(),{code:'unknown'});
});
test('F18 fixed API refusals retain only the safe numeric code and do not enter automatic retries',async()=>{
 const f=fixture({hold:true}),pending=f.runtime.browse({kind:'area',parentId:'1',areaId:'0',page:1},signal());await new Promise(resolve=>setImmediate(resolve));f.emit({request:1,kind:'error',code:'network',apiCode:-352});await assert.rejects(pending,error=>{assert.equal((error as {apiCode?:number}).apiCode,-352);return true;});assert.equal(f.sent.filter(v=>v.kind==='browse').length,1);await f.runtime.close();
});
test('F18 source progress carries only bounded stage/status counters, survives close and cannot contain raw native text or URLs',async()=>{
 const f=fixture();await f.runtime.room({roomId:'123',qn:0},signal());const source={stage:'manifest',node:2,http:0,curl:28,exhausted:true};f.emit({request:0,kind:'source-status',source});await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(f.runtime.sourceStatus(),source);const copy=f.runtime.sourceStatus()!;copy.http=599;assert.equal(f.runtime.sourceStatus()!.http,0);await f.runtime.close();assert.deepEqual(f.runtime.sourceStatus(),source);
 for(const extra of [{url:'https://never-leak.invalid/'},{stage:'arbitrary_error'},{node:4},{http:999},{curl:-9}]){const bad=fixture();await bad.runtime.room({roomId:'123',qn:0},signal());bad.emit({request:0,kind:'source-status',source:{...source,...extra}});await new Promise(resolve=>setImmediate(resolve));await assert.rejects(bad.runtime.close(),{code:'unknown'});}
});
