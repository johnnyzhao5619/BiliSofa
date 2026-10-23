import {test} from 'node:test';import assert from 'node:assert/strict';
import {SeekGesture,acceleratedStepMs} from '../../packages/media/src/seek-acceleration.ts';
import {Countdown,nextUpIndex} from '../../packages/media/src/next-up.ts';
test('ADR-090 a held seek accelerates 10 s → 30 s → 60 s within one gesture and restarts after an idle gap or reset',()=>{
 assert.deepEqual([1,2,3,4,5,6,7,9].map(n=>acceleratedStepMs(10000,n)),[10000,10000,10000,30000,30000,30000,60000,60000]);
 assert.equal(acceleratedStepMs(30000,1),30000);assert.equal(acceleratedStepMs(30000,4),30000);
 let now=0;const g=new SeekGesture(1200,()=>now);const steps=[];for(let i=0;i<7;i++){steps.push(g.next(10000));now+=150;}
 assert.deepEqual(steps,[10000,10000,10000,30000,30000,30000,60000]);now+=1300;assert.equal(g.next(10000),10000);g.next(10000);g.next(10000);g.reset();assert.equal(g.next(10000),10000);
});
test('ADR-090 next-up chains only the following item of the same sequence with repeat off',()=>{
 assert.equal(nextUpIndex(0,3,true,'off'),1);assert.equal(nextUpIndex(2,3,true,'off'),undefined);assert.equal(nextUpIndex(0,3,false,'off'),undefined);
 assert.equal(nextUpIndex(0,3,true,'one'),undefined);assert.equal(nextUpIndex(0,3,true,'all'),undefined);assert.equal(nextUpIndex(-1,3,true,'off'),undefined);
});
test('ADR-090 countdown ticks down, fires once, and cancel or now() prevents a second play',()=>{
 let run:(()=>void)|undefined;const ticks:number[]=[];let fired=0;const c=new Countdown(5,l=>ticks.push(l),()=>fired++,r=>{run=r;return 1 as unknown as ReturnType<typeof setInterval>;},()=>{run=undefined;});
 c.start();for(let i=0;i<5;i++)run?.();assert.deepEqual(ticks,[5,4,3,2,1]);assert.equal(fired,1);c.now();c.start();assert.equal(fired,1);assert.equal(c.active,false);
 const d=new Countdown(5,()=>{},()=>fired++,r=>{run=r;return 2 as unknown as ReturnType<typeof setInterval>;},()=>{run=undefined;});d.start();run?.();d.cancel();assert.equal(run,undefined);assert.equal(fired,1);
 const e=new Countdown(5,()=>{},()=>fired++,r=>{run=r;return 3 as unknown as ReturnType<typeof setInterval>;},()=>{run=undefined;});e.start();e.now();e.now();assert.equal(fired,2);
});
