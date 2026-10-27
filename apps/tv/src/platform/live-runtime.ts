import { createServiceWorker } from './service-worker.ts';
import {DomainError,record,type MediaSource} from '../../../../packages/contracts/src/index.ts';
import {parsePrivateAccount,type PrivateAccount} from '../../../../packages/contracts/src/private-account.ts';
import {parseLiveBrowse,parseLiveSelection,parseLiveBatch,parseLiveAreas,parseLiveCatalog,parseLiveMessages,liveId,LiveReadFailure,parseLiveSourceStatus,type LiveSourceStatus,type LiveAccess,type LiveCatalog,type LiveBrowseQuery,type LiveSelection} from '../../../../packages/contracts/src/live-product.ts';
import {parseVodCapabilities,vodNonce,vodErrorCode} from '../../../../packages/contracts/src/vod-runtime.ts';
import {vodKeys,type VodCapabilities} from '../../../../packages/contracts/src/vod-catalog.ts';
import {liveRelayUrl} from '../../../../packages/contracts/src/live-probe.ts';
import type {VodWorkerPort} from './vod-runtime.ts';
interface Deferred<T>{promise:Promise<T>;resolve(value:T):void;reject(reason:unknown):void;}
function deferred<T>():Deferred<T>{let resolve!:(value:T)=>void,reject!:(reason:unknown)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});void promise.catch(()=>{});return {promise,resolve,reject};}
async function bounded<T>(work:Promise<T>,ms:number):Promise<T>{let timer:ReturnType<typeof setTimeout>|undefined;try{return await Promise.race([work,new Promise<never>((_yes,no)=>{timer=setTimeout(()=>no(new DomainError('timeout')),ms);})]);}finally{clearTimeout(timer);}}
function nonce(){return [...crypto.getRandomValues(new Uint8Array(16))].map(n=>n.toString(16).padStart(2,'0')).join('');}
/** One top-level Worker with a single linked runtime. API+cookie cleanup
 * precedes anonymous CDN serving; no signed source or cookie returns to UI. */
