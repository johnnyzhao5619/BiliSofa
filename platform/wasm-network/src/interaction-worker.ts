import { configureServiceNative } from '../../../packages/contracts/src/service-configuration.ts';
import {DomainError,record} from '../../../packages/contracts/src/index.ts';
import {vodKeys} from '../../../packages/contracts/src/vod-catalog.ts';
import {InteractionReadError,parseInteractionRequest,parseInteractionResult,type InteractionRequest,type InteractionValue} from '../../../packages/contracts/src/video-interactions.ts';
import {InteractionNativeApi} from './interaction-native-api.ts';
import {vodNativeFailure,type VodApiNative} from './vod-native-api.ts';
const worker=globalThis as unknown as {onmessage:((event:MessageEvent)=>void)|null;postMessage(value:unknown):void;importScripts(path:string):void;Module:VodApiNative};
let active:InteractionRequest|undefined,api:InteractionNativeApi|undefined,controller:AbortController|undefined,complete=false,loading=false;
function fatal():never{api?.abortUnknown();active=undefined;throw new Error('interaction.close_unconfirmed');}
async function finish(value?:InteractionValue,error?:unknown):Promise<void>{
 if(complete||!active)return;
 try{await api?.close();}catch{fatal();}
 const request=active;active=undefined;complete=true;
 worker.postMessage(parseInteractionResult({version:1,operation:'video-interactions',scope:request.scope,closed:true,...(value?{kind:'ok',value}:{kind:'error',code:vodNativeFailure(error),...(error instanceof InteractionReadError?{phase:error.phase}:{})})}));
}
worker.onmessage=event=>{
 if(complete)return;
 if(active){
  try{const v=record(event.data);vodKeys(v,['version','operation','scope','control']);if(v.version!==1||v.operation!=='video-interactions'||v.control!=='stop'||JSON.stringify(v.scope)!==JSON.stringify(active.scope))return;}catch{return;}
  controller?.abort();if(!loading&&!api)void finish(undefined,new DomainError('cancelled'));return;
 }
 try{active=parseInteractionRequest(event.data);}catch{return;}
 controller=new AbortController();loading=true;
 const module={arguments:[],noInitialRun:true,noExitRuntime:true,onRuntimeInitialized(){
  loading=false;api=new InteractionNativeApi(worker.Module);
  if(controller!.signal.aborted){void finish(undefined,new DomainError('cancelled'));return;}
  const request=active!;
  void api.execute(request.command,request.account,controller!.signal).then(value=>finish(value),error=>finish(undefined,error));
 },print(line:unknown){api?.receive(line);},printErr(){},onAbort:fatal,locateFile:(name:string)=>'video-interactions/'+name};
 worker.Module=configureServiceNative(module as unknown as VodApiNative);
 try{worker.importScripts('video-interactions/probe.js');}catch{loading=false;void finish(undefined,new DomainError('unsupported'));}
};
