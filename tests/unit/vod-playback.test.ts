import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VodPlayback, type VodMedia } from '../../packages/media/src/vod-playback.ts';
import type { MediaClosure, MediaOutcome, MediaSnapshot } from '../../packages/media/src/session.ts';
import type { VodChoice, VodItem } from '../../packages/contracts/src/vod-catalog.ts';
const clean: MediaClosure = { closed: true, decoderClosed: true, transportClosed: true };
const items: VodItem[] = [1, 2].map(part => ({ bvid: 'BV0000000001', part, title: `合成P${part}`, durationMs: 80000 }));
const turn = () => new Promise(resolve => setImmediate(resolve));
function harness() {
  const media: Fake[] = [], outcomes: { outcome: MediaOutcome; closure: MediaClosure }[] = [];
  class Fake implements VodMedia {
    done!: (outcome: MediaOutcome, closure: MediaClosure) => void;
    gate: Promise<MediaClosure> = Promise.resolve(clean);
    state: MediaSnapshot = { state: 'playing', timeMs: 23000, durationMs: 80000, seeking: false, acceptedRate: 1 };
    closed = false;
    at = -1;
    paused = false;
    choice: VodChoice | undefined;
    item!: VodItem;
    start(at = 0, paused = false) { this.at = at; this.paused = paused; }
    snapshot() { return { ...this.state }; }
    toggle() {}
    async seek(_ms: number) {}
    setRate(_rate: 1 | 2) { return 'accepted' as const; }
    close() { this.closed = true; return this.gate; }
  }
  const player = new VodPlayback(items, 0, (item, choice, done) => {
    const next = new Fake(); next.item = item; next.choice = choice; next.done = done; media.push(next); return next;
  }, (outcome, closure) => outcomes.push({ outcome, closure }));
  return { player, media, outcomes };
}
test('F06 track switching waits old native/decoder closure and preserves actual position/pause without starting a second decoder', async () => {
  const h = harness(); h.player.start(); h.media[0]!.state.state = 'paused';
  let ack!: (value: MediaClosure) => void; h.media[0]!.gate = new Promise(resolve => { ack = resolve; });
  const change = h.player.selectTracks({ catalogId: 'a'.repeat(32), videoKey: 'v1', audioKey: 'a0' });
  assert.equal(h.player.snapshot().moving, true); assert.equal(h.media.length, 1);
  await assert.rejects(h.player.select(1)); h.player.toggle();
  ack(clean); await change;
  assert.equal(h.media.length, 2); assert.equal(h.media[1]!.at, 23000); assert.equal(h.media[1]!.paused, true);
  assert.deepEqual(h.media[1]!.choice, { catalogId: 'a'.repeat(32), videoKey: 'v1', audioKey: 'a0' });
  h.media[0]!.done('ended', clean); await turn(); assert.equal(h.media.length, 2); assert.deepEqual(h.outcomes, []);
  await h.player.close();
});
test('F06 closure uncertainty is sticky and prevents both manual replacement and repeat even after a late successful close', async () => {
  const h = harness(); h.player.start(); h.player.mode(true, 'all');
  h.media[0]!.gate = Promise.resolve({ ...clean, closed: false, transportClosed: false });
  await h.player.select(1); assert.equal(h.media.length, 1); assert.equal(h.player.snapshot().restartRequired, true);
  h.media[0]!.gate = Promise.resolve(clean);
  await assert.rejects(h.player.select(1)); assert.equal((await h.player.close()).closed, false);
});
test('F06 explicit continuous/repeat modes advance only a current real completion, and failure never skips content', async () => {
  const h = harness(); h.player.start(); assert.equal(h.media.length, 1);
  h.player.mode(true, 'off'); h.media[0]!.done('ended', clean); await turn();
  assert.equal(h.media.length, 2); assert.equal(h.media[1]!.item.part, 2); assert.equal(h.media[1]!.at, 0);
  h.player.mode(true, 'all'); h.media[1]!.done('ended', clean); await turn();
  assert.equal(h.media.length, 3); assert.equal(h.media[2]!.item.part, 1);
  h.player.mode(false, 'one'); h.media[2]!.done('ended', clean); await turn();
  assert.equal(h.media.length, 4); assert.equal(h.media[3]!.item.part, 1);
  h.media[3]!.done('failed', clean); await turn(); assert.equal(h.media.length, 4); assert.equal(h.outcomes[0]?.outcome, 'failed');
  // A known clean failure allows an explicit user selection, never automatic skip.
  await h.player.select(1); assert.equal(h.media.length, 5); await h.player.close();
});
test('F06 Home/close during a track switch cancels replacement and late old callbacks cannot resurrect playback', async () => {
  const h = harness(); h.player.start(); let ack!: (value: MediaClosure) => void;
  h.media[0]!.gate = new Promise(resolve => { ack = resolve; });
  const change = h.player.select(1), close = h.player.close(); ack(clean); await change; await close;
  h.media[0]!.done('ended', clean); await turn(); assert.equal(h.media.length, 1); assert.deepEqual(h.outcomes, []);
});
test('F06 a synchronous factory terminal callback drains the newly returned owner before reporting', async () => {
  let closed = false, started = false, reported = false;
  const player = new VodPlayback(items, 0, (_item, _choice, done) => {
    done('failed', clean);
    return {
      start() { started = true; }, snapshot() { return { state: 'loading', timeMs: 0, durationMs: 0, seeking: false }; },
      toggle() {}, async seek() {}, setRate() { return 'unsupported'; }, async close() { closed = true; return clean; },
    };
  }, () => { assert.equal(closed, true); reported = true; });
  player.start(); await turn(); assert.equal(started, true); assert.equal(closed, true); assert.equal(reported, true); await player.close();
});
