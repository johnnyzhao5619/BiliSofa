import {test} from 'node:test';import assert from 'node:assert/strict';
import {PlayerInteractions} from '../../apps/tv/src/app/player-interactions.ts';
import {ResourceOwner} from '../../apps/tv/src/app/resource-owner.ts';
import {interactionFollow} from '../../packages/bili-client/src/video-interactions.ts';
import type {InteractionSnapshot,VideoInteractionAccess,VideoOperation} from '../../packages/contracts/src/video-interactions-dto.ts';
const state:InteractionSnapshot={token:'synthetic',bvid:'BV0000000001',title:'合成视频',owner:'合成UP',liked:false,followed:false,watchLater:false,coins:0,coinLimit:2,balance:10,folders:[],blocked:false,coinLocked:false};
const tick=()=>new Promise(r=>setTimeout(r,0));
test('official relation shape requires attribute, ignores unused relationship metadata, rejects unknown relationship and malformed proof',()=>{
 for(const mid of [0,'0',null,undefined])assert.equal(interactionFollow(JSON.stringify({code:0,data:{mid,attribute:0}}),'202').followed,false);
 for(const attribute of [0,1,2,6,128])assert.equal(interactionFollow(JSON.stringify({code:0,data:{attribute}}),'202').followed,[1,2,6].includes(attribute));
 assert.equal(interactionFollow(JSON.stringify({code:0,data:{mid:999,attribute:2}}),'202').followed,true);
 for(const data of [{attribute:3},{}, {attribute:'2'}])assert.throws(()=>interactionFollow(JSON.stringify({code:0,data}),'202'));
});
test('one-click owner serializes every family, reads before dispatch, toggles actual state and closes each access',async()=>{
 const owner=new ResourceOwner(),calls:string[]=[],posts:VideoOperation[]=[];let s=structuredClone(state);
 const access:VideoInteractionAccess={async read(){calls.push('read');return s;},async submit(_t,op,confirmed){assert.equal(confirmed,true);posts.push(op);calls.push('post');if(op.kind==='like')s={...s,liked:op.on};if(op.kind==='follow')s={...s,followed:op.on};if(op.kind==='watch-later')s={...s,watchLater:op.on};return{state:'confirmed',steps:[],snapshot:s};},async close(){calls.push('close');}};
 const c=new PlayerInteractions(owner,()=>access,()=>{});c.bind('id');c.preload();while(c.busy)await tick();assert.deepEqual(calls,['read','close']);calls.length=0;for(const kind of ['like','follow','watch-later','like']as const){c.toggle(kind);c.toggle(kind);while(c.busy)await tick();}assert.equal(posts.length,4);assert.deepEqual(posts,[{kind:'like',on:true},{kind:'follow',on:true},{kind:'watch-later',on:true},{kind:'like',on:false}]);assert.deepEqual(calls,Array(4).fill(['read','post','close']).flat());await owner.close();
});
test('persisted unknown consumes first click as readonly even if exact current state is now known',async()=>{
 const owner=new ResourceOwner();let posts=0,reads=0;const c=new PlayerInteractions(owner,()=>({async read(){return{...state,...(++reads===1?{reconciled:['like'] as ['like']}: {})};},async submit(){posts++;return{state:'confirmed',steps:[],snapshot:{...state,liked:true}};},async close(){}}),()=>{});c.bind('same');c.preload();while(c.busy)await tick();c.toggle('like');while(c.busy)await tick();assert.equal(posts,0);assert.match(c.message,/仅回查/);c.toggle('like');while(c.busy)await tick();assert.equal(posts,1);await owner.close();
});
test('late read after source change or Home cannot dispatch a write or publish old state',async()=>{
 for(const home of [false,true]){const owner=new ResourceOwner();let resolve!:(v:InteractionSnapshot)=>void,posts=0;const c=new PlayerInteractions(owner,()=>({read:()=>new Promise(r=>{resolve=r;}),async submit(){posts++;return{state:'confirmed',steps:[]};},async close(){}}),()=>{});c.bind('old');c.toggle('like');await tick();const closing=home?owner.close():undefined;if(!home)c.bind('new');resolve(state);while(c.busy)await tick();assert.equal(posts,0);assert.equal(c.snapshot,undefined);if(closing)assert.equal((await closing).closed,true);else await owner.close();}
});
test('changed remote state updates the button instead of inverting a newly changed value, and lost submit makes the next click query-only',async()=>{
 const owner=new ResourceOwner();let s=structuredClone(state),posts=0,lose=false;const c=new PlayerInteractions(owner,()=>({async read(){return s;},async submit(){posts++;if(lose)throw Error('response lost');return{state:'confirmed',steps:[],snapshot:{...s,liked:true}};},async close(){}}),()=>{});c.bind('same');c.preload();while(c.busy)await tick();s={...s,liked:true};c.toggle('like');while(c.busy)await tick();assert.equal(posts,0);assert.equal(c.snapshot?.liked,true);lose=true;c.toggle('like');while(c.busy)await tick();assert.equal(posts,1);assert.match(c.message,/仅回查/);c.toggle('like');while(c.busy)await tick();assert.equal(posts,1);await owner.close();
});
