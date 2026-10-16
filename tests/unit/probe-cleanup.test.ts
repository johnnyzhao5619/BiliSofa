import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProbeWorker } from '../../apps/tv/src/platform/probe-worker.ts';
import type { ProbeRequest } from '../../packages/contracts/src/index.ts';
class FixtureWorker {
  static created: FixtureWorker[] = [];
  onmessage?: (event: { data: unknown }) => void;
  onerror?: () => void;
  messages: unknown[] = [];
  terminated = false;
  constructor() { FixtureWorker.created.push(this); }
  postMessage(value: unknown): void { this.messages.push(value); }
  terminate(): void { this.terminated = true; }
  emit(request: ProbeRequest, code: string): void { this.onmessage?.({ data: { version: 1, scope: request.scope, operation: request.operation, verdict: 'UNVERIFIED', code, phase: 'final' } }); }
}
const request = (operation: ProbeRequest['operation'], id: string): ProbeRequest => ({ version: 1, scope: { accountId: 'guest', generation: 0, mediaSessionId: 'probe', requestId: id }, operation });
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
test('W01 socket shutdown waits for closure ACK, serializes reuse and rejects superseded queued starts', async () => {
  const target = globalThis as unknown as { Worker?: unknown }; const previous = target.Worker; target.Worker = FixtureWorker; FixtureWorker.created = [];
  const controller = new ProbeWorker();
  try {
    const firstRequest = request('mpd', 'r1'), first = controller.run(firstRequest); const rejected = assert.rejects(first, { code: 'cancelled' }); await tick();
    const old = FixtureWorker.created[0]!; const stopping = controller.dispose();
    const superseded = controller.run(request('wasm', 'r2')); const supersededRejected = assert.rejects(superseded, { code: 'cancelled' });
    const currentRequest = request('wasm', 'r3'), current = controller.run(currentRequest); await tick();
    assert.equal(FixtureWorker.created.length, 1); assert.equal(old.terminated, false);
    old.emit(firstRequest, 'mpd.stopped'); await stopping; await rejected; await supersededRejected; await tick();
    assert.equal(FixtureWorker.created.length, 2); assert.equal(old.terminated, true);
    old.onerror?.(); old.emit(firstRequest, 'mpd.listener_deadline_closed'); // old callbacks cannot affect new owner
    FixtureWorker.created[1]!.emit(currentRequest, 'wasm.worker_arithmetic_only');
    assert.equal((await current).scope.requestId, 'r3');
  } finally { await controller.dispose(); if (previous === undefined) delete target.Worker; else target.Worker = previous; }
});
test('W01 unconfirmed native socket cleanup prevents unsafe reuse', async () => {
  const target = globalThis as unknown as { Worker?: unknown }; const previous = target.Worker; target.Worker = FixtureWorker; FixtureWorker.created = [];
  const controller = new ProbeWorker();
  try {
    const first = controller.run(request('mpd', 'r1')); const cancelled = assert.rejects(first, { code: 'cancelled' }); await tick();
    await assert.rejects(controller.dispose(), { code: 'unknown' }); await cancelled;
    await assert.rejects(controller.run(request('mpd', 'r2')), { code: 'unknown' });
    assert.equal(FixtureWorker.created.length, 1); assert.equal(FixtureWorker.created[0]!.terminated, true);
  } finally { await controller.dispose().catch(() => {}); if (previous === undefined) delete target.Worker; else target.Worker = previous; }
});
