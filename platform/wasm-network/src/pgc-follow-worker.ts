import {DomainError,record} from '../../../packages/contracts/src/index.ts';
import {vodKeys} from '../../../packages/contracts/src/vod-catalog.ts';
import {parsePgcFollowRequest,parsePgcFollowResult,type PgcFollowRequest,type PgcFollowValue} from '../../../packages/contracts/src/pgc-follow.ts';
import {PgcFollowNativeApi} from './pgc-follow-native-api.ts';
import {vodNativeFailure,type VodApiNative} from './vod-native-api.ts';
const worker=globalThis as unknown as {onmessage:((event:MessageEvent)=>void)|null;postMessage(value:unknown):void;importScripts(path:string):void;Module:VodApiNative};
let active:PgcFollowRequest|undefined,api:PgcFollowNativeApi|undefined,controller:AbortController|undefined,complete=false,loading=false;
function fatal():never{api?.abortUnknown();active=undefined;throw new Error('pgc.follow_close_unconfirmed');}
async function finish(value?:PgcFollowValue,error?:unknown):Promise<void>{
 if(complete||!active)return;
 try{await api?.close();}catch{fatal();}
 const request=active;active=undefined;complete=true;
 worker.postMessage(parsePgcFollowResult({version:1,operation:'pgc-follow',scope:request.scope,closed:true,...(value?{kind:'ok',value}:{kind:'error',code:vodNativeFailure(error)})}));
}
worker.onmessage=event=>{
 if(complete)return;
 if(active){
  try{const v=record(event.data);vodKeys(v,['version','operation','scope','control']);if(v.version!==1||v.operation!=='pgc-follow'||v.control!=='stop'||JSON.stringify(v.scope)!==JSON.stringify(active.scope))return;}catch{return;}
  controller?.abort();if(!loading&&!api)void finish(undefined,new DomainError('cancelled'));return;
 }
 try{active=parsePgcFollowRequest(event.data);}catch{return;}
 controller=new AbortController();loading=true;
 const module={arguments:[],noInitialRun:true,noExitRuntime:true,onRuntimeInitialized(){
  loading=false;api=new PgcFollowNativeApi(worker.Module);
  if(controller!.signal.aborted){void finish(undefined,new DomainError('cancelled'));return;}
  const request=active!;
  void api.execute(request.command,request.account,controller!.signal).then(value=>finish(value),error=>finish(undefined,error));
 },print(line:unknown){api?.receive(line);},printErr(){},onAbort:fatal,locateFile:(name:string)=>'pgc-follow/'+name};
 worker.Module=module as unknown as VodApiNative;
 try{worker.importScripts('pgc-follow/probe.js');}catch{loading=false;void finish(undefined,new DomainError('unsupported'));}
};
