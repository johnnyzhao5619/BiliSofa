import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CastProbeResult } from '../../packages/contracts/src/cast-probe.ts';
import type { ReceiverLink } from '../../packages/contracts/src/receiver-link.ts';
import type { ReceiverSnapshot, ReceiverCommand } from '../../packages/contracts/src/cast-receiver.ts';
import { CastWorkspace, type CastBackend } from '../../apps/tv/src/app/cast-workspace.ts';
const scope = {accountId:'guest',generation:0,mediaSessionId:'official-receiver',requestId:'r1'};
const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
function harness(options: { holdPrepare?: boolean; decoderUnknown?: boolean; nativeHold?: boolean; nativeError?: boolean; closeMs?: number; product?: boolean } = {}) {
  const facts:string[]=[];const calls: string[] = [], frames: ReceiverSnapshot[] = [], acks: [number,boolean][] = [], outcomes: unknown[] = [];
  let now=1000; let observed!: (event: CastProbeResult) => void, closeAck!: () => void, terminal!: () => void;
  const sources: { backend:CastBackend; time:(ms:number)=>void; end:()=>void; prepare:()=>void; seek:()=>void; url:string }[] = [];
  const link: ReceiverLink = {
    token:'a'.repeat(32), run(signal, emit) { observed=emit;signal.addEventListener('abort',()=>calls.push('abort'));return new Promise<void>(yes=>{terminal=yes;}); },
    approve() { calls.push('approve'); return true; }, decoderClosed(g,closed) { calls.push('decoder-ack-'+g+'-'+closed); return true; },
    snapshot(value) { frames.push(value);return true; }, acknowledge(id,ok) { acks.push([id,ok]);return true; },seekResult(ok) { calls.push('seek-result-'+ok);return true; },
    close() {calls.push('native-close');if(options.nativeError)throw Error('synthetic-private-uri');return options.nativeHold?new Promise<void>(yes=>{closeAck=yes;}):Promise.resolve();},
  };
  const workspace = new CastWorkspace(link,(url)=>{
    let closed=true,time!:(ms:number)=>void,end!:()=>void,prepare!:()=>void,seek!:()=>void;
    const index=sources.length;
    const backend:CastBackend={
      prepare(_s,t,e) {time=t;end=e;closed=false;calls.push('prepare-'+index);return options.holdPrepare?new Promise<void>(yes=>{prepare=yes;}):Promise.resolve();},
      play(){calls.push('play-'+index);},pause(){calls.push('pause-'+index);},seek(){calls.push('seek-'+index);return new Promise<void>(yes=>{seek=yes;});},
      close(){closed=!options.decoderUnknown;calls.push('decoder-close-'+index);},screensaver(){},closureConfirmed:()=>closed,durationMs:()=>index?120000:80000,
    };
    sources.push({backend,url,time:(ms)=>time(ms),end:()=>end(),prepare:()=>prepare(),seek:()=>seek()});return backend;
  },(error,closure)=>outcomes.push({error,closure}),()=>now,options.closeMs??1000,options.product??false,fact=>facts.push(fact));
  const emit=(code:string,extra:Partial<CastProbeResult>={})=>observed({version:1,scope,operation:'cast-discovery',closed:false,code,...extra});
  const command=(id:number,value:ReceiverCommand)=>emit('cast.receiver_command',{command:{id,value}});
  const source=async()=>{emit('cast.source_pass');emit('cast.media_ready');await flush();};
  const transition=(g=2,token='b'.repeat(32))=>emit('cast.transition_requested',{transition:{generation:g,token}});
  const readyNext=async(g=2)=>{emit('cast.transition_native_closed_'+g);emit('cast.source_pass');emit('cast.transition_ready_'+g);emit('cast.media_ready');await flush();};
  return {workspace,facts,calls,frames,acks,sources,outcomes,emit,command,source,transition,readyNext,ack:()=>closeAck(),terminal:()=>terminal(),clock:(value:number)=>{now=value;}};
}
test('W02 cast accepts one checked source, publishes actual duration/time and keeps source URLs private to the owned token',async()=>{
 const h=harness();h.workspace.start();await flush();h.emit('cast.ready');assert.equal(h.workspace.status().phase,'waiting');assert.equal(h.calls.includes('approve'),false);
 await h.source();h.sources[0]!.time(15000);h.workspace.toggle();assert.equal(h.workspace.status().timeMs,15000);assert.equal(h.workspace.status().durationMs,80000);assert.equal(h.workspace.status().controller,'remote');
 assert.equal(h.sources[0]!.url,'http://127.0.0.1:40324/'+'a'.repeat(32)+'/cast.mp4');await h.workspace.close();
});
test('W02 source transition closes old decoder before ACK and does not prepare until native close/source validation/new bridge',async()=>{
 const h=harness();h.workspace.start();await flush();await h.source();h.sources[0]!.time(25000);h.transition();
 assert.ok(h.calls.lastIndexOf('decoder-close-0')<h.calls.indexOf('decoder-ack-2-true'));assert.equal(h.sources.length,1);assert.equal(h.workspace.status().timeMs,0);assert.equal(h.workspace.status().durationMs,0);
 await h.readyNext();assert.equal(h.sources.length,2);assert.equal(h.workspace.status().generation,2);assert.equal(h.workspace.status().durationMs,120000);h.sources[0]!.time(99999);assert.equal(h.workspace.status().timeMs,0);await h.workspace.close();
});
test('W02 missing native closure is a protocol failure and cannot open the replacement',async()=>{
 const h=harness();h.workspace.start();await flush();await h.source();h.transition();h.emit('cast.source_pass');await flush();assert.equal(h.sources.length,1);assert.equal(h.outcomes.length,1);assert.equal(h.workspace.status().phase,'closed');
});
test('W02 unknown old decoder closure sends a negative transition acknowledgement and poisons the owner',async()=>{
 const h=harness({decoderUnknown:true});h.workspace.start();await flush();await h.source();h.transition();await flush();assert.ok(h.calls.includes('decoder-ack-2-false'));assert.deepEqual(await h.workspace.close(),{closed:false,decoderClosed:false,transportClosed:true});
});
test('W02 phone controls respect remote ownership and paused positioning keeps pause without a fabricated tick',async()=>{
 const h=harness();h.workspace.start();await flush();await h.source();h.command(1,{type:'pause'});assert.deepEqual(h.acks.at(-1),[1,true]);
 const pending=h.workspace.seek(5000);await flush();assert.equal(h.workspace.status().seeking,true);h.command(2,{type:'play'});assert.deepEqual(h.acks.at(-1),[2,false]);h.sources[0]!.seek();await pending;
 assert.equal(h.workspace.status().phase,'paused');assert.equal(h.workspace.status().timeMs,0);h.workspace.handBack();h.command(3,{type:'play'});assert.deepEqual(h.acks.at(-1),[3,true]);await h.workspace.close();
});
test('W02 Home/Back during pending prepare stops decoder before native abort and ignores late completion',async()=>{
 const h=harness({holdPrepare:true,nativeHold:true});h.workspace.start();await flush();await h.source();const closing=h.workspace.close();assert.equal(h.workspace.close(),closing);await flush();
 assert.ok(h.calls.lastIndexOf('decoder-close-0')<h.calls.indexOf('abort'));h.sources[0]!.prepare();await flush();assert.equal(h.calls.includes('play-0'),false);h.ack();assert.equal((await closing).closed,true);assert.equal(h.outcomes.length,0);
});
test('W02 native close timeout cannot become confirmed after a late ACK',async()=>{
 const h=harness({nativeHold:true,closeMs:20});h.workspace.start();await flush();await h.source();const result=await h.workspace.close();assert.deepEqual(result,{closed:false,decoderClosed:true,transportClosed:false});h.ack();await flush();assert.equal(await h.workspace.close(),result);
});
test('W02 source generations and tokens cannot replay, skip or implicitly reopen a decoder',async()=>{
 for(const [generation,token]of [[3,'b'.repeat(32)],[2,'a'.repeat(32)]] as const){const h=harness();h.workspace.start();await flush();await h.source();h.transition(generation,token);await flush();assert.equal(h.sources.length,1);assert.equal(h.outcomes.length,1);}
});
test('W02 terminal listener closure releases decoder and native transport once without retaining old commands',async()=>{
 const h=harness();h.workspace.start();await flush();await h.source();h.terminal();await flush();assert.equal(h.outcomes.length,1);assert.equal(h.workspace.status().phase,'closed');assert.throws(()=>h.workspace.start());h.command(1,{type:'play'});assert.equal(h.calls.filter(v=>v==='play-0').length,1);
});
test('W02 source validation failure drains both sides and emits only a fixed error',async()=>{
 const h=harness({nativeError:true});h.workspace.start();await flush();await h.source();h.transition();h.emit('cast.source_failed_403_0');await flush();assert.equal(h.sources.length,1);assert.equal(h.workspace.status().phase,'closed');assert.ok(!JSON.stringify(h.outcomes).includes('private-uri'));assert.equal((await h.workspace.close()).closed,false);
});

