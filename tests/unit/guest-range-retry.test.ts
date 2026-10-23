import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseGuestBridgeEvent,parseGuestFailureCode} from '../../packages/contracts/src/guest-video.ts';
import {MediaSession,type MediaTransport} from '../../packages/media/src/session.ts';
const scope={accountId:'guest',generation:1,mediaSessionId:'video',requestId:'r1'};
test('W03 range recovery fact is progress only, cannot certify close/readiness or carry private source data',()=>{
 const value={version:1,scope,operation:'guest-video-play',closed:false,code:'ugc.range_retry_once'};assert.equal(parseGuestBridgeEvent(value).code,'ugc.range_retry_once');
 for(const bad of [{...value,closed:true},{...value,url:'https://private.invalid/'},{...value,summary:{}},{...value,code:'ugc.range_retry_twice'}])assert.throws(()=>parseGuestBridgeEvent(bad));assert.throws(()=>parseGuestFailureCode('ugc.range_retry_once'));
});
test('W03 advisory recovery cannot change player readiness, expose arbitrary text or interrupt acknowledged cleanup',async()=>{
 let mode='retry',closes=0;
 const transport:MediaTransport={run:async()=>{await new Promise(()=>{});},recovery:()=>{if(mode==='throw')throw Error('private');return (mode==='retry'?'source-range-retry':'private') as 'source-range-retry';},close:async()=>{closes++;}};
 const media=new MediaSession(transport,()=>undefined,()=>{});media.start();await Promise.resolve();assert.equal(media.snapshot().recovery,'source-range-retry');assert.equal(media.snapshot().state,'loading');mode='invalid';assert.equal(media.snapshot().recovery,undefined);mode='throw';assert.equal(media.snapshot().recovery,undefined);assert.equal((await media.close()).closed,true);assert.equal(media.snapshot().recovery,undefined);assert.equal(closes,1);
});
