import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LocalProfiles } from '../../apps/tv/src/platform/local-profile-store.ts';
import { AppDiagnostics } from '../../apps/tv/src/app/app-diagnostics.ts';
import { LocalPlayback } from '../../apps/tv/src/app/local-playback.ts';
import { defaults, parseLocalProfile } from '../../packages/contracts/src/local-profile.ts';
const bvid='BV0000000001', other='BV0000000002';
const point={bvid,part:1 as const,timeMs:12000,durationMs:80000,updatedAt:10000};
function harness(){const values=new Map<string,string>();const writes:string[]=[];let mode='normal';const storage={getItem:(k:string)=>values.get(k)??null,setItem(k:string,v:string){writes.push(k);if(mode==='throw')throw Error('synthetic-private-path');if(mode!=='ignore')values.set(k,v);},removeItem(k:string){if(mode!=='ignore')values.delete(k);}};return{values,writes,profiles:new LocalProfiles(storage),mode:(v:string)=>{mode=v;}};}
test('W02 preferences and resumes bind to fixed guest/A/B partitions without inheriting one another',()=>{
 const h=harness(),a=h.profiles.profile('bili_101'),b=h.profiles.profile('bili_202'),guest=h.profiles.profile('guest');
 assert.equal(a.preferences({resumePrompt:false,jumpSeconds:30}),'saved');assert.equal(a.progress(point),'saved');
 assert.deepEqual(b.read(),{kind:'ok',value:defaults()});assert.deepEqual(guest.read(),{kind:'ok',value:defaults()});assert.equal(a.read().kind,'ok');assert.throws(()=>h.profiles.profile('../private'));
 const reopened=new LocalProfiles({getItem:k=>h.values.get(k)??null,setItem(){},removeItem(){}});const read=reopened.profile('bili_101').read();assert.equal(read.kind,'ok');if(read.kind==='ok'){assert.equal(read.value.preferences.jumpSeconds,30);assert.equal(read.value.resume[0]!.timeMs,12000);}
});
test('W02 storage bounds records and replaces a single video while retaining distinct parts only when actually supported',()=>{
 const h=harness(),a=h.profiles.profile('guest');for(let i=0;i<70;i++)a.progress({...point,bvid:'BV'+String(i).padStart(10,'0')});const result=a.read();assert.equal(result.kind,'ok');if(result.kind==='ok')assert.equal(result.value.resume.length,64);
 a.progress({...point,timeMs:15000});const updated=a.read();if(updated.kind==='ok'){assert.equal(updated.value.resume.filter(v=>v.bvid===bvid).length,1);assert.equal(updated.value.resume[0]!.timeMs,15000);}
});
test('W02 bounded local schema rejects credentials, signed URLs, unknown fields, invalid times and unsupported parts',()=>{
 for(const value of [{...defaults(),cookieLines:'private'}, {...defaults(),resume:[{...point,url:'https://private.invalid'}]}, {...defaults(),resume:[{...point,part:2}]}, {...defaults(),resume:[{...point,timeMs:80000}]}, {...defaults(),preferences:{resumePrompt:'true',jumpSeconds:5}}, {...defaults(),resume:[point,point]}])assert.throws(()=>parseLocalProfile(JSON.stringify(value)));
 assert.throws(()=>parseLocalProfile(' '.repeat(16385)));assert.throws(()=>parseLocalProfile(JSON.stringify({...defaults(),schema:2})),{code:'unsupported'});
});
test('W02 corrupt/future data is not silently overwritten; scoped reset leaves other accounts and W01 intent journals intact',()=>{
 const h=harness(),key='bilisofa.local.v1.bili_101';h.values.set('bilisofa.w01.progress-once.v1','unknown');h.profiles.profile('bili_202').progress(point);
 for(const raw of ['{bad',JSON.stringify({...defaults(),schema:2})]){h.values.set(key,raw);const a=h.profiles.profile('bili_101');assert.notEqual(a.read().kind,'ok');assert.notEqual(a.preferences({resumePrompt:true,jumpSeconds:10}),'saved');assert.equal(h.values.get(key),raw);assert.equal(a.clear(),'deleted');}
 assert.equal(h.profiles.profile('bili_202').read().kind,'ok');assert.equal(h.values.get('bilisofa.w01.progress-once.v1'),'unknown');
});
test('W02 ignored or throwing storage writes/deletes remain unconfirmed with no arbitrary error exposure',()=>{
 const h=harness(),a=h.profiles.profile('guest');h.mode('ignore');assert.equal(a.progress(point),'unconfirmed');h.mode('normal');a.progress(point);h.mode('ignore');assert.equal(a.clear(),'unconfirmed');h.mode('throw');assert.equal(a.progress(point),'unconfirmed');assert.deepEqual(new LocalProfiles(undefined).profile('guest').read(),{kind:'unavailable'});
});
test('W02 recorder throttles actual progress, flushes before close, stays in the original partition and rejects late observations',()=>{
 const h=harness(),diagnostics=new AppDiagnostics();let now=10000,issues=0;const rec=new LocalPlayback(h.profiles.profile('bili_101'),bvid,diagnostics,()=>issues++,()=>now);
 rec.observe({reason:'tick',timeMs:12000,durationMs:80000});now+=1000;rec.observe({reason:'tick',timeMs:13000,durationMs:80000});assert.equal(h.writes.length,1);
 rec.observe({reason:'close',timeMs:13500,durationMs:80000});assert.equal(h.writes.length,2);rec.observe({reason:'tick',timeMs:30000,durationMs:80000});assert.equal(h.writes.length,2);assert.equal(issues,0);
 assert.deepEqual(h.profiles.profile('bili_202').read(),{kind:'ok',value:defaults()});const read=h.profiles.profile('bili_101').read();if(read.kind==='ok')assert.equal(read.value.resume[0]!.timeMs,13500);
});
test('W02 real completion removes only the current local bookmark and cannot be followed by a late re-save',()=>{
 const h=harness(),a=h.profiles.profile('guest');a.progress(point);a.progress({...point,bvid:other});const rec=new LocalPlayback(a,bvid,new AppDiagnostics(),()=>{},()=>10000);
 rec.observe({reason:'ended',timeMs:79000,durationMs:80000});rec.observe({reason:'close',timeMs:79000,durationMs:80000});const read=a.read();if(read.kind==='ok')assert.deepEqual(read.value.resume.map(r=>r.bvid),[other]);
});
test('W02 local failure cannot write or retry an unknown cloud journal and recorder reports a fixed issue',()=>{
 const h=harness();h.values.set('bilisofa.w01.progress-observation-intent.v1','unknown');h.mode('throw');const diagnostics=new AppDiagnostics();let issues=0;
 const rec=new LocalPlayback(h.profiles.profile('guest'),bvid,diagnostics,()=>issues++,()=>10000);rec.observe({reason:'close',timeMs:12000,durationMs:80000});assert.equal(issues,1);assert.equal(h.values.get('bilisofa.w01.progress-observation-intent.v1'),'unknown');assert.ok(!diagnostics.snapshot().includes('private-path'));
});
test('W02 diagnostics admits only whitelisted facts, caps memory and excludes account/content/session details',()=>{
 const d=new AppDiagnostics();for(let i=0;i<100;i++)d.add('local',i%2?'save_unconfirmed':'save_confirmed');const raw=d.snapshot();assert.equal(JSON.parse(raw).entries.length,32);d.add('account','bili_101 private-cookie' as never);d.add('https://private.invalid' as never,'failed');assert.equal(d.snapshot(),raw);d.clear();assert.equal(JSON.parse(d.snapshot()).entries.length,0);
});
test('F06 separate P bookmarks preserve existing first-P data and other identities through completion and scoped deletion', () => {
 const h = harness(), a = h.profiles.profile('bili_101'), b = h.profiles.profile('bili_202');
 a.progress(point); const legacy = h.values.get('bilisofa.local.v1.bili_101');
 a.progressPart({ ...point, part: 2, timeMs: 21000 }); a.progressPart({ ...point, part: 3, timeMs: 31000 }); b.progressPart({ ...point, part: 2, timeMs: 41000 });
 assert.equal(h.values.get('bilisofa.local.v1.bili_101'), legacy);
 assert.deepEqual(a.readPart(bvid, 1), { kind: 'ok', value: point });
 const p2 = a.readPart(bvid, 2); assert.equal(p2.kind, 'ok'); if (p2.kind === 'ok') assert.equal(p2.value?.timeMs, 21000);
 const recorder = new LocalPlayback(a, bvid, new AppDiagnostics(), () => {}, () => 10000, 2);
 recorder.observe({ reason: 'ended', timeMs: 79000, durationMs: 80000 });
 assert.deepEqual(a.readPart(bvid, 2), { kind: 'ok' }); assert.deepEqual(a.readPart(bvid, 1), { kind: 'ok', value: point });
 assert.equal(h.values.get('bilisofa.local.v1.bili_101'), legacy);
 h.values.set('bilisofa.w01.progress-once.v1', 'unknown'); assert.equal(a.clear(), 'deleted');
 assert.equal(h.values.has('bilisofa.parts.v1.bili_101'), false); assert.equal(h.values.has('bilisofa.local.v1.bili_101'), false);
 assert.equal(b.readPart(bvid, 2).kind, 'ok'); assert.equal(h.values.get('bilisofa.w01.progress-once.v1'), 'unknown');
});
test('F06 part storage refuses corrupt/future data, invalid identities and partial delete acknowledgement', () => {
 const h = harness(), a = h.profiles.profile('guest'), key = 'bilisofa.parts.v1.guest';
 h.values.set(key, '{bad'); assert.deepEqual(a.readPart(bvid, 2), { kind: 'corrupt' }); assert.equal(a.progressPart({ ...point, part: 2 }), 'corrupt'); assert.equal(h.values.get(key), '{bad');
 h.values.set(key, '{"schema":2}'); assert.deepEqual(a.readPart(bvid, 2), { kind: 'future' });
 assert.throws(() => a.progressPart({ ...point, part: 0 })); assert.throws(() => a.forgetPart('outside', 2));
 h.mode('ignore'); assert.equal(a.clear(), 'unconfirmed');
 assert.equal(new LocalProfiles(undefined).profile('guest').readPart(bvid, 2).kind, 'unavailable');
});
