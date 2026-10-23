import {DomainError,record,parseScope,type Scope} from './index.ts';
import {parsePrivateAccount,type PrivateAccount} from './private-account.ts';
import {vodKeys} from './vod-catalog.ts';
import {parsePgcFollowCommand,parsePgcFollowValue,type PgcFollowCommand,type PgcFollowValue} from './pgc-follow-dto.ts';
export * from './pgc-follow-dto.ts';
export interface PgcFollowRequest {version:1;operation:'pgc-follow';scope:Scope;account:PrivateAccount;command:PgcFollowCommand;}
export type PgcFollowResult = {version:1;operation:'pgc-follow';scope:Scope;closed:true}&({kind:'ok';value:PgcFollowValue}|{kind:'error';code:'invalid'|'login'|'permission'|'network'|'timeout'|'cancelled'|'unknown'|'unsupported'});
export function parsePgcFollowRequest(value:unknown):PgcFollowRequest {
 const v=record(value);vodKeys(v,['version','operation','scope','account','command']);if(v.version!==1||v.operation!=='pgc-follow')throw new DomainError('invalid');const scope=parseScope(v.scope),account=parsePrivateAccount(v.account);
 if(scope.accountId!==account.id||scope.generation<1)throw new DomainError('permission');return {version:1,operation:'pgc-follow',scope,account,command:parsePgcFollowCommand(v.command)};
}
export function parsePgcFollowResult(value:unknown):PgcFollowResult {
 const v=record(value);vodKeys(v,['version','operation','scope','closed','kind',v.kind==='ok'?'value':'code']);if(v.version!==1||v.operation!=='pgc-follow'||v.closed!==true)throw new DomainError('invalid');const base={version:1 as const,operation:'pgc-follow' as const,scope:parseScope(v.scope),closed:true as const};
 if(v.kind==='ok')return {...base,kind:'ok',value:parsePgcFollowValue(v.value)};
 if(v.kind!=='error'||!['invalid','login','permission','network','timeout','cancelled','unknown','unsupported'].includes(String(v.code)))throw new DomainError('invalid');return {...base,kind:'error',code:v.code as Extract<PgcFollowResult,{kind:'error'}>['code']};
}
