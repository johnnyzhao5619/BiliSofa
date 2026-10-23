import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNetworkValidationRequest, parseNetworkValidationResult } from '../../packages/contracts/src/network-validation.ts';
import { NetworkValidationWorker } from '../../apps/tv/src/platform/network-validation-worker.ts';
const scope = { accountId: 'guest', generation: 1, mediaSessionId: 'network-validation', requestId: 'r1' };
const request = { version: 1 as const, operation: 'network-validation' as const, scope };
test('W01 network validation IPC accepts fixed anonymous facts and rejects supplied destinations, secrets and false close acknowledgements', () => {
  assert.deepEqual(parseNetworkValidationRequest(request), request);
  for (const patch of [{ url: 'https://outside.invalid' }, { cookie: 'real' }, { scope: { ...scope, accountId: 'real' } }, { scope: { ...scope, url: 'outside' } }]) assert.throws(() => parseNetworkValidationRequest({ ...request, ...patch }));
  for (const code of ['network.ready', 'network.versions_curl8_23_0_ssl3_5_9', 'network.crypto_random', 'network.tls_positive_pass', 'network.tls_expired_pass', 'network.tls_hostname_pass', 'network.tls_selfsigned_pass', 'network.tls_expired_fail_c28_v0']) {
    assert.equal(parseNetworkValidationResult({ ...request, closed: false, code }).closed, false);
    assert.throws(() => parseNetworkValidationResult({ ...request, closed: true, code }));
  }
  for (const code of ['network.pass_all_closed','network.failed_all_closed','network.cancelled','network.native_unavailable']) assert.equal(parseNetworkValidationResult({ ...request, closed: true, code }).closed, true);
  for (const code of ['network.tls_expired_fail_c128_v0', 'network.tls_expired_fail_c60_v1000', 'network.raw_headers', 'network.tls_expired_fail_c28_v0_token']) assert.throws(() => parseNetworkValidationResult({ ...request, closed: false, code }));
});
test('W01 network cancellation waits for native close ACK, rejects stale scope and cannot reuse poisoned cleanup', async () => {
  const previous = globalThis.Worker, instances: Fixture[] = [];
  class Fixture {
    onmessage?: (e: { data: unknown }) => void; onerror?: () => void; terminated = false;
    constructor(file: string) { assert.equal(file, 'network-validation-worker.js'); instances.push(this); }
    postMessage() {} terminate() { this.terminated = true; }
    emit(id: string, closed: boolean, code: string) { this.onmessage?.({ data: { ...request, scope: { ...scope, requestId: id }, closed, code } }); }
  }
  globalThis.Worker = Fixture as unknown as typeof Worker;
  const tick = () => new Promise<void>(resolve => setImmediate(resolve)); const worker = new NetworkValidationWorker();
  try {
    const first = worker.run(request, new AbortController().signal, () => {}), failed = assert.rejects(first, { code: 'cancelled' }); await tick();
    const old = instances[0]!, closing = worker.dispose(); const next = worker.run({ ...request, scope: { ...scope, requestId: 'r2' } }, new AbortController().signal, () => {}); await tick(); assert.equal(instances.length, 1);
    old.emit('r1', true, 'network.cancelled'); await closing; await failed; await tick(); assert.equal(instances.length, 2);
    old.onerror?.(); old.emit('r1', true, 'network.pass_all_closed');
    const rejected = assert.rejects(next, { code: 'invalid' }); instances[1]!.emit('r1', true, 'network.pass_all_closed'); await rejected;
    await assert.rejects(worker.run(request, new AbortController().signal, () => {}), { code: 'unknown' }); assert.ok(instances.every(v => v.terminated));
  } finally { await worker.dispose().catch(() => {}); globalThis.Worker = previous; }
});
test('G2 HTTPS IPC facts cannot masquerade as TLS results or inject targets/secrets', () => {
  const q = { ...request, operation: 'https-session-validation' as const };
  assert.deepEqual(parseNetworkValidationRequest(q), q);
  for (const code of ['ready','ephemeral_tls_verified','secure_cookie_wire','two_jars_isolated','redirect_not_followed','credential_scope_wire','clear_isolated']) {
    const value = { ...q, closed: false, code: 'httpsession.' + code };
    assert.equal(parseNetworkValidationResult(value).operation, q.operation);
    assert.throws(() => parseNetworkValidationResult({ ...value, ...request }));
    assert.throws(() => parseNetworkValidationResult({ ...value, cookie: 'no' }));
  }
  for (const code of ['httpsession.pass_all_closed','httpsession.failed_c18','httpsession.cancelled']) assert.equal(parseNetworkValidationResult({ ...q, closed: true, code }).closed, true);
  for (const code of ['network.pass_all_closed','httpsession.failed_c42','httpsession.failed_c17','httpsession.tls_disabled']) assert.throws(() => parseNetworkValidationResult({ ...q, closed: true, code }));
});
test('G2 HTTPS adapter rejects a terminal frame from the other operation even with matching scope', async () => {
  const previous = globalThis.Worker; let fixture!: { onmessage?: (e: { data: unknown }) => void };
  class WorkerFixture { onmessage?: (e: { data: unknown }) => void; constructor() { fixture = this; } postMessage() {} terminate() {} }
  globalThis.Worker = WorkerFixture as unknown as typeof Worker;
  const worker = new NetworkValidationWorker('https-session');
  try {
    const pending = worker.run({ ...request, operation: 'https-session-validation' }, new AbortController().signal, () => {}), rejected = assert.rejects(pending, { code: 'invalid' });
    await new Promise<void>(resolve => setImmediate(resolve)); fixture.onmessage?.({ data: { ...request, closed: true, code: 'network.pass_all_closed' } }); await rejected;
  } finally { await worker.dispose().catch(() => {}); globalThis.Worker = previous; }
});

test('G2 HTTPS worker does not accept a TLS task on its cancellation channel', async () => {
  const worker = new NetworkValidationWorker('https-session');
  await assert.rejects(worker.run(request, new AbortController().signal), { code: 'invalid' });
  await worker.dispose();
});
