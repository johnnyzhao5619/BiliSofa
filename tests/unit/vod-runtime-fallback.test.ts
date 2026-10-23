import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DomainError} from '../../packages/contracts/src/index.ts';
import type {VodAccess,VodReadResult} from '../../packages/contracts/src/vod-runtime.ts';
import type {VodChoice,VodCapabilities} from '../../packages/contracts/src/vod-catalog.ts';
import {VodCatalogMedia} from '../../packages/media/src/vod-catalog-media.ts';
import type {MediaClosure,OwnedPlayerBackend} from '../../packages/media/src/session.ts';
const caps:VodCapabilities={video:['avc','hevc','av1'],audio:['aac','eac3','flac'],qualities:[16,32,64,80],maxWidth:16384,maxHeight:8640,maxFps:240,rates:[1,2]};
const item={bvid:'BV0000000001',part:1,title:'合成',durationMs:90000};
const result:VodReadResult={detail:{title:'合成',owner:'合成',parts:[item]},catalog:{id:'a'.repeat(32),item,videos:[{key:'v0',quality:80,label:'1080P',codec:'hevc',width:1920,height:1080,fps:60,bandwidth:3000000},{key:'v1',quality:80,label:'1080P',codec:'avc',width:1920,height:1080,fps:30,bandwidth:4000000},{key:'v2',quality:64,label:'720P',codec:'avc',width:1280,height:720,fps:30,bandwidth:2000000}],audios:[{key:'a0',codec:'eac3',label:'EAC3',bandwidth:384000},{key:'a1',codec:'aac',label:'AAC',bandwidth:128000}]}};
async function until(check:()=>boolean){for(let i=0;i<500;i++){if(check())return;await new Promise(resolve=>setTimeout(resolve,1));}assert.fail('bounded synthetic media observation timed out');}
function fixture(options:{alwaysFail?:boolean;source?:boolean;unknownClose?:boolean;gate?:Promise<void>;during?:boolean}={}){
 const choices:VodChoice[]=[],selected:VodChoice[]=[],events:string[]=[],outcomes:MediaClosure[]=[];let state='NONE',onTime=(n:number)=>{void n;},onError=()=>{};
 const actor:VodAccess={read:async()=>result,transport(choice){choices.push(choice);let finish!:()=>void;return {run:async(_signal,ready)=>{events.push('source-'+choices.length);if(options.source)throw new DomainError('permission');ready({kind:'vod',url:'http://127.0.0.1:40324/'+'a'.repeat(32)+'/manifest.mpd'});await new Promise<void>(yes=>{finish=yes;});},close:async()=>{events.push('source-closing');await options.gate;if(options.unknownClose)throw new DomainError('unknown');events.push('source-closed');finish?.();}};},close:async()=>{}};
 const owner=new VodCatalogMedia(actor,item,{catalogId:result.catalog.id,videoKey:'v0',audioKey:'a0'},caps,()=>result,(_r,c)=>selected.push(c),()=>{
  assert.equal(state,'NONE');return {prepare:async(_s,tick,_end,error)=>{state='READY';onTime=tick;onError=error;events.push('prepare');if(options.alwaysFail||choices.length===1&&!options.during)throw new DomainError('unsupported');},play:()=>{state='PLAYING';events.push('play');},pause:()=>{state='PAUSED';},seek:async ms=>{onTime(ms);},close:()=>{state='NONE';events.push('decoder-closed');},closureConfirmed:()=>state==='NONE',screensaver:()=>{},durationMs:()=>90000,failureReason:()=>options.during?'unsupported':undefined} satisfies OwnedPlayerBackend;
 },(_o,c)=>outcomes.push(c));
 return {owner,choices,selected,events,outcomes,tick:(n:number)=>onTime(n),fail:()=>onError()};
}
test('F06 real high-codec prepare failure switches to actual AVC/AAC only after both closes, preserving pause/position',async()=>{
 let release!:()=>void;const gate=new Promise<void>(yes=>{release=yes;}),f=fixture({gate});f.owner.start(17000,true);
 try{await until(()=>f.events.includes('source-closing'));assert.equal(f.choices.length,1);assert.ok(f.events.indexOf('decoder-closed')<f.events.indexOf('source-closing'));release();await until(()=>f.owner.snapshot().state==='paused');assert.equal(f.choices.length,2);assert.deepEqual(f.choices[1],{catalogId:result.catalog.id,videoKey:'v1',audioKey:'a1'});assert.equal(f.owner.snapshot().timeMs,17000);assert.ok(!f.events.includes('play'));f.owner.toggle();assert.equal(f.owner.snapshot().state,'playing');assert.equal(f.outcomes.length,0);}finally{release();await f.owner.close();}
});
test('F06 runtime playback error resumes the same item at last actual position instead of advancing the queue',async()=>{
 const f=fixture({during:true});f.owner.start();try{await until(()=>f.owner.snapshot().state==='playing');f.tick(23000);f.fail();await until(()=>f.choices.length===2&&f.owner.snapshot().state==='playing');assert.equal(f.owner.snapshot().timeMs,23000);assert.equal(f.outcomes.length,0);}finally{await f.owner.close();}
});
test('F06 all failing runtime alternatives stop within four unique pairs; source permission and unknown closure cannot retry',async()=>{
 for(const options of [{alwaysFail:true},{source:true},{unknownClose:true}]){const f=fixture(options);f.owner.start();try{await until(()=>f.outcomes.length===1);assert.ok(f.choices.length<=4);assert.equal(new Set(f.choices.map(c=>`${c.videoKey}/${c.audioKey}`)).size,f.choices.length);if(!('alwaysFail'in options))assert.equal(f.choices.length,1);if('unknownClose'in options)assert.equal(f.outcomes[0]!.closed,false);}finally{await f.owner.close();}}
});
test('F06 Back during failed-source drain cancels the downgrade rather than reviving a new decoder',async()=>{
 let release!:()=>void;const gate=new Promise<void>(yes=>{release=yes;}),f=fixture({gate});f.owner.start();await until(()=>f.events.includes('source-closing'));const closing=f.owner.close();release();assert.ok((await closing).closed);await new Promise(yes=>setTimeout(yes,5));assert.equal(f.choices.length,1);assert.equal(f.outcomes.length,0);
});
