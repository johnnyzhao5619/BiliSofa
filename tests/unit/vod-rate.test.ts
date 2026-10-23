import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PlayerCoordinator } from '../../packages/media/src/player.ts';
import type { PlayerBackend } from '../../packages/contracts/src/index.ts';
function harness(kind: 'vod' | 'live' = 'vod') {
  const calls: number[] = []; let complete!: () => void, result: 'accepted' | 'busy' | 'unsupported' | 'failed' = 'accepted';
  const backend: PlayerBackend = {
    async prepare(_source, _tick, _end, _error) {}, play() {}, pause() {}, close() {}, screensaver() {},
    seek() { return new Promise(resolve => { complete = resolve; }); },
    setRate(rate) { calls.push(rate); return result; },
  };
  const player = new PlayerCoordinator(backend);
  return { player, calls, backend, open: () => player.open({ kind, url: 'https://synthetic.invalid/media' }), complete: () => complete(), result: (value: typeof result) => { result = value; } };
}
test('F06 product rate reports actual command acceptance only and cannot run during prepare/pause/seek or live', async () => {
  const h = harness(); assert.equal(h.player.setRate(2), 'busy'); await h.open(); assert.equal(h.player.acceptedRate, undefined);
  h.player.play(); assert.equal(h.player.setRate(2), 'accepted'); assert.equal(h.player.acceptedRate, 2);
  h.player.pause(); assert.equal(h.player.setRate(1), 'busy'); assert.deepEqual(h.calls, [2]);
  h.player.play(); const seek = h.player.seek(20000); await Promise.resolve(); assert.equal(h.player.setRate(1), 'busy');
  h.complete(); await seek; assert.equal(h.player.acceptedRate, 2); assert.deepEqual(h.calls, [2, 2, 2]);
  h.player.close(); assert.equal(h.player.acceptedRate, undefined);
  const live = harness('live'); await live.open(); live.player.play(); assert.equal(live.player.setRate(2), 'unsupported'); assert.deepEqual(live.calls, []); live.player.close();
});
test('F06 paused seek never starts playback or dispatches speed until explicit continue, and rejected restore stays unknown', async () => {
  const h = harness(); await h.open(); h.player.play(); h.player.setRate(2); h.player.pause();
  const seek = h.player.seek(5000); await Promise.resolve(); h.complete(); await seek;
  assert.equal(h.player.state, 'paused'); assert.equal(h.player.acceptedRate, undefined); assert.deepEqual(h.calls, [2]);
  h.result('unsupported'); h.player.play(); assert.equal(h.player.state, 'playing'); assert.equal(h.player.acceptedRate, undefined); assert.deepEqual(h.calls, [2, 2]); h.player.close();
});
test('F06 late seek completion after close cannot send a new rate command or restore a stale accepted label', async () => {
  const h = harness(); await h.open(); h.player.play(); h.player.setRate(2);
  const seek = h.player.seek(5000); await Promise.resolve(); h.player.close(); h.complete();
  await assert.rejects(seek, { code: 'cancelled' }); assert.equal(h.player.acceptedRate, undefined); assert.deepEqual(h.calls, [2]);
});