test('W02 isolated range timeout keeps actual progress under observation and closes on a later stall',async()=>{
 const h=harness();h.workspace.start();await flush();await h.source();h.emit('cast.media_timeout_isolated_g1');h.clock(4000);h.sources[0]!.time(3000);await new Promise(r=>setTimeout(r,220));assert.equal(h.outcomes.length,0);
 h.clock(9500);await new Promise(r=>setTimeout(r,220));await flush();assert.equal(h.outcomes.length,1);assert.equal(h.workspace.status().phase,'closed');
});
test('W02 a late old seek completion cannot publish success or start the replacement source',async()=>{
 const h=harness();h.workspace.start();await flush();await h.source();h.command(1,{type:'seek',timeMs:5000});await flush();h.transition();await h.readyNext();const before=h.frames.length;
 h.sources[0]!.seek();await flush();assert.equal(h.frames.length,before);assert.equal(h.calls.includes('seek-result-true'),false);assert.equal(h.calls.filter(c=>c==='play-1').length,1);await h.workspace.close();
});

test('W06 sequential source generations exceed probe quota and retain ordered decoder/native closure',async()=>{
 const h=harness({product:true});h.workspace.start();await flush();await h.source();
 for(let g=2;g<=21;g++){h.transition(g,g.toString(16).padStart(32,'0'));await h.readyNext(g);assert.equal(h.workspace.status().generation,g);assert.equal(h.sources.length,g);assert.ok(h.calls.indexOf('decoder-close-'+(g-2))<h.calls.indexOf('decoder-ack-'+g+'-true'));}
 assert.equal(h.outcomes.length,0);await h.workspace.close();assert.equal(h.sources.length,21);
});

