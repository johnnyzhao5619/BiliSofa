import {DomainError} from '../../../../packages/contracts/src/index.ts';
import type {LiveAccess} from '../../../../packages/contracts/src/live-product.ts';
import type {ResourceOwner} from './resource-owner.ts';
export type OpenLive=(media:boolean,signal:AbortSignal)=>Promise<LiveAccess>;
/** The application promise may be waiting for account invalidation to close
 * this page. Drain only the actual actor; late facades cannot start native work. */
export function liveReader(owner:ResourceOwner,open:OpenLive){
  let actor:LiveAccess|undefined,busy=false,unsafe=false;
  owner.add('live-read-actor',async()=>{try{await actor?.close();}catch{unsafe=true;}if(unsafe)throw new DomainError('unknown');});
  return {async run<T>(work:(actor:LiveAccess)=>Promise<T>):Promise<T>{
    if(busy||owner.signal.aborted)throw new DomainError('cancelled');if(unsafe)throw new DomainError('unknown');busy=true;
    let current:LiveAccess|undefined;
    try{current=await open(false,owner.signal);if(owner.signal.aborted){await current.close();throw new DomainError('cancelled');}actor=current;const result=await work(current);await current.close();if(owner.signal.aborted)throw new DomainError('cancelled');return result;}
    finally{try{await current?.close();}catch{unsafe=true;throw new DomainError('unknown');}finally{if(actor===current)actor=undefined;busy=false;}}
  }};
}
