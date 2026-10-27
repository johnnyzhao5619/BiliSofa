import { configureServiceNative } from '../../../packages/contracts/src/service-configuration.ts';
import {DomainError,record} from '../../../packages/contracts/src/index.ts';
import {parsePrivateAccount,type PrivateAccount} from '../../../packages/contracts/src/private-account.ts';
import {parseVodCapabilities,vodNonce} from '../../../packages/contracts/src/vod-runtime.ts';
import {vodInteger,vodKeys,type VodCapabilities} from '../../../packages/contracts/src/vod-catalog.ts';
import {parseLiveBrowse,parseLiveSelection,liveId,LiveSourceError,parseLiveSourceStatus,type LiveSourceStatus} from '../../../packages/contracts/src/live-product.ts';
import {LiveApiError,type PrivateLiveSource} from '../../../packages/bili-client/src/live-product.ts';
import {plainLivePlaylist,rewritePlainLivePlaylist} from '../../../packages/media/src/live-hls.ts';
import {LiveNativeApi} from './live-native-api.ts';
import {vodNativeFailure,type VodApiNative} from './vod-native-api.ts';
interface Native extends VodApiNative {
  _live_product_start():number;_live_product_range_valid():number;_live_input_ptr():number;_live_begin(operation:number):number;_live_stop():void;
  _live_body_ptr():number;_live_body_length():number;_live_response_clear():void;_live_http_status():number;_live_curl_status():number;
  _live_relay_start():number;_live_relay_segment():number;_live_relay_reply(length:number,kind:number):number;
}
const worker=globalThis as unknown as {onmessage:((e:MessageEvent)=>void)|null;postMessage(value:unknown):void;importScripts(path:string):void;Module:Native};
let owner='',account:PrivateAccount|undefined,caps:VodCapabilities|undefined,mode:'read'|'media'='read',api:LiveNativeApi|undefined,loading=false,closing=false,poisoned=false,lastRequest=0,closeRequest=0;
let controller:AbortController|undefined,inflight:Promise<void>|undefined,current:PrivateLiveSource|undefined;
let relay=false,serving=false,relayOperation=0,relayCode:'network'|'invalid'|'timeout'|'cancelled'|'permission'='network',readyRequest=0,relayToken='',serial=0;
let resolveRelay:()=>void=()=>{},relayClosed:Promise<void>=Promise.resolve();
const urls=new Map<number,string>(),windows:number[][]=[];
let sourceStatus:LiveSourceStatus|undefined,candidates:string[]=[],node=0,retryCdn=false,startupUntil=0,startupTimer:ReturnType<typeof setTimeout>|undefined;
function status(stage:LiveSourceStatus['stage'],http=0,curl=-1,exhausted=false):void {
 sourceStatus=parseLiveSourceStatus({stage,node:stage==='api'?0:node+1,http,curl,exhausted});send(0,'source-status',{source:sourceStatus});
}
function retryableCdn():boolean{return !!readyRequest&&!serving&&['manifest','probe'].includes(sourceStatus?.stage??'')&&['network','timeout'].includes(relayCode);}
function startNode():void {
 relay=true;serving=false;retryCdn=false;relayOperation=0;urls.clear();windows.length=0;serial=0;
 current={...current!,url:candidates[node]!};
 if(worker.Module._live_product_start()!==1){relay=false;resolveRelay();readyRequest=0;fault();}
}
function send(request:number,kind:string,value:object={}){worker.postMessage({version:1,owner,request,kind,...value});}
function fault():void {if(poisoned)return;poisoned=true;account=undefined;current=undefined;controller?.abort();api?.abortUnknown();send(0,'fault',{code:'unknown'});}
function error(request:number,reason:unknown){if(vodNativeFailure(reason)==='unknown'){fault();return;}const source=reason instanceof LiveSourceError?reason.source:sourceStatus;send(request,'error',{code:vodNativeFailure(reason),...(reason instanceof LiveApiError?{apiCode:reason.apiCode}:{}),...(source?{source}:{})});}
function relayInput(value:string){const bytes=new TextEncoder().encode(value),m=worker.Module,p=m._live_input_ptr();if(!Number.isSafeInteger(p)||p<0||p+2049>m.HEAPU8.length||bytes.length>2048||bytes.includes(0))throw new DomainError('invalid');m.HEAPU8.fill(0,p,p+2049);m.HEAPU8.set(bytes,p);}
function begin(operation:number,url:string){if(closing){worker.Module._live_stop();return;}relayInput(url);relayOperation=operation;status(operation===1?'manifest':operation===2?'probe':'segment');if(worker.Module._live_begin(operation)!==1)throw new DomainError('invalid');}
function relayBody(max:number):Uint8Array {const m=worker.Module,p=m._live_body_ptr(),n=m._live_body_length();if(!Number.isSafeInteger(p)||p<0||!Number.isSafeInteger(n)||n<1||n>max||p+n>m.HEAPU8.length)throw new DomainError('invalid');return m.HEAPU8.subarray(p,p+n);}
function text():string {try{return new TextDecoder('utf-8',{fatal:true}).decode(relayBody(32768));}finally{worker.Module._live_response_clear();}}
function rewrite(raw:string){
  const ids:number[]=[],url=current?.url;if(!url)throw new DomainError('invalid');
  const result=rewritePlainLivePlaylist(raw,url,value=>{let id=[...urls].find(([,url])=>url===value)?.[0];if(id===undefined){if(serial>=2147483647)throw new DomainError('invalid');id=++serial;urls.set(id,value);}ids.push(id);return `s${id}.ts`;},10);
  windows.push(ids);while(windows.length>3)windows.shift();const retained=new Set(windows.flat());for(const id of urls.keys())if(!retained.has(id))urls.delete(id);if(urls.size>72)throw new DomainError('invalid');
  const bytes=new TextEncoder().encode(result),m=worker.Module,p=m._live_body_ptr();if(p<0||p+bytes.length>m.HEAPU8.length)throw new DomainError('invalid');m.HEAPU8.set(bytes,p);if(m._live_relay_reply(bytes.length,1)!==1)throw new DomainError('invalid');
}
function liveFrame(line:string){
  if(poisoned)return;
  if(line==='LIVE:unclosed'){fault();return;}
  if(line==='LIVE:closed'){
    if(!relay){fault();return;}relay=false;
    const again=!closing&&retryCdn&&retryableCdn()&&node+1<candidates.length&&performance.now()<startupUntil;
    if(again){node++;startNode();return;}
    if(!closing&&retryableCdn()&&sourceStatus)status(sourceStatus.stage,sourceStatus.http,sourceStatus.curl,true);
    clearTimeout(startupTimer);startupTimer=undefined;serving=false;current=undefined;urls.clear();windows.length=0;resolveRelay();
    if(readyRequest){error(readyRequest,new DomainError(closing?'cancelled':relayCode));readyRequest=0;}
    if(!closing)send(0,'stopped',{closed:true,code:relayCode,...(sourceStatus?{source:sourceStatus}:{})});return;
  }
  if(!relay){fault();return;}
  if(line==='LIVE:deadline'||line==='LIVE:relay_client_deadline'){relayCode='timeout';retryCdn=retryableCdn();return;}
  if(closing){worker.Module._live_stop();return;}
  try{
    if(line==='LIVE:ready'){begin(1,current!.url!);return;}
    if(line==='LIVE:relay_ready'){if(!readyRequest)throw new DomainError('invalid');serving=true;clearTimeout(startupTimer);startupTimer=undefined;status('listener');send(readyRequest,'started',{url:`http://127.0.0.1:40325/${relayToken}/index.m3u8`});readyRequest=0;return;}
    if(line==='LIVE:relay_manifest'){begin(1,current!.url!);return;}
    if(line==='LIVE:relay_segment'){const url=urls.get(worker.Module._live_relay_segment());if(!url)throw new DomainError('invalid');begin(3,url);return;}
    if(line==='LIVE:served_manifest'||line==='LIVE:served_segment')return;
    if(line!==`LIVE:response:${relayOperation}`)throw new DomainError('invalid');
    const m=worker.Module,rc=m._live_curl_status(),http=m._live_http_status();status(relayOperation===1?'manifest':relayOperation===2?'probe':'segment',http,rc);
    if([3,23].includes(rc))throw new DomainError('invalid');
    if([51,58,59,60,64,66,77,80,82,83,90,91].includes(rc)||http>=300&&http<500)throw new DomainError('permission');
    if(rc!==0||http!==(relayOperation===2?206:200))throw new DomainError('network');
    if(relayOperation===1){const raw=text();if(serving)rewrite(raw);else begin(2,plainLivePlaylist(raw,current!.url!).firstSegment);}
    else if(relayOperation===2){const bytes=relayBody(512);if(bytes.length!==512||m._live_product_range_valid()!==1||bytes[0]!==0x47||bytes[188]!==0x47||bytes[376]!==0x47)throw new DomainError('invalid');m._live_response_clear();relayToken=nonce();relayInput(relayToken);status('listener');if(m._live_relay_start()!==1)throw new DomainError('network');}
    else if(relayOperation===3){const bytes=relayBody(8388608);if(bytes.length<564||bytes.length%188||bytes[0]!==0x47||bytes[188]!==0x47||bytes[376]!==0x47)throw new DomainError('invalid');if(m._live_relay_reply(bytes.length,2)!==1)throw new DomainError('invalid');}
    else throw new DomainError('invalid');
  }catch(reason){relayCode=reason instanceof DomainError&&reason.code==='network'?'network':reason instanceof DomainError&&reason.code==='permission'?'permission':'invalid';retryCdn=retryableCdn();mStop();}
}
function mStop(){try{worker.Module._live_stop();}catch{fault();}}
function nonce(){return [...crypto.getRandomValues(new Uint8Array(16))].map(v=>v.toString(16).padStart(2,'0')).join('');}
let events:string[]=[],task:ReturnType<typeof setTimeout>|undefined;
function print(value:unknown){
  if(typeof value!=='string'){fault();return;}
  if(value.startsWith('VODAPI:')){api?.receive(value);return;}
  if(events.length>=16){fault();return;}events.push(value);
  if(task!==undefined)return;task=setTimeout(()=>{task=undefined;for(const event of events.splice(0))liveFrame(event);},0);
}
async function close(){
  clearTimeout(startupTimer);startupTimer=undefined;controller?.abort();try{await inflight;}catch{/* API failure does not replace native closure. */}
  try{await api?.close();if(relay){mStop();await relayClosed;}if(poisoned)return;account=undefined;current=undefined;send(closeRequest,'closed');}
  catch{fault();}
}
worker.onmessage=event=>{
  let request=0;
  try{
    const v=record(event.data);if(v.version!==1)throw new DomainError('invalid');
    if(!owner){
      vodKeys(v,['version','owner','kind','mode',...(v.capabilities===undefined?[]:['capabilities']),...(v.account===undefined?[]:['account'])]);if(v.kind!=='init'||v.mode!=='read'&&v.mode!=='media')throw new DomainError('invalid');
      owner=vodNonce(v.owner);mode=v.mode;if(mode==='media')caps=parseVodCapabilities(v.capabilities);else if(v.capabilities!==undefined)throw new DomainError('invalid');account=v.account===undefined?undefined:parsePrivateAccount(v.account);
      loading=true;const directory=mode==='media'?'live-product':'live-read';
      const module={arguments:[],noInitialRun:true,noExitRuntime:true,onRuntimeInitialized(){api=new LiveNativeApi(worker.Module);loading=false;if(closing){void close();return;}send(0,'ready');},print,printErr(){},onAbort:fault,locateFile:(name:string)=>`${directory}/${name}`};worker.Module=configureServiceNative(module as unknown as Native);worker.importScripts(`${directory}/probe.js`);return;
    }
    if(v.owner!==owner||poisoned)throw new DomainError('unknown');request=vodInteger(v.request,1,Number.MAX_SAFE_INTEGER);if(request<=lastRequest)throw new DomainError('invalid');lastRequest=request;
    if(v.kind==='close'){vodKeys(v,['version','owner','request','kind']);if(closing)throw new DomainError('invalid');closing=true;closeRequest=request;controller?.abort();if(!loading)void close();return;}
    if(closing||!api||inflight||relay)throw new DomainError('cancelled');
    if(v.kind==='start'){
      vodKeys(v,['version','owner','request','kind','catalogId']);if(mode!=='media'||!current?.url||v.catalogId!==current.summary.id)throw new DomainError('invalid');
      relayClosed=new Promise(resolve=>{resolveRelay=resolve;});readyRequest=request;relayCode='network';node=0;
      candidates=[current.url,...(current.alternates??[])].slice(0,3);startupUntil=performance.now()+28000;
      startupTimer=setTimeout(()=>{if(!serving&&relay){relayCode='timeout';retryCdn=false;mStop();}},28000);
      startNode();return;
    }
    controller=new AbortController();const signal=controller.signal;current=undefined;
    let work:Promise<unknown>;
    if(v.kind==='browse'){vodKeys(v,['version','owner','request','kind','query']);work=api.browse(parseLiveBrowse(v.query),signal,account);}
    else if(v.kind==='areas'){vodKeys(v,['version','owner','request','kind']);work=api.areas(signal);}
    else if(v.kind==='messages'){vodKeys(v,['version','owner','request','kind','roomId']);work=api.messages(liveId(v.roomId),signal);}
    else if(v.kind==='room'){status('api');vodKeys(v,['version','owner','request','kind','query']);if(mode!=='media'||!caps)throw new DomainError('unsupported');work=api.source(parseLiveSelection(v.query),nonce(),caps,signal,account).then(result=>{if(!closing)current=result;return result.summary;});}
    else throw new DomainError('invalid');
    const kind=v.kind;inflight=work.then(result=>{if(!closing)send(request,kind,{result});},reason=>{if(!closing)error(request,reason);}).finally(()=>{inflight=undefined;controller=undefined;});
  }catch(reason){if(owner){if(!request)fault();else error(request,reason);}}
};