test('W06 product initialization has a deadline, but a ready foreground listener has no artificial session lease',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const failed=harness({product:true});failed.workspace.start();await flush();t.mock.timers.tick(20000);await flush();assert.equal(failed.outcomes.length,1);assert.equal(failed.workspace.status().phase,'closed');
 const ready=harness({product:true});ready.workspace.start();await flush();ready.emit('cast.ready');t.mock.timers.tick(7200000);await flush();assert.equal(ready.outcomes.length,0);assert.equal(ready.workspace.status().phase,'waiting');await ready.workspace.close();
});


test('F20 product initial alignment records cause, does not reopen, and subsequent real rewind remains available',async()=>{
 const h=harness({product:true});h.workspace.start();await flush();await h.source();h.clock(3000);h.sources[0]!.time(2000);h.command(1,{type:'seek',timeMs:0});await flush();assert.deepEqual(h.facts,['autoplay_started','seek_zero','startup_aligned','seek_completed']);assert.ok(!h.calls.includes('seek-0'));assert.equal(h.sources.length,1);assert.equal(h.workspace.status().timeMs,2000);
 h.sources[0]!.time(15000);h.command(2,{type:'seek',timeMs:0});await flush();assert.ok(h.calls.includes('seek-0'));h.sources[0]!.time(0);h.sources[0]!.seek();await flush();assert.equal(h.workspace.status().timeMs,0);await h.workspace.close();
});
test('F20 new source generation gets its own alignment window and old media cannot mutate it',async()=>{
 const h=harness({product:true});h.workspace.start();await flush();await h.source();h.sources[0]!.time(2000);h.command(1,{type:'seek',timeMs:0});await flush();h.transition();await h.readyNext();h.sources[0]!.time(70000);h.sources[1]!.time(1500);h.command(2,{type:'seek',timeMs:0});await flush();assert.equal(h.workspace.status().generation,2);assert.equal(h.workspace.status().timeMs,1500);assert.equal(h.facts.filter(f=>f==='startup_aligned').length,2);assert.ok(!h.calls.includes('seek-1'));await h.workspace.close();
});
