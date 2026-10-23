import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DomainError } from '../../packages/contracts/src/index.ts';
import { guestMediaFailure, parseMediaFailure, type MediaFailure } from '../../packages/contracts/src/media-failure.ts';
import { MediaSession, type MediaTransport, type OwnedPlayerBackend } from '../../packages/media/src/session.ts';
import { AppDiagnostics } from '../../apps/tv/src/app/app-diagnostics.ts';
import { mediaFailureFeedback } from '../../apps/tv/src/app/media-failure-feedback.ts';
const flush=async()=>{for(let i=0;i<15;i++)await Promise.resolve();};
test('W02 source failure DTO admits only fixed phases/reasons/normalized codes without raw metadata or success frames',()=>{
 const value=guestMediaFailure('ugc.playurl_http_403');assert.deepEqual(value,{phase:'source',reason:'network',sourceCode:'ugc.playurl_http_403'});
 assert.equal(guestMediaFailure('ugc.view_unsupported').reason,'unsupported');assert.equal(guestMediaFailure('ugc.audio_transport_28').reason,'timeout');
 for(const bad of [{...value,url:'https://private.invalid'}, {...value,phase:'prepare'}, {...value,sourceCode:'ugc.token_private'}, {...value,sourceCode:'ugc.source_ranges_ok'}, {...value,sourceCode:'ugc.bridge_ready'}, {...value,reason:'private-cookie'}, {...value,phase:'private-account'}, {...value,reason:{toString:()=> 'network'}}, {...value,phase:{toString:()=> 'source'}}, {...value,sourceCode:'x'.repeat(4097)}])assert.throws(()=>parseMediaFailure(bad));
 assert.match(mediaFailureFeedback(value),/播放源读取失败.*ugc.playurl_http_403/);assert.match(mediaFailureFeedback(guestMediaFailure('ugc.view_unsupported')),/请选其他视频/);assert.equal(mediaFailureFeedback({message:'private'}),'播放失败，可返回后重试');
});
test('W02 source failure is captured before transport cleanup clears it and reported only after native ACK',async()=>{
 let fault:MediaFailure|undefined=guestMediaFailure('ugc.video_transport_28'),ack!:()=>void;const outcomes:unknown[]=[];
 const transport:MediaTransport={run:async()=>{throw new DomainError('network');},failure:()=>fault,close:()=>{fault=undefined;return new Promise<void>(yes=>{ack=yes;});}};
 const session=new MediaSession(transport,()=>{throw Error('must not prepare');},(outcome,closure,failure)=>outcomes.push({outcome,closure,failure}),1000);session.start();await flush();assert.equal(outcomes.length,0);assert.equal(session.snapshot().failure?.sourceCode,'ugc.video_transport_28');
 const copy=session.snapshot().failure!;copy.sourceCode='ugc.view_http_404';assert.equal(session.snapshot().failure?.sourceCode,'ugc.video_transport_28');ack();await flush();assert.equal(outcomes.length,1);assert.deepEqual(outcomes[0],{outcome:'failed',closure:{closed:true,decoderClosed:true,transportClosed:true},failure:{phase:'source',reason:'timeout',sourceCode:'ugc.video_transport_28'}});
});
test('W02 faulty diagnostic getter or tampered domain error cannot interrupt cleanup or leak its text',async()=>{
 for(const mode of ['throw','invalid','tampered']){let closes=0;const outcomes:unknown[]=[];const error=new DomainError('network');if(mode==='tampered')Object.assign(error,{code:'private-cookie'});
  const transport:MediaTransport={run:async()=>{throw error;},failure:()=>{if(mode==='throw')throw Error('private-url');return {phase:'source',reason:'network',sourceCode:'ugc.private_cookie'};},close:async()=>{closes++;}};
  const session=new MediaSession(transport,()=>undefined,(outcome,closure,failure)=>outcomes.push({outcome,closure,failure}));session.start();await flush();assert.equal(closes,1);assert.equal(outcomes.length,1);assert.ok(!JSON.stringify(outcomes).includes('private'));assert.equal(session.snapshot().failure?.reason,mode==='tampered'?'unknown':'network');
 }
});
test('W02 explicit cancel followed by a late source error produces neither failure feedback nor a fabricated completion',async()=>{
 let reject!:(e:unknown)=>void;const outcomes:unknown[]=[];
 const transport:MediaTransport={run:()=>new Promise((_yes,no)=>{reject=no;}),failure:()=>guestMediaFailure('ugc.view_http_403'),close:async()=>{}};
 const session=new MediaSession(transport,()=>undefined,(...value)=>outcomes.push(value));session.start();await flush();await session.close();reject(Error('private'));await flush();assert.equal(session.snapshot().failure,undefined);assert.deepEqual(outcomes,[]);
});
test('W02 prepare failures stay distinct from source errors and do not invoke a source diagnostic getter',async()=>{
 let getter=0,closes=0;const values:unknown[]=[];let ready!:Parameters<MediaTransport['run']>[1];
 const transport:MediaTransport={run:async(_signal,onReady)=>{ready=onReady;await new Promise(()=>{});},failure:()=>{getter++;return guestMediaFailure('ugc.view_unsupported');},close:async()=>{closes++;}};
 const backend:OwnedPlayerBackend={prepare:async()=>{throw new DomainError('timeout');},play(){},pause(){},seek:async()=>{},close(){},screensaver(){},closureConfirmed:()=>true};
 const session=new MediaSession(transport,()=>backend,(outcome,closure,failure)=>values.push({outcome,closure,failure}));session.start();await flush();ready({url:'http://127.0.0.1:40324/'+ 'a'.repeat(32)+'/manifest.mpd',kind:'vod'});await flush();assert.equal(getter,0);assert.equal(closes,1);assert.equal(session.snapshot().failure?.phase,'prepare');assert.equal(session.snapshot().failure?.reason,'timeout');assert.equal(values.length,1);
});
test('W02 media failure diagnostics remain bounded, copied, process-local and accept no secrets or identities',()=>{
 const diagnostics=new AppDiagnostics(),fault=guestMediaFailure('ugc.playurl_http_403');diagnostics.mediaFailure(fault);fault.sourceCode='ugc.view_unsupported';const original=diagnostics.snapshot();assert.match(original,/ugc.playurl_http_403/);
 for(const bad of [{...fault,bvid:'BV0000000001'},{...fault,sourceCode:'https://private.invalid'},{...fault,sourceCode:'ugc.account_bili_101'}])diagnostics.mediaFailure(bad);assert.equal(diagnostics.snapshot(),original);
 for(let i=0;i<100;i++)diagnostics.mediaFailure(guestMediaFailure(i%2?'ugc.playurl_http_403':'ugc.view_unsupported'));assert.equal(JSON.parse(diagnostics.snapshot()).entries.length,32);assert.ok(!diagnostics.snapshot().includes('private'));diagnostics.clear();assert.equal(JSON.parse(diagnostics.snapshot()).entries.length,0);
});
