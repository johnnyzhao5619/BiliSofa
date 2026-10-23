import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CastReceiverPlayer } from '../../apps/tv/src/app/cast-receiver-player.ts';
import { PlayerCoordinator } from '../../packages/media/src/player.ts';
import type { PlayerBackend } from '../../packages/contracts/src/index.ts';
import type { ReceiverSnapshot } from '../../packages/contracts/src/cast-receiver.ts';
function setup(product=false,nativePlayingSeek=false,idempotentPosition=false) {
  const calls: string[] = [], snapshots: ReceiverSnapshot[] = [], acks: unknown[] = [], seeks: boolean[] = [];
  let durationReads = 0, now = 0; const facts: string[] = [];
  let tick: (ms: number) => void = () => {}, resolveSeek = () => {}, failSeek = () => {}, resolvePrepare = () => {}, valid = true;
  const backend: PlayerBackend = { prepare: async (_source, onTime) => { calls.push('prepare'); tick = onTime; await new Promise<void>(ok => { resolvePrepare = ok; }); }, play: () => { calls.push('play'); }, pause: () => { calls.push('pause'); }, seek: () => { calls.push('seek'); return new Promise<void>((ok, no) => { resolveSeek = ok; failSeek = () => no(Error()); }); }, close: () => { calls.push('close'); }, screensaver() {} };
  const player = new PlayerCoordinator(backend), controller = new CastReceiverPlayer(player, 'http://127.0.0.1:40324/owned/cast.mp4', () => valid, () => { durationReads++; assert.equal(player.seeking, false); assert.notEqual(player.state, 'preparing'); return 240000; }, v => snapshots.push(v), (id, ok) => acks.push([id, ok]), ok => seeks.push(ok), fact => facts.push(fact), () => {}, () => now,product,()=>facts.push('startup_position_aligned'),nativePlayingSeek,idempotentPosition,()=>facts.push('seek_current_position'));
  return { facts, advance: (ms: number) => { now += ms; }, durationReads: () => durationReads, calls, snapshots, acks, seeks, player, controller, tick: (ms: number) => tick(ms), prepared: () => resolvePrepare(), sought: () => resolveSeek(), fail: () => failSeek(), invalidate: () => { valid = false; player.close(); } };
}
const flush = () => new Promise<void>(ok => setImmediate(ok));
test('W01/F20 UI controller reports actual pause/play, idempotent commands and blocks old/remote-owned commands', async () => {
  const v = setup(), opened = v.player.open({ url: 'owned', kind: 'vod' }); v.prepared(); await opened; v.player.play(); v.tick(15000);
  v.controller.execute(1, { type: 'pause' }); assert.equal(v.snapshots.at(-1)?.state, 'paused');
  v.controller.execute(2, { type: 'pause' }); assert.equal(v.calls.filter(c => c === 'pause').length, 1);
  v.controller.execute(3, { type: 'play' }); assert.equal(v.snapshots.at(-1)?.timeMs, 15000);
  v.controller.execute(3, { type: 'pause' }); assert.deepEqual(v.acks.at(-1), [3, false]);
  assert.equal(v.controller.takeRemote(), true); v.controller.execute(4, { type: 'pause' }); assert.deepEqual(v.acks.at(-1), [4, false]);
  v.controller.handBack(); v.controller.execute(5, { type: 'pause' }); assert.equal(v.player.state, 'paused');
});
test('W01/F20 UI seek ACK does not manufacture target ticks; busy commands are rejected and completion is separate', async () => {
  const v = setup(), opened = v.player.open({ url: 'owned', kind: 'vod' }); v.prepared(); await opened; v.player.play(); v.tick(15000);
  v.controller.execute(1, { type: 'seek', timeMs: 5000 }); assert.deepEqual(v.acks, [[1, true]]); assert.equal(v.snapshots.at(-1)?.seeking, true); assert.equal(v.snapshots.at(-1)?.timeMs, 15000);
  v.controller.execute(2, { type: 'pause' }); assert.deepEqual(v.acks.at(-1), [2, false]); assert.equal(v.controller.takeRemote(), false);
  await flush(); v.tick(5000); v.sought(); await flush(); assert.deepEqual(v.seeks, [true]); assert.equal(v.snapshots.at(-1)?.timeMs, 5000);
});
test('W01/F20 UI Stop keeps receiver alive; Play reopens only its fixed source; Back cancels late prepare and seek', async () => {
  const v = setup(), opened = v.player.open({ url: 'owned', kind: 'vod' }); v.prepared(); await opened; v.player.play();
  v.controller.execute(1, { type: 'stop' }); assert.equal(v.snapshots.at(-1)?.state, 'idle');
  v.controller.execute(2, { type: 'play' }); assert.equal(v.player.state, 'preparing'); assert.deepEqual(v.acks.at(-1), [2, true]);
  v.prepared(); await flush(); assert.equal(v.player.state, 'playing');
  v.controller.execute(3, { type: 'seek', timeMs: 5000 }); await flush(); const count = v.snapshots.length; v.invalidate(); v.sought(); await flush(); assert.equal(v.snapshots.length, count); assert.deepEqual(v.seeks, []);
  const w = setup(); w.controller.execute(1, { type: 'play' }); w.invalidate(); w.prepared(); await flush(); assert.equal(w.calls.includes('play'), false);
});
test('W01/F20 UI seek failure never retries and is reported independently of acceptance', async () => {
  const v = setup(), opened = v.player.open({ url: 'owned', kind: 'vod' }); v.prepared(); await opened; v.player.play();
  v.controller.execute(1, { type: 'seek', timeMs: 5000 }); await flush(); v.fail(); await flush(); assert.deepEqual(v.acks, [[1, true]]); assert.deepEqual(v.seeks, [false]); assert.equal(v.calls.filter(c => c === 'seek').length, 1); assert.equal(v.player.state, 'idle'); assert.equal(v.calls.filter(c => c === 'play').length, 1);
});

