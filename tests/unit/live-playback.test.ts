import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DomainError} from '../../packages/contracts/src/index.ts';
import {LiveReadFailure,type LiveAccess,type LiveCatalog} from '../../packages/contracts/src/live-product.ts';
import {LivePlayback} from '../../packages/media/src/live-playback.ts';
import type {OwnedPlayerBackend} from '../../packages/media/src/session.ts';
const catalog:LiveCatalog={id:'a'.repeat(32),roomId:'123',state:'live',selectedQn:250,qualities:[{qn:250,label:'超清'},{qn:10000,label:'原画'}],width:1280,height:720,video:'avc1.4d401f',audio:'mp4a.40.2'};
async function until(check:()=>boolean){for(let i=0;i<300;i++){if(check())return;await new Promise(resolve=>setTimeout(resolve,1));}assert.fail('bounded synthetic observation timed out');}
function backend(events:string[]){let state='NONE',tick=(n:number)=>{void n;},ended=()=>{};const value:OwnedPlayerBackend={async prepare(_source,onTime,onEnd){assert.equal(state,'NONE');state='READY';tick=onTime;ended=onEnd;events.push('prepare');},play(){state='PLAYING';events.push('play');},pause(){state='PAUSED';},async seek(){throw Error('live must not seek');},close(){if(state!=='NONE')events.push('decoder-closed');state='NONE';},screensaver(v){if(v)events.push('saver-on');},closureConfirmed:()=>state==='NONE'};return {value,tick:(n:number)=>tick(n),end:()=>ended(),state:()=>state};}
function access(index:number,events:string[],options:{reject?:unknown;gate?:Promise<void>;unknown?:boolean;transportFails?:boolean}={}){
  let finish!:()=>void,closing:Promise<void>|undefined,reads=0;
  const actor:LiveAccess={browse:async()=>{throw Error('not used');},areas:async()=>[],messages:async()=>({roomId:'123',items:[]}),room:async()=>{reads++;events.push('read-'+index);if(options.reject)throw options.reject;return {...catalog,id:index.toString(16).padStart(32,'0')};},transport:()=>({run:async(_signal,ready)=>{if(options.transportFails)throw new DomainError('network');ready({kind:'live',url:'http://127.0.0.1:40325/'+'a'.repeat(32)+'/index.m3u8'});await new Promise<void>(resolve=>{finish=resolve;});},close:()=>actor.close()}),close:()=>{if(!closing)closing=Promise.resolve().then(async()=>{events.push('source-closing-'+index);await options.gate;if(options.unknown)throw new DomainError('unknown');events.push('source-closed-'+index);finish?.();});return closing;}};
  return {actor,reads:()=>reads};
}
test('F18 quality replacement waits decoder and native ACK, reports actual fallback qn and ignores old callbacks',async()=>{
  const events:string[]=[],backends:ReturnType<typeof backend>[]=[],actors:ReturnType<typeof access>[]=[];let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
  const player=new LivePlayback('123',async()=>{const a=access(actors.length+1,events,actors.length===0?{gate}:{});actors.push(a);events.push('opened-'+actors.length);return a.actor;},()=>{const b=backend(events);backends.push(b);return b.value;},()=>0,[0,0]);
  await player.start();await until(()=>player.snapshot().phase==='playing');const moving=player.select(150);await until(()=>events.includes('decoder-closed'));assert.equal(actors.length,1);assert.equal(backends[0]!.state(),'NONE');release();await moving;await until(()=>player.snapshot().phase==='playing');assert.equal(player.snapshot().catalog!.selectedQn,250);assert.match(player.snapshot().notice,/实际返回值/);assert.ok(events.indexOf('source-closed-1')<events.indexOf('opened-2'));backends[0]!.end();backends[0]!.tick(999999);assert.equal(player.snapshot().phase,'playing');assert.ok((await player.close()).closed);
});
test('F18 failed high-quality request restores the last actually usable source once without pretending it played',async()=>{
  const events:string[]=[],queries:number[]=[];let count=0;
  const player=new LivePlayback('123',async()=>{const n=++count,a=access(n,events,n===2?{reject:new DomainError('unsupported')}:{});const room=a.actor.room;a.actor.room=async(q,s)=>{queries.push(q.qn);return room(q,s);};return a.actor;},()=>backend(events).value,()=>0,[0,0]);
  await player.start();await until(()=>player.snapshot().phase==='playing');await player.select(10000);await until(()=>player.snapshot().phase==='playing');assert.deepEqual(queries,[0,10000,250]);assert.match(player.snapshot().notice,/恢复上次/);assert.equal(player.snapshot().catalog!.selectedQn,250);await player.close();
});
test('F18 network failure gets two finite reconnects; API refusal and permission never enter an automatic loop',async()=>{
  for(const error of [undefined,new LiveReadFailure('network',-352),new DomainError('permission')]){const events:string[]=[];let count=0;const player=new LivePlayback('123',async()=>access(++count,events,error?{reject:error}:{transportFails:true}).actor,()=>backend(events).value,()=>0,[0,0]);await player.start();await until(()=>player.snapshot().phase==='error'&&(error?count===1:player.snapshot().retries===2));await new Promise(resolve=>setTimeout(resolve,8));assert.equal(count,error?1:3);await player.close();}
});
test('F18 unknown native closure blocks another quality/reconnect instead of opening over it',async()=>{
  const events:string[]=[];let count=0;const player=new LivePlayback('123',async()=>access(++count,events,{unknown:true}).actor,()=>backend(events).value,()=>0,[0,0]);await player.start();await until(()=>player.snapshot().phase==='playing');await player.select(150);assert.equal(player.snapshot().restartRequired,true);assert.equal(count,1);await assert.rejects(player.reconnect(),{code:'unknown'});assert.equal((await player.close()).closed,false);
});
test('F18 stall recovery uses live edge, and closing while a facade is pending prevents late native reads/decoder start',async()=>{
  const events:string[]=[],backs:ReturnType<typeof backend>[]=[],actors:ReturnType<typeof access>[]=[];let now=0;
  const player=new LivePlayback('123',async()=>{const a=access(actors.length+1,events);actors.push(a);return a.actor;},()=>{const b=backend(events);backs.push(b);return b.value;},()=>now,[0,0]);await player.start();await until(()=>player.snapshot().phase==='playing');backs[0]!.tick(1000);player.snapshot();now=21000;player.snapshot();await until(()=>actors.length===2&&player.snapshot().phase==='playing');assert.equal(player.snapshot().media!.timeMs,0);await player.close();
  let resolve!:(actor:LiveAccess)=>void;const late=access(9,events);let decoders=0;const pending=new LivePlayback('123',()=>new Promise(yes=>{resolve=yes;}),()=>{decoders++;return backend(events).value;});const start=pending.start();await until(()=>typeof resolve==='function');assert.ok((await pending.close()).closed);resolve(late.actor);await start;assert.equal(late.reads(),0);assert.equal(decoders,0);assert.ok(events.includes('source-closed-9'));
});
test('F18 1080P and 4K actual sources start automatically without a model-specific approval gate',async()=>{
 for(const [width,height]of [[1920,1080],[3840,2160]]){const events:string[]=[],a=access(1,events);a.actor.room=async()=>({...catalog,width:width!,height:height!});const player=new LivePlayback('123',async()=>a.actor,()=>backend(events).value,()=>0,[0,0]);await player.start();await until(()=>player.snapshot().phase==='playing');assert.equal(events.filter(e=>e==='prepare').length,1);assert.ok((await player.close()).closed);}
});
test('F18 real prepare failure lowers actual advertised quality, drains both resources and retains actual returned dimensions',async()=>{
 const events:string[]=[],queries:number[]=[];let n=0;
 const player=new LivePlayback('123',async()=>{const a=access(++n,events);a.actor.room=async(q)=>{queries.push(q.qn);const qn=q.qn||10000;return {...catalog,id:n.toString(16).padStart(32,'0'),selectedQn:qn,qualities:[{qn:10000,label:'原画'},{qn:250,label:'720P'},{qn:150,label:'480P'}],width:qn===10000?1920:1280,height:qn===10000?1080:720};};return a.actor;},()=>{const b=backend(events);if(n===1)b.value.prepare=async()=>{events.push('prepare-fail');throw new DomainError('unsupported');};return b.value;},()=>0,[0,0]);
 await player.start();await until(()=>player.snapshot().phase==='playing');assert.deepEqual(queries,[0,250]);assert.equal(player.snapshot().catalog!.selectedQn,250);assert.equal(player.snapshot().fallbacks,1);assert.match(player.snapshot().notice,/自动回退/);assert.ok(events.indexOf('source-closed-1')<events.indexOf('prepare'));await player.close();
});
test('F18 a server ignoring lower requests cannot repeat failed decoding or loop through original quality',async()=>{
 const events:string[]=[],queries:number[]=[];let n=0,decoders=0;
 const player=new LivePlayback('123',async()=>{const a=access(++n,events);a.actor.room=async(q)=>{queries.push(q.qn);return {...catalog,selectedQn:10000,qualities:[{qn:10000,label:'原画'},{qn:250,label:'720P'},{qn:150,label:'480P'}]};};return a.actor;},()=>{decoders++;const b=backend(events);b.value.prepare=async()=>{throw new DomainError('unsupported');};return b.value;},()=>0,[0,0]);
 await player.start();await until(()=>player.snapshot().phase==='error');assert.deepEqual(queries,[0,250,150]);assert.equal(decoders,1);assert.equal(player.snapshot().failurePhase,'negotiation');assert.equal(player.snapshot().retries,0);await player.close();
});
test('F18 exhausted startup CDN candidates terminate without repeating the same API/source cycle',async()=>{
 let count=0;const events:string[]=[],player=new LivePlayback('123',async()=>{const a=access(++count,events,{transportFails:true});a.actor.sourceStatus=()=>({stage:'manifest',node:2,http:0,curl:28,exhausted:true});return a.actor;},()=>backend(events).value,()=>0,[0,0]);await player.start();try{await until(()=>player.snapshot().phase==='error');assert.equal(count,1);assert.equal(player.snapshot().retries,0);assert.equal(player.snapshot().source!.node,2);}finally{await player.close();}
});
