import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OverlayMotionClock, type OverlayClockSample } from '../../packages/media/src/overlay-clock.ts';
import { OverlaySession } from '../../packages/media/src/overlay-session.ts';
const sample: OverlayClockSample = { source: 'p1', timeMs: 1000, durationMs: 60000, playing: true, seeking: false, buffering: false, rate: 1 };
test('Sparse decoder callbacks allow frame-by-frame motion without an invented subtitle or progress tick', async () => {
  const clock = new OverlayMotionClock(), session = new OverlaySession(); session.bind({ accountId: 'guest', generation: 0, mediaSessionId: 'media1', itemKey: 'BV0000000001:p1' });
  await session.loadDanmaku(async () => [{ id: 'scroll', timeMs: 1000, mode: 'scroll', content: '连续移动', color: 0xffffff }]);
  await session.loadSubtitleCues(async () => [{ id: 'future', startMs: 1100, endMs: 2000, content: '尚未到达' }]);
  const frames = [0, 16, 32, 48, 200].map(wall => session.frame(sample.timeMs, 'playing', { width: 1920, height: 1080 }, clock.frame(sample, wall)));
  assert.ok(frames.every((f, i) => !i || f.danmaku[0]!.x < frames[i - 1]!.danmaku[0]!.x)); assert.ok(frames.every(f => !f.subtitles.length)); assert.equal(sample.timeMs, 1000);
});
test('A missing tick has a finite horizon and never advances indefinitely through a stalled decoder', () => {
  const c = new OverlayMotionClock(); c.frame(sample, 0); assert.equal(c.frame(sample, 500), 1500); assert.equal(c.frame(sample, 1000), 2000); assert.equal(c.frame(sample, 60000), 2000);
  assert.equal(c.frame({ ...sample, timeMs: 1900 }, 60100), 2000); assert.equal(c.frame({ ...sample, timeMs: 1900 }, 60300), 2100);
});
test('Pause, buffering, seek and source replacement reanchor the visual clock to decoder time', () => {
  for (const changed of [{ playing: false }, { buffering: true }, { seeking: true }, { source: 'p2', timeMs: 0 }, { timeMs: 100 }]) {
    const c = new OverlayMotionClock(); c.frame(sample, 0); c.frame(sample, 500); const next = { ...sample, ...changed };
    assert.equal(c.frame(next, 600), next.timeMs);
    if (!next.playing || next.buffering || next.seeking) assert.equal(c.frame(next, 2000), next.timeMs);
  }
});
test('Only accepted rate affects interpolation, duration bounds the output and clock rollback resets safely', () => {
  const c = new OverlayMotionClock(); c.frame(sample, 0); assert.equal(c.frame(sample, 100), 1100);
  const fast = { ...sample, rate: 2 as const }; assert.equal(c.frame(fast, 200), 1000); assert.equal(c.frame(fast, 300), 1200);
  assert.equal(c.frame(fast, 10000), 3000); assert.equal(c.frame({ ...fast, durationMs: 2200 }, 10100), 2200); assert.equal(c.frame(sample, 1), 1000);
});
