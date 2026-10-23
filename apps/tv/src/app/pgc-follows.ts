import {DomainError,type Scope} from '../../../../packages/contracts/src/index.ts';
import type {AccountRuntime} from '../../../../packages/contracts/src/private-account.ts';
import {parsePgcFollowValue,type PgcFollowCommand,type PgcFollowValue,type PgcFollowQuery,type PgcFollowPage} from '../../../../packages/contracts/src/pgc-follow-dto.ts';
import type {ResourceOwner} from './resource-owner.ts';
import type {AccountWorkspace} from './account-workspace.ts';
export interface PgcFollows {
 state(seasonId:string):Promise<'yes'|'no'|'unknown'>;
 set(seasonId:string,follow:boolean,confirmed:boolean):Promise<'yes'|'no'|'unknown'>;
 list(query:PgcFollowQuery):Promise<PgcFollowPage>;
}
/** Public capability; no account cookies/CSRF or native request input in UI. */
export function pgcFollows(owner:ResourceOwner,workspace:AccountWorkspace):PgcFollows {
 let pending:Promise<unknown>|undefined,closed=true;
 const nativePending=new Set<Promise<unknown>>();
 // Drain the native lane, not workspace.read(): login invalidation itself waits
 // for this view to close. Waiting for the application promise would deadlock.
 owner.add('pgc-follow-request',async()=>{await Promise.allSettled([...nativePending]);if(!closed)throw new DomainError('unknown');});
 async function invoke(runtime:AccountRuntime,scope:Scope,signal:AbortSignal,command:PgcFollowCommand):Promise<PgcFollowValue>{
  if(owner.signal.aborted||signal.aborted)throw new DomainError('cancelled');if(!closed)throw new DomainError('unknown');if(!runtime.pgcFollow)throw new DomainError('unsupported');
  const controller=new AbortController(),abort=()=>controller.abort();owner.signal.addEventListener('abort',abort,{once:true});signal.addEventListener('abort',abort,{once:true});
  const operation=Promise.resolve().then(()=>runtime.pgcFollow!(command,scope,controller.signal));nativePending.add(operation);
  try{return parsePgcFollowValue(await operation);}
  catch(e){if(!(e instanceof DomainError)||e.code==='unknown')closed=false;throw e;}
  finally{nativePending.delete(operation);owner.signal.removeEventListener('abort',abort);signal.removeEventListener('abort',abort);}
 }
 function guard<T>(work:()=>Promise<T>):Promise<T>{
  if(pending||nativePending.size||owner.signal.aborted)return Promise.reject(new DomainError('cancelled'));if(!closed)return Promise.reject(new DomainError('unknown'));
  const operation=work();pending=operation;void operation.finally(()=>{if(pending===operation)pending=undefined;}).catch(()=>{});return operation;
 }
 const state=(seasonId:string)=>workspace.reconcileBangumi(seasonId,async(runtime,scope,signal)=>{const result=await invoke(runtime,scope,signal,{kind:'state',seasonId});if(result.kind!=='state')throw new DomainError('invalid');return result.followed;});
 return {
  state:seasonId=>guard(()=>state(seasonId)),
  set:(seasonId,follow,confirmed)=>guard(async()=>{
   if(confirmed!==true)throw new DomainError('permission');
   // A stale/unknown marker is never cleared by another POST. Explicit state
   // inspection must have completed before a new confirmation can dispatch.
   await workspace.submit(follow?'bangumi-follow':'bangumi-unfollow',`ss:${seasonId}`,async(runtime,scope,signal)=>{
    const result=await invoke(runtime,scope,signal,{kind:'write',seasonId,follow});if(result.kind!=='write')throw new DomainError('invalid');return result.ack==='rejected'?'rejected':'unknown';
   },true);
   await Promise.allSettled([...nativePending]);
   if(owner.signal.aborted||!closed)return 'unknown';return state(seasonId);
  }),
  list:query=>guard(async()=>{const result=await workspace.read((runtime,scope,signal)=>invoke(runtime,scope,signal,{kind:'list',query}),parsePgcFollowValue);if(result.kind!=='list')throw new DomainError('invalid');return result.page;})
 };
}
