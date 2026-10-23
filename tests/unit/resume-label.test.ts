import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LocalProfiles} from '../../apps/tv/src/platform/local-profile-store.ts';
import {LocalPlayback} from '../../apps/tv/src/app/local-playback.ts';
import {AppDiagnostics} from '../../apps/tv/src/app/app-diagnostics.ts';
import {parseResumeLabels} from '../../packages/contracts/src/resume-label.ts';
import {parseCoverReference,parseVideoPresentation} from '../../packages/contracts/src/content-presentation.ts';
const bv='BV0000000001',point={bvid:bv,part:1 as const,timeMs:12000,durationMs:80000,updatedAt:10000};
const label={bvid:bv,part:1,title:'完整视频名称',updatedAt:10000};
function harness(){
 const data=new Map<string,string>();let blocked='';const writes:string[]=[];
 const storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{writes.push(k);if(k!==blocked)data.set(k,v);},removeItem:(k:string)=>{if(k!==blocked)data.delete(k);}};
 return {data,writes,storage,profiles:new LocalProfiles(storage),block:(key:string)=>{blocked=key;}};
}
test('R01 labels survive recreation in a fixed identity without changing either legacy position schema or journals',()=>{
 const h=harness(),a=h.profiles.profile('bili_101');a.progress(point);a.progressPart({...point,part:2});
 const old=h.data.get('bilisofa.local.v1.bili_101'),parts=h.data.get('bilisofa.parts.v1.bili_101');h.data.set('bilisofa.retained-writes.v1','unknown');
 assert.equal(a.rememberLabel!(label),'saved');assert.equal(a.rememberLabel!({...label,part:2,partTitle:'第二部分'}),'saved');
 const reopened=new LocalProfiles(h.storage);assert.equal(reopened.profile('bili_101').readLabel!(bv,2).kind,'ok');
 assert.deepEqual(reopened.profile('guest').readLabel!(bv,1),{kind:'ok'});assert.deepEqual(reopened.profile('bili_202').readLabel!(bv,2),{kind:'ok'});
 assert.equal(h.data.get('bilisofa.local.v1.bili_101'),old);assert.equal(h.data.get('bilisofa.parts.v1.bili_101'),parts);assert.equal(h.data.get('bilisofa.retained-writes.v1'),'unknown');
 const r=reopened.profile('bili_101').readLabel!(bv,2);if(r.kind==='ok'&&r.value)r.value.title='mutated';assert.equal(a.readLabel!(bv,2).kind,'ok');assert.equal(h.data.get('bilisofa.resume-labels.v1.bili_101')!.includes('mutated'),false);
});
test('R01 label writes require a confirmed matching bookmark, deduplicate unchanged text and prune evicted positions',()=>{
 const h=harness(),p=h.profiles.profile('guest');assert.equal(p.rememberLabel!(label),'unconfirmed');assert.equal(h.writes.length,0);
 p.progress(point);p.rememberLabel!(label);const count=h.writes.length;p.rememberLabel!({...label,updatedAt:99999});assert.equal(h.writes.length,count);
 for(let i=2;i<=65;i++)p.progress({...point,bvid:'BV'+String(i).padStart(10,'0')});
 p.rememberLabel!({...label,bvid:'BV0000000065'});assert.equal(h.data.get('bilisofa.resume-labels.v1.guest')!.includes(bv),false);assert.deepEqual(p.readLabel!(bv,1),{kind:'ok'});
});
test('R01 corrupt/future labels do not overwrite bytes or block position reads and updates',()=>{
 const h=harness(),p=h.profiles.profile('guest');p.progress(point);
 for(const raw of ['broken','{"schema":2}']){h.data.set('bilisofa.resume-labels.v1.guest',raw);assert.notEqual(p.rememberLabel!(label),'saved');assert.notEqual(p.readLabel!(bv,1).kind,'ok');assert.equal(p.progress({...point,timeMs:18000}),'saved');assert.equal(p.bookmarks!().kind,'ok');assert.equal(h.data.get('bilisofa.resume-labels.v1.guest'),raw);}
});
test('R01 exact-part deletion, record clear and account-local clear cover labels without clearing queue/preferences/unknown writes',()=>{
 const h=harness(),p=h.profiles.profile('guest');p.preferences({resumePrompt:true,jumpSeconds:30});p.progress(point);p.progressPart({...point,part:2});p.rememberLabel!(label);p.rememberLabel!({...label,part:2});
 h.data.set('bilisofa.queue.v2.guest','preserve');h.data.set('bilisofa.w01.progress-once.v1','unknown');
 assert.equal(p.forgetPart(bv,2),'saved');assert.deepEqual(p.readLabel!(bv,2),{kind:'ok'});const first=p.readLabel!(bv,1);assert.ok(first.kind==='ok'&&first.value);
 assert.equal(p.clearBookmarks!(),'deleted');assert.equal(h.data.has('bilisofa.resume-labels.v1.guest'),false);const r=p.read();assert.ok(r.kind==='ok'&&r.value.preferences.jumpSeconds===30);
 p.progress(point);p.rememberLabel!(label);assert.equal(p.clear(),'deleted');assert.equal(h.data.has('bilisofa.resume-labels.v1.guest'),false);assert.equal(h.data.get('bilisofa.queue.v2.guest'),'preserve');assert.equal(h.data.get('bilisofa.w01.progress-once.v1'),'unknown');
});
test('R01 partial metadata deletion remains unconfirmed; rollback-deleted positions cannot expose stale titles',()=>{
 const h=harness(),p=h.profiles.profile('guest');p.progress(point);p.rememberLabel!(label);h.block('bilisofa.resume-labels.v1.guest');
 assert.equal(p.clearBookmarks!(),'unconfirmed');assert.deepEqual(p.readLabel!(bv,1),{kind:'ok'});assert.equal(p.bookmarks!().kind,'ok');
 p.progress(point);assert.equal(p.forgetPart(bv,1),'unconfirmed');assert.deepEqual(p.readLabel!(bv,1),{kind:'ok'});
});
test('R01 actual playback records latest catalog/P titles, does not write on label callbacks alone, and ignores late callbacks',()=>{
 const h=harness(),p=h.profiles.profile('guest'),diagnostics=new AppDiagnostics();let failures=0;
 const recorder=new LocalPlayback(p,bv,diagnostics,()=>failures++,()=>10000,2);recorder.label({title:'真实详情标题',partTitle:'第二部分'});assert.equal(h.writes.length,0);
 recorder.observe({reason:'close',timeMs:15000,durationMs:80000});const r=p.readLabel!(bv,2);assert.ok(r.kind==='ok'&&r.value?.title==='真实详情标题'&&r.value.partTitle==='第二部分');
 const count=h.writes.length;recorder.label({title:'late'});recorder.observe({reason:'tick',timeMs:20000,durationMs:80000});assert.equal(h.writes.length,count);assert.equal(failures,0);assert.equal(diagnostics.snapshot().includes('真实详情'),false);
});
test('R01 metadata failure keeps actual progress and reports fixed failure without exposing storage details',()=>{
 const h=harness(),p=h.profiles.profile('guest'),diagnostics=new AppDiagnostics();let failures=0;h.block('bilisofa.resume-labels.v1.guest');
 const recorder=new LocalPlayback(p,bv,diagnostics,()=>failures++,()=>10000,1,{title:'名称'});recorder.observe({reason:'close',timeMs:15000,durationMs:80000});assert.equal(failures,1);
 const r=p.readPart(bv,1);assert.ok(r.kind==='ok'&&r.value?.timeMs===15000);assert.equal(diagnostics.snapshot().includes(bv),false);
});
test('R01 metadata is bounded, rejects duplicate parts/private fields and validates before storage access',()=>{
 for(const doc of [{schema:1,items:[label,label]},{schema:1,items:[{...label,cookie:'private'}]},{schema:1,items:[{...label,title:'a'.repeat(121)}]},{schema:1,items:[{...label,part:0}]},{schema:1,items:Array(193).fill(label)}])assert.throws(()=>parseResumeLabels(JSON.stringify(doc)));
 assert.throws(()=>parseResumeLabels(' '.repeat(196609)));assert.throws(()=>parseResumeLabels('{"schema":2}'),{code:'unsupported'});
 const h=harness();assert.throws(()=>h.profiles.profile('../account'));assert.throws(()=>h.profiles.profile('guest').rememberLabel!({...label,part:0}));assert.equal(h.writes.length,0);
});
test('U1 artwork contract admits bounded public raster references and rejects remote code, redirects, signed sources and SSRF addresses',()=>{
 assert.deepEqual(parseCoverReference({host:'i0.hdslb.com',path:'/bfs/archive/abc123.jpg'}),{host:'i0.hdslb.com',path:'/bfs/archive/abc123.jpg'});
 for(const cover of [{host:'127.0.0.1',path:'/bfs/a.jpg'},{host:'i0.hdslb.com.evil.invalid',path:'/bfs/a.jpg'},{host:'i0.hdslb.com',path:'/bfs/a.svg'},{host:'i0.hdslb.com',path:'/bfs/a.jpg?token=private'},{host:'i0.hdslb.com',path:'/bfs/../a.jpg'},{host:'i0.hdslb.com',path:'/bfs/%2e%2e/a.jpg'},{host:'i0.hdslb.com',path:'/bfs/a.jpg',cookie:'private'}])assert.throws(()=>parseCoverReference(cover));
 const card={kind:'video',bvid:bv,title:'视频名称',author:'UP',durationMs:80000,cover:{host:'i1.hdslb.com',path:'/bfs/archive/abc.webp'}};assert.equal(parseVideoPresentation(card).title,'视频名称');assert.throws(()=>parseVideoPresentation({...card,url:'https://signed.invalid/'}));assert.throws(()=>parseVideoPresentation({...card,durationMs:Infinity}));
});
