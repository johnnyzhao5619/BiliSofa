import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PUBLIC_CATEGORIES,parseCategoryId} from '../../packages/contracts/src/categories.ts';
import {parseContentQuery} from '../../packages/contracts/src/content.ts';
import {parseRankingRequest,parseRankingResult,type RankingRequest} from '../../packages/contracts/src/ranking.ts';
import {PublicContentRuntime} from '../../apps/tv/src/platform/content-runtime.ts';
import {resetPublicLists} from '../../apps/tv/src/platform/public-lists.ts';
import { withFakeKernel } from './fake-public-kernel.ts';
/** Guest category reads first obtain B站's visitor identity (ADR-106) on the same catalog Worker file. */
const visitor=(q:RankingRequest)=>({...q,closed:true,kind:'ok',status:200,apiCode:0,code:'ranking.ok',items:[],visitorId:{b3:'AB12CD34-EF56-7890-ABCD-EF1234567890infoc',b4:'0F1E2D3C-4B5A-6978-8796-A5B4C3D2E1F0'}});
const scope={accountId:'guest',generation:1,mediaSessionId:'category',requestId:'c1'};
const response=(request:RankingRequest)=>{const {visitor:_visitor,...q}=request as RankingRequest&{visitor?:string};return {...q,closed:true,kind:'ok',status:200,apiCode:0,code:'ranking.ok',items:Array.from({length:8},(_,i)=>({bvid:'BV'+String(i).padStart(10,'0'),title:'合成分区',owner:'合成UP',durationSec:80,views:1}))};};
test('W03 category contracts accept only generated numeric facts, one anonymous operation and coherent echo',()=>{
 assert.equal(PUBLIC_CATEGORIES.length,14);
 for(const row of PUBLIC_CATEGORIES){assert.equal(parseCategoryId(row.id),row.id);const q={version:1,scope,operation:'public-category-ranking',categoryId:row.id};assert.deepEqual(parseRankingRequest(q),q);assert.equal(parseRankingResult(response(q as RankingRequest)).operation,q.operation);assert.deepEqual(parseContentQuery({route:'category',page:25,categoryId:row.id}),{route:'category',page:25,categoryId:row.id});}
 for(const id of [0,1,999,1100,'1005',1005.1,null,'1005&type=all']){assert.throws(()=>parseCategoryId(id));assert.throws(()=>parseRankingRequest({version:1,scope,operation:'public-category-ranking',categoryId:id}));}
 const q={version:1,scope,operation:'public-category-ranking',categoryId:1005};
 for(const bad of [{...q,url:'https://outside.invalid/'},{...q,cookie:'synthetic'},{...q,categoryId:undefined},{...q,operation:'public-ranking'}])assert.throws(()=>parseRankingRequest(bad));
 for(const bad of [{route:'category',categoryId:1005,page:2,refresh:true},{route:'category',categoryId:1005,page:26},{route:'category',categoryId:1005,page:1,url:'synthetic'}])assert.throws(()=>parseContentQuery(bad));
 assert.throws(()=>parseRankingResult({...response(q as RankingRequest),operation:'public-ranking'}));
});
test('W03 category snapshots are keyed, paged copies; a category is reused for ten minutes (ADR-105), a failed read leaves no snapshot',async()=>{
 resetPublicLists();const requests:RankingRequest[]=[];let fail=false;
 await withFakeKernel(q=>{const r=q as RankingRequest;if(r.operation==='public-visitor')return visitor(r);requests.push(r);return fail?{...response(r),kind:'api_error',apiCode:-352,code:'ranking.api_error',items:[]}:response(r);},async()=>{
  const runtime=new PublicContentRuntime(),signal=new AbortController().signal;
  const a=await runtime.read({route:'category',categoryId:1005,page:1},signal);a.items[0]!.title='mutated';await runtime.read({route:'category',categoryId:1005,page:2},signal);
  assert.equal((await runtime.read({route:'category',categoryId:1005,page:1},signal)).items[0]!.title,'合成分区');assert.equal(requests.length,1);
  await assert.rejects(runtime.read({route:'category',categoryId:1008,page:2},signal),{code:'invalid'});
  await runtime.read({route:'category',categoryId:1008,page:1},signal);assert.equal(requests.length,2);
  await runtime.read({route:'ranking',page:1},signal);assert.equal(requests.length,3);
  await runtime.read({route:'category',categoryId:1005,page:1},signal);assert.equal(requests.length,3,'reused within ten minutes');
  assert.ok(requests.every(q=>q.operation!=='public-category-ranking'||'visitor'in q),'guest category reads carry the visitor identity');
  fail=true;await assert.rejects(runtime.read({route:'category',categoryId:1004,page:1},signal),{apiCode:-352});await assert.rejects(runtime.read({route:'category',categoryId:1004,page:2},signal),{code:'invalid'});assert.deepEqual(await runtime.close(),{closed:true});
 });
});
test('W03 category reply for another valid category is never accepted',async()=>{
 resetPublicLists();
 await withFakeKernel(q=>{const r=q as RankingRequest;return r.operation==='public-visitor'?visitor(r):{...response(r),categoryId:1008};},async()=>{
  const runtime=new PublicContentRuntime();await assert.rejects(runtime.read({route:'category',categoryId:1005,page:1},new AbortController().signal),{code:'invalid'});assert.deepEqual(await runtime.close(),{closed:true});
 });
});
