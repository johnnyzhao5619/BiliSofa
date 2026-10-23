import {DomainError,type Scope} from '../../../../packages/contracts/src/index.ts';
import {parseLiveBatch,parseLiveAreas,parseLiveCatalog,parseLiveMessages,parseLiveSourceStatus,type LiveAccess} from '../../../../packages/contracts/src/live-product.ts';
import type {AccountWorkspace} from './account-workspace.ts';
/** Keeps later source reads inside the coordinator, so server-side identity loss
 * hides private views even after the platform facade was initially acquired. */
export async function accountLiveAccess(workspace:AccountWorkspace,media:boolean,pageSignal:AbortSignal):Promise<LiveAccess>{
  async function linked<T>(signal:AbortSignal,work:(signal:AbortSignal)=>Promise<T>,other?:AbortSignal):Promise<T>{
    const controller=new AbortController(),abort=()=>controller.abort();for(const s of [signal,pageSignal,...(other?[other]:[])]){s.addEventListener('abort',abort,{once:true});if(s.aborted)controller.abort();}
    try{return await work(controller.signal);}finally{for(const s of [signal,pageSignal,...(other?[other]:[])])s.removeEventListener('abort',abort);}
  }
  const owned=await workspace.read(async(runtime,scope,signal)=>{if(!runtime.openLive)throw new DomainError('unsupported');const actor=await linked(signal,s=>runtime.openLive!(media,scope,s));return {actor,accountId:scope.accountId,generation:scope.generation};},value=>{
    const v=value as {actor:LiveAccess;accountId:string;generation:number};if(!v?.actor||['browse','areas','room','messages','transport','close'].some(k=>typeof(v.actor as unknown as Record<string,unknown>)[k]!=='function'))throw new DomainError('invalid');return v;
  });
  if(pageSignal.aborted){await owned.actor.close();throw new DomainError('cancelled');}
  const check=(scope:Scope)=>{if(scope.accountId!==owned.accountId||scope.generation!==owned.generation||pageSignal.aborted)throw new DomainError('cancelled');};
  const read=<T>(signal:AbortSignal,work:(s:AbortSignal)=>Promise<T>,parse:(raw:unknown)=>T)=>workspace.read((_runtime,scope,accountSignal)=>{check(scope);return linked(accountSignal,work,signal);},parse);
  return {sourceStatus:()=>{if(pageSignal.aborted)return undefined;const status=owned.actor.sourceStatus?.();return status?parseLiveSourceStatus(status):undefined;},browse:(q,s)=>read(s,signal=>owned.actor.browse(q,signal),parseLiveBatch),areas:s=>read(s,signal=>owned.actor.areas(signal),parseLiveAreas),room:(q,s)=>read(s,signal=>owned.actor.room(q,signal),parseLiveCatalog),messages:(id,s)=>read(s,signal=>owned.actor.messages(id,signal),parseLiveMessages),transport:id=>owned.actor.transport(id),close:()=>owned.actor.close()};
}
