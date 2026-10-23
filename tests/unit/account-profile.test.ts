import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseAccountProfile} from '../../packages/contracts/src/account-profile.ts';
import {navAccountProfile} from '../../packages/bili-client/src/account-profile.ts';
import {parseAccountIdentity,parsePrivateAccount,type PrivateAccount} from '../../packages/contracts/src/private-account.ts';
import {AccountCoordinator} from '../../packages/bili-client/src/accounts.ts';
const absent={level:null,vipStatus:null,vipType:null},profile={level:5,vipStatus:1 as const,vipType:2 as const};
test('F01 optional nav display fields preserve actual zero; missing/malformed values are unknown and cannot deny valid login',()=>{
 assert.deepEqual(navAccountProfile({level_info:{current_level:5},vipStatus:1,vipType:2,face:'https://outside.invalid',money:999}),profile);
 assert.deepEqual(navAccountProfile({level_info:{current_level:0},vipStatus:0,vipType:0}),{level:0,vipStatus:0,vipType:0});
 for(const raw of [{},{level_info:null},{level_info:{current_level:99},vipStatus:'1',vipType:NaN},{level_info:[],vipStatus:2,vipType:-1}])assert.deepEqual(navAccountProfile(raw),absent);
});
test('F01 profile IPC excludes raw credentials/URLs and cannot silently expand the persisted private session schema',()=>{
 const identity={uid:'101',name:'合成',profile};assert.deepEqual(parseAccountIdentity(identity),identity);assert.deepEqual(parseAccountIdentity({uid:'101',name:'合成'}),{uid:'101',name:'合成'});
 for(const raw of [{...profile,cookie:'synthetic'},{...profile,level:7},{...profile,vipType:'2'},{...profile,vipStatus:undefined}])assert.throws(()=>parseAccountProfile(raw));
 for(const raw of [{...identity,url:'outside'},{...identity,profile:{...profile,url:'outside'}}])assert.throws(()=>parseAccountIdentity(raw));
 const account={schema:1,id:'bili_101',uid:'101',name:'合成',expiresAt:999999999,cookieLines:'.bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\tsynthetic\n'};assert.throws(()=>parsePrivateAccount({...account,profile}));assert.equal(Object.keys(parsePrivateAccount(account)).length,6);
});
test('F01 account profile snapshots are copied, disappear on suspension/guest change and are replaced only by fresh verified identity',async()=>{
 const account:PrivateAccount={schema:1,id:'bili_101',uid:'101',name:'合成',expiresAt:Date.now()+600000,cookieLines:'.bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\tsynthetic\n'};let status:0|1=1;
 const accounts=new AccountCoordinator({list:async()=>[account],read:async()=>account,add:async()=>{throw Error('no save');},remove:async()=>{throw Error('no delete');}},()=>({verify:async()=>({uid:'101',name:'已核对',profile:{...profile,vipStatus:status}}),close:async()=>({closed:true})}),{invalidate:async()=>({closed:true})});
 await accounts.select(account.id);const s=accounts.state;assert.equal(s.kind,'active');if(s.kind!=='active')throw Error();assert.equal(s.profile!.vipStatus,1);s.profile!.level=0;assert.notDeepEqual(s,accounts.state);await accounts.suspend();assert.equal('profile' in accounts.state,false);status=0;await accounts.resume();const next=accounts.state;assert.equal(next.kind,'active');if(next.kind==='active')assert.equal(next.profile!.vipStatus,0);await accounts.select();assert.equal('profile' in accounts.state,false);assert.equal(await accounts.dispose(),true);
});
