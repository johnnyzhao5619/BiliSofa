import {test} from 'node:test';import assert from 'node:assert/strict';
import {LocalProfiles} from '../../apps/tv/src/platform/local-profile-store.ts';
import {accountRuntime} from '../../apps/tv/src/platform/account-runtime.ts';
import {parseReadCacheClear} from '../../packages/contracts/src/private-account.ts';
import {parseRecommendationBody} from '../../packages/bili-client/src/recommendations.ts';
import type {RecommendationRequest} from '../../packages/contracts/src/recommendations.ts';
import {accountKernel} from './fake-public-kernel.ts';
const bv='BV0000000001',point={bvid:bv,part:1 as const,timeMs:12000,durationMs:80000,updatedAt:10000};
function store(){const values=new Map<string,string>();let block='';const profiles=new LocalProfiles({getItem:k=>values.get(k)??null,setItem(k,v){if(k!==block)values.set(k,v);},removeItem:k=>{values.delete(k);}});return {values,profiles,block:(key:string)=>{block=key;}};}
test('F12 bookmark inventory merges sorted P1/P2 snapshots with stable copies and fixed identity, without a storage write',()=>{
 const h=store(),a=h.profiles.profile('bili_101'),b=h.profiles.profile('bili_202');a.progress(point);a.progressPart({...point,part:2,updatedAt:20000});b.progressPart({...point,part:2,timeMs:22000});const before=[...h.values];
 const r=a.bookmarks!();assert.equal(r.kind,'ok');if(r.kind==='ok'){assert.deepEqual(r.items.map(p=>p.part),[2,1]);r.items[0]!.timeMs=1;}const actual=a.bookmarks!();if(actual.kind==='ok')assert.equal(actual.items[0]!.timeMs,12000);assert.deepEqual([...h.values],before);assert.deepEqual(h.profiles.profile('guest').bookmarks!(),{kind:'ok',items:[]});
});
test('F12 record-only clear preserves preferences, other identities, queues, search, protected-store names and unknown journals',()=>{
 const h=store(),a=h.profiles.profile('bili_101'),b=h.profiles.profile('bili_202');a.preferences({resumePrompt:false,jumpSeconds:30});a.progress(point);a.progressPart({...point,part:2});b.progress(point);
 for(const key of ['bilisofa.queue.v2.bili_101','bilisofa.search.v1.bili_101','bilisofa.retained-writes.v1','bilisofa.w01.progress-once.v1','bilisofa.session.v1.slot0'])h.values.set(key,'preserve-synthetic');
 assert.equal(a.clearBookmarks!(),'deleted');assert.deepEqual(a.bookmarks!(),{kind:'ok',items:[]});const r=a.read();if(r.kind==='ok')assert.deepEqual(r.value.preferences,{resumePrompt:false,jumpSeconds:30});assert.equal(b.readPart(bv,1).kind,'ok');assert.equal([...h.values.values()].filter(v=>v==='preserve-synthetic').length,5);
});
test('F12 corrupt/future record partition is never overwritten or mistaken for an empty complete inventory',()=>{
 const h=store(),a=h.profiles.profile('guest');a.progress(point);for(const raw of ['bad','{"schema":2}']){h.values.set('bilisofa.parts.v1.guest',raw);const before=[...h.values];assert.notEqual(a.bookmarks!().kind,'ok');assert.notEqual(a.clearBookmarks!(),'deleted');assert.deepEqual([...h.values],before);}assert.equal(new LocalProfiles(undefined).profile('guest').bookmarks!().kind,'unavailable');
});
test('F12 partially confirmed record deletion stays unconfirmed and can be inspected without rewriting or changing preferences',()=>{
 const h=store(),a=h.profiles.profile('guest');a.preferences({resumePrompt:true,jumpSeconds:10});a.progress(point);a.progressPart({...point,part:2});h.block('bilisofa.parts.v1.guest');assert.equal(a.clearBookmarks!(),'unconfirmed');const r=a.bookmarks!();if(r.kind==='ok')assert.deepEqual(r.items.map(p=>p.part),[2]);const p=a.read();if(p.kind==='ok')assert.equal(p.value.preferences.jumpSeconds,10);
});
test('F12 deleting one part retains the same BV other P and cache-clear DTO admits no private or arbitrary fields',()=>{
 const h=store(),a=h.profiles.profile('guest');a.progress(point);a.progressPart({...point,part:2});assert.equal(a.forgetPart(bv,2),'saved');const r=a.bookmarks!();if(r.kind==='ok')assert.deepEqual(r.items.map(p=>p.part),[1]);assert.deepEqual(parseReadCacheClear({cleared:true}),{cleared:true});for(const v of [{cleared:false},{cleared:true,account:'private'},null])assert.throws(()=>parseReadCacheClear(v));
});
const account={schema:1 as const,id:'bili_123',uid:'123',name:'合成',expiresAt:Date.now()+600000,cookieLines:'.bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\tsynthetic\n'},scope={accountId:account.id,generation:1,mediaSessionId:'cache',requestId:'r1'};
const batch=()=>parseRecommendationBody(JSON.stringify({code:0,data:{mid:123,item:[{goto:'av',id:1,bvid:bv,title:'合成',owner:{name:'合成'},duration:80}]}}),'123');
test('F12 clearing private cache makes no network operation and resets the next recommendation read to a fresh first source without losing the account',async()=>{
 const {kernel,requests}=accountKernel(r=>{const q=r as RecommendationRequest;return {version:1,operation:q.operation,scope:q.scope,closed:true,kind:'ok',batch:batch()};});const sent=()=>requests() as RecommendationRequest[];
 const r=accountRuntime(account,kernel),signal=new AbortController().signal;await r.readRecommendations!({page:1},scope,signal);await r.readRecommendations!({page:1},scope,signal);assert.equal(sent().length,1);assert.deepEqual(await r.clearReadCaches!(scope,signal),{cleared:true});assert.equal(sent().length,1);await r.readRecommendations!({page:1},scope,signal);assert.equal(sent().length,2);assert.equal(sent()[1]!.index,0);assert.equal(sent()[1]!.freshType,0);assert.equal(sent()[1]!.shown,'');await r.close();
});
test('F12 pending read is stopped before cache clear; a late answer cannot restore the old snapshot',async()=>{
 let held=true;const {kernel,workers,requests}=accountKernel(r=>{const q=r as RecommendationRequest;return held?undefined:{version:1,operation:q.operation,scope:q.scope,closed:true,kind:'ok',batch:batch()};});
 const r=accountRuntime(account,kernel),signal=new AbortController().signal,reading=r.readRecommendations!({page:1},scope,signal),rejected=assert.rejects(reading,{code:'cancelled'});await new Promise<void>(yes=>setImmediate(yes));
 const old=workers[0]!.requests[0]!;await r.clearReadCaches!(scope,signal);await rejected;assert.equal(workers[0]!.stops,1);
 workers[0]!.emit({version:1,type:'result',requestId:old.requestId,result:{version:1,operation:'recommendations-read',scope:old.request.scope,closed:true,kind:'ok',batch:batch()}});
 held=false;await r.readRecommendations!({page:1},scope,signal);assert.equal((requests()[1] as RecommendationRequest).index,0);await r.close();
});
test('F12 a crashed read-only account kernel fails that read and is replaced; cache clear still succeeds (ADR-108)',async()=>{
 let count=0;const {ResidentKernel}=await import('../../apps/tv/src/platform/public-kernel.ts');
 const kernel=new ResidentKernel<never>({signing:false,create:()=>{count++;const w={onmessage:null as ((e:{data:unknown})=>void)|null,onerror:null as ((e:unknown)=>void)|null,postMessage(){queueMicrotask(()=>w.onerror?.(new Error('crash')));},terminate(){}};return w;}});
 const r=accountRuntime(account,kernel as never),signal=new AbortController().signal;await assert.rejects(r.readRecommendations!({page:1},scope,signal),{code:'network'});
 assert.deepEqual(await r.clearReadCaches!(scope,signal),{cleared:true});await assert.rejects(r.readRecommendations!({page:1},scope,signal),{code:'network'});assert.equal(count,2,'the next read starts a fresh kernel');assert.equal((await r.close()).closed,true);
});
