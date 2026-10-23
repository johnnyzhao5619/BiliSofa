import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSessionProbeRequest, parseSessionProbeResult } from '../../packages/contracts/src/session-probe.ts';
import { SessionProbeWorker } from '../../apps/tv/src/platform/session-probe-worker.ts';
import { nativeSessionIssue, nativeSessionStack } from '../../platform/wasm-network/src/native-session-issue.ts';
const scope = { accountId: 'guest', generation: 1, mediaSessionId: 'session-wire', requestId: 'r1' };
const request = { version: 1 as const, operation: 'session-probe' as const, scope, token: '0123456789abcdef0123456789abcdef' };
test('W01 wire session IPC accepts only synthetic guest ownership and fixed facts, never URL/header/cookie payload or false cleanup ACK', () => {
  assert.deepEqual(parseSessionProbeRequest(request), request);
  for (const patch of [{ url: 'https://outside.invalid' }, { scope: { ...scope, accountId: 'real' } }, { scope: { ...scope, url: 'outside' } }, { token: '../secret' }, { cookie: 'real' }]) assert.throws(() => parseSessionProbeRequest({ ...request, ...patch }));
  for (const code of ['ready','headers_set_cookie_wire','two_jars_isolated_wire','redirect_not_followed','jar_clear_isolated_wire']) {
    const result = { version: 1, operation: request.operation, scope, closed: false, code: 'session.' + code };
    assert.equal(parseSessionProbeResult(result).closed, false); assert.throws(() => parseSessionProbeResult({ ...result, closed: true }));
  }
  for (const code of ['pass_all_closed','cancelled','native_unavailable','failed_10','failed_12','failed_14','failed_16','failed_18','failed_19','failed_20']) assert.equal(parseSessionProbeResult({ version: 1, operation: request.operation, scope, closed: true, code: 'session.' + code }).closed, true);
  for (const code of ['session.failed_17','session.raw_cookie','session.pass']) assert.throws(() => parseSessionProbeResult({ version: 1, operation: request.operation, scope, closed: true, code }));
});
test('W01 offline native stack evidence retains only two bounded numeric frames, never paths or error text', () => {
  const code = nativeSessionStack('private-token at wasm-function[123]:0xabc\n at wasm-function[456]:0xdef\n at wasm-function[789]:0x123');
  assert.equal(code, 'session.native_stack_v1_123_abc_456_def');
  const frame = { version: 1, operation: request.operation, scope, closed: false, code };
  assert.equal(parseSessionProbeResult(frame).code, code); assert.throws(() => parseSessionProbeResult({ ...frame, closed: true }));
  for (const value of ['x'.repeat(8193), undefined, 'sensitive file path', 'wasm-function[1234567]:0xabc']) assert.equal(nativeSessionStack(value), undefined);
  for (const bad of ['session.native_stack_v1_123_secret', 'session.native_stack_v1_123_abc_456_def_789_123']) assert.throws(() => parseSessionProbeResult({ ...frame, code: bad }));
});
test('W01 SDK session diagnostics classify bounded text without exposing raw paths, URLs or arbitrary exception properties', () => {
  for (const [value, expected] of [['abort F_SETFL private-url', 'fcntl_setfl'], ['F_GETFL failed secret', 'fcntl_getfl'], ['ioctl FIONBIO address', 'ioctl_fionbio'], ['Assertion failed: sensitive', 'assertion']] as const) assert.equal(nativeSessionIssue(value), expected);
  for (const value of ['F_SETFL' + 'x'.repeat(1024), 'random url token', undefined, { get message() { throw Error('must not inspect'); } }]) assert.equal(nativeSessionIssue(value), undefined);
  for (const suffix of ['fcntl_setfl','fcntl_getfl','ioctl_fionbio','assertion','runtime_abort','unclosed','worker_exception']) {
    const frame = { version: 1, operation: request.operation, scope, closed: false, code: 'session.native_issue_' + suffix };
    assert.equal(parseSessionProbeResult(frame).closed, false); assert.throws(() => parseSessionProbeResult({ ...frame, closed: true }));
  }
});
test('W01 native session fatal progress preserves its cause then poisons owner without a close ACK', async () => {
  const previous = globalThis.Worker; let instance: Fixture | undefined;
  class Fixture {
    onmessage?: (e: { data: unknown }) => void; terminated = false;
    constructor() { instance = this; } postMessage() {} terminate() { this.terminated = true; }
  }
  globalThis.Worker = Fixture as unknown as typeof Worker; const worker = new SessionProbeWorker();
  const causes: string[] = [];
  try {
    const pending = worker.run(request, new AbortController().signal, result => causes.push(result.code)); const failed = assert.rejects(pending, { code: 'unsupported' });
    await new Promise<void>(resolve => setImmediate(resolve));
    instance!.onmessage?.({ data: { version: 1, operation: request.operation, scope, closed: false, code: 'session.native_stack_v1_123_abc' } });
    instance!.onmessage?.({ data: { version: 1, operation: request.operation, scope, closed: false, code: 'session.native_issue_fcntl_setfl' } });
    await failed; assert.deepEqual(causes, ['session.native_stack_v1_123_abc', 'session.native_issue_fcntl_setfl']); assert.ok(instance!.terminated); assert.equal(worker.cleanupFailure, 'unsupported');
    await assert.rejects(worker.run(request, new AbortController().signal, () => {}), { code: 'unknown' });
  } finally { await worker.dispose().catch(() => {}); globalThis.Worker = previous; }
});
test('W01 session cancel requires scoped native ACK before replacement; old callbacks cannot affect a new owner', async () => {
  const previous = globalThis.Worker, instances: Fixture[] = [];
  class Fixture {
    onmessage?: (e: { data: unknown }) => void; onerror?: () => void; terminated = false;
    constructor(file: string) { assert.equal(file,'session-worker.js'); instances.push(this); }
    postMessage() {} terminate() { this.terminated = true; }
    emit(id: string, closed: boolean, code: string) { this.onmessage?.({ data: { version: 1, operation: request.operation, scope: { ...scope, requestId: id }, closed, code } }); }
  }
  globalThis.Worker = Fixture as unknown as typeof Worker;
  const tick = () => new Promise<void>(resolve => setImmediate(resolve));
  const worker = new SessionProbeWorker();
  try {
    const first = worker.run(request,new AbortController().signal,()=>{}), rejected = assert.rejects(first,{code:'cancelled'}); await tick();
    const old = instances[0]!, closing = worker.dispose();
    const next = worker.run({ ...request, scope: { ...scope, requestId: 'r2' } },new AbortController().signal,()=>{}); await tick(); assert.equal(instances.length,1);
    old.emit('r1',true,'session.cancelled'); await closing; await rejected; await tick(); assert.equal(instances.length,2);
    old.onerror?.(); old.emit('r1',true,'session.failed_12');
    instances[1]!.emit('r2',true,'session.pass_all_closed'); assert.equal((await next).code,'session.pass_all_closed');
    assert.ok(instances.every(v=>v.terminated));
  } finally { await worker.dispose().catch(()=>{}); globalThis.Worker = previous; }
});
