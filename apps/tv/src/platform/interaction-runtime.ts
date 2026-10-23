import {DomainError} from '../../../../packages/contracts/src/index.ts';
import {parsePrivateAccount,type PrivateAccount} from '../../../../packages/contracts/src/private-account.ts';
import {vodBvid} from '../../../../packages/contracts/src/vod-catalog.ts';
import {InteractionReadError,interactionReady,parseVideoOperation,parseInteractionRequest,parseInteractionResult,type InteractionRequest,type InteractionResult,type InteractionCommand,type InteractionState,type InteractionIntent} from '../../../../packages/contracts/src/video-interactions.ts';
import type {VideoInteractionAccess,InteractionSnapshot,InteractionOutcome,InteractionReadFamily} from '../../../../packages/contracts/src/video-interactions-dto.ts';
import {interactionWrites} from './interaction-journal.ts';
import {ScopedGuestWorker} from './scoped-guest-worker.ts';
import type {InteractionWrites} from '../../../../packages/bili-client/src/interaction-writes.ts';
/** Independent optional lane never acquires/closes the media decoder's account
 * owner. All authority is revoked by the owning VOD facade's source/Home close. */
export class InteractionRuntime{
 private authenticationLost=false;private generation=1;private request=0;private closed=false;private poisoned=false;private pending:Promise<unknown>|undefined;
 private worker:ScopedGuestWorker<InteractionRequest,InteractionResult>|undefined;
 private account:PrivateAccount|undefined;
 constructor(account:PrivateAccount,private readonly writes:InteractionWrites=interactionWrites(),private readonly allowIrreversible=false){this.account=parsePrivateAccount(account);}
 access(raw:string):VideoInteractionAccess{
  const accountId=this.account?.id;if(!accountId||this.closed)throw new DomainError('cancelled');
  const bvid=vodBvid(raw),generation=this.generation;let snapshot:InteractionState|undefined,token='',issued=0,retired=false;
  const alive=(signal:AbortSignal)=>{if(this.authenticationLost)throw new DomainError('login');if(signal.aborted||retired||this.closed||generation!==this.generation)throw new DomainError('cancelled');if(this.poisoned)throw new DomainError('unknown');};
  const invoke=async(command:InteractionCommand,signal:AbortSignal)=>{
   alive(signal);const worker=new ScopedGuestWorker<InteractionRequest,InteractionResult>('interaction-worker.js','video-interactions',parseInteractionRequest,parseInteractionResult,75000,13000,(q,r)=>r.kind!=='ok'||r.value.kind===q.command.kind&&(r.value.kind!=='state'||r.value.state.bvid===q.command.bvid));this.worker=worker;
   try{const result=await worker.run({version:1,operation:'video-interactions',scope:{accountId:accountId,generation,mediaSessionId:'video_interaction',requestId:`interaction_${++this.request}`},account:this.account!,command},signal);alive(signal);if(result.kind==='error'){if(result.code==='login'){this.authenticationLost=true;this.account=undefined;token='';snapshot=undefined;}throw result.phase?new InteractionReadError(result.phase,result.code):new DomainError(result.code);}return result.value;}
   finally{try{await worker.dispose();}catch{this.poisoned=true;throw new DomainError('unknown');}finally{if(this.worker===worker)this.worker=undefined;}}
  };
  const read=async(signal:AbortSignal,family?:InteractionReadFamily)=>{const value=await invoke({kind:'state',bvid,...(family?{family}:{})},signal);if(value.kind!=='state')throw new DomainError('invalid');snapshot=value.state;return snapshot;};
  const publish=(s:InteractionState):InteractionSnapshot=>{
   const flags=this.writes.inspect(accountId,s);token=Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');issued=Date.now();
   return{token,bvid,title:s.title,owner:s.owner,liked:s.liked,followed:s.followed,watchLater:s.watchLater,coins:s.coins,coinLimit:s.coinLimit,balance:s.balance,folders:s.folders?.map((f,i)=>({key:`f${i}`,title:f.title,selected:f.selected}))??null,...(s.unavailable?{unavailable:{...s.unavailable}}:{}),...flags};
  };
  const guard=<T>(signal:AbortSignal,run:()=>Promise<T>):Promise<T>=>{try{alive(signal);if(this.pending)throw new DomainError('permission');const task=Promise.resolve().then(run);this.pending=task;void task.finally(()=>{if(this.pending===task)this.pending=undefined;}).catch(()=>{});return task;}catch(e){return Promise.reject(e);}};
  return{
   read:(signal,family)=>guard(signal,async()=>{token='';const s=await read(signal,family);let reconciled:InteractionSnapshot['reconciled'];try{reconciled=this.writes.pendingActions(accountId,s);this.writes.reconcile(accountId,s);}catch{/* Read remains useful, journal locks writes. */}return {...publish(s),...(reconciled?.length?{reconciled}:{})};}),
   submit:(grant,rawOperation,confirmed,signal)=>guard(signal,async()=>{
    alive(signal);const operation=parseVideoOperation(rawOperation);if(!this.allowIrreversible&&(operation.kind==='coin'||operation.kind==='triple'))throw new DomainError('permission');if(confirmed!==true||!snapshot||!token||grant!==token||Date.now()-issued>120000)throw new DomainError('permission');
    // The in-memory grant is one-use even when preconditions reject dispatch.
    token='';let current=snapshot;snapshot=undefined;
    const folder='folder'in operation?current.folders?.[Number(operation.folder.slice(1))]:undefined;if('folder'in operation&&!folder)throw new DomainError('invalid');
    const list:InteractionIntent[]=operation.kind==='triple'?[...(!current.liked?[{kind:'like' as const,on:true,folderId:'',quantity:0}]:[]),{kind:'coin',on:true,folderId:'',quantity:operation.quantity},...(!folder!.selected?[{kind:'favorite' as const,on:true,folderId:folder!.id,quantity:0}]:[])]:[{kind:operation.kind,on:'on'in operation?operation.on:true,folderId:folder?.id??'',quantity:'quantity'in operation?operation.quantity:0}];
    if(('quantity'in operation)&&(current.coins!+operation.quantity>current.coinLimit||current.balance!<operation.quantity||this.writes.inspect(accountId,current).coinLocked))throw new DomainError('permission');
    if(list.some(intent=>!interactionReady(current,intent)))throw new DomainError('permission');
    const diagnostics:string[]=[];const note=(error:unknown)=>{if(diagnostics.length<3)diagnostics.push(`interaction.${error instanceof InteractionReadError?error.phase:'write'}.${error instanceof DomainError?error.code:'unknown'}`);};
    const steps:InteractionOutcome['steps']=[];let readBack:InteractionState|undefined;
    for(const intent of list){
     alive(signal);const expected=current;
     const result=await this.writes.submit(accountId,expected,intent,true,signal,async()=>{try{const result=await invoke({kind:'write',bvid,expected,intent},signal);if(result.kind!=='write')throw new DomainError('invalid');if(result.apiCode!==undefined)diagnostics.push(`interaction.write.api_${result.apiCode}`);if(result.reason)diagnostics.push(`interaction.preflight.${result.reason}`);return result.ack;}catch(error){note(error);throw error;}},async()=>{try{readBack=await read(signal,['like','follow','watch-later'].includes(intent.kind)?intent.kind as InteractionReadFamily:undefined);current=readBack;return readBack;}catch(error){note(error);throw error;}});
     steps.push({kind:intent.kind,state:result==='not-sent'?'not-applied':result==='pending'?'unknown':result});
     if(result!=='confirmed')break;
    }
    alive(signal);const state=steps.every(s=>s.state==='confirmed')?'confirmed':steps.some(s=>s.state==='confirmed')?'partial':steps.some(s=>s.state==='unknown')?'unknown':'not-applied';
    return{state,steps,...(diagnostics.length?{diagnostics:diagnostics.slice(0,3)}:{}),...(readBack?{snapshot:publish(readBack)}:{})};
   }),
   close:async()=>{retired=true;token='';snapshot=undefined;if(generation===this.generation)await this.reset();}
  };
 }
 async reset():Promise<void>{this.generation++;try{await this.worker?.dispose();}catch{this.poisoned=true;}await this.pending?.catch(()=>{});if(this.poisoned)throw new DomainError('unknown');}
 async close():Promise<void>{this.closed=true;this.account=undefined;await this.reset();}
}
