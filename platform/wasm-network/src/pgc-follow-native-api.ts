import {DomainError} from '../../../packages/contracts/src/index.ts';
import type {PrivateAccount} from '../../../packages/contracts/src/private-account.ts';
import {parsePgcFollowCommand,type PgcFollowCommand,type PgcFollowValue} from '../../../packages/contracts/src/pgc-follow.ts';
import {parsePgcSeasonBody} from '../../../packages/bili-client/src/pgc-season.ts';
import {parsePgcFollowBody,pgcFollowRoot} from '../../../packages/bili-client/src/pgc-follow.ts';
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
    return {kind:'state',followed:parsePgcSeasonBody(this.json(),command.seasonId,true).summary.followed};
   }
   const csrf=verified.cookieLines.split('\n').map(line=>line.split('\t')).find(fields=>fields[5]==='bili_jct')?.[6];
   if(!csrf||!/^[a-f0-9]{32}$/.test(csrf))throw new DomainError('login');
   if(verified.expiresAt<=Date.now())throw new DomainError('login');
   await this.request(command.follow?7:8,`${command.seasonId}|${csrf}`,signal);
   const result=pgcFollowRoot(this.json());if(!Number.isSafeInteger(result.code))throw new DomainError('invalid');
   // API0 is acknowledgement, not proof that a later state read matches.
   return {kind:'write',ack:result.code===0?'accepted':'rejected'};
  });
 }
}
