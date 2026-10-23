import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RetainedWrites } from '../../packages/bili-client/src/retained-writes.ts';
import { LocalWriteJournal } from '../../apps/tv/src/platform/write-journal.ts';
import { LocalProfiles } from '../../apps/tv/src/platform/local-profile-store.ts';
import { parseWriteJournal, parseRetainedIntent, type RetainedEntry, type RetainedIntent } from '../../packages/contracts/src/retained-write.ts';
import { AccountWorkspace } from '../../apps/tv/src/app/account-workspace.ts';
import type { TvShell } from '../../apps/tv/src/app/tv-shell.ts';
import type { AccountRepository, PrivateAccount } from '../../packages/contracts/src/private-account.ts';
const key='bilisofa.retained-writes.v1';
const intent:RetainedIntent={accountId:'bili_101',action:'coin',targetId:'BV0000000001'};
function authority(id='bili_101') { const c=new AbortController(); return {scope:{accountId:id,generation:2,mediaSessionId:'none',requestId:'r1'},signal:c.signal,c}; }
function harness(entries:RetainedEntry[]=[]) {
 const values=new Map<string,string>();if(entries.length)values.set(key,JSON.stringify({schema:1,revision:1,entries}));
 let mode='normal',writes=0,hook=()=>{};
 const storage={getItem:(k:string)=>values.get(k)??null,setItem(k:string,v:string){writes++;if(mode==='throw')throw Error('synthetic-private-error');if(mode!=='ignore')values.set(k,v);hook();},removeItem:(k:string)=>{values.delete(k);}};
 const store=new LocalWriteJournal(storage);return {values,store,storage,writes:()=>writes,mode:(m:string)=>{mode=m;},hook:(fn:()=>void)=>{hook=fn;},coordinator:()=>new RetainedWrites(store,30)};
}
test('W02 retained journal admits only bounded retained operations and canonical targets, never comment/danmaku/URL/private fields',()=>{
 for(const value of [{...intent,action:'comment'},{...intent,action:'danmaku'},{...intent,targetId:'https://example.invalid/'},{...intent,accountId:'guest'},{...intent,cookieLines:'private'},{...intent,action:'follow',targetId:'BV0000000001'}]) assert.throws(()=>parseRetainedIntent(value));
 assert.deepEqual(parseRetainedIntent({...intent,action:'follow',targetId:'uid:202'}),{accountId:'bili_101',action:'follow',targetId:'uid:202'});
 for(const raw of [' '.repeat(65537),JSON.stringify({schema:1,revision:1,entries:[{...intent,state:'unknown'},{...intent,state:'unknown'}]}),JSON.stringify({schema:1,revision:0,entries:[],cookie:'private'})])assert.throws(()=>parseWriteJournal(raw));
 assert.throws(()=>parseWriteJournal('{"schema":2}'),{code:'unsupported'});
});
test('W02 durable pending and exact readback precede one send; confirmation and account authority are mandatory',async()=>{
 const h=harness(),w=h.coordinator();let sent=0;
 await assert.rejects(w.submit(intent,authority(),async()=>{sent++;return 'confirmed';},false),{code:'permission'});
 await assert.rejects(w.submit(intent,authority('bili_202'),async()=>{sent++;return 'confirmed';},true),{code:'permission'});
 assert.equal(h.writes(),0);
 assert.equal(await w.submit(intent,authority(),async()=>{sent++;assert.equal(h.store.read().value.entries[0]!.state,'pending');return 'confirmed';},true),'confirmed');
 assert.equal(sent,1);assert.equal(h.store.read().value.entries[0]!.state,'confirmed');
 await assert.rejects(h.coordinator().submit(intent,authority(),async()=>{sent++;return 'confirmed';},true),{code:'unknown'});assert.equal(sent,1);
});
test('W02 quota, silent write loss and unavailable journal block dispatch without rollback or credential fallback',async()=>{
 for(const mode of ['throw','ignore']){const h=harness();h.mode(mode);let sent=0;await assert.rejects(h.coordinator().submit(intent,authority(),async()=>{sent++;return 'confirmed';},true),{code:'unknown'});assert.equal(sent,0);}
 const w=new RetainedWrites(new LocalWriteJournal(undefined));await assert.rejects(w.submit(intent,authority(),async()=>{throw Error('must not send');},true),{code:'unknown'});
});
test('W02 corrupt and future journal bytes stay untouched and cannot become a new empty journal',async()=>{
 for(const raw of ['{bad','{"schema":2,"private":"synthetic"}']){const h=harness();h.values.set(key,raw);const w=h.coordinator();assert.equal(w.summary('bili_101'),undefined);await assert.rejects(w.submit(intent,authority(),async()=>{throw Error('must not send');},true),{code:'unknown'});assert.equal(h.values.get(key),raw);assert.equal(h.writes(),0);}
});
test('W02 outcome-save failure retains pending for reconstruction and never reports confirmed or resends',async()=>{
 const h=harness(),w=h.coordinator();let sent=0;
 assert.equal(await w.submit(intent,authority(),async()=>{sent++;h.mode('throw');return 'confirmed';},true),'unknown');
 assert.equal(h.store.read().value.entries[0]!.state,'pending');h.mode('normal');const reopened=h.coordinator();assert.deepEqual(reopened.summary('bili_101'),{total:1,unknown:1});
 await assert.rejects(reopened.submit(intent,authority(),async()=>{sent++;return 'confirmed';},true),{code:'unknown'});assert.equal(sent,1);
});
test('W02 restored in-flight intent can only query; failed reads never prove absence and not-applied needs new confirmation',async()=>{
 for(const state of ['pending','checking','unknown'] as const){const h=harness([{...intent,state}]),w=h.coordinator();let sends=0;
  assert.equal(await w.reconcile(intent,authority(),async()=>{throw Error('offline-private');}),'unknown');
  await assert.rejects(w.submit(intent,authority(),async()=>{sends++;return 'confirmed';},true),{code:'unknown'});
  assert.equal(await w.reconcile(intent,authority(),async()=>'not-applied'),'not-applied');assert.equal(sends,0);
  await assert.rejects(w.submit(intent,authority(),async()=>{sends++;return 'confirmed';},false),{code:'permission'});
  assert.equal(await w.submit(intent,authority(),async()=>{sends++;return 'confirmed';},true),'confirmed');assert.equal(sends,1);
 }
});
test('W02 synchronous account invalidation during persistence stops dispatch and leaves an unknown marker',async()=>{
 const h=harness(),lease=authority();h.hook(()=>lease.c.abort());let sent=0;
 assert.equal(await h.coordinator().submit(intent,lease,async()=>{sent++;return 'confirmed';},true),'unknown');assert.equal(sent,0);assert.equal(h.store.read().value.entries[0]!.state,'unknown');
});
test('W02 abort and timeout end observation as unknown; late completion cannot unlock or change the journal',async()=>{
 for(const abort of [true,false]){const h=harness(),w=h.coordinator(),lease=authority();let done!:(v:'confirmed')=>void;
  const result=w.submit(intent,lease,()=>new Promise(r=>{done=r;}),true);if(abort)lease.c.abort();assert.equal(await result,'unknown');
  const before=h.values.get(key);done('confirmed');await Promise.resolve();assert.equal(h.values.get(key),before);await assert.rejects(w.submit(intent,authority(),async()=>'confirmed',true),{code:'unknown'});
 }
});
test('W02 synchronous dispatch abort plus exception remains unknown with no unhandled cancellation or second send',async()=>{
 const h=harness(),w=h.coordinator(),lease=authority();let sent=0;
 assert.equal(await w.submit(intent,lease,()=>{sent++;lease.c.abort();throw Error('synthetic-private');},true),'unknown');await new Promise(r=>setTimeout(r,0));assert.equal(sent,1);assert.deepEqual(w.summary('bili_101'),{total:1,unknown:1});
});
test('W02 live write/query locks the same account target across coin/triple; another identity stays separate',async()=>{
 const h=harness(),w=h.coordinator(),lease=authority();let done!:(v:'unknown')=>void;
 const writing=w.submit(intent,lease,()=>new Promise(r=>{done=r;}),true);
 await assert.rejects(w.submit({...intent,action:'triple'},authority(),async()=>'confirmed',true),{code:'unknown'});
 await assert.rejects(w.reconcile(intent,authority(),async()=>'not-applied'),{code:'unknown'});
 assert.equal(await w.submit({...intent,accountId:'bili_202'},authority('bili_202'),async()=>'confirmed',true),'confirmed');done('unknown');assert.equal(await writing,'unknown');
 await assert.rejects(w.submit({...intent,action:'like'},authority(),async()=>'confirmed',true),{code:'unknown'});
 assert.deepEqual(w.summary('bili_202'),{total:1,unknown:0});
});
test('W02 journal capacity never evicts old unknowns; account/preference cleanup cannot delete any journal',async()=>{
 const entries=Array.from({length:256},(_,i)=>({...intent,targetId:'BV'+String(i).padStart(10,'0'),state:'unknown' as const}));const h=harness(entries);let sent=0;
 await assert.rejects(h.coordinator().submit({...intent,targetId:'BV9999999999'},authority(),async()=>{sent++;return 'confirmed';},true),{code:'invalid'});assert.equal(sent,0);assert.equal(h.store.read().value.entries.length,256);
 h.values.set('bilisofa.w01.progress-once.v1','unknown');h.values.set('bilisofa.w01.progress-observation-intent.v1','unknown');const before=h.values.get(key);new LocalProfiles(h.storage).profile('bili_101').clear();assert.equal(h.values.get(key),before);assert.equal(h.values.get('bilisofa.w01.progress-once.v1'),'unknown');assert.equal(h.values.get('bilisofa.w01.progress-observation-intent.v1'),'unknown');
});
test('W02 journal compare-before-write rejects a competing replacement without overwriting it',()=>{
 const h=harness(),a=h.store.read(),b=h.store.read();h.store.replace(a.raw,{schema:1,revision:1,entries:[{...intent,state:'unknown'}]});const before=h.values.get(key);
 assert.throws(()=>h.store.replace(b.raw,{schema:1,revision:1,entries:[]}),{code:'unknown'});assert.equal(h.values.get(key),before);
});
test('F17 exact follow-state reads reconcile both directions and permit add/del/add only with a new confirmation',async()=>{
 const h=harness(),w=h.coordinator(),follow:RetainedIntent={accountId:'bili_101',action:'bangumi-follow',targetId:'ss:123'},unfollow:RetainedIntent={...follow,action:'bangumi-unfollow'};let sent=0;
 assert.equal(await w.reconcileBangumi(follow,authority(),async()=>'no'),'no');
 for(const [value,after] of [[follow,'yes'],[unfollow,'no'],[follow,'yes']] as const){
  await assert.rejects(w.submit(value,authority(),async()=>{sent++;return 'unknown';},false),{code:'permission'});
  assert.equal(await w.submit(value,authority(),async()=>{sent++;return 'unknown';},true),'unknown');
  await assert.rejects(w.submit(value===follow?unfollow:follow,authority(),async()=>{sent++;return 'confirmed';},true),{code:'unknown'});
  assert.equal(await w.reconcileBangumi(follow,authority(),async()=>after),after);
 }
 assert.equal(sent,3);assert.equal(h.store.read().value.entries.length,2);
 assert.equal(h.store.read().value.entries.find(e=>e.action==='bangumi-follow')!.state,'confirmed');
 assert.equal(h.store.read().value.entries.find(e=>e.action==='bangumi-unfollow')!.state,'not-applied');
});
test('F17 failed state reads preserve both-direction uncertainty and do not unlock coin/progress grants',async()=>{
 const f:RetainedIntent={accountId:'bili_101',action:'bangumi-follow',targetId:'ss:123'},h=harness([{...f,state:'confirmed'},{...f,action:'bangumi-unfollow',state:'unknown'},{...intent,state:'confirmed'},{...intent,action:'progress',state:'unknown'}]),w=h.coordinator();
 assert.equal(await w.reconcileBangumi(f,authority(),async()=>{throw Error('offline');}),'unknown');
 await assert.rejects(w.submit(f,authority(),async()=>'confirmed',true),{code:'unknown'});
 await assert.rejects(w.reconcileBangumi(intent,authority(),async()=>'no'),{code:'invalid'});
 assert.equal(await w.reconcileBangumi(f,authority(),async()=>'no'),'no');
 const entries=h.store.read().value.entries;assert.equal(entries.find(e=>e.action==='coin')!.state,'confirmed');assert.equal(entries.find(e=>e.action==='progress')!.state,'unknown');
 await assert.rejects(w.submit(intent,authority(),async()=>'confirmed',true),{code:'unknown'});
});
test('F17 state query is target-locked, account scoped, abort-safe and readback-persistence failure stays unknown',async()=>{
 const f:RetainedIntent={accountId:'bili_101',action:'bangumi-follow',targetId:'ss:123'},h=harness([{...f,state:'unknown'}]),w=h.coordinator(),lease=authority();let done!:(value:'no')=>void;
 const read=w.reconcileBangumi(f,lease,()=>new Promise(resolve=>{done=resolve;}));
 await assert.rejects(w.submit({...f,action:'bangumi-unfollow'},authority(),async()=>'confirmed',true),{code:'unknown'});lease.c.abort();assert.equal(await read,'unknown');const before=h.values.get(key);done('no');await Promise.resolve();assert.equal(h.values.get(key),before);
 await assert.rejects(w.reconcileBangumi(f,authority('bili_202'),async()=>'no'),{code:'permission'});
 assert.equal(await w.reconcileBangumi(f,authority(),async()=>{h.mode('throw');return 'no';}),'unknown');
 h.mode('normal');assert.equal(h.store.read().value.entries[0]!.state,'checking');
});
test('W02 composed account gateway requires verified identity, invalidates writes on Home and retains uncertainty through removal/relogin',async()=>{
 const h=harness(),writes=h.coordinator(),events:string[]=[],accounts=new Map<string,PrivateAccount>();
 for(const uid of ['101','202'])accounts.set('bili_'+uid,{schema:1,id:'bili_'+uid,uid,name:'synthetic',expiresAt:100000,cookieLines:'.bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic-only\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\tsynthetic-only\n'});
 const repository:AccountRepository={list:async()=>[...accounts.values()],read:async id=>accounts.get(id),add:async()=>{},remove:async id=>{accounts.delete(id);}};
 const shell={navigation:{resetForAccountChange(){}},suspendConfirmed:async()=>({closed:true}),resume:async(check:()=>Promise<void>)=>{await check();},dispose:async()=>({closed:true})} as unknown as TvShell;
 const workspace=new AccountWorkspace(shell,repository,account=>({verify:async()=>({uid:account.uid,name:'verified'}),close:async()=>{events.push('closed');return {closed:true};}}),()=>1000,30,writes);
 await assert.rejects(workspace.submit('coin',intent.targetId,async()=>'confirmed',true),{code:'login'});await workspace.select('bili_101');
 let signal!:AbortSignal,done!:(v:'confirmed')=>void;
 const old=workspace.submit('coin',intent.targetId,async(_runtime,scope,s)=>{assert.equal(scope.accountId,'bili_101');signal=s;return new Promise(r=>{done=r;});},true);
 const rejected=assert.rejects(old,{code:'cancelled'});await workspace.setHidden(true);assert.equal(signal.aborted,true);await rejected;assert.ok(events.includes('closed'));assert.deepEqual(writes.summary('bili_101'),{total:1,unknown:1});
 const before=h.values.get(key);done('confirmed');await Promise.resolve();assert.equal(h.values.get(key),before);await workspace.setHidden(false);
 await assert.rejects(workspace.submit('coin',intent.targetId,async()=>'confirmed',true),{code:'unknown'});await workspace.select('bili_202');assert.equal(await workspace.submit('coin',intent.targetId,async()=>'confirmed',true),'confirmed');await workspace.remove('bili_101');assert.deepEqual(writes.summary('bili_101'),{total:1,unknown:1});await workspace.dispose();
});