test('W01/F20 phone-paused remote seek publishes cached duration without any SDK getter until completion', async () => {
  const v = setup(), opened = v.player.open({ url: 'owned', kind: 'vod' }); v.controller.snapshot(); assert.equal(v.durationReads(), 0); v.prepared(); await opened; v.player.play();
  v.controller.execute(1, { type: 'pause' }); assert.equal(v.controller.takeRemote(), true); const reads = v.durationReads();
  const pending = v.player.seek(5000); await flush(); for (let i = 0; i < 20; i++) v.controller.snapshot();
  assert.equal(v.durationReads(), reads); assert.equal(v.snapshots.at(-1)?.state, 'paused'); assert.equal(v.snapshots.at(-1)?.durationMs, 240000); assert.equal(v.snapshots.at(-1)?.seeking, true);
  v.tick(5000); v.sought(); await pending; v.controller.snapshot(); assert.equal(v.durationReads(), reads + 1); assert.equal(v.snapshots.at(-1)?.timeMs, 5000); assert.equal(v.player.state, 'paused');
});

test('F20 phone playing seek pauses then resumes exactly once; paused seek and cancelled seek never auto-play', async () => {
  for (const mode of ['playing', 'paused', 'cancel'] as const) {
    const v = setup(), opened = v.player.open({ url: 'owned', kind: 'vod' }); v.prepared(); await opened; v.player.play();
    if (mode === 'paused') v.player.pause(); const prior = v.calls.filter(c => c === 'play').length;
    v.controller.execute(1, { type: 'seek', timeMs: 5000 }); await flush(); assert.equal(v.player.state, 'paused');
    if (mode === 'cancel') v.invalidate(); v.sought(); await flush();
    assert.equal(v.calls.filter(c => c === 'play').length, prior + (mode === 'playing' ? 1 : 0));
    if (mode !== 'cancel') assert.equal(v.player.state, mode === 'playing' ? 'playing' : 'paused');
  }
});

