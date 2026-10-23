import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DomainError} from '../../packages/contracts/src/index.ts';
import type {PrivateAccount,AccountRepository} from '../../packages/contracts/src/private-account.ts';
import type {VodAccess} from '../../packages/contracts/src/vod-runtime.ts';
import {ProtectedAccountStore} from '../../apps/tv/src/platform/private-account-store.ts';
import {LoginCoordinator} from '../../packages/bili-client/src/login.ts';
import {AccountWorkspace} from '../../apps/tv/src/app/account-workspace.ts';
import {NavigationStack} from '../../apps/tv/src/app/navigation.ts';
import type {TvShell} from '../../apps/tv/src/app/tv-shell.ts';
import {accountCapability} from '../../apps/tv/src/app/account-capability.ts';
const signal=()=>new AbortController().signal;
const account=(uid='101',expiresAt=100000):PrivateAccount=>({schema:1,id:'bili_'+uid,uid,name:'合成身份',expiresAt,cookieLines:'.bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\tsynthetic\n'});
function store(){
 const bytes=new Map<string,string>();let pending:(()=>void)|undefined,auto=true;
 const api={getData:({name}:{name:string})=>{if(!bytes.has(name))throw {name:'NotFoundError'};return bytes.get(name);},removeData:({name}:{name:string})=>{bytes.delete(name);},saveData:(name:string,value:string,_password:null,done:()=>void)=>{if(bytes.has(name))throw Error('duplicate forbidden');pending=()=>{bytes.set(name,value);done();};if(auto)pending();}};
 return {bytes,api,value:new ProtectedAccountStore(api,20),hold(){auto=false;},finish(){pending?.();}};
}
test('R06 protected renewal alternates banks without overwriting old bytes and preserves legacy rollback slot',async()=>{
 const f=store(),old=account();await f.value.add(old,signal());const original=f.bytes.get('bilisofa.session.v1.slot0');
 for(let i=1;i<=4;i++){const next={...old,name:'更新'+i,expiresAt:100000+i};await f.value.renew(old.id,next,signal());assert.equal((await new ProtectedAccountStore(f.api).read(old.id))?.name,next.name);}
 assert.equal(f.bytes.get('bilisofa.session.v1.slot0'),original);assert.equal(f.bytes.size,3);assert.equal((await f.value.list()).length,1);
 await f.value.remove(old.id);assert.equal(f.bytes.size,0);
});
test('R06 cancelled protected renewal drains real callback, removes only staging bank, retains last confirmed session',async()=>{
 const f=store(),old=account();await f.value.add(old,signal());await f.value.renew(old.id,{...old,name:'confirmed'},signal());
 f.hold();const controller=new AbortController(),pending=f.value.renew(old.id,{...old,name:'cancelled'},controller.signal);controller.abort();await assert.rejects(pending,{code:'cancelled'});
 await assert.rejects(new ProtectedAccountStore(f.api).read(old.id),{code:'unknown'});f.finish();assert.equal((await f.value.read(old.id))?.name,'confirmed');assert.equal(f.bytes.size,2);
});
test('R06 renewal timeout cannot unlock another store or remove previous bank',async()=>{
 const f=store(),old=account();await f.value.add(old,signal());f.hold();await assert.rejects(f.value.renew(old.id,{...old,name:'unknown'},signal()),{code:'unknown'});
 await assert.rejects(new ProtectedAccountStore(f.api).renew(old.id,old,signal()),{code:'unknown'});f.finish();assert.deepEqual(await f.value.read(old.id),old);
});
test('R06 wrong identity or missing account cannot replace a saved credential',async()=>{
 const f=store();await f.value.add(account(),signal());const before=[...f.bytes];await assert.rejects(f.value.renew('bili_101',account('202'),signal()),{code:'permission'});await assert.rejects(f.value.renew('bili_202',account('202'),signal()),{code:'login'});assert.deepEqual([...f.bytes],before);
});
test('R06 malformed bank or mismatched bank identity never silently falls back to stale credential',async()=>{
 const f=store();await f.value.add(account(),signal());f.bytes.set('bilisofa.session.v2.slot0.bank0',JSON.stringify({version:1,revision:1,account:account('202')}));await assert.rejects(f.value.list(),{code:'invalid'});
});
test('R06 QR renewal writes exactly existing same identity and never uses add/remove',async()=>{
 const f=store();await f.value.add(account(),signal());let imports=0;const repository:AccountRepository={list:()=>f.value.list(),read:id=>f.value.read(id),add:async()=>{imports++;},remove:async()=>{throw Error('forbidden');},renew:(...a)=>f.value.renew(...a)};
 const login=new LoginCoordinator(repository,()=>({login:async()=>({...account(),name:'new'}),close:async()=>({closed:true})}));assert.equal((await login.login(signal(),()=>{},'bili_101')).id,'bili_101');assert.equal(imports,0);assert.equal((await f.value.read('bili_101'))?.name,'new');
 const wrong=new LoginCoordinator(repository,()=>({login:async()=>account('202'),close:async()=>({closed:true})}));await assert.rejects(wrong.login(signal(),()=>{},'bili_101'),{code:'permission'});assert.equal((await f.value.read('bili_101'))?.name,'new');
});
function workspace(options:{close?:boolean;expiresAt?:number}={}){
 let time=1000,drained=0,renders=0,open=0;const value=account('101',options.expiresAt??100000),navigation=new NavigationStack();
 const repository:AccountRepository={list:async()=>[value],read:async()=>value,add:async()=>{},remove:async()=>{throw Error('no delete');}};
 const shell={navigation,recoveryDestination:()=>navigation.current,suspendConfirmed:async()=>{drained++;return {closed:true};},resume:async(check:()=>Promise<void>)=>{try{await check();}catch{/* Real shell blocks on failure. */}renders++;},dispose:async()=>({closed:true})} as unknown as TvShell;
 const access:VodAccess={read:async()=>{throw new DomainError('login');},transport:()=>{throw Error('unused');},close:async()=>{}};
 const w=new AccountWorkspace(shell,repository,()=>({verify:async()=>({uid:'101',name:'verified'}),openVod:async()=>{open++;return access;},close:async()=>({closed:options.close!==false})}),()=>time,50,undefined,true);
 return {w,navigation,value,time:(v:number)=>{time=v;},stats:()=>({drained,renders,open})};
}
test('R06 private read expiry revokes authority, offers QR, restores owning destination with fresh session',async()=>{
 const f=workspace();await f.w.select('bili_101');f.navigation.selectTop({page:'library'},{focusId:'nav-home',scrollTop:0});f.navigation.remember({focusId:'library-tab-history',scrollTop:400});
 await assert.rejects(f.w.read(async()=>{throw new DomainError('login');},String),{code:'login'});assert.deepEqual(f.w.recovery,{id:'bili_101'});assert.equal(f.navigation.current.route.page,'account');
 await f.w.select('bili_101');assert.equal(f.navigation.current.route.page,'library');assert.equal(f.navigation.current.anchor.focusId,'library-tab-history');assert.equal(f.w.recovery,undefined);assert.equal(f.stats().open,0);
});
test('R06 timestamp expiry retains renewal identity rather than silently switching guest',async()=>{
 const f=workspace({expiresAt:2000});await f.w.select('bili_101');f.time(3000);let calls=0;await assert.rejects(f.w.read(async()=>{calls++;return 1;},Number),{code:'login'});assert.equal(calls,0);assert.equal(f.w.recovery?.id,'bili_101');
});
test('R06 returned VOD auth loss notifies independently and cannot deadlock owner close',async()=>{
 const f=workspace();await f.w.select('bili_101');f.navigation.selectTop({page:'search'},{focusId:'nav-home',scrollTop:0});const vod=await f.w.read((r,s,a)=>r.openVod!(s,a),v=>v as VodAccess);
 await assert.rejects(vod.read({bvid:'BV0000000001',part:1},signal()),{code:'login'});await new Promise(r=>setTimeout(r,0));assert.equal(f.navigation.current.route.page,'account');assert.equal(f.w.recovery?.id,'bili_101');await f.w.select('bili_101');await assert.rejects(vod.read({bvid:'BV0000000001',part:1},signal()),{code:'cancelled'});
});
test('R06 guest choice abandons safe return intent and never deletes account/local records',async()=>{
 const f=workspace();await f.w.select('bili_101');await f.w.prepareRenewal();await f.w.select();assert.equal(f.w.state.kind,'guest');assert.equal(f.w.recovery,undefined);assert.equal(f.navigation.current.route.page,'home');assert.equal(f.value.id,'bili_101');
});
test('R06 unconfirmed close blocks renewal and any new runtime',async()=>{
 const f=workspace({close:false});await f.w.select('bili_101');await f.w.prepareRenewal();assert.equal(f.w.state.kind,'blocked');await assert.rejects(f.w.select('bili_101'),{code:'unknown'});
});
test('R06 late capability response cannot surface private data or expire replacement identity',async()=>{
 let current=true,expires=0,finish!:(v:never)=>void;
 const source:VodAccess={read:()=>new Promise(r=>{finish=r;}),transport:()=>{throw Error('unused');},close:async()=>{}};
 const access=accountCapability(source,()=>current,()=>{expires++;});const pending=access.read({bvid:'BV0000000001',part:1},signal());current=false;finish({secret:'stale'} as never);await assert.rejects(pending,{code:'cancelled'});assert.equal(expires,0);
});
test('R06 child interaction and comment capabilities share generation, while close always remains callable',async()=>{
 let current=true,expires=0,closed=0;const fail=async()=>{throw new DomainError('login');};const access=accountCapability({read:fail,transport:()=>{throw Error('unused');},interactions:()=>({read:fail,submit:fail,close:async()=>{closed++;}}),comments:()=>({read:fail,close:async()=>{closed++;}}),close:async()=>{closed++;}},()=>current,()=>{expires++;});
 const lane=(access as VodAccess).interactions!('catalog');await assert.rejects(lane.submit('token',{kind:'like',on:true},true,signal()),{code:'login'});assert.equal(expires,1);current=false;await assert.rejects(lane.read(signal()),{code:'cancelled'});await lane.close();await access.close();assert.equal(closed,2);
});

test('R06 capability deadline revokes before sending another request',async()=>{
 let reads=0,expired=0;const source:VodAccess={read:async()=>{reads++;throw Error('not called');},transport:()=>{throw Error('unused');},close:async()=>{}};const access=accountCapability(source,()=>true,()=>{expired++;},100,()=>101);await assert.rejects(access.read({bvid:'BV0000000001',part:1},signal()),{code:'login'});assert.equal(reads,0);assert.equal(expired,1);
});
