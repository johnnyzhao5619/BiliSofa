import {test} from 'node:test';import assert from 'node:assert/strict';
import {beginResume,rememberResume,forgetResume,takeResume} from '../../apps/tv/src/app/resume-memory.ts';
import {LocalProfiles} from '../../apps/tv/src/platform/local-profile-store.ts';
const item={bvid:'BV0000000001',part:2,title:'合成 · P2',timeMs:65000,durationMs:600000};
test('ADR-093 resume memory is identity-bound, consumed once, and forgotten after a normal exit',()=>{
 beginResume('bili_101');rememberResume(item);assert.equal(takeResume('bili_202'),undefined);assert.equal(takeResume('bili_101'),undefined);
 beginResume('bili_101');rememberResume(item);assert.deepEqual(takeResume('bili_101'),item);assert.equal(takeResume('bili_101'),undefined);
 beginResume('guest');rememberResume(item);forgetResume();assert.equal(takeResume('guest'),undefined);
});
test('ADR-093 continuous play lives in its own key: default unknown, explicit choices kept, clear removes it, foreign values ignored',()=>{
 const values=new Map<string,string>();const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);},removeItem:(k:string)=>{values.delete(k);}};
 const profile=new LocalProfiles(storage).profile('bili_101');assert.equal(profile.readContinuous?.(),undefined);
 assert.equal(profile.rememberContinuous?.(false),'saved');assert.equal(profile.readContinuous?.(),false);assert.equal(profile.rememberContinuous?.(true),'saved');assert.equal(profile.readContinuous?.(),true);
 assert.deepEqual([...values.keys()].filter(k=>k.startsWith('bilisofa.local.v1.')),[]);
 const key=[...values.keys()].find(k=>k.startsWith('bilisofa.playback-continuous.v1.'))!;values.set(key,'yes');assert.equal(profile.readContinuous?.(),undefined);
 profile.clear();assert.equal(values.has(key),false);assert.equal(new LocalProfiles(undefined).profile('guest').readContinuous?.(),undefined);
});