export class LiveRuntime implements LiveAccess {
  private readonly owner:string;
  private readonly caps:VodCapabilities|undefined;
  private account:PrivateAccount|undefined;
  private worker:VodWorkerPort|undefined;
  private ready=deferred<void>();
  private request=0;
  private pending:{id:number;kind:string;reply:Deferred<unknown>}|undefined;
  private catalog:LiveCatalog|undefined;
  private terminal:Deferred<void>|undefined;
  private source:LiveSourceStatus|undefined;
  sourceStatus():LiveSourceStatus|undefined{return this.source?{...this.source}:undefined;}
  private taken=false;
  private ended=false;
  private poisoned=false;
  private closed:Deferred<void>|undefined;
  private closeRequest=0;
  private closing:Promise<void>|undefined;
  constructor(caps?:VodCapabilities,account?:PrivateAccount,
    private readonly factory:(file:string)=>VodWorkerPort=file=>createServiceWorker(file),makeNonce=nonce,
    private readonly readMs=45000,private readonly closeMs=13000){
    this.owner=vodNonce(makeNonce());this.caps=caps===undefined?undefined:parseVodCapabilities(caps);this.account=account===undefined?undefined:parsePrivateAccount(account);
    if(!Number.isInteger(readMs)||readMs<10||readMs>90000||!Number.isInteger(closeMs)||closeMs<10||closeMs>60000)throw new DomainError('invalid');
  }
  private fault(){if(this.poisoned)return;this.poisoned=true;const error=new DomainError('unknown');this.ready.reject(error);this.pending?.reply.reject(error);this.terminal?.reject(error);this.closed?.reject(error);}
  private initialize():Promise<void>{
    if(this.poisoned||this.closing)return Promise.reject(new DomainError(this.poisoned?'unknown':'cancelled'));
    if(!this.worker){
      const worker=this.factory('live-product-worker.js');this.worker=worker;
      worker.onerror=worker.onmessageerror=()=>this.fault();worker.onmessage=event=>{
        try{
          const v=record(event.data);if(v.version!==1||v.owner!==this.owner||!Number.isSafeInteger(v.request))throw new DomainError('invalid');
          if(v.kind==='fault'){vodKeys(v,['version','owner','request','kind','code']);this.fault();return;}
          if(v.kind==='ready'){vodKeys(v,['version','owner','request','kind']);if(v.request!==0)throw new DomainError('invalid');this.ready.resolve();return;}
          if(v.kind==='closed'){vodKeys(v,['version','owner','request','kind']);if(!this.closed||v.request!==this.closeRequest)throw new DomainError('invalid');this.closed.resolve();return;}
          if(v.kind==='source-status'){vodKeys(v,['version','owner','request','kind','source']);if(v.request!==0)throw new DomainError('invalid');this.source=parseLiveSourceStatus(v.source);return;}
          if(v.kind==='stopped'){vodKeys(v,['version','owner','request','kind','code','closed',...(v.source===undefined?[]:['source'])]);if(v.source!==undefined)this.source=parseLiveSourceStatus(v.source);if(v.request!==0||v.closed!==true||!this.terminal)throw new DomainError('invalid');this.ended=true;this.terminal.reject(new DomainError(vodErrorCode(v.code)));return;}
          if(!this.pending||v.request!==this.pending.id){if(this.closing&&Number(v.request)<this.closeRequest)return;throw new DomainError('invalid');}
          if(v.kind==='error'){vodKeys(v,['version','owner','request','kind','code',...(v.apiCode===undefined?[]:['apiCode']),...(v.source===undefined?[]:['source'])]);if(v.source!==undefined)this.source=parseLiveSourceStatus(v.source);const code=vodErrorCode(v.code);if(code==='unknown'){this.fault();return;}const apiCode=v.apiCode;if(apiCode!==undefined&&!Number.isSafeInteger(apiCode))throw new DomainError('invalid');this.pending.reply.reject(new LiveReadFailure(code,apiCode as number|undefined));return;}
          if(v.kind==='started'&&this.pending.kind==='start'){vodKeys(v,['version','owner','request','kind','url']);this.pending.reply.resolve(liveRelayUrl(v.url));return;}
          vodKeys(v,['version','owner','request','kind','result']);if(v.kind!==this.pending.kind)throw new DomainError('invalid');this.pending.reply.resolve(v.result);
        }catch{this.fault();}
      };
      worker.postMessage({version:1,owner:this.owner,kind:'init',mode:this.caps?'media':'read',...(this.caps?{capabilities:this.caps}:{}),...(this.account?{account:this.account}:{})});this.account=undefined;
    }
    return bounded(this.ready.promise,this.readMs).catch(error=>{if(!this.closing)this.fault();throw error;});
  }
  private async read<T>(kind:string,payload:object,parse:(raw:unknown)=>T,signal:AbortSignal):Promise<T>{
    if(this.pending||this.closing||this.poisoned||signal.aborted||this.taken&&kind!=='start')throw new DomainError(this.poisoned?'unknown':'cancelled');
    const pending={id:++this.request,kind,reply:deferred<unknown>()};this.pending=pending;
    const abort=()=>{pending.reply.reject(new DomainError('cancelled'));void this.close().catch(()=>{});};signal.addEventListener('abort',abort,{once:true});
    try{await this.initialize();if(signal.aborted||this.closing)throw new DomainError('cancelled');this.worker!.postMessage({version:1,owner:this.owner,request:pending.id,kind,...payload});const result=await bounded(pending.reply.promise,this.readMs);if(signal.aborted||this.closing)throw new DomainError('cancelled');try{return parse(result);}catch(error){this.fault();throw error;}}
    catch(error){if(error instanceof DomainError&&error.code==='timeout')this.fault();throw error;}
    finally{signal.removeEventListener('abort',abort);if(this.pending===pending)this.pending=undefined;}
  }
  browse(query:LiveBrowseQuery,signal:AbortSignal){return this.read('browse',{query:parseLiveBrowse(query)},parseLiveBatch,signal);}
  areas(signal:AbortSignal){return this.read('areas',{},parseLiveAreas,signal);}
  messages(roomId:string,signal:AbortSignal){return this.read('messages',{roomId:liveId(roomId)},value=>{const parsed=parseLiveMessages(value);if(parsed.roomId!==roomId)throw new DomainError('invalid');return parsed;},signal);}
  async room(query:LiveSelection,signal:AbortSignal){
    this.catalog=undefined;const selection=parseLiveSelection(query),value=await this.read('room',{query:selection},parseLiveCatalog,signal);if(value.roomId!==selection.roomId){this.fault();throw new DomainError('invalid');}this.catalog=value;return value;
  }
  transport(catalogId:string){
    if(!this.caps||this.taken||this.poisoned||this.closing||!this.catalog||this.catalog.state!=='live'||this.catalog.id!==vodNonce(catalogId))throw new DomainError('invalid');
    this.taken=true;this.terminal=deferred<void>();const terminal=this.terminal;let started=false;
    return {
      run:async(signal:AbortSignal,ready:(source:MediaSource)=>void)=>{
        if(started||signal.aborted||this.closing)throw new DomainError('cancelled');started=true;
        const abort=()=>{void this.close().catch(()=>{});};signal.addEventListener('abort',abort,{once:true});
        try{
          const url=await this.read('start',{catalogId},liveRelayUrl,signal);
          // Keep the observed retail warm-request path; its opaque completion is
          // not reported as HTTP or decoder proof. Only the fixed local URL is used.
          const local=new AbortController(),stop=()=>local.abort(),timer=setTimeout(stop,12000);signal.addEventListener('abort',stop,{once:true});
          try{const response=await fetch(url,{mode:'no-cors',cache:'no-store',signal:local.signal});await response.body?.cancel();}catch{/* The SDK may still reach the bounded local listener. */}finally{clearTimeout(timer);signal.removeEventListener('abort',stop);}
          if(this.closing||signal.aborted||this.ended)throw new DomainError('cancelled');ready({kind:'live',url});await terminal.promise;
        }finally{signal.removeEventListener('abort',abort);}
      },
      close:()=>this.close()
    };
  }
  close():Promise<void>{
    if(!this.closing)this.closing=Promise.resolve().then(async()=>{
      this.account=undefined;this.catalog=undefined;this.ready.reject(new DomainError('cancelled'));this.pending?.reply.reject(new DomainError('cancelled'));
      try{
        if(this.poisoned)throw new DomainError('unknown');if(!this.worker)return;
        this.closed=deferred<void>();this.closeRequest=++this.request;this.worker.postMessage({version:1,owner:this.owner,request:this.closeRequest,kind:'close'});await bounded(this.closed.promise,this.closeMs);
      }catch{this.fault();throw new DomainError('unknown');}
      finally{this.worker?.terminate();this.worker=undefined;this.terminal?.resolve();}
    });return this.closing;
  }
}
/** Pages receive closures only, never the platform instance's private bootstrap. */
export function createLiveAccess(caps?:VodCapabilities,account?:PrivateAccount):LiveAccess {
  const actor=new LiveRuntime(caps,account);return {sourceStatus:()=>actor.sourceStatus(),browse:(q,s)=>actor.browse(q,s),areas:s=>actor.areas(s),messages:(id,s)=>actor.messages(id,s),room:(q,s)=>actor.room(q,s),transport:id=>actor.transport(id),close:()=>actor.close()};
}
