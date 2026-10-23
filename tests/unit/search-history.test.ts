import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SearchHistories} from '../../apps/tv/src/platform/search-history-store.ts';
import {parseSearchHistory,searchHistoryDefaults} from '../../packages/contracts/src/search-history.ts';
function setup(){const values=new Map<string,string>();let mode='ok';const storage={getItem:(k:string)=>values.get(k)??null,setItem(k:string,v:string){if(mode==='throw')throw Error('private');if(mode!=='ignore')values.set(k,v);},removeItem(k:string){if(mode!=='ignore')values.delete(k);}};return {values,storage,profiles:new SearchHistories(storage),mode:(v:string)=>{mode=v;}};}
test('W03 durable search history binds guest/A/B, deduplicates newest first and caps twelve keywords',()=>{
 const h=setup(),a=h.profiles.profile('bili_101');for(let i=0;i<20;i++)assert.equal(a.remember('词'+i),'saved');a.remember('词15');const v=a.read();assert.equal(v.kind,'ok');if(v.kind==='ok'){assert.equal(v.value.terms.length,12);assert.equal(v.value.terms[0],'词15');assert.equal(v.value.terms.filter(t=>t==='词15').length,1);}
 assert.deepEqual(h.profiles.profile('guest').read(),{kind:'ok',value:searchHistoryDefaults()});assert.deepEqual(h.profiles.profile('bili_202').read(),{kind:'ok',value:searchHistoryDefaults()});assert.throws(()=>h.profiles.profile('../outside'));
 assert.deepEqual(new SearchHistories(h.storage).profile('bili_101').read(),v);
});
test('W03 disabling records preserves existing terms, clear-all preserves off, and new searches do not write',()=>{
 const h=setup(),a=h.profiles.profile('guest');a.remember('你好');assert.equal(a.recording(false),'saved');const old=h.values.get('bilisofa.search.v1.guest');a.remember('世界');assert.equal(h.values.get('bilisofa.search.v1.guest'),old);assert.equal(a.forgetAll(),'saved');assert.deepEqual(a.read(),{kind:'ok',value:{schema:1,enabled:false,terms:[]}});a.recording(true);a.remember('世界');const read=a.read();if(read.kind==='ok')assert.deepEqual(read.value.terms,['世界']);
});
test('W03 history strict schema rejects credentials, outside fields, duplicate/unbounded words and future versions',()=>{
 for(const v of [{...searchHistoryDefaults(),cookie:'private'}, {...searchHistoryDefaults(),enabled:'true'}, {...searchHistoryDefaults(),terms:['你好','你好']},{...searchHistoryDefaults(),terms:['x'.repeat(33)]},{...searchHistoryDefaults(),terms:Array.from({length:13},(_,i)=>'词'+i)}])assert.throws(()=>parseSearchHistory(JSON.stringify(v)));
 assert.throws(()=>parseSearchHistory(' '.repeat(4097)));assert.throws(()=>parseSearchHistory('{"schema":2}'),{code:'unsupported'});
});
test('W03 bad/future search storage never overwrites on read or remember; explicit reset stays in owned partition',()=>{
 const h=setup(),a=h.profiles.profile('bili_101');h.values.set('bilisofa.retained-writes.v1','unknown');h.values.set('bilisofa.w01.progress-once.v1','unknown');h.profiles.profile('guest').remember('游客');
 for(const raw of ['{bad','{"schema":2}']){h.values.set('bilisofa.search.v1.bili_101',raw);assert.notEqual(a.read().kind,'ok');assert.notEqual(a.remember('你好'),'saved');assert.equal(h.values.get('bilisofa.search.v1.bili_101'),raw);assert.equal(a.clear(),'deleted');}
 assert.equal(h.values.get('bilisofa.retained-writes.v1'),'unknown');assert.equal(h.values.get('bilisofa.w01.progress-once.v1'),'unknown');const guest=h.profiles.profile('guest').read();if(guest.kind==='ok')assert.deepEqual(guest.value.terms,['游客']);
});
test('W03 ignored/throwing history changes remain unconfirmed and missing storage has no fallback',()=>{
 const h=setup(),a=h.profiles.profile('guest');h.mode('ignore');assert.equal(a.remember('你好'),'unconfirmed');h.mode('ok');a.remember('你好');h.mode('ignore');assert.equal(a.forgetAll(),'unconfirmed');assert.equal(a.clear(),'unconfirmed');h.mode('throw');assert.equal(a.recording(false),'unconfirmed');assert.deepEqual(new SearchHistories(undefined).profile('guest').read(),{kind:'unavailable'});
});