test('F20 seek target facts use distinct real post-seek ticks, never the requested value or callback alone', async () => {
  for (const hit of [true, false]) {
    const v = setup(), opened = v.player.open({ url:'owned',kind:'vod' }); v.prepared(); await opened; v.player.play(); v.tick(15000);
    v.controller.execute(1,{type:'seek',timeMs:60000}); await flush(); v.sought(); await flush();
    assert.ok(v.facts.includes('seek_target_nonzero')); assert.ok(!v.facts.includes('seek_target_hit'));
    v.tick(hit ? 60000 : 100); v.controller.snapshot(); v.advance(4100); v.tick(hit ? 64000 : 4200); v.controller.snapshot();
    assert.ok(v.facts.includes(hit ? 'seek_target_hit' : 'seek_target_window_missed'));
    assert.ok(!v.facts.includes(hit ? 'seek_target_window_missed' : 'seek_target_hit'));
  }
});


test('F20 product merges one initial near-zero alignment without pause/reopen or fabricated target ticks',async()=>{
 const v=setup(true),opened=v.player.open({url:'owned',kind:'vod'});v.prepared();await opened;v.player.play();v.controller.snapshot();v.advance(2000);v.tick(2000);v.controller.snapshot();
 const prior=v.calls.slice();v.controller.execute(1,{type:'seek',timeMs:0});await flush();assert.deepEqual(v.calls,prior);assert.equal(v.player.timeMs,2000);assert.equal(v.player.state,'playing');assert.deepEqual(v.acks,[[1,true]]);assert.deepEqual(v.seeks,[true]);assert.ok(v.facts.includes('startup_position_aligned'));assert.ok(!v.facts.includes('seek_target_hit'));
 v.controller.execute(1,{type:'seek',timeMs:0});assert.deepEqual(v.acks.at(-1),[1,false]);v.controller.execute(2,{type:'seek',timeMs:0});await flush();assert.equal(v.calls.filter(c=>c==='seek').length,1);v.sought();await flush();
});
test('F20 product preserves nonzero resume, later rewind-to-start, late commands and legacy probe semantics',async()=>{
 for(const [time,target,elapsed,product]of [[2000,60000,2000,true],[15000,0,2000,true],[2000,0,4001,true],[2501,0,2000,true],[2000,0,2000,false]]as const){
  const v=setup(product),opened=v.player.open({url:'owned',kind:'vod'});v.prepared();await opened;v.player.play();v.controller.snapshot();v.advance(elapsed);v.tick(time);v.controller.snapshot();v.controller.execute(1,{type:'seek',timeMs:target});await flush();assert.equal(v.calls.filter(c=>c==='seek').length,1);assert.ok(!v.facts.includes('startup_position_aligned'));v.tick(target);v.sought();await flush();assert.equal(v.player.timeMs,target);
 }
});
test('F20 product pause and explicit remote takeover close the initial-alignment window',async()=>{
 for(const mode of ['pause','remote']as const){const v=setup(true),opened=v.player.open({url:'owned',kind:'vod'});v.prepared();await opened;v.player.play();v.controller.snapshot();v.tick(1000);if(mode==='pause')v.controller.execute(1,{type:'pause'});else{v.controller.takeRemote();v.controller.handBack();}v.controller.execute(2,{type:'seek',timeMs:0});await flush();assert.equal(v.calls.filter(c=>c==='seek').length,1);assert.ok(!v.facts.includes('startup_position_aligned'));v.sought();await flush();}
});


test('F20 explicit Stop/Play replay re-arms once, idempotent Play cannot re-arm alignment',async()=>{
 const v=setup(true),opened=v.player.open({url:'owned',kind:'vod'});v.prepared();await opened;v.player.play();v.controller.snapshot();v.controller.execute(1,{type:'stop'});v.controller.execute(2,{type:'play'});v.prepared();await flush();v.tick(1000);v.controller.snapshot();v.controller.execute(3,{type:'seek',timeMs:0});await flush();assert.ok(v.facts.includes('startup_position_aligned'));assert.equal(v.calls.filter(c=>c==='seek').length,0);v.controller.execute(4,{type:'play'});v.controller.execute(5,{type:'seek',timeMs:0});await flush();assert.equal(v.calls.filter(c=>c==='seek').length,1);v.sought();await flush();
});


