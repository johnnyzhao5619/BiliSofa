import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OverlayRuntime } from '../../apps/tv/src/platform/overlay-runtime.ts';
import type { OverlayRequest } from '../../packages/contracts/src/overlay-read.ts';
function install(closeAck = true) {
  const original = globalThis.Worker, workers: FakeWorker[] = [];
  class FakeWorker {
    onmessage: ((event: { data: unknown }) => void) | null = null;
    onerror: (() => void) | null = null;
    onmessageerror: (() => void) | null = null;
    request: OverlayRequest | undefined;
    stops = 0;
    terminated = false;
    constructor() { workers.push(this); }
    postMessage(v: OverlayRequest | { control: string }) {
      if ('control' in v) { this.stops++; if (closeAck) queueMicrotask(() => this.reply(true)); } else this.request = v;
    }
    reply(cancelled = false) {
      const q = this.request!;
      this.onmessage?.({ data: { version: 1, operation: q.operation, scope: q.scope, closed: true, ...(cancelled ? { kind: 'error', code: 'cancelled' } : { kind: 'ok', value: { kind: 'metadata', tracks: [], loginRequired: false } }) } });
    }
    terminate() { this.terminated = true; }
  }
  globalThis.Worker = FakeWorker as unknown as typeof Worker;
  const until = async (count: number) => { for (let i = 0; i < 50 && workers.length < count; i++) await new Promise(resolve => setTimeout(resolve, 1)); assert.equal(workers.length, count); return workers[count - 1]!; };
  return { workers, until, restore: () => { globalThis.Worker = original; } };
}
const target = { bvid: 'BV0000000001', part: 1 };
test('W05 overlay native requests serialize, wait real close and a stale facade cannot stop its replacement', async () => {
  const f = install(); try {
    const runtime = new OverlayRuntime(undefined, { readMs: 1000, closeMs: 100 }), old = runtime.access(target), signal = new AbortController().signal;
    const first = old.read({ kind: 'metadata' }, signal); const worker = await f.until(1); worker.reply(); await first;
    await runtime.reset(); const current = runtime.access({ ...target, part: 2 }), second = current.read({ kind: 'metadata' }, signal), next = await f.until(2);
    await old.close(); assert.equal(next.stops, 0); assert.equal(next.request?.target.part, 2); next.reply(); await second; assert.ok(f.workers.every(w => w.terminated)); await runtime.close();
  } finally { f.restore(); }
});
test('W05 reset aborts the old reader and queued stale requests never create a new native owner', async () => {
  const f = install(); try {
    const runtime = new OverlayRuntime(undefined, { readMs: 1000, closeMs: 100 }), source = runtime.access(target), signal = new AbortController().signal;
    const first = source.read({ kind: 'metadata' }, signal), second = source.read({ kind: 'metadata' }, signal); const outcomes = Promise.allSettled([first, second]);
    const worker = await f.until(1); await runtime.reset(); const values = await outcomes; assert.ok(values.every(v => v.status === 'rejected')); assert.equal(f.workers.length, 1); assert.equal(worker.stops, 1); assert.equal(worker.terminated, true); await runtime.close();
  } finally { f.restore(); }
});
test('W05 queue is bounded and unconfirmed native closure poisons the lane instead of allowing reuse', async () => {
  const f = install(false); try {
    const runtime = new OverlayRuntime(undefined, { readMs: 1000, closeMs: 10 }), source = runtime.access(target), signal = new AbortController().signal;
    const work = Array.from({ length: 4 }, () => source.read({ kind: 'metadata' }, signal)); const outcomes = Promise.allSettled(work);
    await assert.rejects(source.read({ kind: 'metadata' }, signal), { code: 'cancelled' }); await f.until(1); await assert.rejects(runtime.reset(), { code: 'unknown' }); await outcomes;
    await assert.rejects(runtime.access(target).read({ kind: 'metadata' }, signal), { code: 'unknown' }); assert.equal(f.workers.length, 1); await assert.rejects(runtime.close(), { code: 'unknown' });
  } finally { f.restore(); }
});
