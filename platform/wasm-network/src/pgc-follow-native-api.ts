import {DomainError} from '../../../packages/contracts/src/index.ts';
import type {PrivateAccount} from '../../../packages/contracts/src/private-account.ts';
import {parsePgcFollowCommand,type PgcFollowCommand,type PgcFollowValue} from '../../../packages/contracts/src/pgc-follow.ts';
import {parsePgcSeasonBody} from '../../../packages/bili-client/src/pgc-season.ts';
import {parsePgcFollowBody,parsePgcFollowStatusBody,pgcFollowRoot} from '../../../packages/bili-client/src/pgc-follow.ts';
import {VodNativeApi} from './vod-native-api.ts';
export class PgcFollowNativeApi extends VodNativeApi {
 execute(value:PgcFollowCommand,account:PrivateAccount,signal:AbortSignal):Promise<PgcFollowValue> {
  const command=parsePgcFollowCommand(value);
  return this.authorized(signal,account,async(verified,keys)=>{
   if(!verified)throw new DomainError('login');
   if(command.kind==='list'){
    await this.request(6,`${verified.uid}|${command.query.type}|${command.query.page}|${keys.img}|${keys.sub}|${Math.floor(Date.now()/1000)}`,signal);
    return {kind:'list',page:parsePgcFollowBody(this.json(),command.query)};
   }
   if(command.kind==='state'){
    await this.request(4,command.seasonId,signal);
    // Frozen modules still read the season view; 0.49.1 reads the per-user status. Both shapes are accepted.
    const body=this.json(),result=pgcFollowRoot(body).result;
    return {kind:'state',followed:result!==null&&typeof result==='object'&&Array.isArray((result as Record<string,unknown>).episodes)?parsePgcSeasonBody(body,command.seasonId,true).summary.followed:parsePgcFollowStatusBody(body)};
   }
   const csrf=verified.cookieLines.split('\n').map(line=>line.split('\t')).find(fields=>fields[5]==='bili_jct')?.[6];
   if(!csrf||!/^[a-f0-9]{32}$/.test(csrf))throw new DomainError('login');
   if(verified.expiresAt<=Date.now())throw new DomainError('login');
   await this.request(command.follow?7:8,`${command.seasonId}|${csrf}`,signal);
   const result=pgcFollowRoot(this.json());if(!Number.isSafeInteger(result.code))throw new DomainError('invalid');
   // API0 is acknowledgement, not proof that a later state read matches.
   return result.code===0?{kind:'write',ack:'accepted'}:{kind:'write',ack:'rejected',apiCode:Math.max(-2147483647,Math.min(2147483647,result.code as number))};
  });
 }
}