test('F20 active nonzero seek keeps decoder playing and confirms real target ticks, without a pause/reopen pair',async()=>{
 const v=setup(false,true),opened=v.player.open({url:'owned',kind:'vod'});v.prepared();await opened;v.player.play();v.controller.snapshot();v.tick(1545);v.advance(2167);
 const before=v.calls.slice();v.controller.execute(1,{type:'seek',timeMs:4000});await flush();assert.deepEqual(v.calls.slice(before.length),['seek']);assert.equal(v.player.state,'playing');assert.equal(v.player.timeMs,1545);assert.ok(!v.facts.includes('seek_target_hit'));
 v.tick(4000);v.sought();await flush();assert.equal(v.player.state,'playing');v.controller.snapshot();assert.ok(v.facts.includes('seek_target_hit'));assert.equal(v.calls.filter(x=>x==='play').length,1);assert.equal(v.calls.filter(x=>x==='pause').length,0);
 v.controller.execute(2,{type:'seek',timeMs:0});await flush();assert.equal(v.player.state,'paused');v.tick(0);v.sought();await flush();assert.equal(v.player.state,'playing');assert.equal(v.calls.filter(x=>x==='pause').length,1);
});
test('F20 active native seek respects pause/busy, stale owner and failure cleanup without replay',async()=>{
 for(const mode of ['paused','cancel','failure']as const){
  const v=setup(false,true),opened=v.player.open({url:'owned',kind:'vod'});v.prepared();await opened;v.player.play();v.controller.snapshot();if(mode==='paused')v.controller.execute(1,{type:'pause'});
  v.controller.execute(2,{type:'seek',timeMs:4000});await flush();const plays=v.calls.filter(x=>x==='play').length;v.controller.execute(3,{type:'play'});assert.deepEqual(v.acks.at(-1),[3,false]);
  if(mode==='cancel')v.invalidate();if(mode==='failure')v.fail();else v.sought();await flush();assert.equal(v.calls.filter(x=>x==='play').length,plays);assert.equal(v.player.state,mode==='paused'?'paused':'idle');assert.equal(v.calls.filter(x=>x==='seek').length,1);
 }
});


test('F20 a fresh same reported SOAP second is idempotent at any playback age and never fabricates a target tick',async()=>{
 const v=setup(false,true,true),opened=v.player.open({url:'owned',kind:'vod'});v.prepared();await opened;v.player.play();v.controller.snapshot();v.advance(20000);v.tick(2080);v.controller.snapshot();const before=v.calls.slice();
 v.controller.execute(1,{type:'seek',timeMs:2000});await flush();assert.deepEqual(v.calls,before);assert.equal(v.player.timeMs,2080);assert.deepEqual(v.acks,[[1,true]]);assert.deepEqual(v.seeks,[true]);assert.ok(v.facts.includes('seek_current_position'));assert.ok(!v.facts.includes('seek_target_hit'));v.controller.execute(1,{type:'seek',timeMs:2000});assert.deepEqual(v.acks.at(-1),[1,false]);
});
test('F20 same-position completion never suppresses stale, fractional, other-second or paused seeks',async()=>{
 for(const mode of ['stale','fraction','other-second','paused']as const){const v=setup(false,true,true),opened=v.player.open({url:'owned',kind:'vod'});v.prepared();await opened;v.player.play();v.tick(2080);v.controller.snapshot();if(mode==='stale')v.advance(1001);if(mode==='paused')v.controller.execute(1,{type:'pause'});v.controller.execute(2,{type:'seek',timeMs:mode==='fraction'?2081:mode==='other-second'?4000:2000});await flush();assert.equal(v.calls.filter(x=>x==='seek').length,1);assert.ok(!v.facts.includes('seek_current_position'));v.sought();await flush();}
});
