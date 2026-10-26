import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHomeSnapshot,SNAPSHOT_MAX_AGE_MS,SNAPSHOT_MAX_CHARS} from '../../packages/contracts/src/home-snapshot.ts';
import {HomeSnapshots} from '../../apps/tv/src/platform/home-snapshot-store.ts';
import {InitialsWorker,releaseInitials,sharedInitials} from '../../apps/tv/src/platform/initials-worker.ts';
// ADR-116: the last home rows survive a restart for a day; 为你推荐 is per account and goes with the account.
const card=(i:number)=>({bvid:'BV'+String(i).padStart(10,'0'),title:'合成'+i,owner:'合成UP',durationSec:60,views:10});
function memory(){const map=new Map<string,string>();return {map,getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);},removeItem:(k:string)=>{map.delete(k);}};}
test('ADR-116 public rows and hot terms read back within a day, not after',()=>{
 let now=1800000000000;const storage=memory(),store=new HomeSnapshots(storage,()=>now);
 store.write('popular',Array.from({length:20},(_,i)=>card(i)));store.writeHot([{rank:1,keyword:'合成',label:'合成'}]);
 assert.equal(store.read('popular')!.cards.length,12,'at most twelve cards per row');assert.deepEqual(store.readHot(),[{rank:1,keyword:'合成',label:'合成'}]);
 now+=SNAPSHOT_MAX_AGE_MS;assert.ok(store.read('popular'));now+=1;assert.equal(store.read('popular'),undefined);assert.equal(store.readHot(),undefined);
});
test('ADR-116 为你推荐 is kept per account, never in the public key, and cleared with the account',()=>{
 const storage=memory(),store=new HomeSnapshots(storage,()=>1800000000000);
 store.write('recommend',[card(1)],'bili_1');store.write('recommend',[card(2)],'bili_2');
 assert.equal(store.read('recommend','bili_1')!.cards[0]!.bvid,card(1).bvid);assert.equal(store.read('recommend'),undefined,'no account, no private row');
 assert.ok(![...storage.map.values()].some(v=>v.includes(card(1).bvid)&&!v.includes('recommend')));
 store.clearAccount('bili_1');assert.equal(store.read('recommend','bili_1'),undefined);assert.ok(store.read('recommend','bili_2'));
});
test('ADR-116 corrupt, oversized, future or unexpected data reads as no snapshot and never throws',()=>{
 const now=1800000000000,ok=JSON.stringify({schema:1,shelves:{popular:{at:now,cards:[card(1)]}}});
 assert.equal(parseHomeSnapshot(ok,now).shelves.popular!.cards.length,1);
 for(const bad of ['not json',JSON.stringify({schema:2,shelves:{}}),JSON.stringify({schema:1,shelves:{other:{at:now,cards:[]}}}),JSON.stringify({schema:1,shelves:{popular:{at:now+600000,cards:[card(1)]}}}),
  JSON.stringify({schema:1,shelves:{popular:{at:now,cards:[{...card(1),cookie:'x'}]}}}),' '.repeat(SNAPSHOT_MAX_CHARS+1)])assert.throws(()=>parseHomeSnapshot(bad,now));
 const storage=memory();storage.setItem('bilisofa.home-snapshot.v1','{broken');const store=new HomeSnapshots(storage,()=>now);
 assert.equal(store.read('popular'),undefined);store.write('ranking',[card(3)]);assert.ok(store.read('ranking'),'a corrupt document is replaced by the next write');
 const broken=new HomeSnapshots({getItem:()=>{throw new Error('denied');},setItem:()=>{throw new Error('quota');},removeItem:()=>{throw new Error('denied');}},()=>now);
 assert.equal(broken.read('popular'),undefined);broken.write('popular',[card(1)]);broken.clearAccount('bili_1');
});
test('ADR-116 one dictionary Worker for the app: cancelling keeps it, only release ends it',()=>{
 const made:string[]=[],ended:string[]=[];const original=(globalThis as {Worker?:unknown}).Worker;
 (globalThis as {Worker?:unknown}).Worker=class{onmessage:unknown;onerror:unknown;constructor(url:string){made.push(url);}postMessage(){}terminate(){ended.push('x');}};
 try{
  const a=sharedInitials(),b=sharedInitials();assert.equal(a,b);assert.ok(a instanceof InitialsWorker);
  a.warm();a.warm();assert.deepEqual(made,['initials-worker.js']);
  void a.query('nh').catch(()=>{});a.cancel();assert.equal(ended.length,0,'cancel keeps the parsed dictionary');
  releaseInitials();assert.equal(ended.length,1);assert.notEqual(sharedInitials(),a);releaseInitials();
 }finally{(globalThis as {Worker?:unknown}).Worker=original;}
});
