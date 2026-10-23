import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CastProbeWorker } from '../../apps/tv/src/platform/cast-probe-worker.ts';
import { parseCastProbeResult } from '../../packages/contracts/src/cast-probe.ts';
import { diagnosticEntries } from '../../apps/tv/src/app/diagnostics.ts';
const scope = { accountId: 'guest', generation: 1, mediaSessionId: 'cast-discovery', requestId: 'r1' };
const request = { version: 1 as const, operation: 'cast-discovery' as const, scope, address: '10.0.0.9', uuid: '01234567-89ab-4cde-8123-456789abcdef', token: '0123456789abcdef0123456789abcdef' };
class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage?: (event: { data: unknown }) => void;
  onerror?: () => void;
  terminated = false;
  constructor() { FakeWorker.instances.push(this); }
  postMessage() {} terminate() { this.terminated = true; }
  emit(closed = false, code = 'cast.ready') { this.onmessage?.({ data: { version: 1, operation: request.operation, scope, closed, code } }); }
}
const tick = () => new Promise<void>(resolve => setImmediate(resolve));

test('W01 cast parent permits late-offer media beyond old 310s but only until finite 610s, with native ACK still required', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const prior = globalThis.Worker; globalThis.Worker = FakeWorker as unknown as typeof Worker; FakeWorker.instances = [];
  const client = new CastProbeWorker();
  try {
    const running = client.run(request, new AbortController().signal, () => {}); await tick();
    const cancelled = assert.rejects(running, { code: 'cancelled' }), worker = FakeWorker.instances[0]!;
    worker.emit(); t.mock.timers.tick(310000);
    assert.equal(worker.terminated, false); assert.equal(client.approveCandidate(), true);
    t.mock.timers.tick(299999); assert.equal(worker.terminated, false);
    const closing = client.dispose(); worker.emit(true, 'cast.closed_0_0_0_0_0_0_0'); await closing; await cancelled;
    assert.equal(client.cleanupFailure, undefined); assert.equal(worker.terminated, true);
  } finally { globalThis.Worker = prior; }
});

test('W01 cast parent timeout, invalid reply, Worker error and missing ACK retain fixed cause and poison unsafe reuse', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const prior = globalThis.Worker; globalThis.Worker = FakeWorker as unknown as typeof Worker;
  try {
    for (const cause of ['timeout', 'invalid', 'unsupported', 'close_timeout'] as const) {
      FakeWorker.instances = []; const client = new CastProbeWorker();
      const running = client.run(request, new AbortController().signal, () => {}); await tick();
      const rejected = assert.rejects(running, { code: cause === 'close_timeout' ? 'cancelled' : cause });
      const worker = FakeWorker.instances[0]!;
      if (cause === 'timeout') t.mock.timers.tick(610000);
      else if (cause === 'invalid') worker.emit(false, 'cast.raw_external_text');
      else if (cause === 'unsupported') worker.onerror?.();
      else { const disposed = assert.rejects(client.dispose(), { code: 'unknown' }); t.mock.timers.tick(5000); await disposed; }
      await rejected; assert.equal(client.cleanupFailure, cause); assert.equal(worker.terminated, true);
      await assert.rejects(client.run(request, new AbortController().signal, () => {}), { code: 'unknown' });
      assert.equal(FakeWorker.instances.length, 1); await assert.rejects(client.dispose(), { code: 'unknown' });
    }
  } finally { globalThis.Worker = prior; }
});

test('W01 cleanup facts cannot acknowledge closure or expose raw errors; bounded report keeps cause across seek history', () => {
  const result = { version: 1, operation: 'cast-discovery', scope, closed: false };
  for (const kind of ['native_unconfirmed', 'runtime_aborted', 'worker_exception']) {
    const code = 'cast.cleanup_cause_' + kind;
    assert.equal(parseCastProbeResult({ ...result, code }).closed, false);
    assert.throws(() => parseCastProbeResult({ ...result, closed: true, code }));
  }
  for (const code of ['cast.cleanup_cause_private_error', 'cast.cleanup_cause_worker_timeout']) assert.throws(() => parseCastProbeResult({ ...result, code }));
  const rows = ['avplay.seek_restart_held_b0_t0', 'cast.receiver_summary_v2_5a0c00cf', 'avplay.seek_history_v1_r', 'cast.position_wire_v1_1f', 'cast.soap_summary_v1_8000400c7a002010', 'cast.cleanup_cause_native_unconfirmed', 'cast.media_flow_s_c0_p0_w5_m9_l2', 'cast.cleanup_unknown_restart_required'].map(code => ({ code, verdict: code.endsWith('restart_required') ? 'FAIL' : 'UNVERIFIED' }));
  for (const data of [rows, rows.filter(e => !e.code.startsWith('avplay.seek_')), rows.filter(e => !e.code.startsWith('avplay.seek_') && !e.code.includes('receiver_summary'))]) {
    const chosen = diagnosticEntries(data); assert.ok(chosen.length <= 8);
    assert.ok(chosen.some(e => e.code === 'cast.cleanup_cause_native_unconfirmed'));
    assert.ok(chosen.some(e => e.code === 'cast.cleanup_unknown_restart_required'));
    assert.ok(!chosen.some(e => e.code === 'cast.native_closed_confirmed'));
  }
});

test('W06 product has no whole-worker probe timer, yet abort still needs the bounded native close ACK',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const prior=globalThis.Worker;globalThis.Worker=FakeWorker as unknown as typeof Worker;FakeWorker.instances=[];
 try{
  const client=new CastProbeWorker(true),controller=new AbortController();const running=client.run(request,controller.signal,()=>{});await tick();const worker=FakeWorker.instances[0]!;
  worker.emit();t.mock.timers.tick(7200000);assert.equal(worker.terminated,false);assert.equal(client.approveCandidate(),true);
  const rejected=assert.rejects(running,{code:'cancelled'});controller.abort();await rejected;const closing=client.dispose();t.mock.timers.tick(4999);assert.equal(worker.terminated,false);worker.emit(true,'cast.closed_0_0_0_0_0_0_0');await closing;assert.equal(worker.terminated,true);assert.equal(client.cleanupFailure,undefined);
 }finally{globalThis.Worker=prior;}
});
