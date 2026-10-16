import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WriteCoordinator } from '../../packages/bili-client/src/write.ts';
import { DanmakuTimeline, parseDanmaku } from '../../packages/media/src/danmaku.ts';
const intent = { accountId: 'synthetic-A', generation: 1, action: 'coin', targetId: 'synthetic-video' };
test('W02/F14 process rebuild restores in-flight writes as unknown and blocks replay', async () => {
  const original = new WriteCoordinator();
  void original.submit(intent, () => new Promise(() => {}), true);
  const restored = new WriteCoordinator(original.snapshot());
  assert.equal(restored.state(intent), 'unknown');
  await assert.rejects(restored.submit(intent, async () => 'confirmed', true), { code: 'unknown' });
  assert.equal(await restored.reconcile(intent, async () => 'not-applied'), 'not-applied');
  assert.equal(await restored.submit(intent, async () => 'confirmed', true), 'confirmed');
});
test('W02/F14 concurrent reconciliation locks replay and second query cannot race it', async () => {
  const writes = new WriteCoordinator([{ intent, state: 'unknown' }]);
  let resolve!: (state: 'not-applied') => void;
  const query = writes.reconcile(intent, () => new Promise(r => { resolve = r; }));
  await assert.rejects(writes.submit(intent, async () => 'confirmed', true), { code: 'unknown' });
  await assert.rejects(writes.reconcile(intent, async () => 'applied'), { code: 'invalid' });
  const restored = new WriteCoordinator(writes.snapshot()); assert.equal(restored.state(intent), 'unknown');
  resolve('not-applied'); assert.equal(await query, 'not-applied');
});
test('W05/F08 danmaku mode/body bounds, keyword filtering, backwards seek, pause and density', () => {
  const timeline = new DanmakuTimeline();
  timeline.replace(parseDanmaku([
    { id: '1', timeMs: 1000, mode: 'scroll', color: 0xffffff, content: '<script>text only</script>' },
    { id: '2', timeMs: 2000, mode: 'top', color: 0xffffff, content: '过滤词' },
    { id: '3', timeMs: 5000, mode: 'bottom', color: 0xffffff, content: '中文' },
  ]));
  assert.deepEqual(timeline.frame(6000, ['过滤词'], 2).map(item => item.id), ['1', '3']);
  assert.deepEqual(timeline.frame(1200, [], 2).map(item => item.id), ['1']);
  assert.deepEqual(timeline.frame(1200, [], 2), timeline.frame(1200, [], 2));
  assert.equal(timeline.frame(6000, [], 1).length, 1);
  assert.throws(() => parseDanmaku([{ id: 'bad', timeMs: 0, mode: 'BAS', color: 1, content: 'outside' }]), { code: 'unsupported' });
  timeline.clear(); assert.deepEqual(timeline.frame(6000, [], 1), []);
});
