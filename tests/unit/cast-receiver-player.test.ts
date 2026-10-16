import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CastReceiverPlayer } from '../../apps/tv/src/app/cast-receiver-player.ts';
import { PlayerCoordinator } from '../../packages/media/src/player.ts';
import type { PlayerBackend } from '../../packages/contracts/src/index.ts';
import type { ReceiverSnapshot } from '../../packages/contracts/src/cast-receiver.ts';
function setup() {
  const calls: string[] = [], snapshots: ReceiverSnapshot[] = [], acks: unknown[] = [], seeks: boolean[] = [];
  let durationReads = 0;
  let tick: (ms: number) => void = () => {}, resolveSeek = () => {}, failSeek = () => {}, resolvePrepare = () => {}, valid = true;
  const backend: PlayerBackend = { prepare: async (_source, onTime) => { calls.push('prepare'); tick = onTime; await new Promise<void>(ok => { resolvePrepare = ok; }); }, play: () => { calls.push('play'); }, pause: () => { calls.push('pause'); }, seek: () => { calls.push('seek'); return new Promise<void>((ok, no) => { resolveSeek = ok; failSeek = () => no(Error()); }); }, close: () => { calls.push('close'); }, screensaver() {} };
  const player = new PlayerCoordinator(backend), controller = new CastReceiverPlayer(player, 'http://127.0.0.1:40324/owned/cast.mp4', () => valid, () => { durationReads++; assert.equal(player.seeking, false); assert.notEqual(player.state, 'preparing'); return 240000; }, v => snapshots.push(v), (id, ok) => acks.push([id, ok]), ok => seeks.push(ok));
  return { durationReads: () => durationReads, calls, snapshots, acks, seeks, player, controller, tick: (ms: number) => tick(ms), prepared: () => resolvePrepare(), sought: () => resolveSeek(), fail: () => failSeek(), invalidate: () => { valid = false; player.close(); } };
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
  v.controller.execute(1, { type: 'seek', timeMs: 5000 }); await flush(); v.fail(); await flush(); assert.deepEqual(v.acks, [[1, true]]); assert.deepEqual(v.seeks, [false]); assert.equal(v.calls.filter(c => c === 'seek').length, 1);
});

test('W01/F20 phone-paused remote seek publishes cached duration without any SDK getter until completion', async () => {
  const v = setup(), opened = v.player.open({ url: 'owned', kind: 'vod' }); v.controller.snapshot(); assert.equal(v.durationReads(), 0); v.prepared(); await opened; v.player.play();
  v.controller.execute(1, { type: 'pause' }); assert.equal(v.controller.takeRemote(), true); const reads = v.durationReads();
  const pending = v.player.seek(5000); await flush(); for (let i = 0; i < 20; i++) v.controller.snapshot();
  assert.equal(v.durationReads(), reads); assert.equal(v.snapshots.at(-1)?.state, 'paused'); assert.equal(v.snapshots.at(-1)?.durationMs, 240000); assert.equal(v.snapshots.at(-1)?.seeking, true);
  v.tick(5000); v.sought(); await pending; v.controller.snapshot(); assert.equal(v.durationReads(), reads + 1); assert.equal(v.snapshots.at(-1)?.timeMs, 5000); assert.equal(v.player.state, 'paused');
});
