import {DomainError} from '../../../../packages/contracts/src/index.ts';
import type {VodAccess,PgcAccess} from '../../../../packages/contracts/src/vod-runtime.ts';
/** A returned media capability remains bound to the verified account generation.
 * Notification starts revocation, but never waits for the view that owns this call. */
export function accountCapability<T extends VodAccess>(access:T,current:()=>boolean,expired:()=>void, expiresAt?:number, clock:()=>number=()=>Date.now()):T {
  const assert=()=>{if(!current())throw new DomainError('cancelled');if(expiresAt!==undefined){const now=clock();if(!Number.isFinite(now))throw new DomainError('invalid');if(now>=expiresAt){expired();throw new DomainError('login');}}};
  async function read<V>(work:()=>Promise<V>):Promise<V>{
    assert();try{const value=await work();assert();return value;}
    catch(error){if(current()&&error instanceof DomainError&&error.code==='login')expired();throw error;}
  }
  const result:VodAccess={
    read:(query,signal)=>read(()=>access.read(query,signal)),
    transport:choice=>{assert();const transport=access.transport(choice);return {run:(signal,ready)=>read(()=>transport.run(signal,source=>{if(current())ready(source);})),close:()=>transport.close()};},
    close:()=>access.close(),
    ...(access.usable?{usable:()=>current()&&access.usable!()}:{}),
    ...(access.interactions?{interactions:(id:string)=>{assert();const lane=access.interactions!(id);return {read:(...args:Parameters<typeof lane.read>)=>read(()=>lane.read(...args)),submit:(...args:Parameters<typeof lane.submit>)=>read(()=>lane.submit(...args)),close:()=>lane.close()};}}:{}),
    ...(access.comments?{comments:(id:string)=>{assert();const lane=access.comments!(id);return {read:(...args:Parameters<typeof lane.read>)=>read(()=>lane.read(...args)),close:()=>lane.close()};}}:{}),
    ...(access.overlays?{overlays:(id:string)=>{assert();const lane=access.overlays!(id);return {identity:lane.identity,read:(...args:Parameters<typeof lane.read>)=>read(()=>lane.read(...args)),close:()=>lane.close()};}}:{}),
    ...(access.overlayPreferences?{overlayPreferences:access.overlayPreferences}:{})
  };
  if('season'in access&&typeof access.season==='function')Object.assign(result,{season:(signal:AbortSignal)=>read(()=>(access as unknown as PgcAccess).season(signal))});
  return result as T;
}
