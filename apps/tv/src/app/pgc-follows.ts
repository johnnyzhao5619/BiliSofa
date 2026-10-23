import {DomainError,type Scope} from '../../../../packages/contracts/src/index.ts';
import type {AccountRuntime} from '../../../../packages/contracts/src/private-account.ts';
import {parsePgcFollowValue,type PgcFollowCommand,type PgcFollowValue,type PgcFollowQuery,type PgcFollowPage} from '../../../../packages/contracts/src/pgc-follow-dto.ts';
import type {ResourceOwner} from './resource-owner.ts';
import type {AccountWorkspace} from './account-workspace.ts';
export interface PgcFollows {
 state(seasonId:string):Promise<'yes'|'no'|'unknown'>;
 set(seasonId:string,follow:boolean,confirmed:boolean):Promise<'yes'|'no'|'unknown'>;
 list(query:PgcFollowQuery):Promise<PgcFollowPage>;
 /** Why the last state/set ended without a confirmed state (0.49.0); a fixed code, never outside text. */
 issue():FollowIssue|undefined;
 /** Outcome of the last write this press sent (0.49.1): B站's acknowledgement, not proof of the state. */
 lastWrite():{ack:'accepted'|'rejected';apiCode?:number}|undefined;
}
export type FollowIssue='login'|'network'|'journal'|'unauthenticated'|'rejected'|'unresolved'|'cancelled'|'failed';
const issueOf=(error:unknown):FollowIssue=>{const code=error instanceof DomainError?error.code:'invalid';return code==='login'?'login':code==='network'||code==='timeout'?'network':code==='unknown'?'unresolved':code==='cancelled'?'cancelled':code==='permission'?'rejected':'failed';};
/** Public capability; no account cookies/CSRF or native request input in UI. */
export function pgcFollows(owner:ResourceOwner,workspace:AccountWorkspace):PgcFollows {
 let pending:Promise<unknown>|undefined,closed=true,lastIssue:FollowIssue|undefined,written:{ack:'accepted'|'rejected';apiCode?:number}|undefined;
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
 // The journal reconcile turns any failure into 'unknown'; keep the reason so the page can say why.
 const state=(seasonId:string)=>{let read:'yes'|'no'|'unknown'|undefined,failure:FollowIssue|undefined;
  return workspace.reconcileBangumi(seasonId,async(runtime,scope,signal)=>{try{const result=await invoke(runtime,scope,signal,{kind:'state',seasonId});if(result.kind!=='state')throw new DomainError('invalid');read=result.followed;return result.followed;}catch(error){failure=issueOf(error);throw error;}})
   .then(value=>{lastIssue=value!=='unknown'?undefined:failure??(read==='yes'||read==='no'?'journal':read==='unknown'?'unauthenticated':'failed');return value;},error=>{lastIssue=issueOf(error);throw error;});
 };
 return {
  state:seasonId=>guard(()=>state(seasonId)),
  issue:()=>lastIssue,
  lastWrite:()=>written,
  set:(seasonId,follow,confirmed)=>guard(async()=>{
   if(confirmed!==true)throw new DomainError('permission');lastIssue=undefined;written=undefined;
   // A stale/unknown marker is never cleared by another POST. Explicit state
   // inspection must have completed before a new confirmation can dispatch.
   try{await workspace.submit(follow?'bangumi-follow':'bangumi-unfollow',`ss:${seasonId}`,async(runtime,scope,signal)=>{
    const result=await invoke(runtime,scope,signal,{kind:'write',seasonId,follow});if(result.kind!=='write')throw new DomainError('invalid');written={ack:result.ack,...(result.apiCode===undefined?{}:{apiCode:result.apiCode})};return result.ack==='rejected'?'rejected':'unknown';
   },true);}catch(error){lastIssue=issueOf(error);throw error;}
   await Promise.allSettled([...nativePending]);
   if(owner.signal.aborted||!closed)return 'unknown';return state(seasonId);
  }),
  list:query=>guard(async()=>{const result=await workspace.read((runtime,scope,signal)=>invoke(runtime,scope,signal,{kind:'list',query}),parsePgcFollowValue);if(result.kind!=='list')throw new DomainError('invalid');return result.page;})
 };
}
